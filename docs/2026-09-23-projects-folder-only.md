# Projects live only in the projects folder

2026-09-23. A project was any folder the server was told to open: the one
`sp start [dir]` or `sp open [dir]` named, the current directory by default,
one picked with the home page's Open folder, or one the desktop app was
launched with. Every one of those was a project like the others, and a
project's card has Delete, which moves its folder to the Trash. Deleting the
project the dev server had made of this checkout moved the whole repository
to the Trash.

Now a project is a folder under `~/Documents/Super Prototyping`
(`PROTOTYPING_PROJECTS_DIR`) and nothing else. The app and `sp start` open on
the home page, and a project is made there with New project. Gone with the
old way in:

- Open folder, its `POST /__sp/projects/open` and the OS folder picker.
- The server's `--open` and the desktop app's folder over its parent port.
- The folder argument of `sp open`, `sp start` and the app's command line.
  `sp open` starts the app; the app ignores a folder an older `sp` still
  passes.
- `/` going to the project opened last. It is always the home page.

The cost: a project cannot be a folder in a repository the user already has.
An agent working in one writes its boards to a project in the projects
folder (skills/prototype-canvas). Deleting a project can then only trash what
was made there.

Supersedes the `--open` half of `2026-09-22-one-server-mode.md`.
