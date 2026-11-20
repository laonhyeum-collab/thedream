// 화면과 조작을 이어 주는 파일
import {
  SIZES, MIN_LEVEL, MAX_LEVEL, DEFAULT_LEVEL, DEFAULT_BPM,
  buildSchedule, activeAt, clampBpm, clampLevel, sizeOf, beatSeconds, BEATS_PER_BAR,
} from './engine.js';
import {
  THEMES, INSTRUMENTS, ENSEMBLES, ENSEMBLE_ORDER, VOICE_LIST, getTheme, ensembleOf, ingredientOf, imagePath, soundOf, voiceInfo, normalizeVoices,
  progressionOf,
} from './themes.js';
import { STAGES, STAGE_THEME, getStage, isStageUnlocked, allStagesCleared } from './levels.js';
import { COMBOS, getCombo, comboThemeId, pickCombo, comboChallenge, backingPreviewItems } from './combos.js';
import { checkLyrics, LYRICS_MAX } from './lyrics.js';
import { musicShape, suggestLyrics } from './lyric-ideas.js';
import { AudioEngine, Player } from './audio.js';
import { MISSIONS, getMission, checkMission } from './missions.js';
import { SONGS, LEVELS, getSong, songItems, songBeats, compareToSong } from './songs.js';
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
  missionKind: null, // 'mission' 도전 미션 | 'level' 단계별 도전 | 'combo' 랜덤 조합 도전
  song: null, // 노래 따라 만들기: { song, level, result }
  backTo: 'themes',
  voices: {}, // 학생이 고른 재료별 악기 { 재료 id: 소리 id } (기본과 다른 것만)
  lyrics: '', // 교육용 체크를 통과한 가사 (5단계를 다 깨면 쓸 수 있어요. 이 기기 안에만 저장)
};

// 재료가 지금 내는 소리 (학생이 고른 악기 반영)
const soundFor = (ingId) => soundOf(state.theme, ingId, state.voices);
// 지금 테마 악단의 화음 흐름 (국악은 5음, 재즈는 재즈 화음…)
const progOf = (theme = state.theme) => progressionOf(theme);

