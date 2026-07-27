import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { logout as apiLogout } from "../../api/auth";
import { pushToast } from "../../store/toastStore";
import { LogoutIcon, MenuIcon } from "../common/Icons";
import { RoleBadge } from "../common/Badge";

interface TopbarProps {
  onToggleSidebar: () => void;
  title?: string;
}

export default function Topbar({ onToggleSidebar, title }: TopbarProps) {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await apiLogout();
    } catch {
      // ignore network errors on logout — clear local session regardless
    }
    clearSession();
    pushToast("Signed out", "info");
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-surface-800 bg-surface-900/95 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-md p-1.5 text-surface-300 hover:bg-surface-800 lg:hidden"
          aria-label="Toggle navigation"
        >
          <MenuIcon />
        </button>
        <h1 className="text-sm font-semibold text-surface-100">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <div className="hidden flex-col items-end leading-tight sm:flex">
            <span className="text-sm font-medium text-surface-100">{user.name}</span>
            <span className="text-xs text-surface-500">{user.email}</span>
          </div>
        )}
        {user && <RoleBadge role={user.role} />}
        <button onClick={handleLogout} className="btn-ghost" title="Log out">
          <LogoutIcon />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
