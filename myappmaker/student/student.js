// [학생 앱] 주제 → 기획서 → 프롬프트 → 내 앱 → 입점
import { topicById, categoryById } from '../shared/topics.js';
import { recommend, surprise, ideaFromRec, EXAMPLE_CHIPS, checkCustomTopic, customRec, CUSTOM_LIMITS } from '../shared/recommend.js';
import { TOPICS } from '../shared/topics.js';
import {
  SECTIONS, PARTS, DIFFICULTY, topicView, planSafety, planWarnings, emptyPlan, normalizePlan, missingRequired, progress,
  buildAppPrompt, buildImagePrompts, imageSlots, buildAllPromptsText, buildFixPrompt, planRows,
  FIX_EXAMPLES, FIX_KEEP, fixCheck, fixSentence,
} from '../shared/plan.js';
import { createStore } from './store.js';
import { download, readFileText, safeName } from '../shared/files.js';
import { loadConfig, createApi } from '../shared/api.js';
import { connectGate } from '../shared/connect.js';
import { extractHtml, looksLikeApp, mountApp, isHttpUrl, codeProblems, onAppError, MAX_APP_BYTES } from '../shared/sandbox.js';
import { applyImages, findImagesBlock, imagesSize } from '../shared/images.js';
import { processPicture } from '../shared/picture.js';
import { avatarBuilder, avatarFromText } from '../shared/avatar.js';
import { presetById, presetUrl, cleanWorldSettings, MAP_PRESETS } from '../shared/worldart.js';
import { h, $, toast, copyText } from '../shared/ui.js';

const store = createStore();
const cfg = loadConfig('student');
const api = createApi(cfg);
connectGate('student', cfg);   // 연결 정보 없는 기기: 「우리 반에 연결하기」 먼저
// ---------- 로그인 (우리 반 저장소가 있으면 선생님이 만든 아이디로) ----------
const SESSION = 'myappmaker.student.session';
function loadSession() { try { const v = JSON.parse(localStorage.getItem(SESSION)); return v && v.token && v.loginId ? v : null; } catch { return null; } }
function saveSession(v) { try { if (v) localStorage.setItem(SESSION, JSON.stringify(v)); else localStorage.removeItem(SESSION); } catch { /* 저장 불가 */ } }
let session = api.enabled ? loadSession() : null;
if (session) store.useUser(session.loginId);
let plan = api.enabled && !session ? null : store.load();
let part = 1;
let lastQuery = '';
let lastResult = null;
let dirty = false;

