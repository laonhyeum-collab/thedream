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

const IMG = 'data:image/png;base64,iVBORw0KGgo=';
test('월드 설정: 교사만 바꾸고, 메타버스는 읽기만', () => {
  const g = createGas();
  assert.equal(g.post({ action: 'setWorld', teacherKey: 'nope', settings: {} }).ok, false);
  const r = g.post({ action: 'setWorld', teacherKey: 'TEST-TEACHER', settings: { schoolName: '해솔초<script>', title: '', notice: '오늘은 앱 월드 오픈!' } });
  assert.deepEqual({ ...r.settings, hotspots: undefined, labelMode: undefined }, { schoolName: '해솔초script', title: '친구들이 만든 앱 월드', notice: '오늘은 앱 월드 오픈!', hotspots: undefined, labelMode: undefined });
  assert.equal(r.settings.labelMode, 'small');
  const w = g.get({ action: 'world', classCode: 'TEST-CLASS' });
  assert.equal(w.settings.schoolName, '해솔초script');
  assert.deepEqual(w.assets, []);
  assert.equal(w.teacherApp, null);
});

test('월드 그림: 정해진 자리만, 그림만, 바꾸기·지우기', () => {
  const g = createGas();
  assert.equal(g.post({ action: 'setAsset', teacherKey: 'TEST-TEACHER', key: 'evil', data: IMG }).ok, false);
  assert.equal(g.post({ action: 'setAsset', teacherKey: 'TEST-TEACHER', key: 'map', data: 'javascript:alert(1)' }).ok, false);
  assert.deepEqual(g.post({ action: 'setAsset', teacherKey: 'TEST-TEACHER', key: 'map', data: IMG }).assets, ['map']);
  assert.equal(g.get({ action: 'asset', classCode: 'TEST-CLASS', key: 'map' }).data, IMG);
  assert.equal(g.get({ action: 'asset', classCode: 'nope', key: 'map' }).ok, false);
  g.post({ action: 'setAsset', teacherKey: 'TEST-TEACHER', key: 'map', data: IMG.replace('=', 'A=') });
  assert.equal([...g.files.values()].filter((f) => !f.trashed).length, 1, '옛 그림은 휴지통으로');
  assert.deepEqual(g.post({ action: 'setAsset', teacherKey: 'TEST-TEACHER', key: 'map', data: null }).assets, []);
});

test('선생님의 앱: 올리기 → 월드에서 열기 → 지우기', () => {
  const g = createGas();
  assert.equal(g.get({ action: 'teacherAppHtml', classCode: 'TEST-CLASS' }).ok, false);
  g.post({ action: 'setTeacherApp', teacherKey: 'TEST-TEACHER', title: '구구단 마을', html: '<html><body><script>1</script></body></html>' });
  assert.equal(g.get({ action: 'world', classCode: 'TEST-CLASS' }).teacherApp.title, '구구단 마을');
  assert.match(g.get({ action: 'teacherAppHtml', classCode: 'TEST-CLASS' }).html, /<script>/);
  g.post({ action: 'setTeacherApp', teacherKey: 'TEST-TEACHER', html: '' });
  assert.equal(g.get({ action: 'world', classCode: 'TEST-CLASS' }).teacherApp, null);
});

test('학생 부스 그림·캐릭터: 제출 → 승인 후 월드에서 보임, 부스 번호는 1~12', () => {
  const g = createGas();
  assert.equal(g.post(sub({ boothImage: 'data:text/html;base64,AA' })).ok, false);
  const { id } = g.post(sub({ boothImage: IMG, plan: { schema: 'myappmaker.plan/1', f: { intro: '소개' }, avatar: { skin: 1, hair: 2 } } }));
  assert.equal(g.get({ action: 'booth', classCode: 'TEST-CLASS', id }).ok, false, '승인 전엔 안 보임');
  g.post({ action: 'review', teacherKey: 'TEST-TEACHER', id, status: 'approved', booth: 99 });
  const item = g.get({ action: 'world', classCode: 'TEST-CLASS' }).items[0];
  assert.equal(item.booth, 12, '부스 번호는 12까지');
  assert.equal(item.hasBooth, true);
  assert.deepEqual(item.avatar, { skin: 1, hair: 2 });
  assert.equal(g.get({ action: 'booth', classCode: 'TEST-CLASS', id }).image, IMG);
  assert.equal(g.post({ action: 'list', teacherKey: 'TEST-TEACHER' }).items[0].hasBooth, true);
});

test('예전 시트(새 칸 없음)도 머리줄을 고쳐서 계속 씀', () => {
  const g = createGas();
  g.post(sub());
  const head = g.sheets.get('제출').data[0];
  head.length = head.length - 1;   // 옛 머리줄 흉내
  g.post(sub({ boothImage: IMG }));
  assert.equal(g.sheets.get('제출').data[0].at(-1), 'boothFileId');
});

test('Code.gs 의 월드 그림 자리 = shared/worldart.js 의 자리', async () => {
  const { WORLD_ASSET_KEYS, STUDENT_BOOTHS } = await import('../shared/worldart.js');
  const g = createGas();
  assert.deepEqual([...g.ctx.ASSET_KEYS], WORLD_ASSET_KEYS);
  assert.equal(g.ctx.STUDENT_BOOTHS, STUDENT_BOOTHS);
});

test('지도 그림 위 문 자리(hotspots)와 이름표 방식 저장', () => {
  const g = createGas();
  const r = g.post({ action: 'setWorld', teacherKey: 'TEST-TEACHER', settings: { hotspots: { hall: [0.5, 0.45], start: [0.47, 0.8], booths: [[0.1, 0.3], [2, 0.5], 'x'] }, labelMode: 'big' } });
  assert.deepEqual(r.settings.hotspots.hall, [0.5, 0.45]);
  assert.deepEqual(r.settings.hotspots.booths.slice(0, 3), [[0.1, 0.3], null, null], '범위 밖·이상한 값은 버림');
  assert.equal(r.settings.hotspots.booths.length, 12);
  assert.equal(r.settings.labelMode, 'big');
  assert.deepEqual(g.get({ action: 'world', classCode: 'TEST-CLASS' }).settings.hotspots.start, [0.47, 0.8]);
});
