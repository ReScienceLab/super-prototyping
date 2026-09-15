---
name: brand-kit
description: Collect a product's official brand and promotional material and put it on its prototype canvas as image rows, one row per surface. Covers the company's own brand kit, the App Store, Google Play and Microsoft Store listings, verified social accounts, the newsroom and the marketing site; writing assets/brand/manifest.json with real pixel sizes, a source and a provenance on every file; wiring the folder's generator to read it; and verifying every file before it is listed. Use when asked to add branding, brand material, a brand kit, logos, app-store screenshots, ads or press photography to a canvas, or to build a brand kit for a product.
license: Apache-2.0
compatibility: Requires python3, curl, and the file and sips commands (macOS). Network access to the company's own sites and to the app stores. Social post collection needs whatever API or skill you already have for X, Instagram, TikTok, YouTube and LinkedIn; without one, collect the surfaces that do not need it and say so.
---

# Brand kit

A canvas folder holds boards: HTML artboards you built. This adds a second
kind of row to the same folder — **pictures the company published**, laid out
as image shapes rather than boards. Logos, type specimens, store screenshots,
social posts, ad creative, press photography.

The point is comparison down a column. Rows are **surfaces**, not asset types,
so the avatar on X sits above the avatar on Instagram sits above the avatar on
TikTok, and one that disagrees with the others shows up as a break in the
column rather than as something you have to go looking for.

Read `references/sources.md` before collecting. It is the per-surface
playbook, in yield order, with the calls. Read `references/manifest.md` when
you get to writing the manifest and wiring the generator; it carries the
schema, the verification script and the gen.py rule.

## What you are producing

```
mockups/canvases/<slug>/
  assets/brand/
    manifest.json          the source of record: rows, in canonical order
    identity/  social/  stores/  ads/  press/
  gen.py                   reads the manifest, appends its rows to layout.json
  layout.json              what the canvas and the brand page actually render
```

`assets/brand/` is the only part of `assets/` the canvas gives a URL to. The
generator inlines everything else under `assets/` into a board as a data: URI,
so a picture that needs to be its own shape has to live here.

## The seven steps

**Never write the manifest first.** Every file in it must already have passed
verification. A file that fails is deleted; it does not get a manifest entry
with a caveat in the label.

1. **Look at a finished one.** The plugin ships twelve. List them and print
   one's rows:
   ```bash
   KIT="$(sp-canvas root)"
   ls "$KIT"/mockups/canvases/*/assets/brand/manifest.json
   python3 -c 'import json,sys
   for r in json.load(open(sys.argv[1])): print(len(r["images"]), r["title"])' \
     "$KIT/mockups/canvases/claude-ios/assets/brand/manifest.json"
   ```
2. **The company's own brand or press kit.** Full-resolution logos, the type
   and the colour values come from here, so check it first. See
   `references/sources.md`.
3. **Store listings.** The most reliable bulk source, and an API returns every
   screenshot at once.
4. **Social.** The avatar, the banner, and 4–8 posted visuals per platform.
   Verify every handle first — see "Verify the account, not the handle" below.
5. **Marketing site and newsroom.** Hero art, feature-page illustration,
   og:image cards, press photography.
6. **Verify every file.** Bytes, extension, dimensions, size, duplicates.
   `references/manifest.md` has the script. It must print `NO PROBLEMS`.
7. **Write the manifest, wire `gen.py`, regenerate, look at it in a browser.**

## Rows are a fixed vocabulary

Row titles come from this list, and the rows you write must appear as a
subsequence of it: this order, skipping any that do not apply.

```
Logo & wordmark · Typeface · Art direction · Applied identity ·
X · Instagram · TikTok · YouTube · LinkedIn ·
App Store · Google Play · Microsoft Store ·
Announcement cards · Paid advertising · Press photography
```

Identity first, then one row per platform. Two of those titles are not
self-evident, so to match the shipped folders:

- **Art direction** is the imagery style the company itself publishes:
  illustration systems, hero art, photography treatment, character studies,
  guideline art.
- **Applied identity** is the identity on things: product UI, posters,
  signage, event stages, merchandise.

Do not invent a row title. If a surface does not exist for this product, leave
it out: an absent row is correct, an empty row is a bug, and a row of
something else's material is a lie.

## How much

The twelve shipped folders run 50 to 144 assets, most between 70 and 120.
Breadth across surfaces is the point, so 4–8 posted visuals per social
platform beats forty screenshots from one store — but a store row takes all of
what the store has, which in those folders is 4 to 20.

## Five rules that decide what goes in

### Provenance is binary and it is never a guess

`"theirs"` means the company published it. `"archive"` means a curated brand
archive did, and an archive counts as one only when it names the original
source and date for each item. If you can establish neither, **the asset does
not go in.** This is the whole reason the sheet exists: a picture states where
it came from, and something curated by a third party never passes as something
the company put out.

