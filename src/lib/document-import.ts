import "server-only";
import mammoth from "mammoth";
import TurndownService from "turndown";
import * as cheerio from "cheerio";
import ExcelJS from "exceljs";
import { blocksToMarkdown, extractPdfBlocks, type PdfBlock } from "./pdf-text";

// Converts an uploaded document into a draft the admin reviews and edits
// before anything is written to the database (see the review UI in
// admin/(protected)/import) — this never writes content on its own.
// .docx goes through mammoth, which produces clean semantic HTML (headings,
// bold/italic, lists, tables) that everything below reshapes into this
// app's two content shapes. .xlsx and .pdf get their own, lower-fidelity
// paths below — neither format carries the same structural markup, so
// there's more for the admin to clean up in the review step for those.

export interface DraftPage {
  title: string;
  body: string; // Markdown
}

export interface SectionDraft {
  title: string;
  pages: DraftPage[];
  // Plain-language heads-up for the admin reviewing the draft (things that
  // were left out or approximated), shown above the draft in the review step.
  notes?: string[];
}

export interface ChecklistDraft {
  title: string;
  items: string[];
  notes?: string[];
}

const turndown = new TurndownService({ headingStyle: "atx", bulletListMarker: "-" });
// GFM tables aren't part of turndown's core rule set.
turndown.addRule("table", {
  filter: "table",
  replacement: (_content: string, node: unknown) => {
    const outerHTML = (node as { outerHTML?: string }).outerHTML ?? "";
    const $ = cheerio.load(outerHTML);
    const rows = $("tr")
      .toArray()
      .map((tr) =>
        $(tr)
          .find("td, th")
          .toArray()
          .map((cell) => $(cell).text().trim().replace(/\|/g, "\\|").replace(/\s+/g, " "))
      )
      .filter((row) => row.length > 0);
    if (rows.length === 0) return "";

    const header = rows[0];
    const body = rows.slice(1);
    const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
    const sep = `| ${header.map(() => "---").join(" | ")} |`;
    return `\n\n${[line(header), sep, ...body.map(line)].join("\n")}\n\n`;
  },
});

// Embedded pictures are dropped rather than converted: mammoth would inline
// each one as a base64 data URL, which bloats the saved page enormously and is
// blocked by the Markdown renderer's URL sanitizer anyway (so it would never
// display). The admin is told how many were left out.
async function docxToHtml(buffer: Buffer): Promise<{ html: string; images: number }> {
  const result = await mammoth.convertToHtml(
    { buffer },
    { convertImage: mammoth.images.imgElement(async () => ({ src: "" })) }
  );
  const $ = cheerio.load(result.value, { xml: false });
  const images = $("img").length;
  $("img").remove();
  return { html: $("body").html() ?? result.value, images };
}

function imageNote(images: number): string[] {
  return images > 0
    ? [`${images} picture${images === 1 ? " was" : "s were"} in the document but can't be imported — only text and tables come across.`]
    : [];
}

function fallbackTitle(filename: string): string {
  return filename.replace(/\.(docx|xlsx|pdf)$/i, "").replace(/[_-]+/g, " ").trim();
}

// Section import: splits on top-level headings (Word "Heading 1/2" styles)
// into separate pages. Most of the documents this app has ingested so far
// don't use real Word heading styles (they use bold paragraphs instead), so
// the common case is one page holding the whole document — the admin can
// split it up afterward in the existing Plan Content editor, same as any
// other page edit.
async function parseDocxAsSection(buffer: Buffer, filename: string): Promise<SectionDraft> {
  const { html, images } = await docxToHtml(buffer);
  const $ = cheerio.load(html, { xml: false });
  const notes = imageNote(images);

  const headings = $("h1, h2").toArray();

  if (headings.length === 0) {
    const markdown = turndown.turndown($("body").html() ?? html).trim();
    return { title: fallbackTitle(filename), pages: [{ title: "Page 1", body: markdown }], notes };
  }

  const pages: DraftPage[] = [];

  // Anything before the first heading (a title block, an introduction) used to
  // be silently dropped; keep it as its own page.
  const intro = $("<div></div>");
  for (const el of $("body").children().toArray()) {
    const tag = (el as { tagName?: string }).tagName?.toLowerCase();
    if (tag === "h1" || tag === "h2") break;
    intro.append($(el).clone());
  }
  const introMarkdown = turndown.turndown(intro.html() ?? "").trim();
  if (introMarkdown) pages.push({ title: "Overview", body: introMarkdown });

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const title = $(heading).text().trim() || `Page ${i + 1}`;
    const wrapper = $("<div></div>");
    let node = $(heading).next();
    while (node.length > 0 && !["h1", "h2"].includes((node.get(0) as { tagName?: string })?.tagName?.toLowerCase() ?? "")) {
      wrapper.append(node.clone());
      node = node.next();
    }
    const markdown = turndown.turndown(wrapper.html() ?? "").trim();
    pages.push({ title, body: markdown });
  }

  return { title: fallbackTitle(filename), pages, notes };
}

