#!/usr/bin/env python3
"""sp, the Super Prototyping command line.

  open      open the app on its home page, starting it if it is not running
  upgrade   have the app check for an update and install it
  start     serve the canvas without the app, and print its address
  stop      kill the one `start` ran on that port, and only that one
  status    say whether a canvas is up, and on what
  canvas    read, place and arrange what is on a canvas in the open app
  root      print the tree the canvas and the skills come from (-v: where it looked)
  paths     print the directories this writes, the chat agent's, and the
            variables that move them
  clean     remove every downloaded canvas and project, pidfile and log
  fetch     print the folder of a community project, downloading it the first time
  duplicate copy a community project into your projects, to edit it
  pack      check a project as a package to share (--check), or copy it out (-o)
  uninstall remove the links the app made: commands, skills, PATH line, Codex rule

The app is the only install. Every launch links sp, refkit and
artgen onto ~/.local/bin and the skills into each agent's skills directory,
through ~/.local/share/super-prototyping/current, which points at the app
(desktop/launch.ts).

A project is a folder under ~/Documents/Super Prototyping
(PROTOTYPING_PROJECTS_DIR moves it), its boards in its canvases folder, served
at /p/<name>/. No folder anywhere else is ever a project. SUPER_PROTOTYPING_ROOT
names the tree to use; the commands the app links set it. The port is --port
or SP_CANVAS_PORT.
"""
import argparse, base64, glob, hashlib, io, json, os, re, shlex, shutil, signal, subprocess
import sys, tarfile, tempfile, time, unicodedata, urllib.error, urllib.parse, urllib.request, uuid
import webbrowser
from pathlib import Path

DEFAULT_PORT = 5173
# The identifier every directory below is named by. Fixed, so the cask's `zap` and the
# desktop app's data directory point at the same folders and nothing migrates.
APP = "super-prototyping"
REPO = "ReScienceLab/super-prototyping"
# Where install.sh or install.ps1 puts the app, in the order it tries them. A module constant so
# a test can patch it without touching a real /Applications.
APP_BUNDLES = ([Path(os.environ.get("LOCALAPPDATA", "")) /
                "Programs/super-prototyping-desktop/Super Prototyping.exe"] if os.name == "nt" else
               [Path("/Applications/Super Prototyping.app"),
                Path.home() / "Applications/Super Prototyping.app"])
# The link every launch of the app repoints at its own tree (desktop/launch.ts dataDir).
CURRENT = Path.home() / ".local/share/super-prototyping/current"
# Prefix of the line notice() prints when the app has found a newer release. The line
# carries its own rule for acting on it.
NOTICE = "[super-prototyping:notice]"

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
    """Every place the tree could be, most explicit first. Yields (label, path)."""
    env = os.environ.get("SUPER_PROTOTYPING_ROOT")
    if env:
        yield "SUPER_PROTOTYPING_ROOT", Path(env).expanduser()

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

    yield "the app's current link", CURRENT
    for bundle in APP_BUNDLES:
        yield "Super Prototyping app", _plugin_of(bundle)


def _plugin_of(bundle):
    """The tree inside the app: electron-builder's resources folder, then the plugin."""
    if bundle.suffix == ".exe":
        return bundle.parent / "resources/plugin"
    return bundle / "Contents/Resources/plugin"


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


# The release tag this repo cuts. Kept in step with .version-bump.json, because the canvas
# download below is a URL built from it.
TAG_PREFIX = "super-prototyping--v"


def _toolkit_version():
    """The version of the toolkit this process runs from, or None from a source checkout."""
    try:
        from importlib.metadata import PackageNotFoundError, version
        return version("super-prototyping-tools")
    except (ImportError, PackageNotFoundError):
        return None


def _tree_version(root: Path):
    """The release the tree is, from `canvas/package.json`, which ships in the app and every
    checkout alike. None when it has none."""
    try:
        return json.loads((root / "canvas/package.json").read_text()).get("version")
    except (OSError, ValueError, AttributeError):
        return None


def _is_canvas_app(root: Path) -> bool:
    pkg = root / "canvas" / "package.json"
    try:
        return json.loads(pkg.read_text()).get("name") == "prototyping-canvas"
    except (OSError, ValueError):
        return False


