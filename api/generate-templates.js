// Generates sample certificate templates (PDF) into ../sample-data/templates
// Run: node generate-templates.js  (from api/ directory)
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

const OUT_DIR = path.join(__dirname, '..', 'sample-data', 'templates');
const GOLD = rgb(0.62, 0.48, 0.22);
const NAVY = rgb(0.18, 0.29, 0.48);
const DARK = rgb(0.15, 0.18, 0.24);

const FONT_DIR = path.join(__dirname, 'fonts');
const FONT_SERIF = path.join(FONT_DIR, 'DejaVuSerif.ttf');
const FONT_SERIF_BOLD = path.join(FONT_DIR, 'DejaVuSerif-Bold.ttf');
const FONT_SERIF_ITALIC = path.join(FONT_DIR, 'DejaVuSerif-Italic.ttf');
const FONT_SANS = path.join(FONT_DIR, 'DejaVuSans.ttf');

function loadFont(pdfDoc, filePath) {
  return pdfDoc.embedFont(fs.readFileSync(filePath));
}

async function makeLandscapeCertificate() {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([1122, 794]); // A4 landscape @ 96dpi
  const { width, height } = page.getSize();
  const font = await loadFont(pdfDoc, FONT_SERIF_BOLD);
  const fontItalic = await loadFont(pdfDoc, FONT_SERIF_ITALIC);
  const fontBody = await loadFont(pdfDoc, FONT_SANS);

  // Outer border
  page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, borderColor: GOLD, borderWidth: 4 });
  page.drawRectangle({ x: 40, y: 40, width: width - 80, height: height - 80, borderColor: NAVY, borderWidth: 1.5 });

  // Corner ornaments
  const ornament = (x, y, size) => {
    page.drawLine({ start: { x, y }, end: { x: x + size, y: y + size }, thickness: 3, color: GOLD });
    page.drawLine({ start: { x: x + size, y }, end: { x, y: y + size }, thickness: 3, color: GOLD });
  };
  ornament(52, height - 52, 36);
  ornament(width - 52, height - 52, 36);
  ornament(52, 52, 36);
  ornament(width - 52, 52, 36);

  // Headline
  const headline = 'СЕРТИФИКАТ';
  const headlineSize = 46;
  const headlineWidth = font.widthOfTextAtSize(headline, headlineSize);
  page.drawText(headline, { x: (width - headlineWidth) / 2, y: height - 190, size: headlineSize, font, color: NAVY });

  page.drawLine({ start: { x: width / 2 - 180, y: height - 215 }, end: { x: width / 2 + 180, y: height - 215 }, thickness: 1.5, color: GOLD });

  const subhead = 'подтверждает, что';
  const subheadSize = 18;
  const subheadWidth = fontItalic.widthOfTextAtSize(subhead, subheadSize);
  page.drawText(subhead, { x: (width - subheadWidth) / 2, y: height - 270, size: subheadSize, font: fontItalic, color: DARK });

  return { pdfDoc, fileName: 'certificate_landscape.pdf', width, height };
}

