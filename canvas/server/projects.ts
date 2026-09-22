/**
 * Every project on one server, each at `/p/<name>/`: the folders in the projects directory, and
 * any folder opened from elsewhere, which is named here as it is opened. The desktop app, `sp
 * start` and the Vite dev server all serve this way, so a tab on another project is a link and
 * not a server started for it, and a page behaves the same in a browser as in the app. Making
 * a project and opening a folder are requests here too, for the same reason: what the app's
 * window can do, a browser tab on the same server can do.
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import type { AgentId } from "../src/agents.ts";
import { CANVASES } from "./boards.ts";
import { AGENT_SKILLS, installFor, refresh } from "./skills.ts";
import { createSpServer, sameOrigin } from "./sp.ts";

/**
 * The folder every project is in, and where a new one goes. The desktop app's is Electron's
 * `app.getPath("documents")` plus the app's name, and this is that path wherever Documents is the
 * home folder's.
 * ponytail: a Documents folder that OneDrive or a Windows Known Folder redirected elsewhere is not
 * found here, and the app and `sp start` then serve two different lists. Ask the OS for the real
 * one when that comes up. `PROTOTYPING_PROJECTS_DIR` moves it in the meantime.
 */
export function projectsDirFromEnv() {
  return path.resolve(
    process.env.PROTOTYPING_PROJECTS_DIR ||
      path.join(os.homedir(), "Documents", "Super Prototyping"),
  );
}

/**
 * The OS's own folder picker, answering the folder's path, or nothing when the user cancelled.
 * Rejects with ENOENT when the machine has no picker to show, which is a Linux without zenity.
 * This is a server process with no window of its own, so on macOS the dialog comes up over
 * whatever is in front, which is the browser or the app that asked.
 */
function pickFolder() {
  const [file, args] =
    process.platform === "darwin"
      ? [
          "osascript",
          ["-e", 'POSIX path of (choose folder with prompt "Open a project")'],
        ]
      : process.platform === "win32"
        ? [
            "powershell",
            [
              "-NoProfile",
              "-Command",
              "Add-Type -AssemblyName System.Windows.Forms; " +
                "$d = New-Object System.Windows.Forms.FolderBrowserDialog; " +
                '$d.Description = "Open a project"; ' +
                "if ($d.ShowDialog() -eq 'OK') { $d.SelectedPath }",
            ],
          ]
        : [
            "zenity",
            ["--file-selection", "--directory", "--title=Open a project"],
          ];
  return new Promise<string | undefined>((resolve, reject) => {
    execFile(file, args, (error, stdout) => {
      // A cancel is a non-zero exit with nothing on stdout, from all three; that is not an error.
      if (error && (error as NodeJS.ErrnoException).code === "ENOENT")
        return reject(error);
      resolve(stdout.trim() || undefined);
    });
  });
}

/**
 * Moves a project's boards from where they used to be, `mockups/canvases`, to `canvases`,
 * once, and takes `mockups` away if that left nothing in it but the `.DS_Store` Finder leaves in
 * any folder it has shown. A project that has both is left alone, because which one is current
 * is the user's to say.
 */
function moveOldBoards(dir: string) {
  const old = path.join(dir, "mockups", "canvases");
  const boards = path.join(dir, CANVASES);
  if (!fs.existsSync(old) || fs.existsSync(boards)) return;
  fs.renameSync(old, boards);
  console.log(`moved ${old} to ${boards}`);
  if (fs.readdirSync(path.dirname(old)).every((f) => f === ".DS_Store"))
    fs.rmSync(path.dirname(old), { recursive: true });
}

