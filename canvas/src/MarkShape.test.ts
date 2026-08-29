import { describe, expect, it } from 'vitest'
import { nextMarkNumber, pickMarkTarget } from './MarkShape'

describe('marks', () => {
  it('continues after the highest existing mark', () => {
    expect(
      nextMarkNumber([
        { type: 'mark', props: { number: 1 } },
        { type: 'text', props: {} },
        { type: 'mark', props: { number: 3 } },
      ]),
    ).toBe(4)
  })

  it('targets the underlying HTML preview before an annotation', () => {
    expect(
      pickMarkTarget([
        { type: 'text', id: 'annotation' },
        { type: 'html-mockup', id: 'phone' },
      ]),
    ).toEqual({ type: 'html-mockup', id: 'phone' })
  })
})
