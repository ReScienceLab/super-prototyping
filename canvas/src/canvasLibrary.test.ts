import { describe, expect, it } from 'vitest'
import {
  canvasFileHtml,
  loadCanvasFileHtml,
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
