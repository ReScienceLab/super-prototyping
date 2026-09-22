# The onboarding is a modal over the window

The desktop app's first launch used to be a page of its own, `desktop/startup.html`, with three
steps: which agent, then open or create a project, then the new project's name. The app showed
nothing until the user had answered all three. Since then the agent's panel became the window's, one
across every project, and a project can be made from the home page or the tab bar's +. The
project step asked for something the app already asks for where it is used.

## What it is now

Every launch opens the window on the home page, which is no project's, unless a folder is on the
command line. On the first launch, and the first of a
new major version, `desktop/main.ts` puts `?onboarding=<version>` on that address, and
`canvas/src/Onboarding.tsx` shows one question in a modal over the window: which agent to work
with. The window stays in view behind it, through a light scrim and a frosted card, so the first
thing a new user sees is the app they are about to use.

| Decision | Why |
| --- | --- |
| A first launch makes no project | The home page is the server's root, which is no project's, and it lists every project there is, none included, with New project and Open folder on it. It made `Documents/Super Prototyping/My first project` while every page was a project's (`/p/<name>/`). |
| One question, the agent | It is the one thing the app cannot default. There is no email and no account, because there is no backend to send them to yet. When there is, a field goes in this modal. |
| The chat panel's agents, not the app's own table | The modal lists what `GET __sp/agent/agents` answers, which is what the panel can run, and whether each answers `--version` on this machine. The app's own PATH, home directory and `.app` detection, the nineteen researched agents and their icons are gone. |
| Answering writes the agent and the version | `last.json` gets `version` only from the onboarding's answer, so Skip, Esc or quitting leaves the next launch asking again. The answer also sets the panel's agent (`sp-chat-agent`). |
| The answer installs no skills | There is no project behind the modal to install them into, so `startup:agent` only records the agent. The panel's agent goes with every New project and Open folder after it, and that project gets its skills then. A project already in the folder, opened from the home page, gets only the refresh of the copies it has. `POST /p/<name>/__sp/skills` is gone. |
| The version and the update check moved with it | They were on the startup page. The modal shows them at its foot, in the app only. |

`open -a "Super Prototyping" --args <dir>` still opens that project's canvas and skips all of it.

The research behind this, buzz.xyz's and Hermes Agent's first runs among others, pointed the same
way: open on the product, ask the fewest questions over it, and leave everything else to where it
is used.
