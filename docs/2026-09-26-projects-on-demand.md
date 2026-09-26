# Community projects on demand; the app bundles none

2026-09-26. The app stopped shipping this repo's canvases, about 420 MB of a
735 MB app, which it called examples. Every one is now a community project, reached by pull request
like anyone's. The app opens any community project read-only as a tab, and
fetches or copies one only when asked.

## What a user can do with a project they do not have

1. **Preview it**, read-only, on the site (`superproto.dev/p/<id>/<name>`) or
   in the app (`/c/<id>/`).
2. **Add its boards to the agent panel**, in the app, the way they add their own.
3. **Copy it into their projects**, with `sp duplicate <id>`. That is the only
   way to change one.

An agent reads one with `sp fetch <id>`, which prints a folder holding a copy.

## One source per piece of data

| Data | Source | Writer |
|---|---|---|
| The list | the community repo's `index.json` | its CI |
| A project | the community repo's `projects/<id>/` | its pull request |
| The download | release `archives`, `<id>.tar.gz` | the community CI, on merge |
| The preview | Pages, built from the community repo | the Pages build |
| An agent's copy | `~/.cache/super-prototyping/projects/<id>/` | `sp fetch` |
| A user's copy | `~/Documents/Super Prototyping/<name>/` | `sp duplicate`, then the user |

## In the app: a read-through proxy, not the site in a frame

The app drives its canvas through `frame.contentWindow.spCanvas`, and the
canvas hands a selection to the agent panel through `window.parent`. The
browser blocks both across origins, so the site in a frame could preview a
project but not do the second thing on the list.

So the local server has one route, `/c/<id>/` (`server/projects.ts`). The page
is the app's own. Only `__sp/index.json` and `board/**` are fetched from
`superproto.dev/p/<id>/` and passed through, and nothing is kept. The site's
index already says `served: false`, which is the canvas's read-only mode; the
proxy adds `community: true`, which the window reads as a tab of its own rather
than a page of the site's (`local()`, `canvasIndex.ts`). A tab is the ordinary
project tab at `/c/<id>/`.

- **The allow-list.** The id must be a UUID, only those paths go through, and
  only `superproto.dev` is ever fetched, so the local server cannot be made to
  fetch anything else. Boards keep the `SANDBOX` policy.
- **`/c/`, not `/p/`.** `/p/` is always the user's and writable; `/c/` is always
  read-only. Neither can shadow the other.
- **Boards for the agent panel** are drawn from a file (`/__sp/shoot`). Under
  `/c/` the board is fetched into `os.tmpdir()/sp-community/<id>/` first, and
  rewritten only when it changed, which is what redraws it.

## Archives

The community CI tars each changed project into the `archives` release on
merge, replacing the asset in place. The URL comes from the id and the index's
`updated` is its version, so the index carries nothing new. There is no
checksum: the index and the archive share one trust root, GitHub over HTTPS,
and gzip's CRC catches truncation. The release's `archived-at` asset records
the commit its archives are of, so a run cancelled by the workflow's
concurrency leaves nothing out.

`sp fetch` refuses to extract without `tarfile.data_filter` and over the 200 MB
cap `sp pack` enforces. `sp duplicate` extracts into a temporary folder and
renames it in, so it never merges into or overwrites a project.

## This repo's canvases

`canvases/<slug>/` in this repo stays their source. `canvases/community.json`
maps each to its community id. They reached the community in one pull
request, whose author is the maintainer, so the CI rule that a PR's opener is
its author holds with no exception. The app bundles only `templates`.

The hosted build still emits them under their old slugs, so
`superproto.dev/p/claude-ios` keeps working without a redirect table.

## Ceilings

- **Cloudflare Pages deploys at most 20,000 files.** At this repo's density
  that is roughly 130 to 150 projects. Past it, the site has to serve boards
  from somewhere other than the Pages deploy, R2 being the obvious place.
- **Every Pages build downloads the community repo**, which grew by about
  430 MB with this repo's canvases.
- **No offline handling** (#186): with no network, a community project does
  not open and `sp fetch` fails with the error as it is.
