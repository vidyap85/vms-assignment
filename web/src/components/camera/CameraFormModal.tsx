import { FormEvent, useEffect, useState } from "react";
import Modal from "../common/Modal";
import Spinner from "../common/Spinner";
import type { Camera, CameraGroup } from "../../types";
import type { CameraInput } from "../../api/cameras";

interface CameraFormModalProps {
  open: boolean;
  camera: Camera | null;
  groups: CameraGroup[];
  onClose: () => void;
  onSubmit: (input: CameraInput) => Promise<void>;
}

const RESOLUTIONS = ["640x480", "1280x720", "1920x1080", "2560x1440", "3840x2160"];

export default function CameraFormModal({ open, camera, groups, onClose, onSubmit }: CameraFormModalProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [rtspUrl, setRtspUrl] = useState("");
  const [groupId, setGroupId] = useState("");
  const [resolution, setResolution] = useState("1920x1080");
  const [fps, setFps] = useState(15);
  const [recordingEnabled, setRecordingEnabled] = useState(true);
  const [eventRecordingEnabled, setEventRecordingEnabled] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(camera?.name ?? "");
    setLocation(camera?.location ?? "");
    setRtspUrl(camera?.rtspUrl ?? "");
    setGroupId(camera?.groupId ?? "");
    setResolution(camera?.resolution ?? "1920x1080");
    setFps(camera?.fps ?? 15);
    setRecordingEnabled(camera?.recordingEnabled ?? true);
    setEventRecordingEnabled(camera?.eventRecordingEnabled ?? true);
    setEnabled(camera?.enabled ?? true);
    setError(null);
  }, [open, camera]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        name,
        location,
        rtspUrl: rtspUrl.trim() || undefined,
        groupId: groupId || null,
        resolution,
        fps,
        recordingEnabled,
        eventRecordingEnabled,
        enabled,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save camera.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={camera ? `Edit Camera — ${camera.name}` : "Add Camera"}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="camera-form" className="btn-primary" disabled={saving}>
            {saving && <Spinner size={14} />}
            {camera ? "Save Changes" : "Create Camera"}
          </button>
        </>
      }
    >
      <form id="camera-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Location</label>
          <input className="input" required value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <label className="label">RTSP URL (optional)</label>
          <input
            className="input font-mono text-xs"
            placeholder="rtsp://user:pass@192.168.1.50:554/stream1"
            value={rtspUrl}
            onChange={(e) => setRtspUrl(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-surface-500">
            Point this at a real IP camera's RTSP feed. Leave blank to use a simulated demo stream instead. Recording,
            snapshots and status checks use this URL directly; Live View HLS playback is only available for the
            built-in simulated cameras.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Group</label>
            <select className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">Ungrouped</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Resolution</label>
            <select className="input" value={resolution} onChange={(e) => setResolution(e.target.value)}>
              {RESOLUTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label">FPS</label>
          <input
            type="number"
            min={1}
            max={60}
            className="input"
            value={fps}
            onChange={(e) => setFps(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-surface-200">
            <input
              type="checkbox"
              checked={recordingEnabled}
              onChange={(e) => setRecordingEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-surface-600 bg-surface-800 accent-accent"
            />
            Continuous recording enabled
          </label>
          <label className="flex items-center gap-2 text-sm text-surface-200">
            <input
              type="checkbox"
              checked={eventRecordingEnabled}
              onChange={(e) => setEventRecordingEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-surface-600 bg-surface-800 accent-accent"
            />
            Event-triggered recording enabled
          </label>
          <label className="flex items-center gap-2 text-sm text-surface-200">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-surface-600 bg-surface-800 accent-accent"
            />
            Camera enabled
          </label>
        </div>
        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger-soft">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
