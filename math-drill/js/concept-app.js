/* 수학 개념 — 화면 (학년·학기·단원 → ① 개념 설명 → ② 예제 → ③ 개념 영상 → ④ 문제지 만들기 → 응용문제 자리) */
(function () {
  'use strict';
  const UNITS = window.MD_UNITS, CONCEPTS = window.MD_CONCEPTS;
  const $ = (id) => document.getElementById(id);
  const radio = (name) => document.querySelector('input[name="' + name + '"]:checked').value;
  const setRadio = (name, v) => { const el = document.querySelector('input[name="' + name + '"][value="' + v + '"]'); if (el) el.checked = true; };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const schoolName = (s) => (s === '초' ? '초등' : '중학교');

  function fillGrades() {
    const s = radio('school'), max = s === '초' ? 6 : 3, cur = $('grade').value;
    $('grade').innerHTML = Array.from({ length: max }, (_, i) => '<option value="' + (i + 1) + '">' + (i + 1) + '학년</option>').join('');
    if (cur && Number(cur) <= max) $('grade').value = cur;
  }
  function fillUnits(keepId) {
    const s = radio('school'), g = Number($('grade').value), sem = Number($('sem').value);
    const list = UNITS.filter((u) => u.school === s && u.grade === g && u.sem === sem);
    $('unit').innerHTML = list.map((u) => '<option value="' + u.id + '">' + esc(u.unit) + (CONCEPTS[u.id] ? '' : ' (개념 준비 중)') + '</option>').join('');
    if (keepId && list.some((u) => u.id === keepId)) $('unit').value = keepId;
    show();
  }
  function loadHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const u = UNITS.find((x) => x.id === p.get('u'));
    if (!u) return false;
    setRadio('school', u.school); fillGrades(); $('grade').value = String(u.grade); $('sem').value = String(u.sem); fillUnits(u.id);
    return true;
  }

  function show() {
    const u = UNITS.find((x) => x.id === $('unit').value);
    if (!u) { $('concept').innerHTML = ''; return; }
    const c = CONCEPTS[u.id];
    const drill = './index.html#u=' + u.id;
    $('toDrill').href = drill;
    try { history.replaceState(null, '', '#u=' + u.id); } catch (e) { /* file:// 등 */ }
    document.title = '수학 개념 · ' + schoolName(u.school) + ' ' + u.grade + '-' + u.sem + ' ' + u.unit + ' | Block & Bit';
    let h = '<p class="crumb">' + schoolName(u.school) + ' ' + u.grade + '학년 ' + u.sem + '학기</p><h2 class="ctitle">' + esc(u.unit) + '</h2><p class="topic">' + esc(u.topic) + '</p>';
    if (c) {
      h += '<section class="cbox" aria-labelledby="c1"><h3 id="c1"><span class="step">1</span> 개념 설명</h3><ul class="clines">' + c.lines.map((l) => '<li>' + esc(l) + '</li>').join('') + '</ul>' +
        '<div class="cfigs">' + c.figs.map((f) => '<figure>' + f + '</figure>').join('') + '</div></section>';
      h += '<section class="cbox" aria-labelledby="c2"><h3 id="c2"><span class="step">2</span> 예제 풀이</h3><p class="exq"><b>문제</b> ' + esc(c.ex.q) + '</p>' + (c.ex.fig ? '<figure class="exfig">' + c.ex.fig + '</figure>' : '') +
        '<button type="button" class="btn" id="showSol" aria-expanded="false" aria-controls="sol">풀이 보기</button>' +
        '<ol class="sol" id="sol" hidden>' + c.ex.steps.map((s) => '<li>' + esc(s) + '</li>').join('') + '<li class="exa">답: <b>' + esc(c.ex.ans) + '</b></li></ol></section>';
    } else {
      h += '<section class="cbox"><h3><span class="step">1</span> 개념 설명</h3><p class="soon">이 단원 개념 설명은 준비 중이에요. 문제지는 지금도 만들 수 있어요.</p></section>';
    }
    h += '<section class="cbox" aria-labelledby="c3"><h3 id="c3"><span class="step">' + (c ? 3 : 2) + '</span> 개념 영상</h3>' +
      (c && c.video ? '<div class="vwrap"><iframe src="' + esc(c.video) + '" title="' + esc(u.unit) + ' 개념 영상" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe></div>' : '<p class="soon">🎬 영상 준비 중이에요.</p>') + '</section>';
    h += '<section class="cbox go" aria-labelledby="c4"><h3 id="c4"><span class="step">' + (c ? 4 : 3) + '</span> 문제 풀기</h3><p>개념을 봤으면 같은 단원 문제지를 만들어 풀어 봐요. 난이도·문제 수를 골라 인쇄하거나 PDF로 저장할 수 있어요.</p>' +
      '<a class="btn main" id="makeSheet" href="' + drill + '">🖨 이 단원 문제지 만들기</a></section>';
    h += '<section class="cbox later" aria-label="응용문제"><h3>응용문제</h3><p class="soon">응용문제는 다음에 넣을 예정이에요.</p></section>';
    $('concept').innerHTML = h;
    const b = $('showSol');
    if (b) b.addEventListener('click', () => { const s = $('sol'); s.hidden = !s.hidden; b.setAttribute('aria-expanded', String(!s.hidden)); b.textContent = s.hidden ? '풀이 보기' : '풀이 접기'; });
  }

  document.querySelectorAll('input[name="school"]').forEach((el) => el.addEventListener('change', () => { fillGrades(); fillUnits(); }));
  $('grade').addEventListener('change', () => fillUnits());
  $('sem').addEventListener('change', () => fillUnits());
  $('unit').addEventListener('change', show);
  window.addEventListener('hashchange', loadHash);
  if (!loadHash()) { fillGrades(); fillUnits(); }
})();
