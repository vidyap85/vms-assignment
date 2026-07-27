import { useEffect, useState } from "react";
import { getDashboardStats } from "../api/dashboard";
import { useSocketEvent } from "../hooks/useSocketEvent";
import type { DashboardStats } from "../types";
import StatCard from "../components/common/StatCard";
import StorageGauge from "../components/common/StorageGauge";
import CameraStatusBar from "../components/common/CameraStatusBar";
import { SeverityBadge, StatusBadge } from "../components/common/Badge";
import Spinner from "../components/common/Spinner";
import { formatDateTime, formatRelativeTime, formatUptime } from "../lib/format";
import {
  CameraIcon,
  DashboardIcon,
  EventsIcon,
  LiveIcon,
} from "../components/common/Icons";

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDashboardStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load dashboard stats.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useSocketEvent<DashboardStats>("dashboard:stats", (data) => {
    setStats(data);
    setError(null);
  });

  if (!stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        {error ? <p className="text-sm text-danger-soft">{error}</p> : <Spinner size={24} className="text-accent" />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Total Cameras" value={stats.totalCameras} icon={<CameraIcon />} />
        <StatCard
          label="Online / Offline"
          value={`${stats.onlineCameras} / ${stats.offlineCameras}`}
          icon={<DashboardIcon />}
          accentClass="text-ok"
        />
        <StatCard label="Active Live Streams" value={stats.activeLiveStreams} icon={<LiveIcon />} />
        <StatCard
          label="Active Recordings"
          value={stats.activeRecordings}
          icon={<EventsIcon />}
          accentClass="text-danger"
        />
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Connected Clients" value={stats.connectedClients} />
        <StatCard label="System Uptime" value={formatUptime(stats.systemUptimeSeconds)} />
        <StatCard
          label="Storage Used"
          value={`${stats.storageUsedPercent.toFixed(0)}%`}
          sub="of total capacity"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-surface-200">Storage Usage</h2>
          <StorageGauge
            usedPercent={stats.storageUsedPercent}
            usedBytes={stats.storageUsedBytes}
            capacityBytes={stats.storageCapacityBytes}
          />
        </div>
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-surface-200">Camera Status</h2>
          <CameraStatusBar online={stats.onlineCameras} offline={stats.offlineCameras} />
        </div>
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-surface-200">System</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-surface-400">Uptime</dt>
              <dd className="text-surface-100">{formatUptime(stats.systemUptimeSeconds)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-surface-400">Connected clients</dt>
              <dd className="text-surface-100">{stats.connectedClients}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-surface-400">Total users</dt>
              <dd className="text-surface-100">{stats.totalUsers}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-surface-200">Recent Events</h2>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {stats.recentEvents.length === 0 && <p className="text-sm text-surface-500">No recent events.</p>}
            {stats.recentEvents.slice(0, 10).map((ev) => (
              <div
                key={ev.id}
                className="flex items-start justify-between gap-2 rounded-md border border-surface-800 bg-surface-850 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-surface-100">{ev.description}</p>
                  <p className="text-xs text-surface-500">
                    {ev.camera?.name ?? "System"} · {formatDateTime(ev.createdAt)}
                  </p>
                </div>
                <SeverityBadge severity={ev.severity} />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-surface-200">Camera Health</h2>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface-900 text-xs uppercase tracking-wide text-surface-500">
                <tr>
                  <th className="pb-2">Camera</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Last Heartbeat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {stats.cameraHealth.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 text-surface-100">{c.name}</td>
                    <td className="py-2">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-2 text-surface-400">{formatRelativeTime(c.lastHeartbeat)}</td>
                  </tr>
                ))}
                {stats.cameraHealth.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-3 text-center text-surface-500">
                      No cameras configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
