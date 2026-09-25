# Prompting Seedance 2.5

Read this before writing the first prompt, and again after a take comes back
wrong. Every prompt below is an English translation of a Chinese one that
produced a real clip; the failures are recorded next to the wording that fixed
them. The English wording has not been shot yet, so if a take ignores a
sentence it was given, suspect the translation.

## The four blocks

A prompt that behaves has all four, in this order. Anything you leave out, the
model decides for you, with stock-footage defaults: music, subtitles, a voice-over.

1. **Look and style**: what kind of footage this is. "Realistic live-action
   footage, 16:9" is the floor. Say the lens and the grade, or say explicitly
   that there is none.
2. **Scene and person**: the room, the light, the person, what they do.
   Concrete and ordinary beats evocative: "a desk piled with papers, a monitor,
   a water glass" lands, "a modern office space" does not.
3. **Screen contract**: the whole point, below.
4. **Sound and negative list**: what must not appear. Always the last block,
   always explicit.

## The screen contract

The model will redraw an interface it is only *shown*. It will not redraw one
it is told to *keep*. With a reference video:

> The phone in the reference video and the interface animation playing on its
> screen are the core of this clip. From the moment the phone comes out, every
> frame of the screen — content, text, colours, animation timing — must be
> identical to the reference video. Do not redraw it, do not blur it, do not
> change a single pixel. The phone may move with the camera, but the screen
> always faces the camera and is never covered, except by the tapping thumb.

Three phrases do the work: *every frame* (not "the screen"), *do not redraw*
(the actual failure mode, named), and the occlusion exception (without it the
thumb never touches the glass).

With reference **images** instead, the best you get is a redraw, so spend the
words on layout: "the screen is exactly image 1", then the elements in reading
order, then "do not invent any interface of your own". Expect invented text
anyway. Use images alone only when
the phone is small in frame.

## The negative list

Generated video adds subtitles, adds a pop soundtrack, and adds a voice-over,
every time, unless told:

> Only natural office ambience: faint keyboard clicks, distant voices. No
> music, no dialogue, no voice-over, no subtitles, and no text anywhere in
> frame except on the phone screen.

*Except on the phone screen* matters: "no text" on its own has been read as
licence to blank the UI.

## Pick one camera

**Locked POV** — the phone is nailed to the frame, which is what a compositor
needs. Say it twice, in different words:

> First-person POV. The camera is on a body-mounted rig and moves with the
> person's arm and the phone, so the phone's position, size and angle in frame
> never change for the whole clip, as if locked to the centre of the frame…
> The clip is a still photo with one moving thumb: the pixel positions of the
> phone's four corners are identical from the first frame to the last. No
> breathing, no hand shake, no camera drift, no zoom.

Even then a "static" take drifts a pixel or two. `composite.py --lock
--stabilize` exists because of that.

**Free direction** — let it move, when the clip is the story and not the
pixels:

> A cinematic short ad; the director chooses the camera language. The camera
> is not fixed: a third-person follow, a side orbit, a slow push-in, natural
> handheld feel, shallow depth of field, natural light… Then the camera pushes
> in on the phone until the screen is large in frame, facing the camera, and
> clearly readable.

**UGC** — the one that reads as real. "Cinematic" is the default and the
default is what makes a demo look fake, so this block is mostly negations:

> This is not an ad. It is a real phone video an ordinary person shot on an
> iPhone, held sideways, 16:9, straight out of the camera: no grading, nothing
> cinematic, no shallow-focus blur. The small sensor keeps foreground and
> background mostly sharp. The bright, sharp, HDR-flattened iPhone look, the
> cool white of office ceiling lights mixed with daylight from the window,
> white balance slightly cyan. Handheld, with natural slight shake and
> breathing; careless framing, a little tilted, off-centre; when the person
> walks the camera follows a beat late; the exposure jumps slightly when the
> light changes; a little phone-video compression noise.
> …No cinematic look, no ad look, no beautiful lighting, no 4K ultra-sharp
> finish, no smooth camera moves.

## The thumb

Taps drift to wherever the hand feels like unless they are tied to the
timeline:

> The thumb taps the matching spot only at the moments the interface changes
> in the reference video, and otherwise rests just off the screen's bottom
> right corner.

Without a reference video, choreograph them: "tap once at the bottom centre of
the screen, pause, then tap once at the bottom right". Three taps in ten seconds is already brisk.

## The green plate

For the composite route, the screen is the subject and it must be *empty*:

> The phone screen is exactly image 1: the whole screen looks like a sheet of
> pure green card, an even chroma key green, the same bright green from top to
> bottom and left to right. There is absolutely nothing on the screen: no
> status bar, no time, no icons, no buttons, no call screen, no text, no
> gradient, no reflection, no glare. The bottom of the screen is pure green
> too; draw no icon or button there.

The bottom-of-screen sentence is there because the model kept drawing a call
bar down there. With tracking markers, add:

> The only things on the green are six small white cross-shaped tracking
> markers, evenly spaced in two columns and three rows, exactly where and as
> large as they are in image 1. The six crosses stay still and undistorted for
> the whole clip.

## When a take comes back wrong

| What you see | What to change |
|---|---|
| The UI is *similar* but the text is invented | You are in reference-image mode. Switch to a reference video. Nothing in the prompt fixes this. |
| Screen sharp in the plate, soft in the take | Add a full-resolution still as a second reference image and say "the text, icons and colours on the screen follow this image and must be just as sharp" |
| Phone drifts, zooms or breathes | The locked-POV block, both sentences. Then `--lock --stabilize` at composite time. |
| Subtitles, captions, a logo sting | The negative list, with "no text anywhere in frame except on the phone screen" |
| It looks like an ad | The UGC block, including its "no …" tail |
| A call bar or status bar on the green plate | The bottom-of-screen sentence above |
| Good take, wrong detail | Re-run with the same `--seed` from the take's JSON and one changed sentence; a fresh seed re-rolls everything |