// ---------- 저장 ----------
const statusEl = $('#saveStatus');
store.onStatus((s, detail) => {
  const map = { saving: ['저장 중…', ''], saved: ['✔ 저장 완료', 'ok'], fail: ['⚠ 저장 실패', 'bad'], idle: ['저장 준비', ''] };
  const [text, cls] = map[s] || map.idle;
  statusEl.textContent = s === 'saved' ? `${text} ${new Date(detail).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : text;
  statusEl.className = `pill ${cls}`;
  if (s === 'fail') toast(detail, 5000);
});
if (!store.available) store.save(emptyPlan());   // 상태만 "실패"로 알리기

let saveTimer = null;
function touch() {
  dirty = true;
  statusEl.textContent = '✏️ 쓰는 중';
  statusEl.className = 'pill warn';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 800);          // 입력이 멈추면 곧바로 임시 저장
}
function saveNow() {
  clearTimeout(saveTimer);
  if (!plan) return;
  store.save(plan);
  dirty = false;
  queueCloud();
  updateProgress();
  refreshTabDots();
}

// ---------- 우리 반 저장소에 자동 저장 (아이디로 로그인했을 때) ----------
const cloudEl = $('#cloudStatus');
let cloudDirty = false, cloudTimer = null, cloudBusy = false, expired = false;
const hhmm = (d = new Date()) => d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
function cloudPill(text, cls = '') { cloudEl.hidden = !session; cloudEl.textContent = text; cloudEl.className = `pill ${cls}`; }
function queueCloud() {
  if (!session || !plan) return;
  cloudDirty = true;
  if (expired) return;
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(cloudSave, 2500);
}
async function cloudSave() {
  clearTimeout(cloudTimer);
  if (!session || !plan || !cloudDirty || expired) return !cloudDirty;
  if (cloudBusy) { cloudTimer = setTimeout(cloudSave, 1500); return false; }
  cloudBusy = true; cloudDirty = false;
  cloudPill('☁️ 저장소에 저장 중…');
  try {
    await api.saveDraft(session.token, plan);
    cloudPill(`☁️ 저장소 저장 ${hhmm()}`, 'ok');
    return true;
  } catch (e) {
    cloudDirty = true;
    if (/로그인/.test(e.message)) {
      expired = true;
      cloudPill('⚠ 다시 로그인 (눌러요)', 'bad');
      toast('로그인 시간이 지났어요. 위의 「다시 로그인」을 누르면 이어서 저장돼요 (이 기기에는 저장돼 있어요)', 7000);
    } else {
      cloudPill('⚠ 저장소 저장 안 됨 · 이 기기엔 저장됨', 'bad');
      cloudTimer = setTimeout(cloudSave, 20000);
    }
    return false;
  } finally { cloudBusy = false; }
}
cloudEl.onclick = () => { if (expired) logout({ keepWork: true }); else cloudSave(); };

// 저장소의 내 작업과 이 기기의 작업 중 더 최근 것을 써요
function newer(a, b) { return String((a && a.updatedAt) || '') > String((b && b.updatedAt) || ''); }
async function syncFromCloud(local) {
  let srv = null;
  const r = await api.loadDraft(session.token);
  try { srv = r.plan ? normalizePlan(r.plan) : null; } catch { srv = null; }
  if (srv && (!local || newer(srv, local))) {
    plan = srv;
    store.save(plan, { keepTime: true });
    cloudPill(`☁️ 저장소에서 불러옴 ${hhmm()}`, 'ok');
    return true;
  }
  plan = local;
  if (plan) { cloudDirty = true; cloudSave(); } else cloudPill('☁️ 저장소 연결됨', 'ok');
  return false;
}

async function doLogin() {
  const id = $('#loginId').value.trim(), pin = $('#loginPin').value.trim();
  const msg = $('#loginMsg');
  if (!id || !pin) { msg.textContent = '아이디와 비밀번호를 모두 넣어요'; return; }
  const btn = $('#loginBtn');
  btn.disabled = true; msg.textContent = '들어가는 중…';
  try {
    const r = await api.studentLogin(id, pin);
    session = { loginId: r.loginId, token: r.token };
    saveSession(session);
    expired = false;
    store.useUser(session.loginId);
    const loaded = await syncFromCloud(store.load()).catch(() => { plan = store.load(); return false; });
    $('#loginPin').value = ''; msg.textContent = '';
    renderUser();
    toast(loaded ? `☁️ ${session.loginId} — 저장소에 있던 내 작업을 불러왔어요` : `👋 ${session.loginId}, 반가워요!`);
    go('home'); route();
  } catch (e) { msg.textContent = `⚠ ${e.message}`; }
  finally { btn.disabled = false; }
}
async function logout({ keepWork = false } = {}) {
  if (dirty) saveNow();
  if (!keepWork && cloudDirty && !expired) {
    const ok = await cloudSave();
    if (!ok && !confirm('저장소에 아직 저장되지 않았어요. 그래도 나갈까요? (이 기기에는 저장돼 있어요)')) return;
  }
  const id = session && session.loginId;
  session = null; saveSession(null); expired = false;
  if (!keepWork) { store.useUser(''); plan = null; }
  renderUser();
  if (keepWork && id) $('#loginId').value = id;
  go('home'); route();
}
function renderUser() {
  const b = $('#userBtn');
  b.hidden = !session;
  b.textContent = session ? `👤 ${session.loginId} · 나가기` : '';
  cloudEl.hidden = !session;
}
$('#userBtn').onclick = () => logout();
$('#loginBtn').onclick = doLogin;
$('#loginPin').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
$('#loginId').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#loginPin').focus(); });
setInterval(() => { if (dirty) saveNow(); }, 15000);   // 혹시 놓친 것도 15초마다
window.addEventListener('pagehide', () => { if (dirty) saveNow(); if (cloudDirty) cloudSave(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (dirty) saveNow(); if (cloudDirty) cloudSave(); } });

// ---------- 화면 이동 ----------
const SCREENS = ['home', 'topics', 'plan', 'prompts', 'myapp', 'submit'];
function go(name) { if (location.hash !== `#${name}`) location.hash = name; else route(); }
function route() {
  const needLogin = api.enabled && !session;
  $('#login').hidden = !needLogin;
  document.querySelector('.steps').hidden = needLogin;
  if (needLogin) {
    for (const s of SCREENS) $(`#${s}`).hidden = true;
    // 브라우저가 다른 사이트용으로 저장해 둔 아이디·비밀번호를 자동으로 채우면 지워요 (카드의 번호·숫자 4자리만)
    setTimeout(() => {
      if (!/^[A-Za-z0-9가-힣-]{1,20}$/.test($('#loginId').value) || /\s/.test($('#loginId').value)) $('#loginId').value = '';
      if (!/^\d{0,6}$/.test($('#loginPin').value)) $('#loginPin').value = '';
      $('#loginId').focus();
    }, 300);
    return;
  }
  let name = location.hash.slice(1) || 'home';
  if (!SCREENS.includes(name)) name = 'home';
  if (['plan', 'prompts', 'myapp', 'submit'].includes(name) && !(plan && plan.topicId)) {
    if (name !== 'topics') { toast('먼저 주제를 골라요 🎯'); name = 'topics'; history.replaceState(null, '', '#topics'); }
  }
  for (const s of SCREENS) $(`#${s}`).hidden = s !== name;
  const idx = SCREENS.indexOf(name);
  document.querySelectorAll('.steps a').forEach((a) => {
    const i = SCREENS.indexOf(a.dataset.step);
    a.classList.toggle('on', i === idx);
    a.classList.toggle('done', i < idx);
  });
  ({ home: renderHome, topics: renderTopics, plan: renderPlan, prompts: renderPrompts, myapp: renderMyApp, submit: renderSubmit })[name]();
  window.scrollTo({ top: 0 });
}
window.addEventListener('hashchange', route);
document.addEventListener('click', (e) => {
  const g = e.target.closest('[data-go]');
  if (g) { e.preventDefault(); if (dirty) saveNow(); go(g.dataset.go); }
});

// ---------- 첫 화면 ----------
function renderHome() {
  const has = plan && plan.topicId;
  $('#continueBtn').hidden = !has;
  $('#startBtn').textContent = has ? '🎯 다른 주제 추천받기' : '🚀 시작하기';
  const t = has ? topicView(plan) : null;
  $('#resumeInfo').textContent = has
    ? `${t.emoji} ${plan.f.appName || t.name} — 기획서 ${progress(plan)}% · 마지막 저장 ${new Date(plan.updatedAt).toLocaleString('ko-KR')}`
    : '';
  $('#classInfo').textContent = api.enabled ? `🏫 우리 반 저장소에 연결됨 (반 코드 ${cfg.classCode})` : '';
  $('#saveNote').replaceChildren(...(session
    ? ['쓰는 내용은 ', h('b', {}, `내 아이디(${session.loginId})로 우리 반 저장소`), '에 자동 저장돼요. 다른 노트북에서도 같은 아이디로 들어오면 그대로 이어서 할 수 있어요. 다 쓰면 오른쪽 위 「나가기」를 눌러요.']
    : ['쓰는 내용은 ', h('b', {}, '이 기기의 이 브라우저'), '에 자동 저장돼요. 다른 기기에서 이어 하거나 브라우저 기록을 지우면 사라질 수 있으니, 기획서 화면의 ', h('b', {}, '「백업 내려받기」'), '로 파일을 꼭 챙겨 두세요.']));
}
$('#startBtn').onclick = () => go('topics');
$('#continueBtn').onclick = () => go(plan.app.html || plan.app.url ? 'myapp' : 'plan');

// ---------- 1. 주제 추천 ----------
function renderTopics() {
  $('#wish').value = lastQuery;
  $('#exampleChips').replaceChildren(...EXAMPLE_CHIPS.map((c) => chip(c, false, () => {
    const word = c.split(' ').slice(1).join(' ');
    const w = $('#wish');
    w.value = w.value.trim() ? `${w.value.trim()} ${word}` : word;
    w.focus();
  })));
  renderRecs();
}

function ask() {
  lastQuery = $('#wish').value.trim();
  if (!lastQuery) { toast('좋아하는 것을 한 가지라도 써 볼까요? 예) 공룡, 요리, 달리기'); $('#wish').focus(); return; }
  lastResult = recommend(lastQuery);
  renderRecs();
}
$('#askBtn').onclick = ask;
$('#wish').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } });
$('#surpriseBtn').onclick = () => {
  lastResult = { notices: [{ kind: 'empty', text: '🎲 이런 주제는 어때요? 마음에 드는 게 없으면 다시 눌러 봐요.' }], recs: surprise(6) };
  renderRecs();
};

function renderRecs() {
  const r = lastResult;
  const notices = r ? [...r.notices] : [];
  if (r && !r.recs.length && !r.notices.some((n) => n.kind === 'blocked')) {
    notices.push({ kind: 'empty', text: '🤔 어떤 게임인지 조금 더 알려 줄래요? 좋아하는 동물·장소·놀이를 넣어 보세요. (예: 바다, 로봇, 요리, 달리기)' });
  }
  $('#notices').replaceChildren(...notices.map((n) => h('div', { class: `notice-item ${n.kind}`, role: 'status' }, n.text)));
  $('#recGrid').replaceChildren(...(r ? r.recs : []).map((rec) => {
    const base = topicById(rec.base);
    const c = categoryById(base.cat);
    return h('button', { class: `topic-card${plan && plan.idea && plan.idea.id === rec.id ? ' selected' : ''}`, type: 'button', 'data-rec': rec.id, onclick: () => openPreview(rec) },
      h('span', { class: 'emo', 'aria-hidden': 'true' }, rec.emoji),
      h('span', { class: 'cat', style: `background:${c.color}` }, `${c.name} · ${base.name} 방식`),
      h('span', { class: 'name' }, rec.title),
      h('span', { class: 'sum' }, rec.summary),
      h('span', { class: 'learn' }, `📚 ${rec.curr} · ${rec.learn}`));
  }));
}

