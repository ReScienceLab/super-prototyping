import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./brand.css";
import { BrandSheet } from "./BrandSheet";
import { pageNameFor } from "./canvasLibrary";
import { slugFromUrl } from "./canvasUrl";

// The third entry, beside the canvas and the sheet, and the same `?canvas=<slug>` as both. It
// reads the same `images` rows layout.json gives the canvas, so the brand material is one set of
// pictures with one set of captions whether it is read as shapes or as a page.
const slug = slugFromUrl(window.location.href);
document.title = `${pageNameFor(slug)} — brand`;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrandSheet slug={slug} />
  </StrictMode>,
);
