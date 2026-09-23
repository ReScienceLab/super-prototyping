# Release notes

Written for the person deciding whether to update, so it says what changed for
someone using the plugin, not what changed in the tree. One `## v<version>`
section per release: `.github/workflows/release.yml` reads the section matching
the version being tagged and makes it the GitHub Release body.

A pull request that changes what a user sees adds its line to `## Unreleased`
as part of the change. Leaving it until the release means writing it from
memory, which is how a release ends up summarising commits rather than itself.
A `## v<version>` section is finished once its tag exists: the GitHub Release
was cut from that text, so editing the file afterwards changes nothing anyone
has been shown.

Update with `/plugin update super-prototyping` (Claude Code), or the equivalent
for your product, which README's install table lists. Then move the toolkit with
the `uv tool install` line in the README. The plugin and the
toolkit carry the same version; `sp start` says so when they drift.

## Unreleased

Everything below is on `main` and reaches no install until a version is cut.

- **A board added to the chat shows up at once.** Its tile and its number
  appear the moment you press + or paste its link, shimmering while the board
  is drawn, and the picture fills in when it is ready. Send waits for it. A
  board that cannot be drawn turns amber; press its + again to retry. Several
  boards added together are drawn side by side, four at a time, so three take
  about as long as one.
- **Copy a link to anything on the canvas.** Right-click a board, a picture or
  a card and pick *Copy link*, or select it and press ⌘C (Ctrl+C): it opens
  the canvas on that thing. With several selected, it copies one link a line. Paste them into the agent's box and they
  become those things' chips, the same ones their + adds. The menu lost *Clone this canvas*, *Edit* and *Arrange*: a board is
  laid out from its folder, so none of them stuck.
- **The app opens on a home page.** The desktop app opens on every project you
  have, with the examples below. The page is no project's, so the app works
  with none: open an example, or close every tab, and nothing is made or
  reopened for you. Each card shows the
  screens of its canvas: a phone cropped to its screen, a wider board whole and
  as tall as the phones on the other cards.
  Open one, or start a new project from the same page. With none yet, a dashed
  card sits under Projects where your first one will be, and a click on it
  starts that project. The Home button on the canvas's top bar goes back to it.

- **Right-click a card on the home page** to open it, copy its link, show its
  folder in Finder or Explorer, or move it to the Trash (Delete, on Windows),
  where you can put it back. That asks first, with the folder's path in full.
  An example has only Open and Copy link.

- **Right-click a tab** to copy its link, reload the canvas in front, show a
  project's folder, or close it, the other tabs, or all of them. Home has Copy
  link and Reload. The browser's own right-click menu no longer shows over the
  app, except in a text field, where it keeps Paste and spelling.

- **The first launch asks one question, over the app.** It no longer asks for
  a project before you see anything. It opens on the home page, with no project
  made for you, and asks over it which agent you will work with. Skip it and it
  asks again next launch. It comes back once after a major update.

- **A tab is a project.** The bar across the top holds one tab per project you
  have open, examples included, and each comes back on the canvas you left it
  on. The + at the end of the bar starts a new project. Open another from the
  home page.

- **A project's canvases are tabs under its tab.** A second row under the bar
  lists the project's canvases, the one in front underlined. Its + asks the
  agent for another. Export to Figma moved from the top bar to the Figma mark at
  the row's far end, and in the desktop app it opens in your browser, where the
  html.to.design extension can capture it. The top bar's Brand kit button is
  gone.

- **One agent for the whole app.** The agent panel stays down the left on the
  home page and on every project, with the same conversation. The button at the
  start of the bar shows and hides it, and shows the mark of Claude Code or
  Codex, whichever the next message goes to. Right-click it to switch.

- **The agent remembers the conversation.** Each message carries on from the
  ones before it, until New session starts another. It works on the home page
  with no project open, and on whichever project is in front when you send, so
  one conversation can move between projects. History lists your sessions, with
  the projects each worked on, and picking one carries it on. Switching between
  Claude Code and Codex starts a new session.

- **The agent has a folder of its own, and projects get no skills.** It runs in
  `.workspaces/<session>` under the projects folder, where it gets the plugin's
  skills, and writes boards into the project in front. Making or opening a
  project no longer copies skills into it, and the toast that said so is gone.
  Copies an earlier version put in a project are left alone and no longer
  updated; delete them if you like. `sp paths` names the folder, and `sp clean`
  leaves it alone. Claude Code needs 2.1.275 or later.

