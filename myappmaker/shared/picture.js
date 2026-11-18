// 이미지 AI로 만든 그림 파일을 앱에 넣기 좋게 다듬기 (학생: 게임·부스 그림, 교사: 월드 그림)
// - 배경: 16:9로 가운데를 잘라 960×540 안으로 줄이고 JPEG로
// - 주인공·아이콘: 가장자리부터 이어진 하얀 배경을 투명하게 지우고(안쪽 흰색은 그대로),
//   그림 둘레만 남겨 정사각형에 맞춘 뒤 WebP(안 되면 PNG)로
// - 그림 파일은 기기 밖으로 보내지 않고, 이 브라우저 안에서만 바꿔요.
import { MAX_IMAGE_CHARS } from './images.js';

const MAX_FILE = 15 * 1024 * 1024;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(file.type || '')) { reject(new Error('그림 파일(PNG·JPG 등)을 골라 주세요')); return; }
    if (file.size > MAX_FILE) { reject(new Error('그림 파일이 너무 커요 (15MB까지)')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('그림을 열지 못했어요. 다른 형식(PNG·JPG)으로 저장해 볼까요?')); };
    img.src = url;
  });
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return c;
}

// 가장자리에서 이어진 밝고 흐린 색(하얀 배경)을 투명하게
export function clearWhiteBackground(data, w, h, limit = 232) {
  const px = data.data;
  const isBg = (i) => {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    return px[i + 3] > 0 && r >= limit && g >= limit && b >= limit && Math.max(r, g, b) - Math.min(r, g, b) < 24;
  };
  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => { const k = y * w + x; if (!seen[k] && isBg(k * 4)) { seen[k] = 1; stack.push(k); } };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  let cleared = 0;
  while (stack.length) {
    const k = stack.pop();
    px[k * 4 + 3] = 0; cleared++;
    const x = k % w, y = (k / w) | 0;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  // 지운 곳과 맞닿은 아주 밝은 테두리는 반투명하게 (흰 테두리 줄이기)
  for (let k = 0; k < w * h; k++) {
    if (seen[k] || px[k * 4 + 3] === 0) continue;
    const x = k % w, y = (k / w) | 0;
    const near = (x > 0 && seen[k - 1]) || (x < w - 1 && seen[k + 1]) || (y > 0 && seen[k - w]) || (y < h - 1 && seen[k + w]);
    if (near && Math.min(px[k * 4], px[k * 4 + 1], px[k * 4 + 2]) > 200) px[k * 4 + 3] = 110;
  }
  return cleared / (w * h);
}

// 투명하지 않은 부분의 둘레
function bounds(data, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data.data[(y * w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

function encode(c, transparent, quality) {
  if (!transparent) return c.toDataURL('image/jpeg', quality);
  const webp = c.toDataURL('image/webp', quality);
  return webp.startsWith('data:image/webp') ? webp : c.toDataURL('image/png');
}

// file → { dataUrl, cleared(지운 배경 비율) }
export async function processPicture(file, slot, { clearWhite = slot.clear, maxChars = slot.maxChars || MAX_IMAGE_CHARS } = {}) {
  const img = await loadImage(file);
  let [maxW, maxH] = slot.max;
  for (let attempt = 0; attempt < 5; attempt++) {
    let out, cleared = 0;
    if (!slot.clear && slot.ratio !== '1:1') {
      // 16:9 가운데 자르기
      const want = maxW / maxH;
      let sw = img.naturalWidth, sh = img.naturalHeight;
      if (sw / sh > want) sw = sh * want; else sh = sw / want;
      const sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;
      const scale = Math.min(1, maxW / sw);
      out = canvas(sw * scale, sh * scale);
      out.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, out.width, out.height);
    } else {
      // 먼저 알맞게 줄인 뒤 배경 지우기 → 둘레만 남겨 정사각형 가운데에
      const scale = Math.min(1, (maxW * 1.5) / Math.max(img.naturalWidth, img.naturalHeight));
      const work = canvas(img.naturalWidth * scale, img.naturalHeight * scale);
      const wx = work.getContext('2d', { willReadFrequently: true });
      wx.drawImage(img, 0, 0, work.width, work.height);
      const data = wx.getImageData(0, 0, work.width, work.height);
      if (clearWhite) { cleared = clearWhiteBackground(data, work.width, work.height); wx.putImageData(data, 0, 0); }
      const b = (clearWhite && bounds(data, work.width, work.height)) || { x: 0, y: 0, w: work.width, h: work.height };
      const side = Math.max(b.w, b.h);
      const size = Math.min(maxW, side);
      out = canvas(size, size);
      const k = size / side;
      out.getContext('2d').drawImage(work, b.x, b.y, b.w, b.h, (size - b.w * k) / 2, (size - b.h * k) / 2, b.w * k, b.h * k);
    }
    const dataUrl = encode(out, !!slot.clear, 0.82 - attempt * 0.08);
    if (dataUrl.length <= maxChars) return { dataUrl, cleared, width: out.width, height: out.height };
    maxW = Math.round(maxW * 0.8); maxH = Math.round(maxH * 0.8);   // 너무 크면 더 줄여서 다시
  }
  throw new Error('그림이 너무 복잡해서 작게 줄이지 못했어요. 더 단순한 그림으로 해 볼까요?');
}
