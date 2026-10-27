# Round 17 (plan stage 2): the original's five heroes (utreys-survivors data/characters/heroes.js, hero-passives.js).
# Distances ×2.5 (the trace reaches 175 px against the original's 70), speeds ×2. Each hero has its own weapon (6 levels +
# an evolution), a passive and a shop training; code dispatches on the weapon's kind, never on the hero id.
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
p = 'live/sim.js'; s = open(p, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:100], s.count(a)); s = s.replace(a, b)

# ---------- data ----------
rep("    trace:  { name: 'Трассировка кодов', ic: 'ic_trace', base:", "    trace:  { name: 'Трассировка кодов', ic: 'ic_trace', hero: 1, base:")
rep("""    fork_x:   { name: 'Fork-бомба ∞', of: 'fork', evo: 1, ic: 'ic_x_fork', base: { dmg: 70, cd: 2, radius: 140, split: 6, depth: 2 }, steps: [] },
  });""", """    fork_x:   { name: 'Fork-бомба ∞', of: 'fork', evo: 1, ic: 'ic_x_fork', base: { dmg: 70, cd: 2, radius: 140, split: 6, depth: 2 }, steps: [] },
    // the heroes' own attacks (hero: 1 — never offered to another hero)
    tchain:  { name: 'Цепочка прослеживаемости', ic: 'ic_chain', hero: 1, base: { dmg: 24, cd: 0.9, range: 290, jumps: 6, cone: 1.0 },
               steps: [['+25% урона', { dmg: 0.25 }], ['+20% к длине перехода', { range: 58 }], ['Быстрее на 15%', { cd: -0.15 }], ['+2 цели', { jumps: 2 }], ['+35% урона', { dmg: 0.35 }]] },
    packet:  { name: 'Серийный пакет', ic: 'ic_udp', hero: 1, base: { dmg: 23, cd: 0.75, range: 775, speed: 1000, count: 1, spread: 0.2 },
               steps: [['+25% урона', { dmg: 0.25 }], ['+1 пакет', { count: 1 }], ['Быстрее на 15%', { cd: -0.15 }], ['+20% дальности', { range: 155 }], ['+35% урона, +1 пакет', { dmg: 0.35, count: 1 }]] },
    req:     { name: 'Разбор требований', ic: 'ic_trace', hero: 1, kind: 'trace', base: { dmg: 26, cd: 0.85, range: 212, half: Math.PI * 2 / 5, push: 230 },
               steps: [['+25% урона', { dmg: 0.25 }], ['+20% дальности', { range: 42 }], ['Быстрее на 15%', { cd: -0.15 }], ['Шире сектор', { half: 0.2 }], ['+35% урона', { dmg: 0.35 }]] },
    regress: { name: 'Регрессионная проверка', ic: 'ic_area', hero: 1, base: { dmg: 19, cd: 1.05, range: 225, stun: 0.6 },
               steps: [['+25% урона', { dmg: 0.25 }], ['+15% к зоне', { range: 34 }], ['Быстрее на 15%', { cd: -0.15 }], ['Прерывание дольше на 0,3 с', { stun: 0.3 }], ['+35% урона', { dmg: 0.35 }]] },
    tchain_x:  { name: 'Обратная цепь', of: 'tchain', evo: 1, ic: 'ic_x_tchain', base: { dmg: 34, cd: 0.75, range: 340, jumps: 10, cone: 1.2, back: 1 }, steps: [] },
    packet_x:  { name: 'Расщеплённый пакет', of: 'packet', evo: 1, ic: 'ic_x_packet', base: { dmg: 32, cd: 0.6, range: 900, speed: 1100, count: 2, spread: 0.2, split: 3 }, steps: [] },
    req_x:     { name: 'Работа с ключевым клиентом', of: 'req', kind: 'trace', evo: 1, ic: 'ic_x_req', base: { dmg: 44, cd: 0.7, range: 250, half: Math.PI / 2, push: 300, client: 2, heal: 0.5 }, steps: [] },
    regress_x: { name: 'Метка дефекта', of: 'regress', evo: 1, ic: 'ic_x_regress', base: { dmg: 28, cd: 0.9, range: 280, stun: 1.0, mark: 1 }, steps: [] },
  });
  // the five heroes: speed is relative to K.SPEED; price in codes (Utrace is free); col = the hero's accent
  const HEROES = {
    utrace:        { name: 'Utrace', role: 'Универсал', roleDesc: 'Ровный во всём, лучший выбор для первой смены.', price: 0, hp: 120, speed: 1, weapon: 'trace', art: 'hero', col: [0.0, 0.62, 0.73],
                     passive: { name: 'Универсальный стек', desc: '+1 слот оружия: 5 видов вместе с атакой героя', slots: 1 },
                     training: { name: 'Оптимизация Utrace', desc: '+6% к урону подобранного оружия', factor: 0.06 } },
    traceability:  { name: 'Полная прослеживаемость', role: 'Против толпы', roleDesc: 'Чем плотнее толпа вокруг, тем сильнее каждый удар.', price: 80, hp: 110, speed: 145 / 150, weapon: 'tchain', art: 'hr_trc', col: [0.43, 0.89, 0.8],
                     passive: { name: 'Связанные данные', desc: '+3% урона за каждого врага ближе 400 px, до +30%', crowd: 0.03, cap: 0.3 },
                     training: { name: 'Оптимизация: Полная прослеживаемость', desc: '+10% к пределу бонуса за толпу', factor: 0.1 } },
    serialization: { name: 'Сериализация', role: 'Дальний бой', roleDesc: 'Держит дистанцию и расстреливает врагов на подходе.', price: 100, hp: 100, speed: 160 / 150, weapon: 'packet', art: 'hr_ser', col: [0.55, 0.8, 1.0],
                     passive: { name: 'Дальняя доставка', desc: '+20% урона по врагам дальше 375 px', far: 0.2 },
                     training: { name: 'Оптимизация: Сериализация', desc: '+7% к урону по дальним врагам', factor: 0.07 } },
    ba:            { name: 'БА', role: 'Танк', roleDesc: 'Крепнет по ходу смены, побеждая своего клиента.', price: 120, hp: 135, speed: 140 / 150, weapon: 'req', art: 'hr_ba', col: [0.97, 0.81, 0.44],
                     passive: { name: 'Ключевой клиент', desc: '+1 HP (и к максимуму) за каждого побеждённого выбранного клиента', clientHp: 1 },
                     training: { name: 'Оптимизация: БА', desc: '+0,5 HP за убийство клиента', factor: 0.5 } },
    qa:            { name: 'QA', role: 'Контроль', roleDesc: 'Останавливает врагов и добивает отмеченные цели критами.', price: 140, hp: 115, speed: 1, weapon: 'regress', art: 'hr_qa', col: [0.47, 0.93, 0.74],
                     passive: { name: 'Найденный дефект', desc: '10% шанс крита ×1,8; по целям скана за 2 с ещё +35%', crit: 0.1, scanCrit: 0.35 },
                     training: { name: 'Оптимизация: QA', desc: '+4% к шансу крита', factor: 0.04 } },
  };
  // БА's key client: client brands only (no regulators, bugs or staff), as in the original's ba-specialization
  const CLIENTS = ['orb', 'keg', 'baltika', 'mars', 'loreal', 'multon', 'ferrero', 'mond', 'prog', 'royal', 'cherk', 'pg', 'petfood'];
  const heroOf = (S) => HEROES[S.hero] || HEROES.utrace;""")
