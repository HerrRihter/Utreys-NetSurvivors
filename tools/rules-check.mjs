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
// progress/{uid}: the achievements (stage 6), and the rules' id list is the game's
{ const vm = await import('node:vm'), c = { console, Math, Date, JSON }; c.window = c; c.globalThis = c; vm.createContext(c);
  for (const f of ['course.js', 'edu.js', 'sim.js', 'ach.js']) vm.runInContext(fs.readFileSync(path.join(root, 'live', f), 'utf8'), c);
  const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8'), known = rules.match(/function knownAch\(\) \{\s*return \[([^\]]*)\]/)[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
  const game = c.ACH.LIST.map((x) => x.id), same = known.length === game.length && game.every((id) => known.includes(id));
  if (same) pass++; else { failN++; console.log('FAIL the rules\' knownAch differs from live/ach.js', game.filter((id) => !known.includes(id)), known.filter((id) => !game.includes(id))); } }
const prog = (db, uid, ach, epoch) => setDoc(doc(db, 'progress', uid), epoch === undefined ? { ach, updatedAt: serverTimestamp() } : { ach, epoch, updatedAt: serverTimestamp() });
const C = env.authenticatedContext('carol').firestore();
await no('progress without a profile', prog(C, 'carol', ['surv_60']));
await ok('first achievements', prog(A, 'alice', ['kills_100', 'surv_60']));
await ok('the list grows', prog(A, 'alice', ['kills_100', 'surv_180', 'surv_60']));
await no('an achievement taken back', prog(A, 'alice', ['kills_100', 'surv_180']));
await no('an unknown id', prog(A, 'alice', ['kills_100', 'surv_180', 'surv_60', 'free_codes']));
await no('the same id twice', prog(A, 'alice', ['kills_100', 'surv_180', 'surv_60', 'surv_60']));
await no('an extra field', setDoc(doc(A, 'progress', 'alice'), { ach: ['kills_100', 'surv_180', 'surv_60'], codes: 9999, updatedAt: serverTimestamp() }));
await no('writing someone else\'s progress', prog(B, 'alice', ['kills_100', 'surv_180', 'surv_60', 'win_1']));
await ok('reading your own progress', getDoc(doc(A, 'progress', 'alice')));
await no('reading someone else\'s progress', getDoc(doc(B, 'progress', 'alice')));
await no('progress is not public', getDoc(doc(anon, 'progress', 'alice')));
// a reset of progress (docs/PLAN-FEEDBACK-27-10.md, stage 2): the next epoch may start from an empty list
await no('a reset that skips an epoch', prog(A, 'alice', [], 2));
await no('a string epoch', prog(A, 'alice', [], '1'));
await ok('a reset: epoch 1, empty list', prog(A, 'alice', [], 1));
await ok('the list grows in the new epoch', prog(A, 'alice', ['surv_60'], 1));
await no('an achievement taken back in the new epoch', prog(A, 'alice', [], 1));
await no('going back an epoch', prog(A, 'alice', ['kills_100', 'surv_180', 'surv_60'], 0));
await no('a write without the epoch after a reset', prog(A, 'alice', ['surv_180', 'surv_60']));
await no('progress created at a later epoch', prog(B, 'bob', ['surv_60'], 2));
await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), 'banned', 'bob'), { reason: 'test' }); });
await no('a banned player cannot write', stats(B, 'bob', 'Bob', scope({ ...r1, games: 2 }), scope({ ...r1, games: 2 }), 'b2'));
await no('a banned player cannot write progress', prog(B, 'bob', ['surv_60']));
await env.cleanup();
console.log(`rules: ${pass} ok, ${failN} wrong`); process.exit(failN ? 1 : 0);
