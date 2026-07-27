import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';

export interface AccessTokenPayload {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.accessTokenTtl as jwt.SignOptions['expiresIn'] });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtRefreshSecret, { expiresIn: env.refreshTokenTtl as jwt.SignOptions['expiresIn'] });
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, env.jwtRefreshSecret) as { sub: string };
}
