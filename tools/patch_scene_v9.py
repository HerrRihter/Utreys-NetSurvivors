# Round 9 scene: rigs, emblems and effects for the rest of the original roster (sim side: tools/patch_sim_v9.py).
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
p = 'live/scene.js'; s = open(p, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:90], s.count(a)); s = s.replace(a, b)

# emblems (placements on the plain area of each body, then the drawings ported from client-emblems.js)
rep("crpt: [0.6, 0.48, 'crpt'] };", "crpt: [0.6, 0.48, 'crpt'],\n    mond: [0.6, 0.5, 'mondelez'], prog: [0.56, 0.5, 'progress'], royal: [0.6, 0.5, 'royal_canin'], cherk: [0.66, 0.46, 'cherkizovo'], pg: [0.56, 0.46, 'procter_gamble'],\n    petfood: [0.6, 0.48, 'mars_petfood'], logq: [0.62, 0.4, 'log'] };")
rep("      crpt: (g) => { word(g, 'ЦРПТ', 0, -22, 18, '#ffd600', 'bold', 'Consolas, monospace'); },",
    """      crpt: (g) => { word(g, 'ЦРПТ', 0, -22, 18, '#ffd600', 'bold', 'Consolas, monospace'); },
      mondelez: (g) => { ell(g, 0, -22, 32, 23, '#4e247a', '#bda0e3'); word(g, 'mondelēz', 0, -26, 11, '#ffffff', 'italic bold'); word(g, 'international', 0, -15, 6, '#f0dffc');
        g.strokeStyle = '#ee537b'; g.lineWidth = 3; g.beginPath(); g.arc(0, -15, 14, 0.45, Math.PI - 0.45); g.stroke(); },
      progress: (g) => { ell(g, 0, -22, 28, 25, '#b6c6b8', '#4e8b51'); const cs = ['#ec4050', '#f2a52c', '#5baf45', '#2595c6', '#985bb7'];
        [...'Фруто'].forEach((ch, i) => word(g, ch, -19 + i * 9.5, -28, 14, cs[i])); word(g, 'Няня', 0, -13, 16, '#db365d'); },
      royal_canin: (g) => { ell(g, 0, -21, 29, 26, '#b9c4ba', '#ce2942'); poly(g, [[-15, -29], [-18, -40], [-8, -34], [0, -45], [8, -34], [18, -40], [15, -29]], '#cf233c');
        word(g, 'ROYAL', 0, -20, 10, '#ff5a6e'); word(g, 'CANIN', 0, -9, 10, '#ff5a6e'); },
      cherkizovo: (g) => { poly(g, [[-28, -39], [28, -39], [24, -9], [0, 4], [-24, -9]], '#ad153d', '#f5c2ac'); g.strokeStyle = '#ffffff'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(-8, -32); g.lineTo(-8, -24); g.lineTo(7, -24); g.moveTo(7, -32); g.lineTo(7, -15); g.stroke(); word(g, 'ЧЕРКИЗОВО', 0, -7, 7, '#ffffff'); },
      procter_gamble: (g) => { ell(g, 0, -22, 27, 27, '#0753ba', '#83c7ff'); g.strokeStyle = '#83c7ff'; g.lineWidth = 2; g.beginPath(); g.arc(0, -22, 22, 0.7, 4.2); g.stroke();
        word(g, 'P&G', 0, -21, 20, '#ffffff', 'italic bold', 'Georgia, serif'); },
      mars_petfood: (g) => { ell(g, 0, -21, 25, 25, '#123ba5', '#73d9ed'); word(g, 'MARS', 0, -26, 13, '#ffffff'); ell(g, 0, -13, 6, 4, '#73d9ed');
        for (const [x, y] of [[-7, -18], [-2, -21], [3, -21], [8, -18]]) { g.beginPath(); g.arc(x, y, 2.3, 0, 6.29); g.fillStyle = '#73d9ed'; g.fill(); } },
      log: (g) => { word(g, '> LOG_', 0, -22, 16, '#b49cff', 'bold', 'Consolas, monospace'); },""")
