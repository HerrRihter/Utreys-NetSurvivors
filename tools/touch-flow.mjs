// Stage 7a of docs/PLAN-FEEDBACK-27-10.md in a real browser with touch emulation: a landscape phone (844×390) goes through the
// menus by taps, moves with the floating stick, casts E, pauses and resumes, ends the shift and taps «В меню»; a portrait phone is
// asked to turn; a tablet (1024×768) starts a shift too. Screenshots in frames/touch/.
//   PLAYWRIGHT=<path to playwright> node tools/touch-flow.mjs   (the game served on :8931)
const { chromium } = await import('file:///' + process.env.PLAYWRIGHT.replace(/\\/g, '/') + '/index.mjs');
const fs = await import('node:fs'); fs.mkdirSync('frames/touch', { recursive: true });
const b = await chromium.launch(), url = 'http://localhost:8931/live/index.html', out = {}, errs = [];
async function device(w, h, name) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }), pg = await ctx.newPage();
  pg.on('pageerror', (e) => errs.push(name + ': ' + String(e))); await pg.goto(url); await pg.waitForFunction(() => window.META && window.SCENE && window.__dev, null, { timeout: 90000 });
  await pg.evaluate(() => { localStorage.removeItem('ns_suspended_v1'); META.reset(); });
  const cdp = await ctx.newCDPSession(pg);
  // view px → page px; touches through CDP (start / move / end), so the page sees pointerType 'touch'
  const at = (x, y) => pg.evaluate(([x, y]) => { const r = document.getElementById('c').getBoundingClientRect(); return [r.left + x / 1920 * r.width, r.top + y / 1080 * r.height]; }, [x, y]);
  const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
  const tap = async (x, y) => { const p = await at(x, y); await touch('touchStart', [p]); await pg.waitForTimeout(60); await touch('touchEnd', []); await pg.waitForTimeout(300); };
  // a menu item's centre in view px (META lays out in its logical space: × U at the compact scale)
  const item = (id) => pg.evaluate((id) => { const V = META.view(), o = V.items.find((q) => q.id === id || q.hero === id); return o && [(o.r[0] + o.r[2] / 2) * V.U, (o.r[1] + o.r[3] / 2) * V.U]; }, id);
  return { ctx, pg, at, touch, tap, item };
}
// ---- the phone, landscape ----
const P = await device(844, 390, 'phone');
out.phoneU = await P.pg.evaluate(() => META.view().U);
await P.tap(...(await P.item('start'))); out.hero = await P.pg.evaluate(() => META.view().scr);
await P.tap(...(await P.item('utrace'))); out.map = await P.pg.evaluate(() => META.view().scr);
await P.tap(...(await P.item('dc'))); await P.pg.waitForTimeout(1500);
out.started = await P.pg.evaluate(() => !!__dev.play && TOUCH.on);
await P.pg.evaluate(() => { const S = __dev.play; S.nextSwarm = 1e9; S.iT = 1e9; });
// the stick: hold on the left half and drag right for a second
const x0 = await P.pg.evaluate(() => __dev.play.x), s0 = await P.at(400, 700), s1 = await P.at(520, 700);
await P.touch('touchStart', [s0]); await P.pg.waitForTimeout(100); await P.touch('touchMove', [s1]); await P.pg.waitForTimeout(1200);
await P.pg.screenshot({ path: 'frames/touch/1_phone_stick.png' });
out.moved = await P.pg.evaluate((x0) => Math.round(__dev.play.x - x0), x0); out.stickShown = await P.pg.evaluate(() => !!TOUCH.stick);
await P.touch('touchEnd', []); await P.pg.waitForTimeout(200); out.released = await P.pg.evaluate(() => !TOUCH.stick);
out.autoAim = await P.pg.evaluate(() => { const S = __dev.play, e = SIM.mkFoe(S, 'node', S.x - 300, S.y); e.hp = e.mhp = 1e6; return true; }); await P.pg.waitForTimeout(800);
out.aimedLeft = await P.pg.evaluate(() => __dev.play.px + __dev.play.cam[0] < __dev.play.x);
// E and the pause
const use = await P.pg.evaluate(() => TOUCH.use); await P.tap(use[0], use[1]); out.cast = await P.pg.evaluate(() => __dev.play.ab.cd > 0);
const pz = await P.pg.evaluate(() => TOUCH.pause); await P.tap(pz[0], pz[1]); out.paused = await P.pg.evaluate(() => META.PAUSE.isOpen);
await P.pg.screenshot({ path: 'frames/touch/2_phone_pause.png' });
const res = await P.pg.evaluate(() => { const o = META.PAUSE.view().items[0], U = META.view().U; return [(o.r[0] + o.r[2] / 2) * U, (o.r[1] + o.r[3] / 2) * U]; }); await P.tap(...res);
out.resumed = await P.pg.evaluate(() => !META.PAUSE.isOpen && !!__dev.play);
// the compact level-up cards: a tap on the second card picks it (the page maps it onto the sim's card)
await P.pg.evaluate(() => { const S = __dev.play; S.pick = { t0: S.t - 1, opts: [{ k: 'w', id: 'orbit' }, { k: 'p', id: 'magnet' }, { k: 'w', id: 'cache' }] }; }); await P.pg.waitForTimeout(500);
await P.pg.screenshot({ path: 'frames/touch/2b_phone_cards.png' });
const cards = await P.pg.evaluate(() => SCENE.hits.map((h) => h[0])); await P.tap(cards[1][0] + cards[1][2] / 2, cards[1][1] + cards[1][3] / 2);
out.picked = await P.pg.evaluate(() => ({ pick: !!__dev.play.pick, magnet: __dev.play.ps.magnet || 0 }));
// the end of the shift: «В меню»
await P.pg.evaluate(() => { const S = __dev.play; S.over = { k: 'dead', t: S.t }; }); await P.pg.waitForTimeout(1800);
await P.pg.screenshot({ path: 'frames/touch/3_phone_results.png' });
const mn = await P.pg.evaluate(() => TOUCH.menu); await P.tap(mn[0] + mn[2] / 2, mn[1] + mn[3] / 2);
out.toMenu = await P.pg.evaluate(() => !__dev.play && META.view().scr === 'main');
// a tap that just misses a button still presses it (the shop, from the main menu)
const shop = await P.pg.evaluate(() => { const V = META.view(), o = V.items.find((q) => q.id === 'shop'); return [(o.r[0] + o.r[2] + 9) * V.U, (o.r[1] + o.r[3] / 2) * V.U]; });
await P.tap(...shop); out.nearMiss = await P.pg.evaluate(() => META.view().scr);
await P.pg.screenshot({ path: 'frames/touch/4_phone_shop.png' });
// compact scrolling: the skins tab, a finger drag up scrolls the cards; a tap then picks the card under the finger
await P.tap(...(await P.item('tab_skin'))); const sc0 = await P.pg.evaluate(() => META.view().scrollArea[3]);
const d0 = await P.at(900, 900), d1 = await P.at(900, 500); await P.touch('touchStart', [d0]); for (let k = 1; k <= 8; k++) { const y = d0[1] + (d1[1] - d0[1]) * k / 8; await P.touch('touchMove', [[d0[0], y]]); await P.pg.waitForTimeout(30); } await P.touch('touchEnd', []); await P.pg.waitForTimeout(300);
out.scrolled = await P.pg.evaluate((s0) => ({ v: META.view().scrollArea[3], s0, scr: META.view().scr }), sc0);
await P.pg.screenshot({ path: 'frames/touch/4b_phone_skins_scrolled.png' });
const vis = await P.pg.evaluate(() => { const V = META.view(), o = V.items.find((q) => q.skin && !q.off && q.r[1] > V.scrollArea[0] + 10); return o && { id: o.skin, c: [(o.r[0] + 30) * V.U, (o.r[1] + 30) * V.U] }; });
await P.pg.evaluate(() => { META.data.codes = 9999; }); await P.tap(...vis.c); out.tapAfterScroll = await P.pg.evaluate((k) => ({ k, sel: META.view().items[META.view().sel].skin }), vis.id);
await P.ctx.close();
// ---- the phone in the training centre: a terminal's test by taps on the compact layout ----
const E = await device(844, 390, 'edu');
await E.pg.evaluate(() => { __dev.play = SIM.spawn(5, META.mods(), Object.assign(META.runOpts(), { map: 'edu', course: COURSE.order[0] })); const S = __dev.play, tm = SIM.LEVEL.TERMS[0];
  S.iT = 1e9; S.nextSwarm = 1e9; for (const e of S.E) e.hp = e.mhp = 1e9; S.nodes[0].st = 1; S.nodes[0].retry = 0; S.x = tm.x; S.y = tm.y; });
