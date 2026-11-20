// 학생 앱 기획서: 데이터 구조 · 입력 항목(15개) · 프롬프트 만들기
// 앱 화면, 인쇄용 기획서, 활동지가 모두 이 정의 하나를 같은 순서·같은 말로 씁니다.
import { topicById, categoryById } from './topics.js';
import { checkText, looksLikeRealName } from './recommend.js';
import { cleanImages, MAX_IMAGE_CHARS } from './images.js';
import { PIXEL_STYLE, CHIBI_LOOK, BADGE_LOOK, REF_HINT, WORLD_MOTIFS, MAP_PRESETS, worldSpot } from './worldart.js';
import { cleanAvatar } from './avatar.js';

export const SCHEMA = 'myappmaker.plan/1';

// 난이도는 두 단계만, 게임은 한 판(1단계)만
export const DIFFICULTY = [
  { id: 'easy', label: '🌱 쉬움', desc: '화면 3개 · 규칙 1~2개' },
  { id: 'normal', label: '🌿 보통', desc: '화면 4개 · 게임 요소 2~3개' },
];

// 기능·게임 요소는 최대 3개까지 (너무 많이 넣지 않기)
export const MAX_PICK = 3;

// 그림은 모두 메타버스 앱 월드와 같은 느낌으로
export const IMAGE_STYLE = '앱 월드 스타일';
export const IMAGE_STYLE_DESC = `우리 반 메타버스 앱 월드와 같은 그림체 — ${PIXEL_STYLE}`;

