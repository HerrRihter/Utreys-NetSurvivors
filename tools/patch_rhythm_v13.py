# Round 13: colour families for weapon effects and a firing rhythm (bursts, staggered launches, cooldown jitter).
#   precise = cyan (trace, UDP, turret, homing) · electric = violet-blue (chain, storm) · cold = icy white (cryo)
#   support = mint (ping, orbit, cache) · physical = dark objects with a pale white-blue light (mines, grenades, axes, boomerangs)
#   evolutions keep their family colour, brighter.
import os, re
os.chdir(os.path.join(os.path.dirname(__file__), '..'))

p = 'live/scene.js'; L = open(p, encoding='utf-8').read().split('\n')
def line(n, a, b, count=1):
    i = n - 1; assert L[i].count(a) == count, (n, a, L[i].count(a)); L[i] = L[i].replace(a, b)
line(175, "const ICE = [0.62, 0.9, 1]", "const ICE = [0.8, 0.94, 1], ELEC = [0.62, 0.5, 1], ELEC_HI = [0.82, 0.74, 1], CYAN_HI = [0.72, 1, 1], PHYS = [0.8, 0.88, 1], PHYS_HI = [0.95, 0.98, 1]")
line(408, "evo ? MINT : CYAN", "evo ? CYAN_HI : CYAN")                       # turret
line(413, "[0.3, 0.7, 1]", "MINT", 2)                                          # orbit scanners: support
line(419, "MINT, 0.5 * (1 - j / 7)", "CYAN, 0.5 * (1 - j / 7)")                # homing tail
line(421, "evo ? MINT : CYAN", "evo ? CYAN_HI : CYAN")                         # UDP and turret shots
line(423, "evo ? MINT : CORAL", "evo ? PHYS_HI : PHYS")                        # grenade glow (was enemy coral)
line(424, "evo ? MINT : CYAN", "evo ? PHYS_HI : PHYS")                         # grenade pin light
line(425, "L.glow(X, Y - Z, 40, CYAN, 0.5, 3);", "L.glow(X, Y - Z, 40, PHYS, 0.4, 3);")
L[425] = L[425].replace("CYAN, 0.25 * (1 - j / 5)", "PHYS, 0.22 * (1 - j / 5)")       # the axe's trail (next line)
line(428, "evo ? MINT : CYAN", "evo ? PHYS_HI : PHYS")                         # grenade landing ring
line(429, "L.glow(X, Y, 40, CYAN, 0.6, 3);", "L.glow(X, Y, 40, PHYS, 0.5, 3);")   # boomerangs
line(449, "evo ? MINT : [0.55, 0.75, 1]", "evo ? ELEC_HI : ELEC")             # storm warning
line(455, "evo ? MINT : CYAN", "evo ? CYAN_HI : CYAN")                         # trace arc
line(482, "evo ? MINT : [0.35, 0.8, 1]", "evo ? PHYS_HI : PHYS")              # blasts
line(484, "[0.4, 1, 0.6]", "MINT", 2)                                          # ping: support
line(504, "evo ? MINT : CYAN", "evo ? ELEC_HI : ELEC")                         # chain lightning
line(509, "evo ? MINT : CYAN", "evo ? ELEC_HI : ELEC")                         # storm bolt
s = '\n'.join(L)
# the cache zones and the evo ping: the heal flavour of the ping evolution stays mint, the cryo cone reads ICE already
open(p, 'w', encoding='utf-8').write(s)

p = 'live/sim.js'; s = open(p, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:100], s.count(a)); s = s.replace(a, b)
# delayed launches: a projectile with `wait` sits idle until then and starts from the hero's position at that moment (rel)
rep("for (let i = S.P.length - 1; i >= 0; i--) { const p = S.P[i]; p.life -= DT; let dead = p.life <= 0;",
    "for (let i = S.P.length - 1; i >= 0; i--) { const p = S.P[i]; if (p.wait > S.t) continue; if (p.rel) { p.x = S.x + p.rel[0]; p.y = S.y + p.rel[1]; p.rel = null; }\n      p.life -= DT; let dead = p.life <= 0;")
