#!/usr/bin/env python3
"""Self-check for install.sh. It runs the script against fakes of curl, uv and uname on
PATH under a temporary HOME, so nothing here reaches the network or this machine's own
install: what lands where, what a second run does, what a bad checksum stops.

    python3 tools/test_install.py
"""
import hashlib, io, json, os, shutil, subprocess, sys, tarfile, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "install.sh"
TAG = "https://github.com/ReScienceLab/super-prototyping/releases/tag/super-prototyping--v"

# A curl that serves $FAKE/<basename of the URL>, answers a HEAD with $FAKE_LATEST, and
# logs every URL. Same flag shapes the script uses, nothing more.
CURL = r"""#!/bin/sh
out= head=0 url=
while [ $# -gt 0 ]; do
  case $1 in
    -o) out=$2; shift ;;
    --proto|--retry|-w) shift ;;
    -fsSI) head=1 ;;
    -*) ;;
    *) url=$1 ;;
  esac
  shift
done
printf '%s\n' "$url" >> "$FAKE/curl.log"
if [ "$head" = 1 ]; then printf '%s' "$FAKE_LATEST"; exit 0; fi
[ -f "$FAKE/$(basename "$url")" ] || exit 22
cp "$FAKE/$(basename "$url")" "$out"
"""
# BusyBox's wget, the one Alpine has: -q, -S, -O FILE and --spider, and a stop at any
# other flag. -S prints the 302 it then follows, so its Location comes first.
WGET = r"""#!/bin/sh
out= spider=0 url=
while [ $# -gt 0 ]; do
  case $1 in
    -O) out=$2; shift ;;
    -q|-S|-qS|-Sq) ;;
    --spider) spider=1 ;;
    -*) printf 'wget: unrecognized option: %s\n' "${1#-}" >&2; exit 1 ;;
    *) url=$1 ;;
  esac
  shift
done
printf '%s\n' "$url" >> "$FAKE/wget.log"
if [ "$spider" = 1 ]; then printf '  HTTP/1.1 302 Found\n  Location: %s\n  HTTP/1.1 200 OK\n' "$FAKE_LATEST" >&2; exit 0; fi
[ -f "$FAKE/$(basename "$url")" ] || exit 1
cp "$FAKE/$(basename "$url")" "$out"
"""
# A uv that records its arguments and puts sp-canvas where uv would.
UV = r"""#!/bin/sh
printf '%s\n' "$*" >> "$FAKE/uv.log"
mkdir -p "$HOME/.local/bin" && printf '#!/bin/sh\n' > "$HOME/.local/bin/sp-canvas" && chmod +x "$HOME/.local/bin/sp-canvas"
"""
# uv's installer, as served at https://astral.sh/uv/install.sh: it leaves uv in ~/.local/bin.
UV_INSTALLER = r"""#!/bin/sh
printf '%s\n' "$*" >> "$FAKE/uv-installer.log"
mkdir -p "$HOME/.local/bin" && cp "$FAKE/uv" "$HOME/.local/bin/uv"
"""


def plugin_tgz(version):
    """The bytes release.yml attaches: one top-level super-prototyping/ with the parts the
    script and the launcher read."""
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for name, text in {
            ".claude-plugin/plugin.json": json.dumps({"name": "super-prototyping", "version": version}),
            "skills/prototype-canvas/SKILL.md": "# prototype-canvas\n",
            "skills/clone-prototype/SKILL.md": "# clone-prototype\n",
            "tools/pyproject.toml": "[project]\nname = 'super-prototyping-tools'\n",
        }.items():
            data = text.encode()
            info = tarfile.TarInfo(f"super-prototyping/{name}")
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
    return buf.getvalue()


def machine(latest="1.5.0", uv=True, products=(".codex",)):
    """A HOME with `products` installed, and a FAKE directory: the release's assets, and a
    bin/ with the fake curl and, unless uv=False, the fake uv. Returns (home, fake)."""
    home, fake = Path(tempfile.mkdtemp()), Path(tempfile.mkdtemp())
    for product in products:
        (home / product).mkdir(parents=True)
    (fake / "bin").mkdir()
    tgz = plugin_tgz(latest)
    (fake / "plugin.tgz").write_bytes(tgz)
    (fake / "SHA256SUMS").write_text(f"{hashlib.sha256(tgz).hexdigest()}  plugin.tgz\n"
                                     f"{'0' * 64}  canvas-dist.tgz\n")
    (fake / "latest").write_text(latest)
    for path, text in ((fake / "bin/curl", CURL), (fake / "uv", UV), (fake / "install.sh", UV_INSTALLER)):
        path.write_text(text)
        path.chmod(0o755)
    if uv:
        (fake / "bin/uv").write_text(UV)
        (fake / "bin/uv").chmod(0o755)
    return home, fake


