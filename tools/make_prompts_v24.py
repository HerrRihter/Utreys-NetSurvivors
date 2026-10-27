# Round 24 (user: "start the skins again, as separate requests per part, not a whole sheet; give every request concrete reference
# drawings with a simplified schematic of the part, so nothing deviates"). Every skin part (body, leg, shoe, arm) is its own job with:
#   Image 1 — a SCHEMATIC: the approved base part's silhouette as a flat grey shape with a dark outline, centred (art/refs/schem_*.png):
#             the exact outline, pose and proportions to fill (legs and arms straight and vertical, the shoe side-on, toe right);
#   Image 2 — for the body: the base hero's body (the design to keep); for a limb: the skin's own body made in phase 'body' (colours,
#             materials, style to match);
#   Image 3 — for a limb: the base hero's part (the design of the part).
#   python3 tools/make_prompts_v24.py schem|body|limbs [skin prefix ...]
import json, os, sys
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
phase, only = (sys.argv[1] if len(sys.argv) > 1 else 'body'), sys.argv[2:]
HEROES = {'trc': ('Полная прослеживаемость', 'hr_trc', 'the U body, the two cubes, the eyes and its ring orbit of three small link nodes around its top'),
          'ser': ('Сериализация', 'hr_ser', 'the U body, the two cubes with their small windows, the eyes, the code panel with square marks on its front and the small scanner on each side'),
          'ba': ('БА', 'hr_ba', 'the U body, the two cubes, the eyes, the bar chart panel on its front and the short chain with a document tag at its side'),
          'qa': ('QA', 'hr_qa', 'the U body, the two cubes, the eyes, the shield emblem with a checkmark on its front and the thin halo ring above its head')}
