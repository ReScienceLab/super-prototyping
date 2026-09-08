# A comment on a mockup belongs next to the mockup

2026-09-08. A review of a board had nowhere to land but a chat window, where it came apart from
the thing it was about within a day. Now it lands in the board's folder: `<slug>/comments.json`,
committed with the boards, pinned to the board it names.

## What changed

- **The file is the source of truth, the tldraw store is a working copy.** Comment records are
  document records, so IndexedDB persisted them beside the shapes; without a rule the two would
  diverge and a thread deleted in Git would come back on every machine that had already seen it.
  So the file wins on load, unconditionally, applied through `mergeRemoteChanges`: not the
  user's own edit, not on their undo stack, and not written straight back by the listener.
- **Two things a record cannot carry into a file.** Page ids are minted per browser, so the
  folder slug plays that role and the page id is stripped on write and re-attached on load. Author
  ids are made up here rather than issued by anything, so each file carries the names of the
  people in it. That is what turns an id back into a name in someone else's checkout.
- **Soft-deletes are pruned on write.** They exist for a sync server to reconcile, and there is
  no server. A board whose last comment was deleted is still written, as an empty file, or the
  removed comments would load back in.
- **A thread is anchored to the board shape, not to a point on the page.** That is what moves it
  with a `layout.json` reflow. The anchor is a normalized offset within the board's bounds,
  unclamped at both ends, so a pin dropped in the margin keeps that spot *and* still moves with
  the board. The comment tool's own hit-test looks straight through the boards, which are locked
  shapes, so it never resolves one itself; `anchorToNearbyBoard` does it after the fact, for a
  new pin, for a pin dragged onto a board, and once over the committed files on load. That last
  pass is derived from the file, never written back: taking it as an edit would have a hosted
  visitor who touched nothing write the board into their browser and stop seeing every later
  deploy of it.
- **Identity is a GitHub handle, typed once, kept in localStorage.** There is no login and there
  is not going to be one. The handle rather than a free-typed name because it is what a pull
  request will call the same person, and because the avatar comes with it: `github.com/<login>.png`
  serves it without a token, where `api.github.com` would spend the unauthenticated rate limit.

## The hosted canvas

The same tool, everywhere, with a different sink: a dev server writes the file through
`/__sp/comments`, a built canvas keeps whole files per slug in localStorage over the committed
ones. Commenting was hidden on the hosted site first (`86f2444`) and that lost: someone trying
the canvas should get to try the thing it is for, and a note in their own browser costs nothing.

## The license

Commenting is a licensed tldraw feature. Without a key `CanvasComments` renders nothing in
production, not the composer and not the committed threads either, so the hosted canvas would
offer a comment tool that does nothing. `VITE_TLDRAW_LICENSE_KEY` is set on the `super-prototyping`
Pages project, production and preview both, and Vite's default prefix inlines it; no widened
`envPrefix` is needed and the one added first was removed.

Two things worth knowing before December:

- **tldraw decides "development" from the runtime host**, not from the build. Loopback addresses,
  `.localhost` and any plain-`http:` origin get every feature unlicensed. A production build served
  from `127.0.0.1` therefore proves nothing about the deployed site; that cost a wrong
  verification here. Only the deploy can tell you.
- **The current key is an evaluation license and expires 2026-12-12, with no grace period.** On
  that date the hosted canvas stops showing comments at all until the key is replaced.

## Not changed

- Reading committed threads on a dev server needs no key: development is unlicensed by design.
- Board status and clone stay dev-server-only. They edit the repo; commenting is the one thing
  that was worth giving a reader without one.

## Checked

Dev server: a thread written on the canvas appears in the inspector and lands in the folder's
`comments.json`; one written in the inspector appears on the canvas; deleting the last comment
leaves an empty file rather than resurrecting the committed ones; a `layout.json` reflow carries
the pins with the boards. Built canvas on a loopback host: the same, into localStorage, which is
also the test that could not have caught the license problem, and did not.
