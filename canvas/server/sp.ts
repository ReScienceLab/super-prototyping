/**
 * Everything the canvas needs a server for, mounted under `/__sp` and `/board`: the board
 * index and the board files, comments and the ground written back into its folder, a
 * cloned canvas, screenshots, and the watcher that tells the open page when a board changed.
 * One of these per project, mounted at `/p/<name>/` by projects.ts under the Vite dev server
 * (vite.config.ts) and the built app's own server (main.ts) alike, so the two run the same code
 * and there is no dev-only feature. The agent behind the chat panel is no project's, and is
 * mounted once beside them (agent.ts).
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import {
  CANVASES,
  DOCS,
  IMAGE_MIME,
  boardIndex,
  readDocs,
  canvasesNamespace,
  readJson,
} from "./boards.ts";
import { SAFE_NAME, canvasSlug, withLayoutKey } from "../src/layoutEdit.ts";
import {
  boardChangeKind,
  boardSetSignature,
  boardSlug,
} from "../src/boardWatch.ts";
import { projectCover, validBox, type ChosenCover } from "../src/cover.ts";

type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) => void;

/**
 * Whether a request came from a page of this server's own, or from no page at all. Everything
 * that writes is refused otherwise. A server on a known loopback port is reachable from every page
 * the user has open, and a cross-origin POST still runs there, since CORS only hides the reply. So
 * the check is the browser's own account of where the request came from. A page cannot forge it,
 * because Sec-Fetch-* are forbidden header names. Absent means the caller was not a browser, which
 * is curl, and curl is not the attack.
 */
export function sameOrigin(req: IncomingMessage) {
  const site = req.headers["sec-fetch-site"];
  return site === undefined || site === "same-origin" || site === "none";
}

/**
 * A canvas's folder: the project's own, else the example of that name. The project's own is what
 * the scan in boards.ts calls a canvas, a folder with a board in it, so a folder the project has
 * only begun under an example's name does not hide the example. A name that is in neither place
 * gets the project's path, and the routes answer it as they always did.
 */
export function folderOf(
  canvasesDir: string,
  examplesDir: string,
  slug: string,
) {
  const own = path.join(canvasesDir, slug);
  const hasBoard =
    fs.statSync(own, { throwIfNoEntry: false })?.isDirectory() &&
    fs.readdirSync(own).some((f) => !f.startsWith(".") && f.endsWith(".html"));
  const example = path.join(examplesDir, slug);
  return !hasBoard && fs.existsSync(example) ? example : own;
}

/**
 * The project's own settings, beside its canvases: which cover it chose, and the name it is shown
 * by when that is not its folder's. A project made without a name is an "Untitled" folder whose
 * agent writes `name` here (AppShell.tsx), since renaming the folder would move every address the
 * open tab and the chat hold.
 */
const PROJECT_JSON = "project.json";

/**
 * Shows a folder in the OS's file manager, selected in the folder it is in. Rejects when the
 * folder was not shown: on a Linux without xdg-open, or with one that has no file manager to
 * hand the folder around it to.
 */
export function reveal(dir: string) {
  const [file, args] =
    process.platform === "darwin"
      ? ["open", ["-R", dir]]
      : process.platform === "win32"
        ? ["explorer", ["/select,", dir]]
        : ["xdg-open", [path.dirname(dir)]];
  return new Promise<void>((resolve, reject) => {
    // Explorer exits 1 when it has shown the folder, so there only a missing command is a
    // failure. `open` and `xdg-open` mean their exit codes, and a non-zero one from them is the
    // only sign that nothing came up.
    execFile(file, args, (error) =>
      !error ||
      (process.platform === "win32" &&
        (error as NodeJS.ErrnoException).code !== "ENOENT")
        ? resolve()
        : reject(error),
    );
  });
}

/**
 * Moves a folder to the Trash, or the Recycle Bin, where the user can put it back. macOS goes
 * through Foundation rather than Finder, which would ask for permission to be scripted; Windows
 * gets the path through the environment, so no quoting of it can go wrong.
 */
export function trash(dir: string) {
  const [file, args] =
    process.platform === "darwin"
      ? [
          "osascript",
          [
            "-l",
            "JavaScript",
            "-e",
            'function run(argv) { ObjC.import("Foundation"); if (!$.NSFileManager.defaultManager' +
              ".trashItemAtURLResultingItemURLError($.NSURL.fileURLWithPath(argv[0]), null, null))" +
              ' throw new Error("it could not be moved to the Trash") }',
            dir,
          ],
        ]
      : process.platform === "win32"
        ? [
            "powershell",
            [
              "-NoProfile",
              "-Command",
              "Add-Type -AssemblyName Microsoft.VisualBasic; " +
                "[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory(" +
                "$env:SP_TRASH, 'OnlyErrorDialogs', 'SendToRecycleBin')",
            ],
          ]
        : ["gio", ["trash", dir]];
  return new Promise<void>((resolve, reject) => {
    execFile(
      file,
      args,
      { env: { ...process.env, SP_TRASH: dir } },
      (error, _stdout, stderr) =>
        error ? reject(new Error(stderr.trim() || error.message)) : resolve(),
    );
  });
}

/** A project's project.json, or nothing in it when it has none or it does not parse. */
const readProjectJson = (dir: string) =>
  (readJson(path.join(dir, PROJECT_JSON)) ?? {}) as {
    cover?: ChosenCover;
    name?: string;
  };

