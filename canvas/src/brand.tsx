import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./brand.css";
import { BrandKitIndex } from "./BrandKitIndex";
import { BrandKit } from "./BrandKit";
import { hasBrandMaterial, pageNameFor } from "./canvasLibrary";
import { slugFromUrl } from "./canvasUrl";

// The third entry, beside the canvas and the sheet, and the same `?canvas=<slug>` as both. It
// reads the same `images` rows layout.json gives the canvas, so the brand material is one set of
// pictures with one set of captions whether it is read as shapes or as a page.
//
// Without a slug it is the index of every product that collected any. That is also what a page
// which collected none gets, rather than the empty kit it would otherwise render: the welcome
// page, whose slug a bare address resolves to, and any folder still being worked on.
const slug = slugFromUrl(window.location.href);
const kit = hasBrandMaterial(slug);
document.title = kit ? `${pageNameFor(slug)} — brand` : "Brand kits";

createRoot(document.getElementById("root")!).render(
  <StrictMode>{kit ? <BrandKit slug={slug} /> : <BrandKitIndex />}</StrictMode>,
);
