#!/usr/bin/env bash
# Atomic frontend deploy for Portfolio-Manager.
#
# Builds the CRA app straight into frontend/releases/<utc-ts> (BUILD_PATH), then
# atomically repoints frontend/current at the new release. The static server
# (frontend/serve.js) resolves `current` per request, so the switch is
# millisecond-level and the old release keeps serving until the flip.
#
# If anything fails before the symlink flip, `current` is left untouched and
# the previous release keeps serving.
set -euo pipefail

FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../frontend" && pwd)"
RELEASES_DIR="$FRONTEND_DIR/releases"
CURRENT_LINK="$FRONTEND_DIR/current"
BUILD_MIRROR="$FRONTEND_DIR/build"
KEEP=3
PORT="${PORT:-5000}"

mkdir -p "$RELEASES_DIR"

# Unique release name (UTC timestamp; disambiguate same-second deploys).
TS="$(date -u +%Y%m%d-%H%M%S)"
RELEASE="$RELEASES_DIR/$TS"
while [ -e "$RELEASE" ]; do
  TS="${TS}x"
  RELEASE="$RELEASES_DIR/$TS"
done

echo "building frontend (release $TS)..."
cd "$FRONTEND_DIR"
# CRA supports BUILD_PATH: emit the build directly into the release dir so
# frontend/build is never wiped mid-deploy (other tools may serve it).
BUILD_PATH="releases/$TS" npm run build

if [ ! -f "$RELEASE/index.html" ]; then
  echo "build produced no index.html; aborting (current untouched)" >&2
  exit 1
fi

# Atomic switch: create the symlink under a temp name, then rename() over the
# existing `current` link. rename(2) is atomic, so readers never see a gap.
TMP_LINK="$CURRENT_LINK.tmp.$$"
ln -sfn "releases/$TS" "$TMP_LINK"
mv -T "$TMP_LINK" "$CURRENT_LINK"

# Keep frontend/build as a mirror of the latest release for tools that serve
# it directly (e.g. `serve -s frontend/build` in E2E runs). Swap via rename so
# the mirror is never absent.
rm -rf build.new build.old
cp -a "$RELEASE" build.new
[ -e "$BUILD_MIRROR" ] && mv "$BUILD_MIRROR" build.old
mv build.new "$BUILD_MIRROR"
rm -rf build.old

# Keep only the newest $KEEP releases.
cd "$RELEASES_DIR"
ls -1t | tail -n +$((KEEP + 1)) | while read -r old; do
  rm -rf -- "$RELEASES_DIR/$old"
done

echo "deployed $TS -> current"
curl -s "http://127.0.0.1:$PORT/__health"
echo
