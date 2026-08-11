import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { ANNEX_HELP, ANNEX_INSTRUCTIONS, ANNEX_SECTIONS, AnnexSection, AnnexState, isRowEmpty, OTHER_VALUE } from "../../data/annexSections";

// Ported from api/Data/annexbuilder.html's buildPdfDocument() — same layout,
// copy and colour palette. Blank cells still use real pdf-lib form fields
// (rather than the mockup's flat drawn boxes) so the user gets an actually
// fillable PDF; nothing here is ever sent to or stored by the backend — see
// AnnexBuilder.tsx.

const rgb255 = (r: number, g: number, b: number) => rgb(r / 255, g / 255, b / 255);
const COLORS = {
  ink: rgb255(20, 24, 27),
  inkSoft: rgb255(92, 101, 112),
  inkFaint: rgb255(138, 144, 150),
  green: rgb255(79, 157, 51),
  greenDark: rgb255(45, 107, 31),
  greenTint: rgb255(243, 247, 231),
  border: rgb255(229, 232, 227),
  bgSoft: rgb255(245, 247, 243),
};

const resolvedValue = (row: Record<string, string>, key: string) =>
  row[key] === OTHER_VALUE ? (row[key + "_custom"] || "") : (row[key] || "");

const wrapText = (text: string, font: PDFFont, size: number, maxWidth: number): string[] => {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  words.forEach(w => {
    const test = cur ? cur + " " + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  });
  if (cur) lines.push(cur);
  return lines;
};

