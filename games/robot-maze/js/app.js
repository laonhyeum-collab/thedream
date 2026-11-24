// 화면 연결: 단계표 불러오기 → 단계 고르기 → 블록 놓기 → 실행(한 칸씩 보기) → 성공
import {
  COMMANDS, validateLevelSet, runProgram, stepView, resultMessage, starRating, safeSetName,
} from './game.js';
import DEFAULT_LEVELS from './default-levels.js';

const STEP_MS = matchMedia('(prefers-reduced-motion: reduce)').matches ? 180 : 450;
const SAVE_KEY = 'robot-maze-progress-v1';
const $ = (id) => document.getElementById(id);
const screens = { start: $('start'), play: $('play') };

let levelSet = validateLevelSet(DEFAULT_LEVELS).set;
let setName = 'levels';
let level = null;          // 지금 단계
let program = [];          // 놓은 명령 블록
let trace = null;          // 실행 기록
let shown = 0;             // 실행 기록에서 몇 칸까지 보여 줬는지
let mode = 'edit';         // edit | run | step | done
let timer = 0;
let progress = loadProgress();

/* ---------- 진행 기록 (선택: 저장이 막혀 있어도 게임은 그대로 돼요) ---------- */
function loadProgress() {
  try {
    const v = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}
function saveProgress() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch { /* 저장 안 돼도 괜찮아요 */ }
}
const progressKey = (n) => `${setName}:${n}`;

/* ---------- 단계표 불러오기 ---------- */
function notice(text) {
  const el = $('notice');
  el.textContent = text;
  el.hidden = !text;
}

