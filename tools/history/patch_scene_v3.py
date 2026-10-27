# Round 3 scene changes (cyber floor, zones, emblems, new foes and abilities). Every edit must match exactly once.
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
p = 'live/scene.js'; s = open(p, encoding='utf-8').read()
def rep(a, b):
    global s
    assert s.count(a) == 1, (a[:80], s.count(a)); s = s.replace(a, b)

rep("// live/scene.js — the datacenter floor at night, 3/4 top-down. Pure function of t and the sim state (engine.md §7).\n// Layers: raised floor (REPEAT) → cables, stencils, splats, scorch, mines, zones, marks (ground decals) → amber lamp pools",
    "// live/scene.js — a cyber datacenter, 3/4 top-down. Pure function of t and the sim state (engine.md §7).\n// Layers: cyber-grid floor (shader, tinted per zone) → fibre trunks with packets, tape, stencils, splats, scorch, mines, zones, marks (ground decals) → neon light pools")
# ---- shaders: the cyber floor
rep("  S.programs = () => { L.init(W, H, { arc: ARC }); L.glyphs(); stencils(); L.SUN = [W * 0.2, -400]; };",
    r"""  // the floor: dark panels, a thin 100 px grid, a bright 500 px grid with a halo, circuit traces with pads, pulses running along
  // the major lines; the neon colour comes from the zone (soft 150 px blend at zone edges), world-anchored (u_cam)
  const CYBER = `uniform vec2 u_cam; uniform vec4 u_z0, u_z1, u_z2, u_z3; uniform vec3 u_c0, u_c1, u_c2, u_c3, u_pc;
float inZ(vec2 w, vec4 z){ vec2 a = smoothstep(z.xy - 150.0, z.xy + 150.0, w) * (1.0 - smoothstep(z.zw - 150.0, z.zw + 150.0, w)); return a.x * a.y; }
float gl(float v, float per, float w){ float d = abs(fract(v / per + 0.5) - 0.5) * per; return 1.0 - smoothstep(0.0, w, d); }
void main(){ vec2 w = v_px + u_cam;
  vec3 zc = u_pc; zc = mix(zc, u_c0, inZ(w, u_z0)); zc = mix(zc, u_c1, inZ(w, u_z1)); zc = mix(zc, u_c2, inZ(w, u_z2)); zc = mix(zc, u_c3, inZ(w, u_z3));
  vec2 cell = floor(w / 100.0); float h = hash(cell);
  vec3 col = vec3(0.022, 0.042, 0.05) * (0.85 + 0.3 * h) + zc * 0.014;
  float minor = max(gl(w.x, 100.0, 1.2), gl(w.y, 100.0, 1.2)), major = max(gl(w.x, 500.0, 1.8), gl(w.y, 500.0, 1.8)), halo = max(gl(w.x, 500.0, 16.0), gl(w.y, 500.0, 16.0));
  col += zc * (minor * 0.07 + major * 0.3 + halo * 0.05);
  vec2 f = fract(w / 100.0); float hh = hash(cell + 7.3);
  if (hh > 0.6) { float ox = 0.3 * (hash(cell + 1.1) - 0.5), oy = 0.3 * (hash(cell + 2.2) - 0.5), tx = abs(f.x - 0.5 - ox), ty = abs(f.y - 0.5 - oy);
    float tr = fract(hh * 13.0) > 0.5 ? (1.0 - smoothstep(0.0, 0.016, tx)) * step(f.y, 0.5 + oy) + (1.0 - smoothstep(0.0, 0.016, ty)) * step(0.5 + ox, f.x)
                                       : (1.0 - smoothstep(0.0, 0.016, ty)) * step(f.x, 0.5 + ox) + (1.0 - smoothstep(0.0, 0.016, tx)) * step(0.5 + oy, f.y);
    float pad = 1.0 - smoothstep(0.025, 0.045, length(f - vec2(0.5 + ox, 0.5 + oy)));
    col += zc * (min(tr, 1.0) * 0.15 + pad * 0.32); }
  float px = gl(w.y, 500.0, 2.5) * smoothstep(0.92, 1.0, fract((w.x + hash(vec2(floor(w.y / 500.0 + 0.5), 3.0)) * 4000.0 - u_t * 520.0) / 1700.0));
  float py = gl(w.x, 500.0, 2.5) * smoothstep(0.92, 1.0, fract((w.y + hash(vec2(floor(w.x / 500.0 + 0.5), 5.0)) * 4000.0 - u_t * 460.0) / 1500.0));
  col += mix(zc, vec3(1.0), 0.5) * (px + py) * 0.9;
  o = vec4(col, 1.0); }`;
  S.programs = () => { L.init(W, H, { arc: ARC, cyber: CYBER }); L.glyphs(); stencils(); emblems(); L.SUN = [W * 0.2, -400]; };
  const ZU = {}; SIM.ZONES.forEach((z, i) => { ZU['u_z' + i] = [z.x0, z.y0, z.x1, z.y1]; ZU['u_c' + i] = z.col; }); ZU.u_pc = SIM.PLAZA.col;
  const zcol = (x, y) => (SIM.zoneAt(x, y) || SIM.PLAZA).col;
  // client emblems and marks, ported from utreys-survivors (src/rendering/art/client-emblems.js), painted once into textures and
  // laid on the plain area of each body (never mirrored, so lettering always reads)
  const EMB_AT = { mars: [0.6, 0.5, 'mars'], loreal: [0.62, 0.62, 'loreal'], multon: [0.63, 0.56, 'multon'], baltika: [0.62, 0.62, 'baltika'], ferrero: [0.62, 0.56, 'ferrero'],
    vetis: [0.6, 0.55, 'vetis'], keg: [0.8, 0.42, 'inbev'], bugu: [0.65, 0.5, 'bug'], buga: [0.63, 0.42, 'bug'], crpt: [0.6, 0.48, 'crpt'] };
  function emblems() {
    const neon = (g, c) => { g.save(); g.strokeStyle = c; g.globalAlpha = 0.14; g.lineWidth = 6.5; g.stroke(); g.globalAlpha = 1; g.lineWidth = 1.5; g.stroke(); g.restore(); };
    const word = (g, t, x, y, sz, c, wt = 'bold', fam = 'Arial, sans-serif') => { g.font = `${wt} ${sz}px ${fam}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = c; g.fillText(t, x, y); };
    const ell = (g, x, y, rx, ry, fill, st) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); if (st) neon(g, st); };
    const poly = (g, pts, fill, st) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = fill; g.fill(); if (st) neon(g, st); };
    const D = {
      mars: (g) => { g.fillStyle = '#d6322e'; g.fillRect(-26, -40, 52, 36); g.strokeStyle = '#ffeb3b'; g.lineWidth = 3; g.strokeRect(-26, -40, 52, 36); word(g, 'M', 0, -22, 22, '#ffeb3b', 'italic 900'); },
      inbev: (g) => { g.fillStyle = '#5a0a0a'; g.fillRect(-28, -40, 56, 34); g.strokeStyle = '#d4af37'; g.lineWidth = 4; g.strokeRect(-24, -37, 48, 28); word(g, 'INBEV', 0, -23, 12, '#ffd700'); },
      baltika: (g) => { ell(g, 0, -22, 25, 29, '#072d72', '#e5c76f'); word(g, 'Балтика', 0, -29, 11, '#ffffff', 'italic bold');
        for (let i = 0; i < 3; i++) { g.strokeStyle = '#e5c76f'; g.lineWidth = 2; g.beginPath(); g.moveTo(-17, -18 + i * 6); g.bezierCurveTo(-6, -25 + i * 6, 6, -11 + i * 6, 17, -18 + i * 6); g.stroke(); } },
      multon: (g) => { poly(g, [[-24, -34], [-10, -47], [18, -42], [27, -17], [14, 0], [-18, -3]], '#a9b6ad', '#ef833f'); ell(g, 12, -36, 9, 4, '#53ab55');
        word(g, 'multon', 0, -24, 12, '#154c72'); word(g, 'partners', 0, -12, 7, '#154c72'); ell(g, -17, -8, 3, 3, '#f7ad31'); },
      loreal: (g) => { poly(g, [[-29, -36], [25, -36], [29, -5], [-25, -5]], '#14131c', '#e8b9cb'); g.fillStyle = '#e8b9cb'; g.fillRect(-21, -31, 42, 1);
        word(g, 'L’ORÉAL', 0, -21, 11, '#ffffff', 'normal'); word(g, 'PARIS', 0, -11, 6, '#e8b9cb'); },
      ferrero: (g) => { ell(g, 0, -22, 31, 22, '#b7b29b', '#c4a565'); ell(g, 0, -22, 27, 18, '#b7b29b', '#684224'); word(g, 'FERRERO', 0, -22, 11, '#57351e', 'bold', 'Georgia, serif');
        g.strokeStyle = '#c4a565'; g.beginPath(); g.moveTo(-16, -13); g.lineTo(16, -13); g.stroke(); },
      vetis: (g) => { poly(g, [[0, -49], [25, -39], [22, -10], [0, 5], [-22, -10], [-25, -39]], '#114f47', '#8edbb9'); g.strokeStyle = '#f1d882'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(0, -42); g.lineTo(0, -17); g.stroke(); g.beginPath(); g.moveTo(6, -39); g.bezierCurveTo(-16, -37, 15, -28, -5, -22); g.stroke(); word(g, 'ВЕТИС', 0, -8, 9, '#ffffff'); },
      bug: (g) => { word(g, 'BUG', 0, -22, 22, '#ffd600', 'italic 900'); },
      crpt: (g) => { word(g, 'ЦРПТ', 0, -22, 18, '#ffd600', 'bold', 'Consolas, monospace'); },
    };
    for (const k in D) { const cv = document.createElement('canvas'), sc = 6; cv.width = 70 * sc; cv.height = 64 * sc; const g = cv.getContext('2d'); g.scale(sc, sc); g.translate(35, 52); D[k](g);
      G.canvasTex('emb_' + k, cv); }
  }""")