// Checklist import: table rows shaped like {#, Action, Responsible,
// Completed} (the pattern used across every IC activation checklist so far)
// become one item per row, with a single wide/merged cell treated as a
// phase-header marker item. Falls back to flattening bullet lists / bold
// paragraphs when there's no table — same "PHASE:" marker convention used
// throughout this app's existing checklists.
async function parseDocxAsChecklist(buffer: Buffer, filename: string): Promise<ChecklistDraft> {
  const { html, images } = await docxToHtml(buffer);
  const $ = cheerio.load(html, { xml: false });

  const items: string[] = [];
  const table = $("table").toArray().find((t) => $(t).find("tr").length > 2);

  if (table) {
    const rows = $(table).find("tr").toArray();
    const headerCells = $(rows[0])
      .find("th, td")
      .toArray()
      .map((c) => $(c).text().trim().toLowerCase());
    const responsibleCol = headerCells.findIndex((h) => h.includes("responsible"));
    const numberCol = headerCells.findIndex((h) => h === "#" || h === "no." || h === "no");
    // The "action"/description column — the one with the actual task text.
    // Prefer a header literally called "action"; otherwise assume it's
    // whichever non-#, non-responsible column holds the most text across
    // the body rows (robust to differently-labeled or unlabeled columns).
    let actionCol = headerCells.findIndex((h) => h.includes("action") || h.includes("task") || h.includes("item"));
    if (actionCol < 0) {
      const bodyRows = rows.slice(1);
      const lengths = headerCells.map((_, col) =>
        bodyRows.reduce((sum, row) => {
          const cell = $(row).find("td, th").toArray()[col];
          return sum + (cell ? $(cell).text().length : 0);
        }, 0)
      );
      actionCol = lengths.indexOf(Math.max(...lengths));
    }

    for (const row of rows.slice(1)) {
      const cells = $(row).find("td, th").toArray();
      if (cells.length === 0) continue;

      const isMerged = cells.length === 1 || $(cells[0]).attr("colspan");
      if (isMerged) {
        const text = $(cells[0]).text().trim();
        if (text) items.push(`PHASE: ${text}`);
        continue;
      }

      const actionCell = cells[actionCol] ?? cells[0];
      const actionHtml = $(actionCell).html() ?? "";
      const actionCell$ = cheerio.load(actionHtml);
      const bold = actionCell$("strong, b").first().text().trim();
      const rest = actionCell$.root()
        .text()
        .replace(bold, "")
        .trim();
      const label = bold || $(actionCell).text().trim();
      const detail = bold && rest ? ` — ${rest}` : "";

      const number = numberCol >= 0 && cells[numberCol] ? $(cells[numberCol]).text().trim() : "";
      const prefix = number ? `${number}. ` : "";

      const responsible =
        responsibleCol >= 0 && cells[responsibleCol] ? $(cells[responsibleCol]).text().trim() : "";
      const suffix = responsible ? ` (Responsible: ${responsible})` : "";

      const text = `${prefix}${label}${detail}${suffix}`.trim();
      if (text) items.push(text);
    }
  } else {
    // No table: flatten headings/bold paragraphs as phase markers and every
    // list item / plain paragraph as its own item.
    //
    // Nested lists are walked recursively, taking each <li>'s *own* text only.
    // Reading a parent <li>'s full text and then also visiting its nested
    // <li>s (what a flat `find("li")` does) emits the same sentences twice:
    // once glued together inside the parent, once again as separate items.
    const collectListItems = (list: Parameters<typeof $>[0]) => {
      $(list)
        .children("li")
        .toArray()
        .forEach((li) => {
          const ownText = $(li)
            .clone()
            .children("ul, ol")
            .remove()
            .end()
            .text()
            .replace(/\s+/g, " ")
            .trim();
          if (ownText) items.push(ownText);
          $(li)
            .children("ul, ol")
            .toArray()
            .forEach(collectListItems);
        });
    };

    $("body")
      .children()
      .toArray()
      .forEach((el) => {
        const tag = (el as { tagName?: string }).tagName?.toLowerCase();
        if (tag === "ul" || tag === "ol") {
          collectListItems(el);
        } else if (tag === "h1" || tag === "h2" || tag === "h3") {
          const text = $(el).text().trim();
          if (text) items.push(`PHASE: ${text}`);
        } else if (tag === "p") {
          const isBoldOnly = $(el).children().length === 1 && $(el).find("strong, b").length === 1;
          const text = $(el).text().trim();
          if (!text) return;
          items.push(isBoldOnly ? `${text}:` : text);
        }
      });
  }

  return { title: fallbackTitle(filename), items, notes: imageNote(images) };
}

