# Round 10 (user notes): auto-fire trace aimed by the mouse, no jitter aiming up, damage exactly where the arc is drawn,
# a 30 s bug workaround, stronger hit reactions, a floor with depth.
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
def patch(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:90], s.count(a)); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

if 'inSector' not in open('live/sim.js', encoding='utf-8').read(): patch('live/sim.js', [
    # the scanner's upright side follows the facing (which has hysteresis), not the sign of cos(aim): no flip-flop when aiming up or down
    ("const tip = (S) => { const h = hand(S), c = Math.cos(S.aim), s = Math.sin(S.aim), sy = c < 0 ? -1 : 1;",
     "const tip = (S) => { const h = hand(S), c = Math.cos(S.aim), s = Math.sin(S.aim), sy = S.face;"),
    ("S.aimT = a0 + (Math.cos(a0) < 0 ? -1 : 1) * Math.asin(Math.min(0.9, RIG.gunUp / d)); }",
     "S.aimT = a0 + S.face * Math.asin(Math.min(0.9, RIG.gunUp / d)); }"),
    # auto-fire: the mouse only sets the direction
    ("        const on = S.fire && Math.abs(", "        const on = Math.abs("),
    # damage = the drawn sector: from the scanner tip, radius range, half-angle half; a foe is hit when its body circle touches it
    ("""          near(S, g, o[0], o[1] + 30, st.range + 60, (e) => { const dx = e.x - o[0], dy = e.y - 30 - o[1], d = Math.hypot(dx, dy); if (d > st.range + FOE[e.k].r) return;
            let da = Math.atan2(dy, dx) - a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) > st.half + FOE[e.k].r / Math.max(40, d)) return;
            hurtFoe(""",
     """          near(S, g, tx, ty, st.range + 260, (e) => { const rr = FOE[e.k].r * 0.85, cx = e.x - tx, cy = e.y - FOE[e.k].r * 1.3 - ty;
            if (!inSector(cx, cy, a, st.half, st.range, rr)) return;
            hurtFoe("""),
    ("          hitTanks(S, o[0] + Math.cos(a) * st.range * 0.6, o[1] + Math.sin(a) * st.range * 0.6, st.range * 0.5, st.dmg);",
     "          hitTanks(S, tx + Math.cos(a) * st.range * 0.6, ty + 40 + Math.sin(a) * st.range * 0.6, st.range * 0.45, st.dmg);"),
    ("  // ---------------- weapons ----------------",
     """  // does a circle (centre c relative to the sector's apex, radius rr) touch the sector (direction a, half-angle half, radius R)?
  const inSector = (cx, cy, a, half, R, rr) => { const d = Math.hypot(cx, cy); if (d > R + rr) return false; if (d <= rr) return true;
    let da = Math.atan2(cy, cx) - a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) <= half) return true;
    for (const s of [-1, 1]) { const ex = Math.cos(a + s * half), ey = Math.sin(a + s * half), u = Math.max(0, Math.min(R, cx * ex + cy * ey));
      if (Math.hypot(cx - ex * u, cy - ey * u) <= rr) return true; } return false; };
  // ---------------- weapons ----------------"""),
    # the bug workaround: stand in the circle 30 s
    ("if (n.hold >= 6) capture(S, i, 'hold');", "if (n.hold >= HOLD_T) capture(S, i, 'hold');"),
    ("  const NODE_R = 430", "  const HOLD_T = 30;   // seconds standing in a node circle to work around its bug\n  const NODE_R = 430"),
])
s = open('live/sim.js', encoding='utf-8').read()
s = s.replace("SOLIDS, SPAWN, ORIGIN, NODE_R, ", "SOLIDS, SPAWN, ORIGIN, NODE_R, HOLD_T, ", 1) if 'NODE_R, HOLD_T' not in s else s; open('live/sim.js', 'w', encoding='utf-8').write(s)

