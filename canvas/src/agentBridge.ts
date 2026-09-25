import {
  AssetRecordType,
  Box,
  FileHelpers,
  MediaHelpers,
  T,
  createShapeId,
  getArrowBindings,
  renderPlaintextFromRichText,
  toRichText,
  type Editor,
  type TLArrowShape,
  type TLAsset,
  type TLPageId,
  type TLRichText,
  type TLShape,
  type TLShapeId,
  type TLShapePartial,
} from 'tldraw'
import { personsShapeName, projectPages, readyForAgentWrite, saveNow } from './canvasContent'
import {
  boardFileUrl,
  boardSize,
  canvasBoardRef,
  isLibraryShapeId,
  readCanvasLibrary,
} from './canvasLibrary'
import { CANVAS_FILE_SHAPE_TYPE } from './CanvasFileShapeUtil'
import { LAYOUT_CHANGED, takeAgentCommands } from './canvasIndex'
import { SAFE_NAME } from './layoutEdit'

const MAX_SHAPES_PER_COMMAND = 100
const CREATE_TYPES = new Set([
  'arrow',
  'frame',
  'geo',
  'line',
  'note',
  'text',
  'image',
  'video',
  CANVAS_FILE_SHAPE_TYPE,
])
const TEXT_RICH_TYPES = new Set(['text', 'note', 'geo', 'arrow'])

// A loose shape for the partials this file builds: fighting TLShapePartial's per-type
// discriminated union for a value assembled from a caller's JSON buys nothing, so this is cast
// to it once at each editor.createShapes/updateShapes call instead.
interface RawPartial {
  id: TLShapeId
  type: string
  parentId?: TLPageId | TLShapeId
  x?: number
  y?: number
  rotation?: number
  opacity?: number
  isLocked?: boolean
  props?: Record<string, unknown>
  meta?: Record<string, unknown>
}

class BridgeError extends Error {
  code: string
  data?: Record<string, unknown>
  constructor(code: string, message: string, data?: Record<string, unknown>) {
    super(message)
    this.code = code
    this.data = data
  }
}

/** Typed to return `never` so `if (bad) fail(...)` reads like a `throw` to the type checker,
 *  and the code after it can assume the good case. */
function fail(code: string, message: string, data?: Record<string, unknown>): never {
  throw new BridgeError(code, message, data)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function num(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    fail('bad_command', `${field} must be a finite number`)
  return value
}

function oneOf<V extends string>(value: unknown, allowed: readonly V[], field: string): V {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value))
    fail('bad_command', `${field} must be one of ${allowed.join(', ')}`)
  return value as V
}

function parseIds(value: unknown): TLShapeId[] {
  if (
    !Array.isArray(value) ||
    value.length > MAX_SHAPES_PER_COMMAND ||
    !value.every((id) => typeof id === 'string' && id.startsWith('shape:'))
  )
    fail('bad_command', `ids must contain at most ${MAX_SHAPES_PER_COMMAND} tldraw shape IDs`)
  return value
}

/** Drops the fields only the bridge itself may set, from a caller-supplied meta. */
function stripMeta(meta: unknown): Record<string, unknown> {
  if (!isRecord(meta)) return {}
  const { by: _by, placed: _placed, ...rest } = meta
  return rest
}

/** The `text:` sugar create/update accept: rich text for the types that have it, a plain name
 *  for a frame. */
function textProps(type: string, text: string): Record<string, unknown> {
  return type === 'frame' ? { name: text } : { richText: toRichText(text) }
}

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  apng: 'image/apng',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
}

interface Bounds {
  x: number
  y: number
  w: number
  h: number
}

function bounds(editor: Editor, shape: TLShape | TLShapeId): Bounds {
  const box = editor.getShapePageBounds(shape)!
  return { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.w), h: Math.round(box.h) }
}

function closeEnough(a: Bounds, b: Bounds): boolean {
  return (
    Math.abs(a.x - b.x) <= 1 &&
    Math.abs(a.y - b.y) <= 1 &&
    Math.abs(a.w - b.w) <= 1 &&
    Math.abs(a.h - b.h) <= 1
  )
}

/** Where the agent last left a shape, twice over: on the page, and in its parent. Moving the
 *  frame it is in keeps the second; reparenting it where it stands (framing, grouping, a frame
 *  shrunk off it) keeps the first; the person moving or resizing the shape itself changes both.
 *  A fully bound arrow is the exception, below. */
interface Placed extends Bounds {
  r: number
  in: Bounds & { parent: string; r: number }
  arrow?: string
}

/** Radians to three places, so `meta` stays plain JSON and a float's noise is not a move. */
const angle = (r: number) => Math.round(r * 1000) / 1000

