# Round 5 prompts (2026-10-25, user approved the cyber sample): the rest of the environment and the icons in style bible v2.
# Style ref = the approved props_e_sheet (not the warm park reference). Writes art/prompts/*.txt and art/jobs_v5.json.
import json, os
os.chdir(os.path.join(os.path.dirname(__file__), '..', 'art', 'prompts'))
REF = ['art/gen/props_e_sheet.png=approved style of this game: match its palette, dark navy outline, cel shading and the flat pale-cyan light details exactly']
HEAD = """Use case: {use} for a top-down 3/4 survivors-like game set inside a dark cyberpunk datacenter.
Image 1 is the approved style of this game: match its near-black blue-teal bodies, flat pale cyan and mint light details, very dark navy outline, chunky cartoon shapes and cel shading exactly.
"""
TAIL = """Light details are drawn as flat pale cyan or mint shapes, not glowing. Warning details only in yellow with black stripes. Nothing warm: no brown, no beige, no orange, no warm interior light.
Composition: {comp}
Constraints: no text, no letters, no numbers, no logos, no floor, no ground shadow, no glow."""
jobs = []
def put(name, use, body, comp, size):
    open(name + '.txt', 'w', encoding='utf-8').write(HEAD.format(use=use) + body + '\n' + TAIL.format(comp=comp))
    jobs.append({'name': name, 'prompt': f'art/prompts/{name}.txt', 'size': size, 'alpha': 'native', 'no_style_ref': True, 'ref': REF})
ONE = 'the single object centred, filling most of the canvas, empty margin on all sides.'
ROW = 'separate props in one row on one shared invisible ground line, very wide empty gaps (at least 90 px) between them, nothing touching, nothing cut by the canvas edge.'
put('core', 'a large SET PIECE (the network core, the landmark of the central plaza)',
    "Subject: the network core: a square raised dark platform with a pale cyan light strip around its edge and a yellow-black hazard edge on one side, four tall near-black core switch cabinets back to back in a 2 by 2 block with vertical pale cyan LED strips, thick bundles of dark fibre cables with pale cyan and mint cable ends rising into an overhead dark cable-ladder frame on four posts. Seen from the game's 3/4 angle.",
    ONE, '1536x1024')
put('cage', 'a large SET PIECE (a network cage room)',
    "Subject: a tall rectangular enclosure of near-black steel posts and dark wire-mesh walls, a mesh door at the front with a small pale cyan lock light, inside it a row of near-black server racks with pale cyan LED strips and tiny mint dots (cool light only), a flat dark roof frame with a cable tray on top. Seen from the game's 3/4 angle, front facing the viewer.",
    'the single object centred, filling most of the canvas height, empty margin on all sides.', '1024x1536')
put('props_f_sheet', 'a PROP KIT sheet (props stand on the floor)',
    """Draw these separate props in one row, left to right, each showing its top and its front face:
1) a small round dark power distribution bin (PDU) with a pale cyan ring on top and a small yellow-black hazard plate on its front;
2) a floor-standing cable tray end: a short dark cable ladder on two posts with dark cable bundles draped over it, pale cyan cable ends;
3) a fire-suppression rack holding two tall dark cylinders with pale mint bands and a small yellow-black warning stripe;
4) a short waist-high near-black network switch cabinet with a row of tiny pale mint port lights;
5) a parked server cart: a rounded rolling cart with a dark shell, a pale cyan edge strip and a tray of drives.""", ROW, '1536x1024')
put('props_g_sheet', 'a PROP KIT sheet (props stand on the floor)',
    """Draw these separate props in one row, left to right, each showing its top and its front face:
1) a monitoring desk: a curved near-black operator desk with three monitors on arms above it, the screens flat pale cyan with simple dark chart lines, a keyboard;
2) a tape library cabinet: a tall near-black cabinet with a dark glass front showing rows of small tape cartridges with pale mint labels and a robot arm rail;
3) a fibre patch column: a slim tall near-black column with dozens of thin fibre cables hanging in loops down its front, the cables pale cyan and pale mint;
4) a second parked server cart, same design as a usual cart, with a pale mint edge strip and two stacked servers on it.""", ROW, '1536x1024')
put('icons2_sheet', 'an ICON SET for the HUD (weapon and skill icons), bold readable silhouettes',
    """Draw 12 separate icons in a 4 by 3 grid, each centred in its cell, left to right, top to bottom, every icon a dark near-black object with pale cyan / mint light details:
1) a handheld barcode scanner firing a fan of pale cyan scan lines; 2) a small round scanner drone on a pale cyan orbit ring; 3) a pale cyan data packet arrow with a pixel tail; 4) a dark square plate with a pale cyan DataMatrix dot pattern (a mine);
5) pale mint ping signal waves around a dot; 6) a pale cyan circular retry arrow; 7) a dark memory chip with pale mint heat waves; 8) a pale cyan heart outline with a small power plug;
9) a dark sneaker with pale cyan speed lines; 10) a dark horseshoe magnet with pale cyan tips; 11) a pale cyan lightning bolt; 12) a dark stopwatch with a pale cyan face.
Then a bottom row of 5 pickups: a mint crystal gem, a cyan crystal gem, a pale violet crystal gem, a dark data ingot with a pale cyan edge, a dark first-aid box with a pale mint cross.""",
    'every item separate with very wide empty gaps, nothing touching, no frames around icons.', '1536x1024')
json.dump(jobs, open('../jobs_v5.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(jobs), 'jobs')
