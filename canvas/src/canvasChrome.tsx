import { createContext, useContext } from "react";
import {
  DefaultActionsMenu,
  DefaultStylePanel,
  DefaultToolbar,
  DefaultToolbarContent,
  TldrawUiButton,
  TldrawUiButtonIcon,
  type TLComponents,
  type TLUiAssetUrlOverrides,
} from "tldraw";

const REPO_URL = "https://github.com/ReScienceLab/super-prototyping";
/** The app the snapaction-ios boards are cloned from: its own site, not the App Store listing. */
const SNAPACTION_URL = "https://snapaction.ai/";

/** Both top-right CTAs are the same pill; only the fill and the icons differ. */
const CTA = {
  pointerEvents: "all",
  display: "flex",
  alignItems: "center",
  gap: 9,
  height: 46,
  padding: "0 20px",
  borderRadius: 12,
  color: "#FFFFFF",
  font: '700 15px/18px "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
  textDecoration: "none",
  whiteSpace: "nowrap",
} as const;

const GITHUB_PATH =
  "M12 0c6.63 0 12 5.276 12 11.79-.001 5.067-3.29 9.567-8.175 11.187-.6.118-.825-.25-.825-.56 0-.398.015-1.665.015-3.242 0-1.105-.375-1.813-.81-2.181 2.67-.295 5.475-1.297 5.475-5.822 0-1.297-.465-2.344-1.23-3.169.12-.295.54-1.503-.12-3.125 0 0-1.005-.324-3.3 1.209a11.32 11.32 0 00-3-.398c-1.02 0-2.04.133-3 .398-2.295-1.518-3.3-1.209-3.3-1.209-.66 1.622-.24 2.83-.12 3.125-.765.825-1.23 1.887-1.23 3.169 0 4.51 2.79 5.527 5.46 5.822-.345.294-.66.81-.765 1.577-.69.31-2.415.81-3.495-.973-.225-.354-.9-1.223-1.845-1.209-1.005.015-.405.56.015.781.51.28 1.095 1.327 1.23 1.666.24.663 1.02 1.93 4.035 1.385 0 .988.015 1.916.015 2.196 0 .31-.225.664-.825.56C3.303 21.374-.003 16.867 0 11.791 0 5.276 5.37 0 12 0z";

export const CanvasChromeContext = createContext({
  stylesVisible: false,
  toggleStyles: () => {},
  relayoutLibrary: () => {},
});

export const canvasChromeComponents: TLComponents = {
  /**
   * The two CTAs, pinned to the viewport's top-right corner rather than drawn on the welcome
   * board, so they are there on every page and do not scroll away with the canvas. `SharePanel`
   * is tldraw's own slot for exactly this: it renders in `.tlui-layout__top__right`, above the
   * style panel, which is where a tldraw app puts its share and account controls.
   */
  SharePanel: () => (
    <div style={{ display: "flex", gap: 10, margin: "10px 12px 0 0" }}>
      <a
        href={SNAPACTION_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Try SnapAction, the app the example boards are cloned from"
        className="canvas-cta"
        style={{
          ...CTA,
          border: "1px solid #4A4A56",
          background: "linear-gradient(180deg,#2A2A32,#17171C)",
          boxShadow: "0 6px 18px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.10)",
        }}
      >
        {/* The app's own mark, cut from its symbolset by snapaction-ios/gen.py. */}
        <img src="/snapaction.svg" width={23} height={18} alt="" />
        <span>Try SnapAction</span>
        <span style={{ color: "#8A8781", font: "inherit" }}>&#8599;</span>
      </a>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Star super-prototyping on GitHub"
        className="canvas-cta"
        style={{
          ...CTA,
          border: "1px solid #6E9BFF",
          background: "linear-gradient(180deg,#4A85FF,#1B47D2)",
          // The glow is the point: this is the one thing on the canvas asking for something,
          // so it reads as a lit button rather than another piece of grey chrome.
          boxShadow:
            "0 0 0 4px rgba(74,133,255,.20), 0 8px 24px rgba(37,99,235,.55), inset 0 1px 0 rgba(255,255,255,.28)",
        }}
      >
        <svg viewBox="0 0 24 24" width="19" height="19" fill="#FFD666" aria-hidden>
          <path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" />
        </svg>
        <span>Star on GitHub</span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="#FFFFFF" fillRule="evenodd" aria-hidden>
          <path d={GITHUB_PATH} />
        </svg>
      </a>
    </div>
  ),
  /** Force-relayout sits with the other document-level actions in the top bar, not with the drawing tools. */
  ActionsMenu: (props) => {
    const chrome = useContext(CanvasChromeContext);

    return (
      <>
        <DefaultActionsMenu {...props} />
        <TldrawUiButton
          type="icon"
          title="Force refresh canvas library (fixes overlapping frames after a layout.json edit)"
          onClick={chrome.relayoutLibrary}
        >
          <TldrawUiButtonIcon icon="refresh-icon" />
        </TldrawUiButton>
      </>
    );
  },
  Toolbar: (props) => {
    const chrome = useContext(CanvasChromeContext);

    return (
      <DefaultToolbar {...props}>
        <TldrawUiButton
          type="tool"
          isActive={chrome.stylesVisible}
          title={chrome.stylesVisible ? "Hide styles" : "Show styles"}
          aria-pressed={chrome.stylesVisible}
          onClick={chrome.toggleStyles}
        >
          <TldrawUiButtonIcon icon="styles-icon" />
        </TldrawUiButton>
        <DefaultToolbarContent />
      </DefaultToolbar>
    );
  },
  StylePanel: (props) => {
    const chrome = useContext(CanvasChromeContext);
    return chrome.stylesVisible ? <DefaultStylePanel {...props} /> : null;
  },
};

export const canvasChromeAssetUrls: TLUiAssetUrlOverrides = {
  icons: {
    "styles-icon": "/styles.svg",
    "refresh-icon": "/refresh.svg",
  },
};
