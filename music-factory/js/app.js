// 화면과 조작을 이어 주는 파일
import {
  SIZES, MIN_LEVEL, MAX_LEVEL, DEFAULT_LEVEL, DEFAULT_BPM,
  buildSchedule, activeAt, clampBpm, clampLevel, sizeOf, beatSeconds, BEATS_PER_BAR,
} from './engine.js';
import { THEMES, INSTRUMENTS, INSTRUMENT_ORDER, getTheme, ingredientOf, imagePath } from './themes.js';
import { AudioEngine, Player } from './audio.js';
import { MISSIONS, getMission, checkMission } from './missions.js';
import * as store from './storage.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// ---------- 상태 ----------
const state = {
  screen: 'home',
  theme: getTheme('bingsu'),
  items: [],
  selectedId: null,
  armedIng: null, // 눌러서 고른 재료 (빈 칸을 누르면 놓임)
  bpm: DEFAULT_BPM,
  loop: false,
  workId: null,
  title: '',
  createdAt: null,
  mission: null,
  backTo: 'themes',
};

const createScreen = $('#create');
const audio = new AudioEngine();
const player = new Player(audio, {
  voiceOf: (ingId) => ingredientOf(state.theme, ingId)?.voice,
});

let uidSeq = 0;
const uid = () => `i${Date.now().toString(36)}${(uidSeq++).toString(36)}`;

// ---------- 그림 (있으면 그림, 없으면 이모지) ----------
const imgOK = new Map(); // 경로 → true/false

function probeImage(src) {
  if (imgOK.has(src)) return;
  imgOK.set(src, false);
  const im = new Image();
  im.onload = () => { imgOK.set(src, true); onImagesChanged(); };
  im.src = src;
}

let imgRefreshQueued = false;
function onImagesChanged() {
  if (imgRefreshQueued) return;
  imgRefreshQueued = true;
  requestAnimationFrame(() => {
    imgRefreshQueued = false;
    if (state.screen === 'create') { renderPalette(); renderCup(); renderItemPanel(); }
    if (state.screen === 'library') renderLibrary();
    if (state.screen === 'instruments') renderInstruments();
    if (state.screen === 'themes') renderThemes();
  });
}

function pic(src, emoji, cls = 'pic') {
  const box = el('span', cls);
  if (src && imgOK.get(src)) {
    const im = el('img');
    im.src = src;
    im.alt = '';
    im.draggable = false;
    box.append(im);
  } else {
    box.append(el('span', 'emo', emoji));
  }
  return box;
}

function ingPic(ing, cls) {
  return pic(imagePath(state.theme.id, ing.id), ing.emoji, cls);
}

function instPic(instId, cls = 'ipic') {
  return pic(`assets/images/instruments/${instId}.png`, INSTRUMENTS[instId].emoji, cls);
}

function preloadImages() {
  for (const t of THEMES) probeImage(`assets/images/themes/${t.id}.png`);
  for (const id of Object.keys(INSTRUMENTS)) probeImage(`assets/images/instruments/${id}.png`);
  for (const ing of state.theme.ingredients) probeImage(imagePath(state.theme.id, ing.id));
}

// HTML 안에 미리 적어 둔 꾸밈 그림(로고, 배경, 컵)은 있을 때만 보여 줍니다.
for (const im of $$('img[data-optional]')) {
  const show = () => { if (im.naturalWidth) im.classList.add('loaded'); };
  if (im.complete) show(); else im.addEventListener('load', show);
}

// ---------- 화면 이동 ----------
function go(screen) {
  if (state.screen === 'create' && screen !== 'create') {
    player.stop();
    audio.stopPreview();
    updatePlayUI();
  }
  state.screen = screen;
  for (const s of $$('.screen')) s.hidden = s.id !== screen;
  if (screen === 'themes') renderThemes();
  if (screen === 'library') renderLibrary();
  if (screen === 'challenge') renderMissions();
  if (screen === 'instruments') renderInstruments();
  window.scrollTo(0, 0);
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]');
  if (b) { audio.ensure(); go(b.dataset.go); }
});

// ---------- 알림 ----------
let toastTimer = null;
function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

function confirmBox(text) {
  const d = $('#confirmDialog');
  $('#confirmText').textContent = text;
  return new Promise((resolve) => {
    const done = (v) => { d.close(); $('#confirmYes').onclick = null; $('#confirmNo').onclick = null; resolve(v); };
    $('#confirmYes').onclick = () => done(true);
    $('#confirmNo').onclick = () => done(false);
    d.oncancel = () => resolve(false);
    d.showModal();
  });
}

