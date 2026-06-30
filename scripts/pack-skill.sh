#!/usr/bin/env bash
#
# Build the downloadable DICOM Printer 2 Config Assistant skill bundle from the
# tracked source in skills/dicom-printer-2-config/ into the published site's
# static assets (docs/public/). The zip is what users download from the
# "AI Config Assistant" docs page.
#
# Run from anywhere:  bash scripts/pack-skill.sh
# It is also invoked automatically by `docs:build`, so the published download
# always matches the tracked skill source (no manual-regeneration drift).
#
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"   # flux-docs repo root
src_dir="$here/skills"
skill="dicom-printer-2-config"
out="$here/docs/public/${skill}-skill.zip"

if [ ! -d "$src_dir/$skill" ]; then
  echo "pack-skill: source not found: $src_dir/$skill" >&2
  exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
  # No zip available (unusual CI image): keep the committed zip rather than fail the build.
  echo "pack-skill: 'zip' not found; leaving the committed $out in place." >&2
  exit 0
fi

mkdir -p "$here/docs/public"
rm -f "$out"
( cd "$src_dir" && zip -r -X "$out" "$skill" -x '*.DS_Store' '*/.DS_Store' >/dev/null )
echo "pack-skill: built $out"
