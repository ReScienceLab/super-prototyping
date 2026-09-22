import { useEffect, useRef, type ReactNode } from "react";
import { canvasIconUrl, shortName } from "./canvasLibrary";
import { canvasIndex } from "./canvasIndex";
import {
  projectTabIcon,
  projectTabLabel,
  tabKey,
  tabOfExample,
  tabOfProject,
  type Project,
  type ProjectTab,
} from "./canvasTabs";
import type { CanvasTab } from "./canvasUrl";
import { Check, Cross, FolderPlus, Home, Plus } from "./geistIcons";

/**
 * The bar across the top of the window: the agent's button, which AppShell.tsx hands in as
 * `children`, then Home, one chip per open project or example, and the "+" that opens another.
 * The project's own canvases and the way into Figma are on the strip under it (CanvasStrip.tsx),
 * inside the canvas's frame.
 *
 * It is the window's, not the canvas's, so switching to another project, which is another page
 * loaded into the frame, leaves it where it is, with the agent's panel beside it. It is not
 * tldraw's either, which held the same row once. `MenuPanel: null` in canvasChrome.tsx is the
 * other half of this file.
 */

const PROJECTS_ID = "sp-tab-picker";

/**
 * A menu under the button that opens it. A popover is in the top layer, which no ancestor can
 * position it against, and anchor positioning is not in every browser this runs in yet. So this
 * places it by hand, on the click rather than on `toggle`, which fires a frame after it is drawn.
 * It hangs off whichever of the button's edges is nearer the window's, so a "+" pushed far along
 * the bar still opens a menu that is on the screen.
 */
function placeUnder(
  menu: HTMLElement | null,
  button: HTMLElement,
  top: number,
) {
  if (!menu) return;
  const box = button.getBoundingClientRect();
  const near = box.left < window.innerWidth / 2;
  menu.style.top = `${Math.round(top) + 4}px`;
  menu.style.left = near ? `${Math.round(box.left)}px` : "auto";
  menu.style.right = near
    ? "auto"
    : `${Math.round(window.innerWidth - box.right)}px`;
}

/** A folder's app icon. One without is its label alone, with no gap. */
export function ViewIcon({ view }: { view: CanvasTab }) {
  const icon = view.kind === "canvas" ? canvasIconUrl(view.slug) : undefined;
  if (icon) return <img className="sp-tabchip-icon" src={icon} alt="" />;
  return null;
}

/** A row of the projects menu; it shuts the menu it is in before it goes anywhere. */
function MenuRow(props: {
  icon: ReactNode;
  label: string;
  current: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="sp-menu-row"
      onClick={(event) => {
        event.currentTarget.parentElement!.hidePopover();
        props.onPick();
      }}
    >
      {props.icon}
      <span className="sp-tab-picker-name">{props.label}</span>
      {props.current && <Check className="sp-menu-ck" />}
    </button>
  );
}

function TabChip({
  tab,
  active,
  onOpen,
  onClose,
}: {
  tab: ProjectTab;
  active: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const chip = useRef<HTMLButtonElement>(null);
  const icon = projectTabIcon(tab);
  const label = projectTabLabel(tab);
  // The bar scrolls once the tabs outrun it, so a tab brought forward from somewhere else, a card
  // on the home page, a link on a board or the address on load, has to scroll itself into view.
  useEffect(() => {
    if (active) {
      chip.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [active]);

  return (
    <span className="sp-tabchip" data-active={active || undefined}>
      <button
        ref={chip}
        type="button"
        className="sp-tabchip-open"
        // The bar is a row of what is open and the chip in front is the current page of it.
        aria-current={active ? "page" : undefined}
        title={label}
        onClick={onOpen}
      >
        {icon && <img className="sp-tabchip-icon" src={icon} alt="" />}
        <span className="sp-tabchip-name">{label}</span>
      </button>
      <button
        type="button"
        className="sp-tabchip-close"
        title={`Close ${label}`}
        onClick={onClose}
      >
        <Cross />
      </button>
    </span>
  );
}

export function CanvasTabBar(props: {
  tabs: ProjectTab[];
  projects: Project[];
  /** The tab in front, or none while Home is. */
  active: ProjectTab | null;
  onHome: () => void;
  goTo: (tab: ProjectTab) => void;
  closeTab: (tab: ProjectTab) => void;
  /** The app's, which can make a project; a browser has the one its server was started on. */
  newProject?: () => void;
  children?: ReactNode;
}) {
  const { tabs, projects, goTo } = props;
  const picker = useRef<HTMLDivElement>(null);
  const active = props.active && tabKey(props.active);
  const examples = canvasIndex().boards.filter((b) => b.example);

  return (
    <nav className="sp-topbar" aria-label="Open projects">
      {props.children}
      {/* Where the projects are, first, the way Figma's strip starts with its house. */}
      <button
        type="button"
        className="sp-head-x sp-topbar-home"
        aria-current={active ? undefined : "page"}
        title="Home"
        onClick={props.onHome}
      >
        <Home />
      </button>
      <div className="sp-topbar-tabs">
        {tabs.map((tab) => (
          <TabChip
            key={tabKey(tab)}
            tab={tab}
            active={tabKey(tab) === active}
            onOpen={() => goTo(tab)}
            onClose={() => props.closeTab(tab)}
          />
        ))}
      </div>
      {/* Nothing to offer in a build, which has one project and no examples beside it. */}
      {(projects.length > 0 || examples.length > 0) && (
        <button
          type="button"
          className="sp-head-x"
          popoverTarget={PROJECTS_ID}
          title="New or another project"
          // Under the bar, not under the button. Hung off the button's own box, it would cover
          // the four pixels of bar below it, hairline and all.
          onClick={(event) =>
            placeUnder(
              picker.current,
              event.currentTarget,
              event.currentTarget.parentElement!.getBoundingClientRect().bottom,
            )
          }
        >
          <Plus />
        </button>
      )}
      {/* Every project and every example rather than only the shut ones, so the list does not
          change shape under the pointer. Picking one already open brings its tab forward, which
          is what its chip would have done. */}
      <div
        id={PROJECTS_ID}
        popover="auto"
        className="sp-tab-picker"
        role="menu"
        ref={picker}
      >
        {props.newProject && (
          <MenuRow
            icon={<FolderPlus className="sp-tabchip-icon" />}
            label="New project…"
            current={false}
            onPick={props.newProject}
          />
        )}
        {projects.length > 0 && <p className="sp-menu-head">Projects</p>}
        {projects
          .toSorted((a, b) => b.updated - a.updated)
          .map((p) => {
            const tab = tabOfProject(p, tabs);
            const icon = projectTabIcon(tab);
            return (
              <MenuRow
                key={tabKey(tab)}
                icon={
                  icon && <img className="sp-tabchip-icon" src={icon} alt="" />
                }
                label={p.name}
                current={tabKey(tab) === active}
                onPick={() => goTo(tab)}
              />
            );
          })}
        {examples.length > 0 && <p className="sp-menu-head">Examples</p>}
        {examples.map((b) => {
          const tab = tabOfExample(b.slug, tabs);
          return (
            <MenuRow
              key={b.slug}
              icon={<ViewIcon view={{ kind: "canvas", slug: b.slug }} />}
              label={shortName(b.slug)}
              current={tabKey(tab) === active}
              onPick={() => goTo(tab)}
            />
          );
        })}
      </div>
    </nav>
  );
}
