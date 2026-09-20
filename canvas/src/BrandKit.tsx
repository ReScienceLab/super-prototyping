import {
  BRAND_THUMB_EDGE,
  brandMaterialSlugs,
  canvasIconUrl,
  canvasImageThumbUrl,
  canvasImageUrl,
  readCanvasLayout,
  shortName,
} from "./canvasLibrary";
import { brandPageUrl, canvasPageUrl } from "./canvasUrl";
import { CanvasCta } from "./canvasCta";

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
  const at = (n: number) => `calc((100vw - 56px - ${(n - 1) * 20}px) / ${n})`;
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
  // The app icon carries the other twelve: a dozen product names in a row is a list to read,
  // and a dozen app icons is a shelf to recognise. Only the one you are standing on is named,
  // and that name is the page's title -- a headline underneath would say the same word twice,
  // and the question "which product is this" is already being asked of the shelf.
  const pages = brandMaterialSlugs();

  return (
    <main>
      <div className="topbar">
        {/* Back to the canvas this kit was collected for, wearing the app's own mark rather
            than a product's: the row reads left to right as this app, these products, this
            one ask. */}
        <a className="chip home" href={canvasPageUrl(slug)}>
          <img src={`${import.meta.env.BASE_URL}favicon-32.png`} alt="" />
          <span>Super Prototyping</span>
        </a>
        <nav className="switch" aria-label="Brand kit for the other examples">
          {pages.map((page) => (
            <a
              key={page}
              className="chip"
              href={brandPageUrl(page)}
              title={shortName(page)}
              aria-current={page === slug ? "page" : undefined}
              // Named on both pages of the switch, so the filled pill travels from the chip you
              // left to the chip you landed on rather than blinking across the shelf.
              style={
                page === slug
                  ? ({
                      viewTransitionName: "current-kit",
                    } as React.CSSProperties)
                  : undefined
              }
              // The shelf is wider than a phone and the named chip is as likely to be the
              // thirteenth as the second, so on a narrow window the page's own title would open
              // off the right edge of it.
              ref={
                page === slug
                  ? (el) => {
                      el?.scrollIntoView({
                        inline: "center",
                        block: "nearest",
                      });
                    }
                  : undefined
              }
            >
              <img src={canvasIconUrl(page)} alt={shortName(page)} />
              {page === slug && <h1>{shortName(page)}</h1>}
            </a>
          ))}
        </nav>
        <CanvasCta />
      </div>
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
