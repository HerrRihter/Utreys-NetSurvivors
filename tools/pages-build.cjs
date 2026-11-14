// Builds the static app: the web version for GitHub Pages (.github/workflows/pages.yml) and the web part of the APK
// (tools/android-build.cjs → dist/app/game). live/ is copied as it is, and laid out as the app (docs/PLAN-SUPERAPP.md, stage 2):
//   index.html   the shell (built from shell/ into live/shell/ by Vite), the page the app opens on; its files in ui/
//   game.html    the game (live/index.html in development, where the game's tools expect it)
// Both pages get window.__STATIC__ (hot-reload polling and the dev overlay off; the pages link each other by these names) and
// window.__BUILD__ (the commit: files load as name?v=<commit>, cached until the next deploy). The dev tools (*.cjs) stay out.
// The textures ship as WebP (tools/webp-assets.py, needs Pillow).
//
//   node tools/pages-build.cjs              → dist/pages
//   node tools/pages-build.cjs dist/app/game   (the APK's copy)
//   python tools/serve.py 8930              then http://127.0.0.1:8930/dist/pages/index.html to check it locally
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const live = path.join(root, 'live');
const out = path.resolve(root, process.argv[2] || path.join('dist', 'pages'));

// the shell (shell/ → live/shell/, Vite) first: it is copied with the rest of live/
const vite = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
if (!fs.existsSync(vite)) throw new Error('No Vite: run npm ci first.');
const shell = spawnSync(process.execPath, [vite, 'build', '--logLevel', 'warn'], { cwd: root, stdio: 'inherit' });
if (shell.status !== 0) throw new Error('the shell did not build (npm run shell)');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(live)) {
  const from = path.join(live, f);
  if (fs.statSync(from).isDirectory()) fs.cpSync(from, path.join(out, f), { recursive: true });
  else if (f.endsWith('.js')) fs.copyFileSync(from, path.join(out, f));
}
// the commit names the version: files load as name?v=<commit>, cached until the next deploy
const build = (process.env.GITHUB_SHA || spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout || String(Date.now())).trim().slice(0, 12);
const mark = `<script>window.__STATIC__ = 1; window.__BUILD__ = '${build}';</script>\n`;
// the game → game.html
const html = fs.readFileSync(path.join(live, 'index.html'), 'utf8');
const game = html.replace('<script>\n', mark + '<script>\n');
if (game === html) throw new Error('live/index.html: no <script> to mark the static build');
fs.writeFileSync(path.join(out, 'game.html'), game);
// the shell → index.html at the root: its shared scripts (../course.js, ../learn/*) are next to it now, versioned like the game's
const shellDir = path.join(out, 'shell'), sh = fs.readFileSync(path.join(shellDir, 'index.html'), 'utf8');
const home = sh.replace(/<script src="\.\.\/([^"]+)"><\/script>/g, (_, f) => `<script src="./${f}?v=${build}"></script>`).replace('<head>', '<head>\n  ' + mark.trim());
if (home === sh || !/\.\/course\.js\?v=/.test(home)) throw new Error('live/shell/index.html: the shared scripts were not found to relink');
fs.writeFileSync(path.join(out, 'index.html'), home);
fs.cpSync(path.join(shellDir, 'ui'), path.join(out, 'ui'), { recursive: true });
fs.rmSync(shellDir, { recursive: true, force: true });
// the textures as WebP: ~10 MB to download instead of ~59 MB of PNG
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const webp = spawnSync(python, [path.join(__dirname, 'webp-assets.py'), out, '--html', 'game.html'], { stdio: 'inherit' });
if (webp.status !== 0) throw new Error('tools/webp-assets.py failed (pip install pillow)');
// no Jekyll: Pages serves the files as they are
fs.writeFileSync(path.join(out, '.nojekyll'), '');
const count = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(dir, e.name)) : 1), 0);
console.log(`pages: ${count(out)} files in ${path.relative(root, out)}`);
