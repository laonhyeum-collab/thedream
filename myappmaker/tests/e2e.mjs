// 진짜 브라우저로 학생 → 교사 → 메타버스 전체 흐름을 시험합니다.
// 실행: npm run e2e   (Playwright + Chromium 필요)   스크린샷: E2E_OUT 폴더
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { startServer } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const OUT = process.env.E2E_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'myappmaker-e2e-'));
fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const { server, gas, port } = await startServer(0);
const base = `http://127.0.0.1:${port}/myappmaker`;
const q = `api=${encodeURIComponent(`http://127.0.0.1:${port}/gas`)}&class=TEST-CLASS`;
const browser = await chromium.launch();
const errors = [];
let shot = 0;

async function newPage(viewport = { width: 1024, height: 768 }) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
  page.on('dialog', (d) => d.accept());
  return page;
}
const snap = (page, name) => page.screenshot({ path: path.join(OUT, `${String(++shot).padStart(2, '0')}-${name}.png`) });
const step = (s) => console.log(`• ${s}`);

const fruit = fs.readFileSync(path.join(ROOT, 'world/samples/fruit-catch.html'), 'utf8');

async function fillPlan(page, name, appName) {
  await page.click('#startBtn');
  await page.waitForSelector('#topics:not([hidden])');
  // 실제 게임 이름 + 폭력 → 안내만 나오고 그대로는 추천하지 않음
  await page.fill('#wish', '마인크래프트처럼 총으로 좀비 죽이는 게임');
  await page.click('#askBtn');
  await page.waitForSelector('.notice-item.existing');
  await page.waitForSelector('.notice-item.violence');
  for (const t of await page.locator('.topic-card').allTextContents()) assert.ok(!/마인크래프트|총|죽이/.test(t), `걸러진 추천: ${t}`);
  // 부적절한 내용 → 추천 없음
  await page.fill('#wish', '카지노 도박 게임');
  await page.click('#askBtn');
  await page.waitForSelector('.notice-item.blocked');
  assert.equal(await page.locator('.topic-card').count(), 0, '부적절한 요청은 추천 없음');
  // 예시 칩 + 관심사 → 배움 요소가 있는 추천
  await page.fill('#wish', '');
  await page.click('#exampleChips >> text=🌊 바다');
  assert.equal(await page.inputValue('#wish'), '바다');
  await page.click('#askBtn');
  await page.waitForSelector('[data-rec]');
  const cards = await page.locator('.topic-card').count();
  assert.ok(cards >= 3, '바다 추천');
  assert.equal(await page.locator('.topic-card .learn').count(), cards, '모든 추천에 배움 요소');
  await snap(page, 'recommend');
  await page.click('.topic-card >> text=바다 쓰레기 청소부');
  await page.waitForSelector('#preview:not([hidden])');
  assert.equal(await page.locator('.phone').count(), 3, '예상 화면 3종');
  await snap(page, 'preview');
  await page.click('#chooseTopic');
  await page.waitForSelector('#plan:not([hidden])');
  await page.fill('[data-key="developer"]', name);
  await page.fill('[data-key="appName"]', appName);
  await page.fill('[data-key="intro"]', '하늘에서 떨어지는 과일을 바구니로 받는 게임');
  await page.fill('[data-key="goal"]', '30초 안에 100점 넘기기');
  assert.match(await page.inputValue('[data-key="learnGoal"]'), /학년 · /, '배울 내용 미리 채움');
  await snap(page, 'plan-part1');
  await page.click('#nextPart');
  await page.fill('[data-key="ruleStart"]', '시작 버튼을 눌러요');
  await page.fill('[data-key="rulePlay"]', '바구니를 손가락으로 끌어요');
  await page.fill('[data-key="ruleWin"]', '100점 넘기기');
  await page.fill('[data-key="ruleLose"]', '폭탄 3번 받기');
  await page.fill('[data-key="charName"]', '다람이');
  await page.fill('[data-key="charLook"]', '노란 모자를 쓴 다람쥐');
  await page.fill('[data-key="charTrait"]', '엄청 빨라요');
  await page.fill('[data-key="place"]', '과수원');
  await page.click('#nextPart');
  for (const f of ['이동하기', '모으기(수집)', '피하기']) await page.click(`[data-key="features"] >> text="${f}"`);
  await page.click('[data-key="features"] >> text="점프하기"');
  assert.equal(await page.locator('[data-key="features"] [aria-pressed="true"]').count(), 3, '기능은 3개까지만');
  assert.equal(await page.locator('[data-diff]').count(), 0, '난이도는 4번 묶음에');
  await page.click('[data-key="elements"] >> text="점수"');
  await page.click('[data-key="elements"] >> text="시간 제한"');
  await snap(page, 'plan-part3');
  await page.click('#nextPart');
  await page.fill('[data-key="extra"]', '황금 사과를 받으면 5초 동안 점수 2배');
  assert.equal(await page.locator('[data-diff]').count(), 2, '난이도 두 단계');
  await page.click('[data-diff="normal"]');
  await page.waitForFunction(() => document.querySelector('#saveStatus').textContent.includes('저장 완료'), null, { timeout: 5000 });
}

