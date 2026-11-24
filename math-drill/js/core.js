/* 연산 문제은행 — 공통 도구 (난수·분수·다항식·근호·글자 모양·그림)
 * 브라우저에서는 window.MD 로, node 에서는 require() 로 써요. 외부 라이브러리 없음. */
(function (root) {
  'use strict';

  /* ---------- 시드 난수 ---------- */
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(seedStr) {
    const r = mulberry32(hashStr(String(seedStr)));
    const R = {
      f: r,
      int(a, b) { return a + Math.floor(r() * (b - a + 1)); },
      pick(arr) { return arr[Math.floor(r() * arr.length)]; },
      nz(a, b) { let v; do { v = R.int(a, b); } while (v === 0); return v; },
      sign() { return r() < 0.5 ? -1 : 1; },
      chance(p) { return r() < p; },
      shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    };
    return R;
  }

  /* ---------- 정수·분수 ---------- */
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
  function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }

  function F(n, d) {
    if (d === undefined) d = 1;
    if (d === 0) throw new Error('분모가 0');
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d) || 1;
    return { n: n / g, d: d / g, frac: true };
  }
  const fr = (x) => (x && x.frac ? x : F(x, 1));
  const add = (a, b) => { a = fr(a); b = fr(b); return F(a.n * b.d + b.n * a.d, a.d * b.d); };
  const sub = (a, b) => { a = fr(a); b = fr(b); return F(a.n * b.d - b.n * a.d, a.d * b.d); };
  const mul = (a, b) => { a = fr(a); b = fr(b); return F(a.n * b.n, a.d * b.d); };
  const div = (a, b) => { a = fr(a); b = fr(b); return F(a.n * b.d, a.d * b.n); };
  const feq = (a, b) => { a = fr(a); b = fr(b); return a.n === b.n && a.d === b.d; };
  const fascii = (a) => { a = fr(a); return a.d === 1 ? (a.n < 0 ? '(' + a.n + ')' : String(a.n)) : '(' + a.n + '/' + a.d + ')'; };

  /* ---------- 글자 모양 (HTML) ---------- */
  const MINUS = '−';
  function fracH(n, d) { return '<span class="fr"><span class="nu">' + n + '</span><span class="de">' + d + '</span></span>'; }
  // 분수 값 → HTML. opt.mixed: 대분수로, opt.paren: 음수면 괄호, opt.raw:{n,d} 약분하지 않은 모양
  function fH(x, opt) {
    opt = opt || {};
    let n, d;
    if (opt.raw) { n = opt.raw.n; d = opt.raw.d; } else { x = fr(x); n = x.n; d = x.d; }
    const neg = n < 0; n = Math.abs(n);
    let s;
    if (d === 1) s = String(n);
    else if (opt.mixed && n > d) s = '<span class="mx">' + Math.floor(n / d) + (n % d ? fracH(n % d, d) : '') + '</span>';
    else s = fracH(n, d);
    if (neg) s = opt.paren ? '(' + MINUS + s + ')' : MINUS + s;
    return s;
  }
  // 대분수 그대로(약분 안 함) 보여 주기: whole, n, d
  function mixH(w, n, d) { return '<span class="mx">' + (w ? w : '') + (n ? fracH(n, d) : '') + '</span>'; }
  // 부호 붙은 수: (+3), (−5)
  function sgnH(x, opt) {
    x = fr(x);
    const body = fH(F(Math.abs(x.n), x.d), opt);
    return '(' + (x.n < 0 ? MINUS : '+') + body + ')';
  }
  const OPH = { '+': ' + ', '-': ' ' + MINUS + ' ', '*': ' × ', '/': ' ÷ ', '=': ' = ' };
  // 수 → 쉼표 없는 그대로
  function nH(x) { return x < 0 ? '(' + MINUS + Math.abs(x) + ')' : String(x); }
  function decStr(intVal, places) { // 정수 값을 10^places 로 나눈 소수 문자열
    const neg = intVal < 0; let s = String(Math.abs(intVal));
    if (places > 0) {
      while (s.length <= places) s = '0' + s;
      s = s.slice(0, s.length - places) + '.' + s.slice(s.length - places);
      s = s.replace(/0+$/, '').replace(/\.$/, '');
    }
    return (neg ? '-' : '') + s;
  }
  const BOX = '<span class="box"></span>';

  /* ---------- 다항식 (x, y) ---------- */
  // 항: key "a,b" = x^a y^b, 값: 분수
  function P(terms) { const p = { t: {} }; (terms || []).forEach(([c, a, b]) => addTerm(p, fr(c), a || 0, b || 0)); return p; }
  function addTerm(p, c, a, b) {
    const k = a + ',' + (b || 0);
    const v = p.t[k] ? add(p.t[k], c) : c;
    if (v.n === 0) delete p.t[k]; else p.t[k] = v;
  }
  const pAdd = (p, q) => { const r = P(); for (const k in p.t) { const [a, b] = k.split(',').map(Number); addTerm(r, p.t[k], a, b); } for (const k in q.t) { const [a, b] = k.split(',').map(Number); addTerm(r, q.t[k], a, b); } return r; };
  const pScale = (p, c) => { const r = P(); for (const k in p.t) { const [a, b] = k.split(',').map(Number); addTerm(r, mul(p.t[k], c), a, b); } return r; };
  const pSub = (p, q) => pAdd(p, pScale(q, -1));
  const pMul = (p, q) => {
    const r = P();
    for (const k1 in p.t) for (const k2 in q.t) {
      const [a1, b1] = k1.split(',').map(Number); const [a2, b2] = k2.split(',').map(Number);
      addTerm(r, mul(p.t[k1], q.t[k2]), a1 + a2, b1 + b2);
    }
    return r;
  };
  const pPow = (p, n) => { let r = P([[1, 0, 0]]); for (let i = 0; i < n; i++) r = pMul(r, p); return r; };
  function pKeys(p) {
    return Object.keys(p.t).sort((k1, k2) => {
      const [a1, b1] = k1.split(',').map(Number); const [a2, b2] = k2.split(',').map(Number);
      return (a2 + b2) - (a1 + b1) || a2 - a1;
    });
  }
  function varH(a, b) {
    let s = '';
    if (a) s += '<i>x</i>' + (a > 1 ? '<sup>' + a + '</sup>' : '');
    if (b) s += '<i>y</i>' + (b > 1 ? '<sup>' + b + '</sup>' : '');
    return s;
  }
  function varA(a, b) {
    const parts = [];
    if (a) parts.push('x' + (a > 1 ? '^' + a : ''));
    if (b) parts.push('y' + (b > 1 ? '^' + b : ''));
    return parts.join('*');
  }
  function pH(p) {
    const ks = pKeys(p);
    if (!ks.length) return '0';
    return ks.map((k, i) => {
      const [a, b] = k.split(',').map(Number); const c = p.t[k];
      const neg = c.n < 0; const ac = F(Math.abs(c.n), c.d);
      const v = varH(a, b);
      const cs = (v && ac.n === 1 && ac.d === 1) ? '' : fH(ac);
      const sign = i === 0 ? (neg ? MINUS : '') : (neg ? ' ' + MINUS + ' ' : ' + ');
      return sign + cs + v;
    }).join('');
  }
  function pA(p) {
    const ks = pKeys(p);
    if (!ks.length) return '0';
    return '(' + ks.map((k) => {
      const [a, b] = k.split(',').map(Number); const v = varA(a, b);
      return fascii(p.t[k]) + (v ? '*' + v : '');
    }).join('+') + ')';
  }
  // 일차식 ax+b
  const lin = (a, b) => P([[a, 1, 0], [b, 0, 0]]);

  /* ---------- 근호 ---------- */
  // 근호 식: { rad: 분수 계수 } (rad=1 은 유리수)
  function sqfree(n) { let c = 1, r = n; for (let k = 2; k * k <= r; k++) { while (r % (k * k) === 0) { r /= k * k; c *= k; } } return [c, r]; }
  function S(c, rad) { const s = {}; const [k, r] = sqfree(rad || 1); const v = mul(c, k); if (v.n) s[r] = v; return s; }
  function sAdd(a, b) { const s = Object.assign({}, a); for (const r in b) { const v = s[r] ? add(s[r], b[r]) : b[r]; if (v.n) s[r] = v; else delete s[r]; } return s; }
  function sMul(a, b) { let s = {}; for (const r1 in a) for (const r2 in b) s = sAdd(s, S(mul(a[r1], b[r2]), Number(r1) * Number(r2))); return s; }
  function sScale(a, c) { const s = {}; for (const r in a) { const v = mul(a[r], c); if (v.n) s[r] = v; } return s; }
  function sKeys(s) { return Object.keys(s).map(Number).sort((x, y) => x - y); }
  function sqrtH(r) { return '√<span class="rad">' + r + '</span>'; }
  function sH(s) {
    const ks = sKeys(s);
    if (!ks.length) return '0';
    return ks.map((r, i) => {
      const c = s[r]; const neg = c.n < 0; const ac = F(Math.abs(c.n), c.d);
      let body;
      if (r === 1) body = fH(ac);
      else if (ac.d === 1) body = (ac.n === 1 ? '' : ac.n) + sqrtH(r);
      else body = fracH((ac.n === 1 ? '' : ac.n) + sqrtH(r), ac.d);
      return (i === 0 ? (neg ? MINUS : '') : (neg ? ' ' + MINUS + ' ' : ' + ')) + body;
    }).join('');
  }
  function sA(s) {
    const ks = sKeys(s);
    if (!ks.length) return '0';
    return '(' + ks.map((r) => fascii(s[r]) + (r === 1 ? '' : '*sqrt(' + r + ')')).join('+') + ')';
  }

  /* ---------- 그림 (SVG) ---------- */
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function svg(w, h, body, label) {
    return '<svg class="fig" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + esc(label || '그림') + '" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>';
  }
  const r1 = (v) => Math.round(v * 10) / 10;
  function T(x, y, s, o) {
    o = o || {};
    return '<text x="' + r1(x) + '" y="' + r1(y) + '" font-size="' + (o.size || 13) + '" text-anchor="' + (o.anchor || 'middle') + '" dominant-baseline="middle" fill="' + (o.fill || '#222') + '" paint-order="stroke" stroke="#fff" stroke-width="3" stroke-linejoin="round"' + (o.cls ? ' class="' + o.cls + '"' : '') + '>' + esc(s) + '</text>';
  }
  function L(x1, y1, x2, y2, o) {
    o = o || {};
    return '<line x1="' + r1(x1) + '" y1="' + r1(y1) + '" x2="' + r1(x2) + '" y2="' + r1(y2) + '" stroke="' + (o.stroke || '#222') + '" stroke-width="' + (o.w || 1.6) + '"' + (o.dash ? ' stroke-dasharray="4 3"' : '') + (o.cls ? ' class="' + o.cls + '"' : '') + ' stroke-linecap="round"/>';
  }
  function poly(pts, o) {
    o = o || {};
    return '<polygon points="' + pts.map((p) => r1(p[0]) + ',' + r1(p[1])).join(' ') + '" fill="' + (o.fill || '#eef4ff') + '" stroke="' + (o.stroke || '#222') + '" stroke-width="' + (o.w || 1.6) + '"' + (o.cls ? ' class="' + o.cls + '"' : '') + '/>';
  }
  function rightMark(cx, cy, ux, uy, vx, vy, s) { // 직각 표시: 꼭짓점과 두 방향(단위벡터)
    s = s || 9;
    const p1 = [cx + ux * s, cy + uy * s], p2 = [cx + ux * s + vx * s, cy + uy * s + vy * s], p3 = [cx + vx * s, cy + vy * s];
    return '<polyline points="' + [p1, p2, p3].map((p) => r1(p[0]) + ',' + r1(p[1])).join(' ') + '" fill="none" stroke="#222" stroke-width="1.2"/>';
  }
  function arc(cx, cy, r, a1, a2, o) { // 각도(도), 수학 방향(반시계), 화면 y 는 아래로
    o = o || {};
    const rad = (a) => a * Math.PI / 180;
    const x1 = cx + r * Math.cos(rad(a1)), y1 = cy - r * Math.sin(rad(a1));
    const x2 = cx + r * Math.cos(rad(a2)), y2 = cy - r * Math.sin(rad(a2));
    const large = ((a2 - a1 + 360) % 360) > 180 ? 1 : 0;
    return '<path d="M' + r1(x1) + ' ' + r1(y1) + ' A' + r + ' ' + r + ' 0 ' + large + ' 0 ' + r1(x2) + ' ' + r1(y2) + '" fill="none" stroke="' + (o.stroke || '#c0392b') + '" stroke-width="1.4"/>';
  }

  const MD = {
    makeRng, hashStr, gcd, lcm, F, fr, add, sub, mul, div, feq, fascii,
    MINUS, fracH, fH, mixH, sgnH, OPH, nH, decStr, BOX,
    P, pAdd, pSub, pMul, pScale, pPow, pH, pA, lin, varH,
    S, sAdd, sMul, sScale, sH, sA, sqfree, sqrtH,
    svg, T, L, poly, rightMark, arc, esc,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = MD;
  else root.MD = MD;
})(typeof window !== 'undefined' ? window : this);
