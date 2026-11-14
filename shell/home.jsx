// The home screen (docs/PLAN-SUPERAPP.md, stage 2, 2.1): what the app opens on. For now: a lesson per course and the game.
// The streak, the goal of the day, «repeat (N)» and the codes come with the shared save (stage 2, step 2).
import { go, toGame, backHint, STATIC } from './nav.js';

// 1 задание, 3 задания, 27 заданий
const plural = (n, [one, few, many]) => { const t = n % 100, u = n % 10; return `${n} ${t > 10 && t < 20 ? many : u === 1 ? one : u >= 2 && u <= 4 ? few : many}`; };

export function Home() {
  document.title = 'NetSurvivors';
  const courses = LEARN.courses({ stubs: !STATIC }).map((id) => LEARN.course(id));
  return (
    <div class="home">
      <header class="brand">
        <div class="logo">UTREYS <span>//</span> NETSURVIVORS</div>
        <p>Учись короткими уроками — играй сменами в дата-центре.</p>
      </header>

      <section class="block" aria-labelledby="h-learn">
        <h2 id="h-learn">Уроки</h2>
        <ul class="tiles" role="list">
          {courses.map((c) => (
            <li key={c.id}>
              <button class="tile" onClick={() => go('/lesson/' + encodeURIComponent(c.id))}>
                <span class="tile-kicker">{c.stub ? 'заглушка · ' : ''}{plural(c.topics.length, ['тема', 'темы', 'тем'])} · {plural(c.questions.length, ['задание', 'задания', 'заданий'])}</span>
                <b>{c.title}</b>
                {c.description && <span class="tile-desc">{c.description}</span>}
                <span class="tile-go">Начать урок →</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section class="block" aria-labelledby="h-play">
        <h2 id="h-play">Игра</h2>
        <button class="tile play" onClick={toGame}>
          <span class="tile-kicker">survivors · дата-центр · учебный центр</span>
          <b>NetSurvivors</b>
          <span class="tile-desc">Смена в дата-центре: закрой компоненты, победи инцидент. В учебном центре — тесты у терминалов.</span>
          <span class="tile-go">Играть →</span>
        </button>
      </section>

      {backHint.value && <p class="toast" role="status">{backHint.value}</p>}
    </div>
  );
}
