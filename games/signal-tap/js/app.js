// 순발력 신호등 — 화면
import {
  GAME_MS, SignalGame, validateWordFile, safeSetName, stageAt, ruleText, gapMs,
} from './game.js';

const $ = (id) => document.getElementById(id);
const el = {
  start: $('start'), play: $('play'), end: $('end'),
  sets: $('sets'), setTitle: $('set-title'), notice: $('notice'), go: $('go'),
  score: $('score'), time: $('time'), bar: $('bar-fill'), rule: $('rule'),
  signal: $('signal'), lamp: $('lamp'), word: $('word'), feedback: $('feedback'),
  stop: $('stop'), final: $('final'), result: $('result'), again: $('again'), toStart: $('to-start'),
};

let wordFile = null;
let chosen = 0;
let game = null;
let timer = null;   // 신호 끝/다음 신호 타이머
let ticker = null;  // 남은 시간 표시
let stageShown = 0;

const FEEDBACK = {
  hit: '좋아요! +1',
  fast: '⚡ 번개! +2',
  wrong: '앗, 참아야 했어요 -1',
  early: '아직 신호가 없어요',
  missed: '놓쳤어요!',
  held: '잘 참았어요! +1',
};

function show(section) {
  for (const s of [el.start, el.play, el.end]) s.hidden = s !== section;
}

function notice(msg) {
  el.notice.textContent = msg;
  el.notice.hidden = !msg;
}

async function loadWords() {
  const param = new URLSearchParams(location.search).get('set');
  const name = safeSetName(param || '') || 'words';
  if (param && name !== param.replace(/\.json$/i, '')) notice('낱말 파일 이름이 올바르지 않아 기본 낱말을 써요.');
  try {
    const res = await fetch(`./data/${name}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    const checked = validateWordFile(await res.json());
    if (!checked.data) throw new Error(checked.errors.join(' '));
    if (checked.errors.length) notice(`낱말 파일에서 고칠 곳: ${checked.errors.slice(0, 2).join(' / ')}`);
    return checked.data;
  } catch (e) {
    if (name !== 'words') {
      notice(`'${name}' 낱말 파일을 열지 못해 기본 낱말을 써요.`);
      const res = await fetch('./data/words.json', { cache: 'no-store' });
      return validateWordFile(await res.json()).data;
    }
    notice('낱말 파일을 열지 못했어요. 신호등(색)만으로 놀 수 있어요.');
    return null;
  }
}

function renderSets() {
  el.sets.textContent = '';
  if (!wordFile) return;
  el.setTitle.textContent = `· ${wordFile.title}`;
  wordFile.sets.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'set';
    b.textContent = s.target;
    b.setAttribute('aria-pressed', String(i === chosen));
    b.addEventListener('click', () => {
      chosen = i;
      for (const x of el.sets.children) x.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-pressed', 'true');
    });
    el.sets.appendChild(b);
  });
}

function clearTimers() {
  clearTimeout(timer);
  clearInterval(ticker);
  timer = null;
  ticker = null;
}

function setSignal(sig) {
  el.signal.className = 'signal';
  if (!sig) {
    el.word.textContent = '';
    el.signal.classList.add('off');
    return;
  }
  el.signal.classList.add(sig.color);
  el.word.textContent = sig.kind === 'word' ? sig.text : (sig.go ? '탭!' : '멈춰!');
}

function flash(kind) {
  el.feedback.textContent = FEEDBACK[kind] || ' ';
  el.feedback.className = `feedback ${kind}`;
  el.score.textContent = String(game.score);
}

function updateRule(now) {
  const st = stageAt(game.elapsed(now));
  if (st.id !== stageShown) {
    stageShown = st.id;
    const target = wordFile ? wordFile.sets[chosen].target : '';
    const kind = wordFile ? st : { ...st, kind: 'color', rule: '초록 불이면 탭! 빨간 불이면 멈춰요' };
    el.rule.textContent = `${st.label}\n${ruleText(kind, target)}`;
    el.rule.classList.remove('pop');
    void el.rule.offsetWidth;
    el.rule.classList.add('pop');
  }
}

function nextSignal() {
  const now = performance.now();
  if (game.isOver(now)) return finish();
  updateRule(now);
  const sig = game.next(now);
  setSignal(sig);
  timer = setTimeout(() => {
    const r = game.timeout();
    if (r) flash(r);
    setSignal(null);
    timer = setTimeout(nextSignal, gapMs());
  }, sig.until - now);
}

function onTap() {
  if (!game || el.play.hidden) return;
  const r = game.tap(performance.now());
  if (r === 'over') return finish();
  flash(r);
  if (r !== 'early') {
    // 누르면 신호를 바로 끄고 다음 신호로
    clearTimeout(timer);
    setSignal(null);
    timer = setTimeout(nextSignal, gapMs());
  }
}

function begin() {
  clearTimers();
  const set = wordFile ? wordFile.sets[chosen] : null;
  game = new SignalGame({ wordSet: set });
  const now = performance.now();
  game.start(now);
  stageShown = 0;
  el.score.textContent = '0';
  el.feedback.textContent = ' ';
  show(el.play);
  setSignal(null);
  updateRule(now);
  ticker = setInterval(() => {
    const t = performance.now();
    const left = game.timeLeft(t);
    el.time.textContent = String(Math.ceil(left / 1000));
    el.bar.style.width = `${(left / GAME_MS) * 100}%`;
    if (left <= 0) finish();
  }, 100);
  timer = setTimeout(nextSignal, 900);
  el.signal.focus();
}

function finish() {
  if (!game || el.play.hidden) return;
  clearTimers();
  game.over = true;
  const s = game.summary();
  el.final.textContent = `${s.score}점`;
  el.result.textContent = '';
  const rows = [
    `✅ 맞게 탭 ${s.hits}번 (⚡ 번개 ${s.fast}번)`,
    `✋ 잘 참음 ${s.held}번`,
    `❌ 참아야 할 때 탭 ${s.wrong}번`,
    `💨 놓친 신호 ${s.missed}번`,
  ];
  if (s.avgMs) rows.push(`⏱️ 평균 반응 ${(s.avgMs / 1000).toFixed(2)}초`);
  for (const t of rows) {
    const li = document.createElement('li');
    li.textContent = t;
    el.result.appendChild(li);
  }
  show(el.end);
  $('end-h').focus();
}

el.signal.addEventListener('pointerdown', (e) => { e.preventDefault(); onTap(); });
el.signal.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); onTap(); } });
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !el.play.hidden) { e.preventDefault(); onTap(); }
});
el.go.addEventListener('click', begin);
el.again.addEventListener('click', begin);
el.toStart.addEventListener('click', () => { show(el.start); el.go.focus(); });
el.stop.addEventListener('click', () => { clearTimers(); game = null; show(el.start); });
document.addEventListener('visibilitychange', () => { if (document.hidden && game && !el.play.hidden) finish(); });

wordFile = await loadWords();
renderSets();
