import { useEffect, useMemo, useState } from "react";
import { listCameras } from "../api/cameras";
import { getRecordingStatus, startManualRecording, stopManualRecording } from "../api/recordings";
import type { Camera } from "../types";
import { useAuthStore } from "../store/authStore";
import { useSocketEvent } from "../hooks/useSocketEvent";
import { pushToast } from "../store/toastStore";
import SafeCameraTile from "../components/camera/SafeCameraTile";
import Spinner from "../components/common/Spinner";

const GRID_SIZES = [1, 4, 9, 16] as const;
type GridSize = (typeof GRID_SIZES)[number];

export default function LiveView() {
  const role = useAuthStore((s) => s.user?.role);
  const canRecord = role === "ADMIN" || role === "OPERATOR";

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridSize, setGridSize] = useState<GridSize>(9);
  const [slots, setSlots] = useState<(string | null)[]>([]);
  const [activeRecordings, setActiveRecordings] = useState<Record<string, boolean>>({});
  const [recordBusy, setRecordBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    listCameras()
      .then(async (data) => {
        setCameras(data);
        setSlots(data.slice(0, gridSize).map((c) => c.id));
        if (canRecord) {
          const entries = await Promise.all(
            data.map(async (c) => {
              try {
                const status = await getRecordingStatus(c.id);
                return [c.id, status.activeType === "MANUAL"] as const;
              } catch {
                return [c.id, false] as const;
              }
            })
          );
          setActiveRecordings(Object.fromEntries(entries));
        }
      })
      .catch(() => pushToast("Failed to load cameras.", "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSlots((prev) => {
      const next = [...prev];
      if (gridSize > next.length) {
        const used = new Set(next.filter(Boolean));
        const remaining = cameras.filter((c) => !used.has(c.id)).map((c) => c.id);
        while (next.length < gridSize) next.push(remaining.shift() ?? null);
      } else {
        next.length = gridSize;
      }
      return next;
    });
  }, [gridSize, cameras]);

  useSocketEvent<Camera>("camera:status", (updated) => {
    setCameras((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  });

  useSocketEvent<{ cameraId: string; type: string; status: string }>("recording:status", (payload) => {
    if (payload.type === "MANUAL") {
      setActiveRecordings((prev) => ({ ...prev, [payload.cameraId]: payload.status === "RECORDING" }));
    }
  });

  const camerasById = useMemo(() => new Map(cameras.map((c) => [c.id, c])), [cameras]);

  async function toggleRecord(cameraId: string) {
    setRecordBusy((prev) => ({ ...prev, [cameraId]: true }));
    try {
      if (activeRecordings[cameraId]) {
        await stopManualRecording(cameraId);
        setActiveRecordings((prev) => ({ ...prev, [cameraId]: false }));
        pushToast("Manual recording stopped.", "info");
      } else {
        await startManualRecording(cameraId);
        setActiveRecordings((prev) => ({ ...prev, [cameraId]: true }));
        pushToast("Manual recording started.", "success");
      }
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Recording action failed.", "error");
      try {
        const status = await getRecordingStatus(cameraId);
        setActiveRecordings((prev) => ({ ...prev, [cameraId]: status.activeType === "MANUAL" }));
      } catch {
        /* ignore */
      }
    } finally {
      setRecordBusy((prev) => ({ ...prev, [cameraId]: false }));
    }
  }

  const gridColsClass =
    gridSize === 1 ? "grid-cols-1" : gridSize === 4 ? "grid-cols-2" : gridSize === 9 ? "grid-cols-3" : "grid-cols-4";

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={24} className="text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-surface-50">Live View</h1>
        <div className="flex gap-1 rounded-md border border-surface-800 bg-surface-900 p-1">
          {GRID_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => setGridSize(size)}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                gridSize === size ? "bg-accent text-surface-950" : "text-surface-300 hover:bg-surface-800"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {cameras.length === 0 ? (
        <p className="text-sm text-surface-500">No cameras assigned to your account yet.</p>
      ) : (
        <div className={`grid gap-3 ${gridColsClass}`}>
          {slots.map((slotCameraId, idx) => {
            const camera = slotCameraId ? camerasById.get(slotCameraId) : undefined;
            return (
              <div key={idx} className="space-y-1.5">
                {camera ? (
                  <SafeCameraTile
                    camera={camera}
                    recording={!!activeRecordings[camera.id]}
                    recordControl={
                      canRecord
                        ? {
                            active: !!activeRecordings[camera.id],
                            busy: !!recordBusy[camera.id],
                            onToggle: () => toggleRecord(camera.id),
                          }
                        : undefined
                    }
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-surface-800 text-xs text-surface-600">
                    Empty slot
                  </div>
                )}
                <select
                  className="input text-xs"
                  value={slotCameraId ?? ""}
                  onChange={(e) => {
                    const value = e.target.value || null;
                    setSlots((prev) => prev.map((s, i) => (i === idx ? value : s)));
                  }}
                >
                  <option value="">— Empty —</option>
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
