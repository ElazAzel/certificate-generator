import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import uploadRoutes from './routes/uploadRoutes.js';
import generateRoutes from './routes/generateRoutes.js';
import downloadRoutes from './routes/downloadRoutes.js';
import { ensureDirectories, cleanUploads } from './services/fileService.js';
import { scanSystemFonts } from './services/fontService.js';
import { registerTemplate } from './services/pdfService.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

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
      console.log('Default template шаблон.pdf loaded');
    }
  } catch {
    // template folder or file may not exist — fine
  }
})();

// Serve uploaded files statically (needed for template background images)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Serve sample data statically (for downloading template Excel file)
app.use('/sample-data', express.static(path.join(process.cwd(), '..', 'sample-data')));

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/download', downloadRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running locally' });
});

// In production, serve the built client app
const clientDistPath = path.join(process.cwd(), '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // SPA fallback — serve index.html for any non-API route
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/sample-data')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
  console.log(`Serving built client from ${clientDistPath}`);
}

// Start Server
app.listen(PORT, () => {
  const mode = fs.existsSync(clientDistPath) ? 'production (standalone)' : 'development';
  console.log(`Server started in ${mode} mode on http://localhost:${PORT}`);
});
