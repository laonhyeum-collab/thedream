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
  assert.deepEqual({ ...r.settings, hotspots: undefined, labelMode: undefined, mapPreset: undefined }, { schoolName: '해솔초script', title: '친구들이 만든 앱 월드', notice: '오늘은 앱 월드 오픈!', hotspots: undefined, labelMode: undefined, mapPreset: undefined });
  assert.equal(r.settings.labelMode, 'small');
  assert.equal(r.settings.mapPreset, 'castle');   // 기본 = 준비된 지도
  const g2 = createGas();
  assert.equal(g2.post({ action: 'setWorld', teacherKey: 'TEST-TEACHER', settings: { mapPreset: 'river' } }).settings.mapPreset, 'river');
  assert.equal(g2.post({ action: 'setWorld', teacherKey: 'TEST-TEACHER', settings: { mapPreset: 'x<y' } }).settings.mapPreset, 'castle');
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

test('관리자 계정: 설치 열쇠로 처음 만들고, 아이디·비밀번호로 로그인', () => {
  const g = createGas();
  assert.equal(g.post({ action: 'adminSetup', setupKey: 'nope', adminId: 'kim', password: 'abc12345' }).ok, false, '설치 열쇠가 있어야');
  assert.equal(g.post({ action: 'adminSetup', setupKey: 'TEST-TEACHER', adminId: 'kim', password: '123' }).ok, false, '비밀번호 6자 이상');
  const s = g.post({ action: 'adminSetup', setupKey: 'TEST-TEACHER', adminId: 'Kim', password: 'abc12345' });
  assert.equal(s.adminId, 'kim', '아이디는 소문자로');
  assert.equal(g.post({ action: 'adminLogin', adminId: 'kim', password: 'wrong' }).ok, false);
  const L = g.post({ action: 'adminLogin', adminId: 'KIM', password: 'abc12345' });
  assert.ok(L.token);
  assert.equal(g.post({ action: 'list', teacherKey: L.token }).ok, true, '출입증으로 교사 기능');
  assert.equal(g.post({ action: 'whoami', teacherKey: L.token }).adminId, 'kim');
  // 비밀번호는 시트·속성에 그대로 남지 않음
  assert.ok(!g.props.get('ADMINS').includes('abc12345'));
  // 위조·변조 출입증 거절
  const forged = L.token.replace('.a', '.b').replace(/\.[0-9a-f]+$/, '.0000');
  assert.equal(g.post({ action: 'list', teacherKey: forged }).ok, false);
  assert.equal(g.post({ action: 'list', teacherKey: L.token.replace('a.kim', 'a.lee') }).ok, false, '아이디를 바꾸면 서명이 안 맞음');
  // 관리자 추가·삭제·비밀번호 바꾸기
  assert.equal(g.post({ action: 'addAdmin', teacherKey: L.token, adminId: 'lee', password: 'lee-pass-1' }).admins.length, 2);
  const lee = g.post({ action: 'adminLogin', adminId: 'lee', password: 'lee-pass-1' }).token;
  assert.equal(g.post({ action: 'removeAdmin', teacherKey: L.token, adminId: 'kim' }).ok, false, '내 계정은 못 지움');
  const ch = g.post({ action: 'changePassword', teacherKey: lee, password: 'new-pass-2' });
  assert.equal(g.post({ action: 'list', teacherKey: lee }).ok, false, '비밀번호를 바꾸면 예전 로그인은 풀림');
  assert.equal(g.post({ action: 'list', teacherKey: ch.token }).ok, true);
  assert.equal(g.post({ action: 'removeAdmin', teacherKey: L.token, adminId: 'lee' }).admins.length, 1);
  assert.equal(g.post({ action: 'list', teacherKey: ch.token }).ok, false, '지운 관리자는 못 씀');
  // 10번 틀리면 잠김
  for (let i = 0; i < 10; i++) g.post({ action: 'adminLogin', adminId: 'kim', password: 'x' });
  assert.match(g.post({ action: 'adminLogin', adminId: 'kim', password: 'abc12345' }).error, /잠겼/);
});