# ---- props and rigs
rep("const PH = { rack: 230, rack_b: 230, ups: 96, pdu: 96, tank: 104, cart: 116, cart_b: 116, core: 400, cage: 470, crac: 200, tray: 130, firerack: 150, switch: 112 };",
    "const PH = { rack: 230, rack_b: 230, ups: 96, pdu: 96, cell: 112, cart: 116, cart_b: 116, core: 400, cage: 470, crac: 200, tray: 130, firerack: 150, switch: 112, desk: 140, tapelib: 220, patch: 230 };")
rep("    bug:   { body: 84, hex: true, hipY: 10, leg: 34, legW: 10, reach: 44, stride: 70, bob: 2, flip: true },\n  };",
    """    bug:   { body: 84, hex: true, hipY: 10, leg: 34, legW: 10, reach: 44, stride: 70, bob: 2, flip: true },
    mars:    { body: 64, hipY: 25, leg: 30, legW: 14, hipW: 16, foot: [24, 13], shY: 46, shW: 33, arm: 25, armW: 12, bob: 3, flip: true },
    loreal:  { body: 62, hipY: 25, leg: 30, legW: 13, hipW: 17, foot: [24, 13], shY: 44, shW: 40, arm: 24, armW: 12, bob: 3, flip: true },
    multon:  { body: 58, hipY: 24, leg: 29, legW: 12, hipW: 13, foot: [22, 12], shY: 42, shW: 32, arm: 22, armW: 11, bob: 3, flip: true },
    baltika: { body: 94, hipY: 29, leg: 34, legW: 18, hipW: 22, foot: [29, 15], shY: 68, shW: 40, arm: 29, armW: 16, bob: 4, flip: true },
    ferrero: { body: 62, hipY: 25, leg: 30, legW: 14, hipW: 20, foot: [25, 13], shY: 42, shW: 48, arm: 25, armW: 12, bob: 3, flip: true },
    vetis:   { body: 86, hipY: 28, leg: 33, legW: 16, hipW: 18, foot: [27, 14], shY: 60, shW: 38, arm: 28, armW: 14, bob: 4, flip: true },
    bugu:    { body: 82, hipY: 27, leg: 32, legW: 15, hipW: 20, foot: [27, 14], shY: 56, shW: 42, arm: 27, armW: 14, bob: 4, flip: true },
    buga:    { body: 82, hipY: 27, leg: 32, legW: 15, hipW: 20, foot: [27, 14], shY: 56, shW: 44, arm: 27, armW: 14, bob: 4, flip: true },
    crpt:    { body: 200, hipY: 58, leg: 64, legW: 38, hipW: 50, foot: [60, 30], shY: 160, shW: 96, arm: 68, armW: 32, bob: 9, flip: true },
  };""")
