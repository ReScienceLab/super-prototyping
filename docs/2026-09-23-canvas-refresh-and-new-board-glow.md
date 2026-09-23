# Canvas refresh: new boards that overlap, and a glow on what just arrived

2026-09-23. Two requests. First, when the agent in the chat panel writes a new
board, the canvas shows it on top of the boards already there, and it takes a
manual force refresh to lay the page out properly. Second, anything new on the
canvas should get a blue glow for about five seconds, so the user can see what
arrived. This note traces the first problem to its cause, checks it against
tldraw's own mechanisms (tldraw 5.4.2, as installed), and records what was
built for both. "As built" at the end says where the build departs from the
plan.

## What happens today

1. The agent runs `gen.py`, which writes `NN-*.html` and maybe `layout.json`
   into a board folder.
2. The recursive watcher in `canvas/vite.config.ts:1520-1580` waits for writes
   to stop for 120 ms, then calls `settle()` (`:1461`) once for the batch.
3. A new file changes `boardSetSignature` (`src/boardWatch.ts`), so `settle`
   calls `rebuild()` (`:797`). That drops the generated index and sends
   `full-reload`. An edited board also gets a `full-reload`. An edited
   `layout.json` gets `sp:board-status` over HMR instead of a reload.
4. After the reload, `handleMount` (`src/App.tsx:1348`) calls
   `initializeCanvasLibrary`. The store has come back from IndexedDB with
   every shape the page had before the reload.
5. `layoutRow`, `layoutImageRow` and the leftover grid (`App.tsx:396-990`) only
   create what is missing. They never move a shape that is already there,
   and the doc comment at `:389` says so on purpose.
6. So when a new board lands anywhere except the end of a row, its computed
   x is the old x of the board that should now move right. Nothing moves that
   board, and the two sit on top of each other. The same happens one level
   up: a row that gets taller never pushes the rows below it down.
7. The force refresh button (`relayoutCanvasLibrary`, `:1096`) deletes every
   library shape on every page and builds them all again. That clears the
   drift. The `LAYOUT_CHANGED` listener (`:1282`) runs the same full rebuild.

The reload also costs the viewport. `handleMount` calls `zoomToFit()` when the
address names no board (`:1370`), so every board the agent writes snaps the
camera back to the whole page.

## Is there a tldraw refresh mechanism we are missing?

No. tldraw has no "refresh" call to make, and none is needed. The store is
reactive (signals): every `createShapes`, `updateShapes` or `deleteShapes`
re-renders exactly the shapes it touched, in the same frame. The overlap is
not tldraw failing to repaint. It is our layout pass never telling tldraw that
the old boards moved.

tldraw's own guidance for syncing a store from an outside source of truth
(here, the board folder) is to reconcile: work out the records that should
exist, then create what is missing, update what differs and delete what is
gone, all in one transaction. The installed API has every piece:

| need | tldraw API (5.4.2) | where |
|---|---|---|
| one transaction, one render, locked shapes editable | `editor.run(fn, { history: 'ignore', ignoreShapeLock: true })` | `@tldraw/editor` d.ts `:8543`, `:8867` |
| keep layout passes out of the user's undo stack | `history: 'ignore'` (same call) | `:8867` |
| move a shape smoothly instead of jumping it | `editor.animateShapes(partials, { animation: { duration } })` | `:3857` |
| mark changes as not the user's own | `editor.store.mergeRemoteChanges(fn)` | `@tldraw/store` `:1797` |

`mergeRemoteChanges` only matters to listeners that filter on
`source: 'user'`. We have none today, so the plan leaves it out.

## Plan, part 1: layout that reconciles

**1. Make every layout pass reconcile rather than only create.**
`layoutWelcomeExtras` already does this for the welcome cards (`App.tsx:821-844`):
it computes each card, then creates it or updates x, y and props where they
differ. Apply the same pattern to `layoutRow` (boards, status banners, link
buttons), `layoutImageRow` and the leftover grid. `createAnnotation` already
updates in place (`:343`). Then delete any library shape on a library page
that the pass did not produce. That covers a board removed or renamed within a
folder, which today needs the force refresh.

