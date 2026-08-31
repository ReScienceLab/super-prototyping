#!/usr/bin/env python3
"""Builds walkassets.json: the crops the walkthrough row shows.

gen.py stays dependency-free by reading finished data: URIs out of a JSON file,
the same arrangement as assets.json. This is the script that produces them, kept
here so the chain is inspectable rather than magic.

It needs the full-resolution captures, which are too large to commit (the
committed refassets.json holds display-sized JPEGs for the reference boards).
Point it at the directory holding s1.png .. s8.png at 1179x2556:

    python3 mkwalk.py /path/to/refs
"""
import base64, io, json, pathlib, subprocess, sys, tempfile

from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).resolve().parent
REFKIT = HERE.parents[2] / 'tools' / 'refkit.py'
SRC = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.')
SCALE = 3.0  # capture px per design pt, measured: 1179/393 and 2556/852

# Regions to call out on the overview board, in design pt, with the technique
# each one needs. These are the same boxes the evidence rows were measured in.
REGIONS = [
    ('hero',     (20, 75, 373, 428),   '#E38A8A'),
    ('title',    (20, 450, 373, 520),  '#F1CD8A'),
    ('date',     (20, 528, 262, 554),  '#8AC7F1'),
    ('buttons',  (20, 564, 373, 619),  '#9BE38A'),
    ('location', (20, 634, 373, 700),  '#C79BE3'),
]

def uri(im, fmt='PNG', q=92):
    b = io.BytesIO()
    im.save(b, fmt, quality=q) if fmt == 'JPEG' else im.save(b, fmt)
    return 'data:image/%s;base64,%s' % (fmt.lower(), base64.b64encode(b.getvalue()).decode())

def pt(im, box, pad=0):
    """Crop by a design-pt box, so the numbers here match the evidence rows."""
    x0, y0, x1, y1 = box
    return im.crop((int(x0 * SCALE) - pad, int(y0 * SCALE) - pad,
                    int(x1 * SCALE) + pad, int(y1 * SCALE) + pad))

def zoom(im, f):
    return im.resize((im.width * f, im.height * f), Image.NEAREST)

s1 = Image.open(SRC / 's1.png').convert('RGB')
s2 = Image.open(SRC / 's2.png').convert('RGB')
s5 = Image.open(SRC / 's5.png').convert('RGB')
out = {}

# --- 1. the capture with its measured regions drawn on it ---------------------
over = s1.resize((393, 852), Image.LANCZOS)
d = ImageDraw.Draw(over, 'RGBA')
for name, (x0, y0, x1, y1), col in REGIONS:
    d.rectangle([x0, y0, x1, y1], outline=col, width=2)
    d.rectangle([x0, y0 - 12, x0 + 7 * len(name) + 6, y0], fill=col)
    d.text((x0 + 3, y0 - 11), name, fill='#1B1815')
out['overview'] = uri(over, 'JPEG')

# --- 2. a real refkit grid, at design-pt scale so the labels read as pt -------
with tempfile.TemporaryDirectory() as td:
    td = pathlib.Path(td)
    s1.resize((393, 852), Image.LANCZOS).save(td / 'pt.png')
    subprocess.run([sys.executable, str(REFKIT), 'grid', str(td / 'pt.png'),
                    '-o', str(td / 'g.png'), '--zoom', '2', '--minor', '10',
                    '--major', '50'], check=True, capture_output=True)
    g = Image.open(td / 'g.png').convert('RGB')
    y0, y1 = 430, 625                       # pt, the title block through the buttons
    crop = g.crop((0, y0 * 2, 786, y1 * 2)).convert('RGB')
    lab = Image.new('RGB', (crop.width + 34, crop.height + 16), '#1B1815')
    lab.paste(crop, (34, 16))
    # Only the x labels need redrawing: refkit rides them on the image's top edge,
    # which a mid-image crop cuts away. The y labels sit in the left gutter, kept.
    d2 = ImageDraw.Draw(lab)
    for x in range(50, 393, 50):
        d2.text((x * 2 + 36, 3), str(x), fill='#F1CD8A')
    out['grid'] = uri(lab, 'JPEG')

# --- 3. type specimens, NEAREST so the pixel grid stays visible --------------
out['w_title'] = uri(zoom(pt(s1, (20, 446, 373, 482)), 2))          # 600 28/34
out['w_nav']   = uri(zoom(pt(s2, (40, 78, 352, 102)), 3))           # 600 17/22, tracked
out['w_body']  = uri(zoom(pt(s1, (20, 526, 262, 554)), 3))          # 400 17/22
out['w_label'] = uri(zoom(pt(s5, (20, 386, 200, 404)), 4))          # 500 15/20 amber

# --- 4. colour techniques, one crop each -------------------------------------
out['c_flat'] = uri(zoom(pt(s1, (112, 566, 192, 618)), 3))          # flat-neighbour census
out['c_ink']  = uri(zoom(pt(s1, (20, 452, 180, 482)), 3))           # lightest few percent

(HERE / 'walkassets.json').write_text(json.dumps(out) + '\n')
print('walkassets.json', sum(len(v) for v in out.values()), 'chars', len(out), 'keys')
