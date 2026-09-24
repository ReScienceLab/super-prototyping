// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Editor, TLArrowShape, TLAssetId, TLPageId, TLShapeId } from 'tldraw'
import { LAYOUT_CHANGED, canvasIndex, installCanvasIndex, loadCanvasIndex } from './canvasIndex'
import { readCanvasLibrary } from './canvasLibrary'
import { WELCOME_PAGE_SLUG } from './canvasUrl'

// jsdom has neither, and tldraw reads both at import time, so tldraw and everything that pulls it
// in are imported dynamically in beforeAll, after these two lines have run.
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

const library = readCanvasLibrary().find((c) => c.slug !== WELCOME_PAGE_SLUG)!
const slug = library.slug
const board = `${library.files[0].fileName}.html`
const originalIndex = canvasIndex()

let editor: Editor
let pageId: TLPageId
let tl: typeof import('tldraw')
let bridge: typeof import('./agentBridge')
let content: typeof import('./canvasContent')
let disposeContent: () => void

const run = async (op: string, rest: Record<string, unknown> = {}) =>
  (await bridge.dispatch(editor, slug, { op, ...rest })) as Record<string, unknown>

const create = async (...shapes: Record<string, unknown>[]) =>
  (await run('create', { shapes })).created as TLShapeId[]

const geo = (x: number, y: number, extra: Record<string, unknown> = {}) => ({
  type: 'geo',
  x,
  y,
  props: { w: 20, h: 20 },
  ...extra,
})

/** A write the bridge did not make: the person's drag, or a shape of their own. */
const directWrite = (fn: () => void) =>
  editor.run(fn, { history: 'ignore', ignoreShapeLock: true })

function personsShape(x: number, y: number, parentId: TLPageId | TLShapeId = pageId) {
  const id = tl.createShapeId()
  directWrite(() =>
    editor.createShapes([{ id, type: 'geo', parentId, x, y, props: { w: 10, h: 10 } }]),
  )
  return id
}

const dragTo = (id: TLShapeId, x: number, y: number) =>
  directWrite(() => editor.updateShapes([{ id, type: 'geo', x, y }]))

beforeAll(async () => {
  installCanvasIndex({ ...originalIndex, served: true })
  tl = await import('tldraw')
  const { CanvasFileShapeUtil } = await import('./CanvasFileShapeUtil')
  content = await import('./canvasContent')
  bridge = await import('./agentBridge')

  const shapeUtils = [...tl.defaultShapeUtils, CanvasFileShapeUtil]
  const div = document.createElement('div')
  editor = new tl.Editor({
    store: tl.createTLStore({ shapeUtils, bindingUtils: tl.defaultBindingUtils }),
    shapeUtils,
    bindingUtils: tl.defaultBindingUtils,
    tools: [...tl.defaultTools, ...tl.defaultShapeTools],
    getContainer: () => div,
    textOptions: {
      tipTapConfig: { extensions: tl.tipTapDefaultExtensions },
      addFontsFromNode: tl.defaultAddFontsFromNode,
    },
  })
  directWrite(() => editor.createPage({ name: slug, meta: { canvasSlug: slug } }))
  pageId = editor.getPages().find((p) => p.meta.canvasSlug === slug)!.id
  directWrite(() => editor.setCurrentPage(pageId))
  disposeContent = content.installCanvasContent(editor)
})

afterAll(() => {
  disposeContent?.()
  installCanvasIndex(originalIndex)
})

