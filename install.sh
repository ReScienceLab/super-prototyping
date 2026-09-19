#!/bin/sh
#
# Install super-prototyping from a release: the plugin with the canvas app built
# for it, and the skill links, in one command, with no sudo and no shell profile
# edited. The tree the Homebrew formula lays out, with the toolkit's sources
# beside it; the toolkit itself is the agent's to install from there, so no
# Python is installed here.
#
#   curl -fsSL https://raw.githubusercontent.com/ReScienceLab/super-prototyping/main/install.sh | sh
#
# `--help` lists the flags. POSIX sh, as uv's and rustup's installers are: no
# bash, no `local`, no arrays. Everything is in main(), called on the last line,
# so a download cut short runs nothing at all.
set -eu

REPO=ReScienceLab/super-prototyping
TAG_PREFIX=super-prototyping--v

say() { printf '%s\n' "$*"; }
die() { printf 'install.sh: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Install super-prototyping: the plugin, its canvas app and the skill links.

  curl -fsSL https://raw.githubusercontent.com/ReScienceLab/super-prototyping/main/install.sh | sh
  curl -fsSL https://raw.githubusercontent.com/ReScienceLab/super-prototyping/main/install.sh | sh -s -- --version 1.5.0

  --version <semver>  that release rather than the latest
  --from-checkout     this clone rather than a release: cd into it, then
                      sh install.sh --from-checkout
  --dry-run           say what would happen and change nothing
  --help              this text

What happens:
  1. plugin.tgz and canvas-dist.tgz for the release are downloaded, checked
     against the release's SHA256SUMS, and unpacked as one tree at
     ~/.local/share/super-prototyping/<version>/, the canvas app at canvas/dist
     inside it (XDG_DATA_HOME or SUPER_PROTOTYPING_HOME moves it; `sp-canvas
     paths` prints it). The tree the Homebrew formula lays out, with tools/
     beside it.
  2. Each skill is linked into every product on this machine that reads a
     skills directory: Codex, CodeBuddy, Hermes, Pi, Trae, Trae CN. A product
     that is not installed is skipped; a real directory in the way stays.
Nothing else: no Python, no toolkit. refkit, artgen and sp-canvas are a Python
package the agent installs from that tree when a skill calls for them,
`uv tool install --force <tree>/tools`, and the line is printed at the end.
Running it again for a version already there re-links and downloads nothing.
EOF
}

# curl, else wget, behind two names: fetch a URL to a file, and read where a URL
# redirects without following it. That redirect is how GitHub answers "which
# release is latest" with no API call, so no rate limit.
net() {
  if command -v curl >/dev/null 2>&1; then
    fetch() { curl -fsSL --proto '=https' --tlsv1.2 --retry 3 -o "$2" "$1" || die "could not download $1"; }
    redirect() { curl -fsSI --proto '=https' --tlsv1.2 -o /dev/null -w '%{redirect_url}' "$1"; }
  elif command -v wget >/dev/null 2>&1; then
    fetch() { wget -q -O "$2" "$1" || die "could not download $1"; }
    # BusyBox's flags only, for Alpine: it follows the redirect, so the first Location.
    redirect() { wget -qS --spider "$1" 2>&1 | sed -n 's/^ *Location: *//p' | head -n 1; }
  else
    die "neither curl nor wget is on PATH"
  fi
}

# One product: its label and its documented user-level skills directory, the same
# one `npx skills` writes to. Only a product that is installed is touched: creating
# ~/.hermes for someone who has never run Hermes is litter. A real directory at a
# skill's name is theirs and stays.
link() {
  if [ ! -d "$(dirname "$2")" ]; then
    say "skills   - $1: not installed, skipped"
    return
  fi
  FOUND=1
  if [ ! -d "$ROOT/skills" ]; then
    say "skills   → $1  each skill in $ROOT/skills"
    return
  fi
  for skill in "$ROOT"/skills/*/; do
    skill=${skill%/}
    dest=$2/${skill##*/}
    if [ -L "$dest" ] && [ "$(readlink "$dest")" = "$skill" ]; then
      say "skills   = $1  ${skill##*/}, already linked"
    elif [ -e "$dest" ] && [ ! -L "$dest" ]; then
      say "skills   ! $1  ${skill##*/}: a real directory is there and stays; remove $dest by hand for the linked one"
    else
      say "skills   → $1  ${skill##*/}"
      [ "$DRY" = 1 ] || { mkdir -p "$2"; ln -sfn "$skill" "$dest"; }
    fi
  done
}

