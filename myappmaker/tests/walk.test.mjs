// 그림 지도 위 길 찾기(walkmask)와 캐릭터(avatar) 시험
import test from 'node:test';
import assert from 'node:assert/strict';
import { CELL, buildMask, finishMask, makeWalk, walkable, moveOnPath, findPath, nearestWalkable, isPathColor, isWaterColor, groundCost, waterCells, landMask, lineClear, WATER } from '../world/walkmask.js';
import { avatarPixels, cleanAvatar, AVATAR_W, AVATAR_H, AVATAR_OPTIONS, shade } from '../shared/avatar.js';

// ㄷ자 길: 왼쪽 세로 → 아래 가로 → 오른쪽 세로. 가운데는 풀밭 (곧게 가면 풀밭을 가로지름)
function uMap(gw = 40, gh = 30, sub = 3) {
  const W = gw * sub, H = gh * sub, px = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const cx = Math.floor(x / sub), cy = Math.floor(y / sub);
    const road = (cx >= 3 && cx <= 7 && cy >= 3) || (cy >= 22 && cy <= 26) || (cx >= 32 && cx <= 36 && cy >= 3);
    const i = (y * W + x) * 4;
    const c = road ? [236, 214, 170] : [110, 190, 70];   // 크림색 돌길 / 잔디
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
  }
  return { px, gw, gh, sub };
}

test('길 색: 크림색 돌길은 길, 잔디·물·흰 벽은 길이 아님', () => {
  assert.equal(isPathColor(236, 214, 170), true);
  assert.equal(isPathColor(110, 190, 70), false);
  assert.equal(isPathColor(60, 150, 230), false);
  assert.equal(isPathColor(250, 250, 250), false);
});

test('길 찾기: 가운데 풀밭을 가로지르지 않고 ㄷ자 길을 따라 돌아감', () => {
  const { px, gw, gh, sub } = uMap();
  const a = { x: 5 * CELL, y: 5 * CELL }, b = { x: 34 * CELL, y: 5 * CELL };
  const walk = makeWalk(finishMask(buildMask(px, gw, gh, sub), gw, gh, [a, b]), gw, gh);
  assert.equal(walkable(walk, a.x, a.y), true);
  assert.equal(walkable(walk, 20 * CELL, 10 * CELL), false, '가운데 풀밭');
  const path = findPath(walk, a, b);
  assert.ok(path && path.length >= 2, '꺾이는 경로');
  assert.ok(Math.max(...path.map((p) => p.y)) > 20 * CELL, '아래 가로 길로 내려감');
  let prev = a;
  for (const p of path) {
    for (let k = 0; k <= 30; k++) assert.equal(walkable(walk, prev.x + ((p.x - prev.x) * k) / 30, prev.y + ((p.y - prev.y) * k) / 30), true, '경로가 모두 길 위');
    prev = p;
  }
});

test('방향키 걷기: 풀밭 쪽으로는 못 가고 길 가장자리를 따라 미끄러짐', () => {
  const { px, gw, gh, sub } = uMap();
  const a = { x: 5 * CELL, y: 10 * CELL };
  const walk = makeWalk(finishMask(buildMask(px, gw, gh, sub), gw, gh, [a]), gw, gh);
  let p = { ...a };
  for (let i = 0; i < 200; i++) p = moveOnPath(walk, p, 4, 0);   // 오른쪽(풀밭)으로 계속
  assert.equal(walkable(walk, p.x, p.y), true);
  assert.ok(p.x < 9 * CELL, '길 밖으로 안 나감');
  p = { ...a };
  for (let i = 0; i < 200; i++) p = moveOnPath(walk, p, 3, 3);    // 비스듬히 → 길을 따라 아래로
  assert.ok(p.y > 20 * CELL, '비스듬히 눌러도 길을 따라 내려감');
  assert.deepEqual(nearestWalkable(walk, { x: 20 * CELL, y: 10 * CELL }).x < 9 * CELL || nearestWalkable(walk, { x: 20 * CELL, y: 10 * CELL }).x > 31 * CELL || nearestWalkable(walk, { x: 20 * CELL, y: 10 * CELL }).y > 21 * CELL, true, '풀밭을 누르면 가까운 길로');
});