rep("  const COL = { node: [0.36, 1.0, 0.6], panel: [1.0, 0.6, 0.19], orb: [0.25, 0.66, 1.0], keg: [1.0, 0.8, 0.3], bug: [0.61, 0.59, 1.0], boss: [1.0, 0.36, 0.36] };\n  const SPLAT = { node: [0.12, 0.42, 0.25], panel: [0.55, 0.32, 0.1], orb: [0.12, 0.25, 0.55], keg: [0.5, 0.38, 0.12], bug: [0.33, 0.24, 0.55], boss: [0.5, 0.12, 0.12] };",
    "  const COL = {}, SPLAT = {}; for (const k in SIM.FOE) { COL[k] = SIM.FOE[k].col; SPLAT[k] = SIM.FOE[k].col.map((v) => v * 0.45); }")
# ---- bodies: neon rim from the zone, emblem on the plain area (upright)
rep("rim: [0.25 + 0.55 * o.lit, -0.004 * face, -0.005, 1], rimCol: AMBER, alpha: fade };\n    const uL",
    "rim: [0.35 + 0.45 * o.lit, -0.004 * face, -0.005, 1], rimCol: o.rimCol || AMBER, alpha: fade };\n    const uL")
rep("      L.sprite(o.k + '_body', 0, 0, { m: M.of(M.t(cx, gy - hipY + 6), M.r(tilt), M.s(R0.flip && face < 0 ? -1 : 1, 1)), w: bw, h: bh, pivot: [bw / 2, bh], u });",
    """      L.sprite(o.k + '_body', 0, 0, { m: M.of(M.t(cx, gy - hipY + 6), M.r(tilt), M.s(R0.flip && face < 0 ? -1 : 1, 1)), w: bw, h: bh, pivot: [bw / 2, bh], u });
      const em = EMB_AT[o.k]; if (em && !L.sp) { const tx = G.tex('emb_' + em[2]), ew = bw * em[1], eh = ew * tx.h / tx.w;
        L.sprite('emb_' + em[2], 0, 0, { m: M.of(M.t(cx, gy - hipY + 6), M.r(tilt), M.t(0, -bh * (1 - em[0]))), w: ew, h: eh, pivot: [ew / 2, eh * 0.62], u: Object.assign({}, u, { rim: [0, 0, 0, 0] }) }); }""")
