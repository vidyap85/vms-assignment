import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import { activeRecordingCameraIds } from '../../services/recorder.service';
import { getStorageUsageBytes, STORAGE_CAPACITY_BYTES, getUptimeSeconds } from '../../services/storage.service';
import { getConnectedClientCount } from '../../services/socket.service';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

export async function buildDashboardStats() {
  const [totalCameras, onlineCameras, recentEvents, cameras, totalUsers] = await Promise.all([
    prisma.camera.count(),
    prisma.camera.count({ where: { status: 'ONLINE' } }),
    prisma.event.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { camera: true } }),
    prisma.camera.findMany({ select: { id: true, name: true, status: true, lastHeartbeat: true } }),
    prisma.user.count({ where: { enabled: true } }),
  ]);

  const storageUsedBytes = getStorageUsageBytes();

  return {
    totalCameras,
    onlineCameras,
    offlineCameras: totalCameras - onlineCameras,
    activeLiveStreams: onlineCameras,
    activeRecordings: activeRecordingCameraIds().length,
    storageUsedBytes,
    storageCapacityBytes: STORAGE_CAPACITY_BYTES,
    storageUsedPercent: Math.min(100, Math.round((storageUsedBytes / STORAGE_CAPACITY_BYTES) * 100)),
    recentEvents,
    cameraHealth: cameras,
    systemUptimeSeconds: getUptimeSeconds(),
    totalUsers,
    connectedClients: getConnectedClientCount(),
  };
}

dashboardRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    res.json(await buildDashboardStats());
  })
);