export async function generateAnnexPdf(state: AnnexState, testatorName: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const form = pdfDoc.getForm();
  const fontR = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595.28, PAGE_H = 841.89;
  const MARGIN = 50;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  let page: PDFPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 42;
  let fieldCounter = 0;

  const drawHeaderRule = () => {
    page.drawLine({ start: { x: MARGIN, y: PAGE_H - 62 }, end: { x: PAGE_W - MARGIN, y: PAGE_H - 62 }, thickness: 0.75, color: COLORS.border });
  };
  const newPage = () => {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - 80;
    drawHeaderRule();
  };
  const ensure = (h: number) => { if (y - h < 56) newPage(); };

  drawHeaderRule();
  y = PAGE_H - 80;

  // ---- Title block ----
  page.drawText("ANNEXURE A · SCHEDULE OF FINANCIAL ASSETS", { x: MARGIN, y: y - 9, size: 9, font: fontB, color: COLORS.greenDark });
  y -= 20;

  page.drawText("Schedule of Financial Assets", { x: MARGIN, y: y - 23, size: 23, font: fontB, color: COLORS.ink });
  // 23pt bold text needs more clearance than a flat 18pt gap gives it (its
  // descender alone eats ~5pt of that), which was letting the intro
  // paragraph's first line render up into the heading's own line box.
  y -= 32;

  const introText = "This Schedule forms Annexure A to the Last Will and Testament" +
    (testatorName ? ` of ${testatorName}` : "") +
    ". It lists the institutions where the Testator/Testatrix holds the financial assets described below, to help the " +
    "Executor, nominees and legal heirs locate and claim them. Account, folio, certificate and policy numbers, and " +
    "nominee names, are to be filled in by hand and need not be typed or stored digitally.";
  const introLines = wrapText(introText, fontR, 10.5, CONTENT_W);
  introLines.forEach((line, i) => page.drawText(line, { x: MARGIN, y: y - 10.5 - i * 12.5, size: 10.5, font: fontR, color: COLORS.inkSoft }));
  y -= introLines.length * 12.5 + 14;

  page.drawText("Name of Testator / Testatrix:", { x: MARGIN, y: y - 10, size: 10, font: fontB, color: COLORS.ink });
  const nameLabelW = fontB.widthOfTextAtSize("Name of Testator / Testatrix:  ", 10);
  if (testatorName) page.drawText(testatorName, { x: MARGIN + nameLabelW, y: y - 10, size: 10, font: fontR, color: COLORS.ink });
  page.drawLine({ start: { x: MARGIN + nameLabelW, y: y - 13 }, end: { x: MARGIN + CONTENT_W, y: y - 13 }, thickness: 0.7, color: COLORS.inkFaint });
  y -= 14;

  const genDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  page.drawText(`Prepared on ${genDate}`, { x: MARGIN, y: y - 8.5, size: 8.5, font: fontR, color: COLORS.inkFaint });
  y -= 20;

  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + 60, y }, thickness: 1.4, color: COLORS.green });
  y -= 22;

  // ---- Table column layout ----
  const colWidths = [138, 88, 36, 100, 108];
  const gutter = 6;
  const colX = (i: number) => MARGIN + colWidths.slice(0, i).reduce((a, w) => a + w + gutter, 0);

  const drawSectionHeader = (section: AnnexSection, continued: boolean) => {
    const barH = 20;
    ensure(barH + 40);
    page.drawRectangle({ x: MARGIN, y: y - barH, width: CONTENT_W, height: barH, color: COLORS.greenTint, borderColor: COLORS.border, borderWidth: 0.6 });
    page.drawText(`${section.letter}.  ${section.title}${continued ? " (continued)" : ""}`, { x: MARGIN + 10, y: y - 14, size: 10.5, font: fontB, color: COLORS.greenDark });
    y -= barH + 5;

    if (section.subtitle && !continued) {
      const wrapped = wrapText(section.subtitle, fontR, 8, CONTENT_W - 4);
      wrapped.forEach((line, i) => page.drawText(line, { x: MARGIN + 2, y: y - 7 - i * 9.5, size: 8, font: fontR, color: COLORS.inkFaint }));
      y -= wrapped.length * 9.5 + 6;
    }

    const headers = ["INSTITUTION / PROVIDER", "DETAILS", "NOMINEE", section.blanks[0].toUpperCase(), (section.blanks[1] || "NOMINEE NAME").toUpperCase()];
    let maxHeaderLines = 1;
    const headerLinesArr = headers.map((h, i) => {
      const lines = wrapText(h, fontB, 7, colWidths[i] - 4);
      maxHeaderLines = Math.max(maxHeaderLines, lines.length);
      return lines;
    });
    headerLinesArr.forEach((lines, i) => lines.forEach((line, li) => page.drawText(line, { x: colX(i), y: y - 7 - li * 8, size: 7, font: fontB, color: COLORS.inkFaint })));
    y -= maxHeaderLines * 7.5 + 6;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_W, y }, thickness: 0.8, color: COLORS.border });
    y -= 8;
  };

  const drawBlankBox = (x: number, w: number, name: string) => {
    const h = 20;
    const tf = form.createTextField(name + "_" + fieldCounter++);
    tf.addToPage(page, { x, y: y - 3 - h, width: w - 4, height: h, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgSoft });
    tf.setFontSize(9);
  };

  const drawEntryRow = (section: AnnexSection, row: Record<string, string>) => {
    const nonRadioFields = section.fields.filter(f => f.type !== "radio");
    const mainField = nonRadioFields[0];
    const detailFields = nonRadioFields.slice(1);
    const mainVal = (mainField ? resolvedValue(row, mainField.key) : "") || "—";
    const detailVal = detailFields.map(f => resolvedValue(row, f.key)).filter(Boolean).join("  ·  ") || "—";
    const nomineeField = section.fields.find(f => f.type === "radio");
    const nomineeVal = nomineeField ? (row[nomineeField.key] || "—") : "—";

    const mainLines = wrapText(mainVal, fontR, 9, colWidths[0] - 6);
    const detailLines = wrapText(detailVal, fontR, 8, colWidths[1] - 6);
    const textLines = Math.max(mainLines.length, detailLines.length, 1);
    const rowH = Math.max(28, textLines * 11 + 14);

    ensure(rowH + 6);
    const rowY = y;

    drawBlankBox(colX(3), colWidths[3], `${section.id}_blank0`);
    drawBlankBox(colX(4), colWidths[4], `${section.id}_blank1`);

    mainLines.forEach((line, i) => page.drawText(line, { x: colX(0), y: rowY - 12 - i * 11, size: 9, font: fontR, color: COLORS.ink }));
    detailLines.forEach((line, i) => page.drawText(line, { x: colX(1), y: rowY - 12 - i * 11, size: 8, font: fontR, color: COLORS.inkSoft }));

    const nomineeColor = nomineeVal === "Yes" ? COLORS.green : COLORS.inkFaint;
    page.drawText(nomineeVal, { x: colX(2), y: rowY - 12, size: 8.3, font: fontR, color: nomineeColor });

    y = rowY - rowH;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_W, y }, thickness: 0.5, color: COLORS.border });
    y -= 8;
  };

  let anyData = false;
  ANNEX_SECTIONS.forEach(section => {
    const rows = (state[section.id] || []).filter(r => !isRowEmpty(r));
    if (rows.length === 0) return;
    anyData = true;
    ensure(70);
    drawSectionHeader(section, false);
    rows.forEach(row => drawEntryRow(section, row));
    y -= 10;
  });

  if (!anyData) {
    ensure(40);
    page.drawText("No entries were filled in on the web form. Blank category sheets follow;", { x: MARGIN, y: y - 11, size: 11, font: fontR, color: COLORS.inkFaint });
    y -= 14;
    page.drawText("fill in details directly by hand as needed.", { x: MARGIN, y: y - 11, size: 11, font: fontR, color: COLORS.inkFaint });
    y -= 20;
  }

  // ---- Instructions section ----
  ensure(50);
  page.drawText("Instructions for the Executor & Beneficiaries", { x: MARGIN, y: y - 15, size: 15, font: fontB, color: COLORS.ink });
  y -= 10;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + 44, y }, thickness: 1.2, color: COLORS.green });
  y -= 20;

  ANNEX_INSTRUCTIONS.forEach(([title, body]) => {
    const titleLines = wrapText(title, fontB, 10.5, CONTENT_W);
    ensure(titleLines.length * 13 + 30);
    titleLines.forEach((line, i) => page.drawText(line, { x: MARGIN, y: y - 10.5 - i * 13, size: 10.5, font: fontB, color: COLORS.greenDark }));
    y -= titleLines.length * 13 + 3;

    const bodyLines = wrapText(body, fontR, 9.7, CONTENT_W);
    ensure(bodyLines.length * 12.5 + 14);
    bodyLines.forEach((line, i) => page.drawText(line, { x: MARGIN, y: y - 9.7 - i * 12.5, size: 9.7, font: fontR, color: COLORS.inkSoft }));
    y -= bodyLines.length * 12.5 + 14;
  });

  // ---- Need guidance box ----
  ensure(110);
  const helpH = 100;
  page.drawRectangle({ x: MARGIN, y: y - helpH, width: CONTENT_W, height: helpH, color: COLORS.greenTint, borderColor: COLORS.border, borderWidth: 0.75 });
  let hy = y - 24;
  page.drawText("Need guidance?", { x: MARGIN + 18, y: hy - 12.5, size: 12.5, font: fontB, color: COLORS.ink });
  hy -= 16;
  const helpLines = wrapText("If you need assistance gathering your asset details or have questions about completing this inventory, we are here to walk you through it.", fontR, 9.5, CONTENT_W - 36);
  helpLines.forEach((line, i) => page.drawText(line, { x: MARGIN + 18, y: hy - 9.5 - i * 12, size: 9.5, font: fontR, color: COLORS.inkSoft }));
  hy -= helpLines.length * 12 + 10;

  page.drawText("Email", { x: MARGIN + 18, y: hy - 9.7, size: 9.7, font: fontB, color: COLORS.greenDark });
  page.drawText(ANNEX_HELP.email, { x: MARGIN + 60, y: hy - 9.7, size: 9.7, font: fontR, color: COLORS.ink });
  page.drawText("Phone", { x: MARGIN + 240, y: hy - 9.7, size: 9.7, font: fontB, color: COLORS.greenDark });
  page.drawText(ANNEX_HELP.phone, { x: MARGIN + 282, y: hy - 9.7, size: 9.7, font: fontR, color: COLORS.ink });
  hy -= 15;
  page.drawText("Office", { x: MARGIN + 18, y: hy - 9.7, size: 9.7, font: fontB, color: COLORS.greenDark });
  page.drawText(ANNEX_HELP.office, { x: MARGIN + 60, y: hy - 9.7, size: 9.7, font: fontR, color: COLORS.ink });

  y -= helpH + 30;

  // ---- Declaration / signature block ----
  ensure(150);
  page.drawText("Declaration", { x: MARGIN, y: y - 13, size: 13, font: fontB, color: COLORS.ink });
  y -= 18;
  const declLines = wrapText("I confirm that the above is a true and current schedule of my financial assets, to the best of my knowledge, as of the date signed below.", fontR, 9.5, CONTENT_W);
  declLines.forEach((line, i) => page.drawText(line, { x: MARGIN, y: y - 9.5 - i * 12.5, size: 9.5, font: fontR, color: COLORS.inkSoft }));
  y -= declLines.length * 12.5 + 30;

  const sigColW = CONTENT_W / 2 - 12;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + sigColW, y }, thickness: 0.7, color: COLORS.inkFaint });
  page.drawLine({ start: { x: MARGIN + sigColW + 24, y }, end: { x: MARGIN + sigColW + 24 + sigColW, y }, thickness: 0.7, color: COLORS.inkFaint });
  page.drawText("Signature of Testator / Testatrix", { x: MARGIN, y: y - 14, size: 9, font: fontR, color: COLORS.inkFaint });
  page.drawText("Date", { x: MARGIN + sigColW + 24, y: y - 14, size: 9, font: fontR, color: COLORS.inkFaint });
  y -= 44;

  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + sigColW, y }, thickness: 0.7, color: COLORS.inkFaint });
  page.drawLine({ start: { x: MARGIN + sigColW + 24, y }, end: { x: MARGIN + sigColW + 24 + sigColW, y }, thickness: 0.7, color: COLORS.inkFaint });
  page.drawText("Witness 1 — Name & Signature", { x: MARGIN, y: y - 14, size: 9, font: fontR, color: COLORS.inkFaint });
  page.drawText("Witness 2 — Name & Signature", { x: MARGIN + sigColW + 24, y: y - 14, size: 9, font: fontR, color: COLORS.inkFaint });

  // ---- Footer ----
  const pages = pdfDoc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Schedule of Financial Assets — Forward Legacy · Page ${i + 1} of ${pages.length}`, {
      x: PAGE_W / 2 - fontR.widthOfTextAtSize(`Schedule of Financial Assets — Forward Legacy · Page ${i + 1} of ${pages.length}`, 8) / 2,
      y: 30, size: 8, font: fontR, color: COLORS.inkFaint,
    });
  });

  form.updateFieldAppearances(fontR);
  return pdfDoc.save();
}
