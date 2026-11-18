import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOPICS, CATEGORIES, topicById } from '../shared/topics.js';
import { SECTIONS, emptyPlan, normalizePlan, missingRequired, progress, buildAppPrompt, buildImagePrompts, buildFixPrompt, planRows } from '../shared/plan.js';
import { extractHtml, srcdocFor, looksLikeApp } from '../shared/sandbox.js';
import { createStore } from '../student/store.js';
import { createApi, isValidEndpoint } from '../shared/api.js';
import { layoutWorld, moveWithin, nearestDoor, sortItems, isLand, blocked, PLAYER_R } from '../world/worldmap.js';
import { LESSONS } from '../teacher/lesson.js';

test('주제 20개, 분야별 개수(모험4·액션4·창작4·추리3·생활5), 미리보기 항목 모두 있음', () => {
  assert.equal(TOPICS.length, 20);
  assert.equal(new Set(TOPICS.map((t) => t.id)).size, 20);
  const n = Object.fromEntries(CATEGORIES.map((c) => [c.id, TOPICS.filter((t) => t.cat === c.id).length]));
  assert.deepEqual(n, { adventure: 4, action: 4, create: 4, mystery: 3, life: 5 });
  for (const t of TOPICS) {
    assert.equal(t.steps.length, 3, t.name);
    assert.ok(t.intro && t.goal && t.elements.length && t.hint.character && t.hint.place, t.name);
    for (const k of ['start', 'play', 'end']) assert.equal(t.screens[k].length, 3, `${t.name} ${k}`);
  }
});

test('기획서 15개 항목 번호 순서', () => {
  assert.deepEqual(SECTIONS.map((s) => s.n), Array.from({ length: 15 }, (_, i) => i + 1));
});

function fullPlan() {
  const p = emptyPlan('fruit-bomb');
  Object.assign(p.f, {
    developer: '하늘', appName: '과일 비', intro: '과일 받기', goal: '100점', ruleStart: '버튼', rulePlay: '끌기', ruleWin: '100점', ruleLose: '폭탄 3번',
    charName: '다람', charLook: '노란 모자', charTrait: '빠름', place: '과수원', features: ['이동하기', '피하기'], featuresMore: '무적 아이템', extra: '황금 사과', learnGoal: '수학 1~2학년 · 덧셈하기',
    elements: ['점수', '코인'], colors: ['노랑'],
  });
  return p;
}

test('꼭 쓰기 항목 확인: 빈 기획서 → 주제 포함 모두 부족, 채우면 0개', () => {
  const empty = emptyPlan();
  assert.ok(missingRequired(empty).some((m) => m.n === 0));
  assert.equal(progress(empty), 0);
  const p = fullPlan();
  assert.deepEqual(missingRequired(p), []);
  p.f.featuresMore = ''; p.f.features = ['이동하기'];
  assert.deepEqual(missingRequired(p).map((m) => m.n), [7], '기능 2개 미만');
  const q = fullPlan(); q.f.learnGoal = '';
  assert.deepEqual(missingRequired(q).map((m) => m.n), [4], '배울 내용은 꼭 쓰기');
  assert.ok(progress(fullPlan()) > 50);
});

test('앱 제작 프롬프트에 기획서 내용과 필수 조건이 들어감', () => {
  const s = buildAppPrompt(fullPlan());
  for (const w of ['과일 비', '과일 폭탄 잡기', '100점', '노란 모자', '과수원', '무적 아이템', '황금 사과', 'HTML 파일 하나', '반응형', '다시하기', '외부 서버', 'try/catch', '실행 방법']) assert.ok(s.includes(w), w);
  assert.ok(!s.includes('undefined') && !s.includes('null'));
  assert.ok(buildAppPrompt(emptyPlan()).length > 200, '빈 기획서도 오류 없이');
});

