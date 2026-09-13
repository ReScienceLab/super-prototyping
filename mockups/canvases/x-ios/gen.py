"""X for iOS -- switching to a professional account, in seven screens.

Regenerates the whole folder in place, byte-identically, from anywhere:

    python3 mockups/canvases/x-ios/gen.py
    refkit tokens mockups/canvases/x-ios

Every colour and every metric in here was read off seven Mobbin captures at
exactly 3 capture px per design pt (1179 px across a 393 pt screen, 2556 down
an 852 pt one), and every one of them is stated with its evidence on the
00b/00c boards. Nothing was eyeballed. The artboards are output: never
hand-edit an .html, edit this file and re-run.

Four decisions the captures force.

THE FACE IS THE PLATFORM'S, NOT CHIRP. X ships Chirp on the web; iOS renders
SF Pro, and every size in the Type group below was fitted to a run's measured
ink width against SF Pro at 8x rather than assumed off the iOS ladder. The
fits land inside half a pixel -- 07 "Movie review" measures 157.67 and Heavy
25.5 draws 157.62 -- which is why several sizes are halves.

ONLY PHOTOGRAPHS ARE CROPPED. Six crops (crops.json): two heroes, a banner, a
peek of the page under a sheet, and one avatar that serves five places at five
sizes. Everything else on these screens -- every rule, fill, chip, glyph and
run of type -- is rebuilt. Where interface sat on a photograph it is patched
out of the capture first (INPAINT below, a Coons fill from each box's own four
edges) and drawn again in CSS on top: 01's close disc, 07's four header discs
and, on all three, the status bar.

THIRTY ICONS ARE VECTORS, NOT CROPS. Each one is drawn on X's own 24-unit grid
in assets/icons/, with a viewBox that is the glyph's ink box, and inlined by
icon() at the ink box measured off the capture, so the canvas's inspector
hands it back as a vector asset. Most are approximations of X's artwork; the
five bottom-nav glyphs are not. Those are traced off the artwork at half
coverage and redrawn as lines, arcs and cubics, and the Grok mark is traced
off grok-ios's own copy of it at 165 px rather than the nav's 70 px.

THREE DEFECTS BELONG TO THE SOURCE. Mobbin composites the Dynamic Island out,
drops the home indicator, and exports with square corners. All three are this
repo's frame and are drawn here regardless, so the diff window is trimmed --
see README.md.
"""
import base64, json
from pathlib import Path

OUT = Path(__file__).resolve().parent
REFS_DIR = OUT / "assets" / "refs"
ART_DIR = OUT / "assets" / "art"
# Unlike everything else under assets/, these are never inlined as data: URIs.
# manifest.json places them as image shapes of their own, one row per surface,
# so the canvas can compare avatar against avatar down the page.
BRAND_DIR = OUT / "assets" / "brand"
CROPS = {k: v for k, v in json.loads((OUT / "crops.json").read_text()).items()
         if not k.startswith("_")}
SCALE = 3.0                                       # capture px per design pt

NAME = "X iOS"
PAGE_NAME = "(example) " + NAME
P = "x"          # token prefix: --x-ink, --x-accent, --x-t-body

