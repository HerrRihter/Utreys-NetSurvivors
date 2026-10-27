# Round 23 (user: "Utrace and its weapon look over-inflated; everything should be smoother, elegant, crisp lines and outlines; skins
# in different styles: aggressive, calmer, just another colouring"). Phase 'hero': Utrace redrawn in the clean style of its four
# siblings (hr_*_sheet), with a slimmer scanner. Phase 'skins': the Utrace pilot skins, each a full part sheet of the SAME character
# (same silhouette, same rig parts) in its own style, made from the new Utrace sheet. Writes art/prompts/*.txt and art/jobs_v23*.json.
#   python3 tools/make_prompts_v23.py hero|skins
import json, os, sys
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
phase = sys.argv[1] if len(sys.argv) > 1 else 'hero'
LAYOUT = """Draw the character split into separate parts, front 3/4 view, all on one canvas:
- top row, centred: the BODY alone, with NO legs and NO arms (the hip and shoulder areas closed and complete), facing the viewer;
- bottom row, left to right, each part straight and vertical, complete: ONE LEG (hip at the top, ankle at the bottom, NO foot), ONE SHOE (side view, toe pointing right), ONE ARM (shoulder at the top, a mitten hand at the bottom){tool}.
Every part separate with very wide empty gaps (at least 80 px), nothing touching, overlapping or cut by the canvas edge.
Line and finish: crisp clean vector-like linework, one even thin dark navy outline (#0b1622) around every shape, smooth flat cel shading with one soft shadow tone and one highlight tone, NO grain, NO paint texture, NO noise, NO wobbly or blobby edges.
Constraints: no text, no letters, no numbers, no logos other than the body shape itself, no ground, no shadow under the parts, no glow, transparent background."""
TOOL = """, and A HANDHELD BARCODE SCANNER pointing right: slim and sleek, NOT bulky — a long narrow streamlined body about four times as long as it is tall, tapering towards the front, in yellow-orange (#f2a62c) with a graphite (#2a3440) underside and a thin graphite grip angled down at the back, a small red (#ff4a3d) scan window flush at the front tip, crisp bevelled edges"""
jobs = []
if phase == 'hero':
    p = """Use case: a character PART SHEET for cut-out rig animation in a top-down 3/4 survivors-like game set inside a dark cyberpunk datacenter.
Image 1 is a sibling hero of this game in the APPROVED clean style: copy its finish exactly — linework, outline weight, cel shading, the clean tech panel seams, the limb design (jointed navy limbs, white shoes with a small teal light, white mitten hands).
Image 2 is the current hero Utrace, the design to keep: a living Utrace logo, a U-shaped body, the LEFT cube coral red (#ff5a4a), the RIGHT cube teal (#38c8c8), big friendly eyes with a small smile on the navy bowl.
Redraw Utrace as the leader of the family, refined and elegant: a slimmer, cleaner U (not puffy, not inflated): straight crisp sides, a neat rounded bowl, crisp bevelled cube caps with a thin lighter top edge, a few thin panel seams and two small teal light strips on the navy body. Same friendly face, crisp and clean.
Do NOT copy the sibling's own features: NO code panel or grille on the front, NO devices or pods on the sides, NO windows on the cubes. Utrace's front is clean: just the face on a smooth navy bowl.
""" + LAYOUT.format(tool=TOOL)
    open('art/prompts/hero_v2.txt', 'w', encoding='utf-8').write(p)
    jobs.append({'name': 'hero_v2_sheet', 'prompt': 'art/prompts/hero_v2.txt', 'size': '1536x1024', 'alpha': 'native', 'no_style_ref': True,
                 'ref': ['art/gen/hr_ser_sheet.png=a sibling hero in the approved clean style: copy its linework, outline, cel shading and limb design',
                         'art/gen/hero_sheet.png=the current Utrace: keep its design (U body, coral left cube, teal right cube, the face), not its puffy finish']})
    out = 'art/jobs_v23.json'
