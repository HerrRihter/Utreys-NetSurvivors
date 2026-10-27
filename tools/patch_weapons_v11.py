# Round 11 (user: "more weapons and more evolutions, the feel of Vampire Survivors and Deep Rock Galactic: Survivors"):
# six new weapons, three new passives (area / amount / duration), an evolution for every weapon (max level + its passive),
# upgrade capsules (chests) from bugs and bosses, chill and freeze on foes.
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
p = 'live/sim.js'; s = open(p, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:100], s.count(a)); s = s.replace(a, b)

# ---------- data ----------
rep("""  const WSUM = { trace: 'Сектор перед героем, отбрасывает',""", """    // new (round 11): the Vampire Survivors / DRG Survivors staples in the project's terms
    udp:    { name: 'UDP-флуд', ic: 'ic_udp', base: { dmg: 9, count: 1, cd: 0.34, speed: 1150, life: 0.75, pierce: 0, spread: 0.1 },
              steps: [['+1 пакет', { count: 1 }], ['+25% урона', { dmg: 0.25 }], ['Быстрее на 15%', { cd: -0.15 }], ['Пробивает ещё 1 врага', { pierce: 1 }], ['+1 пакет, +30% урона', { count: 1, dmg: 0.3 }]] },
    chain:  { name: 'Эхо-запрос', ic: 'ic_chain', base: { dmg: 18, cd: 1.6, jumps: 3, range: 260 },
              steps: [['+1 переход', { jumps: 1 }], ['+25% урона', { dmg: 0.25 }], ['Быстрее на 15%', { cd: -0.15 }], ['+2 перехода', { jumps: 2 }], ['+35% урона', { dmg: 0.35 }]] },
    storm:  { name: 'Сетевой шторм', ic: 'ic_storm', base: { dmg: 30, count: 2, cd: 1.9, radius: 70 },
              steps: [['+1 разряд', { count: 1 }], ['+25% урона', { dmg: 0.25 }], ['+25% радиуса', { radius: 18 }], ['+1 разряд', { count: 1 }], ['+40% урона', { dmg: 0.4 }]] },
    turret: { name: 'Сторожевой сервер', ic: 'ic_turret', base: { dmg: 8, count: 1, cd: 9, life: 6, rate: 0.28, range: 560 },
              steps: [['Работает на 2 с дольше', { life: 2 }], ['+25% урона', { dmg: 0.25 }], ['Стреляет чаще', { rate: -0.06 }], ['+1 сервер', { count: 1 }], ['+35% урона', { dmg: 0.35 }]] },
    cryo:   { name: 'Криокулер', ic: 'ic_cryo', base: { dmg: 4, cd: 2.4, burst: 1.0, tick: 0.15, range: 230, half: 0.38 },
              steps: [['+25% урона', { dmg: 0.25 }], ['Струя дольше на 0,4 с', { burst: 0.4 }], ['+20% дальности', { range: 46 }], ['Быстрее на 15%', { cd: -0.15 }], ['+35% урона, шире струя', { dmg: 0.35, half: 0.12 }]] },
    fork:   { name: 'Форк-бомба', ic: 'ic_fork', base: { dmg: 40, cd: 3, radius: 110, split: 4, depth: 1 },
              steps: [['+20% радиуса', { radius: 22 }], ['+25% урона', { dmg: 0.25 }], ['+2 осколка', { split: 2 }], ['Быстрее на 15%', { cd: -0.15 }], ['+40% урона', { dmg: 0.4 }]] },
    // evolutions: max level + the paired passive; one level, their own icon (ic_x_<base>)
    trace_x:  { name: 'Полная трассировка', of: 'trace', evo: 1, ic: 'ic_x_trace', base: { dmg: 50, cd: 0.5, range: 230, half: Math.PI / 3, push: 340, back: 1, heal: 0.6 }, steps: [] },
    orbit_x:  { name: 'Кольцо мониторинга', of: 'orbit', evo: 1, ic: 'ic_x_orbit', base: { dmg: 30, count: 6, radius: 210, spin: 4.6, rehit: 0.35 }, steps: [] },
    homing_x: { name: 'Рой криптохвостов', of: 'homing', evo: 1, ic: 'ic_x_homing', base: { dmg: 30, count: 3, cd: 0.4, speed: 780, life: 2.4 }, steps: [] },
    mine_x:   { name: 'Минное поле', of: 'mine', evo: 1, ic: 'ic_x_mine', base: { dmg: 62, count: 4, cd: 1.3, radius: 150, limit: 16, life: 10, ring: 150 }, steps: [] },
    ping_x:   { name: 'Heartbeat', of: 'ping', evo: 1, ic: 'ic_x_ping', base: { dmg: 28, cd: 1.5, radius: 310, push: 520, heal: 0.35 }, steps: [] },
    retry_x:  { name: 'Бесконечный ретрай', of: 'retry', evo: 1, ic: 'ic_x_retry', base: { dmg: 42, count: 8, cd: 1.3, speed: 1000 }, steps: [] },
    cache_x:  { name: 'Горячий кластер', of: 'cache', evo: 1, ic: 'ic_x_cache', base: { dmg: 15, count: 1, cd: 3, radius: 180, life: 3, tick: 0.3, follow: 1 }, steps: [] },
    udp_x:    { name: 'Широкополосный поток', of: 'udp', evo: 1, ic: 'ic_x_udp', base: { dmg: 15, count: 5, cd: 0.18, speed: 1300, life: 0.8, pierce: 99, spread: 0.16 }, steps: [] },
    chain_x:  { name: 'Широковещательный шторм', of: 'chain', evo: 1, ic: 'ic_x_chain', base: { dmg: 30, cd: 0.9, jumps: 14, range: 320 }, steps: [] },
    storm_x:  { name: 'DDoS', of: 'storm', evo: 1, ic: 'ic_x_storm', base: { dmg: 55, count: 8, cd: 1.0, radius: 110 }, steps: [] },
    turret_x: { name: 'Кластер серверов', of: 'turret', evo: 1, ic: 'ic_x_turret', base: { dmg: 14, count: 3, cd: 1, life: 1e9, rate: 0.14, range: 640, perm: 1 }, steps: [] },
    cryo_x:   { name: 'Абсолютный ноль', of: 'cryo', evo: 1, ic: 'ic_x_cryo', base: { dmg: 7, cd: 0, burst: 1e9, tick: 0.15, range: 300, half: 0.55, freeze: 1 }, steps: [] },
    fork_x:   { name: 'Fork-бомба ∞', of: 'fork', evo: 1, ic: 'ic_x_fork', base: { dmg: 70, cd: 2, radius: 140, split: 6, depth: 2 }, steps: [] },
  };
  // evolution recipes: weapon at max level + this passive (any level) → evolved weapon (Vampire Survivors style)
  const EVO = { trace: ['power', 'trace_x'], orbit: ['speed', 'orbit_x'], homing: ['haste', 'homing_x'], mine: ['area', 'mine_x'], ping: ['hp', 'ping_x'],
    retry: ['amount', 'retry_x'], cache: ['dur', 'cache_x'], udp: ['magnet', 'udp_x'], chain: ['haste', 'chain_x'], storm: ['area', 'storm_x'],
    turret: ['dur', 'turret_x'], cryo: ['hp', 'cryo_x'], fork: ['power', 'fork_x'] };
  const WSUM = { trace: 'Сектор перед героем, отбрасывает',""")
