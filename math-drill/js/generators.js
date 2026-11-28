/* 연산 문제은행 — 단원별 문제 만들기
 * 문제 하나 = { q: 문제(HTML), svg: 그림(SVG, 없으면 ''), ans: 정답(HTML), chk: 검산용 정보 }
 * chk 는 테스트가 정답을 따로 다시 계산해 보는 데 써요(화면에는 안 나와요). */
(function (root) {
  'use strict';
  const MD = (typeof module !== 'undefined' && module.exports) ? require('./core.js') : root.MD;
  const WORDS = (typeof module !== 'undefined' && module.exports) ? require('./words.js') : root.MD_WORDS;
  const {
    F, fr, add, sub, mul, div, gcd, lcm, fascii, MINUS, fracH, fH, mixH, sgnH, OPH, decStr, BOX,
    P, pAdd, pSub, pMul, pScale, pPow, pH, pA, lin, S, sAdd, sMul, sH, sA, sqfree, sqrtH,
    svg, T, L, poly, rightMark, arc,
  } = MD;

  const Q = (q, ans, chk, fig) => ({ q, ans: String(ans), chk, svg: fig || '' });
  const numQ = (q, expr, val, ans, extra) => Q(q + ' =', ans === undefined ? String(val) : ans, Object.assign({ t: 'num', expr, val: String(val) }, extra || {}));
  const eqQ = (q, lhs, rhs, x, ans) => Q(q, ans === undefined ? String(x) : ans, { t: 'eq', lhs, rhs, x: String(x) });
  const op = (o) => OPH[o];
  const mixed = (v) => fH(v, { mixed: true });
  // 숫자 뒤 조사: 끝자리를 읽은 소리에 받침이 있으면(0 영, 1 일, 3 삼, 6 육, 7 칠, 8 팔) '과/이에요'
  const batchim = (n) => '013678'.includes(String(n).replace(/<[^>]+>/g, '').replace(/[^0-9]/g, '').slice(-1));
  const wa = (n) => n + (batchim(n) ? '과' : '와');
  const ida = (n) => n + (batchim(n) ? '이에요' : '예요');
  const dec = (v, p) => decStr(v, p);
  // 약분하지 않은 대분수 답 (전체 분자 N, 분모 d)
  const rawMixed = (N, d) => (N % d === 0 ? String(N / d) : (N > d ? mixH(Math.floor(N / d), N % d, d) : fracH(N, d)));
  // 진분수(기약) 하나
  function properFrac(R, dmin, dmax) { for (;;) { const d = R.int(dmin, dmax); const n = R.int(1, d - 1); if (gcd(n, d) === 1) return F(n, d); } }
  // 대분수 하나 (자연수 부분 1..wmax)
  function mixedFrac(R, dmin, dmax, wmax) { const p = properFrac(R, dmin, dmax); return add(R.int(1, wmax), p); }

  /* ---------- 그림 ---------- */
  function clockSvg(h, m, fine) {
    const cx = 70, cy = 70, r = 62;
    let b = '<circle cx="70" cy="70" r="62" fill="#fffdf5" stroke="#222" stroke-width="2.4"/>';
    for (let i = 0; i < 60; i++) {
      const a = i * 6 * Math.PI / 180; const big = i % 5 === 0;
      if (!big && !fine) continue;
      const r2 = big ? r - 7 : r - 4;
      b += L(cx + r * Math.sin(a), cy - r * Math.cos(a), cx + r2 * Math.sin(a), cy - r2 * Math.cos(a), { w: big ? 2 : 1 });
    }
    for (let k = 1; k <= 12; k++) { const a = k * 30 * Math.PI / 180; b += T(cx + 46 * Math.sin(a), cy - 46 * Math.cos(a) + 1, String(k), { size: 13 }); }
    const ah = ((h % 12) * 30 + m * 0.5) * Math.PI / 180, am = m * 6 * Math.PI / 180;
    b += L(cx, cy, cx + 30 * Math.sin(ah), cy - 30 * Math.cos(ah), { w: 4.5, cls: 'hh' });
    b += L(cx, cy, cx + 50 * Math.sin(am), cy - 50 * Math.cos(am), { w: 2.6, cls: 'mh', stroke: '#c0392b' });
    b += '<circle cx="70" cy="70" r="3.5" fill="#222"/>';
    return svg(140, 140, b, '시계');
  }
  function groupsSvg(m, k) { // m개씩 k묶음
    const cols = m <= 3 ? m : Math.ceil(m / 2), rows = m <= 3 ? 1 : 2;
    const gw = cols * 16 + 10, gh = rows * 16 + 10;
    const perRow = Math.min(k, 3);
    const W = perRow * (gw + 8) + 4, H = Math.ceil(k / perRow) * (gh + 8) + 4;
    let b = '';
    for (let g = 0; g < k; g++) {
      const gx = 4 + (g % perRow) * (gw + 8), gy = 4 + Math.floor(g / perRow) * (gh + 8);
      b += '<rect x="' + gx + '" y="' + gy + '" width="' + gw + '" height="' + gh + '" rx="8" fill="none" stroke="#7a5bd0" stroke-width="1.4" stroke-dasharray="4 3"/>';
      for (let i = 0; i < m; i++) {
        const x = gx + 13 + (i % cols) * 16, y = gy + 13 + Math.floor(i / cols) * 16;
        b += '<circle class="dot" cx="' + x + '" cy="' + y + '" r="6" fill="#ffb627" stroke="#8a5a00"/>';
      }
    }
    return svg(W, H, b, m + '개씩 ' + k + '묶음');
  }
  function fracBarSvg(n, d) {
    const W = Math.min(240, d * 28), w = W / d; let b = '';
    for (let i = 0; i < d; i++) b += '<rect class="part' + (i < n ? ' on' : '') + '" x="' + (2 + i * w).toFixed(1) + '" y="4" width="' + w.toFixed(1) + '" height="34" fill="' + (i < n ? '#8fb8f0' : '#fff') + '" stroke="#222" stroke-width="1.4"/>';
    return svg(W + 4, 42, b, '분수 막대');
  }
  function fracPieSvg(n, d) {
    const cx = 50, cy = 50, r = 44; let b = '';
    for (let i = 0; i < d; i++) {
      const a1 = (i / d) * 2 * Math.PI - Math.PI / 2, a2 = ((i + 1) / d) * 2 * Math.PI - Math.PI / 2;
      const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1), x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
      b += '<path class="part' + (i < n ? ' on' : '') + '" d="M50 50 L' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' A44 44 0 0 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' Z" fill="' + (i < n ? '#8fb8f0' : '#fff') + '" stroke="#222" stroke-width="1.4"/>';
    }
    return svg(100, 100, b, '분수 원');
  }
  function numberLineSvg(start, idx) { // start ~ start+1 을 10칸, idx 번째 눈금에 화살표
    const x0 = 14, W = 230; let b = L(x0 - 6, 40, x0 + W + 6, 40, { w: 1.8 });
    for (let i = 0; i <= 10; i++) {
      const x = x0 + i * W / 10, big = i === 0 || i === 10;
      b += L(x, big ? 32 : 35, x, big ? 48 : 45, { w: big ? 2 : 1.2 });
    }
    b += T(x0, 60, String(start)) + T(x0 + W, 60, String(start + 1));
    const ax = x0 + idx * W / 10;
    b += '<path class="arrow" d="M' + ax + ' 28 l-5 -9 h10 z" fill="#c0392b"/>' + L(ax, 8, ax, 20, { stroke: '#c0392b', w: 2 });
    return svg(W + 28, 68, b, '수직선');
  }
  function circleSvg(label, kind) { // kind: r | d
    let b = '<circle cx="70" cy="62" r="52" fill="#eef4ff" stroke="#222" stroke-width="1.8"/><circle cx="70" cy="62" r="2.6" fill="#222"/>';
    if (kind === 'r') b += L(70, 62, 122, 62, { stroke: '#c0392b', w: 2 }) + T(96, 52, label, { fill: '#c0392b' });
    else b += L(18, 62, 122, 62, { stroke: '#c0392b', w: 2 }) + T(70, 52, label, { fill: '#c0392b' });
    b += T(70, 75, 'ㅇ', { size: 11, fill: '#555' });
    return svg(140, 124, b, '원');
  }
  function circlesRowSvg(k, rLabel) {
    const r = 26, W = k * 2 * r + 24; let b = '<rect x="12" y="10" width="' + (k * 2 * r) + '" height="' + (2 * r) + '" fill="none" stroke="#222" stroke-width="1.8"/>';
    for (let i = 0; i < k; i++) b += '<circle cx="' + (12 + r + i * 2 * r) + '" cy="' + (10 + r) + '" r="' + r + '" fill="#eef4ff" stroke="#222" stroke-width="1.4"/>';
    b += '<circle cx="' + (12 + r) + '" cy="' + (10 + r) + '" r="2.2" fill="#222"/>' + L(12 + r, 10 + r, 12 + 2 * r, 10 + r, { stroke: '#c0392b', w: 2 }) + T(12 + 1.5 * r, r + 2, rLabel, { fill: '#c0392b', size: 12 });
    b += T(12 + k * r, 2 * r + 24, '가로 = ?', { size: 12 });
    return svg(W, 2 * r + 34, b, '원 ' + k + '개가 들어 있는 직사각형');
  }
  // 세 각으로 삼각형을 정확히 그려요 (A 왼쪽 아래, B 오른쪽 아래, C 위)
  function triangleSvg(A, B, labels) {
    const C = 180 - A - B, rad = Math.PI / 180, base = 1;
    const ac = base * Math.sin(B * rad) / Math.sin(C * rad);
    const pts = [[0, 0], [base, 0], [ac * Math.cos(A * rad), ac * Math.sin(A * rad)]];
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), maxY = Math.max(...ys);
    const s = Math.min(190 / (maxX - minX), 110 / maxY);
    const P2 = pts.map((p) => [18 + (p[0] - minX) * s, 128 - p[1] * s]);
    let b = poly(P2, { cls: 'tri' });
    // 각 이름: 꼭짓점에서 무게중심 쪽으로
    const gx = (P2[0][0] + P2[1][0] + P2[2][0]) / 3, gy = (P2[0][1] + P2[1][1] + P2[2][1]) / 3;
    P2.forEach((p, i) => {
      if (!labels[i]) return;
      const dx = gx - p[0], dy = gy - p[1], len = Math.hypot(dx, dy);
      const off = Math.min(30, len * 0.55);
      b += T(p[0] + dx / len * off, p[1] + dy / len * off, labels[i], { size: 12, fill: labels[i].indexOf('□') >= 0 ? '#c0392b' : '#222' });
    });
    return svg(226, 140, b, '삼각형');
  }
  function straightAngleSvg(a, given, ask) { // 직선 위에 반직선, 왼쪽 각 a
    const cx = 110, cy = 92, r = 80, t = (180 - a) * Math.PI / 180;
    let b = L(14, cy, 206, cy, { w: 2 }) + L(cx, cy, cx + r * Math.cos(t), cy - r * Math.sin(t), { w: 2 });
    b += arc(cx, cy, 22, 180 - a, 180) + arc(cx, cy, 28, 0, 180 - a, { stroke: '#2a6fd6' });
    const mid1 = (180 - a / 2) * Math.PI / 180, mid2 = ((180 - a) / 2) * Math.PI / 180;
    b += T(cx + 40 * Math.cos(mid1), cy - 40 * Math.sin(mid1), given, { size: 12 }) + T(cx + 46 * Math.cos(mid2), cy - 46 * Math.sin(mid2), ask, { size: 12, fill: '#c0392b' });
    return svg(220, 104, b, '직선 위의 각');
  }
  // 도형 넓이 그림: 단위(cm)를 화면 길이로 바꿔 그려요
  function shapeSvg(kind, dims) {
    const lab = (v) => v + ' cm';
    let b = '';
    if (kind === 'rect' || kind === 'square') {
      const [w, h] = kind === 'square' ? [dims.s, dims.s] : [dims.w, dims.h];
      const sc = Math.min(160 / w, 90 / h), W = w * sc, H = h * sc;
      b += poly([[30, 14], [30 + W, 14], [30 + W, 14 + H], [30, 14 + H]]);
      b += T(30 + W / 2, 14 + H + 14, lab(w)) + (kind === 'rect' ? T(30 + W + 8, 14 + H / 2, lab(h), { anchor: 'start' }) : '');
      return svg(Math.max(240, 30 + W + 60), 14 + H + 26, b, kind === 'rect' ? '직사각형' : '정사각형');
    }
    if (kind === 'para' || kind === 'tri') {
      const { base, h, off } = dims; // off: 윗꼭짓점이 밀린 정도(밑변 비율)
      const sc = Math.min(150 / (base * (1 + Math.max(0, off))), 90 / h), Bw = base * sc, H = h * sc, O = off * base * sc;
      const x0 = 24, y0 = 14 + H;
      if (kind === 'para') b += poly([[x0, y0], [x0 + Bw, y0], [x0 + Bw + O, y0 - H], [x0 + O, y0 - H]]);
      else b += poly([[x0, y0], [x0 + Bw, y0], [x0 + O + Bw / 2, y0 - H]]);
      const hx = kind === 'para' ? x0 + O + Math.min(Bw * 0.25, 30) : x0 + O + Bw / 2;
      b += L(hx, y0 - H, hx, y0, { dash: true }) + rightMark(hx, y0, 1, 0, 0, -1, 8);
      b += T(x0 + Bw / 2, y0 + 14, lab(base)) + T(hx + 6, y0 - H / 2, lab(h), { anchor: 'start' });
      return svg(Math.max(230, x0 + Bw + O + 70), y0 + 26, b, kind === 'para' ? '평행사변형' : '삼각형');
    }
    if (kind === 'trap') {
      const { top, bottom, h } = dims; const sc = Math.min(160 / bottom, 90 / h);
      const Bw = bottom * sc, Tw = top * sc, H = h * sc, x0 = 24, y0 = 18 + H, tx = x0 + (Bw - Tw) * 0.35;
      b += poly([[x0, y0], [x0 + Bw, y0], [tx + Tw, y0 - H], [tx, y0 - H]]);
      b += L(tx, y0 - H, tx, y0, { dash: true }) + rightMark(tx, y0, 1, 0, 0, -1, 8);
      b += T(tx + Tw / 2, y0 - H - 9, lab(top)) + T(x0 + Bw / 2, y0 + 14, lab(bottom)) + T(tx - 4, y0 - H / 2, lab(h), { anchor: 'end' });
      return svg(Math.max(230, x0 + Bw + 30), y0 + 26, b, '사다리꼴');
    }
    if (kind === 'rhombus') {
      const { d1, d2 } = dims; const sc = Math.min(170 / d1, 100 / d2);
      const W = d1 * sc, H = d2 * sc, cx = 20 + W / 2, cy = 12 + H / 2;
      b += poly([[20, cy], [cx, 12], [20 + W, cy], [cx, 12 + H]]);
      b += L(20, cy, 20 + W, cy, { dash: true }) + L(cx, 12, cx, 12 + H, { dash: true }) + rightMark(cx, cy, 1, 0, 0, -1, 7);
      b += T(20 + W * 0.3, cy + 11, lab(d1)) + T(cx + 6, 12 + H * 0.25, lab(d2), { anchor: 'start' });
      return svg(Math.max(230, 20 + W + 20), 12 + H + 12, b, '마름모');
    }
    return '';
  }
  function boxSvg(a, b2, c, cube) { // 가로 a, 세로(깊이) b2, 높이 c
    const sc = Math.min(110 / (a + b2 * 0.5), 90 / (c + b2 * 0.5));
    const W = a * sc, H = c * sc, D = b2 * sc * 0.5;
    const x0 = 18, y0 = 14 + D + H;
    const f = [[x0, y0], [x0 + W, y0], [x0 + W, y0 - H], [x0, y0 - H]];
    let s = poly(f, { fill: '#eef4ff' });
    s += poly([[x0, y0 - H], [x0 + W, y0 - H], [x0 + W + D, y0 - H - D], [x0 + D, y0 - H - D]], { fill: '#dce8fb' });
    s += poly([[x0 + W, y0], [x0 + W + D, y0 - D], [x0 + W + D, y0 - H - D], [x0 + W, y0 - H]], { fill: '#c9dbf6' });
    s += L(x0, y0, x0 + D, y0 - D, { dash: true, w: 1 }) + L(x0 + D, y0 - D, x0 + W + D, y0 - D, { dash: true, w: 1 }) + L(x0 + D, y0 - D, x0 + D, y0 - H - D, { dash: true, w: 1 });
    s += T(x0 + W / 2, y0 + 13, a + ' cm');
    if (!cube) { s += T(x0 + W + D / 2 + 6, y0 - D / 2 + 6, b2 + ' cm', { anchor: 'start' }); s += T(x0 + W + D + 6, y0 - D - H / 2, c + ' cm', { anchor: 'start' }); }
    return svg(Math.max(220, x0 + W + D + 60), y0 + 24, s, cube ? '정육면체' : '직육면체');
  }
  function sectorSvg(rLab, theta, extra) {
    const cx = 30, cy = 110, r = 82, t = theta * Math.PI / 180;
    const big = theta > 180 ? 1 : 0;
    let W = 190, H = 132, ox = 0, oy = 0;
    if (theta > 90) { ox = 80; W = 250; }
    if (theta > 180) { oy = 0; H = 210; }
    const CX = cx + ox, CY = cy + oy;
    let b = '<path class="sector" d="M' + CX + ' ' + CY + ' L' + (CX + r) + ' ' + CY + ' A' + r + ' ' + r + ' 0 ' + big + ' 0 ' + (CX + r * Math.cos(t)).toFixed(1) + ' ' + (CY - r * Math.sin(t)).toFixed(1) + ' Z" fill="#eef4ff" stroke="#222" stroke-width="1.8"/>';
    b += arc(CX, CY, 18, 0, theta) + T(CX + 30 * Math.cos(t / 2), CY - 30 * Math.sin(t / 2), theta + '°', { size: 12 });
    b += T(CX + r / 2, CY + 12, rLab, { size: 12 });
    if (extra) b += T(CX + (r + 14) * Math.cos(t / 2), CY - (r + 14) * Math.sin(t / 2), extra, { size: 12, fill: '#c0392b' });
    return svg(W, H, b, '부채꼴');
  }
  function rightTriSvg(labels, opts) { // 직각 C 오른쪽 아래, A 왼쪽 아래, B 오른쪽 위. labels: {a: BC, b: AC, c: AB}
    opts = opts || {};
    const ratio = opts.ratio || 0.6;
    const W = 170, H = Math.max(50, Math.min(110, W * ratio));
    const A = [22, 18 + H], C = [22 + W, 18 + H], B = [22 + W, 18];
    let s = poly([A, C, B]) + rightMark(C[0], C[1], -1, 0, 0, -1, 10);
    const col = (v) => (String(v).indexOf('x') >= 0 ? '#c0392b' : '#222');
    if (labels.b) s += T((A[0] + C[0]) / 2, C[1] + 14, labels.b, { fill: col(labels.b) });
    if (labels.a) s += T(C[0] + 8, (B[1] + C[1]) / 2, labels.a, { anchor: 'start', fill: col(labels.a) });
    if (labels.c) s += T((A[0] + B[0]) / 2 - 10, (A[1] + B[1]) / 2 - 10, labels.c, { anchor: 'end', fill: col(labels.c) });
    if (opts.names) s += T(A[0] - 10, A[1] + 4, 'A') + T(B[0] + 10, B[1] - 2, 'B') + T(C[0] + 10, C[1] + 6, 'C');
    return svg(W + 90, H + 44, s, '직각삼각형');
  }
  function rectDiagSvg(w, h) {
    const sc = Math.min(160 / w, 90 / h), W = w * sc, H = h * sc, x0 = 20, y0 = 12;
    let s = poly([[x0, y0], [x0 + W, y0], [x0 + W, y0 + H], [x0, y0 + H]]) + L(x0, y0 + H, x0 + W, y0, { stroke: '#c0392b', w: 2 });
    s += T(x0 + W / 2, y0 + H + 14, w + ' cm') + T(x0 + W + 8, y0 + H / 2, h + ' cm', { anchor: 'start' }) + T(x0 + W / 2 - 8, y0 + H / 2 - 8, 'x cm', { fill: '#c0392b', anchor: 'end' });
    return svg(Math.max(230, x0 + W + 60), y0 + H + 26, s, '직사각형과 대각선');
  }
  function crossSvg(a, labels) { // 두 직선이 O에서 만나요. 직선1 수평, 직선2 기울기 a°. labels[0..3]: 0~a, a~180, 180~180+a, 180+a~360 영역
    const cx = 110, cy = 70, r = 95, t = a * Math.PI / 180;
    let s = L(cx - r, cy, cx + r, cy, { w: 2 }) + L(cx - r * Math.cos(t), cy + r * Math.sin(t), cx + r * Math.cos(t), cy - r * Math.sin(t), { w: 2 });
    const mids = [a / 2, (a + 180) / 2, 180 + a / 2, (180 + a + 360) / 2];
    labels.forEach((lab, i) => { if (!lab) return; const m = mids[i] * Math.PI / 180; s += T(cx + 34 * Math.cos(m), cy - 34 * Math.sin(m), lab, { size: 12, fill: lab.indexOf('x') >= 0 ? '#c0392b' : '#222' }); });
    return svg(220, 140, s, '두 직선이 만나는 그림');
  }
  function parallelSvg(t, top, bottom) { // 평행선 두 개 + 기울기 t° 인 직선. top/bottom: {q: 0..3 영역, lab}
    const y1 = 40, y2 = 110, x1 = 120, tr = t * Math.PI / 180, dx = (y2 - y1) / Math.tan(tr), x2 = x1 - dx;
    let s = L(10, y1, 240, y1, { w: 2 }) + L(10, y2, 240, y2, { w: 2 });
    s += '<path d="M40 ' + (y1 - 4) + ' l6 4 l-6 4" fill="none" stroke="#222"/><path d="M40 ' + (y2 - 4) + ' l6 4 l-6 4" fill="none" stroke="#222"/>';
    s += T(232, y1 - 9, 'l', { size: 12 }) + T(232, y2 - 9, 'm', { size: 12 });
    const ext = 30 / Math.sin(tr);
    s += L(x1 + ext * Math.cos(tr), y1 - ext * Math.sin(tr), x2 - ext * Math.cos(tr), y2 + ext * Math.sin(tr), { w: 2 });
    const mids = [t / 2, (t + 180) / 2, 180 + t / 2, (180 + t + 360) / 2];
    [[x1, y1, top], [x2, y2, bottom]].forEach(([x, y, o]) => {
      const m = mids[o.q] * Math.PI / 180;
      s += T(x + 24 * Math.cos(m), y - 24 * Math.sin(m), o.lab, { size: 12, fill: o.lab.indexOf('x') >= 0 ? '#c0392b' : '#222' });
    });
    return svg(250, 150, s, '평행선과 한 직선');
  }
  function zigzagSvg(a, b) { // 평행선 l, m 사이 꺾인 선: ∠x = a + b
    const y1 = 30, y2 = 140, py = 85, px = 200, ra = a * Math.PI / 180, rb = b * Math.PI / 180;
    const Ax = px - (py - y1) / Math.tan(ra), Bx = px - (y2 - py) / Math.tan(rb);
    let s = L(10, y1, 250, y1, { w: 2 }) + L(10, y2, 250, y2, { w: 2 }) + T(242, y1 - 9, 'l', { size: 12 }) + T(242, y2 - 9, 'm', { size: 12 });
    s += L(Ax, y1, px, py, { w: 2 }) + L(Bx, y2, px, py, { w: 2 });
    s += T(Ax + 30, y1 + 10, a + '°', { size: 12 }) + T(Bx + 30, y2 - 9, b + '°', { size: 12 }) + T(px - 22, py, '∠x', { size: 12, fill: '#c0392b' });
    return svg(260, 154, s, '평행선 사이의 꺾인 선');
  }

  /* ---------- 단원별 문제 ---------- */
  const G = {};

  // 초1-1 덧셈과 뺄셈
  G.e11_addsub = (R, d) => {
    const max = d === 1 ? 5 : 9;
    const plus = R.chance(0.5);
    let a, b;
    if (plus) { a = R.int(1, max - 1); b = R.int(1, max - a); } else { a = R.int(2, max); b = R.int(1, a); }
    if (d === 3 && R.chance(0.5)) {
      return plus ? eqQ(a + op('+') + BOX + ' = ' + (a + b), a + '+x', String(a + b), b)
        : eqQ(a + op('-') + BOX + ' = ' + (a - b), a + '-x', String(a - b), b);
    }
    return plus ? numQ(a + op('+') + b, a + '+' + b, a + b) : numQ(a + op('-') + b, a + '-' + b, a - b);
  };
  // 초1-2 덧셈과 뺄셈(1): 받아올림·받아내림 없음
  G.e12_addsub1 = (R, d) => {
    const plus = R.chance(0.5);
    let a, b;
    if (d === 1) {
      const t = R.int(1, 9), o = plus ? R.int(0, 8) : R.int(1, 9); a = t * 10 + o;
      b = plus ? R.int(1, 9 - o) : R.int(1, o);
    } else {
      const a1 = plus ? R.int(1, 8) : R.int(2, 9), b1 = plus ? R.int(1, 9 - a1) : R.int(1, a1);
      const a0 = R.int(0, 9), b0 = plus ? R.int(0, 9 - a0) : R.int(0, a0);
      a = a1 * 10 + a0; b = b1 * 10 + b0;
    }
    if (d === 3 && R.chance(0.4)) {
      return plus ? eqQ(BOX + op('+') + b + ' = ' + (a + b), 'x+' + b, String(a + b), a) : eqQ(a + op('-') + BOX + ' = ' + (a - b), a + '-x', String(a - b), b);
    }
    return plus ? numQ(a + op('+') + b, a + '+' + b, a + b) : numQ(a + op('-') + b, a + '-' + b, a - b);
  };
  // 초1-2 덧셈과 뺄셈(2)
  G.e12_addsub2 = (R, d) => {
    if (d === 1) {
      const k = R.int(0, 2), a = R.int(1, 9), b = 10 - a;
      if (k === 0) { const c = R.int(1, 9); return numQ(a + op('+') + b + op('+') + c, a + '+' + b + '+' + c, 10 + c); }
      if (k === 1) return numQ('10' + op('-') + a, '10-' + a, 10 - a);
      return eqQ(a + op('+') + BOX + ' = 10', a + '+x', '10', b);
    }
    if (d === 2) {
      if (R.chance(0.5)) { const a = R.int(2, 9), b = R.int(Math.max(2, 11 - a), 9); return numQ(a + op('+') + b, a + '+' + b, a + b); }
      const m = R.int(11, 18), b = R.int(m - 10 + 1, 9); return numQ(m + op('-') + b, m + '-' + b, m - b);
    }
    for (;;) {
      const a = R.int(2, 9), b = R.int(2, 9), c = R.int(2, 9);
      if (R.chance(0.5)) { if (a + b <= 18 && a + b - c >= 0 && a + b > 10) return numQ(a + op('+') + b + op('-') + c, a + '+' + b + '-' + c, a + b - c); }
      else { const m = 10 + a; if (m - b >= 0 && m - b + c <= 18 && b > a) return numQ(m + op('-') + b + op('+') + c, m + '-' + b + '+' + c, m - b + c); }
    }
  };
  // 초1-2 시계 보기
  G.e12_clock = (R, d) => {
    const h = R.int(1, 12), m = d === 1 ? 0 : d === 2 ? 30 : R.pick([0, 30]);
    return Q('지금 시각은?', h + '시' + (m ? ' 30분' : ''), { t: 'clock', h, m }, clockSvg(h, m, false));
  };
  // 초2-1 덧셈과 뺄셈
  G.e21_addsub = (R, d) => {
    if (d === 1) {
      if (R.chance(0.5)) { const a = R.int(1, 9) * 10 + R.int(2, 9), b = R.int(10 - (a % 10), 9); return numQ(a + op('+') + b, a + '+' + b, a + b); }
      const a = R.int(1, 9) * 10 + R.int(0, 7), b = R.int(a % 10 + 1, 9); return numQ(a + op('-') + b, a + '-' + b, a - b);
    }
    if (d === 2) {
      if (R.chance(0.5)) { const a0 = R.int(2, 9), b0 = R.int(10 - a0, 9), a = R.int(1, 8) * 10 + a0, b = R.int(1, 8) * 10 + b0; return numQ(a + op('+') + b, a + '+' + b, a + b); }
      const a0 = R.int(0, 8), b0 = R.int(a0 + 1, 9), a1 = R.int(2, 9), b1 = R.int(1, a1 - 1), a = a1 * 10 + a0, b = b1 * 10 + b0;
      return numQ(a + op('-') + b, a + '-' + b, a - b);
    }
    for (;;) {
      const a = R.int(11, 99), b = R.int(11, 99), c = R.int(11, 99), k = R.int(0, 2);
      if (k === 0 && a + b - c >= 0 && a + b < 200) return numQ(a + op('+') + b + op('-') + c, a + '+' + b + '-' + c, a + b - c);
      if (k === 1 && a - b >= 0 && a - b - c >= 0) return numQ(a + op('-') + b + op('-') + c, a + '-' + b + '-' + c, a - b - c);
      if (k === 2 && a + b < 100) return eqQ(BOX + op('+') + b + ' = ' + (a + b), 'x+' + b, String(a + b), a);
    }
  };
  // 초2-1 곱셈
  G.e21_mul = (R, d) => {
    const k = d === 1 ? 0 : d === 2 ? R.int(1, 2) : R.int(1, 3);
    if (k === 0) {
      const m = R.int(2, 5), g = R.int(2, 5);
      return Q('모두 몇 개인가요? 곱셈식으로 나타내세요.', m + ' × ' + g + ' = ' + m * g, { t: 'num', expr: m + '*' + g, val: String(m * g), dots: m * g }, groupsSvg(m, g));
    }
    const m = R.int(2, 9), g = R.int(2, 9);
    if (k === 1) return Q(m + '의 ' + g + '배는 얼마인가요?', m * g, { t: 'num', expr: m + '*' + g, val: String(m * g) });
    if (k === 2) { const g2 = R.int(3, 6); return eqQ(Array(g2).fill(m).join(' + ') + ' = ' + m + ' × ' + BOX, m + '*x', Array(g2).fill(m).join('+'), g2); }
    const thing = R.pick([['사탕', '봉지'], ['연필', '묶음'], ['구슬', '상자'], ['쿠키', '접시']]);
    return Q('한 ' + thing[1] + '에 ' + thing[0] + '이 ' + m + '개씩 ' + g + thing[1] + ' 있어요. ' + thing[0] + '은 모두 몇 개인가요?', m * g + '개', { t: 'num', expr: m + '*' + g, val: String(m * g) });
  };
  // 초2-2 곱셈구구
  G.e22_times = (R, d) => {
    if (d === 3) {
      const k = R.int(0, 3), a = R.int(2, 9), b = R.int(1, 9);
      if (k === 0) return eqQ(a + op('*') + BOX + ' = ' + a * b, a + '*x', String(a * b), b);
      if (k === 1) return eqQ(BOX + op('*') + a + ' = ' + a * b, 'x*' + a, String(a * b), b);
      const z = k === 2 ? 0 : 1; return R.chance(0.5) ? numQ(z + op('*') + b, z + '*' + b, z * b) : numQ(b + op('*') + z, b + '*' + z, z * b);
    }
    const a = R.pick(d === 1 ? [2, 3, 4, 5] : [6, 7, 8, 9]), b = R.int(1, 9);
    return numQ(a + op('*') + b, a + '*' + b, a * b);
  };
  // 초2-2 길이 재기
  const mcm = (cm) => { const m = Math.floor(cm / 100), c = cm % 100; return (m ? m + ' m' : '') + (m && c ? ' ' : '') + (c || !m ? c + ' cm' : ''); };
  G.e22_length = (R, d) => {
    for (;;) {
      const m1 = R.int(1, 6), c1 = R.int(5, 95), m2 = R.int(d === 1 ? 0 : 1, 4), c2 = R.int(5, 95);
      const A = m1 * 100 + c1, B = m2 * 100 + c2;
      if (d === 1 && c1 + c2 < 100) return numQ(mcm(A) + op('+') + mcm(B), A + '+' + B, A + B, mcm(A + B), { unit: 'cm' });
      if (d === 2 && c1 + c2 >= 100 && c1 + c2 !== 100) return numQ(mcm(A) + op('+') + mcm(B), A + '+' + B, A + B, mcm(A + B));
      if (d === 3 && c1 < c2 && A > B) return numQ(mcm(A) + op('-') + mcm(B), A + '-' + B, A - B, mcm(A - B));
    }
  };
  // 초2-2 시각과 시간
  G.e22_time = (R, d) => {
    const h = R.int(1, 12);
    if (d < 3) { const m = d === 1 ? R.int(1, 11) * 5 : R.int(1, 59); return Q('지금 시각은 몇 시 몇 분인가요?', h + '시 ' + m + '분', { t: 'clock', h, m }, clockSvg(h, m, true)); }
    const m = R.int(1, 11) * 5, k = R.int(3, 10) * 5, tot = h * 60 + m + k;
    let h2 = Math.floor(tot / 60), m2 = tot % 60; if (h2 > 12) h2 -= 12;
    return Q('시계가 나타내는 시각에서 ' + k + '분이 지나면 몇 시 몇 분인가요?', h2 + '시' + (m2 ? ' ' + m2 + '분' : ''), { t: 'later', h, m, k, h2, m2, clock: [h, m] }, clockSvg(h, m, true));
  };
  // 초3-1 덧셈과 뺄셈 (세 자리)
  G.e31_addsub = (R, d) => {
    for (;;) {
      const plus = R.chance(0.5);
      let a = R.int(101, 899), b = R.int(101, 899);
      if (d === 3 && !plus) { a = R.int(2, 9) * 100 + R.pick([0, 0, R.int(1, 9)]); b = R.int(101, a - 1); }
      const carries = ((a % 10) + (b % 10) >= 10) + ((Math.floor(a / 10) % 10) + (Math.floor(b / 10) % 10) >= 10);
      if (plus) {
        if (d === 1 && (carries > 1 || a + b > 999)) continue;
        if (d >= 2 && carries < 1) continue;
        return numQ(a + op('+') + b, a + '+' + b, a + b);
      }
      if (a <= b) continue;
      if (d === 1 && a % 10 < b % 10) continue;
      return numQ(a + op('-') + b, a + '-' + b, a - b);
    }
  };
  // 초3-1 나눗셈
  G.e31_div = (R, d) => {
    const b = d === 1 ? R.int(2, 5) : R.int(2, 9), q = R.int(d === 1 ? 1 : 2, 9), a = b * q;
    if (d === 3) {
      const k = R.int(0, 2);
      if (k === 0) return eqQ(BOX + op('/') + b + ' = ' + q, 'x/' + b, String(q), a);
      if (k === 1) return eqQ(a + op('/') + BOX + ' = ' + q, a + '/x', String(q), b);
      const thing = R.pick(['사탕', '색종이', '구슬', '딱지']);
      return Q(thing + ' ' + a + '개를 ' + b + '명이 똑같이 나누어 가지면 한 명이 몇 개씩 가질까요?', q + '개', { t: 'num', expr: a + '/' + b, val: String(q), int: true });
    }
    return numQ(a + op('/') + b, a + '/' + b, q, undefined, { int: true });
  };
  // 초3-1 곱셈
  G.e31_mul = (R, d) => {
    for (;;) {
      const a = R.int(11, 99), b = R.int(2, 9), t = Math.floor(a / 10), o = a % 10;
      if (d === 1 && (o * b >= 10 || t * b >= 10)) continue;
      if (d === 2 && (o * b < 10 || t * b + Math.floor(o * b / 10) >= 10)) continue;
      if (d === 3 && a * b < 100) continue;
      return numQ(a + op('*') + b, a + '*' + b, a * b);
    }
  };
  // 초3-1 길이와 시간 (시간의 계산)
  const hm = (min) => { const h = Math.floor(min / 60), m = min % 60; return (h ? h + '시간' : '') + (h && m ? ' ' : '') + (m || !h ? m + '분' : ''); };
  const ms = (sec) => { const m = Math.floor(sec / 60), s = sec % 60; return (m ? m + '분' : '') + (m && s ? ' ' : '') + (s || !m ? s + '초' : ''); };
  G.e31_time = (R, d) => {
    for (;;) {
      const useHM = R.chance(0.5), fmt = useHM ? hm : ms;
      const a1 = R.int(1, 8), a2 = R.int(1, 55), b1 = R.int(1, 5), b2 = R.int(1, 55);
      const A = a1 * 60 + a2, B = b1 * 60 + b2;
      if (d === 1) { if (R.chance(0.5) && a2 + b2 < 60) return numQ(fmt(A) + op('+') + fmt(B), A + '+' + B, A + B, fmt(A + B)); if (a2 >= b2 && a1 > b1) return numQ(fmt(A) + op('-') + fmt(B), A + '-' + B, A - B, fmt(A - B)); continue; }
      if (d === 2) { if (a2 + b2 > 60) return numQ(fmt(A) + op('+') + fmt(B), A + '+' + B, A + B, fmt(A + B)); continue; }
      if (a2 < b2 && a1 > b1) return numQ(fmt(A) + op('-') + fmt(B), A + '-' + B, A - B, fmt(A - B));
    }
  };
  // 초3-1 분수와 소수
  G.e31_frac = (R, d) => {
    const k = d === 1 ? 0 : d === 2 ? 1 : R.int(0, 2);
    if (k === 0) {
      const dd = R.int(2, d === 1 ? 8 : 12), n = R.int(1, dd - 1), pie = R.chance(0.4) && dd <= 10;
      return Q('색칠한 부분은 전체의 얼마인지 분수로 쓰세요.', fracH(n, dd), { t: 'fracfig', n, d: dd, expr: '(' + n + '/' + dd + ')', val: '(' + n + '/' + dd + ')' }, pie ? fracPieSvg(n, dd) : fracBarSvg(n, dd));
    }
    if (k === 1) {
      const s = d === 2 ? 0 : R.int(0, 2), i = R.int(1, 9), v = s * 10 + i;
      return Q('화살표(▼)가 가리키는 곳의 수를 소수로 쓰세요.', dec(v, 1), { t: 'num', expr: s + '+' + i + '/10', val: dec(v, 1), nline: [s, i] }, numberLineSvg(s, i));
    }
    const c = R.int(1, 9), m = R.int(1, 9);
    return R.chance(0.5) ? Q(c + ' cm ' + m + ' mm는 몇 cm인지 소수로 쓰세요.', dec(c * 10 + m, 1) + ' cm', { t: 'num', expr: c + '+' + m + '/10', val: dec(c * 10 + m, 1) })
      : Q('0.1이 ' + (c * 10 + m) + '개인 수는 얼마인가요?', dec(c * 10 + m, 1), { t: 'num', expr: '0.1*' + (c * 10 + m), val: dec(c * 10 + m, 1) });
  };
  // 초3-2 곱셈
  G.e32_mul = (R, d) => {
    const k = d === 1 ? 0 : d === 2 ? 1 : R.int(0, 2);
    if (k === 0) { const a = R.int(101, 999), b = R.int(2, 9); return numQ(a + op('*') + b, a + '*' + b, a * b); }
    if (k === 1) { const a = R.int(11, 99), b = R.int(11, 99); return numQ(a + op('*') + b, a + '*' + b, a * b); }
    const a = R.int(12, 99), b = R.int(12, 99), thing = R.pick(['상자에 사과가', '줄에 의자가', '묶음에 색종이가']);
    return Q('한 ' + thing + ' ' + a + '개씩 있어요. ' + b + '개 ' + (thing.startsWith('상자') ? '상자' : thing.startsWith('줄') ? '줄' : '묶음') + '에는 모두 몇 개인가요?', (a * b) + '개', { t: 'num', expr: a + '*' + b, val: String(a * b) });
  };
  const divAns = (q, r) => '몫: ' + q + (r ? ', 나머지: ' + r : (r === 0 ? ', 나머지: 0' : ''));
  // 초3-2 나눗셈
  G.e32_div = (R, d) => {
    for (;;) {
      const b = R.int(2, 9);
      if (d === 1) { const q = R.int(10, 49), a = b * q; if (a > 99) continue; return Q(a + op('/') + b, '몫: ' + q, { t: 'divmod', a, b, q, r: 0 }); }
      const a = d === 2 ? R.int(10, 99) : R.int(100, 999), q = Math.floor(a / b), r = a % b;
      if (r === 0 || q < 2) continue;
      return Q(a + op('/') + b, divAns(q, r), { t: 'divmod', a, b, q, r });
    }
  };
  // 초3-2 원
  G.e32_circle = (R, d) => {
    const k = d === 1 ? 0 : d === 2 ? 1 : R.pick([0, 1, 2, 2]);
    if (k === 0) { const r = R.int(2, 15); return Q('원의 반지름이 ' + r + ' cm예요. 지름은 몇 cm인가요?', 2 * r + ' cm', { t: 'num', expr: '2*' + r, val: String(2 * r), labels: [r + ' cm'] }, circleSvg(r + ' cm', 'r')); }
    if (k === 1) { const r = R.int(2, 15); return Q('원의 지름이 ' + 2 * r + ' cm예요. 반지름은 몇 cm인가요?', r + ' cm', { t: 'num', expr: 2 * r + '/2', val: String(r), labels: [2 * r + ' cm'] }, circleSvg(2 * r + ' cm', 'd')); }
    const n = R.int(2, 4), r = R.int(2, 9);
    return Q('크기가 같은 원 ' + n + '개를 직사각형 안에 꼭 맞게 그렸어요. 원의 반지름이 ' + r + ' cm일 때 직사각형의 가로는 몇 cm인가요?', 2 * r * n + ' cm', { t: 'num', expr: '2*' + r + '*' + n, val: String(2 * r * n), labels: [r + ' cm'] }, circlesRowSvg(n, r + ' cm'));
  };
  // 초3-2 분수
  G.e32_frac = (R, d) => {
    if (d === 3) {
      const dd = R.int(2, 9), w = R.int(1, 5), n = R.int(1, dd - 1), N = w * dd + n;
      return R.chance(0.5) ? Q(fracH(N, dd) + '을(를) 대분수로 나타내세요.', mixH(w, n, dd), { t: 'num', expr: '(' + N + '/' + dd + ')', val: '(' + w + '+' + n + '/' + dd + ')' })
        : Q(mixH(w, n, dd) + '을(를) 가분수로 나타내세요.', fracH(N, dd), { t: 'num', expr: '(' + w + '+' + n + '/' + dd + ')', val: '(' + N + '/' + dd + ')' });
    }
    const k = R.int(2, 8), q = R.int(2, 9), whole = k * q, j = d === 1 ? 1 : R.int(1, k - 1);
    return Q(whole + '의 ' + fracH(j, k) + '은(는) 얼마인가요?', String(q * j), { t: 'num', expr: whole + '*' + j + '/' + k, val: String(q * j), int: true });
  };
  // 초4-1 각도
  G.e41_angle = (R, d) => {
    const k = d === 1 ? 0 : d === 2 ? 1 : R.int(1, 3);
    if (k === 0) {
      if (R.chance(0.5)) { const a = R.int(3, 30) * 5, b = R.int(3, 30) * 5; return numQ(a + '°' + op('+') + b + '°', a + '+' + b, a + b, (a + b) + '°'); }
      const a = R.int(10, 34) * 5, b = R.int(2, a / 5 - 1) * 5; return numQ(a + '°' + op('-') + b + '°', a + '-' + b, a - b, (a - b) + '°');
    }
    if (k === 1) {
      const A = R.int(6, 20) * 5, B = R.int(6, Math.min(20, 30 - A / 5 - 4)) * 5, C = 180 - A - B;
      return Q('삼각형에서 □ 안에 알맞은 각도를 구하세요.', C + '°', { t: 'num', expr: '180-' + A + '-' + B, val: String(C), tri: [A, B, C] }, triangleSvg(A, B, [A + '°', B + '°', '□']));
    }
    if (k === 2) { const a = R.int(5, 31) * 5; return Q('직선 위에서 □ 안에 알맞은 각도를 구하세요.', (180 - a) + '°', { t: 'num', expr: '180-' + a, val: String(180 - a), labels: [a + '°'] }, straightAngleSvg(a, a + '°', '□')); }
    for (;;) { const a = R.int(12, 30) * 5, b = R.int(12, 30) * 5, c = R.int(12, 30) * 5, x = 360 - a - b - c; if (x >= 45 && x <= 160) return Q('사각형의 세 각이 ' + a + '°, ' + b + '°, ' + c + '°예요. 나머지 한 각은 몇 도인가요?', x + '°', { t: 'num', expr: '360-' + a + '-' + b + '-' + c, val: String(x) }); }
  };
  // 초4-1 곱셈과 나눗셈
  G.e41_muldiv = (R, d) => {
    if (d === 1) {
      if (R.chance(0.5)) { const a = R.int(101, 999), b = R.int(1, 9) * 10; return numQ(a + op('*') + b, a + '*' + b, a * b); }
      const b = R.int(2, 9) * 10, q = R.int(2, 9), r = R.int(0, b - 1), a = b * q + r; return Q(a + op('/') + b, divAns(q, r), { t: 'divmod', a, b, q, r });
    }
    if (d === 2) { const a = R.int(101, 999), b = R.int(11, 99); return numQ(a + op('*') + b, a + '*' + b, a * b); }
    for (;;) { const b = R.int(11, 99), a = R.int(100, 999), q = Math.floor(a / b), r = a % b; if (q >= 2) return Q(a + op('/') + b, divAns(q, r), { t: 'divmod', a, b, q, r }); }
  };
  // 초4-2 분수의 덧셈과 뺄셈 (분모가 같은 분수, 약분 안 함)
  G.e42_frac = (R, d) => {
    for (;;) {
      const dd = R.int(3, 12);
      if (d === 1) {
        const a = R.int(1, dd - 1), b = R.int(1, dd - 1);
        if (R.chance(0.5)) return numQ(fracH(a, dd) + op('+') + fracH(b, dd), '(' + a + '/' + dd + ')+(' + b + '/' + dd + ')', '(' + (a + b) + '/' + dd + ')', rawMixed(a + b, dd));
        if (a > b) return numQ(fracH(a, dd) + op('-') + fracH(b, dd), '(' + a + '/' + dd + ')-(' + b + '/' + dd + ')', '(' + (a - b) + '/' + dd + ')', fracH(a - b, dd));
        continue;
      }
      const w1 = R.int(1, 5), w2 = R.int(1, 4), a = R.int(1, dd - 1), b = R.int(1, dd - 1);
      const A = w1 * dd + a, B = w2 * dd + b, ea = '(' + w1 + '+' + a + '/' + dd + ')', eb = '(' + w2 + '+' + b + '/' + dd + ')';
      if (d === 2) {
        if (R.chance(0.5)) return numQ(mixH(w1, a, dd) + op('+') + mixH(w2, b, dd), ea + '+' + eb, '(' + (A + B) + '/' + dd + ')', rawMixed(A + B, dd));
        if (w1 > w2 && a >= b) return numQ(mixH(w1, a, dd) + op('-') + mixH(w2, b, dd), ea + '-' + eb, '(' + (A - B) + '/' + dd + ')', rawMixed(A - B, dd));
        continue;
      }
      if (R.chance(0.4)) { const W = R.int(2, 6); if (W * dd > B) return numQ(W + op('-') + mixH(w2, b, dd), W + '-' + eb, '(' + (W * dd - B) + '/' + dd + ')', rawMixed(W * dd - B, dd)); continue; }
      if (w1 > w2 && a < b) return numQ(mixH(w1, a, dd) + op('-') + mixH(w2, b, dd), ea + '-' + eb, '(' + (A - B) + '/' + dd + ')', rawMixed(A - B, dd));
    }
  };
  // 초4-2 소수의 덧셈과 뺄셈 (100배 한 정수로 계산)
  G.e42_dec = (R, d) => {
    for (;;) {
      const plus = d === 3 ? R.chance(0.25) : R.chance(0.5);
      let pa = 1, pb = 1;
      if (d === 2) { pa = R.pick([1, 2]); pb = pa === 1 ? 2 : R.pick([1, 2]); }
      if (d === 3) { pa = R.pick([0, 1, 2]); pb = 2; }
      const A = pa === 0 ? R.int(2, 9) : R.int(1, pa === 1 ? 99 : 999), B = R.int(1, pb === 1 ? 99 : 999);
      if ((pa && A % 10 === 0) || B % 10 === 0) continue;
      const A2 = A * Math.pow(10, 2 - pa), B2 = B * Math.pow(10, 2 - pb);
      if (plus) return numQ(dec(A, pa) + op('+') + dec(B, pb), dec(A, pa) + '+' + dec(B, pb), dec(A2 + B2, 2));
      if (A2 > B2) return numQ(dec(A, pa) + op('-') + dec(B, pb), dec(A, pa) + '-' + dec(B, pb), dec(A2 - B2, 2));
    }
  };
  // 초5-1 자연수의 혼합 계산
  G.e51_mixed = (R, d) => {
    const n = (a, b) => R.int(a, b);
    const mk = (s) => numQ(s.replace(/\*/g, ' × ').replace(/\//g, ' ÷ ').replace(/\+/g, ' + ').replace(/-/g, ' ' + MINUS + ' '), s, evalNat(s));
    for (;;) {
      if (d === 1) {
        const k = n(0, 4);
        if (k === 0) return mk(n(10, 60) + '+' + n(2, 9) + '*' + n(2, 9));
        if (k === 1) { const a = n(2, 9), b = n(2, 9), c = n(1, a * b - 1); return mk(a + '*' + b + '-' + c); }
        if (k === 2) { const b = n(2, 9), c = n(2, 9), a = b * c + n(1, 40); return mk(a + '-' + b + '*' + c); }
        if (k === 3) { const c = n(2, 9), q = n(2, 9); return mk(n(10, 60) + '+' + c * q + '/' + c); }
        const c = n(2, 9), q = n(2, 9); return mk((q + n(1, 50)) + '-' + c * q + '/' + c);
      }
      if (d === 2) {
        const k = n(0, 4);
        if (k === 0) return mk('(' + n(5, 40) + '+' + n(5, 40) + ')*' + n(2, 9));
        if (k === 1) { const c = n(2, 20), b = c + n(1, 15); return mk(n(2, 9) + '*(' + b + '-' + c + ')'); }
        if (k === 2) { const c = n(2, 9), q = n(3, 12), a = n(1, c * q - 1); return mk('(' + a + '+' + (c * q - a) + ')/' + c); }
        if (k === 3) { const b = n(5, 30), c = n(5, 30); return mk((b + c + n(1, 40)) + '-(' + b + '+' + c + ')'); }
        const c = n(2, 9), a = n(2, 9) * c, b = n(1, 30); return mk('(' + (a + b) + '-' + b + ')/' + c);
      }
      const k = n(0, 3);
      if (k === 0) { const e = n(2, 9), q = n(2, 9), a = n(5, 40), b = n(2, 9), c = n(2, 9); if (a + b * c >= q) return mk(a + '+' + b + '*' + c + '-' + e * q + '/' + e); continue; }
      if (k === 1) { const e = n(2, 9), q = n(2, 9), a = n(3, 20), b = n(3, 20), c = n(2, 6); if ((a + b) * c >= q) return mk('(' + a + '+' + b + ')*' + c + '-' + e * q + '/' + e); continue; }
      if (k === 2) { const e = n(2, 9), a = e * n(1, 6), b = n(2, 12), c = n(2, 12); return mk(a + '*(' + b + '+' + c + ')/' + e); }
      const b = n(10, 30), c = n(2, b - 1), dd = n(2, 6), a = (b - c) * dd + n(0, 50); return mk(a + '-(' + b + '-' + c + ')*' + dd);
    }
  };
  // 생성기 안에서 쓰는 간단한 계산기 (자연수 식)
  function evalNat(s) {
    let i = 0;
    const peek = () => s[i];
    function num() { if (peek() === '(') { i++; const v = expr(); i++; return v; } let t = ''; while (/[0-9]/.test(peek() || '')) t += s[i++]; return Number(t); }
    function term() { let v = num(); while (peek() === '*' || peek() === '/') { const o = s[i++]; const w = num(); v = o === '*' ? v * w : v / w; } return v; }
    function expr() { let v = term(); while (peek() === '+' || peek() === '-') { const o = s[i++]; const w = term(); v = o === '+' ? v + w : v - w; } return v; }
    return expr();
  }
  // 초5-1 약수와 배수
  G.e51_gcdlcm = (R, d) => {
    if (d === 1) {
      if (R.chance(0.6)) { const n = R.int(6, 48); const list = []; for (let k = 1; k <= n; k++) if (n % k === 0) list.push(k); return Q(n + '의 약수를 모두 쓰세요.', list.join(', '), { t: 'divisors', n, list }); }
      const n = R.int(3, 15), list = [1, 2, 3, 4, 5].map((k) => k * n); return Q(n + '의 배수를 가장 작은 수부터 5개 쓰세요.', list.join(', '), { t: 'multiples', n, list });
    }
    for (;;) {
      const g = R.int(2, 12), p = R.int(1, 9), q = R.int(2, 9);
      if (p === q || gcd(p, q) !== 1 || g * p > 99 || g * q > 99) continue;
      const a = g * p, b = g * q, l = lcm(a, b);
      if (d === 2) return Q(wa(a) + ' ' + b + '의 최대공약수를 구하세요.', String(g), { t: 'gcd', nums: [a, b], val: g });
      if (R.chance(0.5)) return Q(wa(a) + ' ' + b + '의 최소공배수를 구하세요.', String(l), { t: 'lcm', nums: [a, b], val: l });
      return Q(wa(a) + ' ' + b + '의 최대공약수와 최소공배수를 구하세요.', '최대공약수: ' + g + ', 최소공배수: ' + l, { t: 'gcdlcm', nums: [a, b], g, l });
    }
  };
  // 초5-1 약분과 통분
  G.e51_reduce = (R, d) => {
    if (d === 1) { const f = properFrac(R, 2, 12), k = R.int(2, 6); return Q(fracH(f.n * k, f.d * k) + '을(를) 기약분수로 나타내세요.', fracH(f.n, f.d), { t: 'num', expr: '(' + f.n * k + '/' + f.d * k + ')', val: fascii(f) }); }
    for (;;) {
      const a = properFrac(R, 2, 12), b = properFrac(R, 2, 12);
      if (a.d === b.d || (d === 3 && a.n * b.d === b.n * a.d)) continue;
      if (d === 2) {
        const L2 = lcm(a.d, b.d);
        return Q('(' + fracH(a.n, a.d) + ', ' + fracH(b.n, b.d) + ')을(를) 분모의 최소공배수로 통분하세요.', '(' + fracH(a.n * L2 / a.d, L2) + ', ' + fracH(b.n * L2 / b.d, L2) + ')',
          { t: 'common', f: [[a.n, a.d], [b.n, b.d]], g: [[a.n * L2 / a.d, L2], [b.n * L2 / b.d, L2]], unreduced: true });
      }
      const opr = a.n * b.d > b.n * a.d ? '>' : '<';
      return Q('크기를 비교하여 ○ 안에 &gt;, &lt;를 알맞게 쓰세요. &nbsp;' + fracH(a.n, a.d) + ' ○ ' + fracH(b.n, b.d), opr === '>' ? '&gt;' : '&lt;', { t: 'cmp', a: fascii(a), b: fascii(b), op: opr });
    }
  };
  // 초5-1 분수의 덧셈과 뺄셈
  G.e51_fracaddsub = (R, d) => {
    for (;;) {
      let a, b, plus;
      if (d === 1) { a = properFrac(R, 2, 10); b = properFrac(R, 2, 10); plus = true; }
      else if (d === 2) { plus = R.chance(0.5); if (plus) { a = mixedFrac(R, 2, 9, 3); b = mixedFrac(R, 2, 9, 3); } else { a = properFrac(R, 2, 12); b = properFrac(R, 2, 12); } }
      else { a = mixedFrac(R, 2, 10, 5); b = mixedFrac(R, 2, 10, 4); plus = false; }
      if (a.d === b.d) continue;
      const v = plus ? add(a, b) : sub(a, b);
      if (v.n <= 0) continue;
      if (d === 3 && (a.n % a.d) * b.d >= (b.n % b.d) * a.d) { if (R.chance(0.7)) continue; } // 받아내림 있는 문제를 더 많이
      return numQ(mixed(a) + op(plus ? '+' : '-') + mixed(b), fascii(a) + (plus ? '+' : '-') + fascii(b), fascii(v), mixed(v));
    }
  };
  // 초5-1 다각형의 둘레와 넓이
  G.e51_area = (R, d) => {
    const pick = d === 1 ? R.pick(['rect', 'square']) : d === 2 ? R.pick(['para', 'tri']) : R.pick(['trap', 'rhombus', 'tri', 'para']);
    if (pick === 'rect' || pick === 'square') {
      const w = R.int(3, 15), h = pick === 'square' ? w : R.int(2, 12), perim = R.chance(0.5), nm = pick === 'rect' ? '직사각형' : '정사각형';
      if (pick === 'rect' && w === h) return G.e51_area(R, d);
      const expr = perim ? (pick === 'rect' ? '(' + w + '+' + h + ')*2' : w + '*4') : w + '*' + h;
      const val = perim ? 2 * (w + h) : w * h;
      return Q(nm + '의 ' + (perim ? '둘레' : '넓이') + '는 몇 ' + (perim ? 'cm' : 'cm²') + '인가요?', val + (perim ? ' cm' : ' cm²'), { t: 'num', expr, val: String(val), labels: [w + ' cm'] }, shapeSvg(pick, { w, h, s: w }));
    }
    if (pick === 'para' || pick === 'tri') {
      for (;;) {
        const base = R.int(4, 16), h = R.int(3, 12);
        if (pick === 'tri' && (base * h) % 2) continue;
        const off = pick === 'para' ? R.pick([0.3, 0.4, 0.5]) : R.pick([-0.2, 0, 0.15]);
        const val = pick === 'para' ? base * h : base * h / 2;
        return Q((pick === 'para' ? '평행사변형' : '삼각형') + '의 넓이는 몇 cm²인가요?', val + ' cm²', { t: 'num', expr: pick === 'para' ? base + '*' + h : base + '*' + h + '/2', val: String(val), labels: [base + ' cm', h + ' cm'] }, shapeSvg(pick, { base, h, off }));
      }
    }
    if (pick === 'trap') {
      for (;;) {
        const top = R.int(3, 10), bottom = top + R.int(2, 8), h = R.int(3, 10);
        if (((top + bottom) * h) % 2) continue;
        const val = (top + bottom) * h / 2;
        return Q('사다리꼴의 넓이는 몇 cm²인가요?', val + ' cm²', { t: 'num', expr: '(' + top + '+' + bottom + ')*' + h + '/2', val: String(val), labels: [top + ' cm', bottom + ' cm', h + ' cm'] }, shapeSvg('trap', { top, bottom, h }));
      }
    }
    for (;;) {
      const d1 = R.int(4, 16), d2 = R.int(4, 14);
      if ((d1 * d2) % 2 || d1 === d2) continue;
      return Q('두 대각선의 길이가 그림과 같은 마름모의 넓이는 몇 cm²인가요?', d1 * d2 / 2 + ' cm²', { t: 'num', expr: d1 + '*' + d2 + '/2', val: String(d1 * d2 / 2), labels: [d1 + ' cm', d2 + ' cm'] }, shapeSvg('rhombus', { d1, d2 }));
    }
  };
  // 초5-2 분수의 곱셈
  G.e52_fracmul = (R, d) => {
    let parts;
    if (d === 1) { const f = properFrac(R, 2, 12), n = R.int(2, 9); parts = R.chance(0.5) ? [f, n] : [n, f]; }
    else if (d === 2) parts = R.chance(0.5) ? [properFrac(R, 2, 12), properFrac(R, 2, 12)] : [mixedFrac(R, 2, 6, 3), R.int(2, 6)];
    else parts = R.chance(0.6) ? [mixedFrac(R, 2, 6, 3), mixedFrac(R, 2, 6, 2)] : [properFrac(R, 2, 9), properFrac(R, 2, 9), properFrac(R, 2, 9)];
    const v = parts.reduce((x, y) => mul(x, y), F(1));
    return numQ(parts.map(mixed).join(op('*')), parts.map(fascii).join('*'), fascii(v), mixed(v));
  };
  // 초5-2 소수의 곱셈
  G.e52_decmul = (R, d) => {
    for (;;) {
      let A, pa, B, pb;
      if (d === 1) { A = R.int(2, 99); pa = 1; B = R.int(2, 9); pb = 0; }
      else if (d === 2) { A = R.int(2, 99); pa = 1; B = R.int(2, 99); pb = 1; }
      else { A = R.int(101, 999); pa = 2; B = R.int(2, 99); pb = R.pick([0, 1]); if (pb === 0) B = R.int(2, 30); }
      if (A % 10 === 0 || (pb && B % 10 === 0)) continue;
      const sw = d === 1 && R.chance(0.4);
      const h = sw ? dec(B, pb) + op('*') + dec(A, pa) : dec(A, pa) + op('*') + dec(B, pb);
      return numQ(h, (sw ? dec(B, pb) + '*' + dec(A, pa) : dec(A, pa) + '*' + dec(B, pb)), dec(A * B, pa + pb));
    }
  };
  // 초5-2 평균
  G.e52_avg = (R, d) => {
    if (d === 3) {
      const n = R.int(4, 5), m = R.int(15, 90), xs = []; for (let i = 0; i < n - 1; i++) xs.push(m + R.int(-12, 12));
      const x = n * m - xs.reduce((a, b) => a + b, 0);
      if (x <= 0) return G.e52_avg(R, d);
      return eqQ(n + '개의 수 ' + xs.join(', ') + ', □의 평균이 ' + ida(m) + '. □ 안에 알맞은 수를 구하세요.', '(' + xs.join('+') + '+x)/' + n, String(m), x);
    }
    const n = d === 1 ? R.int(3, 4) : 5, xs = []; for (let i = 0; i < n; i++) xs.push(R.int(d === 1 ? 5 : 20, d === 1 ? 30 : 99));
    const rem = xs.reduce((a, b) => a + b, 0) % n; xs[n - 1] += (n - rem) % n;
    const s = xs.reduce((a, b) => a + b, 0);
    const what = d === 1 ? '' : R.pick(['줄넘기 기록(번)', '읽은 쪽수(쪽)', '훌라후프 기록(번)']) + ' ';
    return Q(what + xs.join(', ') + '의 평균을 구하세요.', String(s / n), { t: 'num', expr: '(' + xs.join('+') + ')/' + n, val: String(s / n), int: true });
  };
  // 초6-1 분수의 나눗셈
  G.e61_fracdiv = (R, d) => {
    for (;;) {
      let a, b;
      if (d === 1) { a = R.int(1, 15); b = R.int(2, 9); if (a % b === 0) continue; }
      else if (d === 2) { a = properFrac(R, 2, 12); b = R.int(2, 9); }
      else { a = R.chance(0.5) ? mixedFrac(R, 2, 9, 4) : (() => { const dd = R.int(2, 7); return F(R.int(dd + 1, 4 * dd), dd); })(); b = R.int(2, 9); if (a.d === 1) continue; }
      const v = div(a, b);
      const ah = d === 3 && a.d > 1 && R.chance(0.5) ? fH(a) : mixed(a);
      return numQ(ah + op('/') + b, fascii(a) + '/' + b, fascii(v), mixed(v));
    }
  };
  // 유한소수인 분수 → 소수 문자열
  function fracToDec(f) { f = fr(f); for (let p = 0; p <= 6; p++) { const s = f.n * Math.pow(10, p); if (s % f.d === 0) return dec(s / f.d, p); } throw new Error('유한소수가 아니에요'); }
  // 초6-1 소수의 나눗셈
  G.e61_decdiv = (R, d) => {
    for (;;) {
      const b = R.int(2, 9);
      if (d === 1) { const q = R.int(11, 99); const D = q * b; if (q % 10 === 0 || D % 10 === 0) continue; return numQ(dec(D, 1) + op('/') + b, dec(D, 1) + '/' + b, dec(q, 1)); }
      if (d === 2) { const q = R.int(11, 299); const D = q * b; if (q % 10 === 0 || D % 10 === 0) continue; return numQ(dec(D, 2) + op('/') + b, dec(D, 2) + '/' + b, dec(q, 2)); }
      const bb = R.pick([2, 4, 5, 8]);
      if (R.chance(0.5)) { const a = R.int(1, 30); if (a % bb === 0) continue; return numQ(a + op('/') + bb, a + '/' + bb, fracToDec(F(a, bb))); }
      const D = R.int(11, 99); if (D % 10 === 0 || D % bb === 0) continue;
      return numQ(dec(D, 1) + op('/') + bb, dec(D, 1) + '/' + bb, fracToDec(F(D, 10 * bb)));
    }
  };
  // 초6-1 비와 비율
  G.e61_ratio = (R, d) => {
    if (d === 1) { const a = R.int(1, 15), b = R.int(2, 20); if (a === b) return G.e61_ratio(R, d); const v = F(a, b); return Q(a + ' : ' + b + '의 비율을 기약분수로 나타내세요.', fH(v), { t: 'num', expr: a + '/' + b, val: fascii(v) }); }
    if (d === 2) {
      const b = R.pick([2, 4, 5, 10, 20, 25, 50]), a = R.int(1, b - 1), v = F(a, b), ds = fracToDec(v), pct = a * 100 / b;
      return Q('기준량이 ' + b + ', 비교하는 양이 ' + a + '일 때 비율을 소수와 백분율로 나타내세요.', ds + ', ' + pct + '%', { t: 'num', expr: a + '/' + b, val: ds, pct: String(pct) });
    }
    const p = R.pick([10, 15, 20, 25, 30, 40, 50, 60, 75, 80]), x = R.int(2, 30) * 20;
    if (R.chance(0.5)) return Q(x + '의 ' + p + '%는 얼마인가요?', String(x * p / 100), { t: 'num', expr: x + '*' + p + '/100', val: String(x * p / 100), int: true });
    const price = x * 50; return Q(price + '원짜리 물건을 ' + p + '% 할인하여 사면 얼마를 내야 하나요?', (price * (100 - p) / 100) + '원', { t: 'num', expr: price + '-' + price + '*' + p + '/100', val: String(price * (100 - p) / 100), int: true });
  };
  // 초6-1 직육면체의 부피와 겉넓이
  G.e61_box = (R, d) => {
    if (d === 3 && R.chance(0.6)) {
      const s = R.int(2, 12);
      if (R.chance(0.5)) return Q('정육면체의 겉넓이는 몇 cm²인가요?', 6 * s * s + ' cm²', { t: 'num', expr: s + '*' + s + '*6', val: String(6 * s * s), labels: [s + ' cm'] }, boxSvg(s, s, s, true));
      return eqQ('부피가 ' + s * s * s + ' cm³인 정육면체가 있어요. 한 모서리의 길이는 몇 cm인가요?', 'x*x*x', String(s * s * s), s, s + ' cm');
    }
    const a = R.int(2, 15), b2 = R.int(2, 12), c = R.int(2, 12);
    if (a === b2 && b2 === c) return G.e61_box(R, d);
    const vol = d === 1 || (d === 3 && R.chance(0.5));
    if (vol) return Q('직육면체의 부피는 몇 cm³인가요?', a * b2 * c + ' cm³', { t: 'num', expr: a + '*' + b2 + '*' + c, val: String(a * b2 * c), labels: [a + ' cm', b2 + ' cm', c + ' cm'] }, boxSvg(a, b2, c));
    const sa = 2 * (a * b2 + b2 * c + a * c);
    return Q('직육면체의 겉넓이는 몇 cm²인가요?', sa + ' cm²', { t: 'num', expr: '(' + a + '*' + b2 + '+' + b2 + '*' + c + '+' + a + '*' + c + ')*2', val: String(sa), labels: [a + ' cm', b2 + ' cm', c + ' cm'] }, boxSvg(a, b2, c));
  };
  // 초6-2 분수의 나눗셈
  G.e62_fracdiv = (R, d) => {
    for (;;) {
      let a, b;
      if (d === 1) { const dd = R.int(3, 12), x = R.int(1, dd - 1), y = R.int(1, dd - 1); if (x === y) continue; const v = F(x, y); return numQ(fracH(x, dd) + op('/') + fracH(y, dd), '(' + x + '/' + dd + ')/(' + y + '/' + dd + ')', fascii(v), mixed(v)); }
      if (d === 2) { a = properFrac(R, 2, 12); b = properFrac(R, 2, 12); if (a.d === b.d) continue; }
      else { b = properFrac(R, 2, 9); a = R.chance(0.5) ? R.int(2, 9) : mixedFrac(R, 2, 6, 3); if (R.chance(0.3)) b = mixedFrac(R, 2, 5, 2); }
      const v = div(a, b);
      return numQ(mixed(a) + op('/') + mixed(b), fascii(a) + '/' + fascii(b), fascii(v), mixed(v));
    }
  };
  // 초6-2 소수의 나눗셈
  G.e62_decdiv = (R, d) => {
    for (;;) {
      if (d === 1) { const B = R.chance(0.5) ? R.int(2, 9) : R.int(11, 49), q = R.int(2, 12), A = B * q; if (B % 10 === 0 || A % 10 === 0) continue; return numQ(dec(A, 1) + op('/') + dec(B, 1), dec(A, 1) + '/' + dec(B, 1), String(q)); }
      if (d === 2) { const B = R.int(11, 49), Qv = R.int(11, 99), A = B * Qv; if (B % 10 === 0 || Qv % 10 === 0 || A % 10 === 0) continue; return numQ(dec(A, 2) + op('/') + dec(B, 1), dec(A, 2) + '/' + dec(B, 1), dec(Qv, 1)); }
      const [B, p] = R.pick([[5, 1], [15, 1], [25, 1], [12, 1], [25, 2], [75, 2], [125, 2], [4, 1], [8, 1]]);
      const m = Math.pow(10, p) / gcd(B, Math.pow(10, p)), q = m * R.int(1, Math.max(1, Math.floor(60 / m)));
      const n = B * q / Math.pow(10, p);
      if (n < 1 || n > 99 || n % 1) continue;
      return numQ(n + op('/') + dec(B, p), n + '/' + dec(B, p), String(q));
    }
  };
  // 초6-2 비례식과 비례배분
  G.e62_proportion = (R, d) => {
    if (d === 1) {
      for (;;) {
        const a = R.int(1, 9), b = R.int(2, 9), k = R.int(2, 9); if (a === b || gcd(a, b) !== 1) continue;
        const pos = R.int(0, 3), v = [a, b, a * k, b * k];
        const show = v.map((x, i) => (i === pos ? BOX : String(x)));
        const asc = v.map((x, i) => (i === pos ? 'x' : String(x)));
        return eqQ('비례식에서 □ 안에 알맞은 수를 구하세요. &nbsp;' + show[0] + ' : ' + show[1] + ' = ' + show[2] + ' : ' + show[3], asc[0] + '*' + asc[3], asc[1] + '*' + asc[2], v[pos]);
      }
    }
    if (d === 2) {
      for (;;) {
        const p = R.int(1, 9), q = R.int(1, 9); if (p === q || gcd(p, q) !== 1) continue;
        if (R.chance(0.5)) { const k = R.pick([1, 2, 3]); const A = p * k, B = q * k; if (A >= 100 || B >= 100) continue; return Q(dec(A, 1) + ' : ' + dec(B, 1) + '을(를) 간단한 자연수의 비로 나타내세요.', p + ' : ' + q, { t: 'ratio', a: dec(A, 1), b: dec(B, 1), p, q }); }
        // 분수의 비: 1/x : 1/y = y : x
        const x = q, y = p; return Q(fracH(1, x) + ' : ' + fracH(1, y) + '을(를) 간단한 자연수의 비로 나타내세요.', y + ' : ' + x, { t: 'ratio', a: '(1/' + x + ')', b: '(1/' + y + ')', p: y, q: x });
      }
    }
    for (;;) {
      const p = R.int(1, 9), q = R.int(1, 9); if (p === q || gcd(p, q) !== 1) continue;
      const N = (p + q) * R.int(2, 12);
      return Q(N + '을(를) ' + p + ' : ' + q + '로 비례배분하세요.', N * p / (p + q) + ', ' + N * q / (p + q), { t: 'share', N, p, q, x: N * p / (p + q), y: N * q / (p + q) });
    }
  };
  // 초6-2 원의 넓이 (원주율 3.14)
  G.e62_circle = (R, d) => {
    const k = d === 1 ? 0 : d === 2 ? 1 : 2;
    if (k === 0) {
      const useD = R.chance(0.5), v = R.int(2, 20), dia = useD ? v : 2 * v;
      return Q('원주는 몇 cm인가요?', dec(314 * dia, 2) + ' cm', { t: 'num', expr: '3.14*' + dia, val: dec(314 * dia, 2), labels: [v + ' cm'] }, circleSvg(v + ' cm', useD ? 'd' : 'r'));
    }
    if (k === 1) {
      const useD = R.chance(0.35), r = R.int(2, 15), lab = useD ? 2 * r : r;
      return Q('원의 넓이는 몇 cm²인가요?', dec(314 * r * r, 2) + ' cm²', { t: 'num', expr: '3.14*' + r + '*' + r, val: dec(314 * r * r, 2), labels: [lab + ' cm'] }, circleSvg(lab + ' cm', useD ? 'd' : 'r'));
    }
    if (R.chance(0.5)) { const dia = R.int(3, 30); return eqQ('원주가 ' + dec(314 * dia, 2) + ' cm인 원의 지름은 몇 cm인가요?', '3.14*x', dec(314 * dia, 2), dia, dia + ' cm'); }
    const r = R.int(2, 12);
    return Q('반지름이 ' + r + ' cm인 반원의 넓이는 몇 cm²인가요?', dec(157 * r * r, 2) + ' cm²', { t: 'num', expr: '3.14*' + r + '*' + r + '/2', val: dec(157 * r * r, 2) });
  };

  /* ---------- 중학교 ---------- */
  const PR = [2, 3, 5, 7, 11, 13];
  function factorize(n) { const f = []; for (let p = 2; p * p <= n; p++) { let e = 0; while (n % p === 0) { n /= p; e++; } if (e) f.push([p, e]); } if (n > 1) f.push([n, 1]); return f; }
  const facH = (f) => f.map(([p, e]) => p + (e > 1 ? '<sup>' + e + '</sup>' : '')).join(' × ');
  G.m11_prime = (R, d) => {
    if (d === 1) { for (;;) { let n = 1; const k = R.int(3, 5); for (let i = 0; i < k; i++) n *= R.pick(PR.slice(0, 4)); if (n < 12 || n > 400) continue; const f = factorize(n); return Q(n + '을(를) 소인수분해하세요.', facH(f), { t: 'pfac', n, f }); } }
    if (d === 2) {
      for (;;) {
        const g = R.pick([2, 3, 4, 6, 8, 9, 12, 15, 18]), p = R.int(1, 10), q = R.int(2, 10);
        if (p === q || gcd(p, q) !== 1 || g * p > 200 || g * q > 200) continue;
        const a = g * p, b = g * q;
        return Q(wa(facH(factorize(a))) + ' ' + facH(factorize(b)) + '의 최대공약수와 최소공배수를 구하세요.', '최대공약수: ' + g + ', 최소공배수: ' + lcm(a, b), { t: 'gcdlcm', nums: [a, b], g, l: lcm(a, b) });
      }
    }
    if (R.chance(0.5)) { for (;;) { const e = [R.int(0, 4), R.int(0, 3), R.int(0, 2)], n = Math.pow(2, e[0]) * Math.pow(3, e[1]) * Math.pow(5, e[2]); if (n < 20 || n > 1000) continue; const cnt = (e[0] + 1) * (e[1] + 1) * (e[2] + 1); return Q(n + '의 약수의 개수를 구하세요.', cnt + '개', { t: 'ndiv', n, val: cnt }); } }
    for (;;) { const g = R.pick([2, 3, 4, 6]), xs = [R.int(2, 9), R.int(2, 9), R.int(2, 9)].map((x) => x * g); if (new Set(xs).size < 3) continue; const G3 = gcd(gcd(xs[0], xs[1]), xs[2]), L3 = lcm(lcm(xs[0], xs[1]), xs[2]); return Q(xs.join(', ') + '의 최대공약수와 최소공배수를 구하세요.', '최대공약수: ' + G3 + ', 최소공배수: ' + L3, { t: 'gcdlcm', nums: xs, g: G3, l: L3 }); }
  };
  G.m11_intaddsub = (R, d) => {
    if (d < 3) {
      const n = d === 1 ? 2 : 3, max = d === 1 ? 9 : 20;
      const xs = []; for (let i = 0; i < n; i++) xs.push(R.nz(-max, max));
      const ops = []; for (let i = 1; i < n; i++) ops.push(R.pick(['+', '-']));
      let h = sgnH(xs[0]), a = fascii(xs[0]), v = F(xs[0]);
      ops.forEach((o, i) => { h += op(o) + sgnH(xs[i + 1]); a += o + fascii(xs[i + 1]); v = o === '+' ? add(v, xs[i + 1]) : sub(v, xs[i + 1]); });
      return numQ(h, a, fascii(v), fH(v));
    }
    const n = R.int(2, 3), xs = []; for (let i = 0; i < n; i++) { const f = R.chance(0.7) ? properFrac(R, 2, 6) : F(R.int(1, 5)); xs.push(R.chance(0.5) ? mul(f, -1) : f); }
    const ops = []; for (let i = 1; i < n; i++) ops.push(R.pick(['+', '-']));
    let h = sgnH(xs[0]), a = fascii(xs[0]), v = xs[0];
    ops.forEach((o, i) => { h += op(o) + sgnH(xs[i + 1]); a += o + fascii(xs[i + 1]); v = o === '+' ? add(v, xs[i + 1]) : sub(v, xs[i + 1]); });
    return numQ(h, a, fascii(v), fH(v));
  };
  G.m11_intmuldiv = (R, d) => {
    if (d === 1) {
      const a = R.nz(-9, 9), b = R.nz(-9, 9);
      if (R.chance(0.5)) return numQ(sgnH(a) + op('*') + sgnH(b), fascii(a) + '*' + fascii(b), fascii(a * b), fH(a * b));
      return numQ(sgnH(a * b) + op('/') + sgnH(b), fascii(a * b) + '/' + fascii(b), fascii(a), fH(a));
    }
    if (d === 2) {
      for (;;) {
        const base = R.pick([-3, -2, -1, 2, 3]), e = R.int(2, 3), b = R.nz(-6, 6), pw = Math.pow(base, e), prod = pw * b;
        const divs = []; for (let c = 2; c <= 9; c++) if (prod % c === 0) divs.push(c);
        if (!divs.length) continue;
        const c = R.pick(divs) * R.sign(), v = prod / c;
        const bh = base < 0 ? '(' + MINUS + Math.abs(base) + ')' : String(base);
        return numQ(bh + '<sup>' + e + '</sup>' + op('*') + sgnH(b) + op('/') + sgnH(c), '(' + base + ')^' + e + '*' + fascii(b) + '/' + fascii(c), fascii(v), fH(v));
      }
    }
    if (R.chance(0.5)) {
      const xs = [properFrac(R, 2, 9), properFrac(R, 2, 9), properFrac(R, 2, 9)].map((f) => (R.chance(0.5) ? mul(f, -1) : f));
      const o1 = R.pick(['*', '/']), o2 = R.pick(['*', '/']);
      let v = o1 === '*' ? mul(xs[0], xs[1]) : div(xs[0], xs[1]); v = o2 === '*' ? mul(v, xs[2]) : div(v, xs[2]);
      return numQ(sgnH(xs[0]) + op(o1) + sgnH(xs[1]) + op(o2) + sgnH(xs[2]), fascii(xs[0]) + o1 + fascii(xs[1]) + o2 + fascii(xs[2]), fascii(v), fH(v));
    }
    const a = R.nz(-9, 9), b = R.nz(-9, 9), dd = R.nz(-6, 6), c = dd * R.nz(-5, 5), o = R.pick(['+', '-']);
    const v = o === '+' ? a * b + c / dd : a * b - c / dd;
    return numQ(sgnH(a) + op('*') + sgnH(b) + op(o) + sgnH(c) + op('/') + sgnH(dd), fascii(a) + '*' + fascii(b) + o + fascii(c) + '/' + fascii(dd), fascii(v), fH(v));
  };
  const par = (p) => '(' + pH(p) + ')';
  G.m11_expr = (R, d) => {
    if (d === 1) {
      const a = R.nz(-6, 6), b = R.nz(-9, 9), x = R.nz(-5, 5);
      if (R.chance(0.5)) { const p = lin(a, b); const v = a * x + b; return Q('<i>x</i> = ' + fH(x) + '일 때, ' + pH(p) + '의 값을 구하세요.', fH(v), { t: 'num', expr: pA(p), vars: { x: String(x) }, val: String(v) }); }
      const y = R.nz(-5, 5), c = R.nz(-5, 5), p = P([[a, 1, 0], [c, 0, 1]]), v = a * x + c * y;
      return Q('<i>x</i> = ' + fH(x) + ', <i>y</i> = ' + fH(y) + '일 때, ' + pH(p) + '의 값을 구하세요.', fH(v), { t: 'num', expr: pA(p), vars: { x: String(x), y: String(y) }, val: String(v) });
    }
    if (d === 2) {
      const p = lin(R.nz(-9, 9), R.nz(-9, 9)), q = lin(R.nz(-9, 9), R.nz(-9, 9));
      if (R.chance(0.5)) { const o = R.pick(['+', '-']); const v = o === '+' ? pAdd(p, q) : pSub(p, q); return Q(par(p) + op(o) + par(q), pH(v), { t: 'poly', expr: pA(p) + o + pA(q), val: pA(v) }); }
      const k = R.nz(-5, 5), m = R.int(2, 5), v = pSub(pScale(p, k), pScale(q, m));
      return Q((k === -1 ? MINUS : k === 1 ? '' : fH(k)) + par(p) + op('-') + m + par(q), pH(v), { t: 'poly', expr: k + '*' + pA(p) + '-' + m + '*' + pA(q), val: pA(v) });
    }
    const b1 = R.int(2, 4), b2 = R.int(2, 5), p = lin(R.nz(-4, 4), R.nz(-6, 6)), q = lin(R.nz(-4, 4), R.nz(-6, 6));
    if (b1 === b2) return G.m11_expr(R, d);
    const o = R.pick(['+', '-']), v = o === '+' ? pAdd(pScale(p, F(1, b1)), pScale(q, F(1, b2))) : pSub(pScale(p, F(1, b1)), pScale(q, F(1, b2)));
    return Q(fracH(pH(p), b1) + op(o) + fracH(pH(q), b2), pH(v), { t: 'poly', expr: pA(p) + '/' + b1 + o + pA(q) + '/' + b2, val: pA(v) });
  };
  G.m11_lineq = (R, d) => {
    const x0 = R.nz(-9, 9);
    if (d === 1) { const a = R.pick([-9, -8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9]), b = R.nz(-15, 15), c = a * x0 + b; return eqQ(pH(lin(a, b)) + ' = ' + fH(c), pA(lin(a, b)), String(c), x0, '<i>x</i> = ' + fH(x0)); }
    if (d === 2) {
      for (;;) {
        const a = R.nz(-9, 9), c = R.nz(-9, 9); if (a === c) continue;
        if (R.chance(0.5)) { const b = R.nz(-12, 12), e = (a - c) * x0 + b; if (e === 0) continue; const L2 = lin(a, b), R2 = lin(c, e); return eqQ(pH(L2) + ' = ' + pH(R2), pA(L2), pA(R2), x0, '<i>x</i> = ' + fH(x0)); }
        const k = R.int(2, 5), b = R.nz(-6, 6), L2 = pScale(lin(1, b), k), e = k * (x0 + b) - c * x0; if (e === 0 || k === c) continue;
        const R2 = lin(c, e); return eqQ(k + par(lin(1, b)) + ' = ' + pH(R2), k + '*' + pA(lin(1, b)), pA(R2), x0, '<i>x</i> = ' + fH(x0));
      }
    }
    for (let t = 0; t < 500; t++) {
      if (R.chance(0.5)) {
        const p = R.int(2, 5), r = R.int(2, 6), b1 = R.nz(-6, 6), b2 = R.nz(-6, 6); if (p === r) continue;
        const e = sub(F(x0 + b1, p), F(x0 + b2, r)); if (e.d !== 1 || e.n === 0) continue;
        const lh = fracH(pH(lin(1, b1)), p), rh = fracH(pH(lin(1, b2)), r) + (e.n > 0 ? ' + ' + e.n : ' ' + MINUS + ' ' + Math.abs(e.n));
        return eqQ(lh + ' = ' + rh, pA(lin(1, b1)) + '/' + p, pA(lin(1, b2)) + '/' + r + '+' + fascii(e), x0, '<i>x</i> = ' + fH(x0));
      }
      const a = R.int(1, 9), c = R.int(1, 9), b = R.nz(-30, 30); if (a === c) continue;
      const e = (a - c) * x0 + b; if (e === 0) continue;
      const decLin = (k, m) => dec(k, 1) + '<i>x</i>' + (m > 0 ? ' + ' + dec(m, 1) : ' ' + MINUS + ' ' + dec(-m, 1));
      return eqQ(decLin(a, b) + ' = ' + decLin(c, e), dec(a, 1) + '*x+' + fascii(F(b, 10)), dec(c, 1) + '*x+' + fascii(F(e, 10)), x0, '<i>x</i> = ' + fH(x0));
    }
    return G.m11_lineq(R, 2);
  };
  G.m12_angle = (R, d) => {
    const k = d === 1 ? 0 : d === 2 ? 1 : R.int(0, 2) === 0 ? 3 : 2;
    if (k === 0) {
      const a = R.int(6, 30) * 5; if (a === 90) return G.m12_angle(R, d);
      const opp = R.chance(0.5);
      const lab = opp ? [a + '°', null, '∠x', null] : [a + '°', '∠x', null, null];
      const v = opp ? a : 180 - a;
      return Q('그림에서 ∠x의 크기를 구하세요.', '∠x = ' + v + '°', { t: 'num', expr: opp ? String(a) : '180-' + a, val: String(v), labels: [a + '°'] }, crossSvg(a, lab));
    }
    if (k === 1) {
      const t = R.int(7, 29) * 5; if (t === 90) return G.m12_angle(R, d);
      const kind = R.int(0, 2), angle = [t, 180 - t, t, 180 - t]; // 영역별 크기
      // 동위각: 같은 자리 / 엇각·같은 쪽 안쪽 각: 두 평행선 사이(위쪽 교점의 아래 영역 2,3)
      const qTop = kind === 0 ? R.int(0, 3) : R.int(2, 3);
      const qBot = kind === 0 ? qTop : kind === 1 ? [2, 3, 0, 1][qTop] : [3, 2, 1, 0][qTop];
      const v = angle[qBot];
      return Q('l // m일 때, ∠x의 크기를 구하세요.', '∠x = ' + v + '°', { t: 'num', expr: String(v), val: String(v), labels: [angle[qTop] + '°'], par: [t, qTop, qBot] }, parallelSvg(t, { q: qTop, lab: angle[qTop] + '°' }, { q: qBot, lab: '∠x' }));
    }
    if (k === 2) { const a = R.int(5, 13) * 5, b = R.int(5, 13) * 5; return Q('l // m일 때, ∠x의 크기를 구하세요.', '∠x = ' + (a + b) + '°', { t: 'num', expr: a + '+' + b, val: String(a + b), labels: [a + '°', b + '°'] }, zigzagSvg(a, b)); }
    for (;;) {
      const x = R.int(10, 40), p = R.int(2, 4), q = R.int(-20, 30), ang = p * x + q;
      if (ang <= 20 || ang >= 160 || ang === 90 || q === 0) continue;
      const lab1 = '(' + p + 'x ' + (q > 0 ? '+ ' + q : MINUS + ' ' + (-q)) + ')°';
      return Object.assign(eqQ('그림에서 x의 값을 구하세요. (맞꼭지각)', p + '*x+' + fascii(q), String(ang), x, 'x = ' + x), { svg: crossSvg(ang, [lab1, null, ang + '°', null]) });
    }
  };
  G.m12_polygon = (R, d) => {
    if (d === 1) {
      const n = R.int(4, 15);
      if (R.chance(0.5)) return Q(n + '각형의 대각선의 개수를 구하세요.', n * (n - 3) / 2 + '개', { t: 'num', expr: n + '*(' + n + '-3)/2', val: String(n * (n - 3) / 2) });
      return Q(n + '각형의 내각의 크기의 합을 구하세요.', 180 * (n - 2) + '°', { t: 'num', expr: '180*(' + n + '-2)', val: String(180 * (n - 2)) });
    }
    const n = R.pick([3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36]);
    if (d === 2) {
      if (R.chance(0.5)) return Q('정' + n + '각형의 한 내각의 크기를 구하세요.', 180 * (n - 2) / n + '°', { t: 'num', expr: '180*(' + n + '-2)/' + n, val: String(180 * (n - 2) / n), int: true });
      return Q('정' + n + '각형의 한 외각의 크기를 구하세요.', 360 / n + '°', { t: 'num', expr: '360/' + n, val: String(360 / n), int: true });
    }
    const k = R.int(0, 2), m = R.int(5, 16);
    if (k === 0) return eqQ('내각의 크기의 합이 ' + 180 * (m - 2) + '°인 다각형은 몇 각형인가요?', '180*(x-2)', String(180 * (m - 2)), m, m + '각형');
    if (k === 1) return eqQ('한 외각의 크기가 ' + 360 / n + '°인 정다각형은 정몇각형인가요?', '360/x', String(360 / n), n, '정' + n + '각형');
    return eqQ('대각선의 개수가 ' + m * (m - 3) / 2 + '개인 다각형은 몇 각형인가요?', 'x*(x-3)/2', String(m * (m - 3) / 2), m, m + '각형');
  };
  const piH = (c) => { c = fr(c); return (c.n === 1 && c.d === 1 ? '' : fH(c)) + 'π'; };
  G.m12_sector = (R, d) => {
    const r = R.int(2, 12), th = R.pick([30, 45, 60, 72, 90, 120, 135, 150, 210, 240, 270]);
    const arcC = F(2 * r * th, 360), areaC = F(r * r * th, 360);
    const fig = sectorSvg(r + ' cm', th);
    if (d === 1) return Q('반지름이 ' + r + ' cm, 중심각이 ' + th + '°인 부채꼴의 호의 길이를 구하세요.', piH(arcC) + ' cm', { t: 'approx', expr: '2*pi*' + r + '*' + th + '/360', val: fascii(arcC) + '*pi', labels: [r + ' cm', th + '°'] }, fig);
    if (d === 2) return Q('반지름이 ' + r + ' cm, 중심각이 ' + th + '°인 부채꼴의 넓이를 구하세요.', piH(areaC) + ' cm²', { t: 'approx', expr: 'pi*' + r + '^2*' + th + '/360', val: fascii(areaC) + '*pi', labels: [r + ' cm', th + '°'] }, fig);
    if (R.chance(0.5)) return Q('반지름이 ' + r + ' cm, 중심각이 ' + th + '°인 부채꼴의 둘레의 길이를 구하세요.', '(' + piH(arcC) + ' + ' + 2 * r + ') cm', { t: 'approx', expr: '2*pi*' + r + '*' + th + '/360+2*' + r, val: fascii(arcC) + '*pi+' + 2 * r, labels: [r + ' cm', th + '°'] }, fig);
    const l = arcC, Sv = mul(F(r, 2), l);
    return Q('반지름이 ' + r + ' cm이고 호의 길이가 ' + piH(l) + ' cm인 부채꼴의 넓이를 구하세요.', piH(Sv) + ' cm²', { t: 'approx', expr: '(1/2)*' + r + '*' + fascii(l) + '*pi', val: fascii(Sv) + '*pi' });
  };

  /* 순환소수 */
  function repH(ip, nr, rp) {
    const ds = rp.split('').map((c, i) => (i === 0 || i === rp.length - 1 ? '<span class="dot">' + c + '</span>' : c)).join('');
    return ip + '.' + nr + ds;
  }
  function repVal(ip, nr, rp) { // 분수 값
    const all = Number(nr + rp), head = Number(nr || '0');
    const den = (Math.pow(10, rp.length) - 1) * Math.pow(10, nr.length);
    return add(ip, F(all - head, den));
  }
  function toRepeating(f) { // 분수 → [정수부분, 순환하지 않는 부분, 순환마디]
    f = fr(f); const ip = Math.floor(f.n / f.d); let r = f.n % f.d; const seen = {}; let digits = '';
    while (r && seen[r] === undefined) { seen[r] = digits.length; r *= 10; digits += Math.floor(r / f.d); r %= f.d; }
    if (!r) return null;
    return [ip, digits.slice(0, seen[r]), digits.slice(seen[r])];
  }
  G.m21_repeating = (R, d) => {
    if (d === 1) {
      for (;;) {
        const b = R.pick([3, 6, 9, 11, 12, 15, 22, 27, 33, 37, 45]), a = R.int(1, b - 1), f = F(a, b), rep = toRepeating(f);
        if (!rep || rep[2].length > 3) continue;
        if (R.chance(0.5)) return Q(fracH(f.n, f.d) + '을(를) 순환소수로 나타내고 점을 찍어 쓰세요.', repH(rep[0], rep[1], rep[2]), { t: 'rep', ip: rep[0], nr: rep[1], rp: rep[2], val: fascii(f) });
        const long = rep[0] + '.' + rep[1] + rep[2].repeat(Math.ceil(8 / rep[2].length)) + '…';
        return Q(long + '의 순환마디를 쓰세요.', rep[2], { t: 'rep', ip: rep[0], nr: rep[1], rp: rep[2], val: fascii(f), cyc: rep[2] });
      }
    }
    for (;;) {
      const ip = d === 2 ? 0 : R.int(0, 3), nr = d === 2 ? '' : String(R.int(0, 9));
      const len = R.int(1, 2); let rp = String(R.int(1, 9)); if (len === 2) rp += String(R.int(0, 9));
      if (rp === '9' || rp === '99' || (rp.length === 2 && rp[0] === rp[1])) continue;
      if (nr && nr === rp[rp.length - 1]) continue;
      if (d === 3 && ip === 0 && !nr) continue;
      const v = repVal(ip, nr, rp);
      return Q(repH(ip, nr, rp) + '을(를) 기약분수로 나타내세요.', fH(v), { t: 'rep', ip, nr, rp, val: fascii(v) });
    }
  };
  // 단항식: c x^a y^b
  const mono = (c, a, b) => P([[c, a, b || 0]]);
  const monoH = (m, parenNeg) => { const h = pH(m); return parenNeg && h.startsWith(MINUS) ? '(' + h + ')' : h; };
  G.m21_exp = (R, d) => {
    if (d === 1) {
      const a = R.int(2, 7), b = R.int(2, 7), k = R.int(0, 2), X = '<i>x</i>';
      if (k === 0) return Q(X + '<sup>' + a + '</sup> × ' + X + '<sup>' + b + '</sup>', X + '<sup>' + (a + b) + '</sup>', { t: 'poly', expr: 'x^' + a + '*x^' + b, val: 'x^' + (a + b) });
      if (k === 1) return Q('(' + X + '<sup>' + a + '</sup>)<sup>' + b + '</sup>', X + '<sup>' + (a * b) + '</sup>', { t: 'poly', expr: '(x^' + a + ')^' + b, val: 'x^' + (a * b) });
      const v = a - b;
      return Q(X + '<sup>' + a + '</sup> ÷ ' + X + '<sup>' + b + '</sup>', v > 0 ? (v === 1 ? X : X + '<sup>' + v + '</sup>') : v === 0 ? '1' : fracH(1, -v === 1 ? X : X + '<sup>' + (-v) + '</sup>'), { t: 'poly', expr: 'x^' + a + '/x^' + b, val: v >= 0 ? 'x^' + v : '1/x^' + (-v) });
    }
    const rm = (cmax) => mono(R.nz(-cmax, cmax), R.int(0, 3), R.int(0, 3));
    if (d === 2) {
      if (R.chance(0.6)) { let A, B; do { A = rm(6); B = rm(6); } while (pKeys1(A) === '0,0' || pKeys1(B) === '0,0'); const v = pMul(A, B); return Q(monoH(A) + ' × ' + monoH(B, true), pH(v), { t: 'poly', expr: pA(A) + '*' + pA(B), val: pA(v) }); }
      let A; do { A = mono(R.nz(-3, 3), R.int(1, 3), R.int(0, 2)); } while (Math.abs(A.t[Object.keys(A.t)[0]].n) === 1 && R.chance(0.3));
      const n = R.int(2, 3), v = pPow(A, n); return Q('(' + pH(A) + ')<sup>' + n + '</sup>', pH(v), { t: 'poly', expr: pA(A) + '^' + n, val: pA(v) });
    }
    let Qm, B;
    do { Qm = mono(R.nz(-6, 6), R.int(0, 3), R.int(0, 3)); B = mono(R.nz(-5, 5), R.int(1, 3), R.int(0, 2)); } while (pKeys1(Qm) === '0,0');
    const A = pMul(Qm, B);
    if (R.chance(0.5)) return Q(monoH(A) + ' ÷ ' + monoH(B, true), pH(Qm), { t: 'poly', expr: pA(A) + '/' + pA(B), val: pA(Qm) });
    const C = mono(R.nz(-4, 4), R.int(0, 2), R.int(1, 2)), v = pMul(Qm, C);
    return Q(monoH(A) + ' ÷ ' + monoH(B, true) + ' × ' + monoH(C, true), pH(v), { t: 'poly', expr: pA(A) + '/' + pA(B) + '*' + pA(C), val: pA(v) });
  };
  function pKeys1(m) { return Object.keys(m.t)[0] || '0,0'; }
  G.m21_poly = (R, d) => {
    if (d === 1) {
      const p = P([[R.nz(-9, 9), 1, 0], [R.nz(-9, 9), 0, 1], [R.int(-9, 9), 0, 0]]), q = P([[R.nz(-9, 9), 1, 0], [R.nz(-9, 9), 0, 1]]);
      const o = R.pick(['+', '-']), v = o === '+' ? pAdd(p, q) : pSub(p, q);
      return Q(par(p) + op(o) + par(q), pH(v), { t: 'poly', expr: pA(p) + o + pA(q), val: pA(v) });
    }
    if (d === 2) {
      if (R.chance(0.5)) {
        const p = P([[R.nz(-5, 5), 2, 0], [R.nz(-9, 9), 1, 0], [R.nz(-9, 9), 0, 0]]), q = P([[R.nz(-5, 5), 2, 0], [R.nz(-9, 9), 1, 0], [R.nz(-9, 9), 0, 0]]);
        const o = R.pick(['+', '-']), v = o === '+' ? pAdd(p, q) : pSub(p, q);
        return Q(par(p) + op(o) + par(q), pH(v), { t: 'poly', expr: pA(p) + o + pA(q), val: pA(v) });
      }
      const p = P([[R.nz(-6, 6), 1, 0], [R.nz(-6, 6), 0, 1]]), q = P([[R.nz(-6, 6), 1, 0], [R.nz(-6, 6), 0, 1]]), k = R.int(2, 4), m = R.int(2, 4);
      const v = pSub(pScale(p, k), pScale(q, m));
      return Q(k + par(p) + op('-') + m + par(q), pH(v), { t: 'poly', expr: k + '*' + pA(p) + '-' + m + '*' + pA(q), val: pA(v) });
    }
    const kind = R.int(0, 2);
    if (kind === 0) { const m = mono(R.nz(-5, 5), 1, R.int(0, 1)), p = P([[R.nz(-6, 6), 1, 0], [R.nz(-6, 6), 0, 1]]), v = pMul(m, p); return Q(monoH(m) + par(p), pH(v), { t: 'poly', expr: pA(m) + '*' + pA(p), val: pA(v) }); }
    if (kind === 1) { const m = mono(R.nz(-5, 5), 1, 1), Qp = P([[R.nz(-6, 6), 1, 0], [R.nz(-6, 6), 0, 1], [R.nz(-6, 6), 0, 0]]), A = pMul(Qp, m); return Q(par(A) + ' ÷ ' + monoH(m, true), pH(Qp), { t: 'poly', expr: pA(A) + '/' + pA(m), val: pA(Qp) }); }
    const m1 = mono(R.nz(-4, 4), 1, 0), m2 = mono(R.nz(-4, 4), 1, 0), p = lin(R.nz(-5, 5), R.nz(-6, 6)), q = lin(R.nz(-5, 5), R.nz(-6, 6));
    const v = pAdd(pMul(m1, p), pMul(m2, q)); const m2h = pH(m2);
    return Q(monoH(m1) + par(p) + (m2h.startsWith(MINUS) ? ' ' + MINUS + ' ' + m2h.slice(1) : ' + ' + m2h) + par(q), pH(v), { t: 'poly', expr: pA(m1) + '*' + pA(p) + '+' + pA(m2) + '*' + pA(q), val: pA(v) });
  };
  const INEQ_H = { '<': '&lt;', '>': '&gt;', '<=': '≤', '>=': '≥' }, FLIP = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' };
  G.m21_ineq = (R, d) => {
    const o = R.pick(['<', '>', '<=', '>=']);
    for (let t = 0; t < 500; t++) {
      const k = R.int(-8, 8);
      let Lp, Rp, Lh, Rh, La, Ra;
      if (d === 1) { const a = R.int(2, 9), b = R.nz(-12, 12); Lp = lin(a, b); Rp = P([[a * k + b, 0, 0]]); Lh = pH(Lp); Rh = fH(a * k + b); La = pA(Lp); Ra = String(a * k + b); }
      else if (d === 2) { const a = R.nz(-7, 7), c = R.nz(-7, 7); if (a === c) continue; const b = R.nz(-12, 12), e = (a - c) * k + b; Lp = lin(a, b); Rp = lin(c, e); if (e === 0) continue; Lh = pH(Lp); Rh = pH(Rp); La = pA(Lp); Ra = pA(Rp); }
      else {
        const a = R.int(2, 5), c = R.nz(-4, 4), p = R.nz(-5, 5), q = R.nz(-5, 5); if (a === c) continue;
        const r = a * (k + p) - c * (k + q); if (r === 0) continue;
        Lp = pScale(lin(1, p), a); Rp = pAdd(pScale(lin(1, q), c), P([[r, 0, 0]]));
        Lh = a + par(lin(1, p)); Rh = (c === 1 ? '' : c === -1 ? MINUS : fH(c)) + par(lin(1, q)) + (r > 0 ? ' + ' + r : ' ' + MINUS + ' ' + (-r));
        La = a + '*' + pA(lin(1, p)); Ra = c + '*' + pA(lin(1, q)) + '+' + fascii(r);
      }
      const coef = sub((Lp.t['1,0'] || F(0)), (Rp.t['1,0'] || F(0)));
      const so = coef.n > 0 ? o : FLIP[o];
      return Q(Lh + ' ' + INEQ_H[o] + ' ' + Rh, '<i>x</i> ' + INEQ_H[so] + ' ' + fH(k), { t: 'ineq', lhs: La, rhs: Ra, op: o, sop: so, k: String(k) });
    }
  };
  function eqLine(a, b, c) { return pH(P([[a, 1, 0], [b, 0, 1]])) + ' = ' + fH(c); }
  G.m21_system = (R, d) => {
    const x = R.int(-6, 6), y = R.int(-6, 6);
    for (;;) {
      let a1, b1, a2, b2;
      if (d === 1) { a1 = R.pick([1, 2, 3]); b1 = 1; a2 = 1; b2 = R.pick([-1, -2, 1, 2]); }
      else { a1 = R.nz(-6, 6); b1 = R.nz(-6, 6); a2 = R.nz(-6, 6); b2 = R.nz(-6, 6); }
      if (a1 * b2 - a2 * b1 === 0) continue;
      const c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y;
      let l1h = eqLine(a1, b1, c1), l1a = [pA(P([[a1, 1, 0], [b1, 0, 1]])), String(c1)];
      if (d === 3) {
        if (R.chance(0.5)) { // 괄호: k(x + p) + b1 y = c
          const k = R.int(2, 4), p = R.nz(-5, 5), c = k * (x + p) + b1 * y;
          l1h = k + par(lin(1, p)) + (b1 > 0 ? ' + ' : ' ' + MINUS + ' ') + (Math.abs(b1) === 1 ? '' : Math.abs(b1)) + '<i>y</i> = ' + fH(c);
          l1a = [k + '*' + pA(lin(1, p)) + '+' + fascii(b1) + '*y', String(c)];
          if (k * b2 - a2 * b1 === 0) continue;
        } else { // 분수: x/p + y/q = c
          const p = R.int(2, 4), q = R.int(2, 5); if (p === q) continue;
          const c = add(F(x, p), F(y, q)); if (c.d !== 1) continue;
          l1h = fracH('<i>x</i>', p) + ' + ' + fracH('<i>y</i>', q) + ' = ' + fH(c); l1a = ['x/' + p + '+y/' + q, fascii(c)];
          a1 = F(1, p); b1 = F(1, q);
          if (sub(mul(a1, b2), mul(a2, b1)).n === 0) continue;
        }
      }
      const l2h = eqLine(a2, b2, c2), l2a = [pA(P([[a2, 1, 0], [b2, 0, 1]])), String(c2)];
      return Q('<span class="sys"><span>' + l1h + '</span><span>' + l2h + '</span></span>', '<i>x</i> = ' + fH(x) + ', <i>y</i> = ' + fH(y), { t: 'sys', eqs: [l1a, l2a], x: String(x), y: String(y) });
    }
  };
  const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41]];
  G.m22_pyth = (R, d) => {
    let [a, b, c] = R.pick(TRIPLES); const k = c <= 17 ? R.int(1, 3) : 1; a *= k; b *= k; c *= k;
    if (R.chance(0.5)) [a, b] = [b, a];
    const ratio = Math.max(0.35, Math.min(0.9, a / b));
    if (d === 1) return Q('직각삼각형에서 x의 값을 구하세요.', 'x = ' + c, { t: 'pyth', a, b, c, ask: 'c', val: c, labels: [a + ' cm', b + ' cm'] }, rightTriSvg({ a: a + ' cm', b: b + ' cm', c: 'x cm' }, { ratio }));
    if (d === 2 || R.chance(0.5)) return Q('직각삼각형에서 x의 값을 구하세요.', 'x = ' + a, { t: 'pyth', a, b, c, ask: 'a', val: a, labels: [b + ' cm', c + ' cm'] }, rightTriSvg({ a: 'x cm', b: b + ' cm', c: c + ' cm' }, { ratio }));
    return Q('직사각형에서 대각선의 길이 x의 값을 구하세요.', 'x = ' + c, { t: 'pyth', a, b, c, ask: 'c', val: c, labels: [a + ' cm', b + ' cm'] }, rectDiagSvg(b, a));
  };
  const SQF = [2, 3, 5, 6, 7];
  G.m31_sqrt = (R, d) => {
    if (d === 1) {
      const k = R.int(0, 2), t = R.pick(SQF);
      if (k === 0) { const a = R.int(2, 6); return Q(sqrtH(a * a * t) + '을(를) <i>a</i>√<i>b</i> 꼴로 나타내세요.', sH(S(1, a * a * t)), { t: 'approx', expr: 'sqrt(' + a * a * t + ')', val: sA(S(1, a * a * t)) }); }
      if (k === 1) { const x = R.int(2, 12), y = R.int(2, 12); if (x === y) return G.m31_sqrt(R, d); const v = S(1, x * y); return Q(sqrtH(x) + ' × ' + sqrtH(y), sH(v), { t: 'approx', expr: 'sqrt(' + x + ')*sqrt(' + y + ')', val: sA(v) }); }
      const y = R.int(2, 7), m = R.int(2, 6), x = y * m * (R.chance(0.5) ? 1 : m); const v = S(1, x / y); return Q(sqrtH(x) + ' ÷ ' + sqrtH(y), sH(v), { t: 'approx', expr: 'sqrt(' + x + ')/sqrt(' + y + ')', val: sA(v) });
    }
    if (d === 2) {
      const t = R.pick(SQF);
      if (R.chance(0.4)) { const a = R.int(2, 9), b = R.int(1, 9), c = R.int(1, 9), v = a + b - c; if (v === 0) return G.m31_sqrt(R, d); return Q(a + sqrtH(t) + ' + ' + b + sqrtH(t) + ' ' + MINUS + ' ' + c + sqrtH(t), sH(S(v, t)), { t: 'approx', expr: a + '*sqrt(' + t + ')+' + b + '*sqrt(' + t + ')-' + c + '*sqrt(' + t + ')', val: sA(S(v, t)) }); }
      const p = R.int(1, 5), q = R.int(1, 5), o = R.pick(['+', '-']); if (p === q) return G.m31_sqrt(R, d);
      const v = o === '+' ? S(p + q, t) : S(p - q, t);
      return Q(sqrtH(p * p * t) + op(o) + sqrtH(q * q * t), sH(v), { t: 'approx', expr: 'sqrt(' + p * p * t + ')' + o + 'sqrt(' + q * q * t + ')', val: sA(v) });
    }
    const k = R.int(0, 2);
    if (k === 0) { const b = R.pick([2, 3, 5, 6, 7]), a = R.int(1, 4) * (R.chance(0.5) ? b : 1); const v = S(F(a, b), b); return Q('분모를 유리화하세요. &nbsp;' + fracH(a, sqrtH(b)), sH(v), { t: 'approx', expr: a + '/sqrt(' + b + ')', val: sA(v) }); }
    if (k === 1) { const a = R.int(2, 12), b = R.int(2, 12); if (a === b) return G.m31_sqrt(R, d); const v = S(a - b, 1); return Q('(' + sqrtH(a) + ' + ' + sqrtH(b) + ')(' + sqrtH(a) + ' ' + MINUS + ' ' + sqrtH(b) + ')', sH(v), { t: 'approx', expr: '(sqrt(' + a + ')+sqrt(' + b + '))*(sqrt(' + a + ')-sqrt(' + b + '))', val: sA(v) }); }
    const t = R.pick([2, 3]), m = R.int(2, 3), u = R.pick([5, 6, 7].filter((z) => z !== t)), base = S(1, t), v = sMul(base, sAdd(S(1, m * m * t), S(1, u)));
    return Q(sqrtH(t) + '(' + sqrtH(m * m * t) + ' + ' + sqrtH(u) + ')', sH(v), { t: 'approx', expr: 'sqrt(' + t + ')*(sqrt(' + m * m * t + ')+sqrt(' + u + '))', val: sA(v) });
  };
  G.m31_expand = (R, d) => {
    let v, expr, h;
    if (d === 1) { const p = lin(1, R.nz(-9, 9)), q = lin(1, R.nz(-9, 9)); v = pMul(p, q); h = par(p) + par(q); expr = pA(p) + '*' + pA(q); }
    else if (d === 2) {
      const k = R.int(0, 2);
      if (k === 0) { const p = lin(1, R.nz(-9, 9)); v = pMul(p, p); h = par(p) + '<sup>2</sup>'; expr = pA(p) + '^2'; }
      else if (k === 1) { const a = R.int(1, 9), c = R.int(1, 4), p = lin(c, a), q = lin(c, -a); v = pMul(p, q); h = par(p) + par(q); expr = pA(p) + '*' + pA(q); }
      else { const p = lin(R.nz(-5, 5), R.nz(-6, 6)), q = lin(R.int(2, 5), R.nz(-6, 6)); v = pMul(p, q); h = par(p) + par(q); expr = pA(p) + '*' + pA(q); }
    } else {
      const k = R.int(0, 2);
      if (k === 0) { const p = P([[R.nz(-5, 5), 1, 0], [R.nz(-5, 5), 0, 1]]); v = pMul(p, p); h = par(p) + '<sup>2</sup>'; expr = pA(p) + '^2'; }
      else if (k === 1) { const a = R.int(1, 5), b = R.int(1, 5), p = P([[a, 1, 0], [b, 0, 1]]), q = P([[a, 1, 0], [-b, 0, 1]]); v = pMul(p, q); h = par(p) + par(q); expr = pA(p) + '*' + pA(q); }
      else { const p = lin(1, R.nz(-6, 6)), q = lin(1, R.nz(-6, 6)), r = lin(1, R.nz(-6, 6)); v = pSub(pMul(p, q), pMul(r, r)); h = par(p) + par(q) + ' ' + MINUS + ' ' + par(r) + '<sup>2</sup>'; expr = pA(p) + '*' + pA(q) + '-' + pA(r) + '^2'; }
    }
    return Q(h, pH(v), { t: 'poly', expr, val: pA(v) });
  };
  // 인수분해 결과 표시: 앞 단항식 + 일차식 인수들
  function factH(pre, facs) { // facs: [[poly, exp]]
    return (pre ? pre : '') + facs.map(([p, e]) => par(p) + (e > 1 ? '<sup>' + e + '</sup>' : '')).join('');
  }
  function factA(preA, facs) { return [preA || '1'].concat(facs.map(([p, e]) => pA(p) + (e > 1 ? '^' + e : ''))).join('*'); }
  G.m31_factor = (R, d) => {
    if (d === 1) {
      if (R.chance(0.35)) { const k = R.int(2, 6), a = R.nz(-9, 9), f = lin(1, a), v = pMul(mono(k, 1, 0), f); return Q(pH(v), factH(k + '<i>x</i>', [[f, 1]]), { t: 'poly', expr: pA(v), val: factA(k + '*x', [[f, 1]]), factored: true }); }
      for (;;) { const p = R.nz(-9, 9), q = R.nz(-9, 9); if (p === q) continue; const f1 = lin(1, p), f2 = lin(1, q), v = pMul(f1, f2); return Q(pH(v), factH('', [[f1, 1], [f2, 1]]), { t: 'poly', expr: pA(v), val: factA('', [[f1, 1], [f2, 1]]), factored: true }); }
    }
    if (d === 2) {
      if (R.chance(0.5)) { const a = R.int(1, 4), b = R.nz(-9, 9); if (gcd(a, b) !== 1) return G.m31_factor(R, d); const f = lin(a, b), v = pMul(f, f); return Q(pH(v), factH('', [[f, 2]]), { t: 'poly', expr: pA(v), val: factA('', [[f, 2]]), factored: true }); }
      const a = R.int(1, 5), b = R.int(1, 9); if (gcd(a, b) !== 1) return G.m31_factor(R, d);
      const useY = R.chance(0.4), f1 = useY ? P([[a, 1, 0], [b, 0, 1]]) : lin(a, b), f2 = useY ? P([[a, 1, 0], [-b, 0, 1]]) : lin(a, -b), v = pMul(f1, f2);
      return Q(pH(v), factH('', [[f1, 1], [f2, 1]]), { t: 'poly', expr: pA(v), val: factA('', [[f1, 1], [f2, 1]]), factored: true });
    }
    if (R.chance(0.6)) {
      for (;;) { const p = R.int(1, 4), r = R.int(1, 4), q = R.nz(-7, 7), s = R.nz(-7, 7); if (p * r < 2 || gcd(p, q) !== 1 || gcd(r, s) !== 1 || (p === r && q === s)) continue; const f1 = lin(p, q), f2 = lin(r, s), v = pMul(f1, f2); return Q(pH(v), factH('', [[f1, 1], [f2, 1]]), { t: 'poly', expr: pA(v), val: factA('', [[f1, 1], [f2, 1]]), factored: true }); }
    }
    const k = R.int(2, 5), a = R.int(1, 7), f1 = lin(1, a), f2 = lin(1, -a), v = pScale(pMul(f1, f2), k);
    return Q(pH(v), factH(String(k), [[f1, 1], [f2, 1]]), { t: 'poly', expr: pA(v), val: factA(String(k), [[f1, 1], [f2, 1]]), factored: true });
  };
  const rootsAns = (rs) => rs.length === 1 ? '<i>x</i> = ' + rs[0] + ' (중근)' : '<i>x</i> = ' + rs[0] + ' 또는 <i>x</i> = ' + rs[1];
  G.m31_quad = (R, d) => {
    if (d === 1) {
      const k = R.int(0, 2);
      if (k === 0) { const a = R.nz(-9, 9), b = R.nz(-9, 9); if (a === b) return G.m31_quad(R, d); const rs = [Math.min(a, b), Math.max(a, b)]; return Q(par(lin(1, -a)) + par(lin(1, -b)) + ' = 0', rootsAns(rs.map(fH)), { t: 'quad', expr: pA(lin(1, -a)) + '*' + pA(lin(1, -b)), roots: rs.map(String) }); }
      if (k === 1) { const a = R.int(2, 12); return Q('<i>x</i><sup>2</sup> = ' + a * a, '<i>x</i> = ±' + a, { t: 'quad', expr: 'x^2-' + a * a, roots: [String(a), String(-a)] }); }
      const n = R.pick([2, 3, 5, 6, 7, 8, 12, 18, 20, 27]), s = S(1, n); return Q('<i>x</i><sup>2</sup> = ' + n, '<i>x</i> = ±' + sH(s), { t: 'quad', expr: 'x^2-' + n, roots: [sA(s), '-' + sA(s)] });
    }
    if (d === 2) {
      if (R.chance(0.6)) { const a = R.nz(-9, 9), b = R.chance(0.15) ? a : R.nz(-9, 9), v = pMul(lin(1, -a), lin(1, -b)); const rs = a === b ? [fH(a)] : [Math.min(a, b), Math.max(a, b)].map(fH); return Q(pH(v) + ' = 0', rootsAns(rs), { t: 'quad', expr: pA(v), roots: (a === b ? [a] : [a, b]).map(String) }); }
      for (;;) { const p = R.int(2, 4), q = R.nz(-7, 7), s = R.nz(-7, 7); if (gcd(p, q) !== 1) continue; const v = pMul(lin(p, q), lin(1, s)); const r1 = F(-q, p), r2 = F(-s); const rs = [r1, r2].sort((u, w) => u.n / u.d - w.n / w.d); return Q(pH(v) + ' = 0', rootsAns(rs.map((z) => fH(z))), { t: 'quad', expr: pA(v), roots: rs.map(fascii) }); }
    }
    for (;;) {
      if (R.chance(0.4)) { const a = R.nz(-6, 6), k = R.pick([2, 3, 5, 6, 7, 8, 12]), s = S(1, k); const ah = par(lin(1, a)) + '<sup>2</sup> = ' + k; return Q(ah, '<i>x</i> = ' + fH(-a) + ' ± ' + sH(s), { t: 'quad', expr: pA(lin(1, a)) + '^2-' + k, roots: [(-a) + '+' + sA(s), (-a) + '-' + sA(s)] }); }
      const b = R.nz(-9, 9), c = R.nz(-9, 9), D = b * b - 4 * c; if (D <= 0) continue;
      const [sq, t] = sqfree(D); if (t === 1) continue;
      const v = P([[1, 2, 0], [b, 1, 0], [c, 0, 0]]);
      let ansH, rA;
      if (b % 2 === 0 && sq % 2 === 0) { const h = -b / 2, m = sq / 2; ansH = '<i>x</i> = ' + (h ? fH(h) + ' ± ' : '±') + (m === 1 ? '' : m) + sqrtH(t); rA = [h + '+' + m + '*sqrt(' + t + ')', h + '-' + m + '*sqrt(' + t + ')']; }
      else { ansH = '<i>x</i> = ' + fracH((b ? fH(-b) + ' ± ' : '±') + (sq === 1 ? '' : sq) + sqrtH(t), 2); rA = ['(' + (-b) + '+' + sq + '*sqrt(' + t + '))/2', '(' + (-b) + '-' + sq + '*sqrt(' + t + '))/2']; }
      return Q(pH(v) + ' = 0', ansH, { t: 'quad', expr: pA(v), roots: rA });
    }
  };
  const TRIG = { sin: { 30: S(F(1, 2), 1), 45: S(F(1, 2), 2), 60: S(F(1, 2), 3) }, cos: { 30: S(F(1, 2), 3), 45: S(F(1, 2), 2), 60: S(F(1, 2), 1) }, tan: { 30: S(F(1, 3), 3), 45: S(1, 1), 60: S(1, 3) } };
  G.m32_trig = (R, d) => {
    if (d < 3) {
      let [a, b, c] = R.pick(TRIPLES.slice(0, 4)); if (R.chance(0.5)) [a, b] = [b, a];
      const fn = R.pick(['sin', 'cos', 'tan']), at = d === 1 ? 'A' : R.pick(['A', 'B']);
      const opp = at === 'A' ? a : b, adj = at === 'A' ? b : a, v = fn === 'sin' ? F(opp, c) : fn === 'cos' ? F(adj, c) : F(opp, adj);
      const labels = { a: String(a), b: String(b), c: String(c) };
      if (d === 2) { const hide = R.pick(['a', 'b', 'c']); labels[hide] = ''; }
      return Q('∠C = 90°인 직각삼각형 ABC에서 ' + fn + ' ' + at + '의 값을 구하세요.', fH(v), { t: 'trig', a, b, c, fn, at, val: fascii(v) }, rightTriSvg(labels, { names: true, ratio: Math.max(0.35, Math.min(0.9, a / b)) }));
    }
    const fns = ['sin', 'cos', 'tan'], angs = [30, 45, 60];
    for (;;) {
      const f1 = R.pick(fns), a1 = R.pick(angs), f2 = R.pick(fns), a2 = R.pick(angs), o = R.pick(['+', '-', '*']);
      const v1 = TRIG[f1][a1], v2 = TRIG[f2][a2];
      const r1 = Object.keys(v1)[0], r2 = Object.keys(v2)[0];
      if (o !== '*' && r1 !== r2) continue;
      const v = o === '*' ? sMul(v1, v2) : sAdd(v1, o === '+' ? v2 : sMul(v2, S(-1, 1)));
      return Q(f1 + ' ' + a1 + '°' + op(o) + f2 + ' ' + a2 + '°', sH(v), { t: 'approx', expr: f1 + '(' + a1 + ')' + o + f2 + '(' + a2 + ')', val: sA(v) });
    }
  };

  /* ---------- 문제지 만들기 ---------- */
  // 문제의 '틀': 숫자를 모두 # 로 바꾼 문장 (숫자만 바꾼 같은 문제인지 알아보는 데 써요)
  const skeleton = (p) => p.q.replace(/<[^>]+>/g, '').replace(/\d+(\.\d+)?/g, '#').replace(/\s+/g, ' ').trim() + (p.svg ? '|그림' : '');
  // 문장제를 넣을 자리: 네 문제마다 한 문제 (4, 8, 12 … 번)
  const isWordSlot = (i) => i % 4 === 3;
  const HELP = { clockSvg, groupsSvg, fracBarSvg, fracPieSvg, numberLineSvg, circleSvg, triangleSvg, straightAngleSvg, shapeSvg, boxSvg, sectorSvg, rightTriSvg, rectDiagSvg, crossSvg, parallelSvg };
  function makeProblems(unitId, level, count, seed) {
    const gen = G[unitId];
    if (!gen) throw new Error('없는 단원: ' + unitId);
    const wgen = WORDS && WORDS.W[unitId];
    const R = MD.makeRng(seed + '|' + unitId + '|' + level);
    const RW = MD.makeRng(seed + '|' + unitId + '|' + level + '|문장제');
    const out = [], seen = new Set(), sk = [];
    // 같은 틀이 바로 이어지거나, 최근 5문제 안에 3번 나오면 다시 뽑아요(다른 틀이 없는 단원은 그대로 써요)
    const tooSame = (s) => (sk.length && sk[sk.length - 1] === s) || sk.slice(-5).filter((x) => x === s).length >= 2;
    while (out.length < count) {
      const word = wgen && isWordSlot(out.length);
      let pick = null, fallback = null, second = null;
      for (let t = 0; t < 40 && !pick; t++) {
        const p = word ? wgen(RW, level, HELP) : gen(R, level);
        const key = p.q + '|' + p.svg;
        if (seen.has(key)) continue;
        const s = skeleton(p);
        if (!fallback) fallback = p;
        if (!second && s !== sk[sk.length - 1]) second = p; // 최소한 바로 앞 문제와는 다른 틀
        if (!tooSame(s)) pick = p;
      }
      pick = pick || second;
      pick = pick || fallback || (word ? wgen(RW, level, HELP) : gen(R, level));
      seen.add(pick.q + '|' + pick.svg); sk.push(skeleton(pick)); out.push(pick);
    }
    return out;
  }

  const API = { G, makeProblems, skeleton, HELP };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.MD_GEN = API;
})(typeof window !== 'undefined' ? window : this);
