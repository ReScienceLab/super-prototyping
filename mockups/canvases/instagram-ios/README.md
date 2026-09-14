# Instagram, iOS

Fourteen screens of the Instagram iOS app, rebuilt from Mobbin captures.
Eight are one user's profile: an account at two scroll positions and across
its four profile tabs, a private account, and two more profiles that carry
the pieces the first one does not. Six are the feed: the Following /
Favorites switcher open over the home feed, the two feeds it opens, and the
two fullscreen reels views. A fifteenth screen is the profile geometry
carrying a live account instead of a capture. 19 boards, and 14 more that
park each capture under its replica.

| # | Board | What it shows |
| --- | --- | --- |
| 01 | `profile` | The profile at the top of the scroll: story ring, mutuals, buttons, highlights, grid |
| 02 | `grid-scrolled` | The same account scrolled until the tab bar sticks under an opaque nav |
| 03 | `reels` | The Reels tab, 9:16 tiles with view counts |
| 04 | `reposts` | The Reposts tab |
| 05 | `tagged` | The Tagged tab |
| 06 | `private` | A private account: no ring, no bio, two tabs at half opacity, the lock panel |
| 07 | `nytcooking` | A verified business profile: category row, link row, Following pill |
| 08 | `agnezmo` | A verified creator profile: Follow / Message / Subscribe, five highlights |
| 09 | `feed-switcher` | The home feed with the story rail and the Following / Favorites popover open |
| 10 | `following-feed` | The Following feed: two posts, the second one arriving at the fold |
| 11 | `favorites-empty` | Favorites with nobody in it: the illustration, the headline and the CTA |
| 12 | `favorites-feed` | The Favorites feed, a muted reel with its action rail and caption |
| 13 | `reels-toast` | Reels fullscreen with the screen-recording toast over the scrubber |
| 14 | `reels-fullscreen` | Reels fullscreen, the same layout with the toast gone and the scrubber further along |
| 15 | `yilin0xx` | Board 01's geometry filled from the live profile API. No capture behind it |
| 00 | `design-tokens` | 53 tokens in eight groups |
| 00b | `evidence` | One row per token, with the measurement behind it, 1/3 |
| 00c | `evidence` | The same table, 2/3 |
| 00d | `evidence` | The same table, 3/3 |

## How close it lands

Mean absolute delta against the captures, in levels of 255, phone crop
(1179 × 2556 at 3.0 px per design pt):

| Screen | whole frame | below the status bar | Screen | whole frame | below the status bar |
| --- | --- | --- | --- | --- | --- |
| 01 Profile | 7.76 | 4.72 | 08 AGNEZ MO | 6.41 | 3.28 |
| 02 Grid, scrolled | 6.43 | 3.31 | 09 Feed switcher | 6.13 | 2.98 |
| 03 Reels | 7.47 | 4.41 | 10 Following feed | 5.82 | 2.65 |
| 04 Reposts | 7.40 | 4.33 | 11 Favorites, empty | 4.48 | 1.03 |
| 05 Tagged | 7.36 | 4.30 | 12 Favorites feed | 5.74 | 2.57 |
| 06 Private account | 5.06 | 1.84 | 13 Reels + toast | 1.19 | 0.90 |
| 07 NYT Cooking | 6.67 | 3.56 | 14 Reels, fullscreen | 2.58 | 0.26 |

Board 15 is not in that table and has no row anywhere else either: there is
no capture of it to be close to. See below.

**Both columns are the same render.** Roughly three levels of every
whole-frame number on boards 01–12 is the status bar, and it is much the same
three levels on all of them, because the difference there is one fixed thing:
the captures have no Dynamic Island and these boards draw one (see below).
The second column is what the screens themselves score.

Boards 13 and 14 are the exception that proves it, and they disagree with
each other by 2 levels for one reason: **the island costs whatever is behind
it.** Both draw the same black pill over a fullscreen reel. On 13 the video
is black there and the band reads Δ 9.6; on 14 the same band is a lit face at
`#FFAF88` and it reads Δ 58.9.

