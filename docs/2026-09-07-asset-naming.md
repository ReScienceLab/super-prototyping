<!-- Written 2026-09-07 while the inspector panel was still a spike (see
2026-09-07-inspector-panel-feasibility.md, section 5, item 2). Kept because the measurements
in section 3 settle a question that would otherwise be re-argued from first principles. -->

# Naming the images in the inspector's Assets tab

**Date:** 2026-09-07
**Question:** a board's images reach the canvas as anonymous `data:` URIs. How does the
Assets tab put a filename next to each one, for all 180 boards, without asking authors to
remember anything?

## 1. Recommendation

**Match by content, at build time, against the files the folder already commits.** The
`prototyping-canvases` plugin hashes every image under `<slug>/assets/**`, `assets-dark/**`
and every `data:` value in `assets.json`, and exports `rawAssetNames` — per folder, a map
from `"<payload length>:<fnv1a>"` of the base64 payload to `{ name, bytes }`. The inspector's
agent hashes each image it finds the same way and the parent joins the two. Nothing in the
HTML changes, no generator is re-run, and there is nothing new for an author to do: the file
they inlined is the name.

Measured on the repo as committed:

| | named | of | |
|---|---|---|---|
| `<img>` elements | **518** | 606 | 85.5 % |
| CSS `url(data:)` backgrounds | **214** | 214 | 100 %, and the spike never counted these |
| boards with images | 80 | 82 | every image named |
| folders | 11 | 13 | |

The 88 unnamed images are all in two folders whose generators re-encode through PIL on the
way in (`apple-icons`, 86; `00-welcome`, 2), so the bytes on the board match no file. 87 of
those 88 carry `alt` text that *is* the name (`alt="Find My"` for `assets/FindMy.png`), which
is the fallback. Zero hash collisions across the 441 distinct URIs in the corpus. Cost: 127 ms
once at dev-server start, 31 KB in the eager bundle for this repo's 494 assets, no change to
install size.

It beats the alternatives because it is the only one that is right for boards nobody re-runs.
Option (a), an attribute emitted by `gen.py`, names nothing on any of the 82 image-bearing
boards until its folder is regenerated, and one folder (`luma-ios`, 12 of those boards)
cannot be regenerated from a checkout at all. It also cannot name the 214 CSS backgrounds,
which have no element to carry an attribute. Option (b) as literally posed — expose the
committed `assets.json` — covers 3 of 13 folders. Details in section 4.

## 2. What is actually there

Facts that changed the shape of the answer, all re-verified:

- **`assets.json` is not measurement evidence.** The README and `layout.md` say it is, but
  the three that exist (`claude-ios`, `luma-ios`, `templates`) are `{ "<key>": "data:…" }`
  maps: pre-encoded bitmaps a generator reads and drops into `src` unchanged. The other ten
  image folders have an `assets/` directory instead, and their generator base64-encodes the
  file at build time. Both are joinable by content; neither is joinable by anything else.
- **Every generator funnels images through one helper** (`img(name)`, `uri(path)`,
  `art(id)`) that takes a filename and returns a data URI. The name is known at generation
  time; it is simply not written out. 11 of 13 helpers pass the bytes through verbatim.
- **Two helpers transform.** `apple-icons/gen.py` `icon_uri` resizes to `ICON_PX` with
  LANCZOS and re-saves; `00-welcome/gen.py` crops, resizes and re-encodes the banner as JPEG.
- **Images are not only `<img>`.** 214 `background: url(data:…)` declarations on 19 boards
  (`duolingo-ios/00d-art` alone has 128; the three `luma-ios` home boards have 17 each).
- **`notion-ios` and `raycast-ios` have no `gen.py`** and no images. Nothing to name.
- **`assets/refs/` is gitignored** and holds third-party captures. The index skips it, and
  the 3 evidence boards that embed images (56 of them) all matched committed files anyway.
- **The spike already posts every `<img>`'s full `src`** to the parent (`nodes[i].src`), so
  the byte volume of the join was already being paid.

## 3. Measurements

Scripts under `scratch/asset-naming/` (gitignored). Boards are `mockups/canvases/*/[0-9]*.html`.

**Join rate, by content** (`match.py`, `css.py`):

```
folder            imgs  named  alt         folder            imgs  named  alt
00-welcome           2      0    1         claude-ios           3      3    3
apple-calendar       2      2    0         duolingo-ios       147    147    3
apple-home-lock    106    106    0         luma-ios            20     20    0
apple-icons         86      0   86         snapaction-ios     100    100    3
apple-photos        11     11    0         spotify-ios         65     65    0
apple-settings      14     14    0         templates            7      7    7
apple-wallet        17     17    0
```

