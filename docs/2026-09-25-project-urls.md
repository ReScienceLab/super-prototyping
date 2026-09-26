# A project's address is /p/&lt;id&gt;/&lt;name&gt;; /demo is gone

2026-09-25. Every example and every project shared to the community opens
read-only on the site, at `superproto.dev/p/<id>/<name>`. The community page is
the way in, and its **Open** goes there for all of them. `/demo/` is gone, and
since 2026-09-26 its old addresses 404.

## The shape, after Figma

Figma's file link is `figma.com/design/<key>/<File-Name>?node-id=…`: a type, a
key that finds the file, a name nothing reads, and the node in the query. Ours
maps onto it one for one:

| Figma | here | where |
|---|---|---|
| file | project | `/p/<id>` |
| file name | project name | `/<name>`, ignored |
| page | canvas | `?canvas=<slug>` |
| node | board or picture | `#<file>` |

- **`/p/`, not `/project/` or `/canvas/`.** It is already the desktop app's
  address for a local project (`/p/<name>/`, server/projects.ts), so the same
  canvas, with the same relative base, runs under both, and a link reads the
  same in either. A canvas is a page of a project, not a thing with its own
  address, so it belongs in the query, as it already was.
- **The id finds the project; the name is for people reading the link.**
  Renaming a project breaks no link, and a link with the wrong name still
  opens. The canvas keeps the name it was opened with on the address as it
  moves (AppShell.tsx). An example once used its folder name as its id,
  `/p/claude-ios`; since 2026-09-26 every example is a community project with
  a UUID like any other (2026-09-26-projects-on-demand.md).
- **A community project has one link, wherever it is open.** In the app it is
  at `127.0.0.1:<port>/c/<id>/`, which opens nowhere else, so every Copy link
  on it hands out the site's `superproto.dev/p/<id>/<name>` with the same view
  and board (`shareUrl`, canvasUrl.ts), and a link off the site pasted back into
  the app still names its boards (`sameProject`). A local project's links stay
  its own `127.0.0.1` address: it is on no site to link to.
- **One canvas, many projects.** A project's page is the one build every
  project shares; only its index differs. The build writes one per project at
  `p/<id>/__sp/index.json` (vite.config.ts), naming it the project, so the
  window opens on it rather than on a home page. A project's boards are under
  `p/<id>/board/`, since its slugs can be anyone's.

## Where each piece lives

- **This repo's build** writes the per-project indexes. It fetches the
  community repo's projects only on Cloudflare Pages (`CF_PAGES`); the app and
  `sp start` build the same canvas and have no use for other people's
  projects. A failed fetch fails the deploy rather than publish a site that has
  quietly lost them.
- **The site's Worker** (`super-prototyping-landing`, `src/worker.js`) maps
  `/p/<id>/…` onto the Pages deploy: the window page for the project's address
  and its name, the project's index, cover and boards from under
  `/p/<id>/`, and every other file from the root. It asks Pages for a page's
  extensionless twin, since Pages answers `.html` with a 308 that would walk the
  browser out of `/p/`. It puts the project's cover and address in the page's
  link preview.
- **Sandbox.** A community project's boards are other people's HTML, served
  from the site's origin, so `canvas/public/_headers` gives `/p/:id/board/*`
  the `sandbox` CSP the app's server gives every board.

## Old addresses

`/demo/…?canvas=<slug>` and `/demo/board/<slug>/…` first 301'd to
`/p/<slug>/…`, and everything else under `/demo` to `/community`. On 2026-09-26,
the morning 1.6.4 shipped, the redirect was removed rather than
kept forever for links few people hold. Everything under `/demo` now 404s.

## A shared project appears when Pages rebuilds

Pages builds this repo on a push to main. A project merged into the community
repo is listed at once, from its `index.json`, but its page exists only after
the next build. A Pages deploy hook, called by the community repo's index
workflow, closes that gap.

## What the web does not show yet

A shared project's own canvas, `canvas.json` and its `files/`, is not on its
page: the hosted canvas reads no canvas content (`canvasContent.ts`), so the
page shows the boards alone. And a project in the community repo without a
`project.json` or `thumbnail.png` fails the Pages build, which the community's
CI refuses to merge; one that got in some other way blocks canvas deploys until
it is reverted.

## Next

The app ships every example today. With every one of them online, it need not:
the home page can list the community's instead, and the install gets that much
smaller.
