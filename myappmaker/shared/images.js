// 학생이 만든 그림을 AI가 만든 앱 코드의 그림 자리(const IMAGES = {...})에 넣기
// - 앱 코드(원본)와 그림은 따로 보관하고, 실행·제출할 때만 합칩니다.
//   그래서 AI에게 코드를 다시 받아 붙여 넣어도 그림은 그대로 남아요.
// - 화면을 쓰지 않는 순수 함수라 학생·교사 앱이 함께 쓰고, 시험도 할 수 있어요.

// 그림 자리 이름 (앱 제작 프롬프트가 AI에게 이 이름 그대로 만들라고 요청함)
export const SLOT_KEYS = ['background', 'hero', 'icon1', 'icon2', 'icon3'];
export const MAX_IMAGE_CHARS = 200_000;     // 그림 한 장 최대 크기(글자)
const DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export function cleanImages(v) {
  const out = {};
  if (!v || typeof v !== 'object') return out;
  for (const k of SLOT_KEYS) if (typeof v[k] === 'string' && v[k].length <= MAX_IMAGE_CHARS && DATA_URL.test(v[k])) out[k] = v[k];
  return out;
}

export const imagesSize = (images) => Object.values(images || {}).reduce((a, s) => a + s.length, 0);

// 코드에서 `IMAGES = { ... }` 덩어리 찾기 → { start, end(닫는 } 위치), keys }
export function findImagesBlock(html) {
  const s = String(html || '');
  const m = /\b(?:const|let|var)\s+IMAGES\s*=\s*\{/.exec(s) || /\bIMAGES\s*=\s*\{/.exec(s);
  if (!m) return null;
  const open = m.index + m[0].length - 1;
  let depth = 0, quote = null;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) {
      const body = s.slice(open + 1, i);
      const keys = [...body.matchAll(/(?:^|[,{\s])["']?([A-Za-z_$][\w$]*)["']?\s*:/g)].map((x) => x[1]);
      return { start: open, end: i, keys };
    }
  }
  return null;
}

// 그림을 코드에 넣은 결과 HTML (그림 자리가 없으면 원본 그대로)
export function applyImages(html, images) {
  const imgs = cleanImages(images);
  const keys = Object.keys(imgs);
  const b = findImagesBlock(html);
  if (!keys.length || !b) return String(html || '');
  let body = html.slice(b.start + 1, b.end);
  const missing = [];
  for (const k of keys) {
    // background: '', hero: "", icon1: `...`  → 값만 바꾸기
    const re = new RegExp(`((?:^|[,{\\s])["']?${k}["']?\\s*:\\s*)(['"\`])(?:\\\\.|(?!\\2)[^\\\\])*\\2`);
    if (re.test(body)) body = body.replace(re, (_, pre, q) => `${pre}${q}${imgs[k]}${q}`);
    else missing.push(k);
  }
  const add = missing.map((k) => `\n  ${k}: '${imgs[k]}',`).join('');
  return `${html.slice(0, b.start + 1)}${add}${body}${html.slice(b.end)}`;
}
