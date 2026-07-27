import { api, buildQuery } from "./client";
import type { Snapshot } from "../types";

export function listSnapshots(cameraId?: string) {
  return api.get<Snapshot[]>(`/snapshots${buildQuery({ cameraId })}`);
}

export function createSnapshot(cameraId: string) {
  return api.post<Snapshot>("/snapshots", { cameraId });
}

export function snapshotDownloadUrl(id: string) {
  return `/api/snapshots/${id}/download`;
}
