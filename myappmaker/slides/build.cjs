// MY APP MAKER 프로젝트 소개 발표 자료 만들기
// 실행: npm run slides   (pptxgenjs 필요: npm install)
const path = require('path');
const pptxgen = require('pptxgenjs');

const OUT = path.join(__dirname, 'MY_APP_MAKER_프로젝트_소개.pptx');
const IMG = (f) => path.join(__dirname, 'img', f);

const THEME = {
  name: 'MY APP MAKER',
  headFontFace: 'Malgun Gothic',
  bodyFontFace: 'Malgun Gothic',
  colors: {
    dk1: '23253A', lt1: 'FFFFFF', dk2: '2B2D42', lt2: 'F3F1FF',
    accent1: '6C5CE7', accent2: '12B886', accent3: 'FAB005', accent4: 'FF6B6B', accent5: '339AF0', accent6: 'AE3EC9',
    hlink: '6C5CE7', folHlink: 'AE3EC9',
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';   // 13.33 × 7.5
pres.title = 'MY APP MAKER 프로젝트 소개';
pres.author = 'MY APP MAKER';
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
// 색은 직접 지정 (외부 테마 도구 없이도 같은 색으로 만들어지게)
const C = { text1: HEX.dk1, background1: HEX.lt1, background2: HEX.lt2, accent1: HEX.accent1, accent2: HEX.accent2, accent3: HEX.accent3, accent4: HEX.accent4, accent5: HEX.accent5, accent6: HEX.accent6 };
const W = 13.333;

// ---------- 레이아웃 ----------
pres.defineSlideMaster({
  title: 'TITLE', background: { color: HEX.dk2 },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.7, y: 2.0, w: 6.6, h: 1.6, fontSize: 44, bold: true, color: C.background1, valign: 'bottom', align: 'left', margin: 0 }, text: '' } },
    { placeholder: { options: { name: 'body', type: 'body', x: 0.7, y: 3.75, w: 6.4, h: 1.5, fontSize: 20, color: 'CFD2EA', valign: 'top', align: 'left', margin: 0 }, text: '' } },
  ],
});
pres.defineSlideMaster({
  title: 'SECTION', background: { color: HEX.accent1 },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.9, y: 2.9, w: 11.5, h: 1.2, fontSize: 44, bold: true, color: C.background1, align: 'left', margin: 0 }, text: '' } },
    { placeholder: { options: { name: 'body', type: 'body', x: 0.9, y: 4.15, w: 11.5, h: 0.8, fontSize: 20, color: 'E5E1FF', align: 'left', margin: 0 }, text: '' } },
  ],
});
pres.defineSlideMaster({
  title: 'CONTENT', background: { color: HEX.lt1 },
  margin: [0.5, 0.6, 0.5, 0.6],
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.35, w: 12.1, h: 0.9, fontSize: 32, bold: true, color: C.text1, valign: 'middle', margin: 0 }, text: '' } },
    { text: { text: 'MY APP MAKER', options: { x: 0.6, y: 7.0, w: 3, h: 0.3, fontSize: 10, color: '8A8DA8', margin: 0 } } },
  ],
  slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: '8A8DA8', align: 'right' },
});

let secTitle = '';
const section = (title) => { secTitle = title; pres.addSection({ title }); };
const slide = (master) => pres.addSlide({ masterName: master, sectionTitle: secTitle });
const shadow = () => ({ type: 'outer', color: '3C4078', opacity: 0.18, blur: 10, offset: 3, angle: 90 });

// 화면 캡처를 카드처럼 (공통 모티프)
function screen(s, file, x, y, w, ratio, name) {
  const h = w / ratio;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x - 0.08, y: y - 0.08, w: w + 0.16, h: h + 0.16, rectRadius: 0.12, fill: { color: C.background1 }, line: { color: 'E3E5F3', width: 1 }, shadow: shadow(), objectName: `${name} 틀` });
  s.addImage({ path: IMG(file), x, y, w, h, altText: name, objectName: name });
  return h;
}
// 번호 동그라미 (공통 모티프)
function badge(s, n, x, y, color = C.accent1, size = 0.5) {
  s.addShape(pres.shapes.OVAL, { x, y, w: size, h: size, fill: { color }, line: { color, width: 0 }, objectName: `번호 ${n}` });
  s.addText(String(n), { x, y, w: size, h: size, fontSize: size > 0.6 ? 24 : 16, bold: true, color: C.background1, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
}
function card(s, x, y, w, h, fill = C.background2, name = '카드') {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.15, fill: { color: fill }, line: { color: fill, width: 0 }, objectName: name });
}
const text = (s, t, o) => s.addText(t, { isTextBox: true, margin: 0, fontSize: 16, color: C.text1, valign: 'top', ...o });

