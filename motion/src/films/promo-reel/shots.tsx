import React from "react";
import {
  AbsoluteFill,
  Easing,
  IFrame,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

import { SANS } from "../../lib/fonts";
import { enter, leave, stagger } from "../../lib/timing";
import comparison from "../../../../assets/workflow/case-duolingo.png";
import {
  ART_COUNT,
  BOARDS,
  CANDIDATES,
  CROPS,
  DELTAS,
  ACCENT,
  BORDER,
  DANGER,
  DUO_GREEN,
  EVIDENCE,
  FONT_SCORE,
  GROUND,
  INK,
  INSET,
  MAJOR,
  MEAN_DELTA,
  MINOR,
  MONO,
  RECIPE,
  MUTE,
} from "./data";

/*
 * The reel's nine shots. Each is a plain component with no length of its own
 * beyond the props it is given: `index.tsx` puts each in a <Sequence>, so
 * `useCurrentFrame()` here already counts from the shot's first frame.
 *
 * These are shots, not templates. `src/templates/` holds one reusable effect
 * per folder, driven by props and cut into any film; nothing below is reusable
 * — a delta table and a font verdict are this film's subject, not an effect —
 * so they live beside the film that shows them rather than pretending to a
 * generality they do not have.
 */

// ---------------------------------------------------------------------------
// The artboard, live

/** The board file's own box, and the phone-with-bezel inside it. */
const BOARD = { w: 478, h: 980 };
/**
 * The board centres a 393 x 852 phone under 24px of body padding and rings it
 * with a 12.5px bezel, so the bezel's outer box starts at (30, 11.5) and runs
 * 418 x 877. Clipping to that is what turns an artboard into a device shot.
 */
const PHONE = { x: 30, y: 11.5, w: 418, h: 877, bezel: 12.5 };
/** The screen itself, which is what every measurement below is in. */
const SCREEN = { w: 393, h: 852 };

/**
 * One artboard, rendered live rather than screenshotted. The boards are
 * self-contained HTML under `mockups/`, which is this project's public dir, so
 * the reel shows the same file the canvas shows and cannot fall out of date
 * with it. `IFrame` (not a bare <iframe>) holds the render open until load.
 */
const Board: React.FC<{
  slug: string;
  scale: number;
  style?: React.CSSProperties;
}> = ({ slug, scale, style }) => (
  <div
    style={{
      width: PHONE.w * scale,
      height: PHONE.h * scale,
      overflow: "hidden",
      borderRadius: 52 * scale,
      // A Primer card: one hairline border and a soft resting shadow. The
      // dark theme lit this panel from behind; on white there is nothing to
      // light, and a glow would only fog the board's own edge.
      boxShadow: `0 0 0 1px ${BORDER}, 0 ${10 * scale}px ${30 * scale}px rgba(31,35,40,.10)`,
      ...style,
    }}
  >
    <div
      style={{
        width: PHONE.w,
        height: PHONE.h,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <IFrame
        src={staticFile(`canvases/duolingo-ios/${slug}.html`)}
        scrolling="no"
        style={{
          position: "absolute",
          left: -PHONE.x,
          top: -PHONE.y,
          width: BOARD.w,
          height: BOARD.h,
          border: 0,
        }}
      />
    </div>
  </div>
);

/**
 * An overlay in the screen's own coordinates. Everything the reel draws on top
 * of a board — grid, probe boxes, leader lines — is placed in design pt and
 * scaled with the board, so a number on screen is the number in the token.
 */
const Over: React.FC<{ scale: number; children: React.ReactNode }> = ({
  scale,
  children,
}) => (
  <svg
    viewBox={`0 0 ${SCREEN.w} ${SCREEN.h}`}
    width={SCREEN.w * scale}
    height={SCREEN.h * scale}
    style={{
      position: "absolute",
      left: PHONE.bezel * scale,
      top: PHONE.bezel * scale,
      overflow: "visible",
    }}
  >
    {children}
  </svg>
);

// ---------------------------------------------------------------------------
// How a shot leaves

/** How far a shot's <Sequence> runs past its own slot in the cut. */
export const OVERLAP = 12;

/**
 * How a shot arrives and how it leaves, which under an overlap is one problem
 * and not two.
 *
 * The film used to dip: each shot faded to nothing inside its own slot and the
 * next arrived on empty ground. On black that was a beat; on white it is a
 * flash of blank page between every pair of shots, and it reads as a cut. So a
 * shot now starts leaving two frames before its slot ends and takes twelve
 * more to finish, over the top of the shot that has already begun.
 *
 * That only works if the two are kept apart in time, because every shot writes
 * its heading at the same 96, 92 — dissolve them evenly and the join is two
 * sentences on one line. So the fall is deliberately not `leave()`, which
 * eases *in* and therefore holds near full opacity until the last moment: this
 * eases out and is under a tenth by six frames past the cut. The rise waits
 * those six frames out before it starts. What each crosses the other at is
 * roughly 8% against 40%, which reads as one shot replacing another.
 *
 * The rise is also what makes the shots that never had an entrance of their
 * own — Sample's board, Face's headline, System's token block — stop punching
 * through the shot they are replacing. Under a dip nothing was there to punch
 * through, so the omission never showed.
 *
 * The shrink is the last part: the outgoing shot goes behind rather than
 * dissolving in place, so the join is not two flat images piled on each other.
 *
 * `carry` is the exception, and the rest of this file turns on it. Six of the
 * eight joins here are not two pictures at all but one object seen twice —
 * screen 01 runs unbroken from shot 1 to shot 6, the words on its green card
 * become shot 3's headline, the stand-in shot 3 settles on heads shot 4's
 * block, and the eight boards shot 6 lines up are the eight rows shot 7
 * measures. Dissolve those and the film is nine unrelated slides. So the shot
 * on the far side of a join
 * renders the object where the near side left it and carries it on, in a layer
 * that skips the fade it would otherwise be caught by: `"out"` for the side
 * handing over, `"in"` for the side taking it. Two identical objects at
 * identical geometry, one handed to the other, read as one object.
 */
const fall = (frame: number, frames: number) =>
  1 - enter(frame, frames - 2, OVERLAP + 2);
const rise = (frame: number) => enter(frame, 4, 14);

const useJoin = (frames: number, carry?: "in" | "out"): React.CSSProperties => {
  const frame = useCurrentFrame();
  const out = carry === "out" ? 1 : fall(frame, frames);
  const in_ = carry === "in" ? 1 : rise(frame);
  return {
    opacity: out * in_,
    // A carried layer never shrinks. The shrink is there to put a dissolving
    // shot behind the one replacing it, and this layer is not dissolving —
    // it is the thing the two shots have in common, and a 1.5% wobble in it
    // is exactly what gives the handover away.
    transform: carry ? undefined : `scale(${0.985 + 0.015 * out})`,
  };
};

/**
 * Where the carried things are, on both sides of each join.
 *
 * Both sides run the same ramp on their own clocks: a join opens two frames
 * before a slot ends, so the shot taking over picks it up two frames in. That
 * is the `+ 2` in `Sample`, `Face`, `Art` and `Verify` below, and it is why these
 * numbers are here rather than inside the shots that use them.
 */
const CARRY = (frame: number, frames: number) =>
  enter(frame, frames - 2, OVERLAP + 2, Easing.inOut(Easing.cubic));

/**
 * Screen 01, at the first three of the five places the film puts it: centre
 * frame to open on, off to the left where `Measure` grids it, smaller where
 * `Sample` probes it. It is one object for the first third of the reel and
 * never cuts — the film opens on the thing it is about, then moves it aside
 * to make room for what it has to say about it.
 */
const HERO = {
  x: (1920 - PHONE.w * 0.95) / 2,
  y: (1080 - PHONE.h * 0.95) / 2,
  s: 0.95,
};
const HELD_A = { x: 250, y: 202, s: 0.78 };
const HELD_B = { x: 168, y: 232, s: 0.62 };

/** One placement to the next. Nests, so a board can be mid-leg on two legs. */
const between = (a: typeof HERO, b: typeof HERO, t: number) => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  s: a.s + (b.s - a.s) * t,
});

/**
 * "Order food and drink" on that board, in screen pt. The card is at
 * (--d-card-x, --d-card-y) and `.card .u` sits 16.6, 36.2 inside it, set in
 * --d-t-unit — `800 19.4px/24px`. `Face` grows this one line into its 96px
 * headline, so these are the numbers the headline starts from.
 */
const CARD_LINE = { x: 24.1 + 16.6, y: 111 + 36.2, size: 19.4, lh: 24 / 19.4 };

/**
 * Screen 01's last two legs. `System` parks it beside the block that describes
 * it, `Art` takes it over and cuts it up, and `Generate` flies it from there
 * into the first slot of the strip. Five placements, no cut in any of them.
 */
const SYS_BOARD = { x: 1500, y: 250, s: 0.48 };
const ART_BOARD = { x: 150, y: 200, s: 0.78 };

/**
 * The eight boards as `Generate` lines them up, and as `Verify` files them.
 * Centred: 8 x 138 + 7 x 14 = 1202, so x = (1920 - 1202) / 2.
 */
const STRIP = { x: 359, y: 372, step: PHONE.w * 0.33 + 14, s: 0.33 };
const FILE = { x: 96, y: 322, h: 56, s: 0.055 };

// ---------------------------------------------------------------------------
// Shared chrome

const Label: React.FC<{
  children: React.ReactNode;
  size?: number;
  color?: string;
  weight?: number;
  track?: number;
  style?: React.CSSProperties;
}> = ({
  children,
  size = 17,
  color = MUTE,
  weight = 400,
  track = 0.08,
  style,
}) => (
  <div
    style={{
      fontFamily: MONO,
      fontSize: size,
      fontWeight: weight,
      letterSpacing: `${track}em`,
      color,
      whiteSpace: "pre",
      ...style,
    }}
  >
    {children}
  </div>
);

/** A shot's own heading: the phase, then what it does, in the film's voice. */
const Heading: React.FC<{ phase: string; line: string; at?: number }> = ({
  phase,
  line,
  at = 2,
}) => {
  const frame = useCurrentFrame();
  const up = enter(frame, at, 14);
  return (
    <div
      style={{
        position: "absolute",
        left: 96,
        top: 92,
        opacity: up,
        transform: `translateY(${(1 - up) * 14}px)`,
      }}
    >
      <Label size={16} color={ACCENT} track={0.22}>
        {phase.toUpperCase()}
      </Label>
      <div
        style={{
          fontFamily: SANS,
          fontSize: 42,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: INK,
          marginTop: 12,
        }}
      >
        {line}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 1 · Grid it, then look

export const Measure: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const land = enter(frame, 0, 16);
  // The grid draws top down, the way `refkit grid` writes it out. It starts
  // before the walk has finished, so the ruler comes down onto the board while
  // the board is still settling rather than after it has parked.
  const sweep = enter(frame, 28, 22, Easing.inOut(Easing.cubic));
  const out = useJoin(frames);
  const held = useJoin(frames, "out");
  const [px, py, pw, ph] = EVIDENCE[0].box;
  const pin = enter(frame, 42, 10);
  // Three legs, and the board fades on none of them. It arrives centre frame,
  // walks left to make room for the heading and the readout, and then keeps
  // walking into `Sample`, which picks the last leg up on its own clock.
  const walk = enter(frame, 22, 16, Easing.inOut(Easing.cubic));
  const go = CARRY(frame, frames);
  const b = between(between(HERO, HELD_A, walk), HELD_B, go);

  const lines: React.ReactNode[] = [];
  for (let y = 0; y <= SCREEN.h; y += 10) {
    const major = y % 50 === 0;
    if (y > sweep * SCREEN.h) continue;
    lines.push(
      <line
        key={`h${y}`}
        x1={0}
        x2={SCREEN.w}
        y1={y}
        y2={y}
        stroke={major ? MAJOR : MINOR}
        strokeWidth={major ? 0.9 : 0.5}
        // The grid is only ever drawn over the board's white screen, never
        // over the film's ground, so it is tuned for white: at the 0.22 that
        // reads on black it is invisible on the phone.
        opacity={major ? 0.85 : 0.45}
      />,
    );
  }
  for (let x = 0; x <= SCREEN.w; x += 10) {
    const major = x % 50 === 0;
    lines.push(
      <line
        key={`v${x}`}
        y1={0}
        y2={sweep * SCREEN.h}
        x1={x}
        x2={x}
        stroke={major ? MAJOR : MINOR}
        strokeWidth={major ? 0.9 : 0.5}
        // The grid is only ever drawn over the board's white screen, never
        // over the film's ground, so it is tuned for white: at the 0.22 that
        // reads on black it is invisible on the phone.
        opacity={major ? 0.85 : 0.45}
      />,
    );
  }

  return (
    <>
      <AbsoluteFill style={held}>
        <div
          style={{
            position: "absolute",
            left: b.x,
            top: b.y,
            opacity: land,
            filter: `blur(${(1 - land) * 18}px)`,
            transform: `translateY(${(1 - land) * 42}px)`,
          }}
        >
          <Board slug={BOARDS[0]} scale={b.s} />
          <Over scale={b.s}>
            <g opacity={fall(frame, frames)}>
              {lines}
              {/* The one box the next shot will sample: it is drawn here
                  first, because a coordinate picked before the element is
                  named is a number with nothing attached to it. The next shot
                  redraws it in its own blue as this one goes — same board,
                  same place, so the box is handed over rather than cut to. */}
              <rect
                x={px}
                y={py}
                width={pw}
                height={ph}
                fill="none"
                // On the unit header's green fill, so the ground colour is
                // what reads: this one line is white because of what is
                // under it.
                stroke={GROUND}
                strokeWidth={1.6}
                strokeDasharray={`${pw + ph} ${pw + ph}`}
                strokeDashoffset={(1 - pin) * 2 * (pw + ph)}
                opacity={pin}
              />
            </g>
          </Over>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={out}>
        {/* Held back until the phone starts moving out of its way — for the
          first three quarters of a second the screen is the only thing on
          screen, which is what "start with a real app screen" means. And not
          before 30: the heading's line runs to about x 1016 at top 92, and the
          board is still high enough to cross it until the walk is half done. */}
        <Heading
          phase="measure"
          line="Start with a real app screen, and measure it."
          at={30}
        />

        {/* Three numbers off the grid, in design pt. The techniques that took
          them are in `data.ts` and on the canvas's own evidence board; on
          screen they would be three more lines to read in a second and a half,
          and the shot's job is only to show that a ruler went on first. */}
        <div
          style={{
            position: "absolute",
            left: 900,
            top: 396,
            opacity: pin,
            transform: `translateX(${(1 - pin) * -18}px)`,
          }}
        >
          <Label size={17} color={ACCENT} track={0.2}>
            THE GREEN CARD
          </Label>
          <div style={{ marginTop: 22, display: "grid", gap: 22 }}>
            {[
              ["how far from the left", "24.1pt"],
              ["how wide", "344.8pt"],
              ["how far down", "111pt"],
            ].map(([what, value], i) => (
              <div
                key={what}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 24,
                  opacity: stagger(frame, i, { at: 44, step: 3, frames: 8 }),
                }}
              >
                <Label size={21} color={MUTE} style={{ width: 330 }}>
                  {what}
                </Label>
                <Label size={28} color={INK} weight={700}>
                  {value}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </>
  );
};

// ---------------------------------------------------------------------------
// 2 · Sample, region by region

/** Where the rows sit, and so where each probe's leader has to reach. */
const ROWS_X = 700;

export const Sample: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const out = useJoin(frames);
  const held = useJoin(frames, "in");
  // Picking up the walk `Measure` started, two frames in because that is how
  // far past its own slot the previous shot runs. The `+ 2` on this clock and
  // the `frames - 2` on that one are the same instant, so the board is at
  // byte-identical geometry on the last frame of one and the first of the
  // next, and the cut lands on nothing at all.
  const b = between(
    HELD_A,
    HELD_B,
    enter(frame + 2, 0, OVERLAP + 2, Easing.inOut(Easing.cubic)),
  );
  // The overlay is in screen pt, the rows are in frame px: the leader has to
  // cross between them, so its far end is the row's x brought back through
  // the board's own placement — which is still moving for the first half
  // second, so this follows it rather than assuming where it landed.
  const reach = (ROWS_X - b.x - PHONE.bezel * b.s) / b.s;

  return (
    <>
      <AbsoluteFill style={held}>
        <div style={{ position: "absolute", left: b.x, top: b.y }}>
          <Board slug={BOARDS[0]} scale={b.s} />
          <Over scale={b.s}>
            {EVIDENCE.map(({ box: [x, y, w, h] }, i) => {
              const on = stagger(frame, i, { at: 2, step: 9, frames: 10 });
              return (
                <g key={i} opacity={on}>
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill={ACCENT}
                    opacity={0.14 * on}
                  />
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth={1.4}
                  />
                  {/* The leader runs to the row that carries this probe. */}
                  <line
                    x1={x + w}
                    y1={y + h / 2}
                    x2={reach}
                    y2={y + h / 2}
                    stroke={ACCENT}
                    strokeWidth={1}
                    opacity={0.5}
                  />
                </g>
              );
            })}
          </Over>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={out}>
        <Heading
          phase="sample"
          line="Read every colour and corner off the pixels."
        />
        <div
          style={{
            position: "absolute",
            left: ROWS_X,
            top: 342,
            display: "grid",
            gap: 40,
          }}
        >
          {EVIDENCE.map(({ name, value, note, swatch }, i) => {
            const on = stagger(frame, i, { at: 5, step: 9, frames: 12 });
            return (
              <div
                key={name}
                style={{
                  opacity: on,
                  transform: `translateX(${(1 - on) * -22}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    flex: "none",
                    background: swatch ?? "transparent",
                    border: swatch
                      ? `1px solid ${BORDER}`
                      : `2px solid ${ACCENT}`,
                    // The radius probe has no colour to show, so its chip shows
                    // the thing it did measure: one 13.5pt corner, square
                    // everywhere else so the arc is the only thing in it.
                    borderRadius: swatch ? 10 : 0,
                    borderTopLeftRadius: swatch ? 10 : 13.5,
                  }}
                />
                <div>
                  <div
                    style={{ display: "flex", alignItems: "baseline", gap: 16 }}
                  >
                    <Label size={22} color={INK} weight={700}>
                      {value}
                    </Label>
                    <Label size={19} color={MUTE}>
                      {name}
                    </Label>
                  </div>
                  <Label
                    size={16}
                    color={ACCENT}
                    track={0.01}
                    style={{ marginTop: 6 }}
                  >
                    {note}
                  </Label>
                </div>
              </div>
            );
          })}
          <div
            style={{
              marginTop: 36,
              fontFamily: SANS,
              fontSize: 26,
              fontWeight: 500,
              color: INK,
              opacity: enter(frame, 32, 12),
            }}
          >
            If it wasn&apos;t measured, it&apos;s a guess.
          </div>
        </div>
      </AbsoluteFill>
    </>
  );
};

// ---------------------------------------------------------------------------
// 3 · Name the face

export const Face: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const out = useJoin(frames);
  const held = useJoin(frames, "in");
  // This shot's headline is one line off the board the last two shots held:
  // `.card .u`, "Order food and drink", the biggest piece of type on screen
  // 01. So it does not fade in on the ground — it is already on the card at
  // the size the card sets, and it grows out of there to 96px while the board
  // goes. Same string, same family, same words: the shot after "read the
  // pixels" is "now name the type", and this is the type it read.
  const grow = enter(frame, 0, 12, Easing.inOut(Easing.cubic));
  const from = {
    x: HELD_B.x + (PHONE.bezel + CARD_LINE.x) * HELD_B.s,
    y: HELD_B.y + (PHONE.bezel + CARD_LINE.y) * HELD_B.s,
    k: (CARD_LINE.size * HELD_B.s) / 96,
  };
  // Candidates flick past once the headline has arrived — cycling through them
  // while it is still growing would throw away the one thing the match-move
  // buys, which is that the first frame of this shot is the last frame of the
  // one before it.
  const cycling = frame >= 12 && frame < 22;
  const which = Math.floor((frame - 12) / 2) % CANDIDATES.length;
  const face = cycling ? CANDIDATES[which] : CANDIDATES[0];
  const bar = enter(frame, 12, 14) * FONT_SCORE;
  const verdict = enter(frame, 24, 8);
  const fallback = enter(frame, 28, 10);

  return (
    <>
      <AbsoluteFill style={held}>
        <div
          style={{
            position: "absolute",
            left: 96,
            top: 336,
            fontFamily: `${face}, sans-serif`,
            fontWeight: 800,
            fontSize: 96,
            // The card sets 19.4/24, so the headline has to be set on the same
            // ratio or the two line boxes only line up at one scale.
            lineHeight: CARD_LINE.lh,
            letterSpacing: "-0.0222em",
            color: INK,
            transformOrigin: "left top",
            transform:
              `translate(${(1 - grow) * (from.x - 96)}px, ` +
              `${(1 - grow) * (from.y - 336)}px) ` +
              `scale(${from.k + (1 - from.k) * grow})`,
          }}
        >
          Order food and drink
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={out}>
        <Heading
          phase="typeface"
          line="Name the typeface, or admit you can't."
        />

        <div style={{ position: "absolute", left: 96, top: 466 }}>
          <Label size={17} color={cycling ? ACCENT : MUTE} track={0.18}>
            {(cycling ? face : "ui-rounded").toUpperCase()}
          </Label>

          {/* The bar is `FONT_SCORE` and the number is never printed: what this
            shot has to land is that the tool can decline, and a viewer who has
            not been told what a glyph-shape score is cannot read 0.353 as
            low. A short bar under "how sure" they can. */}
          <div style={{ marginTop: 58, width: 1150 }}>
            <Label
              size={17}
              color={ACCENT}
              track={0.18}
              style={{ marginBottom: 18 }}
            >
              HOW SURE THE MATCH IS
            </Label>
            <div
              style={{
                height: 10,
                borderRadius: 999,
                background: INSET,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${bar * 100}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${ACCENT}, ${DANGER})`,
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 20,
                marginTop: 20,
              }}
            >
              <div style={{ opacity: verdict }}>
                <Label size={26} color={DANGER} weight={700} track={0.16}>
                  TOO CLOSE TO CALL
                </Label>
              </div>
              <Label
                size={19}
                color={MUTE}
                track={0.01}
                style={{ opacity: verdict }}
              >
                the top two scored almost the same, so it refuses to pick one
              </Label>
            </div>
          </div>

          <div
            style={{
              marginTop: 44,
              opacity: fallback,
              transform: `translateY(${(1 - fallback) * 14}px)`,
              borderLeft: `2px solid ${ACCENT}`,
              paddingLeft: 22,
            }}
          >
            <Label size={23} color={INK} weight={500} track={0.01}>
              So the clone uses a stand-in — and says that it did.
            </Label>
            <Label size={18} color={MUTE} track={0.01} style={{ marginTop: 8 }}>
              an unlabelled guess is what makes a clone untrustworthy
            </Label>
          </div>
        </div>
      </AbsoluteFill>
    </>
  );
};

// ---------------------------------------------------------------------------
// 4 · The design system

/* The block splits the way a design system does: the face, then the colours,
   then the measurements. Split by what the value *is* rather than by index, so
   adding a colour to `RECIPE` puts it in the swatches without touching this. */
const COLOURS = RECIPE.filter(([, value]) => value.startsWith("#"));
const SIZES = RECIPE.filter(
  ([what, value]) => what !== "typeface" && !value.startsWith("#"),
);

export const System: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const out = useJoin(frames);
  const held = useJoin(frames, "out");
  const top = enter(frame, 2, 12);
  // The board walks on into `Art`, which cuts it up. Everything this block
  // describes is chrome; the next shot is about the part that is not.
  const b = between(SYS_BOARD, ART_BOARD, CARRY(frame, frames));

  return (
    <>
      <AbsoluteFill style={out}>
        <Heading
          phase="design system"
          line="One block of colours and sizes, shared by all eight screens."
        />

        {/* The face heads the block because it heads the board's own `:root`,
            and because the shot before this one ends on the stand-in that put
            it there. It is the only thing the tool declared rather than read,
            which is why it gets its own rule and not a swatch. */}
        <div
          style={{
            position: "absolute",
            left: 96,
            top: 268,
            width: 764,
            opacity: top,
            transform: `translateY(${(1 - top) * 12}px)`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <Label size={22} color={MUTE} track={0.01}>
              {RECIPE[0][0]}
            </Label>
            <Label size={22} color={INK} track={0}>
              {RECIPE[0][1]}
            </Label>
          </div>
          <div style={{ height: 1, background: BORDER, marginTop: 14 }} />
        </div>

        <div
          style={{
            position: "absolute",
            left: 96,
            top: 340,
            display: "grid",
            gridTemplateColumns: "repeat(4, 176px)",
            gap: "28px 20px",
          }}
        >
          {COLOURS.map(([name, hex], i) => {
            const on = stagger(frame, i, { at: 6, step: 1, frames: 12 });
            return (
              <div
                key={name}
                style={{
                  opacity: on,
                  transform: `translateY(${(1 - on) * 12}px)`,
                }}
              >
                {/* Inset hairline rather than a border, so #FFFFFF still reads
                    as a swatch on white ground and the chip stays 176 wide. */}
                <div
                  style={{
                    width: 176,
                    height: 72,
                    borderRadius: 8,
                    background: hex,
                    boxShadow: `inset 0 0 0 1px ${BORDER}`,
                  }}
                />
                <Label
                  size={14}
                  color={INK}
                  track={0.01}
                  style={{ marginTop: 10 }}
                >
                  {name}
                </Label>
                <Label
                  size={14}
                  color={MUTE}
                  track={0.02}
                  style={{ marginTop: 3 }}
                >
                  {hex}
                </Label>
              </div>
            );
          })}
        </div>

        <div style={{ position: "absolute", left: 940, top: 340, width: 440 }}>
          {SIZES.map(([what, value], i) => {
            const on = stagger(frame, i, { at: 14, step: 1, frames: 12 });
            return (
              <div
                key={what}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  height: 44,
                  opacity: on,
                  transform: `translateY(${(1 - on) * 10}px)`,
                }}
              >
                <Label size={18} color={MUTE} track={0.01}>
                  {what}
                </Label>
                <Label size={18} color={INK} track={0}>
                  {value}
                </Label>
              </div>
            );
          })}
        </div>

        <Label
          size={17}
          color={MUTE}
          track={0.02}
          style={{
            position: "absolute",
            left: 96,
            top: 800,
            opacity: enter(frame, 28, 10),
          }}
        >
          nothing here was chosen — every value was read off the screenshot
        </Label>
      </AbsoluteFill>

      <AbsoluteFill style={held}>
        <div style={{ position: "absolute", left: b.x, top: b.y }}>
          <Board slug={BOARDS[0]} scale={b.s} />
        </div>
      </AbsoluteFill>
    </>
  );
};

// ---------------------------------------------------------------------------
// 5 · The artwork, cut rather than drawn

/** px per design pt once a crop is off the board, and where the row sits. */
const CROP_ZOOM = 1.55;
const CROPS_X = 660;

export const Art: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const out = useJoin(frames);
  const b = between(
    SYS_BOARD,
    ART_BOARD,
    enter(frame + 2, 0, OVERLAP + 2, Easing.inOut(Easing.cubic)),
  );
  // Carried on both sides: handed in by `System` mid-walk, handed out to
  // `Generate`, which flies it into the strip. So no fade in either direction
  // — it just stops on the frame the next shot starts drawing it.
  const handed = frame < frames ? 1 : 0;
  const marks = leave(frame, 40, 10);

  return (
    <>
      <AbsoluteFill style={out}>
        <Heading
          phase="artwork"
          line="The pictures are cut out of the screenshot, not redrawn."
          at={14}
        />

        {/* The same six boxes, off the board and at 1.55x. Bottom-aligned
            rather than centred, because their heights are the measurement and
            a common baseline is the only alignment that does not hide it. */}
        <div
          style={{
            position: "absolute",
            left: CROPS_X,
            top: 300,
            height: 186,
            display: "flex",
            alignItems: "flex-end",
            gap: 26,
          }}
        >
          {CROPS.map(({ id, box }, i) => {
            const on = stagger(frame, i, { at: 20, step: 2, frames: 12 });
            return (
              <Img
                key={id}
                src={staticFile(`canvases/duolingo-ios/assets/art/${id}.png`)}
                style={{
                  display: "block",
                  width: (box[2] - box[0]) * CROP_ZOOM,
                  height: (box[3] - box[1]) * CROP_ZOOM,
                  opacity: on,
                  transform: `translateY(${(1 - on) * 20}px)`,
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            position: "absolute",
            left: CROPS_X,
            top: 540,
            opacity: enter(frame, 26, 14),
          }}
        >
          <div
            style={{
              fontFamily: SANS,
              fontSize: 104,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: INK,
              lineHeight: 1,
            }}
          >
            {ART_COUNT}
          </div>
          <Label size={16} color={MUTE} track={0.18} style={{ marginTop: 16 }}>
            PIECES, EACH CUT AT THE SIZE IT WAS MEASURED
          </Label>
        </div>

        <div
          style={{
            position: "absolute",
            left: CROPS_X,
            top: 724,
            width: 780,
            fontFamily: SANS,
            fontSize: 24,
            lineHeight: 1.5,
            color: MUTE,
            opacity: enter(frame, 36, 10),
          }}
        >
          Cut out, they are the original&rsquo;s own pixels. Asked to redraw
          them, the best attempt still moves things.
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ opacity: handed }}>
        <div style={{ position: "absolute", left: b.x, top: b.y }}>
          <Board slug={BOARDS[0]} scale={b.s} />
          {/* Boxes in the screen's own pt, straight out of `crops.json`, so
              what is outlined here is exactly what was cut — the film draws
              the measurement rather than an illustration of it. */}
          {marks > 0 && (
            <Over scale={b.s}>
              {/* Off the board well before the handover, not on the shot's own
                ramp: this layer does not fade with the shot — `Generate` flies
                the same board into the strip — so a box still 90% up on the
                last frame would pop off on the cut. It has also done its job by
                then, and a generated screen with measuring marks still on it
                would be claiming something the next shot does not mean. */}
              <g opacity={marks}>
                {CROPS.map(({ id, box }, i) => (
                  <rect
                    key={id}
                    x={box[0]}
                    y={box[1]}
                    width={box[2] - box[0]}
                    height={box[3] - box[1]}
                    rx={2}
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth={1.6}
                    opacity={stagger(frame, i, { at: 16, step: 2, frames: 10 })}
                  />
                ))}
              </g>
            </Over>
          )}
        </div>
      </AbsoluteFill>
    </>
  );
};

// ---------------------------------------------------------------------------
// 6 · One generator

export const Generate: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const out = useJoin(frames);
  // Board 01 is not new here. It is the one the last three shots have been
  // holding, flying into the first slot of the strip while the other seven
  // arrive behind it — which is the whole claim of the shot: one screen's
  // worth of measurement, and then all eight off the same two inputs.
  const fly = enter(frame, 0, 18, Easing.inOut(Easing.cubic));
  // The strip is handed to `Verify`, which flies these same eight boards into
  // its eight rows. This copy stops dead on the frame that one appears, at
  // identical geometry, so there is never a second strip under the flight.
  const handed = frame < frames ? 1 : 0;

  return (
    <>
      <AbsoluteFill style={out}>
        <Heading
          phase="build"
          line="One script turns those two things into eight screens."
        />

        <Label
          size={17}
          color={MUTE}
          track={0.02}
          style={{
            position: "absolute",
            left: STRIP.x,
            top: 706,
            opacity: enter(frame, 28, 10),
          }}
        >
          one script reads the block, places the cut-outs, writes all eight
        </Label>
      </AbsoluteFill>

      {/* Every board inlines that block byte-identically: artboards are output,
          never source, so a hand-edit to one is reverted by the next run. */}
      <AbsoluteFill style={{ opacity: handed }}>
        {BOARDS.map((slug, i) => {
          const seat = { x: STRIP.x + i * STRIP.step, y: STRIP.y, s: STRIP.s };
          const p = i === 0 ? between(ART_BOARD, seat, fly) : seat;
          const on =
            i === 0 ? 1 : stagger(frame, i - 1, { at: 8, step: 3, frames: 14 });
          return (
            <div
              key={slug}
              style={{
                position: "absolute",
                left: p.x,
                top: p.y,
                opacity: on,
                transform: `translateY(${(1 - on) * 34}px)`,
              }}
            >
              <Board slug={slug} scale={p.s} />
            </div>
          );
        })}
      </AbsoluteFill>
    </>
  );
};

// ---------------------------------------------------------------------------
// 7 · Verify by rendering

export const Verify: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const out = useJoin(frames);
  const held = useJoin(frames, "in");
  const worst = Math.max(...DELTAS.map((row) => row.d));
  // The eight boards the last shot lined up are the eight rows this one
  // measures, so they arrive as that strip and file themselves into the rows
  // rather than being cut away and replaced by their own names. The rows wait
  // for them: nothing under the flight until each board has somewhere to land.
  const land = enter(frame, 0, 18, Easing.inOut(Easing.cubic));
  const seat = (i: number) =>
    FILE.y + i * FILE.h + (FILE.h - PHONE.h * FILE.s) / 2;

  return (
    <>
      <AbsoluteFill style={out}>
        <Heading
          phase="check"
          line="Build it back, and compare it to the original."
        />

        <div style={{ position: "absolute", left: 96, top: 322, width: 880 }}>
          {DELTAS.map(({ screen, d }, i) => {
            const on = stagger(frame, i, { at: 8, step: 2, frames: 12 });
            return (
              <div
                key={screen}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  height: FILE.h,
                  opacity: on,
                }}
              >
                {/* The board that flew in sits here. It is drawn in its own
                  layer, because it is still arriving while this row fades up
                  and the two cannot share an opacity. */}
                <div style={{ width: PHONE.w * FILE.s, flex: "none" }} />
                <Label size={18} color={MUTE} style={{ width: 240 }}>
                  {screen}
                </Label>
                <div
                  style={{
                    flex: 1,
                    height: 8,
                    borderRadius: 999,
                    background: INSET,
                  }}
                >
                  <div
                    style={{
                      width: `${(on * d * 100) / worst}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: DUO_GREEN,
                      opacity: 0.85,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ position: "absolute", left: 1130, top: 376 }}>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 172,
              fontWeight: 600,
              letterSpacing: "-0.05em",
              color: INK,
              lineHeight: 1,
              opacity: enter(frame, 16, 14),
            }}
          >
            {(enter(frame, 16, 16) * MEAN_DELTA).toFixed(2)}
          </div>
          <Label
            size={19}
            color={ACCENT}
            track={0.14}
            style={{ marginTop: 18, opacity: enter(frame, 16, 14) }}
          >
            AVERAGE DIFFERENCE
          </Label>
          {/* The bars carry the same eight numbers and no longer print them: one
            figure is the claim, and eight more only make it harder to read.
            This line is what turns the one figure into a size a viewer can
            picture — without it, 2.04 of nothing is not a result. */}
          <div
            style={{
              marginTop: 30,
              width: 420,
              opacity: enter(frame, 26, 8),
              fontFamily: SANS,
              fontSize: 24,
              fontWeight: 400,
              lineHeight: 1.45,
              color: MUTE,
            }}
          >
            per pixel, on a scale where 0 is identical and 255 is black against
            white
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={held}>
        {BOARDS.map((slug, i) => (
          <div
            key={slug}
            style={{
              position: "absolute",
              left: interpolate(
                land,
                [0, 1],
                [STRIP.x + i * STRIP.step, FILE.x],
              ),
              top: interpolate(land, [0, 1], [STRIP.y, seat(i)]),
            }}
          >
            <Board
              slug={slug}
              scale={interpolate(land, [0, 1], [STRIP.s, FILE.s])}
            />
          </div>
        ))}
      </AbsoluteFill>
    </>
  );
};

// ---------------------------------------------------------------------------
// 6 · The two rows

export const TwoRows: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const out = useJoin(frames);
  const in_ = enter(frame, 0, 26, Easing.out(Easing.quad));

  return (
    <AbsoluteFill
      style={{ ...out, alignItems: "center", justifyContent: "center" }}
    >
      <div
        style={{
          opacity: in_,
          // A slow settle rather than a push: the claim is that the two rows
          // line up, and a moving frame is a bad place to check an alignment.
          transform: `scale(${1.05 - 0.05 * in_})`,
        }}
      >
        {/* 2930 x 1532, so 1700 wide is 889 tall and the figure's own white
            ground leaves a band top and bottom for the film's type. Any wider
            and the line below sits on the artwork and cannot be read. */}
        <Img
          src={comparison}
          // The figure's own ground is white, which on a white film would
          // leave it with no edge at all. Primer's border is that edge.
          style={{
            width: 1700,
            display: "block",
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 110,
          bottom: 32,
          opacity: enter(frame, 8, 14),
          fontFamily: SANS,
          fontSize: 30,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          color: INK,
        }}
      >
        Ours on top. The original underneath.
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 7 · End card

export const End: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  // Six frames of head, like every other shot's rise, so the wordmark is not
  // coming up through the tail of the figure that precedes it.
  const up = enter(frame, 6, 16);
  const rule = enter(frame, 12, 18, Easing.inOut(Easing.cubic));
  const tail = enter(frame, 17, 14);
  // The film ends on the ground it opened on rather than fading to nothing.
  const hold = leave(frame, frames - 6, 6);

  return (
    <AbsoluteFill
      style={{
        opacity: hold,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: 96,
          fontWeight: 600,
          letterSpacing: "-0.045em",
          color: INK,
          opacity: up,
          filter: `blur(${(1 - up) * 10}px)`,
        }}
      >
        super-prototyping
      </div>
      <div
        style={{
          width: 760 * rule,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${BORDER}, transparent)`,
          margin: "34px 0 30px",
        }}
      />
      <div
        style={{
          fontFamily: SANS,
          fontSize: 27,
          fontWeight: 400,
          color: MUTE,
          opacity: tail,
        }}
      >
        Nothing is guessed. Every colour and every size was measured.
      </div>
      <Label
        size={18}
        color={ACCENT}
        track={0.06}
        style={{ marginTop: 40, opacity: tail }}
      >
        github.com/ReScienceLab/super-prototyping
      </Label>
    </AbsoluteFill>
  );
};
