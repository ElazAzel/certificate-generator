import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as XLSX from 'xlsx';
import archiver from 'archiver';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getStore, type FontRecord, type TemplateRecord, type GenerationRecord } from './store';
import { uiYToPdfY, calculateTextBaselineY, calculateTextX } from './coordinates';
import { measureTextWidth, wrapText, shrinkTextToFit } from './textLayout';
import { applyFileNameTemplate, sanitizeFileName } from './sanitize';

// ---------- Types ----------
interface FieldConfig {
  id: string; label: string; excelColumn: string;
  x: number; y: number; width: number; height: number;
  fontFamily: string; fontSize: number; fontColor: string;
  align: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  bold: boolean; italic: boolean; rotation: number;
  letterSpacing: number; lineHeight: number;
  mode: 'single-line' | 'multiline' | 'shrink-to-fit' | 'clip';
  visible: boolean;
}
interface ExportConfig {
  mode: 'separate' | 'combined';
  fileNameTemplate: string;
  fileNameColumn: string;
  outputFolder: string;
  combinedFileName: string;
}

// ---------- Helpers ----------
function simpleLog(level: string, msg: string) {
  const ts = new Date().toISOString();
  console[level === 'error' ? 'error' : 'log'](`[${ts}] [${level.toUpperCase()}] ${msg}`);
}

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || 'default-dev-secret-change-me';

function generateToken(): string {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
}

