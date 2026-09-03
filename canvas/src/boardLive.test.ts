import { describe, expect, it } from 'vitest'
import refkit from '../../tools/refkit.py?raw'
import { boardIsLive } from './BoardMedia'
import { THUMB_SCALE, thumbPathFor } from './canvasLibrary'

const idle = { hasThumb: true, isEditing: false, moving: false, culled: false, zoom: 1, wasLive: false }

describe('boardIsLive', () => {
  it('is the thumbnail until the board is drawn larger than it', () => {
    expect(boardIsLive({ ...idle, zoom: THUMB_SCALE - 0.01 })).toBe(false)
    expect(boardIsLive({ ...idle, zoom: THUMB_SCALE })).toBe(true)
  })

  it('is the thumbnail off screen, whatever the zoom', () => {
    expect(boardIsLive({ ...idle, culled: true, zoom: 4 })).toBe(false)
  })

  it('holds whatever it was while the camera moves', () => {
    expect(boardIsLive({ ...idle, moving: true, zoom: 4, wasLive: false })).toBe(false)
    expect(boardIsLive({ ...idle, moving: true, culled: true, zoom: 0.1, wasLive: true })).toBe(true)
  })

  it('is live while edited, and always when there is no thumbnail', () => {
    expect(boardIsLive({ ...idle, isEditing: true, culled: true, zoom: 0.1 })).toBe(true)
    expect(boardIsLive({ ...idle, hasThumb: false, culled: true, zoom: 0.1 })).toBe(true)
  })
})

describe('thumbnails', () => {
  it('sit beside their board in thumbs/', () => {
    expect(thumbPathFor('../../mockups/canvases/chatgpt-ios/03-chat.html')).toBe(
      '../../mockups/canvases/chatgpt-ios/thumbs/03-chat.webp',
    )
  })

  it('are written at the scale the canvas swaps at', () => {
    // refkit writes the files, this module decides when to show them: the two constants
    // must agree or a thumbnail is upscaled (or the swap comes later than it needs to).
    expect(Number(/^THUMB_SCALE = ([\d.]+)/m.exec(refkit)?.[1])).toBe(THUMB_SCALE)
  })
})
