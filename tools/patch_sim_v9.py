# Round 9 sim: the rest of the original roster, each with a mechanic of its own (user: "if they are too samey, invent new attacks").
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
p = 'live/sim.js'; s = open(p, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:90], s.count(a)); s = s.replace(a, b)

rep("    // the five component minibosses:", """    // the rest of the original roster, each with a mechanic of its own
    mond:    { name: 'Монделиз', kind: 'melee', hp: 110, sp: 196, dmg: 7, r: 28, range: 60, wind: 0.45, cd: 0.8, xp: 4, emblem: 'mondelez', zig: 1,
               trail: { every: 0.14, life: 3, r: 46, slow: { amount: 0.3, dur: 0.5 } }, col: [0.62, 0.4, 0.85] },
    prog:    { name: 'Прогресс (ФрутоНяня)', kind: 'lob', hp: 130, sp: 128, dmg: 10, r: 30, range: 560, wind: 0.9, cd: 2.4, xp: 6, keep: 380, emblem: 'progress',
               lob: { count: 2, bounces: 2, r: 70 }, col: [0.55, 0.8, 0.45] },
    royal:   { name: 'Роял Канин', kind: 'shoot', hp: 150, sp: 110, dmg: 9, r: 30, range: 520, wind: 0.9, cd: 2.6, xp: 6, keep: 360, emblem: 'royal_canin',
               shots: { count: 3, speed: 420, dmg: 1, fan: 0.35, back: 0.8 }, col: [0.85, 0.2, 0.25] },
    cherk:   { name: 'Черкизово', kind: 'spin', hp: 230, sp: 100, dmg: 9, r: 36, range: 230, wind: 0.7, cd: 4, xp: 10, poise: 1.3, emblem: 'cherkizovo',
               spin: { time: 1.6, r: 105, tick: 0.25, speed: 1.45 }, col: [0.75, 0.15, 0.25] },
    pg:      { name: 'Проктер энд Гэмбл', kind: 'melee', hp: 260, sp: 96, dmg: 11, r: 38, range: 88, wind: 1.0, cd: 1.8, xp: 12, poise: 1.5, emblem: 'procter_gamble',
               aura: { r: 260, reduce: 0.5 }, col: [0.3, 0.55, 1] },
    petfood: { name: 'Марс Петфуд', kind: 'shoot', hp: 150, sp: 120, dmg: 6, r: 30, range: 440, wind: 0.8, cd: 2.2, xp: 6, keep: 300, emblem: 'mars_petfood',
               shots: { count: 5, speed: 460, dmg: 1, fan: 0.6 }, col: [0.35, 0.8, 0.95] },
    logq:    { name: 'Запрос в логи', kind: 'beam', hp: 260, sp: 90, dmg: 16, r: 36, range: 640, wind: 1.3, cd: 3.2, xp: 10, front: 0.7, mark: 'LOG',
               beam: { len: 720, w: 40, hold: 0.25 }, col: [0.6, 0.48, 1] },
    sdesk:   { name: 'Сервисдеск Пепси', kind: 'desk', hp: 1400, sp: 0, dmg: 0, r: 64, range: 0, wind: 1, cd: 99, xp: 30, poise: 99, mini: true,
               desk: { every: 7, base: 2, grow: 40, max: 10, unit: 'orb', reach: 1700 }, col: [0.2, 0.45, 0.85] },
    // the five component minibosses:""")
rep("    boss:    { name: 'Критический инцидент',", """    batch:   { name: 'Партионный учёт', kind: 'pulse', hp: 6000, sp: 70, dmg: 20, r: 100, range: 300, wind: 1.2, cd: 2.4, xp: 80, poise: 4, boss: true,
               shots: { count: 12, speed: 340, dmg: 0.5 }, summon: { every: 8, count: 4, max: 8, units: ['orb'] }, ward: 0.7, col: [0.3, 0.6, 1] },
    boss:    { name: 'Критический инцидент',""")
