// [교사 앱] 제출물 확인 · 입점 승인/수정 요청 · 부스 배정 · 일괄 인쇄 · 4차시 수업 타이머
import { topicById, categoryById } from '../shared/topics.js';
import { normalizePlan, planRows, progress, missingRequired, topicView, planSafety } from '../shared/plan.js';
import { loadConfig, saveConfig, createApi, isValidEndpoint } from '../shared/api.js';
import { mountApp } from '../shared/sandbox.js';
import { applyImages } from '../shared/images.js';
import { download, readFileText, safeName } from '../shared/files.js';
import { LESSONS, TIMER_PRESETS } from './lesson.js';
import { createWorldAdmin } from './worldadmin.js';
import { createAccountsAdmin } from './accounts.js';
import { STUDENT_BOOTHS } from '../shared/worldart.js';
import { h, $, toast, copyText, fmtTime } from '../shared/ui.js';

const KEY_STORE = 'myappmaker.teacher.key';
const LOCAL = 'myappmaker.teacher.local';
const STATUS = {
  submitted: { label: '📨 확인 대기', cls: 'warn' },
  needs_fix: { label: '🔧 수정 요청', cls: 'bad' },
  approved: { label: '🏪 입점', cls: 'ok' },
};

let cfg = loadConfig('teacher');
let teacherKey = (() => { try { return localStorage.getItem(KEY_STORE) || ''; } catch { return ''; } })();
let api = createApi(cfg);
let items = [];
let filter = 'all';

// ---------- 파일 제출(이 기기) ----------
function localItems() {
  try { return JSON.parse(localStorage.getItem(LOCAL) || '[]'); } catch { return []; }
}
function saveLocal(list) {
  try { localStorage.setItem(LOCAL, JSON.stringify(list)); return true; } catch { toast('이 기기 저장 공간이 부족해요. 전체 백업 후 정리해 주세요', 5000); return false; }
}
function fromSubmission(sub) {
  const plan = normalizePlan(sub.plan || sub);
  return {
    id: `file_${(sub.studentKey || plan.id).slice(-20)}`, source: 'file',
    developer: plan.f.developer, classInfo: plan.f.classInfo, appName: plan.f.appName, topicId: plan.topicId,
    status: 'submitted', feedback: '', booth: null, appUrl: plan.app.url, hasHtml: !!plan.app.html, htmlSize: plan.app.html.length,
    submittedAt: sub.submittedAt || plan.updatedAt, likes: 0, plan: { ...plan, boothImage: '', app: { ...plan.app, html: '', images: {} } }, html: applyImages(plan.app.html, plan.app.images), boothImage: plan.boothImage || '', hasBooth: !!plan.boothImage,
  };
}

// ---------- 불러오기 ----------
async function refresh() {
  const list = localItems().map((x) => ({ ...x, source: 'file' }));
  let serverErr = '';
  if (api.enabled && teacherKey) {
    try {
      const r = await api.list(teacherKey);
      list.unshift(...r.items.map((x) => ({ ...x, source: 'server' })));
      setConn(true);
    } catch (e) { serverErr = e.message; setConn(false, e.message); }
  } else setConn(false);
  items = list;
  $('#listInfo').textContent = [
    api.enabled && teacherKey ? `🏫 저장소 ${items.filter((x) => x.source === 'server').length}명` : '저장소 미연결 (⚙️ 연결 설정)',
    `📁 파일 ${items.filter((x) => x.source === 'file').length}명`,
    `마지막 확인 ${new Date().toLocaleTimeString('ko-KR')}`,
    serverErr ? `⚠ ${serverErr}` : '',
  ].filter(Boolean).join(' · ');
  renderStudents();
  renderBooths();
}

function setConn(ok, msg) {
  const p = $('#connPill');
  p.className = `pill ${ok ? 'ok' : (msg ? 'bad' : '')}`;
  p.textContent = ok ? '🟢 저장소 연결됨' : (msg ? '🔴 연결 오류' : '⚪ 파일 모드');
  p.title = msg || '';
}

