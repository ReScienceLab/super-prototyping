# Apple System Icon Set

> For anyone assembling a Home Screen mock, a design system, or a talk about iOS's visual language, this is Apple's own iOS 26 / macOS Tahoe app icons, in both appearances, ready to drop into a board without redrawing them.

## Problem
A designer prototyping an Apple-platform screen needs recognizable, accurate app icons — Camera, Settings, Music and the rest — in both light and dark appearance, and otherwise either redraws them by hand or hunts down individual exports one icon at a time.

This folder is not a product's screens; it is the asset library other boards in this repo (and elsewhere) draw icons from. The PRD below is scoped to that.

## Users
- **Primary: whoever is building another canvas or board** in this repo, or another project, that needs an app-icon row or a Home Screen dock.
- **Secondary: anyone auditing** what icons exist and how they look across the two appearances.

## Value
One place holding all 43 icons, correctly masked, in both appearances, so a board references an existing file instead of sourcing art per icon.

## Scope
**In:** the 43 native icons at default and dark appearance, tiled for browsing.

**Out:** the tinted appearance (present in the source Figma file but not pulled in), any icon Apple doesn't ship in this set, names/search/filtering, and any interactive picker — this is a static reference sheet, not a tool.

## Success
Observable signs it works: another canvas in the repo can find and reuse an icon here without a fresh export; the dark set's icons read cleanly against the canvas background at the sizes other boards use.

## Screens
| Screen | Purpose | States |
|---|---|---|
| Default appearance | Reference sheet of all 43 app icons, five across | loaded, all 43 shown (not mocked: search/filter, tinted appearance) |
| Dark appearance | The same 43 icons in the dark-mode art | loaded, all 43 shown (not mocked: search/filter, tinted appearance) |

The two boards are peers; there is no navigation between them beyond switching boards on the canvas.

## Open questions
- 🔴 Whether the tinted appearance (source file node `13:137`) should be pulled in as a third board.
- 🔴 Whether this set should become searchable or filterable rather than a static tile grid.

## Riskiest assumptions
1. Five-across at 80pt is the size other boards actually want to reference. Cheapest test: check whether icon sizes used elsewhere in this repo (e.g. the Home & Lock Screen dock) match 80pt or need a second size tier.
2. Un-compositing the dark set's flattened export recovers the true color everywhere, not just where checked. Cheapest test: spot-diff a few dark icons here against a fresh node-by-node export.
3. Nobody needs the tinted appearance badly enough to justify pulling it in. Cheapest test: wait for a real board request that calls for it before adding it.
