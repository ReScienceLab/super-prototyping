/**
 * The board index: what is in a boards directory, as the JSON the canvas fetches from
 * `/__sp/index.json`. The server scans on every request, and the build writes the same shape
 * into `dist` once. `src/canvasIndex.ts` declares the shape the client reads.
 */
import fs from "node:fs";
import path from "node:path";

/**
 * A project's boards: this folder under it, one subfolder per canvas. The same folder under the
 * plugin root is the examples every project is shown beside its own.
 */
export const CANVASES = "canvases";

/**
 * A project's documents: the Markdown files at its root, beside its canvases, that the canvas
 * shows as tabs before them, in this order. For now only the PRD the sp-define-product skill writes
 * with the user. An example is a project of one canvas, so its folder is its root and its
 * documents are read from there. */
export const DOCS = ["PRD.md"];

export function readDocs(dir: string) {
  return DOCS.filter((name) =>
    fs.statSync(path.join(dir, name), { throwIfNoEntry: false })?.isFile(),
  ).map((name) => ({ name, text: fs.readFileSync(path.join(dir, name), "utf8") }));
}

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
 * `#` and `?` are legal in a filename but are a fragment and a query in a URL, and no encoding
 * survives the round trip (the request path is decoded with decodeURI, which leaves both alone).
 * A board named this way would load the app's own index.html instead of itself and render blank
 * forever, so it is dropped with a warning that says what to do about it.
 */
function urlSafe(name: string, what: string) {
  if (!/[#?]/.test(name)) return true;
  console.warn(
    `[canvases] skipping ${what} "${name}": # and ? cannot appear in a board's name`,
  );
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
      else if (
        path.extname(e.name).toLowerCase() in IMAGE_MIME &&
        urlSafe(e.name, "brand image")
      )
        out.push(rel + e.name);
    }
  };
  walk(path.join(folder, "assets", "brand"), "assets/brand/");
  return out.sort();
}

/** A folder's JSON file parsed, or undefined for none; a corrupt one is warned about and skipped. */
export function readJson(file: string): unknown {
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
  if (canvasesDir === path.resolve(repoRoot, CANVASES)) return "";
  // djb2 over the path. It only has to be stable and short — this is a namespace, not a digest,
  // and a collision would need two board directories to hash alike on one machine.
  let h = 5381;
  for (let i = 0; i < canvasesDir.length; i++)
    h = ((h * 33) ^ canvasesDir.charCodeAt(i)) >>> 0;
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
          if (!fs.statSync(folder, { throwIfNoEntry: false })?.isDirectory())
            return null;
          let names: string[];
          try {
            names = fs.readdirSync(folder);
          } catch {
            return null; // unreadable folder: skip it, do not take the whole canvas down
          }
          // Must resolve to a real file. A *directory* named `foo.html` would otherwise be
          // listed as a board and its request would answer 404, leaving a permanently blank shape.
          const isFile = (name: string) =>
            fs
              .statSync(path.join(folder, name), { throwIfNoEntry: false })
              ?.isFile() ?? false;
          const html = names
            // dot-files for the same reason the dot-folders above are skipped.
            .filter(
              (f) => !f.startsWith(".") && f.endsWith(".html") && isFile(f),
            )
            .filter((f) => urlSafe(f, "board"))
            .sort();
          return {
            slug,
            html,
            /** When a board in it was last written, in ms, for the home page's "edited" line. */
            updated: Math.max(
              0,
              ...html.map((f) => fs.statSync(path.join(folder, f)).mtimeMs),
            ),
            layout: readJson(path.join(folder, "layout.json")),
            icon: fs.existsSync(path.join(folder, "icon.png")),
            thumbnail: fs.existsSync(path.join(folder, "thumbnail.png")),
            brand: brandImages(folder),
            thumbs: [] as string[],
            comments: readJson(path.join(folder, "comments.json")),
            // null for a canvas.json that is there but will not parse, after a merge left half
            // done, say. The page must not take that for no file and write over it
            // (canvasContent.ts).
            content: fs.existsSync(path.join(folder, "canvas.json"))
              ? (readJson(path.join(folder, "canvas.json")) ?? null)
              : undefined,
            docs: readDocs(folder),
          };
        })
        .filter(
          // A folder with no board yet is a canvas once it has a layout.json, which is what the
          // canvas strip's "+" makes (sp.ts, /__sp/new-canvas).
          (b): b is NonNullable<typeof b> =>
            b !== null && (b.html.length > 0 || b.layout !== undefined),
        );
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
