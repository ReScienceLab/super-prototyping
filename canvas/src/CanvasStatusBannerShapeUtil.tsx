import { BaseBoxShapeUtil, T, type RecordProps, type TLShape } from "tldraw";

export const CANVAS_STATUS_BANNER_SHAPE_TYPE = "canvas-status-banner" as const;

/**
 * The tab a board's status used to be drawn as, above the board. The status feature is gone,
 * so the layout places none of these. The type stays registered only because a browser's
 * IndexedDB can still hold one, and a store that meets an unknown shape type does not load;
 * the layout's sweep deletes any it finds, since it placed none.
 */
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
    return { w: 0, h: 0, status: "" };
  }

  override component() {
    return null;
  }

  override getIndicatorPath() {
    return new Path2D();
  }
}
