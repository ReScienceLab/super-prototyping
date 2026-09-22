"""Where the ink starts and stops, row by row, in the glyph's own pt."""
import sys
import importlib.util
from pathlib import Path

import numpy as np

spec = importlib.util.spec_from_file_location("design", Path(__file__).with_name("design.py"))
design = importlib.util.module_from_spec(spec)
spec.loader.exec_module(design)


def runs(line, thr=0.5):
    on = line > thr
    edge = np.diff(np.concatenate([[False], on, [False]]).astype(int))
    return list(zip(np.flatnonzero(edge == 1), np.flatnonzero(edge == -1)))


for name in sys.argv[1:]:
    x0, y0, w, h = design.viewbox(name)
    a = design.rasterise((design.ICONS / (name + ".svg")).read_text(), w, h)
    z = design.ZOOM
    print("\n== %s   %g x %g pt" % (name, w, h))
    for r in range(0, a.shape[0], max(1, a.shape[0] // 26)):
        print("  y %5.2f  %s" % (r / z, "  ".join("%.2f-%.2f" % (p / z, q / z)
                                                  for p, q in runs(a[r]))))
    for c in range(0, a.shape[1], max(1, a.shape[1] // 10)):
        print("  x %5.2f  %s" % (c / z, "  ".join("%.2f-%.2f" % (p / z, q / z)
                                                  for p, q in runs(a[:, c]))))
