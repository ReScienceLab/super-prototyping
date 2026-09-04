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
  DUO_GREEN,
  EVIDENCE,
  FONT_SCORE,
  FONT_TOP,
  GLOW,
  GROUND,
  HAZE,
  MAJOR,
  MEAN_DELTA,
  MINOR,
  MONO,
  MUTE,
  PAPER,
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
      // The logo's own treatment: a white-edged panel lit on black.
      boxShadow: `0 0 0 1px rgba(255,255,255,.18), 0 0 ${90 * scale}px rgba(185,167,255,.22), 0 ${24 * scale}px ${70 * scale}px rgba(0,0,0,.6)`,
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
      <Label size={16} color={MINOR} track={0.22}>
        {phase.toUpperCase()}
      </Label>
      <div
        style={{
          fontFamily: SANS,
          fontSize: 42,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: PAPER,
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
  const out = leave(frame, frames - 8, 8);
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
        // Over the board's white ground rather than a dark one: at the 0.22
        // that reads on black this grid is invisible on the phone, which is
        // the only place it is drawn.
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
        // Over the board's white ground rather than a dark one: at the 0.22
        // that reads on black this grid is invisible on the phone, which is
        // the only place it is drawn.
        opacity={major ? 0.85 : 0.45}
      />,
    );
  }

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Heading phase="1a · grid" line="Grid the capture, then look at it." />
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
            stroke={GLOW}
            strokeWidth={1.6}
            strokeDasharray={`${bw + bh} ${bw + bh}`}
            strokeDashoffset={(1 - pin) * 2 * (bw + bh)}
            opacity={pin}
          />
        </Over>
      </div>

      {/* Read off the red labels, in design pt, before anything is measured. */}
      <div
        style={{
          position: "absolute",
          left: 900,
          top: 396,
          opacity: pin,
          transform: `translateX(${(1 - pin) * -18}px)`,
        }}
      >
        <Label size={17} color={MINOR} track={0.2}>
          UNIT HEADER
        </Label>
        <div style={{ marginTop: 20, display: "grid", gap: 20 }}>
          {[
            ["--d-card-x", "24.1pt", "row scan at y 150"],
            ["--d-card-w", "344.8pt", "24.1 → 368.9"],
            ["--d-card-y", "111pt", "from the corner fit"],
          ].map(([token, value, how], i) => (
            <div
              key={token}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 18,
                opacity: stagger(frame, i, { at: 22, step: 3, frames: 8 }),
              }}
            >
              <Label size={23} color={MUTE} style={{ width: 172 }}>
                {token}
              </Label>
              <Label
                size={26}
                color={PAPER}
                weight={700}
                style={{ width: 132 }}
              >
                {value}
              </Label>
              <Label size={16} color={MUTE} track={0.01}>
                {how}
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
  const out = leave(frame, frames - 8, 8);
  // The overlay is in screen pt, the rows are in frame px: the leader has to
  // cross between them, so its far end is the row's x brought back through
  // the board's own placement.
  const reach = (ROWS_X - 168 - PHONE.bezel * s) / s;

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Heading
        phase="1b · sample"
        line="One region, one technique, one token."
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
                  fill={MINOR}
                  opacity={0.14 * on}
                />
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill="none"
                  stroke={MINOR}
                  strokeWidth={1.4}
                />
                {/* The leader runs to the row that carries this probe. */}
                <line
                  x1={x + w}
                  y1={y + h / 2}
                  x2={reach}
                  y2={y + h / 2}
                  stroke={MINOR}
                  strokeWidth={1}
                  opacity={0.35}
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
        {EVIDENCE.map(({ token, value, how, swatch }, i) => {
          const on = stagger(frame, i, { at: 5, step: 9, frames: 12 });
          return (
            <div
              key={token}
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
                    ? "1px solid rgba(255,255,255,.22)"
                    : `2px solid ${MINOR}`,
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
                  <Label size={21} color={PAPER} weight={700}>
                    {value}
                  </Label>
                  <Label size={18} color={MUTE}>
                    {token}
                  </Label>
                </div>
                <Label
                  size={16}
                  color={MINOR}
                  track={0.01}
                  style={{ marginTop: 6 }}
                >
                  {how}
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
            color: PAPER,
            opacity: enter(frame, 32, 12),
          }}
        >
          A token with no evidence is a guess.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 3 · Name the face

export const Face: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const out = leave(frame, frames - 8, 8);
  // Candidates flick past at 4 frames each until the run settles.
  const cycling = frame < 20;
  const which = Math.floor(frame / 4) % CANDIDATES.length;
  const face = cycling ? CANDIDATES[which] : CANDIDATES[0];
  const bar = enter(frame, 4, 16) * FONT_SCORE;
  const verdict = enter(frame, 22, 8);
  const fallback = enter(frame, 28, 12);

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Heading
        phase="1c · the face"
        line="Rank it against a closed set, or refuse."
      />

      <div style={{ position: "absolute", left: 96, top: 336 }}>
        <div
          style={{
            fontFamily: `${face}, sans-serif`,
            fontWeight: 800,
            fontSize: 96,
            letterSpacing: "-0.02em",
            color: PAPER,
            height: 130,
          }}
        >
          Order food and drink
        </div>
        <Label size={17} color={cycling ? MINOR : MUTE} track={0.18}>
          {(cycling ? face : "ui-rounded").toUpperCase()}
        </Label>

        {/* The score, and the 0.05 margin under which the tool says no call. */}
        <div style={{ marginTop: 58, width: 1150 }}>
          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: "rgba(255,255,255,.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${bar * 100}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${MINOR}, ${MAJOR})`,
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
            <Label size={40} color={PAPER} weight={700} track={0}>
              {bar.toFixed(3)}
            </Label>
            <div style={{ opacity: verdict }}>
              <Label size={22} color={MAJOR} weight={700} track={0.16}>
                NO CALL
              </Label>
            </div>
            <Label
              size={17}
              color={MUTE}
              track={0.01}
              style={{ opacity: verdict }}
            >
              top scorer {FONT_TOP} at {FONT_SCORE} · the top two sit inside 0.05
            </Label>
          </div>
        </div>

        <div
          style={{
            marginTop: 44,
            opacity: fallback,
            transform: `translateY(${(1 - fallback) * 14}px)`,
            borderLeft: `2px solid ${MINOR}`,
            paddingLeft: 22,
          }}
        >
          <Label size={22} color={PAPER} weight={500} track={0.01}>
            --d-font: ui-rounded — a declared stand-in
          </Label>
          <Label size={17} color={MUTE} track={0.01} style={{ marginTop: 8 }}>
            its cap sits at 0.762em, not SF Pro&apos;s 0.714, so every size is
            re-fitted on the render
          </Label>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 4 · One token block, one generator

/** The measured `:root`, trimmed to what reads at this size and this speed. */
const ROOT = `:root{
  --d-font:ui-rounded,"SF Pro Rounded"…
  --d-bg:#FFFFFF;
  --d-panel:#F7F7F7;
  --d-scrim:rgba(0,0,0,.396);
  --d-rule:#E3E3E3;
  --d-ink:#4B4B4B;
  --d-ink-2:#AFAFAF;
  --d-u-green:#59CC01;
  --d-u-green-d:#45A302;
  --d-u-red:#FF4C4B;
  --d-u-blue:#1DB1F8;
  --d-u-purple:#C385F7;
  --d-cta:#53ADF0;
  --d-orange:#F89402;
  --d-r-card:13.5px;
  --d-r-btn:10px;
  --d-r-tile:24px;
  --d-t-unit:800 19.4px/24px;
  --d-t-title:800 22.9px/29px;
  --d-t-body:500 19.3px/23.2px;
  --d-card-x:24.1px;
  --d-card-w:344.8px;
  --d-tabs-y:756.6px;
}`.split("\n");

export const Generate: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const out = leave(frame, frames - 8, 8);
  const scroll = interpolate(frame, [0, frames], [0, ROOT.length * 30 - 420], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Heading
        phase="2 · 3 · generate"
        line="One token block. One generator. Eight boards."
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
        <div style={{ transform: `translateY(${-scroll}px)` }}>
          {ROOT.map((line, i) => (
            <Label
              key={i}
              size={19}
              color={line.includes("#") ? PAPER : MUTE}
              track={0}
              style={{ lineHeight: "30px" }}
            >
              {line}
            </Label>
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
        gen.py — 128 illustrations, every one cropped out of the capture at its
        own measured box
      </Label>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 5 · Verify by rendering

export const Verify: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const out = leave(frame, frames - 8, 8);
  const worst = Math.max(...DELTAS.map((row) => row.d));

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Heading
        phase="4 · verify"
        line="Re-render it, and diff it against the capture."
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
              <Label size={17} color={MUTE} style={{ width: 250 }}>
                {screen}
              </Label>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 999,
                  background: "rgba(255,255,255,.07)",
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
              <Label
                size={20}
                color={PAPER}
                weight={500}
                track={0}
                style={{ width: 62 }}
              >
                {(on * d).toFixed(2)}
              </Label>
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
            color: PAPER,
            lineHeight: 1,
            opacity: enter(frame, 10, 14),
          }}
        >
          {(enter(frame, 10, 16) * MEAN_DELTA).toFixed(2)}
        </div>
        <Label size={19} color={MINOR} track={0.14} style={{ marginTop: 18 }}>
          MEAN Δ, OF 255 LEVELS
        </Label>
        <div
          style={{
            marginTop: 34,
            opacity: enter(frame, 20, 8),
            display: "grid",
            gap: 10,
          }}
        >
          <Label size={17} color={MUTE} track={0.01}>
            13 colour probes replayed · mean Δmax 0.5
          </Label>
          <Label size={17} color={MUTE} track={0.01}>
            16 box probes · mean |dw| 0.98pt, |dh| 0.38pt
          </Label>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 6 · The two rows

export const TwoRows: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const out = leave(frame, frames - 10, 10);
  const in_ = enter(frame, 0, 26, Easing.out(Easing.quad));

  return (
    <AbsoluteFill
      style={{ opacity: out, alignItems: "center", justifyContent: "center" }}
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
        <Img src={comparison} style={{ width: 1700, display: "block" }} />
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
          color: PAPER,
        }}
      >
        Every replica sits directly above its source.
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 7 · End card

export const End: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const up = enter(frame, 0, 18);
  const rule = enter(frame, 8, 20, Easing.inOut(Easing.cubic));
  const tail = enter(frame, 14, 16);
  // The film ends on the ground it opened on rather than fading to nothing.
  const hold = leave(frame, frames - 6, 6);

  return (
    <AbsoluteFill
      style={{
        opacity: hold,
        alignItems: "center",
        justifyContent: "center",
        background: GROUND,
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontSize: 96,
          fontWeight: 600,
          letterSpacing: "-0.045em",
          color: PAPER,
          opacity: up,
          filter: `blur(${(1 - up) * 10}px)`,
          textShadow: `0 0 90px ${HAZE}55`,
        }}
      >
        super-prototyping
      </div>
      <div
        style={{
          width: 760 * rule,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${GLOW}55, transparent)`,
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
        Every colour and every metric in a cloned artboard traces to a
        measurement.
      </div>
      <Label
        size={18}
        color={MINOR}
        track={0.06}
        style={{ marginTop: 40, opacity: tail }}
      >
        github.com/ReScienceLab/super-prototyping
      </Label>
    </AbsoluteFill>
  );
};
