# A project is the unit people share

2026-09-25. Reviewed by two adversarial passes (correctness and security against the code;
scope against the rules in CLAUDE.md). What they changed is at the end. Phases 0 to 3 are
built; Phase 3's repo is ReScienceLab/super-prototyping-community. "What building it found" says where the build
went past the plan.

Whatever someone shares, on the community page or anywhere else, is packed and uploaded as a
whole project. Nothing smaller is shared: a canvas that should travel alone is a project with
one canvas. This plan says what a package holds, how it is checked, and what has to be safe
before anyone opens a project someone else made.

## Where the format stands

A project is a folder under the projects directory (`2026-09-23-projects-folder-only.md`).
Everything a canvas shows is saved in the folder, and every reference inside it is relative
(`2026-09-24-canvas-content-on-disk.md`). That was designed with sharing in mind, and on the
seven projects on this machine it holds:

- 295 `canvas.json` assets point at `./files/…`. One points at a sibling canvas's `files/`,
  `../sandwich-video/files/…` from `kasra-design`. None is absolute, none is a data URI, and
  none points at a file that is missing.
- `canvas.json` carries tldraw's `schemaVersion` and is migrated on load (`canvasContent.ts`).
- `project.json` stores the cover as a path, and falls back to the default if the path is gone.

**It is sound as a working folder but not as a package.** Five gaps:

1. **Nothing defines what a project is made of.** The server knows what it reads; the folder
   holds whatever an agent left there.

   | Project | Size | What makes it big |
   |---|---|---|
   | Launch Video Studios | 5.5 GB | `sandwich-video/files/`, 2.1 GB of video |
   | Super Prototyping Site | 485 MB | |

   About 730 MB across projects is `scratch/`. Project roots also hold `tools/`, `web/`,
   `mockups/`, `.claude/`, `refs/`, `.DS_Store`, and a loose HTML presentation.
2. **A board is not safe to open outside the canvas.** Boards are arbitrary HTML with scripts.
   On the canvas they are safe: `CanvasFileShapeUtil.tsx` renders them `srcDoc` with
   `sandbox=""`, or `sandbox="allow-scripts"` without `allow-same-origin` for the inspector.
   But `/board/<slug>/<file>.html` (`sp.ts:354`) serves the same HTML on the app's own origin
   with no CSP. Two ways reach it:
   - `BoardsSheet.tsx:133` frames every board unsandboxed.
   - Any board link opened in a tab of its own.

   A script there sends `Sec-Fetch-Site: same-origin`. `sameOrigin()` (`sp.ts:48`), which
   guards every `/__sp` route, accepts it. So the script can POST to `/__sp/agent/run` and have
   the agent run shell commands on the machine, or write any project's files. This is true
   today for any board an agent writes, not only for shared ones.
3. **Nothing names the format or the project.** `project.json` holds an optional `cover`, and
   on some projects a `name` the agent wrote.
   - It has no version, so a newer layout cannot be told apart from a broken one.
   - A project has no id. Its identity is its folder name, which is also its address
     (`/p/<name>/`).
4. **Broken or unsafe contents are tolerated.**
   - `readJson` (`boards.ts`) warns and carries on when a JSON file will not parse.
   - `boardIndex` follows symlinks on purpose (`layout.md`), and they could point anywhere.
   - A name containing `#` or `?` is dropped from the canvas, with only a console warning.

   Tolerance is right for your own folder. At an upload it lets a broken or hostile project
   through.
5. **Third-party material sits beside first-party work.** `ref-*.html`, `assets/refs/` and a
   root `refs/` (screen recordings from `/__sp/projects/ref`) are captures of other people's
   products. The repo's `.gitignore` keeps them out of Git; a zip of the folder would ship
   them.

## What others do

Four surveys looked at design tools, code sandboxes, plugin registries and the pi coding agent.
What carries over:

