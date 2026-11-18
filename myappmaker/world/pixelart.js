// [앱 월드] 픽셀아트 그리기: 선생님이 월드 그림을 올리지 않아도 앱이 직접 픽셀 섬을 그립니다.
// - 바닥(물·섬·길·나무·장식)은 480×270 작은 캔버스에 한 번만 그리고, 4배로 키워 씁니다.
// - 건물·분수·아치는 테두리가 있는 픽셀 스프라이트로 만들어 둡니다.
import { isLand, isIslet } from './worldmap.js';

export const PX = 4;                 // 그림 한 칸 = 월드 4픽셀
const AW = 480, AH = 270;
const OUTLINE = '#3B2F5C';

const hash = (x, y, s = 0) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
};

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// 칸 그리기 도구: g[y][x] = 색. 다 그린 뒤 테두리를 자동으로 붙여 캔버스로
function sprite(w, h, paint, outline = true) {
  const g = Array.from({ length: h }, () => Array(w).fill(null));
  const set = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && x < w && y >= 0 && y < h) g[y][x] = c; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
  const ellipse = (cx, cy, rx, ry, c) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) set(x, y, c); };
  paint({ set, rect, ellipse, get: (x, y) => (g[y] ? g[y][x] : null) });
  const c = canvas(w + 2, h + 2);
  const x = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
    if (g[y][i]) { x.fillStyle = g[y][i]; x.fillRect(i + 1, y + 1, 1, 1); continue; }
    if (outline && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][i + dx])) { x.fillStyle = OUTLINE; x.fillRect(i + 1, y + 1, 1, 1); }
  }
  if (outline) {   // 바깥 가장자리 테두리
    for (let i = 0; i < w; i++) { if (g[0][i]) { x.fillStyle = OUTLINE; x.fillRect(i + 1, 0, 1, 1); } if (g[h - 1][i]) { x.fillStyle = OUTLINE; x.fillRect(i + 1, h + 1, 1, 1); } }
    for (let y = 0; y < h; y++) { if (g[y][0]) { x.fillStyle = OUTLINE; x.fillRect(0, y + 1, 1, 1); } if (g[y][w - 1]) { x.fillStyle = OUTLINE; x.fillRect(w + 1, y + 1, 1, 1); } }
  }
  return c;
}