- **Switching tabs keeps what you typed.** The bar and the agent panel belong
  to the window, and a project's canvas loads beside them, so switching
  projects, going home, opening a project, or a board the agent writes reloads
  only the canvas. A half-typed message, its pictures and the run being
  followed stay as they were, with no flash.

- **One server for every project.** The app starts its canvas server once and
  serves every project from it, so opening another project or switching tabs no
  longer restarts anything.

- **`sp start` is that same server.** It serves every project under
  `~/Documents/Super Prototyping` at `/p/<name>/`, as the app does, and the
  project it was given beside them, which is where its address goes. The
  plugin's examples show beside each project's boards. New project and Open
  folder are the server's own, so the app and a browser tab get the same ones.
  `--canvases` is gone, and the server no longer reads
  `PROTOTYPING_CANVASES_DIR`. A project's boards are its `canvases` folder, and
  `PROTOTYPING_PROJECTS_DIR` moves the projects folder.

- **A project's boards moved up a level.** They are in `<project>/canvases`
  now, not `<project>/mockups/canvases`. The first time `sp start`, the app or
  a browser tab opens a project that still has the old folder, it moves the
  folder, and an emptied `mockups` goes with it. A project that has both is
  left as it is, for you to merge.

- **Start here is the first example.** It is the first card under Examples on
  the home page, and opens on a tab of its own, labelled Start here, like every
  other example. A project with no canvas yet
  still opens on the same page, under its own name. Close that tab, or every
  tab, and the canvas goes back to the home page.

- **The app updates itself.** On launch it looks for a newer release, downloads
  it in the background, and then asks once: **Restart Now**, or **Later**, which
  installs it when you quit. Only what changed is downloaded, so the example
  boards are not fetched again: a few MB on Windows and about 50 MB on macOS,
  where the first update after a dmg install is still the whole app. Offline,
  it says nothing. A Homebrew install updates this way too. Installs of v1.5.3 and
  earlier have no updater, so they need one last manual update:
  `brew upgrade --cask super-prototyping`, or the new installer on Windows.
- **The app says which version it is.** The first launch's welcome shows it
  at its foot. Click it to check for an update there and then: it answers **Up to
  date**, that a newer version is available, which then downloads and asks as
  usual, or **Could not check**.

## v1.5.3

2026-09-21. Windows: there is an app for it, and the chat panel, `refkit shoot`
and a new board folder's generator now work there. Nothing changed on macOS.

- **There is a Windows app.** Each release attaches
  `Super-Prototyping-<version>-x64.exe`, the same app as the macOS one. It
  installs for the current user with no administrator prompt. It is not signed,
  so the first run shows "Windows protected your PC": choose More info, then
  Run anyway.
- **The chat panel runs Claude Code and Codex on Windows.** An npm-installed
  `claude` or `codex` is a `.cmd` file there, which the canvas could not start,
  and Stop left the agent running. Both work now, from `sp start` as well.
- **`refkit shoot` works on Windows.** It finds Chrome where the Windows
  installer puts it, and uses Edge when Chrome is not there. Before, it only
  knew the macOS path.
- **A new board folder's generator writes the same bytes on Windows.** The
  template `gen.py` wrote boards in the Windows code page, so Chinese text or
  an emoji came out garbled or stopped the run, and with CRLF line endings, so
  regenerating marked every board as changed.

## v1.5.2

2026-09-21. The macOS app is signed and notarised. Nothing else changed, so
this is for anyone who installed the app, or put it off because of the
warning. `brew upgrade --cask super-prototyping` moves an install to it.

- **The macOS app opens without the `xattr` step.** The dmgs are signed by
  ReScience Lab Inc. and notarised by Apple, so macOS no longer says the app
  "is damaged and can't be opened", from Homebrew or from a downloaded dmg.
  The signing was wired in v1.5.0 and had never run. Its first run stopped
  inside electron-builder 26.15.3, which gives `security` the wrong password
  on a macOS 26 runner, so the app now builds with 26.16.1, which has the fix.

## v1.5.1

2026-09-20. The first release with the macOS app attached. v1.5.0 tagged and
shipped the plugin and the toolkit, but its dmgs were never uploaded and the
Homebrew cask was never written, so v1.5.0's notes below are what is new and
this release is the one to install. Nothing else changed.

- **The macOS app's dmgs build in the release again.** The step that builds
  them holds a GitHub token to upload them with, and electron-builder takes a
  token as a request to write an auto-update feed, then crashed looking for
  the repository from `desktop/`. The app has no updater, because Homebrew
  upgrades it, so the build now says it publishes nothing.

## v1.5.0

