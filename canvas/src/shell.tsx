import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
// The canvas's sheet, for the bar and the agent's panel, which are the same ones in here. The
// build links it after this page's own, which is safe only while the two style nothing in common
// but the page's ground.
import "./index.css";
import "./home.css";
import { loadCanvasIndex } from "./canvasIndex";
import { frameUrl } from "./canvasUrl";

// The window (AppShell.tsx), at a project's address and at its home.html: the entry that loads no
// tldraw, since the canvas is a page of its own in a frame of this one.
//
// A link inside that frame to one of these addresses would put a second window inside the
// first; the canvas at that address is what it meant. Otherwise the index first, as main.tsx
// does: the window reads it at module scope, for the tab its address names and the examples.
if (window.parent !== window) location.replace(frameUrl(location.href));
else
  loadCanvasIndex(false)
    .then(async () => {
      const { AppShell } = await import("./AppShell");
      createRoot(document.getElementById("root")!).render(
        <StrictMode>
          <AppShell />
        </StrictMode>,
      );
    })
    .catch((error) => {
      document.getElementById("root")!.textContent = String(error);
    });
