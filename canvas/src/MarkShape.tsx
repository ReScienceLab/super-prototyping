import {
  BaseBoxShapeUtil,
  HTMLContainer,
  StateNode,
  T,
  createShapeId,
  type RecordProps,
  type TLShape,
} from 'tldraw'

export const MARK_SHAPE_TYPE = 'mark' as const
const SCREEN_SIZE = 30

declare module 'tldraw' {
  export interface TLGlobalShapePropsMap {
    [MARK_SHAPE_TYPE]: {
      w: number
      h: number
      number: number
      targetShapeId: string
    }
  }
}

export type MarkShape = TLShape<typeof MARK_SHAPE_TYPE>

type NumberedShape = { type: string; props: unknown }

export function pickMarkTarget<T extends { type: string }>(hits: T[]) {
  return (
    hits.find((shape) => shape.type === 'html-mockup' || shape.type === 'html-preview') ??
    hits.find((shape) => shape.type !== MARK_SHAPE_TYPE)
  )
}

export function nextMarkNumber(shapes: NumberedShape[]) {
  const numbers = shapes
    .filter((shape) => shape.type === MARK_SHAPE_TYPE)
    .map((shape) =>
      typeof shape.props === 'object' && shape.props !== null && 'number' in shape.props
        ? shape.props.number
        : undefined,
    )
    .filter((number): number is number => Number.isInteger(number) && Number(number) > 0)

  return Math.max(0, ...numbers) + 1
}

export class MarkTool extends StateNode {
  static override id = 'mark'

  override onEnter() {
    this.editor.setCursor({ type: 'cross', rotation: 0 })
  }

  override onPointerDown() {
    const point = this.editor.inputs.getCurrentPagePoint()
    const hits = this.editor.getShapesAtPoint(point, { hitInside: true })
    const target = pickMarkTarget(hits)
    const number = nextMarkNumber(this.editor.getCurrentPageShapes())
    const size = SCREEN_SIZE / this.editor.getZoomLevel()

    this.editor.markHistoryStoppingPoint('create mark')
    this.editor.createShape<MarkShape>({
      id: createShapeId(),
      type: MARK_SHAPE_TYPE,
      x: point.x - size / 2,
      y: point.y - size / 2,
      props: {
        w: size,
        h: size,
        number,
        targetShapeId: target?.id ?? '',
      },
    })
  }

  override onCancel() {
    this.editor.setCurrentTool('select')
  }
}

export class MarkShapeUtil extends BaseBoxShapeUtil<MarkShape> {
  static override type = MARK_SHAPE_TYPE
  static override props: RecordProps<MarkShape> = {
    w: T.number,
    h: T.number,
    number: T.number,
    targetShapeId: T.string,
  }

  override getDefaultProps(): MarkShape['props'] {
    return { w: SCREEN_SIZE, h: SCREEN_SIZE, number: 1, targetShapeId: '' }
  }

  override canResize() {
    return false
  }

  override component(shape: MarkShape) {
    return (
      <HTMLContainer
        style={{
          display: 'grid',
          placeItems: 'center',
          width: shape.props.w,
          height: shape.props.h,
          color: '#fff',
          background: '#2563eb',
          border: `${Math.max(2, shape.props.w * 0.07)}px solid #fff`,
          borderRadius: '50%',
          boxShadow: `0 ${shape.props.h * 0.08}px ${shape.props.h * 0.25}px #11182766`,
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          fontSize: shape.props.h * 0.48,
          fontWeight: 750,
          lineHeight: 1,
          pointerEvents: 'none',
        }}
      >
        {shape.props.number}
      </HTMLContainer>
    )
  }

  override getIndicatorPath(shape: MarkShape) {
    const path = new Path2D()
    path.ellipse(
      shape.props.w / 2,
      shape.props.h / 2,
      shape.props.w / 2,
      shape.props.h / 2,
      0,
      0,
      Math.PI * 2,
    )
    return path
  }

  override getText(shape: MarkShape) {
    return `Mark ${shape.props.number}`
  }
}
