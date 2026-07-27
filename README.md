# Video Management System (VMS)

A web-based Video Management System: multi-camera live view, continuous/manual/event recording with a keyframe playback timeline, a real-time Central Command Center, event management, search, and full RBAC — built for the Zenith Technologies full-stack assignment.

## Contents

- [Architecture](#architecture)
- [Important assumption: simulated cameras](#important-assumption-simulated-cameras)
- [Quick start (Docker)](#quick-start-docker)
- [Default accounts](#default-accounts)
- [Configuration](#configuration)
- [Project structure](#project-structure)
- [REST API documentation](#rest-api-documentation)
- [Local (non-Docker) development](#local-non-docker-development)
- [Troubleshooting](#troubleshooting)

## Architecture

```
                    ┌──────────────┐
   browser ───────▶ │  nginx (web) │  single entry point, http://localhost:8090
                    └──────┬───────┘
             ┌─────────────┼───────────────┬───────────────┐
             ▼              ▼               ▼               ▼
      React static    /api, /socket.io  /hls (proxy      /media (static,
      build                │            to mediamtx)      shared volume)
                            ▼
                     ┌─────────────┐        ┌──────────────┐
                     │  api (Node/ │◀──────▶│  postgres    │
                     │  Express+TS)│        └──────────────┘
                     │  + Socket.IO│
                     │  + recorder │───ffmpeg pulls RTSP, writes
                     │  workers    │   segments + keyframe thumbnails
                     └──────┬──────┘   to the shared /media volume
                            │ RTSP pull (recording) + heartbeat probe
                            ▼
                     ┌─────────────┐        ┌──────────────┐
                     │  mediamtx   │◀──RTSP publish──│ camera-sim   │
                     │ (RTSP/HLS   │        │ (ffmpeg, N       │
                     │  server)    │        │  simulated cams) │
                     └─────────────┘        └──────────────┘
```

Five containers, orchestrated by `docker-compose.yml`:

| Service      | Role |
|--------------|------|
| `postgres`   | Application database |
| `mediamtx`   | RTSP ingest + HLS output media server ([bluenviron/mediamtx](https://github.com/bluenviron/mediamtx)) |
| `camera-sim` | Publishes N procedurally-generated video feeds into MediaMTX over RTSP, standing in for real IP cameras |
| `api`        | Express REST API + Socket.IO + the recording pipeline (ffmpeg child processes, run in-process, no separate "recorder" container) |
| `web`        | React SPA served by nginx, which also reverse-proxies `/api`, `/socket.io`, `/hls` and serves `/media` statically |

## Important assumption: simulated cameras

There are no physical IP cameras available for this assignment, and browsers can't play raw RTSP directly. So the pipeline is real end-to-end, but the *camera source* is simulated:

- `camera-sim` runs `ffmpeg` loops that generate procedural test-pattern video (color bars, Conway's Life, RGB/YUV test patterns, etc., each labelled with a camera name/timestamp overlay so tiles are visually distinguishable) and **publishes them as real RTSP streams** into MediaMTX — exactly how a real IP camera would.
- MediaMTX re-serves those RTSP streams as HLS for the browser, and the `api` service's recorder **actually pulls the RTSP stream and segments it to disk** with `ffmpeg`, generating real keyframe thumbnails — this is a genuine recording pipeline, not mocked data.
- The **Add Camera** form's RTSP URL field is fully functional, not cosmetic: recording (continuous/manual/event), snapshots, and online/offline heartbeat checks all connect to whatever `rtspUrl` is stored for a camera, probed directly with `ffprobe`/`ffmpeg` — so adding a camera with a real IP camera's RTSP URL genuinely records and monitors it. The one piece that doesn't automatically follow is **Live View (HLS in the browser)**, which only works for the built-in simulated cameras, since those are the only streams actually published into MediaMTX for HLS relay — wiring a real camera into MediaMTX (e.g. via its runtime path-add API) is the natural next step but isn't done here.
- **Motion detection is simulated**, not computer-vision-based: a background job raises a `MOTION_DETECTED` event for an online camera at a small random probability every ~20s (tunable via the `MOTION_PROBABILITY`/`MOTION_CHECK_INTERVAL_MS` env vars, not exposed in `.env.example` since the defaults are fine for a demo). This is enough to exercise the full events → event-recording → command-center pipeline end to end, which is the point of the demo. Swapping in a real motion-detection model would only touch `api/src/services/motion-sim.service.ts`.
- "System Uptime" on the dashboard is the `api` process's uptime (resets on container restart), not host OS uptime.

## Quick start (Docker)

Requires Docker Desktop (or Docker Engine + Compose v2).

```bash
cp .env.example .env      # defaults work out of the box; edit if you want
docker compose up --build
```

First boot takes a few minutes: images build, Postgres initializes, and the seed script generates a handful of demo recordings with ffmpeg so Playback/Search aren't empty on first login. Camera streams and new continuous recordings appear within the first ~1-2 minutes as `camera-sim` and the recorder pipeline spin up.

Once running:

- App: **http://localhost:8090**
- API health check: **http://localhost:8090/api/health**
- API docs (Swagger UI): **http://localhost:8090/api/docs**

To stop: `docker compose down` (add `-v` to also wipe the database and recorded media).

## Default accounts

Seeded automatically on first boot (`api/prisma/seed.ts`):

| Role | Email | Password |
|------|-------|----------|
| Administrator | `admin@vms.local` | `Admin@123` |
| Operator | `operator@vms.local` | `Operator@123` |
| Viewer (sees first half of cameras) | `viewer1@vms.local` | `Viewer@123` |
| Viewer (sees second half of cameras) | `viewer2@vms.local` | `Viewer@123` |

Change these before any real deployment — see [Configuration](#configuration).

## Configuration

All configuration lives in `.env` at the repo root (see `.env.example`), read by `docker-compose.yml`:

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `vms` / `vms` / `vms_password` | Database credentials |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | dev placeholders | **Change these for any non-local use** |
| `WEB_ORIGIN` | `http://localhost:8090` | Origin allowed by CORS / used for cookie scoping |
| `WEB_PORT` | `8090` | Host port nginx is published on |
| `CAMERA_COUNT` | `9` | Number of simulated RTSP cameras published and seeded (fills the 9-camera live view grid) |
| `RECORDING_SEGMENT_SECONDS` | `60` | Continuous-recording segment length (also the keyframe interval for continuous recordings) |
| `KEYFRAME_INTERVAL_SECONDS` | `30` | Keyframe thumbnail interval for manual/event recordings |
| `STORAGE_CAPACITY_BYTES` | `21474836480` (20 GiB) | Denominator used only to compute the storage-usage % shown on the dashboard |

## Project structure

```
api/            Express + TypeScript REST API, Socket.IO, ffmpeg-based recorder, Prisma/Postgres
  src/modules/  auth, cameras, recordings, snapshots, events, users, dashboard, search, audit — routes per feature
  src/services/ recorder.service.ts (ffmpeg orchestration), mediamtx.service.ts (heartbeat), 
                motion-sim.service.ts, socket.service.ts, storage.service.ts
  prisma/       schema.prisma (data model) and seed.ts (demo data + demo recordings)
  openapi.yaml  REST API spec, served at /api/docs via Swagger UI
web/            React + Vite + TypeScript + Tailwind frontend
mediamtx/       mediamtx.yml — RTSP/HLS media server config
camera-sim/     Dockerfile + entrypoint.sh — simulated camera publishers
docker-compose.yml
```

## REST API documentation

Full OpenAPI 3 spec: [`api/openapi.yaml`](api/openapi.yaml), served interactively at **`/api/docs`** once the stack is running (Swagger UI). Covers every endpoint: auth, cameras, recordings (incl. manual recording control and download), snapshots, events, users, dashboard stats, search, and audit logs.

Real-time updates (not in OpenAPI, since it's Socket.IO not REST) are pushed on the same origin at `/socket.io`, authenticated via `{ auth: { token: <accessToken> } }`, emitting: `camera:status`, `event:new`, `recording:status`, `dashboard:stats` (~every 5s), `audit:new`.

## Local (non-Docker) development

You'll need Node 20+, a local Postgres, and `ffmpeg`/`ffprobe` on your `PATH` for the API (recording/snapshots/seed won't work without it, but the rest of the API will).

```bash
# API
cd api
cp .env.example .env   # adjust DATABASE_URL etc.
npm install
npx prisma db push
npx prisma db seed
npm run dev             # http://localhost:4000

# Web
cd web
npm install
npm run dev              # http://localhost:5173, proxies /api, /socket.io, /hls, /media to :4000
```

Note: without `mediamtx` + `camera-sim` running too, cameras will show as offline and there will be nothing to record — for the full experience, run the whole stack via `docker compose up`.

## Troubleshooting

- **Cameras stuck OFFLINE**: `camera-sim` and `mediamtx` take a few seconds to come up; the heartbeat job polls every ~10s. Check `docker compose logs camera-sim mediamtx`.
- **No recordings appear in Playback**: continuous recordings only get registered once a full segment (`RECORDING_SEGMENT_SECONDS`, default 60s) has finished writing — give it a couple of minutes, or check the seeded demo recordings which are available immediately.
- **`ffmpeg`/`ffprobe` not found (local dev only)**: install ffmpeg and ensure it's on `PATH`; not needed if you're only running the frontend against Docker's `api` service.
- **Port 8090 already in use**: change `WEB_PORT` in `.env`.
- **Running low on storage**: continuous recording never stops on its own, so `/media` grows without bound. An Admin can delete individual recordings from the Playback page (removes the video file, its keyframe thumbnails, and the database record) — hover a recording in the list and click the trash icon. There's no automatic retention/cleanup policy yet; for a real deployment you'd want one (e.g. purge continuous recordings older than N days), which isn't implemented here.
