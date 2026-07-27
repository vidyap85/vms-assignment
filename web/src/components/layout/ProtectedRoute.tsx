import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import type { Role } from "../../types";
import Spinner from "../common/Spinner";

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  children: ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  if (status === "booting") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-surface-950">
        <Spinner size={28} className="text-accent" />
      </div>
    );
  }

  if (status === "unauthenticated" || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-2 text-center">
        <h1 className="text-2xl font-semibold text-surface-100">403 — Access Restricted</h1>
        <p className="max-w-md text-sm text-surface-400">
          Your role ({user.role}) does not have permission to view this page. Contact an administrator if you
          believe this is a mistake.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