const createScreen = $('#create');
// 폰·세로 화면에서는 컵 그림 대신 화면을 꽉 채우는 컵을 써요 (칸을 크게)
const narrowScreen = window.matchMedia('(max-width: 820px), (max-aspect-ratio: 4/5)');
narrowScreen.addEventListener?.('change', () => applyCupShape());
const audio = new AudioEngine();
const player = new Player(audio, {
  voiceOf: (ingId) => soundFor(ingId)?.voice,
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
  return pic(state.theme.noImages ? null : imagePath(state.theme.id, ing.id), ing.emoji, cls);
}

function instPic(instId, cls = 'ipic') {
  return pic(`assets/images/instruments/${instId}.png`, INSTRUMENTS[instId].emoji, cls);
}

function preloadImages() {
  for (const t of THEMES) probeImage(`assets/images/themes/${t.id}.png`);
  for (const id of Object.keys(INSTRUMENTS)) probeImage(`assets/images/instruments/${id}.png`);
  if (!state.theme.noImages) for (const ing of state.theme.ingredients) probeImage(imagePath(state.theme.id, ing.id));
}

// HTML 안에 미리 적어 둔 꾸밈 그림(로고, 배경, 컵)은 있을 때만 보여 줍니다.
for (const im of $$('img[data-optional]')) {
  const show = () => {
    if (!im.naturalWidth) return;
    im.classList.add('loaded');
    if (im.classList.contains('cup-img')) applyCupShape();
  };
  if (im.complete) show();
  im.addEventListener('load', show); // 테마를 바꾸면 그림 주소가 바뀌어요
}

// ---------- 화면 이동 ----------
function go(screen) {
  // 다른 화면으로 가면 소리를 멈춰요 (노래 목록에서 들어보기 하던 것도)
  if (screen !== state.screen && (state.screen === 'create' || player.state !== 'stopped')) {
    player.stop();
    audio.stopPreview();
    updatePlayUI();
  }
  state.screen = screen;
  $('#toast').hidden = true;
  for (const s of $$('.screen')) s.hidden = s.id !== screen;
  if (screen === 'themes') renderThemes();
  if (screen === 'library') renderLibrary();
  if (screen === 'challenge') renderMissions();
  if (screen === 'songs') renderSongs();
  if (screen === 'instruments') renderInstruments();
  if (screen === 'levels') renderLevels();
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
    const e = ensembleOf(t);
    card.append(el('span', 'tag', `${t.method} · ${t.learn}`));
    card.append(el('span', 'ens-tag', `${e.emoji} ${e.name}`));
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
function openCreate({ themeId = 'bingsu', work = null, mission = null, kind = 'mission', song = null, fresh = false, backTo = 'themes' } = {}) {
  player.stop();
  state.theme = getTheme(themeId);
  state.mission = mission;
  state.missionKind = mission ? kind : null;
  state.song = song ? { song: song.song, level: song.level, result: null } : null;
  if (song) fresh = true;
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
    state.voices = { ...work.voices };
    state.lyrics = work.lyrics || '';
  } else {
    const draft = !fresh && !mission ? store.loadDraft(themeId) : null;
    const useDraft = draft && draft.theme === themeId;
    state.items = useDraft ? draft.items : [];
    state.bpm = useDraft ? draft.bpm : DEFAULT_BPM;
    state.loop = useDraft ? draft.loop : false;
    state.workId = useDraft ? draft.id : null;
    state.title = useDraft ? draft.title : '';
    state.createdAt = useDraft ? draft.createdAt : null;
    state.voices = useDraft ? { ...draft.voices } : {};
    state.lyrics = useDraft ? draft.lyrics || '' : '';
    if (!useDraft && state.theme.bpm) state.bpm = state.theme.bpm; // 랜덤 조합은 조합마다 정한 빠르기
    if (useDraft && draft.items.length) setTimeout(() => toast(`${state.theme.emoji} 만들던 작품을 다시 열었어요`), 300);
    if (song) {
      state.bpm = song.song.bpm;
      setTimeout(() => toast('🎧 먼저 「정답 듣기」로 노래를 들어 봐요'), 300);
    }
  }
  preloadImages();
  setupContainer();
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
  renderSongPanel();
  renderLyricsPanel();
  updatePlayUI();
}

function renderHeader() {
  const t = state.theme;
  $('#createTitle').textContent = state.song
    ? `🎼 ${state.song.song.title}`
    : `${t.emoji} ${state.title || t.name}`;
  $('#createSub').textContent = state.mission
    ? state.missionKind === 'level'
      ? `${state.mission.level}단계: ${state.mission.title}`
      : state.missionKind === 'combo'
        ? `랜덤 조합: ${state.theme.backingName} 반주 위에 악기를 쌓아요`
        : `도전: ${state.mission.title}`
    : state.song
      ? '노래를 듣고 컵에 똑같이 쌓아 봐요!'
      : t.hint;
}

function changed() {
  state.items = state.items.slice();
  if (state.song) state.song.result = null; // 고치면 확인 결과는 다시
  renderCup();
  renderItemPanel();
  renderBand();
  renderMissionPanel();
  renderSongPanel();
  if (!state.mission && !state.song) {
    store.saveDraft({
      id: state.workId, title: state.title, theme: state.theme.id, bpm: state.bpm,
      loop: state.loop, items: state.items, voices: state.voices, createdAt: state.createdAt, lyrics: state.lyrics,
    });
  }
}

// ---------- 재료 목록 ----------
function renderPalette() {
  const p = $('#palette');
  p.replaceChildren();
  for (const ing of state.theme.ingredients) {
    const snd = soundFor(ing.id);
    const inst = INSTRUMENTS[snd.instrument];
    const b = el('button', `ing${state.armedIng === ing.id ? ' armed' : ''}${snd.custom ? ' custom' : ''}`);
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
    const score = el('div', 'row-score'); // 따라 만들기 악보 (그 층 옆에)
    score.hidden = true;
    row.append(label, score);
    for (let c = 0; c < C; c++) {
      const slot = el('div', 'slot');
      slot.dataset.row = r;
      slot.dataset.col = c;
      row.append(slot);
    }
    rows.append(row);
  }
  applyCupShape();
}

// 테마마다 그릇 모양이 달라요 (빙수컵, 피자 도우, 햄버거, 케이크, 콘, 무대, 우주)
function setupContainer() {
  const t = state.theme;
  const cup = $('#cup');
  cup.className = `cup theme-${t.cssClass || t.id}`;
  const img = $('.cup-img', cup);
  img.classList.remove('loaded');
  if (t.containerImage) img.src = `assets/images/${t.id}/${t.containerImage}`;
  else img.removeAttribute('src');
}

// 칸을 그릇 안쪽 모양에 맞춰요. 줄마다 양옆 여백이 달라서(위가 좁거나 아래가 좁거나) 모양을 따라가요.
function applyCupShape() {
  const cup = $('#cup');
  const t = state.theme;
  const hasImg = Boolean(t.cupShape) && !narrowScreen.matches && $('.cup-img', cup).classList.contains('loaded');
  const shape = hasImg ? t.cupShape : t.cssShape;
  cup.classList.toggle('has-img', hasImg);
  cup.classList.toggle('shaped', Boolean(shape));
  const rows = $$('#cupRows .row');
  if (!shape) { rows.forEach((row) => row.style.removeProperty('--inset')); return; }
  const { top, bottom, topInset, bottomInset } = shape;
  const base = Math.min(topInset, bottomInset);
  cup.style.setProperty('--ct', `${top}%`);
  cup.style.setProperty('--cb', `${bottom}%`);
  cup.style.setProperty('--ci', `${base}%`);
  const width = 100 - 2 * base;
  rows.forEach((row, k) => {
    const f = (k + 0.5) / rows.length; // 위(0) → 아래(1)
    const edge = topInset + f * (bottomInset - topInset);
    row.style.setProperty('--inset', `${((edge - base) / width) * 100}%`);
  });
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
    d.append(el('span', 'inst', INSTRUMENTS[soundFor(it.ing).instrument].emoji));
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
  if (state.song) {
    info.textContent = schedule.groups.length
      ? `📜 컵 오른쪽 악보를 보며 쌓아요 · 지금 ${schedule.groups.length}층 / 악보 ${state.song.song.steps.length}층`
      : '📜 컵 오른쪽 악보를 보며 1층부터 쌓아요';
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
  const snd = soundFor(it.ing);
  const inst = INSTRUMENTS[snd.instrument];
  $('#itemPic').replaceChildren(ingPic(ing, 'pic'));
  $('#itemName').textContent = ing.name;
  $('#itemInst').textContent = `${inst.emoji} ${inst.name} · ${snd.sound}`;
  $('#btnItemVoice').dataset.ing = ing.id;
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

// ---------- 악기 고르기 ----------
// 재료마다 어울리는 악기를 학생이 직접 골라요. 고른 악기는 작품과 함께 저장돼요.
let voiceIng = null; // 악기 고르기 창에서 지금 고른 재료
let voiceEns = 'band'; // 악기 고르기 창에서 보고 있는 악단

// 재료가 지금 내는 소리의 악단을 펼쳐 보여 줘요
function showEnsembleOf(ingId) {
  voiceEns = INSTRUMENTS[soundFor(ingId).instrument].ensemble;
}

function openVoiceDialog(ingId) {
  if (!guardEdit()) return;
  voiceIng = ingId || state.selectedId && getItem(state.selectedId)?.ing || state.theme.ingredients[0].id;
  showEnsembleOf(voiceIng);
  renderVoiceDialog();
  $('#voiceDialog').showModal();
}

function renderVoiceDialog() {
  const tabs = $('#voiceIngs');
  tabs.replaceChildren();
  for (const ing of state.theme.ingredients) {
    const snd = soundFor(ing.id);
    const b = el('button', `vi${ing.id === voiceIng ? ' on' : ''}${snd.custom ? ' custom' : ''}`);
    b.type = 'button';
    b.dataset.ing = ing.id;
    b.setAttribute('aria-pressed', String(ing.id === voiceIng));
    b.style.setProperty('--c', ing.color || '#fff');
    b.append(ingPic(ing, 'vi-pic'), el('span', 'vi-name', ing.name), el('span', 'vi-inst', INSTRUMENTS[snd.instrument].emoji));
    tabs.append(b);
  }
  const ing = ingredientOf(state.theme, voiceIng);
  const cur = soundFor(voiceIng);
  $('#voiceFor').textContent = `${ing.emoji} ${ing.name}에 어울리는 악기를 골라요`;
  // 악단 고르기: 이 테마의 악단이 먼저, 다른 악단 악기도 빌려 올 수 있어요
  const ensBox = $('#voiceEns');
  ensBox.replaceChildren();
  const mine = state.theme.ensemble;
  for (const id of [mine, ...ENSEMBLE_ORDER.filter((e) => e !== mine)]) {
    const e = ENSEMBLES[id];
    const b = el('button', `chip ens-chip${id === voiceEns ? ' on' : ''}`, `${e.emoji} ${e.name}${id === mine ? ' (이 테마)' : ''}`);
    b.type = 'button';
    b.dataset.ens = id;
    b.setAttribute('aria-pressed', String(id === voiceEns));
    ensBox.append(b);
  }
  const grid = $('#voiceChoices');
  grid.replaceChildren();
  for (const v of VOICE_LIST.filter((x) => x.ensemble === voiceEns)) {
    const inst = INSTRUMENTS[v.instrument];
    const b = el('button', `vc${v.id === cur.voice ? ' on' : ''}`);
    b.type = 'button';
    b.dataset.voice = v.id;
    b.setAttribute('aria-pressed', String(v.id === cur.voice));
    b.style.setProperty('--c', inst.color);
    b.append(instPic(v.instrument, 'vc-pic'), el('strong', '', inst.name), el('span', 'vc-sound', v.sound));
    if (v.id === ing.voice) b.append(el('span', 'vc-default', '처음 악기'));
    grid.append(b);
  }
  $('#voiceResetAll').disabled = Object.keys(state.voices).length === 0;
}

function setVoice(ingId, voiceId) {
  const ing = ingredientOf(state.theme, ingId);
  const next = { ...state.voices, [ingId]: voiceId };
  state.voices = normalizeVoices(next, state.theme);
  renderPalette();
  changed();
  renderVoiceDialog();
  audio.preview(soundFor(ingId).voice, 1, state.bpm, progOf());
  const v = voiceInfo(voiceId);
  toast(`${ing.emoji} ${ing.name} → ${INSTRUMENTS[v.instrument].emoji} ${INSTRUMENTS[v.instrument].name}`, 1400);
}

$('#btnVoices').addEventListener('click', () => { audio.ensure(); openVoiceDialog(); });
$('#btnItemVoice').addEventListener('click', (e) => openVoiceDialog(e.currentTarget.dataset.ing));
$('#voiceIngs').addEventListener('click', (e) => {
  const b = e.target.closest('.vi');
  if (!b) return;
  voiceIng = b.dataset.ing;
  showEnsembleOf(voiceIng);
  renderVoiceDialog();
  audio.preview(soundFor(voiceIng).voice, 1, state.bpm, progOf());
});
$('#voiceEns').addEventListener('click', (e) => {
  const b = e.target.closest('[data-ens]');
  if (!b) return;
  voiceEns = b.dataset.ens;
  renderVoiceDialog();
});
$('#voiceChoices').addEventListener('click', (e) => {
  const b = e.target.closest('.vc');
  if (b) setVoice(voiceIng, b.dataset.voice);
});
$('#voiceResetAll').addEventListener('click', () => {
  state.voices = {};
  renderPalette();
  changed();
  renderVoiceDialog();
  toast('모든 재료가 처음 악기로 돌아갔어요', 1500);
});
$('#voiceClose').addEventListener('click', () => $('#voiceDialog').close());

// ---------- 우리 악단 ----------
function renderBand() {
  const used = new Set(state.items.map((it) => soundFor(it.ing)?.instrument));
  const ens = ensembleOf(state.theme);
  const own = state.theme.bandInstruments || ens.instruments;
  if (state.theme.backing) used.add(voiceInfo(state.theme.backing).instrument); // 반주 악기는 늘 함께 연주
  $('#bandLabel').textContent = state.theme.bandName ? `우리 악단: ${state.theme.bandName}` : `우리 ${ens.name} ${ens.emoji}`;
  const band = $('#band');
  band.replaceChildren();
  // 이 테마 악단의 악기 + 다른 악단에서 빌려 온 악기
  const list = [...own, ...[...used].filter((id) => id && !own.includes(id))];
  for (const id of list) {
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
  const ok = checkMission(m, state.theme, state.items, state.voices);
  p.classList.toggle('ok', ok);
  const kind = state.missionKind;
  const label = kind === 'level' ? `🪜 단계별 도전 ${m.level}/${STAGES.length}단계` : kind === 'combo' ? '🎲 랜덤 조합 도전' : `🏆 도전 ${'⭐'.repeat(m.stars)}`;
  p.replaceChildren(
    el('p', 'panel-label', label),
    el('strong', 'm-title', kind === 'level' ? `${m.emoji} ${m.level}단계 · ${m.title}` : m.title),
    el('p', 'm-goal', m.goal),
    el('p', 'm-state', ok ? '✅ 조건을 채웠어요! ▶️ 끝까지 들어 보세요.' : `💡 ${m.hint}`),
  );
  if (kind === 'combo') {
    const row = el('div', 'combo-btns');
    const b1 = el('button', 'chip', `🎹 ${state.theme.backingName} 반주 듣기`);
    b1.type = 'button';
    b1.dataset.act = 'backing';
    const b2 = el('button', 'chip', '🎲 다른 조합');
    b2.type = 'button';
    b2.dataset.act = 'reroll';
    row.append(b1, b2);
    p.append(row);
  }
}

$('#missionPanel').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || state.missionKind !== 'combo') return;
  audio.ensure();
  if (b.dataset.act === 'backing') playBacking();
  if (b.dataset.act === 'reroll') startCombo(pickCombo(Math.random, state.theme.combo));
});

// ---------- 단계별 도전 · 랜덤 조합 ----------
function openStage(level) {
  const stage = getStage(level);
  if (!stage) return;
  if (!isStageUnlocked(stage.level, store.loadLevelCleared())) { toast(`🔒 ${stage.level - 1}단계를 먼저 통과해요`); return; }
  openCreate({ themeId: STAGE_THEME, mission: stage, kind: 'level', fresh: true, backTo: 'levels' });
  setTimeout(() => toast(`${stage.emoji} ${stage.level}단계: ${stage.goal}`, 4200), 300);
}

function startCombo(combo) {
  if (!allStagesCleared(store.loadLevelCleared())) { toast('🔒 5단계까지 모두 통과하면 열려요'); return; }
  openCreate({ themeId: comboThemeId(combo.id), mission: comboChallenge(combo), kind: 'combo', fresh: true, backTo: 'levels' });
  setTimeout(() => toast(`🎲 이번 조합은 「${combo.name}」! 🎹 반주를 먼저 들어 봐요`, 3200), 300);
}

// 반주만 들어 보기 (화음 4개 × 4박)
function playBacking() {
  const combo = getCombo(state.theme.combo);
  if (!combo || !guardEdit()) return;
  stopPlay();
  const ok = player.play(backingPreviewItems(combo), { bpm: state.bpm, loop: false, onEnd: () => { clearPlayVisuals(); updatePlayUI(); }, progression: progOf() });
  if (!ok) { toast('😢 이 기기에서는 소리를 낼 수 없어요'); return; }
  updatePlayUI();
  toast(`🎹 ${combo.backingName} 반주를 들어요. 여기에 악기를 쌓으면 함께 연주해요`, 2600);
}

function renderLevels() {
  const cleared = store.loadLevelCleared();
  const list = $('#levelList');
  list.replaceChildren();
  for (const s of STAGES) {
    const open = isStageUnlocked(s.level, cleared);
    const done = cleared.has(s.level);
    const b = el('button', `mission level-card${done ? ' done' : ''}${open ? '' : ' locked'}`);
    b.type = 'button';
    b.dataset.level = s.level;
    b.disabled = !open;
    b.append(
      el('span', 'm-stars', `${s.level}단계 · ${s.learn}`),
      el('strong', '', `${s.emoji} ${s.title}`),
      el('span', 'm-goal', s.goal),
      el('span', 'm-badge', done ? '✅ 통과!' : open ? '도전하기 ▶' : '🔒 앞 단계를 먼저'),
    );
    list.append(b);
  }
  const all = allStagesCleared(cleared);
  const comboDone = store.loadComboDone();
  $('#comboCard').classList.toggle('locked', !all);
  $('#btnCombo').disabled = !all;
  $('#comboState').textContent = all
    ? `5단계를 모두 통과했어요! 반주 위에 다른 악단의 악기를 쌓아요. (성공한 조합 ${COMBOS.filter((c) => comboDone.has(c.id)).length}/${COMBOS.length})`
    : '🔒 5단계까지 모두 통과하면 열려요.';
  $('#comboList').replaceChildren(...COMBOS.map((c) => el('span', `combo-chip${comboDone.has(c.id) ? ' done' : ''}`, `${c.emoji} ${c.name}`)));
  $('#lyricsState').textContent = all
    ? '✅ 열렸어요! 음악 만들기나 랜덤 조합 도전 화면에서 「✍️ 가사 쓰기」를 눌러요.'
    : '🔒 5단계까지 모두 통과하면 내 노래에 가사를 쓸 수 있어요.';
}

$('#levelList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-level]');
  if (!b || b.disabled) return;
  audio.ensure();
  openStage(Number(b.dataset.level));
});
$('#btnCombo').addEventListener('click', () => { audio.ensure(); startCombo(pickCombo()); });

