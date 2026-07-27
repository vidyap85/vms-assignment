import { FormEvent, useEffect, useState } from "react";
import { search } from "../api/search";
import { listCameras, listCameraGroups } from "../api/cameras";
import type { Camera, CameraGroup, SearchResults } from "../types";
import { pushToast } from "../store/toastStore";
import { formatBytes, formatDateTime } from "../lib/format";
import { RoleBadge, SeverityBadge, StatusBadge } from "../components/common/Badge";
import Spinner from "../components/common/Spinner";

export default function Search() {
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [cameraId, setCameraId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [status, setStatus] = useState("");
  const [eventType, setEventType] = useState("");

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [groups, setGroups] = useState<CameraGroup[]>([]);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    listCameras().then(setCameras).catch(() => {});
    listCameraGroups().then(setGroups).catch(() => {});
  }, []);

  async function runSearch(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const data = await search({
        q: q || undefined,
        date: date || undefined,
        cameraId: cameraId || undefined,
        groupId: groupId || undefined,
        status: status || undefined,
        eventType: eventType || undefined,
      });
      setResults(data);
    } catch {
      pushToast("Search failed.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-surface-50">Search</h1>

      <form onSubmit={runSearch} className="card space-y-3 p-3">
        <div>
          <label className="label">Query</label>
          <input
            className="input"
            placeholder="Search cameras, recordings, events, users…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Camera</label>
            <select className="input" value={cameraId} onChange={(e) => setCameraId(e.target.value)}>
              <option value="">Any</option>
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Group</label>
            <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">Any</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Any</option>
              <optgroup label="Camera status">
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">Offline</option>
              </optgroup>
              <optgroup label="Event status">
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label className="label">Event Type</label>
            <input
              className="input"
              placeholder="e.g. MOTION_DETECTED"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary">
              Search
            </button>
          </div>
        </div>
      </form>

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner size={24} className="text-accent" />
        </div>
      )}

      {!loading && searched && results && (
        <div className="space-y-4">
          <ResultSection title={`Cameras (${results.cameras.length})`}>
            {results.cameras.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md bg-surface-850 px-3 py-2 text-sm">
                <span className="text-surface-100">
                  {c.name} <span className="text-surface-500">· {c.location}</span>
                </span>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </ResultSection>

          <ResultSection title={`Recordings (${results.recordings.length})`}>
            {results.recordings.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md bg-surface-850 px-3 py-2 text-sm">
                <span className="text-surface-100">
                  {r.camera?.name ?? "—"} <span className="text-surface-500">· {formatDateTime(r.startTime)}</span>
                </span>
                <span className="text-surface-500">{formatBytes(r.fileSizeBytes)}</span>
              </div>
            ))}
          </ResultSection>

          <ResultSection title={`Events (${results.events.length})`}>
            {results.events.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-md bg-surface-850 px-3 py-2 text-sm">
                <span className="truncate text-surface-100">{e.description}</span>
                <SeverityBadge severity={e.severity} />
              </div>
            ))}
          </ResultSection>

          {results.users.length > 0 && (
            <ResultSection title={`Users (${results.users.length})`}>
              {results.users.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-md bg-surface-850 px-3 py-2 text-sm">
                  <span className="text-surface-100">
                    {u.name} <span className="text-surface-500">· {u.email}</span>
                  </span>
                  <RoleBadge role={u.role} />
                </div>
              ))}
            </ResultSection>
          )}
        </div>
      )}
    </div>
  );
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  const empty = items.flat().length === 0;
  return (
    <div className="card p-3">
      <h2 className="mb-2 text-sm font-semibold text-surface-200">{title}</h2>
      {empty ? <p className="text-sm text-surface-500">No results.</p> : <div className="space-y-1.5">{children}</div>}
    </div>
  );
}
