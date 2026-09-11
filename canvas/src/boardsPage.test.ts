import { describe, expect, it } from 'vitest'
import { boardsPageDoc } from './boardsPage'
import { WELCOME_PAGE_SLUG } from './canvasUrl'

/** The document is built as a string, so the assertions read it as one. */
const captions = (doc: string) => [...doc.matchAll(/<figcaption>(.*?)<\/figcaption>/g)].map((m) => m[1])
const headings = (doc: string) => [...doc.matchAll(/<h2>(.*?)<\/h2>/g)].map((m) => m[1])

describe('boardsPageDoc', () => {
  it('lays the boards out in layout.json order, with the canvas own captions', async () => {
    const doc = await boardsPageDoc('notion-ios')
    expect(headings(doc)).toEqual([
      'Foundations',
      'Notion iOS replica screens',
      'Flow: adding a new data source',
      'Flow: adding an account',
      'Flow: the purchase sheet',
    ])
    // A `numbered` row counts from 1 within that row; a plain one is the file's own title.
    expect(captions(doc).slice(0, 3)).toEqual(['Design tokens', '1 · Splash', '2 · Search / Ask AI'])
    expect(doc).toContain('<h1>(example) Notion iOS</h1>')

    // Every board is an iframe at the artboard size, pointed at that board as a page of its own.
    const frames = [...doc.matchAll(/<iframe src="(blob:[^"]+)" width="(\d+)" height="(\d+)"/g)]
    expect(frames).toHaveLength(captions(doc).length)
    expect(frames.every(([, , w, h]) => w === '478' && h === '980')).toBe(true)
    expect(new Set(frames.map(([, src]) => src)).size).toBe(frames.length)
  })

  it('gives a board the size its entry declares', async () => {
    // The welcome strip is the one board in the repo that is not phone-shaped.
    const doc = await boardsPageDoc(WELCOME_PAGE_SLUG)
    expect(doc).toContain('width="2153" height="819"')
    expect(captions(doc)).toEqual(['What this is'])
    expect(doc).toContain('<p class="sub">1 board at full size</p>')
  })

  it('has nothing to draw for a page with no boards', async () => {
    const doc = await boardsPageDoc('not-a-folder')
    expect(doc).not.toContain('<iframe')
    expect(doc).toContain('<p class="sub">0 boards at full size</p>')
  })
})
