import { useEffect, useRef, useState, type ComponentType } from "react";
import "./community.css";
import { canvasIndex } from "./canvasIndex";
import { canvasIconUrl, shortName } from "./canvasLibrary";
import { openInTab } from "./canvasTabs";
import { canvasPageUrl } from "./canvasUrl";
import {
  CANVAS_FILE_DEFAULT_SIZE,
  fitCover,
  projectCover,
  type Cover,
} from "./cover";
import {
  ArrowRight,
  Box,
  Cross,
  DesktopDevice,
  DeviceAlternate,
  Globe,
  GridSquare,
  Link,
  LogoGithub,
  MagnifyingGlass,
  PhoneDevice,
  Window,
} from "./geistIcons";
import { CoverPicture, useWidth } from "./HomePage";

/**
 * The community: projects people made, to browse and open. The same page is a tab in the app
 * (AppShell.tsx), where a project opens as a tab of its own, and a page of the hosted build,
 * community.html (communitySite.tsx), which the site serves at superproto.dev/community and
 * where a project opens as the demo canvas. Drawn after the `web/community` page of the Super
 * Prototyping Site project.
 *
 * It lists the projects shared to the community repo, from its index.json
 * (docs/2026-09-25-project-package.md, Phase 3), then this app's examples: the ones that clone an
 * app, which are the ones with its icon. A shared project opens on GitHub until the app can
 * import one; an example opens here.
 */

/** Where the examples are public, for a link worth sending: the app's own address is localhost. */
const DEMO = "https://superproto.dev/demo/";
/** Who made the examples. A project in the community repo names its own (project.json). */
const EXAMPLES_BY = "ReScienceLab";
const COMMUNITY = "https://github.com/ReScienceLab/super-prototyping-community";
const SHARE = `${COMMUNITY}#share-a-project`;
const TAKEDOWN = `${COMMUNITY}/issues/new?template=takedown.yml`;
/** Where the repo's files are served from, index.json among them. */
const RAW =
  "https://raw.githubusercontent.com/ReScienceLab/super-prototyping-community/main/";

type Family = "iphone" | "android" | "mac" | "windows" | "hardware" | "web";
const FAMILIES: [Family | "all", string, ComponentType][] = [
  ["all", "All", GridSquare],
  ["iphone", "iPhone", PhoneDevice],
  ["android", "Android", DeviceAlternate],
  ["mac", "Mac", DesktopDevice],
  ["windows", "Windows", Window],
  ["hardware", "Wearables & hardware", Box],
  ["web", "Web", Globe],
];
const familyName = (f: string) => FAMILIES.find(([k]) => k === f)![1];

/** Picked by hand. A slug this build does not have is left out. */
const COLLECTIONS = [
  {
    id: "ai",
    title: "AI assistants",
    desc: "Chat, ask, get things done.",
    slugs: ["claude-ios", "chatgpt-ios", "perplexity-ios", "grok-ios"],
  },
  {
    id: "social",
    title: "Social feeds",
    desc: "Scroll, post, connect.",
    slugs: ["instagram-ios", "x-ios", "tiktok-ios", "substack-ios"],
  },
  {
    id: "apple",
    title: "Apple's own",
    desc: "The apps the phone comes with.",
    slugs: [
      "apple-wallet",
      "apple-photos",
      "apple-calendar",
      "apple-settings",
      "apple-app-store",
      "apple-home-lock",
    ],
  },
  {
    id: "work",
    title: "Tools",
    desc: "Notes, launchers, events.",
    slugs: ["notion-ios", "raycast-ios", "snapaction-ios", "luma-ios"],
  },
];

interface Entry {
  /** An example's slug, or a shared project's id. */
  slug: string;
  name: string;
  boards: number;
  family: Family;
  updated: number;
  author: string;
  contributors: string[];
  icon?: string;
  /** An example's cover, drawn live, and the ground it sits on: the layout's, else the canvas's. */
  cover?: Cover;
  ground?: string;
  /** A shared project's thumbnail.png, and its folder on GitHub. */
  thumbnail?: string;
  source?: string;
}

/** index.json, as the community repo's CI writes it (.github/community.py there). */
interface Index {
  projects: {
    id: string;
    name: string;
    author: { login: string };
    contributors: { login: string }[];
    boards: number;
    device: string;
    thumbnail: string;
    icon: string | null;
    updated: string;
  }[];
}

