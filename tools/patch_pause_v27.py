# Round 27 (user: "Esc in a shift goes to the map select instead of a pause menu; can a shift be continued after going to the main
# menu?"): Esc in a shift opens a pause menu (the game stands still): continue, music and sound on/off, «Выйти в меню» (the shift is
# kept, across a reload too: localStorage 'ns_suspended_v1'), «Завершить смену» (banked). The main menu offers «Продолжить смену» while
# one is kept; starting a new shift ends the kept one (its codes are banked). Closing the page mid-shift keeps it as well.
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
def patch(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:90], s.count(a)); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

patch('live/meta.js', [
    ("  const C = () => window.CLOUD || null;",
     """  const C = () => window.CLOUD || null;
  // a shift kept for later (the page holds the run itself): { hero, map, t, room } for the menu's «Продолжить смену», or null
  let susp = null;
  // the pause menu over a running shift
  const pz = { open: false, sel: 0 };
  const pauseItems = () => { const P = window.AUDIO ? AUDIO.pref : { musicOn: true, enabled: true };
    return [['resume', 'Продолжить · Esc'], ['music', 'Музыка: ' + (P.musicOn ? 'вкл' : 'выкл')], ['sound', 'Звук: ' + (P.enabled ? 'вкл' : 'выкл')], ['menu', 'Выйти в меню · смена сохранится'], ['end', 'Завершить смену · коды зачтутся']]
      .map(([id, s], i) => ({ id, s, r: [W / 2 - 340, 300 + i * 100, 680, 80] })); };
  function pauseAct(i) { const it = pauseItems()[i]; if (!it) return null; sfx('ui');
    if (it.id === 'music' || it.id === 'sound') { if (window.AUDIO) AUDIO.toggle(it.id === 'music' ? 'music' : 'sound'); return null; }
    pz.open = false; return it.id; }
  const PAUSE = { open: () => { pz.open = true; pz.sel = 0; sfx('ui'); }, close: () => { pz.open = false; }, get isOpen() { return pz.open; },
    key: (c) => { const n = pauseItems().length; if (c === 'ArrowUp' || c === 'KeyW') { pz.sel = (pz.sel + n - 1) % n; sfx('ui'); } else if (c === 'ArrowDown' || c === 'KeyS') { pz.sel = (pz.sel + 1) % n; sfx('ui'); }
      else if (c === 'Enter' || c === 'Space') return pauseAct(pz.sel); else if (c === 'Escape') { pz.open = false; return 'resume'; } return null; },
    click: (x, y) => { const it = pauseItems(); for (let i = 0; i < it.length; i++) if (inR(it[i].r, x, y)) { pz.sel = i; return pauseAct(i); } return null; },
    move: (x, y) => { pauseItems().forEach((o, i) => { if (inR(o.r, x, y)) pz.sel = i; }); },
    view: () => ({ open: pz.open, sel: pz.sel, items: pauseItems() }) };"""),
    ("    if (scr === 'main') return [...MAIN.map(([id, s], i) => ({ id, s, r: [110, 330 + i * 86, 560, 70] })), { id: 'acct', acct: 1, r: [W - 640, 670, 540, 70] }];",
     "    if (scr === 'main') { const L0 = susp ? [['resume', 'Продолжить смену'], ...MAIN] : MAIN, dy = susp ? 78 : 86;\n      return [...L0.map(([id, s], i) => ({ id, s, r: [110, 330 + i * dy, 560, dy - 14] })), { id: 'acct', acct: 1, r: [W - 640, 670, 540, 70] }]; }"),
    ("    if (scr === 'main') { if (it.id === 'lead') {", "    if (scr === 'main' && it.id === 'resume') return 'resume';\n    if (scr === 'main') { if (it.id === 'lead') {"),
    ("window.META = { UPG, MAPS, tab:", "window.META = { UPG, MAPS, PAUSE, setSuspended: (o) => { susp = o; }, get suspended() { return susp; }, tab:"),
])

