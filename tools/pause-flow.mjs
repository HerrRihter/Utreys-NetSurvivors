// Pause, keeping a shift and the music after a restart, in a real browser with real keys:
// Esc → the pause menu, the game stands still → «Выйти в меню» → «Продолжить смену» from the same moment → a page reload keeps it →
// a new start ends the kept shift (codes banked) → a defeat, Space → the battle music plays again.
const { chromium } = await import('file:///' + process.env.PLAYWRIGHT.replace(/\\/g, '/') + '/index.mjs');
const fs = await import('node:fs'); fs.mkdirSync('frames/pause', { recursive: true });
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const pg = await b.newPage({ viewport: { width: 1600, height: 900 } });
const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
const url = 'http://localhost:8931/live/index.html', ready = () => pg.waitForFunction(() => window.META && window.SCENE && window.__dev, null, { timeout: 60000 });
const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await pg.keyboard.press(k); await pg.waitForTimeout(250); } };
const st = () => pg.evaluate(() => { const p = __dev.play; return { play: !!p, t: p ? +p.t.toFixed(2) : null, pause: META.PAUSE.isOpen, scr: META.view().scr, kept: META.suspended, codes: META.data.codes, music: window.AUDIO && AUDIO.music }; });
const out = {};
await pg.goto(url); await ready(); await pg.evaluate(() => { localStorage.removeItem('ns_suspended_v1'); META.reset(); });
await pg.mouse.click(800, 450); await key('Enter', 3); await pg.waitForTimeout(3000);           // menu → hero → map → shift
out.started = await st();
await key('Escape'); const p1 = await st(); await pg.waitForTimeout(1500); const p2 = await st(); out.pause = { open: p1.pause, standsStill: p1.t === p2.t };
await pg.screenshot({ path: 'frames/pause/1_pause.png' });
await key('ArrowDown', 5); await key('Enter'); out.toMenu = await st();                        // «Выйти в меню»
await pg.screenshot({ path: 'frames/pause/2_menu_resume.png' });
await pg.reload(); await ready(); await pg.waitForTimeout(800); out.afterReload = await st();
await key('Enter'); await pg.waitForTimeout(800); out.resumed = await st();                      // «Продолжить смену» is the first item
await key('Escape'); await key('ArrowDown', 6); await key('Enter'); out.ended = await st();      // «Завершить смену»: codes banked
// a defeat, then Space: the music comes back
await key('Enter', 3); await pg.waitForTimeout(1500);
await pg.evaluate(() => { const S = __dev.play; S.hp = 0.01; S.iT = -99; S.graceT = 0; for (let i = 0; i < 8; i++) { const e = SIM.mkFoe(S, 'node', S.x + 30, S.y + 5); e.nextAtk = 0; } });
await pg.waitForFunction(() => __dev.play && __dev.play.over, null, { timeout: 20000 }); await pg.waitForTimeout(2500); out.defeat = await st();
await key('Space'); await pg.waitForTimeout(3000); out.restarted = await st();
console.log(JSON.stringify(out, null, 1)); console.log('errors', errs.slice(0, 3)); await b.close();
