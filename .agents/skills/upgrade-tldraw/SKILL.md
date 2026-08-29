---
name: upgrade-tldraw
description: Upgrade the pinned tldraw SDK in canvas/ to a newer upstream release and repair this repo's local extensions against it — custom ShapeUtils, the custom tool, UI component overrides, and the agent bridge. Use when asked to update/bump tldraw, when the canvas breaks after a dependency change, when adopting a new tldraw feature, or when checking how far behind upstream this repo is.
---

# Upgrade tldraw

The canvas is a thin layer on the tldraw SDK: ~700 lines in `canvas/src`
against ~20 imported symbols. An upgrade is mostly checking those, not
re-reading the app.

```bash
cd "$(git rev-parse --show-toplevel)/canvas"
node -p "require('./node_modules/tldraw/package.json').version"   # installed
npm view tldraw version                                            # latest
npm outdated
```

## What this repo touches

Everything that can break lives in these four surfaces. Nothing else in
`canvas/src` knows tldraw exists.

| Surface | File | tldraw API |
|---|---|---|
| Custom shape | `CanvasFileShapeUtil.tsx` | `BaseBoxShapeUtil`, `RecordProps`, `T`, `HTMLContainer`, `useIsEditing` |
| UI overrides | `canvasChrome.tsx` | `TLComponents`, `TLUiAssetUrlOverrides`, `DefaultActionsMenu`, `DefaultToolbar`, `DefaultStylePanel`, `TldrawUi*` |
| Document bootstrap | `App.tsx` | `Editor`, `createShapeId`, `toRichText`, `TLTextShape`, `TLPageId`, page + shape CRUD |
| Agent bridge | `agentBridge.ts` | `Editor`, `TLShapeId`, `TLShapePartial` |

`CanvasFileShapeUtil` is the fragile one: `ShapeUtil` is the API tldraw
reshapes most often between majors, and a props-schema change there also
invalidates every document already in a browser's IndexedDB.

## Procedure

1. **Read the release notes first**, not the diff — <https://tldraw.dev/releases>
   and the GitHub releases for every version between installed and target.
   Note anything touching `ShapeUtil`, `StateNode`, rich text, UI components
   or `Editor` methods.
2. **One version step at a time** across a major. `npm i tldraw@<version>`,
   then run the gate below before taking the next step. Skipping straight to
   the newest release turns three small breakages into one unreadable one.
3. **Let TypeScript find the breakage.** `npm run build` type-checks the whole
   app; the symbols above are exactly what it will complain about.
4. **Fix in place, don't rewrite.** The local extensions are small and
   deliberate — port them to the new API, do not regenerate them from a
   tldraw example.
5. **Bump `PERSISTENCE_KEY`** in `App.tsx` *only* if a shape's props schema
   changed or tldraw's own store migrations cannot carry old documents
   forward. It discards every persisted hand-drawn annotation, so it is a
   last resort, not routine hygiene.
6. **Commit the `package-lock.json`** with the change. `npm ci` reproducing
   the exact tree is what makes a breakage bisectable.

## Gate

```bash
cd "$(git rev-parse --show-toplevel)/canvas"
npm run lint && npm test && npm run build
```

Green is necessary, not sufficient — tldraw breakage is usually visual.
Then, in a **fresh browser profile** (an old IndexedDB document masks
migration bugs):

- Every board page loads with its frames, headings and captions in place.
- The top-bar refresh button rebuilds a board cleanly.
- The styles panel toggles from the toolbar.
- `window.snapCanvas.describe()` and `dispatch({ op: 'get' })` still answer.
- Then reload with the *existing* profile and confirm old documents survive.

## Licensing — check on every major

The tldraw SDK is **not** OSI open source. It ships under the tldraw license
(`node_modules/tldraw/LICENSE.md`): free to use with the tldraw watermark
visible, and a paid business licence to remove it. This repo's own Apache-2.0
does not cover the SDK, and anyone shipping this canvas is bound by tldraw's
terms.

Re-read that file on every major upgrade, and never remove or obscure the
watermark to "clean up the UI" — that is a licence violation, not a style
change.

## Also worth pulling from upstream

The SDK moves faster than this repo. When reading release notes, look for
features that would let local code be **deleted** — a built-in equivalent of
`layoutRow`, a first-class frame/page API, native rich-text helpers.
Deleting a local extension in favour of an upstream one is the best possible
outcome of an upgrade; adding a local wrapper around a new upstream API is
the worst.
