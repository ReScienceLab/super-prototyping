import {
  BRAND_THUMB_EDGE,
  brandMaterialSlugs,
  canvasIconUrl,
  canvasImageThumbUrl,
  canvasImageUrl,
  readCanvasLayout,
  shortName,
} from "./canvasLibrary";
import { brandPageUrl, canvasPageUrl, sheetPageUrl } from "./canvasUrl";

/**
 * How many columns a row gets, and the shape of its cards, from the pictures actually in it.
 *
 * Both come off the row's median aspect rather than its mean or its extremes: a row is usually
 * one kind of asset with an outlier or two — six store screenshots and the app icon — and the
 * median is the shape of the kind, which is what the row should be built for. The outlier is
 * then contained inside a card built for its neighbours, which is the correct outcome: it reads
 * as the odd one, because it is.
 */
function rowShape(images: { w: number; h: number }[]) {
  const aspects = images.map((i) => i.w / i.h).sort((a, b) => a - b);
  const median = aspects[Math.floor(aspects.length / 2)];
  const cols = median >= 2.5 ? 2 : median >= 1.2 ? 3 : 4;
  // Clamped so one very wide banner or one very tall screenshot cannot make a card that is a
  // sliver on the page; past the clamp the picture letterboxes inside the card instead.
  return { cols, box: Math.min(Math.max(median, 0.62), 3.2) };
}

/**
 * The width a card's picture is actually drawn at, mirroring brand.css: the band's 28px of side
 * padding, the 20px grid gaps, and the two breakpoints where a row gives up columns. Told nothing, a browser assumes an image fills the window and fetches the
 * original for every card, which is the entire saving gone.
 */
function cardSizes(cols: number) {
  const at = (n: number) =>
    `calc((100vw - 56px - ${(n - 1) * 20}px) / ${n})`;
  const [two, three] = [at(Math.min(cols, 2)), at(Math.min(cols, 3))];
  return `(max-width: 720px) ${two}, (max-width: 1100px) ${three}, ${at(cols)}`;
}

/**
 * The domain a source names, and a link to it when there is one to give. Seven of these are
 * prose rather than a URL — "openai.com/brand (Logo section) via Wayback Machine snapshot
 * 20260907013431" — because for those the route to the asset was the finding. The domain is the
 * first token either way; only the ones a browser can open become links.
 */
function sourceLabel(source: string | undefined) {
  if (!source) return undefined;
  try {
    return { host: new URL(source).host.replace(/^www\./, ""), href: source };
  } catch {
    return { host: source.split(/[\s/]/)[0], href: undefined };
  }
}

/**
 * One canvas page's brand material as a web page. The page behind `brand.html?canvas=<slug>`.
 *
 * Same rows, captions and order as the canvas draws: layout.json's `images` rows are the one
 * source and this is the second thing rendered from them. The rows are surfaces — the constants
 * first, then one row per place the brand appears — so a column down the page is the same kind
 * of asset on every surface, and an avatar that disagrees with the other avatars shows up as a
 * break in the column rather than as something to go looking for.
 */
export function BrandKit({ slug }: { slug: string }) {
  const rows = (readCanvasLayout(slug)?.rows ?? []).flatMap((row) => {
    const images = (row.images ?? []).flatMap((image) => {
      const src = canvasImageUrl(slug, image.file);
      const thumb = canvasImageThumbUrl(slug, image.file);
      return src && image.w && image.h ? [{ ...image, src, thumb }] : [];
    });
    return images.length
      ? [{ title: row.title, images, ...rowShape(images) }]
      : [];
  });
  const count = rows.reduce((n, row) => n + row.images.length, 0);
  const sources = new Set(
    rows.flatMap((row) =>
      row.images.flatMap((i) => sourceLabel(i.source)?.host ?? []),
    ),
  );

  // The app icon carries this: a dozen product names in a row is a list to read, and a dozen
  // app icons is a shelf to recognise. The name is the icon's alt text and the link's tooltip
  // rather than a label beside it -- a couple of these icons are a black glyph on white, and
  // the row has outgrown the window since, so the names were costing the last two chips.
  const pages = brandMaterialSlugs();

  return (
    <main>
      {pages.length > 1 && (
        <nav className="switch" aria-label="Brand kit for the other examples">
          {pages.map((page) => (
            <a
              key={page}
              className="chip"
              href={brandPageUrl(page)}
              title={shortName(page)}
              aria-current={page === slug ? "page" : undefined}
            >
              <img src={canvasIconUrl(page)} alt={shortName(page)} />
            </a>
          ))}
        </nav>
      )}
      <header className="head">
        <div>
          <h1>{shortName(slug)}</h1>
          <p>
            <a href={canvasPageUrl(slug)}>Back to the canvas</a> ·{" "}
            <a href={sheetPageUrl(slug)}>Boards at full size</a>
          </p>
        </div>
        <dl className="meta">
          <div>
            <dt>Assets</dt>
            <dd>{count}</dd>
          </div>
          <div>
            <dt>Surfaces</dt>
            <dd>{rows.length}</dd>
          </div>
          <div>
            <dt>Sources</dt>
            <dd>{sources.size}</dd>
          </div>
        </dl>
      </header>
      {rows.map((row) => (
        <section
          className="band"
          key={row.title}
          style={
            { "--cols": row.cols, "--box": row.box } as React.CSSProperties
          }
        >
          <h2>{row.title}</h2>
          <p className="count">
            {row.images.length} asset{row.images.length === 1 ? "" : "s"}
          </p>
          <div className="grid">
            {row.images.map((image) => {
              const source = sourceLabel(image.source);
              // A variant exists only where it is genuinely smaller than the original, so its
              // width is the long edge scaled down — and the original is always in the set
              // above it, for the screen wide or dense enough to have a use for it.
              const thumbWidth = Math.round(
                (image.w * BRAND_THUMB_EDGE) / Math.max(image.w, image.h),
              );
              return (
                <figure key={image.file}>
                  <div className="card">
                    <img
                      src={image.src}
                      srcSet={
                        image.thumb
                          ? `${image.thumb} ${thumbWidth}w, ${image.src} ${image.w}w`
                          : undefined
                      }
                      sizes={image.thumb ? cardSizes(row.cols) : undefined}
                      alt={image.label}
                      loading="lazy"
                    />
                  </div>
                  <figcaption>
                    {image.label}
                    {/* What this repo is for: a picture states where it came from, and an asset
                      curated by an archive never passes as one published by the company. */}
                    <div className="prov">
                      {image.provenance === "theirs" ? "Theirs" : "Via archive"}
                      {source ? " · " : null}
                      {source?.href ? (
                        <a
                          href={source.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {source.host}
                        </a>
                      ) : (
                        source?.host
                      )}
                    </div>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