/** A fully bound arrow's own shape: its bend and where each end holds on. Its bounds follow the
 *  two shapes it joins, so they cannot tell the person bending it from the person moving a box. */
function boundArrow(editor: Editor, shape: TLShape): string | undefined {
  if (shape.type !== 'arrow') return undefined
  const { start, end } = getArrowBindings(editor, shape as TLArrowShape)
  if (!start || !end) return undefined
  const { bend, kind, elbowMidPoint } = (shape as TLArrowShape).props
  const hold = (b: typeof start) => [b.toId, b.props.normalizedAnchor, b.props.isExact, b.props.isPrecise]
  return JSON.stringify([bend, kind, elbowMidPoint, hold(start), hold(end)])
}

function pose(editor: Editor, shape: TLShape): Placed {
  const own = editor.getShapeGeometry(shape).bounds
  const arrow = boundArrow(editor, shape)
  return {
    ...(arrow ? { arrow } : {}),
    ...bounds(editor, shape),
    r: angle(editor.getShapePageTransform(shape).rotation()),
    in: {
      parent: shape.parentId,
      x: Math.round(shape.x),
      y: Math.round(shape.y),
      w: Math.round(own.w),
      h: Math.round(own.h),
      r: angle(shape.rotation),
    },
  }
}

/** Whether a shape is still where the agent last placed it, on the page or in its parent: a shape
 *  it has never placed (no `placed` yet) counts as untouched, the safe default. */
function untouched(editor: Editor, shape: TLShape): boolean {
  const placed = (shape.meta as { placed?: Placed }).placed
  if (!placed) return true
  const now = pose(editor, shape)
  if (now.arrow || placed.arrow) return now.arrow === placed.arrow
  return (
    (closeEnough(now, placed) && Math.abs(now.r - placed.r) < 0.01) ||
    (now.in.parent === placed.in.parent &&
      closeEnough(now.in, placed.in) &&
      Math.abs(now.in.r - placed.in.r) < 0.01)
  )
}

/** The props that set where a shape's outline is, across CREATE_TYPES: a resize writes w/h, or
 *  scale and autoSize on text; a handle drag writes a line's points or an arrow's ends and bend.
 *  These and x/y/rotation are what the optimistic check guards; text and style changes are not. */
const GEOMETRY_PROPS = ['w', 'h', 'scale', 'autoSize', 'points', 'spline', 'start', 'end', 'bend', 'kind', 'elbowMidPoint']

function touchesGeometry(partial: RawPartial): boolean {
  return (
    partial.x !== undefined ||
    partial.y !== undefined ||
    partial.rotation !== undefined ||
    GEOMETRY_PROPS.some((key) => key in (partial.props ?? {}))
  )
}

/** Whether an agent shape has a descendant the agent did not put there — the person dragged
 *  their own shape into it — which moving or deleting it would disturb. */
function holdsPersonsShapes(editor: Editor, id: TLShapeId): boolean {
  for (const descendantId of editor.getShapeAndDescendantIds([id])) {
    if (descendantId === id) continue
    const shape = editor.getShape(descendantId)
    if (shape && shape.meta.by !== 'agent') return true
  }
  return false
}

/** `ids` and every agent-owned shape nested under them: what a maintenance pass over `ids`
 *  (create, update, a layout op, framing) refreshes `meta.placed` for. */
function agentDescendantsAndSelf(editor: Editor, ids: TLShapeId[]): TLShapeId[] {
  return [...editor.getShapeAndDescendantIds(ids)].filter(
    (id) => editor.getShape(id)?.meta.by === 'agent',
  )
}

/** Refreshes `meta.placed` to where every agent shape in `ids` is now. The one
 *  place that stamps it, so create's initial stamp and every op's maintenance pass agree. Every
 *  caller already narrows `ids` to shapes it just confirmed exist and are agent-owned (created
 *  this call, or filtered through `agentDescendantsAndSelf`), so there is nothing left to guard. */
function place(editor: Editor, ids: TLShapeId[]) {
  const partials = ids.map((id) => {
    const shape = editor.getShape(id)!
    return { id: shape.id, type: shape.type, meta: { ...shape.meta, placed: pose(editor, shape) } }
  })
  editor.updateShapes(partials as unknown as TLShapePartial[])
}

function writeGuard(slug: string, pageId: TLPageId) {
  if (!readyForAgentWrite(slug, pageId))
    fail(
      'not_writable',
      `${slug}'s canvas.json is not ready for the bridge to write: it did not parse, or another window's save is about to load onto it`,
    )
}

function onPage(editor: Editor, pageId: TLPageId, id: TLShapeId): TLShape {
  const shape = editor.getShape(id)
  if (!shape || editor.getAncestorPageId(shape) !== pageId)
    fail('bad_command', `${id} does not exist on this canvas`)
  return shape
}

