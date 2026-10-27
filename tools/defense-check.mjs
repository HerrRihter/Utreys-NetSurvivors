// The defensive items without a browser: Брандмауэр cuts a hit, Самовосстановление heals over time, Отказоустойчивость absorbs a
// whole hit then recharges (its wave pushes from level 3), the evolution holds 2 charges; all of them are offered on level-ups.
//   node tools/defense-check.mjs
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const live = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'live');
const ctx = { console, Math, Date, JSON }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['course.js', 'edu.js', 'sim.js']) vm.runInContext(fs.readFileSync(path.join(live, f), 'utf8'), ctx, { filename: f });
const { SIM } = ctx, none = { px: 960, py: 540 };
const run = (S, n) => { for (let i = 0; i < n; i++) SIM.step(S, none); };
const fresh = () => { const S = SIM.spawn(2, {}, { hero: 'utrace' }); S.E = []; S.nextSwarm = 1e9; S.spawnAcc = -1e9; S.bossQ = []; return S; };
// a mortar shell landing on the hero: the same damage path as any foe's hit
const hit = (S, dmg = 40) => { S.iT = -9; S.dashT = -9; S.MK.push({ x: S.x, y: S.y, r: 200, delay: 0, t0: S.t - 1, dmg }); const hp = S.hp; SIM.step(S, none); return +(hp - S.hp).toFixed(2); };
{ const S = fresh(); S.hp = 100; const plain = hit(S); S.ps.firewall = 5; S.hp = 100; const armoured = hit(S);
  console.log(`Брандмауэр: a hit of ${plain} becomes ${armoured} at rank 5 (−${Math.round((1 - armoured / plain) * 100)}%)`); }
{ const S = fresh(); S.ps.repair = 5; S.hp = 50; run(S, 120 * 10); console.log(`Самовосстановление rank 5: +${(S.hp - 50).toFixed(1)} HP in 10 s`); }
{ const S = fresh(); S.wp.shield = 1; S.wcd.shield = 0.3; run(S, 60); const ch0 = S.shCh; S.hp = 100;
  const blocked = hit(S, 400); const ch1 = S.shCh, cd = +S.wcd.shield.toFixed(1); const after = hit(S, 40);
  run(S, 120 * 15); console.log(`Отказоустойчивость lv1: charged ${ch0}, a hit of 400 took ${blocked} HP, charges then ${ch1}, recharge ${cd} s, the next hit took ${after}, after 15 s charged ${S.shCh}`); }
{ const S = fresh(); S.wp.shield = 3; S.wcd.shield = 0; run(S, 30); const e = SIM.mkFoe(S, 'node', S.x + 120, S.y); e.nextAtk = 1e9; const x0 = e.x;
  hit(S, 40); run(S, 20); console.log(`lv3 wave: a foe 120 px away pushed ${Math.round(e.x - x0)} px`); }
{ const S = fresh(); S.wp.shield_x = 1; S.wcd.shield_x = 0; run(S, 120 * 8); const c = S.shCh; const a = hit(S, 300), b = hit(S, 300), d = hit(S, 30);
  console.log(`Кластер: charges ${c}, two hits of 300 took ${a} and ${b}, the third took ${d}`); }
{ const S = fresh(); const seen = new Set(); for (let i = 0; i < 300; i++) for (const o of SIM.rollPick(S)) seen.add(o.id);
  console.log('offered on level-ups:', ['shield', 'firewall', 'repair'].map((k) => k + ' ' + seen.has(k)).join(', ')); }
console.log('evolution recipe:', JSON.stringify(SIM.EVO.shield), '| demo ok:', SIM.demoCheck(SIM.at(23.9)));
