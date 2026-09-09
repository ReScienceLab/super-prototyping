#!/usr/bin/env python3
"""Self-check for how the launcher finds the plugin: where each product's install
lands, which cached release it picks, and when it says the plugin and the toolkit
have drifted apart.

    python3 tools/test_sp_canvas.py
"""
import json, os, sys, tempfile
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


def test_the_tag_prefix_matches_the_one_the_release_actually_cuts():
    spec = json.loads((Path(__file__).resolve().parent.parent / ".version-bump.json").read_text())
    assert C.TAG_PREFIX == spec["tagPrefix"]


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
