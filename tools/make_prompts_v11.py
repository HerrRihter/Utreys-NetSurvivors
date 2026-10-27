# Round 11 (2026-10-25): icons for the new weapons, passives, the capsule, the sentry server and the 13 evolutions.
# Environment bible (default ref2game.json), no_style_ref; Image 1 = the approved props sheet, Image 2 = the current icon sheet.
import json, os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
REF = ['art/gen/props_e_sheet.png=approved style of this game: match its palette, dark navy outline, cel shading and the flat pale-cyan light details exactly',
       'art/gen/icons2_sheet.png=the icon set already in the game: match its size, chunky silhouettes, line weight and level of detail']
HEAD = """Use case: an ICON SET for the HUD of a top-down 3/4 survivors-like game set inside a dark cyberpunk datacenter.
Image 1 is the approved style of this game: match its near-black blue-teal bodies, flat pale cyan and mint light details, very dark navy outline, chunky cartoon shapes and cel shading exactly.
Image 2 is the icon set already in the game: the new icons must sit next to these as one family.
"""
TAIL = """Light details are drawn as flat pale cyan or mint shapes, not glowing. Nothing warm: no brown, no beige, no orange.
Composition: every item separate with very wide empty gaps, nothing touching, no frames or backgrounds behind icons.
Constraints: no text, no letters, no numbers, no logos, no floor, no ground shadow, no glow."""
A = HEAD + """Draw 11 separate items in rows, each centred in its own cell, left to right, top to bottom:
row 1: 1) a burst of small pale cyan square data packets flying in a stream to the right; 2) a forked pale cyan lightning bolt jumping between three small dark round network nodes;
       3) a dark storm cloud made of network cables with two pale cyan lightning bolts striking down; 4) a small dark server cabinet with a short pale cyan gun barrel on top (a sentry turret icon);
row 2: 5) a pale mint snowflake in front of a dark coolant nozzle spraying a cone of frost; 6) a dark round grenade with a pale cyan branching fork symbol splitting into three small grenades;
       7) four pale cyan corner brackets expanding outward from a dot (area); 8) a dark data cube with two pale cyan ghost copies behind it (replication);
row 3: 9) a dark hourglass with pale mint sand (duration); 10) an upgrade capsule: a chunky dark hexagonal container with glowing-looking pale mint seams and a mint plus sign on its lid, drawn bigger than the icons;
       11) a SENTRY SERVER for the game floor: a short dark server cabinet on three stubby legs with a small rotating pale cyan turret head on top, seen in 3/4 view, drawn twice as tall as an icon.
""" + TAIL
B = HEAD + """These are EVOLVED weapons: each is the upgraded, grander form of an existing icon, bigger and more ornate, with extra pale mint accents and a small mint four-point star in its top-right corner.
Draw 13 separate icons in rows of five, five, three, each centred in its own cell, left to right, top to bottom:
1) a barcode scanner firing two fans of scan lines, forward and backward; 2) a ring of six small round scanner drones on a wide orbit; 3) a swarm of three data packet arrows with pixel tails;
4) a ring of five DataMatrix mine plates; 5) a heart outline with ping signal waves around it;
6) eight circular retry arrows bursting outward in all directions; 7) a memory chip inside a big ring of heat waves; 8) a wide fan of many small square data packets;
9) a web of lightning connecting many network nodes; 10) a network-cable storm cloud with many lightning bolts;
11) three small server-turret cabinets side by side; 12) a big frozen ice crystal with a snowflake inside; 13) a grenade bursting into many small grenades that burst again.
""" + TAIL
jobs = []
for name, txt in [('icons3_sheet', A), ('icons4_sheet', B)]:
    open(f'art/prompts/{name}.txt', 'w', encoding='utf-8').write(txt)
    jobs.append({'name': name, 'prompt': f'art/prompts/{name}.txt', 'size': '1536x1024', 'alpha': 'native', 'no_style_ref': True, 'ref': REF})
json.dump(jobs, open('art/jobs_v11.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(jobs), 'jobs')