// ---------- 가사 쓰기 (교육용 체크) ----------
// 가사는 이 기기 안에서만 검사하고 작품과 함께 이 기기에만 저장해요. 어디에도 보내지 않아요.
const lyricsUnlocked = () => allStagesCleared(store.loadLevelCleared());

function renderLyricsPanel() {
  const p = $('#lyricsPanel');
  const show = lyricsUnlocked() && !state.song && state.missionKind !== 'level' && state.missionKind !== 'mission';
  p.hidden = !show;
  if (!show) return;
  $('#lyricsShow').textContent = state.lyrics || '아직 가사가 없어요.';
  $('#lyricsShow').classList.toggle('empty', !state.lyrics);
  $('.lbl', $('#btnLyrics')).textContent = state.lyrics ? ' 가사 고치기' : ' 가사 쓰기';
}

function lyricsFeedback(text, cls = '') {
  const m = $('#lyricsMsg');
  m.textContent = text;
  m.className = `lyrics-msg ${cls}`;
}

function updateLyricsCount() {
  const n = [...$('#lyricsInput').value.replace(/\n/g, '')].length;
  $('#lyricsCount').textContent = `${n}/${LYRICS_MAX}`;
  $('#lyricsCount').classList.toggle('over', n > LYRICS_MAX);
}

