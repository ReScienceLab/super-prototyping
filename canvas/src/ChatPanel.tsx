/**
 * The chat panel: a message to Claude Code or Codex, run by the server on the project in front,
 * and what it did, drawn as it happens. The app's, not a project's: fixed down the left of the
 * window, under the tab bar, beside the home page and every project's canvas alike, and mounted
 * once by the window (AppShell.tsx). No tab switch and no board write reloads the window, only
 * the canvas's frame, so what is typed in it stays through both. Served only. The window mounts
 * it when the index says a server is behind /__sp, since a hosted build has no /__sp/agent
 * endpoints and no process behind them.
 *
 * A conversation is a session: the agent resumes it on every message, so it remembers the ones
 * before, and each message says which project is in front, so one session can go from project to
 * project, or start on the home page with none (server/agent.ts). New session starts another. The
 * panel keeps the session and the ids of its runs in sessionStorage, and follows every run again
 * after the window itself is reloaded, from event zero. The transcript is rebuilt, not saved,
 * since the server has the whole run (chatTransport.ts). One run at a time — two agents editing
 * one project would race each other — so Send is Stop while one is going.
 *
 * The header names the conversation, with the model's own title once it has given one. The
 * agent the next message goes to is the button at the start of the tab bar, which shows its
 * mark. A click puts the panel out or away, hidden rather than unmounted so it keeps following
 * whatever is running, and a right-click opens a menu of the agents the server found on PATH.
 * The choice lives in localStorage and travels with the message, and each turn and history row
 * carries the mark of the agent that ran it, which the run's start event says. A session is one
 * agent's, so choosing the other starts a new one. The clock lists the sessions, each with the
 * projects it worked on, and picking one resumes it.
 *
 * Images are attached by number. The icon under the box, a paste, or a drop puts a
 * screenshot in the tray above it as #1, #2, #3; clicking a tile drops that number into the
 * sentence as a chip, so a message can say "borrow the button from #2 and the copy from #3" and
 * mean it. A picture handed over from the canvas writes its own chip as it lands, since one
 * pointed at is one the message is already about, and deleting that chip out of the sentence
 * takes the picture out of the tray with it. One picture is one number however many times it is
 * handed over — pressing + on the same icon four times is one tile and one chip, since the tray
 * is checked for those bytes before a number is handed out. The numbers go in arrival order and
 * are never reused while anything still points at one — removing #2 of three leaves #1 and #3,
 * and the next attachment is #4 — because renumbering would silently repoint a sentence typed.
 * They start again at #1 once nothing does: an empty tray and an empty box, which is where a
 * false start leaves the panel and where sending leaves it too. That is why the box is a
 * contenteditable and not a textarea: a chip is an element in the text, which a textarea cannot
 * hold (chatDraft.ts reads it back).
 *
 * Pictures come back the other way too: whatever a tool hands the agent as an image — the grid
 * refkit draws over a reference, a crop, a screenshot — is drawn under the call that produced it,
 * so a clone can be watched while it is measured rather than only read about afterwards.
 *
 * Under the composer, what the next message is run with: the model, the reasoning effort, and
 * what the last one cost. Both pickers open with a Default that sends no flag at all, so the
 * CLI's own configuration decides until the user says otherwise, and both are per agent — a
 * codex model means nothing to claude — and kept in localStorage beside the agent itself. The
 * server serves the lists (agents.ts): claude's models are its aliases, codex's are the ones
 * its own picker draws, read from the list it caches. The token count is the last turn's, which
 * holds as much of the session as the agent carried into it.
 */
import { Fragment, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  ATTACH_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  SVG_TYPE,
  AGENTS,
  type AgentId,
  type AgentModel,
} from "./agents";
import type { Session } from "./agentRun";
import { namedPictures, readDraft, slashWord } from "./chatDraft";
import { applyFrame, followRun, writingTo, type Turn } from "./chatTransport";
import { ClaudeMark } from "./ClaudeMark";
import { CodexMark } from "./CodexMark";
import { Check, ClockRewind, Image, Plus } from "./geistIcons";
import { renderMarkdown } from "./markdown";
import { rasterizeSvg } from "./svgRaster";

// The conversation is the app's, not a project's, and so is the one server that runs it
// (server/agent.ts), so a tab switched to another project carries on with the same one.
const SESSION_KEY = "sp-chat-session";
const RUNS_KEY = "sp-chat-runs";
/** The canvas folders a running turn is writing to, by slug, in the project it was sent from. */
export type Working = { project?: string; slugs: string[] };
/** What Continue sends on an interrupted turn's session, which the agent resumes with its own
 *  record of what it had done. */
const CONTINUE =
  "You were interrupted before finishing the last turn. Check what is already on disk, " +
  "then carry on from where you stopped.";
const QUEUE_KEY = "sp-chat-queue";
const SENT_KEY = "sp-chat-sent";
const AGENT_KEY = "sp-chat-agent";
const CHOICE_KEY = "sp-chat-choice";
const COMMANDS_KEY = "sp-chat-commands";
const OPEN_KEY = "sp-chat-open";

/**
 * What the canvas hands the chat panel when the button is pressed (canvasAttach.tsx): a picture
 * to attach to the message, or the reason none was. A board comes over as a picture too. The
 * file's own name says which board it is, and the panel shows it under the tile. And the start
 * of a message, from the strip's "+" (CanvasStrip.tsx), because a canvas is only ever the
 * agent's work, and a folder with no boards in it is not one. And a whole message, sent as it is,
 * from the new-project dialog (AppShell.tsx), which starts the agent defining the product.
 *
 * A board comes as `board`: its name and where the server draws it. Drawing takes seconds, so the
 * panel puts its tile and its number up at once and asks for the drawing itself — from here and
 * not from the canvas's frame, which a reload or a change of tab would take the answer away with.
 *
 * On `window`, because the panel is a sibling of `<Tldraw>` and the button renders inside it,
 * the same arrangement, and the same answer, as ASK_COMMENT_USER (canvasChrome.tsx). Here rather
 * than beside the button, so the home page, which has the panel and no canvas, has no tldraw.
 */
export const CANVAS_ATTACH = "sp:canvas-attach";

export type CanvasAttachDetail =
  | { kind: "board"; name: string; src: string }
  | { kind: "image"; file: File }
  | { kind: "error"; message: string }
  | { kind: "draft"; text: string }
  | { kind: "send"; text: string };

/**
 * Whether the panel is out and which agent the next message goes to, and the ways to say so. The
 * app's, like the conversation, and shown on the tab bar's first button as well as in the panel,
 * so held by the page that draws both. There is one of each for the home page and every tab,
 * remembered across reloads. Out until first put away, since talking to the agent is what the
 * app is for.
 */
// oxlint-disable-next-line react/only-export-components
export function useChat() {
  const [agent, setAgent] = useState<AgentId>(() => {
    const stored = localStorage.getItem(AGENT_KEY);
    return stored && stored in MARKS ? (stored as AgentId) : "claude";
  });
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(OPEN_KEY) !== "false";
    } catch {
      return true;
    }
  });
  return {
    open,
    show(next: boolean) {
      try {
        localStorage.setItem(OPEN_KEY, String(next));
      } catch {
        // Storage unavailable (private mode, blocked cookies), so the choice lasts until a reload.
      }
      setOpen(next);
    },
    agent,
    choose(id: AgentId) {
      localStorage.setItem(AGENT_KEY, id);
      setAgent(id);
    },
  };
}

export type Chat = ReturnType<typeof useChat>;

/**
 * The agent's button, first in the tab bar and over the panel it puts out and away, in the mark
 * of the agent the panel talks to. A right-click is the menu of agents, which is not in the panel,
 * since the panel may be away.
 */