rep("""  const WEAP = {""", """  const WEAP0 = {""")
rep("""  };\n    // new (round 11)""", """  const WEAP = Object.assign(WEAP0, {\n    // new (round 11)""")
rep("""    fork_x:   { name: 'Fork-бомба ∞', of: 'fork', evo: 1, ic: 'ic_x_fork', base: { dmg: 70, cd: 2, radius: 140, split: 6, depth: 2 }, steps: [] },\n  };""",
    """    fork_x:   { name: 'Fork-бомба ∞', of: 'fork', evo: 1, ic: 'ic_x_fork', base: { dmg: 70, cd: 2, radius: 140, split: 6, depth: 2 }, steps: [] },\n  });""")
rep("""retry: 'Бумеранг летит и возвращается', cache: 'Горячая зона жжёт врагов' };""",
    """retry: 'Бумеранг летит и возвращается', cache: 'Горячая зона жжёт врагов',
    udp: 'Очередь пакетов в сторону курсора', chain: 'Молния перескакивает между врагами', storm: 'Разряды бьют по случайным врагам на экране',
    turret: 'Ставит сервер-турель, она стреляет сама', cryo: 'Струя холода в сторону курсора: урон и замедление', fork: 'Граната делится на осколки',
    trace_x: 'Бьёт вперёд и назад, лечит за каждое попадание', orbit_x: 'Шесть сканеров на широкой орбите', homing_x: 'Непрерывный рой самонаводящихся пакетов',
    mine_x: 'Мины ложатся кольцом вокруг героя', ping_x: 'Мощная волна, лечит за каждого задетого', retry_x: 'Восемь бумерангов во все стороны',
    cache_x: 'Горячая зона всегда вокруг героя', udp_x: 'Веер пакетов, пробивающих всех', chain_x: 'Молния перескакивает по всей толпе',
    storm_x: 'Восемь разрядов разом', turret_x: 'Три постоянных сервера-турели рядом с героем', cryo_x: 'Холод не выключается и замораживает врагов',
    fork_x: 'Осколки делятся ещё раз' };""")
