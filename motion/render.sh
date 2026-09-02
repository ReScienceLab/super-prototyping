#!/usr/bin/env bash
# Renders an asset to its own out/<slug>.mp4, which is where the canvas looks for it.
#
#   ./render.sh spatial-gallery   one asset
#   ./render.sh                   every asset
#
# The path is derived rather than typed, because a render written anywhere else is a render
# the canvas does not show. CRF 28 rather than Remotion's default 18: out/ holds a preview
# that loops four-across on a board, and the master is the composition — anyone who needs
# one re-renders it here in seconds at whatever quality they are exporting for.
set -euo pipefail
cd "$(dirname "$0")"

render() {
  local slug=$1 dir
  dir=$(echo src/*/"$slug")
  [ -d "$dir" ] || { echo "motion: no asset called '$slug' under src/*/" >&2; exit 1; }
  npx remotion render "$slug" "$dir/out/$slug.mp4" --crf 28
}

if [ $# -gt 0 ]; then
  render "$1"
else
  for dir in src/*/*/; do render "$(basename "$dir")"; done
fi
