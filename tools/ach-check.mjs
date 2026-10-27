// The achievements without a browser (docs/PLAN-ACHIEVEMENTS.md; claims: docs/PLAN-FEEDBACK-27-10.md, stages 3–4): the sim's run facts
// add up, v2 and v3 saves migrate to v4, a banked run reports what it met, achievements wait for a claim that pays and opens once.
//   node tools/ach-check.mjs
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const live = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'live');
let bad = 0; const ok = (c, s) => { console.log((c ? 'ok   ' : 'FAIL ') + s); if (!c) bad++; };
// a fresh page: the scripts the meta needs, over a given localStorage
function page(store) {
  const ls = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  const ctx = { console, Math, Date, JSON, localStorage: ls }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  for (const f of ['course.js', 'edu.js', 'sim.js', 'ach.js', 'meta.js']) vm.runInContext(fs.readFileSync(path.join(live, f), 'utf8'), ctx, { filename: f });
  return ctx;
}
const none = { px: 960, py: 540 };

// 1. the run facts: every kill is counted by its kind, two runs from one seed match (the counters never touch the RNG)
{ const { SIM } = page({}); const run = () => { const S = SIM.spawn(2, {}, { hero: 'utrace' }); for (let i = 0; i < 120 * 90; i++) { SIM.step(S, S.pick ? Object.assign({ slot: 1 }, none) : none); if (S.over) break; } return S; };   // card 1 on every level-up
  const a = run(), b = run(), sum = Object.values(a.fx.foe).reduce((n, v) => n + v, 0);
  ok(a.kills > 0 && sum === a.kills, `run facts: ${a.kills} kills, by kind ${sum} (${Object.keys(a.fx.foe).length} kinds), calm ${a.fx.calm.toFixed(1)} s, heals ${a.fx.heal}`);
  ok(JSON.stringify([a.x, a.y, a.kills, a.hp, a.fx]) === JSON.stringify([b.x, b.y, b.kills, b.hp, b.fx]), 'two runs from one seed match'); }

// 2. a new player: nothing done, nothing paid
{ const store = {}, { META } = page(store); ok(Object.keys(META.data.ach).length === 0 && META.data.codes === 0 && META.data.v === 4, 'a fresh save: v4, no achievements, 0 codes'); }

// 3. a v2 save: migrates, keeps everything; what its totals meet waits to be claimed (docs/PLAN-FEEDBACK-27-10.md, stage 4)
{ const v2 = { v: 2, codes: 100, up: { power: 2 }, runs: 30, wins: 1, kills: 1200, time: 5000, best: { time: 320, kills: 400, lvl: 21 }, seen: { w: { trace: 1 }, e: {}, p: {} },
    heroes: { utrace: 1, qa: 1 }, skins: { utrace_zen: 1 }, sel: { hero: 'qa', skin: null, skins: {}, map: 'dc', course: null }, maps: { dc: 1, edu: 1 }, byMap: {}, byHero: { utrace: { time: 320, kills: 400, lvl: 21, wins: 1, runs: 30 } }, byCourse: {}, ui: { fps: true } };
  const store = { ns_meta_v2: JSON.stringify(v2) }, { META, ACH } = page(store), D = META.data;
  const want = ['surv_60', 'surv_180', 'surv_300', 'kills_100', 'kills_1000', 'runs_5', 'runs_10', 'runs_25', 'win_1', 'win_utrace', 'runs5_utrace', 'lvl_20'];
  const got = Object.keys(D.done).sort();
  ok(JSON.stringify(got) === JSON.stringify([...want].sort()) && Object.keys(D.ach).length === 0, 'v2 → v4: waiting on load ' + got.join(', '));
  ok(D.codes === 100, 'nothing paid before the claims');
  ok(D.up.power === 2 && D.heroes.qa && D.skins.utrace_zen && D.sel.hero === 'qa' && D.ui.fps && D.st.bosses === 0, 'upgrades, heroes, skins, choices and settings carried over; run facts start at zero');
  ok(store.ns_meta_v2 === JSON.stringify(v2) && JSON.parse(store.ns_meta_v4).v === 4, 'saved as v4; the v2 save stays as a backup');
  const paid = want.reduce((n, id) => n + ACH.BY[id].reward, 0); META.claimAll();
  ok(D.codes === 100 + paid && want.every((id) => D.ach[id]) && !Object.keys(D.done).length, `«Забрать всё»: codes 100 + ${paid} = ${D.codes}`);
  const again = page(store).META.data; ok(again.codes === D.codes && Object.keys(again.ach).length === want.length && !Object.keys(again.done).length, 'loading again pays nothing twice'); }

