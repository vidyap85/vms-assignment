import { useEffect, useState } from "react";
import { listSnapshots, snapshotDownloadUrl } from "../api/snapshots";
import { listCameras } from "../api/cameras";
import type { Camera, Snapshot } from "../types";
import { pushToast } from "../store/toastStore";
import { formatDateTime } from "../lib/format";
import { DownloadIcon } from "../components/common/Icons";
import Spinner from "../components/common/Spinner";

export default function Snapshots() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCameras().then(setCameras).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    listSnapshots(cameraId || undefined)
      .then(setSnapshots)
      .catch(() => pushToast("Failed to load snapshots.", "error"))
      .finally(() => setLoading(false));
  }, [cameraId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-surface-50">Snapshots</h1>
        <div className="w-56">
          <select className="input" value={cameraId} onChange={(e) => setCameraId(e.target.value)}>
            <option value="">All cameras</option>
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Spinner size={24} className="text-accent" />
        </div>
      )}

      {!loading && snapshots.length === 0 && (
        <div className="card p-8 text-center text-sm text-surface-500">
          No snapshots yet. Capture one from a camera tile in Live View.
        </div>
      )}

      {!loading && snapshots.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {snapshots.map((s) => (
            <div key={s.id} className="card group relative overflow-hidden">
              <img src={s.filePath} alt={s.camera?.name ?? "Snapshot"} className="aspect-video w-full object-cover" />
              <div className="p-2.5">
                <p className="truncate text-sm font-medium text-surface-100">{s.camera?.name ?? "Unknown camera"}</p>
                <p className="text-xs text-surface-500">{formatDateTime(s.createdAt)}</p>
              </div>
              <a
                href={snapshotDownloadUrl(s.id)}
                className="icon-btn absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                title="Download"
              >
                <DownloadIcon className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
