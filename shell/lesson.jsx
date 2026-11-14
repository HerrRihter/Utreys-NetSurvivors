// A lesson in the style of Duolingo (docs/PLAN-SUPERAPP.md, stage 2, 2.1): a few questions from the learning core, a progress bar,
// three hearts (a wrong answer costs one), the right answer and the course's explanation after each check, and a summary at the end.
// MOCKUP: the questions come from LEARN.pick with an empty state and nothing is saved; mastery, xp and the streak come next.
// Keys: 1–9 pick an option, Enter checks and goes on. Touch: every target is at least 48 px high.
import { useSignal, useComputed } from '@preact/signals';
import { useEffect } from 'preact/hooks';

const COUNT = 6, HEARTS = 3, KINDS = ['single', 'multiple', 'true_false'];
const TF = [{ id: true, text: 'Верно' }, { id: false, text: 'Неверно' }];

const mulberry = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const optionsOf = (q) => (q.type === 'true_false' ? TF : q.options);
const isRight = (q, id) => (q.type === 'true_false' ? id === q.correct : q.correct.includes(id));
const answerOf = (q, picked) => (q.type === 'true_false' ? picked[0] : picked);
const rightText = (q) => optionsOf(q).filter((o) => isRight(q, o.id)).map((o) => o.text);
// the right answer is worth a line of its own only when the explanation does not already say it (it often is that very text)
const said = (q) => { const why = LEARN.norm(q.explanation || ''); return rightText(q).every((t) => why.includes(LEARN.norm(t).replace(/[.;]+$/, ''))); };

