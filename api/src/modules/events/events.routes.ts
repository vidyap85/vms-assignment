import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole, getCameraScope } from '../../middleware/rbac';
import { asyncHandler, HttpError } from '../../middleware/errorHandler';
import { recordAudit } from '../../services/events.service';
import { socketEvents } from '../../services/socket.service';

export const eventsRouter = Router();
eventsRouter.use(requireAuth);

eventsRouter.get(
  '/',
  requireRole('ADMIN', 'OPERATOR'),
  asyncHandler(async (req, res) => {
    const scope = await getCameraScope(req.user!);
    const { status, type, severity, cameraId, from, to } = req.query as Record<string, string | undefined>;
    const events = await prisma.event.findMany({
      where: {
        ...(scope !== null ? { OR: [{ cameraId: { in: scope } }, { cameraId: null }] } : {}),
        ...(status ? { status: status as any } : {}),
        ...(type ? { type: type as any } : {}),
        ...(severity ? { severity: severity as any } : {}),
        ...(cameraId ? { cameraId } : {}),
        ...(from || to
          ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
          : {}),
      },
      include: { camera: true, user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(events);
  })
);

eventsRouter.patch(
  '/:id/close',
  requireRole('ADMIN', 'OPERATOR'),
  asyncHandler(async (req, res) => {
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: { status: 'CLOSED' },
      include: { camera: true, user: { select: { id: true, name: true, email: true, role: true } } },
    });
    await recordAudit({ userId: req.user!.id, action: 'EVENT_CLOSED', details: event.description, ipAddress: req.ip });
    socketEvents.eventNew(event);
    res.json(event);
  })
);

eventsRouter.get(
  '/:id',
  requireRole('ADMIN', 'OPERATOR'),
  asyncHandler(async (req, res) => {
    const event = await prisma.event.findUnique({ where: { id: req.params.id }, include: { camera: true, user: { select: { id: true, name: true, email: true, role: true } } } });
    if (!event) throw new HttpError(404, 'Event not found');
    res.json(event);
  })
);
