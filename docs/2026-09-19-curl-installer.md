# One install command: `install.sh` (#114)

2026-09-19. The README now leads with

```bash
curl -fsSL https://raw.githubusercontent.com/ReScienceLab/super-prototyping/main/install.sh | sh
```

for every product, on macOS and Linux. Before this there were six install
commands, one per product, plus a clone-and-link script for the products with
none, and the toolkit was a seventh command after any of them. The script does
the three steps every route ended in: the plugin on disk, the toolkit on PATH,
the skills where the product looks. This note is the decisions behind it, and
the survey of sixteen `curl | sh` installers (uv, rustup, Deno, bun, Ollama,
pnpm, Homebrew, nvm, Tailscale, mise, Zed, Docker, Starship, Helm, Claude Code,
OpenDesign) that most of them came from.

## A release asset, not the source archive

#114 proposed installing the toolkit straight from GitHub's tag archive,
`archive/refs/tags/<tag>.tar.gz#subdirectory=tools`. That archive is the whole
repo, about 400 MB gzipped because of the example boards, and GitHub attaches no
checksum to it. Instead `release.yml` now attaches `plugin.tgz`: `git archive`
of `LICENSE .claude-plugin skills tools canvas mockups/canvases/templates`, the
same sparse set the README documents for a small marketplace install, 1.9 MB
gzipped and 3.1 MB unpacked, next to a `SHA256SUMS` covering it and
`canvas-dist.tgz`. The script downloads that one asset and its checksum line
into a temporary directory, verifies, and only then unpacks it beside its final
name under the data directory and renames it into place, so the version's
directory is whole or absent (uv's own trick). The toolkit is then installed
from that verified copy, `uv tool install --force <copy>/tools`, which is what
the clone-and-link script already did; nothing else is fetched. Verification
uses `sha256sum`, else `shasum -a 256`, else `openssl dgst`, and stops when none
is there rather than skipping the check: the survey flagged uv's "no tool, no
check" as the one practice not to copy.

## "Latest" comes from a redirect, not the API

None of the sixteen installers call `api.github.com/…/releases/latest`. Those
that resolve a version at run time (bun, Starship) use GitHub's own redirect:
`https://github.com/<repo>/releases/latest` answers with a `Location:` header
naming the tag, and `curl -sI -w '%{redirect_url}'` reads it without following.
No JSON, no `jq`, and it lives on `github.com`, so the unauthenticated API rate
limit that made #114 want a hint about it never applies. `--version` skips the
lookup. The alternative the others use, a version constant regenerated into the
script per release, would mean the hosted `install.sh` changing every release,
which the issue rules out.

## The data directory is a contract with the launcher

`$XDG_DATA_HOME/super-prototyping/<version>/`, default `~/.local/share/…`,
`$SUPER_PROTOTYPING_HOME/data` when that is set, spelled the same in the
script and in `_dirs()` in `tools/sp_canvas.py`, and `tools/test_install.py`
asserts the two agree. `sp-canvas` looks there for the plugin root after the
products' own install locations and the skill links, newest version first, so
a machine with no skill-reading product installed still finds it, and a
`--version` downgrade whose links point at the older copy still wins over a
newer copy left behind. `sp-canvas paths` prints it; `sp-canvas clean` leaves
it, since removing the install is an uninstall, which #114 keeps out of scope.
One copy per version and no removal of older ones: it is 3.1 MB each, and the
skill links of a downgrade point into the older one.

## Practices taken from the survey

- **POSIX sh, one `main()`.** Eleven of sixteen are POSIX sh; the five in bash
  refuse to run under `sh` rather than degrade. So `#!/bin/sh`, `set -eu`, no
  `local`, no arrays, `printf` not `echo`, `case` for the platform; dash parses
  it and shellcheck holds it to that in `validate.yml`. Everything is inside
  `main`, called on the last line, so a download cut short runs nothing
  (Ollama, Docker, Tailscale).
- **curl, else wget, behind one name.** Eleven of sixteen. The download goes to
  a file whose exit status is checked; curl is never piped into tar, because a
  POSIX pipeline has no `pipefail` and Ollama's `curl | tar` can swallow a
  failed download. The wget flags are BusyBox's, because Alpine's wget is
  BusyBox: `-q`, `-S`, `-O`, `--spider`, and the first `Location:` it prints
  rather than `--max-redirect=0`, which it does not have. The test runs that
  branch against a wget that stops at any other flag.
- **No prompts, no profile edits.** Fourteen of sixteen never prompt. Seven
  print the PATH line and three delegate it; only three edit rc files. The
  script prints `export PATH="$HOME/.local/bin:$PATH"` when `sp-canvas` is not
  found on the user's PATH afterwards, and runs uv's installer, the one other
  script it ever runs, with `--no-modify-path` so that promise holds through it.
- **Skip what is already there, redo the rest.** A version already under the
  data directory is not downloaded again ("already at"); the toolkit is always
  reinstalled with `--force` and the links always re-checked, so a run that
  died halfway is repaired by the next one. A symlink that already points at
  the right place is reported and left; a real directory at a skill's name is
  the user's and is never replaced.
- **Windows is a named refusal**, `MINGW*|MSYS*|CYGWIN*` → #111, the way Claude
  Code's installer does it, rather than a silent default target.

## `--from-checkout` is what `scripts/install-skills.sh` was

Same links, same toolkit install, from the clone the script is run in rather
than from a release; the file it replaces did nothing the release path does not
do better except point at a working tree. One script, one set of product
roots, one place to add a product.

## Not done, on purpose

Windows (#111), a vanity domain in front of the raw URL, uninstall, and a
pipx-first tier for machines that have pipx and not uv: pipx is second choice,
since uv is what the rest of the repo assumes. The `--from-checkout` route is not the way to work on the canvas app either: a
checkout with `canvas/node_modules` serves its own build, as before.
