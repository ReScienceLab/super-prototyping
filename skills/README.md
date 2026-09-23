# skills

The five skills the app ships and links into each agent, one directory each, in the Agent Skills
format (`SKILL.md` with YAML frontmatter, plus `references/` loaded on
demand). This is the real directory; `.claude/skills/` and `.agents/skills/`
are symlinks to it, so this checkout loads exactly what an install does.
Every `SKILL.md` carries `metadata: managed-by: super-prototyping` in its
frontmatter. It is how the app and the chat panel tell a copy of theirs from
a user's own folder of the same name, so keep it.

| Skill | Use it for |
|---|---|
| `clone-prototype` | Copying a real app's screens: grid the reference, sample colours visually, name the type face, derive one measured token block, generate the artboards, verify by re-rendering, park the reference underneath. |
| `new-ui-mock` | Designing new screens with no reference, built on existing tokens. |
| `prototype-canvas` | Running and operating the canvas: boards, `layout.json`, the `window.snapCanvas` bridge, annotated-screenshot review, the force-refresh. |
| `define-product` | Interviewing the user about what their product is for, and writing it down as the project's `PRD.md`, which the canvas shows as a tab. |
| `brand-kit` | Collecting a product's own brand and promotional material -- press kit, store listings, social, newsroom -- and turning it into the `images` rows of a canvas folder. |

Rules for editing one:

- A skill's `name` in frontmatter must equal its directory name. Keep
  `description` under 1024 characters and free of `<` or `>`.
- Keep `SKILL.md` under ~500 lines. Depth goes in `references/`, behind a
  two-line pointer that says what is in there and when to read it.
- **This file gets no frontmatter.** Pi walks `skills/` recursively and counts
  a top-level `.md` as a skill when it carries frontmatter with a
  `description`, so adding one here would install a sixth skill.
- **Never write a path to this repo.** A skill runs inside someone else's
  project. Call the tools by name (`refkit`, `artgen`, `sp`), and when
  a skill needs a file that ships with the app, reach it through
  `KIT="$(sp root)"`. `git rev-parse --show-toplevel` finds the user's
  repo, not this one.