// 4. a v3 save: what v3 had done was paid and opened, so it is claimed; the new achievements its totals meet wait
{ const v3 = { v: 3, codes: 50, ach: { surv_60: 1, kills_100: 1, win_1: 1 }, st: { bosses: 0, casts: 0, heals: 0, evos: 0, evoMax: 0, calmMax: 0, noHealWins: 0, eduWins: 0, eduTop: 0, foes: { bug: 2 } },
    up: {}, runs: 3, wins: 1, kills: 300, time: 900, best: { time: 100, kills: 120, lvl: 9 }, seen: { w: { trace: 1 }, e: { trace_x: 1 }, p: {} }, heroes: { utrace: 1 }, skins: {}, sel: { hero: 'utrace', skin: null, skins: {}, map: 'dc', course: null },
    maps: { dc: 1, edu: 1 }, byMap: {}, byHero: { utrace: { time: 100, kills: 120, lvl: 9, wins: 1, runs: 3 } }, byCourse: {}, ui: { fps: false } };
  const store = { ns_meta_v3: JSON.stringify(v3) }, { META, ACH } = page(store), D = META.data;
  ok(D.v === 4 && D.ach.surv_60 && D.ach.win_1 && D.codes === 50, 'v3 → v4: done achievements stay claimed, codes unchanged');
  ok(D.done.foe_bug && D.done.evo_trace_x && D.done.win_utrace && !D.ach.foe_bug, 'new achievements met by v3 totals wait: ' + Object.keys(D.done).join(', '));
  ok(ACH.isOpen(D, 'u', 'speed') && ACH.isOpen(D, 'u', 'rerolls') && !ACH.isOpen(D, 'u', 'armor'), 'upgrades opened by claimed achievements are open; the rest closed'); }

// 5. a banked run adds its facts and reports the achievements it met; they wait for a claim
{ const store = {}, { META, SIM } = page(store); const S = SIM.spawn(2, {}, { hero: 'utrace' });
  Object.assign(S, { t: 200, kills: 150, lvl: 12, hurtT: 20, over: { k: 'dead', t: 200 } });
  S.fx = { foe: { node: 140, crpt: 1, bug: 9 }, boss: 1, cast: 11, heal: 0, evo: 1, calm: 50 };
  META.bank(S); const D = META.data, L = META.last, c0 = D.codes;
  ok(D.st.bosses === 1 && D.st.casts === 11 && D.st.evos === 1 && D.st.foes.node === 140 && D.st.calmMax === 180 && D.st.codes === L.earned, `facts banked: bosses 1, casts 11, evos 1, calm ${D.st.calmMax} s, codes ${D.st.codes}`);
  ok(L.ach.map((x) => x.id).sort().join() === ['surv_60', 'surv_180', 'kills_100', 'bosses_1', 'cast_10', 'evo_1', 'calm_180', 'foe_crpt', 'foe_bug'].sort().join() && !Object.keys(D.ach).length, 'reported, not claimed: ' + L.ach.map((x) => x.title).join(', '));
  const S2 = SIM.spawn(2, {}, { hero: 'utrace' }); Object.assign(S2, { t: 520, kills: 900, lvl: 25, over: { k: 'win', t: 520 } }); S2.fx = { foe: {}, boss: 3, cast: 0, heal: 0, evo: 0, calm: 0 };
  META.bank(S2); ok(D.st.noHealWins === 1 && D.st.noCastWins === 1 && D.st.winMin === 520 && D.done.win_noheal && D.done.win_nocast && D.done.win_fast && D.done.win_1 && D.codes === c0 + META.last.earned,
    'a win at 8:40 without heals or E: «Без перекуса», «Без умений», «Досрочный релиз», «Проверка регулятора» — waiting, nothing paid'); }

