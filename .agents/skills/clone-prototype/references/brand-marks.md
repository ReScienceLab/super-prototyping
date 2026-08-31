# Third-party brand marks

Loaded from `clone-prototype` when a screen you are cloning carries someone
else's logo. Do not redraw these by hand.

## Where they come from

```
https://unpkg.com/@lobehub/icons-static-svg@latest/icons/<name>.svg
```

24×24, `currentColor`. Strip the `<svg>` wrapper and the `<title>`, inline
the paths, and recolour from a sample off the capture rather than from the
file's own fill.

## Check the glyph before trusting the file name

Vendors rebrand and the icon sets lag. lobehub's `grok` is the swirl, while
the mark in a 2025 iOS capture is the xAI "X" (`xai.svg`). Put the rendered
glyph next to the capture before it becomes an asset.

## A path that fills a hole it should leave open

simple-icons' Raycast is the example: the counter fills solid whichever
`fill-rule` you set, because the shape is a single path with no subpath to
subtract. That needs an SVG `<mask>`, not a different fill rule.