function guardOwnership(editor: Editor, ids: TLShapeId[]) {
  for (const id of ids) {
    const shape = editor.getShape(id)
    if (shape?.meta.by !== 'agent')
      fail('not_agents', `${id} is not the agent's to change; add a shape beside it instead`, { id })
    // `editor.run(..., { ignoreShapeLock: true })` is what lets every op below write an agent
    // shape at all; without this check that same flag would let it write straight through a lock
    // the person set on their own initiative too.
    if (shape.isLocked) fail('locked', `${id} is locked; ask the person to unlock it first`, { id })
  }
}

function guardNotHoldingPersonsShapes(editor: Editor, ids: TLShapeId[]) {
  for (const id of ids)
    if (holdsPersonsShapes(editor, id))
      fail('holds_persons_shapes', `${id} holds a shape of the person's; ask them to move it first`, {
        id,
      })
}

/** The "person's move wins" check: every id in `ids` must still be where the agent last
 *  placed it, unless `force`. */
function guardGeometry(editor: Editor, ids: TLShapeId[], force: boolean) {
  if (force) return
  const bad = ids
    .map((id) => editor.getShape(id)!)
    .filter((shape) => !untouched(editor, shape))
  if (bad.length)
    fail('moved_by_person', 'the person moved this since the agent last placed it', {
      shapes: bad.map((shape) => ({ id: shape.id, now: bounds(editor, shape) })),
    })
}

/** A layout op or a move writes each shape's x/y in turn, so a shape and its own container in
 *  one command would move the child twice. */
function guardNoNesting(editor: Editor, ids: TLShapeId[]) {
  for (const id of ids)
    for (const other of ids)
      if (id !== other && editor.hasAncestor(id, other))
        fail('bad_command', `${id} is inside ${other}; target one or the other, not both`)
}

// ---- get ----

/** A canvas-file names itself by its board file, for a layout board and an agent-placed one
 *  alike; a decorative library shape (a row heading, a link button) has no name — it is not a
 *  record in canvas.json, and `personsShapeName` would invent a misleading one. */
function shapeName(editor: Editor, shape: TLShape, slug: string): string | undefined {
  if (shape.type === CANVAS_FILE_SHAPE_TYPE) {
    const ref = canvasBoardRef((shape.props as { path: string }).path)
    return ref && `${ref.slug}/${ref.file}`
  }
  if (isLibraryShapeId(shape.id)) return undefined
  return personsShapeName(editor, shape, slug)
}

function shapeText(editor: Editor, shape: TLShape): string | undefined {
  if (shape.type === 'frame') return (shape.props as { name: string }).name
  if (!TEXT_RICH_TYPES.has(shape.type)) return undefined
  const richText = (shape.props as { richText?: TLRichText }).richText
  return richText ? renderPlaintextFromRichText(editor, richText) : undefined
}

