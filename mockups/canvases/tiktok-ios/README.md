# TikTok, iOS

Fifteen screens of TikTok for iOS on one canvas page, rebuilt from Mobbin
captures and measured with `refkit`. Two runs share the folder: the **bio
editor and post composer**, seven screens off seven @3× captures, and the
**For You feed**, eight screens off eight more. They are two different surfaces
of the app measured off two different capture sets, so they keep separate token
prefixes — `--tk-` and `--tf-` — and separate evidence files, inside one
`:root` block that every board on the page inlines byte-identically.

37 boards: seven foundations, fifteen screens, and the fifteen captures parked
underneath as the source of truth.

Open it with `?canvas=tiktok-ios`, or a single board with
`?canvas=tiktok-ios#03-profile`.

```bash
python3 mockups/canvases/tiktok-ios/gen.py
```

| file | what it is |
|---|---|
| `gen.py` | The source of truth, and the entry point for both runs. Every `NN-*.html` here is its output; edit the generator and re-run, never the HTML. |
| `feed.py` | The For You run's generator. A module rather than a script: `gen.py` imports it, builds the one `:root` the two runs share and writes all 37 boards, because one canvas page takes one `layout.json`. |
| `00-design-tokens`, `00b`/`00c-evidence` | The bio run's contract: 56 tokens with the measurement behind each one. |
| `00d-feed-tokens`, `00e`/`00f`/`00g-feed-evidence` | The feed run's: 46 tokens, three evidence boards. |
| `01-bio-empty` … `07-post-caption` | The bio and composer screens. |
| `01-for-you` … `08-caption-collapsed` | The feed screens. |
| `probes.json`, `crops.json` | The bio run's evidence, in design pt at 3.0 px/pt. |
| `probes-feed.json`, `crops-feed.json` | The feed run's, at 2.2417. Two pairs and not one because `refkit batch` takes a single `--pt` per run, and the two capture sets are at different scales. |
| `iconbuild.py` | Fetches `icon.png` from the App Store and masks it. One shot; the icon is committed. |
| `avatarbuild.py` | Fetches board 3's avatar from a named TikTok account, so no stranger's face ships here. One shot; the PNG is committed. |
| `tilebuild.py` | Cuts one frame out of the clip the boards are posting and centre-crops it to 3:4 as `tile.png`, which fills both content tiles. One shot; the PNG is committed, the clip stays out of the repo. |

Every screen is a 393 × 852 pt frame on a 478 × 980 artboard, fully
self-contained: no external CSS, JS, font or image.

## The bio editor and the post composer

Two Mobbin flows — *Adding a bio* and *Adding a caption* — rebuilt from seven
@3× captures. Those are 1179 × 2556 for a 393 × 852 frame, so the scale is 3.0
px/pt exactly and every `refkit` call for this run passes `--pt 3`.

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

### How close it lands

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

### One generator, seven screens

`gen.py` emits every board and `layout.json`. `TOKENS` is a single list of
`(group, name, value, evidence)` and the `:root` block, the token board and
both evidence boards are all generated from it, so a value cannot drift from
the measurement behind it. Tokens are written `--x-…` throughout the file and
rewritten to the `--tk-` prefix on the way out, so the prefix is one constant.

### What the captures said, and what the renders corrected

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

### The source's own quirks, not the replica's

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

### Substitutions

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

### Assets

- `assets/art/` — this run's 25 crops from `crops.json`, plus the two fetched
  assets `03-avatar.png` and `tile.png`, **committed**. The crops are the one
  thing `gen.py` cannot rebuild without the captures, and the rule against
  committing reference imagery is about whole third-party screens; 25 glyphs
  at their ink boxes are the art a board needs to render at all. `cut()`
  refreshes them from `assets/refs/` when the captures are there;
  `avatarbuild.py` refetches its avatar and `tilebuild.py` re-cuts its frame,
  neither of which needs a capture at all.

## The For You feed

Eight screens of one Mobbin flow — the feed itself and its video player.

Four foundations — `00d-feed-tokens` and three evidence boards, because 46
tokens and their evidence do not fit one 478 × 980 box — then the eight
screens, then the eight captures parked underneath as the source of truth.

| # | board | state |
|---|---|---|
| 01 | For You | Michael Matti's post at rest, chip and two-line caption |
| 02 | Scrubbing | finger down: fat 11.6pt bar, `00:06 / 00:15` readout, paused triangle |
| 03 | Scrub released | just after release, bar still part-expanded with its knob |
| 04 | Playing | the same post playing, marquee mid-scroll |
| 05 | Pull to refresh | Successful Life's post dragged down, "Drag down to refresh" |
| 06 | Next post | the same post at rest, resting 2.1pt progress line |
| 07 | Caption expanded | starfvhls, seven caption lines, Repost pill, saved bookmark |
| 08 | Caption collapsed | the same post with the caption shut to two lines |

