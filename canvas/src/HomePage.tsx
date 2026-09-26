import {
  useLayoutEffect,
  useRef,
  useState,
  type MouseEventHandler,
  type ReactNode,
} from "react";
import { canvasIndex } from "./canvasIndex";
import { CommunityCards, type Duplicate, type OpenInApp } from "./Community";
import { fitCover, type Cover } from "./cover";
import {
  openInTab,
  tabOfProject,
  tabUrl,
  type Project,
  type ProjectCanvas as Canvas,
  type ProjectTab,
} from "./canvasTabs";
import {
  askServer,
  confirmTrash,
  MenuItem,
  MenuSeparator,
  REVEAL,
  RightClickMenu,
  setProjectCover,
  TRASH,
} from "./contextMenu";
import { FolderPlus, LogoDiscord, LogoGithub, Plus, Users } from "./geistIcons";

type Sort = "edited" | "name" | "boards";
/** A card's right-click: the address it links to, the tab it opens, and its project. */
type Target = { href: string; tab: ProjectTab; project: Project };

/** The stage's shape (home.css), which a cover fills: an Open Graph image's, as a thumbnail is drawn at. */
const STAGE_RATIO = 630 / 1200;

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
 * A cover at `scale`, placed at `place` in its stage. A board is a picture of it, `/__sp/shoot`'s,
 * which the server draws once per edit, so a page of forty cards is forty images rather than forty
 * documents. Where there is nothing to draw it, a build with no server or a machine without refkit,
 * it is the board itself in a frame, sandboxed because a thumbnail has nothing to run. An image is
 * the file itself.
 */
