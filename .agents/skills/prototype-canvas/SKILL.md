---
name: prototype-canvas
description: Start and operate the local tldraw design canvas in this repo — launch the dev server, add or switch boards under mockups/canvases/, drive shapes through the bounded window.snapCanvas bridge, and act on annotated screenshots of the canvas. Use when asked to open/launch the canvas, put a mockup on the canvas, annotate or draw on it, fix overlapping frames after a layout.json edit, or respond to a screenshot of the canvas with notes drawn on it.
---

# Prototype Canvas

`canvas/` is a local tldraw app. Every `.html` file under
`mockups/canvases/<slug>/` is auto-discovered and rendered as a shape — there
is no shape map to edit and no code change needed to add a board.

## Start

```bash
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT/canvas"
[ -d node_modules ] || npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

- Keep the server bound to `127.0.0.1`. It is a local design tool, not a
  service to expose.
- Never reuse a port merely because it responds. Its HTML must contain
  `<meta name="prototyping-repo-root" content="$ROOT">`; otherwise it belongs
  to a different checkout. Pick another free port and keep `--strictPort`.
- Open the exact URL Vite prints. Deep-link a board with `?canvas=<slug>`,
  e.g. `http://127.0.0.1:5173/?canvas=notion-ios`.

The styles panel is hidden by default; toggle it from the toolbar. Always-snap
is on by default — set once per browser, so turning it off in tldraw's
preferences menu sticks.

## Boards

One folder under `mockups/canvases/` = one tldraw page; one `.html` file =
one shape. Switch with the page menu at the top-left — do not build a
separate switcher. See `mockups/canvases/README.md` for `layout.json` rows,
captions, and the 478 × 980 / sandbox constraints every artboard lives under.

**After editing `layout.json`, press the refresh button in the top bar,
next to the `…` actions menu.** Shape
creation is idempotent — it fills in what is missing but never moves a shape
that already exists — so inserting or reordering a row entry leaves the old
shape at its old position, overlapping the new one. Force-refresh deletes
every `canvas-file` / `canvas-row-heading` / `canvas-file-label` shape on all
pages and rebuilds them from the current files. Content-only edits to a
placed file do **not** need it; Vite HMR updates that iframe's `srcDoc` live.

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
`get` returns — never guess screen coordinates. Batch related shape changes
into one dispatch.

Never let bridge commands inject arbitrary JavaScript, never load untrusted
HTML into a board, and never add `allow-same-origin` to the artboard iframe.

## Annotated screenshots

The review loop is a screenshot of the canvas with notes drawn on it — boxes,
arrows or numbers, from tldraw's own draw/text tools or any image annotator —
pasted into chat.

1. Treat each annotation as an exact visual target, and say back what you read
   it as ("box 2: tighten the card gap") before touching anything.
2. Read the surrounding UI and the HTML source before editing.
3. Make the smallest source change that satisfies it.
4. Let HMR reload, then verify the same region visually.

Do not build an annotation-to-agent protocol — the screenshot is the bridge.

## State and persistence

The document lives in the browser's IndexedDB under `PERSISTENCE_KEY` in
`canvas/src/App.tsx`. Bump its trailing version **only** when a change would
leave existing documents inconsistent with the code (a shape's props changing
shape) — it discards every persisted hand-drawn annotation. Ordinary layout
drift is what the refresh button is for.

## Verify

```bash
cd "$(git rev-parse --show-toplevel)/canvas"
npm run lint && npm test && npm run build
```

Then, in a fresh browser session: each board page loads with its frames,
headings and captions; the frames stay independently selectable; the styles
panel starts hidden and toggles; the top-bar refresh button rebuilds a board
cleanly.
