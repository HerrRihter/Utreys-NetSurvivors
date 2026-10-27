# Round 28 (user: "the weapons lack armour that cuts incoming damage, a passive heal for a little HP, and a force shield that blocks a
# whole hit and then switches off for a while"): two passives and a defensive weapon with its evolution.
#   Брандмауэр (passive firewall): −7% incoming damage per rank (−35% at 5), on top of the shop's Криптозащита.
#   Самовосстановление (passive repair): +0.3 HP/s per rank (1.5 HP/s at 5).
#   Отказоустойчивость (weapon shield): a charge absorbs one whole hit of any size, then recharges; levels shorten the recharge and add a
#   push wave on a block. Evolution (level 6 + Брандмауэр): Кластер отказоустойчивости — 2 charges, a fast recharge, a damaging wave.
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
def patch(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:90], s.count(a)); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

patch('live/sim.js', [
    ("    // evolutions: max level + the paired passive; one level, their own icon (ic_x_<base>)",
     """    // the force shield: a charge absorbs a whole hit (hurtHero), recharge cd s; push: a wave on a block (radius, damage)
    shield: { name: 'Отказоустойчивость', ic: 'ic_shield', kind: 'shield', base: { cd: 14, charges: 1, push: 0, radius: 220, dmg: 0 },
              steps: [['Перезарядка быстрее на 15%', { cd: -0.15 }], ['Поглощение отбрасывает врагов вокруг', { push: 1 }], ['Перезарядка быстрее на 15%', { cd: -0.15 }],
                      ['Волна поглощения наносит урон', { dmg: 40 }], ['Перезарядка быстрее на 20%, волна шире', { cd: -0.2, radius: 60 }]] },
    // evolutions: max level + the paired passive; one level, their own icon (ic_x_<base>)
    shield_x: { name: 'Кластер отказоустойчивости', of: 'shield', evo: 1, kind: 'shield', ic: 'ic_x_shield', base: { cd: 6, charges: 2, push: 1, radius: 320, dmg: 90 }, steps: [] },"""),
    ("    tchain: ['amount', 'tchain_x'], packet: ['speed', 'packet_x'], req: ['hp', 'req_x'], regress: ['area', 'regress_x'] };",
     "    tchain: ['amount', 'tchain_x'], packet: ['speed', 'packet_x'], req: ['hp', 'req_x'], regress: ['area', 'regress_x'], shield: ['firewall', 'shield_x'] };"),
    ("    fork_x: 'Осколки делятся ещё раз',",
     "    fork_x: 'Осколки делятся ещё раз', shield: 'Щит полностью поглощает один удар, затем перезаряжается', shield_x: 'Два заряда щита, быстрая перезарядка, поглощение бьёт волной',"),
    ("    dur:    { name: 'Keep-alive', ic: 'ic_dur', desc: '+12% к времени действия' },\n  };",
     "    dur:    { name: 'Keep-alive', ic: 'ic_dur', desc: '+12% к времени действия' },\n    firewall: { name: 'Брандмауэр', ic: 'ic_firewall', desc: '−7% получаемого урона' },\n    repair: { name: 'Самовосстановление', ic: 'ic_repair', desc: '+0,3 HP в секунду' },\n  };"),
    ("ps: { hp: 0, speed: 0, magnet: 0, power: 0, haste: 0, area: 0, amount: 0, dur: 0 }", "ps: { hp: 0, speed: 0, magnet: 0, power: 0, haste: 0, area: 0, amount: 0, dur: 0, firewall: 0, repair: 0 }"),
    # armour, then the shield takes the whole hit
    ("""    if (S.demo || S.over || S.t - S.iT < K.IFR || S.t - S.dashT < K.DASH_T + 0.08 || S.t < (S.graceT || 0)) return;
    const taken = Math.max(1, dmg * DMG_SCALE * (S.str || 1) - md(S, 'armor'));                                  // Криптозащита""",
     """    if (S.demo || S.over || S.t - S.iT < K.IFR || S.t - S.dashT < K.DASH_T + 0.08 || S.t < (S.graceT || 0)) return;
    if (S.shCh > 0) { shieldBlock(S); return; }                                                                    // Отказоустойчивость: the whole hit
    const taken = Math.max(1, dmg * DMG_SCALE * (S.str || 1) * (1 - 0.07 * (S.ps.firewall || 0)) - md(S, 'armor'));   // Брандмауэр, Криптозащита"""),
    ("  function hurtHero(S, dmg, fx, fy, slow) {",
     """  // a shield charge spent on a hit: short invulnerability, the recharge starts, and from level 3 a wave pushes (and hurts) the foes round
  function shieldBlock(S) { const id = S.wp.shield_x ? 'shield_x' : 'shield', st = wstat(id, S.wp[id] || 1); S.shCh--; S.iT = S.t;
    if (S.wcd[id] <= 0) S.wcd[id] = st.cd * mul(S).cd; push(S, { k: 'shieldblock', t: S.t, x: S.x, y: S.y, r: st.push ? st.radius : 0 });
    if (st.push) { const g = buildGrid(S), M = mul(S); near(S, g, S.x, S.y, st.radius + 40, (e) => { const dx = e.x - S.x, dy = e.y - S.y, d = Math.hypot(dx, dy) || 1; if (d > st.radius + FOE[e.k].r) return;
      if (st.dmg) hurtFoe(S, e, st.dmg * M.dmg, dx / d * 520, dy / d * 520, 'shield'); else { e.kx += dx / d * 520; e.ky += dy / d * 520; } }); } }
  function hurtHero(S, dmg, fx, fy, slow) {"""),
    # Самовосстановление, beside the shop's Автовосстановление
    ("    if (md(S, 'regen')) S.hp = Math.min(hpMax(S), S.hp + 0.15 * md(S, 'regen') * DT);",
     "    if (md(S, 'regen') || S.ps.repair) S.hp = Math.min(hpMax(S), S.hp + (0.15 * md(S, 'regen') + 0.3 * (S.ps.repair || 0)) * DT);   // Автовосстановление, Самовосстановление\n    if (md(S, 'regen')) S.hp = S.hp;"),
    # the shield's charges recharge like a weapon's cooldown
    ("      if (kind === 'tchain' && ready && onAim) {",
     "      if (kind === 'shield') { if (S.shCh === undefined) S.shCh = 0; if (S.shCh > st.charges) S.shCh = st.charges;          // the force shield's charges\n        if (ready && S.shCh < st.charges) { S.shCh++; S.wcd[id] = S.shCh < st.charges ? cd : 0; push(S, { k: 'shieldup', t, x: S.x, y: S.y }); } }\n      if (kind === 'tchain' && ready && onAim) {"),
])
print('patched')
