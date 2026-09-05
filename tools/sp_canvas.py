#!/usr/bin/env python3
"""sp-canvas, the launcher for the tldraw board canvas.

  start    boot the dev server against a folder of boards, print its address
  stop     kill the one on that port, and only that one
  status   say whether it is up, and on what
  root     print the plugin root it resolved (-v: and where it looked)

The canvas app ships inside the plugin, which is installed outside your
project — under ~/.claude/plugins/cache, or wherever you cloned the repo. Your
boards stay in your project. This joins the two, so an upgrade can replace the
app without touching a single board you have authored.

Boards default to ./mockups/canvases under the current directory. Override with
--canvases or PROTOTYPING_CANVASES_DIR. The app itself is found by search;
SUPER_PROTOTYPING_ROOT skips the search when you know the answer.
"""
import argparse, glob, json, os, re, shlex, shutil, signal, subprocess, sys, time
from pathlib import Path

DEFAULT_PORT = 5173

# Per-port names, because two projects run two canvases. A fixed session name meant
# starting the second one killed the first, silently and with a zero exit code.
def _session(port):
    return f"canvas-{port}"


# tmux `-t name` falls back to *prefix* matching when nothing matches exactly, so `-t canvas-54`
# happily kills canvas-5411. The `=` prefix demands an exact name.
def _target(port):
    return f"={_session(port)}"


def _pidfile(port):
    return Path.home() / f".super-prototyping-canvas-{port}.pid"


def _logfile(port):
    return Path.home() / f".super-prototyping-canvas-{port}.log"


# --- finding the canvas app --------------------------------------------------

