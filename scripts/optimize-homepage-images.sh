#!/usr/bin/env bash
# Resize and compress homepage images for faster load times.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

resize_jpeg() {
  local file="$1" max="$2" quality="${3:-82}"
  local tmp="${file}.opt.tmp.jpg"
  sips -Z "$max" -s format jpeg -s formatOptions "$quality" "$file" --out "$tmp" >/dev/null
  mv "$tmp" "$file"
}

resize_png() {
  local file="$1" max="$2"
  sips -Z "$max" "$file" >/dev/null
}

to_jpeg() {
  local src="$1" dest="$2" max="$3" quality="${4:-85}"
  sips -Z "$max" -s format jpeg -s formatOptions "$quality" "$src" --out "$dest" >/dev/null
}

echo "→ Hero poster"
# base.png is used directly on the homepage and insights page

echo "→ Work thumbnails (768px max, consistent square-ish)"
for f in lowpoly artwork tapes insights; do
  resize_jpeg "assets/thumbnails/${f}.jpg" 768 80
done

echo "→ Career card images (512px, JPEG)"
for f in favorite_album favorite_show favorite_artist favorite_escapism favorite_vibe; do
  to_jpeg "assets/${f}.png" "assets/${f}.jpg" 512 85
done
to_jpeg "assets/lowpoly4.jpg" "assets/favorite_aesthetic.jpg" 512 85

echo "→ Collaboration cards"
to_jpeg "assets/thumbnails/collab_sasha.png" "assets/thumbnails/collab_sasha.jpg" 800 85
to_jpeg "assets/thumbnails/collab_hytown.png" "assets/thumbnails/collab_hytown.jpg" 800 85

echo "→ Promo banner + portrait + stickers"
to_jpeg "assets/komorebi.png" "assets/komorebi.jpg" 1200 82
resize_jpeg "assets/polaroid.JPG" 900 82
resize_png "assets/sticker_02.png" 400
resize_png "assets/Bunny2.png" 400

echo "Done. Sizes:"
ls -lh assets/base.png assets/favorite_*.jpg assets/thumbnails/*.{jpg,JPG} assets/komorebi.jpg assets/polaroid.JPG 2>/dev/null
