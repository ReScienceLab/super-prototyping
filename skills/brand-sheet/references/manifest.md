# The manifest, the checks, and the wiring

Read this when you have the files and are ready to describe them.

## Schema

`assets/brand/manifest.json` is a JSON array of rows, in canonical order:

```json
[
  {
    "title": "Logo & wordmark",
    "images": [
      {
        "file": "assets/brand/identity/wordmark-black.svg",
        "label": "Wordmark, black",
        "w": 1600,
        "h": 420,
        "source": "https://example.com/brand",
        "provenance": "theirs"
      }
    ]
  }
]
```

Every field is required on every image.

| field | what it is |
|---|---|
| `file` | path relative to the canvas folder, exactly where the file is |
| `label` | the caption a human reads: "App Store screenshot 3 — search", not "screenshot" |
| `w` / `h` | the pixel size, from `sips -g pixelWidth -g pixelHeight <file>` |
| `source` | the human-readable page, never a signed CDN URL |
| `provenance` | `"theirs"` or `"archive"`. Nothing else, ever |

`w`/`h` are the image's own pixel size, not the size it draws at. The canvas
and the brand page both size a shape from them and pick a row's column count
from the row's **median** aspect ratio, so one wrong pair can reshape the whole
row, not only its own card.

An SVG has no pixel size. Use the `viewBox`, or the `width`/`height`
attributes, whichever the file has.

`source` may be prose when the page URL alone would not lead a reader back to
the asset, e.g. `https://example.com/brand (Logo section) via Wayback Machine
snapshot 20260907013431`. The brand page takes the first token as the domain
and links it when it parses as a URL, so keep the scheme on the front.

## Per-file rules

Each must hold, or the file does not go in the manifest:

- The file sits under `assets/brand/` and ends in `.png`, `.jpg`, `.jpeg`,
  `.webp`, `.gif` or `.svg`, with no `#` or `?` in the name. That is exactly
  what the canvas gives a URL to; anything else is dropped before it becomes a
  shape, and the browser check below cannot see what was never drawn.
- `file <path>` reports a real image type. An HTML challenge page or a JSON 404
  body saved as `.jpg` is a failure. Delete it. A TIFF or a BMP is a real image
  and still unpublishable — convert it.
- The extension matches the bytes. PNG under `.jpg` and WebP under `.png` have
  both happened. `file` is the authority; rename to match, and convert HEIF
  rather than renaming it (`sips -s format jpeg in.heic --out out.jpg`).
- Longest edge ≤ **1600px** (`sips -Z 1600 <file>`), file < **1.2 MB**. The
  script below fails at 1700px and 1.26 MB, so a file it passes can still be
  over the target and worth shrinking.
- Shortest edge ≥ **150px**. A 48px favicon renders as a broken card; skip it.
  This is a raster rule and the script applies it only to raster files. An SVG
  redraws at any size, so its `w`/`h` only have to carry the right ratio: a
  `64 64` viewBox is a fine square mark, and two of the shipped folders ship
  one. The script checks that ratio against the viewBox, because a typo there
  silently reshapes the whole row.
- Never upscale anything.
- SVG must start with `<svg` or `<?xml`, and must not be white-on-transparent,
  which renders as a blank card on the sheet's light cards. Open it and read
  the fills.

## The verification script

Run it from the canvas folder. `NO PROBLEMS` is the bar; do not report done
until it prints that, and paste its full output in your report.

Put any pre-existing non-brand file under `assets/brand/` — a picture the
generator inlines into a board rather than drawing as a row — in `IGNORE`, so
it is not reported as an orphan. `git ls-files assets/brand/` lists them. Do
not add them to the manifest.

