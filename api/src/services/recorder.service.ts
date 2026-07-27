import fs from 'fs';
import path from 'path';
import { ChildProcessWithoutNullStreams } from 'child_process';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { ensureDir, spawnFfmpeg, extractThumbnail } from '../utils/ffmpeg';
import { cameraRecordingDir, thumbnailDir, createRecordingRow, finalizeRecordingRow, addKeyframeRow } from '../modules/recordings/recordings.service';
import { raiseEvent } from './events.service';
import { socketEvents } from './socket.service';
import { HttpError } from '../middleware/errorHandler';

type CameraLite = { id: string; name: string; rtspUrl: string; enabled: boolean; recordingEnabled: boolean };

const continuousProcs = new Map<string, ChildProcessWithoutNullStreams>();
const intentionalStops = new Set<string>();
const registeredFiles = new Set<string>();

interface AdhocState {
  proc: ChildProcessWithoutNullStreams;
  recordingId: string;
  filePath: string;
  startTime: Date;
  stopping: boolean;
  kind: 'MANUAL' | 'EVENT';
}
const adhocRecordings = new Map<string, AdhocState>();

const FILENAME_RE = /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})\.mp4$/;

function parseSegmentTimestamp(filename: string): Date | null {
  const m = FILENAME_RE.exec(filename);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`);
}

function startContinuousProc(camera: CameraLite) {
  if (continuousProcs.has(camera.id)) return;
  const dir = cameraRecordingDir(camera.id, 'continuous');
  ensureDir(dir);
  const outPattern = path.join(dir, '%Y%m%d_%H%M%S.mp4');
  const args = [
    '-nostdin',
    '-rtsp_transport', 'tcp',
    '-i', camera.rtspUrl,
    '-c', 'copy',
    '-f', 'segment',
    '-segment_time', String(env.recordingSegmentSeconds),
    '-reset_timestamps', '1',
    '-strftime', '1',
    '-segment_format', 'mp4',
    '-segment_format_options', 'movflags=+frag_keyframe+empty_moov',
    outPattern,
  ];
  const proc = spawnFfmpeg(args);
  continuousProcs.set(camera.id, proc);

  proc.on('exit', async (code) => {
    continuousProcs.delete(camera.id);
    if (intentionalStops.has(camera.id)) {
      intentionalStops.delete(camera.id);
      return;
    }
    console.error(`Continuous ffmpeg for camera ${camera.id} exited unexpectedly (code ${code}), retrying in 5s`);
    await raiseEvent({
      type: 'RECORDING_FAILURE',
      cameraId: camera.id,
      severity: 'CRITICAL',
      description: `Continuous recording pipeline for ${camera.name} stopped unexpectedly`,
    });
    setTimeout(async () => {
      const fresh = await prisma.camera.findUnique({ where: { id: camera.id } });
      if (fresh && fresh.enabled && fresh.recordingEnabled) startContinuousProc(fresh);
    }, 5000);
  });

  raiseEvent({
    type: 'RECORDING_STARTED',
    cameraId: camera.id,
    severity: 'INFO',
    description: `Continuous recording started for ${camera.name}`,
  }).catch(() => {});
}

function stopContinuousProc(cameraId: string, cameraName: string) {
  const proc = continuousProcs.get(cameraId);
  if (!proc) return;
  intentionalStops.add(cameraId);
  proc.kill('SIGINT');
  raiseEvent({
    type: 'RECORDING_STOPPED',
    cameraId,
    severity: 'INFO',
    description: `Continuous recording stopped for ${cameraName}`,
  }).catch(() => {});
}

/** Ensures the continuous ffmpeg pipeline for a camera matches its enabled/recordingEnabled flags. */
export function syncCameraRecording(camera: CameraLite) {
  const shouldRun = camera.enabled && camera.recordingEnabled;
  const isRunning = continuousProcs.has(camera.id);
  if (shouldRun && !isRunning) startContinuousProc(camera);
  if (!shouldRun && isRunning) stopContinuousProc(camera.id, camera.name);
}

export async function initRecorder() {
  const cameras = await prisma.camera.findMany({ where: { enabled: true, recordingEnabled: true } });
  for (const camera of cameras) startContinuousProc(camera);
  setInterval(() => {
    scanAllSegments().catch((err) => console.error('Segment scan failed', err));
  }, 15000);
}

async function scanAllSegments() {
  const cameras = await prisma.camera.findMany({ where: { id: { in: [...continuousProcs.keys()] } } });
  for (const camera of cameras) {
    await scanCameraSegments(camera);
  }
}

async function scanCameraSegments(camera: { id: string; name: string }) {
  const dir = cameraRecordingDir(camera.id, 'continuous');
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter((f) => FILENAME_RE.test(f)).sort();
  if (files.length === 0) return;
  // Skip the last file: ffmpeg is likely still writing it.
  const candidates = files.slice(0, -1);
  for (const file of candidates) {
    const filePath = path.join(dir, file);
    const key = `${camera.id}:${file}`;
    if (registeredFiles.has(key)) continue;
    const startTime = parseSegmentTimestamp(file);
    if (!startTime) continue;

    const existing = await prisma.recording.findFirst({ where: { filePath } });
    if (existing) {
      registeredFiles.add(key);
      continue;
    }

    const stat = fs.statSync(filePath);
    const endTime = new Date(startTime.getTime() + env.recordingSegmentSeconds * 1000);
    const recording = await createRecordingRow({ cameraId: camera.id, type: 'CONTINUOUS', startTime, filePath });
    await finalizeRecordingRow(recording.id, { endTime, fileSizeBytes: BigInt(stat.size), status: 'COMPLETED' });

    const thumbDir = thumbnailDir(recording.id);
    ensureDir(thumbDir);
    const thumbPath = path.join(thumbDir, 'thumb_0.jpg');
    try {
      await extractThumbnail(filePath, Math.floor(env.recordingSegmentSeconds / 2), thumbPath);
      await addKeyframeRow(recording.id, Math.floor(env.recordingSegmentSeconds / 2), thumbPath);
    } catch (err) {
      console.error('Thumbnail extraction failed', err);
    }

    registeredFiles.add(key);
    socketEvents.recordingStatus({ cameraId: camera.id, recordingId: recording.id, type: 'CONTINUOUS', status: 'COMPLETED' });
  }
}

async function generateKeyframesForDuration(filePath: string, recordingId: string, durationSeconds: number) {
  const thumbDir = thumbnailDir(recordingId);
  ensureDir(thumbDir);
  const interval = env.keyframeIntervalSeconds;
  for (let offset = 0; offset < Math.max(durationSeconds, interval); offset += interval) {
    const thumbPath = path.join(thumbDir, `thumb_${offset}.jpg`);
    try {
      await extractThumbnail(filePath, offset, thumbPath);
      await addKeyframeRow(recordingId, offset, thumbPath);
    } catch (err) {
      console.error('Keyframe extraction failed', err);
      break;
    }
  }
}

async function startAdhocRecording(camera: CameraLite, kind: 'MANUAL' | 'EVENT', triggerEventId?: string) {
  if (adhocRecordings.has(camera.id)) {
    throw new HttpError(409, 'A manual or event recording is already active for this camera');
  }
  const dir = cameraRecordingDir(camera.id, kind === 'MANUAL' ? 'manual' : 'event');
  ensureDir(dir);
  const startTime = new Date();
  const filename = `${startTime.toISOString().replace(/[:.]/g, '-')}.mp4`;
  const filePath = path.join(dir, filename);

  const args = [
    '-nostdin',
    '-rtsp_transport', 'tcp',
    '-i', camera.rtspUrl,
    '-c', 'copy',
    '-f', 'mp4',
    '-movflags', '+frag_keyframe+empty_moov',
    filePath,
  ];
  const proc = spawnFfmpeg(args);
  const recording = await createRecordingRow({ cameraId: camera.id, type: kind, startTime, filePath, triggerEventId });

  const state: AdhocState = { proc, recordingId: recording.id, filePath, startTime, stopping: false, kind };
  adhocRecordings.set(camera.id, state);

  proc.on('exit', async (code) => {
    if (state.stopping) return; // handled by stopAdhocRecording
    adhocRecordings.delete(camera.id);
    console.error(`Ad-hoc ffmpeg for camera ${camera.id} exited unexpectedly (code ${code})`);
    await finalizeRecordingRow(recording.id, { endTime: new Date(), status: 'FAILED' });
    await raiseEvent({
      type: 'RECORDING_FAILURE',
      cameraId: camera.id,
      severity: 'CRITICAL',
      description: `${kind === 'MANUAL' ? 'Manual' : 'Event'} recording for ${camera.name} failed`,
    });
  });

  await raiseEvent({
    type: 'RECORDING_STARTED',
    cameraId: camera.id,
    severity: 'INFO',
    description: `${kind === 'MANUAL' ? 'Manual' : 'Event'} recording started for ${camera.name}`,
  });
  socketEvents.recordingStatus({ cameraId: camera.id, recordingId: recording.id, type: kind, status: 'RECORDING' });
  return recording;
}

async function stopAdhocRecording(cameraId: string, cameraName: string) {
  const state = adhocRecordings.get(cameraId);
  if (!state) throw new HttpError(404, 'No active recording for this camera');
  state.stopping = true;

  await new Promise<void>((resolve) => {
    state.proc.once('exit', () => resolve());
    state.proc.kill('SIGINT');
    setTimeout(() => {
      if (!state.proc.killed) state.proc.kill('SIGKILL');
      resolve();
    }, 5000);
  });

  adhocRecordings.delete(cameraId);
  const endTime = new Date();
  let fileSizeBytes: bigint | undefined;
  try {
    fileSizeBytes = BigInt(fs.statSync(state.filePath).size);
  } catch {
    fileSizeBytes = undefined;
  }
  await finalizeRecordingRow(state.recordingId, { endTime, fileSizeBytes, status: 'COMPLETED' });

  const durationSeconds = Math.max(1, Math.round((endTime.getTime() - state.startTime.getTime()) / 1000));
  await generateKeyframesForDuration(state.filePath, state.recordingId, durationSeconds);

  await raiseEvent({
    type: 'RECORDING_STOPPED',
    cameraId,
    severity: 'INFO',
    description: `${state.kind === 'MANUAL' ? 'Manual' : 'Event'} recording stopped for ${cameraName}`,
  });
  socketEvents.recordingStatus({ cameraId, recordingId: state.recordingId, type: state.kind, status: 'COMPLETED' });
  return state.recordingId;
}

export async function startManualRecording(camera: CameraLite, _userId: string) {
  return startAdhocRecording(camera, 'MANUAL');
}

export async function stopManualRecording(cameraId: string, cameraName: string) {
  return stopAdhocRecording(cameraId, cameraName);
}

export async function startEventRecording(camera: CameraLite, eventId: string, durationSeconds = 20) {
  const recording = await startAdhocRecording(camera, 'EVENT', eventId);
  setTimeout(() => {
    stopAdhocRecording(camera.id, camera.name).catch((err) => console.error('Auto-stop event recording failed', err));
  }, durationSeconds * 1000);
  return recording;
}

export function isAdhocActive(cameraId: string): 'MANUAL' | 'EVENT' | null {
  return adhocRecordings.get(cameraId)?.kind ?? null;
}

export function activeRecordingCameraIds(): string[] {
  return [...new Set([...continuousProcs.keys(), ...adhocRecordings.keys()])];
}
