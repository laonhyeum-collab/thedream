// 주제 추천: 관심사에 맞게 추천하고, 이미 있는 게임·폭력·부적절한 내용·배움 없는 주제는 내보내지 않는지
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommend, surprise, checkText, ALL_RECS, THEMES, ideaFromRec } from '../shared/recommend.js';
import { topicById } from '../shared/topics.js';
import { emptyPlan, normalizePlan, topicView, planSafety, planWarnings, buildAppPrompt, planRows, DIFFICULTY, SECTIONS, MAX_PICK } from '../shared/plan.js';
import { TOPICS } from '../shared/topics.js';

const titles = (q) => recommend(q).recs.map((r) => r.title);
const kinds = (q) => recommend(q).notices.map((n) => n.kind);
const BRANDS = ['마인크래프트', '포켓몬', '피카츄', '마리오', '쿠키런', '브롤스타즈', '배그', '로블록스', '레고', '엘사', '아이언맨'];

test('모든 추천: 배움 요소가 있고, 기본 게임 방식이 있고, 걸러 낼 말·실제 게임 이름이 없음', () => {
  assert.ok(ALL_RECS.length >= 80);
  for (const r of ALL_RECS) {
    assert.ok(r.learn && r.learn.length >= 6, `${r.title}: 배움 요소`);
    assert.match(r.curr, /^(국어|수학|사회|과학|영어|도덕|실과|체육|음악|미술|바른 생활|슬기로운 생활|즐거운 생활) (1~2|3~4|5~6)학년$/, `${r.title}: 교과 연계`);
    if (/^(바른|슬기로운|즐거운) 생활/.test(r.curr)) assert.match(r.curr, /1~2학년$/, `${r.title}: 통합교과는 1~2학년`);
    if (/^(사회|과학|영어|도덕|체육|음악|미술)/.test(r.curr)) assert.doesNotMatch(r.curr, /1~2학년/, `${r.title}: 3학년부터 배우는 교과`);
    if (/^실과/.test(r.curr)) assert.match(r.curr, /5~6학년$/, `${r.title}: 실과는 5~6학년`);
    assert.ok(topicById(r.base), `${r.title}: 기본 방식 ${r.base}`);
    const c = checkText(`${r.title} ${r.summary} ${r.learn}`);
    assert.deepEqual([c.violence, c.blocked, c.existing.length], [[], [], 0], `${r.title}`);
  }
  for (const t of THEMES) assert.equal(t.recs.length, 3, t.label);
  assert.equal(new Set(ALL_RECS.map((r) => r.id)).size, ALL_RECS.length, '추천 id 겹치지 않음');
});

test('관심사에 맞는 추천', () => {
  assert.deepEqual(titles('공룡이 좋아요'), ['공룡 화석 발굴대', '아기 공룡 키우기', '공룡 짝꿍 카드']);
  assert.ok(titles('바다').includes('바다 쓰레기 청소부'));
  const mix = titles('우주에서 요리하는 게임');
  assert.ok(mix.includes('외계인 우주 식당') && mix.includes('피자 분수 요리사'), '두 관심사 섞기');
  assert.equal(recommend('공룡 달리기 게임').recs[0].base, 'penguin-race', '놀이 방식을 말하면 그 방식이 먼저');
  assert.equal(recommend('달리기').recs.every((r) => r.base === 'penguin-race'), true, '방식만 말해도 추천');
  assert.deepEqual(titles(''), []);
});

test('이미 있는 게임·캐릭터: 그대로 추천하지 않고 좋아한 점을 살린 나만의 주제로', () => {
  for (const q of ['마인크래프트 같은 거 만들래', '포켓몬 잡기', '마인 크래프트', '쿠키런 같은 달리기', '엘사 나오는 게임', '레고로 집 짓기']) {
    const r = recommend(q);
    assert.ok(r.notices.some((n) => n.kind === 'existing'), `${q}: 안내`);
    assert.ok(r.recs.length > 0, `${q}: 대신 추천`);
    for (const rec of r.recs) for (const b of BRANDS) assert.ok(!`${rec.title}${rec.summary}`.includes(b), `${q} → ${rec.title} 에 ${b}`);
  }
  assert.ok(titles('마인크래프트').includes('블록 마을 건축가'));
});

