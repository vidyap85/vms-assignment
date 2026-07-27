import { spawn } from 'child_process';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { socketEvents } from './socket.service';
import { raiseEvent } from './events.service';

const PROBE_TIMEOUT_MS = 4000;

/**
 * Probes an RTSP URL directly with ffprobe to see if it's currently reachable and streaming.
 * Works uniformly for the built-in simulated cameras (rtsp://mediamtx:...) and any real
 * IP camera's RTSP URL a user enters — unlike querying MediaMTX's path registry, which only
 * knows about streams actually being published into it.
 */
export function probeRtspOnline(rtspUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const proc = spawn('ffprobe', [
      '-v', 'error',
      '-rtsp_transport', 'tcp',
      '-show_entries', 'stream=codec_type',
      '-of', 'csv=p=0',
      rtspUrl,
    ]);

    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      finish(false);
    }, PROBE_TIMEOUT_MS);

    proc.on('exit', (code) => finish(code === 0));
    proc.on('error', () => finish(false));
  });
}

/** Polls every enabled camera's RTSP URL directly and updates online/offline status, raising events on transitions. */
export function startHeartbeatJob() {
  const tick = async () => {
    const cameras = await prisma.camera.findMany({ where: { enabled: true } });
    for (const camera of cameras) {
      const online = await probeRtspOnline(camera.rtspUrl);
      const newStatus = online ? 'ONLINE' : 'OFFLINE';
      if (newStatus !== camera.status) {
        const updated = await prisma.camera.update({
          where: { id: camera.id },
          data: { status: newStatus, lastHeartbeat: new Date() },
        });
        socketEvents.cameraStatus(updated);
        await raiseEvent({
          type: online ? 'CAMERA_RECONNECTED' : 'CAMERA_OFFLINE',
          cameraId: camera.id,
          severity: online ? 'INFO' : 'WARNING',
          description: `${camera.name} is now ${newStatus.toLowerCase()}`,
        });
      } else if (online) {
        await prisma.camera.update({ where: { id: camera.id }, data: { lastHeartbeat: new Date() } });
      }
    }
  };
  tick().catch((err) => console.error('Heartbeat tick failed', err));
  return setInterval(() => {
    tick().catch((err) => console.error('Heartbeat tick failed', err));
  }, env.heartbeatIntervalMs);
}
