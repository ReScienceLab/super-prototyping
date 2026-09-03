import { describe, expect, it } from 'vitest'
import { CANVAS_LINK_CARD_SIZE, fitCover } from './CanvasLinkShapeUtil'

// The one thing the card must never do is leave a gap: the board's cover box has to land over
// every pixel of the shell's screen, whichever axis binds and whatever box the folder declares.
describe('fitCover', () => {
  it('covers the screen for both phone frames the library draws', () => {
    const screen = { w: 224.71, h: 487.15 }
    for (const box of [
      [46, 24, 393, 852], // every folder but ours
      [18.46, 12, 441.07, 956], // snapaction-ios, a wider phone under a scale
      [0, 0, 478, 980], // apple-icons, a full-bleed sheet with no phone on it
    ] as [number, number, number, number][]) {
      const { scale, left, top } = fitCover(box, screen.w, screen.h)
      expect(left + box[0] * scale).toBeLessThanOrEqual(0.01)
      expect(top + box[1] * scale).toBeLessThanOrEqual(0.01)
      expect(left + (box[0] + box[2]) * scale).toBeGreaterThanOrEqual(screen.w - 0.01)
      expect(top + (box[1] + box[3]) * scale).toBeGreaterThanOrEqual(screen.h - 0.01)
    }
  })

  it('is as tall as the device it holds', () => {
    expect(CANVAS_LINK_CARD_SIZE).toEqual({ w: 239, h: 501 })
  })
})
