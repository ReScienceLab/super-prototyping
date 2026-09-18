/**
 * The chat panel: a message to Claude Code or Codex, run in the user's project by the dev server,
 * and what it did, drawn as it happens. Dev server only — App.tsx mounts it under
 * import.meta.env.DEV, since a hosted build has no /__sp/agent endpoints and no process behind
 * them.
 *
 * The panel keeps the ids of its runs in sessionStorage and follows every one again after the
 * reload a board write causes, from event zero: the transcript is rebuilt, not saved, since the
 * server has the whole run (chatTransport.ts). One run at a time — two agents editing one project
 * would race each other — so Send is Stop while one is going.
 *
 * The header names the conversation, with the model's own title once it has given one, behind
 * the mark of the agent the next message goes to. The mark is the switch: it opens a menu of the
 * agents the server found on PATH, the choice lives in localStorage and travels with the
 * message, and each turn and history row carries the mark of the agent that ran it, which the
 * run's start event says. The clock lists the runs the server still holds, and the panel icon
 * folds the panel to a rail — the mark, which opens it again — that keeps following whatever is
 * running.
 *
 * Images are attached by number. The icon under the box, a paste, or a drop puts a
 * screenshot in the tray above it as #1, #2, #3; clicking a tile drops that number into the
 * sentence as a chip, so a message can say "borrow the button from #2 and the copy from #3" and
 * mean it. A picture handed over from the canvas writes its own chip as it lands, since one
 * pointed at is one the message is already about. The numbers are handed out in arrival order and never reused — removing #2 of three
 * leaves #1 and #3, and the next attachment is #4 — because renumbering would silently repoint a
 * sentence already typed. That is why the box is a contenteditable and not a textarea: a chip is
 * an element in the text, which a textarea cannot hold (chatDraft.ts reads it back).
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
 * its own picker draws, read from the list it caches. The token count is the last turn's, not
 * the conversation's, because every message is its own process with no memory of the last.
 */
import { Fragment, useContext, useEffect, useRef, useState } from "react";
import { useValue } from "tldraw";
import type { AgentId, AgentModel } from "./agents";
import type { RunSummary } from "./agentRun";
import { CANVAS_ATTACH, type CanvasAttachDetail } from "./canvasAttach";
import { CanvasChromeContext } from "./canvasChrome";
import { WELCOME_PAGE_SLUG } from "./canvasUrl";
import { readDraft } from "./chatDraft";
import { applyFrame, followRun, type Turn } from "./chatTransport";
import { ClaudeMark } from "./ClaudeMark";
import { CodexMark } from "./CodexMark";
import { Check, ClockRewind, Image, Plus } from "./geistIcons";
import { renderMarkdown } from "./markdown";

const RUNS_KEY = "sp-chat-runs";
const AGENT_KEY = "sp-chat-agent";
const CHOICE_KEY = "sp-chat-choice";
const COMMANDS_KEY = "sp-chat-commands";

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

function Mark({ agent, size }: { agent: AgentId; size?: number }) {
  const Agent = MARKS[agent];
  return <Agent size={size} />;
}

/** One entry of GET /__sp/agent/agents. */
interface AgentRow {
  id: AgentId;
  name: string;
  available: boolean;
  models: AgentModel[];
  efforts: string[];
  missing: string;
}

/** A turn with nothing in it yet: the run's events, from `start` on, fill in the rest. */
const turnFor = (runId: string): Turn => ({ runId, prompt: "", blocks: [] });

/** One attached image, as the composer holds it and as the run is posted it. */
interface Attached {
  n: number;
  name: string;
  type: string;
  /** Base64, no `data:` prefix — what the server writes to disk and hands the agent. */
  data: string;
}

const source = (i: Attached) => `data:${i.type};base64,${i.data}`;

