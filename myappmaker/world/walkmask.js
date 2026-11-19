// [앱 월드] 그림 지도 위 「걸을 수 있는 길」: 지도 그림에서 크림색 돌길·모래를 찾아 칸(격자)으로 만들고,
// 캐릭터가 그 길 위로만 걷게 해요. 화면을 누르면 길을 따라 돌아가는 경로(A*)를 찾아요. (화면과 상관없는 순수 계산)
// 바다·강·연못·계곡 물은 길로 치지 않고, 곧게 이은 구간도 물 칸을 스치지 않아요. 길을 거의 못 찾은 그림은 물만 뺀 땅(landMask).

export const CELL = 12;   // 월드 좌표 12px = 한 칸

// 크림색 돌길·계단·모래 해변 (잔디·물·나무·지붕은 아님)
export function isPathColor(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx < 170 || r < g - 6 || g < b) return false;      // 어둡거나, 초록·파랑 쪽
  const warm = r - b;
  if (warm < 18 || warm > 120) return false;              // 흰색(구름·벽)·주황 지붕 빼기
  return g - b >= 8 && (mx - mn) / mx < 0.5;               // 연한 노랑·베이지
}

// 물(바다·강·연못·폭포 웅덩이): 짙은 파랑·청록. 보라 지붕·깃발(빨강이 초록보다 큼), 눈 그림자·물보라(연한 하늘색)는 물이 아님
export function isWaterColor(r, g, b) {
  return r < 150 && b >= 140 && b - r >= 60 && g >= r + 20 && b >= g - 10;
}

// 땅 걷기 힘든 정도 (떨어진 길 조각·문을 이을 때): 잔디·눈·모래 1, 바위·절벽·나무다리·지붕 4, 물 WATER(거의 못 건넘)
export const WATER = 400;
export function groundCost(rgba, gw, gh, sub = 3) {
  const W = gw * sub, out = new Float32Array(gw * gh);
  for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) {
    let wet = 0, sum = 0;
    for (let y = 0; y < sub; y++) for (let x = 0; x < sub; x++) {
      const i = ((cy * sub + y) * W + cx * sub + x) * 4, r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
      if (isWaterColor(r, g, b)) { wet++; continue; }
      const easy = (g > r + 10 && g > b + 10) || Math.min(r, g, b) > 180 || isPathColor(r, g, b);   // 잔디 · 눈 · 길/모래
      sum += easy ? 1 : 4;
    }
    // 물이 반 넘으면 물, 조금 섞였으면(물가·폭포 물보라) 그만큼 비싸게
    out[cy * gw + cx] = wet * 2 >= sub * sub ? WATER : sum / (sub * sub - wet) + (wet / (sub * sub)) * WATER / 2;
  }
  return out;
}

// 칸마다 물인지 (칸 안 픽셀의 절반 이상이 물 색이면 물)
export function waterCells(rgba, gw, gh, sub = 3) {
  const W = gw * sub, out = new Uint8Array(gw * gh);
  for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) {
    let n = 0;
    for (let y = 0; y < sub; y++) for (let x = 0; x < sub; x++) {
      const i = ((cy * sub + y) * W + cx * sub + x) * 4;
      if (isWaterColor(rgba[i], rgba[i + 1], rgba[i + 2])) n++;
    }
    out[cy * gw + cx] = n * 2 >= sub * sub ? 1 : 0;
  }
  return out;
}

// 길을 거의 못 찾은 그림(직접 그린 지도 등): 물이 아닌 땅은 어디든 걷기
export function landMask(water) {
  const m = new Uint8Array(water.length);
  for (let i = 0; i < m.length; i++) m[i] = water[i] ? 0 : 1;
  return m;
}

// rgba: 지도 그림을 gw×gh(=칸 수)의 sub×sub 배로 줄여 그린 픽셀 (Uint8ClampedArray)
export function buildMask(rgba, gw, gh, sub = 3) {
  const W = gw * sub;
  const raw = new Uint8Array(gw * gh);
  for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) {
    let n = 0;
    for (let y = 0; y < sub; y++) for (let x = 0; x < sub; x++) {
      const i = ((cy * sub + y) * W + cx * sub + x) * 4;
      if (isPathColor(rgba[i], rgba[i + 1], rgba[i + 2])) n++;
    }
    raw[cy * gw + cx] = n * 2 >= sub * sub ? 1 : 0;
  }
  // 닫기(넓혔다 좁히기): 길 위 가로등·꽃·그림자 구멍 메우기
  // 단, 길 두 줄 사이의 좁은 개울·연못·계곡 물은 메우지 않아요 (물 칸은 다시 빼기)
  const m = erode(dilate(raw, gw, gh, 2), gw, gh, 2);
  const water = waterCells(rgba, gw, gh, sub);
  for (let i = 0; i < m.length; i++) if (water[i] && !raw[i]) m[i] = 0;
  return m;
}