// 기획서 15개 항목. part = 활동 묶음(①~④), req = 꼭 쓰기(★)
export const SECTIONS = [
  { n: 1, title: '기본 정보', part: 1, req: true, inputs: [
    { key: 'developer', short: '개발자 별명', label: '개발자 별명 (🔒 진짜 이름·학교·반은 쓰지 않아요)', max: 12, ph: () => '예) 별빛코더, 공룡박사' },
    { key: 'appName', label: '앱 이름', max: 30, ph: (t) => `예) 나만의 ${t ? t.name : '게임'}` },
  ] },
  { n: 2, title: '앱 소개', part: 1, req: true, inputs: [
    { key: 'intro', label: '내 앱은 어떤 게임인가요? 한두 문장으로 소개해요', type: 'area', max: 100, ph: (t) => t ? `예) ${t.intro}` : '' },
  ] },
  { n: 3, title: '게임을 만드는 이유·아이디어', part: 1, inputs: [
    { key: 'reason', label: '왜 이 게임을 만들고 싶나요? 어떤 재미를 주고 싶나요?', type: 'area', max: 100, ph: () => '예) 친구들이 짧은 시간에 신나게 즐길 수 있으면 좋겠어요' },
  ] },
  { n: 4, title: '게임 목표와 배울 내용', part: 1, req: true, inputs: [
    { key: 'goal', short: '목표', label: '플레이어가 무엇을 달성하면 성공인가요?', type: 'area', max: 80, ph: (t) => t ? `예) ${t.goal}` : '' },
    { key: 'learnGoal', short: '배울 내용', label: '📚 이 게임을 하면서 무엇을 배우나요? (교과 연계)', type: 'area', max: 80, ph: (t) => t ? `예) ${t.curr} · ${t.learn}` : '예) 수학 1~2학년 · 덧셈하기' },
  ] },
  { n: 5, title: '게임 규칙', part: 2, req: true, inputs: [
    { key: 'ruleStart', short: '시작', label: '시작 방법', max: 40, ph: () => '예) 시작 버튼을 누르면 바로 시작' },
    { key: 'rulePlay', short: '조작', label: '플레이 방법(조작) — 한두 줄로 짧게', type: 'area', max: 80, ph: (t) => t ? `예) ${t.steps.join(' → ')}` : '' },
    { key: 'ruleWin', short: '성공', label: '성공 조건 (한 가지)', max: 50, ph: (t) => t ? `예) ${t.goal}` : '' },
    { key: 'ruleLose', short: '실패', label: '실패 조건 (한 가지)', max: 50, ph: () => '예) 시간이 끝나거나 생명이 0이 되면 실패' },
  ] },
  { n: 6, title: '등장 캐릭터와 배경', part: 2, req: true, inputs: [
    { key: 'charName', short: '이름', label: '주인공 이름', max: 20 },
    { key: 'charLook', short: '모습', label: '주인공 모습(색깔·옷·생김새)', max: 50, ph: (t) => t ? `예) ${t.hint.character}` : '' },
    { key: 'charTrait', short: '특징', label: '주인공 특징(성격·특기)', max: 50, ph: () => '예) 겁이 많지만 달리기가 엄청 빨라요' },
    { key: 'place', short: '장소', label: '게임 장소와 분위기', max: 50, ph: (t) => t ? `예) ${t.hint.place}` : '' },
  ] },
  { n: 7, title: '주요 기능 (2~3가지)', part: 3, req: true, inputs: [
    { key: 'features', short: '고른 기능', label: '2~3개만 골라요 (직접 쓴 기능도 1개로 세요)', type: 'chips', multi: true, max: MAX_PICK, options: ['이동하기', '누르기(클릭·터치)', '끌어다 놓기', '고르기', '모으기(수집)', '피하기', '점프하기', '조합하기', '꾸미기', '점수 세기', '타이머', '소리 효과'] },
    { key: 'featuresMore', short: '직접 쓴 기능', label: '직접 쓰기 (선택 · 한 가지)', optional: true, max: 40, ph: () => '예) 아이템을 먹으면 3초 동안 무적' },
  ] },
  { n: 8, title: '게임 요소', part: 3, inputs: [
    { key: 'elements', label: '3개까지 골라요 (게임은 한 판만: 레벨·스테이지 없음)', type: 'chips', multi: true, max: MAX_PICK, options: ['점수', '코인', '아이템', '시간 제한', '생명', '보상', '최고 기록'] },
  ] },
  { n: 9, title: '화면 구성', part: 3, inputs: [
    { key: 'screens', label: '만들 화면을 골라요 (4개까지)', type: 'chips', multi: true, max: 4, options: ['시작 화면', '게임 방법 화면', '게임 화면', '성공 화면', '실패 화면', '결과 화면'] },
  ] },
  { n: 10, title: '화면 이동 흐름', part: 3, inputs: [
    { key: 'flow', label: '어떤 버튼을 누르면 어느 화면으로 가나요? (→ 로 써요)', type: 'area', max: 100, ph: () => '예) 시작 화면 →[시작]→ 게임 화면 → 성공/실패 화면 →[다시하기]→ 시작 화면' },
  ] },
  { n: 11, title: '디자인 계획', part: 3, inputs: [
    { key: 'colors', label: '대표 색상', type: 'chips', multi: true, options: ['빨강', '주황', '노랑', '초록', '하늘', '파랑', '보라', '분홍', '검정', '흰색'] },
    { key: 'fontMood', label: '글자 분위기', type: 'chips', options: ['동글동글 귀여운', '굵고 힘찬', '반짝반짝 신비한', '깔끔한'] },
    { key: 'buttonShape', label: '버튼 모양', type: 'chips', options: ['둥근 버튼', '네모 버튼', '말풍선 버튼', '보석 버튼'] },
  ] },
  { n: 12, title: '추가 아이디어 (나만의 특별 기능)', part: 4, req: true, inputs: [
    { key: 'extra', label: '기본 주제에 더하고 싶은 나만의 기능 딱 한 가지는?', type: 'area', max: 80, ph: () => '예) 10초마다 날씨가 바뀌어서 비가 오면 캐릭터가 느려져요' },
  ] },
  { n: 13, title: '제작 계획', part: 4, inputs: [
    { key: 'tool', label: '사용할 제작 도구', ph: () => '예) 선생님이 알려 준 AI 도구' },
    { key: 'images', label: '필요한 이미지', ph: () => '예) 배경 1장, 주인공 1장, 아이템 아이콘 3개 (없으면 이모지로!)' },
    { key: 'order', label: '제작 순서', ph: () => '예) 프롬프트 넣기 → 실행해 보기 → 고칠 점 말하기 → 제출' },
  ] },
  { n: 14, title: '테스트 계획', part: 4, inputs: [
    { key: 'tests', label: '무엇을 확인할까요?', type: 'chips', multi: true, options: ['시작 버튼', '조작(버튼·터치)', '점수', '타이머', '성공·실패', '화면 전환', '다시 시작', '태블릿 화면 크기'] },
  ] },
  { n: 15, title: '완성 후 평가', part: 5, inputs: [
    { key: 'reviewGood', label: '잘된 점', type: 'area' },
    { key: 'reviewFix', label: '수정한 점·고칠 점', type: 'area' },
    { key: 'reviewNext', label: '다음에 추가하고 싶은 기능', type: 'area' },
  ] },
];

