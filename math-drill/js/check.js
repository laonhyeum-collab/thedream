/* 연산 문제은행 — 화면으로 풀기: 학생이 쓴 답이 맞는지 확인해요
 * 브라우저에서는 window.MD_CHECK 로, node 에서는 require() 로 써요. */
(function (root) {
  'use strict';

  // 문제의 답(HTML)을 글자로: 분수 → n/d, 대분수 → w_n/d, 위첨자 → ^n
  function ansText(html) {
    return String(html)
      .replace(/<span class="mx">(\d*)<span class="fr"><span class="nu">(\d+)<\/span><span class="de">(\d+)<\/span><\/span><\/span>/g, (m, w, n, d) => (w ? w + '_' : '') + n + '/' + d)
      .replace(/<span class="fr"><span class="nu">([^<]+)<\/span><span class="de">([^<]+)<\/span><\/span>/g, '($1/$2)')
      .replace(/<sup>([^<]+)<\/sup>/g, '^$1')
      .replace(/<span class="rad">([^<]+)<\/span>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
  }

  // 같은 모양으로 맞추기 (빈칸·기호·괄호 분수)
  function canon(s, typed) {
    let t = String(s).trim().toLowerCase();
    if (typed) t = t.replace(/(\d+)\s+(\d+)\s*\/\s*(\d+)/g, '$1_$2/$3'); // 2 1/3 → 대분수
    t = t.replace(/[−–—]/g, '-').replace(/[×✕]/g, '*').replace(/÷/g, '/')
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/>=|=>/g, '≥').replace(/<=|=</g, '≤')
      .replace(/루트/g, '√').replace(/파이/g, 'π')
      .replace(/\s+/g, '');
    t = t.replace(/\((-?\d+\/\d+)\)/g, '$1'); // (3/4) → 3/4 (분수를 감싼 괄호만)
    t = t.replace(/(^|[^0-9a-z)])1(?=[xy])/g, '$1'); // 1x → x
    return t;
  }

  const UNIT_RE = /(cm\^2|cm\^3|m\^2|m\^3|mm|cm|km|kg|ml|m|l|g|°c|°|%|[가-힣]+)/g;
  const stripUnits = (t) => t.replace(/^∠?x=/, '').replace(/,?또는/g, ',').replace(/(^|,)[xy]=/g, '$1').replace(UNIT_RE, ',').replace(/:/g, ',').replace(/,+/g, ',').replace(/^,|,$/g, '');
  const NUM_RE = /-?\d+_\d+\/\d+|-?\d+\/\d+|-?\d+(?:\.\d+)?/g;
  const nums = (t) => (t.match(NUM_RE) || []).map((x) => x.replace(/^(-?)0+(?=\d)/, '$1').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, ''));
  const hasAlgebra = (t) => /[xyπ√]|sin|cos|tan/.test(t);

  // 답이 맞으면 true
  function isCorrect(p, typed) {
    const S = canon(typed, true);
    if (!S) return false;
    const A = canon(ansText(p.ans), false);
    if (S === A) return true;
    const t = p.chk && p.chk.t;
    // 식(x, y, √, π)이 들어간 답: 단위만 빼고 글자 그대로 비교
    if (hasAlgebra(stripUnits(A)) || t === 'poly' || t === 'ineq') {
      return A.replace(UNIT_RE, '') === S.replace(UNIT_RE, '') || A.replace(/^∠?x=/, '') === S.replace(/^∠?x=/, '');
    }
    if (stripUnits(A) === stripUnits(S)) return true;
    // 숫자만 차례대로 비교 (몫·나머지, 시·분, 최대공약수·최소공배수, 비 등)
    const na = nums(stripUnits(A)), ns = nums(stripUnits(S));
    if (!na.length || na.length !== ns.length) {
      // 0.15, 15% 처럼 같은 값을 두 가지로 쓴 답은 하나만 써도 맞아요
      if (t === 'num' && p.chk.pct && ns.length === 1) return ns[0] === nums(p.chk.val)[0] || (/%/.test(S) && ns[0] === p.chk.pct);
      return false;
    }
    if (t === 'quad') return na.slice().sort().join(',') === ns.slice().sort().join(',');
    return na.join(',') === ns.join(',');
  }

  // 답 쓰는 방법 안내 (문제 모양에 따라)
  function hint(p) {
    const A = ansText(p.ans), t = p.chk && p.chk.t;
    if (t === 'divmod') return '몫과 나머지를 차례로 써요. 예: 5, 2';
    if (t === 'gcdlcm') return '최대공약수, 최소공배수 차례로 써요. 예: 6, 36';
    if (t === 'common') return '통분한 두 분수를 차례로 써요. 예: 4/6, 3/6';
    if (t === 'sys') return 'x, y 차례로 써요. 예: 2, -1';
    if (t === 'quad') return '두 근을 쉼표로 써요. 예: 3, -1/2';
    if (t === 'ratio') return '가장 간단한 자연수의 비로 써요. 예: 3:2';
    if (t === 'clock' || t === 'later') return '시와 분을 써요. 예: 3시 25분';
    if (t === 'ineq') return '예: x>=-3 (≥는 >=, ≤는 <=)';
    if (t === 'poly' || /[xy]/.test(A)) return '예: 3x^2-2x+1, (x+2)(x-3) — 제곱은 ^2';
    if (/√|π/.test(A)) return '예: 2√3, 4/3π — 아래 기호 단추를 써요';
    if (/_\d+\//.test(A)) return '대분수는 띄어 써요. 예: 2 3/4';
    if (/\//.test(A)) return '분수는 / 로 써요. 예: 3/4 (기약분수로)';
    if (/\d시간|\d분|\d초/.test(A)) return '예: 2시간 15분';
    if (/ m \d+ cm/.test(A)) return '예: 3 m 25 cm';
    return '숫자로 써요. 단위는 써도 되고 안 써도 돼요.';
  }

  const API = { ansText, canon, isCorrect, hint };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.MD_CHECK = API;
})(typeof window !== 'undefined' ? window : this);
