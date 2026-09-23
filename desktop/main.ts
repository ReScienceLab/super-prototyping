/**
 * The canvas as a desktop app, for macOS and Windows. This process starts `dist/server.mjs` the way `sp start` does, on the
 * loopback, and opens one window on it. The one server serves every project, each at `/p/<name>/`.
 * Nothing here re-implements the server.
 * Bundled to `dist/main.mjs` by `bun run build`; electron-builder wraps that and the built
 * canvas into the .app.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
  utilityProcess,
} from "electron";
import { autoUpdater } from "electron-updater";
import {
  allowInCodex,
  augmentedPath,
  dataDir,
  ensurePathInRc,
  freePort,
  isWeb,
  linkInstall,
  parseArgs,
  portAnswers,
  stateDir,
  untilde,
  waitForPort,
} from "./launch.ts";

const home = os.homedir();
// A GUI app starts without the login shell's PATH. Set on this process, so every child, the
// server and the agent it spawns, sees the same one.
process.env.PATH = augmentedPath(process.env, home);
// Electron's profile (IndexedDB holds the canvas document) goes beside the CLI's pidfile and
// log, not in ~/Library, so `sp paths` names every file this writes and `clean` removes it.
app.setPath("userData", path.join(stateDir(process.env, home), "desktop"));
app.setName("Super Prototyping");

// The plugin tree this app runs from: the skills, the built canvas and its server, the template
// canvas. Packaged, it is the copy extraResources (package.json) puts beside the app. Unpackaged,
// it is the checkout this file was bundled from.
const pluginRoot = app.isPackaged
  ? path.join(process.resourcesPath, "plugin")
  : path.resolve(import.meta.dirname, "../..");

// `open -a "Super Prototyping" --args --port 5173 /path/to/project`, and nothing else. A project
// named here skips the home page and the onboarding. `--upgrade` is `sp upgrade`.
const argvOf = (argv: string[]) => parseArgs(argv.slice(app.isPackaged ? 1 : 2));
const { port: portArg, dir: argDir, upgrade: upgradeArg } = argvOf(process.argv);

// One app. A second launch, which is how `sp open` and `sp upgrade` reach a running one
// (`open -n` — without it macOS only focuses the app and drops the arguments), hands its arguments
// to this one over `second-instance` and exits.
if (!app.requestSingleInstanceLock()) app.exit(0);

// What the CLI reads to find this app and hear about an update, beside its own pidfiles and logs:
// `app.json` while the app runs, `update.json` after every check. tools/sp_canvas.py reads both.
const state = stateDir(process.env, home);
const appFile = path.join(state, "app.json");
const updateFile = path.join(state, "update.json");
const writeJson = (file: string, value: object) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
};

let server: Electron.UtilityProcess | null = null;
let quitting = false;
// The server passes a SIGTERM on to the agent it is running. Windows has no signal for it to
// catch, so there the whole tree is ended from here, or the agent would go on editing the project.
function stopServer() {
  if (process.platform === "win32" && server?.pid)
    spawnSync("taskkill", ["/pid", `${server.pid}`, "/t", "/f"]);
  else server?.kill();
}
app.on("will-quit", () => {
  quitting = true;
  stopServer();
  fs.rmSync(appFile, { force: true });
});
// One window is the app. macOS convention would keep it in the dock; the server holds the
// projects open, so closing the window is quitting.
app.on("window-all-closed", () => app.quit());

async function main() {
  await app.whenReady();

  // `--port`, then SP_CANVAS_PORT, then 5173, which is the CLI's precedence. The canvas document is
  // stored in IndexedDB under the origin, so a stable port is what keeps it from one launch to the
  // next. A free port is used only when 5173 already answers, which is a canvas the CLI started. A
  // port that was asked for and is taken is an error, not a second server racing the first.
  let port = portArg ?? Number(process.env.SP_CANVAS_PORT || 0);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    dialog.showErrorBox(
      "Bad port",
      "--port and SP_CANVAS_PORT take a port number, 1 to 65535.",
    );
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
  const origin = `http://127.0.0.1:${port}`;

  // The home page and the canvas are the only pages this app shows. Anything off
  // the loopback, such as the page's GitHub link or the canvas's Figma plugin link, is for the
  // browser if it is a web address, and goes nowhere if it is not. It is set on every page the app
  // makes and not on the window's alone, because the canvas opens its brand pages as windows of
  // their own, and their outside links are for the browser too. The sheet is ours but goes to the
  // browser as well, since it is the page html.to.design captures into Figma, and that is a
  // browser extension, which a window of this app does not have.
  const isOurs = (url: string) => url.startsWith(`${origin}/`);
  app.on("web-contents-created", (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (isOurs(url) && !new URL(url).pathname.endsWith("/sheet.html"))
        return { action: "allow" };
      if (isWeb(url)) shell.openExternal(url);
      return { action: "deny" };
    });
    contents.on("will-navigate", (event, url) => {
      if (isOurs(url)) return;
      event.preventDefault();
      if (isWeb(url)) shell.openExternal(url);
    });
  });

  // Every launch opens on the home page, which is no project's and lists them all, however many
  // there are, none included. The first launch, and the first of a new major version, asks over it
  // which agent to work with (canvas/src/Onboarding.tsx).
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    title: "Super Prototyping",
    backgroundColor: "#000000",
    // Windows draws the menu as a white strip across a black app. Alt still shows it.
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(app.getAppPath(), "dist/preload.cjs"),
    },
  });

  // The app updates itself from the GitHub release. A newer one downloads in the background, and
  // this dialog is all the user sees of it; "Later" installs it when the app quits. A check that
  // fails says nothing: being offline, or asking in the minutes between a release and its
  // installers being attached, is not something the user can act on. Nothing happens unpackaged.
  // The onboarding shows the version, and a click on it checks again. That check was asked
  // for, so it is answered either way, in the words the page puts beside the version.
  // `sp upgrade` asks for the same dialog again when the update is already down.
  let downloaded: string | undefined;
  const askToRestart = async (version: string) => {
    win.show();
    const { response } = await dialog.showMessageBox(win, {
      message: `Super Prototyping ${version} is ready.`,
      detail:
        "Restart to install it now, or it installs the next time you quit.",
      buttons: ["Restart Now", "Later"],
      cancelId: 1, // Esc is "Later": without this it answers 0, which is "Restart Now".
    });
    if (response === 0) autoUpdater.quitAndInstall();
  };
  // Every check's outcome goes in update.json, which is where the CLI's notice comes from. The
  // updater only checks while the app runs, so `checkedAt` says how old the answer is.
  // A failed check is recorded too, with its reason, so `sp upgrade` can say so instead of
  // waiting for an answer that never comes.
  const record = (available: string | null, error?: string) =>
    writeJson(updateFile, {
      current: app.getVersion(),
      available,
      downloaded: downloaded ?? null,
      error: error ?? null,
      checkedAt: new Date().toISOString(),
    });
  autoUpdater.on("update-downloaded", ({ version }) => {
    downloaded = version;
    record(version);
    return askToRestart(version);
  });
  const checkForUpdates = () =>
    autoUpdater.checkForUpdates().then(
      (check) => {
        if (!check) return "Could not check"; // unpackaged: the updater is off and asked nobody
        check.downloadPromise?.catch(() => {});
        record(check.isUpdateAvailable ? check.updateInfo.version : null);
        return check.isUpdateAvailable
          ? `${check.updateInfo.version} available`
          : "Up to date";
      },
      (e) => {
        record(null, String(e));
        return "Could not check";
      },
    );
  // Recorded again before the dialog, so `sp upgrade`, which waits for a new `checkedAt`, hears it.
  const upgrade = () => {
    if (!downloaded) return checkForUpdates();
    record(downloaded);
    return askToRestart(downloaded);
  };
  checkForUpdates();
  ipcMain.handle("startup:check", checkForUpdates);
  // Where every new project goes, which makes the folder the list of them. The server lists it and
  // makes a project in it, so this hands it over (PROTOTYPING_PROJECTS_DIR below).
  const projectsDir = path.join(app.getPath("documents"), "Super Prototyping");
  // All the app remembers: the agent the onboarding chose and the version that was running when
  // it did. No agent, or one chosen under another major version, gets the onboarding again, which
  // is also what skipping it leaves. No project is kept: the launch opens none.
  const lastFile = path.join(app.getPath("userData"), "last.json");
  const last: { agent?: string; version?: string } = fs.existsSync(lastFile)
    ? JSON.parse(fs.readFileSync(lastFile, "utf8"))
    : {};

  // One server for the app's whole run, on `port`, for every project. Each is a path of its own
  // (`/p/<name>/`), so another project is another tab, not another server. It starts before any
  // page loads, and stops only when the app quits.
  async function startServer() {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      // An env value already set wins, the way the CLI's own lookup works, for a developer pointing
      // the packaged app at a checkout.
      SUPER_PROTOTYPING_ROOT: untilde(
        process.env.SUPER_PROTOTYPING_ROOT || pluginRoot,
        home,
      ),
      // Every project under it is served at `/p/<name>/`, and listed on the home page. The server's
      // own default is the same folder. This is Electron's word for where Documents is.
      PROTOTYPING_PROJECTS_DIR: projectsDir,
    };

    let output = "";
    const exited = new AbortController();
    const child = utilityProcess.fork(
      path.join(pluginRoot, "canvas/dist/server.mjs"),
      ["--port", String(port)],
      { env, cwd: home, stdio: "pipe", serviceName: "canvas server" },
    );
    server = child;
    for (const stream of [child.stdout, child.stderr]) {
      stream?.on("data", (chunk: Buffer) => {
        process.stderr.write(chunk);
        output = (output + chunk).slice(-4000);
      });
    }
    child.on("exit", (code) => {
      exited.abort();
      if (quitting) return;
      server = null;
      // A server that stops while the window is up has nothing left to show. The reason is in
      // what it printed, and that goes in the box, not to a log the user would have to find.
      dialog.showErrorBox(
        `The canvas server exited (code ${code})`,
        output || "(no output)",
      );
      app.exit(1);
    });

    // Nothing loads before the server is up, because Electron loses a utility process's early
    // output when a window is being created as it starts.
    try {
      await waitForPort(port, 15_000, exited.signal);
    } catch (e) {
      if (exited.signal.aborted) return; // the exit handler has already said why
      quitting = true;
      stopServer();
      dialog.showErrorBox(String(e), output || "(no output)");
      return app.exit(1);
    }
  }

  // Opens a folder as a project, for the launch: the one from the command line. The server answers
  // with the project's address, and names a folder from outside the projects directory when it is
  // first asked for here, over its parent port, which nothing but this app can write to
  // (canvas/server/main.ts).
  async function openProject(dir: string) {
    const answer = new Promise<{ address?: string; error?: string }>((resolve) =>
      server!.once("message", resolve),
    );
    server!.postMessage(dir);
    const { address, error } = await answer;
    if (address === undefined) throw new Error(`Opening ${dir} failed: ${error}`);
    return origin + address;
  }
  // The onboarding's answer: the agent the chat panel will run, remembered for the next launch.
  // Nothing is installed now: the agent gets its skills in its own folder when it first runs
  // (canvas/server/agent.ts).
  ipcMain.handle("startup:agent", (_event, agent: string) => {
    Object.assign(last, { agent, version: app.getVersion() });
    fs.writeFileSync(lastFile, JSON.stringify(last));
  });

  await startServer();
  writeJson(appFile, { port, pid: process.pid, version: app.getVersion() });
  linkIntoMachine();
  app.on("second-instance", async (_event, argv) => {
    const { dir, upgrade: wantsUpgrade } = argvOf(argv);
    if (win.isMinimized()) win.restore();
    win.focus();
    if (wantsUpgrade) upgrade();
    if (dir !== undefined) win.loadURL(await openProject(dir)).catch(fail);
  });
  if (upgradeArg) upgrade();
  if (argDir !== undefined) return win.loadURL(await openProject(argDir));
  const url = new URL("/home.html", origin);
  const major = (version?: string) => version?.split(".")[0];
  if (
    last.agent === undefined ||
    major(last.version) !== major(app.getVersion())
  )
    url.searchParams.set("onboarding", app.getVersion());
  await win.loadURL(url.href);
}

/**
 * The skills, the commands and the Codex rule, linked through `current` at this app on every
 * launch (launch.ts). Only a packaged app: a checkout is a developer's, and an app run from its dmg
 * (`/Volumes`) or from Gatekeeper's translocated copy would leave links that dangle once it is
 * gone. A failure is logged and the app goes on: the canvas works without them.
 */