def install(home, fake, *args, cwd=None, path_extra=(), env_extra=None):
    """Run the script as `sh install.sh <args>` on that machine; returns the completed
    process, with output captured."""
    env = {"HOME": str(home), "FAKE": str(fake), "FAKE_LATEST": TAG + (fake / "latest").read_text(),
           "PATH": ":".join([*path_extra, str(fake / "bin"), "/usr/bin", "/bin"]), **(env_extra or {})}
    return subprocess.run(["sh", str(SCRIPT), *args], cwd=cwd or home, env=env,
                          capture_output=True, text=True)


def log(fake, name):
    path = fake / name
    return path.read_text().splitlines() if path.exists() else []


def fake_bin(fake, name, text):
    path = fake / "bin" / name
    path.write_text(text)
    path.chmod(0o755)


def launcher_data_dir(home, env=None):
    """Where sp-canvas will look for the install: the launcher's own answer for that HOME
    and environment."""
    return Path(subprocess.run([sys.executable, "-c", "import sp_canvas; print(sp_canvas._dirs()[2])"],
                               cwd=ROOT / "tools", env={"HOME": str(home), "PATH": os.environ["PATH"], **(env or {})},
                               capture_output=True, text=True, check=True).stdout.strip())


def test_a_fresh_machine_gets_the_release_under_the_data_directory_linked_and_installed():
    home, fake = machine(products=(".codex", ".pi/agent"))
    r = install(home, fake)
    assert r.returncode == 0, r.stderr
    copy = home / ".local/share/super-prototyping/1.5.0"
    assert (copy / "skills/prototype-canvas/SKILL.md").is_file()
    assert (copy / ".claude-plugin/plugin.json").is_file()
    assert launcher_data_dir(home) == copy.parent
    # Both assets came from the release named by the redirect, nothing else was fetched,
    # and no staging directory was left beside the copy.
    base = "https://github.com/ReScienceLab/super-prototyping/releases/download/super-prototyping--v1.5.0"
    assert log(fake, "curl.log") == ["https://github.com/ReScienceLab/super-prototyping/releases/latest",
                                     f"{base}/plugin.tgz", f"{base}/SHA256SUMS"]
    assert sorted(p.name for p in copy.parent.iterdir()) == ["1.5.0"]
    # The toolkit, from that copy, and every skill linked into each installed product.
    assert log(fake, "uv.log") == [f"tool install --force {copy}/tools"]
    for root in (home / ".codex/skills", home / ".pi/agent/skills"):
        for skill in ("prototype-canvas", "clone-prototype"):
            assert os.readlink(root / skill) == str(copy / "skills" / skill), root
    assert not (home / ".hermes").exists() and not (home / ".trae").exists()
    # ~/.local/bin was not on PATH, so the line to add is printed, and never written.
    assert 'export PATH="$HOME/.local/bin:$PATH"' in r.stdout
    assert not any(p.name.startswith(".") and p.name not in (".codex", ".pi", ".local")
                   for p in home.iterdir()), sorted(home.iterdir())

    # A second run downloads nothing, re-links nothing, and still moves the toolkit.
    r = install(home, fake, path_extra=(str(home / ".local/bin"),))
    assert r.returncode == 0, r.stderr
    assert "1.5.0 is already at" in r.stdout and "already linked" in r.stdout
    assert log(fake, "curl.log")[3:] == ["https://github.com/ReScienceLab/super-prototyping/releases/latest"]
    assert len(log(fake, "uv.log")) == 2
    assert "export PATH" not in r.stdout  # on PATH this time

    # A real directory at a skill's name is left alone, and said so.
    (home / ".codex/skills/prototype-canvas").unlink()
    (home / ".codex/skills/prototype-canvas").mkdir()
    r = install(home, fake)
    assert r.returncode == 0 and "a real directory is there and stays" in r.stdout, r.stdout
    assert not (home / ".codex/skills/prototype-canvas").is_symlink()