### Verify the account, not the handle

Do not trust a handle you were handed, including one written in a spec. Confirm
it resolves, that it is verified where verification exists, and that it is the
right company. Squatted and dormant lookalike accounts are common: on one pass
the bare `@tiktok` on X turned out to be an unrelated local-offers account, and
the company's was `@tiktok_us`.

Say in your report which handles and store ids you used, and which ones turned
out to be wrong.

### A 200 is not proof the page exists

Marketing sites and newsrooms are usually single-page apps that serve HTTP 200
for any path, including one you made up. Check the rendered `<title>` instead.
A real article has its own; a made-up slug gets the site's generic one:

```bash
curl -sL "$URL" | grep -o '<title>[^<]*</title>'
```

Run that against a deliberately bogus slug on the same site first, so you know
what its generic title looks like. Any slug that comes back with the generic
title does not exist: drop it, and drop anything you took from it.

### The same bytes twice are one asset

After every batch of downloads, from the canvas folder:

```bash
find assets/brand -type f -exec md5 -r {} \; | sort | awk '{print $1}' | uniq -d
```

It must print nothing. If a hash collides, delete the new copy. Crops and
resizes of one picture are not byte-identical and no tool here catches them —
that one is by eye, and you keep the larger.

### The extension has to match the bytes

`file <path>` is the authority, not the URL you downloaded from. PNG saved as
`.jpg`, WebP saved as `.png` and an HTML challenge page saved as `.jpg` have
all happened. Rename to match. HEIF is converted rather than renamed, because
no browser here will draw it:

```bash
sips -s format jpeg in.heic --out out.jpg
```

## Where the files go

| group | holds |
|---|---|
| `identity` | logo, wordmark, type specimens, colour, art direction, applied identity |
| `social` | X, Instagram, TikTok, YouTube, LinkedIn |
| `stores` | App Store, Google Play, Microsoft Store |
| `ads` | paid advertising creative, announcement cards |
| `press` | press photography |

Use these five names; do not invent parallel ones. Name a file for what it is
(`x-avatar.jpg`, `appstore-iphone-03.jpg`, `wordmark-black.svg`).

Some folders already keep a picture under `assets/brand/` that the generator
inlines into a board rather than drawing as a row — a profile photo a mockup
uses, say. Those are **not** brand material; leave them exactly as they are,
and out of the manifest. Find them before you start:

```bash
git ls-files assets/brand/
```

Every path that prints goes in the verification script's `IGNORE` set, spelled
relative to the canvas folder, which is how the script compares.

## Wiring it up

One constant next to the folder's other directory constants:

```python
BRAND_DIR = OUT / "assets" / "brand"
```

and one line wherever that folder finishes its rows list. Generators here come
in two shapes, so match the one in front of you:

```python
    rows += json.loads((BRAND_DIR / "manifest.json").read_text())        # inside layout()
LAYOUT["rows"] += json.loads((BRAND_DIR / "manifest.json").read_text())  # module-level LAYOUT
```

The brand rows go **after every board row**, and the read is unconditional,
with no `if BRAND_DIR.exists()`. Add the line only once the manifest exists, or
`python3 gen.py` raises `FileNotFoundError` on the read.

Then `python3 gen.py` and check the diff to `layout.json` is a **pure
addition**. If it deletes rows, stop and read the "gen.py must be a no-op"
section of `references/manifest.md`; you have found a real bug and regenerating
would commit the damage.

The canvas picks the folder up with no further change: the row renders, the
"Brand kit" button appears in the toolbar, and the folder joins the brand
page's switcher.

## Verify in a browser before you report

Open both pages for the folder on the dev server:

```
http://127.0.0.1:<port>/?canvas=<slug>            the canvas
http://127.0.0.1:<port>/brand.html?canvas=<slug>  the brand kit
```

Run this on the **brand kit**, not the canvas. Lazy loading means a picture
that never scrolled into view also never failed, so force it and count:

```js
const imgs = [...document.querySelectorAll("main img")];
for (const i of imgs) i.loading = "eager";
await Promise.allSettled(imgs.map((i) => i.decode()));
imgs.filter((i) => i.naturalWidth === 0).length;  // must be 0
```

The canvas draws its brand rows as tldraw shapes and culls the ones off
screen, so the same count there proves nothing. Zoom to fit and look instead.

## Report

- The verification script's full output, row table included.
- Whether the company publishes a formal brand or press kit, and its URL.
- Which accounts, handles and store ids you used and verified, and any that
  turned out to be wrong, dormant, squatted, or a different company.
- Every candidate you rejected, and why: 404, blocked, not first-party, too
  small, duplicate, wrong company.
- What you could not reach, split into what does not exist and what exists but
  was blocked from here.

Gaps stated plainly beat a padded manifest. An honest "this product has no
Microsoft Store listing" is worth more than a row of something else's
screenshots.
