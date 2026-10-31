// The whole save through the account (docs/PLAN-CLOUD-SAVE-31-10.md, stages 2–3), end to end against the local emulators (?emu=1):
// device A plays and buys as a guest and registers → its save is the account's; device B (new) signs in → codes, purchases, heroes,
// records and achievements arrive, claimed and unmarked; B spends → A sees the rest, codes not doubled; both change → the choice
// dialog, both ways; a guest with progress signs in → the choice; signing out clears the device and signing in brings it back;
// the old document (achievements only) moves to the new shape.
//   firebase emulators:start --only auth,firestore --project demo-netsurvivors ; python tools/serve.py 8931 ; node tools/cloud-save-flow.mjs
const { chromium } = await import('file:///' + process.env.PLAYWRIGHT.replace(/\\/g, '/') + '/index.mjs');
const fs = await import('node:fs'); fs.mkdirSync('frames/cloud', { recursive: true });
const b = await chromium.launch(), url = 'http://localhost:8931/live/index.html?emu=1', login = 'sav' + String(Date.now()).slice(-8), out = {}, errs = [];
const wait = (pg, f, arg) => pg.waitForFunction(f, arg, { timeout: 90000 });
async function device() { const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } }), pg = await ctx.newPage();
  pg.on('pageerror', (e) => errs.push(String(e))); await pg.goto(url, { timeout: 120000 }); await wait(pg, () => window.META && window.CLOUD && CLOUD.state.status !== 'loading'); return pg; }
// the parts of a save the checks compare
const st = (pg) => pg.evaluate(() => { const D = META.data; return { codes: D.codes, runs: D.runs, kills: D.kills, up: Object.assign({}, D.up), heroes: Object.keys(D.heroes).sort(), best: Object.assign({}, D.best),
  ach: Object.keys(D.ach).sort(), waiting: ACH.waiting(D).map((x) => x.id), fresh: Object.keys(D.fresh).sort(), cloud: Object.assign({}, D.cloud), sync: CLOUD.syncState.status, pick: CLOUD.syncState.pick }; });
const shift = (pg, fx, more) => pg.evaluate(([fx, more]) => { const S = SIM.spawn(5, META.mods(), META.runOpts()); Object.assign(S, { t: 60, kills: 20, lvl: 3, over: { k: 'dead', t: 60 } }, more); S.fx = Object.assign(S.fx, fx); META.bank(S); }, [fx || {}, more || {}]);
const buy = (pg, id) => pg.evaluate((id) => { META.go('shop', true); META.tab('up'); const i = META.view().items.findIndex((o) => o.u && o.u.id === id); const it = META.view().items[i];
  META.click(it.r[0] + it.r[2] / 2, it.r[1] + it.r[3] / 2); META.go('main', true); }, id);
const synced = (pg) => pg.evaluate(() => CLOUD.sync());
const signIn = async (pg, reg) => { await pg.evaluate(() => ACCOUNT_UI.open()); if (reg) await pg.click('#acct-sw'); await pg.fill('#acct-l', login); await pg.fill('#acct-pw', 'secret77'); if (reg) await pg.fill('#acct-r', 'secret77');
  await pg.click('#acct-go'); await wait(pg, () => CLOUD.state.status === 'signedIn'); await wait(pg, () => CLOUD.syncState.status && CLOUD.syncState.status !== 'busy'); };
const pickShown = (pg) => pg.evaluate(() => getComputedStyle(document.getElementById('pick')).display === 'flex' && document.getElementById('pick-hs').textContent);

