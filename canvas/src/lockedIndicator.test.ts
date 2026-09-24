// @vitest-environment jsdom
import { beforeAll, expect, it } from 'vitest'
import type { Editor, OverlayUtil, TLShapeId } from 'tldraw'

// jsdom has none of these, and tldraw reads the first two at import time, so tldraw is imported
// in beforeAll, after they are in place. A Path2D here only counts what went into it.
window.matchMedia ??= (() => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
})) as unknown as typeof window.matchMedia
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver
globalThis.Path2D ??= class {
  parts = 0
  rect() {
    this.parts++
  }
  addPath() {
    this.parts++
  }
} as unknown as typeof Path2D

let editor: Editor
let board: TLShapeId
let persons: TLShapeId
let blue: string

beforeAll(async () => {
  const tl = await import('tldraw')
  const { CanvasFileShapeUtil } = await import('./CanvasFileShapeUtil')
  const { lockedOverlayUtils } = await import('./lockedIndicator')
  const shapeUtils = [...tl.defaultShapeUtils, CanvasFileShapeUtil]
  editor = new tl.Editor({
    store: tl.createTLStore({ shapeUtils, bindingUtils: tl.defaultBindingUtils }),
    shapeUtils,
    bindingUtils: tl.defaultBindingUtils,
    tools: [...tl.defaultTools, ...tl.defaultShapeTools],
    overlayUtils: lockedOverlayUtils,
    initialState: 'select',
    getContainer: () => document.createElement('div'),
  })
  board = tl.createShapeId('canvas-file:demo/01-home.html')
  persons = tl.createShapeId()
  editor.createShapes([
    { id: board, type: 'canvas-file', isLocked: true, props: { w: 100, h: 200 } },
    { id: persons, type: 'canvas-file', x: 300, props: { w: 100, h: 200 } },
  ])
  blue = editor.getCurrentTheme().colors[editor.getColorMode()].selectionStroke
})

/** The colour of every stroke the overlay draws, in order, leaving out an empty path. A plain
 *  object stands in for the context: jsdom has none, so this cannot catch a method called on the
 *  proxy rather than the context. */
function strokes(type: 'shape_indicator' | 'selection_foreground') {
  const seen: string[] = []
  const ctx = {
    strokeStyle: '',
    stroke: (path: { parts: number }) => path.parts && seen.push(ctx.strokeStyle as string),
    strokeRect: () => seen.push(ctx.strokeStyle as string),
    ...Object.fromEntries(
      ['save', 'restore', 'translate', 'rotate', 'fillRect', 'beginPath', 'arc', 'fill'].map(
        (name) => [name, () => {}],
      ),
    ),
  } as unknown as CanvasRenderingContext2D
  const util: OverlayUtil = editor.overlays.getOverlayUtil(type)
  util.render(ctx, util.getOverlays())
  return seen
}

it("draws the layout's board orange, outline and box", () => {
  editor.select(board)
  const box = strokes('selection_foreground')
  const [orange] = box
  expect(orange).toBeTruthy()
  expect(orange).not.toBe(blue)
  expect(box).toEqual([orange])
  expect(strokes('shape_indicator')).toEqual([orange])
})

it('keeps the box blue when the selection holds a shape that moves', () => {
  editor.select(board, persons)
  const [outline, orange] = strokes('shape_indicator')
  expect(outline).toBe(blue)
  expect(orange).not.toBe(blue)
  expect(new Set(strokes('selection_foreground'))).toEqual(new Set([blue]))
})

it('does not outline a board that is only hovered', () => {
  editor.selectNone()
  editor.updateInstanceState({ isHoveringCanvas: true })
  editor.setHoveredShape(board)
  expect(strokes('shape_indicator')).toEqual([])
})
