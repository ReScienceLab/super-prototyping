# tools

Three command-line tools, packaged so the skills can call them by name.

- **`refkit`** — the measuring toolkit. Overlays a labelled grid on a
  reference capture, takes colour censuses, finds bands and bounding boxes,
  names a typeface, shoots mockup HTML with headless Chrome, diffs a render
  against its source, and redraws a traced glyph as real curves.
  `refkit --help` lists all seventeen subcommands.
- **`artgen`** — redraws the rare asset that cannot be CSS or inline SVG,
  chroma-keys it off its ground, and fits it to the measured box.
- **`sp`** — serves the tldraw canvas against a project's board
  folders, fetching the build for its version on first run, and stops it
  again, and `sp open` and `sp upgrade` hand a project or an update to
  the app. `sp root` prints which tree it found, `sp paths` where it
  writes, `sp clean` removes that.

## Why these are installed, not called by path

The skills that use them are installed outside the user's repository. `python3 "$(git rev-parse --show-toplevel)/tools/refkit.py"`
resolves to the *user's* git root, where there is no `tools/`. No agent
product exposes a skill's install root as a shell variable that Claude Code, Codex,
CodeBuddy, Hermes, Pi and Trae agree on, so a path-based invocation would need
a spelling per product and would still break outside a git repository.

Installing them puts `refkit`, `artgen` and `sp` on `PATH`, and every
skill reads the same in every product:

```bash
refkit grid capture.png -o grid.png --zoom 3
```

## Install

The app installs them. On Windows it runs `uv tool install --editable` on this
folder once per version, which puts `sp.exe`, `refkit.exe` and `artgen.exe`
in `~\.local\bin`. It ships this folder, and on every macOS launch links
`~/.local/bin/{sp,refkit,artgen}` to `bin/sp`, through
`~/.local/share/super-prototyping/current`. `bin/sp` is one shim: it runs the
command it was called as with
`uv run --frozen --no-dev --project` this folder, in an environment under
`~/.cache/super-prototyping/venv`. The toolkit is installed there editable, so
what runs is always the code in this tree, and `pillow` and `numpy` are
installed once, from `uv.lock`. It needs [uv](https://docs.astral.sh/uv/) and
says so when it is missing.

Working on the tools, run them from the checkout's root the same way:
`uv run --project tools refkit --help`.

`refkit shoot` additionally needs Google Chrome; on Windows, Edge will do.

Check what you have:

```bash
refkit --version      # the release this toolkit came from
```

A source checkout reports `dev` rather than a release number.

## Self-check

```bash
python3 test_refkit.py
```

Runs the toolkit against generated fixtures — no reference captures or
network needed. `artgen --self-test` does the same for the art path.
