"""Emit mockups/canvases/perplexity-ios/ from ten Perplexity iOS captures.

The onboarding flow end to end: the splash, email entry empty and filled, the
"check your email" pane and its two code states, the Pro paywall with and
without its purchase alert, and the home screen with and without the voice
tooltip.

...and four Dynamic Island states: the voice Live Activity and the reasoning
one, each compact and expanded.

The first ten captures are 1180 x 2676 from Mobbin -- a 1179 x 2556 iPhone
screen at @3x with a 120px attribution bar under it. The island four are
881 x 2000, an 881 x 1910 screen under a 90px bar. Two scales, so `scale`
reads it off the capture's name; the frame is this repo's 393 x 852 pt either
way.

    python3 mockups/canvases/perplexity-ios/gen.py

Text is placed by the *ink* top measured off the capture, not by the line box:
`ink()` converts one to the other for a line whose line-height equals its font
size. Every other number in here is design pt read straight off a capture.

Artboards are output. Edit this file, never the HTML.
"""
import base64
import io
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
REFS_DIR = OUT / "assets" / "refs"
ART_DIR = OUT / "assets" / "art"
ICON_DIR = OUT / "assets" / "icons"

NAME = "Perplexity iOS"
PAGE_NAME = "(example) " + NAME
COVER = "07-paywall"
P = "pp"          # token prefix: --pp-bg, --pp-ink, --pp-t-nav

