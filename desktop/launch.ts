/**
 * The parts of the shell that do not need Electron: where the CLI keeps its state, which
 * directories a GUI app has to add to PATH, and which agent reads skills from where.
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
 * all invisible without these.
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
  return [...have, ...bins.filter((d) => !have.includes(d))].join(path.delimiter);
}

/** The first `name` on `PATH` that is a file, or null. What `which` does, without a shell. */
export function findOnPath(name: string, PATH: string) {
  for (const dir of PATH.split(path.delimiter)) {
    const file = path.join(dir, name);
    if (dir && fs.statSync(file, { throwIfNoEntry: false })?.isFile()) return file;
  }
  return null;
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

export type Agent = {
  id: string;
  name: string;
  /** Project-relative, matches /^\.[\w-]+\/skills$/: what choosing this row on the startup page writes to. */
  dir: string;
  /** Listed first on the startup page, tagged as the pair to reach for. */
  recommended?: true;
  /** Executable names that count as "installed" when any is found on PATH. */
  bins: string[];
  /** Config directories, relative to home, that count the same way. */
  homeDirs: string[];
  /** A macOS app bundle name under /Applications or ~/Applications, if one exists. */
  app?: string;
  /** Shown once after install, alongside this agent's name, when it has something to say. */
  note?: string;
};

/**
 * One row per agent from the research behind docs/2026-09-20-desktop-onboarding-and-skills.md.
 * `.agents/skills` is the directory several agents read unconditionally, so it is the default;
 * the five exceptions here (Claude Code, Cline, CodeBuddy, Kiro, Trae) never read it at all, so
 * each gets its own directory instead of a second copy nobody asked for.
 */
export const AGENTS: Agent[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    recommended: true,
    dir: ".claude/skills",
    bins: ["claude"],
    homeDirs: [".claude"],
    app: "Claude.app",
    note: "A user-level ~/.claude/skills folder with the same name overrides the project one.",
  },
  {
    id: "codex",
    name: "Codex",
    recommended: true,
    dir: ".agents/skills",
    bins: ["codex"],
    homeDirs: [".codex"],
  },
  {
    id: "cursor",
    name: "Cursor",
    dir: ".agents/skills",
    bins: ["cursor"],
    homeDirs: [".cursor"],
    app: "Cursor.app",
    note: 'Its CLI binary is named "agent", which also names Grok\'s CLI, so detection does not use it.',
  },
  {
    id: "devin",
    name: "Devin",
    dir: ".agents/skills",
    bins: ["devin"],
    homeDirs: [".config/devin"],
    app: "Devin.app",
    note: 'Cloud Devin likely only sees committed files; its docs only say "indexed repos".',
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    dir: ".agents/skills",
    bins: ["gemini"],
    homeDirs: [".gemini"],
    note: "The project must be marked trusted first.",
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    dir: ".agents/skills",
    bins: ["copilot"],
    homeDirs: [".copilot"],
  },
  {
    id: "opencode",
    name: "OpenCode",
    dir: ".agents/skills",
    bins: ["opencode"],
    homeDirs: [".config/opencode"],
  },
  {
    id: "amp",
    name: "Amp",
    dir: ".agents/skills",
    bins: ["amp"],
    homeDirs: [".config/amp"],
    app: "Amp.app",
    note: "User-level copies in three directories override the project one; Orbs only sees committed files.",
  },
  {
    id: "cline",
    name: "Cline",
    dir: ".cline/skills",
    bins: ["cline"],
    homeDirs: [".cline"],
    app: "Cline.app",
    note: "A global copy with the same name overrides the project one.",
  },
  {
    id: "roo-code",
    name: "Roo Code",
    dir: ".agents/skills",
    bins: ["roo"],
    homeDirs: [".roo"],
  },
  {
    id: "kilo-code",
    name: "Kilo Code",
    dir: ".agents/skills",
    bins: ["kilo"],
    homeDirs: [".kilo"],
  },
  {
    id: "hermes",
    name: "Hermes",
    dir: ".agents/skills",
    bins: ["hermes"],
    homeDirs: [".hermes"],
    note: "The project must be a git repo, and needs one `hermes skills trust` run.",
  },
  {
    id: "pi",
    name: "Pi",
    dir: ".agents/skills",
    bins: ["pi"],
    homeDirs: [".pi/agent"],
    note: "The project must be marked trusted first.",
  },
  {
    id: "goose",
    name: "Goose",
    dir: ".agents/skills",
    bins: ["goose"],
    homeDirs: [".config/goose"],
    app: "Goose.app",
  },
  {
    id: "factory-droid",
    name: "Factory Droid",
    dir: ".agents/skills",
    bins: ["droid"],
    homeDirs: [".factory"],
  },
  {
    id: "junie",
    name: "Junie",
    dir: ".agents/skills",
    bins: ["junie"],
    homeDirs: [".junie"],
    note: "The project must be marked trusted first.",
  },
  {
    id: "antigravity",
    name: "Antigravity",
    dir: ".agents/skills",
    bins: ["agy"],
    homeDirs: [".gemini/config"],
    app: "Antigravity.app",
  },
  {
    id: "qwen-code",
    name: "Qwen Code",
    dir: ".agents/skills",
    bins: ["qwen"],
    homeDirs: [".qwen"],
  },
  {
    id: "trae",
    name: "Trae",
    dir: ".trae/skills",
    bins: [],
    homeDirs: [".trae", ".trae-cn"],
    note: "Only .trae/skills is written; turning on .agents/skills needs a manual toggle in project settings.",
  },
  {
    id: "codebuddy",
    name: "CodeBuddy",
    dir: ".codebuddy/skills",
    bins: ["codebuddy", "cbc"],
    homeDirs: [".codebuddy"],
    note: "Not installed on this machine; detection follows its documentation.",
  },
  {
    id: "kiro",
    name: "Kiro",
    dir: ".kiro/skills",
    bins: ["kiro-cli"],
    homeDirs: [".kiro"],
    note: "Not installed on this machine; skill names with underscores are silently dropped, but none of ours have one.",
  },
];

/**
 * What each agent's presence on this machine rests on, in the words the startup page shows
 * beside its row: a binary on PATH, a config directory under home, a macOS app. An empty list
 * is an agent not found. Nothing here writes anything.
 */
export function detectAgents(probe: {
  bin(name: string): boolean;
  dir(relToHome: string): boolean;
  app(name: string): boolean;
}): Record<string, string[]> {
  const found: Record<string, string[]> = {};
  for (const a of AGENTS) {
    found[a.id] = [
      ...a.bins.filter((b) => probe.bin(b)).map((b) => `${b} on PATH`),
      ...a.homeDirs.filter((d) => probe.dir(d)).map((d) => `~/${d}`),
      ...(a.app !== undefined && probe.app(a.app) ? [a.app] : []),
    ];
  }
  return found;
}

/** The sorted, deduped skills directories the chosen agents read from. */
