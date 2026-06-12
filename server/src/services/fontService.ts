import * as fs from 'fs';
import * as path from 'path';
import type { FontInfo } from '../types/index.js';

const fontRegistry = new Map<string, FontInfo>();

/**
 * Read the English Font Family name (name ID 1) from a TTF/OTF binary table.
 * This parses the 'name' table of the OpenType/TrueType spec.
 */
function readFontFamilyName(filePath: string): string | null {
  try {
    const buf = fs.readFileSync(filePath);
    const data = new Uint8Array(buf);
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

    // Read the offset table
    const sfVersion = view.getUint32(0, false);
    const isTTF = sfVersion === 0x00010000 || sfVersion === 0x74727565; // 0x00010000 or 'true'
    const isOTF = sfVersion === 0x4F54544F; // 'OTTO'
    if (!isTTF && !isOTF) return null;

    const numTables = view.getUint16(4, false);
    const searchRange = view.getUint16(6, false);
    const entrySelector = view.getUint16(8, false);
    const rangeShift = view.getUint16(10, false);

    // Find the 'name' table
    let nameOffset = -1;
    let nameLength = 0;
    for (let i = 0; i < numTables; i++) {
      const recordOffset = 12 + i * 16;
      const tag = String.fromCharCode(
        data[recordOffset], data[recordOffset + 1],
        data[recordOffset + 2], data[recordOffset + 3]
      );
      if (tag === 'name') {
        nameOffset = view.getUint32(recordOffset + 8, false);
        nameLength = view.getUint32(recordOffset + 12, false);
        break;
      }
    }
    if (nameOffset < 0 || nameLength <= 0) return null;

    // Parse the name table
    const fmt = view.getUint16(nameOffset, false);
    const count = view.getUint16(nameOffset + 2, false);
    const stringOffset = view.getUint16(nameOffset + 4, false);

    for (let i = 0; i < count; i++) {
      const recOff = nameOffset + 6 + i * 12;
      const platformID = view.getUint16(recOff, false);
      const encodingID = view.getUint16(recOff + 2, false);
      const languageID = view.getUint16(recOff + 4, false);
      const nameID = view.getUint16(recOff + 6, false);
      const len = view.getUint16(recOff + 8, false);
      const strOff = nameOffset + stringOffset + view.getUint16(recOff + 10, false);

      // Name ID 1 = Font Family
      if (nameID !== 1) continue;

      // Prefer Windows platform (3) with Unicode BMP (1), English (1033) or any language
      // Also accept Mac platform (1) with Roman (0), English (0)
      if (platformID === 3 && encodingID === 1) {
        // Windows Unicode
        let result = '';
        for (let j = 0; j < len; j += 2) {
          const code = view.getUint16(strOff + j, false);
          if (code === 0) break;
          result += String.fromCharCode(code);
        }
        if (result.trim()) return result.trim();
      } else if (platformID === 1 && encodingID === 0) {
        // Mac Roman
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

/**
 * Scan the Windows fonts directory and register all TTF/OTF fonts.
 */
export function scanSystemFonts(): void {
  const fontDirs = [
    path.join(process.env.SystemRoot || 'C:\\Windows', 'Fonts'),
    path.join(process.cwd(), 'fonts'),
  ];

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

        // Don't overwrite if already registered
        if (fontRegistry.has(id)) continue;

        const info: FontInfo = {
          id,
          fileName: file,
          fontName,
          filePath,
        };
        fontRegistry.set(id, info);
      }
    } catch { /* skip unreadable directories */ }
  }
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

  const info: FontInfo = {
    id,
    fileName: originalName,
    fontName,
    filePath,
  };

  fontRegistry.set(id, info);
  return info;
}

export function getFontById(id: string): FontInfo | undefined {
  return fontRegistry.get(id);
}

export function getAllFonts(): FontInfo[] {
  return Array.from(fontRegistry.values());
}

export function getFontBytes(id: string): Uint8Array {
  const info = fontRegistry.get(id);
  if (!info) {
    throw new Error(`Шрифт с id "${id}" не найден`);
  }
  if (!fs.existsSync(info.filePath)) {
    throw new Error(`Файл шрифта не найден: ${info.filePath}`);
  }
  return fs.readFileSync(info.filePath);
}

export function getBundledFontBytes(): Uint8Array | null {
  for (const info of fontRegistry.values()) {
    if (info.fileName.toLowerCase() === 'arial.ttf') {
      try { return fs.readFileSync(info.filePath); } catch { return null; }
    }
  }
  return null;
}

export function findFontByName(name: string): FontInfo | undefined {
  // Exact matches first
  for (const font of fontRegistry.values()) {
    if (font.fontName === name || font.fileName === name || font.id === name) {
      return font;
    }
  }
  // Case-insensitive match
  const lower = name.toLowerCase();
  for (const font of fontRegistry.values()) {
    if (font.fontName.toLowerCase() === lower ||
        font.fileName.toLowerCase() === lower) {
      return font;
    }
  }
  return undefined;
}