test('떨어진 문 자리도 시작 자리와 이어짐', () => {
  const { px, gw, gh, sub } = uMap();
  const start = { x: 5 * CELL, y: 25 * CELL }, door = { x: 20 * CELL, y: 12 * CELL };   // 풀밭 한가운데 문
  const walk = makeWalk(finishMask(buildMask(px, gw, gh, sub), gw, gh, [start, door]), gw, gh);
  assert.ok(findPath(walk, start, door), '이어지는 길이 생김');
});

// ---------- 계곡·연못 가로지르기 (검수팀 재현) ----------
const ROAD = [236, 214, 170], GRASS = [110, 190, 70], WATERC = [40, 150, 230], WOOD = [150, 95, 50], ROCK = [120, 110, 105];
// kind(cx, cy) → 색. 칸 하나 = sub×sub 픽셀
function paint(gw, gh, kind, sub = 3) {
  const W = gw * sub, px = new Uint8ClampedArray(W * gh * sub * 4);
  for (let y = 0; y < gh * sub; y++) for (let x = 0; x < W; x++) {
    const c = kind(Math.floor(x / sub), Math.floor(y / sub)), i = (y * W + x) * 4;
    px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
  }
  return { px, gw, gh, sub };
}
// 선을 칸 단위로 정확히 따라가며 지나는 칸이 모두 good 인지 (꼭짓점을 지나면 양옆 칸도) — 시험 쪽 독립 확인
function segOk(gw, gh, good, p, q) {
  const ok = (X, Y) => X >= 0 && Y >= 0 && X < gw && Y < gh && good(X, Y);
  let X = Math.floor(p.x / CELL), Y = Math.floor(p.y / CELL);
  const X1 = Math.floor(q.x / CELL), Y1 = Math.floor(q.y / CELL);
  if (!ok(X, Y)) return false;
  const dx = q.x - p.x, dy = q.y - p.y, sx = Math.sign(dx), sy = Math.sign(dy);
  let tx = dx ? (sx > 0 ? (X + 1) * CELL - p.x : p.x - X * CELL) / Math.abs(dx) : Infinity;
  let ty = dy ? (sy > 0 ? (Y + 1) * CELL - p.y : p.y - Y * CELL) / Math.abs(dy) : Infinity;
  const tdx = dx ? CELL / Math.abs(dx) : Infinity, tdy = dy ? CELL / Math.abs(dy) : Infinity;
  for (let n = 0; n < Math.abs(X1 - X) + Math.abs(Y1 - Y) + 2 && (X !== X1 || Y !== Y1); n++) {
    if (Math.abs(tx - ty) < 1e-9) { if (!ok(X + sx, Y) || !ok(X, Y + sy)) return false; X += sx; Y += sy; tx += tdx; ty += tdy; }
    else if (tx < ty) { X += sx; tx += tdx; } else { Y += sy; ty += tdy; }
    if (!ok(X, Y)) return false;
  }
  return true;
}
function routeOk(walk, good, from, path) {
  let prev = from;
  for (const p of path) { if (!segOk(walk.gw, walk.gh, good, prev, p)) return false; prev = p; }
  return true;
}

test('물 색: 바다·연못은 물, 눈 그림자·보라 지붕·크림 길은 물이 아님', () => {
  assert.equal(isWaterColor(40, 150, 230), true);
  assert.equal(isWaterColor(110, 186, 250), true, '물가의 밝은 물');
  assert.equal(isWaterColor(190, 222, 250), false, '눈 그림자');
  assert.equal(isWaterColor(150, 100, 220), false, '보라 지붕');
  assert.equal(isWaterColor(236, 214, 170), false);
});