else:
    SKINS = {
        'sk_utrace_storm': ("ШТУРМ — an aggressive armoured variant", "angular armour plating over the U with sharp chamfered edges and two short swept-back fins on the cube tops; gunmetal (#2b3138) armour with coral red (#ff4a3d) edge lights; the cubes are dark gunmetal with a coral front plate; determined narrowed eyes with a confident grin; the limbs get sharp angular armour cuffs and the shoes become armoured boots with coral soles"),
        'sk_utrace_zen': ("ДЗЕН — a calm, soft variant", "smooth soft rounded surfaces without hard seams, a matte pale lavender-grey body (#8f94b8) with mint (#9fe8cf) and soft lilac (#b9a7ef) cubes, relaxed half-closed calm eyes with a gentle smile, thin soft glowing seam lines; soft rounded limbs in the same lavender-grey, white shoes with a mint sole"),
        'sk_utrace_arctic': ("АРКТИКА — the same design, only another colouring: serious and cold, a polar expedition unit, not a toy", "EXACTLY the same shapes, details, face and limbs as Image 1, nothing added or removed; only the colours change, muted and serious, no pastel: the body cold steel slate (#46525e) with darker graphite shading and thin frost-white (#dfe8ef) edge highlights, the left cube deep glacier blue (#1f6fb8), the right cube frost white (#e6eef5) with a steel-blue side, the light strips cold ice blue (#8fd3ff), the limbs graphite steel, the shoes frost white with a graphite sole and an ice-blue light; the eyes the same, with a calm steady look"),
    }
    # the other four heroes (round 23b, user: "do the other heroes' skins in these styles"): a recolour, a calm and an aggressive one each
    BASE = {'utrace': ('Utrace', 'hero_v2', 'the U body, the two cubes on top, the eyes and the limb design'),
            'trc': ('Полная прослеживаемость', 'hr_trc', 'the U body, the two cubes, the eyes, the limb design and its ring orbit of three small link nodes around its top'),
            'ser': ('Сериализация', 'hr_ser', 'the U body, the two cubes with their small windows, the eyes, the limb design, the code panel with square marks on its front and the small scanner on each side'),
            'ba': ('БА', 'hr_ba', 'the U body, the two cubes, the eyes, the limb design, the bar chart panel on its front and the short chain with a document tag at its side'),
            'qa': ('QA', 'hr_qa', 'the U body, the two cubes, the eyes, the limb design, the shield emblem with a checkmark on its front and the thin halo ring above its head')}
    AGG = "angular armour plating over the U with sharp chamfered edges and short swept-back fins on the cube tops; {arm} armour with {acc} edge lights; the cubes armoured in {cube}; determined narrowed eyes with a confident grin; the limbs get sharp angular armour cuffs and the shoes become armoured boots with {acc} soles"
    CALM = "smooth soft rounded surfaces without hard seams, a matte {body} body with {c1} and {c2} cubes, relaxed half-closed calm eyes with a gentle smile, thin soft glowing seam lines; soft rounded limbs in the same {body}, white shoes with a {c1} sole"
    RECOL = "EXACTLY the same shapes, details, face and limbs as Image 1, nothing added or removed; only the colours change, muted and serious, no pastel: {cols}; the eyes the same, with a calm steady look"
    MORE = {
        'sk_trc_sapphire': ('trc', "САПФИР — the same design, only another colouring: serious and deep", RECOL.format(cols="the body deep navy-graphite (#232c3a) with steel-blue (#5c7da6) edge highlights, both cubes deep sapphire blue (#2350b8) with a lighter blue top, the orbit ring and its nodes cold silver-white (#dfe8f2) with a sapphire glow, the limbs graphite, the shoes silver-white with a sapphire light")),
        'sk_trc_still': ('trc', "ТИШИНА — a calm, soft variant", CALM.format(body="pale sage-grey (#9fb5ad)", c1="soft mint (#a8ead6)", c2="pearl white (#eef3f0)") + "; the orbit ring a soft thin line with three softly glowing pearl nodes"),
        'sk_trc_intercept': ('trc', "ПЕРЕХВАТ — an aggressive armoured variant", AGG.format(arm="dark gunmetal (#262a33)", acc="electric violet (#8f5bff)", cube="gunmetal with an electric violet front plate") + "; the orbit ring becomes a sharp segmented ring with three angular violet nodes like targeting markers"),
        'sk_ser_cobalt': ('ser', "КОБАЛЬТ — the same design, only another colouring: serious and cold", RECOL.format(cols="the body dark graphite (#262d36) with steel edge highlights, both cubes cobalt blue (#2a5fd6) with ice-blue windows, the code panel marks ice blue (#9fe0ff), the side scanners graphite with cobalt lights, the limbs graphite, the shoes steel-white with a cobalt light")),
        'sk_ser_cloud': ('ser', "ОБЛАКО — a calm, soft variant", CALM.format(body="pale blue-grey (#a9b8cc)", c1="soft sky blue (#a6d4ff)", c2="cloud white (#f0f4f8)") + "; the code panel soft and rounded with gently glowing sky-blue marks"),
        'sk_ser_breach': ('ser', "ВЗЛОМ — an aggressive armoured hacker variant", AGG.format(arm="near-black graphite (#1d2126)", acc="toxic neon green (#39ff88)", cube="black with a neon green front plate") + "; the code panel shows sharp neon green glyph squares, the side scanners become angular with green lenses"),
        'sk_ba_platinum': ('ba', "ПЛАТИНА — the same design, only another colouring: serious and premium", RECOL.format(cols="the body slate graphite (#2c333c) with platinum (#cfd6dd) edge highlights, both cubes brushed platinum silver (#c3cbd3) with a darker steel side, the chart panel bars cold teal (#5fd6d0), the chain and the tag platinum, the limbs graphite, the shoes platinum-white with a teal light")),
        'sk_ba_consult': ('ba', "КОНСУЛЬТАНТ — a calm, soft variant", CALM.format(body="soft warm grey (#b3b0a8)", c1="soft teal (#8fd8cf)", c2="sand beige (#e6d7b8)") + "; the chart panel soft and rounded with gentle teal bars, the chain and tag soft sand"),
        'sk_ba_deadline': ('ba', "ДЕДЛАЙН — an aggressive armoured variant", AGG.format(arm="dark gunmetal (#2a2d33)", acc="crimson red (#ff3355)", cube="gunmetal with a crimson front plate") + "; the chart panel shows sharp crimson bars rising like an alarm, the chain heavier with an angular metal tag"),
        'sk_qa_onyx': ('qa', "ОНИКС — the same design, only another colouring: serious and sharp", RECOL.format(cols="the body glossy onyx black (#14181d) with cool grey edge highlights, both cubes pure white (#f2f5f7) with a pale grey side, the shield emblem and the light strips mint (#5ef0c0), the halo ring white with a mint glow, the limbs onyx black, the shoes white with a mint light")),
        'sk_qa_sandbox': ('qa', "ПЕСОЧНИЦА — a calm, soft variant", CALM.format(body="soft powder blue (#a9bfd6)", c1="cream white (#f4efe3)", c2="soft sky blue (#b6dcff)") + "; the shield emblem soft and rounded, the halo a soft glowing cream ring"),
        'sk_qa_crash': ('qa', "КРАШ-ТЕСТ — an aggressive armoured variant", AGG.format(arm="black graphite (#1c1f24)", acc="hazard yellow (#ffd400)", cube="black with yellow and black hazard stripes on the front plate") + "; the shield emblem angular with a hazard yellow check, the halo ring a sharp yellow segmented ring"),
    }
    items = [(n, 'utrace', name, look) for n, (name, look) in SKINS.items()] + [(n, h, name, look) for n, (h, name, look) in MORE.items()]
    for n, h, name, look in items:
        hn, base, keep = BASE[h]
        p = f"""Use case: a SKIN for the hero of a top-down 3/4 survivors-like game set inside a dark cyberpunk datacenter: a character PART SHEET for cut-out rig animation.
Image 1 is the hero {hn} (the base design and the exact parts layout): keep its silhouette, proportions and {keep}, so the skin is clearly the same character and fits the same rig.
Skin: {name}: {look}.
""" + LAYOUT.format(tool='')
        open(f'art/prompts/{n}.txt', 'w', encoding='utf-8').write(p)
        jobs.append({'name': f'{n}_sheet', 'prompt': f'art/prompts/{n}.txt', 'size': '1536x1024', 'alpha': 'native', 'no_style_ref': True,
                     'ref': [f'art/gen/{base}_sheet.png=the hero {hn}: the base design, the parts layout and the approved clean finish']})
    if len(sys.argv) > 2: jobs = [j for j in jobs if any(j['name'].startswith(a) for a in sys.argv[2:])]
    out = 'art/jobs_v23_skins.json'
