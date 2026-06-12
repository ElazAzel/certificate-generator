import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import { parseExcelFile } from '../services/excelService.js';
import { registerTemplate, getAllTemplates } from '../services/pdfService.js';
import { registerFont, getAllFonts } from '../services/fontService.js';
import { getUploadsDir } from '../services/fileService.js';

const router = Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'misc';
    if (file.fieldname === 'excel') folder = 'excel';
    else if (file.fieldname === 'template') folder = 'templates';
    else if (file.fieldname === 'font') folder = 'fonts';
    
    const dest = path.join(getUploadsDir(), folder);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

/**
 * POST /api/upload/excel
 */
router.post('/excel', upload.single('excel'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл Excel не был загружен' });
    }

    const data = parseExcelFile(req.file.path);
    res.json({
      success: true,
      columns: data.columns,
      rows: data.rows,
      totalRows: data.totalRows,
      preview: data.rows.slice(0, 10), // Limit preview to 10 rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка обработки Excel файла' });
  }
});

/**
 * POST /api/upload/template
 */
router.post('/template', upload.single('template'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл шаблона не был загружен' });
    }

    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();
    const filePath = req.file.path;
    
    let type: 'pdf' | 'png' | 'jpg' | 'jpeg';
    if (ext === '.pdf') type = 'pdf';
    else if (ext === '.png') type = 'png';
    else if (ext === '.jpg' || ext === '.jpeg') type = 'jpg';
    else {
      return res.status(400).json({ error: 'Поддерживаются только форматы PDF, PNG, JPG/JPEG' });
    }

    // Determine dimensions using pdf-lib
    let width = 842;  // A4 landscape default
    let height = 595;
    
    const fileBytes = fs.readFileSync(filePath);

    if (type === 'pdf') {
      const pdfDoc = await PDFDocument.load(fileBytes);
      if (pdfDoc.getPageCount() === 0) {
        return res.status(400).json({ error: 'В PDF шаблоне нет страниц' });
      }
      const firstPage = pdfDoc.getPage(0);
      width = firstPage.getWidth();
      height = firstPage.getHeight();
    } else {
      // Image: load temporarily inside pdf-lib to extract dimensions
      const tempDoc = await PDFDocument.create();
      let img;
      if (type === 'png') {
        img = await tempDoc.embedPng(fileBytes);
      } else {
        img = await tempDoc.embedJpg(fileBytes);
      }
      const dims = img.scale(1);
      width = dims.width;
      height = dims.height;
    }

    // Static URL to access template preview
    // Express static serves 'uploads' folder, so URL will be /uploads/templates/<filename>
    const filename = path.basename(filePath);
    const previewUrl = `/uploads/templates/${filename}`;

    const templateInfo = registerTemplate(filePath, originalName, type, width, height);

    res.json({
      success: true,
      id: templateInfo.id,
      type: templateInfo.type,
      width: templateInfo.width,
      height: templateInfo.height,
      originalFileName: templateInfo.originalFileName,
      previewUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка обработки файла шаблона' });
  }
});

/**
 * POST /api/upload/font
 */
router.post('/font', upload.single('font'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл шрифта не был загружен' });
    }

    const info = registerFont(req.file.path, req.file.originalname);
    res.json({
      success: true,
      id: info.id,
      fileName: info.fileName,
      fontName: info.fontName,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка загрузки шрифта' });
  }
});

/**
 * GET /api/fonts
 */
router.get('/fonts', (req: Request, res: Response) => {
  try {
    const fonts = getAllFonts().map(f => ({
      id: f.id,
      fileName: f.fileName,
      fontName: f.fontName,
    }));
    res.json(fonts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/upload/templates
 */
router.get('/templates', (req: Request, res: Response) => {
  try {
    const templates = getAllTemplates().map(t => ({
      id: t.id,
      originalFileName: t.originalFileName,
      type: t.type,
      width: t.width,
      height: t.height,
      previewUrl: `/uploads/templates/${path.basename(t.filePath)}`,
    }));
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
