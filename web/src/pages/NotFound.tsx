import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { landingPathForRole } from "../lib/roleLanding";

export default function NotFound() {
  const role = useAuthStore((s) => s.user?.role ?? "VIEWER");
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-3xl font-semibold text-surface-100">404</h1>
      <p className="text-sm text-surface-400">This page does not exist.</p>
      <Link to={landingPathForRole(role)} className="btn-primary">
        Back Home
      </Link>
    </div>
  );
}
