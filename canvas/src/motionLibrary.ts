import { humanize } from "./canvasLibrary";

// Auto-discovers the motion assets under motion/src/<bucket>/<slug>/, the same way
// canvasLibrary.ts discovers the boards: one folder per asset, no registry. An asset shows up
// here once it has been rendered, because what the canvas can show is the mp4, not the
// composition. `?url` rather than `?raw`: a 2MB video is served, never inlined.
const rawVideos = import.meta.glob("../../motion/src/*/*/out/*.mp4", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

// The composition's own box, which is also the aspect the preview has to hold. It is a JSON
// sidecar rather than a field in index.tsx precisely so this file can read it: the canvas is a
// Vite app and the compositions are rspack-bundled TSX, and JSON is the one thing both parse.
const rawMeta = import.meta.glob("../../motion/src/*/*/meta.json", {
  eager: true,
  import: "default",
}) as Record<string, MotionMeta>;

export interface MotionMeta {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
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

const VIDEO_PATTERN = /motion\/src\/([^/]+)\/([^/]+)\/out\/[^/]+\.mp4$/;
const META_PATTERN = /motion\/src\/[^/]+\/([^/]+)\/meta\.json$/;

/** Seconds, for the caption: what a reader wants from a video is its length. */
export function durationSeconds(meta: MotionMeta) {
  return meta.durationInFrames / meta.fps;
}

/**
 * Every rendered asset, films first (a finished cut is the thing to look at), then templates,
 * alphabetically within each. An asset whose meta.json is missing is skipped rather than
 * guessed at: without the box there is no aspect to preview it at.
 */
export function readMotionLibrary(): MotionLibraryFile[] {
  const metaBySlug = new Map<string, MotionMeta>();
  for (const [path, meta] of Object.entries(rawMeta)) {
    const slug = META_PATTERN.exec(path)?.[1];
    if (slug) metaBySlug.set(slug, meta);
  }

  const files: MotionLibraryFile[] = [];
  for (const [path, src] of Object.entries(rawVideos)) {
    const match = VIDEO_PATTERN.exec(path);
    if (!match) continue;
    const [, bucket, slug] = match;
    const meta = metaBySlug.get(slug);
    if (!meta) continue;
    files.push({ bucket, slug, title: humanize(slug), src, meta });
  }

  const bucketOrder = (bucket: string) => (bucket === "films" ? 0 : 1);
  return files.sort(
    (a, b) =>
      bucketOrder(a.bucket) - bucketOrder(b.bucket) ||
      a.slug.localeCompare(b.slug, undefined, { numeric: true }),
  );
}
