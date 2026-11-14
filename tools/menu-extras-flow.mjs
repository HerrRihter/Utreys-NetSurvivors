// Stage 1 of docs/PLAN-FEEDBACK-27-10.md in a real browser: the pause menu's «Следующий трек» and «Повтор трека», the refusal
// sound (not enough codes), and «На главную» (the last item: one press leads to the app's home, the shell; it replaced «Выход» and
// its «the game is closed» screen, docs/PLAN-SUPERAPP.md, stage 2).
const { chromium } = await import(process.env.PLAYWRIGHT ? 'file:///' + process.env.PLAYWRIGHT.replace(/\\/g, '/') + '/index.mjs' : 'playwright');
const fs = await import('node:fs'); fs.mkdirSync('frames/extras', { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const pg = await b.newPage({ viewport: { width: 1600, height: 900 } });
const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await pg.keyboard.press(k); await pg.waitForTimeout(250); } };
const out = {};
await pg.goto('http://localhost:8931/live/index.html'); await pg.waitForFunction(() => window.META && window.SCENE && window.__dev && window.AUDIO, null, { timeout: 60000 });
await pg.evaluate(() => { localStorage.removeItem('ns_suspended_v1'); META.reset(); Object.assign(AUDIO.pref, { track: '', repeat: false });
  window.__fx = []; const f = AUDIO.effect; AUDIO.effect = (n, ...r) => { __fx.push(n); return f(n, ...r); }; });
await pg.mouse.click(800, 450); await pg.waitForTimeout(300);
// the refusal: the shop's first upgrade with no codes
await pg.evaluate(() => { META.data.codes = 0; META.go('shop', true); __fx.length = 0; }); await key('ArrowDown'); await key('Enter');
out.refusal = await pg.evaluate(() => __fx.slice());
await key('Escape');
// a shift, then the pause menu: next track, repeat
await key('Enter', 3); await pg.waitForTimeout(2500);
await key('Escape'); out.before = await pg.evaluate(() => ({ track: AUDIO.current.title, music: AUDIO.music && AUDIO.music.name }));
await key('ArrowDown'); await key('Enter'); await pg.waitForTimeout(1500);
out.next = await pg.evaluate(() => ({ track: AUDIO.current.title, music: AUDIO.music && AUDIO.music.name, paused: AUDIO.music && AUDIO.music.paused, items: META.PAUSE.view().items.map((o) => o.s) }));
await key('ArrowDown'); await key('Enter'); out.repeat = await pg.evaluate(() => ({ pref: AUDIO.pref.repeat }));
await pg.screenshot({ path: 'frames/extras/1_pause_music.png' });
await key('ArrowDown'); await key('Enter'); await key('ArrowUp', 3); await key('Enter');            // repeat off again, then «Продолжить»
// back to the menu: «На главную» (last) leads to the shell with one press
await key('Escape'); await key('ArrowDown', 5); await key('Enter'); await pg.waitForTimeout(500);
await key('ArrowUp', 2);                                                                          // from «Продолжить смену» (first) up to «На главную» (last)
out.sel = await pg.evaluate(() => ({ id: META.view().items[META.view().sel].id, s: META.view().items[META.view().sel].s }));
await pg.screenshot({ path: 'frames/extras/2_home_item.png' });
await Promise.all([pg.waitForURL(/\/live\/shell\/index\.html/, { timeout: 15000 }), key('Enter')]);
await pg.waitForFunction(() => document.querySelector('.home'), null, { timeout: 15000 });
out.home = await pg.evaluate(() => ({ url: location.pathname, tiles: document.querySelectorAll('.tile').length }));
await pg.screenshot({ path: 'frames/extras/3_home.png' });
const checks = [
  ['the refusal plays its own sound', out.refusal.includes('deny') && !out.refusal.includes('hurt')],
  ['«Следующий трек» changes the track', out.next.track !== out.before.track && out.next.music !== out.before.music],
  ['the music plays (quieter) in the pause menu', out.next.paused === false],
  ['«Повтор трека» switches', out.repeat.pref === true],
  ['«На главную» is reached from the top of the menu', out.sel.id === 'quit' && out.sel.s === 'На главную'],
  ['one press leads to the app\'s home (the shell)', out.home.url === '/live/shell/index.html' && out.home.tiles >= 3],
];
for (const [s, c] of checks) console.log((c ? 'ok   ' : 'FAIL ') + s);
console.log(JSON.stringify(out)); console.log('errors:', errs.length ? errs : 'none');
await b.close(); process.exitCode = checks.every((c) => c[1]) && !errs.length ? 0 : 1;
