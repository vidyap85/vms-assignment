import { useEffect, useRef, useState } from "react";
import { deleteRecording, downloadRecording, getRecording, listRecordings } from "../api/recordings";
import { listCameras } from "../api/cameras";
import type { Camera, Recording } from "../types";
import { useAuthStore } from "../store/authStore";
import { pushToast } from "../store/toastStore";
import { formatBytes, formatDateTime, formatDuration, formatTime } from "../lib/format";
import { RecordingStatusBadge } from "../components/common/Badge";
import {
  DownloadIcon,
  FastForwardIcon,
  PauseIcon,
  PlayIcon,
  SnapshotIcon,
  TrashIcon,
} from "../components/common/Icons";
import Spinner from "../components/common/Spinner";
import ConfirmDialog from "../components/common/ConfirmDialog";

const SPEEDS = [0.5, 1, 1.5, 2];
const FAST_FORWARD_SKIP_SECONDS = 10;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Playback() {
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [active, setActive] = useState<Recording | null>(null);
  const [loadingActive, setLoadingActive] = useState(false);

  const [deleting, setDeleting] = useState<Recording | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteBusy, setBulkDeleteBusy] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(1);

  useEffect(() => {
    listCameras()
      .then((data) => {
        setCameras(data);
        if (data[0]) setCameraId(data[0].id);
      })
      .catch(() => pushToast("Failed to load cameras.", "error"));
  }, []);

  useEffect(() => {
    if (!cameraId) return;
    setLoadingList(true);
    const from = `${date}T00:00:00.000Z`;
    const to = `${date}T23:59:59.999Z`;
    setSelectedIds(new Set());
    listRecordings({ cameraId, from, to })
      .then(setRecordings)
      .catch(() => pushToast("Failed to load recordings.", "error"))
      .finally(() => setLoadingList(false));
  }, [cameraId, date]);

  const deletableRecordings = recordings.filter((r) => r.status !== "RECORDING");

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === deletableRecordings.length ? new Set() : new Set(deletableRecordings.map((r) => r.id))
    );
  }

  async function selectRecording(rec: Recording) {
    setLoadingActive(true);
    setPlaying(false);
    try {
      const full = await getRecording(rec.id);
      setActive(full);
      setCurrentTime(0);
    } catch {
      pushToast("Failed to load recording.", "error");
    } finally {
      setLoadingActive(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteRecording(deleting.id);
      setRecordings((prev) => prev.filter((r) => r.id !== deleting.id));
      if (active?.id === deleting.id) setActive(null);
      pushToast("Recording deleted.", "success");
      setDeleting(null);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to delete recording.", "error");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkDeleteBusy(true);
    const ids = [...selectedIds];
    const results = await Promise.allSettled(ids.map((id) => deleteRecording(id)));
    const succeeded = new Set(ids.filter((_, i) => results[i].status === "fulfilled"));
    const failedCount = ids.length - succeeded.size;

    setRecordings((prev) => prev.filter((r) => !succeeded.has(r.id)));
    if (active && succeeded.has(active.id)) setActive(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of succeeded) next.delete(id);
      return next;
    });

    if (failedCount === 0) {
      pushToast(`Deleted ${succeeded.size} recording${succeeded.size === 1 ? "" : "s"}.`, "success");
      setBulkDeleteOpen(false);
    } else {
      pushToast(`Deleted ${succeeded.size}, failed to delete ${failedCount}.`, "error");
    }
    setBulkDeleteBusy(false);
  }

  async function handleDownload() {
    if (!active || downloadBusy) return;
    setDownloadBusy(true);
    try {
      await downloadRecording(active.id);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to download recording.", "error");
    } finally {
      setDownloadBusy(false);
    }
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }

  function fastForward() {
    const video = videoRef.current;
    if (!video) return;
    seekTo(Math.min((duration || video.duration || Infinity), video.currentTime + FAST_FORWARD_SKIP_SECONDS));
  }

  function setSpeed(value: number) {
    const idx = SPEEDS.indexOf(value);
    setSpeedIdx(idx === -1 ? 1 : idx);
    if (videoRef.current) videoRef.current.playbackRate = value;
  }

  function seekTo(t: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = t;
    setCurrentTime(t);
  }

  function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `frame-${active?.id ?? "snapshot"}-${Math.round(currentTime)}s.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-surface-50">Playback</h1>

      <div className="card flex flex-wrap items-end gap-3 p-3">
        <div>
          <label className="label">Camera</label>
          <select className="input" value={cameraId} onChange={(e) => setCameraId(e.target.value)}>
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <div className="card overflow-hidden">
            {active ? (
              <video
                key={active.id}
                ref={videoRef}
                src={active.filePath}
                className="aspect-video w-full bg-black"
                controls={false}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              />
            ) : (
              <div className="flex aspect-video items-center justify-center bg-black text-sm text-surface-500">
                {loadingActive ? <Spinner size={22} className="text-accent" /> : "Select a recording to play back"}
              </div>
            )}
          </div>

          {active && (
            <div className="card space-y-3 p-3">
              <div className="flex items-center gap-3">
                <button className="btn-secondary" onClick={togglePlay} title="Play / Pause">
                  {playing ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                </button>
                <button className="btn-secondary" onClick={fastForward} title={`Fast forward ${FAST_FORWARD_SKIP_SECONDS}s`}>
                  <FastForwardIcon className="h-4 w-4" />
                </button>
                <span className="w-32 shrink-0 text-xs tabular-nums text-surface-400">
                  {formatDuration(currentTime)} / {formatDuration(duration || 0)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  className="flex-1 accent-accent"
                />
                <select
                  className="input w-auto text-xs"
                  value={SPEEDS[speedIdx]}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  title="Speed control"
                >
                  {SPEEDS.map((s) => (
                    <option key={s} value={s}>
                      {s}x
                    </option>
                  ))}
                </select>
                <button className="btn-ghost" onClick={captureFrame} title="Snapshot current frame">
                  <SnapshotIcon className="h-4 w-4" />
                </button>
                <button
                  className="btn-ghost"
                  onClick={handleDownload}
                  disabled={downloadBusy}
                  title="Download recording"
                >
                  {downloadBusy ? <Spinner size={14} /> : <DownloadIcon className="h-4 w-4" />}
                </button>
              </div>

              {active.keyframes && active.keyframes.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-surface-500">
                    Keyframe Timeline
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {active.keyframes.map((kf) => (
                      <button
                        key={kf.id}
                        onClick={() => seekTo(kf.offsetSeconds)}
                        className={`group relative shrink-0 overflow-hidden rounded-md border transition-colors ${
                          Math.abs(currentTime - kf.offsetSeconds) < 15
                            ? "border-accent"
                            : "border-surface-800 hover:border-surface-600"
                        }`}
                        title={`Jump to ${formatDuration(kf.offsetSeconds)}`}
                      >
                        <img src={kf.thumbnailPath} alt="" className="h-16 w-28 object-cover" />
                        <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 text-[10px] text-white">
                          {formatDuration(kf.offsetSeconds)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card max-h-[70vh] overflow-y-auto p-2">
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <div className="flex items-center gap-2">
              {isAdmin && deletableRecordings.length > 0 && (
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={selectedIds.size > 0 && selectedIds.size === deletableRecordings.length}
                  ref={(el) => {
                    if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < deletableRecordings.length;
                  }}
                  onChange={toggleSelectAll}
                  title="Select all"
                />
              )}
              <p className="text-xs font-medium uppercase tracking-wide text-surface-500">
                Recordings ({recordings.length})
              </p>
            </div>
            {isAdmin && selectedIds.size > 0 && (
              <button
                onClick={() => setBulkDeleteOpen(true)}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-danger-soft hover:bg-danger/10"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                Delete ({selectedIds.size})
              </button>
            )}
          </div>
          {loadingList && <Spinner size={18} className="mx-auto my-4 text-accent" />}
          {!loadingList && recordings.length === 0 && (
            <p className="px-2 py-4 text-center text-sm text-surface-500">No recordings for this day.</p>
          )}
          <div className="space-y-1">
            {recordings.map((rec) => (
              <div
                key={rec.id}
                className={`group relative flex items-start gap-1.5 rounded-md border pr-1 transition-colors ${
                  active?.id === rec.id
                    ? "border-accent bg-accent/10"
                    : "border-transparent bg-surface-850 hover:border-surface-700"
                }`}
              >
                {isAdmin && rec.status !== "RECORDING" && (
                  <input
                    type="checkbox"
                    className="accent-accent ml-2 mt-3 shrink-0"
                    checked={selectedIds.has(rec.id)}
                    onChange={() => toggleSelected(rec.id)}
                    title="Select for bulk delete"
                  />
                )}
                <button onClick={() => selectRecording(rec)} className="min-w-0 flex-1 px-1.5 py-2 text-left text-xs">
                  <div className="flex items-center justify-between pr-5">
                    <span className="font-medium text-surface-100">{formatTime(rec.startTime)}</span>
                    <RecordingStatusBadge status={rec.status} />
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-surface-500">
                    <span>{rec.type}</span>
                    <span>{formatBytes(rec.fileSizeBytes)}</span>
                  </div>
                  <div className="text-surface-600">{formatDateTime(rec.startTime)}</div>
                </button>
                {isAdmin && rec.status !== "RECORDING" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleting(rec);
                    }}
                    className="absolute right-1.5 top-1.5 rounded p-1 text-surface-500 opacity-0 transition-opacity hover:text-danger-soft group-hover:opacity-100"
                    title="Delete recording"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Delete Recording"
        message={`Delete the recording from ${deleting ? formatDateTime(deleting.startTime) : ""}? The video file and its thumbnails will be permanently removed.`}
        confirmLabel="Delete"
        loading={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Delete Recordings"
        message={`Delete ${selectedIds.size} selected recording${selectedIds.size === 1 ? "" : "s"}? The video files and their thumbnails will be permanently removed.`}
        confirmLabel="Delete"
        loading={bulkDeleteBusy}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </div>
  );
}
