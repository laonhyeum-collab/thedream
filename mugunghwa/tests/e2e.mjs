// 진짜 브라우저(Chromium)에 "가짜 카메라 영상"을 넣어 처음부터 끝까지 놀아 보는 시험
// 실행: npm run e2e   (Playwright 와 Chromium 이 필요)
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'mugunghwa-e2e-'));
fs.mkdirSync(OUT, { recursive: true });

// ---------- 가짜 카메라 영상 만들기 (y4m) ----------
const VW = 320, VH = 240, FPS = 30;
function makeVideo(file, { leftMoves, rightMoves, seconds = 6 }) {
  const fd = fs.openSync(file, 'w');
  fs.writeSync(fd, `YUV4MPEG2 W${VW} H${VH} F${FPS}:1 Ip A1:1 C420jpeg\n`);
  const y = new Uint8Array(VW * VH);
  const uv = new Uint8Array((VW / 2) * (VH / 2)).fill(128);
  let seed = 42;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let f = 0; f < seconds * FPS; f++) {
    const t = f / FPS;
    // 배경: 벽(위는 밝고 아래는 어두움) + 카메라 잡음 ±3
    for (let j = 0; j < VH; j++) for (let i = 0; i < VW; i++) y[j * VW + i] = 150 - j * 0.2 + (rnd() * 6 - 3);
    // 사람 둘: 카메라 원본의 오른쪽 사람 = 화면 왼쪽(1P), 원본 왼쪽 사람 = 화면 오른쪽(2P)
    const people = [
      { cx: VW * 0.75, moves: leftMoves },
      { cx: VW * 0.25, moves: rightMoves },
    ];
    for (const p of people) {
      const bob = p.moves ? Math.sin(t * Math.PI * 2 * 2.5) * 14 : 0;   // 제자리 달리기
      const arm = p.moves ? Math.sin(t * Math.PI * 2 * 2) * 30 : 0;      // 팔 흔들기
      const top = 50 + bob;
      const paint = (x0, y0, x1, y1, v) => {
        for (let j = Math.max(0, y0 | 0); j < Math.min(VH, y1 | 0); j++)
          for (let i = Math.max(0, x0 | 0); i < Math.min(VW, x1 | 0); i++) y[j * VW + i] = v;
      };
      paint(p.cx - 14, top, p.cx + 14, top + 28, 225);              // 머리
      paint(p.cx - 22, top + 30, p.cx + 22, top + 110, 40);         // 몸
      paint(p.cx - 45, top + 35 + arm, p.cx - 22, top + 45 + arm, 60); // 왼팔
      paint(p.cx + 22, top + 35 - arm, p.cx + 45, top + 45 - arm, 60); // 오른팔
      paint(p.cx - 18, top + 110, p.cx - 4, top + 170 - (p.moves ? Math.max(0, bob) : 0), 50);
      paint(p.cx + 4, top + 110, p.cx + 18, top + 170 - (p.moves ? Math.max(0, -bob) : 0), 50);
    }
    fs.writeSync(fd, 'FRAME\n');
    fs.writeSync(fd, y);
    fs.writeSync(fd, uv);
    fs.writeSync(fd, uv);
  }
  fs.closeSync(fd);
  return file;
}

// ---------- 작은 웹 서버 ----------
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://localhost:${server.address().port}`;

// ---------- 시험 도구 ----------
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(videoFile, { grant = true } = {}) {
  const args = ['--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'];
  if (videoFile) args.push(`--use-file-for-fake-video-capture=${videoFile}`);
  args.push(grant ? '--use-fake-ui-for-media-stream' : '--use-fake-ui-for-media-stream=deny');
  const browser = await chromium.launch({ args });
  const context = await browser.newContext({
    viewport: { width: 1180, height: 820 },
    permissions: grant ? ['camera'] : [],
  });
  const page = await context.newPage();
  const requests = [];
  const problems = [];
  page.on('request', (r) => requests.push({ url: r.url(), method: r.method() }));
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  await page.goto(ORIGIN + '/');
  return { browser, context, page, requests, problems };
}

