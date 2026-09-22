/**
 * The parts of the shell that do not need Electron: where the CLI keeps its state, which
 * directories a GUI app has to add to PATH, and which project is the newest.
 * Kept apart from main.ts so `bun test` covers them without an Electron process.
 */
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

/**
 * A leading `~`, the way `Path.expanduser()` reads the same variables in tools/sp_canvas.py.
 * A GUI app's environment never went through a shell, so nothing has expanded it yet.
 */
export function untilde(p: string, home: string) {
  return p === "~" || p.startsWith("~/") ? home + p.slice(1) : p;
}

/**
 * A link the browser should get. A board's script or a `layout.json` link can name any scheme, and
 * the OS opens a `file:` URL or another app's own scheme without asking, so only the web goes out.
 */
export function isWeb(url: string) {
  return /^https?:\/\//i.test(url);
}

/**
 * `<state>/super-prototyping`, exactly as `_dirs()` in tools/sp_canvas.py computes it, so the
 * shell's own files sit beside the CLI's pidfile and log and `sp clean` removes both.
 */
export function stateDir(env: NodeJS.ProcessEnv, home: string) {
  if (env.SUPER_PROTOTYPING_HOME)
    return path.join(untilde(env.SUPER_PROTOTYPING_HOME, home), "state");
  return path.join(
    env.XDG_STATE_HOME || path.join(home, ".local/state"),
    "super-prototyping",
  );
}

/**
 * The directories user-installed CLIs go in, which a login shell would have put on PATH. A GUI app
 * on macOS starts with `/usr/bin:/bin:/usr/sbin:/sbin`, so `uv`, `sp`, `claude` and `codex` are all
 * invisible without these.
 */
export function augmentedPath(env: NodeJS.ProcessEnv, home: string) {
  const have = (env.PATH ?? "").split(path.delimiter).filter(Boolean);
  const bins = [
    path.join(home, ".local/bin"),
    path.join(home, ".bun/bin"),
    "/opt/homebrew/bin",
    path.join(home, ".cargo/bin"),
    "/usr/local/bin",
  ];
  return [...have, ...bins.filter((d) => !have.includes(d))].join(
    path.delimiter,
  );
}

/**
 * The folders directly in `root`, the last edited first, for the launch to open the newest. It is
 * read from disk each launch and never stored, so a deleted project is simply not there. A `root`
 * nobody has made yet is the first run, and has none.
 *
 * A board rewritten in place moves its own time and not its folder's, so "last edited" is the
 * newest of the project folder, its canvas folders and the files directly in those. It does not
 * go deeper, because an `assets/` folder can hold thousands of files.
 */
export function listProjects(root: string) {
  const inside = (dir: string) =>
    fs.existsSync(dir)
      ? fs
          .readdirSync(dir, { withFileTypes: true })
          .map((e) => ({ e, at: path.join(dir, e.name) }))
      : [];
  return inside(root)
    .filter(({ e }) => e.isDirectory() && !e.name.startsWith("."))
    .map(({ e, at: dir }) => {
      const canvases = inside(path.join(dir, "canvases"));
      const paths = [
        dir,
        ...canvases.map((c) => c.at),
        ...canvases.flatMap((c) =>
          c.e.isDirectory() ? inside(c.at).map((f) => f.at) : [],
        ),
      ];
      return {
        name: e.name,
        dir,
        at: Math.max(...paths.map((p) => fs.statSync(p).mtimeMs)),
      };
    })
    .sort((a, b) => b.at - a.at);
}

/**
 * `--port N` and one project directory, in either order, from
 * `open -a "Super Prototyping" --args ...`. Anything else that starts with a dash (Finder's
 * `-psn_…`, a flag this app does not know) is ignored.
 */
export function parseArgs(argv: string[]) {
  const at = argv.indexOf("--port");
  return {
    port: at < 0 ? undefined : Number(argv[at + 1]),
    dir: argv.find((a, i) => !a.startsWith("-") && (at < 0 || i !== at + 1)),
  };
}

/** Whether something accepts connections on the port. `_port_answers` in sp_canvas.py. */
export function portAnswers(port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.once("connect", () => (socket.destroy(), resolve(true)));
    socket.once("error", () => (socket.destroy(), resolve(false)));
  });
}

/** Resolves once the port answers; rejects after `timeoutMs`, or as soon as `signal` aborts. */
export async function waitForPort(
  port: number,
  timeoutMs: number,
  signal: AbortSignal,
) {
  const deadline = Date.now() + timeoutMs;
  while (!(await portAnswers(port))) {
    if (signal.aborted) throw new Error("server exited");
    if (Date.now() > deadline) throw new Error(`port ${port} never answered`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

/** A port nothing is listening on, from the OS. */
export function freePort() {
  return new Promise<number>((resolve, reject) => {
    const srv = net.createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
  });
}
