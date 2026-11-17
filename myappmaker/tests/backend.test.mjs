import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGas } from './gas-sim.mjs';

const sub = (o = {}) => ({ action: 'submit', classCode: 'TEST-CLASS', studentKey: 'dev_a', developer: '하늘', appName: '과일 잡기', topicId: 'fruit-bomb',
  plan: { schema: 'myappmaker.plan/1', f: { intro: '과일을 받아요' } }, appHtml: '<html><body><script>1</script></body></html>', appUrl: '', ...o });

test('반 코드가 틀리면 거절, 맞으면 ping', () => {
  const g = createGas();
  assert.equal(g.get({ action: 'ping', classCode: 'nope' }).ok, false);
  assert.equal(g.get({ action: 'ping', classCode: 'TEST-CLASS' }).ok, true);
});

test('설정을 바꾸지 않은 Code.gs 는 동작하지 않음', () => {
  const g = createGas({ classCode: 'CHANGE-ME-CLASS' });
  const r = g.get({ action: 'ping', classCode: 'CHANGE-ME-CLASS' });
  assert.equal(r.ok, false);
  assert.match(r.error, /CLASS_CODE/);
});

test('제출 → 같은 학생이 다시 내면 덮어쓰기, 승인 전엔 월드에 안 보임', () => {
  const g = createGas();
  const a = g.post(sub());
  assert.equal(a.ok, true); assert.equal(a.isNew, true);
  const b = g.post(sub({ appName: '과일 잡기 2' }));
  assert.equal(b.id, a.id); assert.equal(b.isNew, false);
  assert.equal(g.sheets.get('제출').data.length, 2);   // 머리줄 + 1명
  assert.equal(g.get({ action: 'world', classCode: 'TEST-CLASS' }).items.length, 0);
  assert.equal(g.get({ action: 'app', classCode: 'TEST-CLASS', id: a.id }).ok, false);
  // 옛 HTML 파일은 휴지통으로
  assert.equal([...g.files.values()].filter((f) => !f.trashed).length, 1);
});

test('교사: 열쇠 확인, 목록, 승인·부스, 학생 상태 확인, 좋아요, 삭제', () => {
  const g = createGas();
  const { id } = g.post(sub());
  assert.equal(g.post({ action: 'list', teacherKey: 'wrong' }).ok, false);
  const list = g.post({ action: 'list', teacherKey: 'TEST-TEACHER' });
  assert.equal(list.items.length, 1);
  assert.equal(list.items[0].plan.f.intro, '과일을 받아요');
  assert.equal(list.items[0].hasHtml, true);
  assert.match(g.post({ action: 'teacherApp', teacherKey: 'TEST-TEACHER', id }).html, /<script>/);

  const r = g.post({ action: 'review', teacherKey: 'TEST-TEACHER', id, status: 'approved', feedback: '멋져요', booth: 3 });
  assert.equal(r.status, 'approved'); assert.equal(r.booth, 3);
  const mine = g.get({ action: 'mine', classCode: 'TEST-CLASS', studentKey: 'dev_a' });
  assert.equal(mine.status, 'approved'); assert.equal(mine.feedback, '멋져요'); assert.equal(mine.booth, 3);

  const w = g.get({ action: 'world', classCode: 'TEST-CLASS' });
  assert.equal(w.items.length, 1);
  assert.equal(w.items[0].intro, '과일을 받아요');
  assert.equal(w.items[0].studentKey, undefined, '학생 열쇠는 공개하지 않음');
  assert.equal(g.post({ action: 'like', classCode: 'TEST-CLASS', id }).likes, 1);
  assert.match(g.get({ action: 'app', classCode: 'TEST-CLASS', id }).html, /<script>/);

  assert.equal(g.post({ action: 'review', teacherKey: 'TEST-TEACHER', id, status: 'hacked' }).ok, false);
  assert.equal(g.post({ action: 'remove', teacherKey: 'TEST-TEACHER', id }).ok, true);
  assert.equal(g.post({ action: 'list', teacherKey: 'TEST-TEACHER' }).items.length, 0);
});

test('입력 검사: 이름 없음, 너무 큰 앱, 잘못된 주소, 깨진 요청', () => {
  const g = createGas();
  assert.equal(g.post(sub({ developer: '' })).ok, false);
  assert.equal(g.post(sub({ appHtml: 'x'.repeat(500001) })).ok, false);
  assert.equal(g.post(sub({ appUrl: 'javascript:alert(1)' })).ok, false);
  assert.equal(g.post('{not json').ok, false);
  assert.equal(g.post({ action: 'submit', classCode: 'TEST-CLASS' }).ok, false);
});
