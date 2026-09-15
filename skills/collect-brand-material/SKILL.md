---
name: collect-brand-material
description: Collect a product's official brand and promotional material and put it on its prototype canvas as image rows, one row per surface. Covers the company's own brand kit, the App Store, Google Play and Microsoft Store listings, verified social accounts, the newsroom and the marketing site; writing assets/brand/manifest.json with real pixel sizes, a source and a provenance on every file; wiring the folder's generator to read it; and verifying before listing. Use when asked to add branding, brand material, a brand kit, logos, app-store screenshots, ads or press photography to a canvas, or to build a brand sheet for a product.
license: Apache-2.0
compatibility: Requires python3, curl, and the file and sips commands (macOS). Network access to the company's own sites and to the app stores. Social post collection needs whatever API or skill you already have for X, Instagram, TikTok, YouTube and LinkedIn; without one, collect the surfaces that do not need it and say so.
---

# Collect brand material

A canvas folder holds boards: HTML artboards you built. This adds a second
kind of row to the same folder — **pictures the company published**, laid out
as image shapes rather than boards. Logos, type specimens, store screenshots,
social posts, ad creative, press photography.

The point is comparison down a column. Rows are **surfaces**, not asset types,
so the avatar on X sits above the avatar on Instagram sits above the avatar on
TikTok, and one that disagrees with the others shows up as a break in the
column rather than as something you have to go looking for.

Read `references/sources.md` before collecting — it is the per-surface
playbook, in yield order, with the API calls. Read `references/manifest.md`
when you get to writing the manifest and wiring the generator; it carries the
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

`assets/brand/` is the only part of `assets/` the canvas gives a URL to.
Everything else under `assets/` is inlined into a board as a data: URI, so a
picture that needs to be its own shape has to live here.

## The seven steps

**Never write the manifest first.** Every file in it has to have been
verified, and a file that fails verification is deleted rather than described
around.

1. **Look at a finished one.** If the project already has a canvas with
   `assets/brand/manifest.json`, print its rows before you start. That is the
   target in one command.
2. **The company's own brand or press kit.** Highest-quality source there is;
   always check it first. See `references/sources.md`.
3. **Store listings.** The most reliable bulk source, and an API returns every
   screenshot at once.
4. **Social.** The posted content, not just the avatar and banner. Verify
   every handle first — see "Verify the account, not the handle" below.
5. **Marketing site and newsroom.** Hero art, feature-page illustration,
   og:image cards, press photography.
6. **Verify every file** — bytes, extension, dimensions, size, duplicates.
   `references/manifest.md` has the script. It must print `NO PROBLEMS`.
7. **Write the manifest, wire `gen.py`, regenerate, look at it in a browser.**

## Rows are a fixed vocabulary

Row titles come from this list, and the rows you write must appear as a
**subsequence** of it — this order, skipping any that do not apply:

```
Logo & wordmark · Typeface · Art direction · Applied identity ·
X · Instagram · TikTok · YouTube · LinkedIn ·
App Store · Google Play · Microsoft Store ·
Announcement cards · Paid advertising · Press photography
```

Constants first, then one row per platform. Do not invent a row title. If a
surface does not exist for this product, leave it out: an absent row is
correct, an empty row is a bug, and a row of something else's material is a
lie.

## How much

70–150 genuine assets is the range the finished ones sit in. Breadth across
surfaces is the point, so 4–8 real posted visuals per platform beats forty
screenshots from one store. But **a padded manifest is worse than a short
honest one** — an asset you cannot source is an asset that does not go in.

## Five rules that decide what goes in

### Provenance is binary and it is never a guess

`"theirs"` means the company published it. `"archive"` means a curated brand
archive did. If you can establish neither, **the asset does not go in.** This
is the whole reason the sheet exists: a picture states where it came from, and
something curated by a third party never passes as something the company put
out.

### Verify the account, not the handle

Do not trust a handle you were handed, including one written in a spec. Confirm
it resolves, that it is verified where verification exists, and that it is the
right company. Squatted and dormant lookalike accounts are common and they are
not a rare edge case: on one pass the bare `@tiktok` on X turned out to be an
unrelated local-offers account, while the company's is `@tiktok_us`.

Say in your report which handles and store ids you used, and which ones turned
out to be wrong.

### A 200 is not proof the page exists

Marketing sites and newsrooms are usually single-page apps that serve HTTP 200
for any path, including one you made up. Check the rendered `title` or
`og:title` instead — a real article has its own, a made-up slug gets the site's
generic one:

```bash
curl -sL "$URL" | grep -o '<title>[^<]*</title>'
```

Run that against a deliberately bogus slug on the same site first, so you know
what its generic title looks like.

### Two crops of one image are one asset

Ship one. After every batch of downloads, from the canvas folder:

```bash
find assets/brand -type f -exec md5 -r {} \; | sort | awk '{print $1}' | uniq -d
```

It must print nothing. If a hash collides, delete the new copy.

### The extension has to match the bytes

`file <path>` is the authority, not the URL you downloaded from. HEIF saved as
`.jpg`, PNG saved as `.jpg`, WebP saved as `.png` and an HTML challenge page
saved as `.jpg` have all happened. Rename to match, or delete.

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
uses, say. Those are **not** brand material and must not be listed in the
manifest, must not be renamed, and must not be touched. Find them before you
start (`git status` after your first download should show only files you
added) and pass them to the verification script's `IGNORE` set so it does not
report them as orphans.

## Wiring it up

One constant and one line in the folder's `gen.py`:

```python
BRAND_DIR = OUT / "assets" / "brand"
...
    rows += json.loads((BRAND_DIR / "manifest.json").read_text())
    return {"name": PAGE_NAME, "cover": ..., "rows": rows}
```

The brand rows go **after every board row**, and the read is unconditional —
add the line only once the manifest exists, or the generator stops working.
Then `python3 gen.py` and check the diff to `layout.json` is a **pure
addition**. If it deletes rows, stop and read the "gen.py must be a no-op"
section of `references/manifest.md`; you have found a real bug and regenerating
would commit the damage.

The canvas picks the folder up with no further change: the row renders, the
**Brand material** button appears in the toolbar, and the folder joins the
brand page's switcher.

## Verify in a browser before you report

Open the canvas and the brand page for the folder. Lazy loading means a picture
that never scrolled into view also never failed, so force it and count:

```js
const imgs = [...document.querySelectorAll("main img")];
for (const i of imgs) i.loading = "eager";
// wait, then:
imgs.filter((i) => !i.complete || i.naturalWidth === 0).length;  // must be 0
```

## Report

- The verification script's full output, row table included.
- Whether the company publishes a formal brand or press kit, and its URL.
- Which accounts, handles and store ids you used and verified — and any that
  turned out to be wrong, dormant, squatted, or a different company.
- Every candidate you **rejected**, and why: 404, blocked, not first-party, too
  small, duplicate, wrong company.
- What you could not reach, and what you believe is genuinely absent versus
  merely unreachable from here.

Gaps stated plainly beat a padded manifest. An honest "this product has no
Microsoft Store listing" is worth more than a row of something else's
screenshots.
