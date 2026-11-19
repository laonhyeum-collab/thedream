// 그림 지도 위 길 찾기(walkmask)와 캐릭터(avatar) 시험
import test from 'node:test';
import assert from 'node:assert/strict';
import { CELL, buildMask, finishMask, makeWalk, walkable, moveOnPath, findPath, nearestWalkable, isPathColor } from '../world/walkmask.js';
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