Nothing here is a mock of TikTok's design; it is a replica of eight specific
frames. Every creator, string and count is the capture's own, transcribed
rather than substituted, because a fidelity replica that invents its copy
cannot be checked against anything.

### How close it lands

Mean absolute level delta, 0–255, over the 393 × 852 pt phone crop — the whole
frame, chrome and video together, not a sampled region. The render is shot at
`--scale 3 --crop-phone` (1179 × 2556, exactly 3.0 px/pt) and resized to the
captures' own 882 × 1910 before differing.

| board | Δ | where the worst 40px bands fall |
|---|---|---|
| 01 For You | 4.14 | caption lines 1–2 and chip line 2 over bright river; the status bar band |
| 02 Scrubbing | 4.03 | almost all status bar: the least ink of any board, on the brightest sky |
| 03 Scrub released | 5.67 | the same sky with the caption and chip back on it |
| 04 Playing | 5.39 | same again, plus the marquee at a different scroll phase (below) |
| 05 Pull to refresh | 4.42 | bare near-black video, where both sides read `#000002` and the capture's compression blocks do not |
| 06 Next post | 4.93 | same |
| 07 Caption expanded | 8.13 | seven caption lines over textured video — the most ink on any board |
| 08 Caption collapsed | 5.33 | two lines of the same, over a bright band of the same clip |

Mean 5.26. The spread is a function of how much white type each board sets
over how textured a video frame, not of how well any of them is built: board
07 is board 08 with five more caption lines on the same post, and those five
lines cost 2.8 levels. Every band the diff calls worst on f7
(y 1360–1600) is caption; every band it calls worst on f5 and f6 is bare video
where both sides read `#000002`.

Probe replay, `refkit batch probes-feed.json --pt 2.2417 --against
scratch/feed/mine`: **38 probes — 19 colour at mean Δmax 8.7, 19 box at mean |dw| 1.44pt and
|dh| 0.52pt.** The four colour probes still over Δ 10 are read below under
"what is an artifact and not a defect".

### What is cropped and what is rebuilt

Fourteen crops, no generated art. The board's rule is the skill's: only the
picture is cut.

- **The video frame is the only thing cropped** — `v1`…`v8`, each the full
  393.45 × 769.3 pt from the top of the screen down to the tab bar. TikTok
  draws its entire interface on that one moving picture, so each crop carries a
  15–18 box `erase` list that inpaints the nav, rail, chip, caption, scrubber
  and counts back out of the photography, and the board redraws all of it live.
- **Avatars and album discs are crops too** (`avatar-*`, `disc-*`), at
  45.5 × 45.5 and 40.2 × 40.2 pt. They are photographs of three real creators;
  there is nothing to rebuild them from.
- **Everything else is HTML, CSS and 17 inline SVGs** in `assets/icons/`, each
  with its measured ink box as its `viewBox`, and each drawn to fill that box
  edge to edge (below).

Art ships as JPEG q92: the crops are photographs, and the whole set is 1.65 MB
where the same pixels as PNG are 8.28 MB. The captures are themselves JPEG, so
q92 is re-encoding compression artifacts that are part of what the diff is
matching against rather than adding a new generation of them to clean pixels.
Everything in `assets/icons/` stays vector for the opposite reason.

#### The location chip is a scrim, and it is undone before it is redrawn

TikTok scrims the location chip rather than blurring it. f2 and f3 are the one
pair of frames that differ *only* by that chip, which makes the composite
solvable: `chip = 0.587 · video + 16.43`, i.e. `rgba(40,40,40,.41)`. `cut()`
runs that affine backwards over the pixels the chip covered (`unscrim` in
`crops-feed.json`, on seven of the eight crops), so the crop hands back the video
underneath and the board paints its own chip from `--tf-chip` on top. Without
it the chip would be baked into the photograph twice and could never change.

### Substitutions, and what each one cost

