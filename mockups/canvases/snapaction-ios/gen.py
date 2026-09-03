"""SnapAction, iOS: six screens rebuilt from the App Store frames of one Figma
file, plus the token board, the three evidence boards and the six captures.

    python3 mockups/canvases/snapaction-ios/gen.py

regenerates the folder in place, byte-identical, from anywhere: every path
resolves against __file__. The .html files are output. Never hand-edit one --
edit this file and re-run.

Two frame sizes, because the source uses two devices: 440 x 956 pt for the
timeline screens (01, 02) and 430 x 932 for the rest. Both sit on the same
12px ring inside the canvas' 478 x 980 shape box, so 956 + 24 = 980 lands
exactly and nothing clips.

With assets/refs/ present the run also re-cuts assets/art/ from crops.json and
emits the six ref-* boards; without it (a fresh clone: the captures are whole
app screens and are gitignored) it uses the committed art and skips them.
"""
import base64, json
from pathlib import Path

OUT = Path(__file__).resolve().parent
REFS_DIR = OUT / "assets" / "refs"
ART_DIR = OUT / "assets" / "art"

NAME = "SnapAction"
PAGE_NAME = "(example) " + NAME + " iOS"
P = "sa"

SCALE = 3.0            # capture px per design pt: 1320/440 and 2868/956 both

CROPS = {k: v for k, v in json.loads((OUT / "crops.json").read_text()).items()
         if not k.startswith("_")}

# The blurred scroll wash behind a status bar or header does not stop where its
# crop does, and the board's ground under it is flat black. Cut hard, the band
# lands as a lighter rectangle with visible edges; sides -> pt here ramps the
# alpha out so the wash meets the ground instead. Only for the wash bands: an
# ink crop is tightened to its glyphs instead, which is the same fix done by
# measurement.
FADE = {"03-blur": ("tb", 8.0), "04-blur1": ("b", 10.0), "04-blur2": ("lrtb", 8.0)}

# Crops of a round button, clipped to the circle they were measured around.
ROUND = {"01-hbl", "01-hbr", "03-hbr", "04-hbl", "04-hbr"}


def cut():
    """Refresh assets/art/ from assets/refs/ at the boxes in crops.json."""
    if not REFS_DIR.exists():
        return
    from PIL import Image
    ART_DIR.mkdir(parents=True, exist_ok=True)
    src, n = {}, 0
    for cid, (ref, x0, y0, x1, y1) in CROPS.items():
        f = REFS_DIR / (ref + ".png")
        if not f.exists():
            continue
        if ref not in src:
            src[ref] = Image.open(f).convert("RGB")
        box = tuple(round(v * SCALE) for v in (x0, y0, x1, y1))
        im = src[ref].crop(box)
        if cid in FADE:
            im = _fade(im, *FADE[cid])
        im.save(ART_DIR / (cid + ".png"), optimize=True)
        n += 1
    print("%-24s %6d crops" % ("assets/art/", n))


def _fade(im, sides, pt):
    """Ramp the alpha to 0 over `pt` design pt on each named side (l/r/t/b).
    Multiplying the two axes rather than painting one over the other is what
    makes a corner take the smaller of its two ramps."""
    import numpy as np
    from PIL import Image
    px = max(1, round(pt * SCALE))
    w, h = im.size

    def ramp(n):
        a = np.ones(n)
        if s0 in sides:
            a[:px] = np.minimum(a[:px], np.arange(px) / px)
        if s1 in sides:
            a[-px:] = np.minimum(a[-px:], np.arange(px)[::-1] / px)
        return a

    m = np.ones((h, w))
    s0, s1 = "l", "r"
    m *= ramp(w)[None, :]
    s0, s1 = "t", "b"
    m *= ramp(h)[:, None]
    out = im.convert("RGBA")
    out.putalpha(Image.fromarray((m * 255).round().astype("uint8"), "L"))
    return out


def _uri(cid):
    f = ART_DIR / (cid + ".png")
    return ("data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
            if f.exists() else "")


def art(cid, x=None, y=None, z=None):
    """One <img>, placed at the box it was measured from (or at x/y, for the
    art that is reused on more than one row)."""
    _, x0, y0, x1, y1 = CROPS[cid]
    return ('<img class="a%s" src="%s" alt="" style="left:%.1fpx;top:%.1fpx;'
            'width:%.1fpx;height:%.1fpx%s">'
            % (" rd" if cid in ROUND else "",
               _uri(cid), x0 if x is None else x, y0 if y is None else y,
               x1 - x0, y1 - y0, ";z-index:%d" % z if z else ""))


def raw(cid, x, y, w, h, z=None, extra=""):
    """A committed asset that is not a crop (screen 06's three Figma exports)."""
    return ('<img class="a" src="%s" alt="" style="left:%.1fpx;top:%.1fpx;'
            'width:%.1fpx;height:%.1fpx%s%s">'
            % (_uri(cid), x, y, w, h, ";z-index:%d" % z if z else "",
               ";" + extra if extra else ""))