await E.pg.keyboard.press('KeyE'); await E.pg.waitForTimeout(500); out.quizOpen = await E.pg.evaluate(() => !!(__dev.play.ed.active && __dev.play.ed.active.phase === 'intro'));
const hits = async () => E.pg.evaluate(() => SCENE.hits.map((h) => h[0])), tapR = async (r) => E.tap(r[0] + r[2] / 2, r[1] + r[3] / 2);
await tapR((await hits())[0]); await E.pg.waitForTimeout(300); out.quizQ = await E.pg.evaluate(() => __dev.play.ed.active.phase);
await E.pg.screenshot({ path: 'frames/touch/5b_phone_quiz.png' });
let h = await hits(); await tapR(h[0]); await E.pg.waitForTimeout(250); h = await hits(); await tapR(h[h.length - 1]); await E.pg.waitForTimeout(400);
out.quizAnswered = await E.pg.evaluate(() => ({ phase: __dev.play.ed.active.phase, answered: __dev.play.ed.active.answered }));
await E.pg.screenshot({ path: 'frames/touch/5c_phone_quiz_feedback.png' }); await E.ctx.close();
// ---- the phone, portrait: asked to turn ----
const Q = await device(390, 844, 'portrait'); out.turn = await Q.pg.evaluate(() => getComputedStyle(document.getElementById('turn')).display);
await Q.pg.screenshot({ path: 'frames/touch/5_portrait.png' }); await Q.ctx.close();
// ---- the tablet ----
const T = await device(1024, 768, 'tablet'); out.tabletU = await T.pg.evaluate(() => META.view().U); await T.tap(...(await T.item('start'))); await T.tap(...(await T.item('utrace'))); await T.tap(...(await T.item('dc'))); await T.pg.waitForTimeout(1500);
const t0 = await T.at(400, 700), t1 = await T.at(400, 560); await T.touch('touchStart', [t0]); await T.pg.waitForTimeout(100); await T.touch('touchMove', [t1]); await T.pg.waitForTimeout(800);
out.tablet = await T.pg.evaluate(() => ({ play: !!__dev.play, stick: !!TOUCH.stick })); await T.pg.screenshot({ path: 'frames/touch/6_tablet.png' }); await T.touch('touchEnd', []); await T.ctx.close();

