import { describe, expect, it } from 'vitest'
import { joinMotionLibrary, type MotionMeta } from './motionLibrary'

const meta = (over: Partial<MotionMeta> = {}): MotionMeta => ({
  fps: 30,
  width: 1080,
  height: 864,
  durationInFrames: 120,
  ...over,
})

describe('joinMotionLibrary', () => {
  it('pairs a render with its own sidecar, and skips what it cannot place', () => {
    const library = joinMotionLibrary(
      {
        '../../motion/src/templates/spatial-gallery/out/spatial-gallery.mp4': '/sg.mp4',
        // Same slug, other bucket: the pair that shared one meta.json when the key was the slug.
        '../../motion/src/films/spatial-gallery/out/spatial-gallery.mp4': '/film.mp4',
        // Scratch file dropped in out/, e.g. by `motionkit compare`.
        '../../motion/src/templates/spatial-gallery/out/compare.mp4': '/compare.mp4',
        // Rendered but no meta.json, so there is no aspect to preview it at.
        '../../motion/src/templates/orphan/out/orphan.mp4': '/orphan.mp4',
      },
      {
        '../../motion/src/templates/spatial-gallery/meta.json': meta({ height: 864 }),
        '../../motion/src/films/spatial-gallery/meta.json': meta({ height: 1920, name: 'A Film' }),
      },
    )

    expect(library.map((file) => [file.bucket, file.title, file.src, file.meta.height])).toEqual([
      // Films sort before templates; meta.name wins over the humanized slug.
      ['films', 'A Film', '/film.mp4', 1920],
      ['templates', 'Spatial Gallery', '/sg.mp4', 864],
    ])
  })
})
