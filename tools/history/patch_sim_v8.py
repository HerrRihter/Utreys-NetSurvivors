# Round 8 (2026-10-25): five component zones from the original (data/enemies/nodes.js) with their bug minibosses leashed to
# node circles, node capture (kill the bug or hold the circle 6 s), mouse-aimed trace, diamond footprint for the core.
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
p = 'live/sim.js'; s = open(p, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:90], s.count(a)); s = s.replace(a, b)

# ---- foes: the two new bugs; every bug carries its node index (set at spawn)
rep("""    bugu:    { name: 'Баг отчёта использования',""", """    bugl:    { name: 'Баг логистики', kind: 'pulse', hp: 500, sp: 50, dmg: 12, r: 46, range: 220, wind: 1.6, cd: 2.8, xp: 16, poise: 1.5, mini: true, mark: 'BUG',
               slow: { amount: 0.45, dur: 2.5 }, col: [0.93, 0.81, 0.4] },
    bugg:    { name: 'Баг товарных отчётов', kind: 'pulse', hp: 500, sp: 50, dmg: 13, r: 46, range: 180, wind: 1.4, cd: 2.6, xp: 16, poise: 1.5, mini: true, mark: 'BUG',
               pools: { every: 5, count: 2, radius: 84, life: 4, scatter: 160, dmg: 0.5 }, col: [0.47, 0.81, 0.72] },
    bugu:    { name: 'Баг отчёта использования',""")
for k in ['bug:     {', 'bugu:    {', 'buga:    {']:
    pass
rep("const HINT = 'WASD / стрелки — движение · Пробел — пакетный сброс · 1–3 или клик — выбор улучшения · R — заново';",
    "const HINT = 'WASD — движение · ЛКМ — атака в сторону курсора · Пробел — пакетный сброс · 1–3 — улучшение · R — заново';")