rep("""    haste:  { name: 'Низкая задержка', ic: 'ic_haste', desc: '−8% к перезарядке' },\n  };""",
    """    haste:  { name: 'Низкая задержка', ic: 'ic_haste', desc: '−8% к перезарядке' },
    area:   { name: 'Широкий охват', ic: 'ic_area', desc: '+10% к радиусу и дальности оружия' },
    amount: { name: 'Репликация', ic: 'ic_amount', desc: '+1 снаряд на уровнях 2 и 4' },
    dur:    { name: 'Keep-alive', ic: 'ic_dur', desc: '+12% к времени действия' },
  };""")
rep("const MAX_W = 3, MAX_PL = 5, MAX_WL = 6;", "const MAX_W = 5, MAX_P = 6, MAX_PL = 5, MAX_WL = 6;   // 5 weapons besides the trace, 6 passive kinds (as in Vampire Survivors)")
rep("ps: { hp: 0, speed: 0, magnet: 0, power: 0, haste: 0 },", "ps: { hp: 0, speed: 0, magnet: 0, power: 0, haste: 0, area: 0, amount: 0, dur: 0 }, TU: [], chestQ: 0,")
rep("const mul = (S) => ({ dmg: 1 + 0.12 * S.ps.power, cd: 1 - 0.08 * S.ps.haste, sp: 1 + 0.08 * S.ps.speed, mag: 1 + 0.4 * S.ps.magnet });",
    "const mul = (S) => ({ dmg: 1 + 0.12 * S.ps.power, cd: 1 - 0.08 * S.ps.haste, sp: 1 + 0.08 * S.ps.speed, mag: 1 + 0.4 * S.ps.magnet,\n    area: 1 + 0.1 * (S.ps.area || 0), dur: 1 + 0.12 * (S.ps.dur || 0), amount: (S.ps.amount >= 2 ? 1 : 0) + (S.ps.amount >= 4 ? 1 : 0) });")