export function ChatPanel() {
  const { editor, chatCollapsed } = useContext(CanvasChromeContext);
  const slug = useValue(
    "canvas slug",
    () => editor?.getCurrentPage().meta.canvasSlug as string | undefined,
    [editor],
  );
  // The welcome page is drawn by the app and has no folder, so it is no canvas to the agent.
  const canvas = slug && slug !== WELCOME_PAGE_SLUG ? slug : undefined;
  const [turns, setTurns] = useState<Turn[]>(() =>
    (JSON.parse(sessionStorage.getItem(RUNS_KEY) ?? "[]") as string[]).map(
      turnFor,
    ),
  );
  const [agent, setAgent] = useState<AgentId>(() => {
    const stored = localStorage.getItem(AGENT_KEY);
    return stored && stored in MARKS ? (stored as AgentId) : "claude";
  });
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
  const [history, setHistory] = useState<RunSummary[]>([]);
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
  // Arrival order, and it never goes back: see the numbers in the note above.
  const nextN = useRef(1);
  const [sendError, setSendError] = useState<string | null>(null);
  const abort = useRef(new AbortController());
  const log = useRef<HTMLDivElement>(null);
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
      // A run the server no longer has — it keeps the newest twenty, and a restart keeps none —
      // replays as a failure before a single frame. There is no conversation left to put an
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
    void fetch("/__sp/agent/agents").then(async (res) =>
      res.ok ? setAgents(await res.json()) : setSendError(await res.text()),
    );
    return () => abort.current.abort();
    // Mount only: the turns to pick up again are the ones the page came back with.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sessionStorage.setItem(RUNS_KEY, JSON.stringify(turns.map((t) => t.runId)));
    // Also on reopening: a hidden log has no scroll height to have been scrolled to.
    log.current?.scrollTo(0, log.current.scrollHeight);
  }, [turns, chatCollapsed]);

  const running = turns.find((t) => !t.end);
  // The id until the server's list arrives, a moment after mount.
  const nameOf = (id: AgentId) => agents.find((a) => a.id === id)?.name ?? id;
  const title = turns[0]?.title ?? nameOf(agent);

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
  // The newest turn that got as far as being charged for; a failed one never is.
  const usage = [...turns].reverse().find((t) => t.usage)?.usage;

  // The palette is open while the draft is a single unfinished word starting with a slash: "/cl"
  // and not "/clone-prototype the app", since an argument means the command has been chosen.
  const typing = /^\/(\S*)$/.exec(draft)?.[1];
  const found =
    typing === undefined || slashOff
      ? []
      : commands.filter((c) => c.toLowerCase().includes(typing.toLowerCase()));
  // A word that is already the only command it matches has nothing left to choose, so the palette
  // closes and Enter sends. Open, it would swallow that Enter to pick what is on screen. Typing
  // a command out in full and pressing Enter appeared to do nothing, because all the pick added
  // was the trailing space, and it took a second Enter to send.
  const matches = found.length === 1 && found[0] === typing ? [] : found;
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
    if (!box) return;
    // The palette is only open while the draft is that one word, so there is nothing else in the
    // box to keep.
    box.replaceChildren(badgeFor(`/${name}`), document.createTextNode(" "));
    setDraft(`/${name} `);
    setSlashAt(0);
    box.focus();
    caretAt(box.childNodes[1]!, 1);
  };

  /** A reference to an attached image: its thumbnail and its number, one atomic element. */
  const chipFor = (i: Attached) => {
    const chip = document.createElement("span");
    chip.className = "sp-chat-ref";
    chip.contentEditable = "false";
    chip.dataset.ref = String(i.n);
    chip.title = i.name;
    const thumb = document.createElement("img");
    thumb.src = source(i);
    thumb.alt = "";
    chip.append(thumb, `#${i.n}`);
    return chip;
  };

  /** A board named from the canvas: its path, atomic like the chips, and read back verbatim. */
  const fileFor = (path: string) => {
    const badge = document.createElement("span");
    badge.className = "sp-chat-file";
    badge.contentEditable = "false";
    badge.textContent = path;
    return badge;
  };

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
  };

  const addImages = (list: FileList | File[] | null, cite = false) => {
    const picked = [...(list ?? [])].filter((f) => f.type.startsWith("image/"));
    if (picked.length === 0) return;
    // The server refuses a body over about 48 MB, and base64 is a third larger than the file; a
    // number said here is better than one found out after the whole thing has been read and sent.
    if (picked.reduce((n, f) => n + f.size, 0) > 24_000_000)
      return setSendError(
        "those are too large to attach; keep them under about 24 MB together",
      );
    setSendError(null);
    // Numbered as they were picked and not as they finish being read: three files chosen at once
    // are #1, #2, #3 in that order, whatever order the reads come back in. Handing the numbers
    // out here also keeps the counter out of the state updater, which React may call twice.
    for (const [file, n] of picked.map((f) => [f, nextN.current++] as const)) {
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result);
        const image = {
          n,
          name: file.name,
          type: file.type,
          data: url.slice(url.indexOf(",") + 1),
        };
        setAttached((a) => [...a, image].sort((x, y) => x.n - y.n));
        // One picture, pointed at on the canvas: the sentence says which one without a second
        // click on the tile that has just appeared. A pick, a paste or a drop is a handful at
        // once, and which of them the message is about is still to be said.
        if (cite) insertAtCaret(chipFor(image));
      };
      reader.readAsDataURL(file);
    }
  };

  // What the buttons on a canvas shape hand over (canvasAttach.tsx): a board's path written into
  // the sentence, a picture both attached and named there, or the reason one of those did not work.
  // No dependency list, so every render leaves a listener holding that render's `addImages` and
  // its numbering — a listener that stayed would be attaching to the draft the panel had at mount.
  useEffect(() => {
    const take = (event: Event) => {
      const detail = (event as CustomEvent<CanvasAttachDetail>).detail;
      if (detail.kind === "error") return setSendError(detail.message);
      if (detail.kind === "image") return addImages([detail.file], true);
      setSendError(null);
      insertAtCaret(fileFor(detail.text));
    };
    window.addEventListener(CANVAS_ATTACH, take);
    return () => window.removeEventListener(CANVAS_ATTACH, take);
  });

  // The tile goes; the chips that named it stay where they were written, struck through and
  // without their picture. A sentence is not rewritten because what it pointed at was removed.
  const detach = (n: number) => {
    setAttached((a) => a.filter((i) => i.n !== n));
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

  const send = async () => {
    const message = draft.trim();
    if (!message || running) return;
    // Sending clears the draft without passing through onInput, so an Escape that closed the
    // palette for this word has to be forgotten here too, or the next word never opens one.
    setSlashOff(false);
    setSendError(null);
    const res = await fetch("/__sp/agent/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message,
        canvas,
        agent,
        model,
        effort,
        images: attached,
      }),
    });
    if (!res.ok) return setSendError(await res.text());
    // Emptied only once it is away — a refused message is still in the box, chips and all, to be
    // fixed and sent again.
    composer.current?.replaceChildren();
    setDraft("");
    setAttached([]);
    const { runId } = await res.json();
    const images = attached.map(({ n, name }) => ({ n, name }));
    setTurns((ts) => [
      ...ts,
      { ...turnFor(runId), prompt: message, agent, images },
    ]);
    follow(runId);
  };

  // At mount, so the seconds a cold server spends asking the CLI are spent while the canvas is
  // being looked at, and again on the way into a slash word, so a list learned since — off a run,
  // or off a probe that answered after this asked — is the one the palette opens with. An empty
  // answer is never kept: a server that has just restarted has forgotten what it told this panel,
  // which is not the same as the agent having no commands.
  useEffect(() => {
    void fetch(`/__sp/agent/commands?agent=${agent}`).then(async (res) => {
      const list = (res.ok ? await res.json() : []) as string[];
      if (!list.length) return;
      setCommands(list);
      localStorage.setItem(
        COMMANDS_KEY,
        JSON.stringify({ ...remembered(), [agent]: list }),
      );
    });
    // The word itself does not change the list; starting one, or changing agent, does.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [typing === undefined, agent]);

  const switchTo = (id: AgentId) => {
    localStorage.setItem(AGENT_KEY, id);
    setAgent(id);
    // The other agent's commands are not this one's, and the ask above lands seconds later.
    setCommands(remembered()[id] ?? []);
  };

  const choose = (id: AgentId) => {
    agentMenu.current?.hidePopover();
    switchTo(id);
  };

  const newSession = () => {
    // Runs are independent of each other already, so what this clears is the log in front of the
    // user: the next message starts a conversation with nothing above it. A run still going keeps
    // going and stays in History — stopping one is what the Stop button is for.
    abort.current.abort();
    abort.current = new AbortController();
    setTurns([]);
    composer.current?.replaceChildren();
    setDraft("");
    setAttached([]);
    setSendError(null);
    composer.current?.focus();
  };

  const openHistory = async () => {
    const res = await fetch("/__sp/agent/runs");
    if (!res.ok) return setSendError(await res.text());
    setHistory(await res.json());
  };

  const pick = (runId: string, ran: AgentId) => {
    historyList.current?.hidePopover();
    // Opening a conversation picks the agent that held it: the header mark, the model and effort
    // under the composer, and where the next message goes all mean the run on screen, not
    // whatever was selected before it was opened.
    switchTo(ran);
    // The picked run may be one already on screen, and two follows of one run draw it twice.
    abort.current.abort();
    abort.current = new AbortController();
    setTurns([turnFor(runId)]);
    follow(runId);
  };

  return (
    <aside
      className={
        chatCollapsed
          ? "sp-panel sp-chat sp-chat-collapsed"
          : "sp-panel sp-chat"
      }
      aria-label="Agent chat"
    >
      <header className="sp-head">
        <button
          type="button"
          className="sp-head-x"
          popoverTarget="sp-chat-agents"
          aria-label="Choose the agent"
          title={nameOf(agent)}
        >
          <Mark agent={agent} />
        </button>
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
          onChange={(e) => prefer({ effort: efforts[Number(e.target.value)] })}
        />
        {/* Native tick marks: one per level, so the track shows how many there are. */}
        <datalist id="sp-chat-effort-stops">
          {efforts.map((e) => (
            <option key={e} value={efforts.indexOf(e)} label={effortName(e)} />
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
          <p className="sp-chat-dim">No runs yet</p>
        ) : (
          history.map((r) => (
            <button
              key={r.id}
              type="button"
              className="sp-chat-history-row"
              data-status={r.status}
              onClick={() => pick(r.id, r.agent)}
            >
              <span className="sp-chat-mark" title={nameOf(r.agent)}>
                <Mark agent={r.agent} size={12} />
              </span>
              <span className="sp-chat-history-title">{r.title}</span>
              <span className="sp-chat-dim">
                {new Date(r.startedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </button>
          ))
        )}
      </div>
      <div className="sp-chat-log" ref={log}>
        {turns.length === 0 && (
          <p className="sp-chat-empty">
            Runs Claude Code with its permission prompts off, or Codex in its
            workspace sandbox, in your project — the same trust as running
            either in a terminal there. The mark above picks which. Ask for a
            board, a change to one, or about the code behind one.
          </p>
        )}
        {turns.map((t) => (
          <article key={t.runId} className="sp-chat-turn">
            {/* A run the server has forgotten — it keeps the newest twenty, and a restart
                keeps none — replays as an error with no prompt to put above it. */}
            {/* What was said, with the command and every reference drawn as they were written,
                and the pictures themselves under it: full height, never cropped, one scroller
                whatever their shapes. The bytes come back from the run rather than out of the
                event, so this survives the reload a written board causes. */}
            {t.prompt && (
              <div className="sp-chat-you">
                <span className="sp-chat-say">
                  {t.prompt.split(/(^\/\S+|#\d+)/).map((piece, i) =>
                    i === 1 && piece.startsWith("/") ? (
                      <span key={i} className="sp-chat-cmd">
                        {piece}
                      </span>
                    ) : /^#\d+$/.test(piece) &&
                      t.images?.some((g) => g.n === Number(piece.slice(1))) ? (
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
            ) : t.end.ok ? null : (
              <p className="sp-chat-error">{t.end.message}</p>
            )}
          </article>
        ))}
      </div>
      {/* What is attached, in the order it arrived. The tile is a crop — it only has to say which
          image this is — and clicking it writes that number into the sentence. */}
      {attached.length > 0 && (
        <>
          <p className="sp-chat-hint">
            Attached — click a tile to put its number in the message
          </p>
          <div className="sp-chat-tray">
            {attached.map((i) => (
              <figure key={i.n} className="sp-chat-tile">
                <button
                  type="button"
                  className="sp-chat-thumb"
                  onClick={() => insertAtCaret(chipFor(i))}
                  title={`Write #${i.n} into the message`}
                >
                  <img src={source(i)} alt={i.name} />
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
                <figcaption className="sp-chat-name" title={i.name}>
                  {i.name}
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      )}
      <form
        className="sp-chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addImages(e.dataTransfer.files);
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
          data-placeholder={running ? "Working…" : "Type / for commands"}
          onInput={(e) => {
            const box = e.currentTarget;
            badgeCommand(box);
            const text = readDraft(box);
            setDraft(text);
            setSlashAt(0);
            // Escape closes the palette for the word it was typed in; the next one opens again.
            if (!text.startsWith("/")) setSlashOff(false);
          }}
          onPaste={(e) => {
            e.preventDefault();
            if (e.clipboardData.files.length)
              return addImages(e.clipboardData.files);
            // The text and not the markup that came with it: the box holds the chips it made
            // itself and nothing else. execCommand because it is the only insert that native
            // undo still knows about.
            document.execCommand(
              "insertText",
              false,
              e.clipboardData.getData("text/plain"),
            );
          }}
          onKeyDown={(e) => {
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
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
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
            disabled={!draft.trim()}
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
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addImages(e.target.files);
            // Cleared, or picking the same file twice in a row fires no change the second time.
            e.target.value = "";
          }}
        />
        <span
          className="sp-chat-perm"
          title={
            "Tool calls are not asked about: the process runs with bypassPermissions, the same " +
            "trust as running the CLI in a terminal of this project. The panel cannot switch it."
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
            {picked ? picked.name : <span className="sp-chat-dim">Model</span>}
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
              "Context the last message used, prompt and answer together. Every message is its " +
              "own run with no memory of the one before, so this is that message, not the " +
              "conversation."
            }
          >
            {tokens(usage.used)}
            {usage.window ? ` / ${tokens(usage.window)}` : ""}
          </span>
        )}
        {running && (
          <span className="sp-chat-spin" role="status" aria-label="Working" />
        )}
      </div>
    </aside>
  );
}
