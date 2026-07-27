import path from 'path';
import { RecordingType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';

export function cameraRecordingDir(cameraId: string, sub: 'continuous' | 'manual' | 'event' = 'continuous') {
  return path.join(env.mediaRoot, 'recordings', sub, cameraId);
}

export function thumbnailDir(recordingId: string) {
  return path.join(env.mediaRoot, 'thumbnails', recordingId);
}

export async function createRecordingRow(input: {
  cameraId: string;
  type: RecordingType;
  startTime: Date;
  filePath: string;
  triggerEventId?: string;
}) {
  return prisma.recording.create({
    data: {
      cameraId: input.cameraId,
      type: input.type,
      startTime: input.startTime,
      filePath: input.filePath,
      status: 'RECORDING',
      triggerEventId: input.triggerEventId,
    },
  });
}

export async function finalizeRecordingRow(
  id: string,
  data: { endTime: Date; fileSizeBytes?: bigint; status: 'COMPLETED' | 'FAILED' }
) {
  return prisma.recording.update({
    where: { id },
    data,
  });
}

export async function addKeyframeRow(recordingId: string, offsetSeconds: number, thumbnailPath: string) {
  return prisma.keyframe.create({
    data: { recordingId, offsetSeconds, thumbnailPath },
  });
}
