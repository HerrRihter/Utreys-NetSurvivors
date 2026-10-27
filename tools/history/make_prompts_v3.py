# Round 3 prompts (user notes 2026-10-25): more foes after the project's originals (study/orig/*.png as Image 2) with a plain
# emblem area that the game paints with the original client emblem in code, plus cyber datacenter props. Writes art/jobs_v3.json.
import json, os
os.chdir(os.path.join(os.path.dirname(__file__), '..', 'art', 'prompts'))

FOE = """Use case: a character PART SHEET for cut-out rig animation in a top-down 3/4 survivors-like game set inside a cyberpunk datacenter.
Image 1 is the style reference only (line, shading, palette, light); do not copy its subjects.
Image 2 is the ORIGINAL DESIGN of this enemy from the game this project continues: match its outer shape, frame and colour scheme closely so players recognise it.
Subject: {subj}
The game prints the original emblem onto the body itself, so: put two simple cartoon eyes near the TOP edge of the face, and leave the middle and lower part of the face as ONE plain flat area in the background colour, with no letters, no logo, no pattern, no mouth there.
Draw the SAME character split into separate parts, front 3/4 view, all on one canvas:
- top row, centred: the BODY alone, with NO legs and NO arms (closed and complete where limbs attach), facing the viewer;
- bottom row, left to right, each part drawn straight and vertical, complete:
  1) ONE LEG: a single straight stubby leg (thigh and shin in one piece, a slight knee crease in the middle), hip end at the top, ankle at the bottom, NO foot, colour {limb};
  2) ONE FOOT: a single chunky cartoon shoe seen from the side, toe pointing right, colour {foot};
  3) ONE ARM: a single straight arm hanging down, shoulder end at the top, a round mitten hand at the bottom, colour {limb} with a {foot} hand.
Composition: every part separate with very wide empty gaps (at least 80 px) between parts, nothing touching or overlapping, nothing cut by the canvas edge.
Constraints: no text, no letters, no logos, no numbers, no ground, no shadow, no glow."""
FOES = {
    'mars':   ('mars', "the Mars client: a sturdy rectangular red block with a thick bright yellow frame (like Image 2).", 'dark red', 'yellow'),
    'loreal': ('loreal', "the L'Oreal client: an elegant black rectangular plate with a thin pink frame and a small white sparkle star on its top corner (like Image 2).", 'black', 'pink'),
    'multon': ('multon', "the Multon client: a slightly tilted grey-blue pentagon plate with a thick orange edge, a green leaf-shaped blob on its top right and a small orange dot at its lower left (like Image 2); lean and quick-looking.", 'slate blue', 'orange'),
    'baltika': ('baltika', "the Baltika client: a big heavy upright navy-blue oval with a thick gold rim (like Image 2), bulky and tanky.", 'navy', 'gold'),
    'ferrero': ('ferrero', "the Ferrero client: a wide beige-gold oval plate with a brown inner ring and a golden rim (like Image 2), a little lid on top like a chocolate box.", 'brown', 'gold'),
    'vetis':  ('vetis', "the Vetis inspection system: an upright dark green hexagon shield with a mint-green border (like Image 2), official and stern.", 'dark green', 'mint'),
    'bugu':   ('bug_usage', "the usage-report bug: a pink-violet rectangular box with a thick yellow frame (like Image 2) and two short antennae on top.", 'violet', 'yellow'),
    'buga':   ('bug_aggregation', "the aggregation bug: a dark hexagon with a thick orange border (like Image 2), two short antennae on top.", 'dark slate', 'orange'),
    'crpt':   ('crpt', "the CRPT regulator BOSS: a huge yellow hexagon seal with a dark navy inner disc and a thick dark rim (like Image 2), a stamp handle on top, massive and stern; the boss is three times as big as a normal enemy.", 'dark navy', 'yellow'),
}
jobs = []
def put(name, text, size, ref=None, alpha='native'):
    open(name + '.txt', 'w', encoding='utf-8').write(text)
    j = {'name': name, 'prompt': f'art/prompts/{name}.txt', 'size': size, 'alpha': alpha}
    if ref: j['ref'] = ref
    jobs.append(j)
for k, (orig, subj, limb, foot) in FOES.items():
    put(f'{k}_sheet', FOE.format(subj=subj, limb=limb, foot=foot), '1536x1024', [f'study/orig/{orig}.png=original design of this enemy: match its outer shape and colours'])
put('props_d_sheet', """Use case: a PROP KIT sheet for a top-down 3/4 survivors-like game set inside a cyberpunk datacenter (props stand on the floor).
Image 1 is the style reference only (line, shading, palette, light); do not copy its subjects.
Match the characters' look: chunky simplified cartoon shapes, big quiet surfaces, a thick even dark warm-brown ink outline (#261215), front-and-top 3/4 view, matte cel shading with grain.
Draw these separate props in one row, left to right, all on one shared invisible ground line:
1) an ENERGY CELL cabinet: a squat dark battery cabinet with a big round window in front showing a pale cyan crystal power core inside, warning stripes on its base (it can overload and explode);
2) a monitoring desk: a curved dark operator desk with three empty dark monitors on arms above it and a keyboard;
3) a tape library cabinet: a tall dark grey cabinet with a glass front showing rows of small tape cartridges and a robot arm rail;
4) a fibre patch column: a slim tall dark column with dozens of thin colourful fibre cables (cyan, magenta, yellow) hanging in loops down its front.
Screens, LEDs and the power core are drawn unlit-neutral (pale flat colours), not glowing.
Composition: very wide empty gaps (at least 90 px) between props, nothing touching or overlapping, nothing cut by the canvas edge.
Constraints: no text, no letters, no logos, no floor, no ground shadow, no glow.""", '1536x1024')
json.dump(jobs, open('../jobs_v3.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(jobs), 'jobs')