# ---------------------------------------------------------------- tokens ----
# (group, name, value, evidence). Values are written with the placeholder
# prefix --x- throughout this file and rewritten to P on the way out.
TOKENS = [
 ("Font", "font",
  '-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif',
  "refkit font on the 23px screen title is a weak call (SF Pro Rounded .636). The "
  "metrics are neo-grotesk - ascender equal to cap height, x/cap 0.72 - and "
  "Perplexity ships FK Grotesk Neue, which no platform has: substituted"),
 ("Font", "serif",
  '"Bodoni 72","Bodoni MT",Didot,ui-serif,"New York",Georgia,serif',
  "refkit font on the headline: New York .350, Georgia .341, no call. The face sets "
  "27% narrower than Georgia at equal ascender height, so the stack leads with the "
  "two didones that come closest; see the README"),
 ("Font", "mono", 'ui-monospace,Menlo,"SF Mono",monospace',
  "p07 'Save $49.00' is the one monospaced string on the ten screens: its glyphs "
  "start at 231.7, 238.7, 246.0, 253.0, 267.6, 274.6, 282.0, 290.6, 296.3 and 303.6, "
  "a 7.2pt pitch that holds across the space and the point"),

 ("Surface", "bg",      "#FFFDFC", "p02 page ground, col 196 y 420-460, flat"),
 ("Surface", "night",   "#1B181C", "p01 sheet ground under the painting, col 10 y 440-525"),
 ("Surface", "night-2", "#1A191C", "p07 paywall ground, col 196 y 758-770"),
 ("Surface", "card",    "#F6F4F0", "p02 field fill; p06 loading card and p10 weather card read the same"),
 ("Surface", "chip",    "#252527", "p07 chip row 1, row 505 unbroken across all 393"),
 ("Surface", "pill",    "#FFFDFF", "p01 Apple and Google pills, row 550 x 40"),
 ("Surface", "pill-2",  "#302D31", "p01 email and SSO pills, row 665 x 40"),
 ("Surface", "kbd",     "#D3D5DB", "p02 keyboard panel, col 196 y 612-620 between two rows"),
 ("Surface", "key",     "#FFFDFE", "p02 'q' key core, 3.1-36.4 x 569-611"),
 ("Surface", "key-mod", "#ACB1BD", "p02 shift, 123 and continue keys"),
 ("Surface", "search",  "#EAE9E5",
  "p10 search bar fill, row 720 x 60-120; the weather card's icon tile is the same"),
 ("Surface", "ring",    "#ECEAE8", "p10 avatar ring, col 32 y 59.5-60.5"),
 ("Surface", "off",     "#E2E0DF", "p02 Continue fill while the field is empty"),
 ("Surface", "alert",
  "radial-gradient(circle 135px at 50% 50%,#EFECF0 0%,#E6E3E7 40%,#CFCCD0 100%)",
  "p08's alert is iOS glass, but its blur is wide enough that nothing of the hero's "
  "shape survives: the fill reads 239 at the centre, 230 at r 55 and 208 at r 126 "
  "whatever is behind it, so it is traced as the vignette it looks like. The hero's "
  "chroma does survive, as a tilt no radial can hold -- top to bottom the capture falls "
  "4.6 R, 8.9 G, 11.3 B -- and correcting it buys 0.009 on the board, so it is not"),
 ("Surface", "scrim",   "rgba(0,0,0,.355)",
  "p08 against p07: the chip fill goes #252527 to #18181A and the sky #0868BA to "
  "#054379, both a factor of 0.645"),

 ("Surface", "ground",  "#D5D5D5",
  "the field p11-p14 are shot on: 213,213,213 flat across all 393 x 852 outside "
  "the island, on all four, with no wallpaper and no home indicator on it"),
 ("Surface", "island",  "#000000",
  "the Live Activity's own ground: the compact pill's interior on p11 and p13 and "
  "the surround the expanded one draws its panel inside on p12 and p14 all core 0,0,0"),

 ("Line", "border",  "#DBDAD6", "p02 field outline, col 196 ramp 164.0-165.7, darkest step"),
 ("Line", "line",    "#646464", "p07 Yearly card outline, col 377 y 690"),
 ("Line", "line-on", "#56ACBC", "p07 Monthly card outline, the selected one, col 16.9 y 690"),
 ("Line", "line-chip", "#404042",
  "p07 chip edge: col 9 ramps 30, 47, 62, 64, 49, 37 across the top border"),

 ("Ink", "ink",      "#142C2F", "p02 title 'Continue with email', ink core"),
 ("Ink", "ink-2",    "#8B8987", "p02 Continue label while the button is off"),
 ("Ink", "ink-3",    "#969598", "p01 footer links"),
 ("Ink", "ink-4",    "#BDBBB9", "p02 'Email' placeholder"),
 ("Ink", "ink-inv",  "#FFFDFF", "p01 pill label on --x-pill-2; p07 chip label on --x-chip"),
 ("Ink", "ink-max",  "#000000",
  "what the user types, and the two marks on p01's light pills: the darkest 2% of "
  "p03's address, p06's code, both light-pill labels and the Apple mark all average "
  "under 1 of 255, where every string the app draws itself is --x-ink at 18,45,48"),
 ("Ink", "ink-cyan", "#0C3A44", "p07 'Subscribe' on the cyan pill"),
 ("Ink", "idle",     "#8E8C8B", "p10 idle tab glyph core"),
 ("Ink", "globe",    "#4D4F57",
  "p02's globe key is the one keyboard glyph the capture does not draw black: shift, "
  "delete and the emoji face all core under 1,1,7 and it cores at 77,79,87. Painting "
  "it --x-ink costs 37.4 on the glyph box against 24.8 here; the rest of that 24.8 is "
  "blur, and no flat fill takes it below 22.6"),
 ("Ink", "quiet",    "#ACABA8", "p10 serif headline core"),
 ("Ink", "wash",     "#F8F6F5",
  "p10 watermark line: 20/7 levels integrated across a 2.86px stroke on --x-bg"),

 ("Accent", "accent",   "#207F8E", "p03 Continue fill once the address validates"),
 ("Accent", "accent-2", "#2C777F", "p04 'Enter Code Manually' link core"),
 ("Accent", "caret",    "#2E7C86", "p02 caret in the email field"),
 ("Accent", "cyan",     "#21BAD2", "p07 Subscribe pill fill"),
 ("Accent", "cyan-2",   "#48B2C4", "p07 Monthly card ink"),
 ("Accent", "gold",     "#FFD4AA", "p07 'Save $49.00' badge fill"),
 ("Accent", "gold-ink", "#2B1101", "the same badge's label"),
 ("Accent", "blue",     "#017BFF",
  "p05 keyboard 'go' key; p08's alert 'OK' is the same iOS system blue, bluest "
  "pixel (4,123,255), so there is one token and not two"),
 ("Accent", "cyan-3",   "#1DCCE2",
  "p14's progress bar at x 150, clear of the head: (29,204,226) over three rows. "
  "p11's waveform bars and p13's atom core the same, and so does p12's 'active'"),
 ("Accent", "glow",     "#85EDFF",
  "the wash under the right-hand glyph on p11 and p13. Sampled off the glyph it "
  "holds R:G:B 33:64:69 and 39:72:77, which normalise to (122,236,255) and "
  "(129,238,255). Its alpha falls linearly to nothing at r 16.5, fitted by least "
  "squares to the annulus below each glyph, where the pill is otherwise black: "
  "0.41 on p11 and 0.73 on p13, so the boards carry the two alphas and share "
  "the colour"),
 ("Accent", "mic",      "#FF9500",
  "the microphone-in-use dot: p11 cores (255,148,0) and p12 (255,149,1), which is "
  "iOS systemOrange to the level"),
 ("Accent", "danger",   "#F1412B", "p09 unread dot under the Discover tab, 145-151 x 812-818.3"),
 ("Accent", "flag",     "#F44041",
  "p03 spell-check rule under 'mobbin', 100.3-155.3 x 193.7-197.0: R-G peaks 190 "
  "every 12 capture px and troughs at 20, so it is a 4pt dot pitch, not a line"),

 ("Radius", "r-field", "12px",  "p02 field: at its tangent row the fill run is 345 - 2r wide"),
 ("Radius", "r-card",  "13px",  "p07 plan card corner, same solve"),
 ("Radius", "r-badge", "6px",   "p07 'Save $49.00' badge corner"),
 ("Radius", "r-key",   "5px",   "p02 keyboard key corner"),
 ("Radius", "r-chip",  "4px",
  "p07 chip row 2: the fill inset off the left edge runs 1.5, 0.9, 0.5, 0.2, 0 at "
  "0.5, 1.5, 2, 3 and 4pt down from the top, which is r - sqrt(2r.dy - dy2) for "
  "r = 4. The chips are rounded rectangles, not pills"),
 ("Radius", "r-alert", "14px",  "p08 alert corner, the iOS default"),
 ("Radius", "r-pill",  "999px",
  "by construction: p01's four pills, both Continue buttons, the search bar, the "
  "tooltip and Subscribe all solve to r = h/2. The chips do not; see --x-r-chip"),
 ("Radius", "r-island", "43.75px",
  "p12/p14 expanded island corner. Fitted as a circle against the capture's edge "
  "at 0.317pt mean absolute error, which is under a capture pixel: Apple's "
  "superellipse and a plain radius are not separable at this size"),
 ("Radius", "r-phone", "52px",
  "not measured: the captures are framebuffers, square to the pixel at every corner "
  "(p02 (0,0) is #FFFDFC, p07 (0,0) is #0D0C11), so they carry no evidence of the "
  "display's own rounding. 52px is this repo's stand-in for it, and the corner it "
  "cuts is the whole of the 24.93 delta every light board shows in y 0..13.3"),

 ("Type", "t-nav",   "400 24.9px/24.9px var(--x-font)",
  "p02 'Continue with email', ink 85.0-307.0 x 103.0-121.0. Its 'C' is 18.0pt "
  "tall where 24px sets 17.33, hence 24.9; at 400 the string carries the "
  "capture's lit pixels to 0.4%, where 500 carries 21% more and 600 41% more"),
 ("Type", "t-title", "400 20.9px/20.9px var(--x-font)",
  "p04 'Check your email', ink 116.3-276.0, cap 221.7-236.7. The same weight, "
  "and the same 4% size correction: its 'C' is 15.0pt where 20px sets 14.33"),
 ("Type", "t-body",  "400 16.3px/20.6px var(--x-font)",
  "p04 subtitle, two lines with ink tops 262.7 and 283.3, line 1 ink 291.0 wide"),
 ("Type", "t-btn",   "500 18px/18px var(--x-font)",
  "p01 'Continue with email' on the third pill, ink 116.3-276.7: the same string "
  "as --x-t-nav at 72% of its width, so 18px, where 17px at 600 sets it 3.3% "
  "narrow and 1.0pt short. Of the weights 18px admits, 500 halves what the "
  "others cost: the four pill labels mean 20.1 levels against 41.7 at 400 and "
  "34.8 at 600"),
 ("Type", "t-field", "350 17px/17px var(--x-font)", "p03 'samlee.mobbin@gmail.com', ink 41.3-250.3"),
 ("Type", "t-chip",  "400 14.4px/40px var(--x-font)",
  "p07 chip labels set 96% of the same strings at 15px: 'searches' 57.6 not 60.0, "
  "'3x more sources' 106.9 not 111.9"),
 ("Type", "t-plan",  "600 16px/16px var(--x-font)", "p07 'Monthly', ink 33.3-94.3 x 631.0-645.7"),
 ("Type", "t-price", "400 25.2px/25.2px var(--x-font)",
  "p07 'S$ 29.98', ink 33.3-133.0 x 653.0-675.0. 24px sets the digits 9% short "
  "and 4% narrow; 25.2px with -.28 tracking lands both within 1%, and at 400 the "
  "string carries the capture's lit pixels to 1%, where 500 carries 17% more and "
  "700 48%"),
 ("Type", "t-foot",  "400 15px/15px var(--x-font)", "p01 'Privacy policy', ink 70.0-174.3 x 785.3-800.0"),
 ("Type", "t-note",  "400 12px/12px var(--x-font)",
  "p10 '85°F Mostly cloudy', ink 64.7-171.9 x 645.7-657.0; p07 'Billed Monthly' "
  "reads the same"),
 ("Type", "t-key",   "400 24.7px/35.4px var(--x-font)",
  "p02 letter keys: the z, x and c caps are 12.33, 12.33 and 13.0pt tall and "
  "9.33, 9.67 and 10.33 wide, which 22px undershoots by 11% on both axes. The "
  "line-height is 6.9pt under the 42.3pt key because the substitute seats a "
  "centred line that much low"),
 ("Type", "t-key-2", "400 16.2px/39.9px var(--x-font)",
  "p02 '123' and 'space', ink 24.33 and 41.67 wide: 14px sets both 12% short. "
  "The line-height trails the 42.3pt key for the reason --x-t-key does"),
 ("Type", "t-hero",  "400 33px/36px var(--x-serif)",
  "p07 headline. Only luminance separates it from the starfield behind it: above "
  "190 of 255 the two lines are ascender top 186.0, x-height top 194.8, baseline "
  "212.3 and 248.3, so the leading is 36.0 and line 1 sets 42.3-351.0. 33px holds "
  "the set width to 0.4% -- the substitute's cost is vertical, an ascender 12.7% "
  "and an x-height 18.9% short of the capture's, and buying either back costs more "
  "in the band than it returns: 37px retracked to the same width lands the ascender "
  "within 2.5% and raises the headline band from 32.2 to 41.0"),
 ("Type", "t-home",  "400 29.8px/35.3px var(--x-serif)",
  "p10 'Where / knowledge / begins', ascender tops 338.3, 374.0, 408.9, lines 1 "
  "and 2 setting 77.3 and 120.7 wide. Fitted on width, not on height: 32px, which "
  "is what the ascenders read, sets both lines 6.9% wide and the headline band "
  "4.89, where 29.8px lands them within 0.9% and the band at 3.91. The same "
  "substitute, the same trade as --x-t-hero, settled the other way -- here the "
  "three lines are short enough that width is what the eye checks"),
 ("Type", "t-live",  "400 16.7px/16.7px var(--x-font)",
  "p12 'Voice mode is active': its V is 12.04pt cap to baseline, which 16.7px "
  "sets at the 0.7221 cap ratio --x-t-nav measures. p14's 'Reasoning...' is the "
  "smaller line and reuses --x-t-note: its R reads 8.47, where 12px sets 8.67"),
 ("Type", "t-time",  "590 17px/22px var(--x-font)", "iOS status bar clock"),

 ("Metrics", "w",      "393px", "iPhone 15/16 logical width"),
 ("Metrics", "h",      "852px", "iPhone 15/16 logical height"),
 ("Metrics", "status", "54px",  "iOS status bar, Dynamic Island devices"),
 ("Metrics", "gutter", "24px",
  "p02-p06 field and button inset; the paywall uses 16.5 and the home screen 16"),
]


