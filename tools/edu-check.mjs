// The training centre without a browser: every room of 200 seeds builds and validates (walls, terminals, guard posts, the door,
// the boss spot, reachable floor), each course has enough questions for disjoint terminal sets, and a scripted run walks the
// first maze: frees a terminal by the workaround, passes its test, and checks the rewards, the audit and the revival.
//   node tools/edu-check.mjs [seeds]
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const live = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'live');
const ctx = { console, Math, Date, JSON }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['course.js', 'edu.js', 'sim.js']) vm.runInContext(fs.readFileSync(path.join(live, f), 'utf8'), ctx, { filename: f });
const { SIM, EDU, COURSE } = ctx;
const N = +(process.argv[2] || 200), bad = []; let tries = 0, maxTries = 0;
for (let s = 0; s < N; s++) for (let room = 0; room < COURSE.rooms.length; room++) {
  const L = SIM.buildLevel('edu', 1000 + s * 131, room), p = SIM.validate(L); tries += L.tries; maxTries = Math.max(maxTries, L.tries);
  if (p.length) bad.push(`seed ${1000 + s * 131} room ${room}: ${p.join('; ')}`); }
console.log(`levels: ${N * COURSE.rooms.length}, failing ${bad.length}, mean tries ${(tries / N / COURSE.rooms.length).toFixed(2)}, max ${maxTries}`); bad.slice(0, 8).forEach((b) => console.log('  ' + b));
for (const id of COURSE.order) { const c = COURSE.courses[id], ed = EDU.fresh(id); const per = c.topics.map((t, i) => EDU.testable(ed).filter((q) => q.topic === i).length);
  const sets = c.topics.map((t, i) => [0, 1, 2].map((k) => EDU.terminalQuestions(ed, 4242, i, k).map((q) => q.id))), flat = sets.flat(2);
  console.log(`${id}: testable per topic ${per.join('/')}, terminal sets disjoint: ${new Set(flat).size === flat.length && flat.length === 27}`); }

// a scripted run: the hero is teleported next to terminal 1, waits out the workaround, opens the test, answers right
const S = SIM.spawn(5, {}, { map: 'edu', hero: 'utrace', course: 'batch-accounting' }); S.hp = 1e6; S.mods.regen = 0;
const L = SIM.LEVEL, tm = L.TERMS[0], none = { px: 960, py: 540 };
const unpick = () => { for (let i = 0; i < 20 && S.pick; i++) { SIM.step(S, Object.assign({ slot: 1 }, none)); for (let j = 0; j < 50; j++) SIM.step(S, none); } };
const run = (sec, inp = none) => { for (let i = 0; i < sec * 120; i++) { SIM.step(S, S.pick && i % 60 === 0 ? Object.assign({ slot: 1 }, inp) : inp); if (S.hp < 1e5 && !S.ed.active) S.hp = 1e6; } };
console.log(`room ${S.room}: ${L.TERMS.length} terminals, entry ${L.START}, door ${L.EXIT}, guards ${S.E.filter((e) => e.term).length}`);
S.E.forEach((e) => { if (e.term) e.hp = e.mhp = 1e9; });                      // guards cannot die: test the workaround
S.x = tm.cx; S.y = tm.cy; let held = 0; while (!S.nodes[0].st && held < 45) { run(1); held++; }
console.log(`workaround after ${held}s (hit-stop frames pause it): terminal st=${S.nodes[0].st}, guard gone ${!S.E.some((e) => e.term === 1)}`);
S.E = S.E.filter((e) => e.term !== 2 && e.term !== 3 || true); S.x = tm.x; S.y = tm.y; S.graceT = 1e9; unpick(); S.x = tm.x; S.y = tm.y;
SIM.step(S, Object.assign({ use: 1 }, none)); console.log(`E at the terminal: test open ${!!S.ed.active}, phase ${S.ed.active && S.ed.active.phase}`);
const press = (k) => { SIM.step(S, Object.assign({}, none, k)); for (let i = 0; i < 40; i++) SIM.step(S, none); };
for (let i = 0; i < 40; i++) SIM.step(S, none); press({ jump: 1 });                // (a page takes 0.25 s before it can be turned) intro → question
let right = 0; for (let qi = 0; qi < 3; qi++) { const a = S.ed.active, q = EDU.question(S.ed, a.questions[a.index].id);
  const want = qi < 2 ? q.correct : [a.questions[a.index].options.find((o) => !q.correct.includes(o))];   // two right, one wrong
  for (const o of want) press({ slot: a.questions[a.index].options.indexOf(o) + 1 });
  press({ jump: 1 }); right += S.ed.active.lastCorrect ? 1 : 0; press({ jump: 1 }); }
console.log(`answered: right ${right}, phase ${S.ed.active && S.ed.active.phase}, passed ${S.ed.active && S.ed.active.passed}`);
const t0 = S.t; press({ jump: 1 }); console.log(`closed: terminal st=${S.nodes[0].st}, audits owed ${S.ed.audits}, heal drops ${S.Gm.filter((g) => g.b === 2).length}, chests ${S.Gm.filter((g) => g.b === 3).length}, time stood still ${Math.abs(S.t - t0) < 1}`);
run(0.2); console.log(`after a step: audits ${S.ed.audits}, foes ${S.E.length}, toast "${S.toast && S.toast.s}"`);
// the revival: a lethal hit opens the revival test; failing it ends the run
S.graceT = 0; S.iT = -9; S.dashT = -9; S.hp = 1; const hit = S.E.find((e) => !e.term); S.ed.reviveUsed = false;
(function () { const f = SIM.FOE; })(); S.hp = 1;
const before = !!S.ed.active; SIM.step(S, none); S.hp = 0.5;
// force damage through the public path: put the hero inside a mortar mark about to land
S.MK.push({ x: S.x, y: S.y, r: 200, delay: 0, t0: S.t - 1, dmg: 999 }); SIM.step(S, none);
console.log(`lethal hit: revival test open ${!!(S.ed.active && S.ed.active.reason === 'revive')} (was open before: ${before}), over ${!!S.over}`);
if (S.ed.active) { for (let i = 0; i < 40; i++) SIM.step(S, none); press({ jump: 1 }); for (let qi = 0; qi < 3; qi++) { const a = S.ed.active, q = EDU.question(S.ed, a.questions[a.index].id); press({ slot: a.questions[a.index].options.indexOf(q.correct[0]) + 1 }); if (q.type === 'multiple') for (const o of q.correct.slice(1)) press({ slot: a.questions[a.index].options.indexOf(o) + 1 }); press({ jump: 1 }); press({ jump: 1 }); }
  press({ jump: 1 }); console.log(`revival passed: hp ${Math.round(S.hp)} of ${Math.round(SIM.hpMax(S))}, over ${!!S.over}`); }
console.log('summary', JSON.stringify(EDU.summary(S.ed)));
