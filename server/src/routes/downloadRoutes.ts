import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { getOutputDir } from '../services/fileService.js';
import { exportProjectZip } from '../services/projectService.js';
import { logger } from '../logger.js';

const router = Router();

/**
 * GET /api/download/excel-template
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
 * GET /api/download/project
 * Export full project configuration as ZIP.
 */
router.get('/project', async (req: Request, res: Response) => {
  try {
    const zipBuffer = await exportProjectZip();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="project-export.zip"');
    res.send(zipBuffer);
    logger.info('Project export downloaded');
  } catch (err: any) {
    logger.error(`Project export failed: ${err.message}`);
    res.status(500).json({ error: err.message || 'Ошибка экспорта проекта' });
  }
});

/**
 * GET /api/download/:exportId
 */
router.get('/:exportId', (req: Request, res: Response) => {
  try {
    const exportId = req.params.exportId;
    const type = req.query.type as string;

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
      const files = fs.readdirSync(exportDir);
      const pdfFiles = files.filter(f => f.endsWith('.pdf'));

      if (pdfFiles.length === 0) {
        return res.status(404).json({ error: 'PDF файлы отсутствуют в этой папке' });
      }

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
