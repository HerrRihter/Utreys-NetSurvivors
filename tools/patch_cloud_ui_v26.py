# Round 26 (plan stage 5): the account and the leaderboards in the menus. The main menu gets «Лидеры» and an account button; the login
# form is an HTML overlay (typing into a canvas is awkward); «Лидеры» is a menu screen (metric and scope tabs, the top 15 and the
# player's own row); a counted run goes to CLOUD.onRun; the results show a new record's place or «Войдите, чтобы попасть в таблицу».
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
def patch(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:90], s.count(a)); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

if not os.path.exists('live/.meta_v26'):
  patch('live/meta.js', [
      ("  const MAIN = [['start', 'Начать смену'], ['shop', 'Магазин'], ['coll', 'Коллекция'], ['rec', 'Рекорды'], ['set', 'Настройки']];",
       "  const MAIN = [['start', 'Начать смену'], ['shop', 'Магазин'], ['coll', 'Коллекция'], ['rec', 'Рекорды'], ['lead', 'Лидеры'], ['set', 'Настройки']];\n  const C = () => window.CLOUD || null;"),
      ("    if (scr === 'main') return MAIN.map(([id, s], i) => ({ id, s, r: [110, 340 + i * 92, 560, 74] }));",
       "    if (scr === 'main') return [...MAIN.map(([id, s], i) => ({ id, s, r: [110, 330 + i * 86, 560, 70] })), { id: 'acct', acct: 1, r: [W - 640, 670, 540, 70] }];\n    if (scr === 'lead') { const cl = C(), ms = cl ? cl.METRICS : [], tw = 260, g = 16; return [...ms.map((m, i) => ({ id: 'lm' + i, metric: i, s: m.short, r: [110 + i * (tw + g), 186, tw, 52] })),\n      ...[['all', 'Все карты'], ['dc', 'Дата-центр']].map(([sc, s], i) => ({ id: 'ls' + sc, scope: sc, s, r: [110 + i * (300 + g), 254, 300, 48] }))]; }"),
      ("    if (scr === 'main') { if (it.id === 'start') {",
       "    if (it.acct) { const cl = C(); if (cl && cl.enabled && window.ACCOUNT_UI) window.ACCOUNT_UI.open(); else sfx('hurt'); return null; }\n    if (it.metric !== undefined || it.scope) { const cl = C(); if (cl) cl.loadBoard(it.metric !== undefined ? it.metric : cl.board.metric, it.scope || cl.board.scope); sfx('ui'); return null; }\n    if (scr === 'main') { if (it.id === 'lead') { go('lead'); const cl = C(); if (cl) cl.loadBoard(); return null; }\n      if (it.id === 'start') {"),
      # a counted run goes up (CLOUD queues it for a signed-in player, keeps a guest's latest one)
      ("    last = { over: S.over, earned, base, total: D.codes, rec: rec.time || rec.kills, finds, win, edu, map: S.map };",
       "    last = { over: S.over, earned, base, total: D.codes, rec: rec.time || rec.kills, finds, win, edu, map: S.map };\n    if (counted && window.CLOUD) CLOUD.onRun({ map: S.map || 'dc', time: S.t || 0, kills: S.kills || 0, codes: earned, lvl: S.lvl || 0, win, hero: S.hero });"),
  ])
  open('live/.meta_v26','w').write('1')

