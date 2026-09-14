# TikTok, iOS

Two Mobbin flows — *Adding a bio* and *Adding a caption* — rebuilt from seven
@3× captures. 10 boards: the token board, two evidence boards and the seven
screens. Seven more park the capture each screen was measured from.

Open it with `?canvas=tiktok-ios`, or a single board with
`?canvas=tiktok-ios#03-profile`.

| file | what it is |
|---|---|
| `gen.py` | The source of truth. Every `NN-*.html` here is its output; edit the generator and re-run, never the HTML. |
| `00-design-tokens.html` | The contract. 56 tokens with the measurement behind each one, inlined byte-identically into all seventeen boards. |
| `00b-evidence`, `00c-evidence` | The same values shown against the captures they came off. |
| `01-bio-empty` … `07-post-caption` | The screens. 393 × 852 pt frames on 478 × 980 artboards, fully self-contained. |
| `probes.json` | 85 measurements, replayable: `refkit batch probes.json --pt 3 --against scratch/mine`. |
| `crops.json` | The 25 glyph boxes cut out of the captures as bitmaps. Everything else is drawn or fetched. |
| `iconbuild.py` | Fetches `icon.png` from the App Store and masks it. One shot; the icon is committed. |
| `avatarbuild.py` | Fetches board 3's avatar from a named TikTok account, so no stranger's face ships here. One shot; the PNG is committed. |
| `tilebuild.py` | Cuts one frame out of the clip the boards are posting and centre-crops it to 3:4 as `tile.png`, which fills both content tiles. One shot; the PNG is committed, the clip stays out of the repo. |

The captures are 1179 × 2556 for a 393 × 852 frame, so the scale is 3.0 px/pt
exactly and every `refkit` call in this folder runs `--pt 3`.

