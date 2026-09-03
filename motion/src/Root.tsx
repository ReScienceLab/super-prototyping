import React from "react";
import { Composition, Folder } from "remotion";

/** The two buckets, in the order the studio sidebar lists them. */
const BUCKETS = ["films", "templates"] as const;

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
 * import.meta.glob is Vite-only and does not exist in this bundler. It walks
 * the whole tree, so the pattern has to pin the depth: matching every
 * `index.tsx` would turn an asset's own `components/index.tsx` — the most
 * ordinary React layout there is — into a composition with no meta, which
 * fails deep inside Remotion with no folder name in the message.
 *
 * The pattern is written out at the call rather than hoisted to the constant
 * below: rspack reads it statically to decide what to bundle, and a reference
 * it cannot evaluate makes it fall back to bundling the whole directory —
 * READMEs included, which fails as a JavaScript parse error.
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
).context("./", true, /^(?:\.\/)?(?:templates|films)\/[^/]+\/index\.tsx$/);

/** The same pattern again, this time to read the bucket and slug off a key. */
const ASSET_KEY = /^(?:\.\/)?(templates|films)\/([^/]+)\/index\.tsx$/;

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
    /** Display name on the canvas. Without one the slug is humanized. */
    name?: string;
  };
  /** Props the composition renders with by default. Omit if it takes none. */
  defaultProps?: Record<string, unknown>;
}

/**
 * Every asset, with the bucket and slug its folder puts it in. Both the id
 * clash and the missing sidecar are caught here rather than left to fail as
 * something less legible later: a composition id is the folder name, and
 * Remotion's ids are global, so two folders of the same name in different
 * buckets collide however far apart they sit on disk.
 */
const compositions = assets.keys().map((key) => {
  const [, bucket, slug] = ASSET_KEY.exec(key) as RegExpExecArray;
  const asset = assets(key);
  if (!asset.meta) {
    throw new Error(
      `motion/src/${bucket}/${slug}/index.tsx exports no meta. Add ` +
        `meta.json beside it and re-export it: ` +
        `export { default as meta } from "./meta.json";`,
    );
  }
  return { bucket, slug, ...asset };
});

const bucketOf = new Map<string, string>();
for (const { bucket, slug } of compositions) {
  const first = bucketOf.get(slug);
  if (first) {
    throw new Error(
      `Two assets are both called "${slug}" (src/${first}/ and src/${bucket}/). ` +
        `A composition id is its folder name, and ids are global, so a slug has ` +
        `to be unique across both buckets.`,
    );
  }
  bucketOf.set(slug, bucket);
}

export const RemotionRoot: React.FC = () => (
  <>
    {BUCKETS.map((bucket) => {
      const inBucket = compositions.filter((asset) => asset.bucket === bucket);
      if (!inBucket.length) return null;
      // Folders group the studio's sidebar. A flat list reads fine at five
      // assets and not at thirty, which is the count this tree is built for.
      return (
        <Folder key={bucket} name={bucket}>
          {inBucket.map(({ slug, Component, meta, defaultProps }) => (
            <Composition
              key={slug}
              id={slug}
              component={Component}
              fps={meta.fps}
              width={meta.width}
              height={meta.height}
              durationInFrames={meta.durationInFrames}
              defaultProps={defaultProps as never}
            />
          ))}
        </Folder>
      );
    })}
  </>
);
