// [앱 월드] 그림 지도 위 「걸을 수 있는 길」: 지도 그림에서 크림색 돌길·모래를 찾아 칸(격자)으로 만들고,
// 캐릭터가 그 길 위로만 걷게 해요. 화면을 누르면 길을 따라 돌아가는 경로(A*)를 찾아요. (화면과 상관없는 순수 계산)
// 길을 거의 못 찾은 그림(직접 그린 지도 등)은 null → 예전처럼 어디든 걸어요.

export const CELL = 12;   // 월드 좌표 12px = 한 칸

// 크림색 돌길·계단·모래 해변 (잔디·물·나무·지붕은 아님)
export function isPathColor(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx < 170 || r < g - 6 || g < b) return false;      // 어둡거나, 초록·파랑 쪽
  const warm = r - b;
  if (warm < 18 || warm > 120) return false;              // 흰색(구름·벽)·주황 지붕 빼기
  return g - b >= 8 && (mx - mn) / mx < 0.5;               // 연한 노랑·베이지
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
  return erode(dilate(raw, gw, gh, 2), gw, gh, 2);
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

// 시작 자리에서 이어진 길만 남기고, 문 자리(선생님 건물·부스)가 길에서 떨어져 있으면 가장 가까운 길까지 좁은 길을 이어요.
// points: 월드 좌표 [{x, y}] (첫째 = 시작 자리), blocks: 건물 몸통 [{x, y, w, h}] (크림색 벽을 길로 잘못 보지 않게)
export function finishMask(mask, gw, gh, points, blocks = []) {
  const m = mask.slice();
  for (const b of blocks) {
    for (let Y = Math.max(0, Math.floor(b.y / CELL)); Y < Math.min(gh, Math.ceil((b.y + b.h) / CELL)); Y++)
      for (let X = Math.max(0, Math.floor(b.x / CELL)); X < Math.min(gw, Math.ceil((b.x + b.w) / CELL)); X++) m[Y * gw + X] = 0;
  }
  const cell = (p) => ({ x: Math.max(0, Math.min(gw - 1, Math.floor(p.x / CELL))), y: Math.max(0, Math.min(gh - 1, Math.floor(p.y / CELL))) });
  const disc = (c, r) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = c.x + dx, Y = c.y + dy; if (X >= 0 && Y >= 0 && X < gw && Y < gh && dx * dx + dy * dy <= r * r) m[Y * gw + X] = 1; } };
  const line = (a, b) => {
    const n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1);
    for (let i = 0; i <= n; i++) disc({ x: Math.round(a.x + ((b.x - a.x) * i) / n), y: Math.round(a.y + ((b.y - a.y) * i) / n) }, 1);
  };
  const cells = points.map(cell);
  for (const c of cells) disc(c, 2);   // 문 앞은 늘 설 수 있게
  // 시작에서 이어진 길 + 떨어진 길 조각(큰 조각·문이 있는 조각)을 가장 짧은 틈으로 하나씩 이어요 (다리·계단처럼 색이 다른 곳)
  const doorAt = new Set(cells.map((c) => c.y * gw + c.x));
  let reach = flood(m, gw, gh, cells[0]);
  for (let round = 0; round < 60; round++) {
    const comp = new Int32Array(m.length).fill(-1), size = [], hasDoor = [];
    for (let i = 0; i < m.length; i++) {
      if (!m[i] || reach[i] || comp[i] >= 0) continue;
      const id = size.length, q = [i]; comp[i] = id; let n = 0, d = false;
      while (q.length) {
        const j = q.pop(); n++; if (doorAt.has(j)) d = true;
        const x = j % gw, y = (j / gw) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const X = x + dx, Y = y + dy, k = Y * gw + X;
          if (X >= 0 && Y >= 0 && X < gw && Y < gh && m[k] && !reach[k] && comp[k] < 0) { comp[k] = id; q.push(k); }
        }
      }
      size.push(n); hasDoor.push(d);
    }
    const want = (id) => id >= 0 && (hasDoor[id] || size[id] >= 25);
    if (!size.some((_, id) => want(id))) break;
    // 이어진 길에서 모든 칸까지의 거리 (가장 가까운 이어진 칸도 기억)
    const dist = new Int32Array(m.length).fill(-1), src = new Int32Array(m.length);
    const q = [];
    for (let i = 0; i < m.length; i++) if (reach[i]) { dist[i] = 0; src[i] = i; q.push(i); }
    if (!q.length) break;
    let best = -1;
    for (let h = 0; h < q.length; h++) {
      const j = q[h];
      if (want(comp[j])) { best = j; break; }
      const x = j % gw, y = (j / gw) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy, k = Y * gw + X;
        if (X >= 0 && Y >= 0 && X < gw && Y < gh && dist[k] < 0) { dist[k] = dist[j] + 1; src[k] = src[j]; q.push(k); }
      }
    }
    if (best < 0) break;
    line({ x: best % gw, y: (best / gw) | 0 }, { x: src[best] % gw, y: (src[best] / gw) | 0 });
    reach = flood(m, gw, gh, cells[0]);
  }
  for (let i = 0; i < m.length; i++) m[i] = reach[i];
  return m;
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
export function moveOnPath(walk, from, dx, dy) {
  const ok = (p) => walkable(walk, p.x, p.y);
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
  if (s === g) return [b];
  const gx = g % gw, gy = (g / gw) | 0;
  const cost = new Float32Array(gw * gh).fill(Infinity), prev = new Int32Array(gw * gh).fill(-1);
  const heap = [];   // [f, i]
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  cost[s] = 0; push(0, s);
  const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (heap.length) {
    const [, i] = pop();
    if (i === g) break;
    const x = i % gw, y = (i / gw) | 0;
    for (const [dx, dy, w] of D) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= gw || Y >= gh) continue;
      const j = Y * gw + X;
      if (!mask[j]) continue;
      if (dx && dy && (!mask[y * gw + X] || !mask[Y * gw + x])) continue;   // 모서리 자르지 않기
      const c = cost[i] + w;
      if (c < cost[j]) { cost[j] = c; prev[j] = i; push(c + Math.hypot(X - gx, Y - gy), j); }
    }
  }
  if (prev[g] < 0) return null;
  const cells = [];
  for (let i = g; i !== s; i = prev[i]) cells.push(i);
  cells.reverse();
  const pts = cells.map((i) => ({ x: ((i % gw) + 0.5) * CELL, y: (((i / gw) | 0) + 0.5) * CELL }));
  pts[pts.length - 1] = b;
  // 곧게 보이는 구간은 건너뛰기 (길 밖으로 나가지 않는 범위에서)
  const out = [];
  let cur = a;
  for (let k = 0; k < pts.length;) {
    let far = k;
    for (let j = pts.length - 1; j > k; j--) if (clear(walk, cur, pts[j])) { far = j; break; }
    out.push(pts[far]); cur = pts[far]; k = far + 1;
  }
  return out;
}

function clear(walk, p, q) {
  const n = Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / (CELL / 3));
  for (let i = 1; i <= n; i++) if (!walkable(walk, p.x + ((q.x - p.x) * i) / n, p.y + ((q.y - p.y) * i) / n)) return false;
  return true;
}
