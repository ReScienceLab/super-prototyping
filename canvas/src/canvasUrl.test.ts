import { describe, expect, it } from 'vitest'
import { WELCOME_PAGE_SLUG, boardFromUrl, slugFromUrl, urlForSlug } from './canvasUrl'

// The address is what people paste to each other, so both directions have to agree: the URL a
// page writes must open that page, the URL a board writes must open that board, and the welcome
// page must write the bare URL back.
describe('canvas URLs', () => {
  const root = 'https://prototyping.rescience.com/'

  it('reads a page slug and falls back to the welcome page', () => {
    expect(slugFromUrl(root + '?canvas=luma-ios')).toBe('luma-ios')
    expect(slugFromUrl(root)).toBe(WELCOME_PAGE_SLUG)
    expect(slugFromUrl(root + '?other=1')).toBe(WELCOME_PAGE_SLUG)
  })

  it('reads a board from the hash, and none from an address without one', () => {
    expect(boardFromUrl(root + '?canvas=luma-ios#03-event')).toBe('03-event')
    expect(boardFromUrl(root + '#00-welcome')).toBe('00-welcome')
    expect(boardFromUrl(root + '?canvas=luma-ios')).toBeUndefined()
    expect(boardFromUrl(root + '?canvas=luma-ios#')).toBeUndefined()
    expect(boardFromUrl(root + '?canvas=luma-ios#%')).toBeUndefined()
    expect(boardFromUrl(root + '?canvas=luma-ios#%E0%A4%A')).toBeUndefined()
  })

  it('round-trips a file name the hash would otherwise mangle', () => {
    for (const name of ['03 event', '100%-width', 'a#b?c']) {
      expect(boardFromUrl(urlForSlug(root, 'luma-ios', name))).toBe(name)
    }
  })

  it('writes a page as ?canvas= and the welcome page as the bare URL', () => {
    expect(urlForSlug(root, 'luma-ios')).toBe(root + '?canvas=luma-ios')
    expect(urlForSlug(root + '?canvas=luma-ios', 'notion-ios')).toBe(root + '?canvas=notion-ios')
    expect(urlForSlug(root + '?canvas=luma-ios', WELCOME_PAGE_SLUG)).toBe(root)
  })

  it('writes a board as the hash, and drops it when none is open', () => {
    expect(urlForSlug(root, 'luma-ios', '03-event')).toBe(root + '?canvas=luma-ios#03-event')
    expect(urlForSlug(root + '?canvas=luma-ios#03-event', 'luma-ios')).toBe(root + '?canvas=luma-ios')
    expect(urlForSlug(root + '?canvas=luma-ios#03-event', 'notion-ios')).toBe(root + '?canvas=notion-ios')
    expect(urlForSlug(root, WELCOME_PAGE_SLUG, '00-welcome')).toBe(root + '#00-welcome')
  })

  it('round-trips and keeps unrelated parameters', () => {
    const href = urlForSlug(root + '?other=1', 'raycast-ios', '02-home')
    expect(slugFromUrl(href)).toBe('raycast-ios')
    expect(boardFromUrl(href)).toBe('02-home')
    expect(new URL(href).searchParams.get('other')).toBe('1')
    expect(new URL(urlForSlug(href, WELCOME_PAGE_SLUG)).search).toBe('?other=1')
  })
})