# waves and bosses
rep("  const ROSTER = [['node', 1, 0], ['panel', 0.6, 0], ['multon', 0.5, 0.3], ['orb', 0.7, 1], ['mars', 0.45, 1.3], ['keg', 0.3, 2.3], ['loreal', 0.35, 2.6],\n    ['baltika', 0.3, 3.2], ['ferrero', 0.3, 3.8], ['vetis', 0.18, 4.5]];",
    "  const ROSTER = [['node', 1, 0], ['panel', 0.6, 0], ['multon', 0.5, 0.3], ['mond', 0.4, 1.0], ['orb', 0.7, 1], ['mars', 0.45, 1.3], ['prog', 0.35, 2.0], ['petfood', 0.35, 2.2],\n    ['keg', 0.3, 2.3], ['loreal', 0.35, 2.6], ['royal', 0.3, 3.0], ['baltika', 0.3, 3.2], ['cherk', 0.25, 3.5], ['ferrero', 0.3, 3.8], ['pg', 0.18, 4.0], ['vetis', 0.18, 4.5], ['logq', 0.2, 4.8]];")
rep("bossQ: [[270, 'crpt'], [RUN_T, 'boss']]", "bossQ: [[270, 'crpt'], [420, 'batch'], [RUN_T, 'boss']], TR: [], LB: [], BM: []")
rep("S.toast = { s: k === 'crpt' ? 'ЦРПТ: проверка партии, подключены клиенты' : 'КРИТИЧЕСКИЙ ИНЦИДЕНТ: уничтожьте его, чтобы закрыть смену', t };",
    "S.toast = { s: k === 'crpt' ? 'ЦРПТ: проверка партии, подключены клиенты' : k === 'batch' ? 'ПАРТИОННЫЙ УЧЁТ: щит держится, пока живы его клиенты' : 'КРИТИЧЕСКИЙ ИНЦИДЕНТ: уничтожьте его, чтобы закрыть смену', t };")
# two service desks stand on the floor from the start (north hall and the east side of the plaza)
rep("  const spawn = (worldT) => { const S = base(worldT, 1000 + Math.floor(worldT * 977) % 100000); placeBugs(S); return S; };",
    """  const DESKS = [[4000, 1250], [5450, 3050]];
  const placeDesks = (S) => DESKS.forEach(([x, y]) => { const d = mkFoe(S, 'sdesk', x, y); d.face = -1; d.sumT = 8; });
  const spawn = (worldT) => { const S = base(worldT, 1000 + Math.floor(worldT * 977) % 100000); placeBugs(S); placeDesks(S); return S; };""")
# damage modifiers: P&G shields its neighbours, the batch boss is warded while its clients live
rep("    if (f.front && Math.sign(S.x - e.x) === e.face) dmg *= f.front;   // armoured front",
    """    if (f.front && Math.sign(S.x - e.x) === e.face) dmg *= f.front;   // armoured front
    if (f.ward && S.E.some((o) => o.dieT < 0 && o.sum === e.id)) dmg *= 1 - f.ward;                                   // batch reserve: warded by its clients
    else if (!f.boss && e.k !== 'pg' && S.E.some((o) => o.k === 'pg' && o.dieT < 0 && Math.hypot(o.x - e.x, o.y - e.y) < FOE.pg.aura.r)) { dmg *= 1 - FOE.pg.aura.reduce; e.shT = S.t; }""")
# movement: zigzag (Mondelez), spinning (Cherkizovo) and the static desk
rep("      if (Math.abs(dx) > 8) e.face = dx > 0 ? 1 : -1;\n      const winding",
    """      if (f.zig) { const w = Math.sin(t * 6 + e.ph * 9) * 0.85; const zx = wantX - wantY * w, zy = wantY + wantX * w, zl = Math.hypot(zx, zy) || 1; wantX = zx / zl; wantY = zy / zl; }
      if (f.kind === 'spin' && e.spinT > t) { wantX = dx / d; wantY = dy / d; sp = f.sp * f.spin.speed; }
      if (Math.abs(dx) > 8) e.face = dx > 0 ? 1 : -1;
      const winding""")