// ---------- 1-2. 나만의 주제 직접 쓰기 (추천에 없는 주제) ----------
// 이미 있는 게임·우리 반 앱과 겹치는 것, 폭력·무서운 것(귀신·괴물·좀비)·혐오·정치·이념·인터넷 윤리에 어긋나는 것은 걸러요.
$('#cBase').replaceChildren(h('option', { value: '' }, '— 노는 방식을 골라요 —'),
  ...TOPICS.map((t) => h('option', { value: t.id }, `${t.emoji} ${t.name} — ${t.summary}`)));
$('#cTitle').maxLength = CUSTOM_LIMITS.title;
$('#cSummary').maxLength = CUSTOM_LIMITS.summary;
$('#cLearn').maxLength = CUSTOM_LIMITS.learn;
$('#cBase').onchange = () => {
  const t = topicById($('#cBase').value);
  $('#cLearn').placeholder = t ? `예) ${t.learn}` : '예) 방향 읽기, 덧셈, 분리배출 방법';
};
function openCustom(idea) {
  const box = $('#customBox');
  box.open = true;
  if (idea && idea.themeId === 'custom') {
    $('#cTitle').value = idea.title; $('#cSummary').value = idea.summary; $('#cLearn').value = idea.learn;
    $('#cBase').value = plan.topicId || '';
  }
}
$('#customBox').addEventListener('toggle', () => { if ($('#customBox').open) $('#cTitle').focus({ preventScroll: true }); });

let appNamesCache = null;
async function classAppNames() {
  if (!api.enabled) return [];
  if (appNamesCache) return appNamesCache;
  try {
    const w = await api.world();
    appNamesCache = [...(w.items || []).map((x) => x.appName), ...(w.teacherApp ? [w.teacherApp.title] : [])].filter(Boolean);
  } catch { return []; }   // 저장소에 닿지 않으면 이미 있는 게임 이름만 확인
  return appNamesCache;
}

$('#customBtn').onclick = async () => {
  const input = { title: $('#cTitle').value, summary: $('#cSummary').value, learn: $('#cLearn').value, base: $('#cBase').value };
  const btn = $('#customBtn');
  btn.disabled = true;
  const names = await classAppNames();
  btn.disabled = false;
  const r = checkCustomTopic(input, names);
  $('#customNotes').replaceChildren(...r.problems.map((p) => h('div', { class: `notice-item ${p.kind === 'empty' ? 'empty' : 'blocked'}`, role: 'status' }, p.text)));
  if (!r.ok) { toast('🔎 확인할 것이 있어요. 아래 안내를 보고 고쳐 주세요', 3500); return; }
  lastQuery = input.title;
  chooseIdea(customRec(input));
};

// 말로 하기 (브라우저가 지원할 때만)
const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Speech) {
  const mic = $('#micBtn');
  mic.hidden = false;
  let rec = null;
  mic.onclick = () => {
    if (rec) { rec.stop(); return; }
    rec = new Speech();
    rec.lang = 'ko-KR';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const said = Array.from(e.results).map((x) => x[0].transcript).join(' ');
      const w = $('#wish');
      w.value = `${w.value.trim()} ${said}`.trim();
    };
    rec.onerror = () => toast('잘 듣지 못했어요. 글로 써 줄래요?');
    rec.onend = () => { rec = null; mic.classList.remove('on'); if ($('#wish').value.trim()) ask(); };
    mic.classList.add('on');
    rec.start();
  };
}

function chip(label, on, onclick) {
  return h('button', { type: 'button', class: 'chip', 'aria-pressed': String(!!on), onclick }, label);
}

function phone(label, [emo, txt, btn], c) {
  return h('div', { class: 'phone', style: `--c1:${c}22;--c2:${c}55` },
    h('span', { class: 'lbl' }, label),
    h('span', { class: 'big-emo', 'aria-hidden': 'true' }, emo),
    h('span', { class: 'txt' }, `${txt}  ${btn}`));
}