async function choose(page, setting, value) {
  await page.click(`.choice[data-setting="${setting}"] button[data-value="${value}"]`);
}
const state = (page) => page.evaluate(() => {
  const m = window.__mugunghwa;
  return {
    screen: m.screen,
    effort: [...m.tracker.effort],
    floor: [...m.tracker.floor],
    game: m.game && {
      phase: m.game.phase,
      winner: m.game.winner,
      players: m.game.players.map((p) => ({ progress: p.progress, caught: p.caught })),
    },
  };
});

/** 놀이 중 상태를 계속 기록 (앞으로 간 양을 '부를 때'와 '얼음 때'로 나눠서) */
async function watch(page, seconds, onTick) {
  const log = [];
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    const s = await state(page);
    log.push(s);
    if (onTick) await onTick(s);
    await sleep(100);
  }
  return log;
}

// =========================================================
const movingVideo = makeVideo(path.join(OUT, 'p1-moves.y4m'), { leftMoves: true, rightMoves: false });
const stillVideo = makeVideo(path.join(OUT, 'nobody-moves.y4m'), { leftMoves: false, rightMoves: false });
const bothVideo = makeVideo(path.join(OUT, 'both-move.y4m'), { leftMoves: true, rightMoves: true });

// ---- 1) 둘이서 · 매의 눈: 1P만 계속 움직임 ----
{
  console.log('\n[1] 둘이서 · 매의 눈 · 1P(왼쪽)만 쉬지 않고 움직이는 영상');
  const { browser, page, requests, problems } = await open(movingVideo);
  await page.screenshot({ path: path.join(OUT, '01-home.png') });
  await choose(page, 'players', '2');
  await choose(page, 'difficulty', 'hawk');
  await choose(page, 'voice', 'off');
  await page.click('#startBtn');
  await page.waitForFunction(() => window.__mugunghwa.screen === 'setup');
  await sleep(1500);
  let s = await state(page);
  check('자리 잡기: 왼쪽(1P) 움직임을 알아챔', s.effort[0] > 0.5, `1P 막대 ${s.effort[0].toFixed(2)}`);
  check('자리 잡기: 가만히 있는 오른쪽(2P)은 조용함', s.effort[1] < 0.1, `2P 막대 ${s.effort[1].toFixed(2)}`);
  await page.screenshot({ path: path.join(OUT, '02-setup-2p.png') });

  await page.click('#readyBtn');
  let shotChant = false, shotFreeze = false;
  const log = await watch(page, 26, async (st) => {
    if (st.game?.phase === 'chant' && !shotChant && st.game.players[0].progress > 5) {
      shotChant = true; await page.screenshot({ path: path.join(OUT, '03-play-chant.png') });
      const lay = await page.evaluate(() => {
        const cam = document.getElementById('playCam').getBoundingClientRect();
        const sc = document.getElementById('scene').getBoundingClientRect();
        return { camCenter: (cam.left + cam.right) / 2, camRight: cam.right, sceneLeft: sc.left, vw: innerWidth };
      });
      check('가로 화면: 카메라는 가운데 크게, 놀이 마당은 오른쪽', lay.camRight <= lay.sceneLeft && lay.sceneLeft > lay.vw * 0.6, JSON.stringify(lay));
    }
    if (st.game?.phase === 'freeze' && !shotFreeze && st.game.players[0].caught > 0) {
      shotFreeze = true; await page.screenshot({ path: path.join(OUT, '04-play-caught.png') });
    }
  });
  const last = log.at(-1).game;
  const maxP1 = Math.max(...log.filter((l) => l.game).map((l) => l.game.players[0].progress));
  check('부르는 동안 움직인 1P는 앞으로 감', maxP1 > 10, `가장 멀리 ${maxP1.toFixed(1)}칸`);
  check('얼음 때도 움직인 1P는 걸려서 뒤로 감', last.players[0].caught >= 1, `걸린 횟수 ${last.players[0].caught}`);
  check('가만히 있던 2P는 그대로, 한 번도 안 걸림', last.players[1].progress === 0 && last.players[1].caught === 0,
    `2P ${last.players[1].progress.toFixed(1)}칸, ${last.players[1].caught}번`);
  const phases = new Set(log.map((l) => l.game?.phase).filter(Boolean));
  check('카운트다운 → 부르기 → 얼음 이 번갈아 나옴', phases.has('countdown') && phases.has('chant') && phases.has('freeze'), [...phases].join(', '));

  // 결과 화면까지: 1P를 결승선 바로 앞에 두고 계속 움직이게 함
  await page.waitForFunction(() => window.__mugunghwa.game?.phase === 'chant', null, { timeout: 15000 });
  await page.evaluate(() => { window.__mugunghwa.game.players[0].progress = 99.5; });
  await page.waitForFunction(() => window.__mugunghwa.screen === 'result', null, { timeout: 10000 });
  const title = await page.textContent('#resultTitle');
  check('먼저 도착한 1P가 이김 → 결과 화면', title.includes('1P'), title);
  await page.screenshot({ path: path.join(OUT, '05-result-2p.png') });

  const outside = requests.filter((r) => !r.url.startsWith(ORIGIN) && !r.url.startsWith('data:') && !r.url.startsWith('blob:'));
  check('바깥 주소로 나간 요청 0개', outside.length === 0, outside.map((r) => r.url).join(' ') || `전체 요청 ${requests.length}개 모두 이 앱 파일`);
  check('데이터를 보내는(POST 등) 요청 0개', requests.every((r) => r.method === 'GET'));
  check('오류 없음', problems.length === 0, problems.join(' | '));
  await browser.close();
}

