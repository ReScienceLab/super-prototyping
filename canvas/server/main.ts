/**
 * The canvas as a localhost app: the built `dist` served as static files, with the same
 * `/__sp` and `/board` server in front of it that the Vite dev server mounts. Bundled to
 * `dist/server.mjs` by `bun run build`, so `sp-canvas start` runs one file with node or bun
 * and no dev toolchain. Usage: `node dist/server.mjs --port 5173`.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSpServer } from "./sp.ts";

// This file runs from `canvas/dist/`, two levels below the checkout. Derived rather than
// passed in, so a checkout found by `sp-canvas root` needs nothing else to name itself.
const dist = fileURLToPath(new URL(".", import.meta.url)).replace(/\/$/, "");
const repoRoot = path.resolve(dist, "../..");
const canvasesDir = path.resolve(
  process.env.PROTOTYPING_CANVASES_DIR ||
    path.join(repoRoot, "mockups/canvases"),
);
const projectDir = process.env.PROTOTYPING_PROJECT_DIR
  ? path.resolve(process.env.PROTOTYPING_PROJECT_DIR)
  : null;

const portArg = process.argv.indexOf("--port");
const port = portArg === -1 ? 5173 : Number(process.argv[portArg + 1]);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`--port needs a port number, got ${process.argv[portArg + 1]}`);
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".map": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
};

/** The built app: one file per request, `/` is index.html, anything unknown is the 404 page. */
function serveStatic(req: http.IncomingMessage, res: http.ServerResponse) {
  let pathname: string;
  try {
    pathname = decodeURI((req.url ?? "/").split(/[?#]/)[0]);
  } catch {
    pathname = "/";
  }
  if (pathname.endsWith("/")) pathname += "index.html";
  const file = path.join(dist, pathname);
  const found =
    !pathname.split("/").includes("..") &&
    file.startsWith(dist + path.sep) &&
    fs.statSync(file, { throwIfNoEntry: false })?.isFile();
  const target = found ? file : path.join(dist, "404.html");
  res.statusCode = found ? 200 : 404;
  res.setHeader("Content-Type", TYPES[path.extname(target)] ?? "application/octet-stream");
  // Vite names every built asset by its content hash, so those never change under a URL;
  // the pages and the board files it emitted are read fresh.
  res.setHeader(
    "Cache-Control",
    found && pathname.startsWith("/assets/")
      ? "public, max-age=31536000, immutable"
      : "no-cache",
  );
  fs.createReadStream(target).pipe(res);
}

const sp = createSpServer({ canvasesDir, projectDir, repoRoot });
const server = http.createServer((req, res) =>
  sp.handle(req, res, () => serveStatic(req, res)),
);
server.once("close", sp.close);
// Loopback only. This is a local design tool, not a service to expose.
server.listen(port, "127.0.0.1", () => {
  console.log(`canvas   http://127.0.0.1:${port}/`);
  console.log(`boards   ${canvasesDir}`);
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