def test_version_names_a_release_and_skips_the_lookup():
    home, fake = machine(latest="1.5.0")
    r = install(home, fake, "--version", "1.4.1")
    assert r.returncode == 0, r.stderr
    assert (home / ".local/share/super-prototyping/1.4.1/tools").is_dir()
    assert log(fake, "curl.log")[0].endswith("super-prototyping--v1.4.1/plugin.tgz")
    assert not any("releases/latest" in u for u in log(fake, "curl.log"))
    # A value that is not a version never becomes a path: not a parent, not the data
    # directory itself, not a tag spelling.
    for bad in ("../../etc", "..", ".", "-", "v1.5.0"):
        r = install(home, fake, "--version", bad)
        assert r.returncode == 1 and "is not a version" in r.stderr, (bad, r.stderr)
    assert sorted(p.name for p in (home / ".local/share/super-prototyping").iterdir()) == ["1.4.1"]
    # And a release that has no plugin.tgz stops with the URL it wanted.
    (fake / "plugin.tgz").rename(fake / "plugin.tgz.away")
    r = install(home, fake, "--version", "1.3.0")
    assert r.returncode == 1 and "could not download" in r.stderr and "v1.3.0/plugin.tgz" in r.stderr, r.stderr
    assert not (home / ".local/share/super-prototyping/1.3.0").exists()


def test_the_data_directory_moves_with_the_variables_the_launcher_reads():
    """One spelling in two languages: install.sh writes where _dirs()[2] will look, under
    SUPER_PROTOTYPING_HOME (a literal ~ included, as Path.expanduser reads it) and under
    XDG_DATA_HOME alike."""
    for env, where in (({"SUPER_PROTOTYPING_HOME": "~/sp"}, "sp/data"),
                       ({"XDG_DATA_HOME": "{home}/xdg"}, "xdg/super-prototyping")):
        home, fake = machine()
        env = {k: v.format(home=home) for k, v in env.items()}
        r = install(home, fake, env_extra=env)
        assert r.returncode == 0, r.stderr
        copy = home / where / "1.5.0"
        assert (copy / "tools").is_dir(), sorted(home.rglob("*"))
        assert launcher_data_dir(home, env) == copy.parent
        assert not (home / ".local/share").exists() and not (home / "~").exists()


def test_without_curl_the_wget_branch_uses_only_busybox_flags():
    """Alpine's wget is BusyBox's, so the branch runs on a PATH with that wget, no curl at
    all, and the commands the script needs and nothing else."""
    home, fake = machine()
    (fake / "bin/curl").unlink()
    fake_bin(fake, "wget", WGET)
    tools = Path(tempfile.mkdtemp())
    for name in "sh uname mktemp dirname basename readlink ln mkdir rm cp chmod tar gzip mv awk sed head shasum sha256sum".split():
        if found := shutil.which(name):
            os.symlink(found, tools / name)
    r = install(home, fake, env_extra={"PATH": f"{fake / 'bin'}:{tools}"})
    assert r.returncode == 0, r.stderr
    base = "https://github.com/ReScienceLab/super-prototyping/releases/download/super-prototyping--v1.5.0"
    assert log(fake, "wget.log") == ["https://github.com/ReScienceLab/super-prototyping/releases/latest",
                                     f"{base}/plugin.tgz", f"{base}/SHA256SUMS"]
    assert (home / ".local/share/super-prototyping/1.5.0/tools").is_dir()


def test_a_download_that_does_not_match_the_checksum_installs_nothing():
    home, fake = machine()
    (fake / "SHA256SUMS").write_text(f"{'f' * 64}  plugin.tgz\n")
    r = install(home, fake)
    assert r.returncode == 1 and "does not match SHA256SUMS" in r.stderr, r.stderr
    assert not (home / ".local").exists() and not (home / ".codex/skills").exists()
    assert log(fake, "uv.log") == []
    # A SHA256SUMS with no line for plugin.tgz is the same stop.
    (fake / "SHA256SUMS").write_text(f"{'f' * 64}  canvas-dist.tgz\n")
    r = install(home, fake)
    assert r.returncode == 1 and "no line for plugin.tgz" in r.stderr, r.stderr


def test_a_dry_run_says_everything_and_writes_nothing():
    home, fake = machine()
    r = install(home, fake, "--dry-run")
    assert r.returncode == 0, r.stderr
    assert "dry run" in r.stdout and "would download" in r.stdout and "each skill in" in r.stdout
    assert sorted(p.name for p in home.iterdir()) == [".codex"]
    assert not (home / ".codex/skills").exists()
    assert log(fake, "curl.log") == ["https://github.com/ReScienceLab/super-prototyping/releases/latest"]
    assert log(fake, "uv.log") == []


