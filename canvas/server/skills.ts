/**
 * Copying the plugin's skills into a project, and keeping copies there current.
 *
 * A copy is a whole `skills/<name>` folder written under a project-relative dot directory
 * (`.claude/skills`, `.agents/skills`, …), with two things changed in its `SKILL.md`: a
 * `metadata` marker recording which tree and version wrote it, and the toolkit install line
 * pinned to that version's tag. The marker is what makes a copy ours. Anything without it is the
 * user's own file, in a folder that happens to share a skill's name, and is never touched. A marked
 * copy is a generated file, so an upgrade overwrites the whole folder rather than diffing it, and a
 * customization survives only by dropping the marker (see `docs/`).
 */
import fs from "node:fs";
import path from "node:path";

/** A project-relative skill directory. */
const SKILL_DIR = /^\.[\w-]+\/skills$/;

/** Frontmatter at the very top of the file only. A block starting anywhere else is prose. */
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;

const PIN_TARGET = "super-prototyping#subdirectory=tools";

/** `<root>/.claude-plugin/plugin.json`'s `version`, the number a copy is marked and pinned with. */
export function pluginVersion(root: string): string {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".claude-plugin/plugin.json"), "utf8"));
  if (typeof manifest.version !== "string" || !manifest.version) {
    throw new Error(`${root}/.claude-plugin/plugin.json has no version`);
  }
  return manifest.version;
}

/**
 * Semver-ish ordering, negative/zero/positive like `Array#sort`'s comparator. A prerelease
 * sorts below its release (`1.5.0-rc.1 < 1.5.0`), and a version this cannot parse sorts below
 * every real one. A marker in that shape is still a marker, and refresh's job is to bring it
 * forward, not to leave it alone because it cannot be read.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const m = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/.exec(v);
    return m ? { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ?? null } : null;
  };
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return (pa ? 1 : 0) - (pb ? 1 : 0);
  for (const part of ["major", "minor", "patch"] as const) {
    if (pa[part] !== pb[part]) return pa[part] - pb[part];
  }
  if (pa.pre === pb.pre) return 0;
  if (pa.pre === null || pb.pre === null) return pa.pre === null ? 1 : -1;
  return pa.pre < pb.pre ? -1 : pa.pre > pb.pre ? 1 : 0;
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
  return /metadata:\r?\n\s*managed-by:\s*super-prototyping\r?\n\s*version:\s*(\S+)/.exec(fm)?.[1] ?? null;
}

/**
 * Writes `<root>/skills/<name>` over `destDir`, whatever was there first, then marks and pins
 * the copy's `SKILL.md`. The marker goes in as the last lines of the existing frontmatter
 * block, after `name` and `description` and everything else a parser already knows how to
 * read; the pin is a plain substring swap wherever the install line mentions this repo, which
 * today is once, in the body.
 */
function writeCopy(root: string, name: string, destDir: string, version: string): void {
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  fs.cpSync(path.join(root, "skills", name), destDir, { recursive: true });
  const skillMd = path.join(destDir, "SKILL.md");
  const content = fs.readFileSync(skillMd, "utf8");
  const m = FRONTMATTER.exec(content);
  if (!m) throw new Error(`${skillMd} has no frontmatter to mark`);
  const marked =
    content.slice(0, m.index) +
    `---\n${m[1]}\nmetadata:\n  managed-by: super-prototyping\n  version: ${version}\n---\n` +
    content.slice(m[0].length);
  fs.writeFileSync(
    skillMd,
    marked.replaceAll(PIN_TARGET, `super-prototyping@super-prototyping--v${version}#subdirectory=tools`),
  );
}

/** Every marked copy under a project's dot directories: `<project>/<dot dir>/skills/<name>/SKILL.md`. */
export function installedSkills(projectDir: string): { dir: string; name: string; version: string }[] {
  const found: { dir: string; name: string; version: string }[] = [];
  for (const top of fs.readdirSync(projectDir, { withFileTypes: true })) {
    if (!top.isDirectory() || !SKILL_DIR.test(`${top.name}/skills`)) continue;
    const skillsDir = path.join(projectDir, top.name, "skills");
    if (!fs.statSync(skillsDir, { throwIfNoEntry: false })?.isDirectory()) continue;
    for (const skill of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!skill.isDirectory()) continue;
      const version = markedVersion(path.join(skillsDir, skill.name, "SKILL.md"));
      if (version) found.push({ dir: `${top.name}/skills`, name: skill.name, version });
    }
  }
  return found;
}

/**
 * Writes every skill in `<root>/skills` into each of `dirs`, marked and pinned to `root`'s
 * version. A destination that already holds a marked copy is replaced whole when that copy is
 * older, and left alone when it is at the tree's version or past it, so someone else's newer commit
 * is never undone, and the same answer on every launch writes nothing. One that exists without a
 * marker is the user's own file, left alone and reported back as skipped.
 */
export function installSkills(
  root: string,
  projectDir: string,
  dirs: string[],
): { written: string[]; skipped: string[] } {
  for (const dir of dirs) {
    // Checked up front, before anything is written, so that a bad dir among several good ones does
    // not leave the good ones half done.
    if (!SKILL_DIR.test(dir)) throw new Error(`bad skill dir: ${dir}`);
  }
  const version = pluginVersion(root);
  const skillsRoot = path.join(root, "skills");
  const names = fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(skillsRoot, d.name, "SKILL.md")))
    .map((d) => d.name);

  const written: string[] = [];
  const skipped: string[] = [];
  for (const dir of dirs) {
    for (const name of names) {
      const destDir = path.join(projectDir, dir, name);
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

/**
 * Brings every marked copy in a project up to the tree's version, called once when a server
 * starts. It touches only the copies that are there. A copy at or ahead of the tree (someone else's
 * newer commit) is left alone, and so is a skill that is missing, because a folder someone deleted
 * on purpose must stay deleted, and refresh cannot tell that from one never installed. `projectDir`
 * is null when the server was started with no project, which is `node dist/server.mjs` run by hand,
 * and there is then nothing to refresh.
 */
export function refresh(projectDir: string | null, root: string): void {
  if (projectDir === null) return;
  const version = pluginVersion(root);
  for (const copy of installedSkills(projectDir)) {
    if (compareVersions(copy.version, version) >= 0) continue;
    writeCopy(root, copy.name, path.join(projectDir, copy.dir, copy.name), version);
  }
}
