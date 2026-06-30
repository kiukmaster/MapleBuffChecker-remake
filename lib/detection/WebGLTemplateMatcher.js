// ─────────────────────────────────────────────────────────────────────────
// WebGLTemplateMatcher
//
// A lightweight, GPU-based replacement for OpenCV.js `matchTemplate` with the
// `TM_CCOEFF_NORMED` method. The old build shipped ~11 MB of OpenCV WASM and
// churned the JS/WASM heap every frame (the cause of the high memory use and
// the Explorer freeze on alt-tab). Here the sliding-window correlation runs
// entirely on the GPU in a fragment shader, so per-frame JS allocation is
// essentially zero and the captured frame is uploaded straight from the
// <video> element — no readback, no big typed arrays.
//
// Math — TM_CCOEFF_NORMED, matched to OpenCV exactly so existing per-skill
// thresholds carry over. For each candidate window the score is
//
//        Σ_c Σ (T_c - meanT_c)·(I_c - meanI_c)
//   R = ───────────────────────────────────────────
//        sqrt( Σ_c Σ(T_c-meanT_c)²  ·  Σ_c Σ(I_c-meanI_c)² )
//
// summed over colour channels (R,G,B,A) with a separate mean per channel,
// identical to OpenCV's multi-channel handling. The template-side quantities
// (per-channel mean and total variance) are constant, so they are computed
// once on the CPU when the template is registered; the shader only does the
// per-window image sums. Because the coefficient is scale-invariant we work in
// normalised 0..1 colour units, which yields the same R as OpenCV's 0..255.
//
// The maximum over all windows (the only thing callers need) is found with a
// small GPU max-reduction pyramid, so just one float is read back per skill.
// ─────────────────────────────────────────────────────────────────────────

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

// Upper bound for the template loop so the shader compiles to a fixed size;
// the inner `break`s make the real cost proportional to the actual template.
const MAX_TEMPLATE_DIM = 96;

const CORR_FRAG = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D uFrame;   // captured screen, RGBA8
uniform highp sampler2D uTempl;   // template icon, RGBA8
uniform int uTW;                  // template width  (px)
uniform int uTH;                  // template height (px)
uniform vec4 uMeanT;              // per-channel template mean, 0..1
uniform float uTemplVar;          // Σ_c Σ(T_c-meanT_c)^2  (scalar)
out vec4 outColor;

