import {
  useLayoutEffect,
  useRef,
  useState,
  type MouseEventHandler,
} from "react";
import { canvasIndex } from "./canvasIndex";
import { canvasIconUrl, humanize } from "./canvasLibrary";
import { fitCover, projectCover, type Cover } from "./cover";
import {
  isExample,
  openInTab,
  tabOfExample,
  tabOfProject,
  tabUrl,
  type Project,
  type ProjectCanvas as Canvas,
  type ProjectTab,
} from "./canvasTabs";
import { canvasPageUrl } from "./canvasUrl";
import {
  askServer,
  openMenu,
  REVEAL,
  setProjectCover,
  TRASH,
  TRASH_PLACE,
} from "./contextMenu";
import { FolderPlus, LogoDiscord, LogoGithub, Plus } from "./geistIcons";

type Sort = "edited" | "name" | "boards";
/** A card's right-click: the address it links to, the tab it opens, and its project if it is one. */
type Target = { href: string; tab: ProjectTab; project?: Project };

/** The stage's height (home.css), which a cover fills. */
const STAGE_H = 233;

/** What a card calls a canvas: its layout's name without the "(example)" shelf, as tabs do. */
const nameOf = (c: Canvas) =>
  (c.layout?.name ?? humanize(c.slug)).replace(/^\(example\)\s*/, "");

const boardsIn = (canvases: Canvas[]) =>
  canvases.reduce((n, c) => n + c.html.length, 0);
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 864e5],
  ["month", 30 * 864e5],
  ["week", 7 * 864e5],
  ["day", 864e5],
  ["hour", 36e5],
  ["minute", 6e4],
];

/** "3 hours ago", the way Figma writes a file's last edit. */
function ago(ms: number) {
  const diff = ms - Date.now();
  for (const [unit, size] of STEPS)
    if (Math.abs(diff) >= size)
      return relative.format(Math.round(diff / size), unit);
  return "just now";
}

/**
 * A file card as Figma draws one: its cover on a grey stage. A link to its tab's address, which a
 * plain click opens as the tab instead.
 *
 * The cover is a picture of the board, `/__sp/shoot`'s, which the server draws once per edit, so
 * a page of forty cards is forty images rather than forty documents. Where there is nothing to
 * draw it, a build with no server or a machine without refkit, it is the board itself in a frame,
 * sandboxed because a thumbnail has nothing to run.
 */
function Card(props: {
  href: string;
  onClick: MouseEventHandler<HTMLAnchorElement>;
  onContextMenu: MouseEventHandler<HTMLAnchorElement>;
  cover?: Cover;
  /** The address its files are under: the project's, or this page's for an example. */
  base: string;
  /** When it was last edited, so a board written since is shot again. */
  updated: number;
  icon?: string;
  name: string;
  sub: string;
  count: string;
}) {
  const { cover, base } = props;
  const stage = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(0);
  const [live, setLive] = useState(!canvasIndex().served);
  // The grid's columns stretch, so the stage's width is the card's and only known once laid out.
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setStageW(entry.contentRect.width),
    );
    observer.observe(stage.current!);
    return () => observer.disconnect();
  }, []);
  // The cover fills the stage: an element chosen as cover centred in it, a whole board from its
  // top, the way a page is read. Clamped so the board is under every pixel of the stage.
  const fit = cover && stageW > 0 && fitCover(cover.box, stageW, STAGE_H);
  const [x, y, w, h] = cover?.box ?? [];
  const whole = cover && x === 0 && y === 0 && w === cover.w && h === cover.h;
  const place = fit && {
    left: Math.min(0, Math.max(fit.left, stageW - cover.w * fit.scale)),
    top: !whole
      ? Math.min(0, Math.max(fit.top, STAGE_H - cover.h * fit.scale))
      : 0,
  };
  const file = cover && `${base}board/${encodeURI(cover.path)}`;
  const board = cover?.path.endsWith(".html");
  return (
    <a
      className="home-file"
      href={props.href}
      onClick={props.onClick}
      onContextMenu={props.onContextMenu}
    >
      <div className="home-file__thumb" ref={stage}>
        {cover &&
          fit &&
          place &&
          (board && live ? (
            <iframe
              src={file}
              title={props.name}
              loading="lazy"
              sandbox=""
              tabIndex={-1}
              aria-hidden
              style={{
                ...place,
                width: cover.w,
                height: cover.h,
                transform: `scale(${fit.scale})`,
              }}
            />
          ) : (
            <img
              src={
                board
                  ? `${base}__sp/shoot?path=${encodeURIComponent(cover.path)}` +
                    `&w=${cover.w}&h=${cover.h}&v=${props.updated}`
                  : file
              }
              alt=""
              loading="lazy"
              onError={board ? () => setLive(true) : undefined}
              style={{
                ...place,
                width: cover.w * fit.scale,
                height: cover.h * fit.scale,
              }}
            />
          ))}
      </div>
      <div className="home-file__foot">
        {props.icon && <img src={props.icon} alt="" />}
        <div>
          <b>{props.name}</b>
          <small>{props.sub}</small>
        </div>
        <small>{props.count}</small>
      </div>
    </a>
  );
}