function dilate(m, w, h, r) {
  const o = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!m[y * w + x]) continue;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < w && Y < h && dx * dx + dy * dy <= r * r + 1) o[Y * w + X] = 1;
    }
  }
  return o;
}
function erode(m, w, h, r) {
  const o = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let ok = 1;
    for (let dy = -r; dy <= r && ok; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + 1) continue;
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= w || Y >= h || !m[Y * w + X]) { ok = 0; break; }
    }
    o[y * w + x] = ok;
  }
  return o;
}

// 시작 자리에서 이어진 길만 남기고, 문 자리(선생님 건물·부스)가 길에서 떨어져 있으면 길까지 좁은 길을 이어요.
// 잇는 길은 곧은 줄이 아니라 「가장 쉬운 땅길」(다리·땅 위로 돌아가기)이고, 물(water 칸)은 다른 길이 전혀 없을 때만 건너요.
// points: 월드 좌표 [{x, y}] (첫째 = 시작 자리), blocks: 건물 몸통 [{x, y, w, h}] (크림색 벽을 길로 잘못 보지 않게)
// ground: 칸마다 걷기 힘든 정도 (groundCost, WATER 이상 = 물). 없으면 그림을 모르는 채로 모두 같은 땅처럼 이어요.
export function finishMask(mask, gw, gh, points, blocks = [], ground = null) {
  const m = mask.slice();
  const wet = (i) => !!(ground && ground[i] >= WATER);
  if (ground) for (let i = 0; i < m.length; i++) if (wet(i)) m[i] = 0;
  for (const b of blocks) {
    for (let Y = Math.max(0, Math.floor(b.y / CELL)); Y < Math.min(gh, Math.ceil((b.y + b.h) / CELL)); Y++)
      for (let X = Math.max(0, Math.floor(b.x / CELL)); X < Math.min(gw, Math.ceil((b.x + b.w) / CELL)); X++) m[Y * gw + X] = 0;
  }
  const cell = (p) => ({ x: Math.max(0, Math.min(gw - 1, Math.floor(p.x / CELL))), y: Math.max(0, Math.min(gh - 1, Math.floor(p.y / CELL))) });
  // 둘레 칸은 물이 아닐 때만 길로 (가운데 칸은 꼭)
  const disc = (c, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = c.x + dx, Y = c.y + dy, k = Y * gw + X; if (X >= 0 && Y >= 0 && X < gw && Y < gh && dx * dx + dy * dy <= r * r && (!wet(k) || (!dx && !dy))) m[k] = 1; } };
  const cells = points.map(cell);
  for (const c of cells) disc(c, 2);   // 문 앞은 늘 설 수 있게
  // 시작에서 이어진 길 + 떨어진 길 조각(큰 조각·문이 있는 조각)을 가장 쉬운 땅길로 하나씩 이어요 (다리·계단처럼 색이 다른 곳)
  const doorAt = new Set(cells.map((c) => c.y * gw + c.x));
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let reach = flood(m, gw, gh, cells[0]);
  for (let round = 0; round < 60; round++) {
    const comp = new Int32Array(m.length).fill(-1), size = [], hasDoor = [];
    for (let i = 0; i < m.length; i++) {
      if (!m[i] || reach[i] || comp[i] >= 0) continue;
      const id = size.length, q = [i]; comp[i] = id; let n = 0, d = false;
      while (q.length) {
        const j = q.pop(); n++; if (doorAt.has(j)) d = true;
        const x = j % gw, y = (j / gw) | 0;
        for (const [dx, dy] of N4) {
          const X = x + dx, Y = y + dy, k = Y * gw + X;
          if (X >= 0 && Y >= 0 && X < gw && Y < gh && m[k] && !reach[k] && comp[k] < 0) { comp[k] = id; q.push(k); }
        }
      }
      size.push(n); hasDoor.push(d);
    }
    const want = (id) => id >= 0 && (hasDoor[id] || size[id] >= 25);
    if (!size.some((_, id) => want(id))) break;
    // 이어진 길에서 가장 쉽게 닿는 조각 찾기 (잔디 1칸 = 1, 바위·절벽은 더, 물은 아주 비쌈 → 다리·땅으로 돌아가요)
    const cost = new Float64Array(m.length).fill(Infinity), prev = new Int32Array(m.length).fill(-1);
    const heap = makeHeap();
    for (let i = 0; i < m.length; i++) if (reach[i]) { cost[i] = 0; heap.push(0, i); }
    if (!heap.size()) break;
    let best = -1;
    while (heap.size()) {
      const [c0, j] = heap.pop();
      if (c0 > cost[j]) continue;
      if (want(comp[j])) { best = j; break; }
      const x = j % gw, y = (j / gw) | 0;
      for (const [dx, dy] of N4) {
        const X = x + dx, Y = y + dy, k = Y * gw + X;
        if (X < 0 || Y < 0 || X >= gw || Y >= gh) continue;
        const c = cost[j] + (m[k] ? 0.5 : ground ? ground[k] : 1);
        if (c < cost[k]) { cost[k] = c; prev[k] = j; heap.push(c, k); }
      }
    }
    if (best < 0) break;
    for (let k = best; k >= 0 && !reach[k]; k = prev[k]) disc({ x: k % gw, y: (k / gw) | 0 }, 1);
    reach = flood(m, gw, gh, cells[0]);
  }
  for (let i = 0; i < m.length; i++) m[i] = reach[i];
  return m;
}

