# Filming a prototype: what the takes taught, and what shipped

2026-09-25. Over 10 and 11 September a session on `notion-purchase-motion`
tried to put the cloned Notion purchase sheet into a real scene: a person in
an office, the phone in their hand, the flow playing on it. Thirteen paid
takes later it worked. `skills/sp-create-video` is that session, kept.

## The model will redraw an interface it is only shown

The first take sent the three replica screens as reference images and asked
for them back pixel for pixel. What came back was a convincing office, a
convincing phone, and a purchase sheet that was *nearly* the one we drew:
right layout, right blue, invented words. No amount of "do not invent any
interface" changed that. A model given pictures of a UI composes a UI.

What changed it was giving it a **video** of the interface instead, as
`reference_video`, with the prompt saying the screen is the one thing that
must survive untouched: every frame's content, text, colour and timing
identical to the reference video, not redrawn. Then it kept the pixels and painted a room around
them. That is why the skill's first phase is building an animated board, not
writing a prompt.

The reference video is board 19, `19-purchase-sheet-motion.html`: the same
`gen.py`, one CSS timeline, the flow playing. `scripts/frames.mjs` scrubs it
frame by frame through CDP, because a screen recorder drops frames under load
and never says so. The session did that with a negative `animation-delay`; the
script uses `getAnimations()` and sets each `currentTime` instead. A delay
applied to an animation that is already paused moves it from wherever the
pause landed, which is wall-clock, so the same board rendered twice came back
different, and a pseudo-element's animation was missed entirely. Set the time
and two runs are identical to the byte.

## Ark, not fal, and not Replicate

fal.ai was first: a key, a payment, a working `make.py`. It never produced a
clip. Replicate listed `bytedance/seedance-2.5` at $0.9676 per second of
output. Volcengine Ark is ByteDance's own API for its own model, and a 720p
ten-second take with audio cost about ¥11.

So the shipped script talks to Ark and only Ark. A provider flag for a path
that has never returned a video would be untested code in every install, and
`ark.py` does one thing.

Ark is sold under two names: Volcengine Ark in China, where the session ran,
and BytePlus ModelArk everywhere else, with the same request at a different
host and a different model id. A Volcengine key needs a mainland account,
which most users of this app do not have, so `ark.py` defaults to ModelArk and
takes `--region cn` for the other. The ModelArk route has not been shot yet:
its endpoint answers, and its model id comes from BytePlus's own docs.

## The green plate is kept, as the rescue route

Before the reference video worked, the answer was going to be compositing:
have the model shoot a phone with a chroma-key green screen and six tracking
crosses, then corner-pin the real frames back onto it. That produced good
clips — a hand in a lift, the sheet perfect on the glass, the thumb on top of
it — and `scripts/composite.py` is that code: convex hull of the key, four
edges picked by orientation so a thumb biting a corner cannot steal one,
homography refined on the crosses, the plate's own luma multiplied back over
the UI so the reflections survive.

It ships because the guarantee is different in kind: reference video gives a
screen that is *nearly* verbatim, a composite gives one that is exactly
verbatim. It ships as the fallback because it costs a day and constrains the
shot to a locked camera. It is run through `uv run --with
opencv-python-headless`, so the toolkit keeps its two dependencies.

## Two causes of a `530`, and a lost poll

Ark refuses a `data:` URI on `video_url`, so the reference video needs a URL
its servers can fetch. A `cloudflared` quick tunnel does it, but it returned
`530` for hours: it has to run outside the agent's sandbox, and the user's
VPN answered DNS with fake 198.18.x addresses, so its edge SRV lookup failed.
Pinning `--protocol http2 --edge <ip>:7844` fixed it. Both are in
`references/reference-video.md` next to a `curl` check, because submitting a
take against an unreachable video still costs money.

A failed poll is not a failed task. An SSL timeout killed the runner
mid-generation and the clip had to be fetched by task id afterwards. `ark.py`
now retries the poll and prints the id first.

## What is not here

No mp4 is committed anywhere. Takes, plates and frames are derived, large, and
belong in the project's `scratch/video/`, which is already ignored. The only
artefact of a shoot that belongs in a canvas folder is the motion board, which
is a board like any other and shows on the canvas.
