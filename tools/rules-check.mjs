// Firestore rules on the emulator (firebase.json: Firestore 8085): what an honest client writes passes, tampering is refused.
//   firebase emulators:start --only auth,firestore --project demo-netsurvivors   (then)   node tools/rules-check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), nm = 'D:/Utreys-Survivors/node_modules/';
import { createRequire } from 'node:module';
const req = createRequire(nm + 'package.json');                                      // the original's test libraries (read only)
const T = req('@firebase/rules-unit-testing'), F = req('firebase/firestore');
const { doc, setDoc, getDoc, runTransaction, serverTimestamp, collection, query, where, orderBy, limit, getDocs } = F, getCount = F.getCountFromServer;
const env = await T.initializeTestEnvironment({ projectId: 'demo-netsurvivors', firestore: { host: '127.0.0.1', port: 8085, rules: fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8') } });
await env.clearFirestore();
let pass = 0, failN = 0; const ok = async (name, p) => { try { await T.assertSucceeds(p); pass++; } catch (e) { failN++; console.log('FAIL (should pass)', name, e.message.slice(0, 160)); } };
const no = async (name, p) => { try { await T.assertFails(p); pass++; } catch (e) { failN++; console.log('FAIL (should be refused)', name); } };
const NUM = ['games', 'totalKills', 'totalCodes', 'bestTime', 'bestKills', 'bestCodes', 'bestLvl', 'victoryScore'];
const scope = (o = {}) => Object.assign(Object.fromEntries(NUM.map((k) => [k, 0])), o);
const profile = (db, uid, login, key) => runTransaction(db, async (tx) => { tx.set(doc(db, 'logins', key), { uid }); tx.set(doc(db, 'users', uid), { login, loginKey: key, createdAt: serverTimestamp() }); });
// a stats write; the hero's scope copies the map's unless given (stage 6: heroes.<h> grows like the rest)
const stats = (db, uid, login, all, map, runId, m = 'dc', h = 'utrace', hero = map, extra = {}) => setDoc(doc(db, 'stats', uid), Object.assign({ login, all, maps: { [m]: map },
  heroes: { [h]: hero }, lastRun: { map: m, runId, hero: h }, updatedAt: serverTimestamp() }, extra));

const A = env.authenticatedContext('alice').firestore(), B = env.authenticatedContext('bob').firestore(), anon = env.unauthenticatedContext().firestore();
await ok('register Алёна', profile(A, 'alice', 'Алёна', 'алена'));
await no('claim a taken login', profile(B, 'bob', 'АЛЕНА', 'алена'));
await no('profile with a key that does not match the login', profile(B, 'bob', 'Bob', 'notbob'));
await no('mixed scripts login key', profile(B, 'bob', 'Bobик', 'bobик'));
await ok('register Bob', profile(B, 'bob', 'Bob', 'bob'));
const r1 = scope({ games: 1, totalKills: 120, totalCodes: 30, bestTime: 300, bestKills: 120, bestCodes: 30, bestLvl: 12, bestTimeHero: 'utrace', bestKillsHero: 'utrace', bestCodesHero: 'utrace', bestLvlHero: 'utrace' });
await ok('first run', stats(A, 'alice', 'Алёна', r1, r1, 'run1'));
await no('the same run again', stats(A, 'alice', 'Алёна', scope({ ...r1, games: 2, totalKills: 240 }), scope({ ...r1, games: 2, totalKills: 240 }), 'run1'));
await no('two games at once', stats(A, 'alice', 'Алёна', scope({ ...r1, games: 3 }), scope({ ...r1, games: 3 }), 'run2'));
await no('a record lowered', stats(A, 'alice', 'Алёна', scope({ ...r1, games: 2, bestTime: 100 }), scope({ ...r1, games: 2, bestTime: 100 }), 'run2'));
await no('another login in the table', stats(A, 'alice', 'Hacker', scope({ ...r1, games: 2 }), scope({ ...r1, games: 2 }), 'run2'));
await no('unknown map', stats(A, 'alice', 'Алёна', scope({ ...r1, games: 2 }), scope({ ...r1, games: 1 }), 'run2', 'edu'));
await no('map and overall grew differently', stats(A, 'alice', 'Алёна', scope({ ...r1, games: 2, totalKills: 200 }), scope({ ...r1, games: 2, totalKills: 300 }), 'run2'));
await no('writing someone else\'s stats', stats(B, 'alice', 'Алёна', scope({ ...r1, games: 2 }), scope({ ...r1, games: 2 }), 'run2'));
const r2 = scope({ ...r1, games: 2, totalKills: 400, bestKills: 280, victoryScore: 35500, victoryHero: 'qa' });
await ok('a second run with a win', stats(A, 'alice', 'Алёна', r2, r2, 'run2'));
await ok('Bob\'s run', stats(B, 'bob', 'Bob', r1, r1, 'b1'));
// the hero's scope (stage 6 of docs/PLAN-FEEDBACK-27-10.md)
const r3 = scope({ ...r2, games: 3, totalKills: 500 }), qa1 = scope({ games: 1, totalKills: 100, totalCodes: 0, bestKills: 100 });
await no('a run without the hero scope', setDoc(doc(A, 'stats', 'alice'), { login: 'Алёна', all: r3, maps: { dc: r3 }, lastRun: { map: 'dc', runId: 'run3' }, updatedAt: serverTimestamp() }));
await no('an unknown hero', stats(A, 'alice', 'Алёна', r3, r3, 'run3', 'dc', 'hacker', qa1, { heroes: { utrace: r2, hacker: qa1 } }));
await no('the hero grew more than the run', stats(A, 'alice', 'Алёна', r3, r3, 'run3', 'dc', 'qa', scope({ ...qa1, totalKills: 900 }), { heroes: { utrace: r2, qa: scope({ ...qa1, totalKills: 900 }) } }));
await no('another hero touched too', stats(A, 'alice', 'Алёна', r3, r3, 'run3', 'dc', 'qa', qa1, { heroes: { utrace: r3, qa: qa1 } }));
await ok('a run with QA: its scope starts', stats(A, 'alice', 'Алёна', r3, r3, 'run3', 'dc', 'qa', qa1, { heroes: { utrace: r2, qa: qa1 } }));
await ok('a table by hero', getDocs(query(collection(anon, 'stats'), where('heroes.qa.bestKills', '>', 0), orderBy('heroes.qa.bestKills', 'desc'), limit(50))));
await ok('tables are public', getDocs(query(collection(anon, 'stats'), where('all.bestKills', '>', 0), orderBy('all.bestKills', 'desc'), limit(50))));
await ok('a place is a count query', getCount(query(collection(anon, 'stats'), where('all.bestKills', '>', 100), limit(1000))));
await no('a list without a limit', getDocs(query(collection(anon, 'stats'), where('all.bestKills', '>', 0))));
await no('reading the login claims signed out', getDoc(doc(anon, 'logins', 'алена')));
// progress/{uid}: the account's save (docs/PLAN-CLOUD-SAVE-31-10.md, stage 2); the rules' achievement ids and save keys are the game's
const vm = await import('node:vm'), c = { console, Math, Date, JSON, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } }; c.window = c; c.globalThis = c; vm.createContext(c);
for (const f of ['course.js', 'edu.js', 'sim.js', 'ach.js', 'meta.js']) vm.runInContext(fs.readFileSync(path.join(root, 'live', f), 'utf8'), c);
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8'), listOf = (fn) => rules.match(new RegExp('function ' + fn + '\\(\\) \\{\\s*return \\[([^\\]]*)\\]'))[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
const sameSet = (name, a, b) => { if (a.length === b.length && a.every((x) => b.includes(x))) pass++; else { failN++; console.log('FAIL ' + name, a.filter((x) => !b.includes(x)), b.filter((x) => !a.includes(x))); } };
sameSet('the rules\' knownAch differs from live/ach.js', c.ACH.LIST.map((x) => x.id), listOf('knownAch'));
sameSet('the rules\' saveKeys differ from fresh() in live/meta.js', [...c.META.SYNCED], listOf('saveKeys'));
const save0 = JSON.parse(JSON.stringify(c.META.cloudSide().data)), save = (o = {}) => Object.assign(JSON.parse(JSON.stringify(save0)), o);
const prog = (db, uid, data, rev, epoch = 0, extra = {}) => setDoc(doc(db, 'progress', uid), Object.assign({ data, schema: 1, rev, device: 'dev1', epoch, updatedAt: serverTimestamp() }, extra));
const C = env.authenticatedContext('carol').firestore();
await no('progress without a profile', prog(C, 'carol', save(), 1));
await no('a first save at rev 2', prog(A, 'alice', save(), 2));
await ok('a new save (rev 1)', prog(A, 'alice', save(), 1));
await ok('the next revision with codes, purchases and achievements', prog(A, 'alice', save({ codes: 420, runs: 3, kills: 210, time: 612.5, up: { health: 2 }, heroes: { utrace: 1, qa: 1 }, ach: { surv_60: 1 }, done: { kills_100: 1 }, fresh: { 'hero:qa': 1 } }), 2));
await no('a revision skipped', prog(A, 'alice', save({ codes: 400 }), 4));
await no('the same revision again', prog(A, 'alice', save({ codes: 400 }), 2));
await ok('codes may go down (spent)', prog(A, 'alice', save({ codes: 100 }), 3));
await no('negative codes', prog(A, 'alice', save({ codes: -5 }), 4));
await no('codes beyond 10⁹', prog(A, 'alice', save({ codes: 2e9 }), 4));
await no('fractional codes', prog(A, 'alice', save({ codes: 10.5 }), 4));
await no('codes as a string', prog(A, 'alice', save({ codes: '999' }), 4));
await no('an unknown achievement', prog(A, 'alice', save({ ach: { free_codes: 1 } }), 4));
await no('an unknown achievement waiting', prog(A, 'alice', save({ done: { free_codes: 1 } }), 4));
await no('an unknown key in the save', prog(A, 'alice', save({ cheat: 1 }), 4));
await no('the device\'s fields in the save', prog(A, 'alice', save({ ui: { fps: true } }), 4));
await no('a save without a field', prog(A, 'alice', (() => { const d = save(); delete d.codes; return d; })(), 4));
await no('another save version', prog(A, 'alice', save({ v: 5 }), 4));
await no('a huge list of purchases', prog(A, 'alice', save({ up: Object.fromEntries(Array.from({ length: 80 }, (_, i) => ['u' + i, 1])) }), 4));
await no('an extra field', prog(A, 'alice', save(), 4, 0, { codes: 9999 }));
await no('another schema', prog(A, 'alice', save(), 4, 0, { schema: 2 }));
await no('no device', prog(A, 'alice', save(), 4, 0, { device: '' }));
await no('writing someone else\'s progress', prog(B, 'alice', save({ codes: 9999 }), 4));
await ok('reading your own progress', getDoc(doc(A, 'progress', 'alice')));
await no('reading someone else\'s progress', getDoc(doc(B, 'progress', 'alice')));
await no('progress is not public', getDoc(doc(anon, 'progress', 'alice')));
// a reset of progress (docs/PLAN-FEEDBACK-27-10.md, stage 2): the next epoch, an empty save
await no('a reset that skips an epoch', prog(A, 'alice', save(), 4, 2));
await no('a string epoch', prog(A, 'alice', save(), 4, '1'));
await ok('a reset: epoch 1, empty save', prog(A, 'alice', save(), 4, 1));
await ok('the save grows in the new epoch', prog(A, 'alice', save({ codes: 30, runs: 1 }), 5, 1));
await no('going back an epoch', prog(A, 'alice', save(), 6, 0));
await no('progress created at a later epoch', prog(B, 'bob', save(), 1, 2));
// the old document ({ ach, epoch }, before stage 2) moves to the new shape at rev 1; the old shape is refused now
await env.withSecurityRulesDisabled(async (x) => { await setDoc(doc(x.firestore(), 'progress', 'bob'), { ach: ['surv_60'], epoch: 1, updatedAt: new Date() }); });
await no('the old shape is not written any more', setDoc(doc(B, 'progress', 'bob'), { ach: ['surv_60', 'kills_100'], epoch: 1, updatedAt: serverTimestamp() }));
await no('the old document moved at rev 2', prog(B, 'bob', save({ ach: { surv_60: 1 } }), 2, 1));
await ok('the old document moves to the new shape (rev 1, same epoch)', prog(B, 'bob', save({ ach: { surv_60: 1 } }), 1, 1));
await env.withSecurityRulesDisabled(async (x) => { await setDoc(doc(x.firestore(), 'banned', 'bob'), { reason: 'test' }); });
await no('a banned player cannot write', stats(B, 'bob', 'Bob', scope({ ...r1, games: 2 }), scope({ ...r1, games: 2 }), 'b2'));
await no('a banned player cannot write progress', prog(B, 'bob', save(), 2, 1));
await env.cleanup();
console.log(`rules: ${pass} ok, ${failN} wrong`); process.exit(failN ? 1 : 0);
