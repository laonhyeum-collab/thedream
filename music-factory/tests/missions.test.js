import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS, getMission, checkMission } from '../js/missions.js';
import { getTheme } from '../js/themes.js';

const theme = getTheme('bingsu');
const it = (ing, row, col, size = 2) => ({ id: `${ing}${row}${col}`, ing, row, col, size });
const ok = (id, items) => checkMission(getMission(id), theme, items);

test('미션 목록이 있다', () => {
  assert.ok(MISSIONS.length >= 5);
  for (const m of MISSIONS) assert.equal(ok(m.id, []), false, `${m.id}: 빈 컵은 실패`);
});

test('드럼 3번', () => {
  assert.equal(ok('drum3', [it('ice', 0, 0), it('ice', 1, 0)]), false);
  assert.equal(ok('drum3', [it('ice', 0, 0), it('ice', 1, 0), it('ice', 2, 0)]), true);
});

test('두 악기 동시 연주', () => {
  assert.equal(ok('together', [it('ice', 0, 0), it('redbean', 1, 0)]), false, '다른 줄');
  assert.equal(ok('together', [it('ice', 0, 0), it('ice', 0, 1)]), false, '같은 악기');
  assert.equal(ok('together', [it('strawberry', 0, 0), it('chocolate', 0, 1)]), false, '딸기·초콜릿은 둘 다 기타');
  assert.equal(ok('together', [it('ice', 0, 0), it('redbean', 0, 2)]), true);
});

test('4박과 1박', () => {
  assert.equal(ok('long-short', [it('ice', 0, 0, 4)]), false);
  assert.equal(ok('long-short', [it('ice', 0, 0, 4), it('mango', 1, 0, 2)]), true);
});

test('같은 재료 다른 크기', () => {
  assert.equal(ok('same-ing', [it('ice', 0, 0, 2), it('ice', 1, 0, 2)]), false);
  assert.equal(ok('same-ing', [it('ice', 0, 0, 2), it('ice', 1, 0, 3)]), true);
});

test('악기 4가지', () => {
  const three = [it('ice', 0, 0), it('redbean', 1, 0), it('strawberry', 2, 0), it('chocolate', 3, 0)];
  assert.equal(ok('band4', three), false, '딸기·초콜릿은 같은 기타라 3가지');
  assert.equal(ok('band4', [...three, it('mango', 4, 0)]), true);
});

test('딱 8박', () => {
  assert.equal(ok('two-bars', [it('ice', 0, 0, 4), it('mango', 1, 0, 4)]), true);
  assert.equal(ok('two-bars', [it('ice', 0, 0, 4), it('mango', 1, 0, 3)]), false);
  assert.equal(ok('two-bars', [it('ice', 0, 0, 4), it('mango', 0, 1, 4)]), false, '같은 줄은 겹쳐서 4박');
});

test('높은 탑', () => {
  const six = [0, 1, 2, 3, 4, 5].map((r) => it('ice', r, 0));
  assert.equal(ok('tower', six), false);
  assert.equal(ok('tower', [...six, it('mango', 0, 1), it('mango', 3, 1)]), true);
});
