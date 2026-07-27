import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { asyncHandler, HttpError } from '../../middleware/errorHandler';
import { requireAuth } from '../../middleware/auth';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { raiseEvent, recordAudit } from '../../services/events.service';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const REFRESH_COOKIE = 'refreshToken';

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.enabled) {
      throw new HttpError(401, 'Invalid credentials');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new HttpError(401, 'Invalid credentials');
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const accessToken = signAccessToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    const refreshToken = signRefreshToken(user.id);

    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: env.refreshTokenTtlMs,
    });

    await raiseEvent({
      type: 'USER_LOGIN',
      userId: user.id,
      severity: 'INFO',
      description: `${user.name} logged in`,
    });
    await recordAudit({ userId: user.id, action: 'USER_LOGIN', ipAddress: req.ip });

    res.json({
      accessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  })
);

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new HttpError(401, 'No refresh token');
    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new HttpError(401, 'Invalid refresh token');
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.enabled) throw new HttpError(401, 'Invalid refresh token');

    const accessToken = signAccessToken({ id: user.id, email: user.email, name: user.name, role: user.role });
    res.json({ accessToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  })
);

authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.clearCookie(REFRESH_COOKIE);
    if (req.user) {
      await raiseEvent({
        type: 'USER_LOGOUT',
        userId: req.user.id,
        severity: 'INFO',
        description: `${req.user.name} logged out`,
      });
      await recordAudit({ userId: req.user.id, action: 'USER_LOGOUT', ipAddress: req.ip });
    }
    res.json({ ok: true });
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);
