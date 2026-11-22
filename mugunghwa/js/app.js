import { Game, CHANT, DIFFICULTY } from './game.js';
import { MotionTracker, W, H, toLuma } from './motion.js';
import { drawScene, PLAYER_LOOK } from './scene.js';
import { sfx, voice } from './sound.js';
import { decideMode, PROBLEM_TEXT, ManualGame, TEAM_LOOK, MANUAL_GOAL } from './fallback.js';

const $ = (id) => document.getElementById(id);

// ---------- 설정 (이 기기에만 기억) ----------
const settings = { players: '1', difficulty: 'normal', voice: 'on', teams: '2' };
try { Object.assign(settings, JSON.parse(localStorage.getItem('mugunghwa.settings') || '{}')); } catch {}
function saveSettings() {
  try { localStorage.setItem('mugunghwa.settings', JSON.stringify(settings)); } catch {}
}

document.querySelectorAll('.choice').forEach((fs) => {
  const key = fs.dataset.setting;
  const sync = () => fs.querySelectorAll('button').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.value === settings[key])));
  fs.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    settings[key] = b.dataset.value;
    saveSettings();
    sync();
    sfx.unlock();
    sfx.tick();
  });
  sync();
});

// ---------- 화면 전환 ----------
let screen = 'home';
function show(id) {
  screen = id;
  document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== id; });
}

// ---------- 카메라 ----------
const video = $('video');
const overlay = $('camOverlay');
const small = document.createElement('canvas');
small.width = W; small.height = H;
const smallCtx = small.getContext('2d', { willReadFrequently: true });
let stream = null;
let tracker = new MotionTracker(1);
let luma = new Uint8Array(W * H);
let lastVideoTime = -1;
let lastProcess = 0;
let lastMode = 'camera'; // 마지막으로 한 놀이: 'camera' | 'buttons'

/** 카메라를 켜 보기 전에 이 기기에서 쓸 수 있는지 */
function cameraEnv() {
  return { secure: !!window.isSecureContext, hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia };
}

async function startCamera() {
  const pre = decideMode(cameraEnv());
  if (pre.mode !== 'camera') {
    throw Object.assign(new Error(pre.reason), { name: pre.reason === 'insecure' ? 'InsecureError' : 'NotFoundError' });
  }
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play().catch(() => {});
}

function stopCamera() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = null;
  video.srcObject = null;
  tracker.prev = null;
}

/** 새 카메라 장면이 들어왔을 때만 움직임을 잽니다 (영상은 메모리에서 바로 덮어씀) */
function processCamera(now) {
  if (!stream || video.readyState < 2) return;
  if (video.currentTime === lastVideoTime) return;
  lastVideoTime = video.currentTime;
  const dt = lastProcess ? Math.min(0.2, (now - lastProcess) / 1000) : 1 / 30;
  lastProcess = now;
  smallCtx.drawImage(video, 0, 0, W, H);
  toLuma(smallCtx.getImageData(0, 0, W, H).data, luma);
  tracker.push(luma, dt);
}

