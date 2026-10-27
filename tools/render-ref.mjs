// Deterministic reference frames for renderer changes: node tools/render-ref.mjs <prefix>   (server on $PORT or 8931)
// Renders the attract demo at fixed times, a busy staged run (many foes and weapons, fixed seed), and menu screens, and counts draw
// calls per frame. Compare two prefixes with tools/render-diff.py.
import fs from 'fs';
const { chromium } = await import(process.env.PLAYWRIGHT ? 'file:///' + process.env.PLAYWRIGHT.replace(/\\/g, '/') + '/index.mjs' : 'playwright');
const prefix = process.argv[2] || 'frames/batch/ref', port = process.env.PORT || 8931;
const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; pg.on('pageerror', (e) => errs.push(String(e))); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto(`http://127.0.0.1:${port}/live/index.html?render=1`); await pg.waitForFunction(() => window.__ready, null, { timeout: 60000 });
fs.mkdirSync(prefix.replace(/[^/\\]+$/, ''), { recursive: true });
const shots = await pg.evaluate(() => {
  const gl = document.getElementById('c').getContext('webgl2'); let calls = 0;
  const da = gl.drawArrays.bind(gl), di = gl.drawArraysInstanced.bind(gl); gl.drawArrays = (...a) => { calls++; return da(...a); }; gl.drawArraysInstanced = (...a) => { calls++; return di(...a); };
  const out = []; const snap = (name) => { out.push({ name, calls, png: document.getElementById('c').toDataURL('image/png') }); };
  for (const t of [3, 9, 15, 21]) { SCENE.state = null; window.__META = window.META; window.META = undefined; calls = 0; SCENE.render(t); window.META = window.__META; snap('demo_' + t); }
  const S = SIM.spawn(5, {}, { hero: 'utrace' }); S.wp = { trace_x: 1, chain: 6, storm: 6, orbit_x: 1, fork: 6, cryo: 6 };
  for (let i = 0; i < 120 * 240; i++) { SIM.step(S, { px: 1200, py: 500, slot: S.pick ? 1 : 0 }); S.hp = 999; }
  SCENE.state = S; calls = 0; SCENE.render(S.t); snap('busy');
  for (const scr of ['shop', 'coll', 'set']) { const st = SIM.spawn(1); st.qaMenu = scr; SCENE.state = st; calls = 0; SCENE.render(1); snap('menu_' + scr); }
  return out; });
for (const s of shots) fs.writeFileSync(`${prefix}_${s.name}.png`, Buffer.from(s.png.split(',')[1], 'base64'));
console.log(JSON.stringify({ errors: errs, calls: Object.fromEntries(shots.map((s) => [s.name, s.calls])) }));
await b.close();
