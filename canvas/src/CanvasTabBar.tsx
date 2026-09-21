import { useContext, useEffect, useRef } from "react";
import { CanvasChromeContext } from "./canvasChrome";
import {
  canvasIconUrl,
  hasBrandMaterial,
  readCanvasLibrary,
  shortName,
} from "./canvasLibrary";
import { canvasIndex } from "./canvasIndex";
import { HOME_TAB, openInTab, sameTab, tabKey, tabLabel } from "./canvasTabs";
import {
  WELCOME_PAGE_SLUG,
  brandPageUrl,
  sheetPageUrl,
  type CanvasTab,
} from "./canvasUrl";
import { Cross, Layers, LogoFigma, Plus, SidebarLeft } from "./geistIcons";

/**
 * The bar across the top of the canvas area: the chat panel's switch, one chip per open canvas
 * or brand kit, the "+" that opens another, and the two places the canvas in front goes next.
 *
 * It is the app's own bar, not tldraw's, which held the same row until now. A brand kit is a
 * web page rather than a tldraw page, so what a tab switches to is not always inside
 * `<Tldraw>` — and a bar inside it would be covered by the kit its own button opened.
 * `MenuPanel: null` in canvasChrome.tsx is the other half of this file.
 */

const PICKER_ID = "sp-tab-picker";

/** A folder's app icon, or the room one would have taken, so every label starts on one column. */
function TabIcon({ tab }: { tab: CanvasTab }) {
  const icon = tab.kind === "canvas" ? canvasIconUrl(tab.slug) : undefined;
  if (icon) return <img className="sp-tabchip-icon" src={icon} alt="" />;
  // A kit has no app icon of its own — it is the page about the icon — so it wears the stack of
  // sheets that the button opening it wears.
  if (tab.kind === "brand") return <Layers className="sp-tabchip-icon" />;
  return <span className="sp-tabchip-icon" />;
}

function TabChip({
  tab,
  active,
  onOpen,
  onClose,
}: {
  tab: CanvasTab;
  active: boolean;
  onOpen: () => void;
  onClose?: () => void;
}) {
  const chip = useRef<HTMLButtonElement>(null);
  // The bar scrolls once the tabs outrun it, so a tab brought forward from somewhere else — a
  // card on Start here, a link on a board, the address on load — has to scroll itself into view.
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
        title={tabLabel(tab)}
        onClick={onOpen}
      >
        <TabIcon tab={tab} />
        <span className="sp-tabchip-name">{tabLabel(tab)}</span>
      </button>
      {onClose && (
        <button
          type="button"
          className="sp-tabchip-close"
          title={`Close ${tabLabel(tab)}`}
          onClick={onClose}
        >
          <Cross />
        </button>
      )}
    </span>
  );
}

