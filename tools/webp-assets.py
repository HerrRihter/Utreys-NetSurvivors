# Ships the textures as WebP in a static build of the game (dist/pages for GitHub Pages, dist/app/game for the APK): every
# assets/*.png in the given folder becomes assets/*.webp (lossy q90, alpha kept exact) and the PNG is removed, and index.html is
# told so (window.__IMG__ = 'webp'; live/index.html loads assets/<name>.<__IMG__ or png>). live/ itself keeps the PNGs: they stay
# the source that tools/ingest.py and the ref2game pipeline write, and the dev server serves them as they are.
# About 59 MB of PNG become about 10 MB; the median PSNR of the premultiplied colour is ~38 dB, the worst icons ~30 dB, no visible
# difference at the size the game draws them.
#   python tools/webp-assets.py dist/pages [--quality 90]      (safe to run again: a converted folder is left as it is)
import argparse, os, sys
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

ap = argparse.ArgumentParser(); ap.add_argument('game'); ap.add_argument('--quality', type=int, default=90); a = ap.parse_args()
assets, html = os.path.join(a.game, 'assets'), os.path.join(a.game, 'index.html')
pngs = sorted(f for f in os.listdir(assets) if f.endswith('.png'))

def convert(f):
    src = os.path.join(assets, f); dst = src[:-4] + '.webp'
    with Image.open(src) as im: im.convert('RGBA').save(dst, 'WEBP', quality=a.quality, alpha_quality=100, method=4)
    size = os.path.getsize(src); os.remove(src); return size, os.path.getsize(dst)

with ThreadPoolExecutor() as pool: sizes = list(pool.map(convert, pngs))
text = open(html, encoding='utf-8').read()
mark = "<script>window.__IMG__ = 'webp';</script>\n"
if mark not in text:
    at = text.find('<script')
    if at < 0: sys.exit(f'{html}: no <script> to mark the WebP textures')
    open(html, 'w', encoding='utf-8', newline='').write(text[:at] + mark + text[at:])
before, after = sum(s for s, _ in sizes), sum(s for _, s in sizes)
left = [f for f in os.listdir(assets) if f.endswith('.png')]
if left: sys.exit(f'{assets}: still PNG: {", ".join(left[:5])}')
print(f'webp: {len(sizes)} textures, {before / 1e6:.1f} MB -> {after / 1e6:.1f} MB' if sizes else 'webp: already converted')