// A problem the admin can fix (an unreadable or empty file), reported to them
// as-is — as opposed to a bug, which they only get a generic message for.
export class UserFacingImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingImportError";
  }
}

// ---------------------------------------------------------------------------
// Spreadsheets (.xlsx)
// ---------------------------------------------------------------------------

const ROWS_PER_PAGE = 40; // keeps each page readable on a phone
const MAX_ROWS_PER_SHEET = 2000;
const MAX_PAGES = 60;
const MAX_CHECKLIST_ITEMS = 500;
const MAX_COLUMNS = 100;

// Shows a number the way the spreadsheet does (percentages, decimals,
// thousands separators, phone-number formats) instead of the raw stored value.
function formatNumber(value: number, numFmt: string | undefined): string {
  const fmt = (numFmt ?? "General").replace(/"/g, "");
  if (fmt === "General") return String(value);
  const decimals = fmt.match(/\.(0+)/)?.[1].length;
  if (fmt.includes("%")) return `${(value * 100).toFixed(decimals ?? 0)}%`;
  if (/^\(?0{3}\)?[\s-]?0{3}-?0{4}$/.test(fmt) && Number.isInteger(value) && String(value).length === 10) {
    const d = String(value);
    return fmt.includes("(")
      ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
      : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }
  const grouping = fmt.includes("#,##0") || fmt.includes("#,###");
  if (decimals !== undefined || grouping) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: decimals ?? 0,
      maximumFractionDigits: decimals ?? 0,
      useGrouping: grouping,
    });
  }
  return String(value);
}

// ExcelJS cell values aren't always plain strings/numbers — rich text,
// formulas, hyperlinks and dates all come back as distinct shapes.
function valueText(value: unknown, numFmt?: string): string {
  if (value == null) return "";
  if (value instanceof Date) {
    // Spreadsheet dates are stored without a time zone; read them as UTC so
    // the date doesn't shift by a day depending on the server's location.
    const date = value.toLocaleDateString("en-US", { timeZone: "UTC" });
    const timed = /h{1,2}:mm|AM\/PM/i.test(numFmt ?? "");
    return timed
      ? `${date} ${value.toLocaleTimeString("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" })}`
      : date;
  }
  if (typeof value === "number") return formatNumber(value, numFmt);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value !== "object") return String(value);

  const v = value as {
    richText?: { text: string }[];
    text?: unknown;
    result?: unknown;
    hyperlink?: string;
    error?: string;
  };
  if (v.error) return "";
  if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
  if (typeof v.result !== "undefined") return valueText(v.result, numFmt);
  // Hyperlink cells nest their display text as { text: <richText object>,
  // hyperlink: "..." } rather than a plain string — recurse rather than
  // assuming .text is already a string.
  if (typeof v.text !== "undefined") return valueText(v.text, numFmt);
  return String(value);
}

function escapeMarkdownCell(text: string): string {
  return text.trim().replace(/\|/g, "\\|").replace(/\s+/g, " ");
}

// One worksheet as a clean grid of strings: merged cells appear once (ExcelJS
// otherwise repeats a merged title in every column it spans), hidden rows and
// columns are skipped, and columns that are empty throughout are dropped.
function sheetToGrid(sheet: ExcelJS.Worksheet): string[][] {
  let maxCol = 0;
  sheet.eachRow({ includeEmpty: false }, (row) => {
    maxCol = Math.max(maxCol, row.cellCount);
  });
  maxCol = Math.min(maxCol, MAX_COLUMNS);
  const hiddenCol = Array.from({ length: maxCol + 1 }, (_, c) => (c > 0 ? Boolean(sheet.getColumn(c).hidden) : false));

  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    if (row.hidden) return;
    const cells: string[] = [];
    for (let c = 1; c <= maxCol; c++) {
      if (hiddenCol[c]) continue;
      const cell = row.getCell(c);
      if (cell.isMerged && cell.master && cell.master.address !== cell.address) {
        cells.push("");
        continue;
      }
      cells.push(escapeMarkdownCell(valueText(cell.value, cell.numFmt)));
    }
    if (cells.some(Boolean)) rows.push(cells);
  });
  if (rows.length === 0) return rows;

  const keep = rows[0].map((_, i) => i).filter((i) => rows.some((r) => r[i]));
  return rows.map((r) => keep.map((i) => r[i]));
}

