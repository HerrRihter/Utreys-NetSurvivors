// live/sim.js — deterministic survivors-like run inside a cyber datacenter (3/4 top-down), fixed 120 Hz.
// Contract (engine.md §6): create / step / at / spawn / respawn / outOfPlay / scriptInput, events in S.ev, every reaction here.
// Hero Utrace: sector "trace" strike (auto, aimed at the nearest foe), dash, six project weapons, five passives.
// Foes: 15 types from the project (data/enemies/units.js, distances and speeds ×2) with their abilities: melee bursts, aimed
// shots that slow, rings of shots, mortars, area pulses that slow, summons, dashes, armoured fronts, poise; three bug minibosses;
// ЦРПТ (4:30) and the Critical Incident (8:00). Foes path around the rack rows on a flow field (BFS from the hero's cell).
// The map is zoned: central plaza (the reference composition), server hall, cooling hall, power block, NOC / storage.
// All randomness from S.rs (mulberry32), so the attract demo replays byte-identically.
(function (root) {
  const DT = 1 / 120, L = 24, VIEW = { W: 1920, H: 1080 }, WORLD = { x0: 0, y0: 0, x1: 8000, y1: 6000 };
  const RUN_T = 600, MAX_FOES = 240, EV_CAP = 180;
  const HINT = 'WASD — движение · мышь — направление автоатаки · M — звук · N — музыка · Пробел — пакетный сброс · 1–3 — улучшение · R — заново';
  const SPAWN = [4000, 3000];                                      // hero start = the reference's composition (study/MATCH.md)
  const ORIGIN = [SPAWN[0] - 960, SPAWN[1] - 592];                 // camera origin of the match screen; ref px × 1.5 + ORIGIN = world
  const R = (rx, ry) => [ORIGIN[0] + rx * 1.5, ORIGIN[1] + ry * 1.5];

  // ---------------- hero rig numbers shared with the scene (one origin function for the scanner tip) ----------------
  const RIG = { shY: 55, shX: 42, arm: 38, gun: 30, gunUp: 18 };   // shX: the shoulder joint's centre on the body's side outline (round 24)
  const K = { HP: 120, SPEED: 300, ACC: 2600, DEC: 3000, R: 24, DASH: 1050, DASH_T: 0.18, DASH_CD: 2.4, IFR: 0.6 };

  // ---------------- data: foes (key = art prefix), weapons, passives ----------------
  // kind: melee (burst at range), shoot (aimed shot or a ring: shots.count > 1), mortar (marks round the hero), pulse (area around itself)
  const FOE = {
    node:    { name: 'L3', kind: 'melee', hp: 70, sp: 156, dmg: 7, r: 26, range: 64, wind: 0.6, cd: 0.8, xp: 2, mark: 'L3', col: [0.36, 1, 0.6] },
    panel:   { name: 'Фильтр Grafana', kind: 'melee', hp: 40, sp: 210, dmg: 5, r: 22, range: 56, wind: 0.5, cd: 0.8, xp: 1, col: [1, 0.6, 0.19] },
    multon:  { name: 'Мултон', kind: 'melee', hp: 50, sp: 192, dmg: 6, r: 24, range: 58, wind: 0.45, cd: 0.7, xp: 2, emblem: 'multon', col: [1, 0.55, 0.2] },
    orb:     { name: 'Пепси', kind: 'melee', hp: 105, sp: 164, dmg: 9, r: 28, range: 68, wind: 0.7, cd: 0.93, xp: 4, col: [0.25, 0.66, 1],
               dash: { trigger: 460, wind: 0.8, speed: 900, time: 0.45, cd: 6 } },
    keg:     { name: 'Инбев', kind: 'melee', hp: 240, sp: 80, dmg: 12, r: 38, range: 92, wind: 1.2, cd: 2.0, xp: 10, front: 0.6, poise: 0.8, emblem: 'inbev', col: [1, 0.8, 0.3] },
    baltika: { name: 'Балтика', kind: 'melee', hp: 240, sp: 92, dmg: 13, r: 38, range: 88, wind: 1.0, cd: 1.6, xp: 10, poise: 1.5, emblem: 'baltika', col: [0.9, 0.78, 0.44] },
    mars:    { name: 'Марс', kind: 'shoot', hp: 130, sp: 116, dmg: 10, r: 30, range: 520, wind: 0.9, cd: 2.2, xp: 6, keep: 380,
               shots: { count: 1, speed: 430, dmg: 1 }, slow: { amount: 0.25, dur: 1.2 }, emblem: 'mars', col: [1, 0.3, 0.25] },
    loreal:  { name: 'Лореаль', kind: 'shoot', hp: 100, sp: 140, dmg: 8, r: 28, range: 480, wind: 1.0, cd: 2.6, xp: 6, keep: 340,
               shots: { count: 8, speed: 330, dmg: 0.8 }, emblem: 'loreal', col: [1, 0.6, 0.85] },
    ferrero: { name: 'Ферреро', kind: 'mortar', hp: 140, sp: 108, dmg: 11, r: 30, range: 600, wind: 1.0, cd: 3.0, xp: 8, keep: 460,
               mortar: { radius: 100, delay: 1.2, count: 2, scatter: 140 }, emblem: 'ferrero', col: [0.85, 0.7, 0.45] },
    vetis:   { name: 'Система Ветис', kind: 'pulse', hp: 320, sp: 80, dmg: 12, r: 36, range: 170, wind: 1.2, cd: 3.0, xp: 14, poise: 1.4,
               slow: { amount: 0.35, dur: 2 }, emblem: 'vetis', col: [0.45, 0.95, 0.75] },
    // the rest of the original roster, each with a mechanic of its own
    mond:    { name: 'Монделиз', kind: 'melee', hp: 110, sp: 196, dmg: 7, r: 28, range: 60, wind: 0.45, cd: 0.8, xp: 4, emblem: 'mondelez', zig: 1,
               trail: { every: 0.14, life: 3, r: 46, slow: { amount: 0.3, dur: 0.5 } }, col: [0.62, 0.4, 0.85] },
    prog:    { name: 'Прогресс (ФрутоНяня)', kind: 'lob', hp: 130, sp: 128, dmg: 10, r: 30, range: 560, wind: 0.9, cd: 2.4, xp: 6, keep: 380, emblem: 'progress',
               lob: { count: 2, bounces: 2, r: 70 }, col: [0.55, 0.8, 0.45] },
    royal:   { name: 'Роял Канин', kind: 'shoot', hp: 150, sp: 110, dmg: 9, r: 30, range: 520, wind: 0.9, cd: 2.6, xp: 6, keep: 360, emblem: 'royal_canin',
               shots: { count: 3, speed: 420, dmg: 1, fan: 0.35, back: 0.8 }, col: [0.85, 0.2, 0.25] },
    cherk:   { name: 'Черкизово', kind: 'spin', hp: 230, sp: 100, dmg: 9, r: 36, range: 230, wind: 0.7, cd: 4, xp: 10, poise: 1.3, emblem: 'cherkizovo',
               spin: { time: 1.6, r: 105, tick: 0.25, speed: 1.45 }, col: [0.75, 0.15, 0.25] },
    pg:      { name: 'Проктер энд Гэмбл', kind: 'melee', hp: 260, sp: 96, dmg: 11, r: 38, range: 88, wind: 1.0, cd: 1.8, xp: 12, poise: 1.5, emblem: 'procter_gamble',
               aura: { r: 260, reduce: 0.5 }, col: [0.3, 0.55, 1] },
    petfood: { name: 'Марс Петфуд', kind: 'shoot', hp: 150, sp: 120, dmg: 6, r: 30, range: 440, wind: 0.8, cd: 2.2, xp: 6, keep: 300, emblem: 'mars_petfood',
               shots: { count: 5, speed: 460, dmg: 1, fan: 0.6 }, col: [0.35, 0.8, 0.95] },
    logq:    { name: 'Запрос в логи', kind: 'beam', hp: 260, sp: 90, dmg: 16, r: 36, range: 640, wind: 1.3, cd: 3.2, xp: 10, front: 0.7, mark: 'LOG',
               beam: { len: 720, w: 40, hold: 0.25 }, col: [0.6, 0.48, 1] },
    sdesk:   { name: 'Сервисдеск Пепси', kind: 'desk', hp: 1400, sp: 0, dmg: 0, r: 64, range: 0, wind: 1, cd: 99, xp: 30, poise: 99, mini: true,
               desk: { every: 7, base: 2, grow: 40, max: 10, unit: 'orb', reach: 1700 }, col: [0.2, 0.45, 0.85] },
    // the five component minibosses: big (r 78, drawn ×1.8), tough and quick inside their circle, each with a lunge
    bug:     { name: 'Баг импорта', kind: 'mortar', hp: 2200, sp: 120, dmg: 20, r: 78, range: 700, wind: 0.9, cd: 2.0, xp: 40, poise: 3, mini: true, mark: 'BUG',
               mortar: { radius: 130, delay: 1.1, count: 5, scatter: 220 }, dash: { trigger: 560, wind: 0.6, speed: 760, time: 0.35, cd: 4 }, col: [0.61, 0.59, 1] },
    bugl:    { name: 'Баг логистики', kind: 'pulse', hp: 2400, sp: 125, dmg: 18, r: 78, range: 320, wind: 1.1, cd: 1.9, xp: 40, poise: 3, mini: true, mark: 'BUG',
               slow: { amount: 0.5, dur: 2.5 }, dash: { trigger: 560, wind: 0.6, speed: 760, time: 0.35, cd: 4 }, col: [0.93, 0.81, 0.4] },
    bugg:    { name: 'Баг товарных отчётов', kind: 'pulse', hp: 2200, sp: 125, dmg: 18, r: 78, range: 280, wind: 1.0, cd: 1.8, xp: 40, poise: 3, mini: true, mark: 'BUG',
               pools: { every: 3.5, count: 3, radius: 100, life: 4.5, scatter: 200, dmg: 0.6 }, dash: { trigger: 560, wind: 0.6, speed: 760, time: 0.35, cd: 4 }, col: [0.47, 0.81, 0.72] },
    bugu:    { name: 'Баг отчёта использования', kind: 'shoot', hp: 2000, sp: 115, dmg: 12, r: 78, range: 620, wind: 0.9, cd: 1.8, xp: 40, poise: 3, mini: true, mark: 'BUG', keep: 260,
               shots: { count: 14, speed: 380, dmg: 1 }, dash: { trigger: 560, wind: 0.6, speed: 760, time: 0.35, cd: 4 }, col: [0.89, 0.53, 0.83] },
    buga:    { name: 'Баг агрегации', kind: 'pulse', hp: 2400, sp: 120, dmg: 18, r: 78, range: 280, wind: 1.0, cd: 1.8, xp: 40, poise: 3, mini: true, mark: 'BUG',
               summon: { every: 6, count: 3, max: 7, units: ['node'] }, dash: { trigger: 560, wind: 0.6, speed: 760, time: 0.35, cd: 4 }, col: [0.96, 0.55, 0.33] },
    // ЦРПТ: a miniboss of the «Дата-центр» since stage 5 of docs/PLAN-FEEDBACK-27-10.md (it opened the boss queue before)
    crpt:    { name: 'ЦРПТ', kind: 'pulse', hp: 3000, sp: 100, dmg: 20, r: 90, range: 220, wind: 1.3, cd: 2.6, xp: 60, poise: 4, mini: true, mark: 'ЦРПТ',
               shots: { count: 8, speed: 340, dmg: 0.5 }, summon: { every: 8, count: 3, max: 9, units: ['node', 'orb', 'mars'] }, col: [1, 0.84, 0],
               intro: 'ЦРПТ: проверка партии, подключены клиенты' },
    batch:   { name: 'Партионный учёт', kind: 'pulse', hp: 6000, sp: 70, dmg: 20, r: 100, range: 300, wind: 1.2, cd: 2.4, xp: 80, poise: 4, boss: true,
               shots: { count: 12, speed: 340, dmg: 0.5 }, summon: { every: 8, count: 4, max: 8, units: ['orb'] }, ward: 0.7, col: [0.3, 0.6, 1],
               intro: 'ПАРТИОННЫЙ УЧЁТ: щит держится, пока живы его клиенты' },
    boss:    { name: 'Критический инцидент', kind: 'pulse', hp: 9000, sp: 76, dmg: 22, r: 104, range: 330, wind: 1.2, cd: 2.6, xp: 100, poise: 4, boss: true,
               shots: { count: 10, speed: 380, dmg: 0.5 }, summon: { every: 7, count: 3, max: 12, units: ['orb', 'keg', 'baltika'] }, escalate: { every: 30, max: 4 },
               slow: { amount: 0.35, dur: 2 }, col: [1, 0.36, 0.36], intro: 'КРИТИЧЕСКИЙ ИНЦИДЕНТ: уничтожьте его, чтобы закрыть смену' },
    // the «Дата-центр»'s own bosses (docs/PLAN-FEEDBACK-27-10.md, stage 5); the training centre keeps Партионный учёт and Критический инцидент.
    // split: at that share of its health a copy breaks away; tether: while both live, the line between them hurts the hero who crosses it
    repl:    { name: 'Падение репликации', kind: 'shoot', hp: 2600, sp: 105, dmg: 18, r: 90, range: 640, wind: 0.8, cd: 1.7, xp: 70, poise: 4, boss: true, keep: 320,
               shots: { count: 5, speed: 420, dmg: 0.6, fan: 0.5 }, split: { at: 0.5 }, tether: { w: 40, tick: 0.4, dmg: 0.5 }, col: [0.85, 0.3, 0.95],
               intro: 'ПАДЕНИЕ РЕПЛИКАЦИИ: при половине здоровья делится надвое — не стойте на линии между копиями' },
    // queue: a row of marks through where the hero is heading (lead: seconds ahead), each going off after the one before; the boss
    // is quicker while its marks are pending
    rstorm:  { name: 'Шторм ретраев', kind: 'queue', hp: 6200, sp: 85, dmg: 36, r: 96, range: 780, wind: 0.8, cd: 2.4, xp: 85, poise: 4, boss: true,
               queue: { count: 7, gap: 140, delay: 1.0, step: 0.24, r: 115, haste: 0.12, lead: 0.7 }, summon: { every: 8, count: 4, max: 10, units: ['panel', 'multon'] }, col: [1, 0.6, 0.15],
               intro: 'ШТОРМ РЕТРАЕВ: метки взрываются по очереди, и пока очередь не пуста, он быстрее' },
    // the final boss: the lights go out and a restored component goes down on arrival and on every escalation; every component down
    // cuts the damage it takes (restart one by standing in its circle)
    outage:  { name: 'Отказ дата-центра', kind: 'pulse', hp: 8500, sp: 72, dmg: 24, r: 108, range: 340, wind: 1.2, cd: 2.6, xp: 110, poise: 4, boss: true, final: true,
               shots: { count: 10, speed: 380, dmg: 0.5 }, summon: { every: 7, count: 3, max: 12, units: ['orb', 'keg', 'logq'] }, escalate: { every: 30, max: 4 },
               outage: { dark: 9, ward: 0.15, minWard: 0.5 }, col: [0.9, 0.12, 0.1],
               intro: 'ОТКАЗ ДАТА-ЦЕНТРА: гасит свет и отключает компоненты — перезапускайте их, иначе урон по нему ниже' },
  };
  // the enemy list's lines (the collection's «Враги» tab): what each one does, read from its mechanics above
  const FOE_DESC = {
    node: 'Обычный узел: идёт к герою и бьёт вблизи', panel: 'Слабый и быстрый, берёт числом', multon: 'Быстрый, бьёт вблизи короткими ударами',
    orb: 'Издалека разгоняется и делает рывок к герою', keg: 'Медленный тяжеловес: бронированный перед, редкий сильный удар',
    baltika: 'Медленный тяжеловес, почти не отлетает от ударов', mars: 'Стреляет издалека, попадание замедляет',
    loreal: 'Стреляет залпом из восьми снарядов', ferrero: 'Миномёт: накрывает две точки возле героя',
    vetis: 'Бьёт волной вокруг себя, волна замедляет', mond: 'Петляет зигзагом и оставляет липкий след, след замедляет',
    prog: 'Бросает снаряды, которые отскакивают от пола', royal: 'Стреляет тремя снарядами веером, снаряды возвращаются',
    cherk: 'Раскручивается и бьёт всех вокруг', pg: 'Аура: враги рядом с ним получают вдвое меньше урона',
    petfood: 'Стреляет веером из пяти снарядов', logq: 'Наводит длинный луч и бьёт им по линии',
    sdesk: 'Неподвижный стол поддержки: раз в 7 с вызывает Пепси', bug: 'Баг компонента: миномёт по площади и рывки',
    bugl: 'Баг компонента: волна, сильно замедляет, рывки', bugg: 'Баг компонента: оставляет жгучие лужи, рывки',
    bugu: 'Баг компонента: стреляет кольцом из 14 снарядов, рывки', buga: 'Баг компонента: вызывает узлы L3, рывки',
    crpt: 'Мини-босс: стреляет кольцом и вызывает подкрепление', repl: 'Босс: делится надвое, линия между копиями обжигает',
    rstorm: 'Босс: очередь меток взрывается по одной, пока очередь не пуста — он быстрее', outage: 'Финальный босс: гасит свет и отключает компоненты', batch: 'Босс курса: пока живы его клиенты, урон по нему меньше',
    boss: 'Финальный босс: каждые 30 с злее, вызывает тяжеловесов, замедляет',
  };
  const HP_SCALE = 1.15, DMG_SCALE = 1.265;
  // weapon levels 1..6: base, then the project's five steps (data/weapons.js), distances ×2
  const WEAP0 = {
    trace:  { name: 'Трассировка кодов', ic: 'ic_trace', hero: 1, base: { dmg: 28, cd: 0.65, range: 175, half: Math.PI / 4, push: 290 },
              steps: [['+25% урона', { dmg: 0.25 }], ['+20% дальности', { range: 35 }], ['Быстрее на 15%', { cd: -0.15 }], ['+25% урона, шире сектор', { dmg: 0.25, half: 0.2 }], ['+35% урона', { dmg: 0.35 }]] },
    orbit:  { name: 'Орбитальный сканер', ic: 'ic_orbit', base: { dmg: 12, count: 2, radius: 144, spin: 3.2, rehit: 0.5 },
              steps: [['+1 сканер', { count: 1 }], ['+25% урона', { dmg: 0.25 }], ['+20% к радиусу орбиты', { radius: 28 }], ['+1 сканер', { count: 1 }], ['+30% урона, быстрее вращение', { dmg: 0.3, spin: 0.8 }]] },
    homing: { name: 'Криптохвост', ic: 'ic_homing', base: { dmg: 22, count: 1, cd: 1.4, speed: 660, life: 2.2 },
              steps: [['+25% урона', { dmg: 0.25 }], ['+1 снаряд', { count: 1 }], ['Быстрее на 15%', { cd: -0.15 }], ['+1 снаряд', { count: 1 }], ['+35% урона', { dmg: 0.35 }]] },
    mine:   { name: 'DataMatrix-мина', ic: 'ic_mine', base: { dmg: 34, count: 1, cd: 2.3, radius: 116, limit: 4, life: 12 },
              steps: [['+20% радиуса взрыва', { radius: 24 }], ['+25% урона', { dmg: 0.25 }], ['+1 мина за раз', { count: 1 }], ['Быстрее на 15%', { cd: -0.15 }], ['+35% урона, +3 мины на поле', { dmg: 0.35, limit: 3 }]] },
    ping:   { name: 'Пинг', ic: 'ic_ping', base: { dmg: 14, cd: 2.6, radius: 190, push: 440 },
              steps: [['+20% радиуса', { radius: 38 }], ['+30% урона', { dmg: 0.3 }], ['Быстрее на 15%', { cd: -0.15 }], ['+20% радиуса', { radius: 38 }], ['+40% урона', { dmg: 0.4 }]] },
    retry:  { name: 'Ретрай', ic: 'ic_retry', base: { dmg: 20, count: 1, cd: 1.9, speed: 860 },
              steps: [['+25% урона', { dmg: 0.25 }], ['+1 бумеранг', { count: 1 }], ['+20% скорости', { speed: 172 }], ['+30% урона', { dmg: 0.3 }], ['+1 бумеранг', { count: 1 }]] },
    cache:  { name: 'Горячий кэш', ic: 'ic_cache', base: { dmg: 9, count: 1, cd: 3.2, radius: 104, life: 3, tick: 0.5 },
              steps: [['+20% радиуса', { radius: 20 }], ['+30% урона', { dmg: 0.3 }], ['+1 зона', { count: 1 }], ['Быстрее на 15%', { cd: -0.15 }], ['+40% урона', { dmg: 0.4 }]] },
  };
  const WEAP = Object.assign(WEAP0, {
    // new (round 11): the Vampire Survivors / DRG Survivors staples in the project's terms
    udp:    { name: 'UDP-флуд', ic: 'ic_udp', base: { dmg: 9, count: 1, cd: 0.34, speed: 1150, life: 0.75, pierce: 0, spread: 0.1 },
              steps: [['+1 пакет', { count: 1 }], ['+25% урона', { dmg: 0.25 }], ['Быстрее на 15%', { cd: -0.15 }], ['Пробивает ещё 1 врага', { pierce: 1 }], ['+1 пакет, +30% урона', { count: 1, dmg: 0.3 }]] },
    chain:  { name: 'Эхо-запрос', ic: 'ic_chain', base: { dmg: 18, cd: 1.6, jumps: 3, range: 260 },
              steps: [['+1 переход', { jumps: 1 }], ['+25% урона', { dmg: 0.25 }], ['Быстрее на 15%', { cd: -0.15 }], ['+2 перехода', { jumps: 2 }], ['+35% урона', { dmg: 0.35 }]] },
    storm:  { name: 'Сетевой шторм', ic: 'ic_storm', base: { dmg: 30, count: 2, cd: 1.9, radius: 70 },
              steps: [['+1 разряд', { count: 1 }], ['+25% урона', { dmg: 0.25 }], ['+25% радиуса', { radius: 18 }], ['+1 разряд', { count: 1 }], ['+40% урона', { dmg: 0.4 }]] },
    turret: { name: 'Сторожевой сервер', ic: 'ic_turret', base: { dmg: 8, count: 1, cd: 9, life: 6, rate: 0.28, range: 560 },
              steps: [['Работает на 2 с дольше', { life: 2 }], ['+25% урона', { dmg: 0.25 }], ['Стреляет чаще', { rate: -0.06 }], ['+1 сервер', { count: 1 }], ['+35% урона', { dmg: 0.35 }]] },
    cryo:   { name: 'Криокулер', ic: 'ic_cryo', base: { dmg: 4, cd: 2.4, burst: 1.0, tick: 0.15, range: 230, half: 0.38 },
              steps: [['+25% урона', { dmg: 0.25 }], ['Струя дольше на 0,4 с', { burst: 0.4 }], ['+20% дальности', { range: 46 }], ['Быстрее на 15%', { cd: -0.15 }], ['+35% урона, шире струя', { dmg: 0.35, half: 0.12 }]] },
    fork:   { name: 'Форк-бомба', ic: 'ic_fork', base: { dmg: 40, cd: 3, radius: 110, split: 4, depth: 1 },
              steps: [['+20% радиуса', { radius: 22 }], ['+25% урона', { dmg: 0.25 }], ['+2 осколка', { split: 2 }], ['Быстрее на 15%', { cd: -0.15 }], ['+40% урона', { dmg: 0.4 }]] },
    // the force shield: a charge absorbs a whole hit (hurtHero), recharge cd s; push: a wave on a block (radius, damage)
    shield: { name: 'Отказоустойчивость', ic: 'ic_shield', kind: 'shield', base: { cd: 14, charges: 1, push: 0, radius: 220, dmg: 0 },
              steps: [['Перезарядка быстрее на 15%', { cd: -0.15 }], ['Поглощение отбрасывает врагов вокруг', { push: 1 }], ['Перезарядка быстрее на 15%', { cd: -0.15 }],
                      ['Волна поглощения наносит урон', { dmg: 40 }], ['Перезарядка быстрее на 20%, волна шире', { cd: -0.2, radius: 60 }]] },
    // evolutions: max level + the paired passive; one level, their own icon (ic_x_<base>)
    shield_x: { name: 'Кластер отказоустойчивости', of: 'shield', evo: 1, kind: 'shield', ic: 'ic_x_shield', base: { cd: 6, charges: 2, push: 1, radius: 320, dmg: 90 }, steps: [] },
    trace_x:  { name: 'Полная трассировка', of: 'trace', evo: 1, ic: 'ic_x_trace', base: { dmg: 50, cd: 0.5, range: 230, half: Math.PI / 3, push: 340, back: 1, heal: 0.6 }, steps: [] },
    orbit_x:  { name: 'Кольцо мониторинга', of: 'orbit', evo: 1, ic: 'ic_x_orbit', base: { dmg: 30, count: 6, radius: 210, spin: 4.6, rehit: 0.35 }, steps: [] },
    homing_x: { name: 'Рой криптохвостов', of: 'homing', evo: 1, ic: 'ic_x_homing', base: { dmg: 30, count: 3, cd: 0.4, speed: 780, life: 2.4 }, steps: [] },
    mine_x:   { name: 'Минное поле', of: 'mine', evo: 1, ic: 'ic_x_mine', base: { dmg: 62, count: 4, cd: 1.3, radius: 150, limit: 16, life: 10, ring: 150 }, steps: [] },
    ping_x:   { name: 'Heartbeat', of: 'ping', evo: 1, ic: 'ic_x_ping', base: { dmg: 28, cd: 1.5, radius: 310, push: 520, heal: 0.35 }, steps: [] },
    retry_x:  { name: 'Бесконечный ретрай', of: 'retry', evo: 1, ic: 'ic_x_retry', base: { dmg: 42, count: 8, cd: 1.3, speed: 1000 }, steps: [] },
    cache_x:  { name: 'Горячий кластер', of: 'cache', evo: 1, ic: 'ic_x_cache', base: { dmg: 15, count: 1, cd: 3, radius: 180, life: 3, tick: 0.3, follow: 1 }, steps: [] },
    udp_x:    { name: 'Широкополосный поток', of: 'udp', evo: 1, ic: 'ic_x_udp', base: { dmg: 15, count: 5, cd: 0.18, speed: 1300, life: 0.8, pierce: 99, spread: 0.16 }, steps: [] },
    chain_x:  { name: 'Широковещательный шторм', of: 'chain', evo: 1, ic: 'ic_x_chain', base: { dmg: 30, cd: 0.9, jumps: 14, range: 320 }, steps: [] },
    storm_x:  { name: 'DDoS', of: 'storm', evo: 1, ic: 'ic_x_storm', base: { dmg: 55, count: 8, cd: 1.0, radius: 110 }, steps: [] },
    turret_x: { name: 'Кластер серверов', of: 'turret', evo: 1, ic: 'ic_x_turret', base: { dmg: 14, count: 3, cd: 1, life: 1e9, rate: 0.14, range: 640, perm: 1 }, steps: [] },
    cryo_x:   { name: 'Абсолютный ноль', of: 'cryo', evo: 1, ic: 'ic_x_cryo', base: { dmg: 7, cd: 0, burst: 1e9, tick: 0.15, range: 300, half: 0.55, freeze: 1 }, steps: [] },
    fork_x:   { name: 'Fork-бомба ∞', of: 'fork', evo: 1, ic: 'ic_x_fork', base: { dmg: 70, cd: 2, radius: 140, split: 6, depth: 2 }, steps: [] },
    // the heroes' own attacks (hero: 1 — never offered to another hero)
    tchain:  { name: 'Цепочка прослеживаемости', ic: 'ic_tchain', hero: 1, base: { dmg: 24, cd: 0.9, range: 290, jumps: 6, cone: 1.0 },
               steps: [['+25% урона', { dmg: 0.25 }], ['+20% к длине перехода', { range: 58 }], ['Быстрее на 15%', { cd: -0.15 }], ['+2 цели', { jumps: 2 }], ['+35% урона', { dmg: 0.35 }]] },
    packet:  { name: 'Серийный пакет', ic: 'ic_packet', hero: 1, base: { dmg: 23, cd: 0.75, range: 775, speed: 1000, count: 1, spread: 0.2 },
               steps: [['+25% урона', { dmg: 0.25 }], ['+1 пакет', { count: 1 }], ['Быстрее на 15%', { cd: -0.15 }], ['+20% дальности', { range: 155 }], ['+35% урона, +1 пакет', { dmg: 0.35, count: 1 }]] },
    req:     { name: 'Разбор требований', ic: 'ic_req', hero: 1, kind: 'trace', base: { dmg: 26, cd: 0.85, range: 212, half: Math.PI * 2 / 5, push: 230 },
               steps: [['+25% урона', { dmg: 0.25 }], ['+20% дальности', { range: 42 }], ['Быстрее на 15%', { cd: -0.15 }], ['Шире сектор', { half: 0.2 }], ['+35% урона', { dmg: 0.35 }]] },
    regress: { name: 'Регрессионная проверка', ic: 'ic_regress', hero: 1, base: { dmg: 19, cd: 1.05, range: 225, stun: 0.6 },
               steps: [['+25% урона', { dmg: 0.25 }], ['+15% к зоне', { range: 34 }], ['Быстрее на 15%', { cd: -0.15 }], ['Прерывание дольше на 0,3 с', { stun: 0.3 }], ['+35% урона', { dmg: 0.35 }]] },
    tchain_x:  { name: 'Обратная цепь', of: 'tchain', evo: 1, ic: 'ic_x_tchain', base: { dmg: 34, cd: 0.75, range: 340, jumps: 10, cone: 1.2, back: 1 }, steps: [] },
    packet_x:  { name: 'Расщеплённый пакет', of: 'packet', evo: 1, ic: 'ic_x_packet', base: { dmg: 32, cd: 0.6, range: 900, speed: 1100, count: 2, spread: 0.2, split: 3 }, steps: [] },
    req_x:     { name: 'Работа с ключевым клиентом', of: 'req', kind: 'trace', evo: 1, ic: 'ic_x_req', base: { dmg: 44, cd: 0.7, range: 250, half: Math.PI / 2, push: 300, client: 2, heal: 0.5 }, steps: [] },
    regress_x: { name: 'Метка дефекта', of: 'regress', evo: 1, ic: 'ic_x_regress', base: { dmg: 28, cd: 0.9, range: 280, stun: 1.0, mark: 1 }, steps: [] },
  });
  // the five heroes: speed is relative to K.SPEED; price in codes (Utrace is free); col = the hero's accent
  const HEROES = {
    utrace:        { name: 'Utrace', role: 'Универсал', roleDesc: 'Ровный во всём, лучший выбор для первой смены.', price: 0, hp: 120, speed: 1, weapon: 'trace', art: 'hero', col: [0.0, 0.62, 0.73],
                     passive: { name: 'Универсальный стек', desc: '+1 слот оружия: 5 видов вместе с атакой героя', slots: 1 },
                     training: { name: 'Оптимизация Utrace', desc: '+6% к урону подобранного оружия', factor: 0.06 } },
    traceability:  { name: 'Полная прослеживаемость', role: 'Против толпы', roleDesc: 'Чем плотнее толпа вокруг, тем сильнее каждый удар.', price: 80, hp: 110, speed: 145 / 150, weapon: 'tchain', art: 'hr_trc', col: [0.43, 0.89, 0.8],
                     passive: { name: 'Связанные данные', desc: '+3% урона за каждого врага ближе 400 px, до +30%', crowd: 0.03, cap: 0.3 },
                     training: { name: 'Оптимизация: Полная прослеживаемость', desc: '+10% к пределу бонуса за толпу', factor: 0.1 } },
    serialization: { name: 'Сериализация', role: 'Дальний бой', roleDesc: 'Держит дистанцию и расстреливает врагов на подходе.', price: 100, hp: 100, speed: 160 / 150, weapon: 'packet', art: 'hr_ser', col: [0.98, 0.35, 0.27],
                     passive: { name: 'Дальняя доставка', desc: '+20% урона по врагам дальше 375 px', far: 0.2 },
                     training: { name: 'Оптимизация: Сериализация', desc: '+7% к урону по дальним врагам', factor: 0.07 } },
    ba:            { name: 'БА', role: 'Танк', roleDesc: 'Крепнет по ходу смены, побеждая своего клиента.', price: 120, hp: 135, speed: 140 / 150, weapon: 'req', art: 'hr_ba', col: [0.97, 0.81, 0.44],
                     passive: { name: 'Ключевой клиент', desc: '+1 HP (и к максимуму) за каждого побеждённого выбранного клиента', clientHp: 1 },
                     training: { name: 'Оптимизация: БА', desc: '+0,5 HP за убийство клиента', factor: 0.5 } },
    qa:            { name: 'QA', role: 'Контроль', roleDesc: 'Останавливает врагов и добивает отмеченные цели критами.', price: 140, hp: 115, speed: 1, weapon: 'regress', art: 'hr_qa', col: [0.47, 0.93, 0.74],
                     passive: { name: 'Найденный дефект', desc: '10% шанс крита ×1,8; по целям скана за 2 с ещё +35%', crit: 0.1, scanCrit: 0.35 },
                     training: { name: 'Оптимизация: QA', desc: '+4% к шансу крита', factor: 0.04 } },
  };
  // БА's key client: client brands only (no regulators, bugs or staff), as in the original's ba-specialization
  const CLIENTS = ['orb', 'keg', 'baltika', 'mars', 'loreal', 'multon', 'ferrero', 'mond', 'prog', 'royal', 'cherk', 'pg', 'petfood'];
  const heroOf = (S) => HEROES[S.hero] || HEROES.utrace;
  // evolution recipes: weapon at max level + this passive (any level) → evolved weapon (Vampire Survivors style)
  const EVO = { trace: ['power', 'trace_x'], orbit: ['speed', 'orbit_x'], homing: ['haste', 'homing_x'], mine: ['area', 'mine_x'], ping: ['hp', 'ping_x'],
    retry: ['amount', 'retry_x'], cache: ['dur', 'cache_x'], udp: ['magnet', 'udp_x'], chain: ['haste', 'chain_x'], storm: ['area', 'storm_x'],
    turret: ['dur', 'turret_x'], cryo: ['hp', 'cryo_x'], fork: ['power', 'fork_x'],
    tchain: ['amount', 'tchain_x'], packet: ['speed', 'packet_x'], req: ['hp', 'req_x'], regress: ['area', 'regress_x'], shield: ['firewall', 'shield_x'] };
  const WSUM = { trace: 'Сектор перед героем, отбрасывает', orbit: 'Сканеры кружат вокруг героя', homing: 'Пакеты взлетают веером и пикируют на случайных врагов', mine: 'Мина остаётся позади, на вашем следе',
    ping: 'Волна вокруг героя отталкивает врагов', retry: 'Летит дугой вверх в сторону от курсора и падает', cache: 'Горячая зона жжёт врагов',
    udp: 'Очередь пакетов по ходу движения', chain: 'Молния бьёт случайного врага рядом и перескакивает', storm: 'Разряды с неба по случайным врагам на экране',
    turret: 'Ставит сервер-турель, она стреляет сама', cryo: 'Струя холода вращается вокруг героя: урон и замедление', fork: 'Граната летит в самую плотную толпу и делится',
    trace_x: 'Бьёт вперёд и назад, лечит за каждое попадание', orbit_x: 'Шесть сканеров на широкой орбите', homing_x: 'Непрерывный рой самонаводящихся пакетов',
    mine_x: 'Мины ложатся кольцом вокруг героя', ping_x: 'Мощная волна, лечит за каждого задетого', retry_x: 'Восемь бумерангов во все стороны',
    cache_x: 'Горячая зона всегда вокруг героя', udp_x: 'Веер пакетов, пробивающих всех', chain_x: 'Молния перескакивает по всей толпе',
    storm_x: 'Восемь разрядов разом', turret_x: 'Три постоянных сервера-турели рядом с героем', cryo_x: 'Холод не выключается и замораживает врагов',
    fork_x: 'Осколки делятся ещё раз', shield: 'Щит полностью поглощает один удар, затем перезаряжается', shield_x: 'Два заряда щита, быстрая перезарядка, поглощение бьёт волной',
    tchain: 'Цепь от ближайшей цели впереди перескакивает на соседей, до 6 целей', packet: 'Пробивающий пакет в сторону курсора',
    req: 'Широкий сектор перед героем, сильно отбрасывает', regress: 'Квадрат проверки вокруг героя прерывает атаки обычных врагов',
    tchain_x: 'До 10 целей, цепь возвращается и бьёт ещё раз', packet_x: 'Пакеты расщепляются на три при первом попадании',
    req_x: 'Вдвое больнее выбранному клиенту, лечит за попадания', regress_x: 'Отмеченные цели 2 с получают на 50% больше урона' };
  const PASS = {
    hp:     { name: 'Резервное питание', ic: 'ic_hp', desc: '+20 к максимуму HP и лечение' },
    speed:  { name: 'Оптоволокно', ic: 'ic_speed', desc: '+8% к скорости' },
    magnet: { name: 'Широкий канал', ic: 'ic_magnet', desc: '+40% к радиусу сбора' },
    power:  { name: 'Оверклокинг', ic: 'ic_power', desc: '+12% ко всему урону' },
    haste:  { name: 'Низкая задержка', ic: 'ic_haste', desc: '−8% к перезарядке' },
    area:   { name: 'Широкий охват', ic: 'ic_area', desc: '+10% к радиусу и дальности оружия' },
    amount: { name: 'Репликация', ic: 'ic_amount', desc: '+1 снаряд на уровнях 2 и 4' },
    dur:    { name: 'Keep-alive', ic: 'ic_dur', desc: '+12% к времени действия' },
    firewall: { name: 'Брандмауэр', ic: 'ic_firewall', desc: '−7% получаемого урона' },
    repair: { name: 'Самовосстановление', ic: 'ic_repair', desc: '+0,3 HP в секунду' },
  };
  // hero skins (plan stage 4, round 23): a full part sheet of the SAME character in its own style — art: its sprites' prefix (body, leg,
  // foot, arm); the hero's rig and scanner stay, the base drawing is never replaced. Cosmetic only. col: the menus' accent colour.
  // every hero: a recolour (40), a calm (80) and an aggressive (120) one
  const SKINS = {
    utrace_arctic: { hero: 'utrace', name: 'Арктика', style: 'другая расцветка', price: 40, art: 'sk_utrace_arctic', col: [0.56, 0.83, 1] },
    utrace_zen:    { hero: 'utrace', name: 'Дзен', style: 'спокойный', price: 80, art: 'sk_utrace_zen', col: [0.62, 0.9, 0.81] },
    utrace_storm:  { hero: 'utrace', name: 'Штурм', style: 'агрессивный', price: 120, art: 'sk_utrace_storm', col: [1, 0.29, 0.24] },
    trc_sapphire: { hero: 'traceability', name: 'Сапфир', style: 'другая расцветка', price: 40, art: 'sk_trc_sapphire', col: [0.35, 0.55, 1] },
    trc_still: { hero: 'traceability', name: 'Тишина', style: 'спокойный', price: 80, art: 'sk_trc_still', col: [0.66, 0.92, 0.84] },
    trc_intercept: { hero: 'traceability', name: 'Перехват', style: 'агрессивный', price: 120, art: 'sk_trc_intercept', col: [0.56, 0.36, 1] },
    ser_cobalt: { hero: 'serialization', name: 'Кобальт', style: 'другая расцветка', price: 40, art: 'sk_ser_cobalt', col: [0.3, 0.5, 1] },
    ser_cloud: { hero: 'serialization', name: 'Облако', style: 'спокойный', price: 80, art: 'sk_ser_cloud', col: [0.65, 0.83, 1] },
    ser_breach: { hero: 'serialization', name: 'Взлом', style: 'агрессивный', price: 120, art: 'sk_ser_breach', col: [0.22, 1, 0.53] },
    ba_platinum: { hero: 'ba', name: 'Платина', style: 'другая расцветка', price: 40, art: 'sk_ba_platinum', col: [0.81, 0.84, 0.87] },
    ba_consult: { hero: 'ba', name: 'Консультант', style: 'спокойный', price: 80, art: 'sk_ba_consult', col: [0.56, 0.85, 0.81] },
    ba_deadline: { hero: 'ba', name: 'Дедлайн', style: 'агрессивный', price: 120, art: 'sk_ba_deadline', col: [1, 0.2, 0.33] },
    qa_onyx: { hero: 'qa', name: 'Оникс', style: 'другая расцветка', price: 40, art: 'sk_qa_onyx', col: [0.37, 0.94, 0.75] },
    qa_sandbox: { hero: 'qa', name: 'Песочница', style: 'спокойный', price: 80, art: 'sk_qa_sandbox', col: [0.71, 0.86, 1] },
    qa_crash: { hero: 'qa', name: 'Краш-тест', style: 'агрессивный', price: 120, art: 'sk_qa_crash', col: [1, 0.83, 0] },
  };
  // the heroes' E abilities (data/characters/abilities.js of the original): cd and dur in s, radius ×2; rank (level-up cards, max AB_MAX)
  // adds rankDur s, rankPow damage share or rankStun s
  const ABIL = {
    utrace:        { id: 'overclock', name: 'Оверклокинг', ic: 'ab_overclock', cd: 22, dur: 6, rankDur: 1, haste: 1.6, speed: 1.15,
                     desc: 'Разгон ядра: на 6 с темп атак ×1,6 и скорость +15%', up: 'Оверклокинг действует на 1 с дольше' },
    traceability:  { id: 'registry', name: 'Реестр', ic: 'ab_registry', cd: 20, dur: 5, rankDur: 1,
                     desc: 'На 5 с цепь бьёт всю связанную группу без лимита целей', up: 'Реестр действует на 1 с дольше' },
    serialization: { id: 'volley', name: 'Залп', ic: 'ab_volley', cd: 14, dur: 0.3, count: 12, power: 0.8, rankPow: 0.25,
                     desc: '12 пробивающих пакетов веером во все стороны', up: '+25% к урону пакетов залпа' },
    ba:            { id: 'negotiate', name: 'Переговоры', ic: 'ab_negotiate', cd: 24, dur: 4, rankDur: 1, radius: 480,
                     desc: 'На 4 с обычные враги рядом не атакуют, а выбранный клиент — по всей карте', up: 'Переговоры действуют на 1 с дольше' },
    qa:            { id: 'field', name: 'Регресс', ic: 'ab_field', cd: 18, dur: 3, radius: 280, stun: 2, rankStun: 0.5,
                     desc: 'Зона регресса на 3 с: обычные враги в ней замирают на 2 с', up: 'Враги в зоне замирают на 0,5 с дольше' },
  };
  const AB_MAX = 3;
  const abOf = (S) => ABIL[S.hero] || ABIL.utrace;
  const abOn = (S) => !!S.ab && S.t < S.ab.until;                                    // the ability is running
  const MAX_W = 4, MAX_P = 6, MAX_PL = 5, MAX_WL = 6;   // weapons besides the hero's own attack (+ the hero's slots: Utrace 5), 6 passive kinds
  const wstat = (id, lv) => { const w = WEAP[id], s = Object.assign({}, w.base); for (let i = 0; i < lv - 1; i++) { const d = w.steps[i][1];
    for (const k in d) s[k] = k === 'dmg' || k === 'cd' ? s[k] * (1 + d[k]) : s[k] + d[k]; } return s; };

  // ---------------- level: generated per run (MAPS); y = ground contact point ----------------
  // Every run builds its own layout from its seed. The plaza round the core is fixed (the reference's composition); the five
  // component zones swap places, their nodes shift, rack rows / desks / machines vary in length, gaps and offsets, the set dressing
  // is re-scattered, energy cells and service desks move. A layout is validated (no overlaps, start and nodes clear, everything
  // reachable) before use; a bad seed falls through to the next one. The attract demo always uses seed 0.
  const hseed = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  // ground footprints [half width, half depth], measured from each drawing at its in-game size: the front edge sits on the ground
  // point, the depth runs back like the top face of the 3/4 drawing
  const FOOT = { ups: [56, 26], pdu: [36, 20], cart: [32, 16], cart_b: [38, 18], core: [205, 104], cage: [157, 72], crac: [127, 58], tray: [51, 17],
    firerack: [35, 15], switch: [37, 18], desk: [62, 30], tapelib: [45, 21], patch: [28, 17], cell: [38, 20],
    blade: [37, 18], dock: [37, 24], holopillar: [25, 16], spool: [42, 23], manifold: [44, 22], batbank: [54, 25], switchstack: [43, 24], crates: [42, 23], mast: [44, 24], rack_open: [69, 31] };
  const HOLD_T = 30;   // seconds standing in a node circle to work around its bug
  const RESTART_T = 8;   // seconds to restart a component the outage switched off (stage 5)
  const NODE_R = 430;
  // the five components of the original (data/enemies/nodes.js): name, bug miniboss, floor colour and pattern, structure style, set kit
  const COMPONENTS = [
    { id: 'production-aggreagtion', name: 'АГРЕГАЦИЯ', bug: 'buga', col: [0.0, 0.9, 1.0], pat: 1, style: 'racks', kit: ['crates', 'spool', 'rack_open', 'manifold'] },
    { id: 'code-usage-report', name: 'ОТЧЁТ О НАНЕСЕНИИ', bug: 'bugu', col: [0.39, 1.0, 0.85], pat: 0, style: 'desks', kit: ['holopillar', 'mast', 'desk', 'crates'] },
    { id: 'inport-operation-processor', name: 'ИМПОРТ', bug: 'bug', col: [0.45, 0.8, 1.0], pat: 2, style: 'import', kit: ['dock', 'switchstack', 'crates', 'rack_open'] },
    { id: 'logistic-processor', name: 'ЛОГИСТИКА', bug: 'bugl', col: [0.2, 0.7, 1.0], pat: 3, style: 'logistics', kit: ['crates', 'spool', 'cart_b', 'dock', 'manifold'] },
    { id: 'goods-reports', name: 'ТОВАРНЫЕ ОТЧЁТЫ', bug: 'bugg', col: [0.6, 0.85, 1.0], pat: 4, style: 'goods', kit: ['blade', 'patch', 'crates', 'holopillar'] },
  ];
  // zone rectangles round the plaza: NW, NE, SE, S, SW (the north hall between NW and NE is neutral)
  const RECTS = [{ x0: 0, y0: 0, x1: 2900, y1: 2500 }, { x0: 5100, y0: 0, x1: 8000, y1: 2500 }, { x0: 5100, y0: 3500, x1: 8000, y1: 6000 },
    { x0: 2900, y0: 4150, x1: 5100, y1: 6000 }, { x0: 0, y0: 3500, x1: 2900, y1: 6000 }];
  const PLAZA = { col: [0.0, 0.9, 1.0] };
  // the active level (useLevel): the sim and the scene read these names
  let FLOW = null, FLOWC = -1;                                    // the flow field cache (reset when the level changes)
  let LV = null, LEVEL_ID = 0, ZONES, PROPS, BOXES, LAMPS, TANKS, STENCILS, CABLES, TAPES, HOLOS, RINGS, DESKS, BG, WALL;
  const zoneAt = (x, y) => ZONES.find((z) => x >= z.x0 && x < z.x1 && y >= z.y0 && y < z.y1) || null;

  // ---- the data centre ----
  function buildDC(seed) {
    let rs = seed | 0; const lr = () => { rs = (rs + 0x6D2B79F5) | 0; let t = rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const jit = (a) => (lr() - 0.5) * 2 * a;
    const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(lr() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const order = shuffle([0, 1, 2, 3, 4]);
    const ZONES = RECTS.map((r, i) => { const c = COMPONENTS[order[i]], mx = NODE_R + 170, my = NODE_R * 0.62 + 230;
      const nx = Math.max(r.x0 + mx, Math.min(r.x1 - mx, (r.x0 + r.x1) / 2 + jit((r.x1 - r.x0) * 0.1))), ny = Math.max(r.y0 + my, Math.min(r.y1 - my, (r.y0 + r.y1) / 2 + 50 + jit((r.y1 - r.y0) * 0.08)));
      return Object.assign({}, c, r, { nx: Math.round(nx), ny: Math.round(ny) }); });
    const PROPS = [], BOXES = [], LAMPS = [], TANKS = [], STENCILS = [], CABLES = [], TAPES = [], HOLOS = [], RINGS = [];
    const add = (k, x, y, f = 0) => PROPS.push([k, Math.round(x), Math.round(y), f]);
    const clear = (x, y, r) => Math.hypot(x - SPAWN[0], (y - SPAWN[1]) * 1.3) > r;
    const offNode = (x, y, m = 0) => ZONES.every((z) => Math.hypot(x - z.nx, (y - z.ny) * 1.25) > NODE_R + 160 + m);
    const lane = (x, y) => Math.abs(x - 4000) < 300 && (y < 2450 || y > 3550);            // the N–S cold corridor (north hall, Логистика) stays open
    const ok = (x, y) => clear(x, y, 1150) && offNode(x, y) && !lane(x, y) && x > 300 && x < WORLD.x1 - 300;
    const row = (x0, y, n, f = 0) => { for (let i = 0; i < n; i++) add(i % 3 ? 'rack' : 'rack_b', x0 + i * 150, y, (i + f) % 2);
      BOXES.push({ x: x0 + (n - 1) * 75, y: y - 20, hw: n * 75 - 28, hh: 20 }); TAPES.push([[x0 - 90, y + 46], [x0 + (n - 1) * 150 + 90, y + 46]]); };
    const rowOk = (x0, y, n) => { for (let i = 0; i < n; i++) if (!ok(x0 + i * 150, y)) return false; return true; };
    // the central plaza = the match screen: the reference's composition as a datacenter (fixed)
    add('core', ...R(170, 262)); row(R(860, 118)[0], R(860, 118)[1], 2); add('switch', ...R(770, 118));
    add('cage', ...R(1235, 412)); add('crac', ...R(85, 560)); add('crac', ...R(85, 690)); add('cart', ...R(250, 640)); add('tray', ...R(330, 470));
    for (const [x, y] of [[430, 140], [612, 300], [918, 650]]) LAMPS.push(R(x, y));
    for (const [x, y] of [[480, 68], [1230, 528], [840, 705]]) add('ups', ...R(x, y));
    for (const [x, y] of [[210, 388], [430, 525], [1135, 478]]) add('pdu', ...R(x, y));
    add('firerack', ...R(560, 700));
    for (const [x, y] of [[1010, 345], [1040, 365], [1068, 338], [1090, 372]]) TANKS.push(R(x, y));
    STENCILS.push({ x: R(480, 268)[0], y: R(480, 268)[1], rot: -0.21, s: 'ПРАВИЛО №3: НЕ СТОЙ НА МЕСТЕ', sz: 64 });
    RINGS.push([SPAWN[0], SPAWN[1], 900], [R(170, 262)[0], R(170, 262)[1] - 40, 320]);
    // outer walls: rack rows top and bottom, cooling units on the sides
    for (let x = 140; x < WORLD.x1 - 700; x += 900) { row(x, 150, 5); row(x + 75, WORLD.y1 - 10, 5, 1); }
    for (let y = 430; y < WORLD.y1 - 160; y += 320) { add('crac', 110, y); add('crac', WORLD.x1 - 110, y, 1); }
    // each zone's structure by its component's style, fitted to whichever rectangle it landed in (lengths, gaps and offsets vary)
    const STYLE = {
      racks: (r) => { for (let y = r.y0 + 620 + jit(40), ri = 0; y < r.y1 - 230; y += 520 + jit(30), ri++) for (let x0 = r.x0 + 420 + (ri % 2) * 110 + jit(60); ;) {
        const n = 3 + Math.floor(lr() * 3); if (x0 + (n - 1) * 150 > r.x1 - 300) break; if (lr() > 0.15 && rowOk(x0, y, n)) row(x0, y, n, ri); x0 += n * 150 + 260 + jit(60); } },
      desks: (r) => { for (let y = r.y0 + 600 + jit(30), ri = 0; y < r.y1 - 200; y += 520 + jit(30), ri++) for (let x = r.x0 + 350 + (ri % 2) * 250 + jit(50); x < r.x1 - 400; x += 700 + jit(40)) {
        if (lr() < 0.12 || !ok(x, y) || !ok(x + 150, y)) continue; const m = Math.floor(lr() * 3);
        if (m === 0) { add('tapelib', x, y); add('tapelib', x + 150, y); } else if (m === 1) { add('desk', x, y); HOLOS.push([Math.round(x), Math.round(y - 150), 0]); } else { add('holopillar', x, y); add('holopillar', x + 120, y); } } },
      import: (r) => { for (let y = r.y0 + 350 + jit(30), ri = 0; y < r.y1 - 200; y += 520 + jit(30), ri++) for (let x0 = r.x0 + 300 + (ri % 2) * 140 + jit(50); x0 + 470 < r.x1 - 250; x0 += 820 + jit(40)) {
        if (lr() < 0.12 || !rowOk(x0, y, 3) || !ok(x0 + 470, y)) continue; row(x0, y, 3, ri); add('switchstack', x0 + 470, y); } },
      logistics: (r) => { for (let y = r.y0 + 250 + jit(30), ri = 0; y < r.y1 - 200; y += 520 + jit(30), ri++) for (let x = r.x0 + 250 + (ri % 2) * 200 + jit(50); x + 230 < r.x1 - 200; x += 760 + jit(40)) {
        if (lr() < 0.12 || !ok(x, y) || !ok(x + 230, y)) continue; add(lr() < 0.5 ? 'batbank' : 'ups', x, y); add('cart', x + 230, y); } },
      goods: (r) => { for (let y = r.y0 + 350 + jit(30), ri = 0; y < r.y1 - 200; y += 520 + jit(30), ri++) for (let x = r.x0 + 400 + (ri % 2) * 200 + jit(50); x + 140 < r.x1 - 200; x += 620 + jit(30)) {
        if (lr() < 0.12 || !ok(x, y) || !ok(x + 140, y)) continue; if (lr() < 0.5) { add('tapelib', x, y); add('patch', x + 140, y); } else { add('blade', x, y); add('patch', x + 120, y); } } },
    };
    ZONES.forEach((z) => STYLE[z.style](z));
    // the neutral north hall: two columns of rack rows either side of the cold corridor
    for (let y = 620 + jit(40), ri = 0; y < 2300; y += 520 + jit(30), ri++) { const nl = 3 + Math.floor(lr() * 2), nr = 3 + Math.floor(lr() * 2), xl = 3680 - (nl - 1) * 150 - lr() * 120, xr = 4320 + lr() * 100;
      if (lr() > 0.15 && rowOk(xl, y, nl)) row(xl, y, nl, ri); if (lr() > 0.15 && xr + (nr - 1) * 150 < 4800 && rowOk(xr, y, nr)) row(xr, y, nr, ri + 1); }
    // set dressing scatter (checks every footprint, 70 px clear round each)
    const fits = (k, x, y, m) => { const [hw, hh] = FOOT[k], cy = y - hh; if (x - hw < 250 || x + hw > WORLD.x1 - 250 || y < 420 || y > WORLD.y1 - 200) return false;
      if (BOXES.some((b) => Math.abs(x - b.x) < hw + b.hw + m && Math.abs(cy - b.y) < hh + b.hh + m)) return false;
      if (TANKS.some(([tx, ty]) => Math.abs(x - tx) < hw + 60 + m && Math.abs(y - ty) < hh + 40 + m)) return false;
      return !PROPS.some(([k2, x2, y2]) => FOOT[k2] && Math.abs(x - x2) < hw + FOOT[k2][0] + m && Math.abs(cy - (y2 - FOOT[k2][1])) < hh + FOOT[k2][1] + m); };
    // energy cells: the plaza's (first, fixed) + 8 clusters of 3 picked from 14 spots
    const CELLS = [[3500, 4660], [4500, 4660], [3500, 5650], [4500, 5650], [2650, 3100], [5400, 3100], [4300, 900], [3700, 2100], [1500, 2900], [6500, 2900], [2100, 3250], [5900, 3250], [1450, 5650], [6550, 5650]];
    let nc = 0; for (const [cx0, cy0] of shuffle(CELLS)) { if (nc >= 8) break; const cx = cx0 + jit(60), cy = cy0 + jit(40); const pts = [0, 1, 2].map((i) => [Math.round(cx + i * 46 - 46), Math.round(cy + (i % 2) * 24)]);
      if (!offNode(cx, cy) || !pts.every(([x, y]) => fits('cell', x, y, 20))) continue; TANKS.push(...pts); nc++; }
    // set dressing on 42% of the grid spots, as in the hand-made layout
    ZONES.forEach((z) => { for (let gy = z.y0 + 300; gy < z.y1 - 150; gy += 290) for (let gx = z.x0 + 300; gx < z.x1 - 150; gx += 330) {
      if (lr() > 0.42) continue; const k = z.kit[Math.floor(lr() * z.kit.length)], x = gx + jit(60), y = gy + jit(40);
      if (clear(x, y, 1000) && offNode(x, y) && !lane(x, y) && fits(k, x, y, 70)) add(k, x, y, lr() > 0.5 ? 1 : 0); } });
    for (const z of ZONES) STENCILS.push({ x: z.nx, y: z.ny + NODE_R * 0.62 + 90, rot: 0, s: z.name, sz: 72 });
    STENCILS.push({ x: 4000, y: 1400, rot: 0.03, s: 'ХОЛОДНЫЙ КОРИДОР', sz: 64 }, { x: 4000, y: 3950, rot: -0.03, s: 'НЕ ПЕРЕЗАГРУЖАТЬ!', sz: 60 });
    // fibre trunks across the floor (packets stream along them in the scene), ceiling light pools
    for (const y of [2800, 3200]) CABLES.push([[80, y], [2600, y + 40], [5400, y - 40], [WORLD.x1 - 80, y]]);
    for (const x of [3800, 4200]) CABLES.push([[x, 220], [x + 30, 2400], [x - 30, 3700], [x, WORLD.y1 - 80]]);
    // ceiling fixtures (light pools only) over aisles and the plaza
    for (let gy = 0; gy < 12; gy++) for (let gx = 0; gx < 13; gx++) { const x = 380 + gx * 600 + (gy % 2) * 300, y = 380 + gy * 470;
      if (clear(x, y, 800) && x < WORLD.x1 - 200 && y < WORLD.y1 - 150) LAMPS.push([Math.round(x), Math.round(y)]); }
    // two Pepsi service desks on open floor (foes, not solids): picked from candidate spots, clear of props and nodes
    const DESKS = []; for (const [x0, y0] of shuffle([[4000, 1250], [5400, 2940], [2600, 2940], [4000, 4250], [1450, 2950], [6550, 3000]])) { if (DESKS.length >= 2) break;
      const x = Math.round(x0 + jit(80)), y = Math.round(y0 + jit(50)); if (offNode(x, y) && clear(x, y, 700) && fits('desk', x, y, 90)) DESKS.push([x, y]); }
    return { ZONES, PROPS, BOXES, LAMPS, TANKS, STENCILS, CABLES, TAPES, HOLOS, RINGS, DESKS, START: SPAWN, needDesks: 1 };
  }

  // ---- the training centre (utreys-survivors' learning map): rooms in order, each filling the whole floor ----
  // Rooms 0–2 are mazes (live/edu.js, one per course topic) with three guarded terminals and a door; room 3 is the central hall with
  // the course's boss among rack blocks. A room is a level of its own (map 'edu', the run's seed, the room's number).
  const EDU_MAZE = { cols: 10, rows: 8, wall: 90 };                 // the original's 10 × 10 square arena, stretched to the 8000 × 6000 floor
  const EDU_KIT = ['holopillar', 'crates', 'tapelib', 'patch', 'switchstack', 'spool', 'manifold', 'blade', 'mast', 'batbank'];
  const TERM_R = 330, TERM_USE = 230;                                // a terminal's workaround circle, how close the hero must be to use it (or the door)
  function buildEdu(seed, room) {
    const C = root.COURSE, def = C.rooms[Math.min(room, C.rooms.length - 1)], lr = root.EDU.mulberry((seed * 31 + room * 7717) >>> 0), jit = (a) => (lr() - 0.5) * 2 * a;
    const L = { ZONES: [], PROPS: [], BOXES: [], LAMPS: [], TANKS: [], STENCILS: [], CABLES: [], TAPES: [], HOLOS: [], RINGS: [], DESKS: [], WALLS: [], TERMS: [], room, def,
      col: [[0.0, 0.9, 1.0], [0.39, 1.0, 0.85], [0.55, 0.7, 1.0]][room] || [0.0, 0.9, 1.0] };                      // each room's floor accent
    const wallBox = (w) => { L.WALLS.push(w); L.BOXES.push({ x: w.x + w.w / 2, y: w.y + w.h / 2, hw: w.w / 2, hh: w.h / 2, k: 'wall' }); };
    const fits = (k, x, y) => { const [hw, hh] = FOOT[k], cy = y - hh; return !L.BOXES.some((b) => Math.abs(x - b.x) < hw + b.hw - 2 && Math.abs(cy - b.y) < hh + b.hh - 2)
      && !L.PROPS.some(([k2, x2, y2]) => Math.abs(x - x2) < hw + FOOT[k2][0] + 40 && Math.abs(cy - (y2 - FOOT[k2][1])) < hh + FOOT[k2][1] + 40); };
    if (def.maze) {
      const mz = root.EDU.maze({ W: WORLD.x1, H: WORLD.y1, cols: EDU_MAZE.cols, rows: EDU_MAZE.rows, wall: EDU_MAZE.wall, braid: C.maze.braid, terminals: C.maze.terminals }, seed, room);
      mz.walls.forEach(wallBox); L.mz = mz; L.START = [mz.entry.x, mz.entry.y + 60]; L.EXIT = [mz.exit.x, mz.exit.y];
      // a terminal = a console (the desk drawing, solid) with its hologram; the hero uses it from the front
      mz.terminals.forEach((t, k) => { L.TERMS.push({ x: t.x, y: t.y + 70, cx: t.x, cy: t.y, guard: t.guard, k, topic: def.topic, cell: t.cell }); L.PROPS.push(['desk', t.x, t.y - 20, 0]); L.HOLOS.push([t.x, t.y - 170, 0]); });
      // set dressing against closed north walls of ordinary cells (flush with the wall: no slivers of unreachable floor)
      const busy = new Set([mz.terminals.map((t) => t.cell), mz.exitCell, Math.floor(mz.entry.y / mz.ch) * mz.cols + Math.floor(mz.entry.x / mz.cw)].flat());
      for (let i = 0; i < mz.cols * mz.rows; i++) { if (busy.has(i) || mz.open[i] & 8 || lr() > 0.5) continue; const c = i % mz.cols, r = Math.floor(i / mz.cols), top = r * mz.ch + EDU_MAZE.wall / 2;
        for (let n = 0, m = 1 + Math.floor(lr() * 2); n < m; n++) { const k = EDU_KIT[Math.floor(lr() * EDU_KIT.length)], [hw, hh] = FOOT[k], x = c * mz.cw + mz.cw / 2 + jit(mz.cw / 2 - EDU_MAZE.wall - hw - 30), y = top + 2 * hh;
          if (fits(k, x, y)) L.PROPS.push([k, Math.round(x), Math.round(y), lr() > 0.5 ? 1 : 0]); } }
      for (let i = 0; i < mz.cols * mz.rows; i++) L.LAMPS.push([Math.round((i % mz.cols + 0.5) * mz.cw + jit(80)), Math.round((Math.floor(i / mz.cols) + 0.5) * mz.ch + jit(60))]);
    } else {
      // the hall: the original's 2200 px arena scaled to the floor; its four rack blocks become pairs of rack rows (cover), coolers on the walls
      const kx = WORLD.x1 / 2200, ky = WORLD.y1 / 2200, w = EDU_MAZE.wall;
      [[0, 0, WORLD.x1, w], [0, WORLD.y1 - w, WORLD.x1, w], [0, 0, w, WORLD.y1], [WORLD.x1 - w, 0, w, WORLD.y1]].forEach(([x, y, ww, hh]) => wallBox({ x, y, w: ww, h: hh, hor: ww > hh }));
      L.START = [Math.round(def.entry.x * kx), Math.round(def.entry.y * ky)]; L.BOSS = [Math.round(def.boss.x * kx), Math.round(def.boss.y * ky)];
      const row = (x0, y, n, f) => { for (let i = 0; i < n; i++) L.PROPS.push([i % 3 ? 'rack' : 'rack_b', Math.round(x0 + i * 150), Math.round(y), (i + f) % 2]);
        L.BOXES.push({ x: x0 + (n - 1) * 75, y: y - 20, hw: n * 75 - 28, hh: 20 }); L.TAPES.push([[x0 - 90, y + 46], [x0 + (n - 1) * 150 + 90, y + 46]]); };
      def.racks.forEach(([x, y, ww, hh], i) => { const cx = (x + ww / 2) * kx, cy = (y + hh / 2) * ky; row(cx - 225, cy - 120, 4, i); row(cx - 225, cy + 200, 4, i + 1); });
      for (let y = 600; y < WORLD.y1 - 300; y += 520) { L.PROPS.push(['crac', 210, y, 0], ['crac', WORLD.x1 - 210, y, 1]); }
      for (const [x, y] of [[2300, 3000], [5700, 3000], [4000, 1300], [4000, 4400]]) for (let i = 0; i < 3; i++) L.TANKS.push([Math.round(x + i * 46 - 46), Math.round(y + (i % 2) * 24)]);
      for (let gy = 0; gy < 10; gy++) for (let gx = 0; gx < 13; gx++) L.LAMPS.push([380 + gx * 600 + (gy % 2) * 300, 380 + gy * 560]);
      L.RINGS.push([L.BOSS[0], L.BOSS[1] + 40, 520]);
      L.STENCILS.push({ x: 4000, y: L.START[1] - 330, rot: -0.02, s: (def.name || 'ЦЕНТРАЛЬНЫЙ ЗАЛ').toUpperCase(), sz: 72 });
    }
    return L;
  }
  const MAPS = { dc: { name: 'Дата-центр Utrace', build: buildDC }, edu: { name: 'Учебный центр', build: buildEdu, rooms: () => root.COURSE.rooms.length } };

  // solids, buckets and the walk grid of a built layout
  const inBox = (b, x, y, r) => b.dia ? Math.abs(x - b.x) / (b.hw + r) + Math.abs(y - b.y) / (b.hh + r * 0.6) < 1 : Math.abs(x - b.x) < b.hw + r && Math.abs(y - b.y) < b.hh + r * 0.6;
  function finishLevel(L) {
    for (const [k, x, y] of L.PROPS) if (FOOT[k]) L.BOXES.push(k === 'core' ? { x, y: y - FOOT[k][1], hw: FOOT[k][0], hh: FOOT[k][1], k, dia: true } : { x, y: y - FOOT[k][1], hw: FOOT[k][0], hh: FOOT[k][1], k });
    L.TANKS.forEach(([x, y], ti) => L.BOXES.push({ x, y: y - FOOT.cell[1], hw: FOOT.cell[0], hh: FOOT.cell[1], tank: true, ti }));
    // boxes bucketed on a 400 px grid (each bucket keeps BOXES order and every box within 300 px of the cell, more than any actor's pad + push)
    L.BG = []; for (let j = 0; j < BGH; j++) for (let i = 0; i < BGW; i++) L.BG.push(L.BOXES.filter((b) => b.x + b.hw + 300 > i * BC && b.x - b.hw - 300 < (i + 1) * BC && b.y + b.hh + 300 > j * BC && b.y - b.hh - 300 < (j + 1) * BC));
    L.WALL = new Uint8Array(FW * FH); for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) { const x = i * FC + FC / 2, y = j * FC + FC / 2, bk = L.BG[Math.min(BGH - 1, Math.floor(y / BC)) * BGW + Math.min(BGW - 1, Math.floor(x / BC))];
      L.WALL[j * FW + i] = bk.some((b) => inBox(b, x, y, 18)) ? 1 : 0; }
    return L; }
  // a layout's problems (empty = usable): props outside the world, solids interpenetrating, cells inside props, the start or a node
  // circle blocked, floor (or a node, or a desk) that cannot reach the start
  function validate(L) { const out = [], ST0 = L.START || SPAWN;
    for (const [k, x, y] of L.PROPS) if (x < 0 || x > WORLD.x1 || y < 0 || y > WORLD.y1) out.push(`prop ${k} outside the world at ${x},${y}`);
    if (L.BOXES.some((b) => inBox(b, ST0[0], ST0[1], K.R))) out.push('hero spawn is inside a solid');
    for (const [x, y] of L.TANKS) if (L.BOXES.some((b) => !b.tank && Math.abs(x - b.x) < b.hw + 30 && Math.abs(y - FOOT.cell[1] - b.y) < b.hh + 20)) out.push(`energy cell inside a prop at ${x},${y}`);
    for (let i = 0; i < L.BOXES.length; i++) for (let j = i + 1; j < L.BOXES.length; j++) { const a = L.BOXES[i], b = L.BOXES[j];
      if (!a.tank && !b.tank && !(a.k === 'wall' && b.k === 'wall') && Math.abs(a.x - b.x) < a.hw + b.hw - 8 && Math.abs(a.y - b.y) < a.hh + b.hh - 8) out.push(`overlapping props ${a.k || 'row'} at ${Math.round(a.x)},${Math.round(a.y)} and ${b.k || 'row'} at ${Math.round(b.x)},${Math.round(b.y)}`); }
    for (const z of L.ZONES) if (L.BOXES.some((b) => !b.tank && Math.hypot(b.x - z.nx, (b.y - z.ny) / 0.62) < NODE_R * 0.75)) out.push(`a solid inside the node circle of ${z.name}`);
    const c0 = Math.floor(ST0[1] / FC) * FW + Math.floor(ST0[0] / FC), D = new Uint16Array(FW * FH).fill(65535), Q = new Int32Array(FW * FH); let h = 0, tl = 0; D[c0] = 0; Q[tl++] = c0;
    while (h < tl) { const k = Q[h++], i = k % FW, j = (k - i) / FW, d = D[k] + 1;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= FW || b >= FH) continue; const n = b * FW + a; if (L.WALL[n] || D[n] <= d) continue; D[n] = d; Q[tl++] = n; } }
    const reach = (x, y) => D[Math.floor(y / FC) * FW + Math.floor(x / FC)] < 65535;
    let open = 0, cutN = 0; for (let k = 0; k < D.length; k++) if (!L.WALL[k]) { open++; if (D[k] === 65535) cutN++; }
    if (cutN > open * 0.01) out.push(`${cutN} of ${open} open floor cells cannot reach the hero's start`);
    for (const z of L.ZONES) if (!reach(z.nx, z.ny)) out.push(`node ${z.name} unreachable`);
    for (const [x, y] of L.DESKS) if (!reach(x, y)) out.push(`service desk at ${x},${y} unreachable`);
    if (L.needDesks && L.DESKS.length < 2) out.push('fewer than 2 service desks placed');
    for (const tm of L.TERMS || []) { if (!reach(tm.x, tm.y)) out.push(`terminal ${tm.k + 1} unreachable`); if (!reach(tm.guard.x, tm.guard.y)) out.push(`terminal ${tm.k + 1}'s guard post unreachable`); }
    if (L.EXIT && !reach(L.EXIT[0], L.EXIT[1])) out.push('the door is unreachable');
    if (L.BOSS && !reach(L.BOSS[0], L.BOSS[1])) out.push('the boss spot is unreachable');
    return out; }
  // build a usable layout for (map, seed, room): a seed whose layout fails validation falls through to the next one (deterministic)
  const LCACHE = new Map();
  function buildLevel(map, seed, room = 0) { const key = map + ':' + seed + ':' + room; if (LCACHE.has(key)) return LCACHE.get(key); let L = null;
    let k = 0; for (; k < 24; k++) { L = finishLevel(MAPS[map].build(seed + k * 7919, room)); if (!validate(L).length) break; }
    Object.assign(L, { map, seed, room, tries: k + 1 }); LCACHE.set(key, L); if (LCACHE.size > 8) LCACHE.delete(LCACHE.keys().next().value); return L; }
  function useLevel(L) { LV = L; ({ ZONES, PROPS, BOXES, LAMPS, TANKS, STENCILS, CABLES, TAPES, HOLOS, RINGS, DESKS, BG, WALL } = L); FLOW = null; FLOWC = -1; LEVEL_ID++; }
  const ensureLevel = (map, seed, room = 0) => { if (!LV || LV.map !== map || LV.seed !== seed || LV.room !== room) useLevel(buildLevel(map, seed, room)); };
  const levelFor = (S) => { if (S && S.map) ensureLevel(S.map, S.lseed, S.room || 0); };

  // ---------------- collision and the flow field ----------------
  const rnd = (S) => { S.rs = (S.rs + 0x6D2B79F5) | 0; let t = S.rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const clampW = (o, m = 60) => { o.x = Math.max(WORLD.x0 + m, Math.min(WORLD.x1 - m, o.x)); o.y = Math.max(WORLD.y0 + 200, Math.min(WORLD.y1 - 40, o.y)); };
  // boxes bucketed on a 400 px grid (each bucket keeps BOXES order and every box within 300 px of the cell, more than any actor's pad + push)
  const BC = 400, BGW = Math.ceil((WORLD.x1 + 1) / BC), BGH = Math.ceil((WORLD.y1 + 1) / BC);
  const boxesAt = (x, y) => BG[Math.max(0, Math.min(BGH - 1, Math.floor(y / BC))) * BGW + Math.max(0, Math.min(BGW - 1, Math.floor(x / BC)))];
  // S: an exploded energy cell (S.tk[ti].boom >= 0) is gone until it respawns, so it stops blocking
  const collide = (o, r, S) => {
    for (const b of boxesAt(o.x, o.y)) { if (b.tank && S && S.tk[b.ti].boom >= 0) continue; const hw = b.hw + r * 1.35, hh = b.hh + r * 0.6, dx = o.x - b.x, dy = o.y - b.y;    // sides padded to the actor's drawn half width
      if (b.dia) { const q = Math.abs(dx) / hw + Math.abs(dy) / hh; if (q < 1) { const nx = Math.sign(dx || 1) / hw, ny = Math.sign(dy || 1) / hh, nl = Math.hypot(nx, ny), d = (1 - q) / nl;
        o.x += nx / nl * d; o.y += ny / nl * d; } continue; }
      if (Math.abs(dx) < hw && Math.abs(dy) < hh) { const px = hw - Math.abs(dx), py = hh - Math.abs(dy); if (px < py) o.x = b.x + Math.sign(dx || 1) * hw; else o.y = b.y + Math.sign(dy || 1) * hh; } } };
  const blocked = (x, y, r) => BOXES.some((b) => inBox(b, x, y, r));
  const FC = 80, FW = Math.ceil(WORLD.x1 / FC), FH = Math.ceil(WORLD.y1 / FC);
  // BFS distance field from the hero's cell; a pure function of that cell, cached (the demo and play compute the same field)
  const flowFor = (x, y) => { const c = Math.max(0, Math.min(FH - 1, Math.floor(y / FC))) * FW + Math.max(0, Math.min(FW - 1, Math.floor(x / FC)));
    if (c === FLOWC) return FLOW; const D = new Uint16Array(FW * FH).fill(65535), Q = new Int32Array(FW * FH); let h = 0, tl = 0; D[c] = 0; Q[tl++] = c;
    while (h < tl) { const k = Q[h++], i = k % FW, j = (k - i) / FW, d = D[k] + 1;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= FW || b >= FH) continue; const n = b * FW + a; if (WALL[n] || D[n] <= d) continue; D[n] = d; Q[tl++] = n; } }
    FLOW = D; FLOWC = c; return D; };
  const flowDir = (D, x, y) => { const i = Math.floor(x / FC), j = Math.floor(y / FC); let best = null, bd = 65535;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= FW || b >= FH) continue;
      if (di && dj && (WALL[j * FW + a] || WALL[b * FW + i])) continue; const v = D[b * FW + a]; if (v < bd) { bd = v; best = [(a + 0.5) * FC - x, (b + 0.5) * FC - y]; } }
    if (!best) return null; const l = Math.hypot(best[0], best[1]) || 1; return [best[0] / l, best[1] / l]; };
  const lineClear = (x0, y0, x1, y1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 60); for (let i = 1; i < n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
    if (WALL[Math.floor(y / FC) * FW + Math.floor(x / FC)]) return false; } return true; };

  const push = (S, e) => { S.ev.push(e); if (S.ev.length > EV_CAP) S.ev.splice(0, S.ev.length - EV_CAP); };
  const oc = (S, k) => (abOn(S) && abOf(S)[k] ? abOf(S)[k] : 1);                     // Оверклокинг's factors while it runs
  const mul = (S) => ({ dmg: (1 + 0.12 * S.ps.power) * (1 + 0.05 * md(S, 'power')), cd: (1 - 0.08 * S.ps.haste) * (1 - 0.04 * md(S, 'haste')) / oc(S, 'haste'), sp: (1 + 0.08 * S.ps.speed) * (1 + 0.03 * md(S, 'speed')) * oc(S, 'speed'),
    mag: (1 + 0.4 * S.ps.magnet) * (1 + 0.1 * md(S, 'magnet')), area: (1 + 0.1 * (S.ps.area || 0)) * (1 + 0.04 * md(S, 'range')), dur: 1 + 0.12 * (S.ps.dur || 0), amount: (S.ps.amount >= 2 ? 1 : 0) + (S.ps.amount >= 4 ? 1 : 0) });
  const md = (S, k) => (S.mods && S.mods[k]) || 0;                                         // a permanent upgrade's rank
  const hpMax = (S) => heroOf(S).hp + 20 * S.ps.hp + 10 * md(S, 'health') + (S.hpBonus || 0);
  const aimDir = (S) => [Math.cos(S.aim), Math.sin(S.aim)];
  // the scanner tip in world px: shoulder (near side) + straight arm along the aim + the scanner (the scene draws the same chain)
  const shoulder = (S) => [S.x + S.face * RIG.shX, S.y - RIG.shY];
  const hand = (S) => { const s = shoulder(S), d = aimDir(S); return [s[0] + d[0] * RIG.arm, s[1] + d[1] * RIG.arm]; };
  // the scanner is held upright: its window sits gunUp above the aim line, mirrored when aiming left (scene: M.s(1, sy))
  const tip = (S) => { const h = hand(S), c = Math.cos(S.aim), s = Math.sin(S.aim), sy = S.face; return [h[0] + RIG.gun * c + RIG.gunUp * sy * s, h[1] + RIG.gun * s - RIG.gunUp * sy * c]; };
  const cardRect = (i) => [290 + i * 460, 290, 420, 470];

  // spatial grid of live foes (rebuilt each step)
  const CELL = 110;
  const buildGrid = (S) => { const g = new Map(); S.E.forEach((e, i) => { if (e.dieT >= 0 || e.fly) return; const k = Math.floor(e.x / CELL) * 4096 + Math.floor(e.y / CELL);
    let c = g.get(k); if (!c) g.set(k, c = []); c.push(i); }); return g; };
  const near = (S, g, x, y, r, fn) => { const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL), y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) { const c = g.get(cx * 4096 + cy); if (c) for (const i of c) { const e = S.E[i]; if (e && e.dieT < 0) fn(e, i); } } };
  const nearest = (S, g, x, y, r) => { let best = null, bd = r; near(S, g, x, y, r, (e) => { const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } }); return best; };

  // ---------------- state ----------------
  // the run's facts for the achievements (live/ach.js), banked by META at the end: kills per foe kind, bosses closed, E casts, heals
  // picked up, evolutions taken, the longest stretch without damage (s). Counters only: they never touch the RNG.
  const fx0 = () => ({ foe: {}, boss: 0, cast: 0, heal: 0, evo: 0, calm: 0 });
  const fxOf = (S) => S.fx || (S.fx = fx0());                          // a shift kept before the facts existed gets them on first use
  function base(worldT, seed) {
    return { t: 0, steps: 0, wt0: worldT, rs: seed | 0, x: SPAWN[0], y: SPAWN[1], vx: 0, vy: 0, face: 1, aim: 0, aimT: 0, dist: 0, g: 0, ux: 1, uy: 0, ddx: 1, ddy: 0,
      hp: K.HP, iT: -9, hurtT: -9, dashT: -9, dashCD: 0, prevDash: 0, dead: -1, over: null, demo: false, freeze: 0, clock0: 0, slowT: -9, slowA: 0,
      lvl: 1, xp: 0, xpNext: 5, pend: 0, pick: null, kills: 0, bars: 0, nid: 1,
      wp: { trace: 1 }, wcd: { trace: 0.4 }, ps: { hp: 0, speed: 0, magnet: 0, power: 0, haste: 0, area: 0, amount: 0, dur: 0, firewall: 0, repair: 0 }, TU: [], SQ: [], chestQ: 0,
      sw: null, dec: [], E: [], P: [], EB: [], MK: [], MN: [], ZN: [], PU: [], Gm: [], tk: TANKS.map(() => ({ hp: 30, boom: -9, back: -9 })),
      spawnAcc: 0, nextSwarm: 75, nodes: ZONES.map(() => ({ st: 0, hold: 0, bug: 0, t: -9, down: 0 })), px: VIEW.W / 2 + 200, py: VIEW.H / 2, bossQ: [[150, 'crpt'], [270, 'repl'], [420, 'rstorm'], [RUN_T, 'outage']], darkT: 0, darkDur: 0, TR: [], LB: [], BM: [], boss: null, toast: null, ev: [],
      cam: [SPAWN[0] - VIEW.W / 2, SPAWN[1] - 40 - VIEW.H / 2], camV: [0, 0], fx: fx0() };
  }
  const mkFoe = (S, k, x, y) => { const f = FOE[k], hm = HP_SCALE * (f.boss || f.mini ? 1 + 0.1 * S.t / 60 : 0.55 + 0.17 * S.t / 60) * (S.str || 1);   // S.str: a training room's strength
    const e = { id: S.nid++, k, x, y, vx: 0, vy: 0, kx: 0, ky: 0, ux: 1, uy: 0, hp: f.hp * hm, mhp: f.hp * hm, hitT: -9, dieT: -1, dist: rnd(S) * 300, g: 0, face: x < S.x ? 1 : -1,
      atkT: -9, nextAtk: S.t + 0.5 + rnd(S), dash: 0, dashT: -9, dashCD: 2 + rnd(S) * 3, dx: 0, dy: 0, oT: -9, z: 0, vz: 0, fly: 0, spin: 0, ph: rnd(S),
      lvl: 0, node: 0, poolT: S.t + 3, sumT: S.t + (f.summon ? f.summon.every : 0), escT: S.t + (f.escalate ? f.escalate.every : 0), shotN: 0, sum: 0, ax: 0, ay: 0 };
    S.E.push(e); return e; };
  function create() {                                              // attract: the reference's moment, restaged around the hero
    ensureLevel('dc', 0); const S = base(0, 20261024); S.map = 'dc'; S.lseed = 0; S.hero = 'utrace'; S.base = 'trace'; S.demo = true; S.hp = 84; S.wp = { trace: 2, homing: 2, orbit: 1 }; S.wcd = { trace: 0.2, homing: 0.6, orbit: 0 }; S.lvl = 7; S.xp = 30; S.xpNext = 34;
    S.clock0 = 192;                                                // the HUD clock starts at 03:12 like the reference
    const ring = [[300, 160], [395, 330], [470, 165], [520, 430], [560, 120], [610, 470], [660, 95], [700, 520], [740, 250], [780, 170], [790, 410], [820, 330],
      [860, 470], [880, 220], [920, 380], [960, 450], [1000, 220], [1010, 420], [1050, 480], [1090, 600], [1180, 640], [1230, 610], [330, 600], [420, 640], [560, 590],
      [610, 640], [680, 600], [700, 470], [780, 640], [860, 560], [960, 640], [1200, 500], [350, 470], [450, 360], [520, 290], [600, 300], [720, 330], [810, 520],
      [880, 640], [500, 520], [1040, 140], [1150, 200], [1230, 120], [270, 300], [380, 250], [460, 470], [600, 540], [940, 300], [700, 140], [580, 220]];
    const kinds = ['node', 'multon', 'orb', 'panel', 'mars', 'keg', 'loreal', 'node', 'panel', 'baltika', 'orb', 'ferrero'];
    ring.forEach(([rx, ry], i) => { const [x, y] = R(rx, ry); if (blocked(x, y, 26)) return; const e = mkFoe(S, kinds[i % kinds.length], x, y); e.nextAtk = 2 + i * 0.05; });
    const b = mkFoe(S, 'boss', ...R(1040, 590)); b.face = -1; b.nextAtk = 6; b.sumT = 9; S.boss = b.id; S.bossQ = [];
    for (let i = 0; i < 7; i++) { const [x, y] = R(300 + 130 * i + 40 * hseed(i), 260 + 260 * hseed(i + 4)); S.Gm.push({ x, y, v: 1, k: i % 3 ? 0 : 1, m: 0, vx: 0, vy: 0, b: 0 }); }
    for (let i = 0; i < 6; i++) { const [x, y] = R(380 + 150 * i, 420 + 160 * hseed(i + 9)); S.Gm.push({ x, y, v: 0, k: 3, m: 0, vx: 0, vy: 0, b: 1 }); }
    S.nextSwarm = 999; placeBugs(S); placeDesks(S);
    return S;
  }
  const placeBugs = (S) => ZONES.forEach((z, i) => { const b = mkFoe(S, z.bug, z.nx, z.ny); b.node = i + 1; b.nextAtk = 1; S.nodes[i].bug = b.id; });
  // P&G shields: the live P&G list is rebuilt once per step (hurtFoe runs hundreds of times a step in a crowd)
  const pgNear = (S, e) => { if (S.pgAt !== S.steps) { S.pgAt = S.steps; S.pgL = S.E.filter((o) => o.k === 'pg' && o.dieT < 0); }
    for (const o of S.pgL) if (Math.hypot(o.x - e.x, o.y - e.y) < FOE.pg.aura.r) return true; return false; };
  const placeDesks = (S) => DESKS.forEach(([x, y]) => { const d = mkFoe(S, 'sdesk', x, y); d.face = -1; d.sumT = 8; });
  const spawn = (worldT, mods, opt) => { const seed = 1000 + Math.floor(worldT * 977) % 100000, map = (opt && opt.map) || 'dc'; ensureLevel(map, seed);
    const S = base(worldT, seed); S.map = map; S.lseed = seed; S.mods = Object.assign({}, mods || {});
    S.hero = HEROES[opt && opt.hero] ? opt.hero : 'utrace'; S.base = heroOf(S).weapon; S.wp = { [S.base]: 1 }; S.wcd = { [S.base]: 0.4 };
    S.skin = SKINS[opt && opt.skin] && SKINS[opt.skin].hero === S.hero ? opt.skin : null;                            // cosmetic
    // the weapons and skills not yet opened by achievements (META, live/ach.js): never offered on a level-up; a run without it offers all
    S.lock = { w: ((opt && opt.lock && opt.lock.w) || []).filter((k) => WEAP[k]), p: ((opt && opt.lock && opt.lock.p) || []).filter((k) => PASS[k]) };
    S.client = heroOf(S).passive.clientHp ? (CLIENTS.includes(opt && opt.client) ? opt.client : CLIENTS[0]) : null; S.hpBonus = 0; S.hp = hpMax(S);
    S.rerolls = md(S, 'rerolls'); S.skips = md(S, 'skips'); S.got = { [S.base]: 1 }; S.ab = { cd: 0, until: -9, t0: -9 }; S.abR = 0;
    if (map === 'edu') { S.ed = root.EDU.fresh(opt && opt.course); S.room = 0; S.bossQ = []; S.nextSwarm = 1e9; enterRoom(S); } else { placeBugs(S); placeDesks(S); }
    if (md(S, 'head')) { S.pick = { t0: S.t, opts: rollPick(S) }; S.pend = md(S, 'head') - 1; }                        // Предзагрузка
    return S; };
  const runOpt = (S) => ({ map: S.map, hero: S.hero, client: S.client, course: S.ed && S.ed.course, skin: S.skin, lock: S.lock });

  // ---------------- the training centre: rooms, terminals, tests ----------------
  const EDU_BOSS = { batch_accounting: 'batch', critical_incident: 'boss' };   // the courses' hall bosses → the slice's units
  const BUGS = COMPONENTS.map((c) => c.bug);
  // the hero enters room S.room: the level switches, the previous room's actors and effects are gone, terminals get their guards
  function enterRoom(S) {
    ensureLevel(S.map, S.lseed, S.room); const def = LV.def, ER = root.COURSE.rules;
    S.x = LV.START[0]; S.y = LV.START[1]; S.vx = S.vy = 0; S.cam = [S.x - VIEW.W / 2, S.y - 40 - VIEW.H / 2]; S.camV = [0, 0];
    for (const k of ['E', 'EB', 'P', 'MK', 'PU', 'Gm', 'TR', 'LB', 'BM', 'MN', 'ZN', 'TU', 'SQ', 'dec']) S[k] = [];
    S.sw = null; S.boss = null; S.goal = null; S.tk = TANKS.map(() => ({ hp: 30, boom: -9, back: -9 })); S.graceT = S.t + ER.roomEntryInvulnerability; S.waveT = S.t + ER.roomEntryWave;
    S.str = def.strength || 1; S.wv = def.waves || { batch: 1, cap: 1 }; S.ed.room = S.room; S.ed.audits = 0;
    S.nodes = LV.TERMS.map(() => ({ st: 0, hold: 0, bug: 0, t: -9, retry: 0 }));
    LV.TERMS.forEach((tm, i) => { const b = mkFoe(S, BUGS[Math.floor(rnd(S) * BUGS.length)], tm.guard.x, tm.guard.y); b.home = { nx: tm.guard.x, ny: tm.guard.y, R: 420 }; b.term = i + 1; b.nextAtk = S.t + 1.5; S.nodes[i].bug = b.id; });
    const C = root.EDU.course(S.ed.course);
    if (LV.BOSS) { const b = mkFoe(S, EDU_BOSS[C.boss.unit] || 'boss', LV.BOSS[0], LV.BOSS[1]); b.hp *= ER.boss.hp; b.mhp *= ER.boss.hp; b.sumK = ER.boss.summons; b.nextAtk = S.t + 3; b.face = -1;
      S.boss = S.goal = b.id; S.toast = { s: C.boss.message, t: S.t }; push(S, { k: 'bossin', t: S.t, x: S.x, y: S.y }); }
    else S.toast = { s: (C.rooms[S.room] || '').toUpperCase() + ': найди три терминала', t: S.t, good: 1 };
    push(S, { k: 'room', t: S.t, x: S.x, y: S.y, room: S.room });
  }
  const doorOpen = (S) => !!(S.ed && LV.EXIT && S.nodes.length && S.nodes.every((n) => n.st === 2));
  // a terminal's guard is beaten (how 'kill') or worked around (held for HOLD_T, the bug leaves without a kill): its test opens
  function termFree(S, i, how) { const n = S.nodes[i], tm = LV.TERMS[i]; if (!n || n.st) return; n.st = 1; n.t = S.t;
    if (how !== 'kill') { const b = S.E.find((e) => e.id === n.bug && e.dieT < 0); if (b) S.E.splice(S.E.indexOf(b), 1); }
    S.toast = { s: 'ТЕРМИНАЛ ' + (i + 1) + ': тест открыт — подойди и нажми E', t: S.t, good: 1 }; push(S, { k: 'termopen', t: S.t, x: tm.x, y: tm.y, i }); }
  const runRnd = (S) => () => rnd(S);
  // the test is over: commit its result (port of closeLearning): a passed terminal pays once (more for 3 right), a failed one shuts
  // for failLock s and swells the waves; every wrong answer calls an audit pack (at most auditMax per test); the revival revives or ends
  function closeTest(S) { const ed = S.ed, a = ed.active, ER = root.COURSE.rules, done = a.phase === 'result'; ed.active = null;
    if (a.reason === 'revive') { if (done && a.passed) { S.hp = Math.max(1, hpMax(S) * ER.reviveHealth); S.graceT = S.t + ER.reviveInvulnerability; S.dead = -1; S.toast = { s: 'ЗНАНИЯ СПАСЛИ: вторая жизнь', t: S.t, good: 1 }; push(S, { k: 'revived', t: S.t, x: S.x, y: S.y }); }
      else { S.hp = 0; S.dead = S.t; S.over = { k: 'dead', t: S.t }; push(S, { k: 'die', t: S.t, x: S.x, y: S.y }); } return; }
    const n = S.nodes[a.node], tm = LV.TERMS[a.node];
    if (done && a.passed) { n.st = 2; if (!ed.rewards.includes(S.room * 10 + a.node)) { ed.rewards.push(S.room * 10 + a.node);
        const rw = (ER.terminalRewards.find((r) => a.correct >= r.correct) || { pickups: [] }).pickups;
        rw.forEach((p, j) => { const x = tm.x + (j - (rw.length - 1) / 2) * 60, y = tm.y + 70; if (p === 'bundle') dropChest(S, x, y); else S.Gm.push({ x, y, v: 0, k: 4, m: 0, vx: 0, vy: 0, b: 2 }); }); }
      S.toast = { s: doorOpen(S) ? 'ВСЕ ТЕРМИНАЛЫ ПРОЙДЕНЫ: дверь открыта' : 'ТЕРМИНАЛ ' + (a.node + 1) + ' ПРОЙДЕН', t: S.t, good: 1 }; push(S, { k: 'termdone', t: S.t, x: tm.x, y: tm.y, i: a.node }); }
    else if (a.answered > 0) { n.retry = S.t + ER.failLock; ed.surgeUntil = S.t + ER.surge.seconds; S.toast = { s: 'ТЕСТ НЕ СДАН: терминал закрыт на ' + ER.failLock + ' с, волны усилены', t: S.t }; push(S, { k: 'termfail', t: S.t, x: tm.x, y: tm.y, i: a.node }); }
    ed.audits += Math.min(ER.auditMax, a.answered - a.correct); }
  // the question screen's layout in view px, shared with the scene: the options' rows and the button
  const quizOpt = (i, n) => { const g = 10, h = Math.min(112, (495 - (n - 1) * g) / n); return [300, 410 + i * (h + g), 1320, h]; };   // 3–6 options fill y 410–905
  const QUIZ_BTN = [VIEW.W / 2 - 220, 930, 440, 74];
  // one step while a test is open: the game stands still (S.t does not advance); 1–9 or a click pick options, Enter / Space / the button go on
  function quizStep(S, inp) { if (inp.px !== undefined) { S.px = inp.px; S.py = inp.py; } const ed = S.ed, a = ed.active, q = root.EDU.question(ed, a.questions[a.index] && a.questions[a.index].id), ok0 = inp.jump || inp.act;
    const ok = ok0 && !S.prevOk; S.prevOk = ok0 ? 1 : 0; const ready = S.steps - (a.at || 0) > 30;
    const hit = (r) => inp.click && inp.px >= r[0] && inp.px <= r[0] + r[2] && inp.py >= r[1] && inp.py <= r[1] + r[3];
    if (a.phase === 'question') { const opts = a.questions[a.index].options; let c = inp.slot >= 1 && inp.slot <= opts.length ? inp.slot - 1 : -1;
      for (let i = 0; i < opts.length; i++) if (hit(quizOpt(i, opts.length))) c = i;
      if (c >= 0 && root.EDU.select(ed, opts[c])) push(S, { k: 'quizpick', t: S.t, x: S.x, y: S.y });
      if (ready && (ok || hit(QUIZ_BTN)) && a.selected.length && root.EDU.submit(ed)) { a.at = S.steps; a.res = (a.res || []).concat([a.lastCorrect ? 1 : 0]); push(S, { k: a.lastCorrect ? 'quizright' : 'quizwrong', t: S.t, x: S.x, y: S.y }); } return; }
    if (!(ready && (ok || hit(QUIZ_BTN)))) return; a.at = S.steps;
    if (a.phase === 'result') { closeTest(S); return; } root.EDU.advance(ed); push(S, { k: 'quizpage', t: S.t, x: S.x, y: S.y, q: q && q.id }); }
  // audit packs owed for wrong answers arrive once the test closes: auditPack foes of the current roster, out of sight in the maze
  function audits(S) { const ed = S.ed, ER = root.COURSE.rules; if (!ed.audits) return; const m = S.t / 60, W = ROSTER.filter((r) => m >= r[2]);
    for (let p = 0; p < ed.audits; p++) for (let j = 0; j < ER.auditPack; j++) spawnRing(S, W[Math.floor(rnd(S) * W.length)][0], 1, 1000, 1800);
    S.toast = { s: 'АУДИТ: за ошибки в тесте пришла проверка (' + ed.audits * ER.auditPack + ')', t: S.t }; push(S, { k: 'audit', t: S.t, x: S.x, y: S.y }); ed.audits = 0; }
  // E near an open terminal starts its test; near the open door it leads on to the next room
  function eduUse(S) { for (let i = 0; i < S.nodes.length; i++) { const n = S.nodes[i], tm = LV.TERMS[i];
      if (n.st === 1 && S.t >= n.retry && Math.hypot(S.x - tm.x, (S.y - tm.y) / 0.8) < TERM_USE) { if (root.EDU.begin(S.ed, 'lesson', { topic: tm.topic, k: tm.k, i }, S.lseed, runRnd(S))) { S.ed.active.at = S.steps; push(S, { k: 'quizopen', t: S.t, x: S.x, y: S.y }); } return; } }
    if (doorOpen(S) && Math.hypot(S.x - LV.EXIT[0], (S.y - LV.EXIT[1]) / 0.8) < TERM_USE) { S.room++; enterRoom(S); } }
  const nearUse = (S) => { if (!S.ed || !LV.TERMS) return null; for (let i = 0; i < S.nodes.length; i++) { const n = S.nodes[i], tm = LV.TERMS[i];
      if (n.st === 1 && Math.hypot(S.x - tm.x, (S.y - tm.y) / 0.8) < TERM_USE) return { k: 'term', i, lock: Math.max(0, n.retry - S.t) }; }
    if (LV.EXIT && Math.hypot(S.x - LV.EXIT[0], (S.y - LV.EXIT[1]) / 0.8) < TERM_USE) return { k: 'door', open: doorOpen(S) }; return null; };
  const respawn = (S, worldT) => spawn(worldT, S.mods, runOpt(S));
  const outOfPlay = () => false;

  // ---------------- damage ----------------
  function killFoe(S, e, src) {
    const f = FOE[e.k]; if (e.dieT < 0) e.dieT = S.t; e.hp = 0; S.kills++;
    const tw = e.twin ? S.E.find((o) => o.id === e.twin && o.dieT < 0) : null;                // the replica's other copy, still up
    const X = fxOf(S); X.foe[e.k] = (X.foe[e.k] || 0) + 1; if (f.boss && !tw) X.boss++;
    const HP = heroOf(S).passive; if (HP.clientHp && e.k === S.client) { const g = HP.clientHp + heroOf(S).training.factor * md(S, 'tr_ba'); S.hpBonus = (S.hpBonus || 0) + g; S.hp += g; }   // Ключевой клиент
    push(S, { k: 'kill', t: S.t, x: e.x, y: e.y, ty: e.k, id: e.id, src, fly: e.fly });
    S.dec.push({ x: e.x + (rnd(S) - 0.5) * 30, y: e.y, t: S.t, k: 0, ty: e.k, s: rnd(S) }); if (S.dec.length > 90) S.dec.shift();
    const v = f.xp; S.Gm.push({ x: e.x, y: e.y - 10, v, k: v >= 16 ? 2 : v >= 4 ? 1 : 0, m: 0, vx: (rnd(S) - 0.5) * 120, vy: -60, b: 0 });
    // drops: a marking code 3.5 %, a heal 1.5 % (was 0.7 %); minis always drop a heal, and so does the first kill after 45 s without one
    const r = rnd(S), lk = md(S, 'luck'), cr = 0.035 + 0.002 * lk; if (r < cr) S.Gm.push({ x: e.x + 20, y: e.y, v: 0, k: 3, m: 0, vx: 0, vy: 0, b: 1 });
    else if (r < cr + 0.015 + 0.001 * lk || f.mini || S.t - (S.healT || 0) > 45) { S.healT = S.t; S.Gm.push({ x: e.x - 20, y: e.y, v: 0, k: 4, m: 0, vx: 0, vy: 0, b: 2 }); }
    if (e.node) capture(S, e.node - 1, 'kill'); if (e.term) termFree(S, e.term - 1, 'kill');
    if (tw) { tw.twin = 0; tw.lvl = (tw.lvl || 0) + 1; if (S.boss === e.id) S.boss = tw.id; S.toast = { s: 'РЕПЛИКА ПОТЕРЯНА: вторая копия ускорилась', t: S.t }; push(S, { k: 'esc', t: S.t, x: tw.x, y: tw.y }); }
    else if (f.boss) { if (S.boss === e.id) S.boss = null; if (e.k !== 'boss' && !f.final && !S.demo) dropChest(S, e.x, e.y); S.toast = { s: f.name.toUpperCase() + ' ЗАКРЫТ: разбор PIR в отчёт', t: S.t }; push(S, { k: 'bossdown', t: S.t, x: e.x, y: e.y }); }
    else if (S.boss === e.id) S.boss = null;                                                   // a miniboss from the boss queue (ЦРПТ)
    if ((S.ed ? S.goal === e.id : f.final) && !S.demo) { S.over = { k: 'win', t: S.t }; push(S, { k: 'win', t: S.t, x: S.x, y: S.y }); }   // the only victory
  }
  // the outage (the final boss): the lights go out, and one restored component goes down (it is restarted by holding its circle)
  function outage(S, e, f) { S.darkT = S.t + f.outage.dark; S.darkDur = f.outage.dark; const up = S.nodes.map((n, i) => i).filter((i) => S.nodes[i].st && !S.nodes[i].down);
    if (up.length) { const i = up[Math.floor(rnd(S) * up.length)], n = S.nodes[i]; n.st = 0; n.down = 1; n.hold = 0;
      S.toast = { s: f.name.toUpperCase() + ': компонент «' + ZONES[i].name + '» отключён', t: S.t }; push(S, { k: 'down', t: S.t, x: ZONES[i].nx, y: ZONES[i].ny, i }); }
    push(S, { k: 'dark', t: S.t, x: e.x, y: e.y }); }
  // a component restored: by killing its bug or by holding its circle for 6 s (as in the original)
  function capture(S, i, how) { const n = S.nodes[i], z = ZONES[i]; if (n.st) return; n.st = 1; n.t = S.t;
    if (n.down) { n.down = 0; S.toast = { s: 'КОМПОНЕНТ «' + z.name + '» ПЕРЕЗАПУЩЕН', t: S.t, good: 1 }; push(S, { k: 'capture', t: S.t, x: z.nx, y: z.ny, i }); return; }   // after the outage
    const b = S.E.find((e) => e.id === n.bug && e.dieT < 0); if (b && how !== 'kill') { b.node = 0; killFoe(S, b, 'node'); }
    for (let j = 0; j < 4; j++) S.Gm.push({ x: z.nx + (j - 1.5) * 50, y: z.ny, v: 25, k: 2, m: 0, vx: 0, vy: 0, b: 0 });
    S.bars += 5; S.hp = Math.min(hpMax(S), S.hp + 30); if (!S.demo) dropChest(S, z.nx, z.ny + 60); S.toast = { s: 'КОМПОНЕНТ «' + z.name + '» ВОССТАНОВЛЕН', t: S.t, good: 1 }; push(S, { k: 'capture', t: S.t, x: z.nx, y: z.ny, i });
    if (!S.demo && S.nodes.every((q) => q.st)) S.bossQ = S.bossQ.map(([tt, k]) => [FOE[k].final ? Math.min(tt, S.t) : tt, k]).sort((a, b) => a[0] - b[0]); }
  // foes within 400 px of the hero, counted once per step (Полная прослеживаемость's passive)
  const crowdN = (S) => { if (S.crowdAt !== S.steps) { S.crowdAt = S.steps; let n = 0; for (const o of S.E) if (o.dieT < 0 && Math.abs(o.x - S.x) < 400 && Math.hypot(o.x - S.x, o.y - S.y) < 400) n++; S.crowdC = n; } return S.crowdC; };
  function hurtFoe(S, e, dmg, kx, ky, src) {
    if (e.dieT >= 0) return 0; const f = FOE[e.k];
    if (f.front && Math.sign(S.x - e.x) === e.face) dmg *= f.front;   // armoured front
    if (f.ward && S.E.some((o) => o.dieT < 0 && o.sum === e.id)) dmg *= 1 - f.ward;                                   // batch reserve: warded by its clients
    if (f.outage) dmg *= Math.max(f.outage.minWard, 1 - f.outage.ward * S.nodes.filter((n) => n.down).length);          // the outage: every component down
    else if (!f.boss && e.k !== 'pg' && pgNear(S, e)) { dmg *= 1 - FOE.pg.aura.reduce; e.shT = S.t; }
    // the hero's passive and training (shop rank tr_<hero>), and QA's defect mark
    const H = heroOf(S), P = H.passive, tr = md(S, 'tr_' + (S.hero || 'utrace')); let crit = 0;
    if (P.slots && tr && src !== 'trace') dmg *= 1 + H.training.factor * tr;                                          // Utrace: picked-up weapons hit harder
    if (P.crowd) dmg *= 1 + Math.min(P.cap + H.training.factor * tr, P.crowd * crowdN(S));                            // Связанные данные
    if (P.far && Math.hypot(e.x - S.x, e.y - S.y) > 375) dmg *= 1 + P.far + H.training.factor * tr;                  // Дальняя доставка
    if (P.crit && rnd(S) < P.crit + H.training.factor * tr + (e.scanT > S.t - 2 ? P.scanCrit : 0)) { dmg *= 1.8; crit = 1; }   // Найденный дефект
    if (e.markT > S.t) dmg *= 1.5;
    e.hp -= dmg; e.hitT = S.t; e.hdx = Math.sign(kx) || (e.x > S.x ? 1 : -1); const pz = 1 / (f.poise || 1); e.kx += kx * pz; e.ky += ky * pz;
    push(S, { k: 'hit', t: S.t, x: e.x, y: e.y - 30, id: e.id, d: Math.round(dmg), src, crit });
    if (e.hp <= 0) killFoe(S, e, src); return dmg;
  }
  // a shield charge spent on a hit: short invulnerability, the recharge starts, and from level 3 a wave pushes (and hurts) the foes round
  function shieldBlock(S) { const id = S.wp.shield_x ? 'shield_x' : 'shield', st = wstat(id, S.wp[id] || 1); S.shCh--; S.iT = S.t;
    if (S.wcd[id] <= 0) S.wcd[id] = st.cd * mul(S).cd; push(S, { k: 'shieldblock', t: S.t, x: S.x, y: S.y, r: st.push ? st.radius : 0 });
    if (st.push) { const g = buildGrid(S), M = mul(S); near(S, g, S.x, S.y, st.radius + 40, (e) => { const dx = e.x - S.x, dy = e.y - S.y, d = Math.hypot(dx, dy) || 1; if (d > st.radius + FOE[e.k].r) return;
      if (st.dmg) hurtFoe(S, e, st.dmg * M.dmg, dx / d * 1100, dy / d * 1100, 'shield'); else { e.kx += dx / d * 1100; e.ky += dy / d * 1100; } }); } }
  function hurtHero(S, dmg, fx, fy, slow) {
    if (S.demo || S.over || S.t - S.iT < K.IFR || S.t - S.dashT < K.DASH_T + 0.08 || S.t < (S.graceT || 0)) return;
    if (S.shCh > 0) { shieldBlock(S); return; }                                                                    // Отказоустойчивость: the whole hit
    const taken = Math.max(1, dmg * DMG_SCALE * (S.str || 1) * (1 - 0.07 * (S.ps.firewall || 0)) - md(S, 'armor'));   // Брандмауэр, Криптозащита
    const X = fxOf(S); X.calm = Math.max(X.calm, S.t - Math.max(0, S.hurtT));                                   // the stretch this hit ends
    S.hp -= taken; S.iT = S.t; S.hurtT = S.t; push(S, { k: 'hurt', t: S.t, x: S.x, y: S.y - 50, d: Math.round(taken), fx, fy });
    if (slow) { S.slowT = S.t + slow.dur; S.slowA = Math.max(S.t < S.slowT ? S.slowA : 0, slow.amount); push(S, { k: 'slowed', t: S.t, x: S.x, y: S.y }); }
    if (S.hp <= 0 && S.ed && !S.ed.reviveUsed && root.EDU.begin(S.ed, 'revive', null, S.lseed, runRnd(S))) { S.hp = 0; S.ed.active.at = S.steps; push(S, { k: 'quizopen', t: S.t, x: S.x, y: S.y, revive: 1 }); return; }   // the revival test
    if (S.hp <= 0) { S.hp = 0; S.dead = S.t; S.over = { k: 'dead', t: S.t }; push(S, { k: 'die', t: S.t, x: S.x, y: S.y }); }
  }
  function boom(S, i) {
    const p = TANKS[i], tk = S.tk[i]; tk.boom = S.t; tk.back = S.t + 45; tk.hp = 0;
    const k0 = S.kills, R0 = 230, g = buildGrid(S), M = mul(S);
    near(S, g, p[0], p[1], R0, (e) => { const dx = e.x - p[0], dy = e.y - p[1], d = Math.hypot(dx, dy) || 1; if (d > R0) return;
      const k = 1 - d / R0; if (!FOE[e.k].boss && !FOE[e.k].mini) { e.fly = 1; e.vz = 700 + 500 * k; e.z = 1; e.spin = (rnd(S) - 0.5) * 18; e.kx += dx / d * 900 * k; e.ky += dy / d * 700 * k; }
      hurtFoe(S, e, 260 * M.dmg * (0.5 + 0.5 * k), dx / d * 300, dy / d * 300, 'boom'); });
    S.tk.forEach((o, j) => { if (j !== i && o.hp > 0 && Math.hypot(TANKS[j][0] - p[0], TANKS[j][1] - p[1]) < 140) o.hp = Math.min(o.hp, 0.01); });   // chain
    if (Math.hypot(S.x - p[0], S.y - p[1]) < 140) hurtHero(S, 10, p[0], p[1]);
    push(S, { k: 'boom', t: S.t, x: p[0], y: p[1] - 30, i }); S.dec.push({ x: p[0], y: p[1], t: S.t, k: 1, s: rnd(S) }); if (S.dec.length > 90) S.dec.shift();
    const n = S.kills - k0; if (n >= 3) push(S, { k: 'combo', t: S.t, x: p[0], y: p[1] - 190, n });
  }
  const hitTanks = (S, x, y, r, dmg) => S.tk.forEach((o, i) => { if (o.hp > 0 && Math.hypot(TANKS[i][0] - x, TANKS[i][1] - 20 - y) < r + 26) o.hp -= dmg; });

  // ---------------- the E abilities ----------------
  function cast(S, g) { const A = abOf(S); if (!S.ab || S.ab.cd > 0 || S.demo || S.over) return; const t = S.t, r = S.abR || 0, M = mul(S);
    S.ab.cd = A.cd; S.ab.t0 = t; S.ab.until = t + A.dur + (A.rankDur || 0) * r; fxOf(S).cast++;
    if (A.id === 'volley') { const st = wstat(S.base, Math.min(S.wp[S.base] || 1, MAX_WL)), sp = st.speed || 1000, dmg = (st.dmg || 23) * M.dmg * A.power * (1 + (A.rankPow || 0) * r);   // the hero's packet, in every direction
      for (let i = 0; i < A.count; i++) { const a = i * 6.2832 / A.count; S.P.push({ k: 'pkt', x: S.x, y: S.y - 50, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: (st.range || 775) / sp, t0: t, dmg, pierce: 999, hit: [], split: 0, evo: 1 }); } }
    if (A.id === 'negotiate') for (const e of S.E) { if (e.dieT >= 0 || FOE[e.k].boss || FOE[e.k].mini) continue;            // the client everywhere, the rest within the radius
      if (e.k === S.client || Math.hypot(e.x - S.x, e.y - S.y) < A.radius) { e.truceT = S.ab.until; e.atkT = -9; e.nextAtk = Math.max(e.nextAtk, S.ab.until); } }
    if (A.id === 'field') S.FZ = { x: S.x, y: S.y, t0: t, until: S.ab.until, r: A.radius, stun: A.stun + (A.rankStun || 0) * r, id: t };
    push(S, { k: 'ability', t, x: S.x, y: S.y, id: A.id }); }
  // a running ability's work each step: Регресс freezes the ordinary foes that enter its zone (each once per zone)
  function abilityStep(S, g) { const F = S.FZ; if (!F) return; if (S.t >= F.until) { S.FZ = null; return; }
    near(S, g, F.x, F.y, F.r + 60, (e) => { if (e.fly || FOE[e.k].boss || FOE[e.k].mini || e.fzId === F.id || Math.hypot(e.x - F.x, (e.y - F.y) / 0.62) > F.r) return;
      e.fzId = F.id; e.atkT = -9; e.stunT = S.t + F.stun; e.nextAtk = Math.max(e.nextAtk, S.t + F.stun); push(S, { k: 'frozen', t: S.t, x: e.x, y: e.y, id: e.id }); }); }

  // ---------------- level-up ----------------
  const evosReady = (S) => Object.keys(S.wp).filter((k) => EVO[k] && S.wp[k] >= MAX_WL && S.ps[EVO[k][0]] > 0).map((k) => ({ k: 'evo', id: EVO[k][1], from: k }));
  function rollPick(S, chest) {
    const B = S.base || 'trace', c = [], own = Object.keys(S.wp).filter((k) => k !== B && k !== EVO[B][1]), pk = Object.keys(PASS).filter((k) => S.ps[k] > 0).length;
    const maxW = MAX_W + (heroOf(S).passive.slots || 0);
    const evolved = (k) => EVO[k] && S.wp[EVO[k][1]], L0 = S.lock || { w: [], p: [] };              // locked: not offered as a new one
    for (const k in WEAP) { const lv = S.wp[k] || 0; if (WEAP[k].evo || evolved(k) || lv >= MAX_WL || (WEAP[k].hero && k !== B)) continue; if (!lv && (own.length >= maxW || chest || L0.w.includes(k))) continue; c.push({ k: 'w', id: k, w: lv ? 3 : 2 }); }
    for (const k in PASS) if (S.ps[k] < MAX_PL && (S.ps[k] > 0 || (pk < MAX_P && !chest && !L0.p.includes(k)))) c.push({ k: 'p', id: k, w: 1.4 });
    if (S.ab && (S.abR || 0) < AB_MAX) c.push({ k: 'ab', id: abOf(S).id, w: 1.1 });                 // the E ability's next rank
    const out = evosReady(S).slice(0, 3);                              // an evolution, when one is ready, is always offered
    while (out.length < 3 && c.length) { const tot = c.reduce((a, b) => a + b.w, 0); let r = rnd(S) * tot, j = 0; while (j < c.length - 1 && r > c[j].w) { r -= c[j].w; j++; } out.push(c.splice(j, 1)[0]); }
    if (!out.length) out.push({ k: 'heal', id: 'hp' });
    return out;
  }
  function applyPick(S, o) {
    if (S.got && (o.k === 'w' || o.k === 'evo')) S.got[o.id] = 1;
    if (o.k === 'evo') { delete S.wp[o.from]; S.wp[o.id] = 1; S.wcd[o.id] = 0.2; fxOf(S).evo++; S.toast = { s: 'ЭВОЛЮЦИЯ: ' + WEAP[o.id].name.toUpperCase(), t: S.t, good: 1 };
      push(S, { k: 'evo', t: S.t, x: S.x, y: S.y - 60, id: o.id }); }
    else if (o.k === 'w') { S.wp[o.id] = (S.wp[o.id] || 0) + 1; if (S.wcd[o.id] === undefined) S.wcd[o.id] = 0.3; }
    else if (o.k === 'p') { S.ps[o.id]++; if (o.id === 'hp') S.hp = Math.min(hpMax(S), S.hp + 40); }
    else if (o.k === 'ab') S.abR = (S.abR || 0) + 1;
    else S.hp = Math.min(hpMax(S), S.hp + 40);
    push(S, { k: 'picked', t: S.t, x: S.x, y: S.y - 60, id: o.id }); closePick(S);
  }
  function closePick(S) { S.pick = null;
    if (S.pend > 0) { S.pend--; S.pick = { t0: S.t, opts: rollPick(S) }; }
    else if (S.chestQ > 0) { S.chestQ--; S.pick = { t0: S.t, opts: rollPick(S, true), chest: 1 }; } }
  // level-up controls bought in the shop: [4] reroll the cards, [5] skip this pick (or click their buttons under the cards)
  const ctlRect = (i) => [VIEW.W / 2 - 430 + i * 460, 790, 400, 64];
  // an upgrade capsule (the survivors' chest): dropped by bugs and bosses, opens a pick of owned upgrades with any ready evolution first
  const openChest = (S) => { if (S.pick) S.chestQ++; else S.pick = { t0: S.t, opts: rollPick(S, true), chest: 1 }; };
  const dropChest = (S, x, y) => S.Gm.push({ x, y, v: 0, k: 5, m: 0, vx: 0, vy: -80, b: 3 });
  function gainXp(S, v) { S.xp += v; while (S.xp >= S.xpNext) { S.xp -= S.xpNext; S.lvl++; S.xpNext = Math.round(4 + S.lvl * 3 + Math.pow(S.lvl, 1.5));
    push(S, { k: 'lvl', t: S.t, x: S.x, y: S.y - 50, l: S.lvl }); if (S.pick) S.pend++; else S.pick = { t0: S.t, opts: rollPick(S) }; } }

  // ---------------- spawning ----------------
  function spawnRing(S, k, n, r0, r1) {
    let last = null;
    for (let i = 0; i < n; i++) { let x, y, ok = false;
      for (let tr = 0; tr < 10 && !ok; tr++) { const a = rnd(S) * 6.2832, r = r0 + (r1 - r0) * rnd(S); x = S.x + Math.cos(a) * r; y = S.y + Math.sin(a) * r * 0.8;
        x = Math.max(WORLD.x0 + 260, Math.min(WORLD.x1 - 260, x)); y = Math.max(WORLD.y0 + 300, Math.min(WORLD.y1 - 120, y)); ok = !blocked(x, y, FOE[k].r); }
      if (ok) last = mkFoe(S, k, x, y); }
    return last;
  }
  // the roster grows over the shift: [type, weight, from minute]
  const ROSTER = [['node', 1, 0], ['panel', 0.6, 0], ['multon', 0.5, 0.3], ['mond', 0.4, 1.0], ['orb', 0.7, 1], ['mars', 0.45, 1.3], ['prog', 0.35, 2.0], ['petfood', 0.35, 2.2],
    ['keg', 0.3, 2.3], ['loreal', 0.35, 2.6], ['royal', 0.3, 3.0], ['baltika', 0.3, 3.2], ['cherk', 0.25, 3.5], ['ferrero', 0.3, 3.8], ['pg', 0.18, 4.0], ['vetis', 0.18, 4.5], ['logq', 0.2, 4.8]];
  const MINIS = ['bug', 'bugu', 'buga'];
  function waves(S) {
    const t = S.t, m = t / 60; let live = 0; for (const e of S.E) if (e.dieT < 0 && !FOE[e.k].boss) live++;
    if (S.ed) { if (t < S.waveT) return; audits(S); }
    const ER = S.ed && root.COURSE.rules, surge = S.ed && t < S.ed.surgeUntil, cap = S.ed ? 70 * S.wv.cap * (surge ? ER.surge.cap : 1) : MAX_FOES;   // a training room: its wave size and limit, × the surge after a failed test
    const rate = Math.min(8, 0.6 + 0.85 * m) * (S.ed ? S.wv.batch * (surge ? ER.surge.batch : 1) : 1);
    S.spawnAcc += rate * DT;
    const W = ROSTER.filter((r) => m >= r[2]).map((r) => [r[0], r[1] * (r[0] === 'node' ? Math.max(0.35, 1 - m * 0.08) : 1)]);
    while (S.spawnAcc >= 1) { S.spawnAcc -= 1; if (live >= cap) continue; const tot = W.reduce((a, b) => a + b[1], 0); let r = rnd(S) * tot, j = 0; while (j < W.length - 1 && r > W[j][1]) { r -= W[j][1]; j++; }
      spawnRing(S, W[j][0], 1, S.ed ? 1300 : 1150, S.ed ? 2400 : 1350); live++; }
    if (t >= S.nextSwarm) { S.nextSwarm += 75; const rush = (S.nextSwarm / 75) % 2 ? 'panel' : 'multon';
      spawnRing(S, rush, 18 + Math.floor(m * 3), 900, 1000); S.toast = { s: rush === 'panel' ? 'ШТОРМ АЛЕРТОВ: фильтры Grafana со всех сторон' : 'НАПЛЫВ КЛИЕНТОВ: Мултон спешит с заявками', t }; }
    while (S.bossQ.length && t >= S.bossQ[0][0]) { const [, k] = S.bossQ.shift(); const b = spawnRing(S, k, 1, 1000, 1100); if (b) S.boss = b.id;
      S.toast = { s: FOE[k].intro || FOE[k].name.toUpperCase(), t }; push(S, { k: 'bossin', t, x: S.x, y: S.y }); }
  }

  // does a circle (centre c relative to the sector's apex, radius rr) touch the sector (direction a, half-angle half, radius R)?
  const inSector = (cx, cy, a, half, R, rr) => { const d = Math.hypot(cx, cy); if (d > R + rr) return false; if (d <= rr) return true;
    let da = Math.atan2(cy, cx) - a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) <= half) return true;
    for (const s of [-1, 1]) { const ex = Math.cos(a + s * half), ey = Math.sin(a + s * half), u = Math.max(0, Math.min(R, cx * ex + cy * ey));
      if (Math.hypot(cx - ex * u, cy - ey * u) <= rr) return true; } return false; };
  // a random live foe within r (spreads shots instead of piling them on the nearest one)
  const randomFoe = (S, g, x, y, r) => { const c = []; near(S, g, x, y, r, (e) => { if (!e.fly && Math.hypot(e.x - x, e.y - y) < r) c.push(e); }); return c.length ? c[Math.floor(rnd(S) * c.length)] : null; };
  // the foe with the most neighbours within rr, among up to 16 sampled within r (the thick of the crowd)
  const densest = (S, g, x, y, r, rr) => { const c = []; near(S, g, x, y, r, (e) => { if (!e.fly && Math.hypot(e.x - x, e.y - y) < r) c.push(e); }); let best = null, bn = -1;
    for (let k = 0; k < Math.min(16, c.length); k++) { const e = c[Math.floor(rnd(S) * c.length)]; let n = 0; near(S, g, e.x, e.y, rr, (o) => { if (Math.hypot(o.x - e.x, o.y - e.y) < rr) n++; }); if (n > bn) { bn = n; best = e; } }
    return best; };
  // ---------------- weapons ----------------
  function weapons(S, g) {
    const M = mul(S), t = S.t;
    // every hero aims at the cursor from the shoulder; the beam leaves the scanner window gunUp above the aim line, so turn down by
    // asin(gunUp / d) to cross the cursor; the facing follows the target (with hysteresis), never the arm (no chase loop)
    // the facing comes from the cursor's offset from the body's centre, not from the shoulder: the shoulder moves to the other side when
    // the hero turns, so a shoulder-based choice near straight up or down flipped back every step; it turns only past the other shoulder
    { const wx = S.cam[0] + S.px, wy = S.cam[1] + S.py, cx = wx - S.x, band = RIG.shX + 24;
      if (cx > band) S.face = 1; else if (cx < -band) S.face = -1;
      const sh = shoulder(S), dx = wx - sh[0], dy = wy - sh[1], d = Math.max(60, Math.hypot(dx, dy)), a0 = Math.atan2(dy, dx);
      S.aimT = a0 + S.face * Math.asin(Math.min(0.9, RIG.gunUp / d)); }
    const onAim = Math.abs(Math.atan2(Math.sin(S.aimT - S.aim), Math.cos(S.aimT - S.aim))) < 0.3;
    for (const id in S.wp) { const lv = S.wp[id], st = wstat(id, lv), kind = WEAP[id].kind || WEAP[id].of || id; if (S.wcd[id] === undefined) S.wcd[id] = 0; S.wcd[id] -= DT; const ready = S.wcd[id] <= 0, cd = (st.cd || 1) * M.cd;
      for (const k of ['radius', 'range', 'ring']) if (st[k] && !(kind === 'trace' && k === 'range' && false)) st[k] *= M.area;      // Широкий охват
      if (st.life && st.life < 1e8) st.life *= M.dur; if (st.burst && st.burst < 1e8) st.burst *= M.dur;                             // Keep-alive
      if (st.count && kind !== 'orbit' || kind === 'orbit') st.count = (st.count || 1) + M.amount;                                  // Репликация
      if (kind === 'trace') {
        // a sector at the cursor, fired once the arm is on target (Utrace's trace, БА's requirements review)
        if (ready && onAim) { S.wcd[id] = cd; S.sw = { t0: t, r: st.range, half: st.half, done: 0 }; push(S, { k: 'swing', t, x: S.x, y: S.y }); }
        if (S.sw && !S.sw.done && t - S.sw.t0 >= 0.06) { S.sw.done = 1; const a = S.aim, [tx, ty] = tip(S); let n = 0;
          push(S, { k: 'trace', t, x: tx, y: ty, a, r: st.range, half: st.half, evo: st.back ? 1 : 0 });
          if (st.back) push(S, { k: 'trace', t, x: S.x, y: S.y - 50, a: a + Math.PI, r: st.range * 0.8, half: st.half, evo: 1 });
          const hitSector = (ox, oy, aa, R) => near(S, g, ox, oy, R + 260, (e) => { const rr = FOE[e.k].r * 0.85, cx = e.x - ox, cy = e.y - FOE[e.k].r * 1.3 - oy;
            if (!inSector(cx, cy, aa, st.half, R, rr)) return;
            hurtFoe(S, e, st.dmg * M.dmg * (st.client && e.k === S.client ? st.client : 1), Math.cos(aa) * st.push, Math.sin(aa) * st.push, 'trace'); n++; });
          hitSector(tx, ty, a, st.range); if (st.back) hitSector(S.x, S.y - 50, a + Math.PI, st.range * 0.8);
          if (st.heal && n) S.hp = Math.min(hpMax(S), S.hp + Math.min(3, n * st.heal));
          hitTanks(S, tx + Math.cos(a) * st.range * 0.6, ty + 40 + Math.sin(a) * st.range * 0.6, st.range * 0.45, st.dmg);
          if (n) S.freeze = Math.max(S.freeze, 0.02 + 0.004 * Math.min(n, 6)); }
      }
      if (kind === 'orbit') { const n = st.count, R0 = st.radius, sp = st.spin;
        for (let i = 0; i < n; i++) { const a = t * sp + i * 6.2832 / n, ox = S.x + Math.cos(a) * R0, oy = S.y - 34 + Math.sin(a) * R0 * 0.62;
          near(S, g, ox, oy + 30, 40, (e) => { if (t - e.oT < st.rehit) return; if (Math.hypot(e.x - ox, e.y - 30 - oy) > 30 + FOE[e.k].r) return; e.oT = t;
            const dx = e.x - S.x, dy = e.y - S.y, d = Math.hypot(dx, dy) || 1; hurtFoe(S, e, st.dmg * M.dmg, dx / d * 160, dy / d * 160, 'orbit'); });
          hitTanks(S, ox, oy, 20, st.dmg * DT * 4); } }
      if (kind === 'homing' && ready && nearest(S, g, S.x, S.y, 900)) { S.wcd[id] = cd; const hx = S.x, hy = S.y - 90;
        for (let i = 0; i < st.count; i++) { const tg = randomFoe(S, g, S.x, S.y, 900), a = -Math.PI / 2 + (i - (st.count - 1) / 2) * 0.6 + (rnd(S) - 0.5) * 0.3;
          S.P.push({ k: 'hom', x: hx, y: hy, rel: [0, -90], wait: t + i * 0.09, vx: Math.cos(a) * st.speed * 0.5, vy: Math.sin(a) * st.speed * 0.5, life: st.life + 0.4, t0: t + i * 0.09, dmg: st.dmg * M.dmg, tg: tg ? tg.id : -1, sp: st.speed }); }
        push(S, { k: 'shot', t, x: hx, y: hy, a: -Math.PI / 2 }); }
      if (kind === 'mine' && ready) { S.wcd[id] = cd; for (let i = 0; i < st.count; i++) { if (S.MN.length >= st.limit) S.MN.shift();
        const ma = i * 6.2832 / st.count + t, off = (i - (st.count - 1) / 2) * 56; S.MN.push({ x: S.x + (st.ring ? Math.cos(ma) * st.ring : -S.ux * 80 - S.uy * off), y: S.y + 6 + (st.ring ? Math.sin(ma) * st.ring * 0.62 : -S.uy * 50 + S.ux * off * 0.62), t0: t + i * 0.15, life: st.life, r: st.radius, dmg: st.dmg * M.dmg }); } push(S, { k: 'drop', t, x: S.x, y: S.y }); }
      if (kind === 'ping' && ready && nearest(S, g, S.x, S.y, st.radius * 1.4)) { S.wcd[id] = cd; push(S, { k: 'ping', t, x: S.x, y: S.y - 30, r: st.radius, evo: st.heal ? 1 : 0 }); let n = 0;
        near(S, g, S.x, S.y, st.radius + 40, (e) => { const dx = e.x - S.x, dy = e.y - S.y, d = Math.hypot(dx, dy) || 1; if (d > st.radius + FOE[e.k].r) return;
          hurtFoe(S, e, st.dmg * M.dmg, dx / d * st.push, dy / d * st.push, 'ping'); n++; }); hitTanks(S, S.x, S.y, st.radius, st.dmg);
        if (st.heal && n) S.hp = Math.min(hpMax(S), S.hp + Math.min(4, n * st.heal)); }
      if (kind === 'retry' && ready && !WEAP[id].evo && nearest(S, g, S.x, S.y, 900)) { S.wcd[id] = cd; const side = Math.cos(S.aim) < 0 ? 1 : -1;
        for (let i = 0; i < st.count; i++) { const sp = (260 + 110 * i) * side * (i % 2 && st.count > 2 ? -1 : 1);
          S.P.push({ k: 'axe', x: S.x, y: S.y, rel: [0, 0], wait: t + i * 0.14, z: 60, vx: sp, vy: (rnd(S) - 0.5) * 120, vz: 980 + 60 * i, life: 3, t0: t + i * 0.14, dmg: st.dmg * M.dmg * 1.15, hit: [] }); }
        push(S, { k: 'toss', t, x: S.x, y: S.y - 60 }); }
      if (kind === 'retry' && ready && WEAP[id].evo) { const tg = nearest(S, g, S.x, S.y, 800); if (tg) { S.wcd[id] = cd;
        for (let i = 0; i < st.count; i++) { const a = Math.atan2(tg.y - S.y, tg.x - S.x) + i * 6.2832 / st.count;
          S.P.push({ k: 'ret', x: S.x, y: S.y - 40, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, life: 3, t0: t, dmg: st.dmg * M.dmg, back: 0, sp: st.speed, hit: [] }); } } }
      if (kind === 'cache' && st.follow) { let z = S.ZN.find((q) => q.follow); if (!z) { z = { follow: 1, t0: t, life: 1e9, nt: t }; S.ZN.push(z); }
        Object.assign(z, { x: S.x, y: S.y, r: st.radius, dmg: st.dmg * M.dmg, tick: st.tick }); }
      else if (kind === 'cache' && ready) { const tg = nearest(S, g, S.x, S.y, 700); if (tg) { S.wcd[id] = cd;
        for (let i = 0; i < st.count; i++) { const a = rnd(S) * 6.28; S.ZN.push({ x: tg.x + (i ? Math.cos(a) * 140 : 0), y: tg.y + (i ? Math.sin(a) * 90 : 0), t0: t, life: st.life, r: st.radius, dmg: st.dmg * M.dmg, tick: st.tick, nt: t }); } } }
      if (kind === 'shield') { if (S.shCh === undefined) S.shCh = 0; if (S.shCh > st.charges) S.shCh = st.charges;          // the force shield's charges
        if (ready && S.shCh < st.charges) { S.shCh++; S.wcd[id] = S.shCh < st.charges ? cd : 0; push(S, { k: 'shieldup', t, x: S.x, y: S.y }); } }
      if (kind === 'tchain' && ready && onAim) { const [tx, ty] = tip(S); let cur = null, bd = st.range * 1.3;          // chain from the nearest foe ahead, breadth-first
        near(S, g, S.x, S.y, st.range * 1.4, (e) => { if (e.fly || e.dieT >= 0) return; const dx = e.x - S.x, dy = e.y - S.y, d = Math.hypot(dx, dy); let da = Math.atan2(dy, dx) - S.aim;
          da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) < st.cone && d < bd) { bd = d; cur = e; } });
        if (cur) { S.wcd[id] = cd; const q = [cur], hit = [cur.id];
          const jl = abOn(S) && abOf(S).id === 'registry' ? 999 : st.jumps;                  // Реестр: the whole linked group
          for (let qi = 0; qi < q.length && q.length < jl; qi++) { const c = q[qi]; near(S, g, c.x, c.y, st.range, (e) => { if (q.length >= jl || hit.includes(e.id) || e.fly || e.dieT >= 0) return;
            if (Math.hypot(e.x - c.x, e.y - c.y) < st.range && lineClear(c.x, c.y - 30, e.x, e.y - 30)) { hit.push(e.id); q.push(e); } }); }
          const pts = [[tx, ty]]; for (const e of q) { pts.push([e.x, e.y - FOE[e.k].r * 1.3]); hurtFoe(S, e, st.dmg * M.dmg, 0, 0, 'tchain'); if (st.back) hurtFoe(S, e, st.dmg * M.dmg * 0.6, 0, 0, 'tchain'); }
          push(S, { k: 'chain', t, x: S.x, y: S.y, pts, hero: 1, evo: WEAP[id].evo ? 1 : 0 }); push(S, { k: 'swing', t, x: S.x, y: S.y }); } }
      if (kind === 'packet' && ready && onAim && nearest(S, g, S.x, S.y, st.range)) { S.wcd[id] = cd; const [tx, ty] = tip(S);            // a piercing packet at the cursor
        for (let i = 0; i < st.count; i++) { const a = S.aim + (i - (st.count - 1) / 2) * st.spread;
          S.P.push({ k: 'pkt', x: tx, y: ty, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, life: st.range / st.speed, t0: t, dmg: st.dmg * M.dmg, pierce: 999, hit: [], split: st.split || 0, evo: WEAP[id].evo ? 1 : 0 }); }
        push(S, { k: 'swing', t, x: S.x, y: S.y }); }
      if (kind === 'regress' && ready && nearest(S, g, S.x, S.y, st.range * 1.3)) { S.wcd[id] = cd; const R = st.range;                 // QA: a square check round the hero
        push(S, { k: 'scan', t, x: S.x, y: S.y, r: R, evo: WEAP[id].evo ? 1 : 0 });
        near(S, g, S.x, S.y, R * 1.5, (e) => { if (e.fly || e.dieT >= 0 || Math.abs(e.x - S.x) > R + FOE[e.k].r * 0.5 || Math.abs(e.y - S.y) > R * 0.62 + FOE[e.k].r * 0.5) return;
          e.scanT = t; if (st.mark) e.markT = t + 2;
          if (!FOE[e.k].boss && !FOE[e.k].mini) { e.atkT = -9; e.stunT = t + st.stun; e.nextAtk = Math.max(e.nextAtk, t + st.stun); }
          hurtFoe(S, e, st.dmg * M.dmg, 0, 0, 'regress'); }); hitTanks(S, S.x, S.y, R, st.dmg); }
      if (kind === 'udp' && ready && nearest(S, g, S.x, S.y, 1100)) { S.wcd[id] = cd; const hx = S.x + S.ux * 30, hy = S.y - 50 + S.uy * 20, a0 = Math.atan2(S.uy, S.ux);   // along the movement
        const vol = WEAP[id].evo ? 1 : 3; if (vol > 1) S.wcd[id] = cd * vol;
        for (let v = 0; v < vol; v++) for (let i = 0; i < st.count; i++) { const a = a0 + (i - (st.count - 1) / 2) * st.spread + (rnd(S) - 0.5) * 0.06;
          S.P.push({ k: 'udp', x: hx, y: hy, rel: [hx - S.x, hy - S.y], wait: t + v * 0.075, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, life: st.life, t0: t + v * 0.075, dmg: st.dmg * M.dmg, pierce: st.pierce, hit: [], evo: WEAP[id].evo ? 1 : 0 }); }
        push(S, { k: 'udp', t, x: hx, y: hy }); }
      if (kind === 'chain' && ready) { let cur = randomFoe(S, g, S.x, S.y, 560); if (cur) { S.wcd[id] = cd; const pts = [[S.x, S.y - 80]], hit = [];
        for (let j = 0; cur && j <= st.jumps; j++) { hit.push(cur.id); pts.push([cur.x, cur.y - FOE[cur.k].r * 1.3]); hurtFoe(S, cur, st.dmg * M.dmg * Math.pow(0.92, j), 0, 0, 'chain');
          let nx = null, nd = st.range; near(S, g, cur.x, cur.y, st.range, (e) => { if (hit.includes(e.id)) return; const d = Math.hypot(e.x - cur.x, e.y - cur.y); if (d < nd) { nd = d; nx = e; } }); cur = nx; }
        push(S, { k: 'chain', t, x: S.x, y: S.y, pts, evo: WEAP[id].evo ? 1 : 0 }); } }
      if (kind === 'storm' && ready) { const pool = []; near(S, g, S.x, S.y, 1100, (e) => { if (Math.abs(e.x - S.x) < 950 && Math.abs(e.y - S.y) < 520) pool.push(e); });
        if (pool.length) { S.wcd[id] = cd; for (let j = 0; j < st.count && pool.length; j++) { const e = pool.splice(Math.floor(rnd(S) * pool.length), 1)[0];
            S.SQ.push({ id: e.id, x: e.x, y: e.y, t0: t + j * 0.12, at: t + 0.32 + j * 0.12, r: st.radius, dmg: st.dmg * M.dmg, evo: WEAP[id].evo ? 1 : 0 }); } } }
      if (kind === 'turret') { const mine = S.TU.filter((u) => u.w === id);
        if (st.perm) for (const u of mine) if (Math.hypot(u.x - S.x, u.y - S.y) > 1000) { u.x = S.x + (rnd(S) - 0.5) * 300; u.y = S.y + 120; }    // the cluster keeps up
        if (ready && mine.length < st.count) { S.wcd[id] = st.perm ? 0.5 : cd; const a = rnd(S) * 6.28; let x = S.x + Math.cos(a) * 90, y = S.y + Math.sin(a) * 60;
          if (blocked(x, y, 30)) { x = S.x; y = S.y; } S.TU.push({ w: id, x, y, t0: t, life: st.life, nt: t + 0.4, a: 0 }); push(S, { k: 'turret', t, x, y }); }
        for (const u of mine) { u.dmg = st.dmg * M.dmg; u.rate = st.rate; u.range = st.range; u.evo = WEAP[id].evo ? 1 : 0; } }
      if (kind === 'cryo') { if (ready && !(S.cryo && S.cryo.until > t)) { S.wcd[id] = cd + st.burst; S.cryo = { t0: t, until: t + st.burst, nt: t, w: id, a: S.cryo ? S.cryo.a : S.aim }; push(S, { k: 'cryo', t, x: S.x, y: S.y }); }
        if (S.cryo && S.cryo.w === id && S.cryo.until > t) S.cryo.a = (S.cryo.a === undefined ? S.aim : S.cryo.a) + 2.4 * DT;        // a sprinkler: one turn in 2.6 s
        if (S.cryo && S.cryo.w === id && S.cryo.until > t && t >= S.cryo.nt) { S.cryo.nt = t + st.tick; const a = S.cryo.a, tx = S.x, ty = S.y - 50; S.cryo.r = st.range; S.cryo.half = st.half;
          near(S, g, tx, ty, st.range + 200, (e) => { const rr = FOE[e.k].r * 0.85; if (!inSector(e.x - tx, e.y - FOE[e.k].r * 1.3 - ty, a, st.half, st.range, rr)) return;
            hurtFoe(S, e, st.dmg * M.dmg, Math.cos(a) * 30, Math.sin(a) * 30, 'cryo'); e.chillT = t + 0.7; e.chillN = (e.chillN || 0) + 1;
            if (st.freeze && e.chillN >= 8 && !FOE[e.k].boss && !FOE[e.k].mini) { e.frzT = t + 1.2; e.chillN = 0; } }); } }
      if (kind === 'fork' && ready) { const tg = densest(S, g, S.x, S.y, 760, 160); if (tg) { S.wcd[id] = cd;
        S.P.push({ k: 'fork', x: S.x, y: S.y, ox: S.x, oy: S.y, tx: tg.x, ty: tg.y, t0: t, T: 0.8, life: 9, dmg: st.dmg * M.dmg, r: st.radius, split: st.split, depth: st.depth, evo: WEAP[id].evo ? 1 : 0 });
        push(S, { k: 'toss', t, x: S.x, y: S.y - 50 }); } }
      if (ready && S.wcd[id] > 0 && kind !== 'trace') S.wcd[id] *= 0.9 + 0.2 * rnd(S);
    }
    for (let i = S.SQ.length - 1; i >= 0; i--) { const q = S.SQ[i]; const e = S.E.find((o) => o.id === q.id && o.dieT < 0); if (e) { q.x = e.x; q.y = e.y; }   // the warning follows its target
      if (t < q.at) continue; S.SQ.splice(i, 1); push(S, { k: 'bolt', t, x: q.x, y: q.y, r: q.r, evo: q.evo });
      near(S, g, q.x, q.y, q.r + 60, (o) => { if (Math.hypot(o.x - q.x, (o.y - q.y) / 0.62) < q.r + FOE[o.k].r * 0.6) hurtFoe(S, o, q.dmg, 0, 0, 'storm'); }); hitTanks(S, q.x, q.y, q.r, q.dmg); }
    // sentry servers: shoot the nearest foe in range
    for (let i = S.TU.length - 1; i >= 0; i--) { const u = S.TU[i]; if (!S.wp[u.w] || t - u.t0 > u.life) { S.TU.splice(i, 1); continue; }
      if (t >= u.nt) { const tg = nearest(S, g, u.x, u.y, u.range || 560); if (tg) { u.nt = t + (u.rate || 0.3); const a = Math.atan2(tg.y - 30 - (u.y - 70), tg.x - u.x); u.a = a;
          S.P.push({ k: 'tsh', x: u.x + Math.cos(a) * 30, y: u.y - 70 + Math.sin(a) * 30, vx: Math.cos(a) * 1000, vy: Math.sin(a) * 1000, life: 0.8, t0: t, dmg: u.dmg, pierce: 0, hit: [], evo: u.evo });
          push(S, { k: 'tfire', t, x: u.x, y: u.y - 70 }); } } }
    // projectiles
    for (let i = S.P.length - 1; i >= 0; i--) { const p = S.P[i]; if (p.wait > S.t) continue; if (p.rel) { p.x = S.x + p.rel[0]; p.y = S.y + p.rel[1]; p.rel = null; }
      p.life -= DT; let dead = p.life <= 0;
      if (p.k === 'udp' || p.k === 'tsh' || p.k === 'pkt') { p.x += p.vx * DT; p.y += p.vy * DT; const c = Math.floor((p.y + 40) / FC) * FW + Math.floor(p.x / FC); if (WALL[c]) dead = true;
        near(S, g, p.x, p.y + 30, 60, (e) => { if (dead || p.hit.includes(e.id)) return; if (Math.hypot(e.x - p.x, e.y - FOE[e.k].r * 1.3 - p.y) < FOE[e.k].r + 8) { p.hit.push(e.id);
          hurtFoe(S, e, p.dmg, p.vx * 0.12, p.vy * 0.12, p.k); if (p.pierce-- <= 0) dead = true;
          if (p.split) { const a = Math.atan2(p.vy, p.vx), v = Math.hypot(p.vx, p.vy); for (let j = 0; j < p.split; j++) { const b = a + (j - (p.split - 1) / 2) * 0.55;
            S.P.push({ k: 'pkt', x: p.x, y: p.y, vx: Math.cos(b) * v * 0.85, vy: Math.sin(b) * v * 0.85, life: 0.45, t0: S.t, dmg: p.dmg * 0.5, pierce: 999, hit: p.hit.slice(), split: 0, evo: 1 }); } p.split = 0; } } }); }
      if (p.k === 'fork') { const q = Math.min(1, (S.t - p.t0) / p.T); p.x = p.ox + (p.tx - p.ox) * q; p.y = p.oy + (p.ty - p.oy) * q; p.z = 4 * q * (1 - q) * (p.depth > 0 && p.split ? 260 : 140);
        if (q >= 1) { dead = true; push(S, { k: 'blast', t: S.t, x: p.tx, y: p.ty, r: p.r, evo: p.evo });
          near(S, g, p.tx, p.ty, p.r + 60, (e) => { const dx = e.x - p.tx, dy = e.y - p.ty, d = Math.hypot(dx, dy) || 1; if (d < p.r + FOE[e.k].r * 0.5) hurtFoe(S, e, p.dmg, dx / d * 220, dy / d * 220, 'fork'); });
          hitTanks(S, p.tx, p.ty, p.r, p.dmg);
          if (p.depth > 0) for (let j = 0; j < p.split; j++) { const a = j * 6.2832 / p.split + rnd(S) * 0.6, d = p.r * (0.9 + 0.6 * rnd(S));
            S.P.push({ k: 'fork', x: p.tx, y: p.ty, ox: p.tx, oy: p.ty, tx: p.tx + Math.cos(a) * d, ty: p.ty + Math.sin(a) * d * 0.7, t0: S.t, T: 0.4, life: 9, dmg: p.dmg * 0.45, r: p.r * 0.55, split: p.split, depth: p.depth - 1, evo: p.evo }); } } }
      if (p.k === 'hom') { let tg = null; for (const e of S.E) if (e.id === p.tg && e.dieT < 0 && !e.fly) { tg = e; break; } if (!tg) tg = nearest(S, g, p.x, p.y + 30, 500);
        const age = S.t - p.t0, v = Math.min(p.sp, Math.hypot(p.vx, p.vy) + (age < 0.3 ? 0 : 2200 * DT)), turn = age < 0.3 ? 1.2 : 8;      // rise, then dive
        if (tg) { p.tg = tg.id; const a = Math.atan2(tg.y - 30 - p.y, tg.x - p.x), c = Math.atan2(p.vy, p.vx); const da = Math.atan2(Math.sin(a - c), Math.cos(a - c)); const na = c + Math.max(-turn * DT, Math.min(turn * DT, da));
          p.vx = Math.cos(na) * v; p.vy = Math.sin(na) * v; }
        p.x += p.vx * DT; p.y += p.vy * DT;
        near(S, g, p.x, p.y + 30, 50, (e) => { if (dead) return; if (Math.hypot(e.x - p.x, e.y - 30 - p.y) < FOE[e.k].r + 10) { hurtFoe(S, e, p.dmg, p.vx * 0.2, p.vy * 0.2, 'homing'); dead = true;
          push(S, { k: 'pop', t: S.t, x: p.x, y: p.y }); } });
        if (!dead) S.tk.forEach((o, j) => { if (!dead && o.hp > 0 && Math.hypot(TANKS[j][0] - p.x, TANKS[j][1] - 30 - p.y) < 34) { o.hp -= p.dmg; dead = true; push(S, { k: 'pop', t: S.t, x: p.x, y: p.y }); } }); }
      if (p.k === 'axe') { p.x += p.vx * DT; p.y += p.vy * DT; p.z += p.vz * DT; p.vz -= 2100 * DT;
        if (p.z <= 0 && p.vz < 0) { dead = true; push(S, { k: 'pop', t: S.t, x: p.x, y: p.y }); }
        else if (p.z < 170) near(S, g, p.x, p.y, 80, (e) => { if (p.hit.includes(e.id)) return; if (Math.hypot(e.x - p.x, e.y - p.y) < FOE[e.k].r + 26) { p.hit.push(e.id); hurtFoe(S, e, p.dmg, p.vx * 0.4, 0, 'retry'); } }); }
      if (p.k === 'ret') { const a = S.t - p.t0; if (!p.back && a > 0.45) { p.back = 1; p.hit = []; }
        if (p.back) { const dx = S.x - p.x, dy = S.y - 40 - p.y, d = Math.hypot(dx, dy) || 1; const v = Math.min(p.sp * 1.3, Math.hypot(p.vx, p.vy) + 2400 * DT);
          p.vx += (dx / d * v - p.vx) * Math.min(1, 9 * DT); p.vy += (dy / d * v - p.vy) * Math.min(1, 9 * DT); if (d < 40) dead = true; }
        else { p.vx *= 1 - 1.6 * DT; p.vy *= 1 - 1.6 * DT; }
        p.x += p.vx * DT; p.y += p.vy * DT;
        near(S, g, p.x, p.y + 30, 50, (e) => { if (p.hit.includes(e.id)) return; if (Math.hypot(e.x - p.x, e.y - 30 - p.y) < FOE[e.k].r + 18) { p.hit.push(e.id); hurtFoe(S, e, p.dmg, p.vx * 0.25, p.vy * 0.25, 'retry'); } });
        hitTanks(S, p.x, p.y, 16, p.dmg * DT * 6); }
      if (dead) S.P.splice(i, 1); }
    // mines
    for (let i = S.MN.length - 1; i >= 0; i--) { const m = S.MN[i], a = S.t - m.t0; if (a < 0) continue; let go = a > m.life;
      if (a > 0.4 && !go) near(S, g, m.x, m.y, 60, (e) => { if (Math.hypot(e.x - m.x, e.y - m.y) < 44 + FOE[e.k].r * 0.5) go = true; });
      if (go) { S.MN.splice(i, 1); push(S, { k: 'blast', t: S.t, x: m.x, y: m.y, r: m.r });
        near(S, g, m.x, m.y, m.r + 40, (e) => { const dx = e.x - m.x, dy = e.y - m.y, d = Math.hypot(dx, dy) || 1; if (d < m.r + FOE[e.k].r * 0.5) hurtFoe(S, e, m.dmg, dx / d * 260, dy / d * 260, 'mine'); });
        hitTanks(S, m.x, m.y, m.r, m.dmg); } }
    // cache zones
    for (let i = S.ZN.length - 1; i >= 0; i--) { const z = S.ZN[i]; if (S.t - z.t0 > z.life) { S.ZN.splice(i, 1); continue; }
      if (S.t >= z.nt) { z.nt += z.tick; near(S, g, z.x, z.y, z.r + 30, (e) => { if (Math.hypot(e.x - z.x, (e.y - z.y) / 0.62) < z.r + FOE[e.k].r * 0.5) hurtFoe(S, e, z.dmg, 0, 0, 'cache'); }); hitTanks(S, z.x, z.y, z.r * 0.8, z.dmg); } }
  }

  // ---------------- foes ----------------
  const ring = (S, e, f, n, speed, dmg, a0) => { for (let j = 0; j < n; j++) { const a = a0 + j * 6.2832 / n;
    S.EB.push({ x: e.x, y: e.y - 40, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed * 0.8, life: 3, dmg, slow: f.slow || null, c: e.k }); } };
  function foes(S, g) {
    const t = S.t, D = flowFor(S.x, S.y);
    for (let i = S.E.length - 1; i >= 0; i--) { const e = S.E[i], f = FOE[e.k];
      if (e.fly) { e.z += e.vz * DT; e.vz -= 2400 * DT; e.x += e.kx * DT; e.y += e.ky * DT; e.kx *= 1 - 1.2 * DT; e.ky *= 1 - 1.2 * DT; clampW(e);
        if (e.z <= 0 && e.vz < 0) { e.z = 0; e.fly = 0; e.vz = 0; collide(e, f.r * 0.7, S); push(S, { k: 'land', t, x: e.x, y: e.y, id: e.id }); if (e.dieT < 0) killFoe(S, e, 'boom'); }
        continue; }
      if (e.dieT >= 0) { if (t - e.dieT > 0.75) S.E.splice(i, 1); continue; }
      const dx = S.x - e.x, dy = S.y - e.y, d = Math.hypot(dx, dy) || 1;
      let sp = f.sp, wantX = dx / d, wantY = dy / d;
      // path: straight at the hero when the line is clear, else down the flow field (around rack rows and machines)
      if (d > 160 && !lineClear(e.x, e.y, S.x, S.y)) { const fd = flowDir(D, e.x, e.y); if (fd) { wantX = fd[0]; wantY = fd[1]; } }
      if (f.keep && d < f.keep && lineClear(e.x, e.y, S.x, S.y)) { wantX = -dx / d * 0.6; wantY = -dy / d * 0.6; }   // ranged foes keep their distance
      const home = e.home || (e.node ? ZONES[e.node - 1] : null);                  // a bug's circle (a zone, or a terminal's guard post)
      if (home && d > 1300) { const a = t * 0.4 + e.ph * 6.28, tx = home.nx + Math.cos(a) * NODE_R * 0.4, ty = home.ny + Math.sin(a) * NODE_R * 0.3, l = Math.hypot(tx - e.x, ty - e.y) || 1;
        wantX = (tx - e.x) / l * 0.5; wantY = (ty - e.y) / l * 0.5; }
      if (f.split && e.twin && d < 1400) { const ph = t * 0.35 + (e.copy ? e.twin : e.id) * 1.3 + (e.copy ? 2.4 : 0), tx = S.x + Math.cos(ph) * f.keep * 1.25, ty = S.y + Math.sin(ph) * f.keep * 0.85;   // the copies circle the hero apart:
        const l = Math.hypot(tx - e.x, ty - e.y) || 1; wantX = (tx - e.x) / l; wantY = (ty - e.y) / l; }                                     // their tether passes near, not through, the hero
      if (f.zig) { const w = Math.sin(t * 6 + e.ph * 9) * 0.85; const zx = wantX - wantY * w, zy = wantY + wantX * w, zl = Math.hypot(zx, zy) || 1; wantX = zx / zl; wantY = zy / zl; }
      if (f.kind === 'spin' && e.spinT > t) { wantX = dx / d; wantY = dy / d; sp = f.sp * f.spin.speed; }
      if (e.chillT > t) sp *= f.boss ? 0.8 : 0.55; if (e.frzT > t || e.stunT > t) sp = 0;                                                  // Криокулер
      if (f.queue) { let n = 0; for (const m of S.MK) if (m.q === e.id) n++; sp *= 1 + f.queue.haste * n; }                          // the retry storm: quicker while its queue is pending
      if (Math.abs(dx) > 8) e.face = dx > 0 ? 1 : -1;
      const winding = e.atkT >= 0 && t - e.atkT < f.wind;
      if (winding) sp *= f.boss ? 0 : f.kind === 'melee' ? 0.25 : 0;
      if (f.dash) { e.dashCD -= DT;
        if (e.dash === 0 && e.dashCD <= 0 && d < f.dash.trigger && d > 140 && lineClear(e.x, e.y, S.x, S.y)) { e.dash = 1; e.dashT = t; e.dx = dx / d; e.dy = dy / d; push(S, { k: 'aim', t, x: e.x, y: e.y, id: e.id, dx: e.dx, dy: e.dy }); }
        if (e.dash === 1) { sp = 0; if (t - e.dashT > f.dash.wind) { e.dash = 2; e.dashT = t; } }
        else if (e.dash === 2) { sp = f.dash.speed; wantX = e.dx; wantY = e.dy; if (t - e.dashT > f.dash.time) { e.dash = 0; e.dashCD = f.dash.cd; } } }
      const mv = S.over ? 0 : 1;
      e.vx = wantX * sp * mv; e.vy = wantY * sp * mv;
      // separation from neighbours (grid, linear falloff)
      let sx = 0, sy = 0; near(S, g, e.x, e.y, f.r * 2.2, (o) => { if (o === e) return; const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy), rr = f.r + FOE[o.k].r;
        if (od < rr && od > 0.01) { const k = (rr - od) / rr; sx += ox / od * k; sy += oy / od * k; } });
      const sepK = f.boss ? 30 : f.kind === 'desk' ? 0 : 260; if (f.kind === 'desk') { e.kx = 0; e.ky = 0; }
      e.x += (e.vx + e.kx + sx * sepK) * DT; e.y += (e.vy + e.ky + sy * sepK) * DT;
      const kd = Math.exp(-7 * DT); e.kx *= kd; e.ky *= kd;
      collide(e, f.r * 0.7, S); clampW(e);
      if (home) { const lx = e.x - home.nx, ly = (e.y - home.ny) / 0.62, ld = Math.hypot(lx, ly), lim = (home.R || NODE_R) - f.r;   // never leaves its circle
        if (ld > lim) { e.x = home.nx + lx / ld * lim; e.y = home.ny + ly / ld * lim * 0.62; e.kx *= 0.3; e.ky *= 0.3; } }
      const vx = e.vx + e.kx, vy = e.vy + e.ky, mvd = Math.hypot(vx, vy); e.dist += Math.min(mvd, f.sp * 1.3) * DT;
      if (mvd > 10) { e.ux = vx / mvd; e.uy = vy / mvd; }
      e.g += ((mvd > 20 ? 1 : 0) - e.g) * Math.min(1, 7 * DT);
      if (S.over) continue;
      // summons and escalation (bosses, the aggregation bug)
      if (f.pools && t >= e.poolT && d < 900) { e.poolT = t + f.pools.every; for (let j = 0; j < f.pools.count; j++) { const a = rnd(S) * 6.28, r = j ? f.pools.scatter * rnd(S) : 0;
        S.PU.push({ x: S.x + Math.cos(a) * r, y: S.y + Math.sin(a) * r * 0.7, t0: t, life: f.pools.life, r: f.pools.radius, dmg: f.dmg * f.pools.dmg, nt: t + 0.8 }); } push(S, { k: 'pools', t, x: e.x, y: e.y }); }
      if (f.summon && t >= e.sumT && (!home || d < 1400)) { e.sumT = t + f.summon.every; let n = 0; for (const o of S.E) if (o.dieT < 0 && o.sum === e.id) n++;
        let made = 0; for (let j = 0; j < (f.summon.count + e.lvl * 2) * (e.sumK || 1) && n + j < f.summon.max * (e.sumK || 1); j++) { const a = rnd(S) * 6.28, x = e.x + Math.cos(a) * (f.r + 90), y = e.y + Math.sin(a) * (f.r + 60);
          if (blocked(x, y, 24)) continue; const o = mkFoe(S, f.summon.units[j % f.summon.units.length], x, y); o.sum = e.id; made++; }
        if (made) push(S, { k: 'summon', t, x: e.x, y: e.y }); }
      if (f.trail && t >= (e.trT || 0) && e.g > 0.5) { e.trT = t + f.trail.every; S.TR.push({ x: e.x, y: e.y, t0: t, life: f.trail.life, r: f.trail.r }); if (S.TR.length > 220) S.TR.shift(); }
      if (f.kind === 'spin' && e.spinT > t && t >= (e.spinNt || 0)) { e.spinNt = t + f.spin.tick; if (d < f.spin.r + K.R) hurtHero(S, f.dmg, e.x, e.y); }
      if (f.desk && t >= e.sumT && d < f.desk.reach) { e.sumT = t + f.desk.every; let n = 0; for (const o of S.E) if (o.dieT < 0 && o.sum === e.id) n++;
        const batch = Math.min(f.desk.max - n, f.desk.base + Math.floor(t / f.desk.grow)); let made = 0;
        for (let j = 0; j < batch; j++) { const a = rnd(S) * 6.28, x = S.x + Math.cos(a) * 520, y = S.y + Math.sin(a) * 380; if (blocked(x, y, 28)) continue; const o = mkFoe(S, f.desk.unit, x, y); o.sum = e.id; made++; }
        if (made) push(S, { k: 'tickets', t, x: e.x, y: e.y, n: made }); }
      if (f.escalate && t >= e.escT && e.lvl < f.escalate.max) { e.escT = t + f.escalate.every; e.lvl++; S.toast = { s: f.name.toUpperCase() + ': эскалация, уровень ' + e.lvl, t }; push(S, { k: 'esc', t, x: e.x, y: e.y });
        if (f.outage) outage(S, e, f); }
      if (f.outage && !e.outIn && !S.demo) { e.outIn = 1; outage(S, e, f); }                                                         // the lights go out on arrival
      // the replica: a copy breaks away at half health; while both live, the line between them burns
      if (f.split && !e.split && !e.copy && e.hp <= e.mhp * f.split.at) { e.split = 1; const a = rnd(S) * 6.28, x = e.x + Math.cos(a) * 160, y = e.y + Math.sin(a) * 110;
        const o = mkFoe(S, e.k, blocked(x, y, f.r * 0.7) ? e.x : x, blocked(x, y, f.r * 0.7) ? e.y : y); o.hp = e.hp; o.mhp = e.mhp; o.copy = 1; o.split = 1; o.twin = e.id; e.twin = o.id; o.nextAtk = t + 1.5;
        S.toast = { s: f.name.toUpperCase() + ': реплика отделилась', t }; push(S, { k: 'split', t, x: e.x, y: e.y, id: e.id }); }
      if (f.tether && e.twin && !e.copy && t >= (e.tetT || 0)) { const o = S.E.find((q) => q.id === e.twin && q.dieT < 0);
        if (o) { const vx = o.x - e.x, vy = o.y - e.y, L2 = vx * vx + vy * vy || 1, u = Math.max(0, Math.min(1, ((S.x - e.x) * vx + (S.y - e.y) * vy) / L2));
          if (Math.hypot(e.x + vx * u - S.x, e.y + vy * u - S.y) < f.tether.w / 2 + K.R) { e.tetT = t + f.tether.tick; hurtHero(S, f.dmg * f.tether.dmg, e.x + vx * u, e.y + vy * u); } } }
      // attack start: in range (and in sight for ranged foes)
      const reach = f.kind === 'melee' ? f.range + K.R : f.kind === 'pulse' ? f.range * (f.boss ? 1.4 : 1.1) : f.range;
      if (!(e.truceT > t) && f.kind !== 'desk' && !(e.spinT > t) && !(e.frzT > t) && !(e.stunT > t) && e.atkT < 0 && t >= e.nextAtk && d < reach && (f.kind === 'melee' || f.kind === 'pulse' || f.kind === 'spin' || f.kind === 'queue' || lineClear(e.x, e.y, S.x, S.y))) {
        e.atkT = t; e.ax = S.x; e.ay = S.y; push(S, { k: f.boss ? 'bwind' : 'wind', t, x: e.x, y: e.y, id: e.id, kind: f.kind }); }
      const wind = f.wind * (f.boss ? Math.pow(0.85, e.lvl) : 1);
      if (e.atkT >= 0 && t - e.atkT >= wind) {
        if (f.kind === 'pulse') { push(S, { k: f.boss ? 'slam' : 'pulse', t, x: e.x, y: e.y, r: f.range, id: e.id, ty: e.k }); if (d < f.range) hurtHero(S, f.dmg, e.x, e.y, f.slow);
          if (f.shots) { e.shotN++; if (e.shotN % 2 === 0) ring(S, e, f, f.shots.count + e.lvl * 3, f.shots.speed, f.dmg * f.shots.dmg, e.shotN * 0.3); } }
        else if (f.kind === 'spin') { e.spinT = t + f.spin.time; e.spinNt = t; push(S, { k: 'spin', t, x: e.x, y: e.y, id: e.id }); }
        else if (f.kind === 'lob') { for (let j = 0; j < f.lob.count; j++) { const a = Math.atan2(S.y - e.y, S.x - e.x) + (j - (f.lob.count - 1) / 2) * 0.35, dist = Math.min(d, f.range) * (0.85 + 0.2 * rnd(S)), T = 0.9;
            S.LB.push({ x: e.x, y: e.y, vx: Math.cos(a) * dist / T, vy: Math.sin(a) * dist / T, z: 60, vz: 600, b: f.lob.bounces, r: f.lob.r, dmg: f.dmg }); } push(S, { k: 'toss', t, x: e.x, y: e.y - 50 }); }
        else if (f.kind === 'beam') { const a = Math.atan2(e.ay - e.y, e.ax - e.x), L0 = f.beam.len, x1 = e.x + Math.cos(a) * L0, y1 = e.y + Math.sin(a) * L0;
          S.BM.push({ x0: e.x, y0: e.y - 40, x1, y1: y1 - 40, t0: t, w: f.beam.w, hold: f.beam.hold, dmg: f.dmg, hit: 0 }); push(S, { k: 'beam', t, x: e.x, y: e.y - 40, a }); }
        else if (f.kind === 'shoot') { const a = Math.atan2(S.y - 40 - (e.y - 40), S.x - e.x);
          if (f.shots.fan) { for (let j = 0; j < f.shots.count; j++) { const b = a + (j - (f.shots.count - 1) / 2) * f.shots.fan / Math.max(1, f.shots.count - 1) * 2;
              S.EB.push({ x: e.x, y: e.y - 40, vx: Math.cos(b) * f.shots.speed, vy: Math.sin(b) * f.shots.speed, life: f.shots.back ? 2 * f.shots.back + 0.4 : 1.6, life0: 2 * (f.shots.back || 0) + 0.4, back: f.shots.back || 0, dmg: f.dmg * f.shots.dmg, slow: f.slow || null, c: e.k }); } }
          else if (f.shots.count > 1) ring(S, e, f, f.shots.count, f.shots.speed, f.dmg * f.shots.dmg, a);
          else S.EB.push({ x: e.x, y: e.y - 40, vx: Math.cos(a) * f.shots.speed, vy: Math.sin(a) * f.shots.speed, life: 2.4, dmg: f.dmg, slow: f.slow || null, c: e.k });
          push(S, { k: 'fire', t, x: e.x, y: e.y - 40, id: e.id, a }); }
        else if (f.kind === 'queue') { const Q = f.queue, a = Math.atan2(S.y - e.y, S.x - e.x), n = Q.count + e.lvl;          // a row through where the hero is heading
          const hx = S.x + (S.vx || 0) * Q.lead, hy = S.y + (S.vy || 0) * Q.lead;
          for (let j = 0; j < n; j++) { const o = (j - (n - 1) / 2) * Q.gap, x = hx + Math.cos(a) * o, y = hy + Math.sin(a) * o * 0.7;
            S.MK.push({ x, y, t0: t, delay: Q.delay + j * Q.step, r: Q.r, dmg: f.dmg, q: e.id }); }
          push(S, { k: 'queue', t, x: e.x, y: e.y }); }
        else if (f.kind === 'mortar') { for (let j = 0; j < f.mortar.count; j++) { const a = rnd(S) * 6.28, r = j ? f.mortar.scatter * rnd(S) : 0;
            S.MK.push({ x: S.x + Math.cos(a) * r, y: S.y + Math.sin(a) * r * 0.7, t0: t, delay: f.mortar.delay, r: f.mortar.radius, dmg: f.dmg, ox: e.x, oy: e.y - 60 }); }
          push(S, { k: 'lob', t, x: e.x, y: e.y }); }
        else { push(S, { k: 'strike', t, x: e.x, y: e.y, id: e.id, ty: e.k }); if (d < f.range + K.R + 16) hurtHero(S, f.dmg, e.x, e.y, f.slow); }
        e.nextAtk = t + f.cd * (f.boss ? Math.pow(0.85, e.lvl) : 1); e.atkT = -9; }
    }
    // foe bullets (stopped by rack rows and machines) and mortar marks
    for (let i = S.EB.length - 1; i >= 0; i--) { const b = S.EB[i]; b.x += b.vx * DT; b.y += b.vy * DT; b.life -= DT;
      if (b.back && !b.turned && b.life0 - b.life >= b.back) { b.turned = 1; b.vx = -b.vx; b.vy = -b.vy; }   // Royal Canin: the batch comes back
      if (Math.hypot(b.x - S.x, b.y - (S.y - 40)) < K.R + 14) { hurtHero(S, b.dmg, b.x, b.y, b.slow); b.life = 0; }
      if (b.life > 0 && WALL[Math.floor((b.y + 40) / FC) * FW + Math.floor(b.x / FC)] && blocked(b.x, b.y + 40, 0)) { b.life = 0; push(S, { k: 'spark', t: S.t, x: b.x, y: b.y }); }
      if (b.life <= 0) S.EB.splice(i, 1); }
    for (let i = S.LB.length - 1; i >= 0; i--) { const j = S.LB[i]; j.x += j.vx * DT; j.y += j.vy * DT; j.z += j.vz * DT; j.vz -= 1500 * DT;
      if (j.z <= 0) { j.z = 0; push(S, { k: 'splash', t: S.t, x: j.x, y: j.y, r: j.r }); if (Math.hypot(S.x - j.x, (S.y - j.y) / 0.62) < j.r + K.R) hurtHero(S, j.dmg, j.x, j.y);
        if (j.b-- > 0) { j.vz = 420; j.vx *= 0.55; j.vy *= 0.55; } else S.LB.splice(i, 1); } }
    for (let i = S.TR.length - 1; i >= 0; i--) { const q = S.TR[i]; if (S.t - q.t0 > q.life) { S.TR.splice(i, 1); continue; }
      if (Math.abs(S.x - q.x) < q.r && Math.abs(S.y - q.y) < q.r * 0.62 && !S.demo) { S.slowT = Math.max(S.slowT, S.t + FOE.mond.trail.slow.dur); S.slowA = Math.max(S.slowA * (S.t < S.slowT ? 1 : 0), FOE.mond.trail.slow.amount); } }
    for (let i = S.BM.length - 1; i >= 0; i--) { const b = S.BM[i], a = S.t - b.t0; if (a > b.hold) { S.BM.splice(i, 1); continue; } if (b.hit) continue;
      const vx = b.x1 - b.x0, vy = b.y1 - b.y0, L2 = vx * vx + vy * vy, u = Math.max(0, Math.min(1, ((S.x - b.x0) * vx + (S.y - 40 - b.y0) * vy) / L2));
      if (Math.hypot(b.x0 + vx * u - S.x, b.y0 + vy * u - (S.y - 40)) < b.w / 2 + K.R) { b.hit = 1; hurtHero(S, b.dmg, b.x0, b.y0); } }
    for (let i = S.PU.length - 1; i >= 0; i--) { const p = S.PU[i]; if (S.t - p.t0 > p.life) { S.PU.splice(i, 1); continue; }
      if (S.t >= p.nt) { p.nt += 0.6; if (Math.hypot(S.x - p.x, (S.y - p.y) / 0.62) < p.r) hurtHero(S, p.dmg, p.x, p.y); } }
    for (let i = S.MK.length - 1; i >= 0; i--) { const m = S.MK[i]; if (S.t - m.t0 >= m.delay) { S.MK.splice(i, 1); push(S, { k: 'mortar', t: S.t, x: m.x, y: m.y, r: m.r });
      if (Math.hypot(S.x - m.x, (S.y - m.y) / 0.7) < m.r) hurtHero(S, m.dmg, m.x, m.y); } }
  }

  // ---------------- step ----------------
  // render interpolation: positions, z, camera and time before this step (SIM.lerp draws between them and the step's result)
  const LERPS = ['E', 'P', 'EB', 'LB', 'Gm'];
  const keepPrev = (S) => { S._ot = S.t; S._ox = S.x; S._oy = S.y; if (S.cam) { S._ocx = S.cam[0]; S._ocy = S.cam[1]; }
    for (const k of LERPS) { const A = S[k]; if (A) for (const o of A) { o._ox = o.x; o._oy = o.y; o._oz = o.z; } } };
  // set S to the in-between state at alpha in [0, 1) between the last two steps; returns the restore function
  function lerp(S, a) { if (!(a >= 0) || S._ot === undefined) return () => {};                  // alpha 0 draws the previous step
    const saved = [], one = (o) => { if (o._ox === undefined) return; const dx = o.x - o._ox, dy = o.y - o._oy; if (dx * dx + dy * dy > 250000) return;   // a teleport: no smear
      saved.push(o, o.x, o.y, o.z); o.x = o._ox + dx * a; o.y = o._oy + dy * a; if (o.z !== undefined && o._oz !== undefined) o.z = o._oz + (o.z - o._oz) * a; };
    one(S); for (const k of LERPS) { const A = S[k]; if (A) for (const o of A) one(o); }
    const t1 = S.t, c0 = S.cam && S.cam[0], c1 = S.cam && S.cam[1]; S.t = S._ot + (S.t - S._ot) * a;
    if (S.cam && S._ocx !== undefined && Math.abs(c0 - S._ocx) + Math.abs(c1 - S._ocy) < 500) { S.cam[0] = S._ocx + (c0 - S._ocx) * a; S.cam[1] = S._ocy + (c1 - S._ocy) * a; }
    return () => { for (let i = 0; i < saved.length; i += 4) { const o = saved[i]; o.x = saved[i + 1]; o.y = saved[i + 2]; if (saved[i + 3] !== undefined) o.z = saved[i + 3]; }
      S.t = t1; if (S.cam) { S.cam[0] = c0; S.cam[1] = c1; } }; }
  function step(S, inp) {
    levelFor(S); keepPrev(S);
    const t = S.t + DT;
    if (S.over) { S.t = t; S.steps++; if ((inp.click || inp.act || inp.jump) && t - S.over.t > 1.4 && !S.demo) { const N = spawn(S.wt0 + t, S.mods, runOpt(S)); for (const k in S) delete S[k]; Object.assign(S, N); } else cam(S); return S; }
    if (S.ed && S.ed.active) { quizStep(S, inp); S.steps++; cam(S); return S; }                // a test (or the revival test) holds the game
    if (S.pick) { const el = t - S.pick.t0; let c = -1;
      if (inp.slot >= 1 && inp.slot <= S.pick.opts.length) c = inp.slot - 1;
      if (inp.click) for (let i = 0; i < S.pick.opts.length; i++) { const [x, y, w, h] = cardRect(i); if (inp.px >= x && inp.px <= x + w && inp.py >= y && inp.py <= y + h) c = i; }
      if (S.demo && el > 1.6) c = 0;
      let ctl = inp.slot === 4 ? 0 : inp.slot === 5 ? 1 : -1;
      if (inp.click) for (let i = 0; i < 2; i++) { const [x, y, w, h] = ctlRect(i); if (inp.px >= x && inp.px <= x + w && inp.py >= y && inp.py <= y + h) ctl = i; }
      S.t = t; S.steps++;
      if (el > 0.35 && ctl === 0 && S.rerolls > 0) { S.rerolls--; S.pick.opts = rollPick(S, S.pick.chest); S.pick.t0 = t - 0.3; push(S, { k: 'reroll', t, x: S.x, y: S.y }); return S; }
      if (el > 0.35 && ctl === 1 && S.skips > 0) { S.skips--; push(S, { k: 'skip', t, x: S.x, y: S.y }); closePick(S); return S; }
      if (c >= 0 && el > 0.35) applyPick(S, S.pick.opts[c]); return S; }
    S.t = t;
    if (S.freeze > 0) { S.freeze -= DT; S.steps++; return S; }
    const M = mul(S), spd = K.SPEED * heroOf(S).speed * M.sp * (t < S.slowT ? 1 - S.slowA : 1);
    // ax / ay: the touch stick (stage 7a of docs/PLAN-FEEDBACK-27-10.md), −1..1 and proportional; else the keys
    const an = inp.ax !== undefined && (inp.ax || inp.ay), ix = an ? inp.ax : (inp.right ? 1 : 0) - (inp.left ? 1 : 0), iy = an ? inp.ay : (inp.down ? 1 : 0) - (inp.up ? 1 : 0), il = an ? Math.max(1, Math.hypot(ix, iy)) : Math.hypot(ix, iy) || 1;
    const app = (v, tg) => { const a = (Math.abs(tg) > Math.abs(v) ? K.ACC : K.DEC) * DT; return v < tg ? Math.min(tg, v + a) : Math.max(tg, v - a); };
    S.vx = app(S.vx, ix / il * spd); S.vy = app(S.vy, iy / il * spd);
    const de = (inp.jump || inp.act) && !S.prevDash; S.prevDash = inp.jump || inp.act ? 1 : 0; S.dashCD = Math.max(0, S.dashCD - DT);
    if (de && S.dashCD <= 0 && (ix || iy)) { S.dashT = t; S.dashCD = K.DASH_CD; S.ddx = ix / il; S.ddy = iy / il; push(S, { k: 'dash', t, x: S.x, y: S.y, dx: S.ddx, dy: S.ddy }); }
    const dashing = t - S.dashT < K.DASH_T;
    const mvx = dashing ? S.ddx * K.DASH : S.vx, mvy = dashing ? S.ddy * K.DASH : S.vy;
    S.x += mvx * DT; S.y += mvy * DT; collide(S, K.R, S); clampW(S, 80);
    if (md(S, 'regen') || S.ps.repair) S.hp = Math.min(hpMax(S), S.hp + (0.15 * md(S, 'regen') + 0.3 * (S.ps.repair || 0)) * DT);   // Автовосстановление, Самовосстановление              // Автовосстановление
    const mv = Math.hypot(mvx, mvy); if (mv > 8) { S.ux = mvx / mv; S.uy = mvy / mv; }
    if (mv * DT > 0.05) { const b = Math.floor(S.dist / 62); S.dist += Math.min(mv, spd) * DT; if (Math.floor(S.dist / 62) !== b) push(S, { k: 'step', t, x: S.x, y: S.y }); }
    S.g += ((mv > 30 ? 1 : 0) - S.g) * Math.min(1, 8 * DT);
    const g = buildGrid(S);
    // aim: toward the trace target if any (S.aimT, set by weapons), else the move direction; capped turn rate (no snapping)
    let da = Math.atan2(Math.sin(S.aimT - S.aim), Math.cos(S.aimT - S.aim)); S.aim += Math.max(-12 * DT, Math.min(12 * DT, da));
    if (inp.auto) { let best = null, bd = 760; for (const e of S.E) { if (e.dieT >= 0 || e.fly) continue; const d = Math.hypot(e.x - S.x, e.y - S.y); if (d < bd) { bd = d; best = e; } }   // touch: the nearest foe,
      if (best) { inp.px = best.x - S.cam[0]; inp.py = best.y - 30 - S.cam[1]; } else { inp.px = S.x + (S.ux || 1) * 260 - S.cam[0]; inp.py = S.y - 40 + (S.uy || 0) * 260 - S.cam[1]; } }   // else ahead
    if (inp.px !== undefined) { S.px = inp.px; S.py = inp.py; } S.fire = inp.press ? 1 : 0;
    const use = inp.use && !S.prevUse; S.prevUse = inp.use ? 1 : 0;                                                // E: a terminal's test / the door, else the ability
    if (use && S.ed && nearUse(S)) { eduUse(S); if (S.ed.active) { S.steps++; return S; } } else if (use) cast(S, g);
    if (S.ab) { S.ab.cd = Math.max(0, S.ab.cd - DT); abilityStep(S, g); }
    weapons(S, g);
    foes(S, g); if (!S.demo) waves(S);
    ZONES.forEach((z, i) => { const n = S.nodes[i]; if (n.st) return; const inside = Math.hypot(S.x - z.nx, (S.y - z.ny) / 0.62) < NODE_R;
      n.hold = inside ? n.hold + DT : Math.max(0, n.hold - DT * 0.5); if (n.hold >= (n.down ? RESTART_T : HOLD_T)) capture(S, i, 'hold'); });
    if (S.ed && LV.TERMS) LV.TERMS.forEach((tm, i) => { const n = S.nodes[i]; if (!n || n.st) return; const inside = Math.hypot(S.x - tm.cx, (S.y - tm.cy) / 0.62) < TERM_R;   // a guarded terminal's workaround
      n.hold = inside ? n.hold + DT : Math.max(0, n.hold - DT * 0.5); if (n.hold >= HOLD_T) termFree(S, i, 'hold'); });
    if (S.demo && t >= 0.15 && !S.demoBoom) { S.demoBoom = 1; boom(S, 0); }
    // energy cells: overload at 0 hp, come back later (out of the hero's sight)
    S.tk.forEach((o, i) => { if (o.hp <= 0 && o.boom < 0) boom(S, i); else if (o.boom >= 0 && t >= o.back && Math.hypot(S.x - TANKS[i][0], S.y - TANKS[i][1]) > 1100) { o.hp = 30; o.boom = -9; } });
    // pickups: magnet pull, collect
    const mag = 130 * M.mag;
    for (let i = S.Gm.length - 1; i >= 0; i--) { const p = S.Gm[i]; const dx = S.x - p.x, dy = S.y - 30 - p.y, d = Math.hypot(dx, dy) || 1;
      if (!p.m && d < mag) { p.m = 1; p.mt = t; }
      if (p.m) { const v = Math.min(1500, 260 + 900 * (t - p.mt)); p.vx += (dx / d * v - p.vx) * Math.min(1, 10 * DT); p.vy += (dy / d * v - p.vy) * Math.min(1, 10 * DT); }
      else { p.vx *= 1 - 4 * DT; p.vy *= 1 - 4 * DT; }
      p.x += p.vx * DT; p.y += p.vy * DT;
      if (d < 36) { S.Gm.splice(i, 1); if (p.b === 1) { S.bars++; push(S, { k: 'bar', t, x: p.x, y: p.y }); } else if (p.b === 2) { S.hp = Math.min(hpMax(S), S.hp + 30); fxOf(S).heal++; push(S, { k: 'heal', t, x: p.x, y: p.y }); }
        else if (p.b === 3) { push(S, { k: 'chest', t, x: p.x, y: p.y }); openChest(S); }
        else { gainXp(S, p.v); push(S, { k: 'gem', t, x: p.x, y: p.y, g: p.k }); } } }
    if (S.Gm.length > 320) { const ai = S.Gm.findIndex((q) => q.b !== 3), a = S.Gm.splice(Math.max(0, ai), 1)[0]; const b = S.Gm.find((q) => !q.b); if (b) { b.v += a.v; b.k = Math.max(b.k, b.v >= 16 ? 2 : b.v >= 4 ? 1 : 0); } }
    cam(S); S.steps++; return S;
  }
  function cam(S) {
    const fx = S.x - VIEW.W / 2 + S.vx * 0.18, fy = S.y - 40 - VIEW.H / 2 + S.vy * 0.15, free = !!S.ed;   // a training room keeps the hero centred even at its edge (as in the original)
    const tgx = free ? fx : Math.max(WORLD.x0, Math.min(WORLD.x1 - VIEW.W, fx)), tgy = free ? fy : Math.max(WORLD.y0, Math.min(WORLD.y1 - VIEW.H, fy));
    S.camV[0] += (60 * (tgx - S.cam[0]) - 15 * S.camV[0]) * DT; S.cam[0] += S.camV[0] * DT;
    S.camV[1] += (60 * (tgy - S.cam[1]) - 15 * S.camV[1]) * DT; S.cam[1] += S.camV[1] * DT;
  }

  // attract input: kite a loop through the match screen (depends only on the state → deterministic replay)
  const scriptInput = (t, S) => { const a = (t - 1) * 0.55, tx = SPAWN[0] + 330 * Math.sin(a), ty = SPAWN[1] - 40 + 200 * Math.sin(2 * a);
    const dx = tx - S.x, dy = ty - S.y, inp = { left: 0, right: 0, up: 0, down: 0, jump: 0, act: 0 };
    if (t > 1.6 && Math.hypot(dx, dy) > 30) { if (Math.abs(dx) > 18) inp[dx > 0 ? 'right' : 'left'] = 1; if (Math.abs(dy) > 18) inp[dy > 0 ? 'down' : 'up'] = 1; }
    if (Math.abs(t - 9.0) < 0.02) inp.jump = 1;
    let best = null, bd = 420; for (const e of S.E) { if (e.dieT >= 0 || e.fly) continue; const d = Math.hypot(e.x - S.x, e.y - S.y); if (d < bd) { bd = d; best = e; } }
    if (best) { inp.px = best.x - S.cam[0]; inp.py = best.y - 30 - S.cam[1]; inp.press = 1; } return inp; };
  let cache = null;
  function at(t) {
    const loop = Math.floor(t / L), q = t - loop * L, nf = q / DT, n = Math.floor(nf);
    if (!cache || cache.loop !== loop || cache.S.steps > n) { const S0 = Object.assign(create(), { wt0: loop * L }); cache = { loop, S: S0 }; }
    const S = cache.S; while (S.steps < n) step(S, scriptInput(S.t, S));
    return Object.assign({}, S, { loop, q, alpha: nf - n });
  }
  const demoCheck = (S) => S.kills >= 20 && S.lvl >= 8 && S.tk[0].boom >= 0;
  // every spawn ring position a foe could land on can reach the hero's start on the flow field
  const selfCheck = (map = 'dc', seed = 0) => validate(buildLevel(map, seed));
  root.SIM = { DT, L, K, VIEW, WORLD, HINT, RUN_T, RESTART_T, RIG, FOE, FOE_DESC, WEAP, WSUM, PASS, EVO, HEROES, SKINS, ABIL, AB_MAX, CLIENTS, MAX_W, MAX_P, MAX_WL, MAX_PL, FOOT, PLAZA, zoneAt, MAPS, COMPONENTS, buildLevel, validate, ensureLevel, levelFor, lerp, TERM_R, TERM_USE, quizOpt, QUIZ_BTN, doorOpen, nearUse, EDU_MAZE,
    SPAWN, ORIGIN, NODE_R, HOLD_T, wstat, hpMax, shoulder, hand, tip, cardRect, ctlRect, create, spawn, respawn, outOfPlay, step, at, scriptInput, demoCheck, selfCheck, rollPick, mkFoe };
  // the active level's data, read live (the level changes with the run)
  for (const k of ['ZONES', 'PROPS', 'BOXES', 'LAMPS', 'TANKS', 'STENCILS', 'CABLES', 'TAPES', 'HOLOS', 'RINGS', 'DESKS']) Object.defineProperty(root.SIM, k, { get: () => LV[k], enumerable: true });
  Object.defineProperty(root.SIM, 'SOLIDS', { get: () => LV.BOXES }); Object.defineProperty(root.SIM, 'LEVEL_ID', { get: () => LEVEL_ID }); Object.defineProperty(root.SIM, 'LEVEL', { get: () => LV });
  ensureLevel('dc', 0);
  if (typeof module !== 'undefined') module.exports = root.SIM;
})(typeof window !== 'undefined' ? window : globalThis);
