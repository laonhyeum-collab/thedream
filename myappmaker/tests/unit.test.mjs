import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOPICS, CATEGORIES, topicById } from '../shared/topics.js';
import { SECTIONS, emptyPlan, normalizePlan, missingRequired, progress, buildAppPrompt, buildImagePrompts, buildFixPrompt, planRows, fixCheck, fixSentence, cleanFixes, FIX_EXAMPLES, FIX_KEEP } from '../shared/plan.js';
import { extractHtml, srcdocFor, looksLikeApp, looksLikePrompt, SANDBOX } from '../shared/sandbox.js';
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
  assert.match(s, /한 가지만/); assert.match(s, /새 기능이나 규칙·레벨을 더하지 마/);
  assert.match(s, /const IMAGES/, '그림 자리를 지키라고 요청');
  assert.match(s, /코드 블록 하나/); assert.match(s, /그대로 둘 것: 그 밖의/);
  const k = buildFixPrompt(fullPlan(), '빨라요', '천천히', ['주인공', '점수', '없는것']);
  assert.match(k, /그대로 둘 것: 주인공, 점수, 그 밖의/); assert.ok(!k.includes('없는것'));
});

test('고쳐 줘: 아이용 문장 틀과 확인', () => {
  assert.equal(fixSentence('너무 빨라요', '천천히 움직여요', ['주인공']), '지금은 「너무 빨라요」인데, 「천천히 움직여요」처럼 되면 좋겠어. 주인공, 그리고 나머지는 그대로 둬.');
  assert.match(fixSentence('', '', []), /○○.*△△.*나머지는 그대로 둬/);
  assert.equal(fixCheck('너무 빨라요', '천천히').ok, true);
  assert.equal(fixCheck('', '천천히').empty, 'problem');
  assert.equal(fixCheck('빨라요', '').empty, 'want');
  assert.equal(fixCheck('너무 빨라요 그리고 점수가 안 올라요', '천천히').many, true, '두 가지를 한꺼번에');
  assert.equal(fixCheck('너무 빨라요. 소리도 안 나요', '천천히').many, true);
  assert.equal(fixCheck('너무 빨라요', '천천히').many, false);
  const priv = fixCheck('010-1234-5678 로 연락', '천천히');
  assert.ok(priv.privacy.length > 0); assert.equal(priv.ok, false, '개인정보는 막음');
  const bad = fixCheck('총으로 쏘게 해 줘', '피가 나요');
  assert.ok(bad.blocked.length > 0); assert.equal(bad.ok, false);
  for (const x of FIX_EXAMPLES) { const c = fixCheck(x.problem, x.want); assert.ok(c.ok && !c.many, x.problem); assert.ok(x.problem.length <= 80 && x.want.length <= 80); }
  assert.ok(FIX_KEEP.length >= 4);
});