describe('create', () => {
  it('refuses a type outside the allowlist', async () => {
    expect(await run('create', { shapes: [{ type: 'embed', x: 0, y: 0 }] })).toMatchObject({
      error: 'bad_command',
    })
  })

  it("drops a caller's isLocked, parentId, meta.by and meta.placed, and stamps its own", async () => {
    const [id] = await create(
      geo(10, 10, {
        isLocked: true,
        parentId: 'shape:elsewhere',
        meta: { by: 'person', placed: { x: 0, y: 0, w: 1, h: 1 }, note: 'kept' },
      }),
    )
    const shape = editor.getShape(id)!
    expect(shape.isLocked).toBe(false)
    expect(shape.parentId).toBe(pageId)
    expect(shape.meta).toMatchObject({ by: 'agent', note: 'kept', placed: { x: 10, y: 10, w: 20, h: 20 } })
  })

  it('does not pick up the style the person last chose', async () => {
    directWrite(() => editor.setStyleForNextShapes(tl.DefaultColorStyle, 'red'))
    const [id] = await create(geo(40, 10))
    expect((editor.getShape(id)!.props as { color: string }).color).toBe('black')
  })

  it('writes nothing from a batch when one shape fails', async () => {
    const [taken] = await create(geo(70, 10))
    const before = editor.getPageShapeIds(pageId).size
    expect(await run('create', { shapes: [geo(100, 10), geo(0, 0, { id: taken })] })).toMatchObject(
      { error: 'exists', id: taken },
    )
    // tldraw's own validation throws inside editor.run, which rolls the batch back.
    expect(
      await run('create', { shapes: [geo(100, 10), geo(0, 0, { props: { color: 'nope' } })] }),
    ).toMatchObject({ error: 'bad_command' })
    expect(editor.getPageShapeIds(pageId).size).toBe(before)
  })

  it('places a board from the library, not at its layout id, and says the layout changed', async () => {
    let changed = false
    const onChange = () => (changed = true)
    window.addEventListener(LAYOUT_CHANGED, onChange)
    const [id] = await create({ type: 'canvas-file', x: 0, y: 200, board })
    window.removeEventListener(LAYOUT_CHANGED, onChange)
    const entry = library.files.find((f) => `${f.fileName}.html` === board)!
    expect((editor.getShape(id)!.props as { path: string }).path).toBe(entry.path)
    expect(tl.createShapeId(`canvas-file:${entry.path}`)).not.toBe(id)
    expect(changed).toBe(true)
    expect(await create({ id: 'shape:summary', type: 'canvas-file', x: 0, y: 1400, board })).toEqual(
      ['shape:summary'],
    )
    expect(
      await run('create', { shapes: [{ type: 'canvas-file', x: 0, y: 0, board: 'nope.html' }] }),
    ).toMatchObject({ error: 'bad_command' })
  })

  it("creates an image from a file in the canvas's files/", async () => {
    const [id] = await create({ type: 'image', x: 0, y: 1300, w: 100, h: 50, src: 'files/a.png' })
    const shape = editor.getShape(id)!
    expect(shape.props).toMatchObject({ w: 100, h: 50 })
    const asset = editor.getAsset((shape.props as { assetId: TLAssetId }).assetId)!
    expect(asset.props).toMatchObject({ src: `/board/${encodeURI(slug)}/files/a.png`, mimeType: 'image/png' })

    for (const src of ['../a.png', 'files/../a.png', 'files/.a.png'])
      expect(await run('create', { shapes: [{ type: 'image', x: 0, y: 0, w: 1, h: 1, src }] })).toMatchObject(
        { error: 'bad_command' },
      )
  })

  it('answers bad_command when a file to size cannot be read', async () => {
    const original = globalThis.fetch
    globalThis.fetch = (async () => new Response('', { status: 404 })) as typeof fetch
    try {
      expect(
        await run('create', { shapes: [{ type: 'image', x: 0, y: 0, src: 'files/gone.png' }] }),
      ).toMatchObject({ error: 'bad_command' })
    } finally {
      globalThis.fetch = original
    }
  })

  it("binds an arrow's two ends, but never to a layout shape", async () => {
    const [a, b] = await create(geo(0, 400), geo(200, 400))
    const [arrow] = await create({ type: 'arrow', x: 0, y: 0, from: a, to: b, text: 'via' })
    const bindings = tl.getArrowBindings(editor, editor.getShape(arrow) as TLArrowShape)
    expect(bindings.start).toMatchObject({ toId: a, props: { terminal: 'start', isPrecise: false } })
    expect(bindings.end).toMatchObject({ toId: b, props: { terminal: 'end', isPrecise: false } })

    const layout = 'shape:canvas-file:fixture' as TLShapeId
    directWrite(() =>
      editor.createShapes([{ id: layout, type: 'geo', parentId: pageId, x: 400, y: 400 }]),
    )
    expect(await run('create', { shapes: [{ type: 'arrow', x: 0, y: 0, from: a, to: layout }] }))
      .toMatchObject({ error: 'bad_command' })
  })
})

