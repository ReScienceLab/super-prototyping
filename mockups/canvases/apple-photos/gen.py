"""Emit mockups/canvases/apple-photos/ from the Figma measurements.

Every number in here came out of the Figma file (node ids in README.md), not out
of a screenshot: variables for the metrics, the type styles for the ramp, and
the auto-layout for the boxes. The reference renders were only used to confirm
them, and to settle the three things Figma states ambiguously -- the bottom
sheet's overflow, the alert's undimmed status bar, and the tracking.

No letter-spacing anywhere on purpose. The type styles carry tracking (+0.4 at
34pt, -0.43 at 17, -0.23 at 15, -0.08 at 13) but SF Pro already applies it
through its optical size axis, so Figma's own PNG export shows none of it on
top. Setting it in CSS double-counts: measured against the render it made the
34pt title 8px too wide and the 17pt alert title 11px too narrow, and both
landed exactly right once removed.

Artboards are output. Edit this file, never the HTML.

Reads assets/ (photos, glyphs and the Figma reference renders) and writes
every board plus layout.json back into this folder:

    python3 mockups/canvases/apple-photos/gen.py
"""
import base64, os, re, json

OUT = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(OUT, "assets")

# ---------------------------------------------------------------- assets

# reading order in the grid -> the fill Figma handed back (matched by order.py)
PHOTOS = [("minerva-1", 5), ("beach-1", 4), ("beach-2", 8), ("beach-3", 6),
          ("ice-cream-1", 7), ("minerva-2", 10), ("perigueux-1", 2),
          ("perigueux-2", 11), ("ice-cream-3", 9), ("ice-cream-2", 3),
          ("food-1", 12)]


def photo(i):
    name = "%02d-%s.jpg" % (i + 1, PHOTOS[i][0])
    b = open(os.path.join(ASSETS, "photos", name), "rb").read()
    return "data:image/jpeg;base64," + base64.b64encode(b).decode()


def icon(name, cls="", style="", box=False):
    """Inline one extracted glyph. Its viewBox IS its ink box, so `box` places it
    at that offset inside its 44pt frame and hands the box back."""
    svg = open(os.path.join(ASSETS, "icons", name + ".svg"), encoding="utf-8").read()
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', svg).group(1).split()]
    if box:
        style = "left:%gpx;top:%gpx;width:%gpx;height:%gpx" % tuple(vb)
    svg = svg.replace("<svg ", '<svg preserveAspectRatio="none" class="%s" style="%s" '
                      % (cls, style), 1)
    return (svg, vb) if box else svg


def glyph(name, extra=""):
    """A tab or evidence glyph at its own natural ink size."""
    _, vb = icon(name, box=True)
    return icon(name, style="width:%gpx;height:%gpx%s" % (vb[2], vb[3], extra))


# ---------------------------------------------------------------- tokens

# One block, byte-identical in every file in this folder, and no `}` inside it
# (tools/refkit.py reads it with a non-greedy regex).
TOKENS = """:root{
  --ap-font:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Helvetica,Arial,sans-serif;

  /* Surface */
  --ap-bg:#FFFFFF;
  --ap-elevated:#FFFFFF;
  --ap-black:#000000;
  --ap-white:#FFFFFF;
  --ap-scrim:rgba(0,0,0,.20);
  --ap-material:#F0F0F0;
  --ap-sep:#C7C7CC;

  /* Ink */
  --ap-ink:#000000;
  --ap-grey:#8E8E93;
  --ap-accent:#007BFE;

  /* Radius */
  --ap-r-alert:13px;
  --ap-r-btn:14px;
  --ap-r-island:100px;
  --ap-r-phone:52px;

  /* Type */
  --ap-t-lg:700 34px/41px var(--ap-font);
  --ap-t-nav:590 17px/22px var(--ap-font);
  --ap-t-body:400 17px/22px var(--ap-font);
  --ap-t-row:590 15px/20px var(--ap-font);
  --ap-t-desc:400 15px/20px var(--ap-font);
  --ap-t-note:400 13px/16px var(--ap-font);
  --ap-t-tab:590 10px/12px var(--ap-font);

  /* Metrics */
  --ap-w:393px;
  --ap-h:852px;
  --ap-sb:54px;
  --ap-nav:44px;
  --ap-tile:129.67px;
  --ap-gap:2px;
  --ap-tabbar:83px;
  --ap-tab:51px;
  --ap-home:34px;
  --ap-home-w:140px;
  --ap-island-w:126px;
  --ap-island-h:37px;
  --ap-alert-w:270px;
  --ap-hair:0.33px;
  --ap-title-top:77px;
  --ap-title-bottom:57px;
  --ap-list-gap:24px;
  --ap-icon:44px;
}"""