// ---------- 테마 선택 ----------
function renderThemes() {
  const grid = $('#themeGrid');
  grid.replaceChildren();
  for (const t of THEMES) {
    const card = el('button', `theme-card${t.ready ? '' : ' locked'}`);
    card.type = 'button';
    card.dataset.theme = t.id;
    card.disabled = !t.ready;
    card.append(pic(`assets/images/themes/${t.id}.png`, t.emoji, 'theme-pic'));
    card.append(el('strong', '', t.name));
    card.append(el('span', 'tag', `${t.method} · ${t.learn}`));
    if (!t.ready) card.append(el('span', 'soon', '🔒 곧 열려요'));
    grid.append(card);
  }
}

$('#themeGrid').addEventListener('click', (e) => {
  const c = e.target.closest('.theme-card');
  if (!c || c.disabled) return;
  audio.ensure();
  openCreate({ themeId: c.dataset.theme, fresh: false, backTo: 'themes' });
});

// ---------- 창작 화면 열기 ----------
function openCreate({ themeId = 'bingsu', work = null, mission = null, fresh = false, backTo = 'themes' } = {}) {
  player.stop();
  state.theme = getTheme(themeId);
  state.mission = mission;
  state.backTo = backTo;
  state.selectedId = null;
  state.armedIng = null;
  if (work) {
    state.items = work.items.map((it) => ({ ...it }));
    state.bpm = work.bpm;
    state.loop = work.loop;
    state.workId = work.id;
    state.title = work.title;
    state.createdAt = work.createdAt;
  } else {
    const draft = !fresh && !mission ? store.loadDraft() : null;
    const useDraft = draft && draft.theme === themeId;
    state.items = useDraft ? draft.items : [];
    state.bpm = useDraft ? draft.bpm : DEFAULT_BPM;
    state.loop = useDraft ? draft.loop : false;
    state.workId = useDraft ? draft.id : null;
    state.title = useDraft ? draft.title : '';
    state.createdAt = useDraft ? draft.createdAt : null;
    if (useDraft && draft.items.length) setTimeout(() => toast('🍧 만들던 빙수를 다시 열었어요'), 300);
  }
  preloadImages();
  buildCup();
  $('#bpm').value = state.bpm;
  $('#bpmOut').textContent = state.bpm;
  $('#btnLoop').setAttribute('aria-pressed', String(state.loop));
  go('create');
  renderAll();
}

function renderAll() {
  renderHeader();
  renderPalette();
  renderCup();
  renderItemPanel();
  renderBand();
  renderMissionPanel();
  updatePlayUI();
}

function renderHeader() {
  const t = state.theme;
  $('#createTitle').textContent = `${t.emoji} ${state.title || t.name}`;
  $('#createSub').textContent = state.mission
    ? `도전: ${state.mission.title}`
    : `재료를 ${t.container}에 쌓으면 음악이 돼요!`;
}

function changed() {
  state.items = state.items.slice();
  renderCup();
  renderItemPanel();
  renderBand();
  renderMissionPanel();
  if (!state.mission) {
    store.saveDraft({
      id: state.workId, title: state.title, theme: state.theme.id, bpm: state.bpm,
      loop: state.loop, items: state.items, createdAt: state.createdAt,
    });
  }
}

// ---------- 재료 목록 ----------
function renderPalette() {
  const p = $('#palette');
  p.replaceChildren();
  for (const ing of state.theme.ingredients) {
    const inst = INSTRUMENTS[ing.instrument];
    const b = el('button', `ing${state.armedIng === ing.id ? ' armed' : ''}`);
    b.type = 'button';
    b.dataset.ing = ing.id;
    b.style.setProperty('--c', ing.color || '#fff');
    b.append(ingPic(ing, 'ing-pic'));
    b.append(el('span', 'ing-name', ing.name));
    b.append(el('span', 'ing-inst', `${inst.emoji} ${inst.name}`));
    p.append(b);
  }
}

// ---------- 컵 ----------
function buildCup() {
  const rows = $('#cupRows');
  rows.replaceChildren();
  const { rows: R, cols: C } = state.theme;
  rows.style.setProperty('--rows', R);
  rows.style.setProperty('--cols', C);
  for (let r = R - 1; r >= 0; r--) {
    const row = el('div', 'row');
    row.dataset.row = r;
    const label = el('span', 'row-label');
    row.append(label);
    for (let c = 0; c < C; c++) {
      const slot = el('div', 'slot');
      slot.dataset.row = r;
      slot.dataset.col = c;
      row.append(slot);
    }
    rows.append(row);
  }
}

function itemAt(row, col) {
  return state.items.find((it) => it.row === row && it.col === col) || null;
}

function getItem(id) {
  return state.items.find((it) => it.id === id) || null;
}

