# Round 8 scene: five component zones (floor pattern per zone), node circles with capture progress, pools, the components HUD
# with an edge arrow, the crosshair, the two new bugs, and the core drawn in strips sorted by its diamond's front edge.
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
p = 'live/scene.js'; s = open(p, encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:90], s.count(a)); s = s.replace(a, b)
# floor: five zones, a pattern id per zone
rep("uniform vec2 u_cam; uniform vec4 u_z0, u_z1, u_z2, u_z3; uniform vec3 u_c0, u_c1, u_c2, u_c3, u_pc;",
    "uniform vec2 u_cam; uniform vec4 u_z0, u_z1, u_z2, u_z3, u_z4; uniform vec3 u_c0, u_c1, u_c2, u_c3, u_c4, u_pc; uniform vec4 u_pat; uniform float u_pat4;")
rep("zc = mix(zc, u_c3, inZ(w, u_z3));", "zc = mix(zc, u_c3, inZ(w, u_z3)); zc = mix(zc, u_c4, inZ(w, u_z4));")
rep("  float k0 = inZ(w, u_z0), k1 = inZ(w, u_z1), k2 = inZ(w, u_z2), k3 = inZ(w, u_z3);", "  float k0 = inZ(w, u_z0), k1 = inZ(w, u_z1), k2 = inZ(w, u_z2), k3 = inZ(w, u_z3), k4 = inZ(w, u_z4);")
rep("  col += zc * (k0 * dots * 0.05 * (0.5 + 0.5 * step(0.55, h)) + k1 * hexl * 0.1 + k2 * max(rail, 0.0) * 0.18 + k3 * fine * 0.05);",
    """  float pv[5]; pv[0] = dots * 0.05 * (0.5 + 0.5 * step(0.55, h)); pv[1] = hexl * 0.1; pv[2] = diag * 0.05; pv[3] = max(rail, 0.0) * 0.18; pv[4] = fine * 0.05;
  col += zc * (k0 * pv[int(u_pat.x)] + k1 * pv[int(u_pat.y)] + k2 * pv[int(u_pat.z)] + k3 * pv[int(u_pat.w)] + k4 * pv[int(u_pat4)]);""")
rep("const ZU = {}; SIM.ZONES.forEach((z, i) => { ZU['u_z' + i] = [z.x0, z.y0, z.x1, z.y1]; ZU['u_c' + i] = z.col; }); ZU.u_pc = SIM.PLAZA.col;",
    "const ZU = {}; SIM.ZONES.forEach((z, i) => { ZU['u_z' + i] = [z.x0, z.y0, z.x1, z.y1]; ZU['u_c' + i] = z.col; }); ZU.u_pc = SIM.PLAZA.col;\n  ZU.u_pat = SIM.ZONES.slice(0, 4).map((z) => z.pat); ZU.u_pat4 = SIM.ZONES[4].pat;")
# the energy-block hazard striping keyed to the logistics zone (pattern 3 = rails)
s = s.replace("  col += vec3(1.0, 0.84, 0.0) * k2 * diag * 0.045;", "  col += vec3(1.0, 0.84, 0.0) * k3 * diag * 0.045;")
# rigs and marks for the new bugs
rep("    buga:    { body: 82,", "    bugl:    { body: 84, hipY: 27, leg: 32, legW: 15, hipW: 22, foot: [28, 14], shY: 56, shW: 46, arm: 27, armW: 14, bob: 4, flip: true },\n    bugg:    { body: 84, hipY: 27, leg: 32, legW: 15, hipW: 20, foot: [27, 14], shY: 56, shW: 44, arm: 27, armW: 14, bob: 4, flip: true },\n    buga:    { body: 82,")
rep("buga: [0.63, 0.42, 'bug'],", "buga: [0.63, 0.42, 'bug'], bugl: [0.62, 0.4, 'bug'], bugg: [0.62, 0.4, 'bug'],")
# node circles on the floor (before the light pools), pools of the goods bug
rep("    for (const m of ST.MK) { const a = (GT - m.t0) / m.delay, q = clamp01(a);",
    """    SIM.ZONES.forEach((z, i) => { if (!onS(z.nx, z.ny, SIM.NODE_R + 100)) return; const n = ST.nodes ? ST.nodes[i] : { st: 0, hold: 0 }, R = SIM.NODE_R, X = sx(z.nx), Y = sy(z.ny);
      if (n.st) { pool(X, Y, R, R * 0.62, MINT, 0.22, 1.2); L.ring(X, Y, R, R * 0.62, MINT, 0.9, 0.03); return; }
      const pu = 0.5 + 0.5 * Math.sin(t * 2.2 + i); L.ring(X, Y, R, R * 0.62, z.col, 0.55 + 0.25 * pu, 0.025); L.ring(X, Y, R * 0.93, R * 0.93 * 0.62, z.col, 0.25, 0.012);
      if (n.hold > 0) { const q = clamp01(n.hold / 6); pool(X, Y, R * q, R * 0.62 * q, z.col, 0.3, 1.4); L.ring(X, Y, R * q, R * 0.62 * q, [1, 1, 1], 0.7, 0.04); } });
    for (const pu of ST.PU || []) { const a = GT - pu.t0, q = clamp01(a / 0.3) * (1 - clamp01((a - pu.life + 0.4) / 0.4)); pool(sx(pu.x), sy(pu.y), pu.r * 1.1, pu.r * 0.68, CORAL, 0.4 * q, 1.4);
      L.ring(sx(pu.x), sy(pu.y), pu.r, pu.r * 0.62, CORAL, 0.8 * q, 0.05); }
    for (const m of ST.MK) { const a = (GT - m.t0) / m.delay, q = clamp01(a);""")
