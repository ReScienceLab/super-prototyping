import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./sheet.css";
import { BoardsSheet } from "./BoardsSheet";
import { pageNameFor } from "./canvasLibrary";
import { slugFromUrl } from "./canvasUrl";

// The sheet is its own entry, not a route inside the canvas: reading a board as a web page
// should not download tldraw to do it. Which page it shows is the same `?canvas=<slug>` the
// canvas itself uses, so one address turns into the other by swapping the file.
const slug = slugFromUrl(window.location.href);
document.title = pageNameFor(slug);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BoardsSheet slug={slug} />
  </StrictMode>,
);