test('좁은 개울: 길 두 줄 사이 물은 닫기(구멍 메우기)로 메워지지 않고, 다리로만 건넘', () => {
  // 위 길(5~9줄) · 개울(10~12줄) · 아래 길(13~17줄). 개울 위 다리는 오른쪽 끝(34~36칸, 나무색)
  const { px, gw, gh, sub } = paint(40, 24, (x, y) => {
    if (y >= 10 && y <= 12) return x >= 34 && x <= 36 ? WOOD : WATERC;
    if ((y >= 5 && y <= 9) || (y >= 13 && y <= 17)) return x >= 2 && x <= 37 ? ROAD : GRASS;
    return GRASS;
  });
  const a = { x: 5 * CELL, y: 7 * CELL }, b = { x: 5 * CELL, y: 15 * CELL };
  const ground = groundCost(px, gw, gh, sub);
  const walk = makeWalk(finishMask(buildMask(px, gw, gh, sub), gw, gh, [a, b], [], ground), gw, gh);
  for (let x = 0; x < 34; x++) assert.equal(walkable(walk, (x + 0.5) * CELL, 11.5 * CELL), false, `개울 칸 ${x}`);
  const path = findPath(walk, a, b);
  assert.ok(path, '다리로 이어짐');
  assert.ok(Math.max(...path.map((p) => p.x)) > 33 * CELL, '오른쪽 다리까지 돌아감');
  const dry = (X, Y) => ground[Y * gw + X] < WATER && walk.mask[Y * gw + X];
  assert.ok(routeOk(walk, dry, a, path), '경로가 물 칸을 한 번도 지나지 않음');
});

test('떨어진 길 조각 잇기: 연못을 곧게 가로지르지 않고 다리(땅)로 돌아서 이음', () => {
  // 왼쪽 길 섬 · 가운데 연못(12~27칸) · 오른쪽 길 섬(문). 연못 위아래로 돌아가는 땅은 아래쪽(24~26줄) 나무다리뿐
  const { px, gw, gh, sub } = paint(40, 30, (x, y) => {
    if (x >= 12 && x <= 27) return y >= 24 && y <= 26 ? WOOD : WATERC;
    if (y >= 8 && y <= 12 && ((x >= 2 && x <= 11) || (x >= 28 && x <= 37))) return ROAD;
    return y < 3 ? WATERC : GRASS;
  });
  const start = { x: 5 * CELL, y: 10 * CELL }, door = { x: 34 * CELL, y: 10 * CELL };
  const ground = groundCost(px, gw, gh, sub);
  const walk = makeWalk(finishMask(buildMask(px, gw, gh, sub), gw, gh, [start, door], [], ground), gw, gh);
  for (let i = 0; i < walk.mask.length; i++) assert.ok(!(walk.mask[i] && ground[i] >= WATER), `물 칸 ${i % gw},${(i / gw) | 0} 이 길이 됨`);
  const path = findPath(walk, start, door);
  assert.ok(path, '문까지 이어짐');
  assert.ok(Math.max(...path.map((p) => p.y)) > 23 * CELL, '아래 다리로 돌아감');
});

test('비스듬히 모서리 자르기 금지: 물 두 칸 사이 꼭짓점으로 빠져나가지 않음', () => {
  // 길 칸 (1,1) 과 (2,2) 만 꼭짓점으로 맞닿고, (2,1)·(1,2) 는 물
  const gw = 4, gh = 4, mask = new Uint8Array(gw * gh);
  mask[1 * gw + 1] = 1; mask[2 * gw + 2] = 1;
  const walk = makeWalk(mask, gw, gh);
  const from = { x: 2 * CELL - 1, y: 2 * CELL - 1 };
  const to = moveOnPath(walk, from, 2, 2);
  assert.deepEqual(to, from, '꼭짓점을 넘어 건너편 칸으로 가지 않음');
  assert.equal(lineClear(walk, { x: 1.5 * CELL, y: 1.5 * CELL }, { x: 2.5 * CELL, y: 2.5 * CELL }), false);
  // 양옆이 길이면 비스듬히 지나가도 됨
  mask[1 * gw + 2] = 1; mask[2 * gw + 1] = 1;
  assert.notDeepEqual(moveOnPath(walk, from, 2, 2), from);
});

