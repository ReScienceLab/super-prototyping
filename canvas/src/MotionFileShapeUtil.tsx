import {
  BaseBoxShapeUtil,
  HTMLContainer,
  T,
  type RecordProps,
  type TLShape,
  useIsEditing,
} from "tldraw";

export const MOTION_FILE_SHAPE_TYPE = "motion-file" as const;

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    [MOTION_FILE_SHAPE_TYPE]: {
      w: number;
      h: number;
      name: string;
      src: string;
    };
  }
}

export type MotionFileShape = TLShape<typeof MOTION_FILE_SHAPE_TYPE>;

/**
 * A rendered composition, playing on the canvas. The sibling of CanvasFileShapeUtil: that one
 * shows an artboard, this one shows the video made from artboards.
 *
 * It loops muted with no controls until the shape is double-clicked into editing, matching how
 * a board's iframe only takes pointer events while editing. Muted is what lets it autoplay at
 * all; a wall of boards that each demanded a click to start would defeat the point of a canvas.
 */
// oxlint-disable-next-line react/only-export-components
function MotionFile({ shape }: { shape: MotionFileShape }) {
  const isEditing = useIsEditing(shape.id);

  return (
    <HTMLContainer
      style={{
        width: shape.props.w,
        height: shape.props.h,
        overflow: "hidden",
        background: "transparent",
      }}
    >
      <video
        title={shape.props.name}
        src={shape.props.src}
        autoPlay
        loop
        muted
        playsInline
        controls={isEditing}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "contain",
          pointerEvents: isEditing ? "auto" : "none",
        }}
      />
    </HTMLContainer>
  );
}

export class MotionFileShapeUtil extends BaseBoxShapeUtil<MotionFileShape> {
  static override type = MOTION_FILE_SHAPE_TYPE;
  static override props: RecordProps<MotionFileShape> = {
    w: T.number,
    h: T.number,
    name: T.string,
    src: T.string,
  };

  override getDefaultProps(): MotionFileShape["props"] {
    return { w: 478, h: 269, name: "Untitled", src: "" };
  }

  override canEdit() {
    return true;
  }

  override canResize() {
    return true;
  }

  override component(shape: MotionFileShape) {
    return <MotionFile shape={shape} />;
  }

  override getIndicatorPath(shape: MotionFileShape) {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }

  override getText(shape: MotionFileShape) {
    return shape.props.name;
  }
}