test('고친 기록 정리: 이상한 값 걸러 내고 20개까지', () => {
  const many = Array.from({ length: 25 }, (_, i) => ({ problem: `p${i}`, want: 'w', keep: ['주인공', 'x'], at: 't', result: i % 2 ? 'good' : 'weird' }));
  const c = cleanFixes([...many, null, { problem: 3 }]);
  assert.equal(c.length, 20); assert.equal(c[0].problem, 'p5', '최근 20개'); assert.deepEqual(c[0].keep, ['주인공']); assert.equal(c[0].result, 'good'); assert.equal(c[1].result, '', '모르는 값은 비움');
  assert.deepEqual(cleanFixes('nope'), []);
  const p = fullPlan(); p.app.fixes = many;
  assert.equal(normalizePlan(JSON.parse(JSON.stringify(p))).app.fixes.length, 20);
  assert.deepEqual(emptyPlan().app.fixes, []);
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

test('준비된 지도: 그림 파일·문 자리 12곳이 맞고, 백엔드와 id가 같음', async () => {
  const fs = await import('node:fs');
  const { MAP_PRESETS, MAP_PRESET_IDS, cleanWorldSettings } = await import('../shared/worldart.js');
  for (const p of MAP_PRESETS) {
    assert.ok(fs.existsSync(new URL(`../shared/maps/${p.file}`, import.meta.url)), p.file);
    assert.equal(p.hotspots.booths.length, 12);
    for (const pt of [p.hotspots.hall, p.hotspots.start, ...p.hotspots.booths]) assert.ok(pt.every((v) => v > 0 && v < 1));
  }
  const gs = fs.readFileSync(new URL('../backend/Code.gs', import.meta.url), 'utf8');
  assert.match(gs, new RegExp(`MAP_PRESET_IDS = \\[${MAP_PRESET_IDS.map((x) => `'${x}'`).join(', ')}\\]`));
  assert.equal(cleanWorldSettings({}).mapPreset, 'castle');
  assert.equal(cleanWorldSettings({ mapPreset: 'pixel' }).mapPreset, 'pixel');
});

test('지도 속 구역 찾기: 낱말 첫머리만, 장소 글이 먼저', async () => {
  const { worldSpot, presetById } = await import('../shared/worldart.js');
  const S = presetById('seasons'), R = presetById('river');
  assert.equal(worldSpot('화산이 보이는 공룡 섬', '공룡 화석 발굴대', S), '용암이 흐르는 화산');
  assert.equal(worldSpot('우주 정거장', '행성 순서', R), '', '「행성」 속 「성」은 성터가 아님');
  assert.equal(worldSpot('', '바다 생물 도감', R), '야자수와 파라솔이 있는 모래 해변', '「생물」 속 「물」은 폭포가 아님');
  assert.equal(worldSpot('눈 내리는 마을', '', S), '눈 덮인 산과 얼음집');
});

test('실행이 안 될 때: 끊긴 코드 찾기 · 설명 속 </html> · <header> 앞에 상자 보완을 넣지 않음', async () => {
  const sb = await import('../shared/sandbox.js');
  assert.deepEqual(sb.codeProblems('<!DOCTYPE html><html><body><script>let a = 1;'), ['cut']);
  assert.deepEqual(sb.codeProblems('<!DOCTYPE html><html><body><script>let a = 1;</script></body></html>'), []);
  assert.equal(sb.extractHtml('여기\n<!DOCTYPE html><html><body>x</body></html>\n끝은 </html> 이에요').endsWith('</body></html>'), true);
  const doc = sb.srcdocFor('<html><header>h</header><body>x</body></html>');
  assert.ok(doc.indexOf('<script>') < doc.indexOf('<header>'), '보완 스크립트는 <header> 안이 아니라 <head> 에');
});

test('앱 실행: HTML·CSS·JS 블록이 나뉘어 와도 하나로 합치고, 코드 속 ``` 에서 잘리지 않음', () => {
  const ai = '게임이에요\n```html\n<!DOCTYPE html>\n<html><head><link rel="stylesheet" href="style.css"></head><body><canvas id=c></canvas><script src="script.js"></script></body></html>\n```\n```css\nbody{margin:0}\n```\n```javascript\nconst a = "$&"; go();\n```';
  const html = extractHtml(ai);
  assert.match(html, /<style>\nbody\{margin:0\}\n<\/style>\n<\/head>/);
  assert.match(html, /<script>\nconst a = "\$&"; go\(\);\n<\/script>\n<\/body>/);
  assert.doesNotMatch(html, /style\.css|script\.js/);
  assert.match(extractHtml("```html\n<html><body><script>\nconsole.log('```')\n</script></body></html>\n```"), /<\/html>$/);
});

test('앱 실행: 정답 입력(form) 게임이 막히지 않고, 프롬프트를 잘못 붙여 넣으면 알아챔', () => {
  assert.match(SANDBOX, /allow-forms/);
  assert.doesNotMatch(SANDBOX, /allow-same-origin/);
  assert.equal(looksLikePrompt('1. HTML·CSS·JavaScript가 모두 들어 있는 **HTML 파일 하나**로 만들어 줘. <script> 맨 위에'), true);
  assert.equal(looksLikePrompt('<!DOCTYPE html><html><body><script>x()</script></body></html>'), false);
});