if phase == 'arms':
    jobs = []
    for n in (sys.argv[2:] or ['hero_v2', 'sk_utrace_storm', 'sk_utrace_zen', 'sk_utrace_arctic']):
        p = '''Use case: ONE limb part for cut-out rig animation in a top-down 3/4 survivors-like game.
Image 1 is the character's part sheet: copy the colours, materials, panel details and the clean finish of ITS ARM exactly.
Draw ONLY that arm, as a rig part: perfectly STRAIGHT and VERTICAL, centred on the canvas — a round shoulder joint at the top, sitting exactly on the arm's centre line; the upper arm and the forearm in ONE straight vertical line, NO bend at the elbow, NO angle, NO lean; a thin cuff at the wrist; the white mitten hand directly below the cuff, centred on the same axis, seen from the side, not wider than about one and a half times the arm.
The arm is long and slim; the shoulder joint is about as wide as the arm.
Line and finish: crisp clean vector-like linework, one even thin dark navy outline (#0b1622), smooth flat cel shading, no grain, no texture.
Constraints: one single part, nothing else, no text, no shadow, no glow, transparent background, not cut by the canvas edge.'''
        open(f'art/prompts/{n}_arm.txt', 'w', encoding='utf-8').write(p)
        jobs.append({'name': f'{n}_armfix', 'prompt': f'art/prompts/{n}_arm.txt', 'size': '1024x1024', 'alpha': 'native', 'no_style_ref': True,
                     'ref': [f'art/gen/{n}_sheet.png=the character part sheet: copy its arm (colours, details, finish)']})
    out = 'art/jobs_v23_arms.json'
