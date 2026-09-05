---
name: new-ui-mock
description: Design a new screen, flow or component as a self-contained HTML artboard on the prototype canvas, built from the board's existing design tokens rather than invented values. Covers picking or extending the token block, generating a row of screens from one script, iterating against annotated screenshots, and verifying by rendering. Use when asked to mock up a new screen or feature, design variants/proposals to compare, extend an existing board with more states, or turn a spec into artboards.
license: Apache-2.0
compatibility: Requires python3 and the refkit command from super-prototyping-tools. Google Chrome for refkit shoot.
---

# New UI mock

For work with **no reference screenshot to copy**. If there is one, use
`clone-prototype` instead. Measurement beats invention every time.

Everything renders on the canvas from `mockups/canvases/<slug>/`; see
`prototype-canvas` for running it, and its `references/layout.md` for the
folder and `layout.json` rules.

The plugin ships the template folder and every worked example. `sp-canvas`
and `refkit` are separate — the plugin cannot run an installer of its own, so
if they are not on PATH: `uv tool install
"git+https://github.com/ReScienceLab/super-prototyping#subdirectory=tools"`.
`sp-canvas root` then prints where the plugin landed:

```bash
KIT="$(sp-canvas root)"
cp -r "$KIT/mockups/canvases/templates" mockups/canvases/<slug>
python3 mockups/canvases/<slug>/gen.py
```

---

## 1. Find the tokens before you design

Never invent a palette when the product already has one.

- **Extending an existing board?** Reuse its `00-design-tokens.html` block
  verbatim. Copy it byte-identically into the new file; a sandboxed iframe
  has no shared stylesheet.
- **Cloning a real app's look?** Stop and run `clone-prototype` Phase 1 and
  Phase 2 first; come back with a measured token block.
- **Genuinely new product, nothing to measure?** Copy the shipped template
  folder, change `NAME` and the prefix, and pick deliberately: a
  platform-native stack, a neutral ramp, one accent, one danger. Keep the
  evidence table and write *why* in it ("iOS system
  blue", "brand hex from the logo"). An unexplained hex is a future bug.

A new token is a decision, not a convenience. If a screen needs a colour or a
size that is not in the block, either it belongs in the block (add it there,
in every file) or the screen is wrong.

---

## 2. Ground the content

Readers take the copy, numbers and states in a mockup as product decisions.

- Take strings from the real source when it exists: localization files,
  existing screens, the spec. Never from imagination.
- Use real assets over hand-drawn approximations: the actual icon, the actual
  logo, the actual empty-state illustration, embedded as a `data:` URI.
- Design the **unhappy states too**: empty, loading, error, long string,
  longest plausible number. A mock that only shows the happy path hides
  exactly the layout problems worth finding now.

---

## 3. One generator, one row of screens

Same rule as cloning. Write **one** script that emits every `.html` in the
folder, and edit the script, never the output.

```python
TOKENS = ":root{...}"                      # one source of truth
def page(title, extra_css, body): ...      # TOKENS + frame + body
```

Constraints (from the canvas renderer):

- **Fully self-contained.** `sandbox=""` means no external CSS, JS, fonts or
  images; `data:` URIs and inline SVG only.
- **Artboard box is 478 × 980.** Overflow clips silently.
- iPhone frame 393 × 852 pt at 1pt = 1px: 54px status bar, 125 × 36 Dynamic
  Island, 139 × 5 home indicator.
- Avoid SF Symbols private-use glyphs; they render as tofu without SF Pro.
- Accessibility is not a mockup detail to skip: real contrast on real
  backgrounds, ≥ 44pt tap targets, `aria-label` on icon-only controls. A mock
  that fails contrast ships a screen that fails contrast.

### Proposals to compare

When the ask is "show me some options", make each proposal a **whole
artboard in one row**, not a fragment:

```json
{ "title": "Card layout proposals", "numbered": true,
  "files": [
    { "file": "10-cards-continuity", "label": "Continuity" },
    { "file": "11-cards-structured", "label": "Structured" },
    { "file": "12-cards-reference",  "label": "Reference" }
  ] }
```

Three is usually the right number. Two reads as a false binary, five as
indecision. Make them **genuinely different approaches**, not three spacing
values, and put a one-line rationale at the bottom of each board. Rows align
column-for-column, so a second row of the same three under a different state
reads as a matrix.

---

## 4. Iterate against annotated screenshots

For review, the user marks up a screenshot of the canvas with boxes, arrows
and numbers, then pastes it back.

1. Echo what you read each annotation as, before touching anything.
2. Change the generator, not the artboard.
3. Re-run the generator; HMR reloads the shape in place.
4. Verify that region visually before claiming it is done.

Answer every annotation, including the ones you disagree with. Say so in a
line and make the change, or say why you did not and what you did instead.

---

## 5. Verify by rendering

```bash
refkit shoot mockups/canvases/<slug>/*.html -o shots --scale 2
refkit montage shots/*.png -o board.png --height 520
```

Read the montage. Check, in order: nothing clipped; text wraps where you
intended; the same element has the same inset on every screen; nothing uses a
colour that is not in the token block (`grep -o '#[0-9A-Fa-f]\{6\}'` on the
generated files and compare the set against `:root`).

Re-render after every pass. A change you have not re-rendered is not done.