const shared = (index: Index): Entry[] =>
  index.projects.map((p) => ({
    slug: p.id,
    name: p.name,
    boards: p.boards,
    family: FAMILIES.some(([k]) => k === p.device)
      ? (p.device as Family)
      : "web",
    updated: Date.parse(p.updated),
    author: p.author.login,
    contributors: p.contributors.map((c) => c.login),
    icon: p.icon ? RAW + p.icon : undefined,
    thumbnail: RAW + p.thumbnail,
    source: `${COMMUNITY}/tree/main/projects/${p.id}`,
  }));

function examples(): Entry[] {
  return canvasIndex()
    .boards.filter((b) => b.example && b.icon)
    .map((b) => {
      const cover = projectCover([b])!;
      return {
        slug: b.slug,
        name: shortName(b.slug),
        boards: b.html.length,
        // The phone artboard every clone draws on; anything wider is a page.
        family:
          cover.w === CANVAS_FILE_DEFAULT_SIZE.w &&
          cover.h === CANVAS_FILE_DEFAULT_SIZE.h
            ? "iphone"
            : "web",
        cover,
        updated: b.updated,
        author: EXAMPLES_BY,
        contributors: [],
        icon: canvasIconUrl(b.slug),
        ground: /^#[0-9a-f]{6}$/i.test(String(b.layout?.ground))
          ? String(b.layout!.ground)
          : "#2b2b2b",
      };
    });
}

const plural = (n: number) => `${n} board${n === 1 ? "" : "s"}`;
const avatar = (login: string) => `https://github.com/${login}.png?size=64`;

/** A project's thumbnail: a shared one's thumbnail.png, or an example's drawn the same way. */
function Thumb({ entry }: { entry: Entry }) {
  return entry.thumbnail ? (
    <div className="cm-thumb">
      <img className="cm-png" src={entry.thumbnail} alt="" loading="lazy" />
    </div>
  ) : (
    <Drawn entry={entry} />
  );
}

/**
 * An example's thumbnail, drawn as `sp pack` draws a package's thumbnail.png
 * (tools/sp_canvas.py): its cover whole, centred on the canvas's ground in a 16:10 frame.
 */
function Drawn({ entry }: { entry: Entry }) {
  const [frame, width] = useWidth();
  const cover = entry.cover!;
  const [, , w, h] = cover.box;
  const pad = width * 0.05;
  const scale = Math.min((width - 2 * pad) / w, (width * 0.625 - 2 * pad) / h);
  const fit = fitCover(cover.box, w * scale, h * scale);
  return (
    <div className="cm-thumb" ref={frame} style={{ background: entry.ground }}>
      {width > 0 && (
        <div
          className="cm-cover"
          style={{ width: w * scale, height: h * scale }}
        >
          <CoverPicture
            cover={cover}
            base={import.meta.env.BASE_URL}
            updated={entry.updated}
            title={entry.name}
            scale={fit.scale}
            place={{ left: fit.left, top: fit.top }}
          />
        </div>
      )}
    </div>
  );
}

function Card({ entry, onOpen }: { entry: Entry; onOpen: () => void }) {
  return (
    <li>
      <button type="button" className="cm-card" onClick={onOpen}>
        <div className="cm-shot">
          <Thumb entry={entry} />
        </div>
        <div className="cm-cap">
          {entry.icon && <img className="cm-appicon" src={entry.icon} alt="" />}
          <span className="cm-capname">
            <b>{entry.name}</b>
            <span className="cm-mono">{plural(entry.boards)}</span>
          </span>
          <img
            className="cm-avatar"
            src={avatar(entry.author)}
            alt=""
            title={entry.author}
          />
        </div>
      </button>
    </li>
  );
}

/**
 * @param openExample The app's: opens a project as its tab. Without it, as on the site, Open is
 * a link to the demo canvas.
 */