function renderCup() {
  const schedule = buildSchedule(state.items);
  const orderOf = new Map(schedule.groups.map((g) => [g.row, g.order]));
  createScreen.style.setProperty('--beat', `${beatSeconds(state.bpm)}s`);
  for (const row of $$('#cupRows .row')) {
    const r = Number(row.dataset.row);
    const label = $('.row-label', row);
    label.textContent = orderOf.has(r) ? String(orderOf.get(r)) : '';
    row.classList.toggle('filled', orderOf.has(r));
  }
  for (const slot of $$('#cupRows .slot')) {
    const it = itemAt(Number(slot.dataset.row), Number(slot.dataset.col));
    slot.replaceChildren();
    slot.classList.toggle('empty', !it);
    if (!it) continue;
    const ing = ingredientOf(state.theme, it.ing);
    const size = sizeOf(it.size);
    const d = el('div', `item${it.id === state.selectedId ? ' selected' : ''}`);
    d.dataset.id = it.id;
    d.dataset.ing = it.ing;
    d.dataset.size = it.size;
    d.style.setProperty('--s', size.scale);
    d.style.setProperty('--c', ing.color || '#fff');
    d.setAttribute('aria-label', `${ing.name} ${size.short}`);
    d.append(ingPic(ing, 'item-body'));
    d.append(el('span', 'beat', size.short));
    d.append(el('span', 'inst', INSTRUMENTS[ing.instrument].emoji));
    if (it.id === state.selectedId) {
      const grip = el('span', 'grip');
      grip.title = '끌어서 크기 바꾸기';
      grip.textContent = '↔';
      d.append(grip);
    }
    slot.append(d);
  }
  $('#cup').classList.toggle('armed', Boolean(state.armedIng));
  const info = $('#lengthInfo');
  if (!schedule.groups.length) {
    info.textContent = '컵이 비어 있어요 · 재료를 끌어다 놓아요';
  } else {
    const secs = schedule.totalBeats * beatSeconds(state.bpm);
    const bars = schedule.totalBeats / BEATS_PER_BAR;
    const whole = Math.floor(bars);
    const rest = schedule.totalBeats - whole * BEATS_PER_BAR;
    const barText = !rest ? `${whole}마디` : whole ? `${whole}마디 + ${fmtBeats(rest)}박` : `1마디가 안 돼요`;
    info.textContent = `${schedule.groups.length}층 · 전체 길이 ${fmtBeats(schedule.totalBeats)}박 (${barText}) · 약 ${secs.toFixed(1)}초`;
  }
}

function fmtBeats(b) {
  return Number.isInteger(b) ? String(b) : b.toFixed(1).replace('.5', '½').replace(/^0/, '');
}

// ---------- 선택한 재료 패널 ----------
function renderItemPanel() {
  const it = getItem(state.selectedId);
  $('#itemEmpty').hidden = Boolean(it);
  $('#itemEdit').hidden = !it;
  if (!it) return;
  const ing = ingredientOf(state.theme, it.ing);
  const inst = INSTRUMENTS[ing.instrument];
  $('#itemPic').replaceChildren(ingPic(ing, 'pic'));
  $('#itemName').textContent = ing.name;
  $('#itemInst').textContent = `${inst.emoji} ${inst.name} · ${ing.sound}`;
  const box = $('#sizeBtns');
  box.replaceChildren();
  for (const s of SIZES) {
    const b = el('button', `size-btn${s.level === it.size ? ' on' : ''}`);
    b.type = 'button';
    b.dataset.level = s.level;
    const p = ingPic(ing, 'size-pic');
    p.style.setProperty('--s', s.scale);
    b.append(p, el('span', 'size-beat', s.short), el('span', 'size-name', s.name));
    box.append(b);
  }
}

$('#sizeBtns').addEventListener('click', (e) => {
  const b = e.target.closest('.size-btn');
  if (!b || !guardEdit()) return;
  setSize(state.selectedId, Number(b.dataset.level));
});

function setSize(id, level, { sound = true } = {}) {
  const it = getItem(id);
  if (!it) return;
  const lv = clampLevel(level);
  if (it.size === lv) return;
  it.size = lv;
  changed();
  if (sound) previewIng(it.ing, sizeOf(lv).beats);
}

$('#btnRemove').addEventListener('click', () => {
  if (!guardEdit()) return;
  removeItem(state.selectedId);
});

function removeItem(id) {
  state.items = state.items.filter((it) => it.id !== id);
  if (state.selectedId === id) state.selectedId = null;
  changed();
}

// ---------- 우리 밴드 ----------
function renderBand() {
  const used = new Set(state.items.map((it) => ingredientOf(state.theme, it.ing)?.instrument));
  const band = $('#band');
  band.replaceChildren();
  for (const id of INSTRUMENT_ORDER) {
    const inst = INSTRUMENTS[id];
    const m = el('div', `member${used.has(id) ? ' used' : ''}`);
    m.dataset.inst = id;
    m.style.setProperty('--c', inst.color);
    m.append(instPic(id), el('span', 'mname', inst.name.replace('일렉트릭 ', '')));
    band.append(m);
  }
}

