import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { PrismaClient, Prisma } from '@prisma/client';
import { spawn } from 'child_process';
import { env } from '../src/config/env';
import { ensureDir, extractThumbnail } from '../src/utils/ffmpeg';

const prisma = new PrismaClient();

// mandelbrot deliberately excluded: its per-pixel fractal computation makes it far
// slower to encode than the other sources, which matters for a snappy first boot.
const LAVFI_SOURCES = ['testsrc2', 'smptebars', 'yuvtestsrc', 'rgbtestsrc', 'life', 'testsrc2', 'smptebars', 'yuvtestsrc', 'rgbtestsrc'];

function generateClip(camName: string, lavfi: string, durationSeconds: number, outFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use a global -t instead of a per-source duration= option: not every lavfi
    // source (e.g. mandelbrot) accepts a duration= filter option.
    const src = `${lavfi}=size=1280x720:rate=25`;
    const proc = spawn('ffmpeg', [
      '-y',
      '-f', 'lavfi',
      '-i', src,
      '-t', String(durationSeconds),
      '-vf', `drawtext=text='${camName.replace(/'/g, '')} (demo)':fontsize=28:fontcolor=white:box=1:boxcolor=black@0.5:x=10:y=10`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outFile,
    ]);
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(stderr.slice(-500)))));
    proc.on('error', reject);
  });
}