export function AgentButton({ chat }: { chat: Chat }) {
  const name = AGENTS.find((a) => a.id === chat.agent)!.name;
  return (
    <button
      type="button"
      className="sp-agent-toggle"
      aria-pressed={chat.open}
      onClick={() => chat.show(!chat.open)}
      onContextMenu={(event) => {
        event.preventDefault();
        const menu = document.getElementById("sp-chat-agents")!;
        // macOS asks for the menu on the press, and the release after it is a click outside a
        // menu opened then, which shuts it. So with a button still down, the menu opens once that
        // is let go, after the browser has handled the release. Windows asks on the release, and
        // the Menu key with no button down at all.
        if (event.buttons === 0) return menu.showPopover();
        window.addEventListener(
          "pointerup",
          () => setTimeout(() => menu.showPopover()),
          { once: true },
        );
      }}
      aria-label={name}
      title={`${chat.open ? "Hide" : "Show"} ${name} · Right-click to switch agents`}
    >
      <Mark agent={chat.agent} />
    </button>
  );
}

/**
 * The commands this browser was last told each agent had. The palette has to open on the slash
 * itself, and the server cannot always answer that fast: it keeps the list only in memory, so a
 * dev-server restart sends it back to the CLI to ask, which takes seconds. This is what it opens
 * on meanwhile — yesterday's list is right far more often than an empty one is, and the ask that
 * every mount makes anyway corrects it.
 */
const remembered = (): Record<string, string[]> => {
  try {
    return JSON.parse(localStorage.getItem(COMMANDS_KEY) ?? "{}") as Record<
      string,
      string[]
    >;
  } catch {
    return {};
  }
};

/** The CLI's own word for a level, with a capital: Low, High, XHigh. Total: the agent list
 *  arrives a moment after the panel does, and until it has there is no level to name. */
const effortName = (e: string) =>
  e === "xhigh" ? "XHigh" : e.charAt(0).toUpperCase() + e.slice(1);

/** 26k, 272k: a token count is read at a glance or not at all. */
const tokens = (n: number) =>
  n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);

/** Each agent's mark, by the id the server names it with. */
const MARKS = { claude: ClaudeMark, codex: CodexMark };

export function Mark({ agent, size }: { agent: AgentId; size?: number }) {
  const Agent = MARKS[agent];
  return <Agent size={size} />;
}

/** One entry of GET /__sp/agent/agents. */
export interface AgentRow {
  id: AgentId;
  name: string;
  available: boolean;
  models: AgentModel[];
  efforts: string[];
  missing: string;
  site: string;
}

/** A message sent while a run was on, held for the next one. */
interface Queued {
  message: string;
  images: Attached[];
}

/** A turn with nothing in it yet: the run's events, from `start` on, fill in the rest. */
const turnFor = (runId: string): Turn => ({ runId, prompt: "", blocks: [] });

/** One attached image, as the composer holds it. */
interface Attached {
  n: number;
  name: string;
  type: string;
  /** The file's own byte count, for the limit on what the whole tray weighs. */
  size: number;
  /** The reader's `data:` URL, drawn as-is by the tile and the chip; `send` posts what follows
   *  the comma. */
  url: string;
  /** A board still being drawn, with no `url` yet, or one whose drawing failed. */
  state?: "pending" | "failed";
}

/**
 * `canvas` is the one in front, which the message names to the agent; the home page has none.
 * `project` is the project in front, by the name its address carries; none on the home page or
 * an example. A shut panel is hidden, not unmounted, so it keeps following a run and comes back
 * to it.
 */