function linkIntoMachine() {
  if (
    !app.isPackaged ||
    pluginRoot.startsWith("/Volumes/") ||
    pluginRoot.includes("/AppTranslocation/")
  )
    return;
  try {
    for (const change of linkInstall(pluginRoot, home)) console.log(change);
    if (process.platform === "win32") installCommands();
    else {
      const rc = ensurePathInRc(home, process.env.SHELL ?? "");
      if (rc) console.log(`added ~/.local/bin to PATH in ${rc}`);
    }
    const allowed = allowInCodex(home);
    if (allowed.length) console.log(`allowed ${allowed.join(", ")} in Codex`);
  } catch (e) {
    console.error(`linking into the machine failed: ${e}`);
  }
}

/**
 * Windows's sp, refkit and artgen: `.exe`s in ~/.local/bin, which Git Bash, PowerShell and cmd all
 * run by name, from `uv tool install`. Editable through `current`, so an update's code runs at once;
 * reinstalled when the version changes, so its dependencies do too. uv's own installer put
 * ~/.local/bin on the user's PATH. No uv yet: the next launch tries again.
 */
function installCommands() {
  const done = path.join(dataDir(home), "tools-version");
  if (fs.existsSync(done) && fs.readFileSync(done, "utf8") === app.getVersion())
    return;
  const tools = path.join(dataDir(home), "current", "tools");
  const uv = spawn("uv", ["tool", "install", "--force", "--editable", tools], {
    stdio: "inherit",
  });
  uv.on("error", (e) => console.error(`installing the commands failed: ${e}`));
  uv.on("exit", (code) => {
    if (code === 0) fs.writeFileSync(done, app.getVersion());
    else console.error(`uv tool install exited ${code}`);
  });
}

// Electron neither exits nor says anything on a rejection in the main process; without this,
// a failure before the window exists is an app in the Dock with nothing to show. `app.exit`
// skips will-quit, so the server, if it got as far as starting, is killed here.
function fail(e: unknown) {
  quitting = true;
  stopServer();
  dialog.showErrorBox("Super Prototyping failed to start", String(e));
  app.exit(1);
}
main().catch(fail);
