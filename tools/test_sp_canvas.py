#!/usr/bin/env python3
"""Self-check for the launcher: where it finds the tree, which cached release it picks,
which app it serves, where it is allowed to write, what it says when the app has an
update, and what `uninstall` takes back.

    python3 tools/test_sp_canvas.py
"""
import json, os, sys, tempfile, time
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sp_canvas as C


def plugin_root(version):
    """A tree holding the canvas app, at `version` or with none."""
    root = Path(tempfile.mkdtemp())
    (root / "canvas").mkdir()
    (root / "canvas/package.json").write_text(json.dumps(
        {"name": "prototyping-canvas", **({"version": version} if version else {})}))
    return root


def canvas_app_at(root: Path):
    """Make `root` look like a tree holding the canvas app."""
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


def test_the_app_is_found_through_its_link_then_where_install_sh_puts_it():
    """SUPER_PROTOTYPING_ROOT first; without it, `current`, then
    the app in /Applications or ~/Applications."""
    home = Path(tempfile.mkdtemp()).resolve()
    user_app = canvas_app_at(home / "Applications/Super Prototyping.app/Contents/Resources/plugin")
    real = C.CURRENT, C.APP_BUNDLES
    C.APP_BUNDLES = [home / "missing.app", home / "Applications/Super Prototyping.app"]
    C.CURRENT = home / ".local/share/super-prototyping/current"
    find = lambda: with_home(home, lambda: with_env({"SUPER_PROTOTYPING_ROOT": None}, lambda: (
        os.chdir(home), C.resolve_root())[1]))
    cwd = os.getcwd()
    try:
        assert find() == user_app
        other = canvas_app_at(home / "elsewhere")
        C.CURRENT.parent.mkdir(parents=True)
        C.CURRENT.symlink_to(other)
        assert find() == C.CURRENT
        assert with_env({"SUPER_PROTOTYPING_ROOT": str(user_app)}, C.resolve_root) == user_app
    finally:
        os.chdir(cwd)
        C.CURRENT, C.APP_BUNDLES = real


def test_a_checkout_wins_over_the_installed_app():
    """The app is the last resort: someone with it installed who is also standing in
    their own checkout must get the checkout. `_is_canvas_app` is narrowed to the two
    paths under test, so a real plugin install on the machine running this test, this
    repo's own, say, cannot shadow either one and decide the test instead.
    """
    checkout = Path(tempfile.mkdtemp()).resolve()
    C.subprocess.run(["git", "init", "-q"], cwd=checkout, check=True)
    app = Path(tempfile.mkdtemp()).resolve()
    home = Path(tempfile.mkdtemp())
    real_cwd, real_app, real_is_app = os.getcwd(), C.APP_BUNDLES, C._is_canvas_app
    os.chdir(checkout)
    C.APP_BUNDLES = [app]
    C._is_canvas_app = lambda root: root.resolve() in (checkout, app / "Contents/Resources/plugin")
    try:
        found = with_home(home, lambda: with_env(
            {"SUPER_PROTOTYPING_ROOT": None}, C.resolve_root))
    finally:
        os.chdir(real_cwd)
        C.APP_BUNDLES, C._is_canvas_app = real_app, real_is_app
    assert found == checkout


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


def test_the_two_directories_follow_xdg_on_both_unixes_and_one_home_over_both():
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
        """`_dist` of a tree whose canvas/package.json says `version`."""
        (root / "canvas/package.json").write_text(json.dumps({"version": version}))
        os.utime(root / "canvas/package.json", (1, 1))  # not an edit a checkout would rebuild for
        return with_env(env, lambda: C._dist(root))

    # node_modules marks a checkout being worked on: its own dist, even with a release known.
    dev = plugin_root("1.4.2")
    (dev / "canvas/node_modules").mkdir()
    (dev / "canvas/src").mkdir()
    (dev / "canvas/dist").mkdir()
    (dev / "canvas/dist/server.mjs").write_text("")
    now = time.time()
    assert dist(dev, "1.4.2") == dev / "canvas/dist"

    # The desktop app's bundled tree: a dist and no sources. Served as it is, though its
    # package.json was copied in after the bundle was built, and never rebuilt: nothing to
    # rebuild it from.
    bundled = plugin_root("1.4.2")
    (bundled / "canvas/dist").mkdir()
    (bundled / "canvas/dist/server.mjs").write_text("")
    os.utime(bundled / "canvas/dist/server.mjs", (now - 10, now - 10))
    which = C.shutil.which
    C.shutil.which = lambda name: None  # a wrong turn here would look for bun
    try:
        assert dist(bundled, "1.4.2") == bundled / "canvas/dist"
    finally:
        C.shutil.which = which

    # A bare install with a version: the bundle. Fetched from the tag's release asset, into
    # one folder per version, whole — no temporary directory left beside it.
    install = plugin_root("1.4.2")
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
    # Cached: no request the second time. A newer release fetches its own.
    (again, urls) = with_release(AssertionError("no"), lambda: dist(install, "1.4.2"))
    assert again == got and urls == []
    (newer, urls) = with_release(canvas_bundle(), lambda: dist(install, "1.5.0"))
    assert newer == sp_home / "cache/1.5.0/dist" and len(urls) == 1
    # The version is package.json's, spelled as the tag is.
    (rc, urls) = with_release(canvas_bundle(), lambda: dist(install, "1.5.0-rc.1"))
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
    # A release with no bundle attached is a 404, not a network problem: building is the way.
    missing = C.urllib.error.HTTPError(url="", code=404, msg="Not Found", hdrs=None, fp=None)
    try:
        with_release(missing, lambda: dist(install, "1.6.0"))
    except SystemExit as e:
        assert "1.6.0 has no canvas app attached" in str(e) and "bun run build" in str(e), e
        assert "network" not in str(e)
    else:
        assert False, "a missing bundle must exit loudly"