function getView(editor: Editor, pageId: TLPageId, slug: string) {
  const shapes = [...editor.getPageShapeIds(pageId)].map((id) => editor.getShape(id)!)
  const arrows = shapes
    .filter((shape) => shape.type === 'arrow')
    .map((shape) => {
      const b = getArrowBindings(editor, shape as TLArrowShape)
      return { id: shape.id, from: b.start?.toId, to: b.end?.toId }
    })
  return {
    canvas: slug,
    shapes: shapes.map((shape) => {
      const name = shapeName(editor, shape, slug)
      const text = shapeText(editor, shape)
      return {
        id: shape.id,
        type: shape.type,
        owner: isLibraryShapeId(shape.id) ? 'layout' : shape.meta.by === 'agent' ? 'agent' : 'person',
        ...bounds(editor, shape),
        ...(shape.parentId.startsWith('shape:') ? { parent: shape.parentId } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(text !== undefined ? { text } : {}),
      }
    }),
    arrows,
  }
}

// ---- create ----

interface BuiltCreate {
  partial: RawPartial
  bind?: (editor: Editor) => void
  asset?: TLAsset
}

function buildBoard(
  pageId: TLPageId,
  slug: string,
  id: TLShapeId,
  x: number,
  y: number,
  raw: Record<string, unknown>,
): RawPartial {
  if (typeof raw.board !== 'string') fail('bad_command', 'a board needs board: "<fileName>.html"')
  const entry = readCanvasLibrary()
    .find((c) => c.slug === slug)
    ?.files.find((f) => `${f.fileName}.html` === raw.board)
  if (!entry) fail('bad_command', `${raw.board} is not a board in ${slug}`)
  const size = boardSize(entry)
  return {
    id,
    type: CANVAS_FILE_SHAPE_TYPE,
    parentId: pageId,
    x,
    y,
    isLocked: false,
    props: {
      w: typeof raw.w === 'number' ? raw.w : size.w,
      h: typeof raw.h === 'number' ? raw.h : size.h,
      name: entry.title,
      path: entry.path,
    },
    meta: { ...stripMeta(raw.meta), by: 'agent' },
  }
}

async function buildMedia(
  pageId: TLPageId,
  slug: string,
  id: TLShapeId,
  x: number,
  y: number,
  kind: 'image' | 'video',
  raw: Record<string, unknown>,
): Promise<BuiltCreate> {
  if (
    typeof raw.src !== 'string' ||
    !raw.src.startsWith('files/') ||
    !SAFE_NAME.test(raw.src.slice('files/'.length))
  )
    fail('bad_command', 'src must be "files/<name>", a file already uploaded to this canvas')
  const name = raw.src.slice('files/'.length)
  const mimeType = MIME_BY_EXT[name.split('.').pop()!.toLowerCase()]
  if (!mimeType) fail('bad_command', `${name} has a file extension the bridge does not recognize`)
  const url = boardFileUrl(slug, 'files/') + name
  // Read even when both sizes are given: the upload checks only the name, so this is where a file
  // that is missing, or is not an image or a video, is refused rather than saved as a blank one.
  // ponytail: a video is read whole to do it; a HEAD plus decoding only to size is the upgrade.
  let natural: { w: number; h: number }
  try {
    const res = await fetch(url)
    if (!res.ok) fail('bad_command', `${raw.src} could not be read (${res.status})`)
    const blob = await res.blob()
    natural =
      kind === 'image' ? await MediaHelpers.getImageSize(blob) : await MediaHelpers.getVideoSize(blob)
  } catch (error) {
    if (error instanceof BridgeError) throw error
    // A network failure or a file that is not a decodable image/video lands here — turned into
    // the bridge's own JSON contract rather than a rejected dispatch promise.
    fail('bad_command', `${raw.src} could not be read as ${kind === 'image' ? 'an image' : 'a video'}`)
  }
  const aspect = natural.w / natural.h
  const w = typeof raw.w === 'number' ? raw.w : typeof raw.h === 'number' ? raw.h * aspect : natural.w
  const h = typeof raw.h === 'number' ? raw.h : typeof raw.w === 'number' ? raw.w / aspect : natural.h
  const asset = AssetRecordType.create({
    id: AssetRecordType.createId(),
    type: kind,
    props: { w, h, name, isAnimated: false, mimeType, src: url },
  }) as TLAsset
  return {
    partial: {
      id,
      type: kind,
      parentId: pageId,
      x,
      y,
      isLocked: false,
      props: { w, h, assetId: asset.id },
      meta: { ...stripMeta(raw.meta), by: 'agent' },
    },
    asset,
  }
}

function buildArrowSugar(
  editor: Editor,
  pageId: TLPageId,
  id: TLShapeId,
  x: number,
  y: number,
  raw: Record<string, unknown>,
): BuiltCreate {
  const from = raw.from as TLShapeId
  const to = raw.to as TLShapeId
  for (const end of [from, to]) {
    if (isLibraryShapeId(end))
      fail('bad_command', `${end} is part of the layout; an arrow cannot bind to it`)
    const endShape = onPage(editor, pageId, end)
    if (!editor.canBindShapes({ fromShape: 'arrow', toShape: endShape.type, binding: 'arrow' }))
      fail('bad_command', `an arrow cannot bind to a ${endShape.type}`)
  }
  // The from/to sugar only adds the two bindings below; every other create field (opacity,
  // rotation, props, text) is the same arrow-create field an arrow made without it would get, so
  // building the partial is buildGeneric's job here too.
  return {
    partial: buildGeneric(pageId, id, x, y, 'arrow', raw),
    bind: (editor) =>
      editor.createBindings([
        {
          type: 'arrow',
          fromId: id,
          toId: from,
          props: { terminal: 'start', normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false },
        },
        {
          type: 'arrow',
          fromId: id,
          toId: to,
          props: { terminal: 'end', normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false },
        },
      ]),
  }
}

function buildGeneric(
  pageId: TLPageId,
  id: TLShapeId,
  x: number,
  y: number,
  type: string,
  raw: Record<string, unknown>,
): RawPartial {
  // w/h belong under props for every type built here; board/image/video are the only ones that
  // take a top-level w/h, and they never reach this builder.
  if (raw.w !== undefined || raw.h !== undefined)
    fail('bad_command', 'w/h go under props, not at the top level')
  const partial: RawPartial = { id, type, parentId: pageId, x, y, isLocked: false }
  if (raw.rotation !== undefined) partial.rotation = num(raw.rotation, 'rotation')
  if (raw.opacity !== undefined) partial.opacity = num(raw.opacity, 'opacity')
  const props = { ...(isRecord(raw.props) ? raw.props : {}) }
  if (typeof raw.text === 'string') Object.assign(props, textProps(type, raw.text))
  if (Object.keys(props).length) partial.props = props
  partial.meta = { ...stripMeta(raw.meta), by: 'agent' }
  return partial
}

/** A shape may keep the caller's id, so a later arrow can name it, but never one in the library's
 *  id space, which is what marks layout content. */
async function buildCreate(
  editor: Editor,
  pageId: TLPageId,
  slug: string,
  raw: unknown,
): Promise<BuiltCreate> {
  if (!isRecord(raw) || typeof raw.type !== 'string' || !CREATE_TYPES.has(raw.type))
    fail('bad_command', 'shape type is not allowed')
  const type = raw.type
  const x = num(raw.x, 'x')
  const y = num(raw.y, 'y')
  let id: TLShapeId
  if (raw.id === undefined) {
    id = createShapeId()
  } else {
    if (typeof raw.id !== 'string' || !raw.id.startsWith('shape:'))
      fail('bad_command', 'id must be a shape: id')
    if (isLibraryShapeId(raw.id as TLShapeId))
      fail('bad_command', `${raw.id} is part of the layout; choose a different id`)
    id = raw.id as TLShapeId
  }
  if (type === CANVAS_FILE_SHAPE_TYPE) return { partial: buildBoard(pageId, slug, id, x, y, raw) }
  if (type === 'image' || type === 'video') return buildMedia(pageId, slug, id, x, y, type, raw)
  if (type === 'arrow' && (raw.from !== undefined || raw.to !== undefined)) {
    if (typeof raw.from !== 'string' || typeof raw.to !== 'string')
      fail('bad_command', 'an arrow needs both from and to, or neither')
    return buildArrowSugar(editor, pageId, id, x, y, raw)
  }
  return { partial: buildGeneric(pageId, id, x, y, type, raw) }
}

/** createShapes fills unset styles and opacity from whatever the person last picked; an agent's
 *  shape gets its type's defaults instead. */
function pinCreateDefaults(editor: Editor, partial: RawPartial): RawPartial {
  const defaults = editor.getShapeUtil(partial.type as TLShape['type']).getDefaultProps() as Record<
    string,
    unknown
  >
  return { ...partial, opacity: partial.opacity ?? 1, props: { ...defaults, ...partial.props } }
}

async function createOp(editor: Editor, pageId: TLPageId, slug: string, input: unknown) {
  writeGuard(slug, pageId)
  if (!isRecord(input) || !Array.isArray(input.shapes) || !input.shapes.length)
    fail('bad_command', 'create needs a non-empty shapes array')
  if (input.shapes.length > MAX_SHAPES_PER_COMMAND)
    fail('bad_command', `at most ${MAX_SHAPES_PER_COMMAND} shapes`)
  // Everything is built and checked before anything is written, ids against the batch too.
  const built = await Promise.all(input.shapes.map((raw) => buildCreate(editor, pageId, slug, raw)))
  const seenInBatch = new Set<TLShapeId>()
  for (const { partial } of built) {
    if (editor.getShape(partial.id) || seenInBatch.has(partial.id))
      fail('exists', `${partial.id} exists; update it instead`, { id: partial.id })
    seenInBatch.add(partial.id)
  }

  const ids: TLShapeId[] = []
  editor.run(
    () => {
      for (const item of built) {
        if (item.asset) editor.createAssets([item.asset])
        editor.createShapes([pinCreateDefaults(editor, item.partial) as unknown as TLShapePartial])
        ids.push(item.partial.id)
        item.bind?.(editor)
      }
      place(editor, ids)
    },
    { history: 'ignore', ignoreShapeLock: true },
  )
  if (built.some((item) => item.partial.type === CANVAS_FILE_SHAPE_TYPE))
    window.dispatchEvent(new Event(LAYOUT_CHANGED))
  return { created: ids }
}

// ---- update ----

function resolveUpdateTarget(editor: Editor, pageId: TLPageId, raw: unknown) {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id.startsWith('shape:'))
    fail('bad_command', 'updated shapes need a shape: id')
  const shape = onPage(editor, pageId, raw.id as TLShapeId)
  if (typeof raw.type !== 'string' || raw.type !== shape.type)
    fail('bad_command', `${raw.id} is a ${shape.type}, not ${raw.type}`)
  const partial: RawPartial = { id: shape.id, type: shape.type }
  // x/y are the page-space bounds corner `get` reports, which is not the shape's origin once it
  // is rotated or framed: move the origin by the same delta, then into the parent's space.
  if (raw.x !== undefined || raw.y !== undefined) {
    const box = editor.getShapePageBounds(shape)!
    const dx = raw.x !== undefined ? num(raw.x, 'x') - box.x : 0
    const dy = raw.y !== undefined ? num(raw.y, 'y') - box.y : 0
    const origin = editor.getShapePageTransform(shape)!.point()
    // Both, even when one was asked for: in a turned frame, a move along page x changes both.
    const local = editor.getPointInParentSpace(shape, { x: origin.x + dx, y: origin.y + dy })
    partial.x = local.x
    partial.y = local.y
  }
  if (raw.rotation !== undefined) partial.rotation = num(raw.rotation, 'rotation')
  if (raw.opacity !== undefined) partial.opacity = num(raw.opacity, 'opacity')
  const props = { ...(isRecord(raw.props) ? raw.props : {}) }
  if (typeof raw.text === 'string') Object.assign(props, textProps(shape.type, raw.text))
  // A board's path is what makes it that board — its `assets/`, its comment threads, its id in
  // canvas.json all key off it. Changing it in place would silently turn one board into another
  // rather than the delete-and-create it actually is.
  if (shape.type === CANVAS_FILE_SHAPE_TYPE && 'path' in props)
    fail('bad_command', 'path cannot be changed by an update; delete and create instead')
  if (Object.keys(props).length) partial.props = props
  if (raw.meta !== undefined) partial.meta = stripMeta(raw.meta)
  return { shape, partial }
}

