/**
 * Copying the plugin's skills to where the chat panel's agent finds them, and keeping the copy
 * current. That is once for every session, in `<projects dir>/.workspaces`, above each session's
 * own folder (agent.ts), and never into a project.
 *
 * A copy is a whole `skills/<name>` folder written under a relative dot directory
 * (`.claude/skills`, `.agents/skills`, …), with one thing changed in its `SKILL.md`: the
 * version of the tree that wrote it, added under the `managed-by: super-prototyping` marker every
 * skill ships with. The marker is what makes a copy ours. Anything without it is the
 * user's own file, in a folder that happens to share a skill's name, and is never touched. A marked
 * copy is a generated file, so an upgrade overwrites the whole folder rather than diffing it, and a
 * customization survives only by dropping the marker (see `docs/`).
 */
import fs from "node:fs";
import path from "node:path";
import type { AgentId } from "../src/agents.ts";

/** A relative skill directory. */
const SKILL_DIR = /^\.[\w-]+\/skills$/;

/**
 * Where each agent the chat panel runs reads skills from, relative to its working directory.
 * Codex reads `.agents/skills`, which most agents share; Claude Code does not read it, so it gets
 * its own. docs/2026-09-20-desktop-onboarding-and-skills.md has the directory and the caveats for
 * nineteen more, for when the panel runs a third.
 */
export const AGENT_SKILLS: Record<AgentId, string> = {
  claude: ".claude/skills",
  codex: ".agents/skills",
};

/** Frontmatter at the very top of the file only. A block starting anywhere else is prose. */
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

/** The marker line in every shipped `SKILL.md`'s `metadata`, which a copy's version goes under. */
const MARKER = /^(\s*)managed-by:\s*super-prototyping\s*$/m;

/**
 * `<root>/canvas/package.json`'s `version`, the number a copy is marked with. That file ships in
 * the app and every checkout alike, and .version-bump.json moves it with the release.
 */
export function treeVersion(root: string): string {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, "canvas/package.json"), "utf8"),
  );
  if (typeof pkg.version !== "string" || !pkg.version) {
    throw new Error(`${root}/canvas/package.json has no version`);
  }
  return pkg.version;
}

/**
 * Semver-ish ordering, negative/zero/positive like `Array#sort`'s comparator. A prerelease
 * sorts below its release (`1.5.0-rc.1 < 1.5.0`), and a version this cannot parse sorts below
 * every real one. A marker in that shape is still a marker, and an install's job is to bring it
 * forward, not to leave it alone because it cannot be read.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const m = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/.exec(v);
    return m
      ? { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ?? null }
      : null;
  };
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return (pa ? 1 : 0) - (pb ? 1 : 0);
  for (const part of ["major", "minor", "patch"] as const) {
    if (pa[part] !== pb[part]) return pa[part] - pb[part];
  }
  if (pa.pre === pb.pre) return 0;
  if (pa.pre === null || pb.pre === null) return pa.pre === null ? 1 : -1;
  return pa.pre.localeCompare(pb.pre, undefined, { numeric: true }); // rc.9 is below rc.10
}

/** The version in the marker this module wrote into a `SKILL.md`, or null if it was never ours. */
function markedVersion(skillMd: string): string | null {
  let content: string;
  try {
    content = fs.readFileSync(skillMd, "utf8");
  } catch {
    return null; // no such file: an empty folder, or not a copy at all
  }
  const fm = FRONTMATTER.exec(content)?.[1];
  if (!fm) return null;
  return (
    /metadata:\r?\n\s*managed-by:\s*super-prototyping\r?\n\s*version:\s*(\S+)/.exec(
      fm,
    )?.[1] ?? null
  );
}

/**
 * Writes `<root>/skills/<name>` over `destDir`, whatever was there first, then puts `version`
 * under the marker in the copy's frontmatter.
 */
function writeCopy(
  root: string,
  name: string,
  destDir: string,
  version: string,
): void {
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  fs.cpSync(path.join(root, "skills", name), destDir, { recursive: true });
  const skillMd = path.join(destDir, "SKILL.md");
  const content = fs.readFileSync(skillMd, "utf8");
  const m = FRONTMATTER.exec(content);
  if (!m || !MARKER.test(m[1]))
    throw new Error(`${skillMd} has no managed-by marker to version`);
  const fm = m[1].replace(MARKER, (line, indent) => `${line}\n${indent}version: ${version}`);
  fs.writeFileSync(
    skillMd,
    content.slice(0, m.index) + `---\n${fm}\n---\n` + content.slice(m[0].length),
  );
}

/**
 * Writes every skill in `<root>/skills` into each of `dirs`, marked with `root`'s version. A destination that already holds a marked copy is replaced whole when that copy is
 * older, and left alone when it is at the tree's version or past it, so a newer app's copy is never
 * undone, and every run after the first writes nothing. One that exists without a
 * marker is the user's own file, left alone and reported back as skipped.
 */
export function installSkills(
  root: string,
  into: string,
  dirs: string[],
): { written: string[]; skipped: string[] } {
  for (const dir of dirs) {
    // Checked up front, before anything is written, so that a bad dir among several good ones does
    // not leave the good ones half done.
    if (!SKILL_DIR.test(dir)) throw new Error(`bad skill dir: ${dir}`);
  }
  const version = treeVersion(root);
  const skillsRoot = path.join(root, "skills");
  const names = fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        fs.existsSync(path.join(skillsRoot, d.name, "SKILL.md")),
    )
    .map((d) => d.name);

  const written: string[] = [];
  const skipped: string[] = [];
  for (const dir of dirs) {
    for (const name of names) {
      const destDir = path.join(into, dir, name);
      if (fs.existsSync(destDir)) {
        const existing = markedVersion(path.join(destDir, "SKILL.md"));
        if (existing === null) {
          skipped.push(`${dir}/${name}`);
          continue;
        }
        if (compareVersions(existing, version) >= 0) continue;
      }
      writeCopy(root, name, destDir, version);
      written.push(`${dir}/${name}`);
    }
  }
  return { written, skipped };
}
