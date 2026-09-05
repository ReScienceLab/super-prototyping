#!/usr/bin/env bash
#
# Set the release version everywhere at once.
#
#   scripts/bump-version.sh 1.1.0
#   scripts/bump-version.sh --check          # verify every file already agrees
#
# A plugin's version lives in five places (see .version-bump.json): the Claude
# Code manifest, twice inside the marketplace catalogue, the Codex manifest, and
# the Python toolkit. Bumping them by hand is how a release ends up
# half-versioned, with `/plugin update` reporting one number and `refkit
# --version` another. This is the only supported way to change them.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SPEC="$ROOT/.version-bump.json"

usage() { sed -n '3,12p' "$0" | sed 's/^# \{0,1\}//'; }

[ $# -eq 1 ] || { usage; exit 2; }

if [ "$1" = "--check" ]; then
  MODE=check
  VERSION=
else
  MODE=set
  VERSION="$1"
  # Semver, because Claude Code resolves plugin dependency ranges against these.
  if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
    echo "error: '$VERSION' is not a semver version (want e.g. 1.2.0)" >&2
    exit 2
  fi
fi

MODE="$MODE" VERSION="$VERSION" ROOT="$ROOT" SPEC="$SPEC" python3 - <<'PY'
import json, os, re, sys, pathlib

mode    = os.environ["MODE"]
version = os.environ["VERSION"]
root    = pathlib.Path(os.environ["ROOT"])
spec    = json.loads(pathlib.Path(os.environ["SPEC"]).read_text())

def get_in(obj, parts):
    for p in parts:
        obj = obj[int(p)] if isinstance(obj, list) else obj[p]
    return obj

def set_in(obj, parts, value):
    get_in(obj, parts[:-1])
    parent, last = get_in(obj, parts[:-1]), parts[-1]
    if isinstance(parent, list):
        parent[int(last)] = value
    else:
        parent[last] = value

def read_toml_version(text, parts):
    # Only `project.version` is supported, which is all pyproject needs. Written
    # against the literal line rather than a TOML parser so the file's comments,
    # ordering and formatting survive a bump untouched.
    assert parts == ["project", "version"], parts
    m = re.search(r'(?m)^\s*version\s*=\s*"([^"]+)"', text)
    return m.group(1) if m else None

def write_toml_version(text, parts, value):
    assert parts == ["project", "version"], parts
    new, n = re.subn(r'(?m)^(\s*version\s*=\s*)"[^"]+"', rf'\g<1>"{value}"', text, count=1)
    if n != 1:
        raise SystemExit("error: no `version = \"...\"` line to rewrite")
    return new

seen, failures = {}, []

for entry in spec["files"]:
    path  = root / entry["path"]
    parts = entry["field"].split(".")
    label = f'{entry["path"]}:{entry["field"]}'

    if not path.exists():
        # tools/pyproject.toml is created in a later phase; a listed-but-absent
        # file is a warning, never a silent skip.
        print(f"  ! {label} — file missing, skipped")
        continue

    text = path.read_text()

    if path.suffix == ".toml":
        current = read_toml_version(text, parts)
    else:
        current = get_in(json.loads(text), parts)

    seen[label] = current

    if mode == "check":
        continue

    if current == version:
        print(f"  = {label} already {version}")
        continue

    if path.suffix == ".toml":
        path.write_text(write_toml_version(text, parts, version))
    else:
        data = json.loads(text)
        set_in(data, parts, version)
        path.write_text(json.dumps(data, indent=2) + "\n")
    print(f"  → {label}  {current} → {version}")

if mode == "check":
    distinct = sorted(set(seen.values()))
    for label, current in seen.items():
        print(f"  {current}  {label}")
    if len(distinct) > 1:
        print(f"\nerror: versions disagree: {', '.join(distinct)}", file=sys.stderr)
        print("run: scripts/bump-version.sh <version>", file=sys.stderr)
        sys.exit(1)
    print(f"\nall {len(seen)} files agree on {distinct[0]}")
else:
    print(f"\nbumped {len(seen)} files to {version}")
    print(f"next: git commit -am 'release {version}' "
          f"&& git tag {spec['tagPrefix']}{version}")
PY
