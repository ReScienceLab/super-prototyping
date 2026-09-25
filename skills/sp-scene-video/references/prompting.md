# Prompting Seedance 2.5

Read this before writing the first prompt, and again after a take comes back
wrong. Every prompt below produced a real clip; the failures are recorded next
to the wording that fixed them.

**Write in Chinese.** Ark's own model card, its examples and every take that
worked here were Chinese. An English prompt has not been tried against this
endpoint, and a take costs money, so this is not the thing to experiment with
first.

## The four blocks

A prompt that behaves has all four, in this order. Anything you leave out, the
model decides for you, and it decides like a stock-footage ad.

1. **画质与风格** — what kind of footage this is. "写实实拍风格，16:9" is the
   floor. Say the lens and the grade, or say explicitly that there is none.
2. **场景与人物** — the room, the light, the person, what they do. Concrete
   and ordinary beats evocative: "工位上堆着文件、显示器、水杯" lands, "现代
   办公空间" does not.
3. **屏幕契约** — the whole point, below.
4. **声音与负面清单** — what must not appear. Always the last block, always
   explicit.

## The screen contract

The model will redraw an interface it is only *shown*. It will not redraw one
it is told to *keep*. With a reference video:

> 参考视频里的那部手机和它屏幕上正在播放的界面动画是这条片子的核心：从手机被拿出来的那一刻起，
> 屏幕上的每一帧内容、文字、颜色、动画节奏都必须和参考视频完全相同，不要重新绘制、不要模糊、
> 不要改动任何像素；手机在画面里可以随镜头运动，但屏幕始终朝向镜头、不被遮挡（除了点按的拇指）。

Three things earn their place there: *每一帧* (not "the screen"), *不要重新
绘制* (the actual failure mode, named), and the occlusion exception (without
it the thumb never touches the glass).

With reference **images** instead, the best you get is a redraw, so spend the
words on layout: 屏幕完全等于图片1, then the elements in reading order, then
不要自行发明任何界面. Expect invented text anyway. Use images alone only when
the phone is small in frame.

## The negative list

Generated video adds subtitles, adds a pop soundtrack, and adds a voice-over,
every time, unless told:

> 只有自然的办公室环境音：轻微键盘声、远处人声，没有音乐，没有对白，没有旁白，没有字幕，
> 除手机屏幕外画面里不出现任何文字。

`除手机屏幕外` matters: "no text" on its own has been read as licence to blank
the UI.

## Pick one camera

**Locked POV** — the phone is nailed to the frame, which is what a compositor
needs. Say it twice, in different words:

> 第一人称视角（POV）。摄像机固定在人物身上（body-mounted rig），和他的手臂、手机一起运动，
> 所以手机在画面中的位置、大小、角度整段视频完全不变，像被锁死在画面正中……
> 整段视频就像一张静止照片加上一根会动的拇指：手机的四个角在画面中的像素位置从第一帧到
> 最后一帧完全不变，没有呼吸感，没有手抖，没有镜头漂移，没有缩放。

Even then a "static" take drifts a pixel or two. `composite.py --lock
--stabilize` exists because of that.

**Free direction** — let it move, when the clip is the story and not the
pixels:

> 电影感广告短片，导演自由发挥镜头语言：镜头不固定，可以是第三人称跟拍、侧面环绕、缓慢推近，
> 手持感自然、浅景深、自然光……随后镜头推近到手机，让手机屏幕在画面里足够大、正对镜头、清晰可读。

**UGC** — the one that reads as real. "Cinematic" is the default and the
default is what makes a demo look fake, so this block is mostly negations:

> 这不是广告片，是一段普通人用 iPhone 随手横拍的真实手机视频，16:9，画质是手机原片：
> 没有调色、没有电影感、没有浅景深虚化，小传感器的景深很深，前后景都基本清晰，
> iPhone 那种偏亮、偏锐、HDR 拉平的画面，办公室顶灯的冷白光和窗外日光混在一起，白平衡略微偏青；
> 手持拍摄，自然的轻微晃动和呼吸感，构图不讲究、稍微歪一点、不居中，人走动时镜头跟得略慢、稍微滞后，
> 光线变化时曝光会跟着轻微跳一下，画面里有一点点手机视频的压缩噪点。
> ……不要电影感、不要广告感、不要唯美光影、不要 4K 超清质感、不要平滑的运镜。

## The thumb

Taps drift to wherever the hand feels like unless they are tied to the
timeline:

> 拇指只在参考视频里界面发生变化的时刻轻点对应的位置，其余时间停在屏幕右下角外侧。

Without a reference video, choreograph them: 在屏幕下方中部轻点一下，停顿一下，
再在屏幕下方右侧轻点一下. Three taps in ten seconds is already brisk.

## The green plate

For the composite route, the screen is the subject and it must be *empty*:

> 手机屏幕完全等于图片1：整块屏幕就像贴了一张纯绿色的卡纸，是均匀的色键绿幕（chroma key green），
> 从上边到下边、从左边到右边全是同一种亮绿色。
> 屏幕上绝对没有任何东西：没有状态栏、没有时间、没有图标、没有按钮、没有通话界面、没有文字、
> 没有渐变、没有反光、没有眩光。屏幕的底部区域也是纯绿色，不要在底部画任何图标或按钮。

The bottom-of-screen sentence is there because the model kept drawing a call
bar down there. With tracking markers, add:

> 绿幕上只有六个白色的小十字形跟踪标记（tracking markers），排成两列三行、均匀分布，
> 和图片1里的位置、大小完全一样，整段视频里这六个十字保持不动、不变形。

## When a take comes back wrong

| What you see | What to change |
|---|---|
| The UI is *similar* but the text is invented | You are in reference-image mode. Switch to a reference video. Nothing in the prompt fixes this. |
| Screen sharp in the plate, soft in the take | Add a full-resolution still as a second reference image and say 屏幕上的文字、图标、颜色以它为准，必须同样清晰锐利 |
| Phone drifts, zooms or breathes | The locked-POV block, both sentences. Then `--lock --stabilize` at composite time. |
| Subtitles, captions, a logo sting | The negative list, with 除手机屏幕外画面里不出现任何文字 |
| It looks like an ad | The UGC block, including its 不要 tail |
| A call bar or status bar on the green plate | The bottom-of-screen sentence above |
| Good take, wrong detail | Re-run with the same `--seed` from the take's JSON and one changed sentence; a fresh seed re-rolls everything |
