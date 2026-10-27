// live/meta.js: everything between runs, modelled on utreys-survivors (docs/META-PROGRESSION.md, data/upgrades.js):
// the wallet of marking codes, the shop of permanent upgrades (price 30 × next rank), records, the collection of what was seen,
// and the menu screens' state and layout. The scene draws the screens from META.view(); index.html routes input here while
// no run is going and calls META.bank(run) once when a run ends or is left. Saved in localStorage ('ns_meta_v4'); the achievements are live/ach.js.
(() => {
  const KEY = 'ns_meta_v4', KEY_V3 = 'ns_meta_v3', KEY_V2 = 'ns_meta_v2', KEY_V1 = 'ns_meta_v1', KEY_BAK = 'ns_meta_backup';
  // the screens' logical size: 1920×1080, or 960×540 drawn 2× larger on phones and tablets (U = 2, stage 7б of docs/PLAN-FEEDBACK-27-10.md).
  // The page passes pointer positions in view px; they are divided by U here. CP: the compact layouts are in use.
  let U = 1, W = 1920, H = 1080, CP = false;
  const setUI = (u) => { U = u > 1 ? 2 : 1; W = 1920 / U; H = 1080 / U; CP = U > 1; };
  const UPG = [
    { id: 'health', name: 'Буфер памяти', desc: '+10 HP к стабильности ядра', max: 5, ic: 'ic_hp' },
    { id: 'power', name: 'Пропускная способность', desc: '+5% ко всему урону', max: 5, ic: 'ic_power' },
    { id: 'speed', name: 'Тактовая частота', desc: '+3% к скорости', max: 5, ic: 'ic_speed' },
    { id: 'haste', name: 'Многопоточность', desc: '−4% к перезарядке', max: 5, ic: 'ic_haste' },
    { id: 'range', name: 'Радиус сканирования', desc: '+4% к радиусу и дальности', max: 5, ic: 'ic_area' },
    { id: 'magnet', name: 'Сбор пакетов', desc: '+10% к радиусу сбора', max: 5, ic: 'ic_magnet' },
    { id: 'armor', name: 'Криптозащита', desc: '−1 входящего урона (минимум 1)', max: 3, ic: 'ic_amount' },
    { id: 'regen', name: 'Автовосстановление', desc: '+0,15 HP в секунду', max: 5, ic: 'heal' },
    { id: 'greed', name: 'Монетизация', desc: '+5% кодов в конце смены', max: 5, ic: 'code_tex' },
    { id: 'luck', name: 'Удачный парсинг', desc: '+0,2 п.п. к шансу кода, +0,1 п.п. к лечилке', max: 5, ic: 'gem_c' },
    { id: 'head', name: 'Предзагрузка', desc: 'Смена начинается с выбора улучшения', max: 2, ic: 'chest' },
    { id: 'rerolls', name: 'Перегенерация', desc: '+1 перегенерация карточек за смену', max: 3, ic: 'ic_retry' },
    { id: 'skips', name: 'Отложенный релиз', desc: '+1 пропуск выбора за смену', max: 3, ic: 'ic_dur' },
  ];
  // save v2 (plan stage 0): v1 plus owned heroes and skins, the chosen hero / skin / map, opened maps, records per map and per hero
  // save v3 (achievements, docs/PLAN-ACHIEVEMENTS.md): v2 plus st, the run facts summed over all counted runs (sim's S.fx), and ach,
  // the achievements done (reward paid). v2 → v3 keeps everything; st starts at zero, and the achievements that v2's totals and records
  // already meet are done on load.
  // save v4 (docs/PLAN-FEEDBACK-27-10.md, stage 4): achievements are claimed by hand. ach is now the claimed ones; done the ones met and
  // waiting (1 here, 2 from the account's other device); fresh the content a claim opened, until it is looked at. v3 → v4: everything
  // v3 had done was paid and opened, so it is claimed; what v3's totals meet beyond that (the new achievements) waits to be claimed.
  const rec0 = () => ({ time: 0, kills: 0, lvl: 0, wins: 0, runs: 0 });
  const st0 = () => ({ bosses: 0, casts: 0, heals: 0, evos: 0, evoMax: 0, calmMax: 0, noHealWins: 0, eduWins: 0, eduTop: 0, foes: {}, codes: 0, noCastWins: 0, winMin: 0 });
  const fresh = () => ({ v: 4, st: st0(), ach: {}, done: {}, fresh: {}, codes: 0, up: {}, runs: 0, wins: 0, kills: 0, time: 0, best: { time: 0, kills: 0, lvl: 0 }, seen: { w: { trace: 1 }, e: {}, p: {} },
    heroes: { utrace: 1 }, skins: {}, sel: { hero: 'utrace', skin: null, skins: {}, map: 'dc', course: null }, maps: { dc: 1, edu: 1 }, byMap: {}, byHero: {}, byCourse: {}, ui: { fps: false },
    cloud: { uid: '', epoch: 0, wipe: false } });   // cloud: the account this save last synced with, that account's reset count, a reset still to send
  // a loaded save, normalised against the current shape (missing fields get defaults, so older saves and future fields both load)
  const norm = (s) => { const f = fresh(); return Object.assign(f, s, { v: 4, st: Object.assign(f.st, s.st, { foes: Object.assign({}, s.st && s.st.foes) }), ach: Object.assign({}, s.ach), done: Object.assign({}, s.done), fresh: Object.assign({}, s.fresh), best: Object.assign(f.best, s.best), seen: Object.assign(f.seen, s.seen),
    heroes: Object.assign(f.heroes, s.heroes), skins: Object.assign({}, s.skins), sel: Object.assign(f.sel, s.sel, { skins: Object.assign({}, s.sel && s.sel.skins) }), maps: Object.assign(f.maps, s.maps),
    byMap: Object.assign({}, s.byMap), byHero: Object.assign({}, s.byHero), byCourse: Object.assign({}, s.byCourse), ui: Object.assign(f.ui, s.ui), cloud: Object.assign(f.cloud, s.cloud) }); };
  let D = fresh();
  // the newest save found wins; older keys stay as backups (v1 → v2 → v3 → v4: everything carries over)
  try { const rd = (k) => JSON.parse(localStorage.getItem(k) || 'null'), s4 = rd(KEY), s3 = s4 ? null : rd(KEY_V3), s2 = s4 || s3 ? null : rd(KEY_V2), s1 = s4 || s3 || s2 ? null : rd(KEY_V1);
    if (s4 && s4.v === 4) D = norm(s4); else if (s3 && s3.v === 3) D = norm(s3); else if (s2 && s2.v === 2) D = norm(s2); else if (s1 && s1.v === 1) D = norm(s1);
  } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (_) {} };
  // achievements already met by the loaded save (a v3 save's totals, or a list that grew) are done now, waiting to be claimed
  const achNew = window.ACH ? ACH.check(D) : [];
  if (achNew.length) save();
  // the cloud's side (CLOUD.syncAch): this device's done ids, and the cloud's merged in. The cloud's wait to be claimed here without
  // codes (paid on the device that did them); returns how many this then completed here, so the cloud gets them too.
  const achIds = () => (window.ACH ? [...new Set([...Object.keys(D.ach), ...Object.keys(D.done)])].filter((id) => ACH.BY[id]) : []);
  // the reset of progress (docs/PLAN-FEEDBACK-27-10.md, stage 2): everything but the device's settings starts over. The save before it
  // is kept for one undo (until the next counted shift). The account's cloud list is reset too: here (a reset to send on the next
  // sync, if this save belongs to an account), or from another device (CLOUD sees the account's reset count grow, remote: true).
  const note = (s) => { const h = typeof document !== 'undefined' && document.getElementById('hint'); if (!h) return; clearTimeout(note.t); h.textContent = s; h.style.opacity = 1;
    if (CP) Object.assign(h.style, { top: '0', bottom: 'auto', background: '#01060ae0', padding: '8px 12px' }); else h.style.bottom = '10vh';   // above «Esc — назад»; on phones at the top
    note.t = setTimeout(() => { h.style.opacity = 0; Object.assign(h.style, { top: '', bottom: '', background: '', padding: '' }); }, 5000); };
  function wipe(o = {}) {
    try { localStorage.setItem(KEY_BAK, JSON.stringify(D)); } catch (_) {}
    const ui = D.ui, cl = D.cloud; D = fresh(); D.ui = ui;
    D.cloud = o.remote ? { uid: cl.uid, epoch: o.epoch, wipe: false } : { uid: cl.uid, epoch: cl.epoch, wipe: !!cl.uid };
    last = null; banked = null; liveShown = new Set(); if (!o.remote) go('set', true); save();
    dispatchEvent(new Event('ns-wipe'));                                                            // the page drops a kept shift
    if (o.remote) note('Прогресс аккаунта сброшен на другом устройстве · отменить можно в «Настройках»');
    else if (window.CLOUD && CLOUD.syncAch) CLOUD.syncAch();
  }
  const canUndo = () => { try { return !!localStorage.getItem(KEY_BAK); } catch (_) { return false; } };
  function undoWipe() { let b = null; try { b = JSON.parse(localStorage.getItem(KEY_BAK) || 'null'); } catch (_) {} if (!b) return false;
    const cl = D.cloud; D = norm(b); D.cloud = { uid: cl.uid, epoch: cl.epoch, wipe: false };      // the cloud's reset stands; the list grows back on the sync
    try { localStorage.removeItem(KEY_BAK); } catch (_) {} save(); if (window.CLOUD && CLOUD.syncAch) CLOUD.syncAch(); return true; }
  // a claim (a press on a done achievement, or on the content it opens): codes, content opened and marked new; a line under the menu
  function claim(id) { const r = window.ACH && ACH.claim(D, id); if (!r) return null; save(); sfx('level');
    note('Получено: «' + r.x.title + '»' + (r.codes ? ' · +' + r.codes + ' кодов' : '') + (r.opened.length ? ' · открыто: ' + r.opened.join(', ') : '')); return r; }
  function claimAll() { const xs = window.ACH ? ACH.waiting(D) : []; if (!xs.length) return 0; let codes = 0, op = [];
    for (const x of xs) { const r = ACH.claim(D, x.id); if (r) { codes += r.codes; op = op.concat(r.opened); } } ACH.check(D);
    for (const x of ACH.waiting(D)) { const r = ACH.claim(D, x.id); if (r) { codes += r.codes; op = op.concat(r.opened); } }   // Платина, met by the claims
    save(); sfx('level'); note('Получено достижений: ' + xs.length + (codes ? ' · +' + codes + ' кодов' : '') + (op.length ? ' · открыто: ' + (op.length > 3 ? op.slice(0, 3).join(', ') + ' и ещё ' + (op.length - 3) : op.join(', ')) : '')); return xs.length; }
  // the content key of a menu item ('kind:id'), for its «новое» mark; null for items that open nothing
  const itemKey = (o) => (o.chip ? (o.chip === 'none' ? null : 'skin:' + o.chip) : o.skin ? 'skin:' + o.skin : o.hero && !o.tab ? 'hero:' + o.hero : o.u ? 'u:' + o.u.id : (o.kind === 'w' || o.kind === 'p') ? o.kind + ':' + o.k : null);
  // leaving a screen (or a tab) means its new content was seen
  function seenHere() { if (!D.fresh || !Object.keys(D.fresh).length) return; let n = 0;
    for (const o of items()) { const k = itemKey(o); if (k && D.fresh[k]) { delete D.fresh[k]; n++; } if (o.u && D.fresh['ranks:up']) { delete D.fresh['ranks:up']; n++; } }
    if (n) save(); }
  // something waits on a screen: an achievement to claim, content to claim or new content (the main menu marks its line)
  const waitingN = () => (window.ACH ? ACH.waiting(D).length : 0);
  const shopNews = () => Object.keys(D.fresh).some((k) => /^(hero|skin|u|ranks):/.test(k)) || (window.ACH && ACH.waiting(D).some((x) => ['hero', 'skin', 'u', 'ranks'].some((kd) => x.unlocks[kd])));
  const collNews = () => Object.keys(D.fresh).some((k) => /^(w|p):/.test(k)) || (window.ACH && ACH.waiting(D).some((x) => x.unlocks.w || x.unlocks.p));
  // CLOUD.syncAch's view of this save, and what it settled
  const cloudSide = () => Object.assign({ ids: achIds() }, D.cloud);
  const cloudSet = (o) => { Object.assign(D.cloud, o); save(); };
  function mergeAch(ids) { if (!window.ACH) return 0; let n = 0;
    for (const id of ids || []) if (ACH.BY[id] && !D.ach[id] && !D.done[id]) { D.done[id] = 2; n++; }
    const more = ACH.check(D); if (n || more.length) save(); return more.length; }
  const lvl = (id) => D.up[id] || 0;
  const price = (u) => 30 * (lvl(u.id) + 1);
  const locked = (u) => !lvl(u.id) && !open('u', u.id);                                 // ranks bought before stay; the rest waits for its achievement
  // content opened by achievements (live/ach.js): heroes and skins are bought only once open; ranks above 3 wait for their achievement
  const open = (kind, id) => !window.ACH || ACH.isOpen(D, kind, id);
  const cap = (u) => (open('ranks', 'up') ? u.max : Math.min(u.max, 3));
  const TR_MAX = 3, trPrice = (h) => 50 * (lvl('tr_' + h) + 1);
  const spent = () => UPG.reduce((a, u) => { for (let i = 0; i < lvl(u.id); i++) a += 30 * (i + 1); return a; }, 0)
    + Object.keys(SIM.HEROES).reduce((a, h) => { for (let i = 0; i < lvl('tr_' + h); i++) a += 50 * (i + 1); return a; }, 0);
  const owns = (h) => !!D.heroes[h];
  const sfx = (n) => window.AUDIO && AUDIO.effect && AUDIO.effect(n);

  // ---------------- runs ----------------
  const mods = () => Object.assign(Object.fromEntries(UPG.map((u) => [u.id, lvl(u.id)])), Object.fromEntries(Object.keys(SIM.HEROES).map((h) => ['tr_' + h, lvl('tr_' + h)])));
  let banked = null, last = null;
  // codes as in the original: those collected in the run + 1 for every 10th kill, × Монетизация
  function bank(S) {
    if (!S || S.demo || banked === (S.over || S)) return; banked = S.over || S;
    const base = (S.bars || 0) + Math.floor((S.kills || 0) / 10), earned = Math.round(base * (1 + 0.05 * lvl('greed')));
    const rec = { time: S.t > D.best.time, kills: S.kills > D.best.kills, lvl: S.lvl > D.best.lvl }, win = S.over && S.over.k === 'win';
    const finds = [];
    for (const k in S.got || {}) { const evo = SIM.WEAP[k] && SIM.WEAP[k].evo, box = evo ? D.seen.e : D.seen.w; if (!box[k]) { box[k] = 1; finds.push(k); } }
    for (const k in S.ps || {}) if (S.ps[k] > 0 && !D.seen.p[k]) { D.seen.p[k] = 1; finds.push(k); }
    D.codes += earned; D.st.codes += earned; const counted = !!S.over || (S.t || 0) >= 10;                     // as in the original: a run quit before 10 s is not counted
    if (counted) { D.runs++; D.kills += S.kills || 0; D.time += S.t || 0; if (win) D.wins++; try { localStorage.removeItem(KEY_BAK); } catch (_) {} }
    D.best.time = Math.max(D.best.time, S.t || 0); D.best.kills = Math.max(D.best.kills, S.kills || 0); D.best.lvl = Math.max(D.best.lvl, S.lvl || 0);
    if (counted) for (const [box, k] of [[D.byMap, S.map || 'dc'], [D.byHero, S.hero || 'utrace']]) { const r = box[k] = Object.assign(rec0(), box[k]);
      r.time = Math.max(r.time, S.t || 0); r.kills = Math.max(r.kills, S.kills || 0); r.lvl = Math.max(r.lvl, S.lvl || 0); r.runs++; if (win) r.wins++; }
    let edu = null;
    if (S.ed && window.EDU) { edu = EDU.summary(S.ed); edu.room = S.room; edu.rooms = COURSE.rooms.length;                // the training centre's report card
      if (counted) { const c = D.byCourse[S.ed.course] = Object.assign({ runs: 0, wins: 0, best: 0, points: 0, grade: '' }, D.byCourse[S.ed.course]); c.runs++; if (win) c.wins++;
        if (edu.answered && edu.score >= c.best) { c.best = edu.score; c.grade = edu.grade; } c.points = Math.max(c.points, edu.points); edu.newBest = edu.answered && c.best === edu.score; } }
    if (counted) { const F = S.fx || {}, T = D.st;                                                 // the run's facts into the lifetime ones
      T.bosses += F.boss || 0; T.casts += F.cast || 0; T.heals += F.heal || 0; T.evos += F.evo || 0; T.evoMax = Math.max(T.evoMax, F.evo || 0);
      T.calmMax = Math.max(T.calmMax, F.calm || 0, (S.t || 0) - Math.max(0, S.hurtT === undefined ? 0 : S.hurtT));      // the stretch still going at the end counts too
      for (const k in F.foe || {}) T.foes[k] = (T.foes[k] || 0) + F.foe[k];
      if (win && !F.heal) T.noHealWins++;
      if (win && !F.cast) T.noCastWins++;
      if (win && (S.map || 'dc') === 'dc') T.winMin = T.winMin ? Math.min(T.winMin, S.t || 0) : S.t || 0;
      if (win && edu) { T.eduWins++; if (edu.answered && edu.grade === EDU.C.grading.grades[0].name) T.eduTop++; } }
    const ach = window.ACH ? ACH.check(D) : [];                                                     // done by this run, waiting to be claimed
    last = { over: S.over, earned, base, total: D.codes, rec: rec.time || rec.kills, finds, win, edu, map: S.map, ach, opened: [] };
    if (counted && window.CLOUD) CLOUD.onRun({ map: S.map || 'dc', time: S.t || 0, kills: S.kills || 0, codes: earned, lvl: S.lvl || 0, win, hero: S.hero });
    if (ach.length && window.CLOUD && CLOUD.syncAch) CLOUD.syncAch();                                 // the new achievements into the profile
    save();
  }

  // goals met during a shift: the shift's progress added to the lifetime one, checked once a second; each goal toasts once per shift.
  // Only a toast: the achievement is done (and paid) when the shift is banked. Shift counts and wins wait for the bank.
  let liveRun = null, liveT = 0, liveShown = new Set();
  function live(S) {
    if (!window.ACH || !S || S.demo || S.over) return;
    if (liveRun !== S.wt0) { liveRun = S.wt0; liveShown = new Set(); liveT = S.t; }
    if (S.t - liveT < 1) return; liveT = S.t;
    const F = S.fx || {}, T = D.st;
    const P = Object.assign({}, D, { kills: D.kills + (S.kills || 0), best: { time: Math.max(D.best.time, S.t || 0), kills: D.best.kills, lvl: Math.max(D.best.lvl, S.lvl || 0) },
      st: Object.assign({}, T, { bosses: T.bosses + (F.boss || 0), casts: T.casts + (F.cast || 0), evos: T.evos + (F.evo || 0), evoMax: Math.max(T.evoMax, F.evo || 0),
        calmMax: Math.max(T.calmMax, F.calm || 0, (S.t || 0) - Math.max(0, S.hurtT === undefined ? 0 : S.hurtT)) }) });
    const got = ACH.LIST.filter((x) => x.id !== 'all' && !D.ach[x.id] && !D.done[x.id] && !liveShown.has(x.id) && ACH.progress(P, x).done);
    if (!got.length) return; got.forEach((x) => liveShown.add(x.id));
    S.toast = { s: 'ДОСТИЖЕНИЕ: ' + got[0].title.toUpperCase() + (got.length > 1 ? ' и ещё ' + (got.length - 1) : '') + ' · заберите в меню', t: S.t, good: 1 }; sfx('level');
  }

  // ---------------- screens: layout shared with the scene (rects in view px) ----------------
  let scr = 'main', sel = 0, hov = -1, hovBack = false, armedReset = 0, armedQuit = 0, tab = 'up', focus = 'utrace';   // focus: the hero whose skins the hero screen lists
  let ctab = 'items', acat = 'survival';                         // the collection's tab (items / foes), the achievements screen's category
  const skinsOf = (h) => Object.keys(SIM.SKINS).filter((k) => SIM.SKINS[k].hero === h), ownsSkin = (k) => !!D.skins[k];
  // the maps (plan stage 3): the minimap is drawn by the scene from a generated layout; the training centre is open from the start, as in the original
  const MAPS = [{ id: 'dc', name: 'Дата-центр Utrace', desc: 'Пять компонентов вокруг ядра: в каждом свой баг. Победи бага или продержись 30 с в его круге, затем закрой «Отказ дата-центра».', note: 'Каждая смена — новая раскладка' },
    { id: 'edu', name: 'Учебный центр', desc: 'Три случайных лабиринта с терминалами-тестами, затем центральный зал с боссом курса.', note: 'Терминалы под охраной багов · тест 3 вопроса, нужно 2 верных · знания дают вторую жизнь' }];
  const MAIN = [['start', 'Начать смену'], ['shop', 'Магазин'], ['coll', 'Коллекция'], ['ach', 'Достижения'], ['rec', 'Рекорды'], ['lead', 'Лидеры'], ['set', 'Настройки'], ['quit', 'Выход']];
  const C = () => window.CLOUD || null;
  // a shift kept for later (the page holds the run itself): { hero, map, t, room } for the menu's «Продолжить смену», or null
  let susp = null;
  // the pause menu over a running shift
  const pz = { open: false, sel: 0 };
  const cut = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const pauseItems = () => { const P = window.AUDIO ? AUDIO.pref : { musicOn: true, enabled: true, repeat: false }, tr = window.AUDIO && AUDIO.current;
    return [['resume', 'Продолжить · Esc'], ['track', 'Трек: ' + cut(tr ? tr.title : '—', 24) + '  ▶▶'], ['repeat', 'Повтор трека: ' + (P.repeat ? 'вкл' : 'выкл')], ['music', 'Музыка: ' + (P.musicOn ? 'вкл' : 'выкл')],
      ['sound', 'Звук: ' + (P.enabled ? 'вкл' : 'выкл')], ['menu', 'Выйти в меню · смена сохранится'], ['end', 'Завершить смену · коды зачтутся']]
      .map(([id, s], i) => ({ id, s, r: CP ? [W / 2 - 290, 70 + i * 66, 580, 62] : [W / 2 - 340, 286 + i * 82, 680, 68] })); };
  function pauseAct(i) { const it = pauseItems()[i]; if (!it) return null; sfx('ui');
    if (it.id === 'music' || it.id === 'sound') { if (window.AUDIO) AUDIO.toggle(it.id === 'music' ? 'music' : 'sound'); return null; }
    if (it.id === 'track') { if (window.AUDIO) AUDIO.nextTrack(); return null; }
    if (it.id === 'repeat') { if (window.AUDIO) AUDIO.toggleRepeat(); return null; }
    pz.open = false; return it.id; }
  const PAUSE = { open: () => { pz.open = true; pz.sel = 0; sfx('ui'); }, close: () => { pz.open = false; }, get isOpen() { return pz.open; },
    key: (c) => { const n = pauseItems().length; if (c === 'ArrowUp' || c === 'KeyW') { pz.sel = (pz.sel + n - 1) % n; sfx('ui'); } else if (c === 'ArrowDown' || c === 'KeyS') { pz.sel = (pz.sel + 1) % n; sfx('ui'); }
      else if (c === 'Enter' || c === 'Space') return pauseAct(pz.sel); else if (c === 'Escape') { pz.open = false; return 'resume'; } return null; },
    click: (x, y) => { x /= U; y /= U; const it = pauseItems(); for (let i = 0; i < it.length; i++) if (inR(it[i].r, x, y)) { pz.sel = i; return pauseAct(i); } return null; },
    move: (x, y) => { x /= U; y /= U; pauseItems().forEach((o, i) => { if (inR(o.r, x, y)) pz.sel = i; }); },
    view: () => ({ open: pz.open, sel: pz.sel, items: pauseItems() }) };
  // settings rows: volumes are sliders (arrows ←→, click or drag on the bar), the rest are switches
  const SET = [['music', 'Громкость музыки', 'slider'], ['effects', 'Громкость эффектов', 'slider'], ['musicOn', 'Музыка', 'toggle'], ['enabled', 'Звуки', 'toggle'], ['fps', 'Показывать FPS', 'toggle'],
    ['wipe', 'Сбросить прогресс', 'action'], ['undo', 'Отменить сброс', 'action']];
  const bar = (r) => [r[0] + 470, r[1] + 23, 430, 26];
  const A = () => window.AUDIO || null;
  const COLL = () => { const W0 = Object.keys(SIM.WEAP).filter((k) => !SIM.WEAP[k].evo), E0 = Object.keys(SIM.WEAP).filter((k) => SIM.WEAP[k].evo), P0 = Object.keys(SIM.PASS);
    return [...W0.map((k) => ({ k, kind: 'w', row: 0 })), ...E0.map((k) => ({ k, kind: 'e', row: 1 })), ...P0.map((k) => ({ k, kind: 'p', row: 2 }))]; };
  function items() { return CP ? itemsC() : itemsD(); }
  // ---------------- the compact layouts (stage 7б: 960×540 logical, drawn 2× on phones and tablets) ----------------
  // Every target is at least 62 logical px tall (44 CSS px on a 390 px tall phone). Cards keep their desktop size (their texts are
  // then twice as large on screen); the grids get fewer columns and the content below the header scrolls (a finger drag, the wheel,
  // the arrows follow the selection). Content items carry sc: their rects move with the scroll; off: out of view (not drawn, not hit).
  const CT = 100, TAB = (id, extra, x, w) => Object.assign({ id, r: [x, 92, w, 62] }, extra);
  const grid = (list, cols, cw, ch, g, top, mk) => { const x0 = Math.round((W - (cols * cw + (cols - 1) * g)) / 2);
    return list.map((v, i) => Object.assign(mk(v, i), { sc: 1, r: [x0 + (i % cols) * (cw + g), top + Math.floor(i / cols) * (ch + g), cw, ch] })); };
  const scroll = {};   // per screen (and tab): the content's offset
  const scKey = () => scr + ':' + (scr === 'shop' ? tab : scr === 'coll' ? ctab : scr === 'ach' ? acat : '');
  let area = [CT, 540];
  function scrolled(list, top, bottom) { area = [top, bottom]; const k = scKey(), sc = list.filter((o) => o.sc), end = sc.reduce((m, o) => Math.max(m, o.r[1] + o.r[3]), top);
    const mx = Math.max(0, end - bottom + 8), v = scroll[k] = Math.max(0, Math.min(mx, scroll[k] || 0)); area.push(mx, v);
    for (const o of sc) { o.r = [o.r[0], o.r[1] - v, o.r[2], o.r[3]]; o.off = o.r[1] + o.r[3] < top + 4 || o.r[1] > bottom - 4 ? 1 : 0; }   // partly visible: drawn clipped
    return list; }
  function scrollBy(d) { const k = scKey(); items(); if (!area[2]) return false; const v0 = scroll[k] || 0; scroll[k] = Math.max(0, Math.min(area[2], v0 + d)); return scroll[k] !== v0; }
  // keeps the selected item in view (keyboard navigation in a scrolled list)
  function reveal() { if (!CP) return; const o = items()[sel]; if (!o || !o.sc) return; const [top, bottom] = area, k = scKey();
    if (o.r[1] < top) scroll[k] = (scroll[k] || 0) - (top - o.r[1]) - 8; else if (o.r[1] + o.r[3] > bottom) scroll[k] = (scroll[k] || 0) + (o.r[1] + o.r[3] - bottom) + 8; }
  function itemsC() { area = [CT, 540, 0, 0];
    if (scr === 'main') { const L0 = susp ? [['resume', 'Продолжить смену'], ...MAIN] : MAIN, wn = waitingN(), rows = Math.ceil(L0.length / 2), dy = rows > 4 ? 70 : 76;
      const tag = (id, s) => (id === 'quit' && armedQuit ? 'Выйти? Ещё раз' : id === 'ach' && wn ? s + ' · ' + wn : id === 'shop' && shopNews() ? s + ' •' : id === 'coll' && collNews() ? s + ' •' : s);
      return [...L0.map(([id, s], i) => ({ id, s: tag(id, s), news: (id === 'ach' && wn) || (id === 'shop' && shopNews()) || (id === 'coll' && collNews()) ? 1 : 0, quit: id === 'quit' ? armedQuit : undefined,
        r: [16 + (i % 2) * 292, 104 + Math.floor(i / 2) * dy, 282, 62] })), { id: 'acct', acct: 1, r: [612, 462, 332, 62] }]; }
    if (scr === 'lead') { const cl = C(), ms = cl ? cl.METRICS : [], hs = cl ? cl.HEROES : [], g = 8, out = []; let x = 12;
      ms.forEach((m, i) => out.push({ id: 'lm' + i, metric: i, s: m.short, r: [12 + i * 154, 92, 146, 62] }));
      out.push({ id: 'lref', refresh: 1, s: 'Обновить', r: [W - 162, 92, 150, 62] });
      for (const [sc, s0] of [['all', 'Все карты'], ['dc', 'Дата-центр']]) { out.push({ id: 'ls' + sc, scope: sc, s: s0, r: [x, 162, 150, 62] }); x += 150 + g; }
      x += 6; out.push({ id: 'lh_', heroF: '', s: 'Все', r: [x, 162, 90, 62] }); x += 90 + g;
      for (const h of hs) { out.push({ id: 'lh' + h, heroF: h, s: SIM.HEROES[h] ? SIM.HEROES[h].name : h, r: [x, 162, 66, 62] }); x += 66 + g; }
      x += 6; out.push({ id: 'lnear', near: 1, s: 'Рядом', r: [x, 162, W - 12 - x, 62] });
      return out; }
    if (scr === 'ach') { const cats = ACH.CATS, tabs = cats.map(([c, s], i) => ({ id: 'ac_' + c, cat: c, s, r: [12 + (i % 5) * 152, 92 + Math.floor(i / 5) * 68, 144, 62] }));
      const xs = ACH.LIST.filter((x) => x.cat === acat);
      return scrolled([...tabs, { id: 'claimall', claimAll: 1, s: 'Забрать всё', r: [776, 92, 172, 130] },
        ...grid(xs, 1, 936, 106, 10, 232, (x) => ({ id: 'a_' + x.id, ach: x }))], 232, 540); }
    if (scr === 'set') return scrolled(SET.filter(([id]) => id !== 'undo' || canUndo()).map(([id, s, kind], i) => { const r = [24, CT + i * 70, 912, 62]; return { id, s, kind, r, bar: [r[0] + 420, r[1] + 18, 340, 26], sc: 1 }; }), CT, 540);
    if (scr === 'shop') { const tabs = [TAB('tab_up', { tab: 'up', s: 'Улучшения' }, 12, 220), TAB('tab_hero', { tab: 'hero', s: 'Герои' }, 240, 220), TAB('tab_skin', { tab: 'skin', s: 'Скины' }, 468, 220)];
      if (tab === 'skin') return scrolled([...tabs, ...grid(Object.keys(SIM.SKINS), 4, 210, 340, 16, 166, (k) => ({ id: 's_' + k, skin: k }))], 166, 540);
      if (tab === 'hero') return [...tabs, ...grid(Object.keys(SIM.HEROES), 5, 180, 360, 9, 166, (h) => ({ id: 'h_' + h, hero: h }))].map((o) => Object.assign(o, { sc: 0 }));
      return scrolled([...tabs, ...grid([...UPG.map((u) => ({ id: u.id, u })), { id: 'reset' }], 2, 400, 160, 20, 166, (o) => o)], 166, 540); }
    if (scr === 'hero') { const hs = Object.keys(SIM.HEROES), cards = grid(hs, 5, 180, 300, 9, CT, (h) => ({ id: h, hero: h })).map((o) => Object.assign(o, { sc: 0 }));
      if (!owns(focus)) return cards; const ch = [null, ...skinsOf(focus)], sw = 225, sx0 = (W - (ch.length * sw + (ch.length - 1) * 10)) / 2;
      return [...cards, ...ch.map((k, i) => ({ id: 'sk_' + (k || 'none'), chip: k || 'none', hero: focus, r: [sx0 + i * (sw + 10), 412, sw, 110] }))]; }
    if (scr === 'map') return MAPS.map((m, i) => ({ id: m.id, map: m, r: [16 + i * 472, CT, 456, 428] }));
    if (scr === 'course') return COURSE.order.map((k, i) => ({ id: k, course: COURSE.courses[k], r: [16 + i * 472, CT, 456, 428] }));
    if (scr === 'client') return scrolled(grid(SIM.CLIENTS, 4, 220, 250, 12, CT, (k) => ({ id: k, client: k })), CT, 540);
    if (scr === 'coll') { const tabs = [TAB('ct_items', { ctab: 'items', s: 'Предметы' }, 12, 220), TAB('ct_foes', { ctab: 'foes', s: 'Враги' }, 240, 220)];
      if (ctab === 'foes') return scrolled([...tabs, ...grid(Object.keys(SIM.FOE), 8, 104, 104, 10, 166, (k) => ({ id: 'f_' + k, k, kind: 'f' }))], 166, 410);
      // the three sections one after the other, each from a new row (its title on the row above: sec)
      const c = COLL(), out = [...tabs]; let y = 196;
      for (const row of [0, 1, 2]) { const xs = c.filter((o) => o.row === row); out.push(...grid(xs, 10, 80, 80, 10, y, (o) => Object.assign(o, { id: o.k, sec: xs[0] === o ? row : undefined }))); y += Math.ceil(xs.length / 10) * 90 + 34; }
      return scrolled(out, 166, 410); }
    return [];
  }
  function itemsD() {
    if (scr === 'main') { const L0 = susp ? [['resume', 'Продолжить смену'], ...MAIN] : MAIN, dy = susp ? 64 : 72, wn = waitingN();   // above the help line (y 930)
      const tag = (id, s) => (id === 'quit' && armedQuit ? 'Выйти? Нажмите ещё раз' : id === 'ach' && wn ? s + ' · забрать ' + wn : id === 'shop' && shopNews() ? s + ' · новое' : id === 'coll' && collNews() ? s + ' · новое' : s);
      return [...L0.map(([id, s], i) => ({ id, s: tag(id, s), news: (id === 'ach' && wn) || (id === 'shop' && shopNews()) || (id === 'coll' && collNews()) ? 1 : 0, quit: id === 'quit' ? armedQuit : undefined, r: [110, 330 + i * dy, 560, dy - 14] })), { id: 'acct', acct: 1, r: [W - 640, 670, 540, 70] }]; }
    // the leaderboard (stage 6 of docs/PLAN-FEEDBACK-27-10.md): the metric; the map, the hero and «рядом со мной» together; refresh and scrolling
    if (scr === 'lead') { const cl = C(), ms = cl ? cl.METRICS : [], hs = cl ? cl.HEROES : [], g = 10, out = []; let x = 110;
      ms.forEach((m, i) => out.push({ id: 'lm' + i, metric: i, s: m.short, r: [110 + i * 242, 186, 230, 52] }));
      out.push({ id: 'lref', refresh: 1, s: 'Обновить', r: [W - 300, 186, 190, 52] });
      for (const [sc, s0] of [['all', 'Все карты'], ['dc', 'Дата-центр']]) { out.push({ id: 'ls' + sc, scope: sc, s: s0, r: [x, 252, 190, 52] }); x += 190 + g; }
      x += 14; out.push({ id: 'lh_', heroF: '', s: 'Все герои', r: [x, 252, 170, 52] }); x += 170 + g;
      for (const h of hs) { out.push({ id: 'lh' + h, heroF: h, s: SIM.HEROES[h] ? SIM.HEROES[h].name : h, r: [x, 252, 64, 52] }); x += 64 + g; }   // portraits; the name is in the subtitle
      x += 14; out.push({ id: 'lnear', near: 1, s: 'Рядом со мной', r: [x, 252, 230, 52] });
      out.push({ id: 'lup', scrollD: -1, s: '▲', r: [1590, 400, 64, 64] }, { id: 'ldn', scrollD: 1, s: '▼', r: [1590, 890, 64, 64] });
      return out; }
    // achievements: category tabs, then the category's achievements as cards in two columns
    // achievements: category tabs and «Забрать всё», then the category's achievements as cards in three columns
    if (scr === 'ach') { const cats = ACH.CATS, tw = 140, g = 8, tabs = cats.map(([c, s], i) => ({ id: 'ac_' + c, cat: c, s, r: [110 + i * (tw + g), 186, tw, 52] }));
      const xs = ACH.LIST.filter((x) => x.cat === acat), cw = 560, ch = 106, cg = 16, x0 = (W - (3 * cw + 2 * cg)) / 2;   // the largest category (18) is 6 rows
      return [...tabs, { id: 'claimall', claimAll: 1, s: 'Забрать всё', r: [1610, 186, 200, 52] },
        ...xs.map((x, i) => ({ id: 'a_' + x.id, ach: x, r: [x0 + (i % 3) * (cw + cg), 256 + Math.floor(i / 3) * (ch + 10), cw, ch] }))]; }
    if (scr === 'set') return SET.filter(([id]) => id !== 'undo' || canUndo()).map(([id, s, kind], i) => { const r = [W / 2 - 520, 220 + i * 86, 1040, 72]; return { id, s, kind, r, bar: bar(r) }; });
    if (scr === 'shop') { const tabs = [{ id: 'tab_up', tab: 'up', s: 'Улучшения', r: [110, 186, 260, 52] }, { id: 'tab_hero', tab: 'hero', s: 'Герои', r: [386, 186, 260, 52] }, { id: 'tab_skin', tab: 'skin', s: 'Скины', r: [662, 186, 260, 52] }];
      if (tab === 'skin') { const ks = Object.keys(SIM.SKINS), per = 8, cw = 210, ch = 340, g = 16, x0 = (W - (per * cw + (per - 1) * g)) / 2;
        return [...tabs, ...ks.map((k, i) => ({ id: 's_' + k, skin: k, r: [x0 + (i % per) * (cw + g), 262 + Math.floor(i / per) * (ch + 16), cw, ch] }))]; }
      if (tab === 'hero') { const hs = Object.keys(SIM.HEROES), cw = 330, g = 24, x0 = (W - (hs.length * cw + (hs.length - 1) * g)) / 2;
        return [...tabs, ...hs.map((h, i) => ({ id: 'h_' + h, hero: h, r: [x0 + i * (cw + g), 270, cw, 600] }))]; }
      const cw = 400, ch = 160, g = 24, x0 = (W - (4 * cw + 3 * g)) / 2;
      return [...tabs, ...[...UPG.map((u) => ({ id: u.id, u })), { id: 'reset' }].map((o, i) => Object.assign(o, { r: [x0 + (i % 4) * (cw + g), 262 + Math.floor(i / 4) * (ch + 16), cw, ch] }))]; }
    if (scr === 'hero') { const hs = Object.keys(SIM.HEROES), cw = 330, g = 24, x0 = (W - (hs.length * cw + (hs.length - 1) * g)) / 2;
      const cards = hs.map((h, i) => ({ id: h, hero: h, r: [x0 + i * (cw + g), 200, cw, 620] }));
      if (!owns(focus)) return cards; const ch = [null, ...skinsOf(focus)], sw = 300, sg = 16, sx0 = (W - (ch.length * sw + (ch.length - 1) * sg)) / 2;
      return [...cards, ...ch.map((k, i) => ({ id: 'sk_' + (k || 'none'), chip: k || 'none', hero: focus, r: [sx0 + i * (sw + sg), 850, sw, 110] }))]; }
    if (scr === 'map') { const cw = 640, g = 40, x0 = (W - (MAPS.length * cw + (MAPS.length - 1) * g)) / 2; return MAPS.map((m, i) => ({ id: m.id, map: m, r: [x0 + i * (cw + g), 220, cw, 700] })); }
    if (scr === 'course') { const cs = COURSE.order, cw = 640, g = 40, x0 = (W - (cs.length * cw + (cs.length - 1) * g)) / 2; return cs.map((k, i) => ({ id: k, course: COURSE.courses[k], r: [x0 + i * (cw + g), 260, cw, 600] })); }
    if (scr === 'client') { const cs = SIM.CLIENTS, per = 7, cw = 220, ch = 250, g = 20;
      return cs.map((k, i) => { const row = Math.floor(i / per), n = Math.min(per, cs.length - row * per), x0 = (W - (n * cw + (n - 1) * g)) / 2; return { id: k, client: k, r: [x0 + (i % per) * (cw + g), 250 + row * (ch + 24), cw, ch] }; }); }
    // the collection: two tabs, items (weapons, evolutions, skills in three rows) and foes (every enemy, 9 to a row)
    if (scr === 'coll') { const tabs = [['items', 'Предметы'], ['foes', 'Враги']].map(([t0, s], i) => ({ id: 'ct_' + t0, ctab: t0, s, r: [W - 560 + i * 240, 100, 220, 56] }));
      if (ctab === 'foes') { const ks = Object.keys(SIM.FOE), per = 9, cw = 150, g = 16, x0 = (W - (per * cw + (per - 1) * g)) / 2;
        return [...tabs, ...ks.map((k, i) => ({ id: 'f_' + k, k, kind: 'f', r: [x0 + (i % per) * (cw + g), 230 + Math.floor(i / per) * (cw + g), cw, cw] }))]; }
      return [...tabs, ...collItems()]; }
    return [];
  }
  function collItems() { { const c = COLL(), n = [0, 0, 0], tot = [c.filter((o) => o.row === 0).length, c.filter((o) => o.row === 1).length, c.filter((o) => o.row === 2).length], g = 14, S0 = Math.min(106, Math.floor((W - 140 - (Math.max(...tot) - 1) * g) / Math.max(...tot)));   // tiles shrink to fit the longest row
      return c.map((o) => { const j = n[o.row]++, x0 = (W - (tot[o.row] * S0 + (tot[o.row] - 1) * g)) / 2; return Object.assign(o, { id: o.k, r: [x0 + j * (S0 + g), 230 + o.row * 190, S0, S0] }); }); }
  }
  const inR = (r, x, y) => x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3];
  function go(s, quiet) { seenHere(); scr = s; sel = 0; hov = -1; hovBack = false; armedReset = 0; armedQuit = 0; if (!quiet) sfx('ui'); }
  // activate the item i on the current screen; returns 'start' to begin a run
  function act(i) {
    const it = items()[i]; if (!it) return null;
    if (it.acct) { const cl = C(); if (cl && cl.enabled && window.ACCOUNT_UI) window.ACCOUNT_UI.open(); else sfx('deny'); return null; }
    if (scr === 'lead') { const cl = C(); if (!cl) { sfx('deny'); return null; } const B = cl.board;                          // the leaderboard's filters
      if (it.scrollD) { if (!scrollBoard(it.scrollD * 6)) sfx('deny'); else sfx('ui'); return null; }
      if (it.refresh) cl.loadBoard({}, true); else if (it.metric !== undefined) cl.loadBoard({ metric: it.metric }); else if (it.scope) cl.loadBoard({ scope: it.scope });
      else if (it.heroF !== undefined) cl.loadBoard({ hero: it.heroF }); else if (it.near) cl.loadBoard({ near: !B.near }); sfx('ui'); return null; }
    if (scr === 'main' && it.id === 'resume') return 'resume';
    if (scr === 'main' && it.id === 'quit') { if (!armedQuit) { armedQuit = 1; sfx('ui'); return null; } armedQuit = 0; sfx('ui'); return 'quit'; }   // the exit asks once more
    if (scr === 'main') { if (it.id === 'lead') { go('lead'); const cl = C(); if (cl) cl.loadBoard(); return null; }
      if (it.id === 'start') { go('hero'); sel = Math.max(0, Object.keys(SIM.HEROES).indexOf(D.sel.hero)); focus = D.sel.hero; return null; }
      go(it.id); return null; }
    // claims: a done achievement's card, «Забрать всё», or the content its achievement opens (the content's first press claims it)
    if (it.claimAll) { if (!claimAll()) sfx('deny'); return null; }
    if (it.ach) { if (!claim(it.ach.id)) sfx('deny'); return null; }
    { const rd = it.chip && it.chip !== 'none' ? ACH.ready(D, 'skin', it.chip) : it.skin ? ACH.ready(D, 'skin', it.skin) : it.hero && !it.tab && !it.chip && !owns(it.hero) ? ACH.ready(D, 'hero', it.hero)
        : it.u ? (locked(it.u) ? ACH.ready(D, 'u', it.u.id) : lvl(it.u.id) >= cap(it.u) ? ACH.ready(D, 'ranks', 'up') : null) : (it.kind === 'w' || it.kind === 'p') ? ACH.ready(D, it.kind, it.k) : null;
      if (rd && window.ACH) { claim(rd.id); return null; } }
    if (scr === 'set' && it.id === 'wipe') { sfx('ui'); return 'wipe'; }                          // the page asks for «СБРОС» first
    if (scr === 'set' && it.id === 'undo') { if (undoWipe()) { sel = Math.max(0, sel - 1); sfx('magic'); note('Сброс отменён · прогресс возвращён'); } else sfx('deny'); return null; }
    if (scr === 'set') { if (it.id === 'fps') { D.ui.fps = !D.ui.fps; save(); sfx('ui'); } else if (it.kind === 'toggle' && A()) { A().toggle(it.id === 'musicOn' ? 'music' : 'sound'); sfx('ui'); } return null; }
    if (scr === 'hero' && !it.chip) { const h = it.hero, H = SIM.HEROES[h];
      if (!owns(h)) { if (!open('hero', h) || D.codes < H.price) { sfx('deny'); return null; } D.codes -= H.price; D.heroes[h] = 1; focus = h; save(); sfx('pickup'); return null; }   // buy here, then press again to play
      D.sel.hero = h; save(); if (H.passive.clientHp) { go('client'); sel = Math.max(0, SIM.CLIENTS.indexOf(D.sel.client)); return null; } toMap(); return null; }
    if (scr === 'client') { D.sel.client = it.client; save(); toMap(); return null; }
    if (scr === 'map') { D.sel.map = it.id; save(); if (it.id === 'edu') { go('course'); sel = Math.max(0, COURSE.order.indexOf(D.sel.course)); return null; } sfx('level'); return 'start'; }
    if (scr === 'course') { D.sel.course = it.id; D.sel.map = 'edu'; save(); sfx('level'); return 'start'; }
    if (it.skin) { const k = it.skin, Sk = SIM.SKINS[k];                                                      // a skin card in the shop: buy, then wear / take off
      if (!owns(Sk.hero)) { sfx('deny'); return null; }
      if (!ownsSkin(k)) { if (!open('skin', k) || D.codes < Sk.price) { sfx('deny'); return null; } D.codes -= Sk.price; D.skins[k] = 1; D.sel.skins[Sk.hero] = k; save(); sfx('pickup'); return null; }
      D.sel.skins[Sk.hero] = D.sel.skins[Sk.hero] === k ? null : k; save(); sfx('ui'); return null; }
    if (it.chip) { const k = it.chip === 'none' ? null : it.chip;                                            // a skin chip on the hero screen
      if (k && !ownsSkin(k)) { const Sk = SIM.SKINS[k]; if (!open('skin', k) || D.codes < Sk.price) { sfx('deny'); return null; } D.codes -= Sk.price; D.skins[k] = 1; sfx('pickup'); } else sfx('ui');
      D.sel.skins[it.hero] = k; save(); return null; }
    if (it.ctab) { if (ctab !== it.ctab) { seenHere(); ctab = it.ctab; sfx('ui'); } return null; }                // the collection's tabs (they come first: sel stays on the tab)
    if (it.cat) { if (acat !== it.cat) { acat = it.cat; sfx('ui'); } return null; }                   // the achievements' categories
    if (scr === 'shop' && it.tab) { if (tab !== it.tab) { seenHere(); tab = it.tab; sel = it.tab === 'up' ? 0 : it.tab === 'hero' ? 1 : 2; sfx('ui'); } return null; }
    if (scr === 'shop' && it.hero) { const h = it.hero, H = SIM.HEROES[h];
      if (!owns(h)) { if (!open('hero', h) || D.codes < H.price) { sfx('deny'); return null; } D.codes -= H.price; D.heroes[h] = 1; save(); sfx('pickup'); return null; }
      if (lvl('tr_' + h) >= TR_MAX || D.codes < trPrice(h)) { sfx('deny'); return null; } D.codes -= trPrice(h); D.up['tr_' + h] = lvl('tr_' + h) + 1; save(); sfx('pickup'); return null; }
    if (scr === 'shop') {
      if (it.id === 'reset') { if (!armedReset) { armedReset = 1; sfx('ui'); return null; } D.codes += spent(); D.up = {}; armedReset = 0; save(); sfx('magic'); return null; }
      armedReset = 0; const u = it.u; if (locked(u) || lvl(u.id) >= cap(u) || D.codes < price(u)) { sfx('deny'); return null; }
      D.codes -= price(u); D.up[u.id] = lvl(u.id) + 1; save(); sfx('pickup'); return null; }
    return null;
  }
  // the leaderboard's scrolling: 12 rows show, up to 50 load
  const BOARD_VIS_D = 12, boardRows = () => { const cl = C(); return cl && cl.board.rows ? cl.board.rows.length : 0; };
  function scrollBoard(d) { const cl = C(); if (!cl) return false; const B = cl.board, mx = Math.max(0, boardRows() - (CP ? 5 : BOARD_VIS_D)), v = Math.max(0, Math.min(mx, (B.scroll || 0) + d)); if (v === (B.scroll || 0)) return false; B.scroll = v; return true; }
  const wheel = (dy) => { if (scr === 'lead') scrollBoard(Math.sign(dy) * (CP ? 1 : 2)); else if (CP) scrollBy(Math.sign(dy) * 46); };
  const toMap = () => { go('map'); sel = Math.max(0, MAPS.findIndex((m) => m.id === D.sel.map)); };
  // grid navigation: rows of items by their y, arrows move within / between rows
  function nav(dx, dy) {
    const it = items(); if (!it.length) return; const cur = it[sel] ? it[sel].r : it[0].r;
    if (scr === 'main') { sel = (sel + dy + dx + it.length) % it.length; armedQuit = 0; sfx('ui'); return; }
    if (scr === 'set') { if (dy) { sel = (sel + dy + it.length) % it.length; sfx('ui'); return; } const o = it[sel], a = A(); if (!o || !a) return;
      if (o.kind === 'slider') { a.setVolume(o.id, a.pref[o.id] + dx * 0.05); sfx('ui'); } else act(sel); return; }
    let best = -1, bd = 1e9;
    it.forEach((o, i) => { if (i === sel) return; const ddx = o.r[0] - cur[0], ddy = o.r[1] - cur[1];
      if (dx && (Math.sign(ddx) !== dx || Math.abs(ddy) > 10)) return; if (dy && (Math.sign(ddy) !== dy)) return;
      const d = dx ? Math.abs(ddx) : Math.abs(ddy) * 4 + Math.abs(ddx); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) { sel = best; armedReset = 0; sfx('ui'); }
  }
  const track = () => { const o = items()[sel]; if (scr === 'hero' && o && o.hero && !o.chip) focus = o.hero; };
  const trackKey = () => { reveal(); track(); };
  function key(c) {
    if (c === 'ArrowUp' || c === 'KeyW') nav(0, -1); else if (c === 'ArrowDown' || c === 'KeyS') nav(0, 1);
    else if (c === 'ArrowLeft' || c === 'KeyA') nav(-1, 0); else if (c === 'ArrowRight' || c === 'KeyD') nav(1, 0);
    else if (c === 'Enter' || c === 'Space') return act(sel);
    else if (scr === 'lead' && (c === 'PageDown' || c === 'PageUp')) scrollBoard(c === 'PageDown' ? (CP ? 5 : BOARD_VIS_D) : -(CP ? 5 : BOARD_VIS_D));
    else if (c === 'Escape' || c === 'Backspace') { if (armedQuit) armedQuit = 0; else if (scr === 'course') toMap(); else if (scr === 'client' || scr === 'map') { go('hero'); sel = Math.max(0, Object.keys(SIM.HEROES).indexOf(D.sel.hero)); } else if (scr !== 'main') go('main'); }
    trackKey(); return null;
  }
  const back = () => (CP ? [12, 14, 140, 62] : [W / 2 - 160, 1000, 320, 56]);
  let dragI = -1;
  const slide = (i, x) => { const o = items()[i], a = A(); if (!o || o.kind !== 'slider' || !a) return; a.setVolume(o.id, (x - o.bar[0]) / o.bar[2]); };
  function click(x, y) {
    if (scr !== 'main' && inR(back(), x, y)) { go('main'); return null; }
    if (scr === 'set') { const it = items(); for (let i = 0; i < it.length; i++) if (it[i].kind === 'slider' && inR([it[i].bar[0] - 16, it[i].bar[1] - 20, it[i].bar[2] + 32, it[i].bar[3] + 40], x, y)) { sel = i; dragI = i; slide(i, x); sfx('ui'); return null; } }
    const it = items(), inA = (o) => !o.sc || (y >= area[0] && y <= area[1]);                    // a scrolled item is hit only inside the content area
    for (let i = 0; i < it.length; i++) if (!it[i].off && inA(it[i]) && inR(it[i].r, x, y)) { sel = i; return act(i); }
    // a touch that just misses: the nearest item within TOUCH_PAD (stage 7a: fingers are wider than a cursor)
    if (window.TOUCH && TOUCH.on) { let best = -1, bd = TOUCH_PAD; it.forEach((o, i) => { if (o.off || !inA(o)) return; const [rx, ry, rw, rh] = o.r, dx = Math.max(rx - x, 0, x - rx - rw), dy = Math.max(ry - y, 0, y - ry - rh), d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) { sel = best; return act(best); } }
    return null;
  }
  const TOUCH_PAD = 28;
  const drag = (x) => { if (dragI >= 0) slide(dragI, x); }, up = () => { dragI = -1; };
  function move(x, y) { const it = items(); hov = -1; hovBack = scr !== 'main' && inR(back(), x, y); for (let i = 0; i < it.length; i++) if (!it[i].off && inR(it[i].r, x, y)) { hov = i; sel = i; }
    if (armedQuit && !(it[hov] && it[hov].id === 'quit')) armedQuit = 0; track(); }
  const view = () => ({ U, LW: W, LH: H, compact: CP, get scrollArea() { return CP ? area.slice() : null; }, scr, sel, hovBack, tab, focus, skinsOf, ownsSkin, suspended: susp, items: items(), D, last, back: back(), armedReset, spent: spent(), price, lvl, locked, owns, trPrice, TR_MAX, open, cap, ctab, acat });

  const runOpts = () => ({ map: D.maps[D.sel.map] ? D.sel.map : 'dc', hero: owns(D.sel.hero) ? D.sel.hero : 'utrace', client: D.sel.client, skin: D.sel.skins[owns(D.sel.hero) ? D.sel.hero : 'utrace'] || null, lock: window.ACH ? ACH.lock(D) : undefined, course: COURSE.courses[D.sel.course] ? D.sel.course : COURSE.order[0] });
  window.META = { UPG, MAPS, PAUSE, setSuspended: (o) => { susp = o; }, get suspended() { return susp; }, tab: (x) => { tab = x; }, ctab: (x) => { ctab = x; }, acat: (x) => { acat = x; }, unlockAll: () => { Object.keys(SIM.HEROES).forEach((h) => (D.heroes[h] = 1)); }, mods, runOpts, bank, key, click: (x, y) => click(x / U, y / U), move: (x, y) => move(x / U, y / U), drag: (x) => drag(x / U), up, wheel, view, go, setUI, get U() { return U; }, get data() { return D; }, get last() { return last; }, get achOnLoad() { return achNew; }, live, achIds, mergeAch, claim, claimAll, wipe, undoWipe, canUndo, cloudSide, cloudSet, reset: () => { D = fresh(); save(); } };
  if (window.CLOUD && CLOUD.syncAch) CLOUD.syncAch();                                              // the account may have signed in first
})();
