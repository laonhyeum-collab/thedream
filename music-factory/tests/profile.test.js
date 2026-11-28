import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// 진짜 localStorage 처럼 key()/length 가 있는 저장소
function memory() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    m,
  };
}
const ls = memory();
globalThis.localStorage = ls;

const profile = await import('../js/profile.js');
const store = await import('../js/storage.js');

beforeEach(() => { ls.m.clear(); profile._reset(); });

test('처음부터 하기: 이 기기에 아무것도 남지 않는다', () => {
  profile.startGuest();
  store.markLevelCleared(1);
  assert.deepEqual([...store.loadLevelCleared()], [1]);
  assert.equal(ls.m.size, 0);
  profile.startGuest(); // 다음 친구가 처음부터 하기
  assert.deepEqual([...store.loadLevelCleared()], []);
});

test('이름으로 하면 그 이름으로만 저장하고 이어서 할 수 있다', () => {
  profile.startNamed('별빛토끼');
  store.markLevelCleared(1);
  store.markLevelCleared(2);
  profile.startNamed('구름');
  assert.deepEqual([...store.loadLevelCleared()], [], '다른 친구는 처음부터');
  profile.startGuest();
  assert.deepEqual([...store.loadLevelCleared()], [], '처음부터 하기도 처음부터');
  profile.startNamed('별빛토끼');
  assert.deepEqual([...store.loadLevelCleared()], [1, 2], '같은 이름은 이어서');
  assert.equal(profile.listPlayers()[0].name, '별빛토끼');
  assert.ok(profile.hasPlayer('별빛토끼'));
});

test('처음부터 다시: 같은 이름의 예전 기록을 지운다', () => {
  profile.startNamed('하늘');
  store.markLevelCleared(1);
  profile.startNamed('하늘', { fresh: true });
  assert.deepEqual([...store.loadLevelCleared()], []);
});

test('기록 지우기는 그 이름 것만 지운다', () => {
  profile.startNamed('가');
  store.markLevelCleared(1);
  profile.startNamed('나');
  store.markComboDone('c1');
  profile.forgetPlayer('가');
  assert.ok(!profile.hasPlayer('가'));
  assert.ok(profile.hasPlayer('나'));
  assert.deepEqual([...store.loadComboDone()], ['c1'], '나 기록은 그대로');
  profile.startNamed('가');
  assert.deepEqual([...store.loadLevelCleared()], []);
});

test('이름은 빈칸·위험한 글자를 빼고 12자까지', () => {
  assert.equal(profile.cleanName('  <b>별</b>  '), 'b별/b');
  assert.equal(profile.cleanName('가'.repeat(20)).length, 12);
  assert.equal(profile.startNamed('   '), null);
});
