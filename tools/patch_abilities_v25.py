# Round 25 (plan stage 2b): the heroes' E abilities, ported from utreys-survivors (data/characters/abilities.js): each hero has one
# ability on E with a cooldown; level-up cards raise it up to rank 3. Space stays the dash. Distances ×2 like the rest of the slice.
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
def patch(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:90], s.count(a)); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

patch('live/sim.js', [
    ("  const MAX_W = 4, MAX_P = 6", """  // the heroes' E abilities (data/characters/abilities.js of the original): cd and dur in s, radius ×2; rank (level-up cards, max AB_MAX)
  // adds rankDur s, rankPow damage share or rankStun s
  const ABIL = {
    utrace:        { id: 'overclock', name: 'Оверклокинг', ic: 'ic_haste', cd: 22, dur: 6, rankDur: 1, haste: 1.6, speed: 1.15,
                     desc: 'Разгон ядра: на 6 с темп атак ×1,6 и скорость +15%', up: 'Оверклокинг действует на 1 с дольше' },
    traceability:  { id: 'registry', name: 'Реестр', ic: 'ic_chain', cd: 20, dur: 5, rankDur: 1,
                     desc: 'На 5 с цепь бьёт всю связанную группу без лимита целей', up: 'Реестр действует на 1 с дольше' },
    serialization: { id: 'volley', name: 'Залп', ic: 'ic_udp', cd: 14, dur: 0.3, count: 12, power: 0.8, rankPow: 0.25,
                     desc: '12 пробивающих пакетов веером во все стороны', up: '+25% к урону пакетов залпа' },
    ba:            { id: 'negotiate', name: 'Переговоры', ic: 'ic_dur', cd: 24, dur: 4, rankDur: 1, radius: 480,
                     desc: 'На 4 с обычные враги рядом не атакуют, а выбранный клиент — по всей карте', up: 'Переговоры действуют на 1 с дольше' },
    qa:            { id: 'field', name: 'Регресс', ic: 'ic_cryo', cd: 18, dur: 3, radius: 280, stun: 2, rankStun: 0.5,
                     desc: 'Зона регресса на 3 с: обычные враги в ней замирают на 2 с', up: 'Враги в зоне замирают на 0,5 с дольше' },
  };
  const AB_MAX = 3;
  const abOf = (S) => ABIL[S.hero] || ABIL.utrace;
  const abOn = (S) => !!S.ab && S.t < S.ab.until;                                    // the ability is running
  const MAX_W = 4, MAX_P = 6"""),
    # boosts: Оверклокинг speeds up the cooldowns and the step
    ("  const mul = (S) => ({ dmg: (1 + 0.12 * S.ps.power) * (1 + 0.05 * md(S, 'power')), cd: (1 - 0.08 * S.ps.haste) * (1 - 0.04 * md(S, 'haste')), sp: (1 + 0.08 * S.ps.speed) * (1 + 0.03 * md(S, 'speed')),",
     "  const oc = (S, k) => (abOn(S) && abOf(S)[k] ? abOf(S)[k] : 1);                     // Оверклокинг's factors while it runs\n  const mul = (S) => ({ dmg: (1 + 0.12 * S.ps.power) * (1 + 0.05 * md(S, 'power')), cd: (1 - 0.08 * S.ps.haste) * (1 - 0.04 * md(S, 'haste')) / oc(S, 'haste'), sp: (1 + 0.08 * S.ps.speed) * (1 + 0.03 * md(S, 'speed')) * oc(S, 'speed'),"),
    # Реестр: no target limit for the chain
    ("for (let qi = 0; qi < q.length && q.length < st.jumps; qi++) { const c = q[qi]; near(S, g, c.x, c.y, st.range, (e) => { if (q.length >= st.jumps ||",
     "const jl = abOn(S) && abOf(S).id === 'registry' ? 999 : st.jumps;                  // Реестр: the whole linked group\n          for (let qi = 0; qi < q.length && q.length < jl; qi++) { const c = q[qi]; near(S, g, c.x, c.y, st.range, (e) => { if (q.length >= jl ||"),
    # Переговоры: pacified foes do not start attacks
    ("      if (f.kind !== 'desk' && !(e.spinT > t) && !(e.frzT > t) && !(e.stunT > t)",
     "      if (!(e.truceT > t) && f.kind !== 'desk' && !(e.spinT > t) && !(e.frzT > t) && !(e.stunT > t)"),
    # the state, the cast on E, the field each step
    ("    S.rerolls = md(S, 'rerolls'); S.skips = md(S, 'skips'); S.got = { [S.base]: 1 };",
     "    S.rerolls = md(S, 'rerolls'); S.skips = md(S, 'skips'); S.got = { [S.base]: 1 }; S.ab = { cd: 0, until: -9, t0: -9 }; S.abR = 0;"),
    ("    const use = inp.use && !S.prevUse; S.prevUse = inp.use ? 1 : 0; if (use && S.ed) { eduUse(S); if (S.ed.active) { S.steps++; return S; } }   // E: a terminal's test / the door",
     "    const use = inp.use && !S.prevUse; S.prevUse = inp.use ? 1 : 0;                                                // E: a terminal's test / the door, else the ability\n    if (use && S.ed && nearUse(S)) { eduUse(S); if (S.ed.active) { S.steps++; return S; } } else if (use) cast(S, g);\n    if (S.ab) { S.ab.cd = Math.max(0, S.ab.cd - DT); abilityStep(S, g); }"),
    ("  // ---------------- level-up ----------------",
     """  // ---------------- the E abilities ----------------
  function cast(S, g) { const A = abOf(S); if (!S.ab || S.ab.cd > 0 || S.demo || S.over) return; const t = S.t, r = S.abR || 0, M = mul(S);
    S.ab.cd = A.cd; S.ab.t0 = t; S.ab.until = t + A.dur + (A.rankDur || 0) * r;
    if (A.id === 'volley') { const st = wstat(S.base, Math.min(S.wp[S.base] || 1, MAX_WL)), sp = st.speed || 1000, dmg = (st.dmg || 23) * M.dmg * A.power * (1 + (A.rankPow || 0) * r);   // the hero's packet, in every direction
      for (let i = 0; i < A.count; i++) { const a = i * 6.2832 / A.count; S.P.push({ k: 'pkt', x: S.x, y: S.y - 50, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: (st.range || 775) / sp, t0: t, dmg, pierce: 999, hit: [], split: 0, evo: 1 }); } }
    if (A.id === 'negotiate') for (const e of S.E) { if (e.dieT >= 0 || FOE[e.k].boss || FOE[e.k].mini) continue;            // the client everywhere, the rest within the radius
      if (e.k === S.client || Math.hypot(e.x - S.x, e.y - S.y) < A.radius) { e.truceT = S.ab.until; e.atkT = -9; e.nextAtk = Math.max(e.nextAtk, S.ab.until); } }
    if (A.id === 'field') S.FZ = { x: S.x, y: S.y, t0: t, until: S.ab.until, r: A.radius, stun: A.stun + (A.rankStun || 0) * r, id: t };
    push(S, { k: 'ability', t, x: S.x, y: S.y, id: A.id }); }
  // a running ability's work each step: Регресс freezes the ordinary foes that enter its zone (each once per zone)
  function abilityStep(S, g) { const F = S.FZ; if (!F) return; if (S.t >= F.until) { S.FZ = null; return; }
    near(S, g, F.x, F.y, F.r + 60, (e) => { if (e.fly || FOE[e.k].boss || FOE[e.k].mini || e.fzId === F.id || Math.hypot(e.x - F.x, (e.y - F.y) / 0.62) > F.r) return;
      e.fzId = F.id; e.atkT = -9; e.stunT = S.t + F.stun; e.nextAtk = Math.max(e.nextAtk, S.t + F.stun); push(S, { k: 'frozen', t: S.t, x: e.x, y: e.y, id: e.id }); }); }

  // ---------------- level-up ----------------"""),
    # the ability as a level-up card (up to AB_MAX ranks)
    ("    for (const k in PASS) if (S.ps[k] < MAX_PL && (S.ps[k] > 0 || (pk < MAX_P && !chest))) c.push({ k: 'p', id: k, w: 1.4 });",
     "    for (const k in PASS) if (S.ps[k] < MAX_PL && (S.ps[k] > 0 || (pk < MAX_P && !chest))) c.push({ k: 'p', id: k, w: 1.4 });\n    if (S.ab && (S.abR || 0) < AB_MAX) c.push({ k: 'ab', id: abOf(S).id, w: 1.1 });                 // the E ability's next rank"),
    ("    else if (o.k === 'p') { S.ps[o.id]++; if (o.id === 'hp') S.hp = Math.min(hpMax(S), S.hp + 40); }",
     "    else if (o.k === 'p') { S.ps[o.id]++; if (o.id === 'hp') S.hp = Math.min(hpMax(S), S.hp + 40); }\n    else if (o.k === 'ab') S.abR = (S.abR || 0) + 1;"),
    ("HEROES, SKINS, CLIENTS,", "HEROES, SKINS, ABIL, AB_MAX, CLIENTS,"),
])
print('patched')
