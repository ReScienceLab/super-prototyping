import { describe, expect, it } from 'vitest'
import { parseCanvasCommand } from './agentBridge'

describe('parseCanvasCommand', () => {
  it('accepts bounded canvas commands and rejects unsafe shapes', () => {
    expect(parseCanvasCommand({ op: 'zoom' })).toEqual({ op: 'zoom', ids: undefined })
    expect(
      parseCanvasCommand({ op: 'create', shapes: [{ type: 'text', x: 10, y: 20 }] }),
    ).toMatchObject({ op: 'create' })

    expect(() =>
      parseCanvasCommand({ op: 'create', shapes: [{ type: 'embed', props: { url: 'https://example.com' } }] }),
    ).toThrow('shape type is not allowed')
    expect(() => parseCanvasCommand({ op: 'delete', ids: ['not-a-shape-id'] })).toThrow()
    expect(() =>
      parseCanvasCommand({ op: 'create', shapes: Array.from({ length: 101 }, () => ({ type: 'text' })) }),
    ).toThrow('1-100')
  })
})
