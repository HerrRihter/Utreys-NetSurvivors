# Writes every art prompt (art/prompts/*.txt) and the batch file art/jobs_all.json for gen.py.
import json, os
os.chdir(os.path.join(os.path.dirname(__file__), '..', 'art', 'prompts'))

CHAR = """Use case: a character PART SHEET for cut-out rig animation in a top-down 3/4 survivors-like game set inside a datacenter at night.
Image 1 is the style reference only (line, shading, palette, light); do not copy its subjects.
Subject: {subj}
Draw the SAME character split into separate parts, front 3/4 view, all on one canvas:
- top row, centred: the BODY alone, with NO legs and NO arms (the hip and shoulder areas are closed and complete), facing the viewer;
- bottom row, left to right, each part drawn straight and vertical, complete:
  1) ONE LEG: a single straight stubby leg (thigh and shin in one piece, a slight knee crease in the middle), hip end at the top, ankle at the bottom, NO foot, colour {limb};
  2) ONE FOOT: a single chunky cartoon shoe seen from the side, toe pointing right, colour {foot};
  3) ONE ARM: a single straight arm hanging down, shoulder end at the top, a round mitten hand at the bottom, colour {limb} with a {foot} hand;{extra}
Composition: every part separate with very wide empty gaps (at least 80 px) between parts, nothing touching or overlapping, nothing cut by the canvas edge.
Constraints: no text, no letters, no logos, no numbers on any part, no ground, no shadow, no glow."""
ACT = {
    'hero': ("the mascot of a software company called Utrace: a chunky cartoon letter U standing upright; the left prong is coral red, the right prong is teal cyan, "
             "the rounded bowl at the bottom is dark navy; the prong tops are lighter flat caps; a simple friendly cartoon face (two big white eyes with black pupils "
             "and a small smile) sits on the front of the navy bowl.", 'dark navy', 'off-white',
             "\n  4) A HANDHELD BARCODE SCANNER GUN pointing right: yellow-orange body, a red scan window at the right end, a dark grey grip hanging below the back of the body."),
    'node': ("a living network server box: a dark green metal cube-shaped server with three small bright green LED dots on top of its front, a vent slot line, "
             "and a simple cartoon face (two eyes, small flat mouth) on its front.", 'dark green', 'teal green', ''),
    'panel': ("a living monitoring dashboard panel: a small monitor with a thick orange frame, a dark screen showing an orange filter-funnel icon and a mint-green "
              "sparkline, a short grey neck stand under it, and two cartoon eyes on the screen.", 'slate grey', 'orange', ''),
    'orb': ("a living client robot ball: a riveted metal ball painted matte dark blue, one plain red metal belt with bolts around its middle, a small hatch on top, "
            "and a simple cartoon face with two eyes below the belt; worn paint, cel tones with grain.", 'dark blue', 'off-white', ''),
    'keg': ("a living tanker client: a squat gold metal beer keg with two dark maroon bands, a maroon blank plate on the front, a lid on top, and a stern cartoon face "
            "with two eyes on the plate.", 'dark brown', 'maroon', ''),
    'boss': ("a huge boss monster called Critical Incident: a big rounded dark red blob-golem glued together from client objects (a blue ball, a gold keg, a red ball, "
             "purple and green chunks) poking out of its body, a red alarm siren lamp on its head, and an angry cartoon face with big eyes and jagged white teeth.",
             'dark red-brown', 'dark purple', ''),
}
jobs = []
def put(name, text, size, alpha='native'):
    open(name + '.txt', 'w', encoding='utf-8').write(text)
    jobs.append({'name': name, 'prompt': f'art/prompts/{name}.txt', 'size': size, 'alpha': alpha})

for k, (subj, limb, foot, extra) in ACT.items():
    put(f'{k}_sheet', CHAR.format(subj=subj, limb=limb, foot=foot, extra=extra), '1536x1024')