BASE = """*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--ap-font);background:#fff;-webkit-font-smoothing:antialiased;display:flex;justify-content:center;padding:24px}"""

PHONE = """.phone{width:var(--ap-w);height:var(--ap-h);position:relative;flex:none;overflow:hidden;border-radius:var(--ap-r-phone);background:var(--ap-bg);color:var(--ap-ink);outline:1px solid rgba(0,0,0,.10);box-shadow:0 0 0 11px #1D191A,0 0 0 12.5px #3A3735,0 24px 60px rgba(29,25,26,.28)}
.sb{position:absolute;left:0;right:0;top:0;height:var(--ap-sb);z-index:6}
.sb .t{position:absolute;left:10px;top:18.5px;width:123.5px;height:22px;text-align:center;font:var(--ap-t-nav)}
.sb .island{position:absolute;left:133.5px;top:11px;width:var(--ap-island-w);height:var(--ap-island-h);border-radius:var(--ap-r-island);background:var(--ap-black)}
.sb svg{position:absolute;display:block}
.home{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);width:var(--ap-home-w);height:5px;border-radius:var(--ap-r-island);background:var(--ap-ink)}"""

# 393-mode Status Bar: px-10, two flex-1 sides around the 126px island, each
# side items-center with pt-18 pb-13. The two sides therefore sit at different
# tops: the icon row is 20 tall so its side is 51 and centres at 1.5 (icons at
# 19.5), the time is a 22 line box so its side is 53 and centres at 0.5 (text at
# 18.5). Each entry below is the glyph's own ink rect, Figma's inset % resolved.
SB_ICONS = [("cellular", 282.599, 22.108, 19.472, 12.538),
            ("wifi", 309.077, 22.980, 16.621, 12.004),
            ("battery", 332.947, 22.980, 26.824, 12.135)]


def statusbar(colour=None):
    st = ' style="color:%s"' % colour if colour else ""
    ic = "".join(icon(n, style="left:%gpx;top:%gpx;width:%gpx;height:%gpx" % (x, y, w, h))
                 for n, x, y, w, h in SB_ICONS)
    return ('<div class="sb"%s><div class="t">1:47</div>'
            '<div class="island"></div>%s</div>' % (st, ic))


def page(title, css, body):
    return """<!DOCTYPE html>
<html lang="en">
<meta charset="utf-8">
<title>%s</title>
<style>
%s
%s
%s
</style>
%s
</html>
""" % (title, TOKENS, BASE, css, body)


# ---------------------------------------------------------------- 01 grid

AP_CSS = PHONE + """
.grid{position:absolute;left:0;top:110px;display:grid;grid-template-columns:repeat(3,var(--ap-tile));gap:var(--ap-gap)}
.grid img{display:block;width:var(--ap-tile);height:var(--ap-tile);object-fit:cover}
.title{position:absolute;left:156px;top:65px;width:81px;height:22px;text-align:center;white-space:nowrap;font:var(--ap-t-nav)}
.select{position:absolute;left:328px;top:65px;width:49px;height:22px;text-align:center;font:var(--ap-t-body);color:var(--ap-accent)}
.tabs{position:absolute;left:0;right:0;top:769px;height:var(--ap-tab);display:flex}
.tabs a{flex:1;display:flex;flex-direction:column;align-items:center;text-decoration:none;color:var(--ap-grey)}
.tabs a.on{color:var(--ap-accent)}
.tabs .ic{height:30px;margin-top:4px;display:flex;align-items:center}
.tabs .ic svg{display:block}
.tabs b{margin-top:1px;font:var(--ap-t-tab)}"""

