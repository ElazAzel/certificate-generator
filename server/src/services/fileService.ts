import * as fs from 'fs';
import * as path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const OUTPUT_DIR = path.join(process.cwd(), 'output');

/**
 * Ensure required directories exist.
 */
export function ensureDirectories(): void {
  const dirs = [
    UPLOADS_DIR,
    path.join(UPLOADS_DIR, 'excel'),
    path.join(UPLOADS_DIR, 'templates'),
    path.join(UPLOADS_DIR, 'fonts'),
    OUTPUT_DIR,
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Create an export directory with timestamp.
 */
export function createExportDir(basePath?: string): string {
  const base = basePath || OUTPUT_DIR;
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\.\d+Z$/, '');
  const dirName = `export_${timestamp}`;
  const fullPath = path.join(base, dirName);

  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }

  return fullPath;
}

/**
 * Get the uploads directory path.
 */
export function getUploadsDir(): string {
  return UPLOADS_DIR;
}

/**
 * Get the output directory path.
 */
export function getOutputDir(): string {
  return OUTPUT_DIR;
}

/**
 * Validate that a path is safe (no path traversal).
 */
export function isSafePath(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  const cwd = process.cwd();
  // Must be within the project directory
  return resolved.startsWith(cwd);
}

/**
 * Clean up old files from uploads (optional).
 */
export function cleanUploads(): void {
  const dirs = ['excel', 'templates'];
  for (const subdir of dirs) {
    const dirPath = path.join(UPLOADS_DIR, subdir);
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        try {
          fs.unlinkSync(filePath);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }
}
