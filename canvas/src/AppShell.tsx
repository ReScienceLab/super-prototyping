import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { canvasIndex, homeUrl } from "./canvasIndex";
import { CanvasTabBar } from "./CanvasTabBar";
import {
  isHere,
  readOpenTabs,
  tabFor,
  tabKey,
  tabOfExample,
  tabUrl,
  withTab,
  writeOpenTabs,
  type Project,
  type ProjectTab,
} from "./canvasTabs";
import { frameUrl, tabFromUrl, windowUrl } from "./canvasUrl";
import {
  AgentButton,
  CANVAS_ATTACH,
  ChatPanel,
  useChat,
  type CanvasAttachDetail,
  type Working,
} from "./ChatPanel";
import { CommunityPage } from "./Community";
import { HomePage } from "./HomePage";
import { NewProjectDialog, type NewProjectStart } from "./NewProjectDialog";
import { Onboarding } from "./Onboarding";

declare global {
  interface Window {
    /** The desktop app's own (desktop/preload.ts), absent in a browser: the onboarding's answer
     *  and its update check, both about the app and not the project. */
    startup?: {
      agent(id: string): Promise<void>;
      check(): Promise<string>;
    };
    /** The window's side of the frame (here): what the canvas has in front, at what address. */
    spShell?: {
      shown(tab: ProjectTab, href: string): void;
      /** What the panel's running turn is writing to; `sp:working` on this window when it
       *  changes. The canvas's strip dots those tabs. */
      working: Working;
    };
    /** The canvas's side (App.tsx): brings a tab forward, or says it is another project's; and
     *  attaches the boards and pictures pasted links name, or says one of them names none. */
    spCanvas?: {
      goTo(tab: ProjectTab): boolean;
      attach(hrefs: string[]): boolean;
    };
  }
}

/**
 * What the window's address opened on: the home page, or a view of this project's, whose tab is
 * worked out here from the address until the canvas has loaded and said which it landed on.
 * The hosted build is on Cloudflare Pages, which answers `home.html` with a 308 to `home`, so
 * the home page is either. A build has no project, only examples, so its bare address is home,
 * but not its index of kits, `?brand=`, which is the same project view with an empty slug too.
 */
const openedTab = tabFor(tabFromUrl(location.href));
const opened =
  /\/home(\.html)?$/.test(location.pathname) ||
  (!canvasIndex().served &&
    !canvasIndex().project &&
    openedTab.kind === "project" &&
    openedTab.view.kind === "canvas")
    ? null
    : { tab: openedTab, href: frameUrl(location.href) };

/**
 * A hosted project's address keeps the name it was opened with, `/p/<id>/<name>`, as Figma's
 * file links do: the name is for people reading the link and nothing looks it up, so the canvas
 * addresses the project by `/p/<id>/` and this puts the name back.
 */
const openedName = canvasIndex().served
  ? undefined
  : location.pathname.match(/\/p\/[^/]+\/([^/.]+)$/)?.[1];
const named = (href: string) => {
  const url = new URL(href);
  if (openedName && url.pathname.endsWith("/")) url.pathname += openedName;
  return url.href;
};

/** The app's version when it asks for the onboarding (desktop/main.ts), read before the address
 *  is rewritten, so a reload does not ask again. */
const onboarding = new URLSearchParams(location.search).get("onboarding");

/**
 * The window: the bar across the top, the agent's panel down the left, and beside it the home
 * page or the canvas of the tab in front. The canvas is a frame, and the only thing a tab switch
 * reloads, because a project is its own pages at its own address and its canvas reads that
 * project's index once, as it loads. Everything the frame is not belongs to the window and
 * outlives every project the frame loads: the bar, and the panel with the message half-typed in
 * it and the run it is following. So the conversation is one across all of them.
 *
 * The frame loads a project's canvas.html; the window's address is that page's, with the file
 * taken off (canvasUrl.ts), so what is copied or reloaded is what a person would type. The
 * agent's panel posts to the server's one `/__sp/agent`, naming the project in front if there is
 * one: home and an example have none, and a message there works on no project. Two calls cross
 * the frame, one each way, both plain properties of the other window since the two share an
 * origin: the canvas says what it has in front (`spShell.shown`), and a chip asks it to bring a
 * tab forward (`spCanvas.goTo`), which it declines for another project's, whose canvas the frame
 * then loads instead.
 */
