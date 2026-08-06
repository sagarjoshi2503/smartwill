import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { ANNEX_INSTRUCTIONS, ANNEX_SECTIONS, AnnexState } from "../../data/annexSections";

// Ported from api/Data/annexbuilder.html's generatePdf() — same layout,
// same fillable-field approach (pdf-lib, entirely client-side). Only the
// rows the user actually added are baked in; nothing here is ever sent to
// or stored by the backend — see AnnexBuilder.tsx.

const resolvedValue = (row: Record<string, string>, key: string) =>
  row[key] === "__other__" ? (row[key + "_other"] || "") : (row[key] || "");

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

export async function generateAnnexPdf(state: AnnexState): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const form = pdfDoc.getForm();
  const fontR = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontB = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const PAGE_W = 595.28, PAGE_H = 841.89;
  const MARGIN = 50;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  let page: PDFPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  let fieldCounter = 0;

  const drawFooter = () => {
    page.drawText("Forward Legacy — Schedule of Assets Annexure — personal record-keeping only", {
      x: MARGIN, y: 28, size: 7.5, font: fontR, color: rgb(0.45, 0.45, 0.45),
    });
  };
  const newPage = () => {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
    drawFooter();
  };
  const ensure = (space: number) => {
    if (y - space < MARGIN + 20) newPage();
  };
  const drawText = (text: string, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number; x?: number } = {}) => {
    const { size = 10, font = fontR, color = rgb(0.1, 0.1, 0.1), gap = 14, x = MARGIN } = opts;
    ensure(gap);
    page.drawText(text, { x, y: y - size, size, font, color, maxWidth: CONTENT_W });
    y -= gap;
  };
  const drawBlankField = (x: number, w: number, label: string, name: string) => {
    const h = 20;
    page.drawText(label, { x, y: y - 9, size: 7, font: fontR, color: rgb(0.4, 0.4, 0.4) });
    const tf = form.createTextField(name + "_" + fieldCounter++);
    tf.addToPage(page, {
      x, y: y - 9 - h - 2, width: w, height: h,
      borderWidth: 1, borderColor: rgb(0.7, 0.66, 0.55), backgroundColor: rgb(1, 1, 1),
    });
    tf.setFontSize(9);
  };
  const drawFieldRow = (labels: string[], sectionKey: string) => {
    const gap = 10;
    const w = (CONTENT_W - gap * (labels.length - 1)) / labels.length;
    ensure(9 + 20 + 8);
    labels.forEach((label, i) => drawBlankField(MARGIN + i * (w + gap), w, label, sectionKey));
    y -= 9 + 20 + 10;
  };

  // ---- Cover / header ----
  page.drawText("SCHEDULE OF ASSETS", { x: MARGIN, y: y - 26, size: 24, font: fontB });
  y -= 34;
  page.drawText("Annexure to the Will — personal record for the Executor and beneficiaries", {
    x: MARGIN, y: y - 14, size: 11, font: fontR, color: rgb(0.35, 0.35, 0.35),
  });
  y -= 34;

  drawFieldRow(["Full Name"], "name");
  drawFieldRow(["PAN"], "pan");
  drawFieldRow(["Date Filled"], "datefilled");
  y -= 6;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + CONTENT_W, y }, thickness: 1, color: rgb(0.85, 0.82, 0.72) });
  y -= 22;

  // ---- Sections ----
  ANNEX_SECTIONS.forEach(sec => {
    const rows = state[sec.id] || [];
    if (rows.length === 0) return;

    ensure(30);
    drawText(`${sec.num}. ${sec.title}`, { size: 14, font: fontB, gap: 20 });

    rows.forEach((row, i) => {
      const bakedParts = sec.bake.map(k => {
        const field = sec.webFields.find(f => f.key === k);
        const v = resolvedValue(row, k);
        return v ? v : `(${field?.label ?? k} — not specified)`;
      });
      ensure(18);
      drawText(`${i + 1})  ${bakedParts.join("  —  ")}`, { size: 10.5, font: fontB, gap: 16 });
      drawFieldRow(sec.remaining, `${sec.id}_${i}`);
    });
    y -= 6;
  });

  // ---- Instructions page ----
  newPage();
  drawText("Instructions for the Executor & Beneficiaries", { size: 16, font: fontB, gap: 22 });
  ANNEX_INSTRUCTIONS.forEach((line, i) => {
    ensure(50);
    const wrapped = wrapText(line, fontR, 10, CONTENT_W - 18);
    drawText(`${i + 1}.`, { size: 10, font: fontB, gap: 0, x: MARGIN });
    wrapped.forEach(wline => drawText(wline, { size: 10, font: fontR, gap: 14, x: MARGIN + 18 }));
    y -= 6;
  });

  y -= 10;
  ensure(60);
  drawFieldRow(["Signature"], "sig");
  drawFieldRow(["Date"], "sigdate");

  form.updateFieldAppearances(fontR);
  return pdfDoc.save();
}