# homing: a ripple, one packet every 0.09 s
rep("S.P.push({ k: 'hom', x: hx, y: hy, vx: Math.cos(a) * st.speed * 0.5, vy: Math.sin(a) * st.speed * 0.5, life: st.life + 0.4, t0: t,",
    "S.P.push({ k: 'hom', x: hx, y: hy, rel: [0, -90], wait: t + i * 0.09, vx: Math.cos(a) * st.speed * 0.5, vy: Math.sin(a) * st.speed * 0.5, life: st.life + 0.4, t0: t + i * 0.09,")
# axes: one after another
rep("S.P.push({ k: 'axe', x: S.x, y: S.y, z: 60, vx: sp, vy: (rnd(S) - 0.5) * 120, vz: 980 + 60 * i, life: 3, t0: t,",
    "S.P.push({ k: 'axe', x: S.x, y: S.y, rel: [0, 0], wait: t + i * 0.14, z: 60, vx: sp, vy: (rnd(S) - 0.5) * 120, vz: 980 + 60 * i, life: 3, t0: t + i * 0.14,")
# UDP: bursts of three volleys (same damage per second, three times the cooldown); the evolution stays a steady stream
rep("""        for (let i = 0; i < st.count; i++) { const a = a0 + (i - (st.count - 1) / 2) * st.spread + (rnd(S) - 0.5) * 0.04;
          S.P.push({ k: 'udp', x: hx, y: hy, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, life: st.life, t0: t, dmg: st.dmg * M.dmg, pierce: st.pierce, hit: [], evo: WEAP[id].evo ? 1 : 0 }); }""",
    """        const vol = WEAP[id].evo ? 1 : 3; if (vol > 1) S.wcd[id] = cd * vol;
        for (let v = 0; v < vol; v++) for (let i = 0; i < st.count; i++) { const a = a0 + (i - (st.count - 1) / 2) * st.spread + (rnd(S) - 0.5) * 0.06;
          S.P.push({ k: 'udp', x: hx, y: hy, rel: [hx - S.x, hy - S.y], wait: t + v * 0.075, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, life: st.life, t0: t + v * 0.075, dmg: st.dmg * M.dmg, pierce: st.pierce, hit: [], evo: WEAP[id].evo ? 1 : 0 }); }""")
# mines: dropped one by one
rep("y: S.y + 6 + (st.ring ? Math.sin(ma) * st.ring * 0.62 : -S.uy * 50 + S.ux * off * 0.62), t0: t,",
    "y: S.y + 6 + (st.ring ? Math.sin(ma) * st.ring * 0.62 : -S.uy * 50 + S.ux * off * 0.62), t0: t + i * 0.15,")
rep("    for (let i = S.MN.length - 1; i >= 0; i--) { const m = S.MN[i], a = S.t - m.t0; let go = a > m.life;",
    "    for (let i = S.MN.length - 1; i >= 0; i--) { const m = S.MN[i], a = S.t - m.t0; if (a < 0) continue; let go = a > m.life;")
# storm: a drum roll, 0.12 s between strikes
rep("S.SQ.push({ id: e.id, x: e.x, y: e.y, t0: t + j * 0.06, at: t + 0.32 + j * 0.06,", "S.SQ.push({ id: e.id, x: e.x, y: e.y, t0: t + j * 0.12, at: t + 0.32 + j * 0.12,")
# every cooldown varies ±10 % so weapons drift apart instead of firing on the same frame
rep("""    }
    for (let i = S.SQ.length - 1; i >= 0; i--) {""", """      if (ready && S.wcd[id] > 0 && kind !== 'trace') S.wcd[id] *= 0.9 + 0.2 * rnd(S);
    }
    for (let i = S.SQ.length - 1; i >= 0; i--) {""")
open(p, 'w', encoding='utf-8').write(s)

p = 'live/scene.js'; s = open(p, encoding='utf-8').read()
for a, b in [("    for (const p of ST.P) { const X = sx(p.x), Y = sy(p.y);", "    for (const p of ST.P) { if (p.wait > GT) continue; const X = sx(p.x), Y = sy(p.y);")]:
    assert s.count(a) == 1, a; s = s.replace(a, b)
open(p, 'w', encoding='utf-8').write(s)
print('patched')
