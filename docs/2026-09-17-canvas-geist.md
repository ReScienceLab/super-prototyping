# The canvas panels move to Geist, and go dark

2026-09-17. The chat panel and the inspector are drawn in Vercel's Geist, on its scale, in its
fonts and with its icons, and the whole canvas opens dark. The adoption was half-built already.
The panel's CSS named `Geist Variable` in a `font` shorthand and carried nineteen steps of the
scale under Geist's own `--ds-*` names. But the fonts were never loaded, the steps were hex
approximations of oklch values, light only and scoped to the panel, and another two dozen colours
around them were plain hex literals with no token behind them. This finishes the adoption, and
settles what a design system means for something that ships as a plugin.

## The tokens are transcribed, not installed

There is no design-system package on the other side of an install. The plugin ships skills and a
Vite app; a user's project holds boards. So the scale is spelled out in `index.css`, at the
values Vercel publishes in `vercel.com/geist/vercel-brand.css`, GeistCN snapshot
`4f5d9c0da9ad400918e15083c83626572f19fd9b`, under Geist's own names, so that a path lifted out
of its icon set reads the same here as it does there. That file namespaces everything `--vbg-*`
for a report site. The values are Geist's, the names are not, and the values are the part that
was wanted.

Geist publishes 100, 400, 700, 900 and 1000 of a hue and nothing between. The status badge needs
two steps of ground between a hue's 100 and its 400, and the four missing steps, two per hue, were
hex values picked by eye. They are now `color-mix(in oklab, …)` along the scale's own ramp, 33%
and 66% of the way from the 100 to the 400, in the space the scale is already defined in, so they
follow the published ends instead of being a guess that has to be re-guessed per theme. This was
measured in the browser rather than assumed, because `color-mix()` is being handed `light-dark()`
arguments. `--ds-blue-200` computes to `oklab(0.261069 -0.0186247 -0.0840343)`, a third of the way
from blue-100's L 0.2217 to blue-400's L 0.341.

The tokens live on `:root`, not on `.sp-panel` where they were. The top bar's chips are part of
the same system and sit outside the panel.

## The theme is one declaration

Every step is a `light-dark()` pair and `color-scheme: dark` on `:root` picks which half every
token resolves to. There is no second stylesheet, no class on `<body>` and no theme provider. A
light theme is the same file with `color-scheme: light`, if anyone ever wants one.

tldraw gets `editor.user.updateUserPreferences({ colorScheme: "dark" })` on mount rather than a
hand re-skin of its chrome. A dark rail beside tldraw's near-white ground looks like two apps in
one window, and the ground is most of the window. tldraw already has the dark theme its own
components were designed for, and one line asks for it.

One token of that theme is overridden, and it is the ground itself. `--tl-color-background` is
`var(--ds-background-100)`, because tldraw's dark ground is `hsl(240 5% 6.5%)` and the panels
beside it are black, which is the same two-apps-in-one-window effect at a smaller scale. Geist has
one default ground. Its guidance is "in most instances, you should use Background 1", with
Background 2 "sparingly when a subtle background differentiation is needed", and a rail next to a
canvas is not that case. The panel's own 1px border is what separates them, as it is everywhere
in Vercel's own dark UI. The rule is `.tl-container.tl-theme__dark`, two classes, because the
value it replaces is set on that class and one class would have won or lost on import order.

That deleted a component. `WelcomeGround` blacked out the canvas under the welcome board because
the board's full-bleed line work read as a slab on tldraw's near-white ground. It was an effect, a
class toggle and a `--tl-color-background` override for a problem that was the light ground
itself. tldraw's dark ground is `hsl(240 5% 6.5%)`, within a shade of the override, so the
override no longer changed anything.

## Five colours do not invert

Two kinds of thing must not follow the theme, and both are visible on screen next to things that
do:

- **Grounds for the board's own artwork.** These are the four checkerboard stops behind a
  thumbnail and the `#1c1c1e` behind a photo. A checkerboard exists so a cut-out with alpha can
  be told from a white rectangle. Inverted with the panel it is a dark check behind dark artwork,
  which defeats the only reason it is there.
- **Text on the accent fill.** `--ds-blue-700` is the same blue in both themes, so white on it
  stays `#ffffff` rather than `var(--ds-background-100)`, which would have turned black under a
  selected row.

The two badge legibility rings went the other way and became relative:
`color-mix(in oklab, var(--ds-background-100) 66%, transparent)`. They keep a badge legible
against whatever board is behind it, so they belong to the panel, not to the board.

