// 학생 그림을 AI 코드의 그림 자리(IMAGES)에 넣기
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyImages, findImagesBlock, cleanImages, imagesSize } from '../shared/images.js';
import { emptyPlan, normalizePlan } from '../shared/plan.js';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const JPG = 'data:image/jpeg;base64,/9j/4AAQ';

test('그림 자리 찾기: 여러 모양의 IMAGES', () => {
  assert.deepEqual(findImagesBlock(`<script>const IMAGES = { background: '', hero: "" };</script>`).keys, ['background', 'hero']);
  assert.deepEqual(findImagesBlock(`let IMAGES={\n "background": '', // 배경\n icon1: \`\`, nested: { a: 1 }\n}`).keys, ['background', 'icon1', 'nested', 'a']);
  assert.equal(findImagesBlock('<script>const x = 1</script>'), null);
});

test('그림 넣기: 값만 바뀌고 나머지 코드는 그대로', () => {
  const code = `<script>\nconst IMAGES = { background: '', hero: "", icon1: '' };\nconst s = "}{";\nstart();\n</script>`;
  const out = applyImages(code, { background: JPG, hero: PNG });
  assert.ok(out.includes(`background: '${JPG}'`));
  assert.ok(out.includes(`hero: "${PNG}"`));
  assert.ok(out.includes(`icon1: ''`), '안 넣은 자리는 그대로');
  assert.ok(out.endsWith(`const s = "}{";\nstart();\n</script>`), '뒤쪽 코드 그대로');
  assert.equal(applyImages(out, { background: JPG, hero: PNG }), out, '여러 번 넣어도 같음');
  assert.equal(applyImages(out, { hero: JPG }).match(/data:image\/jpeg/g).length, 2, '바꿔 넣기');
});

test('그림 넣기: 자리가 없는 키는 추가, IMAGES가 없으면 원본 그대로', () => {
  const out = applyImages(`const IMAGES = { background: '' };`, { icon2: PNG });
  assert.match(out, /icon2: 'data:image\/png/);
  const plain = '<p>그림 자리 없음</p>';
  assert.equal(applyImages(plain, { hero: PNG }), plain);
});

test('그림 데이터 검사: 그림이 아닌 것·모르는 자리·너무 큰 것은 버림', () => {
  const c = cleanImages({ hero: PNG, background: 'javascript:alert(1)', icon1: `data:image/png;base64,${'A'.repeat(300000)}`, bogus: PNG, icon3: "data:image/png;base64,AA');alert(1);//" });
  assert.deepEqual(Object.keys(c), ['hero']);
  assert.equal(applyImages(`const IMAGES = { hero: '' }`, { hero: "data:image/png;base64,x'+alert(1)+'" }), `const IMAGES = { hero: '' }`, '코드를 끼워 넣을 수 없음');
  assert.equal(imagesSize({ a: 'abc', b: 'de' }), 5);
  const p = emptyPlan('fruit-bomb');
  p.app.images = { hero: PNG, background: 'nope' };
  assert.deepEqual(normalizePlan(JSON.parse(JSON.stringify(p))).app.images, { hero: PNG });
});
