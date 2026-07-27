import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { asyncHandler, HttpError } from '../../middleware/errorHandler';
import { recordAudit } from '../../services/events.service';

export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole('ADMIN'));

function serialize(user: any) {
  const { passwordHash, ...rest } = user;
  return rest;
}

usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      include: { cameraAccess: { include: { camera: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(users.map(serialize));
  })
);

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'OPERATOR', 'VIEWER']),
  enabled: z.boolean().default(true),
  cameraIds: z.array(z.string().uuid()).optional(),
});

usersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        enabled: input.enabled,
        cameraAccess: input.cameraIds
          ? { create: input.cameraIds.map((cameraId) => ({ cameraId })) }
          : undefined,
      },
      include: { cameraAccess: { include: { camera: true } } },
    });
    await recordAudit({ userId: req.user!.id, action: 'USER_CREATED', details: user.email, ipAddress: req.ip });
    res.status(201).json(serialize(user));
  })
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'OPERATOR', 'VIEWER']).optional(),
  enabled: z.boolean().optional(),
  cameraIds: z.array(z.string().uuid()).optional(),
});

usersRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const input = updateSchema.parse(req.body);
    const data: any = { ...input };
    delete data.password;
    delete data.cameraIds;
    if (input.password) data.passwordHash = await bcrypt.hash(input.password, 10);

    if (input.cameraIds) {
      await prisma.userCameraAccess.deleteMany({ where: { userId: req.params.id } });
      data.cameraAccess = { create: input.cameraIds.map((cameraId) => ({ cameraId })) };
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      include: { cameraAccess: { include: { camera: true } } },
    });
    await recordAudit({ userId: req.user!.id, action: 'USER_UPDATED', details: user.email, ipAddress: req.ip });
    res.json(serialize(user));
  })
);

usersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.id) throw new HttpError(400, 'Cannot delete your own account');
    const user = await prisma.user.delete({ where: { id: req.params.id } });
    await recordAudit({ userId: req.user!.id, action: 'USER_DELETED', details: user.email, ipAddress: req.ip });
    res.json({ ok: true });
  })
);