# ---- level: five component zones around the plaza
i0 = s.index("  // zones: floor tint and neon colour, name painted on the floor"); i1 = s.index("  // fibre trunks across the floor (packets stream along them in the scene)")
s = s[:i0] + r"""  // the five components of the original (data/enemies/nodes.js): a zone each, its bug miniboss leashed to the node circle
  const NODE_R = 340;
  const ZONES = [
    { id: 'production-aggreagtion', name: 'АГРЕГАЦИЯ', x0: 0, y0: 0, x1: 2900, y1: 2500, nx: 1450, ny: 1300, bug: 'buga', col: [0.0, 0.9, 1.0], pat: 1 },
    { id: 'code-usage-report', name: 'ОТЧЁТ О НАНЕСЕНИИ', x0: 5100, y0: 0, x1: 8000, y1: 2500, nx: 6550, ny: 1300, bug: 'bugu', col: [0.39, 1.0, 0.85], pat: 0 },
    { id: 'inport-operation-processor', name: 'ИМПОРТ', x0: 5100, y0: 3500, x1: 8000, y1: 6000, nx: 6550, ny: 4750, bug: 'bug', col: [0.45, 0.8, 1.0], pat: 2 },
    { id: 'logistic-processor', name: 'ЛОГИСТИКА', x0: 2900, y0: 4150, x1: 5100, y1: 6000, nx: 4000, ny: 5150, bug: 'bugl', col: [0.2, 0.7, 1.0], pat: 3 },
    { id: 'goods-reports', name: 'ТОВАРНЫЕ ОТЧЁТЫ', x0: 0, y0: 3500, x1: 2900, y1: 6000, nx: 1450, ny: 4750, bug: 'bugg', col: [0.6, 0.85, 1.0], pat: 4 },
  ];
  const PLAZA = { col: [0.0, 0.9, 1.0] };
  const zoneAt = (x, y) => ZONES.find((z) => x >= z.x0 && x < z.x1 && y >= z.y0 && y < z.y1) || null;
  const PROPS = [], BOXES = [];                                   // PROPS: [type, x, y, flip]; BOXES: solids { x, y, hw, hh } (dia: diamond)
  const LAMPS = [], TANKS = [], STENCILS = [], CABLES = [], TAPES = [], HOLOS = [], RINGS = [];
  const add = (k, x, y, f = 0) => PROPS.push([k, Math.round(x), Math.round(y), f]);
  const clear = (x, y, r) => Math.hypot(x - SPAWN[0], (y - SPAWN[1]) * 1.3) > r;
  const offNode = (x, y, m = 0) => ZONES.every((z) => Math.hypot(x - z.nx, (y - z.ny) * 1.25) > NODE_R + 160 + m);
  const row = (x0, y, n, f = 0) => { for (let i = 0; i < n; i++) add(i % 3 ? 'rack' : 'rack_b', x0 + i * 150, y, (i + f) % 2);
    BOXES.push({ x: x0 + (n - 1) * 75, y: y - 20, hw: n * 75 - 28, hh: 20 }); TAPES.push([[x0 - 90, y + 46], [x0 + (n - 1) * 150 + 90, y + 46]]); };
  const rowOk = (x0, y, n) => { for (let i = 0; i < n; i++) if (!clear(x0 + i * 150, y, 1150) || !offNode(x0 + i * 150, y)) return false; return true; };
  // the central plaza = the match screen: the reference's composition as a datacenter
  add('core', ...R(170, 262)); row(R(860, 118)[0], R(860, 118)[1], 2); add('switch', ...R(770, 118));
  add('cage', ...R(1235, 412)); add('crac', ...R(85, 560)); add('crac', ...R(85, 690)); add('cart', ...R(250, 640)); add('tray', ...R(330, 470));
  for (const [x, y] of [[430, 140], [612, 300], [918, 650]]) LAMPS.push(R(x, y));
  for (const [x, y] of [[480, 68], [1230, 528], [840, 705]]) add('ups', ...R(x, y));
  for (const [x, y] of [[210, 388], [430, 525], [1135, 478]]) add('pdu', ...R(x, y));
  add('firerack', ...R(560, 700));
  for (const [x, y] of [[1010, 345], [1040, 365], [1068, 338], [1090, 372]]) TANKS.push(R(x, y));
  STENCILS.push({ x: R(480, 268)[0], y: R(480, 268)[1], rot: -0.21, s: 'ПРАВИЛО №3: НЕ СТОЙ НА МЕСТЕ', sz: 64 });
  RINGS.push([SPAWN[0], SPAWN[1], 900], [R(170, 262)[0], R(170, 262)[1] - 40, 320]);
  // outer walls: rack rows top and bottom, cooling units on the sides
  for (let x = 140; x < WORLD.x1 - 700; x += 900) { row(x, 150, 5); row(x + 75, WORLD.y1 - 10, 5, 1); }
  for (let y = 430; y < WORLD.y1 - 160; y += 320) { add('crac', 110, y); add('crac', WORLD.x1 - 110, y, 1); }
  // each zone's structure (its own machines in its own layout), never on the node circle
  const Z = ZONES;
  for (let r = 0; r < 4; r++) for (let sg = 0; sg < 3; sg++) { const y = 620 + r * 520, x0 = 420 + sg * 860 + (r % 2) * 110; if (rowOk(x0, y, 4)) row(x0, y, 4, r); }           // Агрегация: rack rows
  for (let r = 0; r < 4; r++) for (let sg = 0; sg < 2; sg++) { const y = 620 + r * 520, x0 = 3150 + sg * 1000; if (rowOk(x0, y, 4)) row(x0, y, 4, r + 1); }                      // neutral north hall
  for (let r = 0; r < 4; r++) for (let sg = 0; sg < 4; sg++) { const x = 5450 + sg * 700 + (r % 2) * 250, y = 600 + r * 520; if (!offNode(x, y) || x > WORLD.x1 - 300) continue;  // Отчёт: desks, libraries
    if ((r + sg) % 3 === 0) { add('tapelib', x, y); add('tapelib', x + 150, y); } else if ((r + sg) % 3 === 1) { add('desk', x, y); HOLOS.push([x, y - 150, 0]); } else { add('holopillar', x, y); add('holopillar', x + 120, y); } }
  for (let r = 0; r < 4; r++) for (let sg = 0; sg < 3; sg++) { const y = 3850 + r * 520, x0 = 5400 + sg * 820 + (r % 2) * 140; if (x0 + 450 < WORLD.x1 - 250 && rowOk(x0, y, 3)) { row(x0, y, 3, r); add('switchstack', x0 + 470, y); } }   // Импорт
  for (let r = 0; r < 3; r++) for (let sg = 0; sg < 3; sg++) { const x = 3150 + sg * 700 + (r % 2) * 200, y = 4400 + r * 520; if (offNode(x, y) && clear(x, y, 1150)) { add(sg % 2 ? 'batbank' : 'ups', x, y); add('cart', x + 200, y); } }   // Логистика
  for (let r = 0; r < 4; r++) for (let sg = 0; sg < 4; sg++) { const x = 400 + sg * 620 + (r % 2) * 200, y = 3850 + r * 520; if (!offNode(x, y) || !clear(x, y, 1150)) continue;          // Товарные отчёты
    if ((r + sg) % 2) { add('tapelib', x, y); add('patch', x + 140, y); } else { add('blade', x, y); add('patch', x + 120, y); } }
  for (const [cx, cy] of [[3300, 4850], [4700, 4850], [3500, 5650], [4500, 5650], [2650, 3100], [5400, 3100], [4300, 900], [3700, 2100]]) if (offNode(cx, cy)) for (let i = 0; i < 3; i++) TANKS.push([cx + i * 46 - 46, cy + (i % 2) * 24]);
  for (const z of Z) { STENCILS.push({ x: z.nx, y: z.ny + NODE_R * 0.62 + 90, rot: 0, s: z.name, sz: 72 }); }
  STENCILS.push({ x: 4000, y: 1400, rot: 0.03, s: 'ХОЛОДНЫЙ КОРИДОР', sz: 64 }, { x: 4000, y: 3950, rot: -0.03, s: 'НЕ ПЕРЕЗАГРУЖАТЬ!', sz: 60 });
""" + s[i1:]
# set dressing per component
rep("const KIT = [['blade', 'rack_open', 'switchstack', 'crates', 'holopillar'], ['manifold', 'spool', 'dock', 'crates'], ['batbank', 'manifold', 'crates', 'spool'], ['holopillar', 'dock', 'mast', 'switchstack', 'crates']];",
    "const KIT = [['crates', 'spool', 'rack_open', 'manifold'], ['holopillar', 'mast', 'desk', 'crates'], ['dock', 'switchstack', 'crates', 'rack_open'], ['crates', 'spool', 'cart_b', 'dock', 'manifold'], ['blade', 'patch', 'crates', 'holopillar']];")
