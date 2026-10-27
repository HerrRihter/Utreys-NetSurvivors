# Round 25 (plan stage 2b), the scene: the ability's level-up card, its HUD slot (icon, cooldown, E, rank pips, glow while it runs),
# the world effects (a ring round the hero while a boost runs, the truce marks over pacified foes, Регресс's zone, a cast flash) and a sound.
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
def patch(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:90], s.count(a)); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

patch('live/scene.js', [
    # the level-up card of the ability
    ("        const isE = op.k === 'evo', isW = op.k === 'w' || isE, def = isW ? SIM.WEAP[op.id] : SIM.PASS[op.id], lv = isE ? 0 : isW ? (ST.wp[op.id] || 0) : op.k === 'p' ? ST.ps[op.id] : 0;",
     "        const isA = op.k === 'ab', isE = op.k === 'evo', isW = op.k === 'w' || isE, def = isA ? SIM.ABIL[ST.hero] || SIM.ABIL.utrace : isW ? SIM.WEAP[op.id] : SIM.PASS[op.id], lv = isA ? ST.abR || 0 : isE ? 0 : isW ? (ST.wp[op.id] || 0) : op.k === 'p' ? ST.ps[op.id] : 0;"),
    ("        const name = op.k === 'heal' ? 'Кофе из автомата' : def.name, sub = op.k === 'heal' ? 'Восстановление' : isE ? 'ЭВОЛЮЦИЯ' :",
     "        const name = op.k === 'heal' ? 'Кофе из автомата' : def.name, sub = op.k === 'heal' ? 'Восстановление' : isA ? 'Умение E · ранг ' + lv + ' → ' + (lv + 1) : isE ? 'ЭВОЛЮЦИЯ' :"),
    ("        const desc = op.k === 'heal' ? '+40 HP' : isE ?", "        const desc = op.k === 'heal' ? '+40 HP' : isA ? def.up + '. ' + def.desc : isE ?"),
    # the HUD slot, left of the weapon slots
    ("    let px = x0 + n * (S0 + gap) + 20; for (const k in ST.ps)",
     """    if (ST.ab) { const A = SIM.ABIL[ST.hero] || SIM.ABIL.utrace, x = x0 - S0 - 34, on = GT < ST.ab.until, q = clamp01(ST.ab.cd / A.cd), hc = heroCol(ST);   // the E ability
      L.uiBox('abslot', x, y0, S0, S0, 4); frame(x, y0, S0, S0, 0.95, on ? MINT : q > 0 ? [0.13, 0.33, 0.39] : hc);
      if (on || q === 0) { G.blend('add'); L.glow(x + S0 / 2, y0 + S0 / 2, S0 * 0.75, on ? MINT : hc, on ? 0.45 + 0.15 * Math.sin(GT * 8) : 0.22 + 0.08 * Math.sin(GT * 3), 2); G.blend(); }
      L.sprite(icn(A.ic), x + 12, y0 + 8, { w: S0 - 24, h: S0 - 24, u: { grade: [q > 0 && !on ? 0.4 : 1, q > 0 && !on ? 0.6 : 1, 0, 1] } });
      if (q > 0 && !on) { L.rrect(x, y0 + S0 * (1 - q), S0, S0 * q, 4, [0, 0, 0], [0, 0, 0], 0.5); label('abcd', String(Math.ceil(ST.ab.cd)), x + S0 / 2, y0 + S0 / 2, { size: 30, al: 0.5, col: '#e6fdff' }); }
      L.rrect(x - 10, y0 - 12, 34, 30, 6, [0.02, 0.06, 0.08]); label('abk', 'E', x + 7, y0 + 3, { size: 20, al: 0.5, col: '#7ff6ff' });
      for (let j = 0; j < SIM.AB_MAX; j++) L.rrect(x + 14 + j * 22, y0 + S0 - 13, 16, 7, 3, j < (ST.abR || 0) ? MINT : [0.12, 0.2, 0.24]); }
    let px = x0 + n * (S0 + gap) + 20; for (const k in ST.ps)"""),
    # world: Регресс's zone on the floor
    ("    for (const z of ST.ZN) {",
     """    if (ST.FZ) { const F = ST.FZ, a = GT - F.t0, q = clamp01(a / 0.25) * clamp01((F.until - GT) / 0.3), X = sx(F.x), Y = sy(F.y);    // Регресс: the zone that freezes
      pool(X, Y, F.r * 1.05, F.r * 0.66, ELEC, 0.32 * q, 1.5); L.ring(X, Y, F.r, F.r * 0.62, ELEC_HI, 0.9 * q, 0.035);
      for (let j = 0; j < 4; j++) { const an = GT * 0.8 + j * 1.571; L.solid(X + Math.cos(an) * F.r * 0.8, Y + Math.sin(an) * F.r * 0.5, 22, 4, ELEC_HI, an + 1.57, 11, 2, 0.8 * q); } }
    for (const z of ST.ZN) {"""),
    # world: a ring round the hero while a boost runs, the cast flash
    ("    Yb.push([ST.y, () => { const X = sx(ST.x), Y = sy(ST.y), l = lit(ST.x, ST.y),",
     """    if (ST.ab) { const A = SIM.ABIL[ST.hero] || SIM.ABIL.utrace, X = sx(ST.x), Y = sy(ST.y), on = GT < ST.ab.until && (A.id === 'overclock' || A.id === 'registry'), c = heroCol(ST);
      if (on) { const pu = 0.5 + 0.5 * Math.sin(GT * 10); L.ring(X, Y - 4, 70, 70 * 0.62, c, 0.6 + 0.3 * pu, 0.05); G.blend('add'); L.glow(X, Y - 50, 90, c, 0.18 + 0.1 * pu, 2); G.blend(); }
      const ca = GT - ST.ab.t0; if (ca >= 0 && ca < 0.5) { const q = ca / 0.5, R = A.radius || 220; L.ring(X, Y - 4, R * q, R * q * 0.62, A.id === 'field' ? ELEC_HI : A.id === 'negotiate' ? MINT : c, 0.9 * (1 - q), 0.05); } }
    Yb.push([ST.y, () => { const X = sx(ST.x), Y = sy(ST.y), l = lit(ST.x, ST.y),"""),
])
# the truce mark over pacified foes (three dots, a speech pause) and the frozen look, after the foe is drawn
patch('live/scene.js', [
    ("        if ((f.boss || f.mini || (e.k === 'keg' && e.hp < e.mhp)) && die < 0) {",
     """        if (e.truceT > GT && die < 0) { const by = Y - z - (R0.hex ? R0.body + 40 : R0.hipY + R0.body + 34); L.rrect(X - 26, by - 14, 52, 26, 12, [0.9, 1, 0.97], [0.75, 0.9, 0.86], 0.9);   // Переговоры
          for (let j = 0; j < 3; j++) L.rrect(X - 14 + j * 11, by - 4, 7, 7, 3.5, [0.05, 0.3, 0.28], [0.05, 0.3, 0.28], 0.5 + 0.5 * (Math.floor(GT * 3) % 3 === j ? 1 : 0)); }
        if ((f.boss || f.mini || (e.k === 'keg' && e.hp < e.mhp)) && die < 0) {"""),
])
patch('live/audio.js', [
    ("evo: ['level', 1.3], chest: ['magic', 1],", "evo: ['level', 1.3], chest: ['magic', 1], ability: ['level', 0.8], frozen: ['heal', 0.5],"),
])
print('patched')