| From | Practice | Gap |
|---|---|---|
| Penpot `.penpot` | A rarely-changing *format* version on the package; each document keeps its own *data* version, migrated on import. | 3 |
| Obsidian, Blender, HACS | Identity is an `id` in the manifest, checked for collisions by a bot, never the folder or repo name. | 3 |
| Obsidian releases, npm `files` | An allowlist of what ships. Ignore files are the fallback, and are where leaks come from. | 1, 5 |
| CodePen, Observable, Claude Artifacts | Runnable user HTML only runs on an origin that is not the app's. Replit's 2019 XSS came from `allow-scripts` together with `allow-same-origin` on user content. | 2 |
| Blender, Bolt, CodePen | A stated size cap, enforced at upload. | 1 |
| excalidraw-libraries | Submit by PR: one folder per submission plus an index entry. CI checks, a person reviews. | — |
| pi packages | The folder layout is the manifest. A `pi` key in `package.json` is needed only to depart from the conventions. The gallery is unreviewed, and says so: "review third-party package source before installing it." | 1, 3 |

Considered and not taken:

- **A file inventory in the manifest (Penpot).** Our folder conventions already say what a
  project holds, as pi's do, and `boardIndex` reads them. An inventory would be a second copy
  of that, and could disagree with the folder.
- **"Scan, don't sandbox" (Obsidian, VS Code, pi).** Plugins need their powers, so a sandbox
  would break them. Boards need none: they are self-contained by the rule in `layout.md`, so
  isolating them costs almost nothing. For the same reason, PR review in Phase 3 is curation,
  never the security control. Phase 0 is.
- **Content-addressed `files/` (Excalidraw).** Deduplication pays only once the same bytes are
  shared twice, and renaming would touch every `canvas.json`.
- **Git LFS for large files.** It spends the community repo's bandwidth quota; the cap does the
  job for now.

## The plan

### Phase 0: a board never runs on the app's origin

This stands alone and ships first. It protects local users today.

- **The server.** In the `/board` route, an `.html` or `.svg` response gets the header the
  `/file` route already sends (`sp.ts:470`):
  `Content-Security-Policy: sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads`.

  With no `allow-same-origin`, the document gets an opaque origin wherever it is loaded,
  framed or top-level. Its requests then carry `Sec-Fetch-Site: cross-site`, which
  `sameOrigin()` already refuses. Rasters and video under the same route cannot run script and
  need nothing.
- **The hosted build.** `vite.config.ts` writes boards into `dist/board/` as static files, and
  Cloudflare Pages runs no server. A `canvas/public/_headers` rule gives `/board/*` the same
  header. It matters there too: the demo is proxied under `superproto.dev/demo/`, so the
  landing page and the committed `ref-*` captures share its origin.
- **Links.** `CanvasLinkShapeUtil.tsx:273` passes `layout.json`'s `links[].url` to
  `window.open` in the app's own frame. It opens only `http:` and `https:`.
- **Test** (`sp.test.ts`): a board and an SVG carry the CSP. A POST to `/__sp/agent/run` with
  `Sec-Fetch-Site: cross-site` is refused; that is already true, and the test pins it.
- **Check by hand before merging:**
  - Export to Figma, which reads `sheet.html`.
  - `/__sp/shoot` and `refkit shoot` against a board URL.
  - A board with Google Fonts.
  - The inspector.
  - A board that uses `localStorage`: it throws in an opaque origin, as it already does on the
    canvas.

  What stops working is what this closes. It gets fixed the way the inspector already works,
  with `postMessage`, not by loosening the sandbox.

### Phase 1: `project.json` gets `format` and `id`

```json
{ "format": 1, "id": "0b6d3c1e-…", "name": "Launch Video Studios", "cover": { "path": "…" } }
```

- **`format`: the version of the folder layout and of this app's own files** (`layout.json`,
  `comments.json`, `project.json`). `canvas.json` keeps tldraw's schema version, which is
  Penpot's second tier.
  - A project with no `format` is `1`. That is not a fallback: every folder that exists today
    is a format-1 folder, and this is the day the number starts.
  - A project with a `format` above the app's is refused when opened, local or not, with a
    message to update the app. An older app that opened it would half-understand it, and its
    next save could lose what it did not understand.
  - **`format` goes up rarely, only when an older app would misread the project.** Adding
    something is not that:
    - The app ignores files it does not know, and never deletes them.
    - It ignores JSON keys it does not know, and writes them back unchanged. A write goes
      through `withLayoutKey`, or reads the file and sets one key, as `project.json`'s cover
      does, so this already holds.
    - A new kind of content, a new key or a new file is therefore still format 1. Only a
      change to what an existing thing means raises it.
