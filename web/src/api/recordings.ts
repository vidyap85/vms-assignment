import { api, buildQuery } from "./client";
import type { Recording, RecordingActiveStatus } from "../types";

export interface RecordingListParams {
  cameraId?: string;
  type?: string;
  from?: string;
  to?: string;
}

export function listRecordings(params: RecordingListParams = {}) {
  return api.get<Recording[]>(`/recordings${buildQuery(params)}`);
}

export function getRecording(id: string) {
  return api.get<Recording>(`/recordings/${id}`);
}

export function recordingDownloadUrl(id: string) {
  return `/api/recordings/${id}/download`;
}

export function deleteRecording(id: string) {
  return api.delete<{ ok: true }>(`/recordings/${id}`);
}

export function startManualRecording(cameraId: string) {
  return api.post<Recording>("/recordings/manual/start", { cameraId });
}

export function stopManualRecording(cameraId: string) {
  return api.post<{ recordingId: string }>("/recordings/manual/stop", { cameraId });
}

export function getRecordingStatus(cameraId: string) {
  return api.get<RecordingActiveStatus>(`/recordings/status/${cameraId}`);
}