The menu shadow's 1px ring is a token, `--ds-gray-alpha-400`, rather than the published
`#00000014`. On a dark ground a black ring is no edge at all, and a menu with no edge floats in
the panel. The token's dark half is white at 14%.

## The boards were sitting on white cards

The ground went dark and every mockup became a white card on it. Two different things were painting
that white, and only one of them was in the boards.

Six generators, and raycast's eleven hand-written boards, carried `background:#fff` in the shared
screen `body{}` rule, a drift from `templates/gen.py`, which has never had it. That is data, so it
was fixed as data. The declaration is gone and the boards are regenerated. The `.phone` frame
already paints its own opaque ground, so nothing inside a phone moved.

Every other board declared nothing and was white anyway, because a frame paints an opaque base
background under the document it loads whenever the frame element's colour scheme and the
document's differ; CSS Color Adjust calls it a colour scheme mismatch. The canvas is dark, the
`<iframe>` inherits that, and a board that says nothing is light, so every board was that mismatch.
The first measurement here tried `background` on the element, `allowtransparency="true"`,
`color-scheme: dark` on the element, an injected `html{background:transparent}` and an injected
`html,body{background:none!important}`, saw all five paint `#FFFFFF`, and concluded that only a
`color-scheme: dark` injected into the document after its doctype released the backdrop.
`CanvasFileShapeUtil` shipped that injection, with the root's `color` pinned back to `#000` because
a dark scheme flips it. Review caught what the measurement had missed: the element-side value tried
was the one that matches the canvas, not the one that matches the board. Measured again in Chrome
153, `color-scheme: light` (or `normal`) on the `<iframe>` composites transparent, and `dark` or no
rule at all paints white.

So the frame element says `light`, and the injection is gone. Nothing is written into a board's
markup; its text and form controls keep the colours it was authored with; an injected `:root` rule
no longer outranks a board's own `html{}` rule, which it did, being a class-level selector against
a type-level one; and the doctype is no longer an anchor anything depends on. A board that declares
a dark scheme of its own is the mismatch again and gets an opaque backdrop. None of the 351 do. The
canvas still shows through whatever colour it is, and a light theme of the kind the section above
describes needs no second rule here.

The cost was measured rather than assumed, at the real 478 × 980 and over a white ground, so that
only the release shows. Three of six boards came out pixel identical. The others differed by at
most 11 in one channel, on glyph edges, where subpixel antialiasing gives way to grayscale on a
layer that is no longer opaque. `refkit shoot` renders a board directly rather than through the
canvas, so this changes no measurement or screenshot in the repo.

Both skills gained the rule, in `prototype-canvas`'s `references/layout.md` and in
`clone-prototype`'s hard constraints: no page ground, let `.phone` paint its own, and document
boards are the exception because their black text needs one.

## The icon set, not a transcription of it

`geistIcons.tsx` is twenty names bound to `geist-icons`, replacing eighteen hand-drawn SVGs of
mixed geometry and stroke weight. Geist draws every icon as a single filled `currentColor` path
on a 16×16 grid, with no strokes, so one wrapper covers all of them. It adds exactly two things:
`size={16}`, because the package defaults to 20, and `aria-hidden`, because every glyph here sits
inside a control that already has a name.

Vercel publishes no icon package. `geist@1.7.2` is fonts only, at `./font`, `./font/mono`,
`./font/sans` and `./font/pixel`, and `@vercel/geist-icons`, `@geist/icons` and `@vercel/geist` do
not exist. `geist-icons@1.3.0` is a third-party mirror, MIT licensed with one maintainer, of all
455 marks in one dependency-free ESM module. It was taken on evidence rather than on its name.
Fifteen of the sixteen paths this file had already transcribed from Geist's own docs matched it
byte for byte.

It costs 433 kB gzip, and the reason is worth writing down. Every icon in the module is
`var X = forwardRef(…)` with no `/*#__PURE__*/` annotation, and the package's own manifest says
`"sideEffects": false`. Rollup would shake that. rolldown, which is what Vite builds with here,
does not. A one-icon entry bundles all 455, and `treeshake.moduleSideEffects`,
`manualPureFunctions` and a cleared cache change nothing. So the canvas ships 435 marks it never
draws. The alternative is a generated file of twenty path strings, which is what this file used to
be. Going back is one `bun remove` and one script, if that number ever matters more than having
the real set.

