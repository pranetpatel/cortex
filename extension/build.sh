#!/usr/bin/env bash
# Build the Cortex Web Clipper extension for Chrome and Firefox.
# Usage: bash extension/build.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="$SCRIPT_DIR/dist"

echo "Building Cortex Web Clipper..."

# ── Generate icons (if not already present) ──────────────────────────────────
if [ ! -f "$SCRIPT_DIR/icons/icon128.png" ]; then
  echo "  Generating icons..."
  node "$SCRIPT_DIR/generate-icons.js"
fi

# ── Chrome ────────────────────────────────────────────────────────────────────
CHROME="$OUT/chrome"
rm -rf "$CHROME"
mkdir -p "$CHROME/popup" "$CHROME/icons"

cp "$SCRIPT_DIR/manifest.json"   "$CHROME/manifest.json"
cp "$SCRIPT_DIR/background.js"   "$CHROME/"
cp "$SCRIPT_DIR/content.js"      "$CHROME/"
cp "$SCRIPT_DIR/popup/popup.html" "$CHROME/popup/"
cp "$SCRIPT_DIR/popup/popup.css"  "$CHROME/popup/"
cp "$SCRIPT_DIR/popup/popup.js"   "$CHROME/popup/"
cp "$SCRIPT_DIR/icons/"*.png      "$CHROME/icons/"

echo "  ✓ Chrome  → dist/chrome/"

# ── Firefox ───────────────────────────────────────────────────────────────────
FIREFOX="$OUT/firefox"
rm -rf "$FIREFOX"
mkdir -p "$FIREFOX/popup" "$FIREFOX/icons"

cp "$SCRIPT_DIR/manifest.firefox.json" "$FIREFOX/manifest.json"
cp "$SCRIPT_DIR/background.js"         "$FIREFOX/"
cp "$SCRIPT_DIR/content.js"            "$FIREFOX/"
cp "$SCRIPT_DIR/popup/popup.html"      "$FIREFOX/popup/"
cp "$SCRIPT_DIR/popup/popup.css"       "$FIREFOX/popup/"
cp "$SCRIPT_DIR/popup/popup.js"        "$FIREFOX/popup/"
cp "$SCRIPT_DIR/icons/"*.png           "$FIREFOX/icons/"

echo "  ✓ Firefox → dist/firefox/"

echo ""
echo "Done. Load the unpacked extension from:"
echo "  Chrome:  chrome://extensions  → 'Load unpacked' → dist/chrome/"
echo "  Firefox: about:debugging      → 'Load Temporary Add-on' → dist/firefox/manifest.json"
