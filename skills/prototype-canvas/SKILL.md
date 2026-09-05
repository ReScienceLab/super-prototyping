---
name: prototype-canvas
description: Start and operate the local tldraw design canvas that shows HTML artboards. Launch the dev server against a project's board folders, add or switch boards, drive shapes through the bounded window.snapCanvas bridge, and act on annotated screenshots of the canvas. Use when asked to open/launch the canvas, put a mockup on the canvas, annotate or draw on it, fix overlapping frames after a layout.json edit, or respond to a screenshot of the canvas with notes drawn on it.
license: Apache-2.0
compatibility: Requires bun and the sp-canvas command from super-prototyping-tools. A modern browser to view the canvas.
---

# Prototype canvas

A local tldraw app that discovers every `.html` file under
`mockups/canvases/<slug>/` and renders it as a shape. There is no shape map
to edit and no code change needed to add a board.

The app ships with this plugin and is installed outside your project. Your
boards stay in your project. `sp-canvas` joins the two, so upgrading the
plugin replaces the app and never touches a board you wrote.

## Start

```bash
sp-canvas start
```

Not found? `sp-canvas` installs separately from the plugin, which cannot run
an installer of its own: `uv tool install
"git+https://github.com/ReScienceLab/super-prototyping#subdirectory=tools"`.

That is the whole thing. It finds the bundled app, installs its dependencies
on first run, boots the dev server on 127.0.0.1:5173, waits for the port to
actually bind, and prints the address.

- **Boards** default to `./mockups/canvases` under the current directory.
  Point somewhere else with `--canvases DIR` or `PROTOTYPING_CANVASES_DIR`.
- **Port** with `--port N`. A port that already answers is never reused: it
  may be another project's canvas, so `start` refuses rather than showing you
  the wrong boards.
- **Two projects can run two canvases.** Everything is keyed by port — the
  session name, the log, the pidfile — so a second `start` on a free port
  leaves the first one alone. `stop` and `status` take `--port` for the same
  reason, and `stop` only ever kills the canvas it started.
- `sp-canvas root` prints which copy of the app it found — and with `-v`,
  everywhere it looked. The first thing to run when the canvas is not what
  you expected.
- Deep-link a board with `?canvas=<slug>`, e.g.
  `http://127.0.0.1:5173/?canvas=notion-ios`.

Keep it on loopback. This is a local design tool, not a service to expose.

A project with no boards yet opens on a notice naming the directory the
canvas resolved, rather than an empty grid: an empty boards folder and a canvas
pointed at the wrong one look identical otherwise.

**A folder created after boot appears on its own.** The dev server watches the
boards directory and rebuilds its index when a board folder or file is added
or removed. Content edits reload through HMR as always. If a `?canvas=<slug>`
link still matches no page, the folder has no `.html` file in it yet — an
empty folder is not a board.

The styles panel is hidden by default; toggle it from the toolbar. Always-snap
is on by default. The setting is per browser, so turning it off in tldraw's
preferences menu sticks.

## Boards

One folder under the boards directory = one tldraw page; one `.html` file =
one shape. Switch with the page menu at the top-left; do not build a separate
switcher. `references/layout.md` has the `layout.json` schema, the caption
rules, and the 478 × 980 / sandbox constraints every artboard lives under.

**After editing `layout.json`, press the refresh button in the top bar,**
next to the `…` actions menu. Shape creation is idempotent. It fills in what
is missing but never moves a shape that already exists, so inserting or
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

The document lives in the browser's IndexedDB under `PERSISTENCE_KEY` in the
app's `src/App.tsx`. A board's identity is its path key, so renaming a folder
or a file orphans that board's shapes; the refresh button rebuilds them.
Ordinary layout drift is what refresh is for, not a persistence-key bump.

## Working on the canvas app itself

Only when changing the app, not when using it. `sp-canvas root` prints the
checkout to work in.

```bash
cd "$(sp-canvas root)/canvas"
bun run lint && bun run test && bun run build
```

Then, in a fresh browser session: each board page loads with its frames,
headings and captions; the frames stay independently selectable; the styles
panel starts hidden and toggles; the top-bar refresh button rebuilds a board
cleanly.

Board discovery is a generated module, not an `import.meta.glob` — see the
`prototyping-canvases` plugin in `canvas/vite.config.ts`. Bump
`PERSISTENCE_KEY` **only** when a change would leave existing documents
inconsistent with the code, such as a shape's props changing shape; a bump
discards every persisted hand-drawn annotation.