def scale(img):
    """Capture px per design pt, read off the capture's name. p01-p10 are @3x.
    p11-p14 are 881 px across a 393pt screen, so 2.2417, which the height
    agrees with at 1910 / 852 = 2.2418."""
    return 3.0 if int(img[1:]) <= 10 else 881 / 393


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

# ------------------------------------------------------------ phone frame ----
BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--x-font);-webkit-font-smoothing:antialiased;
  display:flex;justify-content:center;padding:24px}"""

PHONE = """.phone{position:relative;flex:none;width:var(--x-w);height:var(--x-h);
  border-radius:var(--x-r-phone);overflow:hidden;background:var(--x-bg);color:var(--x-ink);transform:translateZ(0);
  box-shadow:0 0 0 11px #1D191A,0 0 0 12.5px #3A3735,0 24px 60px rgba(29,25,26,.28)}
.sb{position:absolute;left:0;top:0;width:var(--x-w);height:var(--x-status);z-index:6}
.sb .time{position:absolute;left:0;top:18.2px;width:142.4px;text-align:center;font:var(--x-t-time)}
.sb svg{position:absolute;display:block;fill:currentColor}
/* iOS picks the indicator colour against the wallpaper: measure it per screen */
.home{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);
  width:139px;height:5px;border-radius:3px;background:currentColor;z-index:6}"""

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


def statusbar(colour="var(--x-ink)", time="9:41"):
    """No island: a row projection across y 5-52 between x 120 and 280 finds no
    ink on any of the ten captures, light ground or dark."""
    return ('<div class="sb" style="color:%s"><div class="time">%s</div>%s</div>'
            % (colour, time, SB_ICONS))


def home(colour="var(--x-ink)"):
    return '<div class="home" style="color:%s"></div>' % colour


# ---------------------------------------------------------------- assets ----
CROPS = json.loads((OUT / "crops.json").read_text())   # id -> {"img", "box", "kind"}


def cut(cid):
    """A crop of the capture at its measured box, cached under assets/art/.

    `erase` lists the interface Perplexity draws over the artwork, in page pt,
    so the board can rebuild it live rather than ship it inside a picture.
    [x0, y0, x1, y1] clears the whole box; [x0, y0, x1, y1, sign, T] clears
    only the glyph pixels in it, those lighter (sign 1) or darker (-1) than the
    blurred ground by T levels, grown by 1pt to take the antialiased rim.
    _inpaint then fills both from the pixels around them."""
    c = CROPS[cid]
    S = scale(c["img"])
    dst = ART_DIR / (cid + ".png")
    if not dst.exists():
        import numpy as np
        from PIL import Image, ImageFilter
        ART_DIR.mkdir(parents=True, exist_ok=True)
        src = Image.open(REFS_DIR / (c["img"] + ".png")).convert("RGB")
        box = tuple(round(v * S) for v in c["box"])
        im = src.crop(box)
        if c.get("erase"):
            a = np.asarray(im).astype(float)
            lum = a.mean(2)
            hp = lum - np.asarray(Image.fromarray(lum.astype(np.uint8))
                                  .filter(ImageFilter.GaussianBlur(10))).astype(float)
            m = np.zeros(lum.shape, bool)
            for e in c["erase"]:
                X0, Y0, X1, Y1 = (max(int(round((v - o) * S)), 0)
                                  for v, o in zip(e[:4], c["box"][:2] * 2))
                if len(e) == 4:
                    m[Y0:Y1, X0:X1] = True
                else:
                    g = np.zeros(lum.shape, bool)
                    g[Y0:Y1, X0:X1] = hp[Y0:Y1, X0:X1] * e[4] > e[5]
                    m |= _grow(g, int(S))
            out = _inpaint(a, m)
            im = Image.fromarray(np.clip(np.round(out), 0, 255).astype(np.uint8))
        im.save(dst)
    return _uri(dst)


def _grow(m, n):
    """Dilate a mask by n pixels, 4-connected."""
    import numpy as np
    for _ in range(n):
        p = np.pad(m, 1)
        m = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return m


def _inpaint(a, m, sweeps=60):
    """Harmonic fill of the pixels under m from the ones around them: solved on
    a half-size copy first, then relaxed at this size. It is the smoothest
    surface that meets the boundary, so it carries no texture and invents no
    detail - which is the point, since what it fills sits under live UI."""
    import numpy as np
    if not m.any():
        return a
    H, W = m.shape
    if min(H, W) > 16:
        h, w = (H + 1) // 2, (W + 1) // 2
        k = np.pad(~m, ((0, 2 * h - H), (0, 2 * w - W))).astype(float)
        s = np.pad(a, ((0, 2 * h - H), (0, 2 * w - W), (0, 0))) * k[..., None]
        n = k.reshape(h, 2, w, 2).sum((1, 3))
        low = s.reshape(h, 2, w, 2, 3).sum((1, 3)) / np.maximum(n, 1)[..., None]
        low = _inpaint(low, n == 0, sweeps)
        a = np.where(m[..., None], low.repeat(2, 0).repeat(2, 1)[:H, :W], a)
    elif (~m).any():
        a = np.where(m[..., None], a[~m].mean(0), a)
    for _ in range(sweeps):
        p = np.pad(a, ((1, 1), (1, 1), (0, 0)), mode="edge")
        a = np.where(m[..., None],
                     (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4, a)
    return a


def _uri(path):
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode()


def art(cid, x, y, w, h, extra=""):
    """Place a crop back at the numbers it was measured at."""
    return ('<img alt="%s" src="%s" style="left:%gpx;top:%gpx;width:%gpx;height:%gpx%s">'
            % (cid, cut(cid), x, y, w, h, extra))


def icon(name, x, y, w, h, extra=""):
    """Inline assets/icons/<name>.svg at a measured box. Each file's viewBox is
    its ink box in the capture's own coordinates, so the box it was measured at
    places it, and the canvas inspector names the inline <svg> by its geometry."""
    svg = (ICON_DIR / (name + ".svg")).read_text().strip()
    return svg.replace("<svg ", '<svg preserveAspectRatio="none" style="left:%gpx;top:%gpx;'
                       'width:%gpx;height:%gpx%s" ' % (x, y, w, h, extra), 1)


def icon_at(name, extra=""):
    """icon() at the box its own viewBox records."""
    vb = (ICON_DIR / (name + ".svg")).read_text().split('viewBox="', 1)[1].split('"', 1)[0]
    return icon(name, *(float(v) for v in vb.split()), extra=extra)


# ----------------------------------------------------------------- emit ----
def page(title, body, extra_css=""):
    html = ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
            '<title>%s</title>\n<style>\n%s\n\n%s\n%s\n%s</style>\n</head>\n<body>\n%s\n</body>\n</html>\n'
            % (title, TOKENS_CSS, BASE, PHONE, extra_css, body))
    return html.replace("--x-", "--%s-" % P)


def write(name, html):
    (OUT / (name + ".html")).write_text(html)
    print("%-26s %7d" % (name, len(html)))


# --------------------------------------------------- foundations boards ----
SHEET = """body{padding:0;background:var(--x-bg);color:var(--x-ink)}
.sheet{width:478px;height:980px;padding:20px;overflow:hidden}
h1{font:600 17px/22px var(--x-font);margin-bottom:2px}
header p{font:400 11px/15px var(--x-font);color:var(--x-ink-3);margin-bottom:14px}
h2{font:600 9px/12px var(--x-font);letter-spacing:.8px;text-transform:uppercase;
  color:var(--x-ink-3);margin:12px 0 5px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.sw .chip{height:26px;border-radius:6px;border:1px solid var(--x-border)}
.sw b{display:block;margin-top:3px;font:600 8.5px/11px ui-monospace,Menlo,monospace}
.sw i{display:block;font:400 8px/11px ui-monospace,Menlo,monospace;
  color:var(--x-ink-3);font-style:normal;word-break:break-all}
.rad{display:flex;gap:9px}
.rb{width:44px;height:26px;background:var(--x-card);border:1px solid var(--x-border)}
.rad em{display:block;margin-top:2px;font:400 8.5px/11px var(--x-font);
  color:var(--x-ink-3);font-style:normal;text-align:center}
.tr{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  padding-bottom:2px;border-bottom:1px solid var(--x-border)}
.tr span{white-space:nowrap;overflow:hidden}
.tr em{font:400 8px/11px ui-monospace,Menlo,monospace;color:var(--x-ink-3);
  font-style:normal;white-space:nowrap;flex:none}
.met{font:400 9px/13px ui-monospace,Menlo,monospace;color:var(--x-ink-2)}
table.ev{width:100%;border-collapse:collapse}
table.ev td{vertical-align:top;padding:2.5px 6px 2.5px 0;
  border-bottom:1px solid var(--x-border);font:400 8.5px/11px var(--x-font)}
td.t,td.v{font-family:ui-monospace,Menlo,monospace;white-space:nowrap}
td.t{color:var(--x-accent)}
td.v{color:var(--x-ink-2);max-width:150px;overflow:hidden;text-overflow:ellipsis}
td.e{color:var(--x-ink-3)}"""


def _of(group):
    return [t for t in TOKENS if t[0] == group]


def token_board():
    swatches = "".join(
        '<div class="sw"><div class="chip" style="background:var(--x-%s)"></div>'
        '<b>--x-%s</b><i>%s</i></div>' % (n, n, v)
        for g in ("Surface", "Line", "Ink", "Accent") for _, n, v, _ in _of(g))
    radii = "".join(
        '<div><div class="rb" style="border-radius:%s"></div><em>%s</em></div>' % (v, v)
        for _, n, v, _ in _of("Radius") if n != "r-phone")
    met = "<br>".join("--x-%s: %s" % (n, v) for _, n, v, _ in _of("Metrics"))
    return page(NAME + " - Design Tokens",
                '<div class="sheet"><header><h1>%s</h1>'
                '<p>Ten Mobbin captures of the Perplexity onboarding flow, at @3x. '
                'Every value is measured; the evidence boards carry the probe '
                'behind each one.</p></header>'
                '<h2>Colour</h2><div class="grid">%s</div>'
                '<h2>Radius</h2><div class="rad">%s</div>'
                '<h2>Metrics</h2><div class="met">%s</div></div>'
                % (NAME, swatches, radii, met), SHEET)


def type_board():
    # The specimen is set in the token itself, so a 36px serif row is 36px
    # tall: the type scale needs its own sheet, not a section on the first.
    rows = "".join(
        '<div class="tr"><span style="font:var(--x-%s)">%s</span>'
        '<em>--x-%s &middot; %s</em></div>' % (n, sample, n, v.split(" var")[0])
        for _, n, v, _ in _of("Type")
        for sample in ["Where knowledge begins" if "serif" in v else "Grumpy wizards"])
    return page(NAME + " - Type",
                '<div class="sheet"><header><h1>Type</h1>'
                '<p>Two families: the platform sans standing in for FK Grotesk Neue, '
                'and the platform serif for the headline face. Sizes are ink-box '
                'measurements, line heights the pitch between two ink tops.</p>'
                '</header>%s</div>' % rows, SHEET)


EV_ROWS = 40   # rows that fit the 478 x 980 box; the table splits past this


def evidence_boards():
    pages = [TOKENS[i:i + EV_ROWS] for i in range(0, len(TOKENS), EV_ROWS)]
    for i, chunk in enumerate(pages):
        rows = "".join(
            '<tr><td class="t">--x-%s</td><td class="v">%s</td><td class="e">%s</td></tr>'
            % (n, v, e) for _, n, v, e in chunk)
        of = " %d/%d" % (i + 1, len(pages)) if len(pages) > 1 else ""
        yield ("00%s-evidence" % "cdefgh"[i],
               page(NAME + " - Evidence" + of,
                    '<div class="sheet"><header><h1>Evidence%s</h1>'
                    '<p>One row per token. A token with no evidence is a guess.</p>'
                    '</header><table class="ev">%s</table></div>' % (of, rows), SHEET))


# --------------------------------------------------------------- screens ----
SCREEN_CSS = """.phone svg,.phone img{position:absolute;display:block}
.b,.t,.ct{position:absolute}
.t,.ct{white-space:nowrap}
.ct{left:0;width:var(--x-w);text-align:center}
.pill{position:absolute;display:flex;align-items:center;justify-content:center;gap:5px;
  border-radius:var(--x-r-pill);font:var(--x-t-btn)}
/* the substitute seats a flex-centred line half a point below where the
   capture puts its ink: its ascent and descent split the line box
   differently from the real face */
.lb{position:relative;top:-.5px}
.gl{position:relative;flex:none}
.fld{position:absolute;background:var(--x-card);border:1px solid var(--x-border);
  border-radius:var(--x-r-field)}
.k,.km,.k2,.km2,.kb{position:absolute;height:42.3px;border-radius:var(--x-r-key);
  text-align:center;color:var(--x-ink);background:var(--x-key);font:var(--x-t-key);
  box-shadow:0 1px 0 rgba(20,18,24,.26)}
.km,.km2{background:var(--x-key-mod)}
.k2,.km2{font:var(--x-t-key-2)}
.kb{background:var(--x-blue);color:#FFFFFF;font:var(--x-t-key-2)}
.chips{position:absolute;top:0;display:flex;gap:7px}
.chips span{display:block;flex:none;white-space:nowrap;font:var(--x-t-chip);
  height:40px;padding:0 15.4px;box-sizing:border-box;
  border:.33px solid var(--x-line-chip);border-radius:var(--x-r-chip);
  background:var(--x-chip);color:var(--x-ink-inv)}
.tabs svg{color:var(--x-idle)}
.isl{position:absolute;overflow:hidden;background:var(--x-island);z-index:7}
.isl img{left:0;top:0}
.glow{position:absolute;background:radial-gradient(circle closest-side,var(--x-glow),transparent)}"""


def ink(y, size):
    """Line-box top for a line whose measured cap/ascender top is y and whose
    line-height equals its font size. SF sits its baseline 0.86em down such a
    box and its cap top 0.13em down, which is what the captures agree with."""
    return round(y - 0.13 * size, 2)


def b(x, y, w, h, css="", inner=""):
    return ('<div class="b" style="left:%gpx;top:%gpx;width:%gpx;height:%gpx;%s">%s</div>'
            % (x, y, w, h, css, inner))


def t(x, y, css, text):
    return '<div class="t" style="left:%gpx;top:%gpx;%s">%s</div>' % (x, y, css, text)


def ct(y, css, text):
    return '<div class="ct" style="top:%gpx;%s">%s</div>' % (y, css, text)


# ------------------------------------------------------------ 01 splash ----
# the two marks sit 7.67 and 6.00pt clear of their labels in the capture, so one
# flex gap cannot seat both; the gap is fitted to the labels, which carry the ink,
# and the 1.67pt the marks disagree by is carried as a relative offset on each
PILLS = [("pill", "ink-max", ("apple", 11.2, 13.7, -1.7), "Continue with Apple"),
         ("pill", "ink-max", ("google", 13.7, 13.7, 1.0), "Continue with Google"),
         ("pill-2", "ink-inv", None, "Continue with email"),
         ("pill-2", "ink-inv", None, "Continue with SSO")]


def s01():
    out = [art("p01-splash", 0, 0, 393, 435), statusbar("#FFFFFF"),
           t(0, ink(69, 17), "width:376.3px;text-align:right;font:400 17px/17px "
             "var(--x-font);color:var(--x-ink-inv)", "Cancel"),
           icon("perplexity-mark", 169.7, 372, 51.7, 59, ";color:var(--x-ink-inv)"),
           icon("perplexity-word", 96.7, 439.3, 200, 42.5, ";color:var(--x-ink-inv)")]
    for i, (fill, col, glyph, label) in enumerate(PILLS):
        g = ('<span class="gl" style="width:%gpx;height:%gpx;left:%gpx">%s</span>'
             % (glyph[1], glyph[2], glyph[3],
                icon(glyph[0], 0, 0, glyph[1], glyph[2]))) if glyph else ""
        out.append('<div class="pill" style="left:24.3px;top:%gpx;width:345px;height:48px;'
                   'background:var(--x-%s);color:var(--x-%s)">%s%s</div>'
                   % (round(527.17 + i * 58.0, 2), fill, col, g,
                      '<span class="lb">%s</span>' % label))
    out.append(b(0, ink(785.3, 15), 393, 15,
                 "display:flex;justify-content:center;gap:24.55px;padding-left:1.7px;font:var(--x-t-foot);"
                 "letter-spacing:.85px;color:var(--x-ink-3)",
                 "<span>Privacy policy</span><span>Terms of service</span>"))
    out.append(home("#6C6C6E"))
    return "".join(out)


# ---------------------------------------------------------- 02-03 email ----
KEY_W, PITCH = 33.3, 39.34
KEY_ROWS = [(3.1, "qwertyuiop"), (22.8, "asdfghjkl"), (62.0, "zxcvbnm")]
ROW_TOP = [569, 623, 677, 731]
ROW3 = [(3.1, 43.4, "123", "km2"), (52.5, 43.4, "", "km"), (101.9, 91.1, "space", "k2"),
        (199.4, 43.4, "@", "k2"), (248.8, 43.4, ".", "k2"), (298.2, 91.7, "continue", "km2")]
ROW3_CODE = [(3.1, 43.4, "123", "km2"), (52.5, 43.4, "", "km"),
             (101.9, 190.5, "space", "k2"), (298.2, 91.7, "go", "kb")]


def keyboard(row3):
    out = [b(0, 561.3, 393, 290.7, "background:var(--x-kbd)")]
    for (x0, letters), top in zip(KEY_ROWS, ROW_TOP):
        out += ['<div class="k" style="left:%gpx;top:%gpx;width:%gpx">%s</div>'
                % (round(x0 + i * PITCH, 2), top, KEY_W, ch)
                for i, ch in enumerate(letters)]
    out += ['<div class="km" style="left:3.1px;top:677px;width:44.2px"></div>',
            icon_at("kbd-shift"),
            '<div class="km" style="left:345.7px;top:677px;width:44.2px"></div>',
            icon_at("kbd-delete")]
    out += ['<div class="%s" style="left:%gpx;top:731px;width:%gpx">%s</div>'
            % (cls, x, w, label) for x, w, label, cls in row3]
    out += [icon_at("kbd-emoji"), icon_at("kbd-globe", ";color:var(--x-globe)")]
    return "".join(out)


def email_screen(typed):
    """p02 empty, p03 with an address typed and the button live."""
    # text-indent cancels the trailing letter-space, which would otherwise carry
    # a centred line half a space to the left of where the capture puts its ink
    out = [statusbar(), icon_at("chevron-back"),
           ct(ink(102.57, 24.9), "font:var(--x-t-nav);letter-spacing:.78px;"
              "text-indent:.78px;color:var(--x-ink)", "Continue with email"),
           '<div class="fld" style="left:24px;top:164.8px;width:345px;height:46.2px"></div>']
    if typed:
        out += [t(40.3, ink(181, 17), "font:var(--x-t-field);letter-spacing:-.09px;"
                  "color:var(--x-ink-max)", "samlee.mobbin@gmail.com"),
                b(100.2, 194.1, 55.1, 2.4,
                  "background:repeating-linear-gradient(90deg,var(--x-flag) 0 2.5px,"
                  "transparent 2.5px 4px)"),
                b(248.7, 176.7, 2.33, 22, "background:var(--x-caret)"),
                b(24, 485, 345.7, 60.3, "border-radius:var(--x-r-pill);"
                  "background:var(--x-accent)"),
                ct(ink(508, 18), "font:var(--x-t-btn);letter-spacing:.25px;text-indent:.25px;color:var(--x-ink-inv)", "Continue")]
    else:
        out += [b(40, 176.67, 2.33, 22, "background:var(--x-caret)"),
                t(46.5, ink(181, 17), "font:var(--x-t-field);color:var(--x-ink-4)", "Email"),
                b(24, 485, 345.7, 60.3, "border-radius:var(--x-r-pill);background:var(--x-off)"),
                ct(ink(508, 18), "font:var(--x-t-btn);letter-spacing:.25px;text-indent:.25px;color:var(--x-ink-2)", "Continue")]
    out += [keyboard(ROW3), home("#4C4B4E" if not typed else "#050405")]
    return "".join(out)


# ------------------------------------------------- 04-06 check your email ----
def check_screen(middle, button, keys):
    out = [statusbar(), icon_at("chevron-back"),
           b(169, 135.7, 57, 57, "border-radius:var(--x-r-pill);background:var(--x-card)"),
           icon_at("envelope", ";color:var(--x-ink)"),
           ct(ink(221, 20.9), "font:var(--x-t-title);letter-spacing:.29px;"
              "text-indent:.29px;color:var(--x-ink)", "Check your email"),
           ct(ink(260.37, 16.3), "font:var(--x-t-body);word-spacing:.81px;color:var(--x-ink)",
              "A temporary login link has been sent to<br>samlee.mobbin@gmail.com")]
    out += middle
    out += button
    out.append(keyboard(ROW3_CODE) if keys else "")
    out.append(home("#050405"))
    return "".join(out)


def code_field(x, top, text, colour, caret=None):
    """The capture centres caret and text together in the field, so each is placed
    at its own measured ink left. p06 has no caret at all: the blink was off in
    that frame, not the field unfocused."""
    return ['<div class="fld" style="left:108.5px;top:316px;width:176.5px;height:53.5px"></div>',
            b(caret, 331.67, 2.33, 22, "background:var(--x-caret)") if caret else "",
            t(x, ink(top, 17), "font:var(--x-t-field);color:var(--x-%s)" % colour, text)]


def off_button(top):
    return [b(24, top, 345.7, 60.3,
              "border-radius:var(--x-r-pill);background:var(--x-off)"),
            ct(ink(top + 23, 18), "font:var(--x-t-btn);letter-spacing:.25px;text-indent:.25px;color:var(--x-ink-2)", "Continue")]


def s04():
    return check_screen(
        [ct(ink(339.7, 15), "font:600 15px/15px var(--x-font);color:var(--x-accent-2)",
            "Enter Code Manually")], [], False)


def s05():
    return check_screen(code_field(156, 337, "Enter Code", "ink-4", 152),
                        off_button(485), True)


# The spinner is one arc with a gradient along it: 107 of the ring's 122.5pt
# circumference, opening at 1 o'clock, dark at the leading end.
SPINNER = ('<svg viewBox="0 0 40 40" style="left:178.5px;top:422.5px;width:40px;height:40px">'
           '<defs><linearGradient id="sp" x1="1" y1="0" x2="0" y2="1">'
           '<stop offset="0" stop-color="#5F5F5F"/><stop offset="1" stop-color="#D9D9D9"/>'
           '</linearGradient></defs>'
           '<circle cx="20" cy="20" r="18.2" fill="none" stroke="url(#sp)" stroke-width="3.5"'
           ' stroke-linecap="round" stroke-dasharray="99 16" transform="rotate(-62 20 20)"/>'
           '</svg>')


def s06():
    return check_screen(
        code_field(149.3, 336.33, "1r6bv-9axzx", "ink-max")
        + [b(145.5, 405.5, 104.5, 105,
             "border-radius:var(--x-r-field);background:var(--x-card)"),
           SPINNER,
           ct(ink(476.3, 14), "font:400 14px/14px var(--x-font);color:var(--x-ink)",
              "Loading…")],
        off_button(742), False)


# ----------------------------------------------------------- 07-08 paywall ----
CHIPS_1 = ["Over 300 Pro searches per day", "Voice mode", "File analysis", "Pro user support"]
CHIPS_2 = ["Reasoning with DeepSeek R1", "3x more sources", "Access to the latest models"]

CHECK = ('<svg viewBox="0 0 20 20" style="left:175px;top:602px;width:20.3px;height:20.3px">'
         '<circle cx="10" cy="10" r="10" fill="var(--x-cyan)"/>'
         '<path d="M5.4 10.1 8.5 13.2 14.6 7.1" fill="none" stroke="#12323A"'
         ' stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>')

CHEVRON = ('<svg viewBox="0 0 8.3 14" style="left:233px;top:786.6px;width:8.3px;height:14px">'
           '<path d="M1 1 7.3 7 1 13" fill="none" stroke="var(--x-ink-cyan)" stroke-width="1.9"'
           ' stroke-linecap="round" stroke-linejoin="round"/></svg>')


def chiprow(top, items, left):
    """One marquee row. Both rows are wider than the screen and sit at an
    offset the capture fixes, so the clip is the design, not an overflow."""
    return ('<div class="b" data-clip-ok style="left:0;top:%gpx;width:393px;height:40px;'
            'overflow:hidden"><div class="chips" style="left:%gpx">%s</div></div>'
            % (top, left, "".join("<span>%s</span>" % s for s in items)))


def plan(x, title, price, billed, billed_y, colour, line, dy=0, extra=""):
    """dy raises the title and price: the Yearly card carries a badge as well, and
    the capture sets its two lines 3.3pt higher to make room for it."""
    return "".join(
        [b(x, 609.5, 172.5, 146, "border:1px solid var(--x-%s);"
           "border-radius:var(--x-r-card)" % line),
         t(x + 16.8, ink(631 + dy, 16), "font:var(--x-t-plan);color:var(--x-%s)" % colour, title),
         t(x + 16.8, ink(654.0 + dy, 25.2),
           "font:var(--x-t-price);letter-spacing:-.28px;color:var(--x-%s)" % colour, price),
         extra,
         t(x + 16.8, ink(billed_y, 12),
           "font:var(--x-t-note);color:var(--x-%s)" % colour, billed)])


def paywall(off1, off2, extra=""):
    return "".join(
        [art("p07-hero", 0, 0, 393, 500),
         icon("perplexity-word", 113.3, 146, 124.7, 26.5, ";color:var(--x-ink-inv)"),
         icon_at("pro-badge", ";color:var(--x-ink-inv)"),
         '<svg viewBox="0 0 12.4 12.3" style="left:22.3px;top:75px;width:12.4px;height:12.3px">'
         '<path d="M.9.9 11.5 11.4M11.5.9.9 11.4" fill="none" stroke="var(--x-ink-inv)"'
         ' stroke-width="1.7" stroke-linecap="round"/></svg>',
         t(0, ink(74.3, 15), "width:376.7px;text-align:right;font:400 15px/15px var(--x-font);"
           "color:var(--x-ink-inv)", "Restore"),
         # placed by its baseline, not its top: the shorter substitute cannot have
        # both, and the baseline is where the eye reads the line as sitting
        ct(186 - 2.3, "font:var(--x-t-hero);letter-spacing:-.22px;color:var(--x-ink-inv)",
            "Unlock the most powerful<br>research assistant"),
         chiprow(498.2, CHIPS_1, off1), chiprow(546.2, CHIPS_2, off2),
         plan(16.5, "Monthly", "S$&nbsp;29.98", "Billed Monthly", 727.3, "cyan-2", "line-on",
              extra=CHECK),
         plan(205, "Yearly", "S$&nbsp;299.98", "Billed Yearly", 730.3, "ink-inv", "line", -3.3,
              b(220.7, 688.7, 98.9, 25.3,
                "border-radius:var(--x-r-pill);background:var(--x-gold);"
                "text-align:center;font:400 12px/27.3px var(--x-mono);"
                "color:var(--x-gold-ink)", "Save $49.00")),
         b(16.3, 772.3, 361, 47.7, "border-radius:var(--x-r-pill);background:var(--x-cyan)"),
         t(146.3, ink(787.5, 18), "font:600 18px/18px var(--x-font);color:var(--x-ink-cyan)",
           "Subscribe"), CHEVRON, extra])


def s07():
    return statusbar("#FFFFFF") + paywall(-9, -8.7) + home("#747476")


# the capture's alert sits right of the phone's centre line: its box by 0.67pt,
# and its three centred runs by 1.0, which is the substitute's side bearings on
# top of that. text-indent inherits, so the wrapper carries it for all three
ALERT = '<div style="position:absolute;z-index:5;text-indent:1px">' + "".join(
    [b(62.17, 376.3, 270, 124.7, "border-radius:var(--x-r-alert);background:var(--x-alert)"),
     ct(ink(400, 17), "font:600 17px/17px var(--x-font);color:var(--x-ink)", "You&rsquo;re all set"),
     ct(ink(423, 13), "font:400 13px/13px var(--x-font);color:var(--x-ink)",
        "Your purchase was successful."),
     b(62.17, 456.3, 270, .67, "background:rgba(20,18,24,.13)"),
     ct(ink(472.7, 17), "font:500 17px/17px var(--x-font);color:var(--x-blue)", "OK")]) + "</div>"


def s08():
    return (statusbar("#D7D7D7")
            + paywall(-157.5, -158.7,
                      b(0, 0, 393, 852, "background:var(--x-scrim);z-index:4") + ALERT)
            + home("#E5E5E7"))


# ---------------------------------------------------------- 09-10 home ----
TABS = ["tab-search", "tab-discover", "tab-spaces", "tab-library"]

TIP = "".join(
    [b(157, 669.5, 222, 20.7, "border-radius:var(--x-r-pill);background:var(--x-night-2);"
       "text-align:center;white-space:nowrap;font:600 9.6px/20px var(--x-font);"
       "color:var(--x-ink-inv)",
       "Now supporting actions via voice assistant"),
     b(344.7, 690.2, 0, 0, "border-left:5.5px solid transparent;"
       "border-right:5.5px solid transparent;border-top:5px solid var(--x-night-2)"),
     b(145, 812, 6, 6, "border-radius:var(--x-r-pill);background:var(--x-danger)")])


def home_screen(tip):
    news = ('<img alt="p10-news" src="%s" style="left:198.8px;top:633px;width:33.7px;'
            'height:35px;border-radius:6px">' % cut("p10-news"))
    return "".join(
        [icon("home-watermark", 0, 54, 393, 569, ";color:var(--x-wash)"),
         statusbar(),
         b(16, 59.5, 32, 32, "border:1px solid var(--x-ring);border-radius:var(--x-r-pill);"
           "text-align:center;font:400 17px/32px var(--x-font);color:var(--x-ink)", "s"),
         icon("perplexity-word", 120.3, 63.7, 115, 24.2, ";color:var(--x-ink)"),
         icon("pro-badge", 239, 63.6, 35.3, 21.9, ";color:var(--x-ink)"),
         icon_at("share", ";color:var(--x-ink)"),
         icon("perplexity-mark", 183, 282.7, 28, 32.3, ";color:var(--x-quiet)"),
         ct(333.2, "font:var(--x-t-home);color:var(--x-quiet)",
            "Where<br>knowledge<br>begins"),
         b(16, 627, 165, 48.3, "border-radius:var(--x-r-field);background:var(--x-card)"),
         b(24, 634.3, 32.3, 32, "border-radius:5px;background:var(--x-search)"),
         icon_at("cloud", ";color:var(--x-ink)"),
         t(64.0, ink(646.7, 12), "font:var(--x-t-note);letter-spacing:-.08px;"
           "color:var(--x-ink)", "85&deg;F Mostly cloudy"),
         b(191, 627, 210, 48.3, "border-radius:var(--x-r-field);background:var(--x-card)"),
         news,
         b(239, ink(637.33, 12.1), 180, 32,
           "font:400 12.1px/15.3px var(--x-font);color:var(--x-ink)",
           "Trump pressed Mexico to allow US military forces"),
         b(16, 694.5, 361, 50, "border-radius:var(--x-r-pill);background:var(--x-search)"),
         icon_at("lens", ";color:var(--x-ink)"),
         # the substitute sets this string 4.4% narrow at the size its ink height
         # calls for, so the shortfall is charged as tracking rather than size
         t(129.3, ink(710.6, 21), "font:400 21px/21px var(--x-font);"
           "letter-spacing:.45px;color:var(--x-ink)", "Ask anything"),
         icon_at("voice", ";color:var(--x-ink)"),
         '<div class="tabs">%s</div>'
         % "".join(icon_at(n, ";color:var(--x-ink)" if i == 0 else "")
                   for i, n in enumerate(TABS)),
         TIP if tip else "",
         home("#050405")])


def s09():
    return home_screen(True)


def s10():
    return home_screen(False)


# --------------------------------------------- 11-14 the Dynamic Island ----
# Mobbin shoots a Live Activity on a bare --x-ground field: no wallpaper, no
# home indicator, nothing but the island, which is the whole subject of these
# four boards. That is also why they draw one where the status-bar rule has
# every other board leave the capture's alone; the README has the argument.
ISLAND = (11.15, 11.15, 370.7, 133.38)   # x, y, w, h of the expanded island


def compact(width, glyph, glow_cx, glow_a, mic=""):
    """p11 and p13: a black stadium 37.03 tall hung off the top of the frame,
    the brand mark at its left and a lit glyph at its right. Everything inside
    is placed off the pill, and the pill clips the glow the glyph throws."""
    return ('<div class="isl" data-clip-ok style="left:90.85px;top:11.15px;width:%gpx;'
            'height:37.03px;border-radius:var(--x-r-pill)">'
            '<div class="glow" style="left:%gpx;top:2.35px;width:33px;height:33px;'
            'opacity:%s"></div>%s%s%s</div>'
            % (width, round(glow_cx - 107.35, 2), glow_a,
               icon("perplexity-mark", 13.09, 7.59, 20.07, 21.86, ";color:var(--x-ink-inv)"),
               glyph, mic))


def expanded(cid, body):
    """p12 and p14: the island open. The starfield inside it, and the glass
    waveform or orbit rendered on that, is the capture's own picture, cut at
    the island box and clipped by the board's corner rather than by the crop.
    The lockup, the label and the progress row are erased out of it and drawn
    here, so the corner is CSS and the type is type."""
    return ('<div class="isl" style="left:%gpx;top:%gpx;width:%gpx;height:%gpx;'
            'border-radius:var(--x-r-island);box-shadow:0 12px 33px rgba(0,0,0,.38)">'
            '%s%s</div>' % (ISLAND + (art(cid, 0, 0, ISLAND[2], ISLAND[3]), body)))


def s11():
    return statusbar() + compact(
        205.5, icon("voice-wave", 176.48, 12.2, 16.48, 13.3, ";color:var(--x-cyan-3)"),
        275.57, .41, b(124.15, 15.85, 5.6, 5.6,
                       "border-radius:50%;background:var(--x-mic)"))


def s12():
    return statusbar() + expanded("p12-island", "".join([
        icon("perplexity-mark", 42.38, 50.41, 17.84, 19.63, ";color:var(--x-ink-inv)"),
        icon("perplexity-word", 65.58, 52.19, 75.39, 16.06, ";color:var(--x-ink-inv)"),
        t(43.27, ink(84.76, 16.7), "font:var(--x-t-live);color:var(--x-ink-inv)",
          'Voice mode is <span style="color:var(--x-cyan-3)">active</span>'),
    ])) + b(375.95, 25.65, 8.3, 8.3,
            "z-index:7;border-radius:50%;background:var(--x-island)",
            b(2.15, 2.15, 4, 4, "border-radius:50%;background:var(--x-mic)"))


def s13():
    return statusbar() + compact(
        211.3, icon("atom", 180.06, 10.42, 16.51, 16.51, ";color:var(--x-cyan-3)"),
        278.5, .73)


def s14():
    return statusbar() + expanded("p14-island", "".join([
        icon("perplexity-mark", 34.35, 35.69, 14.27, 15.61, ";color:var(--x-ink-inv)"),
        icon("perplexity-word", 53.09, 37.47, 59.78, 12.49, ";color:var(--x-ink-inv)"),
        t(35.24, ink(68.7, 12), "font:var(--x-t-note);background:linear-gradient(90deg,"
          "var(--x-ink-inv),rgba(255,253,255,.3));-webkit-background-clip:text;"
          "color:transparent", "Reasoning..."),
        b(34.35, 108.9, 302, 3.1, "border-radius:var(--x-r-pill);background:rgba(255,255,255,.06)"),
        b(34.35, 108.9, 257.1, 3.1, "border-radius:var(--x-r-pill);background:var(--x-cyan-3)"),
        b(288.55, 107.55, 5.8, 5.8, "border-radius:50%;background:var(--x-cyan-3)"),
    ]))


SCREENS = [
    ("01-splash",       "Splash",             s01, "night"),
    ("02-email",        "Continue with email", lambda: email_screen(False), "bg"),
    ("03-email-typed",  "Address typed",      lambda: email_screen(True), "bg"),
    ("04-check-email",  "Check your email",   s04, "bg"),
    ("05-enter-code",   "Enter code",         s05, "bg"),
    ("06-code-loading", "Code accepted",      s06, "bg"),
    ("07-paywall",      "Perplexity Pro",     s07, "night-2"),
    ("08-purchased",    "Purchase confirmed", s08, "night-2"),
    ("09-home-tip",     "Home, voice tooltip", s09, "bg"),
    ("10-home",         "Home",               s10, "bg"),
    ("11-island-voice",          "Voice, compact",      s11, "ground"),
    ("12-island-voice-open",     "Voice, expanded",     s12, "ground"),
    ("13-island-reasoning",      "Reasoning, compact",  s13, "ground"),
    ("14-island-reasoning-open", "Reasoning, expanded", s14, "ground"),
]


def screen(label, fn, ground):
    return page(NAME + " - " + label,
                '<div class="phone" style="background:var(--x-%s)">%s</div>' % (ground, fn()),
                SCREEN_CSS)


# ------------------------------------------------- Phase 5: the reference ----
# Each capture, unretouched, on its own board directly under its mockup. The
# board embeds a half-scale JPEG: ten full-res PNGs would be 30 MB of base64
# for boards nobody samples. Sampling always reads assets/refs/pNN.png.
REF_CSS = """body{padding:24px}
.phone img{position:absolute;left:0;top:0;width:var(--x-w);height:var(--x-h);display:block}"""


def ref_uri(path):
    from PIL import Image
    im = Image.open(path).convert("RGB")
    im = im.crop((0, 0, im.width, round(852 * scale(path.stem))))   # drop Mobbin's bar
    im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=88, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def ref_boards():
    for i, (stem, label, _, _) in enumerate(SCREENS, start=1):
        f = REFS_DIR / ("p%02d.png" % i)
        if not f.exists():
            continue
        yield ("ref-" + stem,
               page(NAME + " - reference: " + label,
                    '<div class="phone"><img src="%s" alt="%s"></div>'
                    % (ref_uri(f), label), REF_CSS))


# ----------------------------------------------------------------- main ----
def main():
    foundations = [("00-design-tokens", "Design tokens", token_board()),
                   ("00b-type", "Type", type_board())]
    foundations += [(n, "Evidence", h) for n, h in evidence_boards()]
    files = dict([(n, h) for n, _, h in foundations]
                 + [(s, screen(l, fn, g)) for s, l, fn, g in SCREENS]
                 + list(ref_boards()))
    for name in sorted(files):
        write(name, files[name])

    rows = [{"title": "Foundations",
             "files": [{"file": n, "label": l} for n, l, _ in foundations]},
            {"title": "Screens", "numbered": True,
             "files": [{"file": s, "label": l} for s, l, _, _ in SCREENS]}]
    # Same order as the row above: the canvas lays every row out from x = 0 at
    # one pitch, so item N here lands column-for-column under item N up there.
    refs = [{"file": "ref-" + s, "label": l}
            for s, l, _, _ in SCREENS if "ref-" + s in files]
    if refs:
        rows.append({"title": "Source of truth: Mobbin captures",
                     "numbered": True, "files": refs})
    layout = {"name": PAGE_NAME, "cover": COVER, "rows": rows}
    (OUT / "layout.json").write_text(json.dumps(layout, indent=2) + "\n")
    print("%-26s %7d rows" % ("layout.json", len(rows)))


if __name__ == "__main__":
    main()