2026-09-20. A macOS app: the canvas in a window, installed with Homebrew or
from a dmg, with no terminal and no bun. From a terminal, `sp-canvas` is now
`sp`, and `sp start` runs a built canvas it downloads once instead of Vite's
dev server. This release needs the toolkit reinstalled, not only the plugin
updated: re-run the README's `uv tool install` line with `--force`.

### The macOS app

- **A macOS app.** Every release attaches
  `Super-Prototyping-<version>-arm64.dmg` and `-x64.dmg`.
  `brew install --cask ReScienceLab/tap/super-prototyping` installs that same
  dmg, and `brew upgrade` follows each stable release. It is the canvas
  `sp start` serves, in a window, for a project you pick when it opens or name
  after `--args`. It uses the same port and the same `~/.local/state`
  directory as the command line. Closing the window stops the server and any
  agent it was running. A link that leaves the canvas opens in your browser if
  it is a web address, and does nothing otherwise. The app has its own icon,
  the three tiles on black, cut to macOS's icon shape. The dmgs are not signed
  yet, so macOS refuses the first open; the README has the one `xattr` line
  that allows it.
- **On launch it asks which agent you will work with**, Claude Code or Codex.
  Each card shows its icon and whether the agent was found on this machine,
  and its tooltip says what that rests on: a binary on PATH, a config
  directory under home, or an app bundle. An agent that was not found cannot
  be picked, and its card links to where to get it. The page is one glass
  panel on a night sky, its three steps numbered down the left, with the
  project name and a link to star the repo on GitHub.
- **Then it asks for a project**, either an existing folder or a new one, and
  lists the projects already in `Documents/Super Prototyping` in a dropdown
  you can search by name, last edited first, each with an icon, its name, its
  folder and when it was last edited. The icon is the `icon.png` of the
  project's first canvas that has one, and a folder until then. A new one
  takes a third step, its name, and nothing else. It goes in
  `Documents/Super Prototyping` with `mockups/canvases` in it, and opens on
  the Start here canvas with every example canvas under it. When a name is
  already taken, the page says so under the field, with a link to open that
  project instead.
- **The examples ship in the app** and are shown read-only beside the
  project's own canvases. Cloning one copies it into the project, and that
  copy is yours to change.
- **The agent you picked gets the bundled skills copied into that project**,
  into its own skills directory. Each copy has a version marker in its
  frontmatter and its `uv tool install` line pinned to a tag of that version,
  e.g. `super-prototyping@super-prototyping--v1.5.0`. Once the canvas is up it
  says what the install did, in a toast at its bottom right. Every later open
  refreshes, in place, a marked copy that is behind the app's own version. It
  never touches a same-named folder with no marker, which is yours, and never
  recreates a copy you deleted. `sp start` from a terminal refreshes the same
  way, since it runs the same server. The endpoints behind both are
  `GET /__sp/skills`, which lists the marked copies a project already has, and
  `POST /__sp/skills` with `{"dirs": [...]}`, which writes them. The app does
  not detect or mention the toolkit itself, because the skill text tells the
  agent to install it, pinned to match.
  `open -a "Super Prototyping" --args <dir>` skips the window and installs
  nothing.

### `sp`, the launcher

- **`sp-canvas` is now `sp`**: `sp start`, `sp stop`, `sp root`. Re-run the
  `uv tool install` line with `--force` to get it. `sp start <dir>` names the
  project from anywhere; with no argument it is the current directory, as
  before.
- **`sp start` runs the canvas as a small localhost app** instead of Vite's
  dev server. On first start it downloads the canvas built for the plugin's
  version from that release (`canvas-dist.tgz`) into
  `~/.cache/super-prototyping/<version>/` and runs it with node or bun, so an
  install needs no bun and no build. A checkout with `canvas/node_modules`
  still serves its own build, rebuilt when a source is newer. It opens the
  browser when started from a terminal. Everything the canvas could do before
  — status, comments, clone, the chat panel, reload on rewrite — works the
  same.
- **The launcher writes two directories and nothing else**: that cache, and
  `~/.local/state/super-prototyping/` for its pidfile and log, the same on
  macOS as on Linux. `SUPER_PROTOTYPING_HOME` moves both under one root. Two
  new commands: `sp paths` prints them and every variable in use, and
  `sp clean` removes them. The port can also come from `SP_CANVAS_PORT`. The
  old `~/.super-prototyping-canvas-<port>.pid` and `.log` files in your home
  are not read any more; delete them.
- **`sp root`, and everything built on it, also checks
  `/Applications/Super Prototyping.app/Contents/Resources/plugin`.** It is
  tried last, after your own checkout, so someone with the app installed who
  runs it from their own checkout still gets the checkout.

