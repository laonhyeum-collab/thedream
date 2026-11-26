/* 연산 문제은행 — 문장제(생활 속 문제)와 그림 문제
 * 교과서·문제집처럼 계산을 '상황' 속에서 쓰는 문제를 단원마다 여러 모양으로 만들어요.
 * 같은 문장에 숫자만 바꾼 문제가 이어지지 않도록, 단원마다 상황(틀)을 여러 개 두고 골라요.
 * 문제 하나 = { q, svg, ans, chk } (generators.js 와 같아요). chk 로 테스트가 정답을 따로 다시 계산해요. */
(function (root) {
  'use strict';
  const MD = (typeof module !== 'undefined' && module.exports) ? require('./core.js') : root.MD;
  const { F, add, sub, mul, div, gcd, lcm, fascii, fracH, fH, mixH, svg, T, L, poly } = MD;

  const Q = (q, ans, chk, fig) => ({ q, ans: String(ans), chk: Object.assign({ word: true }, chk), svg: fig || '' });
  const num = (q, ans, expr, val, fig, extra) => Q(q, ans, Object.assign({ t: 'num', expr, val: String(val) }, extra || {}), fig);
  const mixed = (v) => fH(v, { mixed: true });
  const rawMixed = (N, d) => (N % d === 0 ? String(N / d) : (N > d ? mixH(Math.floor(N / d), N % d, d) : fracH(N, d)));
  // 정수 n 을 10^p 로 나눈 소수 (끝의 0 은 지워요)
  const dc = (n, p) => { let s = String(n); while (s.length <= p) s = '0' + s; s = p ? s.slice(0, s.length - p) + '.' + s.slice(s.length - p) : s; return p ? s.replace(/0+$/, '').replace(/\.$/, '') : s; };
  const NAMES = ['지우', '수아', '민재', '유나', '서아', '태오'];
  function properFrac(R, dmin, dmax) { for (;;) { const d = R.int(dmin, dmax); const n = R.int(1, d - 1); if (gcd(n, d) === 1) return F(n, d); } }

  /* ---------- 그림 ---------- */
  // 점 배열: rows 줄, 한 줄에 cols 개
  function arraySvg(rows, cols) {
    const g = 18, W = cols * g + 16, H = rows * g + 16; let b = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) b += '<circle class="dot" cx="' + (8 + g / 2 + c * g) + '" cy="' + (8 + g / 2 + r * g) + '" r="6" fill="#ffb627" stroke="#8a5a00"/>';
    return svg(W, H, b, rows + '줄 ' + cols + '개씩 놓인 점');
  }
  // 띠 그림(테이프 다이어그램): parts = [[길이, 글자], ...] 를 이어 붙이고, 아래에 전체 글자
  function tapeSvg(parts, totalLabel, opt) {
    opt = opt || {}; const W = 250, x0 = 10, sum = parts.reduce((s, p) => s + p[0], 0); let x = x0, b = '';
    const colors = ['#cfe2ff', '#ffe3b3', '#d7f5dd'];
    parts.forEach((p, i) => {
      const w = p[0] / sum * W;
      b += '<rect x="' + x.toFixed(1) + '" y="22" width="' + w.toFixed(1) + '" height="26" fill="' + (p[2] ? '#fff' : colors[i % 3]) + '" stroke="#222" stroke-width="1.4"' + (p[2] ? ' stroke-dasharray="4 3"' : '') + '/>';
      b += T(x + w / 2, 12, p[1], { size: 12, fill: p[1].indexOf('?') >= 0 ? '#c0392b' : '#222' });
      x += w;
    });
    if (totalLabel) b += L(x0, 58, x0 + W, 58, { w: 1.2 }) + L(x0, 53, x0, 63, { w: 1.2 }) + L(x0 + W, 53, x0 + W, 63, { w: 1.2 }) + T(x0 + W / 2, 72, totalLabel, { size: 12, fill: totalLabel.indexOf('?') >= 0 ? '#c0392b' : '#222' });
    return svg(W + 20, totalLabel ? 82 : 56, b, opt.label || '띠 그림');
  }
  // ㄱ자(L자) 도형: 큰 직사각형 W×H 의 오른쪽 위에서 w×h 를 잘라 낸 모양
  function lShapeSvg(W, H, w, h) {
    const sc = Math.min(170 / W, 110 / H), x0 = 40, y0 = 14, X = (v) => x0 + v * sc, Y = (v) => y0 + v * sc;
    let b = poly([[X(0), Y(0)], [X(W - w), Y(0)], [X(W - w), Y(h)], [X(W), Y(h)], [X(W), Y(H)], [X(0), Y(H)]], { cls: 'lshape' });
    b += T(X(W / 2), Y(H) + 14, W + ' cm') + T(X(0) - 6, Y(H / 2), H + ' cm', { anchor: 'end' });
    b += T(X((W - w) / 2), Y(0) - 7, (W - w) + ' cm') + T(X(W) + 6, Y((h + H) / 2), (H - h) + ' cm', { anchor: 'start' });
    return svg(Math.round(X(W) + 50), Math.round(Y(H) + 26), b, 'ㄱ자 모양 도형');
  }

  /* ---------- 단원별 문장제 ---------- */
  const W = {};
  W.e11_addsub = (R) => {
    const k = R.int(0, 2);
    if (k === 0) { const a = R.int(1, 6), b = R.int(1, 9 - a), f = R.pick([['바구니에', '사과', '배', '개'], ['하늘에', '빨간 풍선', '노란 풍선', '개'], ['나무에', '참새', '비둘기', '마리']]); return num(f[0] + ' ' + f[1] + ' ' + a + f[3] + '와 ' + f[2] + ' ' + b + f[3] + '가 있어요. 모두 몇 ' + f[3] + '인가요?', (a + b) + f[3], a + '+' + b, a + b); }
    if (k === 1) { const a = R.int(4, 9), b = R.int(1, a - 1); return num('놀이터에 친구 ' + a + '명이 있었는데 ' + b + '명이 집에 갔어요. 남은 친구는 몇 명인가요?', (a - b) + '명', a + '-' + b, a - b); }
    const a = R.int(5, 9), b = R.int(1, a - 1); return num('구슬 ' + a + '개를 두 주머니에 나누어 담았어요. 한 주머니에 ' + b + '개를 담았다면 다른 주머니에는 몇 개를 담았나요?', (a - b) + '개', a + '-' + b, a - b, tapeSvg([[b, b + '개'], [a - b, '?']], '모두 ' + a + '개'));
  };
  W.e12_addsub1 = (R) => {
    const k = R.int(0, 2), n = R.pick(NAMES);
    const nc = () => { for (;;) { const a = R.int(21, 78), b = R.int(11, 98 - a); if (a % 10 + b % 10 < 10) return [a, b]; } };
    const nb = () => { for (;;) { const a = R.int(35, 99), b = R.int(11, a - 10); if (a % 10 >= b % 10) return [a, b]; } };
    if (k === 0) { const [a, b] = nc(); return num(n + '는 줄넘기를 어제 ' + a + '번, 오늘 ' + b + '번 했어요. 이틀 동안 모두 몇 번 했나요?', (a + b) + '번', a + '+' + b, a + b); }
    if (k === 1) { const [a, b] = nb(); return num('색종이 ' + a + '장 중에서 ' + b + '장을 썼어요. 남은 색종이는 몇 장인가요?', (a - b) + '장', a + '-' + b, a - b); }
    const [a, b] = nb(); return num('도서관에 동화책이 ' + a + '권, 과학책이 ' + b + '권 있어요. 동화책은 과학책보다 몇 권 더 많나요?', (a - b) + '권', a + '-' + b, a - b, tapeSvg([[b, '과학책 ' + b + '권'], [a - b, '?']], '동화책 ' + a + '권'));
  };
  W.e12_addsub2 = (R) => {
    const k = R.int(0, 2);
    if (k === 0) { const a = R.int(3, 9), b = R.int(11 - a, 9); return num('빵집에서 크림빵 ' + a + '개와 단팥빵 ' + b + '개를 샀어요. 빵은 모두 몇 개인가요?', (a + b) + '개', a + '+' + b, a + b); }
    if (k === 1) { const a = R.int(11, 18), b = R.int(a - 9, 9); return num('주차장에 자동차가 ' + a + '대 있었는데 ' + b + '대가 나갔어요. 남은 자동차는 몇 대인가요?', (a - b) + '대', a + '-' + b, a - b); }
    const a = R.int(2, 7), b = R.int(2, 7), c = R.int(1, 6); return num('버스에 ' + a + '명이 타고 있었어요. 첫 정류장에서 ' + b + '명, 다음 정류장에서 ' + c + '명이 더 탔어요. 버스에 탄 사람은 모두 몇 명인가요?', (a + b + c) + '명', a + '+' + b + '+' + c, a + b + c);
  };
  W.e21_addsub = (R) => {
    const k = R.int(0, 2);
    if (k === 0) { for (;;) { const a = R.int(25, 69), b = R.int(15, 99 - a); if (a % 10 + b % 10 >= 10) return num('학교 화단에 튤립 ' + a + '송이와 장미 ' + b + '송이가 피었어요. 꽃은 모두 몇 송이인가요?', (a + b) + '송이', a + '+' + b, a + b); } }
    if (k === 1) { for (;;) { const a = R.int(41, 95), b = R.int(16, a - 10); if (a % 10 < b % 10) return num('빨대 ' + a + '개로 만들기를 하는 데 ' + b + '개를 썼어요. 남은 빨대는 몇 개인가요?', (a - b) + '개', a + '-' + b, a - b); } }
    const a = R.int(28, 45), b = R.int(9, a - 12), c = R.int(8, 19);
    return num('버스에 ' + a + '명이 타고 있었어요. 정류장에서 ' + b + '명이 내리고 ' + c + '명이 탔어요. 지금 버스에 탄 사람은 몇 명인가요?', (a - b + c) + '명', a + '-' + b + '+' + c, a - b + c);
  };
  W.e22_times = (R) => {
    const k = R.int(0, 2), a = R.int(3, 9), b = R.int(2, 9);
    if (k === 0) { const r = R.int(2, 5), c = R.int(3, 7); return num('점은 모두 몇 개인가요? 곱셈식으로 나타내 구하세요.', r + ' × ' + c + ' = ' + r * c, r + '*' + c, r * c, arraySvg(r, c), { dots: r * c }); }
    if (k === 1) { const f = R.pick([['세발자전거', '대', '바퀴', 3], ['문어', '마리', '다리', 8], ['자동차', '대', '바퀴', 4], ['강아지', '마리', '다리', 4]]); return num(f[0] + ' ' + b + f[1] + '의 ' + f[2] + '는 모두 몇 개인가요?', f[3] * b + '개', f[3] + '*' + b, f[3] * b); }
    return num('한 상자에 도넛이 ' + a + '개씩 들어 있어요. ' + b + '상자에 들어 있는 도넛은 모두 몇 개인가요?', a * b + '개', a + '*' + b, a * b);
  };
  const mcm = (cm) => { const m = Math.floor(cm / 100), c = cm % 100; return (m ? m + ' m' : '') + (m && c ? ' ' : '') + (c || !m ? c + ' cm' : ''); };
  W.e22_length = (R) => {
    for (;;) {
      const A = R.int(1, 3) * 100 + R.int(10, 90), B = R.int(0, 2) * 100 + R.int(10, 90);
      if (R.chance(0.5)) {
        const la = mcm(A), lb = mcm(B);
        return num('길이가 ' + la + '인 리본과 ' + lb + '인 리본을 겹치지 않게 이어 붙였어요. 이어 붙인 리본의 길이는 몇 m 몇 cm인가요?', mcm(A + B), A + '+' + B, A + B, tapeSvg([[A, la], [B, lb]], '? m ? cm'), { labels: [la, lb] });
      }
      if (A <= B + 20) continue;
      const la = mcm(A), lb = mcm(B);
      return num('길이가 ' + la + '인 끈에서 ' + lb + '를 잘라 썼어요. 남은 끈의 길이는 몇 m 몇 cm인가요?', mcm(A - B), A + '-' + B, A - B, tapeSvg([[B, '쓴 끈 ' + lb], [A - B, '?']], '처음 끈 ' + la), { labels: [la, lb] });
    }
  };
  W.e31_addsub = (R) => {
    const k = R.int(0, 2);
    if (k === 0) { const a = R.int(240, 680), b = R.int(150, 320); return num('도서관에 책이 ' + a + '권 있었는데 새 책 ' + b + '권이 들어왔어요. 책은 모두 몇 권인가요?', (a + b) + '권', a + '+' + b, a + b); }
    if (k === 1) { const a = R.int(500, 900), b = R.int(180, a - 120), n = R.pick(NAMES); return num(n + '의 줄넘기 목표는 ' + a + '번이에요. 지금까지 ' + b + '번 했다면 몇 번을 더 해야 하나요?', (a - b) + '번', a + '-' + b, a - b, tapeSvg([[b, '한 것 ' + b + '번'], [a - b, '?', 1]], '목표 ' + a + '번')); }
    const a = R.int(320, 560), b = R.int(120, 280), c = R.int(100, a + b - 50);
    return num('과일 가게에 사과가 ' + a + '개 있었어요. 오전에 ' + b + '개를 더 들여오고 오후에 ' + c + '개를 팔았어요. 남은 사과는 몇 개인가요?', (a + b - c) + '개', a + '+' + b + '-' + c, a + b - c);
  };
  W.e31_div = (R) => {
    const k = R.int(0, 2), b = R.int(2, 9), q = R.int(2, 9), a = b * q;
    if (k === 0) { const r = R.int(2, 5), c = R.int(2, 6); return num('점 ' + r * c + '개를 ' + r + '줄로 똑같이 놓았어요. 한 줄에 몇 개씩 놓았나요? 나눗셈식으로 나타내 구하세요.', (r * c) + ' ÷ ' + r + ' = ' + c, (r * c) + '/' + r, c, arraySvg(r, c), { dots: r * c, int: true }); }
    if (k === 1) return num('사탕 ' + a + '개를 친구 ' + b + '명에게 똑같이 나누어 주려고 해요. 한 명에게 몇 개씩 줄 수 있나요?', q + '개', a + '/' + b, q, '', { int: true });
    return num('쿠키 ' + a + '개를 한 봉지에 ' + b + '개씩 담으려고 해요. 봉지는 몇 개 필요한가요?', q + '개', a + '/' + b, q, '', { int: true });
  };
  W.e31_mul = (R) => {
    const k = R.int(0, 2), a = R.int(12, 48), b = R.int(3, 9);
    if (k === 0) return num('색종이가 한 묶음에 ' + a + '장씩 있어요. ' + b + '묶음에는 색종이가 모두 몇 장 있나요?', a * b + '장', a + '*' + b, a * b);
    if (k === 1) return num('하루에 수학 문제를 ' + a + '문제씩 풀어요. 일주일(7일) 동안 푸는 문제는 모두 몇 문제인가요?', a * 7 + '문제', a + '*7', a * 7);
    return num('한 줄에 의자가 ' + a + '개씩 ' + b + '줄 있어요. 의자는 모두 몇 개인가요?', a * b + '개', a + '*' + b, a * b, tapeSvg(Array.from({ length: b }, () => [1, String(a)]), '? 개', { label: a + '씩 ' + b + '묶음' }));
  };
  W.e32_mul = (R) => {
    const k = R.int(0, 2);
    if (k === 0) { const a = R.int(115, 480), b = R.int(3, 9); return num('공장에서 하루에 장난감을 ' + a + '개씩 만들어요. ' + b + '일 동안 만드는 장난감은 모두 몇 개인가요?', a * b + '개', a + '*' + b, a * b); }
    if (k === 1) { const a = R.int(18, 45), b = R.int(12, 35); return num('한 상자에 귤이 ' + a + '개씩 들어 있어요. ' + b + '상자에 들어 있는 귤은 모두 몇 개인가요?', a * b + '개', a + '*' + b, a * b); }
    const a = R.int(21, 39), b = R.int(12, 26), c = R.int(5, 40);
    return num('강당에 의자를 한 줄에 ' + a + '개씩 ' + b + '줄 놓았어요. 학생 ' + (a * b - c) + '명이 한 자리에 한 명씩 앉으면 빈 의자는 몇 개인가요?', c + '개', a + '*' + b + '-' + (a * b - c), c);
  };
  W.e32_div = (R) => {
    const k = R.int(0, 2), b = R.int(3, 9), q = R.int(6, 30), r = R.int(1, b - 1), a = b * q + r;
    if (k === 0) return num('구슬 ' + a + '개를 한 상자에 ' + b + '개씩 담으려고 해요. 구슬을 모두 담으려면 상자는 적어도 몇 개 필요한가요?', (q + 1) + '개', '(' + a + '-' + r + ')/' + b + '+1', q + 1);
    if (k === 1) return num('딸기 ' + a + '개를 ' + b + '명이 똑같이 나누어 먹고 남은 딸기는 접시에 두었어요. 접시에 남은 딸기는 몇 개인가요?', r + '개', a + '-' + b + '*' + q, r);
    const a2 = b * q; return num('길이가 ' + a2 + ' cm인 끈을 ' + b + ' cm씩 자르면 몇 도막이 되나요?', q + '도막', a2 + '/' + b, q, tapeSvg([[1, b + ' cm'], [1, b + ' cm'], [1, '…'], [1, b + ' cm']], a2 + ' cm'), { int: true });
  };
  W.e41_muldiv = (R) => {
    const k = R.int(0, 2);
    if (k === 0) { const a = R.int(28, 45), b = R.int(12, 25); return num('버스 한 대에 ' + a + '명씩 탈 수 있어요. 버스 ' + b + '대에는 모두 몇 명이 탈 수 있나요?', a * b + '명', a + '*' + b, a * b); }
    if (k === 1) { const b = R.int(12, 32), q = R.int(11, 30), a = b * q; return num(a + '쪽짜리 책을 하루에 ' + b + '쪽씩 읽으면 며칠 만에 다 읽을 수 있나요?', q + '일', a + '/' + b, q, '', { int: true }); }
    const p = R.int(12, 45) * 10, n = R.int(12, 30), m = R.pick([10000, 20000, 30000]);
    if (p * n >= m) return W.e41_muldiv(R);
    return num('한 개에 ' + p + '원인 지우개를 ' + n + '개 사고 ' + m + '원을 냈어요. 거스름돈은 얼마인가요?', (m - p * n) + '원', m + '-' + p + '*' + n, m - p * n);
  };
  W.e42_frac = (R) => {
    const k = R.int(0, 2), d = R.int(5, 12);
    if (k === 0) { const a = R.int(1, d - 2), b = R.int(1, d - a - 1); return Q('우유를 아침에 ' + fracH(a, d) + ' L, 저녁에 ' + fracH(b, d) + ' L 마셨어요. 하루 동안 마신 우유는 몇 L인가요?', rawMixed(a + b, d) + ' L', { t: 'num', expr: a + '/' + d + '+' + b + '/' + d, val: fascii(F(a + b, d)), unreduced: true }); }
    if (k === 1) { const w = R.int(2, 4), a = R.int(1, d - 1), b = R.int(1, d - 1); const N = w * d + a; return Q('밀가루가 ' + mixH(w, a, d) + ' kg 있었어요. 빵을 만드는 데 ' + fracH(b, d) + ' kg을 썼다면 남은 밀가루는 몇 kg인가요?', rawMixed(N - b, d) + ' kg', { t: 'num', expr: N + '/' + d + '-' + b + '/' + d, val: fascii(F(N - b, d)), unreduced: true }); }
    const a = R.int(2, d - 1); return Q('피자 한 판을 똑같이 ' + d + '조각으로 나누었어요. 그중 ' + a + '조각을 먹었다면 남은 피자는 전체의 몇 분의 몇인가요?', fracH(d - a, d), { t: 'num', expr: '1-' + a + '/' + d, val: fascii(F(d - a, d)), unreduced: true });
  };
  W.e42_dec = (R) => {
    const k = R.int(0, 2);
    if (k === 0) { const a = R.int(105, 260), b = R.int(15, 95); return num('물통에 물이 ' + dc(a, 2) + ' L 있었는데 ' + dc(b, 2) + ' L를 더 부었어요. 물통에 든 물은 몇 L인가요?', dc(a + b, 2) + ' L', dc(a, 2) + '+' + dc(b, 2), dc(a + b, 2)); }
    if (k === 1) { const a = R.int(1250, 1450), b = R.int(21, 79); return num('작년에 키가 ' + dc(a, 1) + ' cm였는데 1년 동안 ' + dc(b, 1) + ' cm 자랐어요. 지금 키는 몇 cm인가요?', dc(a + b, 1) + ' cm', dc(a, 1) + '+' + dc(b, 1), dc(a + b, 1)); }
    const a = R.int(300, 520), b = R.int(105, a - 60); return num('집에서 학교까지는 ' + dc(a, 2) + ' km, 집에서 도서관까지는 ' + dc(b, 2) + ' km예요. 학교는 도서관보다 몇 km 더 먼가요?', dc(a - b, 2) + ' km', dc(a, 2) + '-' + dc(b, 2), dc(a - b, 2));
  };
  W.e51_mixed = (R) => {
    const k = R.int(0, 2);
    if (k === 0) { const p = R.int(5, 9) * 100, n = R.int(2, 6), e = R.int(3, 8) * 100, m = R.pick([5000, 10000]); if (p * n + e >= m) return W.e51_mixed(R); return num('한 자루에 ' + p + '원인 연필 ' + n + '자루와 ' + e + '원인 지우개 1개를 사고 ' + m + '원을 냈어요. 거스름돈은 얼마인가요? 하나의 식으로 나타내 구하세요.', (m - p * n - e) + '원', m + '-(' + p + '*' + n + '+' + e + ')', m - p * n - e); }
    if (k === 1) { const b = R.int(3, 6), q = R.int(4, 9), c = R.int(2, 5); return num('사탕 ' + b * q + '개를 ' + b + '명에게 똑같이 나누어 주고, 한 명이 ' + c + '개씩 더 받았어요. 한 명이 받은 사탕은 모두 몇 개인가요?', (q + c) + '개', b * q + '/' + b + '+' + c, q + c); }
    const a = R.int(3, 6), s = R.int(2, 5), g = R.int(3, 7), t = a * g;
    return num('학생 ' + t + '명이 ' + a + '명씩 모둠을 만들고, 모둠마다 공을 ' + s + '개씩 나누어 주려고 해요. 공은 모두 몇 개 필요한가요? 하나의 식으로 나타내 구하세요.', g * s + '개', t + '/' + a + '*' + s, g * s);
  };
  W.e51_gcdlcm = (R) => {
    for (;;) {
      if (R.chance(0.5)) {
        const g = R.int(3, 12), x = R.int(2, 7), y = R.int(2, 7); if (x === y || gcd(x, y) !== 1) continue;
        const A = g * x, B = g * y, f = R.pick([['연필', '지우개'], ['사탕', '초콜릿'], ['공책', '색연필']]);
        return Q(f[0] + ' ' + A + '개와 ' + f[1] + ' ' + B + '개를 남김없이 될 수 있는 대로 많은 친구에게 똑같이 나누어 주려고 해요. 몇 명에게 나누어 줄 수 있나요?', g + '명', { t: 'gcd', nums: [A, B], val: g });
      }
      const A = R.int(4, 15), B = R.int(4, 20); if (A === B || A % B === 0 || B % A === 0) continue; const l = lcm(A, B); if (l > 120) continue;
      return Q('두 버스가 오전 9시에 함께 출발했어요. 한 버스는 ' + A + '분마다, 다른 버스는 ' + B + '분마다 출발해요. 두 버스가 처음으로 다시 함께 출발하는 것은 몇 분 뒤인가요?', l + '분 뒤', { t: 'lcm', nums: [A, B], val: l });
    }
  };
  W.e51_fracaddsub = (R) => {
    for (;;) {
      const a = properFrac(R, 2, 9), b = properFrac(R, 2, 9); if (a.d === b.d) continue;
      if (R.chance(0.5)) { const v = add(a, b); return Q('주스를 어제 ' + fH(a) + ' L, 오늘 ' + fH(b) + ' L 마셨어요. 이틀 동안 마신 주스는 몇 L인가요?', mixed(v) + ' L', { t: 'num', expr: fascii(a) + '+' + fascii(b), val: fascii(v) }); }
      const A = add(R.int(1, 3), a); const v = sub(A, b);
      return Q('리본이 ' + mixed(A) + ' m 있었어요. 선물을 포장하는 데 ' + fH(b) + ' m를 썼다면 남은 리본은 몇 m인가요?', mixed(v) + ' m', { t: 'num', expr: fascii(A) + '-' + fascii(b), val: fascii(v) });
    }
  };
  W.e51_area = (R, d) => {
    for (;;) {
      if (d === 3 && R.chance(0.4)) { const a = R.int(4, 15); return num('둘레가 ' + 4 * a + ' cm인 정사각형 모양 타일이 있어요. 이 타일의 넓이는 몇 cm²인가요?', a * a + ' cm²', '(' + 4 * a + '/4)*(' + 4 * a + '/4)', a * a); }
      if (d < 3 && R.chance(0.5)) { const w = R.int(6, 20), h = R.int(4, 15); if (w === h) continue; return num('가로가 ' + w + ' m, 세로가 ' + h + ' m인 직사각형 모양의 텃밭이 있어요. 텃밭의 넓이는 몇 m²인가요?', w * h + ' m²', w + '*' + h, w * h); }
      const Wd = R.int(8, 16), H = R.int(7, 14), w = R.int(3, Wd - 3), h = R.int(2, H - 3);
      const val = Wd * H - w * h;
      return num('ㄱ자 모양 도형의 넓이는 몇 cm²인가요? (모든 모서리는 직각이에요.)', val + ' cm²', Wd + '*' + H + '-' + w + '*' + h, val, lShapeSvg(Wd, H, w, h), { labels: [Wd + ' cm', H + ' cm', (Wd - w) + ' cm', (H - h) + ' cm'] });
    }
  };
  W.e52_fracmul = (R) => {
    const k = R.int(0, 2);
    if (k === 0) { const a = properFrac(R, 3, 9), n = R.int(2, 9), v = mul(a, n); return Q('한 시간에 ' + fH(a) + ' km씩 걸어요. 같은 빠르기로 ' + n + '시간 동안 걸으면 몇 km를 걷나요?', mixed(v) + ' km', { t: 'num', expr: fascii(a) + '*' + n, val: fascii(v) }); }
    if (k === 1) { const d = R.int(3, 8), n = d * R.int(4, 12), a = R.int(1, d - 1); return num('우리 반 학생 ' + n + '명 중 ' + fracH(a, d) + '이 안경을 써요. 안경을 쓴 학생은 몇 명인가요?', n / d * a + '명', n + '*' + a + '/' + d, n / d * a, '', { int: true }); }
    const a = properFrac(R, 2, 9), b = properFrac(R, 2, 9), v = mul(a, b); return Q('밭 전체의 ' + fH(a) + '에 채소를 심고, 채소를 심은 밭의 ' + fH(b) + '에 배추를 심었어요. 배추를 심은 밭은 밭 전체의 몇 분의 몇인가요?', fH(v), { t: 'num', expr: fascii(a) + '*' + fascii(b), val: fascii(v) });
  };
  W.e52_decmul = (R) => {
    const k = R.int(0, 1);
    if (k === 0) { const a = R.int(12, 48), b = R.int(15, 45); return num('1 m의 무게가 ' + dc(a, 1) + ' kg인 철근이 있어요. 이 철근 ' + dc(b, 1) + ' m의 무게는 몇 kg인가요?', dc(a * b, 2) + ' kg', dc(a, 1) + '*' + dc(b, 1), dc(a * b, 2)); }
    const a = R.int(105, 380), n = R.int(3, 9); return num('하루에 물을 ' + dc(a, 2) + ' L씩 마셔요. ' + n + '일 동안 마시는 물은 몇 L인가요?', dc(a * n, 2) + ' L', dc(a, 2) + '*' + n, dc(a * n, 2));
  };
  W.e61_fracdiv = (R) => {
    const k = R.int(0, 1), a = properFrac(R, 3, 9), n = R.int(2, 6), v = div(a, n);
    if (k === 0) return Q('주스 ' + fH(a) + ' L를 ' + n + '명이 똑같이 나누어 마시려고 해요. 한 명이 마시는 주스는 몇 L인가요?', fH(v) + ' L', { t: 'num', expr: fascii(a) + '/' + n, val: fascii(v) });
    const w = add(R.int(1, 4), a), v2 = div(w, n); return Q('넓이가 ' + mixed(w) + ' m²인 벽을 ' + n + '칸으로 똑같이 나누어 칠하려고 해요. 한 칸의 넓이는 몇 m²인가요?', mixed(v2) + ' m²', { t: 'num', expr: fascii(w) + '/' + n, val: fascii(v2) });
  };
  W.e61_decdiv = (R) => {
    const k = R.int(0, 1), n = R.int(3, 9), q = R.int(12, 95);
    if (k === 0) return num('길이가 ' + dc(n * q, 1) + ' m인 끈을 ' + n + '명이 똑같이 나누어 가지려고 해요. 한 명이 가지는 끈은 몇 m인가요?', dc(q, 1) + ' m', dc(n * q, 1) + '/' + n, dc(q, 1));
    return num('설탕 ' + dc(n * q, 2) + ' kg을 ' + n + '봉지에 똑같이 나누어 담았어요. 한 봉지에 담은 설탕은 몇 kg인가요?', dc(q, 2) + ' kg', dc(n * q, 2) + '/' + n, dc(q, 2));
  };
  W.e62_decdiv = (R) => {
    const k = R.int(0, 1);
    if (k === 0) { const b = R.int(2, 9), q = R.int(3, 15); return num('길이가 ' + dc(b * q, 1) + ' m인 리본을 ' + dc(b, 1) + ' m씩 자르면 몇 도막이 되나요?', q + '도막', dc(b * q, 1) + '/' + dc(b, 1), q, '', { int: true }); }
    const b = R.int(12, 45), q = R.int(2, 9); return num('휘발유 ' + dc(b, 1) + ' L로 ' + dc(b * q, 1) + ' km를 가는 자동차가 있어요. 이 자동차는 휘발유 1 L로 몇 km를 가나요?', q + ' km', dc(b * q, 1) + '/' + dc(b, 1), q, '', { int: true });
  };
  W.e62_fracdiv = (R) => {
    for (;;) {
      const a = properFrac(R, 2, 9), b = properFrac(R, 2, 9); const v = div(a, b); if (a.d === b.d && a.n === b.n) continue;
      if (R.chance(0.5)) return Q('물 ' + fH(a) + ' L를 한 컵에 ' + fH(b) + ' L씩 담으면 몇 컵이 되나요? (분수로 답해도 돼요.)', mixed(v) + '컵', { t: 'num', expr: fascii(a) + '/' + fascii(b), val: fascii(v) });
      return Q('넓이가 ' + fH(a) + ' m²인 직사각형 모양 꽃밭의 가로가 ' + fH(b) + ' m예요. 세로는 몇 m인가요?', mixed(v) + ' m', { t: 'num', expr: fascii(a) + '/' + fascii(b), val: fascii(v) });
    }
  };
  W.e62_proportion = (R) => {
    for (;;) {
      const p = R.int(1, 5), q = R.int(1, 5); if (p === q || gcd(p, q) !== 1) continue; const N = (p + q) * R.int(3, 12);
      const n = R.pick(NAMES);
      if (R.chance(0.5)) return num('구슬 ' + N + '개를 ' + n + '와 동생이 ' + p + ' : ' + q + '로 나누어 가지려고 해요. ' + n + '가 가지는 구슬은 몇 개인가요?', N * p / (p + q) + '개', N + '*' + p + '/(' + p + '+' + q + ')', N * p / (p + q), '', { int: true });
      const a = R.int(2, 6), b = R.int(3, 9), k2 = R.int(2, 6); return num('밀가루 ' + a + '컵에 설탕 ' + b + '숟가락을 섞어요. 같은 비율로 밀가루 ' + a * k2 + '컵에는 설탕을 몇 숟가락 섞어야 하나요?', b * k2 + '숟가락', b + '*' + a * k2 + '/' + a, b * k2, '', { int: true });
    }
  };

  // 정다각형 그림 (n 각형)
  function regPolySvg(n) {
    const cx = 70, cy = 66, r = 56, pts = [];
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + Math.PI / n * (n % 2 ? 0 : 1) + i * 2 * Math.PI / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return svg(140, 128, poly(pts, { cls: 'rpoly' }), '정' + n + '각형');
  }
  // 벽에 기댄 사다리: 바닥 거리 a, 높이 b, 사다리 길이 c (모르는 것은 '?')
  function ladderSvg(la, lb, lc) {
    let b = L(150, 8, 150, 120, { w: 3 }) + L(10, 120, 170, 120, { w: 3 }) + L(40, 120, 150, 24, { w: 4, stroke: '#8a5a00' });
    b += '<polyline points="140,120 140,110 150,110" fill="none" stroke="#222" stroke-width="1.2"/>';
    b += T(95, 133, la, { size: 12, fill: la.indexOf('?') >= 0 ? '#c0392b' : '#222' }) + T(156, 72, lb, { size: 12, anchor: 'start', fill: lb.indexOf('?') >= 0 ? '#c0392b' : '#222' }) + T(80, 62, lc, { size: 12, fill: lc.indexOf('?') >= 0 ? '#c0392b' : '#222' });
    return svg(200, 142, b, '벽에 기댄 사다리');
  }
  const TRI = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [12, 16, 20], [7, 24, 25]];

  /* ---------- 그림 단원의 문장제 (generators.js 의 그림 함수 H 를 받아 써요) ---------- */
  W.e12_clock = (R, d, H) => {
    const h = R.int(1, 12), m = d === 1 ? 0 : R.pick([0, 30]), n = R.pick(NAMES), what = R.pick(['아침에 일어난', '학교에 도착한', '점심을 먹기 시작한', '숙제를 시작한', '공원에 간']);
    return Q(n + '가 ' + what + ' 시각이에요. 몇 시' + (d === 1 ? '' : ' 또는 몇 시 30분') + '인가요?', h + '시' + (m ? ' ' + m + '분' : ''), { t: 'clock', h, m }, H.clockSvg(h, m, false));
  };
  W.e22_time = (R, d, H) => {
    const h = R.int(1, 10), m = R.int(0, 11) * 5, k = R.pick([15, 20, 25, 30, 35, 40, 45, 50]), tot = h * 60 + m + k;
    const h2 = Math.floor(tot / 60) % 12 || 12, m2 = tot % 60, n = R.pick(NAMES), what = R.pick(['책 읽기', '피아노 연습', '그림 그리기', '줄넘기']);
    return Q(n + '는 시계가 나타내는 시각에 ' + what + '를 시작해서 ' + k + '분 동안 했어요. ' + what + '를 마친 시각은 몇 시 몇 분인가요?', h2 + '시' + (m2 ? ' ' + m2 + '분' : ''), { t: 'later', h, m, k, h2, m2, clock: [h, m] }, H.clockSvg(h, m, true));
  };
  W.e31_time = (R) => {
    for (;;) {
      const h = R.int(1, 8), m = R.int(5, 55), dh = R.int(1, 3), dm = R.int(10, 55), tot = (h + dh) * 60 + m + dm; if (tot >= 12 * 60) continue;
      const k = R.int(0, 1);
      if (k === 0) return num('기차가 오후 ' + h + '시 ' + m + '분에 출발해서 ' + dh + '시간 ' + dm + '분 뒤에 도착했어요. 도착한 시각은 오후 몇 시 몇 분인가요?', '오후 ' + Math.floor(tot / 60) + '시' + (tot % 60 ? ' ' + tot % 60 + '분' : ''), (h * 60 + m) + '+' + (dh * 60 + dm), tot);
      const s1 = h * 60 + m, s2 = s1 + dh * 60 + dm;
      return num('영화가 오후 ' + h + '시 ' + m + '분에 시작해서 오후 ' + Math.floor(s2 / 60) + '시 ' + (s2 % 60) + '분에 끝났어요. 영화를 본 시간은 몇 분인가요?', (s2 - s1) + '분 (' + dh + '시간 ' + dm + '분)', s2 + '-' + s1, s2 - s1);
    }
  };
  W.e32_circle = (R) => {
    const k = R.int(0, 2), r = R.int(3, 15);
    if (k === 0) return num('지름이 ' + 2 * r + ' cm인 접시가 있어요. 이 접시의 반지름은 몇 cm인가요?', r + ' cm', 2 * r + '/2', r, '', { int: true });
    if (k === 1) { const n = R.int(3, 6); return num('반지름이 ' + r + ' cm인 동전 ' + n + '개를 한 줄로 맞닿게 놓았어요. 줄의 길이는 몇 cm인가요?', 2 * r * n + ' cm', r + '*2*' + n, 2 * r * n); }
    return num('반지름이 ' + r + ' cm인 원이 꼭 맞게 들어가는 정사각형이 있어요. 정사각형의 한 변은 몇 cm인가요?', 2 * r + ' cm', r + '*2', 2 * r);
  };
  W.e32_frac = (R) => {
    const d = R.int(2, 8), a = R.int(1, d - 1), N = d * R.int(2, 8), f = R.pick([['색종이', '장'], ['사탕', '개'], ['구슬', '개'], ['카드', '장']]);
    return num(f[0] + ' ' + N + f[1] + '의 ' + fracH(a, d) + '은 몇 ' + f[1] + '인가요?', N / d * a + f[1], N + '/' + d + '*' + a, N / d * a, '', { int: true, unreduced: true });
  };
  W.e41_angle = (R) => {
    const k = R.int(0, 2);
    if (k === 0) { const m = R.int(1, 11) * 5; return num('시계의 긴바늘이 ' + m + '분 동안 돌았어요. 긴바늘이 돈 각도는 몇 도인가요?', m * 6 + '°', m + '*6', m * 6); }
    if (k === 1) { const n = R.pick([3, 4, 5, 6, 8, 9, 10, 12]); return num('둥근 피자를 가운데에서 똑같이 ' + n + '조각으로 잘랐어요. 한 조각의 가운데 각은 몇 도인가요?', 360 / n + '°', '360/' + n, 360 / n, '', { int: true }); }
    const a = R.int(35, 85), b = R.int(30, 140 - a); return num('삼각형의 두 각이 ' + a + '°와 ' + b + '°예요. 나머지 한 각은 몇 도인가요?', (180 - a - b) + '°', '180-' + a + '-' + b, 180 - a - b);
  };
  W.e51_reduce = (R) => {
    for (;;) {
      const a = properFrac(R, 3, 12), b = properFrac(R, 3, 12); if (a.d === b.d || a.n * b.d === b.n * a.d) continue;
      const n1 = R.pick(NAMES), n2 = R.pick(NAMES.filter((x) => x !== n1)), big = a.n * b.d > b.n * a.d;
      return Q(n1 + '는 우유를 ' + fH(a) + ' L, ' + n2 + '는 ' + fH(b) + ' L 마셨어요. 누가 더 많이 마셨나요? 통분하여 비교하세요.', (big ? n1 : n2) + ' (' + fH(a) + (big ? ' &gt; ' : ' &lt; ') + fH(b) + ')', { t: 'cmp', a: fascii(a), b: fascii(b), op: big ? '>' : '<' });
    }
  };
  W.e61_ratio = (R) => {
    const k = R.int(0, 1);
    if (k === 0) { const N = R.pick([20, 25, 40, 50]), c = R.int(1, N - 1), p = c * 100 / N; return num('우리 반 학생 ' + N + '명 중 ' + c + '명이 강아지를 키워요. 강아지를 키우는 학생은 반 전체의 몇 %인가요?', p + '%', c + '/' + N + '*100', p); }
    const t = R.int(2, 9) * 100, c = R.pick([10, 20, 25, 30, 40, 50]); return num(t + '원짜리 공책을 ' + c + '% 할인해서 팔아요. 할인한 가격은 얼마인가요?', (t - t * c / 100) + '원', t + '-' + t + '*' + c + '/100', t - t * c / 100);
  };
  W.m11_intaddsub = (R) => {
    const a = R.int(2, 12), b = R.int(3, 18), c = R.int(1, 9);
    if (R.chance(0.5)) { const v = -a + b; return num('새벽 기온이 영하 ' + a + '°C였는데 낮에 ' + b + '°C 올랐어요. 낮 기온은 몇 °C인가요? (영하는 음수로 나타내요.)', (v < 0 ? '−' + (-v) : v) + '°C', '-' + a + '+' + b, v); }
    const v = a - b - c; return num('기온이 ' + a + '°C였는데 저녁까지 ' + b + '°C, 밤까지 ' + c + '°C 더 내려갔어요. 밤 기온은 몇 °C인가요?', (v < 0 ? '−' + (-v) : v) + '°C', a + '-' + b + '-' + c, v);
  };
  W.m11_lineq = (R) => {
    const k = R.int(0, 2), x = R.int(2, 15);
    if (k === 0) { const a = R.int(2, 7), b = R.int(1, 20); return Q('어떤 수의 ' + a + '배에 ' + b + '를 더하면 ' + (a * x + b) + '예요. 어떤 수를 <i>x</i>라 하고 방정식을 세워 구하세요.', a + '<i>x</i> + ' + b + ' = ' + (a * x + b) + ', <i>x</i> = ' + x, { t: 'eq', lhs: a + '*x+' + b, rhs: String(a * x + b), x: String(x) }); }
    if (k === 1) { const p = R.int(3, 9) * 100, q = R.int(5, 15) * 100, n = R.int(3, 12); return Q('한 자루에 ' + p + '원인 연필 몇 자루와 ' + q + '원인 공책 1권을 사고 ' + (p * n + q) + '원을 냈어요. 연필은 몇 자루 샀나요?', n + '자루', { t: 'eq', lhs: p + '*x+' + q, rhs: String(p * n + q), x: String(n) }); }
    const y = x + R.int(2, 8), s = x + y; return Q('두 수의 합은 ' + s + '이고, 큰 수는 작은 수보다 ' + (y - x) + '만큼 커요. 작은 수를 구하세요.', String(x), { t: 'eq', lhs: 'x+x+' + (y - x), rhs: String(s), x: String(x) });
  };
  W.m12_polygon = (R) => {
    const n = R.pick([5, 6, 8, 9, 10, 12]), k = R.int(0, 2);
    if (k === 0) return num('그림과 같은 정' + n + '각형의 한 내각의 크기는 몇 도인가요?', 180 * (n - 2) / n + '°', '180*(' + n + '-2)/' + n, 180 * (n - 2) / n, regPolySvg(n), { int: true });
    if (k === 1) return num('그림과 같은 정' + n + '각형의 대각선은 모두 몇 개인가요?', n * (n - 3) / 2 + '개', n + '*(' + n + '-3)/2', n * (n - 3) / 2, regPolySvg(n), { int: true });
    return num('한 외각의 크기가 ' + 360 / n + '°인 정다각형은 정몇각형인가요?', '정' + n + '각형', '360/' + (360 / n), n, '', { int: true });
  };
  W.m22_pyth = (R) => {
    const [a, b, c] = R.pick(TRI), ask = R.pick(['b', 'c']);
    if (ask === 'b') return Q('길이가 ' + c + ' m인 사다리를 벽에 기대어 세웠어요. 사다리 아래 끝이 벽에서 ' + a + ' m 떨어져 있을 때, 사다리 위 끝의 높이는 몇 m인가요?', b + ' m', { t: 'pyth', a, b, c, ask: 'b', val: b, labels: [a + ' m', c + ' m'] }, ladderSvg(a + ' m', '? m', c + ' m'));
    return Q('사다리 아래 끝이 벽에서 ' + a + ' m 떨어져 있고 위 끝이 바닥에서 ' + b + ' m 높이의 벽에 닿아 있어요. 사다리의 길이는 몇 m인가요?', c + ' m', { t: 'pyth', a, b, c, ask: 'c', val: c, labels: [a + ' m', b + ' m'] }, ladderSvg(a + ' m', b + ' m', '? m'));
  };

  const API = { W, arraySvg, tapeSvg, lShapeSvg, regPolySvg, ladderSvg };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.MD_WORDS = API;
})(typeof window !== 'undefined' ? window : this);