function openPreview(rec) {
  const t = topicById(rec.base);
  const c = categoryById(t.cat);
  $('#previewBody').replaceChildren(
    h('div', { class: 'pv-head' },
      h('span', { class: 'emo', 'aria-hidden': 'true' }, rec.emoji),
      h('div', {}, h('span', { class: 'pill', style: `background:${c.color};color:#fff` }, `${c.emoji} ${c.name} · ${t.name} 방식`), h('h2', { id: 'pvTitle' }, rec.title))),
    h('p', {}, rec.summary),
    h('div', { class: 'learn-box' }, `📚 교과 연계: ${rec.curr} · ${rec.learn}`),
    h('div', { class: 'pv-sec' }, h('h4', {}, `🕹️ 이런 방식으로 놀아요 (${t.name} 방식)`), h('ol', { class: 'pv-steps' }, ...t.steps.map((s) => h('li', {}, s)))),
    h('div', { class: 'pv-sec' }, h('h4', {}, '🧩 넣을 수 있는 게임 요소'), h('div', { class: 'chips' }, ...t.elements.map((e) => h('span', { class: 'pill' }, e)))),
    h('div', { class: 'pv-sec' }, h('h4', {}, '📱 예상 화면'),
      h('div', { class: 'phones' }, phone('시작 화면', [rec.emoji, rec.title, '▶ 시작'], c.color), phone('게임 화면', [rec.themeEmoji || t.screens.play[0], ...t.screens.play.slice(1)], c.color), phone('결과 화면', t.screens.end, c.color)),
      h('p', { class: 'example-note' }, '※ 실제 게임 화면이 아니라 구성 예시예요. 규칙과 모습은 내 기획서대로 바꿔요!')),
    h('div', { class: 'row' },
      h('button', { class: 'primary big grow', id: 'chooseTopic', onclick: () => chooseIdea(rec) }, '✨ 이 주제로 기획 시작하기'),
      h('button', { class: 'ghost', onclick: closePreview }, '다른 추천 보기')),
  );
  $('#preview').hidden = false;
  $('#previewBody').scrollTop = 0;
  $('#chooseTopic').focus({ preventScroll: true });
}
function closePreview() { $('#preview').hidden = true; }
$('#preview').addEventListener('click', (e) => { if (e.target.id === 'preview') closePreview(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#preview').hidden) closePreview(); });

function chooseIdea(rec) {
  if (plan && plan.idea && plan.idea.id !== rec.id && progress(plan) > 0) {
    if (!confirm(`주제를 「${rec.title}」(으)로 바꿀까요?\n지금까지 쓴 기획서 내용은 그대로 남아요.`)) return;
  }
  if (!plan) plan = emptyPlan(rec.base);
  plan.topicId = rec.base;
  plan.idea = ideaFromRec(rec, lastQuery);
  if (!plan.f.learnGoal.trim()) plan.f.learnGoal = `${rec.curr} · ${rec.learn}`;   // 배울 내용 미리 채우기 (고쳐도 됨)
  saveNow();
  closePreview();
  part = 1;
  go('plan');
}

// ---------- 2. 기획서 ----------
function partDone(p) {
  const miss = new Set(missingRequired(plan).map((m) => m.n));
  return SECTIONS.filter((s) => s.part === p && s.req).every((s) => !miss.has(s.n));
}

function renderPlan() {
  const t = topicView(plan);
  const c = categoryById(t.cat);
  $('#planTopic').replaceChildren(
    h('span', { class: 'emo', 'aria-hidden': 'true' }, t.emoji),
    h('div', { class: 'grow' }, h('b', {}, t.name), h('div', { class: 'muted small' }, `${t.summary}`), h('div', { class: 'small learn-inline' }, `📚 ${t.curr} · ${t.learn} · ${t.baseName} 방식`)),
    h('button', { class: 'ghost small', onclick: () => go('topics') }, '주제 바꾸기'));
  $('#partTabs').replaceChildren(...PARTS.filter((p) => p.id <= 4).map((p) => h('button', {
    class: 'tab', role: 'tab', type: 'button', 'aria-selected': String(p.id === part),
    onclick: () => { part = p.id; renderPlan(); },
  }, h('span', { class: `dot${partDone(p.id) ? ' ok' : ''}`, 'aria-hidden': 'true' }), ` ${p.title}`)));
  renderForm($('#planForm'), part, t);
  $('#prevPart').hidden = part === 1;
  $('#nextPart').textContent = part === 4 ? '3. 프롬프트 받기 ▶' : '다음 ▶';
  updateProgress();
}
$('#prevPart').onclick = () => { part = Math.max(1, part - 1); renderPlan(); window.scrollTo({ top: 0 }); };
$('#nextPart').onclick = () => {
  saveNow();
  if (part === 4) { go('prompts'); return; }
  part += 1; renderPlan(); window.scrollTo({ top: 0 });
};

function renderForm(form, p, t) {
  const secs = SECTIONS.filter((s) => s.part === p);
  const nodes = secs.map((s) => h('div', { class: 'sec', 'data-sec': s.n },
    h('h3', {}, h('span', { class: 'num' }, String(s.n)), s.title, s.req ? h('span', { class: 'req' }, '★ 꼭 쓰기') : ''),
    ...s.inputs.map((i) => inputFor(i, t)),
    s.n === 13 ? difficultyPicker() : ''));
  form.replaceChildren(...nodes);
}

function inputFor(i, t) {
  const v = plan.f[i.key];
  if (i.type === 'chips') {
    const opts = i.options;
    return h('div', { class: 'field' }, h('span', { class: 'small muted' }, i.label),
      h('div', { class: 'chips', role: 'group', 'aria-label': i.label, 'data-key': i.key }, ...opts.map((o) => {
        const on = i.multi ? v.includes(o) : v === o;
        return h('button', { type: 'button', class: 'chip', 'aria-pressed': String(on), onclick: (e) => {
          if (i.multi && !on && i.max && v.length >= i.max) { toast(`${i.max}개까지만 골라요. 다른 것을 빼고 골라 주세요 🙂`); return; }
          if (i.multi) plan.f[i.key] = on ? v.filter((x) => x !== o) : [...v, o];
          else plan.f[i.key] = on ? '' : o;
          touch();
          const box = e.target.closest('.field');
          box.replaceWith(inputFor(i, t));
        } }, o);
      })));
  }
  const attrs = { 'data-key': i.key, placeholder: i.ph ? i.ph(t) : '', maxlength: i.max || 2000, oninput: (e) => { plan.f[i.key] = e.target.value; touch(); } };
  const el = i.type === 'area' ? h('textarea', { ...attrs, rows: 3 }) : h('input', { ...attrs, type: 'text' });
  el.value = v;
  return h('label', { class: 'field' }, h('span', {}, i.label), el);
}

function difficultyPicker() {
  return h('div', { class: 'field' }, h('span', { class: 'small muted' }, '앱 난이도 (AI에게 얼마나 크게 만들어 달라고 할까요?)'),
    h('div', { class: 'diff', role: 'group' }, ...DIFFICULTY.map((d) => h('button', {
      type: 'button', 'aria-pressed': String(plan.difficulty === d.id), 'data-diff': d.id,
      onclick: () => { plan.difficulty = d.id; touch(); renderPlan(); },
    }, d.label, h('small', {}, d.desc)))));
}

function refreshTabDots() {
  if (!plan || !plan.topicId || $('#plan').hidden) return;
  document.querySelectorAll('#partTabs .tab').forEach((tab, i) => tab.querySelector('.dot').classList.toggle('ok', partDone(i + 1)));
}

function updateProgress() {
  if (!plan) return;
  const p = progress(plan);
  $('#progressBar').style.width = `${p}%`;
  $('#progressText').textContent = `${p}%`;
}

// 저장 도구
$('#saveBtn').onclick = () => { saveNow(); if (store.status === 'saved') toast('💾 저장했어요'); };
$('#exportBtn').onclick = () => {
  saveNow();
  download(`기획서_${safeName(plan.f.developer)}_${safeName(plan.f.appName || topicView(plan).name)}.json`, JSON.stringify(plan, null, 2));
  toast('⬇️ 백업 파일을 내려받았어요');
};
$('#importFile').onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const next = normalizePlan(JSON.parse(await readFileText(file)));
    if (plan && progress(plan) > 0 && !confirm('지금 기획서를 불러온 파일로 바꿀까요?\n(지금 내용은 "이전 기획서"로 보관돼요)')) return;
    if (plan) store.archiveAndClear(plan);
    plan = next;
    saveNow();
    toast('⬆️ 기획서를 불러왔어요');
    part = 1;
    go(plan.topicId ? 'plan' : 'topics');
  } catch (err) { toast(`불러오지 못했어요: ${err.message}`, 4000); }
};
$('#newBtn').onclick = startNew;
$('#newTopicBtn').onclick = startNew;
function startNew() {
  if (plan && progress(plan) > 0 && !confirm('새 기획서를 시작할까요?\n지금 기획서는 이 기기에 "이전 기획서"로 보관되지만, 백업 파일을 먼저 내려받아 두면 더 안전해요.')) return;
  store.archiveAndClear(plan);
  plan = null;
  part = 1;
  go('topics');
}

// 인쇄·PDF
$('#printBtn').onclick = () => { saveNow(); printPlan(); };
function printPlan() {
  const t = topicView(plan);
  const rows = planRows(plan);
  $('#printArea').replaceChildren(h('div', { class: 'print-sheet' },
    h('h1', {}, `📱 ${plan.f.appName || t.name} — 앱 기획서`),
    h('p', {}, `개발자: ${plan.f.developer || '         '}  · MY APP MAKER · ${new Date().toLocaleDateString('ko-KR')}`),
    h('table', {}, h('tbody', {}, ...rows.map((r) => h('tr', {}, h('th', {}, r.n && r.n <= 15 ? `${r.n}. ${r.title}` : r.title), h('td', {}, r.value || ' ')))))));
  window.print();
}

// ---------- 3. 프롬프트 ----------
function renderPrompts() {
  loadWorldPreset();
  const miss = missingRequired(plan);
  const box = $('#missingBox');
  box.hidden = miss.length === 0;
  box.replaceChildren(h('b', {}, '✏️ 아직 비어 있는 ★ 항목이 있어요. 채울수록 AI가 내 생각에 딱 맞게 만들어요: '),
    ...miss.map((m) => h('button', { class: 'chip', type: 'button', onclick: () => { part = m.n === 0 ? 1 : SECTIONS.find((s) => s.n === m.n).part; go(m.n === 0 ? 'topics' : 'plan'); } }, m.title)));
  const issues = planSafety(plan);
  const warns = planWarnings(plan);
  const sbox = $('#safetyBox');
  sbox.hidden = issues.length + warns.length === 0;
  sbox.className = `card ${issues.length ? 'bad-box' : 'warn-box'}`;
  sbox.replaceChildren(
    issues.length ? h('b', {}, '🚫 개인정보, 초등학생 게임에 알맞지 않은 말, 이미 있는 게임·캐릭터 이름이 있어요. 고친 뒤에 프롬프트를 복사할 수 있어요.') : '',
    ...warns.map((w) => h('p', {}, `🔒 ${w.n}번 ${w.label}: ${w.text} `, h('button', { class: 'chip small', type: 'button', onclick: () => { part = 1; go('plan'); } }, '고치러 가기'))),
    h('ul', {}, ...issues.map((it) => h('li', {}, `${where(it)}: 「${it.words.join('」, 「')}」 `,
      h('button', { class: 'chip small', type: 'button', onclick: () => goFix(it) }, '고치러 가기')))));
  $('#appPrompt').textContent = buildAppPrompt(plan);
  renderRefTips();
  $('#imagePrompts').replaceChildren(...imagePrompts().map((p) => h('div', { class: 'img-prompt' },
    h('div', { class: 'row' }, h('b', { class: 'grow' }, p.title), h('button', { class: 'small', type: 'button', onclick: () => safeCopy(p.text, '📋 복사했어요') }, '📋 복사')),
    h('p', { class: 'small' }, p.text))));
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  if (b.dataset.copy === 'app') safeCopy(buildAppPrompt(plan), '📋 앱 제작 프롬프트를 복사했어요');
  if (b.dataset.copy === 'fix') copyFix();
});
$('#copyAll').onclick = () => safeCopy(buildAllPromptsText(plan), '📋 프롬프트 전체를 복사했어요');

