import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./sheet.css";
import { loadCanvasIndex } from "./canvasIndex";
import { slugFromUrl } from "./canvasUrl";

// The sheet is its own entry, not a route inside the canvas: reading a board as a web page
// should not download tldraw to do it. Which page it shows is the same `?canvas=<slug>` the
// canvas itself uses, so one address turns into the other by swapping the file.
//
// The index first, then the page, as main.tsx does: the library reads the index at module scope.
loadCanvasIndex()
  .then(async () => {
    const [{ BoardsSheet }, { pageNameFor }] = await Promise.all([
      import("./BoardsSheet"),
      import("./canvasLibrary"),
    ]);
    const slug = slugFromUrl(window.location.href);
    document.title = pageNameFor(slug);
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <BoardsSheet slug={slug} />
      </StrictMode>,
    );
  })
  .catch((error) => {
    document.getElementById("root")!.textContent = String(error);
  });
