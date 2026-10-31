// live/cloud.js: the account and the leaderboards on Firebase (plan stage 5), ported from utreys-survivors (src/services/login.js,
// auth.js, run-stats.js, leaderboard.js, src/systems/run-records.js). Optional: without live/firebase-config.js (window.FIREBASE_CONFIG)
// the game runs offline as before. The SDK is loaded on demand from Google's CDN (the slice has no bundler). ?emu=1 runs against the
// local emulators (auth 9099, Firestore 8085) with a demo project. The menu reads CLOUD.state and CLOUD.board; the page calls
// CLOUD.onRun(run) once per counted run.
(() => {
  const SDK = 'https://www.gstatic.com/firebasejs/12.19.0/';
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
  const EMU = q.has('emu'), cfg = EMU ? { apiKey: 'demo-key', authDomain: 'demo-netsurvivors.firebaseapp.com', projectId: 'demo-netsurvivors', appId: 'demo' } : window.FIREBASE_CONFIG;
  const enabled = !!(cfg && cfg.apiKey && cfg.projectId && cfg.appId);
  // the maps with tables (the training centre is not ranked, as in the original), the metrics (records name the hero that set them)
  const MAPS = ['dc'];
  // the heroes a table can be filtered by (keep in step with knownHeroes() in firestore.rules and SIM.HEROES)
  const HEROES = ['utrace', 'traceability', 'serialization', 'ba', 'qa'];
  const METRICS = [
    { field: 'bestTime', title: 'Лучшее время смены', short: 'Время', fmt: 'time', hero: 'bestTimeHero' },
    { field: 'bestKills', title: 'Сбоев за смену', short: 'Сбои', fmt: 'count', hero: 'bestKillsHero' },
    { field: 'bestCodes', title: 'Кодов за смену', short: 'Коды', fmt: 'count', hero: 'bestCodesHero' },
    { field: 'victoryScore', title: 'Быстрая победа', short: 'Победа', fmt: 'victory', hero: 'victoryHero', hint: 'Чем раньше закрыт финальный босс, тем выше место' },
    { field: 'bestLvl', title: 'Лучший уровень', short: 'Уровень', fmt: 'count', hero: 'bestLvlHero' },
  ];
  const TOTALS = ['games', 'totalKills', 'totalCodes'], RECORDS = METRICS.map((m) => m.field), TABLE = 50, RANK_LIMIT = 1000, CACHE_MS = 60000;
  const VICTORY_BASE = 36000;                                  // victoryScore = VICTORY_BASE − the winning time in s (faster = higher)

  // ---------------- logins (src/services/login.js) ----------------
  const LOGIN_MIN = 3, LOGIN_MAX = 16, PASSWORD_MIN = 6, latin = /^[a-z0-9_-]+$/i, cyrillic = /^[а-яё0-9_-]+$/i;
  const normalizeLogin = (l) => String(l == null ? '' : l).normalize('NFC').trim();
  function loginError(l) { const v = normalizeLogin(l), n = [...v].length; if (n < LOGIN_MIN || n > LOGIN_MAX) return `Логин: от ${LOGIN_MIN} до ${LOGIN_MAX} символов`;
    if (latin.test(v) || cyrillic.test(v)) return null; if (/[a-z]/i.test(v) && /[а-яё]/i.test(v)) return 'Не смешивай кириллицу и латиницу'; return 'Логин: буквы, цифры, «_» и «-»'; }
  const passwordError = (p, r) => (typeof p !== 'string' || p.length < PASSWORD_MIN ? `Пароль: не короче ${PASSWORD_MIN} символов` : r !== undefined && r !== p ? 'Пароли не совпадают' : null);
  const loginKey = (l) => normalizeLogin(l).toLowerCase().replaceAll('ё', 'е');
  const loginEmail = (l) => [...new TextEncoder().encode(loginKey(l))].map((b) => b.toString(16).padStart(2, '0')).join('') + '@' + cfg.projectId + '.firebaseapp.com';
  const ERR = { 'auth/email-already-in-use': 'Логин занят', 'login-taken': 'Логин занят', 'auth/invalid-credential': 'Неверный логин или пароль', 'auth/wrong-password': 'Неверный логин или пароль',
    'auth/user-not-found': 'Неверный логин или пароль', 'auth/invalid-email': 'Неверный логин или пароль', 'auth/weak-password': `Пароль: не короче ${PASSWORD_MIN} символов`,
    'auth/too-many-requests': 'Слишком много попыток, подожди', 'auth/network-request-failed': 'Нет связи с сервером', 'auth/user-disabled': 'Аккаунт отключён',
    'auth/operation-not-allowed': 'Вход по паролю не включён в Firebase', unavailable: 'Нет связи с сервером', unknown: 'Нет связи с сервером', 'deadline-exceeded': 'Нет связи с сервером',
    'permission-denied': 'Сервер отклонил запрос' };
  const errText = (e) => ERR[e && e.code] || 'Не получилось, попробуй ещё раз';
  const fail = (s) => new Error(s);

  // ---------------- the SDK ----------------
  let loading = null;
  function sdk() {
    if (!enabled) return Promise.reject(fail('Firebase не настроен'));
    loading = loading || Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore-lite.js')]).then(([app, auth, fs]) => {
      const inst = app.initializeApp(cfg), a = auth.initializeAuth(inst, { persistence: [auth.indexedDBLocalPersistence, auth.browserLocalPersistence] }), db = fs.getFirestore(inst);
      if (EMU) { auth.connectAuthEmulator(a, 'http://127.0.0.1:9099', { disableWarnings: true }); fs.connectFirestoreEmulator(db, '127.0.0.1', 8085); }
      return { auth: a, db, authApi: auth, fs };
    });
    loading.catch(() => { loading = null; }); return loading;
  }

  // ---------------- the account (src/services/auth.js) ----------------
  // status: 'disabled' (no config) | 'loading' | 'guest' | 'signedIn' | 'error'
  const state = { status: enabled ? 'loading' : 'disabled', login: '', uid: '', busy: false, error: '' };
  let started = false, registering = false, typed = '';
  const listeners = new Set(), emit = () => listeners.forEach((f) => { try { f(state); } catch (_) {} });
  const set = (o) => { Object.assign(state, o); emit(); };
  async function createProfile(s, uid, login) {
    const { doc, runTransaction, serverTimestamp } = s.fs, key = loginKey(login);
    await runTransaction(s.db, async (tx) => { const claim = doc(s.db, 'logins', key), taken = await tx.get(claim);
      if (taken.exists() && taken.data().uid !== uid) throw Object.assign(new Error('login-taken'), { code: 'login-taken' });
      if (!taken.exists()) tx.set(claim, { uid });
      tx.set(doc(s.db, 'users', uid), { login: normalizeLogin(login), loginKey: key, createdAt: serverTimestamp() }); });
  }
  const decodeKey = (email) => { const hex = String(email || '').split('@')[0]; if (!/^(?:[0-9a-f]{2})+$/.test(hex)) return '';
    try { return new TextDecoder().decode(new Uint8Array(hex.match(/../g).map((b) => parseInt(b, 16)))); } catch (_) { return ''; } };
  async function onUser(s, user) {
    if (!user) { set({ status: 'guest', login: '', uid: '' }); return; } if (registering) return; let login = '';
    try { const { doc, getDoc } = s.fs, p = await getDoc(doc(s.db, 'users', user.uid)); if (p.exists()) login = p.data().login; else { login = typed || decodeKey(user.email); await createProfile(s, user.uid, login); } }
    catch (_) { login = login || typed || decodeKey(user.email); }
    set({ status: 'signedIn', uid: user.uid, login }); flush();
  }
  function start() { if (!enabled || started) return; started = true;
    sdk().then((s) => s.authApi.onAuthStateChanged(s.auth, (u) => onUser(s, u))).catch(() => { started = false; set({ status: 'error' }); }); }
  async function act(fn) { set({ busy: true, error: '' }); try { await fn(); set({ busy: false }); return true; } catch (e) { set({ busy: false, error: e.message || errText(e) }); return false; } }
  const register = (login, pass, rep) => act(async () => { const er = loginError(login) || passwordError(pass, rep); if (er) throw fail(er);
    const s = await sdk().catch(() => { throw fail('Нет связи с сервером'); }); registering = true;
    try { let c; try { c = await s.authApi.createUserWithEmailAndPassword(s.auth, loginEmail(login), pass); } catch (e) { throw fail(errText(e)); }
      try { await createProfile(s, c.user.uid, login); } catch (e) { await s.authApi.deleteUser(c.user).catch(() => {}); throw fail(errText(e)); }
      set({ status: 'signedIn', uid: c.user.uid, login: normalizeLogin(login) }); flush(); } finally { registering = false; } });
  const signIn = (login, pass) => act(async () => { if (loginError(login) || !pass) throw fail('Неверный логин или пароль');
    const s = await sdk().catch(() => { throw fail('Нет связи с сервером'); }); typed = normalizeLogin(login);
    try { await s.authApi.signInWithEmailAndPassword(s.auth, loginEmail(login), pass); } catch (e) { throw fail(errText(e)); } });
  // signing out clears the device (META.signedOut): the last changes go up first; without a connection the player is warned and
  // signs out only on a second press (force)
  const OUT_UNSAVED = 'Нет связи: несохранённое в аккаунт пропадёт. Нажмите «Выйти» ещё раз';
  const signOut = (force) => act(async () => {
    if (!force && window.META && META.unsynced) { await syncNow(); if (META.unsynced() || sync.pick) throw fail(OUT_UNSAVED); }
    const s = await sdk(); typed = ''; await s.authApi.signOut(s.auth); if (window.META && META.signedOut) META.signedOut(); });

  // ---------------- run statistics (src/systems/run-records.js, src/services/run-stats.js) ----------------
  const scope0 = () => Object.fromEntries([...TOTALS, ...RECORDS].map((k) => [k, 0]));
  const normScope = (s) => { const o = scope0(); if (s) for (const k in s) o[k] = s[k]; return o; };
  // one run added to a scope: totals grow, records only improve (with the hero that set them)
  function applyRun(prev, e) { const s = normScope(prev), improved = [];
    s.games += e.newGame ? 1 : 0; s.totalKills += e.kills; s.totalCodes += e.codes;
    const rec = { bestTime: e.time, bestKills: e.kills, bestCodes: e.codes, bestLvl: e.lvl, victoryScore: e.win ? Math.max(1, VICTORY_BASE - e.time) : 0 };
    for (const m of METRICS) if (rec[m.field] > s[m.field]) { s[m.field] = rec[m.field]; s[m.hero] = e.hero; improved.push(m.field); }
    return { scope: s, improved }; }
  const QKEY = 'ns_stats_queue_v1', readQ = () => { try { return JSON.parse(localStorage.getItem(QKEY) || '[]') || []; } catch (_) { return []; } },
    writeQ = (a) => { try { localStorage.setItem(QKEY, JSON.stringify(a.slice(-50))); } catch (_) {} };
  const last = { run: null, improved: [], places: {}, guest: false, queued: 0 };
  let guestRun = null, sending = null, again = false, retryT = null;
  async function write(s, uid, e) {
    const { doc, runTransaction, serverTimestamp } = s.fs, ref = doc(s.db, 'stats', uid);
    return runTransaction(s.db, async (tx) => { const user = await tx.get(doc(s.db, 'users', uid)), snap = await tx.get(ref);
      if (!user.exists()) throw Object.assign(new Error('no profile'), { code: 'no-profile' });
      const prev = snap.exists() ? snap.data() : null; if (prev && prev.lastRun && prev.lastRun.runId === e.runId) return null;    // written already
      const all = applyRun(prev && prev.all, e), map = applyRun(prev && prev.maps && prev.maps[e.map], e);
      // the hero's own scope over the ranked maps (docs/PLAN-FEEDBACK-27-10.md, stage 6); it starts with the first run after the update
      const h = e.hero, ph = (prev && prev.heroes) || {}, hero = applyRun(ph[h], e);
      tx.set(ref, { login: user.data().login, all: all.scope, maps: Object.assign({}, prev && prev.maps, { [e.map]: map.scope }), heroes: Object.assign({}, ph, { [h]: hero.scope }),
        lastRun: { map: e.map, runId: e.runId, hero: h }, updatedAt: serverTimestamp() });
      return { runId: e.runId, map: e.map, improved: all.improved.concat(map.improved.map((f) => e.map + ':' + f)), all: all.scope, mapScope: map.scope }; });
  }
  async function flushOnce() { const uid = state.uid, mine = readQ().filter((x) => x.uid === uid); if (!mine.length) return; const s = await sdk();
    for (const item of mine) { if (state.uid !== uid) return;
      try { const w = await write(s, uid, item.entry); if (w && w.runId === (last.run && last.run.runId)) { last.improved = w.improved; places(w); } }
      catch (e) { if (e && e.code !== 'permission-denied') throw e; console.warn('run refused by the server', item.entry.runId); }
      writeQ(readQ().filter((x) => !(x.uid === uid && x.entry.runId === item.entry.runId))); }
    cache.clear(); last.queued = readQ().length; emit(); }
  function flush() { if (state.status !== 'signedIn') return Promise.resolve(); if (sending) { again = true; return sending; }
    sending = (async () => { do { again = false; try { await flushOnce(); } catch (_) { clearTimeout(retryT); retryT = setTimeout(flush, 60000); last.queued = readQ().length; emit(); return; } } while (again); })()
      .finally(() => { sending = null; }); return sending; }
  // a counted run from the page (META.bank): queued for the signed-in player; a guest's latest run goes up if they sign in from its results
  function onRun(r) { if (!enabled || !MAPS.includes(r.map)) return;
    const e = { runId: (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).replace(/-/g, '').slice(0, 32), map: r.map, newGame: true,
      time: Math.floor(r.time), kills: r.kills | 0, codes: r.codes | 0, lvl: r.lvl | 0, win: !!r.win, hero: HEROES.includes(r.hero) ? r.hero : 'utrace' };
    last.run = e; last.improved = []; last.places = {}; last.guest = state.status !== 'signedIn';
    if (state.status === 'signedIn') { writeQ(readQ().concat([{ uid: state.uid, entry: e }])); flush(); } else guestRun = e; emit(); }
  // after signing in from a results screen, its run is sent too
  listeners.add(() => { if (state.status === 'signedIn' && guestRun) { writeQ(readQ().concat([{ uid: state.uid, entry: guestRun }])); guestRun = null; last.guest = false; flush(); } });

  // ---------------- the account's save (docs/PLAN-CLOUD-SAVE-31-10.md, stages 2–3) ----------------
  // progress/{uid} = { data, schema, rev, device, epoch, updatedAt }, readable only by its owner, after the original's cloud-progress.js:
  // data is the whole save but the device's own fields (META.SYNCED); rev grows by one with every write; the device remembers the rev
  // and the fingerprint of the save it last synced (META's D.cloud). Only the cloud changed → the cloud's is taken; only the device →
  // it goes up; both → the player chooses (sync.pick), and nothing is written until then. Codes are never added up, so two devices
  // cannot double them. A device with nothing to keep (new, or a guest who has not played) takes the account's as it is.
  // epoch counts the account's resets (stage 2 of docs/PLAN-FEEDBACK-27-10.md): a reset here goes up as the next epoch; a newer epoch
  // than this device saw means another device reset it, and this one resets too. The old document ({ ach, epoch }: the achievements
  // done, codes per device) is read once: its achievements join this device's save as claimed.
  const SCHEMA = 1;
  const device = (() => { try { let d = localStorage.getItem('ns_device'); if (!d) { d = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).replace(/-/g, '').slice(0, 24); localStorage.setItem('ns_device', d); } return d; }
    catch (_) { return 'device'; } })();
  // status: '' (signed out) | 'busy' | 'ok' | 'wait' (no connection, retried) | 'pick' (pick: the two saves' summaries)
  const sync = { status: '', pick: null };
  let syncBusy = null, syncAgain = false, force = '', soonT = null, retryS = null;
  function syncNow(choice) { if (choice) force = choice;
    if (state.status !== 'signedIn' || !window.META || !META.cloudSide || (sync.pick && !force)) return Promise.resolve(); if (syncBusy) { syncAgain = true; return syncBusy; }
    clearTimeout(soonT); clearTimeout(retryS); sync.status = 'busy'; emit();
    syncBusy = (async () => { do { syncAgain = false; const uid = state.uid, how = force, s = await sdk(), { doc, runTransaction, serverTimestamp } = s.fs, ref = doc(s.db, 'progress', uid);
      const r = await runTransaction(s.db, async (tx) => { const snap = await tx.get(ref), d = snap.exists() ? snap.data() : null, L = META.cloudSide(), mine = L.uid === uid;
        const ep = d ? d.epoch || 0 : 0, rev = d ? d.rev || 0 : 0;
        const put = (k, data, epoch) => { tx.set(ref, { data, schema: SCHEMA, rev: rev + 1, device, epoch, updatedAt: serverTimestamp() }); return { k, data, rev: rev + 1, epoch }; };
        if (mine && L.wipe) return put('up', L.data, d ? ep + 1 : 0);
        if (mine && ep > L.epoch) return { k: 'remote', epoch: ep };
        if (!d) return put('up', L.data, 0);
        if (!d.data) return put('down', META.withAch(L.data, d.ach), ep);                             // the old document
        const cloudNew = !mine || d.rev !== L.rev, hereNew = !L.empty && (!mine || L.now !== L.fp);
        if (how === 'device' || (hereNew && !cloudNew)) return put('up', L.data, ep);
        if (how === 'cloud' || cloudNew && !hereNew) return { k: 'down', data: d.data, rev, epoch: ep };
        if (!cloudNew) return { k: 'same', rev, epoch: ep };
        return { k: 'pick', here: L.sum, cloud: META.summary(d.data) }; });
      if (state.uid !== uid) continue;
      if (how && how === force) force = '';
      if (r.k === 'remote') { META.wipe({ remote: true, epoch: r.epoch }); syncAgain = true; continue; }   // then take what the account has done since
      if (r.k === 'pick') { sync.pick = { here: r.here, cloud: r.cloud }; continue; }
      sync.pick = null;
      if (r.k === 'up') META.cloudSet({ uid, epoch: r.epoch, rev: r.rev, data: r.data });
      else if (r.k === 'down') META.adopt(r.data, { uid, epoch: r.epoch, rev: r.rev });
      clearTimeout(soonT); } while (syncAgain); sync.status = sync.pick ? 'pick' : META.unsynced() ? 'wait' : 'ok'; })()
      .catch((e) => { console.warn('progress not synced', e && (e.code || e.message)); sync.status = 'wait'; clearTimeout(retryS); retryS = setTimeout(syncNow, 60000); })
      .finally(() => { syncBusy = null; emit(); });
    return syncBusy; }
  // META saves after every change: the account gets it ~2 s later (a run of purchases goes up as one write)
  const soon = () => { if (state.status !== 'signedIn' || sync.pick) return; clearTimeout(soonT); soonT = setTimeout(syncNow, 2000); };
  // once per sign-in (META also syncs when it loads, in case the account was ready first), on coming back to the tab and online
  let syncedUid = '';
  listeners.add(() => { if (state.status !== 'signedIn') { syncedUid = ''; sync.status = ''; sync.pick = null; } else if (state.uid !== syncedUid) { syncedUid = state.uid; syncNow(); } });
  if (typeof document !== 'undefined') { document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); }); addEventListener('online', () => syncNow()); }

  // ---------------- leaderboards (src/services/leaderboard.js) ----------------
  // a table is a metric over a scope: all maps or one, every hero or one (stage 6 of docs/PLAN-FEEDBACK-27-10.md: heroes.<h>). A hero's scope
  // covers the ranked maps; while only one map is ranked it is that map's too (firestore.rules: no per-map hero scopes)
  const cache = new Map(), base = (scope, hero) => (hero ? 'heroes.' + hero : scope === 'all' ? 'all' : 'maps.' + scope);
  const path = (scope, hero, f) => base(scope, hero) + '.' + f;
  const scopeOf = (data, scope, hero) => base(scope, hero).split('.').reduce((o, k) => (o && o[k]) || null, data) || {};
  const cached = (key, load) => { const h = cache.get(key); if (h && Date.now() - h.at < CACHE_MS) return h.v; const v = load(); cache.set(key, { at: Date.now(), v }); v.catch(() => cache.delete(key)); return v; };
  // places as in sports: equal values share a place, the next one skips (the same as «how many are above + 1», which place() counts)
  const ranked = (rows, first) => { rows.forEach((r, i) => { r.place = first === null ? null : i && r.value === rows[i - 1].value ? rows[i - 1].place : first + i; }); return rows; };
  const rowOf = (d, field, scope, hero) => { const data = d.data(), sc = scopeOf(data, scope, hero); return { uid: d.id, login: String(data.login || ''), value: sc[field] || 0, hero: sc[METRICS.find((m) => m.field === field).hero] || hero || '' }; };
  const top = (field, scope, hero) => cached('t|' + scope + '|' + hero + '|' + field, async () => { const s = await sdk(), { collection, query, where, orderBy, limit, getDocs } = s.fs, p = path(scope, hero, field);
    const snap = await getDocs(query(collection(s.db, 'stats'), where(p, '>', 0), orderBy(p, 'desc'), limit(TABLE)));
    return ranked(snap.docs.map((d) => rowOf(d, field, scope, hero)), 1); });
  const place = (field, scope, value, hero = '') => (!(value > 0) ? Promise.resolve(null) : cached('p|' + scope + '|' + hero + '|' + field + '|' + value, async () => { const s = await sdk(), { collection, query, where, limit, getCount } = s.fs;
    const n = (await getCount(query(collection(s.db, 'stats'), where(path(scope, hero, field), '>', value), limit(RANK_LIMIT)))).data().count; return n >= RANK_LIMIT ? Infinity : n + 1; }));
  // «рядом со мной»: the NEAR players above the player's value and the player with those just below (places counted from the player's)
  const NEAR = 5;
  const around = (field, scope, hero, value, myPlace) => cached('n|' + scope + '|' + hero + '|' + field + '|' + value, async () => { const s = await sdk(), { collection, query, where, orderBy, limit, getDocs } = s.fs, p = path(scope, hero, field);
    const [up, down] = await Promise.all([getDocs(query(collection(s.db, 'stats'), where(p, '>', value), orderBy(p, 'asc'), limit(NEAR))), getDocs(query(collection(s.db, 'stats'), where(p, '<=', value), where(p, '>', 0), orderBy(p, 'desc'), limit(NEAR + 1)))]);
    const above = up.docs.map((d) => rowOf(d, field, scope, hero)).reverse(), below = down.docs.map((d) => rowOf(d, field, scope, hero)), p0 = myPlace === Infinity ? null : myPlace;
    return ranked(above, p0 ? p0 - above.length : null).concat(ranked(below, p0)); });
  function places(w) { for (const f of w.improved.filter((f) => !f.includes(':'))) place(f, 'all', w.all[f]).then((p) => { last.places[f] = p; emit(); }).catch(() => {}); }
  // the leaderboard screen's data: loads on demand, the menu redraws from it; the filters are remembered on this device
  const BKEY = 'ns_board_v1', board = { metric: 0, scope: 'all', hero: '', near: false, rows: null, me: null, error: '', note: '', loading: false, key: '', at: 0, scroll: 0 };
  try { const b = JSON.parse(localStorage.getItem(BKEY) || '{}'); if (METRICS[b.metric]) board.metric = b.metric; if (b.scope === 'all' || MAPS.includes(b.scope)) board.scope = b.scope;
    if (HEROES.includes(b.hero)) board.hero = b.hero; board.near = !!b.near; } catch (_) {}
  function loadBoard(o = {}, fresh) { if (typeof o === 'number') o = { metric: o };                       // (an older call passed the metric alone)
    Object.assign(board, o); try { localStorage.setItem(BKEY, JSON.stringify({ metric: board.metric, scope: board.scope, hero: board.hero, near: board.near })); } catch (_) {}
    const m = METRICS[board.metric], { scope, hero, near } = board, key = [board.metric, scope, hero, near].join('|'); if (board.key !== key) board.scroll = 0; board.key = key;
    if (!enabled) { Object.assign(board, { rows: [], error: 'Таблицы появятся, когда будет подключён Firebase', loading: false }); emit(); return; }
    if (fresh) for (const k of [...cache.keys()]) if (k.includes('|' + scope + '|' + hero + '|' + m.field)) cache.delete(k);
    Object.assign(board, { loading: true, error: '', note: '' }); emit();
    (async () => { const s = await sdk(); let me = null;
      if (state.status === 'signedIn') { const { doc, getDoc } = s.fs, d = await getDoc(doc(s.db, 'stats', state.uid)), sc = d.exists() ? scopeOf(d.data(), scope, hero) : {}, v = sc[m.field] || 0;
        if (v > 0) me = { uid: state.uid, login: state.login, value: v, hero: sc[m.hero] || hero || '', place: await place(m.field, scope, v, hero) }; }
      let rows; if (near && me) rows = await around(m.field, scope, hero, me.value, me.place);
      else { rows = await top(m.field, scope, hero); if (near) board.note = state.status === 'signedIn' ? 'У вас ещё нет результата в этой таблице' : 'Войдите, чтобы увидеть себя и соседей'; }
      if (board.key !== key) return; Object.assign(board, { rows, me, loading: false, at: Date.now() }); emit(); })()
      .catch((e) => { if (board.key !== key) return; Object.assign(board, { loading: false, rows: [], error: errText(e) }); emit(); });
  }
  const fmt = (m, v) => (m.fmt === 'time' ? `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}` : m.fmt === 'victory' ? (() => { const t = VICTORY_BASE - v; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; })() : String(v));

  window.CLOUD = { enabled, emulator: EMU, state, last, board, METRICS, MAPS, HEROES, start, register, signIn, signOut, OUT_UNSAVED, onRun, flush, loadBoard, sync: () => syncNow(), soon, choose: (w) => syncNow(w), syncState: sync, fmt, subscribe: (f) => (listeners.add(f), () => listeners.delete(f)),
    // pure helpers for the tests
    _: { loginError, passwordError, loginKey, applyRun, normScope } };
  if (enabled) start();
})();
