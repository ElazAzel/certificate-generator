import * as path from 'path';
import { logger } from '../logger.js';
import { getDb } from './db.js';
import { getTemplateById, generateAllCertificates } from './pdfService.js';
import { createExportDir, getOutputDir, isSafePath } from './fileService.js';

interface Task {
  id: string;
  templateId: string;
  fields: any[];
  excelData: Record<string, string>[];
  exportConfig: any;
  resolve: (result: any) => void;
  reject: (err: Error) => void;
}

const queue: Task[] = [];
let processing = false;
let activeTaskId: string | null = null;

export function getQueueStatus() {
  return {
    queued: queue.length,
    active: activeTaskId !== null,
    activeTaskId,
  };
}

export function enqueueGeneration(params: {
  templateId: string;
  fields: any[];
  excelData: Record<string, string>[];
  exportConfig: any;
}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    queue.push({ ...params, id, resolve, reject });
    logger.info(`Generation task ${id} enqueued (queue: ${queue.length})`);
    processQueue();
  });
}

async function processQueue(): Promise<void> {
  if (processing || queue.length === 0) return;
  processing = true;

  const task = queue.shift()!;
  activeTaskId = task.id;

  try {
    const { templateId, fields, excelData, exportConfig } = task;
    const template = getTemplateById(templateId);
    if (!template) throw new Error('Шаблон не найден');

    let targetBaseDir = getOutputDir();
    if (exportConfig.outputFolder && exportConfig.outputFolder !== 'output') {
      const userPath = path.resolve(exportConfig.outputFolder);
      if (isSafePath(userPath)) targetBaseDir = userPath;
    }

    const exportDir = createExportDir(targetBaseDir);
    const result = await generateAllCertificates(template, fields, excelData, exportConfig, exportDir);

    // Save history
    try {
      const db = getDb();
      const genId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      db.prepare('INSERT INTO generations (id, template_id, total_rows, success_count, error_count, export_mode, output_path) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        genId, templateId, result.totalRows, result.successCount, result.errorCount, exportConfig.mode, exportDir
      );
      for (const err of result.errors) {
        db.prepare('INSERT INTO generation_errors (generation_id, row_number, message) VALUES (?, ?, ?)').run(genId, err.row, err.message);
      }
    } catch (dbErr) {
      logger.error(`Failed to save generation history: ${dbErr}`);
    }

    task.resolve(result);
  } catch (err: any) {
    task.reject(err);
  } finally {
    activeTaskId = null;
    processing = false;
    processQueue();
  }
}
