// The shell (docs/PLAN-SUPERAPP.md, stage 2): Preact + Signals, sources in shell/, built into live/shell/ so the game's server,
// hot reload, the static builds (tools/pages-build.cjs) and the APK pick it up like any file of live/. live/shell/ is not in git.
//   npm run shell           build once
//   npm run shell:watch     rebuild on every change (then reload the page served by tools/serve.py)
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  root: 'shell',
  base: './',                       // relative URLs: the site lives under /Utreys-NetSurvivors/, the APK at the WebView's root
  plugins: [preact()],
  // assets in ui/, not assets/: the static builds put the shell at the root, next to the game's textures in assets/
  build: { outDir: '../live/shell', emptyOutDir: true, assetsDir: 'ui', target: 'es2020', reportCompressedSize: true },
});
