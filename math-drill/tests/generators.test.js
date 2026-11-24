// 연산 문제은행 — 모든 단원·난이도의 문제를 만들어 보고, 정답을 생성기와 따로 다시 계산해 확인해요.
// 실행: cd math-drill && npm test   (node 18 이상, 설치할 것 없음)
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { UNITS } = require('../js/units.js');
const { G, makeProblems } = require('../js/generators.js');

/* ---------- 독립 계산기: 정확한 유리수(BigInt) 또는 실수 ---------- */
const bgcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
function Rat(n, d = 1n) { if (d === 0n) throw new Error('0으로 나눔'); if (d < 0n) { n = -n; d = -d; } const g = bgcd(n, d) || 1n; return { n: n / g, d: d / g }; }
const EX = {
  num(s) { const [i, f = ''] = s.split('.'); return Rat(BigInt(i + f), 10n ** BigInt(f.length)); },
  add: (a, b) => Rat(a.n * b.d + b.n * a.d, a.d * b.d),
  sub: (a, b) => Rat(a.n * b.d - b.n * a.d, a.d * b.d),
  mul: (a, b) => Rat(a.n * b.n, a.d * b.d),
  div: (a, b) => Rat(a.n * b.d, a.d * b.n),
  neg: (a) => Rat(-a.n, a.d),
  pow(a, b) { if (b.d !== 1n) throw new Error('지수'); let r = Rat(1n); const k = b.n < 0n ? -b.n : b.n; for (let i = 0n; i < k; i++) r = EX.mul(r, a); return b.n < 0n ? EX.div(Rat(1n), r) : r; },
  fn() { throw new Error('exact 불가'); },
  pi() { throw new Error('exact 불가'); },
  isNeg: (a) => a.n < 0n,
};
const FL = {
  num: (s) => Number(s), add: (a, b) => a + b, sub: (a, b) => a - b, mul: (a, b) => a * b, div: (a, b) => a / b, neg: (a) => -a, pow: (a, b) => Math.pow(a, b),
  fn(name, v) { const r = v * Math.PI / 180; return { sqrt: Math.sqrt(v), sin: Math.sin(r), cos: Math.cos(r), tan: Math.tan(r) }[name]; },
  pi: () => Math.PI, isNeg: (a) => a < -1e-12,
};
function evaluate(src, A, vars, opt) {
  vars = vars || {}; opt = opt || {};
  const toks = src.match(/\d+(?:\.\d+)?|[a-z]+|[-+*/^()]/g); let i = 0;
  if (toks.join('') !== src.replace(/\s+/g, '')) throw new Error('읽을 수 없는 식: ' + src);
  const peek = () => toks[i];
  function atom() {
    const t = toks[i++];
    if (t === '(') { const v = expr(); if (toks[i++] !== ')') throw new Error(') 없음'); return v; }
    if (t === '-') return A.neg(power());
    if (/^\d/.test(t)) return A.num(t);
    if (t === 'pi') return A.pi();
    if (['sqrt', 'sin', 'cos', 'tan'].includes(t)) { i++; const v = expr(); i++; return A.fn(t, v); }
    if (t in vars) return vars[t];
    throw new Error('모르는 글자: ' + t);
  }
  function power() { const b = atom(); if (peek() === '^') { i++; return A.pow(b, power()); } return b; }
  function term() { let v = power(); while (peek() === '*' || peek() === '/') { const o = toks[i++]; const w = power(); v = o === '*' ? A.mul(v, w) : A.div(v, w); } return v; }
  function expr() {
    let v = term();
    while (peek() === '+' || peek() === '-') {
      const o = toks[i++]; const w = term(); v = o === '+' ? A.add(v, w) : A.sub(v, w);
      if (opt.natural && A.isNeg(v)) throw new Error('초등 계산 중간에 음수가 나와요: ' + src);
    }
    return v;
  }
  const v = expr(); if (i !== toks.length) throw new Error('남은 글자: ' + src); return v;
}
const ex = (s, vars, opt) => evaluate(s, EX, vars, opt);
const fl = (s, vars) => evaluate(s, FL, vars);
const req = (a, b) => a.n === b.n && a.d === b.d;
const exVars = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, ex(v)]));
const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return Math.abs(a); };
const isPrime = (p) => { if (p < 2) return false; for (let k = 2; k * k <= p; k++) if (p % k === 0) return false; return true; };