/**
 * What the window shows under Home (AppShell.tsx), and what the desktop app opens on after the
 * first launch: every project as a card, and the examples as projects of one canvas each. Drawn
 * after Figma's home: a row of tiles for a new project and the two community links, a line of
 * totals, then the cards. The bar above it and the agent's panel beside it are the window's.
 *
 * A project's card shows its one cover: the one chosen from the canvas's right button, else its
 * first canvas's (cover.ts). It opens the project as a tab, where the canvas strip lists the rest.
 */
export function HomePage(props: {
  projects: Project[];
  tabs: ProjectTab[];
  goTo: (tab: ProjectTab) => void;
  /** The server's, which a hosted build has none of. */
  newProject?: () => void;
  /** Lists the projects again, after one is deleted or its cover reset. */
  reload: () => void;
}) {
  const { projects, tabs } = props;
  const [sort, setSort] = useState<Sort>("edited");
  const [target, setTarget] = useState<Target>();
  const menu = useRef<HTMLDivElement>(null);
  const byEdit = <T extends { updated: number }>(list: T[]) =>
    list.toSorted((a, b) => b.updated - a.updated);
  const shown =
    sort === "name"
      ? projects.toSorted((a, b) => a.name.localeCompare(b.name))
      : sort === "boards"
        ? projects.toSorted(
            (a, b) => boardsIn(b.canvases) - boardsIn(a.canvases),
          )
        : byEdit(projects);
  // The app's examples, which every project's server has, Start here first. Its card opens it
  // on a tab of its own (canvasTabs.ts), not on the project this window is on.
  const examples = canvasIndex().boards.filter((b) => isExample(b.slug));
  const canvases = projects.flatMap((p) => p.canvases);
  const updated = Math.max(0, ...projects.map((p) => p.updated));

  const showMenu =
    (at: Target): MouseEventHandler =>
    (event) =>
      openMenu(event, menu, () => setTarget(at));

  return (
    <main className="home-main">
      <div className="home-tiles">
        {props.newProject && (
          <button
            className="home-tile"
            type="button"
            onClick={props.newProject}
          >
            <i>
              <FolderPlus />
            </i>
            <span>New project</span>
            <small>A folder of canvases for your next app</small>
          </button>
        )}
        <a
          className="home-tile"
          href="https://discord.gg/2DEZFFKx7k"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i>
            <LogoDiscord />
          </i>
          <span>Join Discord</span>
          <small>Ask questions, share canvases, see what ships next</small>
        </a>
        <a
          className="home-tile"
          href="https://github.com/ReScienceLab/super-prototyping"
          target="_blank"
          rel="noopener noreferrer"
        >
          <i>
            <LogoGithub />
          </i>
          <span>Star on GitHub</span>
          <small>Follow releases and help others find super-prototyping</small>
        </a>
      </div>
      {/* Nothing to total before there is a project, and no last edit to date. */}
      {projects.length > 0 && (
        <p className="home-line">
          <b>{projects.length}</b>{" "}
          {projects.length === 1 ? "project" : "projects"} ·{" "}
          <b>{canvases.length}</b>{" "}
          {canvases.length === 1 ? "canvas" : "canvases"} ·{" "}
          <b>{boardsIn(canvases)}</b> boards · last edited {ago(updated)}
        </p>
      )}
      <div className="home-bar">
        <h2>Projects</h2>
        {/* Nothing to sort before there are two. */}
        {projects.length > 1 && (
          <div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
            >
              <option value="edited">Last edited</option>
              <option value="name">Alphabetical</option>
              <option value="boards">Most boards</option>
            </select>
          </div>
        )}
      </div>
      <div className="home-grid">
        {shown.map((p) => {
          const recent = byEdit(p.canvases);
          const iconed = recent.find((c) => c.icon);
          const one = recent.length === 1 ? recent[0] : undefined;
          // The tab it has on the bar, where it was left, or a new one on its latest canvas.
          const tab = tabOfProject(p, tabs);
          return (
            <Card
              key={p.name}
              href={tabUrl(tab)}
              onClick={openInTab(props.goTo, tab)}
              // Its bare address, which opens its first canvas (resolveTab).
              onContextMenu={showMenu({ href: p.url, tab, project: p })}
              cover={p.cover}
              base={p.url}
              updated={p.updated}
              icon={
                iconed && `${p.url}board/${encodeURI(iconed.slug)}/icon.png`
              }
              name={p.name}
              sub={`Edited ${ago(p.updated)}`}
              count={
                one
                  ? plural(one.html.length, "board")
                  : `${recent.length} ${recent.length === 1 ? "canvas" : "canvases"}`
              }
            />
          );
        })}
        {/* Before the first project, its outline where it will be, which makes it. */}
        {projects.length === 0 && props.newProject && (
          <button
            className="home-file home-file--new"
            type="button"
            onClick={props.newProject}
          >
            <i>
              <Plus />
            </i>
            <span>New project</span>
            <small>Your projects will show up here</small>
          </button>
        )}
      </div>
      {examples.length > 0 && (
        <>
          <div className="home-bar">
            <h2>Examples</h2>
          </div>
          <div className="home-grid">
            {examples.map((c) => (
              <Card
                key={c.slug}
                href={canvasPageUrl(c.slug)}
                onClick={openInTab(props.goTo, tabOfExample(c.slug, tabs))}
                onContextMenu={showMenu({
                  href: canvasPageUrl(c.slug),
                  tab: tabOfExample(c.slug, tabs),
                })}
                cover={projectCover([c])}
                base={import.meta.env.BASE_URL}
                updated={c.updated}
                icon={c.icon ? canvasIconUrl(c.slug) : undefined}
                name={nameOf(c)}
                sub="Example"
                count={plural(c.html.length, "board")}
              />
            ))}
          </div>
        </>
      )}
      {/* One menu for every card, a native popover like the chat panel's: the top layer, and a
          click outside or Esc to shut it. A pick shuts it before the row's own click runs, so the
          Trash's confirm is not drawn over it. An example is the plugin's, so it has no folder of
          the user's to show or delete. */}
      <div
        ref={menu}
        popover="auto"
        className="sp-context-menu"
        role="menu"
        onClickCapture={(event) => event.currentTarget.hidePopover()}
      >
        {target && (
          <>
            <button
              type="button"
              role="menuitem"
              className="sp-menu-row"
              onClick={() => props.goTo(target.tab)}
            >
              Open
            </button>
            <hr />
            <button
              type="button"
              role="menuitem"
              className="sp-menu-row"
              onClick={() =>
                navigator.clipboard.writeText(
                  new URL(target.href, location.href).href,
                )
              }
            >
              Copy link
            </button>
            {target.project && (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className="sp-menu-row"
                  onClick={() => askServer("reveal", target.project!.name)}
                >
                  {REVEAL}
                </button>
                {/* Back to the first canvas's, once one was chosen from the canvas. */}
                {target.project.cover?.chosen && (
                  <button
                    type="button"
                    role="menuitem"
                    className="sp-menu-row"
                    onClick={async () => {
                      if (await setProjectCover(target.project!.url, null))
                        props.reload();
                    }}
                  >
                    Reset cover
                  </button>
                )}
                <hr />
                <button
                  type="button"
                  role="menuitem"
                  className="sp-menu-row sp-context-menu__danger"
                  onClick={async () => {
                    const p = target.project!;
                    if (
                      !confirm(
                        `Move “${p.name}” to ${TRASH_PLACE}?\n\n${p.path}\n\n` +
                          "Everything in that folder goes with it.",
                      )
                    )
                      return;
                    await askServer("delete", p.name);
                    props.reload();
                  }}
                >
                  {TRASH}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
