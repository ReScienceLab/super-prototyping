import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import sharp from "sharp";
import { defineConfig, type Plugin } from "vitest/config";
import { CANVASES, THUMB_EDGE, boardIndex } from "./server/boards.ts";
import { createProjectsServer, projectsDirFromEnv } from "./server/projects.ts";

// Repo root — vite.config.ts sits in canvas/, one level below it.
const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
/**
 * The boards a build embeds, for the hosted canvas: this checkout's own, or an empty folder
 * for the bundle a release attaches, which serves a project's boards at request time and needs
 * none of its own. Build only: a served canvas reads every project's boards from the project
 * (server/projects.ts), and this variable is not read there.
 */
const canvasesDir = path.resolve(
  process.env.PROTOTYPING_CANVASES_DIR || path.resolve(repoRoot, CANVASES),
);

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
 * `/board/<slug>/`. The dev server answers both from `server/projects.ts`, the same module the
 * built app's own server (`server/main.ts`) runs, every project at `/p/<name>/` with this
 * checkout opened as one of them, so a board folder is read at request time and the canvas has
 * no dev-only feature. A build emits the same index and files once, as static output, for the
 * hosted canvas: it reads a fixed set of boards and can write nothing.
 *
 * Not an `import.meta.glob`: a glob pattern is a build-time literal and could only ever read
 * one hard-coded directory, and the boards live in whichever project is being served.
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
      const projects = createProjectsServer({
        projectsDir: projectsDirFromEnv(),
        repoRoot,
      });
      // This checkout is the project the dev server opens on, so `bun run dev` shows its boards.
      projects.open(repoRoot);
      server.middlewares.use((req, res, next) =>
        projects.handle(req, res, next),
      );
      server.httpServer?.once("close", projects.close);
    },
  };
}

export default defineConfig({
  // Relative, so the same build serves every project at its own `/p/<name>/` (server/projects.ts).
  base: "./",
  // The dev server resolves that base to `/`, which would send every fetch a page under
  // `/p/<name>/` makes to the server's root. Pinned to what the build gets, so a page fetches
  // from its own address under Vite too.
  define: { "import.meta.env.BASE_URL": '"./"' },
  plugins: [react(), tailwindcss(), canvasesSource()],
  // What shadcn/ui writes its imports as, and what its CLI expects to find.
  resolve: { alias: { "@": fileURLToPath(new URL("src", import.meta.url)) } },
  build: {
    // A board is fetched from its own file (the `prototyping-canvases` plugin emits them), so
    // nothing here is board-sized any more. The limit stays generous because the tldraw entry
    // is a megabyte on its own and a warning nobody can act on is noise.
    chunkSizeWarningLimit: 4_000,
    rollupOptions: {
      // Five pages. `index` and `home` are the window (shell.tsx), at a project's address and
      // at its home page, which lists every project. `canvas` is the canvas in the window's
      // frame, `sheet` one canvas page's boards at full size, and `brand` the same page's brand
      // material. Each is its own entry rather than a route inside the canvas, so reading one
      // as a web page does not download tldraw to do it.
      input: {
        index: "index.html",
        home: "home.html",
        canvas: "canvas.html",
        sheet: "sheet.html",
        brand: "brand.html",
      },
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