# rigs (proportions from the sheets; batch is a boss-sized client cluster)
rep("    crpt:    { body: 200, hipY: 58,", """    mond:    { body: 58, hipY: 24, leg: 29, legW: 12, hipW: 16, foot: [23, 12], shY: 40, shW: 46, arm: 23, armW: 11, bob: 4, flip: true },
    prog:    { body: 66, hipY: 25, leg: 30, legW: 13, hipW: 16, foot: [24, 13], shY: 46, shW: 34, arm: 24, armW: 12, bob: 3, flip: true },
    royal:   { body: 66, hipY: 25, leg: 30, legW: 13, hipW: 17, foot: [24, 13], shY: 46, shW: 40, arm: 24, armW: 12, bob: 3, flip: true },
    cherk:   { body: 84, hipY: 29, leg: 34, legW: 18, hipW: 22, foot: [29, 15], shY: 62, shW: 44, arm: 29, armW: 16, bob: 4, flip: true },
    pg:      { body: 92, hipY: 29, leg: 34, legW: 17, hipW: 22, foot: [29, 15], shY: 58, shW: 44, arm: 29, armW: 16, bob: 4, flip: true },
    petfood: { body: 64, hipY: 25, leg: 30, legW: 13, hipW: 16, foot: [24, 13], shY: 46, shW: 34, arm: 24, armW: 12, bob: 3, flip: true },
    logq:    { body: 88, hipY: 28, leg: 33, legW: 16, hipW: 22, foot: [28, 14], shY: 60, shW: 46, arm: 28, armW: 14, bob: 3, flip: true },
    batch:   { body: 230, hipY: 62, leg: 68, legW: 42, hipW: 58, foot: [64, 32], shY: 180, shW: 112, arm: 72, armW: 36, bob: 9, flip: true },
    sdesk:   { body: 200, desk: true, hipY: 0, leg: 1, legW: 1, hipW: 60, foot: [1, 1], shY: 0, shW: 0, arm: 1, armW: 1, bob: 0, flip: false },
    crpt:    { body: 200, hipY: 58,""")
rep("for (const k in RIGS) { const r = RIGS[k]; if (r.hex) continue;", "for (const k in RIGS) { const r = RIGS[k]; if (r.hex || r.desk) continue;")
# art fallback: until a sheet is generated the actor borrows a sibling's sprites (so the game never breaks on missing art)
rep("  const COL = {}; for (const k in SIM.FOE) COL[k] = SIM.FOE[k].col;",
    """  const COL = {}; for (const k in SIM.FOE) COL[k] = SIM.FOE[k].col;
  const ART_FALLBACK = { petfood: 'mars', logq: 'vetis', batch: 'boss', sdesk: 'desk' }, ART = {};
  const artOf = (k) => { if (ART[k]) return ART[k]; let a = k; try { G.tex(k === 'sdesk' ? 'sdesk_body' : k + '_body'); } catch (_) { a = ART_FALLBACK[k] || k; } return (ART[k] = a); };""")
rep("    const R0 = RIGS[o.k], face = o.face, tr = o.id || null, gl = o.g, ph = o.dist / R0.stride;",
    "    const R0 = RIGS[o.k], face = o.face, tr = o.id || null, gl = o.g, ph = o.dist / R0.stride, ak = o.k === 'hero' ? 'hero' : artOf(o.k);")
s = s.replace("limb(o.k + '_leg'", "limb(ak + '_leg'").replace("G.tex(o.k + '_foot').h / G.tex(o.k + '_foot').w", "G.tex(ak + '_foot').h / G.tex(ak + '_foot').w")
s = s.replace("L.sprite(o.k + '_foot'", "L.sprite(ak + '_foot'").replace("limb(o.k + '_arm'", "limb(ak + '_arm'")
rep("bw = L.hsz(o.k + '_body', R0.body)", "bw = L.hsz(ak + '_body', R0.body)")
rep("      L.sprite(o.k + '_body', 0, 0, { m: M.of(M.t(cx, gy - hipY + 6)", "      L.sprite(ak + '_body', 0, 0, { m: M.of(M.t(cx, gy - hipY + 6)")
assert "o.k + '_" not in s, 'biped still reads o.k sprites'
# the service desk: a static structure with a live monitor and a beacon that flashes on every batch of tickets
rep("        const draw = () => (R0.hex ? hexapod(o) : biped(o));",
    """        const deskDraw = () => { const n = artOf('sdesk') === 'sdesk' ? 'sdesk_body' : 'desk', h = R0.body, w = L.hsz(n, h), hk = clamp01(1 - (GT - e.hitT) / 0.15), fade = die >= 0 ? 1 - clamp01(die / 0.6) : 1;
          L.sprite(n, X - w / 2 + (e.hdx || 0) * 4 * hk, Y - h + 30 + die * 40, { w, h, u: { grade: [0.9, 0.8 + 0.4 * l, hit, 1.05], rim: [0.6, 0.004, -0.005, 1.2], rimCol: o.rimCol, alpha: fade } });
          const tk = ST.ev.find((v) => v.k === 'tickets' && v.id === undefined && Math.abs(v.x - e.x) < 1 && GT - v.t < 0.8), bl = tk ? 1 - (GT - tk.t) / 0.8 : 0.35 + 0.25 * Math.sin(GT * 5 + e.id);
          if (fade > 0) { L.glow(X, Y - h + 40, 40 + 60 * bl, CORAL, 0.9 * bl * fade, 3); const q = clamp01(1 - (e.sumT - ST.t) / f.desk.every);     // next batch timer
            L.rrect(X - 50, Y + 44, 100, 7, 3, [0.05, 0.08, 0.12]); L.rrect(X - 49, Y + 45, 98 * q, 5, 2, CORAL); } };
        const draw = () => (f.kind === 'desk' ? deskDraw() : R0.hex ? hexapod(o) : biped(o));""")
