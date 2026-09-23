import { useEffect, useRef, useState } from "react";
import { canvasIndex } from "./canvasIndex";
import { CanvasTabBar } from "./CanvasTabBar";
import {
  isHere,
  readOpenTabs,
  tabFor,
  tabKey,
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
} from "./ChatPanel";
import { HomePage } from "./HomePage";
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
    spShell?: { shown(tab: ProjectTab, href: string): void };
    /** The canvas's side (App.tsx): brings a tab forward, or says it is another project's; and
     *  attaches the boards and pictures pasted links name, or says one of them names none. */
    spCanvas?: { goTo(tab: ProjectTab): boolean; attach(hrefs: string[]): boolean };
  }
}

/**
 * What the window's address opened on: the home page, or a view of this project's, whose tab is
 * worked out here from the address until the canvas has loaded and said which it landed on.
 * The hosted build is on Cloudflare Pages, which answers `home.html` with a 308 to `home`, so
 * the home page is either.
 */
const opened = /\/home(\.html)?$/.test(location.pathname)
  ? null
  : { tab: tabFor(tabFromUrl(location.href)), href: frameUrl(location.href) };

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
  const [home, setHome] = useState(opened === null);
  /** What the canvas last said it has in front, and its address; null before one has loaded. */
  const [shown, setShown] = useState(opened);
  /**
   * The bar: the projects and examples this browser left open, plus the one the address is in.
   * That one is in front, so it is open by definition, even on a link someone was sent.
   */
  const [tabs, setTabs] = useState(() =>
    opened ? withTab(readOpenTabs(), opened.tab) : readOpenTabs(),
  );
  /** Every project there is, for the "+" menu and the home page; empty until the server says. */
  const [projects, setProjects] = useState<Project[]>([]);
  const frame = useRef<HTMLIFrameElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [said, setSaid] = useState("");

  useEffect(() => {
    window.spShell = {
      shown(tab, href) {
        setShown({ tab, href });
        setTabs((tabs) => withTab(tabs, tab));
      },
    };
  }, []);

  // The bar comes back on the next visit, the way the document behind it does.
  useEffect(() => {
    writeOpenTabs(tabs);
  }, [tabs]);

  // One writer for the address, from what is in front. It replaces rather than pushes, since the
  // frame's own changes are already entries in the window's history, which Back walks. Home is
  // the server's, at its root, and no project's; a hosted build's is beside its other pages.
  useEffect(() => {
    const href =
      home || !shown
        ? new URL(canvasIndex().served ? "/home.html" : "home.html", location.href).href
        : windowUrl(shown.href);
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
   * Makes a project or opens a folder, the server's two requests (canvas/server/projects.ts), a
   * browser tab's and the app's alike. The server answers the project's address, whose canvas
   * goes in the frame; nothing when the folder picker was cancelled; or what to say under the
   * name field.
   */
  const choose = async (path: string, name?: string, define = false) => {
    const res = await fetch(new URL(path, location.origin), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.status === 204) return;
    if (!res.ok) return setSaid(await res.text());
    dialog.current!.close();
    const { url } = (await res.json()) as { url: string };
    if (define) defining.current = url;
    load(new URL(url, location.origin).href);
  };
  // A project made to be defined first: its address, until it is the one in front, when the
  // agent is asked to start (skills/define-product). Not before, since a message goes to the
  // project in front, and the frame takes a moment to load it.
  const defining = useRef<string>(undefined);
  useEffect(() => {
    if (shown?.tab.kind !== "project" || shown.tab.url !== defining.current) return;
    defining.current = undefined;
    window.dispatchEvent(
      new CustomEvent<CanvasAttachDetail>(CANVAS_ATTACH, {
        detail: {
          kind: "send",
          text:
            "Use the define-product skill: help me work out what this product is, and write " +
            "PRD.md as we go.",
        },
      }),
    );
  }, [shown]);
  const newProject = () => {
    setSaid("");
    dialog.current!.querySelector("form")!.reset();
    dialog.current!.showModal();
  };
  // The picker is the OS's, over whatever is in front, and the request waits on it. A second
  // click meanwhile would stack a second picker.
  const picking = useRef(false);
  const openFolder = async () => {
    if (picking.current) return;
    picking.current = true;
    await choose("/__sp/projects/open").finally(() => (picking.current = false));
  };
  // A hosted build has no server to make a project on.
  const served = canvasIndex().served;

  const view = shown?.tab.view;
  return (
    <div className="canvas-shell">
      <CanvasTabBar
        tabs={tabs}
        active={home ? null : (shown?.tab ?? null)}
        onHome={() => setHome(true)}
        goTo={goTo}
        closeTabs={closeTabs}
        reload={() =>
          home ? listProjects() : frame.current!.contentWindow!.location.reload()
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
            project={home || shown?.tab.kind !== "project" ? undefined : shown.tab.name}
            chat={chat}
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
          {home && (
            <HomePage
              projects={projects}
              tabs={tabs}
              goTo={goTo}
              newProject={served ? newProject : undefined}
              openFolder={served ? openFolder : undefined}
              reload={listProjects}
            />
          )}
        </div>
      </div>
      {/* A new project needs only a name. It goes in the projects folder, and the server answers
          here when the name will not do. */}
      <dialog ref={dialog} className="home-dialog">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            await choose("/__sp/projects", form.get("name") as string, form.has("define"));
          }}
        >
          <h2>New project</h2>
          <input name="name" placeholder="Project name" autoFocus required />
          <label className="home-dialog-check">
            <input type="checkbox" name="define" defaultChecked />
            <span>
              Define the product with the agent
              <small>
                Runs the <code>define-product</code> skill in the agent panel
              </small>
            </span>
          </label>
          {said && <p>{said}</p>}
          <div>
            <button type="button" onClick={() => dialog.current!.close()}>
              Cancel
            </button>
            <button type="submit">Create</button>
          </div>
        </form>
      </dialog>
      {onboarding !== null && <Onboarding chat={chat} version={onboarding} />}
    </div>
  );
}
