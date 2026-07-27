import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { raiseEvent } from './events.service';
import { startEventRecording, isAdhocActive } from './recorder.service';

/**
 * There is no real computer-vision motion detection in this demo (no physical cameras).
 * This job simulates motion events at a configurable random probability per online camera,
 * which is sufficient to exercise the Events pipeline, event-based recording, and the
 * Command Center's live alert feed end-to-end.
 */
export function startMotionSimJob() {
  return setInterval(async () => {
    const cameras = await prisma.camera.findMany({ where: { enabled: true, status: 'ONLINE' } });
    for (const camera of cameras) {
      if (Math.random() >= env.motionProbability) continue;
      const event = await raiseEvent({
        type: 'MOTION_DETECTED',
        cameraId: camera.id,
        severity: 'WARNING',
        description: `Motion detected at ${camera.name}`,
      });
      if (camera.eventRecordingEnabled && !isAdhocActive(camera.id)) {
        try {
          await startEventRecording(camera, event.id);
        } catch (err) {
          console.error('Failed to start event recording', err);
        }
      }
    }
  }, env.motionCheckIntervalMs);
}
