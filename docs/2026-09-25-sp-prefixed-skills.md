# Every skill is named sp-

2026-09-25. The five shipped skills were `clone-prototype`, `new-ui-mock`,
`prototype-canvas`, `define-product` and `brand-kit`. They are now
`sp-clone-prototype`, `sp-new-ui-mock`, `sp-canvas`, `sp-define-product` and
`sp-brand-kit`, and `sp-scene-video` ships with the prefix from its first
commit. This note is why, and what the rename has to carry with it.

## Why

A skill directory is a flat namespace an agent shares between every source it
installs from: `~/.claude/skills/<name>`, one entry per name, whoever made it.
The old names were the plainest words for what the skills do, which is exactly
what makes them likely to collide — "define product" and "brand kit" are
things a team writes a skill about. A collision is not a warning, either. The
app links its copy in, and `isOurCopy` (desktop/launch.ts) keeps a user's own
folder of the same name rather than replacing it, so the result is that the
app's skill silently never installs, and the user runs something else under
the name they read in our README.

The prefix also reads in the one place a user types a skill name. `/brand-kit`
says nothing about where it came from; `/sp-brand-kit` names the app.

One name lost a word as well as gaining the prefix. `sp-prototype-canvas`
spends its first half on something nothing here is not — every board on the
canvas is a prototype — and the skill is mostly the `sp canvas` command, which
is what the app already calls it. `sp-canvas`, then.

Two alternatives were not taken. Nesting under one `super-prototyping/`
directory is not a thing the format supports: Claude Code and Codex both read
one level of directories. A single omnibus skill would have been one name, but
the descriptions are what route a request to the right one, and five sharp
descriptions route better than one long one.

## What the rename has to carry

- **The dangling links.** An install that has the old names keeps them:
  `linkInstall` only creates the links it finds names for, so
  `~/.claude/skills/clone-prototype` stays, pointing into a
  `current/skills/clone-prototype` that no longer exists, and the agent lists
  it as a broken skill. The app now takes those out on launch, by the rule
  `sp uninstall` already uses: a link into `current` that resolves to nothing.
  A link of the user's own, broken or not, is left alone.
- **The copies in the workspace.** The chat panel's agent reads real copies,
  not links, from `<projects>/.workspaces/.claude/skills` (`installSkills` in
  `canvas/server/skills.ts`). Those it writes by name, so an old name is not
  overwritten by anything and the agent would go on offering
  `clone-prototype`, with instructions pointing at paths this tree no longer
  has. `installSkills` now removes a copy whose name the tree has stopped
  shipping, by what makes a copy ours in the first place: the `managed-by`
  marker. A folder without one is the user's, and stays.
- **The copy that names a command.** The welcome board says
  `/sp-clone-prototype` now, and the x-ios board's mock post with it.
- **The prose.** Every mention across `AGENTS.md`, `README.md`, the canvas's
  own strings and each skill's references. `docs/` and the tagged sections of
  `RELEASE-NOTES.md` were left as they were: they are dated records of what
  was true when they were written, and rewriting them would make the rename
  look like it had always been the case.

## The welcome board

The board that has to say `/sp-clone-prototype` is `canvases/00-welcome/`, and
its `gen.py` could not run. It read `../../../assets/banner.webp`, one level
above the repo since boards moved into `canvases/` (51220fa), and the banner at
the real path is the landing page's hero now — download buttons and all —
rather than the strip the board was built around, so repairing the depth alone
would have put "Download for macOS" inside the app's first board.

So the board got its own `assets/`, which is what the folder rules ask for
anyway: the art it was built from, restored from before the landing page took
the name (e47e45d), and the icon beside it. `ASSETS` is the folder's own now,
and the repo's `assets/` is the README's and the landing page's alone. Two
other things had drifted with it and are in the generator now: `layout.json`'s
`ground`, added by hand in 2c22caf, and the `/sp-clone-prototype` line. Running
`gen.py` reproduces both committed files byte for byte, which is the point —
the boards are output, and output that cannot be regenerated is a source file
nobody can edit.