patch('live/scene.js', [
    # the main menu: what the kept shift is
    ("      L.uiBox('mhelp', 90, 930, 900, 60, 8);",
     """      if (V.suspended) { const sp = V.suspended, s = 'Сохранена смена: ' + (sp.map === 'edu' ? 'Учебный центр' : 'Дата-центр') + ' · ' + (SIM.HEROES[sp.hero] ? SIM.HEROES[sp.hero].name : '') + ' · ' + mmss(sp.t);
        L.uiBox('msusp', W - 640, 760, 540, 50, 6); label('msusp', s, W - 370, 785, { size: 20, al: 0.5, col: '#64ffda' }); }
      L.uiBox('mhelp', 90, 930, 900, 60, 8);"""),
    # the pause menu over the shift
    ("    if (ST.ed && ST.ed.active && !ST.over) { quiz(ST, GT, t); return; }                       // a test covers the whole HUD\n",
     """    if (ST.ed && ST.ed.active && !ST.over) { quiz(ST, GT, t); return; }                       // a test covers the whole HUD
    if (window.META && S.state && META.PAUSE.isOpen) { const P = META.PAUSE.view(); L.solid(0, 0, W, H, [0.01, 0.02, 0.04], 0, 0, 0, 0.72);            // the pause menu
      L.uiBox('pzt', W / 2 - 340, 170, 680, 90, 8); label('pzt', 'ПАУЗА', W / 2, 215, { size: 64, al: 0.5, col: '#7ff6ff' });
      P.items.forEach((o, i) => { const [x, y, w, h] = o.r, on = i === P.sel; L.uiBox('pz' + i, x, y, w, h, 8); frame(x, y, w, h, on ? 0.95 : 0.8, on ? CYAN : [0.13, 0.33, 0.39]);
        if (on) { L.rrect(x, y, w, h, 4, [0.0, 0.45, 0.55], [0.0, 0.3, 0.38], 0.22); L.rrect(x + 4, y + 8, 5, h - 16, 2, CYAN); }
        label('pzs' + i, o.s, x + w / 2, y + h / 2, { size: 30, al: 0.5, col: on ? '#ffffff' : o.id === 'end' ? '#ffd6cf' : '#bfe3ea' }); });
      L.uiBox('pzh', W / 2 - 460, 830, 920, 50, 6); label('pzh', '↑↓ или мышь — выбор · Enter — подтвердить · Esc — продолжить', W / 2, 855, { size: 22, al: 0.5, col: '#7f9ea6' });
      return; }
"""),
    ("if (window.META) for (const scr of ['main', 'shop', 'coll', 'rec', 'set', 'hero', 'client', 'map', 'course', 'lead']) {",
     "if (window.META) { const ps = play(1); ps.qaPause = 1; states.push(['pause', ps]); const ms = play(1); ms.qaMenu = 'main'; ms.qaSusp = { hero: 'qa', map: 'edu', t: 754 }; states.push(['menu_main_resume', ms]); }\n    if (window.META) for (const scr of ['main', 'shop', 'coll', 'rec', 'set', 'hero', 'client', 'map', 'course', 'lead']) {"),
    ("const MS = window.META && (S.state ? ST.qaMenu : 'live'); if (MS && MS !== 'live') { META.go(MS, true); META.tab(ST.qaTab || 'up'); }",
     "const MS = window.META && (S.state ? ST.qaMenu : 'live'); if (MS && MS !== 'live') { META.go(MS, true); META.tab(ST.qaTab || 'up'); if (ST.qaSusp) META.setSuspended(ST.qaSusp); }\n    if (window.META && S.state && (ST.qaPause || ST.qaMenu)) { if (ST.qaPause) META.PAUSE.open(); else META.PAUSE.close(); }"),
])