The spread inside the second column is photography and how much of the frame
it covers. 14 is the lowest at 0.26 and 13 next at 0.90, because a fullscreen
reel is one crop with six glyphs on it. 11 is 1.03 for the opposite reason —
a white page with one illustration — and 06 is 1.84, a white page with one
avatar. 01 and 03–05 are the highest because they are nine to twelve
photographs plus a story ring, and every ring, badge and view count set over
those photographs is drawn live rather than cropped. 02 beats 01 by 1.4 on
the same account for one reason: it has no ring and no highlights.

`refkit batch probes.json --pt 3 --against scratch/mine` replays all 38
Phase-1 probes against the renders: **23 colour probes at a mean Δmax of
2.3**, 13 box probes at a mean |dw| of 0.38 pt and |dh| of 0.10 pt, and 2 edge
scans inside a third of a point. Seven of the 13 box probes are exact on both
axes, and thirteen of the 23 colour probes are exact.

Two colour probes are the known ones and not errors. `link` reads Δ 19 and
`ink-nav` Δ 6 because **iOS stem-darkens text**: the darkest 2% of a glyph
sits about five levels below the fill iOS was asked for, and a link at 13 px
is nearly all stem. The tokens are set from the one solid fill of each colour
on any screen — the 2 pt active-tab underline for `--ig-ink` — and the type
probes are the cross-check, not the authority. The `bg` probe's `_head` note
carries this.

## What the source itself gets wrong

Transcribed faithfully these read as defects in the replica. They are the
captures'.

- **No Dynamic Island and no home indicator.** Mobbin strips both. The boards
  draw the island, because the status bar is this repo's shared chrome and
  comes from `templates/gen.py` byte for byte — clock, glyphs and all, with
  nothing carried over from the captures' own bars. That rule is doing real
  work on these fourteen: c11's bar carries a location arrow, and c13's and
  c14's are white over video rather than black. The arrow is dropped, and the
  white is the one thing the boards do take from the capture — not a glyph
  but a colour, `statusbar("var(--x-ink-inv)")`. The home indicator is simply
  absent from the captures, so `home()` is never called.
- **The active-tab underline is two different widths in one capture set.**
  It is 40 pt on c01, c02, c06 and c08 and 64 pt on c03, c04, c05 and c07,
  on the same four-tab row with the same tab selected. `tabs()` takes the
  underline's x and width per call site rather than deriving them, because
  no rule fits both.
- **c08's fifth highlight label is not centred on its circle.** "F Yo Love"
  sits at x 364, where the pitch puts the circle's centre at 374.
  `highlights()` takes an optional per-item centre for exactly this one item.
- **The reels scrim is baked in.** c03's tiles carry the gradient behind the
  view counts as part of the photograph, so it stays in the crop. Only the
  count itself — eye glyph and number — is erased and redrawn.
- **c09 cuts three things off at its own edges**, and the replica cuts them at
  the same place rather than tidying them up: story ring 4 runs off the right
  of the frame, its label with it, and story labels 2 and 3 are clipped by the
  popover to "d" and "forbu…". Those are the strings the board sets. c12 does
  the same at the bottom, where the next post's header arrives with only its
  avatar, name and badge above the fold. Each is a `clipok()` call, which is
  `data-clip-ok` for `refkit shoot --check-overflow`.

## What is cropped and what is rebuilt

89 boxes in `crops.json`, each cut from a capture at its measured pt box,
written to `assets/art/<id>.png` and placed back by `art()` at the same
numbers, so an asset cannot drift from where it was measured.

**Only photography and editorial art are cropped.** Everything else on these
boards is live: type, buttons, the story ring, the highlight rings, the tab
bar, the grid's play / carousel / pin badges, the reels view counts, and on
the feed boards the whole action rail and the scrubber. 44 glyphs are SVGs in
`assets/icons/`, each with its `viewBox` set to its measured ink box in pt.
**34 of the 44 are Instagram's own drawings, not traces** — see below.