// ===================== 1. 표지 =====================
section('시작');
{
  const s = slide('TITLE');
  s.addText('MY APP MAKER', { placeholder: 'title' });
  s.addText([
    { text: '내가 기획하고, AI와 함께 만들고,', options: { breakLine: true } },
    { text: '메타버스 앱 월드에 열어요', options: { breakLine: true } },
    { text: '어린이 게임 앱 만들기 프로젝트 · 40분 × 4차시', options: { fontSize: 15, color: C.accent3 } },
  ], { placeholder: 'body' });
  s.addImage({ path: IMG('world-map.png'), x: 7.5, y: 0.9, w: 5.4, h: 5.4 * 9 / 16, altText: '앱 월드 화면', objectName: '앱 월드 화면' });
  s.addImage({ path: IMG('world-room.png'), x: 8.3, y: 4.3, w: 4.6, h: 4.6 * 9 / 16, altText: '부스 안에서 친구 앱 체험', objectName: '부스 안 화면' });
  s.addNotes('MY APP MAKER는 학생이 게임 앱을 직접 기획하고, AI의 도움으로 만들어, 우리 반 메타버스 앱 월드에 부스로 여는 4차시 프로젝트입니다.');
}

// ===================== 2. 한눈에 =====================
{
  const s = slide('CONTENT');
  s.addText('4차시 뒤, 한 사람이 앱 하나를 앱 월드에 열어요', { placeholder: 'title' });
  const stats = [['20명', '학생 1인 1앱'], ['4차시', '40분 × 4 = 160분'], ['84개', '배움이 있는 추천 주제'], ['15개', '앱 기획서 항목']];
  stats.forEach(([n, l], i) => {
    const x = 0.6 + i * 3.08;
    card(s, x, 1.55, 2.85, 2.1, C.background2, `숫자 ${l}`);
    text(s, n, { x, y: 1.75, w: 2.85, h: 1.1, fontSize: 54, bold: true, color: C.accent1, align: 'center', valign: 'middle' });
    text(s, l, { x, y: 2.9, w: 2.85, h: 0.5, fontSize: 16, color: '6B6F8A', align: 'center' });
  });
  text(s, '학생이 남기는 결과물', { x: 0.6, y: 4.1, w: 6, h: 0.5, fontSize: 20, bold: true });
  const outs = [['📝', '앱 기획서', '목표·규칙·캐릭터·화면·나만의 특별 기능'], ['🎮', '실행되는 앱', '태블릿에서 바로 되는 HTML 게임 1개'], ['🏪', '앱 월드 부스', '친구들이 들어와 놀고 좋아요를 남김']];
  outs.forEach(([e, t, d], i) => {
    const x = 0.6 + i * 4.1;
    card(s, x, 4.7, 3.85, 1.9, 'FFF6D6', `결과물 ${t}`);
    badge(s, i + 1, x + 0.3, 4.95, C.accent3);
    text(s, t, { x: x + 0.95, y: 4.95, w: 2.8, h: 0.5, fontSize: 20, bold: true, valign: 'middle' });
    text(s, d, { x: x + 0.3, y: 5.6, w: 3.3, h: 0.9, fontSize: 15, color: '4A4D66' });
  });
  s.addNotes('운영 규모와 결과물입니다. 학생마다 기획서 1부, 실행되는 앱 1개, 앱 월드 부스 1개를 남깁니다. 기획서 15개 항목 중 꼭 써야 하는 것은 7개로 줄였습니다.');
}

