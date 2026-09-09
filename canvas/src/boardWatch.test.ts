import { describe, expect, it } from 'vitest'
import { boardChangeKind, boardSetSignature, boardSlug } from './boardWatch'

const DIR = '/project/mockups/canvases'
const kind = (file: string) => boardChangeKind(DIR, `${DIR}/${file}`)

describe('boardChangeKind', () => {
  it('names a board, its layout, its comments and its assets', () => {
    expect(kind('spotify-ios/01-home.html')).toBe('board')
    expect(kind('spotify-ios/layout.json')).toBe('layout')
    expect(kind('spotify-ios/comments.json')).toBe('comments')
    expect(kind('spotify-ios/assets.json')).toBe('assets')
    expect(kind('spotify-ios/icon.png')).toBe('assets')
    expect(kind('spotify-ios/assets/art/hero.png')).toBe('assets')
    expect(kind('spotify-ios/assets-dark/icons/play.svg')).toBe('assets')
  })

  it('ignores everything a run leaves beside the boards', () => {
    // The generator and its notes are not the boards it writes.
    expect(kind('spotify-ios/gen.py')).toBeNull()
    expect(kind('spotify-ios/README.md')).toBeNull()
    expect(kind('spotify-ios/probes.json')).toBeNull()
    // scratch/ is where a run puts its working files, at any depth, and reloading the canvas
    // for one would interrupt the run that is writing it.
    expect(kind('spotify-ios/scratch/draft.html')).toBeNull()
    expect(kind('spotify-ios/scratch/shots/measure.png')).toBeNull()
    // Third-party captures: never committed, never indexed, and a clone run writes hundreds.
    // The folder they arrive in is as quiet as the files in it.
    expect(kind('spotify-ios/assets/refs')).toBeNull()
    expect(kind('spotify-ios/assets/refs/home@2x.png')).toBeNull()
    // A folder that only starts with those four letters is an asset folder like any other.
    expect(kind('spotify-ios/assets/refsheet/a.png')).toBe('assets')
    // A board is one level deep, which is what the discovery scan reads.
    expect(kind('loose.html')).toBeNull()
  })

  it('claims nothing outside the boards directory', () => {
    expect(boardChangeKind(DIR, '/project/src/App.tsx')).toBeNull()
    // A sibling whose name starts with the same characters is not inside it.
    expect(boardChangeKind(DIR, '/project/mockups/canvases-old/demo/a.html')).toBeNull()
  })

  it('reads a Windows path the way it reads a POSIX one', () => {
    const dir = 'C:\\project\\mockups\\canvases'
    expect(boardChangeKind(dir, `${dir}\\demo\\a.html`)).toBe('board')
    expect(boardSlug(dir, `${dir}\\demo\\layout.json`)).toBe('demo')
  })
})

describe('boardSetSignature', () => {
  /** A boards directory as a name -> entries map, standing in for readdirSync. */
  const tree = (entries: Record<string, string[]>) => (dir: string) => entries[dir] ?? []

  const BOARDS = {
    [DIR]: ['spotify-ios', 'templates', '.DS_Store'],
    [`${DIR}/spotify-ios`]: ['01-home.html', '02-search.html', 'layout.json', 'icon.png', 'gen.py'],
    [`${DIR}/templates`]: ['01-blank.html', 'layout.json'],
  }

  it('moves when a board is added, removed or renamed', () => {
    const before = boardSetSignature(DIR, tree(BOARDS))
    const added = {
      ...BOARDS,
      [`${DIR}/spotify-ios`]: [...BOARDS[`${DIR}/spotify-ios`], '03-library.html'],
    }
    expect(boardSetSignature(DIR, tree(added))).not.toBe(before)

    const renamed = { ...BOARDS, [`${DIR}/templates`]: ['01-start.html', 'layout.json'] }
    expect(boardSetSignature(DIR, tree(renamed))).not.toBe(before)

    const { [`${DIR}/templates`]: _gone, ...rest } = BOARDS
    const removed = { ...rest, [DIR]: ['spotify-ios', '.DS_Store'] }
    expect(boardSetSignature(DIR, tree(removed))).not.toBe(before)
  })

  it('does not move when a board, a comment or a working file changes', () => {
    const before = boardSetSignature(DIR, tree(BOARDS))
    // Editing a file does not change any listing, and a comment or a scratch file is not in the
    // signature at all: neither is worth a reload.
    const noisy = {
      ...BOARDS,
      [`${DIR}/spotify-ios`]: [...BOARDS[`${DIR}/spotify-ios`], 'comments.json', 'scratch'],
    }
    expect(boardSetSignature(DIR, tree(noisy))).toBe(before)
  })

  it('is stable whatever order the filesystem lists in', () => {
    const shuffled = {
      ...BOARDS,
      [DIR]: ['templates', '.DS_Store', 'spotify-ios'],
      [`${DIR}/spotify-ios`]: ['layout.json', 'gen.py', '02-search.html', 'icon.png', '01-home.html'],
    }
    expect(boardSetSignature(DIR, tree(shuffled))).toBe(boardSetSignature(DIR, tree(BOARDS)))
  })

  it('signs a folder it cannot read, and one with nothing in it, alike', () => {
    // The server's `list` hands back nothing for a folder that is gone or unreadable, so a
    // dangling symlink signs the same as an empty folder instead of taking the watcher down.
    const empty = { ...BOARDS, [`${DIR}/templates`]: [] }
    expect(boardSetSignature(DIR, tree(empty))).toContain('templates:')
  })
})