rep("      const sepK = f.boss ? 30 : 260;\n      e.x +=", "      const sepK = f.boss ? 30 : f.kind === 'desk' ? 0 : 260; if (f.kind === 'desk') { e.kx = 0; e.ky = 0; }\n      e.x +=")
# per-foe extras each step: sticky trail, the spin's damage ticks, the desk's tickets
rep("      if (f.escalate && t >= e.escT", """      if (f.trail && t >= (e.trT || 0) && e.g > 0.5) { e.trT = t + f.trail.every; S.TR.push({ x: e.x, y: e.y, t0: t, life: f.trail.life, r: f.trail.r }); if (S.TR.length > 220) S.TR.shift(); }
      if (f.kind === 'spin' && e.spinT > t && t >= (e.spinNt || 0)) { e.spinNt = t + f.spin.tick; if (d < f.spin.r + K.R) hurtHero(S, f.dmg, e.x, e.y); }
      if (f.desk && t >= e.sumT && d < f.desk.reach) { e.sumT = t + f.desk.every; let n = 0; for (const o of S.E) if (o.dieT < 0 && o.sum === e.id) n++;
        const batch = Math.min(f.desk.max - n, f.desk.base + Math.floor(t / f.desk.grow)); let made = 0;
        for (let j = 0; j < batch; j++) { const a = rnd(S) * 6.28, x = S.x + Math.cos(a) * 520, y = S.y + Math.sin(a) * 380; if (blocked(x, y, 28)) continue; const o = mkFoe(S, f.desk.unit, x, y); o.sum = e.id; made++; }
        if (made) push(S, { k: 'tickets', t, x: e.x, y: e.y, n: made }); }
      if (f.escalate && t >= e.escT""")
# attack start/fire for the new kinds
rep("      const reach = f.kind === 'melee' ? f.range + K.R : f.kind === 'pulse' ? f.range * (f.boss ? 1.4 : 1.1) : f.range;\n      if (e.atkT < 0 && t >= e.nextAtk && d < reach && (f.kind === 'melee' || f.kind === 'pulse' || lineClear(e.x, e.y, S.x, S.y))) {",
    "      const reach = f.kind === 'melee' ? f.range + K.R : f.kind === 'pulse' ? f.range * (f.boss ? 1.4 : 1.1) : f.range;\n      if (f.kind !== 'desk' && !(e.spinT > t) && e.atkT < 0 && t >= e.nextAtk && d < reach && (f.kind === 'melee' || f.kind === 'pulse' || f.kind === 'spin' || lineClear(e.x, e.y, S.x, S.y))) {")
rep("        else if (f.kind === 'shoot') { const a = Math.atan2(S.y - 40 - (e.y - 40), S.x - e.x);\n          if (f.shots.count > 1) ring(S, e, f, f.shots.count, f.shots.speed, f.dmg * f.shots.dmg, a);",
    """        else if (f.kind === 'spin') { e.spinT = t + f.spin.time; e.spinNt = t; push(S, { k: 'spin', t, x: e.x, y: e.y, id: e.id }); }
        else if (f.kind === 'lob') { for (let j = 0; j < f.lob.count; j++) { const a = Math.atan2(S.y - e.y, S.x - e.x) + (j - (f.lob.count - 1) / 2) * 0.35, dist = Math.min(d, f.range) * (0.85 + 0.2 * rnd(S)), T = 0.9;
            S.LB.push({ x: e.x, y: e.y, vx: Math.cos(a) * dist / T, vy: Math.sin(a) * dist / T, z: 60, vz: 600, b: f.lob.bounces, r: f.lob.r, dmg: f.dmg }); } push(S, { k: 'toss', t, x: e.x, y: e.y - 50 }); }
        else if (f.kind === 'beam') { const a = Math.atan2(e.ay - e.y, e.ax - e.x), L0 = f.beam.len, x1 = e.x + Math.cos(a) * L0, y1 = e.y + Math.sin(a) * L0;
          S.BM.push({ x0: e.x, y0: e.y - 40, x1, y1: y1 - 40, t0: t, w: f.beam.w, hold: f.beam.hold, dmg: f.dmg, hit: 0 }); push(S, { k: 'beam', t, x: e.x, y: e.y - 40, a }); }
        else if (f.kind === 'shoot') { const a = Math.atan2(S.y - 40 - (e.y - 40), S.x - e.x);
          if (f.shots.fan) { for (let j = 0; j < f.shots.count; j++) { const b = a + (j - (f.shots.count - 1) / 2) * f.shots.fan / Math.max(1, f.shots.count - 1) * 2;
              S.EB.push({ x: e.x, y: e.y - 40, vx: Math.cos(b) * f.shots.speed, vy: Math.sin(b) * f.shots.speed, life: f.shots.back ? 2 * f.shots.back + 0.4 : 1.6, life0: 2 * (f.shots.back || 0) + 0.4, back: f.shots.back || 0, dmg: f.dmg * f.shots.dmg, slow: f.slow || null, c: e.k }); } }
          else if (f.shots.count > 1) ring(S, e, f, f.shots.count, f.shots.speed, f.dmg * f.shots.dmg, a);""")