patch('live/index.html', [
    ("  const startRun = () => { play = SIM.spawn(simT, window.META ? META.mods() : undefined, window.META ? META.runOpts() : undefined); hint.style.opacity = 0; };",
     """  // a kept shift (the pause menu's «Выйти в меню», or the page closed mid-shift): resumed from the main menu, ended by a new start
  const SKEY = 'ns_suspended_v1'; let kept = null;
  const keepInfo = (S) => (S ? { hero: S.hero, map: S.map, t: S.t, room: S.room || 0 } : null);
  const keep = (S) => { kept = S; if (window.META) META.setSuspended(keepInfo(S)); try { if (S) localStorage.setItem(SKEY, JSON.stringify(S)); else localStorage.removeItem(SKEY); } catch (e) {} };
  try { const ks = JSON.parse(localStorage.getItem(SKEY) || 'null'); if (ks && !ks.over && !ks.demo) keep(Object.assign(SIM.create(), ks)); } catch (e) {}
  const startRun = () => { if (kept && window.META) { META.bank(kept); keep(null); }                // a new shift ends the kept one (its codes are banked)
    if (window.META) META.PAUSE.close(); play = SIM.spawn(simT, window.META ? META.mods() : undefined, window.META ? META.runOpts() : undefined); hint.style.opacity = 0; };
  const resumeRun = () => { if (!kept) return; play = kept; acc = 0; keep(null); if (window.META) META.PAUSE.close(); hint.style.opacity = 0; };
  // the pause menu's choices
  const pauseDo = (a) => { if (!a || !play) return; if (a === 'menu') { keep(play); play = null; SCENE.state = null; META.go('main', true); }
    else if (a === 'end') { META.bank(play); play = null; SCENE.state = null; META.go('main', true); } };
  addEventListener('pagehide', () => { if (play && !play.over && !play.demo && window.META) keep(play); });"""),
    ("    if (c === 'Escape' && (play || !window.META)) { if (play && window.META) { META.bank(play); META.go('main', true); } play = null; SCENE.state = null; hint.style.opacity = window.META ? 0 : 1; return; }\n    if (!play && window.META) { if (META.key(c) === 'start') startRun(); e.preventDefault(); return; }   // the menu (meta.js) owns input between runs",
     """    if (play && window.META && META.PAUSE.isOpen) { pauseDo(META.PAUSE.key(c)); e.preventDefault(); return; }   // the pause menu owns the keys
    if (c === 'Escape' && play && window.META && !play.over) { META.PAUSE.open(); for (const k in keys) keys[k] = 0; e.preventDefault(); return; }   // Esc in a shift: the pause menu
    if (c === 'Escape' && (play || !window.META)) { if (play && window.META) { META.bank(play); META.go('main', true); } play = null; SCENE.state = null; hint.style.opacity = window.META ? 0 : 1; return; }
    if (!play && window.META) { const a = META.key(c); if (a === 'start') startRun(); else if (a === 'resume') resumeRun(); e.preventDefault(); return; }   // the menu (meta.js) owns input between runs"""),
    ("  addEventListener('pointermove', (e) => { toView(e); if (!play && window.META) { META.move(ptr.x, ptr.y); if (ptr.down) META.drag(ptr.x); } });\n  addEventListener('pointerdown', (e) => { toView(e); ptr.down = 1; ptr.click = 1; if (!play) { ptr.click = 0; if (!window.META || META.click(ptr.x, ptr.y) === 'start') startRun(); } });",
     """  addEventListener('pointermove', (e) => { toView(e); if (play && window.META && META.PAUSE.isOpen) META.PAUSE.move(ptr.x, ptr.y); if (!play && window.META) { META.move(ptr.x, ptr.y); if (ptr.down) META.drag(ptr.x); } });
  addEventListener('pointerdown', (e) => { toView(e); ptr.down = 1; ptr.click = 1;
    if (play && window.META && META.PAUSE.isOpen) { ptr.click = 0; pauseDo(META.PAUSE.click(ptr.x, ptr.y)); return; }
    if (!play) { ptr.click = 0; const a = window.META ? META.click(ptr.x, ptr.y) : 'start'; if (a === 'start') startRun(); else if (a === 'resume') resumeRun(); } });"""),
    # the game stands still while the pause menu is open
    ("    if (play) {\n      acc += dt;", "    if (play) {\n      if (!(window.META && META.PAUSE.isOpen)) acc += dt;                                   // the pause menu holds the shift"),
    ("    const curs = play && !play.pick && !play.over && !(play.ed && play.ed.active) ? 'none' : 'default';",
     "    const curs = play && !play.pick && !play.over && !(play.ed && play.ed.active) && !(window.META && META.PAUSE.isOpen) ? 'none' : 'default';"),
])
print('patched')
