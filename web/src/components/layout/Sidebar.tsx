import { NavLink } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { NAV_ITEMS } from "./navConfig";

interface SidebarProps {
  open: boolean;
  onNavigate?: () => void;
}

export default function Sidebar({ open, onNavigate }: SidebarProps) {
  const role = useAuthStore((s) => s.user?.role);
  const items = NAV_ITEMS.filter((item) => !role || item.roles.includes(role));

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-surface-800 bg-surface-900 transition-transform duration-200 lg:static lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-14 items-center gap-2 border-b border-surface-800 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-bold text-surface-950">
          V
        </div>
        <span className="text-sm font-semibold tracking-wide text-surface-50">VMS Console</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent/15 text-accent-soft"
                  : "text-surface-300 hover:bg-surface-800 hover:text-surface-50"
              }`
            }
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-surface-800 px-4 py-3 text-[11px] text-surface-500">
        Video Management System
        <br />
        Operations Console v1.0
      </div>
    </aside>
  );
}
