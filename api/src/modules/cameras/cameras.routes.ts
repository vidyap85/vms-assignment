import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole, getCameraScope, canAccessCamera } from '../../middleware/rbac';
import { asyncHandler, HttpError } from '../../middleware/errorHandler';
import { recordAudit } from '../../services/events.service';
import { probeRtspOnline } from '../../services/mediamtx.service';
import { syncCameraRecording } from '../../services/recorder.service';
import { hlsPathFor, rtspUrlFor } from './cameras.service';

export const camerasRouter = Router();
camerasRouter.use(requireAuth);

function serialize(camera: any) {
  return {
    ...camera,
    hlsUrl: hlsPathFor(camera.streamKey),
  };
}

camerasRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const scope = await getCameraScope(req.user!);
    const { groupId, status, q } = req.query as Record<string, string | undefined>;
    const cameras = await prisma.camera.findMany({
      where: {
        ...(scope !== null ? { id: { in: scope } } : {}),
        ...(groupId ? { groupId } : {}),
        ...(status ? { status: status as any } : {}),
        ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { location: { contains: q, mode: 'insensitive' } }] } : {}),
      },
      include: { group: true },
      orderBy: { name: 'asc' },
    });
    res.json(cameras.map(serialize));
  })
);

camerasRouter.get(
  '/groups',
  asyncHandler(async (_req, res) => {
    const groups = await prisma.cameraGroup.findMany({ orderBy: { name: 'asc' } });
    res.json(groups);
  })
);

camerasRouter.post(
  '/groups',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
    const group = await prisma.cameraGroup.create({ data: { name } });
    res.status(201).json(group);
  })
);

camerasRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!(await canAccessCamera(req.user!, req.params.id))) {
      throw new HttpError(403, 'No access to this camera');
    }
    const camera = await prisma.camera.findUnique({ where: { id: req.params.id }, include: { group: true } });
    if (!camera) throw new HttpError(404, 'Camera not found');
    res.json(serialize(camera));
  })
);

const cameraInputSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  rtspUrl: z.string().optional(),
  groupId: z.string().uuid().nullable().optional(),
  resolution: z.string().default('1280x720'),
  fps: z.number().int().positive().default(25),
  recordingEnabled: z.boolean().default(true),
  eventRecordingEnabled: z.boolean().default(true),
  enabled: z.boolean().default(true),
});

camerasRouter.post(
  '/',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const input = cameraInputSchema.parse(req.body);
    const streamKey = `cam-${randomUUID().slice(0, 8)}`;
    const camera = await prisma.camera.create({
      data: {
        ...input,
        streamKey,
        rtspUrl: input.rtspUrl || rtspUrlFor(streamKey),
      },
      include: { group: true },
    });
    await recordAudit({ userId: req.user!.id, action: 'CAMERA_CREATED', details: camera.name, ipAddress: req.ip });
    res.status(201).json(serialize(camera));
  })
);

camerasRouter.put(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const input = cameraInputSchema.partial().parse(req.body);
    const camera = await prisma.camera.update({ where: { id: req.params.id }, data: input, include: { group: true } });
    await recordAudit({ userId: req.user!.id, action: 'CAMERA_UPDATED', details: camera.name, ipAddress: req.ip });
    syncCameraRecording(camera);
    res.json(serialize(camera));
  })
);

camerasRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const camera = await prisma.camera.delete({ where: { id: req.params.id } });
    await recordAudit({ userId: req.user!.id, action: 'CAMERA_DELETED', details: camera.name, ipAddress: req.ip });
    res.json({ ok: true });
  })
);

camerasRouter.patch(
  '/:id/enable',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
    const camera = await prisma.camera.update({ where: { id: req.params.id }, data: { enabled }, include: { group: true } });
    await recordAudit({
      userId: req.user!.id,
      action: enabled ? 'CAMERA_ENABLED' : 'CAMERA_DISABLED',
      details: camera.name,
      ipAddress: req.ip,
    });
    syncCameraRecording(camera);
    res.json(serialize(camera));
  })
);

camerasRouter.post(
  '/:id/test-connection',
  requireRole('ADMIN', 'OPERATOR'),
  asyncHandler(async (req, res) => {
    const camera = await prisma.camera.findUnique({ where: { id: req.params.id } });
    if (!camera) throw new HttpError(404, 'Camera not found');
    const online = await probeRtspOnline(camera.rtspUrl);
    res.json({ online });
  })
);