export const PARTS = [
  { id: 1, title: '① 나와 내 앱', sub: '기본 정보 · 소개 · 이유 · 목표' },
  { id: 2, title: '② 규칙과 캐릭터', sub: '게임 규칙 · 캐릭터와 배경' },
  { id: 3, title: '③ 기능과 화면', sub: '기능 · 게임 요소 · 화면 · 디자인' },
  { id: 4, title: '④ 나만의 아이디어', sub: '특별 기능 · 제작 · 테스트 계획' },
  { id: 5, title: '⑤ 돌아보기', sub: '앱을 다 만든 뒤에 써요' },
];

export const ALL_INPUTS = SECTIONS.flatMap((s) => s.inputs.map((i) => ({ ...i, section: s })));

export function uid(prefix = 'p') {
  const r = (globalThis.crypto && crypto.getRandomValues)
    ? Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('')
    : Math.random().toString(16).slice(2, 14);
  return `${prefix}_${Date.now().toString(36)}${r}`;
}

export function emptyPlan(topicId = null) {
  const f = {};
  for (const i of ALL_INPUTS) f[i.key] = i.type === 'chips' && i.multi ? [] : '';
  f.imageStyle = IMAGE_STYLE;
  f.classInfo = '';
  return {
    schema: SCHEMA,
    id: uid('plan'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    topicId,
    idea: null,          // 추천에서 고른 나만의 주제 (recommend.js ideaFromRec)
    avatar: null,        // 앱 월드에서 내 부스 앞에 서 있을 픽셀 캐릭터 (avatar.js)
    boothImage: '',      // 내 부스 건물 그림 (data URL, 선택)
    difficulty: 'easy',
    f,
    app: { html: '', url: '', images: {}, fixes: [], updatedAt: null },   // images: 그림 자리별 그림(data URL), 코드와 따로 보관
    submit: { at: null, status: null, feedback: '', booth: null },
  };
}

// 저장 파일·옛 버전·잘린 데이터를 받아도 안전한 기획서 모양으로 맞춥니다.
export function normalizePlan(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('기획서 파일이 아니에요');
  const src = raw.plan && raw.plan.schema === SCHEMA ? raw.plan : raw;   // 제출 파일도 받기
  if (src.schema !== SCHEMA) throw new Error('MY APP MAKER 기획서 파일이 아니에요');
  const base = emptyPlan(src.topicId || null);
  const out = { ...base, ...src, f: { ...base.f }, app: { ...base.app, ...(src.app || {}) }, submit: { ...base.submit, ...(src.submit || {}) } };
  for (const i of ALL_INPUTS) {
    const v = src.f ? src.f[i.key] : undefined;
    if (i.type === 'chips' && i.multi) out.f[i.key] = Array.isArray(v) ? v.filter((x) => typeof x === 'string' && (!i.options || i.options.includes(x))).slice(0, i.max || 20) : [];
    else out.f[i.key] = typeof v === 'string' ? v.slice(0, i.max || 2000) : base.f[i.key];
  }
  out.f.imageStyle = IMAGE_STYLE;
  out.app.images = cleanImages(out.app.images);
  out.app.fixes = cleanFixes(out.app.fixes);
  out.avatar = src.avatar && typeof src.avatar === 'object' ? cleanAvatar(src.avatar) : null;
  out.boothImage = typeof src.boothImage === 'string' && src.boothImage.length <= MAX_IMAGE_CHARS && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src.boothImage) ? src.boothImage : '';
  out.f.classInfo = '';                       // 학년·반은 받지 않음 (개인정보)
  if (out.difficulty === 'hard') out.difficulty = 'normal';   // 예전 3단계 난이도
  if (!DIFFICULTY.some((d) => d.id === out.difficulty)) out.difficulty = 'easy';
  if (out.topicId && !topicById(out.topicId)) out.topicId = null;
  out.idea = cleanIdea(src.idea);
  out.id = typeof src.id === 'string' && src.id ? src.id.slice(0, 60) : base.id;
  return out;
}

