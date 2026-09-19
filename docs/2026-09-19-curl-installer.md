# One install command: `install.sh` (#114)

2026-09-19. The README now leads with

```bash
curl -fsSL https://raw.githubusercontent.com/ReScienceLab/super-prototyping/main/install.sh | sh
```

for every product, on macOS and Linux. Before this there were six install
commands, one per product, plus a clone-and-link script for the products with
none, and the toolkit was a seventh command after any of them. The script does
the two steps every route ended in: the plugin on disk, with the canvas app
built for it, and the skills where the product looks. The toolkit it leaves to
the agent, as the Homebrew formula does (below). This note is the decisions
behind it, and the survey of sixteen `curl | sh` installers (uv, rustup, Deno, bun, Ollama,
pnpm, Homebrew, nvm, Tailscale, mise, Zed, Docker, Starship, Helm, Claude Code,
OpenDesign) that most of them came from.

## A release asset, not the source archive

#114 proposed installing the toolkit straight from GitHub's tag archive,
`archive/refs/tags/<tag>.tar.gz#subdirectory=tools`. That archive is the whole
repo, about 400 MB gzipped because of the example boards, and GitHub attaches no
checksum to it. Instead `release.yml` now attaches `plugin.tgz`: `git archive`
of the three manifests, `skills`, `tools`, `mockups/canvases/templates`,
`LICENSE` and `canvas/package.json`, the tree the Homebrew formula lays out
plus `tools`, `LICENSE` and the templates, under 1 MB gzipped, next to
`canvas-dist.tgz` and a `SHA256SUMS` covering both.
The script downloads the two assets and the checksum file into a temporary
directory, verifies both, and only then unpacks them as one tree beside its
final name under the data directory, the canvas at `canvas/dist` inside it,
and renames it into place, so the version's directory is whole or absent (uv's
own trick). Nothing else is fetched, and nothing is installed from it. Verification
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
One copy per version and no removal of older ones: it is 5.5 MB each, and the
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
  script puts nothing on PATH and runs no other script, so it has no line to
  print and nothing to edit.
- **Skip what is already there, redo the rest.** A version already under the
  data directory is not downloaded again ("already at"); the links are always
  re-checked, so a run that died halfway is repaired by the next one, and a
  tree is never half there. A symlink that already points at
  the right place is reported and left; a real directory at a skill's name is
  the user's and is never replaced.
- **Windows is a named refusal**, `MINGW*|MSYS*|CYGWIN*` → #111, the way Claude
  Code's installer does it, rather than a silent default target.

## `--from-checkout` is what `scripts/install-skills.sh` was

Same links, from the clone the script is run in rather
than from a release; the file it replaces did nothing the release path does not
do better except point at a working tree. One script, one set of product
roots, one place to add a product.

## The tree the Homebrew formula leaves, and no Python

The first cut installed the toolkit too: `uv tool install --force <copy>/tools`,
pipx second, uv's own installer third, and uv fetching a CPython when the
machine had none it could use (macOS ships 3.9, `tools` wants 3.10). The
Homebrew formula (#109) does none of that. It lays out one tree, `libexec/plugin`,
holding the manifests, the skills, `canvas/package.json` and the built canvas
at `canvas/dist`, and its caveats say the toolkit is a Python package the agent
installs when a skill needs it. The script now leaves that tree, with `tools`,
`LICENSE` and the templates beside it, from the same two assets, under the data
directory instead of the Cellar, and ends the way the caveats do: the toolkit is
the agent's, `uv tool install --force <tree>/tools`. Two routes, one layout, one
sentence to say what is missing; `sp-canvas` serves the `canvas/dist` it finds
in either without a fetch. What is left is the formula's: take `plugin.tgz` as
its `url` and install those three from it too, and point its caveat at
`<tree>/tools` as well, since the `super-prototyping-tools` its caveat names
today is not on PyPI.

The toolkit stays the agent's for the reason the formula gives: the skills say
what to run when it is missing, and the agent resolves what that needs, Python
included, the moment a skill first calls for it. An installer that fetches a
CPython to satisfy a package the user may never call is a second installer
inside the first, and a hundred megabytes for a `sp-canvas start` that needs
only node. What the script installs, the checksum covers; what it does not, it
names.

## Not done, on purpose

Windows (#111), a vanity domain in front of the raw URL, and uninstall. The
`--from-checkout` route is not the way to work on the canvas app either: a
checkout with `canvas/node_modules` serves its own build, as before.
