# Boards load on demand, and the canvas fits a phone

2026-09-03. The canvas is public at prototyping.rescience.com now, so it has to work on a
phone, not only on the laptop it was built on.

## What was wrong

- The board HTML was bundled eagerly: every file under `mockups/canvases` (25 MB) came down
  before the first page drew. On a phone that is the whole visit.
- The two top-right pills with their labels were wider than a 393 px screen; the second one
  was cut off.
- The viewport meta lacked `viewport-fit=cover`, which tldraw's own CSS needs to keep the
  toolbar clear of the home indicator.

## What changed

- `canvas/src/canvasLibrary.ts` globs the boards lazily. Each file is its own chunk, fetched
  the first time a shape asks for it through `useCanvasFileHtml`, so a page costs its own
  boards and nothing else: the welcome page fetches 13 covers, the SnapAction page fetches
  its 13 boards (2.8 MB) instead of all 25 MB. (This note first claimed tldraw mounts only the
  shapes near the viewport. It does not: every shape on the page mounts, culling only hides
  the off-screen ones, so this change bounded the download and not the parse. The parse is
  the subject of `2026-09-03-board-thumbnails.md`.)
- The per-folder `advancedChunks` grouping in `vite.config.ts` is gone; per-file chunks fall
  out of the dynamic imports. `server.fs.allow` now includes the repo root, because the boards
  sit outside the Vite root and the eager glob was the only thing that had let the dev server
  hand them out.
- The CTA pill is a CSS class in `index.css`. Under 720 px the labels hide and each pill is
  just its mark (the SnapAction icon, the star and GitHub logo).

## Not changed

- `zoomToFit` on open is kept. On a portrait phone a 2153 px wide board is small, but the
  overview is the point of the page, and pinch-zoom is tldraw's own.
- Real iOS Safari was not available here. The checks ran under Chrome's iPhone emulation.