function cleanIdea(v) {
  if (!v || typeof v !== 'object') return null;
  const keys = ['query', 'id', 'themeId', 'title', 'emoji', 'summary', 'learn', 'curr', 'hero', 'place'];
  const o = {};
  for (const k of keys) o[k] = typeof v[k] === 'string' ? v[k].slice(0, 200) : '';
  return o.title && o.learn ? o : null;   // 배움 요소가 없는 주제는 받지 않음
}

// 기획서에서 보여 줄 주제: 기본 게임 방식(topics.js) + 학생이 고른 나만의 주제
export function topicView(plan) {
  const base = plan && topicById(plan.topicId);
  if (!base) return null;
  const idea = plan.idea;
  if (!idea) return { ...base, baseName: base.name };
  const curr = idea.curr || base.curr;
  return {
    ...base, baseName: base.name, name: idea.title, emoji: idea.emoji || base.emoji, summary: idea.summary, intro: idea.summary,
    goal: idea.summary, learn: idea.learn, curr, hint: { character: idea.hero || base.hint.character, place: idea.place || base.hint.place },
  };
}

// 기획서 글에 초등학생에게 알맞지 않은 말, 이미 있는 게임 이름이 있는지 확인
export function planSafety(plan) {
  const issues = [];
  for (const i of ALL_INPUTS) {
    const v = plan.f[i.key];
    const text = Array.isArray(v) ? v.join(' ') : v;
    if (!filled(text)) continue;
    const c = checkText(text);
    const words = [...c.violence, ...c.blocked, ...c.existing.map((e) => e.label), ...c.privacy.map((x) => `개인정보: ${x}`)];
    if (words.length) issues.push({ n: i.section.n, label: i.short || i.label, words });
  }
  return issues;
}

// 막지는 않지만 확인할 것 (진짜 이름처럼 보이는 별명)
export function planWarnings(plan) {
  return looksLikeRealName(plan.f.developer) ? [{ n: 1, label: '개발자 별명', text: '진짜 이름처럼 보여요. 진짜 이름이라면 별명으로 바꿔 주세요.' }] : [];
}

const filled = (v) => (Array.isArray(v) ? v.length > 0 : String(v || '').trim().length > 0);

// 꼭 쓰기(★) 항목 중 비어 있는 것
export function missingRequired(plan) {
  const miss = [];
  if (!plan.topicId) miss.push({ n: 0, title: '주제 고르기' });
  for (const s of SECTIONS) {
    if (!s.req) continue;
    const need = s.inputs.filter((i) => !i.optional);
    const ok = s.n === 7
      ? (plan.f.features.length + (filled(plan.f.featuresMore) ? 1 : 0)) >= 2
      : need.every((i) => filled(plan.f[i.key]));
    if (!ok) miss.push({ n: s.n, title: s.title });
  }
  return miss;
}

// 1~14번(돌아보기 제외) 중 채운 칸 비율
export function progress(plan) {
  const ins = ALL_INPUTS.filter((i) => i.section.part <= 4 && !i.optional && !i.auto);   // auto = 기본값이 있는 칸
  const done = ins.filter((i) => filled(plan.f[i.key])).length;
  return Math.round((done / ins.length) * 100);
}

const line = (label, v, indent = '') => (filled(v) ? `${indent}- ${label}: ${Array.isArray(v) ? v.join(', ') : String(v).trim()}` : null);
const join = (arr) => arr.filter((x) => x != null && x !== false).join('\n');

const DIFF_GUIDE = {
  easy: '쉬움 — 화면은 시작·게임·결과 3개, 규칙은 1~2개만 아주 단순하게. 초등학생이 1분 안에 이해하고 끝까지 할 수 있게. 버튼은 크게.',
  normal: '보통 — 화면 4개 정도, 기획서에 고른 게임 요소 2~3개만 넣어서. 그래도 초등학생이 혼자 끝까지 할 수 있게 너무 어렵지 않게.',
};

