/**
 * The parts of the shell that do not need Electron: where the CLI keeps its state, and which
 * directories a GUI app has to add to PATH.
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
 * `--port N`, `--upgrade` and one project directory, in any order, from
 * `open -n -a "Super Prototyping" --args ...` (sp open, sp upgrade). Anything else that starts
 * with a dash (Finder's `-psn_…`, a flag this app does not know) is ignored.
 */
export function parseArgs(argv: string[]) {
  const at = argv.indexOf("--port");
  return {
    port: at < 0 ? undefined : Number(argv[at + 1]),
    dir: argv.find((a, i) => !a.startsWith("-") && (at < 0 || i !== at + 1)),
    upgrade: argv.includes("--upgrade"),
  };
}

/**
 * Where every link the app makes points through. `current` is repointed at the running app on
 * each launch, so a moved app, or a second copy in ~/Applications, heals on its next start, and
 * `sp uninstall` finds everything ours by what resolves through here. ego lite's
 * `~/.local/share/ego/active_version_dir`, for the same reasons.
 */
export function dataDir(home: string) {
  return path.join(home, ".local/share/super-prototyping");
}

/** The toolkit's commands, each a link to the one shim, `<plugin>/tools/bin/sp`, which runs the
 * command it was called as with `uv run`. */
export const COMMANDS = ["sp", "refkit", "artgen"];

/**
 * The agent homes whose `skills/` the app links into, when the home exists. Codex reads
 * `~/.agents/skills`, so it has no entry of its own, and `~/.codex` counts for `~/.agents`.
 */
export const AGENT_HOMES = [".claude", ".agents", ".hermes", ".factory"];

/** A copy of one of our skills: its frontmatter carries the marker every SKILL.md ships with. */
export function isOurCopy(dir: string) {
  try {
    const md = fs.readFileSync(path.join(dir, "SKILL.md"), "utf8");
    return /^---\r?\n[\s\S]*?^\s*managed-by:\s*super-prototyping\s*$[\s\S]*?^---/m.test(
      md,
    );
  } catch {
    return false;
  }
}

/**
 * Points `at` at `target`, by ego lite's rule: a link pointing elsewhere is repointed, a missing
 * one is made, and anything else is left alone unless `ours` says it is a copy we may replace.
 */
export function link(
  target: string,
  at: string,
  ours: (at: string) => boolean = () => false,
): "same" | "linked" | "kept" {
  const st = fs.lstatSync(at, { throwIfNoEntry: false });
  // A junction reads as a link too, and back with a trailing separator, hence the resolve.
  if (st?.isSymbolicLink()) {
    if (path.resolve(fs.readlinkSync(at)) === path.resolve(target))
      return "same";
    fs.unlinkSync(at);
  } else if (st) {
    if (!ours(at)) return "kept";
    fs.rmSync(at, { recursive: true });
  }
  fs.mkdirSync(path.dirname(at), { recursive: true });
  // A junction on Windows, which needs neither admin nor developer mode; ignored elsewhere.
  fs.symlinkSync(target, at, "junction");
  return "linked";
}

/**
 * Links this app into the machine: `current` at `pluginRoot`, the three commands onto
 * ~/.local/bin, and every skill into each agent home that exists. Returns one line per change,
 * for the log. Something the user put in one of those places is kept and reported. On Windows the
 * commands are not links, which a file there cannot be without admin: `uv tool install` makes
 * them (main.ts).
 */
export function linkInstall(
  pluginRoot: string,
  home: string,
  platform = process.platform,
) {
  const current = path.join(dataDir(home), "current");
  const changes: string[] = [];
  const note = (at: string, result: ReturnType<typeof link>) => {
    if (result !== "same") changes.push(`${result} ${at}`);
  };
  note(current, link(pluginRoot, current));
  for (const cmd of platform === "win32" ? [] : COMMANDS) {
    const at = path.join(home, ".local/bin", cmd);
    note(at, link(path.join(current, "tools/bin/sp"), at));
  }
  const skills = fs
    .readdirSync(path.join(pluginRoot, "skills"), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const agentHome of AGENT_HOMES) {
    const installed = [agentHome, ...(agentHome === ".agents" ? [".codex"] : [])];
    if (!installed.some((h) => fs.existsSync(path.join(home, h)))) continue;
    for (const name of skills) {
      const at = path.join(home, agentHome, "skills", name);
      note(at, link(path.join(current, "skills", name), at, isOurCopy));
    }
  }
  return changes;
}

/**
 * Adds ~/.local/bin to the login shell's PATH, once: only when no uncommented PATH line of the
 * rc file names it already. Returns the file written, or null. zsh and bash only; any other
 * shell is the user's to set up.
 */
export function ensurePathInRc(home: string, shell: string) {
  const rc = shell.endsWith("/zsh")
    ? ".zshrc"
    : shell.endsWith("/bash")
      ? ".bash_profile"
      : null;
  if (!rc) return null;
  const file = path.join(home, rc);
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const bin = `(\\$HOME|\\$\\{HOME\\}|~|${home.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})/\\.local/bin`;
  if (new RegExp(`^[^#\\n]*\\b(PATH=|path=\\().*${bin}`, "m").test(text))
    return null;
  fs.appendFileSync(
    file,
    `\n# Added by Super Prototyping: sp, refkit and artgen live here.\nexport PATH="$HOME/.local/bin:$PATH"\n`,
  );
  return file;
}

/**
 * Lets Codex run the three commands without asking each time, as ego lite does for its own. Only
 * when Codex is installed, and only the lines that are missing, which ego lite forgets to check.
 */
export function allowInCodex(home: string) {
  if (!fs.existsSync(path.join(home, ".codex"))) return [];
  const file = path.join(home, ".codex/rules/default.rules");
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const missing = COMMANDS.filter(
    (c) => !text.includes(`prefix_rule(pattern=["${c}"],`),
  );
  if (missing.length === 0) return [];
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(
    file,
    (text && !text.endsWith("\n") ? "\n" : "") +
      missing
        .map((c) => `prefix_rule(pattern=["${c}"], decision="allow")\n`)
        .join(""),
  );
  return missing;
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