- **`id`: a UUID, minted when New project makes the project** (`POST /__sp/projects` in
  `projects.ts`).
  - A project made earlier gets one from its first `sp pack`. Nothing is written on a GET, the
    rule from `2026-09-22-agent-workspace.md`.
  - The id is the project's identity for sharing only. The folder name stays the local
    address, and routing and the store's keys do not change.
- `author` and `contributors` arrive with Phase 3, whose CI is what makes them true.
  `license` and a fork's source are not added until a real submission shows where they
  belong.
- `layout.md`'s section on `project.json` lists the two fields. That copy ships with the app,
  and it is the one the agent reads.

### Phase 2: `sp pack`

`sp pack <project> --check` validates and writes nothing. `sp pack <project> -o <dir>` also
copies what passes into `<dir>`, as a folder: a PR adds a folder, so a zip has no reader yet.
- **`-o` also writes `thumbnail.png` at the package's root.** It is the project's cover, drawn
  with `refkit shoot` at 1600×1000.
  - It is Figma's `thumbnail.png` and Sketch's `previews/preview.png`: a package can be
    browsed without the app, and the community page reads its card straight from it.
  - It exists only in the package. In the project the cover stays a path, as
    `2026-09-23-project-covers.md` decided, because a stored picture goes stale.
- It lives in `tools/sp_canvas.py` beside the other subcommands, because CI and the agent both
  already run `sp`.
- The rules it applies partly repeat `boardIndex` and `cover.ts`, in a second language. That
  drift is accepted until import in the app needs the same rules in TypeScript, which is the
  second case that would justify sharing them.

**What goes in.** A project's content is open-ended: boards today, and later videos, notes,
decks, or kinds of content nobody has made yet. So the package is defined by where things
sit, not by what they are:

- **At the root**, only `project.json` (required), the Markdown documents (`*.md`), and
  `canvases/`. Everything else there is left out: that is where agents leave tools, web
  builds and loose drafts.
- **Inside `canvases/<slug>/`, everything ships,** whatever its type, except the list below.
  A new kind of content goes into a canvas folder and ships with no change to `sp pack` or to
  `format`. `files/` ships whole, not only what a record points at. That keeps content that
  something other than `canvas.json` refers to, now or later, and it also keeps a file one
  canvas uses from another's folder.

A folder with nothing but boards is a whole project, and so is one with nothing but a video.

Left out anywhere, and listed in the report so the author sees it:
- `scratch/`, `ref-*`, `assets/refs/` and the root `refs/`: work in progress, and captures of
  other people's products;
- dot files and dot folders;
- `comments.json`;
- `probes.json` and `crops.json`. These are the clone skill's measurement evidence. They
  support a claim of fidelity to someone else's app, are not part of the work, and most
  projects have none.

This is a list of exclusions, where the surveys favoured a list of inclusions. The trade is
deliberate. An inclusion list leaks nothing, but it drops every new kind of content until
someone edits it. The exclusions here are few and known, and the checks below are what keep a
package safe, not the file types.

**Checks.** Each check fails the pack; none warns and carries on:

1. `project.json` parses and is an object, with a known `format` and a UUID `id`.
2. Every JSON file this app defines (`project.json`, `layout.json`, `canvas.json`) parses.
   Other files are content, and are not read.
3. No symlinks. No path escapes the project after resolution.
4. **Every reference the app makes resolves to a file in the package:** `canvas.json` asset
   `src`s, `layout.json` file entries, and the `project.json` cover. A new kind of reference
   gets its check when the app starts making it.
5. `links[].url` in `layout.json` is `http:` or `https:`.
6. Names contain no `#` or `?`, do not start with a dot, and are NFC. macOS stores them
   decomposed, and other systems do not re-normalise.
7. **Size: each file at most 50 MB, the whole at most 200 MB.**
   - GitHub refuses files over 100 MB and warns from 50 MB, so 50 MB per file is the most a
     PR can carry.
   - That is a few minutes of 1080p video. A longer video goes on the canvas as a link to
     where it is hosted, which the canvas already supports.

Minting a missing `id` is the only write `sp pack` makes to the project.

### Phase 3: community submission by PR

