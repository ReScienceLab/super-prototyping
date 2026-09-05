# Security policy

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Use GitHub's private vulnerability reporting:
https://github.com/ReScienceLab/super-prototyping/security/advisories/new

If that is not possible, email yilin.jing@rescience.com with "super-prototyping
security" in the subject.

You will get an acknowledgement within three business days. We aim to confirm
and fix a valid report within 30 days and will credit you in the advisory
unless you prefer otherwise.

## Scope

- The `canvas/` viewer (the code behind https://prototyping.rescience.com).
- The measuring tools in `tools/` and the agent skills in `.agents/skills/`.
- The generators (`gen.py`) and boards under `mockups/canvases/`.

Boards render inside sandboxed `<iframe srcdoc>` shapes. A report that shows a
board escaping that sandbox, reading another origin, or executing code in the
viewer's context is in scope. Visual differences between a replica and the app
it reproduces are not security issues.

## Supported versions

Only the `main` branch is supported. There are no tagged releases yet.

## What the repository already does

- `main` requires a pull request; force pushes and deletion are blocked.
  Tags cannot be deleted or overwritten.
- Secret scanning with push protection is on, so credentials cannot be pushed.
- Dependabot opens pull requests for vulnerable and outdated dependencies.
- CodeQL scans JavaScript, TypeScript and Python on every pull request.
- Third-party captures (`ref-*.html`, `assets/refs/`) are ignored by git and
  never committed.