test('폭력: 빼고 평화로운 주제로, 추천에 폭력 낱말 없음', () => {
  for (const q of ['총으로 좀비 죽이기', '총 쏘기 게임', '칼싸움', '피가 나는 전쟁 게임', '친구 때리기']) {
    const r = recommend(q);
    assert.ok(r.notices.some((n) => n.kind === 'violence'), `${q}: 안내`);
    assert.ok(r.recs.length > 0, `${q}: 평화로운 대신 추천`);
    for (const rec of r.recs) assert.deepEqual(checkText(`${rec.title} ${rec.summary}`).violence, [], rec.title);
  }
  assert.deepEqual(kinds('싸우는 로봇'), ['soft']);
});

test('학교에서 만들 수 없는 내용: 추천하지 않음', () => {
  for (const q of ['카지노 게임', '도박', '19금', '술 마시기', '현질 가챠 뽑기']) {
    const r = recommend(q);
    assert.deepEqual(r.notices.map((n) => n.kind), ['blocked'], q);
    assert.deepEqual(r.recs, [], q);
  }
});

test('띄어쓰기 때문에 엉뚱하게 걸리지 않음', () => {
  for (const q of ['커피가 좋아', '보고 어떤 게임', '점수 총 100점', '칼국수 요리', '성공하는 게임', '돌봄 교실']) {
    const c = checkText(q);
    assert.deepEqual([c.violence, c.blocked, c.existing.length], [[], [], 0], q);
  }
  assert.ok(!recommend('돌봄 교실').recs.some((r) => r.themeId === 'weather'), '"돌봄"은 "봄"(날씨)이 아님');
  assert.ok(checkText('총 쏘기').violence.length > 0, '띄어 써도 찾음');
});

test('아이디어가 없을 때: 서로 다른 관심사에서 6개', () => {
  let i = 0;
  const rand = () => ((i = (i * 9301 + 49297) % 233280) / 233280);
  const r = surprise(6, rand);
  assert.equal(r.length, 6);
  assert.equal(new Set(r.map((x) => x.themeId)).size, 6);
  assert.ok(r.every((x) => x.learn));
});

test('고른 주제가 기획서·프롬프트·인쇄에 들어감', () => {
  const rec = recommend('공룡').recs[0];
  const plan = emptyPlan(rec.base);
  plan.idea = ideaFromRec(rec, '공룡');
  const v = topicView(plan);
  assert.equal(v.name, '공룡 화석 발굴대');
  assert.equal(v.baseName, '보물섬 탐험대');
  assert.equal(v.hint.character, '아기 티라노');
  const p = buildAppPrompt(plan);
  assert.match(p, /공룡 화석 발굴대/);
  assert.match(p, /배울 내용\(교과 연계\): 과학 3~4학년 · 공룡의 몸 구조와 이름/);
  assert.match(p, /따라 하지 말고/);
  assert.match(planRows(plan)[0].value, /배움 요소/);
  // 저장·불러오기에서도 유지, 배움 요소 없는 주제는 버림
  assert.equal(normalizePlan(JSON.parse(JSON.stringify(plan))).idea.title, '공룡 화석 발굴대');
  assert.equal(normalizePlan({ ...plan, idea: { title: '배움 없음' } }).idea, null);
});

