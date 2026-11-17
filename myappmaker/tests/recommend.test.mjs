// 주제 추천: 관심사에 맞게 추천하고, 이미 있는 게임·폭력·부적절한 내용·배움 없는 주제는 내보내지 않는지
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommend, surprise, checkText, ALL_RECS, THEMES, ideaFromRec } from '../shared/recommend.js';
import { topicById } from '../shared/topics.js';
import { emptyPlan, normalizePlan, topicView, planSafety, buildAppPrompt, planRows } from '../shared/plan.js';

const titles = (q) => recommend(q).recs.map((r) => r.title);
const kinds = (q) => recommend(q).notices.map((n) => n.kind);
const BRANDS = ['마인크래프트', '포켓몬', '피카츄', '마리오', '쿠키런', '브롤스타즈', '배그', '로블록스', '레고', '엘사', '아이언맨'];

test('모든 추천: 배움 요소가 있고, 기본 게임 방식이 있고, 걸러 낼 말·실제 게임 이름이 없음', () => {
  assert.ok(ALL_RECS.length >= 80);
  for (const r of ALL_RECS) {
    assert.ok(r.learn && r.learn.length >= 4, `${r.title}: 배움 요소`);
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
  assert.match(p, /배움 요소: 공룡의 몸 구조와 이름/);
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