/* ---------- 그림 확인 ---------- */
function lineEnd(svg, cls) { const m = svg.match(new RegExp('<line x1="([\\d.]+)" y1="([\\d.]+)" x2="([-\\d.]+)" y2="([-\\d.]+)"[^>]*class="' + cls + '"')); assert.ok(m, cls + ' 바늘'); return m.slice(1).map(Number); }
function clockOf(svg) {
  const ang = (l) => ((Math.atan2(l[2] - l[0], -(l[3] - l[1])) * 180 / Math.PI) + 360) % 360;
  const am = ang(lineEnd(svg, 'mh')), ah = ang(lineEnd(svg, 'hh'));
  const m = Math.round(am / 6) % 60; const h = Math.floor((ah - m * 0.5 + 1) / 30) % 12 || 12;
  assert.ok(Math.abs(((h % 12) * 30 + m * 0.5) - ah) < 1.5, '시침 위치가 분과 맞아야 해요');
  return [h, m];
}
function triAngles(svg) {
  const m = svg.match(/<polygon points="([^"]+)"[^>]*class="tri"/); assert.ok(m, '삼각형');
  const p = m[1].trim().split(' ').map((s) => s.split(',').map(Number));
  return p.map((v, i) => { const a = p[(i + 1) % 3], b = p[(i + 2) % 3]; const u = [a[0] - v[0], a[1] - v[1]], w = [b[0] - v[0], b[1] - v[1]]; return Math.acos((u[0] * w[0] + u[1] * w[1]) / Math.hypot(...u) / Math.hypot(...w)) * 180 / Math.PI; });
}
// 정답 HTML 안의 분수가 기약분수인지
function fracsIn(html) { return [...html.matchAll(/<span class="nu">(\d+)<\/span><span class="de">(\d+)<\/span>/g)].map((m) => [Number(m[1]), Number(m[2])]); }