The feed boards are where that line gets tested, because a feed post is a
full-bleed picture with the interface set on it. Every line of type over one
is listed in the crop's `erase`, inpainted out by `cut()` and drawn again on
top. A ring, an outlined pill and an opaque badge are not, because the live
element covers its own pixels one to one and the erase would take the picture
out of the hole it leaves.

**c11's illustration is cropped, not traced.** It is 189 × 93 pt of editorial
art with a dozen colours in it, and the capture is the only source for it.

**The two brand marks are original files, not crops.** `assets/brand/`
holds Instagram's own 1080 px and NYT Cooking's 720 px profile pictures,
fetched from the profile API rather than cut out of a capture, and committed
Lanczos-resampled to 516 px square: twice what an 86 pt circle needs at 3x,
and small enough to inline as a `data:` URI in two boards. They cost about 6
levels on the Instagram mark and 14 on NYT Cooking's red, which is that
resampling and the capture's own JPEG, and they are worth it: a crop of a
86 pt circle is 258 px of a logo that exists at 1080. **agnezmo's avatar
stays a crop**, because the live picture is a different photograph now.

## The one surface that had to be fitted

The feed switcher's popover is a heavy blur of the story rail behind it, and
nothing of that rail survives under it to blur: ring 2's photograph is wholly
covered and ring 3's left half with it. A `backdrop-filter` would have nothing
real to work on, so `--x-pop` ships as a stack of radial gradients.

Their colours are not eyeballed. A `radial-gradient(… C 0%, C00 100%)` lays
colour C down at alpha 1 − t, so a stack of them over a base composites to a
sum that is **linear in the colours** once the centres and radii are fixed.
Put the centres on a 5 × 4 lattice over the popover — cells 29.7 × 30.0 pt,
each reaching its neighbours' centres — and the twenty-one colours fall out of
one least-squares solve against c09's own pixels, with the glyphs and the
rounded corners masked out. It lands at a mean |d| of 4.68 over the 75.5% of
the popover that is ground, and it took board 09 from 3.27 to 2.98.
`scratch/popfit.py` is the solve; the `pop` probe checks one lattice cell at
the bottom right, furthest from the base colour, and reads Δ 3.

## Board 15 carries an account, not a capture

The other fourteen boards are measured against a capture and scored against
it. Board 15 is board 01's geometry with a live profile poured into it:
everything on it -- handle, name, bio, the three counts, the avatar and the
nine tiles -- is what
`api.scrapecreators.com/v1/instagram/profile?handle=yilin0xx` returned on 13
September 2026. So it has no delta, no probe, no crop and no row in the
captures row of `layout.json`.

What it does keep is the geometry, and each number on it is still one of the
captures'. The header is c06's, because c06 is the capture where the column
sits with no story ring: avatar at y 119.67, name baseline 139.84, stats top
154.6, all 10.16 pt above where c01 puts them. The 15.67 pt from the last line
of bio to the top of the buttons is c07's and c08's, which agree on it. The 88
pt from the buttons to the tab divider is c06's, the one capture with no
highlights row in between. The grid is the captures' own 130.33 x 173.67 tiles
at pitch 174.66, its last row cut off by the phone's foot exactly as c02's is.

**A row the account does not have is absent, and everything below it moves
up.** `is_verified` false, so no badge after the nav title;
`has_onboarded_to_text_post_app` false, so no Threads row; `external_url`
empty, so no link row; `highlight_reel_count` 0, so no highlights. That is
four of board 01's rows gone, which is why 15's tab bar sits at 334.51 where
01's sits at 561 -- and why nine of the twelve posts fit above the fold rather
than six.

