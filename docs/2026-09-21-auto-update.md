# The app updates itself: plan

2026-09-21. Plan for #142. Nothing here is built yet.

## What a user gets

On launch the app asks GitHub for the latest release. If it is newer, the app
downloads it in the background and then shows one native dialog:

> Super Prototyping 1.6.1 is ready.
> Restart to install it now, or it installs the next time you quit.
> [Restart Now] [Later]

No browser, no installer wizard, no terminal, and the same on macOS and
Windows. An install that is offline, or already current, sees nothing.

## Decision: electron-updater

| Option | Verdict |
| --- | --- |
| **electron-updater** (electron-builder's own) | Chosen. The only one that handles our NSIS installer and our dmg with one mechanism, reads our tags as they are, and needs no server. |
| Notify only: check the release, open the download page | Zero dependencies and about 40 lines, but the user still downloads 515 MB in a browser and clicks through an installer, and on Windows a browser download brings back "Windows protected your PC" on every update. Fails "as simple as possible". |
| Electron's built-in `autoUpdater` | Windows support is Squirrel.Windows or MSIX only. NSIS is not supported. |
| update.electronjs.org | Its server runs `semver.valid()` on the tag itself (`src/updates.ts`), so `super-prototyping--v1.5.3` is skipped, and it wants Squirrel artifacts. |
| Hazel, Nuts, electron-release-server | A server to run, same Squirrel-only limits, all quiet since 2023 or 2024. |
| Download the installer ourselves and run it `/S` | Rewrites what `NsisUpdater` already does, and offers nothing for macOS. |

What mature apps do: Logseq and Mattermost Desktop have our shape (electron-builder,
GitHub Releases) and use electron-updater close to its defaults. VS Code, GitHub
Desktop, Signal and Hyper wrote their own because they have their own update
servers and staged rollouts, which we do not. Every one of them checks shortly
after launch, downloads in the background, and then offers a restart. None
blocks launch on a dialog. Bruno has no updater at all.

The cost is the first third-party code in the main process. It stays out of the
package shape: `bun build` with our exact flags inlines electron-updater into
`dist/main.mjs` (checked: +0.5 MB, only `electron` and Node built-ins left
external), so it is a devDependency, the app still ships no `node_modules`, and
electron-builder still sees an app with no production dependencies.

## What changes

1. **`desktop/package.json`**
   - `electron-updater` under `devDependencies`, pinned like the others.
   - `"publish": { "provider": "github", "owner": "ReScienceLab", "repo": "super-prototyping" }`
     in place of `null`. With `null`, electron-builder writes neither
     `app-update.yml` into the app nor `latest*.yml` next to the installers.
     Naming the repo outright is also what avoids the 1.5.0 crash (#130): that
     was electron-builder failing to detect the repo from `desktop/`, whose
     `.git` is one level up. `--publish never` stays; it only ever stopped the
     upload.
   - `mac.target`: `["dmg", "zip"]`. Squirrel.Mac installs from a zip;
     `MacUpdater` throws `ERR_UPDATER_ZIP_FILE_NOT_FOUND` without one. One
     `latest-mac.yml` lists both architectures and the updater picks by
     `process.arch`.
2. **`desktop/main.ts`**, once the window exists, about 15 lines:
   ```ts
   autoUpdater.on("update-downloaded", async ({ version }) => {
     const { response } = await dialog.showMessageBox(win, {
       message: `Super Prototyping ${version} is ready.`,
       detail: "Restart to install it now, or it installs the next time you quit.",
       buttons: ["Restart Now", "Later"],
     });
     if (response === 0) autoUpdater.quitAndInstall();
   });
   // Offline, or a release whose feed is not attached yet: say nothing.
   autoUpdater.checkForUpdates().catch(() => {});
   ```
   Downloading on its own, installing on quit, and doing nothing in an
   unpackaged run are electron-updater's defaults. Not
   `checkForUpdatesAndNotify()`: that shows a notification nobody can act on.
3. **`.github/workflows/release.yml`**
   - `dmg` job: also upload `*.zip` and `*.blockmap`, then `latest-mac.yml` in
     a second command. `nsis` job: `*.exe.blockmap`, then `latest.yml`. The
     feed goes last so it never names a file that is not there yet.
   - The cask heredoc gains one static line, `auto_updates true`. The workflow
     keeps rewriting the cask on every release: a fresh `brew install` still
     needs the right version and checksums.
4. **Docs**: a line under `## Unreleased`; the README install section; the
   `desktop/` paragraph in `AGENTS.md`; the by-hand asset steps in
   `CONTRIBUTING.md`; and a trigger in
   `docs/2026-09-21-windows-app-unsigned.md` (see below).

No server, no new secret, no change to tags or to `claude plugin tag`.

## What will bite if ignored

- **The release is public before its assets are.** The tag job cuts the
  release, and the apps arrive 10 to 20 minutes later. An app that checks in
  that window gets a 404 for `latest.yml`. That is the `catch` above. The
  `nsis` job's own smoke test hits the same 404 on every release, which makes
  it a standing check that a failed update check is silent.
- **Installs up to 1.5.3 have no updater.** They need one last manual update,
  `brew upgrade --cask super-prototyping` or the installer. The release notes
  for the first version with the updater have to say so.
- **Windows updates are not signature-checked.** `NsisUpdater` verifies
  Authenticode only when `app-update.yml` carries a `publisherName`, which an
  unsigned build never has, so today it skips the check with a warning. The
  download is still HTTPS from GitHub and matched against the sha512 in
  `latest.yml`, so it is as trustworthy as the release page, which is what
  the unsigned installer already asks of people. electron-builder's source
  marks this fail-open path deprecated and says a future major will refuse
  instead. So: electron-updater stays pinned, and "the updater refuses
  unsigned builds" becomes a trigger in the unsigned-installer doc.
- **No SmartScreen on update, expected but not yet seen.** SmartScreen fires
  on the Mark of the Web that a browser adds. electron-updater's download has
  none. Confirm on the Windows PC.
- **macOS updates only from a real install.** Run from the mounted dmg, or
  translocated because it was never moved to `/Applications`, Squirrel.Mac
  fails without telling the user. A cask install is never in that state.
- **Homebrew.** Brew installs the app owned by the user with `go-w`, which is
  what Squirrel.Mac expects, so the updater can replace it. With
  `auto_updates true`, a plain `brew upgrade` compares the app's own
  `Info.plist` version with the tap's and leaves a self-updated app alone.
  `brew upgrade --cask super-prototyping`, by name, goes by brew's own record
  and reinstalls the same version: wasteful, harmless. VS Code, Slack,
  Discord, Signal, Obsidian and GitHub Desktop all ship exactly this: a pinned
  `version` and `sha256`, plus `auto_updates true`.
- **Every update is about 515 MB.** Blockmap diffing runs on the compressed
  archive, and whether it saves anything when 420 MB of the package is
  unchanged example boards is unproven. Upload the blockmaps, measure two
  releases, promise nothing. The real lever is trimming the examples, which
  is its own piece of work. The two mac zips also add about 1 GB of assets to
  each release.

## Order of work, and how each step is checked

One PR for `desktop/` and the workflow. It touches nothing under `canvas/`.

1. Make the changes. `bunx tsc --noEmit`, `bun test`.
2. A throwaway rehearsal workflow on the branch builds both platforms **with
   `GH_TOKEN` set**, mac unsigned. Pass means: no `createUpdateInfoTasks`
   crash, and `dist/out` holds the zips, the blockmaps, `latest-mac.yml` and
   `latest.yml`, and `app-update.yml` is inside the app's resources.
3. Install the rehearsal exe on the Windows PC: it starts, serves the canvas,
   and shows no dialog, because 1.5.3's release has no `latest.yml`.
4. Merge, release **1.6.0** (minor: an app feature).
5. Straight after, the test that matters. Build the same commit with
   `-c.extraMetadata.version=1.5.99`, signed on macOS through a rehearsal
   workflow that borrows the release job's signing environment. On the Windows
   PC and on a Mac, with the app in `/Applications`: the dialog appears,
   Restart Now brings up 1.6.0, no SmartScreen. Again with Later: quit,
   reopen, 1.6.0. Record both on #142.
6. If step 5 fails, 1.6.0 installs cannot fix themselves, so the repair ships
   as 1.6.1 with a line in its notes asking for one manual update.

## Left out on purpose

A settings toggle, a "Check for Updates" menu item, a progress bar, a re-check
while the app stays open, a beta channel, Linux. Each is a few lines on top of
this when someone asks.

## Two choices that are the owner's

- **Prompt after the download, or before it?** Recommended: after, as above.
  It is what every app surveyed does, and the restart takes seconds. Asking
  first means a click, then minutes of a 515 MB download, then a restart in
  the middle of work.
- **Check on launch only, or also every few hours?** Recommended: launch only
  to begin with, which is what was asked. The app is often left open for
  hours, so a timer is the first thing to add if updates reach people late.
