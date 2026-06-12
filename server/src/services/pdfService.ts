import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import type { FieldConfig, ExportConfig, GenerateResult } from '../types/index.js';
import { getFontBytes, findFontByName, getBundledFontBytes } from './fontService.js';
import { uiYToPdfY, calculateTextBaselineY, calculateTextX } from '../utils/coordinates.js';
import { measureTextWidth, wrapText, shrinkTextToFit } from '../utils/textLayout.js';
import { applyFileNameTemplate } from '../utils/sanitize.js';

// In-memory template registry
interface TemplateStoreInfo {
  id: string;
  type: 'pdf' | 'png' | 'jpg' | 'jpeg';
  width: number;
  height: number;
  filePath: string;
  originalFileName: string;
}

const templateRegistry = new Map<string, TemplateStoreInfo>();

export function registerTemplate(
  filePath: string,
  originalName: string,
  type: 'pdf' | 'png' | 'jpg' | 'jpeg',
  width: number,
  height: number
): TemplateStoreInfo {
  const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const info: TemplateStoreInfo = {
    id,
    type,
    width,
    height,
    filePath,
    originalFileName: originalName,
  };
  templateRegistry.set(id, info);
  return info;
}

export function getTemplateById(id: string): TemplateStoreInfo | undefined {
  return templateRegistry.get(id);
}

/**
 * Parses Hex Color string to RGB pdf-lib color.
 * e.g., "#FF0000" -> rgb(1, 0, 0)
 */
function hexToRgb(hex: string) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b);
}

/**
 * Generates a single PDF page/document with values from row data.
 */
export async function generateSingleCertificate(
  template: TemplateStoreInfo,
  fields: FieldConfig[],
  row: Record<string, string>,
  pdfDoc: PDFDocument
): Promise<void> {
  // Register fontkit for custom font embedding
  pdfDoc.registerFontkit(fontkit);

  let page;

  // 1. Setup base page
  if (template.type === 'pdf') {
    const templateBytes = fs.readFileSync(template.filePath);
    const srcDoc = await PDFDocument.load(templateBytes);
    const [copiedPage] = await pdfDoc.copyPages(srcDoc, [0]);
    page = pdfDoc.addPage(copiedPage);
  } else {
    // Image template
    const imgBytes = fs.readFileSync(template.filePath);
    page = pdfDoc.addPage([template.width, template.height]);
    
    let embeddedImg;
    if (template.type === 'png') {
      embeddedImg = await pdfDoc.embedPng(imgBytes);
    } else {
      embeddedImg = await pdfDoc.embedJpg(imgBytes);
    }
    
    page.drawImage(embeddedImg, {
      x: 0,
      y: 0,
      width: template.width,
      height: template.height,
    });
  }

  const pageHeight = page.getHeight();

  // 2. Draw each text field
  for (const field of fields) {
    if (!field.visible) continue;

    const rawText = row[field.excelColumn] !== undefined ? String(row[field.excelColumn]) : '';
    const text = rawText.trim();
    if (!text) continue;

    // Resolve font
    let fontToUse;
    const customFontInfo = findFontByName(field.fontFamily);
    if (customFontInfo) {
      const fontBytes = getFontBytes(customFontInfo.id);
      fontToUse = await pdfDoc.embedFont(fontBytes);
    } else {
      // Try bundled Arial font (supports Cyrillic)
      const bundledBytes = getBundledFontBytes();
      if (bundledBytes) {
        fontToUse = await pdfDoc.embedFont(bundledBytes);
      } else {
        fontToUse = await pdfDoc.embedFont(StandardFonts.Helvetica);
      }
    }

    const color = hexToRgb(field.fontColor);
    
    // Resolve dynamic Font Size
    let fontSize = field.fontSize;
    const mode = field.mode;
    
    if (mode === 'shrink-to-fit') {
      fontSize = shrinkTextToFit(
        text,
        fontToUse,
        field.fontSize,
        field.width,
        field.height,
        field.lineHeight || 1.2,
        false
      );
      if (fontSize < 4) fontSize = 4; // minimum readable size
    }

    // Determine layout: single line vs multiline
    let lines: string[] = [text];
    if (mode === 'multiline') {
      lines = wrapText(text, fontToUse, fontSize, field.width);
    } else if (mode === 'clip') {
      // Just clip text length so it fits (approximate clipping)
      let currentText = text;
      while (currentText.length > 0 && measureTextWidth(currentText, fontToUse, fontSize) > field.width) {
        currentText = currentText.slice(0, -1);
      }
      lines = [currentText ? currentText + '...' : ''];
    } else if (mode === 'single-line') {
      // Just single line without shrinking
      lines = [text];
    }

    // Y position calculation
    const pdfY = uiYToPdfY(field.y, pageHeight, field.height);
    const totalLines = lines.length;
    const fontLineHeight = field.lineHeight || 1.2;
    const lineSpacing = fontSize * fontLineHeight;

    // Draw lines
    for (let i = 0; i < totalLines; i++) {
      const lineText = lines[i];
      const textWidth = measureTextWidth(lineText, fontToUse, fontSize);
      const textX = calculateTextX(field.x, field.width, textWidth, field.align);
      
      // We draw line by line, calculating Y offset
      // Since PDF Y grows UPWARD, the first line is highest (for Top align)
      // Let's compute baseline of whole text block, then adjust line by line.
      const baseLineY = calculateTextBaselineY(
        pdfY,
        field.height,
        fontSize,
        field.verticalAlign,
        totalLines,
        fontLineHeight
      );

      // In PDF, Y for line 0 (top-most in UI) should be at baseLineY + (totalLines - 1 - i) * lineSpacing
      const currentLineY = baseLineY + (totalLines - 1 - i) * lineSpacing;

      page.drawText(lineText, {
        x: textX,
        y: currentLineY,
        size: fontSize,
        font: fontToUse,
        color: color,
        rotate: field.rotation ? degrees(field.rotation) : undefined,
      });
    }
  }
}

