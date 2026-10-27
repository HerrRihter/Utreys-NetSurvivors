// live/edu.js: the training centre (Учебный центр), ported from utreys-survivors: the maze generator (src/world/maze.js), the
// tests at the terminals and the revival test (src/systems/learning.js, queries/learning.js) and the report card. The course data
// itself (questions, keys, explanations, rules, grading) comes unchanged from live/course.js (tools/build-course.mjs).
// Everything here is a pure function of its arguments or of the state passed in, so runs stay deterministic: the sim hands in its
// own random source for anything drawn during play.
(() => {
  const C = window.COURSE, R = C.rules;
  const mulberry = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const shuffle = (a, rng) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------------- the maze ----------------
  // A maze of cols × rows cells over a W × H floor (the original's square arena stretched to the slice's world). A recursive
  // backtracker from a random corner gives a perfect maze; `braid` opens that share of dead ends into loops. Terminals go as far
  // from the entry and from each other as the maze allows (dead ends preferred, never on the outer ring), the door to an inner cell
  // at least a third of the maze from all of them, and each terminal's guard into the passage leading to it.
  //   walls      [x, y, w, h] floor rectangles centred on the grid lines, merged along each line
  //   entry, exit, terminals [{ x, y, guard: { x, y } }], cell size, and open[] (bit 1 east, 2 south, 4 west, 8 north)
  function generate({ W, H, cols, rows, wall, braid, terminals }, rng) {
    const cw = W / cols, ch = H / rows, index = (c, r) => r * cols + c, open = new Uint8Array(cols * rows);
    const steps = [[1, 0, 1, 4], [0, 1, 2, 8], [-1, 0, 4, 1], [0, -1, 8, 2]];
    const neighbours = (c, r) => steps.map(([dc, dr, bit, back]) => ({ c: c + dc, r: r + dr, bit, back })).filter((n) => n.c >= 0 && n.r >= 0 && n.c < cols && n.r < rows);
    const carve = (c, r, n) => { open[index(c, r)] |= n.bit; open[index(n.c, n.r)] |= n.back; };
    const corner = Math.floor(rng() * 4), entryCell = { c: corner % 2 ? cols - 1 : 0, r: corner > 1 ? rows - 1 : 0 };
    const seen = new Uint8Array(cols * rows), stack = [entryCell]; seen[index(entryCell.c, entryCell.r)] = 1;
    while (stack.length) { const { c, r } = stack[stack.length - 1], next = neighbours(c, r).filter((n) => !seen[index(n.c, n.r)]);
      if (!next.length) { stack.pop(); continue; } const n = next[Math.floor(rng() * next.length)]; carve(c, r, n); seen[index(n.c, n.r)] = 1; stack.push({ c: n.c, r: n.r }); }
    const degree = (i) => [1, 2, 4, 8].filter((bit) => open[i] & bit).length;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { if (degree(index(c, r)) !== 1 || rng() >= braid) continue;
      const closed = neighbours(c, r).filter((n) => !(open[index(c, r)] & n.bit)); if (closed.length) carve(c, r, closed[Math.floor(rng() * closed.length)]); }
    const spread = Math.min(cols, rows) * 0.35, chosen = [index(entryCell.c, entryCell.r)];
    const apart = (i, j) => Math.hypot((i % cols) - (j % cols), Math.floor(i / cols) - Math.floor(j / cols));
    const edge = (i) => i % cols === 0 || i % cols === cols - 1 || i < cols || i >= cols * (rows - 1);
    const pick = (preferDeadEnds) => { let best = -1, bestScore = -1;
      for (let i = 0; i < cols * rows; i++) { if (chosen.includes(i) || (preferDeadEnds && edge(i))) continue;
        const score = Math.min(...chosen.map((j) => apart(i, j))) + (preferDeadEnds && degree(i) === 1 ? 0.75 : 0) + rng() * spread; if (score > bestScore) { best = i; bestScore = score; } }
      chosen.push(best); return best; };
    const centre = (i) => ({ x: Math.round((i % cols) * cw + cw / 2), y: Math.round(Math.floor(i / cols) * ch + ch / 2) });
    const terminalCells = Array.from({ length: terminals }, () => pick(true));
    const doorCells = []; for (let i = 0; i < cols * rows; i++) if (!edge(i) && chosen.every((j) => apart(i, j) >= Math.min(cols, rows) / 3)) doorCells.push(i);
    const exitCell = doorCells.length ? doorCells[Math.floor(rng() * doorCells.length)] : pick(false);
    const guardOf = (i) => { const c = i % cols, r = Math.floor(i / cols), way = neighbours(c, r).find((n) => open[i] & n.bit), p = centre(i);
      return way ? { x: Math.round(p.x + (way.c - c) * cw * 0.5), y: Math.round(p.y + (way.r - r) * ch * 0.5) } : p; };
    return { walls: wallRects(open, cols, rows, cw, ch, wall, W, H), entry: centre(chosen[0]), terminals: terminalCells.map((i) => Object.assign(centre(i), { guard: guardOf(i), cell: i })),
      exit: centre(exitCell), exitCell, cw, ch, cols, rows, open };
  }
  // closed cell sides as rectangles on the grid lines, consecutive ones merged; horizontal ones carry h: true
  function wallRects(open, cols, rows, cw, ch, wall, W, H) {
    const rects = [], half = wall / 2, clip = (x, y, w, h, hor) => { const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(W, x + w), y1 = Math.min(H, y + h); rects.push({ x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0), hor }); };
    for (let r = 0; r <= rows; r++) { let from = -1;
      for (let c = 0; c <= cols; c++) { const closed = c < cols && (r === 0 || r === rows || !(open[(r - 1) * cols + c] & 2));
        if (closed && from < 0) from = c; if (!closed && from >= 0) { clip(from * cw - half, r * ch - half, (c - from) * cw + wall, wall, true); from = -1; } } }
    for (let c = 0; c <= cols; c++) { let from = -1;
      for (let r = 0; r <= rows; r++) { const closed = r < rows && (c === 0 || c === cols || !(open[r * cols + c - 1] & 1));
        if (closed && from < 0) from = r; if (!closed && from >= 0) { clip(c * cw - half, from * ch - half, wall, (r - from) * ch + wall, false); from = -1; } } }
    return rects;
  }
  const mazeCache = new Map();
  // the maze of a run's room: from the run's seed and the room's number (a resumed run gets the same maze, a new run another)
  function maze(spec, seed, room) { const key = seed + ':' + room + ':' + spec.cols + 'x' + spec.rows; if (!mazeCache.has(key)) { if (mazeCache.size > 8) mazeCache.clear();
    mazeCache.set(key, generate(spec, mulberry((seed ^ Math.imul(room + 1, 0x9e3779b1)) >>> 0))); } return mazeCache.get(key); }

  // ---------------- courses and questions ----------------
  const course = (id) => C.courses[id] || C.courses[C.order[0]];
  const testable = (ed) => course(ed.course).questions.filter((q) => (q.sinceVersion || 1) <= ed.version && q.type !== 'open');
  const question = (ed, id) => course(ed.course).questions.find((q) => q.id === id);
  // a terminal's own three questions, rebuilt from the run's seed (no state, no draw from the run's random source): visiting another
  // terminal, failing or retrying never reshuffles them; terminal k of a topic gets the k-th slice of that topic's shuffled pool
  function terminalQuestions(ed, seed, topic, k) { const rng = mulberry((seed ^ 0x51ed270b ^ Math.imul(topic + 1, 0x9e3779b1)) >>> 0);
    return shuffle(testable(ed).filter((q) => q.topic === topic), rng).slice(k * R.questions, (k + 1) * R.questions); }
  const fresh = (courseId) => { const c = course(courseId); return { course: c.id, version: c.version, room: 0, audits: 0, surgeUntil: 0, nextAttempt: 1, active: null, reviveUsed: false, points: 0, answers: {}, rewards: [] }; };

  // ---------------- a test ----------------
  // reason 'lesson' (a terminal: node = { topic, k, i }) or 'revive'; rnd: the run's random source (option order, revival draw)
  function begin(ed, reason, node, seed, rnd) {
    if (ed.active) return false;
    if (reason === 'revive') { if (ed.reviveUsed) return false; ed.reviveUsed = true; }
    const qs = node ? terminalQuestions(ed, seed, node.topic, node.k)
      : shuffle(testable(ed), rnd).sort((a, b) => (ed.answers[a.id] && ed.answers[a.id].correct ? 1 : 0) - (ed.answers[b.id] && ed.answers[b.id].correct ? 1 : 0)).slice(0, R.questions);
    ed.active = { id: ed.nextAttempt++, reason, node: node ? node.i : -1, topic: node ? node.topic : null, phase: 'intro',
      questions: qs.map((q) => ({ id: q.id, options: shuffle(q.options.map((o) => o.id), rnd) })), index: 0, selected: [], answered: 0, correct: 0, lastCorrect: false, passed: false };
    return true;
  }
  function select(ed, option) { const a = ed.active; if (!a || a.phase !== 'question' || !a.questions[a.index].options.includes(option)) return false;
    const q = question(ed, a.questions[a.index].id); a.selected = q.type === 'single' ? [option] : a.selected.includes(option) ? a.selected.filter((v) => v !== option) : a.selected.concat([option]); return true; }
  function submit(ed) { const a = ed.active; if (!a || a.phase !== 'question' || !a.selected.length) return false;
    const q = question(ed, a.questions[a.index].id), correct = a.selected.length === q.correct.length && q.correct.every((v) => a.selected.includes(v));
    const rec = ed.answers[q.id] || { attempts: 0, correct: 0, firstCorrect: correct, firstCorrectAt: null, wrong: [], sources: [], topic: q.topic };
    rec.attempts++; a.answered++; const src = a.reason === 'revive' ? 'revive' : 'terminal'; if (!rec.sources.includes(src)) rec.sources.push(src);
    if (correct) { if (!rec.correct) ed.points += R.points; rec.correct++; if (rec.firstCorrectAt === null) rec.firstCorrectAt = rec.attempts; a.correct++; }
    else for (const o of a.selected) if (!q.correct.includes(o) && !rec.wrong.includes(o)) rec.wrong.push(o);
    ed.answers[q.id] = rec; a.lastCorrect = correct; a.phase = 'feedback'; return true; }
  function advance(ed) { const a = ed.active; if (!a) return false;
    if (a.phase === 'intro') a.phase = 'question';
    else if (a.phase === 'feedback') { if (a.index + 1 < a.questions.length) { a.index++; a.selected = []; a.phase = 'question'; } else { a.passed = a.correct >= R.passing; a.phase = 'result'; } }
    else return false; return true; }

  // ---------------- the report card ----------------
  const questionScore = (rec) => { const s = C.grading.attemptScore; return rec.firstCorrectAt ? s[Math.min(rec.firstCorrectAt, s.length) - 1] : 0; };
  function summary(ed) {
    if (!ed) return null; const c = course(ed.course), entries = Object.values(ed.answers);
    const share = (l) => (l.length ? l.reduce((n, q) => n + questionScore(q), 0) / l.length : 0), score = share(entries);
    return { course: c.title, points: ed.points, answered: entries.length, firstCorrect: entries.filter((q) => q.firstCorrect).length,
      retries: entries.reduce((n, q) => n + Math.max(0, q.attempts - 1), 0), reviveUsed: ed.reviveUsed, score,
      grade: entries.length ? C.grading.grades.find((g) => score >= g.min).name : C.grading.grades[C.grading.grades.length - 1].name,
      topics: c.topics.map((t, i) => { const l = entries.filter((q) => q.topic === i); return { name: t.name, asked: l.length, score: share(l), mistakes: l.reduce((n, q) => n + q.attempts - q.correct, 0) }; }) };
  }

  window.EDU = { C, R, course, question, testable, terminalQuestions, maze, generate, fresh, begin, select, submit, advance, summary, questionScore, mulberry };
})();
