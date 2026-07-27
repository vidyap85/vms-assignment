import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/** Returns the list of camera IDs a VIEWER may access; null means "no restriction" (admin/operator). */
export async function getCameraScope(user: { id: string; role: Role }): Promise<string[] | null> {
  if (user.role !== 'VIEWER') return null;
  const access = await prisma.userCameraAccess.findMany({
    where: { userId: user.id },
    select: { cameraId: true },
  });
  return access.map((a) => a.cameraId);
}

/** Throws-free check usable inline in a controller; returns true if access is allowed. */
export async function canAccessCamera(user: { id: string; role: Role }, cameraId: string): Promise<boolean> {
  const scope = await getCameraScope(user);
  if (scope === null) return true;
  return scope.includes(cameraId);
}