/** 카메라 위에 구역 나눔과 '움직임 막대'를 그림 */
function drawOverlay() {
  const r = overlay.getBoundingClientRect();
  if (!r.width) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = Math.round(r.width * dpr), ch = Math.round(r.height * dpr);
  if (overlay.width !== cw || overlay.height !== ch) { overlay.width = cw; overlay.height = ch; }
  const c = overlay.getContext('2d');
  c.clearRect(0, 0, cw, ch);
  const n = tracker.players;
  const freeze = game?.phase === 'freeze';
  tracker.zones.forEach(([a, b], i) => {
    const x0 = a * cw, x1 = b * cw;
    const look = PLAYER_LOOK[i];
    // 이름표
    const fs = Math.max(12, ch * 0.09);
    c.font = `900 ${fs}px system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.lineWidth = fs * 0.2;
    c.strokeStyle = look.dark;
    c.fillStyle = '#fff';
    const label = n === 2 ? look.name : '나';
    c.strokeText(label, (x0 + x1) / 2, ch * 0.04);
    c.fillText(label, (x0 + x1) / 2, ch * 0.04);
    // 팔 흔든 횟수 (놀이 중엔 앞으로 간 횟수, 자리 잡기 땐 연습 횟수)
    const count = game ? game.players[i].strokes : tracker.strokes[i];
    const cs = `👋 ${count}`;
    c.font = `900 ${fs * 0.9}px system-ui, sans-serif`;
    c.textBaseline = 'bottom';
    c.strokeText(cs, (x0 + x1) / 2, ch * 0.97);
    c.fillText(cs, (x0 + x1) / 2, ch * 0.97);
    // 움직임 막대
    const e = tracker.effort[i];
    const bw = Math.max(8, cw * 0.035);
    const bx = n === 2 ? (i === 0 ? x0 + bw * 0.6 : x1 - bw * 1.6) : x1 - bw * 1.6;
    const by = ch * 0.2, bh = ch * 0.7;
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(bx, by, bw, bh);
    c.fillStyle = freeze && game && e > game.cfg.catchLevel ? '#ef4444' : look.color;
    c.fillRect(bx, by + bh * (1 - e), bw, bh * e);
  });
  if (n === 2) {
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.fillRect(0.45 * cw, 0, 0.1 * cw, ch);
  }
  if (freeze) {
    c.strokeStyle = '#ef4444';
    c.lineWidth = Math.max(4, cw * 0.02);
    c.strokeRect(0, 0, cw, ch);
  }
}

function moveCamTo(container) {
  container.append(video, overlay);
  video.play().catch(() => {});
}

// ---------- 놀이 ----------
const scene = $('scene');
const sceneCtx = scene.getContext('2d');
const banner = $('banner');
const bigText = $('bigText');
let game = null;
let calibUntil = 0;
let caughtFlash = [0, 0];
let lastCount = 0;
let resultTimer = 0;
let wakeLock = null;
let placeholder = null; // 가만히 재는 동안 보여 줄 빈 마당

function setBig(text, pop = true) {
  if (!text) { bigText.hidden = true; bigText.textContent = ''; return; }
  bigText.hidden = false;
  if (bigText.textContent !== text) {
    const span = document.createElement('span');
    span.textContent = text;
    bigText.replaceChildren(span);
    if (pop) { bigText.classList.remove('pop'); void bigText.offsetWidth; bigText.classList.add('pop'); }
  }
}

function setBanner() {
  if (!game) {
    banner.className = 'banner count';
    banner.textContent = '가만히~';
    return;
  }
  if (game.phase === 'chant') {
    banner.className = 'banner';
    let k = 0;
    const done = game.chantProgress;
    banner.replaceChildren(...CHANT.map((ch) => {
      const span = document.createElement('span');
      span.textContent = ch;
      if (ch !== ' ') { span.className = k < done ? 'on' : 'off'; k++; }
      return span;
    }));
  } else if (game.phase === 'freeze') {
    banner.className = 'banner freeze';
    banner.textContent = '얼음! 꼼짝 마!';
  } else if (game.phase === 'countdown') {
    banner.className = 'banner count';
    banner.textContent = '준비~';
  }
}

function resizeScene() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = scene.getBoundingClientRect();
  scene.width = Math.max(1, Math.round(r.width * dpr));
  scene.height = Math.max(1, Math.round(r.height * dpr));
}
window.addEventListener('resize', resizeScene);

async function keepAwake() {
  try { wakeLock = await navigator.wakeLock?.request('screen'); } catch {}
}
function releaseAwake() { try { wakeLock?.release(); } catch {} wakeLock = null; }

function beginPlay() {
  show('play');
  moveCamTo($('playCam'));
  requestAnimationFrame(resizeScene);
  resizeScene();
  game = null;
  caughtFlash = [0, 0];
  lastCount = 0;
  placeholder = null;
  calibUntil = performance.now() + 2500;
  tracker.startCalibration();
  tracker.takeStrokes();
  setBig('가만히 멈춰요!\n술래가 살펴봐요 👀');
  setBanner();
  voice.say('가만히 멈춰 봐');
  keepAwake();
}

function handleEvents(events) {
  for (const ev of events) {
    if (ev.type === 'phase' && ev.phase === 'chant') {
      setBig('');
      sfx.go();
      voice.chant(ev.length);
    } else if (ev.type === 'step') {
      sfx.step();
    } else if (ev.type === 'phase' && ev.phase === 'freeze') {
      sfx.freeze();
      voice.say('얼음!', { rate: 1.2, pitch: 1.3 });
    } else if (ev.type === 'caught') {
      caughtFlash[ev.player] = 1.6;
      sfx.caught();
      const who = game.players.length === 2 ? PLAYER_LOOK[ev.player].name : '';
      setBig(`${who ? who + ' ' : ''}움직였다!\n뒤로 ↩`);
      voice.say(`${who ? who + ', ' : ''}움직였다!`, { rate: 1.2 });
    } else if (ev.type === 'win') {
      sfx.win();
      const two = game.players.length === 2;
      setBig(two ? `${PLAYER_LOOK[ev.player].name} 도착! 🎉` : '도착! 🎉');
      voice.say(two ? `${PLAYER_LOOK[ev.player].name} 승리!` : '도착! 잘했어!');
      resultTimer = 2.2;
    }
  }
}

function showResult() {
  releaseAwake();
  const two = game.players.length === 2;
  const sec = game.elapsed.toFixed(1);
  const d = DIFFICULTY[game.difficulty].label;
  if (two) {
    const w = game.winner;
    $('resultEmoji').textContent = w === 0 ? '🐰' : '🐻';
    $('resultTitle').textContent = `${PLAYER_LOOK[w].name} 이겼어요!`;
    const caught = game.players.map((p, i) => `${PLAYER_LOOK[i].name} ${p.caught}번`).join(', ');
    $('resultText').textContent = `${sec}초 만에 도착! (술래에게 걸린 횟수: ${caught})`;
  } else {
    const key = `mugunghwa.best.${game.difficulty}`;
    let best = null;
    try { best = parseFloat(localStorage.getItem(key)); } catch {}
    const isBest = !best || game.elapsed < best;
    if (isBest) { try { localStorage.setItem(key, String(game.elapsed)); } catch {} }
    $('resultEmoji').textContent = isBest ? '🏆' : '🎉';
    $('resultTitle').textContent = isBest ? '새 기록이에요!' : '도착했어요!';
    $('resultText').textContent =
      `[${d}] ${sec}초 걸렸고, 술래에게 ${game.players[0].caught}번 걸렸어요.` +
      (best && !isBest ? ` (최고 기록 ${best.toFixed(1)}초)` : '');
  }
  show('result');
}

function stopPlay() {
  voice.stop();
  releaseAwake();
  game = null;
  calibUntil = 0;
  setBig('');
}

// ---------- 한 프레임마다 ----------
let last = performance.now();
let t = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  t += dt;
  processCamera(now);

  if (screen === 'play') {
    if (!game && calibUntil && now >= calibUntil) {
      tracker.finishCalibration();
      calibUntil = 0;
      game = new Game({ players: Number(settings.players), difficulty: settings.difficulty });
      setBig('3');
      sfx.tick();
      lastCount = 3;
    }
    if (game) {
      const strokes = tracker.takeStrokes();
      if (!document.hidden) handleEvents(game.update(dt, tracker.effort, strokes));
      if (game.phase === 'countdown') {
        const left = Math.ceil(game.phaseLength - game.phaseTime);
        if (left !== lastCount && left > 0) { lastCount = left; setBig(String(left)); sfx.tick(); }
      }
      caughtFlash = caughtFlash.map((v) => Math.max(0, v - dt));
      if (bigText.textContent.includes('움직였다') && caughtFlash.every((v) => v === 0)) setBig('');
      if (game.phase === 'end') {
        resultTimer -= dt;
        if (resultTimer <= 0) showResult();
      }
    }
    setBanner();
    if (game || calibUntil) {
      drawScene(sceneCtx, scene.width, scene.height, {
        game: game || (placeholder ||= new Game({ players: Number(settings.players) })),
        t,
        caughtFlash,
      });
    }
  }
  if (screen === 'manual' && manual) {
    for (const ev of manual.update(dt)) handleManualEvent(ev);
    if (manual.phase === 'chant') renderManualBanner();
  }
  if (screen === 'setup' || screen === 'play') drawOverlay();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- 버튼 놀이 (카메라 없이) ----------
let manual = null;
const teamsBox = $('teams');
const chantBtn = $('chantBtn');

function newManualGame() {
  manual = new ManualGame({ teams: Number(settings.teams) || 2 });
  teamsBox.replaceChildren(...manual.teams.map((_, i) => {
    const look = TEAM_LOOK[i];
    const card = document.createElement('div');
    card.className = 'team';
    card.style.setProperty('--team', look.color);
    card.innerHTML = `
      <div class="team-head"><span class="team-emoji" aria-hidden="true">${look.emoji}</span><b>${look.name}</b></div>
      <div class="track" role="img"><div class="fill"></div><span class="goal" aria-hidden="true">🏁</span></div>
      <div class="team-info"><span class="team-steps"></span><span class="team-caught"></span></div>
      <button type="button" class="team-btn" data-team="${i}"></button>`;
    return card;
  }));
  renderManual();
}

function renderManualBanner() {
  const b = $('manualBanner');
  if (manual.phase === 'chant') {
    b.className = 'banner';
    let k = 0;
    const done = manual.chantProgress;
    b.replaceChildren(...CHANT.map((ch) => {
      const span = document.createElement('span');
      span.textContent = ch;
      if (ch !== ' ') { span.className = k < done ? 'on' : 'off'; k++; }
      return span;
    }));
  } else if (manual.phase === 'freeze') {
    b.className = 'banner freeze';
    b.textContent = '얼음! 꼼짝 마!';
  } else {
    b.className = 'banner count';
    b.textContent = manual.phase === 'end' ? '도착! 🎉' : '준비~';
  }
}

function renderManual() {
  if (!manual) return;
  const ph = manual.phase;
  $('manual').dataset.phase = ph;
  renderManualBanner();
  $('manualTagger').textContent = {
    ready: '🧑‍🏫 선생님이 술래 버튼을 눌러요!',
    chant: '🙈 술래가 뒤돌았어요. 살금살금 앞으로!',
    freeze: '👀 술래가 봐요! 움직인 팀을 눌러요.',
    end: '🎉 술래에게 도착했어요!',
  }[ph];
  chantBtn.disabled = ph === 'chant' || ph === 'end';
  chantBtn.textContent = ph === 'chant' ? '🌺 부르는 중…' : '🌺 무궁화 꽃이 피었습니다';
  $('teamChoice').hidden = manual.round > 0;
  teamsBox.querySelectorAll('.team').forEach((card, i) => {
    const t = manual.teams[i];
    const look = TEAM_LOOK[i];
    card.querySelector('.fill').style.width = `${(t.steps / MANUAL_GOAL) * 100}%`;
    card.querySelector('.track').setAttribute('aria-label', `${look.name} ${t.steps}걸음 / ${MANUAL_GOAL}걸음`);
    card.querySelector('.team-steps').textContent = `👣 ${t.steps} / ${MANUAL_GOAL}`;
    card.querySelector('.team-caught').textContent = `😮 ${t.caught}번`;
    card.classList.toggle('winner', manual.winner === i);
    card.classList.toggle('caught', ph === 'freeze' && t.caughtThisFreeze);
    const btn = card.querySelector('.team-btn');
    if (ph === 'chant') {
      btn.className = 'team-btn go'; btn.disabled = false; btn.textContent = '👣 앞으로';
    } else if (ph === 'freeze') {
      btn.className = 'team-btn moved'; btn.disabled = t.caughtThisFreeze;
      btn.textContent = t.caughtThisFreeze ? '↩ 뒤로 갔어요' : '😮 움직였어요';
    } else {
      btn.className = 'team-btn wait'; btn.disabled = true;
      btn.textContent = ph === 'end' ? (manual.winner === i ? '🏆 이겼어요!' : '수고했어요') : '기다려요';
    }
  });
}

function handleManualEvent(ev) {
  if (!ev) return;
  if (ev.type === 'phase' && ev.phase === 'chant') { sfx.go(); voice.chant(ev.length); }
  else if (ev.type === 'phase' && ev.phase === 'freeze') { sfx.freeze(); voice.say('얼음!', { rate: 1.2, pitch: 1.3 }); }
  else if (ev.type === 'step') sfx.step();
  else if (ev.type === 'caught') { sfx.caught(); voice.say(`${TEAM_LOOK[ev.team].name}, 움직였다!`, { rate: 1.2 }); }
  else if (ev.type === 'win') {
    sfx.win();
    voice.say(`${TEAM_LOOK[ev.team].name} 도착!`);
    setTimeout(() => { if (screen === 'manual' && manual?.phase === 'end') showManualResult(); }, 2200);
  }
  renderManual();
}

function showManualResult() {
  const w = manual.winner;
  $('resultEmoji').textContent = TEAM_LOOK[w].emoji;
  $('resultTitle').textContent = `${TEAM_LOOK[w].name} 이겼어요!`;
  const caught = manual.teams.map((t, i) => `${TEAM_LOOK[i].name} ${t.caught}번`).join(', ');
  $('resultText').textContent = `${manual.round}번 만에 술래에게 도착! (걸린 횟수: ${caught})`;
  show('result');
}

function startManual() {
  stopCamera();
  sfx.unlock();
  voice.enabled = settings.voice === 'on';
  voice.unlock();
  lastMode = 'buttons';
  newManualGame();
  show('manual');
}

function stopManual() {
  voice.stop();
  manual = null;
}

chantBtn.addEventListener('click', () => { sfx.unlock(); handleManualEvent(manual?.startChant()); });
teamsBox.addEventListener('click', (e) => {
  const b = e.target.closest('.team-btn');
  if (!b || !manual || b.disabled) return;
  const i = Number(b.dataset.team);
  handleManualEvent(manual.phase === 'chant' ? manual.step(i) : manual.markMoved(i));
});
$('teamChoice').addEventListener('click', (e) => {
  if (e.target.closest('button') && manual?.phase === 'ready') newManualGame();
});
$('manualQuitBtn').addEventListener('click', () => { stopManual(); show('home'); });

// ---------- 버튼 ----------
function showProblem(reason) {
  stopCamera();
  $('errorText').textContent = PROBLEM_TEXT[reason] || PROBLEM_TEXT.unknown;
  show('error');
}

// 놀이 시작 → 먼저 카메라 안내 화면
$('startBtn').addEventListener('click', () => {
  sfx.unlock();
  voice.enabled = settings.voice === 'on';
  voice.unlock();
  show('guide');
});

// 안내를 읽고 큰 버튼을 누르면 그때 카메라 허락을 물어봄
$('camStartBtn').addEventListener('click', async () => {
  sfx.unlock();
  voice.enabled = settings.voice === 'on';
  lastMode = 'camera';
  tracker = new MotionTracker(Number(settings.players));
  const two = settings.players === '2';
  $('setupTitle').textContent = two ? '1P는 왼쪽, 2P는 오른쪽에 서요' : '카메라 앞에 서 보세요';
  $('setupHint').textContent = two
    ? '가운데 하얀 줄을 넘지 않게! 팔을 위아래로 흔들면 👋 숫자가 올라가요.'
    : '팔까지 다 보이게 조금 떨어져 서요. 팔을 위아래로 흔들면 👋 숫자가 올라가요.';
  const pre = decideMode(cameraEnv());
  if (pre.mode !== 'camera') { showProblem(pre.reason); return; }
  try {
    moveCamTo($('setupCam'));
    show('setup');
    await startCamera();
  } catch (err) {
    showProblem(decideMode({ ...cameraEnv(), error: err }).reason);
  }
});

$('guideBackBtn').addEventListener('click', () => show('home'));
$('guideManualBtn').addEventListener('click', startManual);
$('errorManualBtn').addEventListener('click', startManual);
$('errorRetryBtn').addEventListener('click', () => $('camStartBtn').click());
$('readyBtn').addEventListener('click', () => { sfx.unlock(); beginPlay(); });
$('backBtn').addEventListener('click', () => { stopCamera(); show('home'); });
$('quitBtn').addEventListener('click', () => { stopPlay(); stopCamera(); show('home'); });
$('againBtn').addEventListener('click', () => {
  if (lastMode === 'buttons') startManual();
  else if (stream) beginPlay();
  else $('camStartBtn').click();
});
$('homeBtn').addEventListener('click', () => { stopPlay(); stopManual(); stopCamera(); show('home'); });
$('errorBtn').addEventListener('click', () => show('home'));

// 다른 앱으로 갔다 오면 술래 목소리 멈춤
document.addEventListener('visibilitychange', () => {
  if (document.hidden) voice.stop();
  else if (screen === 'play') keepAwake();
});

// ---------- 홈 화면에 설치 ----------
let installEvent = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvent = e;
  $('installBtn').hidden = false;
});
$('installBtn').addEventListener('click', async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice.catch(() => {});
  installEvent = null;
  $('installBtn').hidden = true;
});
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// 시험용으로 상태를 들여다볼 수 있게 (영상은 들어 있지 않음)
window.__mugunghwa = {
  get game() { return game; }, get tracker() { return tracker; }, get screen() { return screen; },
  get manual() { return manual; }, get mode() { return lastMode; },
};
