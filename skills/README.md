# skills

The three skills this plugin ships, one directory each, in the Agent Skills
format (`SKILL.md` with YAML frontmatter, plus `references/` loaded on
demand). This is the real directory; `.claude/skills/` and `.agents/skills/`
are symlinks to it, so this checkout loads exactly what an install does.

| Skill | Use it for |
|---|---|
| `clone-prototype` | Copying a real app's screens: grid the reference, sample colours visually, name the type face, derive one measured token block, generate the artboards, verify by re-rendering, park the reference underneath. |
| `new-ui-mock` | Designing new screens with no reference, built on existing tokens. |
| `prototype-canvas` | Running and operating the canvas: boards, `layout.json`, the `window.snapCanvas` bridge, annotated-screenshot review, the force-refresh. |

Rules for editing one:

- A skill's `name` in frontmatter must equal its directory name. Keep
  `description` under 1024 characters and free of `<` or `>`.
- Keep `SKILL.md` under ~500 lines. Depth goes in `references/`, behind a
  two-line pointer that says what is in there and when to read it.
- **Never write a path to this repo.** A skill runs inside someone else's
  project. Call the tools by name (`refkit`, `artgen`, `sp-canvas`), and when
  a skill needs a file that ships with the plugin, reach it through
  `KIT="$(sp-canvas root)"`. `git rev-parse --show-toplevel` finds the user's
  repo, not this one.