void main() {
  ivec2 base = ivec2(gl_FragCoord.xy); // top-left of this candidate window
  vec4 sumI = vec4(0.0);
  vec4 sumI2 = vec4(0.0);
  vec4 sumTI = vec4(0.0);
  for (int j = 0; j < ${MAX_TEMPLATE_DIM}; j++) {
    if (j >= uTH) break;
    for (int i = 0; i < ${MAX_TEMPLATE_DIM}; i++) {
      if (i >= uTW) break;
      vec4 I = texelFetch(uFrame, base + ivec2(i, j), 0);
      vec4 T = texelFetch(uTempl, ivec2(i, j), 0);
      sumI  += I;
      sumI2 += I * I;
      sumTI += T * I;
    }
  }
  float wh = float(uTW * uTH);
  vec4 meanI = sumI / wh;
  // num_c = Σ(T_c-mT)(I_c-mI) = ΣT·I - wh·mT·mI
  vec4 num = sumTI - wh * uMeanT * meanI;
  // imgVar_c = Σ(I_c-mI)^2 = ΣI^2 - wh·mI^2
  vec4 ivar = sumI2 - wh * meanI * meanI;
  float numerator = num.r + num.g + num.b + num.a;
  float imgVar = max(ivar.r + ivar.g + ivar.b + ivar.a, 0.0);
  float denom = sqrt(uTemplVar * imgVar);
  float r = denom > 1e-12 ? numerator / denom : 0.0;
  outColor = vec4(r, 0.0, 0.0, 1.0);
}`;

// 4×4 max down-sampling, repeated until a single texel remains.
const REDUCE_FRAG = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D uSrc;
uniform ivec2 uSrcSize;
out vec4 outColor;
void main() {
  ivec2 base = ivec2(gl_FragCoord.xy) * 4;
  float m = -2.0;
  for (int j = 0; j < 4; j++) {
    for (int i = 0; i < 4; i++) {
      ivec2 p = base + ivec2(i, j);
      if (p.x < uSrcSize.x && p.y < uSrcSize.y) {
        m = max(m, texelFetch(uSrc, p, 0).r);
      }
    }
  }
  outColor = vec4(m, 0.0, 0.0, 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('Shader compile failed: ' + log);
  }
  return sh;
}

function link(gl, vsSrc, fsSrc) {
  const p = gl.createProgram();
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error('Program link failed: ' + log);
  }
  return p;
}

export class WebGLTemplateMatcher {
  constructor() {
    this.gl = null;
    this.canvas = null;
    this.templates = new Map(); // id -> { tex, w, h, meanT:[4], templVar, src }
    this.targets = new Map();   // "WxH" -> { tex, fbo } reusable float render targets
    this.frame = { tex: null, w: 0, h: 0 };
    this.disposed = false;
  }

  /** Create the GL context and shader programs. Returns false if unsupported. */
  init() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', {
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    });
    if (!gl) return false;
    // Float render targets are required for the correlation/reduction passes.
    if (!gl.getExtension('EXT_color_buffer_float')) return false;

    this.canvas = canvas;
    this.gl = gl;

    this.corrProg = link(gl, VERT, CORR_FRAG);
    this.reduceProg = link(gl, VERT, REDUCE_FRAG);

    // Full-screen triangle shared by every pass.
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.readBuf = new Float32Array(4);

    // Pixel-pack buffer for asynchronous (non-blocking) result readback.
    this.pbo = gl.createBuffer();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, 16, gl.DYNAMIC_READ); // one RGBA32F texel
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

    // Cache uniform locations.
    this.corrU = {
      frame: gl.getUniformLocation(this.corrProg, 'uFrame'),
      templ: gl.getUniformLocation(this.corrProg, 'uTempl'),
      tw: gl.getUniformLocation(this.corrProg, 'uTW'),
      th: gl.getUniformLocation(this.corrProg, 'uTH'),
      meanT: gl.getUniformLocation(this.corrProg, 'uMeanT'),
      templVar: gl.getUniformLocation(this.corrProg, 'uTemplVar'),
    };
    this.reduceU = {
      src: gl.getUniformLocation(this.reduceProg, 'uSrc'),
      srcSize: gl.getUniformLocation(this.reduceProg, 'uSrcSize'),
    };
    return true;
  }

  _makeTex(filter) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    return tex;
  }

  /** A reusable RGBA32F render target of the given size. */
  _target(w, h) {
    const key = w + 'x' + h;
    let t = this.targets.get(key);
    if (t) return t;
    const gl = this.gl;
    const tex = this._makeTex(gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    t = { tex, fbo, w, h };
    this.targets.set(key, t);
    return t;
  }

  /**
   * Register (or update) a template from an ImageData. Per-channel mean and the
   * total template variance are precomputed here so the shader stays cheap.
   * `src` lets callers skip the rebuild when the same image is re-supplied.
   */
  setTemplate(id, imageData, src) {
    const existing = this.templates.get(id);
    if (existing && existing.src === src) return;

    const gl = this.gl;
    const { width: w, height: h, data } = imageData;
    const wh = w * h;

    // Per-channel sums in 0..1 units.
    let sR = 0, sG = 0, sB = 0, sA = 0;
    let qR = 0, qG = 0, qB = 0, qA = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255, a = data[i + 3] / 255;
      sR += r; sG += g; sB += b; sA += a;
      qR += r * r; qG += g * g; qB += b * b; qA += a * a;
    }
    const mR = sR / wh, mG = sG / wh, mB = sB / wh, mA = sA / wh;
    // Σ_c Σ(T_c - meanT_c)^2 = Σ_c (Σ T_c^2 - wh·meanT_c^2)
    const templVar =
      (qR - wh * mR * mR) + (qG - wh * mG * mG) + (qB - wh * mB * mB) + (qA - wh * mA * mA);

    let tex = existing ? existing.tex : this._makeTex(gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, imageData);

    this.templates.set(id, { tex, w, h, meanT: [mR, mG, mB, mA], templVar, src });
  }

  hasTemplate(id) {
    return this.templates.has(id);
  }

  /**
   * Upload the current frame straight to the GPU (no CPU readback). Accepts any
   * texture source — a <video> (live capture) or a <canvas> (used in tests).
   */
  uploadFrame(source) {
    const gl = this.gl;
    const w = source.videoWidth || source.width;
    const h = source.videoHeight || source.height;
    if (!w || !h) return false;
    if (!this.frame.tex) this.frame.tex = this._makeTex(gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, this.frame.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    if (this.frame.w !== w || this.frame.h !== h) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
      this.frame.w = w; this.frame.h = h;
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }
    return true;
  }

  /**
   * Best match score (0..1) for one registered template against the last
   * uploaded frame. Returns -1 if the template is missing or doesn't fit.
   */
  // Run the correlation + max-reduction for one template, leaving the single
  // result texel in the currently-bound framebuffer. Returns false if it can't.
  _dispatch(id) {
    const gl = this.gl;
    const t = this.templates.get(id);
    if (!t || !this.frame.tex) return false;
    const outW = this.frame.w - t.w + 1;
    const outH = this.frame.h - t.h + 1;
    if (outW <= 0 || outH <= 0) return false;

    // ── Correlation pass → full-size result map ──
    const corr = this._target(this.frame.w, this.frame.h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, corr.fbo);
    gl.viewport(0, 0, outW, outH);
    gl.useProgram(this.corrProg);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.frame.tex);
    gl.uniform1i(this.corrU.frame, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.uniform1i(this.corrU.templ, 1);
    gl.uniform1i(this.corrU.tw, t.w);
    gl.uniform1i(this.corrU.th, t.h);
    gl.uniform4f(this.corrU.meanT, t.meanT[0], t.meanT[1], t.meanT[2], t.meanT[3]);
    gl.uniform1f(this.corrU.templVar, t.templVar);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // ── Max-reduction pyramid → single texel ──
    gl.useProgram(this.reduceProg);
    gl.uniform1i(this.reduceU.src, 0);
    gl.activeTexture(gl.TEXTURE0);

    let srcTex = corr.tex;
    let curW = outW, curH = outH;
    while (curW > 1 || curH > 1) {
      const dstW = Math.max(1, Math.ceil(curW / 4));
      const dstH = Math.max(1, Math.ceil(curH / 4));
      const dst = this._target(dstW, dstH);
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
      gl.viewport(0, 0, dstW, dstH);
      gl.bindTexture(gl.TEXTURE_2D, srcTex);
      gl.uniform2i(this.reduceU.srcSize, curW, curH);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      srcTex = dst.tex;
      curW = dstW; curH = dstH;
    }
    return true;
  }

  /** Synchronous best-match score (0..1). Stalls until the GPU finishes. */
  score(id) {
    if (!this._dispatch(id)) return -1;
    this.gl.readPixels(0, 0, 1, 1, this.gl.RGBA, this.gl.FLOAT, this.readBuf);
    return this.readBuf[0];
  }

  /**
   * Non-blocking best-match score. The GPU result is copied into a pixel-pack
   * buffer and read back only once a fence signals completion — so the main
   * thread is never stalled waiting on the GPU. This is what keeps the page (and
   * a YouTube video sharing the GPU) smooth while detection runs.
   *
   * Must not be called again until the returned promise resolves (single PBO).
   */
  scoreAsync(id) {
    const gl = this.gl;
    if (!this._dispatch(id)) return Promise.resolve(-1);

    // Schedule the readback into the PBO (returns immediately, does not block).
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.FLOAT, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();

    return new Promise((resolve) => {
      const poll = () => {
        if (this.disposed || !this.gl) { resolve(-1); return; }
        let status;
        try {
          status = gl.clientWaitSync(sync, 0, 0); // 0 timeout → never blocks
        } catch {
          resolve(-1);
          return;
        }
        if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) {
          try {
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.pbo);
            gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, this.readBuf);
            gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
            gl.deleteSync(sync);
            resolve(this.readBuf[0]);
          } catch {
            resolve(-1);
          }
        } else {
          setTimeout(poll, 3); // check again soon, without blocking the thread
        }
      };
      poll();
    });
  }

  dispose() {
    if (this.disposed || !this.gl) return;
    const gl = this.gl;
    this.templates.forEach((t) => gl.deleteTexture(t.tex));
    this.targets.forEach((t) => { gl.deleteTexture(t.tex); gl.deleteFramebuffer(t.fbo); });
    if (this.frame.tex) gl.deleteTexture(this.frame.tex);
    if (this.pbo) gl.deleteBuffer(this.pbo);
    this.templates.clear();
    this.targets.clear();
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
    this.disposed = true;
    this.gl = null;
  }
}