- **The face.** `-apple-system` / SF Pro against TikTok's own stack. Cap-height
  ratios agree to within a rounding step at every size — `refkit font` and the
  cap solves in the evidence table are all `cap / 0.714`. What does not agree
  is narrow-base tracking at 11–13px: `t-chip-2` sets ~2% tight
  (`dw +4.5` on the chip's second line, `+4.5` on `copy-w`). It is under half a
  point per word and no wrap moves, so nothing was widened to absorb it.
- **UIKit tightens a line before it truncates.** f1's chip line 1 is the one
  string long enough to truncate, and the capture sets it in 241.78pt where the
  same string at `t-chip` sets 256.50 — 14.72pt spread over 38 gaps. That is
  not a different size; it is UIKit compressing before it ellipsises. Carried
  as `chip_tight=";letter-spacing:-.52px"` on that post only, which is why one
  post in `POSTS` has a property the other two do not.
- **The emoji are the system's.** f7 and f8's caption line 1 ends with U+1FAE7
  (bubbles); Apple's glyph is about 8pt narrower than the one TikTok's capture
  shows, which is the whole of that line's `-8.03` right-edge delta. Every
  other caption line on those boards lands within 4pt.
- **U+10659 is not in any face this board can name.** The ribbon that opens
  starfvhls' caption is a Carian letter and renders as tofu everywhere, so it
  is traced into `assets/icons/bow.svg` at its own ink box (8.9 × 11.6pt) and
  the line starts past it behind a fixed-width spacer. It is drawn, not typed.
- **Captions are absolutely positioned**, line by line, at each line's measured
  ink top. The alternative is a flowed block whose leading has to be solved
  backwards from where seven lines happen to land; positioning each line is
  both shorter and checkable against `scratch/feed/boxes.py`.

### What the source itself gets wrong

- **Mobbin composites the Dynamic Island out of its captures.** The top 54pt is
  bare video with no island, no clock and no status glyphs. That is Mobbin's
  edit, not TikTok's screen. The board follows this repo's rule and takes the
  whole status bar from `templates/gen.py` — 9:41, plain island, the shared
  signal/Wi-Fi/battery SVGs — so `statusbar(island=False)` is called for the
  island only, and the top band shows a deliberate difference on every board.
  No probe sits above y 54 for the same reason.
- **The captures have no rounded display corner.** They are cropped to the
  inner screen rectangle, square. The board draws the 52pt corner mask this
  repo's frame ships with, so the four corners diff against square video.
- **The home indicator is the template's too**, 139 × 5 at the foot. Some of the
  captures have it and some do not; the board always does.
- **The marquee's scroll phase is arbitrary.** The music title scrolls, and each
  capture caught it somewhere. f4 shows "ins: Higher - Croixx · Contain" where
  f1 shows "as: Higher - Croixx · Conta". Board 04 sets its own phase, which is
  most of that board's residual over board 01's. The marquee window is marked
  `data-clip-ok` so `--check-overflow` treats the clipping as intended.

### What the renders corrected

Five things a first reading got wrong, kept here because each one took a
measurement to settle and the wrong answer was plausible.

- **The Repost label is black, not TikTok's brand `#161823`.** Three methods
  agree. The covered pixels sit at (3,2,6) on f7 and (4,3,5) on f8; their
  deficit from the white pill runs 1 : 1.010 : 0.987 across the channels, where
  `#161823` would run 1 : 0.991 : 0.944. 51 of 83 label pixels fall below level
  5, where a `#161823` render has a floor of 27 and nothing under it. The probe
  went from Δ 32 to Δ 3.
- **`t-pill` is 13px, not 12.** Two independent measures: the 'R' cap is 9.37pt
  on f7 and 8.92 on f8 against 8.48 at 12px, and the word sets 42.38pt where
  12px sets 39.70. The pill's own delta fell 23.05 → 14.09 on f7 and
  23.57 → 14.00 on f8.
- **The repost glyph was structurally wrong** — drawn as a closed rounded-rect
  loop with open chevron heads, which renders as a blob at 16pt. Measured off
  the capture row by row it is two open strokes and two *solid* triangles:
  stroke 1.79pt, elbow radius ~1.0 (not 2.9), heads 6.69 × 4.2pt, stems at
  x 21.36 and 30.72. `assets/icons/repost.svg` is now that.
- **Seven icons drew outside their own `viewBox`, and were clipped.** An icon's
  `viewBox` is its measured ink box in page pt and the span carries the same
  numbers, so the glyph is meant to fill the box exactly; a hand-traced path
  lands near it, not on it. The outermost `<svg>` clips, silently: the heart
  lost 1.61pt of its right lobe and the share arrow 2.20pt of its tip, and
  `music`, `bubble`, `live`, `search` and `bow` lost 0.19–0.94pt. Four more
  underfilled and simply rendered small — `play` 1.76pt narrow, `tab-inbox`
  1.16pt short. `scratch/feed/clipcheck.py` finds it by rendering each icon in a
  viewBox grown 5pt on all sides, on a magenta ground, and comparing the ink
  box that comes back; `scratch/feed/icfit.py` then rewrites the geometry so
  the two agree, holding stroke width fixed and iterating, since a fixed
  stroke adds a constant to the box that one pass overshoots. Four passes converged to 0.04pt,
  under the 0.06pt antialiasing quantum. No token moved and no probe moved;
  every board improved by 0.01–0.02 levels.
- **The resting progress line is its own thing, not the scrub bar drawn thin.**
  It was 1.4pt at `.5` over the expanded bar's `track .24`. Solved as an
  integral over f5 and f6 it is 2.1pt, its played half reads 131.5 / 130.2 over
  near-black video and its unplayed half 39.2 / 30.9 — far under what `.24`
  gives. It ships as `--tf-rest` `.43` over a new `--tf-rest-track` `.135`.

### What is an artifact and not a defect

Four things here look like measurement and are not. Each cost a pass to find.

- **`--only flat` is unstable over textured video.** It reports a modal colour,
  and a modal colour over compressed video moves with the texture, not with the
  token. `chip` Δ 16, `track` Δ 22 and `rest-track` Δ 10 are all this: taking
  the mean over each probe's own window instead gives −1.1, −1.2 and ~+4
  levels, and the chip's scrim round-trip is neutral to 1.2 levels. The two
  probes too thin for even a flat census — `rest` and `rest-track`, a 2.1pt
  line — take `--only all` and say so in their notes.
- **`cut()`'s inpaint runs bright under a large erase box.** `play`'s Δ 42, the
  worst number in the batch, is the paused triangle sampled *through* the
  inpainted region its own erase box created: +11.1 levels of it is the
  inpaint, not the token. Part of `track`'s and `chip`'s residual is the same.
- **A tight `--ink` window reads a compression tail, not a plateau.** `ink-tab`
  Δ 11 is eleven outlier pixels inside a brightest-2% window. Ratioing the
  inactive 'Profile' label against the active 'Home' label in the same row —
  same ink, same compression, so the overshoot divides out — gives 0.803 /
  0.801 / 0.803 on f1, f5 and f7 against the render's 0.799. `--tf-ink-tab` at
  `.8` is right.
- **`scratch/feed/boxes.py`'s threshold clips dimmed ink.** f1's caption line 2
  reads `-37.03` at threshold 225 and `-1.79` at 185. The difference is the trailing
  `more`, set in `--tf-ink-3` (`.75` = 191): it clears 225 in the capture only
  because bright river runs underneath it. A row whose ink is dimmed needs its
  own threshold, which is why the `ROWS` table carries one per row.

Two more, about the render side rather than the reference:

- **Resize the 3× shot with BILINEAR, not LANCZOS.** LANCZOS rings: 11px type
  drawn at `.85` tops out at 222 in the 3× shot and at 255 after the resize,
  brighter than the ink can be. `scratch/feed/t25.py` ran the diff against five
  filters and BILINEAR won on every board.
- **Chrome snaps box edges to whole device pixels at 3×, with no antialiasing.**
  A sub-point nudge to a 2pt bar is a whole-pixel jump: moving the resting line
  767.1/1.8 → 767.3/1.85 *dropped* its ink 17%, because 6 device px became 5.
  It ships at 767.2/2.1, which rounds to 2302–2308 — 6 px, the option whose
  centroid is closest to the capture's.

## The folder

- `icon.png` — the folder card's icon, the App Store's own artwork, same
  route as every sibling: `iconbuild.py` reads `artworkUrl512` off the iTunes
  lookup for track `835599320`, resizes to 256 and masks it with the
  superellipse. The source URL is in the PNG's `Source` chunk. This artwork is
  the iOS 26 `AppIcon26`, which carries its own grey glass rim; that rim is
  TikTok's, not a compositing artefact, and the mask is wide enough to keep it.
- `assets/refs/` — the fifteen captures, `cp1`…`cp7` for the bio run and
  `f1`…`f8` for the feed. **Gitignored**, along with the `ref-*` boards built
  from them, so a fresh clone builds 22 of the 37 boards and skips both
  reference rows.

The artwork and the screen designs are TikTok's, reproduced for design
reference. Not licensed for redistribution as product artwork.

### Regenerating

```bash
python3 mockups/canvases/tiktok-ios/gen.py
```

Rebuilds every board and `layout.json`, byte-identical. Verify with:

```bash
refkit tokens mockups/canvases/tiktok-ios
refkit shoot mockups/canvases/tiktok-ios/*.html -o shots --scale 3 --check-overflow
```

The two runs then re-measure separately, because their captures are at
different scales and `refkit batch` takes one `--pt`:

```bash
# bio: generate, shoot every board at 3× with --check-overflow, flatten the
# rounded corners onto white, replay probes.json, write the diffs d1..d7
python3 scratch/pipe.py all

# feed: shoot its eight, resize to the captures' 882 × 1910, diff f1..f8
python3 scratch/feed/render.py
python3 scratch/feed/diffs.py
refkit batch probes-feed.json --pt 2.2417 --against scratch/feed/mine
```
