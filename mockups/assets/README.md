# Assets

Shared source material for the boards: icon sets, logos, reference crops,
anything an artboard embeds.

Artboards render in a sandboxed iframe and **cannot load files from here at
runtime** — nothing on this path is fetchable from a mockup. Assets are
inlined into the HTML as `data:` URIs by the generator script that emits the
board. This folder is the checked-in source those URIs are built from, so a
regeneration reproduces the same bytes.

Prefer real product assets (the actual icon, the actual logo, a rasterized
system symbol) over hand-drawn approximations.

To splice a large base64 blob into an existing artboard without pulling it
through an agent's context — mockup HTML routinely has single lines of
100KB–2MB of embedded base64 — locate the target line with `grep -n` on a
distinguishing class or attribute (never on the blob line itself), then
read/replace that one line with a short Python script
(`base64.b64encode(open(path,'rb').read())`) run from the shell. Never
`cat`/`echo` a blob into a tool call.
