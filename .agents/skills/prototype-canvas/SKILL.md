---
name: prototype-canvas
description: Start and operate the local tldraw design canvas in this repo — launch the dev server, add or switch boards under mockups/canvases/, drive shapes through the bounded window.snapCanvas bridge, use numbered Mark pins from screenshots, and work in the embedded terminal. Use when asked to open/launch the canvas, put a mockup on the canvas, annotate or draw on it, fix overlapping frames after a layout.json edit, or respond to a screenshot containing numbered canvas marks.
---

# Prototype Canvas

`canvas/` is a local tldraw app with a real `/bin/zsh` terminal rooted at the
repo. Every `.html` file under `mockups/canvases/<slug>/` is auto-discovered
and rendered as a shape — there is no shape map to edit and no code change
needed to add a board.

## Start

```bash
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT/canvas"
[ -d node_modules ] || npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

- Keep the server bound to `127.0.0.1`. **Never** expose its PTY to a LAN or
  a public URL — it is an unauthenticated shell on the loopback interface.
- Never reuse a port merely because it responds. Its HTML must contain
  `<meta name="prototyping-repo-root" content="$ROOT">`; otherwise it belongs
  to a different checkout. Pick another free port and keep `--strictPort`.
- Open the exact URL Vite prints. Deep-link a board with `?canvas=<slug>`,
  e.g. `http://127.0.0.1:5173/?canvas=notion-ios`.
- If startup fails, run `npm run test:pty` and read the Vite output.

The styles panel and terminal are hidden by default; toggle them from the
toolbar.

## Boards

One folder under `mockups/canvases/` = one tldraw page; one `.html` file =
one shape. Switch with the page menu at the top-left — do not build a
separate switcher. See `mockups/canvases/README.md` for `layout.json` rows,
captions, and the 478 × 980 / sandbox constraints every artboard lives under.

**After editing `layout.json`, press the toolbar refresh button.** Shape
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

## Numbered Mark workflow

The user may pick **Mark — M**, click a spot on the canvas, then paste the
screenshot into chat.

1. Treat each blue numbered pin as an exact visual target.
2. Repeat the mark number back in your plan ("Mark 2: tighten the card gap").
3. Read the surrounding UI and the HTML source before editing.
4. Make the smallest source change that satisfies the marked request.
5. Let HMR reload, then verify the same region visually.

Marks are ordinary canvas shapes and persist with the document. Do not build
a marker-to-agent protocol — the screenshot is the bridge.

## State and persistence

The document lives in the browser's IndexedDB under `PERSISTENCE_KEY` in
`canvas/src/App.tsx`. Bump its trailing version **only** when a change would
leave existing documents inconsistent with the code (a shape's props changing
shape) — it discards every persisted annotation and mark. Ordinary layout
drift is what the refresh button is for.

## Verify

```bash
cd "$(git rev-parse --show-toplevel)/canvas"
npm run lint && npm test && npm run build && npm run test:pty
```

Then, in a fresh browser session: Mark appears in the toolbar and `M`
activates it; each board's frames stay independently selectable; the styles
panel and terminal start hidden and toggle without losing the shell session;
the terminal accepts input, resizes, and renders Nerd Font glyphs.
