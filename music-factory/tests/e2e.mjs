// 진짜 브라우저(Chromium)에서 처음부터 끝까지 써 보는 시험
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
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'music-factory-e2e-'));
fs.mkdirSync(OUT, { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const file = p.endsWith('/') ? path.join(p, 'index.html') : p;
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const URL_ = `http://localhost:${server.address().port}/`;

let failures = 0;
function check(cond, msg) {
  console.log(`${cond ? '✅' : '❌'} ${msg}`);
  if (!cond) failures++;
}

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

const center = async (sel) => {
  const b = await page.locator(sel).boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
async function dragTo(fromSel, toSel) {
  const a = await center(fromSel);
  const b = await center(toSel);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 15, a.y + 5, { steps: 3 });
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}
const slot = (r, c) => `#cupRows .slot[data-row="${r}"][data-col="${c}"]`;
const itemsState = () => page.evaluate(() => window.__mpf.state.items.map(({ ing, row, col, size }) => ({ ing, row, col, size })).sort((a, b) => a.row - b.row || a.col - b.col));

// 소리가 정말 나는지 재는 장치
async function attachMeter() {
  await page.evaluate(() => {
    const a = window.__mpf.audio;
    a.ensure();
    const an = a.ctx.createAnalyser();
    an.fftSize = 2048;
    a.master.connect(an);
    window.__level = () => {
      const d = new Float32Array(an.fftSize);
      an.getFloatTimeDomainData(d);
      return Math.sqrt(d.reduce((s, v) => s + v * v, 0) / d.length);
    };
  });
}

// ---------- 1. 메인 → 테마 → 창작 ----------
await page.goto(URL_);
await page.screenshot({ path: path.join(OUT, '1-home.png') });
check(await page.locator('#home .menu-btn').count() === 6, '메인 메뉴 6개 (단계별 도전 포함)');
await page.click('text=음악 만들기');
check(await page.locator('.theme-card').count() === 7, '테마 7개');
check(await page.locator('.theme-card:not([disabled])').count() === 7, '테마 7개 모두 열림');
await page.screenshot({ path: path.join(OUT, '2-themes.png') });
await page.click('.theme-card[data-theme="bingsu"]');
check(await page.locator('#create').isVisible(), '창작 화면 열림');
check(await page.locator('#palette .ing').count() === 10, '빙수 재료 10개');
check(await page.locator('#cupRows .slot').count() === 24, '컵 칸 8층 × 3');
await attachMeter();

// ---------- 2. 기획서 예시대로 쌓기 ----------
await dragTo('#palette .ing[data-ing="ice"]', slot(0, 1));
await dragTo('#palette .ing[data-ing="redbean"]', slot(1, 1));
await dragTo('#palette .ing[data-ing="strawberry"]', slot(3, 0));
await dragTo('#palette .ing[data-ing="mango"]', slot(3, 2));
await dragTo('#palette .ing[data-ing="icecream"]', slot(6, 1));
check((await itemsState()).length === 5, '재료 5개를 끌어다 놓음');

// 크기 바꾸기: 얼음 2박, 망고 2박
await page.click(`${slot(0, 1)} .item`);
await page.click('#sizeBtns .size-btn[data-level="3"]');
await page.click(`${slot(3, 2)} .item`);
await page.click('#sizeBtns .size-btn[data-level="3"]');
// 손잡이로 크기 끌기: 아이스크림을 키웠다가 다시 1박으로
await page.click(`${slot(6, 1)} .item`);
{
  const g = await center(`${slot(6, 1)} .grip`);
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  await page.mouse.move(g.x + 80, g.y - 10, { steps: 6 });
  const big = (await itemsState()).find((i) => i.ing === 'icecream').size;
  await page.mouse.move(g.x, g.y, { steps: 6 });
  await page.mouse.up();
  const back = (await itemsState()).find((i) => i.ing === 'icecream').size;
  check(big === 4 && back === 2, `손잡이로 크기 조절 (커짐 ${big}단계 → 되돌림 ${back}단계)`);
}
check(/6박/.test(await page.textContent('#lengthInfo')), `전체 길이 6박 표시: "${await page.textContent('#lengthInfo')}"`);
check((await page.textContent('#cupRows .row[data-row="3"] .row-label')) === '3', '딸기·망고 줄은 3번째 연주');
await page.screenshot({ path: path.join(OUT, '3-built.png') });

// 위치 옮기기: 팥을 2층 → 0층 왼쪽으로 옮기면 얼음과 동시에
await dragTo(`${slot(1, 1)} .item`, slot(0, 0));
check((await itemsState()).filter((i) => i.row === 0).length === 2, '재료를 옮겨 같은 줄로');
await dragTo(`${slot(0, 0)} .item`, slot(1, 1));
check((await itemsState()).find((i) => i.ing === 'redbean').row === 1, '다시 제자리로');

// ---------- 3. 재생: 순서와 동시 연주 ----------
await page.evaluate(() => { const r = document.querySelector('#bpm'); r.value = 150; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); });
await page.click('#btnPlay');
const timeline = [];
let maxLevel = 0;
let shot = false;
const t0 = Date.now();
while (Date.now() - t0 < 5000) {
  const snap = await page.evaluate(() => ({
    on: [...document.querySelectorAll('#cupRows .item.playing')].map((d) => d.dataset.ing).sort().join('+'),
    st: window.__mpf.player.state,
    lv: window.__level(),
  }));
  maxLevel = Math.max(maxLevel, snap.lv);
  if (snap.on && timeline[timeline.length - 1] !== snap.on) timeline.push(snap.on);
  if (!shot && snap.on === 'mango+strawberry') { shot = true; await page.screenshot({ path: path.join(OUT, '4-playing.png') }); }
  if (snap.st === 'stopped' && timeline.length) break;
  await page.waitForTimeout(15);
}
console.log('   연주 순서:', timeline.join(' → '));
check(JSON.stringify(timeline) === JSON.stringify(['ice', 'redbean', 'mango+strawberry', 'mango', 'icecream']),
  '아래부터 순서대로, 딸기·망고 동시 시작, 1박 딸기가 먼저 끝남');
check(maxLevel > 0.02, `실제로 소리가 남 (최대 크기 ${maxLevel.toFixed(3)})`);
check(await page.evaluate(() => window.__mpf.player.state) === 'stopped', '끝나면 저절로 멈춤');
check(await page.locator('#cupRows .item.playing').count() === 0, '끝나면 반짝임 꺼짐');

// ---------- 4. 연주 중 잠금, 마구 누르기, 멈춤 ----------
await page.click('#btnPlay');
await page.waitForTimeout(200);
const before = JSON.stringify(await itemsState());
await dragTo(`${slot(1, 1)} .item`, slot(5, 0));
check(JSON.stringify(await itemsState()) === before, '연주 중에는 재료가 안 움직임');
check(await page.locator('#toast').isVisible(), '연주 중 안내 메시지');
for (let i = 0; i < 8; i++) await page.click('#btnRestart', { delay: 0 });
await page.waitForTimeout(300);
check(await page.evaluate(() => window.__mpf.player.state) === 'playing', '처음부터를 여러 번 눌러도 한 번만 연주');
await page.click('#btnPlay'); // 일시정지
check(await page.evaluate(() => window.__mpf.player.state) === 'paused', '일시정지');
await page.click('#btnPlay'); // 이어서
check(await page.evaluate(() => window.__mpf.player.state) === 'playing', '이어서 연주');
await page.click('#btnStop');
await page.waitForTimeout(300);
const quiet = await page.evaluate(() => window.__level());
check(quiet < 0.002, `멈추면 소리가 남지 않음 (${quiet.toFixed(4)})`);

// ---------- 4-1. 재료마다 악기 고르기 ----------
await page.click('#btnVoices');
check(await page.locator('#voiceDialog[open]').count() === 1, '악기 고르기 창 열림');
check(await page.locator('#voiceIngs .vi').count() === 10 && await page.locator('#voiceChoices .vc').count() === 10, '재료 10개 · 악기 소리 10가지');
await page.click('#voiceIngs .vi[data-ing="strawberry"]');
await page.click('#voiceChoices .vc[data-voice="synthFun"]');
check(await page.locator('#voiceChoices .vc.on[data-voice="synthFun"]').count() === 1, '고른 악기 표시');
await page.click('#voiceClose');
check(/신시사이저/.test(await page.textContent('#palette .ing[data-ing="strawberry"] .ing-inst')), '재료 목록에 바뀐 악기 표시');
check(await page.locator('#band .member.used[data-inst="synth"]').count() === 1, '우리 밴드에 신시사이저 불 켜짐');
await page.click('#btnPlay');
let sawSynth = false;
for (let i = 0; i < 120 && !sawSynth; i++) {
  sawSynth = await page.evaluate(() => [...document.querySelectorAll('#cupRows .item.playing')].some((d) => d.dataset.ing === 'strawberry')
    && document.querySelector('#band .member[data-inst="synth"]').classList.contains('playing'));
  await page.waitForTimeout(25);
}
check(sawSynth, '딸기가 연주될 때 신시사이저가 움직임');
await page.click('#btnStop');

// ---------- 5. 저장 → 새로 열어 불러오기 ----------
const savedItems = await itemsState();
await page.click('#btnSave');
await page.fill('#saveTitle', '시험 빙수 노래');
await page.click('#saveOk');
check(await page.waitForSelector('#doneDialog[open]', { timeout: 3000 }).then(() => true, () => false), '완성 화면');
await page.click('#doneLibrary');
check(await page.locator('#workList .work').count() === 1, '보관함에 작품 1개');
await page.screenshot({ path: path.join(OUT, '5-library.png') });
await page.reload();
await page.click('#home [data-go="library"]');
await page.click('#workList .work [data-act="edit"]');
await attachMeter();
check(JSON.stringify(await itemsState()) === JSON.stringify(savedItems), '불러오면 위치·크기 그대로');
check(await page.inputValue('#bpm') === '150', '빠르기도 그대로');
check(JSON.stringify(await page.evaluate(() => window.__mpf.state.voices)) === '{"strawberry":"synthFun"}', '고른 악기도 그대로');
check(/시험 빙수 노래/.test(await page.textContent('#createTitle')), '제목 표시');

// 초기화
await page.click('#btnClear');
await page.click('#confirmYes');
check((await itemsState()).length === 0, '초기화하면 모두 비움');
await page.reload(); // 보관함 작품은 그대로
await page.click('#home [data-go="library"]');
check(await page.locator('#workList .work').count() === 1, '초기화해도 저장한 작품은 남음');

// ---------- 6. 도전 미션 ----------
await page.click('[data-go="home"] >> visible=true');
await page.click('#home [data-go="challenge"]');
await page.click('.mission[data-mission="together"]');
await attachMeter();
await dragTo('#palette .ing[data-ing="ice"]', slot(0, 0));
await dragTo('#palette .ing[data-ing="redbean"]', slot(0, 1));
check(await page.locator('#missionPanel.ok').count() === 1, '미션 조건 충족 표시');
await page.click('#btnPlay');
await page.waitForSelector('#doneDialog[open]', { timeout: 8000 });
check(/미션 성공/.test(await page.textContent('#doneTitle')), '끝까지 들으면 미션 성공');
await page.click('#doneClose');
await page.click('#btnBack');
check(await page.locator('.mission[data-mission="together"].done').count() === 1, '도전 목록에 성공 표시');

// ---------- 6-1. 노래 따라 만들기 ----------
await page.click('[data-go="home"] >> visible=true');
await page.click('#home [data-go="songs"]');
check(await page.locator('.song-card').count() >= 6, '노래 따라 만들기: 노래 목록');
await page.click('.song-card[data-song="berry-march"] .song-level[data-level="1"]');
await attachMeter();
check(/딸기 망고 행진/.test(await page.textContent('#createTitle')), '따라 만들기 화면 열림');
// 정답 듣기: 컵이 비어 있어도 소리가 남
await page.click('#btnSongListen');
let songLevel = 0;
for (let i = 0; i < 40; i++) { songLevel = Math.max(songLevel, await page.evaluate(() => window.__level())); await page.waitForTimeout(25); }
check(songLevel > 0.02, `정답 노래가 소리 남 (${songLevel.toFixed(3)})`);
await page.click('#btnStop');
// 악보는 다른 창 없이 컵 옆, 같은 층 높이에 보임 (보며 만들기: 재료와 박자)
const scoreRows = await page.evaluate(() => [...document.querySelectorAll('#cupRows .row')]
  .filter((r) => !r.querySelector('.row-score').hidden)
  .map((r) => ({ row: Number(r.dataset.row), text: r.querySelector('.row-score').textContent, sameHeight: (() => {
    const a = r.getBoundingClientRect(), b = r.querySelector('.row-score').getBoundingClientRect();
    return Math.abs((a.top + a.height / 2) - (b.top + b.height / 2)) < 2;
  })() })).sort((a, b) => a.row - b.row));
check(scoreRows.length === 4 && scoreRows.map((r) => r.row).join() === '0,1,2,3', `악보: 컵 1~4층 옆에 표시 (${scoreRows.map((r) => r.row).join()})`);
check(scoreRows.every((r) => r.sameHeight) && /2박/.test(scoreRows[0].text) && /1박/.test(scoreRows[1].text), '악보 줄이 그 층과 같은 높이 · 박자 표시');
check(await page.locator('dialog[open]').count() === 0, '악보를 보려고 다른 창을 열지 않음');
{
  // 악보가 오른쪽 패널을 가리지 않음
  const sb = await page.locator('#cupRows .row[data-row="0"] .row-score').boundingBox();
  const side = await page.locator('.side').boundingBox();
  check(sb.x + sb.width <= side.x, '악보가 오른쪽 패널을 가리지 않음');
}
// 일부러 틀리게: 얼음 2박 / 딸기 2박(정답 1박) / 망고 1박
await dragTo('#palette .ing[data-ing="ice"]', slot(0, 1));
await page.click('#sizeBtns .size-btn[data-level="3"]');
await dragTo('#palette .ing[data-ing="strawberry"]', slot(1, 1));
await page.click('#sizeBtns .size-btn[data-level="3"]');
await dragTo('#palette .ing[data-ing="mango"]', slot(2, 1));
await page.click('#btnSongCheck');
await page.waitForTimeout(200);
const rows = await page.$$eval('#cupRows .row', (els) => els
  .filter((r) => !r.querySelector('.row-score').hidden)
  .sort((a, b) => a.dataset.row - b.dataset.row)
  .map((r) => (r.querySelector('.row-score').classList.contains('ok') ? 'ok' : 'bad')));
check(JSON.stringify(rows) === JSON.stringify(['ok', 'bad', 'ok', 'bad']), `틀린 층을 컵 옆에서 바로 알려 줌 (${rows.join(',')})`);
check(/더 짧게/.test(await page.textContent('#songState')) && /더 짧게/.test(await page.textContent('#toast')), '딸기는 "더 짧게" 힌트');
await page.click('#cupRows .row[data-row="3"] .row-score');
check(/4층 ❌ 아직 없어요/.test(await page.textContent('#toast')), '악보 줄을 누르면 그 층 결과 안내');
// 고치기: 딸기 1박, 아이스크림 2박 더하기 → 정답
await page.click(`${slot(1, 1)} .item`);
await page.click('#sizeBtns .size-btn[data-level="2"]');
await dragTo('#palette .ing[data-ing="icecream"]', slot(3, 0));
await page.click('#sizeBtns .size-btn[data-level="3"]');
await page.click('#btnSongCheck');
await page.waitForSelector('#doneDialog[open]', { timeout: 3000 });
check(/똑같아요/.test(await page.textContent('#doneTitle')), '똑같이 쌓으면 성공');
await page.click('#doneClose');
await page.click('#btnBack');
check(await page.locator('.song-card[data-song="berry-march"] .song-level.done[data-level="1"]').count() === 1, '노래 목록에 성공 표시');

// ---------- 7. 악기 소리 체험 ----------
await page.click('[data-go="home"] >> visible=true');
await page.click('#home [data-go="instruments"]');
check(await page.locator('.ens-tab').count() === 7, '악단 7개 (밴드 · 오케스트라 · 재즈 · 오르골 · 타악기 · 국악 · 전자)');
check(await page.locator('.inst-card').count() === 7, '밴드 악기 7가지');
check(await page.locator('.inst-ing').count() === 10, '재료 버튼 10개');
await page.click('#lenPick [data-level="4"]');
for (const b of await page.locator('.inst-ing').all()) await b.click();
await page.click('.ens-tab[data-ens="gugak"]');
check(/가야금/.test(await page.textContent('#instGrid')) && await page.locator('.inst-card').count() === 8, '국악단: 국악기 8가지');
await attachMeter();
await page.click('.inst-ing >> nth=0');
let gugakLv = 0;
for (let i = 0; i < 20; i++) { gugakLv = Math.max(gugakLv, await page.evaluate(() => window.__level())); await page.waitForTimeout(25); }
check(gugakLv > 0.02, `국악기 소리가 남 (${gugakLv.toFixed(3)})`);
await page.screenshot({ path: path.join(OUT, '6-instruments.png') });

// ---------- 7-1. 테마마다 다른 악단 ----------
const ENS = { bingsu: '밴드', pizza: '오케스트라', burger: '재즈', cake: '오르골', icecream: '타악기', animals: '국악단', space: '전자 음악단' };
for (const [themeId, ensName] of Object.entries(ENS)) {
  await page.click('[data-go="home"] >> visible=true');
  await page.click('#home [data-go="themes"]');
  await page.click(`.theme-card[data-theme="${themeId}"]`);
  await attachMeter();
  const first = await page.getAttribute('#palette .ing >> nth=0', 'data-ing');
  await dragTo(`#palette .ing[data-ing="${first}"]`, slot(0, 0));
  await page.click('#btnPlay');
  let lv = 0;
  for (let i = 0; i < 30; i++) { lv = Math.max(lv, await page.evaluate(() => window.__level())); await page.waitForTimeout(25); }
  await page.click('#btnStop');
  const label = await page.textContent('#bandLabel');
  check(label.includes(ensName) && lv > 0.02, `${themeId}: ${label.trim()} 연주 (${lv.toFixed(3)})`);
  if (themeId === 'pizza') {
    // 다른 악단 악기도 빌려 올 수 있어요: 피자(오케스트라) 도우를 국악 장구로
    await page.click('#btnVoices');
    await page.click('#voiceEns [data-ens="gugak"]');
    await page.click('#voiceChoices .vc[data-voice="janggu"]');
    await page.click('#voiceClose');
    check(/장구/.test(await page.textContent('#palette .ing[data-ing="dough"]')), '다른 악단 악기 빌려 오기 (도우 → 장구)');
    check(await page.locator('#band .member.used[data-inst="janggu"]').count() === 1, '빌려 온 악기도 우리 악단에 보임');
  }
  await page.click('#btnBack');
}

// ---------- 8. 태블릿 터치로 끌어다 놓기 ----------
const tctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const tp = await tctx.newPage();
tp.on('pageerror', (e) => errors.push(String(e)));
await tp.goto(URL_);
await tp.tap('text=음악 만들기');
await tp.tap('.theme-card[data-theme="bingsu"]');
const cdp = await tctx.newCDPSession(tp);
async function touchDrag(fromSel, toSel) {
  const a = await tp.locator(fromSel).boundingBox();
  const b = await tp.locator(toSel).boundingBox();
  const p0 = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const p1 = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p0] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p0.x + (p1.x - p0.x) * i / 10, y: p0.y + (p1.y - p0.y) * i / 10 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
await touchDrag('#palette .ing[data-ing="banana"]', slot(2, 1));
await touchDrag('#palette .ing[data-ing="jelly"]', slot(2, 2));
const touchItems = await tp.evaluate(() => window.__mpf.state.items.map((i) => `${i.ing}@${i.row},${i.col}`).sort());
check(JSON.stringify(touchItems) === JSON.stringify(['banana@2,1', 'jelly@2,2']), `터치로 끌어다 놓기 (${touchItems.join(' ')})`);
// 눌러서 고르고 빈 칸 누르기
await tp.tap('#palette .ing[data-ing="cereal"]');
await tp.tap(slot(4, 0));
check(await tp.evaluate(() => window.__mpf.state.items.some((i) => i.ing === 'cereal' && i.row === 4)), '재료를 누르고 빈 칸을 눌러도 놓임');
await tp.screenshot({ path: path.join(OUT, '7-tablet.png') });

// 태블릿 가로(주소창 뺀 낮은 화면)에서 재료 10개가 스크롤 없이 다 보이는지
const lctx = await browser.newContext({ viewport: { width: 1024, height: 690 }, hasTouch: true });
const lp = await lctx.newPage();
await lp.goto(URL_);
await lp.tap('text=음악 만들기');
await lp.tap('.theme-card[data-theme="bingsu"]');
const shownTab = await lp.evaluate(() => {
  const pr = document.querySelector('#palette').getBoundingClientRect();
  return [...document.querySelectorAll('#palette .ing')].filter((e) => { const q = e.getBoundingClientRect(); return q.top >= pr.top - 1 && q.bottom <= pr.bottom + 1; }).length;
});
check(shownTab === 10, `태블릿 가로: 재료 10개 모두 보임 (${shownTab}개)`);

// 폰: 한 화면(스크롤 없음)에 컵 · 재료 · 버튼, 재료 띠에서 위로 끌어 컵에 놓기
const pctx = await browser.newContext({ viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true });
const pp = await pctx.newPage();
pp.on('pageerror', (e) => errors.push(String(e)));
await pp.goto(URL_);
await pp.tap('text=음악 만들기');
await pp.tap('.theme-card[data-theme="bingsu"]');
const phone = await pp.evaluate(() => {
  const vh = window.innerHeight;
  const inView = (s) => { const q = document.querySelector(s).getBoundingClientRect(); return q.top >= 0 && q.bottom <= vh + 1; };
  return {
    scrollX: document.documentElement.scrollWidth - window.innerWidth,
    scrollY: document.documentElement.scrollHeight - vh,
    all: ['#cup', '#palette', '.controls'].every(inView),
  };
});
check(phone.scrollX <= 0 && phone.scrollY <= 0, `폰: 화면이 위아래·옆으로 넘치지 않음 (${phone.scrollY}px, ${phone.scrollX}px)`);
check(phone.all, '폰: 컵 · 재료 · 재생 버튼이 한 화면에');
const pcdp = await pctx.newCDPSession(pp);
async function phoneDrag(fromSel, toSel) {
  const a = await pp.locator(fromSel).boundingBox();
  const b = await pp.locator(toSel).boundingBox();
  const p0 = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const p1 = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await pcdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p0] });
  for (let i = 1; i <= 12; i++) {
    await pcdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p0.x + (p1.x - p0.x) * i / 12, y: p0.y + (p1.y - p0.y) * i / 12 }] });
  }
  await pcdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