export function CommunityPage({
  openExample,
}: {
  openExample?: (slug: string) => void;
}) {
  const [all, setAll] = useState(examples);
  const [family, setFamily] = useState<Family | "all">("all");
  const [collection, setCollection] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Entry | null>(null);
  /** Which project's link was copied, so another one opened says Copy again. */
  const [copied, setCopied] = useState<string | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const collections = COLLECTIONS.map((c) => ({
    ...c,
    entries: c.slugs
      .map((s) => all.find((e) => e.slug === s))
      .filter((e) => e !== undefined),
  })).filter((c) => c.entries.length > 0);
  const col = collections.find((c) => c.id === collection);
  const needle = q.trim().toLowerCase();
  const shown = all.filter(
    (e) =>
      (family === "all" || e.family === family) &&
      (!col || col.slugs.includes(e.slug)) &&
      (!needle ||
        [
          e.name,
          e.author,
          familyName(e.family),
          ...collections
            .filter((c) => c.slugs.includes(e.slug))
            .map((c) => c.title),
        ].some((t) => t.toLowerCase().includes(needle))),
  );

  // "/" is search, as on the site this was drawn after, unless something is being typed into.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as Element).closest?.(
        "input, textarea, [contenteditable], dialog",
      );
      if (event.key === "/" && !typing) {
        event.preventDefault();
        search.current?.focus();
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  // Offline, or with GitHub down, the page lists the examples alone.
  useEffect(() => {
    fetch(`${RAW}index.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((index: Index) => setAll([...shared(index), ...examples()]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open && !dialog.current!.open) dialog.current!.showModal();
    if (!open && dialog.current!.open) dialog.current!.close();
  }, [open]);

  const pickCollection = (id: string) => {
    const same = collection === id;
    setCollection(same ? null : id);
    setFamily("all");
    setOpen(null);
    if (!same)
      tabs.current!.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  return (
    <div className="cm-wrap">
      <section className="cm-hero">
        <h1>
          Discover community-made <span className="cm-g">real app clones,</span>
          <br />
          <span className="cm-g">device mockups</span> and{" "}
          <span className="cm-b">editable boards</span>
        </h1>
        <form
          className="cm-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            tabs.current!.scrollIntoView({
              block: "start",
              behavior: "smooth",
            });
          }}
        >
          <MagnifyingGlass />
          <input
            ref={search}
            type="search"
            aria-label="Search projects"
            placeholder="Search for an app, a device or a maker…"
            autoComplete="off"
            spellCheck={false}
            value={q}
            maxLength={60}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => event.key === "Escape" && setQ("")}
          />
          {q ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQ("")}
            >
              <Cross />
            </button>
          ) : (
            <kbd aria-hidden>/</kbd>
          )}
        </form>
      </section>

      <div className="cm-tabs" role="tablist" aria-label="Device" ref={tabs}>
        {FAMILIES.map(([key, label, Icon]) => {
          const n =
            key === "all"
              ? all.length
              : all.filter((e) => e.family === key).length;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              className="cm-tab"
              data-empty={n === 0 || undefined}
              aria-selected={family === key}
              onClick={() => setFamily(key)}
            >
              <Icon />
              <span>{label}</span>
              <i>{n}</i>
            </button>
          );
        })}
      </div>
      {col && (
        <div className="cm-filter">
          <span className="cm-mono">Collection</span>
          <span className="cm-chip">
            {col.title}
            <button
              type="button"
              aria-label="Clear collection"
              onClick={() => setCollection(null)}
            >
              <Cross />
            </button>
          </span>
        </div>
      )}
      <ul className="cm-grid" role="tabpanel" aria-live="polite">
        {shown.map((e) => (
          <Card key={e.slug} entry={e} onOpen={() => setOpen(e)} />
        ))}
        {shown.length === 0 && (
          <li className="cm-empty">
            {needle ? (
              <>
                <MagnifyingGlass />
                <h3>Nothing matches “{q.trim()}”</h3>
                <p>Try another name, or clone it yourself and share it.</p>
                <button
                  type="button"
                  className="cm-btn cm-btn--ghost cm-btn--md"
                  onClick={() => setQ("")}
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <h3>No {familyName(family)} projects yet</h3>
                <p>
                  {col
                    ? `Nothing in “${col.title}” for ${familyName(family)}.`
                    : "Be the first to clone one and share it."}
                </p>
                <a
                  className="cm-btn cm-btn--solid cm-btn--md"
                  href={SHARE}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Share the first one <ArrowRight />
                </a>
              </>
            )}
          </li>
        )}
      </ul>

      <section className="cm-section" aria-labelledby="cm-themes">
        <div className="cm-mono">Curated collections</div>
        <h2 id="cm-themes">Explore by theme</h2>
        <div className="cm-crow">
          {collections.map((c) => (
            <button
              key={c.id}
              type="button"
              className="cm-ccard"
              aria-pressed={collection === c.id}
              onClick={() => pickCollection(c.id)}
            >
              <div className="cm-shot" aria-hidden>
                <Thumb entry={c.entries[0]} />
              </div>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
              <div className="cm-cmeta cm-mono">
                <span>
                  {plural(c.entries.reduce((n, e) => n + e.boards, 0))}
                </span>
                <ArrowRight />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="cm-submit">
        <div className="cm-subl">
          <div className="cm-subicon">
            <LogoGithub />
          </div>
          <div>
            <b>Share what you made</b>
            <span>
              Ask your agent to share a project to the community. It opens a
              pull request, and it shows up here once merged.
            </span>
          </div>
        </div>
        <a
          className="cm-btn cm-btn--solid cm-btn--md"
          href={SHARE}
          target="_blank"
          rel="noopener noreferrer"
        >
          How to share <ArrowRight />
        </a>
      </section>

      <footer className="cm-footer">
        <span>
          Not affiliated with the companies whose apps are shown here. To have
          one removed,{" "}
          <a href={TAKEDOWN} target="_blank" rel="noopener noreferrer">
            open an issue
          </a>
          .
        </span>
        <span className="cm-mono">
          {all.length} {all.length === 1 ? "project" : "projects"}
        </span>
      </footer>

      <dialog
        ref={dialog}
        className="cm-dialog"
        aria-labelledby="cm-dlg-title"
        onCancel={(event) => {
          event.preventDefault();
          setOpen(null);
        }}
        onClick={(event) => event.target === dialog.current && setOpen(null)}
      >
        {open && (
          <div className="cm-dlg">
            <div className="cm-shot cm-stage">
              <Thumb entry={open} />
            </div>
            <div className="cm-info">
              <div className="cm-head">
                {open.icon && <img src={open.icon} alt="" />}
                <div>
                  <h3 id="cm-dlg-title">{open.name}</h3>
                  <a
                    className="cm-by"
                    href={`https://github.com/${open.author}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img src={avatar(open.author)} alt="" />
                    {open.author}
                  </a>
                  {open.contributors.map((c) => (
                    <a
                      key={c}
                      className="cm-by"
                      href={`https://github.com/${c}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={c}
                    >
                      <img src={avatar(c)} alt={c} />
                    </a>
                  ))}
                </div>
              </div>
              <div className="cm-stats">
                <div>
                  <span className="cm-mono">Boards</span>
                  <b>{open.boards}</b>
                </div>
                <div>
                  <span className="cm-mono">Device</span>
                  <b>{familyName(open.family)}</b>
                </div>
              </div>
              {collections.some((c) => c.slugs.includes(open.slug)) && (
                <>
                  <div className="cm-mono">In collections</div>
                  <div className="cm-tags">
                    {collections
                      .filter((c) => c.slugs.includes(open.slug))
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => pickCollection(c.id)}
                        >
                          {c.title}
                        </button>
                      ))}
                  </div>
                </>
              )}
              <div className="cm-actions">
                {open.source ? (
                  <a
                    className="cm-btn cm-btn--solid cm-btn--md"
                    href={open.source}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LogoGithub /> View on GitHub
                  </a>
                ) : (
                  <a
                    className="cm-btn cm-btn--solid cm-btn--md"
                    href={canvasPageUrl(open.slug)}
                    onClick={
                      openExample &&
                      openInTab((slug: string) => {
                        setOpen(null);
                        openExample(slug);
                      }, open.slug)
                    }
                  >
                    Open <ArrowRight />
                  </a>
                )}
                <button
                  type="button"
                  className="cm-btn cm-btn--ghost cm-btn--md"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(
                        open.source ??
                          `${DEMO}?canvas=${encodeURIComponent(open.slug)}`,
                      )
                      .then(() => setCopied(open.slug))
                  }
                >
                  <Link /> {copied === open.slug ? "Copied" : "Copy link"}
                </button>
              </div>
            </div>
            <button
              type="button"
              className="cm-btn cm-btn--ghost cm-btn--icon cm-close"
              aria-label="Close"
              onClick={() => setOpen(null)}
            >
              <Cross />
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}
