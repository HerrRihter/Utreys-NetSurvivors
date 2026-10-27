# Round 11 scene: the new weapons' effects, chill / freeze tints, evolution cards and slots, upgrade capsules, icon fallbacks.
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
p = 'live/scene.js'; s = open(p, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:100], s.count(a)); s = s.replace(a, b)

# icons: until the round-11 icon sheets exist, new icons borrow a kin icon (evolutions borrow their base weapon's)
rep("  const ART_FALLBACK = {", """  const IC_FB = { ic_udp: 'ic_homing', ic_chain: 'ic_ping', ic_storm: 'ic_power', ic_turret: 'ic_cache', ic_cryo: 'ic_haste', ic_fork: 'ic_mine',
    ic_area: 'ic_magnet', ic_amount: 'ic_power', ic_dur: 'ic_haste', chest: 'code_tex', turret: 'switch' }, ICN = {};
  const icn = (n) => { if (ICN[n]) return ICN[n]; let r = n; try { G.tex(n); } catch (_) { r = n.startsWith('ic_x_') ? icn(SIM.WEAP[n.slice(5)].ic) : icn(IC_FB[n] || 'ic_power'); } return (ICN[n] = r); };
  const ICE = [0.62, 0.9, 1];
  const ART_FALLBACK = {""")
# chill / freeze tint on bipeds
rep("tint: [0.82, 0.95, 1.1, 0.35], rim: [0.6, -0.004 * face, -0.005, 1.2], rimCol: o.rimCol || CYAN, alpha: fade };",
    "tint: o.ice ? [0.55, 0.88, 1.35, 0.4 + 0.45 * o.ice] : [0.82, 0.95, 1.1, 0.35], rim: [0.6, -0.004 * face, -0.005, 1.2], rimCol: o.ice ? ICE : o.rimCol || CYAN, alpha: fade };", 2)
rep("hitA: GT - e.hitT, hitDir: e.hdx || 0, rimCol: zcol(e.x, e.y),", "hitA: GT - e.hitT, hitDir: e.hdx || 0, rimCol: zcol(e.x, e.y), ice: e.frzT > GT ? 1 : e.chillT > GT ? 0.45 : 0,")
rep("        if (hit > 0 && die < 0) {", """        if (e.frzT > GT && die < 0) { const hy = Y - (R0.hex ? 60 : R0.hipY + R0.body * 0.5), r = R0.hex ? 90 : R0.body * 0.75; G.blend('add'); L.glow(X, hy, r * 1.3, ICE, 0.35, 2);
          for (let j = 0; j < 5; j++) { const an = j * 1.256 + e.id; L.solid(X + Math.cos(an) * r * 0.6, hy + Math.sin(an) * r * 0.5, 14, 4, [0.85, 1, 1], an, 0, 1.5, 0.8); } G.blend(); }
        if (hit > 0 && die < 0) {""")
# sentry servers sort with the band
rep("    // orbit scanners sort with the band", """    for (const u of ST.TU || []) { if (!onS(u.x, u.y, 200)) continue; Yb.push([u.y, () => { const X = sx(u.x), Y = sy(u.y), left = u.life - (GT - u.t0), bl = left < 1.2 && Math.sin(GT * 30) > 0 ? 0.4 : 1;
      const n = icn('turret'), h = 96, w = L.hsz(n, h), c = u.evo ? MINT : CYAN; SH(X + 4, Y, 40, 12, 0.5);
      L.sprite(n, X - w / 2, Y - h + 8, { w, h, u: { grade: [0.85, 1, 0, 1], tint: [0.8, 0.95, 1.1, 0.3], rim: [0.6, 0.004, -0.004, 1.2], rimCol: c, alpha: bl } });
      L.solid(X, Y - 70, 40, 8, [0.15, 0.22, 0.28], u.a, 0, 3, bl); L.glow(X + Math.cos(u.a) * 40, Y - 70 + Math.sin(u.a) * 40, 14, c, 0.9 * bl, 3); L.glow(X, Y - h + 12, 10, c, (0.5 + 0.5 * Math.sin(GT * 6 + u.t0)) * bl, 4); }]); }
    // orbit scanners sort with the band""")
