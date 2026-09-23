#!/bin/sh
# Installs the Super Prototyping app and opens it; the app links sp, refkit, artgen and the
# skills on launch. Safe to run again. macOS only. See ../references/install.md.
set -eu
APP="Super Prototyping.app"
[ "$(uname -s)" = Darwin ] || { echo "install.sh: macOS only; on Windows run install.ps1" >&2; exit 1; }

# Opened by path: LaunchServices may not know a copy made a moment ago by its name yet.
if [ -d "/Applications/$APP" ]; then dest=/Applications
elif [ -d "$HOME/Applications/$APP" ] || [ ! -w /Applications ]; then dest="$HOME/Applications"
else dest=/Applications; fi

if [ ! -d "$dest/$APP" ]; then
  arch=$(uname -m | sed 's/x86_64/x64/')
  url=$(curl -fsSL https://api.github.com/repos/ReScienceLab/super-prototyping/releases/latest |
    grep -o "https://[^\"]*-$arch\.dmg" | head -n 1)
  dmg=$(mktemp -d)/app.dmg
  curl -fL -o "$dmg" "$url"
  mnt=$(hdiutil attach -nobrowse -readonly "$dmg" | grep -o '/Volumes/.*' | head -n 1)
  mkdir -p "$dest"
  ditto "$mnt/$APP" "$dest/$APP"
  hdiutil detach -quiet "$mnt"
fi

command -v uv >/dev/null || curl -LsSf https://astral.sh/uv/install.sh | sh
open "$dest/$APP"
