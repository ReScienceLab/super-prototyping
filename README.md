![super-prototyping](assets/banner.png)

# super-prototyping

A standardized setup for cloning and designing product UI as **self-contained
HTML artboards on a local tldraw canvas**, with the agent skills that drive
the whole workflow.

Drop an `.html` file into `mockups/canvases/<board>/` and it shows up on the
canvas as a shape. That is the entire contract — no shape registry, no build
step, no design tool.

```
canvas/          the tldraw app (Vite + React + TypeScript)
mockups/
  canvases/      one folder per board → one tldraw page; one .html → one shape
  assets/        icons, logos, reference crops that get inlined as data: URIs
tools/refkit.py  measure a reference, render a board, diff the two, audit tokens
.agents/skills/  the workflow, as three skills (symlinked into .claude/skills/)
```

## Start a project from this repo

```bash
git clone --depth 1 https://github.com/ReScienceLab/super-prototyping.git my-product-design
cd my-product-design && rm -rf .git && git init
cd canvas && npm ci
```

Two boards ship with the repo, both real `clone-prototype` runs rebuilt from
measured samples with the evidence recorded for every token:
**`notion-ios`** (six screens) and **`raycast-ios`** (eleven, across three
flows, including blurred backdrops and third-party brand marks). Read either
to see what "done" looks like, copy a `00-design-tokens.html` as the starting
point for your own token block, then delete the folders.

## Run the canvas

```bash
cd canvas
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Open the URL Vite prints; deep-link a board with `?canvas=<slug>`. The bottom
toolbar carries a styles-panel toggle alongside tldraw's own tools; the top
bar carries a force-relayout button — press it after editing a `layout.json`.

## The workflow

Three skills, in `.agents/skills/` (symlinked from `.claude/skills/`, so
Claude Code picks them up automatically):

| Skill | Use it for |
|---|---|
| **clone-prototype** | Copying a real app's screens. Grid the reference, sample colours *visually*, derive one measured token block, generate the artboards, verify by re-rendering, park the reference underneath. |
| **new-ui-mock** | Designing new screens with no reference — built on existing tokens, including the empty/loading/error states and side-by-side proposals. |
| **prototype-canvas** | Running and operating the canvas: boards, `layout.json`, the `window.snapCanvas` bridge, annotated-screenshot review, the force-refresh. |

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
python3 tools/refkit.py grid ref.png -o grid.png --zoom 3   # overlay to read by eye
python3 tools/refkit.py sample ref.png 40 120 300 160 --pt 3 # fills, modes, ink core
python3 tools/refkit.py bands ref.png 30 120 60 780 --pt 3   # ink bands and their pitch
python3 tools/refkit.py scan ref.png col 196 380 410 --pt 3  # colour runs -> exact edge
python3 tools/refkit.py hairline ref.png 40 200 300 204 --bg FFFFFF --scale 0.7634
python3 tools/refkit.py shoot mockups/canvases/my-app/*.html -o mine \
    --scale 3 --crop-phone --check-overflow                  # render, de-frame, fail if clipped
python3 tools/refkit.py diff mine/01.png ref.png --pt 3 -o d.png   # side by side + numbers
python3 tools/refkit.py tokens mockups/canvases/my-app       # one :root, no undefined var()
python3 tools/test_refkit.py                                 # self-check
```

## Verify

```bash
cd canvas && npm run lint && npm test && npm run build
```

## Licence

This repo is Apache-2.0 (see `LICENSE`).

**The tldraw SDK it depends on is not.** tldraw ships under the
[tldraw licence](https://github.com/tldraw/tldraw/blob/main/LICENSE.md): free
to use with the tldraw watermark visible, paid business licence to remove it.
Apache-2.0 here covers this repo's own code only — anyone running the canvas
is bound by tldraw's terms, and the watermark must stay.
