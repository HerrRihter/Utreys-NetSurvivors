// live/scene.js — a cyber datacenter, 3/4 top-down. Pure function of t and the sim state (engine.md §7).
// Layers: cyber-grid floor (shader, tinted per zone) → fibre trunks with packets, tape, stencils, splats, scorch, mines, zones, marks (ground decals) → neon light pools
// (additive, ground only) → contact shadows → Y-SORTED props, tanks, pickups, foes, hero (cut-out rigs with IK legs and arms)
// → projectiles and event FX → grade (bloom, vignette) → HUD (reference layout: HP/XP top-left, clock top-centre, weapon
// slots bottom-centre) and the level-up, boss, toast and result screens.
(function () {
  const S = (window.SCENE = {}), A = window.ASSETS, L = LIB, M = L.M, W = SIM.VIEW.W, H = SIM.VIEW.H, Z = window.SIZES || {};
  S.REPEAT = [];
  const D2R = Math.PI / 180, INK = [0.02, 0.06, 0.09], CYAN = [0.0, 0.9, 1.0], MINT = [0.39, 1.0, 0.85], CORAL = [1.0, 0.4, 0.35], HAZ = [1.0, 0.84, 0.0];
  // trace sector: a fan of scan rays and a front racing out to the range, additive (u_a aim, u_half, u_age 0..1)
  const ARC = `uniform float u_a, u_half, u_age; uniform vec3 u_col;
void main(){ vec2 p = v_uv * 2.0 - 1.0; float d = length(p); float an = atan(p.y, p.x) - u_a; an = atan(sin(an), cos(an));
  float inS = smoothstep(u_half + 0.08, u_half - 0.02, abs(an)) * smoothstep(1.0, 0.9, d) * smoothstep(0.0, 0.08, d);
  float prog = clamp(u_age * 3.2, 0.0, 1.0), front = exp(-pow((d - prog) * 8.0, 2.0));
  float rays = pow(0.5 + 0.5 * cos(an * 30.0 + floor(u_age * 30.0) * 1.7), 18.0) * step(d, prog + 0.04);
  float fill = 0.22 * step(d, prog) * (1.0 - d * 0.6);
  float a = inS * (front * 1.3 + rays + fill) * (1.0 - smoothstep(0.45, 1.0, u_age));
  vec3 c = mix(u_col, vec3(1.0, 0.95, 0.85), clamp(front * 0.8 + rays * 0.4, 0.0, 1.0)); o = vec4(c * a, 0.0); }`;
  // the outage's blackout (stage 5 of docs/PLAN-FEEDBACK-27-10.md): near-black over the world, soft holes of light around the hero and
  // the five components (u_h: x, y in screen px, r; the components' holes are flattened like their circles)
  const DARK = `uniform vec2 u_view; uniform float u_amt; uniform vec3 u_h0, u_h1, u_h2, u_h3, u_h4, u_h5;
float hole(vec2 p, vec3 h){ if (h.z <= 0.0) return 0.0; vec2 d = p - h.xy; d.y /= 0.62; return 1.0 - smoothstep(h.z * 0.55, h.z, length(d)); }
void main(){ vec2 p = v_uv * u_view; float l = max(max(max(hole(p, u_h0), hole(p, u_h1)), max(hole(p, u_h2), hole(p, u_h3))), max(hole(p, u_h4), hole(p, u_h5)));
  o = vec4(0.0, 0.0, 0.0, u_amt * (1.0 - l)); }`;
  // the floor: dark panels, a thin 100 px grid, a bright 500 px grid with a halo, circuit traces with pads, pulses running along
  // the major lines; the neon colour comes from the zone (soft 150 px blend at zone edges), world-anchored (u_cam)
  const CYBER = `uniform vec2 u_cam; uniform vec4 u_z0, u_z1, u_z2, u_z3, u_z4; uniform vec3 u_c0, u_c1, u_c2, u_c3, u_c4, u_pc; uniform vec4 u_pat; uniform float u_pat4;
float inZ(vec2 w, vec4 z){ w.y *= 0.62; vec2 a = smoothstep(z.xy - 150.0, z.xy + 150.0, w) * (1.0 - smoothstep(z.zw - 150.0, z.zw + 150.0, w)); return a.x * a.y; }
float gl(float v, float per, float w){ float d = abs(fract(v / per + 0.5) - 0.5) * per; return 1.0 - smoothstep(0.0, w, d); }
void main(){ vec2 w0 = v_px + u_cam, w = vec2(w0.x, w0.y / 0.62);
  vec3 zc = u_pc; zc = mix(zc, u_c0, inZ(w, u_z0)); zc = mix(zc, u_c1, inZ(w, u_z1)); zc = mix(zc, u_c2, inZ(w, u_z2)); zc = mix(zc, u_c3, inZ(w, u_z3)); zc = mix(zc, u_c4, inZ(w, u_z4));
  vec2 cell = floor(w / 100.0); float h = hash(cell);
  vec3 col = vec3(0.022, 0.042, 0.05) * (0.85 + 0.3 * h) + zc * 0.014;
  float minor = max(gl(w.x, 100.0, 1.2), gl(w.y, 100.0, 1.2)), major = max(gl(w.x, 500.0, 1.8), gl(w.y, 500.0, 1.8)), halo = max(gl(w.x, 500.0, 16.0), gl(w.y, 500.0, 16.0));
  col += zc * (minor * 0.07 + major * 0.3 + halo * 0.05);
  vec2 f = fract(w / 100.0); float hh = hash(cell + 7.3);
  if (hh > 0.6) { float ox = 0.3 * (hash(cell + 1.1) - 0.5), oy = 0.3 * (hash(cell + 2.2) - 0.5), tx = abs(f.x - 0.5 - ox), ty = abs(f.y - 0.5 - oy);
    float tr = fract(hh * 13.0) > 0.5 ? (1.0 - smoothstep(0.0, 0.016, tx)) * step(f.y, 0.5 + oy) + (1.0 - smoothstep(0.0, 0.016, ty)) * step(0.5 + ox, f.x)
                                       : (1.0 - smoothstep(0.0, 0.016, ty)) * step(f.x, 0.5 + ox) + (1.0 - smoothstep(0.0, 0.016, tx)) * step(0.5 + oy, f.y);
    float pad = 1.0 - smoothstep(0.025, 0.045, length(f - vec2(0.5 + ox, 0.5 + oy)));
    col += zc * (min(tr, 1.0) * 0.15 + pad * 0.32); }
  float px = gl(w.y, 500.0, 2.5) * smoothstep(0.92, 1.0, fract((w.x + hash(vec2(floor(w.y / 500.0 + 0.5), 3.0)) * 4000.0 - u_t * 520.0) / 1700.0));
  float py = gl(w.x, 500.0, 2.5) * smoothstep(0.92, 1.0, fract((w.y + hash(vec2(floor(w.x / 500.0 + 0.5), 5.0)) * 4000.0 - u_t * 460.0) / 1500.0));
  col += mix(zc, vec3(1.0), 0.5) * (px + py) * 0.9;
  float k0 = inZ(w, u_z0), k1 = inZ(w, u_z1), k2 = inZ(w, u_z2), k3 = inZ(w, u_z3), k4 = inZ(w, u_z4);
  vec2 q = fract(w / 14.0) - 0.5; float dots = 1.0 - smoothstep(0.16, 0.22, length(q));                              // perforation
  vec2 hx = w / 46.0; hx.x *= 1.1547; hx.y += mod(floor(hx.x), 2.0) * 0.5; vec2 hf = abs(fract(hx) - 0.5);
  float hexl = 1.0 - smoothstep(0.0, 0.05, abs(max(hf.x * 1.5 + hf.y, hf.y * 2.0) - 1.0));                            // hex mesh
  float diag = gl(w.x + w.y, 90.0, 6.0), rail = max(gl(w.y, 500.0, 9.0), gl(w.x, 500.0, 9.0)) - major;                 // power stripes and rails
  float fine = max(gl(w.x, 25.0, 0.8), gl(w.y, 25.0, 0.8));                                                           // NOC fine grid
  float pv[5]; pv[0] = dots * 0.05 * (0.5 + 0.5 * step(0.55, h)); pv[1] = hexl * 0.1; pv[2] = diag * 0.05; pv[3] = max(rail, 0.0) * 0.18; pv[4] = fine * 0.05;
  col += zc * (k0 * pv[int(u_pat.x)] + k1 * pv[int(u_pat.y)] + k2 * pv[int(u_pat.z)] + k3 * pv[int(u_pat.w)] + k4 * pv[int(u_pat4)]);
  col += vec3(1.0, 0.84, 0.0) * k3 * diag * 0.045;                                                                   // hazard striping, the only yellow
  vec2 tf = fract(w / 100.0);                                                                                         // raised floor panels
  float lip = smoothstep(0.05, 0.0, tf.y), front = smoothstep(0.86, 0.9, tf.y) * (1.0 - smoothstep(0.98, 1.0, tf.y)), side = smoothstep(0.965, 0.985, tf.x) * 0.6;
  col += zc * lip * 0.12 + vec3(0.03, 0.05, 0.06) * lip; col *= 1.0 - 0.7 * front - 0.35 * side;
  col *= 0.86 + 0.26 * (1.0 - tf.y);                                                                                  // each panel lighter at its far edge
  float gloss = pow(0.5 + 0.5 * sin(w0.x * 0.0021 + w0.y * 0.0034 + hash(floor(w0 / 900.0)) * 6.0), 6.0);               // broad glossy reflections
  col += zc * gloss * 0.035;
  float sy = v_px.y / 1080.0; col = mix(col * 0.55 + zc * 0.02, col, smoothstep(0.0, 0.55, sy));                         // depth haze toward the top
  o = vec4(col, 1.0); }`;
  S.programs = () => { L.init(W, H, { arc: ARC, cyber: CYBER, dark: DARK }); L.glyphs('0123456789', { size: 76, stroke: '#02090d', fill: ['#ffffff', '#bff8ff', '#00e5ff'] }); stencils(); emblems(); codeTex(); L.SUN = [W * 0.2, -400];
    if (G.buildAtlas && new URLSearchParams(location.search).get('batch') !== '0') G.buildAtlas((n) => !/^(lbl_|stencil_)/.test(n)); };
  function codeTex() { const N = 12, c = 14, pad = 10, cv = document.createElement('canvas'); cv.width = cv.height = N * c + pad * 2; const g = cv.getContext('2d');
    g.fillStyle = '#061018'; g.strokeStyle = '#00e5ff'; g.lineWidth = 3; g.beginPath(); g.roundRect ? g.roundRect(2, 2, cv.width - 4, cv.height - 4, 8) : g.rect(2, 2, cv.width - 4, cv.height - 4); g.fill(); g.stroke();
    g.fillStyle = '#bff8ff'; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const finder = x === 0 || y === N - 1, timing = (y === 0 && x % 2 === 0) || (x === N - 1 && y % 2 === 1);
      if (finder || timing || (x > 0 && y > 0 && x < N - 1 && y < N - 1 && L.rnd(x * 1.7, y * 2.3) > 0.5)) g.fillRect(pad + x * c + 1, pad + y * c + 1, c - 2, c - 2); }
    G.canvasTex('code_tex', cv); }
  // the floor's zone uniforms and the stencil textures follow the active level (rebuilt when SIM.LEVEL_ID changes)
  const floorCol = () => SIM.LEVEL.col || SIM.PLAZA.col;
  const ZU = {}, zoneU = () => { for (let i = 0; i < 5; i++) { const z = SIM.ZONES[i]; ZU['u_z' + i] = z ? [z.x0, z.y0, z.x1, z.y1] : [-9e4, -9e4, -9e4, -9e4]; ZU['u_c' + i] = z ? z.col : floorCol(); }
    ZU.u_pc = floorCol(); ZU.u_pat = [0, 1, 2, 3].map((i) => (SIM.ZONES[i] ? SIM.ZONES[i].pat : 0)); ZU.u_pat4 = SIM.ZONES[4] ? SIM.ZONES[4].pat : 0; }; zoneU(); let levelSeen = SIM.LEVEL_ID;
  const zcol = (x, y) => { const z = SIM.zoneAt(x, y); return z ? z.col : floorCol(); };
  // client emblems and marks, ported from utreys-survivors (src/rendering/art/client-emblems.js), painted once into textures and
  // laid on the plain area of each body (never mirrored, so lettering always reads)
  const EMB_AT = { mars: [0.6, 0.5, 'mars'], loreal: [0.62, 0.62, 'loreal'], multon: [0.63, 0.56, 'multon'], baltika: [0.62, 0.62, 'baltika'], ferrero: [0.62, 0.56, 'ferrero'],
    vetis: [0.6, 0.55, 'vetis'], keg: [0.8, 0.42, 'inbev'], bugu: [0.65, 0.5, 'bug'], buga: [0.63, 0.42, 'bug'], bugl: [0.62, 0.4, 'bug'], bugg: [0.62, 0.4, 'bug'], crpt: [0.6, 0.48, 'crpt'],
    mond: [0.6, 0.5, 'mondelez'], prog: [0.56, 0.5, 'progress'], royal: [0.6, 0.5, 'royal_canin'], cherk: [0.66, 0.46, 'cherkizovo'], pg: [0.56, 0.46, 'procter_gamble'],
    petfood: [0.6, 0.48, 'mars_petfood'], logq: [0.8, 0.36, 'log'] };
  function emblems() {
    const neon = (g, c) => { g.save(); g.shadowColor = c; g.shadowBlur = 4; g.strokeStyle = c; g.lineWidth = 2; g.stroke(); g.restore(); };
    const word = (g, t, x, y, sz, c, wt = 'bold', fam = 'Arial, sans-serif') => { g.save(); g.font = `${wt} ${sz}px ${fam}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = c; g.shadowBlur = 3; g.fillStyle = c; g.fillText(t, x, y); g.restore(); };
    const plate = 'rgba(6,16,24,0.88)';
    const ell = (g, x, y, rx, ry, fill, st) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fillStyle = plate; g.fill(); neon(g, st || fill); };
    const poly = (g, pts, fill, st) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = plate; g.fill(); neon(g, st || fill); };
    const D = {
      mars: (g) => { poly(g, [[-26, -40], [26, -40], [26, -4], [-26, -4]], '#ff4a3d'); word(g, 'M', 0, -22, 22, '#ffeb3b', 'italic 900'); },
      inbev: (g) => { poly(g, [[-28, -40], [28, -40], [28, -6], [-28, -6]], '#d4af37'); word(g, 'INBEV', 0, -23, 12, '#ffd700'); },
      baltika: (g) => { ell(g, 0, -22, 25, 29, '#3a7bff', '#e5c76f'); word(g, 'Балтика', 0, -29, 11, '#ffffff', 'italic bold');
        for (let i = 0; i < 3; i++) { g.strokeStyle = '#e5c76f'; g.lineWidth = 2; g.beginPath(); g.moveTo(-17, -18 + i * 6); g.bezierCurveTo(-6, -25 + i * 6, 6, -11 + i * 6, 17, -18 + i * 6); g.stroke(); } },
      multon: (g) => { poly(g, [[-24, -34], [-10, -47], [18, -42], [27, -17], [14, 0], [-18, -3]], '#a9b6ad', '#ef833f'); ell(g, 12, -36, 9, 4, '#53ab55');
        word(g, 'multon', 0, -24, 12, '#7fc4ff'); word(g, 'partners', 0, -12, 7, '#7fc4ff'); ell(g, -17, -8, 3, 3, '#f7ad31'); },
      loreal: (g) => { poly(g, [[-29, -36], [25, -36], [29, -5], [-25, -5]], '#14131c', '#e8b9cb'); g.fillStyle = '#e8b9cb'; g.fillRect(-21, -31, 42, 1);
        word(g, 'L’ORÉAL', 0, -21, 11, '#ffffff', 'normal'); word(g, 'PARIS', 0, -11, 6, '#e8b9cb'); },
      ferrero: (g) => { ell(g, 0, -22, 31, 22, '#b7b29b', '#e2c27a'); word(g, 'FERRERO', 0, -22, 11, '#f0d9a8', 'bold', 'Georgia, serif');
        g.strokeStyle = '#c4a565'; g.beginPath(); g.moveTo(-16, -13); g.lineTo(16, -13); g.stroke(); },
      vetis: (g) => { poly(g, [[0, -49], [25, -39], [22, -10], [0, 5], [-22, -10], [-25, -39]], '#114f47', '#8edbb9'); g.strokeStyle = '#f1d882'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(0, -42); g.lineTo(0, -17); g.stroke(); g.beginPath(); g.moveTo(6, -39); g.bezierCurveTo(-16, -37, 15, -28, -5, -22); g.stroke(); word(g, 'ВЕТИС', 0, -8, 9, '#ffffff'); },
      bug: (g) => { word(g, 'BUG', 0, -22, 22, '#ffd600', 'italic 900'); },
      crpt: (g) => { word(g, 'ЦРПТ', 0, -22, 18, '#ffd600', 'bold', 'Consolas, monospace'); },
      mondelez: (g) => { ell(g, 0, -22, 32, 23, '#4e247a', '#bda0e3'); word(g, 'mondelēz', 0, -26, 11, '#ffffff', 'italic bold'); word(g, 'international', 0, -15, 6, '#f0dffc');
        g.strokeStyle = '#ee537b'; g.lineWidth = 3; g.beginPath(); g.arc(0, -15, 14, 0.45, Math.PI - 0.45); g.stroke(); },
      progress: (g) => { ell(g, 0, -22, 28, 25, '#b6c6b8', '#4e8b51'); const cs = ['#ec4050', '#f2a52c', '#5baf45', '#2595c6', '#985bb7'];
        [...'Фруто'].forEach((ch, i) => word(g, ch, -19 + i * 9.5, -28, 14, cs[i])); word(g, 'Няня', 0, -13, 16, '#db365d'); },
      royal_canin: (g) => { ell(g, 0, -21, 29, 26, '#b9c4ba', '#ce2942'); poly(g, [[-15, -29], [-18, -40], [-8, -34], [0, -45], [8, -34], [18, -40], [15, -29]], '#cf233c');
        word(g, 'ROYAL', 0, -20, 10, '#ff5a6e'); word(g, 'CANIN', 0, -9, 10, '#ff5a6e'); },
      cherkizovo: (g) => { poly(g, [[-28, -39], [28, -39], [24, -9], [0, 4], [-24, -9]], '#ad153d', '#f5c2ac'); g.strokeStyle = '#ffffff'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(-8, -32); g.lineTo(-8, -24); g.lineTo(7, -24); g.moveTo(7, -32); g.lineTo(7, -15); g.stroke(); word(g, 'ЧЕРКИЗОВО', 0, -7, 7, '#ffffff'); },
      procter_gamble: (g) => { ell(g, 0, -22, 27, 27, '#0753ba', '#83c7ff'); g.strokeStyle = '#83c7ff'; g.lineWidth = 2; g.beginPath(); g.arc(0, -22, 22, 0.7, 4.2); g.stroke();
        word(g, 'P&G', 0, -21, 20, '#ffffff', 'italic bold', 'Georgia, serif'); },
      mars_petfood: (g) => { ell(g, 0, -21, 25, 25, '#123ba5', '#73d9ed'); word(g, 'MARS', 0, -26, 13, '#ffffff'); ell(g, 0, -13, 6, 4, '#73d9ed');
        for (const [x, y] of [[-7, -18], [-2, -21], [3, -21], [8, -18]]) { g.beginPath(); g.arc(x, y, 2.3, 0, 6.29); g.fillStyle = '#73d9ed'; g.fill(); } },
      log: (g) => { word(g, '> LOG_', 0, -22, 16, '#b49cff', 'bold', 'Consolas, monospace'); },
    };
    for (const k in D) { const cv = document.createElement('canvas'), sc = 6; cv.width = 70 * sc; cv.height = 64 * sc; const g = cv.getContext('2d'); g.scale(sc, sc); g.translate(35, 52); D[k](g);
      G.canvasTex('emb_' + k, cv); }
  }
  // floor stencils: worn paint lettering painted once into textures (any script), laid on the floor rotated
  const FONT = 'Consolas, "Cascadia Mono", "Courier New", monospace', MONO = FONT;
  function stencils() {
    SIM.STENCILS.forEach((st, i) => { const cv = document.createElement('canvas'), g = cv.getContext('2d'), f = `bold ${st.sz}px ${MONO}`;
      g.font = f; const w = Math.ceil(g.measureText(st.s).width) + 60, h = Math.ceil(st.sz * 1.7); cv.width = w; cv.height = h; g.font = f; g.textBaseline = 'middle';
      g.shadowColor = '#00e5ff'; g.shadowBlur = st.sz * 0.25; g.fillStyle = 'rgba(160,250,255,0.95)'; g.fillText(st.s, 30, h * 0.44); g.shadowBlur = 0; g.fillStyle = 'rgba(0,229,255,0.8)'; g.fillRect(20, h * 0.82, w - 40, 3);
      const im = g.getImageData(0, 0, w, h), px = im.data;                     // scuffed paint: deterministic holes
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = (y * w + x) * 4, n = L.rnd(x * 0.37 + i, y * 0.53) * 0.6 + L.rnd(Math.floor(x / 9) + i * 7, Math.floor(y / 7)) * 0.4;
        px[k + 3] *= (y % 4 < 1) ? 0.45 : 1; }                                                // scanlines, not scuffs
      g.putImageData(im, 0, 0); G.canvasTex('stencil_' + i, cv); });
  }
  const meas = document.createElement('canvas').getContext('2d');
  const wrapC = {}; const wrap = (s, size, maxW) => { const key = s + '|' + size + '|' + maxW; if (wrapC[key]) return wrapC[key];
    meas.font = `bold ${size}px ${FONT}`; const out = []; let line = ''; for (const w of s.split(' ')) { const tr = line ? line + ' ' + w : w; if (meas.measureText(tr).width > maxW && line) { out.push(line); line = w; } else line = tr; }
    if (line) out.push(line); return (wrapC[key] = out); };
  const pool = (x, y, rx, ry, col, amt, k = 2.4) => { G.blend('add'); G.draw(L.P.glow, { u_col: col, u_k: k, u_amt: amt }, G.xf(x - rx, y - ry, 2 * rx, 2 * ry)); G.blend(); };
  const SH = (x, y, rx, ry, a) => L.shadow(x, y, rx, ry, a);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const ease = (q) => q * q * (3 - 2 * q);
  const mmss = (s) => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  const sizeOf = (n, h) => [L.hsz(n, h), h];
  const PH = { rack: 230, rack_b: 230, ups: 96, pdu: 96, cell: 112, cart: 116, cart_b: 116, core: 400, cage: 470, crac: 200, tray: 130, firerack: 150, switch: 112, desk: 140, tapelib: 220, patch: 230, blade: 150, dock: 70, holopillar: 150, spool: 110, manifold: 110, batbank: 110, switchstack: 220, crates: 120, mast: 170, rack_open: 230 };   // prop heights, view px
  for (const k in PH) if (!Z[k]) Z[k] = [0, PH[k]];

  // ---------------- rigs: per actor type, view px; legs and arms are one drawing each, cut at the joint ----------------
  // hipY = hip height at rest, leg = hip→ankle length (two equal bones), hipW = half hip width, sh* = shoulders, stride = one gait cycle
  const RIGS = {
    hero:  { body: 70, hipY: 27, leg: 35, legW: 16, lift: 0.11, D: 0.35, hipW: 11, foot: [27, 15], shY: SIM.RIG.shY, shW: SIM.RIG.shX, arm: SIM.RIG.arm, armW: 14, stride: 92, bob: 6, flip: false },
    node:  { body: 60, hipY: 26, leg: 31, legW: 13, hipW: 14, foot: [21, 12], shY: 50, shW: 30, arm: 24, armW: 11, stride: 52, bob: 3, flip: true },
    panel: { body: 58, hipY: 24, leg: 29, legW: 11, hipW: 10, foot: [19, 11], shY: 44, shW: 34, arm: 21, armW: 10, stride: 48, bob: 3, flip: true },
    orb:   { body: 68, hipY: 25, leg: 30, legW: 13, hipW: 16, foot: [23, 13], shY: 46, shW: 33, arm: 23, armW: 12, stride: 52, bob: 3, flip: true },
    keg:   { body: 88, hipY: 29, leg: 34, legW: 18, hipW: 22, foot: [29, 15], shY: 64, shW: 42, arm: 29, armW: 16, stride: 62, bob: 4, flip: true },
    boss:  { body: 210, hipY: 60, leg: 66, legW: 40, hipW: 52, foot: [62, 32], shY: 168, shW: 100, arm: 70, armW: 34, stride: 150, bob: 9, flip: true },
    bug:   { body: 150, hex: true, hipY: 18, leg: 60, legW: 18, reach: 80, stride: 120, bob: 3, flip: true },
    mars:    { body: 64, hipY: 25, leg: 30, legW: 14, hipW: 16, foot: [24, 13], shY: 46, shW: 33, arm: 25, armW: 12, bob: 3, flip: true },
    loreal:  { body: 62, hipY: 25, leg: 30, legW: 13, hipW: 17, foot: [24, 13], shY: 44, shW: 40, arm: 24, armW: 12, bob: 3, flip: true },
    multon:  { body: 58, hipY: 24, leg: 29, legW: 12, hipW: 13, foot: [22, 12], shY: 42, shW: 32, arm: 22, armW: 11, bob: 3, flip: true },
    baltika: { body: 94, hipY: 29, leg: 34, legW: 18, hipW: 22, foot: [29, 15], shY: 68, shW: 40, arm: 29, armW: 16, bob: 4, flip: true },
    ferrero: { body: 62, hipY: 25, leg: 30, legW: 14, hipW: 20, foot: [25, 13], shY: 42, shW: 48, arm: 25, armW: 12, bob: 3, flip: true },
    vetis:   { body: 86, hipY: 28, leg: 33, legW: 16, hipW: 18, foot: [27, 14], shY: 60, shW: 38, arm: 28, armW: 14, bob: 4, flip: true },
    bugu:    { body: 82, hipY: 27, leg: 32, legW: 15, hipW: 20, foot: [27, 14], shY: 56, shW: 42, arm: 27, armW: 14, bob: 4, flip: true },
    bugl:    { body: 84, hipY: 27, leg: 32, legW: 15, hipW: 22, foot: [28, 14], shY: 56, shW: 46, arm: 27, armW: 14, bob: 4, flip: true },
    bugg:    { body: 84, hipY: 27, leg: 32, legW: 15, hipW: 20, foot: [27, 14], shY: 56, shW: 44, arm: 27, armW: 14, bob: 4, flip: true },
    buga:    { body: 82, hipY: 27, leg: 32, legW: 15, hipW: 20, foot: [27, 14], shY: 56, shW: 44, arm: 27, armW: 14, bob: 4, flip: true },
    mond:    { body: 58, hipY: 24, leg: 29, legW: 12, hipW: 16, foot: [23, 12], shY: 40, shW: 46, arm: 23, armW: 11, bob: 4, flip: true },
    prog:    { body: 66, hipY: 25, leg: 30, legW: 13, hipW: 16, foot: [24, 13], shY: 46, shW: 34, arm: 24, armW: 12, bob: 3, flip: true },
    royal:   { body: 66, hipY: 25, leg: 30, legW: 13, hipW: 17, foot: [24, 13], shY: 46, shW: 40, arm: 24, armW: 12, bob: 3, flip: true },
    cherk:   { body: 84, hipY: 29, leg: 34, legW: 18, hipW: 22, foot: [29, 15], shY: 62, shW: 44, arm: 29, armW: 16, bob: 4, flip: true },
    pg:      { body: 92, hipY: 29, leg: 34, legW: 17, hipW: 22, foot: [29, 15], shY: 58, shW: 44, arm: 29, armW: 16, bob: 4, flip: true },
    petfood: { body: 64, hipY: 25, leg: 30, legW: 13, hipW: 16, foot: [24, 13], shY: 46, shW: 34, arm: 24, armW: 12, bob: 3, flip: true },
    logq:    { body: 88, hipY: 28, leg: 33, legW: 16, hipW: 22, foot: [28, 14], shY: 60, shW: 46, arm: 28, armW: 14, bob: 3, flip: true },
    batch:   { body: 230, hipY: 62, leg: 68, legW: 42, hipW: 58, foot: [64, 32], shY: 180, shW: 112, arm: 72, armW: 36, bob: 9, flip: true },
    sdesk:   { body: 200, desk: true, hipY: 0, leg: 1, legW: 1, hipW: 60, foot: [1, 1], shY: 0, shW: 0, arm: 1, armW: 1, bob: 0, flip: false },
    crpt:    { body: 200, hipY: 58, leg: 64, legW: 38, hipW: 50, foot: [60, 30], shY: 160, shW: 96, arm: 68, armW: 32, bob: 9, flip: true },
    // the «Дата-центр»'s bosses (stage 5): the replica is wide and low, the retry storm tall, the outage the biggest of all
    repl:    { body: 190, hipY: 56, leg: 60, legW: 38, hipW: 56, foot: [60, 30], shY: 150, shW: 104, arm: 64, armW: 32, bob: 8, flip: true },
    rstorm:  { body: 220, hipY: 62, leg: 70, legW: 38, hipW: 50, foot: [60, 30], shY: 176, shW: 96, arm: 72, armW: 32, bob: 10, flip: true },
    outage:  { body: 250, hipY: 66, leg: 72, legW: 46, hipW: 62, foot: [70, 34], shY: 196, shW: 120, arm: 78, armW: 40, bob: 8, flip: true },
  };
  // the component minibosses are drawn 1.8× (every length of the rig scales with the body)
  for (const k of ['bugu', 'bugl', 'bugg', 'buga']) { const r = RIGS[k]; for (const f of ['body', 'hipY', 'leg', 'legW', 'hipW', 'shY', 'shW', 'arm', 'armW', 'bob']) r[f] *= 1.8; r.foot = r.foot.map((v) => v * 1.8); }
  // bipeds run (stance 45 % of the cycle); the stride follows from the height so the feet never spread past half of it
  // the hips sit low enough that a planted foot at either end of the stance is always within reach (no IK clamp = no slide)
  for (const k in RIGS) { const r = RIGS[k]; if (r.hex || r.desk) continue; r.D = r.D || 0.45; r.hipY = Math.min(r.hipY, r.leg * 0.84); const Hh = r.hipY + r.body * 0.95;
    const Amax = Math.sqrt((0.96 * r.leg) ** 2 - r.hipY ** 2) - 0.45 * r.hipW * 0.15;
    r.stride = Math.max(20, Math.min((0.5 * Hh - 2 * r.hipW * 0.85) / r.D, 2 * Amax / r.D)); }
  const COL = {}; for (const k in SIM.FOE) COL[k] = SIM.FOE[k].col;
  const IC_FB = { ic_shield: 'ic_amount', ic_firewall: 'ic_hp', ic_repair: 'heal', ic_udp: 'ic_homing', ic_chain: 'ic_ping', ic_storm: 'ic_power', ic_turret: 'ic_cache', ic_cryo: 'ic_haste', ic_fork: 'ic_mine',
    ic_area: 'ic_magnet', ic_amount: 'ic_power', ic_dur: 'ic_haste', chest: 'code_tex', turret: 'switch' }, ICN = {};
  // an icon fitted into a w × h box with its own proportions, centred (icons are not square: drawn as squares they were squeezed)
  const ico = (n, x, y, o) => { const t = G.tex(n), k = Math.min(o.w / t.w, o.h / t.h), w = t.w * k, h = t.h * k; return L.sprite(n, x + (o.w - w) / 2, y + (o.h - h) / 2, Object.assign({}, o, { w, h })); };
  const icn = (n) => { if (ICN[n]) return ICN[n]; let r = n; try { G.tex(n); } catch (_) { r = n.startsWith('ic_x_') ? icn(SIM.WEAP[n.slice(5)].ic) : icn(IC_FB[n] || 'ic_power'); } return (ICN[n] = r); };
  // character looks (?look=N): 0 = brand colours as drawn, 1 = cold grade (muted brands, cyan rim), 2 = neon silhouettes
  // (dark bodies, a brand-coloured neon rim, emblems at full colour); the hero keeps 0
  const LOOK = typeof location !== 'undefined' ? +(new URLSearchParams(location.search).get('look') || 0) : 0;
  const actorU = (o, face, fade) => { const L0 = o.k === 'hero' ? 0 : LOOK, ice = o.ice, col = (SIM.FOE[o.k] || {}).col || CYAN;
    const g = L0 === 1 ? [0.55, 0.72 + 0.35 * o.lit, o.hit, 1.12] : L0 === 2 ? [0.45, 0.55 + 0.25 * o.lit, o.hit, 1.15] : [0.9, 0.8 + 0.4 * o.lit, o.hit, 1.05];
    const tint = ice ? [0.55, 0.88, 1.35, 0.4 + 0.45 * ice] : L0 === 1 ? [0.72, 0.9, 1.15, 0.5] : L0 === 2 ? [0.6, 0.85, 1.12, 0.55] : [0.82, 0.95, 1.1, 0.35];
    const rim = L0 === 1 ? [0.95, -0.004 * face, -0.005, 1.3] : L0 === 2 ? [2.4, -0.006 * face, -0.009, 2.6] : [0.6, -0.004 * face, -0.005, 1.2];
    const rimCol = ice ? ICE : L0 === 1 ? CYAN : L0 === 2 ? col.map((v) => Math.min(1, v * 1.25 + 0.15)) : o.rimCol || CYAN;
    return { grade: g, haze: [1, 1, 1], tint, rim, rimCol, alpha: fade }; };
  const ICE = [0.8, 0.94, 1], ELEC = [0.62, 0.5, 1], ELEC_HI = [0.82, 0.74, 1], CYAN_HI = [0.72, 1, 1], PHYS = [0.8, 0.88, 1], PHYS_HI = [0.95, 0.98, 1];
  // a hero's sprites (hr_* sheets); Utrace's until its sheet is generated
  const HART = {}; const heroArt = (h, skin) => { const key = h + ':' + (skin || ''); if (HART[key]) return HART[key]; const H = SIM.HEROES[h] || SIM.HEROES.utrace, sk = SIM.SKINS[skin];   // a skin's own sheet, else the hero's
    let a = sk && sk.hero === h ? sk.art : H.art; try { G.tex(a + '_body'); } catch (_) { a = H.art; try { G.tex(a + '_body'); } catch (_) { a = 'hero'; } } return (HART[key] = a); };
  const heroCol = (ST) => (SIM.HEROES[ST.hero] || SIM.HEROES.utrace).col;
  const ART_FALLBACK = { petfood: 'mars', logq: 'vetis', batch: 'boss', sdesk: 'desk', repl: 'boss', rstorm: 'boss', outage: 'boss' }, ART = {};
  const artOf = (k) => { if (ART[k]) return ART[k]; let a = k; try { G.tex(k === 'sdesk' ? 'sdesk_body' : k + '_body'); } catch (_) { a = ART_FALLBACK[k] || k; } return (ART[k] = a); };
  // two-bone IK in the picture plane; returns twoBone angles (deg). bend = +1 knee toward the facing side, −1 the other way
  function ik(hp, ap, l1, l2, face, bend) {
    const vx = ap[0] - hp[0], vy = ap[1] - hp[1], L0 = l1 + l2, d = Math.max(L0 * 0.25, Math.min(L0 * 0.999, Math.hypot(vx, vy)));
    const th = Math.atan2(-vx * face, vy), al = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))), be = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2))));
    return [(th - al * bend) / D2R, (Math.PI - be) * bend / D2R];
  }
  // a limb from its part drawing: root at uv (0.5, 0.1), joint (0.5, 0.5), end (0.5, 0.9) → drawn height = length / 0.8
  // cut: the fraction of the texture above the limb's root that is not drawn (a hero arm's round shoulder joint: the arm starts at the
  // body's side contour instead); the bones keep the limb's length
  function limb(tex, p, ang, face, len, w0, u, id, names, cut = 0) {
    const r0 = cut ? cut + 0.01 : 0.1, j0 = (r0 + 0.9) / 2, h = len / (0.9 - r0), w = Math.min(w0 * 1.6, L.hsz(tex, h)),
      kp = L.twoBone({ tex, p, a1: ang[0], a2: ang[1], face, w, h, split: j0, root: [0.5, r0], joint: [0.5, j0], r: 0, u, top: cut });
    const a = (ang[0] + ang[1]) * D2R, end = [kp[0] - Math.sin(a) * face * len / 2, kp[1] + Math.cos(a) * len / 2];
    if (id) { L.joint(id, names[0], p); L.joint(id, names[1], kp); L.joint(id, names[2], end); }
    return [kp, end];
  }
  // gait: foot offset along travel (s) and lift for a leg at phase offset off; stance 60% of the cycle slides back at body speed
  // D = stance share of the cycle (< 0.5: a run with a flight phase); stance sweeps the foot back by 2A = D · stride
  function gait(ph, off, A, lift, D) { const p = ((ph + off) % 1 + 1) % 1;
    if (p < D) return [A * (1 - 2 * p / D), 0]; const q = (p - D) / (1 - D); return [A * (-1 + 2 * ease(q)), Math.sin(Math.PI * q) * lift]; }

  // draws one biped (hero or foe). o: { k, x, y (screen ground point), face, dist, g, ux, uy, t, ph, die (age or −1), z, spin, hit, lit, id, wind, aimHand }
  // the body's own outline in its drawing, as [centre, half width] fractions of the drawing's width (measured): the shoulders go on it
  const BODY_U = { hr_ba: [0.445, 0.415], sk_ba_platinum: [0.44, 0.41], sk_ba_consult: [0.445, 0.42], sk_ba_deadline: [0.42, 0.40] };
  function biped(o) {
    const R0 = RIGS[o.k], face = o.face, tr = o.id || null, gl = o.g, ph = o.dist / R0.stride, ak = o.k === 'hero' ? heroArt(o.hero, o.skin) : artOf(o.k);
    const dieA = o.die >= 0 ? clamp01(o.die / 0.35) : 0, fade = o.die >= 0 ? 1 - clamp01((o.die - 0.35) / 0.3) : 1;
    if (fade <= 0) return;
    const D = R0.D, A = R0.stride * D / 2, lift = R0.leg * (R0.lift || 0.17), bob = gl * R0.bob * (0.5 + 0.5 * Math.cos(4 * Math.PI * (ph - D / 2)));   // lowest at mid-stance
    const sway = (1 - gl) * R0.hipW * 0.22 * Math.sin(o.t * 0.9 + o.ph * 6.28);                  // idle weight shift
    const breath = 1 + 0.018 * Math.sin(o.t * 2.1 + o.ph * 9);
    const hk = o.hitA !== undefined && o.hitA < 0.3 ? (1 - o.hitA / 0.3) ** 1.5 : 0, hd = o.hitDir || 0;     // flinch from the last hit
    const lean = (o.wind ? -face * 0.12 * o.wind : 0) + hd * 0.5 * hk;
    const gy = o.y - (o.z || 0), hipY = R0.hipY - bob - dieA * R0.hipY * 0.7;
    const cx = o.x + sway + hd * 16 * hk + (hk > 0.4 ? Math.sin(o.t * 90) * 3 * hk : 0);
    const u = actorU(o, face, fade);
    const uL = Object.assign({}, u, { grade: [u.grade[0] * 0.95, u.grade[1] * 0.88, o.hit, u.grade[3] * 0.95] });
    const hips = [[cx - R0.hipW, gy - hipY], [cx + R0.hipW, gy - hipY]];
    const legs = [];
    for (let s = 0; s < 2; s++) { const side = s ? 1 : -1, [sv, lf] = gait(ph, s * 0.5, A, lift, D), rest = [o.x + side * R0.hipW * (1.3 - 0.45 * gl), gy];
      const sp = dieA ? R0.hipW * 0.9 * dieA * side : 0;
      const tgt = [rest[0] + gl * sv * o.ux + sp, rest[1] + gl * sv * o.uy * 0.5 - gl * lf];
      legs.push({ side, hip: hips[s], tgt, sv: gl * sv / A }); }
    const legL = R0.leg / 2;
    const drawLeg = (lg) => { const ang = ik(lg.hip, lg.tgt, legL, legL, face, 1);
      const [kp, an] = limb(ak + '_leg', lg.hip, ang, face, R0.leg, R0.legW, uL, tr, lg.side < 0 ? ['hipL', 'kneeL', 'ankleL'] : ['hipR', 'kneeR', 'ankleR']);
      const fw = R0.foot[0], fh = fw * G.tex(ak + '_foot').h / G.tex(ak + '_foot').w, fx = an[0] - fw * (face > 0 ? 0.32 : 0.68);
      L.sprite(ak + '_foot', fx, an[1] - fh * 0.42, { w: fw, h: fh, flip: face < 0, u: uL });
      if (tr) { const sole = an[1] + fh * 0.5; L.joint(tr, lg.side < 0 ? 'heelL' : 'heelR', [fx + fw * (face > 0 ? 0.12 : 0.88), sole]); L.joint(tr, lg.side < 0 ? 'toeL' : 'toeR', [fx + fw * (face > 0 ? 0.9 : 0.1), sole]); } };
    // arms: hands hang near the hips and swing against the same-side leg; the hero's aiming hand comes from the sim
    const shYc = gy - R0.shY + (R0.hipY - hipY);
    const U = o.k === 'hero' && BODY_U[ak], bwU = U ? L.hsz(ak + '_body', R0.body) : 0;          // a hero whose drawing is wider than its body (БА's tag)
    const arms = [-1, 1].map((side) => { const sh = [U ? cx + bwU * (U[0] - 0.5 + side * U[1]) : cx + side * R0.shW, shYc], lg = legs[side < 0 ? 0 : 1];
      let hand = [sh[0] + side * R0.arm * 0.22, sh[1] + R0.arm * 0.9];
      hand[0] -= gl * lg.sv * R0.arm * 0.45 * o.ux; hand[1] -= gl * lg.sv * R0.arm * 0.2 * o.uy;
      if (o.wind) { hand = [sh[0] + side * R0.arm * 0.5 - face * R0.arm * 0.2 * o.wind, sh[1] - R0.arm * 0.55 * o.wind + R0.arm * 0.3 * (1 - o.wind)]; }
      if (o.strike) { hand = [sh[0] + face * R0.arm * 0.95 * o.strike + side * 4, sh[1] + R0.arm * 0.15]; }
      if (dieA) hand = [sh[0] + side * R0.arm * 0.8 * dieA, sh[1] + R0.arm * 0.5];
      if (o.aimHand && side === face) hand = o.aimHand;
      return { side, sh, hand }; });
    const drawArm = (a, dark) => { const ang = ik(a.sh, a.hand, R0.arm / 2, R0.arm / 2, face, -1);
      const uu = dark ? Object.assign({}, u, { tint: [0.62, 0.72, 0.85, 1] }) : u;
      limb(ak + '_arm', a.sh, ang, face, R0.arm, R0.armW, uu, tr, a.side < 0 ? ['shL', 'elbowL', 'handL'] : ['shR', 'elbowR', 'handR'], 0); };
    const far = arms.find((a) => a.side === -face), nearA = arms.find((a) => a.side === face);
    const bodyDraw = () => { const bh = R0.body * breath * (1 - 0.24 * hk), bw = L.hsz(ak + '_body', R0.body) * (1 + 0.22 * hk), tilt = dieA * face * 0.45 + lean;
      L.sprite(ak + '_body', 0, 0, { m: M.of(M.t(cx, gy - hipY + 6), M.r(tilt), M.s(R0.flip && face < 0 ? -1 : 1, 1)), w: bw, h: bh, pivot: [bw / 2, bh], u });
      const em = EMB_AT[o.k]; if (em && !L.sp) { const tx = G.tex('emb_' + em[2]), ew = bw * em[1], eh = ew * tx.h / tx.w;
        L.sprite('emb_' + em[2], 0, 0, { m: M.of(M.t(cx, gy - hipY + 6), M.r(tilt), M.t(0, -bh * (1 - em[0]))), w: ew, h: eh, pivot: [ew / 2, eh * 0.62], u: Object.assign({}, u, { rim: [0, 0, 0, 0] }, LOOK === 2 ? { grade: [0.9, 0.9, o.hit, 1.05], tint: [1, 1, 1, 0] } : {}) }); }
      if (tr) { L.joint(tr, 'hip', [cx, gy - hipY]); L.joint(tr, 'top', [cx, gy - hipY + 6 - bh]); } };
    if (tr) L.joint(tr, 'ground', [o.x, gy]);
    // a hero (always facing the viewer) wears both arms on its body: the round shoulder joints sit on the body's side outline, over it;
    // the foes keep the far arm behind the body
    if (o.k === 'hero') { for (const lg of legs) drawLeg(lg); bodyDraw(); drawArm(far, false); if (o.after) o.after(); drawArm(nearA, false); return; }
    drawArm(far, true);
    for (const lg of legs) drawLeg(lg);
    bodyDraw();
    if (o.after) o.after();
    drawArm(nearA, false);
  }
  // hexapod (the import bug): six legs from under the shell, tripod gait (L1 R2 L3 | R1 L2 R3)
  function hexapod(o) {
    const R0 = RIGS.bug, face = o.face, ph = o.dist / R0.stride, gl = o.g, A = R0.stride * 0.3, tr = o.id || null;
    const fade = o.die >= 0 ? 1 - clamp01((o.die - 0.35) / 0.3) : 1, dieA = o.die >= 0 ? clamp01(o.die / 0.35) : 0; if (fade <= 0) return;
    const hk = o.hitA !== undefined && o.hitA < 0.3 ? (1 - o.hitA / 0.3) ** 1.5 : 0, bh = R0.body * (1 + 0.02 * Math.sin(o.t * 3 + o.ph * 7)) * (1 - 0.22 * hk), bw = L.hsz('bug_body', R0.body) * (1 + 0.2 * hk), gy = o.y - (o.z || 0) - (o.wind ? 10 * o.wind : 0);
    const u = actorU(o, face, fade);
    const cy = gy - bh * 0.42 - R0.hipY + dieA * 12;
    if (tr) { L.joint(tr, 'ground', [o.x, gy]); L.joint(tr, 'top', [o.x, cy - bh * 0.5]); L.joint(tr, 'hip', [o.x, cy]); }
    for (let side = -1; side <= 1; side += 2) for (let i = 0; i < 3; i++) {
      const off = ((side < 0) === (i % 2 === 0)) ? 0 : 0.5, [sv, lf] = gait(ph, off, A, R0.leg * 0.4, 0.6);
      const at = [o.x + side * bw * 0.26, cy + (i - 1) * bh * 0.2], rest = [at[0] + side * R0.reach * (1 - 0.6 * dieA), at[1] + (i - 1) * 14 + bh * 0.3];
      const tg = [rest[0] + gl * sv * o.ux, rest[1] + gl * sv * o.uy * 0.5 - gl * lf];
      let ang = ik(at, tg, R0.leg / 2, R0.leg / 2, side, 1);
      limb('bug_leg', at, ang, side, R0.leg, R0.legW, u, tr, ['hip' + side + i, 'knee' + side + i, 'ankle' + side + i]); }
    L.sprite('bug_body', 0, 0, { m: M.of(M.t(o.x + (o.hitDir || 0) * 6 * hk, cy + bh * 0.5), M.r(dieA * 0.3 * face + (o.hitDir || 0) * 0.2 * hk), M.s(face < 0 ? -1 : 1, 1 - 0.25 * dieA)), w: bw, h: bh, pivot: [bw / 2, bh], u });
  }

  // ---------------- render ----------------
  // Between runs the demo world under the menu does not need every frame: its composite (T.comp) stays in its texture, so a skipped
  // frame only re-grades it and draws the menu (≈1300 draw calls → a few dozen). Main menu: the world every 3rd frame; the other
  // screens (80 % dark overlay): once a second. Saves the frame budget on integrated GPUs, where per-draw cost dominates.
  const FIN = { bloom: [0.3, 0.26], vignette: 0.78, warm: 0, roll: 1, dither: 1 };
  let bgN = 0, bgT = -9, bgGT = 0;
  // first frame: draw every menu screen once into a scratch target, so all their labels exist before a screen is opened
  let warm = false;
  const prewarm = (t) => { warm = true; if (!window.META) return; const keep = META.view().scr; G.bind(L.T.b2);
    for (const scr of ['main', 'shop', 'coll', 'ach', 'rec', 'set', 'hero', 'client', 'map', 'course', 'lead']) { META.go(scr, true); menu(0, t); } G.flush(); META.go(keep, true); L.qaReset(); };
  S.render = (t) => {
    if (!warm) prewarm(t);
    if (!S.state && window.META && bgT > -9 && META.view().scr !== 'main') {               // the dimmed screens: the world once a second
      if (++bgN % 60 && t - bgT < 1.5) { L.qaReset(); L.finish(t, FIN); menu(bgGT, t); G.flush(); return; } }
    const ST = S.state || SIM.at(t), unlerp = SIM.lerp(ST, ST.alpha || 0), GT = ST.t, rnd = L.rnd;   // drawn between the last two steps (restored at the end) if (!S.state) { bgT = t; bgGT = GT; } else bgT = -9;
    SIM.levelFor(ST); if (SIM.LEVEL_ID !== levelSeen) { levelSeen = SIM.LEVEL_ID; zoneU(); stencils(); }
    // trauma shake from recent events (deterministic noise of game time)
    let tr = 0; for (const e of ST.ev) { const a = GT - e.t; if (a < 0) continue;
      if (e.k === 'boom' && a < 0.5) tr = Math.max(tr, 1 - a / 0.5); if (e.k === 'slam' && a < 0.4) tr = Math.max(tr, 0.8 * (1 - a / 0.4)); if (e.k === 'hurt' && a < 0.25) tr = Math.max(tr, 0.45 * (1 - a / 0.25));
      if (e.k === 'blast' && a < 0.25) tr = Math.max(tr, 0.3 * (1 - a / 0.25)); if (e.k === 'trace' && a < 0.1) tr = Math.max(tr, 0.12); }
    const shk = tr * tr * 14, cx = ST.cam[0] + shk * Math.sin(GT * 91.7), cy = ST.cam[1] + shk * Math.sin(GT * 117.3 + 1);
    const sx = (x) => x - cx, sy = (y) => y - cy, onS = (x, y, m = 300) => x > cx - m && x < cx + W + m && y > cy - m && y < cy + H + m;
    const lamps = SIM.LAMPS.filter(([x, y]) => onS(x, y, 500));
    const flick = (i) => 0.86 + 0.14 * Math.sin(t * 13 + i * 3.1) * Math.sin(t * 2.3 + i) * (rnd(Math.floor(t * 3 + i), i) > 0.85 ? 1 : 0.2);
    const lit = (x, y) => { let v = 0; for (let i = 0; i < lamps.length; i++) { const [lx, ly] = lamps[i], d = Math.hypot((x - lx) / 330, (y - ly - 10) / 210); v += Math.exp(-d * d * 1.6); } return Math.min(1, v); };

    // ===== ground =====
    L.beginBG([0.04, 0.05, 0.08, 1]);
    G.draw(L.P.cyber, Object.assign({ u_cam: [cx, cy], u_t: t }, ZU), G.xf(0, 0, W, H));
    if (ST.ed) { const X0 = sx(0), Y0 = sy(0), X1 = sx(SIM.WORLD.x1), Y1 = sy(SIM.WORLD.y1), V = [0.008, 0.012, 0.018];                 // nothing beyond a training room's outer walls
      if (X0 > 0) L.solid(0, 0, X0, H, V, 0, 0, 0, 1); if (X1 < W) L.solid(X1, 0, W - X1, H, V, 0, 0, 0, 1); if (Y0 > 0) L.solid(0, 0, W, Y0, V, 0, 0, 0, 1); if (Y1 < H) L.solid(0, Y1, W, H - Y1, V, 0, 0, 0, 1); }
    for (const c of SIM.CABLES) for (let j = 0; j < c.length - 1; j++) { const [x0, y0] = c[j], [x1, y1] = c[j + 1], len = Math.hypot(x1 - x0, y1 - y0), an = Math.atan2(y1 - y0, x1 - x0);
      if (!onS((x0 + x1) / 2, (y0 + y1) / 2, len)) continue; const zc = zcol((x0 + x1) / 2, (y0 + y1) / 2);
      L.solid(sx(x0), sy(y0) - 9, len, 18, [0.02, 0.03, 0.04], an, 0, 9, 0.95); L.solid(sx(x0), sy(y0) - 2, len, 4, zc, an, 0, 2, 0.55);
      G.blend('add'); for (let q = 0; q < len; q += 260) { const u = ((q + t * 380 + j * 97) % len) / len, px = x0 + (x1 - x0) * u, py = y0 + (y1 - y0) * u;
        if (onS(px, py, 40)) { L.glow(sx(px), sy(py), 26, zc, 0.9, 3); L.glow(sx(px), sy(py), 8, [1, 1, 1], 0.9, 4); } } G.blend(); }
    for (const [x, y, r] of SIM.RINGS) { if (!onS(x, y, r + 100)) continue; const zc = zcol(x, y), pu = 0.5 + 0.5 * Math.sin(t * 1.3 + x);
      L.ring(sx(x), sy(y), r, r * 0.62, zc, 0.35 + 0.15 * pu, 0.012); L.ring(sx(x), sy(y), r * 0.82, r * 0.82 * 0.62, zc, 0.6, 0.03); }
    for (const [[x0, y0], [x1]] of SIM.TAPES) { if (y0 < cy - 40 || y0 > cy + H + 40 || x1 < cx || x0 > cx + W) continue;
      const a = Math.max(x0, cx - 40), b = Math.min(x1, cx + W + 40), zc = zcol((x0 + x1) / 2, y0); L.solid(sx(a), sy(y0) - 2, b - a, 3, zc, 0, 0, 0, 0.7);
      G.blend('add'); for (let x = Math.floor(a / 80) * 80; x < b; x += 80) L.glow(sx(x + ((t * 120) % 80)), sy(y0), 14, zc, 0.6, 3); G.blend(); }
    { const C = 150, i0 = Math.floor(cx / C) - 1, j0 = Math.floor(cy / C) - 1;                     // litter and coolant puddles, deterministic per floor cell
      for (let j = j0; j < j0 + Math.ceil(H / C) + 3; j++) for (let i = i0; i < i0 + Math.ceil(W / C) + 3; i++) { const h = rnd(i * 7.13, j * 3.71); if (h > 0.55) continue;
        const x = sx(i * C + C * rnd(i, j + 9)), y = sy(j * C + C * rnd(i + 5, j)), k = Math.floor(rnd(j, i) * 5), an = rnd(i + 2, j + 3) * 6.28;
        if (k <= 1) continue;
        else if (k === 2) { L.solid(x, y, 40, 4, [0.06, 0.06, 0.08], an, 20, 2, 0.9); L.solid(x, y - 1, 40, 1.5, [0.3, 0.32, 0.4], an, 20, 1, 0.7); }
        else if (k === 3) continue;
        else L.solid(x, y, 22, 22, [0.08, 0.07, 0.07], an, 11, 11, 0.35); } }
    SIM.STENCILS.forEach((st, i) => { if (!onS(st.x, st.y, 900)) return; const tx = G.tex('stencil_' + i);
      G.blend('add'); L.sprite('stencil_' + i, sx(st.x) - tx.w / 2, sy(st.y) - tx.h / 2, { w: tx.w, h: tx.h, rot: st.rot, pivot: [tx.w / 2, tx.h / 2], u: { alpha: 0.42 + 0.08 * Math.sin(t * 9 + i * 2) * (rnd(Math.floor(t * 4), i) > 0.8 ? 1 : 0.2) } }); G.blend(); });
    for (const d of ST.dec) { if (!onS(d.x, d.y)) continue; const a = GT - d.t, f = 1 - clamp01((a - 25) / 10); if (f <= 0) continue;
      if (d.k === 0) { for (let j = 0; j < 9; j++) { const z = 4 + 6 * rnd(d.s, j + 9); L.solid(sx(d.x) + (rnd(d.s, j) - 0.5) * 60 - z / 2, sy(d.y) + (rnd(d.s, j + 5) - 0.5) * 22 - z / 2, z, z, j % 3 ? MINT : CYAN, 0, 0, 0, 0.35 * f * Math.min(1, a * 6)); } }
      // other decals were warm ground cracks; they never rendered (a feedback loop on T.bg dropped the draw), left out to keep the palette
    }
    // mines, cache zones, mortar marks, boss telegraphs — painted on the floor
    for (const m of ST.MN) { if (GT < m.t0) continue; const a = GT - m.t0, bl = (Math.sin(a * (a > 0.4 ? 9 : 3)) > 0.3) ? 1 : 0;
      L.sprite('ic_mine', 0, 0, { m: M.of(M.t(sx(m.x), sy(m.y)), M.s(1, 0.55)), w: 46, h: 46, pivot: [23, 23], u: { grade: [1, 0.85, 0, 1] } });
      if (a > 0.4) pool(sx(m.x), sy(m.y) - 4, 22, 14, CYAN, 0.6 * bl, 3); }
    if (ST.FZ) { const F = ST.FZ, a = GT - F.t0, q = clamp01(a / 0.25) * clamp01((F.until - GT) / 0.3), X = sx(F.x), Y = sy(F.y);    // Регресс: the zone that freezes
      pool(X, Y, F.r * 1.05, F.r * 0.66, ELEC, 0.32 * q, 1.5); L.ring(X, Y, F.r, F.r * 0.62, ELEC_HI, 0.9 * q, 0.035);
      for (let j = 0; j < 4; j++) { const an = GT * 0.8 + j * 1.571; L.solid(X + Math.cos(an) * F.r * 0.8, Y + Math.sin(an) * F.r * 0.5, 22, 4, ELEC_HI, an + 1.57, 11, 2, 0.8 * q); } }
    for (const z of ST.ZN) { const a = GT - z.t0, q = clamp01(a / 0.25) * (1 - clamp01((a - z.life + 0.3) / 0.3));
      pool(sx(z.x), sy(z.y), z.r * 1.15, z.r * 0.72, MINT, 0.45 * q, 1.6); L.ring(sx(z.x), sy(z.y), z.r, z.r * 0.62, MINT, 0.8 * q, 0.06); }
    SIM.ZONES.forEach((z, i) => { if (!onS(z.nx, z.ny, SIM.NODE_R + 100)) return; const n = ST.nodes ? ST.nodes[i] : { st: 0, hold: 0 }, R = SIM.NODE_R, X = sx(z.nx), Y = sy(z.ny);
      if (n.st) { pool(X, Y, R, R * 0.62, MINT, 0.22, 1.2); L.ring(X, Y, R, R * 0.62, MINT, 0.9, 0.03); return; }
      if (n.down) { const pd = 0.5 + 0.5 * Math.sin(t * 6 + i); pool(X, Y, R, R * 0.62, CORAL, 0.12 + 0.12 * pd, 1.2); L.ring(X, Y, R, R * 0.62, CORAL, 0.6 + 0.35 * pd, 0.03);
        if (n.hold > 0) { const q = clamp01(n.hold / SIM.RESTART_T); pool(X, Y, R * q, R * 0.62 * q, MINT, 0.3, 1.4); L.ring(X, Y, R * q, R * 0.62 * q, [1, 1, 1], 0.7, 0.04); } return; }
      const pu = 0.5 + 0.5 * Math.sin(t * 2.2 + i); L.ring(X, Y, R, R * 0.62, z.col, 0.55 + 0.25 * pu, 0.025); L.ring(X, Y, R * 0.93, R * 0.93 * 0.62, z.col, 0.25, 0.012);
      if (n.hold > 0) { const q = clamp01(n.hold / SIM.HOLD_T); pool(X, Y, R * q, R * 0.62 * q, z.col, 0.3, 1.4); L.ring(X, Y, R * q, R * 0.62 * q, [1, 1, 1], 0.7, 0.04); } });
    if (ST.ed && SIM.LEVEL.TERMS) { const LV = SIM.LEVEL, R = SIM.TERM_R;
      LV.TERMS.forEach((tm, i) => { const n = ST.nodes[i]; if (!n || !onS(tm.cx, tm.cy, R + 100)) return; const X = sx(tm.cx), Y = sy(tm.cy), pu = 0.5 + 0.5 * Math.sin(t * 2.2 + i);
        if (n.st === 2) { pool(X, Y, R, R * 0.62, MINT, 0.18, 1.2); L.ring(X, Y, R, R * 0.62, MINT, 0.85, 0.03); return; }
        const c = n.st === 1 ? (ST.t < n.retry ? CORAL : CYAN) : floorCol(); L.ring(X, Y, R, R * 0.62, c, 0.5 + 0.3 * pu, 0.025); L.ring(X, Y, R * 0.93, R * 0.93 * 0.62, c, 0.22, 0.012);
        if (n.st === 1) { const u = SIM.TERM_USE; pool(sx(tm.x), sy(tm.y), u * 0.8, u * 0.5, c, 0.16 + 0.1 * pu, 1.6); }
        if (!n.st && n.hold > 0) { const q = clamp01(n.hold / SIM.HOLD_T); pool(X, Y, R * q, R * 0.62 * q, c, 0.3, 1.4); L.ring(X, Y, R * q, R * 0.62 * q, [1, 1, 1], 0.7, 0.04); } });
      if (LV.EXIT && onS(LV.EXIT[0], LV.EXIT[1], 500)) { const op = SIM.doorOpen(ST), c = op ? MINT : CORAL, X = sx(LV.EXIT[0]), Y = sy(LV.EXIT[1]), pu = 0.5 + 0.5 * Math.sin(t * 3);
        L.solid(X - 170, Y - 70, 340, 140, [0.02, 0.04, 0.05], 0, 0, 0, 0.85); L.ring(X, Y, 190, 110, c, 0.6 + 0.3 * pu, 0.03); pool(X, Y, 200, 120, c, op ? 0.35 : 0.12, 1.4);
        if (op) for (let j = 0; j < 3; j++) { const q = ((t * 0.8 + j / 3) % 1); L.ring(X, Y, 190 * (1 - q), 110 * (1 - q), MINT, 0.7 * q, 0.04); } } }
    for (const pu of ST.PU || []) { const a = GT - pu.t0, q = clamp01(a / 0.3) * (1 - clamp01((a - pu.life + 0.4) / 0.4)); pool(sx(pu.x), sy(pu.y), pu.r * 1.1, pu.r * 0.68, CORAL, 0.4 * q, 1.4);
      L.ring(sx(pu.x), sy(pu.y), pu.r, pu.r * 0.62, CORAL, 0.8 * q, 0.05); }
    for (const q0 of ST.TR || []) { const a = GT - q0.t0, q = clamp01(a / 0.2) * (1 - clamp01((a - q0.life + 0.8) / 0.8)); pool(sx(q0.x), sy(q0.y), q0.r, q0.r * 0.62, [0.75, 0.45, 1], 0.32 * q, 1.6); }
    for (const j of ST.LB || []) { const T = (j.vz + Math.sqrt(j.vz * j.vz + 2 * 1500 * j.z)) / 1500, lx = j.x + j.vx * T, ly = j.y + j.vy * T, k = 1 - clamp01(T / 1.0);
      L.ring(sx(lx), sy(ly), j.r, j.r * 0.62, CORAL, 0.4 + 0.5 * k, 0.05); pool(sx(lx), sy(ly), j.r, j.r * 0.62, CORAL, 0.1 + 0.25 * k, 2); SH(sx(j.x), sy(j.y), 14 + j.z * 0.02, 5, 0.45); }
    for (const e of ST.E) { const f = SIM.FOE[e.k]; if (f.kind !== 'beam' || e.atkT < 0 || e.dieT >= 0 || !onS(e.x, e.y, 800)) continue;      // the log stream's aim line
      const q = clamp01((GT - e.atkT) / f.wind), an = Math.atan2(e.ay - e.y, e.ax - e.x), L0 = f.beam.len, X = sx(e.x), Y = sy(e.y) - 40;
      L.solid(X, Y, L0, f.beam.w * (0.15 + 0.85 * q), CORAL, an, 0, 0, 0.12 + 0.18 * q); L.solid(X, Y, L0 * q, 2, CORAL, an, 0, 1, 0.9); }
    for (const m of ST.MK) { const a = (GT - m.t0) / m.delay, q = clamp01(a), mc = m.q ? HAZ : CORAL;                       // m.q: a retry storm's queue mark (amber)
      L.ring(sx(m.x), sy(m.y), m.r, m.r * 0.7, mc, 0.9, 0.05); L.ring(sx(m.x), sy(m.y), m.r * (1 - q), m.r * 0.7 * (1 - q), mc, 0.8, 0.12);
      pool(sx(m.x), sy(m.y), m.r, m.r * 0.7, mc, 0.2 + 0.3 * q, 2); }
    for (const e of ST.E) { const f = SIM.FOE[e.k]; if (!f.tether || !e.twin || e.copy || e.dieT >= 0) continue;                         // the replica's tether: a burning line
      const o = ST.E.find((q) => q.id === e.twin && q.dieT < 0); if (!o) continue; const x0 = sx(e.x), y0 = sy(e.y) - 60, x1 = sx(o.x), y1 = sy(o.y) - 60, L0 = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.ceil(L0 / 40));
      G.blend('add'); for (let j = 0; j <= n; j++) { const u = j / n, w = Math.sin(GT * 9 + j * 0.8) * 6, X = x0 + (x1 - x0) * u, Y = y0 + (y1 - y0) * u + w;
        L.glow(X, Y, 46, [0.85, 0.3, 0.95], 0.9, 2.2); L.glow(X, Y, 16, [1, 0.85, 1], 0.9, 2.6); } G.blend(); }
    for (const e of ST.E) { const f = SIM.FOE[e.k]; if (f.kind !== 'pulse' || e.atkT < 0 || e.dieT >= 0 || !onS(e.x, e.y, 400)) continue;
      const q = clamp01((GT - e.atkT) / (f.wind * (f.boss ? Math.pow(0.85, e.lvl) : 1))), r = f.range, c = CORAL;
      L.ring(sx(e.x), sy(e.y), r, r * 0.66, c, 0.9, 0.04); pool(sx(e.x), sy(e.y), r * q, r * 0.66 * q, c, 0.35, 1.5); }
    // lamp pools on the floor (the reference's warm light pools)
    lamps.forEach(([x, y], i) => { const f = flick(i + Math.round(x)), zc = zcol(x, y); pool(sx(x), sy(y) + 10, 300, 190, zc, 0.22 * f, 1.6); pool(sx(x), sy(y) + 10, 170, 105, L.lerpP(zc, [1, 1, 1], 0.5), 0.16 * f, 1.0); });
    L.beginComp();

    // ===== contact shadows (light from the upper left: shadows fall right-down) =====
    for (const [k, x, y] of SIM.PROPS) if (onS(x, y, 400)) { const f = SIM.FOOT[k] || [40, 20]; SH(sx(x) + 16, sy(y) + 4, f[0] * 1.9, Math.max(22, f[1] * 1.7), 0.32); SH(sx(x) + 10, sy(y) - 2, f[0] * 1.15, Math.max(10, f[1] * 0.9), 0.6); }   // ambient occlusion + contact
    ST.tk.forEach((o, i) => { const [x, y] = SIM.TANKS[i]; if (o.hp > 0 && onS(x, y)) SH(sx(x) + 6, sy(y), 30, 11, 0.5); });
    for (const w of SIM.LEVEL.WALLS || []) { if (!onS(w.x + w.w / 2, w.y + w.h / 2, Math.max(w.w, w.h) / 2 + 200)) continue;            // the walls' shadows fall right-down
      const X0 = sx(w.x), Y0 = sy(w.y), X1 = sx(w.x + w.w), Y1 = sy(w.y + w.h);
      if (w.hor) for (const [d, a] of [[18, 0.6], [46, 0.38], [90, 0.2], [150, 0.09]]) L.solid(X0 + d * 0.4, Y1 - 6, w.w + d * 0.3, d, [0, 0, 0], 0, 0, 0, a);
      else { for (const [d, a] of [[18, 0.62], [48, 0.4], [96, 0.22], [160, 0.1]]) L.solid(X1, Y0 + d * 0.3, d, w.h, [0, 0, 0], 0, 0, 0, a);
        for (const [d, a] of [[10, 0.35], [26, 0.15]]) L.solid(X0 - d, Y0, d, w.h, [0, 0, 0], 0, 0, 0, a); } }

    // ===== Y-sorted band =====
    const Yb = [];
    for (const [k, x, y, f] of SIM.PROPS) { if (k !== 'core' || !onS(x, y, 600)) continue; const [w, h] = sizeOf(k, Z[k][1]), l = lit(x, y), F = SIM.FOOT.core, N = 14;
      for (let i = 0; i < N; i++) { const u0 = i / N, u1 = (i + 1) / N, xc = x - w / 2 + (u0 + u1) / 2 * w, front = y - F[1] + F[1] * Math.max(0, 1 - Math.abs(xc - x) / F[0]);
        Yb.push([front, () => L.sprite(k, sx(x) - w / 2 + u0 * w, sy(y) - h, { w: w / N + 0.6, h, src: [f ? 1 - u1 : u0, 0, f ? 1 - u0 : u1, 1], flip: !!f,
          u: { grade: [0.75, 0.72 + 0.4 * l, 0, 1.05], tint: [0.8, 0.95, 1.12, 0.4], rim: [0.55, 0.004, -0.004, 1.2], rimCol: zcol(x, y) } })]); } }
    for (const [k, x, y, f] of SIM.PROPS) { if (k === 'core' || !onS(x, y, 500)) continue; Yb.push([y, () => { const [w, h] = sizeOf(k, Z[k][1]), l = lit(x, y);
      L.sprite(k, sx(x) - w / 2, sy(y) - h, { w, h, flip: !!f, u: { grade: [0.75, 0.72 + 0.4 * l, 0, 1.05], tint: [0.8, 0.95, 1.12, 0.4], rim: [0.55, 0.004, -0.004, 1.2], rimCol: zcol(x, y) } });
      if (k === 'rack' || k === 'rack_b') for (let j = 0; j < 6; j++) { const on = rnd(Math.floor(t * (2 + rnd(x, j) * 3)), x * 3 + j) > 0.4; if (!on) continue;
        const c = [[0.25, 0.66, 1], [1, 0.74, 0.34], [0.36, 1, 0.6]][(j + x) % 3]; L.glow(sx(x) - w * 0.33 + (j % 3) * w * 0.05, sy(y) - h * 0.78 + Math.floor(j / 3) * h * 0.17 + (x % 4) * h * 0.04, 9, c, 0.9, 4); } }]); }
    ST.tk.forEach((o, i) => { const [x, y] = SIM.TANKS[i]; if (!onS(x, y)) return; Yb.push([y, () => { const a = GT - o.boom;
      if (o.hp > 0 || o.boom < 0) { const hurt = o.hp < 30 && o.hp > 0, sh = hurt ? Math.sin(GT * 60) * 2 : 0; const [w, h] = sizeOf('cell', Z.cell[1]);
        L.sprite('cell', sx(x) - w / 2 + sh, sy(y) - h, { w, h, u: { grade: [1, 0.8 + 0.4 * lit(x, y), 0, 1], rim: [0.45, 0.004, -0.004, 1], rimCol: zcol(x, y) } });
        const pu = 0.6 + 0.4 * Math.sin(t * (hurt ? 14 : 2.4) + i), cc = hurt ? [1, 0.35, 0.9] : [0.4, 0.95, 1]; L.glow(sx(x) + sh, sy(y) - h * 0.52, 34, cc, 0.7 * pu, 3); }
      else if (a < 40) for (let j = 0; j < 5; j++) L.solid(sx(x) - 30 + j * 13, sy(y) - 8 - rnd(i, j) * 10, 12 + rnd(j, i) * 10, 6, [0.25, 0.08, 0.06], rnd(i + 3, j) * 3, 6, 3, 0.9); }]); });
    for (const p of ST.Gm) { if (!onS(p.x, p.y, 60)) continue; Yb.push([p.y + 30, () => { const b = 5 * Math.sin(t * 4 + p.x * 0.05), n = p.b === 3 ? icn('chest') : p.b === 1 ? 'code_tex' : p.b === 2 ? 'heal' : ['gem', 'gem_b', 'gem_c'][p.k], h = p.b === 3 ? 64 : p.b === 1 ? 34 : p.b ? 30 : [26, 32, 40][p.k];
      if (p.b === 3) { G.blend('add'); L.solid(sx(p.x) - 18, sy(p.y) - 420, 36, 420, MINT, 0, 0, 0, 0.12 + 0.06 * Math.sin(t * 5)); L.ring(sx(p.x), sy(p.y), 50, 30, MINT, 0.7, 0.08); G.blend(); }
      SH(sx(p.x), sy(p.y) + 4, 12, 4, 0.4); const col = p.b === 3 ? MINT : p.b === 1 ? [0.0, 0.9, 1.0] : p.b === 2 ? [0.39, 1.0, 0.85] : [[0.36, 1, 0.6], [0.25, 0.66, 1], [0.9, 0.5, 0.85]][p.k];
      L.glow(sx(p.x), sy(p.y) - b - h * 0.4, h * 1.3, col, 0.35, 3); const w = L.hsz(n, h); L.sprite(n, sx(p.x) - w / 2, sy(p.y) - h - b, { w, h }); }]); }
    for (const w of SIM.LEVEL.WALLS || []) { if (!onS(w.x + w.w / 2, w.y + w.h / 2, Math.max(w.w, w.h) / 2 + 300)) continue; const zc = floorCol();
      if (w.hor) { const n = Math.max(1, Math.round(w.w / 150)), stp = w.w / n;                                   // an east-west wall is a rack row (the data centre's art)
        Yb.push([w.y + w.h - 2, () => { const X = sx(w.x), Y = sy(w.y + w.h), hb = WALL_H + 10;                       // its backing between the racks
          L.solid(X, Y - hb, w.w, hb, [0.022, 0.034, 0.045], 0, 0, 0, 1); L.solid(X, Y - hb, w.w, 3, L.lerpP(zc, [1, 1, 1], 0.4), 0, 0, 0, 0.4); L.solid(X, Y - 10, w.w, 10, [0.008, 0.012, 0.016], 0, 0, 0, 1); }]);
        for (let j = 0; j < n; j++) { const x = w.x + stp * (j + 0.5), y = w.y + w.h; if (!onS(x, y, 320)) continue;
          Yb.push([y - 1, () => { const k = (j + Math.round(w.x / 150)) % 3 ? 'rack' : 'rack_b', [rw, rh] = sizeOf(k, Z[k][1]), l = lit(x, y - 40);
            L.sprite(k, sx(x) - rw / 2, sy(y) - rh + 4, { w: rw, h: rh, flip: !!(j % 2), u: { grade: [0.75, 0.72 + 0.4 * l, 0, 1.05], tint: [0.8, 0.95, 1.12, 0.4], rim: [0.55, 0.004, -0.004, 1.2], rimCol: zc } });
            for (let q = 0; q < 6; q++) { if (rnd(Math.floor(t * (2 + rnd(x, q) * 3)), x * 3 + q) <= 0.4) continue; const c = [[0.25, 0.66, 1], [1, 0.74, 0.34], [0.36, 1, 0.6]][(q + Math.round(x)) % 3];
              L.glow(sx(x) - rw * 0.33 + (q % 3) * rw * 0.05, sy(y) - rh * 0.78 + Math.floor(q / 3) * rh * 0.17, 9, c, 0.9, 4); } }]); }
        continue; }
      const n = Math.max(1, Math.ceil(w.h / 80)), s = w.h / n; for (let j = 0; j < n; j++) { const y0 = w.y + j * s; if (!onS(w.x, y0, 320)) continue; Yb.push([y0 + s, () => wallSeg(w.x, y0, w.w, s, j === n - 1, j === 0, sx, sy, zc, t, lit(w.x + w.w / 2, y0 + s / 2))]); } }
    if (ST.ed && SIM.LEVEL.EXIT && onS(SIM.LEVEL.EXIT[0], SIM.LEVEL.EXIT[1], 500)) { const [ex, ey] = SIM.LEVEL.EXIT; Yb.push([ey + 20, () => doorFrame(ex, ey, SIM.doorOpen(ST), sx, sy, t)]); }
    // foes
    for (const e of ST.E) { if (!onS(e.x, e.y, 200)) continue; const f = SIM.FOE[e.k], R0 = RIGS[e.k];
      Yb.push([e.y, () => { const die = e.dieT >= 0 && !e.fly ? GT - e.dieT : -1, z = e.fly ? e.z : 0, hit = clamp01(1 - (GT - e.hitT) / 0.16);
        const wind = e.atkT >= 0 ? clamp01((GT - e.atkT) / f.wind) : 0; let strike = 0; for (const ev of ST.ev) if (ev.k === 'strike' && ev.id === e.id && GT - ev.t < 0.22) strike = 1 - (GT - ev.t) / 0.22;
        const X = sx(e.x), Y = sy(e.y), l = lit(e.x, e.y), sc = e.fly ? 1 - Math.min(0.5, z / 900) : 1;
        if (die < 0.6 && !R0.desk) SH(X + 4, Y, (R0.hex ? 48 : (R0.hipW + 14) * 1.3) * sc, 9 * sc * (R0.hex ? 1.5 : 1), 0.5 * sc);
        const o = { k: e.k, x: X, y: Y, face: e.face, dist: e.dist, g: e.fly ? 0.6 : e.g, ux: e.ux, uy: e.uy, t, ph: e.ph, die, z, hit, lit: l, wind, strike, hitA: GT - e.hitT, hitDir: e.hdx || 0, rimCol: zcol(e.x, e.y), ice: e.frzT > GT ? 1 : e.chillT > GT ? 0.45 : 0, id: S.TRACE_IDS ? 'e' + e.id : null };
        if (f.kind === 'spin' && e.spinT > GT && die < 0) { const r = f.spin.r; L.ring(X, Y - 10, r, r * 0.62, CORAL, 0.6, 0.05); G.blend('add');
          for (let j = 0; j < 6; j++) { const an = GT * 14 + j * 1.047; L.solid(X + Math.cos(an) * r * 0.55, Y - 30 + Math.sin(an) * r * 0.34, r * 0.7, 5, CORAL, an + 1.4, 0, 2.5, 0.75); } G.blend(); }
        if (e.k === 'pg' && die < 0) { const r = f.aura.r, pu = 0.5 + 0.5 * Math.sin(GT * 2.5 + e.id); L.ring(X, Y, r, r * 0.62, [0.5, 0.75, 1], 0.18 + 0.12 * pu, 0.02); }
        if (e.shT && GT - e.shT < 0.35 && die < 0) { const q = 1 - (GT - e.shT) / 0.35, r = (R0.hex ? 70 : R0.hipW + 30); L.ring(X, Y - R0.hipY - R0.body * 0.5, r, r * 1.05, [0.5, 0.8, 1], 0.9 * q, 0.08);
          pool(X, Y - R0.hipY - R0.body * 0.5, r, r, [0.4, 0.65, 1], 0.35 * q, 2); }
        if (f.ward && die < 0) { const kids = ST.E.filter((c) => c.dieT < 0 && c.sum === e.id); if (kids.length) { const r = R0.body * 0.75;
          L.ring(X, Y - R0.hipY - R0.body * 0.45, r, r * 0.9, [0.5, 0.8, 1], 0.55 + 0.2 * Math.sin(GT * 6), 0.04);
          for (const c of kids) { const cx = sx(c.x), cy = sy(c.y) - 40, dx = cx - X, dy = cy - (Y - R0.body * 0.5); L.solid(X, Y - R0.body * 0.5, Math.hypot(dx, dy), 2, [0.5, 0.8, 1], Math.atan2(dy, dx), 0, 1, 0.35); } } }
        if (wind > 0 && (f.kind === 'shoot' || f.kind === 'mortar' || f.kind === 'lob' || f.kind === 'beam')) L.glow(X, Y - z - R0.hipY - R0.body * 0.5, 30 + 40 * wind, CORAL, 0.9 * wind, 3);
        const deskDraw = () => { const n = artOf('sdesk') === 'sdesk' ? 'sdesk_body' : 'desk', h = R0.body, w = L.hsz(n, h), hk = clamp01(1 - (GT - e.hitT) / 0.15), fade = die >= 0 ? 1 - clamp01(die / 0.6) : 1;
          L.sprite(n, X - w / 2 + (e.hdx || 0) * 4 * hk, Y - h + 30 + die * 40, { w, h, u: { grade: [0.9, 0.8 + 0.4 * l, hit, 1.05], rim: [0.6, 0.004, -0.005, 1.2], rimCol: o.rimCol, alpha: fade } });
          const tk = ST.ev.find((v) => v.k === 'tickets' && v.id === undefined && Math.abs(v.x - e.x) < 1 && GT - v.t < 0.8), bl = tk ? 1 - (GT - tk.t) / 0.8 : 0.35 + 0.25 * Math.sin(GT * 5 + e.id);
          if (fade > 0) { L.glow(X, Y - h + 40, 40 + 60 * bl, CORAL, 0.9 * bl * fade, 3); const q = clamp01(1 - (e.sumT - ST.t) / f.desk.every);     // next batch timer
            L.rrect(X - 50, Y + 44, 100, 7, 3, [0.05, 0.08, 0.12]); L.rrect(X - 49, Y + 45, 98 * q, 5, 2, CORAL); } };
        const draw = () => (f.kind === 'desk' ? deskDraw() : R0.hex ? hexapod(o) : biped(o));
        if (e.frzT > GT && die < 0) { const hy = Y - (R0.hex ? 60 : R0.hipY + R0.body * 0.5), r = R0.hex ? 90 : R0.body * 0.75; G.blend('add'); L.glow(X, hy, r * 1.3, ICE, 0.35, 2);
          for (let j = 0; j < 5; j++) { const an = j * 1.256 + e.id; L.solid(X + Math.cos(an) * r * 0.6, hy + Math.sin(an) * r * 0.5, 14, 4, [0.85, 1, 1], an, 0, 1.5, 0.8); } G.blend(); }
        if (hit > 0 && die < 0) { const hy = Y - z - (R0.hex ? 60 : R0.hipY + R0.body * 0.5); L.glow(X - (e.hdx || 0) * 20, hy, (R0.hex ? 110 : R0.body * 0.9) * (0.6 + 0.4 * hit), [1, 0.95, 0.9], 0.55 * hit, 2.5); }
        if (e.fly) { const m0 = M.of(M.t(X, Y - z - 40), M.r(Math.sin(GT * e.spin * 0.6) * 1.2), M.t(-X, -(Y - z - 40))); drawRot(m0, draw); }
        else draw();
        if (e.dash === 1) { const q = clamp01((GT - e.dashT) / 0.8); for (let j = 1; j < 9; j++) L.solid(X + e.dx * j * 46, Y - 30 + e.dy * j * 46 - 3, 26, 6, [1, 0.25, 0.2], Math.atan2(e.dy, e.dx), 0, 3, 0.35 + 0.5 * q * (Math.sin(GT * 30 + j) > 0 ? 1 : 0.4)); }
        if (e.truceT > GT && die < 0) { const by = Y - z - (R0.hex ? R0.body + 40 : R0.hipY + R0.body + 34); L.rrect(X - 26, by - 14, 52, 26, 12, [0.9, 1, 0.97], [0.75, 0.9, 0.86], 0.9);   // Переговоры
          for (let j = 0; j < 3; j++) L.rrect(X - 14 + j * 11, by - 4, 7, 7, 3.5, [0.05, 0.3, 0.28], [0.05, 0.3, 0.28], 0.5 + 0.5 * (Math.floor(GT * 3) % 3 === j ? 1 : 0)); }
        if ((f.boss || f.mini || (e.k === 'keg' && e.hp < e.mhp)) && die < 0) { const bw = f.boss ? 160 : f.mini ? 150 : 46, by = Y - z - (R0.hex ? R0.body + 50 : R0.desk ? R0.body - 10 : R0.hipY + R0.body + 18);
          L.rrect(X - bw / 2 - 2, by - 2, bw + 4, f.boss ? 14 : 9, 4, [0.08, 0.05, 0.06]); L.rrect(X - bw / 2, by, bw * clamp01(e.hp / e.mhp), f.boss ? 10 : 5, 3, [0.95, 0.25, 0.22], [0.7, 0.12, 0.12]); }
      }]); }
    // hero
    { const X = sx(ST.x), Y = sy(ST.y) - 52;                                                  // Отказоустойчивость: the sphere while charged, the block
      if (ST.shCh > 0 && ST.dead < 0) { const pu = 0.5 + 0.5 * Math.sin(GT * 3.2); G.blend('add'); L.glow(X, Y, 96, CYAN, 0.12 + 0.05 * pu, 1.4); G.blend();
        for (let c = 0; c < ST.shCh; c++) { const r = 74 + c * 12; L.ring(X, Y, r, r * 1.08, CYAN_HI, 0.42 + 0.18 * pu, 0.022);
          for (let j = 0; j < 6; j++) { const an = GT * (0.9 + c * 0.4) + j * 1.047; L.solid(X + Math.cos(an) * r, Y + Math.sin(an) * r * 1.08, 12, 3, CYAN_HI, an + 1.571, 6, 1.5, 0.55 * pu + 0.2); } } }
      for (const ev of ST.ev) { if (ev.k !== 'shieldblock') continue; const a = GT - ev.t; if (a < 0 || a > 0.55) continue; const q = a / 0.55;
        G.blend('add'); L.glow(X, Y, 100 * (1 - q * 0.4), CYAN_HI, 0.38 * (1 - q), 2); G.blend(); L.ring(X, Y, 80 + 60 * q, (80 + 60 * q) * 1.08, CYAN_HI, 1 - q, 0.05);
        if (ev.r) L.ring(sx(ev.x), sy(ev.y), ev.r * q, ev.r * q * 0.62, CYAN, 0.9 * (1 - q), 0.04); } }
    if (ST.ab) { const A = SIM.ABIL[ST.hero] || SIM.ABIL.utrace, X = sx(ST.x), Y = sy(ST.y), on = GT < ST.ab.until && (A.id === 'overclock' || A.id === 'registry'), c = heroCol(ST);
      if (on) { const pu = 0.5 + 0.5 * Math.sin(GT * 10); L.ring(X, Y - 4, 70, 70 * 0.62, c, 0.6 + 0.3 * pu, 0.05); G.blend('add'); L.glow(X, Y - 50, 90, c, 0.18 + 0.1 * pu, 2); G.blend(); }
      const ca = GT - ST.ab.t0; if (ca >= 0 && ca < 0.5) { const q = ca / 0.5, R = A.radius || 220; L.ring(X, Y - 4, R * q, R * q * 0.62, A.id === 'field' ? ELEC_HI : A.id === 'negotiate' ? MINT : c, 0.9 * (1 - q), 0.05); } }
    Yb.push([ST.y, () => { const X = sx(ST.x), Y = sy(ST.y), l = lit(ST.x, ST.y), dash = GT - ST.dashT < SIM.K.DASH_T + 0.05;
      const blink = GT - ST.iT < SIM.K.IFR && Math.sin(GT * 50) > 0, die = ST.dead >= 0 ? GT - ST.dead : -1;
      SH(X + 6, Y, 34, 10, 0.55);
      if (dash) for (let j = 1; j <= 4; j++) L.puff(X - ST.ddx * j * 26, Y - 40 - ST.ddy * j * 26, 22 - j * 3, [0.4, 0.75, 0.85], 0.25 * (1 - j / 5), j);
      const hand = SIM.hand(ST), hs = [sx(hand[0]), sy(hand[1])];
      const sy0 = ST.face;
      const tool = () => { const T = TOOL.scanner, tx = G.tex('scanner'), [gx, gy] = T.grip, [px, py] = T.tip, cr = (A.scanner && A.scanner.crop) || [0, 0], scl = (A.scanner && A.scanner.scale) || 1;
        const vx = (px - gx) * scl, vy = (py - gy) * scl, k = Math.hypot(SIM.RIG.gun, SIM.RIG.gunUp) / Math.hypot(vx, vy), rot = Math.atan2(-SIM.RIG.gunUp, SIM.RIG.gun) - Math.atan2(vy, vx);
        L.sprite('scanner', 0, 0, { m: M.of(M.t(hs[0], hs[1]), M.r(ST.aim), M.s(1, sy0), M.r(rot)), w: tx.w * k, h: tx.h * k, pivot: [(gx - cr[0]) * scl * k, (gy - cr[1]) * scl * k], u: { grade: [1, 0.85 + 0.4 * l, 0, 1] } });
        const tp = SIM.tip(ST); L.anchor('trace', [sx(tp[0]), sy(tp[1])], M.ap(M.of(M.t(hs[0], hs[1]), M.r(ST.aim), M.s(1, sy0), M.r(rot)), [vx * k, vy * k]), 3);
        // the trace is a ranged fan: its "blade" for the aim check is the beam from the scanner window out to the strike's range
        if (S.TRACE_IDS) { const rr = SIM.wstat('trace', ST.wp.trace || 1).range; L.joint('hero', 'grip', [sx(tp[0]), sy(tp[1])]);
          L.joint('hero', 'tip', [sx(tp[0] + Math.cos(ST.aim) * rr), sy(tp[1] + Math.sin(ST.aim) * rr)]); if (ST.qaTarget) L.joint('hero', 'target', [sx(ST.qaTarget[0]), sy(ST.qaTarget[1])]); } };
      const o = { k: 'hero', hero: ST.hero, skin: ST.skin, x: X, y: Y, face: ST.face, dist: ST.dist, g: ST.g, ux: ST.ux, uy: ST.uy, t, ph: 0.3, die: die >= 0 ? Math.min(die, 0.34) : -1, z: 0,
        hit: clamp01(1 - (GT - ST.hurtT) / 0.12), lit: l, aimHand: hs, after: null, rimCol: zcol(ST.x, ST.y), id: S.TRACE_IDS ? 'hero' : null };
      if (GT < ST.slowT) { L.glow(X, Y - 50, 70, [0.45, 0.75, 1], 0.45, 2); for (let j = 0; j < 3; j++) L.puff(X + (rnd(Math.floor(GT * 8), j) - 0.5) * 60, Y - 20 - j * 18, 8, [0.7, 0.85, 1], 0.4, j); }
      const draw = () => { biped(Object.assign(o, { after: ST.face > 0 ? null : tool })); if (ST.face > 0) tool(); };
      if (!blink) L.inked(draw, { r: 2.2, n: 8, col: INK });
      // overhead bar like the reference: HP (green) and the dash cooldown pip
      const by = Y - 116; L.rrect(X - 33, by - 2, 66, 10, 4, [0.06, 0.05, 0.06]); L.rrect(X - 31, by, 62 * clamp01(ST.hp / SIM.hpMax(ST)), 6, 3, [0.4, 0.95, 0.45], [0.2, 0.7, 0.3]);
      if (ST.dashCD > 0) L.rrect(X - 31, by + 9, 62 * (1 - ST.dashCD / SIM.K.DASH_CD), 3, 1.5, [0.4, 0.75, 1]); }]);
    for (const u of ST.TU || []) { if (!onS(u.x, u.y, 200)) continue; Yb.push([u.y, () => { const X = sx(u.x), Y = sy(u.y), left = u.life - (GT - u.t0), bl = left < 1.2 && Math.sin(GT * 30) > 0 ? 0.4 : 1;
      const n = icn('turret'), h = 96, w = L.hsz(n, h), c = u.evo ? CYAN_HI : CYAN; SH(X + 4, Y, 40, 12, 0.5);
      L.sprite(n, X - w / 2, Y - h + 8, { w, h, u: { grade: [0.85, 1, 0, 1], tint: [0.8, 0.95, 1.1, 0.3], rim: [0.6, 0.004, -0.004, 1.2], rimCol: c, alpha: bl } });
      if (GT - u.nt > -0.06) L.glow(X + Math.cos(u.a) * 26, Y - 74 + Math.sin(u.a) * 20, 16, c, 0.9 * bl, 3); L.glow(X, Y - h + 12, 10, c, (0.5 + 0.5 * Math.sin(GT * 6 + u.t0)) * bl, 4); }]); }
    // orbit scanners sort with the band (they circle the hero in depth)
    if (ST.wp.orbit) { const st = SIM.wstat('orbit', ST.wp.orbit); for (let i = 0; i < st.count; i++) { const a = GT * st.spin + i * 6.2832 / st.count, ox = ST.x + Math.cos(a) * st.radius, oy = ST.y - 34 + Math.sin(a) * st.radius * 0.62;
      Yb.push([oy + 34, () => { L.glow(sx(ox), sy(oy), 46, MINT, 0.5, 3); for (let j = 1; j < 6; j++) { const b = a - j * 0.09; L.glow(sx(ST.x + Math.cos(b) * st.radius), sy(ST.y - 34 + Math.sin(b) * st.radius * 0.62), 16 - j * 2, MINT, 0.4 * (1 - j / 6), 3); }
        L.sprite('ic_orbit', sx(ox) - 19, sy(oy) - 19, { w: 38, h: 38 }); }]); } }
    Yb.sort((a, b) => a[0] - b[0]).forEach(([, d]) => d());

    // ===== projectiles =====
    for (const p of ST.P) { if (p.wait > GT) continue; const X = sx(p.x), Y = sy(p.y);
      if (p.k === 'hom') { const v = Math.hypot(p.vx, p.vy) || 1; for (let j = 1; j < 7; j++) L.glow(X - p.vx / v * j * 9, Y - p.vy / v * j * 9, 14 - j * 1.6, CYAN, 0.5 * (1 - j / 7), 3);
        L.glow(X, Y, 30, CYAN, 0.9, 3); L.sprite('ic_homing', 0, 0, { m: M.of(M.t(X, Y), M.r(Math.atan2(p.vy, p.vx) + 0.78)), w: 34, h: 34, pivot: [17, 17] }); }
      if (p.k === 'pkt') { const a = Math.atan2(p.vy, p.vx), c = p.evo ? CYAN_HI : [0.55, 0.85, 1]; G.blend('add');                  // Сериализация's packet: a bright block with a trail
        for (let j = 1; j < 6; j++) L.glow(X - Math.cos(a) * j * 16, Y - Math.sin(a) * j * 16, 16 - j * 2, c, 0.45 * (1 - j / 6), 3);
        L.solid(X - 12, Y - 8, 24, 16, [0.9, 1, 1], a, 12, 8, 1); L.glow(X, Y, 30, c, 0.8, 3); G.blend(); }
      if (p.k === 'udp' || p.k === 'tsh') { const a = Math.atan2(p.vy, p.vx), c = p.evo ? CYAN_HI : CYAN, len = p.k === 'tsh' ? 22 : p.evo ? 34 : 26;
        G.blend('add'); L.solid(X - Math.cos(a) * len, Y - Math.sin(a) * len, len, p.evo ? 6 : 4, c, a, 0, 2, 0.9); L.glow(X, Y, 16, c, 0.9, 3); G.blend(); }
      if (p.k === 'fork') { const Z = p.z || 0, r = p.depth > 0 && p.split ? 30 : 20; SH(X, Y + 4, r * 0.6, r * 0.25, 0.4); L.glow(X, Y - Z, r * 1.4, p.evo ? PHYS_HI : PHYS, 0.25, 3);
        L.rrect(X - r * 0.55, Y - Z - r * 0.55, r * 1.1, r * 1.1, r * 0.55, p.evo ? PHYS_HI : PHYS, PHYS, 0.9); L.rrect(X - r * 0.45, Y - Z - r * 0.45, r * 0.9, r * 0.9, r * 0.45, [0.07, 0.11, 0.15], [0.03, 0.05, 0.08], 1); L.glow(X, Y - Z - r * 0.55, 8, p.evo ? PHYS_HI : PHYS, 0.9 + 0.1 * Math.sin(GT * 30), 4); }
      if (p.k === 'axe') { const Z = Math.max(0, p.z); SH(X, Y + 4, 20, 7, 0.45); L.glow(X, Y - Z, 40, PHYS, 0.4, 3);
        for (let j = 1; j < 5; j++) L.glow(X - p.vx * j * 0.02, Y - Z + (p.vz * j * 0.02), 22 - j * 4, PHYS, 0.22 * (1 - j / 5), 3);
        L.sprite('ic_retry', 0, 0, { m: M.of(M.t(X, Y - Z), M.r(GT * 18 * Math.sign(p.vx || 1))), w: 54, h: 54, pivot: [27, 27] }); }
      if (p.k === 'fork') { const q = clamp01((GT - p.t0) / p.T); L.ring(sx(p.tx), sy(p.ty), p.r, p.r * 0.62, p.evo ? PHYS_HI : PHYS, 0.25 + 0.5 * q, 0.04); }
      if (p.k === 'ret') { L.glow(X, Y, 40, PHYS, 0.5, 3); SH(X, Y + 46, 16, 5, 0.3); L.sprite('ic_retry', 0, 0, { m: M.of(M.t(X, Y), M.r(GT * 16)), w: 46, h: 46, pivot: [23, 23] }); } }
    for (const b of ST.EB) { const X = sx(b.x), Y = sy(b.y), c = CORAL; L.glow(X, Y, 34, c, 0.9, 3); L.glow(X, Y, 12, [1, 0.95, 0.85], 1, 4);
      if (b.back) for (let j = 0; j < 3; j++) { const an = GT * 18 + j * 2.09; L.solid(X, Y, 16, 4, c, an, 0, 2, 0.9); } }
    for (const j of ST.LB || []) { const X = sx(j.x), Y = sy(j.y) - j.z; L.glow(X, Y, 30, [0.55, 0.85, 0.45], 0.7, 3);
      L.solid(X - 9, Y - 11, 18, 22, [0.7, 0.85, 0.65], GT * 9 + j.x, 9, 5, 1); L.solid(X - 10, Y - 14, 20, 6, [0.3, 0.6, 0.3], GT * 9 + j.x, 10, 3, 1); }
    G.blend('add'); for (const b of ST.BM || []) { const q = 1 - (GT - b.t0) / b.hold, X = sx(b.x0), Y = sy(b.y0), an = Math.atan2(b.y1 - b.y0, b.x1 - b.x0), L0 = Math.hypot(b.x1 - b.x0, b.y1 - b.y0);
      L.solid(X, Y, L0, b.w * 1.6, CORAL, an, 0, 0, 0.35 * q); L.solid(X, Y, L0, b.w * 0.7, CORAL, an, 0, 4, 0.9 * q); L.solid(X, Y, L0, b.w * 0.22, [1, 0.95, 0.9], an, 0, 2, q);
      for (let k = 0; k < 6; k++) { const u = ((GT * 3 + k / 6) % 1); L.glow(X + Math.cos(an) * L0 * u, Y + Math.sin(an) * L0 * u, 18, [1, 0.9, 0.8], 0.8 * q, 4); } } G.blend();
    for (const m of ST.MK) { const q = clamp01((GT - m.t0) / m.delay); if (m.ox === undefined || q >= 1) continue;                 // mortar shells on their arc
      const X = sx(m.ox + (m.x - m.ox) * q), Y = sy(m.oy + (m.y - m.oy) * q) - 320 * 4 * q * (1 - q); L.glow(X, Y, 26, CORAL, 0.9, 3); L.glow(X, Y, 9, [1, 0.95, 0.9], 1, 4); }
    G.blend('add'); for (const [x, y, k] of SIM.HOLOS) { if (!onS(x, y, 200)) continue; const zc = zcol(x, y), X = sx(x), Y = sy(y), fl = 0.75 + 0.25 * Math.sin(t * 7 + x) * Math.sin(t * 2.1 + y);
      L.solid(X - 90, Y - 50, 180, 100, zc, 0, 0, 0, 0.12 * fl); for (let j = 0; j < 10; j++) L.solid(X - 90, Y - 50 + j * 10 + ((t * 20) % 10), 180, 1.5, zc, 0, 0, 0, 0.18 * fl);
      for (const [a, b] of [[-90, -50], [90, -50], [-90, 50], [90, 50]]) L.glow(X + a, Y + b, 10, zc, 0.8, 4);
      for (let j = 0; j < 9; j++) { const x0 = X - 70 + j * 16, v0 = Math.sin(t * 1.7 + j * 0.9 + k * 3) * 22, v1 = Math.sin(t * 1.7 + (j + 1) * 0.9 + k * 3) * 22;
        L.solid(x0, Y + v0, Math.hypot(16, v1 - v0), 2.5, [1, 1, 1], Math.atan2(v1 - v0, 16), 0, 1.2, 0.6 * fl); }
      L.solid(X - 2, Y + 50, 4, 70, zc, 0, 0, 0, 0.25 * fl); } G.blend();

    if (ST.cryo && ST.cryo.until > GT && ST.cryo.r) { const X = sx(ST.x), Y = sy(ST.y - 50), r = ST.cryo.r, ca = ST.cryo.a;
      G.blend('add'); G.draw(L.P.arc, { u_a: ca, u_half: ST.cryo.half, u_age: 0.28 + 0.03 * Math.sin(GT * 20), u_col: [0.55, 0.68, 0.76] }, G.xf(X - r, Y - r, 2 * r, 2 * r)); G.blend();
      for (let j = 0; j < 9; j++) { const q = ((GT * 2.2 + j / 9) % 1), an = ca + (rnd(j, Math.floor(GT * 2.2 + j / 9)) - 0.5) * 2 * ST.cryo.half; L.puff(X + Math.cos(an) * r * q, Y + Math.sin(an) * r * q, 10 + 26 * q, [0.75, 0.92, 1], 0.45 * (1 - q), j); } }
    for (const q of ST.SQ || []) { if (GT < q.t0) continue; const k = clamp01((GT - q.t0) / (q.at - q.t0)), X = sx(q.x), Y = sy(q.y), c = q.evo ? ELEC_HI : ELEC, fl = Math.sin(GT * 40) > 0 ? 1 : 0.5;
      L.ring(X, Y, q.r * (1.6 - 0.6 * k), q.r * 0.62 * (1.6 - 0.6 * k), c, (0.4 + 0.5 * k) * fl, 0.05); pool(X, Y, q.r, q.r * 0.62, c, 0.18 * k, 2); }
    // ===== event FX =====
    let combo = null, lvlUp = null; const nums = [];
    for (const e of ST.ev) { const a = GT - e.t; if (a < 0) continue; const X = sx(e.x), Y = sy(e.y);
      if (e.k === 'step' && a < 0.35) { const q = a / 0.35; L.puff(X - ST.ux * 18, Y - 4 - 8 * q, 5 + 8 * q, [0.45, 0.5, 0.6], 0.35 * (1 - q), e.t * 10); }
      if (e.k === 'trace' && a < 0.32) { const q = a / 0.32; G.blend('add'); G.draw(L.P.arc, { u_a: e.a, u_half: e.half, u_age: q, u_col: e.evo ? CYAN_HI : CYAN }, G.xf(X - e.r, Y - e.r, 2 * e.r, 2 * e.r)); G.blend();
        if (a < 0.08) { L.star(X, Y, 46, [1, 0.85, 0.6], 1 - a / 0.08); L.glow(X, Y, 70, [1, 0.5, 0.3], 0.8 * (1 - a / 0.08), 3); } }
      if (e.k === 'hit' && a < 0.6 && e.d >= 1 && e.src !== 'boom') { const q = a / 0.6, hgt = 26 * (1 + 0.5 * Math.exp(-a * 14));
        nums.push({ id: e.id, t: e.t, s: String(e.d), x: X + (rnd(e.t, e.id) - 0.5) * 30, y: Y - 40 - 70 * Math.sqrt(q), h: hgt * (e.crit ? 1.45 : 1), a: clamp01((0.6 - a) / 0.25) }); }
      if (e.k === 'hit' && a < 0.25) { const q = a / 0.25; for (let j = 0; j < 4; j++) { const an = rnd(e.t, j + e.id) * 6.28, d = 10 + 40 * q; L.solid(X + Math.cos(an) * d, Y + Math.sin(an) * d, 7 * (1 - q) + 2, 3, [0.8, 1, 1], an, 0, 1.5, 1 - q); }
        if (a < 0.06) L.star(X, Y, 28, [1, 0.9, 0.7], 1 - a / 0.06); }
      if (e.k === 'kill' && a < 0.7 && !e.fly) { const q = a / 0.7, c = MINT;
        if (a > 0.3) for (let j = 0; j < 10; j++) { const qq = clamp01((a - 0.3) / 0.4), an = rnd(e.id, j) * 6.28, sp = 50 + 90 * rnd(j, e.id), d = sp * qq;
          L.solid(X + Math.cos(an) * d, Y - 30 + Math.sin(an) * d * 0.6 - 60 * qq + 90 * qq * qq, 8, 8, c, an + qq * 5, 4, 4, 1 - qq); }
        if (a > 0.3 && a < 0.42) L.glow(X, Y - 30, 50, c, 0.8 * (1 - (a - 0.3) / 0.12), 3); }
      if (e.k === 'boom' && a < 1.4) { const q = a / 1.4;
        if (a < 0.15) L.glow(X, Y, 380, [0.6, 0.9, 1], 1.6 * (1 - a / 0.15), 1.6);
        if (a < 0.45) for (let j = 0; j < 7; j++) { let px = X, py = Y - 40; const an = j * 0.9 + e.i, len = 60 + 160 * rnd(e.i, j);              // arcs of the overloaded cell
          for (let s = 0; s < 5; s++) { const nx = px + Math.cos(an) * len / 5 + (rnd(Math.floor(GT * 30) + s, j) - 0.5) * 26, ny = py + Math.sin(an) * len / 5 * 0.6 + (rnd(s, Math.floor(GT * 30) + j) - 0.5) * 20;
            L.solid(px, py, Math.hypot(nx - px, ny - py), 3, [0.75, 0.95, 1], Math.atan2(ny - py, nx - px), 0, 1.5, 1 - a / 0.45); px = nx; py = ny; } }
        L.glow(X, Y - 50, 260 * (0.6 + q), [0.35, 0.75, 1], 1.3 * (1 - q) * (1 - q), 1.3);                  // fireball body
        if (a < 0.6) { L.glow(X, Y - 60, 150 * (0.7 + a), [1, 0.95, 0.75], 2.4 * (1 - a / 0.6), 2.2); L.glow(X, Y - 60, 60, [1, 1, 0.95], 2 * (1 - a / 0.6), 3); }         // white-hot core
        if (a < 0.3) for (let j = 0; j < 8; j++) { const an = j * 0.785 + rnd(e.i, j + 40) * 0.5, r0 = 40 + 260 * (a / 0.3);                     // radial flame streaks
          L.solid(X + Math.cos(an) * r0 * 0.5, Y - 40 + Math.sin(an) * r0 * 0.35, r0 * 0.6, 7, [1, 0.85, 0.5], an, 0, 3.5, 0.9 * (1 - a / 0.3)); }
        for (let j = 0; j < 16; j++) { const an = rnd(e.i, j) * 6.28, r = (30 + 110 * rnd(j, e.i)) * Math.min(1, a * 4), lift = 160 * q * (0.5 + rnd(j, 3)),
          col = L.lerpP([0.9, 1, 1], L.lerpP([0.45, 0.6, 1], [0.1, 0.08, 0.16], clamp01((a - 0.25) / 0.6)), clamp01(a * 5));
          L.puff(X + Math.cos(an) * r, Y + Math.sin(an) * r * 0.5 - lift, (40 + 30 * rnd(j, 7)) * (0.6 + q), col, (1 - q) * 0.95, e.i * 10 + j); }
        for (let j = 0; j < 24; j++) { const an = -0.2 - rnd(e.i + 5, j) * 2.7, v = 300 + 600 * rnd(j, e.i + 9), qq = Math.min(a, 1);
          const hot = clamp01(1 - a / 0.35), sz = 6 + 10 * rnd(j, e.i + 2);                                                  // metal chunks: hot, then dark
          L.solid(X + Math.cos(an) * v * qq, Y + Math.sin(an) * v * qq + 900 * qq * qq, sz, sz * 0.6, L.lerpP([0.13, 0.13, 0.17], [1, 0.62, 0.25], hot), an + a * 12, sz / 2, sz * 0.3, 1 - q * q); }
        if (a < 0.35) L.cracks(X, Y + 30, 230, a, e.i * 7, 1, 1); }
      if (e.k === 'combo' && a < 2.2) combo = e;
      if (e.k === 'blast' && a < 0.6) { const q = a / 0.6; L.glow(X, Y, e.r * 1.4, e.evo ? PHYS_HI : PHYS, 0.9 * (1 - q), 2); L.ring(X, Y, e.r * (0.3 + q), e.r * 0.62 * (0.3 + q), [0.8, 1, 1], 1 - q, 0.1);
        for (let j = 0; j < 7; j++) { const an = rnd(e.t, j) * 6.28; L.puff(X + Math.cos(an) * e.r * 0.5 * q, Y + Math.sin(an) * e.r * 0.3 * q - 40 * q, 20 + 20 * q, [0.35, 0.3, 0.32], 0.7 * (1 - q), j + e.t); } }
      if (e.k === 'ping' && a < 0.5) { const q = ease(a / 0.5); L.ring(X, Y + 30, e.r * q, e.r * 0.62 * q, MINT, (1 - a / 0.5), 0.07); L.ring(X, Y + 30, e.r * q * 0.8, e.r * 0.5 * q, MINT, 0.5 * (1 - a / 0.5), 0.04); }
      if (e.k === 'pop' && a < 0.25) { L.star(X, Y, 30, [0.85, 1, 1], 1 - a / 0.25); L.ring(X, Y, 10 + 40 * a / 0.25, 10 + 40 * a / 0.25, CYAN, 1 - a / 0.25, 0.1); }
      if (e.k === 'strike' && a < 0.3) { const q = a / 0.3, r = 30 + 50 * q; L.ring(X, Y - 20, r, r * 0.7, CORAL, 1 - q, 0.12); }
      if (e.k === 'mortar' && a < 0.7) { const q = a / 0.7; L.glow(X, Y, e.r * 1.3, [1, 0.45, 0.25], 1.2 * (1 - q), 2); for (let j = 0; j < 8; j++) { const an = rnd(e.t, j) * 6.28;
        L.puff(X + Math.cos(an) * e.r * 0.6 * q, Y + Math.sin(an) * e.r * 0.4 * q - 70 * q, 22 + 26 * q, [0.5, 0.35, 0.6], 0.8 * (1 - q), j); } if (a < 0.3) L.cracks(X, Y, e.r * 1.2, a, e.t, 1, 0.8); }
      if (e.k === 'slam' && a < 0.8) { const q = a / 0.8; L.ring(X, Y, e.r * (0.3 + 0.8 * q), e.r * 0.66 * (0.3 + 0.8 * q), [1, 0.4, 0.3], 1 - q, 0.06); if (a < 0.4) L.cracks(X, Y, 260, a, e.id, 1, 1);
        for (let j = 0; j < 10; j++) { const an = rnd(e.t, j) * 6.28; L.puff(X + Math.cos(an) * 200 * q, Y + Math.sin(an) * 130 * q, 30, [0.4, 0.38, 0.45], 0.6 * (1 - q), j); } }
      if (e.k === 'gem' && a < 0.3) L.star(X, Y, 26, [0.5, 1, 0.7], 1 - a / 0.3);
      if ((e.k === 'bar' || e.k === 'heal') && a < 0.5) { const q = a / 0.5; L.ring(X, Y - 20, 20 + 40 * q, 20 + 40 * q, e.k === 'bar' ? CYAN : MINT, 1 - q, 0.1); }
      if (e.k === 'hurt' && a < 0.3) L.solid(0, 0, W, H, [0.7, 0.05, 0.05], 0, 0, 0, 0.22 * (1 - a / 0.3));
      if (e.k === 'lvl' && a < 1.5) { const q = a / 1.5; L.ring(X, Y + 50, 60 + 160 * q, (60 + 160 * q) * 0.62, [1, 0.85, 0.4], 1 - q, 0.06); lvlUp = e; }
      if (e.k === 'pulse' && a < 0.5) { const q = a / 0.5, c = CORAL; L.ring(X, Y, e.r * (0.3 + 0.8 * q), e.r * 0.66 * (0.3 + 0.8 * q), c, 1 - q, 0.07); pool(X, Y, e.r, e.r * 0.66, c, 0.4 * (1 - q), 1.5); }
      if (e.k === 'fire' && a < 0.12) L.star(X, Y, 36, [1, 0.9, 0.7], 1 - a / 0.12);
      if (e.k === 'spark' && a < 0.25) { const q = a / 0.25; for (let j = 0; j < 5; j++) { const an = rnd(e.t, j) * 6.28; L.solid(X + Math.cos(an) * 20 * q, Y + Math.sin(an) * 20 * q, 6, 2, [1, 0.9, 0.6], an, 0, 1, 1 - q); } }
      if (e.k === 'capture' && a < 1.6) { const q = a / 1.6; L.ring(X, Y, SIM.NODE_R * (1 + q), SIM.NODE_R * 0.62 * (1 + q), MINT, 1 - q, 0.05); if (a < 0.2) L.glow(X, Y, 300, MINT, 1.2 * (1 - a / 0.2), 1.6); }
      if (e.k === 'splash' && a < 0.45) { const q = a / 0.45; L.ring(X, Y, e.r * (0.4 + 0.7 * q), e.r * 0.62 * (0.4 + 0.7 * q), CORAL, 1 - q, 0.08);
        for (let j = 0; j < 7; j++) { const an = rnd(e.t, j) * 6.28, d = e.r * 0.8 * q; L.solid(X + Math.cos(an) * d, Y + Math.sin(an) * d * 0.62 - 40 * q + 60 * q * q, 9, 7, [0.6, 0.85, 0.5], an, 4, 3, 1 - q); } }
      if (e.k === 'spin' && a < 0.3) L.star(X, Y - 50, 50, [1, 0.8, 0.7], 1 - a / 0.3);
      if (e.k === 'tickets' && a < 0.7) { const q = a / 0.7; L.ring(X, Y - 120, 40 + 260 * q, (40 + 260 * q) * 0.62, CORAL, 1 - q, 0.05); }
      if (e.k === 'beam' && a < 0.12) L.star(X, Y, 60, [1, 0.9, 0.8], 1 - a / 0.12);
      if (e.k === 'chain' && a < 0.22) { const q = 1 - a / 0.22, c = e.hero ? heroCol(ST) : e.evo ? ELEC_HI : ELEC, fr = Math.floor(GT * 40); G.blend('add');
        for (let j = 0; j + 1 < e.pts.length; j++) { let [x0, y0] = e.pts[j], [x1, y1] = e.pts[j + 1]; x0 = sx(x0); y0 = sy(y0); x1 = sx(x1); y1 = sy(y1); let px0 = x0, py0 = y0;
          for (let k = 1; k <= 5; k++) { const u = k / 5, nx = x0 + (x1 - x0) * u + (k < 5 ? (rnd(fr + k, j) - 0.5) * 34 : 0), ny = y0 + (y1 - y0) * u + (k < 5 ? (rnd(j, fr + k) - 0.5) * 34 : 0);
            L.solid(px0, py0, Math.hypot(nx - px0, ny - py0), 3.5, [0.9, 1, 1], Math.atan2(ny - py0, nx - px0), 0, 1.5, q); L.solid(px0, py0, Math.hypot(nx - px0, ny - py0), 9, c, Math.atan2(ny - py0, nx - px0), 0, 4, 0.5 * q); px0 = nx; py0 = ny; }
          L.glow(x1, y1, 34, c, q, 3); } G.blend(); }
      if (e.k === 'bolt' && a < 0.4) { const q = 1 - a / 0.4, c = e.evo ? ELEC_HI : ELEC, fr = Math.floor(GT * 30); G.blend('add'); let px0 = X + (rnd(fr, e.x) - 0.5) * 80, py0 = Y - 760;
        for (let k = 1; k <= 8; k++) { const nx = X + (k < 8 ? (rnd(fr + k, e.y) - 0.5) * 70 : 0), ny = Y - 760 + 760 * k / 8 - 20;
          L.solid(px0, py0, Math.hypot(nx - px0, ny - py0), 5, [0.92, 1, 1], Math.atan2(ny - py0, nx - px0), 0, 2, q); L.solid(px0, py0, Math.hypot(nx - px0, ny - py0), 14, c, Math.atan2(ny - py0, nx - px0), 0, 6, 0.45 * q); px0 = nx; py0 = ny; }
        L.ring(X, Y, e.r * (1.4 - 0.4 * q), e.r * 0.62 * (1.4 - 0.4 * q), c, q, 0.08); if (a < 0.06) L.glow(X, Y - 20, e.r * 1.1, [0.9, 1, 1], 0.55 * q, 2.5); G.blend(); }
      if (e.k === 'turret' && a < 0.4) { const q = a / 0.4; L.ring(X, Y, 30 + 60 * q, 18 + 36 * q, CYAN, 1 - q, 0.1); }
      if (e.k === 'tfire' && a < 0.06) L.star(X, Y, 22, [0.85, 1, 1], 1 - a / 0.06);
      if (e.k === 'evo' && a < 1.6) { const q = a / 1.6; G.blend('add'); L.ring(X, Y + 60, 80 + 420 * q, (80 + 420 * q) * 0.62, MINT, 1 - q, 0.04); if (a < 0.25) L.glow(X, Y, 360, MINT, 1.3 * (1 - a / 0.25), 1.5);
        for (let j = 0; j < 14; j++) { const an = j * 0.449, d = 60 + 300 * q; L.solid(X + Math.cos(an) * d, Y + Math.sin(an) * d * 0.62, 16, 4, [0.85, 1, 0.95], an, 0, 2, 1 - q); } G.blend(); }
      if (e.k === 'chest' && a < 0.8) { const q = a / 0.8; L.ring(X, Y, 30 + 160 * q, 20 + 100 * q, MINT, 1 - q, 0.08); if (a < 0.15) L.glow(X, Y - 30, 160, MINT, 1 - a / 0.15, 2); }
      if (e.k === 'scan' && a < 0.45) { const q = a / 0.45, c = heroCol(ST), R = e.r, ry = R * 0.62, Y0 = Y + 6; G.blend('add');        // QA: the check square, a sweep line, corner ticks
        for (const [x0, y0, w, h] of [[X - R, Y0 - ry, 2 * R, 3], [X - R, Y0 + ry, 2 * R, 3], [X - R, Y0 - ry, 3, 2 * ry], [X + R, Y0 - ry, 3, 2 * ry]]) L.solid(x0, y0, w, h, c, 0, 0, 0, 0.85 * (1 - q));
        L.solid(X - R, Y0 - ry + 2 * ry * ease(q), 2 * R, 4, [0.85, 1, 0.95], 0, 0, 0, 0.8 * (1 - q)); pool(X, Y0, R, ry, c, 0.18 * (1 - q), 2);
        for (const [sx2, sy2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { L.solid(X + sx2 * R - (sx2 > 0 ? 26 : 0), Y0 + sy2 * ry - 2, 26, 5, [0.9, 1, 1], 0, 0, 0, 1 - q); L.solid(X + sx2 * R - 2, Y0 + sy2 * ry - (sy2 > 0 ? 22 : 0), 5, 22, [0.9, 1, 1], 0, 0, 0, 1 - q); } G.blend(); }
      if (e.k === 'summon' && a < 0.6) { const q = a / 0.6; L.ring(X, Y, 120 + 200 * q, 80 + 130 * q, [1, 0.3, 0.3], 1 - q, 0.05); }
    }
    // damage numbers: the newest per foe, never on top of each other or of the combo line (newest first)
    { const seen = new Set(), taken = []; if (combo) taken.push([sx(combo.x) - 260, sy(combo.y) - 90, 520, 120]);
      nums.sort((p, q) => q.t - p.t); for (const n of nums) { if (seen.has(n.id)) continue; seen.add(n.id); const w = n.h * 0.62 * n.s.length + 10, b = [n.x - w / 2, n.y - n.h * 0.6, w, n.h * 1.2];
        if (taken.some((r) => b[0] < r[0] + r[2] && b[0] + b[2] > r[0] && b[1] < r[1] + r[3] && b[1] + b[3] > r[1])) continue; taken.push(b);
        L.uiBox('dmg', b[0] - 4, b[1] - 4, b[2] + 8, b[3] + 8, 0); L.text(n.s, n.x, n.y, n.h, 0.5, n.a); } }
    // events whose target landed or died: flying foes' land puff
    for (const e of ST.ev) { const a = GT - e.t; if (e.k === 'land' && a >= 0 && a < 0.4) L.puff(sx(e.x), sy(e.y) - 8, 20 + 30 * a, [0.4, 0.42, 0.5], 0.6 * (1 - a / 0.4), e.id); }
    zoneFx(t, cx, cy, sx, sy, onS, rnd);
    L.finish(t, FIN);
    // the blackout over the graded world (the HUD stays lit); it fades in and out over 0.6 s
    if (ST.darkT && GT < ST.darkT + 0.6) { const a = 0.9 * clamp01((ST.darkT - GT + 0.6) / 0.6) * clamp01((GT - (ST.darkT - (ST.darkDur || 9))) / 0.6 + 0.0001), hs = { u_view: [W, H], u_amt: a, u_h0: [sx(ST.x), sy(ST.y) - 40, 300] };
      SIM.ZONES.forEach((z, i) => { hs['u_h' + (i + 1)] = [sx(z.nx), sy(z.ny), SIM.NODE_R * 1.1]; });
      G.blend(); G.draw(L.P.dark, hs, G.xf(0, 0, W, H)); }

    // ===== HUD (screen space, after the grade) =====
    const MS = window.META && (S.state ? ST.qaMenu : 'live'); if (MS && MS !== 'live') { META.go(MS, true); META.tab(ST.qaTab || 'up'); META.ctab(ST.qaCtab || 'items'); META.acat(ST.qaCat || 'survival'); if (ST.qaSusp) META.setSuspended(ST.qaSusp); }
    if (window.META && S.state && (ST.qaPause || ST.qaMenu)) { if (ST.qaPause) META.PAUSE.open(); else META.PAUSE.close(); }
    if (MS) menu(GT, t); else { hud(ST, GT, t, combo, lvlUp, sx, sy); touchUI(ST, GT); }
    G.flush(); unlerp();
  };

  function zoneFx(t, cx, cy, sx, sy, onS, rnd) {
    for (const [k, x, y] of SIM.PROPS) { if (!onS(x, y, 200)) continue;
      if (k === 'crac') for (let j = 0; j < 3; j++) { const ph = (t * 0.35 + j / 3 + (x % 7) * 0.1) % 1; L.puff(sx(x) + (j - 1) * 40 + 30 * ph, sy(y) - 190 - 90 * ph, 30 + 40 * ph, [0.6, 1, 0.92], 0.12 * Math.sin(Math.PI * ph), x + j); }
      if (k === 'ups') { const w = Math.floor(t * 1.7 + x * 0.01); if (rnd(w, x) > 0.85) { const a = (t * 1.7 + x * 0.01) % 1; if (a < 0.25) { let px = sx(x) - 60, py = sy(y) - 90;
        G.blend('add'); for (let s2 = 0; s2 < 6; s2++) { const nx = px + 22, ny = sy(y) - 90 + (rnd(w + s2, x) - 0.5) * 30; L.solid(px, py, Math.hypot(nx - px, ny - py), 2.5, [1, 0.95, 0.6], Math.atan2(ny - py, nx - px), 0, 1.2, 1 - a / 0.25); px = nx; py = ny; } G.blend(); } } } }
    const z = SIM.ZONES[3]; if (z && onS((z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2, 2600)) { G.blend('add');                    // data rain over NOC
      for (let i = 0; i < 70; i++) { const wx = z.x0 + ((i * 397) % (z.x1 - z.x0)), sp = 260 + 200 * rnd(i, 3), wy = z.y0 + ((t * sp + i * 911) % (z.y1 - z.y0));
        if (!onS(wx, wy, 0)) continue; for (let j = 0; j < 6; j++) L.solid(sx(wx), sy(wy) - j * 16, 3, 10, [0.45, 0.85, 1], 0, 0, 0, 0.5 * (1 - j / 6)); } G.blend(); }
  }
  // draws a group under a 2D affine around the scene (thrown foes spin as one body: a physics tumble, not an action)
  function drawRot(m0, draw) { const sp = L.sprite, tb = L.twoBone; const wrapM = (o) => { if (o.m) return Object.assign({}, o, { m: M.mul(m0, o.m) }); return o; };
    L.sprite = (n, x, y, o = {}) => { if (o.m) return sp(n, x, y, wrapM(o)); const tx = G.tex(n), src = o.src || [0, 0, 1, 1]; let w = o.w, h = o.h; const sw = tx.w * (src[2] - src[0]), sh = tx.h * (src[3] - src[1]);
      if (w && !h) h = w * sh / sw; if (h && !w) w = h * sw / sh; if (!w) { w = sw; h = sh; } return sp(n, 0, 0, Object.assign({}, o, { m: M.mul(m0, M.t(x, y)), pivot: [0, 0], w, h })); };
    try { draw(); } finally { L.sprite = sp; L.twoBone = tb; } }
  // the scanner's grip and window in its source drawing (art px, before prep's trim); re-measured when the art changes
  const TOOL = { scanner: { grip: [75, 148], tip: [252, 76] } };                    // round 23: the slim scanner of hero_v2_sheet

  // ---------------- the training centre ----------------
  // a maze wall: the floor rectangle lifted by WALL_H is its top face; a strip whose south edge is the wall's also shows the front face
  const WALL_H = 200;                                                         // as tall as the rack rows the east-west walls are made of
  function wallSeg(x, y, w, h, front, cap, sx, sy, zc, t, l = 0.5, side = true) {   // side: a north-south wall's strip (east-west walls are rack rows)
    const X = sx(x), Y = sy(y), top = Y - WALL_H, rim = L.lerpP(zc, [1, 1, 1], 0.35), k = 0.75 + 0.6 * l;
    L.solid(X, top, w, h + 0.8, !side ? [0.075 * k, 0.105 * k, 0.13 * k] : [0.1 * k, 0.15 * k, 0.185 * k], 0, 0, 0, 1);   // a side wall's top is lighter than the floor: it reads as raised
    if (!side) { L.solid(X, top, w, 2, rim, 0, 0, 0, 0.55); L.solid(X, top + h / 2 - 1.5, w, 3, zc, 0, 0, 0, 0.28); }
    else { L.solid(X, top, 2, h + 0.8, rim, 0, 0, 0, 0.45);  if (cap) L.solid(X, top, w, 2, rim, 0, 0, 0, 0.55);
      // a north-south wall is a rack row seen from above: a divider between racks and side LEDs on every strip, a rack's front at its south end
      const hi = L.lerpP(zc, [1, 1, 1], 0.55), dk = [0.012, 0.018, 0.024];
      L.solid(X, top, 4, h + 0.8, hi, 0, 0, 0, 0.75 * k); L.solid(X + 4, top, 6, h + 0.8, hi, 0, 0, 0, 0.18 * k); L.solid(X + w - 8, top, 8, h + 0.8, dk, 0, 0, 0, 0.9);            // lit west edge, shaded east edge
      L.solid(X + 5, top, w - 12, 2, hi, 0, 0, 0, 0.3); L.solid(X + 5, top + h - 4, w - 12, 4, dk, 0, 0, 0, 0.9);            // each rack's far lip and the break before the next
      for (let q = 0; q < 3 && 14 + q * 20 < h - 16; q++) { L.solid(X + 18, top + 14 + q * 20, w - 40, 7, [0.02, 0.03, 0.04], 0, 0, 0, 1); L.solid(X + 18, top + 21 + q * 20, w - 40, 1.5, hi, 0, 0, 0, 0.25); }   // vent slots
      L.solid(X + 18, top + h - 18, w - 40, 3, zc, 0, 0, 0, 0.22); G.blend('add');
      for (let q = 0; q < 2; q++) { const on = L.rnd(Math.floor(t * (1.5 + L.rnd(x, y + q) * 3)), y * 3 + q + x) > 0.45; if (on) L.glow(X + (q ? w - 9 : 9), top + h * (0.3 + 0.4 * q), 8, [[0.25, 0.66, 1], [1, 0.74, 0.34], [0.36, 1, 0.6]][(Math.round(y / 80) + q) % 3], 0.9, 4); }
      G.blend();
      if (front) { const k = Math.round(y / 80) % 2 ? 'rack' : 'rack_b', [rw0, rh0] = sizeOf(k, Z[k][1]), rh = WALL_H + 6, rw = rw0 * rh / rh0;
        L.sprite(k, X + w / 2 - rw / 2, Y + h - rh + 4, { w: rw, h: rh, u: { grade: [0.75, 0.9, 0, 1.05], tint: [0.8, 0.95, 1.12, 0.4], rim: [0.55, 0.004, -0.004, 1.2], rimCol: zc } }); }
      return; }
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
    a.questions.forEach((q, i) => { const res = (a.res || [])[i], rec = res !== undefined, cur = i === a.index && a.phase === 'question';
      const c = !rec ? (cur ? CYAN : [0.12, 0.2, 0.24]) : res ? MINT : CORAL; L.rrect(px0 + pw - 60 - (a.questions.length - i) * 44, py0 + 30, 34, 34, 8, c, c, rec || cur ? 0.9 : 1); });
    const btn = (s, on) => { const r = SIM.QUIZ_BTN, h = hov(r); L.uiBox('qzb', r[0], r[1], r[2], r[3], 8); frame(r[0], r[1], r[2], r[3], on ? 0.95 : 0.6, on ? (h ? [0.6, 1, 1] : CYAN) : [0.13, 0.33, 0.39]);
      if (on && h) L.rrect(r[0], r[1], r[2], r[3], 4, [0.0, 0.45, 0.55], [0.0, 0.3, 0.38], 0.3); label('qzbt', s, r[0] + r[2] / 2, r[1] + r[3] / 2, { size: 30, al: 0.5, col: on ? '#ffffff' : '#6f8a90' }); };
    const para = (id, s, x, y, size, maxW, col, lh, max = 8) => { const ls = wrap(s, size, maxW).slice(0, max); ls.forEach((ln, j) => label(id + j, ln, x, y + j * lh, { size, col })); return ls.length * lh; };
    if (a.phase === 'intro') { let y = py0 + 140;
      label('qzt', rev ? 'Вторая жизнь' : topic.name, px0 + 60, y, { size: 46, col: '#ffffff' }); y += 70;
      if (topic) y += para('qzn', topic.note, px0 + 60, y, 26, pw - 120, '#a9c9cf', 36) + 30;
      const rules = rev ? ['Ответь верно на ' + ER.passing + ' из ' + ER.questions + ' — вернёшься в бой с ' + Math.round(ER.reviveHealth * 100) + '% здоровья и ' + ER.reviveInvulnerability + ' с неуязвимости.', 'Не сдашь — смена закончится. Возрождение одно на смену.']
        : [ER.questions + ' вопроса, нужно ' + ER.passing + ' верных. Игра стоит, пока идёт тест.', 'Сдал: терминал пройден, награда (' + ER.questions + ' верных — капсула и лечение, ' + ER.passing + ' — лечение).', 'Не сдал: терминал закрыт на ' + ER.failLock + ' с, волны усилены. Каждая ошибка зовёт аудит.'];
      rules.forEach((r, j) => { L.rrect(px0 + 60, y + j * 54 - 10, 12, 12, 3, rev ? CORAL : CYAN); label('qzr' + j, r, px0 + 90, y + j * 54, { size: 26, col: '#e6fdff' }); });
      btn('Начать' + kb(' · Enter'), true); return; }
    if (a.phase === 'result') { const ok = a.passed; label('qzt', ok ? 'ТЕСТ СДАН' : 'ТЕСТ НЕ СДАН', W / 2, py0 + 220, { size: 72, al: 0.5, col: ok ? '#64ffda' : '#ff6559' });
      label('qzc', 'Верных ответов: ' + a.correct + ' из ' + a.questions.length, W / 2, py0 + 320, { size: 34, al: 0.5, col: '#e6fdff' });
      const wrong = a.answered - a.correct, lines = rev ? [ok ? 'Возвращаешься в бой с ' + Math.round(ER.reviveHealth * 100) + '% здоровья.' : 'Смена окончена.']
        : (ok ? [a.correct >= ER.questions ? 'Награда: капсула обновления и лечение у терминала.' : 'Награда: лечение у терминала.'] : ['Терминал закрыт на ' + ER.failLock + ' с, волны усилены на ' + ER.surge.seconds + ' с.'])
          .concat(wrong > 0 ? ['Аудит: ' + Math.min(ER.auditMax, wrong) * ER.auditPack + ' врагов идут на проверку.'] : []);
      lines.forEach((s, j) => label('qzl' + j, s, W / 2, py0 + 410 + j * 50, { size: 28, al: 0.5, col: j === 0 ? (ok ? '#c8fff0' : '#ffd6cf') : '#ffd6cf' }));
      label('qzp2', 'Очки обучения: ' + ed.points, W / 2, py0 + 560, { size: 30, al: 0.5, col: '#7ff6ff' });
      btn((rev && !ok ? 'К итогам' : 'Продолжить') + kb(' · Enter'), true); return; }
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
      btn(a.selected.length ? 'Ответить' + kb(' · Enter') : 'Выберите ответ' + kb(' · 1–' + n), !!a.selected.length); return; }
    // feedback: the verdict, what was picked, the key and the explanation
    const ok = a.lastCorrect; let y = py0 + 330; label('qzv', ok ? 'ВЕРНО' : 'НЕВЕРНО', px0 + 60, y, { size: 52, col: ok ? '#64ffda' : '#ff6559' }); y += 64;
    if (!ok) { label('qzyh', 'Ваш ответ:', px0 + 60, y, { size: 24, col: '#ff8f85' }); y += 34; a.selected.forEach((id, j) => { y += para('qzy' + j + '_', '— ' + opt(id), px0 + 80, y, 23, pw - 160, '#ffd6cf', 30, 2); }); y += 10; }
    label('qzch', ok ? 'Ответ:' : 'Верно:', px0 + 60, y, { size: 24, col: '#64ffda' }); y += 34; q.correct.forEach((id, j) => { y += para('qzc' + j + '_', '— ' + opt(id), px0 + 80, y, 23, pw - 160, '#c8fff0', 30, 2); }); y += 14;
    if (q.explanation) para('qze', q.explanation, px0 + 60, y, 24, pw - 120, '#a9c9cf', 33, 4);
    btn((a.index + 1 < a.questions.length ? 'Следующий вопрос' : 'Итог теста') + kb(' · Enter'), true); }
  // a minimap of a map's generated layout (map select): zones and solids for the data centre, walls, terminals and the door for the training centre
  const MINI = {}; function minimap(map, x, y, w, h) { const LV = MINI[map] || (MINI[map] = SIM.buildLevel(map, 7, 0)), k = Math.min(w / 8000, h / 6000), ox = x + (w - 8000 * k) / 2, oy = y + (h - 6000 * k) / 2;
    L.rrect(ox - 6, oy - 6, 8000 * k + 12, 6000 * k + 12, 6, [0.02, 0.05, 0.07], [0.01, 0.03, 0.05]);
    for (const z of LV.ZONES) { L.solid(ox + z.x0 * k, oy + z.y0 * k, (z.x1 - z.x0) * k, (z.y1 - z.y0) * k, z.col, 0, 0, 0, 0.12); G.blend('add'); L.glow(ox + z.nx * k, oy + z.ny * k, 26, z.col, 0.6, 2); G.blend(); }
    for (const b of LV.BOXES) { if (b.tank) continue; L.solid(ox + (b.x - b.hw) * k, oy + (b.y - b.hh) * k, Math.max(1.5, b.hw * 2 * k), Math.max(1.5, b.hh * 2 * k), b.k === 'wall' ? (LV.col || CYAN) : [0.35, 0.55, 0.62], 0, 0, 0, b.k === 'wall' ? 0.85 : 0.7); }
    for (const tm of LV.TERMS || []) { G.blend('add'); L.glow(ox + tm.cx * k, oy + tm.cy * k, 20, [1, 0.84, 0.3], 0.9, 2); G.blend(); }
    if (LV.EXIT) { G.blend('add'); L.glow(ox + LV.EXIT[0] * k, oy + LV.EXIT[1] * k, 22, MINT, 0.9, 2); G.blend(); }
    const st = LV.START || SIM.SPAWN; L.rrect(ox + st[0] * k - 5, oy + st[1] * k - 5, 10, 10, 5, [1, 1, 1]); }

  // ---------------- HUD ----------------
  const label = (slot, str, x, y, o = {}) => L.label(slot, str, x, y, Object.assign({ font: MONO, out: '#02090d' }, o));
  const frame = (x, y, w, h, a = 0.85, c = CYAN) => { L.rrect(x - 2, y - 2, w + 4, h + 4, 5, c, c, 0.55 * a); L.rrect(x, y, w, h, 4, [0.02, 0.06, 0.08], [0.01, 0.03, 0.05], a); };
  function bar(id, x, y, w, h, q, c0, c1, lab, size, tc) { L.uiBox(id, x - 4, y - 4, w + 8, h + 8, 2);
    frame(x - 3, y - 3, w + 6, h + 6, 0.85); for (let i = 0; i < Math.floor(w / 12); i++) if ((i + 0.5) / Math.floor(w / 12) <= q) L.rrect(x + i * 12 + 1, y + 1, 10, h - 2, 2, c0, c1);
    const label = lab;
    if (label) L.label(id + '_t', label, x + w / 2, y + h / 2, { size, al: 0.5, col: tc || '#e6fdff', out: '#02090d', font: MONO }); }
  function panel(id, x, y, w, h, a = 0.82) { L.uiBox(id, x, y, w, h, 6); frame(x, y, w, h, a); }
  // the touch controls (stage 7a of docs/PLAN-FEEDBACK-27-10.md, page state in window.TOUCH): the stick, «Рывок», «E» with its cooldown,
  // the pause; on the results a «В меню» button (a tap elsewhere starts a new shift)
  function touchUI(ST, GT) { const T = window.TOUCH; if (!T || !T.on || !S.state || ST.demo || (window.META && META.PAUSE.isOpen)) return; const big = uiCK() > 1 ? 1.8 : 1;   // phones: larger words
    if (ST.over) { if (GT - ST.over.t < 1.4) return; const [x, y, w, h] = T.menu; L.uiBox('tmn', x, y, w, h, 8); frame(x, y, w, h, 0.95, CYAN);
      label('tmn', 'В меню', x + w / 2, y + h / 2, { size: 34 * big, al: 0.5, col: '#ffffff' }); label('tmh', 'Коснитесь в другом месте — новая смена', W / 2, y - 16 * big, { size: 22 * big, al: 0.5, col: '#a9c9cf' }); return; }
    if (ST.pick || (ST.ed && ST.ed.active)) return;
    const disc = (c, col, a) => { L.glow(c[0], c[1], c[2] * 1.15, col, a * 0.35, 2.2); L.ring(c[0], c[1], c[2], c[2], col, 0.85 * a, 0.05); };
    if (T.stick) { const s = T.stick; disc([s.x0, s.y0, T.R], CYAN, 0.8); L.glow(s.x, s.y, 70, CYAN, 0.7, 2.6); L.ring(s.x, s.y, 46, 46, [0.85, 1, 1], 0.95, 0.12); }
    else { label('tst', 'Держите палец слева — движение', 70, H - 60, { size: 20 * big, col: 'rgba(191,227,234,0.6)' }); }
    const cdE = ST.ab ? ST.ab.cd : 0, cdD = ST.dashCD || 0;
    disc(T.use, cdE > 0 ? [0.4, 0.5, 0.55] : MINT, T.held.use !== undefined ? 1 : 0.8); label('tue', 'E', T.use[0], T.use[1] - 6, { size: 56, al: 0.5, col: cdE > 0 ? '#7f9ea6' : '#ffffff' });
    if (cdE > 0) label('tuc', Math.ceil(cdE) + ' с', T.use[0], T.use[1] + 46, { size: 22 * big, al: 0.5, col: '#cfe9ee' });
    disc(T.dash, cdD > 0 ? [0.4, 0.5, 0.55] : CYAN, T.held.dash !== undefined ? 1 : 0.8); label('tud', 'Рывок', T.dash[0], T.dash[1], { size: 24 * Math.min(big, 1.5), al: 0.5, col: cdD > 0 ? '#7f9ea6' : '#ffffff' });
    const [px, py, pr] = T.pause; disc(T.pause, [0.75, 0.85, 0.9], 0.8); L.rrect(px - 16, py - 20, 11, 40, 3, [0.9, 1, 1]); L.rrect(px + 5, py - 20, 11, 40, 3, [0.9, 1, 1]); }
  // phones and tablets (META's compact interface, stage 7б): the HUD's own panels are drawn HK× larger (in a W/HK × H/HK space), the
  // level-up cards, the tests and the results get compact layouts at CK×; what is tied to the world (markers, the crosshair, floating
  // text) stays at 1. S.hits maps a compact rect (view px) to the sim's rect for the same choice: the page sends a tap there instead.
  S.hits = [];
  const uiCK = () => (window.META && META.view ? META.view().U : 1);
  // key and mouse hints only without touch: a phone or tablet taps buttons and has no Enter, Esc or wheel
  const KB = () => !(window.TOUCH && TOUCH.on), kb = (s) => (KB() ? s : '');
  const scaled = (k, fn) => { G.uiK = k; try { fn(SIM.VIEW.W / k, SIM.VIEW.H / k); } finally { G.uiK = 1; } };
  const hitMap = (k, r, simR) => S.hits.push([[r[0] * k, r[1] * k, r[2] * k, r[3] * k], simR]);
  function hud(ST, GT, t, combo, lvlUp, sx, sy) { const sx0 = sx, sy0 = sy, CK = uiCK(), HK = CK > 1 ? 1.6 : 1; S.hits = [];
    if (ST.ed && ST.ed.active && !ST.over) { if (CK > 1) scaled(CK, (W, H) => quizC(ST, GT, t, W, H, CK)); else quiz(ST, GT, t); return; }   // a test covers the whole HUD
    if (window.META && S.state && META.PAUSE.isOpen) { const P = META.PAUSE.view(), K = META.view().U; G.uiK = K; try { const W = SIM.VIEW.W / K, H = SIM.VIEW.H / K;   // the pause menu (compact: META's logical space)
      L.solid(0, 0, W, H, [0.01, 0.02, 0.04], 0, 0, 0, 0.72);
      if (K > 1) label('pzt', 'ПАУЗА', W / 2, 36, { size: 34, al: 0.5, col: '#7ff6ff' }); else { L.uiBox('pzt', W / 2 - 340, 170, 680, 90, 8); label('pzt', 'ПАУЗА', W / 2, 215, { size: 64, al: 0.5, col: '#7ff6ff' }); }
      P.items.forEach((o, i) => { const [x, y, w, h] = o.r, on = i === P.sel; L.uiBox('pz' + i, x, y, w, h, 8); frame(x, y, w, h, on ? 0.95 : 0.8, on ? CYAN : [0.13, 0.33, 0.39]);
        if (on) { L.rrect(x, y, w, h, 4, [0.0, 0.45, 0.55], [0.0, 0.3, 0.38], 0.22); L.rrect(x + 4, y + 8, 5, h - 16, 2, CYAN); }
        label('pzs' + i, o.s, x + w / 2, y + h / 2, { size: K > 1 ? 26 : 30, al: 0.5, col: on ? '#ffffff' : o.id === 'end' ? '#ffd6cf' : '#bfe3ea' }); });
      if (K === 1 && KB()) { L.uiBox('pzh', W / 2 - 460, 872, 920, 50, 6); label('pzh', '↑↓ или мышь — выбор · Enter — подтвердить · Esc — продолжить', W / 2, 897, { size: 22, al: 0.5, col: '#7f9ea6' }); } } finally { G.uiK = 1; }
      return; }
    const hm = SIM.hpMax(ST);
    scaled(HK, (W, H) => {
    // HP and XP (top-left)
    ico('ic_hp', 18, 12, { w: 52, h: 52 });
    bar('hp', 78, 20, 300, 30, ST.hp / hm, [1, 0.45, 0.4], [0.85, 0.25, 0.22], Math.ceil(ST.hp) + ' / ' + hm, 22);
    bar('xp', 78, 64, 270, 20, ST.xp / ST.xpNext, [0.3, 1, 0.85], [0.0, 0.75, 0.85], 'УР. ' + ST.lvl, 17, '#e6fdff');
    // clock (top-centre) and kills (top-right)
    const clk = mmss((ST.clock0 || 0) + ST.t), cw = L.labelW('clock', clk, { size: 58 });
    panel('clockp', W / 2 - cw / 2 - 22, 10, cw + 44, 76, 0.55); label('clock', clk, W / 2, 48, { size: 58, al: 0.5, col: '#ffffff' });
    const ks = 'Сбоев устранено: ' + ST.kills, kw = L.labelW('kills', ks, { size: 24 });
    panel('killp', W - kw - 60, 18, kw + 40, 50, 0.6); label('kills', ks, W - 40, 43, { size: 24, al: 1, col: '#bff8ff' });
    if (ST.bars) { const bs = '× ' + ST.bars, bw = L.labelW('bars', bs, { size: 24 }); panel('barp', W - bw - 110, 76, bw + 90, 46, 0.6); L.sprite('code_tex', W - bw - 92, 79, { w: 38, h: 38 }); label('bars', bs, W - 40, 99, { size: 24, al: 1, col: '#7ff6ff' }); }
    // weapon slots (bottom-centre), passives to the right
    const ws = Object.keys(ST.wp), n = ws.length, S0 = 92, gap = 14, x0 = W / 2 - (n * S0 + (n - 1) * gap) / 2, y0 = H - S0 - 26;
    ws.forEach((id, i) => { const x = x0 + i * (S0 + gap), st = SIM.wstat(id, ST.wp[id]);
      const evo = SIM.WEAP[id].evo; L.uiBox('slot' + i, x, y0, S0, S0, 4); frame(x, y0, S0, S0, 0.9, evo ? MINT : CYAN);
      if (evo) { G.blend('add'); L.glow(x + S0 / 2, y0 + S0 / 2, S0 * 0.7, MINT, 0.35 + 0.15 * Math.sin(GT * 3 + i), 2); G.blend(); }
      ico(icn(SIM.WEAP[id].ic), x + 12, y0 + 8, { w: S0 - 24, h: S0 - 24 });
      const cdq = st.cd ? clamp01((ST.wcd[id] || 0) / (st.cd * (1 - 0.08 * ST.ps.haste))) : 0; if (cdq > 0.01) L.rrect(x, y0, S0, S0 * cdq, 12, [0, 0, 0], [0, 0, 0], 0.45);
      if (evo) label('evo' + i, 'EVO', x + S0 / 2, y0 + S0 - 10, { size: 16, al: 0.5, col: '#64ffda' });
      else for (let j = 0; j < SIM.MAX_WL; j++) L.rrect(x + 10 + j * 12.5, y0 + S0 - 13, 9, 7, 3, j < ST.wp[id] ? CYAN : [0.12, 0.2, 0.24]); });
    if (ST.ab) { const A = SIM.ABIL[ST.hero] || SIM.ABIL.utrace, x = x0 - S0 - 34, on = GT < ST.ab.until, q = clamp01(ST.ab.cd / A.cd), hc = heroCol(ST);   // the E ability
      L.uiBox('abslot', x, y0, S0, S0, 4); frame(x, y0, S0, S0, 0.95, on ? MINT : q > 0 ? [0.13, 0.33, 0.39] : hc);
      if (on || q === 0) { G.blend('add'); L.glow(x + S0 / 2, y0 + S0 / 2, S0 * 0.75, on ? MINT : hc, on ? 0.45 + 0.15 * Math.sin(GT * 8) : 0.22 + 0.08 * Math.sin(GT * 3), 2); G.blend(); }
      ico(icn(A.ic), x + 12, y0 + 8, { w: S0 - 24, h: S0 - 24, u: { grade: [q > 0 && !on ? 0.4 : 1, q > 0 && !on ? 0.6 : 1, 0, 1] } });
      if (q > 0 && !on) { L.rrect(x, y0 + S0 * (1 - q), S0, S0 * q, 4, [0, 0, 0], [0, 0, 0], 0.5); label('abcd', String(Math.ceil(ST.ab.cd)), x + S0 / 2, y0 + S0 / 2, { size: 30, al: 0.5, col: '#e6fdff' }); }
      L.uiBox('abkey', x - 12, y0 - 14, 38, 34, 2); L.rrect(x - 10, y0 - 12, 34, 30, 6, [0.02, 0.06, 0.08]); label('abk', 'E', x + 7, y0 + 3, { size: 20, al: 0.5, col: '#7ff6ff' });
      for (let j = 0; j < SIM.AB_MAX; j++) L.rrect(x + 14 + j * 22, y0 + S0 - 13, 16, 7, 3, j < (ST.abR || 0) ? MINT : [0.12, 0.2, 0.24]); }
    let px = x0 + n * (S0 + gap) + 20; for (const k in ST.ps) if (ST.ps[k]) { L.uiBox('ps_' + k, px, y0 + 30, 56, 62, 2); frame(px, y0 + 30, 56, 56, 0.85, MINT); ico(icn(SIM.PASS[k].ic), px + 8, y0 + 36, { w: 40, h: 40 });
      label('psl_' + k, String(ST.ps[k]), px + 46, y0 + 78, { size: 18, al: 0.5, col: '#ffd600' }); px += 64; }
    // the component / training panels on the right (their markers at the screen's edge are drawn below, at 1)
    if (ST.ed) { const C = EDU.course(ST.ed.course), LV = SIM.LEVEL, maze = !!LV.TERMS.length, done = ST.nodes.filter((n) => n.st === 2).length, op = SIM.doorOpen(ST);
      const l1 = maze ? 'РАЗДЕЛ ' + (ST.room + 1) + '/' + C.rooms.length + ' · ' + C.rooms[ST.room] : 'ЦЕНТРАЛЬНЫЙ ЗАЛ · БОСС КУРСА', l2 = maze ? (op ? 'ДВЕРЬ ОТКРЫТА' : 'ТЕРМИНАЛЫ ' + done + '/' + ST.nodes.length) + ' · ОЧКИ ' + ST.ed.points : 'ОЧКИ ОБУЧЕНИЯ ' + ST.ed.points;
      [l1, l2].forEach((s, j) => { const cw = L.labelW('edu' + j, s, { size: 24, font: MONO }), cyy = 152 + j * 50; panel('edup' + j, W - cw - 76, cyy - 22, cw + 36, 44, 0.75); label('edu' + j, s, W - 58, cyy, { size: 24, al: 1, col: j ? '#64ffda' : '#7ff6ff' }); }); }
    else if (ST.nodes) { let best = -1, bd = 1e9; ST.nodes.forEach((n, i) => { if (n.st) return; const z = SIM.ZONES[i], d = Math.hypot(z.nx - ST.x, z.ny - ST.y); if (d < bd) { bd = d; best = i; } });
      const done = ST.nodes.filter((n) => n.st).length, z = best >= 0 ? SIM.ZONES[best] : null;
      const ang = z ? Math.atan2(z.ny - ST.y, z.nx - ST.x) : 0, arrow = '→↘↓↙←↖↑↗'[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
      const cs = 'КОМПОНЕНТЫ ' + done + '/5' + (z ? ' · ' + z.name + ' ' + arrow : ' · ВСЕ ВОССТАНОВЛЕНЫ'), cw = L.labelW('comp', cs, { size: 24, font: MONO });
      const cyy = 152; panel('compp', W - cw - 76, cyy - 22, cw + 36, 44, 0.75); label('comp', cs, W - 58, cyy, { size: 24, al: 1, col: '#7ff6ff' }); }          // right column, under kills and codes
    // boss bar (under the clock)
    const B = ST.boss ? ST.E.find((e) => e.id === ST.boss && e.dieT < 0) : null;
    if (B) { const nm = SIM.FOE[B.k].name.toUpperCase() + (B.lvl ? ' · ЭСКАЛАЦИЯ ' + B.lvl : ''); bar('boss', W / 2 - 350, 112, 700, 20, B.hp / B.mhp, CORAL, [0.7, 0.2, 0.18], null);
      const nw = L.labelW('bossn', nm, { size: 22 }); panel('bossnp', W / 2 - nw / 2 - 16, 140, nw + 32, 36, 0.6); label('bossn', nm, W / 2, 158, { size: 22, al: 0.5, col: '#ff8f85' }); }
    // toast
    if (ST.toast && GT - ST.toast.t < 4.5 && !ST.pick) { const a = clamp01((GT - ST.toast.t) / 0.25) * clamp01((4.5 - (GT - ST.toast.t)) / 0.5), tw = L.labelW('toast', ST.toast.s, { size: 26 }), ty = B ? 214 : 130;
      L.uiBox('toastp', W / 2 - tw / 2 - 24, ty - 26, tw + 48, 52, 6); frame(W / 2 - tw / 2 - 24, ty - 26, tw + 48, 52, 0.85 * a, ST.toast.good ? MINT : CORAL);
      label('toast', ST.toast.s, W / 2, ty, { size: tw > W - 80 ? Math.max(16, Math.floor(26 * (W - 80) / tw)) : 26, al: 0.5, col: ST.toast.good ? '#c8fff0' : '#ffd6cf', a }); }
    });
    // components: counter and the way to the nearest open one (the original's «Узлы: n/5 · Агрегация ←»)
    if (ST.ed) { const LV = SIM.LEVEL, op = SIM.doorOpen(ST);
      if (op) { const ex = sx0(LV.EXIT[0]), ey = sy0(LV.EXIT[1]), ang = Math.atan2(LV.EXIT[1] - ST.y, LV.EXIT[0] - ST.x), mx = Math.max(60, Math.min(W - 60, ex)), my = Math.max(150, Math.min(H - 150, ey));   // only the open door is pointed at
        if (ex < 0 || ex > W || ey < 0 || ey > H) { G.blend('add'); L.glow(mx, my, 40, MINT, 0.9, 3); G.blend(); L.solid(mx, my, 34, 10, MINT, ang, 0, 5, 0.95); L.solid(mx, my, 20, 10, [1, 1, 1], ang, -10, 5, 0.9); label('edudr', 'ДВЕРЬ', mx, my + 40, { size: 20, al: 0.5, col: '#64ffda' }); } }
      eduLabels(ST, GT, t, sx0, sy0); }
    else if (ST.nodes) { let best = -1, bd = 1e9; ST.nodes.forEach((n, i) => { if (n.st) return; const z = SIM.ZONES[i], d = Math.hypot(z.nx - ST.x, z.ny - ST.y); if (d < bd) { bd = d; best = i; } });
      const done = ST.nodes.filter((n) => n.st).length, z = best >= 0 ? SIM.ZONES[best] : null;
      const ang = z ? Math.atan2(z.ny - ST.y, z.nx - ST.x) : 0, arrow = '→↘↓↙←↖↑↗'[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];
      if (z && bd > 700) { const ex = sx0(z.nx), ey = sy0(z.ny), mx = Math.max(60, Math.min(W - 60, ex)), my = Math.max(150, Math.min(H - 150, ey));      // edge marker
        if (ex < 0 || ex > W || ey < 0 || ey > H) { G.blend('add'); L.glow(mx, my, 40, z.col, 0.9, 3); G.blend(); L.solid(mx, my, 34, 10, z.col, ang, 0, 5, 0.95); L.solid(mx, my, 20, 10, [1, 1, 1], ang, -10, 5, 0.9); } } }
    if (S.state && !ST.pick && !ST.over && !(ST.ed && ST.ed.active)) { const px = ST.px, py = ST.py; G.blend('add'); L.ring(px, py, 16, 16, CYAN, 0.95, 0.12); G.blend();       // crosshair
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) L.solid(px + dx * 14 - (dy ? 1.5 : 0) - (dx < 0 ? 9 : 0), py + dy * 14 - (dx ? 1.5 : 0) - (dy < 0 ? 9 : 0), dx ? 9 : 3, dy ? 9 : 3, CYAN, 0, 0, 0, 0.95); }
    // floating combo text (the reference's "CREATIVE KILL ×6")
    if (combo) { const a = GT - combo.t, s = 'КАСКАДНЫЙ СБОЙ ×' + combo.n, sz = 44 * (1 + 0.35 * Math.exp(-a * 9)), al = clamp01((2.2 - a) / 0.4), X = sx(combo.x), Y = sy(combo.y) - 30 * a;
      const w = L.labelW('combo', s, { size: Math.round(sz), col: '#00e5ff', out: '#02090d' }); L.uiBox('combop', X - w / 2 - 14, Y - sz * 0.8, w + 28, sz * 1.6, 2);
      label('combo', s, X, Y, { size: Math.round(sz), al: 0.5, col: '#00e5ff', out: '#02090d', a: al }); }
    if (lvlUp && !ST.pick && GT - lvlUp.t < 1.4) { const s = 'УРОВЕНЬ ' + lvlUp.l, X = sx(lvlUp.x), Y = sy(lvlUp.y) - 60 - 40 * (GT - lvlUp.t), w = L.labelW('lvlt', s, { size: 34 });
      L.uiBox('lvltp', X - w / 2 - 12, Y - 28, w + 24, 56, 2); label('lvlt', s, X, Y, { size: 34, al: 0.5, col: '#7ff6ff', a: clamp01((1.4 - (GT - lvlUp.t)) / 0.3) }); }
    // level-up cards
    if (ST.pick && CK > 1) scaled(CK, (W, H) => pickC(ST, GT, W, H, CK));
    else if (ST.pick) { const a = clamp01((GT - ST.pick.t0) / 0.2); L.solid(0, 0, W, H, [0.02, 0.02, 0.05], 0, 0, 0, 0.62 * a);
      const title = ST.pick.chest ? 'КАПСУЛА ОБНОВЛЕНИЯ — выберите улучшение' : 'НОВЫЙ УРОВЕНЬ ' + ST.lvl + ' — выберите улучшение', tw = L.labelW('pickt', title, { size: 40 });
      L.uiBox('picktp', W / 2 - tw / 2 - 20, 170, tw + 40, 70, 4); label('pickt', title, W / 2, 205, { size: 40, al: 0.5, col: '#7ff6ff', a });
      ST.pick.opts.forEach((op, i) => { const [x, y, w, h] = SIM.cardRect(i), lift = -10 * Math.max(0, Math.sin(Math.min(1, (GT - ST.pick.t0) * 3 - i * 0.3) * Math.PI));
        const isA = op.k === 'ab', isE = op.k === 'evo', isW = op.k === 'w' || isE, def = isA ? SIM.ABIL[ST.hero] || SIM.ABIL.utrace : isW ? SIM.WEAP[op.id] : SIM.PASS[op.id], lv = isA ? ST.abR || 0 : isE ? 0 : isW ? (ST.wp[op.id] || 0) : op.k === 'p' ? ST.ps[op.id] : 0;
        const name = op.k === 'heal' ? 'Кофе из автомата' : def.name, sub = op.k === 'heal' ? 'Восстановление' : isA ? 'Умение E · ранг ' + lv + ' → ' + (lv + 1) : isE ? 'ЭВОЛЮЦИЯ' : isW ? (lv ? 'Уровень ' + lv + ' → ' + (lv + 1) : 'Новое оружие') : 'Навык ' + lv + ' → ' + (lv + 1);
        const desc = op.k === 'heal' ? '+40 HP' : isA ? def.up + '. ' + def.desc : isE ? SIM.WSUM[op.id] : isW ? (lv && SIM.WEAP[op.id].steps[lv - 1] ? SIM.WEAP[op.id].steps[lv - 1][0] : SIM.WSUM[op.id])
          + (lv === SIM.MAX_WL - 1 && SIM.EVO[op.id] ? '. Эволюция с навыком «' + SIM.PASS[SIM.EVO[op.id][0]].name + '»' : '') : def.desc;
        L.uiBox('card' + i, x, y + lift, w, h, 10); frame(x, y + lift, w, h, a, isE ? MINT : CYAN);
        if (isE) { G.blend('add'); L.glow(x + w / 2, y + 100 + lift, 200, MINT, (0.4 + 0.2 * Math.sin(GT * 4)) * a, 2); G.blend(); }
        ico(op.k === 'heal' ? 'heal' : icn(def.ic), x + w / 2 - 70, y + 30 + lift, { w: 140, h: 140, u: { alpha: a } });
        const nl = wrap(name, 34, w - 50); nl.forEach((ln, j) => label('cn' + i + '_' + j, ln, x + w / 2, y + 210 + j * 42 + lift, { size: 34, al: 0.5, col: '#e6fdff', a }));
        label('cs' + i, sub, x + w / 2, y + 220 + nl.length * 42 + lift, { size: 24, al: 0.5, col: isE || (isW && !lv) ? '#64ffda' : '#ffd600', a });
        wrap(desc, 24, w - 60).forEach((ln, j) => label('cd' + i + '_' + j, ln, x + w / 2, y + 266 + nl.length * 42 + j * 32 + lift, { size: 24, al: 0.5, col: '#a9c9cf', a }));
        label('ck' + i, '[' + (i + 1) + ']', x + w / 2, y + h - 34 + lift, { size: 28, al: 0.5, col: '#7ff6ff', a }); }); }
    // results
    if (ST.over && CK > 1) scaled(CK, (W, H) => resultsC(ST, GT, t, W, H));
    else if (ST.over) { const a = clamp01((GT - ST.over.t) / 0.6); L.solid(0, 0, W, H, [0.02, 0.02, 0.04], 0, 0, 0, 0.7 * a);
      const lb0 = window.META && META.last && META.last.over === ST.over ? META.last : null, ed = ST.ed ? (lb0 && lb0.edu) || EDU.summary(ST.ed) : null;
      const win = ST.over.k === 'win', title = win ? (ST.ed ? EDU.course(ST.ed.course).victoryTag : 'ИНЦИДЕНТ ЗАКРЫТ') : 'СИСТЕМА УПАЛА', lines = ['Время смены: ' + mmss(ST.over.t), 'Уровень: ' + ST.lvl, 'Сбоев устранено: ' + ST.kills, 'Кодов маркировки: ' + ST.bars];
      const lb = lb0; let ex = [];
      if (lb) { const cl = window.CLOUD, cr = cl && cl.enabled && cl.last.run && lb.map === 'dc' ? cl.last : null, recs = cr ? cr.improved.filter((f) => !f.includes(':')) : [];
        const cloudLine = !cr ? [] : cr.guest ? ['Войдите, чтобы попасть в таблицу'] : recs.length ? [recs.map((f) => { const mm = cl.METRICS.find((x) => x.field === f), p = cr.places[f]; return mm.short + (p ? ' — ' + (p === Infinity ? '1000+' : p) + '-е место' : ''); }).slice(0, 2).join(' · ')] : [];
        const la = lb.ach || [];                                                                    // achievements done by this shift: claimed in the menu
        const achLine = la.length === 1 ? ['Выполнено: «' + la[0].title + '» · заберите в «Достижениях»'] : la.length ? ['Выполнено достижений: ' + la.length + ' · заберите в «Достижениях»'] : [];
        const on = lb.opened || [], openLine = on.length ? ['Открыто: ' + (on.length > 2 ? on.slice(0, 2).join(', ') + ' и ещё ' + (on.length - 2) : on.join(', '))] : [];
        ex = ['Коды: +' + lb.earned + ' (всего ' + lb.total + ')'].concat(achLine, openLine, lb.rec ? ['НОВЫЙ РЕКОРД'] : [], lb.finds.length ? ['В коллекции новое: ' + lb.finds.length] : [], cloudLine); }
      // the panel grows by a line for every extra line past what it was laid out for (3 lines; the training centre's has room for 5)
      const pw = ed ? 1320 : 760, ph = (ed ? 760 : 640) + 48 * Math.max(0, ex.length - (ed ? 5 : 3)), px0 = W / 2 - pw / 2, py0 = H / 2 - ph / 2; L.uiBox('resp', px0, py0, pw, ph, 10); frame(px0, py0, pw, ph, a, win ? MINT : CORAL);
      label('rest', title, W / 2, py0 + 80, { size: 60, al: 0.5, col: win ? '#64ffda' : '#ff6559', a });
      const lx = ed ? px0 + 330 : W / 2; lines.forEach((s, i) => label('resl' + i, s, lx, py0 + 180 + i * 56, { size: 32, al: 0.5, col: '#e6fdff', a }));
      if (ed) { const ex0 = px0 + 660; label('resg', 'Оценка: ' + ed.grade + (ed.answered ? ' · ' + Math.round(ed.score * 100) + '%' : ''), ex0, py0 + 180, { size: 36, col: ed.score >= 0.75 ? '#64ffda' : ed.answered ? '#ffd600' : '#ff8f85', a });
        [ed.course, 'Очки обучения: ' + ed.points + (ed.newBest ? ' · лучший результат курса' : ''), 'Вопросов: ' + ed.answered + ' · с первой попытки: ' + ed.firstCorrect + ' · повторов: ' + ed.retries, 'Разделов пройдено: ' + Math.min(ST.room, 3) + ' из 3' + (ed.reviveUsed ? ' · была вторая жизнь' : '')]
          .forEach((s, i) => label('rese' + i, s, ex0, py0 + 236 + i * 44, { size: 24, col: i ? '#cfe9ee' : '#7ff6ff', a }));
        ed.topics.forEach((tp, i) => { const yy = py0 + 430 + i * 50; label('rest' + i, tp.name, ex0, yy, { size: 24, col: '#a9c9cf', a }); const bw = 170, bx = ex0 + 400;
          L.rrect(bx, yy - 10, bw, 20, 6, [0.08, 0.14, 0.18]); if (tp.asked) L.rrect(bx, yy - 10, Math.max(8, bw * tp.score), 20, 6, tp.score >= 0.75 ? MINT : [1, 0.84, 0.2]);
          label('resn' + i, tp.asked ? Math.round(tp.score * 100) + '%' : '—', bx + bw + 16, yy, { size: 22, col: '#e6fdff', a }); }); }
      ex.forEach((s2, i) => label('resx' + i, s2, lx, py0 + 196 + lines.length * 56 + i * 48, { size: 28, al: 0.5, col: i === 0 ? '#7ff6ff' : '#64ffda', a }));
      if (GT - ST.over.t > 1.4 && KB()) label('resk', 'Пробел — новая смена · Esc — в меню', W / 2, py0 + ph - 50, { size: 28, al: 0.5, col: '#7ff6ff', a: 0.85 + 0.15 * Math.sin(t * 4) }); }
    // level-up controls bought in the shop
    if (ST.pick && CK === 1 && (ST.rerolls > 0 || ST.skips > 0)) [['Перегенерация', ST.rerolls, 4], ['Пропустить выбор', ST.skips, 5]].forEach(([nm, n, k], i) => { if (!n) return; const [x, y, w, h] = SIM.ctlRect(i);
      L.uiBox('ctl' + i, x, y, w, h, 8); frame(x, y, w, h, 0.9, MINT); label('ctl' + i, '[' + k + '] ' + nm + ' ×' + n, x + w / 2, y + h / 2, { size: 26, al: 0.5, col: '#c8fff0' }); });
  }

  // ---------------- the compact level-up cards, test and results (phones, stage 7б) ----------------
  // what a level-up option shows (shared with the desktop cards' wording)
  const pickText = (ST, op) => { const isA = op.k === 'ab', isE = op.k === 'evo', isW = op.k === 'w' || isE, def = isA ? SIM.ABIL[ST.hero] || SIM.ABIL.utrace : isW ? SIM.WEAP[op.id] : SIM.PASS[op.id], lv = isA ? ST.abR || 0 : isE ? 0 : isW ? (ST.wp[op.id] || 0) : op.k === 'p' ? ST.ps[op.id] : 0;
    const name = op.k === 'heal' ? 'Кофе из автомата' : def.name, sub = op.k === 'heal' ? 'Восстановление' : isA ? 'Умение E · ранг ' + lv + ' → ' + (lv + 1) : isE ? 'ЭВОЛЮЦИЯ' : isW ? (lv ? 'Уровень ' + lv + ' → ' + (lv + 1) : 'Новое оружие') : 'Навык ' + lv + ' → ' + (lv + 1);
    const desc = op.k === 'heal' ? '+40 HP' : isA ? def.up + '. ' + def.desc : isE ? SIM.WSUM[op.id] : isW ? (lv && SIM.WEAP[op.id].steps[lv - 1] ? SIM.WEAP[op.id].steps[lv - 1][0] : SIM.WSUM[op.id])
      + (lv === SIM.MAX_WL - 1 && SIM.EVO[op.id] ? '. Эволюция с навыком «' + SIM.PASS[SIM.EVO[op.id][0]].name + '»' : '') : def.desc;
    return { isE, isW, lv, def, name, sub, desc, ic: op.k === 'heal' ? 'heal' : icn(def.ic) }; };
  function pickC(ST, GT, W, H, K) { const a = clamp01((GT - ST.pick.t0) / 0.2); L.solid(0, 0, W, H, [0.02, 0.02, 0.05], 0, 0, 0, 0.7 * a);
    const title = ST.pick.chest ? 'КАПСУЛА ОБНОВЛЕНИЯ' : 'НОВЫЙ УРОВЕНЬ ' + ST.lvl + ' — выберите'; L.solid(0, 0, W, 62, [0.01, 0.02, 0.04], 0, 0, 0, 0.92 * a); label('pickt', title, W / 2, 32, { size: 28, al: 0.5, col: '#7ff6ff', a });
    const n = ST.pick.opts.length, cw = 300, g = 15, x0 = (W - (n * cw + (n - 1) * g)) / 2, ctl = ST.rerolls > 0 || ST.skips > 0, ch = ctl ? 360 : 380;
    ST.pick.opts.forEach((op, i) => { const P = pickText(ST, op), x = x0 + i * (cw + g), y = ctl ? 70 : 90, w = cw, h = ch;
      L.uiBox('card' + i, x, y, w, h, 8); frame(x, y, w, h, a, P.isE ? MINT : CYAN); if (P.isE) { G.blend('add'); L.glow(x + w / 2, y + 70, 140, MINT, (0.4 + 0.2 * Math.sin(GT * 4)) * a, 2); G.blend(); }
      ico(P.ic, x + w / 2 - 48, y + 14, { w: 96, h: 96, u: { alpha: a } });
      const nl = wrap(P.name, 24, w - 24).slice(0, 2); nl.forEach((ln, j) => label('cn' + i + '_' + j, ln, x + w / 2, y + 132 + j * 30, { size: 24, al: 0.5, col: '#e6fdff', a }));
      let yy = y + 140 + nl.length * 30; label('cs' + i, P.sub, x + w / 2, yy, { size: 19, al: 0.5, col: P.isE || (P.isW && !P.lv) ? '#64ffda' : '#ffd600', a }); yy += 32;
      wrap(P.desc, 18, w - 24).slice(0, Math.floor((y + h - 12 - yy) / 24) + 1).forEach((ln, j) => label('cd' + i + '_' + j, ln, x + w / 2, yy + j * 24, { size: 18, al: 0.5, col: '#a9c9cf', a }));
      hitMap(K, [x, y, w, h], SIM.cardRect(i)); });
    if (ctl) [['Перегенерация', ST.rerolls], ['Пропустить', ST.skips]].forEach(([nm, c], i) => { if (!c) return; const r = [W / 2 - 310 + i * 320, 446, 300, 64];
      L.uiBox('ctl' + i, r[0], r[1], r[2], r[3], 6); frame(r[0], r[1], r[2], r[3], 0.9, MINT); label('ctl' + i, nm + ' ×' + c, r[0] + r[2] / 2, r[1] + r[3] / 2, { size: 22, al: 0.5, col: '#c8fff0' }); hitMap(K, r, SIM.ctlRect(i)); }); }
  // the test, compact: the same phases as quiz(), in 960×540 with 18–30 px text; the answers in two columns
  function quizC(ST, GT, t, W, H, K) { const ed = ST.ed, a = ed.active, C = EDU.course(ed.course), ER = EDU.R, rev = a.reason === 'revive';
    L.solid(0, 0, W, H, [0.01, 0.02, 0.04], 0, 0, 0, 0.9); L.uiBox('qzp', 8, 8, W - 16, H - 16, 6); frame(8, 8, W - 16, H - 16, 0.95, rev ? CORAL : CYAN);
    const topic = a.topic !== null ? C.topics[a.topic] : null, head = rev ? 'ТЕСТ ВОЗРОЖДЕНИЯ' : 'ТЕРМИНАЛ ' + (a.node + 1) + ' · ' + C.title;
    label('qzh', head, 24, 34, { size: 20, col: rev ? '#ff8f85' : '#7ff6ff' });
    a.questions.forEach((q, i) => { const res = (a.res || [])[i], rec = res !== undefined, cur = i === a.index && a.phase === 'question', c = !rec ? (cur ? CYAN : [0.12, 0.2, 0.24]) : res ? MINT : CORAL;
      L.rrect(W - 30 - (a.questions.length - i) * 30, 22, 22, 22, 6, c, c, rec || cur ? 0.9 : 1); });
    const BTN = [W / 2 - 200, H - 82, 400, 64];
    const btn = (s, on) => { L.uiBox('qzb', BTN[0], BTN[1], BTN[2], BTN[3], 6); frame(BTN[0], BTN[1], BTN[2], BTN[3], on ? 0.95 : 0.6, on ? CYAN : [0.13, 0.33, 0.39]);
      label('qzbt', s, W / 2, BTN[1] + 32, { size: 24, al: 0.5, col: on ? '#ffffff' : '#6f8a90' }); hitMap(K, BTN, SIM.QUIZ_BTN); };
    const para = (id, s, x, y, size, maxW, col, lh, max = 8) => { const ls = wrap(s, size, maxW).slice(0, max); ls.forEach((ln, j) => label(id + j, ln, x, y + j * lh, { size, col })); return ls.length * lh; };
    if (a.phase === 'intro') { let y = 82; label('qzt', rev ? 'Вторая жизнь' : topic.name, 28, y, { size: 30, col: '#ffffff' }); y += 42;
      if (topic) y += para('qzn', topic.note, 28, y, 19, W - 56, '#a9c9cf', 25, 4) + 12;
      const rules = rev ? ['Ответь верно на ' + ER.passing + ' из ' + ER.questions + ' — вернёшься в бой.', 'Не сдашь — смена закончится.']
        : [ER.questions + ' вопроса, нужно ' + ER.passing + ' верных. Игра стоит, пока идёт тест.', 'Сдал — терминал пройден и награда.', 'Не сдал — терминал закрыт на ' + ER.failLock + ' с, волны усилены.'];
      rules.forEach((r, j) => { L.rrect(28, y + j * 32 - 6, 10, 10, 3, rev ? CORAL : CYAN); label('qzr' + j, r, 48, y + j * 32, { size: 19, col: '#e6fdff' }); });
      btn('Начать', true); return; }
    if (a.phase === 'result') { const ok = a.passed; label('qzt', ok ? 'ТЕСТ СДАН' : 'ТЕСТ НЕ СДАН', W / 2, 130, { size: 48, al: 0.5, col: ok ? '#64ffda' : '#ff6559' });
      label('qzc', 'Верных ответов: ' + a.correct + ' из ' + a.questions.length, W / 2, 196, { size: 26, al: 0.5, col: '#e6fdff' });
      const wrong = a.answered - a.correct, lines = rev ? [ok ? 'Возвращаешься в бой.' : 'Смена окончена.'] : (ok ? [a.correct >= ER.questions ? 'Награда: капсула и лечение.' : 'Награда: лечение.'] : ['Терминал закрыт на ' + ER.failLock + ' с.'])
        .concat(wrong > 0 && !rev ? ['Аудит: ' + Math.min(ER.auditMax, wrong) * ER.auditPack + ' врагов идут на проверку.'] : []);
      lines.forEach((s0, j) => label('qzl' + j, s0, W / 2, 252 + j * 34, { size: 22, al: 0.5, col: j === 0 ? (ok ? '#c8fff0' : '#ffd6cf') : '#ffd6cf' }));
      label('qzp2', 'Очки обучения: ' + ed.points, W / 2, 352, { size: 22, al: 0.5, col: '#7ff6ff' }); btn(rev && !ok ? 'К итогам' : 'Продолжить', true); return; }
    const item = a.questions[a.index], q = EDU.question(ed, item.id), opt = (id) => q.options.find((o) => o.id === id).text;
    label('qzi', 'Вопрос ' + (a.index + 1) + ' из ' + a.questions.length + (q.type === 'multiple' ? ' · несколько верных' : ''), 24, 62, { size: 18, col: q.type === 'multiple' ? '#ffd600' : '#7f9ea6' });
    const qh = para('qzq', q.text, 24, 92, 21, W - 48, '#ffffff', 27, 3);
    if (a.phase === 'question') { const n = item.options.length, cols = n > 3 ? 2 : 1, rows = Math.ceil(n / cols), top = 92 + qh + 4, bottom = BTN[1] - 10, gh = 8, rh = Math.max(62, (bottom - top - (rows - 1) * gh) / rows), cw = (W - 48 - (cols - 1) * 10) / cols;
      item.options.forEach((id, i) => { const r = [24 + (i % cols) * (cw + 10), top + Math.floor(i / cols) * (rh + gh), cw, rh], sel = a.selected.includes(id);
        L.uiBox('qzo' + i, r[0], r[1], r[2], r[3], 4); frame(r[0], r[1], r[2], r[3], sel ? 0.95 : 0.8, sel ? CYAN : [0.13, 0.33, 0.39]); if (sel) L.rrect(r[0], r[1], r[2], r[3], 4, [0.0, 0.45, 0.55], [0.0, 0.3, 0.38], 0.3);
        L.rrect(r[0] + 8, r[1] + r[3] / 2 - 15, 30, 30, q.type === 'multiple' ? 5 : 15, sel ? CYAN : [0.08, 0.16, 0.2]); label('qzk' + i, String(i + 1), r[0] + 23, r[1] + r[3] / 2, { size: 18, al: 0.5, col: sel ? '#02090d' : '#7ff6ff' });
        const fs = 18, lh = 22, ls = wrap(opt(id), fs, r[2] - 56).slice(0, Math.max(1, Math.floor((r[3] - 6) / lh))), y0 = r[1] + r[3] / 2 - (ls.length - 1) * lh / 2;
        ls.forEach((ln, j) => label('qzo' + i + '_' + j, ln, r[0] + 46, y0 + j * lh, { size: fs, col: sel ? '#ffffff' : '#cfe9ee' })); hitMap(K, r, SIM.quizOpt(i, n)); });
      btn(a.selected.length ? 'Ответить' : 'Выберите ответ', !!a.selected.length); return; }
    const ok = a.lastCorrect; let y = 92 + qh + 14; label('qzv', ok ? 'ВЕРНО' : 'НЕВЕРНО', 24, y, { size: 30, col: ok ? '#64ffda' : '#ff6559' }); y += 36;
    if (!ok) { a.selected.forEach((id, j) => { y += para('qzy' + j + '_', 'Ваш: ' + opt(id), 28, y, 18, W - 56, '#ffd6cf', 22, 2); }); y += 4; }
    q.correct.forEach((id, j) => { y += para('qzc' + j + '_', (ok ? 'Ответ: ' : 'Верно: ') + opt(id), 28, y, 18, W - 56, '#c8fff0', 22, 2); }); y += 6;
    if (q.explanation) para('qze', q.explanation, 28, y, 18, W - 56, '#a9c9cf', 22, Math.max(1, Math.floor((BTN[1] - 8 - y) / 22)));
    btn(a.index + 1 < a.questions.length ? 'Следующий вопрос' : 'Итог теста', true); }
  // the results, compact: the shift's lines, then what it brought; the touch «В меню» button sits under the panel
  function resultsC(ST, GT, t, W, H) { const a = clamp01((GT - ST.over.t) / 0.6); L.solid(0, 0, W, H, [0.02, 0.02, 0.04], 0, 0, 0, 0.78 * a);
    const lb = window.META && META.last && META.last.over === ST.over ? META.last : null, ed = ST.ed ? (lb && lb.edu) || EDU.summary(ST.ed) : null;
    const win = ST.over.k === 'win', title = win ? (ST.ed ? EDU.course(ST.ed.course).victoryTag : 'ИНЦИДЕНТ ЗАКРЫТ') : 'СИСТЕМА УПАЛА';
    const lines = [['Время', mmss(ST.over.t)], ['Уровень', ST.lvl], ['Сбоев', ST.kills], ['Кодов', ST.bars]];
    const ex = []; if (lb) { const la = lb.ach || [], cl = window.CLOUD, cr = cl && cl.enabled && cl.last.run && lb.map === 'dc' ? cl.last : null;
      ex.push('Коды: +' + lb.earned + ' (всего ' + lb.total + ')'); if (la.length) ex.push('Выполнено достижений: ' + la.length + ' · заберите в меню'); if (lb.rec) ex.push('НОВЫЙ РЕКОРД');
      if (lb.finds.length) ex.push('В коллекции новое: ' + lb.finds.length); if (cr && cr.guest) ex.push('Войдите, чтобы попасть в таблицу'); }
    if (ed) ex.unshift('Оценка: ' + ed.grade + (ed.answered ? ' · ' + Math.round(ed.score * 100) + '%' : '') + ' · очки ' + ed.points);
    const pw = 700, px0 = W / 2 - pw / 2, py0 = 10, ph = 410; L.uiBox('resp', px0, py0, pw, ph, 6); frame(px0, py0, pw, ph, a, win ? MINT : CORAL);
    label('rest', title, W / 2, py0 + 44, { size: 38, al: 0.5, col: win ? '#64ffda' : '#ff6559', a });
    lines.forEach(([k, v], i) => { const x = px0 + 40 + (i % 2) * 330, y = py0 + 106 + Math.floor(i / 2) * 44; label('resl' + i, k + ': ' + v, x, y, { size: 24, col: '#e6fdff', a }); });
    ex.slice(0, 6).forEach((s2, i) => label('resx' + i, s2, W / 2, py0 + 214 + i * 34, { size: 20, al: 0.5, col: i === 0 ? '#7ff6ff' : '#64ffda', a }));
    const T = window.TOUCH; if (GT - ST.over.t > 1.4 && !(T && T.on)) label('resk', 'Пробел — новая смена · Esc — в меню', W / 2, py0 + ph - 26, { size: 20, al: 0.5, col: '#7ff6ff' }); }
  // ---------------- menu (meta.js holds the state, the layout and the save) ----------------
  // a hero card (shop tab and hero select): portrait, name, role, attack, passive, then price / training (shop) or play (select)
  let MT = 0;                                                                                     // the menu's clock (gear animation)
  // a hero's portrait in the menus, in its skin's own drawing when it wears one
  function portrait(h, skin, x, y, ph, own = true) { const n = heroArt(h, skin) + '_body', pw = L.hsz(n, ph);
    L.sprite(n, x - pw / 2, y, { w: pw, h: ph, u: { grade: [own ? 1 : 0.15, own ? 1 : 0.35, 0, 1] } }); }
  // content still closed by an achievement (live/ach.js) says what opens it, in this grey; it shows as a black silhouette and «???»
  // until then (docs/PLAN-FEEDBACK-27-10.md, stage 3). Content whose achievement is done pulses mint: a press claims it. Content a
  // claim opened wears «НОВОЕ» until its screen is left.
  const LOCK_C = '#8a9ea4', READY_C = '#64ffda';
  const readyMark = (id, r) => { const [x, y, w, h] = r, q = 0.5 + 0.5 * Math.sin(MT * 5); frame(x, y, w, h, 0.7 + 0.3 * q, MINT);   // under the labels: frame fills
    L.rrect(x, y, w, h, 4, [0.0, 0.45, 0.35], [0.0, 0.3, 0.25], 0.1 + 0.12 * q); };
  const newMark = (id, x, y) => { L.rrect(x, y, 86, 26, 6, [0.0, 0.5, 0.4], [0.0, 0.36, 0.29]); label(id, 'НОВОЕ', x + 43, y + 13, { size: 17, al: 0.5, col: '#ffffff' }); };
  function heroCard(id, o, on, mode) { const V = META.view(), h = o.hero, H = SIM.HEROES[h], own = V.owns(h), [x, y, w, hh] = o.r, IDLE = [0.13, 0.33, 0.39];
    const shut = !own && !V.open('hero', h), rd = shut && ACH.ready(V.D, 'hero', h), g = shut && ACH.gate('hero', h);
    if (w < 240) {                                                            // the compact card (stage 7б)
      const fit = (k, s0, size, min = 15) => { let ns = size; while (ns > min && L.labelW(k, s0, { size: ns, font: MONO }) > w - 16) ns--; return ns; };
      L.uiBox(id, x, y, w, hh, 6); frame(x, y, w, hh, on ? 0.95 : 0.8, on ? CYAN : IDLE); if (on) L.rrect(x, y, w, hh, 4, [0.0, 0.45, 0.55], [0.0, 0.3, 0.38], 0.2); if (rd) readyMark(id + 'rm', o.r);
      const ph = 120, n0 = heroArt(h) + '_body', pw0 = L.hsz(n0, ph);
      if (shut) L.sprite(n0, x + w / 2 - pw0 / 2, y + 14, { w: pw0, h: ph, u: { grade: [0, 0.06, 0, 1] } }); else portrait(h, own ? V.D.sel.skins[h] : null, x + w / 2, y + 14, ph, own);
      if (!own && ACH.isNew(V.D, 'hero', h)) newMark(id + 'nw', x + w - 92, y + 6);
      label(id + 'n', shut ? '???' : H.name, x + w / 2, y + 160, { size: shut ? 24 : fit(id + 'n', H.name, 22), al: 0.5, col: shut ? '#5f7f88' : '#ffffff' });
      if (!shut) { label(id + 'r', H.role, x + w / 2, y + 192, { size: fit(id + 'r', H.role, 19, 14), al: 0.5, col: 'rgb(' + H.col.map((v) => Math.round(v * 255)).join(',') + ')' });
        if (hh > 330) wrap(H.passive.name, 17, w - 16).slice(0, 2).forEach((ln, j) => label(id + 'd' + j, ln, x + w / 2, y + 228 + j * 22, { size: 17, al: 0.5, col: '#a9c9cf' })); }   // the shop's taller card: the passive
      const by = y + hh - 34, st = rd ? 'Открыть' : g ? (g.short || g.title) : !own ? H.price + ' кодов' : mode === 'pick' ? (V.D.sel.hero === h ? '▶ выбран' : 'Играть') : V.lvl('tr_' + h) >= V.TR_MAX ? 'Тренировка: МАКС' : 'Тренировка ' + V.trPrice(h);
      const sc = rd ? READY_C : g ? LOCK_C : !own ? (V.D.codes >= H.price ? '#7ff6ff' : '#ff8f85') : '#64ffda';
      if (g && !rd) wrap(st, 17, w - 16).slice(0, 2).forEach((ln, j, all) => label(id + 'g' + j, ln, x + w / 2, by - (all.length - 1) * 20 + j * 20, { size: 17, al: 0.5, col: sc }));
      else label(id + 'p', st, x + w / 2, by, { size: fit(id + 'p', st, 21, 14), al: 0.5, col: sc });
      return; }
    L.uiBox(id, x, y, w, hh, 10); frame(x, y, w, hh, on ? 0.95 : 0.8, on ? CYAN : IDLE);
    if (on) { L.rrect(x, y, w, hh, 4, [0.0, 0.45, 0.55], [0.0, 0.3, 0.38], 0.2); } if (rd) readyMark(id + 'rm', o.r);
    const c = H.col, n = heroArt(h) + '_body', ph = 170, pw = L.hsz(n, ph); G.blend('add'); L.glow(x + w / 2, y + 120, 120, rd ? MINT : c, own ? 0.3 : rd ? 0.18 : shut ? 0 : 0.08, 2); G.blend();
    if (shut) { const n0 = heroArt(h) + '_body', pw0 = L.hsz(n0, ph); L.sprite(n0, x + w / 2 - pw0 / 2, y + 30, { w: pw0, h: ph, u: { grade: [0, 0.06, 0, 1] } }); }   // a silhouette
    else portrait(h, own ? V.D.sel.skins[h] : null, x + w / 2, y + 30, ph, own);
    if (!own && ACH.isNew(V.D, 'hero', h)) newMark(id + 'nw', x + w - 100, y + 14);
    let ns = 28; while (ns > 18 && L.labelW(id + 'n', H.name, { size: ns, font: MONO }) > w - 30) ns--;
    label(id + 'n', shut ? '???' : H.name, x + w / 2, y + 232, { size: shut ? 28 : ns, al: 0.5, col: shut ? '#5f7f88' : '#ffffff' });
    if (!shut) { label(id + 'r', H.role + ' · ' + H.hp + ' HP', x + w / 2, y + 268, { size: 21, al: 0.5, col: 'rgb(' + c.map((v) => Math.round(v * 255)).join(',') + ')' });
      const lines = [...wrap('Атака: ' + SIM.WEAP[H.weapon].name, 19, w - 30).slice(0, 2), ...wrap(H.passive.name + ': ' + H.passive.desc, 19, w - 30).slice(0, 4)];
      lines.forEach((ln, j) => label(id + 'd' + j, ln, x + 18, y + 304 + j * 26, { size: 19, col: '#a9c9cf' })); }
    const by = y + hh - 56;
    if (rd) label(id + 'g0', 'Нажмите — открыть', x + w / 2, by + 20, { size: 22, al: 0.5, col: READY_C });
    else if (g) wrap('Откроется: ' + g.desc.toLowerCase(), 19, w - 30).slice(0, 3).forEach((ln, j, all) => label(id + 'g' + j, ln, x + w / 2, by + 20 - (all.length - 1) * 13 + j * 26, { size: 19, al: 0.5, col: LOCK_C }));
    else if (!own) label(id + 'p', H.price + ' кодов', x + w / 2, by + 20, { size: 26, al: 0.5, col: V.D.codes >= H.price ? '#7ff6ff' : '#ff8f85' });
    else if (mode === 'pick') label(id + 'p', V.D.sel.hero === h ? '▶ выбран' : 'Играть', x + w / 2, by + 20, { size: 24, al: 0.5, col: '#64ffda' });
    else { const lv = V.lvl('tr_' + h); for (let j = 0; j < V.TR_MAX; j++) L.rrect(x + 18 + j * 24, by + 14, 18, 12, 4, j < lv ? MINT : [0.12, 0.2, 0.24]);
      label(id + 't', lv >= V.TR_MAX ? 'Тренировка: МАКС' : 'Тренировка ' + V.trPrice(h), x + w - 18, by + 20, { size: 20, al: 1, col: lv >= V.TR_MAX ? '#64ffda' : V.D.codes >= V.trPrice(h) ? '#7ff6ff' : '#ff8f85' }); } }
  // at the compact scale the menus draw in META's logical space (V.LW × V.LH), G.uiK times larger
  function menu(GT, t) { G.uiK = META.view().U; try { menuAt(GT, t); } finally { G.uiK = 1; G.clip(null); } }
  function menuAt(GT, t) { MT = t; const W = META.view().LW, H = META.view().LH;
    const V = META.view(), D = V.D, it = V.items, hot = (i) => i === V.sel;
    // the items in turn, skipping those scrolled out of view; scrolled content is clipped to its area (compact)
    const each = (fn) => { it.forEach((o, i) => { if (o.off) return; const A = V.scrollArea; G.clip(o.sc && A ? [0, A[0] * V.U, SIM.VIEW.W, (A[1] - A[0]) * V.U] : null); fn(o, i); }); G.clip(null); };
    const IDLE = [0.13, 0.33, 0.39];
    const lit = (r, on) => { frame(r[0], r[1], r[2], r[3], on ? 0.95 : 0.8, on ? CYAN : IDLE);
      if (on) { L.rrect(r[0], r[1], r[2], r[3], 4, [0.0, 0.45, 0.55], [0.0, 0.3, 0.38], 0.22); L.rrect(r[0] + 4, r[1] + 8, 5, r[3] - 16, 2, CYAN); } };
    const btn = (id, r, txt, on, size = 30, col) => { L.uiBox(id, r[0], r[1], r[2], r[3], 8); lit(r, on);
      label(id + 't', txt, r[0] + r[2] / 2, r[1] + r[3] / 2, { size, al: 0.5, col: col || (on ? '#ffffff' : '#8fb4bc') }); };
    const C = V.compact, fitW = (id, s0, size, room, min = 14) => { let ns = size; while (ns > min && L.labelW(id, s0, { size: ns, font: MONO }) > room) ns--; return ns; };
    // compact: the title beside «Назад» (top-left), the subtitle under it in one line, the wallet top-right
    const head = (s1, s2) => { if (C) { const room = W - 180 - (V.scr === 'shop' || V.scr === 'ach' || V.scr === 'hero' ? 230 : 16); L.uiBox('mh', 160, 8, room + 10, 82, 4);
        label('mh1', s1, 166, 34, { size: fitW('mh1', s1, 32, room, 22), col: '#7ff6ff' }); if (s2) label('mh2', s2, 168, 70, { size: fitW('mh2', s2, 20, room, 15), col: '#a9c9cf' }); return; }
      L.uiBox('mh', 90, 60, 1100, 120, 10); label('mh1', s1, 110, 100, { size: 62, col: '#7ff6ff' }); if (s2) label('mh2', s2, 112, 150, { size: 26, col: '#a9c9cf' }); };
    const wallet = () => { if (C) { const s1 = String(D.codes), w = L.labelW('mw', s1, { size: 26, font: MONO }); panel('mwp', W - w - 74, 18, w + 62, 54, 0.85);
        L.sprite('code_tex', W - w - 66, 25, { w: 40, h: 40 }); label('mw', s1, W - 18, 45, { size: 26, al: 1, col: '#7ff6ff' }); return; }
      const s1 = 'Коды маркировки: ' + D.codes, w = L.labelW('mw', s1, { size: 30, font: MONO }); panel('mwp', W - w - 150, 74, w + 110, 64, 0.85);
      L.sprite('code_tex', W - w - 134, 82, { w: 48, h: 48 }); label('mw', s1, W - 50, 106, { size: 30, al: 1, col: '#7ff6ff' }); };
    const scrollBar = () => { const A = V.scrollArea; if (!C || !A || !A[2]) return; const [top, bottom, mx, v] = A, hgt = bottom - top, th = Math.max(40, hgt * hgt / (hgt + mx));
      L.rrect(W - 8, top, 5, hgt, 2, [0.1, 0.2, 0.24]); L.rrect(W - 8, top + (hgt - th) * v / mx, 5, th, 2, CYAN); };
    const backBtn = () => { scrollBar(); btn('mback', V.back, C || !KB() ? '‹ Назад' : 'Esc — назад', V.hovBack, C ? 24 : 26); };
    if (V.scr === 'main' && C) {                                             // compact: two columns of lines, the player's panel on the right
      L.solid(0, 0, W, H, [0.01, 0.02, 0.04], 0, 0, 0, 0.55); L.uiBox('mt', 12, 12, 936, 80, 6); label('mt1', 'UTREYS // NETSURVIVORS', 20, 50, { size: 40, col: '#7ff6ff' });
      const P = window.AUDIO ? AUDIO.pref : { enabled: true, musicOn: true };
      it.forEach((o, i) => !o.acct && btn('mm' + i, o.r, o.s, hot(i), fitW('mmt' + i, o.s, o.id === 'start' ? 26 : 24, o.r[2] - 16, 18), o.quit ? '#ff8f85' : o.id === 'quit' ? '#ffd6cf' : o.news ? READY_C : null));
      panel('mip', 612, 104, 332, 220, 0.85); L.sprite('code_tex', 628, 118, { w: 40, h: 40 }); label('mi0', String(D.codes), 676, 138, { size: 28, col: '#7ff6ff' });
      ['Лучшее время: ' + mmss(D.best.time), 'Рекорд сбоев: ' + D.best.kills, 'Побед ' + D.wins + ' · смен ' + D.runs].forEach((r, i) => label('mi' + (i + 1), r, 628, 190 + i * 40, { size: 22, col: '#e6fdff' }));
      if (V.suspended) { const sp = V.suspended; L.uiBox('msusp', 612, 334, 332, 44, 4); label('msusp', 'Сохранена смена · ' + mmss(sp.t), 778, 356, { size: 20, al: 0.5, col: '#64ffda' }); }
      { const gs = ACH.next(D, 1); if (gs.length) { const { x, p } = gs[0], fmt = (v) => (x.time ? mmss(v) : String(v)), s0 = 'Цель: ' + x.title + ' · ' + fmt(p.v) + '/' + fmt(p.target);
        L.uiBox('mgp', 612, 388, 332, 64, 4); label('mg0', s0, 620, 420, { size: fitW('mg0', s0, 20, 316, 13), col: '#cfe9ee' }); } }
      { const cl = window.CLOUD, o = it.find((x) => x.acct), st = cl && cl.state, s0 = !cl || !cl.enabled ? 'Вход недоступен' : st.status === 'signedIn' ? 'Вы: ' + st.login : st.status === 'loading' ? 'Подключение…' : st.status === 'error' ? 'Нет связи' : 'Войти';
        if (o) btn('macct', o.r, s0, hot(it.indexOf(o)), 24, !cl || !cl.enabled ? '#6f8a90' : st.status === 'signedIn' ? '#64ffda' : null); }
      return; }
    if (V.scr === 'main') {
      L.solid(0, 0, W, H, [0.01, 0.02, 0.04], 0, 0, 0, 0.3); L.solid(0, 0, 780, H, [0.01, 0.02, 0.04], 0, 0, 0, 0.6);
      L.uiBox('mt', 90, 110, 1200, 200, 10); label('mt1', 'UTREYS // NETSURVIVORS', 110, 170, { size: 84, col: '#7ff6ff' });
      label('mt2', 'Ночная смена в дата-центре: удержите компоненты и закройте инцидент', 114, 250, { size: 28, col: '#a9c9cf' });
      const P = window.AUDIO ? AUDIO.pref : { enabled: true, musicOn: true };
      it.forEach((o, i) => !o.acct && btn('mm' + i, o.r, o.id === 'sound' ? 'Звук: ' + (P.enabled ? 'вкл' : 'выкл') : o.id === 'music' ? 'Музыка: ' + (P.musicOn ? 'вкл' : 'выкл') : o.s, hot(i), o.id === 'start' ? 36 : 30, o.quit ? '#ff8f85' : o.id === 'quit' ? '#ffd6cf' : o.news ? READY_C : null));
      const rows = ['Коды маркировки: ' + D.codes, 'Лучшее время: ' + mmss(D.best.time), 'Рекорд сбоев: ' + D.best.kills, 'Побед: ' + D.wins + ' · смен: ' + D.runs];
      panel('mip', W - 640, 340, 540, 300, 0.85); L.sprite('code_tex', W - 610, 372, { w: 44, h: 44 });
      rows.forEach((r, i) => label('mi' + i, r, i ? W - 610 : W - 554, 394 + i * 66, { size: 30, col: i ? '#e6fdff' : '#7ff6ff' }));
      { const cl = window.CLOUD, o = it.find((x) => x.acct), st = cl && cl.state, s = !cl || !cl.enabled ? 'Вход: Firebase не подключён' : st.status === 'signedIn' ? 'Вы вошли: ' + st.login : st.status === 'loading' ? 'Подключение…' : st.status === 'error' ? 'Нет связи с сервером' : 'Войти или зарегистрироваться';
        if (o) btn('macct', o.r, s, hot(it.indexOf(o)), 26, !cl || !cl.enabled ? '#6f8a90' : st.status === 'signedIn' ? '#64ffda' : null); }
      if (V.suspended) { const sp = V.suspended, s = 'Сохранена смена: ' + (sp.map === 'edu' ? 'Учебный центр' : 'Дата-центр') + ' · ' + (SIM.HEROES[sp.hero] ? SIM.HEROES[sp.hero].name : '') + ' · ' + mmss(sp.t);
        L.uiBox('msusp', W - 640, 760, 540, 50, 6); label('msusp', s, W - 370, 785, { size: 20, al: 0.5, col: '#64ffda' }); }
      { const gs = ACH.next(D, 3); if (gs.length) { panel('mgp', W - 640, 830, 540, 170, 0.85); label('mgt', 'Ближайшие цели', W - 610, 858, { size: 24, col: '#7ff6ff' });   // as in the original's menu
        gs.forEach(({ x, p }, j) => { const fmt = (v) => (x.time ? mmss(v) : String(v)), s = x.title + ' · ' + fmt(p.v) + '/' + fmt(p.target); let ns = 21;
          while (ns > 15 && L.labelW('mg' + j, s, { size: ns, font: MONO }) > 480) ns--; label('mg' + j, s, W - 610, 900 + j * 34, { size: ns, col: Object.keys(x.unlocks).length ? '#64ffda' : '#cfe9ee' }); }); } }
      if (KB()) { L.uiBox('mhelp', 90, 930, 900, 60, 8); label('mhelp', '↑↓ или мышь — выбор · Enter — подтвердить · WASD — ходить в смене', 110, 960, { size: 24, col: '#7f9ea6' }); }
      return; }
    L.solid(0, 0, W, H, [0.01, 0.02, 0.04], 0, 0, 0, 0.8);
    if (V.scr === 'shop') { head('МАГАЗИН', V.tab === 'skin' ? 'Скины героев: другой облик героя, на игру не влияют' : V.tab === 'hero' ? 'Новые герои и их тренировки' : 'Постоянные улучшения за коды маркировки, действуют в каждой смене'); wallet();
      each((o, i) => { const [x, y, w, h] = o.r, on = hot(i);
        if (o.tab) { btn('mst' + i, o.r, o.s, on || V.tab === o.tab, 26, V.tab === o.tab ? '#ffffff' : null); return; }
        if (o.hero) { heroCard('msh' + i, o, on, 'shop'); return; }
        if (o.skin) { const k = o.skin, Sk = SIM.SKINS[k], ownH = V.owns(Sk.hero), own = V.ownsSkin(k), worn = D.sel.skins[Sk.hero] === k, hs = !ownH && !V.open('hero', Sk.hero);   // hs: its hero is still closed
          const rd = !own && !V.open('skin', k) && ACH.ready(D, 'skin', k), shut = !own && (!V.open('skin', k) || hs);
          L.uiBox('mss' + i, x, y, w, h, 10); lit(o.r, on || worn); if (rd) readyMark('mssr' + i, o.r); G.blend('add'); L.glow(x + w / 2, y + 110, 110, rd ? MINT : Sk.col, shut ? (rd ? 0.15 : 0) : ownH ? 0.25 : 0.06, 2); G.blend();
          if (shut) { const n0 = heroArt(Sk.hero, k) + '_body', pw0 = L.hsz(n0, 128); L.sprite(n0, x + w / 2 - pw0 / 2, y + 36, { w: pw0, h: 128, u: { grade: [0, 0.06, 0, 1] } }); }
          else portrait(Sk.hero, k, x + w / 2, y + 36, 128, ownH);
          if (!own && ACH.isNew(D, 'skin', k)) newMark('mssw' + i, x + w - 96, y + 10);
          let ns = 26; while (ns > 16 && L.labelW('mssn' + i, Sk.name, { size: ns, font: MONO }) > w - 20) ns--;
          label('mssn' + i, shut ? '???' : Sk.name, x + w / 2, y + 222, { size: shut ? 26 : ns, al: 0.5, col: shut ? '#5f7f88' : '#ffffff' });
          if (!shut) label('mssh' + i, Sk.style, x + w / 2, y + 254, { size: 19, al: 0.5, col: 'rgb(' + Sk.col.map((v) => Math.round(v * 255)).join(',') + ')' });
          const g = shut && !rd && !V.open('skin', k) && ACH.gate('skin', k);
          if (rd) label('mssp' + i, 'Нажмите — открыть', x + w / 2, y + h - 34, { size: 20, al: 0.5, col: READY_C });
          else if (shut && !g) label('mssp' + i, 'Откроется с героем', x + w / 2, y + h - 34, { size: 18, al: 0.5, col: LOCK_C });
          else if (g) wrap('Откроется: ' + (g.short || g.desc).toLowerCase(), 17, w - 20).slice(0, 2).forEach((ln, j, all) => label('mssg' + i + '_' + j, ln, x + w / 2, y + h - 34 - (all.length - 1) * 11 + j * 22, { size: 17, al: 0.5, col: LOCK_C }));
          else label('mssp' + i, !ownH ? 'нужен герой' : worn ? '▶ надет' : own ? 'Надеть' : Sk.price + ' кодов', x + w / 2, y + h - 34, { size: 24, al: 0.5, col: !ownH ? '#6f8a90' : worn || own ? '#64ffda' : D.codes >= Sk.price ? '#7ff6ff' : '#ff8f85' }); return; }
        if (o.id === 'reset') { L.uiBox('ms' + i, x, y, w, h, 10); frame(x, y, w, h, on ? 0.95 : 0.8, on ? CORAL : IDLE);
          label('ms' + i + 'n', 'Сбросить улучшения', x + w / 2, y + 50, { size: 28, al: 0.5, col: '#ffd6cf' });
          label('ms' + i + 'd', V.armedReset ? 'Нажмите ещё раз' : 'Вернёт ' + V.spent + ' кодов', x + w / 2, y + 100, { size: 24, al: 0.5, col: V.armedReset ? '#ff8f85' : '#a9c9cf' }); return; }
        const u = o.u, lv = V.lvl(u.id), lock = V.locked(u), cp = V.cap(u), mx = lv >= u.max, capped = !mx && lv >= cp, cost = V.price(u), can = !lock && !mx && !capped && D.codes >= cost;
        const rd = lock ? ACH.ready(D, 'u', u.id) : capped ? ACH.ready(D, 'ranks', 'up') : null, g = lock && !rd && ACH.gate('u', u.id);
        L.uiBox('ms' + i, x, y, w, h, 10); lit(o.r, on); if (rd) readyMark('msr' + i, o.r);
        ico(icn(u.ic), x + 16, y + 24, { w: 88, h: 88, u: { grade: [lock ? 0 : 1, lock ? 0.06 : 1, 0, 1] } });
        if (ACH.isNew(D, 'u', u.id) || (lv >= 3 && !mx && ACH.isNew(D, 'ranks', 'up'))) newMark('msw' + i, x + 17, y + h - 40);   // under the icon
        let ns = 25; while (ns > 16 && L.labelW('ms' + i + 'n', u.name, { size: ns, font: MONO }) > w - 136) ns--;
        label('ms' + i + 'n', lock ? '???' : u.name, x + 120, y + 34, { size: ns, col: lock ? '#5f7f88' : '#e6fdff' });
        (lock ? (rd ? [] : wrap('Откроется: ' + g.desc.toLowerCase(), 19, w - 136).slice(0, 3)) : wrap(u.desc, 20, w - 136).slice(0, 2))
          .forEach((ln, j) => label('ms' + i + 'd' + j, ln, x + 120, y + 70 + j * 25, { size: lock ? 19 : 20, col: lock ? LOCK_C : '#a9c9cf' }));
        if (!lock) for (let j = 0; j < u.max; j++) L.rrect(x + 120 + j * 24, y + h - 34, 18, 12, 4, j < lv ? MINT : j < cp ? [0.12, 0.2, 0.24] : [0.06, 0.09, 0.11]);   // ranks past the cap: darker
        const pt = rd ? (lock ? 'Нажмите — открыть' : 'Нажмите — ранги 4–5') : lock ? '' : mx ? 'МАКС' : capped ? '«' + ACH.gate('ranks', 'up').title + '»' : cost + ' кодов';
        if (pt) label('ms' + i + 'p', pt, x + w - 16, y + h - 28, { size: capped && !rd ? 19 : 22, al: 1, col: rd ? READY_C : capped ? LOCK_C : mx ? '#64ffda' : can ? '#7ff6ff' : '#ff8f85' }); });
      backBtn(); return; }
    if (V.scr === 'ach') { const L0 = ACH.LIST, done = L0.filter((x) => D.ach[x.id]).length, wn = ACH.waiting(D).length;   // the achievements: category tabs, cards with progress
      head('ДОСТИЖЕНИЯ', 'Получено ' + done + ' из ' + L0.length + (wn ? ' · ждут получения: ' + wn + ' — нажмите на карточку' : ' · выполненное нужно забрать нажатием')); wallet();
      const fit = (id, s, size, room, min = 13) => { let ns = size; while (ns > min && L.labelW(id, s, { size: ns, font: MONO }) > room) ns--; return ns; };
      each((o, i) => { const [x, y, w, h] = o.r, on = hot(i);
        if (o.cat) { const xs = L0.filter((x0) => x0.cat === o.cat), dn = xs.filter((x0) => D.ach[x0.id]).length, rw = xs.some((x0) => ACH.progress(D, x0).ready);
          btn('mat' + i, o.r, o.s, on || V.acat === o.cat, fit('matt' + i, o.s, 20, w - 16), V.acat === o.cat ? '#ffffff' : rw ? READY_C : dn === xs.length ? '#64ffda' : null);
          if (rw) L.rrect(x + w - 16, y + 8, 9, 9, 4, MINT); return; }
        if (o.claimAll) { if (!wn) { btn('mca', o.r, 'Забрать всё', on, 21, '#6f8a90'); return; }
          L.uiBox('mca', x, y, w, h, 8); readyMark('mcar', o.r); const cs = 'Забрать всё · ' + wn; label('mcat', cs, x + w / 2, y + h / 2, { size: fitW('mcat', cs, 21, w - 16, 14), al: 0.5, col: '#ffffff' }); return; }
        const x0 = o.ach, p = ACH.progress(D, x0), ok = p.claimed, rdy = p.ready, fmt = (v) => (x0.time ? mmss(v) : String(v));
        L.uiBox('ma' + i, x, y, w, h, 8); lit(o.r, on); if (ok) L.rrect(x, y, w, h, 4, [0.0, 0.35, 0.3], [0.0, 0.22, 0.2], 0.25); if (rdy) readyMark('mar' + i, o.r);
        const rw = rdy ? 'Забрать +' + x0.reward : '+' + x0.reward + ' кодов', rwW = L.labelW('mar' + i, rw, { size: 19, font: MONO });
        const tt = (ok ? '✓ ' : '') + x0.title; label('man' + i, tt, x + 18, y + 22, { size: fit('man' + i, tt, 22, w - 54 - rwW), col: ok || rdy ? '#64ffda' : '#ffffff' });
        label('mar' + i, rw, x + w - 18, y + 22, { size: 19, al: 1, col: rdy ? '#ffffff' : ok ? '#64ffda' : '#7ff6ff' });
        label('mad' + i, x0.desc, x + 18, y + 48, { size: fit('mad' + i, x0.desc, 17, w - 36, 12), col: '#a9c9cf' });
        const bw = 300; L.rrect(x + 18, y + 64, bw, 10, 4, [0.08, 0.14, 0.18]); L.rrect(x + 18, y + 64, Math.max(8, bw * p.v / p.target), 10, 4, ok || rdy ? MINT : CYAN);
        const ps = fmt(p.v) + ' / ' + fmt(p.target); label('map' + i, ps, x + 18 + bw + 14, y + 69, { size: 16, col: '#cfe9ee' });
        const op = ACH.opened([x0]); if (op.length) { const s = (ok ? 'Открыто: ' : 'Откроет: ') + op.join(', ');                    // its own line under the progress
          label('mao' + i, s, x + 18, y + 90, { size: fit('mao' + i, s, 16, w - 36, 11), col: ok || rdy ? '#64ffda' : LOCK_C }); } });
      backBtn(); return; }
    if (V.scr === 'coll' && V.ctab === 'foes') {                              // the enemy list: a foe opens with the first win over it
      const n = (k) => (D.st.foes && D.st.foes[k]) || 0, met = it.filter((o) => o.kind === 'f' && n(o.k) > 0).length, all = it.filter((o) => o.kind === 'f').length;
      head('КОЛЛЕКЦИЯ', 'Враги: открываются после первой победы над ними · ' + met + '/' + all);
      each((o, i) => { const [x, y, w, h] = o.r;
        if (o.ctab) { btn('mct' + i, o.r, o.s, hot(i) || V.ctab === o.ctab, 26, V.ctab === o.ctab ? '#ffffff' : null); return; }
        const seen = n(o.k) > 0, a = artOf(o.k), f = SIM.FOE[o.k]; L.uiBox('mf' + i, x, y, w, h, 4); lit(o.r, hot(i));
        if (f.boss || f.mini) L.rrect(x + 6, y + 6, 22, 6, 3, f.boss ? CORAL : [1, 0.84, 0.2]);           // a boss or a miniboss: a mark in the corner
        ico(a + '_body', x + 12, y + 12, { w: w - 24, h: h - 24, u: { grade: [seen ? 1 : 0, seen ? 1 : 0.1, 0, 1] } });
        if (!seen) label('mfq' + i, '?', x + w / 2, y + h / 2, { size: 44, al: 0.5, col: '#5f7f88' }); });
      const o = it[V.sel]; if (o && o.kind === 'f') { const seen = n(o.k) > 0, f = SIM.FOE[o.k], tag = f.boss ? 'Босс' : f.mini ? 'Мини-босс' : 'Враг';
        const dsc = seen ? SIM.FOE_DESC[o.k] || '' : 'Ещё не побеждён', tg = seen ? tag + ' · побед над ним: ' + n(o.k) : tag;
        if (C) { panel('mcd', 12, 418, W - 24, 114, 0.9); label('mcdn', seen ? f.name : '???', 28, 444, { size: 24, col: '#e6fdff' });
          label('mcdd', dsc, 28, 476, { size: fitW('mcdd', dsc, 20, W - 56, 14), col: '#a9c9cf' }); label('mcdr', tg, 28, 508, { size: 20, col: '#64ffda' }); }
        else { panel('mcd', 260, 790, W - 520, 170, 0.85); label('mcdn', seen ? f.name : '???', 290, 830, { size: 32, col: '#e6fdff' });
          label('mcdd', dsc, 290, 876, { size: 24, col: '#a9c9cf' }); label('mcdr', tg, 290, 918, { size: 24, col: '#64ffda' }); } }
      backBtn(); return; }
    if (V.scr === 'coll') { const seenN = (kind) => it.filter((o) => o.kind === kind && D.seen[kind][o.k]).length, cnt = (kind) => it.filter((o) => o.kind === kind).length;
      head('КОЛЛЕКЦИЯ', 'Оружие, эволюции и навыки, встреченные в сменах');
      [['w', 'Оружие'], ['e', 'Эволюции'], ['p', 'Навыки']].forEach(([kind, nm], r) => { let y = 230 + r * 190 - 44, x = 140;
        if (C) { const o = it.find((q) => q.sec === r); if (!o || o.r[1] - 22 < V.scrollArea[0] - 4 || o.r[1] - 22 > V.scrollArea[1]) return; y = o.r[1] - 18; x = o.r[0]; }
        L.uiBox('mcr' + r, x - 20, y - 20, 420, 40, 4); label('mcr' + r, nm + ' ' + seenN(kind) + '/' + cnt(kind), x, y, { size: C ? 22 : 26, col: '#7ff6ff' }); });
      each((o, i) => { if (o.ctab) { btn('mct' + i, o.r, o.s, hot(i) || V.ctab === o.ctab, 26, V.ctab === o.ctab ? '#ffffff' : null); return; }
        const [x, y, w, h] = o.r, seen = !!D.seen[o.kind][o.k], def = o.kind === 'p' ? SIM.PASS[o.k] : SIM.WEAP[o.k];
        const shut = o.kind !== 'e' && !V.open(o.kind, o.k), rd = shut && ACH.ready(D, o.kind, o.k);   // not offered yet: an achievement opens it
        L.uiBox('mc' + i, x, y, w, h, 4); lit(o.r, hot(i)); if (rd) readyMark('mcrd' + i, o.r);
        ico(icn(def.ic), x + 10, y + 10, { w: w - 20, h: h - 20, u: { grade: [seen && !shut ? 1 : 0, seen && !shut ? 1 : shut ? 0.04 : 0.12, 0, 1] } });
        if (ACH.isNew(D, o.kind, o.k)) L.rrect(x + w - 22, y + 6, 16, 16, 8, MINT);
        if (!seen || shut) label('mcq' + i, rd ? '!' : shut ? 'закрыто' : '?', x + w / 2, y + h / 2, { size: rd ? 44 : shut ? 18 : 40, al: 0.5, col: rd ? READY_C : shut ? LOCK_C : '#5f7f88' }); });
      const o = it[V.sel]; if (o && !o.ctab) { const seen = !!D.seen[o.kind][o.k], def = o.kind === 'p' ? SIM.PASS[o.k] : SIM.WEAP[o.k], g = o.kind !== 'e' && !V.open(o.kind, o.k) && ACH.gate(o.kind, o.k), rd = g && ACH.ready(D, o.kind, o.k);
        const desc = rd ? '«' + g.title + '» выполнено · нажмите, чтобы открыть' : ACH.isNew(D, o.kind, o.k) ? 'Новое: открыто «' + (ACH.gate(o.kind, o.k) || { title: '' }).title + '» · появится в карточках уровня' : g ? 'Откроется: ' + g.desc.toLowerCase() + ' («' + g.title + '»)' : !seen ? (o.kind === 'e' ? 'Эволюция ещё не встречалась' : 'Ещё не встречалось') : o.kind === 'p' ? def.desc : SIM.WSUM[o.k];
        const from = o.kind === 'e' ? Object.keys(SIM.EVO).find((b) => SIM.EVO[b][1] === o.k) : null;
        const rec = from ? (seen ? 'Рецепт: ' + SIM.WEAP[from].name + ' (ур. 6) + ' + SIM.PASS[SIM.EVO[from][0]].name : 'Рецепт: ???') : o.kind === 'w' && SIM.EVO[o.k] && D.seen.e[SIM.EVO[o.k][1]] ? 'Эволюция: ' + SIM.WEAP[SIM.EVO[o.k][1]].name : '';
        if (C) { panel('mcd', 12, 418, W - 24, 114, 0.9); label('mcdn', seen ? def.name : '???', 28, 444, { size: 24, col: '#e6fdff' });
          label('mcdd', desc, 28, 476, { size: fitW('mcdd', desc, 20, W - 56, 14), col: '#a9c9cf' }); if (rec) label('mcdr', rec, 28, 508, { size: fitW('mcdr', rec, 20, W - 56, 14), col: '#64ffda' }); }
        else { panel('mcd', 260, 790, W - 520, 170, 0.85); label('mcdn', seen ? def.name : '???', 290, 830, { size: 32, col: '#e6fdff' });
          label('mcdd', desc, 290, 876, { size: 24, col: '#a9c9cf' }); if (rec) label('mcdr', rec, 290, 918, { size: 24, col: '#64ffda' }); } }
      backBtn(); return; }
    if (V.scr === 'hero') { head('ВЫБОР ГЕРОЯ', (KB() ? 'Enter или клик' : 'Нажмите') + ' — играть; закрытого героя можно купить здесь'); wallet();
      each((o, i) => { if (!o.chip) { heroCard('mhs' + i, o, hot(i) || (V.focus === o.hero && it[V.sel] && it[V.sel].chip), 'pick'); return; }
        const [x, y, w, h] = o.r, k = o.chip === 'none' ? null : o.chip, Sk = k && SIM.SKINS[k], worn = (D.sel.skins[o.hero] || null) === k, own = !k || V.ownsSkin(k), on = hot(i);
        const shut = !own && !V.open('skin', k), rd = shut && ACH.ready(D, 'skin', k);
        L.uiBox('mhk' + i, x, y, w, h, 8); lit(o.r, on || worn); if (rd) readyMark('mhkr' + i, o.r); if (Sk) L.rrect(x + 14, y + 16, 10, h - 32, 4, shut ? [0.2, 0.26, 0.28] : Sk.col);
        label('mhkn' + i, Sk ? (shut ? '???' : Sk.name) : 'Без скина', x + 38, y + 38, { size: 24, col: shut ? '#5f7f88' : on || worn ? '#ffffff' : '#bfe3ea' });
        if (k && !own && ACH.isNew(D, 'skin', k)) newMark('mhkw' + i, x + w - 98, y + 10);
        const g = shut && !rd && ACH.gate('skin', k);
        if (rd) label('mhkp' + i, C ? 'Открыть' : 'Нажмите — открыть', x + 38, y + 76, { size: 20, col: READY_C });
        else if (g) wrap('Откроется: ' + (g.short || g.desc).toLowerCase(), 16, w - 50).slice(0, 2).forEach((ln, j) => label('mhkg' + i + '_' + j, ln, x + 38, y + 68 + j * 22, { size: 16, col: LOCK_C }));
        else label('mhkp' + i, worn ? '▶ надет' : own ? (KB() ? 'Enter — надеть' : 'Нажмите — надеть') : Sk.price + ' кодов', x + 38, y + 76, { size: 20, col: worn ? '#64ffda' : own ? '#7ff6ff' : D.codes >= Sk.price ? '#7ff6ff' : '#ff8f85' }); });
      backBtn(); return; }
    if (V.scr === 'map' && C) { head('ВЫБОР КАРТЫ', 'Каждая смена строит карту заново');
      it.forEach((o, i) => { const [x, y, w, h] = o.r, on = hot(i), m = o.map, rec = D.byMap[m.id];
        L.uiBox('mmp' + i, x, y, w, h, 6); lit(o.r, on || D.sel.map === m.id); minimap(m.id, x + 16, y + 14, w - 32, 190);
        label('mmpn' + i, m.name, x + 18, y + 234, { size: fitW('mmpn' + i, m.name, 28, w - 36, 20), col: on ? '#ffffff' : '#e6fdff' });
        wrap(m.desc, 20, w - 36).slice(0, 4).forEach((ln, j) => label('mmpd' + i + '_' + j, ln, x + 18, y + 272 + j * 26, { size: 20, col: '#a9c9cf' }));
        label('mmpr' + i, rec ? 'Смен ' + rec.runs + ' · побед ' + rec.wins + ' · ' + mmss(rec.time) : 'Ещё не сыграно', x + 18, y + h - 24, { size: 20, col: '#7ff6ff' }); });
      backBtn(); return; }
    if (V.scr === 'course' && C) { head('УЧЕБНЫЙ ЦЕНТР', 'Три лабиринта, затем зал с боссом курса');
      it.forEach((o, i) => { const [x, y, w, h] = o.r, on = hot(i), c = o.course, rec = D.byCourse[o.id], bk = { batch_accounting: 'batch', critical_incident: 'boss' }[c.boss.unit];
        L.uiBox('mco' + i, x, y, w, h, 6); lit(o.r, on || D.sel.course === o.id);
        wrap(c.title, 26, w - 36).slice(0, 2).forEach((ln, j) => label('mcon' + i + '_' + j, ln, x + 18, y + 32 + j * 32, { size: 26, col: on ? '#ffffff' : '#e6fdff' }));
        wrap(c.description, 20, w - 36).slice(0, 3).forEach((ln, j) => label('mcod' + i + '_' + j, ln, x + 18, y + 102 + j * 26, { size: 20, col: '#a9c9cf' }));
        c.topics.forEach((tp, j) => { L.rrect(x + 18, y + 194 + j * 32, 9, 9, 3, CYAN); label('mcot' + i + '_' + j, (j + 1) + '. ' + tp.name, x + 36, y + 199 + j * 32, { size: fitW('mcot' + i + '_' + j, (j + 1) + '. ' + tp.name, 20, w - 54, 15), col: '#e6fdff' }); });
        label('mcob' + i, 'Босс: ' + (bk ? SIM.FOE[bk].name : c.boss.unit), x + 18, y + 312, { size: 20, col: '#ff8f85' });
        const rs = rec ? 'Оценка: ' + (rec.grade || '—') + (rec.best ? ' (' + Math.round(rec.best * 100) + '%)' : '') + ' · смен ' + rec.runs : 'Курс ещё не проходился';
        label('mcor' + i, rs, x + 18, y + 346, { size: fitW('mcor' + i, rs, 20, w - 36, 15), col: '#64ffda' });
        if (on) label('mcog' + i, 'Начать ›', x + w - 18, y + h - 24, { size: 22, al: 1, col: '#64ffda' }); });
      backBtn(); return; }
    if (V.scr === 'map') { head('ВЫБОР КАРТЫ', 'Каждая смена строит карту заново: миникарта — пример раскладки');
      each((o, i) => { const [x, y, w, h] = o.r, on = hot(i), m = o.map, rec = D.byMap[m.id];
        L.uiBox('mmp' + i, x, y, w, h, 10); lit(o.r, on || D.sel.map === m.id); minimap(m.id, x + 30, y + 30, w - 60, 330);
        label('mmpn' + i, m.name, x + 30, y + 400, { size: 36, col: on ? '#ffffff' : '#e6fdff' });
        wrap(m.desc, 22, w - 60).slice(0, 4).forEach((ln, j) => label('mmpd' + i + '_' + j, ln, x + 30, y + 450 + j * 30, { size: 22, col: '#a9c9cf' }));
        wrap(m.note, 20, w - 60).slice(0, 2).forEach((ln, j) => label('mmpe' + i + '_' + j, ln, x + 30, y + 580 + j * 28, { size: 20, col: '#64ffda' }));
        label('mmpr' + i, rec ? 'Смен ' + rec.runs + ' · побед ' + rec.wins + ' · лучшее время ' + mmss(rec.time) : 'Ещё не сыграно', x + 30, y + h - 34, { size: 22, col: '#7ff6ff' }); });
      backBtn(); return; }
    if (V.scr === 'course') { head('УЧЕБНЫЙ ЦЕНТР · ВЫБОР КУРСА', 'Три лабиринта по темам курса, затем зал с боссом курса');
      each((o, i) => { const [x, y, w, h] = o.r, on = hot(i), c = o.course, rec = D.byCourse[o.id], bk = { batch_accounting: 'batch', critical_incident: 'boss' }[c.boss.unit];
        L.uiBox('mco' + i, x, y, w, h, 10); lit(o.r, on || D.sel.course === o.id);
        let ns = 36; while (ns > 24 && L.labelW('mcon' + i, c.title, { size: ns, font: MONO }) > w - 60) ns--; label('mcon' + i, c.title, x + 30, y + 50, { size: ns, col: on ? '#ffffff' : '#e6fdff' });
        wrap(c.description, 22, w - 60).slice(0, 3).forEach((ln, j) => label('mcod' + i + '_' + j, ln, x + 30, y + 100 + j * 30, { size: 22, col: '#a9c9cf' }));
        c.topics.forEach((tp, j) => { L.rrect(x + 30, y + 216 + j * 44, 10, 10, 3, CYAN); label('mcot' + i + '_' + j, (j + 1) + '. ' + tp.name + ' — ' + c.rooms[j], x + 52, y + 222 + j * 44, { size: 21, col: '#e6fdff' }); });
        label('mcob' + i, 'Босс: ' + (bk ? SIM.FOE[bk].name : c.boss.unit) + ' · вопросов: ' + c.questions.filter((q) => q.type !== 'open').length, x + 30, y + 390, { size: 22, col: '#ff8f85' });
        label('mcor' + i, rec ? 'Лучшая оценка: ' + (rec.grade || '—') + (rec.best ? ' (' + Math.round(rec.best * 100) + '%)' : '') + ' · очки ' + rec.points : 'Курс ещё не проходился', x + 30, y + 450, { size: 22, col: '#64ffda' });
        if (rec) label('mcos' + i, 'Смен ' + rec.runs + ' · курс сдан ' + rec.wins, x + 30, y + 490, { size: 22, col: '#7ff6ff' });
        label('mcog' + i, on ? (KB() ? 'Enter — начать' : 'Нажмите — начать') : '', x + w - 30, y + h - 40, { size: 24, al: 1, col: '#64ffda' }); });
      backBtn(); return; }
    if (V.scr === 'client') { head('КЛЮЧЕВОЙ КЛИЕНТ БА', 'Каждое убийство выбранного клиента даёт +1 HP и к максимуму до конца смены');
      each((o, i) => { const [x, y, w, h] = o.r, on = hot(i), k = o.client, n = artOf(k) === 'sdesk' ? 'sdesk_body' : artOf(k) + '_body', ph = 120, pw = L.hsz(n, ph);
        L.uiBox('mcl' + i, x, y, w, h, 8); lit(o.r, on || V.D.sel.client === k);
        L.sprite(n, x + w / 2 - Math.min(pw, w - 40) / 2, y + 24, { w: Math.min(pw, w - 40), h: ph * Math.min(1, (w - 40) / pw) });
        wrap(SIM.FOE[k].name, 22, w - 24).slice(0, 2).forEach((ln, j) => label('mcln' + i + '_' + j, ln, x + w / 2, y + 180 + j * 28, { size: 22, al: 0.5, col: on ? '#ffffff' : '#bfe3ea' })); });
      backBtn(); return; }
    if (V.scr === 'set') { head('НАСТРОЙКИ', 'Громкость, звук и FPS сохраняются на этом устройстве'); const P = window.AUDIO ? AUDIO.pref : { music: 0.6, effects: 0.65, musicOn: true, enabled: true };
      each((o, i) => { const [x, y, w, h] = o.r, on = hot(i); L.uiBox('mset' + i, x, y, w, h, 10); lit(o.r, on);
        label('msn' + i, o.s, x + 34, y + h / 2, { size: 30, col: o.id === 'wipe' ? (on ? '#ffd6cf' : '#ff8f85') : on ? '#ffffff' : '#bfe3ea' });
        if (o.kind === 'action') label('msv' + i, o.id === 'wipe' ? 'коды, покупки, достижения ›' : 'вернуть прогресс до сброса ›', x + w - 34, y + h / 2, { size: 24, al: 1, col: o.id === 'wipe' ? '#ff8f85' : '#64ffda' });
        else if (o.kind === 'slider') { const [bx, by, bw, bh] = o.bar, v = P[o.id]; L.rrect(bx, by, bw, bh, bh / 2, [0.05, 0.12, 0.15], [0.03, 0.08, 0.1]);
          L.rrect(bx, by, Math.max(bh, bw * v), bh, bh / 2, CYAN, [0.0, 0.6, 0.7]); L.rrect(bx + bw * v - 13, by - 9, 26, bh + 18, 9, [0.85, 1, 1], [0.6, 0.9, 0.95]);
          label('msv' + i, Math.round(v * 100) + '%', x + w - 34, y + h / 2, { size: 28, al: 1, col: '#7ff6ff' }); }
        else { const v = o.id === 'fps' ? V.D.ui.fps : P[o.id], pw = 150, px2 = x + w - 34 - pw; L.rrect(px2, y + 22, pw, h - 44, (h - 44) / 2, v ? [0.0, 0.55, 0.62] : [0.12, 0.18, 0.22]);
          label('msv' + i, v ? 'ВКЛ' : 'ВЫКЛ', px2 + pw / 2, y + h / 2, { size: 26, al: 0.5, col: v ? '#ffffff' : '#7f9ea6' }); } });
      if (!C && KB()) L.uiBox('msh', W / 2 - 640, 830, 1280, 50, 8); if (!C && KB()) label('msh', '↑↓ — выбор · ←→ или мышь — громкость · Enter — переключить · M / N — звук и музыка в смене', W / 2, 855, { size: 22, al: 0.5, col: '#7f9ea6' });
      backBtn(); return; }
    if (V.scr === 'lead') { const cl = window.CLOUD, B = cl && cl.board, m = cl && cl.METRICS[B.metric], hn = (h) => (SIM.HEROES[h] ? SIM.HEROES[h].name : '');
      const sub = m ? m.title + ' · ' + (B.scope === 'all' ? 'все карты' : 'Дата-центр') + ' · ' + (B.hero ? hn(B.hero) : 'все герои') + (B.near ? ' · рядом со мной' : '') : ''; head('ЛИДЕРЫ', sub);
      const fitL = (id, s0, size, room) => { let ns = size; while (ns > 14 && L.labelW(id, s0, { size: ns, font: MONO }) > room) ns--; return ns; };
      each((o, i) => { const [x, y, w, h] = o.r, on = !!B && (o.metric !== undefined ? B.metric === o.metric : o.scope ? B.scope === o.scope : o.heroF !== undefined ? B.hero === o.heroF : o.near ? B.near : false);
        if (o.scrollD) { const mx = B && B.rows ? Math.max(0, B.rows.length - 12) : 0, can = o.scrollD < 0 ? (B.scroll || 0) > 0 : (B.scroll || 0) < mx; if (mx) btn('mls' + i, o.r, o.s, hot(i), 26, can ? null : '#3f5a60'); return; }
        if (o.heroF) { L.uiBox('mlb' + i, x, y, w, h, 8); lit(o.r, hot(i) || on); ico(heroArt(o.heroF) + '_body', x + 8, y + 4, { w: w - 16, h: h - 8, u: { grade: [on || hot(i) ? 1 : 0.55, 1, 0, 1] } });   // a hero chip: the portrait
          if (hot(i) && !on) label('mlbt', o.s, x + w / 2, y + h + 16, { size: 16, al: 0.5, col: '#cfe9ee' }); return; }
        btn('mld' + i, o.r, o.s, hot(i) || on, fitL('mldt' + i, o.s, 24, w - 20), on ? '#ffffff' : o.refresh ? '#7ff6ff' : null); });
      const px0 = C ? 12 : W / 2 - 620, py0 = C ? 232 : 330, pw = C ? W - 24 : 1240, VIS = C ? 5 : 12, RH = 44, R0 = C ? 96 : 100; panel('mldp', px0, py0, pw, C ? 300 : 640, 0.85);
      const row = (k, place, login, hero, value, y, me) => { if (me) L.rrect(px0 + 10, y - 22, pw - 20, 44, 6, [0.0, 0.45, 0.55], [0.0, 0.3, 0.38], 0.3);
        label('mlp' + k, place, px0 + 80, y, { size: 26, al: 1, col: me ? '#64ffda' : '#7ff6ff' }); if (hero) ico(heroArt(hero) + '_body', px0 + 100, y - 19, { w: 38, h: 38 });
        label('mll' + k, login, px0 + 150, y, { size: 26, col: me ? '#ffffff' : '#e6fdff' });
        label('mlh' + k, hn(hero), px0 + (C ? 560 : 700), y, { size: fitL('mlh' + k, hn(hero), 22, C ? 200 : 300), col: '#a9c9cf' }); label('mlv' + k, value, px0 + pw - 40, y, { size: 26, al: 1, col: '#e6fdff' }); };
      const plc = (p) => (p === Infinity ? '1000+' : p ? String(p) : '—');
      if (!cl || B.error) label('mlerr', !cl ? 'Таблицы недоступны' : B.error, W / 2, py0 + 300, { size: 28, al: 0.5, col: '#ff8f85' });
      else if (B.loading && !B.rows) label('mlload', 'Загрузка…', W / 2, py0 + (C ? 150 : 300), { size: 28, al: 0.5, col: '#7ff6ff' });
      else { const me = cl.state.uid, rows = B.rows || [], sc = B.scroll || 0;
        // the player's own line on top (when they have a result here), then the table
        if (B.me) row('me', plc(B.me.place), 'Вы: ' + B.me.login, B.me.hero, cl.fmt(m, B.me.value), py0 + 36, true);
        else label('mlme', cl.state.status === 'signedIn' ? 'У вас ещё нет результата в этой таблице' : 'Войдите в главном меню, чтобы попасть в таблицу', W / 2, py0 + 36, { size: 22, al: 0.5, col: '#7f9ea6' });
        L.rrect(px0 + 20, py0 + 66, pw - 40, 2, 1, [0.13, 0.33, 0.39]);
        if (!rows.length) { const es = B.hero ? 'Этим героем пока никто не играл — сыграйте смену первым' : 'Пока никого — сыграйте смену первым'; label('mlempty', es, W / 2, py0 + (C ? 170 : 300), { size: fitL('mlempty', es, 26, pw - 40), al: 0.5, col: '#a9c9cf' }); }
        rows.slice(sc, sc + VIS).forEach((r, i) => row(i, plc(r.place), r.login, r.hero, cl.fmt(m, r.value), py0 + R0 + i * RH, r.uid === me));
        if (rows.length > VIS) { const ss = (sc + 1) + '–' + Math.min(rows.length, sc + VIS) + ' из ' + rows.length + (C || !KB() ? ' · листайте пальцем' : ' · колесо мыши или PgUp/PgDn'); label('mlsc', ss, C ? px0 + 20 : W / 2, C ? py0 + 278 : py0 + 620, { size: 18, al: C ? 0 : 0.5, col: '#7f9ea6' }); } }
      if (B && (B.note || B.at)) { const ago = B.at ? Math.max(0, Math.round((Date.now() - B.at) / 1000)) : 0, s0 = B.note || (B.loading ? 'Обновление…' : 'Обновлено ' + (ago < 5 ? 'только что' : ago < 60 ? ago + ' с назад' : Math.floor(ago / 60) + ' мин назад'));
        if (!C || B.note) label('mlat', s0, C ? W - 30 : W - 320, C ? py0 + 278 : 212, { size: 18, al: 1, col: B.note ? '#ffd6a0' : '#7f9ea6' }); }
      backBtn(); return; }
    if (V.scr === 'rec') { head('РЕКОРДЫ');
      const rows = [['Лучшее время смены', mmss(D.best.time)], ['Больше всего сбоев за смену', D.best.kills], ['Лучший уровень', D.best.lvl], ['Побед', D.wins], ['Смен сыграно', D.runs],
        ['Сбоев устранено всего', D.kills], ['Время в сменах', mmss(D.time)], ['Коды маркировки', D.codes]];
      if (C) { panel('mrp', 16, 100, W - 32, rows.length * 52 + 30, 0.85);
        rows.forEach(([k, v], i) => { label('mrk' + i, k, 40, 140 + i * 52, { size: 24, col: '#a9c9cf' }); label('mrv' + i, String(v), W - 40, 140 + i * 52, { size: 24, al: 1, col: '#e6fdff' }); }); backBtn(); return; }
      panel('mrp', W / 2 - 520, 230, 1040, rows.length * 72 + 60, 0.85);
      rows.forEach(([k, v], i) => { label('mrk' + i, k, W / 2 - 480, 290 + i * 72, { size: 30, col: '#a9c9cf' }); label('mrv' + i, String(v), W / 2 + 480, 290 + i * 72, { size: 30, al: 1, col: '#e6fdff' }); });
      backBtn(); return; }
  }

  // ---------------- QA hooks (qa.mjs): HUD screens at worst-case values, walk cycles, the trace attack all round ----------------
  S.QA = () => {
    const play = (secs, f) => { const s = SIM.spawn(0); for (let i = 0; i < secs * 120; i++) SIM.step(s, f ? f(s, i) : {}); return s; };
    const states = [];
    states.push(['match', JSON.parse(JSON.stringify(SIM.at(0.42)))]);
    states.push(['start', play(2)]);
    const late = play(1); Object.assign(late, { t: 512, lvl: 37, kills: 12345, bars: 999, hp: 199, ps: { hp: 5, speed: 5, magnet: 5, power: 5, haste: 5 }, wp: { trace: 6, orbit: 6, homing: 6, cache: 6 },
      toast: { s: 'КРИТИЧЕСКИЙ ИНЦИДЕНТ: клиенты требуют update, темп растёт, эскалация', t: 511.5 } });
    late.wcd = { trace: 0.2, orbit: 0, homing: 0.5, cache: 1 }; const b = SIM.mkFoe(late, 'boss', late.x + 400, late.y + 100); b.lvl = 4; late.boss = b.id; states.push(['late_boss', late]);
    // the «Дата-центр»'s bosses: the replica split (the tether), the retry storm's queue, the outage's blackout with a component down
    { const s = play(1); const b = SIM.mkFoe(s, 'repl', s.x + 360, s.y - 40); b.hp = b.mhp * 0.4; s.boss = b.id; for (let i = 0; i < 30; i++) SIM.step(s, { px: 1200, py: 500 });
      const o = s.E.find((q) => q.copy); if (o) { o.x = s.x - 300; o.y = s.y + 60; } states.push(['boss_repl', s]); }
    { const s = play(1); const b = SIM.mkFoe(s, 'rstorm', s.x + 420, s.y + 60); b.nextAtk = 0; s.boss = b.id; for (let i = 0; i < 160; i++) SIM.step(s, { px: 1200, py: 500 }); states.push(['boss_queue', s]); }
    { const s = play(1); s.nodes.forEach((n) => (n.st = 1)); const b = SIM.mkFoe(s, 'outage', s.x + 380, s.y + 80); s.boss = b.id; for (let i = 0; i < 90; i++) SIM.step(s, { px: 1200, py: 500 }); states.push(['boss_outage', s]); }
    const pk = play(1); Object.assign(pk, { lvl: 88, pick: { t0: pk.t - 1, opts: [{ k: 'w', id: 'orbit' }, { k: 'p', id: 'magnet' }, { k: 'w', id: 'cache' }] }, wp: { trace: 1, orbit: 5, cache: 0 } }); delete pk.wp.cache;
    states.push(['pick', pk]);
    const pk2 = play(1); Object.assign(pk2, { pick: { t0: pk2.t - 1, opts: [{ k: 'w', id: 'trace' }, { k: 'w', id: 'mine' }, { k: 'heal', id: 'hp' }] } }); states.push(['pick_heal', pk2]);
    const pk3 = play(1); Object.assign(pk3, { wp: { trace: 6, udp_x: 1, turret: 3, chain_x: 1, storm: 5, fork_x: 1 }, ps: Object.assign({}, pk3.ps, { power: 5, haste: 5, area: 5, amount: 5, dur: 5, hp: 5 }),
      pick: { t0: pk3.t - 1, chest: 1, opts: [{ k: 'evo', id: 'trace_x', from: 'trace' }, { k: 'w', id: 'storm' }, { k: 'p', id: 'amount' }] } }); states.push(['pick_evo', pk3]);
    if (window.META) { const ps = play(1); ps.qaPause = 1; states.push(['pause', ps]); const ms = play(1); ms.qaMenu = 'main'; ms.qaSusp = { hero: 'qa', map: 'edu', t: 754 }; states.push(['menu_main_resume', ms]); }
    if (window.META) for (const scr of ['main', 'shop', 'coll', 'ach', 'rec', 'set', 'hero', 'client', 'map', 'course', 'lead']) { const ms = play(1); ms.qaMenu = scr; states.push(['menu_' + scr, ms]); }
    // the defensive items: the shield's sphere (the evolution's two charges), the moment of a block, their level-up cards
    { const s = SIM.spawn(0, {}, {}); s.wp.shield_x = 1; s.wcd.shield_x = 0; for (let i = 0; i < 120 * 7; i++) SIM.step(s, { px: 1200, py: 500 }); s.ps.firewall = 3; s.ps.repair = 2; states.push(['shield_charged', s]); }
    { const s = SIM.spawn(0, {}, {}); s.wp.shield = 4; s.wcd.shield = 0; for (let i = 0; i < 60; i++) SIM.step(s, { px: 1200, py: 500 }); s.iT = -9; s.MK.push({ x: s.x, y: s.y, r: 200, delay: 0, t0: s.t - 1, dmg: 99 });
      for (let i = 0; i < 18; i++) SIM.step(s, { px: 1200, py: 500 }); states.push(['shield_block', s]); }
    { const s = play(1); s.pick = { t0: s.t - 1, opts: [{ k: 'w', id: 'shield' }, { k: 'p', id: 'firewall' }, { k: 'p', id: 'repair' }] }; states.push(['pick_defense', s]); }
    // E abilities: every hero casting in a crowd (its effect and the HUD slot), and the rank card among the level-up cards
    for (const h of Object.keys(SIM.HEROES)) { const s = SIM.spawn(0, {}, { hero: h }); s.nextSwarm = 1e9;
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283, e = SIM.mkFoe(s, 'node', s.x + Math.cos(a) * 260, s.y + Math.sin(a) * 180); e.hp = e.mhp = 1e5; }
      SIM.step(s, { use: 1, px: 1200, py: 500 }); for (let i = 0; i < 40; i++) SIM.step(s, { px: 1200, py: 500 }); s.abR = 2; states.push(['ability_' + h, s]); }
    { const s = play(1); s.ab.cd = 9.4; s.abR = 1; s.pick = { t0: s.t - 1, opts: [{ k: 'ab', id: 'overclock' }, { k: 'w', id: 'orbit' }, { k: 'p', id: 'magnet' }] }; states.push(['pick_ability', s]); }
    // skins: the shop tab, the hero screen with a skin row, heroes in a run wearing every kind of gear
    if (window.META) { const sh = play(1); sh.qaMenu = 'shop'; sh.qaTab = 'skin'; states.push(['menu_shop_skin', sh]); }
    if (window.META) { const cf = play(1); cf.qaMenu = 'coll'; cf.qaCtab = 'foes'; states.push(['menu_coll_foes', cf]); const ah = play(1); ah.qaMenu = 'ach'; ah.qaCat = 'heroes'; states.push(['menu_ach_heroes', ah]); }
    for (const [h, k] of [['utrace', 'utrace_arctic'], ['utrace', 'utrace_zen'], ['utrace', 'utrace_storm'], ['traceability', null], ['serialization', null], ['ba', null], ['qa', null], ...Object.keys(SIM.SKINS).filter((k) => SIM.SKINS[k].hero !== 'utrace').map((k) => [SIM.SKINS[k].hero, k])]) {
      const s = SIM.spawn(0, {}, { hero: h, skin: k }); for (let i = 0; i < 60; i++) SIM.step(s, { right: i % 40 < 20 }); s.E = []; states.push(['skin_' + (k || h), s]); }
    // the training centre: the maze HUD at a terminal, every test page at its longest (6 options, the longest texts), the results
    if (window.EDU) { const C = EDU.C, all = C.order.flatMap((id) => C.courses[id].questions.filter((q) => q.type !== 'open').map((q) => [id, q]));
      const longest = (f) => all.reduce((a, b) => (f(b[1]) > f(a[1]) ? b : a));
      const edu = (id) => { const s = SIM.spawn(0, {}, { map: 'edu', hero: 'utrace', course: id }); for (let i = 0; i < 120; i++) SIM.step(s, {}); return s; };
      const test = (name, [id, q], phase, extra) => { const s = edu(id), tm = SIM.LEVEL.TERMS[0]; s.nodes[0].st = 1; EDU.begin(s.ed, 'lesson', { topic: tm.topic, k: 0, i: 0 }, s.lseed, () => 0.5);
        const a = s.ed.active; a.questions[0] = { id: q.id, options: q.options.map((o) => o.id) }; a.phase = phase; Object.assign(a, extra ? extra(q, a) : {}); states.push([name, s]); };
      const hs = edu(C.order[0]), tm = SIM.LEVEL.TERMS[0]; hs.nodes[0].st = 1; hs.x = tm.x; hs.y = tm.y; hs.ed.points = 990; hs.toast = { s: 'ТЕРМИНАЛ 1: тест открыт — подойди и нажми E', t: hs.t, good: 1 }; states.push(['edu_hud', hs]);
      test('quiz_intro', longest((q) => 0), 'intro');
      test('quiz_q6', longest((q) => q.options.length * 1000 + Math.max(...q.options.map((o) => o.text.length))), 'question', (q) => ({ selected: [q.options[0].id] }));
      test('quiz_q_long', longest((q) => q.text.length), 'question');
      test('quiz_feedback', longest((q) => (q.explanation || '').length + q.options.reduce((n, o) => n + o.text.length, 0) * 0.3), 'feedback', (q) => ({ selected: q.options.filter((o) => !q.correct.includes(o.id)).map((o) => o.id).slice(0, 2), lastCorrect: false, res: [0] }));
      test('quiz_result', all[0], 'result', () => ({ correct: 1, answered: 3, passed: false, res: [0, 1, 0] }));
      { const s = edu(C.order[1]); EDU.begin(s.ed, 'revive', null, s.lseed, () => 0.5); states.push(['quiz_revive', s]); }
      { const s = edu(C.order[1]); s.ed.points = 990; s.ed.answers = { a: { attempts: 3, correct: 1, firstCorrect: false, firstCorrectAt: 2, wrong: [], sources: ['terminal'], topic: 1 } }; s.room = 3; s.ed.reviveUsed = true;
        Object.assign(s, { over: { k: 'win', t: s.t - 2 }, kills: 99999, bars: 999 }); states.push(['over_edu', s]); } }
    const dead = play(1); Object.assign(dead, { over: { k: 'dead', t: dead.t - 2 }, kills: 99999, lvl: 99, bars: 9999, dead: dead.t - 2, hp: 0 }); states.push(['over_dead', dead]);
    const win = play(1); Object.assign(win, { over: { k: 'win', t: win.t - 2 }, kills: 4321 }); states.push(['over_win', win]);
    const cb = JSON.parse(JSON.stringify(SIM.at(0.9))); states.push(['combo', cb]);
    // walk cycles: one actor travelling right through one gait cycle, the camera following
    const cycles = {}, subject = {}, cycleT = {}, rest = {}, sprites = {}, actors = ['hero', ...Object.keys(SIM.FOE).filter((k) => !RIGS[k].desk)];
    const hw = SIM.spawn(0); hw.E = []; hw.g = 1; hw.wp = { trace: 1 }; hw.ux = 1; hw.uy = 0; hw.aim = 0; hw.face = 1;
    cycles.hero = []; for (let i = 0; i < 12; i++) { const d = i * RIGS.hero.stride / 12, s = JSON.parse(JSON.stringify(hw)); s.dist = d; s.x = hw.x + d; s.cam = [s.x - W / 2, hw.cam[1]]; cycles.hero.push(s); }
    subject.hero = 'hero'; cycleT.hero = RIGS.hero.stride / SIM.K.SPEED; rest.hero = Object.assign(JSON.parse(JSON.stringify(hw)), { g: 0, neutral: true }); sprites.hero = ['hero_body', 'hero_leg', 'hero_foot', 'hero_arm', 'scanner'];
    for (const k of actors.slice(1)) { const s0 = SIM.spawn(0); s0.E = []; s0.x = 900; const e = SIM.mkFoe(s0, k, 2400, 1700); Object.assign(e, { face: 1, ux: 1, uy: 0, g: 1, nextAtk: 1e9, sumT: 1e9, escT: 1e9 });
      cycles[k] = []; for (let i = 0; i < 12; i++) { const d = i * RIGS[k].stride / 12, s = JSON.parse(JSON.stringify(s0)); s.E[0].dist = d; s.E[0].x = 2400 + d; s.cam = [2400 + d - W / 2, 1700 - H / 2 - 40]; cycles[k].push(s); }
      subject[k] = 'e' + e.id; cycleT[k] = RIGS[k].stride / SIM.FOE[k].sp; sprites[k] = [k + '_body', k + '_leg', k + '_foot', k + '_arm'];
      const rs = JSON.parse(JSON.stringify(s0)); rs.E[0].g = 0; rs.cam = [2400 - W / 2, 1700 - H / 2 - 40]; rest[k] = rs; }
    // the trace strike at its impact frame against targets all round (grip → tip must point at the target)
    const attacks = { trace: { subject: 'hero', states: [] } };
    for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4 + 0.2, s = SIM.spawn(0); s.E = []; s.aim = an; s.face = Math.cos(an) < -0.2 ? -1 : 1;
      const tp = SIM.tip(s), e = SIM.mkFoe(s, 'node', tp[0] + Math.cos(an) * 150, tp[1] + Math.sin(an) * 150 + 30); e.nextAtk = 1e9; s.qaTarget = [e.x, e.y - 30]; attacks.trace.states.push(s); }
    return { states, cycles, subject, cycleT, rest, sprites, actors, attacks, box: (name, st) => { const e = name === 'hero' ? { x: st.x, y: st.y } : st.E[0], R0 = RIGS[name] || RIGS.hero, h = (R0.hipY || 30) + R0.body + 50, w = Math.max(160, h * 1.2);
      return [Math.round(e.x - st.cam[0] - w / 2), Math.round(e.y - st.cam[1] - h + 20), Math.round(w), Math.round(h)]; } };
  };
  // qa.mjs sets LIB.TRACE; actors then report their joints under these ids
  Object.defineProperty(S, 'TRACE_IDS', { get: () => !!L.TRACE });
})();
