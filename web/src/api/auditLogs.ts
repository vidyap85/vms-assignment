import { api, buildQuery } from "./client";
import type { AuditLog } from "../types";

export interface AuditLogParams {
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
}

export function listAuditLogs(params: AuditLogParams = {}) {
  return api.get<AuditLog[]>(`/audit-logs${buildQuery(params)}`);
}
