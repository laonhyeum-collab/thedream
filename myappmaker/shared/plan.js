// 학생 앱 기획서: 데이터 구조 · 입력 항목(15개) · 프롬프트 만들기
// 앱 화면, 인쇄용 기획서, 활동지가 모두 이 정의 하나를 같은 순서·같은 말로 씁니다.
import { topicById, categoryById } from './topics.js';

export const SCHEMA = 'myappmaker.plan/1';

export const DIFFICULTY = [
  { id: 'easy', label: '🌱 쉬움', desc: '화면 3개, 핵심 규칙 1~2개' },
  { id: 'normal', label: '🌿 보통', desc: '화면 4~5개, 점수·시간·생명 등' },
  { id: 'hard', label: '🌳 도전', desc: '레벨·스테이지·아이템까지' },
];

export const IMAGE_STYLES = ['파스텔 카툰', '2D 일러스트', '3D 게임 스타일', '픽셀 아트'];

// 기획서 15개 항목. part = 활동 묶음(①~④), req = 꼭 쓰기(★)
export const SECTIONS = [
  { n: 1, title: '기본 정보', part: 1, req: true, inputs: [
    { key: 'developer', short: '개발자', label: '개발자 이름(별명도 좋아요)', max: 20 },
    { key: 'classInfo', short: '학년·반', label: '학년·반 (선택)', max: 20, optional: true },
    { key: 'appName', label: '앱 이름', max: 30, ph: (t) => `예) 나만의 ${t ? t.name : '게임'}` },
  ] },
  { n: 2, title: '앱 소개', part: 1, req: true, inputs: [
    { key: 'intro', label: '내 앱은 어떤 게임인가요? 한두 문장으로 소개해요', type: 'area', ph: (t) => t ? `예) ${t.intro}` : '' },
  ] },
  { n: 3, title: '게임을 만드는 이유·아이디어', part: 1, inputs: [
    { key: 'reason', label: '왜 이 게임을 만들고 싶나요? 어떤 재미를 주고 싶나요?', type: 'area', ph: () => '예) 친구들이 짧은 시간에 신나게 즐길 수 있으면 좋겠어요' },
  ] },
  { n: 4, title: '게임 목표', part: 1, req: true, inputs: [
    { key: 'goal', label: '플레이어가 무엇을 달성하면 성공인가요?', type: 'area', ph: (t) => t ? `예) ${t.goal}` : '' },
  ] },
  { n: 5, title: '게임 규칙', part: 2, req: true, inputs: [
    { key: 'ruleStart', short: '시작', label: '시작 방법', ph: () => '예) 시작 버튼을 누르면 바로 시작' },
    { key: 'rulePlay', short: '조작', label: '플레이 방법(조작)', type: 'area', ph: (t) => t ? `예) ${t.steps.join(' → ')}` : '' },
    { key: 'ruleWin', short: '성공', label: '성공 조건', ph: (t) => t ? `예) ${t.goal}` : '' },
    { key: 'ruleLose', short: '실패', label: '실패 조건', ph: () => '예) 시간이 끝나거나 생명이 0이 되면 실패' },
  ] },
  { n: 6, title: '등장 캐릭터와 배경', part: 2, req: true, inputs: [
    { key: 'charName', short: '이름', label: '주인공 이름', max: 20 },
    { key: 'charLook', short: '모습', label: '주인공 모습(색깔·옷·생김새)', ph: (t) => t ? `예) ${t.hint.character}` : '' },
    { key: 'charTrait', short: '특징', label: '주인공 특징(성격·특기)', ph: () => '예) 겁이 많지만 달리기가 엄청 빨라요' },
    { key: 'place', short: '장소', label: '게임 장소와 분위기', ph: (t) => t ? `예) ${t.hint.place}` : '' },
  ] },
  { n: 7, title: '주요 기능 (3가지 이상)', part: 3, req: true, inputs: [
    { key: 'features', short: '고른 기능', label: '골라요', type: 'chips', multi: true, options: ['이동하기', '누르기(클릭·터치)', '끌어다 놓기', '고르기', '모으기(수집)', '피하기', '점프하기', '조합하기', '꾸미기', '점수 세기', '타이머', '소리 효과'] },
    { key: 'featuresMore', short: '직접 쓴 기능', label: '직접 쓰기 (선택)', optional: true, ph: () => '예) 아이템을 먹으면 3초 동안 무적' },
  ] },
  { n: 8, title: '게임 요소', part: 3, inputs: [
    { key: 'elements', label: '넣고 싶은 것을 골라요', type: 'chips', multi: true, options: ['점수', '코인', '아이템', '시간 제한', '생명', '레벨', '스테이지', '보상', '최고 기록'] },
  ] },
  { n: 9, title: '화면 구성', part: 3, inputs: [
    { key: 'screens', label: '만들 화면을 골라요', type: 'chips', multi: true, options: ['시작 화면', '게임 방법 화면', '게임 화면', '성공 화면', '실패 화면', '결과 화면'] },
  ] },
  { n: 10, title: '화면 이동 흐름', part: 3, inputs: [
    { key: 'flow', label: '어떤 버튼을 누르면 어느 화면으로 가나요? (→ 로 써요)', type: 'area', ph: () => '예) 시작 화면 →[시작]→ 게임 화면 → 성공/실패 화면 →[다시하기]→ 시작 화면' },
  ] },
  { n: 11, title: '디자인 계획', part: 3, inputs: [
    { key: 'colors', label: '대표 색상', type: 'chips', multi: true, options: ['빨강', '주황', '노랑', '초록', '하늘', '파랑', '보라', '분홍', '검정', '흰색'] },
    { key: 'imageStyle', label: '그림 스타일', type: 'chips', options: IMAGE_STYLES, auto: true },
    { key: 'fontMood', label: '글자 분위기', type: 'chips', options: ['동글동글 귀여운', '굵고 힘찬', '반짝반짝 신비한', '깔끔한'] },
    { key: 'buttonShape', label: '버튼 모양', type: 'chips', options: ['둥근 버튼', '네모 버튼', '말풍선 버튼', '보석 버튼'] },
  ] },
  { n: 12, title: '추가 아이디어 (나만의 특별 기능)', part: 4, req: true, inputs: [
    { key: 'extra', label: '기본 주제에 더하고 싶은 나만의 기능은?', type: 'area', ph: () => '예) 10초마다 날씨가 바뀌어서 비가 오면 캐릭터가 느려져요' },
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
  f.imageStyle = '파스텔 카툰';
  return {
    schema: SCHEMA,
    id: uid('plan'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    topicId,
    difficulty: 'easy',
    f,
    app: { html: '', url: '', updatedAt: null },
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
    if (i.type === 'chips' && i.multi) out.f[i.key] = Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 20) : [];
    else out.f[i.key] = typeof v === 'string' ? v.slice(0, 2000) : base.f[i.key];
  }
  if (!DIFFICULTY.some((d) => d.id === out.difficulty)) out.difficulty = 'easy';
  if (out.topicId && !topicById(out.topicId)) out.topicId = null;
  out.id = typeof src.id === 'string' && src.id ? src.id.slice(0, 60) : base.id;
  return out;
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
      ? (plan.f.features.length + (filled(plan.f.featuresMore) ? 1 : 0)) >= 3
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
  easy: '쉬움 — 화면은 시작·게임·결과 3개 정도로, 규칙은 1~2개만 단순하게. 버튼은 크게.',
  normal: '보통 — 화면 4~5개, 점수·시간 제한·생명 같은 게임 요소를 넣고 난이도가 조금씩 올라가게.',
  hard: '도전 — 레벨이나 스테이지 2~3개, 아이템과 보상, 최고 기록까지 넣어 조금 더 깊이 있게.',
};

// 7-1. 앱 제작 프롬프트 (ChatGPT·Claude·Gemini 등에 붙여 넣기)
export function buildAppPrompt(plan) {
  const t = topicById(plan.topicId);
  const f = plan.f;
  const name = f.appName.trim() || (t ? t.name : '나의 게임');
  const features = [...f.features, ...(filled(f.featuresMore) ? [f.featuresMore.trim()] : [])];
  const screens = f.screens.length ? f.screens : ['시작 화면', '게임 화면', '결과 화면'];
  return join([
    `너는 초등학생과 함께 게임 앱을 만드는 친절한 웹 개발자야.`,
    `아래 "앱 기획서"를 그대로 반영해서, 태블릿과 스마트폰에서 바로 실행되는 게임 앱을 만들어 줘. (앱 이름: 「${name}」)`,
    ``,
    `## 앱 기획서`,
    line('주제', t ? `${t.name} (${categoryById(t.cat).name}) — ${t.summary}` : ''),
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
    line('그림 스타일', f.imageStyle),
    line('글자 분위기', f.fontMood),
    line('버튼 모양', f.buttonShape),
    line('★ 나만의 특별 기능', f.extra),
    line('난이도', DIFF_GUIDE[plan.difficulty]),
    ``,
    `## 꼭 지켜 줘`,
    `1. HTML·CSS·JavaScript가 모두 들어 있는 **HTML 파일 하나**로 만들어 줘. 외부 서버, 로그인, 유료 API, 외부 라이브러리는 쓰지 마.`,
    `2. 태블릿·스마트폰 세로/가로 화면에 맞게 반응형으로 만들고, 터치로 조작할 수 있게 해 줘(버튼은 손가락으로 누르기 쉽게 크게). 키보드가 있으면 키보드로도 되게 해 줘.`,
    `3. 위 화면들을 모두 만들고 시작 → 게임 → 성공/실패 → 결과 → 다시하기가 실제로 작동하게 해 줘.`,
    `4. 기획서의 규칙, 게임 요소(${f.elements.length ? f.elements.join(', ') : '점수'}), 나만의 특별 기능이 진짜로 작동해야 해.`,
    `5. 그림 파일 없이도 바로 보이도록 캐릭터와 물건은 이모지·CSS·Canvas 도형으로 그려 줘. 나중에 그림으로 바꿀 수 있게 코드 맨 위에 \`const IMAGES = { background: '', hero: '', ... }\` 처럼 그림 주소를 넣는 곳을 만들고, 주소를 넣으면 그 그림이 쓰이게 해 줘.`,
    `6. alert() 대신 화면 안의 메시지 상자를 쓰고, 기록 저장(localStorage)은 try/catch로 감싸서 저장이 막혀도 게임이 멈추지 않게 해 줘.`,
    `7. 화면 글자는 모두 쉬운 한국어로, 게임 방법 안내를 시작 화면에 넣어 줘. 무섭거나 폭력적인 표현은 빼 줘.`,
    ``,
    `## 이렇게 답해 줘`,
    `- 먼저 완성된 HTML 코드 전체를 코드 블록 하나로 보여 줘(중간에 생략하지 마).`,
    `- 그다음 초등학생이 알아듣게 짧게: ① 실행 방법 ② 테스트할 것(버튼·점수·시간·화면 전환·다시하기) ③ 그림을 바꾸는 위치.`,
  ]);
}

// 7-2. Gemini 이미지 생성 프롬프트 (앱 프롬프트와 따로)
export function buildImagePrompts(plan) {
  const t = topicById(plan.topicId);
  const f = plan.f;
  const style = f.imageStyle || '파스텔 카툰';
  const hero = [f.charName, f.charLook, f.charTrait].filter(filled).join(', ') || (t ? t.hint.character : '귀여운 주인공');
  const place = f.place.trim() || (t ? t.hint.place : '밝은 게임 배경');
  const colors = f.colors.length ? `대표 색상은 ${f.colors.join('·')}` : '밝고 선명한 색';
  const common = `${style} 스타일, ${colors}. 이미지 안에 글자·숫자·로고·워터마크를 넣지 마. 유명 캐릭터나 브랜드를 따라 하지 말고 독창적으로. 어린이 게임에 어울리게 밝고 친근하게.`;
  const keep = `주인공 모습(${hero})은 모든 그림에서 똑같은 색과 생김새로 유지해 줘.`;
  const icons = (f.elements.length ? f.elements : ['점수', '아이템']).filter((e) => ['코인', '아이템', '생명', '보상', '점수', '시간 제한', '최고 기록'].includes(e));
  const list = [
    { id: 'background', title: '🏞️ 배경 (16:9)', text: `게임 「${f.appName || (t ? t.name : '나의 게임')}」의 배경 그림을 그려 줘. 장소: ${place}. 가로 16:9 비율, 캐릭터 없이 배경만. 위쪽과 가운데에 점수·버튼이 올라갈 빈 공간을 넉넉히 남겨 줘. ${common}` },
    { id: 'hero', title: '🙂 주인공 캐릭터 (투명 배경)', text: `게임 주인공 캐릭터 한 명을 그려 줘: ${hero}. 정면을 보고 서 있는 전신, 배경은 투명(또는 흰색 단색)으로, 그림자 없이. 정사각형 1:1. ${keep} ${common}` },
    ...icons.slice(0, 3).map((e) => ({ id: `icon-${e}`, title: `⭐ 아이콘: ${e} (투명 배경)`, text: `게임에 쓸 "${e}" 아이콘 하나를 그려 줘. 단순하고 굵은 외곽선, 작게 줄여도 알아보기 쉽게, 배경은 투명(또는 흰색 단색), 정사각형 1:1. ${common}` })),
  ];
  return list;
}

export function buildAllPromptsText(plan) {
  const imgs = buildImagePrompts(plan).map((p) => `### ${p.title}\n${p.text}`).join('\n\n');
  return `# 앱 제작 프롬프트\n\n${buildAppPrompt(plan)}\n\n# Gemini 이미지 생성 프롬프트 (선택)\n\n${imgs}\n`;
}

// 앱을 고칠 때 쓰는 "고쳐 줘" 프롬프트
export function buildFixPrompt(plan, problem, want) {
  const name = plan.f.appName || '내 게임';
  return join([
    `방금 만든 「${name}」 게임을 고쳐 줘.`,
    line('문제', problem),
    line('이렇게 되면 좋겠어', want),
    `고친 HTML 코드 전체를 다시 코드 블록 하나로 보여 주고, 무엇을 바꿨는지 쉬운 말로 한 줄씩 알려 줘. 다른 기능은 그대로 둬.`,
  ]);
}

// 학생 화면에 보여 줄 텍스트(인쇄·교사 미리보기 공용)
export function planRows(plan) {
  const t = topicById(plan.topicId);
  const rows = [{ n: 0, title: '선택한 주제', value: t ? `${t.emoji} ${t.name} (${categoryById(t.cat).name})` : '—' }];
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