test('학생 계정: 선생님이 만들고, 학생은 아이디·비밀번호로 어느 기기에서나 이어서', () => {
  const g = createGas();
  const T = 'TEST-TEACHER';
  assert.equal(g.post({ action: 'createAccounts', teacherKey: 'x', count: 3 }).ok, false);
  const made = g.post({ action: 'createAccounts', teacherKey: T, prefix: '', from: 1, count: 3 });
  assert.deepEqual(made.made.map((x) => x.loginId), ['01', '02', '03']);
  assert.ok(made.made.every((x) => /^\d{4}$/.test(x.pin)));
  assert.deepEqual(g.post({ action: 'createAccounts', teacherKey: T, from: 3, count: 2 }).skipped, ['03'], '이미 있는 아이디는 건너뜀');
  const pin = made.made[0].pin;
  const C = 'TEST-CLASS';
  assert.equal(g.post({ action: 'studentLogin', classCode: 'X', loginId: '01', pin }).ok, false, '반 코드 필요');
  assert.equal(g.post({ action: 'studentLogin', classCode: C, loginId: '01', pin: '0000' }).ok, false);
  const s = g.post({ action: 'studentLogin', classCode: C, loginId: '01', pin });
  assert.ok(s.token);
  // 노트북 A에서 저장 → 노트북 B에서 불러오기
  assert.equal(g.post({ action: 'loadDraft', classCode: C, token: s.token }).plan, null);
  g.post({ action: 'saveDraft', classCode: C, token: s.token, plan: { id: 'p1', f: { appName: '공룡 발굴' } } });
  g.post({ action: 'saveDraft', classCode: C, token: s.token, plan: { id: 'p1', f: { appName: '공룡 화석 발굴대' } } });
  const s2 = g.post({ action: 'studentLogin', classCode: C, loginId: '01', pin });
  assert.equal(g.post({ action: 'loadDraft', classCode: C, token: s2.token }).plan.f.appName, '공룡 화석 발굴대');
  assert.equal([...g.files.values()].filter((f) => f.name.startsWith('draft_01') && !f.trashed).length, 1, '저장 파일은 하나를 덮어씀');
  // 다른 학생 작업은 못 봄, 출입증 없으면 거절
  const s3 = g.post({ action: 'studentLogin', classCode: C, loginId: '02', pin: made.made[1].pin });
  assert.equal(g.post({ action: 'loadDraft', classCode: C, token: s3.token }).plan, null);
  assert.equal(g.post({ action: 'loadDraft', classCode: C, token: 'x' }).ok, false);
  assert.equal(g.post({ action: 'loadDraft', classCode: C, token: s.token.replace('s.01', 's.02') }).ok, false, '다른 아이디로 바꾼 출입증 거절');
  // 제출·상태 확인은 아이디 기준 (기기와 별명이 달라도)
  const sub = g.post({ action: 'submit', classCode: C, token: s.token, studentKey: 'device-A', developer: '공룡박사', appName: '공룡 화석 발굴대', topicId: 'pet-care', plan: { id: 'p1' }, appHtml: '<html></html>' });
  assert.ok(sub.ok);
  g.post({ action: 'submit', classCode: C, token: s2.token, studentKey: 'device-B', developer: '다른별명', appName: '공룡 화석 발굴대', topicId: 'pet-care', plan: { id: 'p1' }, appHtml: '<html></html>' });
  assert.equal(g.sheets.get('제출').data.length, 2, '다른 기기에서 다시 내도 한 줄');
  assert.equal(g.get({ action: 'mine', classCode: C, token: s2.token }).id, sub.id);
  const acc = g.post({ action: 'accounts', teacherKey: T }).accounts;
  assert.equal(acc.find((a) => a.loginId === '01').app.id, sub.id, '교사 화면에서 아이디별 제출 확인');
  assert.ok(acc.find((a) => a.loginId === '01').draftAt);
  // 비밀번호 새로 만들기 → 예전 출입증 못 씀
  const np = g.post({ action: 'resetPin', teacherKey: T, loginId: '01' }).pin;
  assert.equal(g.post({ action: 'loadDraft', classCode: C, token: s2.token }).ok, false);
  assert.ok(g.post({ action: 'studentLogin', classCode: C, loginId: '01', pin: np }).token);
  // 10번 틀리면 잠김
  for (let i = 0; i < 10; i++) g.post({ action: 'studentLogin', classCode: C, loginId: '03', pin: '0000' });
  assert.match(g.post({ action: 'studentLogin', classCode: C, loginId: '03', pin: made.made[2].pin }).error, /잠겼/);
  // 계정 지우기 → 저장 파일도 휴지통
  g.post({ action: 'removeAccount', teacherKey: T, loginId: '01' });
  assert.equal(g.post({ action: 'loadDraft', classCode: C, token: g.post({ action: 'studentLogin', classCode: C, loginId: '01', pin: np }).token }).ok, false);
  assert.ok([...g.files.values()].filter((f) => f.name.startsWith('draft_01')).every((f) => f.trashed));
});

test('함께 보기(presence): 서로의 위치·캐릭터가 보이고, 나가면 사라짐', () => {
  const g = createGas();
  const C = 'TEST-CLASS';
  assert.equal(g.post({ action: 'presence', classCode: 'nope', sid: 'a1' }).ok, false);
  const a = g.post({ action: 'presence', classCode: C, sid: 'a1', nick: '<b>하늘', avatar: { skin: 2, hair: 3, bad: 'x' }, x: 100, y: 200, w: 1920 });
  assert.equal(a.ok, true); assert.equal(a.others.length, 0);
  const b = g.post({ action: 'presence', classCode: C, sid: 'b2', nick: '새봄', avatar: {}, x: 300, y: 400, w: 1920 });
  assert.equal(b.others.length, 1);
  assert.equal(b.others[0].nick, 'b하늘'); assert.equal(b.others[0].x, 100); assert.deepEqual(b.others[0].avatar, { skin: 2, hair: 3 });
  assert.equal(g.post({ action: 'presence', classCode: C, sid: 'a1', x: 1, y: 1 }).others[0].sid, 'b2');
  g.post({ action: 'presence', classCode: C, sid: 'b2', leave: true });
  assert.equal(g.post({ action: 'presence', classCode: C, sid: 'a1', x: 1, y: 1 }).others.length, 0);
});
