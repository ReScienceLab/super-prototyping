/**
 * The canvas as a macOS app: this process starts `dist/server.mjs` the way `sp start`
 * does, on the loopback, and opens one window on it. Nothing here re-implements the server.
 * Bundled to `dist/main.mjs` by `bun run build`; electron-builder wraps that and the built
 * canvas into the .app.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell, utilityProcess } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import {
  AGENTS,
  augmentedPath,
  detectAgents,
  findOnPath,
  freePort,
  parseArgs,
  portAnswers,
  stateDir,
  untilde,
  waitForPort,
} from "./launch.ts";

const home = os.homedir();
// A GUI app starts without the login shell's PATH. Set on this process, so agent detection
// below and every child, the server and what it spawns, see the same one.
process.env.PATH = augmentedPath(process.env, home);
// Electron's profile (IndexedDB holds the canvas document) goes beside the CLI's pidfile and
// log, not in ~/Library, so `sp paths` names every file this writes and `clean` removes it.
app.setPath("userData", path.join(stateDir(process.env, home), "desktop"));
app.setName("Super Prototyping");

// The plugin tree this app runs from: the skills, the built canvas and its server, the template
// canvas. Packaged, the copy extraResources (package.json) puts beside the app; unpackaged, the
// checkout this file was bundled from.
const pluginRoot = app.isPackaged
  ? path.join(process.resourcesPath, "plugin")
  : path.resolve(import.meta.dirname, "../..");

// `open -a "Super Prototyping" --args --port 5173 /path/to/project`, and nothing else. A project
// named here skips the startup page, and with it the skills install.
const { port: portArg, dir: argDir } = parseArgs(process.argv.slice(app.isPackaged ? 1 : 2));

let server: Electron.UtilityProcess | null = null;
let quitting = false;
app.on("will-quit", () => {
  quitting = true;
  server?.kill();
});
// One window is the app. macOS convention would keep it in the dock; the server holds the
// project open, so closing the window is quitting.
app.on("window-all-closed", () => app.quit());

async function main() {
  await app.whenReady();

  // The first page, before any project: which one agent to work with, each row with what its
  // presence on this machine rests on — a binary on PATH, a directory under home, an app bundle —
  // so a wrong guess is visible, then a project to open or to create. It is a page in the one
  // window, at the canvas's size, and stays up until the canvas replaces it; closing it quits.
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    title: "Super Prototyping",
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#000000" : "#ffffff",
    webPreferences: { preload: path.join(app.getAppPath(), "dist/preload.cjs") },
  });
  // The startup page and then the canvas are the only pages this window shows. Anything off the
  // loopback — the page's GitHub link, the canvas's Figma plugin link and the like — is for the
  // browser. `port` is set once a project is chosen; nothing of ours is linked before then.
  let port = 0;
  const isOurs = (url: string) => url.startsWith(`http://127.0.0.1:${port}/`);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isOurs(url)) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (isOurs(url)) return;
    event.preventDefault();
    shell.openExternal(url);
  });
  let project = argDir;
  let agent: string | undefined;
  if (project === undefined) {
    const PATH = process.env.PATH!;
    const found = detectAgents({
      bin: (name) => findOnPath(name, PATH) !== null,
      dir: (rel) => fs.existsSync(path.join(home, rel)),
      app: (name) =>
        fs.existsSync(path.join("/Applications", name)) ||
        fs.existsSync(path.join(home, "Applications", name)),
    });
    // Each row's icon is the product's SVG from icons/, inlined rather than linked so the mono
    // ones, drawn in currentColor, follow the text colour in dark mode.
    const rows = AGENTS.filter((a) => a.offered).map((a) => ({
      id: a.id,
      name: a.name,
      found: found[a.id],
      icon: fs.readFileSync(path.join(app.getAppPath(), "icons", `${a.id}.svg`), "utf8"),
    }));
    ({ project, agent } = await new Promise<{ project: string; agent: string }>((resolve) => {
      // What the page gets back is nothing when the project opened (or the open panel was
      // cancelled), and otherwise what to say under its name field. It is said there, where the
      // user is, with the way out, rather than as a native alert with an error's text in it.
      ipcMain.handle(
        "startup:choose",
        async (
          _event: IpcMainInvokeEvent,
          action: "open" | "create",
          chosen: string,
          name = "",
        ) => {
          let dir: string | undefined;
          if (action === "open" && name === "") {
            // The open panel is a sheet on this window, so a second click cannot land while it is
            // up; creating is synchronous.
            const opened = await dialog.showOpenDialog(win, {
              title: "Open a project",
              message: "Choose the project whose mockups/canvases the canvas should show.",
              properties: ["openDirectory", "createDirectory"],
            });
            dir = opened.filePaths[0];
          } else {
            // A new project needs only a name, as in Screen Studio: it goes under Documents, so
            // there is no place to pick. The page's `required` lets a name of spaces through, and
            // knows nothing of folders.
            if (name === "") return { message: "Give the project a name first." };
            if (name.startsWith(".") || path.basename(name) !== name) {
              return { message: "A name cannot start with a dot or have a slash in it." };
            }
            dir = path.join(app.getPath("documents"), "Super Prototyping", name);
            // "open" with a name is the page's "Open it instead", for a name found taken here.
            if (action === "create") {
              if (fs.existsSync(dir)) {
                return {
                  message: `You already have a project called “${name}”. Try another name.`,
                  taken: true,
                };
              }
              // A folder with `mockups/canvases` in it and nothing else: what the window opens
              // on, Start here and the examples, is the app's and shown beside the project's own
              // (PROTOTYPING_EXAMPLES_DIR below), so there is nothing to copy in.
              try {
                fs.mkdirSync(path.join(dir, "mockups/canvases"), { recursive: true });
              } catch (e) {
                // A Documents that cannot be written to: nothing a new name fixes, so say which.
                return { message: `That folder could not be made: ${(e as Error).message}` };
              }
            }
          }
          if (dir === undefined) return; // cancelled: the window is still there, nothing written
          ipcMain.removeHandler("startup:choose");
          resolve({ project: dir, agent: chosen });
        },
      );
      win.loadFile(path.join(app.getAppPath(), "startup.html"), {
        query: { agents: JSON.stringify(rows) },
      });
    }));
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PROTOTYPING_PROJECT_DIR: project,
    PROTOTYPING_CANVASES_DIR: path.resolve(
      project,
      untilde(process.env.PROTOTYPING_CANVASES_DIR || "mockups/canvases", home),
    ),
    // An env value already set wins, the way the CLI's own lookup works: a developer pointing
    // the packaged app at a checkout.
    SUPER_PROTOTYPING_ROOT: untilde(process.env.SUPER_PROTOTYPING_ROOT || pluginRoot, home),
    // Every canvas this repo has, shipped in the app and shown read-only beside the project's
    // own: a new project opens on Start here with the examples under it, not on nothing.
    PROTOTYPING_EXAMPLES_DIR: path.join(pluginRoot, "mockups/canvases"),
  };

  // `--port`, then SP_CANVAS_PORT, then 5173: the CLI's precedence. The canvas document lives
  // in IndexedDB under the origin, so a stable port is what keeps it from one launch to the
  // next; a free one only when 5173 already answers, which is a canvas the CLI started. A port
  // that was asked for and is taken is an error, not a second server racing the first: the
  // window must not open before this app's own server is up, because Electron loses a utility
  // process's early output when a window is being created as it starts.
  port = portArg ?? Number(process.env.SP_CANVAS_PORT || 0);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    dialog.showErrorBox("Bad port", "--port and SP_CANVAS_PORT take a port number, 1 to 65535.");
    return app.exit(1);
  }
  if (port && (await portAnswers(port))) {
    dialog.showErrorBox(
      `Port ${port} is already in use`,
      "Something is listening there already. Stop it, or start this app with another --port or SP_CANVAS_PORT.",
    );
    return app.exit(1);
  }
  if (!port) port = (await portAnswers(5173)) ? await freePort() : 5173;

  let output = "";
  const exited = new AbortController();
  server = utilityProcess.fork(path.join(pluginRoot, "canvas/dist/server.mjs"), ["--port", String(port)], {
    env,
    cwd: project,
    stdio: "pipe",
    serviceName: "canvas server",
  });
  for (const stream of [server.stdout, server.stderr]) {
    stream?.on("data", (chunk: Buffer) => {
      process.stderr.write(chunk);
      output = (output + chunk).slice(-4000);
    });
  }
  server.on("exit", (code) => {
    exited.abort();
    server = null;
    if (quitting) return;
    // A server that stops while the window is up has nothing left to show. The reason is in
    // what it printed, and that goes in the box, not to a log the user would have to find.
    dialog.showErrorBox(`The canvas server exited (code ${code})`, output || "(no output)");
    app.exit(1);
  });

  try {
    await waitForPort(port, 15_000, exited.signal);
  } catch (e) {
    if (exited.signal.aborted) return; // the exit handler has already said why
    quitting = true;
    server.kill();
    dialog.showErrorBox(String(e), output || "(no output)");
    return app.exit(1);
  }

  let notice = "";
  if (agent !== undefined) {
    const row = AGENTS.find((a) => a.id === agent)!; // the page's rows came from this table
    const res = await fetch(`http://127.0.0.1:${port}/__sp/skills`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dirs: [row.dir] }),
    });
    if (!res.ok) throw new Error(`Installing skills failed: ${await res.text()}`);
    const { written, skipped } = (await res.json()) as { written: string[]; skipped: string[] };
    // Nothing written and nothing skipped is a project that already had every copy at this
    // version — the same answer as last launch — and a launch like that says nothing, the
    // agent's note included: that was shown when the copies landed.
    if (written.length > 0 || skipped.length > 0) {
      // Said by the canvas, as a toast at its bottom right once it is up, rather than by a
      // native alert here, which would be a modal in front of a startup page about to be
      // replaced. The copies are all under the one directory asked for, so it is named once
      // and each copy by its own name.
      const names = (paths: string[]) => paths.map((p) => path.posix.basename(p)).join(", ");
      const toast = {
        title: `Skills installed for ${row.name}`,
        description: [
          written.length ? `Into ${row.dir}: ${names(written)}.` : "",
          skipped.length ? `Already there, left alone: ${names(skipped)}.` : "",
          row.note ?? "",
        ]
          .filter(Boolean)
          .join(" "),
      };
      notice = `?toast=${encodeURIComponent(JSON.stringify(toast))}`;
    }
  }

  await win.loadURL(`http://127.0.0.1:${port}/${notice}`);
}

// Electron neither exits nor says anything on a rejection in the main process; without this,
// a failure before the window exists is an app in the Dock with nothing to show. `app.exit`
// skips will-quit, so the server, if it got as far as starting, is killed here.
main().catch((e) => {
  quitting = true;
  server?.kill();
  dialog.showErrorBox("Super Prototyping failed to start", String(e));
  app.exit(1);
});
