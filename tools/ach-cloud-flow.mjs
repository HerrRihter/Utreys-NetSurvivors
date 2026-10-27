// Achievements in the Firebase profile (docs/PLAN-ACHIEVEMENTS.md, stage 6), end to end against the local emulators (?emu=1):
// device 1 plays as a guest and earns achievements, then registers → they go up to progress/{uid}; device 2 (an empty save) signs
// in → it gets them, without their codes; device 2 earns a new one → device 1 gets it after a reload.
//   firebase emulators:start --only auth,firestore --project demo-netsurvivors ; python tools/serve.py 8931 ; node tools/ach-cloud-flow.mjs
const { chromium } = await import('file:///' + process.env.PLAYWRIGHT.replace(/\\/g, '/') + '/index.mjs');
const b = await chromium.launch(), url = 'http://localhost:8931/live/index.html?emu=1', login = 'ach' + String(Date.now()).slice(-8), out = {}, errs = [];
const wait = (pg, f, arg) => pg.waitForFunction(f, arg, { timeout: 90000 });
async function device() { const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } }), pg = await ctx.newPage();
  pg.on('pageerror', (e) => errs.push(String(e))); await pg.goto(url); await wait(pg, () => window.META && window.CLOUD && CLOUD.state.status !== 'loading'); return pg; }
const ach = (pg) => pg.evaluate(() => ({ ach: META.achIds().sort(), codes: META.data.codes }));
// a counted shift banked like the page does at its end
const shift = (pg, fx, more) => pg.evaluate(([fx, more]) => { const S = SIM.spawn(5, META.mods(), META.runOpts()); Object.assign(S, { t: 60, kills: 20, lvl: 3, over: { k: 'dead', t: 60 } }, more); S.fx = Object.assign(S.fx, fx); META.bank(S); }, [fx, more]);
const synced = (pg) => pg.waitForTimeout(500).then(() => pg.evaluate(() => CLOUD.syncAch()));

const d1 = await device();
await shift(d1, { cast: 10 }, { t: 200, kills: 150 });
out.guest = await ach(d1);
await d1.evaluate(() => ACCOUNT_UI.open()); await d1.click('#acct-sw'); await d1.fill('#acct-l', login); await d1.fill('#acct-pw', 'secret77'); await d1.fill('#acct-r', 'secret77');
await d1.click('#acct-go'); await wait(d1, () => CLOUD.state.status === 'signedIn'); await synced(d1);

const d2 = await device();
out.d2before = await ach(d2);
await d2.evaluate(() => ACCOUNT_UI.open()); await d2.fill('#acct-l', login); await d2.fill('#acct-pw', 'secret77'); await d2.click('#acct-go');
await wait(d2, () => CLOUD.state.status === 'signedIn'); await synced(d2);
out.d2after = await ach(d2);
await shift(d2, { boss: 1 }); await synced(d2);                                                      // «Первый разбор PIR» on device 2
out.d2new = await ach(d2);

await d1.reload(); await wait(d1, () => window.META && window.CLOUD && CLOUD.state.status === 'signedIn'); await synced(d1);
out.d1reload = await ach(d1);
await d1.evaluate(() => { META.go('ach', true); META.acat('bosses'); }); await d1.waitForTimeout(500); await d1.screenshot({ path: 'frames/ach/4_cloud_bosses.png' });

const has = (o, id) => o.ach.includes(id);
const checks = [
  ['the guest earned achievements', out.guest.ach.length >= 4],
  ['an empty device has none', out.d2before.ach.length === 0],
  ['after sign-in it has the account\'s', out.guest.ach.every((id) => has(out.d2after, id))],
  ['their codes were not paid again', out.d2after.codes === out.d2before.codes],
  ['device 2 earned «Первый разбор PIR»', has(out.d2new, 'bosses_1')],
  ['device 1 got it after a reload', has(out.d1reload, 'bosses_1')],
];
for (const [s, c] of checks) console.log((c ? 'ok   ' : 'FAIL ') + s);
console.log(JSON.stringify(out)); console.log('errors:', errs.length ? errs : 'none');
await b.close(); process.exitCode = checks.every((c) => c[1]) && !errs.length ? 0 : 1;