try {
  // ───── 1. 학생 (저장소 연결) ─────
  step('학생: 선생님이 만든 아이디로 로그인 → 주제 → 기획서');
  const accs = gas.post({ action: 'createAccounts', teacherKey: 'TEST-TEACHER', prefix: '', from: 1, count: 2 }).made;
  const pinOf = (id) => accs.find((a) => a.loginId === id).pin;
  const login = async (page, id, pin) => {
    await page.waitForSelector('#login:not([hidden])');
    await page.fill('#loginId', id); await page.fill('#loginPin', pin); await page.click('#loginBtn');
  };
  const st = await newPage();
  await st.goto(`${base}/student/?${q}`);
  assert.equal(await st.isHidden('#home'), true, '저장소가 있으면 로그인부터');
  await login(st, '01', '0000');
  await st.waitForFunction(() => document.querySelector('#loginMsg').textContent.includes('맞지 않아요'));
  await snap(st, 'student-login');
  await login(st, '01', pinOf('01'));
  await st.waitForSelector('#home:not([hidden])');
  assert.match(await st.textContent('#userBtn'), /01/);
  await snap(st, 'student-home');
  await fillPlan(st, '하늘', '다람이의 과일 바구니');

  step('학생: 새로고침해도 기획서가 남아 있음');
  await st.reload();
  await st.goto(`${base}/student/#plan`);
  await st.waitForSelector('#plan:not([hidden])');
  assert.equal(await st.inputValue('[data-key="developer"]'), '하늘');
  assert.equal(await st.locator('#progressText').textContent() !== '0%', true);

  step('학생: 프롬프트에 기획서 내용이 들어감');
  await st.click('[data-step="prompts"]');
  await st.waitForSelector('#prompts:not([hidden])');
  const prompt = await st.textContent('#appPrompt');
  for (const s of ['다람이의 과일 바구니', '바다 쓰레기 청소부', '과학 5~6학년 · 해양 오염과 분리배출', '한 판(1단계)만', '30초 안에 100점 넘기기', '황금 사과', '노란 모자를 쓴 다람쥐', 'HTML 파일 하나', '보통']) assert.ok(prompt.includes(s), `프롬프트에 "${s}"`);
  assert.equal(await st.isHidden('#missingBox'), true, '★ 항목 모두 채움');
  await st.click('#prompts details summary');
  assert.ok((await st.locator('.img-prompt').count()) >= 2, '이미지 프롬프트');
  assert.ok((await st.textContent('#imagePrompts')).includes('16:9'));
  await snap(st, 'prompts');

  step('학생: 기획서에 실제 게임 이름이 있으면 프롬프트 복사가 막힘');
  await st.goto(`${base}/student/#plan`);
  await st.waitForSelector('#plan:not([hidden])');
  await st.fill('[data-key="appName"]', '포켓몬 과일 바구니');
  await st.click('[data-step="prompts"]');
  await st.waitForSelector('#safetyBox:not([hidden])');
  assert.match(await st.textContent('#safetyBox'), /포켓몬/);
  await st.evaluate(() => navigator.clipboard.writeText('비어 있음'));
  await st.click('[data-copy="app"]');
  assert.equal(await st.evaluate(() => navigator.clipboard.readText()), '비어 있음', '복사되지 않음');
  await st.click('#safetyBox >> text=고치러 가기');
  await st.fill('[data-key="appName"]', '다람이의 과일 바구니');
  await st.click('[data-step="prompts"]');
  await st.waitForSelector('#prompts:not([hidden]) #safetyBox[hidden]', { state: 'attached' });
  await st.click('[data-copy="app"]');
  assert.match(await st.evaluate(() => navigator.clipboard.readText()), /바다 쓰레기 청소부/, '고친 뒤 복사됨');

  step('학생: 앱 붙여 넣기 → 상자 안 실행 (저장소 막힘 보완 포함)');
  await st.click('[data-go="myapp"]');
  await st.fill('#appCode', '여기 코드예요\n```html\n<!doctype html><html><head><title>t</title></head><body><script>localStorage.setItem("k","v");document.body.dataset.v=localStorage.getItem("k");document.body.dataset.parent=String((()=>{try{return !!parent.document}catch(e){return "blocked"}})());</script></body></html>\n```\n끝');
  await st.click('#runApp');
  const frame = st.frameLocator('#appFrame');
  await frame.locator('body[data-v="v"]').waitFor({ state: 'attached', timeout: 5000 });
  assert.equal(await frame.locator('body').getAttribute('data-parent'), 'blocked', '학생 앱은 부모 화면에 접근 못 함');
  await st.fill('#appCode', fruit);
  await st.click('#runApp');
  await frame.locator('#go').click();
  await frame.locator('#start[hidden]').waitFor({ state: 'attached' });
  step('학생: 내 그림 올리기 → 하얀 배경 지우고 게임에 들어감');
  const pics = await st.evaluate(() => {
    const mk = (w, h, draw, type) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c.toDataURL(type); };
    return {
      hero: mk(600, 600, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8590c'; x.beginPath(); x.arc(300, 300, 180, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillRect(280, 280, 40, 40); }, 'image/png'),
      bg: mk(1200, 1200, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#bfe9ff'); g.addColorStop(1, '#8fd694'); x.fillStyle = g; x.fillRect(0, 0, w, h); }, 'image/png'),
    };
  });
  const toFile = (name, dataUrl) => ({ name, mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') });
  await st.waitForSelector('#picStatus >> text=그림 자리를 찾았어요');
  await st.setInputFiles('#pic-hero', toFile('hero.png', pics.hero));
  await st.waitForSelector('[data-pic="hero"].done img');
  await st.setInputFiles('#pic-background', toFile('bg.png', pics.bg));
  await st.waitForSelector('[data-pic="background"].done img');
  const heroInfo = await frame.locator('#basket img').evaluate((img) => new Promise((ok) => {
    const go = () => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const a = (px, py) => x.getImageData(px, py, 1, 1).data[3];
      ok({ w: c.width, h: c.height, corner: a(0, 0), ring: a(c.width / 2 | 0, 4), middle: a(c.width / 2 | 0, c.height / 2 | 0), src: img.src.slice(0, 16) }); };
    if (img.complete) go(); else img.onload = go;
  }));
  assert.ok(heroInfo.w <= 320 && heroInfo.w === heroInfo.h, `주인공 정사각형으로 줄임 ${heroInfo.w}`);
  assert.equal(heroInfo.corner, 0, '하얀 배경은 투명하게');
  assert.equal(heroInfo.middle, 255, '그림 안쪽 흰색은 그대로');
  assert.match(await frame.locator('#game').evaluate((g) => g.style.background), /data:image\/jpeg/, '배경 그림이 게임에 들어감');
  const bgDims = await st.locator('[data-pic="background"] img').evaluate((i) => [i.naturalWidth, i.naturalHeight]);
  assert.deepEqual(bgDims, [960, 540], '배경은 16:9로 잘라 줄임');
  await snap(st, 'pictures');
  // 코드를 다시 붙여 넣어도 그림은 남음
  await st.fill('#appCode', fruit);
  await st.click('#runApp');
  await frame.locator('#basket img').waitFor({ state: 'attached' });
  await st.reload();
  await st.waitForSelector('[data-pic="hero"].done img');
  for (const c of ['시작 버튼', '점수', '타이머']) await st.click(`#testChecks >> text=${c}`);
  await st.fill('#fixProblem', '폭탄이 너무 많아요');
  assert.ok((await st.textContent('#fixPrompt')).includes('폭탄이 너무 많아요'));
  await snap(st, 'myapp');

  step('학생: 입점 신청 (저장소) — 내 캐릭터 함께 (부스 건물은 지도에 있어서 그림 칸 없음)');
  await st.click('[data-go="submit"]');
  await st.waitForSelector('#submit:not([hidden])');
  await st.click('#avatarBox .avatar-opt[data-k="hair"][data-i="3"]');
  await st.click('#avatarBox .avatar-opt[data-k="acc"][data-i="4"]');
  assert.equal(await st.locator('#boothFile, #boothSlot').count(), 0, '부스 그림 칸은 숨김');
  assert.equal(await st.locator('#submitChecks li.ok').count(), 3);
  await st.click('#sendBtn');
  await st.waitForSelector('#statusBox.submitted');
  await snap(st, 'submitted');
  assert.equal(gas.sheets.get('제출').data.length, 2);
  assert.ok([...gas.files.values()].some((f) => !f.trashed && f.content.includes("url(' + IMAGES.background") && /hero: 'data:image\/(webp|png)/.test(f.content)), '제출한 앱에 그림이 들어 있음');
  assert.ok(!gas.sheets.get('제출').data[1].join('').includes('data:image'), '기획서(시트)에는 그림을 넣지 않음');
  const row1 = Object.fromEntries(gas.sheets.get('제출').data[0].map((k, i) => [k, gas.sheets.get('제출').data[1][i]]));
  assert.deepEqual([JSON.parse(row1.planJson).avatar.hair, JSON.parse(row1.planJson).avatar.acc], [3, 4], '캐릭터가 함께 제출됨');
  assert.ok(!row1.boothFileId, '부스 그림은 보내지 않음');
  assert.equal(row1.studentKey, 'id:01', '아이디로 제출');
  await st.waitForFunction(() => document.querySelector('#cloudStatus').textContent.includes('저장소 저장'));
  assert.ok(gas.sheets.get('학생계정').data[1][6], '작업이 저장소에 저장됨');

  // ───── 2. 교사 ─────
  step('교사: 연결 → 확인 → 입점 승인');
  const tc = await newPage({ width: 1280, height: 860 });
  step('교사: 새 기기 → 시작 화면에서 저장소 연결 (주소·반 코드)');
  await tc.goto(`${base}/teacher/`);
  await tc.waitForSelector('#gate:not([hidden]) #gConnect');
  assert.equal(await tc.isHidden('main.wrap'), true, '연결 전에는 시작 화면만');
  await tc.fill('#gEndpoint', `http://127.0.0.1:${port}/gas`);
  await tc.fill('#gClass', 'WRONG-CLASS');
  await tc.click('#gConnect');
  await tc.waitForFunction(() => document.querySelector('#gateBody').textContent.includes('반 코드가 맞지 않아요'));
  await tc.fill('#gClass', 'TEST-CLASS');
  await tc.click('#gConnect');
  step('교사: 시작 화면에서 설치 열쇠로 첫 관리자 계정 만들기 → 로그아웃 → 아이디·비밀번호로 로그인');
  await tc.waitForSelector('#gateLogin #adminLoginBtn');
  await snap(tc, 'teacher-gate');
  await tc.click('#gateLogin details summary');
  const setup = tc.locator('#gateLogin details');
  await setup.locator('input[placeholder="Code.gs 의 TEACHER_KEY"]').fill('WRONG');
  await setup.locator('input[placeholder="예) kim"]').fill('kim');
  await setup.locator('input[placeholder="6자 이상"]').fill('kim-pass-1');
  await tc.click('#gateLogin #adminSetupBtn');
  await tc.waitForFunction(() => document.querySelector('#gateLogin').textContent.includes('설치 열쇠'));
  await setup.locator('input[placeholder="Code.gs 의 TEACHER_KEY"]').fill('TEST-TEACHER');
  await tc.click('#gateLogin #adminSetupBtn');
  await tc.waitForSelector('#gate[hidden]', { state: 'attached' });
  assert.match(await tc.textContent('#userChip'), /kim/);
  await tc.click('#userChip');
  await tc.waitForSelector('#gateLogin #adminLoginBtn');
  await tc.fill('#gateLogin input[placeholder="관리자 아이디"]', 'kim');
  await tc.fill('#gateLogin input[placeholder="비밀번호"]', 'kim-pass-1');
  await tc.click('#gateLogin #adminLoginBtn');
  await tc.waitForSelector('#gate[hidden]', { state: 'attached' });
  await tc.click('[data-tab="settings"]');
  await tc.waitForFunction(() => document.querySelector('#adminBox').textContent.includes('kim 로그인됨'));
  await tc.click('#cfgSave');
  await tc.waitForFunction(() => document.querySelector('#cfgResult').textContent.includes('연결 성공'));
  assert.ok((await tc.textContent('#teacherLinkCode')).includes('class=TEST-CLASS'), '다른 기기용 교사 주소');
  await tc.waitForSelector('#qrBox:not([hidden]) #studentQr svg');   // 로그인한 교사 화면에 학생 QR이 보임
  await snap(tc, 'teacher-admin');
  step('교사: 학생 계정 — 아이디별 작업 저장·입점 상태, 계정 더 만들기');
  await tc.click('[data-tab="accounts"]');
  await tc.waitForSelector('.acc-table');
  assert.equal(await tc.locator('.acc-table tbody tr').count(), 2);
  assert.match(await tc.textContent('.acc-table tbody tr >> nth=0'), /다람이의 과일 바구니/);
  await tc.fill('#accountsAdmin input[type="number"] >> nth=1', '1');
  await tc.click('#createAccBtn');
  await tc.waitForFunction(() => document.querySelectorAll('.acc-table tbody tr').length === 3);
  await snap(tc, 'teacher-accounts');
  assert.ok((await tc.textContent('#studentLink')).includes('class=TEST-CLASS'));
  assert.ok(!(await tc.textContent('#studentLink')).includes('TEST-TEACHER'), '학생 주소에 교사 열쇠 없음');
  await tc.click('[data-tab="students"]');
  await tc.waitForSelector('.student');
  await snap(tc, 'teacher-list');
  await tc.click('.student');
  await tc.waitForSelector('#detail:not([hidden])');
  await tc.frameLocator('#detail iframe').locator('#go').waitFor();
  await tc.fill('#detail textarea', '황금 사과 아이디어 최고!');
  await snap(tc, 'teacher-detail');
  await tc.click('#detail >> text=입점 승인');
  await tc.waitForSelector('#detail[hidden]', { state: 'attached' });
  await tc.waitForSelector('.student >> text=입점');
  await tc.click('[data-tab="booths"]');
  await tc.waitForSelector('.booth');
  await snap(tc, 'teacher-booths');
  await tc.click('[data-tab="lesson"]');
  assert.equal(await tc.locator('.lesson').count(), 4, '4차시');
  await tc.click('#timerPresets >> text=5분');
  assert.equal(await tc.textContent('#timerDisplay'), '05:00');
  await snap(tc, 'teacher-lesson');

  step('교사: 월드 꾸미기 — 학교 이름·공지·선생님의 앱');
  await tc.click('[data-tab="world"]');
  await tc.waitForSelector('#worldAdmin input[placeholder="예) 해솔초등학교"]');
  await tc.fill('#worldAdmin input[placeholder="예) 해솔초등학교"]', '해솔초등학교');
  await tc.fill('#worldAdmin textarea[maxlength="300"]', '오늘은 앱 월드 오픈!');
  await tc.click('#worldAdmin button:has-text("💾 저장") >> nth=0');
  await tc.waitForFunction(() => document.querySelector('.toast') && document.querySelector('.toast').textContent.includes('저장했어요'));
  await tc.waitForSelector('#worldAdmin input[placeholder="예) 구구단 마을"]');
  await tc.fill('#worldAdmin input[placeholder="예) 구구단 마을"]', '구구단 마을');
  await tc.fill('#worldAdmin textarea.code', '<!doctype html><html><body><h1 id="teacherApp">선생님 앱</h1><script>1</script></body></html>');
  await tc.click('#worldAdmin button:has-text("🚀 올리기")');
  await tc.waitForFunction(() => document.querySelector('.toast').textContent.includes('선생님의 앱을 올렸어요'));
  const wconf = JSON.parse(gas.props.get('WORLD'));
  assert.equal(wconf.settings.schoolName, '해솔초등학교');
  assert.equal(wconf.teacherApp.title, '구구단 마을');
  assert.equal(await tc.locator('#assetGrid .pic-slot').count(), 10, '월드 그림 자리 10개');
  await snap(tc, 'teacher-world');

  step('학생: 선생님 피드백 확인');
  await st.click('#checkBtn');
  await st.waitForSelector('#statusBox.approved');
  assert.ok((await st.textContent('#statusBox')).includes('황금 사과 아이디어 최고!'));
  assert.ok((await st.textContent('#statusBox')).includes('1번 부스'));

  step('학생: 다른 노트북에서 같은 아이디로 로그인 → 기획서·앱·입점 상태가 그대로');
  const lb = await newPage();
  await lb.goto(`${base}/student/?${q}`);
  await login(lb, '01', pinOf('01'));
  await lb.waitForSelector('#home:not([hidden])');
  assert.match(await lb.textContent('#resumeInfo'), /다람이의 과일 바구니/, '저장소에서 불러옴');
  await lb.click('#continueBtn');
  await lb.goto(`${base}/student/#myapp`);
  assert.ok((await lb.inputValue('#appCode')).length > 100, '앱 코드도 이어짐');
  await lb.click('[data-go="submit"]');
  await lb.waitForSelector('#statusBox.approved');
  await snap(lb, 'laptop-b');
  await lb.close();

  step('학생: 같은 태블릿을 다른 학생(아이디 02)이 써도 섞이지 않음');
  await st.click('#userBtn');
  await login(st, '02', pinOf('02'));
  await st.waitForSelector('#home:not([hidden])');
  assert.equal(await st.isHidden('#continueBtn'), true, '02는 빈 기획서로 시작');
  await fillPlan(st, '구름', '구름이의 과일 비');
  await st.goto(`${base}/student/#myapp`);
  await st.fill('#appCode', fruit);
  await st.click('#runApp');
  await st.click('[data-go="submit"]');
  await st.waitForSelector('#submit:not([hidden])');
  assert.equal(await st.isHidden('#statusBox'), true, '새 기획서는 상태가 비어 있음');
  await st.click('#sendBtn');
  await st.waitForSelector('#statusBox.submitted');
  assert.equal(gas.sheets.get('제출').data.length, 3, '두 학생 모두 저장');
  await st.click('#userBtn');
  await login(st, '01', pinOf('01'));
  await st.waitForSelector('#home:not([hidden])');
  assert.match(await st.textContent('#resumeInfo'), /다람이의 과일 바구니/, '01로 다시 들어오면 01의 작업');

  // ───── 3. 메타버스 (저장소) ─────
  step('메타버스: 학교 이름 → 내 캐릭터 → 입장 → 탐험 → 부스 → 좋아요 → 미션·공지·친구·선생님 앱');
  const wd = await newPage();
  await wd.goto(`${base}/world/?${q}`);
  await wd.waitForFunction(() => document.querySelector('#sourceInfo').textContent.includes('부스 1개'));
  assert.match(await wd.textContent('#lobbyTitle'), /해솔초등학교/);
  assert.equal(await wd.isVisible('#loginForm'), true, '저장소가 있으면 아이디 로그인부터');
  assert.equal(await wd.isHidden('#enterBtn'), true);
  await wd.fill('#wLoginId', '01'); await wd.fill('#wLoginPin', '99999');
  await wd.click('#loginBtn');
  await wd.waitForSelector('#loginMsg:not([hidden])');
  assert.equal(await wd.isHidden('#stage'), true, '비밀번호가 틀리면 못 들어감');
  await wd.fill('#wLoginPin', pinOf('01'));
  await snap(wd, 'world-lobby');
  await wd.click('#loginBtn');
  await wd.waitForFunction(() => document.querySelector('.toast') && document.querySelector('.toast').textContent.includes('내 부스를 찾았어요'));
  // 로그인한 뒤 ⚙️ 설정에서 별명·캐릭터 (학생 앱에서 만든 캐릭터·별명으로 시작)
  await wd.waitForSelector('#panel:not([hidden])');
  assert.match(await wd.textContent('#panelBody'), /아이디 01/, '설정 창에 내 아이디');
  await wd.fill('#panelBody input[aria-label="내 별명"]', '바다');
  await wd.click('#panelBody .avatar-opt[data-k="gender"][data-i="1"]');
  await wd.click('#panelBody .avatar-opt[data-k="hair"][data-i="2"]');
  assert.equal(await wd.inputValue('#panelBody input[aria-label="내 별명"]'), '바다', '캐릭터를 골라도 이름 유지');
  await snap(wd, 'world-settings');
  await wd.click('#panelBody button:has-text("다 했어요")');
  assert.equal(await wd.textContent('#meNick'), '바다');
  await wd.click('[data-nav="myapp"]');
  await wd.waitForSelector('#panelBody >> text=내 부스로 가기');
  await wd.click('#closePanel');
  assert.equal(await wd.getAttribute('#map', 'data-mode'), 'preset:castle', '지도 그림을 안 올리면 준비된 지도(기본: 별빛 성 섬)');
  // 길을 따라 걷기: 어떤 방향으로 걸어도 길(크림색 돌길) 밖으로 나가지 않음
  assert.equal(await wd.evaluate(() => window.__worldDebug.hasWalk()), true, '준비된 지도는 길을 찾음');
  for (const k of ['ArrowUp', 'ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) {
    await wd.keyboard.down(k); await wd.waitForTimeout(700); await wd.keyboard.up(k);
    assert.equal(await wd.evaluate(() => window.__worldDebug.onPath()), true, `${k}: 길 위`);
  }
  // 멀리 있는 부스를 누르면 길을 따라 돌아가는 경로 (곧게 가로지르지 않음)
  const walked = await wd.evaluate(() => window.__worldDebug.goFar());
  assert.ok(walked.points >= 3, '여러 번 꺾이는 길');
  assert.equal(walked.allOnPath, true, '경로가 모두 길 위');
  // 여러 곳(풀밭·연못·바다 위 포함)을 눌러 실제로 걸어 봄: 한 걸음도 길 밖·물 칸을 스치지 않고, 물 칸은 길이 아님
  const checked = await wd.evaluate(() => window.__worldDebug.walkCheck(30, 3));
  assert.equal(checked.bad, 0, `계곡·연못 가로지르기 없음 ${JSON.stringify(checked)}`);
  assert.equal(checked.wet, 0, '물 칸은 길이 아님');
  assert.equal(checked.arrived, checked.routes, '누른 곳(가까운 길)까지 도착');
  await snap(wd, 'world-walk');
  await wd.click('[data-side="explore"]');
  await wd.click('.dir-item[data-booth]');
  await wd.waitForSelector('#appRoom:not([hidden])');
  await wd.frameLocator('#roomFrame').locator('#go').waitFor();
  await snap(wd, 'world-room');
  await wd.click('#likeBtn');
  await wd.waitForFunction(() => document.querySelector('#likeCount').textContent === '1');
  assert.equal(await wd.isDisabled('#likeBtn'), true, '좋아요는 한 번만');
  await wd.click('#closeRoom');
  await wd.click('[data-side="missions"]');
  assert.match(await wd.textContent('#panelBody'), /1\/3/, '미션 진행이 보임');
  await wd.click('#closePanel');
  await wd.click('[data-side="notice"]');
  assert.match(await wd.textContent('#panelBody'), /오늘은 앱 월드 오픈!/);
  await wd.click('#closePanel');
  await wd.click('[data-nav="friends"]');
  assert.equal(await wd.locator('#panelBody canvas.face').count(), 1, '친구 캐릭터');
  await wd.click('#closePanel');
  await wd.click('[data-side="explore"]');
  await wd.click('.dir-item >> nth=0');
  await wd.frameLocator('#roomFrame').locator('#teacherApp').waitFor();
  await wd.click('#closeRoom');
  await wd.click('[data-side="badges"]');
  assert.ok((await wd.locator('.badge:not(.locked)').count()) >= 1, '선생님 앱을 해서 배지');
  await wd.click('#closePanel');
  await wd.click('[data-nav="map"]');
  await snap(wd, 'world-map');

  // ───── 4. 체험용 샘플 월드 (저장소 없음) ─────
  step('메타버스: 샘플 부스');
  const demo = await newPage({ width: 820, height: 1180 });
  await demo.goto(`${base}/world/?demo=1`);
  await demo.click('#enterBtn');
  await demo.waitForSelector('#stage:not([hidden])');
  await demo.waitForSelector('#panel:not([hidden])');   // 처음엔 별명·캐릭터 설정부터
  await demo.click('#closePanel');
  assert.equal(await demo.textContent('#meNick'), '방문자', '별명을 안 쓰면 방문자');
  await snap(demo, 'world-demo-tablet');
  await demo.click('[data-side="explore"]');
  assert.equal(await demo.locator('.dir-item').count(), 3, '선생님 앱 + 샘플 2');
  await demo.click('.dir-item >> text=동물 짝꿍 카드');
  await demo.frameLocator('#roomFrame').locator('#go').click();
  assert.equal(await demo.frameLocator('#roomFrame').locator('.card').count(), 16);

  // ───── 4-1. 처음 여는 기기(새 브라우저·시크릿 창) ─────
  step('새 기기: 연결 정보 없는 학생 앱 → 「우리 반에 연결하기」 → 선생님 주소 붙여 넣기 → 로그인 화면');
  const nd = await newPage();
  await nd.goto(`${base}/student/`);
  await nd.waitForSelector('#connectGate');
  assert.match(await nd.textContent('#connectGate'), /우리 반에 연결하기/);
  await snap(nd, 'newdevice-connect');
  await nd.fill('#connectLink', 'DREAM');
  await nd.click('#connectGo');
  assert.match(await nd.textContent('#connectMsg'), /주소 전체/);
  await nd.fill('#connectLink', `${base}/student/?${q}`);
  await Promise.all([nd.waitForURL(/api=/), nd.click('#connectGo')]);
  await nd.waitForSelector('#login:not([hidden]) #loginBtn');
  assert.equal(await nd.locator('#connectGate').count(), 0, '연결 뒤엔 안내 없음');
  await nd.goto(`${base}/student/`);   // 주소 없이 다시 열어도 이 기기엔 연결이 남음
  await nd.waitForSelector('#login:not([hidden]) #loginBtn');
  await snap(nd, 'newdevice-login');

  step('새 기기: 선생님 주소(QR)로 바로 열면 안내 없이 로그인 화면 · 메타버스도 같음');
  const nd2 = await newPage({ width: 820, height: 1180 });   // 태블릿
  await nd2.goto(`${base}/student/?${q}`);
  await nd2.waitForSelector('#login:not([hidden]) #loginBtn');
  assert.equal(await nd2.locator('#connectGate').count(), 0);
  const nw = await newPage();
  await nw.goto(`${base}/world/`);
  await nw.waitForSelector('#connectGate');
  assert.match(await nw.textContent('#connectOffline'), /체험 모드/);
  const nw2 = await newPage();
  await nw2.goto(`${base}/world/?${q}`);
  await nw2.waitForSelector('#lobby');
  assert.equal(await nw2.locator('#connectGate').count(), 0);

  step('새 기기: 교사 앱 — 연결 설정에 학생 QR · 교사용 링크');
  const nt = await newPage({ width: 1280, height: 860 });
  await nt.goto(`${base}/teacher/?${q}`);
  // 새 기기 교사 앱은 로그인 전이라 탭이 가려져 있어요 → 연결 설정 화면 내용만 확인
  await nt.waitForSelector('#qrBox:not([hidden]) #studentQr svg', { state: 'attached' });
  assert.equal(await nt.isHidden('#qrNone'), true);
  assert.match(await nt.getAttribute('#studentQr', 'data-url'), /student\/\?api=.*class=TEST-CLASS/);
  assert.match(await nt.textContent('#teacherLinkCode'), /teacher\/\?api=/);
  await nt.evaluate(() => document.querySelector('#qrBig').click());
  await nt.waitForSelector('#qrModal .qr-big svg');
  await snap(nt, 'teacher-qr');
  await nt.click('#qrModal button:has-text("닫기")');
  assert.equal(await nt.locator('#qrModal').count(), 0);

  // ───── 5. 파일 방식 (저장소 없이) ─────
  step('파일 방식: 학생 제출 파일 → 교사 넣기 → 메타버스 파일 → 월드');
  const fs2 = await newPage({ width: 390, height: 844 });   // 휴대폰 크기
  await fs2.goto(`${base}/student/`);
  await fs2.waitForSelector('#connectGate');   // 연결 정보 없는 기기: 「우리 반에 연결하기」 먼저
  await fs2.click('#connectOffline');
  assert.equal(await fs2.locator('#connectGate').count(), 0, '저장소 없이 하기 → 안내 닫힘');
  await fillPlan(fs2, '별', '별이의 과일 잡기');
  await fs2.goto(`${base}/student/#myapp`);
  await fs2.fill('#appCode', fruit);
  await fs2.click('#runApp');
  await fs2.click('[data-go="submit"]');
  await fs2.waitForSelector('#submit:not([hidden]) #sendOffline:not([hidden])');
  assert.equal(await fs2.isHidden('#sendOnline'), true, '저장소 없으면 파일 제출만');
  await snap(fs2, 'phone-submit');
  const [dl] = await Promise.all([fs2.waitForEvent('download'), fs2.click('#fileSubmitBtn')]);
  const subFile = path.join(OUT, 'submission.json');
  await dl.saveAs(subFile);
  assert.equal(JSON.parse(fs.readFileSync(subFile, 'utf8')).schema, 'myappmaker.submission/1');

  const tf = await newPage({ width: 1280, height: 860 });
  await tf.goto(`${base}/teacher/`);
  await tf.click('#gFileMode');
  await tf.click('[data-tab="students"]');
  await tf.setInputFiles('#importSubs', subFile);
  await tf.waitForSelector('.student >> text=별이의 과일 잡기');
  await tf.click('.student');
  await tf.frameLocator('#detail iframe').locator('#go').waitFor();
  await tf.click('#detail >> text=입점 승인');

  step('교사(파일 방식): 지도 그림 올리고 문 자리 찍기');
  await tf.click('[data-tab="world"]');
  await tf.waitForSelector('#assetGrid [data-asset="map"]');
  const mapPng = await tf.evaluate(() => { const c = document.createElement('canvas'); c.width = 1600; c.height = 900; const x = c.getContext('2d'); x.fillStyle = '#7CC95C'; x.fillRect(0, 0, 1600, 900); x.fillStyle = '#8E6BD8'; x.fillRect(700, 250, 200, 150); for (let i = 0; i < 12; i++) { x.fillStyle = '#E4572E'; x.fillRect(100 + (i % 6) * 250, 120 + Math.floor(i / 6) * 520, 90, 80); } return c.toDataURL('image/png'); });
  await tf.setInputFiles('#asset-map', toFile('map.png', mapPng));
  await tf.waitForSelector('.hs-stage img');
  await tf.waitForFunction(() => { const i = document.querySelector('.hs-stage img'); return i.complete && i.naturalWidth > 0; });
  await tf.evaluate(() => document.querySelector('.hs-stage').scrollIntoView({ block: 'end' }));
  const clicks = [[800, 410], [800, 820], ...Array.from({ length: 12 }, (_, i) => [145 + (i % 6) * 250, 210 + Math.floor(i / 6) * 520])];
  const keys = ['hall', 'start', ...Array.from({ length: 12 }, (_, i) => `b${i}`)];
  for (const [i, [x, y]] of clicks.entries()) {
    await tf.click(`[data-hs="${keys[i]}"]`);
    const box = await tf.locator('.hs-stage img').boundingBox();
    await tf.mouse.click(box.x + (x / 1600) * box.width, box.y + (y / 900) * box.height);
  }
  assert.match(await tf.textContent('#hotspotCard'), /학생 부스 12\/12/);
  await tf.click('#hotspotCard button:has-text("💾 저장")');
  await tf.waitForFunction(() => document.querySelector('.toast').textContent.includes('문 자리를 저장했어요'));
  await snap(tf, 'teacher-hotspots');
  await tf.click('[data-tab="booths"]');
  const [wdl] = await Promise.all([tf.waitForEvent('download'), tf.click('#exportWorld')]);
  const worldFile = path.join(OUT, 'world.json');
  await wdl.saveAs(worldFile);

  const wf = await newPage();
  await wf.goto(`${base}/world/`);
  await wf.waitForSelector('#connectGate');
  await wf.click('#connectOffline');
  await wf.click('#lobby details summary');
  await wf.setInputFiles('#worldFile', worldFile);
  await wf.waitForFunction(() => document.querySelector('#sourceInfo').textContent.includes('메타버스 파일'));
  await wf.click('#enterBtn');
  await wf.fill('#panelBody input[aria-label="내 별명"]', '별');
  await wf.click('#closePanel');
  assert.equal(await wf.getAttribute('#map', 'data-mode'), 'illustrated', '지도 그림 + 문 자리 = 그림 지도 모드');
  await snap(wf, 'world-illustrated');
  await wf.click('[data-side="explore"]');
  await wf.click('.dir-item[data-booth]');
  await wf.frameLocator('#roomFrame').locator('#go').waitFor();

  step('첫 화면 허브');
  const hub = await newPage();
  await hub.goto(`${base}/?${q}`);
  assert.ok((await hub.getAttribute('a.door', 'href')).includes('class=TEST-CLASS'));
  await snap(hub, 'hub');

  assert.deepEqual(errors, [], '브라우저 오류 없음');
  console.log(`\n✅ 전체 흐름 통과 · 스크린샷: ${OUT}`);
} catch (e) {
  console.error('\n❌ 실패:', e.message);
  if (errors.length) console.error(errors.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
}
