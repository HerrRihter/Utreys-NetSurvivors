# Cuts generated sheets into the asset names the scene reads, retires their placeholders and re-runs prep.
#   python3 tools/ingest.py [sheet ...]        (default: every sheet present in art/gen)
# Sheet layouts: characters = body on top, then leg, foot, arm (, scanner) left to right; prop sheets left to right.
# Only the CURRENT source of every asset is listed (superseded sheets were removed; their history is in git).
import os, subprocess, sys
SK = os.path.expanduser('~/.claude/skills/ref2game/scripts')
SHEETS = {
    # round 23: the sheets draw the arms and legs bent (legs: a hip ball off to the side); every limb is redrawn alone, straight
    # round 23: the sheets draw the arm bent with the shoulder off its axis (the rig hangs it crooked); every arm is redrawn alone, straight
    # (tools/make_prompts_v23.py arms), and the sheet's own arm is sliced as '_bentarm' and dropped
    'hero_v2_armfix': (['hero_arm'], 'x'), 'sk_utrace_storm_armfix': (['sk_utrace_storm_arm'], 'x'), 'sk_utrace_zen_armfix': (['sk_utrace_zen_arm'], 'x'), 'sk_utrace_arctic_armfix': (['sk_utrace_arctic_arm'], 'x'),
    'hero_v2_legfix': (['hero_leg'], 'x'), 'sk_utrace_storm_legfix': (['sk_utrace_storm_leg'], 'x'), 'sk_utrace_zen_legfix': (['sk_utrace_zen_leg'], 'x'), 'sk_utrace_arctic_legfix': (['sk_utrace_arctic_leg'], 'x'),
    'hr_trc_legfix': (['hr_trc_leg'], 'x'), 'hr_ser_legfix': (['hr_ser_leg'], 'x'), 'hr_ba_legfix': (['hr_ba_leg'], 'x'), 'hr_qa_legfix': (['hr_qa_leg'], 'x'),
    'hr_trc_armfix': (['hr_trc_arm'], 'x'), 'hr_ser_armfix': (['hr_ser_arm'], 'x'), 'hr_ba_armfix': (['hr_ba_arm'], 'x'), 'hr_qa_armfix': (['hr_qa_arm'], 'x'),
    # round 28: the defensive items' icons, one generated image each
    'ic_shield_gen': (['ic_shield'], 'x', ['--dilate', '18']), 'ic_x_shield_gen': (['ic_x_shield'], 'x', ['--dilate', '18']), 'ic_firewall_gen': (['ic_firewall'], 'x', ['--dilate', '18']), 'ic_repair_gen': (['ic_repair'], 'x', ['--dilate', '18']),
    # round 29: own icons for the heroes' weapons, their evolutions and the E abilities, one generated image each
    **{f'{n}_gen': ([n], 'x', ['--dilate', '18']) for n in ['ic_tchain', 'ic_packet', 'ic_req', 'ic_regress', 'ic_x_tchain', 'ic_x_packet', 'ic_x_req', 'ic_x_regress',
                                                         'ab_overclock', 'ab_registry', 'ab_volley', 'ab_negotiate', 'ab_field']},
    # round 24: the other heroes' skins, every part generated alone against a schematic (tools/make_prompts_v24.py)
    'sk_trc_sapphire_bodyonly': (['sk_trc_sapphire_body'], 'x', ['--dilate', '12']), 'sk_trc_sapphire_legonly': (['sk_trc_sapphire_leg'], 'x'), 'sk_trc_sapphire_footonly': (['sk_trc_sapphire_foot'], 'x'), 'sk_trc_sapphire_armonly': (['sk_trc_sapphire_arm'], 'x'),
    'sk_trc_still_bodyonly': (['sk_trc_still_body'], 'x', ['--dilate', '12']), 'sk_trc_still_legonly': (['sk_trc_still_leg'], 'x'), 'sk_trc_still_footonly': (['sk_trc_still_foot'], 'x'), 'sk_trc_still_armonly': (['sk_trc_still_arm'], 'x'),
    'sk_trc_intercept_bodyonly': (['sk_trc_intercept_body'], 'x', ['--dilate', '12']), 'sk_trc_intercept_legonly': (['sk_trc_intercept_leg'], 'x'), 'sk_trc_intercept_footonly': (['sk_trc_intercept_foot'], 'x'), 'sk_trc_intercept_armonly': (['sk_trc_intercept_arm'], 'x'),
    'sk_ser_cobalt_bodyonly': (['sk_ser_cobalt_body'], 'x', ['--dilate', '12']), 'sk_ser_cobalt_legonly': (['sk_ser_cobalt_leg'], 'x'), 'sk_ser_cobalt_footonly': (['sk_ser_cobalt_foot'], 'x'), 'sk_ser_cobalt_armonly': (['sk_ser_cobalt_arm'], 'x'),
    'sk_ser_cloud_bodyonly': (['sk_ser_cloud_body'], 'x', ['--dilate', '12']), 'sk_ser_cloud_legonly': (['sk_ser_cloud_leg'], 'x'), 'sk_ser_cloud_footonly': (['sk_ser_cloud_foot'], 'x'), 'sk_ser_cloud_armonly': (['sk_ser_cloud_arm'], 'x'),
    'sk_ser_breach_bodyonly': (['sk_ser_breach_body'], 'x', ['--dilate', '12']), 'sk_ser_breach_legonly': (['sk_ser_breach_leg'], 'x'), 'sk_ser_breach_footonly': (['sk_ser_breach_foot'], 'x'), 'sk_ser_breach_armonly': (['sk_ser_breach_arm'], 'x'),
    'sk_ba_platinum_bodyonly': (['sk_ba_platinum_body'], 'x', ['--dilate', '12']), 'sk_ba_platinum_legonly': (['sk_ba_platinum_leg'], 'x'), 'sk_ba_platinum_footonly': (['sk_ba_platinum_foot'], 'x'), 'sk_ba_platinum_armonly': (['sk_ba_platinum_arm'], 'x'),
    'sk_ba_consult_bodyonly': (['sk_ba_consult_body'], 'x', ['--dilate', '12']), 'sk_ba_consult_legonly': (['sk_ba_consult_leg'], 'x'), 'sk_ba_consult_footonly': (['sk_ba_consult_foot'], 'x'), 'sk_ba_consult_armonly': (['sk_ba_consult_arm'], 'x'),
    'sk_ba_deadline_bodyonly': (['sk_ba_deadline_body'], 'x', ['--dilate', '12']), 'sk_ba_deadline_legonly': (['sk_ba_deadline_leg'], 'x'), 'sk_ba_deadline_footonly': (['sk_ba_deadline_foot'], 'x'), 'sk_ba_deadline_armonly': (['sk_ba_deadline_arm'], 'x'),
    'sk_qa_onyx_bodyonly': (['sk_qa_onyx_body'], 'x', ['--dilate', '12']), 'sk_qa_onyx_legonly': (['sk_qa_onyx_leg'], 'x'), 'sk_qa_onyx_footonly': (['sk_qa_onyx_foot'], 'x'), 'sk_qa_onyx_armonly': (['sk_qa_onyx_arm'], 'x'),
    'sk_qa_sandbox_bodyonly': (['sk_qa_sandbox_body'], 'x', ['--dilate', '12']), 'sk_qa_sandbox_legonly': (['sk_qa_sandbox_leg'], 'x'), 'sk_qa_sandbox_footonly': (['sk_qa_sandbox_foot'], 'x'), 'sk_qa_sandbox_armonly': (['sk_qa_sandbox_arm'], 'x'),
    'sk_qa_crash_bodyonly': (['sk_qa_crash_body'], 'x', ['--dilate', '12']), 'sk_qa_crash_legonly': (['sk_qa_crash_leg'], 'x'), 'sk_qa_crash_footonly': (['sk_qa_crash_foot'], 'x'), 'sk_qa_crash_armonly': (['sk_qa_crash_arm'], 'x'),
    # round 23: hero skins = full part sheets of the same character (they share the hero's scanner)
    'sk_utrace_storm_sheet': (['sk_utrace_storm_body', '_bentleg', 'sk_utrace_storm_foot', '_bentarm'], 'reading'),
    'sk_utrace_zen_sheet': (['sk_utrace_zen_body', '_bentleg', 'sk_utrace_zen_foot', '_bentarm'], 'reading'),
    'sk_utrace_arctic_sheet': (['sk_utrace_arctic_body', '_bentleg', 'sk_utrace_arctic_foot', '_bentarm'], 'reading'),
    'hero_v2_sheet': (['hero_body', '_bentleg', 'hero_foot', '_bentarm', 'scanner'], 'reading'),   # round 23: Utrace redrawn clean
    'node_sheet': (['node_body', 'node_leg', 'node_foot', 'node_arm'], 'reading'),
    'panel_sheet': (['panel_body', 'panel_leg', 'panel_foot', 'panel_arm'], 'reading'),
    'orb_sheet': (['orb_body', 'orb_leg', 'orb_foot', 'orb_arm'], 'reading'),
    'keg_sheet': (['keg_body', 'keg_leg', 'keg_foot', 'keg_arm'], 'reading'),
    'boss_sheet': (['boss_body', 'boss_leg', 'boss_foot', 'boss_arm'], 'reading'),
    'bug_sheet': (['bug_body', 'bug_leg'], 'x'),
    'mars_sheet': (['mars_body', 'mars_leg', 'mars_foot', 'mars_arm'], 'reading'),
    'loreal_sheet': (['loreal_body', 'loreal_leg', 'loreal_foot', 'loreal_arm'], 'reading'),
    'multon_sheet': (['multon_body', 'multon_leg', 'multon_foot', 'multon_arm'], 'reading'),
    'baltika_sheet': (['baltika_body', 'baltika_leg', 'baltika_foot', 'baltika_arm'], 'reading'),
    'ferrero_sheet': (['ferrero_body', 'ferrero_leg', 'ferrero_foot', 'ferrero_arm'], 'reading'),
    'vetis_sheet': (['vetis_body', 'vetis_leg', 'vetis_foot', 'vetis_arm'], 'reading'),
    'bugu_sheet': (['bugu_body', 'bugu_leg', 'bugu_foot', 'bugu_arm'], 'reading'),
    'buga_sheet': (['buga_body', 'buga_leg', 'buga_foot', 'buga_arm'], 'reading'),
    'crpt_sheet': (['crpt_body', 'crpt_leg', 'crpt_foot', 'crpt_arm'], 'reading'),
    # round 30 (docs/PLAN-FEEDBACK-27-10.md, stage 5): the «Дата-центр»'s own bosses
    'repl_sheet': (['repl_body', 'repl_leg', 'repl_foot', 'repl_arm'], 'reading'),
    'rstorm_sheet': (['rstorm_body', 'rstorm_leg', 'rstorm_foot', 'rstorm_arm'], 'reading'),
    'outage_sheet': (['outage_body', 'outage_leg', 'outage_foot', 'outage_arm'], 'reading'),
    'props_e_sheet': (['rack', 'rack_b', 'crac', 'ups', 'cell'], 'x'),
    'props_f_sheet': (['pdu', 'tray', 'firerack', 'switch', 'cart'], 'x'),
    'props_g_sheet': (['desk', 'tapelib', 'patch', 'cart_b'], 'x'),
    'icons2_sheet': (['ic_trace', 'ic_orbit', 'ic_homing', 'ic_mine', 'ic_ping', 'ic_retry', 'ic_cache', 'ic_hp', 'ic_speed', 'ic_magnet', 'ic_power', 'ic_haste',
                      'gem', 'gem_b', 'gem_c', 'bar', 'heal'], 'reading'),
    'props_h_sheet': (['blade', 'dock', 'holopillar', 'spool', 'manifold'], 'x'),
    'props_i_sheet': (['batbank', 'switchstack', 'crates', 'mast', 'rack_open'], 'x'),
    'bugl_sheet': (['bugl_body', 'bugl_leg', 'bugl_foot', 'bugl_arm'], 'reading'),
    'bugg_sheet': (['bugg_body', 'bugg_leg', 'bugg_foot', 'bugg_arm'], 'reading'),
    'mond_sheet': (['mond_body', 'mond_leg', 'mond_foot', 'mond_arm'], 'reading'),
    'prog_sheet': (['prog_body', 'prog_leg', 'prog_foot', 'prog_arm'], 'reading'),
    'royal_sheet': (['royal_body', 'royal_leg', 'royal_foot', 'royal_arm'], 'reading'),
    'cherk_sheet': (['cherk_body', 'cherk_leg', 'cherk_foot', 'cherk_arm'], 'reading'),
    'pg_sheet': (['pg_body', 'pg_leg', 'pg_foot', 'pg_arm'], 'reading'),
    'petfood_sheet': (['petfood_body', 'petfood_leg', 'petfood_foot', 'petfood_arm'], 'reading'),
    'logq_sheet': (['logq_body', 'logq_leg', 'logq_foot', 'logq_arm'], 'reading'),
    'batch_sheet': (['batch_body', 'batch_leg', 'batch_foot', 'batch_arm'], 'reading'),
    'desk_sheet': (['sdesk_body'], 'x'),
    # round 17 heroes (they share Utrace's scanner); QA's halo needs a wider merge
    'hr_trc_sheet': (['hr_trc_body', '_bentleg', 'hr_trc_foot', '_bentarm'], 'reading'),
    'hr_ser_sheet': (['hr_ser_body', '_bentleg', 'hr_ser_foot', '_bentarm'], 'reading'),
    'hr_ba_sheet': (['hr_ba_body', '_bentleg', 'hr_ba_foot', '_bentarm'], 'reading'),
    'hr_qa_sheet': (['hr_qa_body', '_bentleg', 'hr_qa_foot', '_bentarm'], 'reading', ['--dilate', '12']),
    # round 11 icons: pieces made of separate bits need a wider merge (third item: extra slice.py args)
    'icons3_sheet': (['ic_udp', 'ic_chain', 'ic_storm', 'ic_turret', 'ic_cryo', 'ic_fork', 'ic_area', 'ic_amount', 'ic_dur', 'chest', 'turret'], 'reading', ['--dilate', '18']),
    'icons4_sheet': (['ic_x_trace', 'ic_x_orbit', 'ic_x_homing', 'ic_x_mine', 'ic_x_ping', 'ic_x_retry', 'ic_x_cache', 'ic_x_udp', 'ic_x_chain', 'ic_x_storm',
                      'ic_x_turret', 'ic_x_cryo', 'ic_x_fork'], 'reading', ['--dilate', '10', '--min', '2500']),
}
SINGLES = ['core', 'cage']
env = dict(os.environ, PYTHONUTF8='1')
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
want = sys.argv[1:] or [s for s in list(SHEETS) + SINGLES if os.path.exists(f'art/gen/{s}.png')]
done = []
for s in want:
    if s in SHEETS:
        names, order, *extra = SHEETS[s]
        r = subprocess.run([sys.executable, f'{SK}/slice.py', f'art/gen/{s}.png', ','.join(names), '--order', order] + (extra[0] if extra else []), env=env, capture_output=True, text=True)
        print(s, r.stdout.strip()[-300:], r.stderr.strip()[-300:])
        if r.returncode: continue
        for n in names:
            if n.startswith('_') and os.path.exists(f'art/gen/{n}.png'): os.remove(f'art/gen/{n}.png')   # a part this sheet draws but another sheet replaces
        done += [n for n in names if not n.startswith('_')]
    elif s in SINGLES:
        done.append(s)
for n in done:
    m = f'art/logs/{n}.placeholder'
    if os.path.exists(m): os.remove(m)
subprocess.run([sys.executable, f'{SK}/prep.py'], env=env)
print('ingested:', ', '.join(done))