// ---------- 미션 ----------
function renderMissionPanel() {
  const p = $('#missionPanel');
  const m = state.mission;
  p.hidden = !m;
  if (!m) return;
  const ok = checkMission(m, state.theme, state.items);
  p.classList.toggle('ok', ok);
  p.replaceChildren(
    el('p', 'panel-label', `🏆 도전 ${'⭐'.repeat(m.stars)}`),
    el('strong', 'm-title', m.title),
    el('p', 'm-goal', m.goal),
    el('p', 'm-state', ok ? '✅ 조건을 채웠어요! ▶️ 끝까지 들어 보세요.' : `💡 ${m.hint}`),
  );
}

// ---------- 미리 듣기 ----------
function previewIng(ingId, beats = 1) {
  if (player.state === 'paused') { player.stop(); updatePlayUI(); }
  if (player.state === 'playing') return; // 연주 중엔 섞이지 않게
  const ing = ingredientOf(state.theme, ingId);
  audio.preview(ing.voice, beats, state.bpm);
  const m = $(`#band .member[data-inst="${ing.instrument}"]`);
  if (m) { m.classList.remove('hit'); void m.offsetWidth; m.classList.add('hit'); }
}

// ---------- 편집 잠금 ----------
// 연주 중에는 고칠 수 없어요. 일시정지 중에 고치면 연주를 끝내고 고쳐요.
function guardEdit() {
  if (player.state === 'playing') {
    toast('🎵 연주 중이에요! ⏹️ 멈춘 다음 고쳐요');
    return false;
  }
  if (player.state === 'paused') {
    player.stop();
    clearPlayVisuals();
    updatePlayUI();
  }
  return true;
}

// ---------- 놓기 / 옮기기 ----------
function placeIngredient(ingId, row, col) {
  let target = itemAt(row, col);
  if (target) {
    // 그 칸이 차 있으면 같은 줄의 빈 칸에 놓고, 빈 칸이 없으면 바꿔 넣어요.
    for (let c = 0; c < state.theme.cols; c++) {
      if (!itemAt(row, c)) { col = c; target = null; break; }
    }
  }
  if (target) state.items = state.items.filter((it) => it !== target);
  const it = { id: uid(), ing: ingId, row, col, size: DEFAULT_LEVEL };
  state.items.push(it);
  state.selectedId = it.id;
  changed();
  previewIng(ingId, sizeOf(it.size).beats);
  popItem(it.id);
}

function moveItem(id, row, col) {
  const it = getItem(id);
  if (!it || (it.row === row && it.col === col)) return;
  const other = itemAt(row, col);
  if (other) { other.row = it.row; other.col = it.col; }
  it.row = row;
  it.col = col;
  state.selectedId = id;
  changed();
  popItem(id);
}

function popItem(id) {
  const d = $(`#cupRows .item[data-id="${id}"]`);
  if (d) { d.classList.remove('pop'); void d.offsetWidth; d.classList.add('pop'); }
}

// ---------- 끌어다 놓기 (마우스 + 터치 공통) ----------
let drag = null;
const DRAG_START = 8;

