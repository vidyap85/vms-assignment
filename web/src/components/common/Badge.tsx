import type { CameraStatus, EventSeverity, EventStatus, RecordingStatus, Role } from "../../types";

export function StatusBadge({ status }: { status: CameraStatus }) {
  const online = status === "ONLINE";
  return (
    <span
      className={`badge ${
        online ? "bg-ok/15 text-ok-soft" : "bg-danger/15 text-danger-soft"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-ok" : "bg-danger"}`} />
      {status}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: EventSeverity }) {
  const styles: Record<EventSeverity, string> = {
    INFO: "bg-surface-700 text-surface-200",
    WARNING: "bg-warn/15 text-warn-soft",
    CRITICAL: "bg-danger/15 text-danger-soft",
  };
  return <span className={`badge ${styles[severity]}`}>{severity}</span>;
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const open = status === "OPEN";
  return (
    <span className={`badge ${open ? "bg-warn/15 text-warn-soft" : "bg-surface-700 text-surface-300"}`}>
      {status}
    </span>
  );
}

export function RecordingStatusBadge({ status }: { status: RecordingStatus }) {
  const styles: Record<RecordingStatus, string> = {
    RECORDING: "bg-danger/15 text-danger-soft",
    COMPLETED: "bg-ok/15 text-ok-soft",
    FAILED: "bg-danger/15 text-danger-soft",
  };
  return <span className={`badge ${styles[status]}`}>{status}</span>;
}

export function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    ADMIN: "bg-accent/15 text-accent-soft",
    OPERATOR: "bg-chart-blue/15 text-chart-blue",
    VIEWER: "bg-surface-700 text-surface-300",
  };
  return <span className={`badge ${styles[role]}`}>{role}</span>;
}

export function EnabledBadge({ enabled }: { enabled: boolean }) {
  return (
    <span className={`badge ${enabled ? "bg-ok/15 text-ok-soft" : "bg-surface-700 text-surface-400"}`}>
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}
