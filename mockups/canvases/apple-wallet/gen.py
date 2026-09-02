"""Emit mockups/canvases/apple-wallet/ from two Figma files' measurements.

One tldraw page carries both Wallet runs, because they are the same app:

    screens.py  the Wallet app itself, "Apple Wallet . iOS", light and dark
    passes.py   the five pass templates, "Apple Wallet Templates", light only

Each module owns its own TOKENS_SPEC, assets and builders and knows nothing
about the other. This file is what makes them one folder: it joins the two
:root blocks into the single block refkit's `tokens` check demands (the
prefixes --aw- and --awt- keep them apart), assigns board names across both
runs, and writes layout.json.

Artboards are output. Edit the module, never the HTML.

    python3 mockups/canvases/apple-wallet/gen.py
"""
import json
import os

import passes
import screens

OUT = os.path.dirname(os.path.abspath(__file__))

# One :root, both prefixes, inlined byte-identically into all 24 boards. Each
# module's _root() opens with ":root{" and closes with "\n}", so dropping the
# first's brace and keeping the second's concatenates the two bodies.
TOKENS = screens._root()[:-1].rstrip() + "\n" + passes._root().split("{", 1)[1]
screens.TOKENS = passes.TOKENS = TOKENS

# (module, token board stem). Everything else a module emits is named by it.
RUNS = [(screens, "00-design-tokens"), (passes, "00d-design-tokens")]


def boards():
    for mod, stem in RUNS:
        yield stem, mod.token_board()
        for name, html in mod.evidence_boards():
            yield name, html
        for screen in mod.SCREENS:
            stem_, fn = screen[0], screen[2]
            yield stem_, fn()
            if mod is screens:                      # only this file ships dark
                yield "d" + stem_, fn(dark=True)
        for name, html in mod.ref_boards():
            yield name, html


def layout(names):
    """Five rows at one pitch from x = 0, so item N of every row lands
    column-for-column under item N of the row above: each dark screen under
    its light one, and each Figma export under the replica of it."""
    light = [s for mod, _ in RUNS for s in mod.SCREENS]
    dark = list(screens.SCREENS)
    rows = [{"title": "Foundations",
             "files": [{"file": "00-design-tokens", "label": "Design tokens: app"}]
                      + [{"file": n, "label": "Evidence"}
                         for n, _ in screens.evidence_boards()]
                      + [{"file": "00d-design-tokens", "label": "Design tokens: passes"}]
                      + [{"file": n, "label": "Evidence"}
                         for n, _ in passes.evidence_boards()]},
            {"title": "Screens: light", "numbered": True,
             "files": [{"file": s[0], "label": s[1]} for s in light]},
            {"title": "Screens: dark", "numbered": True,
             "files": [{"file": "d" + s[0], "label": s[1]} for s in dark]}]
    for pre, title, src in (("", "Source of truth: Figma export, light", light),
                            ("d", "Source of truth: Figma export, dark", dark)):
        files = [{"file": "ref-%s%s" % (pre, s[0]), "label": s[1]}
                 for s in src if "ref-%s%s" % (pre, s[0]) in names]
        if files:
            rows.append({"title": title, "numbered": True, "files": files})
    return {"name": "(example) Apple Wallet", "rows": rows}


def main():
    files = dict(boards())
    for name, html in sorted(files.items()):
        open(os.path.join(OUT, name + ".html"), "w", encoding="utf-8").write(html)
        print("%-32s %6d KB" % (name + ".html", len(html.encode()) // 1024))
    with open(os.path.join(OUT, "layout.json"), "w", encoding="utf-8") as f:
        json.dump(layout(files), f, indent=2)
        f.write("\n")
    print("%-32s %6d rows" % ("layout.json", len(layout(files)["rows"])))


if __name__ == "__main__":
    main()