async function updateOp(editor: Editor, pageId: TLPageId, slug: string, input: unknown) {
  writeGuard(slug, pageId)
  if (!isRecord(input) || !Array.isArray(input.shapes) || !input.shapes.length)
    fail('bad_command', 'update needs a non-empty shapes array')
  if (input.shapes.length > MAX_SHAPES_PER_COMMAND)
    fail('bad_command', `at most ${MAX_SHAPES_PER_COMMAND} shapes`)
  const targets = input.shapes.map((raw) => resolveUpdateTarget(editor, pageId, raw))
  const ids = targets.map((t) => t.shape.id)
  const force = input.force === true
  const moving = targets.filter((t) => touchesGeometry(t.partial)).map((t) => t.shape.id)

  guardOwnership(editor, ids)
  // Only a geometry change disturbs a person's shape nested in an agent frame; a text or style
  // update does not move anything, so it does not need this check.
  guardNotHoldingPersonsShapes(editor, moving)
  guardNoNesting(editor, moving)
  guardGeometry(editor, moving, force)

  // Snapshotted before the write: a shape already moved by the person keeps its old `placed`
  // (the protection stays live) even though this update is about to change its bounds again.
  const affected = agentDescendantsAndSelf(editor, ids)
  const keep = force ? affected : affected.filter((id) => untouched(editor, editor.getShape(id)!))

  editor.run(
    () => {
      editor.updateShapes(
        targets.map(
          (t) =>
            ({
              ...t.partial,
              meta: { ...t.shape.meta, ...(t.partial.meta ?? {}), by: 'agent' },
            }) as unknown as TLShapePartial,
        ),
      )
      place(editor, keep)
    },
    { history: 'ignore', ignoreShapeLock: true },
  )
  return { updated: ids }
}

