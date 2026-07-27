import { api } from "./client";
import type { DashboardStats } from "../types";

export function getDashboardStats() {
  return api.get<DashboardStats>("/dashboard/stats");
}
