# Round 20 (user: 144 Hz monitor, "freezes"): the sim steps at 120 Hz and the screen showed the latest step as is, so at 144 Hz some
# frames moved the world and some did not. Now every step records the previous positions and time; a frame draws the world between
# the previous and the current step (alpha = leftover time / DT): SIM.lerp sets positions, z, camera and time to the in-between
# values and returns a function that restores them, so the sim itself is untouched (replays stay exact). The demo under the main
# menu is redrawn every frame again (it is cheap since the batching; a 3-frame cadence judders at 144 Hz).
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
def patch(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:90], s.count(a)); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

patch('live/sim.js', [
    ("  function step(S, inp) {\n    levelFor(S);", """  // render interpolation: positions, z, camera and time before this step (SIM.lerp draws between them and the step's result)
  const LERPS = ['E', 'P', 'EB', 'LB', 'Gm'];
  const keepPrev = (S) => { S._ot = S.t; S._ox = S.x; S._oy = S.y; if (S.cam) { S._ocx = S.cam[0]; S._ocy = S.cam[1]; }
    for (const k of LERPS) { const A = S[k]; if (A) for (const o of A) { o._ox = o.x; o._oy = o.y; o._oz = o.z; } } };
  // set S to the in-between state at alpha in [0, 1) between the last two steps; returns the restore function
  function lerp(S, a) { if (!(a > 0) || S._ot === undefined) return () => {};
    const saved = [], one = (o) => { if (o._ox === undefined) return; const dx = o.x - o._ox, dy = o.y - o._oy; if (dx * dx + dy * dy > 250000) return;   // a teleport: no smear
      saved.push(o, o.x, o.y, o.z); o.x = o._ox + dx * a; o.y = o._oy + dy * a; if (o.z !== undefined && o._oz !== undefined) o.z = o._oz + (o.z - o._oz) * a; };
    one(S); for (const k of LERPS) { const A = S[k]; if (A) for (const o of A) one(o); }
    const t1 = S.t, c0 = S.cam && S.cam[0], c1 = S.cam && S.cam[1]; S.t = S._ot + (S.t - S._ot) * a;
    if (S.cam && S._ocx !== undefined && Math.abs(c0 - S._ocx) + Math.abs(c1 - S._ocy) < 500) { S.cam[0] = S._ocx + (c0 - S._ocx) * a; S.cam[1] = S._ocy + (c1 - S._ocy) * a; }
    return () => { for (let i = 0; i < saved.length; i += 4) { const o = saved[i]; o.x = saved[i + 1]; o.y = saved[i + 2]; if (saved[i + 3] !== undefined) o.z = saved[i + 3]; }
      S.t = t1; if (S.cam) { S.cam[0] = c0; S.cam[1] = c1; } }; }
  function step(S, inp) {
    levelFor(S); keepPrev(S);"""),
    # the demo: whole steps up to the time, plus the fraction for interpolation
    ("const loop = Math.floor(t / L), q = t - loop * L, n = Math.round(q / DT);", "const loop = Math.floor(t / L), q = t - loop * L, nf = q / DT, n = Math.floor(nf);"),
    ("    return Object.assign({}, S, { loop, q });", "    return Object.assign({}, S, { loop, q, alpha: nf - n });"),
    ("buildLevel, validate, ensureLevel, levelFor,", "buildLevel, validate, ensureLevel, levelFor, lerp,"),
])
patch('live/index.html', [
    ("      SCENE.state = play;", "      play.alpha = acc / SIM.DT;                                                           // draw between the last two sim steps\n      SCENE.state = play;"),
])
patch('live/scene.js', [
    ("    if (!S.state && window.META && bgT > -9) { const scr = META.view().scr, every = scr === 'main' ? 3 : 60;\n      if (++bgN % every && t - bgT < (scr === 'main' ? 0.2 : 1.5)) {",
     "    if (!S.state && window.META && bgT > -9 && META.view().scr !== 'main') {               // the dimmed screens: the world once a second\n      if (++bgN % 60 && t - bgT < 1.5) {"),
    ("    SIM.levelFor(ST); if (SIM.LEVEL_ID !== levelSeen) { levelSeen = SIM.LEVEL_ID; zoneU(); stencils(); }",
     "    SIM.levelFor(ST); if (SIM.LEVEL_ID !== levelSeen) { levelSeen = SIM.LEVEL_ID; zoneU(); stencils(); }\n    const unlerp = SIM.lerp(ST, ST.alpha || 0);                                            // draw between the last two steps (restored below)"),
    ("    if (MS) menu(GT, t); else hud(ST, GT, t, combo, lvlUp, sx, sy);\n    G.flush();\n  };", "    if (MS) menu(GT, t); else hud(ST, GT, t, combo, lvlUp, sx, sy);\n    G.flush(); unlerp();\n  };"),
])
print('patched')
