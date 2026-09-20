/**
 * The canvas as a macOS app: this process starts `dist/server.mjs` the way `sp start`
 * does, on the loopback, and opens one window on it. Nothing here re-implements the server.
 * Bundled to `dist/main.mjs` by `bun run build`; electron-builder wraps that and the built
 * canvas into the .app.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  shell,
  utilityProcess,
} from "electron";
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
const desktopStateDir = path.join(stateDir(process.env, home), "desktop");
app.setPath("userData", desktopStateDir);
// Which projects the onboarding picker has already been shown for, offered or skipped, so a
// project someone skipped does not reopen it on every later launch; "Install skills…" in the
// menu is the deliberate way back in.
const onboardedFile = path.join(desktopStateDir, "onboarded.json");
app.setName("Super Prototyping");

const serverPath = app.isPackaged
  ? path.join(process.resourcesPath, "plugin/canvas/dist/server.mjs")
  : path.resolve(import.meta.dirname, "../../canvas/dist/server.mjs");

// `open -a "Super Prototyping" --args --port 5173 /path/to/project`, and nothing else.
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

/**
 * The onboarding picker and the menu's "Install skills…" both funnel through here: detect what
 * looks installed, show the checklist, and POST what was chosen. An empty selection — Skip, or
 * the window closed without submitting — does nothing; there is nothing to undo.
 */
async function openSkillsPicker(port: number) {
  const PATH = process.env.PATH!;
  const detected = new Set(
    detectAgents({
      bin: (name) => findOnPath(name, PATH) !== null,
      dir: (rel) => fs.existsSync(path.join(home, rel)),
      app: (name) =>
        fs.existsSync(path.join("/Applications", name)) ||
        fs.existsSync(path.join(home, "Applications", name)),
    }),
  );
  const rows = AGENTS.map((a) => ({
    id: a.id,
    name: a.name,
    checked: detected.has(a.id),
  }));

  const appDir = app.getAppPath();
  const ids = await new Promise<string[]>((resolve) => {
    const picker = new BrowserWindow({
      width: 520,
      height: 640,
      resizable: false,
      title: "Install skills",
      webPreferences: { preload: path.join(appDir, "dist/preload.cjs") },
    });
    // "skills:submit" is one shared channel for every open picker (the menu's "Install
    // skills…" can open a second one while the first-run picker above is still up), so every
    // listener sees every window's submit; only the one whose sender is this picker may act on
    // it, and it must stay registered with `on`, not `once`, until then, or another window's
    // submit would consume and remove it first.
    const onSubmit = (event: IpcMainEvent, submitted: string[]) => {
      if (event.sender !== picker.webContents) return;
      ipcMain.removeListener("skills:submit", onSubmit);
      picker.close();
      resolve(submitted);
    };
    ipcMain.on("skills:submit", onSubmit);
    // Closing the picker without submitting is Skip; the listener above would otherwise wait
    // forever for an event this window will never send.
    picker.on("closed", () => {
      ipcMain.removeListener("skills:submit", onSubmit);
      resolve([]);
    });
    picker.loadFile(path.join(appDir, "onboarding.html"), {
      query: { agents: JSON.stringify(rows) },
    });
  });
  if (ids.length === 0) return;

  const res = await fetch(`http://127.0.0.1:${port}/__sp/skills`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dirs: skillDirsFor(ids) }),
  });
  const { written, skipped } = (await res.json()) as {
    written: string[];
    skipped: string[];
  };
  const notes = AGENTS.filter((a) => ids.includes(a.id) && a.note).map(
    (a) => `${a.name}: ${a.note}`,
  );
  if (written.length === 0 && skipped.length === 0 && notes.length === 0)
    return;
  await dialog.showMessageBox({
    type: "info",
    message: "Skills installed",
    detail: [
      written.length ? `Installed: ${written.join(", ")}` : "",
      skipped.length
        ? `Already present, left alone: ${skipped.join(", ")}`
        : "",
      ...notes,
    ]
      .filter(Boolean)
      .join("\n"),
  });
}

async function main() {
  await app.whenReady();

  const project =
    argDir ??
    (
      await dialog.showOpenDialog({
        title: "Open a project",
        message: "Choose the project whose mockups/canvases the canvas should show.",
        properties: ["openDirectory", "createDirectory"],
      })
    ).filePaths[0];
  if (!project) return app.exit(0);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PROTOTYPING_PROJECT_DIR: project,
    PROTOTYPING_CANVASES_DIR: path.resolve(
      project,
      untilde(process.env.PROTOTYPING_CANVASES_DIR || "mockups/canvases", home),
    ),
  };
  if (env.SUPER_PROTOTYPING_ROOT) {
    env.SUPER_PROTOTYPING_ROOT = untilde(env.SUPER_PROTOTYPING_ROOT, home);
  } else if (app.isPackaged) {
    // The tree extraResources copies beside dist/server.mjs (package.json). An env value
    // already set wins, the way the CLI's own SUPER_PROTOTYPING_ROOT lookup works.
    env.SUPER_PROTOTYPING_ROOT = path.join(process.resourcesPath, "plugin");
  }

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
  server = utilityProcess.fork(serverPath, ["--port", String(port)], {
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

  // "Install skills…" reruns the same picker against this project and port, no restart needed.
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { role: "appMenu" },
      {
        label: "File",
        submenu: [
          {
            label: "Install skills…",
            click: () => {
              openSkillsPicker(port).catch((e) =>
                dialog.showErrorBox("Install skills failed", String(e)),
              );
            },
          },
        ],
      },
      { role: "editMenu" },
      { role: "viewMenu" },
      { role: "windowMenu" },
    ]),
  );

  const { installed } = (await fetch(
    `http://127.0.0.1:${port}/__sp/skills`,
  ).then((r) => r.json())) as { installed: unknown[] };
  let offered: string[] = [];
  try {
    offered = JSON.parse(fs.readFileSync(onboardedFile, "utf8"));
  } catch {
    // No file yet: this app has never offered the picker for any project.
  }
  if (installed.length === 0 && !offered.includes(project)) {
    await openSkillsPicker(port);
    fs.mkdirSync(desktopStateDir, { recursive: true });
    fs.writeFileSync(onboardedFile, JSON.stringify([...offered, project]));
  }

  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    title: "Super Prototyping",
  });
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
}

// Electron neither exits nor says anything on a rejection in the main process; without this,
// a failure before the window exists is an app in the Dock with nothing to show.
main().catch((e) => {
  dialog.showErrorBox("Super Prototyping failed to start", String(e));
  app.exit(1);
});