$('#btnLyrics').addEventListener('click', () => {
  if (!lyricsUnlocked()) { toast('🔒 5단계까지 모두 통과하면 가사를 쓸 수 있어요'); return; }
  if (!guardEdit()) return;
  $('#lyricsInput').value = state.lyrics;
  lyricsFeedback('');
  updateLyricsCount();
  resetLyricIdeas();
  $('#lyricsDialog').showModal();
  $('#lyricsTopic').focus();
});

// ---------- 가사 도우미: 주제를 말하면 내 음악에 맞는 가사 제안 ----------
// 이 기기 안에서 단어 꾸러미와 틀로 만들어요 (인터넷·AI 서비스를 쓰지 않아요). 주제·내용은 저장하지 않아요.
const ideas = { seed: 1, key: '' };
const currentShape = () => musicShape({ items: state.items, bpm: state.bpm, progression: progOf() });

function shapeText(sh) {
  return `🎵 내 음악: 빠르기 ${sh.bpm} · ${sh.moodEmoji} ${sh.moodName} 느낌 · ${sh.lines}줄 · 한 줄에 ${sh.syllables}글자`;
}

function ideaFeedback(text, cls = '') {
  const m = $('#lyricsIdeaMsg');
  m.textContent = text;
  m.className = `lyrics-msg ${cls}`;
}