# ---------------------------------------------------------------- tokens ----
# (group, name, value, evidence). The :root block and the evidence table are
# both generated from this list, so a value cannot drift from the evidence
# behind it, and a token cannot ship without one.
TOKENS = [
 ("Font", "font", '-apple-system,BlinkMacSystemFont,"SF Pro Text",'
                  '"SF Pro Display","Helvetica Neue",Helvetica,Arial,sans-serif',
  "Every size in Type was fitted by ink width against SF Pro rendered at 8x "
  "and lands within 0.4px of the capture: 07 'Movie review' 157.67 measured "
  "against 157.62 drawn at Heavy 25.5. X's own Chirp is not on the device"),

 ("Surface", "ground", "#FFFFFF",
  "06 the empty band between its hairlines at 664.67 and 697.00, x 4-389 y "
  "668-694: #FFFFFF on 100% of the pixels; 06 the bio row's right half "
  "(x 200-389 y 355-438) the same"),
 ("Surface", "field", "#EFF3F4",
  "02 the search field's interior right of the placeholder (ends 189.7) and "
  "inside the 34pt box at y 260-294: flat #EFF3F4"),
 ("Surface", "spaces", "#7856FE",
  "07 the Spaces card, x 61.33-384.00 y 477.67-691.67, sampled between "
  "'Movie review' (ends 552) and the play row (from 612): flat #7856FE"),
 ("Surface", "chip", "#ECE8FF",
  "07 the post's Host chip, x 61.33-102.00 y 451.00-469.33, outside the "
  "label ink (66.67-97.00): #ECE8FF"),
 ("Surface", "chip-card", "rgba(255,255,255,.30)",
  "07 the Host chip inside the card reads #AA94FA against the card's "
  "#7856FE: (170-120)/(255-120) = .370, (148-86)/(255-86) = .367, "
  "(250-254)/(255-254) rails at white, so .30 on the two channels that "
  "carry it once the chip's own antialiasing is dropped"),
 ("Surface", "pill-off", "#88898D",
  "02 the disabled Next button, x 18-375 y 754-806, outside the label ink "
  "(180.0-213.67): flat #88898D"),
 ("Surface", "disc-1", "rgba(0,0,0,.75)",
  "01 the close disc on the hero, d 28 at (18, 67.3): the disc reads about "
  "a quarter of the hero's own luminance right through it, and the hero "
  "under it is not flat, so it is a black at .75 rather than a fill"),
 ("Surface", "disc-7", "rgba(0,0,0,.57)",
  "07 the four header discs, d 30 centred at y 80.5 on x 32.3 / 280.7 / "
  "321.3 / 361.0: the banner shows through at about .43 of its own value"),
 ("Surface", "scrim", "rgba(0,0,0,.28)",
  "06 the sheet's avatar against the same photograph on 07: mean ratio "
  "0.699 / 0.727 / 0.742 per channel over the disc with the camera glyph "
  "masked out, so a black scrim at 1 - 0.72 = .28"),
 ("Surface", "backdrop", "#000000",
  "06 above the peek card, x 0-20 and x 373.33-393 at y 0-70: #000000"),
 ("Surface", "nav", "linear-gradient(96deg,#FDFCFF 0%,#EFE8FF 38%,"
                    "#EAE0FF 62%,#EFE7FF 100%)",
  "07 the nav bar below 768.67 is a pale purple wash, lightest at the top "
  "left and deepest just left of centre. APPROXIMATION: four stops fitted "
  "to the row at y 790, not the two-axis gradient the capture holds"),

 ("Line", "hairline", "#D2D4D6",
  "06 the ten full-width rules at 306.00, 350.67, 441.33, 486.00, 530.67, "
  "575.33, 620.00, 664.67, 697.00, 741.67 read #D5D7D6, #D1D3D5 and "
  "#D1D2DB; one device pixel is 0.333pt, so the drawn rule is 0.33 tall"),
 ("Line", "border", "#D0D8DC",
  "04 both cards' 1pt borders, x 16.00-377.33 at y 234.67 and y 343.67: "
  "#D0D8DC at the same weight on both"),
 ("Line", "ring", "#BAC9D0",
  "02 an unchecked category ring core #BAC9D1; 05 a row chevron core "
  "#BAC8CF; 06 the location caret #BAC7CD and a row chevron #B8C8CD"),

 ("Ink", "ink", "#0F1419",
  "01 title core #0E1215, 02 a row label #06090D, 05 'Skip for now' "
  "#0D1113, 07 the bio #0E1012 and the 'Posts' tab #0D0F11. The same value "
  "fills the enabled button: #0E1419 on 01 and 04, #060B13 on 03"),
 ("Ink", "ink-2", "#536471",
  "01 body #56626C and legal note #55616A, 02 subtitle #5A6771 and "
  "placeholder #54636D, 04 card description #57626B, 07 handle #546069, "
  "meta #54616A, inactive tab #52606A and action row #58656D"),
 ("Ink", "accent", "#1D9BF0",
  "06 the three editable values read core #288ECD, 07 'View more' #298DCB, "
  "and 07's FAB disc samples #1E9BF0 flat at its centre"),
 ("Ink", "inv", "#FFFFFF",
  "07 'Movie review' on the card samples #FFFFFF at its brightest 6%, and "
  "the card's 'Sam Lee' #FFFEFF"),
 ("Ink", "ink-off", "#C6C7C9",
  "02 the disabled Next label, ink 180.0-213.67 y 774.67-785.67, on the "
  "#88898D pill: #C6C7C9"),
 ("Ink", "save-off", "#C5C5C5",
  "06 'Save', ink 338.67-377.00 y 88.0-99.0: #C5C5C5, a grey of its own "
  "rather than the disabled label on 02"),
 ("Ink", "chip-ink", "#291465",
  "07 the post's Host label, ink 66.67-97.00 y 454.67-465.67 on #ECE8FF"),

 ("Radius", "r-phone", "52px",
  "This repo's frame: a circular stand-in for the 55pt continuous display "
  "corner, the same in every canvas folder"),
 ("Radius", "r-pill", "26px",
  "01/02/03/04 the CTA is 52 tall and its ends are semicircles: the fill "
  "reaches full width only at y 780, half its height"),
 ("Radius", "r-field", "17px",
  "02 the search field is 34 tall (y 260-294) with semicircular ends"),
 ("Radius", "r-card", "16px",
  "04 the two bordered cards and 07's Spaces card: the fill of the card at "
  "x 61.33-384.00 reaches its full width 16 down from y 477.67"),
 ("Radius", "r-play", "16.5px",
  "07 the white Play pill, x 70.67-356.67 y 646-679: 33 tall, ends "
  "semicircular"),
 ("Radius", "r-chip", "4px",
  "07 both Host chips: the post's is 18.33 tall and the card's 15.33, and "
  "neither end is a semicircle -- the fill is square 4 in from each corner"),
 ("Radius", "r-sheet", "12px",
  "06 the sheet's top edge is at 70.33 and its white reaches x 1 only at "
  "76.33"),
 ("Radius", "r-peek", "10px",
  "06 the page peeking above the sheet, x 20-373.33: opaque across its "
  "full width from 52.7, 10 below its top at 42.67"),

 ("Metrics", "w", "393px",
  "1179 capture px / 3 = 393pt, the iPhone 16 logical width"),
 ("Metrics", "h", "852px",
  "2556 capture px / 3 = 852pt, once Mobbin's 120px footer is dropped"),
 ("Metrics", "status", "54px",
  "This repo's frame: the status bar height the template sets"),

 ("Type", "tr-text", "-0.035em",
  "SF Pro stands in for Chirp. Above 20px the platform serves SF Pro Display "
  "and the ink widths agree within 1% (01 title 230.67 vs 232.00, 07 "
  "'Movie review' 158.33 vs 157.33); below it serves SF Pro Text, which runs "
  "6-8% wide (07 'New Jersey, USA' 97.00 vs 111.67). Tracking closes the "
  "band, and nothing above 20px carries it. Swept -0.03 / -0.035 / -0.04: "
  "-0.035 puts the mean of the nineteen small-text ink widths on 0.998 of "
  "the capture's, and costs 1% on the seven whole-screen deltas against "
  "-0.04, which reads narrow"),
 ("Type", "t-time", "590 17px/22px var(--x-font)",
  "This repo's frame: the iOS status bar clock, not the app"),
 ("Type", "t-title", "800 26px/34px var(--x-font)",
  "01 'X for Professionals' 231.00, 02 'Select a category' 212.33, 04 "
  "'Select an account type' 278.33, 05 'Welcome to X for' 207.33 and "
  "'Professionals' 165.33; 05's two lines sit 34 apart"),
 ("Type", "t-space", "800 25.5px/31px var(--x-font)",
  "07 'Movie review' 157.67 measured, 157.62 drawn"),
 ("Type", "t-name", "800 22px/27px var(--x-font)",
  "07 the profile name 'Sam Lee' 86.33"),
 ("Type", "t-card", "700 19px/24px var(--x-font)",
  "04 'Business' 77.33 and 'Creator' 66.33"),
 ("Type", "t-field", "400 18.5px/24px var(--x-font)",
  "02 the placeholder 'Search categories' 136.33, 05 'Customize your "
  "profile' 168.67 and 'Explore Profile Spotlights' 188.33, 05 'Skip for "
  "now' 94.00, 06 'Cancel' 52.33"),
 ("Type", "t-sheet", "700 18.5px/24px var(--x-font)",
  "06 'Edit profile' 90.67, the same size as Cancel beside it and bold"),
 ("Type", "t-save", "700 17.5px/22px var(--x-font)",
  "06 'Save' 38.67 -- a size of its own, half a point under the title"),
 ("Type", "t-btn", "700 16.5px/21px var(--x-font)",
  "01 'Agree & Continue' 131.00 and 02/03/04 'Next' 33.67"),
 ("Type", "t-body", "400 16px/21px var(--x-font)",
  "01 body 337.00 on a 21.0 pitch, 02 subtitle 341.00 on 21, 04 subtitle "
  "276.00 on 21, 05 body 329.00 on 21.3, 07 the bio 84.33, 07 the post's "
  "Host label 30.33 (regular, not bold -- see the capture)"),
 ("Type", "t-date", "700 16px/21px var(--x-font)",
  "07 'Dec 10, 2025 - 11s' 130.00, bold on the card"),
 ("Type", "t-row", "700 15.5px/21px var(--x-font)",
  "02 row 1 194.67 and row 7 238.67, 06 every field label, 07 the five "
  "legible tabs 38.33 / 50.33 / 70.66 / 48.00 / 48.33 and the post head's "
  "'Sam Lee' 59.00"),
 ("Type", "t-note", "400 15.5px/21px var(--x-font)",
  "01 the legal note 329.67 on a 20.67 pitch, 07 the handle 79.00 and the "
  "post head's '@SamLeexf - 2h' 103.67"),
 ("Type", "t-pill", "700 15px/20px var(--x-font)",
  "07 'Play recording' 95.67"),
 ("Type", "t-desc", "400 14.5px/15.67px var(--x-font)",
  "04 the card descriptions 293.00 and 287.33, the two lines of the first "
  "15.67 apart"),
 ("Type", "t-meta", "400 13.5px/19px var(--x-font)",
  "07 'Entertainment & Recreation' 162.00 with 'New Jersey, USA' 97.00 "
  "beside it. The one run the tracking band does not reach: at 14.5px it "
  "still redrew 9% wide, and the cap height agrees -- 9.3 against 10.0"),
 ("Type", "t-host", "800 14.5px/18px var(--x-font)",
  "07 the Spaces card's 'Sam Lee' 57.33 -- heavy at 14.5, not the 22 of "
  "the profile name"),
 ("Type", "t-count", "400 14px/19px var(--x-font)",
  "07 'Following' 55.66 and 'Followers' 55.33, 'Joined November 2025' "
  "137.67, 'View more' 61.67 (cap 10.0), the card's 'Host' 26.67"),
]