415 distinct `<img>` URIs, 67 reused on more than one board, 0 matched across folders.

**Join key** — collisions among the 441 distinct payloads (img and CSS):

| key | collisions |
|---|---|
| payload length | 24 |
| length + first 80 chars (what the spike sends as `key`) | 1 |
| FNV-1a 32 | 0 |
| length + FNV-1a 32 (recommended) | 0 |
| SHA-256 | 0 |

FNV-1a rather than SHA because the sandboxed frame does not always have `crypto.subtle`:
it does under a `127.0.0.1` parent (`isSecureContext` true, measured), it does not under an
`about:blank` or plain-http parent. FNV-1a in the frame costs 12 ms per 3 MB payload and
7–28 ms for a whole board, and produces the same value as Python and Node bit for bit
(checked on the same payload from three runtimes).

**Build cost** (`timing.mjs`, `loadvirtual.mjs`): 455 files, 13.2 MB of assets. base64 5 ms,
FNV over the base64 26 ms (Bun), 22 ms (Node 26). The full virtual module, loaded through
Vite's own `createServer` with the patched config: **127 ms**, `rawAssetNames` 31,608 bytes
for 494 entries in 13 folders. The module is loaded once and again on structural change.
`bunx tsc -b --noEmit` and `bunx vite build` both pass with the patch applied.

**End to end** (`agent_e2e.py`): the agent snippet in section 5 injected into real boards in
a `sandbox="allow-scripts"` frame under real Chrome, joined against the same index:

| board | assets | named | hashing |
|---|---|---|---|
| `snapaction-ios/01-timeline` | 25 | 25 (`assets/art/sb-a.png`, `01-hbl.png`, …) | 7 ms |
| `luma-ios/11-home-nearby` | 18 | 18 (1 img, 17 CSS, all `assets.json#home_*`) | 20 ms |
| `claude-ios/13-photo-attached` | 1 | 1 (`assets.json#photo`) | 11 ms |
| `apple-icons/00-icon-set` | 43 | 0, all 43 have `alt` | 28 ms |

**What option (a) would cost** (`rerun.sh`): each folder copied to `scratch/`, its `gen.py`
run there with the `tools/.venv` Python, output compared to the committed boards.

- 12 of 14 generators run and reproduce every board **byte for byte** — so regeneration is
  safe and deterministic where it is possible.
- `luma-ios` fails: it needs `refassets.json`, which is gitignored. Its 12 image-bearing
  boards cannot be regenerated from a checkout.
- `00-welcome` failed only because the copy broke its `../../../assets/banner.webp` path;
  in place it runs.
- 82 boards carry images and would need regenerating; a board not re-run names nothing.
- Byte cost is not the problem: `data-asset="…"` on every `<img>` adds about 20 KB to
  29.3 MB of committed HTML.
- A `;name=` parameter in the data URI (`data:image/png;name=hero.png;base64,…`) renders
  fine in Chrome, in `<img>` and in CSS `url()` (measured, `nameparam.py`), and could be
  added inside each generator's helper with no call-site changes. But it is still a
  regeneration, and it is a convention every future `gen.py` has to know.

## 4. Alternatives, and why not

**(a) `gen.py` emits a name.** Correct only after regeneration; 82 boards affected, 12 of
them impossible to regenerate; cannot name CSS backgrounds; a convention for authors to
carry. Its one advantage, that it works for a transformed image, covers 88 of 606 images and
87 of those already have `alt`. Not worth it as the primary path. It remains a fine
*addition* for a generator that transforms: any `<img alt>` is the fallback, and that is
what those two generators already emit.

**(b) expose `assets.json` alone.** 3 of 13 folders have one. Correct for them, silent for
the rest. The recommendation is (b) generalised to what folders actually contain.

**(c) parse in the parent with `DOMParser` instead of the agent.** The parent holds the HTML
string, so it could extract URIs without the frame at all. Rejected as the *primary* path
because it cannot give `naturalWidth`/`naturalHeight` without decoding each image a second
time, and cannot see CSS backgrounds without computing styles. It is a good fallback for
the reuse count across boards: the plugin could scan all HTML at load (85 ms for 29.3 MB,
measured) and export per-asset board counts, if that column earns its place.

**(d) a Vite middleware serving the index on request.** Works in dev, does nothing on the
hosted static build. The virtual module works in both.