TABS = [("tab-photos", "All Photos", 1.0), ("tab-foryou", "For You", .9),
        ("tab-albums", "Albums", .9), ("tab-search", "Search", .9)]


def all_photos():
    tabs = "".join('<a class="%s"><span class="ic">%s</span><b>%s</b></a>'
                   % ("on" if i == 0 else "", glyph(n, ";opacity:%g" % op), label)
                   for i, (n, label, op) in enumerate(TABS))
    body = ('<div class="phone">'
            '<div class="grid">%s</div>'
            '<div class="title">All Photos</div><div class="select">Select</div>'
            '%s<div class="tabs">%s</div><div class="home"></div></div>'
            % ("".join('<img alt="" src="%s">' % photo(i) for i in range(11)),
               statusbar(), tabs))
    return page("Apple Photos - All Photos", AP_CSS, body)


# ---------------------------------------------------------------- 02 sheet

# The Bottom Sheet frame is h-68 but its 20px graphic sits at y 58 and never
# clips, so it really paints y 58..78 while the next section still starts at
# 68. Reproduced literally rather than tidied up. The frame carries the black
# itself: a separate 58px block leaves a seam at the join that the canvas
# shows as a hairline of the page behind whenever it lands off the grid.
WN_CSS = PHONE + """
.sheet{position:absolute;left:0;right:0;top:0;height:68px;background:var(--ap-black);z-index:4}
.sheet .lip{position:absolute;left:0;top:58px;display:block;width:var(--ap-w);height:20px}
h1{position:absolute;left:0;right:0;top:145px;height:41px;text-align:center;font:var(--ap-t-lg)}
.listing{position:absolute;left:32px;top:243px;width:329px;display:flex;flex-direction:column;gap:var(--ap-list-gap)}
.row{display:flex;align-items:center;gap:12px}
.row .ic{position:relative;flex:none;width:var(--ap-icon);height:var(--ap-icon);color:var(--ap-accent)}
.row .ic svg{position:absolute}
.row .tx{flex:1;min-width:0}
.row h3{font:var(--ap-t-row)}
.row p{font:var(--ap-t-desc);color:var(--ap-grey);white-space:nowrap}
.cta{position:absolute;left:44px;top:713px;width:305px;height:50px;border-radius:var(--ap-r-btn);background:var(--ap-accent);color:var(--ap-white);display:grid;place-items:center;font:var(--ap-t-nav)}"""

LISTING = [
    ("shared-library", "Shared Library",
     ("Combine photos and videos with the",
      "people closest to you and automatically",
      "share new photos from",
      "Camera.")),
    ("copy-paste-edits", "Copy &amp; Paste Edits",
     ("Save time by making edits to one",
      "photo, then applying the changes to",
      "other photos with a tap.")),
    ("merge-duplicates", "Merge Duplicates",
     ("Quickly find and merge all your",
      "duplicate photos and videos from one",
      "central place in the Albums tab.")),
]

ALERT_TITLE = ('"Photos" Would Like to Send', "You Notifications")
ALERT_DESC = ("Notifications may include alerts,",
              "sounds, and icon badges. These can",
              "be configured in Settings.")


def whats_new_body(extra=""):
    rows = "".join('<div class="row"><span class="ic">%s</span>'
                   '<span class="tx"><h3>%s</h3><p>%s</p></span></div>'
                   % (icon(n, box=True)[0], title, "<br>".join(desc))
                   for n, title, desc in LISTING)
    lip = open(os.path.join(ASSETS, "icons", "bottom-sheet.svg"),
               encoding="utf-8").read().replace("<svg ", '<svg class="lip" ', 1)
    return ('<div class="phone">'
            '<div class="sheet">%s</div>'
            '<h1>What\'s New in Photos</h1>'
            '<div class="listing">%s</div>'
            '<div class="cta">Continue</div>'
            '<div class="home"></div>%s%s</div>'
            % (lip, rows, extra, statusbar("var(--ap-white)")))