test('기획서 검사: 폭력·부적절·실제 게임 이름을 항목과 함께 알려 줌', () => {
  const plan = emptyPlan('fruit-bomb');
  assert.deepEqual(planSafety(plan), []);
  plan.f.appName = '포켓몬 과일 받기';
  plan.f.rulePlay = '총으로 폭탄을 쏴요';
  plan.f.extra = '황금 사과';
  const issues = planSafety(plan);
  assert.deepEqual(issues.map((i) => i.n), [1, 5]);
  assert.ok(issues[0].words.includes('포켓몬'));
  assert.ok(issues[1].words.includes('총으로'));
});

test('요청 1: 난이도는 쉬움·보통 두 단계, 예전 「도전」은 보통으로', () => {
  assert.deepEqual(DIFFICULTY.map((d) => d.id), ['easy', 'normal']);
  assert.equal(normalizePlan({ ...emptyPlan('fruit-bomb'), difficulty: 'hard' }).difficulty, 'normal');
});

test('요청 2: 기능·게임 요소는 3개까지, 규칙 칸은 짧게', () => {
  const inputs = SECTIONS.flatMap((s) => s.inputs);
  assert.equal(inputs.find((i) => i.key === 'features').max, MAX_PICK);
  assert.equal(inputs.find((i) => i.key === 'elements').max, MAX_PICK);
  for (const k of ['ruleStart', 'rulePlay', 'ruleWin', 'ruleLose', 'extra']) assert.ok(inputs.find((i) => i.key === k).max <= 80, k);
  const p = emptyPlan('fruit-bomb');
  p.f.features = ['이동하기', '고르기', '피하기', '점프하기', '조합하기'];
  p.f.rulePlay = '가'.repeat(500);
  const n = normalizePlan(JSON.parse(JSON.stringify(p)));
  assert.equal(n.f.features.length, 3);
  assert.equal(n.f.rulePlay.length, 80);
  assert.match(buildAppPrompt(n), /더 늘리지 마/);
});

test('요청 3: 게임은 한 판(1단계)만 — 레벨·스테이지 없음', () => {
  const opts = SECTIONS.flatMap((s) => s.inputs).find((i) => i.key === 'elements').options;
  assert.ok(!opts.includes('레벨') && !opts.includes('스테이지'));
  for (const t of TOPICS) {
    assert.ok(!t.elements.some((e) => /레벨|스테이지/.test(e)), t.name);
    assert.ok(!t.steps.some((s) => /다음 (단계|레벨|행성)/.test(s)), t.name);
  }
  assert.equal(normalizePlan({ ...emptyPlan('fruit-bomb'), f: { ...emptyPlan().f, elements: ['점수', '레벨', '스테이지'] } }).f.elements.join(), '점수');
  assert.match(buildAppPrompt(emptyPlan('fruit-bomb')), /한 판\(1단계\)만/);
});

test('요청 4: 모든 게임은 초등 교과와 연결 — 기본 방식·추천 모두 교과 연계, 기획서에 배울 내용 필수', () => {
  for (const t of TOPICS) assert.match(t.curr, /^(국어|수학|사회|과학|도덕|실과|체육|슬기로운 생활) (1~2|3~4|5~6)학년$/, t.name);
  const sec4 = SECTIONS.find((s) => s.n === 4);
  assert.ok(sec4.req && sec4.inputs.some((i) => i.key === 'learnGoal' && !i.optional));
  const p = emptyPlan('fruit-bomb');
  assert.match(buildAppPrompt(p), /초등학교 수업과 연결/);
  assert.match(buildAppPrompt(p), /수학 1~2학년/);
});