export function createProjectsServer(options: {
  /** Where every project is listed from, and where `POST /__sp/projects` makes one. */
  projectsDir: string;
  /** This plugin's checkout, whose own canvases are the examples shown beside every project's. */
  repoRoot: string;
}) {
  const { projectsDir, repoRoot } = options;
  const examplesDir = path.join(repoRoot, CANVASES);
  if (fs.existsSync(projectsDir))
    for (const e of fs.readdirSync(projectsDir, { withFileTypes: true }))
      if (e.isDirectory()) moveOldBoards(path.join(projectsDir, e.name));

  // Every project by the name its address carries: the folders in the projects directory, and
  // the folders opened from anywhere else, which `open` names as they come. This drops one of
  // those deleted while the server runs, since every page lists the projects and reads each one.
  const opened = new Map<string, string>();
  const projects = () => {
    const all = new Map([...opened].filter(([, dir]) => fs.existsSync(dir)));
    if (fs.existsSync(projectsDir))
      for (const e of fs.readdirSync(projectsDir, { withFileTypes: true }))
        if (e.isDirectory() && !e.name.startsWith("."))
          all.set(e.name, path.join(projectsDir, e.name));
    return all;
  };

  // One /__sp server per project, made the first time the project is asked for and kept: its own
  // boards watched, its own agent, its own event streams.
  const sps = new Map<string, ReturnType<typeof createSpServer>>();
  const spFor = (dir: string) => {
    let sp = sps.get(dir);
    if (sp) return sp;
    // Bring any marked skill copies in the project up to this tree's version before anything else
    // touches it. Every way of serving a project runs this, so this is the one place a stale copy
    // gets caught. It prints nothing, because the signal is `git diff`, not a log line.
    refresh(dir, repoRoot);
    sp = createSpServer({
      canvasesDir: path.join(dir, CANVASES),
      examplesDir,
      projects,
      projectDir: dir,
      repoRoot,
    });
    sps.set(dir, sp);
    return sp;
  };

  // The address of the project opened last, which is where `/` goes: what `sp start` opened, or
  // the folder the app was given, so a link to the server's root lands on a project's page.
  let last: string | undefined;
  const open = (dir: string) => {
    dir = path.resolve(dir);
    if (!fs.statSync(dir, { throwIfNoEntry: false })?.isDirectory())
      throw new Error(`${dir} is not a folder`);
    moveOldBoards(dir);
    const all = projects();
    let name = [...all].find(([, had]) => had === dir)?.[0];
    if (name === undefined) {
      // A folder outside the projects directory has no name until now. It is named after itself,
      // numbered past any project already called that.
      name = path.basename(dir);
      for (let n = 2; all.has(name); n++) name = `${path.basename(dir)} ${n}`;
      opened.set(name, dir);
    }
    return (last = `/p/${encodeURIComponent(name)}/`);
  };

  // The answer to a project made or a folder picked: it is opened, `agent`'s skills go into it
  // when the request named one, the way the app did for every project it opened, and the answer
  // is the project's address from the server's root, for the page to load into its frame. What
  // the install did is said by the canvas as a toast once it is up, carried in the address as
  // `?toast=`, since the page that asked is about to be replaced by the project's.
  const reply = (
    res: ServerResponse,
    dir: string,
    agent: AgentId | undefined,
  ) => {
    try {
      const url = new URL(open(dir), "http://sp");
      if (agent !== undefined) {
        const { toast } = installFor(repoRoot, dir, agent);
        if (toast) url.searchParams.set("toast", JSON.stringify(toast));
      }
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ url: url.pathname + url.search }));
    } catch (error) {
      res.statusCode = 500;
      res.end(String(error));
    }
  };

  const handle = (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    const url = req.url ?? "/";
    const [pathname, query = ""] = url.split(/\?(.*)/s);
    if (pathname === "/") {
      if (last === undefined) {
        res.statusCode = 404;
        return res.end(
          "No project is open. Start with `sp start <dir>`, or open one at /p/<name>/.",
        );
      }
      res.statusCode = 302;
      res.setHeader("Location", last + (query && `?${query}`));
      return res.end();
    }
    if (pathname === "/__sp/projects" || pathname === "/__sp/projects/open") {
      if (req.method !== "POST") return next();
      const send = (code: number, message: string) => {
        res.statusCode = code;
        res.end(message);
      };
      if (!sameOrigin(req)) return send(403, "cross-site request");
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        let parsed: { name?: unknown; agent?: unknown };
        try {
          parsed = JSON.parse(body || "{}");
        } catch {
          return send(400, "bad json");
        }
        const agent =
          parsed.agent === undefined ? undefined : String(parsed.agent);
        if (agent !== undefined && !Object.hasOwn(AGENT_SKILLS, agent))
          return send(400, "unknown agent");
        if (pathname === "/__sp/projects/open") {
          return pickFolder().then(
            (dir) =>
              dir === undefined
                ? send(204, "")
                : reply(res, dir, agent as AgentId),
            () =>
              send(
                501,
                "This machine has no folder picker to show. On Linux, install zenity, or " +
                  "put the project under the projects folder and open it from the home page.",
              ),
          );
        }
        // A new project needs only a name, as in Screen Studio. It goes under the projects folder,
        // so there is no place to pick. The same checks the app's dialog made: the field's
        // `required` lets a name of spaces through, and knows nothing of folders.
        const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
        if (name === "") return send(400, "Give the project a name first.");
        if (name.startsWith(".") || path.basename(name) !== name)
          return send(
            400,
            "A name cannot start with a dot or have a slash in it.",
          );
        const dir = path.join(projectsDir, name);
        if (fs.existsSync(dir))
          return send(
            409,
            `You already have a project called “${name}”. Try another name.`,
          );
        try {
          // A folder with the boards folder in it and nothing else. What the window opens on, Start
          // here and the examples, is the plugin's and shown beside the project's own, so there is
          // nothing to copy in.
          fs.mkdirSync(path.join(dir, CANVASES), { recursive: true });
        } catch (e) {
          // A new name does not fix an unwritable Documents, so say what failed.
          return send(
            500,
            `That folder could not be made: ${(e as Error).message}`,
          );
        }
        reply(res, dir, agent as AgentId);
      });
      return;
    }
    // `/p/<name>/<rest>`: <rest> is what the project's server and the app's pages see, so each
    // project's pages are the same pages at an address of their own.
    const [, name, rest] = /^\/p\/([^/?#]*)(\/.*)$/.exec(url) ?? [];
    if (rest === undefined) return next();
    let dir: string | undefined;
    try {
      dir = projects().get(decodeURIComponent(name));
    } catch {} // a broken escape is no project's name
    if (dir === undefined) {
      res.statusCode = 404;
      return res.end("no such project");
    }
    // The url stays stripped for `next`, which is the static app or Vite serving the page.
    req.url = rest;
    spFor(dir).handle(req, res, next);
  };

  return {
    handle,
    open,
    close() {
      for (const sp of sps.values()) sp.close();
    },
  };
}
