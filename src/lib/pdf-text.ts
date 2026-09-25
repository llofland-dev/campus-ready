// Rebuilds readable structure (headings, paragraphs, bullet/numbered lists,
// simple tables) from the positioned text a PDF actually contains. A PDF has
// no real paragraphs or lists — only strings placed at coordinates — so this
// infers them from geometry: font size, vertical gaps, horizontal gaps, and
// leading bullet/number markers. It is a best-effort draft: the admin reviews
// and edits it before anything is saved.
//
// Deliberately free of any server-only imports so it can be tested in
// isolation. The PDF library is loaded lazily (see extractPdfBlocks) so that a
// problem with it can never take down the rest of the importer.

export interface PositionedText {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  hasEOL: boolean;
}

export type PdfBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; rows: string[][] };

export class NoPdfTextError extends Error {
  constructor() {
    super("no extractable text");
    this.name = "NoPdfTextError";
  }
}

interface Line {
  page: number;
  y: number;
  x: number; // left edge of the first item
  size: number; // dominant font size
  text: string;
  cells: string[]; // split at wide horizontal gaps (table columns)
  chars: number;
  top: boolean; // in the top margin band of its page
  bottom: boolean; // in the bottom margin band of its page
}

const BULLET = /^([•●▪■◦○·‣▫\-–—*]|o(?=\s))\s+/;
const NUMBERED = /^(\d{1,3}[.)]|\(?[a-zA-Z][.)]|\([ivxIVX]+\)|[ivxIVX]{1,4}\.)\s+/;
const PAGE_NUMBER = /^(page\s*)?\d{1,4}(\s*(of|\/)\s*\d{1,4})?$/i;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function normalizeForRepeat(text: string): string {
  return text.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();
}

// Groups one page's text pieces into visual lines, each split into "cells"
// wherever there is a wide horizontal gap (that is how a table row looks).
function buildLines(pageItems: PositionedText[], pageNo: number): Line[] {
  const items = pageItems.filter((i) => i.str.trim() !== "" && i.fontSize > 0);
  if (items.length === 0) return [];

  const sizes = items.map((i) => i.fontSize);
  const tol = Math.max(1.5, median(sizes) * 0.45);
  const ys = items.map((i) => i.y);
  const maxY = Math.max(...ys);
  const minY = Math.min(...ys);
  const span = Math.max(1, maxY - minY);

  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const groups: PositionedText[][] = [];
  for (const item of sorted) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(g[0].y - item.y) <= tol) g.push(item);
    else groups.push([item]);
  }

  return groups.map((g) => {
    g.sort((a, b) => a.x - b.x);
    const size = median(g.map((i) => i.fontSize));
    const cells: string[] = [];
    let current = "";
    let prevEnd = g[0].x;
    for (const item of g) {
      const gap = item.x - prevEnd;
      if (current && gap > size * 2.4) {
        cells.push(current.trim());
        current = "";
      } else if (current && gap > size * 0.18 && !current.endsWith(" ") && !item.str.startsWith(" ")) {
        current += " ";
      }
      current += item.str;
      prevEnd = item.x + item.width;
    }
    if (current.trim()) cells.push(current.trim());
    const text = cells.join("  ").replace(/\s+/g, " ").trim();
    const y = g[0].y;
    return {
      page: pageNo,
      y,
      x: g[0].x,
      size,
      text,
      cells,
      chars: text.length,
      top: y > maxY - span * 0.07,
      bottom: y < minY + span * 0.07,
    };
    // A row of "=====" or "_____" typed as a divider is decoration, not content.
  }).filter((line) => !/^[=_\-*~.\s─-╿]{6,}$/.test(line.text));
}