// ---------- Express App ----------
const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    simpleLog('info', `${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ---------- Font helpers ----------
function readFontFamilyName(buf: Uint8Array): string | null {
  try {
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const sfVersion = view.getUint32(0, false);
    const isTTF = sfVersion === 0x00010000 || sfVersion === 0x74727565;
    const isOTF = sfVersion === 0x4F54544F;
    if (!isTTF && !isOTF) return null;
    const numTables = view.getUint16(4, false);
    let nameOffset = -1;
    for (let i = 0; i < numTables; i++) {
      const recOff = 12 + i * 16;
      const tag = String.fromCharCode(buf[recOff], buf[recOff+1], buf[recOff+2], buf[recOff+3]);
      if (tag === 'name') { nameOffset = view.getUint32(recOff + 8, false); break; }
    }
    if (nameOffset < 0) return null;
    const count = view.getUint16(nameOffset + 2, false);
    const stringOffset = view.getUint16(nameOffset + 4, false);
    for (let i = 0; i < count; i++) {
      const recOff = nameOffset + 6 + i * 12;
      const platformID = view.getUint16(recOff, false);
      const encodingID = view.getUint16(recOff + 2, false);
      const nameID = view.getUint16(recOff + 6, false);
      const len = view.getUint16(recOff + 8, false);
      const strOff = nameOffset + stringOffset + view.getUint16(recOff + 10, false);
      if (nameID !== 1) continue;
      if (platformID === 3 && encodingID === 1) {
        let result = '';
        for (let j = 0; j < len; j += 2) {
          const code = view.getUint16(strOff + j, false);
          if (code === 0) break;
          result += String.fromCharCode(code);
        }
        if (result.trim()) return result.trim();
      } else if (platformID === 1 && encodingID === 0) {
        let result = '';
        for (let j = 0; j < len; j++) {
          const code = buf[strOff + j];
          if (code === 0) break;
          result += String.fromCharCode(code);
        }
        if (result.trim()) return result.trim();
      }
    }
    return null;
  } catch { return null; }
}

function hexToRgb(hex: string) {
  if (!hex) return rgb(0, 0, 0);
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
}

function findFontByName(name: string): FontRecord | undefined {
  const store = getStore();
  for (const f of store.fonts.values()) {
    if (f.fontName === name || f.fileName === name || f.id === name) return f;
  }
  const lower = name.toLowerCase();
  for (const f of store.fonts.values()) {
    if (f.fontName.toLowerCase() === lower || f.fileName.toLowerCase() === lower) return f;
  }
  return undefined;
}

function findFontVariant(baseBytes: Uint8Array, style: 'bold' | 'italic' | 'bold-italic'): Uint8Array | null {
  const suffixMap: Record<string, Record<string, string[]>> = {
    arial:      { bold: ['arialbd'], italic: ['ariali'], 'bold-italic': ['arialbi'] },
    times:      { bold: ['timesbd'], italic: ['timesi'], 'bold-italic': ['timesbi'] },
    courier:    { bold: ['courbd'], italic: ['couri'], 'bold-italic': ['courbi'] },
    calibri:    { bold: ['calibrib'], italic: ['calibrii'], 'bold-italic': ['calibriz'] },
  };
  const store = getStore();
  const baseName = (findFontByBytes(baseBytes)?.fileName || '').replace(/\.[^.]+$/, '').toLowerCase();
  const family = baseName.replace(/[^a-z]/g, '');
  if (suffixMap[family]?.[style]) {
    for (const suffix of suffixMap[family][style]) {
      for (const f of store.fonts.values()) {
        if (f.fileName.toLowerCase().startsWith(suffix)) return f.fileBytes;
      }
    }
  }
  const styleSuffixes: Record<string, string[]> = {
    bold: ['bd', 'bold', 'b'],
    italic: ['i', 'italic'],
    'bold-italic': ['bi', 'bolditalic'],
  };
  for (const suffix of styleSuffixes[style] || []) {
    for (const f of store.fonts.values()) {
      const fn = f.fileName.toLowerCase().replace(/\.[^.]+$/, '');
      if (fn === baseName + suffix || fn === baseName + '-' + suffix) return f.fileBytes;
    }
  }
  return null;
}

function findFontByBytes(bytes: Uint8Array): FontRecord | undefined {
  const store = getStore();
  for (const f of store.fonts.values()) {
    if (f.fileBytes === bytes) return f;
  }
  return undefined;
}

// ---------- Fallback built-in fonts (DejaVu + LiberationSans, free, Cyrillic-capable) ----------
const FALLBACK_FONTS: Record<string, Uint8Array> = {};

/** All possible directories to scan for bundled .ttf fonts */
function getFontScanDirs(): string[] {
  const candidates = new Set<string>();
  // Vercel serverless typical paths
  candidates.add(path.join(__dirname, 'fonts'));
  candidates.add(path.join(process.cwd(), 'fonts'));
  candidates.add(path.join(process.cwd(), 'api', 'fonts'));
  // Vercel .vercel/output/... paths
  try {
    const vercelDir = path.join(process.cwd(), '.vercel');
    if (fs.existsSync(vercelDir)) {
      candidates.add(path.join(vercelDir, 'output', 'functions', 'api', 'fonts'));
    }
  } catch { /* skip */ }
  return Array.from(candidates);
}

function loadFallbackFonts(): void {
  const dirs = getFontScanDirs();
  const ttfFiles: string[] = [];
  for (const dir of dirs) {
    try {
      if (fs.existsSync(dir)) {
        for (const f of fs.readdirSync(dir)) {
          if (f.toLowerCase().endsWith('.ttf') && !ttfFiles.includes(f)) {
            ttfFiles.push(f);
          }
        }
      }
    } catch { /* skip */ }
  }
  // Load and register each font
  const store = getStore();
  for (const ttfFile of ttfFiles) {
    const name = ttfFile.replace(/\.ttf$/i, '');
    for (const dir of dirs) {
      const fp = path.join(dir, ttfFile);
      try {
        if (fs.existsSync(fp)) {
          const bytes = new Uint8Array(fs.readFileSync(fp));
          FALLBACK_FONTS[name] = bytes;
          const id = 'builtin_' + name;
          if (!store.fonts.has(id)) {
            const fontName = fontNameFromFile(ttfFile);
            store.fonts.set(id, { id, fileName: ttfFile, fontName, fileBytes: bytes });
          }
          break;
        }
      } catch { /* try next dir */ }
    }
  }
}
loadFallbackFonts();

/** Fallback font style → filename map (tried in order) */
const FALLBACK_FONT_MAP: Record<string, [string, string][]> = {
  'regular':      [['DejaVuSans', 'LiberationSans-Regular'], ['DejaVuSerif', 'LiberationSerif-Regular']],
  'bold':         [['DejaVuSans-Bold', 'LiberationSans-Bold'], ['DejaVuSerif-Bold', 'LiberationSerif-Bold']],
  'italic':       [['DejaVuSans-Oblique', 'LiberationSans-Italic'], ['DejaVuSerif-Italic', 'LiberationSerif-Italic']],
  'bold-italic':  [['DejaVuSans-BoldOblique', 'LiberationSans-BoldItalic'], ['DejaVuSerif-BoldItalic', 'LiberationSerif-BoldItalic']],
};

function getFallbackFont(style: 'regular' | 'bold' | 'italic' | 'bold-italic'): Uint8Array | null {
  const candidates = FALLBACK_FONT_MAP[style] || FALLBACK_FONT_MAP['regular'];
  for (const [name] of candidates) {
    if (FALLBACK_FONTS[name]) return FALLBACK_FONTS[name];
  }
  // ultimate fallback: any TTF we have
  const values = Object.values(FALLBACK_FONTS);
  return values.length > 0 ? values[0] : null;
}

/** Derive a display font name from a TTF filename (e.g. "DejaVuSans-Regular.ttf" -> "DejaVu Sans Regular") */
function fontNameFromFile(ttfFile: string): string {
  return ttfFile.replace(/\.ttf$/i, '').replace(/[-_]/g, ' ');
}

// ---------- PDF Generation ----------
async function generateSingleCertificate(
  template: TemplateRecord, fields: FieldConfig[],
  row: Record<string, string>, pdfDoc: PDFDocument
): Promise<void> {
  pdfDoc.registerFontkit(fontkit);
  let page;
  if (template.type === 'pdf') {
    const srcDoc = await PDFDocument.load(template.fileBytes);
    const [copiedPage] = await pdfDoc.copyPages(srcDoc, [0]);
    page = pdfDoc.addPage(copiedPage);
  } else {
    page = pdfDoc.addPage([template.width, template.height]);
    const img = template.type === 'png'
      ? await pdfDoc.embedPng(template.fileBytes)
      : await pdfDoc.embedJpg(template.fileBytes);
    page.drawImage(img, { x: 0, y: 0, width: template.width, height: template.height });
  }
  const pageHeight = page.getHeight();

  for (const field of fields) {
    if (!field.visible) continue;
    const rawText = row[field.excelColumn] !== undefined ? String(row[field.excelColumn]) : '';
    const text = rawText.trim();
    if (!text) continue;

    let fontToUse;
    const customFont = findFontByName(field.fontFamily);
    if (customFont) {
      let fontBytes = customFont.fileBytes;
      if (field.bold || field.italic) {
        const style = field.bold && field.italic ? 'bold-italic' : field.bold ? 'bold' : 'italic';
        const variant = findFontVariant(fontBytes, style);
        if (variant) fontBytes = variant;
      }
      try {
        fontToUse = await pdfDoc.embedFont(fontBytes);
      } catch {
        const fb = getFallbackFont('regular');
        fontToUse = await pdfDoc.embedFont(fb ?? StandardFonts.Helvetica);
      }
    } else {
      const style = field.bold && field.italic ? 'bold-italic' : field.bold ? 'bold' : field.italic ? 'italic' : 'regular';
      const fb = getFallbackFont(style);
      if (fb) {
        fontToUse = await pdfDoc.embedFont(fb);
      } else {
        fontToUse = await pdfDoc.embedFont(StandardFonts.Helvetica);
      }
    }

    const color = hexToRgb(field.fontColor);
    let fontSize = field.fontSize;
    const mode = field.mode;

    if (mode === 'shrink-to-fit') {
      fontSize = shrinkTextToFit(text, fontToUse, field.fontSize, field.width, field.height, field.lineHeight || 1.2, false);
      if (fontSize < 4) fontSize = 4;
    }

    let lines: string[] = [text];
    if (mode === 'multiline') {
      lines = wrapText(text, fontToUse, fontSize, field.width);
    } else if (mode === 'clip') {
      let currentText = text;
      while (currentText.length > 0 && measureTextWidth(currentText, fontToUse, fontSize) > field.width) {
        currentText = currentText.slice(0, -1);
      }
      lines = [currentText ? currentText + '...' : ''];
    }

    const pdfY = uiYToPdfY(field.y, pageHeight, field.height);
    const totalLines = lines.length;
    const fontLineHeight = field.lineHeight || 1.2;
    const lineSpacing = fontSize * fontLineHeight;

    for (let i = 0; i < totalLines; i++) {
      const lineText = lines[i];
      const textWidth = measureTextWidth(lineText, fontToUse, fontSize);
      const textX = calculateTextX(field.x, field.width, textWidth, field.align);
      const baseLineY = calculateTextBaselineY(pdfY, field.height, fontSize, field.verticalAlign, totalLines, fontLineHeight);
      const currentLineY = baseLineY + (totalLines - 1 - i) * lineSpacing;
      page.drawText(lineText, {
        x: textX, y: currentLineY, size: fontSize,
        font: fontToUse, color,
        rotate: field.rotation ? degrees(field.rotation) : undefined,
      });
    }
  }
}

// ---------- Routes ----------

// Auth — POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  try {
    const { password } = req.body;

    if (!process.env.ADMIN_PASSWORD) {
      const token = generateToken();
      return res.json({ token, expiresIn: '24h', mode: 'no-auth' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Пароль не указан' });
    }

    const isValid = bcrypt.compareSync(password, process.env.ADMIN_PASSWORD);
    if (!isValid) {
      simpleLog('warn', 'Failed login attempt');
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    const token = generateToken();
    simpleLog('info', 'Successful login');
    res.json({ token, expiresIn: '24h' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка входа' });
  }
});

// Auth — GET /api/auth/status
app.get('/api/auth/status', (_req, res) => {
  res.json({
    authConfigured: !!process.env.ADMIN_PASSWORD,
    mode: process.env.ADMIN_PASSWORD ? 'password' : 'open',
  });
});

// Sample data — GET /api/sample-data/:file
app.get('/api/sample-data/:file', (req, res) => {
  const possibleDirs = [
    path.join(process.cwd(), '..', 'sample-data'),
    path.join(process.cwd(), 'sample-data'),
  ];
  for (const dir of possibleDirs) {
    try {
      if (!fs.existsSync(dir)) continue;
      const filePath = path.join(dir, path.basename(req.params.file));
      if (!fs.existsSync(filePath)) continue;
      const ext = path.extname(filePath).toLowerCase();
      const mime: Record<string, string> = {
        '.json': 'application/json',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.csv': 'text/csv',
      };
      res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
      return res.send(fs.readFileSync(filePath));
    } catch { /* try next */ }
  }
  res.status(404).json({ error: 'File not found' });
});

// Health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), mode: 'vercel' });
});

// Upload Excel
app.post('/api/upload/excel', upload.single('excel'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Excel файл не загружен' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    if (workbook.SheetNames.length === 0) return res.status(400).json({ error: 'Excel пуст' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return res.status(400).json({ error: 'Лист не найден' });
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
    if (rawData.length === 0) return res.status(400).json({ error: 'Нет данных' });
    const columns = Object.keys(rawData[0]);
    const rows = rawData.map(row => {
      const stringRow: Record<string, string> = {};
      for (const key of columns) {
        const val = row[key];
        stringRow[key] = val !== undefined && val !== null ? String(val) : '';
      }
      return stringRow;
    });
    res.json({ success: true, columns, rows, totalRows: rows.length, preview: rows.slice(0, 10) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка Excel' });
  }
});

// Upload Template
app.post('/api/upload/template', upload.single('template'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Шаблон не загружен' });
    const originalName = req.file.originalname;
    const ext = originalName.toLowerCase().split('.').pop() || '';
    let type: 'pdf' | 'png' | 'jpg' | 'jpeg';
    if (ext === 'pdf') type = 'pdf';
    else if (ext === 'png') type = 'png';
    else type = 'jpg';
    let width = 842, height = 595;
    if (type === 'pdf') {
      const pdfDoc = await PDFDocument.load(req.file.buffer);
      if (pdfDoc.getPageCount() > 0) {
        const p = pdfDoc.getPage(0);
        width = p.getWidth(); height = p.getHeight();
      }
    } else {
      const tempDoc = await PDFDocument.create();
      const img = type === 'png' ? await tempDoc.embedPng(req.file.buffer) : await tempDoc.embedJpg(req.file.buffer);
      const dims = img.scale(1);
      width = dims.width; height = dims.height;
    }
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const store = getStore();
    store.templates.set(id, { id, originalFileName: originalName, type, width, height, fileBytes: req.file.buffer });
    res.json({ success: true, id, type, width, height, originalFileName: originalName, previewUrl: `/api/upload/template/${id}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка шаблона' });
  }
});