| # | screen | flow | Mobbin screen |
|---|---|---|---|
| 1 | Bio, empty | Adding a bio | [`84e8a102-…`](https://mobbin.com/screens/84e8a102-216b-4279-8c3d-e24dbb059c89) |
| 2 | Bio, filled | Adding a bio | [`182941ba-…`](https://mobbin.com/screens/182941ba-b854-4847-8c97-e25caf1be1b9) |
| 3 | Profile | Adding a bio | [`28345c40-…`](https://mobbin.com/screens/28345c40-c179-4f4e-800f-dcfaf79a12d7) |
| 4 | Post, empty | Adding a caption | [`3e36eb4c-…`](https://mobbin.com/screens/3e36eb4c-e9ec-455b-9d38-0fe699bd029b) |
| 5 | Post, keyboard | Adding a caption | [`dd6ada3f-…`](https://mobbin.com/screens/dd6ada3f-41ba-4851-bae9-119b3caf85c3) |
| 6 | Post, hashtags | Adding a caption | [`ec1cc372-…`](https://mobbin.com/screens/ec1cc372-d44e-4924-8109-b498437421bd) |
| 7 | Post, caption | Adding a caption | [`c00697f2-…`](https://mobbin.com/screens/c00697f2-3b71-4a9b-840d-ec8536f20aca) |

Flows: [Adding a bio](https://mobbin.com/flows/acb74231-7780-411a-9a4c-01e060755d8b),
[Adding a caption](https://mobbin.com/flows/dd732832-7e44-454d-bc41-3f82b319c676).

**The file-name → screen-id pairing is the one thing here not read off the
pixels.** The harvest names its files in flow order (`adding-a-bio-01.png` …),
so file *N* is taken to be that flow's *N*th screen. Everything else in this
folder is a measurement.

## How close it lands

Mean absolute delta against the capture, whole frame, phone crop, in levels of
255:

| # | screen | Δ |
|---|---|---|
| 1 | Bio, empty | 2.07 |
| 2 | Bio, filled | 3.97 |
| 3 | Profile | 10.87 |
| 4 | Post, empty | 8.35 |
| 5 | Post, keyboard | 10.37 |
| 6 | Post, hashtags | 9.91 |
| 7 | Post, caption | 9.57 |

**Six of these seven numbers are dominated by a deliberate substitution, not
by an error.** Board 1 is the only one that carries none. Every other board
holds at least one region where the capture's content belongs to a real person
and the board ships a stand-in account's instead — the list is under
*Substitutions*. The two content tiles are what move the numbers: board 3's
drafts cell is 131 × 174.3 pt, 6.8% of the frame, and boards 4–7 carry the
same art in a 112 × 148.8 cell, 5.0%. Both hold a 3:4 crop of a different
video from the capture's, so those pixels run to 200-odd levels of difference
and carry the whole-frame mean up several points on their own.
Board 3 adds the avatar disc, another 2.6% at some 70 levels. None of that is
a fidelity score; it is the price of not shipping a stranger's face and video.

What is left is the keyboard. Boards 5 and 6 are three-quarters keycaps, and a
keycap is a rounded rect with a 1.3pt bottom edge repeated thirty times — every
antialiased edge in the grid counts twice, once on each side. Nothing in those
two boards is geometrically off; `01-bio-empty` carries the same keyboard at
2.07 because half its frame is empty ground.

`refkit batch probes.json --pt 3 --against scratch/mine` replays all 85:

- **13 colour probes**, mean Δmax 0.6, worst 3.
- **59 box probes**, mean |dw| 1.42 pt, mean |dh| 0.74 pt.
- **11 edge scans**, all landing.
- **2 band probes** print `differs`, both by under a third of a point:
  `stat-rows` (ref `253.7 .. 266.3`, mine `253.7 .. 266.7`) and `sugg-rows`
  (ref `341.0 .. 352.0`, mine `340.7 .. 352.0`).

The worst box probes are the substituted strings, and they miss by the width
their replacement runs to: `nav-title-3` w\* 0.887 (and clipped by its own
window), `handle` 0.910, `orders` 0.905. Each one's note in `probes.json` says
which string it now measures. After those, the emoji: `bio-line` h\* 1.164 and
`bio-text` h\* 1.136, both widths landing — see *the emoji is not the same
glyph* below. The two fetched tiles land: `draft-row` +0.0 / +0.4 pt, `cover`
+1.7 / +1.0, `editcover` +1.7 / +0.7.

`scratch/ink.py` compares dark-pixel **counts** over 25 named regions, which is
what separates a weight error from a size error. It lists only regions the
board reproduces; a ratio over a substituted string would compare two different
strings. All 25 land within ±8.5%, and
the spread is symmetric — 1.084 worst high (the post-count row), 0.936 worst
low (the "Bio" nav title). A systematic weight error would push one way; this
is headless Chrome's stem darkening against iOS's, and it is not worth chasing.

## One generator, seven screens

`gen.py` emits every board and `layout.json`. `TOKENS` is a single list of
`(group, name, value, evidence)` and the `:root` block, the token board and
both evidence boards are all generated from it, so a value cannot drift from
the measurement behind it. Tokens are written `--x-…` throughout the file and
rewritten to the `--tk-` prefix on the way out, so the prefix is one constant.

## What the captures said, and what the renders corrected

**A bbox cannot tell weight from size.** The composer's `Drafts` and `Post`
labels came out 9% light in ink. The first guess was the weight; `refkit bbox`
said ref 44.3 × 12.3 against mine 42.3 × 11.7, which is a *size*. The composer
runs one size above the profile pills — hence `--tk-t-btn-lg` at 16px where
`--tk-t-btn` is 15px. Ink went 0.911 → 1.021. Growing the size also grew the
left side bearing, so both labels then started 1.3–1.7pt right of the capture
and both `tx` origins moved back to the measured `x0`.

**The keycap letters are lighter than any normal weight.** At 400 the glyph
box matched the capture exactly (11.67 × 17.67) and still set 16% more ink.
Bracketing gave 350 (n 729) then **320** (n 705 against the capture's 698).
`--tk-t-key` ships at 320.

**Every glyph is a crop, because tracing 25 of them by eye was the wrong
method.** `scratch/iconink.py` counts ink inside each glyph's own box, and a
ratio far off 1.0 is not a stroke that wants thinning, it is the wrong shape:
the traced globe read 1.203, `kb-emoji` 0.773, `share` 0.851. At 6× the globe
was a tennis ball and the share arrow curved where the source's is a hollow
forward-arrow. All 25 now come out of the captures at their measured ink
boxes, one line of `crops.json` each — the rule `grok-ios` already applies to
66 of its 69 icons, where a crop scores 0 by construction. Every board
improved: 2.28 → 2.07, 3.95 → 3.84, 3.72 → 3.43, 3.81 → 3.54, 5.91 → 5.67,
5.26 → 5.16, 5.16 → 4.89. Three tokens went with them — `--tk-glyph`,
`--tk-glyph-2` and `--tk-mark-off`, the last being the flat-fill census's
finding that the Share-to marks are desaturated (`#A5A2A5` / `#A6A3A6`) rather
than brand-coloured. The finding still holds; the crop simply carries it, and
a token no board reads is not evidence.

**The avatar's ring is a gradient, and its endpoints are not the colours on
the ring.** A CSS `linear-gradient` runs corner to corner of its box, so the
inscribed ring only ever samples the middle 68% of it — read the ring's own
bluest and greenest arcs into the gradient and both come out washed. Fitting
all 116 clean ring samples back to the full gradient line gives `#0E9DFF` to
`#19FEBF`, neither of which appears anywhere on the ring. Mean colour error
around the ring: 14.9 → 9.6 levels.

**A place chip is its label plus 6-7pt, so a substituted name has to fill the
box it replaces.** Two of the four names are neutral stand-ins (below), and
the measured boxes are kept. Sized by eye, the short one sat in 15.7pt of
padding and the long one overflowed to 1.0pt — the only two chips on the
screen whose padding did not match the other two. `scratch/fitnames.py`
renders a candidate at the chip's own type token and reports its width, which
is what picked `Northside Pizzeria` (108.7pt into a 120.3pt box) and
`Bridge Cafe` (69.7 into 82.0). Padding now reads 5.3-7.0 against the
capture's own 6.3-7.3. Board 4 went 3.54 → 3.47, board 5 5.67 → 5.62, board 7
4.89 → 4.82.

**The create button is cyan, then pink, then black on top.** Painting pink
last buried the cap and the cyan. A column scan reads cyan 175.0..179.0, dark
`#141723` 179.3..213.7, pink 214.0..218.3 — colour only at the two edges. With
the dark rect painted last, board 3 went 3.97 → 3.72.

**The footprints glyph has waist bars.** Read as two plain ovals at first. A
scan of the capture gives stroke 1.7pt with a bar at 80.3..82.0 on the left
print and 84.7..86.0 on the right.

**The emoji is not the same glyph.** The bio string's emoji renders from
whatever the host has; headless Chrome's is taller and wider than iOS's, which
is the entire `bio-text` / `bio-line` height overshoot. Substituting a drawn
SVG would land the box and lose the point — the board says "this is an emoji",
and the delta is honest about which one.

## The source's own quirks, not the replica's

- **Mobbin composites the Dynamic Island out.** All seven boards ship
  `island=False`. The pill is in every real iPhone 15 screenshot and in none
  of these.
- **The captures are Dutch-locale.** The space bar reads `spatie`. It is
  transcribed, not translated.
- **The Mobbin watermark stays on the reference boards.** `ref-*` embeds the
  untrimmed 1180 × 2676 file — screen plus attribution strip — at its own
  aspect. Forcing it to 393 × 852 squashes the screen 4.5%; the frame's corner
  radius is dropped to 28px there so the watermark word is not clipped.
- **Three by-design mismatches between a `ref-*` board and its replica.** The
  Dynamic Island above; `--crop-phone` rounds the render's 52pt corners and
  fills them with bezel, which is why `tabbar-hairline` and `tabbar-5` stop
  short of the corner and `badge-x` and `card-sub` were narrowed to clear a
  neighbour's ink; and everything in `crops.json` is a crop of the capture,
  so it carries its compression.

## Substitutions

Everything below is a deliberate departure from the capture. Each one is a
string or a mark that would otherwise reproduce a real person's content.

- **Two location chips are renamed.** The capture reads `Big Dick's Pizzeria`
  and `Big Butt M…`; the board ships `Northside Pizzeria` and `Bridge Cafe`,
  each chosen to render within a point or so of the width its box was built
  for. Same box, same metrics — the widths in `probes.json` are the
  capture's, and the fourth chip runs off the right edge in both.
- **The account is a stand-in throughout.** The capture's profile is one real
  person's, so the name, the handle, the bio and the row under it all belong
  to `@snapaction_ai` here: `snapaction_ai` at `--tk-t-nav` (113.0 against the
  capture's 76.3), `@snapaction_ai` (125.0 against 113.7), and
  `snap it, act later 🕺`, measured back to the capture's own ink box — 125.3
  against 125.7. The character counter is not typed: `gen.py` derives it from
  the bio by the rule the capture's own `19/80` fixes — TikTok counts UTF-16
  units, so the dancer costs two — and this bio comes to `21/80`.
  `ACCOUNT` and `BIO` in `gen.py` are the two knobs.
- **The TikTok Shop row is the account's site.** The capture's row reads
  `🛒 Your orders`, which is that person's order history. The board puts
  `snapaction.ai` there on the same centre, behind board 4's own globe glyph
  at the 17pt it was cut at: icon + 3.67 + text, 110.0 wide against the
  capture's 97.7.
- **Both content tiles are the account's own video, not the capture's.**
  Board 3's drafts cell and boards 4–7's cover cell held frames of a
  stranger's video, which is the one thing on these boards a caption is
  actually about: board 3 has it as a draft, boards 4–7 are posting it. Both
  cells are 3:4, so one bitmap fills both — `tilebuild.py` centre-crops
  `@snapaction_ai`'s own clip to 3:4 rather than letterboxing it, because a
  cover fills its cell. That keeps 1080 of the clip's 2560 columns, which is
  what makes the frame worth choosing: at 9.0s the demo is on its result card,
  the one frame that still reads as a product at the 112pt the cover is scaled
  to, where the frames of scrolling mail are mush. The clip itself is 39MB and
  stays out of the repo, so the script takes its path and the PNG is
  committed. The chrome TikTok draws over a cover is TikTok's, so it is
  redrawn rather than carried in the bitmap — "Drafts: 1" on board 3, and
  "Preview", the 40% bar and "Edit cover" on board 4. The capture's own
  watermark and sticker went with its video. This is what board 3 and boards
  4–7 cost in *How close it lands*.
- **The scrim under the two top labels is the one thing here the capture does
  not have.** TikTok draws them bare: zoom into the capture's cover and
  "Preview" is plain white with no scrim and no shadow, half of it lost in the
  sky behind it. That works because the capture's videos are dark where the
  labels land and this clip is a white-UI screen recording — every frame in it
  measures 240-odd in that box, so a bare label is not dim, it is gone. The
  `tile-scrim` token puts a top-down gradient under both, 0.30 of each cell's
  height, and "Edit cover" keeps the 40% bar it was measured at. It is drawn
  under the labels rather than into `tile.png` so the frame stays the frame.
- **The profile avatar is the same account's.** The face in the capture
  belongs to a real person, so board 3 ships `@snapaction_ai`'s avatar,
  fetched by `avatarbuild.py` — point its `PROFILE` at another handle to swap
  it, and `tilebuild.py`'s `SITE` with it. Everything around it is geometry
  and stays drawn: the 4pt gradient ring, the 2.5pt page-coloured gap, the
  notch and the + badge. The asset is a plain 288 × 288 square and carries
  none of them.
- **The emoji glyphs are the host's**, as above.

## Assets

- `assets/art/` — the 25 crops from `crops.json` plus the two fetched assets,
  `03-avatar.png` and `tile.png`, **committed**. The crops are the one thing
  `gen.py` cannot rebuild without the captures, and the rule against
  committing reference imagery is about whole third-party screens; 25 glyphs
  at their ink boxes are the art a board needs to render at all. `cut()`
  refreshes them from `assets/refs/` when the captures are there;
  `avatarbuild.py` refetches its avatar and `tilebuild.py` re-cuts its frame,
  neither of which needs a capture at all.
- `assets/refs/` — the seven captures. **Gitignored**, along with the `ref-*`
  boards built from them. A fresh clone therefore builds 10 of the 17 boards
  and skips the reference row.

- `icon.png` — the folder card's icon, the App Store's own artwork, same
  route as every sibling: `iconbuild.py` reads `artworkUrl512` off the iTunes
  lookup for track `835599320`, resizes to 256 and masks it with the
  superellipse. The source URL is in the PNG's `Source` chunk. This artwork is
  the iOS 26 `AppIcon26`, which carries its own grey glass rim; that rim is
  TikTok's, not a compositing artefact, and the mask is wide enough to keep it.

The artwork and the screen designs are TikTok's, reproduced for design
reference. Not licensed for redistribution as product artwork.

## Regenerating

```bash
python3 mockups/canvases/tiktok-ios/gen.py
```

Rebuilds every board and `layout.json`, byte-identical. Verify with:

```bash
refkit tokens mockups/canvases/tiktok-ios
refkit shoot mockups/canvases/tiktok-ios/*.html -o shots --scale 3 --check-overflow
```

`scratch/pipe.py all` does the whole loop — generate, shoot at 3× with
`--crop-phone`, flatten the rounded corners onto white, replay `probes.json`
and write the seven side-by-side diffs.
