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
  step('학생: 주제 → 기획서');
  const st = await newPage();
  await st.goto(`${base}/student/?${q}`);
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
  for (const c of ['시작 버튼', '점수', '타이머']) await st.click(`#testChecks >> text=${c}`);
  await st.fill('#fixProblem', '폭탄이 너무 많아요');
  assert.ok((await st.textContent('#fixPrompt')).includes('폭탄이 너무 많아요'));
  await snap(st, 'myapp');

  step('학생: 입점 신청 (저장소)');
  await st.click('[data-go="submit"]');
  await st.waitForSelector('#submit:not([hidden])');
  assert.equal(await st.locator('#submitChecks li.ok').count(), 3);
  await st.click('#sendBtn');
  await st.waitForSelector('#statusBox.submitted');
  await snap(st, 'submitted');
  assert.equal(gas.sheets.get('제출').data.length, 2);

  // ───── 2. 교사 ─────
  step('교사: 연결 → 확인 → 입점 승인');
  const tc = await newPage({ width: 1280, height: 860 });
  await tc.goto(`${base}/teacher/?${q}`);
  await tc.waitForSelector('#tab-settings:not([hidden])');
  await tc.fill('#cfgKey', 'WRONG');
  await tc.click('#cfgSave');
  await tc.waitForFunction(() => document.querySelector('#cfgResult').textContent.includes('교사 열쇠'));
  await tc.fill('#cfgKey', 'TEST-TEACHER');
  await tc.click('#cfgSave');
  await tc.waitForFunction(() => document.querySelector('#cfgResult').textContent.includes('연결 성공'));
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

  step('학생: 선생님 피드백 확인');
  await st.click('#checkBtn');
  await st.waitForSelector('#statusBox.approved');
  assert.ok((await st.textContent('#statusBox')).includes('황금 사과 아이디어 최고!'));
  assert.ok((await st.textContent('#statusBox')).includes('1번 부스'));

  step('학생: 같은 태블릿을 다른 학생이 써도 덮어쓰지 않음');
  await st.click('#newTopicBtn');
  await st.goto(`${base}/student/?${q}#home`);
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

  // ───── 3. 메타버스 (저장소) ─────
  step('메타버스: 입장 → 걷기 → 부스 → 좋아요');
  const wd = await newPage();
  await wd.goto(`${base}/world/?${q}`);
  await wd.waitForFunction(() => document.querySelector('#sourceInfo').textContent.includes('부스 1개'));
  await wd.fill('#nick', '바다');
  await wd.click('#avatarPick button:nth-child(5)');
  assert.equal(await wd.inputValue('#nick'), '바다', '아바타를 골라도 이름 유지');
  await snap(wd, 'world-lobby');
  await wd.click('#enterBtn');
  await wd.keyboard.down('ArrowDown'); await wd.waitForTimeout(700); await wd.keyboard.up('ArrowDown');
  await snap(wd, 'world-walk');
  await wd.click('#listBtn');
  await wd.click('.dir-item');
  await wd.waitForSelector('#appRoom:not([hidden])');
  await wd.frameLocator('#roomFrame').locator('#go').waitFor();
  await snap(wd, 'world-room');
  await wd.click('#likeBtn');
  await wd.waitForFunction(() => document.querySelector('#likeCount').textContent === '1');
  assert.equal(await wd.isDisabled('#likeBtn'), true, '좋아요는 한 번만');
  await wd.click('#closeRoom');
  // 부스 문 앞으로 걸어가서 Space
  await wd.keyboard.down('ArrowDown'); await wd.waitForTimeout(1500); await wd.keyboard.up('ArrowDown');
  await snap(wd, 'world-near');

  // ───── 4. 체험용 샘플 월드 (저장소 없음) ─────
  step('메타버스: 샘플 부스');
  const demo = await newPage({ width: 820, height: 1180 });
  await demo.goto(`${base}/world/?demo=1`);
  await demo.click('#enterBtn');
  await demo.waitForSelector('#stage:not([hidden])');
  await snap(demo, 'world-demo-tablet');
  await demo.click('#listBtn');
  assert.equal(await demo.locator('.dir-item').count(), 3);
  await demo.click('.dir-item >> text=동물 짝꿍 카드');
  await demo.frameLocator('#roomFrame').locator('#go').click();
  assert.equal(await demo.frameLocator('#roomFrame').locator('.card').count(), 16);

  // ───── 5. 파일 방식 (저장소 없이) ─────
  step('파일 방식: 학생 제출 파일 → 교사 넣기 → 메타버스 파일 → 월드');
  const fs2 = await newPage({ width: 390, height: 844 });   // 휴대폰 크기
  await fs2.goto(`${base}/student/`);
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
  await tf.click('[data-tab="students"]');
  await tf.setInputFiles('#importSubs', subFile);
  await tf.waitForSelector('.student >> text=별이의 과일 잡기');
  await tf.click('.student');
  await tf.frameLocator('#detail iframe').locator('#go').waitFor();
  await tf.click('#detail >> text=입점 승인');
  await tf.click('[data-tab="booths"]');
  const [wdl] = await Promise.all([tf.waitForEvent('download'), tf.click('#exportWorld')]);
  const worldFile = path.join(OUT, 'world.json');
  await wdl.saveAs(worldFile);

  const wf = await newPage();
  await wf.goto(`${base}/world/`);
  await wf.click('#lobby details summary');
  await wf.setInputFiles('#worldFile', worldFile);
  await wf.waitForFunction(() => document.querySelector('#sourceInfo').textContent.includes('메타버스 파일'));
  await wf.click('#enterBtn');
  await wf.click('#listBtn');
  await wf.click('.dir-item');
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
