import { Router, Request, Response } from 'express';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as path from 'path';
import * as fs from 'fs';
import { getTemplateById, generateAllCertificates, generateSingleCertificate } from '../services/pdfService.js';
import { createExportDir, getOutputDir, isSafePath } from '../services/fileService.js';
import type { FieldConfig, ExportConfig } from '../types/index.js';

const router = Router();

/**
 * POST /api/generate
 * Main endpoint to batch generate certificates.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { excelData, templateId, fields, exportConfig } = req.body;

    if (!excelData || !Array.isArray(excelData) || excelData.length === 0) {
      return res.status(400).json({ error: 'Данные из Excel отсутствуют или пусты' });
    }
    if (!templateId) {
      return res.status(400).json({ error: 'Не указан шаблон сертификата' });
    }
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: 'Не настроено ни одного текстового поля' });
    }

    const template = getTemplateById(templateId);
    if (!template) {
      return res.status(400).json({ error: 'Шаблон не найден на сервере' });
    }

    // Determine target export dir
    let targetBaseDir = getOutputDir();
    if (exportConfig.outputFolder && exportConfig.outputFolder !== 'output') {
      const userPath = path.resolve(exportConfig.outputFolder);
      if (isSafePath(userPath)) {
        targetBaseDir = userPath;
      }
    }

    const exportDir = createExportDir(targetBaseDir);

    // Run batch generation
    const result = await generateAllCertificates(
      template,
      fields,
      excelData,
      exportConfig,
      exportDir
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка генерации сертификатов' });
  }
});

/**
 * POST /api/generate/test
 * Generate a single certificate preview PDF for the current row.
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { row, templateId, fields } = req.body;

    if (!row) {
      return res.status(400).json({ error: 'Строка данных пуста' });
    }
    if (!templateId) {
      return res.status(400).json({ error: 'Не указан шаблон' });
    }

    const template = getTemplateById(templateId);
    if (!template) {
      return res.status(400).json({ error: 'Шаблон не найден' });
    }

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    await generateSingleCertificate(template, fields || [], row, pdfDoc);

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"');
    res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка генерации превью' });
  }
});

export default router;
