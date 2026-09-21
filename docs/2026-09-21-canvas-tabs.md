# Canvases open in tabs

2026-09-21. tldraw's page menu switched the one canvas in front of you, and the brand kit opened
in a browser tab or a second app window. Now a bar across the top of the canvas holds one chip
per thing open, canvases and kits alike, and the chat panel beside it stays the project's
however many are open. Issue #120.

## The bar is in the page, not in the window

The desktop shell is the obvious place for a tab bar and the wrong one. A tab there is a web
contents of its own, and the chat panel is inside the page: every tab would have come with a
panel of its own, a conversation of its own, and tldraw's megabyte loaded again per tab. The
panel is the project's — the agent it runs works in the project's files, not in whichever canvas
is in front — so the bar has to sit under it in the tree rather than over it.

`.canvas-shell` was a row of chat panel, editor and inspector. The editor's share is now a
column, `.canvas-stage`: the bar, then the body. That is also what makes the bar stop where the
panel starts, which is the visible half of the same decision. And the app runs in three places —
a browser against `sp start`, the dev server, the desktop window — so one bar in `canvas/src`
is the bar in all three.

## A tab is a page that was already open

Every canvas folder becomes a tldraw page at mount (`initializeCanvasLibrary` in `App.tsx`),
whether or not anyone opens it, and tldraw renders only the current one. A canvas tab is
therefore a chip pointing at a page that exists anyway: opening one is a `setCurrentPage`,
closing one leaves the page, its camera and its annotations exactly where they were, and there
is no reason for a tab limit or for loading a tab lazily.

A brand kit is not a page. It is `BrandKit`, the same component `brand.html` serves, positioned
over the editor with the editor left `inert` underneath — left laid out rather than unmounted,
because tldraw measures its viewport from that element and one taken out of the flow comes back
at 0×0 with its camera lost. `.tldraw__editor` had to become a stacking context for the overlay
to cover it at all: tldraw's own container is not one, and its panels sit at z-index 300.

## One address, one tab

`?canvas=<slug>` was already the page. `?brand=<slug>` is that page's kit and `?brand=` the index
of every kit; `urlForTab` writes exactly one of the two, so an address never names a canvas and a
kit at once. `#<board>` is unchanged and only means anything on a canvas tab. The address is
still derived from state rather than edited in place, and Back and Forward still walk it — a kit
in front is a history entry like any other.

`installCanvasUrlSync` gained a subscription for the other direction: a page change that no
address asked for — a card on Start here, a canvas link on a board — opens that canvas's tab and
brings it forward. What a subscription captures at mount it keeps forever, so the two halves of
opening a tab are separate functions: `showTab`, which is stable and only touches state, and
`openTab`, which also sets the tldraw page and is what the chips and the links call.

## The tabs come back, and are checked when they do

Open tabs are a list of `kind:slug` keys in `localStorage`, under the boards directory's own
namespace — the same one the tldraw document uses, so two projects on the same port share tabs no
more than they share a document. Start here is never in the list: it is always the first chip.

Every restored tab is looked up before it is drawn (`resolveTab`). Folders come and go between
visits — a clone made, a folder renamed, a project opened on the port another one was on — and a
chip for one that has gone would be a chip that opens nothing. A canvas the library no longer has
lands on Start here; a kit whose folder collected no material lands on the index of every kit,
which is the page `brand.html` serves for that address too.

## What the "+" replaced

`MenuPanel: null` takes tldraw's whole top-left strip at once: the main menu, the page menu, and
the quick actions and actions menu beside them. Three of the four were already replaced or gone;
the page menu is the one this issue had to take. It named the same folders the chips name now,
and the rest of what it offered — rename, duplicate, delete a page — acts on pages a folder
generates, which the next load puts straight back.

The "+" opens a native popover listing every canvas, open or not, so the list does not change
shape under the pointer; picking one already open brings its tab forward, which is what its chip
would have done. It is placed by hand, from the bar's bottom edge and the button's own box,
because a popover is in the top layer, no ancestor can position it, and anchor positioning is not
in every browser this runs in yet.

## Checked

`tsc -b`, `oxlint` and `vitest run` (23 files, 183 tests) are clean, and `bun run build` writes
the same three entries as before. Then headless Chrome over CDP, against the dev server: the
picker opens two canvases and the kit chip a third tab; a reload brings all three back in order,
with the same tab in front and the same address; closing the tab in front lands on its neighbour,
and closing the last canvas tab lands on Start here with the bare address; Back and Forward walk
the tabs without closing any, and the kit's tab leaves the editor `inert` only while it is in
front. The chat panel's own DOM node survives every one of those switches — stamped before, still
stamped after — which is the whole point of the bar being in the page.

One bug came out of that pass and is fixed: the two destination chips had no `flex: none`, so a
bar with more tabs than room shrank them — the Figma logo first, then the label — instead of
scrolling the tabs, which is what that row is for.

## Not changed

- `?canvas=<slug>` and `?canvas=<slug>#<board>` open what they always opened.
- The inspector, the comments, the context menu and the CTA are where they were. A kit coming to
  the front closes the inspector, because the board it docks onto is no longer in front.
- `brand.html` is still a page of its own. Only the plain left click on the kit chip is taken
  over; ⌘-click and middle click still open it as a browser tab, and the kit's own links still
  work when it is served that way.