// ===================== 3. 원칙 =====================
{
  const s = slide('CONTENT');
  s.addText('기획자는 나, AI는 도우미', { placeholder: 'title' });
  card(s, 0.6, 1.5, 5.9, 4.9, 'FFEAEA', '막연한 요청');
  text(s, '😕 막연한 요청', { x: 0.95, y: 1.8, w: 5.2, h: 0.5, fontSize: 22, bold: true, color: 'C92A2A' });
  card(s, 0.95, 2.5, 5.2, 0.9, C.background1, '요청 예시');
  text(s, '“재미있는 게임 만들어 줘”', { x: 1.15, y: 2.5, w: 4.8, h: 0.9, fontSize: 20, valign: 'middle' });
  s.addText([
    { text: 'AI가 목표·규칙·캐릭터를 마음대로 정함', options: { bullet: true, breakLine: true } },
    { text: '모두 비슷한 게임이 나옴', options: { bullet: true, breakLine: true } },
    { text: '내 생각이 들어갈 자리가 없음', options: { bullet: true } },
  ], { x: 0.95, y: 3.7, w: 5.2, h: 2.2, fontSize: 17, color: C.text1, paraSpaceAfter: 8, isTextBox: true, margin: 0, valign: 'top' });

  s.addShape(pres.shapes.RIGHT_ARROW, { x: 6.6, y: 3.6, w: 0.5, h: 0.6, fill: { color: C.accent1 }, line: { color: C.accent1, width: 0 }, objectName: '화살표' });

  card(s, 7.2, 1.5, 5.5, 4.9, 'E3F9F1', '기획서 기반 요청');
  text(s, '😄 기획서로 요청', { x: 7.55, y: 1.8, w: 4.8, h: 0.5, fontSize: 22, bold: true, color: '087F5B' });
  card(s, 7.55, 2.5, 4.8, 0.9, C.background1, '요청 예시');
  text(s, '목표 · 규칙 · 캐릭터 · 화면 · 특별 기능이 모두 담긴 프롬프트', { x: 7.75, y: 2.5, w: 4.4, h: 0.9, fontSize: 16, valign: 'middle' });
  s.addText([
    { text: '내가 정한 규칙대로 작동', options: { bullet: true, breakLine: true } },
    { text: '“황금 사과 2배 점수” 같은 내 아이디어가 들어감', options: { bullet: true, breakLine: true } },
    { text: '이상하면 “고쳐 줘”로 다시 요청', options: { bullet: true } },
  ], { x: 7.55, y: 3.7, w: 4.8, h: 2.2, fontSize: 17, color: C.text1, paraSpaceAfter: 8, isTextBox: true, margin: 0, valign: 'top' });
  text(s, 'AI가 대신 만들어 주는 수업이 아니라, 내가 설계하고 AI를 도구로 쓰는 창작 수업이에요.', { x: 0.6, y: 6.55, w: 12.1, h: 0.4, fontSize: 15, italic: true, color: C.accent1 });
  s.addNotes('1차시 전개 1에서 쓰는 비교입니다. 같은 AI라도 기획서가 있으면 결과가 내 생각대로 나온다는 것을 보여 줍니다.');
}

// ===================== 4. 5단계 =====================
{
  const s = slide('CONTENT');
  s.addText('만드는 순서는 다섯 걸음', { placeholder: 'title' });
  const steps = [
    ['주제 추천받기', '하고 싶은 걸 말하면 추천'],
    ['기획서 쓰기', '목표·규칙·캐릭터, 칩으로 빠르게'],
    ['프롬프트 받기', '기획서가 AI 설명서로 자동 변환'],
    ['앱 만들고 시험', '코드 붙여 넣기 → 실행 → 고쳐 줘'],
    ['앱 월드 입점', '선생님 승인 → 부스 오픈'],
  ];
  steps.forEach(([t, d], i) => {
    const x = 0.6 + i * 2.5;
    if (i < 4) s.addShape(pres.shapes.LINE, { x: x + 1.4, y: 2.3, w: 2.1, h: 0, line: { color: 'C9C3FF', width: 3, dashType: 'dash' }, objectName: `연결선 ${i + 1}` });
    badge(s, i + 1, x + 0.85, 1.85, i === 4 ? C.accent2 : C.accent1, 0.9);
    text(s, t, { x, y: 3.0, w: 2.3, h: 0.5, fontSize: 19, bold: true, align: 'center' });
    text(s, d, { x: x + 0.05, y: 3.55, w: 2.2, h: 0.9, fontSize: 14, color: '6B6F8A', align: 'center' });
  });
  card(s, 0.6, 4.85, 12.1, 1.6, C.background2, '차시 안내');
  const map = [['1차시', '① 주제 + ② 기획서 시작'], ['2차시', '② 기획서 완성 + ③ 프롬프트'], ['3차시', '④ 앱 만들기 + ⑤ 입점 신청'], ['4차시', '⑤ 앱 월드 오픈']];
  map.forEach(([a, b], i) => {
    const x = 0.9 + i * 3.0;
    text(s, a, { x, y: 5.15, w: 2.7, h: 0.45, fontSize: 18, bold: true, color: C.accent1 });
    text(s, b, { x, y: 5.6, w: 2.7, h: 0.6, fontSize: 17 });
  });
  s.addNotes('학생 앱 위쪽의 단계 표시와 같습니다. 차시별로 어디까지 가는지도 함께 안내합니다.');
}

