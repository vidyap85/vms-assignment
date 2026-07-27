// Shared domain types matching the VMS backend API contract exactly.

export type Role = "ADMIN" | "OPERATOR" | "VIEWER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  enabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  cameraAccess?: { camera: Camera }[];
}

export type AuthUser = Pick<User, "id" | "email" | "name" | "role">;

export type CameraStatus = "ONLINE" | "OFFLINE";

export interface CameraGroup {
  id: string;
  name: string;
}

export interface Camera {
  id: string;
  name: string;
  location: string;
  rtspUrl: string;
  hlsUrl: string;
  groupId: string | null;
  resolution: string | null;
  fps: number | null;
  recordingEnabled: boolean;
  eventRecordingEnabled: boolean;
  enabled: boolean;
  status: CameraStatus;
  lastHeartbeat: string | null;
  streamKey: string;
  group: CameraGroup | null;
}

export type RecordingType = "CONTINUOUS" | "MANUAL" | "EVENT";
export type RecordingStatus = "RECORDING" | "COMPLETED" | "FAILED";

export interface Keyframe {
  id: string;
  recordingId: string;
  offsetSeconds: number;
  thumbnailPath: string;
}

export interface Recording {
  id: string;
  cameraId: string;
  type: RecordingType;
  startTime: string;
  endTime: string | null;
  filePath: string;
  fileSizeBytes: string | null;
  status: RecordingStatus;
  camera?: Camera;
  keyframes?: Keyframe[];
}

export interface Snapshot {
  id: string;
  cameraId: string;
  userId: string;
  filePath: string;
  createdAt: string;
  camera?: Camera;
}

export type EventType =
  | "CAMERA_OFFLINE"
  | "MOTION_DETECTED"
  | "RECORDING_STARTED"
  | "RECORDING_STOPPED"
  | "RECORDING_FAILURE"
  | "STORAGE_FULL"
  | "CAMERA_RECONNECTED"
  | "USER_LOGIN"
  | "USER_LOGOUT";

export type EventSeverity = "INFO" | "WARNING" | "CRITICAL";
export type EventStatus = "OPEN" | "CLOSED";

export interface VmsEvent {
  id: string;
  type: EventType;
  cameraId: string | null;
  userId: string | null;
  severity: EventSeverity;
  description: string;
  status: EventStatus;
  createdAt: string;
  camera?: Camera | null;
  user?: User | null;
}

export interface DashboardStats {
  totalCameras: number;
  onlineCameras: number;
  offlineCameras: number;
  activeLiveStreams: number;
  activeRecordings: number;
  storageUsedBytes: number;
  storageCapacityBytes: number;
  storageUsedPercent: number;
  recentEvents: VmsEvent[];
  cameraHealth: { id: string; name: string; status: CameraStatus; lastHeartbeat: string | null }[];
  systemUptimeSeconds: number;
  totalUsers: number;
  connectedClients: number;
}

export interface SearchResults {
  cameras: Camera[];
  recordings: Recording[];
  events: VmsEvent[];
  users: User[];
}

export interface AuditLog {
  id: string;
  userId: string | null;
  user?: User | null;
  action: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface RecordingActiveStatus {
  activeType: "MANUAL" | "EVENT" | null;
}

export interface TestConnectionResult {
  online: boolean;
}
