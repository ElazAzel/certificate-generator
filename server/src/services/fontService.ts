import * as fs from 'fs';
import * as path from 'path';
import { getDb } from './db.js';
import { logger } from '../logger.js';
import type { FontInfo } from '../types/index.js';

function readFontFamilyName(filePath: string): string | null {
  try {
    const buf = fs.readFileSync(filePath);
    const data = new Uint8Array(buf);
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

    const sfVersion = view.getUint32(0, false);
    const isTTF = sfVersion === 0x00010000 || sfVersion === 0x74727565;
    const isOTF = sfVersion === 0x4F54544F;
    if (!isTTF && !isOTF) return null;

    const numTables = view.getUint16(4, false);
    let nameOffset = -1;
    for (let i = 0; i < numTables; i++) {
      const recordOffset = 12 + i * 16;
      const tag = String.fromCharCode(
        data[recordOffset], data[recordOffset + 1],
        data[recordOffset + 2], data[recordOffset + 3]
      );
      if (tag === 'name') {
        nameOffset = view.getUint32(recordOffset + 8, false);
        break;
      }
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
          const code = data[strOff + j];
          if (code === 0) break;
          result += String.fromCharCode(code);
        }
        if (result.trim()) return result.trim();
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function scanSystemFonts(): void {
  const fontDirs = [
    path.join(process.env.SystemRoot || 'C:\\Windows', 'Fonts'),
    path.join(process.cwd(), 'fonts'),
  ];

  const db = getDb();
  const insert = db.prepare('INSERT OR IGNORE INTO fonts (id, file_name, font_name, file_path) VALUES (?, ?, ?, ?)');
  let count = 0;

  for (const dir of fontDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (ext !== '.ttf' && ext !== '.otf') continue;

        const filePath = path.join(dir, file);
        const fontName = readFontFamilyName(filePath) || path.basename(file, ext);
        const id = `sys_${fontName.replace(/[^a-zA-Z0-9]/g, '_')}`;

        insert.run(id, file, fontName, filePath);
        count++;
      }
    } catch { }
  }
  logger.info(`Scanned ${count} system fonts`);
}

