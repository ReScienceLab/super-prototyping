import {
  brandMaterialSlugs,
  canvasIconUrl,
  canvasImageThumbUrl,
  canvasImageUrl,
  readCanvasLayout,
  shortName,
} from "./canvasLibrary";
import { brandPageUrl, type CanvasTab } from "./canvasUrl";
import { openInTab } from "./canvasTabs";

/** How many pictures a card shows. Four fits one row at every width the grid goes down to. */
const PREVIEW = 4;

/**
 * What one product's card shows: one picture from each of its first four surfaces, rather than
 * its first four pictures. The rows are surfaces in a fixed order, so that is the logo, then
 * the art direction, then the identity applied to something, then the first social profile —
 * four different answers to "what does this brand look like" instead of four crops of one logo.
 *
 * The middle of each row rather than the head of it. A row leads with its most formal asset,
 * which for the logo row is the mark that is already the icon beside it, and for a product whose
 * material came out of a brand deck is a section opener — four of those in a row and every card
 * is the same slide. The middle of a row is the surface's ordinary content, which is the thing
 * worth previewing.
 */
function preview(slug: string) {
  const rows = (readCanvasLayout(slug)?.rows ?? []).filter(
    (row) => row.images?.length,
  );
  const images = rows.flatMap((row) => {
    const image = row.images![Math.floor(row.images!.length / 2)];
    const src =
      canvasImageThumbUrl(slug, image.file) ?? canvasImageUrl(slug, image.file);
    return src ? [{ ...image, src }] : [];
  });
  return {
    images: images.slice(0, PREVIEW),
    surfaces: rows.length,
    assets: rows.reduce((n, row) => n + row.images!.length, 0),
  };
}

/**
 * Every product's brand material, one card each. The page behind a bare `brand.html`, and behind
 * a `?canvas=` naming a page that collected none.
 *
 * A kit is one product, and landing straight in one answers a question nobody asked yet: the
 * thing worth seeing first is that thirteen products were collected the same way, so they can be
 * read against each other. So the card is a preview and not a link — the pictures are the label.
 *
 * `open` is the same switch it is on BrandKit. Given it, this is a tab of the canvas app and the
 * cards open tabs rather than navigating away from it.
 */
export function BrandKitIndex({ open }: { open?: (tab: CanvasTab) => void }) {
  const pages = brandMaterialSlugs().map((slug) => ({
    slug,
    ...preview(slug),
  }));
  const assets = pages.reduce((n, page) => n + page.assets, 0);

  return (
    <main>
      {!open && (
        <div className="topbar">
          {/* The canvas at its bare address, on the project's own view (canvasTabs.ts). */}
          <a className="chip home" href={import.meta.env.BASE_URL}>
            <img src={`${import.meta.env.BASE_URL}favicon-32.png`} alt="" />
            <span>Super Prototyping</span>
          </a>
        </div>
      )}
      <header className="head">
        <div>
          <h1>Brand kits</h1>
          <p>
            What each product publishes of itself — logos, type, social
            profiles, store listings, advertising — collected per product and
            laid out the same way, so one can be read against another.
          </p>
        </div>
        <dl className="meta">
          <div>
            <dt>Products</dt>
            <dd>{pages.length}</dd>
          </div>
          <div>
            <dt>Assets</dt>
            <dd>{assets}</dd>
          </div>
        </dl>
      </header>
      <section className="band index">
        {pages.map((page) => (
          <a
            className="product"
            key={page.slug}
            href={brandPageUrl(page.slug)}
            onClick={
              open && openInTab(open, { kind: "brand", slug: page.slug })
            }
          >
            <div className="product__head">
              <img
                className="product__icon"
                src={canvasIconUrl(page.slug)}
                alt=""
              />
              <div>
                <h2>{shortName(page.slug)}</h2>
                <p>
                  {page.assets} assets · {page.surfaces} surfaces
                </p>
              </div>
            </div>
            <div className="product__strip">
              {page.images.map((image) => (
                <div className="card" key={image.file}>
                  <img src={image.src} alt={image.label} loading="lazy" />
                </div>
              ))}
            </div>
          </a>
        ))}
      </section>
    </main>
  );
}
