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
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createAgentServer } from "./agent.ts";
import { CANVASES, readJson } from "./boards.ts";
import {
  createSpServer,
  reveal,
  SANDBOX,
  sameOrigin,
  shoot,
  shotOf,
  trash,
} from "./sp.ts";

/** A community project's id, which `sp pack` makes (tools/sp_canvas.py). */
const COMMUNITY_ID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

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

/**
 * The newest `project.json` format this app reads. It goes up only when an app that reads this one
 * would misread a project of the next; a file or key it does not know is ignored and kept, so
 * adding one needs no new format. A project with none is format 1.
 */
const PROJECT_FORMAT = 1;

/** Where the community's projects are served from, each at `/p/<id>/`. */
const SITE = "https://superproto.dev";

/**
 * Where a community board is written to be drawn: a folder of this process's own, since a shared
 * tmpdir would let another user plant a link there for the write to follow.
 */
let communityShots: string | undefined;

/**
 * Headless Chrome draws the board from a `file://` address, where a board could frame or show any
 * file on the machine, and the picture goes to the agent. This keeps every subresource off `file:`.
 * After the doctype, which it must follow or the board renders in quirks mode.
 */
const NO_FILES =
  '<meta http-equiv="Content-Security-Policy" content="default-src https: data: blob: ' +
  "'unsafe-inline' 'unsafe-eval'\">";
export function withoutFiles(html: string) {
  const doctype = /^\s*<!doctype[^>]*>/i.exec(html)?.[0] ?? "";
  return doctype + NO_FILES + html.slice(doctype.length);
}

