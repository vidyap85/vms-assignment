// Minimal inline stroke-icon set (no external icon library dependency).
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const DashboardIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="8" height="8" rx="1.5" />
    <rect x="13" y="3" width="8" height="5" rx="1.5" />
    <rect x="13" y="10" width="8" height="11" rx="1.5" />
    <rect x="3" y="13" width="8" height="8" rx="1.5" />
  </svg>
);

export const CameraIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 8a2 2 0 0 1 2-2h3l1.5-2h5L16 6h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const LiveIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="14" height="14" rx="2" />
    <path d="M17 9.5 21 7v10l-4-2.5" />
  </svg>
);

export const PlaybackIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 9l5 3-5 3V9Z" fill="currentColor" stroke="none" />
  </svg>
);

export const CommandIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 4h7v7H4zM13 4h7v7h-7zM13 13h7v7h-7zM4 13h7v7H4z" />
  </svg>
);

export const EventsIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 2 3 7v6c0 5 4 8 9 9 5-1 9-4 9-9V7l-9-5Z" />
    <path d="M12 8v5" />
    <circle cx="12" cy="16.2" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const UsersIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
    <circle cx="17.5" cy="8.5" r="2.7" />
    <path d="M16 13.2c2.7.4 4.8 2.7 4.8 5.5" />
  </svg>
);

export const AuditIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v5h5" />
    <path d="M8 13h8M8 17h5" />
  </svg>
);

export const LogoutIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

export const MenuIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const FullscreenIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
  </svg>
);

export const ZoomInIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M11 8v6M8 11h6M21 21l-4.3-4.3" />
  </svg>
);

export const ZoomOutIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M8 11h6M21 21l-4.3-4.3" />
  </svg>
);

export const SnapshotIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 8a2 2 0 0 1 2-2h2l1.4-2h7.2L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
);

export const RecordIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8" fill="currentColor" stroke="none" />
  </svg>
);

export const DownloadIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M12 3v12m0 0-4-4m4 4 4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);

export const PlayIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />
  </svg>
);

export const PauseIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <rect x="6" y="5" width="4" height="14" fill="currentColor" stroke="none" />
    <rect x="14" y="5" width="4" height="14" fill="currentColor" stroke="none" />
  </svg>
);

export const FastForwardIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M4 5.5v13l8-6.5-8-6.5Z" fill="currentColor" stroke="none" />
    <path d="M13 5.5v13l8-6.5-8-6.5Z" fill="currentColor" stroke="none" />
  </svg>
);

export const RefreshIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);

export const AlertIcon = (p: IconProps) => (
  <svg {...base} {...p}>
    <path d="M10.3 3.9 2.8 17a1.6 1.6 0 0 0 1.4 2.4h15.6a1.6 1.6 0 0 0 1.4-2.4L13.7 3.9a1.6 1.6 0 0 0-2.8 0Z" />
    <path d="M12 9.5v4" />
    <circle cx="12" cy="16.2" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);
