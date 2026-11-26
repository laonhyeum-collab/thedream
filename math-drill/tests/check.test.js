// 연산 문제은행 — '화면으로 바로 풀기' 채점 확인
// 모든 단원 × 난이도 × 시드에서 정답을 글자로 쳐 넣으면 맞음, 틀린 답은 틀림이 나와야 해요.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { UNITS } = require('../js/units.js');
const { makeProblems } = require('../js/generators.js');
const C = require('../js/check.js');

const SEEDS = ['1', '42', '777', '2026'];
function each(fn) {
  for (const u of UNITS) for (const lv of [1, 2, 3]) for (const s of SEEDS) makeProblems(u.id, lv, 10, s).forEach((p, i) => fn(p, u.id + '/' + lv + '/' + s + '#' + (i + 1)));
}

test('정답 글자에 HTML이 남지 않아요', () => {
  each((p, where) => { const a = C.ansText(p.ans); assert.ok(a && !/[<>]\w|&\w+;/.test(a.replace(/[<>]=?\s*-?\d/g, '')), where + ': ' + a); });
});

test('정답을 그대로 쳐 넣으면 맞음', () => {
  each((p, where) => assert.ok(C.grade(C.ansText(p.ans), p), where + ': ' + C.ansText(p.ans)));
});

test('정답 숫자를 1 바꾸면 틀림', () => {
  let n = 0;
  each((p, where) => {
    const a = C.ansText(p.ans);
    const m = /\d+/.exec(a); if (!m) return;
    const wrong = a.slice(0, m.index) + String(Number(m[0]) + 1) + a.slice(m.index + m[0].length);
    if (C.mode(p) === 'set' || C.mode(p) === 'name') return; // ±·두 답은 아래에서 따로
    assert.equal(C.grade(wrong, p), false, where + ': ' + a + ' → ' + wrong); n++;
  });
  assert.ok(n > 1000);
});

test('빈칸·엉뚱한 답은 틀림', () => {
  each((p) => { assert.equal(C.grade('', p), false); assert.equal(C.grade('모르겠어요', p), false); });
});

test('여러 가지로 쓴 답도 맞음', () => {
  const P = (ans, t) => ({ ans, chk: { t } });
  const fr = (n, d) => '<span class="fr"><span class="nu">' + n + '</span><span class="de">' + d + '</span></span>';
  assert.ok(C.grade('1 4/10', P('<span class="mx">1' + fr(4, 10) + '</span>', 'num')));
  assert.ok(C.grade('1과 4/10', P('<span class="mx">1' + fr(4, 10) + '</span>', 'num')));
  assert.equal(C.grade('14/10', P('<span class="mx">1' + fr(4, 10) + '</span>', 'num')), false);
  assert.equal(C.grade('2/3', P(fr(4, 6), 'fracfig')), false);
  assert.ok(C.grade('7 24', P('몫: 7, 나머지: 24', 'divmod')));
  assert.ok(C.grade('18', P('몫: 18', 'divmod')));
  assert.ok(C.grade('5m 81cm', P('5 m 81 cm', 'num')));
  assert.ok(C.grade('13.20', P('13.2', 'num')));
  assert.ok(C.grade('-9', P('−9', 'num')));
  assert.ok(C.grade('9', P('<i>x</i> = 9', 'eq')));
  assert.ok(C.grade('6, -7', P('<i>x</i> = −7 또는 <i>x</i> = 6', 'quad')));
  assert.ok(C.grade('x=+-10', P('<i>x</i> = ±10', 'quad')));
  assert.equal(C.grade('10', P('<i>x</i> = ±10', 'quad')), false);
  assert.ok(C.grade('±루트3', P('<i>x</i> = ±√<span class="rad">3</span>', 'quad')));
  assert.equal(C.grade('±3', P('<i>x</i> = ±√<span class="rad">3</span>', 'quad')), false);
  assert.ok(C.grade('(x+8)(x-5)', P('(<i>x</i> − 5)(<i>x</i> + 8)', 'poly')));
  assert.ok(C.grade('x²-4x-21', P('<i>x</i><sup>2</sup> − 4<i>x</i> − 21', 'poly')));
  assert.ok(C.grade('x >= -4', P('<i>x</i> ≥ −4', 'ineq')));
  assert.equal(C.grade('x > -4', P('<i>x</i> ≥ −4', 'ineq')), false);
  assert.ok(C.grade('2^2*3', P('2<sup>2</sup> × 3', 'pfac')));
  assert.ok(C.grade('2²×3', P('2<sup>2</sup> × 3', 'pfac')));
  assert.equal(C.grade('2*2*3', P('2<sup>2</sup> × 3', 'pfac')), false);
  assert.ok(C.grade('9π/4', P(fr(9, 4) + 'π cm', 'approx')));
  assert.ok(C.grade('9/4pi', P(fr(9, 4) + 'π cm', 'approx')));
  assert.equal(C.grade('9/4', P(fr(9, 4) + 'π cm', 'approx')), false);
  assert.ok(C.grade('2루트6', P('2√<span class="rad">6</span>', 'approx')));
  assert.equal(C.grade('2, 6', P('2√<span class="rad">6</span>', 'approx')), false);
  assert.ok(C.grade('0.3(7)', P('0.3<span class="dot">7</span>', 'rep')));
  assert.ok(C.grade('0.(518)', P('0.<span class="dot">5</span>1<span class="dot">8</span>', 'rep')));
  assert.equal(C.grade('0.37', P('0.3<span class="dot">7</span>', 'rep')), false);
  assert.ok(C.grade('민재', P('민재 (' + fr(1, 9) + ' &lt; ' + fr(1, 4) + ')', 'cmp')));
  assert.equal(C.grade('수아', P('민재 (' + fr(1, 9) + ' &lt; ' + fr(1, 4) + ')', 'cmp')), false);
  assert.ok(C.grade('1/x^3', P(fr(1, '<i>x</i><sup>3</sup>'), 'poly')));
});
