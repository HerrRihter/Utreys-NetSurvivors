# Round 4: one cyber-digital look. Palette: near-black blue-teal base, cyan #00e5ff primary, mint #64ffda secondary, coral #ff6559
# for enemy attacks, yellow #ffd600 only for hazards. Every edit must match exactly once (or the stated count).
import os, re
os.chdir(os.path.join(os.path.dirname(__file__), '..'))

p = 'live/sim.js'; s = open(p, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    if p.endswith('sim.js') and s.count(a) == 0 and s.count(b) >= 1: return      # already applied
    assert s.count(a) == n, (p, a[:80], s.count(a)); s = s.replace(a, b)
rep("col: [0.2, 0.9, 1.0], name: 'СЕРВЕРНЫЙ ЗАЛ А'", "col: [0.0, 0.9, 1.0], name: 'СЕРВЕРНЫЙ ЗАЛ А'")
rep("col: [0.35, 0.6, 1.0], name: 'ЗОНА ОХЛАЖДЕНИЯ'", "col: [0.39, 1.0, 0.85], name: 'ЗОНА ОХЛАЖДЕНИЯ'")
rep("col: [1.0, 0.72, 0.25], name: 'ЭНЕРГОБЛОК'", "col: [1.0, 0.84, 0.0], name: 'ЭНЕРГОБЛОК'")
rep("col: [1.0, 0.35, 0.85], name: 'NOC / ХРАНИЛИЩЕ'", "col: [0.45, 0.8, 1.0], name: 'NOC / ХРАНИЛИЩЕ'")
rep("const PLAZA = { col: [0.3, 1.0, 0.65] };", "const PLAZA = { col: [0.0, 0.9, 1.0] };")
open(p, 'w', encoding='utf-8').write(s)

p = 'live/scene.js'; s = open(p, encoding='utf-8').read()
CY, MINT, CORAL, HAZ = '[0.0, 0.9, 1.0]', '[0.39, 1.0, 0.85]', '[1.0, 0.4, 0.35]', '[1.0, 0.84, 0.0]'
rep("INK = [0.15, 0.07, 0.08]", "INK = [0.02, 0.06, 0.09], CYAN = [0.0, 0.9, 1.0], MINT = [0.39, 1.0, 0.85], CORAL = [1.0, 0.4, 0.35], HAZ = [1.0, 0.84, 0.0]")
# ---- floor: one palette, a pattern per zone (server: perforated tiles, cooling: hex mesh, power: rails and stripes, NOC: fine grid)
rep("  col += mix(zc, vec3(1.0), 0.5) * (px + py) * 0.9;\n  o = vec4(col, 1.0); }`;",
    """  col += mix(zc, vec3(1.0), 0.5) * (px + py) * 0.9;
  float k0 = inZ(w, u_z0), k1 = inZ(w, u_z1), k2 = inZ(w, u_z2), k3 = inZ(w, u_z3);
  vec2 q = fract(w / 14.0) - 0.5; float dots = 1.0 - smoothstep(0.16, 0.22, length(q));                              // perforation
  vec2 hx = w / 46.0; hx.x *= 1.1547; hx.y += mod(floor(hx.x), 2.0) * 0.5; vec2 hf = abs(fract(hx) - 0.5);
  float hexl = 1.0 - smoothstep(0.0, 0.05, abs(max(hf.x * 1.5 + hf.y, hf.y * 2.0) - 1.0));                            // hex mesh
  float diag = gl(w.x + w.y, 90.0, 6.0), rail = max(gl(w.y, 500.0, 9.0), gl(w.x, 500.0, 9.0)) - major;                 // power stripes and rails
  float fine = max(gl(w.x, 25.0, 0.8), gl(w.y, 25.0, 0.8));                                                           // NOC fine grid
  col += zc * (k0 * dots * 0.05 * (0.5 + 0.5 * step(0.55, h)) + k1 * hexl * 0.1 + k2 * (diag * 0.05 + max(rail, 0.0) * 0.18) + k3 * fine * 0.05);
  o = vec4(col, 1.0); }`;""")
# ---- floor lettering: holographic cyan, monospace, glow, no paint
rep("      g.fillStyle = 'rgba(225,215,190,0.95)'; g.fillText(st.s, 30, h * 0.44); g.fillStyle = 'rgba(200,60,50,0.9)'; g.fillRect(20, h * 0.82, w * 0.62, st.sz * 0.16);",
    "      g.shadowColor = '#00e5ff'; g.shadowBlur = st.sz * 0.25; g.fillStyle = 'rgba(160,250,255,0.95)'; g.fillText(st.s, 30, h * 0.44); g.shadowBlur = 0; g.fillStyle = 'rgba(0,229,255,0.8)'; g.fillRect(20, h * 0.82, w - 40, 3);")
rep("        px[k + 3] *= n < 0.28 ? 0 : n < 0.4 ? 0.5 : 1; }", "        px[k + 3] *= (y % 4 < 1) ? 0.45 : 1; }                                                // scanlines, not scuffs")
rep("f = `900 ${st.sz}px ${FONT}`;", "f = `bold ${st.sz}px ${MONO}`;")
rep("  const FONT = '\"Trebuchet MS\", \"Segoe UI\", Verdana, sans-serif';", "  const FONT = 'Consolas, \"Cascadia Mono\", \"Courier New\", monospace', MONO = FONT;")
rep("      L.sprite('stencil_' + i, sx(st.x) - tx.w / 2, sy(st.y) - tx.h / 2, { w: tx.w, h: tx.h, rot: st.rot, pivot: [tx.w / 2, tx.h / 2], u: { alpha: 0.78, grade: [1, 1.05, 0, 1.1] } }); });",
    "      G.blend('add'); L.sprite('stencil_' + i, sx(st.x) - tx.w / 2, sy(st.y) - tx.h / 2, { w: tx.w, h: tx.h, rot: st.rot, pivot: [tx.w / 2, tx.h / 2], u: { alpha: 0.42 + 0.08 * Math.sin(t * 9 + i * 2) * (rnd(Math.floor(t * 4), i) > 0.8 ? 1 : 0.2) } }); G.blend(); });")
# ---- row tape becomes a neon strip; litter becomes dark cable scraps and grime only
rep("      const a = Math.max(x0, cx - 40), b = Math.min(x1, cx + W + 40); L.solid(sx(a), sy(y0) - 7, b - a, 14, [0.85, 0.66, 0.12], 0, 0, 0, 0.75);\n      for (let x = Math.floor(a / 56) * 56; x < b; x += 56) L.solid(sx(x), sy(y0) - 7, 22, 14, [0.06, 0.05, 0.05], 0, 0, 0, 0.8); }",
    "      const a = Math.max(x0, cx - 40), b = Math.min(x1, cx + W + 40), zc = zcol((x0 + x1) / 2, y0); L.solid(sx(a), sy(y0) - 2, b - a, 3, zc, 0, 0, 0, 0.7);\n      G.blend('add'); for (let x = Math.floor(a / 80) * 80; x < b; x += 80) L.glow(sx(x + ((t * 120) % 80)), sy(y0), 14, zc, 0.6, 3); G.blend(); }")
rep("        if (k === 0) L.puff(x, y, 18 + 26 * rnd(i, j + 1), zcol(i * C, j * C).map((v) => v * 0.35), 0.45, i * 31 + j);\n        else if (k === 1) L.solid(x, y, 14, 10, [0.55, 0.53, 0.48], an, 7, 5, 0.75);",
    "        if (k <= 1) continue;")
rep("        else if (k === 3) for (let q = 0; q < 3; q++) L.solid(x + q * 9, y + (q % 2) * 6, 5, 5, [0.5, 0.48, 0.42], an + q, 2.5, 2.5, 0.8);",
    "        else if (k === 3) continue;")
# ---- data splats: pixels of dead data in mint instead of coloured goo
rep("      if (d.k === 0) { const c = SPLAT[d.ty] || [0.2, 0.3, 0.2]; for (let j = 0; j < 4; j++) L.puff(sx(d.x) + (rnd(d.s, j) - 0.5) * 44, sy(d.y) + (rnd(d.s, j + 5) - 0.5) * 16, 10 + 16 * rnd(d.s, j + 9), c, 0.55 * f * Math.min(1, a * 6), d.s * 10 + j); }",
    "      if (d.k === 0) { for (let j = 0; j < 9; j++) { const z = 4 + 6 * rnd(d.s, j + 9); L.solid(sx(d.x) + (rnd(d.s, j) - 0.5) * 60 - z / 2, sy(d.y) + (rnd(d.s, j + 5) - 0.5) * 22 - z / 2, z, z, j % 3 ? MINT : CYAN, 0, 0, 0, 0.35 * f * Math.min(1, a * 6)); } }")
# ---- hero weapons cyan/mint, enemy attacks coral
rep("pool(sx(m.x), sy(m.y) - 4, 22, 14, [1, 0.25, 0.2], 0.5 * bl, 3); }", "pool(sx(m.x), sy(m.y) - 4, 22, 14, CYAN, 0.6 * bl, 3); }")
rep("pool(sx(z.x), sy(z.y), z.r * 1.15, z.r * 0.72, [1, 0.45, 0.12], 0.55 * q, 1.6); L.ring(sx(z.x), sy(z.y), z.r, z.r * 0.62, [1, 0.6, 0.2], 0.8 * q, 0.06); }",
    "pool(sx(z.x), sy(z.y), z.r * 1.15, z.r * 0.72, MINT, 0.45 * q, 1.6); L.ring(sx(z.x), sy(z.y), z.r, z.r * 0.62, MINT, 0.8 * q, 0.06); }")
rep("      L.ring(sx(m.x), sy(m.y), m.r, m.r * 0.7, [1, 0.2, 0.15], 0.9, 0.05); L.ring(sx(m.x), sy(m.y), m.r * (1 - q), m.r * 0.7 * (1 - q), [1, 0.4, 0.3], 0.8, 0.12);\n      pool(sx(m.x), sy(m.y), m.r, m.r * 0.7, [1, 0.15, 0.1], 0.25 + 0.3 * q, 2); }",
    "      L.ring(sx(m.x), sy(m.y), m.r, m.r * 0.7, CORAL, 0.9, 0.05); L.ring(sx(m.x), sy(m.y), m.r * (1 - q), m.r * 0.7 * (1 - q), CORAL, 0.8, 0.12);\n      pool(sx(m.x), sy(m.y), m.r, m.r * 0.7, CORAL, 0.2 + 0.3 * q, 2); }")
rep("const q = clamp01((GT - e.atkT) / (f.wind * (f.boss ? Math.pow(0.85, e.lvl) : 1))), r = f.range, c = f.col;", "const q = clamp01((GT - e.atkT) / (f.wind * (f.boss ? Math.pow(0.85, e.lvl) : 1))), r = f.range, c = CORAL;")
rep("if (wind > 0 && (f.kind === 'shoot' || f.kind === 'mortar')) L.glow(X, Y - z - R0.hipY - R0.body * 0.5, 30 + 40 * wind, f.col, 0.9 * wind, 3);", "if (wind > 0 && (f.kind === 'shoot' || f.kind === 'mortar')) L.glow(X, Y - z - R0.hipY - R0.body * 0.5, 30 + 40 * wind, CORAL, 0.9 * wind, 3);")
rep("const X = sx(b.x), Y = sy(b.y), c = (SIM.FOE[b.c] || SIM.FOE.boss).col;", "const X = sx(b.x), Y = sy(b.y), c = CORAL;")
rep("L.glow(X, Y, 26, [1, 0.6, 0.3], 0.9, 3); L.glow(X, Y, 9, [1, 1, 0.9], 1, 4); }", "L.glow(X, Y, 26, CORAL, 0.9, 3); L.glow(X, Y, 9, [1, 0.95, 0.9], 1, 4); }")
rep("u_age: q, u_col: [1, 0.3, 0.22] }", "u_age: q, u_col: CYAN }")
rep("[0.62, 0.55, 1], 0.5 * (1 - j / 7), 3);", "MINT, 0.5 * (1 - j / 7), 3);")
rep("L.glow(X, Y, 30, [0.7, 0.6, 1], 0.9, 3); L.sprite('ic_homing'", "L.glow(X, Y, 30, CYAN, 0.9, 3); L.sprite('ic_homing'")
rep("L.glow(X, Y, 40, [1, 0.75, 0.3], 0.6, 3); SH(X, Y + 46", "L.glow(X, Y, 40, CYAN, 0.6, 3); SH(X, Y + 46")
rep("L.star(X, Y, 30, [0.8, 0.7, 1], 1 - a / 0.25); L.ring(X, Y, 10 + 40 * a / 0.25, 10 + 40 * a / 0.25, [0.7, 0.6, 1], 1 - a / 0.25, 0.1); }",
    "L.star(X, Y, 30, [0.85, 1, 1], 1 - a / 0.25); L.ring(X, Y, 10 + 40 * a / 0.25, 10 + 40 * a / 0.25, CYAN, 1 - a / 0.25, 0.1); }")
rep("const c = COL[e.ty] || [1, 1, 1], q = a / 0.3, r = 30 + 50 * q; L.ring(X, Y - 20, r, r * 0.7, c, 1 - q, 0.12); }", "const q = a / 0.3, r = 30 + 50 * q; L.ring(X, Y - 20, r, r * 0.7, CORAL, 1 - q, 0.12); }")
rep("const q = a / 0.5, c = COL[e.ty] || [1, 1, 1]; L.ring(X, Y,", "const q = a / 0.5, c = CORAL; L.ring(X, Y,")
rep("if (e.k === 'kill' && a < 0.7 && !e.fly) { const q = a / 0.7, c = COL[e.ty] || [1, 1, 1];", "if (e.k === 'kill' && a < 0.7 && !e.fly) { const q = a / 0.7, c = MINT;")
s = s.replace("[1, 0.85, 0.5], an, 0, 1.5, 1 - q); }", "[0.8, 1, 1], an, 0, 1.5, 1 - q); }")
# ---- actors: cool tint, cyan rim, navy line on the hero
rep("const u = { grade: [1, 0.78 + 0.5 * o.lit, o.hit, 1], haze: [1, 1, 1], rim: [0.35 + 0.45 * o.lit, -0.004 * face, -0.005, 1], rimCol: o.rimCol || AMBER, alpha: fade };",
    "const u = { grade: [0.9, 0.8 + 0.4 * o.lit, o.hit, 1.05], haze: [1, 1, 1], tint: [0.82, 0.95, 1.1, 0.35], rim: [0.6, -0.004 * face, -0.005, 1.2], rimCol: o.rimCol || CYAN, alpha: fade };")
rep("const uL = Object.assign({}, u, { grade: [1, 0.7 + 0.45 * o.lit, o.hit, 1] });", "const uL = Object.assign({}, u, { grade: [0.85, 0.7 + 0.4 * o.lit, o.hit, 1] });")
rep("const uu = dark ? Object.assign({}, u, { tint: [0.72, 0.72, 0.8, 1] }) : u;", "const uu = dark ? Object.assign({}, u, { tint: [0.62, 0.72, 0.85, 1] }) : u;")
rep("const u = { grade: [1, 0.78 + 0.5 * o.lit, o.hit, 1], haze: [1, 1, 1], rim: [0.3 + 0.5 * o.lit, -0.004 * face, -0.005, 1], rimCol: AMBER, alpha: fade };",
    "const u = { grade: [0.9, 0.8 + 0.4 * o.lit, o.hit, 1.05], haze: [1, 1, 1], tint: [0.82, 0.95, 1.1, 0.35], rim: [0.6, -0.004 * face, -0.005, 1.2], rimCol: o.rimCol || CYAN, alpha: fade };")
# props: the same cool treatment (until regenerated in the v2 style)
rep("u: { grade: [0.9, 0.7 + 0.45 * l, 0, 1], rim: [0.45, 0.004, -0.004, 1], rimCol: zcol(x, y) } });",
    "u: { grade: [0.75, 0.72 + 0.4 * l, 0, 1.05], tint: [0.8, 0.95, 1.12, 0.4], rim: [0.55, 0.004, -0.004, 1.2], rimCol: zcol(x, y) } });")
# ---- grade: no warm tint, bloom for the emissive details
rep("L.finish(t, { bloom: [0.2, 0.18], vignette: 0.72, warm: 1, roll: 1, dither: 1 });", "zoneFx(t, cx, cy, sx, sy, onS, rnd);\n    L.finish(t, { bloom: [0.3, 0.26], vignette: 0.78, warm: 0, roll: 1, dither: 1 });")
# ---- ambient life per zone: mist at the cooling units, arcs in the power block, data rain over NOC
rep("  // draws a group under a 2D affine around the scene",
    """  function zoneFx(t, cx, cy, sx, sy, onS, rnd) {
    for (const [k, x, y] of SIM.PROPS) { if (!onS(x, y, 200)) continue;
      if (k === 'crac') for (let j = 0; j < 3; j++) { const ph = (t * 0.35 + j / 3 + (x % 7) * 0.1) % 1; L.puff(sx(x) + (j - 1) * 40 + 30 * ph, sy(y) - 190 - 90 * ph, 30 + 40 * ph, [0.6, 1, 0.92], 0.12 * Math.sin(Math.PI * ph), x + j); }
      if (k === 'ups') { const w = Math.floor(t * 1.7 + x * 0.01); if (rnd(w, x) > 0.85) { const a = (t * 1.7 + x * 0.01) % 1; if (a < 0.25) { let px = sx(x) - 60, py = sy(y) - 90;
        G.blend('add'); for (let s2 = 0; s2 < 6; s2++) { const nx = px + 22, ny = sy(y) - 90 + (rnd(w + s2, x) - 0.5) * 30; L.solid(px, py, Math.hypot(nx - px, ny - py), 2.5, [1, 0.95, 0.6], Math.atan2(ny - py, nx - px), 0, 1.2, 1 - a / 0.25); px = nx; py = ny; } G.blend(); } } } }
    const z = SIM.ZONES[3]; if (onS((z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2, 2600)) { G.blend('add');                    // data rain over NOC
      for (let i = 0; i < 70; i++) { const wx = z.x0 + ((i * 397) % (z.x1 - z.x0)), sp = 260 + 200 * rnd(i, 3), wy = z.y0 + ((t * sp + i * 911) % (z.y1 - z.y0));
        if (!onS(wx, wy, 0)) continue; for (let j = 0; j < 6; j++) L.solid(sx(wx), sy(wy) - j * 16, 3, 10, [0.45, 0.85, 1], 0, 0, 0, 0.5 * (1 - j / 6)); } G.blend(); }
  }
  // draws a group under a 2D affine around the scene""")
# ---- emblems as neon signs: dark plate, glowing contour and lettering in the brand colour
rep("    const neon = (g, c) => { g.save(); g.strokeStyle = c; g.globalAlpha = 0.14; g.lineWidth = 6.5; g.stroke(); g.globalAlpha = 1; g.lineWidth = 1.5; g.stroke(); g.restore(); };\n    const word = (g, t, x, y, sz, c, wt = 'bold', fam = 'Arial, sans-serif') => { g.font = `${wt} ${sz}px ${fam}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = c; g.fillText(t, x, y); };\n    const ell = (g, x, y, rx, ry, fill, st) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); if (st) neon(g, st); };\n    const poly = (g, pts, fill, st) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = fill; g.fill(); if (st) neon(g, st); };",
    """    const neon = (g, c) => { g.save(); g.shadowColor = c; g.shadowBlur = 4; g.strokeStyle = c; g.lineWidth = 2; g.stroke(); g.restore(); };
    const word = (g, t, x, y, sz, c, wt = 'bold', fam = 'Arial, sans-serif') => { g.save(); g.font = `${wt} ${sz}px ${fam}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = c; g.shadowBlur = 3; g.fillStyle = c; g.fillText(t, x, y); g.restore(); };
    const plate = 'rgba(6,16,24,0.88)';
    const ell = (g, x, y, rx, ry, fill, st) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = plate; g.fill(); neon(g, st || fill); };
    const poly = (g, pts, fill, st) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = plate; g.fill(); neon(g, st || fill); };""")
rep("      mars: (g) => { g.fillStyle = '#d6322e'; g.fillRect(-26, -40, 52, 36); g.strokeStyle = '#ffeb3b'; g.lineWidth = 3; g.strokeRect(-26, -40, 52, 36); word(g, 'M', 0, -22, 22, '#ffeb3b', 'italic 900'); },\n      inbev: (g) => { g.fillStyle = '#5a0a0a'; g.fillRect(-28, -40, 56, 34); g.strokeStyle = '#d4af37'; g.lineWidth = 4; g.strokeRect(-24, -37, 48, 28); word(g, 'INBEV', 0, -23, 12, '#ffd700'); },",
    "      mars: (g) => { poly(g, [[-26, -40], [26, -40], [26, -4], [-26, -4]], '#ff4a3d'); word(g, 'M', 0, -22, 22, '#ffeb3b', 'italic 900'); },\n      inbev: (g) => { poly(g, [[-28, -40], [28, -40], [28, -6], [-28, -6]], '#d4af37'); word(g, 'INBEV', 0, -23, 12, '#ffd700'); },")
rep("ell(g, 0, -22, 31, 22, '#b7b29b', '#c4a565'); ell(g, 0, -22, 27, 18, '#b7b29b', '#684224'); word(g, 'FERRERO', 0, -22, 11, '#57351e', 'bold', 'Georgia, serif');",
    "ell(g, 0, -22, 31, 22, '#b7b29b', '#e2c27a'); word(g, 'FERRERO', 0, -22, 11, '#f0d9a8', 'bold', 'Georgia, serif');")
rep("word(g, 'multon', 0, -24, 12, '#154c72'); word(g, 'partners', 0, -12, 7, '#154c72');", "word(g, 'multon', 0, -24, 12, '#7fc4ff'); word(g, 'partners', 0, -12, 7, '#7fc4ff');")
rep("ell(g, 0, -22, 25, 29, '#072d72', '#e5c76f');", "ell(g, 0, -22, 25, 29, '#3a7bff', '#e5c76f');")
# ---- HUD: terminal look (monospace, dark translucent panels, cyan frames)
i0 = s.index("  // ---------------- HUD ----------------"); i1 = s.index("  // ---------------- QA hooks")
H = s[i0:i1]
H = H.replace("L.label(", "label(")
H = H.replace("""  function bar(id, x, y, w, h, q, c0, c1, label, size, tc) { L.uiBox(id, x - 4, y - 4, w + 8, h + 8, 2);
    L.rrect(x - 4, y - 4, w + 8, h + 8, (h + 8) / 2, [0.05, 0.04, 0.06], [0.1, 0.08, 0.1]); L.rrect(x, y, w, h, h / 2, [0.12, 0.1, 0.14]);
    if (q > 0.005) L.rrect(x, y, Math.max(h, w * q), h, h / 2, c0, c1);""",
"""  const label = (slot, str, x, y, o = {}) => L.label(slot, str, x, y, Object.assign({ font: MONO, out: '#02090d' }, o));
  const frame = (x, y, w, h, a = 0.85, c = CYAN) => { L.rrect(x - 2, y - 2, w + 4, h + 4, 5, c, c, 0.55 * a); L.rrect(x, y, w, h, 4, [0.02, 0.06, 0.08], [0.01, 0.03, 0.05], a); };
  function bar(id, x, y, w, h, q, c0, c1, lab, size, tc) { L.uiBox(id, x - 4, y - 4, w + 8, h + 8, 2);
    frame(x - 3, y - 3, w + 6, h + 6, 0.85); for (let i = 0; i < Math.floor(w / 12); i++) if ((i + 0.5) / Math.floor(w / 12) <= q) L.rrect(x + i * 12 + 1, y + 1, 10, h - 2, 2, c0, c1);
    const label = lab;""")
H = H.replace("    if (label) L.label(id + '_t', label, x + w / 2, y + h / 2, { size, al: 0.5, col: tc || '#fbf3e4', out: tc ? '#cfe6ff' : undefined }); }",
              "    if (label) L.label(id + '_t', label, x + w / 2, y + h / 2, { size, al: 0.5, col: tc || '#e6fdff', out: '#02090d', font: MONO }); }")
H = H.replace("    if (label) label(id + '_t', label, x + w / 2, y + h / 2, { size, al: 0.5, col: tc || '#fbf3e4', out: tc ? '#cfe6ff' : undefined }); }",
              "    if (label) L.label(id + '_t', label, x + w / 2, y + h / 2, { size, al: 0.5, col: tc || '#e6fdff', out: '#02090d', font: MONO }); }")
H = H.replace("function panel(id, x, y, w, h, a = 0.82) { L.uiBox(id, x, y, w, h, 6); L.rrect(x, y, w, h, 14, [0.07, 0.07, 0.11], [0.04, 0.04, 0.07], a); }",
              "function panel(id, x, y, w, h, a = 0.82) { L.uiBox(id, x, y, w, h, 6); frame(x, y, w, h, a); }")
H = H.replace("[0.95, 0.28, 0.24], [0.7, 0.12, 0.12], Math.ceil(ST.hp)", "[1, 0.45, 0.4], [0.85, 0.25, 0.22], Math.ceil(ST.hp)")
H = H.replace("[0.35, 0.68, 1], [0.15, 0.4, 0.85], 'УР. ' + ST.lvl, 17, '#0b1430');", "[0.3, 1, 0.85], [0.0, 0.75, 0.85], 'УР. ' + ST.lvl, 17, '#e6fdff');")
H = H.replace("L.rrect(x - 3, y0 - 3, S0 + 6, S0 + 6, 14, INK); L.rrect(x, y0, S0, S0, 12, [0.16, 0.17, 0.24], [0.08, 0.08, 0.12]);", "frame(x, y0, S0, S0, 0.9);")
H = H.replace("j < ST.wp[id] ? [1, 0.82, 0.35] : [0.3, 0.3, 0.36]", "j < ST.wp[id] ? CYAN : [0.12, 0.2, 0.24]")
H = H.replace("L.rrect(px, y0 + 30, 56, 56, 10, [0.12, 0.12, 0.17]);", "frame(px, y0 + 30, 56, 56, 0.85, MINT);")
H = H.replace("[1, 0.3, 0.25], [0.6, 0.08, 0.1], null);", "CORAL, [0.7, 0.2, 0.18], null);")
H = H.replace("L.rrect(W / 2 - tw / 2 - 24, ty - 26, tw + 48, 52, 16, [0.35, 0.06, 0.06], [0.2, 0.03, 0.04], 0.85 * a);", "frame(W / 2 - tw / 2 - 24, ty - 26, tw + 48, 52, 0.85 * a, CORAL);")
H = H.replace("L.rrect(x - 4, y - 4 + lift, w + 8, h + 8, 26, [1, 0.8, 0.35], [0.75, 0.45, 0.15], a); L.rrect(x, y + lift, w, h, 22, [0.16, 0.17, 0.26], [0.07, 0.07, 0.11], a);", "frame(x, y + lift, w, h, a);")
H = H.replace("L.rrect(px0 - 5, py0 - 5, pw + 10, ph + 10, 30, win ? [0.45, 0.95, 0.6] : [1, 0.35, 0.3], [0.3, 0.3, 0.3], a);\n      L.rrect(px0, py0, pw, ph, 26, [0.12, 0.13, 0.2], [0.05, 0.05, 0.08], a);", "frame(px0, py0, pw, ph, a, win ? MINT : CORAL);")
for a_, b_ in [("'#f6e7c8'", "'#bff8ff'"), ("'#ffd76a'", "'#ffd600'"), ("'#fff3d8'", "'#e6fdff'"), ("'#ffe08a'", "'#7ff6ff'"), ("'#ffe1c8'", "'#ffd6cf'"), ("'#d8d4cc'", "'#a9c9cf'"),
               ("'#7cf0b0'", "'#64ffda'"), ("'#ffb4a8'", "'#ff8f85'"), ("'#9df5b8'", "'#64ffda'"), ("'#ff9a8a'", "'#ff6559'"), ("'#f2ead8'", "'#e6fdff'"), ("'#fff0b8'", "'#7ff6ff'"), ("'#ffd24a'", "'#00e5ff'"), ("'#3a1408'", "'#02090d'")]:
    H = H.replace(a_, b_)
H = H.replace("L.rrect(X - 33, by - 2, 66, 10, 4, [0.06, 0.05, 0.06]);", "L.rrect(X - 33, by - 2, 66, 10, 2, [0.02, 0.06, 0.08]);")
s = s[:i0] + H + s[i1:]
open(p, 'w', encoding='utf-8').write(s); print('patched')
