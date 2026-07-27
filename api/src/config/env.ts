import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  databaseUrl: required('DATABASE_URL'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL ?? '7d',
  refreshTokenTtlMs: 7 * 24 * 60 * 60 * 1000,
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:8090',
  cameraCount: parseInt(process.env.CAMERA_COUNT ?? '9', 10),
  mediamtxRtspBase: process.env.MEDIAMTX_RTSP_BASE ?? 'rtsp://mediamtx:8554',
  mediaRoot: process.env.MEDIA_ROOT ?? '/media',
  recordingSegmentSeconds: parseInt(process.env.RECORDING_SEGMENT_SECONDS ?? '60', 10),
  keyframeIntervalSeconds: parseInt(process.env.KEYFRAME_INTERVAL_SECONDS ?? '30', 10),
  heartbeatIntervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS ?? '10000', 10),
  motionCheckIntervalMs: parseInt(process.env.MOTION_CHECK_INTERVAL_MS ?? '20000', 10),
  motionProbability: parseFloat(process.env.MOTION_PROBABILITY ?? '0.15'),
  dashboardPushIntervalMs: parseInt(process.env.DASHBOARD_PUSH_INTERVAL_MS ?? '5000', 10),
};
