import { describe, expect, it } from 'vitest'
import { canvasFileHtml, loadCanvasFileHtml, readCanvasLibrary } from './canvasLibrary'
import { WELCOME_PAGE_SLUG } from './canvasUrl'

describe('readCanvasLibrary', () => {
  it('puts the welcome page first, then `order`, then slug order', () => {
    const slugs = readCanvasLibrary().map((files) => files[0].pageSlug)
    // snapaction-ios is the one folder that declares an order (-1).
    expect(slugs.slice(0, 2)).toEqual([WELCOME_PAGE_SLUG, 'snapaction-ios'])
    const rest = slugs.slice(2)
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })))
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
})
