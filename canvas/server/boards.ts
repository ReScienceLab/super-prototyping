/**
 * The board index: what is in a boards directory, as the JSON the canvas fetches from
 * `/__sp/index.json`. The server scans on every request, and the build writes the same shape
 * into `dist` once. `src/canvasIndex.ts` declares the shape the client reads.
 */
import fs from "node:fs";
import path from "node:path";
import { svgSignature } from "../src/svgSignature.ts";

/** The image types a board folder can hold, and what each is served as. */
export const IMAGE_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/**
 * Longest edge of the variant the build generates for each brand image. A card on the brand page
 * draws around 440 CSS px and the canvas draws most of these smaller still, so 880 is already
 * pixel-exact on a retina screen: every pixel past it is decoded and thrown away. The original
 * stays the asset of record — zoom, export, copy and a viewport wide enough to want it all
 * resolve back to it, so nothing is ever shown softer than the screen can display.
 */
export const THUMB_EDGE = 880;

/**
 * FNV-1a 32 over a string's code units, base 36. The inspector's agent runs the same function
 * over the base64 payload of each data: URI inside the board, and joins on `length:hash`. A
 * plain hash rather than SHA because the agent runs in a sandboxed frame with no `crypto.subtle`
 * in every deployment, and this does 3 MB in about 12 ms.
 */
function fnv1a(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(36);
}

interface AssetName {
  /** Path inside the board folder, `assets/art/hero.png`, or `assets.json#key`. */
  name: string;
  /** Decoded size, i.e. the file's own byte count. */
  bytes: number;
}

/**
 * What one asset file, or one assets.json, contributes to the index, remembered by the file's
 * size and mtime. The index is built on every request for it, and this repo's own boards hold
 * 300 MB of assets: hashing them once is a second, a stat each is nothing.
 */
const hashed = new Map<string, { stamp: string; keys: [string, AssetName][] }>();
function keysOf(file: string, read: (buf: Buffer) => [string, AssetName][]) {
  const stat = fs.statSync(file);
  const stamp = `${stat.size}:${stat.mtimeMs}`;
  let entry = hashed.get(file);
  if (entry?.stamp !== stamp) {
    entry = { stamp, keys: read(fs.readFileSync(file)) };
    hashed.set(file, entry);
  }
  return entry.keys;
}

/**
 * `length:hash` of the base64 payload -> the source file, for every image a folder's generator
 * could have inlined: `assets/**`, `assets-dark/**` and the values of `assets.json`. `refs/` is
 * skipped because it holds third-party captures that are never committed. A generator that
 * re-encodes on the way (a PIL resize) produces bytes that match nothing here, and the
 * inspector then falls back to the image's alt text. An `.svg` file is indexed twice: by its
 * bytes like any image, and as `svg:hash` of its geometry, which is how an inline `<svg>` on a
 * board is keyed, since the generator rewrote its root tag on the way in.
 */
function assetIndex(folder: string): Record<string, AssetName> {
  const out: Record<string, AssetName> = {};
  const add = ([key, name]: [string, AssetName]) => {
    if (!(key in out)) out[key] = name;
  };
  const walk = (dir: string, rel: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== "refs") walk(p, `${rel}${e.name}/`);
        continue;
      }
      if (!(path.extname(e.name).toLowerCase() in IMAGE_MIME)) continue;
      const name = { name: rel + e.name, bytes: 0 };
      keysOf(p, (buf) => {
        const payload = buf.toString("base64");
        const named = { ...name, bytes: buf.length };
        const keys: [string, AssetName][] = [[`${payload.length}:${fnv1a(payload)}`, named]];
        if (e.name.toLowerCase().endsWith(".svg"))
          keys.push([`svg:${fnv1a(svgSignature(buf.toString("utf8")))}`, named]);
        return keys;
      }).forEach(add);
    }
  };
  for (const sub of ["assets", "assets-dark"]) walk(path.join(folder, sub), `${sub}/`);
  const json = path.join(folder, "assets.json");
  if (fs.existsSync(json)) {
    keysOf(json, (buf) => {
      const keys: [string, AssetName][] = [];
      try {
        const map: unknown = JSON.parse(buf.toString("utf8"));
        if (map && typeof map === "object") {
          for (const [key, v] of Object.entries(map)) {
            if (typeof v !== "string" || !v.startsWith("data:")) continue;
            const payload = v.slice(v.indexOf(",") + 1);
            const pad = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
            keys.push([
              `${payload.length}:${fnv1a(payload)}`,
              { name: `assets.json#${key}`, bytes: Math.floor((payload.length * 3) / 4) - pad },
            ]);
          }
        }
      } catch {
        // a malformed assets.json names nothing; the boards still render
      }
      return keys;
    }).forEach(add);
  }
  return out;
}

/**
 * `#` and `?` are legal in a filename but are a fragment and a query in a URL, and no encoding
 * survives the round trip (the request path is decoded with decodeURI, which leaves both alone).
 * A board named this way would load the app's own index.html instead of itself and render blank
 * forever, so it is dropped with a warning that says what to do about it.
 */