function resetLyricIdeas() {
  $('#lyricsShape').textContent = shapeText(currentShape());
  $('#lyricsIdeas').replaceChildren();
  $('#lyricsMore').hidden = true;
  ideaFeedback('');
}

function showLyricIdeas(more = false) {
  const topic = $('#lyricsTopic').value;
  const content = $('#lyricsContent').value;
  const shape = currentShape();
  const key = `${topic}|${content}|${shape.lines}|${shape.syllables}|${shape.mood}`;
  ideas.seed = more && key === ideas.key ? ideas.seed + 1 : 1;
  ideas.key = key;
  const r = suggestLyrics({ topic, content, shape, seed: ideas.seed, count: 3, themeId: state.theme.id });
  $('#lyricsShape').textContent = shapeText(shape);
  const list = $('#lyricsIdeas');
  list.replaceChildren();
  if (!r.ok || !r.suggestions.length) {
    $('#lyricsMore').hidden = true;
    ideaFeedback(r.ok ? '🤔 이 주제로는 가사를 못 만들었어요. 다른 주제로 해 볼까요?' : r.message, 'bad');
    return;
  }
  ideaFeedback(`「${r.topic}」 노래 가사예요. 마음에 드는 걸 누르면 아래 칸에 들어가요.`);
  r.suggestions.forEach((sg, i) => {
    const b = el('button', 'lh-idea');
    b.type = 'button';
    b.dataset.text = sg.text;
    b.append(el('span', 'lh-no', sg.rhyme ? `제안 ${i + 1} · 끝소리 ${sg.rhyme}` : `제안 ${i + 1}`));
    for (const line of sg.lines) {
      const row = el('span', 'lh-line', line);
      row.append(el('i', '', `${shape.syllables}글자`));
      b.append(row);
    }
    b.append(el('span', 'lh-use', '👆 눌러서 가사 칸에 넣기'));
    list.append(b);
  });
  $('#lyricsMore').hidden = false;
}

