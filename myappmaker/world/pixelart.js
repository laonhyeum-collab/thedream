// [앱 월드] 픽셀아트 그리기: 선생님이 월드 그림을 올리지 않아도 앱이 직접 「떠 있는 섬 마을」을 그립니다.
// - 바닥(물·섬 절벽·잔디·돌길·광장·나무)은 480×270 작은 캔버스에 한 번만 그리고 4배로 키워 씁니다.
// - 건물·분수·아치는 남색 외곽선이 있는 픽셀 스프라이트로 만들어 둡니다(분야마다 다른 지붕).
// - 반짝이는 물결은 sparkles() 자리에 매 프레임 그립니다.
import { isLand, isIslet } from './worldmap.js';

export const PX = 4;                 // 그림 한 칸 = 월드 4픽셀
const AW = 480, AH = 270;
const OUTLINE = '#2E2A55';
const CLIFF = 7;                     // 섬 절벽 두께(칸)

const hash = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

export const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k)));
  return `#${[f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

// 칸 그리기 도구: g[y][x] = 색. 다 그린 뒤 남색 테두리를 자동으로 붙여 캔버스로
function sprite(w, h, paint, outline = true) {
  const g = Array.from({ length: h }, () => Array(w).fill(null));
  const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < w && y >= 0 && y < h) g[y][x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  const ellipse = (cx, cy, rx, ry, c) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) set(x, y, c); };
  const map = (x0, y0, rows, pal) => rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) set(x0 + x, y0 + y, pal[ch]); }));
  const meta = {};
  paint({ set, rect, ellipse, map, meta, get: (x, y) => (g[y] ? g[y][x] : null) });
  const c = canvas(w + 2, h + 2);
  const x = c.getContext('2d');
  const at = (i, y) => (y >= 0 && y < h && i >= 0 && i < w ? g[y][i] : null);
  for (let y = -1; y <= h; y++) for (let i = -1; i <= w; i++) {
    const v = at(i, y);
    if (v) { x.fillStyle = v; x.fillRect(i + 1, y + 1, 1, 1); continue; }
    if (outline && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => at(i + dx, y + dy))) { x.fillStyle = OUTLINE; x.fillRect(i + 1, y + 1, 1, 1); }
  }
  Object.assign(c, meta);   // 문장 자리 등 (칸 좌표, 테두리 1칸 포함)
  return c;
}

// ---------- 소품 ----------
const TREE_ROWS = [
  '....bbbbb....',
  '..bbcccccbb..',
  '.bccdddcccbb.',
  '.bcddddccccb.',
  'bbcdddcccccba',
  'bbcccccccccba',
  'abbcccccccbba',
  'abbbcccccbbba',
  '.abbbbcbbbbaa',
  '.aabbbbbbbaa.',
  '..aaabbbaaa..',
  '....aaaaa....',
  '.....tTu.....',
  '.....tTu.....',
  '....ttTuu....',
];
function treeSprite(kind) {
  if (kind === 'pine') {
    return sprite(11, 17, ({ rect, set }) => {
      const tiers = [[0, 1], [3, 3], [6, 4], [9, 5]];
      for (const [y0, hw] of tiers) for (let r = 0; r < 4; r++) {
        const w = Math.min(hw, 1 + r + Math.floor(y0 / 4));
        rect(5 - w, y0 + r, 5 + w, y0 + r, r === 3 ? '#2C6E46' : '#3E9160');
        set(5 - w + 1, y0 + r, '#5DB27A');
      }
      rect(4, 13, 6, 16, '#7A4E2D'); rect(6, 13, 6, 16, '#5E3B22');
    });
  }
  const pal = kind === 'blossom'
    ? { a: '#D4709A', b: '#EE92B7', c: '#F8B4CF', d: '#FFDCEA', t: '#8A5A3B', T: '#A87150', u: '#6B442B' }
    : { a: '#3E8E41', b: '#58AE4D', c: '#76C95E', d: '#A6E37F', t: '#8A5A3B', T: '#A87150', u: '#6B442B' };
  return sprite(13, 15, ({ map }) => map(0, 0, TREE_ROWS, pal));
}
function bushSprite(blossom) {
  const p = blossom ? ['#58AE4D', '#76C95E', '#FF8FB1'] : ['#4C9F45', '#6CC05A', '#A6E37F'];
  return sprite(9, 6, ({ ellipse, set }) => {
    ellipse(4, 3.2, 4.4, 2.9, p[0]); ellipse(3.4, 2.4, 2.6, 1.6, p[1]);
    set(2, 1, p[2]); set(6, 2, p[2]); set(4, 4, blossom ? p[2] : p[0]);
  });
}
function rockSprite() { return sprite(7, 5, ({ ellipse, set }) => { ellipse(3, 2.6, 3.4, 2.4, '#9AA3AE'); ellipse(2.4, 1.8, 1.8, 1.1, '#C2C9D1'); set(5, 3, '#7D8691'); }); }
function lampSprite() {
  return sprite(5, 15, ({ rect, set }) => {
    rect(2, 5, 2, 13, '#4A4E6B'); rect(1, 13, 3, 14, '#4A4E6B');
    rect(0, 1, 4, 4, '#3B3F5C'); rect(1, 2, 3, 3, '#FFE066'); set(2, 2, '#FFF7C2'); rect(1, 0, 3, 0, '#3B3F5C');
  });
}
function benchSprite() { return sprite(10, 6, ({ rect }) => { rect(0, 0, 9, 1, '#B87A48'); rect(0, 2, 9, 3, '#A1663A'); rect(1, 4, 1, 5, '#5E3B22'); rect(8, 4, 8, 5, '#5E3B22'); }); }
function flowerBedSprite(seed) {
  const cols = ['#FF7FAE', '#FFD44D', '#FFFFFF', '#B58CFF', '#FF9C5B'];
  return sprite(12, 5, ({ rect, set }) => {
    rect(0, 2, 11, 4, '#9C6B45'); rect(0, 2, 11, 2, '#B98552');
    for (let i = 0; i < 6; i++) { const c = cols[(seed + i) % cols.length]; set(1 + i * 2, 1, c); set(1 + i * 2, 0, shade(c, 1.25)); set(2 + i * 2, 1, '#5DAA45'); }
  });
}
function lighthouseSprite() {
  return sprite(9, 22, ({ rect, set }) => {
    rect(1, 7, 7, 21, '#FFFFFF'); rect(6, 7, 7, 21, '#DCE3EA');
    for (const y of [9, 14, 19]) { rect(1, y, 7, y + 1, '#E5484D'); rect(6, y, 7, y + 1, '#B9353A'); }
    rect(0, 6, 8, 6, '#3B3F5C'); rect(2, 2, 6, 5, '#FFE066'); set(3, 3, '#FFF7C2'); rect(1, 1, 7, 1, '#E5484D'); rect(3, 0, 5, 0, '#E5484D');
    rect(3, 17, 5, 21, '#8DB7D6');
  });
}
function signSprite() {
  return sprite(12, 10, ({ rect }) => { rect(5, 5, 6, 9, '#7A4E2D'); rect(0, 0, 11, 5, '#C88F5A'); rect(0, 0, 11, 0, '#E0AC74'); rect(1, 2, 10, 2, '#B07A48'); });
}

// ---------- 건물 ----------
// 분야별 지붕 모양: gable(박공) · tent(줄무늬 천막) · spire(뾰족) · round(둥근) · awning(가게 차양)
const STYLE = {
  adventure: { roof: '#C8743E', wall: '#F2D7A8', trim: '#8A5A3B', kind: 'gable', extra: 'flag' },
  action: { roof: '#EF5B4B', wall: '#FFF4E3', trim: '#B83B30', kind: 'tent', extra: 'pennant' },
  create: { roof: '#A86BDB', wall: '#FFE6F1', trim: '#7B49B0', kind: 'round', extra: 'easel' },
  mystery: { roof: '#4D7FD6', wall: '#E8EEF9', trim: '#2F5BA8', kind: 'spire', extra: 'chimney' },
  life: { roof: '#E58B3A', wall: '#FFF1D0', trim: '#A85F22', kind: 'awning', extra: 'pots' },
};
// 자리마다 지붕 색을 바꿔 마을이 알록달록하게 (모양·장식은 분야대로)
const ROOFS = ['#C8743E', '#4D7FD6', '#A86BDB', '#3FA66B', '#E5484D', '#E58B3A', '#2FA6A0', '#D9638F'];
export function boothStyle(cat, color, n = 0) {
  const st = STYLE[cat] || { roof: color || '#8E6BD8', wall: '#FFF1D6', kind: 'gable', extra: 'pots' };
  const roof = n ? ROOFS[(n - 1) % ROOFS.length] : st.roof;
  return { ...st, roof, trim: shade(roof, 0.62) };
}

export function boothSprite(cat, color, n = 0) {
  const st = boothStyle(cat, color, n);
  const W = 46, H = 40, cx = 23, R = st.roof;
  return sprite(W, H, ({ rect, set, ellipse, meta }) => {
    // 벽
    const wallTop = 17, wallBot = 34;
    rect(4, wallTop, W - 5, wallBot, st.wall);
    rect(W - 8, wallTop, W - 5, wallBot, shade(st.wall, 0.88));        // 오른쪽 그늘
    rect(4, wallTop, 4, wallBot, shade(st.wall, 1.15));
    for (let y = wallTop + 4; y < wallBot; y += 4) rect(5, y, W - 9, y, shade(st.wall, 0.95));
    rect(4, wallTop, W - 5, wallTop + 1, shade(st.wall, 0.78));          // 처마 그늘
    // 지붕
    const top = st.kind === 'spire' ? 1 : st.kind === 'round' ? 4 : 5;
    for (let y = top; y <= 16; y++) {
      const t = (y - top) / (16 - top);
      let half;
      if (st.kind === 'round') half = Math.round(8 + 15 * Math.sqrt(t));
      else if (st.kind === 'spire') half = Math.round(2 + 21 * t);
      else if (st.kind === 'awning') half = Math.round(16 + 7 * t);
      else half = Math.round(10 + 13 * t);
      for (let x = cx - half; x <= cx + half; x++) {
        let c = R;
        if (st.kind === 'tent') c = Math.floor((x - cx + 40) / 3) % 2 ? R : '#FFFFFF';
        else if ((y - top) % 3 === 2) c = shade(R, 0.84);
        else if ((x + (Math.floor((y - top) / 3) % 2) * 2) % 4 === 0) c = shade(R, 0.92);
        if (x > cx + half - 3) c = shade(c, 0.85);
        set(x, y, c);
      }
      if (y === top) for (let x = cx - half; x <= cx + half; x++) set(x, y, shade(R, 1.2));
    }
    if (st.kind === 'tent') for (let x = 0; x < W; x++) if (x % 3 === 0) set(x, 17, Math.floor((x - cx + 40) / 3) % 2 ? R : '#FFFFFF');
    rect(0, 16, W - 1, 16, shade(R, 0.72));
    // 지붕 문장(흰 동그라미) — 앱 이모지가 여기에
    const ey = st.kind === 'spire' ? 11 : 10;
    ellipse(cx, ey, 5.8, 5.8, shade(R, 0.55)); ellipse(cx, ey, 4.9, 4.9, '#FFFFFF');
    meta.emblem = { x: cx + 1, y: ey + 1, r: 4.9 };
    // 차양(가게)
    if (st.kind === 'awning') for (let x = 5; x < W - 5; x++) { rect(x, 18, x, 20, Math.floor(x / 3) % 2 ? '#FFFFFF' : '#E5484D'); if (x % 3 === 1) set(x, 21, Math.floor(x / 3) % 2 ? '#FFFFFF' : '#E5484D'); }
    // 창문 + 꽃상자
    for (const wx of [8, W - 16]) {
      rect(wx - 1, 22, wx + 7, 29, st.trim);
      rect(wx, 23, wx + 6, 28, '#A8DEFF'); rect(wx, 23, wx + 6, 24, '#D6F0FF');
      rect(wx + 3, 23, wx + 3, 28, '#FFFFFF'); rect(wx, 26, wx + 6, 26, '#FFFFFF');
      rect(wx - 1, 30, wx + 7, 31, '#9C6B45');
      for (let i = 0; i < 4; i++) set(wx + i * 2, 29, i % 2 ? '#FFD44D' : '#FF7FAE');
    }
    // 빛나는 아치 문 + 게임기 무늬
    rect(cx - 6, 23, cx + 5, wallBot, st.trim);
    rect(cx - 5, 25, cx + 4, wallBot, '#FFC93C'); rect(cx - 4, 24, cx + 3, 24, '#FFC93C');
    rect(cx - 3, 26, cx + 2, wallBot, '#FFE27A'); rect(cx - 2, 27, cx + 1, wallBot - 1, '#FFF3B8');
    rect(cx - 3, 20, cx + 2, 21, '#3B3F5C'); set(cx - 2, 20, '#FFD44D'); set(cx + 1, 21, '#FF7FAE');
    // 주춧돌 · 계단
    rect(2, 35, W - 3, 37, '#C9C2B5'); rect(2, 35, W - 3, 35, '#DCD6CB');
    for (let x = 4; x < W - 3; x += 5) set(x, 36, '#ADA595');
    rect(cx - 7, 38, cx + 6, 39, '#E2DCD0');
    // 분야 장식
    if (st.extra === 'flag') { rect(W - 6, 2, W - 6, 15, '#6B442B'); rect(W - 5, 2, W - 1, 5, '#2F9E6E'); set(W - 4, 3, '#8FE0B5'); }
    if (st.extra === 'pennant') for (let x = 2; x < W - 2; x += 4) { set(x, 17 + (x % 8 ? 1 : 0), '#FFD44D'); }
    if (st.extra === 'chimney') { rect(31, 2, 34, 9, '#8E7A6A'); rect(30, 1, 35, 2, '#6E5E50'); }
    if (st.extra === 'easel') { rect(W - 3, 26, W - 1, 33, '#B87A48'); rect(W - 4, 24, W - 1, 28, '#FFFFFF'); set(W - 3, 25, '#FF7FAE'); set(W - 2, 26, '#5DB3FF'); }
    if (st.extra === 'pots') { rect(0, 31, 2, 34, '#C76A3A'); rect(0, 29, 2, 30, '#5DAA45'); set(1, 28, '#FF7FAE'); }
  });
}

// 아직 아무도 없는 자리: 울타리 친 꽃밭 + 「곧 열려요」 팻말
export function emptyLotSprite() {
  return sprite(40, 22, ({ rect, set }) => {
    rect(2, 6, 37, 19, '#C9975F');
    for (let y = 8; y < 19; y += 3) rect(4, y, 35, y, '#B07E4C');
    for (let x = 6; x < 36; x += 6) { set(x, 9, '#5DAA45'); set(x + 1, 8, '#7ACB5F'); set(x + 3, 15, '#5DAA45'); set(x + 3, 14, '#FFD44D'); }
    for (let x = 0; x < 40; x += 4) { rect(x, 4, x + 1, 9, '#E9D3AE'); rect(x, 15, x + 1, 21, '#E9D3AE'); }
    rect(0, 5, 39, 5, '#D7BB8E'); rect(0, 7, 39, 7, '#D7BB8E'); rect(0, 17, 39, 17, '#D7BB8E'); rect(0, 19, 39, 19, '#D7BB8E');
    rect(0, 5, 1, 19, '#E9D3AE'); rect(38, 5, 39, 19, '#E9D3AE');
    rect(18, 0, 21, 3, '#C88F5A'); rect(19, 4, 20, 12, '#7A4E2D'); rect(18, 1, 21, 1, '#E0AC74');
  });
}

export function hallSprite() {
  const W = 84, H = 70, P = '#8E6BD8', PD = '#6E4FC0', PL = '#B39BEF', WALL = '#F7ECD8';
  return sprite(W, H, ({ rect, set, ellipse, meta }) => {
    // 양쪽 탑
    for (const tx of [0, W - 15]) {
      rect(tx, 22, tx + 14, 64, '#EDE3F7'); rect(tx + 11, 22, tx + 14, 64, '#D9CCEC');
      for (let r = 0; r < 20; r++) { const half = Math.round((r * 8) / 19); rect(tx + 7 - half, 2 + r, tx + 7 + half, 2 + r, r % 4 === 3 ? PD : P); set(tx + 7 - half, 2 + r, PL); }
      rect(tx - 1, 21, tx + 15, 22, PD);
      rect(tx + 7, 0, tx + 7, 2, '#5D4037'); rect(tx + 8, 0, tx + 11, 1, '#FFD44D');
      for (const wy of [30, 45]) { rect(tx + 4, wy, tx + 9, wy + 6, '#5D4E8C'); rect(tx + 5, wy + 1, tx + 8, wy + 6, '#FFE27A'); set(tx + 5, wy + 1, '#FFF7C2'); }
    }
    // 본관
    rect(14, 30, W - 15, 64, WALL); rect(W - 22, 30, W - 15, 64, shade(WALL, 0.9));
    for (let y = 34; y < 64; y += 5) for (let x = 15 + ((y / 5) % 2) * 3; x < W - 16; x += 7) rect(x, y, x + 4, y, '#EADBC0');
    // 큰 지붕
    for (let r = 0; r <= 20; r++) {
      const half = Math.round(10 + r * 1.45);
      for (let x = 42 - half; x <= 41 + half; x++) set(x, 9 + r, r % 4 === 3 ? PD : (x + r) % 6 === 0 ? shade(P, 0.92) : P);
      set(42 - half, 9 + r, PL);
    }
    rect(10, 29, W - 11, 30, PD);
    rect(41, 2, 42, 9, '#5D4037'); rect(43, 2, 48, 5, '#FF8A3D'); set(44, 3, '#FFC08A');
    // 문장(학사모) 자리
    ellipse(42, 19, 6.4, 6.4, '#5A3FA6'); ellipse(42, 19, 5.4, 5.4, '#FFFFFF');
    meta.emblem = { x: 43, y: 20, r: 5.4 };
    // 창문
    for (const wx of [20, 54]) for (const wy of [36, 50]) { rect(wx - 1, wy - 1, wx + 8, wy + 7, '#5D4E8C'); rect(wx, wy, wx + 7, wy + 6, '#FFE27A'); rect(wx + 3, wy, wx + 4, wy + 6, '#F5C542'); rect(wx, wy, wx + 2, wy + 1, '#FFF7C2'); }
    // 큰 아치 문
    rect(31, 42, 52, 64, '#5D4E8C');
    rect(33, 46, 50, 64, '#FFC93C'); rect(35, 44, 48, 45, '#FFC93C'); rect(37, 43, 46, 43, '#FFC93C');
    rect(35, 48, 48, 64, '#FFE27A'); rect(38, 50, 45, 63, '#FFF3B8'); rect(41, 46, 42, 64, '#F4A62A');
    // 현수막
    for (const bx of [24, 57]) { rect(bx, 31, bx + 2, 40, '#E5484D'); set(bx + 1, 41, '#E5484D'); set(bx + 1, 33, '#FFD44D'); }
    // 계단
    rect(27, 65, 56, 66, '#DCD6CB'); rect(24, 67, 59, 69, '#C9C2B5');
  });
}

export function fountainSprite() {
  return sprite(46, 30, ({ ellipse, rect, set }) => {
    ellipse(23, 21, 22, 8, '#B8C2CC'); ellipse(23, 20, 22, 7.4, '#DCE3EA');
    ellipse(23, 20, 19, 5.6, '#4FC3E8'); ellipse(23, 19.4, 16, 4, '#7FDDF2');
    for (const [x, y] of [[12, 19], [30, 21], [20, 22], [33, 18]]) rect(x, y, x + 2, y, '#D8F6FF');
    rect(20, 8, 26, 19, '#C8D0D8'); rect(24, 8, 26, 19, '#AEB8C2');
    ellipse(23, 8, 9, 3, '#DCE3EA'); ellipse(23, 7.6, 7, 2, '#7FDDF2');
    rect(22, 2, 24, 7, '#BFEFFF'); set(23, 1, '#FFFFFF');
    for (const x of [15, 31]) { set(x, 9, '#BFEFFF'); set(x - (x < 23 ? 1 : -1), 11, '#BFEFFF'); }
  });
}

export function archSprite() {
  const W = 100, H = 44;
  return sprite(W, H, ({ rect, set }) => {
    for (const px of [0, W - 12]) {
      rect(px, 10, px + 11, H - 1, '#D9D3E6'); rect(px + 8, 10, px + 11, H - 1, '#BDB4D0');
      for (let y = 14; y < H; y += 5) rect(px, y, px + 11, y, '#C5BCD8');
      rect(px - 1, 8, px + 12, 10, '#A493C9');
      rect(px + 3, 1, px + 8, 7, '#3B3F5C'); rect(px + 4, 2, px + 7, 6, '#FFE066'); set(px + 5, 3, '#FFF7C2');
    }
    rect(4, 9, W - 5, 16, '#7E57C2'); rect(4, 9, W - 5, 9, '#9C7BE0');
    for (let x = 8; x < W - 8; x += 6) { set(x, 17, '#7E57C2'); set(x + 1, 18, '#7E57C2'); }
    rect(14, 18, W - 15, 27, '#FFF8E1'); rect(14, 27, W - 15, 27, '#E8DCC0');
    rect(13, 18, 13, 27, '#7A4E2D'); rect(W - 14, 18, W - 14, 27, '#7A4E2D');
  });
}

// ---------- 바닥 지도 ----------
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export const PONDS = [{ x: 175, y: 765, r: 46 }, { x: 1745, y: 765, r: 46 }];

export function pathShapes(world) {
  const f = world.fountain;
  const segs = [
    { a: [f.x, f.y], b: [world.arch.x, world.arch.y + 30], w: 40 },
    { a: [f.x, f.y], b: [world.hall.door.x, world.hall.door.y - 10], w: 32 },
    ...world.booths.map((b) => ({ a: [b.door.x, b.door.y], b: [f.x, f.y], w: 20 })),
  ];
  const circles = [{ x: f.x, y: f.y, r: world.plaza.r }, ...world.booths.map((b) => ({ x: b.door.x, y: b.door.y + 4, r: 40 })), { x: world.hall.door.x, y: world.hall.door.y, r: 62 }];
  return { segs, circles };
}

const onPath = (shapes, x, y, pad = 0) => shapes.circles.some((c) => Math.hypot(x - c.x, y - c.y) < c.r + pad)
  || shapes.segs.some((s) => segDist(x, y, s.a[0], s.a[1], s.b[0], s.b[1]) < s.w + pad);

const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

// 물 위에서 반짝일 자리 (월드 좌표)
let SPARKLES = [];
export const sparkles = () => SPARKLES;

export function buildGround(world) {
  const c = canvas(AW, AH);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(AW, AH);
  const shapes = pathShapes(world);
  const N = AW * AH;
  const land = new Uint8Array(N), path = new Uint8Array(N), plaza = new Uint8Array(N);
  const f = world.fountain;
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const wx = x * PX + 2, wy = y * PX + 2, k = y * AW + x;
    land[k] = isLand(wx, wy) || isIslet(wx, wy) ? 1 : 0;
    if (land[k] && PONDS.some((p) => Math.hypot(wx - p.x, wy - p.y) < p.r)) land[k] = 2;
    if (land[k] === 1 && onPath(shapes, wx, wy)) path[k] = 1;
    if (land[k] === 1 && Math.hypot(wx - f.x, wy - f.y) < world.plaza.r) plaza[k] = 1;
  }
  const L = (x, y) => (x < 0 || y < 0 || x >= AW || y >= AH ? 0 : land[y * AW + x]);
  // 절벽: 땅 바로 아래 CLIFF칸
  const cliff = new Uint8Array(N);
  for (let x = 0; x < AW; x++) for (let y = 0; y < AH; y++) {
    if (L(x, y) !== 1 || L(x, y + 1) === 1) continue;
    for (let k = 1; k <= CLIFF && y + k < AH; k++) { if (L(x, y + k) === 1) break; cliff[(y + k) * AW + x] = k; }
  }
  // 섬(땅+절벽)에서 떨어진 거리 (물 색·물거품)
  const dist = new Int16Array(N).fill(-1);
  const q = [];
  for (let k = 0; k < N; k++) if (land[k] === 1 || cliff[k]) { dist[k] = 0; q.push(k); }
  for (let qi = 0; qi < q.length; qi++) {
    const k = q[qi], x = k % AW, y = (k / AW) | 0, d = dist[k];
    if (d > 60) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= AW || ny >= AH) continue;
      const nk = ny * AW + nx; if (dist[nk] !== -1) continue; dist[nk] = d + 1; q.push(nk);
    }
  }
  const put = (k, hex) => { const [r, g, b] = rgb(hex); img.data[k * 4] = r; img.data[k * 4 + 1] = g; img.data[k * 4 + 2] = b; img.data[k * 4 + 3] = 255; };
  const noise = (x, y) => Math.sin(x * 0.09 + Math.sin(y * 0.07) * 2) + Math.cos(y * 0.11 - x * 0.03);
  SPARKLES = [];
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const k = y * AW + x, h = hash(x, y);
    if (land[k] === 1) {
      const edgeWater = [[1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => !L(x + dx, y + dy));
      if (plaza[k]) {
        const d = Math.hypot((x * PX + 2 - f.x) / PX, (y * PX + 2 - f.y) / PX), ring = Math.floor(d / 4);
        const ang = Math.atan2(y * PX + 2 - f.y, x * PX + 2 - f.x), seg = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * (8 + ring * 6));
        const seam = d % 4 < 1 || Math.abs(Math.sin(((ang + Math.PI) * (8 + ring * 6)) / 2)) < 0.12;
        const outer = d > world.plaza.r / PX - 2;
        put(k, outer ? '#B9A98C' : seam ? '#CFC6B2' : (ring + seg) % 2 ? '#ECE5D4' : '#E0D7C2');
      } else if (path[k]) {
        const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !path[(y + dy) * AW + (x + dx)]);
        const row = Math.floor(y / 3), seam = y % 3 === 0 || (x + (row % 2) * 3) % 6 === 0;
        put(k, edge ? '#C2A878' : seam ? '#DCC79C' : h % 9 === 0 ? '#F6EBCB' : '#EFE0BB');
      } else if (edgeWater) put(k, '#A6E37F');
      else {
        const n = noise(x, y), dither = (x + y) % 2;
        let col = n > 0.55 || (n > 0.35 && dither) ? '#86D163' : n < -0.6 || (n < -0.4 && dither) ? '#70C251' : '#7BCA5A';
        if (h % 41 === 0) col = '#5EAE47';
        else if (h % 43 === 1) col = '#9EDD7A';
        put(k, col);
      }
    } else if (land[k] === 2) {
      const rim = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => L(x + dx, y + dy) === 1);
      const rim2 = [[2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => L(x + dx, y + dy) === 1);
      put(k, rim ? (h % 3 ? '#B8B2A6' : '#9E978A') : rim2 ? '#7FDDF2' : h % 23 === 0 ? '#BFEFFF' : '#4FC3E8');
    } else if (cliff[k]) {
      const d = cliff[k];
      let col = d === 1 ? '#5EAE47' : d === 2 ? '#C08A57' : d <= 4 ? '#AE7A4B' : d <= 6 ? '#956541' : '#7A5034';
      if (d > 1 && h % 7 === 0) col = shade(col, 0.86);
      if (d > 1 && d < CLIFF && (x * 7 + d) % 11 === 0) col = shade(col, 1.12);
      put(k, col);
    } else {
      const d = dist[k];
      let col;
      if (d === 1) col = OUTLINE;
      else if (d === 2 || d === 3) col = (x + (d === 3 ? 2 : 0)) % 5 < 3 ? '#E6FAFF' : '#9BE5F7';
      else if (d > 0 && d < 9) col = '#6FD3EE';
      else if (d > 0 && d < 22) col = '#4FC3E8';
      else col = '#3FB4DD';
      if (d >= 5 && h % 97 === 0) { col = '#9BE5F7'; }
      if (d >= 6 && h % 1300 === 0) SPARKLES.push({ x: x * PX, y: y * PX, p: h % 7 });
      put(k, col);
    }
  }
  // 물결 무늬: 짧은 가로줄
  for (let y = 2; y < AH; y += 5) for (let x = (y * 7) % 13; x < AW - 4; x += 13 + (hash(x, y, 3) % 9)) {
    const k = y * AW + x; if (dist[k] < 6) continue;
    for (let i = 0; i < 3; i++) put(k + i, '#8CE0F6');
  }
  // 꽃·풀 포기
  for (let y = 1; y < AH - 1; y++) for (let x = 1; x < AW - 1; x++) {
    const k = y * AW + x; if (land[k] !== 1 || path[k] || plaza[k]) continue;
    const h = hash(x, y, 5);
    if (h % 61 === 0) { const col = ['#FF7FAE', '#FFD44D', '#FFFFFF', '#B58CFF'][h % 4]; put(k, col); put(k - 1, shade(col, 0.85)); put(k + 1, shade(col, 0.85)); put(k - AW, shade(col, 1.2)); put(k + AW, '#4E9A3A'); }
    else if (h % 47 === 0) { put(k, '#5EAE47'); put(k - AW - 1, '#5EAE47'); put(k - AW + 1, '#5EAE47'); }
  }
  // 건물 그림자
  const shadowEllipse = (wx, wy, rx, ry) => {
    const ax = wx / PX, ay = wy / PX;
    for (let y = Math.floor(ay - ry); y <= ay + ry; y++) for (let x = Math.floor(ax - rx); x <= ax + rx; x++) {
      if (x < 0 || y < 0 || x >= AW || y >= AH || ((x - ax) / rx) ** 2 + ((y - ay) / ry) ** 2 > 1) continue;
      const k = y * AW + x; if (land[k] !== 1) continue;
      for (let i = 0; i < 3; i++) img.data[k * 4 + i] = Math.round(img.data[k * 4 + i] * 0.8);
    }
  };
  for (const b of world.booths) shadowEllipse(b.x + 6, b.y + 2, 25, 4);
  shadowEllipse(world.hall.x + 8, world.hall.y + 4, 44, 6);
  ctx.putImageData(img, 0, 0);

  // 장식 (아래에 있는 것을 나중에 그려서 겹침이 자연스럽게)
  const deco = [];
  const busy = (wx, wy, pad) => onPath(shapes, wx, wy, pad)
    || world.booths.some((b) => wx > b.x - b.w / 2 - 30 && wx < b.x + b.w / 2 + 60 && wy > b.y - b.h - 30 && wy < b.y + 46)
    || (wx > world.hall.x - world.hall.w / 2 - 30 && wx < world.hall.x + world.hall.w / 2 + 30 && wy > world.hall.y - world.hall.h - 120 && wy < world.hall.y + 40)
    || (Math.abs(wx - world.arch.x) < world.arch.w / 2 + 30 && wy > world.arch.y - 130)
    || PONDS.some((p) => Math.hypot(wx - p.x, wy - p.y) < p.r + 26)
    || Math.hypot(wx - world.sign.x, wy - world.sign.y) < 60;
  const S = { tree: treeSprite('tree'), blossom: treeSprite('blossom'), pine: treeSprite('pine'), bush: bushSprite(false), bushB: bushSprite(true), rock: rockSprite() };
  const okLand = (wx, wy, m) => isLand(wx, wy) && isLand(wx - m, wy) && isLand(wx + m, wy) && isLand(wx, wy + m + 8) && isLand(wx, wy - m);
  for (let gy = 4; gy < AH; gy += 7) for (let gx = 4; gx < AW; gx += 7) {
    const h = hash(gx, gy, 7);
    const ax = gx + (h % 5) - 2, ay = gy + ((h >> 3) % 5) - 2, wx = ax * PX, wy = ay * PX;
    const r = h % 20;
    const kind = r < 7 ? 'tree' : r < 12 ? 'blossom' : r < 14 ? 'pine' : r < 17 ? 'bush' : r < 19 ? 'bushB' : 'rock';
    const small = kind.startsWith('bush') || kind === 'rock';
    if (!okLand(wx, wy, small ? 16 : 36) || busy(wx, wy, small ? 8 : 24) || h % 5 === 0) continue;
    deco.push({ s: S[kind], ax, ay, shadow: !small });
  }
  // 광장 둘레: 가로등·벤치·꽃밭
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) deco.push({ s: lampSprite(), ax: Math.round((f.x + dx * 132) / PX), ay: Math.round((f.y + dy * 112) / PX) });
  for (const dx of [-1, 1]) deco.push({ s: benchSprite(), ax: Math.round((f.x + dx * 205) / PX), ay: Math.round((f.y + 40) / PX) });
  for (const dx of [-1, 1]) deco.push({ s: flowerBedSprite(dx > 0 ? 2 : 0), ax: Math.round((f.x + dx * 205) / PX), ay: Math.round((f.y - 60) / PX) });
  // 부스 옆 꽃밭 · 가로등
  world.booths.forEach((b, i) => {
    deco.push({ s: flowerBedSprite(i), ax: Math.round((b.x - b.w / 2 - 4) / PX), ay: Math.round((b.y + 30) / PX) });
    deco.push({ s: lampSprite(), ax: Math.round((b.x - b.w / 2 + 8) / PX), ay: Math.round((b.y + 4) / PX) });
  });
  deco.push({ s: lighthouseSprite(), ax: Math.round(150 / PX), ay: Math.round(950 / PX) });
  deco.push({ s: signSprite(), ax: Math.round(world.sign.x / PX), ay: Math.round(world.sign.y / PX) });
  deco.sort((a, b) => a.ay - b.ay);
  for (const d of deco) {
    if (d.shadow) { ctx.fillStyle = 'rgba(30,60,30,.22)'; ctx.fillRect(d.ax - 5, d.ay - 1, 11, 2); ctx.fillRect(d.ax - 4, d.ay + 1, 9, 1); }
    ctx.drawImage(d.s, d.ax - (d.s.width >> 1), d.ay - d.s.height + 1);
  }
  return c;
}