# capsules among the pickups
rep("const b = 5 * Math.sin(t * 4 + p.x * 0.05), n = p.b === 1 ? 'code_tex' : p.b === 2 ? 'heal' : ['gem', 'gem_b', 'gem_c'][p.k], h = p.b === 1 ? 34 : p.b ? 30 : [26, 32, 40][p.k];",
    "const b = 5 * Math.sin(t * 4 + p.x * 0.05), n = p.b === 3 ? icn('chest') : p.b === 1 ? 'code_tex' : p.b === 2 ? 'heal' : ['gem', 'gem_b', 'gem_c'][p.k], h = p.b === 3 ? 64 : p.b === 1 ? 34 : p.b ? 30 : [26, 32, 40][p.k];\n      if (p.b === 3) { G.blend('add'); L.solid(sx(p.x) - 18, sy(p.y) - 420, 36, 420, MINT, 0, 0, 0, 0.12 + 0.06 * Math.sin(t * 5)); L.ring(sx(p.x), sy(p.y), 50, 30, MINT, 0.7, 0.08); G.blend(); }")
rep("SH(sx(p.x), sy(p.y) + 4, 12, 4, 0.4); const col = p.b === 1 ?", "SH(sx(p.x), sy(p.y) + 4, 12, 4, 0.4); const col = p.b === 3 ? MINT : p.b === 1 ?")
# projectiles
rep("      if (p.k === 'ret') { L.glow(X, Y, 40, CYAN, 0.6, 3);", """      if (p.k === 'udp' || p.k === 'tsh') { const a = Math.atan2(p.vy, p.vx), c = p.evo ? MINT : CYAN, len = p.k === 'tsh' ? 22 : p.evo ? 34 : 26;
        G.blend('add'); L.solid(X - Math.cos(a) * len, Y - Math.sin(a) * len, len, p.evo ? 6 : 4, c, a, 0, 2, 0.9); L.glow(X, Y, 16, c, 0.9, 3); G.blend(); }
      if (p.k === 'fork') { const Z = p.z || 0, r = p.depth > 0 && p.split ? 30 : 20; SH(X, Y + 4, r * 0.6, r * 0.25, 0.4); L.glow(X, Y - Z, r * 1.4, p.evo ? MINT : CORAL, 0.25, 3);
        L.sprite(icn('ic_fork'), 0, 0, { m: M.of(M.t(X, Y - Z), M.r(GT * 10 + p.t0)), w: r * 1.6, h: r * 1.6, pivot: [r * 0.8, r * 0.8] }); }
      if (p.k === 'ret') { L.glow(X, Y, 40, CYAN, 0.6, 3);""")
# the cryo cone while it blows
rep("    // ===== event FX =====", """    if (ST.cryo && ST.cryo.until > GT && ST.cryo.r) { const [tx, ty] = SIM.tip(ST), X = sx(tx), Y = sy(ty), r = ST.cryo.r;
      G.blend('add'); G.draw(L.P.arc, { u_a: ST.aim, u_half: ST.cryo.half, u_age: 0.28 + 0.03 * Math.sin(GT * 20), u_col: ICE }, G.xf(X - r, Y - r, 2 * r, 2 * r)); G.blend();
      for (let j = 0; j < 9; j++) { const q = ((GT * 2.2 + j / 9) % 1), an = ST.aim + (rnd(j, Math.floor(GT * 2.2 + j / 9)) - 0.5) * 2 * ST.cryo.half; L.puff(X + Math.cos(an) * r * q, Y + Math.sin(an) * r * q, 10 + 26 * q, [0.75, 0.92, 1], 0.45 * (1 - q), j); } }
    // ===== event FX =====""")
rep("G.draw(L.P.arc, { u_a: e.a, u_half: e.half, u_age: q, u_col: CYAN }, G.xf(X - e.r, Y - e.r, 2 * e.r, 2 * e.r));",
    "G.draw(L.P.arc, { u_a: e.a, u_half: e.half, u_age: q, u_col: e.evo ? MINT : CYAN }, G.xf(X - e.r, Y - e.r, 2 * e.r, 2 * e.r));")