// Headers, footers and page numbers repeat on every page and would otherwise
// be sprinkled through the body text.
function dropRunningHeadersAndFooters(pages: Line[][]): Line[][] {
  const counts = new Map<string, number>();
  for (const lines of pages) {
    const seen = new Set<string>();
    for (const l of lines) {
      if (!(l.top || l.bottom)) continue;
      seen.add(normalizeForRepeat(l.text));
    }
    for (const key of seen) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const threshold = Math.max(2, Math.ceil(pages.length * 0.5));
  return pages.map((lines) =>
    lines.filter((l) => {
      if (!(l.top || l.bottom)) return true;
      if (PAGE_NUMBER.test(l.text)) return false;
      return (counts.get(normalizeForRepeat(l.text)) ?? 0) < threshold || pages.length < 2;
    })
  );
}

function isAllCaps(text: string): boolean {
  const letters = text.replace(/[^A-Za-z]/g, "");
  return letters.length >= 4 && letters === letters.toUpperCase();
}

function endsSentence(text: string): boolean {
  return /[.!?:;)"”']$/.test(text.trim());
}

function joinWrapped(a: string, b: string): string {
  // A word split across lines with a hyphen ("emer-" / "gency") is rejoined.
  if (/[A-Za-z]-$/.test(a) && /^[a-z]/.test(b)) return a.slice(0, -1) + b;
  return `${a} ${b}`;
}

export function layoutToBlocks(pageItems: PositionedText[][]): PdfBlock[] {
  const pages = dropRunningHeadersAndFooters(pageItems.map((items, i) => buildLines(items, i)));
  const lines = pages.flat();
  if (lines.length === 0) return [];

  // Body font size = the size that carries the most text.
  const weight = new Map<number, number>();
  for (const l of lines) {
    const key = Math.round(l.size * 2) / 2;
    weight.set(key, (weight.get(key) ?? 0) + l.chars);
  }
  const bodySize = [...weight.entries()].sort((a, b) => b[1] - a[1])[0][0];

  // Typical distance between consecutive lines of one paragraph.
  const pitches: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].page === lines[i - 1].page) {
      const d = lines[i - 1].y - lines[i].y;
      if (d > 0 && d < bodySize * 3) pitches.push(d);
    }
  }
  const pitch = median(pitches) || bodySize * 1.25;

  const headingSizes = [...new Set(lines.filter((l) => l.size >= bodySize * 1.15).map((l) => Math.round(l.size)))].sort(
    (a, b) => b - a
  );
  const levelForSize = (size: number): 1 | 2 | 3 => {
    const idx = headingSizes.indexOf(Math.round(size));
    return (Math.min(Math.max(idx, 0), 2) + 1) as 1 | 2 | 3;
  };

  const blocks: PdfBlock[] = [];
  let paragraph: string | null = null;
  let list: { ordered: boolean; items: string[] } | null = null;
  let table: string[][] | null = null;
  let last: Line | null = null;

  const flush = () => {
    if (paragraph) blocks.push({ type: "paragraph", text: paragraph });
    if (list) blocks.push({ type: "list", ordered: list.ordered, items: list.items });
    if (table) {
      if (table.length >= 2) blocks.push({ type: "table", rows: table });
      else if (table.length === 1) blocks.push({ type: "paragraph", text: table[0].filter(Boolean).join("  ") });
    }
    paragraph = null;
    list = null;
    table = null;
  };

  for (const line of lines) {
    if (!line.text) continue;
    const gap = last && last.page === line.page ? last.y - line.y : Infinity;
    const newBlock = gap > pitch * 1.7;
    const bigFont = line.size >= bodySize * 1.15;
    const heading =
      (bigFont && line.chars <= 110 && line.cells.length <= 1 && !/[.,;]$/.test(line.text)) ||
      (isAllCaps(line.text) && line.chars <= 80 && line.cells.length <= 1 && newBlock && !BULLET.test(line.text));

    if (heading) {
      const prev = blocks[blocks.length - 1];
      const level = bigFont ? levelForSize(line.size) : 3;
      // A title that wraps onto a second line is one heading, not two. "Close"
      // is measured against the heading's own size — large type is spaced
      // further apart than body text, so the body-text pitch would miss it.
      const closeBelowLast = last !== null && last.page === line.page && last.y - line.y <= line.size * 2.3;
      if (bigFont && prev && prev.type === "heading" && !paragraph && !list && !table && prev.level === level && closeBelowLast && last && Math.abs(last.size - line.size) < 0.6) {
        prev.text = joinWrapped(prev.text, line.text);
      } else {
        flush();
        blocks.push({ type: "heading", level, text: line.text });
      }
      last = line;
      continue;
    }

    // Table rows: several cells on one line, sitting directly under other such rows.
    if (line.cells.length >= 2) {
      if (!table) {
        flush();
        table = [];
      }
      table.push(line.cells);
      last = line;
      continue;
    }
    if (table) flush();

    const bullet = line.text.match(BULLET);
    const numbered = !bullet ? line.text.match(NUMBERED) : null;
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const marker = (bullet ?? numbered)![0];
      const body = line.text.slice(marker.length).trim();
      if (paragraph) flush();
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push(ordered ? `${marker.trim()} ${body}` : body);
      last = line;
      continue;
    }

    if (list && !newBlock) {
      // A wrapped continuation of the previous list item.
      list.items[list.items.length - 1] = joinWrapped(list.items[list.items.length - 1], line.text);
      last = line;
      continue;
    }
    if (list) flush();

    const sameFlow = paragraph !== null && (!newBlock || (line.page !== last?.page && !endsSentence(paragraph) && /^[a-z]/.test(line.text)));
    if (paragraph !== null && sameFlow) paragraph = joinWrapped(paragraph, line.text);
    else {
      flush();
      paragraph = line.text;
    }
    last = line;
  }
  flush();
  return blocks;
}

