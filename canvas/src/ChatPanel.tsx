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
 * Under the composer, what the next message is run with: the model, the reasoning effort, and
 * what the last one cost. Both pickers open with a Default that sends no flag at all, so the
 * CLI's own configuration decides until the user says otherwise, and both are per agent — a
 * codex model means nothing to claude — and kept in localStorage beside the agent itself. The
 * server serves the lists (agents.ts): claude's models are its aliases, codex's are the ones
 * its own picker draws, read from the list it caches. The token count is the last turn's, not
 * the conversation's, because every message is its own process with no memory of the last.
 */
import { useContext, useEffect, useRef, useState } from "react";
import { useValue } from "tldraw";
import type { AgentId, AgentModel } from "./agents";
import type { RunSummary } from "./agentRun";
import { CanvasChromeContext } from "./canvasChrome";
import { WELCOME_PAGE_SLUG } from "./canvasUrl";
import { applyFrame, followRun, type Turn } from "./chatTransport";
import { ClaudeMark } from "./ClaudeMark";
import { CodexMark } from "./CodexMark";
import { renderMarkdown } from "./markdown";

const RUNS_KEY = "sp-chat-runs";
const COLLAPSED_KEY = "sp-chat-collapsed";
const AGENT_KEY = "sp-chat-agent";
const CHOICE_KEY = "sp-chat-choice";

/** The CLI's own word for a level, with a capital: Low, High, XHigh. Total: the agent list
 *  arrives a moment after the panel does, and until it has there is no level to name. */
const effortName = (e: string) => (e === "xhigh" ? "XHigh" : e.charAt(0).toUpperCase() + e.slice(1));

/** 26k, 272k: a token count is read at a glance or not at all. */
const tokens = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

const Check = () => (
  <svg className="sp-menu-ck" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 6.4l2.6 2.6L10 3.6" />
  </svg>
);

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

