// 실제 브라우저로 앱 전체를 확인하는 자동 테스트
// 사용법: npm run build && npx vite preview --port 4173 &  →  npm run e2e
// (Playwright 가 설치된 환경에서 실행: npm i -D playwright 후 npx playwright install chromium)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const URL = process.env.APP_URL ?? 'http://localhost:4173/';
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'pml-e2e-'));
const V = '.mode-grid:not([hidden])';

let pass = 0;
let fail = 0;
async function check(name, fn) {
  try {
    await fn();
    pass++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    fail++;
    console.log(`  ✗ ${name}\n      ${String(e.message ?? e).split('\n')[0]}`);
  }
}
function assert(c, msg) {
  if (!c) throw new Error(msg);
}

const browser = await chromium.launch();

async function fresh(viewport = { width: 1366, height: 768 }, settings = { seenGuide: true }) {
  const ctx = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL);
  await page.evaluate((s) => {
    localStorage.clear();
    localStorage.setItem('pixel-magic-lab:settings', JSON.stringify(s));
  }, settings);
  await page.reload();
  await page.waitForSelector('.mode-grid');
  return { ctx, page, errors };
}
const shelf = (page, text) => page.locator(`${V} .shelf-blk`, { hasText: text }).first();
const status = (page) => page.locator(`${V} .status-line b`).first().innerText();

console.log('\n[1] 미션 모드');
{
  const { ctx, page, errors } = await fresh(undefined, { seenGuide: true, unlockAll: true });
  await check('처음 화면에 미션 1이 보인다', async () => {
    assert((await page.locator('.mission-title h2').innerText()) === '첫 번째 마법 점', '미션 1 아님');
  });
  await check('클릭으로 블록 추가 → 실행 → 성공 판정', async () => {
    await shelf(page, '오른쪽으로').click();
    await shelf(page, '아래로').click();
    await shelf(page, '칠하기').click();
    assert((await page.locator(`${V} .script .blk`).count()) === 3, '블록 3개가 아님');
    await page.locator(`${V} .speed button`).nth(3).click();
    await page.locator(`${V} [data-testid=run]`).click();
    await page.waitForSelector('.success-modal', { timeout: 5000 });
    assert((await page.locator('.success-stats').innerText()).includes('3개'), '블록 수 표시 없음');
    await page.locator('.success-modal').getByRole('button', { name: /다음 미션/ }).click();
  });
  await check('잘못된 그림 → 틀린 칸 표시', async () => {
    // 미션 2: 칠하기 1번만
    await shelf(page, '칠하기').click();
    await page.locator(`${V} [data-testid=run]`).click();
    await page.waitForSelector(`${V} .bubble.warn`, { timeout: 5000 });
    assert((await page.locator(`${V} .diff-mark`).count()) === 5, '다른 칸 5개가 표시되어야 함');
  });
  await check('힌트 단계별 보기', async () => {
    await page.locator(`${V} .hint-btn`).click();
    await page.locator(`${V} .hint-btn`).click();
    assert((await page.locator(`${V} .hint`).count()) === 2, '힌트 2개');
  });
  await check('블록 드래그로 순서 바꾸기', async () => {
    await page.locator(`${V} .mini-btn`).click(); // 모두 지우기
    await shelf(page, '칠하기').click();
    await shelf(page, '아래로').click();
    const rows = page.locator(`${V} .script .blk`);
    const a = await rows.nth(1).boundingBox();
    const b = await rows.nth(0).boundingBox();
    await page.mouse.move(a.x + 20, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + 20, a.y - 10, { steps: 5 });
    await page.mouse.move(b.x + 20, b.y + 5, { steps: 5 });
    await page.mouse.up();
    const first = await rows.nth(0).innerText();
    assert(first.includes('아래로'), `첫 블록이 '아래로'여야 함: ${first}`);
  });
  await check('선택 블록 삭제 버튼', async () => {
    await page.locator(`${V} .script .blk`).nth(1).click();
    await page.locator(`${V} .blk-actions .danger`).click();
    assert((await page.locator(`${V} .script .blk`).count()) === 1, '1개 남아야 함');
  });

  // 모든 미션: 선생님 '정답 코드 보기' → 작업 공간에 불러오기 → 실행 → 성공
  await page.locator('.icon-btn[aria-label="선생님 메뉴"]').click();
  await page.locator('.switch-row').nth(1).click();
  await page.keyboard.press('Escape');
  for (let n = 1; n <= 20; n++) {
    await check(`미션 ${n} 정답 코드가 화면에서 실제로 성공`, async () => {
      await page.locator(`${V} .list-btn`).click();
      await page.locator('.map-card .map-num', { hasText: new RegExp(`^${n}$`) }).click();
      await page.locator(`${V} .teacher-btn`).click();
      await page.getByRole('button', { name: '작업 공간에 불러오기' }).click();
      await page.locator(`${V} .speed button`).nth(3).click();
      await page.locator(`${V} [data-testid=run]`).click();
      await page.waitForSelector('.success-modal', { timeout: 20000 });
      await page.locator('.success-modal').getByRole('button', { name: /내 코드 다시 보기/ }).click();
    });
  }
  await check('별과 칭호가 상단에 표시', async () => {
    const t = await page.locator('.wizard-badge b').innerText();
    assert(Number(t) >= 40, `별 개수 ${t}`);
  });
  await check('새로고침 후에도 미션 기록 유지', async () => {
    await page.reload();
    await page.locator(`${V} .list-btn`).click();
    assert((await page.locator('.map-card.done').count()) === 20, '완료 20개');
    await page.keyboard.press('Escape');
  });
  await check('도화지 밖 이동 → 오류 블록 표시 (미션 11 고장 난 코드)', async () => {
    await page.locator(`${V} .list-btn`).click();
    await page.locator('.map-card .map-num', { hasText: /^11$/ }).click();
    await page.locator(`${V} .mini-btn`).click(); // 처음 코드로
    await page.locator(`${V} [data-testid=run]`).click();
    await page.waitForSelector(`${V} .bubble.error`, { timeout: 10000 });
    assert((await page.locator(`${V} .bubble.error`).innerText()).includes('도화지 밖'), '오류 문구');
    assert((await page.locator(`${V} .blk.err`).count()) === 1, '오류 블록 강조');
    assert((await status(page)) === '확인이 필요해요', '상태');
  });
  await check('일시정지 · 한 단계 · 계속', async () => {
    await page.locator(`${V} .speed button`).nth(0).click();
    await page.locator(`${V} [data-testid=run]`).click();
    await page.waitForTimeout(800);
    await page.locator(`${V} .run-bar .btn.pause`).click();
    assert((await status(page)) === '잠깐 멈춤', '멈춤 상태');
    const c1 = await page.locator(`${V} .st-count`).innerText();
    await page.locator(`${V} [data-testid=step]`).click();
    const c2 = await page.locator(`${V} .st-count`).innerText();
    assert(parseInt(c2) === parseInt(c1) + 1, `한 단계 진행 ${c1} → ${c2}`);
    assert((await page.locator(`${V} .blk.active`).count()) === 1, '실행 중 블록 강조');
    await page.locator(`${V} [data-testid=run]`).click();
    assert((await status(page)) === '마법 실행 중', '계속 실행');
  });
  await check('반복 횟수가 너무 크면 안내', async () => {
    await page.locator(`${V} .mini-btn`).click();
    await page.locator(`${V} .script .stepper input`).first().fill('45');
    await page.locator(`${V} [data-testid=run]`).click();
    await page.waitForSelector(`${V} .bubble.error`);
    assert((await page.locator(`${V} .bubble.error`).innerText()).includes('반복 횟수가 너무 커요'), '문구');
  });
  await check('콘솔 오류 없음', async () => assert(errors.length === 0, errors.join(' | ')));
  await ctx.close();
}