The pictures are the API's own files, resampled to the box they are placed at
times 3: 516 square for the d 86 circle, 391 x 521 for a tile. A thumbnail is
square or tall and a tile is 3:4, so `photo()` gives them `object-fit:cover`
and lets the grid crop them on the centre, which is what the grid does.

## Details worth not re-deriving

- **The story ring is an angular sweep, not a linear one.** Sampled every 30°
  at mid-stroke on c01's d 99.7 ring, the two halves do not mirror about any
  axis, which a linear gradient on a circle always does. `--ig-story` is
  those twelve samples as a `conic-gradient`, closing back on the first. It
  ships at three geometries — d 100 stroke 4 on a profile, d 93 stroke 3.6 on
  c09's story rail, d 40.33 stroke 2.5 on a feed post's header — and the three
  are not concentric with the avatars inside them on any capture, so each
  keeps its own number.
- **The four tab glyphs are eight glyphs.** Active is not a recolour: the
  active grid is nine solid rounded squares where the inactive one is an
  outlined 3 × 3 table, active reels and tagged are their outlines filled in
  with the play mark and the person knocked out, and active reposts is the
  same two arrows drawn at 3 pt instead of 2. Each pair is a `-on` file
  beside its base. The feed's bottom bar works the same way and shares the
  files.
- **A badge punched into artwork is two discs, not one.** The plus on the
  Your-story ring and the mute on c12's reel are each an opaque disc of the
  badge colour on a slightly larger disc of the ground, because that is what
  the capture shows: a knockout, not a stroke. `disc()` draws both and the
  crop underneath keeps its pixels.
- **The toast ground is translucent, so it has no single flat value.**
  c13's screen-recording toast reads `#736D6D` in the band above its type and
  `#69666C` below it, over the same video. `--x-toast` is `#6C666D`, the mean
  of the two, and the probe takes the lower band because it is the wider one.
- **Solve a stroke width on coverage, against the core, not against 255.**
  Dividing summed `(255 − v)` by 255 reads a grey #6E7074 stroke at about 57%
  of its true width. Dividing by the measured core ink level is what settled
  reposts at 2.95 active against 1.97 inactive, and it is also what caught
  the inactive reels corner: a threshold bbox said the outer radius was 7.5
  and a per-row coverage solve said 5.90.
- **A threshold bbox biases black shapes wider than grey ones.** `--dark 200`
  is fine for finding an element and wrong for measuring one. The tagged
  card's top edge was 2 pt low and its corners 1 pt too round in both states
  before a column scan at x 338 caught it.
- **Boards 03–05 are board 01 scrolled by exactly 208.33 pt.** The mutuals
  row, the buttons and the highlights all move by that one number, and the
  nav goes opaque, so nothing above the mutuals survives. Board 02 is the
  same account scrolled further, and its first grid row is board 01's second
  — which is why 01 and 02 share the crops `ig-t4..ig-t6`.
- **Thirty-four icons are Instagram's own, pulled out of Meta's bundles.**
  The whole IGDS set ships as `IGDS*Icon.react` modules inside the JS the
  logged-out shell loads: 370 bundles, 202 icon modules, each one an
  `IGDSSVGIconBase` with a `viewBox` and its children. `verified`, `threads`,
  `tab-reels`, `tab-reels-on`, `badge-play`, `badge-carousel`, `badge-pin`,
  `bell`, `link`, `more`, `chevron-down` and `chevron-left` are those paths
  verbatim, and so is every one of the 21 glyphs the six feed boards added:
  the bottom nav, the action rail, the two stars, the music note, the mute
  speaker and the wordmark. It cost between 0.02 and 0.10 levels a board, and it is worth more than that: a trace of a 22 pt glyph facets at
  2× while every delta reads clean.
