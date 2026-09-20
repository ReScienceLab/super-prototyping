#!/usr/bin/env python3
"""Self-check for the launcher: where each product's install lands, which cached
release it picks, when it says the plugin and the toolkit have drifted apart, which
app it serves and where it is allowed to write.

    python3 tools/test_sp_canvas.py
"""
import json, os, sys, tempfile, time
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sp_canvas as C


def plugin_root(version):
    """A directory that looks like an installed plugin, at `version` or with no manifest."""
    root = Path(tempfile.mkdtemp())
    if version is not None:
        (root / ".claude-plugin").mkdir()
        (root / ".claude-plugin/plugin.json").write_text(
            json.dumps({"name": "super-prototyping", "version": version}))
    return root


def with_toolkit(version, fn):
    """Run fn with `_toolkit_version` answering `version`, then put the real one back."""
    real = C._toolkit_version
    C._toolkit_version = lambda: version
    try:
        return fn()
    finally:
        C._toolkit_version = real


def test_skew_is_only_reported_when_both_halves_name_a_release():
    root = plugin_root("1.1.0")
    assert with_toolkit("1.0.0", lambda: C.skew(root)) == ("1.1.0", "1.0.0")
    assert with_toolkit("1.1.0", lambda: C.skew(root)) is None
    # A source checkout has no installed toolkit version, and a plugin root without a
    # manifest has no release either. Neither is a disagreement worth a note.
    assert with_toolkit(None, lambda: C.skew(root)) is None
    assert with_toolkit("1.1.0", lambda: C.skew(plugin_root(None))) is None


def test_a_prerelease_does_not_report_drift_against_itself():
    # The manifests carry semver and the built wheel carries PEP 440, so one release
    # is spelled two ways. Compared as strings, every prerelease install would open
    # with a note telling the user to reinstall what they already have.
    root = plugin_root("1.1.0-rc.1")
    assert with_toolkit("1.1.0rc1", lambda: C.skew(root)) is None
    assert with_toolkit("1.1.0", lambda: C.skew(root)) == ("1.1.0-rc.1", "1.1.0")


def test_the_fix_moves_whichever_half_is_behind():
    # The plugin is ahead: pin the toolkit to the plugin's tag.
    fix = C.skew_fix("1.1.0", "1.0.0")
    assert "uv tool install" in fix and f"{C.TAG_PREFIX}1.1.0" in fix
    # The toolkit is ahead, which the uv line would *downgrade* — and to a tag that need
    # not exist. Update the plugin instead.
    assert "/plugin update" in C.skew_fix("1.0.0", "1.1.0")


def canvas_app_at(root: Path):
    """Make `root` look like a plugin holding the canvas app."""
    (root / "canvas").mkdir(parents=True)
    (root / "canvas/package.json").write_text(json.dumps({"name": "prototyping-canvas"}))
    return root


def with_home(home, fn):
    """Run fn with `home` as the home directory, both ways of asking for it.

    `Path.home()` and `Path("~/...").expanduser()` are separate lookups and the launcher
    uses both, so patching one leaves half the search pointing at the real home.
    """
    real, real_env = C.Path.home, os.environ.get("HOME")
    C.Path.home = staticmethod(lambda: Path(home))
    os.environ["HOME"] = str(home)
    try:
        return fn()
    finally:
        C.Path.home = real
        os.environ["HOME"] = real_env


