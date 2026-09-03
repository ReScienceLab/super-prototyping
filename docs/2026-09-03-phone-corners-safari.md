# Phone frames composite themselves so Safari clips their corners

2026-09-03. Yilin opened the Luma canvas in Safari on an iPhone and the screens painted
square: the olive screen background ran past the four rounded corners of the bezel, at a
canvas zoom of roughly 0.4.

## What happened

Every phone frame is `.phone{border-radius:52px;overflow:hidden;box-shadow:<bezel rings>}`
with the screen content inside. Some of that content is composited on its own layer: the
Luma boards blur a background image (`filter:blur`) and put a glass nav bar over it
(`backdrop-filter`); Raycast blurs rows and the home screen behind sheets; Apple Calendar and
Settings use backdrop-filter for their bars and sheets. WebKit clips composited children of
a *non-composited* ancestor through a rectangular ancestor clip, and in some versions and on
some devices that path drops the corner radius. The straight edges still clip (the bezel
rings stay visible along the sides) but the corners fill in square, which is exactly the
screenshot.

The iOS 26.3 simulator renders the corners correctly at every zoom tried (0.42, 0.8, 1,
1.02, 1.5), inside tldraw and on the raw board, so the fault could not be reproduced here
and is tied to the device or iOS build.

## What changed

`transform:translateZ(0)` on `.phone`, in the generators and the generated HTML:

- `mockups/canvases/luma-ios` (gen.py BASE CSS and all 19 boards)
- `mockups/canvases/apple-calendar`, `apple-settings` (gen.py PHONE and the boards that carry it)
- `mockups/canvases/raycast-ios` (hand-written boards)
- `mockups/canvases/templates` (gen.py PHONE and the template boards, so new folders inherit it)

A composited frame clips its children with its own rounded mask rather than through the
ancestor clip, which is the long-standing WebKit remedy for rounded `overflow:hidden` not
clipping composited descendants. It is visually a no-op: headless Chrome and the iOS
simulator render the Luma board pixel-for-pixel as before, including the 60px nav blur.

## What was tried and rejected

- A `.screen` wrapper with `clip-path:inset(0 round 52px)` (or a `-webkit-mask-image`)
  around the content. It clips reliably, but a clip-path or mask on an ancestor turns it
  into a backdrop root and the nav's `backdrop-filter:blur(60px)` degraded to a faint blur
  in both Safari and Chrome: the Invite and More buttons showed through the nav.
- `isolation:isolate` on the wrapper darkened the nav band on iOS.
- `clip-path` on `.phone` itself would cut off the bezel rings and drop shadow, which are
  box-shadows outside the border box.

## How it was checked

- Raw board (`05-host-stats.html`) before and after, headless Chrome and iPhone 17
  simulator: identical, nav blur uniform, corners clean.
- Dev canvas in the simulator at zoom 0.42 and 1 via a temporary camera hook (removed).
- Folders without blur or backdrop-filter (Photos, Wallet, Claude, Duolingo, Notion,
  SnapAction, Spotify, Welcome) were left alone: nothing in their frames is composited.

Generation note: `luma-ios/gen.py` cannot run end to end in a fresh checkout because
`refassets.json` and `walkassets.json` are uncommitted local files, so the HTML for this
change was patched with the same string replacement as the source.
