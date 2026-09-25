import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./home.css";
import { loadCanvasIndex } from "./canvasIndex";
import { LogoDiscord, LogoGithub } from "./geistIcons";

// The community as a page of the site, which serves this build's community.html at
// superproto.dev/community (the landing repo's Worker). The app has the same page as a tab
// (AppShell.tsx); here it has the site's bar over it instead, and Open is a link to the project's
// page, superproto.dev/p/<id> (docs/2026-09-25-project-urls.md).
//
// The index first, as main.tsx does: the page reads it at module scope.
loadCanvasIndex(false)
  .then(async () => {
    const { CommunityPage } = await import("./Community");
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <div className="home-main">
          <header className="cm-site">
            <a className="cm-site-brand" href="/">
              <img src="favicon-32.png" alt="" width={20} height={20} />
              Super Prototyping
            </a>
            <nav>
              <a href="https://discord.gg/2DEZFFKx7k" aria-label="Discord">
                <LogoDiscord />
              </a>
              <a
                href="https://github.com/ReScienceLab/super-prototyping"
                aria-label="GitHub"
              >
                <LogoGithub />
              </a>
              <a className="cm-btn cm-btn--solid cm-site-dl" href="/">
                Download
              </a>
            </nav>
          </header>
          <CommunityPage />
        </div>
      </StrictMode>,
    );
  })
  .catch((error) => {
    document.getElementById("root")!.textContent = String(error);
  });
