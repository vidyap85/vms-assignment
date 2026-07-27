import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { requireAuth } from '../../middleware/auth';
import { canAccessCamera, getCameraScope } from '../../middleware/rbac';
import { asyncHandler, HttpError } from '../../middleware/errorHandler';
import { ensureDir } from '../../utils/ffmpeg';
import { spawn } from 'child_process';

export const snapshotsRouter = Router();
snapshotsRouter.use(requireAuth);

const snapshotSchema = z.object({ cameraId: z.string().uuid() });

snapshotsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { cameraId } = snapshotSchema.parse(req.body);
    if (!(await canAccessCamera(req.user!, cameraId))) throw new HttpError(403, 'No access to this camera');
    const camera = await prisma.camera.findUnique({ where: { id: cameraId } });
    if (!camera) throw new HttpError(404, 'Camera not found');

    const dir = path.join(env.mediaRoot, 'snapshots', cameraId);
    ensureDir(dir);
    const filePath = path.join(dir, `${Date.now()}_${randomUUID().slice(0, 6)}.jpg`);

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('ffmpeg', [
        '-y',
        '-rtsp_transport', 'tcp',
        '-i', camera.rtspUrl,
        '-frames:v', '1',
        '-q:v', '3',
        filePath,
      ]);
      let stderr = '';
      proc.stderr.on('data', (d) => (stderr += d.toString()));
      proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(stderr.slice(-300)))));
      proc.on('error', reject);
    });

    const snapshot = await prisma.snapshot.create({
      data: { cameraId, userId: req.user!.id, filePath },
    });
    res.status(201).json(snapshot);
  })
);

snapshotsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const scope = await getCameraScope(req.user!);
    const { cameraId } = req.query as Record<string, string | undefined>;
    const snapshots = await prisma.snapshot.findMany({
      where: {
        ...(scope !== null ? { cameraId: { in: scope } } : {}),
        ...(cameraId ? { cameraId } : {}),
      },
      include: { camera: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(snapshots);
  })
);

snapshotsRouter.get(
  '/:id/download',
  asyncHandler(async (req, res) => {
    const snapshot = await prisma.snapshot.findUnique({ where: { id: req.params.id } });
    if (!snapshot) throw new HttpError(404, 'Snapshot not found');
    if (!(await canAccessCamera(req.user!, snapshot.cameraId))) throw new HttpError(403, 'No access');
    if (!fs.existsSync(snapshot.filePath)) throw new HttpError(404, 'File not available');
    res.download(snapshot.filePath);
  })
);
