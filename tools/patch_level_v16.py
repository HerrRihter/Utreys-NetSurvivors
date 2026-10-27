# Round 16 (plan stage 0): the level is generated per run. buildLevel(map, seed) → a level object; the sim's level names
# (ZONES, PROPS, BOXES, ...) point at the active level; runs carry map + seed; every layout is validated before use.
import os, re
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
p = 'live/sim.js'; s = open(p, encoding='utf-8').read()
def cut(a, b):
    i = s.index(a); j = s.index(b, i) + len(b); return i, j
def rep(a, b, n=1):
    global s
    assert s.count(a) == n, (a[:100], s.count(a)); s = s.replace(a, b)

# legacy pieces reused verbatim inside the builder
def grab(a, b):
    i = s.index(a); j = s.index(b, i) + len(b); return s[i:j]
PLAZA_SRC = grab("  add('core', ...R(170, 262));", "RINGS.push([SPAWN[0], SPAWN[1], 900], [R(170, 262)[0], R(170, 262)[1] - 40, 320]);")
WALLS_SRC = grab("  for (let x = 140; x < WORLD.x1 - 700; x += 900) { row(x, 150, 5);", "add('crac', WORLD.x1 - 110, y, 1); }")
CABLE_SRC = grab("  for (const y of [2800, 3200]) CABLES.push(", "LAMPS.push([Math.round(x), Math.round(y)]); }")

i0, _ = cut("  // ---------------- level data (props with footprints; y = ground contact point) ----------------", "x")
_, i1 = cut("  const FC = 80, FW = Math.ceil(WORLD.x1 / FC), FH = Math.ceil(WORLD.y1 / FC);", "blocked(i * FC + FC / 2, j * FC + FC / 2, 18) ? 1 : 0;")
old = s[i0:i1]
# keep the collision helpers (they read the active level's BOXES / BG)
COLL = grab("  // ---------------- collision and the flow field ----------------", "  const FC = 80, FW = Math.ceil(WORLD.x1 / FC), FH = Math.ceil(WORLD.y1 / FC);")
COLL = COLL.replace("  const BC = 400, BGW = Math.ceil((WORLD.x1 + 1) / BC), BGH = Math.ceil((WORLD.y1 + 1) / BC), BG = [];\n  for (let j = 0; j < BGH; j++) for (let i = 0; i < BGW; i++) BG.push(BOXES.filter((b) => b.x + b.hw + 300 > i * BC && b.x - b.hw - 300 < (i + 1) * BC && b.y + b.hh + 300 > j * BC && b.y - b.hh - 300 < (j + 1) * BC));",
                    "  const BC = 400, BGW = Math.ceil((WORLD.x1 + 1) / BC), BGH = Math.ceil((WORLD.y1 + 1) / BC);")
assert 'BG = []' not in COLL

