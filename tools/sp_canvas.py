#!/usr/bin/env python3
"""sp, the launcher for the tldraw board canvas.

  start    serve the canvas for a project, the current directory or the one named,
           and print its address
  stop     kill the one on that port, and only that one
  status   say whether it is up, and on what
  root     print the plugin root it resolved (-v: where it looked, and the
           release each half is on)
  paths    print the two directories this writes, the chat agent's, and the
           variables that move them
  clean    remove the two: every downloaded app, pidfile and log

The canvas app ships inside the plugin, which is installed outside your
project — under ~/.claude/plugins/cache, or wherever you cloned the repo. Your
boards stay in your project. This joins the two, so an upgrade can replace the
app without touching a single board you have authored.

A project's boards are the canvases folder under it. The server serves every
project under ~/Documents/Super Prototyping (PROTOTYPING_PROJECTS_DIR moves it)
at /p/<name>/, with the one `start` names beside them, and / goes to that one.
The plugin is found by search;
SUPER_PROTOTYPING_ROOT skips the search when you know the answer. The app served is
the canvas built for the plugin's release, fetched once into
~/.cache/super-prototyping/<version>/; a checkout with node_modules serves its own
canvas/dist. The port is --port or SP_CANVAS_PORT. Nothing is read from a file.
"""
import argparse, glob, io, json, os, re, shlex, shutil, signal, subprocess, sys, tarfile
import tempfile, time, urllib.error, urllib.request, webbrowser
from pathlib import Path

DEFAULT_PORT = 5173
# The identifier every directory below is named by. Fixed, so the cask's `zap` and the
# desktop app's data directory point at the same folders and nothing migrates.
APP = "super-prototyping"
REPO = "ReScienceLab/super-prototyping"
# The packaged desktop app's bundled tree. It is a module constant, not inlined
# into _candidates, so a test can patch it without touching a real /Applications.
APP_BUNDLE_PLUGIN = Path("/Applications/Super Prototyping.app/Contents/Resources/plugin")
# A project's boards, under it: the same folder the server reads (canvas/server/boards.ts).
CANVASES = "canvases"

# Per-port names, because two projects run two canvases. A fixed session name meant
# starting the second one killed the first, silently and with a zero exit code.
def _session(port):
    return f"canvas-{port}"


# tmux `-t name` falls back to *prefix* matching when nothing matches exactly, so `-t canvas-54`
# happily kills canvas-5411. The `=` prefix demands an exact name.
def _target(port):
    return f"={_session(port)}"


def _dirs():
    """(cache, state): the two directories this writes. The downloaded app goes in the first,
    one folder per version; the pidfiles and logs in the second. Nothing else, and no
    configuration file: a port is a flag plus SP_CANVAS_PORT.

    The XDG pair on macOS as on Linux, following uv, gh and bat rather than platformdirs'
    ~/Library: the people running this have ~/.cache/uv already, and one convention across
    the two Unixes is one to document and one to remove. No Windows branch until the
    launcher runs there: `stop` and `clean` need `ps` and process groups, so a path for it
    would only promise a start that cannot be stopped. SUPER_PROTOTYPING_HOME puts both
    under one root, the way CODEX_HOME and CLAUDE_CONFIG_DIR do. Nothing is created here: a
    directory appears at the first write into it, as the spec asks, so `status` on a fresh
    machine leaves no trace.
    """
    home = os.environ.get("SUPER_PROTOTYPING_HOME")
    if home:
        root = Path(home).expanduser()
        return root / "cache", root / "state"
    def xdg(var, default):
        return Path(os.environ.get(var) or Path.home() / default) / APP
    return xdg("XDG_CACHE_HOME", ".cache"), xdg("XDG_STATE_HOME", ".local/state")


def _pidfile(port):
    return _dirs()[1] / f"{_session(port)}.pid"


def _logfile(port):
    return _dirs()[1] / f"{_session(port)}.log"


def _pid_in(pidfile):
    """The pid a pidfile holds, or None for one that holds something else and is only fit
    to drop. The one reader, for `stop` and `clean` to agree on."""
    try:
        return int(pidfile.read_text().strip())
    except ValueError:
        return None


