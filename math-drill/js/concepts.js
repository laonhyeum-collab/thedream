/* 수학 개념 설명 — 단원별 개념(문제은행 units.js 와 같은 단원 id)
 * lines: 핵심 개념 3~5줄 · figs: 그림 1~2개(SVG) · ex: 예제 1개 풀이 · video: 우리 개념 영상 주소(없으면 '영상 준비 중')
 * 1차: 초1 연산 단원부터. 다른 단원은 차례로 더해요. 응용문제는 나중에 넣어요. */
(function (root) {
  'use strict';
  const GEN = (typeof module !== 'undefined' && module.exports) ? require('./generators.js') : root.MD_GEN;
  const clockSvg = GEN.HELP.clockSvg;
  const svg = (w, h, body, label) => '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + label + '" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">' + body + '</svg>';
  const T = (x, y, s, size, fill) => '<text x="' + x + '" y="' + y + '" font-size="' + (size || 18) + '" text-anchor="middle" dominant-baseline="middle" fill="' + (fill || '#24345c') + '" font-weight="700">' + s + '</text>';
  const dot = (x, y, fill) => '<circle cx="' + x + '" cy="' + y + '" r="11" fill="' + fill + '" stroke="#24345c" stroke-width="1.5"/>';
  const BLUE = '#3a7bd5', YEL = '#ffb627', GRAY = '#e9edf5';

  // ● ● ● + ● ● = ● ● ● ● ●
  function dotsAdd(a, b) {
    let x = 20, body = '';
    for (let i = 0; i < a; i++) { body += dot(x, 30, BLUE); x += 28; }
    body += T(x + 2, 31, '+', 24); x += 30;
    for (let i = 0; i < b; i++) { body += dot(x, 30, YEL); x += 28; }
    body += T(x + 2, 31, '=', 24); x += 30;
    for (let i = 0; i < a + b; i++) { body += dot(x, 30, i < a ? BLUE : YEL); x += 28; }
    return svg(x, 60, body, a + ' 더하기 ' + b + '는 ' + (a + b));
  }
  // 가르기 나무: n → a, b
  function splitTree(n, a, b) {
    const body = '<rect x="70" y="6" width="56" height="44" rx="10" fill="' + GRAY + '" stroke="#24345c" stroke-width="2"/>' + T(98, 29, n, 24) +
      '<line x1="88" y1="50" x2="52" y2="88" stroke="#24345c" stroke-width="2.5"/><line x1="108" y1="50" x2="144" y2="88" stroke="#24345c" stroke-width="2.5"/>' +
      '<rect x="18" y="88" width="56" height="44" rx="10" fill="#e4efff" stroke="' + BLUE + '" stroke-width="2"/>' + T(46, 111, a, 24) +
      '<rect x="122" y="88" width="56" height="44" rx="10" fill="#fff3d4" stroke="' + YEL + '" stroke-width="2"/>' + T(150, 111, b, 24);
    return svg(196, 140, body, n + '은 ' + a + '와 ' + b + '로 가를 수 있어요');
  }
  // 10개씩 묶음(막대)과 낱개(점)
  function baseTen(n, x0, color) {
    const t = Math.floor(n / 10), o = n % 10;
    let body = '', x = x0;
    for (let i = 0; i < t; i++) { for (let k = 0; k < 10; k++) body += '<rect x="' + x + '" y="' + (10 + k * 11) + '" width="16" height="10" fill="' + color + '" stroke="#24345c" stroke-width="1"/>'; x += 22; }
    for (let i = 0; i < o; i++) body += '<rect x="' + (x + (i % 3) * 14) + '" y="' + (76 + Math.floor(i / 3) * 14) + '" width="10" height="10" fill="' + color + '" stroke="#24345c" stroke-width="1"/>';
    return { body, w: x + 46 - x0 };
  }
  function tensAdd(a, b) {
    const A = baseTen(a, 10, BLUE), B = baseTen(b, A.w + 50, YEL);
    const body = A.body + T(A.w + 30, 70, '+', 26) + B.body + T(10 + A.w / 2, 140, a + ' (10개씩 ' + Math.floor(a / 10) + '묶음, 낱개 ' + a % 10 + ')', 13) + T(A.w + 50 + B.w / 2, 140, b + ' (10개씩 ' + Math.floor(b / 10) + '묶음, 낱개 ' + b % 10 + ')', 13);
    return svg(A.w + B.w + 70, 152, body, a + ' 더하기 ' + b + '를 10개씩 묶음과 낱개로 나타낸 그림');
  }
  // 세로셈
  function vertical(a, b, op, ans) {
    const cols = [60, 90];
    const digit = (n, y, col) => String(n).padStart(2, ' ').split('').map((d, i) => d === ' ' ? '' : T(cols[i], y, d, 26, col)).join('');
    const body = T(cols[0], 22, '십', 13, '#3e4a66') + T(cols[1], 22, '일', 13, '#3e4a66') +
      digit(a, 52, '#24345c') + T(24, 86, op, 26) + digit(b, 86, '#24345c') +
      '<line x1="14" y1="106" x2="112" y2="106" stroke="#24345c" stroke-width="2.5"/>' + digit(ans, 130, '#c0392b');
    return svg(126, 150, body, a + ' ' + op + ' ' + b + ' 세로셈');
  }
  // 10칸 상자(10 만들기): a 에 b 를 더할 때 10 을 채우고 남은 것
  function tenFrame(a, b) {
    let body = '';
    const fill = (i) => (i < a ? BLUE : i < 10 && i < a + b ? YEL : '#fff');
    for (let i = 0; i < 10; i++) { const x = 14 + (i % 5) * 34, y = 14 + Math.floor(i / 5) * 34; body += '<rect x="' + x + '" y="' + y + '" width="34" height="34" fill="#fff" stroke="#24345c" stroke-width="2"/>' + (fill(i) !== '#fff' ? dot(x + 17, y + 17, fill(i)) : ''); }
    const rest = a + b - 10;
    for (let i = 0; i < rest; i++) body += dot(214 + (i % 3) * 28, 31 + Math.floor(i / 3) * 34, YEL);
    body += T(100, 100, '10', 20) + T(240, 100, String(rest), 20);
    return svg(310, 116, body, a + ' 더하기 ' + b + '는 10과 ' + rest);
  }

  const C = {
    e11_addsub: {
      lines: [
        '두 수를 합쳐 하나로 만드는 것을 「모으기」, 하나를 두 수로 나누는 것을 「가르기」라고 해요.',
        '덧셈은 모으기예요. 3과 2를 모으면 5 → 3 + 2 = 5',
        '뺄셈은 덜어 내기예요. 5에서 2를 덜어 내면 3 → 5 − 2 = 3',
        '덧셈과 뺄셈은 서로 거꾸로예요. 3 + 2 = 5 이면 5 − 2 = 3, 5 − 3 = 2',
        '0을 더하거나 빼도 수는 그대로예요. 4 + 0 = 4, 4 − 0 = 4',
      ],
      figs: [dotsAdd(3, 2), splitTree(7, 4, 3)],
      ex: { q: '6은 2와 □로 가를 수 있어요. □ 안에 알맞은 수는?', steps: ['6개 중에서 2개를 떼어 내요.', '남은 것을 세면 3, 4 … 4개예요. (6 − 2 = 4)', '거꾸로 확인: 2 + 4 = 6 ✔'], ans: '4' },
    },
    e12_addsub1: {
      lines: [
        '두 자리 수는 「10개씩 묶음」(십의 자리)과 「낱개」(일의 자리)로 되어 있어요. 23 = 10개씩 2묶음 + 낱개 3',
        '덧셈은 낱개는 낱개끼리, 10개씩 묶음은 묶음끼리 더해요.',
        '뺄셈도 같은 자리끼리 빼요. 낱개끼리, 묶음끼리!',
        '세로셈으로 쓸 때는 십의 자리와 일의 자리를 줄 맞춰 써요.',
      ],
      figs: [tensAdd(23, 14), vertical(23, 14, '+', 37)],
      ex: { q: '45 − 21 을 계산하세요.', steps: ['낱개끼리: 5 − 1 = 4', '10개씩 묶음끼리: 4 − 2 = 2 (20)', '묶음 2개와 낱개 4개 → 24'], ans: '24' },
    },
    e12_addsub2: {
      lines: [
        '더해서 10이 되는 두 수: 1과 9, 2와 8, 3과 7, 4와 6, 5와 5',
        '세 수의 계산은 앞에서부터 차례로 해요. 10이 되는 두 수가 있으면 먼저 더하면 쉬워요. 4 + 6 + 3 = 10 + 3 = 13',
        '받아올림 덧셈은 10을 먼저 만들어요. 8 + 5 → 5를 2와 3으로 가르기 → 8 + 2 = 10, 10 + 3 = 13',
        '받아내림 뺄셈은 10에서 빼요. 13 − 5 → 13을 10과 3으로 가르기 → 10 − 5 = 5, 5 + 3 = 8',
      ],
      figs: [tenFrame(8, 5), splitTree(5, 2, 3)],
      ex: { q: '9 + 4 를 10을 만들어 계산하세요.', steps: ['9는 1이 더 있으면 10이 돼요.', '4를 1과 3으로 갈라요.', '9 + 1 = 10, 10 + 3 = 13'], ans: '13' },
    },
    e12_clock: {
      lines: [
        '시계의 짧은바늘은 「시」, 긴바늘은 「분」을 알려 줘요.',
        '긴바늘이 12를 가리키면 「몇 시」예요. 짧은바늘이 가리키는 숫자를 읽어요. (3시)',
        '긴바늘이 6을 가리키면 「몇 시 30분」이에요.',
        '30분일 때 짧은바늘은 두 숫자 사이에 있어요. 지나온 앞 숫자를 읽어요. (7과 8 사이 → 7시 30분)',
      ],
      figs: [clockSvg(3, 0, false), clockSvg(7, 30, false)],
      ex: { q: '긴바늘이 6, 짧은바늘이 4와 5 사이를 가리켜요. 몇 시 몇 분인가요?', steps: ['긴바늘이 6 → 30분', '짧은바늘이 4와 5 사이 → 지나온 앞 숫자 4 → 4시', '합치면 4시 30분'], ans: '4시 30분', fig: clockSvg(4, 30, false) },
    },
  };

  const API = { CONCEPTS: C };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.MD_CONCEPTS = C;
})(typeof window !== 'undefined' ? window : this);