// Title rows above the real table (a merged banner, a report name) are kept as
// text; the first row with two or more filled cells is the table header.
function splitTitles(grid: string[][]): { titles: string[]; header: string[] | null; body: string[][] } {
  let start = 0;
  const titles: string[] = [];
  while (start < grid.length && start < 4 && grid[start].filter(Boolean).length <= 1) {
    const text = grid[start].find(Boolean);
    if (text) titles.push(text);
    start++;
  }
  if (start >= grid.length) return { titles, header: null, body: [] };
  return { titles, header: grid[start], body: grid.slice(start + 1) };
}

function markdownTable(header: string[], rows: string[][]): string {
  const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
  return [line(header), line(header.map(() => "---")), ...rows.map(line)].join("\n");
}

function isVisible(sheet: ExcelJS.Worksheet): boolean {
  return sheet.state === "visible" || sheet.state === undefined;
}

async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
}

// Spreadsheet import: one page per worksheet, rendered as a Markdown table —
// long sheets are split into pages of ROWS_PER_PAGE rows (each repeating the
// header) because one enormous table is unusable on a phone.
async function parseXlsxAsSection(buffer: Buffer, filename: string): Promise<SectionDraft> {
  const workbook = await loadWorkbook(buffer);
  const notes: string[] = [];
  const pages: DraftPage[] = [];

  workbook.eachSheet((sheet) => {
    if (!isVisible(sheet)) return;
    const grid = sheetToGrid(sheet);
    if (grid.length === 0) return;
    const { titles, header, body } = splitTitles(grid);
    const titleText = titles.join("\n\n");

    if (!header) {
      pages.push({ title: sheet.name, body: titles.join("\n\n") });
      return;
    }

    let rows = body;
    if (rows.length > MAX_ROWS_PER_SHEET) {
      notes.push(`"${sheet.name}" has ${rows.length.toLocaleString("en-US")} rows; only the first ${MAX_ROWS_PER_SHEET.toLocaleString("en-US")} were imported.`);
      rows = rows.slice(0, MAX_ROWS_PER_SHEET);
    }
    const chunks: string[][][] = [];
    for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) chunks.push(rows.slice(i, i + ROWS_PER_PAGE));
    if (chunks.length === 0) chunks.push([]);
    if (chunks.length > 1) {
      notes.push(`"${sheet.name}" has ${rows.length.toLocaleString("en-US")} rows, so it was split into ${chunks.length} pages of up to ${ROWS_PER_PAGE} rows.`);
    }

    chunks.forEach((chunk, i) => {
      pages.push({
        title: chunks.length > 1 ? `${sheet.name} (part ${i + 1} of ${chunks.length})` : sheet.name,
        body: `${i === 0 && titleText ? `${titleText}\n\n` : ""}${markdownTable(header, chunk)}`,
      });
    });
  });

  if (pages.length === 0) throw new UserFacingImportError("That spreadsheet has no data to import.");
  if (pages.length > MAX_PAGES) {
    notes.push(`The workbook produced ${pages.length} pages; only the first ${MAX_PAGES} were kept.`);
    pages.length = MAX_PAGES;
  }
  return { title: fallbackTitle(filename), pages, notes };
}

