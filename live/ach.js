// live/ach.js: the achievements (plan docs/PLAN-ACHIEVEMENTS.md, modelled on utreys-survivors data/achievements.js). Each one reads
// its progress from the meta save (META's D: lifetime totals, records, per-hero / per-map records, D.st = the run facts summed).
// As in classic games it is claimed by hand (docs/PLAN-FEEDBACK-27-10.md, stage 4): once progress ≥ target it is done and waits
// (D.done[id]: 1 = done here, 2 = done on another device of the account), then a press claims it (D.ach[id] = 1): its codes are
// paid (only for 1: the other device was paid) and its content opens and is marked new (D.fresh['kind:id']) until it is looked at.
// unlocks: the content a claim opens. Content no achievement names is open from the start. Kinds: w (a weapon offered on level-ups),
// p (a skill), hero (can be bought), skin (can be bought), u (an upgrade in the shop), ranks (the shop's ranks above 3). An
// evolution needs no unlock: it comes once both its parts can be taken.
// META calls check(D) after every banked run and once on load, claim(D, id) on a press; this file never saves.
(() => {
  const CATS = [['survival', 'Выживание'], ['volume', 'Объём'], ['wins', 'Победы'], ['heroes', 'Герои'], ['bosses', 'Боссы'], ['ability', 'Умения'],
    ['mastery', 'Мастерство'], ['evo', 'Эволюции'], ['edu', 'Обучение'], ['all', 'Платина']];
  const st = (D, k) => (D.st && D.st[k]) || 0;
  const hr = (D, h, k) => (D.byHero[h] && D.byHero[h][k]) || 0;
  // one achievement: { id, cat, title, desc, target, get(D), reward (codes), time: progress in seconds, unlocks: { kind: [ids] } }
  const a = (id, cat, title, desc, target, get, reward, more) => Object.assign({ id, cat, title, desc, target, get, reward, unlocks: {} }, more);
  const LIST = [
    // the final boss comes at 10:00 (RUN_T), so the longest survival goal is 8 minutes
    a('surv_60', 'survival', 'Быстрый пинг', 'Продержаться 1 минуту в одной смене', 60, (D) => D.best.time, 5, { time: 1, unlocks: { u: ['speed'] } }),
    a('surv_180', 'survival', 'Стабильный аптайм', 'Продержаться 3 минуты в одной смене', 180, (D) => D.best.time, 15, { time: 1, unlocks: { hero: ['traceability'], u: ['range'] } }),
    a('surv_300', 'survival', 'Полная синхронизация', 'Продержаться 5 минут в одной смене', 300, (D) => D.best.time, 25, { time: 1, unlocks: { w: ['cache'] } }),
    a('surv_480', 'survival', 'HighLoad сертификация', 'Продержаться 8 минут в одной смене', 480, (D) => D.best.time, 40, { time: 1 }),
    a('kills_100', 'volume', 'Первые пакеты', 'Победить 100 врагов за всё время', 100, (D) => D.kills, 5, { unlocks: { u: ['magnet'] } }),
    a('kills_1000', 'volume', 'Тысяча валидаций', 'Победить 1000 врагов за всё время', 1000, (D) => D.kills, 15, { unlocks: { w: ['storm'], hero: ['serialization'], u: ['greed'] } }),
    a('kills_5000', 'volume', 'Пакетная агрегация', 'Победить 5000 врагов за всё время', 5000, (D) => D.kills, 30),
    a('kills_10000', 'volume', 'Чёрная пятница', 'Победить 10 000 врагов за всё время', 10000, (D) => D.kills, 50),
    a('runs_5', 'volume', 'Ночные смены', 'Отработать 5 смен', 5, (D) => D.runs, 5, { unlocks: { p: ['dur'], u: ['haste'] } }),
    a('runs_10', 'volume', 'Десять смен', 'Отработать 10 смен', 10, (D) => D.runs, 10, { unlocks: { ranks: ['up'] } }),
    a('runs_25', 'volume', 'Старожил дата-центра', 'Отработать 25 смен', 25, (D) => D.runs, 15),
    a('runs_100', 'volume', 'Сто смен', 'Отработать 100 смен', 100, (D) => D.runs, 30),
    a('win_1', 'wins', 'Проверка регулятора', 'Победить в смене', 1, (D) => D.wins, 20, { unlocks: { w: ['fork'], hero: ['qa'], u: ['rerolls', 'skips'] } }),
    a('wins_10', 'wins', 'Стабильный продакшен', 'Победить в 10 сменах', 10, (D) => D.wins, 30),
    a('wins_50', 'wins', 'Релиз-менеджер', 'Победить в 50 сменах', 50, (D) => D.wins, 50),
    a('bosses_1', 'bosses', 'Первый разбор PIR', 'Закрыть босса', 1, (D) => st(D, 'bosses'), 5, { unlocks: { w: ['turret'], hero: ['ba'], u: ['armor'] } }),
    a('bosses_10', 'bosses', 'Дежурный по инцидентам', 'Закрыть 10 боссов', 10, (D) => st(D, 'bosses'), 20),
    a('bosses_50', 'bosses', 'Пиковая нагрузка', 'Закрыть 50 боссов', 50, (D) => st(D, 'bosses'), 40),
    a('cast_10', 'ability', 'Первый сброс буфера', 'Использовать умение E 10 раз', 10, (D) => st(D, 'casts'), 5, { unlocks: { w: ['retry'], u: ['regen'] } }),
    a('cast_50', 'ability', 'Оптимизация потока', 'Использовать умение E 50 раз', 50, (D) => st(D, 'casts'), 15, { unlocks: { p: ['repair'] } }),
    a('cast_250', 'ability', 'Мастер многопоточности', 'Использовать умение E 250 раз', 250, (D) => st(D, 'casts'), 40),
    a('evo_1', 'mastery', 'Эволюция', 'Получить эволюцию оружия', 1, (D) => st(D, 'evos'), 10, { unlocks: { p: ['firewall'], u: ['luck'] } }),
    a('evo_3', 'mastery', 'Эволюционный скачок', 'Получить 3 эволюции в одной смене', 3, (D) => st(D, 'evoMax'), 30),
    a('calm_180', 'mastery', 'Без единой царапины', 'Продержаться 3 минуты подряд без урона', 180, (D) => st(D, 'calmMax'), 30, { time: 1 }),
    a('win_noheal', 'mastery', 'Без перекуса', 'Победить, не подобрав ни одной лечилки', 1, (D) => st(D, 'noHealWins'), 30),
    a('lvl_20', 'mastery', 'Двадцатый релиз', 'Достичь 20 уровня в смене', 20, (D) => D.best.lvl, 15, { unlocks: { w: ['shield'], u: ['head'] } }),
    a('lvl_30', 'mastery', 'Тридцатый релиз', 'Достичь 30 уровня в смене', 30, (D) => D.best.lvl, 30),
    a('edu_win', 'edu', 'Выпускник', 'Пройти курс Учебного центра: победить босса курса', 1, (D) => st(D, 'eduWins'), 20),
    a('edu_top', 'edu', 'Отличник', 'Пройти курс с оценкой «Отлично»', 1, (D) => st(D, 'eduTop'), 30),
    // more goals (docs/PLAN-FEEDBACK-27-10.md, stage 4)
    a('codes_1000', 'volume', 'Тысяча кодов', 'Заработать 1000 кодов за всё время', 1000, (D) => st(D, 'codes'), 10),
    a('codes_10000', 'volume', 'Маркировка в потоке', 'Заработать 10 000 кодов за всё время', 10000, (D) => st(D, 'codes'), 40),
    a('foes_15', 'volume', 'Полный каталог', 'Победить 15 разных видов врагов', 15, (D) => Object.keys((D.st && D.st.foes) || {}).filter((k) => SIM.FOE[k] && !SIM.FOE[k].boss && !SIM.FOE[k].mini && D.st.foes[k] > 0).length, 20),
    a('win_fast', 'mastery', 'Досрочный релиз', 'Победить на «Дата-центре» быстрее 9 минут', 1, (D) => (st(D, 'winMin') > 0 && st(D, 'winMin') < 540 ? 1 : 0), 40),
    a('win_nocast', 'mastery', 'Без умений', 'Победить, ни разу не использовав умение E', 1, (D) => st(D, 'noCastWins'), 30),
  ];
  // a miniboss or a boss closed at least once (the five component bugs, the service desk, ЦРПТ, Партионный учёт)
  for (const k of Object.keys(SIM.FOE).filter((k) => (SIM.FOE[k].mini || SIM.FOE[k].boss) && k !== 'boss'))
    LIST.push(a('foe_' + k, 'bosses', 'Закрыт: ' + SIM.FOE[k].name, `Победить «${SIM.FOE[k].name}»`, 1, (D) => ((D.st && D.st.foes && D.st.foes[k]) || 0), 15));
  // every evolution once
  for (const k of Object.keys(SIM.WEAP).filter((k) => SIM.WEAP[k].evo))
    LIST.push(a('evo_' + k, 'evo', SIM.WEAP[k].name, `Получить эволюцию «${SIM.WEAP[k].name}»`, 1, (D) => (D.seen && D.seen.e && D.seen.e[k] ? 1 : 0), 10));
  // every course with the top grade
  for (const c of (window.COURSE ? COURSE.order : [])) { const nm = COURSE.courses[c].title || COURSE.courses[c].name;
    LIST.push(a('edu_' + c.replace(/-/g, '_'), 'edu', 'Отлично: ' + nm, `Пройти курс «${nm}» на «Отлично»`, 1, (D) => (D.byCourse && D.byCourse[c] && D.byCourse[c].grade === EDU.C.grading.grades[0].name ? 1 : 0), 20)); }
  // per hero: 5 shifts open its calm skin, a win opens its aggressive one (the recolour is sold from the start); then a win with all
  const HN = () => Object.keys(SIM.HEROES), skinOf = (h, style) => Object.keys(SIM.SKINS).filter((k) => SIM.SKINS[k].hero === h && SIM.SKINS[k].style === style);
  for (const h of HN()) { const nm = SIM.HEROES[h].name;
    // short: the wording on the hero's own skin cards, where the hero's name is already known
    LIST.push(a('runs5_' + h, 'heroes', 'Смена за сменой: ' + nm, `Отработать 5 смен героем «${nm}»`, 5, (D) => hr(D, h, 'runs'), 10, { short: '5 смен этим героем', unlocks: { skin: skinOf(h, 'спокойный') } }));
    LIST.push(a('win_' + h, 'heroes', 'Релиз: ' + nm, `Победить героем «${nm}»`, 1, (D) => hr(D, h, 'wins'), 20, { short: 'Победа этим героем', unlocks: { skin: skinOf(h, 'агрессивный') } }));
    LIST.push(a('wins3_' + h, 'heroes', 'Три релиза: ' + nm, `Победить героем «${nm}» 3 раза`, 3, (D) => hr(D, h, 'wins'), 25)); }
  LIST.push(a('heroes_all', 'heroes', 'Полный состав', 'Победить каждым из героев', HN().length, (D) => HN().filter((h) => hr(D, h, 'wins') > 0).length, 50));
  const N0 = LIST.length;
  LIST.push(a('all', 'all', 'Платина', 'Выполнить все остальные достижения', N0, (D) => LIST.slice(0, N0).filter((x) => D.ach[x.id] || (D.done && D.done[x.id])).length, 100));

  // the badges (docs/PLAN-CLOUD-SAVE-31-10.md, stage 4; drawn by scene.js): a picture per meaning (art/gen/ach_*_gen.png,
  // tools/make_prompts_v31.py), so a series shares one and its rank (1..of) is the ring; the evolutions, the bosses and the heroes show
  // the game's own pictures. badge: { art, rank, of } | { evo } | { foe } | { hero }
  const ART = { surv: 'ach_surv', kills: 'ach_kills', runs: 'ach_runs', win: 'ach_wins', wins: 'ach_wins', bosses: 'ach_bosses', cast: 'ach_cast', lvl: 'ach_lvl', codes: 'ach_codes',
    evo_1: 'ach_evo', evo_3: 'ach_evo3', calm_180: 'ach_calm', win_noheal: 'ach_noheal', win_fast: 'ach_fast', win_nocast: 'ach_nocast', foes_15: 'ach_foes', edu_win: 'ach_grad',
    edu_top: 'ach_top', heroes_all: 'ach_team', all: 'ach_all', edu_batch_accounting: 'ach_c_batch', edu_critical_incidents: 'ach_c_incid' };
  const series = (id) => { const m = /^([a-z]+)_\d+$/.exec(id); return m && !ART[id] && ART[m[1]] ? ART[m[1]] : null; };
  for (const x of LIST) { const id = x.id, h = /^(?:runs5|win|wins3)_(.+)$/.exec(id), s = series(id);
    if (h && SIM.HEROES[h[1]]) x.badge = { hero: h[1] };
    else if (x.cat === 'evo') x.badge = { evo: id.slice(4) };
    else if (id.startsWith('foe_')) x.badge = { foe: id.slice(4) };
    else if (s) { const sib = LIST.filter((y) => series(y.id) === s); x.badge = { art: s, rank: sib.indexOf(x) + 1, of: sib.length }; }
    else x.badge = { art: ART[id] || null, rank: 0, of: 0 }; }

  const BY = Object.fromEntries(LIST.map((x) => [x.id, x]));
  // the achievement that opens a piece of content (kind, id), or null when it is open from the start
  const GATE = {}; for (const x of LIST) for (const kind in x.unlocks) for (const id of x.unlocks[kind]) GATE[kind + ':' + id] = x;
  const gate = (kind, id) => GATE[kind + ':' + id] || null;
  const isOpen = (D, kind, id) => { const g = gate(kind, id); return !g || !!D.ach[g.id]; };
  // a piece of content its achievement is done for but not claimed yet: the achievement (a press on the content claims it), or null
  const ready = (D, kind, id) => { const g = gate(kind, id); return g && !D.ach[g.id] && D.done && D.done[g.id] ? g : null; };
  const isNew = (D, kind, id) => !!(D.fresh && D.fresh[kind + ':' + id]);
  // the weapons and skills a run must not offer yet (passed to SIM.spawn as opt.lock)
  const lock = (D) => ({ w: Object.keys(SIM.WEAP).filter((k) => !isOpen(D, 'w', k)), p: Object.keys(SIM.PASS).filter((k) => !isOpen(D, 'p', k)) });
  // done: met (claimed or waiting); claimed; ready: met and waiting for the press
  const progress = (D, x) => { const v = Math.max(0, Math.floor(x.get(D) || 0)), claimed = !!D.ach[x.id], wait = !claimed && !!(D.done && D.done[x.id]);
    return { v: claimed || wait ? x.target : Math.min(v, x.target), target: x.target, done: claimed || wait || v >= x.target, claimed, ready: wait }; };
  // marks the newly met achievements as done (waiting to be claimed); returns them in list order (Платина last, so it sees the others)
  function check(D) { const out = []; D.done = D.done || {};
    for (const x of LIST) if (!D.ach[x.id] && !D.done[x.id] && progress(D, x).done) { D.done[x.id] = 1; out.push(x); }
    return out; }
  // claims a done achievement: its codes (when done on this device), its content opened and marked new; null when it is not waiting
  function claim(D, id) { const x = BY[id]; if (!x || D.ach[id] || !D.done || !D.done[id]) return null;
    const codes = D.done[id] === 1 ? x.reward : 0; delete D.done[id]; D.ach[id] = 1; D.codes += codes; D.fresh = D.fresh || {};
    for (const kind in x.unlocks) for (const k of x.unlocks[kind]) D.fresh[kind + ':' + k] = 1;
    return { x, codes, opened: opened([x]) }; }
  const waiting = (D) => LIST.filter((x) => !D.ach[x.id] && D.done && D.done[x.id]);
  // what a list of achievements opened, as readable names («Горячий кэш», «Герой БА», ...)
  const NAMES = { w: (k) => SIM.WEAP[k].name, p: (k) => SIM.PASS[k].name, hero: (k) => 'герой ' + SIM.HEROES[k].name, skin: (k) => 'скин «' + SIM.SKINS[k].name + '»', ranks: () => 'ранги 4–5 в магазине', u: (k) => 'улучшение «' + ((window.META && META.UPG.find((u) => u.id === k)) || { name: k }).name + '»' };
  const opened = (xs) => xs.flatMap((x) => Object.entries(x.unlocks).flatMap(([kind, ids]) => ids.map((id) => NAMES[kind](id))));
  // the n nearest goals not done yet, as in the original's menu: those that open content first, then by how close they are
  const next = (D, n) => LIST.filter((x) => !D.ach[x.id] && !(D.done && D.done[x.id])).map((x) => { const p = progress(D, x); return { x, p, opens: Object.keys(x.unlocks).length > 0, share: p.v / p.target }; })
    .sort((a, b) => (b.opens - a.opens) || (b.share - a.share)).slice(0, n);
  window.ACH = { CATS, LIST, BY, progress, check, claim, waiting, gate, isOpen, ready, isNew, lock, opened, next };
})();
