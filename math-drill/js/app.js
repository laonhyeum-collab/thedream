/* 연산 문제은행 — 화면 (설정 → 문제지 · 정답지 만들기 → 인쇄/PDF, 또는 화면에서 10문제 바로 풀기) */
(function () {
  'use strict';
  const UNITS = window.MD_UNITS, LEVELS = window.MD_LEVELS, GEN = window.MD_GEN, CHK = window.MD_CHECK;
  const $ = (id) => document.getElementById(id);
  const radio = (name) => document.querySelector('input[name="' + name + '"]:checked').value;
  const setRadio = (name, v) => { const el = document.querySelector('input[name="' + name + '"][value="' + v + '"]'); if (el) el.checked = true; };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  const toastEl = $('toast'); let toastT;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2200); }

  const newSeed = () => String(Math.floor(10000 + Math.random() * 90000));
  const schoolName = (s) => (s === '초' ? '초등' : '중학교');

  function fillGrades() {
    const s = radio('school'), max = s === '초' ? 6 : 3, cur = $('grade').value;
    $('grade').innerHTML = Array.from({ length: max }, (_, i) => '<option value="' + (i + 1) + '">' + (i + 1) + '학년</option>').join('');
    if (cur && Number(cur) <= max) $('grade').value = cur;
  }
  function fillUnits(keepId) {
    const s = radio('school'), g = Number($('grade').value), sem = Number($('sem').value);
    const list = UNITS.filter((u) => u.school === s && u.grade === g && u.sem === sem);
    $('unit').innerHTML = list.map((u) => '<option value="' + u.id + '">' + esc(u.unit) + '</option>').join('');
    if (keepId && list.some((u) => u.id === keepId)) $('unit').value = keepId;
    showTopic();
  }
  function showTopic() { const u = UNITS.find((x) => x.id === $('unit').value); $('topic').textContent = u ? '나오는 문제: ' + u.topic + (u.fig ? ' (그림 문제 포함)' : '') : ''; }

  function settings() {
    return { unit: $('unit').value, level: Number(radio('level')), count: Number($('count').value), space: $('space').value, seed: ($('seed').value || '').replace(/[^0-9]/g, '').slice(0, 8) || newSeed() };
  }
  function saveHash(st, solve) {
    const h = 'u=' + st.unit + '&d=' + st.level + '&n=' + (solve ? 10 : st.count) + '&s=' + st.seed + '&sp=' + st.space + (solve ? '&m=solve' : '');
    try { history.replaceState(null, '', '#' + h); } catch (e) { /* file:// 등에서는 무시 */ }
  }
  function loadHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const u = UNITS.find((x) => x.id === p.get('u'));
    if (!u) return false;
    setRadio('school', u.school); fillGrades(); $('grade').value = String(u.grade); $('sem').value = String(u.sem); fillUnits(u.id);
    if (['1', '2', '3'].includes(p.get('d'))) setRadio('level', p.get('d'));
    if (['10', '15', '20', '30'].includes(p.get('n'))) $('count').value = p.get('n');
    if (['s', 'm', 'l'].includes(p.get('sp'))) $('space').value = p.get('sp');
    if (/^\d{1,8}$/.test(p.get('s') || '')) $('seed').value = p.get('s');
    return p.get('m') === 'solve' ? 'solve' : true;
  }

  // 날짜·이름은 화면에서만 (다시 만들어도 쓴 글은 남겨 둬요)
  let nameVal = '', dateVal = '';
  function header(u, st, kind) {
    const lv = LEVELS.find((l) => l.id === st.level).name;
    const info = schoolName(u.school) + ' ' + u.grade + '학년 ' + u.sem + '학기 · ' + u.unit;
    return '<header class="sh">' +
      '<div class="sh-top"><span class="sh-logo">Block &amp; Bit</span><span class="sh-kind">' + (kind === 'ans' ? '정답지' : '연산 문제지') + '</span></div>' +
      '<h2 class="sh-title">' + esc(info) + '</h2>' +
      '<div class="sh-meta"><span>난이도: <b>' + lv + '</b></span><span>문제 수: <b>' + st.count + '</b></span><span>문제 번호: <b>' + st.seed + '</b></span></div>' +
      (kind === 'ans' ? '' :
        '<div class="sh-fill"><label>날짜 <input class="f-date" type="text" value="' + esc(dateVal) + '" aria-label="날짜" /></label>' +
        '<label>이름 <input class="f-name" type="text" value="' + esc(nameVal) + '" aria-label="이름" /></label>' +
        '<button type="button" class="btn tiny no-print" id="today">오늘 날짜</button></div>' +
        '<p class="sh-inst">' + esc(u.inst) + ' 풀이 칸에 계산 과정을 쓰고, 답 칸에 답을 써요.</p>') +
      '</header>';
  }

  let current = null;
  function render(st) {
    const u = UNITS.find((x) => x.id === st.unit);
    if (!u) return;
    if (S) { S = null; box.hidden = true; box.innerHTML = ''; $('papers').hidden = false; document.body.classList.remove('solving'); }
    let probs;
    try { probs = GEN.makeProblems(u.id, st.level, st.count, st.seed); } catch (e) { toast('문제를 만들지 못했어요. 다른 번호로 해 볼까요?'); console.error(e); return; }
    current = { u, st, probs };
    $('seed').value = st.seed;
    const items = probs.map((p, i) => '<article class="prob' + (p.svg ? ' has-fig' : '') + '">' +
      '<div class="pq"><span class="pn">' + (i + 1) + '</span><div class="qt">' + p.q + '</div></div>' +
      (p.svg ? '<div class="pf">' + p.svg + '</div>' : '') +
      '<div class="work" aria-label="풀이 공간"><span>풀이</span></div>' +
      '<div class="pa">답: <span class="ansline"></span></div></article>').join('');
    const answers = probs.map((p, i) => '<li><span class="pn">' + (i + 1) + '</span><span class="av">' + p.ans + '</span></li>').join('');
    $('papers').innerHTML =
      '<section class="sheet problems sp-' + st.space + '" aria-label="문제지">' + header(u, st, 'q') + '<div class="probs">' + items + '</div></section>' +
      '<section class="sheet answers" aria-label="정답지">' + header(u, st, 'ans') + '<ol class="alist">' + answers + '</ol>' +
      '<p class="foot">문제 번호 ' + st.seed + ' · 같은 번호로 다시 만들면 같은 문제가 나와요.</p></section>';
    document.querySelector('.f-name').addEventListener('input', (e) => { nameVal = e.target.value; });
    document.querySelector('.f-date').addEventListener('input', (e) => { dateVal = e.target.value; });
    $('today').addEventListener('click', () => {
      const d = new Date(); dateVal = d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
      document.querySelector('.f-date').value = dateVal;
    });
    saveHash(st);
    document.title = '연산문제은행_' + u.school + u.grade + '-' + u.sem + '_' + u.unit.replace(/[\s()·]/g, '') + '_' + LEVELS.find((l) => l.id === st.level).name + '_' + st.seed;
  }

  function applyPrintMode() {
    const v = radio('pw');
    document.body.classList.toggle('print-problems', v === 'problems');
    document.body.classList.toggle('print-answers', v === 'answers');
  }
  function doPrint() {
    if (!current || S) render(settings());
    applyPrintMode();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    window.print();
  }

  // ---------- 화면에서 바로 풀기 (10문제 · 바로 채점 · 저장 안 함) ----------
  const box = $('solvebox');
  let S = null; // { u, st, probs, ok: [첫 풀이 결과], last: [마지막 결과], queue, pos, round, checked }
  const MARK_OK = '⭕', MARK_NO = '❌';
  function solveHead() {
    const lv = LEVELS.find((l) => l.id === S.st.level).name;
    return '<header class="sv-head"><div class="sv-info"><b>' + esc(schoolName(S.u.school) + ' ' + S.u.grade + '학년 ' + S.u.sem + '학기 · ' + S.u.unit) + '</b>' +
      '<span>난이도 ' + lv + ' · 문제 번호 ' + S.st.seed + (S.round > 1 ? ' · 다시 풀기 ' + (S.round - 1) + '번째' : '') + '</span></div>' +
      '<button type="button" class="btn tiny" data-act="exit">문제지 화면으로</button></header>';
  }
  function dots() {
    return '<ol class="sv-dots" aria-label="진행">' + S.probs.map((_, i) => {
      const inQ = S.queue.indexOf(i), cls = S.last[i] === true ? 'ok' : (S.last[i] === false ? 'no' : '');
      const cur = inQ === S.pos ? ' cur' : '';
      return '<li class="' + cls + cur + (inQ < 0 ? ' off' : '') + '">' + (i + 1) + '</li>';
    }).join('') + '</ol>';
  }
  function startSolve(st) {
    const u = UNITS.find((x) => x.id === st.unit);
    if (!u) return;
    let probs;
    try { probs = GEN.makeProblems(u.id, st.level, 10, st.seed); } catch (e) { toast('문제를 만들지 못했어요. 다른 번호로 해 볼까요?'); console.error(e); return; }
    $('seed').value = st.seed;
    S = { u, st, probs, ok: probs.map(() => null), last: probs.map(() => null), queue: probs.map((_, i) => i), pos: 0, round: 1, checked: false };
    saveHash(st, true);
    document.title = '화면풀기_' + u.school + u.grade + '-' + u.sem + '_' + u.unit.replace(/[\s()·]/g, '') + '_' + st.seed;
    $('papers').hidden = true; box.hidden = false; document.body.classList.add('solving');
    showQ();
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function showQ() {
    const i = S.queue[S.pos], p = S.probs[i];
    S.checked = false;
    box.innerHTML = solveHead() + dots() +
      '<article class="sv-card">' +
      '<p class="sv-count">' + (S.pos + 1) + ' / ' + S.queue.length + '</p>' +
      '<div class="pq"><span class="pn">' + (i + 1) + '</span><div class="qt">' + p.q + '</div></div>' +
      (p.svg ? '<div class="pf">' + p.svg + '</div>' : '') +
      '<form class="sv-form" autocomplete="off"><label class="sv-lab" for="sv-in">답</label>' +
      '<input id="sv-in" class="sv-in" type="text" enterkeyhint="done" autocapitalize="off" spellcheck="false" />' +
      '<button type="submit" class="btn main" id="sv-check">확인</button></form>' +
      '<p class="hint sv-hint">' + esc(CHK.inputHint(p)) + '</p>' +
      '<p class="sv-fb" id="sv-fb" role="status" aria-live="polite"></p>' +
      '<div class="btns sv-next" id="sv-next" hidden><button type="button" class="btn main" data-act="next">' + (S.pos + 1 < S.queue.length ? '다음 문제 →' : '결과 보기') + '</button></div>' +
      '</article>';
    box.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); check(); });
    const inp = $('sv-in');
    try { inp.focus({ preventScroll: true }); } catch (e) { inp.focus(); }
  }
  function check() {
    if (S.checked) return;
    const inp = $('sv-in'), v = inp.value.trim();
    if (!v) { toast('답을 써 주세요'); inp.focus(); return; }
    const i = S.queue[S.pos], right = CHK.grade(v, S.probs[i]);
    S.checked = true; S.last[i] = right; if (S.round === 1) S.ok[i] = right;
    inp.readOnly = true; $('sv-check').disabled = true;
    const fb = $('sv-fb');
    fb.className = 'sv-fb ' + (right ? 'ok' : 'no');
    fb.textContent = right ? MARK_OK + ' 맞았어요!' : MARK_NO + ' 틀렸어요. 끝나고 다시 풀어 봐요.';
    box.querySelector('.sv-dots').outerHTML = dots();
    $('sv-next').hidden = false; box.querySelector('[data-act="next"]').focus();
  }
  function next() {
    if (S.pos + 1 < S.queue.length) { S.pos++; showQ(); } else showResult(false);
  }
  function showResult(reveal) {
    const wrong = S.probs.map((_, i) => i).filter((i) => S.last[i] === false);
    const first = S.ok.filter((x) => x === true).length;
    const roundRight = S.queue.filter((i) => S.last[i] === true).length;
    let msg = '<p class="sv-score"><b>10문제 중 ' + first + '문제</b>를 처음에 맞았어요.</p>';
    if (S.round > 1) msg += '<p class="sv-sub">다시 푼 ' + S.queue.length + '문제 중 ' + roundRight + '문제를 맞았어요.</p>';
    if (!wrong.length) msg += '<p class="sv-sub good">🎉 모든 문제를 맞았어요!</p>';
    const list = '<ol class="sv-list">' + S.probs.map((p, i) => {
      const ok = S.last[i] === true;
      return '<li class="' + (ok ? 'ok' : 'no') + '"><span class="pn">' + (i + 1) + '</span><span class="sv-q">' + p.q + '</span><span class="sv-mark">' + (ok ? MARK_OK : MARK_NO) + '</span>' +
        ((reveal && !ok) ? '<span class="sv-ans">정답: ' + p.ans + '</span>' : '') + '</li>';
    }).join('') + '</ol>';
    box.innerHTML = solveHead() + '<article class="sv-card sv-result">' + msg +
      '<div class="btns">' +
      (wrong.length ? '<button type="button" class="btn main" data-act="retry">틀린 문제 다시 풀기 (' + wrong.length + '문제)</button>' : '') +
      (wrong.length && S.round > 1 && !reveal ? '<button type="button" class="btn" data-act="reveal">틀린 문제 정답 보기</button>' : '') +
      '<button type="button" class="btn" data-act="again">같은 문제 처음부터</button>' +
      '<button type="button" class="btn" data-act="new">새 문제 10개</button>' +
      '<button type="button" class="btn" data-act="share">반 전체 같은 문제 주소 복사</button>' +
      '</div>' + list + '</article>';
  }
  function retry() {
    S.queue = S.probs.map((_, i) => i).filter((i) => S.last[i] === false);
    S.queue.forEach((i) => { S.last[i] = null; });
    S.pos = 0; S.round++; showQ();
  }
  function exitSolve() { render(settings()); }
  function shareLink() {
    const url = location.href.split('#')[0] + '#u=' + S.st.unit + '&d=' + S.st.level + '&n=10&s=' + S.st.seed + '&sp=' + S.st.space + '&m=solve';
    const done = () => toast('주소를 복사했어요. 같은 주소로 열면 같은 10문제가 나와요');
    const fail = () => { window.prompt('이 주소를 복사해 학생들에게 알려 주세요', url); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, fail); else fail();
  }
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    if (a === 'next') next();
    else if (a === 'retry') retry();
    else if (a === 'reveal') showResult(true);
    else if (a === 'again') startSolve(S.st);
    else if (a === 'new') { const st = Object.assign({}, S.st, { seed: newSeed() }); startSolve(st); }
    else if (a === 'share') shareLink();
    else if (a === 'exit') exitSolve();
  });

  // ---------- 이벤트 ----------
  document.querySelectorAll('input[name="school"]').forEach((el) => el.addEventListener('change', () => { fillGrades(); fillUnits(); }));
  $('grade').addEventListener('change', () => fillUnits());
  $('sem').addEventListener('change', () => fillUnits());
  $('unit').addEventListener('change', showTopic);
  $('make').addEventListener('click', () => { $('seed').value = newSeed(); render(settings()); toast('새 문제지를 만들었어요'); });
  $('remake').addEventListener('click', () => { render(settings()); toast('문제 번호 ' + $('seed').value + '(으)로 만들었어요'); });
  $('space').addEventListener('change', () => { if (current) { current.st.space = $('space').value; render(current.st); } });
  document.querySelectorAll('input[name="pw"]').forEach((el) => el.addEventListener('change', applyPrintMode));
  $('print').addEventListener('click', doPrint);
  $('solve').addEventListener('click', () => { const st = settings(); if (!$('seed').value) $('seed').value = st.seed; startSolve(st); });
  $('pdf').addEventListener('click', () => {
    $('pdfhelp').classList.add('flash'); setTimeout(() => $('pdfhelp').classList.remove('flash'), 1600);
    toast('인쇄 창에서 대상을 "PDF로 저장"으로 골라 주세요');
    setTimeout(doPrint, 600);
  });

  // ---------- 시작 ----------
  const fromHash = loadHash();
  if (!fromHash) {
    fillGrades(); fillUnits();
    $('seed').value = newSeed();
  }
  if (fromHash === 'solve') startSolve(settings()); else render(settings());
})();