describe('update', () => {
  it("refuses a shape that is not the agent's, and writes nothing else in the batch", async () => {
    const [mine] = await create(geo(0, 600))
    const theirs = personsShape(100, 600)
    expect(
      await run('update', {
        shapes: [
          { id: mine, type: 'geo', x: 50 },
          { id: theirs, type: 'geo', x: 150 },
        ],
      }),
    ).toMatchObject({ error: 'not_agents', id: theirs })
    expect(editor.getShapePageBounds(mine)!.x).toBe(0)
  })

  it('refuses an agent shape the person locked', async () => {
    const [id] = await create(geo(200, 600))
    directWrite(() => editor.toggleLock([id]))
    expect(await run('update', { shapes: [{ id, type: 'geo', x: 250 }] })).toMatchObject({
      error: 'locked',
    })
  })

  it('refuses to move a shape the person moved, unless forced', async () => {
    const [id] = await create(geo(0, 800))
    dragTo(id, 400, 800)
    expect(await run('update', { shapes: [{ id, type: 'geo', x: 10 }] })).toMatchObject({
      error: 'moved_by_person',
      shapes: [{ id, now: { x: 400, y: 800, w: 20, h: 20 } }],
    })
    // A text change is not a move, and leaves the protection in place.
    expect(await run('update', { shapes: [{ id, type: 'geo', text: 'hi' }] })).toEqual({ updated: [id] })
    expect(await run('update', { shapes: [{ id, type: 'geo', x: 10 }] })).toMatchObject({
      error: 'moved_by_person',
    })
    expect(await run('update', { shapes: [{ id, type: 'geo', x: 10 }], force: true })).toEqual({
      updated: [id],
    })
    expect(await run('update', { shapes: [{ id, type: 'geo', x: 20 }] })).toEqual({ updated: [id] })
  })

  it('lets a bound arrow through after one of its ends moved', async () => {
    const [a, b] = await create(geo(600, 800), geo(800, 800))
    const [arrow] = await create({ type: 'arrow', x: 0, y: 0, from: a, to: b })
    await run('update', { shapes: [{ id: a, type: 'geo', y: 1000 }] })
    expect(await run('update', { shapes: [{ id: arrow, type: 'arrow', rotation: 0 }] })).toEqual({
      updated: [arrow],
    })
  })

  it('refuses to move a frame holding a shape of the person’s, but renames it', async () => {
    const [frame] = await create({ type: 'frame', x: 1000, y: 800, props: { w: 200, h: 200 } })
    personsShape(10, 10, frame)
    expect(await run('update', { shapes: [{ id: frame, type: 'frame', text: 'Notes' }] })).toEqual({
      updated: [frame],
    })
    expect(await run('update', { shapes: [{ id: frame, type: 'frame', x: 0 }] })).toMatchObject({
      error: 'holds_persons_shapes',
    })
  })

  it('reads x/y as page coordinates, inside a frame and rotated', async () => {
    const [framed] = await create(geo(1000, 1100))
    await run('frame', { ids: [framed], padding: 10 })
    await run('update', { shapes: [{ id: framed, type: 'geo', x: 1050, y: 1100 }] })
    expect(editor.getShapePageBounds(framed)).toMatchObject({ x: 1050, y: 1100 })

    const [rotated] = await create(geo(1300, 1100, { rotation: Math.PI / 4 }))
    const origin = editor.getShapePageTransform(rotated)!.point()
    const box = editor.getShapePageBounds(rotated)!
    await run('update', { shapes: [{ id: rotated, type: 'geo', x: box.x + 20 }] })
    expect(editor.getShapePageTransform(rotated)!.point().x).toBeCloseTo(origin.x + 20)
  })

  it('refuses a batch holding both a shape and its frame', async () => {
    const [child] = await create(geo(1600, 1100))
    const { frame } = (await run('frame', { ids: [child] })) as { frame: TLShapeId }
    expect(
      await run('update', {
        shapes: [
          { id: frame, type: 'frame', x: 1500 },
          { id: child, type: 'geo', x: 10 },
        ],
      }),
    ).toMatchObject({ error: 'bad_command' })
  })

  it('stays out of the undo stack', async () => {
    const [id] = await create(geo(0, 1400))
    await run('update', { shapes: [{ id, type: 'geo', x: 30 }] })
    expect(editor.getCanUndo()).toBe(false)
  })
})

