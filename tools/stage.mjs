// Staged frames: put foes around the hero, run the sim a few seconds, render and save PNGs.
//   node tools/stage.mjs out_prefix "k1,k2,..." [seconds...]       (server on 127.0.0.1:8930)
import fs from 'fs';
const { chromium } = await import(process.env.PLAYWRIGHT ? 'file:///' + process.env.PLAYWRIGHT.replace(/\\/g, '/') + '/index.mjs' : 'playwright');
const [out = 'frames/stage', list = 'mond,prog,royal,cherk,pg,petfood,logq', ...ts] = process.argv.slice(2);
const times = ts.length ? ts.map(Number) : [1.5, 3, 4.5];
const b = await chromium.launch(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}); const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = []; pg.on('pageerror', (e) => errs.push(String(e))); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await pg.goto('http://127.0.0.1:8930/live/index.html?render=1' + (process.env.LOOK ? '&look=' + process.env.LOOK : '')); await pg.waitForFunction(() => window.__ready, null, { timeout: 60000 });
fs.mkdirSync(out.replace(/[^/\\]+$/, ''), { recursive: true });
const HERO = process.env.HERO || 'utrace', WP = process.env.WP ? JSON.parse(process.env.WP) : null, PS = process.env.PS ? JSON.parse(process.env.PS) : {};
const shots = await pg.evaluate(({ list, times, WP, PS, HERO }) => {
  const S = SIM.spawn(0, {}, { hero: HERO }); S.E = S.E.filter((e) => Math.hypot(e.x - S.x, e.y - S.y) > 2500); S.hp = 1e6; S.nextSwarm = 1e9; if (WP) { S.wp = WP; S.wcd = {}; } Object.assign(S.ps, PS);
  const ks = list ? list.split(',') : []; ks.forEach((k, i) => { const a = i / ks.length * 6.28 + 0.3, r = k === 'batch' || k === 'sdesk' ? 520 : 330;
    const e = SIM.mkFoe(S, k, S.x + Math.cos(a) * r * 1.3, S.y + Math.sin(a) * r * 0.8); e.nextAtk = 0.3 + i * 0.25; e.sumT = 0.5; });
  const res = []; let t = 0;
  for (const T of times) { while (t < T) { SIM.step(S, { px: 1300, py: 540, press: 0 }); S.hp = 1e6; if (S.pick) SIM.step(S, { slot: 1 }); t += SIM.DT; }
    SCENE.state = S; SCENE.render(S.t); res.push(document.getElementById('c').toDataURL('image/png')); }
  return res; }, { list, times, WP, PS, HERO });
shots.forEach((d, i) => fs.writeFileSync(`${out}_${i}.png`, Buffer.from(d.split(',')[1], 'base64')));
console.log(JSON.stringify({ errors: errs, shots: shots.map((_, i) => `${out}_${i}.png`) }));
await b.close();