patch('live/scene.js', [
    ("const sy0 = Math.cos(ST.aim) < 0 ? -1 : 1;", "const sy0 = ST.face;"),
    ("const q = clamp01(n.hold / 6);", "const q = clamp01(n.hold / SIM.HOLD_T);"),
    # hit reaction: longer, whiter flash, a deeper squash and a real recoil away from the hit, a quick shake
    (" hit = clamp01(1 - (GT - e.hitT) / 0.12) * 0.85;", " hit = clamp01(1 - (GT - e.hitT) / 0.16);"),
    ("const hk = o.hitA !== undefined && o.hitA < 0.22 ? (1 - o.hitA / 0.22) ** 2 : 0, hd = o.hitDir || 0;     // flinch from the last hit",
     "const hk = o.hitA !== undefined && o.hitA < 0.3 ? (1 - o.hitA / 0.3) ** 1.5 : 0, hd = o.hitDir || 0;     // flinch from the last hit"),
    ("const lean = (o.wind ? -face * 0.12 * o.wind : 0) + hd * 0.32 * hk;", "const lean = (o.wind ? -face * 0.12 * o.wind : 0) + hd * 0.5 * hk;"),
    ("const cx = o.x + sway + hd * 7 * hk;", "const cx = o.x + sway + hd * 16 * hk + (hk > 0.4 ? Math.sin(o.t * 90) * 3 * hk : 0);"),
    ("const bh = R0.body * breath * (1 - 0.16 * hk), bw = L.hsz(ak + '_body', R0.body) * (1 + 0.14 * hk)",
     "const bh = R0.body * breath * (1 - 0.24 * hk), bw = L.hsz(ak + '_body', R0.body) * (1 + 0.22 * hk)"),
    ("const hk = o.hitA !== undefined && o.hitA < 0.22 ? (1 - o.hitA / 0.22) ** 2 : 0, bh = R0.body * (1 + 0.02 * Math.sin(o.t * 3 + o.ph * 7)) * (1 - 0.15 * hk), bw = L.hsz('bug_body', R0.body) * (1 + 0.12 * hk)",
     "const hk = o.hitA !== undefined && o.hitA < 0.3 ? (1 - o.hitA / 0.3) ** 1.5 : 0, bh = R0.body * (1 + 0.02 * Math.sin(o.t * 3 + o.ph * 7)) * (1 - 0.22 * hk), bw = L.hsz('bug_body', R0.body) * (1 + 0.2 * hk)"),
    # a white rim burst on the struck side
    ("        const draw = () => (f.kind === 'desk' ? deskDraw() : R0.hex ? hexapod(o) : biped(o));",
     """        const draw = () => (f.kind === 'desk' ? deskDraw() : R0.hex ? hexapod(o) : biped(o));
        if (hit > 0 && die < 0) { const hy = Y - z - (R0.hex ? 60 : R0.hipY + R0.body * 0.5); L.glow(X - (e.hdx || 0) * 20, hy, (R0.hex ? 110 : R0.body * 0.9) * (0.6 + 0.4 * hit), [1, 0.95, 0.9], 0.55 * hit, 2.5); }"""),
    # the floor: foreshortened like every ring (y × 0.62), raised panels with a lit top edge and a dark front face, glossy
    # zone-coloured reflections, and haze toward the top of the screen
    ("void main(){ vec2 w = v_px + u_cam;\n  vec3 zc = u_pc;", "void main(){ vec2 w0 = v_px + u_cam, w = vec2(w0.x, w0.y / 0.62);\n  vec3 zc = u_pc;"),
    ("float inZ(vec2 w, vec4 z){", "float inZ(vec2 w, vec4 z){ w.y *= 0.62;"),
    ("  col += vec3(1.0, 0.84, 0.0) * k3 * diag * 0.045;                                                                   // hazard striping, the only yellow\n  o = vec4(col, 1.0); }",
     """  col += vec3(1.0, 0.84, 0.0) * k3 * diag * 0.045;                                                                   // hazard striping, the only yellow
  vec2 tf = fract(w / 100.0);                                                                                         // raised floor panels
  float lip = smoothstep(0.06, 0.0, tf.y) * 0.55, front = smoothstep(0.9, 1.0, tf.y) * (1.0 - smoothstep(0.985, 1.0, tf.y)), side = smoothstep(0.96, 1.0, tf.x) * 0.5;
  col += zc * lip * 0.08 + vec3(0.03, 0.05, 0.06) * lip; col *= 1.0 - 0.55 * front - 0.3 * side;
  col *= 0.92 + 0.16 * (1.0 - tf.y);                                                                                  // each panel lighter at its far edge
  float gloss = pow(0.5 + 0.5 * sin(w0.x * 0.0021 + w0.y * 0.0034 + hash(floor(w0 / 900.0)) * 6.0), 6.0);               // broad glossy reflections
  col += zc * gloss * 0.035;
  float sy = v_px.y / 1080.0; col = mix(col * 0.55 + zc * 0.02, col, smoothstep(0.0, 0.55, sy));                         // depth haze toward the top
  o = vec4(col, 1.0); }"""),
])
print('patched')
