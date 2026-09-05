import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

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
const canvasesDir = path.resolve(
  process.env.PROTOTYPING_CANVASES_DIR || path.join(repoRoot, "mockups/canvases"),
);

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

/** The historical key for a board, kept whatever directory it was actually read from. */
const keyFor = (slug: string, file: string) => `../../mockups/canvases/${slug}/${file}`;

interface Board {
  slug: string;
  html: string[];
  layout: boolean;
  icon: boolean;
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
    .sort()
    .map((slug) => {
      const folder = path.join(dir, slug);
      if (!fs.statSync(folder).isDirectory()) return null;
      return {
        slug,
        html: fs.readdirSync(folder).filter((f) => f.endsWith(".html")).sort(),
        layout: fs.existsSync(path.join(folder, "layout.json")),
        icon: fs.existsSync(path.join(folder, "icon.png")),
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
      const spec = (p: string) => jsString(isBuild ? p : `/@fs${p}`);

      const imports: string[] = [];
      const loaders: string[] = [];
      const layouts: string[] = [];
      const icons: string[] = [];

      boards.forEach((board, i) => {
        const folder = path.join(canvasesDir, board.slug);

        for (const file of board.html) {
          const from = spec(`${path.join(folder, file)}?raw`);
          loaders.push(
            `  ${jsString(keyFor(board.slug, file))}: () => import(${from}).then((m) => m.default),`,
          );
        }
        if (board.layout) {
          imports.push(`import __layout${i} from ${spec(path.join(folder, "layout.json"))};`);
          layouts.push(`  ${jsString(keyFor(board.slug, "layout.json"))}: __layout${i},`);
        }
        if (board.icon) {
          imports.push(`import __icon${i} from ${spec(`${path.join(folder, "icon.png")}?url`)};`);
          icons.push(`  ${jsString(keyFor(board.slug, "icon.png"))}: __icon${i},`);
        }
      });

      return [
        `// generated by the prototyping-canvases plugin from ${canvasesDir}`,
        ...imports,
        `export const canvasesDir = ${jsString(canvasesDir)};`,
        `export const fileLoaders = {\n${loaders.join("\n")}\n};`,
        `export const rawLayouts = {\n${layouts.join("\n")}\n};`,
        `export const rawIcons = {\n${icons.join("\n")}\n};`,
      ].join("\n");
    },

    configureServer(server) {
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
        inside(file) && /(\.html|layout\.json|icon\.png)$/.test(file);

      const rebuild = () => {
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      };

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
