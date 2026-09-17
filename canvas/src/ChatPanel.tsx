/**
 * The chat panel: a message to Claude Code, run in the user's project by the dev server, and what
 * it did, drawn as it happens. Dev server only — App.tsx mounts it under import.meta.env.DEV,
 * since a hosted build has no /__sp/agent endpoints and no process behind them.
 *
 * The panel keeps the ids of its runs in sessionStorage and follows every one again after the
 * reload a board write causes, from event zero: the transcript is rebuilt, not saved, since the
 * server has the whole run (chatTransport.ts). One run at a time — two agents editing one project
 * would race each other — so Send is Stop while one is going.
 *
 * The header names the conversation, with the model's own title once it has given one, behind
 * Claude's mark. The clock lists the runs the server still holds, and the panel icon folds the
 * panel to a rail — the mark, which opens it again — that keeps following whatever is running.
 */
import { useContext, useEffect, useRef, useState } from "react";
import { useValue } from "tldraw";
import type { RunSummary } from "./agentRun";
import { CanvasChromeContext } from "./canvasChrome";
import { WELCOME_PAGE_SLUG } from "./canvasUrl";
import { applyFrame, followRun, type Turn } from "./chatTransport";
import { ClaudeMark } from "./ClaudeMark";
import { renderMarkdown } from "./markdown";

const RUNS_KEY = "sp-chat-runs";
const COLLAPSED_KEY = "sp-chat-collapsed";

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
  const [history, setHistory] = useState<RunSummary[]>([]);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const abort = useRef(new AbortController());
  const log = useRef<HTMLDivElement>(null);
  const historyList = useRef<HTMLDivElement>(null);

  const follow = (runId: string) => {
    const { signal } = abort.current;
    const update = (patch: (t: Turn) => Turn) =>
      setTurns((ts) => ts.map((t) => (t.runId === runId ? patch(t) : t)));
    followRun(runId, 0, (frame) => update((t) => applyFrame(t, frame)), signal).catch((error) => {
      if (!signal.aborted) update((t) => ({ ...t, end: { ok: false, message: String(error) } }));
    });
  };

  useEffect(() => {
    abort.current = new AbortController();
    for (const t of turns) follow(t.runId);
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
  const title = turns[0]?.title ?? "Claude Code";

  const send = async () => {
    const message = draft.trim();
    if (!message || running) return;
    setDraft("");
    setSendError(null);
    const res = await fetch("/__sp/agent/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, canvas }),
    });
    if (!res.ok) {
      setDraft(message);
      return setSendError(await res.text());
    }
    const { runId } = await res.json();
    setTurns((ts) => [...ts, { ...turnFor(runId), prompt: message }]);
    follow(runId);
  };

  const toggle = () => {
    localStorage.setItem(COLLAPSED_KEY, String(!collapsed));
    setCollapsed(!collapsed);
  };

  const openHistory = async () => {
    const res = await fetch("/__sp/agent/runs");
    if (!res.ok) return setSendError(await res.text());
    setHistory(await res.json());
  };

  const pick = (runId: string) => {
    historyList.current?.hidePopover();
    // The picked run may be one already on screen, and two follows of one run draw it twice.
    abort.current.abort();
    abort.current = new AbortController();
    setTurns([turnFor(runId)]);
    follow(runId);
  };

  return (
    <aside
      className={collapsed ? "sp-panel sp-chat sp-chat-collapsed" : "sp-panel sp-chat"}
      aria-label="Claude Code chat"
    >
      <header className="sp-head">
        {collapsed ? (
          <button type="button" className="sp-head-x" onClick={toggle} aria-label="Open the chat panel">
            <ClaudeMark />
          </button>
        ) : (
          <>
            <ClaudeMark />
            <span className="sp-head-name" title={title}>
              {title}
            </span>
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
              onClick={() => pick(r.id)}
            >
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
            Runs <code>claude</code> in your project with its permission prompts off — the same
            trust as running it in a terminal there. Ask for a board, a change to one, or about
            the code behind one.
          </p>
        )}
        {turns.map((t) => (
          <article key={t.runId} className="sp-chat-turn">
            <p className="sp-chat-you">{t.prompt}</p>
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
        className="sp-note-new sp-chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          value={draft}
          placeholder={running ? "Working…" : "Ask Claude Code…"}
          aria-label="Message to Claude Code"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        {running ? (
          <button
            type="button"
            className="sp-note-send"
            onClick={() => void fetch(`/__sp/agent/run/${running.runId}/cancel`, { method: "POST" })}
          >
            Stop
          </button>
        ) : (
          <button type="submit" className="sp-note-send" disabled={!draft.trim()}>
            Send
          </button>
        )}
      </form>
      {sendError && <p className="sp-chat-error sp-chat-send-error">{sendError}</p>}
    </aside>
  );
}
