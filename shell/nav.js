// Where things are and how to move between them. The app opens on the shell; the game is a page of its own.
//   development (tools/serve.py): the shell is live/shell/index.html, the game live/index.html (the game's tools expect it there)
//   the site and the APK (tools/pages-build.cjs, which sets window.__STATIC__): the shell is index.html, the game game.html
// Screens of the shell are hash routes, so the browser's and Android's «Back» move between them: #/ the home, #/lesson/<course>.
import { signal } from '@preact/signals';

export const STATIC = !!window.__STATIC__;
export const GAME_URL = STATIC ? 'game.html' : '../index.html';

const parse = () => { const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return p[0] === 'lesson' && p[1] ? { name: 'lesson', course: p[1] } : { name: 'home' }; };
export const route = signal(parse());
addEventListener('hashchange', () => { route.value = parse(); scrollTo({ top: 0 }); });
export const go = (hash) => { location.hash = hash; };
export const toGame = () => { location.href = GAME_URL; };

// Android «Back» (Capacitor's App plugin, present only in the APK): a screen goes back to the home; on the home, a second press
// within 2 s closes the app
const App = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App;
export const backHint = signal('');
if (App && App.addListener) { let backT = 0;
  App.addListener('backButton', () => {
    if (route.value.name !== 'home') { history.back(); return; }
    if (performance.now() - backT < 2000) { App.exitApp(); return; }
    backT = performance.now(); backHint.value = 'Нажмите «Назад» ещё раз, чтобы выйти'; setTimeout(() => { backHint.value = ''; }, 2000); }); }
