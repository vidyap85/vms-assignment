import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { NAV_ITEMS } from "./navConfig";
import ToastContainer from "../common/ToastContainer";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to))?.label ?? "VMS";

  return (
    <div className="flex min-h-screen bg-surface-950">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
        <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} title={title} />
        <main className="flex-1 overflow-x-hidden p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