// 문제 위치 글 (n: 0 은 직접 쓴 주제)
const where = (it) => (it.n ? `${it.n}번 ${it.label}` : '1. 주제(직접 쓴 주제)');
function goFix(it) {
  if (!it.n) { openCustom(plan.idea); go('topics'); return; }
  part = SECTIONS.find((x) => x.n === it.n).part; go('plan');
}

// 기획서에 알맞지 않은 말이 있으면 복사하지 않음
function safeCopy(text, done) {
  const issues = planSafety(plan);
  if (issues.length) { toast(`🚫 ${where(issues[0])}에 바꿔야 할 말(「${issues[0].words[0]}」)이 있어요`, 4500); go('prompts'); return; }
  copyText(text, done);
}

// ---------- 4. 내 앱 ----------
const TEST_ITEMS = SECTIONS.find((s) => s.n === 14).inputs[0].options;
function renderMyApp() {
  $('#appCode').value = plan.app.html || '';
  $('#appUrl').value = plan.app.url || '';
  renderAppInfo();
  if (plan.app.html || plan.app.url) runApp();
  else $('#appFrame').srcdoc = '<p style="font-family:sans-serif;color:#888;text-align:center;margin-top:40%">코드를 붙여 넣고 ▶ 실행해 보기를 눌러요</p>';
  renderChecks();
  renderFix();
  renderPictures();
}
function renderAppInfo() {
  const n = (plan.app.html || '').length;
  $('#appInfo').textContent = n ? `코드 ${n.toLocaleString()}자 저장됨${plan.app.updatedAt ? ` · ${new Date(plan.app.updatedAt).toLocaleTimeString('ko-KR')}` : ''}` : (plan.app.url ? '공유 주소로 저장됨' : '');
}
function renderChecks() {
  const checked = plan.app.checks || [];
  const want = plan.f.tests.length ? plan.f.tests : TEST_ITEMS;
  $('#testChecks').replaceChildren(...want.map((o) => chip(`${checked.includes(o) ? '✅' : '⬜'} ${o}`, checked.includes(o), () => {
    plan.app.checks = checked.includes(o) ? checked.filter((x) => x !== o) : [...checked, o];
    touch(); renderChecks();
  })));
}
// ---------- 🔧 내 앱 고치기: 지금은 ○○인데, △△가 되면 좋겠어. □□는 그대로 둬. ----------
let fixKeep = [];
function renderFix() {
  const p = $('#fixProblem').value;
  const w = $('#fixWant').value;
  $('#fixExamples').replaceChildren(...FIX_EXAMPLES.map((x) => chip(`${x.emoji} ${x.problem}`, p === x.problem, () => {
    $('#fixProblem').value = x.problem; $('#fixWant').value = x.want; renderFix();
  })));
  $('#fixKeep').replaceChildren(...FIX_KEEP.map((k) => chip(`${fixKeep.includes(k) ? '🔒' : '⬜'} ${k}`, fixKeep.includes(k), () => {
    fixKeep = fixKeep.includes(k) ? fixKeep.filter((x) => x !== k) : [...fixKeep, k]; renderFix();
  })));
  $('#fixSentence').textContent = `🗣️ ${fixSentence(p, w, fixKeep)}`;
  const c = fixCheck(p, w);
  const hint = $('#fixHint');
  if (c.privacy.length) hint.replaceChildren(h('p', { class: 'fix-hint-bad' }, `🔒 개인정보(${c.privacy.join(', ')})는 쓰지 않아요. 지워 주세요.`));
  else if (c.blocked.length) hint.replaceChildren(h('p', { class: 'fix-hint-bad' }, `🚫 「${c.blocked.join('」, 「')}」 말은 바꿔서 써 줘요.`));
  else if (p.trim() && c.many) hint.replaceChildren(h('p', { class: 'fix-hint-warn' }, '✋ 고칠 것이 두 가지 이상인 것 같아요. 가장 먼저 고칠 것 하나만 남기고, 나머지는 다음에 고쳐요.'));
  else hint.replaceChildren();
  $('#fixPrompt').textContent = buildFixPrompt(plan, p, w, fixKeep);
  renderFixTeacher();
  renderFixLog();
}
$('#fixProblem').oninput = renderFix;
$('#fixWant').oninput = renderFix;

