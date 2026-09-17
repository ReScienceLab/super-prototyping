import { execFile, spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import sharp from "sharp";
import { defineConfig, type Plugin } from "vite";
import { svgSignature } from "./src/svgSignature.ts";

import {
  BOARD_STATUSES,
  SAFE_NAME,
  canvasSlug,
  withBoardStatus,
  withCanvasName,
} from "./src/boardStatusEdit.ts";
import { boardChangeKind, boardSetSignature, boardSlug } from "./src/boardWatch.ts";
import { attach, emit, ended, newRun, runSummary, sseFrame, type Run } from "./src/agentRun.ts";
import { AGENTS, type AgentDef, type AgentModel } from "./src/agents.ts";
import { titleFilter, type ChatEvent } from "./src/claudeStream.ts";

/**
 * Repo root — vite.config.ts sits in canvas/, one level below it. It is published into the page
 * so a running server can be identified: a port that responds is not necessarily *this*
 * checkout's canvas, and `<meta name="prototyping-repo-root">` is what settles that.
 * Dev server only: a hosted build has no checkout to name, and the path would leak the
 * build machine's filesystem.
 */
const repoRoot = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");

/**
 * Where the boards live. Defaults to this checkout's own folder, so the repo and the hosted
 * build behave exactly as they always have with no environment set.
 *
 * The canvas app ships inside the plugin, which is installed outside the user's project, while
 * their boards stay in their project. `PROTOTYPING_CANVASES_DIR` is what joins the two — the
 * plugin holds the code, the user holds the data, and an upgrade replaces one without touching
 * the other.
 */
const defaultCanvasesDir = path.resolve(repoRoot, "mockups/canvases");
const canvasesDir = path.resolve(
  process.env.PROTOTYPING_CANVASES_DIR || defaultCanvasesDir,
);

/**
 * The user's project, for the agent behind the chat panel to run in. It is their project the
 * agent works on — the boards are one folder inside it, and a prompt about a screen reaches for
 * the code around it — so neither the boards directory nor this checkout would do as its cwd.
 * `sp-canvas start` sets it to the directory it is started from, the same one the boards default
 * under. Unset, the agent endpoints answer 503 by name and the rest of the server is unaffected.
 */
const projectDir = process.env.PROTOTYPING_PROJECT_DIR
  ? path.resolve(process.env.PROTOTYPING_PROJECT_DIR)
  : null;

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
const canvasesNamespace = (() => {
  if (canvasesDir === defaultCanvasesDir) return "";
  // djb2 over the path. It only has to be stable and short — this is a namespace, not a digest,
  // and a collision would need two board directories to hash alike on one machine.
  let h = 5381;
  for (let i = 0; i < canvasesDir.length; i++)
    h = ((h * 33) ^ canvasesDir.charCodeAt(i)) >>> 0;
  return `:${h.toString(36)}`;
})();

function repoRootMeta(): Plugin {
  return {
    name: "prototyping-repo-root",
    apply: "serve",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { name: "prototyping-repo-root", content: repoRoot },
        injectTo: "head",
      },
    ],
  };
}

const VIRTUAL_ID = "virtual:canvases";
const RESOLVED_ID = "\0virtual:canvases";

/**
 * A path or key, as a JavaScript string literal for the generated module.
 *
 * `JSON.stringify` alone is what CodeQL calls improper sanitization for code construction
 * (js/bad-code-sanitization): it leaves U+2028 and U+2029 raw, which are legal inside an
 * ES2019+ string but not inside an ES5 one or an inline `<script>`, and it leaves `<`
 * raw, so a generated string containing `</script>` would end the block early if this
 * module were ever inlined into HTML. Board folder names come off the filesystem, and a
 * board folder is a thing people copy from other repos, so escape rather than argue.
 */
const jsString = (value: string) =>
  JSON.stringify(value)
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
    .replace(/</g, "\\u003c");

/** Any JSON-serialisable value as a JavaScript literal, escaped the same way. */
const jsLiteral = (value: unknown) =>
  JSON.stringify(value)
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
    .replace(/</g, "\\u003c");

/** The historical key for a board, kept whatever directory it was actually read from. */
const keyFor = (slug: string, file: string) => `../../mockups/canvases/${slug}/${file}`;

const ASSET_MIME = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);

/**
 * FNV-1a 32 over a string's code units, base 36. The inspector's agent runs the same function
 * over the base64 payload of each data: URI inside the board, and joins on `length:hash`. A
 * plain hash rather than SHA because the agent runs in a sandboxed frame with no `crypto.subtle`
 * in every deployment, and this does 3 MB in about 12 ms.
 */
function fnv1a(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(36);
}

