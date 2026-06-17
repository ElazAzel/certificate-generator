import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import { logger } from '../logger.js';

const router = Router();

/**
 * POST /api/auth/login
 * Returns JWT token if ADMIN_PASSWORD matches.
 */
router.post('/login', authRateLimiter, (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    if (!process.env.ADMIN_PASSWORD) {
      // No auth configured — return a dev token
      const token = generateToken();
      return res.json({ token, expiresIn: '24h', mode: 'no-auth' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Пароль не указан' });
    }

    const isValid = bcrypt.compareSync(password, process.env.ADMIN_PASSWORD);
    if (!isValid) {
      logger.warn('Failed login attempt');
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    const token = generateToken();
    logger.info('Successful login');
    res.json({ token, expiresIn: '24h' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Ошибка входа' });
  }
});

/**
 * GET /api/auth/status
 * Check if auth is configured and current token status.
 */
router.get('/status', (req: Request, res: Response) => {
  res.json({
    authConfigured: !!process.env.ADMIN_PASSWORD,
    mode: process.env.ADMIN_PASSWORD ? 'password' : 'open',
  });
});

export default router;
