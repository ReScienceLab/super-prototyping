import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type RecordProps,
  type TLShape,
} from "tldraw";
import { CANVAS_FILE_DEFAULT_SIZE } from "./CanvasFileShapeUtil";
import { canvasFileHtml, canvasIconUrl, readCanvasLayout } from "./canvasLibrary";

export const CANVAS_LINK_SHAPE_TYPE = "canvas-link" as const;

/**
 * The phone frame in a 478 x 980 artboard, `[x, y, w, h]`, which every folder here draws at the
 * same place; a folder whose cover is not a phone overrides it with `coverBox` in its layout.json.
 * A card crops to this rather than showing the whole board, so what it shows is the mockup and
 * not the artboard margin around it.
 */
const DEFAULT_COVER_BOX: [number, number, number, number] = [46, 24, 393, 852];

/**
 * The case the cropped board is fitted into, mockups/canvases/templates own phone: a 393 x 852
 * screen at radius 52, wearing the same two-ring bezel every board here draws. The card supplies
 * it rather than the board, so eleven folders that each drew their phone a little differently
 * come out as one device at one size.
 */
const SHELL = { w: 393, h: 852, radius: 52, bezel: 11, edge: 12.5 } as const;
const CARD_W = CANVAS_FILE_DEFAULT_SIZE.w / 2;
/** Sized so the bezel's outer ring, not the screen, is what meets the card's left and right. */
const SHELL_SCALE = CARD_W / (SHELL.w + 2 * SHELL.edge);
const SCREEN = { w: SHELL.w * SHELL_SCALE, h: SHELL.h * SHELL_SCALE };

/** Cards are half a board wide, and exactly as tall as the device they hold. */
export const CANVAS_LINK_CARD_SIZE = {
  w: CARD_W,
  h: Math.round(SCREEN.h + 2 * SHELL.edge * SHELL_SCALE),
} as const;
/** The app-icon sticker on a card: how big, how far past the device's left edge, how far turned. */
const ICON = { size: 62, hang: 16, tilt: -9 } as const;

/** Sized to the slot the welcome board's header leaves for it. */
export const CANVAS_LINK_BUTTON_SIZE = { w: 260, h: 48 } as const;

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    [CANVAS_LINK_SHAPE_TYPE]: {
      w: number;
      h: number;
      /** Title bar text on a card, the whole label on a button. */
      label: string;
      /** Folder slug (page.meta.canvasSlug) of the page this opens, when it opens one. */
      page: string;
      /** Board rendered as cover art. With one it is a card, without one a button. */
      path: string;
      /** External address this opens in a new tab, when it opens one. */
      url: string;
    };
  }
}

export type CanvasLinkShape = TLShape<typeof CANVAS_LINK_SHAPE_TYPE>;

const INK = "#F2F2F4";
const MUTED = "#7C7C86";
// One step up from the welcome page's black ground, so a card reads as a raised panel.
const GROUND = "#111115";
const EDGE = "1px solid #26262C";
const FONT = "ui-sans-serif, -apple-system, system-ui, sans-serif";

/**
 * Places a board behind the shell's screen so the `[x, y, w, h]` box fills it and sits centred:
 * scaled by whichever axis binds, so the crop can lose a little of the box but never leave a gap.
 */
// oxlint-disable-next-line react/only-export-components
export function fitCover(
  [x, y, bw, bh]: [number, number, number, number],
  w: number,
  h: number,
) {
  const scale = Math.max(w / bw, h / bh);
  return {
    scale,
    left: w / 2 - (x + bw / 2) * scale,
    top: h / 2 - (y + bh / 2) * scale,
  };
}

