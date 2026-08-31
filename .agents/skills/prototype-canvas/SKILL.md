---
name: prototype-canvas
argument-hint: [canvas slug, or a screenshot to act on]
description: Start and operate the local tldraw design canvas in this repo. Launch the dev server, add or switch boards under mockups/canvases/, drive shapes through the bounded window.snapCanvas bridge, and act on annotated screenshots of the canvas. Use when asked to open/launch the canvas, put a mockup on the canvas, annotate or draw on it, fix overlapping frames after a layout.json edit, or respond to a screenshot of the canvas with notes drawn on it.
---

# Prototype canvas

`canvas/` is a local tldraw app. It discovers every `.html` file under
`mockups/canvases/<slug>/` and renders it as a shape. There is no shape map
to edit and no code change needed to add a board.

## Start

The server runs under tmux. A bare `npm run dev` is blocked by a hook, and the
**whole shell command must start with `tmux`**: a leading `cd` trips the
same hook, so pass the directory with `-c` and an absolute path.

```bash
ROOT="$(git rev-parse --show-toplevel)"
[ -d "$ROOT/canvas/node_modules" ] || (cd "$ROOT/canvas" && npm ci)
tmux kill-session -t canvas 2>/dev/null
tmux new-session -d -s canvas -c "$ROOT/canvas" \
     "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort"
tmux capture-pane -p -t canvas | tail -5      # confirm it bound
```

- Pass **`--host 127.0.0.1`**, or Vite binds `localhost` only, which resolves
  to `::1` here and makes every `127.0.0.1` request fail with a bare
  connection error. Keep it on loopback either way: this is a local design
  tool, not a service to expose.
- Read the pane back. `--strictPort` fails loudly rather than drifting to
  5174, and you want to see which it did.
- Never reuse a port just because it responds. Its HTML must contain
  `<meta name="prototyping-repo-root" content="$ROOT">`; otherwise it belongs
  to a different checkout. Pick another free port and keep `--strictPort`.
- Deep-link a board with `?canvas=<slug>`, e.g.
  `http://127.0.0.1:5173/?canvas=notion-ios`.

**Restart it before you open a folder you just created.** `canvasLibrary.ts`
globs `mockups/canvases/*/*.html`, which sits outside the canvas app's Vite
root, and a running server does not reliably notice a folder created after it
booted. When it does not, `?canvas=<slug>` matches no page,
`applyCanvasFromUrl` returns silently, and the canvas opens on whichever board
tldraw last persisted: right URL, no error, wrong board. A boot is ~150 ms; do
not start debugging artboards you cannot see until you have done it.

The styles panel is hidden by default; toggle it from the toolbar. Always-snap
is on by default. The setting is per browser, so turning it off in tldraw's
preferences menu sticks.

## Boards

One folder under `mockups/canvases/` = one tldraw page; one `.html` file =
one shape. Switch with the page menu at the top-left; do not build a
separate switcher. See `mockups/canvases/README.md` for `layout.json` rows,
captions, and the 478 × 980 / sandbox constraints every artboard lives under.

**After editing `layout.json`, press the refresh button in the top bar,
next to the `…` actions menu.** Shape creation is idempotent. It fills in
what is missing but never moves a shape that already exists, so inserting or
reordering a row entry leaves the old shape at its old position, overlapping
the new one. Force-refresh deletes every `canvas-file` /
`canvas-row-heading` / `canvas-file-label` shape on all pages and rebuilds
them from the current files. Content-only edits to a placed file do **not**
need it; Vite HMR updates that iframe's `srcDoc` live.

## Drive the canvas

Prefer the bounded `window.snapCanvas` bridge over mouse-coordinate
automation or exposing tldraw's full `Editor`.

```js
window.snapCanvas.describe()
window.snapCanvas.dispatch({ op: 'get' })
window.snapCanvas.dispatch({ op: 'create', shapes: [{
  type: 'text', x: 80, y: 80,
  props: { richText: { type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Note' }] }] } },
}]})
window.snapCanvas.dispatch({ op: 'select', ids: ['shape:example'] })
window.snapCanvas.dispatch({ op: 'zoom',   ids: ['shape:example'] })
window.snapCanvas.dispatch({ op: 'undo' })
```

Call `describe()` before generating commands, and use the ids and bounds that
`get` returns. Never guess screen coordinates. Batch related shape changes
into one dispatch.

Never let bridge commands inject arbitrary JavaScript, never load untrusted
HTML into a board, and never add `allow-same-origin` to the artboard iframe.

## Annotated screenshots

The review loop is a screenshot of the canvas with notes drawn on it, pasted
into chat. Boxes, arrows or numbers all work, from tldraw's own draw/text
tools or any image annotator.

1. Treat each annotation as an exact visual target, and say back what you read
   it as ("box 2: tighten the card gap") before touching anything.
2. Read the surrounding UI and the HTML source before editing.
3. Make the smallest source change that satisfies it.
4. Let HMR reload, then verify the same region visually.

Do not build an annotation-to-agent protocol. The screenshot is the bridge.

## State and persistence

The document lives in the browser's IndexedDB under `PERSISTENCE_KEY` in
`canvas/src/App.tsx`. Bump its trailing version **only** when a change would
leave existing documents inconsistent with the code (a shape's props changing
shape). A bump discards every persisted hand-drawn annotation. Ordinary
layout drift is what the refresh button is for.

## Verify

```bash
cd "$(git rev-parse --show-toplevel)/canvas"
npm run lint && npm test && npm run build
```

Then, in a fresh browser session: each board page loads with its frames,
headings and captions; the frames stay independently selectable; the styles
panel starts hidden and toggles; the top-bar refresh button rebuilds a board
cleanly.