if phase == 'legs':
    jobs = []
    for n in (sys.argv[2:] or ['hero_v2', 'sk_utrace_storm', 'sk_utrace_zen', 'sk_utrace_arctic', 'hr_trc', 'hr_ser', 'hr_ba', 'hr_qa']):
        p = """Use case: ONE limb part for cut-out rig animation in a top-down 3/4 survivors-like game.
Image 1 is the character's part sheet: copy the colours, materials, panel details and the clean finish of ITS LEG exactly.
Draw ONLY that leg, as a rig part: perfectly STRAIGHT and VERTICAL, centred on the canvas — the hip end at the top is a plain rounded cap exactly as wide as the leg and centred on it (NO ball joint, NO side light or disc, nothing sticking out sideways); the thigh and the shin in ONE straight vertical line with a thin knee band in the middle, NO bend, NO angle; the ankle end at the bottom, NO foot, NO shoe.
An even width from top to bottom, slim; the leg is about four times as long as it is wide.
Line and finish: crisp clean vector-like linework, one even thin dark navy outline (#0b1622), smooth flat cel shading, no grain, no texture.
Constraints: one single part, nothing else, no text, no shadow, no glow, transparent background, not cut by the canvas edge."""
        open(f'art/prompts/{n}_leg.txt', 'w', encoding='utf-8').write(p)
        jobs.append({'name': f'{n}_legfix', 'prompt': f'art/prompts/{n}_leg.txt', 'size': '1024x1024', 'alpha': 'native', 'no_style_ref': True,
                     'ref': [f'art/gen/{n}_sheet.png=the character part sheet: copy its leg (colours, details, finish)']})
    for n in ['hr_trc', 'hr_ser', 'hr_ba', 'hr_qa']:
        if os.path.exists(f'art/gen/{n}_armfix.png'): continue
        p = open('art/prompts/hero_v2_arm.txt', encoding='utf-8').read()
        open(f'art/prompts/{n}_arm.txt', 'w', encoding='utf-8').write(p)
        jobs.append({'name': f'{n}_armfix', 'prompt': f'art/prompts/{n}_arm.txt', 'size': '1024x1024', 'alpha': 'native', 'no_style_ref': True,
                     'ref': [f'art/gen/{n}_sheet.png=the character part sheet: copy its arm (colours, details, finish)']})
    out = 'art/jobs_v23_limbs.json'
json.dump(jobs, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(jobs), 'jobs ->', out)
