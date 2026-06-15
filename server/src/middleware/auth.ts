import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../index.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || 'default-dev-secret-change-me';

export interface AuthRequest extends Request {
  user?: { role: string };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  // If no ADMIN_PASSWORD set, skip auth (single-user offline mode)
  if (!process.env.ADMIN_PASSWORD) {
    req.user = { role: 'admin' };
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Требуется авторизация. Укажите Bearer токен.' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Недействительный или просроченный токен' });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!process.env.ADMIN_PASSWORD) {
    req.user = { role: 'admin' };
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    req.user = decoded;
  } catch {}
  next();
}

export function generateToken(): string {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
}