test('이미지 프롬프트: 배경 16:9, 캐릭터 흰 배경(앱이 지움), 글자·유명 캐릭터 금지, 스타일 반영, 앱 프롬프트와 분리', () => {
  const p = fullPlan();
  const list = buildImagePrompts(p);
  assert.equal(list[0].id, 'background'); assert.match(list[0].text, /16:9/);
  assert.match(list[1].text, /하얀색 한 가지/); assert.match(list[1].text, /노란 모자/);
  assert.ok(list.some((x) => x.id === 'icon2' && x.slot.element === '코인'));
  for (const x of list) { assert.match(x.text, /앱 월드와 같은 그림체/); assert.match(x.text, /픽셀아트/); assert.match(x.text, /글자/); assert.match(x.text, /유명 캐릭터/); }
  assert.ok(!buildAppPrompt(p).includes('16:9'));
  assert.match(buildAppPrompt(p), /const IMAGES = \{ background: '', hero: '', icon1: '', icon2: '' \};/, '앱 프롬프트가 그림 자리 이름을 정해 줌');
});

test('고쳐 줘 프롬프트', () => {
  const s = buildFixPrompt(fullPlan(), '버튼이 안 돼요', '바로 시작');
  assert.match(s, /과일 비/); assert.match(s, /버튼이 안 돼요/); assert.match(s, /바로 시작/);
});

test('기획서 파일 정리: 이상한 값 걸러 내기, 제출 파일도 받기, 다른 파일은 거절', () => {
  const p = fullPlan();
  const raw = JSON.parse(JSON.stringify(p));
  raw.f.features = ['이동하기', 3, null]; raw.f.goal = 42; raw.difficulty = 'insane'; raw.topicId = 'nope';
  const n = normalizePlan(raw);
  assert.deepEqual(n.f.features, ['이동하기']); assert.equal(n.f.goal, ''); assert.equal(n.difficulty, 'easy'); assert.equal(n.topicId, null);
  assert.equal(normalizePlan({ schema: 'myappmaker.submission/1', plan: p }).f.appName, '과일 비');
  assert.throws(() => normalizePlan({ hello: 1 }));
  assert.throws(() => normalizePlan(null));
});

test('인쇄 표: 주제 + 15개 항목 + 난이도', () => {
  const rows = planRows(fullPlan());
  assert.equal(rows.length, 17);
  assert.match(rows.find((r) => r.n === 6).value, /모습: 노란 모자/);
  assert.match(rows.find((r) => r.n === 4).value, /목표: 100점\n배울 내용: 수학 1~2학년/);
});

test('저장소: 저장·불러오기·실패 상태·기록 보관', () => {
  const mem = new Map();
  const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  const st = createStore(storage);
  const seen = [];
  st.onStatus((s) => seen.push(s));
  const p = fullPlan();
  assert.equal(st.save(p), true);
  assert.deepEqual(seen, ['saving', 'saved']);
  assert.equal(st.load().f.appName, '과일 비');
  st.archiveAndClear(p);
  assert.equal(st.load(), null);
  assert.equal(st.history()[0].f.appName, '과일 비');

  const full = createStore({ getItem: () => null, setItem: () => { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; }, removeItem() {} });
  let msg = '';
  full.onStatus((s, d) => { if (s === 'fail') msg = d; });
  assert.equal(full.save(p), false);
  assert.match(msg, /저장 공간/);
  const none = createStore(null);
  assert.equal(none.available, false);
  assert.equal(none.save(p), false);
});

test('학생 앱 코드 골라내기와 안전 상자 준비', () => {
  const ai = '코드예요!\n```html\n<!DOCTYPE html><html><head></head><body><button>시작</button></body></html>\n```\n실행 방법은...';
  assert.match(extractHtml(ai), /^<!DOCTYPE html>/);
  assert.match(extractHtml('설명 <!doctype html><html><body>x</body></html> 끝'), /<\/html>$/);
  assert.equal(looksLikeApp('그냥 글자'), false);
  assert.equal(looksLikeApp('<div>hi</div>'), true);
  const doc = srcdocFor('<!doctype html><html><head><title>a</title></head><body></body></html>');
  assert.ok(doc.indexOf('localStorage') < doc.indexOf('<title>'), '보완 코드가 먼저 실행');
  assert.match(srcdocFor('<div>조각</div>'), /<body><div>조각<\/div><\/body>/);
});