rep("turret: ['dur', 'turret_x'], cryo: ['hp', 'cryo_x'], fork: ['power', 'fork_x'] };",
    "turret: ['dur', 'turret_x'], cryo: ['hp', 'cryo_x'], fork: ['power', 'fork_x'],\n    tchain: ['amount', 'tchain_x'], packet: ['speed', 'packet_x'], req: ['hp', 'req_x'], regress: ['area', 'regress_x'] };")
rep("    fork_x: 'Осколки делятся ещё раз' };", """    fork_x: 'Осколки делятся ещё раз',
    tchain: 'Цепь от ближайшей цели впереди перескакивает на соседей, до 6 целей', packet: 'Пробивающий пакет в сторону курсора',
    req: 'Широкий сектор перед героем, сильно отбрасывает', regress: 'Квадрат проверки вокруг героя прерывает атаки обычных врагов',
    tchain_x: 'До 10 целей, цепь возвращается и бьёт ещё раз', packet_x: 'Пакеты расщепляются на три при первом попадании',
    req_x: 'Вдвое больнее выбранному клиенту, лечит за попадания', regress_x: 'Отмеченные цели 2 с получают на 50% больше урона' };""")
rep("  const MAX_W = 5, MAX_P = 6, MAX_PL = 5, MAX_WL = 6;   // 5 weapons besides the trace, 6 passive kinds (as in Vampire Survivors)",
    "  const MAX_W = 4, MAX_P = 6, MAX_PL = 5, MAX_WL = 6;   // weapons besides the hero's own attack (+ the hero's slots: Utrace 5), 6 passive kinds")
