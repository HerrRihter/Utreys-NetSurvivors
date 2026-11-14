// live/learn/core.js: the learning core (docs/DESIGN-LEARN-CORE.md): checking answers of every question type, choosing questions,
// spaced repetition (Leitner boxes) and mastery. Pure functions of their arguments: no DOM, no SIM, no clock (the caller passes
// `today`, a day number from LEARN.day) and no Math.random (the caller passes `rng`), so a run of the game replays exactly.
// The courses come from window.COURSE (live/course.js, built from content/ by tools/build-content.mjs).
(() => {
  const C = () => window.COURSE;
  const GEN = {};                                                    // question generators by name: LEARN.GEN.chart = (params, rng) => instance
  const INTERVAL = [0, 1, 2, 4, 8, 16];                              // days to the next repeat, by box
  const MASTERED_BOX = 3, MASTERED_SHARE = 0.8;
  const GAME_KINDS = ['single', 'multiple'];                         // what the game's test screen can show (options to pick)

  // ---------------- courses and questions ----------------
  const course = (id) => C().courses[id] || null;
  // the courses a player can see: every course but the stubs, which only a dev build shows (static builds set __STATIC__)
  const courses = ({ stubs = !window.__STATIC__ } = {}) => Object.values(C().courses).filter((c) => stubs || !c.stub).map((c) => c.id);
  const question = (courseId, qid) => { const c = course(courseId); return c ? c.questions.find((q) => q.id === qid) || null : null; };
  const key = (courseId, qid) => courseId + ':' + qid;
  const kindOf = (q) => (q.type === 'template' ? 'template' : q.type);

  const shuffle = (a, rng) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // a shuffle that does not leave the list as it was (for order questions: the answer must not be shown as given)
  const scramble = (a, rng) => { if (a.length < 2) return a.slice(); for (let i = 0; i < 6; i++) { const s = shuffle(a, rng); if (s.some((x, j) => x !== a[j])) return s; } return a.slice(1).concat(a[0]); };

  // ---------------- an instance to show ----------------
  // options, items and the right column come in a fresh order; a template becomes the question its generator makes (keeping the
  // template's id, so mastery counts the template, not the one drawn instance); a case makes each of its steps
  function make(q, rng) {
    const out = Object.assign({}, q);
    switch (q.type) {
      case 'single': case 'multiple': case 'image_choice': out.options = shuffle(q.options, rng); break;
      case 'order': out.items = scramble(q.items, rng); break;
      case 'pairs': out.right = shuffle(q.right, rng); break;
      case 'case': out.steps = q.steps.map((s) => make(s, rng)); break;
      case 'template': { const g = GEN[q.gen]; if (!g) throw new Error('no generator ' + q.gen);
        const inst = make(g(q.params || {}, rng), rng); return Object.assign(inst, { id: q.id, topic: q.topic, of: q.gen, template: true }); }
    }
    return out;
  }

  // ---------------- checking an answer ----------------
  // → { correct, score 0..1, detail }; the answer's shape by type: single / image_choice / multiple [ids], true_false boolean,
  // order [ids in order], pairs [[left, right], …], gap string, hotspot [x, y] in 0..1 of the image, case [answer per step]
  const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').replace(/[\s ]+/g, ' ').trim();
  function check(q, answer) {
    const res = (correct, score, detail) => ({ correct: !!correct, score: Math.max(0, Math.min(1, score)), detail: detail || null });
    switch (q.type) {
      case 'single': case 'image_choice': { const a = Array.isArray(answer) ? answer : [answer]; const ok = a.length === 1 && a[0] === q.correct[0]; return res(ok, ok ? 1 : 0); }
      case 'multiple': { const a = new Set(Array.isArray(answer) ? answer : []), right = q.correct.filter((id) => a.has(id)).length, wrong = [...a].filter((id) => !q.correct.includes(id));
        return res(right === q.correct.length && !wrong.length, (right - wrong.length) / q.correct.length, { right, wrong }); }
      case 'true_false': return res(answer === q.correct, answer === q.correct ? 1 : 0);
      case 'order': { const a = Array.isArray(answer) ? answer : [], places = q.correct.filter((id, i) => a[i] === id).length;
        return res(places === q.correct.length && a.length === q.correct.length, places / q.correct.length, { places }); }
      case 'pairs': { const a = new Map((Array.isArray(answer) ? answer : []).map(([l, r]) => [l, r])), good = q.correct.filter(([l, r]) => a.get(l) === r).length;
        return res(good === q.correct.length, good / q.correct.length, { good }); }
      case 'gap': { const ok = typeof answer === 'string' && q.accept.some((x) => norm(x) === norm(answer)); return res(ok, ok ? 1 : 0); }
      case 'hotspot': { const [x, y] = Array.isArray(answer) ? answer : [-1, -1];
        const hit = q.areas.find((ar) => x >= ar.rect[0] && x <= ar.rect[0] + ar.rect[2] && y >= ar.rect[1] && y <= ar.rect[1] + ar.rect[3]);
        const ok = !!hit && q.correct.includes(hit.id); return res(ok, ok ? 1 : 0, { area: hit ? hit.id : null }); }
      case 'case': { const a = Array.isArray(answer) ? answer : [], steps = q.steps.map((s, i) => check(s, a[i]));
        return res(steps.every((s) => s.correct), steps.reduce((n, s) => n + s.score, 0) / steps.length, { steps }); }
      case 'template': throw new Error('check an instance of ' + q.id + ' (LEARN.make), not the template');
    }
    throw new Error('unknown question type ' + q.type);
  }

  // ---------------- mastery: Leitner boxes ----------------
  // state.q[course:qid] = [box 0..5, the day of the next repeat, right, asked]. Right: one box up, repeat after INTERVAL[box] days;
  // wrong: back to box 1, repeat tomorrow. Only the first attempt at a question in a run or a lesson is recorded (the caller's rule).
  const fresh = () => ({ v: 1, q: {}, xp: 0, streak: { days: 0, last: 0, freeze: 0 } });
  const day = (date = new Date()) => Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / 86400000);
  const rec = (state, k) => (state && state.q && state.q[k]) || null;
  function record(state, courseId, qid, correct, today) {
    const k = key(courseId, qid), r = rec(state, k) || [0, today, 0, 0], box = correct ? Math.min(5, r[0] + 1) : 1;
    const q = Object.assign({}, state && state.q, { [k]: [box, today + (correct ? INTERVAL[box] : 1), r[2] + (correct ? 1 : 0), r[3] + 1] });
    return Object.assign(fresh(), state, { q });
  }
  // the order of need: 0 due for a repeat (most overdue first), 1 weak (box 1: got it wrong last time), 2 new, 3 the rest (lower box first)
  function need(state, courseId, q, today) {
    const r = rec(state, key(courseId, q.id));
    if (!r) return [2, 0];
    if (r[1] <= today) return [0, r[1] - today];
    if (r[0] <= 1) return [1, 0];
    return [3, r[0]];
  }
  // up to `count` questions of a course (of one topic, if given) that the mode can show (`kinds`), the most needed first; ties go in
  // the order of `rng`, so a fresh player gets a plain random draw
  function pick(state, { course: courseId, topic = null, count = 10, kinds = null, rng, today, exclude = [], version = Infinity }) {
    const c = course(courseId); if (!c) return [];
    const pool = c.questions.filter((q) => (topic === null || q.topic === topic) && (!kinds || kinds.includes(kindOf(q))) && !exclude.includes(q.id) && (q.sinceVersion || 1) <= version);
    const ranked = shuffle(pool, rng).map((q, i) => ({ q, i, n: need(state, courseId, q, today) }));
    ranked.sort((a, b) => a.n[0] - b.n[0] || a.n[1] - b.n[1] || a.i - b.i);
    return ranked.slice(0, count).map((x) => x.q);
  }
  // what a run of the game needs to know of the player (it is saved with a suspended run, so a resumed or replayed run asks the same):
  // { qid: rank } where a lower rank is asked first: 0 got it wrong last time, 1 never asked, 2..5 the box
  function snapshot(state, courseId) {
    const c = course(courseId), out = {}; if (!c) return out;
    for (const q of c.questions) { const r = rec(state, key(courseId, q.id)); if (r) out[q.id] = r[0] <= 1 ? 0 : r[0]; }
    return out;
  }
  const rank = (snap, qid) => (snap && qid in snap ? snap[qid] : 1);
  // per topic: how many questions, asked at least once, mastered (box 3+), due today, weak (box 1); a topic is mastered at 80 %
  function mastery(state, courseId, today) {
    const c = course(courseId); if (!c) return null;
    const topics = c.topics.map((t, i) => { const qs = c.questions.filter((q) => q.topic === i), rs = qs.map((q) => rec(state, key(courseId, q.id)));
      const n = { name: t.name, total: qs.length, asked: rs.filter(Boolean).length, mastered: rs.filter((r) => r && r[0] >= MASTERED_BOX).length,
        due: today === undefined ? 0 : rs.filter((r) => r && r[1] <= today).length, weak: rs.filter((r) => r && r[0] === 1).length };
      n.done = n.total > 0 && n.mastered / n.total >= MASTERED_SHARE; return n; });
    const sum = (k) => topics.reduce((s, t) => s + t[k], 0);
    return { course: courseId, title: c.title, topics, total: sum('total'), asked: sum('asked'), mastered: sum('mastered'), due: sum('due'), weak: sum('weak'), done: topics.every((t) => t.done) };
  }

  window.LEARN = { GEN, INTERVAL, GAME_KINDS, course, courses, question, key, kindOf, shuffle, make, check, norm, fresh, day, record, pick, snapshot, rank, mastery };
})();