def test_each_products_install_location_is_searched():
    """One install per product, found where that product actually puts it.

    Six products install this plugin and no two agree on where it lands, so a launcher
    that only knows Claude Code's cache prints "could not find the canvas app" to
    everyone else — with the app sitting on their disk.
    """
    homes = {
        ".claude/plugins/cache/super-prototyping/super-prototyping/1.0.0": "Claude Code",
        ".codex/plugins/cache/super-prototyping/super-prototyping/1.0.0": "Codex",
        ".codebuddy/plugins/cache/super-prototyping/super-prototyping/1.0.0": "CodeBuddy",
        ".hermes/plugins/super-prototyping": "Hermes",
        ".pi/agent/git/github.com/ReScienceLab/super-prototyping": "Pi",
    }
    for where, product in homes.items():
        home = Path(tempfile.mkdtemp())
        canvas_app_at(home / where)
        found = with_home(home, lambda: C.resolve_root())
        assert found == home / where, f"{product}: found {found}"

    # And the products that hold a symlink per skill instead of an install.
    for root in (".codebuddy/skills", ".trae/skills", ".trae-cn/skills"):
        home = Path(tempfile.mkdtemp())
        checkout = canvas_app_at(home / "checkout")
        (checkout / "skills/prototype-canvas").mkdir(parents=True)
        (home / root).mkdir(parents=True)
        (home / root / "prototype-canvas").symlink_to(checkout / "skills/prototype-canvas")
        # Resolved, because following the link is how the checkout was found.
        assert with_home(home, lambda: C.resolve_root()) == checkout.resolve(), root


def with_env(vars, fn):
    """Run fn with these environment variables set (None: unset), then put them back."""
    saved = {k: os.environ.get(k) for k in vars}
    for k, v in vars.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = str(v)
    try:
        return fn()
    finally:
        for k, v in saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


def on_platform(name, fn):
    real = sys.platform
    sys.platform = name
    try:
        return fn()
    finally:
        sys.platform = real


UNSET = {"SUPER_PROTOTYPING_HOME": None, "XDG_CACHE_HOME": None, "XDG_STATE_HOME": None}


def test_the_two_directories_follow_xdg_on_unix_localappdata_on_windows_and_one_home_over_both():
    """Where the downloaded app and the pidfiles go: uv's answer, not platformdirs'. The same
    pair on macOS as on Linux, and nothing created until something is written."""
    home = Path(tempfile.mkdtemp())
    dirs = lambda: with_home(home, lambda: with_env(UNSET, C._dirs))
    for platform in ("darwin", "linux"):
        cache, state = on_platform(platform, dirs)
        assert cache == home / ".cache/super-prototyping", platform
        assert state == home / ".local/state/super-prototyping", platform
    assert not (home / ".cache").exists() and not (home / ".local").exists()
    pidfile = on_platform("darwin", lambda: with_home(home, lambda: with_env(UNSET, lambda: C._pidfile(5173))))
    assert pidfile == home / ".local/state/super-prototyping/canvas-5173.pid"
    assert not pidfile.parent.exists()
    # The XDG variables move each half on its own.
    cache, state = on_platform("linux", lambda: with_home(home, lambda: with_env(
        dict(UNSET, XDG_CACHE_HOME="/c", XDG_STATE_HOME="/s"), C._dirs)))
    assert (cache, state) == (Path("/c/super-prototyping"), Path("/s/super-prototyping"))
    # SUPER_PROTOTYPING_HOME puts both under one root, and wins over them.
    cache, state = on_platform("linux", lambda: with_home(home, lambda: with_env(
        dict(UNSET, SUPER_PROTOTYPING_HOME="~/sp", XDG_CACHE_HOME="/c"), C._dirs)))
    assert (cache, state) == (home / "sp/cache", home / "sp/state")
    # Windows: %LOCALAPPDATA%, machine-local, both halves under the one folder.
    cache, state = on_platform("win32", lambda: with_home(home, lambda: with_env(
        dict(UNSET, LOCALAPPDATA=str(home / "AppData/Local")), C._dirs)))
    assert cache == home / "AppData/Local/super-prototyping/cache"
    assert state == home / "AppData/Local/super-prototyping/state"


def canvas_bundle(files=("dist/server.mjs", "dist/index.html")):
    """The bytes release.yml attaches: a gzipped tar with one top-level `dist/`."""
    import io, tarfile
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for name in files:
            data = f"// {name}\n".encode()
            info = tarfile.TarInfo(name)
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
    return buf.getvalue()