function slotFromPoint(x, y) {
  const hit = document.elementFromPoint(x, y);
  const slot = hit?.closest?.('#cupRows .slot');
  if (slot) return slot;
  // 칸 사이 틈에 놓았을 때: 컵 안이면 가장 가까운 칸
  const cup = $('#cupRows').getBoundingClientRect();
  if (x < cup.left || x > cup.right || y < cup.top || y > cup.bottom) return null;
  let best = null, bestD = Infinity;
  for (const s of $$('#cupRows .slot')) {
    const r = s.getBoundingClientRect();
    const d = (r.left + r.width / 2 - x) ** 2 + (r.top + r.height / 2 - y) ** 2;
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

function overTrash(x, y) {
  const r = $('.palette').getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function makeGhost(ingId, level) {
  const ing = ingredientOf(state.theme, ingId);
  const g = ingPic(ing, 'drag-ghost');
  g.style.setProperty('--s', sizeOf(level).scale);
  document.body.append(g);
  return g;
}

function moveGhost(x, y) {
  drag.ghost.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
}

function setOver(slot) {
  for (const s of $$('#cupRows .slot.over')) if (s !== slot) s.classList.remove('over');
  slot?.classList.add('over');
}

createScreen.addEventListener('pointerdown', (e) => {
  if (e.button > 0 || drag) return;
  audio.ensure();
  const grip = e.target.closest('.grip');
  const item = e.target.closest('#cupRows .item');
  const ing = e.target.closest('#palette .ing');
  const slot = e.target.closest('#cupRows .slot');

  if (grip && item) {
    if (!guardEdit()) return;
    e.preventDefault();
    const it = getItem(item.dataset.id);
    drag = { kind: 'grip', id: it.id, x0: e.clientX, y0: e.clientY, level0: it.size, pointerId: e.pointerId };
    return;
  }
  if (item) {
    e.preventDefault();
    drag = { kind: 'item', id: item.dataset.id, x0: e.clientX, y0: e.clientY, moved: false, pointerId: e.pointerId };
    return;
  }
  if (ing) {
    e.preventDefault();
    drag = { kind: 'palette', ing: ing.dataset.ing, x0: e.clientX, y0: e.clientY, moved: false, pointerId: e.pointerId };
    return;
  }
  if (slot && state.armedIng) {
    if (!guardEdit()) return;
    placeIngredient(state.armedIng, Number(slot.dataset.row), Number(slot.dataset.col));
    return;
  }
  if (slot || e.target.closest('.stage')) {
    if (state.selectedId) { state.selectedId = null; renderCup(); renderItemPanel(); }
  }
});

document.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.pointerId) return;
  const dx = e.clientX - drag.x0;
  const dy = e.clientY - drag.y0;
  if (drag.kind === 'grip') {
    // 오른쪽·위로 끌면 커지고, 왼쪽·아래로 끌면 작아져요 (자유롭게 끌어도 4단계로 딱 맞춰요)
    const lv = clampLevel(drag.level0 + Math.round((dx - dy) / 36));
    if (lv !== getItem(drag.id)?.size) setSize(drag.id, lv, { sound: false });
    drag.lastLevel = lv;
    return;
  }
  if (!drag.moved) {
    if (Math.hypot(dx, dy) < DRAG_START) return;
    if (drag.kind === 'item' && !guardEdit()) { drag = null; return; }
    if (drag.kind === 'palette' && player.state === 'playing') {
      toast('🎵 연주 중이에요! ⏹️ 멈춘 다음 고쳐요');
      drag = null;
      return;
    }
    if (drag.kind === 'palette' && player.state === 'paused') guardEdit();
    drag.moved = true;
    const ingId = drag.kind === 'item' ? getItem(drag.id).ing : drag.ing;
    const level = drag.kind === 'item' ? getItem(drag.id).size : DEFAULT_LEVEL;
    drag.ghost = makeGhost(ingId, level);
    document.body.classList.add('dragging', drag.kind === 'item' ? 'dragging-item' : 'dragging-new');
    if (drag.kind === 'item') $(`#cupRows .item[data-id="${drag.id}"]`)?.classList.add('lifted');
  }
  moveGhost(e.clientX, e.clientY);
  const slot = slotFromPoint(e.clientX, e.clientY);
  setOver(slot);
  $('.palette').classList.toggle('trash-over', drag.kind === 'item' && !slot && overTrash(e.clientX, e.clientY));
}, { passive: true });

function endDrag(e, cancelled = false) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  const d = drag;
  drag = null;
  d.ghost?.remove();
  document.body.classList.remove('dragging', 'dragging-item', 'dragging-new');
  $('.palette').classList.remove('trash-over');
  setOver(null);
  if (cancelled) { renderCup(); return; }

  if (d.kind === 'grip') {
    const it = getItem(d.id);
    if (it && it.size !== d.level0) previewIng(it.ing, sizeOf(it.size).beats);
    return;
  }
  if (!d.moved) {
    if (d.kind === 'palette') {
      // 누르기: 소리 듣기 + 고르기 (빈 칸을 누르면 거기에 놓여요)
      state.armedIng = state.armedIng === d.ing ? null : d.ing;
      previewIng(d.ing, 1);
      renderPalette();
      renderCup();
      if (state.armedIng) toast('👉 컵의 빈 칸을 누르면 거기에 놓여요', 1800);
    } else if (d.kind === 'item') {
      const it = getItem(d.id);
      state.selectedId = d.id;
      renderCup();
      renderItemPanel();
      if (it) previewIng(it.ing, sizeOf(it.size).beats);
    }
    return;
  }
  const slot = slotFromPoint(e.clientX, e.clientY);
  if (d.kind === 'palette') {
    if (slot) placeIngredient(d.ing, Number(slot.dataset.row), Number(slot.dataset.col));
    return;
  }
  if (d.kind === 'item') {
    if (slot) moveItem(d.id, Number(slot.dataset.row), Number(slot.dataset.col));
    else if (overTrash(e.clientX, e.clientY)) { removeItem(d.id); toast('🗑️ 재료를 뺐어요', 1200); }
    else renderCup();
  }
}