rep("      if (e.k === 'summon' && a < 0.6) {", """      if (e.k === 'chain' && a < 0.22) { const q = 1 - a / 0.22, c = e.evo ? MINT : CYAN, fr = Math.floor(GT * 40); G.blend('add');
        for (let j = 0; j + 1 < e.pts.length; j++) { let [x0, y0] = e.pts[j], [x1, y1] = e.pts[j + 1]; x0 = sx(x0); y0 = sy(y0); x1 = sx(x1); y1 = sy(y1); let px0 = x0, py0 = y0;
          for (let k = 1; k <= 5; k++) { const u = k / 5, nx = x0 + (x1 - x0) * u + (k < 5 ? (rnd(fr + k, j) - 0.5) * 34 : 0), ny = y0 + (y1 - y0) * u + (k < 5 ? (rnd(j, fr + k) - 0.5) * 34 : 0);
            L.solid(px0, py0, Math.hypot(nx - px0, ny - py0), 3.5, [0.9, 1, 1], Math.atan2(ny - py0, nx - px0), 0, 1.5, q); L.solid(px0, py0, Math.hypot(nx - px0, ny - py0), 9, c, Math.atan2(ny - py0, nx - px0), 0, 4, 0.5 * q); px0 = nx; py0 = ny; }
          L.glow(x1, y1, 34, c, q, 3); } G.blend(); }
      if (e.k === 'bolt' && a < 0.4) { const q = 1 - a / 0.4, c = e.evo ? MINT : CYAN, fr = Math.floor(GT * 30); G.blend('add'); let px0 = X + (rnd(fr, e.x) - 0.5) * 80, py0 = Y - 760;
        for (let k = 1; k <= 8; k++) { const nx = X + (k < 8 ? (rnd(fr + k, e.y) - 0.5) * 70 : 0), ny = Y - 760 + 760 * k / 8 - 20;
          L.solid(px0, py0, Math.hypot(nx - px0, ny - py0), 5, [0.92, 1, 1], Math.atan2(ny - py0, nx - px0), 0, 2, q); L.solid(px0, py0, Math.hypot(nx - px0, ny - py0), 14, c, Math.atan2(ny - py0, nx - px0), 0, 6, 0.45 * q); px0 = nx; py0 = ny; }
        L.ring(X, Y, e.r * (1.4 - 0.4 * q), e.r * 0.62 * (1.4 - 0.4 * q), c, q, 0.08); if (a < 0.08) L.glow(X, Y - 20, e.r * 2, [0.9, 1, 1], 1.2 * q, 2); G.blend(); }
      if (e.k === 'turret' && a < 0.4) { const q = a / 0.4; L.ring(X, Y, 30 + 60 * q, 18 + 36 * q, CYAN, 1 - q, 0.1); }
      if (e.k === 'tfire' && a < 0.06) L.star(X, Y, 22, [0.85, 1, 1], 1 - a / 0.06);
      if (e.k === 'evo' && a < 1.6) { const q = a / 1.6; G.blend('add'); L.ring(X, Y + 60, 80 + 420 * q, (80 + 420 * q) * 0.62, MINT, 1 - q, 0.04); if (a < 0.25) L.glow(X, Y, 360, MINT, 1.3 * (1 - a / 0.25), 1.5);
        for (let j = 0; j < 14; j++) { const an = j * 0.449, d = 60 + 300 * q; L.solid(X + Math.cos(an) * d, Y + Math.sin(an) * d * 0.62, 16, 4, [0.85, 1, 0.95], an, 0, 2, 1 - q); } G.blend(); }
      if (e.k === 'chest' && a < 0.8) { const q = a / 0.8; L.ring(X, Y, 30 + 160 * q, 20 + 100 * q, MINT, 1 - q, 0.08); if (a < 0.15) L.glow(X, Y - 30, 160, MINT, 1 - a / 0.15, 2); }
      if (e.k === 'summon' && a < 0.6) {""")
# weapon slots: evolved slots glow mint and read EVO instead of level pips; icons through the fallback
rep("      L.uiBox('slot' + i, x, y0, S0, S0, 4); frame(x, y0, S0, S0, 0.9);\n      L.sprite(SIM.WEAP[id].ic, x + 12, y0 + 8, { w: S0 - 24, h: S0 - 24 });",
    "      const evo = SIM.WEAP[id].evo; L.uiBox('slot' + i, x, y0, S0, S0, 4); frame(x, y0, S0, S0, 0.9, evo ? MINT : CYAN);\n      if (evo) { G.blend('add'); L.glow(x + S0 / 2, y0 + S0 / 2, S0 * 0.7, MINT, 0.35 + 0.15 * Math.sin(GT * 3 + i), 2); G.blend(); }\n      L.sprite(icn(SIM.WEAP[id].ic), x + 12, y0 + 8, { w: S0 - 24, h: S0 - 24 });")
