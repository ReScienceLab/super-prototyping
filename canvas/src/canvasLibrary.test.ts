import { describe, expect, it } from 'vitest'
import { readCanvasLibrary } from './canvasLibrary'
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
