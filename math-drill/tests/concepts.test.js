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
