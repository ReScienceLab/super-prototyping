/**
 * Everything the canvas needs a server for, mounted under `/__sp` and `/board`: the board
 * index and the board files, a board's status and comments written back into its folder, a
 * cloned canvas, screenshots, the agent behind the chat panel, and the watcher that tells the
 * open page when a board changed. The Vite dev server mounts it as middleware
 * (vite.config.ts) and the built app's own server (main.ts) mounts it in front of `dist`, so
 * the two run the same code and there is no dev-only feature.
 */
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import { IMAGE_MIME, boardIndex, canvasesNamespace } from "./boards.ts";
import {
  BOARD_STATUSES,
  SAFE_NAME,
  canvasSlug,
  withBoardStatus,
  withCanvasName,
} from "../src/boardStatusEdit.ts";
import {
  boardChangeKind,
  boardSetSignature,
  boardSlug,
} from "../src/boardWatch.ts";
import {
  attach,
  emit,
  ended,
  newRun,
  runSummary,
  sseFrame,
  type Run,
} from "../src/agentRun.ts";
import {
  AGENTS,
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  type AgentDef,
  type AgentImage,
  type AgentModel,
} from "../src/agents.ts";
import { titleFilter, type ChatEvent } from "../src/claudeStream.ts";

type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) => void;

export function createSpServer(options: {
  /** The boards directory. Created if missing, watched for the server's lifetime. */
  canvasesDir: string;
  /** The project the chat panel's agent works in, or null when nothing set one. */
  projectDir: string | null;
  /** This plugin's checkout, for the skill the agent is pointed at. */
  repoRoot: string;
}) {
  const { canvasesDir, projectDir, repoRoot } = options;

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
      if (pathname !== prefix && !pathname.startsWith(prefix + "/")) return run();
      req.url = url.slice(prefix.length) || "/";
      fn(req, res, () => {
        req.url = url;
        run();
      });
    };
    run();
  };

  // The open pages, for the watcher and the status endpoint to talk to. One event stream per
  // page; `reload` is answered with a full reload and `layout` with the new layout.json for
  // one board, handed over live because a reload to change one word would throw away the
  // tldraw viewport and the open panel. canvasIndex.ts listens.
  const pages = new Set<ServerResponse>();
  const broadcast = (event: "reload" | "layout", data: unknown) => {
    const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const page of pages) page.write(frame);
  };

  // Everything under /__sp writes something: a board's status, a comment, a cloned canvas, an
  // agent holding bypassPermissions in the project. A server on a known loopback port is
  // reachable from every page the user has open — a cross-origin POST still runs, CORS only
  // hides the reply — so the check is the browser's own account of where the request came
  // from. A page cannot forge it: Sec-Fetch-* are forbidden header names. Absent means the
  // caller was not a browser, which is curl, and curl is not the attack.
  route("/__sp", (req, res, next) => {
    const site = req.headers["sec-fetch-site"];
    if (site === undefined || site === "same-origin" || site === "none")
      return next();
    res.statusCode = 403;
    res.end("cross-site request");
  });

  route("/__sp/index.json", (req, res, next) => {
    if (req.method !== "GET") return next();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.end(
      JSON.stringify(
        boardIndex(canvasesDir, {
          served: true,
          canvasesNamespace: canvasesNamespace(canvasesDir, repoRoot),
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
    const file = path.join(canvasesDir, ...parts);
    const type =
      parts.length === 2 && parts[1].endsWith(".html")
        ? "text/html; charset=utf-8"
        : parts.length === 2 && parts[1] === "icon.png"
          ? "image/png"
          : parts.length >= 4 && parts[1] === "assets" && parts[2] === "brand"
            ? IMAGE_MIME[path.extname(parts[parts.length - 1]).toLowerCase()]
            : undefined;
    // Those three shapes and nothing else. The names go into a filesystem path, so a
    // request that could climb out of the boards directory is refused rather than
    // normalised — `..` is the obvious one, a separator inside a segment the platform one.
    if (
      !type ||
      !file.startsWith(canvasesDir + path.sep) ||
      !fs.statSync(file, { throwIfNoEntry: false })?.isFile()
    ) {
      return send(404, "not a board");
    }
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "no-store");
    fs.createReadStream(file).pipe(res);
  });

  // A board as a picture, for the chat panel: an agent takes a mockup the way it takes a
  // screenshot, and a page in an `<iframe>` cannot be read into a canvas from the browser
  // side. `refkit shoot` draws it — this repo's own renderer, on PATH beside the CLIs the
  // panel spawns — so the picture is the one the rest of the toolkit measures and diffs.
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
    const board = path.join(canvasesDir, ...parts);
    if (!fs.statSync(board, { throwIfNoEntry: false })?.isFile())
      return send(404, "no such board");
    // A folder per canvas and per size, because refkit names its output after the board's
    // own basename and two canvases can each hold an `03-home.html`.
    const out = path.join(os.tmpdir(), "sp-shot", parts[0], size.join("x"));
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
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "sp-shot-"));
    const drawn = path.join(work, path.basename(png));
    const done = () => fs.rmSync(work, { recursive: true, force: true });
    execFile(
      "refkit",
      [
        "shoot",
        board,
        "-o",
        work,
        "--w",
        `${size[0]}`,
        "--h",
        `${size[1]}`,
      ],
      { timeout: 120_000 },
      (error) => {
        if (fs.existsSync(drawn)) {
          fs.mkdirSync(out, { recursive: true });
          fs.renameSync(drawn, png);
          done();
          return serve();
        }
        done();
        // refkit is this plugin's own toolkit, installed by `uv tool install`; a canvas
        // started some other way can be running without it, and Chrome is its own ask.
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

  // The inspector's status badge, writing back. Only the dev server can do this: a built
  // canvas is static files on a host with no repo behind them, which is why the badge is
  // not a button there.
  route("/__sp/board-status", (req, res, next) => {
    if (req.method !== "POST") return next();
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const send = (code: number, message: string) => {
        res.statusCode = code;
        res.end(message);
      };
      try {
        const { slug, file, status } = JSON.parse(body || "{}");
        // The two names land in a filesystem path, so they are checked before they are
        // joined, not after: a `slug` of "../.." would otherwise write outside the boards.
        if (!SAFE_NAME.test(slug ?? "") || !SAFE_NAME.test(file ?? "")) {
          return send(400, "bad board name");
        }
        if (!BOARD_STATUSES.includes(status))
          return send(400, "bad status");
        const layoutPath = path.join(canvasesDir, slug, "layout.json");
        const before = fs.readFileSync(layoutPath, "utf8");
        const after = withBoardStatus(before, file, status);
        if (after === null) return send(404, "board is not in layout.json");
        if (after !== before) {
          fs.writeFileSync(layoutPath, after);
          // Hand the edited layout to the page directly rather than leaving it to hear about
          // its own write from the watcher, which answers a batch and not a keystroke: a
          // badge that lags a fifth of a second behind the click reads as a badge that did
          // not take. canvasLibrary.ts listens.
          broadcast("layout", { slug, layout: JSON.parse(after) });
        }
        send(200, "ok");
      } catch (error) {
        send(500, String(error));
      }
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
        const folder = path.join(canvasesDir, slug);
        if (
          !fs.statSync(folder, { throwIfNoEntry: false })?.isDirectory()
        ) {
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

  // Cloning a canvas, from the button in the top bar: the folder copied whole under the name
  // the dialog asked for. Dev server only, like the status write and for the same reason. A
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
        const from = path.join(canvasesDir, slug);
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
            : withCanvasName(before, name),
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

  // The agent behind the chat panel: one process per message — Claude Code or Codex, by the
  // panel's choice, looked up in agents.ts — run in the user's project, its output kept here
  // and streamed to the page. Dev server only, like the endpoints above and more so, since
  // the process writes files.
  //
  // Two steps rather than one streaming response: the agent's work is a board written to
  // disk, and the watcher below answers that with a full reload, so a stream bound to the
  // fetch that started the run would die exactly when the run succeeds. The page comes back
  // with the run's id and reads its events from wherever it left off (agentRun.ts).
  //
  // No reload broadcast from here: a board the agent writes reaches the page through the
  // watcher like anyone else's, and anything else it writes is not the canvas's business.
  const runs = new Map<
    string,
    Run & {
      child: ChildProcess;
      /** What the composer attached, as `image/<n>` serves it and codex's stdin needs it. */
      images: AgentImage[];
      /** The pictures its tools handed back, in arrival order; `shot/<k>` is one-based. */
      shots: { type: string; data: Buffer }[];
    }
  >();
  // Which agents are installed: `bin --version` once each, for the server's lifetime, so
  // the menu greys out one that is missing and says what to do, rather than letting the
  // first message find out.
  const probes = new Map<string, Promise<boolean>>();
  const installed = (def: AgentDef) => {
    let probe = probes.get(def.id);
    if (!probe) {
      probe = new Promise((done) =>
        // From the temp dir: a CLI that reads project config from its cwd on `--version`
        // would otherwise fail the probe over the project's settings, not its absence.
        execFile(
          def.bin,
          ["--version"],
          { timeout: 10_000, cwd: os.tmpdir() },
          (error) => done(!error),
        ),
      );
      probes.set(def.id, probe);
      // A no is not worth keeping: the CLI may be installed a minute later, and a probe that
      // timed out on a busy machine would otherwise grey the agent out until a restart.
      void probe.then((ok) => ok || probes.delete(def.id));
    }
    return probe;
  };
  // The models an agent offers the composer: its own list when it keeps one on disk —
  // codex caches what its server sent, which is the list its own picker draws — and the
  // table's otherwise. Read once for the server's lifetime, like the probe above; a user
  // who installs a new model restarts the canvas, as they would for a new CLI.
  const catalogs = new Map<string, AgentModel[]>();
  const models = (def: AgentDef) => {
    let list = catalogs.get(def.id);
    if (!list) {
      list = def.models;
      if (def.modelsFile) {
        try {
          const file = path.join(os.homedir(), def.modelsFile.path);
          list = def.modelsFile.read(
            JSON.parse(fs.readFileSync(file, "utf8")),
          );
        } catch {
          // No cache yet, or one this cannot read: the table's list stands, which for an
          // agent that keeps its own is empty, leaving the composer its default alone.
        }
      }
      catalogs.set(def.id, list);
    }
    return list;
  };
  // The slash commands each agent last said it had. Claude Code lists them on the init frame
  // of every run, so they cost nothing to learn and are exactly what that project can run.
  // This map is all there is, and it dies with the server — an edit to this file or anything
  // it imports restarts vite mid-session — so an agent that has not run yet falls through to
  // the probe below rather than to an empty palette. A bad line is a line: the menu must
  // never take a run down with it.
  const commands = new Map<string, string[]>();
  const harvest = (def: AgentDef, line: string) => {
    try {
      const list = def.commands?.(line);
      if (list) commands.set(def.id, list);
    } catch {
      // Not the line that carries them.
    }
  };
  // And what an agent says when asked, for the first palette of a server's life and for one
  // that announces nothing at all. Local, free and slow enough (seconds) to be worth keeping:
  // like the probes above, once for the server's life.
  const asked = new Map<string, Promise<string[]>>();
  const askFor = (def: AgentDef) => {
    let ask = asked.get(def.id);
    if (!ask) {
      ask = new Promise<string[]>((done) =>
        execFile(
          def.bin,
          def.commandsProbe!.args,
          {
            cwd: projectDir ?? undefined,
            timeout: 30_000,
            maxBuffer: 8 << 20,
          },
          (_error, stdout) => {
            // Whatever the exit code: the frame the palette wants is printed early, and a
            // probe that ends badly after that still has it on stdout.
            try {
              done(def.commandsProbe!.read(stdout));
            } catch {
              // A version whose answer this cannot read: no palette, rather than no panel.
              done([]);
            }
          },
        ),
      );
      asked.set(def.id, ask);
    }
    return ask;
  };
  // Attached images go to disk for an agent that takes files (agents.ts), for as long as
  // that agent runs: a run's folder goes when its child closes, since the page is served
  // the bytes the run holds and nothing else reads the files. The folders sit under one per
  // server, named by its pid and made private here rather than at a path anyone on a shared
  // tmp could have put a folder or a link at first; a Vite restart is a second one for the
  // same pid. At start the folders of servers that were killed rather than closed go too: a
  // pid nothing answers on is a server that is gone. Not on the server's own close — Vite
  // restarts by building the new server, same pid, before it closes the old, and Ctrl+C
  // never closes it at all.
  const chatDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `sp-chat-${process.pid}-`),
  );
  for (const name of fs.readdirSync(os.tmpdir())) {
    const pid = Number(/^sp-chat-(\d+)-/.exec(name)?.[1]);
    if (!pid || pid === process.pid) continue;
    try {
      process.kill(pid, 0);
    } catch (error) {
      // Gone (ESRCH), as against alive and another user's (EPERM) on a host whose tmp is
      // shared: that one is a running canvas, and not this server's to remove. A dead
      // one that was another user's is not removable either, and is left.
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") continue;
      try {
        fs.rmSync(path.join(os.tmpdir(), name), { recursive: true });
      } catch {}
    }
  }
  route("/__sp/agent", (req, res, next) => {
    const send = (code: number, message: string) => {
      res.statusCode = code;
      res.end(message);
    };
    // Mounted under the prefix, so req.url is "/agents", "/run", "/runs",
    // "/run/<id>/events?after=N" or "/run/<id>/cancel".
    const url = new URL(req.url ?? "/", "http://sp");
    if (req.method === "GET" && url.pathname === "/commands") {
      res.setHeader("content-type", "application/json");
      const def = AGENTS.find(
        (a) => a.id === url.searchParams.get("agent"),
      );
      const known = commands.get(def?.id ?? "");
      if (known || !def?.commandsProbe) {
        send(200, JSON.stringify(known ?? []));
        return;
      }
      void askFor(def).then((list) => send(200, JSON.stringify(list)));
      return;
    }
    if (req.method === "GET" && url.pathname === "/agents") {
      // Ahead of the project check: what is on PATH does not depend on it.
      void Promise.all(
        AGENTS.map(async (def) => ({
          id: def.id,
          name: def.name,
          available: await installed(def),
          models: models(def),
          efforts: def.efforts,
          missing: def.missing,
        })),
      ).then((list) => {
        res.setHeader("content-type", "application/json");
        send(200, JSON.stringify(list));
      });
      return;
    }
    const project = projectDir;
    if (!project) {
      return send(
        503,
        "PROTOTYPING_PROJECT_DIR is not set, so there is no project for the agent to work in. " +
          "`sp-canvas start` sets it to the directory it is started from.",
      );
    }
    if (req.method === "POST" && url.pathname === "/run") {
      // The body is no longer a sentence: attached images ride in it as base64, and it is
      // held whole in memory before anything reads it, so it is capped on the way in. Kept
      // as bytes and decoded once at the end: a character split across two chunks decodes
      // to U+FFFD if each chunk is decoded alone, and the message and the file names sit
      // after megabytes of base64 and hundreds of chunk boundaries.
      const chunks: Buffer[] = [];
      let size = 0;
      req.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_IMAGE_BYTES * 2) chunks.length = 0;
        else chunks.push(chunk);
      });
      req.on("end", () => {
        if (size > MAX_IMAGE_BYTES * 2)
          return send(
            413,
            `too much attached; keep the images under about ${MAX_IMAGE_BYTES / 1_000_000} MB together`,
          );
        try {
          const {
            message,
            canvas,
            agent = "claude",
            model = "",
            effort = "",
            images = [],
          } = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
          // The raw body is a second copy of every attachment, and the listeners the run
          // leaves on its child close over this scope, so it would live as long as the run
          // does — twenty more runs. What is still needed of it is in `images` below.
          chunks.length = 0;
          if (typeof message !== "string" || !message.trim())
            return send(400, "empty message");
          // A browser sent these, so nothing in them is taken on trust. The number is what
          // the message refers to and what names the file below; the type decides the
          // extension and what the image endpoint says it is serving; the name is a caption
          // in the prompt and a label in the panel, and never any part of a path.
          if (!Array.isArray(images) || images.length > MAX_IMAGES)
            return send(400, "bad images");
          for (const i of images) {
            if (!Number.isInteger(i?.n) || i.n < 1)
              return send(400, "bad image number");
            if (typeof i.name !== "string" || i.name.length > 200)
              return send(400, "bad image name");
            if (!IMAGE_TYPES.includes(i.type))
              return send(400, "bad image type");
            if (
              typeof i.data !== "string" ||
              !/^[A-Za-z0-9+/]*={0,2}$/.test(i.data)
            )
              return send(400, "bad image data");
          }
          // The body cap above is the panel's limit in base64; a client that is not the
          // panel meets the limit itself here, in the bytes the files come out as.
          if (
            images.reduce(
              (n: number, i: { data: string }) =>
                n + Buffer.byteLength(i.data, "base64"),
              0,
            ) > MAX_IMAGE_BYTES
          )
            return send(
              413,
              `too much attached; keep the images under about ${MAX_IMAGE_BYTES / 1_000_000} MB together`,
            );
          // One agent at a time, and only the server can say so: the composer's own guard is
          // React state, which a second tab, a reload, or a cleared view does not share. Two
          // agents in one project overwrite each other's boards.
          if ([...runs.values()].some((r) => !ended(r))) {
            return send(
              409,
              "an agent is already running in this project. Stop it first.",
            );
          }
          const def = AGENTS.find((a) => a.id === agent);
          if (!def) return send(400, "unknown agent");
          // Both reach a command line, and neither is a name this made up: they are ids out
          // of the list this server just served, or the empty string for the CLI's default.
          const known = models(def);
          if (model && !known.some((m) => m.id === model))
            return send(400, "unknown model");
          const efforts =
            known.find((m) => m.id === model)?.efforts ?? def.efforts;
          if (effort && !efforts.includes(effort))
            return send(400, "unknown effort");
          // The slug lands in a path in the prompt, so it is checked like the others.
          if (canvas !== undefined && !SAFE_NAME.test(canvas))
            return send(400, "bad canvas name");
          const preamble = [
            `You are working in the user's project at ${project}, from the chat panel of the ` +
              "super-prototyping canvas they have open.",
            `Their boards are the folders under ${canvasesDir}, one per canvas page.`,
            canvas &&
              `They are looking at the canvas "${canvas}", whose folder is ${path.join(canvasesDir, canvas)}.`,
            `Before touching a board folder, read ${repoRoot}/skills/prototype-canvas/SKILL.md, ` +
              "the prototype-canvas skill of the super-prototyping plugin: one folder is one canvas " +
              "page, one .html file in it is one board, layout.json places them, and the open canvas " +
              "reloads by itself when a board is rewritten.",
            "Open your first reply with a title for this conversation on a line of its own, as " +
              "<sp-title>three to six words naming what was asked</sp-title>, then go on as usual.",
          ]
            .filter(Boolean)
            .join("\n");
          // The run's id names the folder, and the image's number and media type name the
          // file in it, so what the browser called the file stays a caption: a slash or a
          // `..` in that name is text in the prompt and reaches no path here.
          const id = randomUUID();
          const imagesDir = images.length ? path.join(chatDir, id) : "";
          if (imagesDir) fs.mkdirSync(imagesDir, { recursive: true });
          const held: AgentImage[] = images.map(
            (i: {
              n: number;
              name: string;
              type: string;
              data: string;
            }) => {
              const file = path.join(
                imagesDir,
                `${i.n}.${i.type.slice(6)}`,
              );
              fs.writeFileSync(file, Buffer.from(i.data, "base64"));
              return { ...i, path: file };
            },
          );
          const run = Object.assign(newRun(id), {
            child: spawn(
              def.bin,
              def.args({
                preamble,
                boards: canvasesDir,
                model,
                effort,
                imagesDir,
              }),
              {
                cwd: project,
                env: process.env,
              },
            ),
            images: held,
            shots: [] as { type: string; data: Buffer }[],
          });
          runs.set(run.id, run);
          // The agent, the prompt, its first line as the title until the model gives one, and
          // the time: the first event, so a replay from zero rebuilds the whole turn with the
          // right mark on it and the history list reads off the same events (agentRun.ts).
          emit(run, "start", {
            kind: "start",
            agent: def.id,
            prompt: message,
            title: message.trim().split("\n")[0].slice(0, 60),
            at: Date.now(),
            // The numbers and the names only: the pictures are a request away, so the reload
            // that a written board causes rebuilds the strip without the bytes coming back
            // down the stream with every other event.
            images: held.map(({ n, name }) => ({ n, name })),
          });
          // ponytail: the newest 20 runs are kept whatever their age; a tab that reattaches
          // to an older one gets a 404 and shows it.
          for (const [oldId, old] of runs) {
            if (runs.size <= 20) break;
            if (ended(old)) {
              runs.delete(oldId);
            }
          }
          const finish = (message: string) => {
            if (!ended(run))
              emit(run, "end", { kind: "end", ok: false, message });
          };
          let stderr = "";
          run.child.stderr
            .setEncoding("utf8")
            .on("data", (chunk: string) => (stderr += chunk));
          let pending = "";
          const lift = titleFilter();
          // Codex reports what a turn used but never how much there was; the model list it
          // caches says, and this is the one place that knows which model was picked.
          const contextWindow = known.find((m) => m.id === model)?.window;
          const sized = (e: ChatEvent) =>
            e.kind === "usage" && e.window === undefined && contextWindow
              ? { ...e, window: contextWindow }
              : e;
          const feed = (chunk: string) => {
            const lines = (pending + chunk).split("\n");
            pending = lines.pop()!;
            try {
              for (const line of lines) {
                if (line.trim()) {
                  harvest(def, line);
                  // A picture a tool handed back is kept here and the event keeps the number
                  // to ask for it by, for the reason the composer's attachments are: every
                  // reload rebuilds the transcript from event zero, and a page of grids would
                  // come back down the stream on each one. The media type is the agent's
                  // word, and goes out as a header.
                  // ponytail: held in memory for the run's life, so a turn that reads a
                  // hundred full-page grids grows by them; give the run a folder if one ever
                  // does.
                  for (const e of def.events(line))
                    for (const t of lift(e))
                      emit(
                        run,
                        t.kind,
                        t.kind === "tool_done" && t.shots
                          ? {
                              ...t,
                              shots: t.shots.map((s) => {
                                if (!("data" in s)) return s;
                                run.shots.push({
                                  type: IMAGE_TYPES.includes(s.type)
                                    ? s.type
                                    : "image/png",
                                  data: Buffer.from(s.data, "base64"),
                                });
                                return { k: run.shots.length };
                              }),
                            }
                          : sized(t),
                      );
                }
              }
            } catch (error) {
              run.child.kill();
              finish(`unreadable output from ${def.bin}: ${error}`);
            }
          };
          run.child.stdout
            .setEncoding("utf8")
            .on("data", feed)
            .on("end", () => feed("\n"));
          // A CLI that exits at once — an older one refusing a flag — closes the pipe before
          // the prompt is written; the exit below reports that, and the write error is noise.
          run.child.stdin.on("error", () => {});
          run.child.stdin.end(def.stdin(message, preamble, held));
          // The files were for this child; the page is served the bytes the run holds. On
          // both, since a child that could not be spawned never closes.
          const unfile = () => {
            if (imagesDir)
              fs.rmSync(imagesDir, { recursive: true, force: true });
          };
          run.child.on("error", (error: NodeJS.ErrnoException) => {
            unfile();
            finish(error.code === "ENOENT" ? def.missing : String(error));
          });
          run.child.on("close", (code, signal) => {
            unfile();
            if (ended(run)) return;
            const tail = stderr.trim().split("\n").slice(-5).join("\n");
            // `claude` is a launcher around the real process: a SIGTERM to it comes back as
            // exit 143, not as a signal. Harmless for codex, which dies by the signal.
            finish(
              signal || code === 143
                ? "stopped"
                : `${def.bin} exited with code ${code}` +
                    (tail ? `\n${tail}` : "") +
                    (def.id === "claude" && /unknown option/i.test(stderr)
                      ? "\nThe panel needs Claude Code 2.1.274 or newer."
                      : ""),
            );
          });
          res.setHeader("content-type", "application/json");
          send(202, JSON.stringify({ runId: run.id }));
        } catch (error) {
          send(500, String(error));
        }
      });
      return;
    }
    if (req.method === "GET" && url.pathname === "/runs") {
      // Newest first, and in memory only: a restarted server lists nothing, which is
      // consistent with it holding every run's events and nothing else holding any.
      res.setHeader("content-type", "application/json");
      return send(
        200,
        JSON.stringify([...runs.values()].reverse().map(runSummary)),
      );
    }
    const match =
      /^\/run\/([\w-]+)\/(events|cancel|image\/\d+|shot\/\d+)$/.exec(
        url.pathname,
      );
    if (!match) return next();
    const run = runs.get(match[1]);
    if (!run) return send(404, "no such run");
    if (req.method === "GET" && match[2].startsWith("image/")) {
      // Served back rather than replayed: the page rebuilds a turn from event zero after
      // every reload, and the strip asks for its pictures again instead of the stream
      // carrying them each time. `send` writes strings, so these go out on their own.
      //
      // The strip also links each one to open in a tab, and the type is the browser's word,
      // so an attached SVG would open as a document of this origin — where its script can
      // POST /run and start an agent in the project, asked by no one. `sandbox` opens it in
      // an opaque origin with no script instead, which a PNG or a JPEG in a tab never
      // notices, and `nosniff` keeps a type the browser does not know from being guessed
      // into HTML. Neither touches the same bytes drawn as an <img>.
      const img = run.images.find((i) => i.n === Number(match[2].slice(6)));
      if (!img) return send(404, "no such image");
      res.writeHead(200, {
        "content-type": img.type,
        "content-security-policy": "sandbox",
        "x-content-type-options": "nosniff",
        "cache-control": "no-store",
      });
      return res.end(Buffer.from(img.data, "base64"));
    }
    if (req.method === "GET" && match[2].startsWith("shot/")) {
      // The other direction: what a tool drew, kept in the run rather than on disk, since
      // nothing but this page ever has to open it. Linked to open in a tab the same way, and
      // the type is the agent's word rather than the browser's, so the same two headers.
      const shot = run.shots[Number(match[2].slice(5)) - 1];
      if (!shot) return send(404, "no such shot");
      res.writeHead(200, {
        "content-type": shot.type,
        "content-security-policy": "sandbox",
        "x-content-type-options": "nosniff",
        "cache-control": "no-store",
      });
      return res.end(shot.data);
    }
    if (match[2] === "events" && req.method === "GET") {
      const after = Number(url.searchParams.get("after") ?? 0);
      if (!Number.isInteger(after) || after < 0)
        return send(400, "bad cursor");
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-store",
      });
      res.flushHeaders();
      const detach = attach(run, after, (e) => {
        res.write(sseFrame(e));
        if (e.event === "end") res.end();
      });
      const keepalive = setInterval(
        () => res.write(": keepalive\n\n"),
        25_000,
      );
      res.on("close", () => {
        detach();
        clearInterval(keepalive);
      });
      return;
    }
    if (match[2] === "cancel" && req.method === "POST") {
      run.child.kill();
      return send(200, "");
    }
    next();
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
        case "comments":
          // No reload: comments.json is written by the endpoint above on every post, and the
          // page that posted already holds the record. The next load reads the file.
          break;
      }
    }
    for (const file of layouts) {
      // The same message the status endpoint sends, for the same reason: a layout.json is
      // read on every render, and a reload to change one word would throw away the tldraw
      // viewport and the open panel. canvasLibrary.ts listens.
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
  // outside it — one level up for this checkout, anywhere at all under
  // PROTOTYPING_CANVASES_DIR. `.add()` for a path outside the root is accepted and can then
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

  return {
    handle,
    close() {
      watcher?.close();
      for (const page of pages) page.end();
      pages.clear();
    },
  };
}
