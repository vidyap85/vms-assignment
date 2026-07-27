import { api, buildQuery } from "./client";
import { refresh } from "./auth";
import { useAuthStore } from "../store/authStore";
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

async function fetchDownload(id: string, token: string | null) {
  return fetch(`/api/recordings/${id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
  });
}

export async function downloadRecording(id: string): Promise<void> {
  let res = await fetchDownload(id, useAuthStore.getState().accessToken);
  if (res.status === 401) {
    const data = await refresh();
    res = await fetchDownload(id, data.accessToken);
  }
  if (!res.ok) throw new Error("Failed to download recording.");

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] ?? `recording-${id}.mp4`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