def whats_new():
    return page("Apple Photos - What's New", WN_CSS, whats_new_body())


# ---------------------------------------------------------------- 03 alert

ALERT_CSS = WN_CSS + """
.scrim{position:absolute;inset:0;background:var(--ap-scrim);z-index:5}
.alert{position:absolute;left:61.5px;top:348px;width:var(--ap-alert-w);height:176px;z-index:6;border-radius:var(--ap-r-alert);overflow:hidden;background:var(--ap-material)}
.alert .c{padding:20px;text-align:center}
.alert h4{font:var(--ap-t-nav);white-space:nowrap}
.alert p{font:var(--ap-t-note);white-space:nowrap}
.alert .btns{position:relative;display:flex;height:44px}
.alert .btns::before{content:"";position:absolute;left:0;right:0;top:0;height:var(--ap-hair);background:var(--ap-sep)}
.alert .btns::after{content:"";position:absolute;left:50%;top:0;bottom:0;width:var(--ap-hair);background:var(--ap-sep)}
.alert .btns span{flex:1;display:grid;place-items:center;color:var(--ap-accent);font:var(--ap-t-body)}"""


def notifications():
    alert = ('<div class="scrim"></div><div class="alert">'
             '<div class="c"><h4>%s</h4><p>%s</p></div>'
             '<div class="btns"><span>Don\'t Allow</span><span>Allow</span></div>'
             '</div>' % ("<br>".join(ALERT_TITLE), "<br>".join(ALERT_DESC)))
    return page("Apple Photos - Notifications permission", ALERT_CSS,
                whats_new_body(alert))


# ---------------------------------------------------------------- 00 tokens

SW = [("Surface", [("--ap-bg", "#FFFFFF", "bg/primary-base"),
                   ("--ap-elevated", "#FFFFFF", "bg/primary-elevated"),
                   ("--ap-black", "#000000", "system/black"),
                   ("--ap-white", "#FFFFFF", "system/white"),
                   ("--ap-scrim", "rgba(0,0,0,.20)", "ui/alert-overlay"),
                   ("--ap-material", "#F0F0F0", "ui/background-blur, flat"),
                   ("--ap-sep", "#C7C7CC", "system/grey3")]),
      ("Ink", [("--ap-ink", "#000000", "label/primary"),
               ("--ap-grey", "#8E8E93", "system/grey"),
               ("--ap-accent", "#007BFE", "ui/accent")])]

TYPE = [("--ap-t-lg", "Bold 34/41", "What's New title"),
        ("--ap-t-nav", "SemiBold 17/22", "Nav title, alert title"),
        ("--ap-t-body", "Regular 17/22", "Select, alert actions"),
        ("--ap-t-row", "SemiBold 15/20", "Listing row title"),
        ("--ap-t-desc", "Regular 15/20", "Listing row description"),
        ("--ap-t-note", "Regular 13/16", "Alert body"),
        ("--ap-t-tab", "SemiBold 10/12", "Tab bar label")]

METRIC = [("--ap-w", "393px", "screen/width"), ("--ap-h", "852px", "screen/height"),
          ("--ap-sb", "54px", "Status Bar height"),
          ("--ap-nav", "44px", "Title and Actions height"),
          ("--ap-tile", "129.67px", "photo-grid"),
          ("--ap-gap", "2px", "Grid gutter"),
          ("--ap-tabbar", "83px", "Bottom frame height"),
          ("--ap-tab", "51px", "Tabs height"),
          ("--ap-home", "34px", "Home Bar frame"),
          ("--ap-home-w", "140px", "homebar/width"),
          ("--ap-island-w", "126px", "Dynamic Island hole"),
          ("--ap-island-h", "37px", "Dynamic Island hole"),
          ("--ap-alert-w", "270px", "Alert box width"),
          ("--ap-hair", "0.33px", "Alert dividers"),
          ("--ap-title-top", "77px", "whats-new-title-top"),
          ("--ap-title-bottom", "57px", "whats-new-title-bottom"),
          ("--ap-list-gap", "24px", "whats-new-arguments-between-v"),
          ("--ap-icon", "44px", "Listing icon frame")]

