# Round 6 prompts (2026-10-25, user notes: objects need more variety): two more prop sheets in style bible v2,
# style ref = the approved props_e_sheet. Writes art/prompts/*.txt and art/jobs_v6.json.
import json, os
os.chdir(os.path.join(os.path.dirname(__file__), '..', 'art', 'prompts'))
REF = ['art/gen/props_e_sheet.png=approved style of this game: match its palette, dark navy outline, cel shading and the flat pale-cyan light details exactly']
HEAD = """Use case: a PROP KIT sheet for a top-down 3/4 survivors-like game set inside a dark cyberpunk datacenter (props stand on the floor).
Image 1 is the approved style of this game: match its near-black blue-teal bodies, flat pale cyan and mint light details, very dark navy outline, chunky cartoon shapes and cel shading exactly.
Draw these separate props in one row, left to right, each showing its top and its front face, all on one shared invisible ground line:
"""
TAIL = """
Light details are drawn as flat pale cyan or mint shapes, not glowing. Warning details only in yellow with black stripes. Nothing warm: no brown, no beige, no orange.
Composition: very wide empty gaps (at least 90 px) between props, nothing touching or overlapping, nothing cut by the canvas edge; every prop has a solid base that stands flat on the ground line.
Constraints: no text, no letters, no numbers, no logos, no floor, no ground shadow, no glow."""
jobs = []
def put(name, items):
    open(name + '.txt', 'w', encoding='utf-8').write(HEAD + items + TAIL)
    jobs.append({'name': name, 'prompt': f'art/prompts/{name}.txt', 'size': '1536x1024', 'alpha': 'native', 'no_style_ref': True, 'ref': REF})
put('props_h_sheet', """1) an open blade server chassis: a waist-high near-black chassis with three thin blade servers pulled half out, pale cyan edges on the blades;
2) a maintenance drone dock: a low round dark charging pad with a pale mint ring and a small dark quad-rotor drone resting on it;
3) a holo-terminal pillar: a slim dark column with a small angled pale cyan screen and a pale cyan ring around its base;
4) a stack of three big fibre-optic cable reels on a low pallet, the cable coils pale cyan and pale mint;
5) a liquid-cooling manifold: a wide low frame of thick dark pipes with two round pumps and pale mint coolant windows.""")
put('props_i_sheet', """1) a battery bank: a wide waist-high dark rack holding rows of big battery modules with pale cyan charge bars and a small yellow-black warning label;
2) a network switch tower: a tall slim stack of dark switches with a waterfall of thin pale cyan and mint patch cables pouring from its front into a loop on the floor;
3) a stack of dark hardware transport cases (two big and one small on top) with pale cyan latches;
4) a short signal mast: a dark tripod base with a slim mast and three small dish antennas with pale cyan centres;
5) a server rack with its front door swung open and one server pulled out on rails, near-black body, pale cyan LED strips.""")
json.dump(jobs, open('../jobs_v6.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(jobs), 'jobs')