def with_release(answer, fn):
    """Run fn with the release download answering `answer`: bytes to serve, or an exception
    to raise. Returns (result, urls asked for)."""
    import contextlib
    urls = []

    def urlopen(url, timeout=None):
        urls.append(url)
        if isinstance(answer, BaseException):
            raise answer
        return contextlib.closing(type("R", (), {"read": lambda self: answer, "close": lambda self: None})())

    real = C.urllib.request.urlopen
    C.urllib.request.urlopen = urlopen
    try:
        return fn(), urls
    finally:
        C.urllib.request.urlopen = real


def test_the_app_served_is_the_checkouts_own_when_worked_on_else_the_releases_bundle():
    """A developer's checkout serves its build; an install runs the bundle its release
    attached, fetched once into the cache and never fetched again while it is there."""
    sp_home = Path(tempfile.mkdtemp())
    env = dict(UNSET, SUPER_PROTOTYPING_HOME=str(sp_home))

    def dist(root, version):
        """`_dist` of a plugin root whose manifest says `version`."""
        (root / ".claude-plugin/plugin.json").write_text(json.dumps({"version": version}))
        return with_env(env, lambda: C._dist(root))

    # node_modules marks a checkout being worked on: its own dist, even with a release known.
    dev = canvas_app_at(plugin_root("1.4.2"))
    (dev / "canvas/node_modules").mkdir()
    (dev / "canvas/src").mkdir()
    (dev / "canvas/dist").mkdir()
    (dev / "canvas/dist/server.mjs").write_text("")
    now = time.time()
    os.utime(dev / "canvas/package.json", (now - 10, now - 10))
    assert dist(dev, "1.4.2") == dev / "canvas/dist"

    # Homebrew's tree: a dist and no sources. Served as it is, though its package.json was
    # unpacked after the bundle was built, and never rebuilt: nothing to rebuild it from.
    brew = canvas_app_at(plugin_root("1.4.2"))
    (brew / "canvas/dist").mkdir()
    (brew / "canvas/dist/server.mjs").write_text("")
    os.utime(brew / "canvas/dist/server.mjs", (now - 10, now - 10))
    which = C.shutil.which
    C.shutil.which = lambda name: None  # a wrong turn here would look for bun
    try:
        assert dist(brew, "1.4.2") == brew / "canvas/dist"
    finally:
        C.shutil.which = which

    # A bare install with a version: the bundle. Fetched from the tag's release asset, into
    # one folder per version, whole — no temporary directory left beside it.
    install = canvas_app_at(plugin_root("1.4.2"))
    (got, urls) = with_release(canvas_bundle(), lambda: dist(install, "1.4.2"))
    assert got == sp_home / "cache/1.4.2/dist"
    assert urls == [f"https://github.com/{C.REPO}/releases/download/{C.TAG_PREFIX}1.4.2/canvas-dist.tgz"]
    assert (got / "server.mjs").is_file() and (got / "index.html").is_file()
    assert [p.name for p in (sp_home / "cache").iterdir()] == ["1.4.2"]
    # A second `start` that raced this one and lost its rename ends on the same answer.
    real_rename = C.os.rename

    def rename_after_the_other(src, dst):
        (Path(dst) / "dist").mkdir(parents=True)
        (Path(dst) / "dist/server.mjs").write_text("")
        real_rename(src, dst)

    C.os.rename = rename_after_the_other
    try:
        (raced, urls) = with_release(canvas_bundle(), lambda: dist(install, "1.4.3"))
    finally:
        C.os.rename = real_rename
    assert raced == sp_home / "cache/1.4.3/dist" and len(urls) == 1
    assert sorted(p.name for p in (sp_home / "cache").iterdir()) == ["1.4.2", "1.4.3"]
    # Cached: no request the second time. A newer toolkit fetches its own.
    (again, urls) = with_release(AssertionError("no"), lambda: dist(install, "1.4.2"))
    assert again == got and urls == []
    (newer, urls) = with_release(canvas_bundle(), lambda: dist(install, "1.5.0"))
    assert newer == sp_home / "cache/1.5.0/dist" and len(urls) == 1
    # The version is the manifest's, spelled as the tag is. The installed toolkit would say
    # 1.5.0rc1 for this release, and no tag is spelled that way.
    (rc, urls) = with_release(canvas_bundle(), lambda: with_toolkit("1.5.0rc1", lambda: dist(install, "1.5.0-rc.1")))
    assert rc == sp_home / "cache/1.5.0-rc.1/dist"
    assert urls == [f"https://github.com/{C.REPO}/releases/download/{C.TAG_PREFIX}1.5.0-rc.1/canvas-dist.tgz"]

    # No release to fetch: say so, with the URL that failed, and leave the cache as it was.
    try:
        with_release(C.urllib.request.URLError("no network"), lambda: dist(install, "1.6.0"))
    except SystemExit as e:
        assert "1.6.0/canvas-dist.tgz" in str(e) and "no network" in str(e)
    else:
        assert False, "a failed download must exit loudly"
    assert not (sp_home / "cache/1.6.0").exists()