RADIUS = [("--ap-r-alert", "13px"), ("--ap-r-btn", "14px"),
          ("--ap-r-island", "100px"), ("--ap-r-phone", "52px")]

TOKENS_CSS = """body{background:#F3F2F0}
.sheetcard{width:430px;height:932px;background:#fff;border-radius:20px;padding:14px 20px 10px;border:1px solid rgba(0,0,0,.10);box-shadow:0 18px 44px rgba(29,25,26,.14);overflow:hidden;color:var(--ap-ink)}
header{display:flex;gap:12px;align-items:flex-start;padding-bottom:6px;border-bottom:1px solid rgba(0,0,0,.10)}
header h1{font:590 15px/19px var(--ap-font)}
header p{font:400 9.5px/13px var(--ap-font);color:var(--ap-grey);margin-top:3px}
.mark{width:28px;height:28px;flex:none;border-radius:7px;background:var(--ap-accent);color:var(--ap-white);position:relative}
.mark svg{position:absolute;left:4px;top:6px;width:20px;height:16.5px}
h2{font:600 9.5px/12px var(--ap-font);letter-spacing:.8px;text-transform:uppercase;color:var(--ap-grey);margin:7px 0 3px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.chip{height:18px;border-radius:5px;border:1px solid rgba(0,0,0,.08)}
.swm b{display:block;font:600 9px/12px ui-monospace,Menlo,monospace}
.swm i{display:block;font:400 9px/12px ui-monospace,Menlo,monospace;color:var(--ap-grey);font-style:normal}
.swm s{display:block;font:400 9px/12px var(--ap-font);color:var(--ap-sep);text-decoration:none}
.tr{display:flex;align-items:baseline;gap:8px;padding:1px 0;border-bottom:1px solid rgba(0,0,0,.08)}
.tr em{flex:none;width:74px;font:400 9px/12px ui-monospace,Menlo,monospace;color:var(--ap-grey);font-style:normal}
.tr span{flex:1;min-width:0;overflow:hidden;white-space:nowrap}
.tr s{flex:none;width:112px;text-align:right;font:400 9px/12px var(--ap-font);color:var(--ap-sep);text-decoration:none}
.rad{display:flex;gap:12px}
.rad div{text-align:center}
.rb{width:46px;height:24px;background:#F2F2F7;border:1px solid rgba(0,0,0,.10)}
.rad small{font:400 9px/14px ui-monospace,Menlo,monospace;color:var(--ap-grey)}
table{width:100%;border-collapse:collapse;table-layout:fixed}
td{font:400 9px/10.5px ui-monospace,Menlo,monospace;padding:0;border-bottom:1px solid rgba(0,0,0,.08);vertical-align:top}
td.t{width:116px}
td.v{width:70px;color:var(--ap-grey)}
td.e{color:var(--ap-sep);font-family:var(--ap-font);font-size:9.5px}
.comp{display:flex;gap:18px;align-items:center;margin-top:4px}
.cta2{width:160px;height:38px;border-radius:var(--ap-r-btn);background:var(--ap-accent);color:var(--ap-white);display:grid;place-items:center;font:var(--ap-t-nav)}
.isl{width:63px;height:18.5px;border-radius:var(--ap-r-island);background:var(--ap-black)}
.hb{width:70px;height:5px;border-radius:var(--ap-r-island);background:var(--ap-ink)}
.tabdemo{display:flex;gap:22px;align-items:flex-end;color:var(--ap-grey)}
.tabdemo span{display:flex;flex-direction:column;align-items:center;gap:3px}
.tabdemo span.on{color:var(--ap-accent)}
.tabdemo b{font:var(--ap-t-tab)}
.tabdemo svg{display:block}"""

BLURB = ("""Read out of the Figma community file "Apple Photos &middot; iOS" in
393pt mode: variables for the metrics, the file's own type styles for the ramp,
auto-layout for the boxes. Nothing here was sampled off a screenshot.""")


