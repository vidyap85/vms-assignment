import { useEffect, useState } from "react";
import { getDashboardStats } from "../api/dashboard";
import { listCameras } from "../api/cameras";
import { listEvents } from "../api/events";
import type { Camera, DashboardStats, VmsEvent } from "../types";
import { useSocketEvent } from "../hooks/useSocketEvent";
import { pushToast } from "../store/toastStore";
import { formatRelativeTime } from "../lib/format";
import SafeCameraTile from "../components/camera/SafeCameraTile";
import StorageGauge from "../components/common/StorageGauge";
import { SeverityBadge, StatusBadge } from "../components/common/Badge";
import Spinner from "../components/common/Spinner";

function upsert(list: VmsEvent[], incoming: VmsEvent): VmsEvent[] {
  const idx = list.findIndex((e) => e.id === incoming.id);
  if (idx >= 0) {
    const copy = [...list];
    copy[idx] = incoming;
    return copy;
  }
  return [incoming, ...list].slice(0, 150);
}

export default function CommandCenter() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [events, setEvents] = useState<VmsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardStats(), listCameras(), listEvents({})])
      .then(([statsData, camerasData, eventsData]) => {
        setStats(statsData);
        setCameras(camerasData);
        setEvents(eventsData);
      })
      .catch(() => pushToast("Failed to load command center data.", "error"))
      .finally(() => setLoading(false));
  }, []);

  useSocketEvent<DashboardStats>("dashboard:stats", setStats);
  useSocketEvent<Camera>("camera:status", (updated) => {
    setCameras((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  });
  useSocketEvent<VmsEvent>("event:new", (incoming) => {
    setEvents((prev) => upsert(prev, incoming));
    if (incoming.severity === "CRITICAL" && incoming.status === "OPEN") {
      pushToast(incoming.description, "error");
    }
  });

  if (loading || !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={24} className="text-accent" />
      </div>
    );
  }

  const wall = cameras.filter((c) => c.status === "ONLINE").slice(0, 9);
  const offlineCameras = cameras.filter((c) => c.status === "OFFLINE");
  const recordingFailures = events.filter((e) => e.type === "RECORDING_FAILURE").slice(0, 10);
  const activeAlarms = events
    .filter((e) => e.status === "OPEN" && (e.severity === "CRITICAL" || e.severity === "WARNING"))
    .slice(0, 10);
  const recentIncidents = events.filter((e) => e.status === "OPEN").slice(0, 10);
  const operatorActivity = events.filter((e) => e.type === "USER_LOGIN" || e.type === "USER_LOGOUT").slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-surface-50">Central Command Center</h1>
        <span className="flex items-center gap-1.5 text-xs text-surface-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />
          Live — updates automatically
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="card p-3">
          <h2 className="mb-2 text-sm font-semibold text-surface-200">Multi-Camera Wall</h2>
          {wall.length === 0 ? (
            <p className="py-8 text-center text-sm text-surface-500">No cameras currently online.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {wall.map((c) => (
                <SafeCameraTile key={c.id} camera={c} compact />
              ))}
            </div>
          )}
        </div>

        <div className="card flex max-h-[520px] flex-col p-3">
          <h2 className="mb-2 text-sm font-semibold text-surface-200">Live Event Panel</h2>
          <div className="flex-1 space-y-1.5 overflow-y-auto">
            {events.length === 0 && <p className="text-sm text-surface-500">No events yet.</p>}
            {events.slice(0, 40).map((ev) => (
              <div key={ev.id} className="rounded-md border border-surface-800 bg-surface-850 px-2.5 py-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-surface-100">{ev.description}</span>
                  <SeverityBadge severity={ev.severity} />
                </div>
                <div className="text-surface-500">{formatRelativeTime(ev.createdAt)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Panel title={`Offline Cameras (${offlineCameras.length})`}>
          {offlineCameras.length === 0 && <Empty text="All cameras online." />}
          {offlineCameras.map((c) => (
            <Row key={c.id} left={c.name} right={<StatusBadge status={c.status} />} />
          ))}
        </Panel>

        <Panel title={`Recording Failures (${recordingFailures.length})`}>
          {recordingFailures.length === 0 && <Empty text="No recording failures." />}
          {recordingFailures.map((e) => (
            <Row key={e.id} left={e.camera?.name ?? "System"} right={formatRelativeTime(e.createdAt)} />
          ))}
        </Panel>

        <Panel title={`Active Alarms (${activeAlarms.length})`}>
          {activeAlarms.length === 0 && <Empty text="No active alarms." />}
          {activeAlarms.map((e) => (
            <Row key={e.id} left={e.description} right={<SeverityBadge severity={e.severity} />} />
          ))}
        </Panel>

        <div className="card p-3">
          <h2 className="mb-2 text-sm font-semibold text-surface-200">Storage Health</h2>
          <StorageGauge
            usedPercent={stats.storageUsedPercent}
            usedBytes={stats.storageUsedBytes}
            capacityBytes={stats.storageCapacityBytes}
          />
        </div>

        <Panel title={`Recent Incidents (${recentIncidents.length})`}>
          {recentIncidents.length === 0 && <Empty text="No open incidents." />}
          {recentIncidents.map((e) => (
            <Row key={e.id} left={e.description} right={formatRelativeTime(e.createdAt)} />
          ))}
        </Panel>

        <Panel title="Operator Activity">
          {operatorActivity.length === 0 && <Empty text="No recent logins." />}
          {operatorActivity.map((e) => (
            <Row key={e.id} left={e.user?.name ?? "Unknown"} right={formatRelativeTime(e.createdAt)} />
          ))}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card max-h-64 overflow-y-auto p-3">
      <h2 className="mb-2 text-sm font-semibold text-surface-200">{title}</h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-surface-850 px-2.5 py-1.5 text-xs">
      <span className="truncate text-surface-200">{left}</span>
      <span className="shrink-0 text-surface-500">{right}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-surface-500">{text}</p>;
}