# ---------- picks: evolutions first, a 6-kind passive cap, capsules ----------
rep("""  function rollPick(S) {
    const c = [], own = Object.keys(S.wp).filter((k) => k !== 'trace');
    for (const k in WEAP) { const lv = S.wp[k] || 0; if (lv >= MAX_WL) continue; if (!lv && own.length >= MAX_W) continue; c.push({ k: 'w', id: k, w: lv ? 3 : 2 }); }
    for (const k in PASS) if (S.ps[k] < MAX_PL) c.push({ k: 'p', id: k, w: 1.4 });
    const out = [];""", """  const evosReady = (S) => Object.keys(S.wp).filter((k) => EVO[k] && S.wp[k] >= MAX_WL && S.ps[EVO[k][0]] > 0).map((k) => ({ k: 'evo', id: EVO[k][1], from: k }));
  function rollPick(S, chest) {
    const c = [], own = Object.keys(S.wp).filter((k) => k !== 'trace' && k !== 'trace_x'), pk = Object.keys(PASS).filter((k) => S.ps[k] > 0).length;
    const evolved = (k) => EVO[k] && S.wp[EVO[k][1]];
    for (const k in WEAP) { const lv = S.wp[k] || 0; if (WEAP[k].evo || evolved(k) || lv >= MAX_WL) continue; if (!lv && (own.length >= MAX_W || chest)) continue; c.push({ k: 'w', id: k, w: lv ? 3 : 2 }); }
    for (const k in PASS) if (S.ps[k] < MAX_PL && (S.ps[k] > 0 || (pk < MAX_P && !chest))) c.push({ k: 'p', id: k, w: 1.4 });
    const out = evosReady(S).slice(0, 3);                              // an evolution, when one is ready, is always offered
   """)
rep("""  function applyPick(S, o) {
    if (o.k === 'w')""", """  function applyPick(S, o) {
    if (o.k === 'evo') { delete S.wp[o.from]; S.wp[o.id] = 1; S.wcd[o.id] = 0.2; S.toast = { s: 'ЭВОЛЮЦИЯ: ' + WEAP[o.id].name.toUpperCase(), t: S.t };
      push(S, { k: 'evo', t: S.t, x: S.x, y: S.y - 60, id: o.id }); }
    else if (o.k === 'w')""")
rep("""    if (S.pend > 0) { S.pend--; S.pick = { t0: S.t, opts: rollPick(S) }; }
  }""", """    if (S.pend > 0) { S.pend--; S.pick = { t0: S.t, opts: rollPick(S) }; }
    else if (S.chestQ > 0) { S.chestQ--; S.pick = { t0: S.t, opts: rollPick(S, true), chest: 1 }; }
  }
  // an upgrade capsule (the survivors' chest): dropped by bugs and bosses, opens a pick of owned upgrades with any ready evolution first
  const openChest = (S) => { if (S.pick) S.chestQ++; else S.pick = { t0: S.t, opts: rollPick(S, true), chest: 1 }; };
  const dropChest = (S, x, y) => S.Gm.push({ x, y, v: 0, k: 5, m: 0, vx: 0, vy: -80, b: 3 });""")
rep("    S.bars += 5; S.hp = Math.min(hpMax(S), S.hp + 30);", "    S.bars += 5; S.hp = Math.min(hpMax(S), S.hp + 30); if (!S.demo) dropChest(S, z.nx, z.ny + 60);")
rep("    if (f.boss) { if (S.boss === e.id) S.boss = null;", "    if (f.boss) { if (S.boss === e.id) S.boss = null; if (e.k !== 'boss' && !S.demo) dropChest(S, e.x, e.y);")
rep("else if (p.b === 2) { S.hp = Math.min(hpMax(S), S.hp + 30); push(S, { k: 'heal', t, x: p.x, y: p.y }); }",
    "else if (p.b === 2) { S.hp = Math.min(hpMax(S), S.hp + 30); push(S, { k: 'heal', t, x: p.x, y: p.y }); }\n        else if (p.b === 3) { push(S, { k: 'chest', t, x: p.x, y: p.y }); openChest(S); }")
rep("if (S.Gm.length > 320) { const a = S.Gm.shift();", "if (S.Gm.length > 320) { const ai = S.Gm.findIndex((q) => q.b !== 3), a = S.Gm.splice(Math.max(0, ai), 1)[0];")

# ---------- weapons: passives applied, behaviour by base kind ----------
rep("""    for (const id in S.wp) { const lv = S.wp[id], st = wstat(id, lv); if (S.wcd[id] === undefined) S.wcd[id] = 0; S.wcd[id] -= DT; const ready = S.wcd[id] <= 0, cd = (st.cd || 1) * M.cd;
      if (id === 'trace') {""", """    for (const id in S.wp) { const lv = S.wp[id], st = wstat(id, lv), kind = WEAP[id].of || id; if (S.wcd[id] === undefined) S.wcd[id] = 0; S.wcd[id] -= DT; const ready = S.wcd[id] <= 0, cd = (st.cd || 1) * M.cd;
      for (const k of ['radius', 'range', 'ring']) if (st[k] && !(kind === 'trace' && k === 'range' && false)) st[k] *= M.area;      // Широкий охват
      if (st.life && st.life < 1e8) st.life *= M.dur; if (st.burst && st.burst < 1e8) st.burst *= M.dur;                             // Keep-alive
      if (st.count && kind !== 'orbit' || kind === 'orbit') st.count = (st.count || 1) + M.amount;                                  // Репликация
      if (kind === 'trace') {""")
