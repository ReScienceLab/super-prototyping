import { describe, expect, it } from 'vitest'
import { canvasSlug, withBoardStatus, withCanvasName } from './boardStatusEdit'

/** A layout shaped like the ones in the wild: bare names, objects, and a folder default. */
const LAYOUT = `{
  "cover": "home",
  "status": "exploring",
  "rows": [
    { "title": "Legend", "files": ["status-legend"] },
    {
      "title": "Main Tabs",
      "files": ["home", "collection", "timeline"]
    },
    {
      "title": "Capture",
      "files": [
        { "file": "capture-compose-done", "label": "Compose Done", "status": "outdated" },
        { "file": "timeline-fab-radial-menu", "label": "Timeline FAB Radial Menu" }
      ]
    }
  ]
}
`

/** The common shape: no folder default, so an unmarked board is live. */
const PLAIN = `{
  "rows": [
    { "title": "Main Tabs", "files": ["home", "collection"] }
  ]
}
`

/** The one changed line, so a test says what moved instead of comparing two walls of JSON. */
const diff = (before: string, after: string) =>
  after.split('\n').filter((line, i) => line !== before.split('\n')[i])

describe('withBoardStatus', () => {
  it('replaces the status an object entry already carries, and nothing else on the line', () => {
    const after = withBoardStatus(LAYOUT, 'capture-compose-done', 'live')!
    expect(diff(LAYOUT, after)).toEqual([
      '        { "file": "capture-compose-done", "label": "Compose Done", "status": "live" },',
    ])
  })

  it('adds a status to an object entry that has none, keeping its other keys in order', () => {
    const after = withBoardStatus(LAYOUT, 'timeline-fab-radial-menu', 'outdated')!
    expect(diff(LAYOUT, after)).toEqual([
      '        { "file": "timeline-fab-radial-menu", "label": "Timeline FAB Radial Menu", "status": "outdated" }',
    ])
  })

  it('grows a bare name into an object, in place', () => {
    const after = withBoardStatus(LAYOUT, 'collection', 'outdated')!
    expect(diff(LAYOUT, after)).toEqual([
      '      "files": ["home", { "file": "collection", "status": "outdated" }, "timeline"]',
    ])
  })

  it('leaves a bare name alone when it already means what is being asked for', () => {
    // The folder is `exploring`, so a bare entry is exploring: expanding it would add an
    // object that says what the line above it already said.
    expect(withBoardStatus(LAYOUT, 'home', 'exploring')).toBe(LAYOUT)
  })

  it('drops the override when a board is set back to what the folder says', () => {
    const after = withBoardStatus(LAYOUT, 'capture-compose-done', 'exploring')!
    expect(diff(LAYOUT, after)).toEqual([
      '        { "file": "capture-compose-done", "label": "Compose Done" },',
    ])
  })

  it('shrinks an entry back to a bare name when the status was all it carried', () => {
    const marked = withBoardStatus(LAYOUT, 'collection', 'outdated')!
    expect(withBoardStatus(marked, 'collection', 'exploring')).toBe(LAYOUT)
  })

  it('round-trips a live-by-default board back to the bare name it started as', () => {
    const marked = withBoardStatus(PLAIN, 'home', 'outdated')!
    expect(marked).toContain('{ "file": "home", "status": "outdated" }')
    expect(withBoardStatus(marked, 'home', 'live')).toBe(PLAIN)
  })

  it('does not mistake the `cover` for a row entry', () => {
    const after = withBoardStatus(LAYOUT, 'home', 'outdated')!
    expect(after).toContain('"cover": "home"')
    expect(diff(LAYOUT, after)).toEqual([
      '      "files": [{ "file": "home", "status": "outdated" }, "collection", "timeline"]',
    ])
  })

  it('returns null for a board the layout never lists', () => {
    expect(withBoardStatus(LAYOUT, 'not-in-here', 'live')).toBeNull()
  })

  it('rewrites one line of a real layout and leaves every other byte alone', () => {
    const after = withBoardStatus(LAYOUT, 'capture-compose-done', 'exploring')!
    expect(after.split('\n')).toHaveLength(LAYOUT.split('\n').length)
    expect(diff(LAYOUT, after)).toHaveLength(1)
  })
})

describe('canvasSlug', () => {
  it('keeps a name that is already a folder name', () => {
    expect(canvasSlug('v1.16')).toBe('v1.16')
  })

  it('folds spaces and case into a slug', () => {
    expect(canvasSlug('  Home Redesign v2 ')).toBe('home-redesign-v2')
  })

  it('has nothing to make of a name with no ASCII in it', () => {
    expect(canvasSlug('新画布')).toBe('')
  })

  it('never slugs to a path', () => {
    expect(canvasSlug('..')).toBe('')
    expect(canvasSlug('../evil')).toBe('evil')
  })
})

/** The added line taken back out, so a test can say the rest of the file never moved. */
const without = (source: string, line: string) =>
  source
    .split('\n')
    .filter((l) => l !== line)
    .join('\n')

describe('withCanvasName', () => {
  it('replaces the name a layout already carries', () => {
    const before = `{\n  "name": "v1.16",\n  "cover": "home"\n}\n`
    expect(withCanvasName(before, 'v1.17')).toBe(
      `{\n  "name": "v1.17",\n  "cover": "home"\n}\n`,
    )
  })

  it('adds one to a layout that never named itself', () => {
    const after = withCanvasName(PLAIN, 'Main Tabs')
    expect(JSON.parse(after)).toEqual({ ...JSON.parse(PLAIN), name: 'Main Tabs' })
    expect(without(after, '  "name": "Main Tabs",')).toBe(PLAIN)
  })

  it('does not mistake a row label for the page name', () => {
    const before = `{\n  "rows": [\n    { "title": "T", "files": [{ "file": "a", "name": "no" }] }\n  ]\n}\n`
    const after = withCanvasName(before, 'Page')
    expect(after).toContain('"name": "no"')
    expect(JSON.parse(after).name).toBe('Page')
  })

  it('leaves a hand-formatted layout otherwise byte-identical', () => {
    const after = withCanvasName(LAYOUT, 'Cloned')
    expect(JSON.parse(after)).toEqual({ ...JSON.parse(LAYOUT), name: 'Cloned' })
    expect(without(after, '  "name": "Cloned",')).toBe(LAYOUT)
  })
})