interface AssetName {
  /** Path inside the board folder, `assets/art/hero.png`, or `assets.json#key`. */
  name: string;
  /** Decoded size, i.e. the file's own byte count. */
  bytes: number;
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
  const add = (key: string, name: string, bytes: number) => {
    if (!(key in out)) out[key] = { name, bytes };
  };
  const addPayload = (payload: string, name: string, bytes: number) =>
    add(`${payload.length}:${fnv1a(payload)}`, name, bytes);
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
      if (!ASSET_MIME.has(path.extname(e.name).toLowerCase())) continue;
      const buf = fs.readFileSync(p);
      addPayload(buf.toString("base64"), rel + e.name, buf.length);
      if (e.name.toLowerCase().endsWith(".svg"))
        add(`svg:${fnv1a(svgSignature(buf.toString("utf8")))}`, rel + e.name, buf.length);
    }
  };
  for (const sub of ["assets", "assets-dark"]) walk(path.join(folder, sub), `${sub}/`);
  const json = path.join(folder, "assets.json");
  if (fs.existsSync(json)) {
    try {
      const map: unknown = JSON.parse(fs.readFileSync(json, "utf8"));
      if (map && typeof map === "object") {
        for (const [key, v] of Object.entries(map)) {
          if (typeof v !== "string" || !v.startsWith("data:")) continue;
          const payload = v.slice(v.indexOf(",") + 1);
          const pad = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
          addPayload(payload, `assets.json#${key}`, Math.floor((payload.length * 3) / 4) - pad);
        }
      }
    } catch {
      // a malformed assets.json names nothing; the boards still render
    }
  }
  return out;
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
        ASSET_MIME.has(path.extname(e.name).toLowerCase()) &&
        urlSafe(e.name, "brand image")
      )
        out.push(rel + e.name);
    }
  };
  walk(path.join(folder, "assets", "brand"), "assets/brand/");
  return out.sort();
}

/**
 * Longest edge of the variant generated for each brand image. A card on the brand page draws
 * around 440 CSS px and the canvas draws most of these smaller still, so 880 is already
 * pixel-exact on a retina screen: every pixel past it is decoded and thrown away. The original
 * stays the asset of record — zoom, export, copy and a viewport wide enough to want it all
 * resolve back to it, so nothing is ever shown softer than the screen can display.
 */
const THUMB_EDGE = 880;
const thumbsDir = fileURLToPath(new URL("node_modules/.cache/brand-thumbs/", import.meta.url));

/**
 * The variant for one brand image, generated on first sight and read from the cache after.
 * Named by the source's size and mtime, so replacing an asset writes a new file rather than
 * serving the stale one.
 *
 * Undefined when a variant is not worth having, and the caller then keeps the original, which
 * is only ever heavier and never broken: an SVG, which is already resolution-independent and
 * the one thing here that rasterising *would* degrade; a file sharp cannot read; an image
 * already small enough that a variant would hold the same pixels in a re-encoded file; or an
 * image WebP fails to make smaller, which is common for the small flat-colour logos.
 */
async function brandThumb(file: string): Promise<string | undefined> {
  if (path.extname(file).toLowerCase() === ".svg") return undefined;
  const stat = fs.statSync(file, { throwIfNoEntry: false });
  if (!stat?.isFile()) return undefined;
  // djb2 over path, size and mtime — a cache key, not a digest.
  let h = 5381;
  const key = `${file}:${stat.size}:${stat.mtimeMs}`;
  for (let i = 0; i < key.length; i++) h = ((h * 33) ^ key.charCodeAt(i)) >>> 0;
  const out = path.join(thumbsDir, `${h.toString(36)}-${path.parse(file).name}.webp`);
  // An empty cache file is the remembered answer "this one is better off as its original", so
  // a rejected image is not re-encoded on every start just to reach the same conclusion.
  if (fs.existsSync(out)) return fs.statSync(out).size ? out : undefined;
  try {
    fs.mkdirSync(thumbsDir, { recursive: true });
    const meta = await sharp(file).metadata();
    // An image the screen can already show whole gets no variant. Downscaling is what makes a
    // variant honest — the same picture, at the size it is drawn. Re-encoding one at its own
    // size is the other kind of saving, the kind that trades quality for bytes.
    if (!meta.width || !meta.height || Math.max(meta.width, meta.height) <= THUMB_EDGE) {
      fs.writeFileSync(out, "");
      return undefined;
    }
    await sharp(file, { animated: true })
      .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(out);
  } catch {
    return undefined;
  }
  if (fs.statSync(out).size >= stat.size) {
    fs.writeFileSync(out, "");
    return undefined;
  }
  return out;
}

interface Board {
  slug: string;
  html: string[];
  layout: boolean;
  icon: boolean;
  assets: Record<string, AssetName>;
  brand: string[];
}

/**
 * `#` and `?` are legal in a filename but are a fragment and a query in a URL, and no encoding
 * survives the round trip (Vite decodes with decodeURI, which leaves both alone). A board named
 * this way would load the SPA's own index.html instead of itself and render blank forever, so it
 * is dropped with a warning that says what to do about it.
 */