def test_the_boards_are_the_flag_then_the_variable_then_the_projects_mockups_canvases():
    boards = lambda arg, env, project, **kw: with_env(
        dict(UNSET, **env), lambda: C._canvases_dir(arg, Path(project), **kw))
    assert boards(None, {}, "/p") == Path("/p/mockups/canvases")
    assert boards(None, {}, ".") == Path.cwd() / "mockups/canvases"
    assert boards(None, {"PROTOTYPING_CANVASES_DIR": "/v"}, "/p") == Path("/v")
    assert boards("/f", {"PROTOTYPING_CANVASES_DIR": "/v"}, "/p") == Path("/f")
    # A project named on the command line beats the variable: an agent spawned by one canvas
    # inherits that canvas's variable, and its `sp start <other>` must serve the other.
    assert boards(None, {"PROTOTYPING_CANVASES_DIR": "/v"}, "/p", named=True) == Path("/p/mockups/canvases")
    assert boards("/f", {"PROTOTYPING_CANVASES_DIR": "/v"}, "/p", named=True) == Path("/f")
    assert C.parser().parse_args(["start", "~/app"]).project == "~/app"
    assert C.parser().parse_args(["start"]).project is None


def test_the_port_is_the_flag_then_sp_canvas_port_then_the_default():
    import contextlib, io
    port = lambda argv, env: with_env({"SP_CANVAS_PORT": env}, lambda: C.parser().parse_args(argv).port)
    assert port(["status"], None) == C.DEFAULT_PORT
    assert port(["status"], "6001") == 6001
    assert port(["status", "--port", "6002"], "6001") == 6002
    try:
        with contextlib.redirect_stderr(io.StringIO()):
            port(["status"], "canvas")
    except SystemExit:
        pass
    else:
        assert False, "a bad SP_CANVAS_PORT must be rejected the way a bad --port is"


def test_clean_removes_both_directories_but_not_from_under_a_running_canvas():
    sp_home = Path(tempfile.mkdtemp())
    env = dict(UNSET, SUPER_PROTOTYPING_HOME=str(sp_home))
    (sp_home / "cache/1.4.2/dist").mkdir(parents=True)
    (sp_home / "cache/1.4.2/dist/server.mjs").write_text("")
    (sp_home / "state").mkdir()
    (sp_home / "state/canvas-5173.pid").write_text("4242\n")
    (sp_home / "state/canvas-5174.pid").write_text("not a pid\n")  # skipped, not fatal
    sessions = ["main\n"]  # what `tmux list-sessions` answers
    real = C._is_our_server, C.subprocess.run, C.shutil.which

    def refuses(port):
        try:
            with_env(env, lambda: C.cmd_clean(None))
        except SystemExit as e:
            assert port in str(e) and "sp stop" in str(e), e
        else:
            assert False, f"clean must refuse while a canvas runs on {port}"
        assert (sp_home / "cache/1.4.2/dist/server.mjs").is_file()

    try:
        C.subprocess.run = lambda *a, **k: type("R", (), {"stdout": sessions[0]})()
        C.shutil.which = lambda name, *a, **k: "/usr/bin/tmux"
        # A background canvas is known by its pidfile ...
        C._is_our_server = lambda pid, port: (pid, port) == (4242, "5173")
        refuses("5173")
        # ... and one in tmux, which wrote no pidfile, by its session.
        C._is_our_server = lambda pid, port: False
        sessions[0] = "canvas-5180\nmain\n"
        refuses("5180")
        sessions[0] = "main\n"
        with_env(env, lambda: C.cmd_clean(None))
        assert not (sp_home / "cache").exists() and not (sp_home / "state").exists()
        with_env(env, lambda: C.cmd_clean(None))  # a second time is not an error
    finally:
        C._is_our_server, C.subprocess.run, C.shutil.which = real