Two functions went away with the icons rather than staying next to them. `LayerIcon`'s
five-branch switch is now a `Record<LayerKind, …>` of five Geist glyphs, and `Caret` picks between
`ChevronDownSmall` and `ChevronRightSmall` instead of rotating one path.

What is still drawn by hand is what Geist has no mark for: `ClaudeMark` and `CodexMark`, whose
geometry is lobehub/icons'. Geist's logo set runs to about fifty companies and neither is one.
`LogoFigma`, which is in it, is in Figma's five colours. Geist ships third-party marks coloured,
so keeping the Figma chip coloured follows the set's own convention. `GITHUB_PATH` stays
hand-drawn for the opposite reason. Geist's `LogoGithub` mixes `currentColor` with a literal
`white`, which would vanish on the CTA's near-white primary button.

## The fonts are bundled

`@fontsource-variable/geist` and `@fontsource-variable/geist-mono` are imported in `main.tsx`,
not linked from Google Fonts. The canvas is mostly a local dev server, and a board that silently
falls back to the system font measures differently, which is the one thing this repo's boards
exist to be right about. Fontsource splits each family by `unicode-range`, so only the latin
subset is ever fetched.

One trap is worth writing down. The CSS `font` shorthand resets `font-feature-settings`,
`font-kerning`, `font-variant-numeric` and `font-optical-sizing`. The panel sets all four, and
they have to come after the shorthand or the shorthand silently drops them.

## Tailwind and shadcn/ui, under the same tokens

2026-09-18. Two things were true at once. The panels are hand-written CSS that works, and every
new piece of UI was about to be hand-written CSS too. Tailwind and shadcn/ui are in, and the whole
integration depends on one fact. `@import "tailwindcss"` puts its preflight in `layer(base)` and
its utilities in `layer(utilities)`, and an unlayered rule beats a layered one whatever its
specificity. Every rule in `index.css`, every rule in `brand.css` and every rule tldraw ships
still wins. Tailwind reaches only what nothing else claims, which is exactly the new work.

The scale moved out of `index.css` into `tokens.css`, and that was forced rather than tidy. The
two top-right buttons render on the brand pages as well as the canvas, and the brand pages load
`brand.css`, which had no `--ds-*` token in it. Both stylesheets import `tokens.css` now, so
there is one scale behind every page the canvas serves. `brand.css` keeps its own
`color-scheme: light` after the import, and that one word resolves every `light-dark()` token in
it to its light half. The same buttons resolve to their dark-theme values on the canvas and their
light-theme values on a brand page, with nothing to keep in step.

The `@theme inline` block is the whole of the configuration. It names the scale in shadcn's
vocabulary, so `bg-background` is `--ds-background-100` and `ring-ring` is `--ds-focus`. Two of
those names are false friends and are commented as such. shadcn's `primary` is Geist's ground and
ink swapped rather than the accent blue, and its `accent` is a hovered row rather than the
brand's accent.

Two of shadcn's assumptions had to be answered, both in `tokens.css`:

- Its components carry `dark:` classes, and Tailwind's `dark:` reads the operating system. This
  app's theme is `color-scheme`, which no selector can match, and it needs none, since every
  token is a `light-dark()` pair. So `dark:` is pointed at a `data-theme` attribute nothing sets.
  The classes stay where shadcn puts them and do nothing, instead of painting a dark button on a
  brand page because the laptop is in dark mode.
- Tailwind leaves an undeclared border at `currentColor`, so `border` on a shadcn component draws
  in the ink colour. shadcn answers that with one base-layer rule and so does this.

