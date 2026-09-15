import "server-only";
import mammoth from "mammoth";
import TurndownService from "turndown";
import * as cheerio from "cheerio";
import ExcelJS from "exceljs";
import { PDFParse } from "pdf-parse";

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
}

export interface ChecklistDraft {
  title: string;
  items: string[];
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

async function docxToHtml(buffer: Buffer): Promise<{ html: string; warnings: string[] }> {
  const result = await mammoth.convertToHtml({ buffer });
  return { html: result.value, warnings: result.messages.map((m) => m.message) };
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
  const { html } = await docxToHtml(buffer);
  const $ = cheerio.load(html, { xml: false });

  const headings = $("h1, h2").toArray();

  if (headings.length === 0) {
    const markdown = turndown.turndown($("body").html() ?? html).trim();
    return { title: fallbackTitle(filename), pages: [{ title: "Page 1", body: markdown }] };
  }

  const pages: DraftPage[] = [];
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

  return { title: fallbackTitle(filename), pages };
}

// Checklist import: table rows shaped like {#, Action, Responsible,
// Completed} (the pattern used across every IC activation checklist so far)
// become one item per row, with a single wide/merged cell treated as a
// phase-header marker item. Falls back to flattening bullet lists / bold
// paragraphs when there's no table — same "PHASE:" marker convention used
// throughout this app's existing checklists.
async function parseDocxAsChecklist(buffer: Buffer, filename: string): Promise<ChecklistDraft> {
  const { html } = await docxToHtml(buffer);
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
    $("body")
      .children()
      .toArray()
      .forEach((el) => {
        const tag = (el as { tagName?: string }).tagName?.toLowerCase();
        if (tag === "ul" || tag === "ol") {
          $(el)
            .find("li")
            .toArray()
            .forEach((li) => {
              const text = $(li).text().trim();
              if (text) items.push(text);
            });
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

  return { title: fallbackTitle(filename), items };
}

// ExcelJS cell values aren't always plain strings/numbers — rich text,
// formulas, and hyperlinks all come back as distinct object shapes.
function cellText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value !== "object") return String(value);

  const v = value as { richText?: { text: string }[]; text?: unknown; result?: unknown; hyperlink?: string };
  if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
  if (typeof v.result !== "undefined") return cellText(v.result);
  // Hyperlink cells nest their display text as { text: <richText object>,
  // hyperlink: "..." } rather than a plain string — recurse rather than
  // assuming .text is already a string.
  if (typeof v.text !== "undefined") return cellText(v.text);
  return String(value);
}

function escapeMarkdownCell(value: unknown): string {
  return cellText(value).trim().replace(/\|/g, "\\|").replace(/\s+/g, " ");
}

// Spreadsheet import: one page per worksheet, rendered as a Markdown table —
// this is exactly the shape POTS Lines' facility sheets used (Department |
// Number columns), transcribed by hand before this importer existed.
async function parseXlsxAsSection(buffer: Buffer, filename: string): Promise<SectionDraft> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const pages: DraftPage[] = [];
  workbook.eachSheet((sheet) => {
    const rows: string[][] = [];
    sheet.eachRow((row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        cells.push(escapeMarkdownCell(cell.value));
      });
      if (cells.some((c) => c)) rows.push(cells);
    });
    if (rows.length === 0) return;

    const header = rows[0];
    const sep = header.map(() => "---");
    const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
    const markdown = [line(header), line(sep), ...rows.slice(1).map(line)].join("\n");
    pages.push({ title: sheet.name, body: markdown });
  });

  return { title: fallbackTitle(filename), pages };
}

// Spreadsheet-as-checklist: every non-empty row becomes one item, joining
// its cells with " — " (no table/bold semantics exist in a spreadsheet to
// detect phases or a dedicated action column the way the .docx path does).
async function parseXlsxAsChecklist(buffer: Buffer, filename: string): Promise<ChecklistDraft> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const items: string[] = [];
  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: false }, (cell) => {
        const text = escapeMarkdownCell(cell.value);
        if (text) cells.push(text);
      });
      if (cells.length > 0) items.push(cells.join(" — "));
    });
  });

  return { title: fallbackTitle(filename), items };
}

// PDF import: plain text extraction only — PDFs don't carry the same
// semantic structure (bold/tables/headings) .docx does via mammoth, so this
// is the lowest-fidelity path of the three formats. Blank-line-separated
// blocks become paragraphs for section import, or one item per non-empty
// line for checklist import; expect more manual cleanup in the review step
// than with a Word document.
async function pdfToText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function parsePdfAsSection(buffer: Buffer, filename: string): Promise<SectionDraft> {
  const text = await pdfToText(buffer);
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const body = paragraphs.join("\n\n");
  return { title: fallbackTitle(filename), pages: [{ title: "Page 1", body }] };
}

async function parsePdfAsChecklist(buffer: Buffer, filename: string): Promise<ChecklistDraft> {
  const text = await pdfToText(buffer);
  // Splitting on every line break (rather than blank-line-separated
  // paragraphs, as the section path does) would turn each wrapped line of
  // running prose into its own "item" — fine for a genuinely list-shaped
  // PDF (one short line per action), but produces thousands of
  // near-meaningless fragments out of a multi-page prose document. This is
  // the same tradeoff either way without knowing the PDF's shape in
  // advance; paragraph-level splitting degrades far more gracefully.
  const items = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return { title: fallbackTitle(filename), items };
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
