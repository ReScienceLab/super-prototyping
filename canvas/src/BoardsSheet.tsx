import { FigmaMark } from "./FigmaMark";
import { pageNameFor } from "./canvasLibrary";
import { sheetRows } from "./sheetLayout";
import { canvasPageUrl } from "./canvasUrl";

/** The extension that reads a page, and the Figma plugin that the extension can hand off to. */
const H2D_EXTENSION =
  "https://chromewebstore.google.com/detail/htmltodesign/ldnheaepmnmbjjjahokphckbpgciiaed";
const H2D_PLUGIN = "https://www.figma.com/community/plugin/1159123024924461424/html-to-design";

/**
 * One canvas page's boards, each at its own size, in one scrolling document. The page behind
 * `sheet.html?canvas=<slug>`, which the canvas's top bar links to.
 *
 * Each board is an iframe pointed at that board's own address rather than inlined, because a
 * board is a whole document — its own doctype, its own reset, its own fonts — and forty of them
 * flattened into one would be forty stylesheets fighting. The frames are same-origin, so a board
 * behaves here exactly as it does in a tab of its own.
 */
export function BoardsSheet({ slug }: { slug: string }) {
  const rows = sheetRows(slug);
  const count = rows.reduce((n, row) => n + row.boards.length, 0);

  return (
    <main>
      <h1>{pageNameFor(slug)}</h1>
      <p className="sub">
        {count} board{count === 1 ? "" : "s"} at full size ·{" "}
        <a href={canvasPageUrl(slug)}>back to the canvas</a>
      </p>
      {/* The canvas's Figma button lands here, so this page has to answer the question that
          button raises: what do I install, and what do I press. It is an ordinary page at an
          ordinary address, which is what makes any of it possible — the importers refuse a
          generated one. */}
      <section className="howto">
        <h2>
          <FigmaMark height={17} />
          Into Figma, in three steps
        </h2>
        <div className="howto__body">
          <ol>
            <li>
              <b>Install the browser extension.</b> The extension rather than the Figma plugin
              alone, because the plugin fetches a public address from Figma's servers and a
              canvas on localhost is not one — the extension reads the page from inside the
              browser that already has it open.
              {/* The one thing on this page that has to be done before anything else works, so
                  it is a button and not the third link in a paragraph. */}
              <a
                className="install"
                href={H2D_EXTENSION}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="21"
                  height="21"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 3v11m0 0 4-4m-4 4-4-4" />
                  <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
                </svg>
                <span>
                  Add html.to.design to your browser
                  <small>Free · Chrome, Edge, Brave, Arc and other Chromium browsers</small>
                </span>
                <span className="install__arrow" aria-hidden>
                  &#8599;
                </span>
              </a>
            </li>
            <li>
              <b>Capture this page.</b> Click the extension's icon while this tab is in front,
              leave the viewport on <i>Browser</i>, and press <i>Capture Current Page</i>. It
              reads every board below at the size it ships at, rather than the zoomed-out
              thumbnail the canvas shows.
            </li>
            <li>
              <b>Paste it into Figma.</b> Pick <i>Copy to clipboard</i> and press ⌘V in a Figma
              file; that route needs no plugin at all. The plugin is for the other two routes —
              sending the capture straight over, or opening a saved <code>.h2d</code> file.
              Either way the boards arrive as editable layers, not as images.
              <a
                className="install install--plugin"
                href={H2D_PLUGIN}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FigmaMark height={19} />
                <span>
                  Get the Figma plugin
                  <small>Optional · html.to.design by ‹div›RIOTS</small>
                </span>
                <span className="install__arrow" aria-hidden>
                  &#8599;
                </span>
              </a>
            </li>
          </ol>
          {/* Step 2 is the one step nobody can do from a description alone: it happens in a
              popup this page cannot draw. A picture of it is shorter than the sentence that
              would have to describe where the button is. */}
          <figure className="howto__shot">
            <img
              src={`${import.meta.env.BASE_URL}html-to-design.webp`}
              width={355}
              height={395}
              alt="The html.to.design extension's popup open over this page, with viewport and theme options above a blue Capture Current Page button"
            />
            <figcaption>The extension, open on this page.</figcaption>
          </figure>
        </div>
      </section>
      {rows.map((row) => (
        <section key={row.title || "rest"}>
          {row.title ? <h2>{row.title}</h2> : null}
          <div className="row">
            {row.boards.map((board) => (
              <figure key={board.src}>
                <iframe
                  src={board.src}
                  width={board.w}
                  height={board.h}
                  title={board.caption}
                  // Every board on the page at once is 35 MB of the repo's own boards; the ones
                  // below the fold arrive as they are scrolled to.
                  loading="lazy"
                />
                <figcaption>{board.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