test('요청 5: 개인정보는 받지 않음 — 학년·반 칸 없음, 개인정보가 있으면 막음', () => {
  assert.ok(!SECTIONS.flatMap((s) => s.inputs).some((i) => i.key === 'classInfo'));
  assert.equal(normalizePlan({ ...emptyPlan('fruit-bomb'), f: { ...emptyPlan().f, classInfo: '3학년 2반' } }).f.classInfo, '');
  const cases = { '010-1234-5678': '전화번호', 'abc@naver.com': '이메일', '해솔초등학교': '학교 이름', '서울시 강남구': '주소', '101동 1203호': '주소', '3학년 2반': '학년·반', '2016년 3월 5일': '생일', '제 이름은 김민수': '진짜 이름' };
  for (const [q, label] of Object.entries(cases)) assert.ok(checkText(q).privacy.includes(label), q);
  for (const q of ['공룡 게임 3단계', '점수 100점', '초등학생 게임', '로켓 10번 발사']) assert.deepEqual(checkText(q).privacy, [], q);
  const p = emptyPlan('fruit-bomb');
  p.f.intro = '우리 해솔초등학교 친구들이 하는 게임';
  assert.deepEqual(planSafety(p).map((i) => i.n), [2]);
  p.f.developer = '김민수';
  assert.equal(planWarnings(p).length, 1, '진짜 이름 같으면 알려 줌');
  p.f.developer = '별빛코더';
  assert.equal(planWarnings(p).length, 0);
  assert.ok(recommend('제 이름은 박지호고 공룡이 좋아요').notices.some((n) => n.kind === 'privacy'));
});

test('그림 프롬프트는 모두 앱 월드 지도와 같은 컨셉 (쿼터뷰 픽셀아트·2등신 캐릭터·동그란 문장·건물 모습)', async () => {
  const { studentBoothPrompt, worldPrompts, PIXEL_STYLE, CHIBI_LOOK, BADGE_LOOK, BUILDING_LOOK } = await import('../shared/worldart.js');
  const { buildImagePrompts } = await import('../shared/plan.js');
  const p = emptyPlan('fruit-bomb');
  p.f.elements = ['코인', '생명'];
  const imgs = buildImagePrompts(p);
  for (const x of imgs) {
    assert.ok(x.text.includes(PIXEL_STYLE), `${x.title}: 같은 그림체 문장`);
    assert.match(x.text, /앱 월드 지도 그림이 있으면 그 그림의 그림체/, `${x.title}: 지도 그림 따라 하기`);
  }
  const { MAP_PRESETS, presetById } = await import('../shared/worldart.js');
  assert.ok(imgs.every((x) => x.key.startsWith('icon') || x.text.includes(MAP_PRESETS[0].world)), '배경·주인공에 기본 지도 세계관');
  // 선생님이 고른 지도의 구역과 이어지기
  p.f.place = '용암이 흐르는 화산 마을';
  const bg = (id) => buildImagePrompts(p, { preset: presetById(id) }).find((x) => x.key === 'background').text;
  assert.match(bg('seasons'), /「용암이 흐르는 화산」 구역/);
  assert.ok(bg('seasons').includes(presetById('seasons').world));
  assert.match(bg('castle'), /새로 생긴 작은 구역/, '그 지도에 없는 구역이면 새 구역으로');
  assert.match(bg('river'), /노란 별이 달린 보라색 깃발 가로등/, '지도 소품을 넣어 같은 섬처럼');
  assert.ok(imgs.find((x) => x.key === 'hero').text.includes(CHIBI_LOOK), '주인공은 앱 월드 아이들과 같은 2등신');
  assert.ok(imgs.filter((x) => x.key.startsWith('icon')).every((x) => x.text.includes(BADGE_LOOK)), '아이콘은 동그란 문장 모양');
  const booth = studentBoothPrompt({ appName: '과일 비', topicName: '과일 폭탄 잡기', cat: 'action', summary: '과일 받기' });
  assert.ok(booth.includes(BUILDING_LOOK) && booth.includes(PIXEL_STYLE), '학생 부스 = 앱 월드 건물 모습');
  for (const a of worldPrompts({})) assert.ok(a.prompt.includes(PIXEL_STYLE), `${a.key}: 월드 그림도 같은 그림체`);
  assert.match(PIXEL_STYLE, /쿼터뷰/); assert.match(PIXEL_STYLE, /흙 절벽/);
});
