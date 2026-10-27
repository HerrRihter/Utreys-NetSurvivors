# Shrinks live/assets for shipping (APK size and memory, after stage 8 of docs/PLAN-FEEDBACK-27-10.md):
#  1. nothing is backed up here: git keeps the previous files, and ingest.py rebuilds the full set from art/gen;
#  2. leftovers of the art pipeline no code draws are removed from live/assets and from the manifest: *_gen (an icon's raw
#     generation beside the sliced one) and *_bodyonly (skin bodies before their rig parts were cut);
#  3. every other texture is resized to at most CAP px on its longer side. The game already draws them from an atlas capped at
#     640 px (gl.js buildAtlas), and gl.js keeps the manifest's w × h as the logical size, so nothing moves on screen. Icons
#     (ic_*, ab_*) get ICON_CAP: they are drawn at 200 px at most (the compact level-up card), so 320 keeps a 1.6× margin.
#   python tools/shrink-assets.py [--cap 640] [--icon-cap 320] [--dry]   (safe to run again: it only shrinks what is still larger)
import argparse, json, os, re
from PIL import Image
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
ap = argparse.ArgumentParser(); ap.add_argument('--cap', type=int, default=640); ap.add_argument('--icon-cap', type=int, default=320); ap.add_argument('--dry', action='store_true'); a = ap.parse_args()
text = open('live/assets.js', encoding='utf-8').read()
man = json.loads(re.sub(r'^window\.ASSETS = |;\s*$', '', text.strip()))
unused = sorted(n for n in man if n.endswith('_gen') or n.endswith('_bodyonly'))
size0 = sum(os.path.getsize(f'live/assets/{n}.png') for n in man)
if not a.dry:
    for n in unused: os.remove(f'live/assets/{n}.png'); del man[n]
    open('live/assets.js', 'w', encoding='utf-8', newline='').write('window.ASSETS = ' + json.dumps(man) + ';\n')
shrunk = 0
for n in man:
    p = f'live/assets/{n}.png'; im = Image.open(p); w, h = im.size; k = (a.icon_cap if n.startswith(('ic_', 'ab_')) else a.cap) / max(w, h)
    if k >= 1: continue
    shrunk += 1
    if a.dry: continue
    rgba = im.convert('RGBA').convert('RGBa')                       # premultiplied while resampling: no dark fringes at the edges
    rgba.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS).convert('RGBA').save(p, optimize=True)
size1 = sum(os.path.getsize(f'live/assets/{n}.png') for n in man) if not a.dry else size0
print(f'removed {len(unused)} unused, resized {shrunk} of {len(man)} to ≤{a.cap} px (icons ≤{a.icon_cap}); {size0 / 1e6:.1f} MB → {size1 / 1e6:.1f} MB')
