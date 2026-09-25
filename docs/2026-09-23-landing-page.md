# The domain is a download page; the canvas moves to /demo

Superseded in part by `2026-09-25-project-urls.md`: the canvas is at `/p/<id>` now, and `/demo` redirects there.

2026-09-23. `prototyping.rescience.com` was the canvas itself. It is now the
page that tells someone what Super Prototyping is and hands them a build, and
the canvas is the demo under `/demo/`.

## The page is its own repo

`ReScienceLab/super-prototyping-landing`: one `public/index.html`, a Worker,
and a deploy workflow. It is private for now.

A landing page has nothing to do with a release, changes for reasons this repo
does not have, and would make every `git log` here noisier for it. Kept
separately it also stays out of `canvas-dist.tgz` and out of the app. This is
what the projects with the same shape do — Hermes, Ghostty, and OpenDesign,
which pulled its page out of the product repo after a year of the opposite.
A monorepo is the other answer, but the ones that take it (tldraw, OpenCode)
are shipping npm packages, not a page beside a desktop app. Docs stay with the
code either way; a marketing page is the thing that leaves.

The page asks GitHub for `releases/latest` on load and rewrites its download
buttons from the assets it finds, so a new release needs no edit there and
`release.yml` needs no change here. The hard-coded hrefs are the fallback for
when that call fails.

## Why `/demo/` is a proxy, not a redirect

The Worker serves the page from its own assets and passes `/demo/*` through to
the canvas's Pages deploy. Three things made that the cheap answer:

- The canvas already builds with Vite `base: "./"`, so every board, asset and
  `/__sp/index.json` it asks for is relative to the page's own address. It is
  served under a path without being rebuilt or knowing about one.
- The Pages project keeps building this repo, untouched. Building the canvas
  inside the landing repo instead would tie a page edit to a canvas build, and
  the release tarball ships without the example boards anyway.
- A subdomain plus a redirect was the alternative. It works, but `/demo` is
  the address that was wanted, and the redirect stays available as the
  one-line fallback if the proxy ever becomes a nuisance.

The one sharp edge: Pages answers `/board/<slug>/<file>.html` — which is how
the canvas asks for a board — with a 308 to its extensionless twin, at a path
from the root it believes it is served at. The Worker puts the `/demo` prefix
back on any same-origin `Location`, or the browser walks out of the demo on the
first board it opens. Found by opening a board through the proxy, not by
reading.

Old `?canvas=<slug>#<board>` links, which are in READMEs and issues and in
every board's own share link, are redirected from `/` to `/demo/` by the page.
The fragment rides along on its own: a browser keeps it when the new address
carries none.

## What changes here

Only addresses: `SECURITY.md`, `canvas/index.html`'s og and twitter tags, the
issue templates, `canvases/spotify-ios/README.md`, and the test fixture in
`canvas/src/canvasUrl.test.ts`, which is now a prefixed root so the tests fail
if anything ever writes an address from the domain root instead. The plugin
manifests' `homepage` stays at the bare domain — that is now true in a way it
was not before.

`canvas/src/canvasUrl.ts` needed nothing: it builds on `BASE_URL` and on the
current address, and `frameUrl`/`windowUrl` only swap the last path segment.