# --- finding the canvas app --------------------------------------------------

def _candidates():
    """Every place a canvas app could be, most explicit first.

    Yields (label, path). No product exposes its plugin root to a shell in a way
    Claude Code, Codex, CodeBuddy, Hermes, Pi and Trae agree on, so the app is
    found rather than addressed.
    """
    env = os.environ.get("SUPER_PROTOTYPING_ROOT")
    if env:
        yield "SUPER_PROTOTYPING_ROOT", Path(env).expanduser()

    # Claude Code records where it put each plugin. That is authoritative, so read it before
    # guessing from the cache layout.
    manifest = Path.home() / ".claude/plugins/installed_plugins.json"
    try:
        entries = json.loads(manifest.read_text()).get("plugins", {})
        for key, installs in entries.items():
            if key.split("@")[0] != "super-prototyping":
                continue
            for install in installs:
                if install.get("installPath"):
                    yield "Claude Code plugin manifest", Path(install["installPath"])
    except (OSError, ValueError, AttributeError):
        pass

    # Failing that, the cache holds one directory per installed version, and old ones are not
    # cleaned up. Sort by version, not by mtime: two directories can share an mtime, and then
    # mtime order is arbitrary and can hand back the older release. Codex and CodeBuddy cache
    # the same way under their own homes, so the same pick works for all three.
    for label, pattern in (
        ("Claude Code plugin cache", ".claude/plugins/cache/*/super-prototyping/*"),
        ("Codex plugin cache",       ".codex/plugins/cache/*/super-prototyping/*"),
        ("CodeBuddy plugin cache",   ".codebuddy/plugins/cache/*/super-prototyping/*"),
    ):
        found = glob.glob(str(Path.home() / pattern))
        for path in sorted(found, key=lambda p: _version_key(Path(p).name), reverse=True):
            yield label, Path(path)

    # Hermes and Pi clone the repo whole rather than keeping a copy per version: Hermes into
    # its plugins directory, flat or one category level deep, Pi into a git package keyed by
    # host and repo path.
    for label, pattern in (
        ("Hermes plugin", ".hermes/plugins/super-prototyping"),
        ("Hermes plugin", ".hermes/plugins/*/super-prototyping"),
        ("Pi git package", f".pi/agent/git/*/{REPO}"),
    ):
        for path in sorted(glob.glob(str(Path.home() / pattern))):
            yield label, Path(path)

    # Everything else holds a symlink per skill, pointing back into the checkout:
    # <root>/skills/prototype-canvas -> up two levels is <root>.
    for label, root in (
        ("Codex CLI", "~/.codex/skills"),
        ("CodeBuddy", "~/.codebuddy/skills"),
        ("Hermes", "~/.hermes/skills"),
        ("Pi", "~/.pi/agent/skills"),
        ("Trae", "~/.trae/skills"),
        ("Trae CN", "~/.trae-cn/skills"),
    ):
        link = Path(root).expanduser() / "prototype-canvas"
        if link.is_symlink():
            yield f"{label} skill link", link.resolve().parent.parent

    # A checkout you are standing in comes before the app, because someone with the app
    # installed who is also standing in their own checkout must get the checkout.
    try:
        top = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        if top:
            yield "current git checkout", Path(top)
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass

    # Finally, the packaged desktop app's own bundled copy.
    yield "Super Prototyping app", APP_BUNDLE_PLUGIN


def _version_key(name: str):
    """Sortable form of a version directory name, highest = newest.

    Semver precedence, not "every number in the name is another component": a prerelease
    ranks *below* the release it leads to, and scanning digits made 1.0.0-beta.1 into
    (1, 0, 0, 1), which beat 1.0.0. bump-version.sh accepts prereleases, so the cache
    really can hold both. Anything unparseable sorts oldest.
    """
    # The separator is optional because the two halves spell a prerelease differently:
    # the manifests carry semver's 1.1.0-rc.1 and hatchling normalises the wheel to
    # PEP 440's 1.1.0rc1. Both have to land on the same key or every prerelease
    # install reports drift against itself.
    m = re.match(r"v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[-+._]?([A-Za-z][0-9A-Za-z.+-]*))?$", name)
    if not m:
        return (-1,)
    release = tuple(int(p or 0) for p in m.group(1, 2, 3))
    pre = m.group(4)
    # 0 for a prerelease and 1 for the release, so 1.0.0 outranks every 1.0.0-* ; between two
    # prereleases the trailing numbers decide.
    return release + ((0, tuple(int(n) for n in re.findall(r"\d+", pre))) if pre else (1, ()))