def _root():
    """One :root block, byte-identical in every board. No `}` inside it:
    refkit tokens reads it with a non-greedy regex."""
    out, seen = [":root{"], None
    for group, name, value, _ in TOKENS:
        if group != seen:
            out.append("" if seen else None)
            out.append("  /* %s */" % group)
            seen = group
        out.append("  --x-%s:%s;" % (name, value))
    return "\n".join(x for x in out if x is not None) + "\n}"


TOKENS_CSS = _root()

# ------------------------------------------------------------------ art ----
# Boxes (pt) patched out of a capture before it is cropped: the chrome that
# sat on a photograph and is drawn again in CSS. Each box is filled with a
# Coons patch from its own four edges, which is exact on the smooth grounds
# these sit on and continuous at the boundary by construction.
INPAINT = {
 "i1": ("p1", [(44, 16, 100, 42), (278, 20, 364, 38),    # clock, right cluster
               (14, 63, 52, 101)]),                      # the close disc
 "i5": ("p5", [(44, 16, 100, 42), (278, 20, 364, 38)]),
 "i7": ("p7", [(44, 16, 100, 42), (278, 20, 364, 38)]
              + [(cx - 17, 63.5, cx + 17, 97.5)          # four header discs
                 for cx in (32.3, 280.7, 321.3, 361.0)]),
}