put('bug_sheet', """Use case: a creature PART SHEET for cut-out rig animation in a top-down 3/4 survivors-like game set inside a datacenter at night.
Image 1 is the style reference only (line, shading, palette, light); do not copy its subjects.
Subject: a software bug as a big cartoon beetle, seen from above at the game's 3/4 angle: an oval purple shell with a centre seam and three pale violet spots, a dark head at the top with two cartoon eyes and two short antennae.
Parts on one canvas:
- left, large: the BODY (shell, head and antennae) with NO legs at all;
- right: ONE LEG drawn straight and vertical: a thin dark purple insect leg in one piece with a joint in the middle, root at the top, a small pointed tip at the bottom.
Composition: the two parts far apart with a very wide empty gap, nothing touching the canvas edge.
Constraints: no text, no ground, no shadow, no glow.""", '1536x1024')
PROP = """Use case: a PROP KIT sheet for a top-down 3/4 survivors-like game set inside a datacenter at night (props stand on the floor).
Image 1 is the style reference only (line, shading, palette, light); do not copy its subjects.
Draw these separate props in one row, left to right, all on one shared invisible ground line, each showing its top and its front face:
{items}
Match the CHARACTERS' look, not a technical drawing: chunky simplified cartoon shapes, big quiet surfaces, a thick even dark warm-brown ink outline (#261215) around every prop, front-and-top 3/4 view (no visible side face), matte cel shading with grain.
Lamps and LEDs are drawn unlit-neutral (coloured dots and pale glass), not glowing.
Composition: very wide empty gaps (at least 90 px) between props, nothing touching or overlapping, nothing cut by the canvas edge.
Constraints: no text, no letters, no logos, no floor, no ground shadow, no glow."""
put('props_a_sheet', PROP.format(items="""1) a tall server rack cabinet: dark slate metal, perforated front door, rows of server units with tiny blue, amber and green LED dots, a bundle of black cables hanging over the top;
2) a second server rack of the same size with a glass front door, servers visible inside, a few loose cables;
3) a short network terminal kiosk: a small monitor on a stand on top of a box base;
4) a tall slim floor lamp pillar: a dark metal post with a lamp head and a pale glass bulb on top."""), '1536x1024')
put('props_b_sheet', PROP.format(items="""1) a low wide UPS battery cabinet (like a bench), slate grey with vertical battery slots and one small green dot;
2) a small round grey PDU power bin with a yellow hazard plate on its front;
3) a red pressurised coolant gas tank cylinder with a blank white label band and a valve on top;
4) a parked server cart: a rounded rolling cart with a light blue shell and a dark inset tray of drives;
5) a short section of dark metal safety railing fence."""), '1536x1024')
put('router', """Use case: a large SET PIECE for a top-down 3/4 survivors-like game inside a datacenter at night; it replaces the reference's carousel.
Image 1 is the style reference: match its style, and take its carousel as the model for the shape and size, re-themed.
Subject: a big round core network router built like a carousel: a wide circular dark metal base platform, a ring of ten coloured network modules (blue, amber, green, red, pink) on silver posts around the edge, a thick central core column with cable bundles, a red-and-white striped conical canopy on top with a row of small unlit bulbs along its rim. Seen from the game's 3/4 angle.
Composition: the single object centred, filling most of the canvas, empty margin on all sides.
Constraints: no text, no logos, no floor, no ground shadow, no glow.""", '1536x1024')
put('cage', """Use case: a large SET PIECE for a top-down 3/4 survivors-like game inside a datacenter at night; it replaces the reference's snack stand.
Image 1 is the style reference: match its style, and take its snack stand as the model for the shape, re-themed.
Subject: a server cage booth: a tall dark metal booth with a red-and-white striped awning on top, a wide front opening behind a wire mesh grille, inside a warm-lit room with server racks, a counter at the bottom. Seen from the game's 3/4 angle, front facing the viewer.
Composition: the single object centred, filling most of the canvas height, empty margin on all sides.
Constraints: no text, no letters, no signs with writing, no logos, no floor, no ground shadow, no glow.""", '1024x1536')
put('ground_tex', """Use case: a seamless tileable FLOOR MATERIAL texture for a survivors-like game inside a datacenter at night.
Image 1 is the style reference only (painted cel style, palette, grain); ignore its view: this texture is seen straight from above.
Subject: a datacenter raised floor: a 4 by 4 grid of square slate blue-grey floor panels with thin dark seams and small corner screws; a few panels are perforated vent tiles with rows of round holes; light scuffs and scratches; quiet, low contrast, desaturated night blue.
Composition: the texture fills the whole square canvas edge to edge and tiles seamlessly; flat even lighting.
Constraints: no objects, no cables, no text, no vignette, no shadows, no perspective.""", '1024x1024', 'none')
put('icons_sheet', """Use case: an ICON SET for the HUD of a survivors-like game about a datacenter (weapon and skill icons), in the style of Image 1 (ink outline, cel shading), bold readable silhouettes.
Draw 12 separate icons in a 4 by 3 grid, each centred in its cell, left to right, top to bottom:
1) a yellow handheld barcode scanner firing a fan of red laser lines; 2) a small blue round scanner drone on an orbit ring; 3) a violet glowing data packet arrow with a tail; 4) a dark square plate with a white DataMatrix dot pattern (a mine);
5) green ping signal waves around a dot; 6) an orange circular retry arrow; 7) an orange-hot rounded memory chip with heat; 8) a red heart with a small power plug;
9) a white sneaker with blue speed lines; 10) a red horseshoe magnet; 11) a yellow lightning bolt; 12) a white stopwatch.
Then a bottom row of 5 pickups: a green crystal gem, a blue crystal gem, a pink crystal gem, a gold bar ingot, a white first-aid box with a red cross.
Composition: every item separate with very wide empty gaps, nothing touching.
Constraints: no text, no letters, no numbers, no frames around icons, no glow.""", '1536x1024')
json.dump(jobs, open('../jobs_all.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(jobs), 'jobs')