main() {
  VERSION='' DRY=0 CHECKOUT=0 FOUND=0
  while [ $# -gt 0 ]; do
    case $1 in
      --version) [ $# -ge 2 ] || die "--version needs a value, like --version 1.5.0"; VERSION=$2; shift ;;
      --from-checkout) CHECKOUT=1 ;;
      --dry-run) DRY=1 ;;
      -h|--help) usage; exit 0 ;;
      *) die "unknown option '$1' (try --help)" ;;
    esac
    shift
  done

  case $(uname -s) in
    MINGW*|MSYS*|CYGWIN*|Windows_NT) die "Windows is not supported yet: https://github.com/$REPO/issues/111" ;;
  esac

  if [ "$DRY" = 1 ]; then
    say "dry run: nothing below is done"
  else
    TMP=$(mktemp -d)
    trap 'rm -rf "$TMP"' EXIT
  fi

  if [ "$CHECKOUT" = 1 ]; then
    ROOT=$(cd "$(dirname "$0")" && pwd)
    [ -f "$ROOT/.claude-plugin/plugin.json" ] || die "--from-checkout runs from a clone: cd into it, then sh install.sh --from-checkout"
    say "plugin   this checkout, $ROOT"
  else
    net
    if [ -z "$VERSION" ]; then
      url=$(redirect "https://github.com/$REPO/releases/latest") || url=
      case $url in
        */releases/tag/"$TAG_PREFIX"*) VERSION=${url##*/"$TAG_PREFIX"} ;;
        *) die "could not find the latest release behind https://github.com/$REPO/releases/latest; pass --version <semver>" ;;
      esac
    fi
    # The version becomes a directory name, so it is a version and nothing else.
    case $VERSION in
      *[!0-9A-Za-z.-]*|[!0-9]*|'') die "'$VERSION' is not a version; --version takes one like 1.5.0" ;;
    esac
    # Where sp-canvas looks: the same spelling as _dirs() in tools/sp_canvas.py.
    if [ -n "${SUPER_PROTOTYPING_HOME:-}" ]; then
      case $SUPER_PROTOTYPING_HOME in [~]|[~]/*) SUPER_PROTOTYPING_HOME=$HOME${SUPER_PROTOTYPING_HOME#[~]} ;; esac
      DATA=$SUPER_PROTOTYPING_HOME/data
    else
      DATA=${XDG_DATA_HOME:-$HOME/.local/share}/super-prototyping
    fi
    ROOT=$DATA/$VERSION
    BASE=https://github.com/$REPO/releases/download/$TAG_PREFIX$VERSION
    if [ -d "$ROOT" ]; then
      say "plugin   $VERSION is already at $ROOT"
    elif [ "$DRY" = 1 ]; then
      say "plugin   $VERSION: would download $BASE/plugin.tgz and $BASE/canvas-dist.tgz, check them against $BASE/SHA256SUMS, unpack them at $ROOT"
    else
      say "plugin   $VERSION → $ROOT"
      # sha256sum on Linux, shasum on macOS, openssl as the last resort. None at all
      # is a stop, not a skipped check.
      if command -v sha256sum >/dev/null 2>&1; then sha256() { sha256sum "$1" | awk '{ print $1 }'; }
      elif command -v shasum >/dev/null 2>&1; then sha256() { shasum -a 256 "$1" | awk '{ print $1 }'; }
      elif command -v openssl >/dev/null 2>&1; then sha256() { openssl dgst -r -sha256 "$1" | awk '{ print $1 }'; }
      else die "no sha256sum, shasum or openssl on PATH to check the download with"; fi
      fetch "$BASE/SHA256SUMS" "$TMP/SHA256SUMS"
      # Both assets are checked before either lands, so the tree is whole or absent.
      for asset in plugin.tgz canvas-dist.tgz; do
        fetch "$BASE/$asset" "$TMP/$asset"
        want=$(awk -v f="$asset" '$2 == f { print $1; exit }' "$TMP/SHA256SUMS")
        have=$(sha256 "$TMP/$asset")
        if [ -z "$want" ] || [ "$have" != "$want" ]; then
          die "$asset does not match SHA256SUMS: expected '${want:-no line for $asset}', got '$have'. Nothing was installed."
        fi
      done
      # Unpacked beside the final name and renamed into place, so the directory
      # is whole or absent. The canvas app goes at canvas/dist inside the tree,
      # where the Homebrew formula puts it and `sp-canvas start` serves it as is.
      mkdir -p "$DATA"
      STAGE=$(mktemp -d "$DATA/tmp.XXXXXX")
      trap 'rm -rf "$TMP" "$STAGE"' EXIT
      tar -xzf "$TMP/plugin.tgz" -C "$STAGE"
      tar -xzf "$TMP/canvas-dist.tgz" -C "$STAGE/super-prototyping/canvas"
      mv "$STAGE/super-prototyping" "$ROOT"
    fi
  fi

  link "Codex CLI" "$HOME/.codex/skills"
  link CodeBuddy "$HOME/.codebuddy/skills"
  link Hermes "$HOME/.hermes/skills"
  link Pi "$HOME/.pi/agent/skills"
  link Trae "$HOME/.trae/skills"
  link "Trae CN" "$HOME/.trae-cn/skills"
  [ "$FOUND" = 1 ] || say "skills   no product that reads a skills directory is installed here; nothing to link"

  # No toolkit here, and no Python to run it: refkit, artgen and sp-canvas are the
  # agent's to install from this tree when a skill calls for them, as the formula's
  # caveats say after `brew install`. A dry run has no tree yet, and says so.
  if [ -d "$ROOT" ]; then where="are in"; else where="would be in"; fi
  say ""
  say "The skills and the canvas app $where $ROOT"
  say "The toolkit (sp-canvas, refkit, artgen) is a Python package the agent installs when a skill needs it:"
  say "  uv tool install --force \"$ROOT/tools\""
  say "Claude Code installs the plugin from the marketplace: /plugin marketplace add $REPO, then /plugin install super-prototyping@super-prototyping"
}

main "$@"