async function makePortraitDiploma() {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([794, 1122]); // A4 portrait @ 96dpi
  const { width, height } = page.getSize();
  const font = await loadFont(pdfDoc, FONT_SERIF_BOLD);
  const fontItalic = await loadFont(pdfDoc, FONT_SERIF_ITALIC);
  const fontBody = await loadFont(pdfDoc, FONT_SANS);

  page.drawRectangle({ x: 30, y: 30, width: width - 60, height: height - 60, borderColor: GOLD, borderWidth: 5 });
  page.drawRectangle({ x: 42, y: 42, width: width - 84, height: height - 84, borderColor: NAVY, borderWidth: 1.5 });

  const ornament = (x, y, size) => {
    page.drawLine({ start: { x, y }, end: { x: x + size, y: y + size }, thickness: 3, color: GOLD });
    page.drawLine({ start: { x: x + size, y }, end: { x, y: y + size }, thickness: 3, color: GOLD });
  };
  ornament(54, height - 54, 40);
  ornament(width - 54, height - 54, 40);
  ornament(54, 54, 40);
  ornament(width - 54, 54, 40);

  // Top badge (circle)
  page.drawCircle({ x: width / 2, y: height - 210, size: 55, borderColor: GOLD, borderWidth: 3 });
  page.drawCircle({ x: width / 2, y: height - 210, size: 45, borderColor: NAVY, borderWidth: 1 });
  page.drawText('\u2605', { x: width / 2 - 18, y: height - 230, size: 36, font, color: GOLD });

  const headline = 'ДИПЛОМ';
  const headlineSize = 48;
  const headlineWidth = font.widthOfTextAtSize(headline, headlineSize);
  page.drawText(headline, { x: (width - headlineWidth) / 2, y: height - 330, size: headlineSize, font, color: NAVY });

  page.drawLine({ start: { x: width / 2 - 160, y: height - 355 }, end: { x: width / 2 + 160, y: height - 355 }, thickness: 1.5, color: GOLD });

  const subhead = 'вручается';
  const subheadSize = 18;
  const subheadWidth = fontItalic.widthOfTextAtSize(subhead, subheadSize);
  page.drawText(subhead, { x: (width - subheadWidth) / 2, y: height - 400, size: subheadSize, font: fontItalic, color: DARK });

  return { pdfDoc, fileName: 'diploma_portrait.pdf', width, height };
}

async function makeModernCertificate() {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([1122, 794]);
  const { width, height } = page.getSize();
  const font = await loadFont(pdfDoc, FONT_SERIF_BOLD);
  const fontItalic = await loadFont(pdfDoc, FONT_SERIF_ITALIC);
  const fontBody = await loadFont(pdfDoc, FONT_SANS);

  // Left accent band
  page.drawRectangle({ x: 0, y: 0, width: 90, height, color: NAVY });
  page.drawRectangle({ x: 90, y: 0, width: 6, height, color: GOLD });
  page.drawRectangle({ x: 40, y: 40, width: width - 80, height: height - 80, borderColor: GOLD, borderWidth: 2 });

  const headline = 'СЕРТИФИКАТ ОБ ОКОНЧАНИИ';
  const headlineSize = 34;
  const headlineWidth = font.widthOfTextAtSize(headline, headlineSize);
  page.drawText(headline, { x: (width - headlineWidth) / 2, y: height - 180, size: headlineSize, font, color: NAVY });
  page.drawLine({ start: { x: width / 2 - 150, y: height - 205 }, end: { x: width / 2 + 150, y: height - 205 }, thickness: 1.5, color: GOLD });

  const subhead = 'настоящий сертификат вручается';
  const subheadSize = 16;
  const subheadWidth = fontItalic.widthOfTextAtSize(subhead, subheadSize);
  page.drawText(subhead, { x: (width - subheadWidth) / 2, y: height - 250, size: subheadSize, font: fontItalic, color: DARK });

  // Footer
  const footer = 'Сгенерировано в Certificate Generator';
  const footerSize = 11;
  const footerWidth = fontBody.widthOfTextAtSize(footer, footerSize);
  page.drawText(footer, { x: (width - footerWidth) / 2, y: 70, size: footerSize, font: fontBody, color: DARK });

  return { pdfDoc, fileName: 'certificate_modern.pdf', width, height };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const builders = [makeLandscapeCertificate, makePortraitDiploma, makeModernCertificate];
  for (const builder of builders) {
    const ctx = await builder();
    const bytes = await ctx.pdfDoc.save();
    const filePath = path.join(OUT_DIR, ctx.fileName);
    fs.writeFileSync(filePath, bytes);
    console.log(`Created ${ctx.fileName} (${bytes.length} bytes, ${ctx.width}x${ctx.height})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
