import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { svgSignature } from "./src/svgSignature.ts";

import {
  BOARD_STATUSES,
  SAFE_NAME,
  canvasSlug,
  withBoardStatus,
  withCanvasName,
} from "./src/boardStatusEdit.ts";

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

interface Board {
  slug: string;
  html: string[];
  layout: boolean;
  icon: boolean;
  assets: Record<string, AssetName>;
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

  return {
    name: "prototyping-canvases",

    config(_, { command }) {
      isBuild = command === "build";
    },

    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null;
    },

    load(id) {
      if (id !== RESOLVED_ID) return null;

      const boards = scan(canvasesDir);
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
      const layouts: string[] = [];
      const icons: string[] = [];
      const assets: string[] = [];
      const comments: string[] = [];

      boards.forEach((board, i) => {
        const folder = path.join(canvasesDir, board.slug);

        for (const file of board.html) {
          const from = spec(path.join(folder, file), "?raw");
          loaders.push(
            `  ${jsString(keyFor(board.slug, file))}: () => import(${from}).then((m) => m.default),`,
          );
        }
        if (board.layout) {
          imports.push(`import __layout${i} from ${spec(path.join(folder, "layout.json"))};`);
          layouts.push(`  ${jsString(keyFor(board.slug, "layout.json"))}: __layout${i},`);
        }
        if (board.icon) {
          imports.push(`import __icon${i} from ${spec(path.join(folder, "icon.png"), "?url")};`);
          icons.push(`  ${jsString(keyFor(board.slug, "icon.png"))}: __icon${i},`);
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
        // Empty in a build. The bundle is public — the hosted canvas ships it — and this is the
        // build machine's filesystem, which is exactly why repoRootMeta stays dev-only too. The
        // empty-state notice drops the path when it has none.
        `export const canvasesDir = ${jsString(isBuild ? "" : canvasesDir)};`,
        `export const canvasesNamespace = ${jsString(isBuild ? "" : canvasesNamespace)};`,
        `export const fileLoaders = {\n${loaders.join("\n")}\n};`,
        `export const rawLayouts = {\n${layouts.join("\n")}\n};`,
        `export const rawIcons = {\n${icons.join("\n")}\n};`,
        `export const rawAssetNames = {\n${assets.join("\n")}\n};`,
        `export const rawComments = {\n${comments.join("\n")}\n};`,
        // The HMR boundary for every layout.json, which the inspector's status control writes on
        // each click. A layout.json is a real import and accepts nothing itself, so without a
        // boundary here Vite walks up to the entry and full-reloads: switching a status threw
        // away the tldraw document, the open panel and the viewport, to change one word.
        //
        // Self-accepting stops that walk. This module is re-executed with the new JSON while the
        // page stays up, and announces its fresh layouts — importers hold the *old* module's
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
              // Hand the edited layout to the page directly instead of waiting for the file
              // watcher to notice the write. The boards live outside the app's root, where the
              // watcher misses changes, and a missed one meant the status only took effect on
              // the next reload. canvasLibrary.ts listens.
              server.hot.send("sp:board-status", { slug, layout: JSON.parse(after) });
              // The same missed event leaves the transformed layout.json cached as it was when
              // the server started, so drop it by hand or the *next* page load would serve the
              // status back stale and undo what the click just did.
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

      // Editing a board already reloads, because the file is in the module graph once fetched.
      // Adding or deleting one changes the *set* of boards, which only this module knows, so it
      // has to be rebuilt and the page reloaded.
      //
      // Create the folder first. Watching a path that does not exist registers nothing — chokidar
      // does not watch a parent for its creation — and a brand new project is exactly the case
      // where the first board folder appears while the server is already up.
      fs.mkdirSync(canvasesDir, { recursive: true });
      server.watcher.add(canvasesDir);

      const inside = (p: string) => p.startsWith(canvasesDir + path.sep);
      const structural = (file: string) =>
        inside(file) &&
        (/(\.html|layout\.json|icon\.png|assets\.json)$/.test(file) ||
          /\/assets(-dark)?\//.test(file));

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

      // Canvas comments, written back into the board folder so they travel with it in Git —
      // this is a repo-local review tool, not a synced document, and a comment on a mockup is
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
      // the dialog asked for. Dev server only, like the status write and for the same reason —
      // a built canvas is static files with no folder behind them.
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

      const onFile = (file: string) => {
        if (structural(file)) rebuild();
      };
      // A board folder appearing or vanishing changes the set even though no file event names a
      // board file. Scoped to the boards directory: the watcher also sees `dist/` being written
      // during a build, which is nothing to do with us.
      const onDir = (dir: string) => {
        if (inside(dir)) rebuild();
      };

      server.watcher.on("add", onFile);
      server.watcher.on("unlink", onFile);
      // An asset edited in place keeps its name and changes its hash, so the index is stale
      // until the module is rebuilt. Board HTML edits already reload through the module graph.
      server.watcher.on("change", (file) => {
        if (inside(file) && /\/assets(-dark)?\/|assets\.json$/.test(file)) rebuild();
      });
      server.watcher.on("addDir", onDir);
      server.watcher.on("unlinkDir", onDir);
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
    // Every board is its own lazy chunk (canvasLibrary.ts), fetched when a shape first shows it.
    // The largest single board is a few MB of inlined images, which is the size of the thing and
    // not a bundling mistake, so the warning starts above it.
    chunkSizeWarningLimit: 4_000,
  },
});
