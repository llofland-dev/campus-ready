// Synthetic documents for the post-deploy smoke test. Everything here is
// generated in code from obviously fake content, so the test never depends on
// (or leaks) anyone's real documents.

import ExcelJS from "exceljs";
import JSZip from "jszip";

// ---------------------------------------------------------------------------
// Word (.docx): real Heading styles, text before the first heading, a bulleted
// list, an embedded picture, a table, a hyperlink and phone numbers.
// ---------------------------------------------------------------------------
export async function makeDocx() {
  const W =
    'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const p = (t, style) =>
    `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64"
  );
  const image = `<w:p><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="990000" cy="792000"/><wp:docPr id="1" name="Picture 1"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="img.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId3"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="990000" cy="792000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  const cell = (t) => `<w:tc><w:p><w:r><w:t>${t}</w:t></w:r></w:p></w:tc>`;
  const row = (a, b) => `<w:tr>${cell(a)}${cell(b)}</w:tr>`;
  const link = `<w:p><w:hyperlink r:id="rId4"><w:r><w:t>Example Site</w:t></w:r></w:hyperlink><w:r><w:t xml:space="preserve"> - call (301) 555-0142 or 240.555.0188.</w:t></w:r></w:p>`;
  const body = [
    p("Smoke Test Guide (intro text BEFORE the first heading)"),
    p("Read this first: it applies to every section below."),
    p("Scope", "Heading1"),
    p("This guide covers a fictional outage."),
    p("Details", "Heading2"),
    p("Immediate actions:"),
    image,
    `<w:tbl><w:tr>${cell("Department")}${cell("Number")}</w:tr>${row("Front Desk", "301-555-0100")}${row("Security", "301-555-0111")}</w:tbl>`,
    link,
    p("Contacts", "Heading1"),
    p("Escalate to the Command Center."),
  ].join("");

  const z = new JSZip();
  z.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`
  );
  z.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
  );
  z.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com" TargetMode="External"/></Relationships>`
  );
  z.file(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:styles ${W}><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/></w:style></w:styles>`
  );
  z.file("word/media/image1.png", png);
  z.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8"?><w:document ${W}><w:body>${body}</w:body></w:document>`);
  return Buffer.from(await z.generateAsync({ type: "nodebuffer" }));
}

// ---------------------------------------------------------------------------
// Excel (.xlsx): a merged title banner over a header row, 95 data rows (must be
// split into pages), a percentage, a phone-formatted number, a date, and a
// hidden sheet that must NOT be imported.
// ---------------------------------------------------------------------------
export const XLSX_ROWS = 95;

export async function makeXlsx() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Contact List");
  ws.mergeCells("A1:D1");
  ws.getCell("A1").value = "SMOKE TEST BANNER - Fictional Contact List";
  ws.addRow(["Department", "Phone", "Coverage", "Updated"]);
  for (let i = 1; i <= XLSX_ROWS; i++) {
    const row = ws.addRow([`Dept ${i}`, 3015550100 + i, i / 100, new Date(Date.UTC(2026, 8, (i % 27) + 1))]);
    row.getCell(2).numFmt = "(000) 000-0000";
    row.getCell(3).numFmt = "0%";
    row.getCell(4).numFmt = "m/d/yyyy";
  }
  const hidden = wb.addWorksheet("Secret");
  hidden.addRow(["HIDDEN-SHEET-MARKER", "should never be imported"]);
  hidden.state = "hidden";
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ---------------------------------------------------------------------------
// PDF: hand-built so no PDF library is needed. Titles use a larger font than
// body text so the importer's layout rules have real signals to work with.
// ---------------------------------------------------------------------------
function buildPdf(contentStream) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(contentStream)} >>\nstream\n${contentStream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

const esc = (s) => s.replace(/([\\()])/g, "\\$1");

// A text PDF: a large title, a heading, a paragraph, a bulleted list and a phone number.
export function makeTextPdf() {
  const lines = [
    { font: "F2", size: 24, y: 720, text: "Smoke Test Policy" },
    { font: "F2", size: 16, y: 670, text: "Purpose" },
    { font: "F1", size: 11, y: 645, text: "This fictional policy exists only to exercise the PDF importer on the live site." },
    { font: "F1", size: 11, y: 630, text: "It wraps onto a second line to check that lines are joined into one paragraph." },
    { font: "F2", size: 16, y: 590, text: "Actions" },
    { font: "F1", size: 11, y: 565, text: "- Notify the Administrator on Call" },
    { font: "F1", size: 11, y: 550, text: "- Start a Fire Watch if needed" },
    { font: "F1", size: 11, y: 535, text: "- Call the Command Center at (301) 555-0142" },
  ];
  const stream = lines.map((l) => `BT /${l.font} ${l.size} Tf 72 ${l.y} Td (${esc(l.text)}) Tj ET`).join("\n");
  return buildPdf(stream);
}

// A PDF with a drawing but no text at all (like a scanned page or a floor plan).
export function makeNoTextPdf() {
  return buildPdf("0 0 1 RG 100 100 300 300 re S\n100 100 m 400 400 l S");
}