console.log('\n[2] 자유 픽셀 공방');
{
  const { ctx, page, errors } = await fresh();
  await page.getByRole('button', { name: /자유 픽셀 공방/ }).click();
  await check('중첩 반복을 클릭으로 만들고 실행', async () => {
    await shelf(page, '반복').click(); // 바깥 반복 (선택됨 → 안에 넣기)
    await shelf(page, '반복').click(); // 안쪽 반복
    await shelf(page, '칠하기').click();
    await shelf(page, '오른쪽으로').click();
    // 안쪽 반복의 다음: 바깥 반복을 선택하고 '아래로' 추가 (바깥 반복 몸통 끝)
    await page.locator(`${V} .script .blk-repeat .blk-icon`).first().click();
    await shelf(page, '아래로').click();
    const inputs = page.locator(`${V} .script .blk-repeat .stepper input`);
    await inputs.nth(0).fill('3');
    await inputs.nth(1).fill('3');
    // 한 줄에 3칸씩, 3줄 → 9칸 (오른쪽으로 9칸까지 이동해도 10칸 안)
    await page.locator(`${V} .speed button`).nth(3).click();
    await page.locator(`${V} [data-testid=run]`).click();
    await page.waitForFunction((v) => document.querySelector(`${v} .status-line b`)?.textContent === '실행 끝', V, { timeout: 10000 });
    const painted = await page.locator(`${V} .pixel-canvas rect[fill="#A88BE0"]`).count();
    assert(painted === 9, `보라 칸 9개여야 함: ${painted}`);
  });
  await check('붓으로 손그림 + 되돌리기', async () => {
    await page.locator(`${V} .hand-tools button`, { hasText: '붓' }).click();
    const box = await page.locator(`${V} .pixel-canvas`).boundingBox();
    await page.mouse.click(box.x + box.width * 0.85, box.y + box.height * 0.85);
    await page.waitForTimeout(150);
    assert((await page.locator(`${V} .pixel-canvas rect[fill="#A88BE0"]`).count()) === 1, '손그림 1칸 (실행 결과는 초기화)');
    await page.locator(`${V} .toggle`, { hasText: '되돌리기' }).click();
    await page.waitForTimeout(150);
    assert((await page.locator(`${V} .pixel-canvas rect[fill="#A88BE0"]`).count()) === 0, '되돌리기');
    await page.locator(`${V} .toggle`, { hasText: '다시' }).click();
    await page.waitForTimeout(150);
    assert((await page.locator(`${V} .pixel-canvas rect[fill="#A88BE0"]`).count()) === 1, '다시 하기');
  });
  await check('작품 이름 입력 후 저장', async () => {
    await page.locator(`${V} .field input`).fill('테스트 무지개');
    await page.locator(`${V} .side-actions`).getByRole('button', { name: '저장하기' }).click();
    await page.waitForSelector('.toast.ok');
  });
  await check('PNG 다운로드', async () => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator(`${V} .side-actions`).getByRole('button', { name: 'PNG 받기' }).click()]);
    const f = path.join(OUT, dl.suggestedFilename());
    await dl.saveAs(f);
    const head = fs.readFileSync(f).subarray(0, 8).toString('hex');
    assert(head === '89504e470d0a1a0a', 'PNG 시그니처');
    assert(dl.suggestedFilename() === '테스트 무지개.png', dl.suggestedFilename());
  });
  await check('새로고침 후 불러오기', async () => {
    await page.reload();
    await page.getByRole('button', { name: /자유 픽셀 공방/ }).click();
    await page.locator(`${V} .side-actions`).getByRole('button', { name: '불러오기' }).click();
    await page.locator('.gal-card', { hasText: '테스트 무지개' }).getByRole('button', { name: '열기' }).click();
    assert((await page.locator(`${V} .field input`).inputValue()) === '테스트 무지개', '이름');
    assert((await page.locator(`${V} .script .blk`).count()) === 5, '블록 5개 복원');
  });
  await check('저장하지 않은 작업 → 모드 이동 시 확인', async () => {
    await shelf(page, '칠하기').click();
    await page.getByRole('button', { name: /움직이는 픽셀 극장/ }).click();
    await page.waitForSelector('.confirm');
    await page.getByRole('button', { name: '그만두기' }).click();
    assert(await page.locator(`${V} .studio-side`).isVisible(), '공방에 머무름');
  });
  await check('작품 삭제는 확인 후', async () => {
    await page.locator(`${V} .side-actions`).getByRole('button', { name: '불러오기' }).click();
    await page.locator('.gal-card', { hasText: '테스트 무지개' }).locator('.btn.danger').click();
    await page.waitForSelector('.confirm');
    await page.locator('.confirm').getByRole('button', { name: '지우기' }).click();
    await page.waitForTimeout(200);
    assert((await page.locator('.gal-card').count()) === 0, '삭제됨');
    await page.keyboard.press('Escape');
  });
  await check('16×16 크기 변경', async () => {
    await page.locator(`${V} .seg button`, { hasText: '16×16' }).click();
    assert((await page.locator(`${V} .stage-card .head-note`).innerText()).includes('16×16'), '크기');
  });
  await check('콘솔 오류 없음', async () => assert(errors.length === 0, errors.join(' | ')));
  await ctx.close();
}

