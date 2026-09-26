import { Tabs } from "radix-ui";
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import "./community.css";
import { openInTab } from "./canvasTabs";
import { webUrl } from "./canvasUrl";
import { MenuItem, MenuSeparator, RightClickMenu } from "./contextMenu";
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

/**
 * The community: projects people made, to browse and open. The same page is a tab in the app
 * (AppShell.tsx), where a project opens as a tab of its own, and a page of the hosted build,
 * community.html (communitySite.tsx), which the site serves at superproto.dev/community and
 * where a project opens as its page on the site. Drawn after the `web/community` page of the Super
 * Prototyping Site project.
 *
 * It lists the projects shared to the community repo, from its index.json
 * (docs/2026-09-25-project-package.md, Phase 3), the ones this repo's canvases were packed into among them
 * (docs/2026-09-26-projects-on-demand.md). Every one opens as a read-only canvas on the site, at
 * its own address (docs/2026-09-25-project-urls.md), and in the app as its tab.
 */

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

/** Picked by hand, by project id, each named by the canvas in this repo it was packed from
 *  (canvases/community.json). An id the index does not have is left out. */
const COLLECTIONS = [
  {
    id: "ai",
    title: "AI assistants",
    desc: "Chat, ask, get things done.",
    ids: [
      "4a4554bb-1d8a-451a-9470-402023d1b1d2", // claude-ios
      "9e5315d3-33ef-40aa-985a-bd5fa66eb378", // chatgpt-ios
      "89a0e775-54d3-4fd6-87e1-befeb8cfd993", // perplexity-ios
      "c1c44038-13e5-442f-80dc-d114252ec7df", // grok-ios
    ],
  },
  {
    id: "social",
    title: "Social feeds",
    desc: "Scroll, post, connect.",
    ids: [
      "71073aa4-ce79-483f-9a4b-8c26282190c3", // instagram-ios
      "2aabfc73-0f78-4f19-b36c-82b95c12c48d", // x-ios
      "2bd6d004-edf6-4752-ac00-bec3b94fc21f", // tiktok-ios
      "bf02f911-1ce1-486a-8431-9f95fba882f6", // substack-ios
    ],
  },
  {
    id: "apple",
    title: "Apple's own",
    desc: "The apps the phone comes with.",
    ids: [
      "c5780fa4-c3a6-4ed7-84af-5981ce2148bb", // apple-wallet
      "1c9ee17b-cedf-4505-b927-a1b2c8f23e8e", // apple-photos
      "157c1beb-f17f-4b0d-acdd-f26a6ccf93cc", // apple-calendar
      "19146dc5-50a2-43a4-9fd7-9e21f7d74845", // apple-settings
      "6e9a9a5b-5c7e-4dac-af42-ced5ae88394f", // apple-app-store
      "9d2fa5d9-9285-4800-afb6-42ae186cd9d0", // apple-home-lock
    ],
  },
  {
    id: "work",
    title: "Tools",
    desc: "Notes, launchers, events.",
    ids: [
      "4ed969cf-9650-4edf-a24e-bf9544113ab3", // notion-ios
      "73b9bbae-0e6b-411d-90d5-c1a04a8c074b", // raycast-ios
      "3d010975-7211-4552-8370-78f04a7fcf83", // snapaction-ios
      "7baec1bc-e156-4d3d-97ed-9eada3bc2971", // luma-ios
    ],
  },
];

