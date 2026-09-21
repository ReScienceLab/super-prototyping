/**
 * The canvas as a localhost app: the built `dist` served as static files, with the same
 * `/__sp` and `/board` server in front of it that the Vite dev server mounts. Bundled to
 * `dist/server.mjs` by `bun run build`, so `sp start` runs one file with node or bun
 * and no dev toolchain. Usage: `node dist/server.mjs --port 5173`.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSpServer } from "./sp.ts";
import { refresh } from "./skills.ts";

const dist = path.dirname(fileURLToPath(import.meta.url));
// The plugin root: where the skill an agent is pointed at lives, and whose boards a checkout
// serves by default. `sp start` resolves it and passes it, because the bundle a
// release attaches runs from ~/.cache/super-prototyping/<version>/dist with no checkout
// above it. Derived only for `node dist/server.mjs` run by hand inside a checkout, where
// this file sits two levels below it.
const repoRoot = process.env.SUPER_PROTOTYPING_ROOT
  ? path.resolve(process.env.SUPER_PROTOTYPING_ROOT)
  : path.resolve(dist, "../..");
const canvasesDir = path.resolve(
  process.env.PROTOTYPING_CANVASES_DIR ||
    path.join(repoRoot, "mockups/canvases"),
);
const projectDir = process.env.PROTOTYPING_PROJECT_DIR
  ? path.resolve(process.env.PROTOTYPING_PROJECT_DIR)
  : null;
// Read-only canvases shown beside the project's own. The desktop app sets this to the examples it
// ships. `sp start` does not, and shows a project's boards alone.
const examplesDir = process.env.PROTOTYPING_EXAMPLES_DIR
  ? path.resolve(process.env.PROTOTYPING_EXAMPLES_DIR)
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
  const send = (status: number, file: string, cacheControl: string) => {
    res.statusCode = status;
    res.setHeader("Content-Type", TYPES[path.extname(file)] ?? "application/octet-stream");
    res.setHeader("Cache-Control", cacheControl);
    fs.createReadStream(file).pipe(res);
  };
  // Resolved before it is checked: `resolve` folds any `..` in, so a path that escapes
  // dist no longer starts with it.
  const file = path.resolve(dist, "." + pathname);
  if (
    file.startsWith(dist + path.sep) &&
    fs.statSync(file, { throwIfNoEntry: false })?.isFile()
  ) {
    // Vite names every built asset by its content hash, so those never change under a URL;
    // the pages and the board files it emitted are read fresh.
    send(
      200,
      file,
      pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
    );
  } else {
    send(404, path.join(dist, "404.html"), "no-cache");
  }
}

// Bring any marked skill copies in the project up to this tree's version before anything else
// touches it. The app and `sp start` both run this file, so this is the one place a stale copy gets
// caught. It prints nothing, because the signal is `git diff`, not a log line.
refresh(projectDir, repoRoot);

const sp = createSpServer({ canvasesDir, examplesDir, projectDir, repoRoot });
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
  process.on(signal, () => {
    server.close(() => process.exit(0));
    // `close` waits for every request to finish, and an event stream never does.
    server.closeAllConnections();
  });
}
