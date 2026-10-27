# Round 18, part 2: the JS cost left after batching. L.sprite builds two ~25-field uniform objects per sprite; batchable sprites now
# write straight into the instance buffer (G.spriteFast). L.labelW measured by regenerating the label texture with the caller's
# options, so a labelW + label pair with different options re-uploaded the texture twice a frame; it now measures on its own.
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
def patch(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:90], s.count(a)); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

patch('live/gl.js', [
    ("  G.flush = () => { if (!bn) return;", """  // a batchable sprite without the uniform objects (L.sprite's fast path): atlas entry, src, grade, haze, tint, rim, rim colour, alpha
  G.spriteFast = (A, sr, g, hz, ti, r, rc, alpha, xf, fx) => { if (!bprog) return false;
    if (bn && bmode !== want) G.flush(); if (bmode !== want) applyBlend(want); if (bn >= BMAX) G.flush();
    const o = bn * BF, R = A.rect;
    BD[o] = xf[0]; BD[o + 1] = xf[1]; BD[o + 2] = xf[3]; BD[o + 3] = xf[4]; BD[o + 4] = xf[6]; BD[o + 5] = xf[7]; BD[o + 6] = fx; BD[o + 7] = 0;
    BD[o + 8] = sr[0]; BD[o + 9] = sr[1]; BD[o + 10] = sr[2]; BD[o + 11] = sr[3]; BD[o + 12] = g[0]; BD[o + 13] = g[1]; BD[o + 14] = g[2]; BD[o + 15] = g[3];
    BD[o + 16] = ti[0]; BD[o + 17] = ti[1]; BD[o + 18] = ti[2]; BD[o + 19] = ti[3]; BD[o + 20] = r[0]; BD[o + 21] = r[1]; BD[o + 22] = r[2]; BD[o + 23] = r[3];
    BD[o + 24] = rc[0]; BD[o + 25] = rc[1]; BD[o + 26] = rc[2]; BD[o + 27] = alpha; BD[o + 28] = hz[0]; BD[o + 29] = hz[1]; BD[o + 30] = hz[2]; BD[o + 31] = A.layer;
    BD[o + 32] = R[0]; BD[o + 33] = R[1]; BD[o + 34] = R[2]; BD[o + 35] = R[3]; bn++; return true; };
  G.flush = () => { if (!bn) return;"""),
])
patch('live/lib.js', [
    ("""    const pad = o.pad || 0, pw = w * pad, ph = h * pad;
    const U = Object.assign({}, DEF, o.u || {}, { u_tex: tx });""", """    const pad = o.pad || 0, pw = w * pad, ph = h * pad;
    // fast path: an atlas sprite using only grade / haze / tint / rim / alpha goes straight into the batch (no uniform objects)
    if (tx.atlas && !pad && G.spriteFast && !(L.sp && L.sp.lod)) { const u = o.u; let ok = true; if (u) for (const k in u) if (!FASTU.has(k)) { ok = false; break; }
      if (ok) { let grade = (u && u.grade) || DEF.grade, haze = (u && u.haze) || DEF.haze, tint = (u && u.tint) || DEF.tint, rim = (u && u.rim) || DEF.rim, alpha = u && u.alpha !== undefined ? u.alpha : 1, m = o.m;
        const rimCol = (u && u.rimCol) || DEF.rimCol, rot = o.rot || 0, piv = o.pivot || [0, 0];
        if (L.sp) { const sp = L.sp; grade = sp.ink ? INK_G : SHADOW_G; haze = sp.ink || haze; alpha *= sp.a; rim = DEF.rim; tint = DEF.tint; x += sp.dx; y += sp.dy; if (m) m = M.mul(M.t(sp.dx, sp.dy), m); }
        let xf; if (m) { const F = M.mul(m, [w, 0, 0, h, -piv[0], -piv[1]]); xf = [F[0], F[1], 0, F[2], F[3], 0, F[4], F[5], 1]; } else xf = G.xf(x, y, w, h, rot, piv[0], piv[1]);
        if (G.spriteFast(tx.atlas, src, grade, haze, tint, rim, rimCol, alpha, xf, o.flip ? 1 : 0)) return { w, h }; } }
    const U = Object.assign({}, DEF, o.u || {}, { u_tex: tx });"""),
    ("  L.sp = null;   // pass override:", "  const FASTU = new Set(['grade', 'haze', 'tint', 'rim', 'rimCol', 'alpha']), INK_G = [0, 0, 1, 1], SHADOW_G = [0, 0, 0, 1];\n  L.sp = null;   // pass override:"),
    ("  L.labelW = (slot, str, o = {}) => lblTex(slot, str, o).tw;",
     """  // width only: measured on its own canvas (cached), so measuring never touches the slot's texture (a labelW + label pair with different
  // options used to regenerate and re-upload the texture twice a frame)
  const MW = {}, mctx = document.createElement('canvas').getContext('2d');
  L.labelW = (slot, str, { size = 30, font = '"Trebuchet MS", "Segoe UI", Verdana, sans-serif', weight = 'bold' } = {}) => { const k = str + '|' + size + '|' + font + '|' + weight;
    if (MW[k] === undefined) { mctx.font = `${weight} ${size}px ${font}`; MW[k] = mctx.measureText(str).width; } return MW[k]; };"""),
])
print('patched')
