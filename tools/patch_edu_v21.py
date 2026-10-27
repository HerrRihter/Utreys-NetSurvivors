# Round 21 (plan stage 3: map select, the training centre with both courses, as in utreys-survivors): the scene draws the maze
# rooms (code-drawn partition walls, Y-sorted in ground strips), the terminals (floor circle, status, label), the door, the test
# screens (intro, question, feedback, result; the revival test), the maze HUD (room, terminals, learning points, the open door's
# marker, the E hint), the training centre's report card on the results, and the map and course select screens with minimaps.
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
def patch(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:90], s.count(a)); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

patch('live/scene.js', [
    # floor uniforms: a level with fewer than five zones (the training rooms) clears the rest; the floor accent follows the room
    ("""  const ZU = {}, zoneU = () => { SIM.ZONES.forEach((z, i) => { ZU['u_z' + i] = [z.x0, z.y0, z.x1, z.y1]; ZU['u_c' + i] = z.col; }); ZU.u_pc = SIM.PLAZA.col;
    ZU.u_pat = SIM.ZONES.slice(0, 4).map((z) => z.pat); ZU.u_pat4 = SIM.ZONES[4].pat; }; zoneU(); let levelSeen = SIM.LEVEL_ID;
  const zcol = (x, y) => (SIM.zoneAt(x, y) || SIM.PLAZA).col;""",
     """  const floorCol = () => SIM.LEVEL.col || SIM.PLAZA.col;
  const ZU = {}, zoneU = () => { for (let i = 0; i < 5; i++) { const z = SIM.ZONES[i]; ZU['u_z' + i] = z ? [z.x0, z.y0, z.x1, z.y1] : [-9e4, -9e4, -9e4, -9e4]; ZU['u_c' + i] = z ? z.col : floorCol(); }
    ZU.u_pc = floorCol(); ZU.u_pat = [0, 1, 2, 3].map((i) => (SIM.ZONES[i] ? SIM.ZONES[i].pat : 0)); ZU.u_pat4 = SIM.ZONES[4] ? SIM.ZONES[4].pat : 0; }; zoneU(); let levelSeen = SIM.LEVEL_ID;
  const zcol = (x, y) => { const z = SIM.zoneAt(x, y); return z ? z.col : floorCol(); };"""),
    # ground: terminal circles, the door's plate, wall contact shadows
    ("    for (const pu of ST.PU || []) {",
     """    if (ST.ed && SIM.LEVEL.TERMS) { const LV = SIM.LEVEL, R = SIM.TERM_R;
      LV.TERMS.forEach((tm, i) => { const n = ST.nodes[i]; if (!n || !onS(tm.cx, tm.cy, R + 100)) return; const X = sx(tm.cx), Y = sy(tm.cy), pu = 0.5 + 0.5 * Math.sin(t * 2.2 + i);
        if (n.st === 2) { pool(X, Y, R, R * 0.62, MINT, 0.18, 1.2); L.ring(X, Y, R, R * 0.62, MINT, 0.85, 0.03); return; }
        const c = n.st === 1 ? (ST.t < n.retry ? CORAL : CYAN) : floorCol(); L.ring(X, Y, R, R * 0.62, c, 0.5 + 0.3 * pu, 0.025); L.ring(X, Y, R * 0.93, R * 0.93 * 0.62, c, 0.22, 0.012);
        if (n.st === 1) { const u = SIM.TERM_USE; pool(sx(tm.x), sy(tm.y), u * 0.8, u * 0.5, c, 0.16 + 0.1 * pu, 1.6); }
        if (!n.st && n.hold > 0) { const q = clamp01(n.hold / SIM.HOLD_T); pool(X, Y, R * q, R * 0.62 * q, c, 0.3, 1.4); L.ring(X, Y, R * q, R * 0.62 * q, [1, 1, 1], 0.7, 0.04); } });
      if (LV.EXIT && onS(LV.EXIT[0], LV.EXIT[1], 500)) { const op = SIM.doorOpen(ST), c = op ? MINT : CORAL, X = sx(LV.EXIT[0]), Y = sy(LV.EXIT[1]), pu = 0.5 + 0.5 * Math.sin(t * 3);
        L.solid(X - 170, Y - 70, 340, 140, [0.02, 0.04, 0.05], 0, 0, 0, 0.85); L.ring(X, Y, 190, 110, c, 0.6 + 0.3 * pu, 0.03); pool(X, Y, 200, 120, c, op ? 0.35 : 0.12, 1.4);
        if (op) for (let j = 0; j < 3; j++) { const q = ((t * 0.8 + j / 3) % 1); L.ring(X, Y, 190 * (1 - q), 110 * (1 - q), MINT, 0.7 * q, 0.04); } } }
    for (const pu of ST.PU || []) {"""),
    ("    ST.tk.forEach((o, i) => { const [x, y] = SIM.TANKS[i]; if (o.hp > 0 && onS(x, y)) SH(sx(x) + 6, sy(y), 30, 11, 0.5); });",
     """    ST.tk.forEach((o, i) => { const [x, y] = SIM.TANKS[i]; if (o.hp > 0 && onS(x, y)) SH(sx(x) + 6, sy(y), 30, 11, 0.5); });
    for (const w of SIM.LEVEL.WALLS || []) { if (!onS(w.x + w.w / 2, w.y + w.h / 2, Math.max(w.w, w.h) / 2 + 200)) continue;            // the walls' shadows fall right-down
      L.solid(sx(w.x) + 14, sy(w.y + w.h) - 4, w.w + 40, 34, [0, 0, 0], 0, 0, 0, 0.42); L.solid(sx(w.x + w.w), sy(w.y) + 10, 36, w.h, [0, 0, 0], 0, 0, 0, 0.32); }"""),
    # Y band: maze walls (horizontal ones whole, vertical ones in 80 px strips so actors beside them sort right) and the door's frame
    ("    // foes\n    for (const e of ST.E) {",
     """    for (const w of SIM.LEVEL.WALLS || []) { if (!onS(w.x + w.w / 2, w.y + w.h / 2, Math.max(w.w, w.h) / 2 + 300)) continue; const zc = floorCol();
      if (w.hor) { Yb.push([w.y + w.h, () => wallSeg(w.x, w.y, w.w, w.h, true, true, sx, sy, zc, t)]); continue; }
      const n = Math.max(1, Math.ceil(w.h / 80)), s = w.h / n; for (let j = 0; j < n; j++) { const y0 = w.y + j * s; if (!onS(w.x, y0, 320)) continue; Yb.push([y0 + s, () => wallSeg(w.x, y0, w.w, s, j === n - 1, j === 0, sx, sy, zc, t)]); } }
    if (ST.ed && SIM.LEVEL.EXIT && onS(SIM.LEVEL.EXIT[0], SIM.LEVEL.EXIT[1], 500)) { const [ex, ey] = SIM.LEVEL.EXIT; Yb.push([ey + 20, () => doorFrame(ex, ey, SIM.doorOpen(ST), sx, sy, t)]); }
    // foes
    for (const e of ST.E) {"""),
    # data rain only where the NOC zone exists
    ("    const z = SIM.ZONES[3]; if (onS(", "    const z = SIM.ZONES[3]; if (z && onS("),
    # helpers before the HUD
    ("  // ---------------- HUD ----------------\n",
     """  // ---------------- the training centre ----------------
  // a maze wall: the floor rectangle lifted by WALL_H is its top face; a strip whose south edge is the wall's also shows the front face
  const WALL_H = 120;
  function wallSeg(x, y, w, h, front, cap, sx, sy, zc, t) { const X = sx(x), Y = sy(y), top = Y - WALL_H, rim = L.lerpP(zc, [1, 1, 1], 0.35);
    L.solid(X, top, w, h + 0.8, [0.075, 0.105, 0.13], 0, 0, 0, 1);
    if (w > h) { L.solid(X, top, w, 2, rim, 0, 0, 0, 0.55); L.solid(X, top + h / 2 - 1.5, w, 3, zc, 0, 0, 0, 0.28); }
    else { L.solid(X, top, 2, h + 0.8, rim, 0, 0, 0, 0.45); L.solid(X + w - 2, top, 2, h + 0.8, rim, 0, 0, 0, 0.3); L.solid(X + w / 2 - 1.5, top, 3, h + 0.8, zc, 0, 0, 0, 0.28); if (cap) L.solid(X, top, w, 2, rim, 0, 0, 0, 0.55); }
    if (!front) return; const fy = Y + h - WALL_H;
    L.solid(X, fy, w, WALL_H, [0.028, 0.045, 0.06], 0, 0, 0, 1); L.solid(X, fy, w, 3, rim, 0, 0, 0, 0.6);
    for (let k = 60; k < w - 20; k += 120) L.solid(X + k, fy + 18, 2, WALL_H - 30, [0.06, 0.09, 0.11], 0, 0, 0, 1);         // panel seams
    G.blend('add'); L.solid(X + 4, fy + 14, w - 8, 3, zc, 0, 0, 0, 0.75);
    for (let k = 40 + ((x * 7) % 90); k < w - 30; k += 230) { const on = 0.5 + 0.5 * Math.sin(t * 3 + x * 0.01 + k); L.glow(X + k, fy + 15, 18, zc, 0.5 * on, 3); }
    G.blend(); L.solid(X, Y + h - 12, w, 12, [0.012, 0.018, 0.024], 0, 0, 0, 1); }
  // the door between rooms: a gate frame, shut (coral, no way through yet) or open (mint, chevrons)
  function doorFrame(x, y, open, sx, sy, t) { const X = sx(x), Y = sy(y), c = open ? MINT : CORAL, hgt = 230, hw = 150;
    for (const s of [-1, 1]) { L.solid(X + s * hw - 14, Y - hgt, 28, hgt, [0.04, 0.06, 0.08], 0, 0, 0, 1); G.blend('add'); L.solid(X + s * hw - 3, Y - hgt + 10, 6, hgt - 20, c, 0, 0, 0, 0.9); L.glow(X + s * hw, Y - hgt / 2, 60, c, 0.35, 2); G.blend(); }
    L.solid(X - hw - 14, Y - hgt - 26, 2 * hw + 28, 30, [0.04, 0.06, 0.08], 0, 0, 0, 1); G.blend('add'); L.solid(X - hw, Y - hgt - 14, 2 * hw, 5, c, 0, 0, 0, 0.9);
    if (open) for (let j = 0; j < 3; j++) { const q = (t * 1.2 + j / 3) % 1; L.solid(X - 40, Y - 60 - q * 140, 80, 6, MINT, 0, 0, 0, 0.8 * (1 - q)); }
    else for (let j = 0; j < 7; j++) L.solid(X - hw + 10, Y - hgt + 20 + j * 30, 2 * hw - 20, 3, CORAL, 0, 0, 0, 0.18 + 0.1 * Math.sin(t * 5 + j));
    G.blend(); }
  // world labels over the terminals and the door, and the E hint
  function eduLabels(ST, GT, t, sx, sy) { const LV = SIM.LEVEL; if (!ST.ed || !LV.TERMS) return;
    LV.TERMS.forEach((tm, i) => { const n = ST.nodes[i]; if (!n) return; const X = sx(tm.x), Y = sy(tm.y) - 300; if (X < -200 || X > W + 200 || Y < -100 || Y > H + 200) return;
      const lock = Math.max(0, n.retry - ST.t), st = n.st === 2 ? 'пройден' : n.st === 1 ? (lock > 0 ? 'закрыт · ' + Math.ceil(lock) + ' с' : 'тест открыт · E') : 'под охраной бага', c = n.st === 2 ? '#64ffda' : n.st === 1 ? (lock > 0 ? '#ff8f85' : '#7ff6ff') : '#ffd6cf';
      label('tml' + i, 'ТЕРМИНАЛ ' + (i + 1), X, Y, { size: 26, al: 0.5, col: '#e6fdff' }); label('tms' + i, st, X, Y + 32, { size: 21, al: 0.5, col: c }); });
    if (LV.EXIT) { const X = sx(LV.EXIT[0]), Y = sy(LV.EXIT[1]) - 300, op = SIM.doorOpen(ST), left = ST.nodes.filter((n) => n.st !== 2).length;
      if (X > -200 && X < W + 200 && Y > -100 && Y < H + 200) { label('drl', op ? 'ДВЕРЬ →' : 'ЗАКРЫТО', X, Y, { size: 28, al: 0.5, col: op ? '#64ffda' : '#ff8f85' }); label('drs', op ? 'подойди и нажми E' : 'осталось терминалов: ' + left, X, Y + 32, { size: 21, al: 0.5, col: op ? '#c8fff0' : '#ffd6cf' }); } }
    const u = SIM.nearUse(ST); if (u && !ST.pick && !ST.over) { const s = u.k === 'door' ? (u.open ? 'E — войти в следующий зал' : 'Дверь закрыта: пройди все терминалы') : u.lock > 0 ? 'Терминал закрыт: ещё ' + Math.ceil(u.lock) + ' с' : 'E — пройти тест';
      const w = L.labelW('ehint', s, { size: 30 }), y = H - 170; panel('ehintp', W / 2 - w / 2 - 26, y - 28, w + 52, 56, 0.85); label('ehint', s, W / 2, y, { size: 30, al: 0.5, col: u.lock > 0 || (u.k === 'door' && !u.open) ? '#ffd6cf' : '#64ffda' }); } }
  // the test screen (sim: quizStep): intro → question → feedback → … → result; the game stands still underneath
  function quiz(ST, GT, t) { const ed = ST.ed, a = ed.active, C = EDU.course(ed.course), ER = EDU.R, rev = a.reason === 'revive';
    L.solid(0, 0, W, H, [0.01, 0.02, 0.04], 0, 0, 0, 0.84); const px0 = 220, py0 = 110, pw = W - 440, ph = 920, hov = (r) => ST.px >= r[0] && ST.px <= r[0] + r[2] && ST.py >= r[1] && ST.py <= r[1] + r[3];
    L.uiBox('qzp', px0, py0, pw, ph, 12); frame(px0, py0, pw, ph, 0.95, rev ? CORAL : CYAN);
    const topic = a.topic !== null ? C.topics[a.topic] : null, head = rev ? 'ТЕСТ ВОЗРОЖДЕНИЯ · ' + C.title : 'ТЕРМИНАЛ ' + (a.node + 1) + ' · ' + C.title;
    label('qzh', head, px0 + 40, py0 + 46, { size: 28, col: rev ? '#ff8f85' : '#7ff6ff' });
    a.questions.forEach((q, i) => { const rec = i < a.index || (i === a.index && a.phase !== 'question' && a.phase !== 'intro') ? 1 : 0, cur = i === a.index && a.phase !== 'intro' && a.phase !== 'result';
      const c = !rec ? (cur ? CYAN : [0.12, 0.2, 0.24]) : MINT; L.rrect(px0 + pw - 60 - (a.questions.length - i) * 44, py0 + 30, 34, 34, 8, c, c, rec || cur ? 0.9 : 1); });
    const btn = (s, on) => { const r = SIM.QUIZ_BTN, h = hov(r); L.uiBox('qzb', r[0], r[1], r[2], r[3], 8); frame(r[0], r[1], r[2], r[3], on ? 0.95 : 0.6, on ? (h ? [0.6, 1, 1] : CYAN) : [0.13, 0.33, 0.39]);
      if (on && h) L.rrect(r[0], r[1], r[2], r[3], 4, [0.0, 0.45, 0.55], [0.0, 0.3, 0.38], 0.3); label('qzbt', s, r[0] + r[2] / 2, r[1] + r[3] / 2, { size: 30, al: 0.5, col: on ? '#ffffff' : '#6f8a90' }); };
    const para = (id, s, x, y, size, maxW, col, lh, max = 8) => { const ls = wrap(s, size, maxW).slice(0, max); ls.forEach((ln, j) => label(id + j, ln, x, y + j * lh, { size, col })); return ls.length * lh; };
    if (a.phase === 'intro') { let y = py0 + 140;
      label('qzt', rev ? 'Вторая жизнь' : topic.name, px0 + 60, y, { size: 46, col: '#ffffff' }); y += 70;
      if (topic) y += para('qzn', topic.note, px0 + 60, y, 26, pw - 120, '#a9c9cf', 36) + 30;
      const rules = rev ? ['Ответь верно на ' + ER.passing + ' из ' + ER.questions + ' — вернёшься в бой с ' + Math.round(ER.reviveHealth * 100) + '% здоровья и ' + ER.reviveInvulnerability + ' с неуязвимости.', 'Не сдашь — смена закончится. Возрождение одно на смену.']
        : [ER.questions + ' вопроса, нужно ' + ER.passing + ' верных. Игра стоит, пока идёт тест.', 'Сдал: терминал пройден, награда (' + ER.questions + ' верных — капсула и лечение, ' + ER.passing + ' — лечение).', 'Не сдал: терминал закрыт на ' + ER.failLock + ' с, волны усилены. Каждая ошибка зовёт аудит.'];
      rules.forEach((r, j) => { L.rrect(px0 + 60, y + j * 54 - 6, 12, 12, 3, rev ? CORAL : CYAN); label('qzr' + j, r, px0 + 90, y + j * 54, { size: 26, col: '#e6fdff' }); });
      btn('Начать · Enter', true); return; }
    if (a.phase === 'result') { const ok = a.passed; label('qzt', ok ? 'ТЕСТ СДАН' : 'ТЕСТ НЕ СДАН', W / 2, py0 + 220, { size: 72, al: 0.5, col: ok ? '#64ffda' : '#ff6559' });
      label('qzc', 'Верных ответов: ' + a.correct + ' из ' + a.questions.length, W / 2, py0 + 320, { size: 34, al: 0.5, col: '#e6fdff' });
      const wrong = a.answered - a.correct, lines = rev ? [ok ? 'Возвращаешься в бой с ' + Math.round(ER.reviveHealth * 100) + '% здоровья.' : 'Смена окончена.']
        : (ok ? [a.correct >= ER.questions ? 'Награда: капсула обновления и лечение у терминала.' : 'Награда: лечение у терминала.'] : ['Терминал закрыт на ' + ER.failLock + ' с, волны усилены на ' + ER.surge.seconds + ' с.'])
          .concat(wrong > 0 ? ['Аудит: ' + Math.min(ER.auditMax, wrong) * ER.auditPack + ' врагов идут на проверку.'] : []);
      lines.forEach((s, j) => label('qzl' + j, s, W / 2, py0 + 410 + j * 50, { size: 28, al: 0.5, col: j === 0 ? (ok ? '#c8fff0' : '#ffd6cf') : '#ffd6cf' }));
      label('qzp2', 'Очки обучения: ' + ed.points, W / 2, py0 + 560, { size: 30, al: 0.5, col: '#7ff6ff' });
      btn(rev && !ok ? 'К итогам · Enter' : 'Продолжить · Enter', true); return; }
    const item = a.questions[a.index], q = EDU.question(ed, item.id), opt = (id) => q.options.find((o) => o.id === id).text;
    label('qzi', 'Вопрос ' + (a.index + 1) + ' из ' + a.questions.length + (q.type === 'multiple' ? ' · несколько верных ответов' : ''), px0 + 60, py0 + 100, { size: 24, col: q.type === 'multiple' ? '#ffd600' : '#7f9ea6' });
    para('qzq', q.text, px0 + 60, py0 + 148, 30, pw - 120, '#ffffff', 40, 4);
    if (a.phase === 'question') { const n = item.options.length, fs = n > 4 ? 21 : 24;
      item.options.forEach((id, i) => { const r = SIM.quizOpt(i, n), sel = a.selected.includes(id), h = hov(r);
        L.uiBox('qzo' + i, r[0], r[1], r[2], r[3], 6); frame(r[0], r[1], r[2], r[3], sel ? 0.95 : 0.8, sel ? CYAN : h ? [0.3, 0.6, 0.66] : [0.13, 0.33, 0.39]);
        if (sel) L.rrect(r[0], r[1], r[2], r[3], 4, [0.0, 0.45, 0.55], [0.0, 0.3, 0.38], 0.3);
        L.rrect(r[0] + 16, r[1] + r[3] / 2 - 22, 44, 44, q.type === 'multiple' ? 6 : 22, sel ? CYAN : [0.08, 0.16, 0.2]); label('qzk' + i, String(i + 1), r[0] + 38, r[1] + r[3] / 2, { size: 24, al: 0.5, col: sel ? '#02090d' : '#7ff6ff' });
        const ls = wrap(opt(id), fs, r[2] - 110).slice(0, Math.max(1, Math.floor((r[3] - 10) / (fs + 6)))), lh = fs + 6, y0 = r[1] + r[3] / 2 - (ls.length - 1) * lh / 2;
        ls.forEach((ln, j) => label('qzo' + i + '_' + j, ln, r[0] + 80, y0 + j * lh, { size: fs, col: sel ? '#ffffff' : '#cfe9ee' })); });
      btn(a.selected.length ? 'Ответить · Enter' : 'Выберите ответ · 1–' + n, !!a.selected.length); return; }
    // feedback: the verdict, what was picked, the key and the explanation
    const ok = a.lastCorrect; let y = py0 + 330; label('qzv', ok ? 'ВЕРНО' : 'НЕВЕРНО', px0 + 60, y, { size: 52, col: ok ? '#64ffda' : '#ff6559' }); y += 64;
    if (!ok) { label('qzyh', 'Ваш ответ:', px0 + 60, y, { size: 24, col: '#ff8f85' }); y += 34; a.selected.forEach((id, j) => { y += para('qzy' + j + '_', '— ' + opt(id), px0 + 80, y, 23, pw - 160, '#ffd6cf', 30, 2); }); y += 10; }
    label('qzch', ok ? 'Ответ:' : 'Верно:', px0 + 60, y, { size: 24, col: '#64ffda' }); y += 34; q.correct.forEach((id, j) => { y += para('qzc' + j + '_', '— ' + opt(id), px0 + 80, y, 23, pw - 160, '#c8fff0', 30, 2); }); y += 14;
    if (q.explanation) para('qze', q.explanation, px0 + 60, y, 24, pw - 120, '#a9c9cf', 33, 4);
    btn(a.index + 1 < a.questions.length ? 'Следующий вопрос · Enter' : 'Итог теста · Enter', true); }
  // a minimap of a map's generated layout (map select): zones and solids for the data centre, walls, terminals and the door for the training centre
  const MINI = {}; function minimap(map, x, y, w, h) { const LV = MINI[map] || (MINI[map] = SIM.buildLevel(map, 7, 0)), k = Math.min(w / 8000, h / 6000), ox = x + (w - 8000 * k) / 2, oy = y + (h - 6000 * k) / 2;
    L.rrect(ox - 6, oy - 6, 8000 * k + 12, 6000 * k + 12, 6, [0.02, 0.05, 0.07], [0.01, 0.03, 0.05]);
    for (const z of LV.ZONES) { L.solid(ox + z.x0 * k, oy + z.y0 * k, (z.x1 - z.x0) * k, (z.y1 - z.y0) * k, z.col, 0, 0, 0, 0.12); G.blend('add'); L.glow(ox + z.nx * k, oy + z.ny * k, 26, z.col, 0.6, 2); G.blend(); }
    for (const b of LV.BOXES) { if (b.tank) continue; L.solid(ox + (b.x - b.hw) * k, oy + (b.y - b.hh) * k, Math.max(1.5, b.hw * 2 * k), Math.max(1.5, b.hh * 2 * k), b.k === 'wall' ? (LV.col || CYAN) : [0.35, 0.55, 0.62], 0, 0, 0, b.k === 'wall' ? 0.85 : 0.7); }
    for (const tm of LV.TERMS || []) { G.blend('add'); L.glow(ox + tm.cx * k, oy + tm.cy * k, 20, [1, 0.84, 0.3], 0.9, 2); G.blend(); }
    if (LV.EXIT) { G.blend('add'); L.glow(ox + LV.EXIT[0] * k, oy + LV.EXIT[1] * k, 22, MINT, 0.9, 2); G.blend(); }
    const st = LV.START || SIM.SPAWN; L.rrect(ox + st[0] * k - 5, oy + st[1] * k - 5, 10, 10, 5, [1, 1, 1]); }

  // ---------------- HUD ----------------
"""),
    # HUD: the maze's counter instead of the components' one, labels, the test screen
    ("    if (ST.nodes) { let best = -1, bd = 1e9; ST.nodes.forEach(",
     """    if (ST.ed) { const C = EDU.course(ST.ed.course), LV = SIM.LEVEL, maze = !!LV.TERMS.length, done = ST.nodes.filter((n) => n.st === 2).length, op = SIM.doorOpen(ST);
      const l1 = maze ? 'РАЗДЕЛ ' + (ST.room + 1) + '/' + C.rooms.length + ' · ' + C.rooms[ST.room] : 'ЦЕНТРАЛЬНЫЙ ЗАЛ · БОСС КУРСА', l2 = maze ? (op ? 'ДВЕРЬ ОТКРЫТА' : 'ТЕРМИНАЛЫ ' + done + '/' + ST.nodes.length) + ' · ОЧКИ ' + ST.ed.points : 'ОЧКИ ОБУЧЕНИЯ ' + ST.ed.points;
      [l1, l2].forEach((s, j) => { const cw = L.labelW('edu' + j, s, { size: 24, font: MONO }), cyy = 152 + j * 50; panel('edup' + j, W - cw - 76, cyy - 22, cw + 36, 44, 0.75); label('edu' + j, s, W - 58, cyy, { size: 24, al: 1, col: j ? '#64ffda' : '#7ff6ff' }); });
      if (op) { const ex = sx0(LV.EXIT[0]), ey = sy0(LV.EXIT[1]), ang = Math.atan2(LV.EXIT[1] - ST.y, LV.EXIT[0] - ST.x), mx = Math.max(60, Math.min(W - 60, ex)), my = Math.max(150, Math.min(H - 150, ey));   // only the open door is pointed at
        if (ex < 0 || ex > W || ey < 0 || ey > H) { G.blend('add'); L.glow(mx, my, 40, MINT, 0.9, 3); G.blend(); L.solid(mx, my, 34, 10, MINT, ang, 0, 5, 0.95); L.solid(mx, my, 20, 10, [1, 1, 1], ang, -10, 5, 0.9); label('edudr', 'ДВЕРЬ', mx, my + 40, { size: 20, al: 0.5, col: '#64ffda' }); } }
      eduLabels(ST, GT, t, sx0, sy0); }
    else if (ST.nodes) { let best = -1, bd = 1e9; ST.nodes.forEach("""),
    ("    if (S.state && !ST.pick && !ST.over) { const px = ST.px, py = ST.py; G.blend('add');", "    if (S.state && !ST.pick && !ST.over && !(ST.ed && ST.ed.active)) { const px = ST.px, py = ST.py; G.blend('add');"),
    ("    // level-up controls bought in the shop\n", "    if (ST.ed && ST.ed.active && !ST.over) quiz(ST, GT, t);\n    // level-up controls bought in the shop\n"),
    # results: the training centre's title and report card
    ("""      const win = ST.over.k === 'win', title = win ? 'ИНЦИДЕНТ ЗАКРЫТ' : 'СИСТЕМА УПАЛА', lines = ['Время смены: ' + mmss(ST.over.t), 'Уровень: ' + ST.lvl, 'Сбоев устранено: ' + ST.kills, 'Кодов маркировки: ' + ST.bars];
      const pw = 760, ph = 640, px0 = W / 2 - pw / 2, py0 = H / 2 - ph / 2;""",
     """      const lb0 = window.META && META.last && META.last.over === ST.over ? META.last : null, ed = ST.ed ? (lb0 && lb0.edu) || EDU.summary(ST.ed) : null;
      const win = ST.over.k === 'win', title = win ? (ST.ed ? EDU.course(ST.ed.course).victoryTag : 'ИНЦИДЕНТ ЗАКРЫТ') : 'СИСТЕМА УПАЛА', lines = ['Время смены: ' + mmss(ST.over.t), 'Уровень: ' + ST.lvl, 'Сбоев устранено: ' + ST.kills, 'Кодов маркировки: ' + ST.bars];
      const pw = ed ? 1320 : 760, ph = ed ? 760 : 640, px0 = W / 2 - pw / 2, py0 = H / 2 - ph / 2;"""),
    ("      lines.forEach((s, i) => label('resl' + i, s, W / 2, py0 + 180 + i * 56, { size: 32, al: 0.5, col: '#e6fdff', a }));\n      const lb = window.META && META.last && META.last.over === ST.over ? META.last : null;\n      if (lb) {",
     """      const lx = ed ? px0 + 330 : W / 2; lines.forEach((s, i) => label('resl' + i, s, lx, py0 + 180 + i * 56, { size: 32, al: 0.5, col: '#e6fdff', a }));
      if (ed) { const ex0 = px0 + 660; label('resg', 'Оценка: ' + ed.grade + (ed.answered ? ' · ' + Math.round(ed.score * 100) + '%' : ''), ex0, py0 + 180, { size: 36, col: ed.score >= 0.75 ? '#64ffda' : ed.answered ? '#ffd600' : '#ff8f85', a });
        [ed.course, 'Очки обучения: ' + ed.points + (ed.newBest ? ' · лучший результат курса' : ''), 'Вопросов: ' + ed.answered + ' · с первой попытки: ' + ed.firstCorrect + ' · повторов: ' + ed.retries, 'Пройдено разделов: ' + Math.min(ST.room, 3) + ' из 3' + (ed.reviveUsed ? ' · вторая жизнь использована' : '')]
          .forEach((s, i) => label('rese' + i, s, ex0, py0 + 236 + i * 44, { size: 24, col: i ? '#cfe9ee' : '#7ff6ff', a }));
        ed.topics.forEach((tp, i) => { const yy = py0 + 430 + i * 50; label('rest' + i, tp.name, ex0, yy, { size: 24, col: '#a9c9cf', a }); const bw = 200, bx = ex0 + 400;
          L.rrect(bx, yy - 10, bw, 20, 6, [0.08, 0.14, 0.18]); if (tp.asked) L.rrect(bx, yy - 10, Math.max(8, bw * tp.score), 20, 6, tp.score >= 0.75 ? MINT : [1, 0.84, 0.2]);
          label('resn' + i, tp.asked ? Math.round(tp.score * 100) + '%' : '—', bx + bw + 16, yy, { size: 22, col: '#e6fdff', a }); }); }
      const lb = lb0;
      if (lb) {"""),
    ("        ex.forEach((s2, i) => label('resx' + i, s2, W / 2, py0 + 196 + lines.length * 56 + i * 48,", "        ex.forEach((s2, i) => label('resx' + i, s2, lx, py0 + 196 + lines.length * 56 + i * 48,"),
    # menu: map and course select
    ("    if (V.scr === 'client') { head('КЛЮЧЕВОЙ КЛИЕНТ БА',",
     """    if (V.scr === 'map') { head('ВЫБОР КАРТЫ', 'Каждая смена строит карту заново: миникарта — пример раскладки');
      it.forEach((o, i) => { const [x, y, w, h] = o.r, on = hot(i), m = o.map, rec = D.byMap[m.id];
        L.uiBox('mmp' + i, x, y, w, h, 10); lit(o.r, on || D.sel.map === m.id); minimap(m.id, x + 30, y + 30, w - 60, 330);
        label('mmpn' + i, m.name, x + 30, y + 400, { size: 36, col: on ? '#ffffff' : '#e6fdff' });
        wrap(m.desc, 22, w - 60).slice(0, 4).forEach((ln, j) => label('mmpd' + i + '_' + j, ln, x + 30, y + 450 + j * 30, { size: 22, col: '#a9c9cf' }));
        wrap(m.note, 20, w - 60).slice(0, 2).forEach((ln, j) => label('mmpe' + i + '_' + j, ln, x + 30, y + 580 + j * 28, { size: 20, col: '#64ffda' }));
        label('mmpr' + i, rec ? 'Смен ' + rec.runs + ' · побед ' + rec.wins + ' · лучшее время ' + mmss(rec.time) : 'Ещё не сыграно', x + 30, y + h - 34, { size: 22, col: '#7ff6ff' }); });
      backBtn(); return; }
    if (V.scr === 'course') { head('УЧЕБНЫЙ ЦЕНТР · ВЫБОР КУРСА', 'Три лабиринта по темам курса, затем зал с боссом курса. Вопросы и ответы — из курса');
      it.forEach((o, i) => { const [x, y, w, h] = o.r, on = hot(i), c = o.course, rec = D.byCourse[o.id], bk = { batch_accounting: 'batch', critical_incident: 'boss' }[c.boss.unit];
        L.uiBox('mco' + i, x, y, w, h, 10); lit(o.r, on || D.sel.course === o.id);
        let ns = 36; while (ns > 24 && L.labelW('mcon' + i, c.title, { size: ns, font: MONO }) > w - 60) ns--; label('mcon' + i, c.title, x + 30, y + 50, { size: ns, col: on ? '#ffffff' : '#e6fdff' });
        wrap(c.description, 22, w - 60).slice(0, 3).forEach((ln, j) => label('mcod' + i + '_' + j, ln, x + 30, y + 100 + j * 30, { size: 22, col: '#a9c9cf' }));
        c.topics.forEach((tp, j) => { L.rrect(x + 30, y + 216 + j * 44, 10, 10, 3, CYAN); label('mcot' + i + '_' + j, (j + 1) + '. ' + tp.name + ' — ' + c.rooms[j], x + 52, y + 222 + j * 44, { size: 21, col: '#e6fdff' }); });
        label('mcob' + i, 'Босс: ' + (bk ? SIM.FOE[bk].name : c.boss.unit) + ' · вопросов: ' + c.questions.filter((q) => q.type !== 'open').length, x + 30, y + 390, { size: 22, col: '#ff8f85' });
        label('mcor' + i, rec ? 'Лучшая оценка: ' + (rec.grade || '—') + (rec.best ? ' (' + Math.round(rec.best * 100) + '%)' : '') + ' · очки ' + rec.points : 'Курс ещё не проходился', x + 30, y + 450, { size: 22, col: '#64ffda' });
        if (rec) label('mcos' + i, 'Смен ' + rec.runs + ' · курс сдан ' + rec.wins, x + 30, y + 490, { size: 22, col: '#7ff6ff' });
        label('mcog' + i, on ? 'Enter — начать' : '', x + w - 30, y + h - 40, { size: 24, al: 1, col: '#64ffda' }); });
      backBtn(); return; }
    if (V.scr === 'client') { head('КЛЮЧЕВОЙ КЛИЕНТ БА',"""),
    ("for (const scr of ['main', 'shop', 'coll', 'rec', 'set', 'hero', 'client']) { META.go(scr, true); menu(0, t); }", "for (const scr of ['main', 'shop', 'coll', 'rec', 'set', 'hero', 'client', 'map', 'course']) { META.go(scr, true); menu(0, t); }"),
    ("if (window.META) for (const scr of ['main', 'shop', 'coll', 'rec', 'set', 'hero', 'client']) {", "if (window.META) for (const scr of ['main', 'shop', 'coll', 'rec', 'set', 'hero', 'client', 'map', 'course']) {"),
])
print('patched')
