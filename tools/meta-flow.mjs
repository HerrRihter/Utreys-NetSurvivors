// End-to-end check of the menu loop in a fresh headless browser (its own empty save):
// menu → start a run → die → codes banked and shown on the results → Esc → menu; screenshots in frames/meta/.
import fs from 'fs';
const { chromium } = await import(process.env.PLAYWRIGHT ? 'file:///' + process.env.PLAYWRIGHT.replace(/\\/g, '/') + '/index.mjs' : 'playwright');
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; pg.on('pageerror', (e) => errs.push(String(e))); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://127.0.0.1:' + (process.env.PORT || 8931) + '/live/index.html?dev'); await pg.waitForFunction(() => window.META && window.SCENE, null, { timeout: 60000 });
fs.mkdirSync('frames/meta', { recursive: true });
const shot = async (n) => { await pg.waitForTimeout(400); await pg.screenshot({ path: `frames/meta/${n}.png` }); };
const out = {};
await pg.evaluate(() => { localStorage.removeItem('ns_meta_v1'); META.reset(); }); await shot('1_menu');
await pg.keyboard.press('Enter'); await pg.waitForTimeout(300); await pg.keyboard.press('Enter'); await pg.waitForTimeout(300); await pg.keyboard.press('Enter'); await pg.waitForTimeout(1200);   // menu → hero → map → run
out.started = await pg.evaluate(() => !!SCENE.state && SCENE.state.t > 0);
await pg.evaluate(() => { const S = SCENE.state; S.bars = 12; S.kills = 57; S.hp = 0.01; S.iT = -99; for (let i = 0; i < 6; i++) { const e = SIM.mkFoe(S, 'node', S.x + 30, S.y + 5); e.nextAtk = 0; } });
await pg.waitForFunction(() => SCENE.state && SCENE.state.over, null, { timeout: 20000 }); await pg.waitForTimeout(1800);
out.afterRun = await pg.evaluate(() => ({ over: SCENE.state.over.k, codes: META.data.codes, runs: META.data.runs, best: META.data.best, last: { earned: META.last.earned, base: META.last.base, rec: META.last.rec, finds: META.last.finds.length } }));
await shot('2_results');
await pg.keyboard.press('Escape'); await pg.waitForTimeout(500);
out.backInMenu = await pg.evaluate(() => !SCENE.state && META.view().scr === 'main');
await shot('3_menu_after');
await pg.evaluate(() => META.go('rec')); await shot('4_records');
console.log(JSON.stringify(Object.assign(out, { errors: errs })));
await b.close();
