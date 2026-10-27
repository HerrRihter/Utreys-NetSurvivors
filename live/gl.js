// live/gl.js — a tiny deterministic WebGL2 layer renderer: textures (premultiplied, mipmapped or nearest), programs, render
// targets, pixel-space quads (y down) with an affine transform. Everything the scene draws is a quad with a shader.
(function () {
  const G = (window.G = {});
  let gl, quadBuf, cur = null;
  const progs = {}, texs = {};

  G.init = (canvas, W, H) => {
    canvas.width = W; canvas.height = H;
    gl = G.gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: false, antialias: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL2 not available');
    gl.getExtension('EXT_color_buffer_float'); gl.getExtension('EXT_color_buffer_half_float'); gl.getExtension('OES_texture_float_linear');
    quadBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    G.W = W; G.H = H;
  };

  // nearest: NEAREST min/mag, no mipmaps (pixel art: crisp texels; lod bias has no effect)
  G.load = (name, url, { repeat = false, nearest = false } = {}) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
      if (!nearest) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, nearest ? gl.NEAREST : gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
      const wr = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wr); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wr);
      // the logical size is the manifest's (the texture as sliced): shipped files may be smaller (tools/shrink-assets.py), drawn the same
      const A = window.ASSETS && window.ASSETS[name];
      texs[name] = { t, w: A ? A.w : im.width, h: A ? A.h : im.height, nearest, repeat }; res(texs[name]);
    };
    im.onerror = () => rej(new Error('failed to load ' + url)); im.src = url;
  });
  G.canvasTex = (name, cv) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return (texs[name] = { t, w: cv.width, h: cv.height });
  };
  G.setTex = (n, rec) => (texs[n] = rec);                     // register a texture made elsewhere (labels)
  G.tex = (n) => { const t = texs[n]; if (!t) throw new Error('no texture ' + n); return t; };

  const VS = `#version 300 es
in vec2 a_pos; uniform vec2 u_res; uniform mat3 u_xf; uniform vec2 u_flip;
out vec2 v_uv; out vec2 v_px;
void main(){ vec3 p = u_xf * vec3(a_pos, 1.0); v_px = p.xy; v_uv = mix(a_pos, 1.0 - a_pos, u_flip);
  gl_Position = vec4(p.x / u_res.x * 2.0 - 1.0, 1.0 - p.y / u_res.y * 2.0, 0.0, 1.0); }`;
  const COMMON = `#version 300 es
precision highp float;
in vec2 v_uv; in vec2 v_px; out vec4 o;
uniform vec2 u_res; uniform float u_t;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.7); a *= 0.5; } return s; }
vec2 scr(vec2 px){ return vec2(px.x / u_res.x, 1.0 - px.y / u_res.y); }   // screen px -> render-target uv
`;
  G.COMMON = COMMON;

  G.program = (name, fs) => {
    if (progs[name]) return progs[name];
    const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(name + ': ' + gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, VS)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, COMMON + fs));
    gl.bindAttribLocation(p, 0, 'a_pos'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(name + ': ' + gl.getProgramInfoLog(p));
    const loc = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const u = gl.getActiveUniform(p, i); loc[u.name.replace('[0]', '')] = { l: gl.getUniformLocation(p, u.name), type: u.type }; }
    return (progs[name] = { p, loc, name });
  };

  // view: the coordinate space draws use (default w×h), e.g. a W/k × H/k target drawn in W×H view px; nearest: sample it crisp
  G.target = (w, h, float = false, { view = [w, h], nearest = false } = {}) => {
    const t = gl.createTexture(), f = nearest ? gl.NEAREST : gl.LINEAR; gl.bindTexture(gl.TEXTURE_2D, t);
    if (float) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { fb, t, w, h, vw: view[0], vh: view[1] };
  };
  // a clip rectangle in view px (the menus' scrolled content), null for none; queued draws are flushed first
  let clipR = null;
  G.clip = (r) => { const k = r ? r.join(',') : ''; if (k === clipR) return; G.flush(); clipR = k;
    if (!r) { gl.disable(gl.SCISSOR_TEST); return; } const sy = (cur ? cur.h : G.H) / (cur ? cur.vh || cur.h : G.H), sx = (cur ? cur.w : G.W) / (cur ? cur.vw || cur.w : G.W);
    gl.enable(gl.SCISSOR_TEST); gl.scissor(Math.round(r[0] * sx), Math.round(((cur ? cur.vh || cur.h : G.H) - r[1] - r[3]) * sy), Math.round(r[2] * sx), Math.round(r[3] * sy)); };
  G.bind = (tg, clear) => {
    G.flush(); cur = tg; gl.bindFramebuffer(gl.FRAMEBUFFER, tg ? tg.fb : null);
    gl.viewport(0, 0, tg ? tg.w : G.W, tg ? tg.h : G.H);
    if (clear) { gl.clearColor(clear[0], clear[1], clear[2], clear[3]); gl.clear(gl.COLOR_BUFFER_BIT); }
  };
  // blend modes apply lazily: G.blend records the wanted mode, the next draw (or batch) applies it
  let bmode = null, want = 'normal';
  const applyBlend = (mode) => { gl.enable(gl.BLEND);
    if (mode === 'add') gl.blendFunc(gl.ONE, gl.ONE);
    else if (mode === 'screen') gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
    else if (mode === 'none') gl.disable(gl.BLEND);
    else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    bmode = mode; };
  G.blend = (mode) => { want = mode || 'normal'; };

  // affine: place the unit quad at x,y (top-left) with size w,h, rotated by rot (rad) about pivot (px,py) in local px
  // G.uiK: the interface's scale (stage 7б of docs/PLAN-FEEDBACK-27-10.md: on phones the menus are laid out in a smaller logical
  // space and drawn K× larger); 1 for the world and on desktops
  G.uiK = 1;
  G.xf = (x, y, w, h, rot = 0, px = 0, py = 0) => {
    const k = G.uiK; if (k !== 1) { x *= k; y *= k; w *= k; h *= k; px *= k; py *= k; }
    const c = Math.cos(rot), s = Math.sin(rot);
    // local (u*w - px, v*h - py) rotated, then + (x + px, y + py)
    return [w * c, w * s, 0, -h * s, h * c, 0, x + px - (px * c - py * s), y + py - (px * s + py * c), 1];
  };

  let unit = 0;
  const setU = (P, k, v) => {
    const u = P.loc[k]; if (!u) return;
    const T = gl;
    if (u.type === T.SAMPLER_2D) { const tx = v.t || v; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx); gl.uniform1i(u.l, unit++); }
    else if (u.type === T.FLOAT) gl.uniform1f(u.l, v);
    else if (u.type === T.FLOAT_VEC2) gl.uniform2fv(u.l, v);
    else if (u.type === T.FLOAT_VEC3) gl.uniform3fv(u.l, v);
    else if (u.type === T.FLOAT_VEC4) gl.uniform4fv(u.l, v);
    else if (u.type === T.FLOAT_MAT3) gl.uniformMatrix3fv(u.l, false, v);
    else if (u.type === T.INT) gl.uniform1i(u.l, v);
  };
  G.draw = (P, U, xf, flip = [0, 0]) => {
    if (P.bk !== undefined && bprog && !flip[1] && batch(P.bk, U, xf, flip[0])) return;
    G.flush(); if (bmode !== want) applyBlend(want);
    gl.useProgram(P.p); unit = 0;
    const res = cur ? [cur.vw, cur.vh] : [G.W, G.H];
    setU(P, 'u_res', res); setU(P, 'u_xf', xf); setU(P, 'u_flip', flip);
    for (const k in U) setU(P, k, U[k]);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  G.full = (P, U) => { const res = cur ? [cur.vw, cur.vh] : [G.W, G.H]; G.draw(P, U, G.xf(0, 0, res[0], res[1])); };
  // ---------------- batching ----------------
  // Sprites, glows, drop shadows and solid quads queue as instances of one program and draw in one instanced call. Any other draw,
  // a target or blend change, a full queue or the end of the frame (G.flush) draws the queue first, so the draw order is kept.
  // A sprite batches when its texture is in the atlas (G.buildAtlas) and it uses none of the special effects (sway, bones, fades…).
  // Glows write alpha 0 — additive under the premultiplied blend as well — so they never break a batch over the blend mode.
  // Instance: i0 = xf a b c d · i1 = xf e f, flip x, kind · i2 = src (texture uv) / glow k · i3 = grade · i4 = tint · i5 = rim ·
  // i6 = rim colour or colour, alpha or amount · i7 = haze, atlas layer · i8 = the texture's rect in the atlas (uv)
  const BVS = `#version 300 es
in vec2 a_pos; in vec4 i0, i1, i2, i3, i4, i5, i6, i7, i8; uniform vec2 u_res;
out vec2 v_uv; flat out vec4 f_src, f_grade, f_tint, f_rim, f_col, f_haze, f_rect; flat out float f_kind;
void main(){ vec2 p = vec2(i0.x * a_pos.x + i0.z * a_pos.y + i1.x, i0.y * a_pos.x + i0.w * a_pos.y + i1.y);
  v_uv = vec2(mix(a_pos.x, 1.0 - a_pos.x, i1.z), a_pos.y); f_kind = i1.w; f_src = i2; f_grade = i3; f_tint = i4; f_rim = i5; f_col = i6; f_haze = i7; f_rect = i8;
  gl_Position = vec4(p.x / u_res.x * 2.0 - 1.0, 1.0 - p.y / u_res.y * 2.0, 0.0, 1.0); }`;
  const BFS = `#version 300 es
precision highp float; precision highp sampler2DArray;
uniform sampler2DArray u_atlas;
in vec2 v_uv; flat in vec4 f_src, f_grade, f_tint, f_rim, f_col, f_haze, f_rect; flat in float f_kind; out vec4 o;
vec4 at(vec2 t){ return texture(u_atlas, vec3(mix(f_rect.xy, f_rect.zw, t), f_haze.w)); }
void main(){
  if (f_kind < 0.5) {                                         // sprite: the sprite shader's grade, haze, tint and rim
    vec2 uv = v_uv; if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
    vec4 c = at(mix(f_src.xy, f_src.zw, uv)); if (c.a < 0.002) discard;
    vec3 rgb = c.rgb / c.a; float l = dot(rgb, vec3(0.299, 0.587, 0.114));
    rgb = mix(vec3(l), rgb, f_grade.x) * f_grade.y; rgb = (rgb - 0.5) * f_grade.w + 0.5; rgb = mix(rgb, f_haze.rgb, f_grade.z); rgb = mix(rgb, rgb * f_tint.rgb, f_tint.a);
    if (f_rim.x > 0.0) { float a2 = at(clamp(mix(f_src.xy, f_src.zw, uv + f_rim.yz * f_rim.w), 0.0, 1.0)).a; rgb += f_col.rgb * f_rim.x * smoothstep(0.2, 1.0, c.a) * (1.0 - a2); }
    o = vec4(max(rgb, 0.0) * c.a, c.a) * f_col.a;
  } else if (f_kind < 1.5) { float d = length(v_uv * 2.0 - 1.0); float g = exp(-d * d * f_src.x) * smoothstep(1.0, 0.7, d) * f_col.a; o = vec4(f_col.rgb * g, 0.0); }
  else if (f_kind < 2.5) { float d = length(v_uv * 2.0 - 1.0); float a = smoothstep(1.0, 0.1, d) * f_col.a; o = vec4(vec3(0.02, 0.05, 0.03) * a, a); }
  else o = vec4(f_col.rgb * f_col.a, f_col.a);
}`;
  const BMAX = 4096, BF = 36; let bprog = null, bvao = null, bbuf = null, BD = null, bn = 0, atlas = null, dummy = null;
  G.batchable = (map) => {                                     // { sprite, glow, shadow, solid } programs → batch kinds 0..3
    const mk = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error('batch: ' + gl.getShaderInfoLog(sh)); return sh; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, BVS)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, BFS));
    gl.bindAttribLocation(p, 0, 'a_pos'); for (let i = 0; i < 9; i++) gl.bindAttribLocation(p, i + 1, 'i' + i); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('batch: ' + gl.getProgramInfoLog(p));
    bprog = { p, uRes: gl.getUniformLocation(p, 'u_res'), uAtlas: gl.getUniformLocation(p, 'u_atlas') };
    BD = new Float32Array(BMAX * BF); bbuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bbuf); gl.bufferData(gl.ARRAY_BUFFER, BD.byteLength, gl.DYNAMIC_DRAW);
    bvao = gl.createVertexArray(); gl.bindVertexArray(bvao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bbuf); for (let i = 0; i < 9; i++) { gl.enableVertexAttribArray(i + 1); gl.vertexAttribPointer(i + 1, 4, gl.FLOAT, false, BF * 4, i * 16); gl.vertexAttribDivisor(i + 1, 1); }
    gl.bindVertexArray(null);
    dummy = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, dummy); gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, 1, 1, 1);
    map.sprite.bk = 0; map.glow.bk = 1; map.shadow.bk = 2; map.solid.bk = 3;
  };
  const special = (U) => (U.u_lod || 0) !== 0 || (U.u_sway && U.u_sway[3]) || (U.u_pad && (U.u_pad[0] || U.u_pad[1])) || (U.u_fade && (U.u_fade[0] || U.u_fade[1])) || U.u_vfade || U.u_tfade
    || (U.u_bulge && U.u_bulge[3]) || (U.u_bend && U.u_bend[3]) || (U.u_lean && U.u_lean[0]) || U.u_disc || (U.u_bone0 && U.u_bone0[3]) || (U.u_bone1 && U.u_bone1[3]) || (U.u_bone2 && U.u_bone2[3]);
  function batch(kind, U, xf, fx) {
    let A = null;
    if (kind === 0) { A = U.u_tex && U.u_tex.atlas; if (!A || special(U)) return false; }
    // a glow joins a batch drawn under normal or additive blending; anything else needs the wanted mode
    if (!(kind === 1 && bn && (bmode === 'normal' || bmode === 'add'))) { if (bn && bmode !== want) G.flush(); if (bmode !== want) applyBlend(want); }
    if (bn >= BMAX) G.flush();
    const o = bn * BF;
    BD[o] = xf[0]; BD[o + 1] = xf[1]; BD[o + 2] = xf[3]; BD[o + 3] = xf[4]; BD[o + 4] = xf[6]; BD[o + 5] = xf[7]; BD[o + 6] = fx; BD[o + 7] = kind;
    if (kind === 0) { const sr = U.u_src || [0, 0, 1, 1], g = U.u_grade, ti = U.u_tint, r = U.u_rim, rc = U.u_rimCol, hz = U.u_haze, R = A.rect;
      BD[o + 8] = sr[0]; BD[o + 9] = sr[1]; BD[o + 10] = sr[2]; BD[o + 11] = sr[3]; BD[o + 12] = g[0]; BD[o + 13] = g[1]; BD[o + 14] = g[2]; BD[o + 15] = g[3];
      BD[o + 16] = ti[0]; BD[o + 17] = ti[1]; BD[o + 18] = ti[2]; BD[o + 19] = ti[3]; BD[o + 20] = r[0]; BD[o + 21] = r[1]; BD[o + 22] = r[2]; BD[o + 23] = r[3];
      BD[o + 24] = rc[0]; BD[o + 25] = rc[1]; BD[o + 26] = rc[2]; BD[o + 27] = U.u_alpha === undefined ? 1 : U.u_alpha;
      BD[o + 28] = hz[0]; BD[o + 29] = hz[1]; BD[o + 30] = hz[2]; BD[o + 31] = A.layer; BD[o + 32] = R[0]; BD[o + 33] = R[1]; BD[o + 34] = R[2]; BD[o + 35] = R[3]; }
    else { const c = U.u_col || [0, 0, 0]; BD[o + 8] = U.u_k === undefined ? 3 : U.u_k; BD[o + 24] = c[0]; BD[o + 25] = c[1]; BD[o + 26] = c[2];
      BD[o + 27] = kind === 3 ? (U.u_a === undefined ? 1 : U.u_a) : U.u_amt === undefined ? 0.5 : U.u_amt; }
    bn++; return true;
  }
  // a batchable sprite without the uniform objects (L.sprite's fast path): atlas entry, src, grade, haze, tint, rim, rim colour, alpha
  G.spriteFast = (A, sr, g, hz, ti, r, rc, alpha, xf, fx) => { if (!bprog) return false;
    if (bn && bmode !== want) G.flush(); if (bmode !== want) applyBlend(want); if (bn >= BMAX) G.flush();
    const o = bn * BF, R = A.rect;
    BD[o] = xf[0]; BD[o + 1] = xf[1]; BD[o + 2] = xf[3]; BD[o + 3] = xf[4]; BD[o + 4] = xf[6]; BD[o + 5] = xf[7]; BD[o + 6] = fx; BD[o + 7] = 0;
    BD[o + 8] = sr[0]; BD[o + 9] = sr[1]; BD[o + 10] = sr[2]; BD[o + 11] = sr[3]; BD[o + 12] = g[0]; BD[o + 13] = g[1]; BD[o + 14] = g[2]; BD[o + 15] = g[3];
    BD[o + 16] = ti[0]; BD[o + 17] = ti[1]; BD[o + 18] = ti[2]; BD[o + 19] = ti[3]; BD[o + 20] = r[0]; BD[o + 21] = r[1]; BD[o + 22] = r[2]; BD[o + 23] = r[3];
    BD[o + 24] = rc[0]; BD[o + 25] = rc[1]; BD[o + 26] = rc[2]; BD[o + 27] = alpha; BD[o + 28] = hz[0]; BD[o + 29] = hz[1]; BD[o + 30] = hz[2]; BD[o + 31] = A.layer;
    BD[o + 32] = R[0]; BD[o + 33] = R[1]; BD[o + 34] = R[2]; BD[o + 35] = R[3]; bn++; return true; };
  G.flush = () => { if (!bn) return; gl.useProgram(bprog.p); const res = cur ? [cur.vw, cur.vh] : [G.W, G.H]; gl.uniform2f(bprog.uRes, res[0], res[1]);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D_ARRAY, atlas ? atlas.t : dummy); gl.uniform1i(bprog.uAtlas, 0);
    gl.bindVertexArray(bvao); gl.bindBuffer(gl.ARRAY_BUFFER, bbuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, BD, 0, bn * BF);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, bn); gl.bindVertexArray(null); bn = 0; };

  // ---------------- atlas ----------------
  // Every texture keep(name) accepts (not nearest, not repeating) is copied on the GPU into the layers of one texture array, scaled
  // so its longest side is at most cap px (≥ any size it is drawn at), with pad px of transparent border against mip bleed. Sprites
  // then sample the atlas, so a frame of sprites can share batches. The original textures stay for any draw that is not batched.
  G.buildAtlas = (keep, { cap = 640, size = 4096, pad = 8, levels = 5 } = {}) => {
    G.flush();
    const items = Object.keys(texs).filter((n) => keep(n) && !texs[n].nearest && !texs[n].repeat).map((n) => { const t = texs[n], k = Math.min(1, cap / Math.max(t.w, t.h));
      return { n, w: Math.max(1, Math.round(t.w * k)), h: Math.max(1, Math.round(t.h * k)) }; }).sort((a, b) => b.h - a.h || b.w - a.w);
    let layer = 0, x = 0, y = 0, rowH = 0;                     // shelf packing, tallest first
    for (const it of items) { const w2 = it.w + 2 * pad, h2 = it.h + 2 * pad; if (x + w2 > size) { x = 0; y += rowH; rowH = 0; } if (y + h2 > size) { layer++; x = 0; y = 0; rowH = 0; }
      it.layer = layer; it.x = x + pad; it.y = y + pad; x += w2; rowH = Math.max(rowH, h2); }
    const layers = layer + 1, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D_ARRAY, t); gl.texStorage3D(gl.TEXTURE_2D_ARRAY, levels, gl.RGBA8, size, size, layers);
    const mk = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); return sh; };
    const cp = gl.createProgram(); gl.attachShader(cp, mk(gl.VERTEX_SHADER, `#version 300 es
in vec2 a_pos; uniform vec4 u_rect; uniform float u_size; out vec2 v_uv;
void main(){ v_uv = a_pos; gl_Position = vec4((u_rect.xy + a_pos * u_rect.zw) / u_size * 2.0 - 1.0, 0.0, 1.0); }`));
    gl.attachShader(cp, mk(gl.FRAGMENT_SHADER, `#version 300 es
precision highp float; uniform sampler2D u_src; in vec2 v_uv; out vec4 o; void main(){ o = texture(u_src, v_uv); }`));
    gl.bindAttribLocation(cp, 0, 'a_pos'); gl.linkProgram(cp); gl.useProgram(cp);
    const uR = gl.getUniformLocation(cp, 'u_rect'); gl.uniform1f(gl.getUniformLocation(cp, 'u_size'), size); gl.uniform1i(gl.getUniformLocation(cp, 'u_src'), 0);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, size, size); gl.disable(gl.BLEND);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.activeTexture(gl.TEXTURE0);
    for (let l = 0; l < layers; l++) { gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, t, 0, l); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      for (const it of items) if (it.layer === l) { gl.bindTexture(gl.TEXTURE_2D, texs[it.n].t); gl.uniform4f(uR, it.x, it.y, it.w, it.h); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); } }
    gl.bindFramebuffer(gl.FRAMEBUFFER, cur ? cur.fb : null); gl.viewport(0, 0, cur ? cur.w : G.W, cur ? cur.h : G.H); gl.deleteFramebuffer(fb); gl.deleteProgram(cp);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, t); gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    for (const it of items) texs[it.n].atlas = { layer: it.layer, rect: [it.x / size, it.y / size, (it.x + it.w) / size, (it.y + it.h) / size] };
    bmode = null; atlas = { t, layers, size }; return { layers, count: items.length };
  };
})();
