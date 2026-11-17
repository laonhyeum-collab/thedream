import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SIZES, beatsOf, quantizeSize, clampLevel, clampBpm, buildSchedule, activeAt, chordFor, beatSeconds,
} from '../js/engine.js';

const it = (id, ing, row, col, size) => ({ id, ing, row, col, size });

test('크기 4단계 = 0.5 / 1 / 2 / 4박', () => {
  assert.deepEqual(SIZES.map((s) => s.beats), [0.5, 1, 2, 4]);
  assert.equal(beatsOf(1), 0.5);
  assert.equal(beatsOf(4), 4);
  assert.equal(beatsOf(99), 4, '범위를 넘으면 가장 큰 크기');
  assert.equal(clampLevel('abc'), 2, '이상한 값은 기본 크기(1박)');
});

test('자유롭게 바꾼 크기도 네 단계로 딱 맞춘다', () => {
  assert.equal(quantizeSize(0), 1);
  assert.equal(quantizeSize(0.3), 2);
  assert.equal(quantizeSize(0.6), 3);
  assert.equal(quantizeSize(0.99), 4);
  assert.equal(quantizeSize(1), 4);
  assert.equal(quantizeSize(-5), 1);
});

test('기획서 예시: 아래부터 순서대로, 같은 높이는 동시에', () => {
  // 1 얼음 2박 / 2 팥 1박 / 3 딸기 1박 + 망고 2박 / 4 아이스크림 1박
  const items = [
    it('d', 'icecream', 6, 1, 2),
    it('b', 'redbean', 1, 1, 2),
    it('c2', 'mango', 3, 2, 3),
    it('a', 'ice', 0, 1, 3),
    it('c1', 'strawberry', 3, 0, 2),
  ];
  const s = buildSchedule(items);
  assert.equal(s.groups.length, 4, '빈 줄은 건너뜀');
  assert.deepEqual(s.groups.map((g) => g.items.map((m) => m.ing)), [
    ['ice'], ['redbean'], ['strawberry', 'mango'], ['icecream'],
  ]);
  assert.deepEqual(s.groups.map((g) => g.start), [0, 2, 3, 5], '딸기·망고 줄은 가장 긴 2박만큼');
  assert.equal(s.totalBeats, 6);
  assert.deepEqual(s.groups.map((g) => g.order), [1, 2, 3, 4]);
});

test('위치를 바꾸면 연주 순서가 바뀐다', () => {
  const a = buildSchedule([it('x', 'ice', 0, 0, 2), it('y', 'redbean', 1, 0, 2)]);
  const b = buildSchedule([it('x', 'ice', 1, 0, 2), it('y', 'redbean', 0, 0, 2)]);
  assert.deepEqual(a.groups.map((g) => g.items[0].id), ['x', 'y']);
  assert.deepEqual(b.groups.map((g) => g.items[0].id), ['y', 'x']);
});

test('크기를 바꾸면 리듬(시작 시점)이 바뀐다', () => {
  const small = buildSchedule([it('x', 'ice', 0, 0, 1), it('y', 'redbean', 1, 0, 2)]);
  const big = buildSchedule([it('x', 'ice', 0, 0, 4), it('y', 'redbean', 1, 0, 2)]);
  assert.equal(small.groups[1].start, 0.5);
  assert.equal(big.groups[1].start, 4);
});

test('지금 연주 중인 재료 찾기 (짧은 재료는 먼저 끝남)', () => {
  const s = buildSchedule([
    it('a', 'ice', 0, 0, 3),
    it('b', 'strawberry', 1, 0, 2),
    it('c', 'mango', 1, 1, 3),
  ]);
  assert.deepEqual([...activeAt(s, 0).ids], ['a']);
  assert.deepEqual([...activeAt(s, 2.5).ids].sort(), ['b', 'c'], '같은 줄은 함께 시작');
  assert.deepEqual([...activeAt(s, 3.5).ids], ['c'], '1박 딸기는 끝나고 2박 망고만 남음');
  assert.equal(activeAt(s, 3.5).group.row, 1);
  assert.equal(activeAt(s, 4).group, null, '끝');
});

test('빈 컵은 연주할 것이 없다', () => {
  const s = buildSchedule([]);
  assert.equal(s.groups.length, 0);
  assert.equal(s.totalBeats, 0);
});

test('빠르기와 화음', () => {
  assert.equal(beatSeconds(100), 0.6);
  assert.equal(beatSeconds(120), 0.5);
  assert.equal(clampBpm(999), 160);
  assert.equal(clampBpm(10), 60);
  assert.equal(chordFor(0).name, 'C');
  assert.equal(chordFor(4).name, 'C', '네 줄마다 돌아옴');
});
