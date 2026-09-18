// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('renders GFM, keeping the <br> the model puts inside a table cell', () => {
    const html = renderMarkdown('| a | b |\n| - | - |\n| 1<br>2 | **x** |')
    expect(html).toContain('<table>')
    expect(html).toContain('1<br>2')
    expect(html).toContain('<strong>x</strong>')
  })

  it('closes what a delta cut open, so streaming text does not flicker', () => {
    expect(renderMarkdown('**29 个 H')).toContain('<strong>29 个 H</strong>')
    expect(renderMarkdown('run `bun test')).toContain('<code>bun test</code>')
  })

  it('is a table only once the delimiter row has arrived', () => {
    expect(renderMarkdown('| a | b |')).not.toContain('<table')
    expect(renderMarkdown('| a | b |\n| - | - |')).toContain('<table')
  })

  it('strips what marked lets through: scripts, handlers and javascript: links', () => {
    const script = renderMarkdown('<script>alert(1)</script>hi')
    expect(script).not.toContain('<script')
    expect(script).toContain('hi')
    const img = renderMarkdown('<img src=x onerror=alert(1)>')
    expect(img).toContain('<img src="x">')
    expect(img).not.toContain('onerror')
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('javascript:')
  })
})
