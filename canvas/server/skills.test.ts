import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { compareVersions, installSkills } from "./skills.ts";

function skillMd(name: string) {
  return `---
name: ${name}
description: The ${name} skill, for testing.
license: Apache-2.0
metadata:
  managed-by: super-prototyping
---

# ${name}
`;
}

/** A fake tree: a version and a few skills, each with a SKILL.md and one other file. */
function makeRoot(root: string, version: string, names: string[]) {
  fs.mkdirSync(path.join(root, "canvas"), { recursive: true });
  setVersion(root, version);
  for (const name of names) {
    const dir = path.join(root, "skills", name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "SKILL.md"), skillMd(name));
    fs.writeFileSync(path.join(dir, "notes.md"), `notes for ${name}, v1\n`);
  }
}

function setVersion(root: string, version: string) {
  fs.writeFileSync(
    path.join(root, "canvas/package.json"),
    JSON.stringify({ name: "prototyping-canvas", version }),
  );
}

let root: string;
let project: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "sp-skills-root-"));
  project = fs.mkdtempSync(path.join(os.tmpdir(), "sp-skills-project-"));
  makeRoot(root, "1.5.0", ["alpha", "beta"]);
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(project, { recursive: true, force: true });
});

describe("installSkills", () => {
  it("writes versioned copies and leaves the source untouched", () => {
    const result = installSkills(root, project, [".claude/skills"]);
    expect(result.written.sort()).toEqual([
      ".claude/skills/alpha",
      ".claude/skills/beta",
    ]);
    expect(result.skipped).toEqual([]);

    const copy = fs.readFileSync(
      path.join(project, ".claude/skills/alpha/SKILL.md"),
      "utf8",
    );
    expect(copy).toContain(
      "metadata:\n  managed-by: super-prototyping\n  version: 1.5.0",
    );
    // The other file in the folder rode along: a copy is the whole skill, not just its SKILL.md.
    expect(
      fs.readFileSync(
        path.join(project, ".claude/skills/alpha/notes.md"),
        "utf8",
      ),
    ).toBe("notes for alpha, v1\n");

    const source = fs.readFileSync(
      path.join(root, "skills/alpha/SKILL.md"),
      "utf8",
    );
    expect(source).not.toContain("version:");
  });

  it("is byte-identical on a second install", () => {
    installSkills(root, project, [".claude/skills"]);
    const before = fs.readFileSync(
      path.join(project, ".claude/skills/alpha/SKILL.md"),
    );
    installSkills(root, project, [".claude/skills"]);
    const after = fs.readFileSync(
      path.join(project, ".claude/skills/alpha/SKILL.md"),
    );
    expect(after.equals(before)).toBe(true);
  });

  it("rewrites a marked copy below the tree's version and leaves one at or above it alone", () => {
    installSkills(root, project, [".claude/skills"]);
    const skillMdPath = path.join(project, ".claude/skills/alpha/SKILL.md");
    fs.writeFileSync(
      skillMdPath,
      fs
        .readFileSync(skillMdPath, "utf8")
        .replace("version: 1.5.0", "version: 9.9.9"),
    );
    expect(installSkills(root, project, [".claude/skills"]).written).toEqual(
      [],
    );
    expect(fs.readFileSync(skillMdPath, "utf8")).toContain("version: 9.9.9");

    setVersion(root, "10.0.0");
    expect(
      installSkills(root, project, [".claude/skills"]).written.sort(),
    ).toEqual([".claude/skills/alpha", ".claude/skills/beta"]);
    expect(fs.readFileSync(skillMdPath, "utf8")).toContain("version: 10.0.0");
  });

  it("gives two dirs identical content", () => {
    installSkills(root, project, [".claude/skills", ".agents/skills"]);
    const a = fs.readFileSync(
      path.join(project, ".claude/skills/alpha/SKILL.md"),
      "utf8",
    );
    const b = fs.readFileSync(
      path.join(project, ".agents/skills/alpha/SKILL.md"),
      "utf8",
    );
    expect(a).toBe(b);
  });

  it("skips an existing unmarked folder and reports it, and leaves it alone on an upgrade", () => {
    // The user's own folder, named like a real skill but never written by us.
    fs.mkdirSync(path.join(project, ".claude/skills/alpha"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(project, ".claude/skills/alpha/SKILL.md"),
      "---\nname: alpha\ndescription: mine\n---\nmy own notes\n",
    );
    const result = installSkills(root, project, [".claude/skills"]);
    expect(result.skipped).toEqual([".claude/skills/alpha"]);
    expect(result.written).toEqual([".claude/skills/beta"]);
    const untouched = fs.readFileSync(
      path.join(project, ".claude/skills/alpha/SKILL.md"),
      "utf8",
    );
    expect(untouched).toBe(
      "---\nname: alpha\ndescription: mine\n---\nmy own notes\n",
    );

    setVersion(root, "9.9.9");
    installSkills(root, project, [".claude/skills"]);
    expect(
      fs.readFileSync(
        path.join(project, ".claude/skills/alpha/SKILL.md"),
        "utf8",
      ),
    ).toBe("---\nname: alpha\ndescription: mine\n---\nmy own notes\n");
  });

  it("takes out the copy a renamed skill left behind, and only a marked one", () => {
    installSkills(root, project, [".claude/skills"]);
    // What the tree shipped last release: a marked copy under a name it no longer has.
    const gone = path.join(project, ".claude/skills/old-alpha");
    fs.cpSync(path.join(project, ".claude/skills/alpha"), gone, {
      recursive: true,
    });
    // And the user's own folder, under a name we have never shipped.
    fs.mkdirSync(path.join(project, ".claude/skills/mine"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(project, ".claude/skills/mine/SKILL.md"),
      "---\nname: mine\ndescription: mine\n---\nmy own notes\n",
    );

    const result = installSkills(root, project, [".claude/skills"]);
    expect(result.removed).toEqual([".claude/skills/old-alpha"]);
    expect(result.written).toEqual([]);
    expect(fs.existsSync(gone)).toBe(false);
    expect(fs.readdirSync(path.join(project, ".claude/skills")).sort()).toEqual(
      ["alpha", "beta", "mine"],
    );
    // Nothing is left to remove on the next run.
    expect(installSkills(root, project, [".claude/skills"]).removed).toEqual(
      [],
    );
  });

  it("throws on a dir that fails the pattern, before writing anything", () => {
    expect(() =>
      installSkills(root, project, [".claude/skills", "not-a-skill-dir"]),
    ).toThrow();
    expect(fs.existsSync(path.join(project, ".claude"))).toBe(false);
  });

  it("leaves the source byte-identical when the destination is a symlink to it", () => {
    fs.mkdirSync(path.join(project, ".claude"), { recursive: true });
    fs.symlinkSync(
      path.join(root, "skills"),
      path.join(project, ".claude/skills"),
    );
    const before = fs.readFileSync(path.join(root, "skills/alpha/SKILL.md"));

    const result = installSkills(root, project, [".claude/skills"]);
    expect(result.written).toEqual([]);
    expect(result.skipped.sort()).toEqual([
      ".claude/skills/alpha",
      ".claude/skills/beta",
    ]);
    expect(
      fs.readFileSync(path.join(root, "skills/alpha/SKILL.md")).equals(before),
    ).toBe(true);

    setVersion(root, "9.9.9");
    installSkills(root, project, [".claude/skills"]);
    expect(
      fs.readFileSync(path.join(root, "skills/alpha/SKILL.md")).equals(before),
    ).toBe(true);
  });
});

describe("installSkills over an earlier install", () => {
  it("overwrites a copy older than the tree and updates its marker", () => {
    installSkills(root, project, [".claude/skills"]);
    // The tree moves on: a new version, and a real change inside the skill.
    setVersion(root, "1.6.0");
    fs.writeFileSync(
      path.join(root, "skills/alpha/notes.md"),
      "notes for alpha, v2\n",
    );

    installSkills(root, project, [".claude/skills"]);

    const copy = fs.readFileSync(
      path.join(project, ".claude/skills/alpha/SKILL.md"),
      "utf8",
    );
    expect(copy).toContain("version: 1.6.0");
    // The whole folder was replaced, not just the marker rewritten.
    expect(
      fs.readFileSync(
        path.join(project, ".claude/skills/alpha/notes.md"),
        "utf8",
      ),
    ).toBe("notes for alpha, v2\n");
  });

  it("leaves a copy marked higher than the tree alone", () => {
    installSkills(root, project, [".claude/skills"]);
    const skillMdPath = path.join(project, ".claude/skills/alpha/SKILL.md");
    fs.writeFileSync(
      skillMdPath,
      fs
        .readFileSync(skillMdPath, "utf8")
        .replace("version: 1.5.0", "version: 9.9.9"),
    );
    const before = fs.readFileSync(skillMdPath);
    // The source changes too, so a wrongly-triggered overwrite would be visible.
    fs.writeFileSync(
      path.join(root, "skills/alpha/notes.md"),
      "notes for alpha, v2\n",
    );

    installSkills(root, project, [".claude/skills"]); // the tree is still 1.5.0

    expect(fs.readFileSync(skillMdPath).equals(before)).toBe(true);
    expect(
      fs.readFileSync(
        path.join(project, ".claude/skills/alpha/notes.md"),
        "utf8",
      ),
    ).toBe("notes for alpha, v1\n");
  });

  it("keeps a skill a newer app installed that this tree has not heard of", () => {
    const newer = path.join(project, ".claude/skills/gamma");
    fs.mkdirSync(newer, { recursive: true });
    fs.writeFileSync(
      path.join(newer, "SKILL.md"),
      skillMd("gamma").replace(
        "managed-by: super-prototyping",
        "managed-by: super-prototyping\n  version: 9.9.9",
      ),
    );

    const result = installSkills(root, project, [".claude/skills"]); // the tree is still 1.5.0

    expect(result.removed).toEqual([]);
    expect(fs.existsSync(newer)).toBe(true);
  });
});

describe("compareVersions", () => {
  it("orders a prerelease below its release, and both below the next one", () => {
    expect(compareVersions("1.5.0-rc.1", "1.5.0")).toBeLessThan(0);
    expect(compareVersions("1.5.0", "1.6.0")).toBeLessThan(0);
    expect(compareVersions("1.6.0", "1.5.0-rc.1")).toBeGreaterThan(0);
    expect(compareVersions("1.5.0-rc.9", "1.5.0-rc.10")).toBeLessThan(0);
  });

  it("treats an unparsable version as the lowest", () => {
    expect(compareVersions("not-a-version", "1.0.0")).toBeLessThan(0);
    expect(compareVersions("1.0.0", "not-a-version")).toBeGreaterThan(0);
  });

  it("is zero for equal versions", () => {
    expect(compareVersions("1.5.0", "1.5.0")).toBe(0);
  });
});

describe("marker", () => {
  it("is required: a shipped SKILL.md without it is a packaging mistake, not a user's file", () => {
    fs.writeFileSync(
      path.join(root, "skills/alpha/SKILL.md"),
      "---\nname: alpha\ndescription: x\n---\n",
    );
    expect(() => installSkills(root, project, [".claude/skills"])).toThrow(
      /managed-by/,
    );
  });

  it("ships in every real skill", () => {
    const skills = path.resolve(import.meta.dirname, "../../skills");
    for (const name of fs
      .readdirSync(skills, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)) {
      expect(
        fs.readFileSync(path.join(skills, name, "SKILL.md"), "utf8"),
      ).toMatch(
        /^---\n[\s\S]*?\nmetadata:\n  managed-by: super-prototyping\n[\s\S]*?---\n/,
      );
    }
  });

  it("gets the version under it, inside the frontmatter, after name and description", () => {
    installSkills(root, project, [".claude/skills"]);
    const content = fs.readFileSync(
      path.join(project, ".claude/skills/alpha/SKILL.md"),
      "utf8",
    );
    const lines = content.split("\n");
    expect(lines[0]).toBe("---");
    const close = lines.indexOf("---", 1);
    expect(close).toBeGreaterThan(0);
    const fm = lines.slice(1, close);
    const idxName = fm.findIndex((l) => l.startsWith("name:"));
    const idxDesc = fm.findIndex((l) => l.startsWith("description:"));
    const idxMeta = fm.findIndex((l) => l.trim() === "metadata:");
    expect(idxName).toBeGreaterThanOrEqual(0);
    expect(idxDesc).toBeGreaterThan(idxName);
    expect(idxMeta).toBeGreaterThan(idxDesc);
    expect(fm[idxMeta + 1]).toBe("  managed-by: super-prototyping");
    expect(fm[idxMeta + 2]).toBe("  version: 1.5.0");
    // The body, after the frontmatter, is unaffected by where the marker sits in it.
    expect(lines.slice(close + 1).join("\n")).toContain(`# alpha`);
  });
});
