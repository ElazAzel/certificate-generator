import QRCode from 'qrcode';
import JSZip from 'jszip';
import type { TemplateInfo, FieldConfig, ExcelData } from '../types/index';

export type ImageExportFormat = 'png' | 'jpg';

const EXPORT_SCALE = 2;

interface RenderContext {
  ctx: CanvasRenderingContext2D;
  scale: number; // px per template point
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Не удалось загрузить изображение шаблона'));
    img.src = src;
  });
}

async function renderTemplateBackground(ctx: CanvasRenderingContext2D, template: TemplateInfo, scale: number): Promise<void> {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, template.width * scale, template.height * scale);

  if (template.type === 'pdf') {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL || '/'}pdf.worker.min.mjs`;
    const pdf = await pdfjs.getDocument({ url: template.previewUrl }).promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const pctx = canvas.getContext('2d')!;
    await page.render({ canvas, canvasContext: pctx, viewport }).promise;
    // PDF size in points may differ slightly from template.width/height; center it
    const dx = (template.width * scale - viewport.width) / 2;
    const dy = (template.height * scale - viewport.height) / 2;
    ctx.drawImage(canvas, dx, dy);
    void base;
  } else {
    const img = await loadImage(template.previewUrl);
    ctx.drawImage(img, 0, 0, template.width * scale, template.height * scale);
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawFieldText(ctx: CanvasRenderingContext2D, text: string, field: FieldConfig, rc: RenderContext): void {
  const s = rc.scale;
  const boxX = field.x * s;
  const boxY = field.y * s;
  const boxW = field.width * s;
  const boxH = field.height * s;

  ctx.save();
  if (field.rotation) {
    ctx.translate(boxX + boxW / 2, boxY + boxH / 2);
    ctx.rotate((field.rotation * Math.PI) / 180);
    ctx.translate(-(boxX + boxW / 2), -(boxY + boxH / 2));
  }
  ctx.beginPath();
  ctx.rect(boxX, boxY, boxW, boxH);
  ctx.clip();

  ctx.fillStyle = field.fontColor;
  ctx.font = `${field.italic ? 'italic ' : ''}${field.bold ? 'bold ' : ''}${field.fontSize * s}px ${field.fontFamily || 'sans-serif'}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = field.align === 'center' ? 'center' : field.align === 'right' ? 'right' : 'left';

  const letterSpacing = field.letterSpacing ? field.letterSpacing * s : 0;

  let lines: string[] = [];
  if (field.mode === 'multiline') {
    lines = wrapText(ctx, text, boxW);
  } else if (field.mode === 'shrink-to-fit') {
    const maxWidth = boxW - 4 * s;
    let fs = field.fontSize * s;
    ctx.font = `${field.italic ? 'italic ' : ''}${field.bold ? 'bold ' : ''}${fs}px ${field.fontFamily || 'sans-serif'}`;
    while (fs > 4 && ctx.measureText(text).width + letterSpacing * (text.length - 1) > maxWidth) {
      fs -= 0.5;
      ctx.font = `${field.italic ? 'italic ' : ''}${field.bold ? 'bold ' : ''}${fs}px ${field.fontFamily || 'sans-serif'}`;
    }
    lines = [text];
  } else {
    lines = [text];
  }

  const lineHeight = (field.lineHeight || 1.2) * (field.fontSize * s);
  const totalTextHeight = lines.length * lineHeight;
  let startY = boxY;
  if (field.verticalAlign === 'middle') startY = boxY + (boxH - totalTextHeight) / 2;
  else if (field.verticalAlign === 'bottom') startY = boxY + boxH - totalTextHeight;

  lines.forEach((line, i) => {
    let x = boxX;
    if (field.align === 'center') x = boxX + boxW / 2;
    else if (field.align === 'right') x = boxX + boxW;

    let y = startY + i * lineHeight + (field.fontSize * s * 0.8);

    if (letterSpacing) {
      // manual letter-spacing: draw char by char (context.letterSpacing is Chromium-only)
      const chars = Array.from(line);
      const totalWidth = chars.reduce((acc, ch) => acc + ctx.measureText(ch).width, 0) + letterSpacing * (chars.length - 1);
      let cx = x;
      if (field.align === 'center') cx = boxX + (boxW - totalWidth) / 2;
      else if (field.align === 'right') cx = boxX + boxW - totalWidth;
      for (const ch of chars) {
        ctx.fillText(ch, cx, y);
        cx += ctx.measureText(ch).width + letterSpacing;
      }
    } else {
      ctx.fillText(line, x, y);
    }
  });

  ctx.restore();
}