export function ChatPanel() {
  const { editor } = useContext(CanvasChromeContext);
  const slug = useValue(
    "canvas slug",
    () => editor?.getCurrentPage().meta.canvasSlug as string | undefined,
    [editor],
  );
  // The welcome page is drawn by the app and has no folder, so it is no canvas to the agent.
  const canvas = slug && slug !== WELCOME_PAGE_SLUG ? slug : undefined;
  const [turns, setTurns] = useState<Turn[]>(() =>
    (JSON.parse(sessionStorage.getItem(RUNS_KEY) ?? "[]") as string[]).map(turnFor),
  );
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === "true");
  const [agent, setAgent] = useState<AgentId>(() => {
    const stored = localStorage.getItem(AGENT_KEY);
    return stored && stored in MARKS ? (stored as AgentId) : "claude";
  });
  const [agents, setAgents] = useState<AgentRow[]>([]);
  // What each agent is to be run with, by agent id, since neither's models mean anything to the
  // other. A key missing, or naming something the agent no longer offers, is the CLI's default.
  const [choices, setChoices] = useState<Record<string, { model?: string; effort?: string }>>(() => {
    try {
      return JSON.parse(localStorage.getItem(CHOICE_KEY) ?? "{}");
    } catch {
      return {};
    }
  });
  const [history, setHistory] = useState<RunSummary[]>([]);
  // The agent's own slash commands, and where the keyboard is in them. Asked for when the draft
  // becomes one, since the server learns them from runs and the list grows as the panel is used.
  const [commands, setCommands] = useState<string[]>([]);
  const [slashAt, setSlashAt] = useState(0);
  const [slashOff, setSlashOff] = useState(false);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const abort = useRef(new AbortController());
  const log = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const historyList = useRef<HTMLDivElement>(null);
  const agentMenu = useRef<HTMLDivElement>(null);
  const modelMenu = useRef<HTMLDivElement>(null);
  const effortMenu = useRef<HTMLDivElement>(null);

  const follow = (runId: string) => {
    const { signal } = abort.current;
    const update = (patch: (t: Turn) => Turn) =>
      setTurns((ts) => ts.map((t) => (t.runId === runId ? patch(t) : t)));
    followRun(runId, 0, (frame) => update((t) => applyFrame(t, frame)), signal).catch((error) => {
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
  }, [turns, collapsed]);

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
  const effort = choice.effort && efforts.includes(choice.effort) ? choice.effort : "";
  const slider = effort ? efforts.indexOf(effort) : Math.floor(efforts.length / 2);
  // The newest turn that got as far as being charged for; a failed one never is.
  const usage = [...turns].reverse().find((t) => t.usage)?.usage;

  // The palette is open while the draft is a single unfinished word starting with a slash: "/cl"
  // and not "/clone-prototype the app", since an argument means the command has been chosen.
  const typing = /^\/(\S*)$/.exec(draft)?.[1];
  const matches =
    typing === undefined || slashOff
      ? []
      : commands.filter((c) => c.toLowerCase().includes(typing.toLowerCase()));
  const at = Math.min(slashAt, matches.length - 1);

  const pickCommand = (name: string) => {
    setDraft(`/${name} `);
    setSlashAt(0);
    composer.current?.focus();
  };

  const prefer = (patch: { model?: string; effort?: string }) => {
    const next = { ...choices, [agent]: { ...choice, ...patch } };
    localStorage.setItem(CHOICE_KEY, JSON.stringify(next));
    setChoices(next);
  };

  const send = async () => {
    const message = draft.trim();
    if (!message || running) return;
    setDraft("");
    // Sending clears the draft without passing through onChange, so an Escape that closed the
    // palette for this word has to be forgotten here too, or the next word never opens one.
    setSlashOff(false);
    setSendError(null);
    const res = await fetch("/__sp/agent/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, canvas, agent, model, effort }),
    });
    if (!res.ok) {
      setDraft(message);
      return setSendError(await res.text());
    }
    const { runId } = await res.json();
    setTurns((ts) => [...ts, { ...turnFor(runId), prompt: message, agent }]);
    follow(runId);
  };

  // Asked for on the way into a slash word rather than at mount: the server learns the list from
  // the runs it pumps, so it is empty before the first message and right after it.
  useEffect(() => {
    if (typing === undefined) return;
    void fetch(`/__sp/agent/commands?agent=${agent}`).then(async (res) =>
      setCommands(res.ok ? await res.json() : []),
    );
    // The word itself does not change the list; starting one, or changing agent, does.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [typing === undefined, agent]);

  const toggle = () => {
    localStorage.setItem(COLLAPSED_KEY, String(!collapsed));
    setCollapsed(!collapsed);
  };

  const switchTo = (id: AgentId) => {
    localStorage.setItem(AGENT_KEY, id);
    setAgent(id);
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
    setDraft("");
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
    <aside className={collapsed ? "sp-panel sp-chat sp-chat-collapsed" : "sp-panel sp-chat"} aria-label="Agent chat">
      <header className="sp-head">
        {collapsed ? (
          <button type="button" className="sp-head-x" onClick={toggle} aria-label="Open the chat panel">
            <Mark agent={agent} />
          </button>
        ) : (
          <>
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
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M6 2v8M2 6h8" />
              </svg>
            </button>
            <button
              type="button"
              className="sp-head-x"
              popoverTarget="sp-chat-history"
              onClick={() => void openHistory()}
              aria-label="History"
              title="History"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M1.5 6a4.5 4.5 0 1 0 4.5-4.5 4.875 4.875 0 0 0-3.37 1.37L1.5 4" />
                <path d="M1.5 1.5v2.5h2.5" />
                <path d="M6 3.5v2.5l2 1" />
              </svg>
            </button>
            <button type="button" className="sp-head-x" onClick={toggle} aria-label="Collapse the chat panel">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                <rect x="1.5" y="1.5" width="9" height="9" rx="1" />
                <path d="M4.5 1.5v9" />
              </svg>
            </button>
          </>
        )}
      </header>
      <div id="sp-chat-agents" popover="auto" className="sp-chat-agents" role="menu" ref={agentMenu}>
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
            {a.id === agent && <Check />}
          </button>
        ))}
      </div>
      <div id="sp-chat-models" popover="auto" className="sp-chat-picker" role="menu" ref={modelMenu}>
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
            {m.id === model && <Check />}
          </button>
        ))}
      </div>
      <div id="sp-chat-efforts" popover="auto" className="sp-chat-picker sp-chat-efforts" ref={effortMenu}>
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
          {!effort && <Check />}
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
      <div id="sp-chat-history" popover="auto" className="sp-chat-history" ref={historyList}>
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
                {new Date(r.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </button>
          ))
        )}
      </div>
      <div className="sp-chat-log" ref={log}>
        {turns.length === 0 && (
          <p className="sp-chat-empty">
            Runs Claude Code with its permission prompts off, or Codex in its workspace sandbox, in
            your project — the same trust as running either in a terminal there. The mark above
            picks which. Ask for a board, a change to one, or about the code behind one.
          </p>
        )}
        {turns.map((t) => (
          <article key={t.runId} className="sp-chat-turn">
            {/* A run the server has forgotten — it keeps the newest twenty, and a restart
                keeps none — replays as an error with no prompt to put above it. */}
            {t.prompt && <p className="sp-chat-you">{t.prompt}</p>}
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
                <p key={b.id} className="sp-chat-tool" data-ok={b.ok}>
                  <b>{b.name}</b>
                  <span>{b.detail}</span>
                </p>
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
      <form
        className="sp-chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          ref={composer}
          value={draft}
          placeholder={running ? "Working…" : "Type / for commands"}
          aria-label={`Message to ${nameOf(agent)}`}
          onChange={(e) => {
            setDraft(e.target.value);
            setSlashAt(0);
            // Escape closes the palette for the word it was typed in; the next one opens again.
            if (!e.target.value.startsWith("/")) setSlashOff(false);
          }}
          onKeyDown={(e) => {
            if (matches.length > 0) {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                const step = e.key === "ArrowDown" ? 1 : matches.length - 1;
                return setSlashAt((i) => (Math.min(i, matches.length - 1) + step) % matches.length);
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
          <div className="sp-chat-slash" role="listbox" aria-label="Slash commands">
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
                className={i === at ? "sp-menu-row sp-chat-slash-on" : "sp-menu-row"}
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
            onClick={() => void fetch(`/__sp/agent/run/${running.runId}/cancel`, { method: "POST" })}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <rect x="4" y="4" width="6" height="6" rx="1.5" fill="currentColor" />
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
      {sendError && <p className="sp-chat-error sp-chat-send-error">{sendError}</p>}
      <div className="sp-chat-bar">
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
            {effort ? effortName(effort) : <span className="sp-chat-dim">Effort</span>}
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
        {running && <span className="sp-chat-spin" role="status" aria-label="Working" />}
      </div>
    </aside>
  );
}