// 6. stage 3–4, the locks and the claims: a new player is offered only the open weapons and skills and cannot buy closed content;
//    a done achievement shows on its content, a press on the content claims it (codes, content open and new), then it is bought
{ const store = {}, { META, SIM, ACH } = page(store), D = META.data, V = () => META.view();
  const L = ACH.lock(D); ok(L.w.sort().join() === 'cache,fork,retry,shield,storm,turret' && L.p.sort().join() === 'dur,firewall,repair', `closed at start: weapons ${L.w.join(', ')}; skills ${L.p.join(', ')}`);
  const S = SIM.spawn(2, {}, META.runOpts()), seen = new Set(); for (let i = 0; i < 400; i++) { for (const o of SIM.rollPick(S)) seen.add(o.id); S.ps.hp = 0; }
  ok(![...L.w, ...L.p].some((k) => seen.has(k)), `400 level-ups of a new player offer ${seen.size} kinds, none of them closed`);
  const free = SIM.spawn(2, {}, { hero: 'utrace' }), seenF = new Set(); for (let i = 0; i < 400; i++) for (const o of SIM.rollPick(free)) seenF.add(o.id);
  ok(['retry', 'shield', 'firewall'].every((k) => seenF.has(k)), 'a run without the lock (the demo, the checks) still offers everything');
  const openU = META.UPG.filter((u) => !V().locked(u)).map((u) => u.id); ok(openU.join() === 'health,power', 'the shop sells only ' + openU.join(', ') + ' at start');
  D.codes = 9999; const shop = (id) => META.view().items.findIndex((o) => o.id === id);
  META.go('shop', true); META.click(...center(V().items[shop('speed')].r)); ok(!D.up.speed && D.codes === 9999, 'a closed upgrade cannot be bought');
  META.tab('hero'); META.click(...center(V().items[shop('h_traceability')].r)); ok(!D.heroes.traceability && D.codes === 9999, 'a closed hero cannot be bought');
  META.tab('skin'); META.click(...center(V().items[shop('s_utrace_arctic')].r)); META.click(...center(V().items[shop('s_utrace_zen')].r));
  ok(D.skins.utrace_arctic && !D.skins.utrace_zen, 'the recolour is sold at once, the calm skin is closed');
  META.tab('up'); D.up.power = 3; META.click(...center(V().items[shop('power')].r)); ok(D.up.power === 3, 'rank 4 waits for «' + ACH.gate('ranks', 'up').title + '»');
  D.best.time = 200; D.runs = 10; D.byHero.utrace = { time: 200, kills: 0, lvl: 0, wins: 0, runs: 5 }; const done = ACH.check(D);
  ok(!ACH.isOpen(D, 'hero', 'traceability') && ACH.ready(D, 'hero', 'traceability') && ACH.ready(D, 'u', 'speed'), 'done but not claimed: still closed, ready to claim (' + done.map((x) => x.title).join(', ') + ')');
  const c1 = D.codes; META.tab('hero'); META.click(...center(V().items[shop('h_traceability')].r));
  ok(D.ach.surv_180 && !D.heroes.traceability && D.codes === c1 + ACH.BY.surv_180.reward && ACH.isNew(D, 'hero', 'traceability') && ACH.isOpen(D, 'u', 'range'), 'a press on the hero claims «Стабильный аптайм»: +' + ACH.BY.surv_180.reward + ' codes, the hero and «Радиус сканирования» open and new');
  META.click(...center(V().items[shop('h_traceability')].r)); ok(D.heroes.traceability, 'the next press buys the hero');
  META.click(...center(V().items[shop('tab_up')].r)); ok(!ACH.isNew(D, 'hero', 'traceability'), 'leaving the tab clears «НОВОЕ»');
  META.click(...center(V().items[shop('power')].r)); ok(D.ach.runs_10 && D.up.power === 3, 'a press on a capped upgrade claims «Десять смен»');
  META.click(...center(V().items[shop('power')].r)); ok(D.up.power === 4, 'then rank 4 is bought');
  // the achievements screen: a card claims its achievement; «Забрать всё» the rest
  META.go('ach', true); META.acat('survival'); const card = V().items.findIndex((o) => o.ach && o.ach.id === 'surv_60'), c2 = D.codes;
  META.click(...center(V().items[card].r)); ok(D.ach.surv_60 && D.codes === c2 + 5, 'a card claims «Быстрый пинг»: +5');
  META.click(...center(V().items[card].r)); ok(D.codes === c2 + 5, 'a second press pays nothing');
  META.click(...center(V().items.find((o) => o.claimAll).r)); ok(!ACH.waiting(D).length, '«Забрать всё» claims the rest');
  // the cloud: an achievement done on another device waits here and pays no codes
  META.mergeAch(['bosses_1']); const c3 = D.codes; ok(D.done.bosses_1 === 2, 'from the cloud: waiting'); META.claim('bosses_1');
  ok(D.ach.bosses_1 && D.codes === c3 && ACH.isOpen(D, 'hero', 'ba'), 'claimed without codes, its content opens'); }
function center(r) { return [r[0] + r[2] / 2, r[1] + r[3] / 2]; }

console.log(bad ? `\n${bad} FAILED` : '\nall ok');
process.exitCode = bad ? 1 : 0;