// ---- 2) 혼자 · 너그러움: 아무도 안 움직임 ----
{
  console.log('\n[2] 혼자 · 너그러움 · 아무도 움직이지 않는 영상');
  const { browser, page, problems } = await open(stillVideo);
  await choose(page, 'players', '1');
  await choose(page, 'difficulty', 'easy');
  await choose(page, 'voice', 'on');
  await page.click('#startBtn');
  await page.waitForFunction(() => window.__mugunghwa.screen === 'setup');
  await sleep(1000);
  await page.screenshot({ path: path.join(OUT, '06-setup-solo.png') });
  await page.click('#readyBtn');
  const log = await watch(page, 15);
  const last = log.at(-1).game;
  const maxEffort = Math.max(...log.map((l) => l.effort[0]));
  check('가만히 있으면 움직임 막대가 거의 0', maxEffort < 0.05, `가장 큰 값 ${maxEffort.toFixed(3)}`);
  check('가만히 있으면 앞으로도 안 가고 걸리지도 않음', last.players[0].progress < 1 && last.players[0].caught === 0,
    `${last.players[0].progress.toFixed(1)}칸, ${last.players[0].caught}번`);
  check('오류 없음', problems.length === 0, problems.join(' | '));
  await browser.close();
}

// ---- 3) 혼자 · 보통: 계속 움직이는 영상 (쉬지 않으면 걸린다) ----
{
  console.log('\n[3] 혼자 · 보통 · 쉬지 않고 움직이는 영상');
  const { browser, page, problems } = await open(bothVideo);
  await choose(page, 'players', '1');
  await choose(page, 'difficulty', 'normal');
  await page.click('#startBtn');
  await page.waitForFunction(() => window.__mugunghwa.screen === 'setup');
  await sleep(800);
  await page.click('#readyBtn');
  const log = await watch(page, 22);
  const last = log.at(-1).game;
  check('혼자일 때 화면 전체 움직임으로 앞으로 감', Math.max(...log.filter((l) => l.game).map((l) => l.game.players[0].progress)) > 10);
  check('얼음 때 멈추지 않으면 걸림', last.players[0].caught >= 1, `걸린 횟수 ${last.players[0].caught}`);
  await page.click('#quitBtn');
  await sleep(300);
  const camOff = await page.evaluate(() => !document.getElementById('video').srcObject);
  check('그만하기 누르면 카메라가 꺼짐', camOff);
  check('오류 없음', problems.length === 0, problems.join(' | '));
  await browser.close();
}