await phoneDrag('#palette .ing[data-ing="mango"]', slot(0, 1));
check(await pp.evaluate(() => window.__mpf.state.items.some((i) => i.ing === 'mango' && i.row === 0 && i.col === 1)), '폰: 재료 띠에서 위로 끌어 컵에 놓기');
// 재료 띠를 옆으로 밀면 넘어가서 뒤쪽 재료(아이스크림)가 보임
const stripBefore = await pp.evaluate(() => document.querySelector('.palette-grid').scrollLeft);
const strip = await pp.locator('.palette-grid').boundingBox();
{
  const y = strip.y + strip.height / 2, x0 = strip.x + strip.width * 0.8;
  await pcdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
  for (let i = 1; i <= 15; i++) {
    await pcdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 - i * 15, y }] });
    await pp.waitForTimeout(16);
  }
  await pcdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await pp.waitForTimeout(300);
}
const after = await pp.evaluate(() => document.querySelector('.palette-grid').scrollLeft);
check(await pp.evaluate(() => window.__mpf.state.items.length) === 1, '폰: 옆으로 밀 때는 재료가 컵에 들어가지 않음');
check(after > stripBefore + 50, `폰: 재료 띠를 옆으로 밀어 넘기기 (${stripBefore} → ${after})`);
await pp.screenshot({ path: path.join(OUT, '8-phone.png') });

