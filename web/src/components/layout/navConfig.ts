import type { ComponentType, SVGProps } from "react";
import type { Role } from "../../types";
import {
  AuditIcon,
  CameraIcon,
  CommandIcon,
  DashboardIcon,
  EventsIcon,
  LiveIcon,
  PlaybackIcon,
  SearchIcon,
  SnapshotIcon,
  UsersIcon,
} from "../common/Icons";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: DashboardIcon, roles: ["ADMIN", "OPERATOR"] },
  { to: "/cameras", label: "Cameras", icon: CameraIcon, roles: ["ADMIN", "OPERATOR"] },
  { to: "/live", label: "Live View", icon: LiveIcon, roles: ["ADMIN", "OPERATOR", "VIEWER"] },
  { to: "/snapshots", label: "Snapshots", icon: SnapshotIcon, roles: ["ADMIN", "OPERATOR", "VIEWER"] },
  { to: "/playback", label: "Playback", icon: PlaybackIcon, roles: ["ADMIN", "OPERATOR"] },
  { to: "/command-center", label: "Command Center", icon: CommandIcon, roles: ["ADMIN", "OPERATOR"] },
  { to: "/events", label: "Events", icon: EventsIcon, roles: ["ADMIN", "OPERATOR"] },
  { to: "/search", label: "Search", icon: SearchIcon, roles: ["ADMIN", "OPERATOR", "VIEWER"] },
  { to: "/users", label: "Users & Roles", icon: UsersIcon, roles: ["ADMIN"] },
  { to: "/audit-logs", label: "Audit Logs", icon: AuditIcon, roles: ["ADMIN"] },
];
