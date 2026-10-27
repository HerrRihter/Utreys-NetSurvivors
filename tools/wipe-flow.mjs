// Stage 2 of docs/PLAN-FEEDBACK-27-10.md against the local emulators (?emu=1): a reset of progress on one device resets the account's
// achievements in the cloud (the next epoch) and, on its next sync, the other device; an undo brings the old progress back to both;
// a guest's own progress is kept when it signs in to a reset account.
//   firebase emulators:start --only auth,firestore --project demo-netsurvivors ; python tools/serve.py 8931 ; node tools/wipe-flow.mjs
const { chromium } = await import('file:///' + process.env.PLAYWRIGHT.replace(/\\/g, '/') + '/index.mjs');
const fs = await import('node:fs'); fs.mkdirSync('frames/wipe', { recursive: true });
const b = await chromium.launch(), url = 'http://localhost:8931/live/index.html?emu=1', login = 'wipe' + String(Date.now()).slice(-8), out = {}, errs = [];
const wait = (pg, f, arg) => pg.waitForFunction(f, arg, { timeout: 90000 });
async function device() { const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } }), pg = await ctx.newPage();
  pg.on('pageerror', (e) => errs.push(String(e))); await pg.goto(url, { timeout: 120000 }); await wait(pg, () => window.META && window.CLOUD && CLOUD.state.status !== 'loading'); return pg; }
const st = (pg) => pg.evaluate(() => ({ ach: META.achIds().sort(), codes: META.data.codes, runs: META.data.runs, cloud: Object.assign({}, META.data.cloud), undo: META.canUndo() }));
const shift = (pg, fx, more) => pg.evaluate(([fx, more]) => { const S = SIM.spawn(5, META.mods(), META.runOpts()); Object.assign(S, { t: 60, kills: 20, lvl: 3, over: { k: 'dead', t: 60 } }, more); S.fx = Object.assign(S.fx, fx); META.bank(S); }, [fx, more]);
const synced = (pg) => pg.waitForTimeout(400).then(() => pg.evaluate(() => CLOUD.syncAch()));
// a click on a menu item by its id (view px → page px)
const clickItem = async (pg, id) => { const r = await pg.evaluate((id) => { const o = META.view().items.find((x) => x.id === id); return o && o.r; }, id), box = await pg.locator('#c').boundingBox();
  await pg.mouse.click(box.x + (r[0] + r[2] / 2) / 1920 * box.width, box.y + (r[1] + r[3] / 2) / 1080 * box.height); await pg.waitForTimeout(300); };
const signIn = async (pg, reg) => { await pg.evaluate(() => ACCOUNT_UI.open()); if (reg) await pg.click('#acct-sw'); await pg.fill('#acct-l', login); await pg.fill('#acct-pw', 'secret77'); if (reg) await pg.fill('#acct-r', 'secret77');
  await pg.click('#acct-go'); await wait(pg, () => CLOUD.state.status === 'signedIn'); await synced(pg); };

const d1 = await device();
await shift(d1, { cast: 10 }, { t: 200, kills: 150 }); await signIn(d1, true); out.d1 = await st(d1);
const d2 = await device(); await signIn(d2); out.d2 = await st(d2);
// the reset on device 1, through the settings and the dialog
await d1.mouse.click(800, 450); await d1.evaluate(() => { META.go('set', true); }); await d1.waitForTimeout(200); await clickItem(d1, 'wipe');
out.dialog = await d1.evaluate(() => ({ open: getComputedStyle(document.getElementById('wipe')).display, text: document.getElementById('wipe-p').textContent, go: document.getElementById('wipe-go').disabled }));
await d1.fill('#wipe-i', 'сбро'); out.partial = await d1.evaluate(() => document.getElementById('wipe-go').disabled);
await d1.fill('#wipe-i', 'сброс'); await d1.screenshot({ path: 'frames/wipe/1_dialog.png' }); await d1.click('#wipe-go'); await synced(d1);
out.d1wiped = await st(d1);
await d1.waitForTimeout(300); await d1.screenshot({ path: 'frames/wipe/2_settings_undo.png' });
// device 2 sees the account's reset
await synced(d2); out.d2wiped = await st(d2); out.d2note = await d2.evaluate(() => document.getElementById('hint').textContent);
// progress after the reset joins as usual
await shift(d2, { boss: 1 }); await synced(d2); await synced(d1); out.d1after = await st(d1);
// a guest with progress of its own signs in to the reset account: kept and joined
const d3 = await device(); await shift(d3, { cast: 10 }); out.d3guest = await st(d3); await signIn(d3); out.d3 = await st(d3);
// undo on device 1: the old progress is back, and goes up to the cloud (device 2 gets it)
await d1.evaluate(() => { META.go('set', true); }); await clickItem(d1, 'undo');
await synced(d1); out.d1undo = await st(d1); await synced(d2); out.d2undo = await st(d2);
// a counted shift ends the undo
await shift(d1, {}); out.d1shift = await st(d1);

const has = (o, id) => o.ach.includes(id);
const checks = [
  ['device 1 earned achievements and synced', out.d1.ach.length >= 3 && out.d1.cloud.uid && out.d1.cloud.epoch === 0],
  ['device 2 got them', out.d1.ach.every((id) => has(out.d2, id))],
  ['the dialog opens and names the profile', out.dialog.open === 'flex' && /профиле/.test(out.dialog.text) && out.dialog.go === true],
  ['«Сбросить» waits for the whole word', out.partial === true],
  ['device 1 is reset (codes, achievements, shifts)', out.d1wiped.ach.length === 0 && out.d1wiped.codes === 0 && out.d1wiped.runs === 0],
  ['the cloud is at epoch 1 and the undo is offered', out.d1wiped.cloud.epoch === 1 && out.d1wiped.cloud.wipe === false && out.d1wiped.undo === true],
  ['device 2 is reset by the sync and told so', out.d2wiped.ach.length === 0 && out.d2wiped.codes === 0 && out.d2wiped.cloud.epoch === 1 && /другом устройстве/.test(out.d2note)],
  ['what device 2 does next reaches device 1', has(out.d1after, 'bosses_1') && out.d1after.cloud.epoch === 1],
  ['a guest keeps its own progress on sign-in', out.d3guest.ach.length > 0 && out.d3guest.ach.every((id) => has(out.d3, id)) && has(out.d3, 'bosses_1') && out.d3.codes === out.d3guest.codes],
  ['the undo brings device 1 back', out.d1.ach.every((id) => has(out.d1undo, id)) && out.d1undo.codes === out.d1.codes && out.d1undo.undo === false],
  ['and device 2 gets the old achievements again', out.d1.ach.every((id) => has(out.d2undo, id))],
  ['a counted shift ends the undo', out.d1shift.undo === false],
];
for (const [s, c] of checks) console.log((c ? 'ok   ' : 'FAIL ') + s);
console.log(JSON.stringify(out)); console.log('errors:', errs.length ? errs : 'none');
await b.close(); process.exitCode = checks.every((c) => c[1]) && !errs.length ? 0 : 1;
