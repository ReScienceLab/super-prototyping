#!/usr/bin/env python3
"""Emit the apple-icons boards. Artboards are output, never source: edit this
file, not the HTML. Sources are the board's assets/ and assets-dark/."""
import base64, io, os
from PIL import Image

OUT = os.path.dirname(os.path.abspath(__file__))
ICON_PX = 160          # 2x the 80px display size; sources are 264 square

# The 43 icons in the reading order of Figma nodes 5:2 and 5:89, read straight
# off the nodes' x/y. Both appearance sets use the same arrangement. Nearly
# alphabetical but not quite (Camera after Contacts, Games after Home, Keynote
# between Maps and Measure, Music after News, Safari after Shortcuts, TV after
# Stocks), so the order is transcribed rather than sorted. The nodes' own
# 7-across shape is not kept: 7 columns leaves the artboard half empty, and a
# plain 5-across tile fills it.
ORDER = [
    "AirDrop", "Books", "Calculator", "Calendar", "Clock", "Contacts", "Camera",
    "FaceTime", "Files", "FindMy", "Fitness", "Freeform", "Home", "Games",
    "Health", "iTunesStore", "Mail", "Maps", "Keynote", "Measure", "Messages",
    "News", "Music", "Notes", "Numbers", "Pages", "Passwords", "Phone",
    "Photos", "Podcasts", "Preview", "Reminders", "Shortcuts", "Safari",
    "Settings", "Stocks", "TV", "Translate", "VoiceMemos", "Wallet", "Watch",
    "Weather", "AppStore",
]

LABELS = {
    "AirDrop": "AirDrop", "AppStore": "App Store", "Books": "Books",
    "Calculator": "Calculator", "Calendar": "Calendar", "Camera": "Camera",
    "Clock": "Clock", "Contacts": "Contacts", "FaceTime": "FaceTime",
    "Files": "Files", "FindMy": "Find My", "Fitness": "Fitness",
    "Freeform": "Freeform", "Games": "Games", "Health": "Health",
    "Home": "Home", "iTunesStore": "iTunes Store", "Keynote": "Keynote",
    "Mail": "Mail", "Maps": "Maps", "Measure": "Measure",
    "Messages": "Messages", "Music": "Music", "News": "News",
    "Notes": "Notes", "Numbers": "Numbers", "Pages": "Pages",
    "Passwords": "Passwords", "Phone": "Phone", "Photos": "Photos",
    "Podcasts": "Podcasts", "Preview": "Preview", "Reminders": "Reminders",
    "Safari": "Safari", "Settings": "Settings", "Shortcuts": "Shortcuts",
    "Stocks": "Stocks", "Translate": "Translate", "TV": "TV",
    "VoiceMemos": "Voice Memos", "Wallet": "Wallet", "Watch": "Watch",
    "Weather": "Weather",
}


def icon_uri(folder, stem):
    im = Image.open(os.path.join(OUT, folder, stem + ".png")).convert("RGBA")
    im = im.resize((ICON_PX, ICON_PX), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


# 5 columns is what fills a 478 x 980 artboard: 43 icons make 9 rows, and the
# tile stands 88% as tall as the board. 6 columns drops that to 65%, 7 to 49%.
# --a-pad is the width left over once the columns and gutters are placed,
# halved, so the tile is centred by arithmetic rather than by margin:auto.
# No background token: neither board paints a ground, so both sets sit on
# whatever the canvas is. refkit requires one :root shared byte for byte
# across a folder, and with no ground to vary the two boards share this one.
TOKENS = """:root{
  --a-font:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Helvetica Neue",Helvetica,Arial,sans-serif;
  --a-mono:ui-monospace,Menlo,monospace;

  --a-credit:#8E8E93;      /* reads on a light or a dark canvas */

  --a-cols:5;
  --a-icon:80px;
  --a-gap:12px;
  --a-pad:15px;            /* (478 - 5*80 - 4*12) / 2 */
}"""

CREDIT = ("Apple system app icons, iOS 26 / macOS Tahoe 26. Figma Community "
          "file KdGn8IPLn6hJb9rhFlDNUk, node {node}.")


def board(folder, node, title):
    cells = "".join(
        f'<img src="{icon_uri(folder, s)}" alt="{LABELS[s]}" title="{LABELS[s]}">'
        for s in ORDER
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{title}</title>
<style>
/* ============================================================================
   {title.upper()} -- the 43 native iOS 26 / macOS Tahoe 26 icons,
   tiled 5 across on nothing. No ground, no card, no header, no chrome: the
   icons are the board. Order is Figma node {node}'s reading order.
   The canvas renders this in <iframe srcDoc sandbox="">, which blocks external
   stylesheets, so the token block is inlined.
   ========================================================================= */
{TOKENS}

*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:var(--a-font);-webkit-font-smoothing:antialiased;
  height:980px;padding:var(--a-pad);
  display:flex;flex-direction:column;justify-content:center}}

.tile{{display:grid;justify-content:center;
  grid-template-columns:repeat(var(--a-cols), var(--a-icon));gap:var(--a-gap)}}
.tile img{{width:var(--a-icon);height:var(--a-icon);display:block}}

/* The one piece of text on the board. Third-party art gets a visible credit. */
footer{{position:fixed;left:var(--a-pad);right:var(--a-pad);bottom:12px;
  font:400 9px/12px var(--a-mono);color:var(--a-credit)}}
</style>
</head>
<body>

<div class="tile">{cells}</div>
<footer>{CREDIT.format(node=node)}</footer>

</body>
</html>
"""


BOARDS = [
    ("00-icon-set", "assets", "5:2", "Apple System App Icons"),
    ("01-icon-set-dark", "assets-dark", "5:89", "Apple System App Icons, Dark"),
]

LAYOUT = """{
  "name": "Apple Icons (example)",
  "rows": [
    {
      "title": "Apple system app icons",
      "files": [
        { "file": "00-icon-set", "label": "Default appearance" },
        { "file": "01-icon-set-dark", "label": "Dark appearance" }
      ]
    }
  ]
}
"""

if __name__ == "__main__":
    for name, folder, node, title in BOARDS:
        p = os.path.join(OUT, name + ".html")
        with open(p, "w") as f:
            f.write(board(folder, node, title))
        print("%-24s %6d KB" % (name + ".html", os.path.getsize(p) // 1024))
    with open(os.path.join(OUT, "layout.json"), "w") as f:
        f.write(LAYOUT)
    print("layout.json")
