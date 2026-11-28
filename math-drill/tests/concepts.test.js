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

test('3차(나머지 학년): 초2·초3·초5·중2·중3 — 이제 모든 단원에 개념이 있어요', () => {
  const want = UNITS.filter((x) => (x.school === '초' && [2, 3, 5].includes(x.grade)) || (x.school === '중' && [2, 3].includes(x.grade)));
  assert.equal(want.length, 33);
  for (const u of want) assert.ok(CONCEPTS[u.id], '개념 없음: ' + u.id);
  for (const u of UNITS) assert.ok(CONCEPTS[u.id], '개념 없음: ' + u.id);
});

test('3차 예제 답을 다시 계산해 봐요', () => {
  const r2 = (v) => Math.round(v * 1e6) / 1e6;
  // 초2
  assert.equal(63 - 28, 35); assert.equal(5 * 6, 30); assert.equal(42 / 7, 6);
  assert.equal(270 + 150, 420); assert.equal(CONCEPTS.e22_length.ex.ans, '4 m 20 cm');
  assert.equal((8 * 60 + 40 + 30) / 60 | 0, 9); assert.equal((8 * 60 + 40 + 30) % 60, 10);
  // 초3
  assert.equal(503 - 248, 255); assert.equal(42 / 6, 7); assert.equal(47 * 6, 282);
  assert.equal((5 * 60 + 20) - (2 * 60 + 45), 2 * 60 + 35); assert.equal(358 + 267, 625);
  assert.equal(34 * 25, 850); assert.equal(245 * 4, 980); assert.equal(Math.floor(157 / 4), 39); assert.equal(157 % 4, 1);
  assert.equal(14 / 2, 7); assert.equal(3 * 5 + 2, 17);
  // 초5
  assert.equal(36 / 4 + 5 * 3 - 7, 17); assert.equal(24 - 3 * (2 + 4), 6);
  assert.ok(5 / 6 > 3 / 4); assert.equal(r2(2.25 - (1 + 5 / 6)), r2(5 / 12));
  assert.equal((4 + 8) * 5 / 2, 30); assert.equal(r2((4 / 3) * (9 / 4)), 3); assert.equal(r2(3.6 * 2.5), 9);
  assert.equal(88 * 3 - 85 - 90, 89); assert.equal((4 + 7 + 5 + 8) / 4, 6);
  // 중2
  assert.equal(r2(41 / 90), r2(0.45555555555)); assert.equal(r2(3 / 11), r2(0.272727272727));
  assert.equal(2 * 3 + 2, 8); assert.equal(3 - 2, 1);
  assert.equal(Math.sqrt(169 - 25), 12);
  // 중3
  assert.equal(r2(Math.sqrt(18) + Math.sqrt(8) - 6 / Math.sqrt(2)), r2(2 * Math.sqrt(2)));
  for (const x of [-2, 0, 1, 5]) { assert.equal((2 * x - 3) ** 2, 4 * x * x - 12 * x + 9); assert.equal(x * x - x - 12, (x - 4) * (x + 3)); }
  const x1 = (-3 + Math.sqrt(13)) / 2; assert.ok(Math.abs(x1 * x1 + 3 * x1 - 1) < 1e-9);
  assert.equal(0.5 * 0.5 + 1, 5 / 4);
});
