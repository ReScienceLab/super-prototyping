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

/**
 * One chunk per board folder. Every board's HTML is inlined as a string, and the biggest
 * folders run to several MB each; in one bundle they push past the 25 MiB per-file limit
 * Cloudflare Pages enforces, so each `mockups/canvases/<slug>/` becomes its own `board-<slug>`
 * chunk instead.
 */
const BOARD_FOLDER = /\/mockups\/canvases\/([^/]+)\//;

export default defineConfig({
  plugins: [react(), repoRootMeta()],
  build: {
    chunkSizeWarningLimit: 8_000,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            {
              name: (id) => {
                const slug = BOARD_FOLDER.exec(id)?.[1];
                return slug ? `board-${slug}` : undefined;
              },
              test: BOARD_FOLDER,
            },
          ],
        },
      },
    },
  },
});
