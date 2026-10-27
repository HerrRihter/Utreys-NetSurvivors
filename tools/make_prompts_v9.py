# Round 9 (2026-10-25): the rest of the original roster in the character style (run with art/style_bible_chars.txt swapped in).
# Image 2 = the original sprite (study/orig), Image 3 = the Mars sheet as a sibling. Writes art/prompts/*.txt and art/jobs_v9.json.
import json, os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
SIB = 'art/gen/mars_sheet.png=sibling enemy already in the game: match its line weight, proportions, limb style and level of detail'
LIMBS = """Draw the SAME character split into separate parts, front 3/4 view, all on one canvas:
- top row, centred: the BODY alone, with NO legs and NO arms (closed and complete where limbs attach), facing the viewer;
- bottom row, left to right, each part drawn straight and vertical, complete:
  1) ONE LEG: a single straight stubby leg (thigh and shin in one piece, a slight knee crease), hip end at the top, ankle at the bottom, NO foot, colour {limb};
  2) ONE FOOT: a single chunky cartoon shoe seen from the side, toe pointing right, colour {foot};
  3) ONE ARM: a single straight arm hanging down, shoulder end at the top, a round mitten hand at the bottom, colour {limb} with a {foot} hand.
Composition: every part separate with very wide empty gaps (at least 80 px), nothing touching or overlapping, nothing cut by the canvas edge.
Constraints: no text, no letters, no logos, no numbers, no ground, no shadow, no glow."""
HEAD = """Use case: a character PART SHEET for cut-out rig animation in a top-down 3/4 survivors-like game set inside a cyberpunk datacenter.
Image 1 is the style reference only (line, shading, palette, light); do not copy its subjects.
Image 2 is the ORIGINAL DESIGN of this enemy from the game this project continues: match its outer shape, frame and colour scheme closely so players recognise it.
Image 3 is a sibling enemy already in the game: match its line weight, proportions and limb style, but make this one clearly its own character.
Subject: {subj}
{face}
"""
EMB = "The game prints the original emblem onto the body itself: put two simple cartoon eyes near the TOP edge of the face and leave the middle and lower part as ONE plain flat area in the plate's background colour, no letters, no logo, no mouth there."
jobs = []
def put(name, orig, subj, limb, foot, face=EMB, body_only=False, ref2=SIB):
    txt = HEAD.format(subj=subj, face=face) + (LIMBS.format(limb=limb, foot=foot) if not body_only else
          "Draw ONE object only, centred, front 3/4 view, filling most of the canvas, empty margin on all sides.\nConstraints: no text, no letters, no logos, no numbers, no ground, no shadow, no glow.")
    open(f'art/prompts/{name}.txt', 'w', encoding='utf-8').write(txt)
    jobs.append({'name': name, 'prompt': f'art/prompts/{name}.txt', 'size': '1536x1024', 'alpha': 'native', 'ref': [f'study/orig/{orig}.png=original design of this enemy: match its outer shape and colours', ref2]})
put('mond_sheet', 'mondelez', "the Mondelez client: a wide purple oval plate with a lilac rim and a pink smile-arc at its bottom edge (like Image 2), a candy-wrapper twist on each side; hyperactive and sugary.", 'deep purple', 'pink')
put('prog_sheet', 'progress', "the Progress (FrutoNyanya) client: a pale green-grey round baby-food jar lid shape with a green rim and a green leaf on top (like Image 2), a little spoon tucked on its side; cheerful.", 'leaf green', 'pale green')
put('royal_sheet', 'royal_canin', "the Royal Canin client: a pale grey-green oval plate with a thick red rim and a red crown on top (like Image 2), two floppy dog-ear flaps on its sides; proud.", 'crimson', 'red')
put('cherk_sheet', 'cherkizovo', "the Cherkizovo client: a crimson shield-shaped plate with a cream-pink rim pointing down (like Image 2), heavy butcher-block build, two short horns; brutish.", 'dark crimson', 'cream')
put('pg_sheet', 'procter_gamble', "the P&G client: a big round royal-blue disc with a light-blue inner arc rim (like Image 2), a soap-bubble ring floating around its top; calm protector.", 'navy', 'light blue')
put('petfood_sheet', 'mars_petfood', "the Mars Petfood client: a round deep-blue disc with a cyan rim (like Image 2), a cyan paw-print badge area at the bottom left blank, a little pet-bowl helmet on top; scrappy.", 'deep blue', 'cyan')
put('logq_sheet', 'log_query', "the Log Query: a living terminal window: a dark violet-framed rectangular console window with a dark screen, a big magnifying glass held up at its lower right corner (like Image 2), slow and heavily plated.",
    'dark violet', 'violet', face="Put two narrow cartoon eyes on the upper part of the screen; the rest of the screen stays plain dark, no text lines.")
put('desk_sheet', 'pepsi_desk', "the Pepsi service desk: a stationary blue support counter with a red stripe and a tall monitor on a stand above it (like Image 2), the monitor screen plain dark blue, a little ticket printer on the counter, a red alarm beacon on top of the monitor; it is a building, it has no legs and no arms.",
    '', '', face="Give the monitor two angry cartoon eyes; no text, no letters.", body_only=True)
put('batch_sheet', 'batch_accounting', "the Batch Accounting BOSS: a huge round creature made of many glued red-white-blue client spheres (like Image 2), an angry face in the middle sphere, a ledger book clamped on its top; it is three times as big as a normal enemy.",
    'navy', 'red', face="The face: big angry eyes and a jagged mouth on the central sphere; no letters.", ref2='art/gen/boss_sheet.png=sibling boss already in the game: match its line, proportions and limb style')
json.dump(jobs, open('art/jobs_v9.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(jobs), 'jobs')