# ---- floor: the cyber grid instead of the painted tile; glowing fibre trunks with packets
rep("    L.sprite('ground_tex', 0, 0, { w: W, h: H, src: [cx / TILE, cy / TILE, (cx + W) / TILE, (cy + H) / TILE], u: { grade: [0.75, 0.86, 0.16, 1.05], haze: [0.42, 0.34, 0.3] } });\n    for (const c of SIM.CABLES) for (let j = 0; j < c.length - 1; j++) { const [x0, y0] = c[j], [x1, y1] = c[j + 1], len = Math.hypot(x1 - x0, y1 - y0), an = Math.atan2(y1 - y0, x1 - x0);\n      if (!onS((x0 + x1) / 2, (y0 + y1) / 2, len)) continue;\n      L.solid(sx(x0), sy(y0) - 7, len, 14, [0.035, 0.04, 0.06], an, 0, 7, 0.9); L.solid(sx(x0), sy(y0) - 4, len, 3, [0.12, 0.14, 0.2], an, 0, 4, 0.8); }",
    """    G.draw(L.P.cyber, Object.assign({ u_cam: [cx, cy], u_t: t }, ZU), G.xf(0, 0, W, H));
    for (const c of SIM.CABLES) for (let j = 0; j < c.length - 1; j++) { const [x0, y0] = c[j], [x1, y1] = c[j + 1], len = Math.hypot(x1 - x0, y1 - y0), an = Math.atan2(y1 - y0, x1 - x0);
      if (!onS((x0 + x1) / 2, (y0 + y1) / 2, len)) continue; const zc = zcol((x0 + x1) / 2, (y0 + y1) / 2);
      L.solid(sx(x0), sy(y0) - 9, len, 18, [0.02, 0.03, 0.04], an, 0, 9, 0.95); L.solid(sx(x0), sy(y0) - 2, len, 4, zc, an, 0, 2, 0.55);
      G.blend('add'); for (let q = 0; q < len; q += 260) { const u = ((q + t * 380 + j * 97) % len) / len, px = x0 + (x1 - x0) * u, py = y0 + (y1 - y0) * u;
        if (onS(px, py, 40)) { L.glow(sx(px), sy(py), 26, zc, 0.9, 3); L.glow(sx(px), sy(py), 8, [1, 1, 1], 0.9, 4); } } G.blend(); }
    for (const [x, y, r] of SIM.RINGS) { if (!onS(x, y, r + 100)) continue; const zc = zcol(x, y), pu = 0.5 + 0.5 * Math.sin(t * 1.3 + x);
      L.ring(sx(x), sy(y), r, r * 0.62, zc, 0.35 + 0.15 * pu, 0.012); L.ring(sx(x), sy(y), r * 0.82, r * 0.82 * 0.62, zc, 0.6, 0.03); }""")