$('#lyricsSuggest').addEventListener('click', () => showLyricIdeas(false));
$('#lyricsMore').addEventListener('click', () => showLyricIdeas(true));
for (const id of ['#lyricsTopic', '#lyricsContent']) {
  $(id).addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); showLyricIdeas(false); } });
}
$('#lyricsIdeas').addEventListener('click', (e) => {
  const b = e.target.closest('.lh-idea');
  if (!b) return;
  $('#lyricsInput').value = b.dataset.text;
  updateLyricsCount();
  lyricsFeedback('✏️ 가사 칸에 넣었어요! 내 말로 바꿔도 좋아요. 다 되면 「✅ 체크하고 붙이기」를 눌러요.');
  $('#lyricsInput').focus();
});
$('#lyricsInput').addEventListener('input', () => { updateLyricsCount(); lyricsFeedback(''); });
$('#lyricsCancel').addEventListener('click', () => $('#lyricsDialog').close());
$('#lyricsClear').addEventListener('click', () => {
  state.lyrics = '';
  $('#lyricsDialog').close();
  changed();
  renderLyricsPanel();
  toast('🧽 가사를 지웠어요', 1500);
});
$('#lyricsOk').addEventListener('click', () => {
  const r = checkLyrics($('#lyricsInput').value);
  if (!r.ok) { lyricsFeedback(r.message, 'bad'); return; }
  state.lyrics = r.text;
  $('#lyricsDialog').close();
  changed();
  renderLyricsPanel();
  toast(r.message, 2000);
});

// ---------- 미리 듣기 ----------
function previewIng(ingId, beats = 1) {
  if (player.state === 'paused') { player.stop(); updatePlayUI(); }
  if (player.state === 'playing') return; // 연주 중엔 섞이지 않게
  const snd = soundFor(ingId);
  audio.preview(snd.voice, beats, state.bpm, progOf());
  const m = $(`#band .member[data-inst="${snd.instrument}"]`);
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
    toast(`${state.theme.emoji} 재료를 먼저 ${state.theme.container}에 올려요`);
    return;
  }
  state.armedIng = null;
  state.selectedId = null;
  renderPalette();
  renderCup();
  renderItemPanel();
  const ok = player.play(state.items, { bpm: state.bpm, loop: state.loop, onEnd: onPlayEnd, progression: progOf(), backing: state.theme.backing });
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
  if (!m || !checkMission(m, state.theme, state.items, state.voices)) return;
  if (state.missionKind === 'level') {
    const before = store.loadLevelCleared();
    const cleared = store.markLevelCleared(m.level);
    if (m.level < STAGES.length) {
      showDone(`🪜 ${m.level}단계 통과!`, `「${m.title}」을(를) 해냈어요! 이제 ${m.level + 1}단계가 열렸어요.`, {
        mission: true, next: { label: `➡️ ${m.level + 1}단계 도전`, run: () => openStage(m.level + 1) },
      });
    } else {
      const first = !allStagesCleared(before) && allStagesCleared(cleared);
      showDone('🌟 5단계 모두 통과!', `${first ? '🎲 랜덤 조합 도전과 ✍️ 가사 쓰기가 열렸어요! ' : ''}이제 다른 악기 조합으로 도전해 봐요.`, {
        mission: true, next: { label: '🎲 랜덤 조합 도전', run: () => startCombo(pickCombo()) },
      });
    }
    return;
  }
  if (state.missionKind === 'combo') {
    store.markComboDone(state.theme.combo);
    showDone('🎲 조합 완성!', `「${state.theme.name}」 조합으로 멋진 음악을 만들었어요! 💾 저장하고 ✍️ 가사도 써 봐요.`, {
      next: { label: '🎲 다른 조합 도전', run: () => startCombo(pickCombo(Math.random, state.theme.combo)) },
    });
    return;
  }
  store.markMissionDone(m.id);
  showDone('🏆 미션 성공!', `「${m.title}」 도전을 해냈어요! ${'⭐'.repeat(m.stars)}`, { mission: true });
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
      if (on) playingInst.add(soundFor(d.dataset.ing).instrument);
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
    voices: state.voices,
    lyrics: state.lyrics,
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