def test_tools_only_links_nothing():
    home, fake = machine()
    r = install(home, fake, "--tools-only")
    assert r.returncode == 0, r.stderr
    assert log(fake, "uv.log") and not (home / ".codex/skills").exists()
    assert "Claude Code installs" not in r.stdout
    # And a machine with no product that reads a skills directory is told so, not failed.
    home, fake = machine(products=())
    r = install(home, fake)
    assert r.returncode == 0 and "nothing to link" in r.stdout, r.stdout


def test_a_toolkit_that_fails_to_install_still_links_the_skills_and_exits_1():
    home, fake = machine()
    fake_bin(fake, "uv", "#!/bin/sh\nexit 7\n")
    r = install(home, fake)
    assert r.returncode == 1 and "the toolkit did not install" in r.stderr, r.stderr
    assert (home / ".codex/skills/prototype-canvas").is_symlink()
    assert "export PATH" not in r.stdout


def test_pipx_is_the_second_choice_before_installing_uv():
    home, fake = machine(uv=False)
    fake_bin(fake, "pipx", UV.replace("uv.log", "pipx.log"))
    r = install(home, fake)
    assert r.returncode == 0, r.stderr
    assert log(fake, "pipx.log") == [f"install --force {home}/.local/share/super-prototyping/1.5.0/tools"]
    assert not any("astral" in u for u in log(fake, "curl.log"))


def test_without_uv_or_pipx_uv_is_installed_first_from_its_own_installer():
    home, fake = machine(uv=False)
    r = install(home, fake)
    assert r.returncode == 0, r.stderr
    assert "https://astral.sh/uv/install.sh" in r.stdout
    assert log(fake, "curl.log")[-1] == "https://astral.sh/uv/install.sh"
    assert log(fake, "uv-installer.log") == ["--no-modify-path"]  # our hint, not its profile edit
    assert log(fake, "uv.log") == [f"tool install --force {home}/.local/share/super-prototyping/1.5.0/tools"]


def test_from_checkout_links_this_clone_and_downloads_nothing():
    home, fake = machine()
    r = install(home, fake, "--from-checkout", cwd=ROOT)
    assert r.returncode == 0, r.stderr
    assert os.readlink(home / ".codex/skills/prototype-canvas") == str(ROOT / "skills/prototype-canvas")
    assert log(fake, "uv.log") == [f"tool install --force {ROOT}/tools"]
    assert log(fake, "curl.log") == [] and not (home / ".local/share").exists()
    # Piped, $0 is `sh` and the checkout is the current directory; not in one is a stop.
    r = subprocess.run(["sh", "-s", "--", "--from-checkout"], input=SCRIPT.read_text(), cwd=home,
                       env={"HOME": str(home), "PATH": str(fake / "bin") + ":/usr/bin:/bin"},
                       capture_output=True, text=True)
    assert r.returncode == 1 and "cd into it" in r.stderr, r.stderr


def test_windows_shells_are_refused_and_pointed_at_the_issue():
    home, fake = machine()
    win = Path(tempfile.mkdtemp())
    (win / "uname").write_text('#!/bin/sh\nprintf "MSYS_NT-10.0-19045\\n"\n')
    (win / "uname").chmod(0o755)
    r = install(home, fake, path_extra=(str(win),))
    assert r.returncode == 1 and "issues/111" in r.stderr, r.stderr
    assert log(fake, "curl.log") == []


def test_the_assets_installed_are_the_ones_the_release_workflow_attaches():
    """Two files spell the assets: release.yml archives and uploads them, install.sh
    downloads them. Neither may move without the other."""
    workflow = (ROOT / ".github/workflows/release.yml").read_text()
    script = SCRIPT.read_text()
    assert "--prefix=super-prototyping/" in workflow and 'mv "$STAGE/super-prototyping"' in script
    assert "sha256sum plugin.tgz canvas-dist.tgz > SHA256SUMS" in workflow
    assert 'gh release upload "super-prototyping--v$VERSION" plugin.tgz canvas-dist.tgz SHA256SUMS' in workflow
    assert '"$BASE/plugin.tgz"' in script and '"$BASE/SHA256SUMS"' in script
    # The script's usage text, not $0, names the command: $0 is `sh` under a pipe.
    assert subprocess.run(["sh", str(SCRIPT), "--help"], capture_output=True, text=True).stdout.startswith("Install super-prototyping")


if __name__ == "__main__":
    fns = [(n, f) for n, f in sorted(globals().items()) if n.startswith("test_")]
    for name, fn in fns:
        fn()
        print("ok  ", name)
    print(f"\n{len(fns)} checks passed")
