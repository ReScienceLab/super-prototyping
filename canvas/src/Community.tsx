import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
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
  LogoDiscord,
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
 * What it lists, until the community repo has its index (docs/2026-09-25-project-package.md,
 * Phase 3), is this app's examples: the ones that clone an app, which are the ones with its icon.
 * They are this repo's, so their author is its organisation, and every one is an iPhone app.
 */

/** Where the examples are public, for a link worth sending: the app's own address is localhost. */
const DEMO = "https://superproto.dev/demo/";
/** Who made the examples. A project in the community repo names its own (project.json). */
const EXAMPLES_BY = "ReScienceLab";
const DISCORD = "https://discord.gg/2DEZFFKx7k";
const ISSUES = "https://github.com/ReScienceLab/super-prototyping/issues/new";

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
  slug: string;
  name: string;
  boards: number;
  family: Family;
  cover: Cover;
  updated: number;
  author: string;
  /** What the thumbnail sits on: the layout's `ground`, else the canvas's. */
  ground: string;
}

function entries(): Entry[] {
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
        ground: /^#[0-9a-f]{6}$/i.test(String(b.layout?.ground))
          ? String(b.layout!.ground)
          : "#2b2b2b",
      };
    });
}

const plural = (n: number) => `${n} board${n === 1 ? "" : "s"}`;
const avatar = (login: string) => `https://github.com/${login}.png?size=64`;

/**
 * A project's thumbnail, as `sp pack` draws the package's thumbnail.png (tools/sp_canvas.py):
 * its cover whole, centred on the canvas's ground in a 16:10 frame. Drawn here from the cover
 * until the community repo's packages carry the file.
 */
function Thumb({ entry }: { entry: Entry }) {
  const [frame, width] = useWidth();
  const { cover } = entry;
  const [, , w, h] = cover.box;
  const pad = width * 0.05;
  const scale = Math.min(
    (width - 2 * pad) / w,
    (width * 0.625 - 2 * pad) / h,
  );
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
          <img className="cm-appicon" src={canvasIconUrl(entry.slug)} alt="" />
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
  const [all] = useState(entries);
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
                  href={DISCORD}
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
            <LogoDiscord />
          </div>
          <div>
            <b>Share what you made</b>
            <span>
              Post your project in Discord; sharing it here by pull request
              comes next.
            </span>
          </div>
        </div>
        <a
          className="cm-btn cm-btn--solid cm-btn--md"
          href={DISCORD}
          target="_blank"
          rel="noopener noreferrer"
        >
          Join Discord <ArrowRight />
        </a>
      </section>

      <footer className="cm-footer">
        <span>
          Not affiliated with the companies whose apps are shown here. To have
          one removed,{" "}
          <a href={ISSUES} target="_blank" rel="noopener noreferrer">
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
                <img src={canvasIconUrl(open.slug)} alt="" />
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
                <button
                  type="button"
                  className="cm-btn cm-btn--ghost cm-btn--md"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(
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
