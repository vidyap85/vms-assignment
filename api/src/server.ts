import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { initSocket, socketEvents } from './services/socket.service';
import { initRecorder } from './services/recorder.service';
import { startHeartbeatJob } from './services/mediamtx.service';
import { startMotionSimJob } from './services/motion-sim.service';
import { startStorageMonitorJob } from './services/storage.service';

import { authRouter } from './modules/auth/auth.routes';
import { camerasRouter } from './modules/cameras/cameras.routes';
import { recordingsRouter } from './modules/recordings/recordings.routes';
import { snapshotsRouter } from './modules/snapshots/snapshots.routes';
import { eventsRouter } from './modules/events/events.routes';
import { usersRouter } from './modules/users/users.routes';
import { dashboardRouter, buildDashboardStats } from './modules/dashboard/dashboard.routes';
import { searchRouter } from './modules/search/search.routes';
import { auditRouter } from './modules/audit/audit.routes';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: env.webOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.use(
  '/api/auth/login',
  rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false })
);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const openapiPath = path.join(__dirname, '..', 'openapi.yaml');
if (fs.existsSync(openapiPath)) {
  const openapiDoc = YAML.load(openapiPath);
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));
}

app.use('/api/auth', authRouter);
app.use('/api/cameras', camerasRouter);
app.use('/api/recordings', recordingsRouter);
app.use('/api/snapshots', snapshotsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/users', usersRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/search', searchRouter);
app.use('/api/audit-logs', auditRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(env.port, () => {
  console.log(`VMS API listening on port ${env.port}`);

  initRecorder().catch((err) => console.error('Failed to init recorder', err));
  startHeartbeatJob();
  startMotionSimJob();
  startStorageMonitorJob();

  setInterval(() => {
    buildDashboardStats()
      .then((stats) => socketEvents.dashboardStats(stats))
      .catch((err) => console.error('Failed to push dashboard stats', err));
  }, env.dashboardPushIntervalMs);
});