export function registerFont(filePath: string, originalName: string): FontInfo {
  if (!fs.existsSync(filePath)) {
    throw new Error('Файл шрифта не найден');
  }

  const ext = path.extname(originalName).toLowerCase();
  if (ext !== '.ttf' && ext !== '.otf') {
    throw new Error('Поддерживаются только шрифты TTF и OTF');
  }

  const id = `font_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const fontName = path.basename(originalName, ext);

  const db = getDb();
  db.prepare('INSERT INTO fonts (id, file_name, font_name, file_path) VALUES (?, ?, ?, ?)').run(id, originalName, fontName, filePath);

  return { id, fileName: originalName, fontName, filePath };
}

export function getFontById(id: string): FontInfo | undefined {
  const row = getDb().prepare('SELECT id, file_name, font_name, file_path FROM fonts WHERE id = ?').get(id) as any;
  if (!row) return undefined;
  return { id: row.id, fileName: row.file_name, fontName: row.font_name, filePath: row.file_path };
}

export function getAllFonts(): FontInfo[] {
  const rows = getDb().prepare('SELECT id, file_name, font_name, file_path FROM fonts ORDER BY font_name').all() as any[];
  return rows.map(r => ({ id: r.id, fileName: r.file_name, fontName: r.font_name, filePath: r.file_path }));
}

export function getFontBytes(id: string): Uint8Array {
  const info = getFontById(id);
  if (!info) throw new Error(`Шрифт с id "${id}" не найден`);
  if (!fs.existsSync(info.filePath)) throw new Error(`Файл шрифта не найден: ${info.filePath}`);
  return fs.readFileSync(info.filePath);
}

export function getBundledFontBytes(): Uint8Array | null {
  const all = getAllFonts();
  for (const info of all) {
    if (info.fileName.toLowerCase() === 'arial.ttf') {
      try { return fs.readFileSync(info.filePath); } catch { return null; }
    }
  }
  return null;
}

export function findFontByName(name: string): FontInfo | undefined {
  const db = getDb();
  const rows = db.prepare('SELECT id, file_name, font_name, file_path FROM fonts WHERE font_name = ? OR file_name = ? OR id = ?').all(name, name, name) as any[];
  if (rows.length > 0) {
    const r = rows[0];
    return { id: r.id, fileName: r.file_name, fontName: r.font_name, filePath: r.file_path };
  }
  const lower = name.toLowerCase();
  const caseRows = db.prepare('SELECT id, file_name, font_name, file_path FROM fonts WHERE LOWER(font_name) = ? OR LOWER(file_name) = ?').all(lower, lower) as any[];
  if (caseRows.length > 0) {
    const r = caseRows[0];
    return { id: r.id, fileName: r.file_name, fontName: r.font_name, filePath: r.file_path };
  }
  return undefined;
}

/**
 * Find a bold/italic variant of a font file.
 * Searches the same directory for files matching common naming patterns:
 *   arial.ttf → arialbd.ttf (Bold), ariali.ttf (Italic), arialbi.ttf (BoldItalic)
 *   calibri.ttf → calibrib.ttf, calibrii.ttf, calibriz.ttf
 */
export function findFontVariant(
  baseFilePath: string,
  style: 'bold' | 'italic' | 'bold-italic'
): string | null {
  const dir = path.dirname(baseFilePath);
  const ext = path.extname(baseFilePath);
  const baseName = path.basename(baseFilePath, ext).toLowerCase();

  // Known suffix mappings for common font families
  const suffixMap: Record<string, Record<string, string[]>> = {
    arial:      { bold: ['arialbd'], italic: ['ariali'], 'bold-italic': ['arialbi'] },
    times:      { bold: ['timesbd'], italic: ['timesi'], 'bold-italic': ['timesbi'] },
    courier:    { bold: ['courbd'], italic: ['couri'], 'bold-italic': ['courbi'] },
    calibri:    { bold: ['calibrib'], italic: ['calibrii'], 'bold-italic': ['calibriz'] },
    cambria:    { bold: ['cambriab'], italic: ['cambriai'], 'bold-italic': ['cambriaz'] },
    segoeui:    { bold: ['segoeuib'], italic: ['segoeuii'], 'bold-italic': ['segoeuiz'] },
    tahoma:     { bold: ['tahomabd'], italic: [], 'bold-italic': [] },
    verdana:    { bold: ['verdanab'], italic: ['verdanai'], 'bold-italic': ['verdanaz'] },
    georgia:    { bold: ['georgiab'], italic: ['georgiai'], 'bold-italic': ['georgiaz'] },
  };

  // Check known mappings first
  const family = baseName.replace(/[^a-z]/g, '');
  if (suffixMap[family] && suffixMap[family][style]) {
    for (const suffix of suffixMap[family][style]) {
      const candidate = path.join(dir, suffix + ext);
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  // Generic heuristic: append common suffixes
  const styleSuffixes: Record<string, string[]> = {
    bold: ['bd', 'bold', 'b', 'Bold'],
    italic: ['i', 'italic', 'It', 'Italic'],
    'bold-italic': ['bi', 'bolditalic', 'BoldItalic', 'bdit'],
  };

  for (const suffix of styleSuffixes[style] || []) {
    // Try: baseName + suffix + ext  (e.g., arialbd.ttf)
    const candidate1 = path.join(dir, baseName + suffix + ext);
    if (fs.existsSync(candidate1)) return candidate1;

    // Try: baseName + '-' + suffix + ext (e.g., Arial-Bold.ttf)
    const candidate2 = path.join(dir, baseName + '-' + suffix + ext);
    if (fs.existsSync(candidate2)) return candidate2;
  }

  return null;
}
