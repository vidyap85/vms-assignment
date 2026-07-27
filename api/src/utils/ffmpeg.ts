import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import fs from 'fs';

export function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function spawnFfmpeg(args: string[]): ChildProcessWithoutNullStreams {
  const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });
  return proc;
}

export function extractThumbnail(inputFile: string, atSeconds: number, outFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-y',
      '-ss', String(Math.max(0, atSeconds)),
      '-i', inputFile,
      '-frames:v', '1',
      '-q:v', '4',
      outFile,
    ]);
    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg thumbnail failed (${code}): ${stderr.slice(-500)}`));
    });
    proc.on('error', reject);
  });
}

export function probeDurationSeconds(inputFile: string): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      inputFile,
    ]);
    let out = '';
    proc.stdout.on('data', (d) => (out += d.toString()));
    proc.on('exit', () => resolve(parseFloat(out.trim()) || 0));
    proc.on('error', () => resolve(0));
  });
}
