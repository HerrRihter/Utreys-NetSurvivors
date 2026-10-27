# Round 19 (user: "freezes in the menu, especially when opening its screens"): a label used to cost a new canvas, a GPU-backed 2D
# draw read back for the upload, and a mipmap chain; the first frame of a screen built dozens at once. Labels now draw on one shared
# CPU-side canvas (willReadFrequently: no GPU readback), upload as ImageData, without mipmaps (they are drawn 1:1); and the menu's
# screens are drawn once off-screen on the first frame, so opening a screen creates nothing.
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
def patch(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:90], s.count(a)); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

patch('live/gl.js', [
    ("  G.tex = (n) => {", "  G.setTex = (n, rec) => (texs[n] = rec);                     // register a texture made elsewhere (labels)\n  G.tex = (n) => {"),
])
patch('live/lib.js', [
    ("""    const cv = document.createElement('canvas'), g = cv.getContext('2d'), f = `${weight} ${size}px ${font}`, pad = Math.ceil(size * 0.3);
    g.font = f; const tw = g.measureText(str).width, w = Math.ceil(tw) + 2 * pad, h = Math.ceil(size * 1.3) + 2 * pad;
    cv.width = Math.max(1, w); cv.height = h; g.font = f; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.fillStyle = 'rgba(15,5,8,0.6)'; g.fillText(str, pad, h / 2 + Math.max(2, size * 0.09));
    if (out) { g.lineWidth = Math.max(3, size * 0.16); g.strokeStyle = out; g.strokeText(str, pad, h / 2); }
    g.fillStyle = col; g.fillText(str, pad, h / 2);
    if (!r) r = LBL[slot] = { rec: G.canvasTex('lbl_' + slot, cv) };
    else { const gl = G.gl; gl.bindTexture(gl.TEXTURE_2D, r.rec.t); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); gl.generateMipmap(gl.TEXTURE_2D); r.rec.w = w; r.rec.h = h; }
    Object.assign(r, { key, pad, tw }); return r; };""",
     """    const g = LG, f = `${weight} ${size}px ${font}`, pad = Math.ceil(size * 0.3);
    g.font = f; const tw = g.measureText(str).width, w = Math.max(1, Math.ceil(tw) + 2 * pad), h = Math.ceil(size * 1.3) + 2 * pad;
    if (LCV.width < w || LCV.height < h) { LCV.width = Math.max(LCV.width, w); LCV.height = Math.max(LCV.height, h); }   // (resizing resets the context)
    g.clearRect(0, 0, w, h); g.font = f; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.fillStyle = 'rgba(15,5,8,0.6)'; g.fillText(str, pad, h / 2 + Math.max(2, size * 0.09));
    if (out) { g.lineWidth = Math.max(3, size * 0.16); g.strokeStyle = out; g.strokeText(str, pad, h / 2); }
    g.fillStyle = col; g.fillText(str, pad, h / 2);
    const gl = G.gl, img = g.getImageData(0, 0, w, h), t = r ? r.rec.t : gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    if (!r) { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      r = LBL[slot] = { rec: G.setTex('lbl_' + slot, { t, w, h }) }; }
    r.rec.w = w; r.rec.h = h; Object.assign(r, { key, pad, tw }); return r; };"""),
    ("  const lblTex = (slot, str,", "  // labels: drawn on one shared CPU-side canvas (willReadFrequently: the upload needs no GPU readback), uploaded without mipmaps (drawn 1:1)\n  const LCV = document.createElement('canvas'), LG = LCV.getContext('2d', { willReadFrequently: true });\n  const lblTex = (slot, str,"),
])
patch('live/meta.js', [
    ("  function go(s) { scr = s; sel = 0; hov = -1; hovBack = false; armedReset = 0; sfx('ui'); }", "  function go(s, quiet) { scr = s; sel = 0; hov = -1; hovBack = false; armedReset = 0; if (!quiet) sfx('ui'); }"),
])
patch('live/scene.js', [
    ("  S.render = (t) => {\n    if (!S.state && window.META && bgT > -9) {",
     """  // first frame: draw every menu screen once into a scratch target, so all their labels exist before a screen is opened
  let warm = false;
  const prewarm = (t) => { warm = true; if (!window.META) return; const keep = META.view().scr; G.bind(L.T.b2);
    for (const scr of ['main', 'shop', 'coll', 'rec', 'set', 'hero', 'client']) { META.go(scr, true); menu(0, t); } G.flush(); META.go(keep, true); L.qaReset(); };
  S.render = (t) => {
    if (!warm) prewarm(t);
    if (!S.state && window.META && bgT > -9) {"""),
])
print('patched')