// ===================== 학생 앱 =====================
section('학생 앱');
{
  const s = slide('SECTION');
  s.addText('학생 앱', { placeholder: 'title' });
  s.addText('주제 → 기획서 → 프롬프트 → 내 앱 → 입점까지 한 화면에서', { placeholder: 'body' });
  s.addNotes('이제 학생이 쓰는 앱을 순서대로 보겠습니다.');
}
{
  const s = slide('CONTENT');
  s.addText('하고 싶은 게임을 말하면 주제를 추천해요', { placeholder: 'title' });
  const rules = [
    ['🔁', '이미 있는 게임·캐릭터', '그대로 만들지 않고, 좋아한 점만 살려 나만의 주제로 바꿔요', 'FFF6D6'],
    ['🕊️', '무섭거나 다치게 하는 것', '빼고 구하고·지키고·피하는 평화로운 주제로 바꿔요', 'FFEAEA'],
    ['🚫', '학교에 알맞지 않은 것', '도박·성인 내용 등은 추천하지 않아요', 'FFEAEA'],
    ['📚', '배움 요소가 없는 것', '모든 추천에 배움 요소가 붙어 있어요', 'E3F9F1'],
  ];
  text(s, '예) “마인크래프트처럼 블록으로 집 짓는 게임” → 블록 마을 건축가 (📚 도형과 넓이)', { x: 0.6, y: 1.45, w: 5.7, h: 0.75, fontSize: 15, bold: true, color: C.accent1 });
  rules.forEach(([e, t, d, fill], i) => {
    const y = 2.35 + i * 1.05;
    card(s, 0.6, y, 5.7, 0.9, fill, t);
    text(s, `${e} ${t}`, { x: 0.8, y: y + 0.08, w: 5.3, h: 0.38, fontSize: 15, bold: true });
    text(s, d, { x: 0.8, y: y + 0.46, w: 5.3, h: 0.4, fontSize: 13, color: '4A4D66' });
  });
  screen(s, 'student-recommend.png', 6.6, 1.5, 6.1, 1.6, '주제 추천 화면');
  text(s, '28가지 관심 분야 · 84개 추천 주제 · 🎤 말로 해도 돼요', { x: 6.6, y: 5.55, w: 6.1, h: 0.5, fontSize: 14, color: '6B6F8A' });
  s.addNotes('학생이 좋아하는 것이나 만들고 싶은 게임을 쓰거나 말하면, 그에 맞는 주제를 추천합니다. 이미 있는 게임·유명 캐릭터, 초등학생에게 알맞지 않은 폭력, 학교에 맞지 않는 내용은 추천하지 않고, 모든 추천에는 배움 요소가 붙어 있습니다. 기획서에 실제 게임 이름이나 폭력적인 말이 들어가면 프롬프트 복사가 막히고 고칠 곳을 알려 줍니다.');
}
{
  const s = slide('CONTENT');
  s.addText('기획서는 15개 항목, 꼭 쓸 것은 ★ 7개', { placeholder: 'title' });
  const items = ['기본 정보', '앱 소개', '만드는 이유', '게임 목표', '게임 규칙', '캐릭터·배경', '주요 기능', '게임 요소', '화면 구성', '화면 이동', '디자인', '특별 기능', '제작 계획', '테스트 계획', '돌아보기'];
  const req = new Set([1, 2, 4, 5, 6, 7, 12]);
  const chip = new Set([7, 8, 9, 11, 14]);
  items.forEach((t, i) => {
    const n = i + 1, col = i % 3, row = Math.floor(i / 3);
    const x = 0.6 + col * 2.05, y = 1.5 + row * 0.92;
    card(s, x, y, 1.9, 0.75, req.has(n) ? 'FFF6D6' : C.background2, `항목 ${n}`);
    text(s, `${n}`, { x: x + 0.12, y, w: 0.4, h: 0.75, fontSize: 15, bold: true, color: C.accent1, valign: 'middle' });
    text(s, `${t}${req.has(n) ? ' ★' : ''}`, { x: x + 0.5, y, w: 1.35, h: 0.75, fontSize: 13, valign: 'middle', bold: req.has(n) });
    if (chip.has(n)) s.addShape(pres.shapes.OVAL, { x: x + 1.72, y: y + 0.08, w: 0.12, h: 0.12, fill: { color: C.accent2 }, line: { color: C.accent2, width: 0 }, objectName: `칩 표시 ${n}` });
  });
  text(s, '★ 꼭 쓰기     ● 버튼(칩)으로 고르기', { x: 0.6, y: 6.2, w: 6, h: 0.4, fontSize: 13, color: '6B6F8A' });
  screen(s, 'student-chips.png', 6.9, 1.5, 5.8, 1.6, '기획서 칩 선택 화면');
  text(s, '쓴 내용은 자동 저장 · 인쇄/PDF · 백업 파일로 내려받기', { x: 6.9, y: 5.35, w: 5.8, h: 0.5, fontSize: 14, color: '6B6F8A' });
  s.addNotes('앱의 입력 항목과 활동지 항목은 같은 15번 체계입니다. 4차시 안에 끝내기 위해 꼭 쓸 항목은 7개로, 기능·요소·화면·디자인·테스트는 버튼으로 고르게 했습니다.');
}
{
  const s = slide('CONTENT');
  s.addText('기획서가 그대로 AI 프롬프트가 돼요', { placeholder: 'title' });
  screen(s, 'student-prompts.png', 0.7, 1.5, 6.4, 1.6, '프롬프트 화면');
  const ps = [
    ['🤖 앱 제작 프롬프트', '내 목표·규칙·캐릭터·특별 기능 + HTML 파일 하나, 태블릿 터치, 다시하기까지 요청'],
    ['🎨 이미지 프롬프트 (선택)', '배경 16:9, 캐릭터·아이콘은 투명 배경, 글자·유명 캐릭터 금지'],
    ['🔧 고쳐 줘 프롬프트', '“무엇이 문제인지 + 어떻게 되면 좋을지”를 쓰면 수정 요청문 완성'],
  ];
  ps.forEach(([t, d], i) => {
    const y = 1.5 + i * 1.6;
    card(s, 7.6, y, 5.1, 1.4, C.background2, t);
    text(s, t, { x: 7.85, y: y + 0.15, w: 4.7, h: 0.45, fontSize: 18, bold: true });
    text(s, d, { x: 7.85, y: y + 0.62, w: 4.7, h: 0.75, fontSize: 14, color: '4A4D66' });
  });
  s.addNotes('복사 버튼 한 번으로 AI 도구에 붙여 넣습니다. 그림 파일이 없어도 이모지와 도형으로 그려지게 요청하므로 이미지 생성은 시간이 남는 학생의 선택 과제입니다.');
}
{
  const s = slide('CONTENT');
  s.addText('AI가 준 코드를 붙여 넣으면 바로 실행돼요', { placeholder: 'title' });
  screen(s, 'student-myapp.png', 0.7, 1.5, 7.0, 1.6, '내 앱 실행 화면');
  const st = ['AI 답변을 통째로 붙여 넣기 (코드만 골라냄)', '▶ 실행해 보기 — 안전 상자 안에서 실행', '테스트 체크리스트로 확인', '이상하면 고쳐 줘 프롬프트 → 다시 붙여 넣기', '선생님께 보내기 (또는 제출 파일)'];
  st.forEach((t, i) => {
    const y = 1.55 + i * 0.95;
    badge(s, i + 1, 8.15, y + 0.05, i === 4 ? C.accent2 : C.accent1);
    text(s, t, { x: 8.85, y, w: 3.9, h: 0.65, fontSize: 15, valign: 'middle' });
  });
  s.addNotes('3차시 활동입니다. 학생 앱은 격리된 상자 안에서 실행되어 사이트의 다른 데이터에 접근할 수 없습니다.');
}

