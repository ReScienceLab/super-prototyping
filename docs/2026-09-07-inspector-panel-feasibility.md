<!-- Written 2026-09-07 after building the inspector panel design as a throwaway spike on
canvas/ and driving it in a real browser. Kept because sections 3 and 5 are the parts a
future implementation will otherwise rediscover the hard way. The panel shipped the next
day; what it became is in 2026-09-08-vector-assets.md and 2026-09-08-canvas-comments.md,
and this note is kept as the spike that preceded it rather than as a description of it. -->

# Inspecting a board from the canvas: what a spike found

**Date:** 2026-09-07
**Context:** the accepted design is a docked right-hand panel — a large preview of the clicked
board on the left, a fixed rail on the right with layers, properties, assets and tokens.
**Question asked:** does it work against the canvas as `main` has it today?

---

## 1. Executive summary

It works. A click on a locked board opens the panel, the panel squeezes the canvas without
breaking tldraw, and a second iframe reads a board the canvas itself deliberately cannot —
72 layers, 25 assets, 89 tokens and a measured `440 × 956` off `snapaction-ios/01-timeline`.
Swept across all 180 boards in the repo, every one reports.

Three bugs turned up on the way, all now fixed in the spike, all of which any implementation
would have hit. The remaining work is design, not feasibility: the layer list does not scale
to the biggest boards, half the boards have no assets to show, image assets cannot be named,
and the preview stage assumes every board is phone-shaped.

## 2. What was built

`canvas/src/InspectorPanel.tsx` (new, uncommitted), plus edits to `App.tsx` and `index.css`.
It is a spike: it exists to answer questions, not to ship. It still carries an `?inspect=<board>`
deep link added for the probes, and it draws only the Inspect tab of the design.

The probes are `scratch/spike/*.py`, driving real Chrome through Playwright.

## 3. The three bugs

**A frame that stays blank forever.** The panel was intermittently stuck on "reading board…"
with a frame whose document was literally `<html><head></head><body></body></html>`, even
though its `srcdoc` attribute held all 73 KB. Reassigning the *same* srcdoc from the console
brought it instantly to life.

`useCanvasFileHtml` resolves asynchronously whenever the board's chunk is not cached, so React
mounts the iframe with `srcdoc=""` and mutates the attribute a tick later — and Chrome drops
that second navigation while the first is still pending. It only looked intermittent because a
warm cache hides it: click a board the canvas has already drawn and it works, deep-link
straight into one and it never loads. The fix is to not render the frame until the HTML is
there, keyed by path, so the element is *created* with its final srcdoc.

**Every measurement was zero.** A script at the end of the body runs at `readyState:
'interactive'` — before the first layout pass, and before the data: URIs have decoded. Boxes
read there are `0×0` for every element on every board, which is what the properties panel was
faithfully displaying. Measured across the repo, 113 of 180 boards reported a `0×0` artboard.
Boxes have to be read on `load` and again on the frame after it; the agent now marks elements
up front (indices are layout-independent) and measures at send time.

**Not every board has a `</body>`.** The `apple-*` generators emit none. An injector that
splices on `</body>` silently does nothing for them, so the fallback that appends is load
bearing, not defensive.

Two smaller ones, worth knowing:

- `sp:ready` is fire-and-forget, so it is lost for good if it arrives before the parent's
  listener attaches. The frame's `onLoad` asking again covers it.
- Reading `event.source.name` on the frame throws — an opaque-origin window exposes almost
  nothing. Identity has to be `event.source === frame.contentWindow`, which does work.

## 4. What the sweep says about the boards

The shipped agent run against every board (`scratch/spike/sweep.py`):

| | min | median | max |
|---|---|---|---|
| elements per board | 7 | 76 | 352 |
| `:root` tokens per board | 7 | 67 | 89 |

- 180 of 180 boards report. 0 measure `0×0` after the fix.
- 98 of 180 boards contain no images at all.
- 606 images across the repo, 103 of them with alt text. The rest are anonymous data URIs.
- 10 distinct artboard sizes, and not all of them are phones: the evidence boards measure
  around `2152 × 460`.

## 5. What the design still has to answer

1. **The layer list does not scale.** The median board is 76 elements, but
   `luma-ios/11-home-nearby` is 352 and the design-token boards are around 290. A flat
   scrolling list of 294 rows labelled `card`, `a`, `pill` is not navigable. It needs the tree
   with collapsing, or a filter down to text and image nodes.
2. **Assets cannot be named, and half the boards have none.** The panel can honestly show
   dimensions, bytes and reuse count, but not filenames, unless `gen.py` emits names or the
   Vite plugin exposes `assets.json` — `virtual:canvases` currently gives only `fileLoaders`,
   `rawLayouts`, `rawIcons`. For 98 boards the tab is empty either way.
3. **A token resolves to the wrong value.** The spike prints the element's computed `color`
   next to whichever `var()` it finds, so `background:var(--sa-amber)` shows
   `rgb(247,246,242)` — the text colour — instead of `rgb(240,164,104)`. Resolution has to be
   per declaration, not per element.
4. **The preview scale is a constant.** At 85% the board overflows the stage by 33px at
   1024×768 and wastes 142px at 1728×1117. "As large as possible" means fit-to-height computed
   from the stage — and the stage has to cope with a `2152 × 460` board, not just phones.
5. **The camera does not move.** Opening the panel leaves the clicked board wherever it was at
   19% zoom, often behind the panel.
6. **Narrow viewports are undefined.** At 390px the 736px panel is wider than the window and
   the canvas collapses to 0px.

Still open from the design review: whether the panel squeezes the canvas or floats over it.
The squeeze is what was measured here, and it costs a lot — the canvas drops to 703px at a
1440px viewport and to 287px at 1024px.

## 6. Checks

`tsc -b` clean. `bun run build` succeeds. `oxlint` reports three warnings, all spike-level:
`only-export-components`, one useless escape, and a `set-state-in-effect` that a `key={path}`
on the panel would remove.
