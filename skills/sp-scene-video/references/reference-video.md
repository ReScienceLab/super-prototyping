# The reference video

Read this once before the first take. It is the whole difference between a
clip that shows your product and a clip that shows something that looks like
it.

Shown three screenshots, the model **redraws** the interface: right colours,
right shapes, invented words. Given a video of the interface playing, it
**keeps** it and paints a room around it. So the job is: get the board moving,
get it into a file, get that file somewhere Ark can fetch it.

## 1. A motion board

The source is an ordinary board in the canvas folder, `NN-<flow>-motion.html`,
emitted by the same `gen.py` as every other board. It runs the flow on one CSS
timeline, so scrubbing it is deterministic:

- One `animation-duration` for every element, the whole clip's length, with
  the states cut in by keyframe percentages. Different durations cannot be
  scrubbed to a single time.
- **CSS only.** Boards render in `sandbox=""`; a JS animation will not run in
  the canvas and will not scrub here either.
- Keep the phone in `.phone`, like every other board. That is what the
  renderer clips to.
- It is a real board: it goes in `layout.json`, and the canvas shows it
  animating. That is also the cheapest review of the timing, before any money
  is spent.

## 2. Frames, then an mp4

```bash
KIT="$(sp root)"
B=canvases/<slug>; V="$B/scratch/video"; mkdir -p "$V/out"
node "$KIT/skills/sp-scene-video/scripts/frames.mjs" "$B/19-flow-motion.html" \
  --fps 24 --seconds 10 -o "$V/out/ui" --scale 3
ffmpeg -y -framerate 24 -i "$V/out/ui/f%04d.png" -c:v libx264 -crf 16 \
  -vf "crop=trunc(iw/2)*2:trunc(ih/2)*2" -pix_fmt yuv420p "$V/out/mockup.mp4"
```

`frames.mjs` pauses every animation in the board and sets its `currentTime`
frame by frame, so each frame is exact rather than recorded, and the same
board twice is the same bytes twice. The
crop is there because the standard 393 pt phone comes out 1179 px wide at
`--scale 3`, and H.264 will not take an odd dimension in `yuv420p`; it takes
the one column off rather than padding a black line on.
Outside `.phone` it writes transparent pixels, which is what `composite.py`
wants; for a reference video, `-pix_fmt yuv420p` flattens that to black and
the model treats it as a dark surround.

The frames are 9:16 and the take is 16:9. Say so in the prompt — 必须原封不动
地放在 16:9 画面的正中央，竖直握持，手机高度约占画面高度的 85% — and send a
full-resolution still as a reference image too, or the screen comes back
readable but soft.

`--knots '[[0,0],[2,0],[3,1.2],[10,10]]'` re-times the board onto a plate you
already have: pairs of *(plate second, board second)*, linear in between. It
is how you make the UI change exactly when a generated thumb lands, including
holding the board still while the hand travels.

## 3. Somewhere Ark can fetch it

Ark rejects a `data:` URI on `video_url`; the reference video has to be a URL
its servers can reach. Nothing here is on the public internet, so this is the
step that bites.

**Ask the user first.** This uploads an unreleased interface to a third-party
edge. It is their product and their call — say which service, and wait.

A quick tunnel over a local file server, torn down straight after:

```bash
mkdir -p /tmp/sp-serve && cp "$V/out/mockup.mp4" /tmp/sp-serve/
(cd /tmp/sp-serve && python3 -m http.server 8791 --bind 127.0.0.1 &) # no setsid on macOS
cloudflared tunnel --url http://127.0.0.1:8791 > /tmp/sp-serve/tunnel.log 2>&1 &
sleep 8; U="$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/sp-serve/tunnel.log | head -1)"
curl -sI "$U/mockup.mp4" | head -1        # 200, or do not submit
```

Two things that cost an evening here, both worth knowing before you start:

- **The tunnel must run outside the agent's sandbox.** Inside it, it cannot
  reach Cloudflare's edge and every request comes back `530`.
- **A fake-IP VPN breaks its edge lookup.** If system DNS answers 198.18.x
  for everything it cannot resolve the SRV record, and `530` again. Pin the
  edge and the protocol: `--protocol http2 --edge 198.41.192.7:7844 --edge
  198.41.200.13:7844` (any two or three current edge IPs).

Verify with `curl` before submitting. A take that starts with an unreachable
reference video still costs money, and comes back as a room with no phone in
it.

When the takes are in: kill `cloudflared` and the `http.server`, and say so.
A tunnel left up is a public copy of the product.

## 4. What a take costs

Observed on 火山方舟, September 2026, audio on, watermark off. A reference
video roughly doubles the bill, and 1080p roughly doubles it again.

| Take | tokens | ≈ ¥ | wall clock |
|---|---|---|---|
| 720p, 10 s, reference images only | 216,900 | 11 | ~2.5 min |
| 720p, 10 s, + reference video | 432,900 | 22 | ~4.5 min |
| 720p, 15 s, + reference video | 648,900 | 33 | ~5.5 min |
| 1080p, 15 s, + reference video | 1,460,025 | 74 | ~6 min |

Iterate at 720p. Shoot the one you keep at 1080p with the same `--seed`.

The download URL in the task record expires in 24 hours, so `ark.py` fetches
the mp4 as soon as the task succeeds and writes the record beside it. If a
poll dies, the task id is on stderr and in the log: `GET
.../tasks/<id>` with the same key still has it.