test('저장소 주소 검사와 미연결 처리', async () => {
  assert.equal(isValidEndpoint('https://script.google.com/macros/s/x/exec'), true);
  assert.equal(isValidEndpoint('http://evil.example'), false);
  assert.equal(isValidEndpoint('javascript:alert(1)'), false);
  const off = createApi({ endpoint: '', classCode: '' });
  assert.equal(off.enabled, false);
  await assert.rejects(off.world(), /연결되지/);
  const calls = [];
  const on = createApi({ endpoint: 'https://example.com/exec', classCode: 'C' }, async (url, opt = {}) => {
    calls.push({ url, opt });
    return { text: async () => JSON.stringify({ ok: true, items: [] }) };
  });
  await on.world();
  await on.submit({ studentKey: 'k' });
  assert.match(calls[0].url, /action=world/); assert.match(calls[0].url, /classCode=C/);
  assert.equal(calls[1].opt.method, 'POST');
  assert.equal(calls[1].opt.headers, undefined, 'text/plain 단순 요청 (사전 요청 없음)');
  const bad = createApi({ endpoint: 'https://example.com/exec', classCode: 'C' }, async () => ({ text: async () => '<html>login</html>' }));
  await assert.rejects(bad.world(), /응답/);
});

test('앱 월드: 선생님 건물 1 + 학생 부스 12, 섬 위에 겹치지 않게, 충돌, 가까운 문', () => {
  const items = Array.from({ length: 14 }, (_, i) => ({ id: `a${i}`, appName: `앱${i}`, developer: `학생${i}`, booth: i === 0 ? null : 14 - i }));
  assert.equal(sortItems(items)[0].booth, 1);
  const w = layoutWorld(items);
  assert.equal(w.booths.length, 12);
  assert.equal(w.booths.filter((b) => b.item).length, 12);
  assert.equal(w.extra.length, 2, '12개를 넘으면 목록에만');
  assert.equal(w.booths[0].item.booth, 1, '부스 번호 자리에 앉음');
  for (const b of w.booths) {
    for (const [x, y] of [[b.x - b.w / 2, b.y - b.h], [b.x + b.w / 2, b.y - b.h], [b.x - b.w / 2, b.y], [b.x + b.w / 2, b.y]]) assert.ok(isLand(x, y), `${b.n}번 부스는 섬 위`);
    assert.ok(!blocked(w, b.door), `${b.n}번 문 앞은 걸을 수 있음`);
    for (const o of w.booths) if (o !== b) assert.ok(Math.abs(b.x - o.x) >= b.w || Math.abs(b.y - o.y) >= b.h, '부스끼리 안 겹침');
  }
  assert.ok(!blocked(w, w.spawn) && !blocked(w, w.hall.door));
  const b = w.booths[0];
  const tryIn = moveWithin(w, { ...b.door }, 0, -60);
  assert.ok(tryIn.y > b.body.y + b.body.h, '부스 벽을 뚫지 못함');
  assert.ok(blocked(w, { x: 20, y: 20 }), '바다로는 못 감');
  assert.equal(nearestDoor(w, b.door).booth, b);
  assert.equal(nearestDoor(w, w.hall.door).kind, 'teacher');
  assert.equal(nearestDoor(w, w.spawn), null);
  assert.equal(layoutWorld([]).booths.filter((x) => x.item).length, 0);
});

test('수업: 4차시 모두 40분', () => {
  assert.equal(LESSONS.length, 4);
  for (const l of LESSONS) assert.equal(l.steps.reduce((a, s) => a + s.min, 0), 40, `${l.n}차시`);
});