rep("        if (k === 0) L.puff(x, y, 18 + 26 * rnd(i, j + 1), rnd(i, j + 4) > 0.5 ? [0.16, 0.36, 0.22] : [0.15, 0.27, 0.45], 0.55, i * 31 + j);",
    "        if (k === 0) L.puff(x, y, 18 + 26 * rnd(i, j + 1), zcol(i * C, j * C).map((v) => v * 0.35), 0.45, i * 31 + j);")
# ---- telegraphs on the floor: every pulse foe (boss or not), mortar shells in flight
rep("    for (const e of ST.E) if (e.k === 'boss' && e.atkT >= 0 && e.dieT < 0) { const q = clamp01((GT - e.atkT) / (SIM.FOE.boss.wind * Math.pow(0.85, e.lvl))), r = SIM.FOE.boss.range;\n      L.ring(sx(e.x), sy(e.y), r, r * 0.66, [1, 0.25, 0.2], 0.9, 0.04); pool(sx(e.x), sy(e.y), r * q, r * 0.66 * q, [1, 0.2, 0.15], 0.35, 1.5); }",
    """    for (const e of ST.E) { const f = SIM.FOE[e.k]; if (f.kind !== 'pulse' || e.atkT < 0 || e.dieT >= 0 || !onS(e.x, e.y, 400)) continue;
      const q = clamp01((GT - e.atkT) / (f.wind * (f.boss ? Math.pow(0.85, e.lvl) : 1))), r = f.range, c = f.col;
      L.ring(sx(e.x), sy(e.y), r, r * 0.66, c, 0.9, 0.04); pool(sx(e.x), sy(e.y), r * q, r * 0.66 * q, c, 0.35, 1.5); }""")
# neon light pools in the zone's colour
rep("    lamps.forEach(([x, y], i) => { const f = flick(i + Math.round(x)); pool(sx(x), sy(y) + 10, 300, 190, AMBER, 0.4 * f, 1.6); pool(sx(x), sy(y) + 10, 190, 120, [1, 0.8, 0.5], 0.3 * f, 0.9); });",
    "    lamps.forEach(([x, y], i) => { const f = flick(i + Math.round(x)), zc = zcol(x, y); pool(sx(x), sy(y) + 10, 300, 190, zc, 0.22 * f, 1.6); pool(sx(x), sy(y) + 10, 170, 105, L.lerpP(zc, [1, 1, 1], 0.5), 0.16 * f, 1.0); });")
# props: zone-coloured rim; energy cells instead of gas tanks
rep("      L.sprite(k, sx(x) - w / 2, sy(y) - h, { w, h, flip: !!f, u: { grade: [0.9, 0.62 + 0.55 * l, 0, 1], rim: [0.35 * l, 0.004, -0.004, 1], rimCol: AMBER } });",
    "      L.sprite(k, sx(x) - w / 2, sy(y) - h, { w, h, flip: !!f, u: { grade: [0.9, 0.7 + 0.45 * l, 0, 1], rim: [0.45, 0.004, -0.004, 1], rimCol: zcol(x, y) } });")
