import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { raiseEvent } from './events.service';

function dirSizeBytes(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirSizeBytes(full);
    else if (entry.isFile()) total += fs.statSync(full).size;
  }
  return total;
}

export function getStorageUsageBytes(): number {
  return dirSizeBytes(env.mediaRoot);
}

export const STORAGE_CAPACITY_BYTES = parseInt(process.env.STORAGE_CAPACITY_BYTES ?? String(20 * 1024 * 1024 * 1024), 10);

const START_TIME = Date.now();
export function getUptimeSeconds(): number {
  return Math.floor((Date.now() - START_TIME) / 1000);
}

const STORAGE_FULL_THRESHOLD_PERCENT = 90;
const STORAGE_MONITOR_INTERVAL_MS = 30_000;

/** Edge-triggered: raises STORAGE_FULL once when usage crosses the threshold, not on every tick. */
export function startStorageMonitorJob() {
  let wasFull = false;
  const tick = async () => {
    const usedBytes = getStorageUsageBytes();
    const percent = (usedBytes / STORAGE_CAPACITY_BYTES) * 100;
    const isFull = percent >= STORAGE_FULL_THRESHOLD_PERCENT;
    if (isFull && !wasFull) {
      await raiseEvent({
        type: 'STORAGE_FULL',
        severity: 'CRITICAL',
        description: `Storage usage reached ${percent.toFixed(0)}% of capacity (${formatGiB(usedBytes)} / ${formatGiB(STORAGE_CAPACITY_BYTES)})`,
      });
    }
    wasFull = isFull;
  };
  tick().catch((err) => console.error('Storage monitor tick failed', err));
  return setInterval(() => {
    tick().catch((err) => console.error('Storage monitor tick failed', err));
  }, STORAGE_MONITOR_INTERVAL_MS);
}

function formatGiB(bytes: number): string {
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GiB`;
}