**2. Run the whole pass as one transaction.**
Wrap `initializeCanvasLibrary` in
`editor.run(…, { history: 'ignore', ignoreShapeLock: true })`. The user sees
one frame with the final layout, never the in-between overlap, and a Cmd-Z
after an agent run undoes the user's own last edit rather than a layout pass.
`ignoreShapeLock` also lets the pass move the locked boards without the
`deleteLibraryShapes` workaround.

**3. Point both paths at the reconciling pass.**
The mount path and the `LAYOUT_CHANGED` listener both call the reconciling
`initializeCanvasLibrary`. The listener no longer deletes and recreates
everything, so a status change stops flashing every board on every page. The
force refresh button keeps the full delete-and-rebuild as its escape hatch,
for a persisted document that has drifted in some way the reconcile does not
model.

**4. Slide, don't jump (optional, small).**
Within a live page, apply position changes through
`editor.animateShapes(moved, { animation: { duration: 220 } })` instead of
setting x and y outright. When the agent inserts board 03 into a row, 04 and
onwards slide right to make room. This only shows on the `LAYOUT_CHANGED`
path, since a full reload has no "before" frame to animate from. Skip it
when `prefers-reduced-motion` is set.

**5. Keep the camera across the agent's reloads.**
Save `editor.getCamera()` and the current page to `sessionStorage` on
`beforeunload`. On mount, restore them instead of calling `zoomToFit()`
whenever they are present and the address names no board. A reload from the
agent then leaves the user looking at the same spot, and a fresh tab still
fits the page. `sessionStorage` is per tab, so it does not fight the
per-project IndexedDB document.

Out of scope for now: avoiding the full reload itself. The index is a virtual
module, and `canvasLibrary.ts` caches each board's HTML in a Map. An
HMR-only path for a new board is possible, because a new board has nothing
cached. But it needs a second message and a cache eviction for edits, and
steps 1–5 already remove what the user sees of the reload. Revisit it if the
reload still reads as a flash.

The doc comment at `App.tsx:386-395` ("never moves work the user has
repositioned by hand") changes with step 1. Library shapes are locked, and
`lockLibraryShapes` locks them again on every load, so hand-placing a board is
already not a supported state.

## Plan, part 2: a five-second blue glow on new content

### What counts as new

A library shape the reconciling pass *created* rather than updated: a board,
an image, or a welcome card. Captions, headings and status banners arrive with
their board and would only add noise, so they don't glow. Collect the ids
from the pass itself (the `missing` lists every layout function already
builds), and return them from `initializeCanvasLibrary`.

There are two exceptions:

- **First load in this browser.** If the store held no library shapes on
  that page before the pass, everything is "new". Glow nothing.
- **The force refresh.** It deletes and recreates everything by design, so
  it passes a flag to glow nothing.

This works across the full reload a new board causes. The store comes back
from IndexedDB without the new board, so the pass after mount creates it and
reports it.

### How to draw it

Use tldraw's `ShapeWrapper` component slot (public in 5.4.2, d.ts `:8430`).
It is the `div.tl-shape` that `DefaultShapeWrapper` renders around every shape,
already sized and transformed to the shape. The override is a few lines:

```tsx
const freshShapes = atom<ReadonlySet<TLShapeId>>("fresh shapes", new Set());

const ShapeWrapper = forwardRef<HTMLDivElement, TLShapeWrapperProps>((props, ref) => {
  const fresh = useValue("fresh", () => freshShapes.get().has(props.shape.id), [props.shape.id]);
  return <DefaultShapeWrapper ref={ref} {...props} className={cn(props.className, fresh && "sp-fresh")} />;
});
```

Add it to `canvasChromeComponents` next to `InFrontOfTheCanvas`. After a pass
reports new ids, add them to `freshShapes` and remove them 5 s later. The
fade itself is CSS, so JavaScript never runs per frame:

```css
.tl-shape.sp-fresh {
  animation: sp-fresh 5s ease-out forwards;
}
@keyframes sp-fresh {
  0%, 70% { box-shadow: 0 0 0 2px var(--ds-focus), 0 0 32px 8px color-mix(in oklab, var(--ds-focus) 55%, transparent); }
  100%    { box-shadow: 0 0 0 2px transparent, 0 0 32px 8px transparent; }
}
@media (prefers-reduced-motion: reduce) {
  .tl-shape.sp-fresh { animation: none; box-shadow: 0 0 0 2px var(--ds-focus); }
}
```

The glow holds for 3.5 s and fades out over the last 1.5 s. The blue is `--ds-focus`
from `tokens.css`, the same ring as keyboard focus, which has already been
tuned so it stays visible against the dark canvas ground.

### Rejected alternatives

- **`editor.setHintingShapes(ids)`.** It is native and draws tldraw's blue
  indicator with no CSS. But it draws a 1px stroke, not a glow, and it is one
  shared slot that tldraw's own tools set and clear (while dragging, for
  example), so our ids would be wiped mid-glow.