document.addEventListener('pointerup', (e) => endDrag(e));
document.addEventListener('pointercancel', (e) => endDrag(e, true));

// 키보드로도 고칠 수 있어요 (PC): 화살표 = 옮기기, +/- = 크기, Delete = 빼기
document.addEventListener('keydown', (e) => {
  if (state.screen !== 'create' || document.querySelector('dialog[open]')) return;
  if (e.target.closest?.('input')) return;
  if (e.key === ' ') { e.preventDefault(); togglePlay(); return; }
  const it = getItem(state.selectedId);
  if (!it) return;
  const moves = { ArrowUp: [1, 0], ArrowDown: [-1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  if (moves[e.key]) {
    e.preventDefault();
    if (!guardEdit()) return;
    const [dr, dc] = moves[e.key];
    const r = it.row + dr, c = it.col + dc;
    if (r >= 0 && r < state.theme.rows && c >= 0 && c < state.theme.cols) moveItem(it.id, r, c);
  } else if (e.key === '+' || e.key === '=') {
    if (guardEdit()) setSize(it.id, Math.min(MAX_LEVEL, it.size + 1));
  } else if (e.key === '-') {
    if (guardEdit()) setSize(it.id, Math.max(MIN_LEVEL, it.size - 1));
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    if (guardEdit()) removeItem(it.id);
  }
});

// ---------- 재생 ----------
function togglePlay() {
  audio.ensure();
  if (player.state === 'playing') { player.pause(); updatePlayUI(); return; }
  if (player.state === 'paused') { player.resume(); updatePlayUI(); return; }
  startPlay();
}

function startPlay() {
  if (!state.items.length) {
    toast(`🍧 재료를 먼저 ${state.theme.container}에 담아요`);
    return;
  }
  state.armedIng = null;
  state.selectedId = null;
  renderPalette();
  renderCup();
  renderItemPanel();
  const ok = player.play(state.items, { bpm: state.bpm, loop: state.loop, onEnd: onPlayEnd });
  if (!ok) { toast('😢 이 기기에서는 소리를 낼 수 없어요'); return; }
  $('#cup').classList.remove('finished');
  updatePlayUI();
  requestAnimationFrame(animate);
}

function stopPlay() {
  player.stop();
  clearPlayVisuals();
  updatePlayUI();
}

function onPlayEnd() {
  clearPlayVisuals();
  updatePlayUI();
  sparkle();
  const m = state.mission;
  if (m && checkMission(m, state.theme, state.items)) {
    store.markMissionDone(m.id);
    showDone('🏆 미션 성공!', `「${m.title}」 도전을 해냈어요! ${'⭐'.repeat(m.stars)}`, { mission: true });
  }
}

$('#btnPlay').addEventListener('click', togglePlay);
$('#btnRestart').addEventListener('click', () => { audio.ensure(); player.stop(); clearPlayVisuals(); startPlay(); });
$('#btnStop').addEventListener('click', stopPlay);

$('#btnClear').addEventListener('click', async () => {
  if (!state.items.length) return;
  if (!(await confirmBox('컵을 비울까요? 담은 재료가 모두 없어져요.'))) return;
  stopPlay();
  state.items = [];
  state.selectedId = null;
  // 비운 컵은 새 작품이에요 (저장하면 예전 작품을 덮어쓰지 않아요)
  state.workId = null;
  state.title = '';
  state.createdAt = null;
  changed();
  renderHeader();
  toast('🧹 컵을 비웠어요');
});

$('#bpm').addEventListener('input', (e) => {
  const v = clampBpm(e.target.value);
  $('#bpmOut').textContent = v;
  if (player.state !== 'stopped' && v !== state.bpm) { stopPlay(); toast('빠르기를 바꿨어요. ▶️ 다시 들어 봐요'); }
  state.bpm = v;
  renderCup();
});
$('#bpm').addEventListener('change', () => changed());

$('#btnLoop').addEventListener('click', () => {
  state.loop = !state.loop;
  $('#btnLoop').setAttribute('aria-pressed', String(state.loop));
  player.setLoop(state.loop);
  toast(state.loop ? '🔁 끝나면 처음부터 다시 연주해요' : '한 번만 연주해요', 1500);
  changed();
});

function updatePlayUI() {
  const s = player.state;
  const btn = $('#btnPlay');
  $('.ci', btn).textContent = s === 'playing' ? '⏸️' : '▶️';
  $('.cl', btn).textContent = s === 'playing' ? '일시정지' : s === 'paused' ? '이어서' : '재생';
  btn.classList.toggle('on', s === 'playing');
  createScreen.classList.toggle('is-playing', s === 'playing');
  createScreen.classList.toggle('is-paused', s === 'paused');
}

// 오디오 시계를 보며 지금 연주 중인 재료를 반짝이게 합니다.
function animate() {
  if (player.state === 'stopped') return;
  const pos = player.position();
  if (pos && player.schedule) {
    const { group, ids } = pos.done ? { group: null, ids: new Set() } : activeAt(player.schedule, pos.beat);
    for (const row of $$('#cupRows .row')) row.classList.toggle('now', group != null && Number(row.dataset.row) === group.row);
    const playingInst = new Set();
    for (const d of $$('#cupRows .item')) {
      const on = ids.has(d.dataset.id);
      d.classList.toggle('playing', on);
      if (on) playingInst.add(ingredientOf(state.theme, d.dataset.ing).instrument);
    }
    for (const m of $$('#band .member')) m.classList.toggle('playing', playingInst.has(m.dataset.inst));
    const total = player.schedule.totalBeats;
    $('#cup').style.setProperty('--progress', String(Math.min(1, pos.beat / total)));
  }
  requestAnimationFrame(animate);
}

function clearPlayVisuals() {
  for (const n of $$('#cupRows .row.now, #cupRows .item.playing, #band .member.playing')) n.classList.remove('now', 'playing');
  $('#cup').style.setProperty('--progress', '0');
}

function sparkle() {
  const box = $('#sparkles');
  box.replaceChildren();
  $('#cup').classList.add('finished');
  for (let i = 0; i < 18; i++) {
    const s = el('span', 'spark', ['✨', '⭐', '💖', '🎵'][i % 4]);
    s.style.setProperty('--x', `${Math.random() * 100}%`);
    s.style.setProperty('--y', `${Math.random() * 100}%`);
    s.style.setProperty('--d', `${Math.random() * 0.6}s`);
    box.append(s);
  }
  setTimeout(() => { box.replaceChildren(); $('#cup').classList.remove('finished'); }, 2200);
}

// ---------- 저장 ----------
$('#btnSave').addEventListener('click', () => {
  if (!state.items.length) { toast('🍧 재료를 담은 다음 저장해요'); return; }
  const input = $('#saveTitle');
  input.value = state.title || nextTitle();
  $('#saveDialog').showModal();
  input.select();
});

function nextTitle() {
  const base = state.theme.defaultTitle;
  const n = store.loadWorks().filter((w) => w.title.startsWith(base)).length + 1;
  return `${base} ${n}`;
}

$('#saveCancel').addEventListener('click', () => $('#saveDialog').close());
$('#saveDialog').addEventListener('close', () => {
  if ($('#saveDialog').returnValue !== 'save') return;
  $('#saveDialog').returnValue = '';
  const title = $('#saveTitle').value.trim() || nextTitle();
  const saved = store.saveWork({
    id: state.workId || store.newId(),
    title,
    theme: state.theme.id,
    bpm: state.bpm,
    loop: state.loop,
    items: state.items,
    createdAt: state.createdAt,
  });
  if (!saved) { toast('😢 저장하지 못했어요. 저장 공간을 확인해 주세요'); return; }
  state.workId = saved.id;
  state.title = saved.title;
  state.createdAt = saved.createdAt;
  changed();
  renderHeader();
  showDone('🎉 완성!', `「${saved.title}」을(를) 보관함에 저장했어요.`);
});

function showDone(title, text, { mission = false } = {}) {
  $('#doneTitle').textContent = title;
  $('#doneText').textContent = text;
  $('#doneLibrary').hidden = mission;
  $('#doneDialog').showModal();
}
$('#doneListen').addEventListener('click', () => { $('#doneDialog').close(); player.stop(); startPlay(); });
$('#doneLibrary').addEventListener('click', () => { $('#doneDialog').close(); go('library'); });
$('#doneClose').addEventListener('click', () => $('#doneDialog').close());

// ---------- 사용 방법 ----------
$('#btnHelp').addEventListener('click', () => $('#helpDialog').showModal());
$('#helpClose').addEventListener('click', () => $('#helpDialog').close());

$('#btnBack').addEventListener('click', () => go(state.backTo));

// ---------- 보관함 ----------
function renderLibrary() {
  const works = store.loadWorks();
  const list = $('#workList');
  list.replaceChildren();
  $('#workEmpty').hidden = works.length > 0;
  for (const w of works) {
    const theme = getTheme(w.theme);
    const card = el('article', 'work');
    card.dataset.id = w.id;
    const stack = el('div', 'work-stack');
    for (const g of buildSchedule(w.items).groups) {
      const line = el('div', 'ws-row');
      for (const m of g.items) {
        const ing = ingredientOf(theme, m.ing);
        line.append(pic(imagePath(theme.id, ing.id), ing.emoji, 'ws-pic'));
      }
      stack.prepend(line);
    }
    const sched = buildSchedule(w.items);
    const info = el('div', 'work-info');
    info.append(
      el('strong', 'work-title', w.title),
      el('span', 'work-meta', `${theme.emoji} ${theme.name} · ${fmtBeats(sched.totalBeats)}박 · 빠르기 ${w.bpm}`),
      el('span', 'work-date', new Date(w.updatedAt).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })),
    );
    const btns = el('div', 'work-btns');
    const mk = (act, label, cls = '') => {
      const b = el('button', `wide-btn small ${cls}`, label);
      b.type = 'button';
      b.dataset.act = act;
      return b;
    };
    btns.append(mk('play', '▶️ 듣기'), mk('edit', '✏️ 고치기', 'ghost'), mk('delete', '🗑️', 'ghost danger-text'));
    card.append(stack, info, btns);
    list.append(card);
  }
}

