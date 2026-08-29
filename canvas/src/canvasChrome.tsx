import { createContext, useContext } from "react";
import {
  DefaultStylePanel,
  DefaultToolbar,
  DefaultToolbarContent,
  TldrawUiButton,
  TldrawUiButtonIcon,
  type TLComponents,
  type TLUiAssetUrlOverrides,
} from "tldraw";

export const CanvasChromeContext = createContext({
  stylesVisible: false,
  toggleStyles: () => {},
  relayoutLibrary: () => {},
});

export const canvasChromeComponents: TLComponents = {
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
        <TldrawUiButton
          type="tool"
          title="Force refresh canvas library (fixes overlapping frames after a layout.json edit)"
          onClick={chrome.relayoutLibrary}
        >
          <TldrawUiButtonIcon icon="refresh-icon" />
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