// ---- 4) 홈 화면 앱 + 인터넷 없이 ----
{
  console.log('\n[4] 홈 화면 설치 · 인터넷 없이 열기');
  const { browser, context, page } = await open(stillVideo);
  const manifest = await page.evaluate(async () => {
    const href = document.querySelector('link[rel=manifest]').href;
    return (await fetch(href)).json();
  });
  const iconsOk = await page.evaluate(async (icons) => {
    const out = [];
    for (const i of icons) out.push((await fetch(i.src)).ok);
    return out.every(Boolean);
  }, manifest.icons);
  check('앱 정보(manifest): 이름·아이콘·전체화면',
    manifest.name && manifest.icons.some((i) => i.sizes === '512x512') && manifest.icons.some((i) => i.sizes === '192x192') && iconsOk && ['fullscreen', 'standalone'].includes(manifest.display),
    `${manifest.short_name}, 아이콘 ${manifest.icons.length}개`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
  check('오프라인 도우미(service worker) 작동', controlled);
  await context.setOffline(true);
  await page.reload();
  const title = await page.textContent('h1');
  check('인터넷을 끊어도 열림', title.includes('무궁화'), title.replace(/\s+/g, ' '));
  await context.setOffline(false);
  await browser.close();
}

// ---- 5) 카메라를 허락하지 않으면 ----
{
  console.log('\n[5] 카메라 허락 안 함');
  const { browser, page } = await open(null, { grant: false });
  await page.click('#startBtn');
  await page.waitForFunction(() => window.__mugunghwa.screen === 'error', null, { timeout: 10000 }).catch(() => {});
  const scr = await page.evaluate(() => window.__mugunghwa.screen);
  const msg = await page.textContent('#errorText');
  check('친절한 안내 화면이 나옴', scr === 'error' && msg.includes('허락'), msg);
  await page.screenshot({ path: path.join(OUT, '07-camera-denied.png') });
  await browser.close();
}

// ---- 6) 휴대폰처럼 좁은 화면 ----
{
  console.log('\n[6] 좁은 화면(세로 태블릿/폰)');
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-video-capture=${movingVideo}`] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await page.goto(ORIGIN + '/');
  const overflow = await page.evaluate(() => document.querySelector('#home .card').scrollWidth > window.innerWidth);
  check('처음 화면이 옆으로 넘치지 않음', !overflow);
  await page.screenshot({ path: path.join(OUT, '08-home-phone.png') });
  // 세로 태블릿에서 둘이서 놀이 화면
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.click('.choice[data-setting="players"] button[data-value="2"]');
  await page.click('.choice[data-setting="voice"] button[data-value="off"]');
  await page.click('#startBtn');
  await page.waitForFunction(() => window.__mugunghwa.screen === 'setup');
  await page.click('#readyBtn');
  await page.waitForFunction(() => window.__mugunghwa.game?.phase === 'chant', null, { timeout: 15000 });
  await sleep(1200);
  await page.screenshot({ path: path.join(OUT, '09-play-tablet-portrait.png') });
  const lay = await page.evaluate(() => {
    const cam = document.getElementById('playCam').getBoundingClientRect();
    const sc = document.getElementById('scene').getBoundingClientRect();
    return { camBottom: cam.bottom, sceneTop: sc.top, camW: cam.width };
  });
  check('세로 화면: 카메라는 위, 놀이 마당은 아래', lay.camBottom <= lay.sceneTop + 1 && lay.camW > 300, JSON.stringify(lay));
  await browser.close();
}

server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n결과: ${results.length - failed.length}/${results.length} 통과  (스크린샷: ${OUT})`);
process.exit(failed.length ? 1 : 0);
