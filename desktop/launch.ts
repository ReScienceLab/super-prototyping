/**
 * The parts of the shell that do not need Electron: where the CLI keeps its state, which
 * directories a GUI app has to add to PATH, and what to say when the toolkit is not there.
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
 * `<state>/super-prototyping`, exactly as `_dirs()` in tools/sp_canvas.py computes it, so the
 * shell's own files sit beside the CLI's pidfile and log and `sp clean` removes both.
 */
export function stateDir(env: NodeJS.ProcessEnv, home: string) {
  if (env.SUPER_PROTOTYPING_HOME) return path.join(untilde(env.SUPER_PROTOTYPING_HOME, home), "state");
  return path.join(env.XDG_STATE_HOME || path.join(home, ".local/state"), "super-prototyping");
}

/**
 * Where user-installed CLIs live when the login shell is not around to say. A GUI app on macOS
 * starts with `/usr/bin:/bin:/usr/sbin:/sbin`, so `uv`, `sp`, `claude` and `codex` are
 * all invisible without these. The dialog that says "not found" lists the same directories.
 */
export function toolchainBins(home: string) {
  return [
    path.join(home, ".local/bin"),
    path.join(home, ".bun/bin"),
    "/opt/homebrew/bin",
    path.join(home, ".cargo/bin"),
    "/usr/local/bin",
  ];
}

export function augmentedPath(env: NodeJS.ProcessEnv, home: string) {
  const have = (env.PATH ?? "").split(path.delimiter).filter(Boolean);
  const add = toolchainBins(home).filter((d) => !have.includes(d));
  return [...have, ...add].join(path.delimiter);
}

/** The first `name` on `PATH` that is a file, or null. What `which` does, without a shell. */
export function findOnPath(name: string, PATH: string) {
  for (const dir of PATH.split(path.delimiter)) {
    const file = path.join(dir, name);
    if (dir && fs.statSync(file, { throwIfNoEntry: false })?.isFile()) return file;
  }
  return null;
}

/** The toolkit of the same release as this app. A tarball, so it needs no git on the machine. */
export function installCommand(version: string) {
  return (
    `uv tool install "super-prototyping-tools @ https://github.com/ReScienceLab/super-prototyping/` +
    `archive/refs/tags/super-prototyping--v${version}.tar.gz#subdirectory=tools"`
  );
}

/** The first-launch message: what is missing, the one line that installs it, where it was sought. */
export function missingToolkitMessage(opts: { uv: boolean; version: string; bins: string[] }) {
  return [
    opts.uv
      ? "The super-prototyping toolkit (sp, refkit) is not installed. Install it with:"
      : "uv is not installed, so neither is the super-prototyping toolkit. Install uv from " +
        "https://docs.astral.sh/uv/ and then the toolkit with:",
    "",
    installCommand(opts.version),
    "",
    "The canvas still opens and shows the boards; the agent and screenshot features need the toolkit.",
    "",
    "Looked for it on PATH and in:",
    ...opts.bins.map((d) => `  ${d}`),
  ].join("\n");
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
export async function waitForPort(port: number, timeoutMs: number, signal: AbortSignal) {
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