## 5. Change list

Nothing below is applied. The plugin diff was applied, checked, and reverted; it is in full
in the appendix and in `scratch/asset-naming/plugin.diff`.

**`canvas/vite.config.ts`** — appendix. In short:
- `jsLiteral(value)`: `jsString` generalised to any JSON value, same U+2028/U+2029/`<`
  escaping, because file names come off the filesystem.
- `fnv1a`, `AssetName`, `assetIndex(folder)`: walks `assets/` and `assets-dark/` (skipping
  `refs/` and dot-files), reads `assets.json`, keys by `"<length>:<fnv1a>"`, first name wins.
- `Board.assets`, filled by `scan()`; `load()` emits
  `export const rawAssetNames = { "<slug>": {…}, … }`, keyed by slug, folders with no assets
  omitted.
- Watcher: `structural()` also matches `assets.json` and anything under `assets/`; a new
  `change` listener rebuilds the module when an asset is edited in place, since a renamed
  file keeps its name and changes its hash.

**`canvas/src/virtual-canvases.d.ts`** — appendix. One export:
`rawAssetNames: Record<string, Record<string, { name: string; bytes: number }>>`.

**`canvas/src/canvasLibrary.ts`** — an accessor beside `readCanvasLayout`:

```ts
import { fileLoaders, rawLayouts, rawIcons, rawAssetNames } from "virtual:canvases";

/** This folder's inlined images by payload key, if it committed the files they came from. */
export function readCanvasAssetNames(pageSlug: string) {
  return rawAssetNames[pageSlug];
}
```

**`canvas/src/InspectorPanel.tsx`** (not touched here; owned by the panel work). The agent's
`measure()` computes the key the index uses and also reports CSS backgrounds:

```js
function fnv(s){var h=0x811c9dc5;for(var i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),0x01000193)>>>0;}return h.toString(36);}
function key(uri){var p=uri.slice(uri.indexOf(',')+1);return p.length+':'+fnv(p);}
/* in measure(): */
var assets=[];
for(var i=0;i<els.length;i++){var el=els[i];
  if(el.tagName==='IMG'){var src=el.getAttribute('src')||'';
    if(src.indexOf('data:')===0)assets.push({i:i,key:key(src),via:'img',mime:src.slice(5,src.indexOf(';')),
      chars:src.length,w:el.naturalWidth,h:el.naturalHeight,alt:el.getAttribute('alt')||''});}
  var bg=getComputedStyle(el).backgroundImage,m=/url\("?(data:image[^")]+)"?\)/.exec(bg);
  if(m)assets.push({i:i,key:key(m[1]),via:'css',mime:m[1].slice(5,m[1].indexOf(';')),chars:m[1].length,w:0,h:0,alt:''});}
```

`nodes[i].src` then no longer needs to carry the full URI; `key` is 15 characters. The parent
groups by `key` and resolves:

```ts
const names = readCanvasAssetNames(pageSlug);
const groups = new Map<string, { name: string; bytes: number; w: number; h: number; mime: string; uses: number[] }>();
for (const a of data.assets) {
  const hit = names?.[a.key];
  const g = groups.get(a.key) ?? {
    name: hit?.name ?? (a.alt || `${a.mime.replace("image/", "")} ${a.w}×${a.h}`),
    bytes: hit?.bytes ?? Math.floor((a.chars * 3) / 4),
    w: a.w, h: a.h, mime: a.mime, uses: [],
  };
  g.uses.push(a.i);
  groups.set(a.key, g);
}
```

That gives each row: name (file, else alt, else `png 160×160`), byte size (the file's, else
decoded length), dimensions, format, on-board reuse count, and the layers that use it (the
`uses` indices select in the layer list). The name is italicised or otherwise marked when it
came from the fallback, so an unnamed image is not passed off as a named one.

**Docs.** `mockups/canvases/README.md` and `skills/prototype-canvas/references/layout.md`
both call `assets.json` "measurement evidence". It is an inlined-asset map; say so, and say
that the inspector names images from `assets/` and `assets.json`, so a generator that wants
its images named inlines the file as it is. Keep the two in step.

**Regeneration:** none.

## 6. What it still cannot do

- **Name a transformed image.** 88 of 606 today, in `apple-icons` (resized) and
  `00-welcome` (cropped and re-encoded). 87 have `alt`; the one that does not is the
  welcome mark. A generator that transforms can add `alt`, or an author can commit the
  post-transform bytes; the plugin will not guess.