- **The Threads row's second glyph came from threads.com, not instagram.com.**
  Nothing under a Barcelona, thread, comment or note name in instagram.com's
  202 modules draws it. www.threads.com's logged-out profile page names 489
  bundles, 466 of them ones instagram.com never loads, and
  `ThreadsCommentsOutline24Icon` in those is the drawing exactly: a back bubble
  knocked out by the front one, tail bottom-right. The trace it replaced drew
  the back bubble as a closed ring fused into the front one, which is a
  different picture, not a rougher one. Its ink is square on a 24 grid and the
  capture's is 14.67 × 13.33 pt, so `threads-note` is the one glyph here
  that ships stretched 10% wide, on purpose.
- **A module's `viewBox` is its design grid, and `icon()` wants the ink box.**
  `icon()` injects `preserveAspectRatio="none"`, so a glyph shipped on its own
  `0 0 24 24` grid lands short of the measured span by whatever margin the grid
  carries — `more` is 15.07 × 3.07 of ink on a 24 × 24 grid, so it would come
  out at 63% of width and 13% of height. The boxes are measured by rasterizing
  each candidate at a known scale and reading the ink back, because arcs and
  stroked polylines cannot be got out of the `d` string by hand.
- **Two of the set are the wrong drawing and stay traces.** `IGDSLockOutline96Icon`
  is a padlock inside a circle where board 06 draws the circle in CSS, and its
  padlock alone is 38.4 × 49.33 against the capture's 40.67 × 50.67 — swapping
  it cost 06 0.18 levels, so it was reverted. The grid, tagged and crown tab
  glyphs and the plain `eye` are not in either logged-out bundle set at all;
  they live behind the login-walled profile route, which returns 302 to every
  anonymous request. Those 10 stay traces.
- **`refkit diff --top N` does not exclude anything from the mean.** It only
  controls which bands get reported. The second column of the table above is a
  separate `refkit diff` of the same pair with the top 54 pt cropped off both.
  `scratch/dd.py` prints the whole table.

## Assets

`assets/` holds what the boards embed, so they rebuild offline.

- `art/`: 89 PNGs, each a crop of a capture at the box named in `crops.json`.
  **Committed**: without it the boards have no photography.
- `brand/`: the two profile pictures described above, 516 px square.
  **Committed.**
- `icons/`: 44 SVGs, inlined by `icon()`. 34 are Meta's own IGDS paths,
  10 are traced off the captures. **Committed.**
- `photo/`: board 15's ten pictures, the profile API's own files rather than
  crops. **Committed.**
- `refs/`: the 14 captures, 1179 × 2556 after their attribution banner is
  cropped off the shipped 1179 × 2676. **Gitignored**, along with the
  `ref-*.html` boards built from them. `SOURCE` in `gen.py` names where each
  one came from: a Mobbin screen URL for the eight profiles, the flow's own
  filename for the six feed captures.

The captures are Mobbin's, reproduced for design reference; the photography
and the brand marks are Instagram's and the account holders'.

## Regenerating

```bash
python3 mockups/canvases/instagram-ios/gen.py
```

Rebuilds every board and `layout.json`, byte-identical, from anywhere. The
boards are output: edit `gen.py`, never the HTML. A crop is cut from the
captures only when `assets/art/` does not already hold it, so with the committed
art in place a clone rebuilds every screen without `assets/refs/` and skips only
the 14 reference boards.

Verify with:

```bash
B=mockups/canvases/instagram-ios
refkit tokens $B
# every board the probes name -- `batch --against` exits non-zero on a missing render
refkit shoot $B/01-profile.html $B/02-grid-scrolled.html $B/06-private.html \
    $B/08-agnezmo.html $B/09-feed-switcher.html $B/10-following-feed.html \
    $B/11-favorites-empty.html $B/12-favorites-feed.html $B/13-reels-toast.html \
    $B/14-reels-fullscreen.html \
    -o scratch/mine/ --w 478 --h 980 --scale 3 --crop-phone --check-overflow
refkit batch $B/probes.json --pt 3 --against scratch/mine
python3 $B/scratch/dd.py        # needs assets/refs
```
