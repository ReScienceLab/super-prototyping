# No inspector; a double-click zooms to fill

2026-09-26. The panel on the right of the canvas, the inspector, is gone. It showed one board or
picture at a time, larger, with its assets and comments. The canvas already does the first of
those, so a double-click on a board, a picture, a video, or any shape tldraw would not edit now
zooms the camera to fill the window with it (`installDoubleClickZoom` in `canvasClicks.ts`).
Notes and text still edit on a double-click.

What went with it: the in-board agent that let the inspector point at an element, the asset
index in `/__sp/index.json` that named a board's images and icons, and `svgSignature`. A board's
iframe is back to one `sandbox=""` frame. Icons are still kept as files in `assets/icons/`, but
nothing in the app reads them by name any more.

The address works as `docs/2026-09-08-board-links.md` describes, with the selection in place of
the inspector. `#<file>` selects that board and zooms to it. Selecting a shape replaces the
address and adds no history entry, so clicking around the canvas does not fill Back.

tldraw's own double-click is taken over in the select tool's idle state, not watched alongside
it. Over a locked shape (every board is locked), tldraw would otherwise drop a text box, and over
a picture it would start a crop.
