# Boards open as thumbnails, and go live when they are big enough to matter

2026-09-03. Opening a page with many boards stuttered for its first second or two.

## What was wrong

- A page opens with `zoomToFit`, so every board is in view, and every board mounted its
  document in a sandboxed `<iframe srcDoc>` at once: 29 on the ChatGPT page, 15 covers on
  the welcome page. Parsing and painting that many documents, most with inlined images, is the
  stutter. The main thread was not the problem (tldraw's own start-up is ~200 ms of long
  tasks, before and after); the documents are.
- tldraw's viewport culling cannot help at fit zoom, because nothing is off screen, and a
  culled shape stays mounted anyway (it is only `display: none`). Browser lazy loading is
  ignored for `srcdoc` iframes. The on-demand loading from earlier today bounded the download,
  not the parse.

## What changed

- `tools/refkit.py thumbs <folder>` writes `thumbs/<board>.webp`, each board at half size
  with a transparent ground (WebP at quality 90, a quarter of the PNG bytes; 185 files,
  2.8 MB, committed). It is the step after `gen.py`; a stale thumbnail shows the old board.
- `canvas/src/BoardMedia.tsx` draws a board from its thumbnail and swaps the live document in
  by the rule tldraw uses for its own images (a smaller copy while the shape is small on
  screen): live once the board is drawn larger than its thumbnail, i.e. `zoom * scale` at or
  above `THUMB_SCALE` (0.5); never while culled; held as it is while the camera is moving
  (`getCameraState()`), so documents mount and unmount when a gesture ends, not during it;
  always live while the board is being edited or when it has no thumbnail. It reads
  `getEfficientZoomLevel()`, `getCulledShapes()` and `getCameraState()` inside a `useValue`, so
  a shape re-renders only when its own answer changes. The thumbnail stays under the iframe
  until the document's `load` event, so the swap never shows an empty frame.
- Welcome cards use the same component with the cover's fit scale, so a card goes live at
  about 0.87 zoom rather than 0.5.
- Board HTML is fetched only when a board goes live. Opening the ChatGPT page now fetches its
  29 thumbnails (~400 kB) and no documents, where it fetched 29 documents (~1 MB).

Measured with Playwright on Chrome, 1800 x 1000, opening the page cold:

| page | documents at open, before | after | live after zooming to 0.6 |
| --- | --- | --- | --- |
| ChatGPT iOS (29 boards) | 29 | 0 | 7 (the ones in view) |
| welcome (15 covers) | 15 | 0 | 1 (the wide board; cards stay thumbnails) |

## Not changed

- The threshold is in CSS px, not device px. On a 2x display a board between 0.25 and 0.5
  zoom is drawn from a thumbnail scaled up to 2x, which at under 240 px wide is not visible,
  and it keeps the 29-board page at a handful of live documents. Multiply `zoom` by the
  device pixel ratio in `useBoardLive` if that ever reads soft.
- `zoomToFit` on open is kept; the thumbnails are what make it cheap.
- Thumbnails of `ref-*` and `w[0-9]-*` boards are ignored by git with the boards.