// ---------- 학생 현황 ----------
function renderStudents() {
  const count = (s) => items.filter((x) => x.status === s).length;
  $('#stats').replaceChildren(
    stat('👩‍🎓', items.length, '제출'),
    stat('📨', count('submitted'), '확인 대기'),
    stat('🔧', count('needs_fix'), '수정 요청'),
    stat('🏪', count('approved'), '입점'),
  );
  const opts = [['all', '전체'], ['submitted', '확인 대기'], ['needs_fix', '수정 요청'], ['approved', '입점']];
  $('#statusFilter').replaceChildren(...opts.map(([id, label]) => h('button', { class: 'chip', type: 'button', 'aria-pressed': String(filter === id), onclick: () => { filter = id; renderStudents(); } }, label)));
  const list = items.filter((x) => filter === 'all' || x.status === filter)
    .sort((a, b) => (a.status === 'submitted' ? -1 : 0) - (b.status === 'submitted' ? -1 : 0) || String(a.developer).localeCompare(String(b.developer), 'ko'));
  $('#studentList').replaceChildren(...(list.length ? list.map(studentCard) : [h('div', { class: 'card empty' },
    h('p', {}, '아직 제출한 학생이 없어요.'),
    h('p', { class: 'muted small' }, '저장소를 연결했다면 학생이 「선생님께 보내기」를 누르면 여기에 나타나요. 파일로 받았다면 「📁 제출 파일 넣기」를 눌러요.'))]));
}
function stat(emo, n, label) { return h('div', { class: 'stat card' }, h('span', { class: 'emo' }, emo), h('b', {}, String(n)), h('span', { class: 'muted small' }, label)); }

function studentCard(x) {
  const t = viewOf(x);
  const st = STATUS[x.status] || STATUS.submitted;
  const pct = x.plan ? progress(normalizePlanSafe(x.plan)) : 0;
  return h('button', { class: 'student card', type: 'button', 'data-id': x.id, onclick: () => openDetail(x.id) },
    h('span', { class: 'emo' }, t ? t.emoji : '❔'),
    h('span', { class: 'who' }, h('b', {}, x.developer || '(이름 없음)'), x.classInfo ? h('span', { class: 'muted small' }, ` ${x.classInfo}`) : ''),
    h('span', { class: 'app' }, x.appName || '(앱 이름 없음)'),
    h('span', { class: 'meta muted small' }, `${t ? t.name : '주제 없음'} · 기획서 ${pct}% · ${x.hasHtml ? '코드' : (x.appUrl ? '링크' : '앱 없음')} ${x.source === 'file' ? '· 📁' : ''}`),
    h('span', { class: 'row' }, h('span', { class: `pill ${st.cls}` }, st.label), x.booth ? h('span', { class: 'pill' }, `${x.booth}번 부스`) : '', x.likes ? h('span', { class: 'pill' }, `👍 ${x.likes}`) : ''),
    h('span', { class: 'muted small' }, fmtTime(x.submittedAt)));
}
// 학생이 고른 나만의 주제(없으면 기본 게임 방식)
function viewOf(x) {
  const p = x.plan ? normalizePlanSafe(x.plan) : null;
  return (p && topicView(p)) || topicById(x.topicId);
}
function normalizePlanSafe(p) { try { return normalizePlan(p); } catch { return null; } }

// ---------- 상세 ----------
async function getHtml(x) {
  if (x.source === 'file') return { html: x.html, url: x.appUrl };
  const r = await api.teacherApp(teacherKey, x.id);
  return { html: r.html, url: r.appUrl };
}

