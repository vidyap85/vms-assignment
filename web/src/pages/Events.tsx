import { FormEvent, useEffect, useState } from "react";
import { closeEvent, listEvents } from "../api/events";
import { listCameras } from "../api/cameras";
import type { Camera, EventType, VmsEvent } from "../types";
import { useSocketEvent } from "../hooks/useSocketEvent";
import { pushToast } from "../store/toastStore";
import { formatDateTime } from "../lib/format";
import { EventStatusBadge, SeverityBadge } from "../components/common/Badge";
import Spinner from "../components/common/Spinner";

const EVENT_TYPES: EventType[] = [
  "CAMERA_OFFLINE",
  "MOTION_DETECTED",
  "RECORDING_STARTED",
  "RECORDING_STOPPED",
  "RECORDING_FAILURE",
  "STORAGE_FULL",
  "CAMERA_RECONNECTED",
  "USER_LOGIN",
  "USER_LOGOUT",
];

export default function Events() {
  const [events, setEvents] = useState<VmsEvent[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);

  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [severity, setSeverity] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await listEvents({
        status: status || undefined,
        type: type || undefined,
        severity: severity || undefined,
        cameraId: cameraId || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      });
      setEvents(data);
    } catch {
      pushToast("Failed to load events.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    listCameras().then(setCameras).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useSocketEvent<VmsEvent>("event:new", (incoming) => {
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === incoming.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = incoming;
        return copy;
      }
      return [incoming, ...prev];
    });
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    load();
  }

  async function handleClose(ev: VmsEvent) {
    setClosingId(ev.id);
    try {
      const updated = await closeEvent(ev.id);
      setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch {
      pushToast("Failed to close event.", "error");
    } finally {
      setClosingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-surface-50">Event Management</h1>

      <form onSubmit={onSubmit} className="card flex flex-wrap items-end gap-3 p-3">
        <div>
          <label className="label">Camera</label>
          <select className="input" value={cameraId} onChange={(e) => setCameraId(e.target.value)}>
            <option value="">All cameras</option>
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.split("_").join(" ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Severity</label>
          <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">Any</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button type="submit" className="btn-secondary">
          Apply
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-surface-800 text-xs uppercase tracking-wide text-surface-500">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Camera</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <Spinner size={22} className="mx-auto text-accent" />
                </td>
              </tr>
            )}
            {!loading && events.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-surface-500">
                  No events found.
                </td>
              </tr>
            )}
            {!loading &&
              events.map((ev) => (
                <tr key={ev.id} className="hover:bg-surface-850/60">
                  <td className="px-4 py-3 text-surface-400">{formatDateTime(ev.createdAt)}</td>
                  <td className="px-4 py-3 text-surface-200">{ev.camera?.name ?? "System"}</td>
                  <td className="px-4 py-3 text-surface-300">{ev.type.split("_").join(" ")}</td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={ev.severity} />
                  </td>
                  <td className="px-4 py-3 text-surface-200">{ev.description}</td>
                  <td className="px-4 py-3">
                    <EventStatusBadge status={ev.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {ev.status === "OPEN" && (
                      <button
                        className="btn-ghost px-2 py-1 text-xs"
                        onClick={() => handleClose(ev)}
                        disabled={closingId === ev.id}
                      >
                        {closingId === ev.id ? <Spinner size={12} /> : "Close"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