function urlSafe(name: string, what: string) {
  if (!/[#?]/.test(name)) return true;
  console.warn(`[canvases] skipping ${what} "${name}": # and ? cannot appear in a board's name`);
  return false;
}

/**
 * Every image under `assets/brand/`, by path relative to the board folder. A layout places these
 * as tldraw image shapes of their own rather than inside a board, so they are the one part of
 * `assets/` that needs a real URL: everything else is already a `data:` URI in the HTML.
 */
function brandImages(folder: string): string[] {
  const out: string[] = [];
  const walk = (dir: string, rel: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      if (e.isDirectory()) walk(path.join(dir, e.name), `${rel}${e.name}/`);
      else if (path.extname(e.name).toLowerCase() in IMAGE_MIME && urlSafe(e.name, "brand image"))
        out.push(rel + e.name);
    }
  };
  walk(path.join(folder, "assets", "brand"), "assets/brand/");
  return out.sort();
}

/** A folder's JSON file parsed, or undefined for none; a corrupt one is warned about and skipped. */
function readJson(file: string): unknown {
  if (!fs.existsSync(file)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    // A board whose layout or comments file is corrupt still has to open, without it.
    console.warn(`[canvases] ignoring ${file}: ${error}`);
    return undefined;
  }
}

/**
 * Suffix for the tldraw persistence key, so two projects do not share one document.
 *
 * The store is keyed by origin plus persistence key, and every canvas runs on 127.0.0.1. Stop
 * project A and start project B on the same port and B opened A's shapes: same slug, same file
 * name, same seeded shape id. A's pages that B has no folder for survived too, because pruning
 * only removes empty ones.
 *
 * Empty for this checkout's own boards, and in a build, so the repo and the hosted canvas keep
 * the document they already have. Anything else gets its own namespace.
 */
export function canvasesNamespace(canvasesDir: string, repoRoot: string) {
  if (canvasesDir === path.resolve(repoRoot, "mockups/canvases")) return "";
  // djb2 over the path. It only has to be stable and short — this is a namespace, not a digest,
  // and a collision would need two board directories to hash alike on one machine.
  let h = 5381;
  for (let i = 0; i < canvasesDir.length; i++) h = ((h * 33) ^ canvasesDir.charCodeAt(i)) >>> 0;
  return `:${h.toString(36)}`;
}

/**
 * One folder per board, one HTML file per screen, read off the directory now. Missing layout.json
 * and icon.png are normal. `served` is whether a server is behind `/__sp`, which is the whole of
 * what the canvas can write; a build says no. `thumbs` is empty here: the build fills it in with
 * the brand images it generated a variant for, and the server serves originals.
 */
export function boardIndex(
  canvasesDir: string,
  options: { served: boolean; canvasesNamespace: string },
) {
  const boards = !fs.existsSync(canvasesDir)
    ? []
    : fs
        .readdirSync(canvasesDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() || e.isSymbolicLink())
        .map((e) => e.name)
        // `import.meta.glob` skipped dot-prefixed folders (`dot: false`) and the discovery set
        // has to match it exactly, or an upgrade changes which boards exist.
        .filter((slug) => !slug.startsWith("."))
        .filter((slug) => urlSafe(slug, "board folder"))
        .sort()
        .map((slug) => {
          const folder = path.join(canvasesDir, slug);
          // `throwIfNoEntry: false` because a dangling symlink here used to throw out of the
          // scan, and then *every* board 500s rather than the one bad entry being skipped.
          if (!fs.statSync(folder, { throwIfNoEntry: false })?.isDirectory()) return null;
          let names: string[];
          try {
            names = fs.readdirSync(folder);
          } catch {
            return null; // unreadable folder: skip it, do not take the whole canvas down
          }
          // Must resolve to a real file. A *directory* named `foo.html` would otherwise be
          // listed as a board and its request would answer 404, leaving a permanently blank shape.
          const isFile = (name: string) =>
            fs.statSync(path.join(folder, name), { throwIfNoEntry: false })?.isFile() ?? false;
          const html = names
            // dot-files for the same reason the dot-folders above are skipped.
            .filter((f) => !f.startsWith(".") && f.endsWith(".html") && isFile(f))
            .filter((f) => urlSafe(f, "board"))
            .sort();
          return {
            slug,
            html,
            /** When a board in it was last written, in ms: the home page's "edited" line. */
            updated: Math.max(0, ...html.map((f) => fs.statSync(path.join(folder, f)).mtimeMs)),
            layout: readJson(path.join(folder, "layout.json")),
            icon: fs.existsSync(path.join(folder, "icon.png")),
            brand: brandImages(folder),
            thumbs: [] as string[],
            assets: assetIndex(folder),
            comments: readJson(path.join(folder, "comments.json")),
          };
        })
        .filter((b): b is NonNullable<typeof b> => b !== null && b.html.length > 0);
  return {
    served: options.served,
    // Empty unless served: the hosted bundle is public, and this is the build machine's
    // filesystem. The empty-state notice drops the path when it has none.
    canvasesDir: options.served ? canvasesDir : "",
    canvasesNamespace: options.canvasesNamespace,
    thumbEdge: THUMB_EDGE,
    boards,
  };
}

export type BoardIndex = ReturnType<typeof boardIndex>;
