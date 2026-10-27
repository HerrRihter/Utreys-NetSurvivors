# Placeholder art for the datacenter survivors slice: every asset name the scene reads, drawn with PIL in the
# reference's palette (ink outline, 2 tones). Real generations replace these files in art/gen one by one.
#   python3 tools/placeholders_net.py [--only name1,name2] [--force]
# A name is (re)drawn only while art/logs/<name>.placeholder exists (a real generation removes that marker), or with --force.
import argparse, math, os, random
from PIL import Image, ImageDraw

INK = (38, 18, 21, 255)
OUT = 'art/gen'


def canvas(w, h): return Image.new('RGBA', (w, h), (0, 0, 0, 0))
def rgb(h, a=255): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (a,)
def shade(c, k): return tuple(max(0, min(255, int(v * k))) for v in c[:3]) + (c[3],)
def ell(d, box, fill, w=5): d.ellipse(box, fill=fill, outline=INK, width=w)
def rect(d, box, fill, r=10, w=5): d.rounded_rectangle(box, r, fill=fill, outline=INK, width=w)
def poly(d, pts, fill, w=5): d.polygon(pts, fill=fill, outline=INK, width=w)


def eyes(d, cx, cy, s, look=0.25):
    for k in (-1, 1):
        x = cx + k * s * 0.9
        ell(d, (x - s * 0.55, cy - s * 0.65, x + s * 0.55, cy + s * 0.65), (240, 236, 222, 255), max(2, int(s * 0.18)))
        p = s * 0.28
        ell(d, (x - p + s * look, cy - p, x + p + s * look, cy + p), (20, 12, 14, 255), 1)