const checks = [
  ['the phone and the tablet use the compact interface', out.phoneU === 2 && out.tabletU === 2],
  ['taps go through the menus (hero, map)', out.hero === 'hero' && out.map === 'map'],
  ['a tap on the map starts a shift in touch mode', out.started],
  ['the stick moves the hero', out.moved > 120 && out.stickShown && out.released],
  ['aim goes to the nearest foe by itself', out.aimedLeft],
  ['«E» casts the ability', out.cast],
  ['the pause button pauses, «Продолжить» resumes', out.paused && out.resumed],
  ['a tap on a compact level-up card picks it', !out.picked.pick && out.picked.magnet === 1],
  ['«В меню» on the results goes to the main menu', out.toMenu],
  ['a tap just past a button presses it', out.nearMiss === 'shop'],
  ['a finger drag scrolls the skins', out.scrolled.scr === 'shop' && out.scrolled.v > out.scrolled.s0],
  ['a tap after scrolling picks the card under the finger', out.tapAfterScroll.sel === out.tapAfterScroll.k],
  ['a terminal test opens, «Начать» and an answer are taps', out.quizOpen && out.quizQ === 'question' && out.quizAnswered.answered === 1 && out.quizAnswered.phase === 'feedback'],
  ['a portrait phone is asked to turn', out.turn === 'flex'],
  ['the tablet starts a shift and shows the stick', out.tablet.play && out.tablet.stick],
];
for (const [s, c] of checks) console.log((c ? 'ok   ' : 'FAIL ') + s);
console.log(JSON.stringify(out)); console.log('errors:', errs.length ? errs : 'none');
await b.close(); process.exitCode = checks.every((c) => c[1]) && !errs.length ? 0 : 1;