function copyFix() {
  const p = $('#fixProblem').value.trim();
  const w = $('#fixWant').value.trim();
  const c = fixCheck(p, w);
  if (c.empty) { toast(c.empty === 'problem' ? '① 지금 어떤 문제가 있는지 먼저 써 줘요' : '② 어떻게 되면 좋겠는지 써 줘요', 3500); $(c.empty === 'problem' ? '#fixProblem' : '#fixWant').focus(); return; }
  if (c.privacy.length) { toast('🔒 개인정보는 쓰지 않아요. 지운 뒤에 복사할 수 있어요', 4500); return; }
  if (c.blocked.length) { toast('🚫 고쳐 줘 내용에 알맞지 않은 말이나 이미 있는 게임 이름이 있어요. 바꿔서 써 줘요', 4500); return; }
  const fixes = plan.app.fixes || (plan.app.fixes = []);
  const last = fixes[fixes.length - 1];
  if (!(last && last.problem === p && last.want === w && !last.result)) fixes.push({ problem: p, want: w, keep: [...fixKeep], at: new Date().toISOString(), result: '' });
  plan.app.fixes = fixes.slice(-20);
  touch(); renderFixLog();
  safeCopy($('#fixPrompt').textContent, c.many ? '📋 복사했어요. 다음엔 한 가지씩 고쳐 봐요' : '📋 고쳐 줘 프롬프트를 복사했어요');
}
function markFix(result) {
  const fixes = plan.app.fixes || [];
  const last = fixes[fixes.length - 1];
  if (!last) { toast('먼저 고쳐 줘 프롬프트를 복사해서 AI에게 부탁해 봐요'); return; }
  last.result = result;
  if (result === 'good') {
    const note = `${last.problem} → ${last.want}`;
    if (!plan.f.reviewFix.includes(note)) plan.f.reviewFix = `${plan.f.reviewFix.trim() ? `${plan.f.reviewFix.trim()}\n` : ''}• ${note}`.slice(0, 2000);
    $('#fixProblem').value = ''; $('#fixWant').value = ''; fixKeep = [];
    toast('🎉 잘했어요! 고친 점은 「완성 후 돌아보기」에 적어 뒀어요. 또 고칠 게 있으면 하나 더!', 4500);
  } else {
    toast('🔁 문제를 더 자세히 써 봐요. 예) 어느 화면에서, 무엇을 눌렀을 때, 어떻게 되는지', 5000);
    $('#fixProblem').focus();
  }
  touch(); renderFix();
}
$('#fixGood').onclick = () => markFix('good');
$('#fixAgain').onclick = () => markFix('again');
function renderFixLog() {
  const fixes = (plan.app.fixes || []).slice(-5).reverse();
  const mark = { good: '✅', again: '🔁', '': '⏳' };
  $('#fixLog').replaceChildren(...(fixes.length ? [h('b', {}, '📒 고친 기록'), h('ul', { class: 'fix-log' },
    ...fixes.map((x) => h('li', {}, `${mark[x.result] || '⏳'} ${x.problem} → ${x.want}`)))] : []));
}
// 선생님이 「수정 요청」하며 남긴 말을 고쳐 줘 칸으로 가져오기
function renderFixTeacher() {
  const s = plan.submit || {};
  const box = $('#fixFromTeacher');
  if (s.status !== 'needs_fix' || !s.feedback) { box.replaceChildren(); return; }
  box.replaceChildren(h('p', { class: 'small warn-box fix-rule' }, `💬 선생님 말씀: ${s.feedback} `,
    h('button', { class: 'chip small', type: 'button', onclick: () => useTeacherFeedback() }, '🔧 이 말씀으로 고치기')));
}
function useTeacherFeedback() {
  const fb = String((plan.submit || {}).feedback || '').trim();
  if (!fb) return;
  $('#fixProblem').value = fb.slice(0, 80);
  $('#fixWant').value = '';
  renderFix();
  $('#fixWant').focus();
  toast('② 어떻게 되면 좋겠는지 내 말로 써 줘요', 3500);
}

function setAppHtml(raw) {
  const html = extractHtml(raw);
  if (!html) { toast('붙여 넣은 코드가 없어요'); return false; }
  if (html.length > MAX_APP_BYTES) { toast(`코드가 너무 길어요 (${MAX_APP_BYTES.toLocaleString()}자까지)`, 4000); return false; }
  if (!looksLikeApp(html)) { toast('HTML 코드가 아닌 것 같아요. AI가 준 코드 블록 전체를 복사했는지 확인해요', 4500); return false; }
  plan.app.html = html;
  plan.app.updatedAt = new Date().toISOString();
  $('#appCode').value = html;
  saveNow();
  runApp();
  renderAppInfo();
  renderPictures();
  return true;
}
// 앱 코드(원본) + 내 그림 = 실제로 실행·제출되는 앱
const appliedHtml = () => applyImages(plan.app.html || '', plan.app.images);
function runApp() {
  showAppAlert();
  if (plan.app.html) mountApp($('#appFrame'), { html: appliedHtml() });
  else if (plan.app.url) mountApp($('#appFrame'), { url: plan.app.url });
}

// 실행이 안 될 때 이유를 알려 주기: ① 코드가 중간에 끊김 ② 실행 중 오류
const CUT_PROMPT = '코드가 중간에 끊겨서 실행이 안 돼. 앞에서 만든 게임 그대로, 처음 <!DOCTYPE html> 부터 마지막 </html> 까지 HTML 코드 전체를 코드 블록 하나로 다시 보여 줘. 중간을 줄이거나 "…"로 빼지 마.';
let appErrors = [];
function showAppAlert(err) {
  if (err) { if (appErrors.length < 3 && !appErrors.some((x) => x.message === err.message)) appErrors.push(err); }
  else appErrors = [];
  const box = $('#appAlert');
  const cut = plan.app.html && codeProblems(plan.app.html).includes('cut');
  const parts = [];
  if (cut) parts.push(h('div', { class: 'warn-box small' },
    h('b', {}, '✂️ 코드가 끝까지 안 들어왔어요. '), 'AI 답이 중간에 끊긴 것 같아요(맨 끝 </html> 이 없어요). AI에게 코드 전체를 다시 달라고 해요. ',
    h('button', { class: 'chip small', type: 'button', onclick: () => copyText(CUT_PROMPT, '📋 복사했어요. AI에게 붙여 넣고, 새 코드를 통째로 다시 붙여 넣어요') }, '📋 「끝까지 다시 써 줘」 복사')));
  if (appErrors.length) {
    const e = appErrors[0];
    parts.push(h('div', { class: 'warn-box small' },
      h('b', {}, '⚠ 앱 코드에 오류가 있어요. '), `${e.line ? `${e.line}번째 줄: ` : ''}${e.message} `,
      h('button', { class: 'chip small', type: 'button', onclick: () => askFixError(e) }, '🔧 이 오류 고쳐 달라고 하기')));
  }
  box.replaceChildren(...parts);
}
function askFixError(e) {
  const msg = String(e.message || '').replace(/[.!?]+/g, ' ').replace(/\s+/g, ' ').trim();
  $('#fixProblem').value = `실행하면 오류가 나요: ${msg}`.slice(0, 80);
  $('#fixWant').value = '오류 없이 시작 화면부터 끝까지 잘 실행되면 좋겠어요';
  renderFix();
  $('#fixProblem').scrollIntoView({ behavior: 'smooth', block: 'center' });
}
onAppError($('#appFrame'), (e) => showAppAlert(e));