rep("const x = gx + (hseed(gx + 9 + zi) - 0.5) * 120, y = gy + (hseed(gy + 5 + zi) - 0.5) * 80; if (clear(x, y, 1000) && fits(k, x, y, 70)) add(k, x, y, hseed(gx + gy) > 0.5 ? 1 : 0); } });",
    "const x = gx + (hseed(gx + 9 + zi) - 0.5) * 120, y = gy + (hseed(gy + 5 + zi) - 0.5) * 80; if (clear(x, y, 1000) && offNode(x, y) && fits(k, x, y, 70)) add(k, x, y, hseed(gx + gy) > 0.5 ? 1 : 0); } });")
# the core stands as a diamond (an iso platform): a diamond footprint
rep("  for (const [k, x, y] of PROPS) if (FOOT[k]) BOXES.push({ x, y: y - FOOT[k][1], hw: FOOT[k][0], hh: FOOT[k][1], k });",
    "  for (const [k, x, y] of PROPS) if (FOOT[k]) BOXES.push(k === 'core' ? { x, y: y - FOOT[k][1], hw: FOOT[k][0], hh: FOOT[k][1], k, dia: true } : { x, y: y - FOOT[k][1], hw: FOOT[k][0], hh: FOOT[k][1], k });")
rep("core: [183, 109]", "core: [205, 104]")
# ---- collision: boxes push out along the shallow axis with the actor's real half width; diamonds along their face normal
rep("""    for (const b of BOXES) { const hw = b.hw + r, hh = b.hh + r * 0.6, dx = o.x - b.x, dy = o.y - b.y;          // rack rows: push out along the shallow axis
      if (Math.abs(dx) < hw && Math.abs(dy) < hh) { const px = hw - Math.abs(dx), py = hh - Math.abs(dy); if (px < py) o.x = b.x + Math.sign(dx || 1) * hw; else o.y = b.y + Math.sign(dy || 1) * hh; } } };""",
"""    for (const b of BOXES) { const hw = b.hw + r * 1.35, hh = b.hh + r * 0.6, dx = o.x - b.x, dy = o.y - b.y;    // sides padded to the actor's drawn half width
      if (b.dia) { const q = Math.abs(dx) / hw + Math.abs(dy) / hh; if (q < 1) { const nx = Math.sign(dx || 1) / hw, ny = Math.sign(dy || 1) / hh, nl = Math.hypot(nx, ny), d = (1 - q) / nl;
        o.x += nx / nl * d; o.y += ny / nl * d; } continue; }
      if (Math.abs(dx) < hw && Math.abs(dy) < hh) { const px = hw - Math.abs(dx), py = hh - Math.abs(dy); if (px < py) o.x = b.x + Math.sign(dx || 1) * hw; else o.y = b.y + Math.sign(dy || 1) * hh; } } };""")