// 7-1. 앱 제작 프롬프트 (ChatGPT·Claude·Gemini 등에 붙여 넣기)
export function buildAppPrompt(plan) {
  const t = topicView(plan);
  const f = plan.f;
  const name = f.appName.trim() || (t ? t.name : '나의 게임');
  const features = [...f.features, ...(filled(f.featuresMore) ? [f.featuresMore.trim()] : [])];
  const screens = f.screens.length ? f.screens : ['시작 화면', '게임 화면', '결과 화면'];
  return join([
    `너는 초등학생과 함께 게임 앱을 만드는 친절한 웹 개발자야.`,
    `아래 "앱 기획서"를 그대로 반영해서, 태블릿과 스마트폰에서 바로 실행되는 게임 앱을 만들어 줘. (앱 이름: 「${name}」)`,
    ``,
    `## 앱 기획서`,
    line('주제', t ? `${t.name} — ${t.summary} (게임 방식: ${t.baseName}, ${categoryById(t.cat).name})` : ''),
    line('★ 배울 내용(교과 연계)', filled(f.learnGoal) ? f.learnGoal : (t ? `${t.curr} · ${t.learn}` : '')),
    line('앱 이름', name),
    line('개발자', f.developer),
    line('앱 소개', f.intro),
    line('만드는 이유·주고 싶은 재미', f.reason),
    line('게임 목표', f.goal),
    [f.ruleStart, f.rulePlay, f.ruleWin, f.ruleLose].some(filled) ? `- 게임 규칙` : null,
    line('시작 방법', f.ruleStart, '  '),
    line('플레이 방법', f.rulePlay, '  '),
    line('성공 조건', f.ruleWin, '  '),
    line('실패 조건', f.ruleLose, '  '),
    line('주인공', [f.charName, f.charLook, f.charTrait].filter(filled).join(' / ')),
    line('장소와 분위기', f.place),
    line('주요 기능', features),
    line('게임 요소', f.elements),
    line('화면 구성', screens),
    line('화면 이동 흐름', f.flow),
    line('대표 색상', f.colors),
    line('그림 느낌', '16비트 레트로 게임 같은 밝은 픽셀아트 (우리 반 메타버스 앱 월드와 어울리게)'),
    line('글자 분위기', f.fontMood),
    line('버튼 모양', f.buttonShape),
    line('★ 나만의 특별 기능', f.extra),
    line('난이도', DIFF_GUIDE[plan.difficulty]),
    ``,
    `## 꼭 지켜 줘`,
    `1. HTML·CSS·JavaScript가 모두 들어 있는 **HTML 파일 하나**로 만들어 줘. 외부 서버, 로그인, 유료 API, 외부 라이브러리는 쓰지 마.`,
    `2. 태블릿·스마트폰 세로/가로 화면에 맞게 반응형으로 만들고, 터치로 조작할 수 있게 해 줘(버튼은 손가락으로 누르기 쉽게 크게). 키보드가 있으면 키보드로도 되게 해 줘.`,
    `3. 위 화면들을 모두 만들고 시작 → 게임 → 성공/실패 → 결과 → 다시하기가 실제로 작동하게 해 줘.`,
    `4. 기획서에 쓴 규칙, 게임 요소(${f.elements.length ? f.elements.join(', ') : '점수'}), 나만의 특별 기능 하나만 넣고 진짜로 작동하게 해 줘. 규칙·기능을 더 늘리지 마.`,
    `5. 게임은 **한 판(1단계)만** 만들어 줘. 레벨·스테이지·다음 단계는 만들지 말고, 한 판이 끝나면 성공/실패 결과 화면 → 다시하기로 가게.`,
    `6. 그림 파일 없이도 바로 보이도록 캐릭터와 물건은 이모지·CSS·Canvas 도형으로 그려 줘. 그리고 나중에 내가 만든 그림을 넣을 수 있게, <script> 맨 위에 꼭 이 이름 그대로 그림 자리를 만들어 줘:\n   \`const IMAGES = { ${imageSlots(plan).map((x) => `${x.key}: ''`).join(', ')} };\`\n   (${imageSlots(plan).map((x) => `${x.key} = ${x.what}`).join(', ')}) — 값이 비어 있으면 이모지·도형으로 그리고, 값(그림 주소)이 있으면 그 그림을 쓰게 해 줘. 투명한 PNG 그림도 잘 보이게.`,
    `7. alert() 대신 화면 안의 메시지 상자를 쓰고, 기록 저장(localStorage)은 try/catch로 감싸서 저장이 막혀도 게임이 멈추지 않게 해 줘.`,
    `8. 화면 글자는 모두 쉬운 한국어로, 게임 방법 안내를 시작 화면에 넣어 줘. 무섭거나 폭력적인 표현은 빼 줘.`,
    `9. 이 게임은 초등학교 수업과 연결돼야 해: 배울 내용(${filled(f.learnGoal) ? f.learnGoal : (t ? `${t.curr} · ${t.learn}` : '교과 내용')})이 게임 규칙 안에 들어가서, 놀이를 하면 그 내용을 익히게 해 줘. 퀴즈 화면만 따로 붙이지 말고, 내용은 초등학생 수준에 맞고 틀리지 않게.`,
    `10. 이미 있는 게임이나 유명 캐릭터의 이름·모습·음악을 따라 하지 말고 모두 새로 만들어 줘.`,
    `11. 화면에 이름·학교·전화번호 같은 개인정보를 묻거나 적는 칸을 만들지 마.`,
    ``,
    `## 이렇게 답해 줘`,
    `- 먼저 완성된 HTML 코드 전체를 코드 블록 하나로 보여 줘(중간에 생략하지 마).`,
    `- 그다음 초등학생이 알아듣게 짧게: ① 실행 방법 ② 테스트할 것(버튼·점수·시간·화면 전환·다시하기) ③ 그림을 바꾸는 위치.`,
  ]);
}

