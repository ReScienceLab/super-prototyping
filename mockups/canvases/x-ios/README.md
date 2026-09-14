# X, iOS

Fifteen screens of X on iOS in four flows — switching an account to a
professional one, turning Explore's location off, turning one push notification
off, and turning on a reminder for a Space — rebuilt from Mobbin captures at
exactly 3 capture px per design pt, plus the token board, the type board and
five evidence boards behind them. 22 boards, and 15 more that park each capture
under its replica.

| # | Board | What it shows |
| --- | --- | --- |
| 00 | `design-tokens` | All 71 tokens, as one `:root` block |
| 00a | `type-tokens` | The type ladder, one row per size |
| 00b–00f | `evidence` | One row per token, and what it was read off |
| 01 | `professional-splash` | The hero, the pitch, the legal note, Agree & Continue |
| 02 | `select-category` | The search field and ten category rows, Next disabled |
| 03 | `category-selected` | Entertainment & Recreation checked, Next enabled |
| 04 | `select-account-type` | The Business and Creator cards |
| 05 | `welcome` | "Welcome to X for Professionals" and four setup rows |
| 06 | `edit-profile` | The Edit profile sheet over the profile it edits |
| 07 | `profile` | The finished profile: header, tabs, and the example account's launch post |
| 08 | `explore-settings` | Explore settings, location on, the picker row below it dimmed |
| 09 | `explore-location-off` | The same screen with the switch off and the picker live |
| 10 | `explore` | The Explore tab: live-event hero, five topic tabs, Today's News |
| 11 | `push-notifications` | Push notifications, all nine switches on |
| 12 | `new-followers-off` | The same screen with New followers turned off |
| 13 | `set-a-reminder` | The Space's sheet over a dimmed calendar, Set reminder live |
| 14 | `reminder-set` | The same sheet a tap later: the confirmation banner and the set button |
| 15 | `calendar` | The page under both: host card, three events, and a LIVE card under the nav |

`gen.py` is the only source of truth; the `NN-*.html` boards are its output.
Regenerate from anywhere, byte-identically:

```bash
python3 mockups/canvases/x-ios/gen.py
refkit tokens mockups/canvases/x-ios
```

## How close it lands

Mean absolute delta against the captures, in levels of 255, over the whole
393 × 852 frame minus the three regions in **The score window** below:

| Screen | Δ | Screen | Δ |
| --- | --- | --- | --- |
| 01 Professional splash | 3.33 | 08 Explore settings | 3.52 |
| 02 Select a category | 4.67 | 09 Explore location off | 3.73 |
| 03 Category selected | 5.18 | 10 Explore | 6.74 |
| 04 Select account type | 4.46 | 11 Push notifications | 5.92 |
| 05 Welcome | 5.90 | 12 New followers off | 5.92 |
| **Mean, 01–05** | **4.71** | **Mean, 08–12** | **5.17** |
| 13 Set a reminder | 5.76 | 15 Spaces in your calendar | 7.60 |
| 14 Reminder set | 5.70 | **Mean, 13–15** | **6.35** |
| 06 Edit profile | 16.87 | 07 Professional profile | 56.17 |

**Thirteen of the fifteen are clone scores.** 06 and 07 carry the example account's
own banner, avatar, bio, links and timeline, so what their numbers measure is
the distance between two accounts' content rather than between a replica and
its source. 08–12 carry that account too, but only its handle and, on 10, its
avatar — worth 0.05 to 0.17 levels, measured below. **The account on the
boards** says what is still comparable on all seven and what it comes to.

Across 01–05, 08–12 and 13–15 the spread is type density, not geometry. Every one of
the worst 40 px bands `refkit diff` reports on 01–05, 08, 09, 11 and 12 carries
a line of text, and all but one of their worst rows sample the same flat colour
on both sides, white against white; the exception is `#0F1419` against
`#0E1419` inside 01's button. What the number scores is glyph fringing on a
face the device does not have (below). The lowest are 01, half of which is a
photograph, and 08 and 09, which are two-thirds white; the highest of them is
05, which sets two title lines, a three-line body and four row labels in one
screen.

