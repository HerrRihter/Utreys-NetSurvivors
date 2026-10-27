# Round 14 (user chose "redraw" for point 5): the cast repainted in the cyber palette, same designs.
# Environment bible (default ref2game.json), no_style_ref. Image 1 = the approved props sheet (style), Image 2 = the character's
# current sheet (design to keep). Writes art/prompts/<name>_cy.txt and art/jobs_v14.json (only the names given, or all).
#   python3 tools/make_prompts_v14.py [name ...]
import json, os, sys
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
STYLE = 'art/gen/props_e_sheet.png=approved style of this game: match its palette, dark navy outline, cel shading and the flat pale-cyan light details exactly'
# name: (what it is, brand / accent colour words)
CAST = {
    'node':    ('the L3 support engineer: a boxy terminal-screen creature', 'acid green'),
    'panel':   ('the Grafana panel: a small flat dashboard screen creature', 'orange'),
    'orb':     ('the Pepsi client: a round ball creature with a cap', 'red, white and royal blue'),
    'keg':     ('the AB InBev client: a heavy keg-shaped creature with an armoured front plate', 'gold'),
    'mars':    ('the Mars client: a square box creature', 'red and yellow'),
    'loreal':  ('the L’Oreal client: a slim box creature', 'pink and black'),
    'multon':  ('the Multon Partners client: a hexagonal plate creature', 'orange and pale blue'),
    'baltika': ('the Baltika client: a tall oval bottle-cap creature', 'navy and gold'),
    'ferrero': ('the Ferrero client: an oval praline-plate creature', 'gold and brown-gold'),
    'vetis':   ('the VetIS service: a shield-shaped creature', 'teal green and gold'),
    'mond':    ('the Mondelez client: a wide oval candy-wrapper plate creature', 'purple and pink'),
    'prog':    ('the Progress (FrutoNyanya) client: a baby-food jar creature with a leaf', 'leaf green'),
    'royal':   ('the Royal Canin client: an oval plate creature with a crown and dog ears', 'crimson red'),
    'cherk':   ('the Cherkizovo client: a downward shield-shaped butcher creature with horns', 'crimson and cream'),
    'pg':      ('the P&G client: a round disc creature with a bubble halo', 'royal blue and light blue'),
    'petfood': ('the Mars Petfood client: a round disc creature with a pet-bowl helmet', 'deep blue and cyan'),
    'logq':    ('the Log Query: a living terminal window holding a magnifying glass', 'violet'),
    'bugu':    ('the usage-report BUG miniboss', 'its current accent colour'),
    'buga':    ('the aggregation BUG miniboss', 'its current accent colour'),
    'bugl':    ('the logistics BUG miniboss', 'its current accent colour'),
    'bugg':    ('the goods-report BUG miniboss', 'its current accent colour'),
    'crpt':    ('the CRPT boss, a big state-inspector creature', 'its current accent colour'),
    'batch':   ('the Batch Accounting boss: a huge cluster of client spheres with a ledger on top', 'red, white and navy'),
    'boss':    ('the Critical Incident final boss', 'its current accent colour'),
    'bug':     ('the generic BUG: a six-legged beetle-like software bug', 'its current accent colour'),
    'desk':    ('the Pepsi service desk: a stationary support counter with a monitor and a red alarm beacon', 'royal blue and red'),
}
# sheets whose layout differs from body + leg, foot, arm
LAYOUT = {'bug': 'Keep the same parts layout as Image 2 (the body alone on top, ONE leg below it), every part separate with very wide empty gaps.',
          'desk': 'Keep the same layout as Image 2: ONE object, a building with no legs and no arms, centred with empty margins.'}
HEAD = """Use case: a character PART SHEET for cut-out rig animation in a top-down 3/4 survivors-like game set inside a dark cyberpunk datacenter.
Image 1 is the approved style of this game: match its near-black blue-teal bodies, very dark navy outline, chunky cartoon shapes, cel shading and flat light details exactly.
Image 2 is this character as it is in the game now: keep its exact silhouette, proportions, face, parts and their layout on the sheet; only repaint it.
Subject: {what}.
Repaint: the big body surfaces become dark blue-teal plates like the machines in Image 1, but the BRAND COLOURS ({brand}) are mandatory and strong:
a THICK frame in the brand colour all around the main body plate (as thick as in Image 2), brand-coloured stripes or cuffs on every leg, arm and shoe,
and brand-coloured details on the face plate. Together the brand colour covers about a third of what you see. Use exactly these brand colours, saturated
and flat; never replace them with cyan or teal (cyan is reserved for the hero). The character must be recognisable by colour alone from far away.
Keep any plain flat area on the body plain (the game prints the emblem there). Light details are flat colour shapes, not glowing.
{layout}
Constraints: no text, no letters, no logos, no numbers, no ground, no shadow, no glow."""
names = sys.argv[1:] or list(CAST)
jobs = []
for n in names:
    what, brand = CAST[n]
    txt = HEAD.format(what=what, brand=brand, layout=LAYOUT.get(n, 'Keep the same parts layout as Image 2 (body on top; below it, left to right: leg, foot, arm), every part separate with very wide empty gaps.'))
    open(f'art/prompts/{n}_cy.txt', 'w', encoding='utf-8').write(txt)
    jobs.append({'name': f'{n}_sheet', 'prompt': f'art/prompts/{n}_cy.txt', 'size': '1536x1024', 'alpha': 'native', 'no_style_ref': True,
                 'ref': [STYLE, f'art/archive/chars_v1/{n}_sheet.png=this character as it is in the game now: keep its silhouette, face and parts layout']})
json.dump(jobs, open('art/jobs_v14.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(jobs), 'jobs:', ' '.join(names))