# while winding a beam the foe aims at where the hero is (locked at the start); bullets: boomerangs turn back
rep("    for (let i = S.EB.length - 1; i >= 0; i--) { const b = S.EB[i]; b.x += b.vx * DT; b.y += b.vy * DT; b.life -= DT;",
    "    for (let i = S.EB.length - 1; i >= 0; i--) { const b = S.EB[i]; b.x += b.vx * DT; b.y += b.vy * DT; b.life -= DT;\n      if (b.back && !b.turned && b.life0 - b.life >= b.back) { b.turned = 1; b.vx = -b.vx; b.vy = -b.vy; }   // Royal Canin: the batch comes back")
# lobbed jars (bounce, splash), the sticky trail, beams
rep("    for (let i = S.PU.length - 1; i >= 0; i--) { const p = S.PU[i];", """    for (let i = S.LB.length - 1; i >= 0; i--) { const j = S.LB[i]; j.x += j.vx * DT; j.y += j.vy * DT; j.z += j.vz * DT; j.vz -= 1500 * DT;
      if (j.z <= 0) { j.z = 0; push(S, { k: 'splash', t: S.t, x: j.x, y: j.y, r: j.r }); if (Math.hypot(S.x - j.x, (S.y - j.y) / 0.62) < j.r + K.R) hurtHero(S, j.dmg, j.x, j.y);
        if (j.b-- > 0) { j.vz = 420; j.vx *= 0.55; j.vy *= 0.55; } else S.LB.splice(i, 1); } }
    for (let i = S.TR.length - 1; i >= 0; i--) { const q = S.TR[i]; if (S.t - q.t0 > q.life) { S.TR.splice(i, 1); continue; }
      if (Math.abs(S.x - q.x) < q.r && Math.abs(S.y - q.y) < q.r * 0.62 && !S.demo) { S.slowT = Math.max(S.slowT, S.t + FOE.mond.trail.slow.dur); S.slowA = Math.max(S.slowA * (S.t < S.slowT ? 1 : 0), FOE.mond.trail.slow.amount); } }
    for (let i = S.BM.length - 1; i >= 0; i--) { const b = S.BM[i], a = S.t - b.t0; if (a > b.hold) { S.BM.splice(i, 1); continue; } if (b.hit) continue;
      const vx = b.x1 - b.x0, vy = b.y1 - b.y0, L2 = vx * vx + vy * vy, u = Math.max(0, Math.min(1, ((S.x - b.x0) * vx + (S.y - 40 - b.y0) * vy) / L2));
      if (Math.hypot(b.x0 + vx * u - S.x, b.y0 + vy * u - (S.y - 40)) < b.w / 2 + K.R) { b.hit = 1; hurtHero(S, b.dmg, b.x0, b.y0); } }
    for (let i = S.PU.length - 1; i >= 0; i--) { const p = S.PU[i];""")
rep("    S.nextSwarm = 999; placeBugs(S);\n    return S;", "    S.nextSwarm = 999; placeBugs(S); placeDesks(S);\n    return S;")
open(p, 'w', encoding='utf-8').write(s); print('sim patched')