// ===================== 앱 월드 =====================
section('메타버스 앱 월드');
{
  const s = slide('SECTION');
  s.addText('메타버스 앱 월드', { placeholder: 'title' });
  s.addText('친구들이 만든 앱이 부스가 되어 열리는 우리 반 공간', { placeholder: 'body' });
  s.addNotes('완성한 앱이 들어가는 공간입니다.');
}
{
  const s = slide('CONTENT');
  s.addText('아바타로 걸어 다니며 친구 부스에 들어가요', { placeholder: 'title' });
  screen(s, 'world-map.png', 0.7, 1.5, 8.0, 16 / 9, '앱 월드 지도');
  const pts = [['🧭', '방향키·화면 끌기로 이동'], ['🏪', '부스 = 친구 앱 1개 (분야 색 지붕)'], ['🚪', '문 앞에서 들어가면 바로 실행'], ['👍', '좋아요는 부스마다 한 번'], ['📋', '안내소에서 부스 목록 보기']];
  pts.forEach(([e, t], i) => {
    const y = 1.6 + i * 0.85;
    card(s, 9.15, y, 3.55, 0.7, C.background2, t);
    text(s, t, { x: 9.35, y, w: 3.25, h: 0.7, fontSize: 14, valign: 'middle' });
  });
  text(s, '선생님이 입점을 승인한 앱만 부스로 열려요. 부스 번호도 선생님이 정해요.', { x: 0.7, y: 6.25, w: 12, h: 0.4, fontSize: 15, italic: true, color: C.accent1 });
  s.addNotes('외부 메타버스 플랫폼 대신 자체 앱 월드를 만든 이유: AI 공유 링크는 다른 사이트 안에서 실행이 막히는 경우가 많고, 20명이 각자 웹에 게시하기 어렵기 때문입니다.');
}
{
  const s = slide('CONTENT');
  s.addText('입점은 “보내기 → 승인 → 부스 오픈” 세 단계', { placeholder: 'title' });
  const boxes = [['학생 앱', '🚀 선생님께 보내기', C.accent1], ['우리 반 저장소', '구글 시트 + 드라이브 (무료)', C.accent5], ['교사 앱', '확인 · 피드백 · 승인 · 부스 번호', C.accent6], ['앱 월드', '승인한 앱이 부스로 자동 오픈', C.accent2]];
  boxes.forEach(([t, d, col], i) => {
    const x = 0.6 + i * 3.15;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.7, w: 2.6, h: 1.9, rectRadius: 0.15, fill: { color: col }, line: { color: col, width: 0 }, shadow: shadow(), objectName: t });
    text(s, t, { x, y: 1.9, w: 2.6, h: 0.6, fontSize: 21, bold: true, color: C.background1, align: 'center' });
    text(s, d, { x: x + 0.15, y: 2.55, w: 2.3, h: 0.9, fontSize: 14, color: C.background1, align: 'center' });
    if (i < 3) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + 2.68, y: 2.4, w: 0.4, h: 0.5, fill: { color: 'C9C3FF' }, line: { color: 'C9C3FF', width: 0 }, objectName: `화살표 ${i + 1}` });
  });
  card(s, 0.6, 4.1, 12.1, 2.2, 'FFF6D6', '파일 방식');
  text(s, '저장소 없이도 돼요: 파일 방식', { x: 0.9, y: 4.3, w: 11.5, h: 0.5, fontSize: 19, bold: true });
  s.addText([
    { text: '학생: 📦 제출 파일 내려받기 → 클래스룸·공유 폴더에 올리기', options: { bullet: true, breakLine: true } },
    { text: '교사: 📁 제출 파일 넣기 → 승인 → 🌏 메타버스 파일 내려받기', options: { bullet: true, breakLine: true } },
    { text: '교실 화면: 앱 월드에서 메타버스 파일 불러오기', options: { bullet: true } },
  ], { x: 0.9, y: 4.85, w: 11.5, h: 1.4, fontSize: 16, color: C.text1, paraSpaceAfter: 6, isTextBox: true, margin: 0, valign: 'top' });
  s.addNotes('우리 반 저장소는 선생님 구글 계정에 15분이면 설치합니다(backend/README.md). 설치가 어렵다면 파일 방식으로도 끝까지 운영할 수 있습니다.');
}
{
  const s = slide('CONTENT');
  s.addText('교사 앱: 20명의 진행을 한 화면에서', { placeholder: 'title' });
  screen(s, 'teacher-list.png', 0.7, 1.5, 7.2, 1.6, '교사 앱 학생 현황');
  s.addText([
    { text: '제출 · 확인 대기 · 수정 요청 · 입점 현황', options: { bullet: true, breakLine: true } },
    { text: '학생 기획서와 앱을 나란히 열어 확인', options: { bullet: true, breakLine: true } },
    { text: '피드백 한 줄 → 학생 화면에 바로 표시', options: { bullet: true, breakLine: true } },
    { text: '입점 승인 · 부스 번호 자동 배정', options: { bullet: true, breakLine: true } },
    { text: '기획서 모두 인쇄 · 전체 백업', options: { bullet: true, breakLine: true } },
    { text: '4차시 수업 흐름 + 활동 타이머', options: { bullet: true } },
  ], { x: 8.4, y: 1.6, w: 4.3, h: 4.5, fontSize: 16, color: C.text1, paraSpaceAfter: 10, isTextBox: true, margin: 0, valign: 'top' });
  s.addNotes('교사 열쇠는 교사 기기에만 저장되고 학생에게 나눠 주는 주소에는 들어가지 않습니다.');
}