$('#workList').addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const id = b.closest('.work').dataset.id;
  const w = store.getWork(id);
  if (!w) return;
  audio.ensure();
  if (b.dataset.act === 'delete') {
    if (await confirmBox(`「${w.title}」을(를) 지울까요?`)) { store.deleteWork(id); renderLibrary(); }
    return;
  }
  openCreate({ themeId: w.theme, work: w, backTo: 'library' });
  if (b.dataset.act === 'play') startPlay();
});

// ---------- 도전 목록 ----------
function renderMissions() {
  const done = store.loadMissionDone();
  const list = $('#missionList');
  list.replaceChildren();
  for (const m of MISSIONS) {
    const b = el('button', `mission${done.has(m.id) ? ' done' : ''}`);
    b.type = 'button';
    b.dataset.mission = m.id;
    b.append(
      el('span', 'm-stars', '⭐'.repeat(m.stars)),
      el('strong', '', m.title),
      el('span', 'm-goal', m.goal),
      el('span', 'm-badge', done.has(m.id) ? '✅ 성공!' : '도전하기 ▶'),
    );
    list.append(b);
  }
}

$('#missionList').addEventListener('click', (e) => {
  const b = e.target.closest('.mission');
  if (!b) return;
  audio.ensure();
  openCreate({ themeId: 'bingsu', mission: getMission(b.dataset.mission), fresh: true, backTo: 'challenge' });
});

