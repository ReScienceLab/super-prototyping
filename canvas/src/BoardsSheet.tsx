import { pageNameFor } from "./canvasLibrary";
import { sheetRows } from "./sheetLayout";
import { canvasPageUrl } from "./canvasUrl";

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