### The canvas

- **The Start here page has a new banner**: the wordmark on a night sky,
  beside an astronaut holding a glowing board. The README shows the same art.
- **The top-right corner holds one button now**, Star on GitHub. Try
  SnapAction is gone, from the canvas and from the brand pages.

## v1.4.1

2026-09-19. Three fixes to the chat panel's composer: the command palette
opens from a slash typed mid-sentence, Enter queues a message while the agent
is working, and Up recalls what was sent. Nothing in the toolkit changed, but
it carries the same version, so move it too with the README's `uv tool
install` line, or `sp-canvas start` will say the two have drifted.

### The chat panel

- **`/` opens the commands mid-sentence.** The palette used to open only when
  the slash was the first thing in the box. Now it opens on a slash typed after
  words as well, and picking a command keeps what was typed before it.
- **Enter queues a message while the agent is working.** The box was never
  locked, but Enter did nothing until the run ended. Now the message shows
  faded under the running turn with an ✕, and is sent the moment the run ends,
  one per run, as in Claude Code's terminal. A queue survives the reload a
  written board causes.
- **Up recalls what you sent.** From an empty box, Up brings back the newest
  message and each press walks one older; Down walks newer and, past the
  newest, empties the box. Editing a recalled line or sending ends the walk,
  so inside a draft of your own the arrows still move the caret. The last
  fifty lines are kept across sessions.

## v1.4.0

2026-09-19. The canvas gets a chat panel: talk to Claude Code or Codex about
the board in front of you, hand it pictures and boards off the canvas itself,
and see what it draws come back into the conversation. The canvas is dark now
and drawn in Vercel's Geist, and its top bar is down to a switch and two
destinations. This release needs the toolkit reinstalled, not only the plugin
updated.

### The chat panel

- **A chat panel on the left.** When the canvas runs from `sp-canvas start`
  there is a message box beside the boards. What you send runs Claude Code in
  your project with its permission prompts off, and what it does arrives as it
  happens, each tool call a line and its reply as text. A board it rewrites
  reloads the canvas the way any rewrite does, and the panel picks the run back
  up. `sp-canvas start` now tells the server which project it is in
  (`PROTOTYPING_PROJECT_DIR`); without that, the panel says it cannot run.
- **Codex as well as Claude Code.** The mark on the header is the switch: click
  it for a menu of the agents the server found on your PATH, and pick one. The
  choice is kept and sent with each message, and every turn and history row
  shows the mark of the agent that ran it. An agent that is not installed is in
  the menu greyed, with how to get it. Codex runs in its own workspace sandbox
  with the boards folder added, takes the panel's briefing ahead of your
  message since it has no system prompt, and answers in paragraphs rather than
  word by word, which is how `codex exec` works. If your Codex is older than
  the model its config names, the first message fails with the server's own
  sentence saying so; update the CLI or set `model` in `~/.codex/config.toml`.
- **The header names the conversation**, with the agent's own title for it once
  it has given one, and lists the server's recent runs behind a history button.
  That list lives in the dev server's memory and starts empty when it restarts.
  The name comes from a turn that had work to do: a reply that opens by saying
  what it is about to do, runs a tool and titles itself after that is titled in
  the header and the history list, where the title used to be left sitting in
  the middle of the reply instead.
- **Replies render as markdown** — bold, lists, fences and tables, with wide
  ones scrolling inside the message — rather than as source.
- **Which model, which effort, and what the last message cost**, in a row under
  the box. The model list is the agent's own — for Codex it is the list its own
  picker shows, read from its cache, so a model you gained by updating the CLI
  is there without waiting for us — and the effort levels are the ones that
  model actually takes. Both start at Default, which sends nothing and leaves
  your `~/.codex/config.toml` or Claude's settings in charge; pick one and it
  is remembered per agent. The number on the right is the tokens that message
  used against the model's window. It is that message, not the conversation:
  each one still runs as its own process with no memory of the last.
- **Type `/` and the commands are listed.** Claude Code's are your own, the
  project's, the plugins' and the skills, `/clone-prototype` among them, with
  the arrow keys and Enter to take one. They already worked if you knew the
  name; now you can see them. The list is the CLI's own, learned from the runs
  you make, so it is there from the first answer of a session and matches
  whatever you have installed. Codex gets the same palette, listing its skills
  — your own, the plugins' and this project's. It is not the same mechanism
  underneath: Claude Code runs a slash command itself, while Codex is told what
  its skills are and what they are for, and a `/name` goes to the model as the
  text it is.
- **A plus in the header starts a new session.** The log clears and the next
  message has nothing above it. Anything still running keeps running and stays
  in the history list: the button clears the view, it does not stop the agent.

### Pictures in the chat

- **A message can carry pictures.** Paste one into the box, drop one on the
  panel, or pick them with the button in the row underneath, where Claude Code
  keeps it, and each arrives as a numbered tile above the box. That number is
  the number the agent is handed beside the picture, so the sentence can say
  which is which: the layout from #1, the copy from #4. A paste writes its `#1`
  at the caret, since one picture arriving where you are already typing has
  said which it is; a pick or a drop is a handful chosen at a distance, so
  those only fill the tray, and you click a tile to write its number or the x
  in its corner to drop it. Delete a number out of the sentence by hand and its
  tile goes with it. A picture keeps one number however often you point at it,
  and the numbering starts over once nothing points at one, meaning an empty
  tray and no number left in the box.
