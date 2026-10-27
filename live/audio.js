// live/audio.js: sound driven by the sim event bus (S.ev), modelled on utreys-survivors (src/core/audio.js): the same files
// (live/audio, credits in CREDITS.md), music by mode (battle loop in a run, victory / defeat at its end), effects with per-name
// cooldowns and pitch jitter, the same default mix (music 0.3, effects 0.65). Effects go through WebAudio so a crowd can overlap
// them cheaply and enemy sounds are panned and fade with distance from the hero. M mutes everything, N toggles the music.
// The shift's music is a playlist (audio/music/playlist.json, placeholders until the owner adds tracks): the pause menu skips to
// the next track or repeats the current one; without repeat the list plays in a circle.
(() => {
  const ROOT = 'audio/', pref = { v: 2, enabled: true, music: 0.6, effects: 0.65, musicOn: true, track: '', repeat: false };                  // music was 0.3: too quiet under the effects
  try { const sv = JSON.parse(localStorage.getItem('ns_audio') || '{}'); if (!sv.v && sv.music === 0.3) delete sv.music; Object.assign(pref, sv, { v: 2 }); } catch (_) {}
  const save = () => { try { localStorage.setItem('ns_audio', JSON.stringify(pref)); } catch (_) {} };
  const CLIPS = { hit: ['hit-1.mp3', 'hit-2.mp3'], hurt: ['hurt.mp3'], throw: ['throw.ogg'], pickup: ['pickup.ogg'], heal: ['heal.ogg'], level: ['level.ogg'],
    ui: ['ui.ogg'], boss: ['boss.ogg'], magic: ['magic.ogg'], death: ['death-1.mp3', 'death-2.mp3', 'death-3.mp3'], punch: ['punch.mp3'] };
  const VOL = { pickup: 0.35, death: 0.55 }, COOL = { death: 0.18, pickup: 0.1 }, JITTER = new Set(['hit', 'throw', 'punch']);
  // sim event → clip (and a level trim); the hero's sounds play at full level, the enemies' fade with distance
  const MAP = {
    swing: ['throw', 0.8], hit: ['hit', 1], kill: ['death', 1], hurt: ['hurt', 1], gem: ['pickup', 1], bar: ['pickup', 1.2], heal: ['heal', 1],
    lvl: ['level', 1], picked: ['ui', 1], capture: ['level', 1], combo: ['magic', 0.7], dash: ['throw', 0.5],
    shot: ['magic', 0.45], ping: ['magic', 0.5], blast: ['magic', 0.8], boom: ['boss', 0.9],
    strike: ['punch', 0.8], fire: ['throw', 0.6], toss: ['throw', 0.6], lob: ['throw', 0.6], beam: ['magic', 0.9], spin: ['punch', 0.9],
    splash: ['hit', 0.5], mortar: ['boss', 0.5], slam: ['boss', 0.8], pulse: ['magic', 0.6], tickets: ['ui', 1], summon: ['boss', 0.6], esc: ['boss', 0.5],
    bossin: ['boss', 1], bossdown: ['boss', 1], split: ['boss', 0.8], queue: ['magic', 0.7], down: ['boss', 0.7], dark: ['boss', 0.9],
    udp: ['throw', 0.35], tfire: ['throw', 0.3], chain: ['magic', 0.6], bolt: ['boss', 0.4], cryo: ['heal', 0.7], turret: ['ui', 1], evo: ['level', 1.3], chest: ['magic', 1], ability: ['level', 0.8], frozen: ['heal', 0.5], shieldblock: ['magic', 1], shieldup: ['ui', 0.7],
  };
  const ENEMY = new Set(['hit', 'kill', 'strike', 'fire', 'toss', 'lob', 'beam', 'spin', 'splash', 'mortar', 'slam', 'pulse', 'tickets', 'summon', 'esc', 'boom', 'blast']);
  let halted = false, ctx = null, fxBus, bufs = {}, lastS = null, lastW = null, seen = new WeakSet(), lastT = -1, still = 0, voices = 0, result = null;
  const cool = {}, tracks = {}; let cur = null;

  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    fxBus = ctx.createGain(); fxBus.gain.value = pref.enabled ? pref.effects : 0; fxBus.connect(ctx.destination);
    for (const k in CLIPS) for (const f of CLIPS[k]) fetch(ROOT + 'sfx/' + f).then((r) => r.arrayBuffer()).then((a) => ctx.decodeAudioData(a)).then((b) => (bufs[f] = b)).catch(() => {});
  }
  function effect(name, S, e, trim = 1) {
    if (!ctx || !pref.enabled || halted) return; const t = ctx.currentTime;
    if (t - (cool[name] ?? -9) < (COOL[name] ?? 0.065)) return;
    const files = CLIPS[name], f = files[Math.floor(Math.random() * files.length)], b = bufs[f]; if (!b) return;
    let gain = (VOL[name] ?? 0.65) * trim, pan = 0;
    if (S && e && e.x !== undefined && ENEMY.has(e.k)) { const dx = e.x - S.x, d = Math.hypot(dx, e.y - S.y); gain *= Math.max(0, 1 - d / 1500); pan = Math.max(-0.8, Math.min(0.8, dx / 1100)); }
    if (gain < 0.04 || voices > 24) return; cool[name] = t;
    const s = ctx.createBufferSource(), g = ctx.createGain(), p = ctx.createStereoPanner(); s.buffer = b; g.gain.value = gain; p.pan.value = pan;
    if (JITTER.has(name)) s.playbackRate.value = 0.94 + Math.random() * 0.12;                     // pitch varies with speed, as in the original
    s.connect(g); g.connect(p); p.connect(fxBus); voices++; s.onended = () => { voices--; p.disconnect(); }; s.start(t);
  }

  // the refusal (not enough codes, a locked card, a rank at its cap): a short falling double buzz, synthesised, no file
  function deny() {
    if (!ctx || !pref.enabled) return; const t = ctx.currentTime; if (t - (cool.deny ?? -9) < 0.12) return; cool.deny = t;
    for (const [d, f0, f1] of [[0, 260, 200], [0.11, 200, 140]]) { const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = 'square'; o.frequency.setValueAtTime(f0, t + d); o.frequency.exponentialRampToValueAtTime(f1, t + d + 0.09); lp.type = 'lowpass'; lp.frequency.value = 1400;
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.22, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.1);
      o.connect(lp); lp.connect(g); g.connect(fxBus); o.start(t + d); o.stop(t + d + 0.12); }
  }

  // ---------------- music by mode ----------------
  // the shift's playlist: { file, title, author, license } from audio/music/playlist.json; these placeholders until it loads
  let playlist = [{ file: 'battle.mp3', title: 'Заглушка 1 · Battle Theme A' }, { file: 'menu.mp3', title: 'Заглушка 2 · Corrupt Data Stream' }];
  fetch(ROOT + 'music/playlist.json').then((r) => r.json()).then((j) => { const xs = (Array.isArray(j) ? j : j.tracks || []).filter((x) => x && typeof x.file === 'string' && /\.(mp3|ogg)$/i.test(x.file));
    if (xs.length) playlist = xs.map((x) => ({ file: x.file, title: String(x.title || x.file.replace(/\.\w+$/, '')), author: x.author || '', license: x.license || '' })); }).catch(() => {});
  const pick = () => Math.max(0, playlist.findIndex((x) => x.file === pref.track));
  const plKey = () => 'pl:' + playlist[pick()].file;
  function track(name) { if (!tracks[name]) { const pl = name.startsWith('pl:'), a = new Audio(ROOT + 'music/' + (pl ? encodeURIComponent(name.slice(3)) : name + '.mp3')); a.preload = 'auto';
    a.loop = name === 'menu' || (pl && (pref.repeat || playlist.length < 2)); tracks[name] = a; } return tracks[name]; }
  // the pause menu: the next track (the shift's music changes at once, with the crossfade) and repeat of the current one
  function nextTrack() { unlock(); pref.track = playlist[(pick() + 1) % playlist.length].file; save(); }
  function toggleRepeat() { pref.repeat = !pref.repeat; save(); for (const k in tracks) if (k.startsWith('pl:')) tracks[k].loop = pref.repeat || playlist.length < 2; }
  // music by mode with a 1 s crossfade: the outgoing track fades out and pauses, the incoming one fades in
  let fading = []; const FADE = 1;
  function sync(mode) {                                                     // mode: 'menu' | 'battle' | 'level' | 'pause' | 'end'
    if (cur && cur.name.startsWith('pl:') && cur.a.ended && !cur.a.loop) pref.track = playlist[(pick() + 1) % playlist.length].file;   // the list plays in a circle
    const want = mode === 'end' ? result : mode === 'menu' ? 'menu' : plKey(), now = performance.now() / 1000;
    if ((cur && cur.name) !== want) { if (cur) fading.push({ a: cur.a, v0: cur.a.volume, t0: now });
      cur = want ? { name: want, a: track(want), t0: now } : null; if (cur) { fading = fading.filter((f) => f.a !== cur.a); cur.a.currentTime = 0; } }
    fading = fading.filter((f) => { const q = (now - f.t0) / FADE; if (q >= 1 || f.a.paused) { f.a.pause(); return false; } f.a.volume = Math.max(0, f.v0 * (1 - q)); return true; });
    if (!cur) return; const fin = Math.min(1, (now - cur.t0) / FADE);
    cur.a.volume = pref.music * (mode === 'level' || mode === 'pause' ? 0.45 : 1) * fin;            // quieter (not silent) in the pause menu: a new track is heard
    const quiet = !ctx || !pref.enabled || !pref.musicOn || document.hidden || halted;
    if (quiet) { cur.a.pause(); for (const f of fading) f.a.pause(); } else if (cur.a.paused && !(cur.a.ended && !cur.a.loop)) cur.a.play().catch(() => {});
  }

  // ---------------- the frame hook: new events since the last frame ----------------
  function frame() {
    requestAnimationFrame(frame);
    const S = window.SCENE && SCENE.state;
    if (!S) { lastS = null; result = null; sync('menu'); return; }                                   // the menu (over the demo) plays its own track
    // a new run (Space after the results restarts it in the same object, so its start time tells it apart)
    if (S !== lastS || S.wt0 !== lastW) { lastS = S; lastW = S.wt0; seen = new WeakSet(); for (const e of S.ev) seen.add(e); lastT = S.t; still = 0; result = null; }  // a new run: skip its backlog
    still = S.t === lastT ? still + 1 : 0; lastT = S.t;
    const fresh = []; for (let i = S.ev.length - 1; i >= 0 && !seen.has(S.ev[i]); i--) fresh.push(S.ev[i]);
    for (let i = fresh.length - 1; i >= 0; i--) { const e = fresh[i]; seen.add(e);
      if (e.k === 'win' || e.k === 'die') result = e.k === 'win' ? 'victory' : 'defeat';
      const m = MAP[e.k]; if (m) effect(m[0], S, e, m[1]); }
    if (S.over && !result) result = S.over.k === 'win' ? 'victory' : 'defeat';
    sync(result ? 'end' : S.pick ? 'level' : still > 20 || (window.META && META.PAUSE.isOpen) ? 'pause' : 'battle');
  }
  requestAnimationFrame(frame);

  addEventListener('pointerdown', unlock);
  addEventListener('keydown', (e) => {
    unlock();
    if (e.code === 'KeyM') { pref.enabled = !pref.enabled; fxBus.gain.value = pref.enabled ? pref.effects : 0; save(); toast(pref.enabled ? 'Звук включён' : 'Звук выключен'); effect('ui'); }
    if (e.code === 'KeyN') { pref.musicOn = !pref.musicOn; save(); toast(pref.musicOn ? 'Музыка включена' : 'Музыка выключена'); effect('ui'); }
  });
  document.addEventListener('visibilitychange', () => cur && document.hidden && cur.a.pause());
  const toast = (s) => { const h = document.getElementById('hint'); if (!h) return; if (toast.prev === undefined) { toast.prev = h.textContent; toast.op = h.style.opacity; }
    h.textContent = s; h.style.opacity = 1; clearTimeout(toast.t); toast.t = setTimeout(() => { h.textContent = toast.prev; h.style.opacity = toast.op; toast.prev = undefined; }, 1200); };
  // the settings screen: volumes 0..1 (music is read every frame; effects set the effects bus)
  const setVolume = (k, v) => { pref[k] = Math.max(0, Math.min(1, Math.round(v * 100) / 100)); if (k === 'effects' && fxBus) fxBus.gain.value = pref.enabled ? pref.effects : 0; save(); };
  const toggle = (k) => { unlock(); if (k === 'sound') { pref.enabled = !pref.enabled; fxBus.gain.value = pref.enabled ? pref.effects : 0; } else pref.musicOn = !pref.musicOn; save(); };
  window.AUDIO = { pref, effect: (n, S, e, trim) => (n === 'deny' ? deny() : effect(n, S, e, trim)), toggle, setVolume, nextTrack, toggleRepeat,
    get playlist() { return playlist; }, get halted() { return halted; }, set halted(v) { halted = !!v; }, get current() { return playlist[pick()]; }, get ctx() { return ctx; }, get music() { return cur && { name: cur.name, paused: cur.a.paused, t: cur.a.currentTime }; }, get loaded() { return Object.keys(bufs).length; } };
})();
