#!/bin/bash
# Publishes CAMERA_COUNT procedurally-generated video feeds into MediaMTX over RTSP,
# standing in for real IP cameras (see README for why: no physical cameras are available).

set -u

CAMERA_COUNT="${CAMERA_COUNT:-9}"
MEDIAMTX_HOST="${MEDIAMTX_HOST:-mediamtx}"
MEDIAMTX_RTSP_PORT="${MEDIAMTX_RTSP_PORT:-8554}"

# mandelbrot deliberately excluded: its per-pixel fractal computation is far more
# CPU-expensive than the other sources across N concurrently-encoded live streams.
SOURCES=(testsrc2 smptebars yuvtestsrc rgbtestsrc life testsrc2 smptebars yuvtestsrc rgbtestsrc)
NAMES=("Front Gate" "Lobby" "Loading Dock" "North Lot" "South Lot" "Warehouse Aisle 1" "Warehouse Aisle 2" "Rear Exit" "Rooftop" "Server Room" "Reception" "East Perimeter" "West Perimeter" "Break Room" "Stairwell A" "Stairwell B")

publish_camera() {
  local idx="$1"
  local src="${SOURCES[$(( (idx - 1) % ${#SOURCES[@]} ))]}"
  local name="${NAMES[$(( (idx - 1) % ${#NAMES[@]} ))]}"
  local path="cam${idx}"

  echo "[camera-sim] starting publisher for ${path} (${name}, source=${src})"

  while true; do
    ffmpeg -nostdin -re \
      -f lavfi -i "${src}=size=1280x720:rate=25" \
      -vf "drawtext=fontfile=/usr/share/fonts/dejavu/DejaVuSans.ttf:text='CAM ${idx} - ${name}  %{localtime}':fontsize=26:fontcolor=white:box=1:boxcolor=black@0.5:x=10:y=h-40" \
      -c:v libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p -g 50 \
      -f rtsp -rtsp_transport tcp \
      "rtsp://${MEDIAMTX_HOST}:${MEDIAMTX_RTSP_PORT}/${path}" \
      >/dev/null 2>&1
    echo "[camera-sim] publisher for ${path} exited, retrying in 3s"
    sleep 3
  done
}

for i in $(seq 1 "${CAMERA_COUNT}"); do
  publish_camera "$i" &
  sleep 0.5
done

wait
