import { FormEvent, useEffect, useState } from "react";
import { createUser, deleteUser, listUsers, updateUser } from "../api/users";
import type { UserInput } from "../api/users";
import { listCameras } from "../api/cameras";
import type { Camera, Role, User } from "../types";
import { useAuthStore } from "../store/authStore";
import { pushToast } from "../store/toastStore";
import { formatDateTime, formatRelativeTime } from "../lib/format";
import { EnabledBadge, RoleBadge } from "../components/common/Badge";
import Modal from "../components/common/Modal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import Spinner from "../components/common/Spinner";

const ROLES: Role[] = ["ADMIN", "OPERATOR", "VIEWER"];

export default function Users() {
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [usersData, camerasData] = await Promise.all([listUsers(), listCameras()]);
      setUsers(usersData);
      setCameras(camerasData);
    } catch {
      pushToast("Failed to load users.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteUser(deleting.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleting.id));
      pushToast(`${deleting.name} deleted.`, "success");
      setDeleting(null);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to delete user.", "error");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-surface-50">Users &amp; Roles</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          Add User
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-surface-800 text-xs uppercase tracking-wide text-surface-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Camera Access</th>
              <th className="px-4 py-3">Enabled</th>
              <th className="px-4 py-3">Last Login</th>
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
            {!loading &&
              users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-850/60">
                  <td className="px-4 py-3 font-medium text-surface-100">{u.name}</td>
                  <td className="px-4 py-3 text-surface-300">{u.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3 text-surface-400">
                    {u.role === "VIEWER" ? `${u.cameraAccess?.length ?? 0} camera(s)` : "All"}
                  </td>
                  <td className="px-4 py-3">
                    <EnabledBadge enabled={u.enabled} />
                  </td>
                  <td className="px-4 py-3 text-surface-400">{formatRelativeTime(u.lastLoginAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        className="btn-ghost px-2 py-1 text-xs"
                        onClick={() => {
                          setEditing(u);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-ghost px-2 py-1 text-xs text-danger-soft hover:text-danger disabled:opacity-30"
                        onClick={() => setDeleting(u)}
                        disabled={u.id === currentUser?.id}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <UserFormModal
        open={formOpen}
        user={editing}
        cameras={cameras}
        onClose={() => setFormOpen(false)}
        onSaved={(saved, isNew) => {
          setUsers((prev) => (isNew ? [...prev, saved] : prev.map((u) => (u.id === saved.id ? saved : u))));
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete User"
        message={`Delete "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

interface UserFormModalProps {
  open: boolean;
  user: User | null;
  cameras: Camera[];
  onClose: () => void;
  onSaved: (user: User, isNew: boolean) => void;
}

function UserFormModal({ open, user, cameras, onClose, onSaved }: UserFormModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("VIEWER");
  const [enabled, setEnabled] = useState(true);
  const [cameraIds, setCameraIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPassword("");
    setRole(user?.role ?? "VIEWER");
    setEnabled(user?.enabled ?? true);
    setCameraIds(user?.cameraAccess?.map((a) => a.camera.id) ?? []);
    setError(null);
  }, [open, user]);

  function toggleCamera(id: string) {
    setCameraIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const input: UserInput = {
        name,
        email,
        role,
        enabled,
        cameraIds: role === "VIEWER" ? cameraIds : undefined,
        ...(password ? { password } : {}),
      };
      const saved = user ? await updateUser(user.id, input) : await createUser({ ...input, password: password || "changeme123" });
      onSaved(saved, !user);
      pushToast(user ? "User updated." : "User created.", "success");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? `Edit User — ${user.name}` : "Add User"}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="user-form" className="btn-primary" disabled={saving}>
            {saving && <Spinner size={14} />}
            {user ? "Save Changes" : "Create User"}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Password {user && "(leave blank to keep unchanged)"}</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={user ? "••••••••" : "min. 6 characters"}
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-surface-200">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-surface-600 bg-surface-800 accent-accent"
          />
          Account enabled
        </label>

        {role === "VIEWER" && (
          <div>
            <label className="label">Assigned Cameras ({cameraIds.length})</label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-surface-800 bg-surface-850 p-2">
              {cameras.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm text-surface-200 hover:bg-surface-800">
                  <input
                    type="checkbox"
                    checked={cameraIds.includes(c.id)}
                    onChange={() => toggleCamera(c.id)}
                    className="h-3.5 w-3.5 rounded border-surface-600 bg-surface-800 accent-accent"
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {user && (
          <p className="text-xs text-surface-500">
            Created {formatDateTime(user.createdAt)} · Last login {formatRelativeTime(user.lastLoginAt)}
          </p>
        )}

        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger-soft">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