rep("        if (ready && on) { S.wcd.trace = cd; S.sw = { t0: t, r: st.range, half: st.half, done: 0 }; push(S, { k: 'swing', t, x: S.x, y: S.y }); }",
    "        if (ready && on) { S.wcd[id] = cd; S.sw = { t0: t, r: st.range, half: st.half, done: 0 }; push(S, { k: 'swing', t, x: S.x, y: S.y }); }")
rep("""        if (S.sw && !S.sw.done && t - S.sw.t0 >= 0.06) { S.sw.done = 1; const a = S.aim, [tx, ty] = tip(S); let n = 0;
          push(S, { k: 'trace', t, x: tx, y: ty, a, r: st.range, half: st.half });
          near(S, g, tx, ty, st.range + 260, (e) => { const rr = FOE[e.k].r * 0.85, cx = e.x - tx, cy = e.y - FOE[e.k].r * 1.3 - ty;
            if (!inSector(cx, cy, a, st.half, st.range, rr)) return;
            hurtFoe(S, e, st.dmg * M.dmg, Math.cos(a) * st.push, Math.sin(a) * st.push, 'trace'); n++; });""",
    """        if (S.sw && !S.sw.done && t - S.sw.t0 >= 0.06) { S.sw.done = 1; const a = S.aim, [tx, ty] = tip(S); let n = 0;
          push(S, { k: 'trace', t, x: tx, y: ty, a, r: st.range, half: st.half, evo: st.back ? 1 : 0 });
          if (st.back) push(S, { k: 'trace', t, x: S.x, y: S.y - 50, a: a + Math.PI, r: st.range * 0.8, half: st.half, evo: 1 });
          const hitSector = (ox, oy, aa, R) => near(S, g, ox, oy, R + 260, (e) => { const rr = FOE[e.k].r * 0.85, cx = e.x - ox, cy = e.y - FOE[e.k].r * 1.3 - oy;
            if (!inSector(cx, cy, aa, st.half, R, rr)) return;
            hurtFoe(S, e, st.dmg * M.dmg, Math.cos(aa) * st.push, Math.sin(aa) * st.push, 'trace'); n++; });
          hitSector(tx, ty, a, st.range); if (st.back) hitSector(S.x, S.y - 50, a + Math.PI, st.range * 0.8);
          if (st.heal && n) S.hp = Math.min(hpMax(S), S.hp + Math.min(3, n * st.heal));""")
rep("      if (id === 'orbit') {", "      if (kind === 'orbit') {")
rep("      if (id === 'homing' && ready) { const tg = nearest(S, g, S.x, S.y, 900); if (tg) { S.wcd.homing = cd;", "      if (kind === 'homing' && ready) { const tg = nearest(S, g, S.x, S.y, 900); if (tg) { S.wcd[id] = cd;")
rep("""      if (id === 'mine' && ready) { S.wcd.mine = cd; for (let i = 0; i < st.count; i++) { if (S.MN.length >= st.limit) S.MN.shift();
        S.MN.push({ x: S.x + (i - (st.count - 1) / 2) * 50, y: S.y + 6,""", """      if (kind === 'mine' && ready) { S.wcd[id] = cd; for (let i = 0; i < st.count; i++) { if (S.MN.length >= st.limit) S.MN.shift();
        const ma = i * 6.2832 / st.count + t; S.MN.push({ x: S.x + (st.ring ? Math.cos(ma) * st.ring : (i - (st.count - 1) / 2) * 50), y: S.y + 6 + (st.ring ? Math.sin(ma) * st.ring * 0.62 : 0),""")