patch('live/scene.js', [
    # main menu: the account button
    ("      L.uiBox('mhelp', 90, 930, 900, 60, 8);",
     """      { const cl = window.CLOUD, o = it.find((x) => x.acct), st = cl && cl.state, s = !cl || !cl.enabled ? 'Вход и таблицы: Firebase не подключён' : st.status === 'signedIn' ? 'Вы вошли: ' + st.login : st.status === 'loading' ? 'Подключение…' : st.status === 'error' ? 'Нет связи с сервером' : 'Войти или зарегистрироваться';
        if (o) btn('macct', o.r, s, hot(it.indexOf(o)), 26, !cl || !cl.enabled ? '#6f8a90' : st.status === 'signedIn' ? '#64ffda' : null); }
      L.uiBox('mhelp', 90, 930, 900, 60, 8);"""),
    # the leaderboard screen
    ("    if (V.scr === 'rec') { head('РЕКОРДЫ');",
     """    if (V.scr === 'lead') { const cl = window.CLOUD, B = cl && cl.board, m = cl && cl.METRICS[B.metric]; head('ЛИДЕРЫ', m ? m.title + (m.hint ? ' · ' + m.hint : '') : '');
      it.forEach((o, i) => btn('mld' + i, o.r, o.s, hot(i) || (o.metric !== undefined ? B.metric === o.metric : B.scope === o.scope), 24, (o.metric !== undefined ? B.metric === o.metric : B.scope === o.scope) ? '#ffffff' : null));
      const px0 = W / 2 - 620, py0 = 330, pw = 1240; panel('mldp', px0, py0, pw, 640, 0.85);
      const row = (k, place, login, hero, value, y, me) => { if (me) L.rrect(px0 + 10, y - 22, pw - 20, 44, 6, [0.0, 0.45, 0.55], [0.0, 0.3, 0.38], 0.3);
        label('mlp' + k, place, px0 + 70, y, { size: 26, al: 1, col: me ? '#64ffda' : '#7ff6ff' }); label('mll' + k, login, px0 + 110, y, { size: 26, col: me ? '#ffffff' : '#e6fdff' });
        label('mlh' + k, hero, px0 + 680, y, { size: 22, col: '#a9c9cf' }); label('mlv' + k, value, px0 + pw - 40, y, { size: 26, al: 1, col: '#e6fdff' }); };
      if (!cl || B.error) label('mlerr', !cl ? 'Таблицы недоступны' : B.error, W / 2, py0 + 300, { size: 28, al: 0.5, col: '#ff8f85' });
      else if (B.loading || !B.rows) label('mlload', 'Загрузка…', W / 2, py0 + 300, { size: 28, al: 0.5, col: '#7ff6ff' });
      else if (!B.rows.length) label('mlempty', 'Пока никого — сыграйте смену первым', W / 2, py0 + 300, { size: 28, al: 0.5, col: '#a9c9cf' });
      else { const hn = (h) => (SIM.HEROES[h] ? SIM.HEROES[h].name : ''), me = cl.state.uid;
        B.rows.slice(0, 12).forEach((r, i) => row(i, String(r.place), r.login, hn(r.hero), cl.fmt(m, r.value), py0 + 44 + i * 48, r.uid === me));
        if (B.me) row('me', B.me.place === Infinity ? '1000+' : String(B.me.place || '—'), B.me.login, hn(B.me.hero), cl.fmt(m, B.me.value), py0 + 44 + 12 * 48 + 8, true); }
      if (cl && cl.enabled && cl.state.status !== 'signedIn') label('mlhint', 'Войдите в главном меню, чтобы попасть в таблицу', W / 2, py0 + 670, { size: 22, al: 0.5, col: '#7f9ea6' });
      backBtn(); return; }
    if (V.scr === 'rec') { head('РЕКОРДЫ');"""),
    # results: a new record's place, or the invitation to sign in
    ("      if (lb) { const ex = ['Коды: +' + lb.earned + ' (всего ' + lb.total + ')'].concat(lb.rec ? ['НОВЫЙ РЕКОРД'] : [], lb.finds.length ? ['В коллекции новое: ' + lb.finds.length] : []);",
     """      if (lb) { const cl = window.CLOUD, cr = cl && cl.enabled && cl.last.run && lb.map === 'dc' ? cl.last : null, recs = cr ? cr.improved.filter((f) => !f.includes(':')) : [];
        const cloudLine = !cr ? [] : cr.guest ? ['Войдите, чтобы попасть в таблицу'] : recs.length ? [recs.map((f) => { const mm = cl.METRICS.find((x) => x.field === f), p = cr.places[f]; return mm.short + (p ? ' — ' + (p === Infinity ? '1000+' : p) + '-е место' : ''); }).slice(0, 2).join(' · ')] : [];
        const ex = ['Коды: +' + lb.earned + ' (всего ' + lb.total + ')'].concat(lb.rec ? ['НОВЫЙ РЕКОРД'] : [], lb.finds.length ? ['В коллекции новое: ' + lb.finds.length] : [], cloudLine);"""),
    ("for (const scr of ['main', 'shop', 'coll', 'rec', 'set', 'hero', 'client', 'map', 'course']) { META.go(scr, true); menu(0, t); }",
     "for (const scr of ['main', 'shop', 'coll', 'rec', 'set', 'hero', 'client', 'map', 'course', 'lead']) { META.go(scr, true); menu(0, t); }"),
    ("if (window.META) for (const scr of ['main', 'shop', 'coll', 'rec', 'set', 'hero', 'client', 'map', 'course']) {",
     "if (window.META) for (const scr of ['main', 'shop', 'coll', 'rec', 'set', 'hero', 'client', 'map', 'course', 'lead']) {"),
])