// oxlint-disable-next-line react/only-export-components
function CanvasLink({ shape }: { shape: CanvasLinkShape }) {
  const { w, h, label, page, path } = shape.props;
  const html = canvasFileHtml.get(path);
  const icon = canvasIconUrl(page);
  const cover = fitCover(
    readCanvasLayout(page)?.coverBox ?? DEFAULT_COVER_BOX,
    SCREEN.w,
    SCREEN.h,
  );

  const frame = {
    width: w,
    height: h,
    overflow: "hidden",
    borderRadius: 14,
    background: GROUND,
    border: EDGE,
    cursor: "pointer",
  } as const;

  if (!path) {
    // A button is its label and the arrow that says it leaves the page. The repo CTA used to
    // be one of these; it is chrome now, in canvasChrome.tsx.
    return (
      <HTMLContainer
        style={{
          ...frame,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          font: `600 15px/20px ${FONT}`,
          color: INK,
        }}
      >
        <span>{label}</span>
        <span style={{ color: MUTED }}>&#8599;</span>
      </HTMLContainer>
    );
  }

  // A card is the device and nothing else: no panel, no title bar. The name and the board count
  // are the annotation under it, which the welcome page already writes, and a card that paints
  // no ground of its own drops its own shadow on the canvas the way the boards do.
  return (
    <HTMLContainer
      style={{
        width: w,
        height: h,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        position: "relative",
      }}
    >
      <div
        style={{
          width: SCREEN.w,
          height: SCREEN.h,
          position: "relative",
          overflow: "hidden",
          borderRadius: SHELL.radius * SHELL_SCALE,
          // White because some boards paint no ground of their own (apple-icons, luma-ios) and
          // would otherwise show the canvas through the screen. They sit on white everywhere
          // else, so white here makes every cover read the same.
          background: "#FFFFFF",
          boxShadow: `0 0 0 ${SHELL.bezel * SHELL_SCALE}px #1D191A,
                      0 0 0 ${SHELL.edge * SHELL_SCALE}px #3A3735,
                      0 ${24 * SHELL_SCALE}px ${60 * SHELL_SCALE}px rgba(29,25,26,.28)`,
        }}
      >
        {html ? (
          <iframe
            title={label}
            srcDoc={html}
            sandbox=""
            style={{
              width: CANVAS_FILE_DEFAULT_SIZE.w,
              height: CANVAS_FILE_DEFAULT_SIZE.h,
              border: 0,
              display: "block",
              position: "absolute",
              // The card is the click target; its cover never takes the pointer.
              pointerEvents: "none",
              left: cover.left,
              top: cover.top,
              transform: `scale(${cover.scale})`,
              transformOrigin: "top left",
            }}
          />
        ) : null}
      </div>
      {icon ? (
        // The app's own mark, dropped on the device's bottom-left corner and tilted, so a row of
        // cards is readable as apps before any of the covers are. It hangs off the corner and is
        // turned a few degrees because a sticker put on the phone cannot be mistaken for part of
        // the screen; square and flush, it would read as an icon the mockup itself draws.
        <img
          src={icon}
          alt=""
          style={{
            position: "absolute",
            left: (w - SCREEN.w) / 2 - ICON.hang,
            // Flush with the device's bottom, not hanging past it: the caption the welcome page
            // writes sits 12px under the card, and a sticker that hung below would cover it.
            bottom: (h - SCREEN.h) / 2,
            width: ICON.size,
            height: ICON.size,
            transform: `rotate(${ICON.tilt}deg)`,
            filter: "drop-shadow(0 6px 16px rgba(0,0,0,.45))",
            pointerEvents: "none",
          }}
        />
      ) : null}
    </HTMLContainer>
  );
}

/**
 * A clickable card or button on the welcome page: `page` switches to another board's page,
 * `url` opens an address in a new tab. Boards themselves render in `<iframe srcDoc sandbox="">`,
 * where a link cannot navigate anything, so anything clickable has to be a shape out here.
 *
 * Defining `onClick` also stops tldraw selecting the shape on pointer down, so a single
 * click follows the link instead of putting a selection box around it.
 */
export class CanvasLinkShapeUtil extends BaseBoxShapeUtil<CanvasLinkShape> {
  static override type = CANVAS_LINK_SHAPE_TYPE;
  static override props: RecordProps<CanvasLinkShape> = {
    w: T.number,
    h: T.number,
    label: T.string,
    page: T.string,
    path: T.string,
    url: T.string,
  };

  override getDefaultProps(): CanvasLinkShape["props"] {
    return { ...CANVAS_LINK_CARD_SIZE, label: "", page: "", path: "", url: "" };
  }

  override canResize() {
    return false;
  }

  override onClick(shape: CanvasLinkShape) {
    if (shape.props.url) {
      window.open(shape.props.url, "_blank", "noopener,noreferrer");
      return;
    }
    const page = this.editor
      .getPages()
      .find((candidate) => candidate.meta.canvasSlug === shape.props.page);
    // Deferred because this click is still being handled, and the rest of that handler would
    // select a shape that is no longer on the current page. Clearing the selection rather than
    // skipping it leaves the card unselected for when the user comes back.
    if (page) {
      requestAnimationFrame(() => {
        this.editor.selectNone();
        this.editor.setCurrentPage(page.id);
        // A page arrives at whatever camera it was last left at, which for one never opened
        // is the origin and for one opened before is wherever the last visit ended. Neither
        // is the board someone just clicked a card for, so it is framed the way the welcome
        // page is framed on load (App.tsx, initializeCanvas).
        this.editor.zoomToFit();
      });
    }
  }

  override component(shape: CanvasLinkShape) {
    return <CanvasLink shape={shape} />;
  }

  override getIndicatorPath(shape: CanvasLinkShape) {
    const path = new Path2D();
    const { w, h } = shape.props;
    if (!shape.props.path) {
      path.roundRect(0, 0, w, h, 14);
      return path;
    }
    const edge = SHELL.edge * SHELL_SCALE;
    path.roundRect(
      (w - SCREEN.w) / 2 - edge,
      (h - SCREEN.h) / 2 - edge,
      SCREEN.w + 2 * edge,
      SCREEN.h + 2 * edge,
      SHELL.radius * SHELL_SCALE + edge,
    );
    return path;
  }

  override getText(shape: CanvasLinkShape) {
    return shape.props.label;
  }
}
