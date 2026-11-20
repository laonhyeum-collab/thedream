// 「우리 반에 연결하기」: 연결 정보가 없는 기기에서 조용히 파일 방식으로 가지 않는지
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseClassLink, linkWith, needsConnect, chooseOffline, offlineChosen } from '../shared/connect.js';

function mem() { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; }
const EP = 'https://script.google.com/macros/s/AKfyTEST/exec';

test('선생님이 준 주소에서 저장소 주소·반 코드를 꺼냄', () => {
  const link = `https://laonhyeum-collab.github.io/thedream/myappmaker/student/?api=${encodeURIComponent(EP)}&class=DREAM-5-2`;
  assert.deepEqual(parseClassLink(link), { endpoint: EP, classCode: 'DREAM-5-2' });
  assert.deepEqual(parseClassLink(`  ${link}  `), { endpoint: EP, classCode: 'DREAM-5-2' });
});

test('주소가 아니거나 연결 정보가 없으면 null', () => {
  assert.equal(parseClassLink(''), null);
  assert.equal(parseClassLink('DREAM-5-2'), null);
  assert.equal(parseClassLink('https://laonhyeum-collab.github.io/thedream/myappmaker/student/'), null);
  assert.equal(parseClassLink('https://x.test/?api=http%3A%2F%2Fevil.test%2Fexec&class=A'), null, 'https 아닌 저장소는 거절');
  assert.equal(parseClassLink('https://x.test/?api=javascript%3Aalert(1)&class=A'), null);
});

test('연결 주소를 붙인 새 주소 (해시 유지)', () => {
  const out = new URL(linkWith('https://a.test/student/#plan', { endpoint: EP, classCode: 'C1' }));
  assert.equal(out.searchParams.get('api'), EP);
  assert.equal(out.searchParams.get('class'), 'C1');
  assert.equal(out.hash, '#plan');
});

test('연결 정보 없는 새 기기 → 안내 화면 필요, 연결됐거나 저장소 없이 고르면 필요 없음', () => {
  const s = mem();
  assert.equal(needsConnect('student', { endpoint: '', classCode: '' }, '', s), true, '새 기기는 안내 화면');
  assert.equal(needsConnect('student', { endpoint: EP, classCode: 'C1' }, '', s), false, '공용 설정·주소로 연결됨');
  assert.equal(needsConnect('world', { endpoint: '' }, '?demo=1', s), false, '체험 모드 주소');
  assert.equal(needsConnect('student', { endpoint: '' }, '?offline=1', s), false);
  chooseOffline('student', true, s);
  assert.equal(offlineChosen('student', s), true);
  assert.equal(needsConnect('student', { endpoint: '' }, '', s), false, '저장소 없이 하기를 고른 기기');
  assert.equal(needsConnect('world', { endpoint: '' }, '', s), true, '앱마다 따로');
  chooseOffline('student', false, s);
  assert.equal(needsConnect('student', { endpoint: '' }, '', s), true);
});

test('저장소가 막혀도(localStorage 오류) 안내 화면은 뜸', () => {
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() {} };
  assert.equal(needsConnect('student', { endpoint: '' }, '', broken), true);
  chooseOffline('student', true, broken);
});
