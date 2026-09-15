import { describe, expect, it } from 'vitest'
import {
  brandMaterialSlugs,
  canvasFileHtml,
  canvasImageKey,
  canvasImageRef,
  canvasImageUrl,
  loadCanvasFileHtml,
  readCanvasImage,
  readCanvasLayout,
  readCanvasLibrary,
} from './canvasLibrary'
import { WELCOME_PAGE_SLUG } from './canvasUrl'

describe('readCanvasLibrary', () => {
  it('puts the welcome page first, then `order`, then slug order', () => {
    const slugs = readCanvasLibrary().map((files) => files[0].pageSlug)
    expect(slugs[0]).toBe(WELCOME_PAGE_SLUG)
    // Three folders declare an order: snapaction-ios at -1 ahead of the alphabet,
    // apple-icons at 1 and templates at 2 behind it. Sorting the rest by the same
    // rule rather than naming them keeps this passing when a fourth one does.
    const rest = slugs.slice(1)
    const order = (slug: string) => readCanvasLayout(slug)?.order ?? 0
    expect(rest).toEqual(
      [...rest].sort(
        (a, b) => order(a) - order(b) || a.localeCompare(b, undefined, { numeric: true }),
      ),
    )
    expect(rest.slice(-2)).toEqual(['apple-icons', 'templates'])
  })
})

describe('loadCanvasFileHtml', () => {
  it('fills the cache useCanvasFileHtml reads from, and leaves non-boards out of it', async () => {
    const path = readCanvasLibrary()[0][0].path
    expect(canvasFileHtml.has(path)).toBe(false)
    const html = await loadCanvasFileHtml(path)
    expect(html).toContain('<')
    expect(canvasFileHtml.get(path)).toBe(html)
    // A second load resolves from the cache with the same string.
    expect(await loadCanvasFileHtml(path)).toBe(html)

    const missing = '/mockups/canvases/nope/00-nope.html'
    expect(await loadCanvasFileHtml(missing)).toBeUndefined()
    expect(canvasFileHtml.has(missing)).toBe(false)
  })

  it('ends every board with the tag that stops the browser back gesture', async () => {
    // A wheel inside an iframe never reaches tldraw, so a board that does not stop overscroll
    // in its own document turns a two-finger pan over it into a back navigation.
    const path = readCanvasLibrary()[1][0].path
    const html = await loadCanvasFileHtml(path)
    expect(html).toMatch(/<style>html\{overscroll-behavior:none\}<\/style>$/)
  })
})

describe('images rows', () => {
  it('name only committed files, with the pixel size they are drawn at', () => {
    // Both the canvas and the brand sheet drop an image they cannot resolve or size, so a
    // mistyped path or a missing w/h leaves a gap in the published evidence and says nothing
    // about it. This is where that gets said: the two conditions, checked in one place.
    const slugs = [...new Set(readCanvasLibrary().map((files) => files[0].pageSlug))]
    const broken = slugs.flatMap((slug) =>
      (readCanvasLayout(slug)?.rows ?? []).flatMap((row) =>
        (row.images ?? []).flatMap((image) =>
          canvasImageUrl(slug, image.file) && image.w && image.h
            ? []
            : [`${slug}: ${image.file}`],
        ),
      ),
    )
    expect(broken).toEqual([])
  })
})

describe('canvasImageRef', () => {
  it('finds the layout entry behind a brand image, and nothing behind any other shape', () => {
    // The whole click path, in one go: the canvas builds a shape id out of the folder and the
    // file (App.tsx, imageShapeId), and a click on the canvas hands that id back for the panel
    // to read the picture's row, label and source from.
    const slug = brandMaterialSlugs()[0]
    const row = (readCanvasLayout(slug)?.rows ?? []).find((r) => r.images?.length)
    const image = row?.images?.[0]
    if (!row || !image) throw new Error('no brand material to check')

    expect(canvasImageRef(`shape:${canvasImageKey(slug, image.file)}`)).toEqual({
      slug,
      file: image.file,
    })
    expect(readCanvasImage(slug, image.file)).toEqual({ row: row.title, image })

    // A brand file is `assets/brand/...`, so the slug is what is before the *first* slash.
    expect(image.file).toContain('/')
    expect(canvasImageRef('shape:canvas-file:/mockups/canvases/x/01-a.html')).toBeUndefined()
    expect(canvasImageRef('shape:canvas-image:slug-with-no-file')).toBeUndefined()
  })
})
