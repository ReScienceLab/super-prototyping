import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type RecordProps,
  type TLShape,
} from "tldraw";
import { CANVAS_FILE_DEFAULT_SIZE } from "./CanvasFileShapeUtil";
import { canvasFileHtml } from "./canvasLibrary";

export const CANVAS_LINK_SHAPE_TYPE = "canvas-link" as const;

const TITLE_HEIGHT = 40;
/** Cards are half a board wide, so a row of them fits under the welcome board. */
export const CANVAS_LINK_CARD_SIZE = {
  w: CANVAS_FILE_DEFAULT_SIZE.w / 2,
  h: CANVAS_FILE_DEFAULT_SIZE.h / 2 + TITLE_HEIGHT,
} as const;
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

const GITHUB_PATH =
  "M12 0c6.63 0 12 5.276 12 11.79-.001 5.067-3.29 9.567-8.175 11.187-.6.118-.825-.25-.825-.56 0-.398.015-1.665.015-3.242 0-1.105-.375-1.813-.81-2.181 2.67-.295 5.475-1.297 5.475-5.822 0-1.297-.465-2.344-1.23-3.169.12-.295.54-1.503-.12-3.125 0 0-1.005-.324-3.3 1.209a11.32 11.32 0 00-3-.398c-1.02 0-2.04.133-3 .398-2.295-1.518-3.3-1.209-3.3-1.209-.66 1.622-.24 2.83-.12 3.125-.765.825-1.23 1.887-1.23 3.169 0 4.51 2.79 5.527 5.46 5.822-.345.294-.66.81-.765 1.577-.69.31-2.415.81-3.495-.973-.225-.354-.9-1.223-1.845-1.209-1.005.015-.405.56.015.781.51.28 1.095 1.327 1.23 1.666.24.663 1.02 1.93 4.035 1.385 0 .988.015 1.916.015 2.196 0 .31-.225.664-.825.56C3.303 21.374-.003 16.867 0 11.791 0 5.276 5.37 0 12 0z";

/** The GitHub mark, @lobehub/icons-static-svg `github.svg`, wrapper and title stripped. */
const GITHUB = (
  <svg viewBox="0 0 24 24" width="19" height="19" fill={INK} fillRule="evenodd" aria-hidden>
    <path d={GITHUB_PATH} />
  </svg>
);

/** The one warm value in the onboarding, and what the button is asking for. */
const STAR = (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="#E3B341" aria-hidden>
    <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" />
  </svg>
);


// oxlint-disable-next-line react/only-export-components
function CanvasLink({ shape }: { shape: CanvasLinkShape }) {
  const { w, h, label, path } = shape.props;
  const html = canvasFileHtml.get(path);

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
        {GITHUB}
        <span>{label}</span>
        {STAR}
      </HTMLContainer>
    );
  }

  return (
    <HTMLContainer style={{ ...frame, display: "flex", flexDirection: "column" }}>
      {/* Some boards paint no ground of their own (apple-icons, luma-ios) and would
          otherwise show the card's dark panel through the artboard. They sit on white
          everywhere else, so white here makes every cover read the same. */}
      <div style={{ flex: 1, overflow: "hidden", background: "#FFFFFF" }}>
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
              // The card is the click target; its cover never takes the pointer.
              pointerEvents: "none",
              transform: `scale(${w / CANVAS_FILE_DEFAULT_SIZE.w})`,
              transformOrigin: "top left",
            }}
          />
        ) : null}
      </div>
      <div
        style={{
          height: TITLE_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "0 12px",
          font: `600 12px/16px ${FONT}`,
          color: INK,
          borderTop: EDGE,
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        <span style={{ color: MUTED, flex: "none" }}>open</span>
      </div>
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
      });
    }
  }

  override component(shape: CanvasLinkShape) {
    return <CanvasLink shape={shape} />;
  }

  override getIndicatorPath(shape: CanvasLinkShape) {
    const path = new Path2D();
    path.roundRect(0, 0, shape.props.w, shape.props.h, 14);
    return path;
  }

  override getText(shape: CanvasLinkShape) {
    return shape.props.label;
  }
}
