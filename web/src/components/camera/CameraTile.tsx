import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import type { Camera } from "../../types";
import { createSnapshot } from "../../api/snapshots";
import { pushToast } from "../../store/toastStore";
import {
  FullscreenIcon,
  RecordIcon,
  SnapshotIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "../common/Icons";
import Spinner from "../common/Spinner";

interface RecordControl {
  active: boolean;
  busy: boolean;
  onToggle: () => void;
}

interface CameraTileProps {
  camera: Camera;
  recording?: boolean;
  compact?: boolean;
  recordControl?: RecordControl;
}

const MAX_ZOOM = 4;
const MIN_ZOOM = 1;

export default function CameraTile({ camera, recording = false, compact = false, recordControl }: CameraTileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const [snapping, setSnapping] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const fatalRetryCount = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || camera.status !== "ONLINE") return;

    setPlaybackError(false);
    fatalRetryCount.current = 0;
    const src = camera.hlsUrl;

    if (Hls.isSupported()) {
      // hls.js's own setup/recovery calls have known edge cases where they can throw
      // synchronously (e.g. recovering from an error when internal state is already torn
      // down). Since this all runs inside a React effect, an uncaught throw here propagates
      // up through React's commit phase and trips the nearest error boundary — wrapping it
      // defensively turns that into a clean "Stream Error" state for just this tile instead.
      const safely = (fn: () => void) => {
        try {
          fn();
        } catch (err) {
          console.error("HLS playback error", err);
          setPlaybackError(true);
        }
      };

      let hls: Hls;
      try {
        hls = new Hls({
          maxBufferLength: 15,
          maxMaxBufferLength: 30,
          liveSyncDurationCount: 3,
          fragLoadingMaxRetry: 8,
          levelLoadingMaxRetry: 8,
          manifestLoadingMaxRetry: 8,
        });
      } catch (err) {
        console.error("HLS init error", err);
        setPlaybackError(true);
        return undefined;
      }
      hlsRef.current = hls;

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        // hls.js surfaces plenty of "fatal" errors that are actually transient (a slow
        // segment fetch, a manifest hiccup) and are meant to be recovered from, not treated
        // as a dead stream — this is the recovery pattern from hls.js's own docs. Only give
        // up and show "Stream Error" after repeated recovery attempts keep failing.
        const MAX_RETRIES = 6;
        if (fatalRetryCount.current >= MAX_RETRIES) {
          setPlaybackError(true);
          safely(() => hls.destroy());
          return;
        }
        fatalRetryCount.current += 1;
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            safely(() => hls.startLoad());
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            safely(() => hls.recoverMediaError());
            break;
          default:
            setPlaybackError(true);
            safely(() => hls.destroy());
            break;
        }
      });
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        fatalRetryCount.current = 0;
      });

      safely(() => hls.loadSource(src));
      safely(() => hls.attachMedia(video));
      video.play().catch(() => {});
      return () => {
        safely(() => hls.destroy());
        hlsRef.current = null;
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.play().catch(() => {});
      return () => {
        video.removeAttribute("src");
      };
    }

    setPlaybackError(true);
    return undefined;
  }, [camera.hlsUrl, camera.status]);

  function adjustZoom(delta: number) {
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + delta).toFixed(2)));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    adjustZoom(e.deltaY < 0 ? 0.25 : -0.25);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (zoom <= 1) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const maxOffset = (zoom - 1) * 60;
    setPan({
      x: Math.min(maxOffset, Math.max(-maxOffset, dragState.current.panX + dx)),
      y: Math.min(maxOffset, Math.max(-maxOffset, dragState.current.panY + dy)),
    });
  }

  function onPointerUp() {
    dragState.current = null;
  }

  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }

  async function handleSnapshot() {
    setSnapping(true);
    try {
      await createSnapshot(camera.id);
      pushToast(`Snapshot saved for ${camera.name}.`, "success");
    } catch {
      pushToast("Snapshot failed.", "error");
    } finally {
      setSnapping(false);
    }
  }

  const isOnline = camera.status === "ONLINE";

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-lg border border-surface-800 bg-black"
    >
      {isOnline && !playbackError ? (
        <video
          ref={videoRef}
          className="h-full w-full select-none object-cover"
          muted
          autoPlay
          playsInline
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            cursor: zoom > 1 ? "grab" : "default",
            transition: dragState.current ? "none" : "transform 120ms ease-out",
          }}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-surface-900 text-surface-500">
          <span className="text-xs uppercase tracking-wide">{playbackError ? "Stream Error" : "No Signal"}</span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2">
        <div className="flex items-center gap-1.5 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white">
          <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-ok" : "bg-danger"}`} />
          {camera.name}
        </div>
        {recording && (
          <div className="flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs font-medium text-danger-soft">
            <RecordIcon className="h-2.5 w-2.5 animate-pulse" />
            REC
          </div>
        )}
      </div>

      {!compact && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="pointer-events-auto flex gap-1">
            <button className="icon-btn" onClick={() => adjustZoom(0.25)} title="Zoom in">
              <ZoomInIcon className="h-3.5 w-3.5" />
            </button>
            <button className="icon-btn" onClick={() => adjustZoom(-0.25)} title="Zoom out">
              <ZoomOutIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="pointer-events-auto flex gap-1">
            <button className="icon-btn" onClick={handleSnapshot} disabled={snapping || !isOnline} title="Snapshot">
              {snapping ? <Spinner size={13} /> : <SnapshotIcon className="h-3.5 w-3.5" />}
            </button>
            <button className="icon-btn" onClick={toggleFullscreen} title="Fullscreen">
              <FullscreenIcon className="h-3.5 w-3.5" />
            </button>
            {recordControl && (
              <button
                className={`icon-btn ${recordControl.active ? "text-danger-soft" : ""}`}
                onClick={recordControl.onToggle}
                disabled={recordControl.busy || !isOnline}
                title={recordControl.active ? "Stop manual recording" : "Start manual recording"}
              >
                {recordControl.busy ? <Spinner size={13} /> : <RecordIcon className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
