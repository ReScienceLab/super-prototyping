/**
 * The canvas as a localhost app: the built `dist` served as static files, with the same
 * `/__sp` and `/board` server in front of it that the Vite dev server mounts. Bundled to
 * `dist/server.mjs` by `bun run build`, so `sp start` runs one file with node or bun
 * and no dev toolchain. Usage: `node dist/server.mjs --port 5173`.
 *
 * `sp start` serves one project at `/`. The desktop app serves every project from this one
 * process instead, each at `/p/<name>/`, so a tab on another project is a link and not a server
 * started for it (PROTOTYPING_PROJECTS_DIR below).
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
// The folder every project is in. The desktop app sets it to Documents/Super Prototyping, and it is
// what makes this the server for every project rather than for one. `sp start` does not.
const projectsDir = process.env.PROTOTYPING_PROJECTS_DIR
  ? path.resolve(process.env.PROTOTYPING_PROJECTS_DIR)
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

// Every project by the name its address carries: the folders in the projects directory, and the
// folders the app opened from anywhere else, which are named when they are opened. One of those
// deleted while the app runs is dropped, since every page lists the projects and reads each one.
const opened = new Map<string, string>();
function projects() {
  const all = new Map([...opened].filter(([, dir]) => fs.existsSync(dir)));
  if (projectsDir !== null && fs.existsSync(projectsDir))
    for (const e of fs.readdirSync(projectsDir, { withFileTypes: true }))
      if (e.isDirectory() && !e.name.startsWith(".")) all.set(e.name, path.join(projectsDir, e.name));
  return all;
}

// One /__sp server per project, made the first time the project is asked for and kept: its own
// boards watched, its own agent, its own event streams.
const sps = new Map<string, ReturnType<typeof createSpServer>>();
function spFor(dir: string | null, canvases: string) {
  let sp = sps.get(canvases);
  if (sp) return sp;
  // Bring any marked skill copies in the project up to this tree's version before anything else
  // touches it. The app and `sp start` both run this file, so this is the one place a stale copy
  // gets caught. It prints nothing, because the signal is `git diff`, not a log line.
  refresh(dir, repoRoot);
  sp = createSpServer({
    canvasesDir: canvases,
    examplesDir,
    projects: projectsDir === null ? () => new Map() : projects,
    projectDir: dir,
    repoRoot,
  });
  sps.set(canvases, sp);
  return sp;
}

/**
 * `POST /__sp/open` with a folder's path answers the address it is served at. The desktop app asks
 * before it opens a project, because a folder outside the projects directory has no name here until
 * then. It names it after itself, numbered past any project already called that. Only the app
 * asks: a browser says where its request came from, and the app's fetch says nothing.
 */
function open(req: http.IncomingMessage, res: http.ServerResponse) {
  if (req.method !== "POST" || req.headers["sec-fetch-site"] !== undefined) {
    res.statusCode = 403;
    return res.end("only the desktop app opens a project");
  }
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const dir = path.resolve(body);
    if (!fs.statSync(dir, { throwIfNoEntry: false })?.isDirectory()) {
      res.statusCode = 404;
      return res.end(`${dir} is not a folder`);
    }
    const all = projects();
    let name = [...all].find(([, had]) => had === dir)?.[0];
    if (name === undefined) {
      name = path.basename(dir);
      for (let n = 2; all.has(name); n++) name = `${path.basename(dir)} ${n}`;
      opened.set(name, dir);
    }
    res.end(`/p/${encodeURIComponent(name)}/`);
  });
}

const server = http.createServer((req, res) => {
  if (projectsDir === null)
    return spFor(projectDir, canvasesDir).handle(req, res, () => serveStatic(req, res));
  if (req.url === "/__sp/open") return open(req, res);
  // `/p/<name>/<rest>`: <rest> is what the project's server and the built app see, so each
  // project's pages are the same pages at an address of their own.
  const [, name, rest] = /^\/p\/([^/?#]*)(\/.*)$/.exec(req.url ?? "") ?? [];
  let dir: string | undefined;
  try {
    dir = rest === undefined ? undefined : projects().get(decodeURIComponent(name));
  } catch {} // a broken escape is no project's name
  if (dir === undefined) {
    res.statusCode = 404;
    return res.end("no such project");
  }
  req.url = rest;
  spFor(dir, path.join(dir, "mockups/canvases")).handle(req, res, () => serveStatic(req, res));
});
server.once("close", () => {
  for (const sp of sps.values()) sp.close();
});
// Loopback only. This is a local design tool, not a service to expose.
server.listen(port, "127.0.0.1", () => {
  console.log(`canvas   http://127.0.0.1:${port}/`);
  console.log(projectsDir === null ? `boards   ${canvasesDir}` : `projects ${projectsDir}`);
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    // `close` waits for every request to finish, and an event stream never does.
    server.closeAllConnections();
  });
}
