// The heroes' E abilities without a browser: each hero casts once in a crowd; checks the cooldown, the effect and the rank card.
//   node tools/ability-check.mjs
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const live = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'live');
const ctx = { console, Math, Date, JSON }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['course.js', 'edu.js', 'sim.js']) vm.runInContext(fs.readFileSync(path.join(live, f), 'utf8'), ctx, { filename: f });
const { SIM } = ctx, none = { px: 1200, py: 500 };
for (const h of Object.keys(SIM.HEROES)) {
  const S = SIM.spawn(3, {}, { hero: h }); S.hp = 1e6; S.nextSwarm = 1e9;
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, d = 160 + (i % 3) * 90; const e = SIM.mkFoe(S, 'node', S.x + Math.cos(a) * d, S.y + Math.sin(a) * d * 0.7); e.hp = e.mhp = 5000; }
  const A = SIM.ABIL[h], hp0 = S.E.reduce((n, e) => n + e.hp, 0), cdT0 = JSON.stringify(S.wcd);
  SIM.step(S, Object.assign({ use: 1 }, none)); const castOk = S.ab.cd > A.cd - 0.1, pk = S.P.filter((p) => p.k === 'pkt').length, truce = S.E.filter((e) => e.truceT > S.t).length;
  let stunned = 0, jumps = 0; for (let i = 0; i < 240; i++) { SIM.step(S, i % 120 === 0 ? Object.assign({ slot: 1 }, none) : none); S.hp = 1e6; stunned = Math.max(stunned, S.E.filter((e) => e.stunT > S.t).length);
    for (const ev of S.ev) if (ev.k === 'chain' && ev.t === S.t) jumps = Math.max(jumps, ev.pts.length - 1); }
  SIM.step(S, Object.assign({ use: 1 }, none)); const recast = S.ab.cd < A.cd - 1;                // still cooling down: a second E does nothing
  const card = SIM.rollPick(Object.assign(S, { abR: 0 })).length >= 0 && [...Array(40)].some(() => SIM.rollPick(S).some((o) => o.k === 'ab'));
  console.log(`${h.padEnd(14)} ${A.name.padEnd(12)} cast ${castOk}, cooling ${recast}, packets ${pk}, pacified ${truce}, frozen max ${stunned}, chain max ${jumps}, rank card offered ${card}`);
}
