import { useState, type MouseEventHandler } from "react";
import { canvasIndex } from "./canvasIndex";
import {
  CANVAS_FILE_DEFAULT_SIZE,
  DEFAULT_COVER_BOX,
  boardFileUrl,
  canvasIconUrl,
  fitCover,
  humanize,
} from "./canvasLibrary";
import {
  openInTab,
  tabOfExample,
  tabOfProject,
  tabUrl,
  type Project,
  type ProjectCanvas as Canvas,
  type ProjectTab,
} from "./canvasTabs";
import { canvasPageUrl } from "./canvasUrl";
import { FolderPlus, LogoDiscord, LogoGithub } from "./geistIcons";
import { FOUNDATIONS_ROW } from "./sheetLayout";

type Sort = "edited" | "name" | "boards";
type Screen = ReturnType<typeof screensOf>[number];

const THUMB = { w: 72, h: 156 };

/** What a card calls a canvas: its layout's name without the "(example)" shelf, as tabs do. */
const nameOf = (c: Canvas) => (c.layout?.name ?? humanize(c.slug)).replace(/^\(example\)\s*/, "");

/**
 * A canvas's screens for a card, the cover first and the rest in the order the sheet reads them
 * (sheetLayout.ts): the layout's rows, Foundations left out, then whatever no row placed. Read off
 * the index entry rather than the library, because another project's canvases are not in this
 * page's index. A board at the default artboard size is a phone, cropped to the folder's cover box
 * the way the welcome cards crop it; one that declared its own size shows whole.
 */
function screensOf(c: Canvas, url: (file: string) => string) {
  const names = c.html.map((f) => f.replace(/\.html$/, ""));
  const placed = new Set<string>();
  const sizes = new Map<string, { w: number; h: number }>();
  const order: string[] = [];
  for (const row of c.layout?.rows ?? []) {
    for (const entry of row.files ?? []) {
      const declared = typeof entry === "string" ? { file: entry } : entry;
      if (!names.includes(declared.file) || placed.has(declared.file)) continue;
      placed.add(declared.file);
      if (declared.w && declared.h) sizes.set(declared.file, { w: declared.w, h: declared.h });
      if (row.title !== FOUNDATIONS_ROW) order.push(declared.file);
    }
  }
  order.push(...names.filter((n) => !placed.has(n)));
  const cover =
    names.find((n) => n === c.layout?.cover) ?? names.find((n) => !n.startsWith("00")) ?? names[0];
  return [cover, ...order.filter((n) => n !== cover)].map((name) => {
    const { w, h } = sizes.get(name) ?? CANVAS_FILE_DEFAULT_SIZE;
    const phone = w === CANVAS_FILE_DEFAULT_SIZE.w && h === CANVAS_FILE_DEFAULT_SIZE.h;
    return {
      src: url(`${name}.html`),
      caption: humanize(name),
      w,
      h,
      ...fitCover(
        phone ? (c.layout?.coverBox ?? DEFAULT_COVER_BOX) : [0, 0, w, h],
        THUMB.w,
        THUMB.h,
      ),
    };
  });
}

/** A file in one of a project's canvases, under that project's own address. */
const fileUrl = (p: Project, slug: string) => (file: string) =>
  `${p.url}board/${encodeURI(slug)}/${encodeURI(file)}`;

const boardsIn = (canvases: Canvas[]) => canvases.reduce((n, c) => n + c.html.length, 0);
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
    if (Math.abs(diff) >= size) return relative.format(Math.round(diff / size), unit);
  return "just now";
}

/**
 * A file card as Figma draws one: its first screens side by side on a grey stage. A link to its
 * tab's address, which a plain click opens as the tab instead.
 */
