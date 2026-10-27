// The hero's facing near straight up and down: the cursor sweeps across above and below the hero in 6 px steps and rests at each
// point; the facing must change once per crossing and never flip back and forth while the cursor rests (it used to jitter there).
//   node tools/aim-check.mjs
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const live = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'live');
const ctx = { console, Math, Date, JSON }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['course.js', 'edu.js', 'sim.js']) vm.runInContext(fs.readFileSync(path.join(live, f), 'utf8'), ctx, { filename: f });
const { SIM } = ctx;
for (const [name, dy] of [['above', -380], ['below', 300], ['close above', -140]]) {
  const S = SIM.spawn(1, {}, { hero: 'utrace' }); S.E = []; S.nextSwarm = 1e9; S.spawnAcc = -1e9; S.hp = 1e6;
  for (let i = 0; i < 240; i++) SIM.step(S, { px: 960, py: 540 });                           // the camera settles
  let flips = 0, crossings = 0, jitter = 0, prev = S.face;
  for (let i = 0; i < 60; i++) SIM.step(S, { px: S.x - 150 - S.cam[0], py: S.y + dy - S.cam[1] }); prev = S.face;     // start on the left
  for (let off = -150; off <= 150; off += 6) { let restFlips = 0, f0 = S.face;
    for (let i = 0; i < 30; i++) { const wx = S.x + off, wy = S.y + dy; SIM.step(S, { px: wx - S.cam[0], py: wy - S.cam[1] }); if (S.face !== prev) { flips++; if (i > 0) restFlips++; prev = S.face; } }
    if (S.face !== f0) crossings++; if (restFlips) jitter++; }
  console.log(`${name.padEnd(12)} facing changes ${flips}, while resting ${jitter}  (expected: 1 change, 0 while resting)`);
}
console.log('demo still plays its moment:', SIM.demoCheck(SIM.at(23.9)));