async function drawFieldQr(ctx: CanvasRenderingContext2D, text: string, field: FieldConfig, rc: RenderContext): Promise<void> {
  const s = rc.scale;
  const side = Math.min(field.width, field.height) * s;
  const boxX = field.x * s;
  const boxY = field.y * s;
  let x = boxX;
  let y = boxY;
  if (field.align === 'center') x = boxX + (field.width * s - side) / 2;
  else if (field.align === 'right') x = boxX + field.width * s - side;
  if (field.verticalAlign === 'middle') y = boxY + (field.height * s - side) / 2;
  else if (field.verticalAlign === 'bottom') y = boxY + field.height * s - side;

  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, text || 'QR', {
    width: side,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
  ctx.save();
  if (field.rotation) {
    ctx.translate(boxX + field.width * s / 2, boxY + field.height * s / 2);
    ctx.rotate((field.rotation * Math.PI) / 180);
    ctx.translate(-(boxX + field.width * s / 2), -(boxY + field.height * s / 2));
  }
  ctx.drawImage(canvas, x, y, side, side);
  ctx.restore();
}

export async function renderCertificateToCanvas(
  template: TemplateInfo,
  fields: FieldConfig[],
  row: Record<string, string>
): Promise<HTMLCanvasElement> {
  const scale = EXPORT_SCALE;
  const canvas = document.createElement('canvas');
  canvas.width = template.width * scale;
  canvas.height = template.height * scale;
  const ctx = canvas.getContext('2d')!;

  await renderTemplateBackground(ctx, template, scale);
  const rc: RenderContext = { ctx, scale };

  for (const field of fields) {
    if (!field.visible) continue;
    const isQr = field.contentType === 'qr';
    let text = '';
    if (isQr) {
      text = (field.qrValueTemplate || '').replace(/\{([^}]+)\}/g, (_, col: string) => {
        const v = row[col];
        return v !== undefined && v !== null && v !== '' ? String(v) : '';
      });
    } else if (field.excelColumn) {
      text = row[field.excelColumn] !== undefined ? String(row[field.excelColumn]) : '';
    } else {
      text = field.label || '';
    }
    if (isQr) {
      if (text) await drawFieldQr(ctx, text, field, rc);
    } else {
      if (text) drawFieldText(ctx, text, field, rc);
    }
  }

  return canvas;
}

export async function generateImages(
  excelData: ExcelData,
  template: TemplateInfo,
  fields: FieldConfig[],
  format: ImageExportFormat,
  fileNameTemplate: string,
  onProgress?: (done: number, total: number) => void
): Promise<JSZip> {
  const zip = new JSZip();
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const ext = format === 'png' ? 'png' : 'jpg';

  const rows = excelData.rows;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const canvas = await renderCertificateToCanvas(template, fields, row);
    const blob: Blob | null = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), mime, format === 'png' ? undefined : 0.9);
    });
    if (!blob) throw new Error('Не удалось создать изображение');
    const fileName = buildImageFileName(fileNameTemplate, row, ext, i);
    zip.file(fileName, blob);
    onProgress?.(i + 1, rows.length);
  }

  return zip;
}

export function buildImageFileName(template: string, row: Record<string, string>, ext: string, index: number): string {
  let name = template.replace(/\.pdf$/i, '').replace(/\.png$/i, '').replace(/\.jpg$/i, '').replace(/\.jpeg$/i, '');
  name = name.replace(/\{([^}]+)\}/g, (_, col: string) => {
    const v = row[col];
    if (v === undefined || v === null) return '';
    return String(v).replace(/[\\/:*?"<>|]/g, '_');
  });
  name = name.trim();
  if (!name) name = `certificate_${index + 1}`;
  const safe = name.replace(/[\\/:*?"<>|]/g, '_');
  return `${safe}.${ext}`;
}
