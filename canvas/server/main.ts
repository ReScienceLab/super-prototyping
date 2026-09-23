/**
 * The canvas as a localhost app: the built `dist` served as static files, with every project's
 * `/__sp` and `/board` server in front of it (projects.ts), the same one the Vite dev server
 * mounts. Bundled to `dist/server.mjs` by `bun run build`, so `sp start` runs one file with node
 * or bun and no dev toolchain. Usage: `node dist/server.mjs --port 5173 --open <project>`.
 *
 * Every folder in the projects directory is served at `/p/<name>/`, with the examples beside
 * it. `--open` serves one more folder, from anywhere, which is what `sp start` opens, and `/`
 * redirects to it. The desktop app runs this same file and opens its folders over the parent
 * port instead.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProjectsServer, projectsDirFromEnv } from "./projects.ts";

const dist = path.dirname(fileURLToPath(import.meta.url));
// The plugin root: where the skill an agent is pointed at lives, and whose canvases are the
// examples. `sp start` resolves it and passes it, because the bundle a release attaches runs from
// ~/.cache/super-prototyping/<version>/dist with no checkout above it. Derived only for
// `node dist/server.mjs` run by hand inside a checkout, where this file sits two levels below it.
const repoRoot = process.env.SUPER_PROTOTYPING_ROOT
  ? path.resolve(process.env.SUPER_PROTOTYPING_ROOT)
  : path.resolve(dist, "../..");
const projectsDir = projectsDirFromEnv();

const arg = (flag: string) => {
  const at = process.argv.indexOf(flag);
  return at === -1 ? undefined : process.argv[at + 1];
};
const port = Number(arg("--port") ?? 5173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`--port needs a port number, got ${arg("--port")}`);
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

const projects = createProjectsServer({ projectsDir, repoRoot });
// Before the port is taken, so a folder that is not there fails the start rather than a server.
const openArg = arg("--open");
if (openArg !== undefined) projects.open(openArg);

/**
 * A folder's path, from the desktop app before it opens a project, answered with the address it
 * is served at. The path comes over the parent port of Electron's utility process, which only the
 * app that started this server holds. `sp start` runs under node, which has no parent port.
 */
const parentPort = (
  process as NodeJS.Process & {
    parentPort?: {
      on(event: "message", listener: (message: { data: string }) => void): void;
      postMessage(message: { address: string } | { error: string }): void;
    };
  }
).parentPort;
parentPort?.on("message", ({ data }) => {
  try {
    parentPort.postMessage({ address: projects.open(data) });
  } catch (error) {
    parentPort.postMessage({ error: String(error) });
  }
});

const server = http.createServer((req, res) =>
  projects.handle(req, res, () => serveStatic(req, res)),
);
server.once("close", projects.close);
// Loopback only. This is a local design tool, not a service to expose.
server.listen(port, "127.0.0.1", () => {
  console.log(`canvas   http://127.0.0.1:${port}/`);
  console.log(`projects ${projectsDir}`);
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    // `close` waits for every request to finish, and an event stream never does.
    server.closeAllConnections();
  });
}