rep("  const hpMax = (S) => K.HP + 20 * S.ps.hp + 10 * md(S, 'health');", "  const hpMax = (S) => heroOf(S).hp + 20 * S.ps.hp + 10 * md(S, 'health') + (S.hpBonus || 0);")
rep("    const M = mul(S), spd = K.SPEED * M.sp * (t < S.slowT ? 1 - S.slowA : 1);", "    const M = mul(S), spd = K.SPEED * heroOf(S).speed * M.sp * (t < S.slowT ? 1 - S.slowA : 1);")

# ---------- picks: the hero's attack is never offered to others, slots per hero ----------
rep("    const c = [], own = Object.keys(S.wp).filter((k) => k !== 'trace' && k !== 'trace_x'), pk = Object.keys(PASS).filter((k) => S.ps[k] > 0).length;",
    "    const B = S.base || 'trace', c = [], own = Object.keys(S.wp).filter((k) => k !== B && k !== EVO[B][1]), pk = Object.keys(PASS).filter((k) => S.ps[k] > 0).length;\n    const maxW = MAX_W + (heroOf(S).passive.slots || 0);")
rep("if (WEAP[k].evo || evolved(k) || lv >= MAX_WL) continue; if (!lv && (own.length >= MAX_W || chest)) continue;",
    "if (WEAP[k].evo || evolved(k) || lv >= MAX_WL || (WEAP[k].hero && k !== B)) continue; if (!lv && (own.length >= maxW || chest)) continue;")

# ---------- weapons: aim for everyone, kinds ----------
rep("    for (const id in S.wp) { const lv = S.wp[id], st = wstat(id, lv), kind = WEAP[id].of || id;",
    """    // every hero aims at the cursor from the shoulder; the beam leaves the scanner window gunUp above the aim line, so turn down by
    // asin(gunUp / d) to cross the cursor; the facing follows the target (with hysteresis), never the arm (no chase loop)
    { const sh = shoulder(S), wx = S.cam[0] + S.px, wy = S.cam[1] + S.py, dx = wx - sh[0], dy = wy - sh[1], d = Math.max(60, Math.hypot(dx, dy)), a0 = Math.atan2(dy, dx);
      if (Math.abs(Math.cos(a0)) > 0.2) S.face = Math.cos(a0) > 0 ? 1 : -1; S.aimT = a0 + S.face * Math.asin(Math.min(0.9, RIG.gunUp / d)); }
    const onAim = Math.abs(Math.atan2(Math.sin(S.aimT - S.aim), Math.cos(S.aimT - S.aim))) < 0.3;
    for (const id in S.wp) { const lv = S.wp[id], st = wstat(id, lv), kind = WEAP[id].kind || WEAP[id].of || id;""")