def test_the_project_is_the_argument_then_the_current_directory_and_its_boards_are_under_it():
    assert C.parser().parse_args(["start", "~/app"]).project == "~/app"
    assert C.parser().parse_args(["start"]).project is None
    # The one place the server reads them from, so the two spellings must agree.
    assert C.CANVASES == "canvases"


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


def test_clean_removes_the_cache_and_starts_files_but_not_from_under_a_running_canvas():
    sp_home = Path(tempfile.mkdtemp())
    env = dict(UNSET, SUPER_PROTOTYPING_HOME=str(sp_home))
    (sp_home / "cache/1.4.2/dist").mkdir(parents=True)
    (sp_home / "cache/1.4.2/dist/server.mjs").write_text("")
    (sp_home / "state").mkdir()
    (sp_home / "state/canvas-5173.pid").write_text("4242\n")
    (sp_home / "state/canvas-5174.pid").write_text("not a pid\n")  # skipped, not fatal
    (sp_home / "state/canvas-backup.pid").write_text("4242\n")  # not a port; debris, not fatal
    (sp_home / "state/desktop").mkdir()  # the app's: the canvas document lives in here
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
        # Someone else's session is not ours whatever its name holds.
        sessions[0] = "notes canvas-9999\nmain\n"
        with_env(env, lambda: C.cmd_clean(None))
        assert not (sp_home / "cache").exists()
        assert [p.name for p in (sp_home / "state").iterdir()] == ["desktop"]
        with_env(env, lambda: C.cmd_clean(None))  # a second time is not an error
    finally:
        C._is_our_server, C.subprocess.run, C.shutil.which = real


def test_the_notice_names_a_newer_release_and_what_to_do_about_it():
    import contextlib, io
    sp_home = Path(tempfile.mkdtemp())
    (sp_home / "state").mkdir()
    update = sp_home / "state/update.json"

    def said(record):
        if record is not None:
            update.write_text(json.dumps(record))
        err = io.StringIO()
        with contextlib.redirect_stderr(err):
            with_env(dict(UNSET, SUPER_PROTOTYPING_HOME=str(sp_home)), C.notice)
        return err.getvalue()

    assert said(None) == ""  # the app never checked
    record = {"current": "1.5.3", "available": None, "downloaded": None, "checkedAt": "x"}
    assert said(record) == ""
    line = said(dict(record, available="1.6.0"))
    assert line.startswith(C.NOTICE) and "1.6.0" in line and "sp upgrade" in line
    # Not an older one: the app reports what its feed has, and a feed can lag a local build.
    assert said(dict(record, available="1.5.2")) == ""


def test_uninstall_takes_back_only_what_the_app_made():
    home = Path(tempfile.mkdtemp())
    current = home / ".local/share/super-prototyping/current"
    current.parent.mkdir(parents=True)
    current.symlink_to(home)
    (home / ".local/bin").mkdir()
    (home / ".local/bin/sp").symlink_to(current / "tools/bin/sp")
    (home / ".local/bin/refkit").write_text("someone else's")
    (home / ".claude/skills").mkdir(parents=True)
    (home / ".claude/skills/new-ui-mock").symlink_to(current / "skills/new-ui-mock")
    (home / ".claude/skills/mine").symlink_to(home)
    (home / ".zshrc").write_text('alias x=y\n\n# Added by Super Prototyping: sp, refkit and '
                                 'artgen live here.\nexport PATH="$HOME/.local/bin:$PATH"\n')
    (home / ".codex/rules").mkdir(parents=True)
    (home / ".codex/rules/default.rules").write_text(
        'prefix_rule(pattern=["ego-browser"], decision="allow")\n'
        'prefix_rule(pattern=["sp"], decision="allow")\n')
    real = C.CURRENT
    C.CURRENT = current
    try:
        import contextlib, io
        with contextlib.redirect_stdout(io.StringIO()):
            with_home(home, lambda: C.cmd_uninstall(None))
    finally:
        C.CURRENT = real
    assert not current.is_symlink() and not (home / ".local/bin/sp").is_symlink()
    assert (home / ".local/bin/refkit").read_text() == "someone else's"
    assert not (home / ".claude/skills/new-ui-mock").is_symlink()
    assert (home / ".claude/skills/mine").is_symlink()
    assert (home / ".zshrc").read_text() == "alias x=y\n"
    assert (home / ".codex/rules/default.rules").read_text() == \
        'prefix_rule(pattern=["ego-browser"], decision="allow")\n'


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
