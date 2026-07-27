import { Router } from 'express';
import fs from 'fs';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { requireAuth } from '../../middleware/auth';
import { requireRole, canAccessCamera, getCameraScope } from '../../middleware/rbac';
import { asyncHandler, HttpError } from '../../middleware/errorHandler';
import { startManualRecording, stopManualRecording, isAdhocActive } from '../../services/recorder.service';
import { recordAudit } from '../../services/events.service';

export const recordingsRouter = Router();
recordingsRouter.use(requireAuth);

function serialize(recording: any) {
  return { ...recording, fileSizeBytes: recording.fileSizeBytes != null ? recording.fileSizeBytes.toString() : null };
}

async function safeUnlink(filePath: string) {
  try {
    await fs.promises.unlink(filePath);
  } catch (err: any) {
    if (err.code !== 'ENOENT') console.error(`Failed to delete file ${filePath}:`, err);
  }
}

recordingsRouter.get(
  '/',
  requireRole('ADMIN', 'OPERATOR'),
  asyncHandler(async (req, res) => {
    const scope = await getCameraScope(req.user!);
    const { cameraId, from, to, type } = req.query as Record<string, string | undefined>;
    if (cameraId && !(await canAccessCamera(req.user!, cameraId))) {
      throw new HttpError(403, 'No access to this camera');
    }
    const recordings = await prisma.recording.findMany({
      where: {
        ...(scope !== null ? { cameraId: { in: scope } } : {}),
        ...(cameraId ? { cameraId } : {}),
        ...(type ? { type: type as any } : {}),
        ...(from || to
          ? {
              startTime: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: { camera: true },
      orderBy: { startTime: 'desc' },
      take: 200,
    });
    res.json(recordings.map(serialize));
  })
);

recordingsRouter.get(
  '/:id',
  requireRole('ADMIN', 'OPERATOR'),
  asyncHandler(async (req, res) => {
    const recording = await prisma.recording.findUnique({
      where: { id: req.params.id },
      include: { camera: true, keyframes: { orderBy: { offsetSeconds: 'asc' } } },
    });
    if (!recording) throw new HttpError(404, 'Recording not found');
    if (!(await canAccessCamera(req.user!, recording.cameraId))) throw new HttpError(403, 'No access');
    res.json(serialize(recording));
  })
);

recordingsRouter.get(
  '/:id/download',
  requireRole('ADMIN', 'OPERATOR'),
  asyncHandler(async (req, res) => {
    const recording = await prisma.recording.findUnique({ where: { id: req.params.id } });
    if (!recording) throw new HttpError(404, 'Recording not found');
    if (!(await canAccessCamera(req.user!, recording.cameraId))) throw new HttpError(403, 'No access');
    if (!fs.existsSync(recording.filePath)) throw new HttpError(404, 'File not available');
    res.download(recording.filePath);
  })
);

recordingsRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const recording = await prisma.recording.findUnique({
      where: { id: req.params.id },
      include: { keyframes: true, camera: true },
    });
    if (!recording) throw new HttpError(404, 'Recording not found');
    if (recording.status === 'RECORDING') {
      throw new HttpError(400, 'Cannot delete a recording that is still in progress');
    }

    await Promise.all([
      safeUnlink(recording.filePath),
      ...recording.keyframes.map((kf) => safeUnlink(kf.thumbnailPath)),
    ]);
    await prisma.recording.delete({ where: { id: recording.id } });

    await recordAudit({
      userId: req.user!.id,
      action: 'RECORDING_DELETED',
      details: `${recording.camera?.name ?? recording.cameraId} · ${recording.type} · ${recording.startTime.toISOString()}`,
      ipAddress: req.ip,
    });
    res.json({ ok: true });
  })
);

const manualSchema = z.object({ cameraId: z.string().uuid() });

recordingsRouter.post(
  '/manual/start',
  requireRole('ADMIN', 'OPERATOR'),
  asyncHandler(async (req, res) => {
    const { cameraId } = manualSchema.parse(req.body);
    const camera = await prisma.camera.findUnique({ where: { id: cameraId } });
    if (!camera) throw new HttpError(404, 'Camera not found');
    if (!camera.enabled) throw new HttpError(400, 'Camera is disabled');
    const recording = await startManualRecording(camera, req.user!.id);
    await recordAudit({ userId: req.user!.id, action: 'MANUAL_RECORDING_STARTED', details: camera.name, ipAddress: req.ip });
    res.status(201).json(serialize(recording));
  })
);

recordingsRouter.post(
  '/manual/stop',
  requireRole('ADMIN', 'OPERATOR'),
  asyncHandler(async (req, res) => {
    const { cameraId } = manualSchema.parse(req.body);
    const camera = await prisma.camera.findUnique({ where: { id: cameraId } });
    if (!camera) throw new HttpError(404, 'Camera not found');
    const recordingId = await stopManualRecording(camera.id, camera.name);
    await recordAudit({ userId: req.user!.id, action: 'MANUAL_RECORDING_STOPPED', details: camera.name, ipAddress: req.ip });
    res.json({ recordingId });
  })
);

recordingsRouter.get(
  '/status/:cameraId',
  asyncHandler(async (req, res) => {
    res.json({ activeType: isAdhocActive(req.params.cameraId) });
  })
);