rep("      if (o.hp > 0 || o.boom < 0) { const sh = o.hp < 30 && o.hp > 0 ? Math.sin(GT * 60) * 2 : 0; const [w, h] = sizeOf('tank', Z.tank[1]); L.sprite('tank', sx(x) - w / 2 + sh, sy(y) - h, { w, h, u: { grade: [1, 0.7 + 0.5 * lit(x, y), 0, 1] } }); }",
    """      if (o.hp > 0 || o.boom < 0) { const hurt = o.hp < 30 && o.hp > 0, sh = hurt ? Math.sin(GT * 60) * 2 : 0; const [w, h] = sizeOf('cell', Z.cell[1]);
        L.sprite('cell', sx(x) - w / 2 + sh, sy(y) - h, { w, h, u: { grade: [1, 0.8 + 0.4 * lit(x, y), 0, 1], rim: [0.45, 0.004, -0.004, 1], rimCol: zcol(x, y) } });
        const pu = 0.6 + 0.4 * Math.sin(t * (hurt ? 14 : 2.4) + i), cc = hurt ? [1, 0.35, 0.9] : [0.4, 0.95, 1]; L.glow(sx(x) + sh, sy(y) - h * 0.52, 34, cc, 0.7 * pu, 3); }""")
# foes: zone rim
rep("const o = { k: e.k, x: X, y: Y, face: e.face, dist: e.dist, g: e.fly ? 0.6 : e.g, ux: e.ux, uy: e.uy, t, ph: e.ph, die, z, hit, lit: l, wind, strike, id: S.TRACE_IDS ? 'e' + e.id : null };",
    "const o = { k: e.k, x: X, y: Y, face: e.face, dist: e.dist, g: e.fly ? 0.6 : e.g, ux: e.ux, uy: e.uy, t, ph: e.ph, die, z, hit, lit: l, wind, strike, rimCol: zcol(e.x, e.y), id: S.TRACE_IDS ? 'e' + e.id : null };\n        if (wind > 0 && (f.kind === 'shoot' || f.kind === 'mortar')) L.glow(X, Y - z - R0.hipY - R0.body * 0.5, 30 + 40 * wind, f.col, 0.9 * wind, 3);")
# hero: slowed tint, zone rim
rep("hit: clamp01(1 - (GT - ST.hurtT) / 0.12), lit: l, aimHand: hs, after: null, id: S.TRACE_IDS ? 'hero' : null };",
    "hit: clamp01(1 - (GT - ST.hurtT) / 0.12), lit: l, aimHand: hs, after: null, rimCol: zcol(ST.x, ST.y), id: S.TRACE_IDS ? 'hero' : null };\n      if (GT < ST.slowT) { L.glow(X, Y - 50, 70, [0.45, 0.75, 1], 0.45, 2); for (let j = 0; j < 3; j++) L.puff(X + (rnd(Math.floor(GT * 8), j) - 0.5) * 60, Y - 20 - j * 18, 8, [0.7, 0.85, 1], 0.4, j); }")
# foe bullets in their owner's colour; holograms over the monitoring desks
rep("    for (const b of ST.EB) { const X = sx(b.x), Y = sy(b.y); L.glow(X, Y, 34, [1, 0.3, 0.2], 0.9, 3); L.glow(X, Y, 12, [1, 0.9, 0.7], 1, 4); }",
    """    for (const b of ST.EB) { const X = sx(b.x), Y = sy(b.y), c = (SIM.FOE[b.c] || SIM.FOE.boss).col; L.glow(X, Y, 34, c, 0.9, 3); L.glow(X, Y, 12, [1, 0.95, 0.85], 1, 4); }
    for (const m of ST.MK) { const q = clamp01((GT - m.t0) / m.delay); if (m.ox === undefined || q >= 1) continue;                 // mortar shells on their arc
      const X = sx(m.ox + (m.x - m.ox) * q), Y = sy(m.oy + (m.y - m.oy) * q) - 320 * 4 * q * (1 - q); L.glow(X, Y, 26, [1, 0.6, 0.3], 0.9, 3); L.glow(X, Y, 9, [1, 1, 0.9], 1, 4); }
    G.blend('add'); for (const [x, y, k] of SIM.HOLOS) { if (!onS(x, y, 200)) continue; const zc = zcol(x, y), X = sx(x), Y = sy(y), fl = 0.75 + 0.25 * Math.sin(t * 7 + x) * Math.sin(t * 2.1 + y);
      L.solid(X - 90, Y - 50, 180, 100, zc, 0, 0, 0, 0.12 * fl); for (let j = 0; j < 10; j++) L.solid(X - 90, Y - 50 + j * 10 + ((t * 20) % 10), 180, 1.5, zc, 0, 0, 0, 0.18 * fl);
      for (const [a, b] of [[-90, -50], [90, -50], [-90, 50], [90, 50]]) L.glow(X + a, Y + b, 10, zc, 0.8, 4);
      for (let j = 0; j < 9; j++) { const x0 = X - 70 + j * 16, v0 = Math.sin(t * 1.7 + j * 0.9 + k * 3) * 22, v1 = Math.sin(t * 1.7 + (j + 1) * 0.9 + k * 3) * 22;
        L.solid(x0, Y + v0, Math.hypot(16, v1 - v0), 2.5, [1, 1, 1], Math.atan2(v1 - v0, 16), 0, 1.2, 0.6 * fl); }
      L.solid(X - 2, Y + 50, 4, 70, zc, 0, 0, 0, 0.25 * fl); } G.blend();""")
