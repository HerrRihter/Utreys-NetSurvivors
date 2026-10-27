// Stage 1 of docs/PLAN-FEEDBACK-27-10.md in a real browser: the pause menu's «Следующий трек» and «Повтор трека», the refusal
// sound (not enough codes), and «Выход» (asks once more, then the game stops and says the tab can be closed; «Вернуться» resumes).
const { chromium } = await import('file:///' + process.env.PLAYWRIGHT.replace(/\\/g, '/') + '/index.mjs');
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
// back to the menu: «Выход» asks once more, then the page stops
await key('Escape'); await key('ArrowDown', 5); await key('Enter'); await pg.waitForTimeout(500);
await key('ArrowUp', 2);                                                                          // from «Продолжить смену» (first) up to «Выход» (last)
out.sel = await pg.evaluate(() => META.view().items[META.view().sel].id);
await key('Enter'); out.armed = await pg.evaluate(() => ({ s: META.view().items[META.view().sel].s, bye: getComputedStyle(document.getElementById('bye')).display }));
await pg.screenshot({ path: 'frames/extras/2_quit_armed.png' });
await key('Enter'); await pg.waitForTimeout(600);
out.gone = await pg.evaluate(() => ({ bye: getComputedStyle(document.getElementById('bye')).display, halted: AUDIO.halted, music: AUDIO.music && AUDIO.music.paused }));
await pg.screenshot({ path: 'frames/extras/3_bye.png' });
await pg.click('#bye-back'); await pg.waitForTimeout(600);
out.back = await pg.evaluate(() => ({ bye: getComputedStyle(document.getElementById('bye')).display, halted: AUDIO.halted, scr: META.view().scr }));
const checks = [
  ['the refusal plays its own sound', out.refusal.includes('deny') && !out.refusal.includes('hurt')],
  ['«Следующий трек» changes the track', out.next.track !== out.before.track && out.next.music !== out.before.music],
  ['the music plays (quieter) in the pause menu', out.next.paused === false],
  ['«Повтор трека» switches', out.repeat.pref === true],
  ['«Выход» is reached from the top of the menu', out.sel === 'quit'],
  ['«Выход» asks once more', /ещё раз/.test(out.armed.s) && out.armed.bye === 'none'],
  ['the second press stops the game', out.gone.bye === 'flex' && out.gone.halted === true],
  ['«Вернуться в игру» resumes', out.back.bye === 'none' && out.back.halted === false && out.back.scr === 'main'],
];
for (const [s, c] of checks) console.log((c ? 'ok   ' : 'FAIL ') + s);
console.log(JSON.stringify(out)); console.log('errors:', errs.length ? errs : 'none');
await b.close(); process.exitCode = checks.every((c) => c[1]) && !errs.length ? 0 : 1;
