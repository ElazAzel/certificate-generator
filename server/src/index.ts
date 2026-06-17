import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
dotenv.config();

import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import { logger } from './logger.js';
import { initDatabase } from './services/db.js';
import uploadRoutes from './routes/uploadRoutes.js';
import generateRoutes from './routes/generateRoutes.js';
import downloadRoutes from './routes/downloadRoutes.js';
import { ensureDirectories, cleanUploads } from './services/fileService.js';
import { scanSystemFonts } from './services/fontService.js';
import { registerTemplate } from './services/pdfService.js';
import { rateLimiter } from './middleware/rateLimit.js';

const clientDistPath = path.join(process.cwd(), '..', 'client', 'dist');

const app = express();
const PORT = process.env.PORT || 3001;

// ---- Initialize DB ----
initDatabase();
logger.info('Database initialized');

// ---- Middlewares ----
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(rateLimiter);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
  });
  next();
});

// Ensure uploads/output directories exist
ensureDirectories();

// Clean stale Excel uploads from previous runs
cleanUploads();

// Scan system fonts (Windows Fonts folder + bundled fonts) — safe on Linux
try {
  scanSystemFonts();
} catch (err: any) {
  logger.warn(`Font scanning skipped: ${err.message}`);
}

// Auto-register default template if any PDF exists in template/ folder
(async () => {
  try {
    const templateDir = path.join(process.cwd(), '..', 'template');
    if (!fs.existsSync(templateDir)) {
      logger.info('No template/ dir found, skipping auto-registration');
      return;
    }
    const files = fs.readdirSync(templateDir).filter(f => f.toLowerCase().endsWith('.pdf'));
    logger.info(`Auto-reg: found ${files.length} PDF(s) in template/: ${files.join(', ')}`);
    if (files.length > 0) {
      const srcPath = path.join(templateDir, files[0]);
      const destDir = path.join(process.cwd(), 'uploads', 'templates');
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      const destName = `template-${Date.now()}.pdf`;
      const destPath = path.join(destDir, destName);
      fs.copyFileSync(srcPath, destPath);

      const { PDFDocument } = await import('pdf-lib');
      const fileBytes = fs.readFileSync(destPath);
      const pdfDoc = await PDFDocument.load(fileBytes);
      const firstPage = pdfDoc.getPage(0);
      registerTemplate(destPath, files[0], 'pdf', firstPage.getWidth(), firstPage.getHeight());
      logger.info(`Default template ${files[0]} loaded`);
    }
  } catch (err: any) {
    logger.warn(`Auto-register template failed: ${err.message}`);
  }
})();

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Serve sample data statically
app.use('/sample-data', express.static(path.join(process.cwd(), '..', 'sample-data')));

// ---- Routes (no auth — local tool) ----
app.use('/api/upload', uploadRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/download', downloadRoutes);

// ---- Health Check ----
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// In production, serve the built client app (standalone mode)
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/sample-data')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
  logger.info(`Serving built client from ${clientDistPath}`);
}

// Start Server
app.listen(PORT, () => {
  const mode = fs.existsSync(clientDistPath) ? 'production (standalone)' : 'development';
  logger.info(`Server started in ${mode} mode on http://localhost:${PORT}`);
});

export default app;