- **The pictures a tool draws come back the same way.** Whatever a tool hands
  the agent as an image is drawn under the call that produced it, so a clone's
  working pictures — the grid over the reference, the crops — appear in the
  transcript as they are made. Nothing watches your project folder, and no tool
  had to be taught to do this.
- **Hand a board or a picture over from the canvas.** Hover a mockup or a piece
  of brand material and a **+** appears in its top-right corner; press it and
  that shape is in the tray with its number already written into the sentence.
  A board is a page rather than a picture, so the server draws it first and it
  comes over under its own `<slug>/<file>.html`, which is the name the tile is
  captioned with, the name the agent is handed, and the file it can go and
  open. Two fingers on the trackpad over the button still pan the board, and a
  picture is attachable anywhere inside its box rather than only where it has
  painted pixels, which for a logo on a transparent ground is most of it.
- **A vector attaches by being drawn rather than refused.** Every brand logo on
  these boards is an SVG, and the CLIs read png, jpeg, gif and webp and nothing
  else, so one sent whole would travel the entire way to be turned down at the
  far end. It is drawn into a PNG in the browser instead, on the way in, at a
  1024px long edge: a vector has no pixels of its own to be scaled up past, and
  a 24px icon attached at 24px is a picture with nothing in it. Nothing
  SVG-shaped reaches the tray, the server or the agent.
- **Twenty pictures and 24 MB to a message**, counted over the whole tray
  rather than over the batch being added, and a file too big to fit is refused
  before it is read rather than after. A run's copies of your pictures are
  deleted when it ends.

### The canvas

- **Dark, and drawn in Vercel's Geist:** its greys and its accents, its icons,
  and Geist Sans and Geist Mono bundled so a board looks the same offline as
  online. The chat panel, the inspector, the top bar and the canvas they sit
  around all read as one app now, on one ground, separated by hairlines rather
  than by shade. tldraw's own chrome comes with them. Its menus, its toolbar
  and its context menu read the same tokens, so a page menu is the same black
  card with the same hairline as a panel's menu, and an icon button in the top
  bar is the same grey, and lights the same way, as one in the chat panel's
  header beside it. The glyphs are Geist's own set rather than a transcription
  of it, and the scrollbars are the app's rather than the platform's: one thin
  grey thumb on whatever ground it is over, in the transcript, the slash menu,
  the history, the notes and the inspector alike. Your boards are untouched. A
  mockup is drawn by its own generator and keeps whatever palette it was
  measured in, scrollbars included.
- **A board sits on the canvas, not on a white card.** This is the one thing
  about a board that does change, and it is what the dark ground exposed. A
  frame paints an opaque white background of its own underneath whatever the
  board draws, invisible while the canvas was white and a card around every
  phone once it is not. The canvas releases it, so the canvas shows through
  wherever a board paints nothing and every pixel the board does paint stays as
  it was. A board that wants a ground, such as a token sheet or an evidence
  sheet, still declares one and looks exactly as it did.
- **The top bar is down to a switch, the page name and two destinations:**
  collapse the chat panel, Export to Figma, Brand kit. Everything else on it
  moved. Shape editing, meaning undo, redo, delete, duplicate and the overflow
  of aligns, distributes and reorders, is on the keyboard and the right-click
  menu, where it already was. These boards are written from files by a
  generator, so six buttons for nudging them crowded out the two the bar is
  for. Comment, clone and force refresh join them on the right button. All
  three act on what is under the cursor, or on the page it is on, which is what
  a right-click has already picked out. The hamburger beside the page name goes
  too, and so do the zoom readout and minimap toggle in the bottom-left corner,
  where they sat under the chat panel's composer. Zoom is the trackpad, ⌘+ and
  ⌘-, and ⇧1 to fit the page.