// ---------- 악기 소리 체험 ----------
let demoLevel = DEFAULT_LEVEL;

function renderInstruments() {
  const theme = getTheme('bingsu');
  const lp = $('#lenPick');
  lp.replaceChildren();
  for (const s of SIZES) {
    const b = el('button', `chip${s.level === demoLevel ? ' on' : ''}`, `${s.short} (${s.name})`);
    b.type = 'button';
    b.dataset.level = s.level;
    lp.append(b);
  }
  const grid = $('#instGrid');
  grid.replaceChildren();
  for (const id of INSTRUMENT_ORDER) {
    const inst = INSTRUMENTS[id];
    const card = el('div', 'inst-card');
    card.style.setProperty('--c', inst.color);
    const head = el('div', 'inst-head');
    head.append(instPic(id, 'inst-pic'), el('strong', '', inst.name));
    card.append(head, el('p', 'inst-desc', inst.desc));
    const row = el('div', 'inst-ings');
    for (const ing of theme.ingredients.filter((i) => i.instrument === id)) {
      const b = el('button', 'inst-ing');
      b.type = 'button';
      b.dataset.voice = ing.voice;
      b.append(pic(imagePath(theme.id, ing.id), ing.emoji, 'ii-pic'), el('span', '', `${ing.name} · ${ing.sound}`));
      row.append(b);
    }
    card.append(row);
    grid.append(card);
  }
}

$('#lenPick').addEventListener('click', (e) => {
  const b = e.target.closest('[data-level]');
  if (!b) return;
  demoLevel = Number(b.dataset.level);
  renderInstruments();
});

$('#instGrid').addEventListener('click', (e) => {
  const b = e.target.closest('.inst-ing');
  if (!b) return;
  audio.preview(b.dataset.voice, sizeOf(demoLevel).beats, DEFAULT_BPM);
  const card = b.closest('.inst-card');
  card.classList.remove('hit');
  void card.offsetWidth;
  card.classList.add('hit');
  card.style.setProperty('--dur', `${sizeOf(demoLevel).beats * beatSeconds(DEFAULT_BPM)}s`);
});

// 다른 탭으로 가면 소리를 멈춰요
document.addEventListener('visibilitychange', () => {
  if (document.hidden && player.state === 'playing') { player.pause(); updatePlayUI(); }
});

preloadImages();

// 시험용 창구 (화면 동작에는 쓰지 않음)
window.__mpf = { state, player, audio };
