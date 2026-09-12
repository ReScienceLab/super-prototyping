"""Emit mockups/canvases/dun-web/ from one 1954 x 982 capture.

The feature section of Dun's marketing page: eight pastel cards in a bento
grid, each with a handwritten label, a paragraph, and a piece of the product's
own UI inside it. One landscape artboard, not a phone, so `layout.json` gives
the board its own `w`/`h`.

The capture is 1× -- it is a web page screenshot, not a device one -- so
capture px and design px are the same number and every measurement below goes
straight into the CSS with no scale in between. That is why there is no SCALE
constant here and why `crops.json` boxes are plain page coordinates.

Chrome is CSS: cards, pills, panels, toolbars, type. Three things are not.
Photographs, the three brand marks and the two cursor arrows are cropped out
of the capture at their measured boxes (`crops.json` -> `cut()` -> `assets/art/<id>.png` -> `art()`),
because a crop scores 0 against the reference by construction and a redrawn
one does not. Line icons are inline SVG from `assets/icons/`, authored on
lucide's 24 x 24 grid and placed at the measured ink box grown 2px a side,
which is lucide's own padding.

    python3 mockups/canvases/dun-web/gen.py

Artboards are output. Edit this file, never the HTML.
"""
import base64
import json
import re
from pathlib import Path

OUT = Path(__file__).resolve().parent
REFS_DIR = OUT / "assets" / "refs"          # third-party capture, not committed
ART_DIR = OUT / "assets" / "art"
ICON_DIR = OUT / "assets" / "icons"
CROPS = {k: v for k, v in json.loads((OUT / "crops.json").read_text()).items()
         if not k.startswith("_")}

NAME = "Dun"
PAGE_NAME = "(example) " + NAME + " Web"
P = "d"