// ---- delete ----

function deleteOp(editor: Editor, pageId: TLPageId, slug: string, input: unknown) {
  writeGuard(slug, pageId)
  const ids = parseIds(isRecord(input) ? input.ids : undefined)
  if (!ids.length) fail('bad_command', 'delete needs at least one id')
  for (const id of ids) onPage(editor, pageId, id)
  guardOwnership(editor, ids)
  guardNotHoldingPersonsShapes(editor, ids)

  // Descendant-inclusive: deleting a frame that holds a board deletes that board too, and its
  // comment threads need the same loosening a direct delete of it would get.
  const boards = [...editor.getShapeAndDescendantIds(ids)].filter(
    (id) => editor.getShape(id)?.type === CANVAS_FILE_SHAPE_TYPE,
  )
  editor.run(() => editor.deleteShapes(ids), { history: 'ignore', ignoreShapeLock: true })
  if (boards.length) window.dispatchEvent(new Event(LAYOUT_CHANGED))
  return { deleted: ids }
}

// ---- align / distribute / stack / pack ----

const ALIGN_OPS = ['bottom', 'center-horizontal', 'center-vertical', 'center', 'left', 'right', 'top'] as const
const AXIS_OPS = ['horizontal', 'vertical'] as const

function layoutOp(
  editor: Editor,
  pageId: TLPageId,
  slug: string,
  op: 'align' | 'distribute' | 'stack' | 'pack',
  input: unknown,
) {
  writeGuard(slug, pageId)
  const ids = parseIds(isRecord(input) ? input.ids : undefined)
  // tldraw's own distributeShapes silently does nothing below 3 shapes — there is no middle
  // shape to distribute between the two ends.
  const min = op === 'distribute' ? 3 : 2
  if (ids.length < min) fail('bad_command', `${op} needs at least ${min} ids`)
  for (const id of ids) onPage(editor, pageId, id)
  guardNoNesting(editor, ids)
  const force = isRecord(input) && input.force === true
  const gap = isRecord(input) && input.gap !== undefined ? num(input.gap, 'gap') : undefined
  const operation = isRecord(input) ? input.operation : undefined
  // Resolved before any guard or write, not inline in the editor.run below: a bad `operation`
  // must fail the whole command before anything is touched, same as every other bad field.
  const align = op === 'align' ? oneOf(operation, ALIGN_OPS, 'operation') : undefined
  const axis = op === 'distribute' || op === 'stack' ? oneOf(operation, AXIS_OPS, 'operation') : undefined
  // tldraw's own stackShapes treats a gap of exactly 0 as "keep the shapes' existing gap", not
  // "touching" — not what an agent asking for a stacked gap of 0 means.
  if (op === 'stack' && gap === 0)
    fail(
      'bad_command',
      'a stack gap of 0 keeps the shapes\' existing gap in tldraw; omit gap to use the default (editor.options.adjacentShapeMargin)',
    )

  guardOwnership(editor, ids)
  guardNotHoldingPersonsShapes(editor, ids)
  guardGeometry(editor, ids, force)

  const affected = agentDescendantsAndSelf(editor, ids)
  const keep = force ? affected : affected.filter((id) => untouched(editor, editor.getShape(id)!))

  editor.run(
    () => {
      if (op === 'pack') editor.packShapes(ids, gap)
      else if (op === 'align') editor.alignShapes(ids, align!)
      else if (op === 'distribute') editor.distributeShapes(ids, axis!)
      else editor.stackShapes(ids, axis!, gap)
      place(editor, keep)
    },
    { history: 'ignore', ignoreShapeLock: true },
  )
  return { ids }
}

