// ─────────────────────────────────────────────────────────────────────────
// Nickname OCR — reads the "Lv.### 닉네임" label at the bottom-left of the
// MapleStory window from a shared-screen frame, using Tesseract.js (a free,
// fully client-side OCR engine; Korean + English). The recognised text is
// always shown to the user for confirmation/editing, since OCR on a stylised
// game font is imperfect.
// ─────────────────────────────────────────────────────────────────────────

// Region of the frame to read, as ratios so it scales with any resolution.
// The level/name label sits in the very bottom-left corner.
const REGION = { x: 0.012, w: 0.23, bottom: 0.012, h: 0.05 };
const UPSCALE = 3;

/**
 * Strip the leading "Lv.280 " and keep the nickname. MapleStory KMS nicknames
 * are Korean, English or digits (no spaces), so we take the first plausible
 * Hangul/alphanumeric token after the level.
 */
export function parseNickname(raw) {
  if (!raw) return '';
  let s = raw.replace(/[\r\n]+/g, ' ').trim();
  // Find the "Lv.280" token anywhere (OCR may prepend noise) and keep what
  // follows it — that's the nickname. Fall back to the whole string otherwise.
  const lv = s.match(/l\s*v\.?\s*\d+/i);
  if (lv) s = s.slice(lv.index + lv[0].length);
  // Nicknames are Korean / English / digits with no spaces.
  const m = s.match(/[가-힣A-Za-z0-9]{2,}/);
  return (m ? m[0] : '').trim();
}

// Crop the name region and binarise (bright game text → black on white), which
// Tesseract reads far better than the original low-contrast game pixels.
function cropAndPrepare(source, sw, sh) {
  const cw = Math.max(1, Math.round(sw * REGION.w));
  const ch = Math.max(1, Math.round(sh * REGION.h));
  const cx = Math.round(sw * REGION.x);
  const cy = sh - ch - Math.round(sh * REGION.bottom);

  const canvas = document.createElement('canvas');
  canvas.width = cw * UPSCALE;
  canvas.height = ch * UPSCALE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, cx, cy, cw, ch, 0, 0, canvas.width, canvas.height);

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = lum > 135 ? 0 : 255; // bright text → black, dark bg → white
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * Run OCR on a frame source (a <video> or <canvas>). Returns the raw OCR text,
 * the parsed nickname and the prepared crop (for an optional preview).
 */
export async function ocrNickname(source) {
  const sw = source.videoWidth || source.width;
  const sh = source.videoHeight || source.height;
  if (!sw || !sh) throw new Error('화면을 읽지 못했습니다. 다시 시도해 주세요.');

  const canvas = cropAndPrepare(source, sw, sh);
  const Tesseract = await import('tesseract.js');
  const { data } = await Tesseract.recognize(canvas, 'kor+eng', {
    // keep the worker quiet
    logger: () => {},
  });
  return { raw: (data.text || '').trim(), nickname: parseNickname(data.text), preview: canvas.toDataURL('image/png') };
}

/**
 * One-shot: ask for a screen share, grab a single frame, OCR the nickname, then
 * immediately stop the capture. Used by the scheduler page so the user doesn't
 * have to keep sharing.
 */
export async function captureNicknameOnce() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('이 브라우저는 화면 공유를 지원하지 않습니다. 최신 크롬 / 엣지를 사용해 주세요.');
  }
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  try {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    await video.play().catch(() => {});
    if (!video.videoWidth) {
      await new Promise((r) => { video.onloadedmetadata = () => r(); });
    }
    await new Promise((r) => setTimeout(r, 350)); // let a real frame arrive
    return await ocrNickname(video);
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}
