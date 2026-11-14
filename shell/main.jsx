// The shell's entry (docs/PLAN-SUPERAPP.md, stage 2): the app opens here. Screens by hash route (shell/nav.js): the home and a lesson.
// The game is a page of its own (nav.js GAME_URL).
import { render } from 'preact';
import { route } from './nav.js';
import { Home } from './home.jsx';
import { Lesson } from './lesson.jsx';
import './style.css';

function App() {
  const r = route.value;
  if (r.name === 'lesson' && LEARN.course(r.course)) return <Lesson course={r.course} key={r.course} />;
  return <Home />;
}

render(window.LEARN ? <App /> : <p class="fatal">Не загрузилось ядро обучения (learn/core.js).</p>, document.getElementById('app'));