# The release tag this repo cuts, and what `claude plugin tag` produces. Kept in step with
# .version-bump.json, because the note below hands the user a URL built from it.
TAG_PREFIX = "super-prototyping--v"


def _toolkit_version():
    """The version of the toolkit this process runs from, or None from a source checkout."""
    try:
        from importlib.metadata import PackageNotFoundError, version
        return version("super-prototyping-tools")
    except (ImportError, PackageNotFoundError):
        return None


def _plugin_version(root: Path):
    """The version of the plugin the canvas app came out of, or None if it has no manifest."""
    try:
        return json.loads((root / ".claude-plugin/plugin.json").read_text()).get("version")
    except (OSError, ValueError, AttributeError):
        return None


def skew(root: Path):
    """(plugin, toolkit) when the two halves disagree on the release, else None.

    They install separately — `/plugin install` for the skills and the canvas, `uv tool
    install` for refkit, artgen and this — so updating one and forgetting the other is the
    ordinary mistake. Unchecked it surfaces much later, as a skill calling a flag this
    refkit does not have. An unknown version on either side is not a disagreement: a
    checkout has no release number to compare.
    """
    plugin, toolkit = _plugin_version(root), _toolkit_version()
    if not (plugin and toolkit):
        return None
    # Compared as versions, not as strings: see _version_key on the two spellings.
    return (plugin, toolkit) if _version_key(plugin) != _version_key(toolkit) else None


def skew_fix(plugin, toolkit):
    """The one command that closes the gap, whichever half is behind.

    Which way round matters: telling someone whose toolkit is ahead to `uv tool install`
    the plugin's older tag is a downgrade, and to a tag that need not even exist yet.
    """
    if _version_key(toolkit) > _version_key(plugin):
        return ("/plugin update super-prototyping   (Claude Code; or codex plugin add, "
                "codebuddy plugin install, hermes plugins update, npx skills update)")
    return f'uv tool install --force "git+https://github.com/{REPO}@{TAG_PREFIX}{plugin}#subdirectory=tools"'


def _is_canvas_app(root: Path) -> bool:
    pkg = root / "canvas" / "package.json"
    try:
        return json.loads(pkg.read_text()).get("name") == "prototyping-canvas"
    except (OSError, ValueError):
        return False


def resolve_root(verbose=False):
    """The plugin root holding canvas/, or exit with everywhere that was tried."""
    looked = []
    for label, path in _candidates():
        looked.append((label, path, _is_canvas_app(path)))
        if looked[-1][2]:
            if verbose:
                for lbl, p, ok in looked:
                    print(f"  {'✓' if ok else '·'} {lbl}: {p}", file=sys.stderr)
            return path

    print("error: could not find the super-prototyping canvas app.\n", file=sys.stderr)
    if looked:
        print("Looked in:", file=sys.stderr)
        for lbl, p, _ in looked:
            print(f"  · {lbl}: {p}", file=sys.stderr)
    else:
        print("  (nothing to look at — no plugin install and no checkout)", file=sys.stderr)
    print(
        "\nFix by installing the plugin, or point at a checkout directly:\n"
        "  export SUPER_PROTOTYPING_ROOT=/path/to/super-prototyping",
        file=sys.stderr,
    )
    raise SystemExit(1)


# --- the server --------------------------------------------------------------

def _port_answers(port):
    """Whether something is already listening. Nothing is assumed about what."""
    import socket
    with socket.socket() as s:
        s.settimeout(0.4)
        return s.connect_ex(("127.0.0.1", port)) == 0


