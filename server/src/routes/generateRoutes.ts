import { Router, Request, Response } from 'express';
import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { getDb } from '../services/db.js';
import { getTemplateById, generateSingleCertificate } from '../services/pdfService.js';
import { enqueueGeneration, getQueueStatus } from '../services/generationWorker.js';
import { logger } from '../logger.js';

const router = Router();

/**
 * POST /api/generate
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

    const result = await enqueueGeneration({ excelData, templateId, fields, exportConfig });

    logger.info(`Generation complete: ${result.successCount}/${result.totalRows} successful`);
    res.json(result);
  } catch (err: any) {
    logger.error(`Generation failed: ${err.message}`);
    res.status(500).json({ error: err.message || 'Ошибка генерации сертификатов' });
  }
});

/**
 * GET /api/generate/queue
 * Returns current queue status.
 */
router.get('/queue', (_req: Request, res: Response) => {
  res.json(getQueueStatus());
});

/**
 * POST /api/generate/test
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

/**
 * GET /api/generate/history
 * Returns paginated generation history.
 */
router.get('/history', (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const db = getDb();

    const total = (db.prepare('SELECT COUNT(*) as count FROM generations').get() as any).count;
    const rows = db.prepare('SELECT * FROM generations ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset) as any[];

    const items = rows.map(r => ({
      id: r.id,
      templateId: r.template_id,
      totalRows: r.total_rows,
      successCount: r.success_count,
      errorCount: r.error_count,
      exportMode: r.export_mode,
      outputPath: r.output_path,
      createdAt: r.created_at,
    }));

    res.json({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/generate/history/:id
 * Returns details for a specific generation.
 */
router.get('/history/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const gen = db.prepare('SELECT * FROM generations WHERE id = ?').get(req.params.id) as any;
    if (!gen) return res.status(404).json({ error: 'Генерация не найдена' });

    const errors = db.prepare('SELECT row_number, message FROM generation_errors WHERE generation_id = ?').all(gen.id) as any[];

    res.json({
      id: gen.id,
      templateId: gen.template_id,
      totalRows: gen.total_rows,
      successCount: gen.success_count,
      errorCount: gen.error_count,
      exportMode: gen.export_mode,
      outputPath: gen.output_path,
      createdAt: gen.created_at,
      errors: errors.map(e => ({ row: e.row_number, message: e.message })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