// ---- frame ----

function frameOp(editor: Editor, pageId: TLPageId, slug: string, input: unknown) {
  writeGuard(slug, pageId)
  const ids = parseIds(isRecord(input) ? input.ids : undefined)
  if (!ids.length) fail('bad_command', 'frame needs at least one id')
  for (const id of ids) onPage(editor, pageId, id)
  // Reparenting recalculates local x/y so page bounds do not move (confirmed against tldraw),
  // so nothing moves for the optimistic check to refuse, nor a frame whose contents already hold
  // one of the person's shapes. What does change is each shape's place in its parent, so the
  // untouched ones are stamped again, in the frame, or the person dragging the frame would read
  // as having moved every one. A shape the person moved keeps its old stamp. reparentShapes also
  // computes every shape's original page transform up front, so framing one id into another
  // already in `ids` needs no guardNoNesting the way layoutOp and updateOp do.
  guardOwnership(editor, ids)
  const keep = ids.filter((id) => untouched(editor, editor.getShape(id)!))

  const padding = isRecord(input) && input.padding !== undefined ? num(input.padding, 'padding') : 32
  const name = isRecord(input) && typeof input.name === 'string' ? input.name : undefined
  const box = Box.Common(ids.map((id) => editor.getShapePageBounds(id)!))
  const frameId = createShapeId()

  editor.run(
    () => {
      editor.createShapes([
        pinCreateDefaults(editor, {
          id: frameId,
          type: 'frame',
          parentId: pageId,
          x: box.x - padding,
          y: box.y - padding,
          props: { w: box.w + padding * 2, h: box.h + padding * 2, ...(name ? { name } : {}) },
          meta: { by: 'agent' },
        }) as unknown as TLShapePartial,
      ])
      editor.reparentShapes(ids, frameId)
      place(editor, [frameId, ...keep])
    },
    { history: 'ignore', ignoreShapeLock: true },
  )
  return { frame: frameId }
}

// ---- select / zoom ----

function selectOp(editor: Editor, pageId: TLPageId, input: unknown) {
  if (editor.getCurrentPageId() !== pageId)
    fail('not_current_page', 'select only works on the canvas open in front of the person')
  // No ids, same as zoom below, means "nothing", not "refused" — select is how an agent clears
  // the person's selection too.
  const ids = isRecord(input) && input.ids !== undefined ? parseIds(input.ids) : []
  for (const id of ids) onPage(editor, pageId, id)
  editor.select(...ids)
  return { selected: ids }
}