// ===================== 수업 =====================
section('수업 운영');
{
  const s = slide('SECTION');
  s.addText('40분 × 4차시 수업', { placeholder: 'title' });
  s.addText('기획 2차시 · 제작 1차시 · 앱 월드 오픈 1차시', { placeholder: 'body' });
  s.addNotes('원래 기획서의 10차시안을 4차시로 줄인 운영안입니다.');
}
{
  const s = slide('CONTENT');
  s.addText('차시별 흐름', { placeholder: 'title' });
  const L = [
    ['1', '앱 월드 상상하기·주제 정하기', ['샘플 앱 월드 체험 5', 'AI는 도우미 8', '주제 탐색·선택 15', '기획서 ① 10', '백업 2'], '주제, 기획서 1~4번', C.accent1],
    ['2', '게임 설계하기', ['짝 소개 3', '규칙·캐릭터 14', '기능·화면 칩 13', '특별 기능·난이도 7', '프롬프트 확인 3'], '★ 완성 기획서', C.accent5],
    ['3', 'AI와 함께 앱 만들기', ['사용 약속·시연 5', '프롬프트→실행 12', '테스트·고쳐 줘 15', '돌아보기·입점 신청 8'], '실행되는 앱', C.accent6],
    ['4', '우리 반 앱 월드 오픈!', ['입장 안내 5', '친구 부스 체험 22', '발표 10', '돌아보기 3'], '앱 월드 오픈', C.accent2],
  ];
  L.forEach(([n, t, st, out, col], i) => {
    const x = 0.6 + i * 3.08;
    card(s, x, 1.45, 2.88, 5.2, C.background2, `${n}차시`);
    badge(s, n, x + 0.2, 1.65, col, 0.6);
    text(s, `${n}차시`, { x: x + 0.95, y: 1.65, w: 1.8, h: 0.6, fontSize: 18, bold: true, color: col, valign: 'middle' });
    text(s, t, { x: x + 0.2, y: 2.4, w: 2.5, h: 0.85, fontSize: 16, bold: true });
    s.addText(st.map((a, j) => ({ text: `${a}분`, options: { bullet: true, breakLine: j < st.length - 1 } })), { x: x + 0.2, y: 3.3, w: 2.55, h: 2.4, fontSize: 13, color: '4A4D66', paraSpaceAfter: 5, isTextBox: true, margin: 0, valign: 'top' });
    text(s, `→ ${out}`, { x: x + 0.2, y: 5.85, w: 2.55, h: 0.6, fontSize: 14, bold: true, color: col });
  });
  s.addNotes('3차시가 가장 빠듯합니다. AI 응답이 늦은 학생은 난이도 쉬움으로, 마치지 못한 학생은 4차시 도입 5분에 마무리합니다. 3차시와 4차시 사이에 교사가 입점 승인을 해 둡니다.');
}
{
  const s = slide('CONTENT');
  s.addText('안전하게, 약속을 지키며', { placeholder: 'title' });
  const g = [
    ['이름은 별명으로', '프롬프트·앱·기획서에 실명, 학교, 연락처를 쓰지 않아요.', C.accent1],
    ['AI 결과는 내가 확인', '틀리거나 이상한 결과는 그대로 쓰지 않고 고쳐 달라고 해요.', C.accent2],
    ['학생 앱은 격리 실행', '친구 앱은 안전 상자 안에서만 실행돼 다른 데이터에 접근할 수 없어요.', C.accent5],
    ['AI 도구 계정 확인', '서비스별 가입 연령이 달라요. 학교 허용 계정 또는 교사 대행으로 운영해요.', C.accent4],
  ];
  g.forEach(([t, d, col], i) => {
    const x = 0.6 + (i % 2) * 6.15, y = 1.5 + Math.floor(i / 2) * 2.55;
    card(s, x, y, 5.95, 2.3, C.background2, t);
    badge(s, i + 1, x + 0.35, y + 0.35, col, 0.6);
    text(s, t, { x: x + 1.15, y: y + 0.35, w: 4.6, h: 0.6, fontSize: 21, bold: true, valign: 'middle' });
    text(s, d, { x: x + 1.15, y: y + 1.05, w: 4.5, h: 1.0, fontSize: 16, color: '4A4D66' });
  });
  s.addNotes('4번은 수업 전에 꼭 결정해야 합니다. 앱의 프롬프트는 특정 AI 서비스에 묶이지 않게 "선생님이 알려 준 AI 도구"로 표현되어 있습니다.');
}
{
  const s = slide('CONTENT');
  s.addText('선생님 준비 체크리스트', { placeholder: 'title' });
  const rows = [
    ['수업 전', '사이트 올리기(GitHub Pages 등) · AI 도구와 계정 결정 · (선택) 우리 반 저장소 설치'],
    ['1차시 전', '교사 앱에서 연결 시험 → 학생 주소를 클래스룸에 게시 · 태블릿에서 열리는지 확인'],
    ['3차시 전', 'AI 도구 접속 확인 · 시연할 예시 기획서 준비'],
    ['4차시 전', '제출 확인 → 입점 승인 · 부스 번호 자동 배정 · 교실 화면에 앱 월드 띄우기'],
  ];
  s.addTable([
    [{ text: '언제', options: { bold: true, color: C.background1, fill: { color: C.accent1 } } }, { text: '할 일', options: { bold: true, color: C.background1, fill: { color: C.accent1 } } }],
    ...rows.map(([a, b], i) => [{ text: a, options: { bold: true, color: C.accent1, fill: { color: i % 2 ? C.background1 : C.background2 } } }, { text: b, options: { fill: { color: i % 2 ? C.background1 : C.background2 } } }]),
  ], { x: 0.6, y: 1.55, w: 12.1, colW: [2.2, 9.9], fontSize: 16, color: C.text1, rowH: 0.85, valign: 'middle', border: { type: 'solid', color: 'E3E5F3', pt: 1 }, margin: [0.08, 0.15, 0.08, 0.15] });
  text(s, '자세한 설치 방법: myappmaker/backend/README.md · 검토 의견: myappmaker/docs/기획서_검토.md', { x: 0.6, y: 6.2, w: 12.1, h: 0.4, fontSize: 13, color: '6B6F8A' });
  s.addNotes('저장소 설치가 어렵다면 파일 방식으로도 끝까지 운영할 수 있습니다.');
}

