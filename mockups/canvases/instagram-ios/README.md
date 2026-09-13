# Instagram, iOS

Eight user-profile screens of the Instagram iOS app, rebuilt from Mobbin
captures: one account at two scroll positions and across its four profile
tabs, a private account, and two more profiles that carry the pieces the
first one does not. 11 boards, and 8 more that park each capture under its
replica.

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
| 00 | `design-tokens` | 36 tokens in eight groups |
| 00b | `evidence` | One row per token, with the measurement behind it, 1/2 |
| 00c | `evidence` | The same table, 2/2 |

## How close it lands

Mean absolute delta against the captures, in levels of 255, phone crop
(1179 × 2556 at 3.0 px per design pt):

| Screen | whole frame | below the status bar | Screen | whole frame | below the status bar |
| --- | --- | --- | --- | --- | --- |
| 01 Profile | 7.77 | 4.73 | 05 Tagged | 7.36 | 4.30 |
| 02 Grid, scrolled | 6.43 | 3.31 | 06 Private account | 5.06 | 1.84 |
| 03 Reels | 7.47 | 4.41 | 07 NYT Cooking | 6.68 | 3.57 |
| 04 Reposts | 7.40 | 4.33 | 08 AGNEZ MO | 6.42 | 3.29 |

**Both columns are the same render.** Roughly three levels of every whole-frame
number is the status bar, and it is the same three levels on all eight boards,
because the difference there is one fixed thing: the captures have no Dynamic
Island and these boards draw one (see below). The second column is what the
screens themselves score.

The spread inside that second column is photography. 06 is the lowest at 1.84
because it is a white page with one avatar on it; 01 and 03–05 are the highest
because they are nine to twelve photographs plus a story ring, and every ring,
badge and view count set over those photographs is drawn live rather than
cropped. 02 beats 01 by 1.4 on the same account for one reason: it has no ring
and no highlights.

`refkit batch probes.json --pt 3 --against scratch/mine` replays all 23
Phase-1 probes against the renders: **13 colour probes at a mean Δmax of 3.2**,
8 box probes at a mean |dw| of 0.52 pt and |dh| of 0.07 pt, and 2 edge scans
inside a third of a point. Five of the eight box probes are exact on both axes.

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
  nothing carried over from the captures' own bars. The cost is exact and
  identical on every board: the three bands between y 13.3 and 53.3 read Δ
  83.54 / 84.58 / 37.24. The home indicator is simply absent from the
  captures, so `home()` is never called.
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

## What is cropped and what is rebuilt

74 boxes in `crops.json`, each cut from a capture at its measured pt box,
written to `assets/art/<id>.png` and placed back by `art()` at the same
numbers, so an asset cannot drift from where it was measured.

**Only photography is cropped.** Everything else on these boards is live:
type, buttons, the story ring, the highlight rings, the tab bar, the grid's
play / carousel / pin badges and the reels view counts. Those last two sets
sit *on* photographs, so they are listed in each crop's `erase`, inpainted
out of the picture by `cut()` and drawn again on top. 23 glyphs are SVGs in
`assets/icons/`, each with its `viewBox` set to its measured ink box in pt.
**13 of the 23 are Instagram's own drawings, not traces** — see below.

**The two brand marks are original files, not crops.** `assets/brand/`
holds Instagram's own 1080 px and NYT Cooking's 720 px profile pictures,
fetched from the profile API rather than cut out of a capture. They cost
about 6 levels on the Instagram mark and 14 on NYT Cooking's red, which is
the resampling and the capture's own JPEG, and they are worth it: a crop of
a 86 pt circle is 258 px of a logo that exists at 1080. **agnezmo's avatar
stays a crop**, because the live picture is a different photograph now.

## Details worth not re-deriving

- **The story ring is an angular sweep, not a linear one.** Sampled every 30°
  at mid-stroke on c01's d 99.7 ring, the two halves do not mirror about any
  axis, which a linear gradient on a circle always does. `--ig-story` is
  those twelve samples as a `conic-gradient`, closing back on the first.
- **The four tab glyphs are eight glyphs.** Active is not a recolour: the
  active grid is nine solid rounded squares where the inactive one is an
  outlined 3 × 3 table, active reels and tagged are their outlines filled in
  with the play mark and the person knocked out, and active reposts is the
  same two arrows drawn at 3 pt instead of 2. Each pair is a `-on` file
  beside its base.
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
- **Thirteen icons are Instagram's own, pulled out of Meta's bundles.**
  The whole IGDS set ships as `IGDS*Icon.react` modules inside the JS the
  logged-out shell loads: 370 bundles, 202 icon modules, each one an
  `IGDSSVGIconBase` with a `viewBox` and its children. `verified`, `threads`,
  `tab-reels`, `tab-reels-on`, `badge-play`, `badge-carousel`, `badge-pin`,
  `bell`, `link`, `more`, `chevron-down` and `chevron-left` are those paths
  verbatim. It cost between 0.02 and 0.10 levels a board, and it is worth more
  than that: a trace of a 22 pt glyph facets at 2× while every delta reads
  clean.
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

## Assets

`assets/` holds what the boards embed, so they rebuild offline.

- `art/`: 74 PNGs, each a crop of a capture at the box named in `crops.json`.
  **Committed**: without it the boards have no photography.
- `brand/`: the two original profile pictures described above. **Committed.**
- `icons/`: 23 SVGs, inlined by `icon()`. 13 are Meta's own IGDS paths,
  10 are traced off the captures. **Committed.**
- `refs/`: the 8 captures, 1179 × 2556 after their attribution banner is
  cropped off the shipped 1179 × 2676. **Gitignored**, along with the
  `ref-*.html` boards built from them.

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
the 8 reference boards.

Verify with:

```bash
refkit tokens mockups/canvases/instagram-ios
refkit shoot mockups/canvases/instagram-ios/01-profile.html \
    -o scratch/mine/ --w 478 --h 980 --scale 3 --crop-phone --check-overflow
refkit batch mockups/canvases/instagram-ios/probes.json --pt 3 \
    --against scratch/mine
```