rep("""        // aimed from the shoulder (the scanner hangs off it); fires only once the arm has turned onto the target
        // aimed at the cursor (world point under the pointer), from the shoulder; the beam leaves the scanner window gunUp above the
        // aim line, so turn down by asin(gunUp / d) to cross the cursor; fires while the left button is held, once the arm is on target
        const o = [S.x, S.y - 40], sh = shoulder(S), wx = S.cam[0] + S.px, wy = S.cam[1] + S.py;
        { const dx = wx - sh[0], dy = wy - sh[1], d = Math.max(60, Math.hypot(dx, dy)), a0 = Math.atan2(dy, dx);
          if (Math.abs(Math.cos(a0)) > 0.2) S.face = Math.cos(a0) > 0 ? 1 : -1;      // facing follows the target (with hysteresis), never the arm: no chase loop
          S.aimT = a0 + S.face * Math.asin(Math.min(0.9, RIG.gunUp / d)); }
        const on = Math.abs(Math.atan2(Math.sin(S.aimT - S.aim), Math.cos(S.aimT - S.aim))) < 0.3;
        if (ready && on) {""", """        // a sector at the cursor, fired once the arm is on target (Utrace's trace, БА's requirements review)
        if (ready && onAim) {""")
rep("            hurtFoe(S, e, st.dmg * M.dmg, Math.cos(aa) * st.push, Math.sin(aa) * st.push, 'trace'); n++; });",
    "            hurtFoe(S, e, st.dmg * M.dmg * (st.client && e.k === S.client ? st.client : 1), Math.cos(aa) * st.push, Math.sin(aa) * st.push, 'trace'); n++; });")
rep("""      if (kind === 'udp' && ready && nearest(S, g, S.x, S.y, 1100)) {""", """      if (kind === 'tchain' && ready && onAim) { const [tx, ty] = tip(S); let cur = null, bd = st.range * 1.3;          // chain from the nearest foe ahead, breadth-first
        near(S, g, S.x, S.y, st.range * 1.4, (e) => { if (e.fly || e.dieT >= 0) return; const dx = e.x - S.x, dy = e.y - S.y, d = Math.hypot(dx, dy); let da = Math.atan2(dy, dx) - S.aim;
          da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < st.cone && d < bd) { bd = d; cur = e; } });
        if (cur) { S.wcd[id] = cd; const q = [cur], hit = [cur.id];
          for (let qi = 0; qi < q.length && q.length < st.jumps; qi++) { const c = q[qi]; near(S, g, c.x, c.y, st.range, (e) => { if (q.length >= st.jumps || hit.includes(e.id) || e.fly || e.dieT >= 0) return;
            if (Math.hypot(e.x - c.x, e.y - c.y) < st.range && lineClear(c.x, c.y - 30, e.x, e.y - 30)) { hit.push(e.id); q.push(e); } }); }
          const pts = [[tx, ty]]; for (const e of q) { pts.push([e.x, e.y - FOE[e.k].r * 1.3]); hurtFoe(S, e, st.dmg * M.dmg, 0, 0, 'tchain'); if (st.back) hurtFoe(S, e, st.dmg * M.dmg * 0.6, 0, 0, 'tchain'); }
          push(S, { k: 'chain', t, x: S.x, y: S.y, pts, hero: 1, evo: WEAP[id].evo ? 1 : 0 }); push(S, { k: 'swing', t, x: S.x, y: S.y }); } }
      if (kind === 'packet' && ready && onAim && nearest(S, g, S.x, S.y, st.range)) { S.wcd[id] = cd; const [tx, ty] = tip(S);            // a piercing packet at the cursor
        for (let i = 0; i < st.count; i++) { const a = S.aim + (i - (st.count - 1) / 2) * st.spread;
          S.P.push({ k: 'pkt', x: tx, y: ty, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, life: st.range / st.speed, t0: t, dmg: st.dmg * M.dmg, pierce: 999, hit: [], split: st.split || 0, evo: WEAP[id].evo ? 1 : 0 }); }
        push(S, { k: 'swing', t, x: S.x, y: S.y }); }
      if (kind === 'regress' && ready && nearest(S, g, S.x, S.y, st.range * 1.3)) { S.wcd[id] = cd; const R = st.range;                 // QA: a square check round the hero
        push(S, { k: 'scan', t, x: S.x, y: S.y, r: R, evo: WEAP[id].evo ? 1 : 0 });
        near(S, g, S.x, S.y, R * 1.5, (e) => { if (e.fly || e.dieT >= 0 || Math.abs(e.x - S.x) > R + FOE[e.k].r * 0.5 || Math.abs(e.y - S.y) > R * 0.62 + FOE[e.k].r * 0.5) return;
          e.scanT = t; if (st.mark) e.markT = t + 2;
          if (!FOE[e.k].boss && !FOE[e.k].mini) { e.atkT = -9; e.stunT = t + st.stun; e.nextAtk = Math.max(e.nextAtk, t + st.stun); }
          hurtFoe(S, e, st.dmg * M.dmg, 0, 0, 'regress'); }); hitTanks(S, S.x, S.y, R, st.dmg); }
      if (kind === 'udp' && ready && nearest(S, g, S.x, S.y, 1100)) {""")