def _candidates():
    """Every place a canvas app could be, most explicit first.

    Yields (label, path). No product exposes its plugin root to a shell in a way
    all four of Claude Code, Codex, Hermes and Pi agree on, so the app is found
    rather than addressed.
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
    # mtime order is arbitrary and can hand back the older release.
    cache = glob.glob(str(Path.home() / ".claude/plugins/cache/*/super-prototyping/*"))
    for path in sorted(cache, key=lambda p: _version_key(Path(p).name), reverse=True):
        yield "Claude Code plugin cache", Path(path)

    # The other products hold a symlink per skill, pointing back into the
    # checkout: <root>/skills/prototype-canvas -> up two levels is <root>.
    for label, root in (
        ("Codex CLI", "~/.codex/skills"),
        ("Hermes", "~/.hermes/skills"),
        ("Pi", "~/.pi/agent/skills"),
    ):
        link = Path(root).expanduser() / "prototype-canvas"
        if link.is_symlink():
            yield f"{label} skill link", link.resolve().parent.parent

    # Finally, a checkout you are standing in.
    try:
        top = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        if top:
            yield "current git checkout", Path(top)
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass


def _version_key(name: str):
    """Sortable form of a version directory name; anything unparseable sorts oldest."""
    parts = re.findall(r"\d+", name)
    return tuple(int(n) for n in parts) if parts else (-1,)


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

def _canvases_dir(arg):
    raw = arg or os.environ.get("PROTOTYPING_CANVASES_DIR") or "mockups/canvases"
    return Path(raw).expanduser().resolve()


def _port_answers(port):
    """Whether something is already listening. Nothing is assumed about what."""
    import socket
    with socket.socket() as s:
        s.settimeout(0.4)
        return s.connect_ex(("127.0.0.1", port)) == 0


def cmd_start(a):
    root = resolve_root()
    app = root / "canvas"
    boards = _canvases_dir(a.canvases)

    if not boards.is_dir():
        print(f"note: {boards} does not exist yet — the canvas will open empty.")
        print("      Start a board with the clone-prototype or new-ui-mock skill.")
    # Create it here rather than leaving it to the dev server. The server creates it too (it has
    # to watch it), but a failure there is a stack trace inside a tmux pane that has already gone.
    try:
        boards.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        raise SystemExit(f"error: cannot create the boards directory {boards}\n  {e}")

    if not (app / "node_modules").is_dir():
        if not shutil.which("bun"):
            raise SystemExit("error: bun is not installed — https://bun.sh")
        print(f"installing canvas dependencies in {app} …")
        subprocess.run(["bun", "install", "--frozen-lockfile"], cwd=app, check=True)

    if _port_answers(a.port):
        raise SystemExit(
            f"error: port {a.port} is already answering. It may be another checkout's\n"
            f"canvas, so this will not reuse it. Pass --port with a free one, or run\n"
            f"`sp-canvas stop` if it is this one."
        )

    env = dict(os.environ, PROTOTYPING_CANVASES_DIR=str(boards))
    # --host 127.0.0.1 because Vite otherwise binds localhost only, which can
    # resolve to ::1 and make every 127.0.0.1 request fail with a bare
    # connection error. Loopback either way: this is a design tool, not a service.
    cmd = ["bun", "run", "dev", "--", "--host", "127.0.0.1",
           "--port", str(a.port), "--strictPort"]

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
            f"PROTOTYPING_CANVASES_DIR={shlex.quote(str(boards))}",
            f"PATH={shlex.quote(os.environ.get('PATH', ''))}",
            shlex.join(cmd),
        ])
        subprocess.run(
            ["tmux", "new-session", "-d", "-s", session, "-c", str(app),
             f"{inline}; echo; echo '--- canvas exited'; sleep 3600"],
            check=True,
        )
        how = f"tmux session '{session}' — read it with: tmux capture-pane -p -t {session}"
    else:
        log = _logfile(a.port)
        with open(log, "wb") as fh:
            proc = subprocess.Popen(cmd, cwd=app, env=env, stdout=fh, stderr=fh,
                                    start_new_session=True)
        _pidfile(a.port).write_text(f"{proc.pid}\n")
        how = f"background process {proc.pid} — log at {log}"

    for _ in range(60):
        if _port_answers(a.port):
            break
        time.sleep(0.25)
    else:
        raise SystemExit(f"error: the server did not bind port {a.port} in 15s.\n  {how}")

    print(f"canvas   http://127.0.0.1:{a.port}/")
    print(f"boards   {boards}")
    print(f"app      {app}")
    print(f"running  {how}")
    print(f"\nDeep-link one board with ?canvas=<slug>, "
          f"e.g. http://127.0.0.1:{a.port}/?canvas=notion-ios")


def _is_our_server(pid, port):
    """Whether this pid is still the canvas we started on this port.

    The pidfile lives in $HOME and outlives reboots, and pids get recycled. Without this check
    `stop` sends SIGTERM to whatever process inherited the number — someone else's editor, a
    build, anything.
    """
    try:
        out = subprocess.run(["ps", "-o", "command=", "-p", str(pid)],
                             capture_output=True, text=True).stdout
    except OSError:
        return False
    return f"--port {port}" in out and ("vite" in out or "bun" in out)


def cmd_stop(a):
    """Stop the canvas on this port, and nothing else.

    Never a pattern kill: `pkill -f vite` matches every Vite dev server on the machine,
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
        try:
            pid = int(pidfile.read_text().strip())
        except ValueError:
            pid = None    # unreadable pidfile; the only thing to do is drop it
        if pid is None or not _is_our_server(pid, a.port):
            if pid is not None:
                print(f"note: pid {pid} is not this canvas any more — left alone, "
                      f"stale pidfile removed")
        else:
            try:
                os.kill(pid, signal.SIGTERM)
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
    print(f"boards would be {_canvases_dir(a.canvases)}")


def cmd_root(a):
    """Just the path, so it can be captured: KIT="$(sp-canvas root)"."""
    print(resolve_root(verbose=a.verbose))


def main():
    p = argparse.ArgumentParser(
        prog="sp-canvas", description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    s = p.add_subparsers(dest="cmd", required=True)

    def add(name, fn, ports=True, canvases=True):
        sub = s.add_parser(name)
        sub.set_defaults(fn=fn)
        if ports:
            sub.add_argument("--port", type=int, default=DEFAULT_PORT)
        if canvases:
            sub.add_argument("--canvases", help="folder of board folders "
                                                "(default ./mockups/canvases)")
        return sub

    add("start", cmd_start)
    add("stop", cmd_stop, canvases=False)
    add("status", cmd_status)
    root = add("root", cmd_root, ports=False, canvases=False)
    root.add_argument("-v", "--verbose", action="store_true",
                      help="also list every place that was searched")

    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
