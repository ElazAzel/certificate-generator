import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { getUploadsDir } from '../services/fileService.js';

const ALLOWED_EXCEL = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
const ALLOWED_IMAGES = ['image/png', 'image/jpeg'];
const ALLOWED_FONTS = ['font/ttf', 'font/otf', 'application/x-font-ttf', 'application/x-font-opentype', 'application/octet-stream'];

function mimeFilter(excelOnly = false) {
  return (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (file.fieldname === 'excel') {
      if (ext !== '.xlsx' && ext !== '.xls') {
        cb(new Error('Excel файлы должны иметь расширение .xlsx или .xls'));
        return;
      }
    } else if (file.fieldname === 'template') {
      if (ext !== '.pdf' && ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
        cb(new Error('Шаблон должен быть PDF, PNG или JPG/JPEG'));
        return;
      }
    } else if (file.fieldname === 'font') {
      if (ext !== '.ttf' && ext !== '.otf') {
        cb(new Error('Шрифты должны быть TTF или OTF'));
        return;
      }
    }
    cb(null, true);
  };
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'misc';
    if (file.fieldname === 'excel') folder = 'excel';
    else if (file.fieldname === 'template') folder = 'templates';
    else if (file.fieldname === 'font') folder = 'fonts';

    const dest = path.join(getUploadsDir(), folder);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: mimeFilter(),
});
