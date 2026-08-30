#!/usr/bin/env python3
"""Self-check for refkit's measurement logic — the parts that would silently
return a plausible wrong number. Synthesises its own images; needs no captures.

    python3 tools/test_refkit.py
"""
import os, sys, tempfile
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import refkit as R

BG, INK = 0xF5, 0x0A


def img(a):
    return Image.fromarray(a.astype("uint8"))


def test_fill_reads_the_ground_not_the_text():
    a = np.full((40, 60, 3), BG, int)
    a[12:20, 8:52] = INK                      # a text-ish run over the fill
    assert R._fill(a)[0] == "#F5F5F5", R._fill(a)


def test_fill_falls_back_to_mode_when_nothing_is_flat():
    a = np.full((2, 2, 3), 0x2B, int)          # too small to have an interior
    assert R._flatsel(a) is None
    assert R._fill(a)[0] == "#2B2B2B"


def test_ink_core_of_antialiased_text():
    # The mode of this region is the background; the darkest 2% is the ink.
    a = np.full((40, 60, 3), BG, int)
    a[12:20, 8:52] = 0x80                      # antialiased halo
    a[14:18, 10:50] = INK                      # true ink core
    v = a.reshape(-1, 3)
    n = max(1, int(len(v) * 2.0 / 100))
    core = R._hex(v[v.mean(1).argsort()[:n]].mean(0))
    assert core == "#0A0A0A", core
    assert R._fill(a)[0] == "#F5F5F5"          # ... and the fill is still the ground


def test_hairline_solve_recovers_a_diluted_rule():
    # A 1pt rule at 0.5 px/pt lands as one row at 50% coverage.
    bg, rule, cov = 255.0, 55.0, 0.5      # blends to exactly 155, no rounding slop
    blended = bg - (bg - rule) * cov
    a = np.full((5, 20, 3), bg, int)
    a[2, :] = blended
    band = a[0:5, 0:20].astype(float).mean(axis=1)
    ink = (np.array([bg] * 3) - band).sum(axis=0) / cov
    assert R._hex(np.clip(bg - ink, 0, 255)) == "#373737", R._hex(np.clip(bg - ink, 0, 255))


def test_bands_finds_pitch_not_antialiasing():
    prof = np.zeros(200)
    for top in (10, 60, 110, 160):             # four rows on a 50px pitch
        prof[top:top + 12] = 1.0
    runs = R._runs(prof, .004)
    assert [s for s, _ in runs] == [10, 60, 110, 160], runs
    assert all(e - s == 12 for s, e in runs), runs


def test_crop_phone_cuts_the_screen_out_of_the_frame():
    scale, bez = 2, 12
    canvas = np.full((980 * scale, 478 * scale, 3), 0xF3, int)
    x0, y0 = 40 * scale, 60 * scale
    fw, fh = 393 * scale + 2 * bez * scale, 852 * scale + 2 * bez * scale
    canvas[y0:y0 + fh, x0:x0 + fw] = [0x1D, 0x19, 0x1A]
    canvas[y0 + bez * scale:y0 + bez * scale + 852 * scale,
           x0 + bez * scale:x0 + bez * scale + 393 * scale] = 0xEF
    out = R._crop_phone(img(canvas), scale)
    assert out.size == (393 * scale, 852 * scale), out.size
    a = np.asarray(out)
    assert a.min() == 0xEF and a.max() == 0xEF, (a.min(), a.max())   # no bezel leaked in


def test_crop_phone_returns_none_without_a_frame():
    assert R._crop_phone(img(np.full((100, 100, 3), 0xF3, int)), 2) is None


ROOT = ":root{--x-bg:#FFFFFF;--x-ink:#0A0A0A}"


def _folder(files):
    d = tempfile.mkdtemp()
    for name, body in files.items():
        open(os.path.join(d, name), "w", encoding="utf-8").write(body)
    return d


def test_tokens_clean_folder():
    d = _folder({
        "00.html": f"<style>{ROOT}</style><td class=\"t\">--x-ink</td>",
        "01.html": f"<style>{ROOT}</style><p style='color:var(--x-ink)'>hi</p>",
    })
    assert R._token_problems(d) == [], R._token_problems(d)


def test_tokens_catches_a_drifted_root_block():
    d = _folder({
        "00.html": f"<style>{ROOT}</style>",
        "01.html": "<style>:root{--x-bg:#FFFFFF;--x-ink:#0B0B0B}</style>",
    })
    p = R._token_problems(d)
    assert any("not shared" in s for s in p), p


def test_tokens_catches_undefined_var_and_evidence_row():
    d = _folder({
        "00.html": f"<style>{ROOT}</style><td class=\"t\">--x-scrim-3</td>",
        "01.html": f"<style>{ROOT}</style><p style='color:var(--x-nope)'>hi</p>",
    })
    p = R._token_problems(d)
    assert any("--x-scrim-3" in s and "not a token" in s for s in p), p
    assert any("var(--x-nope) is not defined" in s for s in p), p


if __name__ == "__main__":
    fns = [(n, f) for n, f in sorted(globals().items()) if n.startswith("test_")]
    for name, fn in fns:
        fn()
        print("ok  ", name)
    print(f"\n{len(fns)} checks passed")