/**
 * Run batch generation of certificates.
 */
export async function generateAllCertificates(
  template: TemplateStoreInfo,
  fields: FieldConfig[],
  excelRows: Record<string, string>[],
  exportConfig: ExportConfig,
  exportDir: string
): Promise<GenerateResult> {
  const result: GenerateResult = {
    success: true,
    exportId: path.basename(exportDir),
    outputPath: exportDir,
    totalRows: excelRows.length,
    successCount: 0,
    errorCount: 0,
    files: [],
    errors: [],
  };

  const isSeparate = exportConfig.mode === 'separate';
  
  // Create filenames
  const rawFileNames = excelRows.map((row, idx) => {
    return applyFileNameTemplate(exportConfig.fileNameTemplate, row, idx);
  });
  
  // Deduplicate filenames
  const counts = new Map<string, number>();
  const uniqueFileNames = rawFileNames.map(name => {
    const lower = name.toLowerCase();
    const count = counts.get(lower) || 0;
    counts.set(lower, count + 1);
    const baseName = count === 0 ? name : `${name}_${count + 1}`;
    return `${baseName}.pdf`;
  });

  let combinedDoc: PDFDocument | null = null;
  if (!isSeparate) {
    combinedDoc = await PDFDocument.create();
    combinedDoc.registerFontkit(fontkit);
  }

  for (let i = 0; i < excelRows.length; i++) {
    const row = excelRows[i];
    const fileName = uniqueFileNames[i];

    try {
      if (isSeparate) {
        // Mode 1: Separate PDF files
        const singleDoc = await PDFDocument.create();
        singleDoc.registerFontkit(fontkit);
        
        await generateSingleCertificate(template, fields, row, singleDoc);
        
        const pdfBytes = await singleDoc.save();
        const filePath = path.join(exportDir, fileName);
        fs.writeFileSync(filePath, pdfBytes);
        
        result.files.push(fileName);
        result.successCount++;
      } else {
        // Mode 2: Combined PDF file
        if (combinedDoc) {
          await generateSingleCertificate(template, fields, row, combinedDoc);
          result.successCount++;
        }
      }
    } catch (err: any) {
      result.errorCount++;
      result.errors.push({
        row: i + 1,
        message: err.message || 'Ошибка генерации PDF',
      });
    }
  }

  // Save combined PDF if selected
  if (!isSeparate && combinedDoc) {
    try {
      const combinedPdfBytes = await combinedDoc.save();
      const combinedName = exportConfig.combinedFileName 
        ? (exportConfig.combinedFileName.endsWith('.pdf') ? exportConfig.combinedFileName : `${exportConfig.combinedFileName}.pdf`)
        : 'certificates_all.pdf';
      const filePath = path.join(exportDir, combinedName);
      fs.writeFileSync(filePath, combinedPdfBytes);
      result.files.push(combinedName);
    } catch (err: any) {
      result.success = false;
      result.errors.push({
        row: 0,
        message: `Ошибка сохранения общего PDF: ${err.message}`,
      });
    }
  }

  // Write report.json
  const reportPath = path.join(exportDir, 'report.json');
  const reportData = {
    createdAt: new Date().toISOString(),
    totalRows: result.totalRows,
    successCount: result.successCount,
    errorCount: result.errorCount,
    exportMode: exportConfig.mode,
    files: result.files,
    errors: result.errors,
  };
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf-8');

  // If separate, additionally prepare ZIP download option (will package directory on demand or here)
  if (isSeparate && result.successCount > 0) {
    await createZipArchive(exportDir, result.files);
  }

  return result;
}

/**
 * Creates a ZIP archive of all generated certificates in the export directory.
 */
function createZipArchive(exportDir: string, files: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const zipPath = path.join(exportDir, 'certificates.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    for (const file of files) {
      const filePath = path.join(exportDir, file);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file });
      }
    }

    archive.finalize();
  });
}
