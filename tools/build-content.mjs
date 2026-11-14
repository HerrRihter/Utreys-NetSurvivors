// Builds live/course.js (window.COURSE) from content/: the courses (content/courses/*.json, schema v2 of docs/DESIGN-LEARN-CORE.md),
// the grading (content/grading.json) and the training centre's rules, maze and rooms (content/edu-rules.json). content/ is the source;
// the courses came once from utreys-survivors/data/learning-*.js (14.11.2026) and are edited here since.
// Every question is checked against the schema first: any problem stops the build with the course, the question and what is wrong.
//   node tools/build-content.mjs            write live/course.js
//   node tools/build-content.mjs --check    only check (CI): fails if a problem is found or live/course.js is out of date
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'content'), out = path.join(root, 'live', 'course.js');
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const index = read('index.json'), grading = read('grading.json'), { rules, maze, rooms } = read('edu-rules.json');
const files = fs.readdirSync(path.join(dir, 'courses')).filter((f) => f.endsWith('.json')).sort();
const courses = Object.fromEntries(files.map((f) => { const c = read('courses/' + f); return [c.id, c]; }));

// ---------------- the schema ----------------
const problems = [];
const TYPES = ['single', 'multiple', 'true_false', 'image_choice', 'order', 'pairs', 'gap', 'hotspot', 'case', 'template'];
const GENERATORS = ['chart'];
const str = (v) => typeof v === 'string' && v.trim().length > 0;
const ids = (list) => Array.isArray(list) && list.length > 0 && list.every((x) => x && str(x.id)) && new Set(list.map((x) => x.id)).size === list.length;
const image = (v) => v && str(v.src) && str(v.alt) && fs.existsSync(path.join(root, 'live', v.src));
const rect = (r) => Array.isArray(r) && r.length === 4 && r.every((n) => typeof n === 'number' && n >= 0 && n <= 1) && r[0] + r[2] <= 1 && r[1] + r[3] <= 1 && r[2] > 0 && r[3] > 0;

// one question (or one step of a case): returns its problems as strings
function question(q, c, step) {
  const p = [], is = (cond, msg) => { if (!cond) p.push(msg); };
  is(str(q.id), 'no id'); is(TYPES.includes(q.type) && !(step && q.type === 'case'), 'unknown type ' + q.type);
  if (!step) is(Number.isInteger(q.topic) && q.topic >= 0 && q.topic < c.topics.length, 'topic out of range');
  if (q.type !== 'case') is(str(q.text) || q.type === 'template', 'no text');
  if (q.type !== 'case' && q.type !== 'template') is(str(q.explanation), 'no explanation');
  if (q.image !== undefined) is(image(q.image), 'image needs src (a file under live/) and alt');
  if (q.level !== undefined) is([1, 2, 3].includes(q.level), 'level is 1, 2 or 3');
  const choice = () => { is(ids(q.options) && q.options.length >= 2 && q.options.every((o) => str(o.text) || image(o.image)), 'options: 2+ with unique ids and text or image');
    is(Array.isArray(q.correct) && q.correct.length >= 1 && q.correct.every((id) => (q.options || []).some((o) => o.id === id)), 'correct must name options'); };
  switch (q.type) {
    case 'single': choice(); is(q.correct && q.correct.length === 1, 'single has one correct option'); break;
    case 'multiple': choice(); break;
    case 'image_choice': choice(); is((q.options || []).every((o) => image(o.image)), 'every option needs an image'); is(q.correct && q.correct.length === 1, 'one correct option'); break;
    case 'true_false': is(typeof q.correct === 'boolean', 'correct is true or false'); break;
    case 'order': is(ids(q.items) && q.items.length >= 3, 'items: 3+ with unique ids'); is(Array.isArray(q.correct) && q.correct.length === (q.items || []).length && new Set(q.correct).size === q.correct.length && q.correct.every((id) => q.items.some((x) => x.id === id)), 'correct lists every item once'); break;
    case 'pairs': is(ids(q.left) && ids(q.right) && q.left.length >= 2, 'left and right: 2+ with unique ids');
      is(Array.isArray(q.correct) && q.correct.length === (q.left || []).length && q.correct.every((pr) => Array.isArray(pr) && q.left.some((x) => x.id === pr[0]) && q.right.some((x) => x.id === pr[1])) && new Set(q.correct.map((pr) => pr[0])).size === q.correct.length, 'correct pairs every left item with a right one'); break;
    case 'gap': is(str(q.text) && q.text.includes('___'), 'text marks the gap with ___'); is(Array.isArray(q.accept) && q.accept.length >= 1 && q.accept.every(str), 'accept lists the right answers'); break;
    case 'hotspot': is(image(q.image), 'hotspot needs an image'); is(ids(q.areas) && q.areas.every((a) => rect(a.rect)), 'areas: unique ids, rect [x, y, w, h] in 0..1');
      is(Array.isArray(q.correct) && q.correct.length >= 1 && q.correct.every((id) => (q.areas || []).some((a) => a.id === id)), 'correct must name areas'); break;
    case 'case': is(str(q.text), 'case needs an intro text'); is(Array.isArray(q.steps) && q.steps.length >= 2, 'case needs 2+ steps');
      (q.steps || []).forEach((s, i) => question(s, c, true).forEach((m) => p.push(`step ${i + 1}: ${m}`)));
      is(new Set((q.steps || []).map((s) => s.id)).size === (q.steps || []).length, 'step ids unique'); break;
    case 'template': is(GENERATORS.includes(q.gen), 'gen is one of ' + GENERATORS.join(', ')); is(q.params && typeof q.params === 'object', 'params is an object'); break;
  }
  return p;
}