async function openDetail(id) {
  const x = items.find((i) => i.id === id);
  if (!x) return;
  const plan = normalizePlanSafe(x.plan);
  const t = viewOf(x);
  const miss = plan ? missingRequired(plan) : [];
  const frame = h('iframe', { class: 'app-frame', title: `${x.appName} 실행 화면`, style: 'height:420px' });
  const fb = h('textarea', { rows: 3, placeholder: '예) 실패 화면에서 다시하기 버튼이 안 눌려요. 고쳐 달라고 해 볼까요?' }); fb.value = x.feedback || '';
  const booth = h('input', { type: 'number', min: 1, max: STUDENT_BOOTHS, placeholder: '1~12' }); booth.value = x.booth || '';
  const save = async (status) => {
    try {
      await review(x, { status, feedback: fb.value.trim(), booth: booth.value === '' ? null : Number(booth.value) });
      toast(`상태를 바꿨어요: ${STATUS[status].label}`);
      closeDetail();
      refresh();
    } catch (e) { toast(e.message, 4000); }
  };
  $('#detailBody').replaceChildren(
    h('div', { class: 'row' }, h('span', { class: 'emo-lg' }, t ? t.emoji : '❔'),
      h('div', { class: 'grow' }, h('h2', { id: 'dtTitle' }, x.appName || '(앱 이름 없음)'), h('p', { class: 'muted' }, `${x.developer} ${x.classInfo || ''} · ${t ? `${t.name} (${categoryById(t.cat).name})` : ''} · ${fmtTime(x.submittedAt)}`)),
      h('button', { class: 'ghost', onclick: closeDetail, 'aria-label': '닫기' }, '✕')),
    miss.length ? h('p', { class: 'pill warn' }, `비어 있는 ★ 항목: ${miss.map((m) => m.title).join(', ')}`) : '',
    plan && planSafety(plan).length ? h('p', { class: 'pill bad' }, `🚫 확인 필요: ${planSafety(plan).map((it) => `${it.n}번 「${it.words.join('」「')}」`).join(', ')}`) : '',
    t && t.learn ? h('p', { class: 'pill ok' }, `📚 교과 연계: ${(plan && plan.f.learnGoal) || `${t.curr} · ${t.learn}`}`) : '',
    h('div', { class: 'detail-grid' },
      h('div', {}, h('h3', {}, '🕹️ 앱 실행'), frame,
        x.appUrl ? h('p', { class: 'small' }, '공유 주소: ', h('a', { href: x.appUrl, target: '_blank', rel: 'noopener noreferrer' }, x.appUrl)) : ''),
      h('div', {}, h('h3', {}, '📝 기획서'), plan ? planTable(plan) : h('p', { class: 'muted' }, '기획서가 없어요'))),
    h('div', { class: 'card review-box' },
      h('h3', {}, '💬 피드백 · 입점'),
      h('label', { class: 'field' }, h('span', {}, '학생에게 보낼 말'), fb),
      h('div', { class: 'row' },
        h('label', { class: 'field' }, h('span', {}, '부스 번호'), booth),
        h('span', { class: 'grow' }),
        h('button', { class: 'mint big', onclick: () => save('approved') }, '🏪 입점 승인'),
        h('button', { class: 'danger', onclick: () => save('needs_fix') }, '🔧 수정 요청'),
        h('button', { class: 'ghost', onclick: () => save('submitted') }, '대기로')),
      h('div', { class: 'row' },
        h('button', { class: 'ghost small', onclick: () => printPlans([x]) }, '🖨️ 이 기획서 인쇄'),
        h('button', { class: 'ghost small', onclick: async () => { const a = await getHtml(x); if (a.html) download(`${safeName(x.developer)}_${safeName(x.appName)}.html`, a.html, 'text/html'); else toast('코드가 없어요'); } }, '⬇️ 앱 HTML'),
        h('span', { class: 'grow' }),
        h('button', { class: 'danger small', onclick: () => removeItem(x) }, '🗑️ 삭제'))),
  );
  $('#detail').hidden = false;
  if (!booth.value && x.status !== 'approved') booth.value = nextFreeBooth() || '';
  try {
    const a = await getHtml(x);
    if (a.html || a.url) mountApp(frame, a);
    else frame.srcdoc = '<p style="font-family:sans-serif;color:#888;text-align:center;margin-top:30%">앱이 아직 없어요</p>';
  } catch (e) { frame.srcdoc = `<p style="font-family:sans-serif;color:#c00;text-align:center">앱을 불러오지 못했어요</p>`; toast(e.message); }
}
function closeDetail() { $('#detail').hidden = true; $('#detailBody').replaceChildren(); }
$('#detail').addEventListener('click', (e) => { if (e.target.id === 'detail') closeDetail(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#detail').hidden) closeDetail(); });

function planTable(plan) {
  return h('table', { class: 'plan-table' }, h('tbody', {}, ...planRows(plan).map((r) => h('tr', {},
    h('th', {}, r.n && r.n <= 15 ? `${r.n}. ${r.title}` : r.title), h('td', {}, r.value || '—')))));
}

async function review(x, patch) {
  if (x.source === 'server') return api.review(teacherKey, { id: x.id, ...patch });
  const list = localItems();
  const i = list.findIndex((l) => l.id === x.id);
  if (i < 0) throw new Error('파일 제출 데이터를 찾지 못했어요');
  list[i] = { ...list[i], ...patch, reviewedAt: new Date().toISOString() };
  saveLocal(list);
  return list[i];
}

async function removeItem(x) {
  if (!confirm(`${x.developer} 학생의 「${x.appName}」 제출을 삭제할까요? 되돌릴 수 없어요.`)) return;
  try {
    if (x.source === 'server') await api.remove(teacherKey, x.id);
    else saveLocal(localItems().filter((l) => l.id !== x.id));
    toast('삭제했어요'); closeDetail(); refresh();
  } catch (e) { toast(e.message); }
}

function nextFreeBooth() {
  const used = new Set(items.filter((x) => x.status === 'approved' && x.booth).map((x) => Number(x.booth)));
  for (let n = 1; n <= STUDENT_BOOTHS; n++) if (!used.has(n)) return n;
  return null;   // 부스 12개가 다 찼어요
}

// ---------- 파일 제출 넣기 ----------
$('#importSubs').onchange = async (e) => {
  const fs = [...e.target.files]; e.target.value = '';
  const list = localItems();
  let ok = 0; const bad = [];
  for (const f of fs) {
    try {
      const it = fromSubmission(JSON.parse(await readFileText(f, 3_000_000)));
      const i = list.findIndex((l) => l.id === it.id);
      if (i >= 0) list[i] = { ...it, status: 'submitted', feedback: list[i].feedback, booth: list[i].booth }; else list.push(it);
      ok += 1;
    } catch (err) { bad.push(`${f.name}: ${err.message}`); }
  }
  if (saveLocal(list)) toast(`📁 ${ok}개 넣었어요${bad.length ? ` · ${bad.length}개 실패` : ''}`, 4000);
  if (bad.length) alert(`넣지 못한 파일:\n${bad.join('\n')}`);
  refresh();
};

// ---------- 인쇄·백업 ----------
function printPlans(list) {
  const sheets = list.map((x, i) => {
    const plan = normalizePlanSafe(x.plan);
    const t = viewOf(x);
    return h('div', { class: `print-sheet${i ? ' page-break' : ''}` },
      h('h1', {}, `📱 ${x.appName || (t ? t.name : '')} — 앱 기획서`),
      h('p', {}, `개발자: ${x.developer} ${x.classInfo || ''} · 상태: ${(STATUS[x.status] || STATUS.submitted).label}${x.booth ? ` · ${x.booth}번 부스` : ''}${x.feedback ? ` · 피드백: ${x.feedback}` : ''}`),
      plan ? planTable(plan) : h('p', {}, '기획서 없음'));
  });
  $('#printArea').replaceChildren(...sheets);
  window.print();
}
$('#printAllBtn').onclick = () => { if (!items.length) { toast('인쇄할 기획서가 없어요'); return; } printPlans(items); };
$('#exportAllBtn').onclick = async () => {
  if (!items.length) { toast('백업할 제출물이 없어요'); return; }
  toast('앱 코드를 모으는 중…');
  const out = [];
  for (const x of items) {
    let html = '';
    try { html = (await getHtml(x)).html || ''; } catch { html = ''; }
    out.push({ ...x, html });
  }
  download(`MYAPPMAKER_전체백업_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ schema: 'myappmaker.backup/1', exportedAt: new Date().toISOString(), items: out }));
};

// ---------- 부스 ----------
function renderBooths() {
  const approved = items.filter((x) => x.status === 'approved').sort((a, b) => (a.booth || 999) - (b.booth || 999));
  $('#boothMap').replaceChildren(...(approved.length ? approved.map((x) => {
    const t = viewOf(x);
    const c = t ? categoryById(t.cat) : null;
    return h('button', { class: 'booth card', type: 'button', style: c ? `--c:${c.color}` : '', onclick: () => openDetail(x.id) },
      h('span', { class: 'no' }, x.booth ? `${x.booth}` : '?'),
      h('span', { class: 'emo' }, t ? t.emoji : '❔'),
      h('b', {}, x.appName), h('span', { class: 'muted small' }, x.developer), x.likes ? h('span', { class: 'small' }, `👍 ${x.likes}`) : '');
  }) : [h('div', { class: 'card empty' }, '아직 입점한 앱이 없어요. 학생 현황에서 「입점 승인」을 눌러요.')]));
}
$('#autoBooth').onclick = async () => {
  const todo = items.filter((x) => x.status === 'approved' && !x.booth);
  if (!todo.length) { toast('번호가 없는 입점 앱이 없어요'); return; }
  for (const x of todo) {
    const n = nextFreeBooth();
    if (!n) { toast(`부스는 ${STUDENT_BOOTHS}개까지예요. 남은 앱은 앱 월드 「탐험」 목록에서만 열려요`, 5000); break; }
    try { await review(x, { status: 'approved', booth: n }); x.booth = n; } catch (e) { toast(e.message); break; }
  }
  toast(`🔢 ${todo.length}개 부스에 번호를 붙였어요`);
  refresh();
};
$('#exportWorld').onclick = async () => {
  const approved = items.filter((x) => x.status === 'approved');
  if (!approved.length) { toast('입점한 앱이 없어요'); return; }
  const out = [];
  for (const x of approved) {
    let a = { html: '', url: x.appUrl };
    try { a = await getHtml(x); } catch { /* 링크만 */ }
    const plan = normalizePlanSafe(x.plan);
    let boothImage = x.boothImage || '';
    if (!boothImage && x.hasBooth && x.source === 'server' && x.status === 'approved') { try { boothImage = (await api.booth(x.id)).image; } catch { /* 기본 건물 */ } }
    out.push({ id: x.id, developer: x.developer, appName: x.appName, topicId: x.topicId, booth: x.booth, likes: x.likes || 0, intro: plan ? plan.f.intro : '', appUrl: a.url || '', html: a.html || '', avatar: plan ? plan.avatar || null : null, boothImage });
  }
  const worldPart = await worldAdmin.exportPart().catch(() => ({}));
  download(`메타버스_앱월드_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ schema: 'myappmaker.world/1', exportedAt: new Date().toISOString(), items: out, ...worldPart }));
  toast('🌏 메타버스 파일을 내려받았어요');
};

// ---------- 4차시 수업 ----------
function renderLesson() {
  $('#lessonPlan').replaceChildren(...LESSONS.map((l) => h('article', { class: 'card lesson' },
    h('h3', {}, `${l.emoji} ${l.n}차시 · ${l.title}`),
    h('p', { class: 'small' }, h('b', {}, '목표 '), l.goal),
    h('ol', { class: 'lesson-steps' }, ...l.steps.map((s) => h('li', {},
      h('button', { class: 'chip small', type: 'button', title: '타이머 맞추기', onclick: () => setTimer(s.min) }, `${s.min}분`),
      h('span', {}, h('b', {}, `${s.phase} `), s.act)))),
    h('p', { class: 'small muted' }, h('b', {}, '교사 준비 '), l.prep.join(' / ')),
    h('p', { class: 'small' }, h('b', {}, '결과물 '), l.out))));
  $('#timerPresets').replaceChildren(...TIMER_PRESETS.map((m) => h('button', { class: 'chip', type: 'button', onclick: () => setTimer(m) }, `${m}분`)));
}
let timerLeft = 0, timerId = null;
function showTimer() {
  const m = Math.floor(timerLeft / 60), s = timerLeft % 60;
  const el = $('#timerDisplay');
  el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  el.classList.toggle('ending', timerLeft > 0 && timerLeft <= 30);
  el.classList.toggle('done', timerLeft === 0 && !timerId);
}
function setTimer(min) { stopTimer(); timerLeft = min * 60; showTimer(); document.querySelector('[data-tab="lesson"]').click(); }
function stopTimer() { clearInterval(timerId); timerId = null; $('#timerStart').textContent = '▶ 시작'; }
$('#timerStart').onclick = () => {
  if (timerId) { stopTimer(); return; }
  if (!timerLeft) { toast('시간을 먼저 골라요'); return; }
  $('#timerStart').textContent = '⏸ 멈춤';
  timerId = setInterval(() => { timerLeft = Math.max(0, timerLeft - 1); if (!timerLeft) { stopTimer(); toast('⏰ 시간이 다 됐어요!', 5000); } showTimer(); }, 1000);
};
$('#timerReset').onclick = () => { stopTimer(); timerLeft = 0; showTimer(); };
$('#timerFull').onclick = () => { const el = $('.timer-card'); (el.requestFullscreen ? el.requestFullscreen() : Promise.reject()).catch(() => toast('이 기기는 전체 화면을 지원하지 않아요')); };

// ---------- 설정 ----------
function shareLinks() {
  const mk = (page) => {
    const u = new URL(page, location.href);
    if (cfg.endpoint) u.searchParams.set('api', cfg.endpoint);
    if (cfg.classCode) u.searchParams.set('class', cfg.classCode);
    return u.toString();
  };
  $('#studentLink').textContent = `학생 앱: ${mk('../student/')}`;
  $('#studentLink').dataset.url = mk('../student/');
  $('#worldLinkCode').textContent = `메타버스: ${mk('../world/')}`;
  $('#worldLinkCode').dataset.url = mk('../world/');
  $('#openWorld').href = mk('../world/');
}
function renderSettings() {
  $('#cfgEndpoint').value = cfg.endpoint;
  $('#cfgClass').value = cfg.classCode;
  shareLinks();
}
$('#cfgSave').onclick = async () => {
  const endpoint = $('#cfgEndpoint').value.trim();
  if (endpoint && !isValidEndpoint(endpoint)) { $('#cfgResult').textContent = '⚠ https:// 로 시작하는 주소를 넣어 주세요'; return; }
  cfg = { endpoint, classCode: $('#cfgClass').value.trim() };
  saveConfig('teacher', cfg);
  api = createApi(cfg);
  shareLinks();
  if (!api.enabled) { $('#cfgResult').textContent = '📁 저장소 없이 파일 모드로 써요'; accountsAdmin.renderAdmin(); refresh(); return; }
  $('#cfgResult').textContent = '연결 시험 중…';
  try {
    await api.ping();
    $('#cfgResult').textContent = teacherKey ? '✅ 연결 성공!' : '✅ 연결 성공! 아래에서 관리자로 로그인해 주세요';
  } catch (e) { $('#cfgResult').textContent = `⚠ ${e.message}`; }
  accountsAdmin.renderAdmin();
  refresh();
};
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-copylink]');
  if (b) copyText($(`#${b.dataset.copylink}`).dataset.url, '🔗 주소를 복사했어요');
});
$('#clearLocal').onclick = () => {
  if (!confirm('이 기기에 넣은 파일 제출 데이터를 모두 지울까요? (저장소 데이터는 그대로예요)')) return;
  saveLocal([]); refresh(); toast('지웠어요');
};

