# The canvas watches the boards itself

2026-09-09. Issue #52: with `PROTOTYPING_CANVASES_DIR` pointing at a project, a board rewritten
on disk never reached the browser. The dev server now watches the boards directory with its own
recursive `fs.watch` instead of asking Vite's watcher to, and answers a settled batch of writes
per kind of file.

## What was wrong

Two things, one for each half of the report.

- `server.watcher.add(canvasesDir)` was the only registration for a directory that is *always*
  outside the app's root — one level up for this checkout, anywhere at all for an installed
  plugin. Adding a path outside the root is accepted silently and, on the reporter's machine,
  registered nothing: no event ever arrived, so the transformed `?raw` module for a board kept
  the HTML read at startup, ETag and all, and no reload in the browser could get past it. The
  cure was restarting the server on every board write.
- Even where the watcher does fire, a board edit did not reach the page. The comment said
  "editing a board already reloads, because the file is in the module graph once fetched", but
  `virtual:canvases` is self-accepting — deliberately, so a `layout.json` edit does not cost the
  viewport — so the update stopped there, and the page keeps every board it has fetched in
  `canvasFileHtml`. What the module hands over on re-execution is layouts, never HTML.

Worth recording: the issue's repro did not reproduce on the machine that fixed it (vite 8.2.2,
Node 26.3.1, macOS 15.7, boards under `/tmp`, run both as `npx vite` and as `bun run dev`).
There, `.add()` did register and the edit did invalidate the module. So the first half is
environment-dependent — which is the argument for not depending on it — and the second half was
reproducible everywhere.

## What changed

- One recursive `fs.watch` on the boards directory, in `configureServer`. Supported on macOS and
  Windows, and on Linux since Node 20; where it throws, the old `server.watcher.add` wiring is
  the fallback, feeding the same queue.
- Events are batched on the trailing edge, 120ms, so a generator writing twenty boards answers
  with one reload once it has finished rather than one per file while it is still writing.
- A batch is answered by what changed, in `boardWatch.ts`:
  - the **set** of boards first — folders and the files the scan reads, as one signature string.
    Moved means a board was added, removed or renamed, the generated index is wrong about which
    boards exist, and the page reloads.
  - a **board** edited: its module is dropped and the page reloads. That is the only way its
    HTML gets back in, and the tldraw document is in IndexedDB, so a reload costs the viewport
    and nothing else.
  - a **layout.json** edited: parsed and sent over `sp:board-status`, the message the status
    endpoint already sends, so a hand edit lands live exactly as a badge click does.
  - an **asset** or `assets.json`: the index is regenerated, because it names a board's images by
    the hash of their bytes.
  - **comments.json**: the index is dropped and nothing else. The page that wrote it holds the
    composer a reload would close.
  - anything else — a generator, a README, `scratch/` at any depth, `assets/refs/` — is ignored.
    Previously a `scratch/draft.html` was a board file to the watcher and reloaded the canvas
    out from under the run that wrote it.

## Checked

Against the dev server on `/tmp/cv`, reading the HMR socket directly: a board edit sends
`full-reload` and the module serves the new HTML; a board folder added or deleted sends
`full-reload` and the index follows; the first board in an empty project appears without a
restart; a hand-edited `layout.json` sends `sp:board-status` and no reload; posting a status or
a comment sends no reload; an asset edited in place reloads; writes under `scratch/` and
`assets/refs/` send nothing at all.