function renderPictures() {
  renderRefTips();
  const slots = imageSlots(plan);
  const prompts = Object.fromEntries(imagePrompts().map((p) => [p.key, p.text]));
  loadWorldPreset();
  const imgs = plan.app.images || {};
  const block = plan.app.html ? findImagesBlock(plan.app.html) : null;
  const st = $('#picStatus');
  if (!plan.app.html) st.replaceChildren(h('span', { class: 'muted' }, '먼저 ① 에 AI가 만든 앱 코드를 넣으면 그림이 게임에 들어가요. (그림은 미리 올려 둬도 돼요)'));
  else if (!block) {
    st.replaceChildren(h('div', { class: 'pic-warn' }, '🔎 앱 코드에 그림 자리(IMAGES)가 없어요. AI에게 그림 자리를 만들어 달라고 해요. ',
      h('button', { class: 'chip small', type: 'button', onclick: askForImageSlots }, '🔧 고쳐 줘 프롬프트 만들기')));
  } else {
    const missing = slots.filter((x) => imgs[x.key] && !block.keys.includes(x.key)).map((x) => x.what);
    st.replaceChildren(h('span', {}, '✅ 앱 코드에서 그림 자리를 찾았어요. ', missing.length ? h('span', { class: 'muted' }, `(${missing.join(', ')} 자리는 코드에 없어서 새로 만들어 넣었어요. 게임에 안 보이면 「고쳐 줘」로 부탁해요)`) : ''));
  }
  $('#picSlots').replaceChildren(...slots.map((sl) => {
    const has = imgs[sl.key];
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true, id: `pic-${sl.key}`, 'data-slot': sl.key });
    const clear = sl.clear ? h('input', { type: 'checkbox', checked: true, id: `clear-${sl.key}` }) : null;
    file.onchange = async (e) => {
      const f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      toast('🪄 그림을 다듬는 중…');
      try {
        const r = await processPicture(f, sl, { clearWhite: clear ? clear.checked : false });
        plan.app.images = { ...(plan.app.images || {}), [sl.key]: r.dataUrl };
        if (plan.app.html && appliedHtml().length > MAX_APP_BYTES) {
          delete plan.app.images[sl.key];
          toast('앱이 너무 커져서 이 그림을 넣지 못했어요. 다른 그림을 빼거나 더 단순한 그림으로 해 봐요', 5000);
          return;
        }
        plan.app.updatedAt = new Date().toISOString();
        saveNow();
        runApp();
        renderPictures();
        toast(sl.clear && r.cleared > 0.05 ? `✨ ${sl.what} 그림을 넣었어요 (하얀 배경을 지웠어요)` : `✨ ${sl.what} 그림을 넣었어요`);
      } catch (err) { toast(err.message, 4500); }
    };
    return h('div', { class: `pic-slot${has ? ' done' : ''}`, 'data-pic': sl.key },
      h('b', {}, sl.title, h('span', { class: 'muted small' }, ` ${sl.ratio}`)),
      h('div', { class: 'pic-thumb' }, has ? h('img', { src: has, alt: `${sl.what} 그림` }) : '🖼️'),
      h('div', { class: 'row' },
        h('button', { type: 'button', onclick: () => safeCopy(prompts[sl.key], `📋 ${sl.what} 그림 프롬프트를 복사했어요`) }, '📋 프롬프트'),
        h('label', { class: 'btn primary', for: `pic-${sl.key}` }, has ? '🔁 바꾸기' : '📷 그림 올리기'), file,
        has ? h('button', { type: 'button', class: 'ghost', 'aria-label': `${sl.what} 그림 빼기`, onclick: () => {
          const next = { ...plan.app.images }; delete next[sl.key];
          plan.app.images = next; saveNow(); runApp(); renderPictures();
        } }, '✕') : ''),
      clear ? h('label', { class: 'pic-clear' }, clear, '하얀 배경 지우기') : '');
  }));
  const total = (plan.app.html ? appliedHtml() : '').length || imagesSize(imgs);
  $('#picBudget').textContent = Object.keys(imgs).length
    ? `그림 ${Object.keys(imgs).length}장 · 앱 크기 ${Math.round(total / 1000)}KB / ${Math.round(MAX_APP_BYTES / 1000)}KB`
    : '';
}

function askForImageSlots() {
  const keys = imageSlots(plan).map((x) => `${x.key}: ''`).join(', ');
  $('#fixProblem').value = '내가 만든 그림을 넣을 그림 자리가 코드에 없어요';
  $('#fixWant').value = `<script> 맨 위에 const IMAGES = { ${keys} }; 를 만들고, 값(그림 주소)이 있으면 그 그림을 쓰고 비어 있으면 지금처럼 그려 줘`;
  renderFix();
  $('#fixProblem').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

$('#runApp').onclick = () => {
  if (!setAppHtml($('#appCode').value)) return;
  toast(codeProblems(plan.app.html).includes('cut') ? '✂️ 코드가 중간에 끊겼어요. 아래 안내를 봐요' : '▶ 실행했어요! 버튼과 규칙이 잘 되는지 시험해 봐요', 4000);
};
$('#appFile').onchange = async (e) => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try { if (setAppHtml(await readFileText(f, MAX_APP_BYTES))) toast('📄 파일을 넣었어요'); } catch (err) { toast(err.message); }
};
$('#clearApp').onclick = () => {
  if (!plan.app.html || !confirm('붙여 넣은 앱 코드를 지울까요?')) return;
  plan.app.html = ''; $('#appCode').value = ''; saveNow(); renderMyApp();
};
$('#appUrl').onchange = (e) => {
  const u = e.target.value.trim();
  if (u && !isHttpUrl(u)) { toast('https:// 로 시작하는 주소를 넣어요'); return; }
  plan.app.url = u; saveNow();
  if (!plan.app.html && u) mountApp($('#appFrame'), { url: u });
  renderAppInfo();
};
$('#fullApp').onclick = () => {
  const f = $('#appFrame');
  f.classList.add('fullscreen-app');
  const close = h('button', { class: 'close-full primary', onclick: () => { f.classList.remove('fullscreen-app'); close.remove(); } }, '✕ 닫기');
  document.body.appendChild(close);
};

// ---------- 5. 입점 ----------
function submitChecks() {
  const miss = missingRequired(plan);
  return [
    { ok: miss.length === 0, text: miss.length ? `★ 기획서 항목 채우기 (남은 것: ${miss.map((m) => m.title).join(', ')})` : '★ 기획서 꼭 쓰기 항목 완성' },
    { ok: !!(plan.app.html || plan.app.url), text: '내 앱 코드(또는 공유 주소) 넣기' },
    { ok: (plan.app.checks || []).length >= 3, text: `테스트 체크리스트 3개 이상 확인 (${(plan.app.checks || []).length}개)` },
  ];
}
// 그림체 맞추기: 앱 월드 지도 그림을 받아 이미지 AI에 프롬프트와 함께 올려요
function refTip() {
  const box = h('div', { class: 'ref-tip' }, h('span', { class: 'grow' }, '🎨 ', h('b', {}, '앱 월드와 똑같은 그림체로 만들려면: '), '이미지 AI에 프롬프트와 함께 ', h('b', {}, '앱 월드 지도 그림'), '을 올려요.'));
  if (api.enabled) {
    box.append(h('button', { type: 'button', class: 'primary', onclick: async () => {
      try {
        const { data } = await api.asset('map');
        const a = h('a', { href: data, download: `앱월드_지도.${data.startsWith('data:image/png') ? 'png' : 'jpg'}` });
        document.body.append(a); a.click(); a.remove();
        toast('🗺️ 지도 그림을 내려받았어요. 이미지 AI에 같이 올려요');
      } catch {
        // 직접 올린 지도가 없으면 선생님이 고른 준비된 지도 그림
        try {
          const p = presetById(cleanWorldSettings((await api.world()).settings).mapPreset);
          if (!p) throw new Error('none');
          const a = h('a', { href: presetUrl(p), download: `앱월드_지도.webp` });
          document.body.append(a); a.click(); a.remove();
          toast('🗺️ 지도 그림을 내려받았어요. 이미지 AI에 같이 올려요');
        } catch { toast('앱 월드 화면을 캡처해서 이미지 AI에 같이 올려 주세요', 5000); }
      }
    } }, '🗺️ 앱 월드 지도 그림 받기'));
  } else {
    box.append(h('a', { class: 'btn', href: '../world/', target: '_blank', rel: 'noopener' }, '🌏 앱 월드 열기'), h('span', { class: 'muted small' }, '(화면을 캡처해서 같이 올려도 돼요)'));
  }
  return box;
}
function renderRefTips() { document.querySelectorAll('[data-ref]').forEach((el) => el.replaceChildren(refTip())); }

