// The achievements in a real browser: a fresh save, a shift that meets several goals ends in defeat → the results list the new
// achievements, waiting to be claimed; a reload keeps them (save v4); «Забрать всё» on the achievements screen pays them once.
//   PLAYWRIGHT=<path to playwright> node tools/ach-flow.mjs   (the game served on :8931)
const { chromium } = await import('file:///' + process.env.PLAYWRIGHT.replace(/\\/g, '/') + '/index.mjs');
const fs = await import('node:fs'); fs.mkdirSync('frames/ach', { recursive: true });
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1600, height: 900 } });
const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
const url = 'http://localhost:8931/live/index.html', ready = () => pg.waitForFunction(() => window.META && window.SCENE && window.__dev, null, { timeout: 60000 });
const key = async (k, n = 1) => { for (let i = 0; i < n; i++) { await pg.keyboard.press(k); await pg.waitForTimeout(250); } };
const out = {};
await pg.goto(url); await ready(); await pg.evaluate(() => { localStorage.clear(); }); await pg.reload(); await ready();
await pg.mouse.click(800, 450); await key('Enter', 3); await pg.waitForTimeout(2000);            // menu → hero → map → shift
// a shift that has run 3:20, closed a boss, cast E 11 times, evolved once, then the hero falls
await pg.evaluate(() => { const S = __dev.play; Object.assign(S, { t: 200, kills: 150, lvl: 12, hurtT: 20 }); S.fx = { foe: { node: 150 }, boss: 1, cast: 11, heal: 2, evo: 1, calm: 50 };
  S.hp = 0.01; S.iT = -99; S.graceT = 0; for (let i = 0; i < 8; i++) { const e = SIM.mkFoe(S, 'node', S.x + 30, S.y + 5); e.nextAtk = 0; } });
await pg.waitForFunction(() => __dev.play && __dev.play.over, null, { timeout: 20000 }); await pg.waitForTimeout(2500);
out.results = await pg.evaluate(() => ({ ach: META.last.ach.map((x) => x.title + ' +' + x.reward), codes: META.data.codes, earned: META.last.earned }));
await pg.screenshot({ path: 'frames/ach/1_results.png' });
await pg.reload(); await ready(); await pg.waitForTimeout(500);
out.reload = await pg.evaluate(() => ({ v: META.data.v, waiting: Object.keys(META.data.done).length, claimed: Object.keys(META.data.ach).length, codes: META.data.codes, again: META.achOnLoad.length }));
// the menu marks the achievements line; the screen claims them
out.menuLine = await pg.evaluate(() => META.view().items.find((o) => o.id === 'ach').s);
await pg.evaluate(() => { META.go('ach', true); META.acat('survival'); }); await pg.waitForTimeout(500); await pg.screenshot({ path: 'frames/ach/1b_waiting.png' });
out.claim = await pg.evaluate(() => { const c0 = META.data.codes, n = META.claimAll(); return { n, paid: META.data.codes - c0, left: Object.keys(META.data.done).length }; });
await pg.waitForTimeout(400); await pg.screenshot({ path: 'frames/ach/1c_claimed.png' });
await pg.evaluate(() => META.go('main', true));
// a goal met in the middle of a shift: a toast within a second or two, nothing paid until the shift is banked
await key('Enter', 3); await pg.waitForTimeout(1500);
const codes0 = await pg.evaluate(() => META.data.codes);
await pg.evaluate(() => { const S = __dev.play; S.fx.cast = 50; });
await pg.waitForFunction(() => __dev.play.toast && /ДОСТИЖЕНИЕ/.test(__dev.play.toast.s), null, { timeout: 5000 }).catch(() => {});
out.toast = await pg.evaluate((c0) => ({ s: __dev.play.toast && __dev.play.toast.s, paidEarly: META.data.codes !== c0 }), codes0);
await pg.screenshot({ path: 'frames/ach/2_toast.png' });
// the enemy list: the foes beaten so far are open, the selected one shows its card
await pg.evaluate(() => { const D = META.data; D.st.foes.node = 140; D.st.foes.crpt = 2; __dev.play = null; SCENE.state = null; META.go('coll', true); META.ctab('foes'); });
await pg.waitForTimeout(400); const crpt = await pg.evaluate(() => { const it = META.view().items, o = it.find((x) => x.k === 'crpt'); return [o.r[0] + 40, o.r[1] + 40]; });
const s = await pg.evaluate(() => [innerWidth / 1920, innerHeight / 1080]); await pg.mouse.move(crpt[0] * s[0], crpt[1] * s[1]); await pg.waitForTimeout(400);
out.foes = await pg.evaluate(() => { const V = META.view(), o = V.items[V.sel]; return { sel: o && o.k, open: Object.keys(META.data.st.foes) }; });
await pg.screenshot({ path: 'frames/ach/3_foes.png' });
const checks = [
  ['the results list the shift achievements', out.results.ach.length >= 5],
  ['nothing paid by the shift itself', out.results.codes === out.results.earned],
  ['after a reload they wait (save v4)', out.reload.v === 4 && out.reload.waiting >= 5 && out.reload.claimed === 0 && out.reload.again === 0],
  ['the main menu says how many wait', /забрать \d+/.test(out.menuLine)],
  ['«Забрать всё» pays them once', out.claim.n === out.reload.waiting && out.claim.paid > 0 && out.claim.left === 0],
  ['a goal met mid-shift toasts, nothing paid', /ДОСТИЖЕНИЕ/.test(out.toast.s || '') && !out.toast.paidEarly],
  ['the enemy list opens the beaten foes', out.foes.sel === 'crpt'],
];
for (const [s0, c] of checks) console.log((c ? 'ok   ' : 'FAIL ') + s0);
console.log(JSON.stringify(out)); console.log('errors:', errs.length ? errs : 'none');
await b.close(); process.exitCode = checks.every((c) => c[1]) && !errs.length ? 0 : 1;