- **The switch for the chat panel is in the canvas's own top-left corner**,
  which is the one place it can be whether the panel is open or shut. In the
  panel's header it went away with the panel and needed a second control to
  bring it back. The panel is hidden rather than unmounted, so it keeps
  following whatever is running and comes back to it mid-stream, and whether it
  is open is remembered across reloads.

### The toolkit and the skills

- **Reinstall the toolkit, do not only update the plugin.** `sp-canvas` 1.3.0
  and earlier predate `PROTOTYPING_PROJECT_DIR`, so a canvas one of them starts
  comes up with the panel but every message answers 503. Re-run the README's
  `uv tool install` line with `--force`.
- **`sp-canvas stop` stops what the panel started.** It signals the server's
  process group rather than its pid alone, so an agent the chat panel spawned
  goes down with the server instead of being left editing your project.
- **Force refresh is on the right-click menu**, not the top bar, and both
  skills say so where they used to name the button.
- **A board paints no page ground.** `clone-prototype` and `prototype-canvas`
  now tell a generator to leave `html` and `body` with no `background` and let
  `.phone` paint its own, so a screen board floats on the canvas instead of
  sitting on a white card. Document boards, the token sheet and the evidence
  sheets, are the exception: they are a page rather than a device, and their
  black text needs a ground.

## v1.3.0

2026-09-15. The inspector moves onto the canvas: you click the board itself,
and fold or hide its layers there. A product's published pictures become a
brand kit, with a page of its own and an address for every picture. Four new
example canvases: TikTok, X, Instagram and Perplexity.

### The canvas

- **Inspect the board on the canvas.** Selecting a board no longer opens a
  second copy of it in the inspector. You click the mockup itself; hover, hide
  and fold all run against that board, while pan, zoom, comments and marquee
  keep working over it the way they do in Figma. The inspector keeps the name,
  the size, the Live badge and Comments, and sits in the corner with a way out
  of it.
- **Fold and hide layers.** A caret folds a subtree; an eye takes a layer off
  the board without reflowing what is around it (`visibility: hidden`, so a
  click reads what is behind).
- **A sprite's `<use>` draws in the inspector.** The inspector's copy used to
  clone only the root `<svg>`, so a `<use href="#id">` into a sprite of
  `<symbol>`s dangled and drew nothing. Same-document uses are inlined into the
  copy, and a 0×0 sprite host is no longer handed out as an asset.
- **A Brand kit button, and a page of pictures behind it.** A folder with
  `images` rows in `layout.json` is a brand kit: the pictures the company
  published, one row per surface. The toolbar button (a palette, next to
  Export to Figma) opens `brand.html?canvas=<slug>` for a kit, or the index of
  every kit when you are on a page that has none. The index is one card per
  product; a kit's own page is a shelf of app icons to switch with, and the
  title is the chip you are standing on.
- **A picture on the canvas has an address.** `?canvas=grok-ios#01-widget`
  still opens a board;
  `?canvas=grok-ios#assets/brand/identity/app-icon.png` opens a picture. A
  board is a file at the folder's root and every picture lives under
  `assets/brand`, so the hash does not have to say which kind it is. Opening
  one pushes history, Escape drops it, Back restores it, same as a board.
- **Brand pictures are served at the size they are drawn.** The canvas and the
  brand page request an 880px WebP while you are looking at a wall of
  thumbnails, and the original the moment you zoom past it, export it, or copy
  it. Nothing is shown softer than the screen can display.

### The toolkit and the skills

- **`brand-kit` collects a product's published material.** Press kit, store
  listings, verified social accounts, the newsroom: files under
  `assets/brand/`, a `manifest.json` with a source and a provenance on every
  one, wired into `layout.json` as `images` rows. Rows are surfaces, not asset
  types, in a fixed vocabulary, so a column down the page is the same kind of
  picture on every platform. The skill is the spec the example canvases were
  collected from, kept rather than thrown away.
- **`clone-prototype` pads a glyph's crop before tracing it.** potrace closes
  ink that reaches the crop's edge along that edge, so a tight box planes the
  apexes off a magnifier or a globe. The crop is padded, and the tracer writes
  the ink box it actually measured.
- **`refkit shoot --scale` takes a float.** A capture that is not an integer
  multiple of the design pt (the Dynamic Island boards were 2.24173 px/pt) can
  be shot at that scale instead of rounded.

### Example canvases

- **`tiktok-ios`, fifteen screens.** The bio editor and post composer, and the
  For You feed through scrubbing, playing, pull-to-refresh and an expanded
  caption. Two clone runs, one folder, one page.
