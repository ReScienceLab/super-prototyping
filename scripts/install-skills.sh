#!/usr/bin/env bash
#
# Install the super-prototyping skills and toolkit for agent products that have
# no plugin marketplace of their own.
#
#   scripts/install-skills.sh              # toolkit + every product found
#   scripts/install-skills.sh --tools-only # just refkit and artgen
#   scripts/install-skills.sh --list       # show what would happen, change nothing
#
# Claude Code users do not need this. There the whole thing is one command:
#
#   /plugin marketplace add ReScienceLab/super-prototyping
#   /plugin install super-prototyping@super-prototyping
#
# Codex, Hermes and Pi read the same SKILL.md directories but have no
# marketplace, so this links `skills/` into each of their skill roots. Links,
# not copies: `git pull` in this checkout then updates every product at once,
# and there is no forked copy to drift. The toolkit is a real install rather
# than a link, so re-run this after a pull to move it too.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILLS="$ROOT/skills"

MODE=all
case "${1-}" in
  --tools-only) MODE=tools ;;
  --list)       MODE=list ;;
  --help|-h)    sed -n '3,19p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  "")           ;;
  *)            echo "error: unknown option '$1' (try --help)" >&2; exit 2 ;;
esac

[ -d "$SKILLS" ] || { echo "error: no skills/ directory at $SKILLS" >&2; exit 1; }

say()  { printf '%s\n' "$*"; }
step() { printf '\n\033[1m%s\033[0m\n' "$*"; }

# --- the toolkit -------------------------------------------------------------
# refkit and artgen go on PATH so a SKILL.md can say `refkit grid ...` with no
# path in it, which is the only spelling that works in all four products.

install_tools() {
  step "toolkit"
  if command -v uv >/dev/null 2>&1; then
    say "  uv tool install $ROOT/tools"
    [ "$MODE" = list ] || uv tool install --force "$ROOT/tools"
  elif command -v pipx >/dev/null 2>&1; then
    say "  pipx install $ROOT/tools"
    [ "$MODE" = list ] || pipx install --force "$ROOT/tools"
  else
    say "  ! neither uv nor pipx found — install one, then re-run."
    say "    https://docs.astral.sh/uv/getting-started/installation/"
    return 1
  fi

  if [ "$MODE" != list ] && ! command -v refkit >/dev/null 2>&1; then
    say "  ! refkit installed but is not on PATH."
    say "    add this to your shell profile:  export PATH=\"\$HOME/.local/bin:\$PATH\""
  fi
}

# --- the skills --------------------------------------------------------------
# One row per product: label, skill root. Codex follows symlinks by design and
# scans from the working directory up to the repo root; Hermes and Pi read
# their own home directories.

link_skills() {
  step "skills"
  local any=0
  local products=(
    "Codex CLI|$HOME/.codex/skills"
    "Hermes|$HOME/.hermes/skills"
    "Pi|$HOME/.pi/agent/skills"
  )

  for row in "${products[@]}"; do
    local label="${row%%|*}" root="${row#*|}"
    local parent; parent="$(dirname "$root")"

    # Only touch a product that is actually installed. Creating ~/.hermes for
    # someone who has never run Hermes is litter, not a favour.
    if [ ! -d "$parent" ]; then
      say "  - $label — not installed, skipped"
      continue
    fi
    any=1

    for skill in "$SKILLS"/*/; do
      local name; name="$(basename "$skill")"
      local dest="$root/$name"

      if [ -L "$dest" ] && [ "$(readlink "$dest")" = "${skill%/}" ]; then
        say "  = $label  $name (already linked)"
        continue
      fi
      if [ -e "$dest" ] && [ ! -L "$dest" ]; then
        say "  ! $label  $name — a real directory is already there, left alone"
        say "      remove $dest by hand if you want the linked version"
        continue
      fi
      say "  → $label  $name"
      if [ "$MODE" != list ]; then
        mkdir -p "$root"
        ln -sfn "${skill%/}" "$dest"
      fi
    done
  done

  [ "$any" = 1 ] || say "  (no non-Claude products found — nothing to link)"
}

# The skills are worth linking even when the toolkit will not install — they are the part that
# does not depend on it, and a half-install you can see beats none. But the exit status has to
# say so, or a script that runs this treats an unusable install as done.
tools_ok=1
case "$MODE" in
  tools) install_tools || tools_ok=0 ;;
  *)     install_tools || tools_ok=0; link_skills ;;
esac

step "done"
say "Claude Code installs from the marketplace instead:"
say "  /plugin marketplace add ReScienceLab/super-prototyping"
say "  /plugin install super-prototyping@super-prototyping"

if [ "$tools_ok" = 0 ]; then
  say ""
  say "! the toolkit did not install. The skills call refkit, artgen and sp-canvas by"
  say "  name, so they will not run until it does."
  exit 1
fi