let doneNext = null;
function showDone(title, text, { mission = false, next = null } = {}) {
  $('#doneTitle').textContent = title;
  $('#doneText').textContent = text;
  $('#doneLibrary').hidden = mission;
  doneNext = next;
  $('#doneNext').hidden = !next;
  if (next) $('#doneNext').textContent = next.label;
  $('#doneDialog').showModal();
}
$('#doneNext').addEventListener('click', () => {
  const n = doneNext;
  $('#doneDialog').close();
  doneNext = null;
  n?.run();
});
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
        line.append(pic(theme.noImages ? null : imagePath(theme.id, ing.id), ing.emoji, 'ws-pic'));
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
    if (w.lyrics) info.append(el('p', 'work-lyrics', `🎤 ${w.lyrics}`));
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

// ---------- 노래 따라 만들기 ----------
function levelInfo(level) {
  return LEVELS.find((l) => l.level === level) || LEVELS[0];
}

function renderSongs() {
  const done = store.loadSongDone();
  const theme = getTheme('bingsu');
  const list = $('#songList');
  list.replaceChildren();
  for (const s of SONGS) {
    const card = el('article', 'song-card');
    card.dataset.song = s.id;
    const head = el('div', 'song-head');
    head.append(el('span', 'm-stars', '⭐'.repeat(s.stars)), el('strong', 'song-name', s.title));
    const listen = el('button', 'chip song-try', '🎧 들어보기');
    listen.type = 'button';
    listen.dataset.act = 'listen';
    head.append(listen);
    const meta = el('p', 'song-meta', `${s.steps.length}층 · ${songBeats(s)}박 · 빠르기 ${s.bpm}`);
    // 쓰인 재료 미리 보기 (아래층부터)
    const icons = el('div', 'song-icons');
    for (const step of s.steps) for (const [ing] of step) {
      const i = ingredientOf(theme, ing);
      icons.append(pic(imagePath(theme.id, i.id), i.emoji, 'ws-pic'));
    }
    const levels = el('div', 'song-levels');
    for (const L of LEVELS) {
      const ok = done.has(`${s.id}:${L.level}`);
      const b = el('button', `song-level${ok ? ' done' : ''}`);
      b.type = 'button';
      b.dataset.level = L.level;
      b.append(el('span', 'sl-icon', ok ? '✅' : L.icon), el('b', '', L.name), el('span', 'sl-desc', L.desc));
      levels.append(b);
    }
    card.append(head, el('p', 'song-desc', s.desc), meta, icons, levels);
    list.append(card);
  }
}

$('#songList').addEventListener('click', (e) => {
  const card = e.target.closest('.song-card');
  if (!card) return;
  const song = getSong(card.dataset.song);
  audio.ensure();
  if (e.target.closest('[data-act="listen"]')) { playSong(song); return; }
  const lv = e.target.closest('.song-level');
  if (lv) openCreate({ themeId: song.theme, song: { song, level: Number(lv.dataset.level) }, backTo: 'songs' });
});

// 정답 노래 연주 (컵에 놓인 재료와 상관없이)
function playSong(song) {
  player.stop();
  clearPlayVisuals();
  const theme = getTheme(song.theme);
  const ok = player.play(songItems(song, theme), { bpm: song.bpm, loop: false, onEnd: () => { updatePlayUI(); }, progression: progOf(theme) });
  if (!ok) { toast('😢 이 기기에서는 소리를 낼 수 없어요'); return; }
  toast(`🎧 정답 노래 「${song.title}」`, 1600);
  updatePlayUI();
  // 따라 만들기 화면이면 지금 연주하는 층(과 그 옆 악보)을 반짝여요
  if (state.screen === 'create') requestAnimationFrame(animate);
}

const REASON_TEXT = {
  ok: '맞아요!',
  missing: '아직 없어요',
  extra: '정답보다 층이 많아요',
  instrument: '악기가 달라요',
  length: '길이가 달라요',
};

function reasonText(step) {
  if (step.reason === 'length') return step.hint === 'longer' ? '길이가 달라요 · 더 길게!' : '길이가 달라요 · 더 짧게!';
  if (step.reason === 'instrument' && step.countDiff > 0) return '악기가 모자라요';
  if (step.reason === 'instrument' && step.countDiff < 0) return '악기가 너무 많아요';
  return REASON_TEXT[step.reason];
}

function renderSongPanel() {
  const p = $('#songPanel');
  const s = state.song;
  p.hidden = !s;
  if (!s) { renderInlineScore(); return; }
  const L = levelInfo(s.level);
  $('#songLevel').textContent = `🎼 따라 만들기 · ${L.icon} ${L.name} ${'⭐'.repeat(s.song.stars)}`;
  $('#songTitle').textContent = s.song.title;
  const r = s.result;
  p.classList.toggle('ok', Boolean(r?.allOk));
  const wrong = r ? r.steps.filter((st) => !st.ok).map((st) => `${st.index + 1}층 ${reasonText(st)}`) : [];
  $('#songState').textContent = r
    ? (r.allOk ? '🎉 정답 노래와 똑같아요!' : `${r.total}층 중 ${r.correct}층이 맞았어요. ❌ ${wrong.join(' · ')}`)
    : `컵 옆 악보를 보며 쌓아요. ${L.desc}`;
  renderInlineScore();
}