rep("""      if (id === 'ping' && ready && nearest(S, g, S.x, S.y, st.radius * 1.4)) { S.wcd.ping = cd; push(S, { k: 'ping', t, x: S.x, y: S.y - 30, r: st.radius });
        near(S, g, S.x, S.y, st.radius + 40, (e) => { const dx = e.x - S.x, dy = e.y - S.y, d = Math.hypot(dx, dy) || 1; if (d > st.radius + FOE[e.k].r) return;
          hurtFoe(S, e, st.dmg * M.dmg, dx / d * st.push, dy / d * st.push, 'ping'); }); hitTanks(S, S.x, S.y, st.radius, st.dmg); }""",
    """      if (kind === 'ping' && ready && nearest(S, g, S.x, S.y, st.radius * 1.4)) { S.wcd[id] = cd; push(S, { k: 'ping', t, x: S.x, y: S.y - 30, r: st.radius, evo: st.heal ? 1 : 0 }); let n = 0;
        near(S, g, S.x, S.y, st.radius + 40, (e) => { const dx = e.x - S.x, dy = e.y - S.y, d = Math.hypot(dx, dy) || 1; if (d > st.radius + FOE[e.k].r) return;
          hurtFoe(S, e, st.dmg * M.dmg, dx / d * st.push, dy / d * st.push, 'ping'); n++; }); hitTanks(S, S.x, S.y, st.radius, st.dmg);
        if (st.heal && n) S.hp = Math.min(hpMax(S), S.hp + Math.min(4, n * st.heal)); }""")
rep("      if (id === 'retry' && ready) { const tg = nearest(S, g, S.x, S.y, 800); if (tg) { S.wcd.retry = cd;", "      if (kind === 'retry' && ready) { const tg = nearest(S, g, S.x, S.y, 800); if (tg) { S.wcd[id] = cd;")
rep("      if (id === 'cache' && ready) { const tg = nearest(S, g, S.x, S.y, 700); if (tg) { S.wcd.cache = cd;",
    """      if (kind === 'cache' && st.follow) { let z = S.ZN.find((q) => q.follow); if (!z) { z = { follow: 1, t0: t, life: 1e9, nt: t }; S.ZN.push(z); }
        Object.assign(z, { x: S.x, y: S.y, r: st.radius, dmg: st.dmg * M.dmg, tick: st.tick }); }
      else if (kind === 'cache' && ready) { const tg = nearest(S, g, S.x, S.y, 700); if (tg) { S.wcd[id] = cd;""")