// Spreadsheet-as-checklist: every data row becomes one item, joining its
// cells with " — " (a spreadsheet has no bold/table semantics to detect
// phases the way the .docx path does, so titles and sheet names stand in).
async function parseXlsxAsChecklist(buffer: Buffer, filename: string): Promise<ChecklistDraft> {
  const workbook = await loadWorkbook(buffer);
  const notes: string[] = [];
  const items: string[] = [];
  const sheets = workbook.worksheets.filter(isVisible);

  for (const sheet of sheets) {
    const grid = sheetToGrid(sheet);
    if (grid.length === 0) continue;
    const { titles, header, body } = splitTitles(grid);
    if (sheets.length > 1) items.push(`PHASE: ${sheet.name}`);
    for (const t of titles) items.push(`PHASE: ${t}`);
    if (!header) continue;
    // A one-row table has no separate header — treat that row as data.
    const rows = body.length === 0 ? [header] : body;
    for (const row of rows) {
      const text = row.filter(Boolean).join(" — ");
      if (text) items.push(text);
    }
  }

  if (items.length === 0) throw new UserFacingImportError("That spreadsheet has no data to import.");
  if (items.length > MAX_CHECKLIST_ITEMS) {
    notes.push(`The spreadsheet has ${items.length.toLocaleString("en-US")} rows; only the first ${MAX_CHECKLIST_ITEMS} were imported as checklist items.`);
    items.length = MAX_CHECKLIST_ITEMS;
  }
  return { title: fallbackTitle(filename), items, notes };
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
//
// A PDF carries no real headings, lists or tables — only text placed at
// positions — so pdf-text.ts infers them from the layout. It is the
// lowest-fidelity path of the three formats, and the admin is told so.

const PDF_NOTE =
  "This text was rebuilt from the PDF's page layout, so check the headings, lists and tables before publishing.";

async function loadPdfBlocks(buffer: Buffer): Promise<PdfBlock[]> {
  try {
    return await extractPdfBlocks(buffer);
  } catch (err) {
    if (err instanceof Error && err.name === "NoPdfTextError") {
      throw new UserFacingImportError(
        "This PDF has no selectable text — it looks like a scan or a drawing. Export a text version from the original document, or upload a Word or Excel file instead."
      );
    }
    throw err;
  }
}

async function parsePdfAsSection(buffer: Buffer, filename: string): Promise<SectionDraft> {
  const blocks = await loadPdfBlocks(buffer);

  // Split into pages at the top-level headings, when there are at least two.
  const headingLevels = blocks.flatMap((b) => (b.type === "heading" ? [b.level] : []));
  const top = headingLevels.length ? Math.min(...headingLevels) : 0;
  const starts = blocks.flatMap((b, i) => (b.type === "heading" && b.level === top ? [i] : []));

  if (starts.length < 2) {
    return { title: fallbackTitle(filename), pages: [{ title: "Page 1", body: blocksToMarkdown(blocks) }], notes: [PDF_NOTE] };
  }

  const pages: DraftPage[] = [];
  const before = blocks.slice(0, starts[0]);
  if (before.length > 0) pages.push({ title: "Overview", body: blocksToMarkdown(before) });
  starts.forEach((start, k) => {
    const heading = blocks[start] as Extract<PdfBlock, { type: "heading" }>;
    pages.push({ title: heading.text, body: blocksToMarkdown(blocks.slice(start + 1, starts[k + 1] ?? blocks.length)) });
  });
  return { title: fallbackTitle(filename), pages, notes: [PDF_NOTE] };
}

async function parsePdfAsChecklist(buffer: Buffer, filename: string): Promise<ChecklistDraft> {
  const blocks = await loadPdfBlocks(buffer);
  const items: string[] = [];
  for (const b of blocks) {
    if (b.type === "heading") items.push(`PHASE: ${b.text}`);
    else if (b.type === "paragraph") items.push(b.text);
    else if (b.type === "list") items.push(...b.items);
    else {
      // The first row of a real table is its header, not an action.
      const rows = b.rows.length >= 3 ? b.rows.slice(1) : b.rows;
      for (const row of rows) {
        const text = row.filter(Boolean).join(" — ");
        if (text) items.push(text);
      }
    }
  }
  return { title: fallbackTitle(filename), items, notes: [PDF_NOTE] };
}

export type SupportedExt = "docx" | "xlsx" | "pdf";

export function extensionOf(filename: string): SupportedExt | null {
  const match = filename.toLowerCase().match(/\.(docx|xlsx|pdf)$/);
  return (match?.[1] as SupportedExt) ?? null;
}

export async function parseDocumentAsSection(buffer: Buffer, filename: string): Promise<SectionDraft> {
  switch (extensionOf(filename)) {
    case "docx":
      return parseDocxAsSection(buffer, filename);
    case "xlsx":
      return parseXlsxAsSection(buffer, filename);
    case "pdf":
      return parsePdfAsSection(buffer, filename);
    default:
      throw new Error("Unsupported file type");
  }
}

export async function parseDocumentAsChecklist(buffer: Buffer, filename: string): Promise<ChecklistDraft> {
  switch (extensionOf(filename)) {
    case "docx":
      return parseDocxAsChecklist(buffer, filename);
    case "xlsx":
      return parseXlsxAsChecklist(buffer, filename);
    case "pdf":
      return parsePdfAsChecklist(buffer, filename);
    default:
      throw new Error("Unsupported file type");
  }
}
