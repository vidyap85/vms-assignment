import { create } from "zustand";
import type { AuthUser } from "../types";

export type AuthStatus = "booting" | "authenticated" | "unauthenticated";

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  setSession: (accessToken: string, user: AuthUser) => void;
  clearSession: () => void;
  setBooting: (booting: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: "booting",
  setSession: (accessToken, user) => set({ accessToken, user, status: "authenticated" }),
  clearSession: () => set({ accessToken: null, user: null, status: "unauthenticated" }),
  setBooting: (booting) => set((s) => ({ status: booting ? "booting" : s.status })),
}));
