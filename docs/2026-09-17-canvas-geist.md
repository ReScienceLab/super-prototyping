# The canvas panels move to Geist, and go dark

2026-09-17. The chat panel and the inspector are drawn in Vercel's Geist — its scale, its
fonts, its icons — and the whole canvas opens dark. The adoption was half-built already: the
panel's CSS named `Geist Variable` in a `font` shorthand and carried nineteen steps of the scale
under Geist's own `--ds-*` names. But the fonts were never loaded, the steps were hex
approximations of oklch values, light-only, scoped to the panel — and another two dozen colours
around them were plain hex literals owing nothing to the system. This finishes it, and settles
what a design system means for something that ships as a plugin.

## The tokens are transcribed, not installed

There is no design-system package on the other side of an install. The plugin ships skills and a
Vite app; a user's project holds boards. So the scale is spelled out in `index.css`, at the
values Vercel publishes — `vercel.com/geist/vercel-brand.css`, GeistCN snapshot
`4f5d9c0da9ad400918e15083c83626572f19fd9b` — under Geist's own names, because a path lifted out
of its icon set reads the same here as it does there. That file namespaces everything `--vbg-*`
for a report site; the values are Geist's, the names are not, and it is the values that were
wanted.

Geist publishes 100, 400, 700, 900 and 1000 of a hue and nothing between. The status badge wants
two presses' worth of ground between its 100 and its 400, and the four missing steps were sitting
here as hex picked by eye. They are now `color-mix(in oklab, …)` along the scale's own ramp — 33%
and 66% of the way from the 100 to the 400, in the space the scale is already defined in — so
they follow the published ends instead of being a guess that has to be re-guessed per theme.
Measured in the browser rather than assumed, since `color-mix()` is being handed `light-dark()`
arguments: `--ds-blue-200` computes to `oklab(0.261069 -0.0186247 -0.0840343)`, a third of the way
from blue-100's L 0.2217 to blue-400's L 0.341.

The tokens live on `:root`, not on `.sp-panel` where they were. The top bar's chips are part of
the same system and sit outside the panel.

## Dark is one word

Every step is a `light-dark()` pair and `color-scheme: dark` on `:root` picks which half every
token resolves to. No second stylesheet, no class on `<body>`, no theme provider. A light theme
is the same file with a different word, the day anyone wants one.

tldraw gets `editor.user.updateUserPreferences({ colorScheme: "dark" })` on mount rather than a
hand re-skin of its chrome. A dark rail against tldraw's near-white ground is two apps in one
window, and the ground is the larger half of what the window looks like; tldraw already has the
dark theme its own components were designed for, and one line asks for it.

That deleted a component. `WelcomeGround` blacked out the canvas under the welcome board because
the board's full-bleed line work read as a slab on tldraw's near-white ground — an effect, a
class toggle and a `--tl-color-background` override for a problem that was the light ground.
tldraw's dark ground is `hsl(240 5% 6.5%)`, within a shade of the override, so the override is now
the thing it was correcting for.

## Five colours do not invert

Two kinds of thing must not follow the theme, and both are visible on screen next to things that
do:

- **Grounds for the board's own artwork.** The four checkerboard stops behind a thumbnail and the
  `#1c1c1e` behind a photo. A checkerboard exists so a cut-out with alpha can be told from a
  white rectangle; inverted with the panel it is a dark check behind dark artwork, which defeats
  the only reason it is there. Artwork that inverts with the UI is artwork nobody can check.
- **Text on the accent fill.** `--ds-blue-700` is the same blue in both themes, so white on it
  stays `#ffffff` rather than `var(--ds-background-100)`, which would have turned black under a
  selected row.

The two badge legibility rings went the other way and became relative:
`color-mix(in oklab, var(--ds-background-100) 66%, transparent)`. They hold a badge off whatever
board is behind it, so they belong to the panel, not to the board.

The menu shadow's 1px ring is the token rather than the published `#00000014`. On a dark ground a
black ring is no edge at all, and a menu with no edge is a menu floating in the panel; the ring
is `--ds-gray-alpha-400`, whose dark half is white at 14%.

## Sixteen path strings, not a package

`geistIcons.tsx` is sixteen `d` strings and one wrapper, replacing eighteen hand-drawn SVGs of
mixed geometry and stroke weight. Geist draws every icon as a single filled `currentColor` path
on a 16×16 grid — no strokes — so one component covers all of them and `size` is the only knob.

`geist-icons` on npm is a third-party mirror: all 455 icons in one 600K ESM module, one
maintainer. Sixteen path strings are smaller than the dependency, let alone the trust. If the
panel ever wants fifty of them, that is the day to reconsider.

Two functions went away with the icons rather than being kept next to them. `LayerIcon`'s
five-branch switch is a `Record<LayerKind, …>` of five Geist glyphs, and `Caret` picks between
`ChevronDownSmall` and `ChevronRightSmall` instead of rotating one path.

## The fonts are bundled

`@fontsource-variable/geist` and `-geist-mono`, imported in `main.tsx`, not linked from Google
Fonts. The canvas is mostly a local dev server, and a board that silently falls back to the
system font is a board that measures differently — the one thing this repo's boards exist to be
right about. Fontsource splits each family by `unicode-range`, so only the latin subset is ever
fetched.

One trap, worth writing down: the CSS `font` shorthand resets `font-feature-settings`,
`font-kerning`, `font-variant-numeric` and `font-optical-sizing`. The panel sets all four, and
they have to come after the shorthand or they are silently dropped.

## Left out

- A light theme, and anything that switches between the two. `color-scheme` is the switch; there
  is nowhere yet for a user to reach it, and a toggle with no second opinion behind it is a
  preference nobody asked for.
- `sheet.css` and `brand.css`, which both pin `color-scheme: light` on purpose: a contact sheet
  and a brand kit are documents about boards, printed on white.
- The brand marks — Claude, Codex, Figma, the brand-kit palette — which are other people's
  identities at their own colours, and the welcome board's own art.
- tldraw's chrome beyond the one preference line. Its dark theme is the vendor's; restyling it to
  Geist would be a per-release maintenance cost for a toolbar nobody is looking at while reading
  a board.