# the six new behaviours, after the cache branch
rep("""    }
    // projectiles
    for (let i = S.P.length - 1; i >= 0; i--) { const p = S.P[i]; p.life -= DT; let dead = p.life <= 0;""", """      if (kind === 'udp' && ready && nearest(S, g, S.x, S.y, 1100)) { S.wcd[id] = cd; const [hx, hy] = tip(S);           // a volley along the aim (the mouse)
        for (let i = 0; i < st.count; i++) { const a = S.aim + (i - (st.count - 1) / 2) * st.spread + (rnd(S) - 0.5) * 0.04;
          S.P.push({ k: 'udp', x: hx, y: hy, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, life: st.life, t0: t, dmg: st.dmg * M.dmg, pierce: st.pierce, hit: [], evo: WEAP[id].evo ? 1 : 0 }); }
        push(S, { k: 'udp', t, x: hx, y: hy }); }
      if (kind === 'chain' && ready) { let cur = nearest(S, g, S.x, S.y, 560); if (cur) { S.wcd[id] = cd; const pts = [tip(S)], hit = [];
        for (let j = 0; cur && j <= st.jumps; j++) { hit.push(cur.id); pts.push([cur.x, cur.y - FOE[cur.k].r * 1.3]); hurtFoe(S, cur, st.dmg * M.dmg * Math.pow(0.92, j), 0, 0, 'chain');
          let nx = null, nd = st.range; near(S, g, cur.x, cur.y, st.range, (e) => { if (hit.includes(e.id)) return; const d = Math.hypot(e.x - cur.x, e.y - cur.y); if (d < nd) { nd = d; nx = e; } }); cur = nx; }
        push(S, { k: 'chain', t, x: S.x, y: S.y, pts, evo: WEAP[id].evo ? 1 : 0 }); } }
      if (kind === 'storm' && ready) { const pool = []; near(S, g, S.x, S.y, 1100, (e) => { if (Math.abs(e.x - S.x) < 950 && Math.abs(e.y - S.y) < 520) pool.push(e); });
        if (pool.length) { S.wcd[id] = cd; for (let j = 0; j < st.count && pool.length; j++) { const e = pool.splice(Math.floor(rnd(S) * pool.length), 1)[0], bx = e.x, by = e.y;
            push(S, { k: 'bolt', t, x: bx, y: by, r: st.radius, evo: WEAP[id].evo ? 1 : 0 });
            near(S, g, bx, by, st.radius + 60, (o) => { if (Math.hypot(o.x - bx, (o.y - by) / 0.62) < st.radius + FOE[o.k].r * 0.6) hurtFoe(S, o, st.dmg * M.dmg, 0, 0, 'storm'); }); hitTanks(S, bx, by, st.radius, st.dmg); } } }
      if (kind === 'turret') { const mine = S.TU.filter((u) => u.w === id);
        if (st.perm) for (const u of mine) if (Math.hypot(u.x - S.x, u.y - S.y) > 1000) { u.x = S.x + (rnd(S) - 0.5) * 300; u.y = S.y + 120; }    // the cluster keeps up
        if (ready && mine.length < st.count) { S.wcd[id] = st.perm ? 0.5 : cd; const a = rnd(S) * 6.28; let x = S.x + Math.cos(a) * 90, y = S.y + Math.sin(a) * 60;
          if (blocked(x, y, 30)) { x = S.x; y = S.y; } S.TU.push({ w: id, x, y, t0: t, life: st.life, nt: t + 0.4, a: 0 }); push(S, { k: 'turret', t, x, y }); }
        for (const u of mine) { u.dmg = st.dmg * M.dmg; u.rate = st.rate; u.range = st.range; u.evo = WEAP[id].evo ? 1 : 0; } }
      if (kind === 'cryo') { if (ready && !(S.cryo && S.cryo.until > t)) { S.wcd[id] = cd + st.burst; S.cryo = { t0: t, until: t + st.burst, nt: t, w: id }; push(S, { k: 'cryo', t, x: S.x, y: S.y }); }
        if (S.cryo && S.cryo.w === id && S.cryo.until > t && t >= S.cryo.nt) { S.cryo.nt = t + st.tick; const a = S.aim, [tx, ty] = tip(S); S.cryo.r = st.range; S.cryo.half = st.half;
          near(S, g, tx, ty, st.range + 200, (e) => { const rr = FOE[e.k].r * 0.85; if (!inSector(e.x - tx, e.y - FOE[e.k].r * 1.3 - ty, a, st.half, st.range, rr)) return;
            hurtFoe(S, e, st.dmg * M.dmg, Math.cos(a) * 30, Math.sin(a) * 30, 'cryo'); e.chillT = t + 0.7; e.chillN = (e.chillN || 0) + 1;
            if (st.freeze && e.chillN >= 8 && !FOE[e.k].boss && !FOE[e.k].mini) { e.frzT = t + 1.2; e.chillN = 0; } }); } }
      if (kind === 'fork' && ready) { const tg = nearest(S, g, S.x, S.y, 720); if (tg) { S.wcd[id] = cd;
        S.P.push({ k: 'fork', x: S.x, y: S.y, ox: S.x, oy: S.y, tx: tg.x, ty: tg.y, t0: t, T: 0.65, life: 9, dmg: st.dmg * M.dmg, r: st.radius, split: st.split, depth: st.depth, evo: WEAP[id].evo ? 1 : 0 });
        push(S, { k: 'toss', t, x: S.x, y: S.y - 50 }); } }
    }
    // sentry servers: shoot the nearest foe in range
    for (let i = S.TU.length - 1; i >= 0; i--) { const u = S.TU[i]; if (!S.wp[u.w] || t - u.t0 > u.life) { S.TU.splice(i, 1); continue; }
      if (t >= u.nt) { const tg = nearest(S, g, u.x, u.y, u.range || 560); if (tg) { u.nt = t + (u.rate || 0.3); const a = Math.atan2(tg.y - 30 - (u.y - 70), tg.x - u.x); u.a = a;
          S.P.push({ k: 'tsh', x: u.x + Math.cos(a) * 30, y: u.y - 70 + Math.sin(a) * 30, vx: Math.cos(a) * 1000, vy: Math.sin(a) * 1000, life: 0.8, t0: t, dmg: u.dmg, pierce: 0, hit: [], evo: u.evo });
          push(S, { k: 'tfire', t, x: u.x, y: u.y - 70 }); } } }
    // projectiles
    for (let i = S.P.length - 1; i >= 0; i--) { const p = S.P[i]; p.life -= DT; let dead = p.life <= 0;
      if (p.k === 'udp' || p.k === 'tsh') { p.x += p.vx * DT; p.y += p.vy * DT; const c = Math.floor((p.y + 40) / FC) * FW + Math.floor(p.x / FC); if (WALL[c]) dead = true;
        near(S, g, p.x, p.y + 30, 60, (e) => { if (dead || p.hit.includes(e.id)) return; if (Math.hypot(e.x - p.x, e.y - FOE[e.k].r * 1.3 - p.y) < FOE[e.k].r + 8) { p.hit.push(e.id);
          hurtFoe(S, e, p.dmg, p.vx * 0.12, p.vy * 0.12, p.k); if (p.pierce-- <= 0) dead = true; } }); }
      if (p.k === 'fork') { const q = Math.min(1, (S.t - p.t0) / p.T); p.x = p.ox + (p.tx - p.ox) * q; p.y = p.oy + (p.ty - p.oy) * q; p.z = 4 * q * (1 - q) * (p.depth > 0 && p.split ? 260 : 140);
        if (q >= 1) { dead = true; push(S, { k: 'blast', t: S.t, x: p.tx, y: p.ty, r: p.r, evo: p.evo });
          near(S, g, p.tx, p.ty, p.r + 60, (e) => { const dx = e.x - p.tx, dy = e.y - p.ty, d = Math.hypot(dx, dy) || 1; if (d < p.r + FOE[e.k].r * 0.5) hurtFoe(S, e, p.dmg, dx / d * 220, dy / d * 220, 'fork'); });
          hitTanks(S, p.tx, p.ty, p.r, p.dmg);
          if (p.depth > 0) for (let j = 0; j < p.split; j++) { const a = j * 6.2832 / p.split + rnd(S) * 0.6, d = p.r * (0.9 + 0.6 * rnd(S));
            S.P.push({ k: 'fork', x: p.tx, y: p.ty, ox: p.tx, oy: p.ty, tx: p.tx + Math.cos(a) * d, ty: p.ty + Math.sin(a) * d * 0.7, t0: S.t, T: 0.4, life: 9, dmg: p.dmg * 0.45, r: p.r * 0.55, split: p.split, depth: p.depth - 1, evo: p.evo }); } } }""")
# chill and freeze on foes
rep("      if (f.kind === 'spin' && e.spinT > t) { wantX = dx / d; wantY = dy / d; sp = f.sp * f.spin.speed; }",
    "      if (f.kind === 'spin' && e.spinT > t) { wantX = dx / d; wantY = dy / d; sp = f.sp * f.spin.speed; }\n      if (e.chillT > t) sp *= f.boss ? 0.8 : 0.55; if (e.frzT > t) sp = 0;                                                  // Криокулер")
rep("if (f.kind !== 'desk' && !(e.spinT > t) && e.atkT < 0", "if (f.kind !== 'desk' && !(e.spinT > t) && !(e.frzT > t) && e.atkT < 0")
rep("WEAP, WSUM, PASS, MAX_WL, MAX_PL,", "WEAP, WSUM, PASS, EVO, MAX_W, MAX_P, MAX_WL, MAX_PL,")
open(p, 'w', encoding='utf-8').write(s); print('sim patched')
