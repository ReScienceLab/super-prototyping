import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type RecordProps,
  type TLShape,
} from "tldraw";

import type { CanvasBoardStatus } from "./canvasLibrary";

export const CANVAS_STATUS_BANNER_SHAPE_TYPE = "canvas-status-banner" as const;

/**
 * The tab's own height, and the gap it leaves above the board. Together they are the space a
 * row reserves above its boards when anything in it carries a status, which is why they are
 * one number as far as the layout is concerned.
 */
export const CANVAS_STATUS_BANNER_HEIGHT = 110;
export const CANVAS_STATUS_BANNER_GAP = 24;

/**
 * A board's maturity, drawn as a tab above it. `live` is the default and draws nothing: most
 * boards on a shipped page are live, and a tab on every one of them would say nothing while
 * costing 134px of every row.
 *
 * Geist's solid badge colours, not its subtle ones. The inspector's badge can be a tinted pill
 * because it sits at 100% next to one board; this is read across a page zoomed out to 34%,
 * where a pale fill and a dark rule collapse into the same grey smudge.
 */
const STATUS_STYLE: Record<
  Exclude<CanvasBoardStatus, "live">,
  { label: string; fill: string; ink: string }
> = {
  exploring: { label: "EXPLORING", fill: "#FFB224", ink: "#171717" },
  outdated: { label: "OUTDATED", fill: "#4D4D4D", ink: "#FFFFFF" },
};

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    [CANVAS_STATUS_BANNER_SHAPE_TYPE]: {
      w: number;
      h: number;
      status: string;
    };
  }
}

export type CanvasStatusBannerShape = TLShape<
  typeof CANVAS_STATUS_BANNER_SHAPE_TYPE
>;

export class CanvasStatusBannerShapeUtil extends BaseBoxShapeUtil<CanvasStatusBannerShape> {
  static override type = CANVAS_STATUS_BANNER_SHAPE_TYPE;
  static override props: RecordProps<CanvasStatusBannerShape> = {
    w: T.number,
    h: T.number,
    status: T.string,
  };

  override getDefaultProps(): CanvasStatusBannerShape["props"] {
    return {
      w: 478,
      h: CANVAS_STATUS_BANNER_HEIGHT,
      status: "exploring",
    };
  }

  override canResize() {
    return false;
  }

  override component(shape: CanvasStatusBannerShape) {
    const style =
      STATUS_STYLE[shape.props.status as keyof typeof STATUS_STYLE] ??
      STATUS_STYLE.exploring;
    return (
      <HTMLContainer
        style={{
          width: shape.props.w,
          height: shape.props.h,
          background: style.fill,
          color: style.ink,
          font: `800 42px/${shape.props.h}px -apple-system, BlinkMacSystemFont, sans-serif`,
          letterSpacing: ".14em",
          textAlign: "center",
        }}
      >
        {style.label}
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: CanvasStatusBannerShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }

  override getText(shape: CanvasStatusBannerShape) {
    return (
      STATUS_STYLE[shape.props.status as keyof typeof STATUS_STYLE]?.label ??
      shape.props.status
    );
  }
}
