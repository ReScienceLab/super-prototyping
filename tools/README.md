# tools

Three command-line tools, packaged so the skills can call them by name.

- **`refkit`** — the measuring toolkit. Overlays a labelled grid on a
  reference capture, takes colour censuses, finds bands and bounding boxes,
  names a typeface, shoots mockup HTML with headless Chrome, and diffs a
  render against its source. `refkit --help` lists all sixteen subcommands.
- **`artgen`** — redraws the rare asset that cannot be CSS or inline SVG,
  chroma-keys it off its ground, and fits it to the measured box.
- **`sp-canvas`** — starts the bundled tldraw canvas against a project's board
  folders, and stops it again. `sp-canvas root` prints which copy of the app it
  found.

## Why these are installed, not called by path

The skills that use them ship inside a plugin, and a plugin is installed
outside the user's repository. `python3 "$(git rev-parse --show-toplevel)/tools/refkit.py"`
resolves to the *user's* git root, where there is no `tools/`. No agent
product exposes its plugin root as a shell variable that all four of Claude
Code, Codex, Hermes and Pi agree on, so a path-based invocation would need
four spellings and would still break outside a git repository.

Installing them puts `refkit`, `artgen` and `sp-canvas` on `PATH`, and every
skill reads the same in every product:

```bash
refkit grid capture.png -o grid.png --zoom 3
```

## Install

```bash
uv tool install "git+https://github.com/ReScienceLab/super-prototyping#subdirectory=tools"
```

Once per machine, and from a checkout instead if you are working on the tools:
`uv tool install /path/to/super-prototyping/tools` (or `pipx install`).

This pulls `pillow` and `numpy`, which were previously an undocumented
prerequisite. `refkit shoot` additionally needs Google Chrome.

`scripts/install-skills.sh` at the repo root does this for you, alongside
linking the skills into the non-Claude agent products.

Check what you have:

```bash
refkit --version      # the plugin release this toolkit came from
```

A source checkout reports `dev` rather than a release number.

## Self-check

```bash
python3 test_refkit.py
```

Runs the toolkit against generated fixtures — no reference captures or
network needed. `artgen --self-test` does the same for the art path.