def _coons(a, box):
    import numpy as np                                        # noqa: local dep
    x0, y0, x1, y1 = [round(v * SCALE) for v in box]
    h, w, band = y1 - y0, x1 - x0, 2

    def edge(v, k=9):                     # a smoothed profile: texture along an
        v = np.pad(v, ((k // 2, k // 2), (0, 0)), mode="edge")   # edge would
        return np.stack([np.convolve(v[:, c], np.ones(k) / k, "valid")  # streak
                         for c in range(3)], 1)                     # across
    top, bot = edge(a[y0 - band:y0, x0:x1].mean(0)), edge(a[y1:y1 + band, x0:x1].mean(0))
    lef, rig = edge(a[y0:y1, x0 - band:x0].mean(1)), edge(a[y0:y1, x1:x1 + band].mean(1))
    U, V = np.meshgrid((np.arange(w) + .5) / w, (np.arange(h) + .5) / h)
    U, V = U[..., None], V[..., None]
    a[y0:y1, x0:x1] = ((1 - V) * top + V * bot + (1 - U) * lef[:, None]
                       + U * rig[:, None]
                       - ((1 - U) * (1 - V) * top[0] + U * (1 - V) * top[-1]
                          + (1 - U) * V * bot[0] + U * V * bot[-1]))


def _source(ref, cache):
    """A capture as an RGB image, patched first if it is one of i1/i5/i7."""
    from PIL import Image                                     # noqa: local dep
    import numpy as np
    if ref in cache:
        return cache[ref]
    if ref not in INPAINT:
        cache[ref] = Image.open(REFS_DIR / (ref + ".png")).convert("RGB")
        return cache[ref]
    src, boxes = INPAINT[ref]
    a = np.asarray(Image.open(REFS_DIR / (src + ".png")).convert("RGB")).astype(float)
    for box in boxes:
        _coons(a, box)
    cache[ref] = Image.fromarray(np.clip(a + .5, 0, 255).astype("uint8"))
    return cache[ref]


def cut():
    """Refresh assets/art/ from assets/refs/ at the boxes in crops.json."""
    if not REFS_DIR.exists():
        return
    ART_DIR.mkdir(parents=True, exist_ok=True)
    cache, n = {}, 0
    for cid, (ref, x0, y0, x1, y1) in CROPS.items():
        if not (REFS_DIR / (INPAINT.get(ref, (ref,))[0] + ".png")).exists():
            continue
        box = tuple(round(v * SCALE) for v in (x0, y0, x1, y1))
        _source(ref, cache).crop(box).save(ART_DIR / (cid + ".png"), optimize=True)
        n += 1
    print("%-24s %6d crops" % ("assets/art/", n))


def _uri(cid):
    # no fallback: a crop named here and missing from assets/art/ is a bug, and
    # an empty src would ship a board that looks generated and is not
    return "data:image/png;base64," + base64.b64encode(
        (ART_DIR / (cid + ".png")).read_bytes()).decode()


def art(cid, style="", at=None):
    """One <img>. By default it lands at the box it was cut from, snapped to
    the capture's pixels: a crop placed at its raw pt box sits up to half a
    capture pixel from where it was taken. `at` places it somewhere else --
    07-avatar is the same photograph at five diameters on two screens."""
    ref, x0, y0, x1, y1 = CROPS[cid]
    if at is None:
        at = (round(x0 * SCALE) / SCALE, round(y0 * SCALE) / SCALE,
              (round(x1 * SCALE) - round(x0 * SCALE)) / SCALE,
              (round(y1 * SCALE) - round(y0 * SCALE)) / SCALE)
    return ('<img class="a" src="%s" alt="" style="left:%.3fpx;top:%.3fpx;'
            'width:%.3fpx;height:%.3fpx%s">'
            % (_uri(cid), at[0], at[1], at[2], at[3], ";" + style if style else ""))


ICON_DIR = OUT / "assets" / "icons"


def icon(name, x, y, w, h, colour="currentColor"):
    """One inline <svg> from assets/icons/<name>.svg. Its viewBox is the
    glyph's own ink box on the 24-unit grid, so preserveAspectRatio="none"
    lays that ink box exactly on the ink box measured off the capture, and
    the canvas's inspector still names it as a vector asset."""
    svg = (ICON_DIR / (name + ".svg")).read_text().strip()
    return svg.replace(
        '<svg xmlns="http://www.w3.org/2000/svg" ',
        '<svg class="ic" preserveAspectRatio="none" style="left:%gpx;top:%gpx;'
        'width:%gpx;height:%gpx;color:%s" ' % (x, y, w, h, colour), 1)


# ------------------------------------------------------------ phone frame ----
# Measured once, for every board. The bezel is this repo's own framing, not a
# property of the app being cloned, so it is the same in every folder.
BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--x-font);-webkit-font-smoothing:antialiased;
  display:flex;justify-content:center;padding:24px}"""

# translateZ(0) composites the frame itself: Safari on iPhone clips composited
# children of a non-composited ancestor with a plain rectangle, so the screen
# painted square past the bezel's corners (docs/2026-09-03-phone-corners-safari.md).
PHONE = """.phone{position:relative;flex:none;width:var(--x-w);height:var(--x-h);
  border-radius:var(--x-r-phone);overflow:hidden;background:var(--x-ground);color:var(--x-ink);transform:translateZ(0);
  box-shadow:0 0 0 11px #1D191A,0 0 0 12.5px #3A3735,0 24px 60px rgba(29,25,26,.28)}
.sb{position:absolute;left:0;top:0;width:100%;height:var(--x-status);z-index:6}
.sb .time{position:absolute;left:0;top:18.2px;width:142.4px;text-align:center;font:var(--x-t-time)}
.sb .island{position:absolute;top:11px;left:50%;transform:translateX(-50%);
  width:125px;height:36px;border-radius:20px;background:#000}
.sb svg{position:absolute;display:block;fill:currentColor}
/* iOS picks the indicator colour against the wallpaper: measure it per screen */
.home{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);
  width:139px;height:5px;border-radius:3px;background:currentColor;z-index:6}"""

# Cellular, wifi, battery at their measured status-bar positions, inheriting
# currentColor so one call recolours the whole bar.
SB_ICONS = (
 '<svg style="left:282px;top:23.34px;width:19.33px;height:12px" viewBox="0 0 19.33 12">'
 '<rect x="0" y="7.67" width="3.33" height="4.33" rx="1.05"/>'
 '<rect x="5.33" y="5.33" width="3.33" height="6.67" rx="1.05"/>'
 '<rect x="10.67" y="2.67" width="3.33" height="9.33" rx="1.05"/>'
 '<rect x="16" y="0" width="3.33" height="12" rx="1.05"/></svg>'
 '<svg preserveAspectRatio="none" viewBox="335 22.008 19.114 13.796"'
 ' style="left:309px;top:23px;width:16.62px;height:12.3px">'
 '<path d="M344.555 35.8042C344.738 35.8042 344.896 35.7212 345.219 35.4058L347.245'
 ' 33.4634C347.369 33.3389 347.403 33.1562 347.286 33.0068C346.747 32.3096 345.726'
 ' 31.7036 344.555 31.7036C343.352 31.7036 342.331 32.3345 341.791 33.0566C341.708'
 ' 33.1895 341.741 33.3389 341.874 33.4634L343.891 35.4058C344.215 35.7129 344.373'
 ' 35.8042 344.555 35.8042ZM339.7 31.2886C339.882 31.4629 340.106 31.438 340.272'
 ' 31.2554C341.268 30.1514 342.895 29.3462 344.555 29.3545C346.232 29.3462 347.859'
 ' 30.1763 348.872 31.2803C349.021 31.4546 349.229 31.4463 349.411 31.2803L350.698'
 ' 30.002C350.831 29.8691 350.848 29.6865 350.723 29.5371C349.47 28.0015 347.145'
 ' 26.8477 344.555 26.8477C341.966 26.8477 339.641 28.0015 338.388 29.5371C338.263'
 ' 29.6865 338.272 29.8525 338.413 30.002L339.7 31.2886ZM336.255 27.8189C336.421'
 ' 27.9766 336.653 27.9766 336.811 27.8106C338.853 25.644 341.542 24.4985 344.555'
 ' 24.4985C347.585 24.4985 350.291 25.6523 352.317 27.8189C352.466 27.9683 352.69'
 ' 27.96 352.856 27.8022L354.002 26.6567C354.151 26.5073 354.143 26.3247 354.027'
 ' 26.1836C352.076 23.7764 348.407 22.0083 344.555 22.0083C340.712 22.0083 337.027'
 ' 23.7764 335.084 26.1836C334.968 26.3247 334.968 26.5073 335.109 26.6567L336.255'
 ' 27.8189Z"/></svg>'
 '<svg style="left:333px;top:23px;width:27.3px;height:12.7px" viewBox="0 0 27.3 12.7">'
 '<rect x=".6" y=".6" width="24.1" height="11.5" rx="4" fill="none" stroke="currentColor"'
 ' stroke-opacity=".38"/><rect x="2" y="2" width="21.3" height="8.7" rx="2.6"/>'
 '<path d="M26.1 4.3c.9.7.9 3 0 3.7V4.3Z" fill-opacity=".38"/></svg>')


def statusbar(colour, time="9:41"):
    return ('<div class="sb" style="color:%s"><div class="island"></div>'
            '<div class="time">%s</div>%s</div>' % (colour, time, SB_ICONS))


def home(colour):
    return '<div class="home" style="color:%s"></div>' % colour


# ----------------------------------------------------------------- emit ----
def page(title, body, extra_css=""):
    html = ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
            '<title>%s</title>\n<style>\n%s\n\n%s\n%s\n%s</style>\n</head>\n<body>\n%s\n</body>\n</html>\n'
            % (title, TOKENS_CSS, BASE, PHONE, extra_css, body))
    return html.replace("--x-", "--%s-" % P)


def write(name, html):
    (OUT / (name + ".html")).write_text(html)
    print(name, len(html))


# ------------------------------------------------------- the line box ----
# Every string on these boards is placed by the top of its ink, because that
# is what refkit measures. Chrome puts the cap top of a line at
#   lh/2 - 0.3455*size
# below the box top -- half-leading (lh - 1.162*size)/2 plus the gap between
# the ascent (0.952em) and the cap height (0.7165em) of the platform face.
TY = {"t-time": (17, 22), "t-title": (26, 34), "t-space": (25.5, 31),
      "t-name": (22, 27), "t-card": (19, 24), "t-field": (18.5, 24),
      "t-sheet": (18.5, 24), "t-save": (17.5, 22), "t-btn": (16.5, 21),
      "t-body": (16, 21), "t-date": (16, 21), "t-row": (15.5, 21),
      "t-note": (15.5, 21), "t-pill": (15, 20), "t-desc": (14.5, 15.67),
      "t-meta": (13.5, 19), "t-host": (14.5, 18), "t-count": (14, 19)}


def boxtop(ink_top, tk):
    size, lh = TY[tk]
    return ink_top - (lh / 2 - 0.3455 * size)


def track(tk):
    """Below 20px the stand-in face is the wide optical cut. See --x-tr-text."""
    return ";letter-spacing:var(--x-tr-text)" if TY[tk][0] < 20 else ""


def tx(x, ink_top, s, tk="t-body", col=None, extra=""):
    """One run of type, positioned by the top of its ink."""
    return ('<div class="t" style="left:%.2fpx;top:%.2fpx;font:var(--x-%s)%s%s%s">%s</div>'
            % (x, boxtop(ink_top, tk), tk, track(tk),
               ";color:%s" % col if col else "", extra, s))


def txc(x, ink_top, w, s, tk, col=None):
    """Centred type. The width is the box it centres in, not the ink."""
    return ('<div class="t" style="left:%.2fpx;top:%.2fpx;width:%.2fpx;text-align:center;'
            'font:var(--x-%s)%s%s">%s</div>'
            % (x, boxtop(ink_top, tk), w, tk, track(tk),
               ";color:%s" % col if col else "", s))


def box(x, y, w, h, style=""):
    return ('<div class="b" style="left:%.2fpx;top:%.2fpx;width:%.2fpx;'
            'height:%.2fpx;%s"></div>' % (x, y, w, h, style))


def circle(x, y, d, style=""):
    return box(x, y, d, d, "border-radius:50%;" + style)


def rule(y, x=0.0, w=393.0):
    """One device pixel at 3 capture px per pt."""
    return box(x, y, w, 0.33, "background:var(--x-hairline)")


# --------------------------------------------------------------- screens ----
SCREEN_CSS = """.t,.b,.a,.ic{position:absolute}
.a,.ic{display:block}
.ic{overflow:visible}
.t{white-space:nowrap}
.t a{color:var(--x-accent);text-decoration:none}"""


def screen(title, inner, sb="var(--x-ink)", hm="var(--x-ink)", bg=None):
    """One phone artboard. No board background: the phone floats on the canvas."""
    return page(NAME + " - " + title,
                '<div class="phone"%s>%s%s%s</div>'
                % (' style="background:%s"' % bg if bg else "",
                   statusbar(sb), inner, home(hm)),
                SCREEN_CSS)


def cta(label, x, w, on=True):
    """The 52pt pill at the foot of 01-04. Its label's ink top measures 774.0
    on 01 and 774.67 on 02: 774.33 is the box's own centre at t-btn."""
    return (box(x, 754, w, 52, "border-radius:var(--x-r-pill);background:%s"
                % ("var(--x-ink)" if on else "var(--x-pill-off)"))
            + txc(x, 774.33, w, label, "t-btn",
                  "var(--x-inv)" if on else "var(--x-ink-off)"))


def header():
    """02/03/04 share one: a back arrow left, the X mark centred."""
    return (icon("back", 11.67, 73.67, 17.33, 14.67, "var(--x-ink)")
            + icon("x-logo", 184.67, 68.67, 23.67, 23.67, "var(--x-ink)"))


# -------------------------------------------------------------------- 01 ----
# The splash. A photographic hero to 395 with the close disc on it, the title
# at 416.67, three lines of body on a 21.0 pitch and two of legal note on
# 20.67, and the agree pill at 754.
def s01():
    return screen("Professional account splash",
        art("01-hero")
        + circle(18, 67.3, 28, "background:var(--x-disc-1)")
        + icon("close", 26.4, 75.1, 11.1, 11.1, "var(--x-inv)")
        + tx(18.0, 416.67, "X for Professionals", "t-title")
        + tx(18.33, 462.67, "Get access to the tools you need to better connect",
             "t-body", "var(--x-ink-2)")
        + tx(18.33, 483.67, "with your audience, grow your brand, and increase",
             "t-body", "var(--x-ink-2)")
        + tx(18.33, 504.67, "your profits.", "t-body", "var(--x-ink-2)")
        + tx(18.67, 546.67, 'By tapping "Agree &amp; continue", you are agreeing to',
             "t-note", "var(--x-ink-2)")
        + tx(18.67, 567.33, 'our <a>Professional Account policy.</a>',
             "t-note", "var(--x-ink-2)")
        + cta("Agree &amp; Continue", 18, 357))


# ----------------------------------------------------------------- 02-03 ----
# The category picker. Ten rows on a 45.33 pitch from an ink top of 310.67,
# each with a 20.67 ring at the right and no rule between them; picking row 1
# fills its ring and enables the button.
CATEGORIES = ["Entertainment &amp; Recreation", "Event Venue", "Dance &amp; Night Club",
              "Automotive", "Aviation", "Marine",
              "Beauty, Cosmetic &amp; Personal Care", "Commercial &amp; Industrial",
              "Education", "Financial Services"]


def category(title, picked):
    rows = ""
    for n, label in enumerate(CATEGORIES):
        rows += tx(18.0, 310.67 + n * 45.33, label, "t-row")
        if n == picked:
            rows += (circle(352.0, 305.33, 21.67, "background:var(--x-accent)")
                     + icon("check", 355.0, 308.0, 16.0, 17.0, "var(--x-inv)"))
        else:
            rows += circle(352.67, 306.33 + n * 45.33, 20.67,
                           "border:1.5px solid var(--x-ring)")
    return screen(title,
        header()
        + tx(18.0, 125.33, "Select a category", "t-title")
        + tx(18.0, 171.33, "Choose the category to display on your profile. Pick",
             "t-body", "var(--x-ink-2)")
        + tx(18.0, 192.33, "the one that best describes your account. This will be",
             "t-body", "var(--x-ink-2)")
        + tx(18.0, 213.33, "shown on your public profile.", "t-body", "var(--x-ink-2)")
        + box(18, 260, 357, 34,
              "border-radius:var(--x-r-field);background:var(--x-field)")
        + icon("search", 29.3, 268, 17, 17, "var(--x-ink-2)")
        + tx(53.33, 270.0, "Search categories", "t-field", "var(--x-ink-2)")
        + rows + cta("Next", 18, 357, on=picked is not None))


def s02():
    return category("Select a category", None)


def s03():
    return category("Category selected", 0)


# -------------------------------------------------------------------- 04 ----
# Two bordered cards, the first 93.33 tall with two description lines on a
# 15.67 pitch and the second 77.67 with one. Checked card first.
def s04():
    return screen("Select an account type",
        header()
        + tx(30.0, 125.67, "Select an account type", "t-title")
        + tx(30.67, 171.33, "Choose the one that best aligns with your",
             "t-body", "var(--x-ink-2)")
        + tx(30.67, 192.33, "profession. Don’t worry, you can change this later.",
             "t-body", "var(--x-ink-2)")
        + box(16, 234.67, 361.33, 93.33,
              "border-radius:var(--x-r-card);border:1px solid var(--x-border)")
        + tx(33.0, 254.0, "Business", "t-card")
        + tx(32.67, 283.0, "Best fit for brands, retail shops, service providers,",
             "t-desc", "var(--x-ink-2)")
        + tx(32.67, 298.67, "and organizations", "t-desc", "var(--x-ink-2)")
        + circle(338.5, 252.33, 20.67, "background:var(--x-accent)")
        + icon("check", 341.36, 254.88, 15.26, 16.22, "var(--x-inv)")
        + box(16, 343.67, 361.33, 77.67,
              "border-radius:var(--x-r-card);border:1px solid var(--x-border)")
        + tx(32.67, 363.33, "Creator", "t-card")
        + tx(33.0, 391.67, "Best fit for public figures, artists, and influencers",
             "t-desc", "var(--x-ink-2)")
        + circle(338.67, 360.5, 20.67, "border:1.5px solid var(--x-ring)")
        + cta("Next", 29.33, 333.67))


# -------------------------------------------------------------------- 05 ----
# The welcome. Hero to 198, a two-line title on a 34 pitch, two body lines,
# then four rows on a 45.7 pitch: glyph, label, chevron, no rule.
WELCOME = [("profile-card", "Customize your profile", 369.33, 370.33, 371.67),
           ("spotlight", "Explore Profile Spotlights", 415.33, 415.66, 417.0),
           ("topics", "Pick Topics to follow", 459.66, 460.99, 462.33),
           ("people", "Make more connections", 505.32, 506.66, 507.66)]


def s05():
    rows = "".join(
        icon(name, 39.67, iy, 16.67, 15.67, "var(--x-ink)")
        + tx(91.0, ty, label, "t-field")
        + icon("chevron-right", 362.67, cy, 7.33, 12.33, "var(--x-ring)")
        for name, label, iy, ty, cy in WELCOME)
    return screen("Welcome",
        art("05-hero")
        + tx(18.33, 220.33, "Welcome to X for", "t-title")
        + tx(18.33, 254.33, "Professionals", "t-title")
        + tx(19.0, 300.0, "Now you can access more tools to better connect",
             "t-body", "var(--x-ink-2)")
        + tx(19.0, 321.33, "with your customers and grow your brand.",
             "t-body", "var(--x-ink-2)")
        + rows
        + tx(149.67, 786.0, "Skip for now", "t-field",
             extra=";text-decoration:underline"))


# -------------------------------------------------------------------- 06 ----
# The edit-profile sheet over a dimmed page. Ten full-width rules bound eight
# rows and one empty 32.33pt band; the avatar is the same photograph as 07
# under a .28 black scrim, with a stroked camera and a sparkle on it.
FIELDS = [(323.0, "Name", "Sam Lee", "var(--x-accent)"),
          (361.7, "Bio", "Ordinary guy", "var(--x-accent)"),
          (457.7, "Location", "New Jersey, USA", "var(--x-accent)"),
          (502.3, "Website", "Add your website", "var(--x-ink-2)"),
          (547.0, "Birth date", "Add your date of birth", "var(--x-ink-2)")]
RULES6 = [306.00, 350.67, 441.33, 486.00, 530.67, 575.33, 620.00, 664.67,
          697.00, 741.67]


def s06():
    fields = "".join(tx(10.0, y, label, "t-row") + tx(92.33, y, value, "t-body", col)
                     for y, label, value, col in FIELDS)
    return screen("Edit profile",
        art("06-peek", "border-radius:var(--x-r-peek) var(--x-r-peek) 0 0")
        + box(0, 70.33, 393, 781.67,
              "border-radius:var(--x-r-sheet) var(--x-r-sheet) 0 0;"
              "background:var(--x-ground)")
        + tx(17.0, 86.67, "Cancel", "t-field")
        + tx(152.33, 86.33, "Edit profile", "t-sheet")
        + tx(338.67, 88.0, "Save", "t-save", "var(--x-save-off)")
        + art("06-banner")
        + circle(9.28, 223.28, 70.1, "background:var(--x-inv)")
        + art("07-avatar", "border-radius:50%", at=(12.67, 226.67, 63.33, 63.33))
        + circle(12.67, 226.67, 63.33, "background:var(--x-scrim)")
        + icon("camera", 31.67, 248.0, 25.33, 23.0, "var(--x-inv)")
        + icon("sparkle", 47.0, 245.5, 9.33, 10.0, "var(--x-inv)")
        + "".join(rule(y) for y in RULES6)
        + fields
        + icon("chevron-down", 368.67, 460.0, 12.67, 7.33, "var(--x-ring)")
        + icon("chevron-down", 368.67, 549.34, 12.67, 7.33, "var(--x-ring)")
        + tx(10.0, 591.7, "Edit professional profile", "t-row")
        + icon("chevron-right", 371.67, 591.0, 7.33, 12.67, "var(--x-ring)")
        + tx(10.0, 636.3, "Edit expanded bio", "t-row")
        + icon("chevron-right", 371.67, 635.67, 7.33, 12.67, "var(--x-ring)")
        + tx(10.0, 713.33, "Tips", "t-row")
        + tx(334.67, 713.33, "Off", "t-body", "var(--x-ink-2)")
        + icon("chevron-right", 371.67, 713.33, 7.33, 12.67, "var(--x-ring)"),
        sb="var(--x-inv)", bg="var(--x-backdrop)")


# -------------------------------------------------------------------- 07 ----
# The finished profile. A banner to 131.33 with four translucent discs on it,
# the avatar breaking its edge, the meta block, six tabs, then two identical
# posts 309.0 apart -- the second clipped by the nav bar at 768.67.
DISCS = [("back", 32.3, 26.0, 75.67, 12.67, 10.66),
         ("search", 280.7, 273.33, 73.33, 14.67, 14.67),
         ("pencil", 321.3, 314.33, 73.67, 14.0, 14.0),
         ("share", 361.0, 354.33, 74.33, 13.34, 13.34)]
TABS = [("Posts", 16.0, "var(--x-ink)"), ("Replies", 80.0, "var(--x-ink-2)"),
        ("Highlights", 150.0, "var(--x-ink-2)"), ("Videos", 239.33, "var(--x-ink-2)"),
        ("Photos", 306.67, "var(--x-ink-2)"), ("Articles", 374.0, "var(--x-ink-2)")]
# The last two are half under the FAB in the capture and are drawn in full.
# Each glyph's own ink box. The six do not share a top or a height: the heart
# sits a point lower than the reply bubble and is a point shorter. The last
# two are measured at their x only -- the compose button covers the rest.
ACTIONS = [("reply", 62.67, 701.00, 15.33, 14.33),
           ("repost", 129.67, 702.33, 17.33, 12.00),
           ("like", 199.00, 702.00, 14.67, 13.00),
           ("views", 268.33, 701.67, 12.00, 13.33),
           ("bookmark", 336.33, 701.00, 12.00, 14.00),
           ("share", 370.00, 701.00, 11.00, 14.00)]
# Fitted, not thresholded: a razor tip or an arc's bulge crosses half coverage
# outside the last pixel a threshold keeps, so scratch/navfit.py slides each box
# against the window itself. The five land at 2.0-3.0 mean levels over the wash.
NAV = [("home-fill", 29.25, 782.37, 20.19, 21.07), ("search", 108.11, 783.08, 19.6, 19.82),
       ("grok", 185.23, 781.79, 23.5, 22.46), ("bell", 267.26, 783.34, 18.35, 19.99),
       ("mail", 344.28, 784.31, 20.07, 18.07)]


def spaces_card(dy):
    return (box(61.33, 477.67 + dy, 322.67, 214,
                "border-radius:var(--x-r-card);background:var(--x-spaces)")
            + circle(70.67, 490.33 + dy, 19.33, "background:var(--x-inv)")
            + art("07-avatar", "border-radius:50%",
                  at=(71.67, 491.33 + dy, 17.33, 17.33))
            + tx(95.0, 494.67 + dy, "Sam Lee", "t-host", "var(--x-inv)")
            + box(157.33, 492.67 + dy, 36.33, 15.33,
                  "border-radius:var(--x-r-chip);background:var(--x-chip-card)")
            + tx(162.33, 495.67 + dy, "Host", "t-count", "var(--x-inv)")
            + icon("dots", 355.33, 503.67 + dy, 11.33, 2.0, "var(--x-inv)")
            + tx(72.0, 527.67 + dy, "Movie review", "t-space", "var(--x-inv)")
            + icon("play", 73.33, 612.33 + dy, 10.67, 14.67, "var(--x-inv)")
            + tx(85.0, 614.33 + dy, "Dec 10, 2025 · 11s", "t-date", "var(--x-inv)")
            + box(70.67, 646 + dy, 286, 33,
                  "border-radius:var(--x-r-play);background:var(--x-inv)")
            + tx(166.33, 657.0 + dy, "Play recording", "t-pill"))


def post(dy):
    return (art("07-avatar", "border-radius:50%", at=(9.0, 433.67 + dy, 44.33, 44.33))
            + tx(61.67, 434.33 + dy, "Sam Lee", "t-row")
            + tx(126.0, 434.0 + dy, "@SamLeexf · 2h", "t-note", "var(--x-ink-2)")
            + icon("x-logo", 365.67, 432.67 + dy, 16.67, 16.33, "var(--x-ink)")
            + box(61.33, 451.0 + dy, 40.67, 18.33,
                  "border-radius:var(--x-r-chip);background:var(--x-chip)")
            + tx(66.67, 454.67 + dy, "Host", "t-body", "var(--x-chip-ink)")
            + spaces_card(dy)
            + "".join(icon(n, x, y + dy, w, h, "var(--x-ink-2)")
                      for n, x, y, w, h in ACTIONS)
            + tx(286.67, 701.67 + dy, "8", "t-count", "var(--x-ink-2)")
            + rule(730.33 + dy))


def s07():
    return screen("Professional profile",
        art("07-banner")
        + "".join(circle(cx - 15, 65.5, 30, "background:var(--x-disc-7)")
                  + icon(name, gx, gy, gw, gh, "var(--x-inv)")
                  for name, cx, gx, gy, gw, gh in DISCS)
        + circle(5.45, 106.3, 70.1, "background:var(--x-inv)")
        + art("07-avatar", "border-radius:50%", at=(8.67, 109.5, 63.67, 63.67))
        + tx(9.0, 188.0, "Sam Lee", "t-name")
        + tx(9.67, 215.33, "@SamLeexf", "t-note", "var(--x-ink-2)")
        + tx(9.67, 249.0, "Ordinary guy", "t-body")
        + icon("briefcase", 10.33, 275.67, 13.0, 12.33, "var(--x-ink-2)")
        + tx(28.33, 277.33, "Entertainment &amp; Recreation", "t-meta", "var(--x-ink-2)")
        + icon("pin", 206.67, 275.67, 11.0, 13.0, "var(--x-ink-2)")
        + tx(223.67, 277.33, "New Jersey, USA", "t-meta", "var(--x-ink-2)")
        + icon("calendar", 11.0, 302.33, 11.67, 11.67, "var(--x-ink-2)")
        + tx(27.33, 302.33, "Joined November 2025", "t-count", "var(--x-ink-2)")
        + icon("chevron-right", 170.67, 302.67, 6.33, 10.66, "var(--x-ink-2)")
        + tx(9.0, 328.0, "View more", "t-count", "var(--x-accent)")
        + tx(9.33, 356.33, "7", "t-count", extra=";font-weight:700")
        + tx(19.67, 356.33, "Following", "t-count", "var(--x-ink-2)")
        + tx(85.67, 356.33, "2", "t-count", extra=";font-weight:700")
        + tx(97.0, 356.33, "Followers", "t-count", "var(--x-ink-2)")
        + "".join(tx(x, 393.33, label, "t-row", col) for label, x, col in TABS)
        + box(11.0, 418.33, 48, 3, "border-radius:1.5px;background:var(--x-accent)")
        + rule(421.33)
        + post(0) + post(309.0)
        + circle(328, 704, 56, "background:var(--x-accent);"
                               "box-shadow:0 4px 12px rgba(0,0,0,.18)")
        + icon("plus", 348.33, 724.33, 15.33, 15.33, "var(--x-inv)")
        + box(0, 768.67, 393, 83.33, "background:var(--x-nav)")
        + rule(768.67)
        + "".join(icon(n, x, y, w, h, "var(--x-ink)") for n, x, y, w, h in NAV)
        + circle(44.33, 778.33, 6, "background:var(--x-accent)"),
        sb="var(--x-inv)")


SCREENS = [
    ("01-professional-splash", "X for Professionals", s01),
    ("02-select-category", "Select a category", s02),
    ("03-category-selected", "Category selected", s03),
    ("04-select-account-type", "Select an account type", s04),
    ("05-welcome", "Welcome", s05),
    ("06-edit-profile", "Edit profile", s06),
    ("07-profile", "Professional profile", s07),
]


# ------------------------------------------------------ tokens + evidence ----
SHEET = """body{padding:0;background:#FFF;color:var(--x-ink)}
.sheet{width:478px;height:980px;padding:14px 20px 8px;overflow:hidden}
h1{font:600 17px/22px var(--x-font);margin-bottom:2px}
header p{font:400 10.5px/13.5px var(--x-font);color:var(--x-ink-2);margin-bottom:4px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--x-ink-2);margin:5px 0 3px}
.grid{column-count:2;column-gap:12px}
.sw{display:flex;align-items:center;gap:5px;height:10.2px;break-inside:avoid;white-space:nowrap}
.sw .chip{width:16px;height:9px;flex:none;border-radius:3px;border:1px solid var(--x-border);background-color:#888}
.sw b{font:600 7.5px/10.5px ui-monospace,Menlo,monospace}
.sw i{font:400 7.5px/10.5px ui-monospace,Menlo,monospace;color:var(--x-ink-2);font-style:normal}
.foot{display:flex;gap:28px;align-items:flex-start;margin-top:4px}
.foot h2{margin-top:0}
.rad{display:flex;gap:6px;flex-wrap:wrap;width:250px}
.rb{width:36px;height:22px;background:var(--x-field);border:1px solid var(--x-border)}
.rad em{display:block;margin-top:2px;font:400 8.5px/11px var(--x-font);
  color:var(--x-ink-2);font-style:normal;text-align:center}
.ty{column-count:3;column-gap:12px}
.tr{break-inside:avoid;border-bottom:1px solid var(--x-border)}
.tr span{display:block;white-space:nowrap;overflow:hidden;line-height:1}
.tr em{display:block;font:400 7px/9px ui-monospace,Menlo,monospace;
  color:var(--x-ink-2);font-style:normal;white-space:nowrap}
.met{font:400 8px/9.5px ui-monospace,Menlo,monospace;color:var(--x-ink);white-space:nowrap}
table.ev{width:100%;border-collapse:collapse}
table.ev td{vertical-align:top;padding:2.5px 6px 2.5px 0;
  border-bottom:1px solid var(--x-border);font:400 8.5px/11px var(--x-font)}
td.t,td.v{font-family:ui-monospace,Menlo,monospace;white-space:nowrap}
td.t{color:#0A60FF}
td.v{color:var(--x-ink);max-width:150px;overflow:hidden;text-overflow:ellipsis}
td.e{color:var(--x-ink-2)}"""


def _of(group):
    return [x for x in TOKENS if x[0] == group]


def token_board():
    swatches = "".join(
        '<div class="sw"><div class="chip" style="background:var(--x-%s)"></div>'
        '<b>--x-%s</b><i>%s</i></div>' % (n, n, v)
        for g in ("Surface", "Line", "Ink") for _, n, v, _ in _of(g))
    radii = "".join(
        '<div><div class="rb" style="border-radius:%s"></div><em>%s</em></div>' % (v, v)
        for _, n, v, _ in _of("Radius") if n != "r-phone")
    met = "<br>".join("--x-%s: %s" % (n, v) for _, n, v, _ in _of("Metrics"))
    return page(NAME + " - Design Tokens",
                '<div class="sheet"><header><h1>%s</h1>'
                '<p>Seven Mobbin captures at exactly 3 px per pt. One face (SF Pro), '
                'one type ladder fitted by ink width, and a palette that is almost '
                'entirely white, two greys and one blue &mdash; with a Spaces purple '
                'and a pale purple nav wash on the last screen.</p>'
                '</header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<div class="foot"><div><h2>Radius</h2>'
                '<div class="rad">%s</div></div>'
                '<div><h2>Metrics</h2><div class="met">%s</div></div></div></div>'
                % (NAME, swatches, radii, met), SHEET)


def type_board():
    # --x-tr-text is in this group and is not a font: it is the tracking track()
    # puts on every run under 20px, so each such specimen wears it and says so
    rows = "".join(
        '<div class="tr"><span style="font:var(--x-%s)%s">Sam Lee</span>'
        '<em>--x-%s &middot; %s%s</em></div>'
        % (n, track(n), n, v.split(" var")[0],
           " + --x-tr-text" if track(n) else "")
        for _, n, v, _ in _of("Type") if n in TY)
    return page(NAME + " - Type Tokens",
                '<div class="sheet"><header><h1>%s type</h1>'
                '<p>Every size is fitted to a measured ink width, so several are off '
                'the iOS ladder. The evidence rows carry the widths.</p>'
                '</header><div class="ty">%s</div></div>' % (NAME, rows), SHEET)


EV_LINES = 56     # a page of 60 estimated lines fits the board, 62 does not


def evidence_boards():
    # a row wraps its evidence at about 62 characters, so a page breaks by
    # lines rather than by rows
    pages, page_, lines = [], [], 0
    for row in TOKENS:
        n = -(-len(row[3]) // 62)
        if page_ and lines + n > EV_LINES:
            pages.append(page_)
            page_, lines = [], 0
        page_.append(row)
        lines += n
    pages.append(page_)
    for i, chunk in enumerate(pages):
        rows = "".join(
            '<tr><td class="t">--x-%s</td><td class="v">%s</td><td class="e">%s</td></tr>'
            % (n, v, e) for _, n, v, e in chunk)
        of = " %d/%d" % (i + 1, len(pages)) if len(pages) > 1 else ""
        yield ("00%s-evidence" % "bcdefghijk"[i],
               page(NAME + " - Evidence" + of,
                    '<div class="sheet"><header><h1>Evidence%s</h1>'
                    '<p>One row per token. A token with no evidence is a guess.</p>'
                    '</header><table class="ev">%s</table></div>' % (of, rows), SHEET))


# ----------------------------------------------------------- references ----
REF_CSS = """body{padding:24px}
.phone img{position:absolute;left:0;top:0;width:100%;height:100%;display:block}"""


def ref_boards():
    for stem, label, _ in SCREENS:
        f = REFS_DIR / ("p%d.png" % int(stem[:2]))
        if not f.exists():
            continue
        uri = "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
        yield ("ref-" + stem,
               page(NAME + " - reference: " + label,
                    '<div class="phone"><img src="%s" alt="%s"></div>' % (uri, label),
                    REF_CSS))


# ----------------------------------------------------------------- main ----
def layout():
    rows = [{"title": "Foundations",
             "files": [{"file": "00-design-tokens", "label": "Design tokens"},
                       {"file": "00a-type-tokens", "label": "Type tokens"}]
                      + [{"file": n, "label": "Evidence"}
                         for n, _ in evidence_boards()]},
            {"title": "Screens", "numbered": True,
             "files": [{"file": s, "label": l} for s, l, _ in SCREENS]}]
    # declared even though ref-*.html is gitignored: the canvas skips a row
    # entry whose file is absent and drops the row when none of them resolve,
    # so this one file is the same on a clean checkout as it is beside the
    # captures -- which is what makes `python3 gen.py` a no-op either way
    rows.append({"title": "Source of truth: the captures", "numbered": True,
                 "files": [{"file": "ref-" + s, "label": l}
                           for s, l, _ in SCREENS]})
    rows += json.loads((BRAND_DIR / "manifest.json").read_text())
    return {"name": PAGE_NAME, "cover": "07-profile", "rows": rows}


def main():
    cut()
    files = dict([("00-design-tokens", token_board()), ("00a-type-tokens", type_board())]
                 + list(evidence_boards())
                 + [(s, fn()) for s, _, fn in SCREENS]
                 + list(ref_boards()))
    for name in sorted(files):
        write(name, files[name])
    (OUT / "layout.json").write_text(json.dumps(layout(), indent=2) + "\n")
    print("%-24s %6d rows" % ("layout.json", len(layout()["rows"])))


if __name__ == "__main__":
    main()
