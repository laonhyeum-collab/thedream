// 수학 개념 — 개념 데이터가 문제은행 단원과 같은 id 를 쓰는지, 1차(초1 연산) 단원이 모두 채워졌는지 확인해요.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { UNITS } = require('../js/units.js');
const { CONCEPTS } = require('../js/concepts.js');

test('개념 단원 id 는 모두 문제은행(units.js)에 있는 단원', () => {
  const ids = new Set(UNITS.map((u) => u.id));
  for (const id of Object.keys(CONCEPTS)) assert.ok(ids.has(id), '없는 단원 id: ' + id);
});

test('1차: 초1 연산 단원은 모두 개념이 있어요', () => {
  for (const u of UNITS.filter((x) => x.school === '초' && x.grade === 1)) assert.ok(CONCEPTS[u.id], '개념 없음: ' + u.id);
});

test('단원마다 개념 3~5줄 · 그림 1~2개 · 예제 1개(풀이·답)', () => {
  for (const [id, c] of Object.entries(CONCEPTS)) {
    assert.ok(c.lines.length >= 3 && c.lines.length <= 5, id + ' 줄 수');
    assert.ok(c.figs.length >= 1 && c.figs.length <= 2, id + ' 그림 수');
    for (const f of c.figs) assert.match(f, /^<svg [^>]*role="img"[^>]*aria-label="[^"]+"/, id + ' 그림 SVG');
    assert.ok(c.ex.q && c.ex.ans && c.ex.steps.length >= 2, id + ' 예제');
  }
});

test('예제 답이 맞아요', () => {
  assert.equal(CONCEPTS.e11_addsub.ex.ans, String(6 - 2));
  assert.equal(CONCEPTS.e12_addsub1.ex.ans, String(45 - 21));
  assert.equal(CONCEPTS.e12_addsub2.ex.ans, String(9 + 4));
  assert.equal(CONCEPTS.e12_clock.ex.ans, '4시 30분');
});

test('2차(대표님 순서): 중1 → 초6 → 초4 단원은 모두 개념이 있어요', () => {
  const want = UNITS.filter((x) => (x.school === '중' && x.grade === 1) || (x.school === '초' && (x.grade === 6 || x.grade === 4)));
  assert.equal(want.length, 20);
  for (const u of want) assert.ok(CONCEPTS[u.id], '개념 없음: ' + u.id);
});

test('2차 예제 답을 다시 계산해 봐요', () => {
  // 중1
  assert.equal(2 ** 3 * 3 ** 2, 72); assert.equal((3 + 1) * (2 + 1), 12);
  assert.equal(-4 - 6 + 3, -7); assert.equal(CONCEPTS.m11_intaddsub.ex.ans, '−7');
  assert.equal((-2) ** 2 * -3 + 12 / -4, -15); assert.equal(CONCEPTS.m11_intmuldiv.ex.ans, '−15');
  assert.equal(2 * 3 - 3 * -2, Number(CONCEPTS.m11_expr.ex.ans));
  assert.equal(3 * (5 - 2), 5 + 4); assert.equal(CONCEPTS.m11_lineq.ex.ans, 'x = 5');
  assert.equal(180 - 65, 115); assert.equal(180 * (8 - 2) / 8, 135); assert.equal(8 * (8 - 3) / 2, 20);
  assert.equal(2 * 6 * 120 / 360, 4); assert.equal(36 * 120 / 360, 12);
  // 초6
  assert.equal(8 / 3 / 4, 2 / 3); assert.equal(CONCEPTS.e61_fracdiv.ex.ans, '2/3');
  assert.equal(Math.round(9.6 / 4 * 100) / 100, 2.4);
  assert.equal(7 / 20 * 100, 35);
  assert.equal(5 * 3 * 4, 60); assert.equal((15 + 20 + 12) * 2, 94);
  assert.equal(1.5 / (3 / 8), 4); assert.equal(Math.round(7.2 / 0.6), 12); assert.equal(3 * 20 / 5, 12);
  assert.equal(Math.round(4 * 4 * 3.14 * 100) / 100, 50.24);
  // 초4
  assert.equal(180 - 50 - 75, 55); assert.equal(214 * 23, 4922); assert.equal(Math.floor(375 / 16), 23); assert.equal(375 % 16, 7);
  assert.equal(4 + 7, 11); assert.equal(Math.round((4.7 + 2.85) * 100) / 100, 7.55);
});