// Upload Font
app.post('/api/upload/font', upload.single('font'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Шрифт не загружен' });
    const ext = req.file.originalname.toLowerCase().split('.').pop() || '';
    if (ext !== 'ttf' && ext !== 'otf') return res.status(400).json({ error: 'Только TTF/OTF' });
    const id = `font_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const fontName = req.file.originalname.replace(/\.[^.]+$/, '');
    const fontBytes = new Uint8Array(req.file.buffer);
    const detectedName = readFontFamilyName(fontBytes) || fontName;
    const store = getStore();
    store.fonts.set(id, { id, fileName: req.file.originalname, fontName: detectedName, fileBytes: fontBytes });
    res.json({ success: true, id, fileName: req.file.originalname, fontName: detectedName });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка шрифта' });
  }
});

// List Fonts
app.get('/api/upload/fonts', (_req, res) => {
  const store = getStore();
  const fonts = Array.from(store.fonts.values()).map(f => ({
    id: f.id, fileName: f.fileName, fontName: f.fontName,
  }));
  res.json(fonts);
});

// ---------- Google Fonts download ----------
async function downloadGoogleFont(name: string, weight: string, italic: boolean): Promise<{ bytes: Uint8Array; fileName: string } | null> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const styleSuffix = italic ? 'Italic' : '';
  const staticName = `${name}-${weight}${styleSuffix}`;

  const urls = [
    // Static TTF in static/ subdirectory (for fonts with variable TTFs)
    `https://github.com/google/fonts/raw/main/ofl/${slug}/static/${staticName}.ttf`,
    // Plain TTF at root level (most common for non-variable fonts)
    `https://github.com/google/fonts/raw/main/ofl/${slug}/${name}-${weight}${styleSuffix}.ttf`,
    // Variable font patterns
    `https://github.com/google/fonts/raw/main/ofl/${slug}/${name}%5Bwght%5D.ttf`,
    `https://github.com/google/fonts/raw/main/ofl/${slug}/${name}%5Bwdth,wght%5D.ttf`,
    `https://github.com/google/fonts/raw/main/ofl/${slug}/${name}%5Bital,wght%5D.ttf`,
  ];

  for (const url of urls) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) continue;
      const buf = await resp.arrayBuffer();
      const bytes = new Uint8Array(buf);
      if (bytes.length < 12) continue;
      // Verify OpenType magic: 0x00010000 or 'true' or 'OTTO'
      const magic = bytes[0] << 24 | bytes[1] << 16 | bytes[2] << 8 | bytes[3];
      if (magic !== 0x00010000 && magic !== 0x74727565 && magic !== 0x4f54544f) continue;
      return { bytes, fileName: decodeURIComponent(url.substring(url.lastIndexOf('/') + 1)) };
    } catch { /* try next */ }
  }
  return null;
}

