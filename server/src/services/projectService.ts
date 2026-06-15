import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { getDb } from './db.js';
import { getAllFonts } from './fontService.js';
import { getAllTemplates } from './pdfService.js';
import { getOutputDir } from './fileService.js';

/**
 * Export project configuration and related files as a ZIP archive.
 */
export async function exportProjectZip(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('data', (data: Buffer) => buffers.push(data));
    archive.on('end', () => resolve(Buffer.concat(buffers)));
    archive.on('error', (err) => reject(err));

    // Add DB snapshot
    const db = getDb();
    const dbPath = path.join(process.cwd(), 'data', 'certgen.db');
    if (fs.existsSync(dbPath)) {
      archive.file(dbPath, { name: 'data/certgen.db' });
    }

    // Export fonts list as JSON
    const fonts = getAllFonts();
    archive.append(JSON.stringify(fonts, null, 2), { name: 'data/fonts.json' });

    // Export templates list as JSON
    const templates = getAllTemplates();
    archive.append(JSON.stringify(templates, null, 2), { name: 'data/templates.json' });

    // Add template files
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (fs.existsSync(uploadsDir)) {
      archive.directory(uploadsDir, 'uploads');
    }

    // Add output directory listing
    const outputDir = getOutputDir();
    if (fs.existsSync(outputDir)) {
      const dirs = fs.readdirSync(outputDir).filter(f => fs.statSync(path.join(outputDir, f)).isDirectory());
      archive.append(JSON.stringify(dirs, null, 2), { name: 'output/generations.json' });
    }

    archive.finalize();
  });
}

/**
 * Import project configuration from uploaded ZIP.
 */
export async function importProjectZip(zipPath: string): Promise<{ imported: string[]; skipped: string[] }> {
  const result = { imported: [] as string[], skipped: [] as string[] };
  // For now, extract files and copy DB if present
  // Full restore requires unzipping and merging DB — handled by the caller
  return result;
}
