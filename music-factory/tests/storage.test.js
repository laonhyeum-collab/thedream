import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as store from '../js/storage.js';
import { getTheme } from '../js/themes.js';

function memory() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

const items = [
  { id: 'a', ing: 'ice', row: 0, col: 1, size: 3 },
  { id: 'b', ing: 'mango', row: 2, col: 0, size: 4 },
  { id: 'c', ing: 'strawberry', row: 2, col: 2, size: 1 },
];

test('저장하고 불러오면 배치가 그대로', () => {
  const s = memory();
  const saved = store.saveWork({ id: 'w1', title: '첫 노래', theme: 'bingsu', bpm: 120, loop: true, items }, s);
  assert.ok(saved);
  const back = store.getWork('w1', s);
  assert.equal(back.title, '첫 노래');
  assert.equal(back.bpm, 120);
  assert.equal(back.loop, true);
  assert.deepEqual(back.items, items);
  assert.ok(back.createdAt > 0);
});

test('같은 작품을 다시 저장하면 고쳐 쓰고, 지우면 사라진다', () => {
  const s = memory();
  store.saveWork({ id: 'w1', title: 'A', theme: 'bingsu', items }, s);
  store.saveWork({ id: 'w2', title: 'B', theme: 'bingsu', items }, s);
  store.saveWork({ id: 'w1', title: 'A2', theme: 'bingsu', items: items.slice(0, 1) }, s);
  const list = store.loadWorks(s);
  assert.equal(list.length, 2);
  assert.equal(store.getWork('w1', s).title, 'A2');
  assert.equal(store.getWork('w1', s).items.length, 1);
  store.deleteWork('w2', s);
  assert.equal(store.loadWorks(s).length, 1);
});

test('망가진 저장 내용도 안전하게 정리한다', () => {
  const theme = getTheme('bingsu');
  const clean = store.normalizeItems([
    { ing: 'ice', row: 0, col: 0, size: 2 },
    { ing: 'ice', row: 0, col: 0, size: 3 }, // 같은 칸 중복
    { ing: 'pizza', row: 1, col: 0, size: 2 }, // 없는 재료
    { ing: 'mango', row: 99, col: 0, size: 2 }, // 컵 밖
    { ing: 'banana', row: '3', col: '2', size: 9 }, // 글자 숫자, 큰 크기
    null,
  ], theme);
  assert.equal(clean.length, 2);
  assert.deepEqual(clean[1], { id: clean[1].id, ing: 'banana', row: 3, col: 2, size: 4 });

  const s = memory();
  s.setItem('musicPlayFactory.works.v1', '{망가짐');
  assert.deepEqual(store.loadWorks(s), []);
});

test('미션 성공 기록', () => {
  const s = memory();
  store.markMissionDone('drum3', s);
  store.markMissionDone('drum3', s);
  assert.deepEqual([...store.loadMissionDone(s)], ['drum3']);
});

test('재료별 악기 선택도 저장된다', () => {
  const s = memory();
  store.saveWork({ id: 'w1', title: '악기 바꾼 노래', theme: 'bingsu', items, voices: { ice: 'cymbal', mango: 'keysBright' } }, s);
  assert.deepEqual(store.getWork('w1', s).voices, { ice: 'cymbal' }, '기본과 같은 망고는 빼고 저장');
  store.saveWork({ id: 'w2', title: '예전 작품', theme: 'bingsu', items }, s);
  assert.deepEqual(store.getWork('w2', s).voices, {}, '예전 작품은 기본 악기');
});