rep("  const blocked = (x, y, r) => BOXES.some((b) => Math.abs(x - b.x) < b.hw + r && Math.abs(y - b.y) < b.hh + r * 0.6);",
    "  const blocked = (x, y, r) => BOXES.some((b) => b.dia ? Math.abs(x - b.x) / (b.hw + r) + Math.abs(y - b.y) / (b.hh + r * 0.6) < 1 : Math.abs(x - b.x) < b.hw + r && Math.abs(y - b.y) < b.hh + r * 0.6);")
# ---- state: nodes; no timed miniboss spawns (the bugs live in their zones)
rep("spawnAcc: 0, nextSwarm: 75, nextMini: 100, miniN: 0,", "spawnAcc: 0, nextSwarm: 75, nodes: ZONES.map(() => ({ st: 0, hold: 0, bug: 0, t: -9 })), px: VIEW.W / 2 + 200, py: VIEW.H / 2,")
rep("  const spawn = (worldT) => base(worldT, 1000 + Math.floor(worldT * 977) % 100000);",
    """  const placeBugs = (S) => ZONES.forEach((z, i) => { const b = mkFoe(S, z.bug, z.nx, z.ny); b.node = i + 1; b.nextAtk = 1; S.nodes[i].bug = b.id; });
  const spawn = (worldT) => { const S = base(worldT, 1000 + Math.floor(worldT * 977) % 100000); placeBugs(S); return S; };""")
