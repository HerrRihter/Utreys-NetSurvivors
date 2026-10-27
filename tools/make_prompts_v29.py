# Round 29 (user: "some evolutions and weapons seem to have the same icons"): own icons for the heroes' weapons, their evolutions and the
# E abilities, which borrowed other items' icons. One request per icon (parallel Codex jobs swap outputs: run with --jobs 1); Image 1 =
# the approved icon set, an evolution also gets its base icon (Image 2). Writes art/prompts/ic_*.txt and art/jobs_v29*.json.
#   python3 tools/make_prompts_v29.py base|evo|abil
import json, os, sys
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
STYLE = """Use case: ONE item icon for the level-up cards and the HUD of a top-down survivors-like game set inside a dark cyberpunk datacenter.
Image 1 is the approved icon set of this game: match its style exactly — chunky readable objects in dark graphite and navy metal with glowing flat light-cyan (#9ff7ff) parts, one even dark navy outline (#0b1622), flat cel shading, crisp clean edges.
Subject: {subj}
It must look clearly different from every icon in Image 1.
Composition: one single object, centred, filling about 80% of the canvas, readable at 64 px; transparent background.
Constraints: no text, no letters, no numbers, no frame or card behind it, no ground, no drop shadow."""
EVO = "\nThis is the EVOLVED version of the item in Image 2: keep its design so it is clearly the same item, but stronger and richer: {how}."
BASE = {
    'ic_tchain': "a traceability chain: three glowing light-cyan link nodes (small hexagonal beads) joined by short chain links in dark graphite, in a zigzag, like a chain jumping between targets",
    'ic_packet': "a serialized data packet: a sleek dark graphite capsule-shaped packet with a row of glowing light-cyan square code marks along its side and a bright arrow-shaped nose, flying to the right with short speed lines",
    'ic_req': "a requirements review: a dark graphite clipboard with a glowing light-cyan checklist of three lines with check marks, and a wide fan-shaped light-cyan sweep coming out of its right side",
    'ic_regress': "a regression check: a square scanning frame made of four dark graphite corner brackets with a glowing light-cyan scan line across its middle and a small light-cyan bug silhouette caught in the centre",
}
EVOS = {
    'ic_x_tchain': ('ic_tchain', "the chain loops back into a closed glowing ring of five link nodes with a returning arrow"),
    'ic_x_packet': ('ic_packet', "the packet splits into three smaller packets fanning out from a bright split point"),
    'ic_x_req': ('ic_req', "the clipboard carries a glowing light-cyan star badge for the key client and a small plus sign for healing"),
    'ic_x_regress': ('ic_regress', "the bug in the frame is marked by a glowing light-cyan target crosshair and a bright exclamation-free warning chevron"),
}
ABIL = {
    'ab_overclock': "overclocking: a dark graphite processor chip with glowing light-cyan circuit lines and a bright upward speed arrow with motion streaks rising from it",
    'ab_registry': "a registry: a dark graphite ledger book or database cylinder stack with a glowing light-cyan network of linked nodes spreading out of it",
    'ab_volley': "a volley: a dark graphite round launcher hub with twelve glowing light-cyan packet bolts bursting out from it in every direction",
    'ab_negotiate': "negotiations: two dark graphite robotic hands in a handshake with a glowing light-cyan speech bubble with three dots above them",
    'ab_field': "a regression field: a glowing light-cyan circular zone on the ground with a frozen clock face in its centre and small ice-like hexagon shards",
}
phase = sys.argv[1] if len(sys.argv) > 1 else 'base'
items = {'base': {k: (None, v) for k, v in BASE.items()}, 'evo': {k: (b, EVO.format(how=h)) for k, (b, h) in EVOS.items()}, 'abil': {k: (None, v) for k, v in ABIL.items()}}[phase]
jobs = []
for n, (base, subj) in items.items():
    text = STYLE.format(subj=(BASE[base] if base else subj)) + (subj if base else '')
    open(f'art/prompts/{n}.txt', 'w', encoding='utf-8').write(text)
    ref = ['art/gen/icons3_sheet.png=approved icon style of this game']
    if base: ref.append(f'art/gen/{base}_gen.png=the base item: its evolution keeps its design')
    jobs.append({'name': n + '_gen', 'prompt': f'art/prompts/{n}.txt', 'size': '1024x1024', 'alpha': 'native', 'no_style_ref': True, 'ref': ref})
json.dump(jobs, open(f'art/jobs_v29_{phase}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(jobs), 'jobs ->', f'art/jobs_v29_{phase}.json')