function urlSafe(name: string, what: string) {
  if (!/[#?]/.test(name)) return true;
  console.warn(`[canvases] skipping ${what} "${name}": # and ? cannot appear in a board's name`);
  return false;
}

/** One folder per board, one HTML file per screen. Missing layout.json / icon.png are normal. */
function scan(dir: string): Board[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() || e.isSymbolicLink())
    .map((e) => e.name)
    // `import.meta.glob` skipped dot-prefixed folders (`dot: false`) and the discovery set has
    // to match it exactly, or an upgrade changes which boards exist.
    .filter((slug) => !slug.startsWith("."))
    .filter((slug) => urlSafe(slug, "board folder"))
    .sort()
    .map((slug) => {
      const folder = path.join(dir, slug);
      // `throwIfNoEntry: false` because a dangling symlink here used to throw out of load(), and
      // then *every* board 500s rather than the one bad entry being skipped.
      if (!fs.statSync(folder, { throwIfNoEntry: false })?.isDirectory()) return null;
      let names: string[];
      try {
        names = fs.readdirSync(folder);
      } catch {
        return null; // unreadable folder: skip it, do not take the whole canvas down
      }
      // Must resolve to a real file. A *directory* named `foo.html` would otherwise be listed as
      // a board and its import would resolve to index.html, leaving a permanently blank shape.
      const isFile = (name: string) =>
        fs.statSync(path.join(folder, name), { throwIfNoEntry: false })?.isFile() ?? false;
      return {
        slug,
        html: names
          // dot-files for the same reason the dot-folders above are skipped: `import.meta.glob`
          // used `dot: false`, and the discovery set has to keep matching it.
          .filter((f) => !f.startsWith(".") && f.endsWith(".html") && isFile(f))
          .filter((f) => urlSafe(f, "board"))
          .sort(),
        layout: fs.existsSync(path.join(folder, "layout.json")),
        icon: fs.existsSync(path.join(folder, "icon.png")),
        assets: assetIndex(folder),
        brand: brandImages(folder),
      };
    })
    .filter((b): b is Board => b !== null && b.html.length > 0);
}

/**
 * Serves the board source as a generated module.
 *
 * `import.meta.glob` is itself only a Vite codegen macro, so generating the same three maps by
 * hand costs nothing downstream and buys a directory that can be chosen at run time.
 */
function canvasesSource(): Plugin {
  let isBuild = false;
  let base = "/";

  /**
   * The address a board is a web page at: `/board/<slug>/<file>.html`, served from the boards
   * directory by the middleware below and emitted as a file of its own by the build.
   *
   * A real address rather than the `blob:` URL this used to be. A blob is a page no extension
   * can work on — a Figma importer, a reader, a screenshotter all refuse it as a restricted
   * page — and it cannot be linked to, reloaded or shared either.
   */
  const pageUrl = (slug: string, file: string) =>
    `${base}board/${encodeURI(slug)}/${encodeURI(file)}`;

  return {
    name: "prototyping-canvases",

    config(_, { command }) {
      isBuild = command === "build";
    },

    configResolved(config) {
      base = config.base;
    },

    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },

    async load(id) {
      if (id !== RESOLVED_ID) return null;

      const boards = scan(canvasesDir);
      // Every variant up front, because the imports emitted below have to name files that
      // already exist. Cached after the first run, so this is a stat per image from then on.
      const thumbs = new Map<string, string>();
      for (const board of boards) {
        for (const file of board.brand) {
          const thumb = await brandThumb(path.join(canvasesDir, board.slug, file));
          if (thumb) thumbs.set(`${board.slug}/${file}`, thumb);
        }
      }
      // Dev serves files outside the project root through /@fs; a build resolves the absolute
      // path itself and emits the asset.
      //
      // encodeURI, not encodeURIComponent: Vite decodes the request path with decodeURI, so only
      // an encoding decodeURI reverses survives the round trip. That is also why `#` and `?` in a
      // name cannot be encoded away at all, and are dropped at scan time instead.
      const spec = (p: string, query = "") =>
        jsString(isBuild ? `${p}${query}` : `/@fs${encodeURI(p)}${query}`);

      const imports: string[] = [];
      const loaders: string[] = [];
      const pages: string[] = [];
      const layouts: string[] = [];
      const icons: string[] = [];
      const brand: string[] = [];
      const brandThumbs: string[] = [];
      let brandCount = 0;
      const assets: string[] = [];
      const comments: string[] = [];

      boards.forEach((board, i) => {
        const folder = path.join(canvasesDir, board.slug);

        for (const file of board.html) {
          const key = jsString(keyFor(board.slug, file));
          pages.push(`  ${key}: ${jsString(pageUrl(board.slug, file))},`);
          if (isBuild) {
            // The board, verbatim, as a file of its own in the output. It is the page the
            // "open as a web page" buttons point at, and the canvas fetches its boards from
            // the same files rather than from a chunk each: the HTML is 35 MB, and shipping
            // it twice over would be the whole site again for nothing.
            this.emitFile({
              type: "asset",
              fileName: `board/${board.slug}/${file}`,
              source: fs.readFileSync(path.join(folder, file)),
            });
            loaders.push(`  ${key}: () => __board(${jsString(pageUrl(board.slug, file))}),`);
          } else {
            // Dev keeps the import: the module graph is what makes a rewritten board reload
            // the page, and it is also how the tests, which have no server to fetch from,
            // read a board at all.
            const from = spec(path.join(folder, file), "?raw");
            loaders.push(`  ${key}: () => import(${from}).then((m) => m.default),`);
          }
        }
        if (board.layout) {
          imports.push(`import __layout${i} from ${spec(path.join(folder, "layout.json"))};`);
          layouts.push(`  ${jsString(keyFor(board.slug, "layout.json"))}: __layout${i},`);
        }
        if (board.icon) {
          imports.push(`import __icon${i} from ${spec(path.join(folder, "icon.png"), "?url")};`);
          icons.push(`  ${jsString(keyFor(board.slug, "icon.png"))}: __icon${i},`);
        }
        for (const file of board.brand) {
          const n = brandCount++;
          const key = jsString(keyFor(board.slug, file));
          imports.push(`import __brand${n} from ${spec(path.join(folder, file), "?url")};`);
          brand.push(`  ${key}: __brand${n},`);
          // Keyed identically to the original, so the two maps line up by path.
          const thumb = thumbs.get(`${board.slug}/${file}`);
          if (thumb) {
            imports.push(`import __thumb${n} from ${spec(thumb, "?url")};`);
            brandThumbs.push(`  ${key}: __thumb${n},`);
          }
        }
        if (Object.keys(board.assets).length) {
          assets.push(`  ${jsString(board.slug)}: ${jsLiteral(board.assets)},`);
        }
        // Inlined rather than imported: comments.json is written back by the endpoint below on
        // every post, and an import would put it in the module graph, where each write would
        // reload the page out from under the composer that caused it.
        const commentsPath = path.join(folder, "comments.json");
        if (fs.existsSync(commentsPath)) {
          try {
            const parsed = JSON.parse(fs.readFileSync(commentsPath, "utf8"));
            comments.push(`  ${jsString(board.slug)}: ${jsLiteral(parsed)},`);
          } catch (error) {
            // A board whose comments file is corrupt still has to open, without its comments.
            this.warn(`ignoring ${commentsPath}: ${error}`);
          }
        }
      });

      return [
        `// generated by the prototyping-canvases plugin${isBuild ? "" : ` from ${canvasesDir}`}`,
        ...imports,
        // A board that 404s has to reject rather than resolve with the host's error page: the
        // canvas would put that page in the frame and call it the board.
        ...(isBuild
          ? [
              `const __board = (url) =>`,
              `  fetch(url).then((r) => {`,
              `    if (!r.ok) throw new Error(url + ": " + r.status);`,
              `    return r.text();`,
              `  });`,
            ]
          : []),
        // Empty in a build. The bundle is public — the hosted canvas ships it — and this is the
        // build machine's filesystem, which is exactly why repoRootMeta stays dev-only too. The
        // empty-state notice drops the path when it has none.
        `export const canvasesDir = ${jsString(isBuild ? "" : canvasesDir)};`,
        `export const canvasesNamespace = ${jsString(isBuild ? "" : canvasesNamespace)};`,
        `export const fileLoaders = {\n${loaders.join("\n")}\n};`,
        `export const boardPages = {\n${pages.join("\n")}\n};`,
        `export const rawLayouts = {\n${layouts.join("\n")}\n};`,
        `export const rawIcons = {\n${icons.join("\n")}\n};`,
        `export const rawBrandImages = {\n${brand.join("\n")}\n};`,
        `export const rawBrandThumbs = {\n${brandThumbs.join("\n")}\n};`,
        `export const brandThumbEdge = ${THUMB_EDGE};`,
        `export const rawAssetNames = {\n${assets.join("\n")}\n};`,
        `export const rawComments = {\n${comments.join("\n")}\n};`,
        // The HMR boundary for every layout.json, which the inspector's status control writes on
        // each click. A layout.json is a real import and accepts nothing itself, so without a
        // boundary here Vite walks up to the entry and full-reloads: switching a status threw
        // away the tldraw document, the open panel and the viewport, to change one word.
        //
        // Self-accepting stops that walk. This module is re-executed with the new JSON while the
        // page stays up, and announces its fresh layouts. Importers hold the *old* module's
        // bindings, so the new data has to be handed over rather than read. canvasLibrary.ts
        // listens, and is the only reader. Fires on first execution too, before anything is
        // listening, which is the same no-op as any event with no handler.
        `if (import.meta.hot) {`,
        `  import.meta.hot.accept();`,
        `  window.dispatchEvent(new CustomEvent("sp:canvases", { detail: rawLayouts }));`,
        `}`,
      ].join("\n");
    },

    configureServer(server) {
      // A board as a web page, at the address the canvas's two "open as a web page" buttons
      // point at. The build emits these as files (see `load` above); here they are read off
      // the boards directory per request, so the tab a board is open in shows the current
      // version of it on a reload, the same as the canvas does.
      server.middlewares.use("/board", (req, res, next) => {
        let rel: string;
        try {
          rel = decodeURI((req.url ?? "").split(/[?#]/)[0]);
        } catch {
          return next(); // a broken escape is not a board
        }
        const parts = rel.split("/").filter(Boolean);
        const file = path.join(canvasesDir, ...parts);
        // <slug>/<board>.html and nothing else. The names go into a filesystem path, so a
        // request that could climb out of the boards directory is refused rather than
        // normalised — `..` is the obvious one, a separator inside a segment the platform one.
        if (
          parts.length !== 2 ||
          !parts[1].endsWith(".html") ||
          !file.startsWith(canvasesDir + path.sep) ||
          !fs.statSync(file, { throwIfNoEntry: false })?.isFile()
        ) {
          return next();
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        fs.createReadStream(file).pipe(res);
      });

      // The inspector's status badge, writing back. Only the dev server can do this: a built
      // canvas is static files on a host with no repo behind them, which is why the badge is
      // not a button there.
      server.middlewares.use("/__sp/board-status", (req, res, next) => {
        if (req.method !== "POST") return next();
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          const send = (code: number, message: string) => {
            res.statusCode = code;
            res.end(message);
          };
          try {
            const { slug, file, status } = JSON.parse(body || "{}");
            // The two names land in a filesystem path, so they are checked before they are
            // joined, not after: a `slug` of "../.." would otherwise write outside the boards.
            if (!SAFE_NAME.test(slug ?? "") || !SAFE_NAME.test(file ?? "")) {
              return send(400, "bad board name");
            }
            if (!BOARD_STATUSES.includes(status)) return send(400, "bad status");
            const layoutPath = path.join(canvasesDir, slug, "layout.json");
            const before = fs.readFileSync(layoutPath, "utf8");
            const after = withBoardStatus(before, file, status);
            if (after === null) return send(404, "board is not in layout.json");
            if (after !== before) {
              fs.writeFileSync(layoutPath, after);
              // Hand the edited layout to the page directly rather than leaving it to hear about
              // its own write from the watcher, which answers a batch and not a keystroke: a
              // badge that lags a fifth of a second behind the click reads as a badge that did
              // not take. canvasLibrary.ts listens.
              server.hot.send("sp:board-status", { slug, layout: JSON.parse(after) });
              // And drop the transformed layout.json by hand for the same reason, or the *next*
              // page load, if it beats the watcher, would serve the status back stale and undo
              // what the click just did.
              for (const mod of server.moduleGraph.getModulesByFile(layoutPath) ?? []) {
                server.moduleGraph.invalidateModule(mod);
              }
            }
            send(200, "ok");
          } catch (error) {
            send(500, String(error));
          }
        });
      });

      // The boards are watched at the bottom of this hook. Create the folder first: watching a
      // path that does not exist registers nothing, and a brand new project is exactly the case
      // where the first board folder appears while the server is already up.
      fs.mkdirSync(canvasesDir, { recursive: true });

      // The generated index, dropped so the next request for it runs the scan again. Whoever
      // asks for that request is the caller's business: the watcher reloads the open page,
      // while the clone endpoint below leaves it to the navigation it answers with.
      const invalidateIndex = () => {
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
      };

      const rebuild = () => {
        invalidateIndex();
        server.ws.send({ type: "full-reload" });
      };

      // Canvas comments, written back into the board folder so they travel with it in Git.
      // This is a repo-local review tool, not a synced document, and a comment on a mockup is
      // only worth anything next to the mockup it is about. Dev server only, like the two
      // endpoints around it.
      server.middlewares.use("/__sp/comments", (req, res, next) => {
        if (req.method !== "POST") return next();
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          const send = (code: number, message: string) => {
            res.statusCode = code;
            res.end(message);
          };
          try {
            const { slug, file } = JSON.parse(body || "{}");
            // The slug lands in a filesystem path, so it is checked before it is joined.
            if (!SAFE_NAME.test(slug ?? "")) return send(400, "bad board name");
            const folder = path.join(canvasesDir, slug);
            if (!fs.statSync(folder, { throwIfNoEntry: false })?.isDirectory()) {
              return send(404, `no canvas folder named ${slug}`);
            }
            const target = path.join(folder, "comments.json");
            // The last comment on a board leaves no file behind: an empty one would be a diff
            // in every folder anyone ever opened.
            if (!file?.records?.length) {
              fs.rmSync(target, { force: true });
            } else {
              // Machine-written every time, so unlike layout.json this may be re-serialised
              // whole. Two spaces and a trailing newline to keep the Git diff line-by-line.
              fs.writeFileSync(target, JSON.stringify(file, null, 2) + "\n");
            }
            // No reload broadcast: the page that posted already has these records in its store,
            // and reloading would throw away the composer that is still open. Dropping the
            // index is only so the *next* load reads the file back rather than the scan the
            // server did at startup.
            invalidateIndex();
            send(200, "ok");
          } catch (error) {
            send(500, String(error));
          }
        });
      });

      // Cloning a canvas, from the button in the top bar: the folder copied whole under the name
      // the dialog asked for. Dev server only, like the status write and for the same reason. A
      // built canvas is static files with no folder behind them.
      server.middlewares.use("/__sp/clone-canvas", (req, res, next) => {
        if (req.method !== "POST") return next();
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          const send = (code: number, message: string) => {
            res.statusCode = code;
            res.end(message);
          };
          try {
            const { slug, name } = JSON.parse(body || "{}");
            const target = canvasSlug(name ?? "");
            // Both names land in a filesystem path, so they are checked before they are joined.
            if (!SAFE_NAME.test(slug ?? "") || !SAFE_NAME.test(target)) {
              return send(400, "bad canvas name");
            }
            const from = path.join(canvasesDir, slug);
            const to = path.join(canvasesDir, target);
            // The welcome page is drawn by the app and has no folder, so this is also what
            // stops it being cloned into one.
            if (!fs.existsSync(from)) return send(404, `no canvas folder named ${slug}`);
            if (fs.existsSync(to)) return send(409, `${target} already exists`);
            // Everything, generator and assets included: a board folder is only worth cloning
            // if the clone can be regenerated the same way the original could.
            fs.cpSync(from, to, { recursive: true });
            const layoutPath = path.join(to, "layout.json");
            const before = fs.existsSync(layoutPath)
              ? fs.readFileSync(layoutPath, "utf8")
              : null;
            fs.writeFileSync(
              layoutPath,
              // Nothing to preserve when the original had no layout at all, so the clone gets a
              // fresh one that does nothing but carry the name.
              before === null
                ? JSON.stringify({ name }, null, 2) + "\n"
                : withCanvasName(before, name),
            );
            // No reload broadcast: the page that asked is about to navigate to the clone, and a
            // reload racing that navigation would land it back on the canvas it copied.
            invalidateIndex();
            res.setHeader("content-type", "application/json");
            send(200, JSON.stringify({ slug: target }));
          } catch (error) {
            send(500, String(error));
          }
        });
      });

      // The agent behind the chat panel: one process per message — Claude Code or Codex, by the
      // panel's choice, looked up in agents.ts — run in the user's project, its output kept here
      // and streamed to the page. Dev server only, like the endpoints above and more so, since
      // the process writes files.
      //
      // Two steps rather than one streaming response: the agent's work is a board written to
      // disk, and the watcher below answers that with a full reload, so a stream bound to the
      // fetch that started the run would die exactly when the run succeeds. The page comes back
      // with the run's id and reads its events from wherever it left off (agentRun.ts).
      //
      // No reload broadcast from here: a board the agent writes reaches the page through the
      // watcher like anyone else's, and anything else it writes is not the canvas's business.
      const runs = new Map<string, Run & { child: ChildProcess }>();
      // Which agents are installed: `bin --version` once each, for the server's lifetime, so
      // the menu greys out one that is missing and says what to do, rather than letting the
      // first message find out.
      const probes = new Map<string, Promise<boolean>>();
      const installed = (def: AgentDef) => {
        let probe = probes.get(def.id);
        if (!probe) {
          probe = new Promise((done) =>
            execFile(def.bin, ["--version"], { timeout: 10_000 }, (error) => done(!error)),
          );
          probes.set(def.id, probe);
        }
        return probe;
      };
      // The models an agent offers the composer: its own list when it keeps one on disk —
      // codex caches what its server sent, which is the list its own picker draws — and the
      // table's otherwise. Read once for the server's lifetime, like the probe above; a user
      // who installs a new model restarts the canvas, as they would for a new CLI.
      const catalogs = new Map<string, AgentModel[]>();
      const models = (def: AgentDef) => {
        let list = catalogs.get(def.id);
        if (!list) {
          list = def.models;
          if (def.modelsFile) {
            try {
              const file = path.join(os.homedir(), def.modelsFile.path);
              list = def.modelsFile.read(JSON.parse(fs.readFileSync(file, "utf8")));
            } catch {
              // No cache yet, or one this cannot read: the table's list stands, which for an
              // agent that keeps its own is empty, leaving the composer its default alone.
            }
          }
          catalogs.set(def.id, list);
        }
        return list;
      };
      // The slash commands each agent last said it had. Claude Code lists them on the init frame
      // of every run, so they cost nothing to learn and are exactly what that project can run;
      // the palette is empty until the first message, which is the price of not spawning a CLI
      // to ask. A bad line is a line: the menu must never take a run down with it.
      const commands = new Map<string, string[]>();
      const harvest = (def: AgentDef, line: string) => {
        try {
          const list = def.commands?.(line);
          if (list) commands.set(def.id, list);
        } catch {
          // Not the line that carries them.
        }
      };
      server.middlewares.use("/__sp/agent", (req, res, next) => {
        const send = (code: number, message: string) => {
          res.statusCode = code;
          res.end(message);
        };
        // Mounted under the prefix, so req.url is "/agents", "/run", "/runs",
        // "/run/<id>/events?after=N" or "/run/<id>/cancel".
        const url = new URL(req.url ?? "/", "http://sp");
        if (req.method === "GET" && url.pathname === "/commands") {
          res.setHeader("content-type", "application/json");
          send(200, JSON.stringify(commands.get(url.searchParams.get("agent") ?? "") ?? []));
          return;
        }
        if (req.method === "GET" && url.pathname === "/agents") {
          // Ahead of the project check: what is on PATH does not depend on it.
          void Promise.all(
            AGENTS.map(async (def) => ({
              id: def.id,
              name: def.name,
              available: await installed(def),
              models: models(def),
              efforts: def.efforts,
              missing: def.missing,
            })),
          ).then((list) => {
            res.setHeader("content-type", "application/json");
            send(200, JSON.stringify(list));
          });
          return;
        }
        const project = projectDir;
        if (!project) {
          return send(
            503,
            "PROTOTYPING_PROJECT_DIR is not set, so there is no project for the agent to work in. " +
              "`sp-canvas start` sets it to the directory it is started from.",
          );
        }
        if (req.method === "POST" && url.pathname === "/run") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", () => {
            try {
              const { message, canvas, agent = "claude", model = "", effort = "" } = JSON.parse(body || "{}");
              if (typeof message !== "string" || !message.trim()) return send(400, "empty message");
              const def = AGENTS.find((a) => a.id === agent);
              if (!def) return send(400, "unknown agent");
              // Both reach a command line, and neither is a name this made up: they are ids out
              // of the list this server just served, or the empty string for the CLI's default.
              const known = models(def);
              if (model && !known.some((m) => m.id === model)) return send(400, "unknown model");
              const efforts = known.find((m) => m.id === model)?.efforts ?? def.efforts;
              if (effort && !efforts.includes(effort)) return send(400, "unknown effort");
              // The slug lands in a path in the prompt, so it is checked like the others.
              if (canvas !== undefined && !SAFE_NAME.test(canvas)) return send(400, "bad canvas name");
              const preamble = [
                `You are working in the user's project at ${project}, from the chat panel of the ` +
                  "super-prototyping canvas they have open.",
                `Their boards are the folders under ${canvasesDir}, one per canvas page.`,
                canvas &&
                  `They are looking at the canvas "${canvas}", whose folder is ${path.join(canvasesDir, canvas)}.`,
                `Before touching a board folder, read ${repoRoot}/skills/prototype-canvas/SKILL.md, ` +
                  "the prototype-canvas skill of the super-prototyping plugin: one folder is one canvas " +
                  "page, one .html file in it is one board, layout.json places them, and the open canvas " +
                  "reloads by itself when a board is rewritten.",
                "Open your first reply with a title for this conversation on a line of its own, as " +
                  "<sp-title>three to six words naming what was asked</sp-title>, then go on as usual.",
              ]
                .filter(Boolean)
                .join("\n");
              const run = Object.assign(newRun(randomUUID()), {
                child: spawn(def.bin, def.args({ preamble, boards: canvasesDir, model, effort }), {
                  cwd: project,
                  env: process.env,
                }),
              });
              runs.set(run.id, run);
              // The agent, the prompt, its first line as the title until the model gives one, and
              // the time: the first event, so a replay from zero rebuilds the whole turn with the
              // right mark on it and the history list reads off the same events (agentRun.ts).
              emit(run, "start", {
                kind: "start",
                agent: def.id,
                prompt: message,
                title: message.trim().split("\n")[0].slice(0, 60),
                at: Date.now(),
              });
              // ponytail: the newest 20 runs are kept whatever their age; a tab that reattaches
              // to an older one gets a 404 and shows it.
              for (const [id, old] of runs) {
                if (runs.size <= 20) break;
                if (ended(old)) runs.delete(id);
              }
              const finish = (message: string) => {
                if (!ended(run)) emit(run, "end", { kind: "end", ok: false, message });
              };
              let stderr = "";
              run.child.stderr.setEncoding("utf8").on("data", (chunk: string) => (stderr += chunk));
              let pending = "";
              const lift = titleFilter();
              // Codex reports what a turn used but never how much there was; the model list it
              // caches says, and this is the one place that knows which model was picked.
              const contextWindow = known.find((m) => m.id === model)?.window;
              const sized = (e: ChatEvent) =>
                e.kind === "usage" && e.window === undefined && contextWindow
                  ? { ...e, window: contextWindow }
                  : e;
              const feed = (chunk: string) => {
                const lines = (pending + chunk).split("\n");
                pending = lines.pop()!;
                try {
                  for (const line of lines) {
                    if (line.trim()) {
                      harvest(def, line);
                      for (const e of def.events(line)) for (const t of lift(e)) emit(run, t.kind, sized(t));
                    }
                  }
                } catch (error) {
                  run.child.kill();
                  finish(`unreadable output from ${def.bin}: ${error}`);
                }
              };
              run.child.stdout.setEncoding("utf8").on("data", feed).on("end", () => feed("\n"));
              // A CLI that exits at once — an older one refusing a flag — closes the pipe before
              // the prompt is written; the exit below reports that, and the write error is noise.
              run.child.stdin.on("error", () => {});
              run.child.stdin.end(def.stdin(message, preamble));
              run.child.on("error", (error: NodeJS.ErrnoException) =>
                finish(error.code === "ENOENT" ? def.missing : String(error)),
              );
              run.child.on("close", (code, signal) => {
                if (ended(run)) return;
                const tail = stderr.trim().split("\n").slice(-5).join("\n");
                // `claude` is a launcher around the real process: a SIGTERM to it comes back as
                // exit 143, not as a signal. Harmless for codex, which dies by the signal.
                finish(
                  signal || code === 143
                    ? "stopped"
                    : `${def.bin} exited with code ${code}` +
                        (tail ? `\n${tail}` : "") +
                        (def.id === "claude" && /unknown option/i.test(stderr)
                          ? "\nThe panel needs Claude Code 2.1.274 or newer."
                          : ""),
                );
              });
              res.setHeader("content-type", "application/json");
              send(202, JSON.stringify({ runId: run.id }));
            } catch (error) {
              send(500, String(error));
            }
          });
          return;
        }
        if (req.method === "GET" && url.pathname === "/runs") {
          // Newest first, and in memory only: a restarted server lists nothing, which is
          // consistent with it holding every run's events and nothing else holding any.
          res.setHeader("content-type", "application/json");
          return send(200, JSON.stringify([...runs.values()].reverse().map(runSummary)));
        }
        const match = /^\/run\/([\w-]+)\/(events|cancel)$/.exec(url.pathname);
        if (!match) return next();
        const run = runs.get(match[1]);
        if (!run) return send(404, "no such run");
        if (match[2] === "events" && req.method === "GET") {
          const after = Number(url.searchParams.get("after") ?? 0);
          if (!Number.isInteger(after) || after < 0) return send(400, "bad cursor");
          res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store" });
          res.flushHeaders();
          const detach = attach(run, after, (e) => {
            res.write(sseFrame(e));
            if (e.event === "end") res.end();
          });
          const keepalive = setInterval(() => res.write(": keepalive\n\n"), 25_000);
          res.on("close", () => {
            detach();
            clearInterval(keepalive);
          });
          return;
        }
        if (match[2] === "cancel" && req.method === "POST") {
          run.child.kill();
          return send(200, "");
        }
        next();
      });

      // Every module Vite transformed from this file, dropped, so the next request for it reads
      // the file again. The same call the status endpoint above makes, and it is effective for a
      // board exactly as it is for a layout.json.
      const invalidateFile = (file: string) => {
        for (const mod of server.moduleGraph.getModulesByFile(file) ?? []) {
          server.moduleGraph.invalidateModule(mod);
        }
      };

      const list = (dir: string) => {
        try {
          return fs.readdirSync(dir);
        } catch {
          return []; // unreadable or gone: it signs as empty rather than throwing out of a watch
        }
      };
      let signature = boardSetSignature(canvasesDir, list);

      /**
       * One settled batch of writes, answered once.
       *
       * The set of boards first, because a board added, removed or renamed makes the generated
       * index wrong about which boards exist, and a reload is the only thing that fixes that.
       * Otherwise the batch is read file by file, and a board is reloaded while a layout is
       * handed over live — the distinction the canvas has always drawn, now drawn for a write
       * from anywhere rather than only for one the endpoints made themselves.
       */
      const settle = (files: string[]) => {
        const now = boardSetSignature(canvasesDir, list);
        if (now !== signature) {
          signature = now;
          rebuild();
          return;
        }
        let dropIndex = false;
        let reload = false;
        const layouts = new Set<string>();
        for (const file of files) {
          switch (boardChangeKind(canvasesDir, file)) {
            case "board":
              // A reload rather than an HMR update: the page keeps every board it has fetched in
              // a Map (canvasLibrary.ts), and re-executing the generated module hands over fresh
              // layouts, never fresh HTML. The tldraw document is in IndexedDB and survives the
              // reload; the viewport is what it costs, which is why only a board edit spends it.
              invalidateFile(file);
              reload = true;
              break;
            case "assets":
              // An image edited in place keeps its name and changes its hash, so the index that
              // names a board's images by content is stale until it is generated again.
              invalidateFile(file);
              dropIndex = true;
              reload = true;
              break;
            case "layout":
              invalidateFile(file);
              layouts.add(file);
              break;
            case "comments":
              // No reload: comments.json is written by the endpoint above on every post, and the
              // page that posted already holds the record. Dropping the index is only so the
              // *next* load reads the file rather than the scan the server did at startup.
              dropIndex = true;
              break;
          }
        }
        for (const file of layouts) {
          // The same message the status endpoint sends, for the same reason: a layout.json is
          // read on every render, and a reload to change one word would throw away the tldraw
          // viewport and the open panel. canvasLibrary.ts listens.
          try {
            const layout = JSON.parse(fs.readFileSync(file, "utf8"));
            server.hot.send("sp:board-status", { slug: boardSlug(canvasesDir, file), layout });
          } catch {
            // Half-written or malformed: the next write brings a whole one, and the page keeps
            // the layout it has until then.
          }
        }
        if (dropIndex) invalidateIndex();
        if (reload) server.ws.send({ type: "full-reload" });
      };

      // A generator writes a folder of boards over a second or two, and a save can arrive as
      // more than one event. Batched on the trailing edge, so a run answers with one reload
      // once it is done rather than one per file while it is still writing.
      const queued = new Set<string>();
      let batch: ReturnType<typeof setTimeout> | undefined;
      const queue = (file: string) => {
        queued.add(file);
        clearTimeout(batch);
        batch = setTimeout(() => {
          const files = [...queued];
          queued.clear();
          try {
            settle(files);
          } catch (error) {
            server.config.logger.error(`[canvases] ${error}`);
          }
        }, 120);
        // Never a reason to hold the process open: a pending reload for a server on its way down
        // has nobody left to send it to.
        batch.unref?.();
      };

      // The boards are watched here, directly, rather than through `server.watcher`.
      //
      // `server.watcher` watches the app's root, and the boards are always outside it — one level
      // up for this checkout, anywhere at all under PROTOTYPING_CANVASES_DIR. `.add()` for a path
      // outside the root is accepted and can then register nothing at all (issue #52), silently:
      // no event ever arrives, the transformed module for a board stays as it was read at
      // startup, and the server serves that board for the rest of its life however often the file
      // is rewritten. That is unrecoverable from the browser, because the ETag never changes
      // either, and it is the one failure a design tool must not have.
      //
      // Recursive fs.watch is supported on macOS and Windows, and on Linux since Node 20. Older
      // Linux throws ERR_FEATURE_UNAVAILABLE_ON_PLATFORM, and there `server.watcher` is still
      // better than nothing: it watches inotify-style, and the boards are usually in the same
      // tree as the app.
      try {
        const watcher = fs.watch(canvasesDir, { recursive: true }, (_event, name) => {
          if (name) queue(path.resolve(canvasesDir, name.toString()));
        });
        watcher.on("error", (error) => {
          server.config.logger.error(`[canvases] watch of ${canvasesDir} failed: ${error}`);
        });
        watcher.unref();
        server.httpServer?.once("close", () => watcher.close());
      } catch (error) {
        server.config.logger.warn(
          `[canvases] recursive watch of ${canvasesDir} is unavailable (${error}); ` +
            `falling back to Vite's watcher, which may miss boards outside the app's root`,
        );
        server.watcher.add(canvasesDir);
        for (const event of ["add", "unlink", "change", "addDir", "unlinkDir"] as const) {
          server.watcher.on(event, queue);
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), repoRootMeta(), canvasesSource()],
  server: {
    // The boards sit outside this app's root — one level up by default, anywhere at all when
    // PROTOTYPING_CANVASES_DIR points elsewhere. They load on demand rather than being pulled
    // into the module graph at startup, so the folder has to be allowed outright.
    fs: { allow: [repoRoot, canvasesDir] },
  },
  build: {
    // A board is fetched from its own file (the `prototyping-canvases` plugin emits them), so
    // nothing here is board-sized any more. The limit stays generous because the tldraw entry
    // is a megabyte on its own and a warning nobody can act on is noise.
    chunkSizeWarningLimit: 4_000,
    rollupOptions: {
      // Three pages: the canvas, the sheet that shows one canvas page's boards at full size,
      // and the brand page that shows the same page's brand material. Each is its own entry
      // rather than a route inside the canvas so that reading one as a web page does not
      // download tldraw to do it.
      input: { index: "index.html", sheet: "sheet.html", brand: "brand.html" },
    },
  },
});
