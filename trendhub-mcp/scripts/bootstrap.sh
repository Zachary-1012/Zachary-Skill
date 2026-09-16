#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="https://nodejs.org/dist/latest-v24.x"
CACHE_ROOT="${XDG_CACHE_HOME:-${HOME}/.cache}/trendhub/node24"

log() { printf '[bootstrap] %s\n' "$*"; }
fail() { printf '[bootstrap] ERROR: %s\n' "$*" >&2; exit 1; }

node_major() {
  "$1" -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || printf '0'
}

run_setup() {
  local node_bin="$1"
  shift
  export PATH="$(dirname "$node_bin"):${PATH}"
  log "Using Node $($node_bin --version)"

  if "$node_bin" "$ROOT/scripts/setup.mjs" "$@"; then
    :
  else
    local status=$?
    exit "$status"
  fi

  local launcher="$ROOT/scripts/launcher.mjs"
  "$node_bin" -e 'const launcher=process.argv[1]; console.log("AI_BOOTSTRAP_OK "+JSON.stringify({node:process.execPath,launcher}));' "$launcher"
  exit 0
}

if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
  MAJOR="$(node_major "$NODE_BIN")"
  if [ "$MAJOR" -ge 22 ] 2>/dev/null; then
    run_setup "$NODE_BIN" "$@"
  fi
  log "Existing Node $($NODE_BIN --version 2>/dev/null || printf 'unknown') is below 22; using a verified portable Node 24 LTS for TrendHub."
else
  log "Node.js not found; installing a verified portable Node 24 LTS for TrendHub."
fi

case "$(uname -s)" in
  Linux) PLATFORM="linux" ;;
  Darwin) PLATFORM="darwin" ;;
  *) fail "Unsupported OS: $(uname -s). Use Windows bootstrap.ps1 on Windows." ;;
esac

case "$(uname -m)" in
  x86_64|amd64) ARCH="x64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *) fail "Unsupported CPU architecture: $(uname -m). Supported: x64, arm64." ;;
esac

command -v tar >/dev/null 2>&1 || fail "tar is required to unpack the portable Node runtime."

TMP_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t trendhub-bootstrap)"
trap 'rm -rf "$TMP_DIR"' EXIT
SUMS="$TMP_DIR/SHASUMS256.txt"

fetch_file() {
  local url="$1"
  local out="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fL --retry 3 --connect-timeout 15 "$url" -o "$out"
  elif command -v wget >/dev/null 2>&1; then
    wget -q --https-only -O "$out" "$url"
  else
    fail "curl or wget is required to download Node 24 LTS."
  fi
}

log "Reading Node 24 LTS checksums from nodejs.org"
fetch_file "$BASE_URL/SHASUMS256.txt" "$SUMS"
PATTERN="^node-v24\\.[0-9]+\\.[0-9]+-${PLATFORM}-${ARCH}\\.tar\\.gz$"
FILENAME="$(awk -v pattern="$PATTERN" '$2 ~ pattern { print $2; exit }' "$SUMS")"
[ -n "$FILENAME" ] || fail "Could not find a Node 24 LTS archive for ${PLATFORM}-${ARCH}."
EXPECTED="$(awk -v file="$FILENAME" '$2 == file { print $1; exit }' "$SUMS")"
[ -n "$EXPECTED" ] || fail "Could not find SHA-256 for $FILENAME."

VERSION_DIR="${FILENAME%.tar.gz}"
NODE_HOME="$CACHE_ROOT/$VERSION_DIR"
NODE_BIN="$NODE_HOME/bin/node"

if [ ! -x "$NODE_BIN" ]; then
  mkdir -p "$CACHE_ROOT"
  ARCHIVE="$TMP_DIR/$FILENAME"
  log "Downloading $FILENAME"
  fetch_file "$BASE_URL/$FILENAME" "$ARCHIVE"

  if command -v sha256sum >/dev/null 2>&1; then
    ACTUAL="$(sha256sum "$ARCHIVE" | awk '{print $1}')"
  elif command -v shasum >/dev/null 2>&1; then
    ACTUAL="$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')"
  else
    fail "sha256sum or shasum is required to verify the Node download."
  fi

  [ "$ACTUAL" = "$EXPECTED" ] || fail "Node archive SHA-256 mismatch; refusing to execute it."
  tar -xzf "$ARCHIVE" -C "$CACHE_ROOT"
fi

[ -x "$NODE_BIN" ] || fail "Portable Node runtime was not installed correctly."
MAJOR="$(node_major "$NODE_BIN")"
[ "$MAJOR" -ge 22 ] 2>/dev/null || fail "Downloaded Node runtime is unexpectedly below 22."

run_setup "$NODE_BIN" "$@"