rep("    S.nextSwarm = 999; S.nextMini = 999;\n    return S;", "    S.nextSwarm = 999; placeBugs(S);\n    return S;")
rep("lvl: 0, sumT: S.t + (f.summon ? f.summon.every : 0),", "lvl: 0, node: 0, poolT: S.t + 3, sumT: S.t + (f.summon ? f.summon.every : 0),")
rep("""    if (t >= S.nextMini) { S.nextMini += 100; const k = MINIS[S.miniN++ % MINIS.length]; spawnRing(S, k, 1 + Math.floor(m / 4), 1000, 1150);
      S.toast = { s: { bug: 'БАГ ИМПОРТА: уходите с красных меток', bugu: 'БАГ ОТЧЁТА ИСПОЛЬЗОВАНИЯ: ищите разрыв в кольце', buga: 'БАГ АГРЕГАЦИИ: зовёт узлы L3 на помощь' }[k], t }; }
""", "")
# ---- capture: killing a zone bug closes its component
rep("    if (f.boss) { if (S.boss === e.id) S.boss = null;", "    if (e.node) capture(S, e.node - 1, 'kill');\n    if (f.boss) { if (S.boss === e.id) S.boss = null;")
rep("  function hurtFoe(S, e, dmg, kx, ky, src) {", """  // a component restored: by killing its bug or by holding its circle for 6 s (as in the original)
  function capture(S, i, how) { const n = S.nodes[i], z = ZONES[i]; if (n.st) return; n.st = 1; n.t = S.t;
    const b = S.E.find((e) => e.id === n.bug && e.dieT < 0); if (b && how !== 'kill') { b.node = 0; killFoe(S, b, 'node'); }
    for (let j = 0; j < 4; j++) S.Gm.push({ x: z.nx + (j - 1.5) * 50, y: z.ny, v: 25, k: 2, m: 0, vx: 0, vy: 0, b: 0 });
    S.bars += 5; S.hp = Math.min(hpMax(S), S.hp + 30); S.toast = { s: 'КОМПОНЕНТ «' + z.name + '» ВОССТАНОВЛЕН', t: S.t }; push(S, { k: 'capture', t: S.t, x: z.nx, y: z.ny, i });
    if (!S.demo && S.nodes.every((q) => q.st)) { S.over = { k: 'win', t: S.t, all: 1 }; push(S, { k: 'win', t: S.t, x: S.x, y: S.y }); } }
  function hurtFoe(S, e, dmg, kx, ky, src) {""")
# ---- zone bugs: leashed to the node circle, idle wander when the hero is away, pools for the goods bug
rep("      if (f.keep && d < f.keep && lineClear(e.x, e.y, S.x, S.y)) { wantX = -dx / d * 0.6; wantY = -dy / d * 0.6; }   // ranged foes keep their distance",
    """      if (f.keep && d < f.keep && lineClear(e.x, e.y, S.x, S.y)) { wantX = -dx / d * 0.6; wantY = -dy / d * 0.6; }   // ranged foes keep their distance
      const home = e.node ? ZONES[e.node - 1] : null;
      if (home && d > 1300) { const a = t * 0.4 + e.ph * 6.28, tx = home.nx + Math.cos(a) * NODE_R * 0.4, ty = home.ny + Math.sin(a) * NODE_R * 0.3, l = Math.hypot(tx - e.x, ty - e.y) || 1;
        wantX = (tx - e.x) / l * 0.5; wantY = (ty - e.y) / l * 0.5; }""")
rep("      collide(e, f.r * 0.7); clampW(e);\n      const vx = e.vx + e.kx,", """      collide(e, f.r * 0.7); clampW(e);
      if (home) { const lx = e.x - home.nx, ly = (e.y - home.ny) / 0.62, ld = Math.hypot(lx, ly), lim = NODE_R - f.r;   // never leaves its circle
        if (ld > lim) { e.x = home.nx + lx / ld * lim; e.y = home.ny + ly / ld * lim * 0.62; e.kx *= 0.3; e.ky *= 0.3; } }
      const vx = e.vx + e.kx,""")
rep("      if (f.summon && t >= e.sumT) {", """      if (f.pools && t >= e.poolT && d < 900) { e.poolT = t + f.pools.every; for (let j = 0; j < f.pools.count; j++) { const a = rnd(S) * 6.28, r = j ? f.pools.scatter * rnd(S) : 0;
        S.PU.push({ x: S.x + Math.cos(a) * r, y: S.y + Math.sin(a) * r * 0.7, t0: t, life: f.pools.life, r: f.pools.radius, dmg: f.dmg * f.pools.dmg, nt: t + 0.8 }); } push(S, { k: 'pools', t, x: e.x, y: e.y }); }
      if (f.summon && t >= e.sumT && (!home || d < 1400)) {""")
