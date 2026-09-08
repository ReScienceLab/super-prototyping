# Every board has an address

2026-09-08. A page had a link, `?canvas=<slug>`, and a board did not, so pointing at one screen
meant "the third one in the second row of luma-ios". Now `?canvas=<slug>#<file>` is that board,
`canvases/<slug>/<file>.html`: open the link and it is in the inspector, with the camera on it.

## What changed

- The board goes in the hash, not a second query parameter. It is a location within the page,
  which is what a fragment is, and it is what the address bar already shows when a board is
  clicked: the inspector opening or closing writes the address, the way a page change always
  has. `canvasUrl.ts` reads and writes both halves.
- The address is derived, never edited in place. `installCanvasUrlSync` in `App.tsx` computes it
  from two things, the current page and the board in the inspector, and the board only counts
  when it is one of that page's. Two writers (the page reaction, the inspector's open and close)
  call one `write`, so they cannot disagree, and an inspector left open across a page change
  simply drops out of the address.
- Applying an address is the one time the page changes without the address needing to follow.
  The reaction stands down while `apply` runs, and `apply` corrects the address once, without a
  history entry, when it named a page or board that does not exist.
- The hash edited by hand in the address bar is a same-document navigation, so it arrives as a
  `popstate` and goes through the same `apply` as Back and Forward.
- The camera goes to the board after the inspector has taken its share of the window, in a
  layout effect. tldraw measures its viewport on a throttled resize observer, up to 200ms
  behind, so the effect measures it itself (`updateViewportScreenBounds`) before `zoomToBounds`;
  without that the board is fitted to the width the panel just took. When the address names a
  board the page is not zoomed to fit first, or the fit would land after and undo it.

## Not changed

- `?canvas=<slug>` alone does what it did: the page, zoomed to fit, no inspector.
- Clicking a board does not move the camera. The reader just clicked it.
- The inspector still stays open across a page change; only the address stops naming it.

## Checked

Headless Chrome (Playwright) against the dev server: a board link opens the inspector on that
board with the board fully in view and centred in the canvas beside the panel, and pushes
nothing; closing drops the hash and pushes one entry; Back reopens the board; clicking another
board writes its hash; a page-menu change writes `?canvas=` without a hash and Back restores
page and board; an unknown hash, edited in place or on a fresh load, leaves the inspector closed
and is replaced, not pushed; `#00-welcome` works on the bare URL; a page link alone writes
nothing and shows the whole row.
