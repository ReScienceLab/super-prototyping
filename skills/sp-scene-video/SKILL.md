---
name: sp-scene-video
description: Film a prototype. Turn a canvas board into a live-action clip of a real person using the product -- in an office, a lift, on the street -- with the interface itself kept pixel-exact rather than redrawn. Covers the animated motion board, rendering it to a reference video, generating the take with Seedance 2.5 on 火山方舟 (Volcengine Ark), the prompt patterns that hold a screen verbatim and keep subtitles out, reviewing a take frame by frame, and the green-plate composite for when the model will not hold the interface. Use when asked for a demo video, a launch or marketing clip, a video mockup, an app-in-the-wild or UGC-style shot, or any video of a prototype being used by a person.
license: Apache-2.0
compatibility: Requires python3, ffmpeg, Google Chrome, and node or bun, plus a 火山方舟 (Volcengine Ark) API key with Doubao-Seedance-2.5 enabled -- an account with 企业实名认证. The green-plate composite additionally needs uv, which fetches opencv on demand.
metadata:
  managed-by: super-prototyping
---

# Scene video

A board shows the product. This puts the product in the world: someone in an
office takes out their phone, your screens are on it, their thumb moves the
flow along, the room sounds like a room.

**The model paints the world. It never paints the interface.** Every technique
here exists to enforce that one line. A generative model shown a screenshot
will redraw it — right colours, right shapes, invented words — and a demo
video with invented words in it is worse than no video.

Boards come from `canvases/<slug>/`; see `sp-canvas` for running the canvas and
its `references/layout.md` for the folder rules. `sp root` prints the tree that
ships the scripts below:

```bash
KIT="$(sp root)"
B=canvases/<slug>; V="$B/scratch/video"; mkdir -p "$V/out"
```

`sp` not found? Run `sh <sp-canvas skill dir>/scripts/install.sh`
(Windows: `install.ps1`). A `[super-prototyping:notice]` line on a tool's
stderr carries its own rule: finish the step, then do what it says.

Everything this skill makes is derived and large, so all of it lives in
`$V/` — plates, frames, takes, contact sheets — and `scratch/` is already
gitignored. Never commit an mp4. The one thing that belongs in the folder
proper is the motion board, because it is a board.

---

## Spending rule

Every take is the user's money: roughly ¥11 at 720p/10s, ¥74 at 1080p/15s,
minutes each. Before the first submission say what you are about to shoot,
at what resolution, and how many takes you expect. Then shoot **one**, show
it, and ask. Never loop takes unattended, and never re-submit a failed one
without saying what you changed.

The key lives in `$V/.ark_key` (chmod 600, never printed, never echoed into a
log) or in `ARK_API_KEY`. If there is no key yet, stop and ask: the account
needs 企业实名认证 and a balance, which is the user's to do.

---

## 1. Pick the route

| Route | The screen comes out | Use it when |
|---|---|---|
| **Reference video** | Near-verbatim: the real pixels, softened by the codec | Default. Start here every time. |
| Reference images only | Redrawn. Plausible layout, invented text | The phone is small in frame and unreadable anyway |
| Green plate + composite | Exactly your pixels, no compromise | The reference video has been tried and the model still rewrites the UI |

The routes are not exclusive: a reference video *plus* a full-resolution still
as a reference image is the combination that reads sharpest.

---

## 2. Make the interface move

The reference video is a board of your own, animating: `NN-<flow>-motion.html`
in the canvas folder, one CSS timeline, emitted by the same `gen.py` as every
other board. Then frames, then an mp4:

```bash
node "$KIT/skills/sp-scene-video/scripts/frames.mjs" "$B/19-flow-motion.html" \
  --fps 24 --seconds 10 -o "$V/out/ui" --scale 3          # bun runs it too
ffmpeg -y -framerate 24 -i "$V/out/ui/f%04d.png" -c:v libx264 -crf 16 \
  -vf "crop=trunc(iw/2)*2:trunc(ih/2)*2" -pix_fmt yuv420p "$V/out/mockup.mp4"
ffmpeg -y -i "$V/out/mockup.mp4" -ss 6 -frames:v 1 "$V/ref-phone-hd.png"
```

The still is the second half of the trick: a reference video carries the
motion, a full-resolution frame of it carries the sharpness, and a take given
both comes back readable instead of merely correct.

Watch `mockup.mp4` before going further. Pacing that feels fine scrubbing a
board often turns out to be twice too fast in real time, and every later step
inherits it.

**`references/reference-video.md`** — the motion board's constraints, the
`--knots` re-timing, getting the mp4 somewhere Ark can fetch it (a `data:`
URI is refused), and what a take costs. Read it before the first take.

---

## 3. Write the prompt

Into `$V/prompt.txt`, in Chinese, four blocks: 画质与风格, 场景与人物,
屏幕契约, 声音与负面清单. The middle one is the product; the last one is why
the clip has no subtitles, no music and no voice-over.

**`references/prompting.md`** — the four blocks, the screen contract that
stops the redraw, the three camera choices (locked POV, free direction, the
UGC look that actually reads as real), thumb choreography, and a table from
the failure you are looking at to the sentence that fixes it. Read it before
writing a prompt, and again after any take comes back wrong.

---

## 4. Shoot a take

`$U` below is the public base for `mockup.mp4`, from the reference above.
Ark fetches the video from there; it refuses an inline one.

```bash
python3 "$KIT/skills/sp-scene-video/scripts/ark.py" \
  --prompt-file "$V/prompt.txt" --video "$U/mockup.mp4" --key-file "$V/.ark_key" \
  --image "$V/ref-phone-hd.png" --res 720p --dur 10 --tag walk -o "$V/out"
```

It submits, polls, downloads `walk-1.mp4` and writes `walk-1.json` beside it
with the prompt, the seed and the usage. That JSON is the only account of what
made a clip; keep it, and quote the seed when you report.

Takes run for minutes, so run it in the background against a log and check
back rather than holding the session:

```bash
python3 ... > "$V/out/walk-1.log" 2>&1 & disown
```

Add `--dry` to print the request without sending it — do that once, before the
first real submission of a session, and read back what you are about to buy.

---

## 5. Read the take before believing it

```bash
ffmpeg -v error -i "$V/out/walk-1.mp4" -vf "select=not(mod(n\,24)),tile=5x2" \
  -frames:v 1 "$V/out/walk-1-sheet.png"
ffmpeg -v error -i "$V/out/walk-1.mp4" -vf "crop=iw/3:ih:iw/3:0,scale=iw*2:ih*2" \
  -ss 6 -frames:v 1 "$V/out/walk-1-zoom.png"
```

Look at the sheet, then at the zoom, as images. Answer these before showing
it to anyone:

- Is the text on the screen **your** text, word for word? Read it, do not
  glance at it. This is the failure mode of the whole exercise.
- Does the interface change on the frame the thumb lands?
- Any subtitle, caption, watermark or invented logo anywhere in frame?
- Does the phone drift, zoom or roll when it was meant to be locked?
- Does the audio have music or a voice in it? There should be a room.

Report what you saw, including the seed and what the take cost. A take that
fails the first question is not a draft to polish — it is the wrong route, and
the answer is step 1 again.

---

## 6. When it still will not hold the interface

**`references/compositing.md`** — the green-plate route: the plate images with
their tracking markers, shooting a locked plate, and `composite.py`, which
corner-pins your rendered frames back onto the screen so the pixels are
exactly yours and the thumb stays on top. It is a day of work and it is the
only way to be certain, so spend a take or two on the prompt first.