app.post('/api/fonts/google', async (req, res) => {
  try {
    const { name, weight = 'Regular', italic = false } = req.body;
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Font name required (e.g. "Roboto")' });

    const normalizedWeight = weight.charAt(0).toUpperCase() + weight.slice(1).toLowerCase();
    const result = await downloadGoogleFont(name, normalizedWeight, italic);
    if (!result) return res.status(404).json({ error: `Font "${name}" not found on GitHub mirror. Try manual upload.` });

    const store = getStore();
    const id = 'google_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + normalizedWeight.toLowerCase() + (italic ? '_italic' : '');
    store.fonts.set(id, { id, fileName: result.fileName, fontName: name, fileBytes: result.bytes });

    res.json({ id, fontName: name, fileName: result.fileName, sizeBytes: result.bytes.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Google Font download failed' });
  }
});

// ---------- Font Catalog (Google Fonts discovery) ----------
let _catalogCache: any[] | null = null;
let _catalogFetching: Promise<any[]> | null = null;

async function fetchGoogleFontsCatalog(): Promise<any[]> {
  if (_catalogCache) return _catalogCache;
  if (_catalogFetching) return _catalogFetching;
  _catalogFetching = (async (): Promise<any[]> => {
    try {
      const resp = await fetch('https://fonts.google.com/metadata/fonts', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(15000),
      });
      let text = await resp.text();
      if (text.startsWith(")]}'")) text = text.slice(5);
      const data = JSON.parse(text);
      _catalogCache = data.familyMetadataList || [];
      return _catalogCache as any[];
    } catch { return []; }
    finally { _catalogFetching = null; }
  })();
  return _catalogFetching as Promise<any[]>;
}

app.get('/api/fonts/catalog', async (req, res) => {
  try {
    const source = (req.query.source as string) || 'google';
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const search = (req.query.search as string || '').toLowerCase();

    let list: any[];
    if (source === 'google') {
      list = await fetchGoogleFontsCatalog();
    } else {
      return res.status(400).json({ error: 'Unknown source' });
    }

    if (search) list = list.filter((f: any) => f.family.toLowerCase().includes(search));

    const store = getStore();
    const installedNames = new Set(Array.from(store.fonts.values()).map(f => f.fontName.toLowerCase()));

    const items = list.slice(0, limit).map((f: any) => ({
      fontName: f.family,
      category: f.category || 'sans-serif',
      variants: f.variants || ['regular'],
      downloaded: installedNames.has(f.family.toLowerCase()),
    }));

    res.json({ items, total: list.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Catalog fetch failed' });
  }
});

// Serve font file for preview
app.get('/api/fonts/file/:id', (req, res) => {
  const store = getStore();
  const font = store.fonts.get(req.params.id);
  if (!font) return res.status(404).json({ error: 'Font not found' });
  res.setHeader('Content-Type', 'application/x-font-ttf');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(Buffer.from(font.fileBytes));
});

// List Templates
app.get('/api/upload/templates', (_req, res) => {
  const store = getStore();
  const templates = Array.from(store.templates.values()).map(t => ({
    id: t.id, originalFileName: t.originalFileName,
    type: t.type, width: t.width, height: t.height,
    previewUrl: '',
  }));
  res.json(templates);
});

// Download Template
app.get('/api/upload/template/:id', (req, res) => {
  const store = getStore();
  const t = store.templates.get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Шаблон не найден' });
  const mime = t.type === 'pdf' ? 'application/pdf' : t.type === 'png' ? 'image/png' : 'image/jpeg';
  res.setHeader('Content-Type', mime);
  res.send(Buffer.from(t.fileBytes));
});

// Generate Test PDF
app.post('/api/generate/test', async (req, res) => {
  try {
    const { row, templateId, fields } = req.body;
    if (!row) return res.status(400).json({ error: 'Пустая строка' });
    if (!templateId) return res.status(400).json({ error: 'Не указан шаблон' });
    const store = getStore();
    const template = store.templates.get(templateId);
    if (!template) return res.status(400).json({ error: 'Шаблон не найден (перезагрузите шаблон)' });
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    await generateSingleCertificate(template, fields || [], row, pdfDoc);
    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка генерации' });
  }
});

// Generate All
app.post('/api/generate', async (req, res) => {
  try {
    const { excelData, templateId, fields, exportConfig } = req.body;
    if (!excelData || !Array.isArray(excelData) || excelData.length === 0) {
      return res.status(400).json({ error: 'Данные Excel отсутствуют' });
    }
    if (!templateId) return res.status(400).json({ error: 'Не указан шаблон' });
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: 'Нет текстовых полей' });
    }
    const store = getStore();
    const template = store.templates.get(templateId);
    if (!template) return res.status(400).json({ error: 'Шаблон не найден' });

    const isSeparate = exportConfig.mode === 'separate';
    const generatedPdfs: { name: string; bytes: Uint8Array }[] = [];
    const errors: { row: number; message: string }[] = [];
    let successCount = 0;

    if (isSeparate) {
      for (let i = 0; i < excelData.length; i++) {
        try {
          const doc = await PDFDocument.create();
          doc.registerFontkit(fontkit);
          await generateSingleCertificate(template, fields, excelData[i], doc);
          const bytes = await doc.save();
          const name = applyFileNameTemplate(exportConfig.fileNameTemplate, excelData[i], i) + '.pdf';
          generatedPdfs.push({ name, bytes });
          successCount++;
        } catch (err: any) {
          errors.push({ row: i + 1, message: err.message });
        }
      }
    } else {
      try {
        const doc = await PDFDocument.create();
        doc.registerFontkit(fontkit);
        for (let i = 0; i < excelData.length; i++) {
          await generateSingleCertificate(template, fields, excelData[i], doc);
          successCount++;
        }
        const bytes = await doc.save();
        const name = (exportConfig.combinedFileName || 'certificates_all').replace(/\.pdf$/i, '') + '.pdf';
        generatedPdfs.push({ name, bytes });
      } catch (err: any) {
        errors.push({ row: 0, message: err.message });
      }
    }

    // Create ZIP if separate mode
    let zipBytes: Uint8Array | null = null;
    if (isSeparate && generatedPdfs.length > 1) {
      zipBytes = await new Promise<Uint8Array>((resolve, reject) => {
        const chunks: Buffer[] = [];
        const archive = archiver('zip', { zlib: { level: 9 } });
        const readable = archive as unknown as Readable;
        readable.on('data', (chunk: Buffer) => chunks.push(chunk));
        readable.on('end', () => resolve(new Uint8Array(Buffer.concat(chunks))));
        archive.on('error', reject);
        for (const pdf of generatedPdfs) {
          archive.append(Buffer.from(pdf.bytes), { name: pdf.name });
        }
        archive.finalize();
      });
    }

    const exportId = `export_${Date.now()}`;
    const fileNames = generatedPdfs.map(p => p.name);

    // Save generation record
    store.generations.unshift({
      id: exportId, templateId, totalRows: excelData.length,
      successCount, errorCount: errors.length,
      exportMode: exportConfig.mode, createdAt: new Date().toISOString(),
      files: fileNames, errors,
    });

    // Return response with PDF data for download
    res.json({
      success: true,
      exportId,
      totalRows: excelData.length,
      successCount,
      errorCount: errors.length,
      files: fileNames,
      errors,
      pdfs: generatedPdfs.map(p => ({ name: p.name, size: p.bytes.length })),
      zipSize: zipBytes ? zipBytes.length : null,
      _downloadHint: `Use GET /api/download/pdf/${exportId} or /api/download/zip/${exportId}`,
    });

    // Store generated PDFs and zip for download
    (globalThis as any).__generatedPdfs = (globalThis as any).__generatedPdfs || {};
    (globalThis as any).__generatedPdfs[exportId] = { pdfs: generatedPdfs, zipBytes };
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка генерации' });
  }
});

