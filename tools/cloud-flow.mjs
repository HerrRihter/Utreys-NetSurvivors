// The account and the leaderboards end to end in a real browser against the local emulators (?emu=1): register two players, a
// counted run each, the run reaches stats/{uid}, the results show the record's place, the «Лидеры» screen lists both, sign out and in.
//   firebase emulators:start --only auth,firestore --project demo-netsurvivors ; python tools/serve.py 8931 ; node tools/cloud-flow.mjs
const { chromium } = await import('file:///' + process.env.PLAYWRIGHT.replace(/\\/g, '/') + '/index.mjs');
const out = 'frames/cloud';
await import('node:fs').then((fs) => fs.mkdirSync(out, { recursive: true }));
const b = await chromium.launch();
const shot = (pg, n) => pg.waitForTimeout(500).then(() => pg.screenshot({ path: `${out}/${n}.png` }));
const wait = (pg, f, arg) => pg.waitForFunction(f, arg, { timeout: 90000 });
async function player(login, kills, n) {
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } }), pg = await ctx.newPage(), logs = [];
  pg.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
  await pg.goto('http://localhost:8931/live/index.html?emu=1'); await wait(pg, () => window.META && window.CLOUD && CLOUD.state.status === 'guest');
  if (n === 1) await shot(pg, '1_menu_guest');
  await pg.evaluate(() => ACCOUNT_UI.open()); await pg.click('#acct-sw'); await pg.fill('#acct-l', login); await pg.fill('#acct-pw', 'secret77'); await pg.fill('#acct-r', 'secret77');
  if (n === 1) await shot(pg, '2_register');
  await pg.click('#acct-go'); await wait(pg, () => CLOUD.state.status === 'signedIn');
  if (n === 1) await shot(pg, '3_menu_signed');
  // a counted run on the data centre: a real spawn, the numbers set, banked like the page does at the end of a run
  await pg.evaluate(([kills, n]) => { const S = SIM.spawn(5, META.mods(), Object.assign(META.runOpts(), { map: 'dc', hero: n === 2 ? 'qa' : 'utrace' })); for (let i = 0; i < 120 * 12; i++) SIM.step(S, S.pick ? { slot: 1 } : {});
    Object.assign(S, { kills, bars: 7, lvl: 9, over: { k: 'dead', t: S.t } }); window.__dev.play = S; META.bank(S); }, [kills, n]);
  await wait(pg, () => CLOUD.last.improved.length > 0 && Object.keys(CLOUD.last.places).length > 0);
  await shot(pg, `4_results_${n}`);
  const res = await pg.evaluate(() => ({ uid: CLOUD.state.uid, improved: CLOUD.last.improved, places: CLOUD.last.places, queued: CLOUD.last.queued }));
  return { ctx, pg, res, logs };
}
const sfx = String(Date.now() % 1000), p1 = await player('Алёна' + sfx, 150, 1), p2 = await player('Bob_' + sfx, 90, 2);
console.log('player 1', JSON.stringify(p1.res)); console.log('player 2', JSON.stringify(p2.res));
// the leaderboard as player 2 (Bob is second on «Сбои»)
const pg = p2.pg; await pg.evaluate(() => { window.__dev.play = null; META.go('lead'); CLOUD.loadBoard({ metric: 1, scope: 'all', hero: '', near: false }); });
await wait(pg, () => CLOUD.board.rows && CLOUD.board.rows.length >= 2 && !CLOUD.board.loading); await shot(pg, '5_leaders');
const rows = await pg.evaluate(() => CLOUD.board.rows.map((r) => [r.place, r.login, r.value]));
console.log('leaders «Сбои»:', JSON.stringify(rows));
// the filters (stage 6 of docs/PLAN-FEEDBACK-27-10.md): by hero (Bob played QA), and «рядом со мной»
await pg.evaluate(() => CLOUD.loadBoard({ hero: 'qa' })); await wait(pg, () => !CLOUD.board.loading && CLOUD.board.key.includes('|qa|'));
const byHero = await pg.evaluate(() => ({ rows: CLOUD.board.rows.map((r) => [r.place, r.login, r.hero]), me: CLOUD.board.me && [CLOUD.board.me.place, CLOUD.board.me.hero] })); await shot(pg, '6_leaders_qa');
await pg.evaluate(() => CLOUD.loadBoard({ hero: 'utrace' })); await wait(pg, () => !CLOUD.board.loading && CLOUD.board.key.includes('|utrace|'));
const byUtrace = await pg.evaluate(() => ({ rows: CLOUD.board.rows.map((r) => r.login), me: CLOUD.board.me }));
await pg.evaluate(() => CLOUD.loadBoard({ hero: '', near: true })); await wait(pg, () => !CLOUD.board.loading && CLOUD.board.key.endsWith('|true'));
const near = await pg.evaluate(() => ({ rows: CLOUD.board.rows.map((r) => [r.place, r.login, r.value]), me: CLOUD.board.me && CLOUD.board.me.place })); await shot(pg, '7_leaders_near');
const remembered = await pg.evaluate(() => JSON.parse(localStorage.getItem('ns_board_v1')));
await pg.evaluate(() => CLOUD.loadBoard({ near: false }));
const fchecks = [['the QA table holds only QA runs, Bob in it', byHero.rows.length >= 1 && byHero.rows.every((r) => r[2] === 'qa') && byHero.rows.some((r) => r[1].startsWith('Bob_')) && byHero.me && byHero.me[1] === 'qa'],
  ['Bob has no Utrace result', !byUtrace.me && !byUtrace.rows.some((l) => l.startsWith('Bob_'))],
  ['«рядом со мной» holds Bob at his place', near.me > 0 && near.rows.some((r) => r[1].startsWith('Bob_') && r[0] === near.me)],
  ['the filters are remembered', remembered && remembered.near === true && remembered.hero === '' && remembered.metric === 1]];
for (const [s0, c] of fchecks) console.log((c ? 'ok   ' : 'FAIL ') + s0);
console.log('by hero', JSON.stringify(byHero), '| near', JSON.stringify(near));
// sign out and back in keeps the login
await pg.evaluate((s) => { window.__sfx = s; return CLOUD.signOut(); }, sfx); await wait(pg, () => CLOUD.state.status === 'guest');
await pg.evaluate(() => CLOUD.signIn('BOB_' + window.__sfx, 'secret77')); await wait(pg, () => CLOUD.state.status === 'signedIn');
const back = await pg.evaluate(() => CLOUD.state.login);
const wrong = await pg.evaluate(async () => { await CLOUD.signOut(); await CLOUD.signIn('bob_' + window.__sfx, 'nope123'); return CLOUD.state.error; });
const taken = await pg.evaluate(async () => { await CLOUD.register('АЛЕНА' + window.__sfx, 'secret77', 'secret77'); return CLOUD.state.error; });
console.log('signed in again as', back, '| wrong password:', wrong, '| taken login:', taken);
console.log('console errors:', p1.logs.length + p2.logs.length, (p1.logs.concat(p2.logs)).slice(0, 3));
await b.close();