// A: a guest plays, claims, looks at the shop and buys, then registers
const A = await device();
await shift(A, { cast: 10 }, { t: 200, kills: 150, bars: 300 });
await A.evaluate(() => { META.claimAll(); META.go('shop', true); META.go('main', true); });
await buy(A, 'health'); out.Aguest = await st(A);
await signIn(A, true); await synced(A); out.A1 = await st(A);
// B: a new device signs in
const B = await device(); out.Bnew = await st(B);
await signIn(B); out.B1 = await st(B);
// B spends; A sees the rest
await buy(B, 'power'); await synced(B); out.B2 = await st(B);
await synced(A); out.A2 = await st(A);
// both change before meeting: the choice, first «Аккаунт», then «Это устройство»
await shift(B, {}, { kills: 30, bars: 40 }); await synced(B); out.B3 = await st(B);
await shift(A, {}, { kills: 70, bars: 90 }); await synced(A); out.A3 = await st(A); out.A3dialog = await pickShown(A);
await A.screenshot({ path: 'frames/cloud/1_pick.png' });
await A.click('#pick-cloud'); await wait(A, () => CLOUD.syncState.status === 'ok'); out.A4 = await st(A);
await shift(B, {}, { kills: 10, bars: 5 }); await synced(B);
await shift(A, {}, { kills: 90, bars: 200 }); await synced(A); const mine = (await st(A)).codes;
await A.click('#pick-here'); await wait(A, () => CLOUD.syncState.status === 'ok'); out.A5 = await st(A); out.A5mine = mine;
await synced(B); out.B5 = await st(B);
// a guest with progress signs in to the account: the choice
const G = await device(); await shift(G, {}, { kills: 40, bars: 20 }); out.Gguest = await st(G);
await signIn(G); out.G1 = await st(G); out.G1dialog = await pickShown(G);
await G.click('#pick-cloud'); await wait(G, () => CLOUD.syncState.status === 'ok'); out.G2 = await st(G);
// signing out clears the device; signing in brings the account back
await G.evaluate(() => ACCOUNT_UI.open()); await G.click('#acct-out'); await wait(G, () => CLOUD.state.status === 'guest'); out.Gout = await st(G);
await signIn(G); out.Gback = await st(G);
// the account menu says the progress is saved
await G.evaluate(() => ACCOUNT_UI.open()); out.Gline = await G.evaluate(() => document.getElementById('acct-p').textContent); await G.screenshot({ path: 'frames/cloud/2_account.png' }); await G.evaluate(() => ACCOUNT_UI.close());
// the old document ({ ach, epoch }) of an older version: its achievements join the save, claimed
{ const { createRequire } = await import('node:module'), req = createRequire('D:/Utreys-Survivors/node_modules/package.json'), T = req('@firebase/rules-unit-testing'), F = req('firebase/firestore');
  const env = await T.initializeTestEnvironment({ projectId: 'demo-netsurvivors', firestore: { host: '127.0.0.1', port: 8085 } }), uid = await G.evaluate(() => CLOUD.state.uid);
  await env.withSecurityRulesDisabled(async (x) => { await F.setDoc(F.doc(x.firestore(), 'progress', uid), { ach: ['wins_10', 'kills_1000'], epoch: 0, updatedAt: new Date() }); }); await env.cleanup(); }
await G.evaluate(() => { META.data.cloud.rev = 0; }); await synced(G); out.Glegacy = await st(G);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const checks = [
  ['A as a guest: codes, a purchase, claimed achievements', out.Aguest.codes > 0 && out.Aguest.up.health === 1 && out.Aguest.ach.length >= 3],
  ['A\'s save is the account\'s (rev 1, nothing waits to go up)', out.A1.cloud.rev === 1 && out.A1.sync === 'ok'],
  ['B starts empty', out.Bnew.codes === 0 && out.Bnew.runs === 0],
  ['B gets the codes, purchases, heroes, records and achievements', out.B1.codes === out.A1.codes && same(out.B1.up, out.A1.up) && same(out.B1.heroes, out.A1.heroes) && same(out.B1.best, out.A1.best) && same(out.B1.ach, out.A1.ach) && out.B1.runs === out.A1.runs],
  ['nothing on B waits to be claimed or is marked again', out.B1.waiting.length === out.A1.waiting.length && same(out.B1.fresh, out.A1.fresh)],
  ['B spent codes; A sees the rest, not doubled', out.B2.codes < out.B1.codes && out.A2.codes === out.B2.codes && out.A2.up.power === 1],
  ['both changed: A is asked, with both summaries', out.A3.pick && out.A3dialog && /Коды/.test(out.A3dialog) && out.A3.sync === 'pick'],
  ['«Аккаунт» takes B\'s save', out.A4.codes === out.B3.codes && out.A4.runs === out.B3.runs && !out.A4.pick],
  ['«Это устройство» keeps A\'s and B gets it', out.A5.codes === out.A5mine && out.B5.codes === out.A5mine && out.B5.runs === out.A5.runs],
  ['a guest with progress is asked too', out.Gguest.runs === 1 && out.G1.pick && out.G1dialog],
  ['«Аккаунт» replaces the guest\'s progress', out.G2.codes === out.B5.codes && out.G2.runs === out.B5.runs],
  ['signing out clears the device', out.Gout.codes === 0 && out.Gout.runs === 0 && out.Gout.ach.length === 0 && !out.Gout.cloud.uid],
  ['signing in brings it back', out.Gback.codes === out.G2.codes && out.Gback.runs === out.G2.runs && !out.Gback.pick],
  ['the account menu says the progress is saved', /сохранён в аккаунте/.test(out.Gline)],
  ['the old document\'s achievements join, claimed; the codes stay', out.Glegacy.ach.includes('wins_10') && out.Glegacy.ach.includes('kills_1000') && out.Glegacy.codes === out.Gback.codes && out.Glegacy.cloud.rev === 1 && out.Glegacy.sync === 'ok'],
];
for (const [s, c] of checks) console.log((c ? 'ok   ' : 'FAIL ') + s);
if (!checks.every((c) => c[1])) console.log(JSON.stringify(out));
console.log('errors:', errs.length ? errs : 'none');
await b.close(); process.exitCode = checks.every((c) => c[1]) && !errs.length ? 0 : 1;