async function loadSet() {
  const param = new URLSearchParams(location.search).get('set');
  const name = param === null ? 'levels' : safeSetName(param);
  if (!name) {
    notice('단계표 이름이 올바르지 않아서 기본 단계로 할게요.');
    return;
  }
  try {
    const res = await fetch(`./data/${name}.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const r = validateLevelSet(await res.json());
    if (!r.ok) {
      notice(`단계표(${name}.json)에 고칠 곳이 있어 기본 단계로 할게요: ${r.errors[0]}`);
      return;
    }
    levelSet = r.set;
    setName = name;
  } catch {
    if (location.protocol !== 'file:') notice(`단계표(${name}.json)를 불러오지 못해서 기본 단계로 할게요.`);
  }
}

/* ---------- 그림 ---------- */
const ROBOT_SVG = `
<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <rect x="29" y="3" width="6" height="9" rx="2" fill="#24345c"/>
  <circle cx="32" cy="4" r="4" fill="#ff5d73"/>
  <rect x="10" y="11" width="44" height="30" rx="7" fill="#ffb627" stroke="#24345c" stroke-width="3"/>
  <rect x="18" y="19" width="10" height="10" rx="2" fill="#24345c"/>
  <rect x="38" y="19" width="10" height="10" rx="2" fill="#24345c"/>
  <rect x="21" y="21" width="4" height="4" fill="#fff"/>
  <rect x="44" y="21" width="4" height="4" fill="#fff"/>
  <rect x="24" y="33" width="16" height="3" rx="1.5" fill="#24345c"/>
  <rect x="16" y="43" width="32" height="15" rx="4" fill="#3a7bd5" stroke="#24345c" stroke-width="3"/>
  <circle cx="26" cy="50" r="3" fill="#fff"/>
  <circle cx="38" cy="50" r="3" fill="#ffb627"/>
  <rect x="5" y="44" width="9" height="8" rx="3" fill="#ffb627" stroke="#24345c" stroke-width="2.5"/>
  <rect x="50" y="44" width="9" height="8" rx="3" fill="#ffb627" stroke="#24345c" stroke-width="2.5"/>
</svg>`;

let tiles = new Map();   // "r,c" → 별 요소
let robotEl = null;

function buildBoard() {
  const board = $('board');
  board.replaceChildren();
  board.style.setProperty('--cols', level.cols);
  board.style.setProperty('--rows', level.rows);
  board.setAttribute('aria-label',
    `교실 지도 ${level.rows}줄 ${level.cols}칸. 별 ${level.stars.length}개. ${describeMap()}`);
  tiles = new Map();
  level.map.forEach((line, r) => {
    [...line].forEach((ch, c) => {
      const t = document.createElement('div');
      t.className = 'tile';
      if ((r + c) % 2) t.classList.add('alt');
      if (ch === 'D') t.classList.add('desk');
      if (ch === 'L') t.classList.add('locker');
      if (ch === 'S') t.classList.add('start');
      if (ch === 'G') t.textContent = '🚩';
      if (ch === '*') {
        const s = document.createElement('span');
        s.className = 'star';
        s.textContent = '⭐';
        t.append(s);
        tiles.set(`${r},${c}`, s);
      }
      board.append(t);
    });
  });
  robotEl = document.createElement('div');
  robotEl.className = 'robot';
  robotEl.innerHTML = ROBOT_SVG;
  board.append(robotEl);
}

function describeMap() {
  const p = (q) => `위에서 ${q.r + 1}째 줄 왼쪽에서 ${q.c + 1}째 칸`;
  const stars = level.stars.map((s, i) => `별${i + 1} ${p(s)}`).join(', ');
  return `로봇은 ${p(level.start)}, 깃발은 ${p(level.goal)}${stars ? `, ${stars}` : ''}.`;
}

function renderProgram(view) {
  const list = $('program');
  const items = program.map((cmd, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'block';
    b.textContent = COMMANDS[cmd].arrow;
    b.dataset.index = String(i);
    let state = '';
    if (view) {
      if (i === view.wrong) { b.classList.add('wrong'); state = ', 틀린 블록'; }
      else if (i === view.active) { b.classList.add('active'); state = ', 지금 실행'; }
      else if (i < view.active) b.classList.add('passed');
      else if (view.done && trace && i >= trace.used) b.classList.add('skipped');
    }
    b.setAttribute('aria-label', `${i + 1}번째 블록 ${COMMANDS[cmd].label}${state}. 누르면 빠져요`);
    b.disabled = mode === 'run';
    b.addEventListener('click', () => removeAt(i));
    li.append(b);
    return li;
  });
  list.replaceChildren(...items);
  $('count').textContent = `${program.length}/${level.maxBlocks}`;
}

function render() {
  const view = trace ? stepView(level, trace, shown) : null;
  const pos = view ? view.pos : level.start;
  robotEl.style.setProperty('--r', pos.r);
  robotEl.style.setProperty('--c', pos.c);
  const lastCmd = view && view.active >= 0 ? program[view.active] : null;
  if (lastCmd === 'left') robotEl.classList.add('face-left');
  else if (lastCmd === 'right' || !view) robotEl.classList.remove('face-left');
  robotEl.classList.toggle('bump', Boolean(view && view.bump));
  robotEl.classList.toggle('happy', Boolean(view && view.done && trace.result === 'success'));
  const got = new Set(view ? view.stars : []);
  for (const [k, el] of tiles) el.classList.toggle('got', got.has(k));
  renderProgram(view);
  renderControls();
}

function renderControls() {
  const busy = mode === 'run';
  for (const b of document.querySelectorAll('.cmd')) b.disabled = busy || program.length >= level.maxBlocks;
  $('run').disabled = busy || !program.length;
  $('undo').disabled = busy || !program.length;
  $('clear').disabled = busy || !program.length;
  $('step').disabled = busy || !program.length;
  $('step').textContent = mode === 'step' ? '다음 칸 ▶' : mode === 'done' && trace && trace.result !== 'success' ? '한 칸씩 보기' : '한 칸씩';
}

function say(text, kind = '') {
  const el = $('message');
  el.textContent = text;
  el.className = `message ${kind}`;
}

/* ---------- 블록 놓기 ---------- */
function resetRun() {
  clearInterval(timer);
  trace = null;
  shown = 0;
  mode = 'edit';
}

function addBlock(cmd) {
  if (mode === 'run' || program.length >= level.maxBlocks) return;
  resetRun();
  program.push(cmd);
  say(program.length >= level.maxBlocks ? `블록은 ${level.maxBlocks}개까지 놓을 수 있어요.` : '');
  render();
}

function removeAt(i) {
  if (mode === 'run') return;
  resetRun();
  program.splice(i, 1);
  say('');
  render();
  const blocks = document.querySelectorAll('.block');
  (blocks[Math.min(i, blocks.length - 1)] || document.querySelector('.cmd')).focus();
}

/* ---------- 실행 ---------- */
function startTrace() {
  resetRun();
  trace = runProgram(level, program);
  shown = 0;
}

function finish() {
  clearInterval(timer);
  mode = 'done';
  render();
  const msg = resultMessage(level, trace);
  if (trace.result === 'success') {
    say(msg, 'good');
    const stars = starRating(level, trace.used);
    const k = progressKey(level.number);
    progress[k] = Math.max(progress[k] || 0, stars);
    saveProgress();
    setTimeout(() => showCleared(stars, msg), STEP_MS + 200);
  } else {
    say(msg, 'bad');
  }
}

function run() {
  if (mode === 'run' || !program.length) return;
  startTrace();
  mode = 'run';
  say('로봇이 블록을 차례대로 실행해요…', 'info');
  render();
  timer = setInterval(() => {
    shown++;
    if (shown >= trace.steps.length) finish();
    else render();
  }, STEP_MS);
}

function step() {
  if (mode === 'run' || !program.length) return;
  if (mode !== 'step') {
    startTrace();
    mode = 'step';
    say('한 칸씩 볼게요. "다음 칸"을 누를 때마다 블록 하나를 실행해요.', 'info');
    render();
    return;
  }
  shown++;
  if (shown >= trace.steps.length) { finish(); return; }
  const s = trace.steps[shown - 1];
  say(`${s.index + 1}번째 블록: ${COMMANDS[s.cmd].label} 한 칸${s.star ? ' — 별을 모았어요!' : ''}`, 'info');
  render();
}

/* ---------- 성공 창 ---------- */
function showCleared(stars, msg) {
  const last = level.number === levelSet.levels.length;
  $('rating').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('cleared-h').textContent = last ? '모든 단계를 끝냈어요!' : `${level.number}단계 성공!`;
  $('cleared-msg').textContent = msg;
  $('next').hidden = last;
  $('cleared').hidden = false;
  $('cleared-h').focus();
}

function hideCleared() {
  $('cleared').hidden = true;
}

/* ---------- 화면 바꾸기 ---------- */
function show(name) {
  for (const [k, el] of Object.entries(screens)) el.hidden = k !== name;
}

function renderLevels() {
  const box = $('levels');
  const btns = levelSet.levels.map((lv) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'level';
    const got = progress[progressKey(lv.number)] || 0;
    if (got) b.classList.add('done');
    const title = document.createElement('b');
    title.textContent = `${lv.number}단계`;
    const sub = document.createElement('span');
    sub.textContent = got ? `${lv.name} ${'★'.repeat(got)}` : lv.name;
    b.append(title, sub);
    b.setAttribute('aria-label', `${lv.number}단계 ${lv.name}${got ? `, 별 ${got}개 받음` : ''}`);
    b.addEventListener('click', () => openLevel(lv.number));
    return b;
  });
  box.replaceChildren(...btns);
}

function openLevel(n) {
  hideCleared();
  level = levelSet.levels[n - 1];
  program = [];
  resetRun();
  $('level-h').textContent = `${level.number}단계 · ${level.name}`;
  $('tip').textContent = level.tip || '별을 모두 모으고 깃발에 가요.';
  buildBoard();
  say('');
  render();
  show('play');
  document.querySelector('.cmd').focus();
}

function toStart() {
  resetRun();
  hideCleared();
  renderLevels();
  show('start');
  const btn = level && document.querySelectorAll('.level')[level.number - 1];
  (btn || document.querySelector('.level'))?.focus();
}

/* ---------- 연결 ---------- */
for (const b of document.querySelectorAll('.cmd')) {
  b.addEventListener('click', () => addBlock(b.dataset.cmd));
}
$('run').addEventListener('click', run);
$('step').addEventListener('click', step);
$('undo').addEventListener('click', () => { if (program.length) removeAt(program.length - 1); });
$('clear').addEventListener('click', () => {
  if (mode === 'run') return;
  resetRun();
  program = [];
  say('');
  render();
  document.querySelector('.cmd').focus();
});
$('to-start').addEventListener('click', toStart);
$('retry').addEventListener('click', () => openLevel(level.number));
$('next').addEventListener('click', () => openLevel(Math.min(level.number + 1, levelSet.levels.length)));

// 키보드: 화살표 키로 블록 놓기, Backspace 로 하나 빼기, Enter 는 버튼 그대로
document.addEventListener('keydown', (e) => {
  if (screens.play.hidden || !$('cleared').hidden || e.altKey || e.ctrlKey || e.metaKey) return;
  const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  if (map[e.key]) { e.preventDefault(); addBlock(map[e.key]); }
  else if (e.key === 'Backspace' && program.length) { e.preventDefault(); removeAt(program.length - 1); }
});

await loadSet();
$('title').textContent = levelSet.title;
document.title = levelSet.title;
renderLevels();
show('start');