# ---------------------------------------------------------------- tokens ----
# (group, name, value, evidence). Phase 2 order: font, then surface -> line ->
# ink -> accent, then radii, type, metrics.
TOKENS = [
 ("Font", "font",
  '-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display",'
  '"Helvetica Neue",Helvetica,Arial,sans-serif',
  "refkit font on &ldquo;Everything&rdquo;: no call (SF Pro Rounded .665, SF Pro .629). "
  "Real face is outside the macOS set; repo platform stack, width ratio in README"),
 ("Font", "font-hand",
  '"SignPainter","Bradley Hand","Brush Script MT",cursive',
  "refkit font on the &ldquo;Workspace&rdquo; label: all candidates weak (Futura .383, "
  "Brush Script .341). SignPainter closest on scratch/labelcmp2.png"),

 ("Surface", "bg",        "#F2F2F2", "flat-fill census of the page ground, 100% flat"),
 ("Surface", "c-ws",      "#D8E2E8", "flat-fill census inside the Workspace card"),
 ("Surface", "c-proj",    "#F9D2B9", "flat-fill census inside the Projects card"),
 ("Surface", "c-team",    "#E1E6C4", "flat-fill census inside the Teams card"),
 ("Surface", "c-docs",    "#F6C8CE", "flat-fill census inside the Docs card"),
 ("Surface", "c-comm",    "#D3ECE8", "flat-fill census inside the Comments card"),
 ("Surface", "c-subt",    "#F9E9B5", "flat-fill census inside the Subtasks card"),
 ("Surface", "c-task",    "#DDDAED", "flat-fill census inside the Tasks card"),
 ("Surface", "c-bulk",    "#ECEFBF", "flat-fill census inside the Bulk actions card"),
 ("Surface", "white",     "#FFFFFF", "flat-fill census inside a Teams pill, 2859 px"),
 ("Surface", "panel-top", "#F5F9FA", "refkit scan col 560, Workspace panel at its top edge"),
 ("Surface", "panel-bot", "#EBF2F2", "refkit scan col 560, same panel at the card&rsquo;s bottom"),
 ("Surface", "chip",      "#F6F6F6",
  "refkit scan row 812, the Tasks row&rsquo;s Research chip; the Docs segmented field "
  "solves #F7F7F7, one level away, so it is the same token and not two"),
 ("Surface", "dark",      "#000000",
  "the Save-doc and Mark-as-done pills are a gradient, not a fill: a plane fit over "
  "each core, evaluated at the gradient line&rsquo;s two ends, gives Mark-as-done "
  "&minus;5.1 &rarr; 78.5 on a 10.7&deg; axis and Save doc &minus;2.1 &rarr; 78.2 on "
  "13.0&deg;. Both dark ends extrapolate below zero, so the ramp starts at black: "
  "starting the gradient line 6% before the box instead closes the last 0.2 levels "
  "of the four gradient-only bands and is not worth a stop"),
 ("Surface", "dark-2",    "#4E4E4E",
  "the same two fits&rsquo; light end, 78.5 and 78.2 of 255. The first pass read "
  "#434343 by averaging the cores instead of fitting the plane, which flattened "
  "the ramp from both directions at once"),
 ("Surface", "box",       "#3A3B38", "mode of a Bulk checkbox core, 40 px"),
 ("Surface", "kbd",       "#2B2B2B", "mode of the Ctrl and Enter key chips on the Bulk toolbar"),
 ("Surface", "tip",       "#444746", "mode of the Dun tooltip core, 357 px"),
 ("Surface", "pill-grey", "#EEEEEE", "mode of the ThisUX tooltip core, 347 px"),
 ("Surface", "plus",      "#E6EAEB", "mode of the add-workspace circle core, 1599 px"),
 ("Surface", "tile-fade", "rgba(255,255,255,.78)",
  "the deepest faded row on Bulk and on Subtasks keeps its tile long after its "
  "ink has gone: Bulk row 3&rsquo;s tile solves .77 and the last Subtasks row&rsquo;s "
  ".78 in green and .77 in blue, against contents at .55 and .38. So the tile "
  "alpha rides on the background and the opacity goes on a wrapper inside it"),
 ("Surface", "ghost",     "rgba(255,255,255,.42)",
  "the stacked card behind the Tasks row reads #EBEAF3 over --x-c-task "
  "(#DDDAED): alpha .41 on red and .43 on green. Blue has 18 levels of "
  "headroom against red&rsquo;s 34 and solves .33, which is the noise floor, "
  "not a third colour"),

 ("Line", "ring",  "rgba(255,255,255,.75)",
  "1-2px near-white rim just outside every card fill (#F9FEFF/#FFFFFF); the ground "
  "returns to #F2F2F2 at once, so there is no dark drop shadow to solve"),
 ("Line", "hairline", "#ECECEC", "refkit scan row 527, the toolbar button outline"),
 ("Line", "tree",     "#E8D7A4",
  "row scan at y614: the subtask connector is 1px wide and a tint of --x-c-subt, not a grey; a #D6D6D6 mask finds the DUN-NN text instead of the tree"),

 ("Ink", "i-ws",   "#1F4256", "ink core, darkest 2%, Workspace label and body (they match)"),
 ("Ink", "i-proj", "#724324", "ink core, Projects label and body"),
 ("Ink", "i-team", "#203E14", "ink core, Teams label and body"),
 ("Ink", "i-docs", "#5A2D4F", "ink core, Docs label and body"),
 ("Ink", "i-comm", "#215C5C", "ink core, Comments label and body"),
 ("Ink", "i-subt", "#51430D", "ink core, Subtasks label and body"),
 ("Ink", "i-task", "#5C476A", "ink core, Tasks label and body"),
 ("Ink", "i-bulk", "#727358", "ink core, Bulk label and lines 1-2; line 3 is the same ink at --x-o-text"),
 ("Ink", "ink",    "#050505", "ink core of a row title (Develop MVP, Competitor Analysis Research)"),
 ("Ink", "ink-2",  "#656765", "ink core of the commenter name and the Research chip label"),
 ("Ink", "ink-3",  "#B2B2B2", "ink core of a DUN-NN row id, two cards"),
 ("Ink", "ink-4",  "#D1D1D1", "ink core of the 2h timestamp"),
 ("Ink", "ink-dim","#9BA0A0",
  "ink core of the ThisUX (#9DA09F) and Fli.so (#A0A5A5) tooltip labels and of the "
  "add-workspace plus glyph (#919596, only 19 px of ink)"),
 ("Ink", "ink-inv","#FFFFFF", "ink core on the dark pills and the cursor labels"),
 ("Ink", "doc-ink","#2A2A2A", "ink core of the doc title, Product Requirement Doc"),
 ("Ink", "doc-head","#343434","ink core of a doc section heading"),
 ("Ink", "doc-body","#777876","ink core of a doc paragraph"),

 ("Accent", "blue",    "#3B82F6", "1.5px stroke; darkest px #488ED6, nearest Tailwind step to its hue"),
 ("Accent", "amber",   "#FBBF24", "filled half-circle, darkest px #FFBF28 = Tailwind amber-400"),
 ("Accent", "orange",  "#F59E0B", "1.5px stroke, terminal icon; darkest px #CB9744"),
 ("Accent", "fuchsia", "#D946EF", "1.5px stroke, megaphone; darkest px #C435B0"),
 ("Accent", "green",   "#22C55E", "1.5px stroke, briefcase; darkest px #46AD66"),
 ("Accent", "red",     "#F87171", "1.5px stroke, warning triangle and the Research dot; darkest px #D4796C"),
 ("Accent", "folder",  "#FFDE77", "mode of the Projects folder core, 8842 px"),
 ("Accent", "cur-blue","#3092FE", "mode of the James cursor core, 429 px"),
 ("Accent", "cur-green","#1BB944","mode of the You cursor core, 334 px"),

 ("Radius", "r-card",  "36px",
  "circle fit to where the fill starts on each row of the Tasks card&rsquo;s "
  "bottom-left corner: r 39.5 at rms 0.6, against 30.0 for my own 28px corner, "
  "so the fit runs 2 levels of threshold wide and the reference is 37.5. A sweep "
  "of the 32 card corners bottoms out at 36, and the same sweep confirms r-panel, "
  "r-tile and r-cur where they already stood. A bbox on one corner crop read 28, "
  "which is the corner&rsquo;s chord, not its radius"),
 ("Radius", "r-panel", "24px",  "the Workspace and Docs panels&rsquo; one visible corner"),
 ("Radius", "r-tip",   "14px",  "the Dun tooltip corner, and the Docs toolbar&rsquo;s"),
 ("Radius", "r-tile",  "20px",  "the Comments tile corner"),
 ("Radius", "r-row",   "18px",  "solved on a Subtasks row, the Tasks pill and the Bulk toolbar; "
  "the Tasks pill is 55px tall, so 18 is a real radius and not h/2"),
 ("Radius", "r-box",   "8px",   "a Bulk checkbox and a toolbar button corner"),
 ("Radius", "r-chip",  "8px",   "the Research chip corner"),
 ("Radius", "r-cur",   "16px",  "the James and You label pills, 46 and 47px tall,\n  so 16 is a real radius and not a full pill"),
 ("Radius", "r-pill",  "999px", "solved &ge; h/2 on the four Teams pills, so they are full pills"),

 # Sizes are solved from the measured **cap height** at SF Pro's .714 cap ratio,
 # then cross-checked against the string's measured ink width. Where the two
 # disagree the cap height wins, because the stand-in is not the real face:
 # SF Pro sets the same cap 4-19% wide here (see README). A width that then
 # overruns a measured container widens the container, never the type.
 ("Type", "t-label",  "italic 700 25px/25px var(--x-font-hand)",
  "ink top is card + 31 on all eight cards. Size is calibrated, not solved: "
  "SignPainter is a substitution, so its 21px ink was measured against all eight "
  "reference labels (81/64/44/39/79/69/41/96 px wide) and each asks for 23.7-26.4"),
 ("Type", "t-body",   "400 18px/28px var(--x-font)",
  "body cap 13px &rarr; 18.2; line 1 ink 402px wide on Workspace &rarr; 17-18px. "
  "Line 1 ink top is card + 65 and the pitch is 28 on all eight cards"),
 ("Type", "t-pill",   "400 19px/24px var(--x-font)",
  "&ldquo;Engineering&rdquo; cap 14px &rarr; 19.6; ink 95px wide &rarr; 18px"),
 ("Type", "t-row",    "600 16px/20px var(--x-font)",
  "&ldquo;Competitor Analysis Research&rdquo; cap 12px &rarr; 16.8; ink 212px wide "
  "&rarr; 14px. The widest disagreement on the board: SF Pro Semibold sets it +14%"),
 ("Type", "t-row-id", "400 16px/20px var(--x-font)",
  "&ldquo;DUN-20&rdquo; cap 12px &rarr; 16.8; ink 58px wide &rarr; 15px"),
 ("Type", "t-chip",   "400 13px/16px var(--x-font)",
  "&ldquo;Research&rdquo; cap 10px &rarr; 14; ink 55px wide &rarr; 12-13px"),
 ("Type", "t-btn",    "600 16px/20px var(--x-font)",
  "&ldquo;3 Selected&rdquo; cap 12px &rarr; 16.8, ink 75px &rarr; 14px; "
  "&ldquo;Mark as done&rdquo; ink 121px &rarr; 18px. White-on-dark ink measures "
  "dilated and dark-on-white eroded, so the two straddle 16"),
 ("Type", "t-btn-s",  "600 13px/17px var(--x-font)",
  "&ldquo;Save doc&rdquo; cap 10px &rarr; 14, ink 57px &rarr; 12px. The Docs "
  "toolbar is a smaller instance of the Bulk one (252 &times; 51 vs 528 &times; 56)"),
 ("Type", "t-kbd",    "500 11px/14px var(--x-font)",
  "&ldquo;Ctrl&rdquo; ink is 18 &times; 8 on the Docs plate and 17 &times; 9 on the "
  "Bulk one &mdash; the same size within a pixel, so one token, not two"),
 ("Type", "t-tip",    "600 21px/26px var(--x-font)",
  "cap 16/16/15px and ink 38/72/48px wide on Dun / ThisUX / Fli.so; 21px satisfies "
  "both on all three, the cleanest agreement on the board"),
 ("Type", "t-cursor", "600 18px/22px var(--x-font)",
  "&ldquo;James&rdquo; cap 14px &rarr; 19.6, ink 58px &rarr; 18px; &ldquo;You&rdquo; "
  "cap 13px &rarr; 18.2"),
 ("Type", "t-doc-t",  "500 18px/22px var(--x-font)",
  "&ldquo;Product Requirement Doc&rdquo; ink is 201 &times; 18, and cap + descender "
  "is .9386em, so 18px. Weight from ink mass: the reference carries 1.125&times; "
  "this string at 15px/700, where the same coverage sum on type that already "
  "matches runs 1.00-1.23, which puts it near 500 rather than 700"),
 ("Type", "t-doc-h",  "500 11px/14px var(--x-font)",
  "&ldquo;Overview&rdquo; ink 50px and &ldquo;Description&rdquo; 60px, both 11px; "
  "700 sets Description 3px over and carries 1.1&times; the reference's ink mass"),
 ("Type", "t-doc-b",  "400 8px/11px var(--x-font)",
  "the first doc paragraph is 222px of ink &rarr; 8px, and 8px ascender-to-descender "
  "&rarr; 8px; the measured pitch inside a paragraph is 11"),
 ("Type", "t-comm-n", "600 13px/16px var(--x-font)",
  "&ldquo;Damia&rdquo; cap 10px &rarr; 14, ink 34px &rarr; 10px; 13 splits them"),
 ("Type", "t-comm-b", "400 12px/16px var(--x-font)",
  "&ldquo;The font size feels too small. Maybe we&rdquo; cap 9px &rarr; 12.6, ink "
  "220px &rarr; 11-12px; the measured line pitch is 16"),

 ("Metrics", "w",        "1954px", "the capture&rsquo;s own width; the board is the section, 1x"),
 ("Metrics", "h",         "982px", "the capture&rsquo;s own height"),
 ("Metrics", "pad",        "27px", "refkit bands: body ink at card left + 27 on all eight cards"),
 ("Metrics", "label-top",  "31px", "refkit bands: label ink top, card + 30 to + 33"),
 ("Metrics", "body-top",   "65px", "refkit bands: body line 1 ink top, card + 65 to + 67"),
 ("Metrics", "gap",        "21px", "column gap in band 1: 595&rarr;616, 1136&rarr;1157, 1497&rarr;1518"),
 ("Metrics", "row-pitch",  "85px", "refkit bands pitch on the five Subtasks rows"),
 ("Metrics", "bulk-pitch", "66px", "refkit bands pitch on the four Bulk actions rows"),
 ("Metrics", "o-text",     ".82",
  "Bulk&rsquo;s third body line reads #878A6B where lines 1-2 read #727358: the same "
  "ink at .82 over #ECEFBF solves 136, the measured 135"),
 ("Metrics", "o-bulk-2",   ".94",
  "both row lists fade toward the bottom of their card, and a row&rsquo;s own "
  "opacity comes off the contrast between its title ink and the tile right above "
  "that ink, divided by row 1&rsquo;s: a ratio that cancels the right-edge fade, "
  "which a fill sample does not. Bulk row 2 reads .935 on all three channels"),
 ("Metrics", "o-bulk-3",   ".55",
  "Bulk row 3, .544/.540/.559. Its checkbox solves .57 instead, because it sits "
  "3px above the toolbar inside the white ringing along that edge"),
 ("Metrics", "o-bulk-4",   ".04",
  "Bulk row 4, .040/.037/.040, and its tile is 2 levels off the card fill in "
  "blue and level with it in red and green"),
 ("Metrics", "rot-pill",  ".56deg",
  "the Tasks tile is the one rotated box on the board: its top edge runs "
  "774.70 at x 160 to 779.55 at x 700 and its bottom 831.53 to 836.33, two "
  "independent fits on +0.0097 rad. Every other tile, panel and toolbar here "
  "is flat to a third of a pixel"),
 ("Metrics", "rot-ghost", "-1.04deg",
  "the stack behind it turns the other way: its one visible edge is 859.25 at "
  "x 200 and 850.88 at x 660, &minus;0.0182 rad"),
 ("Metrics", "o-subt-4",   ".93",
  "Subtasks row 4, .928 off its row id at x 1684. Its title reads .839 instead, "
  "and the difference is the fade: the titles on rows 3 and 4 are indented to "
  "x 1761 where the row ids and row 1 are not, and a ratio only cancels the "
  "fade where both windows sit at the same x. Row 3 reads .99, so it is not "
  "faded at all"),
 ("Metrics", "o-subt-5",   ".38",
  "the last Subtasks row, .381/.389/.416 off its id and .33 off its title. The "
  "two cards do not share one ramp: this row is 56px off its card&rsquo;s bottom "
  "and Bulk&rsquo;s fourth is 46, and Bulk&rsquo;s has all but gone"),
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
def cut():
    """Refresh assets/art/ from assets/refs/ at the boxes in crops.json."""
    if not REFS_DIR.exists():
        return
    from PIL import Image                                     # noqa: local dep
    ART_DIR.mkdir(parents=True, exist_ok=True)
    src, n = {}, 0
    for cid, (ref, x0, y0, x1, y1) in CROPS.items():
        f = REFS_DIR / (ref + ".png")
        if not f.exists():
            continue
        if ref not in src:
            src[ref] = Image.open(f).convert("RGB")
        src[ref].crop((x0, y0, x1, y1)).save(ART_DIR / (cid + ".png"), optimize=True)
        n += 1
    print("%-24s %6d crops" % ("assets/art/", n))


def app_icon():
    """icon.png, the sticker the welcome card wears: the Dun mark, which the
    capture holds at 60px and nowhere larger. The crop is the mark's own bbox
    -- the disc spans x 0..59 across its middle rows and 21..38 at the top, so
    it is a circle of r 30 at (29.5, 29.5) -- so the alpha is that circle
    scaled to 128, supersampled 4x, and the mark itself is a 4.27x LANCZOS
    upscale. It is soft at 256 and there is no sharper source; the alternative
    was redrawing the loop, which would make the sticker the one thing in this
    folder that is not the reference's pixels. Keeps the committed file when
    Pillow is missing.
    """
    if not (ART_DIR / "logo-dun.png").exists():
        return
    try:
        from PIL import Image, PngImagePlugin                 # noqa: local dep
        import numpy as np
    except ImportError:
        print("icon.png kept: Pillow not installed")
        return
    N, ss = 256, 4
    yy, xx = np.mgrid[0:N * ss, 0:N * ss] + .5
    disc = ((xx - N * ss / 2) ** 2 + (yy - N * ss / 2) ** 2 <= (N * ss / 2) ** 2)
    mask = disc.reshape(N, ss, N, ss).mean((1, 3))
    im = Image.open(ART_DIR / "logo-dun.png").convert("RGB").resize((N, N), Image.LANCZOS)
    im.putalpha(Image.fromarray(np.round(mask * 255).astype(np.uint8)))
    # Every icon.png in mockups/canvases states its provenance in a PNG
    # Source chunk; this one's is a crop of the capture rather than store art.
    meta = PngImagePlugin.PngInfo()
    meta.add_text("Source", "assets/art/logo-dun.png, crops.json logo-dun "
                            "(page 325,233 60 x 60), LANCZOS to 256")
    im.save(OUT / "icon.png", pnginfo=meta)
    print("%-24s %6s" % ("icon.png", "%dx%d" % im.size))


def _uri(cid):
    f = ART_DIR / (cid + ".png")
    return ("data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
            if f.exists() else "")


def art(cid, ox, oy, extra=""):
    """One <img>, placed at the box it was measured from, relative to the card
    it belongs to: every card is a positioned box at its own page offset
    (ox, oy), so the crop's page box minus that offset is where it goes."""
    _, x0, y0, x1, y1 = CROPS[cid]
    return ('<img class="a" alt="%s" src="%s" style="left:%gpx;top:%gpx;'
            'width:%gpx;height:%gpx%s">'
            % (cid, _uri(cid), x0 - ox, y0 - oy, x1 - x0, y1 - y0, extra))


# Every icon's ink box on its own 24 x 24 grid, measured by rendering the whole
# set at 10x (scratch/icongrid.html) and reading each cell's ink. Lucide's
# nominal 2..22 inset is not what a stroked path covers -- several of these
# reach 1..23, and the ellipsis covers 18 x 4 -- so the viewBox is set to the
# measured box and the span to the measured px box. Scale is then 1:1 on both
# axes with nothing to converge. The default xMidYMid meet binds one axis only,
# which is how a 16 x 4 ellipsis renders at a quarter of its size and a size
# loop never notices.
GRID_INK = {
 "archive-check":     (1, 2, 22, 20),
 "briefcase":         (1, 1, 22, 21),
 "check":             (3, 5, 18, 13),
 "circle-check":      (1, 1, 22, 22),
 "circle-empty":      (1, 1, 22, 22),
 "circle-half":       (0, 0, 24, 24),
 "corner-down-left":  (3, 3, 18, 18),
 "ellipsis":          (3, 10, 18, 4),
 "eye":               (1, 3.5, 22, 17),
 "megaphone":         (2, 2.5, 19.5, 19.3),
 "pencil":            (1, 0, 22.1, 23),
 "plus":              (4, 4, 16, 16),
 "square-pen":        (2, 0.9, 21.1, 21.1),
 "square-terminal":   (2, 2, 20, 20),
 "trash":             (2, 1, 20, 22),
 "triangle-alert":    (1, 2, 22, 20),
 "x":                 (5, 5, 14, 14),
}


def icon(name, x, y, w, colour="currentColor", h=None):
    """Inline assets/icons/<name>.svg at a measured ink box, in card
    coordinates. (x, y, w, h) is the ink, not the 24-grid."""
    svg = (ICON_DIR / (name + ".svg")).read_text().strip().replace("\n", "")
    return (svg
            .replace('viewBox="0 0 24 24"',
                     'viewBox="%g %g %g %g"' % GRID_INK[name], 1)
            .replace("<svg ", '<svg class="i" preserveAspectRatio="none" '
                     'style="left:%gpx;top:%gpx;width:%gpx;height:%gpx;color:%s" '
                     % (x, y, w, h if h is not None else w, colour), 1))


# ----------------------------------------------------------------- emit ----
# Every board in this folder *is* its background: the token sheet, the evidence
# sheet and the section itself all paint edge to edge, so body keeps a fill
# here where a phone board would give it none.
BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--x-bg);font-family:var(--x-font);
  -webkit-font-smoothing:antialiased;overflow:hidden}"""


def page(title, body, extra_css=""):
    html = ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
            '<title>%s</title>\n<style>\n%s\n\n%s\n%s</style>\n</head>\n<body>\n%s\n</body>\n</html>\n'
            % (title, TOKENS_CSS, BASE, extra_css, body))
    return html.replace("--x-", "--%s-" % P)


def write(name, html):
    (OUT / (name + ".html")).write_text(html)
    print("%-24s %6d bytes" % (name, len(html)))


# --------------------------------------------------- foundations boards ----
SHEET = """body{color:var(--x-ink)}
.sheet{width:478px;height:980px;padding:20px;overflow:hidden}
h1{font:600 17px/22px var(--x-font);margin-bottom:2px}
header p{font:400 11px/15px var(--x-font);color:var(--x-ink-2);margin-bottom:14px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--x-ink-2);margin:12px 0 5px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.sw .chip{height:22px;border-radius:6px;border:1px solid var(--x-hairline)}
.sw b{display:block;margin-top:3px;font:600 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;
  color:var(--x-ink-2);font-style:normal;word-break:break-all}
