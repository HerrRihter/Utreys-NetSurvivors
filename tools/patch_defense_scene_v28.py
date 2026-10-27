# Round 28, the scene: the force shield's sphere round the hero while a charge is ready (one ring per charge), the block flash and its
# wave, fallback icons until the items' own icons are drawn, sounds; the wave pushes harder.
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
def patch(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == s.count(a) and s.count(a) >= 1, (p, a[:90], s.count(a)); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

patch('live/sim.js', [("e.kx += dx / d * 520; e.ky += dy / d * 520;", "e.kx += dx / d * 1100; e.ky += dy / d * 1100;"), ("hurtFoe(S, e, st.dmg * M.dmg, dx / d * 520, dy / d * 520, 'shield')", "hurtFoe(S, e, st.dmg * M.dmg, dx / d * 1100, dy / d * 1100, 'shield')")])
patch('live/scene.js', [
    ("  const IC_FB = { ic_udp: 'ic_homing',", "  const IC_FB = { ic_shield: 'ic_amount', ic_firewall: 'ic_hp', ic_repair: 'heal', ic_udp: 'ic_homing',"),
    ("    if (ST.ab) { const A = SIM.ABIL[ST.hero] || SIM.ABIL.utrace, X = sx(ST.x), Y = sy(ST.y), on =",
     """    { const X = sx(ST.x), Y = sy(ST.y) - 52;                                                  // Отказоустойчивость: the sphere while charged, the block
      if (ST.shCh > 0 && ST.dead < 0) { const pu = 0.5 + 0.5 * Math.sin(GT * 3.2); G.blend('add'); L.glow(X, Y, 96, CYAN, 0.12 + 0.05 * pu, 1.4); G.blend();
        for (let c = 0; c < ST.shCh; c++) { const r = 74 + c * 12; L.ring(X, Y, r, r * 1.08, CYAN_HI, 0.42 + 0.18 * pu, 0.022);
          for (let j = 0; j < 6; j++) { const an = GT * (0.9 + c * 0.4) + j * 1.047; L.solid(X + Math.cos(an) * r, Y + Math.sin(an) * r * 1.08, 12, 3, CYAN_HI, an + 1.571, 6, 1.5, 0.55 * pu + 0.2); } } }
      for (const ev of ST.ev) { if (ev.k !== 'shieldblock') continue; const a = GT - ev.t; if (a < 0 || a > 0.55) continue; const q = a / 0.55;
        G.blend('add'); L.glow(X, Y, 140 * (1 - q * 0.5), [1, 1, 1], 0.7 * (1 - q), 2); G.blend(); L.ring(X, Y, 80 + 60 * q, (80 + 60 * q) * 1.08, CYAN_HI, 1 - q, 0.05);
        if (ev.r) L.ring(sx(ev.x), sy(ev.y), ev.r * q, ev.r * q * 0.62, CYAN, 0.9 * (1 - q), 0.04); } }
    if (ST.ab) { const A = SIM.ABIL[ST.hero] || SIM.ABIL.utrace, X = sx(ST.x), Y = sy(ST.y), on ="""),
])
patch('live/audio.js', [("ability: ['level', 0.8], frozen: ['heal', 0.5],", "ability: ['level', 0.8], frozen: ['heal', 0.5], shieldblock: ['magic', 1], shieldup: ['ui', 0.7],")])
print('patched')
