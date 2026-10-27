# Round 17 (plan stage 2): the four other heroes of the original (docs/HEROES.md: every hero is a variant of the Utrace mark —
# coral and teal faces, a navy side — with its own details). Image 1 = the hero sheet (design base), Image 2 = the approved props
# sheet (style). Parts: body, leg, foot, arm (they share Utrace's scanner). Writes art/prompts/hr_*.txt and art/jobs_v17.json.
import json, os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
HEROES = {
    'hr_trc': ("Полная прослеживаемость (Full Traceability)", "mint-teal (#6de2cd)", "a ring orbit of three small glowing link nodes joined by thin lines circling around its top, like a traceability chain"),
    'hr_ser': ("Сериализация (Serialization)", "coral red (#fa5946)", "a flat code panel with rows of small square marks on its front and a small barcode scanner mounted on each side of the body"),
    'hr_ba':  ("БА (Business Analyst)", "warm gold (#f7ce70)", "a small chart panel with bars on its front and a requirement link: a short chain with a document tag hanging from one side"),
    'hr_qa':  ("QA (Quality Assurance)", "mint green (#79edbd)", "a shield emblem with a checkmark on its front and a thin control ring hovering above its head"),
}
HEAD = """Use case: a character PART SHEET for cut-out rig animation in a top-down 3/4 survivors-like game set inside a dark cyberpunk datacenter.
Image 1 is the game's hero Utrace: a living Utrace logo — a navy U-shaped body with two cubes on top (one coral, one teal), big friendly eyes, stubby navy legs, white cartoon shoes and white mitten hands.
Image 2 is the approved style of this game: match its dark navy outline, cel shading and the flat light details.
Draw a SIBLING HERO of the same family: {name}. Same U-shaped body, same proportions, same eyes, same limb style as Image 1, so it is clearly one family,
but recoloured and detailed as its own hero: the two cubes and the trims in {col}; distinguishing feature: {feat}.
Keep the same parts layout as Image 1 but WITHOUT the scanner tool: body on top; below it, left to right: ONE leg (straight, hip at the top, no foot), ONE shoe (side view, toe right), ONE arm (straight, shoulder at the top, a mitten hand at the bottom).
Every part separate with very wide empty gaps, nothing touching or cut by the canvas edge.
Constraints: no text, no letters, no logos other than the body shape itself, no numbers, no ground, no shadow, no glow."""
jobs = []
for n, (name, col, feat) in HEROES.items():
    open(f'art/prompts/{n}.txt', 'w', encoding='utf-8').write(HEAD.format(name=name, col=col, feat=feat))
    jobs.append({'name': f'{n}_sheet', 'prompt': f'art/prompts/{n}.txt', 'size': '1536x1024', 'alpha': 'native', 'no_style_ref': True,
                 'ref': ['art/gen/hero_sheet.png=the hero Utrace: the design base of this sibling hero (body shape, eyes, limbs)',
                         'art/gen/props_e_sheet.png=approved style of this game: outline, cel shading and flat light details']})
json.dump(jobs, open('art/jobs_v17.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(jobs), 'jobs')