for (const [id, c] of Object.entries(courses)) {
  const at = (m) => problems.push(`${id}: ${m}`);
  if (!str(c.title)) at('no title'); if (!Array.isArray(c.topics) || !c.topics.length || !c.topics.every((t) => str(t.name))) at('topics need names');
  if (!Array.isArray(c.questions) || !c.questions.length) { at('no questions'); continue; }
  const seen = new Set();
  for (const q of c.questions) { if (seen.has(q.id)) at(`${q.id}: duplicate id`); seen.add(q.id); question(q, c).forEach((m) => at(`${q.id || '?'}: ${m}`)); }
  if (index.order.includes(id)) {                                  // a training centre course: its rooms, and terminals that ask single / multiple
    if (!Array.isArray(c.rooms) || c.rooms.length !== rooms.filter((r) => r.maze).length || !c.boss || !str(c.victoryTag)) at('a training centre course needs rooms (a name per maze room), boss and victoryTag');
    if (c.stub) at('a stub course cannot be in order');
    const game = c.questions.filter((q) => ['single', 'multiple'].includes(q.type));
    c.topics.forEach((t, i) => { const n = game.filter((q) => q.topic === i).length; if (n < 3 * rules.questions) at(`topic «${t.name}»: ${n} questions the game can ask, the terminals need ${3 * rules.questions}`); });
  }
}
for (const id of index.order) if (!courses[id]) problems.push(`index.json: no course ${id}`);
if (problems.length) { console.error(problems.map((m) => '  ' + m).join('\n') + `\n${problems.length} problem(s) in content/`); process.exit(1); }

// ---------------- the output ----------------
const COURSE = { source: 'content/ (tools/build-content.mjs)', order: index.order, courses, rules, grading, maze, rooms };
const text = '// live/course.js: GENERATED by tools/build-content.mjs from content/ — do not edit, change content/ and rerun the tool.\n' +
  'window.COURSE = ' + JSON.stringify(COURSE) + ';\n';
const summary = Object.values(courses).map((c) => `${c.id}: ${c.questions.length}${c.stub ? ' (stub)' : ''}`).join(', ');
if (process.argv.includes('--check')) {
  const now = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  if (now !== text) { console.error('live/course.js is out of date: run node tools/build-content.mjs'); process.exit(1); }
  console.log('content ok —', summary);
} else { fs.writeFileSync(out, text); console.log('wrote live/course.js —', summary); }
