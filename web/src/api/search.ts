import { api, buildQuery } from "./client";
import type { SearchResults } from "../types";

export interface SearchParams {
  q?: string;
  date?: string;
  cameraId?: string;
  groupId?: string;
  status?: string;
  eventType?: string;
}

export function search(params: SearchParams) {
  return api.get<SearchResults>(`/search${buildQuery(params)}`);
}