def _needs_build(app: Path) -> bool:
    """Whether `canvas/dist` is missing or older than the app's sources.

    An install from git has no dist at all, and a checkout being worked on has one from before
    the last edit. Either way the server that would start is not the app on disk.
    """
    server = app / "dist/server.mjs"
    if not server.is_file():
        return True
    built = server.stat().st_mtime
    # Everything under the app but its own output and the dependency tree: the entry pages,
    # `public/`, the configs and the lockfile are inputs of the build as much as `src/` is.
    for d, dirs, files in os.walk(app):
        dirs[:] = [x for x in dirs if x not in ("dist", "node_modules")]
        if any((Path(d) / f).stat().st_mtime > built for f in files):
            return True
    return False


def _dist(root: Path) -> Path:
    """The `dist/` to serve, holding `server.mjs`: the checkout's own when it is being worked
    on, else the canvas built for the plugin's release, from the cache or downloaded into it.

    A checkout with `node_modules`, or with a dist already built, is a developer's: it serves
    what is on disk, rebuilt when a source is newer, and this is the one path that still
    needs bun. A plugin install is a bare checkout of a tag, so the bundle that release
    attached is the app it should run, and nothing but node or bun is needed to run it. The
    version is the manifest's, not the toolkit's: the manifest is what `claude plugin tag`
    tagged, spelled as the tag is, where the installed toolkit reports PEP 440's `1.5.0rc1`
    for the tag's `1.5.0-rc.1`. A fresh clone has a manifest too, so it is served the release
    it names until `bun install` marks it as being worked on.

    The tarball is the one release.yml attaches to every release: one top-level `dist/`
    holding the built app and `server.mjs`. One directory per version, so a new release
    fetches its own and the old one waits for `sp clean`. A version directory is whole
    or absent, never half: it is unpacked beside its name and renamed into place, so the one
    file the cache check looks for cannot be there without the rest.
    """
    app = root / "canvas"
    own = (app / "dist/server.mjs").is_file()
    version = _plugin_version(root)
    if own or (app / "node_modules").is_dir() or not version:
        # Rebuilt only where there are sources to rebuild from. A dist with none beside it
        # is the desktop app's bundled tree: the canvas as shipped, and the mtime check would
        # take its package.json, copied in after the bundle was built, as an edit.
        if (app / "src").is_dir() and _needs_build(app):
            if not shutil.which("bun"):
                raise SystemExit("error: bun is needed to build the canvas app from its "
                                 "sources — https://bun.sh")
            if not (app / "node_modules").is_dir():
                print(f"installing canvas dependencies in {app} …")
                subprocess.run(["bun", "install", "--frozen-lockfile"], cwd=app, check=True)
            print(f"building the canvas app in {app} …")
            subprocess.run(["bun", "run", "build"], cwd=app, check=True)
        return app / "dist"
    cache = _dirs()[0] / version
    if (cache / "dist/server.mjs").is_file():
        return cache / "dist"
    url = f"https://github.com/{REPO}/releases/download/{TAG_PREFIX}{version}/canvas-dist.tgz"
    print(f"fetching the canvas app for {version} …\n  {url}")
    try:
        with urllib.request.urlopen(url, timeout=60) as response:
            archive = response.read()
    except OSError as e:  # a 404, no network and a timeout are all this
        build = ('A checkout with bun builds it instead:\n'
                 '  cd "$(sp root)/canvas" && bun install && bun run build')
        if isinstance(e, urllib.error.HTTPError) and e.code == 404:
            # The release is there and the bundle is not: every release before bundles
            # shipped, or one whose attach step failed. The first is a plugin behind the
            # toolkit, which the skew note after a successful start would have said.
            versions = skew(root)
            if versions and _version_key(versions[1]) > _version_key(versions[0]):
                plugin, toolkit = versions
                fix = (f"The plugin is {plugin} and the toolkit {toolkit}. Move the plugin up:\n"
                       f"      {skew_fix(plugin, toolkit)}")
            else:
                fix = build
            raise SystemExit(f"error: release {version} has no canvas app attached\n  {url}\n{fix}")
        raise SystemExit(
            f"error: could not download the canvas app for {version}\n  {url}\n  {e}\n"
            f"Try again once the network is back. {build}")
    cache.parent.mkdir(parents=True, exist_ok=True)
    work = tempfile.mkdtemp(prefix=f"{version}.", dir=cache.parent)
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tar:
        # `filter` arrived in the 2023 security releases of 3.10 and 3.11; before them, none.
        tar.extractall(work, **({"filter": "data"} if hasattr(tarfile, "data_filter") else {}))
    try:
        os.rename(work, cache)
    except OSError:
        # A second `start` racing this one on a fresh machine finished first, with the same
        # bytes. Anything else is a real failure and stays loud.
        shutil.rmtree(work)
        if not (cache / "dist/server.mjs").is_file():
            raise
    return cache / "dist"


