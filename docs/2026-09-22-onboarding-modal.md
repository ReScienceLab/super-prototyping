# The onboarding is a modal over the window

The desktop app's first launch used to be a page of its own, `desktop/startup.html`, with three
steps: which agent, then open or create a project, then the new project's name. The app showed
nothing until the user had answered all three. Since then the agent's panel became the window's, one
across every project, and a project can be made from the home page or the tab bar's +. The
project step asked for something the app already asks for where it is used.

## What it is now

Every launch opens the window on a project's home page. On the first launch, and the first of a
new major version, `desktop/main.ts` puts `?onboarding=<version>` on that address, and
`canvas/src/Onboarding.tsx` shows one question in a modal over the window: which agent to work
with. The window stays in view behind it, through a light scrim and a frosted card, so the first
thing a new user sees is the app they are about to use.

| Decision | Why |
| --- | --- |
| A first launch makes `Documents/Super Prototyping/My first project` | Every page the server has is a project's (`/p/<name>/`), and the agent needs a project to run in. An empty folder is what "New project" makes anyway, and the user can rename or delete it in Finder. |
| One question, the agent | It is the one thing the app cannot default. There is no email and no account, because there is no backend to send them to yet. When there is, a field goes in this modal. |
| The chat panel's agents, not the app's own table | The modal lists what `GET __sp/agent/agents` answers, which is what the panel can run, and whether each answers `--version` on this machine. The app's own PATH, home directory and `.app` detection, the nineteen researched agents and their icons are gone. |
| Answering writes the agent and the version | `last.json` gets `version` only from the onboarding's answer, so Skip, Esc or quitting leaves the next launch asking again. The answer also sets the panel's agent (`sp-chat-agent`). |
| The skills go into the project behind it at once | `startup:agent` installs them into the project the window opened on, and every project opened after it gets them as before. This install shows no toast naming the copies, because home has no canvas to show it on. Since `2026-09-22-one-server-mode.md` the install is the server's `POST /p/<name>/__sp/skills`, which `startup:agent` sends until the page sends it itself. |
| The version and the update check moved with it | They were on the startup page. The modal shows them at its foot, in the app only. |

`open -a "Super Prototyping" --args <dir>` still opens that project's canvas and skips all of it.

The research behind this, buzz.xyz's and Hermes Agent's first runs among others, pointed the same
way: open on the product, ask the fewest questions over it, and leave everything else to where it
is used.
