import { useEffect, useRef, type ReactNode } from "react";
import { canvasIconUrl } from "./canvasLibrary";
import {
  projectTabIcon,
  projectTabLabel,
  tabKey,
  type ProjectTab,
} from "./canvasTabs";
import type { CanvasTab } from "./canvasUrl";
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
  /** The tab in front, or none while Home is. */
  active: ProjectTab | null;
  onHome: () => void;
  goTo: (tab: ProjectTab) => void;
  closeTab: (tab: ProjectTab) => void;
  /** The server's, which a hosted build has none of. */
  newProject?: () => void;
  children?: ReactNode;
}) {
  const { tabs, goTo } = props;
  const active = props.active && tabKey(props.active);

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
    </nav>
  );
}