describe('delete', () => {
  it("deletes the agent's shapes and only those", async () => {
    const [mine] = await create(geo(0, 1600))
    const theirs = personsShape(100, 1600)
    expect(await run('delete', { ids: [theirs] })).toMatchObject({ error: 'not_agents' })
    expect(await run('delete', { ids: [mine] })).toEqual({ deleted: [mine] })
    expect(editor.getShape(mine)).toBeUndefined()
    expect(editor.getShape(theirs)).toBeDefined()
  })

  it('refuses a frame holding a shape of the person’s', async () => {
    const [frame] = await create({ type: 'frame', x: 200, y: 1600, props: { w: 100, h: 100 } })
    personsShape(10, 10, frame)
    expect(await run('delete', { ids: [frame] })).toMatchObject({ error: 'holds_persons_shapes' })
  })

  it('says the layout changed when a board goes, even inside a frame', async () => {
    const [placed] = await create({ type: 'canvas-file', x: 400, y: 1600, board })
    const { frame } = (await run('frame', { ids: [placed] })) as { frame: TLShapeId }
    let changed = false
    const onChange = () => (changed = true)
    window.addEventListener(LAYOUT_CHANGED, onChange)
    await run('delete', { ids: [frame] })
    window.removeEventListener(LAYOUT_CHANGED, onChange)
    expect(changed).toBe(true)
  })
})

describe('frame and layout', () => {
  it('frames shapes without moving them, and no false alarm follows', async () => {
    const [a, b] = await create(geo(0, 3000), geo(100, 3050))
    const { frame } = (await run('frame', { ids: [a, b], padding: 10 })) as { frame: TLShapeId }
    expect(editor.getShape(a)!.parentId).toBe(frame)
    expect(editor.getShapePageBounds(frame)).toMatchObject({ x: -10, y: 2990, w: 140, h: 90 })
    expect(editor.getShapePageBounds(a)).toMatchObject({ x: 0, y: 3000 })
    expect(await run('update', { shapes: [{ id: a, type: 'geo', x: 5 }] })).toEqual({ updated: [a] })
  })

  it('lets the shapes in a frame the person dragged through, and not the frame', async () => {
    const [a, b] = await create(geo(0, 3400), geo(100, 3400))
    const { frame } = (await run('frame', { ids: [a, b] })) as { frame: TLShapeId }
    directWrite(() => editor.updateShapes([{ id: frame, type: 'frame', x: 500 }]))
    expect(editor.getShapePageBounds(a)!.x).toBe(532)
    expect(await run('update', { shapes: [{ id: a, type: 'geo', x: 540 }] })).toEqual({ updated: [a] })
    expect(await run('update', { shapes: [{ id: frame, type: 'frame', x: 0 }] })).toMatchObject({
      error: 'moved_by_person',
    })
    // A shape the person moved inside the frame is theirs to have moved.
    dragTo(b, 20, 20)
    expect(await run('update', { shapes: [{ id: b, type: 'geo', x: 600 }] })).toMatchObject({
      error: 'moved_by_person',
    })
  })

  it('counts a move into another frame, to the same place in it, as a move', async () => {
    const [a, b] = await create(geo(0, 3600), geo(400, 3600))
    const { frame: first } = (await run('frame', { ids: [a] })) as { frame: TLShapeId }
    const { frame: second } = (await run('frame', { ids: [b] })) as { frame: TLShapeId }
    const { x, y } = editor.getShape(a)!
    directWrite(() => editor.updateShapes([{ id: a, type: 'geo', parentId: second, x, y }]))
    expect(editor.getShape(a)!.parentId).not.toBe(first)
    expect(await run('update', { shapes: [{ id: a, type: 'geo', x: 0 }] })).toMatchObject({
      error: 'moved_by_person',
    })
  })

  it('counts a turn in place as a move', async () => {
    const [a] = await create(geo(0, 3500))
    directWrite(() => editor.rotateShapesBy([a], Math.PI))
    expect(await run('update', { shapes: [{ id: a, type: 'geo', x: 50 }] })).toMatchObject({
      error: 'moved_by_person',
    })
  })

  it('aligns, and checks every shape first', async () => {
    const [a, b] = await create(geo(0, 3200), geo(100, 3300))
    expect(await run('align', { ids: [a, b], operation: 'left' })).toEqual({ ids: [a, b] })
    expect(editor.getShapePageBounds(b)!.x).toBe(0)
    // The new position is the agent's own, so the next move goes through.
    expect(await run('update', { shapes: [{ id: b, type: 'geo', x: 50 }] })).toEqual({ updated: [b] })

    dragTo(a, 300, 3200)
    expect(await run('align', { ids: [a, b], operation: 'top' })).toMatchObject({
      error: 'moved_by_person',
      shapes: [{ id: a }],
    })
    expect(await run('align', { ids: [a, b], operation: 'sideways' })).toMatchObject({
      error: 'bad_command',
    })
    expect(await run('distribute', { ids: [a, b], operation: 'horizontal' })).toMatchObject({
      error: 'bad_command',
    })
  })
})