// 악보를 컵 옆, 같은 층 높이에 바로 보여 줘요 (1층 악보 = 컵 1층 옆)
function renderInlineScore() {
  const s = state.song;
  createScreen.classList.toggle('song-mode', Boolean(s));
  const r = s?.result;
  for (const row of $$('#cupRows .row')) {
    const i = Number(row.dataset.row);
    const box = $('.row-score', row);
    row.classList.remove('res-ok', 'res-bad');
    const step = s?.song.steps[i];
    const res = r?.steps[i];
    if (!s || (!step && !res)) { box.hidden = true; continue; }
    box.hidden = false;
    box.replaceChildren();
    box.className = `row-score${res ? (res.ok ? ' ok' : ' bad') : ''}`;
    box.dataset.reason = res ? `${i + 1}층 ${res.ok ? '✅ ' : '❌ '}${reasonText(res)}` : '';
    if (res) row.classList.add(res.ok ? 'res-ok' : 'res-bad');
    // 맨 위 악보 줄 위에 "📜 악보" 제목
    const top = Math.max(s.song.steps.length, r ? r.steps.length : 0) - 1;
    if (i === top) box.append(el('span', 'rs-head', '📜 악보'));
    const no = el('span', 'rs-no', String(i + 1));
    no.append(el('small', '', '층'));
    box.append(no);
    if (res) box.append(el('span', 'rs-mark', res.ok ? '✅' : '❌'));
    if (!step) { box.append(el('span', 'rs-q', '없는 층')); continue; }
    for (const [ingId, size] of step) {
      const ing = ingredientOf(state.theme, ingId);
      const note = el('span', 'rs-note');
      if (s.level === 1) {
        note.append(ingPic(ing, 'sn-pic'), el('b', 'rs-beat', sizeOf(size).short));
        note.title = `${ing.name} ${sizeOf(size).short}`;
      } else if (s.level === 2) {
        note.append(instPic(ing.instrument, 'sn-pic'), el('b', 'rs-beat', '?'));
      } else {
        note.append(el('span', 'rs-q', '❓'));
      }
      box.append(note);
    }
  }
}

// 악보 줄을 누르면 그 층의 결과를 알려 줘요
$('#cupRows').addEventListener('click', (e) => {
  const box = e.target.closest('.row-score');
  if (!box) return;
  if (box.dataset.reason) toast(box.dataset.reason, 2000);
  else if (state.song?.level === 1) toast(`${Number(box.closest('.row').dataset.row) + 1}층: ${box.textContent.replace(/\s+/g, ' ')}`, 1600);
});

function checkSong() {
  const s = state.song;
  if (!s) return;
  if (!state.items.length) { toast('🍧 재료를 먼저 컵에 쌓아요'); return; }
  s.result = compareToSong(s.song, state.theme, state.items, state.voices);
  renderSongPanel();
  if (s.result.allOk) {
    store.markSongDone(s.song.id, s.level);
    sparkle();
    showDone('🎼 똑같아요!', `「${s.song.title}」을(를) ${levelInfo(s.level).name} 완성했어요! ${'⭐'.repeat(s.song.stars)}`, { mission: true });
  } else {
    const first = s.result.steps.find((st) => !st.ok);
    toast(`${s.result.total}층 중 ${s.result.correct}층 맞았어요 · ${first.index + 1}층: ${reasonText(first)}`, 2600);
  }
}

$('#btnSongListen').addEventListener('click', () => { audio.ensure(); playSong(state.song.song); });
$('#btnSongCheck').addEventListener('click', () => { if (guardEdit()) checkSong(); });

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
let demoEns = 'band'; // 악기 소리 체험: 보고 있는 악단

function renderInstruments() {
  // 악단 고르기 (테마마다 악단이 달라요)
  const tabs = $('#ensTabs');
  tabs.replaceChildren();
  for (const id of ENSEMBLE_ORDER) {
    const e = ENSEMBLES[id];
    const t = THEMES.find((x) => x.ensemble === id);
    const b = el('button', `ens-tab${id === demoEns ? ' on' : ''}`);
    b.type = 'button';
    b.dataset.ens = id;
    b.setAttribute('aria-pressed', String(id === demoEns));
    b.append(el('span', 'et-emoji', e.emoji), el('b', '', e.name), el('span', 'et-theme', `${t.emoji} ${t.name.replace(' 만들기', '')}`));
    tabs.append(b);
  }
  const theme = THEMES.find((x) => x.ensemble === demoEns);
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
  for (const id of ENSEMBLES[demoEns].instruments) {
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

$('#ensTabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-ens]');
  if (!b) return;
  demoEns = b.dataset.ens;
  renderInstruments();
});

$('#lenPick').addEventListener('click', (e) => {
  const b = e.target.closest('[data-level]');
  if (!b) return;
  demoLevel = Number(b.dataset.level);
  renderInstruments();
});

$('#instGrid').addEventListener('click', (e) => {
  const b = e.target.closest('.inst-ing');
  if (!b) return;
  audio.preview(b.dataset.voice, sizeOf(demoLevel).beats, DEFAULT_BPM, ENSEMBLES[demoEns].progression);
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
