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
  BOARDS,
  CANDIDATES,
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
 * The reel's seven shots. Each is a plain component with no length of its own
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
 * The rise is also what makes the three shots that never had an entrance of
 * their own — Sample's board, Face's headline, Generate's token block — stop
 * punching through the shot they are replacing. Under a dip nothing was there
 * to punch through, so the omission never showed.
 *
 * The shrink is the last part: the outgoing shot goes behind rather than
 * dissolving in place, so the join is not two flat images piled on each other.
 */
const useJoin = (frames: number): React.CSSProperties => {
  const frame = useCurrentFrame();
  const out = 1 - enter(frame, frames - 2, OVERLAP + 2);
  const in_ = enter(frame, 4, 14);
  return {
    opacity: out * in_,
    transform: `scale(${0.985 + 0.015 * out})`,
  };
};

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
  const s = 0.78;
  const land = enter(frame, 0, 16);
  // The grid draws top down, the way `refkit grid` writes it out.
  const sweep = enter(frame, 4, 22, Easing.inOut(Easing.cubic));
  const out = useJoin(frames);
  const [bx, by, bw, bh] = EVIDENCE[0].box;
  const pin = enter(frame, 18, 10);

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
    <AbsoluteFill style={out}>
      <Heading
        phase="measure"
        line="Start with a real app screen, and measure it."
      />
      <div
        style={{
          position: "absolute",
          left: 250,
          top: 202,
          opacity: land,
          filter: `blur(${(1 - land) * 18}px)`,
          transform: `translateY(${(1 - land) * 42}px)`,
        }}
      >
        <Board slug={BOARDS[0]} scale={s} />
        <Over scale={s}>
          {lines}
          {/* The one box the next shot will sample: it is drawn here first,
              because a coordinate picked before the element is named is a
              number with nothing attached to it. */}
          <rect
            x={bx}
            y={by}
            width={bw}
            height={bh}
            fill="none"
            // On the unit header's green fill, so the ground colour is what
            // reads: this one line is white because of what is under it.
            stroke={GROUND}
            strokeWidth={1.6}
            strokeDasharray={`${bw + bh} ${bw + bh}`}
            strokeDashoffset={(1 - pin) * 2 * (bw + bh)}
            opacity={pin}
          />
        </Over>
      </div>

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
                opacity: stagger(frame, i, { at: 22, step: 3, frames: 8 }),
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
  );
};

// ---------------------------------------------------------------------------
// 2 · Sample, region by region

/** Where the rows sit, and so where each probe's leader has to reach. */
const ROWS_X = 700;

export const Sample: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const s = 0.62;
  const out = useJoin(frames);
  // The overlay is in screen pt, the rows are in frame px: the leader has to
  // cross between them, so its far end is the row's x brought back through
  // the board's own placement.
  const reach = (ROWS_X - 168 - PHONE.bezel * s) / s;

  return (
    <AbsoluteFill style={out}>
      <Heading
        phase="sample"
        line="Read every colour and corner off the pixels."
      />
      <div style={{ position: "absolute", left: 168, top: 232 }}>
        <Board slug={BOARDS[0]} scale={s} />
        <Over scale={s}>
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
  );
};

// ---------------------------------------------------------------------------
// 3 · Name the face

export const Face: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const out = useJoin(frames);
  // Candidates flick past at 4 frames each until the run settles.
  const cycling = frame < 20;
  const which = Math.floor(frame / 4) % CANDIDATES.length;
  const face = cycling ? CANDIDATES[which] : CANDIDATES[0];
  const bar = enter(frame, 4, 16) * FONT_SCORE;
  const verdict = enter(frame, 22, 8);
  const fallback = enter(frame, 28, 12);

  return (
    <AbsoluteFill style={out}>
      <Heading
        phase="typeface"
        line="Name the typeface, or admit you can't."
      />

      <div style={{ position: "absolute", left: 96, top: 336 }}>
        <div
          style={{
            fontFamily: `${face}, sans-serif`,
            fontWeight: 800,
            fontSize: 96,
            letterSpacing: "-0.02em",
            color: INK,
            height: 130,
          }}
        >
          Order food and drink
        </div>
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
  );
};

// ---------------------------------------------------------------------------
// 4 · One token block, one generator

/** Line height of one row of the recipe, and so how far the block scrolls. */
const ROW = 34;

export const Generate: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const out = useJoin(frames);
  const scroll = interpolate(
    frame,
    [0, frames],
    [0, RECIPE.length * ROW - 420],
    { extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={out}>
      <Heading
        phase="build"
        line="Every measurement goes into one list."
      />

      <div
        style={{
          position: "absolute",
          left: 96,
          top: 296,
          width: 430,
          height: 520,
          overflow: "hidden",
          maskImage:
            "linear-gradient(180deg, transparent, #000 12%, #000 78%, transparent)",
          WebkitMaskImage:
            "linear-gradient(180deg, transparent, #000 12%, #000 78%, transparent)",
        }}
      >
        {/* The real block is CSS custom properties — `--d-u-green-d:#45A302`.
            Read at this size and this speed by someone who has not seen one
            before, that is a wall of punctuation; under the film's own names
            for the same values it is a recipe, which is all the shot claims it
            is. The names are in `data.ts` beside the board they came off. */}
        <div style={{ transform: `translateY(${-scroll}px)` }}>
          {RECIPE.map(([what, value]) => (
            <div
              key={what}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                height: ROW,
              }}
            >
              <Label size={19} color={MUTE} track={0.01}>
                {what}
              </Label>
              <Label size={19} color={INK} track={0}>
                {value}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Every board inlines that block byte-identically: artboards are output,
          never source, so a hand-edit to one is reverted by the next run. */}
      <div
        style={{
          position: "absolute",
          left: 596,
          top: 400,
          display: "flex",
          gap: 14,
        }}
      >
        {BOARDS.map((slug, i) => {
          const on = stagger(frame, i, { at: 2, step: 3, frames: 14 });
          return (
            <div
              key={slug}
              style={{
                opacity: on,
                transform: `translateY(${(1 - on) * 34}px)`,
              }}
            >
              {/* 0.33 is what puts all eight inside the frame beside the
                  token block: 8 x 138 + 7 x 14 = 1202, from x 596. */}
              <Board slug={slug} scale={0.33} />
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
          left: 596,
          top: 730,
          opacity: enter(frame, 24, 10),
        }}
      >
        one script reads the list and builds all eight screens
      </Label>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 5 · Verify by rendering

export const Verify: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const out = useJoin(frames);
  const worst = Math.max(...DELTAS.map((row) => row.d));

  return (
    <AbsoluteFill style={out}>
      <Heading
        phase="check"
        line="Build it back, and compare it to the original."
      />

      <div style={{ position: "absolute", left: 96, top: 322, width: 880 }}>
        {DELTAS.map(({ screen, d }, i) => {
          const on = stagger(frame, i, { at: 2, step: 2, frames: 12 });
          return (
            <div
              key={screen}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                height: 56,
                opacity: on,
              }}
            >
              <Label size={18} color={MUTE} style={{ width: 250 }}>
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
            opacity: enter(frame, 10, 14),
          }}
        >
          {(enter(frame, 10, 16) * MEAN_DELTA).toFixed(2)}
        </div>
        <Label size={19} color={ACCENT} track={0.14} style={{ marginTop: 18 }}>
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
            opacity: enter(frame, 20, 8),
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