# pools hurt the hero on a tick
rep("    for (let i = S.MK.length - 1; i >= 0; i--) { const m = S.MK[i];", """    for (let i = S.PU.length - 1; i >= 0; i--) { const p = S.PU[i]; if (S.t - p.t0 > p.life) { S.PU.splice(i, 1); continue; }
      if (S.t >= p.nt) { p.nt += 0.6; if (Math.hypot(S.x - p.x, (S.y - p.y) / 0.62) < p.r) hurtHero(S, p.dmg, p.x, p.y); } }
    for (let i = S.MK.length - 1; i >= 0; i--) { const m = S.MK[i];""")
# hold the circle: 6 s inside an open node captures it (progress decays slowly outside)
rep("    foes(S, g); if (!S.demo) waves(S);", """    foes(S, g); if (!S.demo) waves(S);
    ZONES.forEach((z, i) => { const n = S.nodes[i]; if (n.st) return; const inside = Math.hypot(S.x - z.nx, (S.y - z.ny) / 0.62) < NODE_R;
      n.hold = inside ? n.hold + DT : Math.max(0, n.hold - DT * 0.5); if (n.hold >= 6) capture(S, i, 'hold'); });""")
# ---- mouse aim: the trace points at the cursor and fires while the left button is held
rep("""        const o = [S.x, S.y - 40], sh = shoulder(S), tgt = nearest(S, g, o[0], o[1] + 30, st.range * 1.9);
        // the beam leaves the scanner window gunUp above the aim line: turn down by asin(gunUp / d) so it still crosses the target
        if (tgt) { const dx = tgt.x - sh[0], dy = tgt.y - 30 - sh[1], d = Math.hypot(dx, dy) || 1, a0 = Math.atan2(dy, dx); S.aimT = a0 + (Math.cos(a0) < 0 ? -1 : 1) * Math.asin(Math.min(0.9, RIG.gunUp / d)); }
        const on = tgt && Math.abs(Math.atan2(Math.sin(S.aimT - S.aim), Math.cos(S.aimT - S.aim))) < 0.3;
        if (ready && on) {""",
"""        // aimed at the cursor (world point under the pointer), from the shoulder; the beam leaves the scanner window gunUp above the
        // aim line, so turn down by asin(gunUp / d) to cross the cursor; fires while the left button is held, once the arm is on target
        const o = [S.x, S.y - 40], sh = shoulder(S), wx = S.cam[0] + S.px, wy = S.cam[1] + S.py;
        { const dx = wx - sh[0], dy = wy - sh[1], d = Math.max(60, Math.hypot(dx, dy)), a0 = Math.atan2(dy, dx); S.aimT = a0 + (Math.cos(a0) < 0 ? -1 : 1) * Math.asin(Math.min(0.9, RIG.gunUp / d)); }
        const on = S.fire && Math.abs(Math.atan2(Math.sin(S.aimT - S.aim), Math.cos(S.aimT - S.aim))) < 0.3;
        if (ready && on) {""")
rep("    S.aimT = Math.atan2(S.uy, S.ux); weapons(S, g);", "    if (inp.px !== undefined) { S.px = inp.px; S.py = inp.py; } S.fire = inp.press ? 1 : 0; weapons(S, g);")
# attract: the script aims at the nearest foe on screen and holds the button
rep("""    if (Math.abs(t - 9.0) < 0.02) inp.jump = 1;
    return inp; };""", """    if (Math.abs(t - 9.0) < 0.02) inp.jump = 1;
    let best = null, bd = 420; for (const e of S.E) { if (e.dieT >= 0 || e.fly) continue; const d = Math.hypot(e.x - S.x, e.y - S.y); if (d < bd) { bd = d; best = e; } }
    if (best) { inp.px = best.x - S.cam[0]; inp.py = best.y - 30 - S.cam[1]; inp.press = 1; } return inp; };""")
rep("SOLIDS, SPAWN, ORIGIN,", "SOLIDS, SPAWN, ORIGIN, NODE_R,")
open(p, 'w', encoding='utf-8').write(s); print('sim patched')