// ---------- 9. 단계별 도전 → 랜덤 조합 → 가사 ----------
{
  const vctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const vp = await vctx.newPage();
  vp.on('pageerror', (e) => errors.push(String(e)));
  vp.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await vp.goto(URL_);
  await vp.click('#home .menu-btn.m6');
  check(await vp.locator('#levelList .level-card').count() === 5, '단계별 도전: 단계 5개');
  check(await vp.locator('#levelList .level-card:not([disabled])').count() === 1, '단계별 도전: 처음엔 1단계만 열림');
  check(await vp.locator('#btnCombo').isDisabled(), '단계별 도전: 랜덤 조합은 잠김');
  await vp.screenshot({ path: path.join(OUT, '9-levels.png') });
  // 1단계: 얼음(드럼) 4층, 같은 크기
  await vp.click('#levelList .level-card[data-level="1"]');
  check(await vp.locator('#missionPanel').isVisible(), '1단계: 목표 패널이 보임');
  check(await vp.locator('#lyricsPanel').isHidden(), '1단계: 가사 쓰기는 아직 잠김');
  await vp.evaluate(() => { document.querySelector('#bpm').value = 160; document.querySelector('#bpm').dispatchEvent(new Event('input')); });
  await vp.click('#palette .ing[data-ing="ice"]');
  for (const r of [0, 1, 2, 3]) await vp.click(slot(r, 1));
  check(await vp.locator('#missionPanel.ok').count() === 1, '1단계: 드럼 4층으로 조건 채움');
  await vp.click('#btnPlay');
  await vp.waitForSelector('#doneDialog[open]', { timeout: 15000 });
  check((await vp.textContent('#doneTitle')).includes('1단계 통과'), '1단계: 끝까지 들으면 통과');
  check(await vp.locator('#doneNext').isVisible(), '1단계: 다음 단계 버튼');
  await vp.click('#doneNext');
  check(await vp.evaluate(() => window.__mpf.state.mission?.level) === 2, '다음 단계(2단계)로 이동');
  await vp.click('#btnBack');
  check(await vp.locator('#levelList .level-card:not([disabled])').count() === 2, '1단계 통과 후 2단계가 열림');
  // 5단계까지 통과한 기록으로 (저장된 진행 상황 복원)
  await vp.evaluate(() => localStorage.setItem('musicPlayFactory.levels.v1', JSON.stringify([1, 2, 3, 4, 5])));
  await vp.reload();
  await vp.click('#home .menu-btn.m6');
  check(!(await vp.locator('#btnCombo').isDisabled()), '5단계 통과 후 랜덤 조합이 열림');
  await vp.click('#btnCombo');
  const combo = await vp.evaluate(() => ({ id: window.__mpf.state.theme.id, backing: window.__mpf.state.theme.backing, n: document.querySelectorAll('#palette .ing').length }));
  check(combo.id.startsWith('combo-') && Boolean(combo.backing) && combo.n >= 5, `랜덤 조합 무대 열림 (${combo.id}, 반주 ${combo.backing}, 악기 ${combo.n}개)`);
  check(await vp.locator('#missionPanel [data-act="backing"]').isVisible(), '랜덤 조합: 반주 듣기 버튼');
  await vp.evaluate(() => {
    const a = window.__mpf.audio;
    a.ensure();
    const an = a.ctx.createAnalyser();
    an.fftSize = 2048;
    a.master.connect(an);
    window.__level = () => {
      const d = new Float32Array(an.fftSize);
      an.getFloatTimeDomainData(d);
      return Math.sqrt(d.reduce((x, v) => x + v * v, 0) / d.length);
    };
  });
  await vp.click('#missionPanel [data-act="backing"]');
  // 반주는 악기마다 치는 간격이 달라서 1.5초 동안 가장 큰 소리를 재요
  const peak = () => vp.evaluate(async () => { let m = 0; for (let i = 0; i < 30; i++) { m = Math.max(m, window.__level()); await new Promise((r) => setTimeout(r, 50)); } return m; });
  const backingLevel = await peak();
  check(backingLevel > 0.01, `랜덤 조합: 반주 소리가 남 (${backingLevel.toFixed(3)})`);
  await vp.click('#btnStop');
  const ings = await vp.evaluate(() => [...document.querySelectorAll('#palette .ing')].map((b) => b.dataset.ing));
  await vp.click(`#palette .ing[data-ing="${ings[0]}"]`);
  await vp.click(slot(0, 0));
  await vp.click(`#palette .ing[data-ing="${ings[1]}"]`);
  await vp.click(slot(0, 1));
  await vp.click(slot(1, 1));
  await vp.click(`#palette .ing[data-ing="${ings[2]}"]`);
  await vp.click(slot(2, 1));
  check(await vp.locator('#missionPanel.ok').count() === 1, '랜덤 조합: 악기 3가지 · 3층 · 함께 연주로 조건 채움');
  await vp.evaluate(() => { document.querySelector('#bpm').value = 160; document.querySelector('#bpm').dispatchEvent(new Event('input')); });
  await vp.click('#btnPlay');
  const comboLevel = await peak();
  check(comboLevel > 0.01, `랜덤 조합: 반주 + 악기 연주 (${comboLevel.toFixed(3)})`);
  await vp.waitForSelector('#doneDialog[open]', { timeout: 15000 });
  check((await vp.textContent('#doneTitle')).includes('조합 완성'), '랜덤 조합: 끝까지 들으면 성공');
  await vp.click('#doneClose');
  await vp.screenshot({ path: path.join(OUT, '9-combo.png') });
  // 가사 쓰기 (교육용 체크)
  check(await vp.locator('#lyricsPanel').isVisible(), '가사 쓰기 패널이 열림');
  await vp.click('#btnLyrics');
  await vp.fill('#lyricsInput', '내 번호는 010-1234-5678');
  await vp.click('#lyricsOk');
  check(await vp.locator('#lyricsDialog[open]').count() === 1 && (await vp.textContent('#lyricsMsg')).includes('개인 정보'), '가사: 전화번호는 친절하게 막음');
  await vp.fill('#lyricsInput', '바보 멍청이');
  await vp.click('#lyricsOk');
  check((await vp.textContent('#lyricsMsg')).includes('고운 말'), '가사: 놀리는 말은 막음');
  await vp.fill('#lyricsInput', '반짝반짝 우리 노래\n다 함께 불러요');
  await vp.click('#lyricsOk');
  check(await vp.locator('#lyricsDialog[open]').count() === 0, '가사: 고운 가사는 통과');
  check((await vp.textContent('#lyricsShow')).includes('반짝반짝 우리 노래'), '가사가 노래와 함께 보임');
  await vp.click('#btnSave');
  await vp.click('#saveOk');
  await vp.click('#doneLibrary');
  check((await vp.textContent('#workList')).includes('반짝반짝 우리 노래'), '보관함에 가사와 함께 저장');
  await vp.screenshot({ path: path.join(OUT, '9-library-lyrics.png') });
  await vctx.close();

  // 폰에서 단계별 도전 화면
  const p2 = await browser.newContext({ viewport: { width: 390, height: 664 }, hasTouch: true, isMobile: true });
  const pq = await p2.newPage();
  pq.on('pageerror', (e) => errors.push(String(e)));
  await pq.goto(URL_);
  await pq.tap('#home .menu-btn.m6');
  const over = await pq.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(over <= 0, `폰: 단계별 도전 화면이 옆으로 넘치지 않음 (${over}px)`);
  await pq.screenshot({ path: path.join(OUT, '9-phone-levels.png'), fullPage: true });
  await p2.close();
}

check(errors.length === 0, `스크립트 오류 없음${errors.length ? `: ${errors.join(' | ')}` : ''}`);

await browser.close();
server.close();
console.log(`\n스크린샷: ${OUT}`);
console.log(failures ? `❌ ${failures}개 실패` : '🎉 모두 통과');
process.exit(failures ? 1 : 0);