// 내 캐릭터 (부스 건물은 앱 월드 지도에 그려져 있어서 따로 만들지 않아요)
function renderMyBooth() {
  if (!plan.avatar) plan.avatar = avatarFromText(plan.f.developer || plan.id);
  $('#avatarBox').replaceChildren(avatarBuilder(h, plan.avatar, (a) => { plan.avatar = a; touch(); }));
}

// 선생님이 고른 앱 월드 지도 (그림 프롬프트가 그 지도 속 구역과 이어지게). 모르면 기본 지도.
let worldPreset = MAP_PRESETS[0];
let worldPresetAsked = false;
async function loadWorldPreset() {
  if (worldPresetAsked || !api.enabled) return;
  worldPresetAsked = true;
  try {
    const p = presetById(cleanWorldSettings((await api.world()).settings).mapPreset);
    if (p && p.id !== worldPreset.id) { worldPreset = p; renderPrompts(); renderPictures(); }
  } catch { /* 기본 지도로 */ }
}
const imagePrompts = () => buildImagePrompts(plan, { preset: worldPreset });

function renderSubmit() {
  renderMyBooth();
  $('#submitChecks').replaceChildren(...submitChecks().map((c) => h('li', { class: c.ok ? 'ok' : '' }, c.text)));
  const t = topicView(plan);
  $('#reviewFields').replaceChildren(...SECTIONS.find((s) => s.n === 15).inputs.map((i) => inputFor(i, t)));
  $('#sendOnline').hidden = !api.enabled;
  $('#sendOffline').hidden = api.enabled;
  if (plan.submit.status) showStatus(plan.submit); else $('#statusBox').hidden = true;
  if (api.enabled) refreshStatus(true);
}

function submissionPayload() {
  const { html, images, ...appRest } = plan.app;
  return {
    studentKey: plan.id,
    token: session ? session.token : undefined,
    developer: plan.f.developer.trim(),
    classInfo: '',   // 학년·반은 보내지 않음 (개인정보)
    appName: plan.f.appName.trim(),
    topicId: plan.topicId,
    plan: { ...plan, boothImage: '', app: { ...appRest, html: '', images: {} } },
    boothImage: plan.boothImage || '',
    appHtml: html ? appliedHtml() : '',
    appUrl: plan.app.url || '',
  };
}

function canSubmit() {
  if (!plan.f.developer.trim() || !plan.f.appName.trim()) { toast('기획서 1번에 개발자 별명과 앱 이름을 써요', 4000); return false; }
  const issues = planSafety(plan);
  if (issues.length) { toast(`🚫 ${where(issues[0])}에 바꿔야 할 말(「${issues[0].words[0]}」)이 있어요. 고친 뒤에 보내요`, 5000); go('prompts'); return false; }
  if (!plan.app.html && !plan.app.url) { toast('4. 내 앱에 코드를 먼저 넣어요', 4000); return false; }
  if (plan.app.html && appliedHtml().length > MAX_APP_BYTES) { toast(`앱이 너무 커요 (${Math.round(MAX_APP_BYTES / 1000)}KB까지). 그림을 하나 빼 볼까요?`, 5000); return false; }
  const bad = submitChecks().filter((c) => !c.ok);
  if (bad.length && !confirm(`아직 확인하지 않은 것이 있어요:\n- ${bad.map((b) => b.text).join('\n- ')}\n\n그래도 보낼까요?`)) return false;
  return true;
}

$('#sendBtn').onclick = async () => {
  saveNow();
  if (!canSubmit()) return;
  const btn = $('#sendBtn');
  btn.disabled = true; btn.textContent = '보내는 중…';
  try {
    const r = await api.submit(submissionPayload());
    plan.submit = { ...plan.submit, at: new Date().toISOString(), status: r.status, id: r.id };
    saveNow();
    showStatus(plan.submit);
    toast('🚀 선생님께 보냈어요!');
  } catch (e) {
    toast(`보내지 못했어요: ${e.message}. 「제출 파일 내려받기」로 내도 돼요`, 6000);
  } finally { btn.disabled = false; btn.textContent = '🚀 선생님께 보내기'; }
};
$('#checkBtn').onclick = () => refreshStatus(false);
async function refreshStatus(quiet) {
  try {
    const r = await api.mine(plan.id, session ? session.token : undefined);
    if (!r.found) { if (!quiet) toast('아직 보낸 적이 없어요'); return; }
    plan.submit = { ...plan.submit, status: r.status, feedback: r.feedback || '', booth: r.booth, likes: r.likes, id: r.id };
    store.save(plan);
    showStatus(plan.submit);
  } catch (e) { if (!quiet) toast(e.message); }
}
function showStatus(s) {
  const box = $('#statusBox');
  const label = { submitted: '📨 보냈어요 — 선생님이 확인하는 중이에요', approved: `🎉 입점 완료! ${s.booth ? `${s.booth}번 부스` : ''}에서 친구들이 놀 수 있어요`, needs_fix: '🔧 선생님이 고쳐 보자고 했어요' }[s.status] || '';
  box.hidden = !label;
  box.className = `status-box ${s.status || ''}`;
  box.replaceChildren(h('b', {}, label),
    s.feedback ? h('p', {}, `💬 선생님 말씀: ${s.feedback}`) : '',
    s.status === 'needs_fix' ? h('button', { class: 'chip', type: 'button', onclick: () => { go('myapp'); setTimeout(() => { useTeacherFeedback(); $('#fixCard').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); } }, '🔧 학생 앱에서 바로 고치기') : '',
    s.likes ? h('p', { class: 'small' }, `👍 좋아요 ${s.likes}개`) : '');
}

$('#fileSubmitBtn').onclick = () => {
  saveNow();
  if (!canSubmit()) return;
  const sub = { schema: 'myappmaker.submission/1', submittedAt: new Date().toISOString(), studentKey: plan.id, plan };
  download(`제출_${safeName(plan.f.developer)}_${safeName(plan.f.appName)}.json`, JSON.stringify(sub));
  plan.submit = { ...plan.submit, at: sub.submittedAt, status: plan.submit.status || 'submitted' };
  saveNow();
  toast('📦 제출 파일을 내려받았어요. 선생님이 알려 준 곳에 올려요', 5000);
};

if (api.enabled) {
  const u = new URL('../world/', location.href);
  u.searchParams.set('api', cfg.endpoint); u.searchParams.set('class', cfg.classCode);
  $('#worldLink').href = u.toString();
}

renderUser();
route();
if (session) {
  syncFromCloud(plan).then((loaded) => { if (loaded) { toast('☁️ 다른 노트북에서 쓴 최신 내용을 불러왔어요'); route(); } }).catch((e) => {
    if (/로그인/.test(e.message)) { expired = true; cloudPill('⚠ 다시 로그인 (눌러요)', 'bad'); } else cloudPill('⚠ 저장소에 연결 안 됨 · 이 기기엔 저장됨', 'bad');
  });
}