NEW = """  // ---------------- level: generated per run (MAPS); y = ground contact point ----------------
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
""" + PLAZA_SRC.replace("\n  ", "\n    ").replace("  add('core'", "    add('core'", 1) + """
    // outer walls: rack rows top and bottom, cooling units on the sides
""" + WALLS_SRC.replace("  for (let x", "    for (let x", 1).replace("\n  ", "\n    ") + """
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
    ZONES.forEach((z) => { for (let gy = z.y0 + 300; gy < z.y1 - 150; gy += 290) for (let gx = z.x0 + 300; gx < z.x1 - 150; gx += 330) {
      if (lr() > 0.58) continue; const k = z.kit[Math.floor(lr() * z.kit.length)], x = gx + jit(60), y = gy + jit(40);
      if (clear(x, y, 1000) && offNode(x, y) && !lane(x, y) && fits(k, x, y, 70)) add(k, x, y, lr() > 0.5 ? 1 : 0); } });
    for (const z of ZONES) STENCILS.push({ x: z.nx, y: z.ny + NODE_R * 0.62 + 90, rot: 0, s: z.name, sz: 72 });
    STENCILS.push({ x: 4000, y: 1400, rot: 0.03, s: 'ХОЛОДНЫЙ КОРИДОР', sz: 64 }, { x: 4000, y: 3950, rot: -0.03, s: 'НЕ ПЕРЕЗАГРУЖАТЬ!', sz: 60 });
    // fibre trunks across the floor (packets stream along them in the scene), ceiling light pools
""" + CABLE_SRC.replace("  for (const y", "    for (const y", 1).replace("\n  ", "\n    ") + """
    // two Pepsi service desks on open floor (foes, not solids): picked from candidate spots, clear of props and nodes
    const DESKS = []; for (const [x0, y0] of shuffle([[4000, 1250], [5400, 2940], [2600, 2940], [4000, 4250], [1450, 2950], [6550, 3000]])) { if (DESKS.length >= 2) break;
      const x = Math.round(x0 + jit(80)), y = Math.round(y0 + jit(50)); if (offNode(x, y) && clear(x, y, 700) && fits('desk', x, y, 90)) DESKS.push([x, y]); }
    return { ZONES, PROPS, BOXES, LAMPS, TANKS, STENCILS, CABLES, TAPES, HOLOS, RINGS, DESKS };
  }
  const MAPS = { dc: { name: 'Дата-центр Utrace', build: buildDC } };

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
  function validate(L) { const out = [];
    for (const [k, x, y] of L.PROPS) if (x < 0 || x > WORLD.x1 || y < 0 || y > WORLD.y1) out.push(`prop ${k} outside the world at ${x},${y}`);
    if (L.BOXES.some((b) => inBox(b, SPAWN[0], SPAWN[1], K.R))) out.push('hero spawn is inside a solid');
    for (const [x, y] of L.TANKS) if (L.BOXES.some((b) => !b.tank && Math.abs(x - b.x) < b.hw + 30 && Math.abs(y - FOOT.cell[1] - b.y) < b.hh + 20)) out.push(`energy cell inside a prop at ${x},${y}`);
    for (let i = 0; i < L.BOXES.length; i++) for (let j = i + 1; j < L.BOXES.length; j++) { const a = L.BOXES[i], b = L.BOXES[j];
      if (!a.tank && !b.tank && Math.abs(a.x - b.x) < a.hw + b.hw - 8 && Math.abs(a.y - b.y) < a.hh + b.hh - 8) out.push(`overlapping props ${a.k || 'row'} at ${Math.round(a.x)},${Math.round(a.y)} and ${b.k || 'row'} at ${Math.round(b.x)},${Math.round(b.y)}`); }
    for (const z of L.ZONES) if (L.BOXES.some((b) => !b.tank && Math.hypot(b.x - z.nx, (b.y - z.ny) / 0.62) < NODE_R * 0.75)) out.push(`a solid inside the node circle of ${z.name}`);
    const c0 = Math.floor(SPAWN[1] / FC) * FW + Math.floor(SPAWN[0] / FC), D = new Uint16Array(FW * FH).fill(65535), Q = new Int32Array(FW * FH); let h = 0, tl = 0; D[c0] = 0; Q[tl++] = c0;
    while (h < tl) { const k = Q[h++], i = k % FW, j = (k - i) / FW, d = D[k] + 1;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= FW || b >= FH) continue; const n = b * FW + a; if (L.WALL[n] || D[n] <= d) continue; D[n] = d; Q[tl++] = n; } }
    const reach = (x, y) => D[Math.floor(y / FC) * FW + Math.floor(x / FC)] < 65535;
    let open = 0, cutN = 0; for (let k = 0; k < D.length; k++) if (!L.WALL[k]) { open++; if (D[k] === 65535) cutN++; }
    if (cutN > open * 0.01) out.push(`${cutN} of ${open} open floor cells cannot reach the hero's start`);
    for (const z of L.ZONES) if (!reach(z.nx, z.ny)) out.push(`node ${z.name} unreachable`);
    for (const [x, y] of L.DESKS) if (!reach(x, y)) out.push(`service desk at ${x},${y} unreachable`);
    if (L.DESKS.length < 2) out.push('fewer than 2 service desks placed');
    return out; }
  // build a usable layout for (map, seed): a seed whose layout fails validation falls through to the next one (deterministic)
  const LCACHE = new Map();
  function buildLevel(map, seed) { const key = map + ':' + seed; if (LCACHE.has(key)) return LCACHE.get(key); let L = null;
    for (let k = 0; k < 24; k++) { L = finishLevel(MAPS[map].build(seed + k * 7919)); if (!validate(L).length) break; }
    Object.assign(L, { map, seed }); LCACHE.set(key, L); if (LCACHE.size > 6) LCACHE.delete(LCACHE.keys().next().value); return L; }
  function useLevel(L) { LV = L; ({ ZONES, PROPS, BOXES, LAMPS, TANKS, STENCILS, CABLES, TAPES, HOLOS, RINGS, DESKS, BG, WALL } = L); FLOW = null; FLOWC = -1; LEVEL_ID++; }
  const ensureLevel = (map, seed) => { if (!LV || LV.map !== map || LV.seed !== seed) useLevel(buildLevel(map, seed)); };
  const levelFor = (S) => { if (S && S.map) ensureLevel(S.map, S.lseed); };

""" + COLL.replace("  const blocked = (x, y, r) => BOXES.some((b) => b.dia ? Math.abs(x - b.x) / (b.hw + r) + Math.abs(y - b.y) / (b.hh + r * 0.6) < 1 : Math.abs(x - b.x) < b.hw + r && Math.abs(y - b.y) < b.hh + r * 0.6);",
                   "  const blocked = (x, y, r) => BOXES.some((b) => inBox(b, x, y, r));") + "  const FC = 80, FW = Math.ceil(WORLD.x1 / FC), FH = Math.ceil(WORLD.y1 / FC);"
