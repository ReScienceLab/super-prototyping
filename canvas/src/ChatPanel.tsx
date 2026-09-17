/**
 * The chat panel: a message to Claude Code, run in the user's project by the dev server, and what
 * it did, drawn as it happens. Dev server only — App.tsx mounts it under import.meta.env.DEV,
 * since a hosted build has no /__sp/agent endpoints and no process behind them.
 *
 * The panel keeps the ids of its runs in sessionStorage and follows every one again after the
 * reload a board write causes, from event zero: the transcript is rebuilt, not saved, since the
 * server has the whole run (chatTransport.ts). One run at a time — two agents editing one project
 * would race each other — so Send is Stop while one is going.
 */
import { useContext, useEffect, useRef, useState } from "react";
import { useValue } from "tldraw";
import { CanvasChromeContext } from "./canvasChrome";
import { WELCOME_PAGE_SLUG } from "./canvasUrl";
import { applyFrame, followRun, type Turn } from "./chatTransport";

const STORAGE_KEY = "sp-chat-turns";

export function ChatPanel() {
  const { editor } = useContext(CanvasChromeContext);
  const slug = useValue(
    "canvas slug",
    () => editor?.getCurrentPage().meta.canvasSlug as string | undefined,
    [editor],
  );
  // The welcome page is drawn by the app and has no folder, so it is no canvas to the agent.
  const canvas = slug && slug !== WELCOME_PAGE_SLUG ? slug : undefined;
  const [turns, setTurns] = useState<Turn[]>(() => {
    const saved: Pick<Turn, "runId" | "prompt">[] = JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) ?? "[]",
    );
    return saved.map((t) => ({ ...t, blocks: [] }));
  });
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const abort = useRef(new AbortController());
  const log = useRef<HTMLDivElement>(null);

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
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(turns.map(({ runId, prompt }) => ({ runId, prompt }))),
    );
    log.current?.scrollTo(0, log.current.scrollHeight);
  }, [turns]);

  const running = turns.find((t) => !t.end);

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
    setTurns((ts) => [...ts, { runId, prompt: message, blocks: [] }]);
    follow(runId);
  };

  return (
    <aside className="sp-panel sp-chat" aria-label="Claude Code chat">
      <header className="sp-head">
        <span className="sp-head-name">Claude Code</span>
        <span className="sp-head-dim">{canvas ?? "no canvas open"}</span>
      </header>
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
                <p key={i} className="sp-chat-text">
                  {b.text}
                </p>
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