def tokens_board():
    sw = ""
    for group, items in SW:
        sw += '<h2>%s</h2><div class="grid">' % group
        for tok, val, src in items:
            sw += ('<div><div class="chip" style="background:var(%s)"></div>'
                   '<div class="swm"><b>%s</b><i>%s</i><s>%s</s></div></div>'
                   % (tok, tok[5:], val, src))
        sw += "</div>"

    ty = "".join('<div class="tr"><em>%s</em><span style="font:var(%s)">%s</span><s>%s</s></div>'
                 % (tok[5:], tok, label, use) for tok, label, use in TYPE)
    rad = "".join('<div><div class="rb" style="border-radius:var(%s)"></div>'
                  '<small>%s</small></div>' % (tok, val) for tok, val in RADIUS)
    rows = "".join('<tr><td class="t">%s</td><td class="v">%s</td><td class="e">%s</td></tr>'
                   % (tok, val, src) for tok, val, src in METRIC)
    tabdemo = "".join('<span class="%s">%s<b>%s</b></span>'
                      % ("on" if i == 0 else "", glyph(n), label)
                      for i, (n, label, _) in enumerate(TABS))

    body = """<div class="sheetcard">
<header><div class="mark">%s</div><div><h1>Apple Photos, iOS: design tokens</h1>
<p>%s</p></div></header>
%s
<h2>Type</h2><div>%s</div>
<h2>Radius</h2><div class="rad">%s</div>
<h2>Metrics</h2><table>%s</table>
<h2>Components</h2>
<div class="comp"><div class="cta2">Continue</div><div class="isl"></div><div class="hb"></div></div>
<div class="comp"><div class="tabdemo">%s</div></div>
</div>""" % (glyph("tab-photos"), BLURB, sw, ty, rad, rows, tabdemo)
    return page("Apple Photos - design tokens", TOKENS_CSS, body)


# ---------------------------------------------------------------- refs

REFS = [
    ("ref-01-all-photos.html", "Reference: All Photos", "ref-all-photos.png"),
    ("ref-02-whats-new.html", "Reference: What's New", "ref-whats-new.png"),
    ("ref-03-notifications.html", "Reference: Notifications",
     "ref-notifications.png"),
]


def ref_board(title, png):
    b = base64.b64encode(open(os.path.join(ASSETS, "refs", png), "rb").read()).decode()
    css = PHONE + "\n.phone img{display:block;width:var(--ap-w);height:var(--ap-h)}"
    return page(title, css,
                '<div class="phone"><img alt="" src="data:image/png;base64,%s"></div>' % b)


# ---------------------------------------------------------------- write

LAYOUT = {
    "name": "(example) Apple Photos, iOS: grid, What's New, permissions",
    "rows": [
        {"title": "Foundations",
         "files": [{"file": "00-design-tokens", "label": "Design tokens"}]},
        {"title": "Apple Photos replica screens", "numbered": True,
         "files": [{"file": "01-all-photos", "label": "All Photos"},
                   {"file": "02-whats-new", "label": "What's New"},
                   {"file": "03-notifications", "label": "Notifications permission"}]},
        {"title": "Source of truth: Figma renders", "numbered": True,
         "files": [{"file": "ref-01-all-photos", "label": "All Photos"},
                   {"file": "ref-02-whats-new", "label": "What's New"},
                   {"file": "ref-03-notifications", "label": "Notifications permission"}]},
    ],
}


def main():
    files = {
        "00-design-tokens.html": tokens_board(),
        "01-all-photos.html": all_photos(),
        "02-whats-new.html": whats_new(),
        "03-notifications.html": notifications(),
    }
    for name, title, png in REFS:
        if os.path.exists(os.path.join(ASSETS, "refs", png)):
            files[name] = ref_board(title, png)
        else:
            print("%-32s skipped, no assets/refs/%s" % (name, png))
    for name, html in files.items():
        open(os.path.join(OUT, name), "w", encoding="utf-8").write(html)
        print("%-32s %6d KB" % (name, len(html.encode()) // 1024))
    with open(os.path.join(OUT, "layout.json"), "w") as f:
        json.dump(LAYOUT, f, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