// 7-2. Gemini 이미지 생성 프롬프트 (앱 프롬프트와 따로)
// 그림 자리: 배경 1, 주인공 1, 게임 요소 아이콘 최대 3
export function imageSlots(plan) {
  const f = plan.f;
  const icons = (f.elements.length ? f.elements : ['점수', '아이템']).filter((e) => ['코인', '아이템', '생명', '보상', '점수', '시간 제한', '최고 기록'].includes(e)).slice(0, 3);
  return [
    { key: 'background', what: '배경', title: '🏞️ 배경', ratio: '16:9', clear: false, max: [960, 540] },
    { key: 'hero', what: '주인공', title: '🙂 주인공', ratio: '1:1', clear: true, max: [320, 320] },
    ...icons.map((e, i) => ({ key: `icon${i + 1}`, what: `${e} 아이콘`, title: `⭐ ${e} 아이콘`, ratio: '1:1', clear: true, max: [160, 160], element: e })),
  ];
}

// 7-2. 이미지 생성 프롬프트 (앱 프롬프트와 따로) — 그림 자리마다 하나씩
// preset: 선생님이 고른 앱 월드 지도(없으면 기본 지도). 그 지도 속 구역과 이어지는 그림이 되도록.
export function buildImagePrompts(plan, { preset = MAP_PRESETS[0] } = {}) {
  const t = topicView(plan);
  const f = plan.f;
  const style = IMAGE_STYLE_DESC;
  const p = preset || MAP_PRESETS[0];
  const region = worldSpot(f.place, [f.appName, f.intro, t ? `${t.name} ${t.hint.place}` : ''].join(' '), p);
  const spot = region ? `이 섬의 「${region}」 구역으로 들어가 가까이서 본 장면처럼` : '이 섬에 새로 생긴 작은 구역(지도와 같은 땅·바다·나무가 이어지는 곳)을 가까이서 본 장면처럼';
  const worldIs = `우리 반 메타버스 「앱 월드」는 ${p.world}`;
  const hero = [f.charName, f.charLook, f.charTrait].filter(filled).join(', ') || (t ? t.hint.character : '귀여운 주인공');
  const place = f.place.trim() || (t ? t.hint.place : '밝은 게임 배경');
  const colors = f.colors.length ? `대표 색상은 ${f.colors.join('·')}` : '밝고 선명한 색';
  const common = `그림체: ${style}. ${REF_HINT} ${colors}. 이미지 안에 글자·숫자·로고·워터마크를 넣지 마. 유명 캐릭터나 브랜드를 따라 하지 말고 독창적으로. 어린이 게임에 어울리게 밝고 친근하게.`;
  const keep = `주인공 모습(${hero})은 모든 그림에서 똑같은 색과 생김새로 유지해 줘.`;
  const white = '배경은 아무것도 없는 하얀색 한 가지로(무늬·그림자·바닥 없이), 그림이 가운데에 오게';
  return imageSlots(plan).map((sl) => ({
    id: sl.key, key: sl.key, title: `${sl.title} (${sl.ratio})`, slot: sl,
    text: sl.key === 'background'
      ? `${worldIs}. ${spot}, 내 게임 「${f.appName || (t ? t.name : '나의 게임')}」의 배경을 그려 줘. 장소: ${place}. 지도와 같은 쿼터뷰·색·외곽선으로, 땅은 잔디 윗면과 흙 절벽, 물은 맑은 하늘색과 흰 물거품. 지도에서 보던 소품(${WORLD_MOTIFS}) 중 1~2개를 가장자리에 넣어 같은 섬이라는 느낌이 나게 해 줘. 가로 16:9, 캐릭터 없이 배경만, 가운데와 위쪽은 게임이 펼쳐지도록 넓게 비워 둬. ${common}`
      : sl.key === 'hero'
        ? `${worldIs}. 이 섬 마을을 걸어 다니는 아이들과 똑같은 ${CHIBI_LOOK}로 내 게임 주인공을 그려 줘: ${hero}. 지도 위에 세워 놓아도 어울리는 크기감과 색감으로, 살짝 비스듬히 정면을 보고 서 있는 전신 한 명, ${white}. 정사각형 1:1. ${keep} ${common}`
        : `게임에 쓸 「${sl.element}」 아이콘: ${BADGE_LOOK}. 앱 월드 건물 지붕의 문장처럼 보이게, 작게 줄여도 알아보기 쉽게 단순하게, 동그란 배지 바깥은 하얀색 한 가지로. 정사각형 1:1. ${common}`,
  }));
}

