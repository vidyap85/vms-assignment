import type { Role } from "../types";

export function landingPathForRole(role: Role): string {
  return role === "ADMIN" ? "/dashboard" : "/live";
}