- **Name an image whose source is not committed.** By design: `assets/refs/` is skipped
  because those files are not in the repo, so a board built from them shows the fallback
  even on the machine that has them. Today that is zero images.
- **Tell two identical files apart.** First name wins. `duolingo-ios` commits `assets/art`
  and `assets/art-gen`; where a file is byte-identical in both the tab shows the first.
  Zero cases today across folders, not measured within one.
- **Count reuse across boards.** The agent sees one board. 67 of 415 URIs recur on other
  boards; the plugin could scan all HTML at load for 85 ms to say so, if the column matters.
- **Help the 98 image-free boards.** Empty tab, as before. That is the boards, not the tab.
- **Survive plain-http hosting for `crypto.subtle`** — irrelevant to this design, which is
  why FNV-1a was chosen, but worth restating: nothing here needs a secure context.
- **Show anything for a board that is not on disk as files.** `notion-ios` and `raycast-ios`
  have hand-written HTML and no assets folder; they also have no images.

## 7. Appendix: the checked plugin diff

Applied to `canvas/vite.config.ts` and `canvas/src/virtual-canvases.d.ts`, passed `tsc -b`,
`vite build`, and a `createServer` load of the generated module, then reverted.

```diff
diff --git a/canvas/src/virtual-canvases.d.ts b/canvas/src/virtual-canvases.d.ts
index b2a5dad..6af6119 100644
--- a/canvas/src/virtual-canvases.d.ts
+++ b/canvas/src/virtual-canvases.d.ts
@@ -23,6 +23,13 @@ declare module "virtual:canvases" {
   export const rawLayouts: Record<string, CanvasLayoutConfig>;
   /** Each folder's icon.png as an emitted asset URL, eager: read during render. */
   export const rawIcons: Record<string, string>;
+  /**
+   * Per folder slug, `"<payload length>:<fnv1a>"` of a data: URI's base64 payload -> the file
+   * in that folder it was inlined from. Built from `assets/**`, `assets-dark/**` and
+   * `assets.json`, so it needs no attribute in the HTML and no regeneration; eager because it
+   * is small (about 60 bytes per asset) and read while a panel renders.
+   */
+  export const rawAssetNames: Record<string, Record<string, { name: string; bytes: number }>>;
   /**
    * Absolute path the boards were actually read from, and `""` in a production build — the
    * bundle is public and this is the build machine's filesystem. EmptyLibraryNotice in App.tsx
diff --git a/canvas/vite.config.ts b/canvas/vite.config.ts
index 8da59d7..84c4083 100644
--- a/canvas/vite.config.ts
+++ b/canvas/vite.config.ts
@@ -81,14 +81,95 @@ const jsString = (value: string) =>
     .replace(/\u2029/g, "\\u2029")
     .replace(/</g, "\\u003c");
 
+/** Any JSON-serialisable value as a JavaScript literal, escaped the same way. */
+const jsLiteral = (value: unknown) =>
+  JSON.stringify(value)
+    .replace(/\u2028/g, "\\u2028")
+    .replace(/\u2029/g, "\\u2029")
+    .replace(/</g, "\\u003c");
+
 /** The historical key for a board, kept whatever directory it was actually read from. */
 const keyFor = (slug: string, file: string) => `../../mockups/canvases/${slug}/${file}`;
 
