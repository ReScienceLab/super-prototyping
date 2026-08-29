import { createContext, useContext } from "react";
import {
  DefaultStylePanel,
  DefaultToolbar,
  DefaultToolbarContent,
  TldrawUiButton,
  TldrawUiButtonIcon,
  TldrawUiMenuItem,
  useIsToolSelected,
  useTools,
  type TLComponents,
  type TLUiAssetUrlOverrides,
  type TLUiOverrides,
} from "tldraw";
import { MarkTool } from "./MarkShape";

export const CanvasChromeContext = createContext({
  terminalVisible: false,
  toggleTerminal: () => {},
  stylesVisible: false,
  toggleStyles: () => {},
  relayoutLibrary: () => {},
});

export const markTools = [MarkTool];

export const markUiOverrides: TLUiOverrides = {
  tools(editor, tools) {
    tools.mark = {
      id: "mark",
      icon: "mark-icon",
      label: "Mark",
      kbd: "m",
      onSelect: () => editor.setCurrentTool("mark"),
    };
    return tools;
  },
};

export const markUiComponents: TLComponents = {
  Toolbar: (props) => {
    const tools = useTools();
    const mark = tools.mark;
    const isSelected = useIsToolSelected(mark);
    const chrome = useContext(CanvasChromeContext);

    return (
      <DefaultToolbar {...props}>
        <TldrawUiMenuItem {...mark} isSelected={isSelected} />
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
          isActive={chrome.terminalVisible}
          title={chrome.terminalVisible ? "Hide terminal" : "Show terminal"}
          aria-pressed={chrome.terminalVisible}
          onClick={chrome.toggleTerminal}
        >
          <TldrawUiButtonIcon icon="terminal-icon" />
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

export const markAssetUrls: TLUiAssetUrlOverrides = {
  icons: {
    "mark-icon": "/mark.svg",
    "styles-icon": "/styles.svg",
    "terminal-icon": "/terminal.svg",
    "refresh-icon": "/refresh.svg",
  },
};
