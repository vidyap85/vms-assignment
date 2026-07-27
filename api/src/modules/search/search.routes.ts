import { Router } from 'express';
import { CameraStatus, EventStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { requireAuth } from '../../middleware/auth';
import { getCameraScope } from '../../middleware/rbac';
import { asyncHandler } from '../../middleware/errorHandler';

function asCameraStatus(value: string | undefined): CameraStatus | undefined {
  return value === 'ONLINE' || value === 'OFFLINE' ? (value as CameraStatus) : undefined;
}

function asEventStatus(value: string | undefined): EventStatus | undefined {
  return value === 'OPEN' || value === 'CLOSED' ? (value as EventStatus) : undefined;
}

export const searchRouter = Router();
searchRouter.use(requireAuth);

searchRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, date, cameraId, groupId, status, eventType } = req.query as Record<string, string | undefined>;
    const scope = await getCameraScope(req.user!);
    const dateRange = date
      ? { gte: new Date(`${date}T00:00:00`), lte: new Date(`${date}T23:59:59`) }
      : undefined;

    // "status" is shared by the Search UI's single Status filter but means different things
    // for different entity types (camera ONLINE/OFFLINE vs event OPEN/CLOSED) — only apply it
    // to the query where it's a valid enum value, otherwise Prisma throws on the mismatched one.
    const cameraStatus = asCameraStatus(status);
    const eventStatus = asEventStatus(status);

    const cameraWhere = {
      ...(scope !== null ? { id: { in: scope } } : {}),
      ...(cameraId ? { id: cameraId } : {}),
      ...(groupId ? { groupId } : {}),
      ...(cameraStatus ? { status: cameraStatus } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { location: { contains: q, mode: 'insensitive' as const } }] } : {}),
    };

    const [cameras, recordings, events, users] = await Promise.all([
      prisma.camera.findMany({ where: cameraWhere, include: { group: true }, take: 50 }),
      prisma.recording.findMany({
        where: {
          ...(scope !== null ? { cameraId: { in: scope } } : {}),
          ...(cameraId ? { cameraId } : {}),
          ...(dateRange ? { startTime: dateRange } : {}),
        },
        include: { camera: true },
        orderBy: { startTime: 'desc' },
        take: 50,
      }),
      prisma.event.findMany({
        where: {
          ...(scope !== null ? { OR: [{ cameraId: { in: scope } }, { cameraId: null }] } : {}),
          ...(cameraId ? { cameraId } : {}),
          ...(eventStatus ? { status: eventStatus } : {}),
          ...(eventType ? { type: eventType as any } : {}),
          ...(dateRange ? { createdAt: dateRange } : {}),
          ...(q ? { description: { contains: q, mode: 'insensitive' as const } } : {}),
        },
        include: { camera: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      req.user!.role === 'ADMIN' && q
        ? prisma.user.findMany({
            where: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] },
            take: 50,
          })
        : Promise.resolve([]),
    ]);

    res.json({
      cameras,
      recordings: recordings.map((r) => ({ ...r, fileSizeBytes: r.fileSizeBytes != null ? r.fileSizeBytes.toString() : null })),
      events,
      users: users.map((u: any) => { const { passwordHash, ...rest } = u; return rest; }),
    });
  })
);
