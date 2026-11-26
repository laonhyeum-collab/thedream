/* 연산 문제은행 — 화면으로 풀기: 정답 글자로 바꾸기 · 입력한 답 채점
 * 브라우저에서는 window.MD_CHECK 로, node 에서는 require() 로 써요. 아무것도 저장하지 않아요. */
(function (root) {
  'use strict';

  // 정답 HTML → 키보드로 칠 수 있는 글자 (예: 1 4/10, x^2 − 4, 0.3(7), 2√6)
  function ansText(html) {
    let s = String(html);
    // 순환소수 점: 점 찍은 첫 숫자~끝 숫자를 괄호로 묶어요 (0.3̇7̇ → 0.3(7))
    s = s.replace(/<span class="dot">(\d)<\/span>(?:(\d*)<span class="dot">(\d)<\/span>)?/,
      (m, a, b, c) => '(' + a + (c !== undefined ? b + c : '') + ')');
    s = s.replace(/<sup>(.*?)<\/sup>/g, '^$1');
    s = s.replace(/<\/?i>/g, '');
    s = s.replace(/<span class="rad">([^<]*)<\/span>/g, '$1');
    s = s.replace(/<span class="fr"><span class="nu">([^<]*)<\/span><span class="de">([^<]*)<\/span><\/span>/g, ' $1/$2');
    s = s.replace(/<[^>]+>/g, '');
    s = s.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
    return s.replace(/\s+/g, ' ').replace(/\( /g, '(').trim();
  }

  // 양쪽(정답·입력)을 같은 모양으로
  function norm(s) {
    return String(s).toLowerCase()
      .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      .replace(/[−–—﹣－]/g, '-').replace(/×/g, '*').replace(/÷/g, '/')
      .replace(/²/g, '^2').replace(/³/g, '^3')
      .replace(/<=|=</g, '≤').replace(/>=|=>/g, '≥')
      .replace(/루트|sqrt/g, '√').replace(/파이|pi/g, 'π')
      .replace(/\+-|\+\/-|플러스마이너스/g, '±')
      .replace(/또는|or/g, ',')
      .replace(/(\d)\s*π\s*\/\s*(\d+)/g, '$1/$2π')
      .replace(/\s*\/\s*/g, '/')
      .trim();
  }
  // 수 덩어리: 3, -4, 0.25, 4/10, 2√6, √3/2, 9/4π, 0.3(7)
  function tokens(s) {
    s = norm(s).replace(/±\s*([0-9√π][0-9.√π/]*)/g, '$1, -$1');
    const out = []; const re = /(^|[^0-9a-z])(-?)([0-9√π][0-9.√π/]*(?:\(\d+\))?)/g; let m;
    while ((m = re.exec(s))) out.push(m[2] + m[3].replace(/\/$/, ''));
    return out;
  }
  const plain = (t) => /^-?\d+(\.\d+)?$/.test(t);
  const tokEq = (a, b) => (plain(a) && plain(b) ? Number(a) === Number(b) : a === b);
  const seqEq = (a, b) => a.length === b.length && a.every((t, i) => tokEq(t, b[i]));
  function setEq(a, b) {
    if (a.length !== b.length) return false;
    const rest = b.slice();
    return a.every((t) => { const i = rest.findIndex((u) => tokEq(t, u)); if (i < 0) return false; rest.splice(i, 1); return true; });
  }
  // 글자 그대로 비교용 (빈칸 없애기)
  function key(s, keepTimes) {
    let k = norm(s).replace(/\s+/g, '');
    if (keepTimes) k = k.replace(/(\d|\))x(?=\d)/g, '$1*'); else k = k.replace(/\*/g, '');
    return k;
  }
  // (x-5)(x+8) 와 (x+8)(x-5) 를 같게
  function factorsSorted(k) {
    const m = /^(-?\d*x?)((?:\([^()]+\))+)$/.exec(k);
    if (!m) return k;
    return m[1] + '|' + m[2].match(/\([^()]+\)/g).sort().join('');
  }

  function mode(p) {
    const t = p.chk && p.chk.t;
    if (t === 'poly' || t === 'ineq') return 'str';
    if (t === 'pfac') return 'pfac';
    if (t === 'cmp') return 'name';
    if (t === 'quad') return 'set';
    return 'seq';
  }

  // 입력한 답이 맞는지: true / false
  function grade(input, p) {
    const raw = String(input || '').trim();
    if (!raw) return false;
    const ans = ansText(p.ans);
    const md = mode(p);
    if (md === 'str') {
      const a = key(ans), u = key(raw);
      return a === u || factorsSorted(a) === factorsSorted(u);
    }
    if (md === 'pfac') return key(ans, true) === key(raw, true);
    if (md === 'name') { const name = ans.split(' ')[0]; return key(raw).indexOf(key(name)) === 0; }
    const ta = tokens(ans), tu = tokens(raw);
    if (!tu.length) return false;
    if (md === 'set') return setEq(ta, tu);
    if (seqEq(ta, tu)) return true;
    // 나머지가 0인 나눗셈: "18 0" 도 맞게
    if (p.chk && p.chk.t === 'divmod' && ta.length === 1 && tu.length === 2 && tokEq(ta[0], tu[0]) && tu[1] === '0') return true;
    return !ta.length && key(ans) === key(raw);
  }

  // 입력 칸 아래 안내 (답 모양을 알려 줘요, 정답은 알려 주지 않아요)
  function inputHint(p) {
    const a = ansText(p.ans), t = p.chk && p.chk.t, tips = [];
    if (t === 'divmod') tips.push('몫과 나머지를 순서대로 써요 (예: 7 24)');
    if (t === 'quad') tips.push('답이 두 개면 쉼표로 (예: -3, 5)');
    if (t === 'sys') tips.push('x, y를 순서대로 (예: 2, -1)');
    if (t === 'cmp') tips.push('더 많은 사람 이름을 써요');
    if (t === 'pfac') tips.push('곱하기는 *, 거듭제곱은 ^ (예: 2^2*3)');
    if (/\(\d+\)/.test(a) && t === 'rep') tips.push('순환마디는 괄호로 (예: 0.3(7))');
    if (/\//.test(a) && t !== 'rep') tips.push('분수는 3/4, 대분수는 1 2/5처럼 써요');
    if (/√/.test(a)) tips.push('√는 "루트"로 써도 돼요 (예: 2루트6)');
    if (/\^/.test(a) && t !== 'pfac') tips.push('거듭제곱은 ^ (예: x^2)');
    if (/π/.test(a)) tips.push('π는 "pi"로 써도 돼요');
    if (/[≤≥<>]/.test(a)) tips.push('≤는 <=, ≥는 >= 로 써도 돼요');
    if (!tips.length) tips.push('단위는 써도 되고 안 써도 돼요');
    return tips.join(' · ');
  }

  const API = { ansText, norm, tokens, grade, inputHint, mode };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.MD_CHECK = API;
})(typeof window !== 'undefined' ? window : this);