def cmd_start(a):
    root = resolve_root()
    # The project is the directory named, else the one this is run from. The server opens it
    # beside every project in the projects folder, sends / to it, and runs the chat panel's
    # agent in it.
    project = Path(a.project or ".").expanduser().resolve()
    if not project.is_dir():
        raise SystemExit(f"error: {project} is not a directory")
    boards = project / CANVASES
    # Where the boards used to be. Moved here, as the server moves them for every project it
    # opens, because `canvases` is made below and the server would then find it already there
    # and leave the old one where it is.
    old = project / "mockups" / "canvases"
    if old.is_dir() and not boards.exists():
        old.rename(boards)
        print(f"moved {old} to {boards}")
        if all(f.name == ".DS_Store" for f in old.parent.iterdir()):
            shutil.rmtree(old.parent)

    if not boards.is_dir():
        print(f"note: {boards} does not exist yet — the canvas will open empty.")
        print("      Start a board with the clone-prototype or new-ui-mock skill.")
    # Create it here rather than leaving it to the server. The server creates it too (it has
    # to watch it), but a failure there is a stack trace inside a tmux pane that has already gone.
    try:
        boards.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        raise SystemExit(f"error: cannot create the boards directory {boards}\n  {e}")

    if _port_answers(a.port):
        raise SystemExit(
            f"error: port {a.port} is already answering. It may be another checkout's\n"
            f"canvas, so this will not reuse it. Pass --port with a free one, or run\n"
            f"`sp stop` if it is this one."
        )

    # The canvas is a built app served by one file, `dist/server.mjs`: the release's own
    # bundle, fetched once, or the checkout's build. Either way it is plain ESM, so node
    # where there is one and bun otherwise runs it. Checked before the fetch: a machine
    # with neither should hear so before it downloads an app it cannot run.
    runtime = shutil.which("node") and "node" or shutil.which("bun")
    if not runtime:
        raise SystemExit("error: neither node nor bun is on PATH to run the canvas server")
    dist = _dist(root)

    # Resolved once, here, and handed down: the server passes it on to every agent it spawns,
    # and derives it from nothing itself, because the bundle it runs may sit in the cache
    # directory with no checkout above it, and the root is where the skill it points the agent
    # at is.
    passed = {"SUPER_PROTOTYPING_ROOT": str(root)}
    env = dict(os.environ, **passed)
    # The server binds 127.0.0.1 itself: this is a design tool, not a service.
    cmd = [runtime, str(dist / "server.mjs"), "--port", str(a.port), "--open", str(project)]

    session = _session(a.port)
    if shutil.which("tmux"):
        # Only ever our own session for this port; the port is free or we would have exited
        # above, so anything still named this is a leftover of ours.
        subprocess.run(["tmux", "kill-session", "-t", _target(a.port)],
                       stderr=subprocess.DEVNULL)
        # A new session inherits the tmux *server's* environment, not this shell's, so a bun
        # installed after that server started would not be found. The env goes inline through
        # `env` rather than through `new-session -e`, which needs tmux 3.2 (Ubuntu 20.04 ships
        # 3.0a, and an unknown flag there would surface as a bare CalledProcessError).
        #
        # The trailing sleep keeps the pane alive after the server exits. Without it a server
        # that dies at boot takes its session with it, and the `capture-pane` command printed
        # below — the only way to see why — reports "session not found".
        inline = " ".join([
            "env",
            *(f"{k}={shlex.quote(v)}" for k, v in passed.items()),
            f"PATH={shlex.quote(os.environ.get('PATH', ''))}",
            shlex.join(cmd),
        ])
        subprocess.run(
            ["tmux", "new-session", "-d", "-s", session, "-c", str(dist.parent),
             f"{inline}; echo; echo '--- canvas exited'; sleep 3600"],
            check=True,
        )
        how = f"tmux session '{session}' — read it with: tmux capture-pane -p -t {session}"
    else:
        log = _logfile(a.port)
        log.parent.mkdir(parents=True, exist_ok=True)  # at the first write, not before
        with open(log, "wb") as fh:
            proc = subprocess.Popen(cmd, cwd=dist.parent, env=env, stdout=fh, stderr=fh,
                                    start_new_session=True)
        _pidfile(a.port).write_text(f"{proc.pid}\n")
        how = f"background process {proc.pid} — log at {log}"

    for _ in range(60):
        if _port_answers(a.port):
            break
        time.sleep(0.25)
    else:
        raise SystemExit(f"error: the server did not bind port {a.port} in 15s.\n  {how}")

    url = f"http://127.0.0.1:{a.port}/"
    # Opened for a person at a terminal. An agent runs this from a subprocess with no TTY, and
    # what it wants is the address printed below, not a browser tab per restart.
    if sys.stdout.isatty():
        webbrowser.open(url)
    print(f"canvas   {url}")
    print(f"boards   {boards}")
    print(f"project  {project}")
    print(f"app      {dist}")
    print(f"running  {how}")

    versions = skew(root)
    if versions:
        plugin, toolkit = versions
        print(f"\nnote: the plugin is {plugin}, the toolkit is {toolkit}. "
              f"Move the older one up:\n      {skew_fix(*versions)}")

    print(f"\nDeep-link a page with ?canvas=<slug>, one board of it with #<file>, "
          f"e.g. http://127.0.0.1:{a.port}/?canvas=notion-ios#01-splash")


