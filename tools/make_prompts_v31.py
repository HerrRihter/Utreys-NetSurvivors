# Round 31 (docs/PLAN-CLOUD-SAVE-31-10.md, stage 4): the achievements' badges. One picture per meaning, not per achievement: a series
# (Выживание 1–4 …) shares one and its rank is the frame the code draws; the evolutions, the bosses and the heroes take the pictures
# the game already has (live/scene.js, achArt). One request per icon (parallel Codex jobs swap outputs: run with --jobs 1); Image 1 =
# the approved icon set. Writes art/prompts/ach_*.txt and art/jobs_v31.json (only the names given, or all).
#   python3 tools/make_prompts_v31.py [name ...]
import json, os, sys
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
STYLE = """Use case: ONE achievement badge picture for the achievements screen of a top-down survivors-like game set inside a dark cyberpunk datacenter.
Image 1 is the approved icon set of this game: match its style exactly — chunky readable objects in dark graphite and navy metal with glowing flat light-cyan (#9ff7ff) parts, one even dark navy outline (#0b1622), flat cel shading, crisp clean edges.
Subject: {subj}
It must look clearly different from every icon in Image 1: it is an award, a little more symbolic and iconic than an item.
Composition: one single object or a tight group, centred, filling about 75% of the canvas, readable at 64 px; transparent background.
Constraints: no text, no letters, no numbers, no frame, no medal ribbon, no round badge or card behind it, no ground, no drop shadow."""
# name: (the achievements that use it, the subject)
BADGES = {
    # the series (the rank is the frame)
    'ach_surv':   ('surv_*', "uptime: a dark graphite server rack unit with a long glowing light-cyan heartbeat pulse line running steadily across its front"),
    'ach_kills':  ('kills_*', "defeated glitches: a dark graphite bug-shaped glitch creature cracking apart into small square pixel shards under a glowing light-cyan targeting reticle"),
    'ach_runs':   ('runs_*', "night shifts: a dark graphite staff access card on a short lanyard with a glowing light-cyan crescent moon and a barcode-like stripe of bars"),
    'ach_wins':   ('win_1, wins_*', "a won shift: a chunky dark graphite trophy cup with a glowing light-cyan check mark on its front and two small handles"),
    'ach_bosses': ('bosses_*', "a closed incident: a big dark graphite warning beacon lamp, switched off, with a glowing light-cyan closed padlock in front of it"),
    'ach_cast':   ('cast_*', "the ability: a dark graphite square key cap seen from above, pressed down, with a glowing light-cyan lightning burst coming out of it (no letter on the key)"),
    'ach_lvl':    ('lvl_*', "levelling up: a dark graphite processor chip with three stacked glowing light-cyan upward chevrons rising from it"),
    'ach_codes':  ('codes_*', "marking codes: a neat stack of five dark graphite square tiles, each with a glowing light-cyan data-matrix dot pattern, the top one tilted"),
    # the single ones
    'ach_evo':      ('evo_1', "an evolution: a small dark graphite gear turning into a bigger gear with glowing light-cyan teeth, joined by a bright curved upward arrow"),
    'ach_evo3':     ('evo_3', "an evolutionary leap: three dark graphite gears of growing size in a rising row, connected by one bright light-cyan jumping arc"),
    'ach_calm':     ('calm_180', "not a scratch: a flawless dark graphite shield with a perfect glowing light-cyan rim and one small four-point sparkle, no cracks at all"),
    'ach_noheal':   ('win_noheal', "no snack: a dark graphite coffee cup with a glowing light-cyan prohibition ring across it"),
    'ach_fast':     ('win_fast', "an early release: a dark graphite stopwatch with a glowing light-cyan rocket shooting past it, with short speed lines"),
    'ach_nocast':   ('win_nocast', "without abilities: a dark graphite power button cap whose ring is dark, with its short cable unplugged and the plug lying beside it"),
    'ach_foes':     ('foes_15', "the full catalogue: an open dark graphite binder with a grid of small cards, each card with a different glowing light-cyan bug silhouette"),
    'ach_grad':     ('edu_win', "a graduate: a dark graphite graduation cap with a glowing light-cyan tassel, resting on top of a small chip"),
    'ach_top':      ('edu_top', "a top student: a rolled dark graphite certificate scroll with a big glowing light-cyan five-point star seal on it"),
    'ach_team':     ('heroes_all', "the full team: five small dark graphite helmet visors side by side in a slightly fanned row, each with a glowing light-cyan eye slit"),
    'ach_all':      ('all', "platinum: a faceted crystal core cut like a gem, pale platinum and light-cyan, glowing from inside, set in a small dark graphite claw mount"),
    # the courses with the top grade
    'ach_c_batch':  ('edu_batch_accounting', "batch accounting: a small stack of dark graphite pallets of crates, each crate with a glowing light-cyan batch tag"),
    'ach_c_incid':  ('edu_critical_incidents', "critical incidents: a dark graphite alarm siren lamp with glowing light-cyan alert rays fanning out of its top"),
}
names = sys.argv[1:] or list(BADGES)
jobs = []
for n in names:
    used, subj = BADGES[n]
    open(f'art/prompts/{n}.txt', 'w', encoding='utf-8').write(STYLE.format(subj=subj))
    jobs.append({'name': n + '_gen', 'prompt': f'art/prompts/{n}.txt', 'size': '1024x1024', 'alpha': 'native', 'no_style_ref': True, 'ref': ['art/gen/icons3_sheet.png=approved icon style of this game']})
json.dump(jobs, open('art/jobs_v31.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(jobs), 'jobs -> art/jobs_v31.json')