export function buildAllPromptsText(plan) {
  const imgs = buildImagePrompts(plan).map((p) => `### ${p.title}\n${p.text}`).join('\n\n');
  return `# 앱 제작 프롬프트\n\n${buildAppPrompt(plan)}\n\n# Gemini 이미지 생성 프롬프트 (선택)\n\n${imgs}\n`;
}

// ---------- 앱을 고칠 때 쓰는 "고쳐 줘" 프롬프트 (학생 앱 「4. 내 앱」) ----------
// 아이용 문장 틀: "지금은 ○○인데, △△가 되면 좋겠어. □□는 그대로 둬." — 한 번에 한 가지만 고쳐요.
export const FIX_MAX = 80;   // 칸마다 글자 수 (짧게 한 가지만)
export const FIX_EXAMPLES = [
  { emoji: '▶️', problem: '시작 버튼을 눌러도 게임이 시작되지 않아요', want: '시작 버튼을 누르면 바로 게임이 시작돼요' },
  { emoji: '🐢', problem: '너무 빨라서 어려워요', want: '처음에는 천천히 움직이고 조금씩 빨라져요' },
  { emoji: '💯', problem: '점수가 올라가지 않아요', want: '맞히면 점수가 1점씩 올라가요' },
  { emoji: '🚧', problem: '주인공이 화면 밖으로 나가요', want: '주인공이 화면 안에서만 움직여요' },
  { emoji: '🔁', problem: '게임이 끝나면 다시 할 수 없어요', want: '끝나면 다시 하기 버튼이 나와요' },
  { emoji: '🔤', problem: '글자가 너무 작아서 안 보여요', want: '글자가 크고 또렷하게 보여요' },
  { emoji: '👆', problem: '태블릿에서 눌러도 움직이지 않아요', want: '화면을 눌러도 움직일 수 있어요' },
  { emoji: '🖼️', problem: '내가 넣은 그림이 게임에 안 보여요', want: '내가 올린 그림이 게임에 보여요' },
];
export const FIX_KEEP = ['게임 규칙', '주인공', '그림·색', '점수', '배경', '버튼 위치'];
const MANY = /(그리고|그리구|또한|그 다음에|그다음에|,|，|\n)/;