# packets fly like UDP shots and can split on their first hit
rep("      if (p.k === 'udp' || p.k === 'tsh') {", "      if (p.k === 'udp' || p.k === 'tsh' || p.k === 'pkt') {")
rep("          hurtFoe(S, e, p.dmg, p.vx * 0.12, p.vy * 0.12, p.k); if (p.pierce-- <= 0) dead = true; } }); }",
    """          hurtFoe(S, e, p.dmg, p.vx * 0.12, p.vy * 0.12, p.k); if (p.pierce-- <= 0) dead = true;
          if (p.split) { const a = Math.atan2(p.vy, p.vx), v = Math.hypot(p.vx, p.vy); for (let j = 0; j < p.split; j++) { const b = a + (j - (p.split - 1) / 2) * 0.55;
            S.P.push({ k: 'pkt', x: p.x, y: p.y, vx: Math.cos(b) * v * 0.85, vy: Math.sin(b) * v * 0.85, life: 0.45, t0: S.t, dmg: p.dmg * 0.5, pierce: 999, hit: p.hit.slice(), split: 0, evo: 1 }); } p.split = 0; } } }); }""")
# QA's interrupt holds a foe in place and stops its attacks
rep("      if (e.chillT > t) sp *= f.boss ? 0.8 : 0.55; if (e.frzT > t) sp = 0;", "      if (e.chillT > t) sp *= f.boss ? 0.8 : 0.55; if (e.frzT > t || e.stunT > t) sp = 0;")
rep("if (f.kind !== 'desk' && !(e.spinT > t) && !(e.frzT > t) && e.atkT < 0", "if (f.kind !== 'desk' && !(e.spinT > t) && !(e.frzT > t) && !(e.stunT > t) && e.atkT < 0")

# ---------- passives in the damage code ----------
rep("""    e.hp -= dmg; e.hitT = S.t; e.hdx = Math.sign(kx) || (e.x > S.x ? 1 : -1); const pz = 1 / (f.poise || 1); e.kx += kx * pz; e.ky += ky * pz;
    push(S, { k: 'hit', t: S.t, x: e.x, y: e.y - 30, id: e.id, d: Math.round(dmg), src });""",
    """    // the hero's passive and training (shop rank tr_<hero>), and QA's defect mark
    const H = heroOf(S), P = H.passive, tr = md(S, 'tr_' + (S.hero || 'utrace')); let crit = 0;
    if (P.slots && tr && src !== 'trace') dmg *= 1 + H.training.factor * tr;                                          // Utrace: picked-up weapons hit harder
    if (P.crowd) dmg *= 1 + Math.min(P.cap + H.training.factor * tr, P.crowd * crowdN(S));                            // Связанные данные
    if (P.far && Math.hypot(e.x - S.x, e.y - S.y) > 375) dmg *= 1 + P.far + H.training.factor * tr;                  // Дальняя доставка
    if (P.crit && rnd(S) < P.crit + H.training.factor * tr + (e.scanT > S.t - 2 ? P.scanCrit : 0)) { dmg *= 1.8; crit = 1; }   // Найденный дефект
    if (e.markT > S.t) dmg *= 1.5;
    e.hp -= dmg; e.hitT = S.t; e.hdx = Math.sign(kx) || (e.x > S.x ? 1 : -1); const pz = 1 / (f.poise || 1); e.kx += kx * pz; e.ky += ky * pz;
    push(S, { k: 'hit', t: S.t, x: e.x, y: e.y - 30, id: e.id, d: Math.round(dmg), src, crit });""")
