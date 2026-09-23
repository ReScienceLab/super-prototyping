"""Lift glyphs out of a whole-screen Figma SVG export into assets/icons/.

    python3 iconkit.py screen.svg name=GroupId [name=GroupId ...]

Figma draws SF Symbols as private-use text glyphs, so a per-layer SVG export
comes back as a fragment with no symbol in it. Only the whole-node export
outlines them. This pulls one <g> out of that export by its Figma layer id,
keeps the original viewBox so nothing moves, then measures the result in
Chrome with getBBox() and retightens the viewBox onto the ink. Every file it
writes therefore has viewBox == ink box, which is what gen.py's icon() relies
on to place a glyph at its Figma offset.

A GroupId is the `id=` Figma wrote on the layer, HTML-unescaped (it writes
emoji as numeric entities); `GroupId-N` takes the Nth child instead. Run with
no pairs to list every id in the file.
"""
import copy
import html
import json
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)  # or the HTML parser sees <ns0:svg> and getBBox is gone
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "icons")


def name_of(e):
    """Figma escapes a layer name one UTF-8 *byte* at a time, so `&#226;&#128;
    &#186;` unescapes to three latin-1 characters rather than to the one it
    means. Put the bytes back together."""
    n = html.unescape(e.get("id"))
    try:
        return n.encode("latin-1").decode("utf-8")
    except UnicodeError:
        return n


def index(root):
    """{layer name: element} over every tag, not just <g>. Figma's ids are
    unique per export (it appends _2, _3), so this cannot collide."""
    return {name_of(e): e for e in root.iter() if e.get("id")}


def select(found, sel):
    """`Id`, or `Id-N` for the Nth child -- which is how you get one SF Symbol
    out of a layer that holds a glyph and its label side by side."""
    if "-" in sel and sel.rsplit("-", 1)[1].isdigit() and sel not in found:
        parent, n = sel.rsplit("-", 1)
        return found[parent][int(n)]
    return found[sel]


def standalone(root, g):
    """The group alone, in the export's own coordinate system, recolourable.
    Figma writes a literal fill on every leaf; currentColor on the root plus no
    fill below it is what lets one file serve the light and the dark board.
    Opacity survives, so the battery's 40% shell and the empty signal bars do
    too."""
    g = copy.deepcopy(g)
    for e in [g] + list(g.iter()):
        e.attrib.pop("fill", None)
        e.attrib.pop("id", None)
        e.attrib.pop("clip-path", None)  # its <defs> stays behind, and at the
        # glyph's own ink box there is nothing left to clip anyway
    svg = ET.Element("{%s}svg" % SVG, {k: root.get(k) for k in
                                       ("width", "height", "viewBox") if root.get(k)})
    svg.set("fill", "currentColor")
    svg.append(g)
    return ET.tostring(svg, encoding="unicode")


def measure(items):
    """getBBox() per icon, from the engine that will render them."""
    doc = "".join('<div id="%s">%s</div>' % (n, s) for n, s in items)
    js = ("<script>document.body.textContent=JSON.stringify("
          "[...document.querySelectorAll('div')].map(d=>[d.id,"
          "(b=>[b.x,b.y,b.width,b.height])(d.firstChild.getBBox())]))</script>")
    path = os.path.join(OUT, ".measure.html")
    open(path, "w", encoding="utf-8").write(doc + js)
    dom = subprocess.run([CHROME, "--headless", "--disable-gpu", "--dump-dom",
                          "file://" + path], capture_output=True, text=True).stdout
    os.remove(path)
    return dict(json.loads(re.search(r"<body>(\[.*\])</body>", dom, re.S).group(1)))


def main(src, pairs):
    root = ET.parse(src).getroot()
    found = index(root)
    if not pairs:
        return print("\n".join(sorted(found)))
    os.makedirs(OUT, exist_ok=True)
    items = [(n, standalone(root, select(found, sel))) for n, sel in
             (p.split("=", 1) for p in pairs)]
    for name, box in measure(items).items():
        svg = dict(items)[name]
        svg = re.sub(r'width="[^"]*" height="[^"]*" viewBox="[^"]*"',
                     'width="%g" height="%g" viewBox="%g %g %g %g"'
                     % (box[2], box[3], box[0], box[1], box[2], box[3]), svg, 1)
        open(os.path.join(OUT, name + ".svg"), "w", encoding="utf-8").write(svg)
        print("%-22s %8.3f %8.3f %8.3f %8.3f" % ((name,) + tuple(box)))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
