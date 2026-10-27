# Pixel comparison of two render-ref.mjs runs: python tools/render-diff.py frames/batch/ref frames/batch/new
# Per frame: mean abs difference, max difference, share of pixels off by more than 8/255; writes <new>_<name>_diff.png (×8).
import sys, glob, os
import numpy as np
from PIL import Image
a, b = sys.argv[1], sys.argv[2]
for fa in sorted(glob.glob(a + '_*.png')):
    name = fa[len(a) + 1:-4]
    if name.endswith('_diff'): continue
    fb = b + '_' + name + '.png'
    if not os.path.exists(fb): print(f'{name:12s} missing in {b}'); continue
    A = np.asarray(Image.open(fa).convert('RGB')).astype(np.int16); B = np.asarray(Image.open(fb).convert('RGB')).astype(np.int16)
    d = np.abs(A - B).max(axis=2)
    print(f'{name:12s} mean {d.mean():5.2f}  max {d.max():3d}  >8: {100 * (d > 8).mean():5.2f}%')
    Image.fromarray(np.clip(d * 8, 0, 255).astype(np.uint8)).save(b + '_' + name + '_diff.png')