- **`x-ios`, fifteen screens on @Yilin0x.** Switching to a professional
  account, Explore and its location setting, push notifications, and a Space
  reminder. The cover is the finished profile.
- **`instagram-ios`, twenty screens.** Eight user-profile states, six of the
  Following/Favorites feed and Reels, a live-account board, and Instagram's
  five home-screen widgets.
- **`perplexity-ios`, fourteen screens.** The onboarding flow end to end, then
  the Dynamic Island in four Live Activity states.
- **Thirteen canvases carry a brand kit.** About 1,265 first-party pictures in
  surface rows, each with a source and whether the company published it. The
  welcome page is four rows, grouped by what the app is for.

## v1.2.0

2026-09-12. A board stops being something only the canvas can show: it has a
web page of its own, at an address a link or a Figma importer can reach. A
glyph traced off a capture can be fitted back into a drawing. Two more
example canvases.

### The canvas

- **A board is a web page with an address.** The button in the corner of the
  inspector's preview opens the board it is showing as an ordinary document at
  `/board/<slug>/<file>.html`, and the top bar opens every board of a page in
  one scrolling document at `sheet.html?canvas=<slug>`, laid out in
  `layout.json`'s rows with the canvas's own captions. This is where to read
  type at the size it ships at rather than at whatever the canvas is zoomed to.
  They are real addresses rather than the `blob:` URLs the first version handed
  out, so a page can be linked, copied, reloaded, and read by the browser
  extensions that refuse a generated page outright. The sheet is its own entry
  in the build too, so reading a board no longer downloads tldraw to do it.
- **Export to Figma is a button that says so.** The top bar's external-link
  arrow is now a chip with Figma's mark, and the sheet it opens walks through
  the route that works: install the html.to.design extension, capture the page
  with it, then paste into a file. The extension is what the route turns on,
  because the Figma plugin's own servers cannot reach localhost. The sheet
  leaves the Foundations row out, because a token sheet is evidence behind the
  screens rather than a screen to import beside them.

### The toolkit and the skills

- **`refkit refit` turns a traced contour back into a drawing.** A glyph traced
  off a capture has the right shape and the wrong object: hundreds of implicit
  linetos, visibly faceted where a board draws it large, while every delta
  reads 0, because a mean delta cannot see faceting that stays inside a pixel.
  `refit` resamples the contour, finds its corners by turning angle and fits
  each run as a line, an arc or a cubic, leaving the file's `viewBox`
  byte-identical.
- **`clone-prototype` says when a glyph has to be redrawn, and how far to take
  it.** The half that cannot ship as code is now `references/glyphs.md`: most
  interface glyphs are a composition of primitives, because that is how they
  were drawn, so the drawing is written with its dimensions as parameters and
  the parameters are fitted against the trace, and the reference says how to
  find what the glyph actually is and where to stop. Two pitfalls join the
  list, both of which cost a run here: shipping a trace on a board that draws
  it large, and measuring a stroke off a diagonal edge, where a 45° bar traces
  about √2 thicker than it is.

### Example canvases

- **The `notion-ios` example canvas gains nine screens and a generator.** The
  four-screen flow for adding a data source to a database, and the five-screen
  flow for adding an account, both measured against native @3x captures. The
  folder's boards were hand-written HTML before, so a token could not be
  changed in one place; `gen.py` is now the only source of truth for all
  sixteen. Two tokens moved with the re-measurement: the sheet inset is 68
  rather than 71, and the type stack names SF Pro's Text cut outright, since
  `-apple-system` resolves to the Display cut and renders about 4% narrow.
- **And three more: the Plus & Notion AI purchase sheet.** Monthly selected,
  yearly selected, and the StoreKit "You're all set" alert over the dimmed
  sheet with the subscribe button spinning. The sheet is Apple's paywall
  rather than one of the app's own, so its metrics sit in a board-local block
  after the shared tokens. The cat and the sparkle strokes on the feature card
  are the folder's first `artgen` assets: `gpt-image-2` redraws of the
  capture's crops, keyed and scored in `art-gen.json`.
- **`apple-app-store`, nine iOS 26 App Store screens.** Native iPhone 16 Pro
  captures rebuilt as one `gen.py`, with a token board and two evidence boards
  behind 80 tokens. The app icons are the originals from the iTunes lookup API
  and the editorial art is a crop at its measured box, including an Arcade hero
  that ends at the photograph's own fade and is filled, where the headline
  covered it, from EA's published key art registered onto the page. The status
  bar is `templates/gen.py`'s byte for byte, moved as a group for the wider
  frame, which is now what the skill asks for. It is the head of Apple's own
  row on the welcome page.
