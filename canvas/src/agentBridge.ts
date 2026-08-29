import type { Editor, TLShapeId, TLShapePartial } from 'tldraw'

const MAX_SHAPES_PER_COMMAND = 100
const ALLOWED_SHAPE_TYPES = new Set([
  'arrow',
  'draw',
  'frame',
  'geo',
  'highlight',
  'html-mockup',
  'html-preview',
  'line',
  'mark',
  'note',
  'text',
])

type CanvasCommand =
  | { op: 'get' }
  | { op: 'create'; shapes: TLShapePartial[] }
  | { op: 'update'; shapes: TLShapePartial[] }
  | { op: 'delete'; ids: TLShapeId[] }
  | { op: 'select'; ids: TLShapeId[] }
  | { op: 'zoom'; ids?: TLShapeId[] }
  | { op: 'undo' }
  | { op: 'redo' }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function parseIds(value: unknown): TLShapeId[] {
  if (
    !Array.isArray(value) ||
    value.length > MAX_SHAPES_PER_COMMAND ||
    !value.every((id) => typeof id === 'string' && id.startsWith('shape:'))
  ) {
    throw new Error(`ids must contain at most ${MAX_SHAPES_PER_COMMAND} tldraw shape IDs`)
  }
  return value as TLShapeId[]
}

function parseShapes(value: unknown, requireId: boolean): TLShapePartial[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_SHAPES_PER_COMMAND) {
    throw new Error(`shapes must contain 1-${MAX_SHAPES_PER_COMMAND} entries`)
  }

  for (const shape of value) {
    if (!isRecord(shape) || typeof shape.type !== 'string' || !ALLOWED_SHAPE_TYPES.has(shape.type)) {
      throw new Error('shape type is not allowed')
    }
    if (requireId && (typeof shape.id !== 'string' || !shape.id.startsWith('shape:'))) {
      throw new Error('updated shapes require a tldraw shape ID')
    }
    for (const key of ['x', 'y', 'rotation', 'opacity']) {
      if (shape[key] !== undefined && (typeof shape[key] !== 'number' || !Number.isFinite(shape[key]))) {
        throw new Error(`${key} must be a finite number`)
      }
    }
  }

  return value as TLShapePartial[]
}

export function parseCanvasCommand(value: unknown): CanvasCommand {
  if (!isRecord(value) || typeof value.op !== 'string') {
    throw new Error('command must be an object with an op')
  }

  switch (value.op) {
    case 'get':
    case 'undo':
    case 'redo':
      return { op: value.op }
    case 'create':
      return { op: value.op, shapes: parseShapes(value.shapes, false) }
    case 'update':
      return { op: value.op, shapes: parseShapes(value.shapes, true) }
    case 'delete':
    case 'select':
      return { op: value.op, ids: parseIds(value.ids) }
    case 'zoom':
      return { op: value.op, ids: value.ids === undefined ? undefined : parseIds(value.ids) }
    default:
      throw new Error(`unsupported canvas op: ${value.op}`)
  }
}

function getCanvasState(editor: Editor) {
  return {
    camera: editor.getCamera(),
    viewport: editor.getViewportScreenBounds(),
    selectedShapeIds: editor.getSelectedShapeIds(),
    shapes: editor.getCurrentPageShapesSorted().map((shape) => {
      const bounds = editor.getShapePageBounds(shape)
      return {
        ...shape,
        bounds: bounds
          ? { x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h }
          : null,
      }
    }),
  }
}

export function installAgentBridge(editor: Editor) {
  const api = {
    describe: () => ({
      allowedShapeTypes: [...ALLOWED_SHAPE_TYPES],
      commandExamples: [
        { op: 'get' },
        { op: 'create', shapes: [{ type: 'text', x: 80, y: 80, props: {} }] },
        { op: 'update', shapes: [{ id: 'shape:example', type: 'text', x: 120 }] },
        { op: 'delete', ids: ['shape:example'] },
        { op: 'select', ids: ['shape:example'] },
        { op: 'zoom', ids: ['shape:example'] },
        { op: 'zoom' },
        { op: 'undo' },
        { op: 'redo' },
      ],
    }),
    dispatch: (input: unknown) => {
      const command = parseCanvasCommand(input)

      switch (command.op) {
        case 'get':
          break
        case 'create':
          editor.markHistoryStoppingPoint('agent:create')
          editor.createShapes(command.shapes)
          break
        case 'update':
          editor.markHistoryStoppingPoint('agent:update')
          editor.updateShapes(command.shapes)
          break
        case 'delete':
          editor.markHistoryStoppingPoint('agent:delete')
          editor.deleteShapes(command.ids)
          break
        case 'select':
          editor.select(...command.ids)
          break
        case 'zoom':
          if (command.ids?.length) {
            editor.select(...command.ids)
            editor.zoomToSelection()
          } else {
            editor.zoomToFit()
          }
          break
        case 'undo':
          editor.undo()
          break
        case 'redo':
          editor.redo()
          break
      }

      return getCanvasState(editor)
    },
  }

  window.snapCanvas = api
  return () => {
    if (window.snapCanvas === api) delete window.snapCanvas
  }
}
