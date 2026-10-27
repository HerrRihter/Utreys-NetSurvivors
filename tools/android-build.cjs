// Builds the Android app (docs/ANDROID.md, stage 8 of docs/PLAN-FEEDBACK-27-10.md): the game packed as a static build (the ref2game
// skill's pack.py → dist/app/game), copied into android/ (cap sync), then an APK by Gradle. Modelled on utreys-survivors'
// tools/android-build.cjs. The Capacitor CLI is the original project's (D:\Utreys-Survivors, read only); the platform packages are
// copies in node_modules/@capacitor.
//
//   node tools/android-build.cjs            debug APK → android/app/build/outputs/apk/debug/app-debug.apk
//   node tools/android-build.cjs release    signed APK (needs android/keystore.properties)
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const android = path.join(root, 'android');
const windows = process.platform === 'win32';
const CAP = process.env.CAP_CLI || 'D:/Utreys-Survivors/node_modules/@capacitor/cli/bin/capacitor';
const PACK = process.env.REF2GAME_PACK || path.join(os.homedir(), '.claude/skills/ref2game/scripts/pack.py');

function run(command, args, options = {}) {
  const line = [command, ...args].map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ');
  console.log('> ' + line);
  // python, node and gradlew.bat run through the shell on Windows; the arguments are this file's own
  const result = windows ? spawnSync(line, { stdio: 'inherit', shell: true, ...options }) : spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) throw new Error(`${command} failed`);
}

// Gradle needs a JDK and the Android SDK; Android Studio brings both
function toolchain() {
  const env = { ...process.env, PYTHONUTF8: '1' };
  const studio = 'C:\\Program Files\\Android\\Android Studio\\jbr';
  if (!env.JAVA_HOME && windows && fs.existsSync(studio)) env.JAVA_HOME = studio;
  // Java on Windows opens its internal pipes as sockets in %TEMP%; where it may not, Gradle stops with «Unable to establish
  // loopback connection». A folder of our own avoids that.
  if (windows && !/unixdomain\.tmpdir/.test(env.JAVA_TOOL_OPTIONS || '')) {
    const tmp = path.join(android, '.gradle', 'java-tmp'); fs.mkdirSync(tmp, { recursive: true });
    env.JAVA_TOOL_OPTIONS = `${env.JAVA_TOOL_OPTIONS || ''} -Djdk.net.unixdomain.tmpdir=${tmp}`.trim();
  }
  if (!env.ANDROID_HOME && !fs.existsSync(path.join(android, 'local.properties'))) {
    const sdk = windows ? path.join(env.LOCALAPPDATA || '', 'Android', 'Sdk') : path.join(env.HOME || '', 'Android', 'Sdk');
    if (!fs.existsSync(sdk)) throw new Error('Android SDK not found: open Android Studio once to install it, or set ANDROID_HOME.');
    env.ANDROID_HOME = sdk;
  }
  return env;
}

function main([kind = 'debug']) {
  if (kind !== 'debug' && kind !== 'release') { console.error('Usage: node tools/android-build.cjs [debug|release]'); return 2; }
  if (kind === 'release' && !fs.existsSync(path.join(android, 'keystore.properties'))) { console.error('android/keystore.properties is missing: see docs/ANDROID.md, «Подпись».'); return 2; }
  // the APK talks to the real Firebase project (live/firebase-config.js), never to the emulators (?emu=1 is a page parameter only)
  if (!fs.existsSync(path.join(root, 'live', 'firebase-config.js'))) console.warn('No live/firebase-config.js: the APK will play without an account.');
  const env = toolchain();
  run('python', [PACK, '--name', 'app', '--out', 'dist'], { cwd: root, env });
  run('node', [CAP, 'sync', 'android'], { cwd: root, env });
  // clean first: an incremental build keeps assets that were removed from the game (an APK of 150 MB after the textures shrank)
  run(path.join(android, windows ? 'gradlew.bat' : 'gradlew'), ['clean', kind === 'release' ? 'assembleRelease' : 'assembleDebug', ...(process.env.GRADLE_OFFLINE ? ['--offline'] : [])], { cwd: android, env });
  const apk = path.join(android, 'app', 'build', 'outputs', 'apk', kind, `app-${kind}.apk`);
  if (fs.existsSync(apk)) console.log(`\nAPK: ${apk} (${(fs.statSync(apk).size / 1048576).toFixed(1)} MB)`);
  return 0;
}
try { process.exitCode = main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exitCode = 1; }