// Download single PDF by export ID + index
app.get('/api/download/pdf/:exportId/:index?', (req, res) => {
  const data = (globalThis as any).__generatedPdfs?.[req.params.exportId];
  if (!data) return res.status(404).json({ error: 'Файлы не найдены. Сгенерируйте заново.' });
  const idx = parseInt(req.params.index || '0') || 0;
  if (idx >= data.pdfs.length) return res.status(404).json({ error: 'Индекс за пределами' });
  const pdf = data.pdfs[idx];
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(pdf.name)}"`);
  res.send(Buffer.from(pdf.bytes));
});

// Download ZIP
app.get('/api/download/zip/:exportId', (req, res) => {
  const data = (globalThis as any).__generatedPdfs?.[req.params.exportId];
  if (!data?.zipBytes) return res.status(404).json({ error: 'ZIP не найден. Сгенерируйте заново.' });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="certificates.zip"`);
  res.send(Buffer.from(data.zipBytes));
});

// Generation History
app.get('/api/generate/history', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const store = getStore();
  const all = store.generations;
  const total = all.length;
  const items = all.slice((page - 1) * limit, page * limit);
  res.json({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
});

app.get('/api/generate/history/:id', (req, res) => {
  const store = getStore();
  const gen = store.generations.find(g => g.id === req.params.id);
  if (!gen) return res.status(404).json({ error: 'Не найдено' });
  res.json(gen);
});

// Download sample Excel template
app.get('/api/download/excel-template', (_req, res) => {
  try {
    const wb = XLSX.utils.book_new();
    const sampleData = [
      { name: 'Иван Иванов', email: 'ivan@example.com', certificate_number: '001', course: 'Курс по TypeScript', date: '2024-01-15' },
      { name: 'Мария Петрова', email: 'maria@example.com', certificate_number: '002', course: 'Курс по React', date: '2024-01-20' },
      { name: 'Алексей Сидоров', email: 'alex@example.com', certificate_number: '003', course: 'Курс по Node.js', date: '2024-02-01' },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, 'Участники');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="template.xlsx"');
    res.send(Buffer.from(buf));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка создания шаблона' });
  }
});

// Queue status (no real queue on serverless, just return empty)
app.get('/api/generate/queue', (_req, res) => {
  res.json({ queued: 0, active: false, activeTaskId: null });
});

// ---------- Vercel Handler ----------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