- **`grok-ios`, fifteen Grok iOS screens.** The widget and its guide, the
  paywall, the Terms update and its sign-out, the Grok Bot sheets, the home
  with its composer, the voice picker and the Settings sheet at three scroll
  positions, in the order the app walks them. Every icon is a crop of the
  capture but seven: the three side glyphs on 04, and the four marks on 07's
  chips, which are the publishers' own SVGs placed on a box fitted against the
  capture rather than anything traced or redrawn.

## v1.1.1

2026-09-09, one fix.

- **A two-finger pan over a board pans the canvas.** It used to send the browser
  back a page instead, because a wheel event inside a board's iframe never
  reaches the canvas and so never gets stopped. Every board now stops the
  browser's overscroll in its own document, which is the only place that can.

## v1.1.0

2026-09-09. The canvas became something a review can point at, and the plugin
became something six products can install and one workflow can release.

### The canvas

- **An inspector panel.** Select a board and read its layers: the image behind
  a layer, its measured colours, and the icons and inline SVGs named as vector
  assets rather than as anonymous shapes.
- **Every board has an address.** `?canvas=<slug>` opens a page and
  `?canvas=<slug>#<file>` opens one board of it in the inspector, with the
  camera on it. That is the link to give when pointing at one screen.
- **Comments that live in the repo.** A board can be commented on and its
  status set, both stored beside the boards as `comments.json`, so a review
  survives the browser it was written in. The hosted canvas can be commented on
  too.
- **The dev server watches the boards directly** (#52, #53). Rewriting a board
  reloads the page onto the new HTML instead of needing the server restarted,
  a board folder added or removed re-indexes on its own, and writes under
  `scratch/` and `assets/refs/` no longer interrupt a generator or a clone run.
- Fixes: the status badge keeps its corner in a built canvas, the rail's
  collapse handle sits on its divider, a pan is a pan wherever the cursor is,
  and a malformed board link fails as a board that does not exist.

### Install

- **A 6.7 MB install**, against 151 MB, by declaring the marketplace with
  `sparsePaths` in `~/.claude/settings.json`. The README has the recipe.
- **Codex installs as a plugin**, not only as symlinked skills. It always
  could — Codex falls back to the Claude manifest — but nothing said so:
  `codex plugin marketplace add ReScienceLab/super-prototyping` then
  `codex plugin add super-prototyping@super-prototyping`. The repo now also
  ships the catalogue Codex prefers, so it reads a manifest meant for it.
- **Six products install it with their own command**, each from a manifest
  written for it: Claude Code, Codex, WorkBuddy/CodeBuddy
  (`.codebuddy-plugin/plugin.json`), Hermes (a root `plugin.json` in the
  portable Agent Plugins v1 format), Pi (`pi install git:…`, which reads
  `skills/` with no manifest at all), and `npx skills add` for Trae and the
  rest. One skills tree behind all of them.
- **`install-skills.sh` covers the products that have no install command.** It
  now links into CodeBuddy, Trae and Trae CN as well as Codex, Hermes and Pi,
  and it says which of them it found.
- **The plugin and the toolkit say when they have drifted.** `sp-canvas start`
  prints the `uv tool install` line that moves the toolkit to the plugin's
  version, and `sp-canvas --version` and `sp-canvas root -v` answer "which
  release is this".

### Releasing

- Releases are made by dispatching **Release** with a version: it runs the
  gates, bumps every manifest, and opens the release PR; merging that PR tags
  `super-prototyping--v<version>` and cuts the GitHub Release from this file.
- **Validate** runs the manifests, the canvas (lint, test, build) and the
  toolkit tests on every pull request.
- The procedure, including what the version number means and what to do when a
  step fails, is "Cutting a release" in `CONTRIBUTING.md`. This file is the log
  it publishes from.

## v1.0.0

2026-09-05, the release that packaged this repo as a plugin. The plugin ships
code and a project keeps only its own boards, so installing it does not drop
this repo's example canvases into your project. Installing is two halves: your
product's own plugin command for the skills and the canvas, and one
`uv tool install` for `refkit`, `artgen` and `sp-canvas`. `sp-canvas` starts
the canvas against whichever boards directory it is pointed at, and the canvas
keys its saved state per project, so two projects do not share a camera or a
comment. Declaring the marketplace with `sparsePaths` installs only the
directories you name, for anyone who wants the canvas and the toolkit without
the worked examples.

Tagged after the fact, at `0286f19`, where that work ended. Nine pull requests
landed on `main` between then and the tag being cut, so this tag holds the
packaging and not the canvas work that followed it.