```bash
python3 - <<'PY'
import json, re, subprocess, pathlib, hashlib, collections
CANON = ["Logo & wordmark","Typeface","Art direction","Applied identity","X","Instagram",
         "TikTok","YouTube","LinkedIn","App Store","Google Play","Microsoft Store",
         "Announcement cards","Paid advertising","Press photography"]
EXT = {"JPEG": (".jpg",".jpeg"), "PNG": (".png",), "GIF": (".gif",),
       "Web/P": (".webp",), "SVG": (".svg",)}
PUB = (".png",".jpg",".jpeg",".webp",".gif",".svg")   # what the canvas gives a URL to
IGNORE = set()          # pre-existing non-brand files under assets/brand/
rows = json.load(open('assets/brand/manifest.json'))
seen, bad = collections.defaultdict(list), []
it = iter(CANON)
off = next((r['title'] for r in rows if r['title'] not in it), None)
if off: bad.append(f"ROW-ORDER unknown or out-of-order title: {off!r}")
for r in rows:
    if not r['images']: bad.append(f"EMPTY-ROW {r['title']}")
    for i in r['images']:
        p = pathlib.Path(i['file'])
        if not p.exists(): bad.append(f"MISSING {i['file']}"); continue
        if (not i['file'].startswith('assets/brand/') or p.suffix.lower() not in PUB
                or re.search(r'[#?]', i['file']) or p.name.startswith('.')):
            bad.append(f"UNPUBLISHABLE {i['file']}: the canvas serves only "
                       f"assets/brand/**/*{PUB}, no # or ? in the name")
        seen[hashlib.md5(p.read_bytes()).hexdigest()].append(i['file'])
        kind = subprocess.run(['file','-b',str(p)],capture_output=True,text=True).stdout
        if not any(k in kind for k in ('image','JPEG','PNG','SVG','WebP','GIF','bitmap','XML')):
            bad.append(f"NOT-AN-IMAGE {i['file']}: {kind.strip()[:60]}")
        want = next((v for k, v in EXT.items() if k in kind), None)
        if want and p.suffix.lower() not in want:
            bad.append(f"EXT {i['file']}: bytes are {want[0]}")
        if p.stat().st_size > 1_260_000: bad.append(f"TOO-BIG {i['file']} {p.stat().st_size//1024}KB")
        if p.suffix != '.svg':
            o = subprocess.run(['sips','-g','pixelWidth','-g','pixelHeight',str(p)],
                               capture_output=True,text=True).stdout
            m = dict(re.findall(r'(pixelWidth|pixelHeight): (\d+)', o))
            w,h = int(m.get('pixelWidth',0)), int(m.get('pixelHeight',0))
            if (w,h) != (i['w'],i['h']): bad.append(f"SIZE {i['file']}: declared {i['w']}x{i['h']} actual {w}x{h}")
            if min(w,h) < 150: bad.append(f"TOO-SMALL {i['file']}: {w}x{h}")
            if max(w,h) > 1700: bad.append(f"TOO-WIDE {i['file']}: {w}x{h}")
        else:
            box = re.search(r'viewBox\s*=\s*["\']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)',
                            p.read_text(errors='ignore')[:4000])
            if box:
                vw, vh = float(box.group(1)), float(box.group(2))
                if vh and abs(i['w']/i['h'] - vw/vh) > 0.02:
                    bad.append(f"SVG-ASPECT {i['file']}: declared {i['w']}x{i['h']}, viewBox {vw:g}x{vh:g}")
        if i.get('provenance') not in ('theirs','archive'): bad.append(f"PROVENANCE {i['file']}")
        for k in ('file','label','w','h','source','provenance'):
            if not i.get(k): bad.append(f"MISSING-FIELD {k} in {i['file']}")
for h, fs in seen.items():
    if len(fs) > 1: bad.append("DUPLICATE " + " == ".join(fs))
used = {i['file'] for r in rows for i in r['images']}
for p in pathlib.Path('assets/brand').rglob('*'):
    if p.is_file() and p.name != 'manifest.json' and str(p) not in used and str(p) not in IGNORE:
        bad.append(f"ORPHAN {p}")
print(f"{len(rows)} rows, {sum(len(r['images']) for r in rows)} images")
for r in rows: print(f"  {len(r['images']):>3}  {r['title']}")
print("\n".join(bad) if bad else "NO PROBLEMS")
PY
```

It catches byte-identical duplicates only. Two crops or two sizes of one
picture pass it, so that pair is caught by eye; keep the larger.

## Wiring `gen.py`

`gen.py` is the only source of truth for a folder's `layout.json`. Never
hand-edit the JSON; add the read to the generator and regenerate.

```python
BRAND_DIR = OUT / "assets" / "brand"
```

next to the folder's other directory constants. Then append the manifest rows
wherever that folder finishes its rows list. Generators here come in two
shapes:

```python
def layout():
    rows = [...]                                                          # board rows
    rows += json.loads((BRAND_DIR / "manifest.json").read_text())
    return {"name": PAGE_NAME, "rows": rows}
```

```python
LAYOUT = {"name": PAGE_NAME, "rows": [...]}                               # module level
LAYOUT["rows"] += json.loads((BRAND_DIR / "manifest.json").read_text())   # before write_text
```

Two things about that line:

- It goes **after every board row**. All the `files` rows, then all the
  `images` rows.
- The read is unconditional, with no `if BRAND_DIR.exists()`. Add the line only
  once the manifest is written. A generator whose output depends on what is on
  disk is the bug the next section is about.

Then regenerate and read the diff:

```bash
python3 gen.py && git diff --stat layout.json
```

## gen.py must be a no-op

Running `python3 gen.py` on a clean checkout, with nothing built and nothing
captured, must reproduce the committed `layout.json` byte for byte. Wiring the
manifest in is the first time anyone runs the generator in a while, so this is
where a latent violation surfaces.

**If the diff deletes rows, stop.** You have found a real bug, and regenerating
again would commit the damage.

The usual cause is a row gated on files that are gitignored:

```python
if "ref-" + s in names:            # wrong
    rows.append({"title": "Source of truth: captures", ...})
```

On the machine that wrote those files the row exists; on a clean checkout it
vanishes, taking its committed entries with it.

The fix is to declare the row unconditionally and let the canvas do the
skipping, because it already does:

```python
# declared even though ref-*.html is gitignored: the canvas skips a row entry
# whose file is absent and drops the row when none of them resolve, so this one
# file is the same on a clean checkout as it is beside the captures -- which is
# what makes `python3 gen.py` a no-op either way
rows.append({"title": "Source of truth: captures", "numbered": True,
             "files": [{"file": "ref-" + s, "label": l} for s, l, _ in screens]})
```

Fix the generator, not its output. Then run it again and confirm the diff is a
pure addition: your brand rows, nothing removed.

## What happens next, with no further change

- The canvas draws the rows as image shapes under the boards.
- The "Brand sheet" button appears in that canvas's toolbar; the canvas
  shows it for any folder whose layout has a row with images.
- The folder joins the brand page's app-icon switcher.
- The build generates a downscaled WebP variant for each image and the page
  serves it through `srcset`, so an oversized original costs the reader nothing
  and the repository its full size. Respect the 1600px / 1.2 MB ceilings.
