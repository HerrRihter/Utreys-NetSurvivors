// The learning core without a browser (live/learn/core.js, docs/DESIGN-LEARN-CORE.md): answers of every question type are checked
// right, instances are reproducible from a seed, Leitner boxes move as designed, questions are picked by need, snapshots and
// mastery add up, and the real courses pass through make → check with their own keys.
//   node tools/learn-check.mjs
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const live = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'live');
const ctx = { console, Math, Date, JSON }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['course.js', 'learn/core.js']) vm.runInContext(fs.readFileSync(path.join(live, f), 'utf8'), ctx, { filename: f });
const { LEARN, COURSE } = ctx;
let bad = 0; const ok = (c, s) => { console.log((c ? 'ok   ' : 'FAIL ') + s); if (!c) bad++; };
const mulberry = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------------- check, type by type ----------------
const opts = (n) => Array.from({ length: n }, (_, i) => ({ id: 'o' + i, text: 'вариант ' + i }));
const single = { id: 's', type: 'single', options: opts(4), correct: ['o2'] };
ok(LEARN.check(single, ['o2']).correct && !LEARN.check(single, ['o1']).correct && !LEARN.check(single, ['o2', 'o1']).correct, 'single: one right option');
const multi = { id: 'm', type: 'multiple', options: opts(5), correct: ['o0', 'o3'] };
const m1 = LEARN.check(multi, ['o3', 'o0']), m2 = LEARN.check(multi, ['o0']), m3 = LEARN.check(multi, ['o0', 'o3', 'o4']);
ok(m1.correct && m1.score === 1 && !m2.correct && m2.score === 0.5 && !m3.correct && m3.score === 0.5, `multiple: exact set; partial score ${m2.score}, with a wrong pick ${m3.score}`);
const tf = { id: 't', type: 'true_false', correct: false };
ok(LEARN.check(tf, false).correct && !LEARN.check(tf, true).correct && !LEARN.check(tf, undefined).correct, 'true_false');
const order = { id: 'or', type: 'order', items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }], correct: ['a', 'b', 'c', 'd'] };
const o2 = LEARN.check(order, ['a', 'b', 'd', 'c']);
ok(LEARN.check(order, ['a', 'b', 'c', 'd']).correct && !o2.correct && o2.score === 0.5 && !LEARN.check(order, ['a', 'b', 'c']).correct, `order: exact sequence; two swapped score ${o2.score}`);
const pairs = { id: 'p', type: 'pairs', left: [{ id: 'l1' }, { id: 'l2' }, { id: 'l3' }], right: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }], correct: [['l1', 'r1'], ['l2', 'r2'], ['l3', 'r3']] };
const p2 = LEARN.check(pairs, [['l1', 'r1'], ['l2', 'r3'], ['l3', 'r2']]);
ok(LEARN.check(pairs, [['l3', 'r3'], ['l1', 'r1'], ['l2', 'r2']]).correct && !p2.correct && Math.abs(p2.score - 1 / 3) < 1e-9, 'pairs: all pairs right, any order; partial score by right pairs');
const gap = { id: 'g', type: 'gap', text: 'Код товара — ___', accept: ['GTIN', 'глобальный номер товара'] };
ok(LEARN.check(gap, '  gtin ').correct && LEARN.check(gap, 'Глобальный  номер товара').correct && !LEARN.check(gap, 'EAN').correct, 'gap: case, spaces and ё/е do not matter');
ok(LEARN.check({ id: 'g2', type: 'gap', text: '___', accept: ['счёт'] }, 'СЧЕТ').correct, 'gap: ё equals е');
const hot = { id: 'h', type: 'hotspot', image: { src: 'x', alt: 'x' }, areas: [{ id: 'cpu', rect: [0, 0, 0.5, 0.5] }, { id: 'disk', rect: [0.5, 0.5, 0.5, 0.5] }], correct: ['disk'] };
ok(LEARN.check(hot, [0.7, 0.8]).correct && !LEARN.check(hot, [0.2, 0.2]).correct && LEARN.check(hot, [0.2, 0.2]).detail.area === 'cpu' && !LEARN.check(hot, [0.9, 0.1]).correct, 'hotspot: a point inside a right area');
const cs = { id: 'c', type: 'case', text: 'кейс', steps: [Object.assign({}, single, { id: 'c1' }), Object.assign({}, tf, { id: 'c2' }), Object.assign({}, gap, { id: 'c3' })] };
const c2 = LEARN.check(cs, [['o2'], true, 'gtin']);
ok(LEARN.check(cs, [['o2'], false, 'gtin']).correct && !c2.correct && Math.abs(c2.score - 2 / 3) < 1e-9 && c2.detail.steps.length === 3, 'case: every step right; score by steps');
let threw = false; try { LEARN.check({ id: 'x', type: 'template', gen: 'chart' }, []); } catch (e) { threw = true; } ok(threw, 'a template is checked through its instance only');