/** Whether a Host header names this machine by an address or by localhost, which no DNS can move. */
export function loopbackHost(host: string | undefined) {
  if (!host) return false;
  let hostname: string;
  try {
    hostname = new URL(`http://${host}`).hostname;
  } catch {
    return false;
  }
  return (
    net.isIP(hostname.replace(/^\[(.*)\]$/, "$1")) !== 0 ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost")
  );
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
    // Asked for by an address, not a name that could be anyone's. A site can point its own name at
    // 127.0.0.1 once its page is open (DNS rebinding), and then it is same-origin with this server
    // and every guard here waves it through. The browser still sends the name it asked for as
    // Host, so a name other than localhost is refused.
    if (!loopbackHost(req.headers.host)) {
      res.statusCode = 403;
      return res.end("This server answers only to localhost or an IP address.");
    }
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
      // A reference already there is never written over. A new one is written beside its name
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
    if (/^\/__sp\/projects(\/(reveal|delete|duplicate))?$/.test(pathname)) {
      if (req.method !== "POST") return next();
      const send = (code: number, message: string) => {
        res.statusCode = code;
        res.end(message);
      };
      if (!sameOrigin(req)) return send(403, "cross-site request");
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        let parsed: { name?: unknown; id?: unknown };
        try {
          parsed = JSON.parse(body || "{}");
        } catch {
          return send(400, "bad json");
        }
        // A community project made the user's (Community.tsx, CanvasTabBar.tsx), by `sp
        // duplicate`, as the agent makes one: the download, the checks of the archive and a
        // taken name are the toolkit's alone. The app links `sp` onto PATH (desktop/launch.ts).
        if (pathname === "/__sp/projects/duplicate") {
          if (typeof parsed.id !== "string" || !COMMUNITY_ID.test(parsed.id))
            return send(400, "not a community project's id");
          return execFile(
            "sp",
            ["duplicate", parsed.id],
            {
              env: { ...process.env, PROTOTYPING_PROJECTS_DIR: projectsDir },
              timeout: 180_000,
            },
            (error, stdout, stderr) => {
              if (error)
                return send(
                  (error as NodeJS.ErrnoException).code === "ENOENT"
                    ? 503
                    : 500,
                  stderr.trim() || `could not duplicate it: ${error.message}`,
                );
              const name = stdout.trim();
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  name,
                  url: `/p/${encodeURIComponent(name)}/`,
                }),
              );
            },
          );
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
          // A folder with the boards folder in it and nothing else. The examples are the tree's,
          // shown beside the project's own, so there is
          // nothing to copy in.
          fs.mkdirSync(path.join(dir, CANVASES), { recursive: true });
          // Its id is what a package of it is known by, whatever the folder is renamed to.
          fs.writeFileSync(
            path.join(dir, "project.json"),
            `${JSON.stringify({ format: PROJECT_FORMAT, id: crypto.randomUUID() }, null, 2)}\n`,
          );
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
    // `/c/<id>/<rest>`: a community project, read where the site serves it, so it opens as a tab
    // like any other with nothing downloaded first (docs/2026-09-26-projects-on-demand.md). Only
    // its index and its boards come from there. The rest is this app's own pages, and every other
    // `/__sp` route is refused: nothing here can write to it, and `sp duplicate` makes it the
    // user's to change.
    const community =
      /^\/c\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})(\/.*)$/.exec(url);
    if (community) {
      const [, id, rest] = community;
      const [restPath] = rest.split("?");
      const fail = (code: number, message: string) => {
        res.statusCode = code;
        res.end(message);
      };
      // A dot segment, which fetch would resolve to somewhere else on the site, or a backslash,
      // which it reads as a slash.
      if (
        /(^|\/)(\.|%2e){1,2}(\/|$)/i.test(restPath) ||
        restPath.includes("\\")
      )
        return fail(400, "bad path");
      if (restPath === "/__sp/index.json" || restPath.startsWith("/board/")) {
        if (req.method !== "GET" && req.method !== "HEAD")
          return fail(405, "a community project is read-only");
        return void fetch(`${SITE}/p/${id}${restPath}`)
          .then(async (upstream) => {
            if (!upstream.ok)
              return fail(
                upstream.status,
                `superproto.dev answered ${upstream.status}`,
              );
            res.setHeader(
              "Content-Type",
              upstream.headers.get("Content-Type") ??
                "application/octet-stream",
            );
            if (restPath !== "/__sp/index.json") {
              res.setHeader("Content-Security-Policy", SANDBOX);
              return res.end(Buffer.from(await upstream.arrayBuffer()));
            }
            // Marked as a community project's, which the window shows as a tab of this app's
            // rather than a page of the site's (canvasIndex.ts, `local`).
            res.end(
              JSON.stringify({
                ...((await upstream.json()) as object),
                community: true,
              }),
            );
          })
          .catch((e: Error) =>
            fail(502, `superproto.dev could not be reached: ${e.message}`),
          );
      }
      // A board for the chat panel is drawn from a file, so this one's is fetched into a folder
      // of its own first, and written only when it changed, which is what redraws it.
      if (restPath === "/__sp/shoot" && req.method === "GET") {
        const shot = shotOf(req);
        if (typeof shot === "string") return fail(400, shot);
        return void fetch(`${SITE}/p/${id}/board/${shot.slug}/${shot.file}`)
          .then(async (upstream) => {
            if (!upstream.ok)
              return fail(
                upstream.status,
                `superproto.dev answered ${upstream.status}`,
              );
            const html = Buffer.from(withoutFiles(await upstream.text()));
            communityShots ??= fs.mkdtempSync(
              path.join(os.tmpdir(), "sp-community-"),
            );
            const board = path.join(communityShots, id, shot.slug, shot.file);
            fs.mkdirSync(path.dirname(board), { recursive: true });
            if (!fs.readFileSync(board, { flag: "a+" }).equals(html))
              fs.writeFileSync(board, html);
            shoot(board, shot.size, res);
          })
          .catch((e: Error) =>
            fail(502, `superproto.dev could not be reached: ${e.message}`),
          );
      }
      if (restPath.startsWith("/__sp/"))
        return fail(405, "a community project is read-only");
      req.url = rest;
      return next();
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
    // Made by a newer app, which may keep it in a way this one would misread, and then write back.
    const format = (
      readJson(path.join(dir, "project.json")) as { format?: unknown }
    )?.format;
    if (typeof format === "number" && format > PROJECT_FORMAT) {
      res.statusCode = 409;
      return res.end(
        `“${decodeURIComponent(name)}” was made by a newer Super Prototyping. Update the app to open it.`,
      );
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