export function CanvasTabBar() {
  const chrome = useContext(CanvasChromeContext);
  const picker = useRef<HTMLDivElement>(null);
  const { tabs, activeTab, openTab, closeTab } = chrome;
  const slug = activeTab.kind === "canvas" ? activeTab.slug : undefined;
  // Undefined on a page that collected no material — Start here, a folder someone has only just
  // started — and the button then opens the index of every page that did.
  const brandSlug = slug && hasBrandMaterial(slug) ? slug : undefined;

  return (
    <nav className="sp-topbar" aria-label="Open canvases">
      {/* Dev server only, like the panel it works. The leftmost thing in the bar, against the
          window's left edge, which is where the switch for the panel on that edge belongs; in
          the panel's own header it would disappear along with the panel. */}
      {canvasIndex().served && (
        <button
          type="button"
          className="sp-head-x"
          title={
            chrome.chatCollapsed
              ? "Open the chat panel"
              : "Collapse the chat panel"
          }
          onClick={chrome.toggleChat}
        >
          <SidebarLeft />
        </button>
      )}
      <div className="sp-topbar-tabs">
        {[HOME_TAB, ...tabs].map((tab) => (
          <TabChip
            key={tabKey(tab)}
            tab={tab}
            active={sameTab(tab, activeTab)}
            onOpen={() => openTab(tab)}
            // Start here is where a close lands, so it is the one chip with no close of its own.
            onClose={sameTab(tab, HOME_TAB) ? undefined : () => closeTab(tab)}
          />
        ))}
      </div>
      <button
        type="button"
        className="sp-head-x"
        popoverTarget={PICKER_ID}
        title="Open another canvas"
        // A popover is in the top layer, which no ancestor can position it against, and anchor
        // positioning is not in every browser this runs in yet. So the menu is placed by hand,
        // here rather than on `toggle`, which fires a frame after it is already drawn.
        //
        // Under the bar, not under the button: hung off the button's own box it would cover the
        // four pixels of bar below it, hairline and all. Along the bar it follows the button,
        // which slides as tabs open, and it hangs off whichever of its edges is nearer the
        // window's, so a "+" pushed far along still opens a menu that is on the screen.
        onClick={(event) => {
          const menu = picker.current;
          if (!menu) return;
          const plus = event.currentTarget.getBoundingClientRect();
          const bar = event.currentTarget.parentElement!.getBoundingClientRect();
          const near = plus.left < window.innerWidth / 2;
          menu.style.top = `${Math.round(bar.bottom) + 4}px`;
          menu.style.left = near ? `${Math.round(plus.left)}px` : "auto";
          menu.style.right = near
            ? "auto"
            : `${Math.round(window.innerWidth - plus.right)}px`;
        }}
      >
        <Plus />
      </button>
      {/* A native popover, the way the chat panel's menus use one: the top layer and light
          dismiss for free. It lists every canvas rather than only the shut ones, so the list
          does not change shape under the pointer — picking one already open brings its tab
          forward, which is what its chip would have done. Start here is left out: it is the one
          chip that is always on the bar. */}
      <div
        id={PICKER_ID}
        popover="auto"
        className="sp-tab-picker"
        role="menu"
        ref={picker}
      >
        {readCanvasLibrary()
          .map((files) => files[0].pageSlug)
          .filter((pageSlug) => pageSlug !== WELCOME_PAGE_SLUG)
          .map((pageSlug) => {
            const tab: CanvasTab = { kind: "canvas", slug: pageSlug };
            return (
              <button
                key={pageSlug}
                type="button"
                role="menuitem"
                className="sp-menu-row"
                onClick={() => {
                  picker.current?.hidePopover();
                  openTab(tab);
                }}
              >
                <TabIcon tab={tab} />
                <span className="sp-tab-picker-name">{shortName(pageSlug)}</span>
              </button>
            );
          })}
      </div>
      {/* An anchor wearing the bar's button, not a button: this is a link to another page of the
          app, so ⌘-click, middle click and copy-link all have to work on it. Named for where the
          boards are going rather than for what the click does — an external-link arrow is a true
          description of it that tells nobody it is the way into Figma, which is what people are
          here to do with a mockup. */}
      {slug && (
        <a
          className="tlui-button sp-figma"
          href={sheetPageUrl(slug)}
          target="_blank"
          rel="noopener noreferrer"
          title="Open every board on this page as one web page — the page an importer such as html.to.design reads into Figma"
        >
          <LogoFigma />
          <span className="sp-figma__label">Export to Figma</span>
        </a>
      )}
      {/* The second destination, next to the first: the pictures a product publishes of itself.
          It opens a tab now rather than a browser tab or a second app window, and stays an
          anchor for the reason the one above is one — brand.html is still a page of its own, so
          a ⌘-click should still reach it. Only the plain left click is taken over. */}
      {slug && (
        <a
          className="tlui-button sp-brand"
          href={brandPageUrl(brandSlug)}
          title={
            brandSlug
              ? "Open the brand kit collected for this page — the logos, social profiles, store listings and advertising this product publishes"
              : "Open the brand kits — the logos, social profiles, store listings and advertising these products publish, one kit per example"
          }
          onClick={openInTab(openTab, { kind: "brand", slug: brandSlug ?? "" })}
        >
          {/* A stack of sheets. Under 720px the label goes and the mark is the whole button, so
              it has to carry "brand kit" alone, and Geist's one picture frame says "images",
              which is every other button that ever held one. A kit is the stack. */}
          <Layers />
          <span className="sp-brand__label">Brand kit</span>
        </a>
      )}
    </nav>
  );
}