# ---------------------------------------------------------------- tokens ----
# (group, name, value, evidence). Phase 2 order: font, surface, line, ink,
# accent, radius, type, metrics. Written with the placeholder prefix --x-
# throughout and rewritten to P on the way out.
TOKENS = [
 ("Font", "font",
  '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",'
  '"Helvetica Neue",Helvetica,Arial,sans-serif',
  'refkit font on "Timeline", the nav title: SF Pro 0.811, 2nd 0.741, margin 0.070'),

 ("Surface", "bg",        "#000000", "DSPalette.canvas, dark; flat-fill census on the 01 page ground agrees exactly"),
 ("Surface", "card",      "#191919", "DSPalette.card, dark; flat-fill census inside 01 card 1 agrees exactly"),
 ("Surface", "card-sel",  "#1E2230", "flat-fill census inside 02 card 1, selected. cardSurface(isSelected:) composites DSPalette.accent at DSOpacity.fillSubtle (0.10) over DSPalette.card, and that blend reproduces #1E2230 on all three channels"),
 ("Surface", "chip",      "#232323", "DSPalette.well and DSPalette.track, dark: one value, two roles; flat-fill census on the 04 tag chip agrees exactly"),
 ("Surface", "blue-bg",   "#1E2A47", "DSPalette.actionBlueFill, dark; flat-fill census on the 02 + Add pill agrees exactly"),
 ("Surface", "green-bg",  "#173626", "DSPalette.successFill, dark; flat-fill census on the 02 checkmark-Added pill agrees exactly"),
 ("Surface", "art-bg",    "#1E2F24", "DSTypeBadge article fill, dark: #1E2F24; the flat-fill census on the 04 Article chip read #1F2E24, one level under on two channels"),
 ("Surface", "amber-bg",  "#3C2A18", "DSPalette.pendingFill, dark, which is also the website badge fill; flat-fill census on the 01 5-days pill agrees exactly"),
 ("Surface", "detail",    "#1C1C1E", "flat-fill census, 05 detail card. Not a DSPalette token: it is UIColor.secondarySystemBackground dark, and DesignPalette.swift calls the surviving systemBackground-family fills migration debt"),
 ("Surface", "bar",       "rgba(26,26,26,0.70)",
  "flat-fill census of the 02 action bar: #121212 where it sits over the page ground and #181818 where it sits over a card, which 26/255 at 70% reproduces and no flat colour does"),
 ("Surface", "white",     "#FFFFFF", "flat-fill census, 03/04 filter button and the FAB. Not a token either: both are Liquid Glass (.glassProminent), a system material, so the capture is the only source"),

 ("Line", "line",         "#2A2A2A",
  "DSPalette.hairline, dark, which cardSurface draws at lineWidth 1 on an "
  "unselected card; the 1pt coverage solve on the card outline agrees "
  "exactly, and the same value scans out of the 02/03 "
  "duration rule, and out of 02's header pills, whose top edge sums 120 "
  "levels over three device rows against a 25 fill and a 0 ground"),
 ("Line", "line-2",       "#4E4E4E", "DSPalette.dash, dark, the time card's dashed rails; scan col 175 on 02, the flight-path dashes, agrees exactly"),
 ("Line", "line-4",       "#343434", "1pt coverage solve, 02 floating action bar outline, scan row 870; system material, not a token"),
 ("Line", "hair",         "#323235", "scan col 200 on 05: one device px at 3x, so the value is the rule. UIColor.separator dark (84,84,88 at 0.60) over the black canvas resolves to exactly #323235"),
 ("Line", "hair-2",       "#3D3D41", "scan col 200 on 05, inside the detail card; the same separator over --x-detail resolves to #3E3E41, one level over"),
 ("Line", "scroll",       "#7F7F7F", "system chrome, not a token: flat-fill census on the 05 scroll indicator: x 424-427 y 178-719.7, and 05 is the only capture caught mid-scroll"),

 ("Ink", "ink",           "#F7F6F2", "DSPalette.display, dark; the brightest 2% of the day header and the big time agrees exactly. On a dark UI the darkest percentile returns the ground, so ink is a top percentile here"),
 ("Ink", "ink-2",         "#DEDCD6", "DSPalette.textPrimary, dark; the brightest 2% of a card title agrees exactly"),
 ("Ink", "ink-3",         "#A9A6A0", "DSPalette.textSecondary, dark; the brightest 2% of a meta row and a centre chip read #A8A6A0, one level under, which is the bias of a percentile on antialiased light-on-dark ink"),
 ("Ink", "ink-4",         "#8A8781", "DSPalette.textTertiary, dark; the brightest 2% of the grey half of a day header agrees exactly, and the same value is the inline glyph grey"),
 ("Ink", "ink-5",         "#8E8E93", "UIColor.systemGray, not a DSPalette token: the tab bar and the 05 label column are system chrome. Brightest 2% of both read #8D8D93, again one level under"),
 ("Ink", "ink-btn",       "#F3F3F3", "brightest 0.5% of the 02 Select All label; the nav title on the same screen reads #F7F6F2, so this is a second ink. Four levels off DSPalette.ink dark #F4F3EF, which is near enough to say the button is system material rather than the token"),

 ("Accent", "blue",       "#6E92FF", "DSPalette.actionBlue, dark, and the same hex as link and pinned: one value, three names. The mode of the + Add label core agrees exactly"),
 ("Accent", "blue-2",     "#4A74FF", "DSPalette.accent, dark, which cardSurface strokes at DSStroke.selection = 2pt when selected; scan row 270 on 02 returned that value on a 2pt border"),
 ("Accent", "green",      "#5BD68A", "DSPalette.success, dark; the mode of the Added label core agrees exactly"),
 ("Accent", "green-2",    "#8FDCA8", "DSTypeBadge article text, dark; the mode of the 04 Article chip label core agrees exactly"),
 ("Accent", "amber",      "#F0A468", "DSPalette.pending, dark, which is also the website badge text; the mode of the 01 Register pill border and label core agrees exactly"),
 ("Accent", "red",        "#FF7A6E", "DSPalette.alert, dark; the mode of the 02 overdue date core agrees exactly"),

 ("Radius", "r-card",     "18px",   "DSRadius.card = 18, style .continuous, on every time card and on the 05 detail card. A circular fit on four 01 corners said 14.5 and it is wrong: 18px takes the four card screens from 1.58/2.28/2.38/1.36 to 1.54/2.15/2.34/1.33. The 05 fit had already landed on 18"),
 ("Radius", "r-pill",     "999px",  "by construction: every pill measures h/2. The source asks for DSTimeCard.actionChipRadius = 8 continuous, whose shoulder runs 1.53*8 = 12.2pt in from each corner and so overruns a 20.3pt chip; setting 8px costs 0.04"),
 ("Radius", "r-phone",    "55px",   "circular stand-in for the 430x932 continuous display corner"),
 ("Radius", "r-phone-xl", "62px",   "circular stand-in for the 440x956 continuous display corner"),

 ("Type", "t-time",   "590 18px/18px var(--x-font)",     'rendered-width fit: "09:41" 45.4 -> 45.7'),
 ("Type", "t-nav",    "600 17px/22px var(--x-font)",     'rendered-width fit: "Timeline" 66.3 -> 66.7'),
 ("Type", "t-btn",    "600 16px/20px var(--x-font)",     'rendered-width fit: "Done" 38.0 -> 38.0, cap 12.0 -> 12.0'),
 ("Type", "t-nav-2",  "400 17px/22px var(--x-font)",     'rendered-width fit: "Tuesday" 62.6 -> 63.0'),
 ("Type", "t-day",    "700 20px/24px var(--x-font)",     'rendered-width fit: "Today Aug 16" 124.3 -> 124.7'),
 ("Type", "t-day-2",  "400 20px/24px var(--x-font)",     'rendered-width fit: "Sunday" 64.3 -> 64.7'),
 ("Type", "t-date",   "600 14px/18px var(--x-font)",     'rendered-width fit: "Sun, Aug 16" 80.6 -> 79.0'),
 ("Type", "t-title",  "600 14.95px/20px var(--x-font)",
  'render fit over 01/02/03: at 15px every title sets 0.3% wide'),
 ("Type", "t-big",    "700 21.5px/26px var(--x-font)",   'tabular figures, tracking -0.8px: "17:10" 55.3 -> 55.3, "Aug 3" 54.4 -> 54.3'),
 ("Type", "t-pill",   "600 12px/16px var(--x-font)",     'rendered-width fit: "Register by Aug 19" 108.0 -> 109.0'),
 ("Type", "t-meta",   "400 12.65px/17px var(--x-font)",
  'render fit over 01/02/03: at 13px every meta line sets ~2.5% wide'),
 ("Type", "t-sub",    "400 12px/16px var(--x-font)",     'rendered-width fit: "sebastianraschka.com" 124.3 -> 124.7'),
 ("Type", "t-chip",   "400 11.3px/15px var(--x-font)",
  'render fit over 02: at 11.5px "All day &middot; 8 days" sets 81.7 against 80.3 '
  'and "45 mins" 42.7 against 42.0, the same 1.7% on both'),
 ("Type", "t-tag",    "400 12.2px/16px var(--x-font)",
  "04's saved-article tags are not the duration chip: \"amazon-science\" "
  'measures 94.0 and 11.5px sets 88.7, so the tag runs 6% larger'),
 ("Type", "t-tag-2",  "500 12.2px/16px var(--x-font)",
  'the green Article tag sets 38.0 on both cards, 9% over the grey tags '
  'beside it at the same size, which weight and not size accounts for'),
 ("Type", "t-tab",    "600 10.6px/13px var(--x-font)",
  'render fit over 01/04: at 10px both tab rows set 6% narrow'),
 ("Type", "t-body",   "400 13px/18.7px var(--x-font)",   'refkit bands pitch on the 04 description: 18.7'),
 ("Type", "t-code",   "600 13px/17px var(--x-font)",     'rendered-width fit: "PKX" 25.0 -> 25.3, cap 9.4 -> 9.3'),
 ("Type", "t-code-2", "600 12px/16px var(--x-font)",     'Font.dsMetaInteractive = .caption.semibold = 12/600; the rendered-width fit had said 12.5 ("NDK7JZ" 47.3 -> 47.7) and 12 scores 0.02 better'),
 ("Type", "t-place",  "400 12.5px/15.4px var(--x-font)", 'rendered-width fit: "Singapore Changi" 103.7 -> 102.3; bands pitch 15.4'),
 ("Type", "t-p5",     "700 16.8px/22px var(--x-font)",   'render fit: "PKX" 32.7, which 17px sets to 33.0'),
 ("Type", "t-p5-row", "500 15.05px/20px var(--x-font)",
  'render fit over 05: at 15px the whole detail sheet sets 0.3% narrow'),

 ("Metrics", "w",       "430px",  "iPhone 15 Plus / 16 Plus logical width, captures 03-06"),
 ("Metrics", "h",       "932px",  "iPhone 15 Plus / 16 Plus logical height"),
 ("Metrics", "w-xl",    "440px",  "iPhone 16 Pro Max logical width, captures 01-02"),
 ("Metrics", "h-xl",    "956px",  "iPhone 16 Pro Max logical height"),
 ("Metrics", "gutter",  "18px",   "DSCard.homeGutter = 18; refkit scan on the card left edge agrees on both frames"),
 ("Metrics", "pill",    "20.3px", "refkit bbox on every pill and chip: one height, and DSTimeCard.chipPaddingV = 3 either side of a .caption label accounts for it"),
 ("Metrics", "tile",    "24px",   "DSTimeCard.tile = 24; refkit bbox on the tinted leading tile agrees"),
 ("Metrics", "cal",     "15px",   "DSTimeCard.dateHeaderGlyph = 15; refkit bbox on the date-row calendar glyph agrees"),

 ("06 light", "l-bg",        "#FFFFFF", "Figma 754:784, the frame ground"),
 ("06 light", "l-panel",     "#F7F7F9", "Figma 754:808, Info Container fill"),
 ("06 light", "l-line",      "#E5E7EB", "Figma 754:810 avatar border, 754:820 row rule"),
 ("06 light", "l-ink",       "#111827", "Figma 754:814 title, 754:820 datetime value"),
 ("06 light", "l-ink-2",     "#374151", "Figma 754:819, the description"),
 ("06 light", "l-ink-3",     "#6B7280", "Figma 754:820 Start/End label, 754:817 menu glyph"),
 ("06 light", "l-ink-4",     "#9CA3AF", "Figma 754:820, chevron stroke"),
 ("06 light", "l-blue",      "#007AFF", "Figma 754:859, the island button fill"),
 ("06 light", "l-cta",       "#1791FF", "flat-fill census on the Add to Calendar button, 99.3%; #007AFF over #171717 under mix-blend-plus-lighter, which is what the node asks for"),
 ("06 light", "l-link",      "#007BFE", "Figma 754:816, the meeting link"),
 ("06 light", "l-badge",     "#8CDEA5", "Figma 754:866, Saved Badge fill"),
 ("06 light", "l-badge-ink", "#0D401A", "Figma 754:866, Saved Badge label"),
 ("06 light", "t-l-title",   "700 14px/20px var(--x-font)",
  'cap 11.1 sets 14px; at 600 the title sets 176.0 v 179.2, at 700 180.3'),
 ("06 light", "t-l-link",    "400 12px/16px var(--x-font)",   "Figma 754:816, the meeting link"),
 ("06 light", "t-l-desc",    "400 12px/18px var(--x-font)",   "Figma 754:819, the description"),
 ("06 light", "t-l-row",     "400 13.2px/18px var(--x-font)",
  'render fit on "Thu, Jul 3 14:00": Figma\'s 13px sets 96.7 v 97.9'),
 ("06 light", "t-l-cta",     "600 15.9px/20px var(--x-font)",
  'render fit: "Add to Calendar" 118.7 -> 119.6, cap 12.5 -> 12.3'),
 ("06 light", "t-l-menu",    "400 18px/18px var(--x-font)",   "Figma 754:817, the overflow glyph"),
 ("06 light", "t-i-badge",   "600 9px/11px var(--x-font)",    "Figma 754:866, the island badge label"),
 ("06 light", "t-i-line",    "500 12px/14px var(--x-font)",   "Figma 754:861/862, the two island lines"),
 ("06 light", "t-i-cta",     "500 14px/17px var(--x-font)",   "Figma 754:869, the island button label"),
 ("06 light", "r-thumb",     "24px",    "Figma 754:807, Video Card thumbnail"),
 ("06 light", "r-panel",     "10px",    "Figma 754:820, the datetime block"),
 ("06 light", "r-island",    "42px",    "Figma 754:859, the Dynamic Island"),
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
TYPE = {n: v for _, n, v, _ in TOKENS if n.startswith("t-")}


def ty(tok):
    """(size, line-height) out of a composite font shorthand token."""
    fs, lh = TYPE[tok].split(" ", 1)[1].split(" var")[0].split("/")
    return float(fs[:-2]), float(lh[:-2])


def ct(ink, fs, lh):
    """Box top that lands the cap top of fs/lh type on ink row `ink`.
    K = 0.115 is the mean of the measured ink-top offsets across cap-led,
    ascender-led and digit-led runs; Phase 4 corrects the rest."""
    return ink - ((lh - fs) / 2 + 0.115 * fs)


LSB = 0.06     # left side bearing as a fraction of the size: box left is what
               # CSS takes, every x in Phase 1 is where the ink starts.
LSB_TAB1 = 0.06   # ...and a leading "1" in tabular figures sits centred in the
                  # tabular advance, so its ink starts one more LSB in. Measured
                  # +1.3pt on five 21.5px runs; no other digit needs a term.

# What a `font:` shorthand cannot carry, per token: (css, right, lift).
#
# `css` is the feature the shorthand has no slot for. The captures set t-big
# and t-date in tabular figures - "17:10" measures exactly as wide as "14:00",
# and on 02's "Sat, Aug 1 - overdue" the glyph after the 1 sits 1.3pt further
# right than proportional SF Pro puts it - and t-big 0.8px tight.
#
# `right` is what a right-aligned run has to give back, since a negative
# letter-spacing lets the last glyph overhang the box.
#
# `lift` is Phase 4's measured residual: for every call site that sets the
# token, where the capture puts the run's ink row against where the render
# put it, averaged, and it is what ct()'s single K still misses. It does not
# follow the size, so no K can absorb it - t-code at 13px wants its run 0.33
# higher and t-meta at 12.65px wants its own 0.23 lower - and together the
# fifteen take the five device screens from 10.17 to 8.88. The same pass
# measured each run's left edge too; every token came back inside a third of
# a point, and sweeping the corrections in moved no frame by more than 0.03,
# so the left bearing is one number, LSB, for the whole board.
TAB = "font-variant-numeric:tabular-nums"
FIT = {
    "t-big":    (TAB + ";letter-spacing:-0.8px", -1.6, 0.90),
    "t-date":   (TAB, 0.0, 0.38),
    "t-body":   ("", 0.0, 0.33),
    "t-code":   ("", 0.0, 0.33),
    "t-code-2": ("", 0.0, 0.33),
    "t-day":    ("", 0.0, 0.33),
    "t-day-2":  ("", 0.0, 0.33),
    "t-meta":   ("", 0.0, -0.23),
    "t-nav":    ("", 0.0, 0.33),
    "t-nav-2":  ("", 0.0, 0.33),
    "t-p5":     ("", 0.0, 0.33),
    "t-p5-row": ("", 0.0, 0.17),
    "t-pill":   ("", 0.0, -0.17),
    "t-tab":    ("", 0.0, -0.33),
    "t-title":  ("", 0.0, -0.20),
}
NO_FIT = ("", 0.0, 0.0)


def fit(tok):
    return FIT.get(tok, NO_FIT)


def tb(tok, top, body, left=0.0, width=None, align="left", c=None, extra=""):
    """One run of type, placed by its *line box* top (Figma's own number)."""
    extra = ";".join(x for x in (fit(tok)[0], extra) if x)
    return ('<div class="t" style="left:%.2fpx;top:%.2fpx;%s%sfont:var(--x-%s)%s">'
            '%s</div>'
            % (left, top,
               "width:%.1fpx;text-align:%s;" % (width, align) if width else "",
               "color:var(--x-%s);" % c if c else "", tok,
               ";" + extra if extra else "", body))


def t(tok, ink, body, lift=0.0, **kw):
    """Placed by the row its ink sits on, which is what a capture gives you.
    `lift` is for the run whose topmost ink is not the token's usual: a caps
    run inside a token whose other call sites all lead with an ascender sits
    lower than one K can express, and only that call site knows."""
    return tb(tok, ct(ink, *ty(tok)) - fit(tok)[2] - lift, body, **kw)


def tl(tok, ink, x, body, **kw):
    """...and by where that ink starts."""
    lsb = LSB + (LSB_TAB1 if body[:1] == "1"
                 and "tabular" in fit(tok)[0] else 0.0)
    return t(tok, ink, body, left=x - lsb * ty(tok)[0], **kw)


def tr(tok, ink, x1, body, w=280.0, **kw):
    """Right-aligned: the measurement is the ink's right edge."""
    fs = ty(tok)[0]
    x1 += fit(tok)[1]
    return t(tok, ink, body, left=x1 + LSB * fs - w, width=w, align="right", **kw)


def tc(tok, ink, cx, body, w=300.0, **kw):
    return t(tok, ink, body, left=cx - w / 2, width=w, align="center", **kw)


# -------------------------------------------------------------- chrome ----
# Two frames on one ring. 956 + 2*12 = 980 fills the artboard exactly, so the
# body centres rather than pads and no board carries a drop shadow.
#
# The 430 x 932 frame does not: it leaves 12px of ground above and below, and
# next to an xl board in the same row it reads as a smaller phone rather than
# as a different device. It is only 2.5% smaller, and the two devices share an
# aspect ratio to within a pixel (430/932 = .4614, 440/956 = .4603), so the
# small frame is scaled up to the tall one's height for display: 932 x
# 956/932 = 956, and its outer ring lands at 465 x 980 against the xl's 464 x
# 980. Display only. Every coordinate inside the phone is still the pt it was
# measured at, so a re-diff of 03-06 wants
# `--phone-size 441x956 --phone-radius 63.6` to cut the screen back out.
BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--x-font);-webkit-font-smoothing:antialiased;
  display:flex;align-items:center;justify-content:center;width:478px;height:980px}"""

PHONE = """.phone{position:relative;flex:none;width:var(--x-w);height:var(--x-h);
  border-radius:var(--x-r-phone);overflow:hidden;background:var(--x-bg);color:var(--x-ink);
  box-shadow:0 0 0 10.5px #1D191A,0 0 0 12px #3A3735;transform:scale(1.02575)}
.phone.xl{width:var(--x-w-xl);height:var(--x-h-xl);border-radius:var(--x-r-phone-xl);
  transform:none}
.phone>*{position:absolute}
img.a{display:block;z-index:2}
img.a.rd{border-radius:50%}
.t{white-space:nowrap;z-index:3}
.card{background:var(--x-card);border:1px solid var(--x-line);border-radius:var(--x-r-card)}
.card.sel{background:var(--x-card-sel);border:2px solid var(--x-blue-2)}
.sh{z-index:1}
.pill{border-radius:var(--x-r-pill)}
.fab{background:var(--x-white);border-radius:50%;z-index:5}"""

def d(cls, x, y, w, h, extra=""):
    return ('<div class="%s" style="left:%.1fpx;top:%.1fpx;width:%.1fpx;height:%.1fpx%s">'
            '</div>' % (cls, x, y, w, h, ";" + extra if extra else ""))


def card(x, y, w, h, sel=False, extra=""):
    return d("card sel" if sel else "card", x, y, w, h, extra)


def pill(x, y, w, h, bg="", extra=""):
    """Every pill and chip on these screens measures radius = h/2."""
    css = ("background:var(--x-%s)" % bg) if bg else ""
    return d("pill", x, y, w, h, css + (";" + extra if extra else "") if css else extra)


def rule(x0, x1, y, c="line", h=1.0):
    return d("sh", x0, y, x1 - x0, h, "background:var(--x-%s)" % c)


def dashes(x0, n, y, w=3.4, pitch=6.33, h=1.3):
    """The flight-path run on 02 card 1: n dashes at a measured pitch."""
    return "".join(rule(x0 + i * pitch, x0 + i * pitch + w, y, "line-2", h)
                   for i in range(n))


def fab(x, y, s=48.0, arm=21.0, bar=3.0):
    """White circle, black plus. Two rounded bars, not a glyph."""
    gx, gy = x + (s - arm) / 2, y + (s - arm) / 2
    return (d("fab", x, y, s, s)
            + d("sh", gx, gy + (arm - bar) / 2, arm, bar,
                "background:var(--x-bg);border-radius:%.1fpx;z-index:6" % (bar / 2))
            + d("sh", gx + (arm - bar) / 2, gy, bar, arm,
                "background:var(--x-bg);border-radius:%.1fpx;z-index:6" % (bar / 2)))


# ---------------------------------------------------------- components ----
def statusbar(cluster, clock, ink, x, bell=False):
    """Live type for the clock, one composite crop for the right cluster.
    01/02 carry no bell glyph and 03/04 do, which is two status bars in one
    capture set, not one averaged into a wrong glyph."""
    return (tl("t-time", ink, x, clock, c="ink")
            + (art("g-bell") if bell else "") + art(cluster))


def backbtn(x, y):
    """03's back button, drawn rather than cropped. The other five header
    buttons are 44pt circles; this one is a 52 x 44 pill, so the 44pt box it
    was cropped at cut both ends off it. Width profile against a pill of
    radius h/2: 17.4/28.4/34.7/42.7/47.7/50.6 predicted at y 59.5..75.5,
    17.0/28.7/35.0/43.0/48.0/50.7 measured. The rim solves to 51 over the 24
    fill on both the top and the left edge, which is --x-line-4, the same 1pt
    system material as 02's action bar. The chevron centreline runs
    (48,74)-(41,81)-(48,88) absolute, 3pt round cap and join, which renders an
    ink box of 9.75 x 16.57 against the capture's 9.67 x 16.67."""
    return (pill(x, y, 52.0, 44.0, "card", "border:1px solid var(--x-line-4)")
            + ('<svg viewBox="0 0 52 44" width="52" height="44" style="position:'
               'absolute;left:%.1fpx;top:%.1fpx;z-index:3"><path d="M28 15L21 22l7 7" '
               'style="stroke:var(--x-ink-btn)" stroke-width="3.0" '
               'stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'
               % (x, y)))


def addpill(x, y):
    """+ Add. Offsets solved once on 01 card 1 and reused on all five."""
    return (pill(x, y, 60.3, 20.3, "blue-bg")
            + art("g-plus", x + 11.4, y + 5.7)
            + tl("t-pill", y + 5.3, x + 27.4, "Add", c="blue"))


def addedpill(x, y):
    return (pill(x, y, 75.4, 20.3, "green-bg")
            + art("g-check", x + 11.4, y + 6.0)
            + tl("t-pill", y + 5.3, x + 27.4, "Added", c="green"))


def joinpill(x, y):
    return (pill(x, y, 44.5, 20.3, "blue-bg")
            + tl("t-pill", y + 5.3, x + 10.1, "Join", c="blue"))


def chip(x, y, w, label, lx):
    """The duration chip between the two times. Height 17.4 on every screen
    that has one; the label sits 4.0 below its top."""
    return (d("pill", x, y, w, 17.4, "background:var(--x-chip)")
            + tl("t-chip", y + 4.0, lx, label, c="ink-3"))


def dot(cx, cy, s=9.0):
    """Unread marker, given by its centre: card_x0 + 10, card_top + 10."""
    return d("sh", cx - s / 2, cy - s / 2, s, s,
             "background:var(--x-blue-2);border-radius:50%;z-index:4")


def hpill(x, y, w, h, ink, label):
    """02's two header buttons: card fill, and a card's own 1pt outline."""
    return (d("pill", x, y, w, h,
              "background:var(--x-card);border:1px solid var(--x-line)")
            + t("t-btn", ink, label, left=x, width=w, align="center", c="ink-btn"))


# ------------------------------------------------------------- screen 01 ----
# Timeline, 440 x 956. Four cards, a floating +, and the tab bar; card 4 runs
# under that bar, so it ships with no bottom border and square bottom corners
# and the frame's own overflow cuts it at the divider.
def body01():
    return "".join([
        statusbar("sb-a", "09:41", 26.0, 60.3),
        art("01-hbl"), art("01-hbr"),
        tc("t-nav", 77.3, 220.0, "Timeline", c="ink"),
        tl("t-day", 140.3, 18.7, "Today Aug 16", c="ink"),
        tl("t-day-2", 140.3, 151.0, "Sunday", c="ink-4"),

        card(18.0, 176.0, 404.0, 124.7),
        art("cal-16"),
        tl("t-date", 197.0, 56.7, "Sun, Aug 16", c="ink-2"),
        addpill(345.5, 192.0),
        art("tile-check"),
        tl("t-title", 229.0, 66.7, "Confirm the hotel booking", c="ink-2"),
        art("g-ring"), art("g-flag"),
        tl("t-big", 264.0, 350.0, "17:10", c="ink"),

        card(18.0, 312.7, 404.0, 154.0),
        art("cal-16", 34.0, 331.3),
        tl("t-date", 333.7, 56.7, "Sun, Aug 16", c="ink-2"),
        addpill(345.5, 328.7),
        art("tile-ticket"),
        tl("t-title", 365.7, 66.7, "Founders drinks &middot; AGI week", c="ink-2"),
        tl("t-big", 401.7, 35.7, "21:00", c="ink"),
        art("g-pin"),
        tr("t-meta", 407.7, 405.0, "Marina Bay", c="ink-3"),
        d("pill", 267.0, 430.3, 139.0, 20.4,
          "border:1px solid var(--x-amber-bg)"),
        rule(336.3, 400.7, 430.3, "amber"),
        art("g-flag-sm"),
        tl("t-pill", 435.7, 295.7, "Register &middot; 3 h left", c="amber"),

        tl("t-day", 497.0, 18.7, "Aug 18", c="ink"),
        tl("t-day-2", 497.0, 90.0, "Tuesday", c="ink-4"),

        card(18.0, 532.7, 404.0, 196.0),
        art("cal-18"),
        tl("t-date", 553.7, 56.7, "Tue, Aug 18", c="ink-2"),
        addpill(345.5, 548.7),
        art("tile-lodge"),
        tl("t-title", 586.0, 66.7, "Tiong Bahru heritage loft", c="ink-2"),
        tl("t-big", 620.7, 36.7, "14:00", c="ink"),
        art("g-ticket"),
        tl("t-big", 620.7, 141.7, "HMKQ55", c="ink"),
        art("g-people"),
        tl("t-meta", 651.0, 56.0, "3 guests", c="ink-3"),
        art("g-pin", 35.0, 674.7),
        tl("t-meta", 674.7, 55.7, "Tiong Bahru &middot; Eng Hoon St", c="ink-3"),
        art("g-flag-2"),
        tl("t-meta", 699.0, 56.0,
           'Free cancel until <b style="font-weight:600;font-variant-numeric:tabular-nums">Aug 16, 14:10</b>',
           c="amber"),

        tl("t-day", 759.0, 18.7, "Aug 21", c="ink"),
        tl("t-day-2", 759.0, 89.7, "Friday", c="ink-4"),

        card(18.0, 794.7, 404.0, 75.5, extra="border-bottom:none;"
             "border-bottom-left-radius:0;border-bottom-right-radius:0"),
        art("g-hour"),
        tl("t-date", 815.0, 57.0, "Expires Fri, Aug 21", c="ink-2"),
        pill(324.2, 810.7, 60.4, 20.3, "amber-bg"),
        tl("t-pill", 816.0, 335.0, "5 days", c="amber"),
        art("tile-tag"),
        tl("t-title", 847.7, 67.0,
           "20% off any grande drink &middot; Starbucks", c="ink-2"),

        fab(372.0, 802.2),
        rule(0.0, 440.0, 870.0, "line", 0.33),
        art("01-tab-h"), art("01-tab-c"), art("01-tab-t"),
        tl("t-tab", 906.3, 59.0, "Home", c="ink-5"),
        tl("t-tab", 906.3, 194.3, "Collection", c="ink-5"),
        tl("t-tab", 906.3, 345.0, "Timeline", c="white"),
    ])


# ------------------------------------------------------------- screen 02 ----
# Batch select, 440 x 956. Five cards, two of them selected, and the floating
# action bar. Card 5 is cut by the frame: its last 9pt ship as one strip crop
# rather than as a guess at what the rest of it says.
def body02():
    return "".join([
        statusbar("sb-a", "09:41", 26.0, 60.3),
        hpill(20.0, 62.0, 103.0, 44.0, 77.7, "Select All"),
        hpill(347.7, 62.0, 72.3, 44.0, 78.3, "Done"),
        tc("t-nav", 77.7, 220.0, "2 Selected", c="ink"),
        tl("t-day", 140.3, 18.7, "Today Aug 16", c="ink"),
        tl("t-day-2", 140.3, 151.0, "Sunday", c="ink-4"),

        card(18.0, 176.0, 404.0, 190.3, sel=True),
        art("cal-2"),
        tl("t-date", 197.0, 56.7, "Sun, Aug 2", c="ink-2"),
        addedpill(330.6, 192.0),
        art("tile-plane"),
        tl("t-title", 229.7, 66.7, "CZ3156", c="ink-2",
           extra="font-variant-numeric:tabular-nums"),
        art("g-tick-sm"),
        tl("t-code-2", 231.0, 347.7, "NDK7JZ", c="ink-2"),
        tl("t-big", 265.3, 35.0, "09:00", c="ink"),
        tr("t-big", 265.3, 405.3, "19:40", c="ink"),
        art("g-band-o"), dashes(167.0, 6, 274.0),
        art("g-band-p"), dashes(234.3, 6, 274.0), art("g-band-c"),
        tl("t-meta", 289.3, 34.7, "GMT+8", c="ink-3"),
        tr("t-meta", 289.3, 404.7, "GMT+8", c="ink-3"),
        tl("t-code", 306.3, 35.0, "PKX", c="ink"),
        tr("t-code", 306.3, 404.7, "SIN", c="ink"),
        tl("t-place", 322.7, 35.0, "Beijing Daxing", c="ink-3"),
        tr("t-place", 322.7, 405.0, "Singapore Changi", c="ink-3"),
        tl("t-place", 338.0, 35.0, "International Airp&hellip;", c="ink-3"),
        tr("t-place", 338.0, 405.0, "Airport T3", c="ink-3"),

        card(18.0, 378.3, 404.0, 166.7, sel=True),
        art("cal-30"),
        tl("t-date", 399.0, 56.7, "Thu, Jul 30", c="ink-2"),
        addedpill(330.6, 394.0),
        art("tile-people"),
        tl("t-title", 431.3, 66.7,
           "SnapAction beta review w/ Rescience team", c="ink-2"),
        tl("t-big", 467.7, 36.7, "14:00", c="ink"),
        tr("t-big", 467.7, 405.3, "14:45", c="ink"),
        chip(189.9, 465.0, 60.5, "45 mins", 199.3),
        tc("t-sub", 489.7, 220.0, "GMT+8", c="ink-3"),
        art("g-video"),
        tl("t-meta", 513.7, 55.7,
           "Google Meet &middot; meet.google.com/oak-qmvp-&hellip;", c="ink-3"),
        joinpill(361.2, 508.0),

        card(18.0, 557.0, 404.0, 154.0), dot(28.0, 567.0),
        art("cal-27"),
        tl("t-date", 577.7, 56.7, "Jul 27 &ndash; Aug 3", c="ink-2"),
        addpill(345.5, 572.7),
        art("tile-fest"),
        tl("t-title", 610.3, 66.7, "AGI Playground 2026", c="ink-2"),
        tl("t-big", 646.0, 34.7, "Jul 27", c="ink"),
        tr("t-big", 646.0, 404.7, "Aug 3", c="ink"),
        chip(170.3, 643.3, 99.4, "All day &middot; 8 days", 179.7),
        rule(155.0, 163.3, 652.0), rule(276.7, 285.0, 652.0),
        art("g-pin", 35.0, 678.7),
        tl("t-meta", 678.7, 55.7, "Singapore", c="ink-3"),
        pill(322.3, 674.9, 83.3, 20.3, "blue-bg"),
        tl("t-pill", 679.7, 332.7, "Get tickets", c="blue"),

        card(18.0, 723.0, 404.0, 166.7), dot(28.0, 733.0),
        art("cal-5"),
        tl("t-date", 743.7, 56.7, "Wed, Aug 5", c="ink-2"),
        addpill(345.5, 738.7),
        art("tile-mic"),
        tl("t-title", 776.0, 66.7, "The Rise of AI Field Engineers", c="ink-2"),
        tl("t-big", 812.0, 36.7, "19:00", c="ink"),
        tr("t-big", 812.0, 405.3, "21:00", c="ink"),
        chip(202.7, 809.3, 35.0, "2 h", 212.7),
        rule(155.0, 195.7, 818.0), rule(244.7, 285.0, 818.0),
        tc("t-sub", 834.0, 220.0, "GMT+8", c="ink-3"),
        art("g-pin", 35.0, 857.0),
        tl("t-meta", 857.0, 55.7, "Singapore", c="ink-3"),
        pill(258.0, 853.0, 148.0, 20.3, "blue-bg"),
        art("g-flag-b"),
        tl("t-pill", 858.0, 286.7, "Register by Aug 19", c="blue"),

        card(18.0, 901.7, 404.0, 120.0), dot(28.0, 911.7),
        art("cal-1"),
        tl("t-date", 922.3, 56.7, "Sat, Aug 1 &mdash; overdue", c="red"),
        addpill(345.5, 917.3),
        art("02-clip"),

        d("pill", 116.5, 870.0, 207.2, 46.0,
          "background:var(--x-bar);border:0.33px solid var(--x-line-4);"
          "z-index:5"),
        art("ab-mail", z=6), art("ab-star", z=6),
        art("ab-pin", z=6), art("ab-trash", z=6),
    ])


# ------------------------------------------------------------- screen 03 ----
# Agenda, 430 x 932. Same card grammar as 01 on the smaller frame, with the
# blurred scroll edge under the header kept as a crop rather than faked with a
# backdrop filter.
def body03():
    def gmt(ink):
        return tc("t-sub", ink, 214.85, "GMT+8", c="ink-3")
    return "".join([
        statusbar("sb-b", "17:38", 22.0, 48.7, bell=True),
        backbtn(20.0, 59.0), art("03-hbr"), art("03-blur"),
        tl("t-nav", 74.7, 157.7, "Jul 14", c="ink"),
        tl("t-nav-2", 74.7, 210.0, "Tuesday", c="ink-4"),

        card(18.0, 130.0, 394.0, 125.7),
        art("cal-10"),
        tl("t-date", 150.3, 57.0, "Fri, Jul 10", c="ink-2"),
        addedpill(320.6, 146.0),
        art("tile-din"),
        tl("t-title", 183.0, 67.3,
           "Meeting with Wang Yifei at Jing-A Taproom", c="ink-2"),
        tl("t-big", 219.0, 36.7, "18:30", c="ink"),
        art("g-pin-r"),
        tr("t-meta", 225.0, 395.7, "dinner", c="ink-3"),

        card(18.0, 267.7, 394.0, 161.0),
        art("cal-9"),
        tl("t-date", 288.3, 56.7, "Thu, Jul 9", c="ink-2"),
        addedpill(320.6, 284.0),
        art("tile-talk"),
        tl("t-title", 320.7, 67.3,
           "Entrepreneurship Short and Long Runs with&hellip;", c="ink-2"),
        tl("t-big", 356.7, 35.7, "20:30", c="ink"),
        tr("t-big", 356.7, 395.3, "20:30", c="ink"),
        rule(155.0, 275.0, 365.0), gmt(373.3),
        art("g-cam"),
        tl("t-meta", 397.3, 55.7,
           "VooV &middot; meeting.tencent.com/dw/7uVoAjZ2&hellip;", c="ink-3"),
        joinpill(351.2, 392.7),

        tl("t-day", 459.0, 18.7, "Jul 9", c="ink"),
        tl("t-day-2", 459.0, 70.7, "Thursday", c="ink-4"),

        card(18.0, 494.7, 394.0, 161.0),
        art("cal-9", 34.0, 513.3),
        tl("t-date", 515.3, 56.7, "Thu, Jul 9", c="ink-2"),
        addedpill(320.6, 511.0),
        art("tile-talk-2"),
        tl("t-title", 547.7, 67.3,
           "Entrepreneurship's Long Runs and Sprints -&hellip;", c="ink-2"),
        tl("t-big", 583.7, 35.7, "20:30", c="ink"),
        tr("t-big", 583.7, 395.3, "20:30", c="ink"),
        rule(155.0, 275.0, 592.0), gmt(600.3),
        art("g-cam", 34.0, 624.3),
        tl("t-meta", 624.3, 55.7,
           "VooV &middot; meeting.tencent.com/dw/7uVoAjZ2&hellip;", c="ink-3"),
        joinpill(351.2, 619.7),

        tl("t-day", 686.0, 18.7, "Jul 8", c="ink"),
        tl("t-day-2", 686.0, 71.0, "Wednesday", c="ink-4"),

        card(18.0, 721.7, 394.0, 157.3), dot(28.0, 731.7),
        art("cal-8"),
        tl("t-date", 742.3, 56.7, "Wed, Jul 8", c="ink-2"),
        addedpill(320.6, 738.0),
        art("tile-lab"),
        tl("t-title", 774.7, 66.7,
           "AI&sup3; Growth Hackathon Workshop: From Blac&hellip;", c="ink-2"),
        tl("t-big", 810.7, 35.7, "21:00", c="ink"),
        tr("t-big", 810.7, 395.3, "21:00", c="ink"),
        rule(155.0, 275.0, 819.0), gmt(827.3),
        art("g-pin", 35.0, 848.3),
        tl("t-meta", 849.7, 55.7, "Online", c="ink-3"),

        tl("t-day", 909.3, 18.7, "Jul 7", c="ink"),
        tl("t-day-2", 909.3, 69.0, "Tuesday", c="ink-4"),
    ])


# ------------------------------------------------------------- screen 04 ----
# Collection, 430 x 932. Two saved articles. Card B's description tail and its
# third chip are behind the +, so they are transcribed only as far as they are
# visible; the chip keeps its measured box and loses its label.
def body04():
    def chips(y, ink, runs):
        """The green Article tag is the only one on a fill of its own, and the
        only one set in the heavier face."""
        out = []
        for x0, x1, label, lx, fill, col in runs:
            out.append(pill(x0, y, x1 - x0, 20.3, fill))
            if label:
                out.append(tl("t-tag-2" if fill == "art-bg" else "t-tag",
                              ink, lx, label, c=col))
        return "".join(out)
    return "".join([
        art("04-blur1"),
        statusbar("sb-c", "17:42", 22.0, 49.0, bell=True),
        art("04-hbl"), art("04-hbr"), art("04-blur2"),
        tl("t-nav", 74.7, 144.0, "Jul 29", c="ink"),
        tl("t-nav-2", 74.7, 198.3, "Wednesday", c="ink-4"),

        card(18.0, 148.3, 394.0, 330.7),
        art("04-img-a"),
        tl("t-title", 379.0, 35.3, "LLM Architecture Gallery", c="ink-2"),
        tl("t-body", 403.0, 34.3,
           "A curated collection of LLM architecture figures, fact", c="ink-3"),
        tl("t-body", 421.7, 34.7,
           "sheets, and technical analysis by Sebastian Raschka, incl&hellip;",
           c="ink-3"),
        art("04-fav-a"),
        tl("t-sub", 448.0, 56.7, "sebastianraschka.com", c="ink-4"),
        chips(442.7, 447.7, [
            (188.5, 247.5, "Article", 198.7, "art-bg", "green-2"),
            (253.8, 283.5, "ai", 264.3, "chip", "ink-3"),
            (289.8, 326.9, "llm", 300.7, "chip", "ink-3")]),

        card(18.0, 491.0, 394.0, 341.0),
        art("04-img-b"),
        tl("t-title", 712.0, 34.7,
           "The fuel of the future is already here: Why", c="ink-2"),
        tl("t-title", 732.7, 34.7, "TRISO matters", c="ink-2"),
        tl("t-body", 756.0, 34.3,
           "An educational article from Amazon Science explaining", c="ink-3"),
        tl("t-body", 774.7, 34.7,
           "TRISO nuclear fuel technology, its structure, and its impor",
           c="ink-3"),
        art("04-fav-b"),
        # 801.0 is the i dots, which are this string's topmost ink; 803.7 is
        # its x-height and placing by that drops the whole row 2.7pt.
        tl("t-sub", 801.0, 56.7, "amazon.science", c="ink-4"),
        chips(795.7, 800.7, [
            (153.5, 212.5, "Article", 163.7, "art-bg", "green-2"),
            (218.8, 333.9, "amazon-science", 229.3, "chip", "ink-3"),
            (340.1, 385.1, "tri", 350.5, "chip", "ink-3")]),

        fab(362.0, 778.0),
        rule(0.0, 430.0, 846.0, "line", 0.33),
        art("04-tab-h"), art("04-tab-c"), art("04-tab-t"),
        tl("t-tab", 882.3, 57.3, "Home", c="ink-5"),
        tl("t-tab", 882.3, 189.3, "Collection", c="white"),
        tl("t-tab", 882.3, 337.0, "Timeline", c="ink-5"),
    ])


# ------------------------------------------------------------- screen 05 ----
# Resource detail, 430 x 932. The hero is one crop, top of frame to the fold,
# because it carries the status bar, the map and the photograph.
def body05():
    def row(ink, label, lx, value, vx, link=None):
        """`link` is the label's own ink row. Label and value share one row
        except on the three that carry a badge, where the capture puts the
        label 2.0-2.3pt lower than the value; nothing about the glyphs
        explains it, and all three measure the same way."""
        return (tl("t-p5-row", link or ink, lx, label, c="ink-5")
                + tr("t-p5-row", ink, vx, value, c="white"))
    return "".join([
        art("05-shot"),
        tl("t-p5", 403.0, 23.3, "PKX", c="ink"),
        tl("t-p5", 403.0, 62.0, "&rarr;", c="ink"),
        tl("t-p5", 403.0, 81.0, "SIN", c="ink"),

        d("sh", 22.0, 435.3, 386.0, 88.7,
          "background:var(--x-detail);border-radius:var(--x-r-card)"),
        art("05-g-plane"),
        # U+202F before AM/PM, which is what iOS sets and what the capture
        # shows: an ordinary space runs the leg 2.4pt long and nothing else
        # in the string can absorb it.
        tl("t-p5-row", 451.4, 72.6,      # ink measures 73.3; "D" sets 0.7 late
           "Depart &middot; Sun, Aug 2 &middot; 9:00&#8239;AM", c="ink"),
        rule(22.0, 408.0, 479.7, "hair-2"),
        art("05-g-pin"),
        tl("t-p5-row", 495.7, 72.3,
           "Arrive &middot; Sun, Aug 2 &middot; 7:40&#8239;PM", c="ink"),

        row(557.0, "Website", 22.7, "https://www.csair.com/", 407.0,
            link=559.3),
        art("05-bdg-w"),
        rule(22.0, 408.0, 590.7, "hair"),
        row(608.0, "Carrier", 23.0, "China Southern Airlines", 407.3),
        rule(22.0, 408.0, 637.0, "hair"),
        row(654.3, "Transport type", 22.7, "flight", 407.3),
        rule(22.0, 408.0, 683.3, "hair"),
        row(700.7, "Booking reference", 23.3, "1658114309832893", 407.0),
        rule(22.0, 408.0, 729.7, "hair"),
        row(747.0, "Departure", 23.3, "Beijing", 407.0, link=749.7),
        art("05-bdg-d"),
        rule(22.0, 408.0, 780.0, "hair"),
        row(797.3, "Destination", 23.3, "Singapore", 407.3,
            link=799.6),
        art("05-bdg-x"),
        rule(22.0, 408.0, 830.3, "hair"),
        row(847.7, "Arrival Airport", 22.7, "SIN", 406.7),
        rule(22.0, 408.0, 876.7, "hair"),
        row(894.0, "Departure Airport", 23.3, "PKX", 407.3),

        d("sh", 424.0, 178.0, 3.0, 541.7,
          "background:var(--x-scroll);border-radius:1.5px;z-index:6"),
        d("sh", 138.0, 919.0, 154.0, 5.0,
          "background:var(--x-white);border-radius:2.5px;z-index:7"),
    ])


# ------------------------------------------------------------- screen 06 ----
# View resource, 430 x 932, and the only light screen. Built from the Figma
# node rather than from a capture: the render the file returns stops at
# x 380.5 / y 168.75, so ref-06 is a partial and every number here is the
# node's own, divided by 2.165354.
#
# The status bar is not drawn. The expanded Dynamic Island covers all of it,
# so drawing one would put a clock behind an opaque panel and nothing else.
CSS06 = """.phone.l{background:var(--x-l-bg);color:var(--x-l-ink)}
.panel{background:var(--x-l-panel)}
.block{background:var(--x-l-bg);border-radius:var(--x-r-panel)}
.av{width:36px;height:36px;border-radius:50%;overflow:hidden;z-index:4;
  background:var(--x-l-bg);border:1px solid var(--x-l-line)}
.av img{position:absolute;left:0;top:0;width:100%;height:100%;display:block}
.av.sm{width:28px;height:28px;border:none;border-radius:18px;z-index:9}
.cta{background:var(--x-l-cta);border-radius:100px;z-index:2;
  box-shadow:0 0 2px rgba(0,0,0,.1),0 1px 8px rgba(0,0,0,.1),
    inset 3px 3px .5px -3.5px #fff,inset 2px 2px .5px -2px #262626,
    inset -2px -2px .5px -2px #262626}
.island{background:#000;border-radius:var(--x-r-island);z-index:8;
  box-shadow:0 8px 16px rgba(0,0,0,.25)}"""

CHEV = ('<svg viewBox="0 0 12 12" width="12" height="12" style="position:absolute;'
        'left:%.1fpx;top:%.1fpx;z-index:4"><path d="M3 4.5L6 7.5L9 4.5" '
        'style="stroke:var(--x-l-ink-4)" stroke-width="2" stroke-linecap="round" '
        'fill="none"/></svg>')


def avatar(cls, x, y):
    """The Teams icon over the SnapAction icon. The top one is opaque, so the
    app icon underneath is invisible on this screen; it is placed anyway
    because the node stacks them and a later state uncovers it."""
    return ('<div class="%s" style="left:%.1fpx;top:%.1fpx">'
            '<img src="%s" alt=""><img src="%s" alt=""></div>'
            % (cls, x, y, _uri("06-appicon"), _uri("06-avatar")))


def body06():
    def dtrow(top, label, value):
        return (tb("t-l-row", top + 10.1, label, left=50.0, c="l-ink-3")
                + tb("t-l-row", top + 10.1, value, left=264.7, c="l-ink")
                + CHEV % (368.0, top + 14.0))
    return "".join([
        raw("06-thread", 70.5, -21.0, 289.0, 627.0,
            extra="border-radius:var(--x-r-thumb);"
                  "border:1px solid rgba(0,0,0,.25)"),

        d("panel", 0.0, 614.0, 430.0, 318.0),
        avatar("av", 31.0, 631.0),
        tb("t-l-title", 630.65, "Intro Call with Sarah Miller", left=79.0, c="l-ink"),
        tb("t-l-link", 655.0, "https://teams.live.com/meet/9392254898746",
           left=79.0, c="l-link"),
        tb("t-l-menu", 638.0, "&#8942;", left=380.92, c="l-ink-3"),
        tb("t-l-desc", 687.2,
           "Brief intro call to discuss the Senior Quantitative Analyst role at",
           left=31.0, c="l-ink-2"),
        tb("t-l-desc", 705.2,
           "Morgan Stanley's Systematic Trading team in New York.",
           left=31.0, c="l-ink-2"),

        d("block", 31.0, 739.2, 368.0, 80.02),
        dtrow(739.2, "Start", "Thu, Jul 3 14:00"),
        rule(31.0, 399.0, 779.2, "l-line"),
        dtrow(779.2, "End", "Thu, Jul 3 14:30"),

        d("cta", 21.0, 835.2, 388.0, 48.32),
        tb("t-l-cta", 849.2, "Add to Calendar", left=155.19, c="white",
           extra="letter-spacing:-0.1px;z-index:4"),

        d("island", 32.0, 8.0, 367.0, 127.3),
        avatar("av sm", 64.0, 43.0),
        d("sh", 108.0, 42.69, 46.02, 14.62,
          "background:var(--x-l-badge);border-radius:8px;z-index:9"),
        t("t-i-badge", 44.69, "meeting", left=113.0, c="l-badge-ink",
          extra="z-index:10"),
        tb("t-i-line", 42.66, "Thu, Jul 3 14:00 &rarr; Thu, Jul 3 14:30",
           left=159.02, c="white", extra="z-index:10"),
        tb("t-i-line", 60.0, "Intro Call with Sarah Miller", left=108.0,
           c="white", extra="z-index:10"),
        d("sh", 48.0, 90.32, 335.0, 33.0,
          "background:var(--x-l-blue);border-radius:20px;z-index:9"),
        t("t-i-cta", 98.28, "Add to Calendar", left=161.0, c="white",
          extra="z-index:10"),
    ])


# ----------------------------------------------------------------- emit ----
def page(title, body, extra_css=""):
    html = ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
            '<title>%s</title>\n<style>\n%s\n\n%s\n%s\n%s</style>\n</head>\n<body>\n%s\n'
            '</body>\n</html>\n'
            % (title, TOKENS_CSS, BASE, PHONE, extra_css, body))
    return html.replace("--x-", "--%s-" % P)