# event FX: pulses, shots, wall sparks, electric energy-cell blasts
rep("      if (e.k === 'summon' && a < 0.6) {",
    """      if (e.k === 'pulse' && a < 0.5) { const q = a / 0.5, c = COL[e.ty] || [1, 1, 1]; L.ring(X, Y, e.r * (0.3 + 0.8 * q), e.r * 0.66 * (0.3 + 0.8 * q), c, 1 - q, 0.07); pool(X, Y, e.r, e.r * 0.66, c, 0.4 * (1 - q), 1.5); }
      if (e.k === 'fire' && a < 0.12) L.star(X, Y, 36, [1, 0.9, 0.7], 1 - a / 0.12);
      if (e.k === 'spark' && a < 0.25) { const q = a / 0.25; for (let j = 0; j < 5; j++) { const an = rnd(e.t, j) * 6.28; L.solid(X + Math.cos(an) * 20 * q, Y + Math.sin(an) * 20 * q, 6, 2, [1, 0.9, 0.6], an, 0, 1, 1 - q); } }
      if (e.k === 'summon' && a < 0.6) {""")
rep("        if (a < 0.15) L.glow(X, Y, 380, [1, 0.7, 0.35], 1.6 * (1 - a / 0.15), 1.6);",
    """        if (a < 0.15) L.glow(X, Y, 380, [0.6, 0.9, 1], 1.6 * (1 - a / 0.15), 1.6);
        if (a < 0.45) for (let j = 0; j < 7; j++) { let px = X, py = Y - 40; const an = j * 0.9 + e.i, len = 60 + 160 * rnd(e.i, j);              // arcs of the overloaded cell
          for (let s = 0; s < 5; s++) { const nx = px + Math.cos(an) * len / 5 + (rnd(Math.floor(GT * 30) + s, j) - 0.5) * 26, ny = py + Math.sin(an) * len / 5 * 0.6 + (rnd(s, Math.floor(GT * 30) + j) - 0.5) * 20;
            L.solid(px, py, Math.hypot(nx - px, ny - py), 3, [0.75, 0.95, 1], Math.atan2(ny - py, nx - px), 0, 1.5, 1 - a / 0.45); px = nx; py = ny; } }""")
rep("          col = L.lerpP([1, 0.9, 0.55], L.lerpP([1, 0.45, 0.15], [0.12, 0.1, 0.12], clamp01((a - 0.25) / 0.6)), clamp01(a * 5));",
    "          col = L.lerpP([0.9, 1, 1], L.lerpP([0.45, 0.6, 1], [0.1, 0.08, 0.16], clamp01((a - 0.25) / 0.6)), clamp01(a * 5));")
rep("        L.glow(X, Y - 50, 260 * (0.6 + q), [1, 0.5, 0.18], 1.3 * (1 - q) * (1 - q), 1.3);",
    "        L.glow(X, Y - 50, 260 * (0.6 + q), [0.35, 0.75, 1], 1.3 * (1 - q) * (1 - q), 1.3);")
# HUD: the boss bar names the boss on the field
rep("const nm = SIM.FOE.boss.name.toUpperCase() + (B.lvl ? ' · ЭСКАЛАЦИЯ ' + B.lvl : '');", "const nm = SIM.FOE[B.k].name.toUpperCase() + (B.lvl ? ' · ЭСКАЛАЦИЯ ' + B.lvl : '');")
# QA: every foe type gets a walk cycle
rep("actors = ['hero', 'node', 'panel', 'orb', 'keg', 'bug', 'boss'];", "actors = ['hero', ...Object.keys(SIM.FOE)];")
open(p, 'w', encoding='utf-8').write(s); print('scene patched')