function Card(props: {
  href: string;
  onClick: MouseEventHandler<HTMLAnchorElement>;
  screens: Screen[];
  icon?: string;
  name: string;
  sub: string;
  count: string;
}) {
  return (
    <a className="home-file" href={props.href} onClick={props.onClick}>
      <div className="home-file__thumb">
        {/* A frame per screen, lazy so a page of forty cards fetches only the ones scrolled to,
            and sandboxed because a thumbnail has nothing to run. */}
        {props.screens.slice(0, 4).map((s) => (
          <div key={s.src} style={{ width: THUMB.w, height: THUMB.h }}>
            <iframe
              src={s.src}
              title={s.caption}
              loading="lazy"
              sandbox=""
              tabIndex={-1}
              aria-hidden
              style={{
                left: s.left,
                top: s.top,
                width: s.w,
                height: s.h,
                transform: `scale(${s.scale})`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="home-file__foot">
        {props.icon ? <img src={props.icon} alt="" /> : <span />}
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
 * Most projects are one canvas worked on for as long as the project lasts, so that card shows the
 * canvas's own screens. A project of several, iterations or styles explored side by side, shows
 * each one's cover. Either opens the project as a tab, where the canvas strip lists the rest.
 */
export function HomePage(props: {
  projects: Project[];
  tabs: ProjectTab[];
  goTo: (tab: ProjectTab) => void;
  /** The app's, which can make a project and open a folder; a browser has its one project. */
  newProject?: () => void;
  openFolder?: () => void;
}) {
  const { projects, tabs } = props;
  const [sort, setSort] = useState<Sort>("edited");
  const byEdit = <T extends { updated: number }>(list: T[]) =>
    list.toSorted((a, b) => b.updated - a.updated);
  const shown =
    sort === "name"
      ? projects.toSorted((a, b) => a.name.localeCompare(b.name))
      : sort === "boards"
        ? projects.toSorted((a, b) => boardsIn(b.canvases) - boardsIn(a.canvases))
        : byEdit(projects);
  // The app's examples, which every project's server has. A build has no projects, and every
  // canvas in it is one of this repo's examples.
  const examples = canvasIndex().boards.filter((b) => b.example || !canvasIndex().served);
  const canvases = projects.flatMap((p) => p.canvases);
  const updated = Math.max(0, ...projects.map((p) => p.updated));

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
          <b>{projects.length}</b> {projects.length === 1 ? "project" : "projects"} ·{" "}
          <b>{canvases.length}</b> {canvases.length === 1 ? "canvas" : "canvases"} ·{" "}
          <b>{boardsIn(canvases)}</b> boards · last edited {ago(updated)}
        </p>
      )}
      {projects.length > 0 && (
        <div className="home-bar">
          <h2>Projects</h2>
          <div>
            {props.openFolder && (
              <button type="button" onClick={props.openFolder}>
                Open folder…
              </button>
            )}
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="edited">Last edited</option>
              <option value="name">Alphabetical</option>
              <option value="boards">Most boards</option>
            </select>
          </div>
        </div>
      )}
      <div className="home-grid">
        {shown.map((p) => {
          const recent = byEdit(p.canvases);
          const iconed = recent.find((c) => c.icon);
          // One canvas is the canvas, and its screens; several are each one's cover.
          const one = recent.length === 1 ? recent[0] : undefined;
          // The tab it has on the bar, where it was left, or a new one on its latest canvas.
          const tab = tabOfProject(p, tabs);
          return (
            <Card
              key={p.name}
              href={tabUrl(tab)}
              onClick={openInTab(props.goTo, tab)}
              screens={
                one
                  ? screensOf(one, fileUrl(p, one.slug))
                  : recent.map((c) => screensOf(c, fileUrl(p, c.slug))[0])
              }
              icon={iconed && fileUrl(p, iconed.slug)("icon.png")}
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
                screens={screensOf(c, (file) => boardFileUrl(c.slug, file))}
                icon={canvasIconUrl(c.slug)}
                name={nameOf(c)}
                sub="Example"
                count={plural(c.html.length, "board")}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
