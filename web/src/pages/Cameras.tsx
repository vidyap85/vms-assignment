import { useEffect, useState } from "react";
import {
  createCamera,
  createCameraGroup,
  deleteCamera,
  listCameraGroups,
  listCameras,
  setCameraEnabled,
  testCameraConnection,
  updateCamera,
} from "../api/cameras";
import type { CameraInput } from "../api/cameras";
import type { Camera, CameraGroup } from "../types";
import { useAuthStore } from "../store/authStore";
import { useSocketEvent } from "../hooks/useSocketEvent";
import { pushToast } from "../store/toastStore";
import { formatRelativeTime } from "../lib/format";
import { EnabledBadge, StatusBadge } from "../components/common/Badge";
import Spinner from "../components/common/Spinner";
import ConfirmDialog from "../components/common/ConfirmDialog";
import CameraFormModal from "../components/camera/CameraFormModal";
import Modal from "../components/common/Modal";
import { FormEvent } from "react";

export default function Cameras() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === "ADMIN";

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [groups, setGroups] = useState<CameraGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Camera | null>(null);
  const [deleting, setDeleting] = useState<Camera | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [camerasData, groupsData] = await Promise.all([
        listCameras({ groupId: groupFilter || undefined, status: statusFilter || undefined, q: q || undefined }),
        listCameraGroups(),
      ]);
      setCameras(camerasData);
      setGroups(groupsData);
    } catch {
      pushToast("Failed to load cameras.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupFilter, statusFilter]);

  useSocketEvent<Camera>("camera:status", (updated) => {
    setCameras((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  });

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    load();
  }

  async function handleCreateOrUpdate(input: CameraInput) {
    if (editing) {
      const updated = await updateCamera(editing.id, input);
      setCameras((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      pushToast("Camera updated.", "success");
    } else {
      const created = await createCamera(input);
      setCameras((prev) => [...prev, created]);
      pushToast("Camera created.", "success");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteCamera(deleting.id);
      setCameras((prev) => prev.filter((c) => c.id !== deleting.id));
      pushToast(`${deleting.name} deleted.`, "success");
      setDeleting(null);
    } catch {
      pushToast("Failed to delete camera.", "error");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleToggleEnabled(camera: Camera) {
    try {
      const updated = await setCameraEnabled(camera.id, !camera.enabled);
      setCameras((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch {
      pushToast("Failed to update camera.", "error");
    }
  }

  async function handleTestConnection(camera: Camera) {
    setTestingId(camera.id);
    try {
      const result = await testCameraConnection(camera.id);
      pushToast(`${camera.name}: ${result.online ? "stream is live" : "no active stream"}`, result.online ? "success" : "warning");
    } catch {
      pushToast("Test connection failed.", "error");
    } finally {
      setTestingId(null);
    }
  }

  async function handleCreateGroup(e: FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      const group = await createCameraGroup(newGroupName.trim());
      setGroups((prev) => [...prev, group]);
      setNewGroupName("");
      setGroupModalOpen(false);
      pushToast("Group created.", "success");
    } catch {
      pushToast("Failed to create group.", "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-surface-50">Camera Management</h1>
        {canManage && (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setGroupModalOpen(true)}>
              New Group
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add Camera
            </button>
          </div>
        )}
      </div>

      <form onSubmit={onSearchSubmit} className="card flex flex-wrap items-end gap-3 p-3">
        <div className="min-w-[180px] flex-1">
          <label className="label">Search</label>
          <input className="input" placeholder="Name or location…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label className="label">Group</label>
          <select className="input" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Any status</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
          </select>
        </div>
        <button type="submit" className="btn-secondary">
          Apply
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-surface-800 text-xs uppercase tracking-wide text-surface-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Location / Group</th>
              <th className="px-4 py-3">Resolution</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Recording</th>
              <th className="px-4 py-3">Last Heartbeat</th>
              <th className="px-4 py-3">Enabled</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <Spinner size={22} className="mx-auto text-accent" />
                </td>
              </tr>
            )}
            {!loading && cameras.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-surface-500">
                  No cameras found.
                </td>
              </tr>
            )}
            {!loading &&
              cameras.map((c) => (
                <tr key={c.id} className="hover:bg-surface-850/60">
                  <td className="px-4 py-3 font-medium text-surface-100">{c.name}</td>
                  <td className="px-4 py-3 text-surface-300">
                    {c.location}
                    {c.group && <span className="ml-1 text-surface-500">· {c.group.name}</span>}
                  </td>
                  <td className="px-4 py-3 text-surface-300">
                    {c.resolution ?? "—"} @ {c.fps ?? "—"}fps
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-surface-300">{c.recordingEnabled ? "Continuous" : "Off"}</td>
                  <td className="px-4 py-3 text-surface-400">{formatRelativeTime(c.lastHeartbeat)}</td>
                  <td className="px-4 py-3">
                    <EnabledBadge enabled={c.enabled} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        className="btn-ghost px-2 py-1 text-xs"
                        onClick={() => handleTestConnection(c)}
                        disabled={testingId === c.id}
                      >
                        {testingId === c.id ? <Spinner size={12} /> : "Test"}
                      </button>
                      {canManage && (
                        <>
                          <button
                            className="btn-ghost px-2 py-1 text-xs"
                            onClick={() => {
                              setEditing(c);
                              setFormOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button className="btn-ghost px-2 py-1 text-xs" onClick={() => handleToggleEnabled(c)}>
                            {c.enabled ? "Disable" : "Enable"}
                          </button>
                          <button
                            className="btn-ghost px-2 py-1 text-xs text-danger-soft hover:text-danger"
                            onClick={() => setDeleting(c)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {canManage && (
        <CameraFormModal
          open={formOpen}
          camera={editing}
          groups={groups}
          onClose={() => setFormOpen(false)}
          onSubmit={handleCreateOrUpdate}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Delete Camera"
        message={`Delete "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />

      <Modal open={groupModalOpen} onClose={() => setGroupModalOpen(false)} title="New Camera Group">
        <form onSubmit={handleCreateGroup} className="space-y-3">
          <div>
            <label className="label">Group Name</label>
            <input className="input" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} autoFocus />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setGroupModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
