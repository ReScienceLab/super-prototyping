import { humanize } from "./canvasLibrary";

// Auto-discovers the motion assets under motion/src/<bucket>/<slug>/, the same way
// canvasLibrary.ts discovers the boards: one folder per asset, no registry. An asset shows up
// here once it has been rendered, because what the canvas can show is the mp4, not the
// composition. `?url` rather than `?raw`: a 2MB video is served, never inlined.
//
// The buckets are named rather than globbed as `*`, so a folder under some third bucket is
// loudly absent from the studio and the canvas alike instead of being bundled into dist/ and
// then silently dropped by the layout, which only knows these two.
const rawVideos = import.meta.glob("../../motion/src/{templates,films}/*/out/*.mp4", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

// The composition's own box, which is also the aspect the preview has to hold. It is a JSON
// sidecar rather than a field in index.tsx precisely so this file can read it: the canvas is a
// Vite app and the compositions are rspack-bundled TSX, and JSON is the one thing both parse.
const rawMeta = import.meta.glob("../../motion/src/{templates,films}/*/meta.json", {
  eager: true,
  import: "default",
}) as Record<string, MotionMeta>;

export interface MotionMeta {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  /**
   * Caption override, the sidecar's answer to layout.json's `name`. Without one the slug is
   * humanized, which cannot express casing or punctuation: "luma-ios-launch" becomes "Luma Ios
   * Launch", never "(example) Luma iOS launch".
   */
  name?: string;
}

export interface MotionLibraryFile {
  /** "templates" or "films" — the two buckets, and the two rows on the page. */
  bucket: string;
  slug: string;
  title: string;
  /** URL Vite serves the rendered mp4 from. */
  src: string;
  meta: MotionMeta;
}

/** The tldraw page these all land on. */
export const MOTION_PAGE_SLUG = "motion";
export const MOTION_PAGE_NAME = "Motion";

/** Every preview is this wide, so the column pitch matches the boards' 478pt artboards. */
export const MOTION_PREVIEW_WIDTH = 478;

/**
 * How many previews sit in one row before it wraps. Four is what the welcome board is wide
 * enough for (4 * 478 + 3 * 80 = 2152, against its 2153), and a strip wider than the board it
 * sits under makes zoom-to-fit shrink everything to read the videos.
 */
export const MOTION_ROW_LENGTH = 4;

const VIDEO_PATTERN = /motion\/src\/(templates|films)\/([^/]+)\/out\/([^/]+)\.mp4$/;
const META_PATTERN = /motion\/src\/(templates|films)\/([^/]+)\/meta\.json$/;

/** Seconds, for the caption: what a reader wants from a video is its length. */
export function durationSeconds(meta: MotionMeta) {
  return meta.durationInFrames / meta.fps;
}

/**
 * Joins renders to sidecars. Split out from the globs below so it can be tested on paths
 * without a bundler: every rule here is one that fails silently on the canvas rather than
 * loudly at build time.
 *
 * Keyed by bucket *and* slug, because two assets of the same name in different buckets would
 * otherwise share whichever meta.json the glob happened to enumerate last, and one of them
 * would be drawn at the other's aspect. Remotion refuses that pair outright (see Root.tsx), so
 * the canvas is the only place it could pass unnoticed.
 */
export function joinMotionLibrary(
  videos: Record<string, string>,
  metaFiles: Record<string, MotionMeta>,
): MotionLibraryFile[] {
  const metaByAsset = new Map<string, MotionMeta>();
  for (const [path, meta] of Object.entries(metaFiles)) {
    const match = META_PATTERN.exec(path);
    if (match) metaByAsset.set(`${match[1]}/${match[2]}`, meta);
  }

  const files: MotionLibraryFile[] = [];
  for (const [path, src] of Object.entries(videos)) {
    const match = VIDEO_PATTERN.exec(path);
    if (!match) continue;
    const [, bucket, slug, fileName] = match;
    // out/ holds one render, named for its asset. Anything else in there is a scratch file —
    // `motionkit compare` writes compare.mp4 into the working directory, and out/ is where you
    // stand to compare a render — and a second entry for one asset would collide on the shape
    // id the layout derives from the slug.
    if (fileName !== slug) continue;
    const meta = metaByAsset.get(`${bucket}/${slug}`);
    // No sidecar, no aspect to preview it at, so it is skipped rather than guessed at.
    if (!meta) continue;
    files.push({ bucket, slug, title: meta.name ?? humanize(slug), src, meta });
  }

  const bucketOrder = (bucket: string) => (bucket === "films" ? 0 : 1);
  return files.sort(
    (a, b) =>
      bucketOrder(a.bucket) - bucketOrder(b.bucket) ||
      a.slug.localeCompare(b.slug, undefined, { numeric: true }),
  );
}

/**
 * Every rendered asset, films first (a finished cut is the thing to look at), then templates,
 * alphabetically within each.
 */
export function readMotionLibrary(): MotionLibraryFile[] {
  return joinMotionLibrary(rawVideos, rawMeta);
}