def write(name, html):
    (OUT / (name + ".html")).write_text(html)
    print("%-24s %6d KB" % (name + ".html", len(html.encode()) // 1024))


def screen(label, cls, body, extra_css=""):
    return page(NAME + " - " + label,
                '<div class="phone%s">%s</div>' % (" " + cls if cls else "", body),
                extra_css)


SCREENS = [
    ("01-timeline",        "Timeline",        lambda: screen("Timeline", "xl", body01())),
    ("02-batch-select",    "Batch select",    lambda: screen("Batch select", "xl", body02())),
    ("03-agenda",          "Agenda",          lambda: screen("Agenda", "", body03())),
    ("04-collection",      "Collection",      lambda: screen("Collection", "", body04())),
    ("05-resource-detail", "Resource detail", lambda: screen("Resource detail", "", body05())),
    ("06-view-resource",   "View resource",   lambda: screen("View resource", "l", body06(), CSS06)),
]


# --------------------------------------------------- foundations boards ----
SHEET = """body{padding:0;background:var(--x-bg);color:var(--x-ink)}
.sheet{width:478px;height:980px;padding:16px;overflow:hidden}
h1{font:600 17px/22px var(--x-font);margin-bottom:2px}
header p{font:400 11px/15px var(--x-font);color:var(--x-ink-3);margin-bottom:9px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--x-ink-3);margin:9px 0 4px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}
.sw .chip{height:20px;border-radius:5px;border:1px solid var(--x-line)}
.sw b{display:block;margin-top:2px;font:600 8px/10px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 7.5px/10px ui-monospace,Menlo,monospace;
  color:var(--x-ink-4);font-style:normal}
.foot{display:flex;gap:26px;align-items:flex-start;margin-top:10px}
.foot h2{margin-top:0}
.rad{display:flex;gap:8px}
.rb{width:38px;height:24px;background:var(--x-card);border:1px solid var(--x-line-2)}
.rad em{display:block;margin-top:2px;font:400 8px/11px var(--x-font);
  color:var(--x-ink-4);font-style:normal;text-align:center}
.ty{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}
.tr{display:flex;align-items:baseline;justify-content:space-between;gap:8px;
  padding-bottom:1px;border-bottom:1px solid var(--x-line)}
.tr span{white-space:nowrap;overflow:hidden}
.tr em{font:400 7.5px/10px ui-monospace,Menlo,monospace;color:var(--x-ink-4);
  font-style:normal;white-space:nowrap;flex:none}
.met{font:400 9px/13px ui-monospace,Menlo,monospace;color:var(--x-ink-2)}
table.ev{width:100%;border-collapse:collapse}
table.ev td{vertical-align:top;padding:2.5px 6px 2.5px 0;
  border-bottom:1px solid var(--x-line);font:400 8.5px/11px var(--x-font)}
td.t,td.v{font-family:ui-monospace,Menlo,monospace;white-space:nowrap}
td.t{color:var(--x-blue)}
td.v{color:var(--x-ink);max-width:132px;overflow:hidden;text-overflow:ellipsis}
td.e{color:var(--x-ink-3)}"""


def token_board():
    """Classified by what a row *is*, not by which group it was written in, so
    the light tokens of screen 06 land beside the dark ones they mirror."""
    cols = [x for x in TOKENS if x[2].startswith("#")]
    rads = [x for x in TOKENS if x[1].startswith("r-")
            and x[1] not in ("r-phone", "r-phone-xl")]
    typs = [x for x in TOKENS if x[1].startswith("t-")]
    mets = [x for x in TOKENS if not x[2].startswith("#")
            and not x[1].startswith(("r-", "t-")) and x[1] != "font"]
    swatches = "".join(
        '<div class="sw"><div class="chip" style="background:var(--x-%s)"></div>'
        '<b>%s</b><i>%s</i></div>' % (n, n, v) for _, n, v, _ in cols)
    radii = "".join(
        '<div><div class="rb" style="border-radius:%s"></div><em>%s</em></div>'
        % (v, v) for _, n, v, _ in rads)
    type_ = "".join(
        '<div class="tr"><span style="font:var(--x-%s);line-height:1.15">'
        'Sun, Aug 16</span><em>%s</em></div>' % (n, n) for _, n, v, _ in typs)
    met = "<br>".join("--x-%s: %s" % (n, v) for _, n, v, _ in mets)
    return page(NAME + " - Design Tokens",
                '<div class="sheet"><header><h1>%s</h1>'
                '<p>Six App Store frames from one Figma file, five of them '
                'device captures at 3.0 px per pt, one a partial render of the '
                'node itself. %d tokens.</p></header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<div class="foot"><div><h2>Radius</h2><div class="rad">%s</div>'
                '</div><div><h2>Metrics</h2><div class="met">%s</div></div></div>'
                '<h2>Type</h2><div class="ty">%s</div></div>'
                % (NAME, len(TOKENS), swatches, radii, met, type_), SHEET)


# Evidence rows differ five-fold in length now that they cite the app's own
# token names, so a fixed rows-per-page split either overflows the 980px
# artboard or wastes half of one. Pack by an estimated line count instead:
# a row costs one unit per EV_COLS characters of evidence, and EV_UNITS is
# the tallest page --check-overflow accepts (it starts clipping at 74).
EV_COLS, EV_UNITS = 62, 64


def evidence_boards():
    pages, cur, used = [], [], 0
    for row in TOKENS:
        cost = max(1, -(-len(row[3]) // EV_COLS))
        if cur and used + cost > EV_UNITS:
            pages.append(cur); cur, used = [], 0
        cur.append(row); used += cost
    pages.append(cur)
    for i, chunk in enumerate(pages):
        rows = "".join(
            '<tr><td class="t">--x-%s</td><td class="v">%s</td><td class="e">%s</td></tr>'
            % (n, v.split(" var")[0], e) for _, n, v, e in chunk)
        of = " %d/%d" % (i + 1, len(pages)) if len(pages) > 1 else ""
        yield ("00%s-evidence" % "bcdefgh"[i],
               page(NAME + " - Evidence" + of,
                    '<div class="sheet"><header><h1>Evidence%s</h1>'
                    '<p>One row per token. A token with no evidence is a guess.'
                    '</p></header><table class="ev">%s</table></div>' % (of, rows),
                    SHEET))


# ---------------------------------------------------------- the product ----
# Not a replica of anything, and the only board here that is not measured
# against a capture. SnapAction is ReScience Lab's own app, so this one is the
# thing itself: the App Store listing's own copy and icon, and two QR codes
# built from the URLs and decoded back with Vision to prove they carry them.
# It is a landscape banner rather than a phone, 4 x 478 + 3 x 80 wide so it
# spans the foundations row exactly, and layout.json carries its size and the
# two buttons the canvas draws under it (a board is sandboxed, so a link in
# the markup could never navigate; the clickable part has to be a shape).
#
# The foot of it is the one measurement on the board. snapaction.ai publishes
# its palette as oklch custom properties; converted to sRGB they are not the
# app's, and a marketing site drifting from the product it sells is exactly
# the kind of thing the rest of this folder exists to catch.
PROMO_W, PROMO_H = 2152, 460
PROMO_CSS = """body{width:%dpx;height:%dpx;padding:0;background:var(--x-bg);
  color:var(--x-ink);display:block}
.pr{width:100%%;height:100%%;padding:44px 56px;overflow:hidden;display:flex;
  gap:56px;align-items:stretch}
.pr .col{display:flex;flex-direction:column;flex:none}
.pr .c1{width:748px}
.pr .c2{width:680px}
.pr .c3{width:500px}
.pr .hd{display:flex;gap:22px;align-items:center}
.pr .hd img{width:118px;height:118px;border-radius:26.5px;flex:none;
  border:1px solid var(--x-line)}
.pr h1{font:700 40px/44px var(--x-font);letter-spacing:-1px}
.pr .hd p{font:500 19px/25px var(--x-font);color:var(--x-ink-3);margin-top:3px}
.pr .hd em{display:block;font:400 14px/19px var(--x-font);color:var(--x-ink-4);
  font-style:normal;margin-top:5px}
.pr .tag{font:700 42px/50px var(--x-font);letter-spacing:-1.2px;margin-top:30px}
.pr .tag i{display:block;color:var(--x-ink-4);font-style:normal}
.pr .lead{font:400 15px/23px var(--x-font);color:var(--x-ink-3);margin-top:22px}
.pr .quote{background:var(--x-card);border:1px solid var(--x-line);
  border-radius:var(--x-r-card);padding:22px 24px;
  font:500 20px/30px var(--x-font);color:var(--x-ink-2)}
.pr .quote b{color:var(--x-ink);font-weight:600}
.pr .kinds{display:flex;flex-wrap:wrap;gap:8px;margin-top:24px}
.pr .kinds span{font:600 14px/19px var(--x-font);padding:6px 14px;
  border-radius:var(--x-r-pill);background:var(--x-chip);color:var(--x-ink-3)}
.pr .facts{margin-top:22px;font:400 13px/18px ui-monospace,Menlo,monospace;
  color:var(--x-ink-4)}
.pr h2{font:600 10px/13px var(--x-font);letter-spacing:.9px;
  text-transform:uppercase;color:var(--x-ink-4);margin-bottom:9px}
.pr .ways{margin-top:auto}
.pr .ways div{display:flex;gap:8px}
.pr .ways span{font:500 13px/18px var(--x-font);color:var(--x-ink-2);
  background:var(--x-card);border:1px solid var(--x-line);
  border-radius:10px;padding:7px 12px;white-space:nowrap}
.pr .qr{display:flex;gap:16px}
.pr .qr .card{flex:1;padding:16px;text-align:center}
.pr .qr img{width:124px;height:124px;background:#FFF;padding:6px;
  border-radius:10px;image-rendering:pixelated}
.pr .qr b{display:block;font:600 15px/20px var(--x-font);color:var(--x-ink);
  margin-top:12px}
.pr .qr u{display:block;text-decoration:none;margin-top:4px;
  font:400 10.5px/15px ui-monospace,Menlo,monospace;color:var(--x-blue)}
.pr .note{margin-top:auto;padding-top:20px;border-top:1px solid var(--x-line)}
.pr .note p{font:400 12px/18px var(--x-font);color:var(--x-ink-3)}
.pr .note code{font:400 11.5px/18px ui-monospace,Menlo,monospace;
  color:var(--x-ink-2)}""" % (PROMO_W, PROMO_H)

# Site token -> sRGB, app token -> sRGB. The left column is snapaction.ai's own
# --custom-properties, read out of its stylesheet and converted from oklch.
SITE_VS_APP = [("--app-blue", "oklch(.57 .22 255)", "#0071F4", "DSPalette.accent", "#4A74FF"),
               ("--surface-dark", "oklch(.18 .006 260)", "#101214", "DSPalette.canvas", "#000000")]

KINDS = [("Events", "green"), ("Meetings", "blue"), ("Travel", "amber"),
         ("Bookings", ""), ("To-dos", "")]

KIND_CSS = {"green": "background:var(--x-green-bg);color:var(--x-green-2)",
            "blue": "background:var(--x-blue-bg);color:var(--x-blue)",
            "amber": "background:var(--x-amber-bg);color:var(--x-amber)",
            "": ""}

# What the canvas draws under the banner. A board is sandboxed markup and can
# navigate nothing, so these are shapes on the page, declared here so the
# generator stays the one source of truth for the folder.
PROMO_LINKS = [{"label": "snapaction.ai", "url": "https://snapaction.ai/"},
               {"label": "Download on the App Store",
                "url": "https://apps.apple.com/app/id6759501517"}]


def product_board():
    kinds = "".join('<span%s>%s</span>'
                    % (' style="%s"' % KIND_CSS[k] if k else "", n)
                    for n, k in KINDS)
    ways = "".join("<span>%s</span>" % w for w in
                   ("Action Button", "Control Center",
                    "Back Tap", "Siri and Shortcuts"))
    qr = "".join(
        '<div class="card"><img src="%s" alt="%s"><b>%s</b><u>%s</u></div>'
        % (_uri(cid), alt, alt, shown)
        for cid, alt, shown in
        [("promo-qr-app", "App Store", "apps.apple.com/app/id6759501517"),
         ("promo-qr-site", "Website", "snapaction.ai")])
    note = " ".join(
        "<code>%s</code> is %s, %s, against the app's <code>%s</code> at %s."
        % (n, ok, hexa, app, apphex) for n, ok, hexa, app, apphex in SITE_VS_APP)
    return page(
        NAME + " - the product",
        '<div class="pr">'
        '<div class="col c1">'
        '<div class="hd"><img src="%s" alt="SnapAction">'
        '<div><h1>SnapAction</h1><p>Screenshot AI</p>'
        '<em>ReScience Lab Inc. &middot; Productivity</em></div></div>'
        '<div class="tag">Snap now, act later.<i>Never miss a thing.</i></div>'
        '<p class="lead">You screenshot things so you will not forget them. A '
        'flight at 6:40am. A dentist appointment. A talk that closes '
        'registration Friday. A coupon that expires Sunday. Then the folder '
        'fills up, and you never open it again.</p></div>'
        '<div class="col c2">'
        '<div class="quote">SnapAction <b>reads the time inside the picture</b>. '
        'Then the picture comes back to find you, before that time runs out.</div>'
        '<div class="kinds">%s</div>'
        '<div class="facts">Free &middot; 30 scans a month &middot; iOS 17.0+ '
        '&middot; v1.14.0</div>'
        '<div class="ways"><h2>Scan without opening the app</h2><div>%s</div>'
        '</div></div>'
        '<div class="col c3"><div class="qr">%s</div>'
        '<div class="note"><h2>One measurement, since it is that kind of folder'
        '</h2><p>The marketing site does not share the app\'s palette. %s</p>'
        '</div></div></div>' % (_uri("promo-icon"), kinds, ways, qr, note),
        PROMO_CSS)


# ------------------------------------------------------- reference row ----
# Each capture at its own design size, so a reference sits column-for-column
# under the mockup it was measured from. 06 is the odd one: the Figma render
# covers only x 0-380.5, y 168.75-932, and is placed at exactly that box.
REF_BOX = {"01": ("xl", 0.0, 0.0, 440.0, 956.0),
           "02": ("xl", 0.0, 0.0, 440.0, 956.0),
           "03": ("", 0.0, 0.0, 430.0, 932.0),
           "04": ("", 0.0, 0.0, 430.0, 932.0),
           "05": ("", 0.0, 0.0, 430.0, 932.0),
           "06": ("l", 0.0, 168.75, 380.5, 763.25)}

REF_CSS = """.phone img{position:absolute;display:block}"""


def ref_boards():
    for stem, label, _ in SCREENS:
        n = stem[:2]
        f = REFS_DIR / (n + ".png")
        if not f.exists():
            continue
        cls, x, y, w, h = REF_BOX[n]
        uri = "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
        yield ("ref-" + stem,
               page(NAME + " - reference: " + label,
                    '<div class="phone %s"><img src="%s" alt="%s" '
                    'style="left:%.2fpx;top:%.2fpx;width:%.2fpx;height:%.2fpx">'
                    '</div>' % (cls, uri, label, x, y, w, h),
                    (CSS06 + "\n" if cls == "l" else "") + REF_CSS))


# ----------------------------------------------------------------- main ----
def layout(names):
    rows = [{"title": "The app this replicates, which is ours",
             "files": [{"file": "00a-product", "label": "SnapAction",
                        "w": PROMO_W, "h": PROMO_H}],
             "links": PROMO_LINKS},
            {"title": "Foundations",
             "files": [{"file": "00-design-tokens", "label": "Design tokens"}]
                      + [{"file": n, "label": "Evidence"}
                         for n, _ in evidence_boards()]},
            {"title": "Screens", "numbered": True,
             "files": [{"file": s, "label": l} for s, l, _ in SCREENS]}]
    refs = [{"file": "ref-" + s, "label": l}
            for s, l, _ in SCREENS if "ref-" + s in names]
    if refs:
        rows.append({"title": "Source of truth: the Figma file's captures",
                     "numbered": True, "files": refs})
    return {"name": PAGE_NAME, "rows": rows}


def main():
    cut()
    files = dict([("00a-product", product_board()),
                  ("00-design-tokens", token_board())]
                 + list(evidence_boards())
                 + [(s, fn()) for s, _, fn in SCREENS]
                 + list(ref_boards()))
    for stale in OUT.glob("00[b-z]-evidence.html"):   # the page count moves
        if stale.stem not in files:                      # when the evidence does
            stale.unlink()
            print("%-24s %6s" % (stale.name, "stale"))
    for name in sorted(files):
        write(name, files[name])
    (OUT / "layout.json").write_text(json.dumps(layout(files), indent=2) + "\n")
    print("%-24s %6d rows" % ("layout.json", len(layout(files)["rows"])))


if __name__ == "__main__":
    main()
