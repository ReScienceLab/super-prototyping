import { useEffect, useRef, useState } from "react";
import { Mark, type AgentRow, type Chat } from "./ChatPanel";

/**
 * The desktop app's first launch, and the first of each major version: the one question it asks,
 * which agent to work with, over the window it will be answered in, so the app itself is in view
 * behind it. desktop/main.ts puts `?onboarding=<version>` on the address for it. The answer is the
 * agent the panel runs, and the app copies that agent's skills into this project and every one
 * opened after it. Skipping leaves nothing written, so the next launch asks again.
 */
export function Onboarding({ chat, version }: { chat: Chat; version: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [agents, setAgents] = useState<AgentRow[]>();
  const [picked, setPicked] = useState(chat.agent);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState("");

  useEffect(() => {
    void fetch(`${import.meta.env.BASE_URL}__sp/agent/agents`)
      .then((res) => res.json())
      .then((list: AgentRow[]) => {
        setAgents(list);
        // The panel's agent if it is installed, else the first that is.
        if (!list.find((a) => a.id === chat.agent)?.available) {
          const found = list.find((a) => a.available);
          if (found) setPicked(found.id);
        }
      });
    // Mount only: what the panel had when the window opened is the starting pick.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opened once the agents are drawn in it, so the focus a modal takes lands on one of them and not
  // on the version. Strict mode fetches twice, and a second showModal throws in older engines.
  useEffect(() => {
    if (agents && !dialog.current!.open) dialog.current!.showModal();
  }, [agents]);

  return (
    <dialog ref={dialog} className="onboarding">
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          chat.choose(picked);
          await window.startup?.agent(picked);
          dialog.current!.close();
        }}
      >
        <h2>Welcome to Super Prototyping</h2>
        <p>
          Choose the agent that builds your prototypes. It works in the panel on the left, and
          every project you open gets its skills.
        </p>
        <div className="onboarding-agents">
          {agents?.map((a) => (
            <label key={a.id}>
              <input
                type="radio"
                name="agent"
                checked={picked === a.id}
                disabled={!a.available}
                onChange={() => setPicked(a.id)}
              />
              <Mark agent={a.id} size={28} />
              <span>
                <b>{a.name}</b>
                <small>
                  {a.available ? (
                    "Found on this machine"
                  ) : (
                    <>
                      Not found.{" "}
                      <a href={a.site} target="_blank" rel="noopener noreferrer">
                        Install it
                      </a>
                    </>
                  )}
                </small>
              </span>
            </label>
          ))}
        </div>
        <footer>
          {/* The app's, which can look for an update; a browser has nothing to update. */}
          {window.startup && (
            <button
              type="button"
              className="onboarding-version"
              onClick={async () => {
                setChecked("Checking…");
                setChecked(await window.startup!.check());
              }}
            >
              v{version}
              {checked && ` · ${checked}`}
            </button>
          )}
          <button type="button" onClick={() => dialog.current!.close()}>
            Skip for now
          </button>
          <button
            type="submit"
            disabled={busy || !agents?.find((a) => a.id === picked)?.available}
          >
            Get started
          </button>
        </footer>
      </form>
    </dialog>
  );
}