export function createSpServer(options: {
  /**
   * The boards directory. Created if missing, watched for the server's lifetime. At the server's
   * root, which has no project, it is the examples directory.
   */
  canvasesDir: string;
  /** Canvases shown beside the project's own and never written to: the examples the plugin ships. */
  examplesDir: string;
  /**
   * Every project the home page and the tab bar list, by the name its address carries, which is
   * `/p/<name>/`.
   */
  projects: () => Map<string, string>;
  /**
   * The project. None at the server's root (projects.ts), which has the home page and the
   * examples, and nothing of its own to write to.
   */
  projectDir?: string;
  /** This plugin's checkout, whose own canvases the index gives the bare namespace. */
  repoRoot: string;
}) {
  const { canvasesDir, examplesDir, projects, projectDir, repoRoot } = options;

  const isExample = (slug: string) =>
    projectDir === undefined ||
    folderOf(canvasesDir, examplesDir, slug) !== path.join(canvasesDir, slug);
  const READ_ONLY =
    "an example canvas is read-only: clone it to have one of your own";

  // The same mount-and-strip routing connect gives the dev server: a handler mounted at a
  // prefix sees `req.url` relative to it, and `next()` hands the request on with the url put
  // back. Order is the order of `route` below, which is what the 403 guard at the top relies on.
  const routes: [string, Handler][] = [];
  const route = (prefix: string, fn: Handler) => routes.push([prefix, fn]);
  const handle: Handler = (req, res, next) => {
    const url = req.url ?? "/";
    const pathname = url.split(/[?#]/)[0];
    let i = 0;
    const run = () => {
      const entry = routes[i++];
      if (!entry) return next();
      const [prefix, fn] = entry;
      if (pathname !== prefix && !pathname.startsWith(prefix + "/"))
        return run();
      req.url = url.slice(prefix.length) || "/";
      fn(req, res, () => {
        req.url = url;
        run();
      });
    };
    run();
  };

  // The open pages, for the watcher and the write endpoints to talk to. One event stream per
  // page; `reload` is answered with a full reload, `layout` with the new layout.json for
  // one board and `docs` with the project's documents, handed over live because a reload to
  // change one word would throw away the tldraw viewport, the open panel and a document being
  // edited. canvasIndex.ts listens.
  const pages = new Set<ServerResponse>();
  const broadcast = (event: "reload" | "layout" | "docs" | "content", data: unknown) => {
    const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const page of pages) page.write(frame);
  };

  // Everything under /__sp writes something: a comment, a canvas's ground, a cloned canvas, an
  // agent holding bypassPermissions in the project.
  route("/__sp", (req, res, next) => {
    if (sameOrigin(req)) return next();
    res.statusCode = 403;
    res.end("cross-site request");
  });

  // This project's name, as the tab bar and the home page call it, which is the name its address
  // carries. None at the root.
  const projectName = () =>
    [...projects()].find(([, dir]) => dir === projectDir)?.[0];

  route("/__sp/index.json", (req, res, next) => {
    if (req.method !== "GET") return next();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    const how = {
      served: true,
      canvasesNamespace: canvasesNamespace(canvasesDir, repoRoot),
    };
    const index = boardIndex(canvasesDir, how);
    // One list in slug order, as one directory's scan is, so Start here still comes first. An
    // example says so, which is what puts it on a tab of its own rather than in the project's.
    const boards = [
      ...index.boards.filter((b) => !isExample(b.slug)),
      ...boardIndex(examplesDir, how)
        .boards.filter((b) => isExample(b.slug))
        .map((b) => ({ ...b, example: true })),
    ].sort((a, b) => (a.slug < b.slug ? -1 : 1));
    const docs = projectDir === undefined ? undefined : readDocs(projectDir);
    const title = projectDir === undefined ? undefined : readProjectJson(projectDir).name;
    res.end(JSON.stringify({ ...index, boards, project: projectName(), title, docs }));
  });

  // The projects the home page and the tab bar list: every one the server knows. Each is its
  // canvases as the index has them, less what a card never reads, and the address of its pages.
  // ponytail: boardIndex also hashes every project's assets, which only the canvas reads. Split
  // the scan if a home page with many projects gets slow to open.
  route("/__sp/projects.json", (req, res, next) => {
    if (req.method !== "GET") return next();
    const how = { served: true, canvasesNamespace: "" };
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(
      JSON.stringify(
        [...projects()].map(([name, dir]) => {
          const { boards } = boardIndex(path.join(dir, CANVASES), how);
          const json = readProjectJson(dir);
          const canvases = boards.map(
            ({ slug, html, updated, layout, icon }) => ({
              slug,
              html,
              updated,
              layout,
              icon,
            }),
          );
          return {
            name,
            url: `/p/${encodeURIComponent(name)}/`,
            path: dir,
            // A project with no board yet was last edited when it was made. Its documents count.
            updated: Math.max(
              fs.statSync(dir).mtimeMs,
              ...canvases.map((c) => c.updated),
              ...DOCS.map((doc) => fs.statSync(path.join(dir, doc), { throwIfNoEntry: false })?.mtimeMs ?? 0),
            ),
            canvases,
            cover: projectCover(boards, json.cover),
            title: json.name,
          };
        }),
      ),
    );
  });

  route("/__sp/events", (req, res, next) => {
    if (req.method !== "GET") return next();
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    });
    res.write(": open\n\n");
    pages.add(res);
    // A comment line every 25 s, under the proxy and browser idle timeouts that would
    // otherwise drop a quiet stream and cost a reconnect.
    const keepalive = setInterval(() => res.write(": keepalive\n\n"), 25_000);
    res.on("close", () => {
      clearInterval(keepalive);
      pages.delete(res);
    });
  });

  // A board folder's files, at the addresses the index hands the page: `<slug>/<file>.html`
  // is a board as a web page, which the canvas's two "open as a web page" buttons point at;
  // `<slug>/icon.png` and `<slug>/assets/brand/**` are the images a page places as shapes
  // of their own. The build emits the same paths as files; here they are read off the
  // boards directory per request, so a reload shows the current version.
  route("/board", (req, res) => {
    const send = (code: number, message: string) => {
      res.statusCode = code;
      res.end(message);
    };
    let rel: string;
    try {
      rel = decodeURI((req.url ?? "").split(/[?#]/)[0]);
    } catch {
      return send(404, "not a board"); // a broken escape is not a board
    }
    const parts = rel.split("/").filter(Boolean);
    const file = path.join(
      folderOf(canvasesDir, examplesDir, parts[0] ?? ""),
      ...parts.slice(1),
    );
    const type =
      parts.length === 2 && parts[1].endsWith(".html")
        ? "text/html; charset=utf-8"
        : parts.length === 2 && parts[1] === "icon.png"
          ? "image/png"
          : parts.length >= 4 && parts[1] === "assets" && parts[2] === "brand"
            ? IMAGE_MIME[path.extname(parts[parts.length - 1]).toLowerCase()]
            : parts.length === 3 && parts[1] === "files"
              ? CANVAS_FILE_MIME[path.extname(parts[2]).toLowerCase()]
              : undefined;
    // Those four shapes and nothing else. The names go into a filesystem path, so a
    // request that could climb out of the boards directory is refused rather than
    // normalised — `..` is the obvious one, a separator inside a segment the platform one.
    if (
      !type ||
      ![canvasesDir, examplesDir].some((dir) =>
        file.startsWith(dir + path.sep),
      ) ||
      !fs.statSync(file, { throwIfNoEntry: false })?.isFile()
    ) {
      return send(404, "not a board");
    }
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Accept-Ranges", "bytes");
    // A byte range, which is how a video seeks: a pasted one can be a gigabyte, and without it
    // the player would have to read up to the point it was asked to jump to.
    const size = fs.statSync(file).size;
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
    if (range && (range[1] || range[2])) {
      const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start > end) {
        res.setHeader("Content-Range", `bytes */${size}`);
        return send(416, "range not satisfiable");
      }
      res.statusCode = 206;
      res.setHeader("Content-Range", `bytes ${start}-${end}/${size}`);
      res.setHeader("Content-Length", end - start + 1);
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.setHeader("Content-Length", size);
    fs.createReadStream(file).pipe(res);
  });

  // A file of the project's by its absolute path, which is how an agent links what it made:
  // `file:///…/web/variants/a.html`. A page served over http cannot follow a file: link, so the
  // chat panel points it here (markdown.ts). The address keeps the path's folders, so the page's
  // own relative stylesheets and images come through this route too. Nothing outside the project,
  // symlinks included. Not under /__sp: what it serves runs sandboxed, in an origin of its own, so
  // a page an agent made (or cloned) cannot drive the agent and write endpoints as the canvas can,
  // and that origin's requests for its own stylesheets would fail the guard there.
  const FILE_MIME: Record<string, string> = {
    ...IMAGE_MIME,
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json",
    ".md": "text/plain; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".pdf": "application/pdf",
    ".woff2": "font/woff2",
    ".woff": "font/woff",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
  };
  // What a canvas's files/ takes and serves: the pictures and videos tldraw pastes, and never a
  // page, which from files/ would run in the canvas's own origin.
  const CANVAS_FILE_MIME: Record<string, string> = {
    ...IMAGE_MIME,
    ".mp4": FILE_MIME[".mp4"],
    ".webm": FILE_MIME[".webm"],
    ".mov": FILE_MIME[".mov"],
  };
  route("/file", (req, res, next) => {
    if (req.method !== "GET" || !projectDir) return next();
    let rel: string;
    try {
      rel = decodeURIComponent((req.url ?? "").split(/[?#]/)[0]);
    } catch {
      return next();
    }
    // `file:///C:/x` has the path `/C:/x`; the drive is the start of it on Windows.
    const file = path.resolve(rel.replace(/^\/(?=[A-Za-z]:)/, ""));
    const type = FILE_MIME[path.extname(file).toLowerCase()];
    if (
      !type ||
      !fs.statSync(file, { throwIfNoEntry: false })?.isFile() ||
      !fs.realpathSync(file).startsWith(fs.realpathSync(projectDir) + path.sep)
    ) {
      res.statusCode = 404;
      return res.end("not a file of this project");
    }
    res.setHeader("Content-Type", type);
    res.setHeader(
      "Content-Security-Policy",
      "sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads",
    );
    res.setHeader("Cache-Control", "no-store");
    fs.createReadStream(file).pipe(res);
  });

  // A board as a picture, for the chat panel: an agent takes a mockup the way it takes a
  // screenshot, and a page in an `<iframe>` cannot be read into a canvas from the browser
  // side. `refkit shoot` draws it — this repo's own renderer, on PATH beside the CLIs the
  // panel spawns — so the picture is the one the rest of the toolkit measures and diffs.
  // A selection of boards is asked for all at once, and each shot is a headless Chrome: at most
  // this many at a time, the rest waiting their turn in the order they came.
  const SHOTS_AT_ONCE = 4;
  let shooting = 0;
  const waiting: (() => void)[] = [];
  const shotSlot = () =>
    new Promise<void>((go) => {
      if (shooting < SHOTS_AT_ONCE) {
        shooting++;
        go();
      } else waiting.push(go);
    });
  const shotDone = () => {
    const next = waiting.shift();
    if (next) next();
    else shooting--;
  };
  route("/__sp/shoot", (req, res, next) => {
    if (req.method !== "GET") return next();
    const send = (code: number, message: string) => {
      res.statusCode = code;
      res.end(message);
    };
    const query = new URL(req.url ?? "/", "http://sp").searchParams;
    const parts = (query.get("path") ?? "").split("/");
    // <slug>/<board>.html, which is what the canvas knows a board by. Both names are joined
    // into a filesystem path and the slug names an output folder as well, so they are
    // checked before they are joined, the way the endpoints around this one check theirs.
    if (
      parts.length !== 2 ||
      !parts.every((name) => SAFE_NAME.test(name)) ||
      !parts[1].endsWith(".html")
    ) {
      return send(400, "bad board name");
    }
    // The artboard the canvas draws that board at, which is 478x980 unless its layout.json
    // says otherwise. Both reach a command line, so both are numbers or nothing happens.
    const size = ["w", "h"].map((key) => Number(query.get(key)));
    if (!size.every((n) => Number.isInteger(n) && n > 0 && n <= 4000))
      return send(400, "bad artboard size");
    const board = path.join(
      folderOf(canvasesDir, examplesDir, parts[0]),
      parts[1],
    );
    if (!fs.statSync(board, { throwIfNoEntry: false })?.isFile())
      return send(404, "no such board");
    // A folder per canvas folder on disk and per size, because refkit names its output after
    // the board's own basename, two canvases can each hold an `03-home.html`, and two projects
    // can each have a canvas of the same name, which the home page's covers shoot side by side.
    const out = path.join(
      os.tmpdir(),
      "sp-shot",
      createHash("sha1").update(path.dirname(board)).digest("hex").slice(0, 16),
      size.join("x"),
    );
    const png = path.join(out, parts[1].replace(/\.html$/, ".png"));
    const serve = () => {
      res.setHeader("content-type", "image/png");
      res.setHeader("cache-control", "no-store");
      fs.createReadStream(png).pipe(res);
    };
    // Drawing one costs seconds of headless Chrome, so the last one stands until the board
    // it is of is written again — which the generator does, and the watcher already sees.
    const shot = fs.statSync(png, { throwIfNoEntry: false });
    if (shot && shot.mtimeMs >= fs.statSync(board).mtimeMs) return serve();
    // Drawn somewhere else and moved into place when it is whole: the cached name appears at
    // the instant refkit creates the file, so a second request during the seconds it takes to
    // write would otherwise find a newer mtime and serve half a picture.
    void shotSlot().then(() => {
      const work = fs.mkdtempSync(path.join(os.tmpdir(), "sp-shot-"));
      const drawn = path.join(work, path.basename(png));
      const done = () => {
        fs.rmSync(work, { recursive: true, force: true });
        shotDone();
      };
      execFile(
        "refkit",
        ["shoot", board, "-o", work, "--w", `${size[0]}`, "--h", `${size[1]}`],
        { timeout: 120_000 },
        (error) => {
          if (fs.existsSync(drawn)) {
            fs.mkdirSync(out, { recursive: true });
            fs.renameSync(drawn, png);
            done();
            return serve();
          }
          done();
          // refkit is linked onto PATH by the app; a canvas started some other way can be
          // running without it, and Chrome is its own ask.
          send(
            (error as NodeJS.ErrnoException | null)?.code === "ENOENT"
              ? 503
              : 500,
            error
              ? `could not render the board: ${error.message}`
              : "refkit wrote no image",
          );
        },
      );
    });
  });

  // The canvas's ground, from its Background menu and swatch, into its layout.json. Null takes
  // the key out, which is the theme's own ground. Only the dev server can do this: a built
  // canvas is static files on a host with no repo behind them.
  // One top-level string key of a canvas's layout.json, edited in place (layoutEdit.ts) and
  // handed to the page directly rather than left to the watcher, which answers a batch and not
  // a keystroke. canvasIndex.ts listens.
  const setLayoutKey = (slug: string, key: string, value: string | null) => {
    const layoutPath = path.join(canvasesDir, slug, "layout.json");
    // layout.json is optional: a folder of boards alone gets one holding just this key.
    const before = fs.existsSync(layoutPath)
      ? fs.readFileSync(layoutPath, "utf8")
      : "{}\n";
    const after = withLayoutKey(before, key, value);
    if (after === before) return;
    fs.writeFileSync(layoutPath, after);
    broadcast("layout", { slug, layout: JSON.parse(after) });
  };

  // The canvas's ground colour (canvasGround.ts), or null for the default.
  route("/__sp/canvas-ground", (req, res, next) => {
    if (req.method !== "POST") return next();
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const send = (code: number, message: string) => {
        res.statusCode = code;
        res.end(message);
      };
      try {
        const { slug, ground } = JSON.parse(body || "{}");
        // The name lands in a filesystem path, so it is checked before it is joined, not
        // after: a `slug` of "../.." would otherwise write outside the boards.
        if (!SAFE_NAME.test(slug ?? "")) return send(400, "bad canvas name");
        if (ground !== null && !/^#[0-9a-f]{6}$/i.test(ground ?? "")) {
          return send(400, "bad colour");
        }
        if (isExample(slug)) return send(403, READ_ONLY);
        setLayoutKey(slug, "ground", ground);
        send(200, "ok");
      } catch (error) {
        send(500, String(error));
      }
    });
  });

  // The name a canvas's tab shows, typed into the tab (CanvasStrip.tsx). Only layout.json's
  // `name`: the folder keeps its slug, since the slug is the address every link to it holds.
  route("/__sp/canvas-name", (req, res, next) => {
    if (req.method !== "POST") return next();
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const send = (code: number, message: string) => {
        res.statusCode = code;
        res.end(message);
      };
      try {
        const { slug, name } = JSON.parse(body || "{}");
        if (!SAFE_NAME.test(slug ?? "")) return send(400, "bad canvas name");
        if (typeof name !== "string" || !name.trim()) return send(400, "empty name");
        if (isExample(slug)) return send(403, READ_ONLY);
        if (!fs.existsSync(path.join(canvasesDir, slug)))
          return send(404, `no canvas folder named ${slug}`);
        setLayoutKey(slug, "name", name.trim());
        send(200, "ok");
      } catch (error) {
        send(500, String(error));
      }
    });
  });

  // A canvas tab's menu (CanvasStrip.tsx): its folder shown in the file manager, or moved to the
  // Trash, where it can be put back, after the page has asked. Never an example's.
  route("/__sp/canvas-folder", (req, res, next) => {
    if (req.method !== "POST") return next();
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const send = (code: number, message: string) => {
        res.statusCode = code;
        res.end(message);
      };
      let parsed: { slug?: unknown; action?: unknown };
      try {
        parsed = JSON.parse(body || "{}");
      } catch {
        return send(400, "bad json");
      }
      const { slug, action } = parsed;
      if (typeof slug !== "string" || !SAFE_NAME.test(slug))
        return send(400, "bad canvas name");
      const folder = path.join(canvasesDir, slug);
      if (!fs.statSync(folder, { throwIfNoEntry: false })?.isDirectory())
        return send(404, `no canvas folder named ${slug}`);
      if (action === "reveal")
        return reveal(folder).then(
          () => send(204, ""),
          () => send(501, "No file manager here could show that folder."),
        );
      if (action !== "delete") return send(400, "reveal or delete");
      if (isExample(slug)) return send(403, READ_ONLY);
      trash(folder).then(
        () => send(204, ""),
        (error: Error) => send(500, `“${slug}” is still there: ${error.message}`),
      );
    });
  });

  // The boards are watched at the bottom of this hook. Create the folder first: watching a
  // path that does not exist registers nothing, and a brand new project is exactly the case
  // where the first board folder appears while the server is already up.
  fs.mkdirSync(canvasesDir, { recursive: true });

  // A change to the set of boards, or to a board: the page reloads, and its next request
  // for the index scans the directory again. Whoever asks for that request is the
  // caller's business: the watcher reloads the open page, while the clone endpoint below
  // leaves it to the navigation it answers with.
  const rebuild = () => broadcast("reload", {});

  // Canvas comments, written back into the board folder so they travel with it in Git.
  // This is a repo-local review tool, not a synced document, and a comment on a mockup is
  // only worth anything next to the mockup it is about. Dev server only, like the two
  // endpoints around it.
  route("/__sp/comments", (req, res, next) => {
    if (req.method !== "POST") return next();
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const send = (code: number, message: string) => {
        res.statusCode = code;
        res.end(message);
      };
      try {
        const { slug, file } = JSON.parse(body || "{}");
        // The slug lands in a filesystem path, so it is checked before it is joined.
        if (!SAFE_NAME.test(slug ?? "")) return send(400, "bad board name");
        if (isExample(slug)) return send(403, READ_ONLY);
        const folder = path.join(canvasesDir, slug);
        if (!fs.statSync(folder, { throwIfNoEntry: false })?.isDirectory()) {
          return send(404, `no canvas folder named ${slug}`);
        }
        const target = path.join(folder, "comments.json");
        // The last comment on a board leaves no file behind: an empty one would be a diff
        // in every folder anyone ever opened.
        if (!file?.records?.length) {
          fs.rmSync(target, { force: true });
        } else {
          // Machine-written every time, so unlike layout.json this may be re-serialised
          // whole. Two spaces and a trailing newline to keep the Git diff line-by-line.
          fs.writeFileSync(target, JSON.stringify(file, null, 2) + "\n");
        }
        // No reload broadcast: the page that posted already has these records in its store,
        // and reloading would throw away the composer that is still open. Dropping the
        // index is only so the *next* load reads the file back rather than the scan the
        // server did at startup.
        send(200, "ok");
      } catch (error) {
        send(500, String(error));
      }
    });
  });

  // What a person put on a canvas, as tldraw records (canvasContent.ts), into its folder as
  // canvas.json, the way comments.json is written. The bytes are remembered so the watcher can
  // tell this write from one made outside, which reloads the page onto the file.
  const wroteContent = new Map<string, string>();
  route("/__sp/canvas-content", (req, res, next) => {
    if (req.method !== "POST") return next();
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const send = (code: number, message: string) => {
        res.statusCode = code;
        res.end(message);
      };
      try {
        const { slug, file, by } = JSON.parse(body || "{}");
        if (!SAFE_NAME.test(slug ?? "")) return send(400, "bad canvas name");
        if (isExample(slug)) return send(403, READ_ONLY);
        const folder = path.join(canvasesDir, slug);
        if (!fs.statSync(folder, { throwIfNoEntry: false })?.isDirectory()) {
          return send(404, `no canvas folder named ${slug}`);
        }
        const target = path.join(folder, "canvas.json");
        // An emptied canvas leaves no file behind, as the last comment does.
        const text = file?.records?.length ? JSON.stringify(file, null, 2) + "\n" : "";
        wroteContent.set(target, text);
        if (text) fs.writeFileSync(target, text);
        else fs.rmSync(target, { force: true });
        // Every other page on the project reloads onto it (canvasIndex.ts), since the watcher
        // below takes this write for the saving page's own.
        broadcast("content", { slug, by });
        send(200, "ok");
      } catch (error) {
        send(500, String(error));
      }
    });
  });

  // A file pasted or dropped onto a canvas (the asset store, canvasContent.ts), into the
  // folder's files/, under the asset's own id. Never overwritten: an id names one file.
  route("/__sp/canvas-file", (req, res, next) => {
    if (req.method !== "POST") return next();
    const send = (code: number, message: string) => {
      res.statusCode = code;
      res.end(message);
    };
    const params = new URL(req.url ?? "", "http://x").searchParams;
    const slug = params.get("slug") ?? "";
    const name = params.get("name") ?? "";
    // Both land in a filesystem path, so they are checked before they are joined.
    if (!SAFE_NAME.test(slug) || !SAFE_NAME.test(name))
      return send(400, "bad file name");
    if (!(path.extname(name).toLowerCase() in CANVAS_FILE_MIME))
      return send(415, `not a kind of file the canvas serves: ${name}`);
    if (isExample(slug)) return send(403, READ_ONLY);
    const folder = path.join(canvasesDir, slug);
    if (!fs.statSync(folder, { throwIfNoEntry: false })?.isDirectory())
      return send(404, `no canvas folder named ${slug}`);
    // Streamed to disk, not gathered in memory: a pasted video can be a gigabyte. Written beside
    // its name and renamed once whole, so a paste cut off halfway leaves no file that looks done.
    const target = path.join(folder, "files", name);
    if (fs.existsSync(target)) {
      req.resume();
      return send(200, "ok");
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const partial = `${target}.part`;
    pipeline(req, fs.createWriteStream(partial))
      .then(() => {
        fs.renameSync(partial, target);
        send(200, "ok");
      })
      .catch((error) => {
        fs.rmSync(partial, { force: true });
        send(500, String(error));
      });
  });

  // The project's cover, from the canvas's right button: a board, an element on one, or a brand
  // image. One per project, so a new one replaces the last, and `null` puts back the default,
  // which is the first canvas's own cover (cover.ts). Only a file the project's own canvases
  // hold is taken, which is also what keeps the path inside them.
  route("/__sp/project-cover", (req, res, next) => {
    if (req.method !== "POST") return next();
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const send = (code: number, message: string) => {
        res.statusCode = code;
        res.end(message);
      };
      if (projectDir === undefined)
        return send(409, "Open a project to give it a cover.");
      let cover: ChosenCover | null;
      try {
        ({ cover } = JSON.parse(body || "{}"));
      } catch {
        return send(400, "bad json");
      }
      const file = path.join(projectDir, PROJECT_JSON);
      const json = readProjectJson(projectDir);
      // Hand-edited, so it can be any JSON; only an object has a key to set.
      if (typeof json !== "object" || Array.isArray(json))
        return send(409, `${PROJECT_JSON} is not a JSON object`);
      if (cover === null) delete json.cover;
      else {
        const box = validBox(cover?.box);
        const chosen = { path: String(cover?.path), ...(box && { box }) };
        const { boards } = boardIndex(canvasesDir, {
          served: true,
          canvasesNamespace: "",
        });
        if (projectCover(boards, chosen)?.path !== chosen.path)
          return send(400, "not a board or image of this project's");
        json.cover = chosen;
      }
      try {
        if (Object.keys(json).length)
          fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
        else fs.rmSync(file, { force: true });
      } catch (error) {
        return send(500, String(error));
      }
      send(204, "");
    });
  });

  // A project document, written from its tab's editor. Only a name the index lists, so the file
  // lands beside the boards and nowhere else; an example's are the app's, and have no endpoint.
  route("/__sp/doc", (req, res, next) => {
    if (req.method !== "POST") return next();
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const send = (code: number, message: string) => {
        res.statusCode = code;
        res.end(message);
      };
      if (projectDir === undefined) return send(409, "Open a project to write its documents.");
      let name: unknown, text: unknown, base: unknown;
      try {
        ({ name, text, base } = JSON.parse(body || "{}"));
      } catch {
        return send(400, "bad json");
      }
      if (typeof name !== "string" || !DOCS.includes(name)) return send(400, "not a document");
      if (typeof text !== "string" || typeof base !== "string") return send(400, "no text");
      const file = path.join(projectDir, name);
      // The text the edit began from, so a rewrite since, an agent's, is not overwritten unseen.
      try {
        if (fs.readFileSync(file, "utf8") !== base)
          return send(409, `${name} changed since you began editing. Copy your text, then reopen it.`);
        fs.writeFileSync(file, text);
      } catch (error) {
        return send(500, String(error));
      }
      send(204, "");
    });
  });

  // Cloning a canvas, from the button in the top bar: the folder copied whole under the name
  // the dialog asked for. Dev server only, like the ground write and for the same reason. A
  // built canvas is static files with no folder behind them.
  route("/__sp/clone-canvas", (req, res, next) => {
    if (req.method !== "POST") return next();
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const send = (code: number, message: string) => {
        res.statusCode = code;
        res.end(message);
      };
      try {
        const { slug, name } = JSON.parse(body || "{}");
        const target = canvasSlug(name ?? "");
        // Both names land in a filesystem path, so they are checked before they are joined.
        if (!SAFE_NAME.test(slug ?? "") || !SAFE_NAME.test(target)) {
          return send(400, "bad canvas name");
        }
        // The root's canvases are the examples, and a copy is for a project to have.
        if (projectDir === undefined)
          return send(409, "Open a project to copy this canvas into.");
        // An example too, since cloning makes one the project's.
        const from = folderOf(canvasesDir, examplesDir, slug);
        const to = path.join(canvasesDir, target);
        // The welcome page is drawn by the app and has no folder, so this is also what
        // stops it being cloned into one.
        if (!fs.existsSync(from))
          return send(404, `no canvas folder named ${slug}`);
        if (fs.existsSync(to)) return send(409, `${target} already exists`);
        // Everything, generator and assets included: a board folder is only worth cloning
        // if the clone can be regenerated the same way the original could.
        fs.cpSync(from, to, { recursive: true });
        const layoutPath = path.join(to, "layout.json");
        const before = fs.existsSync(layoutPath)
          ? fs.readFileSync(layoutPath, "utf8")
          : null;
        fs.writeFileSync(
          layoutPath,
          // Nothing to preserve when the original had no layout at all, so the clone gets a
          // fresh one that does nothing but carry the name.
          before === null
            ? JSON.stringify({ name }, null, 2) + "\n"
            : withLayoutKey(before, "name", name),
        );
        // No reload broadcast: the page that asked is about to navigate to the clone, and a
        // reload racing that navigation would land it back on the canvas it copied.
        res.setHeader("content-type", "application/json");
        send(200, JSON.stringify({ slug: target }));
      } catch (error) {
        send(500, String(error));
      }
    });
  });

  // The strip's "+" (CanvasStrip.tsx): an empty canvas, a folder holding only a layout.json
  // that names it "Untitled", which is what makes a folder with no boards a canvas
  // (boards.ts). The first free of untitled, untitled-2, ….
  route("/__sp/new-canvas", (req, res, next) => {
    if (req.method !== "POST") return next();
    const send = (code: number, message: string) => {
      res.statusCode = code;
      res.end(message);
    };
    if (projectDir === undefined)
      return send(409, "Open a project to make a canvas in.");
    let slug = "untitled";
    for (let n = 2; fs.existsSync(path.join(canvasesDir, slug)); n++)
      slug = `untitled-${n}`;
    // Last in the strip, which sorts by slug and then by `order` (cover.ts, inStripOrder): one
    // past the highest the project has, or "untitled" would land before every canvas after it
    // in the alphabet.
    const order =
      Math.max(
        0,
        ...list(canvasesDir).map(
          (had) =>
            (readJson(path.join(canvasesDir, had, "layout.json")) as
              | { order?: number }
              | undefined)?.order ?? 0,
        ),
      ) + 1;
    fs.mkdirSync(path.join(canvasesDir, slug));
    fs.writeFileSync(
      path.join(canvasesDir, slug, "layout.json"),
      JSON.stringify({ name: "Untitled", order }, null, 2) + "\n",
    );
    // The set of canvases changed, which only a reload shows, and the page that asked reloads
    // itself onto the new one. Taken off the watcher, whose reload could land before the page
    // had read the answer and so on the canvas it was on.
    signature = boardSetSignature(canvasesDir, list);
    res.setHeader("content-type", "application/json");
    send(200, JSON.stringify({ slug }));
  });

  const list = (dir: string) => {
    try {
      return fs.readdirSync(dir);
    } catch {
      return []; // unreadable or gone: it signs as empty rather than throwing out of a watch
    }
  };
  let signature = boardSetSignature(canvasesDir, list);

  /**
   * One settled batch of writes, answered once.
   *
   * The set of boards first, because a board added, removed or renamed makes the generated
   * index wrong about which boards exist, and a reload is the only thing that fixes that.
   * Otherwise the batch is read file by file, and a board is reloaded while a layout is
   * handed over live — the distinction the canvas has always drawn, now drawn for a write
   * from anywhere rather than only for one the endpoints made themselves.
   */
  const settle = (files: string[]) => {
    const now = boardSetSignature(canvasesDir, list);
    if (now !== signature) {
      signature = now;
      rebuild();
      return;
    }
    let reload = false;
    const layouts = new Set<string>();
    for (const file of files) {
      switch (boardChangeKind(canvasesDir, file)) {
        case "board":
          // A reload rather than a live update: the page keeps every board it has fetched in
          // a Map (canvasLibrary.ts). The tldraw document is in IndexedDB and survives the
          // reload; the viewport is what it costs, which is why only a board edit spends it.
          reload = true;
          break;
        case "assets":
          // An image edited in place keeps its name and changes its hash, so the index that
          // names a board's images by content is stale until the reload fetches it again.
          reload = true;
          break;
        case "layout":
          layouts.add(file);
          break;
        case "content":
          // Written by the endpoint above on every save, which the page already holds. Anything
          // else — a pull, a hand edit, another window — reloads, and the file wins on load.
          if (
            (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "") !==
            wroteContent.get(file)
          )
            reload = true;
          break;
        case "comments":
          // No reload: comments.json is written by the endpoint above on every post, and the
          // page that posted already holds the record. The next load reads the file.
          break;
      }
    }
    for (const file of layouts) {
      // The same message the ground endpoint sends, for the same reason: a layout.json is
      // read on every render, and a reload to change one word would throw away the tldraw
      // viewport and the open panel. canvasIndex.ts listens.
      try {
        const layout = JSON.parse(fs.readFileSync(file, "utf8"));
        broadcast("layout", { slug: boardSlug(canvasesDir, file), layout });
      } catch {
        // Half-written or malformed: the next write brings a whole one, and the page keeps
        // the layout it has until then.
      }
    }
    if (reload) rebuild();
  };

  // A generator writes a folder of boards over a second or two, and a save can arrive as
  // more than one event. Batched on the trailing edge, so a run answers with one reload
  // once it is done rather than one per file while it is still writing.
  const queued = new Set<string>();
  let batch: ReturnType<typeof setTimeout> | undefined;
  const queue = (file: string) => {
    queued.add(file);
    clearTimeout(batch);
    batch = setTimeout(() => {
      const files = [...queued];
      queued.clear();
      try {
        settle(files);
      } catch (error) {
        console.error(`[canvases] ${error}`);
      }
    }, 120);
    // Never a reason to hold the process open: a pending reload for a server on its way down
    // has nobody left to send it to.
    batch.unref?.();
  };

  // The boards are watched here, directly, rather than through Vite's watcher when this
  // runs under the dev server: that one watches the app's root, and the boards are always
  // outside it, one level up for this checkout and anywhere at all for another project.
  // `.add()` for a path outside the root is accepted and can then
  // register nothing at all (issue #52), silently: no event ever arrives, and the server
  // serves the board as first read for the rest of its life however often the file is
  // rewritten. That is the one failure a design tool must not have.
  //
  // Recursive fs.watch is supported on macOS and Windows, and on Linux since Node 20. Older
  // Linux throws ERR_FEATURE_UNAVAILABLE_ON_PLATFORM; there the canvas still serves every
  // board, and a reload of the page is what picks up a rewrite.
  let watcher: fs.FSWatcher | undefined;
  try {
    watcher = fs.watch(canvasesDir, { recursive: true }, (_event, name) => {
      if (name) queue(path.resolve(canvasesDir, name.toString()));
    });
    watcher.on("error", (error) => {
      console.error(`[canvases] watch of ${canvasesDir} failed: ${error}`);
    });
    watcher.unref();
  } catch (error) {
    console.warn(
      `[canvases] recursive watch of ${canvasesDir} is unavailable (${error}); ` +
        `reload the page after rewriting a board`,
    );
  }

  // The documents are the project's, beside the boards directory rather than in it, so they have
  // a watch of their own: the project folder, not recursively, for those names, batched the way
  // a board's writes are. One made or deleted is a reload, which brings its tab in or out; one
  // rewritten is sent to the page with its text. project.json is watched with them for its name,
  // which the agent writes into a project made without one (AppShell.tsx): a new one is a reload,
  // which brings it to the tab. Skipped at the root, which has no project.
  let docWatcher: fs.FSWatcher | undefined;
  let docBatch: ReturnType<typeof setTimeout> | undefined;
  if (projectDir !== undefined) {
    let names = readDocs(projectDir).map((doc) => doc.name).join();
    let title = readProjectJson(projectDir).name;
    docWatcher = fs.watch(projectDir, (_event, name) => {
      if (!name || ![...DOCS, PROJECT_JSON].includes(name.toString())) return;
      clearTimeout(docBatch);
      docBatch = setTimeout(() => {
        if (readProjectJson(projectDir).name !== title) {
          title = readProjectJson(projectDir).name;
          return rebuild();
        }
        const docs = readDocs(projectDir);
        const now = docs.map((doc) => doc.name).join();
        if (now === names) return broadcast("docs", docs);
        names = now;
        rebuild();
      }, 120);
      docBatch.unref?.();
    });
    docWatcher.on("error", (error) => {
      console.error(`[canvases] watch of ${projectDir} failed: ${error}`);
    });
    docWatcher.unref();
  }

  return {
    handle,
    close() {
      watcher?.close();
      docWatcher?.close();
      clearTimeout(docBatch);
      for (const page of pages) page.end();
      pages.clear();
    },
  };
}
