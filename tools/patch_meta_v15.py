# Round 15 (plan point 6): runs take the shop's permanent upgrades (S.mods), record what was picked (S.got), offer reroll /
# skip at level-ups, and a new run starts from a clean state.
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
def patch(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:100], s.count(a)); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

patch('live/sim.js', [
    # permanent upgrades (meta.js: ranks by id)
    ("  const hpMax = (S) => K.HP + 20 * S.ps.hp;", "  const md = (S, k) => (S.mods && S.mods[k]) || 0;                                         // a permanent upgrade's rank\n  const hpMax = (S) => K.HP + 20 * S.ps.hp + 10 * md(S, 'health');"),
    ("const mul = (S) => ({ dmg: 1 + 0.12 * S.ps.power, cd: 1 - 0.08 * S.ps.haste, sp: 1 + 0.08 * S.ps.speed, mag: 1 + 0.4 * S.ps.magnet,\n    area: 1 + 0.1 * (S.ps.area || 0),",
     "const mul = (S) => ({ dmg: (1 + 0.12 * S.ps.power) * (1 + 0.05 * md(S, 'power')), cd: (1 - 0.08 * S.ps.haste) * (1 - 0.04 * md(S, 'haste')), sp: (1 + 0.08 * S.ps.speed) * (1 + 0.03 * md(S, 'speed')),\n    mag: (1 + 0.4 * S.ps.magnet) * (1 + 0.1 * md(S, 'magnet')), area: (1 + 0.1 * (S.ps.area || 0)) * (1 + 0.04 * md(S, 'range')),"),
    ("    S.hp -= dmg * DMG_SCALE; S.iT = S.t; S.hurtT = S.t; push(S, { k: 'hurt', t: S.t, x: S.x, y: S.y - 50, d: Math.round(dmg * DMG_SCALE), fx, fy }",
     "    const taken = Math.max(1, dmg * DMG_SCALE - md(S, 'armor'));                                  // Криптозащита\n    S.hp -= taken; S.iT = S.t; S.hurtT = S.t; push(S, { k: 'hurt', t: S.t, x: S.x, y: S.y - 50, d: Math.round(taken), fx, fy }"),
    ("const r = rnd(S); if (r < 0.035) S.Gm.push(", "const r = rnd(S), lk = md(S, 'luck'), cr = 0.035 + 0.002 * lk; if (r < cr) S.Gm.push("),
    ("    else if (r < 0.05 || f.mini ||", "    else if (r < cr + 0.015 + 0.001 * lk || f.mini ||"),
    ("    S.x += mvx * DT; S.y += mvy * DT; collide(S, K.R, S); clampW(S, 80);",
     "    S.x += mvx * DT; S.y += mvy * DT; collide(S, K.R, S); clampW(S, 80);\n    if (md(S, 'regen')) S.hp = Math.min(hpMax(S), S.hp + 0.15 * md(S, 'regen') * DT);              // Автовосстановление"),
    # what the run picked, for the collection
    ("    if (o.k === 'evo') { delete S.wp[o.from];", "    if (S.got && (o.k === 'w' || o.k === 'evo')) S.got[o.id] = 1;\n    if (o.k === 'evo') { delete S.wp[o.from];"),
    # closing a pick (after a choice or a skip) opens the next pending one
    ("""    push(S, { k: 'picked', t: S.t, x: S.x, y: S.y - 60, id: o.id }); S.pick = null;
    if (S.pend > 0) { S.pend--; S.pick = { t0: S.t, opts: rollPick(S) }; }
    else if (S.chestQ > 0) { S.chestQ--; S.pick = { t0: S.t, opts: rollPick(S, true), chest: 1 }; }
  }""", """    push(S, { k: 'picked', t: S.t, x: S.x, y: S.y - 60, id: o.id }); closePick(S);
  }
  function closePick(S) { S.pick = null;
    if (S.pend > 0) { S.pend--; S.pick = { t0: S.t, opts: rollPick(S) }; }
    else if (S.chestQ > 0) { S.chestQ--; S.pick = { t0: S.t, opts: rollPick(S, true), chest: 1 }; } }
  // level-up controls bought in the shop: [4] reroll the cards, [5] skip this pick (or click their buttons under the cards)
  const ctlRect = (i) => [VIEW.W / 2 - 430 + i * 460, 790, 400, 64];"""),
    ("""      if (S.demo && el > 1.6) c = 0;
      S.t = t; S.steps++; if (c >= 0 && el > 0.35) applyPick(S, S.pick.opts[c]); return S; }""",
     """      if (S.demo && el > 1.6) c = 0;
      let ctl = inp.slot === 4 ? 0 : inp.slot === 5 ? 1 : -1;
      if (inp.click) for (let i = 0; i < 2; i++) { const [x, y, w, h] = ctlRect(i); if (inp.px >= x && inp.px <= x + w && inp.py >= y && inp.py <= y + h) ctl = i; }
      S.t = t; S.steps++;
      if (el > 0.35 && ctl === 0 && S.rerolls > 0) { S.rerolls--; S.pick.opts = rollPick(S, S.pick.chest); S.pick.t0 = t - 0.3; push(S, { k: 'reroll', t, x: S.x, y: S.y }); return S; }
      if (el > 0.35 && ctl === 1 && S.skips > 0) { S.skips--; push(S, { k: 'skip', t, x: S.x, y: S.y }); closePick(S); return S; }
      if (c >= 0 && el > 0.35) applyPick(S, S.pick.opts[c]); return S; }"""),
    # runs start with the upgrades; a new run replaces the whole state (no fields left over from the last one)
    ("  const spawn = (worldT) => { const S = base(worldT, 1000 + Math.floor(worldT * 977) % 100000); placeBugs(S); placeDesks(S); return S; };\n  const respawn = (S, worldT) => spawn(worldT);",
     """  const spawn = (worldT, mods) => { const S = base(worldT, 1000 + Math.floor(worldT * 977) % 100000); S.mods = Object.assign({}, mods || {}); S.hp = hpMax(S);
    S.rerolls = md(S, 'rerolls'); S.skips = md(S, 'skips'); S.got = { trace: 1 }; placeBugs(S); placeDesks(S);
    if (md(S, 'head')) { S.pick = { t0: S.t, opts: rollPick(S) }; S.pend = md(S, 'head') - 1; }                        // Предзагрузка
    return S; };
  const respawn = (S, worldT) => spawn(worldT, S.mods);"""),
    ("if ((inp.click || inp.act || inp.jump) && t - S.over.t > 1.4 && !S.demo) Object.assign(S, spawn(S.wt0 + t));",
     "if ((inp.click || inp.act || inp.jump) && t - S.over.t > 1.4 && !S.demo) { const N = spawn(S.wt0 + t, S.mods); for (const k in S) delete S[k]; Object.assign(S, N); }"),
    ("hpMax, shoulder, hand, tip, cardRect,", "hpMax, shoulder, hand, tip, cardRect, ctlRect,"),
])
patch('live/audio.js', [
    ("  window.AUDIO = { pref, effect,", """  const toggle = (k) => { unlock(); if (k === 'sound') { pref.enabled = !pref.enabled; fxBus.gain.value = pref.enabled ? pref.effects : 0; } else pref.musicOn = !pref.musicOn; save(); };
  window.AUDIO = { pref, effect, toggle,"""),
])
print('patched')