The shape comes from excalidraw-libraries. The repo is
[ReScienceLab/super-prototyping-community](https://github.com/ReScienceLab/super-prototyping-community);
its `.github/community.py` is the check and the index, standard library only.

- **A community repo** holds `projects/<id>/`, the output of `sp pack -o`, and an
  `index.json` with one entry per project.
- **CI runs `sp pack --check`** on each changed project and checks that each `id` is either
  new or already at that same path. A person reviews what passes, for quality. The review is
  curation and promises nothing about safety; Phase 0 does that.
  - The workflow runs on `pull_request_target` with read-only permissions: the base branch's
    script checks the PR's files, and nothing from the PR is ever run.
  - It installs `sp` from this repo at `vars.SP_REF`, else `main`. `SP_REF` names this
    branch until `sp pack` reaches `main`; delete the variable then.
- **Every project names its people, and CI holds the names to the PR.** This is the Raycast
  Store's model, the gallery closest to ours: its `package.json` names `author` and
  `contributors` by handle, and its CI refuses an author it cannot tie to the submitter's
  GitHub account. Excalidraw's `libraries.json` and Obsidian's registry name authors too, but
  as unchecked text. Figma shows the publishing account and the co-creators it invites.
  - `project.json` gains `author`, a GitHub login, and `contributors`, a list of them. The
    names travel with the project, so the app can show them offline. Still format 1: they are
    new keys.
    ```json
    { "format": 1, "id": "0b6d3c1e-…", "name": "…", "author": "octocat", "contributors": ["hubot"] }
    ```
  - A PR that adds a project must be opened by its `author`. A PR that changes one must be
    opened by its `author` or a contributor; anyone else is added to `contributors` by the same
    PR, or CI fails it. That is proof of the GitHub account, which is all the authorship a
    GitHub repo can prove, and it is enough.
  - On merge, CI resolves each login to its numeric GitHub user id and writes both into
    `index.json`. A login can be renamed and the id cannot, so the index finds the person
    after a rename and corrects the login it shows.
  - Avatars are `https://github.com/<login>.png`. Nothing is uploaded or stored.
  - `sp pack -o` fills a missing `author` from `gh api user --jq .login` when `gh` is signed
    in, and otherwise tells the person to set it. `--check` reports a missing `author` as a
    problem, like a missing `id`.
  - Links to a person's site or Twitter, which Excalidraw carries, wait until someone asks.
- **The community page** (`canvas/src/Community.tsx`) reads `index.json` from the repo's raw
  files and lists those projects before the examples. It shows each `thumbnail.png` as an
  image and never frames a board. A card shows the author's avatar and login, and the
  contributors' avatars beside them. A shared project opens on GitHub until import exists.
  The app shows the page as a tab; the site serves the hosted build's page at `/community`.

## Later

**Import** gets its own document when the app gets an import button. It has to:
- run every Phase 2 check on the way in, and refuse the whole package on any failure;
- stop extracting once the bytes actually written pass the cap, whatever the archive declares;
- refuse any entry whose path resolves outside the new folder;
- name the new folder from `name`, de-collided as New project does;
- ask the person, when the `id` is already in use, whether to replace that project or keep
  both;
- tell the agent that the project, and its `gen.py`, came from someone else.

A zip (`sp pack -o x.zip`) arrives with it, when something first hands out a download.

**The examples move to the community repo.** The app ships every example in `canvases/`
inside every install: 411 MB as one project, twice the package cap. Once the community repo
takes projects, each example becomes a project there and the app downloads the ones a person
opens, so an install carries only the welcome canvas. Not now: it needs import first, and the
examples need a `project.json` each. `luma-ios` would not pass `sp pack` today: its layout
names four `w*-` walkthrough captures that are gitignored.

Not planned: accounts, signing, hosting projects on superproto.dev, live collaboration, and
packing a single canvas.

## Decided

- **`gen.py` ships.** It is the canvas's source of truth, and a remix without it can only be
  hand-edited. It is code, but the app never runs it. Import tells the agent whose code it is,
  so the agent asks before running it.
- **`comments.json` does not ship.** Review threads can hold names and private remarks, and a
  package shares the work, not its review.
- **Boards may load anything from the network, fonts above all.** A board may inline its fonts
  or load them from any CDN, and the network is not closed with `connect-src` or `font-src`.
  - All a board could send out is what someone types into the board itself.
  - The opaque origin keeps the app, its files and the agent out of reach, and that is the
    boundary.
  - A font file inside the package counts against the caps like anything else.
- **The community repo stays small, so it is an ordinary GitHub repo.** Its CI is a GitHub
  Actions workflow in that repo, owned by this project's maintainers. It runs `sp pack --check`,
  checks that `thumbnail.png` is a 1600 × 1000 PNG, and fails a PR over the caps. It does not
  check that the thumbnail is the cover `sp pack` would draw now: Chrome draws it a few pixels
  differently on each machine, so a byte match would fail honest PRs. Its size is looked at
  again if the repo passes 1 GB.
- **Licence and takedown.** One licence for the whole repo, CC BY 4.0 for the work and MIT for
  the code in it such as `gen.py`, so no project needs a `license` key. The PR template has the
  submitter confirm the work is theirs to share, and says the licence covers only their own
  work, not the brands a clone copies. Takedown is an issue template and an email, answered
  within 7 days, beside GitHub's own DMCA process.
- **Renaming a project sets only `name`,** when the app gets a rename. The folder is the
  address agents, links and git history hold, and in the community repo a moved folder reads
  as one project deleted and another added.

## What building it found

- **DNS rebinding.** Nothing checked the Host header, so a site that points its own name at
  127.0.0.1 was same-origin with the app and passed `sameOrigin()`, `/__sp/agent/run`
  included. `projects.ts` now answers only to an IP address, `localhost` or `*.localhost`, in
  front of every route. It is part of Phase 0 because it is the same boundary: a page from
  elsewhere must not drive the app.
- **All of `/board` is sandboxed,** not only `.html` and `.svg`. The header does nothing to an
  image or a video, and one rule is less to get wrong than a list of types.
- **A missing `project.json` is a format-1 project with no id,** as Phase 1 says, so `sp pack`
  writes one rather than failing. A project made before today has none.
- **A reference to a file left out on purpose passes.** Clone layouts name their `ref-*` rows,
  and the app already shows a missing board as missing.
- **The thumbnail is the cover whole, centred on the canvas's ground,** not cropped to fill
  the frame as a home card is: 1600 × 1000 crops a phone to its top third.
- **On real projects:** every one made today has no `id` yet. "Launch Video Studios" has
  twelve videos over 50 MB, up to 538 MB, and "Super Prototyping Site" is 509 MB in all.
  Both would have to link their videos from where they are hosted. The caps stand.
- **The sandbox checked by hand** on the dev server: a board still renders at its own address.
  A Host of `rebound.example` gets 403 and `localhost` gets 200. The sheet page's board frames
  came out blank in headless Chrome with the header and without it, so that is the screenshot,
  not the sandbox. A real browser should still open the sheet once before release.

## What the review changed

- **Cross-canvas files.** A file one canvas points at inside another's `files/` would have
  been dropped, or would have failed the pack. The real case is `kasra-design` pointing at
  `sandwich-video`. `files/` now ships whole, which also settles this case.
- **Phase 0 now covers the hosted build.** It serves boards as static files and never runs the
  server route, so it gets a `_headers` rule. It also covers SVG and `layout.json` links, which
  run in app code and not in an iframe.
- **Import leaves this plan,** and the requirements the review found for it are recorded
  above: the cap counts bytes actually extracted, so a crafted archive cannot slip past it, and
  no entry may land outside the new folder.
- **Cut until a real case asks for them:**
  - `author`, `license` and `forkedFrom` (`author` came back later, with `contributors` and
    the CI check that ties them to the PR; see Phase 3);
  - the deterministic zip;
  - the zip itself;
  - `<author>/` in the community repo's path, which was the third copy of one fact;
  - the "imported" marker's exact shape.
- **The caps are decided,** not both a check and an open question.
- **Two things are said plainly:** the Python rules may drift from `boardIndex`, and the id
  check in CI proves path continuity, not authorship. (Authorship is now checked separately,
  against the PR's GitHub account.)
- **Kept against the reviews:** refusing a newer `format` on every open, including local
  ones. An older app that opened it would half-understand it and could lose data on its next
  save.
