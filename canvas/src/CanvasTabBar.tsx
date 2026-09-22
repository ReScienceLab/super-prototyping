import {
  useEffect,
  useRef,
  useState,
  type MouseEventHandler,
  type ReactNode,
} from "react";
import { canvasIndex } from "./canvasIndex";
import { canvasIconUrl } from "./canvasLibrary";
import {
  projectTabIcon,
  projectTabLabel,
  tabKey,
  tabUrl,
  type ProjectTab,
} from "./canvasTabs";
import type { CanvasTab } from "./canvasUrl";
import { askServer, openMenu, REVEAL } from "./contextMenu";
import { Cross, Home, Plus } from "./geistIcons";

/**
 * The bar across the top of the window: the agent's button, which AppShell.tsx hands in as
 * `children`, then Home, one chip per open project or example, and the "+" that makes a project.
 * Another project, or an example, is opened from the home page.
 * The project's own canvases and the way into Figma are on the strip under it (CanvasStrip.tsx),
 * inside the canvas's frame.
 *
 * It is the window's, not the canvas's, so switching to another project, which is another page
 * loaded into the frame, leaves it where it is, with the agent's panel beside it. It is not
 * tldraw's either, which held the same row once. `MenuPanel: null` in canvasChrome.tsx is the
 * other half of this file.
 */

/** A folder's app icon. One without is its label alone, with no gap. */
export function ViewIcon({ view }: { view: CanvasTab }) {
  const icon = view.kind === "canvas" ? canvasIconUrl(view.slug) : undefined;
  if (icon) return <img className="sp-tabchip-icon" src={icon} alt="" />;
  return null;
}

function TabChip({
  tab,
  active,
  onOpen,
  onClose,
  onMenu,
}: {
  tab: ProjectTab;
  active: boolean;
  onOpen: () => void;
  onClose: () => void;
  onMenu: MouseEventHandler;
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
    <span
      className="sp-tabchip"
      data-active={active || undefined}
      onContextMenu={onMenu}
    >
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
  /** The tab in front, or none while Home is. */
  active: ProjectTab | null;
  onHome: () => void;
  goTo: (tab: ProjectTab) => void;
  /** Takes these off the bar, landing on a neighbour when the one in front goes. */
  closeTabs: (tabs: ProjectTab[]) => void;
  /** Loads the canvas in front again, and nothing else. */
  reload: () => void;
  /** The server's, which a hosted build has none of. */
  newProject?: () => void;
  children?: ReactNode;
}) {
  const { tabs, goTo } = props;
  const active = props.active && tabKey(props.active);
  const [target, setTarget] = useState<ProjectTab | null>(null);
  const menu = useRef<HTMLDivElement>(null);

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
            onClose={() => props.closeTabs([tab])}
            onMenu={(event) => openMenu(event, menu, () => setTarget(tab))}
          />
        ))}
      </div>
      {props.newProject && (
        <button
          type="button"
          className="sp-head-x"
          title="New project"
          onClick={props.newProject}
        >
          <Plus />
        </button>
      )}
      {/* A tab's menu, after Figma's, less what a project here does not have: no pinning, groups
          or windows, and renaming is the folder's. Reload is the tab in front's, since only that
          one is loaded. The folder is a project's; an example's is the plugin's. */}
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
              onClick={() =>
                navigator.clipboard.writeText(
                  new URL(tabUrl(target), location.href).href,
                )
              }
            >
              Copy link
            </button>
            {tabKey(target) === active && (
              <button
                type="button"
                role="menuitem"
                className="sp-menu-row"
                onClick={props.reload}
              >
                Reload
              </button>
            )}
            {target.kind === "project" && canvasIndex().served && (
              <button
                type="button"
                role="menuitem"
                className="sp-menu-row"
                onClick={() => askServer("reveal", target.name)}
              >
                {REVEAL}
              </button>
            )}
            <hr />
            <button
              type="button"
              role="menuitem"
              className="sp-menu-row"
              onClick={() => props.closeTabs([target])}
            >
              Close
            </button>
            <button
              type="button"
              role="menuitem"
              className="sp-menu-row"
              disabled={tabs.length === 1}
              onClick={() =>
                props.closeTabs(
                  tabs.filter((tab) => tabKey(tab) !== tabKey(target)),
                )
              }
            >
              Close other tabs
            </button>
            <button
              type="button"
              role="menuitem"
              className="sp-menu-row"
              onClick={() => props.closeTabs(tabs)}
            >
              Close all tabs
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
