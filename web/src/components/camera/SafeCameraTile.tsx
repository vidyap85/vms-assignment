import ErrorBoundary from "../common/ErrorBoundary";
import CameraTile from "./CameraTile";
import type { Camera } from "../../types";

interface RecordControl {
  active: boolean;
  busy: boolean;
  onToggle: () => void;
}

interface SafeCameraTileProps {
  camera: Camera;
  recording?: boolean;
  compact?: boolean;
  recordControl?: RecordControl;
}

/**
 * Wraps a single camera tile in its own error boundary so that a crash triggered by one
 * camera's stream (e.g. an hls.js parsing failure on a malformed/interrupted response)
 * can't take down the rest of the grid or the whole page — only that tile shows an error.
 * Resets automatically whenever the camera's status changes, so a tile that broke while a
 * camera was flapping gets another chance once it settles rather than staying dead forever.
 */
export default function SafeCameraTile(props: SafeCameraTileProps) {
  return (
    <ErrorBoundary
      resetKey={props.camera.status}
      fallback={() => (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-lg border border-danger/40 bg-surface-900 text-danger-soft">
          <span className="text-xs uppercase tracking-wide">Tile Error</span>
          <span className="text-[11px] text-surface-500">{props.camera.name}</span>
        </div>
      )}
    >
      <CameraTile {...props} />
    </ErrorBoundary>
  );
}
