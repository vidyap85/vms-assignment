import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