// 고쳐 줘 글 확인: 막을 말(알맞지 않은 말·이미 있는 게임 이름·개인정보)과 안내(여러 가지를 한꺼번에 고치려 함)
export function fixCheck(problem, want) {
  const text = `${problem || ''} ${want || ''}`;
  const c = checkText(text);
  const blocked = [...c.violence, ...c.blocked, ...c.existing.map((e) => e.label)];
  const p = String(problem || '').trim();
  const w = String(want || '').trim();
  return {
    blocked, privacy: c.privacy,
    ok: !!p && !!w && blocked.length === 0 && c.privacy.length === 0,
    empty: !p ? 'problem' : !w ? 'want' : '',
    many: MANY.test(p) || /[.!?]\s*\S/.test(p),
  };
}

// 아이가 쓴 그대로 보여 주는 한 문장 (미리보기)
export function fixSentence(problem, want, keep = []) {
  const p = String(problem || '').trim().replace(/[.!]+$/, '') || '○○';
  const w = String(want || '').trim().replace(/[.!]+$/, '') || '△△';
  const k = keepText(keep);
  return `지금은 「${p}」인데, 「${w}」처럼 되면 좋겠어. ${k}는 그대로 둬.`;
}
function keepText(keep) {
  const list = (Array.isArray(keep) ? keep : []).filter((x) => FIX_KEEP.includes(x));
  return list.length ? `${list.join('·')}, 그리고 나머지` : '나머지';
}

export function buildFixPrompt(plan, problem, want, keep = []) {
  const name = plan.f.appName || '내 게임';
  const kept = (Array.isArray(keep) ? keep : []).filter((x) => FIX_KEEP.includes(x));
  return join([
    `방금 만든 「${name}」 게임에서 딱 한 가지만 고쳐 줘.`,
    line('지금 문제', problem),
    line('이렇게 되면 좋겠어', want),
    `그대로 둘 것: ${kept.length ? `${kept.join(', ')}, ` : ''}그 밖의 화면·규칙·기능 모두`,
    '지켜 줘:',
    '- 위 문제 한 가지만 고치고, 새 기능이나 규칙·레벨을 더하지 마.',
    '- <script> 맨 위의 const IMAGES = { … } 그림 자리는 이름과 값을 그대로 둬.',
    '- 고친 HTML 코드 전체를 처음부터 끝까지 코드 블록 하나로 보여 줘 (중간을 줄이거나 "…"로 빼지 마).',
    '- 코드 아래에 무엇을 바꿨는지 초등학생이 알아듣는 쉬운 말로 한두 줄 알려 줘.',
  ]);
}

// 고친 기록 (학생 앱에서만 쓰고 기획서와 함께 저장) — 최근 20개
export function cleanFixes(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((x) => x && typeof x === 'object' && typeof x.problem === 'string').slice(-20).map((x) => ({
    problem: x.problem.slice(0, FIX_MAX), want: typeof x.want === 'string' ? x.want.slice(0, FIX_MAX) : '',
    keep: Array.isArray(x.keep) ? x.keep.filter((k) => FIX_KEEP.includes(k)) : [],
    at: typeof x.at === 'string' ? x.at.slice(0, 30) : '',
    result: x.result === 'good' || x.result === 'again' ? x.result : '',
  }));
}

// 학생 화면에 보여 줄 텍스트(인쇄·교사 미리보기 공용)
export function planRows(plan) {
  const t = topicView(plan);
  const rows = [{ n: 0, title: '선택한 주제', value: t ? `${t.emoji} ${t.name} (${t.baseName} 방식 · ${categoryById(t.cat).name})\n배움 요소: ${t.learn}` : '—' }];
  for (const s of SECTIONS) {
    const parts = s.inputs.map((i) => {
      const v = plan.f[i.key];
      if (!filled(v)) return null;
      const text = Array.isArray(v) ? v.join(', ') : String(v).trim();
      return s.inputs.length === 1 ? text : `${i.short || i.label}: ${text}`;
    }).filter(Boolean);
    rows.push({ n: s.n, title: s.title, value: parts.join('\n') });
  }
  const d = DIFFICULTY.find((x) => x.id === plan.difficulty);
  rows.push({ n: 16, title: '난이도', value: d ? d.label : '' });
  return rows;
}
