// The shell's entry (docs/PLAN-SUPERAPP.md, stage 2). For now one screen: a lesson in the style of the game (a mockup: nothing is
// saved yet). ?course=<id> picks the course, the training centre's first one by default.
import { render } from 'preact';
import { Lesson } from './lesson.jsx';
import './style.css';

const params = new URLSearchParams(location.search);
const course = window.LEARN && LEARN.course(params.get('course')) ? params.get('course') : window.COURSE && COURSE.order[0];

render(window.LEARN ? <Lesson course={course} /> : <p class="fatal">Не загрузилось ядро обучения (learn/core.js).</p>, document.getElementById('app'));