async function main() {
  const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@vms.local' } });
  if (existingAdmin) {
    console.log('Database already seeded, skipping.');
    return;
  }

  console.log('Seeding camera groups...');
  const groups = await Promise.all(
    ['Main Entrance', 'Parking Lot', 'Warehouse'].map((name) => prisma.cameraGroup.create({ data: { name } }))
  );

  console.log(`Seeding ${env.cameraCount} simulated cameras...`);
  const cameraNames = [
    'Front Gate', 'Lobby', 'Loading Dock', 'North Lot', 'South Lot',
    'Warehouse Aisle 1', 'Warehouse Aisle 2', 'Rear Exit', 'Rooftop',
    'Server Room', 'Reception', 'East Perimeter', 'West Perimeter', 'Break Room', 'Stairwell A', 'Stairwell B',
  ];

  const cameras = [];
  for (let i = 1; i <= env.cameraCount; i++) {
    const camera = await prisma.camera.create({
      data: {
        name: cameraNames[(i - 1) % cameraNames.length] + (i > cameraNames.length ? ` ${i}` : ''),
        location: groups[(i - 1) % groups.length].name,
        rtspUrl: `${env.mediamtxRtspBase}/cam${i}`,
        groupId: groups[(i - 1) % groups.length].id,
        resolution: '1280x720',
        fps: 25,
        recordingEnabled: true,
        eventRecordingEnabled: true,
        enabled: true,
        streamKey: `cam${i}`,
      },
    });
    cameras.push(camera);
  }

  console.log('Seeding 2 offline demo cameras...');
  const offlineCam1 = await prisma.camera.create({
    data: {
      name: 'Old Archive Cam',
      location: 'Warehouse',
      rtspUrl: `${env.mediamtxRtspBase}/camoffline1`,
      groupId: groups[2].id,
      recordingEnabled: false,
      eventRecordingEnabled: false,
      enabled: true,
      status: 'OFFLINE',
      streamKey: 'camoffline1',
    },
  });
  const offlineCam2 = await prisma.camera.create({
    data: {
      name: 'Decommissioned Cam',
      location: 'Parking Lot',
      rtspUrl: `${env.mediamtxRtspBase}/camoffline2`,
      groupId: groups[1].id,
      recordingEnabled: false,
      eventRecordingEnabled: false,
      enabled: false,
      status: 'OFFLINE',
      streamKey: 'camoffline2',
    },
  });

  console.log('Seeding users...');
  const [adminHash, operatorHash, viewerHash] = await Promise.all([
    bcrypt.hash('Admin@123', 10),
    bcrypt.hash('Operator@123', 10),
    bcrypt.hash('Viewer@123', 10),
  ]);

  await prisma.user.create({
    data: { name: 'Alice Admin', email: 'admin@vms.local', passwordHash: adminHash, role: 'ADMIN' },
  });
  await prisma.user.create({
    data: { name: 'Oscar Operator', email: 'operator@vms.local', passwordHash: operatorHash, role: 'OPERATOR' },
  });
  await prisma.user.create({
    data: {
      name: 'Vera Viewer',
      email: 'viewer1@vms.local',
      passwordHash: viewerHash,
      role: 'VIEWER',
      cameraAccess: { create: cameras.slice(0, Math.ceil(cameras.length / 2)).map((c) => ({ cameraId: c.id })) },
    },
  });
  await prisma.user.create({
    data: {
      name: 'Victor Viewer',
      email: 'viewer2@vms.local',
      passwordHash: viewerHash,
      role: 'VIEWER',
      cameraAccess: { create: cameras.slice(Math.ceil(cameras.length / 2)).map((c) => ({ cameraId: c.id })) },
    },
  });

  console.log('Seeding historical events...');
  const now = Date.now();
  const historicalEvents: Prisma.EventCreateManyInput[] = [
    {
      type: 'CAMERA_OFFLINE',
      cameraId: offlineCam1.id,
      severity: 'WARNING',
      description: `${offlineCam1.name} went offline`,
      status: 'OPEN',
      createdAt: new Date(now - 3 * 3600_000),
    },
    {
      type: 'MOTION_DETECTED',
      cameraId: cameras[0].id,
      severity: 'WARNING',
      description: `Motion detected at ${cameras[0].name}`,
      status: 'CLOSED',
      createdAt: new Date(now - 5 * 3600_000),
    },
    {
      type: 'STORAGE_FULL',
      severity: 'CRITICAL',
      description: 'Storage usage exceeded 90% (demo event)',
      status: 'CLOSED',
      createdAt: new Date(now - 26 * 3600_000),
    },
  ];
  if (cameras[1]) {
    historicalEvents.push({
      type: 'CAMERA_RECONNECTED',
      cameraId: cameras[1].id,
      severity: 'INFO',
      description: `${cameras[1].name} reconnected`,
      status: 'CLOSED',
      createdAt: new Date(now - 22 * 3600_000),
    });
  }
  await prisma.event.createMany({ data: historicalEvents });

  console.log('Generating demo recordings (this takes a minute)...');
  const demoCount = Math.min(cameras.length, 4);
  for (let i = 0; i < demoCount; i++) {
    const camera = cameras[i];
    for (let j = 0; j < 2; j++) {
      const durationSeconds = 45;
      const startTime = new Date(now - (j + 1) * 20 * 3600_000);
      const dir = path.join(env.mediaRoot, 'recordings', 'continuous', camera.id);
      ensureDir(dir);
      const filename = `${startTime.toISOString().replace(/[:.]/g, '-')}.mp4`;
      const filePath = path.join(dir, filename);
      const lavfi = LAVFI_SOURCES[i % LAVFI_SOURCES.length];
      try {
        await generateClip(camera.name, lavfi, durationSeconds, filePath);
        const stat = fs.statSync(filePath);
        const recording = await prisma.recording.create({
          data: {
            cameraId: camera.id,
            type: 'CONTINUOUS',
            startTime,
            endTime: new Date(startTime.getTime() + durationSeconds * 1000),
            filePath,
            fileSizeBytes: BigInt(stat.size),
            status: 'COMPLETED',
          },
        });
        const thumbDir = path.join(env.mediaRoot, 'thumbnails', recording.id);
        ensureDir(thumbDir);
        for (let offset = 0; offset < durationSeconds; offset += 30) {
          const thumbPath = path.join(thumbDir, `thumb_${offset}.jpg`);
          await extractThumbnail(filePath, offset, thumbPath);
          await prisma.keyframe.create({ data: { recordingId: recording.id, offsetSeconds: offset, thumbnailPath: thumbPath } });
        }
        console.log(`  seeded recording for ${camera.name} (${j + 1}/2)`);
      } catch (err) {
        console.error(`  failed to generate demo recording for ${camera.name}:`, err);
      }
    }
  }

  console.log('Seed complete.');
  console.log('Login with: admin@vms.local / Admin@123, operator@vms.local / Operator@123, viewer1@vms.local / Viewer@123');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
