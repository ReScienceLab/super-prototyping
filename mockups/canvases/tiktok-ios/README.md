# TikTok, iOS

Two Mobbin flows — *Adding a bio* and *Adding a caption* — rebuilt from seven
@3× captures. 10 boards: the token board, two evidence boards and the seven
screens. Seven more park the capture each screen was measured from.

Open it with `?canvas=tiktok-ios`, or a single board with
`?canvas=tiktok-ios#03-profile`.

| file | what it is |
|---|---|
| `gen.py` | The source of truth. Every `NN-*.html` here is its output; edit the generator and re-run, never the HTML. |
| `00-design-tokens.html` | The contract. 53 tokens with the measurement behind each one, inlined byte-identically into all seventeen boards. |
| `00b-evidence`, `00c-evidence` | The same values shown against the captures they came off. |
| `01-bio-empty` … `07-post-caption` | The screens. 393 × 852 pt frames on 478 × 980 artboards, fully self-contained. |
| `probes.json` | 85 measurements, replayable: `refkit batch probes.json --pt 3 --against scratch/mine`. |
| `crops.json` | The 29 boxes cut out of the captures as bitmaps: three regions and every glyph. Everything else is drawn. |
| `iconbuild.py` | Fetches `icon.png` from the App Store and masks it. One shot; the icon is committed. |

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
| 2 | Bio, filled | 3.84 |
| 3 | Profile | 3.43 |
| 4 | Post, empty | 3.54 |
| 5 | Post, keyboard | 5.67 |
| 6 | Post, hashtags | 5.16 |
| 7 | Post, caption | 4.89 |

The gradient is the keyboard. Boards 5 and 6 are three-quarters keycaps, and a
keycap is a rounded rect with a 1.3pt bottom edge repeated thirty times — every
antialiased edge in the grid counts twice, once on each side. Nothing in those
two boards is geometrically off; `01-bio-empty` carries the same keyboard at
2.07 because half its frame is empty ground.

`refkit batch probes.json --pt 3 --against scratch/mine` replays all 85:

- **13 colour probes**, mean Δmax 0.6, worst 3.
- **59 box probes**, mean |dw| 0.68 pt, mean |dh| 0.40 pt.
- **11 edge scans**, all landing.
- **2 band probes** print `differs`, both by under a third of a point:
  `stat-rows` (ref `253.7 .. 266.3`, mine `253.7 .. 266.7`) and `sugg-rows`
  (ref `341.0 .. 352.0`, mine `340.7 .. 352.0`).

The worst box probes are all one emoji: `bio-text` w\* 1.041 h\* 1.193 and
`bio-line` h\* 1.254. See *the emoji is not the same glyph* below.

`scratch/ink.py` compares dark-pixel **counts** over 29 named regions, which is
what separates a weight error from a size error. All 29 land within ±8.5%, and
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
  and `Big Butt M…`; the board ships `Bella's Pizzeria` and `Bridge Market`.
  Same box, same metrics — the widths in `probes.json` are the capture's.
- **Three whole regions are bitmap crops, not drawings** (`crops.json`, which
  also holds the 26 glyph boxes): the profile avatar, the drafts thumbnail and the composer's cover art. Their overlays
  are baked inside the crop — the "motion" tag and the "Edit cover" pill sit
  in `04-cover.png`, and the "Drafts: 1" label in `03-draft.png`. Nothing
  re-types them, so nothing can get them wrong.
- **The emoji glyphs are the host's**, as above.

## Assets

- `assets/art/` — the 29 crops from `crops.json`, **committed**. They are
  the one thing `gen.py` cannot rebuild without the captures, and the rule
  against committing reference imagery is about whole third-party screens; a
  96 × 96 avatar, two thumbnails and 26 glyphs at their ink boxes are the art
  a board needs to render at all. `cut()` refreshes them from `assets/refs/` when the captures are there.
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