console.log('\n[3] 움직이는 픽셀 극장');
{
  const { ctx, page, errors } = await fresh();
  await page.getByRole('button', { name: /움직이는 픽셀 극장/ }).click();
  await check('프레임 추가 · 복사 · 순서 변경 · 삭제', async () => {
    await page.locator(`${V} .hand-tools button`, { hasText: '붓' }).click();
    const box = await page.locator(`${V} .pixel-canvas`).boundingBox();
    await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.2);
    await page.locator(`${V} .film-tools`).getByRole('button', { name: '복사' }).click();
    await page.locator(`${V} .film-tools`).getByRole('button', { name: '추가' }).click();
    assert((await page.locator(`${V} .film-cell`).count()) === 3, '3장');
    assert((await page.locator(`${V} .onion`).count()) === 1, '어니언 스킨이 이전 프레임을 보여줌');
    await page.locator(`${V} .film-tools button[title="앞으로 옮기기"]`).click();
    assert((await page.locator(`${V} .film-cell.on .film-num`).innerText()) === '2', '2번으로 이동');
    await page.locator(`${V} .film-tools`).getByRole('button', { name: '삭제' }).click();
    await page.locator('.confirm').getByRole('button', { name: '지우기' }).click();
    assert((await page.locator(`${V} .film-cell`).count()) === 2, '2장');
  });
  await check('프레임별 코드 유지', async () => {
    await page.locator(`${V} .film-cell`).nth(1).click();
    await shelf(page, '칠하기').click();
    await page.locator(`${V} .film-cell`).nth(0).click();
    assert((await page.locator(`${V} .script .blk`).count()) === 0, '1번 프레임은 코드 없음');
    await page.locator(`${V} .film-cell`).nth(1).click();
    assert((await page.locator(`${V} .script .blk`).count()) === 1, '2번 프레임 코드 1개');
  });
  await check('템플릿 불러오기와 재생', async () => {
    await page.locator(`${V} .side-actions`).getByRole('button', { name: '예시 템플릿' }).click();
    await page.locator('.gal-card.tpl', { hasText: '통통 뛰는 토끼' }).click();
    await page.getByRole('button', { name: '저장 안 함' }).click();
    assert((await page.locator(`${V} .film-cell`).count()) === 4, '토끼 4프레임');
    const a = await page.locator(`${V} .stage-floor`).innerText();
    await page.waitForTimeout(400);
    const b = await page.locator(`${V} .stage-floor`).innerText();
    assert(a !== b, `재생 중 프레임이 바뀌어야 함 (${a} / ${b})`);
    await page.locator(`${V} [data-testid=anim-play]`).click();
    assert((await page.locator(`${V} .stage-floor`).innerText()) === '멈춤', '정지');
  });
  await check('GIF 내보내기', async () => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator(`${V} .side-actions`).getByRole('button', { name: 'GIF 받기' }).click()]);
    const f = path.join(OUT, 'anim.gif');
    await dl.saveAs(f);
    assert(fs.readFileSync(f).subarray(0, 6).toString() === 'GIF89a', 'GIF 시그니처');
    console.log(`      GIF 파일: ${f}`);
  });
  await check('스프라이트 PNG 내보내기', async () => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator(`${V} .side-actions`).getByRole('button', { name: '프레임 PNG' }).click()]);
    const f = path.join(OUT, 'sheet.png');
    await dl.saveAs(f);
    assert(fs.readFileSync(f).subarray(1, 4).toString() === 'PNG', 'PNG');
  });
  await check('저장 → 새로고침 → 불러오기', async () => {
    await page.locator(`${V} .side-actions`).getByRole('button', { name: '저장하기' }).click();
    await page.reload();
    await page.getByRole('button', { name: /움직이는 픽셀 극장/ }).click();
    await page.locator(`${V} .side-actions`).getByRole('button', { name: '불러오기' }).click();
    await page.locator('.gal-card', { hasText: '통통 뛰는 토끼' }).getByRole('button', { name: '열기' }).click();
    assert((await page.locator(`${V} .film-cell`).count()) === 4, '4프레임 복원');
  });
  await check('콘솔 오류 없음', async () => assert(errors.length === 0, errors.join(' | ')));
  await ctx.close();
}

console.log('\n[4] 화면 크기 (스크롤 없이 한 화면)');
for (const vp of [
  { width: 1366, height: 768 },
  { width: 1366, height: 657 },
  { width: 1280, height: 720 },
  { width: 1280, height: 610 },
]) {
  const { ctx, page } = await fresh(vp);
  for (const tab of ['마법 따라 그리기', '자유 픽셀 공방', '움직이는 픽셀 극장']) {
    await check(`${vp.width}×${vp.height} · ${tab}`, async () => {
      await page.getByRole('button', { name: new RegExp(tab) }).click();
      await page.waitForTimeout(150);
      const r = await page.evaluate((v) => {
        const run = document.querySelector(`${v} [data-testid=run]`).getBoundingClientRect();
        return { sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, runBottom: run.bottom, ih: innerHeight, iw: innerWidth };
      }, V);
      assert(r.sh <= r.ih && r.sw <= r.iw, `페이지 스크롤 생김 ${JSON.stringify(r)}`);
      assert(r.runBottom <= r.ih, '실행 버튼이 화면 밖');
    });
  }
  await ctx.close();
}

await browser.close();
console.log(`\n결과: ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
