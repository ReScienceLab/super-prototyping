/**
 * Every project on one server, each at `/p/<name>/`: the folders in the projects directory, and
 * only those. No folder elsewhere is ever a project, so a project's Delete cannot trash code the
 * user did not make here (docs/2026-09-23-projects-folder-only.md). The desktop app, `sp start`
 * and the Vite dev server all serve this way, so a tab on another project is a link and not a
 * server started for it, and a page behaves the same in a browser as in the app. Making a
 * project is a request here too, for the same reason, so that a browser tab on the same server
 * can do what the app's window can. The root is no project's: it has the
 * home page, at `/home.html`, the examples, and the agent behind the chat panel, at
 * `/__sp/agent`, so the app works with no project at all.
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import { createAgentServer } from "./agent.ts";
import { CANVASES } from "./boards.ts";
import { createSpServer, sameOrigin } from "./sp.ts";

/**
 * The folder every project is in, and where a new one goes. The desktop app's is Electron's
 * `app.getPath("documents")` plus the app's name, and this is the same path as long as Documents
 * is `~/Documents`.
 * ponytail: this does not find a Documents folder that OneDrive or a Windows Known Folder
 * redirected elsewhere, so the app and `sp start` then serve two different lists. Ask the OS for
 * the real one when that comes up. `PROTOTYPING_PROJECTS_DIR` moves it in the meantime.
 */
export function projectsDirFromEnv() {
  return path.resolve(
    process.env.PROTOTYPING_PROJECTS_DIR ||
      path.join(os.homedir(), "Documents", "Super Prototyping"),
  );
}

/**
 * Shows a folder in the OS's file manager, selected in the folder it is in. Rejects when the
 * folder was not shown: on a Linux without xdg-open, or with one that has no file manager to
 * hand the folder around it to.
 */
function reveal(dir: string) {
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
function trash(dir: string) {
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

/**
 * Moves a project's boards, once, from where they used to be, `mockups/canvases`, to
 * `canvases`, and removes `mockups` if that left nothing in it but the `.DS_Store` Finder leaves
 * in any folder it has shown. A project that has both is left alone, because which one is
 * current is the user's to say.
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
  /** The tree the app or a checkout holds, whose own canvases are the examples shown beside every project's. */
  repoRoot: string;
}) {
  const { projectsDir, repoRoot } = options;
  const examplesDir = path.join(repoRoot, CANVASES);
  if (fs.existsSync(projectsDir))
    for (const e of fs.readdirSync(projectsDir, { withFileTypes: true }))
      if (e.isDirectory()) moveOldBoards(path.join(projectsDir, e.name));

  // Every project by the name its address carries: the folders in the projects directory, and no
  // folder anywhere else, so deleting one can only ever trash a folder the user made here.
  const projects = () => {
    const all = new Map<string, string>();
    if (fs.existsSync(projectsDir))
      for (const e of fs.readdirSync(projectsDir, { withFileTypes: true }))
        if (e.isDirectory() && !e.name.startsWith("."))
          all.set(e.name, path.join(projectsDir, e.name));
    return all;
  };

  // One /__sp server per project, made the first time the project is asked for and kept: its own
  // boards watched, its own event streams.
  const sps = new Map<string, ReturnType<typeof createSpServer>>();
  const spFor = (dir: string) => {
    let sp = sps.get(dir);
    if (sp) return sp;
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

  // The root's own /__sp server. Its canvases are the examples, every one read-only.
  const root = createSpServer({
    canvasesDir: examplesDir,
    examplesDir,
    projects,
    repoRoot,
  });

  // The agent, once for the whole server: its sessions and the skills they read are kept in a dot
  // folder of the projects directory, which the list above skips.
  const agent = createAgentServer({
    examplesDir,
    projects,
    repoRoot,
    workspaces: path.join(projectsDir, ".workspaces"),
  });

  const handle = (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    const url = req.url ?? "/";
    const [pathname, query = ""] = url.split(/\?(.*)/s);
    // The bare root is the home page, and the root with a query is the window on an example
    // (canvasTabs.ts), which the root's server serves as any project's does.
    if (pathname === "/" && query === "") {
      res.statusCode = 302;
      res.setHeader("Location", "/home.html");
      return res.end();
    }
    if (pathname.startsWith("/__sp/agent/"))
      return agent.handle(req, res, next);
    if (/^\/__sp\/projects(\/(reveal|delete))?$/.test(pathname)) {
      if (req.method !== "POST") return next();
      const send = (code: number, message: string) => {
        res.statusCode = code;
        res.end(message);
      };
      if (!sameOrigin(req)) return send(403, "cross-site request");
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        let parsed: { name?: unknown };
        try {
          parsed = JSON.parse(body || "{}");
        } catch {
          return send(400, "bad json");
        }
        // A home page card's menu, which names the project it was opened on.
        if (
          pathname === "/__sp/projects/reveal" ||
          pathname === "/__sp/projects/delete"
        ) {
          const dir =
            typeof parsed.name === "string"
              ? projects().get(parsed.name)
              : undefined;
          if (dir === undefined) return send(404, "no such project");
          if (pathname === "/__sp/projects/reveal")
            return reveal(dir).then(
              () => send(204, ""),
              () => send(501, "No file manager here could show that folder."),
            );
          // Its server goes first: Windows will not move a folder that is being watched. A project
          // asked for again, after a move that failed, gets a new one.
          sps.get(dir)?.close();
          sps.delete(dir);
          return trash(dir).then(
            () => send(204, ""),
            (error: Error) =>
              send(500, `“${parsed.name}” is still there: ${error.message}`),
          );
        }
        // A new project needs only a name, as in Screen Studio. It goes under the projects folder,
        // so there is no place to pick. These are the checks the app's dialog made, since the
        // field's `required` lets a name of spaces through and knows nothing of folders.
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
          // here and the examples, is the tree's and shown beside the project's own, so there is
          // nothing to copy in.
          fs.mkdirSync(path.join(dir, CANVASES), { recursive: true });
        } catch (e) {
          // A new name does not fix an unwritable Documents, so say what failed.
          return send(
            500,
            `That folder could not be made: ${(e as Error).message}`,
          );
        }
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ url: `/p/${encodeURIComponent(name)}/` }));
      });
      return;
    }
    // `/p/<name>/<rest>`: <rest> is what the project's server and the app's pages see, so each
    // project's pages are the same pages at an address of their own.
    const [, name, rest] = /^\/p\/([^/?#]*)(\/.*)$/.exec(url) ?? [];
    if (rest === undefined) return root.handle(req, res, next);
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
    close() {
      agent.close();
      root.close();
      for (const sp of sps.values()) sp.close();
    },
  };
}