AGG = "angular armour plating over the U with sharp chamfered edges and short swept-back fins on the cube tops; {arm} armour with {acc} edge lights; the cubes armoured in {cube}; determined narrowed eyes with a confident grin"
AGG_L = "sharp angular {arm} armour plates with {acc} edge lights; armoured boots with {acc} soles"
CALM = "smooth soft rounded surfaces without hard seams, a matte {body} body with {c1} and {c2} cubes, relaxed half-closed calm eyes with a gentle smile, thin soft glowing seam lines"
CALM_L = "smooth soft rounded surfaces in matte {body}; white shoes with a {c1} sole"
RECOL = "EXACTLY the same shapes, details and face as Image 2, nothing added or removed; only the colours change, muted and serious, no pastel: {cols}"
SKINS = {  # prefix: hero, name, body look, limb look
    'sk_trc_sapphire': ('trc', "САПФИР — the same design, only another colouring: serious and deep",
        RECOL.format(cols="the body deep navy-graphite (#232c3a) with steel-blue (#5c7da6) edge highlights, both cubes deep sapphire blue (#2350b8) with a lighter blue top, the orbit ring and its nodes cold silver-white (#dfe8f2) with a sapphire glow"),
        "the same design as Image 3, only recoloured: graphite (#2b3340) with steel-blue highlights and sapphire (#2350b8) lights; shoes silver-white with a sapphire light"),
    'sk_trc_still': ('trc', "ТИШИНА — a calm, soft variant",
        CALM.format(body="pale sage-grey (#9fb5ad)", c1="soft mint (#a8ead6)", c2="pearl white (#eef3f0)") + "; the orbit ring a soft thin line with three softly glowing pearl nodes",
        CALM_L.format(body="pale sage-grey (#9fb5ad)", c1="soft mint (#a8ead6)")),
    'sk_trc_intercept': ('trc', "ПЕРЕХВАТ — an aggressive armoured variant",
        AGG.format(arm="dark gunmetal (#262a33)", acc="electric violet (#8f5bff)", cube="gunmetal with an electric violet front plate") + "; the orbit ring becomes a sharp segmented ring with three angular violet nodes like targeting markers",
        AGG_L.format(arm="dark gunmetal (#262a33)", acc="electric violet (#8f5bff)")),
    'sk_ser_cobalt': ('ser', "КОБАЛЬТ — the same design, only another colouring: serious and cold",
        RECOL.format(cols="the body dark graphite (#262d36) with steel edge highlights, both cubes cobalt blue (#2a5fd6) with ice-blue windows, the code panel marks ice blue (#9fe0ff), the side scanners graphite with cobalt lights"),
        "the same design as Image 3, only recoloured: dark graphite (#262d36) with steel highlights and cobalt (#2a5fd6) lights; shoes steel-white with a cobalt light"),
    'sk_ser_cloud': ('ser', "ОБЛАКО — a calm, soft variant",
        CALM.format(body="pale blue-grey (#a9b8cc)", c1="soft sky blue (#a6d4ff)", c2="cloud white (#f0f4f8)") + "; the code panel soft and rounded with gently glowing sky-blue marks",
        CALM_L.format(body="pale blue-grey (#a9b8cc)", c1="soft sky blue (#a6d4ff)")),
    'sk_ser_breach': ('ser', "ВЗЛОМ — an aggressive armoured hacker variant",
        AGG.format(arm="near-black graphite (#1d2126)", acc="toxic neon green (#39ff88)", cube="black with a neon green front plate") + "; the code panel shows sharp neon green glyph squares, the side scanners become angular with green lenses",
        AGG_L.format(arm="near-black graphite (#1d2126)", acc="toxic neon green (#39ff88)")),
    'sk_ba_platinum': ('ba', "ПЛАТИНА — the same design, only another colouring: serious and premium",
        RECOL.format(cols="the body slate graphite (#2c333c) with platinum (#cfd6dd) edge highlights, both cubes brushed platinum silver (#c3cbd3) with a darker steel side, the chart panel bars cold teal (#5fd6d0), the chain and the tag platinum"),
        "the same design as Image 3, only recoloured: slate graphite (#2c333c) with platinum (#cfd6dd) cuffs and highlights and teal (#5fd6d0) lights; shoes platinum-white with a teal light"),
    'sk_ba_consult': ('ba', "КОНСУЛЬТАНТ — a calm, soft variant",
        CALM.format(body="soft warm grey (#b3b0a8)", c1="soft teal (#8fd8cf)", c2="sand beige (#e6d7b8)") + "; the chart panel soft and rounded with gentle teal bars, the chain and tag soft sand",
        CALM_L.format(body="soft warm grey (#b3b0a8)", c1="soft teal (#8fd8cf)")),
    'sk_ba_deadline': ('ba', "ДЕДЛАЙН — an aggressive armoured variant",
        AGG.format(arm="dark gunmetal (#2a2d33)", acc="crimson red (#ff3355)", cube="gunmetal with a crimson front plate") + "; the chart panel shows sharp crimson bars rising like an alarm, the chain heavier with an angular metal tag",
        AGG_L.format(arm="dark gunmetal (#2a2d33)", acc="crimson red (#ff3355)")),
    'sk_qa_onyx': ('qa', "ОНИКС — the same design, only another colouring: serious and sharp",
        RECOL.format(cols="the body glossy onyx black (#14181d) with cool grey edge highlights, both cubes pure white (#f2f5f7) with a pale grey side, the shield emblem and the light strips mint (#5ef0c0), the halo ring white with a mint glow"),
        "the same design as Image 3, only recoloured: glossy onyx black (#14181d) with cool grey highlights and mint (#5ef0c0) lights; shoes white with a mint light"),
    'sk_qa_sandbox': ('qa', "ПЕСОЧНИЦА — a calm, soft variant",
        CALM.format(body="soft powder blue (#a9bfd6)", c1="cream white (#f4efe3)", c2="soft sky blue (#b6dcff)") + "; the shield emblem soft and rounded, the halo a soft glowing cream ring",
        CALM_L.format(body="soft powder blue (#a9bfd6)", c1="soft sky blue (#b6dcff)")),
    'sk_qa_crash': ('qa', "КРАШ-ТЕСТ — an aggressive armoured variant",
        AGG.format(arm="black graphite (#1c1f24)", acc="hazard yellow (#ffd400)", cube="black with yellow and black hazard stripes on the front plate") + "; the shield emblem angular with a hazard yellow check, the halo ring a sharp yellow segmented ring",
        AGG_L.format(arm="black graphite (#1c1f24)", acc="hazard yellow (#ffd400)")),
}
FINISH = """Line and finish: crisp clean vector-like linework, one even thin dark navy outline (#0b1622) around every shape, smooth flat cel shading with one shadow tone and one highlight tone, NO grain, NO texture, NO noise, NO wobbly or blobby edges.
Constraints: one single part, centred, nothing else on the canvas, no text, no letters, no numbers, no ground, no shadow, no glow, transparent background, not cut by the canvas edge."""
SIZE = {'body': (1536, 1024), 'leg': (1024, 1536), 'foot': (1536, 1024), 'arm': (1024, 1536)}
PART = {'leg': "ONE LEG: perfectly straight and vertical, a plain rounded hip cap at the top (no ball joint), a thin knee band in the middle, the ankle end at the bottom, NO foot",
        'foot': "ONE SHOE, seen from the side, the toe pointing RIGHT, the ankle opening at the top",
        'arm': "ONE ARM: perfectly straight and vertical, a round shoulder joint at the top on the arm's centre line, the upper arm and forearm in one straight line (NO bend), a thin cuff at the wrist, the white mitten hand directly below, centred"}