rep("if (die < 0.6) SH(X + 4, Y, (R0.hex ? 48 : (R0.hipW + 14) * 1.3) * sc,", "if (die < 0.6 && !R0.desk) SH(X + 4, Y, (R0.hex ? 48 : (R0.hipW + 14) * 1.3) * sc,")
rep("const bw = f.boss ? 160 : f.mini ? 150 : 46, by = Y - z - (R0.hex ? R0.body + 50 : R0.hipY + R0.body + 18);",
    "const bw = f.boss ? 160 : f.mini ? 150 : 46, by = Y - z - (R0.hex ? R0.body + 50 : R0.desk ? R0.body - 10 : R0.hipY + R0.body + 18);")
# per-foe overlays drawn with the foe: wind-up glow for the new ranged kinds, the meat-grinder whirl, P&G's shield, the batch ward
rep("        if (wind > 0 && (f.kind === 'shoot' || f.kind === 'mortar')) L.glow(",
    """        if (f.kind === 'spin' && e.spinT > GT && die < 0) { const r = f.spin.r; L.ring(X, Y - 10, r, r * 0.62, CORAL, 0.6, 0.05); G.blend('add');
          for (let j = 0; j < 6; j++) { const an = GT * 14 + j * 1.047; L.solid(X + Math.cos(an) * r * 0.55, Y - 30 + Math.sin(an) * r * 0.34, r * 0.7, 5, CORAL, an + 1.4, 0, 2.5, 0.75); } G.blend(); }
        if (e.k === 'pg' && die < 0) { const r = f.aura.r, pu = 0.5 + 0.5 * Math.sin(GT * 2.5 + e.id); L.ring(X, Y, r, r * 0.62, [0.5, 0.75, 1], 0.18 + 0.12 * pu, 0.02); }
        if (e.shT && GT - e.shT < 0.35 && die < 0) { const q = 1 - (GT - e.shT) / 0.35, r = (R0.hex ? 70 : R0.hipW + 30); L.ring(X, Y - R0.hipY - R0.body * 0.5, r, r * 1.05, [0.5, 0.8, 1], 0.9 * q, 0.08);
          pool(X, Y - R0.hipY - R0.body * 0.5, r, r, [0.4, 0.65, 1], 0.35 * q, 2); }
        if (f.ward && die < 0) { const kids = ST.E.filter((c) => c.dieT < 0 && c.sum === e.id); if (kids.length) { const r = R0.body * 0.75;
          L.ring(X, Y - R0.hipY - R0.body * 0.45, r, r * 0.9, [0.5, 0.8, 1], 0.55 + 0.2 * Math.sin(GT * 6), 0.04);
          for (const c of kids) { const cx = sx(c.x), cy = sy(c.y) - 40, dx = cx - X, dy = cy - (Y - R0.body * 0.5); L.solid(X, Y - R0.body * 0.5, Math.hypot(dx, dy), 2, [0.5, 0.8, 1], Math.atan2(dy, dx), 0, 1, 0.35); } } }
        if (wind > 0 && (f.kind === 'shoot' || f.kind === 'mortar' || f.kind === 'lob' || f.kind === 'beam')) L.glow(""")
