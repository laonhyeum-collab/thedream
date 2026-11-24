/* 연산 문제은행 — 화면 (설정 → 문제지 · 정답지 만들기 → 인쇄/PDF) */
(function () {
  'use strict';
  const UNITS = window.MD_UNITS, LEVELS = window.MD_LEVELS, GEN = window.MD_GEN;
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
  function saveHash(st) {
    const h = 'u=' + st.unit + '&d=' + st.level + '&n=' + st.count + '&s=' + st.seed + '&sp=' + st.space;
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
    return true;
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
    if (!current) render(settings());
    applyPrintMode();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    window.print();
  }

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
  $('pdf').addEventListener('click', () => {
    $('pdfhelp').classList.add('flash'); setTimeout(() => $('pdfhelp').classList.remove('flash'), 1600);
    toast('인쇄 창에서 대상을 "PDF로 저장"으로 골라 주세요');
    setTimeout(doPrint, 600);
  });

  // ---------- 시작 ----------
  if (!loadHash()) {
    fillGrades(); fillUnits();
    $('seed').value = newSeed();
  }
  render(settings());
})();
