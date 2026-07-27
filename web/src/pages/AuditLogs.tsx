import { FormEvent, useEffect, useState } from "react";
import { listAuditLogs } from "../api/auditLogs";
import { listUsers } from "../api/users";
import type { AuditLog, User } from "../types";
import { useSocketEvent } from "../hooks/useSocketEvent";
import { pushToast } from "../store/toastStore";
import { formatDateTime } from "../lib/format";
import Spinner from "../components/common/Spinner";

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await listAuditLogs({
        userId: userId || undefined,
        action: action || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      });
      setLogs(data);
    } catch {
      pushToast("Failed to load audit logs.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    listUsers().then(setUsers).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useSocketEvent<AuditLog>("audit:new", (incoming) => {
    setLogs((prev) => [incoming, ...prev]);
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-surface-50">Audit Logs</h1>

      <form onSubmit={onSubmit} className="card flex flex-wrap items-end gap-3 p-3">
        <div>
          <label className="label">User</label>
          <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px]">
          <label className="label">Action contains</label>
          <input className="input" placeholder="e.g. CAMERA_CREATED" value={action} onChange={(e) => setAction(e.target.value)} />
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
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-surface-800 text-xs uppercase tracking-wide text-surface-500">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center">
                  <Spinner size={22} className="mx-auto text-accent" />
                </td>
              </tr>
            )}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-surface-500">
                  No audit log entries found.
                </td>
              </tr>
            )}
            {!loading &&
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-850/60">
                  <td className="px-4 py-3 text-surface-400">{formatDateTime(log.createdAt)}</td>
                  <td className="px-4 py-3 text-surface-100">{log.user?.name ?? "System"}</td>
                  <td className="px-4 py-3 text-surface-300">{log.action}</td>
                  <td className="px-4 py-3 text-surface-400">{log.details ?? "—"}</td>
                  <td className="px-4 py-3 text-surface-500">{log.ipAddress ?? "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