def grain(im, amt=10, seed=1):
    r = random.Random(seed); px = im.load(); w, h = im.size
    for _ in range(w * h // 6):
        x, y = r.randrange(w), r.randrange(h); c = px[x, y]
        if c[3] > 200:
            v = r.randint(-amt, amt)
            px[x, y] = (max(0, min(255, c[0] + v)), max(0, min(255, c[1] + v)), max(0, min(255, c[2] + v)), c[3])
    return im


# ------------------------------------------------------------------ ground
def ground_tex():
    T = 512; im = Image.new('RGBA', (T, T), rgb('#1d2333')); d = ImageDraw.Draw(im); n = 4; s = T // n; r = random.Random(3)
    for j in range(n):
        for i in range(n):
            x0, y0 = i * s, j * s; base = rgb('#262e42'); k = 0.9 + 0.2 * r.random()
            d.rectangle((x0 + 3, y0 + 3, x0 + s - 4, y0 + s - 4), fill=shade(base, k))
            d.line((x0 + 3, y0 + 3, x0 + s - 4, y0 + 3), fill=shade(base, 1.35), width=3)
            d.line((x0 + 3, y0 + s - 4, x0 + s - 4, y0 + s - 4), fill=shade(base, 0.6), width=3)
            if (i + j) % 3 == 0:
                for yy in range(y0 + 22, y0 + s - 18, 14):
                    for xx in range(x0 + 22, x0 + s - 18, 14):
                        d.ellipse((xx - 3, yy - 3, xx + 3, yy + 3), fill=shade(base, 0.55))
            for cx, cy in ((x0 + 12, y0 + 12), (x0 + s - 13, y0 + 12), (x0 + 12, y0 + s - 13), (x0 + s - 13, y0 + s - 13)):
                d.ellipse((cx - 3, cy - 3, cx + 3, cy + 3), fill=shade(base, 0.5))
    for _ in range(40):
        x, y = r.randrange(T), r.randrange(T)
        d.line((x, y, x + r.randint(-30, 30), y + r.randint(-6, 6)), fill=(20, 24, 34, 255), width=2)
    return grain(im, 8)


# ------------------------------------------------------------------ props (front 3/4, ground line = bottom)
def rack(variant=0):
    w, h = 300, 520; im = canvas(w, h); d = ImageDraw.Draw(im)
    poly(d, [(30, 70), (210, 70), (270, 30), (90, 30)], rgb('#3c4660'))
    poly(d, [(210, 70), (270, 30), (270, 470), (210, 510)], rgb('#1a1f2e'))
    rect(d, (30, 70, 210, 510), rgb('#262d40'), 6)
    cols = ['#3fa9ff', '#f6bc56', '#5cff9a', '#ff5d5d']
    for k in range(9):
        y = 92 + k * 44; d.rectangle((48, y, 192, y + 30), fill=rgb('#151a26'), outline=INK, width=3)
        for q in range(3):
            d.ellipse((58 + q * 14, y + 11, 66 + q * 14, y + 19), fill=rgb(cols[(k + q + variant) % 4]))
        d.line((110, y + 15, 184, y + 15), fill=rgb('#39425a'), width=4)
    for q in range(5):
        d.arc((80 + q * 22, -30, 140 + q * 22, 110), 20, 160, fill=rgb('#11151f'), width=6)
    return grain(im)


def kiosk():
    w, h = 260, 300; im = canvas(w, h); d = ImageDraw.Draw(im)
    rect(d, (40, 150, 220, 290), rgb('#2d3548'), 10)
    rect(d, (60, 30, 200, 140), rgb('#141a28'), 10)
    d.rectangle((76, 46, 184, 124), fill=rgb('#1f6f8c'))
    d.line((80, 110, 110, 80, 140, 95, 180, 56), fill=rgb('#79edbd'), width=5)
    d.rectangle((120, 140, 140, 150), fill=rgb('#2d3548'), outline=INK, width=3)
    return grain(im)


def ups():
    w, h = 300, 190; im = canvas(w, h); d = ImageDraw.Draw(im)
    poly(d, [(20, 60), (240, 60), (285, 30), (65, 30)], rgb('#4a5368'))
    poly(d, [(240, 60), (285, 30), (285, 150), (240, 180)], rgb('#1e2433'))
    rect(d, (20, 60, 240, 180), rgb('#2f374c'), 6)
    for k in range(5):
        d.rectangle((36 + k * 40, 80, 60 + k * 40, 160), fill=rgb('#232a3b'), outline=INK, width=3)
    d.ellipse((200, 72, 214, 86), fill=rgb('#5cff9a'))
    return grain(im)


def pdu():
    w, h = 150, 210; im = canvas(w, h); d = ImageDraw.Draw(im)
    ell(d, (20, 14, 130, 54), rgb('#3d465d'))
    poly(d, [(20, 34), (130, 34), (122, 196), (28, 196)], rgb('#2a3145'))
    ell(d, (30, 20, 120, 48), rgb('#141824'), 3)
    d.rectangle((48, 90, 102, 140), fill=rgb('#c9a23a'), outline=INK, width=4)
    d.polygon([(75, 98), (92, 130), (58, 130)], fill=INK)
    return grain(im)


def lamp():
    w, h = 120, 560; im = canvas(w, h); d = ImageDraw.Draw(im)
    rect(d, (44, 80, 76, 540), rgb('#2a3044'), 8); rect(d, (30, 520, 90, 556), rgb('#1f2433'), 8)
    poly(d, [(18, 70), (102, 70), (84, 24), (36, 24)], rgb('#3a4157'))
    ell(d, (34, 60, 86, 92), rgb('#f6e2a8'), 4)
    for y in (180, 300, 420):
        d.line((46, y, 74, y), fill=rgb('#11151f'), width=6)
    return grain(im)


def tank():
    w, h = 140, 230; im = canvas(w, h); d = ImageDraw.Draw(im)
    rect(d, (20, 40, 120, 222), rgb('#b5403a'), 40)
    rect(d, (52, 10, 88, 46), rgb('#3a4157'), 6)
    d.rectangle((24, 120, 116, 150), fill=rgb('#e8e2d0'), outline=INK, width=4)
    d.polygon([(70, 124), (84, 146), (56, 146)], fill=rgb('#f6bc56'), outline=INK)
    d.line((40, 70, 40, 200), fill=shade(rgb('#b5403a'), 1.3), width=8)
    return grain(im)


def cart(c='#3fa9ff'):
    w, h = 300, 220; im = canvas(w, h); d = ImageDraw.Draw(im)
    rect(d, (20, 60, 280, 200), rgb('#1b2130'), 30)
    rect(d, (36, 30, 264, 170), rgb(c), 26)
    rect(d, (70, 52, 230, 140), rgb('#141824'), 14)
    for k in range(4):
        d.rectangle((88, 64 + k * 18, 212, 76 + k * 18), fill=rgb('#2a3145'))
    return grain(im)


def router():
    w, h = 760, 640; im = canvas(w, h); d = ImageDraw.Draw(im)
    ell(d, (30, 330, 730, 620), rgb('#232a3b'), 7)
    ell(d, (60, 300, 700, 560), rgb('#39425a'), 6)
    cols = ['#3fa9ff', '#f6bc56', '#5cff9a', '#ff5d5d', '#e288d3']
    for k in range(10):
        a = k / 10 * 2 * math.pi; x = 380 + 300 * math.cos(a); y = 430 + 120 * math.sin(a)
        d.line((x, y, x, y - 150), fill=INK, width=12); d.line((x, y, x, y - 150), fill=rgb('#8a93a8'), width=6)
        rect(d, (x - 34, y - 120, x + 34, y - 70), rgb(cols[k % 5]), 10, 4)
    rect(d, (330, 120, 430, 470), rgb('#2a3145'), 14)
    poly(d, [(250, 150), (510, 150), (440, 40), (320, 40)], rgb('#b5403a'))
    poly(d, [(320, 40), (440, 40), (380, 6)], rgb('#e8e2d0'))
    for k in range(9):
        x = 260 + k * 30; d.ellipse((x - 6, 144, x + 6, 156), fill=rgb('#f6e2a8'), outline=INK)
    return grain(im)


def cage():
    w, h = 420, 620; im = canvas(w, h); d = ImageDraw.Draw(im)
    rect(d, (30, 120, 390, 600), rgb('#232a3b'), 8)
    d.rectangle((60, 200, 360, 460), fill=rgb('#5a4630'), outline=INK, width=5)
    for k in range(4):
        d.rectangle((80 + k * 70, 220, 130 + k * 70, 440), fill=rgb('#2a3145'), outline=INK, width=3)
    for x in range(60, 361, 20):
        d.line((x, 200, x, 460), fill=rgb('#8a93a8'), width=3)
    poly(d, [(10, 140), (410, 140), (380, 40), (40, 40)], rgb('#b5403a'))
    for k in range(7):
        x = 40 + k * 52; d.polygon([(x, 140), (x + 26, 140), (x + 26, 40), (x + 14, 40)], fill=rgb('#e8e2d0'))
    rect(d, (40, 480, 380, 600), rgb('#2f374c'), 6)
    return grain(im)


def fence():
    w, h = 520, 170; im = canvas(w, h); d = ImageDraw.Draw(im)
    for x in (20, 260, 500):
        rect(d, (x - 10, 20, x + 10, 165), rgb('#2a3044'), 4)
    for y in (40, 90):
        d.rectangle((14, y, 506, y + 14), fill=rgb('#3a4157'), outline=INK, width=4)
    for x in range(40, 500, 30):
        d.line((x, 54, x, 160), fill=rgb('#3a4157'), width=6)
    return grain(im)


# ------------------------------------------------------------------ actors: body (no limbs), leg (thigh+shin), foot, arm
def leg(c='#2a3550', w=60, h=200):
    im = canvas(w, h); d = ImageDraw.Draw(im); rect(d, (8, 4, w - 8, h - 4), rgb(c), (w - 16) // 2, 4)
    d.line((w * 0.35, 14, w * 0.35, h - 16), fill=shade(rgb(c), 1.35), width=4)
    return im


def foot(c='#e8e2d0', w=110, h=60):
    im = canvas(w, h); d = ImageDraw.Draw(im); rect(d, (6, 10, w - 6, h - 6), rgb(c), 22, 4)
    d.rectangle((10, h - 20, w - 10, h - 10), fill=rgb('#3a4157'))
    return im


def arm(c='#2a3550', hand='#e8e2d0', w=56, h=170):
    im = canvas(w, h); d = ImageDraw.Draw(im); rect(d, (10, 4, w - 10, h - 40), rgb(c), (w - 20) // 2, 4)
    ell(d, (4, h - 56, w - 4, h - 4), rgb(hand), 4)
    return im


def hero_body():
    w, h = 300, 330; im = canvas(w, h); d = ImageDraw.Draw(im)
    coral, cyan, navy = rgb('#c55248'), rgb('#0b8ea3'), rgb('#292e49')
    poly(d, [(40, 30), (110, 30), (110, 210), (40, 200)], coral); poly(d, [(110, 30), (128, 20), (128, 205), (110, 210)], shade(coral, 0.65))
    poly(d, [(190, 30), (260, 30), (260, 200), (190, 210)], cyan); poly(d, [(260, 30), (276, 20), (276, 190), (260, 200)], shade(cyan, 0.65))
    d.pieslice((40, 110, 260, 320), 0, 180, fill=navy, outline=INK, width=5)
    d.rectangle((44, 170, 256, 215), fill=navy)
    d.line((40, 200, 40, 215), fill=INK, width=5); d.line((260, 200, 260, 215), fill=INK, width=5)
    poly(d, [(40, 30), (110, 30), (128, 20), (58, 20)], shade(coral, 1.25)); poly(d, [(190, 30), (260, 30), (276, 20), (206, 20)], shade(cyan, 1.25))
    eyes(d, 150, 245, 22)
    d.arc((120, 262, 180, 296), 20, 160, fill=INK, width=5)
    return grain(im)


def scanner():
    w, h = 170, 90; im = canvas(w, h); d = ImageDraw.Draw(im)
    poly(d, [(30, 40), (60, 40), (64, 86), (38, 86)], rgb('#3a4157'))
    rect(d, (14, 14, 156, 50), rgb('#f6bc56'), 14, 4)
    d.rectangle((140, 18, 162, 46), fill=rgb('#ff5d5d'), outline=INK, width=4)
    return im


def node_body():
    w, h = 220, 220; im = canvas(w, h); d = ImageDraw.Draw(im)
    poly(d, [(30, 40), (170, 40), (196, 20), (56, 20)], rgb('#1d5a3c')); poly(d, [(170, 40), (196, 20), (196, 190), (170, 210)], rgb('#08261a'))
    rect(d, (30, 40, 170, 210), rgb('#0d3a26'), 8)
    for k in range(3):
        d.ellipse((46 + k * 22, 54, 60 + k * 22, 68), fill=rgb('#5cff9a'), outline=INK)
    d.rectangle((44, 78, 156, 86), fill=rgb('#1f8f58')); eyes(d, 100, 132, 20, 0.3)
    d.line((70, 176, 130, 176), fill=INK, width=5)
    return grain(im)


def panel_body():
    w, h = 220, 200; im = canvas(w, h); d = ImageDraw.Draw(im)
    rect(d, (16, 16, 204, 150), rgb('#ff9830'), 14); rect(d, (32, 30, 188, 136), rgb('#141a28'), 8, 4)
    d.line((42, 120, 80, 96, 110, 110, 150, 64, 178, 76), fill=rgb('#79edbd'), width=5)
    poly(d, [(70, 40), (150, 40), (120, 72), (120, 92), (100, 100), (100, 72)], rgb('#ff9830'), 3)
    rect(d, (90, 150, 130, 186), rgb('#3a4157'), 6); eyes(d, 110, 108, 13, 0.4)
    return grain(im)


def orb_body():
    w, h = 240, 240; im = canvas(w, h); d = ImageDraw.Draw(im)
    ell(d, (20, 20, 220, 220), rgb('#0b4f9e'), 6)
    d.pieslice((28, 28, 212, 212), 180, 360, fill=rgb('#d8323c'))
    d.ellipse((28, 104, 212, 136), fill=rgb('#f2efe6'))
    d.ellipse((20, 20, 220, 220), outline=INK, width=6)
    d.arc((48, 40, 120, 100), 190, 260, fill=(255, 255, 255, 160), width=8)
    eyes(d, 120, 160, 18, 0.3)
    return grain(im)


def keg_body():
    w, h = 260, 280; im = canvas(w, h); d = ImageDraw.Draw(im)
    rect(d, (30, 40, 230, 262), rgb('#c79a2e'), 50, 6)
    for y in (78, 222):
        d.rectangle((32, y - 10, 228, y + 10), fill=rgb('#6b1a1a'), outline=INK, width=4)
    ell(d, (60, 20, 200, 64), rgb('#e0c060'), 5); ell(d, (112, 30, 148, 52), rgb('#6b1a1a'), 3)
    d.rectangle((80, 110, 180, 170), fill=rgb('#6b1a1a'), outline=INK, width=4)
    eyes(d, 130, 140, 18, 0.25)
    return grain(im)


def bug_body():
    w, h = 300, 260; im = canvas(w, h); d = ImageDraw.Draw(im)
    ell(d, (40, 60, 260, 240), rgb('#5a3a8c'), 6)
    d.line((150, 64, 150, 236), fill=INK, width=6)
    ell(d, (110, 20, 190, 86), rgb('#2a1f40'), 6)
    for k in (-1, 1):
        d.line((150 + k * 20, 30, 150 + k * 60, 4), fill=INK, width=6)
    for (x, y) in ((90, 120), (210, 150), (120, 190)):
        ell(d, (x - 14, y - 14, x + 14, y + 14), rgb('#9c96ff'), 3)
    eyes(d, 150, 56, 12, 0.0)
    return grain(im)


def boss_body():
    w, h = 560, 620; im = canvas(w, h); d = ImageDraw.Draw(im)
    rect(d, (60, 140, 500, 600), rgb('#8c2a2a'), 120, 8)
    for (x, y, r, c) in ((150, 230, 70, '#0b4f9e'), (400, 220, 80, '#c79a2e'), (280, 170, 60, '#d8323c'), (130, 430, 60, '#5a3a8c'), (420, 450, 70, '#0d3a26')):
        ell(d, (x - r, y - r, x + r, y + r), rgb(c), 6)
    rect(d, (230, 40, 330, 140), rgb('#ff5d5d'), 30, 6); d.rectangle((250, 70, 310, 90), fill=rgb('#f6e2a8'))
    eyes(d, 280, 360, 44, 0.2)
    d.arc((200, 400, 360, 500), 200, 340, fill=INK, width=12)
    for k in range(5):
        x = 220 + k * 30; d.polygon([(x, 460), (x + 14, 460), (x + 7, 480)], fill=rgb('#f2efe6'), outline=INK)
    return grain(im)


# ------------------------------------------------------------------ pickups and icons
def gem(c):
    im = canvas(96, 120); d = ImageDraw.Draw(im); poly(d, [(48, 6), (88, 50), (48, 114), (8, 50)], rgb(c), 5)
    d.polygon([(48, 12), (80, 50), (48, 50)], fill=shade(rgb(c), 1.3))
    return im


def bar():
    im = canvas(140, 90); d = ImageDraw.Draw(im); poly(d, [(20, 30), (110, 30), (130, 70), (10, 70)], rgb('#e0b040'), 5)
    poly(d, [(20, 30), (110, 30), (98, 12), (32, 12)], rgb('#f6dc80'), 5)
    return im


def heal():
    im = canvas(110, 110); d = ImageDraw.Draw(im); rect(d, (8, 8, 102, 102), rgb('#e8e2d0'), 20, 5)
    d.rectangle((44, 22, 66, 88), fill=rgb('#d8323c')); d.rectangle((22, 44, 88, 66), fill=rgb('#d8323c'))
    return im


def icon(kind):
    S = 160; im = canvas(S, S); d = ImageDraw.Draw(im); c = 80
    if kind == 'trace':
        poly(d, [(30, 60), (110, 60), (130, 90), (30, 100)], rgb('#f6bc56'))
        for k in (-2, -1, 0, 1, 2):
            d.line((130, 80, 156, 80 + k * 18), fill=rgb('#ff5d5d'), width=5)
    elif kind == 'orbit':
        ell(d, (c - 22, c - 22, c + 22, c + 22), rgb('#3fa9ff')); d.arc((14, 14, 146, 146), 0, 300, fill=rgb('#3fa9ff'), width=8)
        ell(d, (120, 60, 150, 90), rgb('#e8e2d0'))
    elif kind == 'homing':
        poly(d, [(20, 120), (100, 50), (120, 70), (40, 140)], rgb('#9c96ff')); poly(d, [(100, 50), (150, 14), (120, 70)], rgb('#e8e2d0'))
    elif kind == 'mine':
        rect(d, (24, 24, 136, 136), rgb('#3a4157'), 16)
        for k in range(25):
            if (k * 7) % 3:
                d.rectangle((40 + (k % 5) * 18, 40 + (k // 5) * 18, 52 + (k % 5) * 18, 52 + (k // 5) * 18), fill=rgb('#e8e2d0'))
    elif kind == 'ping':
        for r in (24, 46, 68):
            d.arc((c - r, c - r, c + r, c + r), 200, 340, fill=rgb('#5cff9a'), width=10)
        ell(d, (c - 12, c - 12, c + 12, c + 12), rgb('#5cff9a'))
    elif kind == 'retry':
        d.arc((24, 24, 136, 136), 30, 320, fill=rgb('#f6bc56'), width=16); poly(d, [(118, 20), (150, 52), (108, 60)], rgb('#f6bc56'))
    elif kind == 'cache':
        ell(d, (20, 40, 140, 130), rgb('#ff7a2e')); ell(d, (44, 56, 116, 112), rgb('#ffd27a'))
    elif kind == 'hp':
        poly(d, [(80, 140), (20, 70), (40, 30), (80, 50), (120, 30), (140, 70)], rgb('#d8323c'))
    elif kind == 'speed':
        poly(d, [(20, 110), (110, 110), (140, 80), (60, 60), (40, 30)], rgb('#e8e2d0'))
        for k in range(3):
            d.line((4, 70 + k * 18, 30, 70 + k * 18), fill=rgb('#3fa9ff'), width=6)
    elif kind == 'magnet':
        d.arc((30, 20, 130, 120), 180, 360, fill=INK, width=40); d.arc((34, 24, 126, 116), 180, 360, fill=rgb('#d8323c'), width=30)
        d.rectangle((30, 70, 60, 130), fill=rgb('#e8e2d0'), outline=INK, width=5); d.rectangle((100, 70, 130, 130), fill=rgb('#e8e2d0'), outline=INK, width=5)
    elif kind == 'power':
        poly(d, [(90, 10), (40, 90), (76, 90), (60, 150), (124, 62), (86, 62)], rgb('#f6bc56'))
    elif kind == 'haste':
        ell(d, (20, 20, 140, 140), rgb('#e8e2d0')); d.line((80, 80, 80, 36), fill=INK, width=8); d.line((80, 80, 114, 96), fill=INK, width=8)
    return im


ACTORS = {  # name -> (body, limb colour, hand / shoe colour)
    'hero': (hero_body, '#292e49', '#e8e2d0'), 'node': (node_body, '#0d3a26', '#1f8f58'), 'panel': (panel_body, '#3a4157', '#ff9830'),
    'orb': (orb_body, '#1d2a52', '#f2efe6'), 'keg': (keg_body, '#3a2414', '#6b1a1a'), 'bug': (bug_body, '#2a1f40', '#5a3a8c'), 'boss': (boss_body, '#4a1414', '#2a1f40'),
}


def build():
    A = {'ground_tex': ground_tex, 'rack': lambda: rack(0), 'rack_b': lambda: rack(1), 'kiosk': kiosk, 'ups': ups, 'pdu': pdu, 'lamp': lamp, 'tank': tank,
         'cart': lambda: cart('#3fa9ff'), 'cart_b': lambda: cart('#f6bc56'), 'router': router, 'cage': cage, 'fence': fence, 'scanner': scanner,
         'gem': lambda: gem('#5cff9a'), 'gem_b': lambda: gem('#3fa9ff'), 'gem_c': lambda: gem('#e288d3'), 'bar': bar, 'heal': heal}
    for n, (fn, lc, hc) in ACTORS.items():
        A[n + '_body'] = fn
        A[n + '_leg'] = (lambda c=lc: leg(c))
        A[n + '_foot'] = (lambda c=hc: foot(c))
        A[n + '_arm'] = (lambda c=lc, h=hc: arm(c, h))
    for k in ('trace', 'orbit', 'homing', 'mine', 'ping', 'retry', 'cache', 'hp', 'speed', 'magnet', 'power', 'haste'):
        A['ic_' + k] = (lambda k=k: icon(k))
    return A


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--only', default=''); ap.add_argument('--force', action='store_true'); a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True); os.makedirs('art/logs', exist_ok=True)
    only = [s for s in a.only.split(',') if s]; n = 0
    for name, fn in build().items():
        if only and name not in only:
            continue
        p = os.path.join(OUT, name + '.png'); mark = os.path.join('art/logs', name + '.placeholder')
        if os.path.exists(p) and not os.path.exists(mark) and not a.force:
            continue
        fn().save(p); open(mark, 'w').close(); n += 1
    print(n, 'placeholders written')
