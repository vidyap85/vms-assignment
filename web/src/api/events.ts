import { api, buildQuery } from "./client";
import type { VmsEvent } from "../types";

export interface EventListParams {
  status?: string;
  type?: string;
  severity?: string;
  cameraId?: string;
  from?: string;
  to?: string;
}

export function listEvents(params: EventListParams = {}) {
  return api.get<VmsEvent[]>(`/events${buildQuery(params)}`);
}

export function getEvent(id: string) {
  return api.get<VmsEvent>(`/events/${id}`);
}

export function closeEvent(id: string) {
  return api.patch<VmsEvent>(`/events/${id}/close`);
}