function fresh(course) {
  const rng = mulberry((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  const qs = LEARN.pick(LEARN.fresh(), { course, count: COUNT, kinds: KINDS, rng, today: LEARN.day() });
  return { course, items: qs.map((q) => LEARN.make(q, rng)), index: 0, hearts: HEARTS, picked: [], checked: null, results: [], over: false };
}

export function Lesson({ course }) {
  const s = useSignal(fresh(course));
  const set = (patch) => { s.value = { ...s.value, ...patch }; };
  const item = useComputed(() => s.value.items[s.value.index]);
  const c = LEARN.course(course);

  const pick = (id) => { const st = s.value, q = item.value; if (st.checked || st.over || !q) return;
    const picked = q.type === 'multiple' ? (st.picked.includes(id) ? st.picked.filter((x) => x !== id) : [...st.picked, id]) : [id];
    set({ picked }); };
  const check = () => { const st = s.value, q = item.value; if (st.checked || !st.picked.length) return;
    const r = LEARN.check(q, answerOf(q, st.picked));
    set({ checked: r, hearts: r.correct ? st.hearts : st.hearts - 1, results: [...st.results, { q, correct: r.correct }] });
    requestAnimationFrame(() => { const f = document.querySelector('.foot'); if (f) f.scrollIntoView({ block: 'end', behavior: 'smooth' }); }); };   // the verdict in view
  const next = () => { const st = s.value; if (!st.checked) return;
    if (st.hearts <= 0 || st.index + 1 >= st.items.length) set({ over: true, checked: null });
    else set({ index: st.index + 1, picked: [], checked: null });
    scrollTo({ top: 0 }); };
  const go = () => (s.value.checked ? next() : check());

  useEffect(() => {
    const onKey = (e) => { if (e.altKey || e.ctrlKey || e.metaKey) return; const q = item.value;
      if (e.key === 'Enter') { e.preventDefault(); if (!s.value.over) go(); return; }
      const n = Number(e.key); if (q && n >= 1 && n <= optionsOf(q).length) pick(optionsOf(q)[n - 1].id); };
    addEventListener('keydown', onKey); return () => removeEventListener('keydown', onKey);
  }, []);

  const st = s.value;
  if (!st.items.length) return <p class="fatal">В курсе нет вопросов для урока.</p>;
  if (st.over) return <Summary st={st} title={c.title} again={() => { s.value = fresh(course); }} />;

  const q = item.value, opts = optionsOf(q), r = st.checked;
  const stateOf = (id) => { if (!r) return st.picked.includes(id) ? 'picked' : ''; const sel = st.picked.includes(id), right = isRight(q, id);
    return sel && right ? 'right' : sel ? 'wrong' : right ? 'missed' : 'dim'; };
  const progress = (st.index + (r ? 1 : 0)) / st.items.length;

  return (
    <div class="lesson">
      <header class="bar">
        <a class="close" href="../index.html" aria-label="Выйти в игру">✕</a>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax={st.items.length} aria-valuenow={st.index + (r ? 1 : 0)}>
          <i style={{ width: `${Math.max(4, progress * 100)}%` }} />
        </div>
        <Hearts n={st.hearts} />
      </header>

      <main class={'card' + (r && !r.correct ? ' shake' : '')} key={st.index}>
        <div class="kicker">{c.title} · {c.topics[q.topic] ? c.topics[q.topic].name : ''}</div>
        <h1 class="q">{q.text}</h1>
        {q.type === 'multiple' && <p class="hint">Выберите все верные</p>}
        <ul class="opts" role="list">
          {opts.map((o, i) => (
            <li key={String(o.id)}>
              <button class={'opt ' + stateOf(o.id)} aria-pressed={st.picked.includes(o.id)} disabled={!!r} onClick={() => pick(o.id)}>
                <span class="key">{i + 1}</span><span class="txt">{o.text}</span>
              </button>
            </li>
          ))}
        </ul>
        <p class="mock">макет · прогресс пока не сохраняется</p>
      </main>

      <footer class={'foot' + (r ? (r.correct ? ' ok' : ' bad') : '')} aria-live="polite">
        {r && (
          <div class="verdict">
            <b>{r.correct ? 'Верно!' : 'Неверно'}</b>
            {!r.correct && !said(q) && <p class="answer">Правильный ответ: {rightText(q).join('; ')}</p>}
            {q.explanation && <p class="why">{q.explanation}</p>}
          </div>
        )}
        <button class="go" disabled={!r && !st.picked.length} onClick={go}>{r ? 'Дальше' : 'Проверить'}</button>
      </footer>
    </div>
  );
}

function Hearts({ n }) {
  return (
    <div class="hearts" aria-label={`Сердец: ${n} из ${HEARTS}`}>
      {Array.from({ length: HEARTS }, (_, i) => (
        <svg class={i < n ? 'on' : 'off'} viewBox="0 0 24 24" aria-hidden="true" key={i}>
          <path d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2.2 4.5 6 4.5c2.2 0 3.6 1.2 4.4 2.5h3.2c.8-1.3 2.2-2.5 4.4-2.5 3.8 0 5.6 3.9 4 7.2C19.5 16.4 12 21 12 21z" />
        </svg>
      ))}
    </div>
  );
}

function Summary({ st, title, again }) {
  const right = st.results.filter((x) => x.correct).length, xp = 10 + 2 * right, lost = st.hearts <= 0;
  return (
    <div class="summary">
      <div class="kicker">{title}</div>
      <h1>{lost ? 'Сердца закончились' : 'Урок пройден'}</h1>
      <div class="stats">
        <div><b>+{xp}</b><span>XP</span></div>
        <div><b>{right}/{st.results.length}</b><span>верно</span></div>
        <div><b>{st.hearts}</b><span>сердца</span></div>
      </div>
      <ul class="review" role="list">
        {st.results.map((x, i) => <li key={i} class={x.correct ? 'ok' : 'bad'}><span>{x.correct ? '✓' : '✗'}</span>{x.q.text}</li>)}
      </ul>
      <div class="actions">
        <button class="go" onClick={again}>Ещё урок</button>
        <a class="go ghost" href="../index.html">В игру</a>
      </div>
      <p class="mock">макет · XP и серия дней появятся на следующем шаге</p>
    </div>
  );
}
