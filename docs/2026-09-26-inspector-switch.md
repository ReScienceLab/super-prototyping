# The inspector behind a switch; a double-click zooms to fill

2026-09-26. The panel on the right of the canvas, the inspector, used to open on any board or
picture clicked. It showed one at a time, larger, with its layers, styles, tokens, assets and
comments. Showing it larger is what the canvas already does, so a double-click on a board, a
picture, a video, or any shape tldraw would not edit now zooms the camera to fill the window with
it (`installDoubleClickZoom` in `canvasClicks.ts`). A second double-click on it shows the whole
page. Notes and text still edit on a double-click.

The rest of the panel is kept, behind a switch on the canvas strip, right of the ground swatch,
off until turned on. While on, it shows the one board or picture selected, rather than keeping a
selection of its own: the address, Space to present, and the double-click all already follow the
selection, so the inspector does too, and closing it clears the selection. The selected board
then runs the inspect agent in place of the plain hover outline, and a click on it, once it is
selected, picks the element under the pointer (`installBoardHover`).

The address works as `docs/2026-09-08-board-links.md` describes, with the selection in place of
the inspector. `#<file>` selects that board and zooms to it. Selecting a shape replaces the
address and adds no history entry, so clicking around the canvas does not fill Back.

tldraw's own double-click is taken over in the select tool's idle state, not watched alongside
it. Over a locked shape (every board is locked), tldraw would otherwise drop a text box, and over
a picture it would start a crop.