/* ---------- 문제 하나 검사 ---------- */
function check(u, p) {
  const c = p.chk, nat = u.school === '초';
  for (const k of ['q', 'ans']) assert.ok(typeof p[k] === 'string' && p[k].length, k + ' 비어 있음');
  for (const s of [p.q, p.ans, p.svg]) assert.ok(!/undefined|NaN|Infinity|null|\[object/.test(s), '이상한 글자: ' + s.slice(0, 120));
  if (c.labels) for (const l of c.labels) assert.ok(p.svg.includes(l), '그림에 "' + l + '" 표시가 있어야 해요');
  if (c.clock) assert.deepEqual(clockOf(p.svg), c.clock);
  switch (c.t) {
    case 'num': {
      const v = ex(c.expr, exVars(c.vars), { natural: nat });
      assert.ok(req(v, ex(c.val)), c.expr + ' = ' + c.val + ' 가 맞아야 해요');
      if (c.int) assert.equal(v.d, 1n, '나누어떨어져야 해요: ' + c.expr);
      if (nat) assert.ok(v.n >= 0n, '초등 답은 0 이상');
      if (c.pct) assert.ok(req(ex(c.pct), EX.mul(v, Rat(100n))), '백분율');
      if (c.tri) { const a = triAngles(p.svg); c.tri.forEach((t, i) => assert.ok(Math.abs(a[i] - t) < 0.6, '삼각형 그림의 각 ' + t)); assert.equal(c.tri[0] + c.tri[1] + c.tri[2], 180); }
      if (c.dots) assert.equal((p.svg.match(/class="dot"/g) || []).length, c.dots, '점 개수');
      if (c.nline) assert.ok(p.svg.includes('>' + c.nline[0] + '<') && p.svg.includes('>' + (c.nline[0] + 1) + '<'), '수직선 눈금');
      break;
    }
    case 'eq': {
      const x = ex(c.x); assert.ok(req(ex(c.lhs, { x }), ex(c.rhs, { x })), c.lhs + ' = ' + c.rhs + ' (x=' + c.x + ')');
      if (nat) assert.ok(x.n >= 0n);
      break;
    }
    case 'clock': assert.deepEqual(clockOf(p.svg), [c.h, c.m]); assert.equal(p.ans, c.h + '시' + (c.m ? ' ' + c.m + '분' : '')); break;
    case 'later': { const t = c.h * 60 + c.m + c.k; let h2 = Math.floor(t / 60) % 12 || 12; assert.deepEqual([h2, t % 60], [c.h2, c.m2]); break; }
    case 'divmod': assert.equal(c.a, c.b * c.q + c.r); assert.ok(c.r >= 0 && c.r < c.b); assert.ok(p.ans.includes('몫: ' + c.q)); break;
    case 'divisors': { const l = []; for (let k = 1; k <= c.n; k++) if (c.n % k === 0) l.push(k); assert.equal(p.ans, l.join(', ')); break; }
    case 'multiples': assert.equal(p.ans, [1, 2, 3, 4, 5].map((k) => k * c.n).join(', ')); break;
    case 'gcd': case 'lcm': case 'gcdlcm': {
      const g = c.nums.reduce(gcd), l = c.nums.reduce((a, b) => a * b / gcd(a, b));
      if (c.t === 'gcd') assert.equal(c.val, g); else if (c.t === 'lcm') assert.equal(c.val, l); else { assert.equal(c.g, g); assert.equal(c.l, l); }
      assert.ok(p.ans.includes(String(c.t === 'lcm' ? l : g)));
      break;
    }
    case 'common': { const L = c.f[0][1] * c.f[1][1] / gcd(c.f[0][1], c.f[1][1]); c.f.forEach((f, i) => { assert.equal(f[0] * c.g[i][1], c.g[i][0] * f[1]); assert.equal(c.g[i][1], L); }); break; }
    case 'cmp': { const d = EX.sub(ex(c.a), ex(c.b)); assert.equal(c.op, d.n > 0n ? '>' : '<'); assert.notEqual(d.n, 0n); break; }
    case 'fracfig': assert.equal((p.svg.match(/class="part on"/g) || []).length, c.n); assert.equal((p.svg.match(/class="part/g) || []).length, c.d); break;
    case 'ratio': assert.ok(req(EX.div(ex(c.a), ex(c.b)), Rat(BigInt(c.p), BigInt(c.q)))); assert.equal(gcd(c.p, c.q), 1); break;
    case 'share': assert.equal(c.x + c.y, c.N); assert.equal(c.x * c.q, c.y * c.p); assert.ok(Number.isInteger(c.x) && Number.isInteger(c.y)); break;
    case 'pfac': { assert.equal(c.f.reduce((a, [q, e]) => a * q ** e, 1), c.n); c.f.forEach(([q], i) => { assert.ok(isPrime(q)); if (i) assert.ok(q > c.f[i - 1][0]); }); break; }
    case 'ndiv': { let k = 0; for (let j = 1; j <= c.n; j++) if (c.n % j === 0) k++; assert.equal(c.val, k); break; }
    case 'poly': {
      for (const [x, y] of [[2, 3], [-3, 5], [7, -2], [0.5, 1.5], [-1.25, -4]]) {
        const vars = { x: ex(String(Math.abs(x))), y: ex(String(Math.abs(y))) };
        if (x < 0) vars.x = EX.neg(vars.x); if (y < 0) vars.y = EX.neg(vars.y);
        assert.ok(req(ex(c.expr, vars), ex(c.val, vars)), c.expr + ' ≡ ' + c.val);
      }
      if (c.factored) assert.ok(/\*\(|\)\*|\^2/.test(c.val), '인수분해된 꼴(곱)');
      break;
    }
    case 'approx': {
      assert.ok(Math.abs(fl(c.expr) - fl(c.val)) < 1e-9, c.expr + ' ≈ ' + c.val);
      for (const m of c.val.matchAll(/sqrt\((\d+)\)/g)) { const n = Number(m[1]); for (let k = 2; k * k <= n; k++) assert.ok(n % (k * k), '근호 안을 더 간단히: ' + n); }
      break;
    }
    case 'ineq': {
      const k = ex(c.k), eps = Rat(1n, 7n), cmp = (a, b, o) => { const d = EX.sub(a, b).n; return o === '<' ? d < 0n : o === '>' ? d > 0n : o === '<=' ? d <= 0n : d >= 0n; };
      for (const x of [EX.sub(k, eps), k, EX.add(k, eps), EX.add(k, Rat(5n)), EX.sub(k, Rat(5n))]) assert.equal(cmp(ex(c.lhs, { x }), ex(c.rhs, { x }), c.op), cmp(x, k, c.sop), '부등식 ' + c.lhs + c.op + c.rhs);
      break;
    }
    case 'sys': {
      const x = ex(c.x), y = ex(c.y);
      c.eqs.forEach(([l, r]) => assert.ok(req(ex(l, { x, y }), ex(r, { x, y })), l + ' = ' + r));
      const co = ([l, r]) => { const f = (a, b) => EX.sub(ex(l, { x: Rat(BigInt(a)), y: Rat(BigInt(b)) }), ex(r, { x: Rat(0n), y: Rat(0n) })); const f0 = f(0, 0); return [EX.sub(f(1, 0), f0), EX.sub(f(0, 1), f0)]; };
      const [a1, b1] = co(c.eqs[0]), [a2, b2] = co(c.eqs[1]);
      assert.notEqual(EX.sub(EX.mul(a1, b2), EX.mul(a2, b1)).n, 0n, '해가 하나뿐이어야 해요');
      break;
    }
    case 'quad': {
      const f = (x) => fl(c.expr, { x });
      const a = (f(1) + f(-1)) / 2 - f(0), b = (f(1) - f(-1)) / 2, cc = f(0), D = b * b - 4 * a * cc;
      assert.ok(Math.abs(a) > 1e-9, '이차식');
      assert.equal(c.roots.length, Math.abs(D) < 1e-9 ? 1 : 2, '근의 개수');
      c.roots.forEach((r) => assert.ok(Math.abs(f(fl(r))) < 1e-7, '근 ' + r));
      if (c.roots.length === 2) assert.ok(Math.abs(fl(c.roots[0]) - fl(c.roots[1])) > 1e-9);
      break;
    }
    case 'rep': {
      const all = BigInt(c.nr + c.rp), head = BigInt(c.nr || '0'), den = (10n ** BigInt(c.rp.length) - 1n) * 10n ** BigInt(c.nr.length);
      const v = EX.add(Rat(BigInt(c.ip)), Rat(all - head, den));
      assert.ok(req(v, ex(c.val)), '순환소수 값');
      const approx = Number(c.ip + '.' + c.nr + c.rp.repeat(12)); assert.ok(Math.abs(approx - fl(c.val)) < 1e-9);
      break;
    }
    case 'pyth': assert.equal(c.a * c.a + c.b * c.b, c.c * c.c); assert.equal(c.val, c[c.ask]); break;
    case 'trig': { const opp = c.at === 'A' ? c.a : c.b, adj = c.at === 'A' ? c.b : c.a; const v = { sin: [opp, c.c], cos: [adj, c.c], tan: [opp, adj] }[c.fn]; assert.ok(req(ex(c.val), Rat(BigInt(v[0]), BigInt(v[1])))); assert.equal(c.a * c.a + c.b * c.b, c.c * c.c); break; }
    default: assert.fail('검산 방법이 없어요: ' + c.t);
  }
  if (!u.unreduced && !c.unreduced) for (const [n, d] of fracsIn(p.ans)) assert.equal(gcd(n, d), 1, '기약분수로: ' + n + '/' + d);
}

test('단원 목록과 생성기가 짝이 맞아요', () => {
  const ids = UNITS.map((u) => u.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.equal(typeof G[id], 'function', id);
  for (const id of Object.keys(G)) assert.ok(ids.includes(id), id + ' 단원 정보');
  for (const u of UNITS) { assert.ok(['초', '중'].includes(u.school)); assert.ok(u.grade >= 1 && u.grade <= (u.school === '초' ? 6 : 3)); assert.ok([1, 2].includes(u.sem)); assert.ok(u.unit && u.inst); }
});

let total = 0;
for (const u of UNITS) {
  test(`${u.school}${u.grade}-${u.sem} ${u.unit}: 세 난이도 모두 정답이 맞아요`, () => {
    let figs = 0;
    for (const lv of [1, 2, 3]) {
      for (const seed of ['1', '2024', '77777', 'abc']) {
        const ps = makeProblems(u.id, lv, 30, seed);
        assert.equal(ps.length, 30);
        ps.forEach((p, i) => { try { check(u, p); } catch (e) { e.message = `[${u.id} 난이도${lv} 시드${seed} ${i + 1}번] ` + e.message + '\n문제: ' + p.q.replace(/<[^>]+>/g, '') + '\n답: ' + p.ans.replace(/<[^>]+>/g, ''); throw e; } if (p.svg) figs++; });
        total += ps.length;
      }
    }
    if (u.fig) assert.ok(figs > 0, '그림 문제가 있어야 해요');
  });
}

test('같은 시드면 같은 문제, 다른 시드면 다른 문제', () => {
  for (const u of UNITS) {
    const a = makeProblems(u.id, 2, 10, '555'), b = makeProblems(u.id, 2, 10, '555'), c = makeProblems(u.id, 2, 10, '556');
    assert.deepEqual(a, b);
    assert.notDeepEqual(a.map((p) => p.q + p.svg), c.map((p) => p.q + p.svg), u.id);
  }
  // 문제 수만 늘리면 앞 문제는 그대로
  assert.deepEqual(makeProblems('e51_fracaddsub', 3, 10, '9'), makeProblems('e51_fracaddsub', 3, 20, '9').slice(0, 10));
});

test('검산한 문제 수', () => { assert.ok(total >= UNITS.length * 360); console.log('검산한 문제 수: ' + total); });
