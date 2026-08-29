# super-prototyping

A standardized setup for cloning and designing product UI as **self-contained
HTML artboards on a local tldraw canvas**, with the agent skills that drive
the whole workflow.

Drop an `.html` file into `mockups/canvases/<board>/` and it shows up on the
canvas as a shape. That is the entire contract — no shape registry, no build
step, no design tool.

```
canvas/          the tldraw app (Vite + React + TypeScript) and an embedded shell
mockups/
  canvases/      one folder per board → one tldraw page; one .html → one shape
  assets/        icons, logos, reference crops that get inlined as data: URIs
tools/refkit.py  grid / sample / hairline / shoot / montage
.agents/skills/  the workflow, as four skills (symlinked into .claude/skills/)
```

## Start a project from this repo

```bash
git clone --depth 1 https://github.com/ReScienceLab/super-prototyping.git my-product-design
cd my-product-design && rm -rf .git && git init
cd canvas && npm ci
```

Then rename `mockups/canvases/example-app/` to your product, replace its
token board with measured values, and delete the boards you don't need.

Two boards ship with the repo:

| board | what it is |
|---|---|
| `example-app` | Blank template — a token board and one phone screen wired to it. Copy this folder to start. |
| `notion-ios` | A real run of `clone-prototype`: six Notion iOS screens rebuilt from measured samples, with the evidence for every token. Read this one to see what "done" looks like. |

## Run the canvas

```bash
cd canvas
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open the URL Vite prints; deep-link a board with `?canvas=<slug>`. The canvas
ships a `Mark` tool for numbered review pins, a styles panel, a force-relayout
button, and an embedded `/bin/zsh` rooted at the repo.

**Keep it on `127.0.0.1`.** The embedded terminal is an unauthenticated shell
behind a per-process token and an Origin check — safe on loopback, a remote
shell the moment it is exposed.

## The workflow

Four skills, in `.agents/skills/` (symlinked from `.claude/skills/`, so
Claude Code picks them up automatically):

| Skill | Use it for |
|---|---|
| **clone-prototype** | Copying a real app's screens. Grid the reference, sample colours *visually*, derive one measured token block, generate the artboards, verify by re-rendering, park the reference underneath. |
| **new-ui-mock** | Designing new screens with no reference — built on existing tokens, including the empty/loading/error states and side-by-side proposals. |
| **prototype-canvas** | Running and operating the canvas: boards, `layout.json`, the `window.snapCanvas` bridge, Mark pins, the force-refresh. |
| **upgrade-tldraw** | Bumping the SDK and repairing the five local extension points against it. |

The rule the whole thing is built around: **every colour and every metric in
a cloned artboard traces to a measurement.** Grid the reference image, look
at it, name the element, *then* write the token. Values that "look about
right" are how a replica quietly stops being one.

## Constraints on every artboard

Boards render in `<iframe srcDoc sandbox="">`:

- Fully self-contained — no external CSS, JS, fonts or images. `data:` URIs
  and inline SVG only.
- The shape box is **478 × 980**; overflow is silently clipped.
- iPhone frame is 393 × 852 pt at 1pt = 1px (54px status bar, 125 × 36
  Dynamic Island, 139 × 5 home indicator).

See `mockups/canvases/README.md` for `layout.json` rows and captions.

## Toolkit

`tools/refkit.py` needs `pillow` and `numpy`; `shoot` needs Google Chrome.

```bash
python3 tools/refkit.py grid ref.png -o grid.png --zoom 3   # grid overlay to read by eye
python3 tools/refkit.py sample ref.png 40 120 300 160        # flat-fill colour census
python3 tools/refkit.py hairline ref.png 40 200 300 204 --bg FFFFFF --scale 0.7634
python3 tools/refkit.py shoot mockups/canvases/my-app/*.html -o shots --scale 2
python3 tools/refkit.py montage shots/*.png -o board.png
```

## Verify

```bash
cd canvas && npm run lint && npm test && npm run build && npm run test:pty
```

## Licence

This repo is Apache-2.0 (see `LICENSE`).

**The tldraw SDK it depends on is not.** tldraw ships under the
[tldraw licence](https://github.com/tldraw/tldraw/blob/main/LICENSE.md): free
to use with the tldraw watermark visible, paid business licence to remove it.
Apache-2.0 here covers this repo's own code only — anyone running the canvas
is bound by tldraw's terms, and the watermark must stay.