// ---------------- make ----------------
const a1 = LEARN.make(single, mulberry(7)), a2 = LEARN.make(single, mulberry(7)), orders = new Set(Array.from({ length: 20 }, (_, i) => LEARN.make(single, mulberry(i)).options.map((o) => o.id).join()));
ok(same(a1, a2) && a1.options.length === 4 && orders.size > 5, `make: the same seed gives the same instance; 20 seeds give ${orders.size} option orders`);
ok(single.options.map((o) => o.id).join() === 'o0,o1,o2,o3', 'make leaves the question itself untouched');
ok(Array.from({ length: 50 }, (_, i) => LEARN.make(order, mulberry(i))).every((x) => !same(x.items.map((i) => i.id), order.correct)), 'order: never shown already in the right order');
ctx.LEARN.GEN.test = (p, rng) => ({ id: 'gen', type: 'single', text: 'сколько? ' + p.n, explanation: 'e', options: opts(3), correct: ['o' + Math.floor(rng() * 3)] });
const tpl = { id: 'tpl-1', topic: 0, type: 'template', gen: 'test', params: { n: 5 } }, inst = LEARN.make(tpl, mulberry(3));
ok(inst.id === 'tpl-1' && inst.template && inst.type === 'single' && LEARN.check(inst, inst.correct).correct && same(inst, LEARN.make(tpl, mulberry(3))), 'template: an instance keeps the template id, checks against its own key, is reproducible');

// ---------------- Leitner ----------------
const T = 20000; let st = LEARN.fresh();
st = LEARN.record(st, 'k', 'q1', true, T); ok(same(st.q['k:q1'], [1, T + 1, 1, 1]), 'right once: box 1, again tomorrow');
st = LEARN.record(st, 'k', 'q1', true, T + 1); st = LEARN.record(st, 'k', 'q1', true, T + 3);
ok(same(st.q['k:q1'], [3, T + 3 + 4, 3, 3]), 'right three times: box 3, again in 4 days');
const before = JSON.stringify(st); const st2 = LEARN.record(st, 'k', 'q1', false, T + 7);
ok(same(st2.q['k:q1'], [1, T + 8, 3, 4]) && JSON.stringify(st) === before, 'wrong: back to box 1, again tomorrow; the old state is not changed');
let top = LEARN.fresh(); for (let i = 0; i < 9; i++) top = LEARN.record(top, 'k', 'q', true, T + i * 20);
ok(top.q['k:q'][0] === 5 && top.q['k:q'][1] === T + 160 + 16, 'the box stops at 5 (16 days)');

// ---------------- pick, snapshot, mastery on a real course ----------------
const cid = COURSE.order[0], cq = COURSE.courses[cid].questions, kinds = LEARN.GAME_KINDS;
const fresh10 = LEARN.pick(LEARN.fresh(), { course: cid, count: 10, kinds, rng: mulberry(1), today: T });
ok(fresh10.length === 10 && new Set(fresh10.map((q) => q.id)).size === 10, 'pick: 10 different questions for a fresh player');
ok(same(fresh10.map((q) => q.id), LEARN.shuffle(cq, mulberry(1)).slice(0, 10).map((q) => q.id)), 'pick: a fresh player gets a plain random draw from the seed');
let s = LEARN.fresh(); const [w, d, r1] = [cq[5].id, cq[6].id, cq[7].id];
s = LEARN.record(s, cid, r1, true, T); s = LEARN.record(s, cid, r1, true, T + 1);       // r1: box 2, due T + 3
s = LEARN.record(s, cid, d, true, T - 5);                                               // d: box 1, due T - 4: overdue
s = LEARN.record(s, cid, w, false, T);                                                  // w: wrong today: box 1, due tomorrow
const order1 = LEARN.pick(s, { course: cid, count: cq.length, kinds, rng: mulberry(2), today: T + 1 }).map((q) => q.id);
ok(order1[0] === d && order1[1] === w && order1[order1.length - 1] === r1, `pick: overdue first (${d}), then due (${w}), new in between, not yet due last (${r1})`);
ok(LEARN.pick(s, { course: cid, topic: 1, count: 99, kinds, rng: mulberry(2), today: T }).every((q) => q.topic === 1), 'pick: a topic keeps to its topic');
ok(LEARN.pick(s, { course: cid, count: 99, kinds: ['pairs'], rng: mulberry(2), today: T }).length === 0, 'pick: only kinds the mode can show');
const snap = LEARN.snapshot(s, cid);
ok(snap[w] === 0 && snap[d] === 0 && snap[r1] === 2 && LEARN.rank(snap, cq[0].id) === 1 && Object.keys(snap).length === 3, 'snapshot: wrong or box 1 → 0, new → 1, box n → n');
let all = LEARN.fresh(); for (const q of cq.filter((q) => q.topic === 0)) for (let i = 0; i < 3; i++) all = LEARN.record(all, cid, q.id, true, T + i * 10);
const ms = LEARN.mastery(all, cid, T + 30);
ok(ms.topics[0].done && !ms.topics[1].done && ms.topics[0].mastered === ms.topics[0].total && ms.total === cq.length && !ms.done, `mastery: topic 1 mastered (${ms.topics[0].mastered}/${ms.topics[0].total}), the course not yet`);

// ---------------- the real courses through make → check ----------------
let n = 0, wrong = [];
for (const id of Object.keys(COURSE.courses)) for (const q of COURSE.courses[id].questions) { if (q.type === 'template' && !LEARN.GEN[q.gen]) continue;
  const x = LEARN.make(q, mulberry(n++)), key = x.type === 'true_false' ? x.correct : x.correct;
  if (!LEARN.check(x, key).correct) wrong.push(id + ':' + q.id); }
ok(!wrong.length, `every question of every course accepts its own key (${n})` + (wrong.length ? ': ' + wrong.slice(0, 5).join(', ') : ''));
ok(LEARN.courses({ stubs: false }).every((id) => !COURSE.courses[id].stub), 'a public build hides stub courses');

console.log(bad ? `\n${bad} FAILED` : '\nall ok');
process.exitCode = bad ? 1 : 0;