# the page: load the config and the cloud, the login overlay, typing into it does not reach the game
patch('live/index.html', [
    ("for (const f of ['assets.js', 'sizes.js', 'gl.js', 'lib.js', 'course.js', 'edu.js', 'sim.js',",
     "for (const f of ['assets.js', 'sizes.js', 'gl.js', 'lib.js', 'firebase-config.js', 'cloud.js', 'course.js', 'edu.js', 'sim.js',"),
    ("#flash{", """#acct{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:#01060acc;font:600 18px Consolas,'Cascadia Mono',monospace;color:#e6fdff;z-index:5}
#acct .box{width:min(520px,90vw);background:#03111a;border:2px solid #00e5ff;border-radius:10px;padding:26px 30px;box-shadow:0 0 40px #00e5ff33}
#acct h2{margin:0 0 6px;color:#7ff6ff;font-size:28px;letter-spacing:1px}#acct p{margin:0 0 16px;color:#7f9ea6;font-size:15px;font-weight:400}
#acct input{display:block;width:100%;box-sizing:border-box;margin:8px 0;padding:12px 14px;background:#020b10;border:1px solid #21545e;border-radius:6px;color:#fff;font:inherit;outline:none}
#acct input:focus{border-color:#00e5ff}#acct .row{display:flex;gap:10px;margin-top:14px}
#acct button{flex:1;padding:12px;background:#063a44;border:1px solid #00e5ff;border-radius:6px;color:#fff;font:inherit;cursor:pointer}#acct button.alt{background:transparent;border-color:#21545e;color:#a9c9cf}
#acct button:disabled{opacity:.5;cursor:default}#acct .err{min-height:22px;margin-top:10px;color:#ff8f85;font-size:16px}
#flash{"""),
    ("<div id=\"dev\"></div>", """<div id="acct"><div class="box"><h2 id="acct-t">ВХОД</h2><p id="acct-p">Логин: 3–16 символов, буквы одного алфавита, цифры, «_» и «-»</p>
<form id="acct-f" autocomplete="on"><input id="acct-l" placeholder="Логин" maxlength="16" autocomplete="username"><input id="acct-pw" type="password" placeholder="Пароль" autocomplete="current-password">
<input id="acct-r" type="password" placeholder="Пароль ещё раз" autocomplete="new-password"><div class="err" id="acct-e"></div>
<div class="row"><button type="submit" id="acct-go">Войти</button><button type="button" class="alt" id="acct-sw">Регистрация</button></div>
<div class="row"><button type="button" class="alt" id="acct-out">Выйти из аккаунта</button><button type="button" class="alt" id="acct-x">Закрыть · Esc</button></div></form></div></div>
<div id="dev"></div>"""),
    ("  addEventListener('keydown', (e) => {\n    const c = e.code;",
     """  // the account form (CLOUD): sign in / register / sign out; while it is open the keys belong to it
  { const $ = (id) => document.getElementById(id), box = $('acct'); let reg = false;
    const show = () => { const st = CLOUD.state, inn = st.status === 'signedIn'; $('acct-t').textContent = inn ? 'АККАУНТ' : reg ? 'РЕГИСТРАЦИЯ' : 'ВХОД';
      $('acct-p').textContent = inn ? 'Вы вошли как ' + st.login + '. Забеги идут в таблицы лидеров.' : 'Логин: 3–16 символов, буквы одного алфавита, цифры, «_» и «-»';
      for (const id of ['acct-l', 'acct-pw', 'acct-go', 'acct-sw']) $(id).style.display = inn ? 'none' : ''; $('acct-r').style.display = !inn && reg ? '' : 'none';
      $('acct-out').style.display = inn ? '' : 'none'; $('acct-go').textContent = reg ? 'Зарегистрироваться' : 'Войти'; $('acct-sw').textContent = reg ? 'У меня есть аккаунт' : 'Регистрация';
      $('acct-e').textContent = st.error || ''; for (const id of ['acct-go', 'acct-out']) $(id).disabled = !!st.busy; };
    window.ACCOUNT_UI = { open: () => { box.style.display = 'flex'; CLOUD.state.error = ''; show(); setTimeout(() => (CLOUD.state.status === 'signedIn' ? $('acct-x') : $('acct-l')).focus(), 0); },
      close: () => { box.style.display = 'none'; document.activeElement && document.activeElement.blur(); }, get open_() { return box.style.display === 'flex'; } };
    if (window.CLOUD) CLOUD.subscribe(() => { if (box.style.display === 'flex') { show(); if (CLOUD.state.status === 'signedIn' && !CLOUD.state.busy && !CLOUD.state.error && $('acct-out').style.display === 'none') ACCOUNT_UI.close(); } });
    $('acct-f').addEventListener('submit', async (e) => { e.preventDefault(); const l = $('acct-l').value, p = $('acct-pw').value;
      const done = reg ? await CLOUD.register(l, p, $('acct-r').value) : await CLOUD.signIn(l, p); if (done) { $('acct-pw').value = $('acct-r').value = ''; } });
    $('acct-sw').onclick = () => { reg = !reg; CLOUD.state.error = ''; show(); }; $('acct-out').onclick = async () => { await CLOUD.signOut(); ACCOUNT_UI.close(); }; $('acct-x').onclick = () => ACCOUNT_UI.close();
    box.addEventListener('keydown', (e) => { if (e.code === 'Escape') ACCOUNT_UI.close(); e.stopPropagation(); }); box.addEventListener('pointerdown', (e) => { if (e.target === box) ACCOUNT_UI.close(); e.stopPropagation(); }); }
  addEventListener('keydown', (e) => {
    if (document.getElementById('acct').style.display === 'flex') return;                // the account form has the keys
    const c = e.code;"""),
    ("const WATCH = ['index.html', 'scene.js', 'sim.js', 'edu.js', 'course.js',", "const WATCH = ['index.html', 'scene.js', 'sim.js', 'edu.js', 'course.js', 'cloud.js', 'firebase-config.js',"),
])
print('patched')
