import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';

export const auditRouter = Router();
auditRouter.use(requireAuth, requireRole('ADMIN'));

auditRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { userId, action, from, to } = req.query as Record<string, string | undefined>;
    const logs = await prisma.auditLog.findMany({
      where: {
        ...(userId ? { userId } : {}),
        ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}),
        ...(from || to
          ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
          : {}),
      },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(logs);
  })
);