describe('select and zoom', () => {
  it('act only on the canvas in front of the person', async () => {
    directWrite(() => editor.createPage({ name: 'other', meta: { canvasSlug: 'other' } }))
    directWrite(() => editor.setCurrentPage(editor.getPages().find((p) => p.name === 'other')!.id))
    try {
      expect(await run('select', { ids: [] })).toMatchObject({ error: 'not_current_page' })
      expect(await run('zoom')).toMatchObject({ error: 'not_current_page' })
    } finally {
      directWrite(() => editor.setCurrentPage(pageId))
    }
  })

  it("zooms to shapes without changing the person's selection", async () => {
    const [a, b] = await create(geo(0, 3600), geo(100, 3600))
    directWrite(() => editor.select(b))
    expect(await run('zoom', { ids: [a] })).toEqual({})
    expect(editor.getSelectedShapeIds()).toEqual([b])
  })
})

describe('get', () => {
  it("names each shape's owner and reports page bounds", async () => {
    const [a] = await create(geo(0, 3800, { text: 'hello' }))
    const theirs = personsShape(100, 3800)
    const view = (await run('get')) as { shapes: Record<string, unknown>[] }
    expect(view.shapes.find((s) => s.id === a)).toMatchObject({
      owner: 'agent',
      x: 0,
      y: 3800,
      text: 'hello',
    })
    expect(view.shapes.find((s) => s.id === theirs)).toMatchObject({ owner: 'person' })
  })
})

describe('sp canvas', () => {
  it('runs a command that came before the bridge, and answers once it is saved', async () => {
    const realFetch = globalThis.fetch
    const listeners: Record<string, (event: { data: string }) => void> = {}
    globalThis.EventSource = class {
      addEventListener(type: string, fn: (event: { data: string }) => void) {
        listeners[type] = fn
      }
    } as unknown as typeof EventSource
    const sent: { route: string; body: any }[] = []
    let status = 200
    let replied: (body: any) => void = () => {}
    globalThis.fetch = async (input, init) => {
      const route = String(input).split('__sp/')[1]
      if (route === 'index.json') return new Response(JSON.stringify(canvasIndex()))
      const body = JSON.parse(String(init!.body))
      sent.push({ route, body })
      if (route === 'canvas-reply') replied(body)
      return new Response(route === 'canvas-content' && status !== 200 ? 'disk full' : 'ok', {
        status: route === 'canvas-content' ? status : 200,
      })
    }
    const send = (id: string, command: unknown) =>
      listeners.command({ data: JSON.stringify({ id, slug, command }) })
    const reply = () => new Promise<any>((done) => (replied = done))
    let dispose = () => {}
    try {
      await loadCanvasIndex(true, true)
      const first = reply()
      send('c1', { op: 'create', shapes: [geo(0, 4200)] })
      dispose = bridge.installAgentBridge(editor)
      const answer = await first
      expect(answer).toMatchObject({ id: 'c1', ok: true })
      const [id] = answer.result.created
      const saved = sent.findIndex(
        (s) => s.route === 'canvas-content' && s.body.file.records.some((r: any) => r.id === id),
      )
      expect(saved).toBeGreaterThan(-1)
      expect(saved).toBeLessThan(sent.findIndex((s) => s.route === 'canvas-reply'))

      // A save the server refused is a failure, not a placement.
      status = 500
      const second = reply()
      send('c2', { op: 'create', shapes: [geo(40, 4200)] })
      expect(await second).toMatchObject({
        id: 'c2',
        ok: false,
        error: { error: 'failed', message: expect.stringContaining('disk full') },
      })
      // The bridge's own refusal is answered as it is.
      const third = reply()
      send('c3', { op: 'nope' })
      expect(await third).toMatchObject({ id: 'c3', ok: false, error: { error: 'bad_command' } })
    } finally {
      dispose()
      globalThis.fetch = realFetch
      delete (globalThis as { EventSource?: unknown }).EventSource
    }
  })
})

describe('agentBoardPaths', () => {
  it("collects only the boards the agent placed", () => {
    expect(
      content.agentBoardPaths([
        { type: 'canvas-file', meta: { by: 'agent' }, props: { path: 'a/01.html' } },
        { type: 'canvas-file', meta: {}, props: { path: 'a/02.html' } },
        { type: 'geo', meta: { by: 'agent' }, props: {} },
      ]),
    ).toEqual(new Set(['a/01.html']))
  })
})
