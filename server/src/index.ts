import dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
dotenv.config();

import express from 'express';
import cors from 'cors';
import * as fs from 'fs';
import winston from 'winston';
import { initDatabase } from './services/db.js';
import uploadRoutes from './routes/uploadRoutes.js';
import generateRoutes from './routes/generateRoutes.js';
import downloadRoutes from './routes/downloadRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { ensureDirectories, cleanUploads } from './services/fileService.js';
import { scanSystemFonts } from './services/fontService.js';
import { registerTemplate } from './services/pdfService.js';
import { authMiddleware, optionalAuth } from './middleware/auth.js';
import { rateLimiter } from './middleware/rateLimit.js';

// ---- Logger ----
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(process.cwd(), 'data', 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(process.cwd(), 'data', 'combined.log') }),
  ],
});

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

// Clean stale uploads from previous runs
cleanUploads();

// Scan system fonts (Windows Fonts folder + bundled fonts)
scanSystemFonts();

// Auto-register default template if шаблон.pdf exists in template/ folder
(async () => {
  try {
    const templateDir = path.join(process.cwd(), 'template');
    const files = fs.readdirSync(templateDir).filter(f => f.startsWith('шаблон') && (f.endsWith('.pdf') || f.endsWith('.pdf')));
    if (files.length > 0) {
      const srcPath = path.join(templateDir, files[0]);
      const destDir = path.join(process.cwd(), 'uploads', 'templates');
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      const destPath = path.join(destDir, 'шаблон.pdf');
      fs.copyFileSync(srcPath, destPath);

      const { PDFDocument } = await import('pdf-lib');
      const fileBytes = fs.readFileSync(destPath);
      const pdfDoc = await PDFDocument.load(fileBytes);
      const firstPage = pdfDoc.getPage(0);
      registerTemplate(destPath, 'шаблон.pdf', 'pdf', firstPage.getWidth(), firstPage.getHeight());
      logger.info('Default template шаблон.pdf loaded');
    }
  } catch {
    // template folder or file may not exist
  }
})();

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Serve sample data statically
app.use('/sample-data', express.static(path.join(process.cwd(), '..', 'sample-data')));

// ---- Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/upload', optionalAuth, uploadRoutes);
app.use('/api/generate', authMiddleware, generateRoutes);
app.use('/api/download', authMiddleware, downloadRoutes);

// ---- Health Check ----
app.get('/api/health', (req, res) => {
  let dbConnected = false;
  try {
    const { getDb } = require('./services/db.js');
    dbConnected = !!getDb();
  } catch {}
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage().rss,
    dbConnected,
    mode: fs.existsSync(clientDistPath) ? 'production' : 'development',
  });
});

// In production, serve the built client app
const clientDistPath = path.join(process.cwd(), '..', 'client', 'dist');
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