10 and 15 are the exceptions, and the reason in both cases is contrast rather
than craft. 10 sets "AWS re:Invent 2025" in white over the hero photograph, so
the same sub-pixel drift that scores as white-on-white elsewhere scores as ink
against photograph there; two of its five worst bands are that title and a
wrapped news headline, and the other three are white on white like the rest.
15 is the densest page in the canvas — a heading, a subhead, eight event title
lines, three host names, three times and three counts inside 480 pt — and all
six of its worst bands are those rows. 13 and 14 set the same page under the
veil, which more than halves the contrast of every glyph on it, and both score
below 15 for exactly that reason: four of their six worst bands sample
`#878787` against `#878787`, the veil over white.

03 is the exception worth naming among the first five, and it is the source's,
not the board's: see **What the captures get wrong**.

## The account on the boards

The captures show X's own demo persona, Sam Lee. Boards 06 and 07 show
[@Yilin0x](https://x.com/Yilin0x), read off twitterapi.io on 2026-09-13: the
name and handle, the avatar, the banner and the strip of it peeking above 06's
sheet, the two-line bio, the location, the website, the join month, the two
counts, and one post — the 9/4/26 super-prototyping launch, with its video
thumbnail. 01–05 are the signup flow and carry no account, so they are
untouched, and so are 13–15: the hosts and speakers on those three are other
people's, not the viewer's, and a Space's card is the same card whoever is
looking at it.

Four things follow from that on 06 and 07, and each costs those boards
something:

- **The bio is two lines where "Ordinary guy" is one.** `shift()` drops the
  whole meta block — category, location, join month, View more, the counts,
  the tabs and the timeline — by one 21 pt line. Nothing inside it is re-measured;
  the block moves.
- **The post is taller than the fold.** Four paragraphs of text and a 1.55:1
  video thumbnail do not fit between the tabs rule and the nav, so the
  thumbnail runs under the nav and the action row falls off the board
  altogether. 07 draws no action row, and the reply, repost, like, views and
  bookmark glyphs went with it.
- **The Spaces card is gone**, and ten tokens went with it. Five have since
  come back on a screen of their own: 13–15 draw `spaces`, `chip-card`,
  `r-play`, `r-chip` and `t-pill` again, on the Space's own sheet rather than
  on a post. Five still appear only on 00–00f — `chip`, `chip-ink`, `t-space`,
  `t-date` and `t-host` — and each keeps its evidence row. Those measurements
  were made off the captures and still stand; they have no screen left to sit
  on.
- **The nav bar is white, not purple.** X tints it while a Space is live, which
  is why the capture's is a pale purple wash. Once the Space card went, the
  tint had nothing left to follow, so 07 fills the strip with `--x-ground` —
  the white board 10 already shows. It still fills it, where 10 draws nothing
  at all, because 07's video thumbnail runs under the bar and something has to
  cover it. `--x-nav` keeps its evidence row and its stops; no board draws it.

What is still comparable: outside the three photographs the account brings —
the peek, the banner and the avatar disc, 19.5% of the frame — 06 scores
**4.35** (`scratch/band.py`) against the 16.87 it scores whole, and what is
left inside that is the four field values, the two-line bio most of all. 07's
nav strip read **3.24** while it carried the wash, and reads **13.95** now
that it is white against a purple capture (`scratch/navband.py`) — the glyphs
inside it did not move.

**08–12 get off far more lightly.** The handle is the only thing X's captures
decide that these boards overrule — it sits under four settings titles, in one
13.5 px line — and 10 adds the avatar at 32 pt in its search bar. Mask each and
the numbers barely move (`scratch/persona.py`): 08 3.51 → 3.43, 09 3.72 → 3.64,
11 and 12 5.91 → 5.86, 10 6.74 → 6.57. Nothing else on the five is the
account's, because a settings screen looks the same for everyone.

Three things are left off on purpose. The blue verified badge is not drawn: a
hand-traced lookalike is the thing this canvas's own launch post disclaims.
There is no Website row on 07, because the capture's meta block has no geometry
for one. And the professional category stays "Entertainment & Recreation",
which is what the 02–05 flow picks.

## The score window, and the three things Mobbin did to the export

The captures are Mobbin's export of a phone, not a screenshot of one, and the
export differs from the device in three ways:

1. **The Dynamic Island is composited out** of the top of the frame.
2. **The corners are square**, where the display has a 52 pt radius.
3. **Nothing is painted below 838 pt** — no home indicator.

All three are properties of the export, not of the app, so the boards draw the
island, the indicator and the corners like every other canvas here, and
`scratch/run.py` composites those three regions from the render onto a copy of
the capture before the diff — the island at x 134–259 y 11–47, the indicator at
x 127–266 y 839–846, and the masked corner pixels, which are 0.7% of the frame.
That is the whole of the trim, it is stated in one place, and every number in
this README came out of it.

## The face: Chirp, and what standing SF Pro in for it costs

X sets Chirp on the web and ships it in the app. It is not a system face and no
closed-set matcher can return it, so every board here is SF Pro — and a
substitution shows up as *width* before it shows up as anything else. So none
of the type sizes were read off the iOS ladder. Each one was fitted to a
measured run's ink width, which is why several of them are halves:
`--x-t-space` is 25.5px because 07's "Movie review" measures 157.67 pt on the
capture and SF Pro Heavy at 25.5 sets it to 157.62.

That fit leaves one systematic gap, and it has a cause. The platform serves
**SF Pro Display at 20px and up** and **SF Pro Text below it**, and only the
Text cut is drawn wide against Chirp:

| | capture | drawn | ratio |
| --- | --- | --- | --- |
| 01 title, 26px | 230.67 | 232.00 | 0.994 |
| 07 "Movie review", 25.5px | 158.33 | 157.33 | 1.006 |
| 07 "New Jersey, USA", 14.5px *before* | 97.00 | 111.67 | 0.869 |

The two 07 rows are off boards that still drew the captures' account, and the
third is from before `--x-tr-text` existed; 07 draws neither run today. What
each size was fitted to is on the evidence boards, which quote the capture.

One token closes it. `--x-tr-text: -0.035em` is applied by `track()` to every
run whose size is under 20px and to nothing at or above it. Swept at −0.03 /
−0.035 / −0.04: −0.035 puts the mean of the small-text ink widths on 0.998 of
the capture's and costs about 1% on the whole-screen deltas against −0.04,
which reads narrow.

`scratch/width.py` measures one run per screen-and-token pair on both images,
for the thirteen pairs both images still draw. After the tracking they land at
a **mean width ratio of 0.998, and no run is more than 3.1% out**. One run the
tracking band could not reach is 07's meta line, which redrew 9% wide at 14.5px
with its cap height agreeing; that is why `--x-t-meta` is 13.5px and every
other small size is not.

**Fit against the render, not against PIL.** Every size up to board 07 was
fitted by drawing SF Pro with PIL at 8x, untracked, and the ladder it produced
lands well. The three sizes the Explore flow wanted did not, and the reason is
that the two measurements are of different things: PIL reads `SFNS.ttf`, which
is the Display cut, and it has never heard of `--x-tr-text`. What Chrome
actually ships below 20px is the Text cut, about 6% wider, less 0.035em of
tracking per character. The two errors nearly cancel — which is why the ladder
works — but they do not cancel at every size, and at heavy they do not cancel
at all. `--x-t-sect` and `--x-t-head` came off the PIL fit at 18.5 and 17.5 and
shipped **4.3% narrow** on both; refitting against the shipped render put them
at 19.3 and 18.25, where they read 1.006 and 1.003 of the capture. The third
size disappeared: 14.4 refit to 14.0, which is `--x-t-count` already, so 08's
two descriptions set in that and place their own second line, because their
baselines sit 16.33 apart rather than the 19 the token carries elsewhere.
`scratch/fitshot.py` is the instrument — it measures every run on 08–12 in the
render and in the capture, and prints the tokens already on the ladder beside
the new ones so the two can be judged on the same boards.

**What is left is height, and it is not fixable by moving anything.** The same
thirteen runs have a mean ink-height ratio of 0.9732: SF Pro sets about 3%
taller than Chirp at a width that matches. That is the fringing the delta table
scores, and chasing it by nudging baselines would move correct elements off
their measured coordinates. The line-box constant `boxtop()` uses, K = 0.3455,
was re-solved against ink *bottoms* rather than tops to check exactly this:
"04 Business" lands 268.0 against 268.0 and "06 Edit profile" 103.0 against
103.0, so the +1.0 pt seen at the tops is the taller cap and not a placement
error. K was left alone.

## What is cropped, and what is drawn

> Crop what the capture already contains; draw only what it does not.

`crops.json` is **eleven boxes**, and every one is a photograph: the heroes on
01, 05 and 10, the three facepiles under 10's news items, and the five round
ones the Spaces boards want — 13's host avatar, 15's host avatar and the
pictures on 15's three event tiles. Each facepile is cut as one rectangle,
white gaps included, because the discs overlap. The five round ones are cut as
squares and placed under `border-radius:50%`, and each brings the ring the
capture draws around it: that ring is a property of the picture's own edge, not
a fill a board could redraw. The other
photographs — the banner on 06 and 07, the avatar at four diameters across 06,
07 and 10, and the post's video thumbnail — are the example account's own, so
they come out of `assets/` through `pic()` and never out of a capture.
Everything else — every rule, fill, chip, pill, switch, glyph and run of type —
is rebuilt.

Where interface sat *on* a cropped photograph it is patched out of the capture
before the crop is taken. `gen.py`'s `INPAINT` names seven boxes across p1, p5
and p10 — the status bar clock and its right-hand cluster on p1 and p5, 01's
close disc, and the LIVE chip and event title baked into 10's hero — and
`cut()` fills each with a Coons patch from that box's own four
edges, which is exact on the smooth grounds these sit on and continuous at the
boundary by construction. The chrome is then drawn again in CSS on top.

Drawing 06's peek instead of cropping it found an error the crop had been
hiding. That crop ran to 70.33 and carried 1.33 pt of the sheet's own white
with it, so the sheet drawn at 70.33 met white either way and the seam never
showed. The sheet's top edge is **69.0**: fitting eleven columns across its
12 pt corner puts it there at 0.17 pt rms, where 70.33 sits 1.24 out. Both the
peek and the sheet moved, and 06 went 17.22 to 16.87.

**Thirty-three icons are vectors, not crops.** Each is drawn on X's own 24-unit
grid in `assets/icons/`, and `scratch/mkicons.py` sets each file's `viewBox`
to the glyph's own ink box, so `icon()` maps that box straight onto the ink box
measured off the capture and the canvas's inspector still hands the glyph back
as a vector asset. One consequence is worth knowing before editing any of
them: because the `viewBox` is computed from the path's bounding box, *moving
one part of a glyph moves every other part relative to its placement box*.

**The five bottom-nav glyphs are traced, not drawn.** `scratch/mknav.py` takes
the half-coverage contour off the artwork with marching squares — on the
coverage map itself, because the edge of a 70 px glyph is one antialiased pixel
wide and a hard threshold turns that into a staircase — and `refkit refit`
redraws the polygon as lines, arcs and cubics. `scratch/navfit.py` then slides
each placement box against the window by coordinate descent, over the window's
own two levels rather than white: a ground biased toward white, or ink drawn
blacker than the capture's, pushes the fit toward a bigger glyph. Over 07's nav
strip that took the mean Δ from **6.75 to 3.24** levels — measured against
the purple wash, which is what 07 shipped at the time and what the capture
still holds:

| Glyph | Before | After | Glyph | Before | After |
| --- | --- | --- | --- | --- | --- |
| home | 16.14 | 3.70 | bell | 13.31 | 4.63 |
| search | 7.28 | 4.25 | mail | 13.02 | 5.08 |
| grok | 12.69 | 6.42 | **strip** | **6.75** | **3.24** |

**The Grok mark is the mark.** It is not traced off X's nav at all: this repo's
`grok-ios` canvas carries the same artwork at 165 px in
`assets/art/06-ic-mark.png`, and that is what board 07 draws. The nav renders
it at 70 px, where the dart's razor tips fall below half coverage and shorten
the ink box — which is why the mark's apparent ring span reads 0.800 of its
width there and 0.764 on the 165 px copy, and why its box is fitted rather than
thresholded.

## Approximations

Five things on these boards are fitted, or shipped a shade off what was
measured, and a reader would otherwise take them for measurement:

- **Twenty-eight of the thirty-three icons are approximations of X's artwork,
  not the artwork.** Each is drawn to its measured ink box: the box is the
  measurement and the interior is a redraw. The five bottom-nav glyphs are the
  exception — those are traced off the artwork, as above. The three the Explore
  flow adds go one step past a redraw: the outline house, the bold magnifier
  and the settings gear are each a two- to four-parameter shape swept against
  p10 for best ink overlap, landing at **95.7%**, **96.4%** and **93.2%**
  intersection over union (`scratch/fithome.py`, `fitsrch.py`, `fitgear.py`).
  The gear is the loosest, and that is the eight-lobed
  `r(t) = 8.1 + 0.9 cos 8t` standing in for a tooth profile with flats on it.
  The five the Spaces flow adds — the two bells, the heavy check, the Spaces
  mark and the verified badge — are plain redraws to their measured boxes.
- **The nav gradient.** `--x-nav` is four stops fitted to one row of the wash;
  the capture holds a two-axis gradient that no stop list along one axis
  reproduces. No board draws it any more — see the nav bullet above — so the
  approximation is on the evidence board only. `--x-nav-2`, the wash under 13–15, runs down instead of across
  and is two stops solved on two rows, so it is a measurement — but the
  capture's own lateral drift of two to four levels is still there under it.
- **14's banner shadow.** The capture fades `#62737B` into the dimmed ground
  over 6.5 pt below y 169. That is read as a 3 pt drop at an 8 pt blur and .16
  black, which is a shape chosen to match a falloff rather than a measurement
  of one: it is the only number on 13–15 that was not measured.
- **The veil over the status band on 13 and 14.** `--x-veil` is one black
  everywhere else: fitted as a line per channel over the white page, the host
  card and a tile's purple it comes out the same three times, every residual
  under 0.7 of a level. The band behind the clock does not follow it. It reads
  a flat `#787294` on both captures where the dimmed wash should be `#797187`,
  and nothing going in explains the 13 levels of blue — the fit wants a B of
  280 out of a channel that stops at 255. Over that one band the scrim behaves
  like `rgba(0,0,27,.47)`; the boards ship the plain black and eat the
  difference. The band runs 7.9 levels of mean channel error against the whole
  frame's 6.2, and it is 6.9% of the frame, so shipping it exact would take
  about half a level off each of the two boards (`scratch/bandcost.py`).
- **`--x-chip-card`, `--x-scrim` and the two black discs are solved alphas**,
  not sampled fills. Each one's evidence row on the 00b–00e boards carries the
  arithmetic.

## What the captures get wrong

**Two captures of the same button disagree by 8 levels.** The enabled *Next*
pill samples a flat `#060B13` on p3 and a flat `#0E1419` on p1 and p4, with the
page ground identical `#FFFFFF` on all three, so it is not a colour cast on the
export. The boards paint one `--x-ink` and eat the difference, which is worth
7.11 over that 357 × 52 pt band and 0.51 on screen 03's whole-frame number —
the entire gap between 03 and 02, which are otherwise the same screen with one
checkmark and one pill fill between them. Matching it would mean claiming X has
two different black buttons.

Beyond that, the three export differences in **The score window** above are the
source's too, not the app's.

## Replaying the measurements

`probes.json` is 41 of the measurements in the shape `refkit batch` replays —
the flat-fill censuses, the ink cores, the three coverage solves for the 1 pt
rules, two structural edges and the fitted type widths, each with the note that
says why its window is where it is.

```bash
python3 mockups/canvases/x-ios/scratch/run.py       # regenerate, shoot, composite
refkit batch mockups/canvases/x-ios/probes.json --pt 3 \
    --against mockups/canvases/x-ios/scratch/shot
```

The 22 colour probes come back at a mean Δmax of 1.5 levels and a worst of 9;
the 17 box probes at a mean |dw| of 0.75 pt and a mean |dh| of 0.46 pt; both
scan probes land on their edge exactly.

Every probe here replays a run both sides still draw. Nine measurements cannot
be: five went with the Spaces card X's own post carries, two are the demo
persona's name and location, two are the nav wash that went with the Space, and a shifted run cannot be replayed at all —
`--against` reads one box on both images, and the bio's second line moves 07's
meta block 21 pt down the render. Those nine are on the 00b–00f evidence
boards, which quote the capture and are not replayed against a render. `inv`
stayed by moving to 01's "Agree & Continue", white on `--x-ink` where it used to
be white on the Space card, and `spaces` came back outright when 13 drew a
Spaces card again — it is read off 15's Spaces button, because 13's card is the
same fill two levels of red off it.

`assets/refs/` and the fifteen `ref-*.html` boards hold third-party captures and
are gitignored, so a fresh clone has 22 boards; `gen.py` rebuilds the reference
boards whenever the captures are present. Everything a run makes otherwise
lives in `scratch/`.
