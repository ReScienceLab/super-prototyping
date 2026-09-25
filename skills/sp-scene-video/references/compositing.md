# The green plate

The rescue route. Reach for it only when the reference video has been tried
and the model still will not hold the interface: on a green plate the screen
is not generated at all, so the pixels are exactly yours. The price is a day
of tracking work and a clip that can still betray itself at the thumb's edge.

The trade, honestly: reference video gives a believable world and a screen
that is *nearly* verbatim. A composite gives a perfect screen and a world that
has to hold still enough to key. Shoot the plate locked.

## 1. Two plate images

The model needs to be shown the empty screen, and — for tracking — the
markers on it. Both are flat PNGs at the screen's aspect:

```bash
uv run --with pillow python - <<'PY'
from PIL import Image, ImageDraw
W, H = 1179, 2556                         # the phone screen in capture px
for markers in (False, True):
    im = Image.new("RGB", (W, H), (0, 214, 74))     # even, bright key green
    if markers:
        d = ImageDraw.Draw(im)
        for col in (1, 2):
            for row in (1, 2, 3):
                x, y = W * col // 3, H * row // 4
                d.rectangle([x - 45, y - 7, x + 45, y + 7], fill="white")
                d.rectangle([x - 7, y - 45, x + 7, y + 45], fill="white")
    im.save("screen-green-markers.png" if markers else "screen-green.png")
PY
```

Six crosses, two columns by three rows. Fewer and a thumb over one loses the
refinement; more and they start being read as an interface. `composite.py`
takes anything between 0.02% and 1% of the screen's area as a marker, so keep
them roughly this size.

## 2. Shoot the plate

Reference images, no reference video: the green screen *is* the instruction.
The wording that works is in `references/prompting.md` — the green-plate block
plus the locked-POV block, both of them, and the negative list.

```bash
python3 "$KIT/skills/sp-scene-video/scripts/ark.py" \
  --prompt-file plate.txt --image screen-green-markers.png --image framing.png \
  --res 720p --dur 10 --tag plate -o out
```

A second reference image showing the framing you want — the phone at the size
and position it should hold — is worth its place: "锁死在画面正中" lands much
harder with a picture of what that means.

Check the plate before compositing: the screen has to be green edge to edge,
all six crosses visible for most of the clip, and the phone must not leave the
frame or roll. A plate that fails any of those is cheaper to re-shoot than to
fight.

## 3. Composite

```bash
uv run --with opencv-python-headless --with numpy \
  "$KIT/skills/sp-scene-video/scripts/composite.py" \
  out/plate-1.mp4 out/ui out/scene.mp4 --lock --stabilize
```

- `--lock` takes one median screen quad for the whole clip instead of tracking
  per frame. For a plate that was meant to be still it is strictly better: no
  tracking jitter at all.
- `--stabilize` (with `--lock`) warps each plate frame onto that quad, which
  removes the residual drift no "static" generated shot is ever without.
- `--offset N` slides the UI against the plate, so the interface changes on
  the frame the thumb actually lands. Find N by eye from a contact sheet, or
  re-render the board with `--knots` instead if the taps are far apart.
- `--debug` writes every 24th composited frame as a PNG. Look at those first.

What it does per frame: keys the screen, takes the convex hull, picks the four
edges by orientation so a thumb biting a corner cannot steal one, intersects
them into a quad, refines with the crosses when five are visible, then draws
the UI only where the plate was green — so the thumb stays on top. The
screen's own luma is multiplied back over the UI, which is what keeps the
glass reflections and the thumb's shadow.

## 4. Review it frame by frame

```bash
ffmpeg -v error -i out/scene.mp4 -vf "select=not(mod(n\,24)),tile=5x2" -frames:v 1 out/sheet.png
```

Read the sheet, then read a still at full size. In order: the screen is sharp
and upright; no green fringe at the thumb; the UI does not slide against the
bezel; the tap lands on the frame the interface changes. A rectangle faintly
visible around the thumb means the occluder mask is catching the shadow — a
better-lit plate fixes it; the code does not.

## 5. What it still cannot do

- A phone that turns, or a hand that rolls it, breaks the key at the bezel.
- A blurred screen (fast pan, shallow focus) has no edges to solve, and the
  clip falls back to the last good quad — watch for a frozen screen.
- The composited screen is sharper than everything around it. `composite.py`
  blurs it by 0.6px and pulls 6% of exposure for that reason; a take shot at
  1080p needs more.
