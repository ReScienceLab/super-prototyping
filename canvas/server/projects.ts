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
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createAgentServer } from "./agent.ts";
import { CANVASES } from "./boards.ts";
import { createSpServer, reveal, sameOrigin, trash } from "./sp.ts";

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
    // A reference a new clone starts from, dropped on the New project dialog
    // (NewProjectDialog.tsx): the request's body, written as it arrives into the project's
    // `refs`, which is what the first message to the agent names. A screen recording can be
    // hundreds of MB, so it is streamed rather than read into memory.
    if (pathname === "/__sp/projects/ref") {
      if (req.method !== "POST") return next();
      const send = (code: number, message: string) => {
        res.statusCode = code;
        res.end(message);
      };
      if (!sameOrigin(req)) return send(403, "cross-site request");
      const params = new URLSearchParams(query);
      const dir = projects().get(params.get("name") ?? "");
      if (dir === undefined) return send(404, "no such project");
      const file = params.get("file") ?? "";
      if (file === "" || file.startsWith(".") || path.basename(file) !== file)
        return send(
          400,
          "A file name cannot start with a dot or have a slash in it.",
        );
      const refs = path.join(dir, "refs");
      fs.mkdirSync(refs, { recursive: true });
      // A reference already there is never written over. The rest is written beside its name
      // and renamed once whole, so an upload cut off leaves nothing a retry would be refused by.
      const target = path.join(refs, file);
      if (fs.existsSync(target)) {
        req.resume();
        return send(409, `${file} is already in refs`);
      }
      const partial = `${target}.part`;
      pipeline(req, fs.createWriteStream(partial))
        .then(() => {
          fs.renameSync(partial, target);
          send(204, "");
        })
        .catch((error) => {
          fs.rmSync(partial, { force: true });
          send(500, String(error));
        });
      return;
    }
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
        // A new project needs nothing, not even a name: without one it is the first free
        // "Untitled", and its agent names it (sp.ts, PROJECT_JSON). It goes under the projects
        // folder, so there is no place to pick. The checks are the ones the dialog cannot make.
        let name = typeof parsed.name === "string" ? parsed.name.trim() : "";
        if (name === "") {
          name = "Untitled";
          for (let n = 2; fs.existsSync(path.join(projectsDir, name)); n++)
            name = `Untitled ${n}`;
        }
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
        res.end(
          JSON.stringify({ name, url: `/p/${encodeURIComponent(name)}/` }),
        );
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