# the core: vertical strips, each sorted by the diamond's front edge under it, so it never covers actors beside or in front of it
rep("    for (const [k, x, y, f] of SIM.PROPS) { if (!onS(x, y, 500)) continue; Yb.push([y, () => { const [w, h] = sizeOf(k, Z[k][1]), l = lit(x, y);",
    """    for (const [k, x, y, f] of SIM.PROPS) { if (k !== 'core' || !onS(x, y, 600)) continue; const [w, h] = sizeOf(k, Z[k][1]), l = lit(x, y), F = SIM.FOOT.core, N = 14;
      for (let i = 0; i < N; i++) { const u0 = i / N, u1 = (i + 1) / N, xc = x - w / 2 + (u0 + u1) / 2 * w, front = y - F[1] + F[1] * Math.max(0, 1 - Math.abs(xc - x) / F[0]);
        Yb.push([front, () => L.sprite(k, sx(x) - w / 2 + u0 * w, sy(y) - h, { w: w / N + 0.6, h, src: [f ? 1 - u1 : u0, 0, f ? 1 - u0 : u1, 1], flip: !!f,
          u: { grade: [0.75, 0.72 + 0.4 * l, 0, 1.05], tint: [0.8, 0.95, 1.12, 0.4], rim: [0.55, 0.004, -0.004, 1.2], rimCol: zcol(x, y) } })]); } }
    for (const [k, x, y, f] of SIM.PROPS) { if (k === 'core' || !onS(x, y, 500)) continue; Yb.push([y, () => { const [w, h] = sizeOf(k, Z[k][1]), l = lit(x, y);""")
# HUD: components counter with the direction to the nearest open one, an edge marker, the crosshair
rep("    // boss bar (under the clock)", """    // components: counter and the way to the nearest open one (the original's «Узлы: n/5 · Агрегация ←»)
    if (ST.nodes) { let best = -1, bd = 1e9; ST.nodes.forEach((n, i) => { if (n.st) return; const z = SIM.ZONES[i], d = Math.hypot(z.nx - ST.x, z.ny - ST.y); if (d < bd) { bd = d; best = i; } });
      const done = ST.nodes.filter((n) => n.st).length, z = best >= 0 ? SIM.ZONES[best] : null;
      const ang = z ? Math.atan2(z.ny - ST.y, z.nx - ST.x) : 0, arrow = '→↘↓↙←↖↑↗'[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
      const cs = 'КОМПОНЕНТЫ ' + done + '/5' + (z ? ' · ' + z.name + ' ' + arrow : ' · ВСЕ ВОССТАНОВЛЕНЫ'), cw = L.labelW('comp', cs, { size: 24, font: MONO });
      const cyy = ST.boss ? 196 : 112; panel('compp', W / 2 - cw / 2 - 18, cyy - 22, cw + 36, 44, 0.75); label('comp', cs, W / 2, cyy, { size: 24, al: 0.5, col: '#7ff6ff' });
      if (z && bd > 700) { const ex = sx0(z.nx), ey = sy0(z.ny), mx = Math.max(60, Math.min(W - 60, ex)), my = Math.max(150, Math.min(H - 150, ey));      // edge marker
        if (ex < 0 || ex > W || ey < 0 || ey > H) { G.blend('add'); L.glow(mx, my, 40, z.col, 0.9, 3); G.blend(); L.solid(mx, my, 34, 10, z.col, ang, 0, 5, 0.95); L.solid(mx, my, 20, 10, [1, 1, 1], ang, -10, 5, 0.9); } } }
    if (S.state && !ST.pick && !ST.over) { const px = ST.px, py = ST.py; G.blend('add'); L.ring(px, py, 16, 16, CYAN, 0.95, 0.12); G.blend();       // crosshair
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) L.solid(px + dx * 14 - (dy ? 1.5 : 0) - (dx < 0 ? 9 : 0), py + dy * 14 - (dx ? 1.5 : 0) - (dy < 0 ? 9 : 0), dx ? 9 : 3, dy ? 9 : 3, CYAN, 0, 0, 0, 0.95); }
    // boss bar (under the clock)""")
rep("  function hud(ST, GT, t, combo, lvlUp, sx, sy) {", "  function hud(ST, GT, t, combo, lvlUp, sx, sy) { const sx0 = sx, sy0 = sy;")
rep("      if (e.k === 'summon' && a < 0.6) {", """      if (e.k === 'capture' && a < 1.6) { const q = a / 1.6; L.ring(X, Y, SIM.NODE_R * (1 + q), SIM.NODE_R * 0.62 * (1 + q), MINT, 1 - q, 0.05); if (a < 0.2) L.glow(X, Y, 300, MINT, 1.2 * (1 - a / 0.2), 1.6); }
      if (e.k === 'summon' && a < 0.6) {""")
open(p, 'w', encoding='utf-8').write(s); print('scene patched')