interface Entry {
  id: string;
  name: string;
  boards: number;
  family: Family;
  updated: number;
  author: string;
  contributors: string[];
  icon?: string;
  /** Its thumbnail.png, as `sp pack -o` or `sp thumbnail` drew it. */
  thumbnail: string;
  /** Its folder on GitHub. */
  source: string;
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
    id: p.id,
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

const plural = (n: number) => `${n} board${n === 1 ? "" : "s"}`;
const avatar = (login: string) => `https://github.com/${login}.png?size=64`;

/** A project's thumbnail.png, at the Open Graph image's 1200:630 it is drawn at. */
function Thumb({ entry }: { entry: Entry }) {
  return (
    <div className="cm-thumb">
      <img className="cm-png" src={entry.thumbnail} alt="" loading="lazy" />
    </div>
  );
}

function Card({
  entry,
  onOpen,
  menu,
}: {
  entry: Entry;
  onOpen: () => void;
  /** Its right-click menu's rows, in the app. */
  menu?: ReactNode;
}) {
  const card = (
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
  );
  return (
    <li>{menu ? <RightClickMenu menu={menu}>{card}</RightClickMenu> : card}</li>
  );
}

/** Every project in the community. Offline, or with GitHub down, none. */
function useCommunity() {
  const [all, setAll] = useState<Entry[]>([]);
  useEffect(() => {
    fetch(`${RAW}index.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((index: Index) => setAll(shared(index)))
      .catch(() => {});
  }, []);
  return all;
}

/** How the app opens a project of the community's, by its id: as its tab. */
export type OpenInApp = (id: string) => void;

/** How the app makes a project of the community's the user's, by its id (AppShell.tsx). */
export type Duplicate = (id: string) => void;

/**
 * A card's right-click menu, in the app, as the home page's own projects have (HomePage.tsx).
 * None on the site, whose dialog has the same links and where the browser keeps its own menu.
 */
function cardMenu(entry: Entry, openInApp?: OpenInApp, duplicate?: Duplicate) {
  if (!openInApp) return undefined;
  return (
    <>
      <MenuItem onSelect={() => openInApp(entry.id)}>Open</MenuItem>
      <MenuSeparator />
      <MenuItem
        onSelect={() =>
          navigator.clipboard.writeText(webUrl(entry.id, entry.name))
        }
      >
        Copy link
      </MenuItem>
      {duplicate && (
        <MenuItem onSelect={() => duplicate(entry.id)}>
          Duplicate to my projects
        </MenuItem>
      )}
      <MenuSeparator />
      <MenuItem asChild>
        <a href={entry.source} target="_blank" rel="noopener noreferrer">
          View on GitHub
        </a>
      </MenuItem>
    </>
  );
}

/**
 * The home page's Community section (HomePage.tsx): the latest projects as cards, each opening
 * as its tab, as it does from the community's dialog.
 */
export function CommunityCards({
  openInApp,
  duplicate,
  limit,
}: {
  openInApp: OpenInApp;
  duplicate?: Duplicate;
  limit: number;
}) {
  const all = useCommunity();
  return (
    <ul className="home-grid">
      {all.slice(0, limit).map((e) => (
        <Card
          key={e.id}
          entry={e}
          onOpen={() => openInApp(e.id)}
          menu={cardMenu(e, openInApp, duplicate)}
        />
      ))}
    </ul>
  );
}

/**
 * @param openInApp The app's: opens a project as its tab. Without it, as on the site, Open is a
 * link to the project's page on the site.
 */
export function CommunityPage({
  openInApp,
  duplicate,
}: {
  openInApp?: OpenInApp;
  /** The app's server's, which makes the copy; neither the site nor a hosted build has one. */
  duplicate?: Duplicate;
}) {
  const all = useCommunity();
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
    entries: c.ids
      .map((id) => all.find((e) => e.id === id))
      .filter((e) => e !== undefined),
  })).filter((c) => c.entries.length > 0);
  const col = collections.find((c) => c.id === collection);
  const needle = q.trim().toLowerCase();
  const shown = all.filter(
    (e) =>
      (family === "all" || e.family === family) &&
      (!col || col.ids.includes(e.id)) &&
      (!needle ||
        [
          e.name,
          e.author,
          familyName(e.family),
          ...collections
            .filter((c) => c.ids.includes(e.id))
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

      {/* Radix's tabs, for the arrow keys between them and the panel they name. Its root is no
          box of the layout's. */}
      <Tabs.Root
        className="cm-tabs-root"
        value={family}
        onValueChange={(value) => setFamily(value as Family | "all")}
      >
        <Tabs.List className="cm-tabs" aria-label="Device" ref={tabs}>
          {FAMILIES.map(([key, label, Icon]) => {
            const n =
              key === "all"
                ? all.length
                : all.filter((e) => e.family === key).length;
            return (
              <Tabs.Trigger
                key={key}
                value={key}
                className="cm-tab"
                data-empty={n === 0 || undefined}
              >
                <Icon />
                <span>{label}</span>
                <i>{n}</i>
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>
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
        <Tabs.Content value={family} asChild>
          <ul className="cm-grid" aria-live="polite" tabIndex={-1}>
            {shown.map((e) => (
              <Card
                key={e.id}
                entry={e}
                onOpen={() => setOpen(e)}
                menu={cardMenu(e, openInApp, duplicate)}
              />
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
        </Tabs.Content>
      </Tabs.Root>

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
              {collections.some((c) => c.ids.includes(open.id)) && (
                <>
                  <div className="cm-mono">In collections</div>
                  <div className="cm-tags">
                    {collections
                      .filter((c) => c.ids.includes(open.id))
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
                {openInApp ? (
                  <a
                    className="cm-btn cm-btn--solid cm-btn--md"
                    href={webUrl(open.id, open.name)}
                    onClick={openInTab((id: string) => {
                      setOpen(null);
                      openInApp(id);
                    }, open.id)}
                  >
                    Open <ArrowRight />
                  </a>
                ) : (
                  <a
                    className="cm-btn cm-btn--solid cm-btn--md"
                    href={webUrl(open.id, open.name)}
                    rel="noopener noreferrer"
                  >
                    Open <ArrowRight />
                  </a>
                )}
                <button
                  type="button"
                  className="cm-btn cm-btn--ghost cm-btn--md"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(webUrl(open.id, open.name))
                      .then(() => setCopied(open.id))
                  }
                >
                  <Link /> {copied === open.id ? "Copied" : "Copy link"}
                </button>
                {duplicate && (
                  <button
                    type="button"
                    className="cm-btn cm-btn--ghost cm-btn--md"
                    onClick={() => {
                      setOpen(null);
                      duplicate(open.id);
                    }}
                  >
                    Duplicate
                  </button>
                )}
                {open.source && (
                  <a
                    className="cm-btn cm-btn--ghost cm-btn--md"
                    href={open.source}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LogoGithub /> GitHub
                  </a>
                )}
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
