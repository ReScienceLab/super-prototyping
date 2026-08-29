import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type RecordProps,
  type TLShape,
  useIsEditing,
} from "tldraw";
import { canvasFileHtml } from "./canvasLibrary";

export const CANVAS_FILE_SHAPE_TYPE = "canvas-file" as const;
// Matches the v1.14+ phone mockups' own canvas: .phone{430x932} + body{padding:24px}.
export const CANVAS_FILE_DEFAULT_SIZE = { w: 478, h: 980 } as const;

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    [CANVAS_FILE_SHAPE_TYPE]: {
      w: number;
      h: number;
      name: string;
      path: string;
    };
  }
}

export type CanvasFileShape = TLShape<typeof CANVAS_FILE_SHAPE_TYPE>;

// oxlint-disable-next-line react/only-export-components
function CanvasFile({ shape }: { shape: CanvasFileShape }) {
  const isEditing = useIsEditing(shape.id);
  const html = canvasFileHtml.get(shape.props.path);

  return (
    <HTMLContainer
      style={{
        width: shape.props.w,
        height: shape.props.h,
        overflow: "hidden",
        background: "#ecedf3",
      }}
    >
      {html ? (
        <iframe
          title={shape.props.name}
          srcDoc={html}
          sandbox=""
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            display: "block",
            pointerEvents: isEditing ? "auto" : "none",
          }}
        />
      ) : (
        <div style={{ padding: 16, font: "13px sans-serif", color: "#a33" }}>
          Missing source: {shape.props.path}
        </div>
      )}
    </HTMLContainer>
  );
}

export class CanvasFileShapeUtil extends BaseBoxShapeUtil<CanvasFileShape> {
  static override type = CANVAS_FILE_SHAPE_TYPE;
  static override props: RecordProps<CanvasFileShape> = {
    w: T.number,
    h: T.number,
    name: T.string,
    path: T.string,
  };

  override getDefaultProps(): CanvasFileShape["props"] {
    return { ...CANVAS_FILE_DEFAULT_SIZE, name: "Untitled", path: "" };
  }

  override canEdit() {
    return true;
  }

  override canResize() {
    return true;
  }

  override canScroll() {
    return true;
  }

  override component(shape: CanvasFileShape) {
    return <CanvasFile shape={shape} />;
  }

  override getIndicatorPath(shape: CanvasFileShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }

  override getText(shape: CanvasFileShape) {
    return shape.props.name;
  }
}