test('경로 줄이기: 곧게 이은 구간이 물 칸 모서리를 조금이라도 스치지 않음 (여러 연못 지도)', () => {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let map = 0; map < 6; map++) {
    const ponds = Array.from({ length: 7 }, () => ({ x: 4 + rnd() * 52, y: 4 + rnd() * 32, r: 1.5 + rnd() * 4 }));
    const { px, gw, gh, sub } = paint(60, 40, (x, y) => (ponds.some((p) => (x - p.x) ** 2 + (y - p.y) ** 2 < p.r * p.r) ? WATERC : ROAD));
    const ground = groundCost(px, gw, gh, sub);
    let s0 = 0; while (ground[s0] >= WATER) s0++;
    const start = { x: ((s0 % gw) + 0.5) * CELL, y: (((s0 / gw) | 0) + 0.5) * CELL };
    const walk = makeWalk(finishMask(buildMask(px, gw, gh, sub), gw, gh, [start], [], ground), gw, gh);
    const good = (X, Y) => !!walk.mask[Y * gw + X] && ground[Y * gw + X] < WATER;
    for (let t = 0; t < 40; t++) {
      const from = nearestWalkable(walk, { x: rnd() * gw * CELL, y: rnd() * gh * CELL });
      const to = { x: rnd() * gw * CELL, y: rnd() * gh * CELL };   // 연못 위를 눌러도
      const path = findPath(walk, from, to);
      if (!path) continue;
      assert.ok(routeOk(walk, good, from, path), `지도 ${map} 경로 ${t}: 물 칸을 스침`);
      let p = { ...from };   // 방향키로 걸어도 물 칸을 스치지 않음
      for (let k = 0; k < 60; k++) { const q = moveOnPath(walk, p, (to.x - p.x) / 20, (to.y - p.y) / 20); assert.ok(segOk(gw, gh, good, p, q), `지도 ${map} 방향키 ${t}`); p = q; }
    }
  }
});

test('길을 거의 못 찾은 그림(직접 그린 지도): 어디든 걷되 물은 빼고, 문은 땅으로 이어짐', () => {
  const { px, gw, gh, sub } = paint(30, 20, (x, y) => ((x - 15) ** 2 + (y - 10) ** 2 < 25 ? WATERC : x >= 27 ? ROCK : GRASS));
  const ground = groundCost(px, gw, gh, sub), water = waterCells(px, gw, gh, sub);
  const a = { x: 3 * CELL, y: 10 * CELL }, b = { x: 26 * CELL, y: 10 * CELL };
  const walk = makeWalk(finishMask(landMask(water), gw, gh, [a, b], [], ground), gw, gh);
  assert.equal(walkable(walk, 15 * CELL, 10 * CELL), false, '가운데 연못');
  assert.equal(walkable(walk, 3 * CELL, 3 * CELL), true, '풀밭은 걸을 수 있음');
  const path = findPath(walk, a, b);
  assert.ok(path && routeOk(walk, (X, Y) => !water[Y * gw + X] && !!walk.mask[Y * gw + X], a, path), '연못을 돌아감');
});

test('길 밖에 서 있다가 누르면: 먼저 가까운 길 위 점으로', () => {
  const { px, gw, gh, sub } = uMap();
  const a = { x: 5 * CELL, y: 5 * CELL };
  const walk = makeWalk(finishMask(buildMask(px, gw, gh, sub), gw, gh, [a]), gw, gh);
  const off = { x: 12 * CELL, y: 10 * CELL };   // 풀밭
  const path = findPath(walk, off, { x: 5 * CELL, y: 25 * CELL });
  assert.deepEqual(path[0], nearestWalkable(walk, off));
});

test('캐릭터: 성별 선택(예전 저장값은 남자아이로), 크기 18×21, 여자아이는 치마', () => {
  assert.deepEqual(AVATAR_OPTIONS.gender, ['남자아이', '여자아이']);
  assert.equal(cleanAvatar({ skin: 1, hair: 2 }).gender, 0, '예전 캐릭터도 그대로 열림');
  const boy = avatarPixels({ gender: 0, bottom: 0 }), girl = avatarPixels({ gender: 1, bottom: 0 });
  assert.equal(boy.length, AVATAR_H); assert.equal(boy[0].length, AVATAR_W);
  const skirtRow = 16;   // 치마 아랫단이 넓게 퍼짐
  const count = (g) => g[skirtRow].filter((c) => c && c.toLowerCase().startsWith('#1') ).length;
  assert.ok(count(girl) > count(boy), '여자아이 치마가 더 넓음');
  assert.notDeepEqual(avatarPixels({ gender: 0 }, 0), avatarPixels({ gender: 0 }, 1), '걷는 모습');
  assert.equal(shade('#808080', -0.5), '#404040');
});