// ===================== 마무리 =====================
section('마무리');
{
  const s = slide('TITLE');
  s.addText('4차시 뒤, 우리 반 앱 월드 오픈!', { placeholder: 'title' });
  s.addText([
    { text: '내가 기획한 게임이 친구들의 놀이터가 돼요.', options: { breakLine: true } },
    { text: '학생 · 앱 월드 · 선생님 — 세 개의 문으로 시작해요', options: { fontSize: 15, color: C.accent3 } },
  ], { placeholder: 'body' });
  s.addImage({ path: IMG('world-room.png'), x: 7.6, y: 1.9, w: 5.3, h: 5.3 * 9 / 16, altText: '앱 월드 부스 안', objectName: '앱 월드 부스 안' });
  s.addNotes('질문을 받고, 1차시 시작 전에 학생 주소를 나눠 줍니다.');
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  // 폴더 항목을 빼서 클라우드(원드라이브 등)에서도 잘 열리게
  const fs = require('fs');
  const JSZip = require('jszip');
  const src = await JSZip.loadAsync(fs.readFileSync(OUT));
  const out = new JSZip();
  for (const [name, f] of Object.entries(src.files)) if (!f.dir) out.file(name, await f.async('nodebuffer'), { createFolders: false });
  fs.writeFileSync(OUT, await out.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  console.log(`만듦: ${OUT}`);
})();
