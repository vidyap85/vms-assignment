import { api } from "./client";
import type { AuthUser } from "../types";

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export function login(email: string, password: string) {
  return api.post<LoginResponse>("/auth/login", { email, password }, { skipAuthRetry: true });
}

export function refresh() {
  return api.post<LoginResponse>("/auth/refresh", undefined, { skipAuthRetry: true });
}

export function logout() {
  return api.post<{ ok: true } | void>("/auth/logout");
}

export function me() {
  return api.get<{ user: AuthUser }>("/auth/me");
}
