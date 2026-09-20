import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import sharp from "sharp";
import { defineConfig, type Plugin } from "vitest/config";
import { THUMB_EDGE, boardIndex } from "./server/boards.ts";
import { createSpServer } from "./server/sp.ts";

// Repo root — vite.config.ts sits in canvas/, one level below it.
const repoRoot = fileURLToPath(new URL("..", import.meta.url)).replace(
  /\/$/,
  "",
);
/**
 * Where the boards live. Defaults to this checkout's own folder, so the repo and the hosted
 * build behave exactly as they always have with no environment set.
 *
 * The canvas app ships inside the plugin, which is installed outside the user's project, while
 * their boards stay in their project. `PROTOTYPING_CANVASES_DIR` is what joins the two — the
 * plugin holds the code, the user holds the data, and an upgrade replaces one without touching
 * the other.
 */
const canvasesDir = path.resolve(
  process.env.PROTOTYPING_CANVASES_DIR ||
    path.resolve(repoRoot, "mockups/canvases"),
);
/**
 * The user's project, for the agent behind the chat panel to run in. It is their project the
 * agent works on — the boards are one folder inside it, and a prompt about a screen reaches for
 * the code around it — so neither the boards directory nor this checkout would do as its cwd.
 * `sp start` sets it to the directory it is started from, the same one the boards default
 * under. Unset, the agent endpoints answer 503 by name and the rest of the server is unaffected.
 */
const projectDir = process.env.PROTOTYPING_PROJECT_DIR
  ? path.resolve(process.env.PROTOTYPING_PROJECT_DIR)
  : null;

const thumbsDir = fileURLToPath(
  new URL("node_modules/.cache/brand-thumbs/", import.meta.url),
);

/**
 * The variant for one brand image, generated on first sight and read from the cache after.
 * Named by the source's size and mtime, so replacing an asset writes a new file rather than
 * serving the stale one. Build only: sharp is a native module, and the served canvas shows
 * the originals rather than carry it.
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
  const out = path.join(
    thumbsDir,
    `${h.toString(36)}-${path.parse(file).name}.webp`,
  );
  // An empty cache file is the remembered answer "this one is better off as its original", so
  // a rejected image is not re-encoded on every build just to reach the same conclusion.
  if (fs.existsSync(out)) return fs.statSync(out).size ? out : undefined;
  try {
    fs.mkdirSync(thumbsDir, { recursive: true });
    const meta = await sharp(file).metadata();
    // An image the screen can already show whole gets no variant. Downscaling is what makes a
    // variant honest — the same picture, at the size it is drawn. Re-encoding one at its own
    // size is the other kind of saving, the kind that trades quality for bytes.
    if (
      !meta.width ||
      !meta.height ||
      Math.max(meta.width, meta.height) <= THUMB_EDGE
    ) {
      fs.writeFileSync(out, "");
      return undefined;
    }
    await sharp(file, { animated: true })
      .resize({
        width: THUMB_EDGE,
        height: THUMB_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
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

/**
 * The boards, as the canvas reads them: an index at `/__sp/index.json` and the files under
 * `/board/<slug>/`. The dev server answers both from `server/sp.ts`, the same module the built
 * app's own server (`server/main.ts`) runs, so a board folder is read at request time and the
 * canvas has no dev-only feature. A build emits the same index and files once, as static
 * output, for the hosted canvas: it reads a fixed set of boards and can write nothing.
 *
 * Not an `import.meta.glob`: a glob pattern is a build-time literal and could only ever read
 * one hard-coded directory, and the boards live wherever PROTOTYPING_CANVASES_DIR says.
 */
function canvasesSource(): Plugin {
  return {
    name: "prototyping-canvases",

    async buildStart() {
      if (this.environment.mode !== "build") return;
      const index = boardIndex(canvasesDir, {
        served: false,
        canvasesNamespace: "",
      });
      for (const board of index.boards) {
        const folder = path.join(canvasesDir, board.slug);
        const emit = (rel: string, source: Buffer) =>
          this.emitFile({
            type: "asset",
            fileName: `board/${board.slug}/${rel}`,
            source,
          });
        // Each board verbatim, as a file of its own: it is the page the "open as a web page"
        // buttons point at, and the canvas fetches its boards from the same files rather than
        // from a chunk each: the HTML is 35 MB, and shipping it twice over would be the whole
        // site again for nothing.
        for (const file of board.html)
          emit(file, fs.readFileSync(path.join(folder, file)));
        if (board.icon)
          emit("icon.png", fs.readFileSync(path.join(folder, "icon.png")));
        for (const file of board.brand) {
          emit(file, fs.readFileSync(path.join(folder, file)));
          const thumb = await brandThumb(path.join(folder, file));
          if (thumb) {
            emit(`__thumbs/${file}.webp`, fs.readFileSync(thumb));
            board.thumbs.push(file);
          }
        }
      }
      this.emitFile({
        type: "asset",
        fileName: "__sp/index.json",
        source: JSON.stringify(index),
      });
    },

    configureServer(server) {
      const sp = createSpServer({ canvasesDir, examplesDir: null, projectDir, repoRoot });
      server.middlewares.use((req, res, next) => sp.handle(req, res, next));
      server.httpServer?.once("close", sp.close);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), canvasesSource()],
  // What shadcn/ui writes its imports as, and what its CLI expects to find.
  resolve: { alias: { "@": fileURLToPath(new URL("src", import.meta.url)) } },
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
  test: {
    // The tests read this checkout's own boards through the same index the page fetches. One
    // scan per run, in the global setup, handed to each test file by `inject`: it hashes 300
    // MB of assets, and a scan per file would be a minute of the same work.
    globalSetup: "vitest.global.ts",
    setupFiles: ["vitest.setup.ts"],
  },
});
