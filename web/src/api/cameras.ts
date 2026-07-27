import { api, buildQuery } from "./client";
import type { Camera, CameraGroup, TestConnectionResult } from "../types";

export interface CameraListParams {
  groupId?: string;
  status?: string;
  q?: string;
}

export interface CameraInput {
  name: string;
  location: string;
  rtspUrl?: string;
  groupId?: string | null;
  resolution?: string;
  fps?: number;
  recordingEnabled?: boolean;
  eventRecordingEnabled?: boolean;
  enabled?: boolean;
}

export function listCameras(params: CameraListParams = {}) {
  return api.get<Camera[]>(`/cameras${buildQuery(params)}`);
}

export function listCameraGroups() {
  return api.get<CameraGroup[]>("/cameras/groups");
}

export function createCameraGroup(name: string) {
  return api.post<CameraGroup>("/cameras/groups", { name });
}

export function getCamera(id: string) {
  return api.get<Camera>(`/cameras/${id}`);
}

export function createCamera(input: CameraInput) {
  return api.post<Camera>("/cameras", input);
}

export function updateCamera(id: string, input: Partial<CameraInput>) {
  return api.put<Camera>(`/cameras/${id}`, input);
}

export function deleteCamera(id: string) {
  return api.delete<{ ok: true }>(`/cameras/${id}`);
}

export function setCameraEnabled(id: string, enabled: boolean) {
  return api.patch<Camera>(`/cameras/${id}/enable`, { enabled });
}

export function testCameraConnection(id: string) {
  return api.post<TestConnectionResult>(`/cameras/${id}/test-connection`);
}
