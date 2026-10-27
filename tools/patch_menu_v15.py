# Round 15 scene: the menu screens (main, shop, collection, records) drawn from META.view(), the reroll / skip buttons under
# the level-up cards, and the results screen's codes, records and finds.
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
p = 'live/scene.js'; s = open(p, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:100], s.count(a)); s = s.replace(a, b)

# between runs the menu replaces the HUD (a QA state can ask for a screen with qaMenu)
rep("    hud(ST, GT, t, combo, lvlUp, sx, sy);", "    const MS = window.META && (S.state ? ST.qaMenu : 'live'); if (MS && MS !== 'live') META.go(MS);\n    if (MS) menu(GT, t); else hud(ST, GT, t, combo, lvlUp, sx, sy);")
rep("""      if (GT - ST.over.t > 1.4) label('resk', 'Пробел или клик — новая смена', W / 2, py0 + ph - 60, { size: 30, al: 0.5, col: '#7ff6ff', a: 0.85 + 0.15 * Math.sin(t * 4) }); }
  }""", """      const lb = window.META && META.last && META.last.over === ST.over ? META.last : null;
      if (lb) { const ex = ['Коды: +' + lb.earned + ' (всего ' + lb.total + ')'].concat(lb.rec ? ['НОВЫЙ РЕКОРД'] : [], lb.finds.length ? ['В коллекции новое: ' + lb.finds.length] : []);
        ex.forEach((s2, i) => label('resx' + i, s2, W / 2, py0 + 180 + (lines.length + i) * 50, { size: 28, al: 0.5, col: i === 0 ? '#7ff6ff' : '#64ffda', a })); }
      if (GT - ST.over.t > 1.4) label('resk', 'Пробел — новая смена · Esc — в меню', W / 2, py0 + ph - 50, { size: 28, al: 0.5, col: '#7ff6ff', a: 0.85 + 0.15 * Math.sin(t * 4) }); }
    // level-up controls bought in the shop
    if (ST.pick && (ST.rerolls > 0 || ST.skips > 0)) [['Перегенерация', ST.rerolls, 4], ['Пропустить выбор', ST.skips, 5]].forEach(([nm, n, k], i) => { if (!n) return; const [x, y, w, h] = SIM.ctlRect(i);
      L.uiBox('ctl' + i, x, y, w, h, 8); frame(x, y, w, h, 0.9, MINT); label('ctl' + i, '[' + k + '] ' + nm + ' ×' + n, x + w / 2, y + h / 2, { size: 26, al: 0.5, col: '#c8fff0' }); });
  }

  // ---------------- menu (meta.js holds the state, the layout and the save) ----------------
  function menu(GT, t) {
    const V = META.view(), D = V.D, it = V.items, hot = (i) => i === V.sel;
    const btn = (id, r, txt, on, size = 30, col) => { L.uiBox(id, r[0], r[1], r[2], r[3], 8); frame(r[0], r[1], r[2], r[3], 0.9, on ? MINT : CYAN);
      if (on) { G.blend('add'); L.glow(r[0] + r[2] / 2, r[1] + r[3] / 2, r[2] * 0.45, MINT, 0.18 + 0.06 * Math.sin(t * 5), 2); G.blend(); }
      label(id + 't', txt, r[0] + r[2] / 2, r[1] + r[3] / 2, { size, al: 0.5, col: col || (on ? '#c8fff0' : '#bff8ff') }); };
    const head = (s1, s2) => { L.uiBox('mh', 90, 60, 1100, 120, 10); label('mh1', s1, 110, 100, { size: 62, col: '#7ff6ff' }); if (s2) label('mh2', s2, 112, 150, { size: 26, col: '#a9c9cf' }); };
    const wallet = () => { const s1 = 'Коды маркировки: ' + D.codes, w = L.labelW('mw', s1, { size: 30, font: MONO }); panel('mwp', W - w - 150, 74, w + 110, 64, 0.85);
      L.sprite('code_tex', W - w - 134, 82, { w: 48, h: 48 }); label('mw', s1, W - 50, 106, { size: 30, al: 1, col: '#7ff6ff' }); };
    const backBtn = () => btn('mback', V.back, 'Esc — назад', false, 26);
    if (V.scr === 'main') {
      L.solid(0, 0, W, H, [0.01, 0.02, 0.04], 0, 0, 0, 0.3); L.solid(0, 0, 780, H, [0.01, 0.02, 0.04], 0, 0, 0, 0.6);
      L.uiBox('mt', 90, 110, 1200, 200, 10); label('mt1', 'UTREYS // NETSURVIVORS', 110, 170, { size: 84, col: '#7ff6ff' });
      label('mt2', 'Ночная смена в дата-центре: удержите компоненты и закройте инцидент', 114, 250, { size: 28, col: '#a9c9cf' });
      const P = window.AUDIO ? AUDIO.pref : { enabled: true, musicOn: true };
      it.forEach((o, i) => btn('mm' + i, o.r, o.id === 'sound' ? 'Звук: ' + (P.enabled ? 'вкл' : 'выкл') : o.id === 'music' ? 'Музыка: ' + (P.musicOn ? 'вкл' : 'выкл') : o.s, hot(i), o.id === 'start' ? 36 : 30));
      const rows = ['Коды маркировки: ' + D.codes, 'Лучшее время: ' + mmss(D.best.time), 'Рекорд сбоев: ' + D.best.kills, 'Побед: ' + D.wins + ' · смен: ' + D.runs];
      panel('mip', W - 640, 340, 540, 300, 0.85); L.sprite('code_tex', W - 610, 372, { w: 44, h: 44 });
      rows.forEach((r, i) => label('mi' + i, r, i ? W - 610 : W - 554, 394 + i * 66, { size: 30, col: i ? '#e6fdff' : '#7ff6ff' }));
      L.uiBox('mhelp', 90, 930, 900, 60, 8); label('mhelp', '↑↓ или мышь — выбор · Enter — подтвердить · WASD — ходить в смене', 110, 960, { size: 24, col: '#7f9ea6' });
      return; }
    L.solid(0, 0, W, H, [0.01, 0.02, 0.04], 0, 0, 0, 0.8);
    if (V.scr === 'shop') { head('МАГАЗИН УЛУЧШЕНИЙ', 'Постоянные улучшения за коды маркировки, действуют в каждой смене'); wallet();
      it.forEach((o, i) => { const [x, y, w, h] = o.r, on = hot(i);
        if (o.id === 'reset') { L.uiBox('ms' + i, x, y, w, h, 10); frame(x, y, w, h, 0.9, on ? CORAL : [0.35, 0.5, 0.55]);
          label('ms' + i + 'n', 'Сбросить улучшения', x + w / 2, y + 50, { size: 28, al: 0.5, col: '#ffd6cf' });
          label('ms' + i + 'd', V.armedReset ? 'Нажмите ещё раз' : 'Вернёт ' + V.spent + ' кодов', x + w / 2, y + 100, { size: 24, al: 0.5, col: V.armedReset ? '#ff8f85' : '#a9c9cf' }); return; }
        const u = o.u, lv = V.lvl(u.id), lock = V.locked(u), mx = lv >= u.max, cost = V.price(u), can = !lock && !mx && D.codes >= cost;
        L.uiBox('ms' + i, x, y, w, h, 10); frame(x, y, w, h, 0.9, on ? MINT : CYAN);
        if (on) { G.blend('add'); L.glow(x + w / 2, y + h / 2, w * 0.45, MINT, 0.14, 2); G.blend(); }
        L.sprite(icn(u.ic), x + 16, y + 24, { w: 88, h: 88, u: { grade: [lock ? 0.2 : 1, lock ? 0.4 : 1, 0, 1] } });
        label('ms' + i + 'n', u.name, x + 120, y + 34, { size: 25, col: lock ? '#6f8a90' : '#e6fdff' });
        wrap(u.desc, 20, w - 136).slice(0, 2).forEach((ln, j) => label('ms' + i + 'd' + j, ln, x + 120, y + 74 + j * 26, { size: 20, col: '#a9c9cf' }));
        for (let j = 0; j < u.max; j++) L.rrect(x + 120 + j * 24, y + h - 34, 18, 12, 4, j < lv ? MINT : [0.12, 0.2, 0.24]);
        label('ms' + i + 'p', lock ? 'после первой победы' : mx ? 'МАКС' : cost + ' кодов', x + w - 16, y + h - 28, { size: 22, al: 1, col: lock ? '#6f8a90' : mx ? '#64ffda' : can ? '#7ff6ff' : '#ff8f85' }); });
      backBtn(); return; }
    if (V.scr === 'coll') { const seenN = (kind) => it.filter((o) => o.kind === kind && D.seen[kind][o.k]).length, cnt = (kind) => it.filter((o) => o.kind === kind).length;
      head('КОЛЛЕКЦИЯ', 'Оружие, эволюции и навыки, встреченные в сменах');
      [['w', 'Оружие'], ['e', 'Эволюции'], ['p', 'Навыки']].forEach(([kind, nm], r) => { const y = 230 + r * 190 - 44; L.uiBox('mcr' + r, 120, y - 20, 420, 40, 4);
        label('mcr' + r, nm + ' ' + seenN(kind) + '/' + cnt(kind), 140, y, { size: 26, col: '#7ff6ff' }); });
      it.forEach((o, i) => { const [x, y, w, h] = o.r, seen = !!D.seen[o.kind][o.k], def = o.kind === 'p' ? SIM.PASS[o.k] : SIM.WEAP[o.k];
        L.uiBox('mc' + i, x, y, w, h, 4); frame(x, y, w, h, 0.9, hot(i) ? MINT : o.kind === 'e' ? [0.4, 0.8, 0.75] : CYAN);
        L.sprite(icn(def.ic), x + 10, y + 10, { w: w - 20, h: h - 20, u: { grade: [seen ? 1 : 0, seen ? 1 : 0.12, 0, 1] } });
        if (!seen) label('mcq' + i, '?', x + w / 2, y + h / 2, { size: 40, al: 0.5, col: '#5f7f88' }); });
      const o = it[V.sel]; if (o) { const seen = !!D.seen[o.kind][o.k], def = o.kind === 'p' ? SIM.PASS[o.k] : SIM.WEAP[o.k];
        const desc = !seen ? (o.kind === 'e' ? 'Эволюция ещё не встречалась' : 'Ещё не встречалось') : o.kind === 'p' ? def.desc : SIM.WSUM[o.k];
        const from = o.kind === 'e' ? Object.keys(SIM.EVO).find((b) => SIM.EVO[b][1] === o.k) : null;
        const rec = from ? (seen ? 'Рецепт: ' + SIM.WEAP[from].name + ' (ур. 6) + ' + SIM.PASS[SIM.EVO[from][0]].name : 'Рецепт: ???') : o.kind === 'w' && SIM.EVO[o.k] && D.seen.e[SIM.EVO[o.k][1]] ? 'Эволюция: ' + SIM.WEAP[SIM.EVO[o.k][1]].name : '';
        panel('mcd', 260, 790, W - 520, 170, 0.85); label('mcdn', seen ? def.name : '???', 290, 830, { size: 32, col: '#e6fdff' });
        label('mcdd', desc, 290, 876, { size: 24, col: '#a9c9cf' }); if (rec) label('mcdr', rec, 290, 918, { size: 24, col: '#64ffda' }); }
      backBtn(); return; }
    if (V.scr === 'rec') { head('РЕКОРДЫ');
      const rows = [['Лучшее время смены', mmss(D.best.time)], ['Больше всего сбоев за смену', D.best.kills], ['Лучший уровень', D.best.lvl], ['Побед', D.wins], ['Смен сыграно', D.runs],
        ['Сбоев устранено всего', D.kills], ['Время в сменах', mmss(D.time)], ['Коды маркировки', D.codes]];
      panel('mrp', W / 2 - 520, 230, 1040, rows.length * 72 + 60, 0.85);
      rows.forEach(([k, v], i) => { label('mrk' + i, k, W / 2 - 480, 290 + i * 72, { size: 30, col: '#a9c9cf' }); label('mrv' + i, String(v), W / 2 + 480, 290 + i * 72, { size: 30, al: 1, col: '#e6fdff' }); });
      backBtn(); return; }
  }""")
open(p, 'w', encoding='utf-8').write(s); print('scene patched')
