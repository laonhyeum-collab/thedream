import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGES, STAGE_THEME, getStage, checkStage, isStageUnlocked, currentStage, allStagesCleared, normalizeCleared,
} from '../js/levels.js';
import { getTheme } from '../js/themes.js';
import { loadLevelCleared, markLevelCleared } from '../js/storage.js';

const theme = getTheme(STAGE_THEME);
const it = (ing, row, col, size = 2) => ({ id: `${ing}${row}${col}`, ing, row, col, size });
const ok = (level, items, voices) => checkStage(getStage(level), theme, items, voices);

function memoryStore() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test('단계는 5개, 1단계부터 차례로', () => {
  assert.equal(STAGES.length, 5);
  STAGES.forEach((s, i) => {
    assert.equal(s.level, i + 1);
    assert.ok(s.title && s.goal && s.hint);
    assert.equal(ok(s.level, []), false, `${s.level}단계: 빈 컵은 실패`);
  });
});

test('1단계: 드럼 하나로 일정한 박', () => {
  const four = [0, 1, 2, 3].map((r) => it('ice', r, 0, 2));
  assert.equal(ok(1, four), true);
  assert.equal(ok(1, four.slice(0, 3)), false, '3층은 부족');
  assert.equal(ok(1, [...four.slice(0, 3), it('ice', 3, 0, 4)]), false, '크기가 다르면 일정하지 않아요');
  assert.equal(ok(1, [...four, it('redbean', 4, 0, 2)]), false, '다른 악기가 섞이면 안 돼요');
  assert.equal(ok(1, [it('ice', 0, 0), it('ice', 0, 1), it('ice', 1, 0), it('ice', 1, 1)]), false, '4층이어야 해요');
  // 악기를 드럼으로 바꾼 재료도 드럼이에요
  assert.equal(ok(1, [...four.slice(0, 3), it('mango', 3, 0, 2)], { mango: 'drum' }), true);
});

test('2단계: 드럼과 베이스가 같은 층에서 두 번', () => {
  const one = [it('ice', 0, 0), it('redbean', 0, 1)];
  assert.equal(ok(2, one), false);
  assert.equal(ok(2, [...one, it('ice', 1, 0), it('redbean', 2, 0)]), false, '다른 층이면 함께가 아니에요');
  assert.equal(ok(2, [...one, it('ice', 1, 0), it('redbean', 1, 2)]), true);
});

test('3단계: 짧고 긴 소리로 꼭 8박', () => {
  // 4박 + 2박 + 1박 + ½박 + ½박 = 8박
  const items = [it('ice', 0, 0, 4), it('redbean', 1, 0, 3), it('mango', 2, 0, 2), it('tteok', 3, 0, 1), it('tteok', 4, 0, 1)];
  assert.equal(ok(3, items), true);
  assert.equal(ok(3, items.slice(0, 4)), false, '7.5박');
  assert.equal(ok(3, [it('ice', 0, 0, 4), it('ice', 1, 0, 4)]), false, '긴 소리만, 2층');
  assert.equal(ok(3, [0, 1, 2, 3, 4, 5, 6, 7].map((r) => it('ice', r, 0, 2))), false, '짧은 소리만');
});

test('4단계: 베이스 + 멜로디 화음, 그리고 박자', () => {
  const harmony = [it('redbean', 0, 0), it('mango', 0, 1)];
  assert.equal(ok(4, harmony), false, '박자 악기가 없어요');
  assert.equal(ok(4, [...harmony, it('ice', 1, 0)]), true);
  assert.equal(ok(4, [it('redbean', 0, 0), it('mango', 1, 0), it('ice', 2, 0)]), false, '같은 층이 아니에요');
  assert.equal(ok(4, [it('redbean', 0, 0), it('strawberry', 0, 1), it('tteok', 1, 0)]), true, '기타 + 스네어도 좋아요');
});

test('5단계: 편곡 완성 (리듬·베이스·멜로디, 4층, 맨 위 마무리)', () => {
  const base = [it('ice', 0, 0), it('redbean', 0, 1), it('mango', 1, 0), it('tteok', 2, 0)];
  assert.equal(ok(5, [...base, it('cereal', 3, 0)]), true);
  assert.equal(ok(5, [...base, it('icecream', 3, 1)]), true);
  assert.equal(ok(5, [...base, it('cereal', 2, 1)]), false, '4층이 안 돼요');
  assert.equal(ok(5, [...base, it('cereal', 3, 0), it('ice', 4, 0)]), false, '맨 위층이 마무리 악기가 아니에요');
  assert.equal(ok(5, [it('ice', 0, 0), it('mango', 1, 0), it('tteok', 2, 0), it('cereal', 3, 0)]), false, '베이스가 없어요');
});

test('단계 열림: 앞 단계를 통과해야 다음 단계', () => {
  const none = new Set();
  assert.equal(isStageUnlocked(1, none), true);
  assert.equal(isStageUnlocked(2, none), false);
  assert.equal(currentStage(none).level, 1);
  const two = new Set([1, 2]);
  assert.equal(isStageUnlocked(3, two), true);
  assert.equal(isStageUnlocked(4, two), false);
  assert.equal(currentStage(two).level, 3);
  assert.equal(allStagesCleared(two), false);
  const all = new Set([1, 2, 3, 4, 5]);
  assert.equal(allStagesCleared(all), true);
  assert.equal(currentStage(all), null);
  assert.equal(isStageUnlocked(6, all), false);
  assert.equal(isStageUnlocked(0, all), false);
});

test('저장된 기록 정리: 건너뛴 단계와 이상한 값은 버려요', () => {
  assert.deepEqual([...normalizeCleared([1, 2, 4, 5])], [1, 2]);
  assert.deepEqual([...normalizeCleared(['1', 2, 99, 'x', null])], [1, 2]);
  assert.deepEqual([...normalizeCleared('망가짐')], []);
});

test('단계 기록 저장·불러오기', () => {
  const s = memoryStore();
  assert.equal(loadLevelCleared(s).size, 0);
  markLevelCleared(1, s);
  markLevelCleared(2, s);
  assert.deepEqual([...loadLevelCleared(s)], [1, 2]);
  markLevelCleared(4, s); // 3단계 없이 4단계는 인정하지 않아요
  assert.deepEqual([...loadLevelCleared(s)], [1, 2]);
  for (const n of [3, 4, 5]) markLevelCleared(n, s);
  assert.equal(allStagesCleared(loadLevelCleared(s)), true);
  s.setItem('musicPlayFactory.levels.v1', '{망가진');
  assert.equal(loadLevelCleared(s).size, 0, '망가진 값이어도 멈추지 않아요');
  const broken = { getItem() { throw new Error('막힘'); }, setItem() { throw new Error('막힘'); } };
  assert.equal(loadLevelCleared(broken).size, 0);
  assert.doesNotThrow(() => markLevelCleared(1, broken));
});