export function ChatPanel(props: {
  canvas?: string;
  project?: string;
  chat: Chat;
  /** The canvases the running turn has written to, and its project: what the window glows
   *  around. Empty once it ends, however it ends. */
  onWorking?: (working: Working) => void;
}) {
  const { canvas, project } = props;
  const { open, agent } = props.chat;
  const [turns, setTurns] = useState<Turn[]>(() =>
    (JSON.parse(sessionStorage.getItem(RUNS_KEY) ?? "[]") as string[]).map(
      turnFor,
    ),
  );
  // The session the next message goes on; null until the first message starts one.
  const [session, setSession] = useState<{ id: string; title: string } | null>(
    () => JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null"),
  );
  const [agents, setAgents] = useState<AgentRow[]>([]);
  // What each agent is to be run with, by agent id, since neither's models mean anything to the
  // other. A key missing, or naming something the agent no longer offers, is the CLI's default.
  const [choices, setChoices] = useState<
    Record<string, { model?: string; effort?: string }>
  >(() => {
    try {
      return JSON.parse(localStorage.getItem(CHOICE_KEY) ?? "{}");
    } catch {
      return {};
    }
  });
  const [history, setHistory] = useState<
    (Session & { running: boolean; interrupted: boolean })[]
  >(
    [],
  );
  // The agent's own slash commands, and where the keyboard is in them. Opens on what this browser
  // remembers, then on what the server says: asked for at mount and again on the way into a slash
  // word, since the server learns them off the runs it pumps and the list grows as the panel is
  // used.
  const [commands, setCommands] = useState<string[]>(
    () => remembered()[agent] ?? [],
  );
  const [slashAt, setSlashAt] = useState(0);
  const [slashOff, setSlashOff] = useState(false);
  // What the box says, read back off it after every edit (chatDraft.ts). The box itself is the
  // truth — React renders it empty and never again, so it cannot fight the caret — and this is
  // the copy the palette, the send button and the message all read.
  const [draft, setDraft] = useState("");
  const [attached, setAttached] = useState<Attached[]>([]);
  // From the send until the server has answered it. `running` starts only once the answer is
  // in, and the box is emptied then too, so without this a second Enter — a key held down
  // repeats — posted the same message and its images again, to be told an agent was already
  // running.
  const [sending, setSending] = useState(false);
  // Messages sent while an agent was running, to go one at a time as each run ends — the server
  // takes one run at a time. In sessionStorage like the runs, so a reload of the window does
  // not lose them.
  const [queued, setQueued] = useState<Queued[]>(() =>
    JSON.parse(sessionStorage.getItem(QUEUE_KEY) ?? "[]"),
  );
  // What was sent before, newest last, for the up arrow to walk back through as a terminal does.
  // Across sessions like a shell's history file, capped, and never the same line twice running.
  // Text only: a picture is not in the box to recall, so its "#N" comes back as the words.
  const [sent, setSent] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem(SENT_KEY) ?? "[]"),
  );
  // How far back the arrows are: -1 is the box's own text, 0 the newest line sent.
  const [back, setBack] = useState(-1);
  // Arrival order, and it never goes back: see the numbers in the note above.
  const nextN = useRef(1);
  const [sendError, setSendError] = useState<string | null>(null);
  /** Whether the composer is ringing, to say a half-written message is waiting in it. Off again
   *  when the ring has faded, so the next one rings too. */
  const [cued, setCued] = useState(false);
  const abort = useRef(new AbortController());
  const log = useRef<HTMLDivElement>(null);
  /** Whether the log follows what arrives. Scrolling up to read stops it, so new output no longer
   *  yanks the reader back down; the arrow, or scrolling back to the end, starts it again. */
  const pinned = useRef(true);
  const [atEnd, setAtEnd] = useState(true);
  const composer = useRef<HTMLDivElement>(null);
  const files = useRef<HTMLInputElement>(null);
  const historyList = useRef<HTMLDivElement>(null);
  const agentMenu = useRef<HTMLDivElement>(null);
  const modelMenu = useRef<HTMLDivElement>(null);
  const effortMenu = useRef<HTMLDivElement>(null);

  const follow = (runId: string) => {
    const { signal } = abort.current;
    const update = (patch: (t: Turn) => Turn) =>
      setTurns((ts) => ts.map((t) => (t.runId === runId ? patch(t) : t)));
    followRun(
      runId,
      0,
      (frame) => update((t) => applyFrame(t, frame)),
      signal,
    ).catch((error) => {
      if (signal.aborted) return;
      // A run the server has no record of — one from before it kept runs on disk — replays as a
      // failure before a single frame. There is no conversation left to put an
      // error under, so the turn goes with it rather than standing in the log as an id.
      setTurns((ts) =>
        ts.flatMap((t) =>
          t.runId !== runId
            ? [t]
            : t.prompt || t.blocks.length
              ? [{ ...t, end: { ok: false, message: String(error) } }]
              : [],
        ),
      );
    });
  };

  useEffect(() => {
    abort.current = new AbortController();
    for (const t of turns) follow(t.runId);
    // An empty panel after a relaunch — sessionStorage goes with the window — opens on the
    // conversation the quit cut off, so its Continue is the first thing in view.
    if (!turns.length)
      void fetch("/__sp/agent/sessions")
        .then(async (res) => {
          const [newest] = res.ok ? await res.json() : [];
          if (newest?.interrupted) pick(newest);
        })
        .catch(() => {});
    void fetch(`/__sp/agent/agents`)
      .then(async (res) =>
        res.ok ? setAgents(await res.json()) : setSendError(await res.text()),
      )
      // No answer at all, as against a refusal: the dev server restarting under an edit.
      .catch((error) => setSendError(String(error)));
    return () => abort.current.abort();
    // Mount only: the turns to pick up again are the ones the page came back with.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sessionStorage.setItem(RUNS_KEY, JSON.stringify(turns.map((t) => t.runId)));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // Also on reopening: a hidden log has no scroll height to have been scrolled to.
    if (pinned.current) log.current?.scrollTo(0, log.current.scrollHeight);
  }, [turns, open, session]);

  const running = turns.find((t) => !t.end);
  const working: Working = {
    project: running?.project,
    slugs: running ? writingTo(running.blocks) : [],
  };
  const workingKey = JSON.stringify(working);
  // By value: `working` is a new object every render.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => props.onWorking?.(working), [workingKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(QUEUE_KEY, JSON.stringify(queued));
    } catch {
      // ponytail: images are data URLs and the tray takes 24 MB, sessionStorage a few; a queue
      // that does not fit lives to the next reload only. IndexedDB if that bites.
    }
  }, [queued]);
  // The id until the server's list arrives, a moment after mount.
  const nameOf = (id: AgentId) => agents.find((a) => a.id === id)?.name ?? id;
  const title = turns[0]?.title ?? session?.title ?? nameOf(agent);

  const row = agents.find((a) => a.id === agent);
  const choice = choices[agent] ?? {};
  const picked = row?.models.find((m) => m.id === choice.model);
  // A model may take levels its agent does not list; codex's newest take two more than the rest.
  const efforts = picked?.efforts ?? row?.efforts ?? [];
  // What actually goes with the message. A choice the agent has since stopped offering — a model
  // dropped from its list, a level the picked model has not got — is not sent: the CLI's own
  // setting stands rather than a run failing on a name from last week.
  const model = picked?.id ?? "";
  const effort =
    choice.effort && efforts.includes(choice.effort) ? choice.effort : "";
  const slider = effort
    ? efforts.indexOf(effort)
    : Math.floor(efforts.length / 2);
  // The newest turn that got as far as an answer; a run that failed before one never reports.
  // The window's size is only named at the end of a turn, so while one is still running it comes
  // from the last turn that finished — a window does not change size under you mid-run.
  const newest = [...turns].reverse();
  const usage = newest.find((t) => t.usage)?.usage;
  const limit =
    usage?.window ?? newest.find((t) => t.usage?.window)?.usage?.window;

  // The palette is open while the draft ends in an unfinished word starting with a slash: "/cl"
  // and "fix the header /cl", not "/clone-prototype the app", since an argument means the
  // command has been chosen. The end of the draft rather than the caret, which is where typing
  // leaves it.
  const typing = slashWord(draft);
  const found =
    typing === undefined || slashOff
      ? []
      : commands.filter((c) => c.toLowerCase().includes(typing.toLowerCase()));
  // A word already typed out in full has nothing left to choose, so the palette closes and Enter
  // sends. Open, it would swallow that Enter to pick what is on screen: all the pick added was
  // the trailing space, so Enter appeared to do nothing and it took a second one to send. Any
  // exact match closes it, not only a sole one — `review` is also a substring of
  // `security-review`, and waiting for one match left those two, and `agents` among the rest,
  // taking two Enters forever.
  const matches = found.some((c) => c === typing) ? [] : found;
  const at = Math.min(slashAt, matches.length - 1);

  /** The caret put back just past `node`'s `offset`, which is where every edit below leaves it. */
  const caretAt = (node: Node, offset: number) => {
    const range = document.createRange();
    range.setStart(node, offset);
    range.collapse(true);
    const selection = getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  /** A command badge: atomic, like the reference chips, so Backspace takes the whole word. */
  const badgeFor = (command: string) => {
    const badge = document.createElement("span");
    badge.className = "sp-chat-cmd";
    badge.contentEditable = "false";
    badge.textContent = command;
    return badge;
  };

  // The word a draft opens with, drawn as a badge in the box the moment the space after it is
  // typed. Only ever the first word of the first text node, and only while the caret sits just
  // past that space — which is exactly where typing it leaves the caret — so the caret is put
  // back by construction rather than by measuring where it was.
  const badgeCommand = (box: HTMLDivElement) => {
    const first = box.firstChild;
    if (!first || first.nodeType !== Node.TEXT_NODE) return;
    const m = /^(\/\S+)(\s)/.exec(first.textContent ?? "");
    const selection = getSelection();
    if (
      !m ||
      selection?.anchorNode !== first ||
      selection.anchorOffset !== m[1]!.length + 1
    )
      return;
    first.textContent = first.textContent!.slice(m[0].length);
    box.prepend(badgeFor(m[1]!), document.createTextNode(m[2]!));
    caretAt(box.childNodes[1]!, 1);
  };

  const pickCommand = (name: string) => {
    const box = composer.current;
    if (!box || typing === undefined) return;
    // The palette is only open while the draft ends in the slash word, so that word is the tail
    // of the last text in the box; the badge takes its place and whatever came before it stays.
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    let last: Text | null = null;
    while (walker.nextNode()) last = walker.currentNode as Text;
    if (!last) return;
    last.data = last.data.slice(0, -(typing.length + 1));
    const space = document.createTextNode(" ");
    last.after(badgeFor(`/${name}`), space);
    if (!last.data) last.remove();
    setDraft(readDraft(box));
    setSlashAt(0);
    box.focus();
    caretAt(space, 1);
  };

  /** A reference to an attached image: its thumbnail and its number, one atomic element. */
  const chipFor = (i: Attached) => {
    const chip = document.createElement("span");
    chip.className = "sp-chat-ref";
    chip.contentEditable = "false";
    chip.dataset.ref = String(i.n);
    chip.title = i.name;
    const thumb = document.createElement("img");
    // A board still being drawn has no picture yet; the thumb shimmers until addImages fills it.
    if (i.url) thumb.src = i.url;
    else chip.classList.add("sp-chat-ref-pending");
    thumb.alt = "";
    chip.append(thumb, `#${i.n}`);
    return chip;
  };

  /**
   * Back to #1 once nothing points at a number any more: no tile in the tray, and no chip left in
   * the box. A number is never reused while something does point at it, because renumbering under
   * a sentence already typed would silently repoint it — but a false start that has been cleared
   * away leaves nothing to repoint, and the next picture there should be #1 and not #2.
   *
   * `left` rather than `attached`, since the tray this is deciding about is the one after the
   * removal and React has not re-rendered with it yet.
   */
  const renumber = (left: Attached[]) => {
    if (
      left.length === 0 &&
      composer.current &&
      namedPictures(composer.current).length === 0
    )
      nextN.current = 1;
  };

  /** The numbers the box named when it was last read, to see what has left it since. */
  const named = useRef<number[]>([]);

  /**
   * The box, read back for the pictures it names. One that has gone from it since the last read
   * goes from the tray too: deleting "#2" out of the sentence is how someone says they did not
   * mean that picture after all, and a tile left standing for it would be an attachment the
   * message no longer mentions. A picture the box has never named is left alone — most are
   * attached before a word is typed, and the tray is a tray before it is a sentence.
   */
  const syncRefs = (box: HTMLElement) => {
    const now = namedPictures(box);
    const gone = named.current.filter((n) => !now.includes(n));
    named.current = now;
    // Read the tray rather than close over it: this also runs from the read that attaches a
    // picture and cites it in one go, where `attached` is still the tray from before it landed.
    if (gone.length) setAttached((a) => a.filter((i) => !gone.includes(i.n)));
    // The box emptying while the tray already was is the one restart nothing else sees, since no
    // tile changed hands for the effect below to notice.
    renumber(attached);
  };

  // The other restart: the tray itself going empty, whoever emptied it — the ✕ on a tile, a chip
  // deleted above, sending, starting over. After the render that empties it, so the box it asks
  // about is the one on screen and not the one the handler was holding.
  useEffect(() => {
    renumber(attached);
    // renumber is this render's, and reads a ref and the DOM; the tray is what it waits on.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [attached]);

  // One of the atomic things above, written where the caret is, with a space after it so the next
  // word is not glued to it. Nothing is inserted into one, since none of them is editable.
  const insertAtCaret = (node: HTMLElement) => {
    const box = composer.current;
    if (!box) return;
    box.focus();
    const selection = getSelection();
    const range =
      selection?.rangeCount &&
      box.contains(selection.getRangeAt(0).commonAncestorContainer)
        ? selection.getRangeAt(0)
        : null;
    if (range) {
      range.deleteContents();
      range.insertNode(node);
    } else {
      box.append(node);
    }
    const space = document.createTextNode(" ");
    node.after(space);
    caretAt(space, 1);
    setDraft(readDraft(box));
    // A chip written here is one more number the box names, and the caret may have been sitting
    // on a selection that held another: read it back rather than assume what changed.
    syncRefs(box);
  };

  /** The file as the tray holds it: the data URL the reader produced. */
  const readFile = (file: File) =>
    new Promise<string>((done, fail) => {
      const reader = new FileReader();
      reader.onload = () => done(String(reader.result));
      reader.onerror = () => fail(reader.error ?? new Error(file.name));
      reader.readAsDataURL(file);
    });

  // The tray as of the last render, for an add to read after its files have been read: by then
  // `attached` is the tray from before, and what a pick, a paste and a ✕ have done since is here.
  const tray = useRef(attached);
  tray.current = attached;
  // Adds run one after another. Two at once — a paste while a drop is still reading — would
  // each measure the tray without the other, and each number a picture the other has already
  // numbered; the second then waits, and reads a tray the first has finished with.
  const adds = useRef(Promise.resolve());

  // The boards being drawn, by name, so a picture that arrives for one whose tile is gone is dropped.
  const awaiting = useRef(new Set<string>());

  const addImages = (list: FileList | File[] | null, cite = false) =>
    (adds.current = adds.current
      .then(async () => {
        const given = [...(list ?? [])];
        // A board refused here is not coming after all, so its tile says so rather than waiting.
        const refuse = (message: string) => {
          for (const f of given) if (awaiting.current.has(f.name)) fail(f.name);
          setSendError(message);
        };
        const taken = given.filter((f) => ATTACH_TYPES.includes(f.type));
        // A file the agent could not look at is refused here rather than by the server, and said:
        // the file dialog offers only these, but a drop, a paste and the canvas hand over anything.
        setSendError(
          taken.length < given.length
            ? "only png, jpeg, gif, webp and svg pictures can be attached"
            : null,
        );
        if (taken.length === 0) return;
        // What cannot fit whatever the tray holds is refused before it is read: a read is the
        // whole file in memory, a third larger. Measured on the files as they arrived, since
        // that is what a drawing has to hold in memory too.
        const tooBig = `those are too large to attach; keep them under about ${MAX_IMAGE_BYTES / 1_000_000} MB together`;
        if (taken.reduce((n, f) => n + f.size, 0) > MAX_IMAGE_BYTES)
          return refuse(tooBig);
        // A vector is drawn into a PNG here, at the one door every attachment comes through —
        // the picker, a paste, a drop, and the + on a canvas shape, which hands its asset over
        // with whatever type the asset has. Past this line everything is an IMAGE_TYPE, so the
        // tray, the limits, the preview and the agent all go on seeing what they always saw.
        const picked = await Promise.all(
          taken.map((f) => (f.type === SVG_TYPE ? rasterizeSvg(f) : f)),
        );
        // Read first and numbered after, which is what lets the same picture keep the number it
        // already has: pressing + on one twice is one picture said twice, not two — and not a
        // twenty-first, so the limits are over what is new. Still numbered in the order they
        // were picked rather than the order the reads came back in, so three files chosen at
        // once are #1, #2, #3 as they appear in the dialog.
        const urls = await Promise.all(picked.map(readFile));
        // A board's picture goes into the tile put up for it while it was being drawn, and a
        // board whose tile was removed meanwhile — up to this line, reads included — is dropped.
        const waiting = (file: File) =>
          tray.current.find((t) => t.state && t.name === file.name);
        const read = picked
          .map((file, i) => ({ file, url: urls[i]! }))
          .filter(
            ({ file }) => !awaiting.current.has(file.name) || waiting(file),
          );
        const novel = read.filter(
          ({ file, url }, i) =>
            !waiting(file) &&
            !tray.current.some((t) => t.url === url) &&
            read.findIndex((r) => r.url === url) === i,
        );
        // Both limits are the server's (agents.ts), said here before anything is sent, and over
        // the whole tray, since the server sees the whole tray and not this pick.
        if (tray.current.length + novel.length > MAX_IMAGES)
          return refuse(
            `that is too many to attach; keep it to ${MAX_IMAGES} images`,
          );
        const size = read
          .filter((r) => novel.includes(r) || waiting(r.file))
          .reduce((n, r) => n + r.file.size, 0);
        if (
          tray.current.reduce((n, i) => n + i.size, 0) + size >
          MAX_IMAGE_BYTES
        )
          return refuse(tooBig);
        const fresh: Attached[] = novel.map(({ file, url }) => ({
          n: nextN.current++,
          name: file.name,
          type: file.type,
          size: file.size,
          url,
        }));
        const filled = tray.current.map((t) => {
          const r = t.state && read.find((r) => r.file.name === t.name);
          return r
            ? {
                n: t.n,
                name: t.name,
                type: r.file.type,
                size: r.file.size,
                url: r.url,
              }
            : t;
        });
        for (const t of filled)
          if (!tray.current.includes(t))
            for (const thumb of composer.current?.querySelectorAll<HTMLImageElement>(
              `.sp-chat-ref-pending[data-ref="${t.n}"] img`,
            ) ?? []) {
              thumb.src = t.url;
              thumb.parentElement!.classList.remove("sp-chat-ref-pending");
            }
        for (const { file } of read) awaiting.current.delete(file.name);
        const said = read.map(
          ({ url }) =>
            filled.find((t) => t.url === url) ??
            fresh.find((f) => f.url === url)!,
        );
        // Written to the ref as well as set, so the add queued behind this one reads this tray
        // rather than the one React has not rendered yet.
        tray.current = [...filled, ...fresh].sort((x, y) => x.n - y.n);
        setAttached(tray.current);
        // Numbered into the sentence where the caret already is, so the picture the writer has
        // just put there is named without a second click on the tile that has appeared above —
        // and named once however many times it is added. Both ways in that land on one picture
        // do this: the + on a canvas shape, and a paste, which is the screenshot in the
        // clipboard going into the sentence being typed. A pick and a drop are a handful chosen
        // at a distance from the caret, and which of them the message is about is still to be
        // said.
        const box = composer.current;
        if (cite && box)
          for (const image of said)
            if (!namedPictures(box).includes(image.n))
              insertAtCaret(chipFor(image));
      })
      .catch((error) => {
        for (const f of list ?? [])
          if (awaiting.current.has(f.name)) fail(f.name);
        setSendError(`could not attach that: ${String(error)}`);
      }));

  /**
   * A board, from the canvas: its tile and its number up the moment it is asked for, and its
   * drawing asked of the server, to land in that tile. Asked for again it keeps the tile it has —
   * one already there or on its way is only named again, and one that failed is drawn again.
   */
  const addBoard = (name: string, src: string) => {
    let tile = tray.current.find((t) => t.name === name);
    if (!tile && tray.current.length >= MAX_IMAGES)
      return setSendError(
        `that is too many to attach; keep it to ${MAX_IMAGES} images`,
      );
    const draw = !tile || tile.state === "failed";
    if (tile?.state === "failed") {
      tile = { ...tile, state: "pending" };
      for (const chip of composer.current?.querySelectorAll(
        `.sp-chat-ref-failed[data-ref="${tile.n}"]`,
      ) ?? [])
        chip.classList.replace("sp-chat-ref-failed", "sp-chat-ref-pending");
    }
    tile ??= {
      n: nextN.current++,
      name,
      type: "",
      size: 0,
      url: "",
      state: "pending",
    };
    const next = tile;
    tray.current = [...tray.current.filter((t) => t.n !== next.n), next].sort(
      (x, y) => x.n - y.n,
    );
    setAttached(tray.current);
    const box = composer.current;
    if (box && !namedPictures(box).includes(next.n))
      insertAtCaret(chipFor(next));
    if (!draw) return;
    awaiting.current.add(name);
    fetch(src)
      .then(async (shot) => {
        if (!shot.ok) throw new Error(await shot.text());
        const png = await shot.blob();
        void addImages([new File([png], name, { type: png.type })], true);
      })
      .catch((error) => {
        adds.current = adds.current.then(() => fail(name));
        setSendError(String(error));
      });
  };

  // What the buttons on a canvas shape hand over (canvasAttach.tsx): a picture, attached and named
  // in the sentence, or the reason there is none. A mockup arrives as a picture of itself, called
  // by its own path, so pointing at one puts the same tile and the same number in the panel that
  // pointing at a picture does — and the path is what the tile is captioned with.
  // No dependency list, so every render leaves a listener holding that render's `addImages` and
  // its numbering — a listener that stayed would be attaching to the draft the panel had at mount.
  useEffect(() => {
    const take = (event: Event) => {
      const detail = (event as CustomEvent<CanvasAttachDetail>).detail;
      // A message cannot be written into a panel that is away. Flushed, because a panel that was
      // away is `display: none` (.sp-chat-collapsed) until this render lands, and focus inside a
      // hidden box puts the caret nowhere.
      flushSync(() => props.chat.show(true));
      // In line with the adds, so a board's number comes after a picture asked for before it
      // that is still being read.
      if (detail.kind === "board") {
        adds.current = adds.current.then(() =>
          addBoard(detail.name, detail.src),
        );
        return;
      }
      if (detail.kind === "error") return setSendError(detail.message);
      if (detail.kind === "send") {
        const message = { message: detail.text, images: [] };
        if (running) setQueued((q) => [...q, message]);
        else void post(message);
        return;
      }
      // Half a sentence, from the strip's "+", which is only any use if the reader sees they are
      // being asked to finish it: the caret goes to the end of it and the box rings once (the
      // cue below). Over nothing the user wrote, since a message they had begun stays theirs to
      // finish — that one is focused where it is rather than refilled.
      if (detail.kind === "draft") {
        const box = composer.current!;
        if (draft.trim()) {
          box.focus();
          caretAt(box, box.childNodes.length);
        } else fill(detail.text);
        setCued(true);
        return;
      }
      void addImages([detail.file], true);
    };
    window.addEventListener(CANVAS_ATTACH, take);
    return () => window.removeEventListener(CANVAS_ATTACH, take);
  });

  /** A board that could not be drawn: its tile and its chips go amber, to be asked for again. */
  const fail = (name: string) => {
    awaiting.current.delete(name);
    setAttached(
      (tray.current = tray.current.map((t) =>
        t.state && t.name === name ? { ...t, state: "failed" } : t,
      )),
    );
    for (const chip of composer.current?.querySelectorAll(
      ".sp-chat-ref-pending",
    ) ?? [])
      if (chip.getAttribute("title") === name)
        chip.classList.replace("sp-chat-ref-pending", "sp-chat-ref-failed");
  };

  // The tile goes; the chips that named it stay where they were written, struck through and
  // without their picture. A sentence is not rewritten because what it pointed at was removed.
  const detach = (n: number) => {
    const left = attached.filter((i) => i.n !== n);
    setAttached(left);
    for (const chip of composer.current?.querySelectorAll(
      `[data-ref="${n}"]`,
    ) ?? []) {
      chip.classList.add("sp-chat-ref-gone");
      chip.querySelector("img")?.remove();
    }
  };

  const prefer = (patch: { model?: string; effort?: string }) => {
    const next = { ...choices, [agent]: { ...choice, ...patch } };
    localStorage.setItem(CHOICE_KEY, JSON.stringify(next));
    setChoices(next);
  };

  /** The box holding `text` and nothing else, with the caret after it. */
  const fill = (text: string) => {
    const box = composer.current;
    if (!box) return;
    box.replaceChildren(...(text ? [document.createTextNode(text)] : []));
    setDraft(text);
    box.focus();
    caretAt(box.firstChild ?? box, text.length);
  };

  /** The box and the tray emptied, once what they held is away. */
  const clear = (message?: string) => {
    if (message && message !== sent.at(-1)) {
      const next = [...sent, message].slice(-50);
      setSent(next);
      localStorage.setItem(SENT_KEY, JSON.stringify(next));
    }
    setBack(-1);
    composer.current?.replaceChildren();
    setDraft("");
    setAttached([]);
    // The sent message keeps its own numbers — the transcript draws them from the turn — so
    // the next one starts at #1 rather than carrying on from where this one stopped. The
    // emptied box is not a box that has had its chips deleted: forget them, or the first edit
    // after this would read them as gone and take the next message's pictures with them.
    named.current = [];
  };

  // A message goes with its pictures, so not while a board is still being drawn or failed to be.
  const pending = attached.filter((i) => i.state === "pending").length;
  const failed = attached.filter((i) => i.state === "failed").length;
  const unready = pending + failed > 0;

  /** One message to the server as a run; false when it was refused or never answered. */
  const post = async ({ message, images: attached }: Queued) => {
    setSendError(null);
    setSending(true);
    try {
      const res = await fetch(`/__sp/agent/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          canvas,
          project,
          session: session?.id,
          agent,
          model,
          effort,
          images: attached.map(({ n, name, type, url }) => ({
            n,
            name,
            type,
            data: url.slice(url.indexOf(",") + 1),
          })),
        }),
      });
      if (!res.ok) {
        setSendError(await res.text());
        return false;
      }
      const { runId, session: on } = await res.json();
      setSession(on);
      const images = attached.map(({ n, name }) => ({ n, name }));
      pinned.current = true;
      setTurns((ts) => [
        ...ts,
        { ...turnFor(runId), prompt: message, agent, images },
      ]);
      follow(runId);
      return true;
    } catch (error) {
      // No answer at all, as against a refusal: the dev server restarting under an edit. Left
      // to itself this was an unhandled rejection, and a message that looked sent and ignored.
      setSendError(String(error));
      return false;
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    const message = draft.trim();
    if (!message || sending || unready) return;
    // Sending clears the draft without passing through onInput, so an Escape that closed the
    // palette for this word has to be forgotten here too, or the next word never opens one.
    setSlashOff(false);
    // While an agent is at work, Enter queues, as in Claude Code's terminal: the box empties as
    // if sent, and the message goes when the run ends.
    if (running) {
      setQueued((q) => [...q, { message, images: attached }]);
      return clear(message);
    }
    // Emptied only once it is away — a refused message is still in the box, chips and all, to
    // be fixed and sent again.
    if (await post({ message, images: attached })) clear(message);
  };

  // The queue drains one message per run ended, not one per render: the head is taken off before
  // the post, and put back if the post fails, so a refusal shows its error and waits for the next
  // end rather than retrying every time something else changes. The ref rather than `sending`,
  // because StrictMode runs a mount effect twice on the same state.
  const draining = useRef(false);
  useEffect(() => {
    if (running || draining.current || !queued.length) return;
    const [next, ...rest] = queued;
    draining.current = true;
    setQueued(rest);
    void post(next!).then((ok) => {
      draining.current = false;
      if (!ok) setQueued((q) => [next!, ...q]);
    });
    // The head is read when a run ends, and only then.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [!!running]);

  // At mount, so the seconds a cold server spends asking the CLI are spent while the canvas is
  // being looked at, and again on the way into a slash word, so a list learned since — off a run,
  // or off a probe that answered after this asked — is the one the palette opens with. An empty
  // answer is never kept: a server that has just restarted has forgotten what it told this panel,
  // which is not the same as the agent having no commands.
  useEffect(() => {
    void fetch(`/__sp/agent/commands?agent=${agent}`)
      .then(async (res) => {
        const list = (res.ok ? await res.json() : []) as string[];
        if (!list.length) return;
        setCommands(list);
        localStorage.setItem(
          COMMANDS_KEY,
          JSON.stringify({ ...remembered(), [agent]: list }),
        );
      })
      // No answer at all: the dev server restarting under an edit, as with the list of agents.
      .catch((error) => setSendError(String(error)));
    // The word itself does not change the list; starting one, or changing agent, does.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [typing === undefined, agent]);

  const switchTo = (id: AgentId) => {
    props.chat.choose(id);
    // The other agent's commands are not this one's, and the ask above lands seconds later.
    setCommands(remembered()[id] ?? []);
  };

  const newSession = () => {
    // The next message starts a session the agent has no memory of, with nothing above it in the
    // log. A run still going keeps going and its session stays in History — stopping one is what
    // the Stop button is for.
    abort.current.abort();
    abort.current = new AbortController();
    pinned.current = true;
    setTurns([]);
    setSession(null);
    composer.current?.replaceChildren();
    setDraft("");
    setAttached([]);
    named.current = [];
    setSendError(null);
    composer.current?.focus();
  };

  // A session is one agent's conversation, which the other cannot resume.
  const choose = (id: AgentId) => {
    agentMenu.current?.hidePopover();
    if (id !== agent) newSession();
    switchTo(id);
  };

  const openHistory = async () => {
    try {
      const res = await fetch("/__sp/agent/sessions");
      if (!res.ok) return setSendError(await res.text());
      setHistory(await res.json());
    } catch (error) {
      setSendError(String(error));
    }
  };

  const pick = (picked: Session) => {
    historyList.current?.hidePopover();
    // Opening a session picks the agent that held it: the header mark, the model and effort
    // under the composer, and where the next message goes all mean the session on screen, not
    // whatever was selected before it was opened.
    switchTo(picked.agent);
    // The picked session may be the one on screen, and two follows of one run draw it twice.
    abort.current.abort();
    abort.current = new AbortController();
    setSession({ id: picked.id, title: picked.title });
    // Its turns, as far as the server still holds them: a run it has forgotten drops out of the
    // log (follow), though the agent still remembers it.
    pinned.current = true;
    setTurns(picked.runs.map(turnFor));
    for (const id of picked.runs) follow(id);
  };

  return (
    <>
      <aside
        className={
          open ? "sp-panel sp-chat" : "sp-panel sp-chat sp-chat-collapsed"
        }
        aria-label="Agent chat"
      >
        <header className="sp-head">
          <span className="sp-head-name" title={title}>
            {title}
          </span>
          <button
            type="button"
            className="sp-head-x"
            onClick={newSession}
            aria-label="New session"
            title="New session"
          >
            <Plus />
          </button>
          <button
            type="button"
            className="sp-head-x"
            popoverTarget="sp-chat-history"
            onClick={() => void openHistory()}
            aria-label="History"
            title="History"
          >
            <ClockRewind />
          </button>
        </header>
        <div
          id="sp-chat-models"
          popover="auto"
          className="sp-chat-picker"
          role="menu"
          ref={modelMenu}
        >
          {[{ id: "", name: "Default" }, ...(row?.models ?? [])].map((m) => (
            <button
              key={m.id}
              type="button"
              role="menuitemradio"
              aria-checked={m.id === model}
              className="sp-menu-row"
              onClick={() => {
                modelMenu.current?.hidePopover();
                prefer({ model: m.id });
              }}
            >
              <span className="sp-chat-picker-name">
                {m.name}
                {!m.id && <small>Whatever {nameOf(agent)} is set to use</small>}
              </span>
              {m.id === model && <Check className="sp-menu-ck" />}
            </button>
          ))}
        </div>
        <div
          id="sp-chat-efforts"
          popover="auto"
          className="sp-chat-picker sp-chat-efforts"
          ref={effortMenu}
        >
          <button
            type="button"
            role="menuitemradio"
            aria-checked={!effort}
            className="sp-menu-row"
            onClick={() => {
              effortMenu.current?.hidePopover();
              prefer({ effort: "" });
            }}
          >
            <span className="sp-chat-picker-name">
              Default
              <small>Whatever {nameOf(agent)} is set to use</small>
            </span>
            {!effort && <Check className="sp-menu-ck" />}
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(0, efforts.length - 1)}
            step={1}
            value={slider}
            list="sp-chat-effort-stops"
            aria-label="Reasoning effort"
            aria-valuetext={effortName(efforts[slider] ?? "")}
            onChange={(e) =>
              prefer({ effort: efforts[Number(e.target.value)] })
            }
          />
          {/* Native tick marks: one per level, so the track shows how many there are. */}
          <datalist id="sp-chat-effort-stops">
            {efforts.map((e) => (
              <option
                key={e}
                value={efforts.indexOf(e)}
                label={effortName(e)}
              />
            ))}
          </datalist>
          <p className="sp-chat-efforts-ends">
            <span>Faster</span>
            <span>Smarter</span>
          </p>
        </div>
        <div
          id="sp-chat-history"
          popover="auto"
          className="sp-chat-history"
          ref={historyList}
        >
          {history.length === 0 ? (
            <p className="sp-chat-dim">No sessions yet</p>
          ) : (
            history.map((s) => (
              <button
                key={s.id}
                type="button"
                className="sp-chat-history-row"
                data-status={s.running ? "running" : undefined}
                onClick={() => pick(s)}
              >
                <span className="sp-chat-mark" title={nameOf(s.agent)}>
                  <Mark agent={s.agent} size={12} />
                </span>
                <span className="sp-chat-history-title">{s.title}</span>
                <span className="sp-chat-dim">
                  {s.projects.map((p) => p.split(/[\\/]/).pop()).join(", ") ||
                    "No project"}{" "}
                  ·{" "}
                  {new Date(s.updated).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </button>
            ))
          )}
        </div>
        <div
          className="sp-chat-log"
          ref={log}
          onScroll={(e) => {
            const el = e.currentTarget;
            // A few pixels short still counts: zoom leaves scrollTop fractional.
            pinned.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 8;
            setAtEnd(pinned.current);
          }}
        >
          {turns.length === 0 && !session && (
            <p className="sp-chat-empty">
              Runs Claude Code with its permission prompts off, or Codex in its
              workspace sandbox, on the project in front — the same trust as
              running either in a terminal there. Right-click the mark at the
              top left to pick which. Ask for a board, a change to one, or about
              the code behind one.
            </p>
          )}
          {turns.length === 0 && session && (
            <p className="sp-chat-empty">
              {nameOf(agent)} remembers this session, but its turns ran before
              the app kept them, so there are none to show. The next message
              carries on from where it left off.
            </p>
          )}
          {turns.map((t) => (
            <article key={t.runId} className="sp-chat-turn">
              {/* A run the server has no record of — one from before runs were kept on disk —
                replays as an error with no prompt to put above it. */}
              {/* What was said, with the command and every reference drawn as they were written,
                and the pictures themselves under it: full height, never cropped, one scroller
                whatever their shapes. The bytes come back from the run rather than out of the
                event, so this survives a reload of the window. */}
              {t.prompt && (
                <div className="sp-chat-you">
                  <span className="sp-chat-say">
                    {t.prompt.split(/(^\/\S+|#\d+)/).map((piece, i) =>
                      i === 1 && piece.startsWith("/") ? (
                        <span key={i} className="sp-chat-cmd">
                          {piece}
                        </span>
                      ) : /^#\d+$/.test(piece) &&
                        t.images?.some(
                          (g) => g.n === Number(piece.slice(1)),
                        ) ? (
                        <span key={i} className="sp-chat-ref">
                          <img
                            src={`/__sp/agent/run/${t.runId}/image/${piece.slice(1)}`}
                            alt=""
                          />
                          {piece}
                        </span>
                      ) : (
                        piece
                      ),
                    )}
                  </span>
                  {t.images && t.images.length > 0 && (
                    <span className="sp-chat-strip">
                      {t.images.map((g) => (
                        <a
                          key={g.n}
                          className="sp-chat-shot"
                          href={`/__sp/agent/run/${t.runId}/image/${g.n}`}
                          target="_blank"
                          rel="noreferrer"
                          title={g.name}
                        >
                          <img
                            src={`/__sp/agent/run/${t.runId}/image/${g.n}`}
                            alt={g.name}
                          />
                          <span className="sp-chat-num">#{g.n}</span>
                        </a>
                      ))}
                    </span>
                  )}
                </div>
              )}
              {t.agent && (
                <span className="sp-chat-mark" title={nameOf(t.agent)}>
                  <Mark agent={t.agent} size={12} />
                </span>
              )}
              {t.blocks.map((b, i) =>
                b.kind === "text" ? (
                  <div
                    key={i}
                    className="sp-chat-md"
                    // A link opens beside the canvas rather than in place of it: in a browser a
                    // tab, in the app a window, or the browser for a web address (desktop/main.ts).
                    onClick={(e) => {
                      const a = (e.target as Element).closest("a[href]");
                      if (!(a instanceof HTMLAnchorElement)) return;
                      e.preventDefault();
                      window.open(a.href, "_blank", "noreferrer");
                    }}
                    // Sanitized in markdown.ts; nothing else reaches this attribute.
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(b.text) }}
                  />
                ) : b.kind === "thinking" ? (
                  <p key={i} className="sp-chat-tool">
                    <b>Thinking</b>
                  </p>
                ) : (
                  // What the call drew, under the line that made it: a grid, a crop, a screenshot
                  // the agent read back. Same strip as the sent message's, so a picture looks the
                  // same whichever end of the conversation put it there.
                  <Fragment key={b.id}>
                    <p className="sp-chat-tool" data-ok={b.ok}>
                      <b>{b.name}</b>
                      <span>{b.detail}</span>
                    </p>
                    {b.shots && b.shots.length > 0 && (
                      <span className="sp-chat-strip">
                        {b.shots.map((s) =>
                          "k" in s ? (
                            <a
                              key={s.k}
                              className="sp-chat-shot"
                              href={`/__sp/agent/run/${t.runId}/shot/${s.k}`}
                              target="_blank"
                              rel="noreferrer"
                              title={b.detail}
                            >
                              <img
                                src={`/__sp/agent/run/${t.runId}/shot/${s.k}`}
                                alt={b.detail}
                              />
                            </a>
                          ) : null,
                        )}
                      </span>
                    )}
                  </Fragment>
                ),
              )}
              {!t.end ? (
                <p className="sp-chat-dim">Working…</p>
              ) : t.end.ok ? null : t.end.interrupted ? (
                <div className="sp-chat-interrupted">
                  <p>
                    <strong>Interrupted.</strong> {t.end.message} What it
                    changed so far is on disk.
                  </p>
                  {/* The newest turn only, and gone once anything is sent after it. */}
                  {t === turns.at(-1) && !running && (
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() =>
                        void post({ message: CONTINUE, images: [] })
                      }
                    >
                      Continue
                    </button>
                  )}
                </div>
              ) : (
                <p className="sp-chat-error">{t.end.message}</p>
              )}
            </article>
          ))}
          {/* What is waiting for the run above to end: the bubble each will be, faded, with a way
            out. Editing one is taking it out and typing it again. */}
          {queued.map((q, i) => (
            <div key={i} className="sp-chat-you sp-chat-queued">
              <span className="sp-chat-say">
                {q.message}
                {q.images.length > 0 &&
                  ` (${q.images.length} ${q.images.length === 1 ? "image" : "images"})`}
              </span>
              <button
                type="button"
                className="sp-chat-unqueue"
                aria-label="Remove queued message"
                title="Remove"
                onClick={() => setQueued((qs) => qs.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </div>
          ))}
          {!atEnd && (
            <button
              type="button"
              className="sp-chat-to-end"
              aria-label="Scroll to latest"
              title="Scroll to latest"
              onClick={() =>
                log.current?.scrollTo({
                  top: log.current.scrollHeight,
                  behavior: "smooth",
                })
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 5.5 7 8.5 10 5.5" />
              </svg>
            </button>
          )}
        </div>
        {/* What is attached, in the order it arrived. The tile is a crop — it only has to say which
          image this is — and clicking it writes that number into the sentence. */}
        {attached.length > 0 && (
          <>
            <p className="sp-chat-hint">
              {pending
                ? `Preparing ${pending} image${pending > 1 ? "s" : ""}…`
                : failed
                  ? "A board could not be drawn — press its + again, or remove it to send"
                  : "Attached — click a tile to put its number in the message"}
            </p>
            <div className="sp-chat-tray">
              {attached.map((i) => (
                <figure
                  key={i.n}
                  className={`sp-chat-tile${i.state ? ` sp-chat-tile-${i.state}` : ""}`}
                >
                  <button
                    type="button"
                    className="sp-chat-thumb"
                    onClick={() => insertAtCaret(chipFor(i))}
                    title={
                      i.state === "failed"
                        ? "Could not draw this board — press its + to try again"
                        : `Write #${i.n} into the message`
                    }
                  >
                    {i.url ? (
                      <img src={i.url} alt={i.name} />
                    ) : (
                      <span className="sp-chat-wait" />
                    )}
                    <span className="sp-chat-num">#{i.n}</span>
                  </button>
                  <span
                    className="sp-chat-x"
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove image #${i.n}`}
                    onClick={() => detach(i.n)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        detach(i.n);
                      }
                    }}
                  >
                    ✕
                  </span>
                  {/* The tile is 76px and the caption is what says which of them this is, so a
                    board shows the board and not the canvas it is in — a path ellipsised from
                    the right is the same dozen characters on every tile in the folder. The whole
                    of it is still the tooltip, the alt text and what the agent is handed. */}
                  <figcaption className="sp-chat-name" title={i.name}>
                    {i.name.split("/").pop()}
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
        <form
          className={
            cued ? "sp-chat-composer sp-chat-cued" : "sp-chat-composer"
          }
          // The one animation that ends in here, so nothing else can take the ring off early:
          // the spinner beside Send runs forever.
          onAnimationEnd={() => setCued(false)}
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void addImages(e.dataTransfer.files);
          }}
        >
          {/* Uncontrolled on purpose: React renders it empty and never touches it again, so it
            cannot move the caret out from under someone mid-word. The box is the truth and
            `draft` is the reading of it (chatDraft.ts). */}
          <div
            ref={composer}
            className="sp-chat-draft"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label={`Message to ${nameOf(agent)}`}
            data-placeholder={
              running
                ? "Working… Enter queues a message"
                : "Type / for commands"
            }
            // For the placeholder: typed into and then emptied, the box keeps a lone <br>, which
            // is not `:empty` to CSS, and a box that looks blank is one that says nothing.
            data-empty={draft.trim() ? undefined : ""}
            onInput={(e) => {
              const box = e.currentTarget;
              badgeCommand(box);
              const text = readDraft(box);
              setDraft(text);
              setSlashAt(0);
              // A recalled line edited is the box's own again; the arrows move the caret from here.
              setBack(-1);
              // Every edit, since a chip is deleted like any other character.
              syncRefs(box);
              // Escape closes the palette for the word it was typed in; the next one opens again.
              if (slashWord(text) === undefined) setSlashOff(false);
            }}
            onPaste={(e) => {
              e.preventDefault();
              if (e.clipboardData.files.length)
                return void addImages(e.clipboardData.files, true);
              const text = e.clipboardData.getData("text/plain");
              // Links to boards and pictures of the canvas in the frame, one a line, are those
              // shapes' chips.
              const links = text.split(/\s+/).filter(Boolean);
              if (
                links.length &&
                document
                  .querySelector<HTMLIFrameElement>(".canvas-frame")
                  ?.contentWindow?.spCanvas?.attach(links)
              )
                return;
              // The text and not the markup that came with it: the box holds the chips it made
              // itself and nothing else. execCommand because it is the only insert that native
              // undo still knows about.
              document.execCommand("insertText", false, text);
            }}
            onKeyDown={(e) => {
              // Enter inside an IME composition picks the candidate; it is the editor's, not ours.
              // Safari reports the confirming Enter after the composition has ended, with the
              // legacy 229 as its only mark.
              if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229)
                return;
              if (matches.length > 0) {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const step = e.key === "ArrowDown" ? 1 : matches.length - 1;
                  return setSlashAt(
                    (i) =>
                      (Math.min(i, matches.length - 1) + step) % matches.length,
                  );
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  return pickCommand(matches[at]!);
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  return setSlashOff(true);
                }
              }
              // The arrows walk what was sent, as a terminal's do, but only from an empty box or
              // once already walking: in a draft with lines of its own they move the caret. Down
              // past the newest line is the empty box again.
              if (
                (e.key === "ArrowUp" || e.key === "ArrowDown") &&
                (back >= 0 || !draft)
              ) {
                const to =
                  e.key === "ArrowUp"
                    ? Math.min(back + 1, sent.length - 1)
                    : back - 1;
                if (to === back) return;
                e.preventDefault();
                setBack(to);
                return fill(to < 0 ? "" : sent[sent.length - 1 - to]!);
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          {/* Above the box, where the caret is. The agent runs the command itself — the panel only
            says which ones there are, and Enter takes the highlighted one. */}
          {matches.length > 0 && (
            <div
              className="sp-chat-slash"
              role="listbox"
              aria-label="Slash commands"
            >
              {matches.map((c, i) => (
                <button
                  key={c}
                  // The list scrolls, so the row the arrow keys land on has to bring itself into
                  // view; "nearest" does nothing when it already is.
                  ref={(el) => {
                    if (i === at) el?.scrollIntoView({ block: "nearest" });
                  }}
                  type="button"
                  role="option"
                  aria-selected={i === at}
                  className={
                    i === at ? "sp-menu-row sp-chat-slash-on" : "sp-menu-row"
                  }
                  onMouseEnter={() => setSlashAt(i)}
                  onClick={() => pickCommand(c)}
                >
                  /{c}
                </button>
              ))}
            </div>
          )}
          {/* One control, inside the box: the arrow the box invites, the square while it is busy. */}
          {running ? (
            <button
              type="button"
              className="sp-chat-submit"
              aria-label="Stop the agent"
              title="Stop"
              onClick={() =>
                void fetch(`/__sp/agent/run/${running.runId}/cancel`, {
                  method: "POST",
                })
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                aria-hidden="true"
              >
                <rect
                  x="4"
                  y="4"
                  width="6"
                  height="6"
                  rx="1.5"
                  fill="currentColor"
                />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              className="sp-chat-submit"
              disabled={!draft.trim() || sending || unready}
              aria-label="Send"
              title="Send — Enter"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M11.5 3v4.5H3.5" />
                <path d="M6 5 3.5 7.5 6 10" />
              </svg>
            </button>
          )}
        </form>
        {sendError && (
          <p className="sp-chat-error sp-chat-send-error">{sendError}</p>
        )}
        <div className="sp-chat-bar">
          <button
            type="button"
            className="sp-chat-attach"
            onClick={() => files.current?.click()}
            aria-label="Attach images"
            title="Attach images — or paste, or drop them into the box"
          >
            <Image />
          </button>
          <input
            ref={files}
            type="file"
            accept={ATTACH_TYPES.join(",")}
            multiple
            hidden
            onChange={(e) => {
              void addImages(e.target.files);
              // Cleared, or picking the same file twice in a row fires no change the second time.
              e.target.value = "";
            }}
          />
          <span
            className="sp-chat-perm"
            title={
              "Tool calls are not asked about: the process runs with bypassPermissions, the same " +
              "trust as running the CLI in a terminal. The panel cannot switch it."
            }
          >
            Bypass permissions
          </span>
          {row && row.models.length > 0 && (
            <button
              type="button"
              className="sp-chat-chip"
              popoverTarget="sp-chat-models"
              title={`The model ${nameOf(agent)} runs`}
            >
              {picked ? (
                picked.name
              ) : (
                <span className="sp-chat-dim">Model</span>
              )}
            </button>
          )}
          {efforts.length > 0 && (
            <button
              type="button"
              className="sp-chat-chip"
              popoverTarget="sp-chat-efforts"
              title="How hard the model thinks before answering"
            >
              {effort ? (
                effortName(effort)
              ) : (
                <span className="sp-chat-dim">Effort</span>
              )}
            </button>
          )}
          {usage && (
            <span
              className="sp-chat-ctx"
              title={
                "Context the last message used: the prompt and the answer, and as much of the " +
                "session before them as the agent carried into it."
              }
            >
              {tokens(usage.used)}
              {limit ? ` / ${tokens(limit)}` : ""}
            </span>
          )}
          {running && (
            <span className="sp-chat-spin" role="status" aria-label="Working" />
          )}
        </div>
      </aside>
      {/* Beside the panel rather than in it, where the panel being away would hide it with it. */}
      <div
        id="sp-chat-agents"
        popover="auto"
        className="sp-chat-agents"
        role="menu"
        ref={agentMenu}
      >
        {agents.map((a) => (
          <button
            key={a.id}
            type="button"
            role="menuitemradio"
            aria-checked={a.id === agent}
            className="sp-menu-row"
            disabled={!a.available}
            onClick={() => choose(a.id)}
          >
            <Mark agent={a.id} size={14} />
            <span className="sp-chat-agents-name">
              {a.name}
              {!a.available && <small>{a.missing}</small>}
            </span>
            {a.id === agent && <Check className="sp-menu-ck" />}
          </button>
        ))}
      </div>
    </>
  );
}