.rad{display:flex;flex-wrap:wrap;gap:9px}
.rb{flex:none;width:44px;height:26px;background:var(--x-c-ws);
  border:1px solid var(--x-hairline)}
.rad em{display:block;margin-top:2px;font:400 8.5px/11px var(--x-font);
  color:var(--x-ink-2);font-style:normal;text-align:center}
.tr{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  padding-bottom:2px;border-bottom:1px solid var(--x-hairline)}
.tr span{white-space:nowrap;overflow:hidden}
.tr em{font:400 8px/11px ui-monospace,Menlo,monospace;color:var(--x-ink-2);
  font-style:normal;white-space:nowrap;flex:none}
.met{font:400 9px/13px ui-monospace,Menlo,monospace;color:var(--x-ink-2)}
table.ev{width:100%;border-collapse:collapse}
table.ev td{vertical-align:top;padding:2.5px 6px 2.5px 0;
  border-bottom:1px solid var(--x-hairline);font:400 8.5px/11px var(--x-font)}
td.t,td.v{font-family:ui-monospace,Menlo,monospace}
td.t{color:var(--x-i-ws);white-space:nowrap}
td.v{color:var(--x-ink-2);max-width:132px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
td.e{color:var(--x-doc-body)}"""


def _of(group):
    return [t for t in TOKENS if t[0] == group]


def token_board():
    swatches = "".join(
        '<div class="sw"><div class="chip" style="background:var(--x-%s)"></div>'
        '<b>--x-%s</b><i>%s</i></div>' % (n, n, v)
        for g in ("Surface", "Line", "Ink", "Accent") for _, n, v, _ in _of(g))
    radii = "".join(
        '<div><div class="rb" style="border-radius:%s"></div><em>%s</em></div>' % (v, v)
        for _, n, v, _ in _of("Radius"))
    return page(NAME + " - Design Tokens",
                '<div class="sheet"><header><h1>%s &mdash; web feature section</h1>'
                '<p>Measured off one 1954 &times; 982 capture at 1&times;, so every '
                'number here is also a design px. The faces and the geometry are on '
                'the next board, the evidence for every value on the ones after '
                'it.</p></header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<h2>Radius</h2><div class="rad">%s</div></div>'
                % (NAME, swatches, radii), SHEET)


# 51 swatches and 16 specimens do not fit one 980px sheet: the two together
# overflow it by 573px, which the iframe would have clipped in silence.
def type_board():
    type_ = "".join(
        '<div class="tr"><span style="font:var(--x-%s)">Everything starts</span>'
        '<em>--x-%s &middot; %s</em></div>' % (n, n, v.split(" var")[0])
        for _, n, v, _ in _of("Type"))
    met = "<br>".join("--x-%s: %s" % (n, v) for _, n, v, _ in _of("Metrics"))
    return page(NAME + " - Type and metrics",
                '<div class="sheet"><header><h1>Type and metrics</h1>'
                '<p>One composite <code>font:</code> per role. The hand face is a '
                'substitution and sets narrower than the reference&rsquo;s, so its '
                'size is the one fitted by rendering rather than read off the '
                'capture.</p></header>'
                '<h2>Type</h2>%s'
                '<h2>Metrics</h2><div class="met">%s</div></div>'
                % (type_, met), SHEET)


# An evidence page is filled to a height, not to a row count. This folder's
# prose runs from 20 to 300 characters, so a fixed 40 rows a board overflowed
# two boards by 204 and 270px while leaving the third half empty. The evidence
# column is 222px wide, which holds about 52 characters of 8.5px SF; a row is
# 11px a line plus 6 of padding and rule. The sheet leaves 900px of table under
# its header and the split fills 880 of it, because the estimate rounds a row
# that wraps one word past the line down rather than up.
EV_H, EV_CH = 880, 52


def _rendered_len(s):
    """Characters as the browser draws them: `&rsquo;` is one glyph, not seven."""
    return len(re.sub(r"&[#0-9a-zA-Z]+;", "x", s))


def evidence_boards():
    """The evidence table, split across as many boards as it needs. It is the
    deliverable of Phase 1: trim the board count, never the rows."""
    rows = [(t, 6 + 11 * -(-_rendered_len(t[3]) // EV_CH)) for t in TOKENS]
    total = sum(h for _, h in rows)
    n = -(-total // EV_H)                  # boards the table needs...
    pages, used = [[]], 0
    for t, h in rows:
        if used + h > total / n and len(pages) < n:   # ...filled evenly, so the
            pages.append([])                          # last one is not a stub
            used = 0
        pages[-1].append(t)
        used += h
    for i, chunk in enumerate(pages):
        rows = "".join(
            '<tr><td class="t">--x-%s</td><td class="v">%s</td><td class="e">%s</td></tr>'
            % (n, v, e) for _, n, v, e in chunk)
        of = " %d/%d" % (i + 1, len(pages)) if len(pages) > 1 else ""
        yield page(NAME + " - Evidence" + of,
                   '<div class="sheet"><header><h1>Evidence%s</h1>'
                   '<p>One row per token. A token with no evidence is a guess. '
                   'The replayable half is probes.json.</p>'
                   '</header><table class="ev">%s</table></div>' % (of, rows), SHEET)


def foundation_boards():
    """(file, html) for the Foundations row, lettered in order after 00."""
    boards = [("design-tokens", token_board()), ("type", type_board())]
    boards += [("evidence", html) for html in evidence_boards()]
    return [("00%s-%s" % ("bcdefgh"[i - 1] if i else "", slug), html)
            for i, (slug, html) in enumerate(boards)]


# ----------------------------------------------------- the feature section ----
# Text is positioned by its measured *ink top*, because that is what a capture
# can be measured for: a line box's top is invisible. SF Pro's ascent is
# .9552em and its descent .2246em, so the content box is 1.1798em centred in
# the line box, and the cap top sits .714em below the ascent line. cap_top()
# turns a token into that offset once, and tx() subtracts it.
ASC, DESC, CAP = 0.9552, 0.2246, 0.714
_VAL = {n: v for _, n, v, _ in TOKENS}

# The hand face is a substitution, so its own ascent and cap ratio are not SF
# Pro's and cap_top() cannot place it. This is the residual measured in Phase 4
# against the eight labels' ink tops: the reference sets its caps 30-33px below
# each card's top depending on the letter, SignPainter sets the same eight at
# 29-30, and +3 is the shift with the smallest total error. It leaves the two
# round caps -- Docs' D and Comments' C -- 2-3px low, which is the face rather
# than the placement and cannot be fixed by moving the line.
LABEL_DY = 3.0


def cap_top(tok):
    fs, lh = (float(n[:-2]) for n in
              _VAL[tok].split(" var")[0].split()[-1].split("/"))
    return (lh - (ASC + DESC) * fs) / 2 + (ASC - CAP) * fs


def tx(tok, x, y, text, colour=None, extra=""):
    """A line (or a <br>-joined block) whose first line's cap top lands on y."""
    return ('<div class="t" style="left:%gpx;top:%.2fpx;font:var(--x-%s)%s%s">%s</div>'
            % (x, y - cap_top(tok), tok,
               ";color:var(--x-%s)" % colour if colour else "", extra, text))


def box(x, y, w, h, css=""):
    return ('<div class="b" style="left:%gpx;top:%gpx;width:%gpx;height:%gpx%s">'
            % (x, y, w, h, css))


def tile(x, y, w, css=""):
    """One 55px white row tile, left open for its contents. Every row on
    Subtasks, Bulk and Tasks is one of these."""
    return box(x, y, w, 55, css).replace('class="b"', 'class="b tile"')


GRID = """.board{position:relative;width:var(--x-w);height:var(--x-h);overflow:hidden}
.c{position:absolute;overflow:hidden;border-radius:var(--x-r-card);
  box-shadow:0 0 0 1.5px var(--x-ring)}
.b,.t,.a,.i{position:absolute}
/* Every line's break is a measured fact, so <br> is the only one allowed: the
   reference runs its doc lines straight off the panel and clips them. */
.t{white-space:pre}
.a,.i{display:block}
.ctr{display:flex;align-items:center;justify-content:center}
.tile{background:var(--x-white);border-radius:var(--x-r-row);height:55px}
.plate{background:var(--x-kbd);border-radius:6px;color:var(--x-ink-inv);
  font:var(--x-t-kbd)}
.obtn{background:var(--x-white);border:1px solid var(--x-hairline);border-radius:10px}"""

# key, page x/y/w/h, fill token, ink token, label, label ink top, body ink top,
# body lines. Every card shares one rhythm -- label ink at card + 31, body line
# 1 at card + 65, pitch 28, left pad 27 -- except Projects, whose text is
# bottom-aligned under its illustration.
CARDS = [
 ("ws", 75, 24, 520, 582, "c-ws", "i-ws", "Workspace", 31, 65,
  ("Everything starts with a clean workspace. Nothing",
   "cluttered, nothing distracting.")),
 ("proj", 616, 24, 521, 281, "c-proj", "i-proj", "Projects", 143, 177,
  ("Create projects to keep things", "organized. Big or small, work",
   "how you like")),
 ("team", 616, 326, 521, 280, "c-team", "i-team", "Teams", 31, 65,
  ("Your team&rsquo;s in too. Everyone has their own space, work",
   "together &amp; stay in sync")),
 ("docs", 1157, 24, 340, 582, "c-docs", "i-docs", "Docs", 31, 65,
  ("Docs, right next to your tasks. So", "no hopping between apps")),
 ("comm", 1518, 24, 340, 283, "c-comm", "i-comm", "Comments", 31, 65,
  ("Need to discuss? Just comment on", "a task, it all stay in one place")),
 ("subt", 1518, 328, 340, 596, "c-subt", "i-subt", "Subtasks", 31, 65,
  ("Big task? Break it down and tackle", "bit by bit with subtasks")),
 ("task", 75, 634, 700, 290, "c-task", "i-task", "Tasks", 31, 65,
  ("Adding tasks is simple, instant and feels as quick as writing on a sticky note",)),
 ("bulk", 797, 634, 700, 290, "c-bulk", "i-bulk", "Bulk actions", 31, 65,
  ("And when there&rsquo;s a lot to handle at once, you",
   "can select tasks and apply changes in bulk,",
   "all at once")),
]


def workspace():
    """Three brand marks stacked on a panel, each with its hover tooltip, and
    two collaborator cursors. The panel is declared 340 x 460 inside a 520 x
    582 card so its right and bottom corners fall outside and come out square,
    which is what the capture shows."""
    o = [box(214, 175, 340, 460,
             ";border-radius:var(--x-r-panel);background:linear-gradient(180deg,"
             "var(--x-panel-top) 0,var(--x-panel-bot) 407px)") + "</div>"]
    o += [art(cid, 75, 24) for cid in ("logo-dun", "logo-thisux", "logo-fliso")]
    o.append(box(249, 460, 60, 60,
                 ";border-radius:var(--x-r-pill);background:var(--x-plus)") + "</div>")
    o.append(icon("plus", 263, 475, 31, "var(--x-ink-dim)"))
    # Only the dark tooltip has a pointer. A column profile 6px left of either
    # grey one is a smooth 244 -> 237 antialias ramp with no notch in it; the
    # dark one's is a 7px triangle whose dark rows grow 2, 4, 6, 8, 10, 12, 16.
    o.append(box(331, 230.5, 0, 0,
                 ";border-top:8px solid transparent;border-bottom:8px solid transparent"
                 ";border-right:7px solid var(--x-tip)") + "</div>")
    for x, y, w, h, bg, ink, s in (
            (338, 217, 73, 42, "tip", "ink-inv", "Dun"),
            (338, 301, 101, 42, "pill-grey", "ink-dim", "ThisUX"),
            (338, 384, 81, 41, "pill-grey", "ink-dim", "Fli.so")):
        o.append(box(x, y, w, h, ";border-radius:var(--x-r-tip);background:var(--x-%s)"
                     ";font:var(--x-t-tip);color:var(--x-%s)" % (bg, ink))
                 .replace('class="b"', 'class="b ctr"') + s + "</div>")
    # Neither pill has a white ring. The one bright pixel around each is webp
    # chroma overshoot -- #CEFFFF, whose red is *below* the card fill's -- and a
    # real 2px ring reads #FFFFFF twice over. The arrows are crops for the reason
    # in crops.json, and each is drawn before its pill because the crop box
    # clips the pill's corner.
    for cid, px, py, pw, ph, col, lab in (
            ("cur-james", 32, 222, 89, 46, "cur-blue", "James"),
            ("cur-you", 405, 535, 62, 47, "cur-green", "You")):
        o.append(art(cid, 75, 24))
        o.append(box(px, py, pw, ph, ";border-radius:var(--x-r-cur)"
                     ";background:var(--x-%s);font:var(--x-t-cursor)"
                     ";color:var(--x-ink-inv)" % col)
                 .replace('class="b"', 'class="b ctr"') + lab + "</div>")
    return "".join(o)


# left, top, w, h | icon name, ink x/y/w/h, colour | label box x / ink y, label
# The label x is the text box, not the ink: the reference's four labels start
# their ink at card 152 / 296 / 200 / 361, and SF Pro at 19px carries a 2px left
# side bearing on D, E and M and 1px on S, so the box goes that much earlier.
# Nowhere else on the board does the bearing round to more than a pixel.
TEAM_PILLS = (
 (99, 138, 127, 52, "square-pen", 113, 154, 21, 21, "blue", 150, 157, "Design"),
 (242, 138, 176, 52, "square-terminal", 256, 152, 22, 22, "orange", 294, 158, "Engineering"),
 (147, 205, 152, 52, "megaphone", 161, 221, 21, 18, "fuchsia", 198, 224, "Marketing"),
 (315, 205, 108, 52, "briefcase", 329, 220, 21, 22, "green", 360, 224, "Sales"),
)


def teams():
    o = []
    for x, y, w, h, ic, ix, iy, iw, ih, col, lx, ly, lab in TEAM_PILLS:
        o.append(box(x, y, w, h, ";border-radius:var(--x-r-pill)"
                     ";background:var(--x-white)") + "</div>")
        o.append(icon(ic, ix, iy, iw, "var(--x-%s)" % col, ih))
        o.append(tx("t-pill", lx, ly, lab, "ink"))
    return "".join(o)


# ink top (card px), token, text. The doc runs off the bottom of the card and
# under the toolbar, so the last lines are what is legible and no more: the
# heading between the KPI bullets and the closing paragraph is entirely behind
# the toolbar, and inventing it would be inventing a fact.
DOC = [
 (191, "t-doc-t", "doc-ink", "Product Requirement Doc"),
 (226, "t-doc-h", "doc-head", "Overview"),
 (250, "t-doc-b", "doc-body",
  "A simple todo app to add, manage, and complete daily tasks."),
 (272, "t-doc-h", "doc-head", "Description"),
 (296, "t-doc-b", "doc-body",
  "The app helps people stay organized by letting them quickly jot down tasks,<br>"
  "group them by projects, mark them done, and set reminders."),
 (328, "t-doc-b", "doc-body",
  "It&rsquo;s fast, minimal, and easy to use &mdash; works well solo or with a "
  "small team. Think<br>of it like a digital sticky note with superpowers."),
 (364, "t-doc-h", "doc-head", "Why"),
 (388, "t-doc-b", "doc-body",
  "Most task apps are too heavy or too confusing for regular folks. People just<br>"
  "want to get stuff out of their heads and come back to it when they&rsquo;re ready."),
 (421, "t-doc-b", "doc-body",
  "We&rsquo;re solving this because staying organized shouldn&rsquo;t feel like a job by"),
 (446, "t-doc-h", "doc-head", "KPIs"),
 (551, "t-doc-b", "doc-body",
  "them via Twitter, Product Hunt, and design communities with a simple<br>"
  "promise: &ldquo;Get things done without the fluff.&rdquo;"),
]
BULLETS = ("User adds at least 1 task per day for 7 straight days",
           "At least 40% of tasks marked &ldquo;done&rdquo;",
           "30% users use more than one list/project")


def docs():
    """A product doc scrolled under a floating toolbar. The panel is declared
    past the card's right and bottom edges for the same reason Workspace's is,
    and the text lines are declared at their full length and clipped there --
    which is how the capture reads, mid-sentence at the card edge."""
    o = [box(54, 168, 340, 460, ";border-radius:var(--x-r-panel)"
             ";background:var(--x-white)") + "</div>"]
    o += [tx(tok, 73, y, s, col) for y, tok, col, s in DOC]
    for i, s in enumerate(BULLETS):
        o.append(box(77, 473 + 11 * i, 4, 4,
                     ";border-radius:var(--x-r-pill);background:var(--x-doc-body)")
                 + "</div>")
        o.append(tx("t-doc-b", 86, 470 + 11 * i, s, "doc-body"))
    # The line whose head is behind the toolbar is written as the tail alone,
    # positioned so its ink starts where the capture's does: the toolbar covers
    # the first glyph either way, and the words in front of "nk B2C" are not
    # recoverable from the pixels.
    o.append(tx("t-doc-b", 278, 539, "nk B2C. We&rsquo;ll targ", "doc-body"))
    o.append(box(54, 168, 340, 600, ";background:linear-gradient(180deg,transparent "
                 "268px,var(--x-c-docs) 578px)") + "</div>")
    o.append(box(29, 498, 252, 51, ";border-radius:var(--x-r-tip)"
                 ";background:var(--x-white)") + "</div>")
    o.append(box(37, 506, 72, 34, ";border-radius:10px;background:var(--x-chip)") + "</div>")
    o.append(box(39, 508, 33, 30, ";border-radius:var(--x-r-box)"
                 ";background:var(--x-white)") + "</div>")
    o.append(icon("pencil", 46, 513, 19, "var(--x-ink-2)", 20))
    o.append(icon("eye", 80, 515, 19, "var(--x-ink-2)", 16))
    o.append(box(121, 506, 152, 34, ";border-radius:17px;background:linear-gradient("
                 "12deg,var(--x-dark),var(--x-dark-2))") + "</div>")
    o.append(tx("t-btn-s", 138, 518, "Save doc", "ink-inv"))
    o.append(box(209, 512, 27, 23, "").replace('class="b"', 'class="b ctr plate"')
             + "Ctrl</div>")
    o.append(box(242, 512, 21, 23, "").replace('class="b"', 'class="b plate"') + "</div>")
    o.append(icon("corner-down-left", 249, 520, 9, "var(--x-ink-inv)", 6))
    return "".join(o)


def comments():
    o = [box(26, 156, 286, 82, ";border-radius:var(--x-r-tile)"
             ";background:var(--x-white)") + "</div>",
         art("avatar-damia", 1518, 24, ";border-radius:var(--x-r-pill)"),
         tx("t-comm-n", 70, 174, "Damia", "ink-2"),
         tx("t-comm-n", 286, 175, "2h", "ink-4"),
         tx("t-comm-b", 69, 194,
            "The font size feels too small. Maybe we<br>"
            "could bump it up a bit for readability", "ink")]
    return "".join(o)


# top, left, icon name, icon colour, id, title, contents opacity token, and
# whether the tile under those contents holds --x-tile-fade instead of fading
# with them. The rows are indented by their depth and run off the card's right edge, which is why they
# are declared wider than the card: 37 + 400 is past 340 on every one of them.
SUBT_ROWS = (
 (171, 37, "circle-half", "amber", "DUN-20", "Develop MVP", None, False),
 (258, 79, "circle-check", "blue", "DUN-21", "Setup everything", None, False),
 (343, 120, "circle-check", "blue", "DUN-22", "Setup Database", None, False),
 (427, 120, "circle-check", "blue", "DUN-23", "Create GitHub", "o-subt-4", False),
 (512, 79, "circle-empty", "ink-3", "DUN-24", "Implement Auth", "o-subt-5", True),
)
# x, y0, y1 verticals and y, x0, x1 stubs of the 1px connector tree, measured
# as a tint of the card fill rather than a grey. Vertical A hangs off row 1 and
# feeds rows 2 and 5; vertical B hangs off row 2 and feeds rows 3 and 4.
TREE_V = ((50, 228, 539), (91, 313, 458))
TREE_H = ((285, 50, 76), (539, 50, 76), (374, 91, 117), (458, 91, 117))


def subtasks():
    o = []
    for x, y0, y1 in TREE_V:
        o.append(box(x, y0, 1, y1 - y0, ";background:var(--x-tree)") + "</div>")
    for y, x0, x1 in TREE_H:
        o.append(box(x0, y, x1 - x0, 1, ";background:var(--x-tree)") + "</div>")
    for y, x, ic, col, rid, title, fade, tile_fade in SUBT_ROWS:
        dim = ";opacity:var(--x-%s)" % fade if fade else ""
        o.append((tile(x, y, 400, ";background:var(--x-tile-fade)") + "</div>"
                  + box(x, y, 400, 55, dim) if tile_fade
                  else tile(x, y, 400, dim))
                 + icon(ic, 14, 18, 20, "var(--x-%s)" % col)
                 + tx("t-row-id", 46, 23, rid, "ink-3")
                 + tx("t-row", 123, 22, title, "ink") + "</div>")
    o.append(box(0, 0, 560, 596, ";background:linear-gradient(90deg,transparent 246px,"
                 "var(--x-c-subt) 521px)") + "</div>")
    return "".join(o)


def tasks():
    """One task row with the next peeking out from under it, and the only two
    rotated boxes on the board -- see --x-rot-pill and --x-rot-ghost, which is
    the card's own joke about writing on a sticky note.

    The contents do not turn with the tile. The status glyph's ink top is 794
    at x 143 and the warning triangle's is 798 at x 654, which is the flat
    model at both ends; a rotation about the tile's centre would put them 2.5px
    high and 2.1px low respectively. So the tile is its own box behind an
    unrotated content layer, and the tile's own numbers come off its four
    edges: 126.5 -> 723.5 by 777.2 -> 834.3 around a centre at (425, 805.7),
    which is 597 x 57 rather than the 598 x 55 the rows on the other cards use.
    """
    return "".join([
        tile(81.3, 166.2, 536, ";background:var(--x-ghost)"
             ";transform:rotate(var(--x-rot-ghost))") + "</div>",
        tile(51.5, 143.2, 597, ";height:57px"
             ";transform:rotate(var(--x-rot-pill))") + "</div>",
        box(52, 141, 598, 55, "")
        + icon("circle-half", 15, 19, 19, "var(--x-amber)")
        + tx("t-row-id", 47, 24, "DUN-20", "ink-3")
        + tx("t-row", 123, 24, "Competitor Analysis Research", "ink")
        + box(424, 17, 89, 31, ";border-radius:var(--x-r-chip)"
              ";background:var(--x-chip)") + "</div>"
        + box(433, 30, 5, 5, ";border-radius:var(--x-r-pill)"
              ";background:var(--x-red)") + "</div>"
        + tx("t-chip", 448, 27, "Research", "ink-2")
        + icon("triangle-alert", 528, 23, 21, "var(--x-red)", 20)
        + art("avatar-task", 127, 775, ";border-radius:var(--x-r-pill)")
        + "</div>",
    ])


# top, icon name, icon colour, id, title, contents opacity token, tile-fade
BULK_ROWS = (
 (25, "circle-half", "amber", "DUN-31", "Core features", None, False),
 (91, "circle-check", "blue", "DUN-32", "Create task", "o-bulk-2", False),
 (157, "circle-check", "blue", "DUN-33", "Edit/Delete task", "o-bulk-3", True),
 (223, "circle-empty", "ink-3", "DUN-34", "Change status", "o-bulk-4", False),
)


def bulk():
    """Four rows with their checkboxes ticked and the bulk toolbar over them.
    A checkbox belongs to its row's contents, not to its tile: row 3's solves
    .57 against contents at .55 and a tile at .78, so the checkbox and the row
    go in one opacity wrapper and the tile is painted behind it."""
    o = []
    for y, ic, col, rid, title, fade, tile_fade in BULK_ROWS:
        o.append((tile(483, y, 260, ";background:var(--x-tile-fade)") + "</div>"
                  if tile_fade else "")
                 + box(0, 0, 700, 290, ";opacity:var(--x-%s)" % fade if fade else "")
                 + box(443, y + 17, 23, 23, ";border-radius:var(--x-r-box)"
                       ";background:var(--x-box)")
                 + icon("check", 7, 8, 9, "var(--x-white)", 7) + "</div>"
                 + (box(483, y, 260, 55, "") if tile_fade else tile(483, y, 260))
                 + icon(ic, 14, 18, 20, "var(--x-%s)" % col)
                 + tx("t-row-id", 46, 22, rid, "ink-3")
                 + tx("t-row", 122, 22, title, "ink") + "</div></div>")
    o.append(box(0, 0, 860, 290, ";background:linear-gradient(90deg,transparent 611px,"
                 "var(--x-c-bulk) 826px)") + "</div>")
    o.append(box(31, 200, 528, 56, ";border-radius:var(--x-r-row)"
                 ";background:var(--x-white)") + "</div>")
    o.append(tx("t-btn", 49, 222, "3 Selected", "ink"))
    # Four outlined buttons, not three: the X gets one too, set apart by a 35px
    # gap where the other three sit 9-10px apart. Their glyphs all solve to
    # --x-ink-2 -- the X and the ellipsis reach #646464 in their cores, and the
    # archive and trash only read #8A8A8A because a 1.5px stroke never does.
    for bx, bw, ic, ix, iy, iw, ih in (
            (136, 38, "x", 148, 222, 12, 12),
            (209, 40, "ellipsis", 221, 226, 16, 4),
            (257, 39, "archive-check", 267, 220, 18, 16),
            (304, 39, "trash", 316, 219, 16, 17)):
        o.append(box(bx, 208, bw, 39, "").replace('class="b"', 'class="b obtn"') + "</div>")
        o.append(icon(ic, ix, iy, iw, "var(--x-ink-2)", ih))
    o.append(box(352, 209, 199, 38, ";border-radius:19px;background:linear-gradient("
                 "12deg,var(--x-dark),var(--x-dark-2))") + "</div>")
    o.append(tx("t-btn", 371, 223, "Mark as done", "ink-inv"))
    o.append(box(481, 216, 31, 25, "").replace('class="b"', 'class="b ctr plate"')
             + "Ctrl</div>")
    o.append(box(518, 216, 25, 25, "").replace('class="b"', 'class="b plate"') + "</div>")
    o.append(icon("corner-down-left", 525, 222, 10, "var(--x-ink-inv)", 7))
    return "".join(o)


INNER = {"ws": workspace, "proj": lambda: art("proj-art", 616, 24), "team": teams,
         "docs": docs, "comm": comments, "subt": subtasks, "task": tasks,
         "bulk": bulk}


def section():
    cards = []
    for key, x, y, w, h, fill, ink, label, lt, bt, lines in CARDS:
        body = tx("t-body", 27, bt, "<br>".join(lines)) if key != "bulk" else (
            tx("t-body", 27, bt, "<br>".join(lines[:2]))
            + tx("t-body", 27, bt + 56, lines[2], None, ";opacity:var(--x-o-text)"))
        cards.append(
            '<div class="c" style="left:%gpx;top:%gpx;width:%gpx;height:%gpx;'
            'background:var(--x-%s);color:var(--x-%s)" data-clip-ok>%s%s%s</div>'
            % (x, y, w, h, fill, ink,
               tx("t-label", 27, lt + LABEL_DY, label), body, INNER[key]()))
    return page(NAME + " - Feature section",
                '<div class="board">%s</div>' % "".join(cards), GRID)


# ------------------------------------------------------------- reference ----
def reference():
    """Phase 5: the capture itself, parked as a board so the row under the
    mockup is the source of truth rather than a memory of it. Third-party
    pixels, so this board is regenerated and never committed."""
    f = REFS_DIR / "01.png"
    if not f.exists():
        return None
    uri = "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
    return page(NAME + " - reference 01",
                '<img src="%s" alt="dun.app feature section" '
                'style="display:block;width:var(--x-w);height:var(--x-h)">' % uri,
                "body{background:none}")


# ---------------------------------------------------------------- layout ----
# The welcome card fits its coverBox into one phone case by cover-crop
# (max of the two scales), so a landscape box would come back as a 453px
# slice through the middle of the grid. The box is instead the Comments and
# Subtasks column at the case's own 393:852, which crops nothing.
FOUNDATIONS = foundation_boards()

LAYOUT = {
    "name": PAGE_NAME,
    "order": 40,
    "cover": "01-feature-grid",
    "coverBox": [1480, 24, 415, 900],
    "status": "live",
    "rows": [
        {"title": "Foundations", "files": [name for name, _ in FOUNDATIONS]},
        {"title": "Boards", "numbered": True,
         "files": [{"file": "01-feature-grid", "label": "Feature section",
                    "w": 1954, "h": 982}]},
        {"title": "Source of truth: captures", "numbered": True,
         "files": [{"file": "ref-01-feature-grid", "label": "Feature section",
                    "w": 1954, "h": 982}]},
    ],
}

if __name__ == "__main__":
    cut()
    app_icon()
    for name, html in FOUNDATIONS:
        write(name, html)
    write("01-feature-grid", section())
    ref = reference()
    if ref:
        write("ref-01-feature-grid", ref)
    (OUT / "layout.json").write_text(json.dumps(LAYOUT, indent=2) + "\n")
    print("%-24s %6d rows" % ("layout.json", len(LAYOUT["rows"])))
