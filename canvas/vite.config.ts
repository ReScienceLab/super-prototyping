import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/**
 * Repo root — vite.config.ts sits in canvas/, one level below it. It is published into the page
 * so a running server can be identified: a port that responds is not necessarily *this*
 * checkout's canvas, and `<meta name="prototyping-repo-root">` is what settles that.
 */
const repoRoot = fileURLToPath(new URL("..", import.meta.url)).replace(
  /\/$/,
  "",
);

function repoRootMeta(): Plugin {
  return {
    name: "prototyping-repo-root",
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
  // The rendered mp4s under motion/src/*/*/out/ are served as files, not inlined the way the
  // boards' `?raw` HTML is, so the dev server has to be allowed to read outside canvas/.
  server: { fs: { allow: [repoRoot] } },
});