assert "const blocked = (x, y, r) => BOXES.some((b) => inBox" in NEW
s = s[:i0] + NEW + s[i1:]
# FC/FW/FH and BC… are now defined after the builder functions that use them at call time only (fine); the FLOW cache moves above useLevel
rep("  let FLOW = null, FLOWC = -1;\n  const flowFor", "  const flowFor")
rep("  let LV = null, LEVEL_ID = 0,", "  let FLOW = null, FLOWC = -1;                                    // the flow field cache (reset when the level changes)\n  let LV = null, LEVEL_ID = 0,")
# runs carry their map and level seed
rep("  const spawn = (worldT, mods) => { const S = base(worldT, 1000 + Math.floor(worldT * 977) % 100000); S.mods = Object.assign({}, mods || {}); S.hp = hpMax(S);",
    "  const spawn = (worldT, mods, opt) => { const seed = 1000 + Math.floor(worldT * 977) % 100000, map = (opt && opt.map) || 'dc'; ensureLevel(map, seed);\n    const S = base(worldT, seed); S.map = map; S.lseed = seed; S.mods = Object.assign({}, mods || {}); S.hp = hpMax(S);")
rep("  const respawn = (S, worldT) => spawn(worldT, S.mods);", "  const respawn = (S, worldT) => spawn(worldT, S.mods, { map: S.map });")
rep("{ const N = spawn(S.wt0 + t, S.mods); for (const k in S) delete S[k]; Object.assign(S, N); }", "{ const N = spawn(S.wt0 + t, S.mods, { map: S.map }); for (const k in S) delete S[k]; Object.assign(S, N); }")
rep("    const S = base(0, 20261024); S.demo = true;", "    ensureLevel('dc', 0); const S = base(0, 20261024); S.map = 'dc'; S.lseed = 0; S.demo = true;")
rep("  const selfCheck = () => { const out = [];", "  const selfCheck = (map = 'dc', seed = 0) => validate(buildLevel(map, seed));\n  const selfCheckOld = () => { const out = [];")
open(p, 'w', encoding='utf-8').write(s); print('sim patched, step 1')