function makeHeap() {
  const h = [];   // [f, i]
  return {
    size: () => h.length,
    push(f, i) { h.push([f, i]); let k = h.length - 1; while (k) { const p = (k - 1) >> 1; if (h[p][0] <= h[k][0]) break; [h[p], h[k]] = [h[k], h[p]]; k = p; } },
    pop() { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === k) break; [h[m], h[k]] = [h[k], h[m]]; k = m; } } return top; },
  };
}

function flood(m, gw, gh, c) {
  const seen = new Uint8Array(m.length);
  const s0 = c.y * gw + c.x;
  if (!m[s0]) return seen;
  const q = [s0]; seen[s0] = 1;
  while (q.length) {
    const i = q.pop(), x = i % gw, y = (i / gw) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy, j = Y * gw + X;
      if (X >= 0 && Y >= 0 && X < gw && Y < gh && m[j] && !seen[j]) { seen[j] = 1; q.push(j); }
    }
  }
  return seen;
}

// 문 자리 위쪽 = 건물 몸통 (선생님 건물은 크고, 부스는 작게)
export function buildingBlocks(hall, booths) {
  const out = [];
  if (hall) out.push({ x: hall.x - 170, y: hall.y - 290, w: 340, h: 262 });
  for (const b of booths) out.push({ x: b.x - 80, y: b.y - 150, w: 160, h: 128 });
  return out;
}

export const makeWalk = (mask, gw, gh) => ({ mask, gw, gh });
export function walkable(walk, x, y) {
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  return cx >= 0 && cy >= 0 && cx < walk.gw && cy < walk.gh && !!walk.mask[cy * walk.gw + cx];
}

// 가장 가까운 길 위 점 (누른 곳이 풀밭이면 그 근처 길로)
export function nearestWalkable(walk, p) {
  if (walkable(walk, p.x, p.y)) return { ...p };
  const cx = Math.floor(p.x / CELL), cy = Math.floor(p.y / CELL);
  for (let r = 1; r < Math.max(walk.gw, walk.gh); r++) {
    let best = null, bd = Infinity;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const X = cx + dx, Y = cy + dy;
      if (X < 0 || Y < 0 || X >= walk.gw || Y >= walk.gh || !walk.mask[Y * walk.gw + X]) continue;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = { x: (X + 0.5) * CELL, y: (Y + 0.5) * CELL }; }
    }
    if (best) return best;
  }
  return { ...p };
}

// 길 위로만 움직이기: 막히면 x·y 따로 움직여 길 가장자리를 따라 미끄러져요
// (한 걸음 사이에 물·풀밭 칸을 스치거나, 비스듬히 모서리를 잘라 건너지 않게 선 전체를 확인)
export function moveOnPath(walk, from, dx, dy) {
  const ok = walkable(walk, from.x, from.y) ? (p) => lineClear(walk, from, p) : (p) => walkable(walk, p.x, p.y);
  const full = { x: from.x + dx, y: from.y + dy };
  if (ok(full)) return full;
  if (dx && ok({ x: from.x + dx, y: from.y })) return { x: from.x + dx, y: from.y };
  if (dy && ok({ x: from.x, y: from.y + dy })) return { x: from.x, y: from.y + dy };
  // 비스듬한 길: 45도 돌려서라도 앞으로
  const len = Math.hypot(dx, dy);
  for (const t of [Math.PI / 4, -Math.PI / 4]) {
    const c = Math.cos(t), s = Math.sin(t);
    const p = { x: from.x + (dx * c - dy * s) * 0.8, y: from.y + (dx * s + dy * c) * 0.8 };
    if (len && ok(p)) return p;
  }
  return { ...from };
}

