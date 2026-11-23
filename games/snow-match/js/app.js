// 화면 연결: 문제표 불러오기 → 난이도 고르기 → 카드 판 → 끝 화면
import {
  DIFFICULTY, validateCardSet, pickPairs, MatchGame, formatTime, summaryLine, safeSetName,
} from './game.js';

// 문제표 파일을 못 읽을 때(예: 파일을 더블클릭해서 열었을 때) 쓰는 기본 카드
const FALLBACK = {
  title: '눈송이 짝 맞추기',
  pairs: [
    { a: '눈송이', b: '❄️', bLabel: '눈송이 그림', type: '겨울' },
    { a: '눈사람', b: '☃️', bLabel: '눈사람 그림', type: '겨울' },
    { a: '장갑', b: '🧤', bLabel: '장갑 그림', type: '겨울' },
    { a: '목도리', b: '🧣', bLabel: '목도리 그림', type: '겨울' },
    { a: '썰매', b: '🛷', bLabel: '썰매 그림', type: '겨울' },
    { a: '스케이트', b: '⛸️', bLabel: '스케이트 그림', type: '겨울' },
    { a: '순차', b: '차례대로 한 줄씩 실행', type: '코딩' },
    { a: '반복', b: '같은 일을 여러 번', type: '코딩' },
  ],
};

const MISS_DELAY = 1000;
const $ = (id) => document.getElementById(id);
const screens = { start: $('start'), play: $('play'), win: $('win') };

let cardSet = validateCardSet(FALLBACK).set;
let level = 'normal';
let game = null;
let buttons = [];
let missTimer = 0;
let tick = 0;
let startedAt = 0;
let elapsed = 0;

function show(name) {
  for (const [k, el] of Object.entries(screens)) el.hidden = k !== name;
}

function notice(text) {
  const el = $('notice');
  el.textContent = text;
  el.hidden = !text;
}

async function loadSet() {
  const param = new URLSearchParams(location.search).get('set');
  const name = param === null ? 'cards' : safeSetName(param);
  if (!name) {
    notice('문제표 이름이 올바르지 않아서 기본 카드로 할게요.');
    return;
  }
  try {
    const res = await fetch(`./data/${name}.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const r = validateCardSet(await res.json());
    if (!r.ok) {
      notice(`문제표(${name}.json)에 고칠 곳이 있어 기본 카드로 할게요: ${r.errors[0]}`);
      return;
    }
    cardSet = r.set;
  } catch {
    notice(`문제표(${name}.json)를 불러오지 못해서 기본 카드로 할게요.`);
  }
}

function applyTitle() {
  $('title').textContent = cardSet.title;
  document.title = cardSet.title;
  const n = cardSet.pairs.length;
  for (const btn of document.querySelectorAll('.level')) {
    const want = DIFFICULTY[btn.dataset.level].pairs;
    const real = Math.min(want, n);
    btn.querySelector('span').textContent = `${real}쌍 · 카드 ${real * 2}장`;
  }
}

function stopClock() {
  cancelAnimationFrame(tick);
  tick = 0;
}

function runClock() {
  elapsed = (performance.now() - startedAt) / 1000;
  $('time').textContent = formatTime(elapsed);
  tick = requestAnimationFrame(runClock);
}

function updateHud() {
  $('moves').textContent = game.moves;
  $('found').textContent = `${game.matched}/${game.pairCount}`;
}

function cardName(card) {
  if (card.matched) return `${card.label}, 짝 찾음`;
  if (card.faceUp) return `${card.label}, 뒤집힘`;
  return `카드 ${card.index + 1}, 덮여 있음`;
}

function paint(i) {
  const card = game.cards[i];
  const btn = buttons[i];
  btn.classList.toggle('up', card.faceUp || card.matched);
  btn.classList.toggle('matched', card.matched);
  btn.setAttribute('aria-label', cardName(card));
  btn.setAttribute('aria-disabled', String(card.matched));
}

function newGame() {
  clearTimeout(missTimer);
  stopClock();
  elapsed = 0;
  const pairs = pickPairs(cardSet.pairs, DIFFICULTY[level].pairs);
  game = new MatchGame(pairs);
  const board = $('board');
  board.replaceChildren();
  board.dataset.count = String(game.cards.length);
  buttons = game.cards.map((card, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card';
    btn.dataset.index = String(i);
    const face = document.createElement('span');
    face.className = 'face';
    face.textContent = card.text;
    if ([...card.text].length <= 3 && !/[가-힣a-z0-9]/i.test(card.text)) face.classList.add('emoji');
    else if (card.text.length > 6) face.classList.add('long');
    face.setAttribute('aria-hidden', 'true');
    const back = document.createElement('span');
    back.className = 'back';
    back.textContent = '❄';
    back.setAttribute('aria-hidden', 'true');
    btn.append(back, face);
    btn.addEventListener('click', () => onFlip(i));
    board.append(btn);
    return btn;
  });
  buttons.forEach((_, i) => paint(i));
  $('time').textContent = '0:00';
  $('live').textContent = '';
  updateHud();
  show('play');
  buttons[0]?.focus();
}

function onFlip(i) {
  const wasStarted = game.started;
  const r = game.flip(i);
  if (r.type === 'ignored') return;
  clearTimeout(missTimer);
  if (!wasStarted) {
    startedAt = performance.now();
    runClock();
  }
  for (const k of r.hidden) paint(k);
  paint(i);
  updateHud();
  const card = game.cards[i];
  if (r.type === 'flip') {
    $('live').textContent = card.label;
  } else if (r.type === 'miss') {
    $('live').textContent = `${card.label}. 짝이 아니에요.`;
    r.pair.forEach((k) => buttons[k].classList.add('miss'));
    missTimer = setTimeout(() => {
      const hidden = game.hideMiss();
      hidden.forEach((k) => { buttons[k].classList.remove('miss'); paint(k); });
    }, MISS_DELAY);
  } else {
    r.pair.forEach((k) => paint(k));
    $('live').textContent = `${card.label}. 짝을 찾았어요!`;
  }
  for (const k of r.hidden) buttons[k].classList.remove('miss');
  if (r.type === 'win') finish();
}

function finish() {
  stopClock();
  elapsed = (performance.now() - startedAt) / 1000;
  $('time').textContent = formatTime(elapsed);
  $('summary').textContent = summaryLine(game.pairCount, game.moves, elapsed);
  setTimeout(() => {
    show('win');
    $('win-h').focus();
  }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600);
}

function toStart() {
  clearTimeout(missTimer);
  stopClock();
  show('start');
  document.querySelector(`.level[data-level="${level}"]`)?.focus();
}

for (const btn of document.querySelectorAll('.level')) {
  btn.addEventListener('click', () => {
    level = btn.dataset.level;
    newGame();
  });
}
$('restart').addEventListener('click', newGame);
$('again').addEventListener('click', newGame);
$('change').addEventListener('click', toStart);
$('to-start').addEventListener('click', toStart);

await loadSet();
applyTitle();
show('start');
