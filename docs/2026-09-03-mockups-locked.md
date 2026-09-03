# Mockups are locked on the canvas

2026-09-03. Readers of prototyping.rescience.com were dragging boards out of their rows when
they meant to pinch or scroll. A viewer should be able to move the camera and nothing else.

## What changed

- Every shape the library places is created with `isLocked: true`: the boards, the row
  headings, the captions, and the cards and buttons on the welcome page. Locked, a shape cannot
  be selected, dragged, resized or deleted by pointer; only the camera moves. The id prefixes
  that count as library shapes are in one list, `LIBRARY_SHAPE_PREFIXES` in `App.tsx`.
- `lockLibraryShapes` runs on every load and locks any library shape that is not, for canvases a
  browser persisted before this change, and for anything unlocked by hand with "Unlock all".
- tldraw treats a pointer that lands on a locked shape as one that landed on the canvas, so a
  locked shape's `onClick` never runs and the welcome cards would have stopped opening pages.
  `installLockedLinkClicks` in `CanvasLinkShapeUtil.tsx` listens to the editor's own pointer
  events instead: press and release over the same locked link, with no drag and no pinch in
  between, runs that link's `onClick`. Only the select tool follows links, as before. The card
  and button containers take pointer events for the hand cursor alone; hit-testing stays with
  the canvas.
- Deleting a locked shape is a no-op in tldraw, so the force-refresh button and the welcome
  page's stale-shape cleanup delete through `editor.run(fn, { ignoreShapeLock: true })`.

## Not changed

- Hand-drawn shapes and notes are still unlocked and editable. Only what the library places is
  locked.
- Positions are still declared by `layout.json`. A board unlocked with "Unlock all" and dragged
  keeps its new position (creation is idempotent) and locks again on the next load; the
  force-refresh button puts it back where the layout says.
- Double-clicking a board no longer enters edit mode, so a board's own scrolling is not
  reachable. No board in the library scrolls today.

## Checked

Headless Chrome with CDP against the dev server: mouse drag and touch drag on a board and on a
card leave them where they are; a click or tap on a card opens its page; a URL button opens a
new tab; a caption unlocked and moved through the agent bridge is locked again after reload,
and put back by force refresh.
