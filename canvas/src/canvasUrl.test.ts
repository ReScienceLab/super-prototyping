import { describe, expect, it } from 'vitest'
import { WELCOME_PAGE_SLUG, slugFromUrl, urlForSlug } from './canvasUrl'

// The address is what people paste to each other, so both directions have to agree: the URL a
// page writes must open that page, and the welcome page must write the bare URL back.
describe('canvas URLs', () => {
  const root = 'https://prototyping.rescience.com/'

  it('reads a board slug and falls back to the welcome page', () => {
    expect(slugFromUrl(root + '?canvas=luma-ios')).toBe('luma-ios')
    expect(slugFromUrl(root)).toBe(WELCOME_PAGE_SLUG)
    expect(slugFromUrl(root + '?other=1')).toBe(WELCOME_PAGE_SLUG)
  })

  it('writes a board as ?canvas= and the welcome page as the bare URL', () => {
    expect(urlForSlug(root, 'luma-ios')).toBe(root + '?canvas=luma-ios')
    expect(urlForSlug(root + '?canvas=luma-ios', 'notion-ios')).toBe(root + '?canvas=notion-ios')
    expect(urlForSlug(root + '?canvas=luma-ios', WELCOME_PAGE_SLUG)).toBe(root)
  })

  it('round-trips and keeps unrelated parameters', () => {
    const href = urlForSlug(root + '?other=1', 'raycast-ios')
    expect(slugFromUrl(href)).toBe('raycast-ios')
    expect(new URL(href).searchParams.get('other')).toBe('1')
    expect(new URL(urlForSlug(href, WELCOME_PAGE_SLUG)).search).toBe('?other=1')
  })
})