Preflight costs four rules, and each was measured in the browser rather than guessed at.
`list-style: none` took the chat markdown's bullets and numbers, and `a { text-decoration:
inherit }` took the underline off three links whose only affordance it was: the chat's markdown
links, the inspector's source host, and a brand page's provenance line, which is the same ink as
the sentence around it. The rest of preflight lands on elements that already declare what they
want.

The CTA pair is the proof it works end to end. `CanvasCta` is two shadcn Buttons with Tailwind
classes for the layout, and the blue and dark gradients and the gold star are gone. Both are the
primary button, ground and ink swapped, rather than a primary and a secondary. They are the two
asks, not an ask and an aside, and a hairline chip beside a solid one reads as the lesser of them.
The SnapAction mark became a mask rather than an `<img>` on the way, because the file is a fixed
near-white and the ink it sits in is black. Masked, it takes whatever the button's ink is.

What `canvasCta.css` still holds is the shimmer, and only that. It stays a file rather than a
block in `index.css` because the pair is also in the brand pages' topbar, which is another
document with another stylesheet, and an import beside the component goes wherever the component
does. The band is a `light-dark()` pair for the same reason the buttons are one component: the
ground under it is near-white on the canvas and near-black on a brand page. Its ends are
`rgb(255 255 255 / 0)` and not `transparent`, which is transparent black. Interpolated towards
transparent black, the band dims at its own edges, and a grey fringe sweeping across a white
button is the one thing a shimmer must not leave.

The panels did not move. They are CSS that works, they read the same tokens, and a rewrite of
working layout into utility classes is a diff nobody can review against a screenshot.

## tldraw's chrome, after all

The entry above left tldraw's chrome to its own dark theme. That held while the panels were the
only Geist on screen. It stopped holding once the top bar's chips were Geist and the menu under
them was not. It is a variable remap and not a re-skin. tldraw drives its whole UI from
`--tl-color-*`, so about 25 declarations on `.tl-container.tl-theme__dark` put its menus,
toolbar, tooltips and selection on the same scale, including the 1px ring in `--tl-shadow-*`,
which is where a Geist menu's edge comes from. No component CSS is touched, so a tldraw release
changes the values behind the names and nothing here.

What stays tldraw's is what is artwork rather than chrome: the shape palette, the text shadow and
the highlighter.

The main menu is gone rather than restyled. Everything it listed is either on this app's own bar,
the keyboard or the context menu, or is about editing a document that a generator writes from
files. Its slot is the leftmost thing in the top bar, against the window's left edge, so the chat
panel's collapse button took it. In the panel's own header that switch disappeared along with the
panel and needed a second control to undo it. The state moved up to `App` with it, since the
button and the panel are now siblings rather than parent and child.

The bar itself is on `--ds-background-100` rather than tldraw's `--tl-color-low`, which drew a
grey block in the corner of a black canvas, the same two-apps-in-one-window effect the token remap
was for. A hairline on the two edges facing the canvas is what separates them, the way the chat
panel's border does. The rule takes two classes, for the same reason the theme block does. tldraw
sets its own values on `.tlui-menu-zone`, and one class would only win on import order.

What it carries is a switch, the page name and two destinations. Comment, clone and force refresh
left the bar for the right button, which is where all three already pointed, since each acts on
what is under the cursor or on the page it is on. `QuickActions` goes to `null` with the comment
button that was the last thing in it.

An icon button is one thing across the whole row now. The panel drew its own at gray-700 over a
solid ground and tldraw drew its own at gray-900 over a translucent one four pixels wider, which
put two greys and two hovers in the same 40px band on either side of the divider. Geist's is the
one kept, muted at rest and full ink on a gray-100 ground, and it is written once, over both. Half
of it has to be written twice even so. tldraw paints its ground on an inset `::after` rather than
on the button, and that inset is what sets the ground's size.

The scrollbars are the same kind of problem and get the same kind of answer. Seven elements scroll
and none of them set a scrollbar style, so each drew the platform's: a light thumb in a light
trough, the brightest thing on a black screen. `scrollbar-width` and `scrollbar-color` on `:root`
is the whole fix. Both inherit, so every element is covered and the next one is covered before it
exists. It is two standard properties rather than `::-webkit-scrollbar` and its six
pseudo-elements, which buy control over a thumb that only has to be one grey. It stops at the
document, which is the right boundary. A board is an iframe, and a mockup of a phone should scroll
like one.

## Left out

- A light theme, and anything that switches between the two. `color-scheme` is the switch. There
  is nowhere yet for a user to reach it, and nobody has asked for a toggle.
- The light theme of `sheet.css` and `brand.css`, which both pin `color-scheme: light` on
  purpose. A contact sheet and a brand kit are documents about boards, printed on white. They
  keep their own palettes too. `brand.css` shares the scale but is still drawn in the
  brandarchive greys it was designed in.
- The brand marks for Claude, Codex, Figma and GitHub, which are other people's identities at
  their own colours, and the welcome board's own art.
- tldraw's own page-menu chevron, the one glyph left in the top bar that Geist did not draw.
  Replacing it means replacing `DefaultPageMenu` whole, which is a lot of component for a caret
  that already reads as the same weight.
- Rewriting the panels' CSS as utility classes, and any shadcn component the app has no use for.
  The Button is in because the CTA pair needed one. The next component comes in when a second
  real case needs it.