def _is_our_server(pid, port):
    """Whether this pid is still the canvas we started on this port.

    The pidfile outlives reboots, and pids get recycled. Without this check `stop` sends
    SIGTERM to whatever process inherited the number — someone else's editor, a build, anything.
    """
    try:
        out = subprocess.run(["ps", "-o", "command=", "-p", str(pid)],
                             capture_output=True, text=True).stdout
    except FileNotFoundError:
        # No `ps` (Windows, a slim container). Not a guess either way: False would send
        # `clean` under a live server, True would send `stop`'s SIGTERM to a stranger.
        raise SystemExit(f"error: cannot tell whether pid {pid} is still the canvas "
                         "without `ps`; stop it by hand and remove the pidfile")
    return f"--port {port}" in out and "server.mjs" in out


def cmd_stop(a):
    """Stop the canvas on this port, and nothing else.

    Never a pattern kill: `pkill -f server.mjs` matches every such server on the machine,
    including ones belonging to other projects and other people's work.
    """
    session = _session(a.port)
    stopped = False

    if shutil.which("tmux"):
        stopped = subprocess.run(["tmux", "kill-session", "-t", _target(a.port)],
                                 stderr=subprocess.DEVNULL).returncode == 0
        if stopped:
            print(f"stopped tmux session '{session}'")

    pidfile = _pidfile(a.port)
    if pidfile.exists():
        pid = _pid_in(pidfile)
        if pid is None or not _is_our_server(pid, a.port):
            if pid is not None:
                print(f"note: pid {pid} is not this canvas any more — left alone, "
                      f"stale pidfile removed")
        else:
            try:
                # The group, not the process: `start_new_session=True` above makes the
                # server its own group leader, and the agents its chat panel spawned are in
                # it. Signalling the pid alone leaves them editing the project afterwards.
                os.killpg(pid, signal.SIGTERM)
                print(f"stopped background process {pid}")
                stopped = True
            except ProcessLookupError:
                pass      # gone between the check and the signal
            except PermissionError:
                print(f"error: process in {pidfile} is not yours to stop", file=sys.stderr)
        pidfile.unlink(missing_ok=True)

    if not stopped:
        print(f"no canvas of ours was running on port {a.port}")
        if _port_answers(a.port):
            print(f"  (something else is answering on {a.port} — left alone)")