function CoverPicture(props: {
  cover: Cover;
  /** The address its files are under: the project's, or this page's for an example. */
  base: string;
  /** When it was last edited, so a board written since is shot again. */
  updated: number;
  title: string;
  scale: number;
  place: { left: number; top: number };
}) {
  const { cover, base, scale, place } = props;
  const [live, setLive] = useState(!canvasIndex().served);
  const file = `${base}board/${encodeURI(cover.path)}`;
  const board = cover.path.endsWith(".html");
  return board && live ? (
    <iframe
      src={file}
      title={props.title}
      loading="lazy"
      sandbox=""
      tabIndex={-1}
      aria-hidden
      style={{
        ...place,
        width: cover.w,
        height: cover.h,
        transform: `scale(${scale})`,
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
      style={{ ...place, width: cover.w * scale, height: cover.h * scale }}
    />
  );
}

/** A stage's width, which a grid's stretching columns set and only layout knows. */
// oxlint-disable-next-line react/only-export-components
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(ref.current!);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * A file card as Figma draws one: its cover on a grey stage. A link to its tab's address, which a
 * plain click opens as the tab instead.
 */
function Card(props: {
  href: string;
  onClick: MouseEventHandler<HTMLAnchorElement>;
  /** Its right-click menu's rows. */
  menu: ReactNode;
  cover?: Cover;
  /** The address its files are under: the project's, or this page's for an example. */
  base: string;
  /** When it was last edited, so a board written since is shot again. */
  updated: number;
  icon?: string;
  name: string;
  sub: string;
}) {
  const { cover } = props;
  const [stage, stageW] = useWidth();
  const stageH = stageW * STAGE_RATIO;
  // The cover fills the stage: an element chosen as cover centred in it, a whole board from its
  // top, the way a page is read. Clamped so the board is under every pixel of the stage.
  const fit = cover && stageW > 0 && fitCover(cover.box, stageW, stageH);
  const [x, y, w, h] = cover?.box ?? [];
  const whole = cover && x === 0 && y === 0 && w === cover.w && h === cover.h;
  const place = fit && {
    left: Math.min(0, Math.max(fit.left, stageW - cover.w * fit.scale)),
    top: !whole
      ? Math.min(0, Math.max(fit.top, stageH - cover.h * fit.scale))
      : 0,
  };
  return (
    <RightClickMenu menu={props.menu}>
      <a className="home-file" href={props.href} onClick={props.onClick}>
        <div className="home-file__thumb" ref={stage}>
          {cover && fit && place && (
            <CoverPicture
              cover={cover}
              base={props.base}
              updated={props.updated}
              title={props.name}
              scale={fit.scale}
              place={place}
            />
          )}
        </div>
        <div className="home-file__foot">
          {props.icon && <img src={props.icon} alt="" />}
          <div>
            <b>{props.name}</b>
            <small>{props.sub}</small>
          </div>
        </div>
      </a>
    </RightClickMenu>
  );
}

/**
 * What the window shows under Home (AppShell.tsx), and what the desktop app opens on after the
 * first launch: every project as a card, then the community's latest. Drawn after Figma's home: a
 * row of tiles for a new project and the community links, a line of totals, then the cards. The bar above it and the agent's panel beside it are the window's.
 *
 * A project's card shows its one cover: the one chosen from the canvas's right button, else its
 * first canvas's (cover.ts). It opens the project as a tab, where the canvas strip lists the rest.
 */
export function HomePage(props: {
  projects: Project[];
  tabs: ProjectTab[];
  goTo: (tab: ProjectTab) => void;
  openInApp: OpenInApp;
  /** The server's, which a hosted build has none of. */
  newProject?: () => void;
  /** The server's too: a community card's menu makes that project the user's. */
  duplicate?: Duplicate;
  /** Lists the projects again, after one is deleted or its cover reset. */
  reload: () => void;
  /** Brings the Community tab forward (Community.tsx). */
  openCommunity: () => void;
}) {
  const { projects, tabs } = props;
  const [sort, setSort] = useState<Sort>("edited");
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
  const canvases = projects.flatMap((p) => p.canvases);
  const updated = Math.max(0, ...projects.map((p) => p.updated));

  const menuFor = (target: Target) => (
    <>
      <MenuItem onSelect={() => props.goTo(target.tab)}>Open</MenuItem>
      <MenuSeparator />
      <MenuItem
        onSelect={() =>
          navigator.clipboard.writeText(
            new URL(target.href, location.href).href,
          )
        }
      >
        Copy link
      </MenuItem>
      <MenuItem onSelect={() => askServer("reveal", target.project.name)}>
        {REVEAL}
      </MenuItem>
      {/* Back to the first canvas's, once one was chosen from the canvas. */}
      {target.project.cover?.chosen && (
        <MenuItem
          onSelect={async () => {
            if (await setProjectCover(target.project.url, null)) props.reload();
          }}
        >
          Reset cover
        </MenuItem>
      )}
      <MenuSeparator />
      <MenuItem
        className="sp-context-menu__danger"
        onSelect={async () => {
          const p = target.project;
          if (
            !(await confirmTrash(
              p.name,
              p.path,
              "Everything in that folder goes with it.",
            ))
          )
            return;
          await askServer("delete", p.name);
          props.reload();
        }}
      >
        {TRASH}
      </MenuItem>
    </>
  );

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
        <button
          className="home-tile home-tile--community"
          type="button"
          onClick={props.openCommunity}
        >
          <i>
            <Users />
          </i>
          <span>Community</span>
          <small>Browse app clones people made, and open one</small>
        </button>
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
              menu={menuFor({ href: p.url, tab, project: p })}
              cover={p.cover}
              base={p.url}
              updated={p.updated}
              icon={
                iconed && `${p.url}board/${encodeURI(iconed.slug)}/icon.png`
              }
              name={p.title ?? p.name}
              sub={`${
                one
                  ? plural(one.html.length, "board")
                  : `${recent.length} ${recent.length === 1 ? "canvas" : "canvases"}`
              } · ${ago(p.updated)}`}
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
      <div className="home-bar">
        <h2>Community</h2>
        <div>
          <button type="button" onClick={props.openCommunity}>
            See all
          </button>
        </div>
      </div>
      {/* Two rows of the latest. Each opens on a tab of its own (canvasTabs.ts), not on the
          project this window is on. */}
      <CommunityCards
        limit={8}
        openInApp={props.openInApp}
        duplicate={props.duplicate}
      />
    </main>
  );
}
