import { env } from '../../config/env';

export function rtspUrlFor(streamKey: string): string {
  return `${env.mediamtxRtspBase}/${streamKey}`;
}

export function hlsPathFor(streamKey: string): string {
  return `/hls/${streamKey}/index.m3u8`;
}