function zoomOp(editor: Editor, pageId: TLPageId, input: unknown) {
  if (editor.getCurrentPageId() !== pageId)
    fail('not_current_page', 'zoom only works on the canvas open in front of the person')
  const ids = isRecord(input) && input.ids !== undefined ? parseIds(input.ids) : undefined
  if (ids?.length) {
    for (const id of ids) onPage(editor, pageId, id)
    // Bounds computed directly rather than through editor.select + zoomToSelection, which would
    // leave the person's own selection changed by an op that is meant to only move the camera.
    editor.zoomToBounds(Box.Common(ids.map((id) => editor.getShapePageBounds(id)!)))
  } else {
    editor.zoomToFit()
  }
  return {}
}

/** A PNG of the page open in front of the person, of `ids` or of everything on it, as base64:
 *  `sp canvas shot` writes it to a file for the agent to look at. */
async function shotOp(editor: Editor, pageId: TLPageId, input: unknown) {
  if (editor.getCurrentPageId() !== pageId)
    fail('not_current_page', 'shot only works on the canvas open in front of the person')
  const ids = isRecord(input) && input.ids !== undefined ? parseIds(input.ids) : undefined
  for (const id of ids ?? []) onPage(editor, pageId, id)
  const shapes = ids?.length ? ids : [...editor.getCurrentPageShapeIds()]
  if (!shapes.length) fail('bad_command', 'there is nothing on this canvas to shoot')
  const { blob, width, height } = await editor.toImage(shapes, {
    padding: 32,
    pixelRatio: 1,
    background: true,
  })
  const url = await FileHelpers.blobToDataUrl(blob)
  return { png: url.slice(url.indexOf(',') + 1), width, height }
}

// ---- entry point ----

/** Runs one command against a project canvas's page. Every write goes through
 *  `editor.run(fn, { history: 'ignore', ignoreShapeLock: true })`: the agent's changes do not
 *  enter the person's undo stack, and never trip a lock meant to keep the person's pointer off
 *  a library shape. */
export async function dispatch(editor: Editor, slug: string, input: unknown) {
  try {
    const pageId = projectPages(editor).get(slug)
    if (!pageId) fail('not_writable', `${slug} is not a project canvas the bridge can write to`)
    if (!isRecord(input) || typeof input.op !== 'string')
      fail('bad_command', 'command must be an object with an op')
    switch (input.op) {
      case 'get':
        return getView(editor, pageId, slug)
      case 'create':
        return await createOp(editor, pageId, slug, input)
      case 'update':
        return await updateOp(editor, pageId, slug, input)
      case 'delete':
        return deleteOp(editor, pageId, slug, input)
      case 'align':
      case 'distribute':
      case 'stack':
      case 'pack':
        return layoutOp(editor, pageId, slug, input.op, input)
      case 'frame':
        return frameOp(editor, pageId, slug, input)
      case 'select':
        return selectOp(editor, pageId, input)
      case 'zoom':
        return zoomOp(editor, pageId, input)
      case 'shot':
        return await shotOp(editor, pageId, input)
      default:
        fail('bad_command', `unsupported canvas op: ${input.op}`)
    }
  } catch (error) {
    if (error instanceof BridgeError) return { error: error.code, message: error.message, ...error.data }
    // tldraw's own schema validation (e.g. a shape's props failing its type, or the pre-checks
    // above calling schema.types.shape.validate directly) throws this synchronously; caught here
    // and turned into the same JSON contract rather than rejecting the dispatch promise.
    if (error instanceof T.ValidationError) return { error: 'bad_command', message: error.message }
    throw error
  }
}

const READS = new Set(['get', 'select', 'zoom', 'shot'])

/** Runs the commands `sp canvas` sends this page (server/sp.ts), and answers each once what it
 *  wrote is on disk, so the agent is told a placement landed only when it did. */
export function installAgentBridge(editor: Editor) {
  // One at a time, in the order sent: a create still sizing its image, or a shot still drawing,
  // would otherwise run beside the next command, which may name a shape it has not made yet.
  // Run on either outcome, so a reply that could not be sent is reported and the next command
  // still runs.
  let last = Promise.resolve()
  return takeAgentCommands(({ id, slug, command }) => {
    const turn = () => run(id, slug, command)
    last = last.then(turn, turn)
  })

  async function run(id: string, slug: string, command: unknown) {
    let reply
    try {
      const result = await dispatch(editor, slug, command)
      if ('error' in result) reply = { id, ok: false, error: result }
      else {
        // A read writes nothing, so a save still pending from an earlier command is not its to fail.
        if (!READS.has((command as { op: string }).op)) await saveNow(slug)
        reply = { id, ok: true, result }
      }
    } catch (error) {
      reply = { id, ok: false, error: { error: 'failed', message: String(error) } }
    }
    await fetch(`${import.meta.env.BASE_URL}__sp/canvas-reply`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(reply),
    })
  }
}
