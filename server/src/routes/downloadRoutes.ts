import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { getOutputDir } from '../services/fileService.js';

const router = Router();

/**
 * GET /api/download/excel-template
 * Downloads the sample Excel template file.
 */
router.get('/excel-template', (req: Request, res: Response) => {
  try {
    const templatePath = path.join(process.cwd(), '..', 'sample-data', 'sample.xlsx');
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'Шаблонный файл Excel не найден на сервере' });
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="template.xlsx"');
    return res.sendFile(templatePath);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Ошибка скачивания шаблона' });
  }
});

/**
 * GET /api/download/:exportId
 * Downloads either the single combined PDF or the ZIP file containing all separate PDFs.
 */
router.get('/:exportId', (req: Request, res: Response) => {
  try {
    const exportId = req.params.exportId;
    const type = req.query.type as string; // 'zip' or 'pdf'
    
    // Safety check: block path traversal
    if (exportId.includes('..') || exportId.includes('/') || exportId.includes('\\')) {
      return res.status(400).json({ error: 'Недопустимый идентификатор экспорта' });
    }

    const exportDir = path.join(getOutputDir(), exportId);
    
    if (!fs.existsSync(exportDir)) {
      return res.status(404).json({ error: 'Экспорт не найден' });
    }

    if (type === 'zip') {
      const zipPath = path.join(exportDir, 'certificates.zip');
      if (!fs.existsSync(zipPath)) {
        return res.status(404).json({ error: 'ZIP-архив еще не создан или отсутствует' });
      }
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="certificates_${exportId}.zip"`);
      return res.sendFile(zipPath);
    } else {
      // Find the first PDF in the directory
      const files = fs.readdirSync(exportDir);
      const pdfFiles = files.filter(f => f.endsWith('.pdf'));

      if (pdfFiles.length === 0) {
        return res.status(404).json({ error: 'PDF файлы отсутствуют в этой папке' });
      }

      // If combined mode, there is one PDF. If separate, send the first one or prompt ZIP
      const targetPdf = pdfFiles[0];
      const pdfPath = path.join(exportDir, targetPdf);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${targetPdf}"`);
      return res.sendFile(pdfPath);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка при скачивании' });
  }
});

export default router;