def resolve_root(verbose=False):
    """The tree holding canvas/, or exit with everywhere that was tried."""
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
        print("  (nothing to look at, no app and no checkout)", file=sys.stderr)
    print(
        "\nFix by installing the app, which the sp-canvas skill's scripts/install.sh\n"
        "does, or point at a checkout directly:\n"
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
    on or shipped in the app, else the canvas built for the tree's release, from the cache or
    downloaded into it.

    A checkout with `node_modules`, or with a dist already built, is a developer's: it serves
    what is on disk, rebuilt when a source is newer, and this is the one path that still
    needs bun. A fresh clone is served the release its `canvas/package.json` names, spelled
    as the tag is, until `bun install` marks it as being worked on.

    The tarball is the one release.yml attaches to every release: one top-level `dist/`
    holding the built app and `server.mjs`. One directory per version, so a new release
    fetches its own and the old one waits for `sp clean`. A version directory is whole
    or absent, never half: it is unpacked beside its name and renamed into place, so the one
    file the cache check looks for cannot be there without the rest.
    """
    app = root / "canvas"
    own = (app / "dist/server.mjs").is_file()
    version = _tree_version(root)
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
            raise SystemExit(f"error: release {version} has no canvas app attached\n  {url}\n{build}")
        raise SystemExit(
            f"error: could not download the canvas app for {version}\n  {url}\n  {e}\n"
            f"Try again once the network is back. {build}")
    cache.parent.mkdir(parents=True, exist_ok=True)
    work = tempfile.mkdtemp(prefix=f"{version}.", dir=cache.parent)
    _extract(archive, work)
    try:
        os.rename(work, cache)
    except OSError:
        # A second `start` racing this one on a fresh machine finished first, with the same
        # bytes. Anything else is a real failure and stays loud.
        shutil.rmtree(work)
        if not (cache / "dist/server.mjs").is_file():
            raise
    return cache / "dist"


def _extract(archive: bytes, into: str):
    """Unpack a .tar.gz into `into`, which `filter="data"` keeps everything inside: no absolute
    path, no `..`, no link out of it, no device. It arrived in the 2023 security releases (3.10.12,
    3.11.4), and an older Python is refused rather than trusted with a downloaded archive."""
    if not hasattr(tarfile, "data_filter"):
        raise SystemExit(f"error: Python {sys.version.split()[0]} cannot unpack a download "
                         "safely. Update it to 3.10.12, 3.11.4 or later.")
    with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tar:
        # The unpacked size, which a small gzip can hide: no more than a package can be.
        if sum(m.size for m in tar.getmembers()) > PACK_TOTAL_CAP:
            raise SystemExit(f"error: the archive unpacks to over {PACK_TOTAL_CAP >> 20} MB")
        tar.extractall(into, filter="data")


def cmd_start(a):
    root = resolve_root()
    if _port_answers(a.port):
        app = _running_app()
        if app and app["port"] == a.port:
            raise SystemExit(f"error: port {a.port} is the app's canvas. Open it instead:\n"
                             f"  sp open")
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
    cmd = [runtime, str(dist / "server.mjs"), "--port", str(a.port)]

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
    print(f"projects {_projects_dir()}")
    print(f"app      {dist}")
    print(f"running  {how}")

    print(f"\nDeep-link a page with ?canvas=<slug>, one board of it with #<file>, "
          f"e.g. http://127.0.0.1:{a.port}/p/<name>/?canvas=<slug>#01-splash")


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
        app = _running_app()
        if app and app["port"] == a.port:
            print(f"  (the app is serving {a.port}; quit the app to stop it)")
        elif _port_answers(a.port):
            print(f"  (something else is answering on {a.port} — left alone)")


def cmd_status(a):
    app = _running_app()
    if app:
        print(f"app      {app['version']}, pid {app['pid']}, http://127.0.0.1:{app['port']}/")
    else:
        print("app      not running")
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
        print(f"  tree    {_tree_version(root) or 'unversioned'}", file=sys.stderr)
        print(f"  toolkit {_toolkit_version() or 'dev (running from a source checkout)'}",
              file=sys.stderr)


def _projects_dir():
    """Where every project is, the only place one can be (canvas/server/projects.ts)."""
    return Path(os.environ.get("PROTOTYPING_PROJECTS_DIR")
                or Path.home() / "Documents/Super Prototyping")


def cmd_paths(a):
    """Every directory this writes and every variable that moves one, so they can be named in
    an uninstall note and removed by `clean`. `uv cache dir`, for two directories. The server
    it starts writes a third, the chat agent's sessions (canvas/server/agent.ts), which `clean`
    leaves alone: they are the user's conversations, not a download."""
    cache, state = _dirs()
    print(f"cache  {cache}")
    print(f"state  {state}")
    print(f"agent  {_projects_dir() / '.workspaces'}")
    print()
    for var in ("SUPER_PROTOTYPING_HOME", "XDG_CACHE_HOME", "XDG_STATE_HOME", "SP_CANVAS_PORT",
                "PROTOTYPING_PROJECTS_DIR", "SUPER_PROTOTYPING_ROOT"):
        print(f"{var:<25} {os.environ.get(var) or '(unset)'}")


def cmd_clean(a):
    """Remove every downloaded canvas, and the pidfiles and logs `start` wrote. The next
    `start` downloads again. Only `start`'s own files in the state directory: the app keeps
    its window, its update check and the canvas document (IndexedDB) there too."""
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
    if cache.is_dir():
        shutil.rmtree(cache)
        print(f"removed  {cache}")
    else:
        print(f"absent   {cache}")
    for f in sorted(state.glob("canvas-*")):
        f.unlink()
        print(f"removed  {f}")


# --- sp pack -----------------------------------------------------------------
# A project as it is shared: the whole folder less what is left out below, by where a file
# sits and not by what it is, so a kind of content nobody has made yet ships unchanged.
# docs/2026-09-25-project-package.md has the why, and skills/sp-canvas/references/layout.md
# the layout. The rules for references and covers repeat canvas/server and canvas/src/cover.ts.

PACK_FILE_CAP = 50 << 20   # GitHub warns at 50 MB and refuses a file over 100 MB
PACK_TOTAL_CAP = 200 << 20
PROJECT_FORMAT = 1
THUMBNAIL = (2400, 1260)   # an Open Graph image's 1200 x 630, twice over
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
LOGIN = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$")  # a GitHub login


def _left_out(rel: Path) -> bool:
    """Whether a path under canvases/ stays out of the package: work in progress, captures of
    other people's products, review threads, measurement evidence and anything hidden."""
    parts = rel.parts
    return (any(p.startswith(".") or p == "scratch" for p in parts)
            or parts[-1].startswith("ref-")
            or parts[1:3] == ("assets", "refs")
            or parts[-1] in ("comments.json", "probes.json", "crops.json"))


def _pack(project: Path):
    """-> (project.json, [(rel, size)] shipped, [rel] left out, [problem])."""
    ship, out, problems = [], [], []

    def json_of(rel):
        try:
            return json.loads((project / rel).read_text(encoding="utf-8"))
        except (OSError, ValueError) as e:
            problems.append(f"{rel}: does not parse ({e})")

    def add(rel):
        if (project / rel).is_symlink():
            return problems.append(f"{rel}: is a symlink")
        # A Windows junction is no symlink to is_symlink() and os.walk goes through it.
        if not (project / rel).resolve().is_relative_to(project.resolve()):
            return problems.append(f"{rel}: is outside the project")
        for part in rel.parts:
            if "#" in part or "?" in part:
                problems.append(f"{rel}: # and ? are not allowed in a name")
            elif not unicodedata.is_normalized("NFC", part):
                problems.append(f"{rel}: the name is not NFC")
        size = (project / rel).stat().st_size
        if size > PACK_FILE_CAP:
            problems.append(f"{rel}: {size >> 20} MB, over the {PACK_FILE_CAP >> 20} MB a file "
                            "can be. Link a long video from where it is hosted.")
        ship.append((rel, size))

    for e in sorted(project.iterdir()):
        rel = Path(e.name)
        if e.name == "project.json" or (e.name.endswith(".md") and e.is_file()
                                         and not e.name.startswith(".")):
            add(rel)
        elif e.name != "canvases":
            out.append(rel)
    canvases = project / "canvases"
    if canvases.is_symlink():
        problems.append("canvases: is a symlink")
    elif canvases.is_dir():
        for top, dirs, files in os.walk(canvases):
            base = Path(top).relative_to(canvases)
            for d in list(dirs):
                if _left_out(base / d):
                    out.append(Path("canvases") / base / d)
                    dirs.remove(d)
                elif (Path(top) / d).is_symlink():
                    problems.append(f"{Path('canvases') / base / d}: is a symlink")
                    dirs.remove(d)
            dirs.sort()
            for f in sorted(files):
                rel = Path("canvases") / base / f
                if base == Path("."):
                    out.append(rel)  # a loose file beside the canvas folders is no canvas's
                elif _left_out(base / f):
                    out.append(rel)
                else:
                    add(rel)
    total = sum(size for _, size in ship)
    if total > PACK_TOTAL_CAP:
        problems.append(f"{total >> 20} MB in all, over the {PACK_TOTAL_CAP >> 20} MB a "
                        "package can be")

    shipped = {rel.as_posix() for rel, _ in ship}
    # A project with none is format 1 with no id yet, which -o gives it.
    pj = json_of("project.json") if "project.json" in shipped else {}
    if pj is not None and not isinstance(pj, dict):
        problems.append("project.json: is not a JSON object")
    elif pj is not None:
        if pj.get("format", 1) != PROJECT_FORMAT:
            problems.append(f"project.json: format {pj['format']!r} is not one this sp knows")
        if "id" in pj and not (isinstance(pj["id"], str) and UUID.match(pj["id"])):
            problems.append("project.json: id is not a UUID")
        if "author" in pj and not (isinstance(pj["author"], str) and LOGIN.match(pj["author"])):
            problems.append("project.json: author is not a GitHub login")
        people = pj.get("contributors", [])
        if not (isinstance(people, list)
                and all(isinstance(c, str) and LOGIN.match(c) for c in people)):
            problems.append("project.json: contributors is not a list of GitHub logins")

    def resolves(src_folder, ref, what):
        """A reference the app makes, relative to a canvas folder, has to be a shipped file."""
        target = os.path.normpath(f"canvases/{src_folder}/{ref}").replace(os.sep, "/")
        # One left out on purpose, a reference row's capture say, the app shows as missing.
        left_out = target.startswith("canvases/") and _left_out(Path(target).relative_to("canvases"))
        if target not in shipped and not left_out:
            problems.append(f"canvases/{src_folder}: {what} {ref} is not in the package")

    for slug in sorted({Path(r).parts[1] for r in shipped if r.startswith("canvases/")}):
        try:
            if f"canvases/{slug}/layout.json" in shipped:
                layout = json_of(f"canvases/{slug}/layout.json")
                if not isinstance(layout, dict):
                    if layout is not None:
                        problems.append(f"canvases/{slug}/layout.json: is not a JSON object")
                    layout = {}
                if isinstance(layout.get("cover"), str):
                    resolves(slug, layout["cover"] + ".html", "cover")
                for row in layout.get("rows") or []:
                    for entry in row.get("files") or []:
                        name = entry if isinstance(entry, str) else entry.get("file")
                        resolves(slug, f"{name}.html", "board")
                    for image in row.get("images") or []:
                        resolves(slug, image.get("file"), "image")
                    for link in row.get("links") or []:
                        if not re.match(r"^https?://", str(link.get("url")), re.I):
                            problems.append(f"canvases/{slug}/layout.json: link "
                                            f"{link.get('url')!r} is not a web address")
            if f"canvases/{slug}/canvas.json" in shipped:
                content = json_of(f"canvases/{slug}/canvas.json")
                for record in (content or {}).get("records") or []:
                    src = record.get("props", {}).get("src") if record.get("typeName") == "asset" else None
                    # A relative src is a file the canvas keeps; data: and web addresses are not files.
                    if isinstance(src, str) and src.startswith(("./", "../")):
                        resolves(slug, src, "file")
        except (AttributeError, TypeError):
            problems.append(f"canvases/{slug}: layout.json or canvas.json is not in the shape "
                            "the app writes")
    if not any(re.match(r"^canvases/[^/]+/[^/]+\.html$", r) for r in shipped):
        problems.append("canvases: the project has no board")
    if isinstance(pj, dict) and isinstance(pj.get("cover"), dict):
        path, box = pj["cover"].get("path"), pj["cover"].get("box")
        if f"canvases/{path}" not in shipped:
            problems.append(f"project.json: cover {path!r} is not in the package")
        elif str(path).lower().endswith(".svg") and _svg_size(project / "canvases", path) is None:
            problems.append(f"project.json: cover {path!r} is in no row of its canvas's layout.json, "
                            "which gives an SVG its size")
        if box is not None and not (isinstance(box, list) and len(box) == 4
                                    and all(isinstance(v, (int, float)) for v in box)
                                    and box[2] > 0 and box[3] > 0):
            problems.append("project.json: cover box is not [x, y, w, h]")
    return pj, ship, out, problems


def _layout_of(folder: Path) -> dict:
    try:
        layout = json.loads((folder / "layout.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return layout if isinstance(layout, dict) else {}


def _svg_size(canvases: Path, path: str):
    """(w, h) its images row gives an SVG under canvases/, or None. Pillow reads no SVG."""
    folder, rel = Path(path).parts[0], Path(*Path(path).parts[1:]).as_posix()
    return next(((i["w"], i["h"]) for row in _layout_of(canvases / folder).get("rows") or []
                 for i in row.get("images") or []
                 if isinstance(i, dict) and i.get("file") == rel), None)


def _cover(project: Path, pj: dict):
    """-> ([(file, box, size)], its canvas's folder) of the project's cover, as canvas/src/cover.ts
    projectCover finds it: the one project.json chose, else the first canvas's cover board and
    the ones after it in its row."""
    canvases = project / "canvases"
    chosen = pj.get("cover") if isinstance(pj.get("cover"), dict) else {}
    if chosen.get("path"):
        file = canvases / chosen["path"]
        folder = canvases / Path(chosen["path"]).parts[0]
        layout = _layout_of(folder)
        box = chosen.get("box")
        if file.suffix == ".html":
            w, h = _board_size(layout, file.stem)
        elif file.suffix.lower() == ".svg":
            w, h = _svg_size(canvases, chosen["path"])
        else:
            return [(file, box, None)], folder
        return [(file, box or [0, 0, w, h], (w, h))], folder
    folders = [d for d in canvases.iterdir() if d.is_dir() and any(d.glob("*.html"))]
    folders.sort(key=lambda d: _numeric(d.name))
    folders.sort(key=lambda d: _layout_of(d).get("order", 0))
    return _canvas_cover(folders[0])


def _numeric(s):
    return [int(t) if t.isdigit() else t for t in re.split(r"(\d+)", s)]


def _board_size(layout, name):
    for row in layout.get("rows") or []:
        for entry in row.get("files") or []:
            if isinstance(entry, dict) and entry.get("file") == name and entry.get("w"):
                return entry["w"], entry["h"]
    return 478, 980  # CANVAS_FILE_DEFAULT_SIZE


def _canvas_cover(folder: Path):
    """One canvas folder's cover board, whole, then the boards after it in its row that are as
    tall, which the thumbnail sets beside it while they fit: layout.json's cover, else its
    first board that is not a 00- one."""
    layout = _layout_of(folder)
    names = sorted((f.stem for f in folder.glob("*.html")), key=_numeric)
    name = next((n for n in names if n == layout.get("cover")),
                next((n for n in names if not n.startswith("00")), names[0]))
    row = next((r for r in (_row_names(r) for r in layout.get("rows") or []) if name in r), [name])
    after = row[row.index(name):] + row[:row.index(name)]
    h = _board_size(layout, name)[1]
    return [(folder / f"{n}.html", [0, 0, *_board_size(layout, n)], _board_size(layout, n))
            for n in after if n in names and _board_size(layout, n)[1] == h], folder


def _row_names(row):
    return [e.get("file") if isinstance(e, dict) else e for e in row.get("files") or []]


def _shot(file: Path, box, size, tmp: str, scale: int):
    """One cover image, cropped to its box, at `scale`."""
    from PIL import Image
    if size is None:
        im = Image.open(file).convert("RGBA")
    else:
        import refkit
        shot, page = Path(tmp) / f"{file.stem}.png", file.resolve().as_uri()
        if file.suffix.lower() == ".svg":
            # Filling its row's box, as the canvas draws it, not at its own width and height.
            page = Path(tmp) / f"{file.stem}.html"
            page.write_text(f'<body style="margin:0"><img src="{file.resolve().as_uri()}" '
                            f'style="display:block;width:{size[0]}px;height:{size[1]}px">')
            page = page.as_uri()
        # Transparent where the board paints nothing, as the canvas shows it.
        subprocess.run([refkit.CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                        "--allow-file-access-from-files", "--default-background-color=00000000",
                        f"--force-device-scale-factor={scale}", f"--window-size={size[0]},{size[1]}",
                        f"--screenshot={shot}", page],
                       check=True, capture_output=True)
        im = Image.open(shot).convert("RGBA")
        box = [v * scale for v in box]
    if box:
        x, y, w, h = box
        im = im.crop((round(x), round(y), round(x + w), round(y + h)))
    return im


def _canvas_name(folder: Path) -> str:
    """What the app calls a canvas: layout.json's name less the examples' "(example) ", else the
    folder's name, humanized (canvas/src/canvasLibrary.ts shortName)."""
    name = _layout_of(folder).get("name")
    if isinstance(name, str) and name.strip():
        return re.sub(r"^\(example\)\s*", "", name)
    return re.sub(r"[-_]+", " ", folder.name).strip().title()


def _thumbnail(found, png: Path, title: str, boards: int):
    """A book's cover at THUMBNAIL, on the canvas's ground: the project's name set as a title
    down the left beside a spine, under the app's icon where the canvas has one, and its cover
    to the right, each image whole and side by side
    at one height, as many as fit. What the community page shows for a project without running
    a board, and its Open Graph image as it is."""
    import html
    from PIL import Image
    items, folder = found
    ground = _layout_of(folder).get("ground")
    ground = ground if isinstance(ground, str) and re.match(r"^#[0-9a-fA-F]{6}$", ground) else "#2b2b2b"
    r, g, b = (int(ground[i:i + 2], 16) for i in (1, 3, 5))
    ink = "#15130f" if 0.2126 * r + 0.7152 * g + 0.0722 * b > 140 else "#f4efe6"
    scale = 2
    tw, th = THUMBNAIL[0] // scale, THUMBNAIL[1] // scale  # CSS px
    left, text, pad, gap = 84, 400, 52, 24                 # the spine's margin, the title's column
    room = (tw - left - text - 40 - 64) * scale, (th - 2 * pad) * scale
    ims = []
    with tempfile.TemporaryDirectory() as tmp:
        for file, box, size in items:
            im = _shot(file, box, size, tmp, scale)
            w = round(im.width * room[1] / im.height)
            if ims and sum(i.width + gap * scale for i in ims) + w > room[0]:
                break
            ims.append(im.resize((w, room[1]), Image.LANCZOS))
        if ims[0].width > room[0]:  # one wider than the room, a web page's, fits its width
            ims = [ims[0].resize((room[0], max(1, round(ims[0].height * room[0] / ims[0].width))),
                                 Image.LANCZOS)]
        strip = Image.new("RGBA", (sum(i.width for i in ims) + gap * scale * (len(ims) - 1),
                                   max(i.height for i in ims)), (0, 0, 0, 0))
        x = 0
        for im in ims:
            strip.alpha_composite(im, (x, (strip.height - im.height) // 2))
            x += im.width + gap * scale
        strip.save(Path(tmp) / "cover.png")
        icon = folder / "icon.png"
        icon = f'<img class="icon" src="{icon.resolve().as_uri()}" alt="">' if icon.is_file() else ""
        page = Path(tmp) / "thumbnail.html"
        page.write_text(f"""<!doctype html><meta charset="utf-8"><style>
body {{ margin: 0; width: {tw}px; height: {th}px; overflow: hidden; background: {ground};
  color: {ink}; font-family: "Iowan Old Style", "New York", Georgia, "Times New Roman", serif;
  display: flex; align-items: center; }}
.spine {{ position: absolute; inset: 0 auto 0 0; width: 30px; background: rgb(0 0 0 / 0.22);
  box-shadow: inset -1px 0 rgb(255 255 255 / 0.08), 1px 0 rgb(0 0 0 / 0.25); }}
.text {{ position: absolute; left: {left}px; top: {pad + 12}px; bottom: {pad + 12}px;
  width: {text}px; display: flex; flex-direction: column; justify-content: space-between; }}
.imprint {{ font: 500 13px/1 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
  letter-spacing: 0.28em; text-transform: uppercase; opacity: 0.55; }}
h1 {{ margin: 0; font-size: {64 if len(title) < 16 else 54}px; line-height: 1.04; font-weight: 400;
  letter-spacing: -0.01em; text-wrap: balance; }}
.rule {{ width: 56px; height: 2px; background: currentColor; opacity: 0.5; margin: 26px 0 16px; }}
.sub {{ font-size: 22px; font-style: italic; opacity: 0.7; }}
.icon {{ display: block; width: 88px; height: 88px; border-radius: 22.5%; margin-bottom: 30px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.3), 0 0 0 1px rgb(255 255 255 / 0.06); }}
.cover {{ position: absolute; right: 64px; top: 50%; transform: translateY(-50%);
  width: {strip.width / scale}px; height: {strip.height / scale}px; }}
</style><div class="spine"></div>
<div class="text"><div class="imprint">Super Prototyping</div>
<div>{icon}<h1>{html.escape(title)}</h1><div class="rule"></div>
<div class="sub">{boards} board{"" if boards == 1 else "s"}</div></div></div>
<img class="cover" src="cover.png" alt="">""", encoding="utf-8")
        import refkit
        subprocess.run([refkit.CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                        "--allow-file-access-from-files", f"--force-device-scale-factor={scale}",
                        f"--window-size={tw},{th}", f"--screenshot={png.resolve()}", page.as_uri()],
                       check=True, capture_output=True)
    Image.open(png).convert("RGB").save(png, optimize=True)


def cmd_thumbnail(a):
    """Draw each canvas folder's thumbnail.png, as `sp pack -o` draws a project's."""
    for folder in map(Path, a.folders):
        if not any(folder.glob("*.html")):
            raise SystemExit(f"error: {folder} has no board")
        _thumbnail(_canvas_cover(folder), folder / "thumbnail.png", _canvas_name(folder),
                   len(list(folder.glob("*.html"))))
        print(f"drew      {folder / 'thumbnail.png'}")


def cmd_pack(a):
    """Check a project as a package, and with -o copy it out, with a thumbnail of its cover.
    Filling in a missing id and author is the only write to the project."""
    project = Path(a.project).expanduser()
    if not project.is_dir():
        project = _projects_dir() / a.project
    if not project.is_dir():
        raise SystemExit(f"error: no project at {a.project}, nor in {_projects_dir()}")
    project = project.resolve()
    pj, ship, out, problems = _pack(project)
    for rel in out:
        print(f"left out  {rel.as_posix()}")
    for p in problems:
        print(f"problem   {p}", file=sys.stderr)
    if problems:
        raise SystemExit(f"error: {len(problems)} problem(s), nothing written")
    if a.check and "id" not in pj:
        raise SystemExit("error: project.json has no id yet. `sp pack -o` gives it one.")
    if a.check and "author" not in pj:
        raise SystemExit("error: project.json has no author. `sp pack -o` sets it to the GitHub "
                         "login gh is signed in as, or set \"author\" to yours.")
    filled = {}
    if "author" not in pj:
        # The community repo's CI holds the author to whoever opens the pull request.
        login = _gh_login()
        if not login:
            raise SystemExit("error: project.json has no author, and gh is not signed in. Set "
                             "\"author\" to your GitHub login, or run `gh auth login`.")
        filled["author"] = login
    if "id" not in pj:
        filled["id"] = str(uuid.uuid4())
    if filled:
        pj.update(filled)
        text = json.dumps(pj, indent=2) + "\n"
        (project / "project.json").write_text(text, encoding="utf-8")
        ship = [(rel, size) for rel, size in ship if rel != Path("project.json")]
        ship.insert(0, (Path("project.json"), len(text.encode())))
        for key, value in filled.items():
            print(f"{key:<9} {value}, written to project.json")
    total = sum(size for _, size in ship)
    print(f"{len(ship)} files, {total / (1 << 20):.1f} MB, id {pj['id']}")
    if a.check:
        return
    dest = Path(a.output).expanduser()
    if dest.exists() and any(dest.iterdir()):
        raise SystemExit(f"error: {dest} is not empty. Remove it first.")
    dest.mkdir(parents=True, exist_ok=True)
    _thumbnail(_cover(project, pj), dest / "thumbnail.png", pj.get("name") or project.name,
               sum(1 for r, _ in ship if re.match(r"^canvases/[^/]+/[^/]+\.html$", r.as_posix())))
    for rel, _ in ship:
        (dest / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(project / rel, dest / rel)
    print(f"packed    {dest}")


def _gh_login() -> str:
    """The GitHub login gh is signed in as, or ""."""
    try:
        gh = subprocess.run(["gh", "api", "user", "--jq", ".login"],
                            capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.TimeoutExpired):
        return ""
    login = gh.stdout.strip() if gh.returncode == 0 else ""
    return login if LOGIN.match(login) else ""


# --- sp fetch, sp duplicate --------------------------------------------------
# A community project on demand. The community repo's CI uploads each one, on every merge that
# changes it, as the `archives` release's <id>.tar.gz: one folder, <id>/, as it is in the repo.
# docs/2026-09-26-projects-on-demand.md has the why.

COMMUNITY = "ReScienceLab/super-prototyping-community"


def _download_project(pid: str, parent: Path) -> Path:
    """Download a community project into a new temporary folder under `parent`, on the same
    disk as where it goes, so it is renamed into place whole. -> the temporary folder, holding
    <id>/. The caller removes it."""
    if not UUID.match(pid):
        raise SystemExit(f"error: {pid!r} is not a project id. A community project's is a UUID, "
                         "the one in its superproto.dev/p/<id> address.")
    url = f"https://github.com/{COMMUNITY}/releases/download/archives/{pid}.tar.gz"
    try:
        with urllib.request.urlopen(url, timeout=60) as response:
            archive = response.read()
    except OSError as e:
        if isinstance(e, urllib.error.HTTPError) and e.code == 404:
            raise SystemExit(f"error: the community has no project {pid}\n  {url}")
        raise SystemExit(f"error: could not download project {pid}\n  {url}\n  {e}")
    parent.mkdir(parents=True, exist_ok=True)
    # A dot name, which the projects folder's listing skips while it is being filled.
    work = Path(tempfile.mkdtemp(prefix=f".{pid}.", dir=parent))
    try:
        _extract(archive, str(work))
        if [e.name for e in work.iterdir()] != [pid] or not (work / pid).is_dir():
            raise SystemExit(f"error: the archive of {pid} does not hold one folder, {pid}/")
    except BaseException:
        shutil.rmtree(work)
        raise
    return work


def cmd_fetch(a):
    """Print the folder holding a community project, downloading it the first time. It is a
    reference copy, for reading: its folder being there is the whole cache, and --fresh
    replaces it with the project as it is now."""
    cache = _dirs()[0] / "projects"
    dest = cache / a.id
    if a.fresh or not dest.is_dir():
        work = _download_project(a.id, cache)
        try:
            if dest.is_dir():
                shutil.rmtree(dest)
            try:
                os.rename(work / a.id, dest)
            except OSError:
                # Another fetch of the same project finished first. Anything else stays loud.
                if not dest.is_dir():
                    raise
        finally:
            shutil.rmtree(work)
    print(dest)


def cmd_duplicate(a):
    """Copy a community project into the projects folder as a new project of the user's, the
    only way to edit one. Always downloaded, never from `fetch`'s cache, so each folder has one
    writer. It never merges into a folder: a taken name becomes "<name> 2", as a new project's
    does (canvas/server/projects.ts). Prints the new project's name."""
    projects = _projects_dir()
    work = _download_project(a.id, projects)
    try:
        folder = work / a.id
        pj_file = folder / "project.json"
        pj = json.loads(pj_file.read_text(encoding="utf-8")) if pj_file.is_file() else {}
        # A new project of the user's, crediting the one it came from, as CC BY 4.0 asks.
        pj.update({"id": str(uuid.uuid4()), "contributors": [], "from": a.id})
        login = _gh_login()
        if login:
            pj["author"] = login
        else:
            pj.pop("author", None)  # `sp pack -o` asks for one when it is shared
        pj_file.write_text(json.dumps(pj, indent=2) + "\n", encoding="utf-8")
        base = pj.get("name")
        base = base.strip() if isinstance(base, str) else ""
        if not base or base.startswith(".") or os.path.basename(base) != base:
            base = "Untitled"
        name, n = base, 2
        while (projects / name).exists():
            name, n = f"{base} {n}", n + 1
        os.rename(folder, projects / name)
    finally:
        shutil.rmtree(work)
    print(name)


# --- the app -----------------------------------------------------------------

def _state_json(name):
    """One of the files the app writes beside `start`'s own (desktop/main.ts), or None."""
    try:
        return json.loads((_dirs()[1] / name).read_text())
    except (OSError, ValueError):
        return None


def _running_app():
    """`app.json` while the app that wrote it still runs: {port, pid, version}. A file left by
    an app that crashed names a pid that is gone, or someone else's by now."""
    app = _state_json("app.json")
    if not app:
        return None
    ps = (["tasklist", "/fi", f"pid eq {app['pid']}", "/nh"] if os.name == "nt" else
          ["ps", "-o", "command=", "-p", str(app["pid"])])
    out = subprocess.run(ps, capture_output=True, text=True).stdout
    return app if "Super Prototyping" in out else None


def _app_bundle():
    """The .app (or .exe) to start, or hand an upgrade to: the one the tree is inside, else
    the one install.sh or install.ps1 put in place."""
    root = resolve_root()
    real = root.resolve()
    if real.parent.parent.name == "Contents" and real.parents[2].suffix == ".app":
        return real.parents[2]
    for bundle in APP_BUNDLES:
        if bundle.exists():
            return bundle
    script = "install.ps1" if os.name == "nt" else "install.sh"
    raise SystemExit(
        "error: the Super Prototyping app is not installed. Install it with\n"
        f"  {root / 'skills/sp-canvas/scripts' / script}")


def _launch(*args):
    """Hand the app arguments. `-n` starts a second instance, which passes them to the
    running one and exits; a plain `open -a` would only bring it to the front. On Windows every
    start is a new instance already."""
    if os.name == "nt":
        os.startfile(_app_bundle(), arguments=subprocess.list2cmdline(args))
    else:
        subprocess.run(["open", "-n", "-a", str(_app_bundle()), "--args", *args], check=True)


def cmd_open(a):
    _launch()
    for _ in range(120):
        app = _running_app()
        if app:
            print(f"canvas   http://127.0.0.1:{app['port']}/")
            print(f"projects {_projects_dir()}")
            return
        time.sleep(0.25)
    raise SystemExit("error: the app did not start in 30s. Open it from Applications to see why.")


def cmd_upgrade(a):
    """Ask the app to check now, then report what it found. The app downloads an update on
    its own and asks the user to restart into it, so this waits only for the answer."""
    before = _state_json("update.json") or {}
    _launch("--upgrade")
    for _ in range(240):
        update = _state_json("update.json")
        if update and update.get("checkedAt") != before.get("checkedAt"):
            break
        time.sleep(0.25)
    else:
        raise SystemExit("error: the app did not answer in 60s. Is it running? Try `sp open`, "
                         "then `sp upgrade` again.")
    if update.get("error"):
        # With a version, the check found it and its download failed; without one, the check did.
        what = f"download {update['available']}" if update["available"] else "check for an update"
        raise SystemExit(f"error: the app could not {what}: {update['error'].splitlines()[0]}\n"
                         "Run `sp upgrade` again to retry.")
    if update["downloaded"]:
        print(f"Super Prototyping {update['downloaded']} is downloaded. The app is asking the "
              f"user to restart into it; tell them to click Restart Now.")
    elif update["available"]:
        # update.json holds only the latest record, so this check's has already replaced the one
        # saying the last download failed. The same app after the same version is a retry.
        failed = (before.get("available") == update["available"]
                  and before.get("current") == update["current"] and before.get("error"))
        again = f" again; the last try failed: {failed.splitlines()[0]}" if failed else ""
        print(f"Super Prototyping {update['available']} is downloading{again}. The app asks the "
              f"user to restart once it is down.")
    else:
        print(f"Super Prototyping {update['current']} is up to date.")


def cmd_uninstall(a):
    """Undo what the app links into the machine, and nothing it did not make: links that
    resolve through `current`, and the exact lines it appended. The app itself, and the
    directories `sp paths` lists, are left for the user."""
    home = Path.home()
    links = [d for h in (".claude", ".agents", ".hermes", ".factory")
             for d in (home / h / "skills").glob("*")]
    if os.name != "nt":
        links += [home / ".local/bin" / c for c in ("sp", "refkit", "artgen")]
    for link in links:
        if _points_into(link, CURRENT):
            _unlink(link)
            print(f"removed  {link}")
    # The two lines desktop/launch.ts ensurePathInRc appends, exactly.
    added = ("\n# Added by Super Prototyping: sp, refkit and artgen live here.\n"
             'export PATH="$HOME/.local/bin:$PATH"\n')
    for rc in (".zshrc", ".bash_profile"):
        _drop_lines(home / rc, lambda text: text.replace(added, ""))
    _drop_lines(home / ".codex/rules/default.rules", lambda text: re.sub(
        r'^prefix_rule\(pattern=\["(sp|refkit|artgen)"\], decision="allow"\)\n', "", text,
        flags=re.M))
    if _points_into(CURRENT, None):
        _unlink(CURRENT)
        print(f"removed  {CURRENT}")
    # Or a reinstall of the same version would skip `uv tool install` (desktop/main.ts).
    (CURRENT.parent / "tools-version").unlink(missing_ok=True)
    if os.name == "nt":
        print("\nThe commands are a uv tool, which cannot remove itself while it runs. Next:\n"
              "  uv tool uninstall super-prototyping-tools\n"
              "The app links the skills again on its next launch: uninstall Super Prototyping "
              "from Settings > Apps too. Your projects and `sp paths` are left alone.")
    else:
        print("\nThe app links all of it again on its next launch: move Super Prototyping.app "
              "to the Trash too. Your projects and `sp paths` are left alone.")


def _points_into(link, base):
    """Whether `link` is a symlink or junction, into `base` when one is given. A junction reads
    back with Windows's `\\\\?\\` prefix."""
    try:
        target = Path(os.readlink(link).removeprefix("\\\\?\\"))
    except OSError:
        return False
    return base is None or target.is_relative_to(base)


def _unlink(link):
    """A junction, or a Windows link to a directory, goes with rmdir, which leaves its target."""
    os.rmdir(link) if os.name == "nt" else link.unlink()


def _drop_lines(file, edit):
    try:
        text = file.read_text()
    except OSError:
        return
    if edit(text) != text:
        file.write_text(edit(text))
        print(f"edited   {file}")


def notice():
    """One line on stderr when the app has found a newer release, carrying the rule for what
    to do about it, so an agent that reads it needs nothing else. ego-browser's notice, for
    the same reason: the agent is who runs these commands, and the one who can act on it."""
    update = _state_json("update.json")
    if not update:
        return
    newer = update.get("downloaded") or update.get("available")
    if newer and _version_key(newer) > _version_key(update["current"]):
        print(f"{NOTICE} Super Prototyping {newer} is available (this is {update['current']}). "
              f"Finish the current step, then run `sp upgrade` and tell the user what it says.",
              file=sys.stderr)


# --- sp canvas -----------------------------------------------------------------

CANVAS_OPS = ("get", "create", "update", "delete", "align", "distribute", "stack", "pack",
              "frame", "select", "zoom", "shot")


def _canvas_url(a, route, **query):
    """A route of the project's server, on the port the flag or SP_CANVAS_PORT names, else the
    running app's, which is not 5173 when something else held that port."""
    port = a.port or (_running_app() or {}).get("port") or DEFAULT_PORT
    query = f"?{urllib.parse.urlencode(query)}" if query else ""
    return f"http://127.0.0.1:{port}/p/{urllib.parse.quote(a.project)}/__sp/{route}{query}"


def _canvas_post(url, data, headers):
    try:
        with urllib.request.urlopen(urllib.request.Request(
                url, data=data, headers=headers, method="POST"), timeout=180) as res:
            return res.read()
    except urllib.error.HTTPError as e:
        # The page's own refusal is JSON, {error, message, ...}, left whole for the agent to read.
        body = e.read().decode()
        raise SystemExit(body if e.code == 422 else f"error: {body or e.code}")
    except (urllib.error.URLError, TimeoutError) as e:
        # A timeout once connected is a bare TimeoutError, not wrapped as a URLError.
        raise SystemExit(f"error: no canvas answers at {url.split('/p/')[0]} "
                         f"({getattr(e, 'reason', e)}). `sp open` starts the app.")


def _upload(a, file):
    """A local image or video into the canvas folder's files/, named by its bytes so the same
    file placed twice is one file there, and the `src` the page places it by."""
    if not isinstance(file, str) or not file:
        raise SystemExit(f'error: a shape\'s "file" is a path, not {json.dumps(file)}')
    path = Path(file).expanduser()
    try:
        digest = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(1 << 20), b""):
                digest.update(chunk)
        name = digest.hexdigest()[:16] + path.suffix.lower()
        with open(path, "rb") as f:
            _canvas_post(_canvas_url(a, "canvas-file", slug=a.canvas, name=name), f,
                         {"Content-Length": str(path.stat().st_size)})
    except OSError as e:
        raise SystemExit(f"error: {file}: {e.strerror}")
    return f"files/{name}"


def cmd_canvas(a):
    """One command for the canvas page open in the app, which runs it and answers once what it
    wrote is saved (canvas/src/agentBridge.ts). The page is the only writer: with none open, the
    server says so rather than writing canvas.json behind it."""
    if not a.project:
        raise SystemExit("error: which project? Pass --project <name>, the name in its address "
                         "(/p/<name>/).")
    try:
        command = json.loads(sys.stdin.read() if a.command == "-" else a.command or "{}")
    except ValueError as e:
        raise SystemExit(f"error: the command is not JSON: {e}")
    if not isinstance(command, dict):
        raise SystemExit("error: the command is a JSON object")
    if a.op == "shot" and not a.output:
        raise SystemExit("error: shot writes a PNG: name it with -o <file>.png")
    shapes = command.get("shapes", [])
    if not isinstance(shapes, list):
        raise SystemExit('error: "shapes" is a JSON array of shapes')
    # A shape's `file` is a path on this machine, which the page cannot read.
    for shape in shapes:
        if isinstance(shape, dict) and "file" in shape:
            shape["src"] = _upload(a, shape.pop("file"))
    body = json.dumps({"slug": a.canvas, "command": {**command, "op": a.op}}).encode()
    result = json.loads(_canvas_post(_canvas_url(a, "canvas"), body,
                                     {"Content-Type": "application/json"}))
    if a.op == "shot":
        try:
            Path(a.output).parent.mkdir(parents=True, exist_ok=True)
            Path(a.output).write_bytes(base64.b64decode(result.pop("png")))
        except OSError as e:
            raise SystemExit(f"error: {a.output}: {e.strerror}")
        result["path"] = str(Path(a.output).resolve())
    print(json.dumps(result, indent=2))


AGENT_HELP = """\
For agents:
  sp open         the way to show the user the canvas. Prints the address and the
                  projects folder; a project's boards are at /p/<name>/.
  sp upgrade      when a [super-prototyping:notice] line says a release is available.
  sp start        only where the app cannot run (CI, Linux, a remote box).
  sp canvas <op> --canvas <slug> [JSON | -]
                  read, place and arrange shapes, images, video and boards on a canvas
                  open in the app. The sp-canvas skill has the ops and their JSON.
  sp pack <project> --check | -o <dir>
                  when the user wants to share a project: what goes in, what is left
                  out, and what would break it.
  sp fetch <id>   a community project's folder, to read: $(sp fetch <id>)/canvases/...
  sp duplicate <id>
                  when the user wants to edit a community project: copies it into their
                  projects and prints its name.
  sp thumbnail <canvas>...
                  redraw a canvas folder's thumbnail.png after its cover or name changes.
Exit status is non-zero on every failure, with the reason on stderr.
"""


def parser():
    p = argparse.ArgumentParser(
        prog="sp", description=__doc__, epilog=AGENT_HELP,
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

    add("open", cmd_open, ports=False)
    add("upgrade", cmd_upgrade, ports=False)
    add("uninstall", cmd_uninstall, ports=False)
    add("start", cmd_start)
    add("stop", cmd_stop)
    add("status", cmd_status)
    root = add("root", cmd_root, ports=False)
    root.add_argument("-v", "--verbose", action="store_true",
                      help="also list every place that was searched")
    add("paths", cmd_paths, ports=False)
    canvas = add("canvas", cmd_canvas, ports=False)
    canvas.add_argument("op", choices=CANVAS_OPS)
    canvas.add_argument("command", nargs="?", metavar="JSON",
                        help="the op's arguments as a JSON object, or - to read them from stdin")
    canvas.add_argument("--canvas", required=True, help="the canvas's folder name")
    canvas.add_argument("--project", default=os.environ.get("SP_PROJECT"),
                        help="default SP_PROJECT, which the chat panel's agent has")
    canvas.add_argument("--port", type=int, default=os.environ.get("SP_CANVAS_PORT") or None,
                        help="default SP_CANVAS_PORT, then the running app's")
    canvas.add_argument("-o", "--output", help="where shot writes its PNG")
    add("clean", cmd_clean, ports=False)
    pack = add("pack", cmd_pack, ports=False)
    pack.add_argument("project", help="a project's folder, or its name under the projects folder")
    how = pack.add_mutually_exclusive_group(required=True)
    how.add_argument("--check", action="store_true", help="check it and write nothing")
    how.add_argument("-o", "--output", metavar="DIR", help="an empty folder to copy it into")
    fetch = add("fetch", cmd_fetch, ports=False)
    fetch.add_argument("id", help="a community project's id, from its superproto.dev/p/<id>")
    fetch.add_argument("--fresh", action="store_true", help="download it again")
    dup = add("duplicate", cmd_duplicate, ports=False)
    dup.add_argument("id", help="a community project's id, from its superproto.dev/p/<id>")
    thumb = add("thumbnail", cmd_thumbnail, ports=False)
    thumb.add_argument("folders", nargs="+", metavar="CANVAS", help="a canvas's folder")
    return p


def parse_args(argv=None):
    """`parser().parse_args`, but for `sp canvas`'s JSON: argparse before Python 3.12.7 (Ubuntu
    24.04's is 3.12.3) leaves an optional positional after an option over, so `sp canvas create
    --canvas x '{…}'` would be refused as an unrecognized argument."""
    p = parser()
    a, rest = p.parse_known_args(argv)
    if (a.cmd == "canvas" and a.command is None and len(rest) == 1
            and (rest[0] == "-" or not rest[0].startswith("-"))):
        a.command, rest = rest[0], []
    if rest:
        p.error(f"unrecognized arguments: {' '.join(rest)}")
    return a


def main():
    if os.name == "nt":  # an agent's pipe there is cp1252, which has no ✓
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    a = parse_args()
    if a.fn is not cmd_upgrade:
        import atexit
        atexit.register(notice)  # on stderr, after the output, however this exits
    a.fn(a)


if __name__ == "__main__":
    main()
