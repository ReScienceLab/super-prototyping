# A project's address is /p/&lt;id&gt;/&lt;name&gt;; /demo is gone

2026-09-25. Every example and every project shared to the community opens
read-only on the site, at `superproto.dev/p/<id>/<name>`. The community page is
the way in, and its **Open** goes there for all of them. `/demo/` is gone; its
old addresses redirect.

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
  moves (AppShell.tsx). An example's id is its folder name, which already is a
  name, so its address has none: `/p/claude-ios`.
- **One canvas, many projects.** A project's page is the one build every
  project shares; only its index differs. The build writes one per project at
  `p/<id>/__sp/index.json` (vite.config.ts), naming it the project, so the
  window opens on it rather than on a home page. An example's boards stay where
  they were, `board/<slug>/`, rather than a second copy per project: they are
  384 MB. A shared project's boards are under `p/<id>/board/`, since its slugs
  can be anyone's.

## Where each piece lives

- **This repo's build** writes the per-project indexes. It fetches the
  community repo's projects only on Cloudflare Pages (`CF_PAGES`); the app and
  `sp start` build the same canvas and have no use for other people's
  projects. A failed fetch fails the deploy rather than publish a site that has
  quietly lost them.
- **The site's Worker** (`super-prototyping-landing`, `src/worker.js`) maps
  `/p/<id>/…` onto the Pages deploy: the window page for the project's address
  and its name, the project's index, cover and shared boards from under
  `/p/<id>/`, and every other file from the root. It asks Pages for a page's
  extensionless twin, since Pages answers `.html` with a 308 that would walk the
  browser out of `/p/`. It puts the project's cover and address in the page's
  link preview.
- **Sandbox.** A shared project's boards are other people's HTML, served from
  the site's origin, so `canvas/public/_headers` gives `/p/:id/board/*` the same
  `sandbox` CSP as `/board/*`.

## Old addresses

`/demo/…?canvas=<slug>` and `/demo/board/<slug>/…` are that example, and 301 to
`/p/<slug>/…`. The bare `/demo/` listed the examples, which the community does
now, so it and everything else under `/demo` 301 to `/community`.

## A shared project appears when Pages rebuilds

Pages builds this repo on a push to main. A project merged into the community
repo is listed at once, from its `index.json`, but its page exists only after
the next build. A Pages deploy hook, called by the community repo's index
workflow, closes that gap.

## Next

The app ships every example today. With every one of them online, it need not:
the home page can list the community's instead, and the install gets that much
smaller.
