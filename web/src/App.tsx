import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { refresh } from "./api/auth";
import { landingPathForRole } from "./lib/roleLanding";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/layout/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Cameras from "./pages/Cameras";
import LiveView from "./pages/LiveView";
import Snapshots from "./pages/Snapshots";
import Playback from "./pages/Playback";
import CommandCenter from "./pages/CommandCenter";
import Events from "./pages/Events";
import Search from "./pages/Search";
import Users from "./pages/Users";
import AuditLogs from "./pages/AuditLogs";
import NotFound from "./pages/NotFound";

export default function App() {
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await refresh();
        if (!cancelled) setSession(data.accessToken, data.user);
      } catch {
        if (!cancelled) clearSession();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          status === "authenticated" && user ? (
            <Navigate to={landingPathForRole(user.role)} replace />
          ) : (
            <Login />
          )
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cameras"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "OPERATOR"]}>
              <Cameras />
            </ProtectedRoute>
          }
        />
        <Route path="/live" element={<LiveView />} />
        <Route path="/snapshots" element={<Snapshots />} />
        <Route
          path="/playback"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "OPERATOR"]}>
              <Playback />
            </ProtectedRoute>
          }
        />
        <Route
          path="/command-center"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "OPERATOR"]}>
              <CommandCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "OPERATOR"]}>
              <Events />
            </ProtectedRoute>
          }
        />
        <Route path="/search" element={<Search />} />
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to={landingPathForRole(user?.role ?? "VIEWER")} replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