rep("  function hurtFoe(S, e, dmg, kx, ky, src) {", """  // foes within 400 px of the hero, counted once per step (Полная прослеживаемость's passive)
  const crowdN = (S) => { if (S.crowdAt !== S.steps) { S.crowdAt = S.steps; let n = 0; for (const o of S.E) if (o.dieT < 0 && Math.abs(o.x - S.x) < 400 && Math.hypot(o.x - S.x, o.y - S.y) < 400) n++; S.crowdC = n; } return S.crowdC; };
  function hurtFoe(S, e, dmg, kx, ky, src) {""")
rep("    const f = FOE[e.k]; if (e.dieT < 0) e.dieT = S.t; e.hp = 0; S.kills++;",
    """    const f = FOE[e.k]; if (e.dieT < 0) e.dieT = S.t; e.hp = 0; S.kills++;
    const HP = heroOf(S).passive; if (HP.clientHp && e.k === S.client) { const g = HP.clientHp + heroOf(S).training.factor * md(S, 'tr_ba'); S.hpBonus = (S.hpBonus || 0) + g; S.hp += g; }   // Ключевой клиент""")

# ---------- runs start as the chosen hero ----------
rep("    const S = base(worldT, seed); S.map = map; S.lseed = seed; S.mods = Object.assign({}, mods || {}); S.hp = hpMax(S);",
    """    const S = base(worldT, seed); S.map = map; S.lseed = seed; S.mods = Object.assign({}, mods || {});
    S.hero = HEROES[opt && opt.hero] ? opt.hero : 'utrace'; S.base = heroOf(S).weapon; S.wp = { [S.base]: 1 }; S.wcd = { [S.base]: 0.4 };
    S.client = heroOf(S).passive.clientHp ? (CLIENTS.includes(opt && opt.client) ? opt.client : CLIENTS[0]) : null; S.hpBonus = 0; S.hp = hpMax(S);""")
rep("S.got = { trace: 1 }; placeBugs(S); placeDesks(S);", "S.got = { [S.base]: 1 }; placeBugs(S); placeDesks(S);")
rep("  const respawn = (S, worldT) => spawn(worldT, S.mods, { map: S.map });", "  const runOpt = (S) => ({ map: S.map, hero: S.hero, client: S.client });\n  const respawn = (S, worldT) => spawn(worldT, S.mods, runOpt(S));")
rep("{ const N = spawn(S.wt0 + t, S.mods, { map: S.map });", "{ const N = spawn(S.wt0 + t, S.mods, runOpt(S));")
rep("    ensureLevel('dc', 0); const S = base(0, 20261024); S.map = 'dc'; S.lseed = 0; S.demo = true;", "    ensureLevel('dc', 0); const S = base(0, 20261024); S.map = 'dc'; S.lseed = 0; S.hero = 'utrace'; S.base = 'trace'; S.demo = true;")
rep("WEAP, WSUM, PASS, EVO, MAX_W,", "WEAP, WSUM, PASS, EVO, HEROES, CLIENTS, MAX_W,")
open(p, 'w', encoding='utf-8').write(s); print('sim patched')
