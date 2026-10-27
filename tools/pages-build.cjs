// Builds the web version for GitHub Pages (.github/workflows/pages.yml): live/ copied to dist/pages as a static site, as the
// ref2game skill's pack.py does for the APK — index.html gets window.__STATIC__, so hot-reload polling and the dev overlay are off,
// and window.__BUILD__ (the commit), so the files are cached between visits.
// The dev tools (*.cjs) stay out. The game opens at the site's root.
//
//   node tools/pages-build.cjs              → dist/pages
//   python tools/serve.py 8930              then http://127.0.0.1:8930/dist/pages/index.html to check it locally
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const live = path.join(root, 'live');
const out = path.join(root, 'dist', 'pages');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(live)) {
  const from = path.join(live, f);
  if (fs.statSync(from).isDirectory()) fs.cpSync(from, path.join(out, f), { recursive: true });
  else if (f.endsWith('.js')) fs.copyFileSync(from, path.join(out, f));
}
const html = fs.readFileSync(path.join(live, 'index.html'), 'utf8');
// the commit names the version: files load as name?v=<commit>, cached until the next deploy
const build = (process.env.GITHUB_SHA || spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout || String(Date.now())).trim().slice(0, 12);
const marked = html.replace('<script>\n', `<script>window.__STATIC__ = 1; window.__BUILD__ = '${build}';</script>\n<script>\n`);
if (marked === html) throw new Error('live/index.html: no <script> to mark the static build');
fs.writeFileSync(path.join(out, 'index.html'), marked);
// no Jekyll: Pages serves the files as they are
fs.writeFileSync(path.join(out, '.nojekyll'), '');
const count = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1), 0);
console.log(`pages: ${count(out)} files in ${path.relative(root, out)}`);
