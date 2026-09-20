/**
 * The canvas as a macOS app: this process starts `dist/server.mjs` the way `sp start`
 * does, on the loopback, and opens one window on it. Nothing here re-implements the server.
 * Bundled to `dist/main.mjs` by `bun run build`; electron-builder wraps that and the built
 * canvas into the .app.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { app, BrowserWindow, dialog, ipcMain, shell, utilityProcess } from "electron";
import type { IpcMainEvent } from "electron";
import {
  AGENTS,
  augmentedPath,
  detectAgents,
  findOnPath,
  freePort,
  parseArgs,
  portAnswers,
  skillDirsFor,
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
// named here skips the startup window, and with it the skills install.
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

  // The first window, before any project: the agents this machine seems to have, each with what
  // that rests on — a binary on PATH, a directory under home, an app bundle — so a wrong guess is
  // visible and can be unchecked, then a project to open or to create. The window is hidden once
  // a project is chosen, not closed, until the canvas is up: closing the last window quits the
  // app, which is also what closing this one by hand means.
  let project = argDir;
  let ids: string[] = [];
  let startupWindow: BrowserWindow | undefined;
  if (project === undefined) {
    const PATH = process.env.PATH!;
    const found = detectAgents({
      bin: (name) => findOnPath(name, PATH) !== null,
      dir: (rel) => fs.existsSync(path.join(home, rel)),
      app: (name) =>
        fs.existsSync(path.join("/Applications", name)) ||
        fs.existsSync(path.join(home, "Applications", name)),
    });
    const rows = AGENTS.map((a) => ({ id: a.id, name: a.name, found: found[a.id] }));
    const win = new BrowserWindow({
      width: 560,
      height: 720,
      resizable: false,
      title: "Super Prototyping",
      webPreferences: { preload: path.join(app.getAppPath(), "dist/preload.cjs") },
    });
    startupWindow = win;
    ({ project, ids } = await new Promise<{ project: string; ids: string[] }>((resolve) => {
      const onChoose = async (_event: IpcMainEvent, action: "open" | "create", chosen: string[]) => {
        // Either panel is a sheet on this window, so a second click cannot land while one is up.
        let dir: string | undefined;
        if (action === "open") {
          const opened = await dialog.showOpenDialog(win, {
            title: "Open a project",
            message: "Choose the project whose mockups/canvases the canvas should show.",
            properties: ["openDirectory", "createDirectory"],
          });
          dir = opened.filePaths[0];
        } else {
          // A new project is a folder with `mockups/canvases` in it, seeded with the template
          // canvas the plugin ships, so the window opens on boards rather than on nothing.
          const saved = await dialog.showSaveDialog(win, {
            title: "Create a project",
            nameFieldLabel: "Project folder",
            defaultPath: path.join(app.getPath("documents"), "my-prototype"),
            buttonLabel: "Create",
            showsTagField: false,
          });
          dir = saved.canceled ? undefined : saved.filePath;
          if (dir !== undefined) {
            try {
              fs.mkdirSync(path.join(dir, "mockups/canvases"), { recursive: true });
              fs.cpSync(
                path.join(pluginRoot, "mockups/canvases/templates"),
                path.join(dir, "mockups/canvases/templates"),
                { recursive: true },
              );
            } catch (e) {
              // The panel lets a name land on an existing file, or somewhere unwritable.
              dialog.showErrorBox("Couldn't create the project", String(e));
              return;
            }
          }
        }
        if (dir === undefined) return; // cancelled: the window is still there, nothing was written
        ipcMain.removeListener("startup:choose", onChoose);
        win.hide();
        resolve({ project: dir, ids: chosen });
      };
      ipcMain.on("startup:choose", onChoose);
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
  };

  // `--port`, then SP_CANVAS_PORT, then 5173: the CLI's precedence. The canvas document lives
  // in IndexedDB under the origin, so a stable port is what keeps it from one launch to the
  // next; a free one only when 5173 already answers, which is a canvas the CLI started. A port
  // that was asked for and is taken is an error, not a second server racing the first: the
  // window must not open before this app's own server is up, because Electron loses a utility
  // process's early output when a window is being created as it starts.
  let port = portArg ?? Number(process.env.SP_CANVAS_PORT || 0);
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

  if (ids.length > 0) {
    const res = await fetch(`http://127.0.0.1:${port}/__sp/skills`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dirs: skillDirsFor(ids) }),
    });
    if (!res.ok) throw new Error(`Installing skills failed: ${await res.text()}`);
    const { written, skipped } = (await res.json()) as { written: string[]; skipped: string[] };
    // Nothing written and nothing skipped is a project that already had every copy at this
    // version — the same answer as last launch — and a launch like that says nothing, the
    // agents' notes included: those were shown when the copies landed.
    if (written.length > 0 || skipped.length > 0) {
      const notes = AGENTS.filter((a) => ids.includes(a.id) && a.note).map((a) => `${a.name}: ${a.note}`);
      await dialog.showMessageBox({
        type: "info",
        message: "Skills installed",
        detail: [
          written.length ? `Installed: ${written.join(", ")}` : "",
          skipped.length ? `Already present, left alone: ${skipped.join(", ")}` : "",
          ...notes,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    }
  }

  const win = new BrowserWindow({ width: 1440, height: 900, title: "Super Prototyping" });
  // The canvas is the only page this window shows. Anything off the loopback, the Figma
  // plugin link and the like, is for the browser.
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
  await win.loadURL(`http://127.0.0.1:${port}/`);
  startupWindow?.close();
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
