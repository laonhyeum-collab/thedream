import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOPICS, CATEGORIES, topicById } from '../shared/topics.js';
import { SECTIONS, emptyPlan, normalizePlan, missingRequired, progress, buildAppPrompt, buildImagePrompts, buildFixPrompt, planRows } from '../shared/plan.js';
import { extractHtml, srcdocFor, looksLikeApp } from '../shared/sandbox.js';
import { createStore } from '../student/store.js';
import { createApi, isValidEndpoint } from '../shared/api.js';
import { layoutWorld, moveWithin, nearestBooth, sortItems, PLAYER_R } from '../world/worldmap.js';
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
    charName: '다람', charLook: '노란 모자', charTrait: '빠름', place: '과수원', features: ['이동하기', '피하기'], featuresMore: '무적 아이템', extra: '황금 사과',
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
  p.f.featuresMore = '';
  assert.deepEqual(missingRequired(p).map((m) => m.n), [7], '기능 3개 미만');
  assert.ok(progress(fullPlan()) > 50);
});

test('앱 제작 프롬프트에 기획서 내용과 필수 조건이 들어감', () => {
  const s = buildAppPrompt(fullPlan());
  for (const w of ['과일 비', '과일 폭탄 잡기', '100점', '노란 모자', '과수원', '무적 아이템', '황금 사과', 'HTML 파일 하나', '반응형', '다시하기', '외부 서버', 'try/catch', '실행 방법']) assert.ok(s.includes(w), w);
  assert.ok(!s.includes('undefined') && !s.includes('null'));
  assert.ok(buildAppPrompt(emptyPlan()).length > 200, '빈 기획서도 오류 없이');
});

test('이미지 프롬프트: 배경 16:9, 캐릭터 투명, 글자·유명 캐릭터 금지, 스타일 반영, 앱 프롬프트와 분리', () => {
  const p = fullPlan(); p.f.imageStyle = '픽셀 아트';
  const list = buildImagePrompts(p);
  assert.equal(list[0].id, 'background'); assert.match(list[0].text, /16:9/);
  assert.match(list[1].text, /투명/); assert.match(list[1].text, /노란 모자/);
  assert.ok(list.some((x) => x.id === 'icon-코인'));
  for (const x of list) { assert.match(x.text, /픽셀 아트/); assert.match(x.text, /글자/); assert.match(x.text, /유명 캐릭터/); }
  assert.ok(!buildAppPrompt(p).includes('16:9'));
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
  assert.equal(rows.find((r) => r.n === 4).value, '100점');
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

test('앱 월드: 부스 배치, 충돌, 가까운 부스', () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ id: `a${i}`, appName: `앱${i}`, developer: `학생${i}`, booth: i === 0 ? null : 20 - i }));
  assert.equal(sortItems(items)[0].booth, 1);
  assert.equal(sortItems(items).at(-1).booth, null, '번호 없는 부스는 뒤로');
  const w = layoutWorld(items);
  assert.equal(w.booths.length, 20);
  for (const b of w.booths) {
    assert.ok(b.x >= 0 && b.x + b.w <= w.width && b.door.y <= w.height, '지도 안');
    for (const o of w.booths) if (o !== b) assert.ok(b.x + b.w <= o.x || o.x + o.w <= b.x || b.y + b.h <= o.y || o.y + o.h <= b.y, '부스끼리 안 겹침');
  }
  const b = w.booths[0];
  const inside = moveWithin(w, { x: b.x + b.w / 2, y: b.y + b.h + PLAYER_R + 2 }, 0, -40);
  assert.ok(inside.y >= b.y + b.h + PLAYER_R - 0.01, '부스 벽을 뚫지 못함');
  const edge = moveWithin(w, { x: 5, y: 5 }, -100, -100);
  assert.ok(edge.x >= PLAYER_R && edge.y >= PLAYER_R, '지도 밖으로 못 나감');
  assert.equal(nearestBooth(w, b.door), b);
  assert.equal(nearestBooth(w, w.spawn), null);
  assert.equal(layoutWorld([]).booths.length, 0);
});

test('수업: 4차시 모두 40분', () => {
  assert.equal(LESSONS.length, 4);
  for (const l of LESSONS) assert.equal(l.steps.reduce((a, s) => a + s.min, 0), 40, `${l.n}차시`);
});