# ground layer: sugar trail, lob landing marks, beam telegraphs
rep("    for (const m of ST.MK) { const a = (GT - m.t0) / m.delay, q = clamp01(a);\n      L.ring(",
    """    for (const q0 of ST.TR || []) { const a = GT - q0.t0, q = clamp01(a / 0.2) * (1 - clamp01((a - q0.life + 0.8) / 0.8)); pool(sx(q0.x), sy(q0.y), q0.r, q0.r * 0.62, [0.75, 0.45, 1], 0.32 * q, 1.6); }
    for (const j of ST.LB || []) { const T = (j.vz + Math.sqrt(j.vz * j.vz + 2 * 1500 * j.z)) / 1500, lx = j.x + j.vx * T, ly = j.y + j.vy * T, k = 1 - clamp01(T / 1.0);
      L.ring(sx(lx), sy(ly), j.r, j.r * 0.62, CORAL, 0.4 + 0.5 * k, 0.05); pool(sx(lx), sy(ly), j.r, j.r * 0.62, CORAL, 0.1 + 0.25 * k, 2); SH(sx(j.x), sy(j.y), 14 + j.z * 0.02, 5, 0.45); }
    for (const e of ST.E) { const f = SIM.FOE[e.k]; if (f.kind !== 'beam' || e.atkT < 0 || e.dieT >= 0 || !onS(e.x, e.y, 800)) continue;      // the log stream's aim line
      const q = clamp01((GT - e.atkT) / f.wind), an = Math.atan2(e.ay - e.y, e.ax - e.x), L0 = f.beam.len, X = sx(e.x), Y = sy(e.y) - 40;
      L.solid(X, Y, L0, f.beam.w * (0.15 + 0.85 * q), CORAL, an, 0, 0, 0.12 + 0.18 * q); L.solid(X, Y, L0 * q, 2, CORAL, an, 0, 1, 0.9); }
    for (const m of ST.MK) { const a = (GT - m.t0) / m.delay, q = clamp01(a);
      L.ring(""")
# projectiles: jars in the air (with a spin), boomerangs turning, and the live beam
rep("    for (const b of ST.EB) { const X = sx(b.x), Y = sy(b.y), c = CORAL; L.glow(X, Y, 34, c, 0.9, 3); L.glow(X, Y, 12, [1, 0.95, 0.85], 1, 4); }",
    """    for (const b of ST.EB) { const X = sx(b.x), Y = sy(b.y), c = CORAL; L.glow(X, Y, 34, c, 0.9, 3); L.glow(X, Y, 12, [1, 0.95, 0.85], 1, 4);
      if (b.back) for (let j = 0; j < 3; j++) { const an = GT * 18 + j * 2.09; L.solid(X, Y, 16, 4, c, an, 0, 2, 0.9); } }
    for (const j of ST.LB || []) { const X = sx(j.x), Y = sy(j.y) - j.z; L.glow(X, Y, 30, [0.55, 0.85, 0.45], 0.7, 3);
      L.solid(X - 9, Y - 11, 18, 22, [0.7, 0.85, 0.65], GT * 9 + j.x, 9, 5, 1); L.solid(X - 10, Y - 14, 20, 6, [0.3, 0.6, 0.3], GT * 9 + j.x, 10, 3, 1); }
    G.blend('add'); for (const b of ST.BM || []) { const q = 1 - (GT - b.t0) / b.hold, X = sx(b.x0), Y = sy(b.y0), an = Math.atan2(b.y1 - b.y0, b.x1 - b.x0), L0 = Math.hypot(b.x1 - b.x0, b.y1 - b.y0);
      L.solid(X, Y, L0, b.w * 1.6, CORAL, an, 0, 0, 0.35 * q); L.solid(X, Y, L0, b.w * 0.7, CORAL, an, 0, 4, 0.9 * q); L.solid(X, Y, L0, b.w * 0.22, [1, 0.95, 0.9], an, 0, 2, q);
      for (let k = 0; k < 6; k++) { const u = ((GT * 3 + k / 6) % 1); L.glow(X + Math.cos(an) * L0 * u, Y + Math.sin(an) * L0 * u, 18, [1, 0.9, 0.8], 0.8 * q, 4); } } G.blend();""")
# events: jar splash, the grinder starting, a batch of tickets, the beam's flash
rep("      if (e.k === 'summon' && a < 0.6) {",
    """      if (e.k === 'splash' && a < 0.45) { const q = a / 0.45; L.ring(X, Y, e.r * (0.4 + 0.7 * q), e.r * 0.62 * (0.4 + 0.7 * q), CORAL, 1 - q, 0.08);
        for (let j = 0; j < 7; j++) { const an = rnd(e.t, j) * 6.28, d = e.r * 0.8 * q; L.solid(X + Math.cos(an) * d, Y + Math.sin(an) * d * 0.62 - 40 * q + 60 * q * q, 9, 7, [0.6, 0.85, 0.5], an, 4, 3, 1 - q); } }
      if (e.k === 'spin' && a < 0.3) L.star(X, Y - 50, 50, [1, 0.8, 0.7], 1 - a / 0.3);
      if (e.k === 'tickets' && a < 0.7) { const q = a / 0.7; L.ring(X, Y - 120, 40 + 260 * q, (40 + 260 * q) * 0.62, CORAL, 1 - q, 0.05); }
      if (e.k === 'beam' && a < 0.12) L.star(X, Y, 60, [1, 0.9, 0.8], 1 - a / 0.12);
      if (e.k === 'summon' && a < 0.6) {""")
open(p, 'w', encoding='utf-8').write(s); print('scene patched')