def cmd_status(a):
    up = _port_answers(a.port)
    print(f"port {a.port}: {'answering' if up else 'silent'}")
    if up:
        print(f"  http://127.0.0.1:{a.port}/")
    print(f"session  {_session(a.port)}")


def cmd_root(a):
    """Just the path, so it can be captured: KIT="$(sp root)"."""
    root = resolve_root(verbose=a.verbose)
    print(root)
    if a.verbose:
        # On stderr, like the search itself, so `$(sp root -v)` is still the path.
        print(f"  plugin  {_plugin_version(root) or 'unversioned (a checkout)'}", file=sys.stderr)
        print(f"  toolkit {_toolkit_version() or 'dev (running from a source checkout)'}",
              file=sys.stderr)


def cmd_paths(a):
    """Every directory this writes and every variable that moves one, so they can be named in
    an uninstall note and removed by `clean`. `uv cache dir`, for two directories. The server
    it starts writes a third, the chat agent's sessions (canvas/server/agent.ts), which `clean`
    leaves alone: they are the user's conversations, not a download."""
    cache, state = _dirs()
    projects = (os.environ.get("PROTOTYPING_PROJECTS_DIR")
                or Path.home() / "Documents/Super Prototyping")
    print(f"cache  {cache}")
    print(f"state  {state}")
    print(f"agent  {Path(projects) / '.workspaces'}")
    print()
    for var in ("SUPER_PROTOTYPING_HOME", "XDG_CACHE_HOME", "XDG_STATE_HOME", "SP_CANVAS_PORT",
                "PROTOTYPING_PROJECTS_DIR", "SUPER_PROTOTYPING_ROOT"):
        print(f"{var:<25} {os.environ.get(var) or '(unset)'}")


def cmd_clean(a):
    """Remove both directories: every downloaded app, pidfile and log. The next `start`
    downloads again. `uv cache clean`, for two directories."""
    cache, state = _dirs()
    # Never from under a running canvas: it reads its files off this disk on every request.
    # One in tmux wrote no pidfile and is found by its session, as `stop` finds it; a
    # background one is found by its pidfile and nothing else, so removing that would leave
    # a server `stop` cannot see.
    live = []
    if shutil.which("tmux"):
        out = subprocess.run(["tmux", "list-sessions", "-F", "#{session_name}"],
                             capture_output=True, text=True).stdout
        # Whole lines: a session name may hold a space, and `notes canvas-9999` is not ours.
        live += re.findall(r"^canvas-(\d+)$", out, re.M)
    for pidfile in state.glob("canvas-*.pid"):
        port = pidfile.stem.removeprefix("canvas-")
        pid = _pid_in(pidfile)
        if pid is not None and _is_our_server(pid, port):
            live.append(port)
    if live:
        raise SystemExit(f"error: a canvas is still running on port {', '.join(live)}. "
                         f"Run `sp stop --port {live[0]}` first.")
    for d in (cache, state):
        if d.is_dir():
            shutil.rmtree(d)
            print(f"removed  {d}")
        else:
            print(f"absent   {d}")


def parser():
    p = argparse.ArgumentParser(
        prog="sp", description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--version", action="version",
                   version=f"sp {_toolkit_version() or 'dev (running from a source checkout)'}")
    s = p.add_subparsers(dest="cmd", required=True)

    def add(name, fn, ports=True):
        sub = s.add_parser(name)
        sub.set_defaults(fn=fn)
        if ports:
            # A string default is parsed as an argument would be, so a bad SP_CANVAS_PORT
            # gets argparse's own "invalid int value" rather than a traceback.
            sub.add_argument("--port", type=int,
                             default=os.environ.get("SP_CANVAS_PORT") or DEFAULT_PORT,
                             help=f"default SP_CANVAS_PORT, then {DEFAULT_PORT}")
        return sub

    add("start", cmd_start).add_argument(
        "project", nargs="?", help="the project directory (default: the current one)")
    add("stop", cmd_stop)
    add("status", cmd_status)
    root = add("root", cmd_root, ports=False)
    root.add_argument("-v", "--verbose", action="store_true",
                      help="also list every place that was searched")
    add("paths", cmd_paths, ports=False)
    add("clean", cmd_clean, ports=False)
    return p


def main():
    a = parser().parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