// ---------- 월드 꾸미기 ----------
const worldAdmin = createWorldAdmin({ getApi: () => api, getKey: () => teacherKey });

// ---------- 계정 (관리자 로그인 · 학생 아이디) ----------
function setKey(k) { teacherKey = k || ''; try { if (teacherKey) localStorage.setItem(KEY_STORE, teacherKey); else localStorage.removeItem(KEY_STORE); } catch { /* 저장 불가 */ } }
const accountsAdmin = createAccountsAdmin({ getApi: () => api, getKey: () => teacherKey, setKey, onLogin: () => refresh() });

// ---------- 탭 ----------
document.querySelectorAll('[data-tab]').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    document.querySelectorAll('.tab-panel').forEach((p) => { p.hidden = p.id !== `tab-${b.dataset.tab}`; });
    if (b.dataset.tab === 'world') worldAdmin.render();
    if (b.dataset.tab === 'accounts') accountsAdmin.renderAccounts();
    if (b.dataset.tab === 'settings') accountsAdmin.renderAdmin();
  };
});
$('#refreshBtn').onclick = refresh;

renderLesson();
renderSettings();
accountsAdmin.renderAdmin();
showTimer();
if (!teacherKey && !localItems().length) document.querySelector('[data-tab="settings"]').click();
refresh();
setInterval(() => { if (!document.hidden && $('#detail').hidden && api.enabled && teacherKey) refresh(); }, 60000);