def schematic(src, out, size, fill=0.62):
    # the part's silhouette as a flat grey shape with a dark outline on a light ground, centred, filling `fill` of the canvas
    from PIL import Image, ImageFilter, ImageChops
    im = Image.open(src).convert('RGBA'); a = im.split()[3].point(lambda v: 255 if v > 100 else 0); bb = a.getbbox(); a = a.crop(bb)
    W, H = size; k = min(W * fill / a.width, H * fill / a.height); a = a.resize((max(1, int(a.width * k)), max(1, int(a.height * k))), Image.LANCZOS).point(lambda v: 255 if v > 127 else 0)
    from PIL import ImageDraw                                                    # fill holes inside the silhouette (only the outside stays empty)
    pad = Image.new('L', (a.width + 2, a.height + 2), 0); pad.paste(a, (1, 1)); ImageDraw.floodfill(pad, (0, 0), 128)
    a = pad.crop((1, 1, a.width + 1, a.height + 1)).point(lambda v: 0 if v == 128 else 255)
    canvas = Image.new('RGB', size, (233, 237, 240)); x, y = (W - a.width) // 2, (H - a.height) // 2
    canvas.paste((150, 160, 171), (x, y), a)
    grown = a.filter(ImageFilter.MaxFilter(11)); ring = ImageChops.subtract(grown, a)
    canvas.paste((22, 30, 40), (x, y), ring); canvas.save(out)

jobs = []
if phase == 'schem':
    for h, (hn, base, keep) in HEROES.items():
        for part, size in SIZE.items():
            schematic(f'art/gen/{base}_{part}.png', f'art/refs/schem_{h}_{part}.png', size, 0.72 if part == 'body' else 0.8)
    print('schematics -> art/refs'); sys.exit()
for n, (h, name, look, limbs) in SKINS.items():
    if only and not any(n.startswith(o) for o in only): continue
    hn, base, keep = HEROES[h]
    if phase == 'body':
        p = f"""Use case: ONE part — the BODY — of a hero SKIN for cut-out rig animation in a top-down 3/4 survivors-like game set inside a dark cyberpunk datacenter.
Image 1 is a SCHEMATIC of this part: a flat grey silhouette with a dark outline. Fill EXACTLY this outline: the same silhouette, the same size and position on the canvas, the same proportions. It shows no details.
Image 2 is the base hero {hn}'s body: keep its design — {keep} — so the skin is clearly the same character.
Skin: {name}: {look}.
Draw ONLY the body: no legs, no arms, the hip and shoulder areas closed and complete, facing the viewer.
{FINISH}"""
        open(f'art/prompts/{n}_body.txt', 'w', encoding='utf-8').write(p)
        jobs.append({'name': f'{n}_bodyonly', 'prompt': f'art/prompts/{n}_body.txt', 'size': 'x'.join(map(str, SIZE['body'])), 'alpha': 'native', 'no_style_ref': True,
                     'ref': [f'art/refs/schem_{h}_body.png=SCHEMATIC: the exact silhouette, size and position to fill',
                             f'art/gen/{base}_body.png=the base hero body: the design to keep']})
    else:
        for part in ('leg', 'foot', 'arm'):
            p = f"""Use case: ONE part of a hero SKIN for cut-out rig animation in a top-down 3/4 survivors-like game.
Image 1 is a SCHEMATIC of this part: a flat grey silhouette with a dark outline. Fill EXACTLY this outline: the same shape, pose, size and position, the same proportions. It shows no details.
Image 2 is the skin's body: match its colours, materials, light colour and style exactly, so the part belongs to it.
Image 3 is the base hero {hn}'s part: the design of the part (joints, bands, cuffs, the shoe's shape).
Skin: {name}: {limbs}.
Draw {PART[part]}.
{FINISH}"""
            open(f'art/prompts/{n}_{part}.txt', 'w', encoding='utf-8').write(p)
            jobs.append({'name': f'{n}_{part}only', 'prompt': f'art/prompts/{n}_{part}.txt', 'size': 'x'.join(map(str, SIZE[part])), 'alpha': 'native', 'no_style_ref': True,
                         'ref': [f'art/refs/schem_{h}_{part}.png=SCHEMATIC: the exact shape, pose and position to fill',
                                 f'art/gen/{n}_bodyonly.png=the skin body: colours, materials and style to match',
                                 f'art/gen/{base}_{part}.png=the base hero part: the design of the part']})
out = f'art/jobs_v24_{phase}.json'
json.dump(jobs, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(jobs), 'jobs ->', out)
