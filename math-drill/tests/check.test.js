// 화면으로 풀기 채점: 모든 단원의 정답은 맞음, 숫자 하나 바꾼 답은 틀림, 학생이 흔히 쓰는 모양도 맞음
const test = require('node:test');
const assert = require('node:assert');
const GEN = require('../js/generators.js');
const U = require('../js/units.js');
const CK = require('../js/check.js');
const UNITS = U.UNITS || U;

test('모든 단원 × 난이도 × 시드: 정답은 맞음, 숫자 하나 바꾼 답은 틀림', () => {
  for (const u of UNITS) for (const d of [1, 2, 3]) for (const s of ['1', '22', '333', '4444']) {
    for (const p of GEN.makeProblems(u.id, d, 10, s)) {
      const t = CK.ansText(p.ans).replace(/_/g, ' ');
      assert.ok(CK.isCorrect(p, t), u.id + ' 정답 ' + t);
      const w = t.replace(/\d(?!.*\d)/, (m) => String((+m + 1) % 10));
      if (w !== t) assert.ok(!CK.isCorrect(p, w), u.id + ' 오답 ' + w);
    }
  }
});

test('학생이 쓰는 여러 모양', () => {
  const p = (u, i) => GEN.makeProblems(u, 2, 4, '123')[i];
  const ok = (u, i, v) => assert.ok(CK.isCorrect(p(u, i), v), u + ' ' + v);
  const no = (u, i, v) => assert.ok(!CK.isCorrect(p(u, i), v), u + ' ' + v);
  ok('e11_addsub', 3, '4'); ok('e11_addsub', 3, '4명');
  ok('e32_div', 0, '2, 4'); no('e32_div', 0, '4, 2');
  ok('e12_clock', 0, '9:30'); ok('e12_clock', 0, '9시30분');
  ok('m11_expr', 0, '-7x + 3'); ok('m21_ineq', 0, 'x>=-3');
  ok('e61_ratio', 0, '0.15'); ok('e61_ratio', 0, '15%');
  ok('e42_frac', 0, '7 7/10'); no('e42_frac', 0, '77/10');
  ok('m31_quad', 0, '4, -7'); ok('m31_quad', 0, '-7, 4');
  ok('m11_lineq', 0, '9'); ok('m31_expand', 0, 'x²-1'); ok('m31_sqrt', 1, '10√2');
  no('e11_addsub', 0, ''); no('m31_expand', 0, 'x^2+1');
});
