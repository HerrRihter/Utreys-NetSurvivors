# Round 12 (user: "attacks must differ visually, not all fly one way"): one targeting rule and one trajectory per weapon.
#   cursor: trace · movement: UDP · behind: mines · 360° sweep: cryo · random foe: homing, chain · densest crowd: fork
#   away from the cursor, on an arc: retry (the Vampire Survivors axe) · from the sky with a warning: storm
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
def patch(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:100], s.count(a)); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

patch('live/sim.js', [
    # summaries
    ("mine: 'Мина под ногами, взрыв по площади',", "mine: 'Мина остаётся позади, на вашем следе',"),
    ("homing: 'Самонаводящийся пакет',", "homing: 'Пакеты взлетают веером и пикируют на случайных врагов',"),
    ("retry: 'Бумеранг летит и возвращается',", "retry: 'Летит дугой вверх в сторону от курсора и падает',"),
    ("udp: 'Очередь пакетов в сторону курсора', chain: 'Молния перескакивает между врагами', storm: 'Разряды бьют по случайным врагам на экране',",
     "udp: 'Очередь пакетов по ходу движения', chain: 'Молния бьёт случайного врага рядом и перескакивает', storm: 'Разряды с неба по случайным врагам на экране',"),
    ("cryo: 'Струя холода в сторону курсора: урон и замедление', fork: 'Граната делится на осколки',",
     "cryo: 'Струя холода вращается вокруг героя: урон и замедление', fork: 'Граната летит в самую плотную толпу и делится',"),
    # targeting helpers
    ("  // ---------------- weapons ----------------", """  // a random live foe within r (spreads shots instead of piling them on the nearest one)
  const randomFoe = (S, g, x, y, r) => { const c = []; near(S, g, x, y, r, (e) => { if (!e.fly && Math.hypot(e.x - x, e.y - y) < r) c.push(e); }); return c.length ? c[Math.floor(rnd(S) * c.length)] : null; };
  // the foe with the most neighbours within rr, among up to 16 sampled within r (the thick of the crowd)
  const densest = (S, g, x, y, r, rr) => { const c = []; near(S, g, x, y, r, (e) => { if (!e.fly && Math.hypot(e.x - x, e.y - y) < r) c.push(e); }); let best = null, bn = -1;
    for (let k = 0; k < Math.min(16, c.length); k++) { const e = c[Math.floor(rnd(S) * c.length)]; let n = 0; near(S, g, e.x, e.y, rr, (o) => { if (Math.hypot(o.x - e.x, o.y - e.y) < rr) n++; }); if (n > bn) { bn = n; best = e; } }
    return best; };
  // ---------------- weapons ----------------"""),
    # homing: a fan launched upward, each packet after its own random target, slow turn first, then a dive
    ("""      if (kind === 'homing' && ready) { const tg = nearest(S, g, S.x, S.y, 900); if (tg) { S.wcd[id] = cd; const [hx, hy] = tip(S);
        for (let i = 0; i < st.count; i++) { const a = Math.atan2(tg.y - 30 - hy, tg.x - hx) + (i - (st.count - 1) / 2) * 0.5;
          S.P.push({ k: 'hom', x: hx, y: hy, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, life: st.life, t0: t, dmg: st.dmg * M.dmg, tg: tg.id, sp: st.speed }); }
        push(S, { k: 'shot', t, x: hx, y: hy, a: S.aim }); } }""",
     """      if (kind === 'homing' && ready && nearest(S, g, S.x, S.y, 900)) { S.wcd[id] = cd; const hx = S.x, hy = S.y - 90;
        for (let i = 0; i < st.count; i++) { const tg = randomFoe(S, g, S.x, S.y, 900), a = -Math.PI / 2 + (i - (st.count - 1) / 2) * 0.6 + (rnd(S) - 0.5) * 0.3;
          S.P.push({ k: 'hom', x: hx, y: hy, vx: Math.cos(a) * st.speed * 0.5, vy: Math.sin(a) * st.speed * 0.5, life: st.life + 0.4, t0: t, dmg: st.dmg * M.dmg, tg: tg ? tg.id : -1, sp: st.speed }); }
        push(S, { k: 'shot', t, x: hx, y: hy, a: -Math.PI / 2 }); }"""),
    ("""        if (tg) { p.tg = tg.id; const a = Math.atan2(tg.y - 30 - p.y, tg.x - p.x), c = Math.atan2(p.vy, p.vx); const da = Math.atan2(Math.sin(a - c), Math.cos(a - c)); const na = c + Math.max(-7 * DT, Math.min(7 * DT, da));
          p.vx = Math.cos(na) * p.sp; p.vy = Math.sin(na) * p.sp; }""",
     """        const age = S.t - p.t0, v = Math.min(p.sp, Math.hypot(p.vx, p.vy) + (age < 0.3 ? 0 : 2200 * DT)), turn = age < 0.3 ? 1.2 : 8;      // rise, then dive
        if (tg) { p.tg = tg.id; const a = Math.atan2(tg.y - 30 - p.y, tg.x - p.x), c = Math.atan2(p.vy, p.vx); const da = Math.atan2(Math.sin(a - c), Math.cos(a - c)); const na = c + Math.max(-turn * DT, Math.min(turn * DT, da));
          p.vx = Math.cos(na) * v; p.vy = Math.sin(na) * v; }"""),
    # mines: laid behind, across the trail
    ("const ma = i * 6.2832 / st.count + t; S.MN.push({ x: S.x + (st.ring ? Math.cos(ma) * st.ring : (i - (st.count - 1) / 2) * 50), y: S.y + 6 + (st.ring ? Math.sin(ma) * st.ring * 0.62 : 0),",
     "const ma = i * 6.2832 / st.count + t, off = (i - (st.count - 1) / 2) * 56; S.MN.push({ x: S.x + (st.ring ? Math.cos(ma) * st.ring : -S.ux * 80 - S.uy * off), y: S.y + 6 + (st.ring ? Math.sin(ma) * st.ring * 0.62 : -S.uy * 50 + S.ux * off * 0.62),"),
    # retry: the base weapon becomes the axe (up and over, away from the cursor); the evolution keeps the eight boomerangs
    ("""      if (kind === 'retry' && ready) { const tg = nearest(S, g, S.x, S.y, 800); if (tg) { S.wcd[id] = cd;""",
     """      if (kind === 'retry' && ready && !WEAP[id].evo && nearest(S, g, S.x, S.y, 900)) { S.wcd[id] = cd; const side = Math.cos(S.aim) < 0 ? 1 : -1;
        for (let i = 0; i < st.count; i++) { const sp = (260 + 110 * i) * side * (i % 2 && st.count > 2 ? -1 : 1);
          S.P.push({ k: 'axe', x: S.x, y: S.y, z: 60, vx: sp, vy: (rnd(S) - 0.5) * 120, vz: 980 + 60 * i, life: 3, t0: t, dmg: st.dmg * M.dmg * 1.15, hit: [] }); }
        push(S, { k: 'toss', t, x: S.x, y: S.y - 60 }); }
      if (kind === 'retry' && ready && WEAP[id].evo) { const tg = nearest(S, g, S.x, S.y, 800); if (tg) { S.wcd[id] = cd;"""),
    ("      if (p.k === 'ret') { const a = S.t - p.t0;", """      if (p.k === 'axe') { p.x += p.vx * DT; p.y += p.vy * DT; p.z += p.vz * DT; p.vz -= 2100 * DT;
        if (p.z <= 0 && p.vz < 0) { dead = true; push(S, { k: 'pop', t: S.t, x: p.x, y: p.y }); }
        else if (p.z < 170) near(S, g, p.x, p.y, 80, (e) => { if (p.hit.includes(e.id)) return; if (Math.hypot(e.x - p.x, e.y - p.y) < FOE[e.k].r + 26) { p.hit.push(e.id); hurtFoe(S, e, p.dmg, p.vx * 0.4, 0, 'retry'); } }); }
      if (p.k === 'ret') { const a = S.t - p.t0;"""),
    # UDP: along the movement, from the body
    ("""      if (kind === 'udp' && ready && nearest(S, g, S.x, S.y, 1100)) { S.wcd[id] = cd; const [hx, hy] = tip(S);           // a volley along the aim (the mouse)
        for (let i = 0; i < st.count; i++) { const a = S.aim + (i - (st.count - 1) / 2) * st.spread + (rnd(S) - 0.5) * 0.04;""",
     """      if (kind === 'udp' && ready && nearest(S, g, S.x, S.y, 1100)) { S.wcd[id] = cd; const hx = S.x + S.ux * 30, hy = S.y - 50 + S.uy * 20, a0 = Math.atan2(S.uy, S.ux);   // along the movement
        for (let i = 0; i < st.count; i++) { const a = a0 + (i - (st.count - 1) / 2) * st.spread + (rnd(S) - 0.5) * 0.04;"""),
    # chain: starts on a random foe nearby
    ("      if (kind === 'chain' && ready) { let cur = nearest(S, g, S.x, S.y, 560); if (cur) { S.wcd[id] = cd; const pts = [tip(S)], hit = [];",
     "      if (kind === 'chain' && ready) { let cur = randomFoe(S, g, S.x, S.y, 560); if (cur) { S.wcd[id] = cd; const pts = [[S.x, S.y - 80]], hit = [];"),
    # storm: a warning ring first, the strike lands 0.32 s later on the foe's current spot
    ("""        if (pool.length) { S.wcd[id] = cd; for (let j = 0; j < st.count && pool.length; j++) { const e = pool.splice(Math.floor(rnd(S) * pool.length), 1)[0], bx = e.x, by = e.y;
            push(S, { k: 'bolt', t, x: bx, y: by, r: st.radius, evo: WEAP[id].evo ? 1 : 0 });
            near(S, g, bx, by, st.radius + 60, (o) => { if (Math.hypot(o.x - bx, (o.y - by) / 0.62) < st.radius + FOE[o.k].r * 0.6) hurtFoe(S, o, st.dmg * M.dmg, 0, 0, 'storm'); }); hitTanks(S, bx, by, st.radius, st.dmg); } } }""",
     """        if (pool.length) { S.wcd[id] = cd; for (let j = 0; j < st.count && pool.length; j++) { const e = pool.splice(Math.floor(rnd(S) * pool.length), 1)[0];
            S.SQ.push({ id: e.id, x: e.x, y: e.y, t0: t + j * 0.06, at: t + 0.32 + j * 0.06, r: st.radius, dmg: st.dmg * M.dmg, evo: WEAP[id].evo ? 1 : 0 }); } } }"""),
    ("    // sentry servers: shoot the nearest foe in range", """    for (let i = S.SQ.length - 1; i >= 0; i--) { const q = S.SQ[i]; const e = S.E.find((o) => o.id === q.id && o.dieT < 0); if (e) { q.x = e.x; q.y = e.y; }   // the warning follows its target
      if (t < q.at) continue; S.SQ.splice(i, 1); push(S, { k: 'bolt', t, x: q.x, y: q.y, r: q.r, evo: q.evo });
      near(S, g, q.x, q.y, q.r + 60, (o) => { if (Math.hypot(o.x - q.x, (o.y - q.y) / 0.62) < q.r + FOE[o.k].r * 0.6) hurtFoe(S, o, q.dmg, 0, 0, 'storm'); }); hitTanks(S, q.x, q.y, q.r, q.dmg); }
    // sentry servers: shoot the nearest foe in range"""),
    # cryo: the spray sweeps round the hero from the body
    ("""        if (S.cryo && S.cryo.w === id && S.cryo.until > t && t >= S.cryo.nt) { S.cryo.nt = t + st.tick; const a = S.aim, [tx, ty] = tip(S); S.cryo.r = st.range; S.cryo.half = st.half;""",
     """        if (S.cryo && S.cryo.w === id && S.cryo.until > t) S.cryo.a = (S.cryo.a === undefined ? S.aim : S.cryo.a) + 2.4 * DT;        // a sprinkler: one turn in 2.6 s
        if (S.cryo && S.cryo.w === id && S.cryo.until > t && t >= S.cryo.nt) { S.cryo.nt = t + st.tick; const a = S.cryo.a, tx = S.x, ty = S.y - 50; S.cryo.r = st.range; S.cryo.half = st.half;"""),
    ("if (ready && !(S.cryo && S.cryo.until > t)) { S.wcd[id] = cd + st.burst; S.cryo = { t0: t, until: t + st.burst, nt: t, w: id };",
     "if (ready && !(S.cryo && S.cryo.until > t)) { S.wcd[id] = cd + st.burst; S.cryo = { t0: t, until: t + st.burst, nt: t, w: id, a: S.cryo ? S.cryo.a : S.aim };"),
    # fork: into the thick of the crowd, on a higher arc
    ("      if (kind === 'fork' && ready) { const tg = nearest(S, g, S.x, S.y, 720); if (tg) { S.wcd[id] = cd;",
     "      if (kind === 'fork' && ready) { const tg = densest(S, g, S.x, S.y, 760, 160); if (tg) { S.wcd[id] = cd;"),
    ("ox: S.x, oy: S.y, tx: tg.x, ty: tg.y, t0: t, T: 0.65,", "ox: S.x, oy: S.y, tx: tg.x, ty: tg.y, t0: t, T: 0.8,"),
    ("ps: { hp: 0, speed: 0, magnet: 0, power: 0, haste: 0, area: 0, amount: 0, dur: 0 }, TU: [], chestQ: 0,",
     "ps: { hp: 0, speed: 0, magnet: 0, power: 0, haste: 0, area: 0, amount: 0, dur: 0 }, TU: [], SQ: [], chestQ: 0,"),
])