- **An overlay in `InFrontOfTheCanvas`, positioned from
  `getShapePageBounds`.** It works, but it has to follow the camera
  on every pan and zoom, which `ShapeWrapper` gets for free by being the
  shape's own element.
- **Writing `meta.freshUntil` onto the shape.** It would persist to
  IndexedDB, churn records, and outlive the session. The glow is momentary UI
  state, so it belongs in an atom.

### Known limits

- The 5 s starts when the board is created. If the agent writes to a page
  the user is not viewing, the glow has run out by the time they switch
  there. Start the timer on first view only if that turns out to matter.
- The glow does not move the camera to a new board that is off screen. The
  user may be reading something else, and yanking the view is worse than
  missing a halo. If it's needed, add a small "New board ↘" toast that zooms
  on click.

## Order of work and verification

1. Reconcile plus one transaction (steps 1–3). Check: run the canvas, have
   the agent insert a board at the front of a row in the `templates` copy,
   and confirm that the reload shows no overlap and no force refresh is
   needed. Check a status change too: the boards keep their shapes and don't
   flash.
2. Camera persistence (step 5). Check: zoom into a board, have the agent
   write one, and confirm the view is where it was.
3. The glow. Check: a new board glows once, for about 5 s. A first load and
   a force refresh glow nothing. With reduced motion, it shows a static ring.
4. The slide (step 4), last and optional.

For a runnable check, one vitest can pin the invariant that broke: after a
file is inserted mid-row, no two board shapes on a page overlap. This needs
the layout math pulled into a pure function that returns shape partials,
which is also what step 1 wants. Only do that pull if the reconcile turns
out to need it to stay readable.

## As built

- **Line numbers above are from before the server moved.** The watcher now
  lives in `canvas/server/sp.ts` and sends `reload` or `layout` over SSE
  (`/__sp/events`); `src/canvasIndex.ts` turns them into a page reload or
  `LAYOUT_CHANGED`. The cause is unchanged.
- **The old code could not have moved a board even had it tried.** tldraw's
  `updateShapes` silently drops the partial of a locked shape unless the call
  runs under `ignoreShapeLock`, and every library shape is locked. The welcome
  cards' "stale" update had been a no-op since the lock went in.
  `placeShapes` in `App.tsx` does create-or-update, and only works because
  `initializeCanvasLibrary` wraps the whole pass in
  `editor.run(…, { history: 'ignore', ignoreShapeLock: true })`.
- **The sweep replaces two special cases.** Everything the pass places goes
  into one `placed` set, and any library shape on a library page outside it
  is deleted. That subsumes the old star-link deletion and the orphan-heading
  deletion in `layoutWelcomeExtras`.
- **Step 4, the slide, was dropped.** `animateShapes` records history on
  every tick and ends on an `updateShapes` that does not see
  `ignoreShapeLock`, so locked boards would not land. The agent's usual
  change is a new file, which is a reload with no before frame anyway.
- **Step 5 is simpler than planned.** tldraw's local sync already restores
  each page's camera on a reload; it was our `zoomToFit()` that threw it
  away. `handleMount` now skips the fit when the navigation type is
  `reload`. No `sessionStorage`.
- **Glow as planned,** in `canvasChrome.tsx` (`markFresh`, the
  `ShapeWrapper`) and `index.css`. Fresh means a new `canvas-file`,
  `canvas-image` or `canvas-link` shape, and nothing glows when the store
  had no library shapes before the pass. The ring is drawn in page space,
  so it thins out when the page is zoomed far out.
- **Checked by hand in the browser:** a board inserted at the front of a row
  glows, the three after it shift right, the camera stays, the ring is gone
  at 5 s; deleting it closes the row up. No vitest: the layout functions
  need a live `Editor`, and pulling the math out was not needed to keep the
  reconcile readable.
