/**
 * The canvas as a macOS app: this process starts `dist/server.mjs` the way `sp start`
 * does, on the loopback, and opens one window on it. Nothing here re-implements the server.
 * Bundled to `dist/main.mjs` by `bun run build`; electron-builder wraps that and the built
 * canvas into the .app.
 */
import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { app, BrowserWindow, clipboard, dialog, shell, utilityProcess } from "electron";
import {
  augmentedPath,
  findOnPath,
  freePort,
  installCommand,
  missingToolkitMessage,
  parseArgs,
  portAnswers,
  stateDir,
  toolchainBins,
  untilde,
  waitForPort,
} from "./launch.ts";

const home = os.homedir();
// A GUI app starts without the login shell's PATH. Set on this process, so the toolkit
// lookup below and every child, the server and what it spawns, see the same one.
process.env.PATH = augmentedPath(process.env, home);
// Electron's profile (IndexedDB holds the canvas document) goes beside the CLI's pidfile and
// log, not in ~/Library, so `sp paths` names every file this writes and `clean` removes it.
app.setPath("userData", path.join(stateDir(process.env, home), "desktop"));
app.setName("Super Prototyping");

const serverPath = app.isPackaged
  ? path.join(process.resourcesPath, "dist/server.mjs")
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
  if (env.SUPER_PROTOTYPING_ROOT) env.SUPER_PROTOTYPING_ROOT = untilde(env.SUPER_PROTOTYPING_ROOT, home);

  // The plugin root, resolved by the toolkit so the app and the CLI never disagree on it. Its
  // absence is the first-launch state: say what to install and where it was looked for, then
  // open the boards anyway; the agent and screenshot buttons find out on their own.
  if (!env.SUPER_PROTOTYPING_ROOT) {
    const spCanvas = findOnPath("sp", process.env.PATH!);
    if (!spCanvas) {
      const { response } = await dialog.showMessageBox({
        type: "warning",
        message: "The toolkit is not installed",
        detail: missingToolkitMessage({
          uv: findOnPath("uv", process.env.PATH!) !== null,
          version: app.getVersion(),
          bins: toolchainBins(home),
        }),
        buttons: ["Continue", "Copy install command"],
      });
      if (response === 1) clipboard.writeText(installCommand(app.getVersion()));
    } else {
      const root = await new Promise<string | undefined>((resolve) =>
        execFile(spCanvas, ["root"], { cwd: os.tmpdir(), timeout: 10_000 }, (err, out, stderr) => {
          if (!err) return resolve(out.trim());
          // Its stderr already lists every place it looked.
          dialog.showErrorBox("sp root failed", stderr || String(err));
          resolve(undefined);
        }),
      );
      if (root) env.SUPER_PROTOTYPING_ROOT = root;
    }
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
}

// Electron neither exits nor says anything on a rejection in the main process; without this,
// a failure before the window exists is an app in the Dock with nothing to show.
main().catch((e) => {
  dialog.showErrorBox("Super Prototyping failed to start", String(e));
  app.exit(1);
});