patch('live/scene.js', [
    # cryo cone from the body, at the sweep angle
    ("if (ST.cryo && ST.cryo.until > GT && ST.cryo.r) { const [tx, ty] = SIM.tip(ST), X = sx(tx), Y = sy(ty), r = ST.cryo.r;\n      G.blend('add'); G.draw(L.P.arc, { u_a: ST.aim,",
     "if (ST.cryo && ST.cryo.until > GT && ST.cryo.r) { const X = sx(ST.x), Y = sy(ST.y - 50), r = ST.cryo.r, ca = ST.cryo.a;\n      G.blend('add'); G.draw(L.P.arc, { u_a: ca,"),
    ("an = ST.aim + (rnd(j, Math.floor(GT * 2.2 + j / 9)) - 0.5) * 2 * ST.cryo.half;", "an = ca + (rnd(j, Math.floor(GT * 2.2 + j / 9)) - 0.5) * 2 * ST.cryo.half;"),
    # the axe: a spinning disc over its shadow; the fork's landing ring; storm warnings
    ("      if (p.k === 'ret') { L.glow(X, Y, 40, CYAN, 0.6, 3);", """      if (p.k === 'axe') { const Z = Math.max(0, p.z); SH(X, Y + 4, 20, 7, 0.45); L.glow(X, Y - Z, 40, CYAN, 0.5, 3);
        for (let j = 1; j < 5; j++) L.glow(X - p.vx * j * 0.02, Y - Z + (p.vz * j * 0.02), 22 - j * 4, CYAN, 0.25 * (1 - j / 5), 3);
        L.sprite('ic_retry', 0, 0, { m: M.of(M.t(X, Y - Z), M.r(GT * 18 * Math.sign(p.vx || 1))), w: 54, h: 54, pivot: [27, 27] }); }
      if (p.k === 'fork') { const q = clamp01((GT - p.t0) / p.T); L.ring(sx(p.tx), sy(p.ty), p.r, p.r * 0.62, p.evo ? MINT : CYAN, 0.25 + 0.5 * q, 0.04); }
      if (p.k === 'ret') { L.glow(X, Y, 40, CYAN, 0.6, 3);"""),
    ("    // ===== event FX =====", """    for (const q of ST.SQ || []) { if (GT < q.t0) continue; const k = clamp01((GT - q.t0) / (q.at - q.t0)), X = sx(q.x), Y = sy(q.y), c = q.evo ? MINT : [0.55, 0.75, 1], fl = Math.sin(GT * 40) > 0 ? 1 : 0.5;
      L.ring(X, Y, q.r * (1.6 - 0.6 * k), q.r * 0.62 * (1.6 - 0.6 * k), c, (0.4 + 0.5 * k) * fl, 0.05); pool(X, Y, q.r, q.r * 0.62, c, 0.18 * k, 2); }
    // ===== event FX ====="""),
])
print('patched')
