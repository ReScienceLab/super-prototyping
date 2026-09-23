import { describe, expect, it } from 'vitest'
import { canvasSlug, withLayoutKey } from './layoutEdit'

const withCanvasName = (source: string, name: string) => withLayoutKey(source, 'name', name)

/** A layout shaped like the ones in the wild: bare names, objects, and top-level keys. */
const LAYOUT = `{
  "cover": "home",
  "rows": [
    { "title": "Legend", "files": ["legend"] },
    {
      "title": "Main Tabs",
      "files": ["home", "collection", "timeline"]
    },
    {
      "title": "Capture",
      "files": [
        { "file": "capture-compose-done", "label": "Compose Done", "w": 478, "h": 980 },
        { "file": "timeline-fab-radial-menu", "label": "Timeline FAB Radial Menu" }
      ]
    }
  ]
}
`

/** The common shape: rows and nothing else. */
const PLAIN = `{
  "rows": [
    { "title": "Main Tabs", "files": ["home", "collection"] }
  ]
}
`

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

  it('writes a name that looks like a replacement pattern as itself', () => {
    const after = withCanvasName(PLAIN, 'A $& B')
    expect(JSON.parse(after).name).toBe('A $& B')
  })

  it('leaves a hand-formatted layout otherwise byte-identical', () => {
    const after = withCanvasName(LAYOUT, 'Cloned')
    expect(JSON.parse(after)).toEqual({ ...JSON.parse(LAYOUT), name: 'Cloned' })
    expect(without(after, '  "name": "Cloned",')).toBe(LAYOUT)
  })
})

describe('withLayoutKey', () => {
  it('sets, replaces and takes out a ground, leaving the rest of the file as it was', () => {
    const set = withLayoutKey(LAYOUT, 'ground', '#000000')
    expect(JSON.parse(set).ground).toBe('#000000')
    const replaced = withLayoutKey(set, 'ground', '#f2f2f2')
    expect(replaced).toBe(set.replace('#000000', '#f2f2f2'))
    expect(withLayoutKey(replaced, 'ground', null)).toBe(LAYOUT)
  })

  it('takes out a last key and one that shares a line with others', () => {
    expect(withLayoutKey(`{\n  "rows": [],\n  "ground": "#fff"\n}\n`, 'ground', null)).toBe(
      `{\n  "rows": []\n}\n`,
    )
    expect(withLayoutKey(`{ "ground": "#fff", "rows": [] }`, 'ground', null)).toBe(
      `{ "rows": [] }`,
    )
  })

  it('leaves a layout without the key alone when taking it out', () => {
    expect(withLayoutKey(PLAIN, 'ground', null)).toBe(PLAIN)
  })

  it('gives an empty layout, the one the server starts a missing file from, its first key', () => {
    expect(withLayoutKey('{}\n', 'ground', '#ffffff')).toBe('{\n  "ground": "#ffffff"\n}\n')
  })
})
