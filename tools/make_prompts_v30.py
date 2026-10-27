# Round 30 (docs/PLAN-FEEDBACK-27-10.md, stage 5): the «Дата-центр» map gets three bosses of its own, new designs (not repaints).
# Environment bible (default ref2game.json), no_style_ref. Image 1 = the approved props sheet (style), Image 2 = the current final
# boss's sheet (parts layout and scale only). Writes art/prompts/<name>_v30.txt and art/jobs_v30.json (only the names given, or all).
#   python3 tools/make_prompts_v30.py [name ...]
import json, os, sys
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
STYLE = 'art/gen/props_e_sheet.png=approved style of this game: match its palette, dark navy outline, cel shading and the flat pale-cyan light details exactly'
LAYOUT_REF = 'art/gen/boss_sheet.png=layout and scale reference only: copy the parts layout (body on top; below it leg, foot, arm) and the chunky proportions, NOT its design or colours'
# name: (what it is, accent colour words)
CAST = {
    'repl':   ('«Replication Failure», a boss: a wide twin-hulled server creature split vertically down the middle into two mirrored halves '
               'held together by a cracked glowing data bridge; each half has one big round eye, so together they read as one face that is tearing apart; '
               'small sync arrows that point away from each other on the shoulders', 'magenta and violet'),
    'rstorm': ('«Retry Storm», a boss: a tall hunched dispatcher creature with a round body made of stacked ring segments like a coiled queue, '
               'a big circular retry-arrow crest on top, angry slit eyes on a small face plate, and a row of small lamp sockets along its back '
               'like a queue of pending requests', 'amber and hot orange'),
    'outage': ('«Datacenter Outage», the final boss: a huge blacked-out server cabinet creature, taller than wide, its rack doors cracked open, '
               'dead dark drive bays, a thick torn power cable hanging like a tail with a broken plug, two dim warning-lamp eyes and a hazard-stripe jaw; '
               'it must look heavier and more menacing than any other character', 'deep warning red and hazard yellow'),
}
HEAD = """Use case: a character PART SHEET for cut-out rig animation in a top-down 3/4 survivors-like game set inside a dark cyberpunk datacenter.
Image 1 is the approved style of this game: match its near-black blue-teal bodies, very dark navy outline, chunky cartoon shapes, cel shading and flat light details exactly.
Image 2 shows only how the parts are laid out on a sheet and how chunky a boss is: copy that layout and scale, not its design.
Subject: {what}. It is a brand-new character, clearly different in silhouette from Image 2.
Colours: the big body surfaces are dark blue-teal plates like the machines in Image 1; the ACCENT COLOURS ({accent}) are mandatory and strong: a thick accent frame
around the main body plate, accent stripes or cuffs on every leg, arm and shoe, accent details on the face. Together the accent covers about a third of what you see,
saturated and flat; never cyan or teal (cyan is reserved for the hero). The character must be recognisable by colour and silhouette alone from far away.
Light details are flat colour shapes, not glowing.
Layout: body on top; below it, left to right: ONE leg, ONE foot (shoe), ONE arm, every part separate with very wide empty gaps, all on a plain empty background.
Constraints: no text, no letters, no logos, no numbers, no ground, no shadow, no glow."""
names = sys.argv[1:] or list(CAST)
jobs = []
for n in names:
    what, accent = CAST[n]
    open(f'art/prompts/{n}_v30.txt', 'w', encoding='utf-8').write(HEAD.format(what=what, accent=accent))
    jobs.append({'name': f'{n}_sheet', 'prompt': f'art/prompts/{n}_v30.txt', 'size': '1536x1024', 'alpha': 'native', 'no_style_ref': True, 'ref': [STYLE, LAYOUT_REF]})
json.dump(jobs, open('art/jobs_v30.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(jobs), 'jobs:', ' '.join(names))