const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

// Markdown would otherwise read a leading "#", ">" or "-" in ordinary text as formatting.
// The backslash goes before the punctuation ("1\."), not before the digit.
const safeStart = (s: string) =>
  /^\d+[.)]\s/.test(s) ? s.replace(/^(\d+)([.)])/, "$1\\$2") : /^[#>*+-]\s/.test(s) ? `\\${s}` : s;

export function blocksToMarkdown(blocks: PdfBlock[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === "heading") out.push(`${"#".repeat(b.level)} ${b.text}`);
    else if (b.type === "paragraph") out.push(safeStart(b.text));
    else if (b.type === "list") {
      out.push(b.items.map((it) => (b.ordered ? it.replace(/^(\S+)\s+/, (_m, n) => `${/^\d+/.test(n) ? n.replace(/[)]$/, ".") : "1."} `) : `- ${it}`)).join("\n"));
    } else {
      const width = Math.max(...b.rows.map((r) => r.length));
      const rows = b.rows.map((r) => [...r, ...Array(width - r.length).fill("")].map(esc));
      const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
      out.push([line(rows[0]), line(rows[0].map(() => "---")), ...rows.slice(1).map(line)].join("\n"));
    }
  }
  return out.join("\n\n");
}

export function totalChars(blocks: PdfBlock[]): number {
  return blocks.reduce((sum, b) => {
    if (b.type === "list") return sum + b.items.join("").length;
    if (b.type === "table") return sum + b.rows.flat().join("").length;
    return sum + b.text.length;
  }, 0);
}

// Loads the PDF library only when a PDF is actually imported.
export async function extractPdfBlocks(buffer: Buffer): Promise<PdfBlock[]> {
  const { extractTextItems, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  try {
    const { items } = await extractTextItems(pdf);
    const blocks = layoutToBlocks(items as PositionedText[][]);
    if (totalChars(blocks) < 60) throw new NoPdfTextError();
    return blocks;
  } finally {
    // Frees the parsed document; not part of the typed surface in every build.
    await (pdf as unknown as { destroy?: () => Promise<void> }).destroy?.();
  }
}