+const ASSET_MIME = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
+
+/**
+ * FNV-1a 32 over a string's code units, base 36. The inspector's agent runs the same function
+ * over the base64 payload of each data: URI inside the board, and joins on `length:hash`. A
+ * plain hash rather than SHA because the agent runs in a sandboxed frame with no `crypto.subtle`
+ * in every deployment, and this does 3 MB in about 12 ms.
+ */
+function fnv1a(s: string) {
+  let h = 0x811c9dc5;
+  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
+  return h.toString(36);
+}
+
+interface AssetName {
+  /** Path inside the board folder, `assets/art/hero.png`, or `assets.json#key`. */
+  name: string;
+  /** Decoded size, i.e. the file's own byte count. */
+  bytes: number;
+}
+
+/**
+ * `length:hash` of the base64 payload -> the source file, for every image a folder's generator
+ * could have inlined: `assets/**`, `assets-dark/**` and the values of `assets.json`. `refs/` is
+ * skipped because it holds third-party captures that are never committed. A generator that
+ * re-encodes on the way (a PIL resize) produces bytes that match nothing here, and the
+ * inspector then falls back to the image's alt text.
+ */
+function assetIndex(folder: string): Record<string, AssetName> {
+  const out: Record<string, AssetName> = {};
+  const add = (payload: string, name: string, bytes: number) => {
+    const key = `${payload.length}:${fnv1a(payload)}`;
+    if (!(key in out)) out[key] = { name, bytes };
+  };
+  const walk = (dir: string, rel: string) => {
+    let entries: fs.Dirent[];
+    try {
+      entries = fs.readdirSync(dir, { withFileTypes: true });
+    } catch {
+      return;
+    }
+    for (const e of entries) {
+      if (e.name.startsWith(".")) continue;
+      const p = path.join(dir, e.name);
+      if (e.isDirectory()) {
+        if (e.name !== "refs") walk(p, `${rel}${e.name}/`);
+        continue;
+      }
+      if (!ASSET_MIME.has(path.extname(e.name).toLowerCase())) continue;
+      const buf = fs.readFileSync(p);
+      add(buf.toString("base64"), rel + e.name, buf.length);
+    }
+  };
+  for (const sub of ["assets", "assets-dark"]) walk(path.join(folder, sub), `${sub}/`);
+  const json = path.join(folder, "assets.json");
+  if (fs.existsSync(json)) {
+    try {
+      const map: unknown = JSON.parse(fs.readFileSync(json, "utf8"));
+      if (map && typeof map === "object") {
+        for (const [key, v] of Object.entries(map)) {
+          if (typeof v !== "string" || !v.startsWith("data:")) continue;
+          const payload = v.slice(v.indexOf(",") + 1);
+          const pad = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
+          add(payload, `assets.json#${key}`, Math.floor((payload.length * 3) / 4) - pad);
+        }
+      }
+    } catch {
+      // a malformed assets.json names nothing; the boards still render
+    }
+  }
+  return out;
+}
+
 interface Board {
   slug: string;
   html: string[];
   layout: boolean;
   icon: boolean;
+  assets: Record<string, AssetName>;
 }
 
 /**
@@ -140,6 +221,7 @@ function scan(dir: string): Board[] {
           .sort(),
         layout: fs.existsSync(path.join(folder, "layout.json")),
         icon: fs.existsSync(path.join(folder, "icon.png")),
+        assets: assetIndex(folder),
       };
     })
     .filter((b): b is Board => b !== null && b.html.length > 0);
@@ -182,6 +264,7 @@ function canvasesSource(): Plugin {
       const loaders: string[] = [];
       const layouts: string[] = [];
       const icons: string[] = [];
+      const assets: string[] = [];
 
       boards.forEach((board, i) => {
         const folder = path.join(canvasesDir, board.slug);
@@ -200,6 +283,9 @@ function canvasesSource(): Plugin {
           imports.push(`import __icon${i} from ${spec(path.join(folder, "icon.png"), "?url")};`);
           icons.push(`  ${jsString(keyFor(board.slug, "icon.png"))}: __icon${i},`);
         }
+        if (Object.keys(board.assets).length) {
+          assets.push(`  ${jsString(board.slug)}: ${jsLiteral(board.assets)},`);
+        }
       });
 
       return [
@@ -213,6 +299,7 @@ function canvasesSource(): Plugin {
         `export const fileLoaders = {\n${loaders.join("\n")}\n};`,
         `export const rawLayouts = {\n${layouts.join("\n")}\n};`,
         `export const rawIcons = {\n${icons.join("\n")}\n};`,
+        `export const rawAssetNames = {\n${assets.join("\n")}\n};`,
       ].join("\n");
     },
 
@@ -229,7 +316,9 @@ function canvasesSource(): Plugin {
 
       const inside = (p: string) => p.startsWith(canvasesDir + path.sep);
       const structural = (file: string) =>
-        inside(file) && /(\.html|layout\.json|icon\.png)$/.test(file);
+        inside(file) &&
+        (/(\.html|layout\.json|icon\.png|assets\.json)$/.test(file) ||
+          /\/assets(-dark)?\//.test(file));
 
       const rebuild = () => {
         const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
@@ -249,6 +338,11 @@ function canvasesSource(): Plugin {
 
       server.watcher.on("add", onFile);
       server.watcher.on("unlink", onFile);
+      // An asset edited in place keeps its name and changes its hash, so the index is stale
+      // until the module is rebuilt. Board HTML edits already reload through the module graph.
+      server.watcher.on("change", (file) => {
+        if (inside(file) && /\/assets(-dark)?\/|assets\.json$/.test(file)) rebuild();
+      });
       server.watcher.on("addDir", onDir);
       server.watcher.on("unlinkDir", onDir);
     },
```
