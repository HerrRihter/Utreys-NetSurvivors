# Round 2 prompts (user notes 2026-10-25): foes redrawn after the original utreys-survivors sprites (study/orig/*.png as Image 2),
# and datacenter set pieces with no park elements. Writes art/prompts/*.txt and art/jobs_v2.json for gen.py.
import json, os
os.chdir(os.path.join(os.path.dirname(__file__), '..', 'art', 'prompts'))

FOE = """Use case: a character PART SHEET for cut-out rig animation in a top-down 3/4 survivors-like game set inside a datacenter at night.
Image 1 is the style reference only (line, shading, palette, light); do not copy its subjects.
Image 2 is the ORIGINAL DESIGN of this enemy from the game this project continues: match its shape, silhouette, proportions, colour scheme and the layout of its parts closely, so players recognise it at a glance; only re-render it in the style of Image 1 (chunky cel shading, warm brown ink outline, grain) and give it a simple cartoon face.
Subject: {subj}
Do not copy any lettering, words or wordmarks from Image 2: where Image 2 has letters, keep the plate or area as a plain shape in the same colours.
Draw the SAME character split into separate parts, front 3/4 view, all on one canvas:
- top row, centred: the BODY alone, with NO legs and NO arms (closed and complete where limbs attach), facing the viewer;
- bottom row, left to right, each part drawn straight and vertical, complete:
  1) ONE LEG: a single straight stubby leg (thigh and shin in one piece, a slight knee crease in the middle), hip end at the top, ankle at the bottom, NO foot, colour {limb};
  2) ONE FOOT: a single chunky cartoon shoe seen from the side, toe pointing right, colour {foot};
  3) ONE ARM: a single straight arm hanging down, shoulder end at the top, a round mitten hand at the bottom, colour {limb} with a {foot} hand.
Composition: every part separate with very wide empty gaps (at least 80 px) between parts, nothing touching or overlapping, nothing cut by the canvas edge.
Constraints: no text, no letters, no numbers, no ground, no shadow, no glow."""
FOES = {
    'node': ('l3', "the L3 gateway server node: an upright dark green-black server box with a thick bright green frame, a row of three green LED squares along the top and a green status bar under them, two cartoon eyes where the label was.", 'dark green', 'bright green'),
    'panel': ('grafana_filter', "the Grafana filter panel: a square dark dashboard panel with a thick orange frame, a big orange filter-funnel shape filling its upper half and a yellow sparkline below it, two cartoon eyes on the panel.", 'dark slate', 'orange'),
    'orb': ('pepsi', "the client sphere: a round ball with a red upper half, a royal blue lower half, a slanted white band across the middle and a thin dark blue rim, two cartoon eyes on the blue half.", 'dark blue', 'white'),
    'keg': ('inbev', "the tanker client plate: a heavy square maroon block with a thick gold frame inside a dark rim, a plain maroon centre (no letters) with two stern cartoon eyes.", 'dark maroon', 'gold'),
    'boss': ('critical_incident', "the Critical Incident boss: a huge creature made of client emblems glued together like its original: a navy oval with gold waves, several red-white-blue spheres, a purple oval plate, a maroon square plate with a gold frame and a beige oval with a brown ring, overlapping into one big body, with an angry face (big eyes, jagged teeth) in the middle and a red alarm siren on top.", 'dark maroon', 'navy'),
}
jobs = []
def put(name, text, size, ref=None, alpha='native'):
    open(name + '.txt', 'w', encoding='utf-8').write(text)
    j = {'name': name, 'prompt': f'art/prompts/{name}.txt', 'size': size, 'alpha': alpha}
    if ref: j['ref'] = ref
    jobs.append(j)

for k, (orig, subj, limb, foot) in FOES.items():
    put(f'{k}_sheet', FOE.format(subj=subj, limb=limb, foot=foot), '1536x1024', [f'study/orig/{orig}.png=original design of this enemy: match its shape and colours'])
put('bug_sheet', """Use case: a creature PART SHEET for cut-out rig animation in a top-down 3/4 survivors-like game set inside a datacenter at night.
Image 1 is the style reference only (line, shading, palette, light); do not copy its subjects.
Image 2 is the ORIGINAL DESIGN of this enemy (an import bug): a dark teal-black square box with a thick violet frame; match its shape and colours closely, re-rendered in the style of Image 1.
Subject: the import bug as a living box-shaped bug: the dark teal-black box with the thick violet frame, front 3/4 view, two short violet antennae on top and two angry cartoon eyes on its front (no letters).
Parts on one canvas:
- left, large: the BODY (the box with antennae and eyes) with NO legs;
- right: ONE LEG drawn straight and vertical: a thin violet insect leg in one piece with a joint in the middle, root at the top, a small pointed tip at the bottom.
Composition: the two parts far apart with a very wide empty gap, nothing touching the canvas edge.
Constraints: no text, no letters, no ground, no shadow, no glow.""", '1536x1024', ['study/orig/bug_import.png=original design of this enemy: match its shape and colours'])
DC = "Use case: a large SET PIECE for a top-down 3/4 survivors-like game inside a datacenter at night. Image 1 is the style reference only (line, shading, palette, light); this is a datacenter, nothing from an amusement park (no stripes, no awnings, no canopies, no carnival bulbs).\n"
put('core', DC + """Subject: the network core: a square raised metal platform with four tall black core switch cabinets back to back in a 2 by 2 block, thick bundles of blue and yellow fibre cables rising from the cabinet tops into an overhead cable ladder frame on four posts, small coloured status LED dots, a yellow-black hazard edge on the platform. Seen from the game's 3/4 angle (top and front visible).
Composition: the single object centred, filling most of the canvas, empty margin on all sides.
Constraints: no text, no logos, no floor, no ground shadow, no glow.""", '1536x1024')
put('cage', DC + """Subject: a network cage room: a tall rectangular enclosure of dark steel posts and wire-mesh walls, a mesh door at the front, inside it a warm-lit row of server racks with blinking dots and cable bundles, a flat steel roof frame with a cable tray on top. Seen from the game's 3/4 angle, front facing the viewer.
Composition: the single object centred, filling most of the canvas height, empty margin on all sides.
Constraints: no text, no signs, no logos, no floor, no ground shadow, no glow.""", '1024x1536')
put('props_c_sheet', """Use case: a PROP KIT sheet for a top-down 3/4 survivors-like game set inside a datacenter at night (props stand on the floor).
Image 1 is the style reference only (line, shading, palette, light); do not copy its subjects.
Match the characters' look: chunky simplified cartoon shapes, big quiet surfaces, a thick even dark warm-brown ink outline (#261215), front-and-top 3/4 view, matte cel shading with grain.
Draw these separate props in one row, left to right, all on one shared invisible ground line:
1) a big CRAC precision air-conditioning unit: a wide tall pale grey cabinet with large front grilles and two round fan vents on top;
2) a floor-standing cable tray end: a short yellow cable ladder on two posts with cable bundles draped over it;
3) a red fire-suppression gas cylinder rack holding two tall red cylinders;
4) a short black network switch cabinet, waist high, with a row of tiny green port lights.
LEDs are drawn unlit-neutral (coloured dots), not glowing.
Composition: very wide empty gaps (at least 90 px) between props, nothing touching or overlapping, nothing cut by the canvas edge.
Constraints: no text, no letters, no logos, no floor, no ground shadow, no glow.""", '1536x1024')
json.dump(jobs, open('../jobs_v2.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(jobs), 'jobs')
