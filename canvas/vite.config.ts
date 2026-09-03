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

export default defineConfig({
  plugins: [react(), repoRootMeta()],
  server: {
    // The boards sit one level up from this app. The eager glob used to pull every file into
    // the module graph at startup, which is what let the dev server hand them out; now that
    // they load on demand the folder has to be allowed outright.
    fs: { allow: [repoRoot] },
  },
  build: {
    // Every board under mockups/canvases is its own lazy chunk (canvasLibrary.ts), fetched when
    // a shape first shows it. The largest single board is a few MB of inlined images, which is
    // the size of the thing and not a bundling mistake, so the warning starts above it.
    chunkSizeWarningLimit: 4_000,
  },
});
