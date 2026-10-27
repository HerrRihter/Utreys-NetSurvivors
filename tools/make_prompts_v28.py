# Round 28: the icons of the defensive items, one request per icon (user's rule: separate requests with concrete references).
# Image 1 = an approved icon sheet (style); the evolution also gets its base icon (Image 2). Writes art/prompts/ic_*.txt, art/jobs_v28.json.
import json, os, sys
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
STYLE = """Use case: ONE item icon for the level-up cards and the HUD of a top-down survivors-like game set inside a dark cyberpunk datacenter.
Image 1 is the approved icon set of this game: match its style exactly — chunky readable objects in dark graphite and navy metal with glowing flat light-cyan (#9ff7ff) parts, one even dark navy outline (#0b1622), flat cel shading, crisp clean edges.
Subject: {subj}
Composition: one single object, centred, filling about 80% of the canvas, readable at 64 px; transparent background.
Constraints: no text, no letters, no numbers, no frame or card behind it, no ground, no drop shadow."""
ICONS = {
    'ic_shield': "a force-field shield: a dark graphite hexagonal emitter ring, with a glowing translucent light-cyan energy shield across it made of small hexagonal cells, a bright rim along its edge",
    'ic_x_shield': "the evolved version of Image 2: a cluster of two overlapping hexagonal force-field shields, one in front of the other, brighter and bigger, with short light-cyan sparks between them; clearly the same item as Image 2, upgraded",
    'ic_firewall': "a network firewall: a short wall of dark graphite bricks with glowing light-cyan seams between them, and a flame-shaped light-cyan glow rising from its top",
    'ic_repair': "self-repair: a dark graphite wrench crossed over a glowing light-cyan plus sign, with a thin light-cyan heartbeat line wrapping around them",
}
jobs = []
for n, subj in ICONS.items():
    open(f'art/prompts/{n}.txt', 'w', encoding='utf-8').write(STYLE.format(subj=subj))
    ref = ['art/gen/icons3_sheet.png=approved icon style of this game']
    if n == 'ic_x_shield': ref.append('art/gen/ic_shield_gen.png=the base item, Отказоустойчивость: its evolution keeps its design')
    jobs.append({'name': n + '_gen', 'prompt': f'art/prompts/{n}.txt', 'size': '1024x1024', 'alpha': 'native', 'no_style_ref': True, 'ref': ref})
only = sys.argv[1:]
if only: jobs = [j for j in jobs if j['name'][:-4] in only]
json.dump(jobs, open('art/jobs_v28.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(jobs), 'jobs')
