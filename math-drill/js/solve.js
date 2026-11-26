/* 연산 문제은행 — 화면으로 바로 풀기 (10문제 한 장씩 → 바로 채점 → 틀린 문제 다시 풀기)
 * 로그인·이름·저장 없음. 같은 단원·난이도·문제 번호면 반 전체가 같은 10문제를 풀어요. */
(function () {
  'use strict';
  const UNITS = window.MD_UNITS, LEVELS = window.MD_LEVELS, GEN = window.MD_GEN, CK = window.MD_CHECK, LK = window.MD_LINKS;
  const COUNT = 10;
  const $ = (id) => document.getElementById(id);
  const radio = (name) => document.querySelector('input[name="' + name + '"]:checked').value;
  const setRadio = (name, v) => { const el = document.querySelector('input[name="' + name + '"][value="' + v + '"]'); if (el) el.checked = true; };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const newSeed = () => String(Math.floor(10000 + Math.random() * 90000));
  let toastT;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }

  // ---------- 고르기 ----------
  function fillGrades() {
    const max = radio('school') === '초' ? 6 : 3, cur = $('grade').value;
    $('grade').innerHTML = Array.from({ length: max }, (_, i) => '<option value="' + (i + 1) + '">' + (i + 1) + '학년</option>').join('');
    if (cur && Number(cur) <= max) $('grade').value = cur;
  }
  function fillUnits(keepId) {
    const s = radio('school'), g = Number($('grade').value), sem = Number($('sem').value);
    const list = UNITS.filter((u) => u.school === s && u.grade === g && u.sem === sem);
    $('unit').innerHTML = list.map((u) => '<option value="' + u.id + '">' + esc(u.unit) + '</option>').join('');
    if (keepId && list.some((u) => u.id === keepId)) $('unit').value = keepId;
    onChange();
  }
  function choice() {
    return { unit: $('unit').value, level: Number(radio('level')), seed: ($('seed').value || '').replace(/[^0-9]/g, '').slice(0, 8) || newSeed() };
  }
  function onChange() {
    const u = UNITS.find((x) => x.id === $('unit').value), st = choice();
    $('topic').textContent = u ? '나오는 문제: ' + u.topic + (u.fig ? ' (그림 문제 포함)' : '') : '';
    const rel = LK.solve(st.unit, st.level, st.seed);
    $('shareUrl').value = new URL(rel, location.href).href;
    $('toPrint').href = LK.print(st.unit, st.level, 10, st.seed);
    const c = LK.concept(st.unit);
    $('toConcept').hidden = !c; if (c) $('toConcept').href = c;
    try { history.replaceState(null, '', rel.replace('./solve.html', '')); } catch (e) { /* file:// 에서는 무시 */ }
  }
  function loadHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const u = UNITS.find((x) => x.id === p.get('u'));
    if (!u) return false;
    setRadio('school', u.school); fillGrades(); $('grade').value = String(u.grade); $('sem').value = String(u.sem);
    if (['1', '2', '3'].includes(p.get('d'))) setRadio('level', p.get('d'));
    $('seed').value = /^\d{1,8}$/.test(p.get('s') || '') ? p.get('s') : newSeed();
    fillUnits(u.id);
    return true;
  }

  // ---------- 풀기 ----------
  let S = null; // { u, st, probs, order:[문제 번호], i, right:Set, wrongFirst:Set, round }
  function show(id) { ['setup', 'play', 'done'].forEach((x) => { $(x).hidden = x !== id; }); window.scrollTo(0, 0); }

  const KEY_SETS = {
    base: ['/', '-', '.', ','],
    frac: ['/', '␣', '-', ','],
    alg: ['x', 'y', '^2', '(', ')', '-', '/', '≥', '≤'],
    root: ['√', 'π', '/', '-', '(', ')', 'x'],
  };
  function keysFor(p) {
    const a = CK.ansText(p.ans);
    if (/√|π/.test(a)) return KEY_SETS.root;
    if (/[xy]/.test(a) || p.chk.t === 'poly' || p.chk.t === 'ineq') return KEY_SETS.alg;
    if (/\//.test(a)) return KEY_SETS.frac;
    return KEY_SETS.base;
  }

  function start(st, only) {
    const u = UNITS.find((x) => x.id === st.unit);
    if (!u) return;
    let probs;
    try { probs = GEN.makeProblems(u.id, st.level, COUNT, st.seed); } catch (e) { toast('문제를 만들지 못했어요. 새 번호로 해 볼까요?'); console.error(e); return; }
    S = { u, st, probs, order: only || probs.map((_, i) => i), i: 0, right: new Set(), wrongFirst: new Set(), round: only ? 2 : 1 };
    const lv = LEVELS.find((l) => l.id === st.level).name;
    $('pTitle').textContent = u.grade + '학년 ' + u.sem + '학기 · ' + u.unit + ' · ' + lv + ' · 번호 ' + st.seed;
    document.title = '화면으로 풀기 · ' + u.unit + ' | 연산 문제은행';
    show('play'); showQ();
  }
  function showQ() {
    const k = S.order[S.i], p = S.probs[k];
    $('qNum').textContent = k + 1;
    $('qRound').textContent = S.round > 1 ? '다시 풀기' : '';
    $('pCount').textContent = (S.i + 1) + ' / ' + S.order.length;
    $('dots').innerHTML = S.order.map((x, j) => '<span class="' + (j === S.i ? 'cur' : (j < S.i ? (S.right.has(x) ? 'ok' : 'no') : '')) + '"></span>').join('');
    $('qInst').textContent = S.u.inst;
    $('qText').innerHTML = p.q; // 생성기가 만든 문제(HTML)
    $('qFig').innerHTML = p.svg || ''; $('qFig').hidden = !p.svg;
    $('ans').value = ''; $('ans').disabled = false; $('check').disabled = false;
    $('ansHint').textContent = CK.hint(p);
    $('keys').innerHTML = keysFor(p).map((k2) => '<button type="button" class="key" data-k="' + esc(k2) + '">' + (k2 === '␣' ? '띄우기' : esc(k2)) + '</button>').join('') + '<button type="button" class="key wide" data-k="⌫">지우기</button>';
    $('result').className = 'result'; $('result').innerHTML = '';
    $('next').hidden = true;
    tries = 0;
    setTimeout(() => $('ans').focus({ preventScroll: true }), 50);
  }
  let tries = 0;
  function check() {
    const k = S.order[S.i], p = S.probs[k], v = $('ans').value;
    if (!v.trim()) { toast('답을 먼저 써 주세요'); $('ans').focus(); return; }
    const ok = CK.isCorrect(p, v);
    tries++;
    if (ok) {
      S.right.add(k);
      $('result').className = 'result ok';
      $('result').innerHTML = '⭕ 맞았어요!';
    } else if (tries < 2) {
      $('result').className = 'result no';
      $('result').innerHTML = '❌ 다시 한 번 생각해 봐요. (한 번 더 쓸 수 있어요)';
      $('ans').select();
      return;
    } else {
      S.wrongFirst.add(k);
      $('result').className = 'result no';
      $('result').innerHTML = '❌ 틀렸어요. 정답: <b class="ansv">' + p.ans + '</b>';
    }
    $('ans').disabled = true; $('check').disabled = true;
    $('next').hidden = false;
    $('next').textContent = S.i + 1 < S.order.length ? '다음 문제 ▶' : '결과 보기 ▶';
    $('next').focus({ preventScroll: true });
  }
  function next() {
    S.i++;
    if (S.i < S.order.length) showQ(); else finish();
  }
  function finish() {
    const n = S.order.length, r = S.order.filter((k) => S.right.has(k)).length;
    const wrong = S.order.filter((k) => !S.right.has(k));
    $('score').textContent = (S.round > 1 ? '다시 풀기 ' : '') + n + '문제 중 ' + r + '문제 맞았어요';
    $('scoreMsg').textContent = !wrong.length ? '🎉 모두 맞았어요! 같은 단원 새 문제나 다음 난이도에 도전해 봐요.' : '틀린 ' + wrong.length + '문제를 다시 풀어 볼까요?';
    $('review').innerHTML = S.order.map((k) => '<li class="' + (S.right.has(k) ? 'ok' : 'no') + '"><span class="pn">' + (k + 1) + '</span><span class="rq">' + (S.right.has(k) ? '⭕' : '❌') + '</span><span class="av">' + S.probs[k].ans + '</span></li>').join('');
    $('retry').hidden = !wrong.length;
    S.wrongList = wrong;
    show('done');
  }

  // ---------- 이벤트 ----------
  document.querySelectorAll('input[name="school"]').forEach((el) => el.addEventListener('change', () => { fillGrades(); fillUnits(); }));
  $('grade').addEventListener('change', () => fillUnits());
  $('sem').addEventListener('change', () => fillUnits());
  $('unit').addEventListener('change', onChange);
  document.querySelectorAll('input[name="level"]').forEach((el) => el.addEventListener('change', onChange));
  $('seed').addEventListener('input', onChange);
  $('newseed').addEventListener('click', () => { $('seed').value = newSeed(); onChange(); toast('새 문제 번호를 만들었어요'); });
  $('copy').addEventListener('click', () => {
    const t = $('shareUrl'); t.select();
    (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => toast('주소를 복사했어요'), () => { try { document.execCommand('copy'); toast('주소를 복사했어요'); } catch (e) { toast('주소를 길게 눌러 복사해 주세요'); } });
  });
  $('start').addEventListener('click', () => { const st = choice(); $('seed').value = st.seed; onChange(); start(st); });
  $('ansForm').addEventListener('submit', (e) => { e.preventDefault(); if (!$('check').disabled) check(); });
  $('next').addEventListener('click', next);
  $('keys').addEventListener('click', (e) => {
    const b = e.target.closest('.key'); if (!b) return;
    const inp = $('ans'); if (inp.disabled) return;
    const k = b.dataset.k, a = inp.selectionStart != null ? inp.selectionStart : inp.value.length, z = inp.selectionEnd != null ? inp.selectionEnd : a;
    if (k === '⌫') { const from = a === z ? Math.max(0, a - 1) : a; inp.value = inp.value.slice(0, from) + inp.value.slice(z); inp.setSelectionRange(from, from); }
    else { const ins = k === '␣' ? ' ' : k; inp.value = inp.value.slice(0, a) + ins + inp.value.slice(z); inp.setSelectionRange(a + ins.length, a + ins.length); }
    inp.focus({ preventScroll: true });
  });
  $('quit').addEventListener('click', () => { if (confirm('처음 화면으로 갈까요? 지금 푼 결과는 사라져요.')) show('setup'); });
  $('retry').addEventListener('click', () => start(S.st, S.wrongList));
  $('again').addEventListener('click', () => { $('seed').value = newSeed(); onChange(); start(choice()); });
  $('home').addEventListener('click', () => show('setup'));

  // ---------- 시작 ----------
  window.addEventListener('hashchange', () => { if (loadHash()) show('setup'); });
  if (!loadHash()) { fillGrades(); $('seed').value = newSeed(); fillUnits(); }
})();