def test_without_ps_the_liveness_check_refuses_to_guess():
    """A pidfile and no `ps` (Windows, a slim container): `stop` must not SIGTERM a stranger
    and `clean` must not delete under a live server, so neither answer is given."""
    try:
        with_env({"PATH": ""}, lambda: C._is_our_server(4242, "5173"))
    except SystemExit as e:
        assert "ps" in str(e) and "4242" in str(e), e
    else:
        assert False, "must not answer without ps"


def test_the_app_is_built_when_dist_is_missing_or_older_than_a_source():
    """`start` runs one built file. An install from git has none, and a checkout that was
    edited has one from before the edit; both must build, and an up-to-date one must not."""
    app = Path(tempfile.mkdtemp())
    (app / "src").mkdir()
    (app / "src/App.tsx").write_text("")
    (app / "vite.config.ts").write_text("")
    assert C._needs_build(app)
    (app / "dist").mkdir()
    (app / "dist/server.mjs").write_text("")
    now = time.time()
    for f in ("src/App.tsx", "vite.config.ts"):
        os.utime(app / f, (now - 10, now - 10))
    os.utime(app / "dist/server.mjs", (now, now))
    assert not C._needs_build(app)
    # The build's own output and an installed dependency are not sources.
    (app / "node_modules/x").mkdir(parents=True)
    for f in ("dist/index.html", "node_modules/x/index.js"):
        (app / f).write_text("")
        os.utime(app / f, (now + 10, now + 10))
    assert not C._needs_build(app)
    # An entry page and a `public/` file are, as much as anything under `src/`.
    for f in ("src/App.tsx", "index.html", "public/favicon.ico"):
        (app / f).parent.mkdir(exist_ok=True)
        (app / f).write_text("")
        os.utime(app / f, (now + 10, now + 10))
        assert C._needs_build(app), f
        os.utime(app / f, (now - 10, now - 10))


def test_the_tag_prefix_matches_the_one_the_release_actually_cuts():
    spec = json.loads((Path(__file__).resolve().parent.parent / ".version-bump.json").read_text())
    assert C.TAG_PREFIX == spec["tagPrefix"]


def test_the_bundle_fetched_is_the_one_the_release_workflow_attaches():
    """Two files spell the asset: release.yml uploads it, _dist downloads it and
    expects one top-level `dist/` inside. Neither may move without the other."""
    workflow = (Path(__file__).resolve().parent.parent / ".github/workflows/release.yml").read_text()
    assert 'tar -czf "$RUNNER_TEMP/canvas-dist.tgz" dist' in workflow
    assert 'gh release upload "super-prototyping--v$VERSION" "$RUNNER_TEMP/canvas-dist.tgz"' in workflow
    import inspect
    assert "/canvas-dist.tgz" in inspect.getsource(C._dist)


def test_the_newest_cached_release_wins_and_a_prerelease_ranks_below_it():
    names = ["1.0.0", "1.10.0", "1.2.0", "1.10.0-beta.2", "not-a-version"]
    assert sorted(names, key=C._version_key, reverse=True)[0] == "1.10.0"
    assert C._version_key("1.10.0") > C._version_key("1.10.0-beta.2")
    assert C._version_key("1.10.0-beta.2") > C._version_key("1.2.0")
    assert C._version_key("not-a-version") == (-1,)


if __name__ == "__main__":
    fns = [(n, f) for n, f in sorted(globals().items()) if n.startswith("test_")]
    for name, fn in fns:
        fn()
        print("ok  ", name)
    print(f"\n{len(fns)} checks passed")
