import React from "react";
import { Composition } from "remotion";

/**
 * Auto-discovers the assets dropped under src/templates/<slug>/ and
 * src/films/<slug>/, one folder per asset. Each folder becomes one Remotion
 * composition, named after the folder. Add or edit folders there; nothing here
 * needs to change.
 *
 * This is the video half of what canvas/src/canvasLibrary.ts does for the
 * artboards: discovery by convention, so there is no registry to keep in step
 * with the filesystem and no way to add an asset and forget to list it.
 *
 * `require.context` is rspack's (Config.setRspack in remotion.config.ts);
 * import.meta.glob is Vite-only and does not exist in this bundler.
 */
const assets = (
  require as unknown as {
    context: (
      dir: string,
      recursive: boolean,
      pattern: RegExp,
    ) => {
      keys: () => string[];
      (key: string): MotionAsset;
    };
  }
).context("./", true, /\/index\.tsx$/);

/** What every src/<bucket>/<slug>/index.tsx exports. */
export interface MotionAsset {
  /** The composition. Every value it draws must be a function of the frame. */
  Component: React.FC<never>;
  /** Its meta.json, re-exported so the canvas can read the box without TS. */
  meta: {
    fps: number;
    width: number;
    height: number;
    durationInFrames: number;
  };
  /** Props the composition renders with by default. Omit if it takes none. */
  defaultProps?: Record<string, unknown>;
}

/** "./templates/spatial-gallery/index.tsx" -> "spatial-gallery" */
const slugOf = (key: string) => {
  const parts = key.split("/");
  return parts[parts.length - 2];
};

export const RemotionRoot: React.FC = () => (
  <>
    {assets.keys().map((key) => {
      const { Component, meta, defaultProps } = assets(key);
      return (
        <Composition
          key={key}
          id={slugOf(key)}
          component={Component}
          fps={meta.fps}
          width={meta.width}
          height={meta.height}
          durationInFrames={meta.durationInFrames}
          defaultProps={defaultProps as never}
        />
      );
    })}
  </>
);