rep("      for (let j = 0; j < SIM.MAX_WL; j++) L.rrect(x + 10 + j * 12.5, y0 + S0 - 13, 9, 7, 3, j < ST.wp[id] ? CYAN : [0.12, 0.2, 0.24]); });",
    "      if (evo) label('evo' + i, 'EVO', x + S0 / 2, y0 + S0 - 10, { size: 16, al: 0.5, col: '#64ffda' });\n      else for (let j = 0; j < SIM.MAX_WL; j++) L.rrect(x + 10 + j * 12.5, y0 + S0 - 13, 9, 7, 3, j < ST.wp[id] ? CYAN : [0.12, 0.2, 0.24]); });")
rep("L.sprite(SIM.PASS[k].ic, px + 8, y0 + 36, { w: 40, h: 40 });", "L.sprite(icn(SIM.PASS[k].ic), px + 8, y0 + 36, { w: 40, h: 40 });")
# cards: the evolution card, the capsule title
rep("const title = 'НОВЫЙ УРОВЕНЬ ' + ST.lvl + ' — выберите улучшение',", "const title = ST.pick.chest ? 'КАПСУЛА ОБНОВЛЕНИЯ — выберите улучшение' : 'НОВЫЙ УРОВЕНЬ ' + ST.lvl + ' — выберите улучшение',")
rep("""        const isW = op.k === 'w', def = isW ? SIM.WEAP[op.id] : SIM.PASS[op.id], lv = isW ? (ST.wp[op.id] || 0) : op.k === 'p' ? ST.ps[op.id] : 0;
        const name = op.k === 'heal' ? 'Кофе из автомата' : def.name, sub = op.k === 'heal' ? 'Восстановление' : isW ? (lv ? 'Уровень ' + lv + ' → ' + (lv + 1) : 'Новое оружие') : 'Навык ' + lv + ' → ' + (lv + 1);
        const desc = op.k === 'heal' ? '+40 HP' : isW ? (lv ? SIM.WEAP[op.id].steps[lv - 1][0] : SIM.WSUM[op.id]) : def.desc;
        L.uiBox('card' + i, x, y + lift, w, h, 10); frame(x, y + lift, w, h, a);
        L.sprite(op.k === 'heal' ? 'heal' : def.ic,""",
    """        const isE = op.k === 'evo', isW = op.k === 'w' || isE, def = isW ? SIM.WEAP[op.id] : SIM.PASS[op.id], lv = isE ? 0 : isW ? (ST.wp[op.id] || 0) : op.k === 'p' ? ST.ps[op.id] : 0;
        const name = op.k === 'heal' ? 'Кофе из автомата' : def.name, sub = op.k === 'heal' ? 'Восстановление' : isE ? 'ЭВОЛЮЦИЯ' : isW ? (lv ? 'Уровень ' + lv + ' → ' + (lv + 1) : 'Новое оружие') : 'Навык ' + lv + ' → ' + (lv + 1);
        const desc = op.k === 'heal' ? '+40 HP' : isE ? SIM.WSUM[op.id] + '. ' + SIM.WEAP[op.from].name + ' + ' + SIM.PASS[SIM.EVO[op.from][0]].name : isW ? (lv ? SIM.WEAP[op.id].steps[lv - 1][0] : SIM.WSUM[op.id]) : def.desc;
        L.uiBox('card' + i, x, y + lift, w, h, 10); frame(x, y + lift, w, h, a, isE ? MINT : CYAN);
        if (isE) { G.blend('add'); L.glow(x + w / 2, y + 100 + lift, 200, MINT, (0.4 + 0.2 * Math.sin(GT * 4)) * a, 2); G.blend(); }
        L.sprite(op.k === 'heal' ? 'heal' : icn(def.ic),""")
rep("label('cs' + i, sub, x + w / 2, y + 220 + nl.length * 42 + lift, { size: 24, al: 0.5, col: isW && !lv ? '#64ffda' : '#ffd600', a });",
    "label('cs' + i, sub, x + w / 2, y + 220 + nl.length * 42 + lift, { size: 24, al: 0.5, col: isE || (isW && !lv) ? '#64ffda' : '#ffd600', a });")
open(p, 'w', encoding='utf-8').write(s); print('scene patched')