export function AppShell() {
  const chat = useChat();
  /** What is over the frame, if anything: home, or the community (Community.tsx). */
  const [page, setPageHere] = useState<"home" | "community" | null>(
    opened === null ? "home" : null,
  );
  /** A hosted project's home and community are the site's own community page, a page away. */
  const setPage = (page: "home" | "community" | null) =>
    page && !canvasIndex().served && canvasIndex().project
      ? location.assign(homeUrl())
      : setPageHere(page);
  /** Whether the frame is behind a page, so no project's canvas is in front. */
  const home = page !== null;
  const setHome = (on: boolean) => setPage(on ? "home" : null);
  /** Whether the community has its chip on the bar. */
  // ponytail: not among the tabs kept for the next visit; keep it in writeOpenTabs if missed.
  const [community, setCommunity] = useState(false);
  /** What the canvas last said it has in front, and its address; null before one has loaded. */
  const [shown, setShown] = useState(opened);
  /**
   * The bar: the projects and examples this browser left open, plus the one the address is in.
   * That one is in front, so it is open by definition, even on a link someone was sent.
   */
  const [tabs, setTabs] = useState(() => {
    // A build has no project, so a tab left from before it had only examples is gone.
    const open = readOpenTabs().filter(
      (tab) => canvasIndex().served || tab.kind === "example",
    );
    return opened ? withTab(open, opened.tab) : open;
  });
  /** Every project there is, for the "+" menu and the home page; empty until the server says. */
  const [projects, setProjects] = useState<Project[]>([]);
  const frame = useRef<HTMLIFrameElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [said, setSaid] = useState("");
  const [working, setWorking] = useState<Working>({ slugs: [] });

  // Before paint, not after: the frame below reads `working` as it renders, and a passive effect
  // could still be waiting when it does.
  useLayoutEffect(() => {
    window.spShell = {
      shown(tab, href) {
        setShown({ tab, href });
        setTabs((tabs) => withTab(tabs, tab));
      },
      working: { slugs: [] },
    };
  }, []);

  useEffect(() => {
    window.spShell!.working = working;
    window.dispatchEvent(new Event("sp:working"));
  }, [working]);

  // The bar comes back on the next visit, the way the document behind it does.
  useEffect(() => {
    writeOpenTabs(tabs);
  }, [tabs]);

  // One writer for the address, from what is in front. It replaces rather than pushes, since the
  // frame's own changes are already entries in the window's history, which Back walks. Home is
  // the server's, at its root, and no project's; a hosted build's is its bare address.
  useEffect(() => {
    const href = home || !shown ? homeUrl() : named(windowUrl(shown.href));
    if (href !== location.href) history.replaceState(null, "", href);
  }, [home, shown]);

  // The projects, fetched again each time home opens or closes, since that is where one was
  // made, renamed or edited since, and when home deletes one; and with them the one thing about
  // another project this window can learn, that it has gone since its tab was left open.
  const listProjects = () => {
    if (!canvasIndex().served) return;
    void fetch("/__sp/projects.json")
      .then((response) => response.json())
      .then((list: Project[]) => {
        setProjects(list);
        const known = new Set(list.map((p) => p.url));
        setTabs((tabs) =>
          tabs.filter(
            (tab) =>
              isHere(tab) || (tab.kind === "project" && known.has(tab.url)),
          ),
        );
      });
  };
  useEffect(listProjects, [home]);

  /** Loads a project's canvas at an address of the window's into the frame. */
  const load = (href: string) => {
    setHome(false);
    frame.current!.src = frameUrl(href);
  };

  /**
   * A chip, a row of the "+" menu or a card. The canvas loaded brings the tab forward when it is
   * that project's; otherwise the frame loads that project's canvas.
   */
  const goTo = (tab: ProjectTab) => {
    if (!frame.current!.contentWindow!.spCanvas?.goTo(tab)) load(tabUrl(tab));
    setHome(false);
  };

  /**
   * Takes chips off the bar: one, the others, or all of them. Closing ones that are not in front
   * changes nothing else; closing the one in front lands on the nearest chip left to its right,
   * else to its left. Closing the last one goes home, the way closing Figma's last file does, and
   * empties the frame, so a board written while home is up cannot reload that project's canvas
   * and put its tab back.
   */
  const closeTabs = (closing: ProjectTab[]) => {
    const gone = new Set(closing.map(tabKey));
    const rest = tabs.filter((tab) => !gone.has(tabKey(tab)));
    setTabs(rest);
    if (home || !shown || !gone.has(tabKey(shown.tab))) return;
    const at = tabs.findIndex((tab) => tabKey(tab) === tabKey(shown.tab));
    const before = tabs.slice(0, at).filter((tab) => !gone.has(tabKey(tab)));
    const next = rest[before.length] ?? rest[before.length - 1];
    if (next) return goTo(next);
    frame.current!.src = "about:blank";
    setShown(null);
    setHome(true);
  };

  /**
   * Makes a project, in the projects folder (canvas/server/projects.ts), a browser tab's request
   * and the app's alike, then copies in the references a clone starts from. The server answers
   * the project's address, whose canvas goes in the frame, or what to say under the name field.
   */
  const create = async (name: string, start: NewProjectStart) => {
    const res = await fetch(new URL("/__sp/projects", location.origin), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return setSaid(await res.text());
    // The server's name, which is the one typed, or an "Untitled" when none was.
    const made = (await res.json()) as { name: string; url: string };
    const { url } = made;
    // The project is made by now, so a file that will not copy is reported and left out, and the
    // project opens on the rest: trying again would only be told the name is taken.
    const names: string[] = [];
    const failed: string[] = [];
    if (start.mode === "clone")
      for (const file of start.files) {
        const query = new URLSearchParams({ name: made.name, file: file.name });
        try {
          const up = await fetch(
            new URL(`/__sp/projects/ref?${query}`, location.origin),
            {
              method: "POST",
              body: file,
            },
          );
          if (up.ok) names.push(`refs/${file.name}`);
          else failed.push(`${file.name}: ${await up.text()}`);
        } catch (error) {
          failed.push(`${file.name}: ${error}`);
        }
      }
    if (failed.length > 0)
      alert(
        `The project was made, but these could not be copied into it:\n\n${failed.join("\n")}`,
      );
    dialog.current!.close();
    // Before anything else its agent names the project, when it was left unnamed, into its
    // project.json, which the bar and the home page show it by (server/sp.ts). Then it makes and
    // names the first canvas, which the blank view the project opens on gives way to (App.tsx).
    // The skill's command still opens the message, since only there is it one.
    const first = [
      name.trim() === "" &&
        `name this project: add a short name for it as "name" to project.json at the project's root, keeping the keys already there (if you cannot tell yet what it is, make that your first question to me)`,
      // Empty: the skill says when a board is due, after the product or the measurements.
      `make the canvas the work goes in and name it: a folder under canvases/ with its "name" in layout.json, so it opens on my screen, and no board in it until the work reaches one`,
    ].filter(Boolean);
    const [skill, ask] =
      start.mode === "clone"
        ? [
            "/sp-clone-prototype",
            names.length > 0
              ? `Clone the app in these references, in the project: ${names.join(", ")}.`
              : "Ask me which app to clone, and for screenshots or a screen recording of it.",
          ]
        : start.define
          ? [
              "/sp-define-product",
              "Help me work out what this product is, and write PRD.md as we go.",
            ]
          : ["", "Ask me what this project is."];
    // What they said about the idea, in their words, for the agent to start from rather than ask.
    const idea =
      start.mode === "build" && start.idea
        ? ` Here is the idea in my own words, as it came to mind. Start from it, and ask about what it leaves open rather than what it already says:\n\n${start.idea.replace(/^/gm, "> ")}`
        : "";
    starting.current = {
      url,
      text: [
        skill,
        `Before anything else, ${first.join(", then ")}. Then: ${ask}${idea}`,
      ]
        .filter(Boolean)
        .join(" "),
    };
    load(new URL(url, location.origin).href);
  };
  // A project made to start on a skill: sp-clone-prototype on its references, or sp-define-product.
  // The message is sent once that project is in front; earlier it would go to whichever project
  // is in front now.
  const starting = useRef<{ url: string; text: string }>(undefined);
  useEffect(() => {
    if (
      shown?.tab.kind !== "project" ||
      shown.tab.url !== starting.current?.url
    )
      return;
    const { text } = starting.current;
    starting.current = undefined;
    window.dispatchEvent(
      new CustomEvent<CanvasAttachDetail>(CANVAS_ATTACH, {
        detail: { kind: "send", text },
      }),
    );
  }, [shown]);
  const newProject = () => {
    setSaid("");
    dialog.current!.querySelector("form")!.reset();
    dialog.current!.showModal();
  };
  // A hosted build has no server to make a project on.
  const served = canvasIndex().served;

  const view = shown?.tab.view;
  return (
    <div className="canvas-shell">
      <CanvasTabBar
        tabs={tabs}
        active={home ? null : (shown?.tab ?? null)}
        working={working}
        onHome={() => setHome(true)}
        community={
          community
            ? {
                active: page === "community",
                open: () => setPage("community"),
                // Closing it in front goes home, where it was opened from.
                close: () => {
                  setCommunity(false);
                  if (page === "community") setHome(true);
                },
              }
            : undefined
        }
        goTo={goTo}
        closeTabs={closeTabs}
        reload={() =>
          page === "home"
            ? listProjects()
            : page === null && frame.current!.contentWindow!.location.reload()
        }
        newProject={served ? newProject : undefined}
      >
        {/* Dev server and app only: the panel talks to /__sp/agent, which a hosted build has no
            process behind. */}
        {canvasIndex().served && <AgentButton chat={chat} />}
      </CanvasTabBar>
      <div className="canvas-body">
        {canvasIndex().served && (
          <ChatPanel
            // Home is no canvas to the agent. Neither is the project's own view with no canvas
            // in front (HOME_TAB), nor the index of every kit, since both have an empty slug. A
            // kit is named by the canvas whose material it shows. A document is no canvas either.
            canvas={(!home && view?.kind !== "doc" && view?.slug) || undefined}
            project={
              home || shown?.tab.kind !== "project" ? undefined : shown.tab.name
            }
            chat={chat}
            onWorking={setWorking}
          />
        )}
        <div className="canvas-window">
          {/* Hidden rather than taken out of the layout under home, so the canvas keeps its
              size and its camera, and coming back to it is instant. */}
          <iframe
            ref={frame}
            className="canvas-frame"
            title="Canvas"
            src={opened?.href}
            style={home ? { visibility: "hidden" } : undefined}
          />
          {page === "community" && (
            // The home page's scrolling layer: the window is the viewport's height and clips.
            <div className="home-main">
              <CommunityPage
                openExample={(slug) => goTo(tabOfExample(slug, tabs))}
              />
            </div>
          )}
          {page === "home" && (
            <HomePage
              openCommunity={() => {
                setCommunity(true);
                setPage("community");
              }}
              projects={projects}
              tabs={tabs}
              goTo={goTo}
              newProject={served ? newProject : undefined}
              reload={listProjects}
            />
          )}
        </div>
      </div>
      <NewProjectDialog dialog={dialog} said={said} create={create} />
      {onboarding !== null && <Onboarding chat={chat} version={onboarding} />}
    </div>
  );
}
