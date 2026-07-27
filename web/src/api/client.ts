import { useAuthStore } from "../store/authStore";
import type { AuthUser } from "../types";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  skipAuthRetry?: boolean;
}

let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { accessToken: string; user: AuthUser };
        useAuthStore.getState().setSession(data.accessToken, data.user);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

async function parseBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  return null;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuthRetry, headers, ...rest } = options;
  const token = useAuthStore.getState().accessToken;

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string> | undefined),
  };
  if (body !== undefined) finalHeaders["Content-Type"] = "application/json";
  if (token) finalHeaders["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    ...rest,
    credentials: "include",
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !skipAuthRetry) {
    const refreshed = await doRefresh();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, skipAuthRetry: true });
    }
    useAuthStore.getState().clearSession();
    const errBody = await parseBody(res);
    throw new ApiError(401, "Session expired", errBody);
  }

  if (!res.ok) {
    const errBody = await parseBody(res);
    const message =
      (errBody && typeof errBody === "object" && "message" in errBody
        ? String((errBody as { message?: unknown }).message)
        : null) ?? `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, errBody);
  }

  if (res.status === 204) return undefined as T;
  return parseBody(res) as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) => apiRequest<T>(path, { ...options, method: "DELETE" }),
};

export function buildQuery(params: Record<string, any>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