const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${[f(n >> 16), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

// ---------- 스프라이트 ----------
export function boothSprite(color) {
  const W = 44, H = 37, dark = shade(color, 0.78), light = shade(color, 1.18);
  return sprite(W, H, ({ rect, set }) => {
    for (let r = 0; r <= 13; r++) { const l = Math.round(6 - (r * 6) / 13) + (13 - r < 3 ? 0 : 0); rect(l, r, W - 1 - l, r, r % 3 === 1 ? dark : color); }
    rect(4, 0, W - 5, 0, light);
    rect(4, 14, W - 5, 33, '#FFF1D0');
    for (let x = 8; x < W - 5; x += 8) rect(x, 15, x, 33, '#F2DFB6');
    rect(18, 22, 25, 33, '#8D5A3B'); rect(19, 21, 24, 21, '#8D5A3B'); rect(21, 24, 22, 25, '#FFD166'); set(24, 28, '#FFD166');
    for (const wx of [7, 30]) { rect(wx, 18, wx + 6, 24, '#BDE8FF'); rect(wx + 3, 18, wx + 3, 24, '#FFFFFF'); rect(wx, 21, wx + 6, 21, '#FFFFFF'); }
    rect(2, 34, W - 3, 36, '#C9C2B5'); for (let x = 4; x < W - 3; x += 5) set(x, 35, '#B3AB9C');
    rect(9, 26, 11, 28, '#7BC95A'); rect(32, 26, 34, 28, '#FF8FB1');   // 화분
  });
}

export function hallSprite() {
  const W = 75, H = 62, P = '#8E6BD8', PD = '#6E4FC0';
  return sprite(W, H, ({ rect, set }) => {
    // 탑
    for (const tx of [0, 62]) {
      rect(tx, 16, tx + 12, 61, '#EDE3F7');
      for (let r = 0; r < 14; r++) { const half = Math.round((r * 7) / 13); rect(tx + 6 - half, 2 + r, tx + 6 + half, 2 + r, r % 3 === 2 ? PD : P); }
      rect(tx + 4, 26, tx + 8, 31, '#FFE58A'); rect(tx + 4, 40, tx + 8, 45, '#FFE58A');
    }
    // 가운데 건물
    rect(12, 22, 62, 61, '#F7ECD8');
    for (let y = 26; y < 60; y += 6) for (let x = 14 + ((y / 6) % 2) * 3; x < 61; x += 7) rect(x, y, x + 4, y, '#EADBC0');
    for (let r = 0; r <= 15; r++) { const l = 8 + Math.round(((15 - r) * 12) / 15); rect(l, 7 + r, W - 1 - l, 7 + r, r % 3 === 0 ? PD : P); }
    rect(37, 0, 37, 7, '#5D4037'); rect(38, 0, 42, 3, '#FF8A3D');   // 깃발
    rect(30, 40, 44, 61, '#FFD54F'); rect(32, 38, 42, 39, '#FFD54F'); rect(34, 36, 40, 37, '#FFD54F');
    rect(33, 44, 41, 47, '#F4A62A'); set(34, 45, '#FFE9A8'); set(40, 45, '#FFE9A8');   // 게임기 무늬
    for (const wx of [17, 50]) { rect(wx, 30, wx + 7, 37, '#FFE58A'); rect(wx + 3, 30, wx + 4, 37, '#F5C542'); rect(wx, 46, wx + 7, 53, '#FFE58A'); }
    rect(26, 59, 48, 61, '#C9C2B5');
  });
}

export function fountainSprite() {
  return sprite(40, 26, ({ ellipse, rect }) => {
    ellipse(20, 18, 19, 7, '#CFD8DC'); ellipse(20, 17, 16, 5, '#5BC8F5'); ellipse(20, 16, 12, 3, '#8EDDFB');
    rect(18, 6, 22, 16, '#CFD8DC'); ellipse(20, 6, 7, 2, '#B0BEC5'); ellipse(20, 5, 5, 1, '#8EDDFB');
  });
}

export function archSprite() {
  const W = 84, H = 40;
  return sprite(W, H, ({ rect, set }) => {
    for (const px of [0, 74]) { rect(px, 8, px + 9, H - 1, '#D7CCC8'); for (let y = 12; y < H; y += 5) rect(px, y, px + 9, y, '#BCAAA4'); rect(px + 2, 0, px + 2, 8, '#5D4037'); rect(px + 3, 0, px + 7, 4, '#9C6ADE'); }
    rect(0, 6, W - 1, 12, '#7E57C2'); for (let x = 2; x < W; x += 6) set(x, 9, '#9C7BE0');
    rect(12, 13, W - 13, 21, '#FFF8E1');
    rect(38, 1, 45, 5, '#5BC8F5'); set(39, 2, '#FFFFFF'); set(44, 2, '#FFFFFF');
  });
}

function treeSprite(kind) {
  if (kind === 'pine') return sprite(9, 14, ({ rect }) => { for (let r = 0; r < 10; r++) { const hw = Math.min(4, Math.floor(r / 2) + (r % 4 === 3 ? 1 : 0)); rect(4 - hw, r, 4 + hw, r, r % 3 === 0 ? '#2E7D4F' : '#3E9B5F'); } rect(4, 10, 4, 13, '#7A4E2D'); });
  const leaf = kind === 'blossom' ? ['#F8A5C2', '#FFC6DA', '#E68AAE'] : ['#4CAF50', '#6CCB5F', '#3B8F40'];
  return sprite(11, 13, ({ ellipse, rect, set }) => {
    ellipse(5, 4.5, 5, 4.5, leaf[0]); ellipse(4, 3.5, 2.5, 2, leaf[1]); set(7, 6, leaf[2]); set(3, 7, leaf[2]);
    rect(4, 9, 6, 12, '#7A4E2D');
  });
}
function lampSprite() { return sprite(3, 9, ({ rect, set }) => { rect(1, 2, 1, 8, '#455A64'); rect(0, 0, 2, 1, '#FFE066'); set(1, 0, '#FFF6B0'); }); }
function benchSprite() { return sprite(8, 4, ({ rect }) => { rect(0, 0, 7, 1, '#A1663A'); rect(1, 2, 1, 3, '#6D4C41'); rect(6, 2, 6, 3, '#6D4C41'); }); }
function lighthouseSprite() { return sprite(7, 18, ({ rect }) => { rect(1, 4, 5, 17, '#FFFFFF'); for (let y = 6; y < 17; y += 4) rect(1, y, 5, y + 1, '#E53935'); rect(1, 1, 5, 3, '#FFE066'); rect(0, 0, 6, 0, '#B71C1C'); rect(0, 4, 6, 4, '#37474F'); }); }
function mountainSprite() { return sprite(34, 20, ({ rect }) => { for (let r = 0; r < 20; r++) { const hw = Math.round((r * 17) / 19); rect(17 - hw, r, 17 + hw, r, r < 6 ? '#FFFFFF' : r % 4 === 0 ? '#8E9AAF' : '#A3B1C6'); } }); }

// ---------- 바닥 지도 ----------
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export const PONDS = [{ x: 1500, y: 735, r: 50 }, { x: 430, y: 735, r: 46 }];

export function pathShapes(world) {
  const f = world.fountain;
  const segs = [
    { a: [f.x, f.y], b: [world.arch.x, world.arch.y + 30], w: 40 },
    { a: [f.x, f.y], b: [world.hall.door.x, world.hall.door.y - 10], w: 32 },
    ...world.booths.map((b) => ({ a: [b.door.x, b.door.y], b: [f.x, f.y], w: 22 })),
  ];
  const circles = [{ x: f.x, y: f.y, r: world.plaza.r }, ...world.booths.map((b) => ({ x: b.door.x, y: b.door.y + 4, r: 44 })), { x: world.hall.door.x, y: world.hall.door.y, r: 62 }];
  return { segs, circles };
}

const onPath = (shapes, x, y, pad = 0) => shapes.circles.some((c) => Math.hypot(x - c.x, y - c.y) < c.r + pad)
  || shapes.segs.some((s) => segDist(x, y, s.a[0], s.a[1], s.b[0], s.b[1]) < s.w + pad);

export function buildGround(world) {
  const c = canvas(AW, AH);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(AW, AH);
  const shapes = pathShapes(world);
  const land = new Uint8Array(AW * AH), path = new Uint8Array(AW * AH);
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const wx = x * PX + 2, wy = y * PX + 2;
    const k = y * AW + x;
    land[k] = isLand(wx, wy) || isIslet(wx, wy) ? 1 : 0;
    if (land[k] && PONDS.some((p) => Math.hypot(wx - p.x, wy - p.y) < p.r)) land[k] = 2;   // 연못
    if (land[k] === 1 && onPath(shapes, wx, wy)) path[k] = 1;
  }
  const L = (x, y) => (x < 0 || y < 0 || x >= AW || y >= AH ? 0 : land[y * AW + x]);
  const col = (k, hex) => { const n = parseInt(hex.slice(1), 16); img.data[k * 4] = n >> 16; img.data[k * 4 + 1] = (n >> 8) & 255; img.data[k * 4 + 2] = n & 255; img.data[k * 4 + 3] = 255; };
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const k = y * AW + x, h = hash(x, y);
    if (land[k] === 1) {
      const nearWater = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => L(x + dx, y + dy) !== 1);
      if (path[k]) {
        const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !path[(y + dy) * AW + (x + dx)]);
        col(k, edge ? '#D6BC8C' : h % 11 === 0 ? '#E3CC9E' : '#EFDDB4');
      } else if (nearWater) col(k, h % 5 === 0 ? '#E8CF92' : '#F2DDA4');
      else col(k, h % 9 === 0 ? '#6BBD4E' : h % 17 === 0 ? '#8DD66C' : h % 31 === 0 ? (h % 2 ? '#FF9EC4' : '#FFE27A') : '#7CC95C');
    } else if (land[k] === 2) {
      const rim = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => L(x + dx, y + dy) === 1);
      col(k, rim ? '#D9C08E' : h % 13 === 0 ? '#9FE6FF' : '#5BC8F5');
    } else {
      // 섬 아래쪽 절벽과 물거품
      if (L(x, y - 1) === 1) col(k, '#9B7653');
      else if (L(x, y - 2) === 1) col(k, '#7A5B3F');
      else if (L(x, y - 3) === 1 || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => L(x + dx, y + dy) === 1)) col(k, '#E6FAFF');
      else col(k, h % 29 === 0 || (h % 41 === 1 && x % 3) ? '#8EDDFB' : y % 2 && h % 7 === 0 ? '#4FBDEE' : '#5BC8F5');
    }
  }
  ctx.putImageData(img, 0, 0);

  // 장식 (아래에 있는 것을 나중에 그려서 겹침이 자연스럽게)
  const deco = [];
  const busy = (wx, wy, pad) => onPath(shapes, wx, wy, pad)
    || world.booths.some((b) => wx > b.x - b.w / 2 - 24 && wx < b.x + b.w / 2 + 56 && wy > b.y - b.h - 30 && wy < b.y + 40)
    || (wx > world.hall.x - world.hall.w / 2 - 30 && wx < world.hall.x + world.hall.w / 2 + 30 && wy > world.hall.y - world.hall.h - 120 && wy < world.hall.y + 40)
    || (Math.abs(wx - world.arch.x) < world.arch.w / 2 + 30 && wy > world.arch.y - 120)
    || PONDS.some((p) => Math.hypot(wx - p.x, wy - p.y) < p.r + 26)
    || Math.hypot(wx - world.sign.x, wy - world.sign.y) < 70;
  const trees = { tree: treeSprite('tree'), blossom: treeSprite('blossom'), pine: treeSprite('pine') };
  for (let gy = 4; gy < AH; gy += 8) for (let gx = 4; gx < AW; gx += 8) {
    const h = hash(gx, gy, 7);
    const ax = gx + (h % 5) - 2, ay = gy + ((h >> 3) % 5) - 2;
    const wx = ax * PX, wy = ay * PX;
    if (!isLand(wx, wy) || !isLand(wx - 40, wy) || !isLand(wx + 40, wy) || !isLand(wx, wy + 44) || !isLand(wx, wy - 30)) continue;
    if (busy(wx, wy, 26) || h % 3 === 0) continue;
    const kind = h % 7 < 2 ? 'blossom' : h % 7 === 6 ? 'pine' : 'tree';
    deco.push({ s: trees[kind], ax, ay });
  }
  const f = world.fountain;
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) deco.push({ s: lampSprite(), ax: Math.round((f.x + dx * 130) / PX), ay: Math.round((f.y + dy * 120) / PX) });
  for (const dx of [-1, 1]) deco.push({ s: benchSprite(), ax: Math.round((f.x + dx * 190) / PX), ay: Math.round((f.y + 60) / PX) });
  deco.push({ s: lighthouseSprite(), ax: Math.round(150 / PX), ay: Math.round(950 / PX) });
  deco.push({ s: mountainSprite(), ax: Math.round(880 / PX), ay: Math.round(200 / PX) }, { s: mountainSprite(), ax: Math.round(1040 / PX), ay: Math.round(190 / PX) });
  deco.sort((a, b) => a.ay - b.ay);
  for (const d of deco) ctx.drawImage(d.s, d.ax - (d.s.width >> 1), d.ay - d.s.height + 1);
  return c;
}