// 길을 따라가는 경로 (8방향 A* + 줄이기). 결과: 월드 좌표 점 목록 (마지막 = 도착)
export function findPath(walk, from, to) {
  const { gw, gh, mask } = walk;
  const a = nearestWalkable(walk, from), b = nearestWalkable(walk, to);
  const s = Math.floor(a.y / CELL) * gw + Math.floor(a.x / CELL);
  const g = Math.floor(b.y / CELL) * gw + Math.floor(b.x / CELL);
  const head = a.x === from.x && a.y === from.y ? [] : [a];   // 길 밖에 서 있었으면 먼저 가까운 길로
  if (s === g) return [...head, b];
  const gx = g % gw, gy = (g / gw) | 0;
  const cost = new Float32Array(gw * gh).fill(Infinity), prev = new Int32Array(gw * gh).fill(-1);
  const heap = makeHeap();
  cost[s] = 0; heap.push(0, s);
  const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (heap.size()) {
    const [, i] = heap.pop();
    if (i === g) break;
    const x = i % gw, y = (i / gw) | 0;
    for (const [dx, dy, w] of D) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= gw || Y >= gh) continue;
      const j = Y * gw + X;
      if (!mask[j]) continue;
      if (dx && dy && (!mask[y * gw + X] || !mask[Y * gw + x])) continue;   // 모서리 자르지 않기
      const c = cost[i] + w;
      if (c < cost[j]) { cost[j] = c; prev[j] = i; heap.push(c + Math.hypot(X - gx, Y - gy), j); }
    }
  }
  if (prev[g] < 0) return null;
  const cells = [];
  for (let i = g; i !== s; i = prev[i]) cells.push(i);
  cells.reverse();
  const pts = cells.map((i) => ({ x: ((i % gw) + 0.5) * CELL, y: (((i / gw) | 0) + 0.5) * CELL }));
  pts[pts.length - 1] = b;
  // 곧게 보이는 구간은 건너뛰기 (지나는 칸이 하나도 빠짐없이 길인 범위에서만)
  const out = [...head];
  let cur = a;
  for (let k = 0; k < pts.length;) {
    let far = k;
    for (let j = pts.length - 1; j > k; j--) if (lineClear(walk, cur, pts[j])) { far = j; break; }
    out.push(pts[far]); cur = pts[far]; k = far + 1;
  }
  return out;
}

// p→q 곧은 선이 지나는 칸이 모두 길인가 (칸을 하나씩 정확히 따라가요. 점 몇 개만 찍어 보면 물 칸 모서리를 스쳐도 몰라요)
// 선이 칸 꼭짓점을 바로 지나가면 양옆 두 칸도 모두 길이어야 해요 (물 사이 틈으로 비스듬히 빠져나가지 않게)
export function lineClear(walk, p, q) {
  const { gw, gh, mask } = walk;
  const ok = (X, Y) => X >= 0 && Y >= 0 && X < gw && Y < gh && !!mask[Y * gw + X];
  let X = Math.floor(p.x / CELL), Y = Math.floor(p.y / CELL);
  const X1 = Math.floor(q.x / CELL), Y1 = Math.floor(q.y / CELL);
  if (!ok(X, Y)) return false;
  const dx = q.x - p.x, dy = q.y - p.y, sx = Math.sign(dx), sy = Math.sign(dy);
  const tdx = dx ? CELL / Math.abs(dx) : Infinity, tdy = dy ? CELL / Math.abs(dy) : Infinity;
  let tx = dx ? (sx > 0 ? (X + 1) * CELL - p.x : p.x - X * CELL) / Math.abs(dx) : Infinity;
  let ty = dy ? (sy > 0 ? (Y + 1) * CELL - p.y : p.y - Y * CELL) / Math.abs(dy) : Infinity;
  const steps = Math.abs(X1 - X) + Math.abs(Y1 - Y);
  for (let n = 0; n < steps && (X !== X1 || Y !== Y1); n++) {
    if (Math.abs(tx - ty) < 1e-9) {   // 꼭짓점을 지남
      if (!ok(X + sx, Y) || !ok(X, Y + sy)) return false;
      X += sx; Y += sy; tx += tdx; ty += tdy;
    } else if (tx < ty) { X += sx; tx += tdx; } else { Y += sy; ty += tdy; }
    if (!ok(X, Y)) return false;
  }
  return true;
}
