// 메타버스 앱 월드에 필요한 이미지 프롬프트를 Word 문서로 만듭니다.
// 실행: npm run prompts-doc   → docs/월드_이미지_프롬프트.docx
// 프롬프트 글은 shared/worldart.js 에서 가져와서, 앱(교사 앱 「월드 꾸미기」)과 문서가 늘 같아요.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import {
  CHIBI_LOOK, BUILDING_LOOK, BADGE_LOOK, worldPrompts, fullMapPrompt, mapWithSchoolNamePrompt, MAP_THEMES, PIXEL_STYLE, NO_TEXT, STUDENT_BOOTHS, presetById,
} from '../shared/worldart.js';
import { emptyPlan, buildImagePrompts } from '../shared/plan.js';

const require = createRequire(import.meta.url);
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  AlignmentType, LevelFormat, PageBreak, Footer, PageNumber,
} = require('docx');

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, '월드_이미지_프롬프트.docx');
const SCHOOL = process.env.SCHOOL || '';      // 학교 이름을 넣어 만들고 싶으면 SCHOOL=해솔초등학교 npm run prompts-doc
const settings = { schoolName: SCHOOL };
const FONT = 'Malgun Gothic';
const W = 9026;   // A4 본문 너비(DXA, 여백 1인치)

const p = (text, o = {}) => new Paragraph({ spacing: { after: 120 }, ...o, children: [].concat(text).map((t) => (typeof t === 'string' ? new TextRun(t) : t)) });
const b = (t) => new TextRun({ text: t, bold: true });
const bullet = (text) => new Paragraph({ numbering: { reference: 'dots', level: 0 }, spacing: { after: 60 }, children: [].concat(text).map((t) => (typeof t === 'string' ? new TextRun(t) : t)) });
const step = (text) => new Paragraph({ numbering: { reference: 'steps', level: 0 }, spacing: { after: 60 }, children: [].concat(text).map((t) => (typeof t === 'string' ? new TextRun(t) : t)) });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const border = { style: BorderStyle.SINGLE, size: 4, color: 'C9C3FF' };
const borders = { top: border, bottom: border, left: border, right: border };

// 프롬프트 상자: 연보라 칸 안에 줄마다 문단
function promptBox(text) {
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: W, type: WidthType.DXA }, borders,
      shading: { type: ShadingType.CLEAR, fill: 'F3F1FF', color: 'auto' },
      margins: { top: 120, bottom: 120, left: 160, right: 160 },
      children: String(text).split('\n').map((line) => new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: line, size: 19 })] })),
    })] })],
  });
}

function table(head, rows, widths) {
  const cell = (t, i, header) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA }, borders,
    shading: header ? { type: ShadingType.CLEAR, fill: '6C5CE7', color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text: t, bold: header, color: header ? 'FFFFFF' : undefined, size: 19 })] })],
  });
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: head.map((t, i) => cell(t, i, true)) }), ...rows.map((r) => new TableRow({ children: r.map((t, i) => cell(t, i, false)) }))],
  });
}
const gap = () => new Paragraph({ spacing: { after: 160 }, children: [] });

const assets = worldPrompts(settings);
const A = Object.fromEntries(assets.map((a) => [a.key, a]));

const children = [
  new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun('MY APP META WORLD')] }),
  new Paragraph({ spacing: { after: 240 }, children: [new TextRun({ text: `메타버스 앱 월드 이미지 프롬프트 모음${SCHOOL ? ` · ${SCHOOL}` : ''}`, size: 28, color: '6C5CE7', bold: true })] }),
  p('이 문서는 우리 반 메타버스 「앱 월드」에 쓸 그림을 이미지 생성 AI(예: Gemini)로 만들 때 그대로 복사해 쓰는 프롬프트 모음입니다. 같은 프롬프트가 교사 앱 「🏝️ 월드 꾸미기」에도 복사 버튼으로 들어 있습니다(학교 이름을 저장하면 학교 이름이 들어간 프롬프트가 나와요).'),

  h1('1. 먼저 정할 것: 어떤 방식으로 만들까요?'),
  table(['방식', '만드는 그림', '결과'], [
    ['A. 완성 지도 한 장 (추천)', '건물 13채까지 모두 그려진 지도 1장', '참고 화면과 가장 비슷해요. 교사 앱에서 건물 문 자리 14곳(선생님 건물·시작 자리·부스 12)을 눌러 찍어요.'],
    ['B. 바닥 지도 + 건물 따로', '바닥만 있는 지도 1장 + 건물 그림 최대 9장', '앱이 정해진 자리에 건물을 올려요. 그림체를 맞추기가 조금 더 어려워요.'],
    ['그림 없이', '없음', '앱이 직접 그린 픽셀 섬으로 열려요. 수업 전 시험용으로 좋아요.'],
  ], [2300, 2900, 3826]),
  gap(),

  h1('2. 모든 그림에 공통으로 들어가는 말 (앱 월드 지도의 컨셉)'),
  p('앱에 들어 있는 지도 그림 3장(별빛 성 섬·사계절 모험 섬·강물 다리 섬)과 같은 세계로 보이도록, 월드 그림과 학생 그림 프롬프트에 모두 같은 그림체 문장이 들어 있어요. 지도는 교사 앱 「🗺️ 앱 월드 지도 고르기」에서 고르면 되고, 아래 프롬프트는 지도를 직접 새로 만들고 싶을 때만 써요. 직접 프롬프트를 고칠 때도 그림체 문장은 남겨 두세요.'),
  promptBox(`그림체: ${PIXEL_STYLE}`),
  gap(),
  table(['그림', '앱 월드 지도와 맞추는 모습'], [
    ['건물(선생님·부스)', BUILDING_LOOK],
    ['사람 캐릭터(학생 주인공)', CHIBI_LOOK],
    ['아이콘', BADGE_LOOK],
  ], [2400, 6626]),
  gap(),
  promptBox(`글자 규칙: ${NO_TEXT}`),
  gap(),
  p([b('왜 글자를 넣지 않나요? '), '이미지 AI는 한글을 틀리게 그리는 일이 많아요. 학교 이름·부스 번호·앱 이름은 앱 월드가 그림 위에 정확한 글자로 붙여 줘요.']),

  new Paragraph({ children: [new PageBreak()] }),
  h1('3. ★ 방식 A — 건물까지 다 그린 완성 지도 (추천)'),
  p([b('크기: '), '가로 16:9 (예: 1920×1080). ', b('올리는 곳: '), '교사 앱 → 🏝️ 월드 꾸미기 → 🖼️ 월드 그림 → 🗺️ 월드 지도 → 📷 올리기']),
  p('건물 배치는 참고 화면과 같아요. 가운데 위에 선생님의 앱, 그 아래 별 분수 광장, 맨 아래 입구 아치, 그 둘레에 학생 부스 12채가 있어요.'),
  table(['번호', '자리', '건물 주제', '모습'], MAP_THEMES.map((t) => [String(t.n).padStart(2, '0'), t.row, t.name, t.look]), [800, 1700, 1800, 4726]),
  gap(),
  h2('3-1. 완성 지도 프롬프트 (간판 비움 · 추천)'),
  promptBox(fullMapPrompt(settings)),
  gap(),
  h2('3-2. (선택) 간판에 주제 이름까지 넣은 지도'),
  p('참고 화면처럼 「01 보물섬 탐험」 간판이 그림 안에 있는 지도예요. 글자가 틀리게 나오면 다시 그려 달라고 하거나 3-1을 쓰세요. 이 지도를 쓸 때는 문 자리 찍기에서 이름표를 「그림 속 간판 살리기(작은 이름표)」로 고르세요.'),
  promptBox(fullMapPrompt(settings, { signs: true })),
  gap(),
  h2('3-3. (선택) 입구 아치에 학교 이름을 넣은 지도'),
  promptBox(mapWithSchoolNamePrompt(settings)),
  gap(),
  h2('3-4. 지도를 올린 뒤: 문 자리 찍기'),
  step('교사 앱 「🏝️ 월드 꾸미기」 맨 아래 「📍 지도 그림 위에 문 자리 찍기」로 가요.'),
  step('「🎓 선생님의 앱」을 고르고 지도에서 성의 문을 눌러요. 다음 자리로 자동으로 넘어가요.'),
  step('「🚩 시작 자리」(입구 아치 위 광장), 「01」~「12」 부스 문을 차례로 눌러요.'),
  step(`💾 저장하면 앱 월드가 그 그림 그대로 열려요. 학생 부스는 ${STUDENT_BOOTHS}개까지예요.`),

  new Paragraph({ children: [new PageBreak()] }),
  h1('4. 방식 B — 바닥 지도와 건물을 따로'),
  p('건물이 없는 바닥 지도를 올리고, 건물 그림을 따로 올리면 앱이 정해진 자리에 건물을 세워요. 건물 그림의 하얀 배경은 앱이 지워요.'),
  ...assets.flatMap((a) => {
    const text = a.key === 'map' ? a.groundPrompt : a.prompt;
    return [
      h2(`${a.title.replace(/^\S+\s/, '')} — ${a.key === 'map' ? '바닥만 있는 지도' : a.use}`),
      p([b('비율: '), a.ratio, '   ', b('필수: '), a.key === 'map' ? '방식 B에서는 꼭 필요' : '선택 (없으면 앱이 픽셀로 그림)']),
      promptBox(text),
      gap(),
    ];
  }),

  new Paragraph({ children: [new PageBreak()] }),
  h1('5. 학생이 만드는 그림 (참고)'),
  p('학생 앱이 학생마다 기획서에 맞춰 그림 프롬프트를 만들어 줘요. 선생님이 고른 앱 월드 지도의 세계관(섬 모습)과 그림체가 프롬프트에 들어가서, 학생 그림이 지도 속 한 곳처럼 이어져 보여요.'),
  bullet([b('게임 배경: '), '학생이 쓴 장소·주제 낱말로 지도 속 구역(해변·숲·벚꽃 언덕·수정 동굴·화산·눈 덮인 산 등)을 찾아 「그 구역으로 들어가 가까이 본 장면」으로 그려 달라고 해요. 맞는 구역이 없으면 「섬에 새로 생긴 작은 구역」으로. 지도 소품(크림색 돌길, 둥근 나무, 벚꽃, 보라 별 깃발 가로등, 꽃 화단)도 1~2개 넣어요.']),
  bullet([b('주인공: '), '앱 월드를 걸어 다니는 아이들과 같은 2등신 픽셀 캐릭터, 하얀 배경 → 앱이 배경을 지워요']),
  bullet([b('아이콘: '), '지도 속 건물 지붕의 동그란 문장 모양']),
  bullet([b('내 캐릭터: '), '그림 AI 없이 앱에서 머리·피부·옷·소품을 골라 만들어요 (부스 건물은 지도에 그려져 있어서 따로 만들지 않아요)']),
  p('예) 「사계절 모험 섬」 지도에서, 장소를 「화산이 보이는 공룡 섬」으로 쓴 학생의 배경 프롬프트:'),
  promptBox((() => { const pl = emptyPlan('treasure-island'); Object.assign(pl.f, { appName: '공룡 화석 발굴대', place: '화산이 보이는 공룡 섬', charName: '디노', charLook: '초록 모자를 쓴 아기 티라노' }); return buildImagePrompts(pl, { preset: presetById('seasons') }).find((x) => x.key === 'background').text; })()),
  gap(),

  h1('6. 잘 만드는 요령'),
  bullet([b('★ 지도 그림을 같이 올리기: '), '이미지 AI(Gemini 등)에 프롬프트와 함께 앱 월드 지도 그림(또는 참고 화면)을 올리면 그림체가 훨씬 똑같이 나와요. 학생 앱의 「🗺️ 앱 월드 지도 그림 받기」 버튼으로 받을 수 있어요(우리 반 저장소를 연결했을 때).']),
  bullet([b('한 대화창에서 이어서: '), '지도 → 건물 순서로 같은 대화창에서 만들면 그림체가 잘 맞아요. "앞 그림과 같은 그림체로"라고 덧붙여도 좋아요.']),
  bullet([b('마음에 안 들면: '), '"폭포를 하나 더", "건물을 더 크게", "글자는 빼고"처럼 고칠 점만 짧게 다시 말해요.']),
  bullet([b('하얀 배경: '), '건물·분수·아치는 "하얀 배경"으로 받으면 앱이 배경을 지워요. 그림자나 바닥이 같이 그려지면 깨끗하게 안 지워질 수 있어요.']),
  bullet([b('크기: '), '올리면 앱이 알맞게 줄여요(지도는 1920×1080 안). 아주 큰 파일은 미리 줄여 두면 빨라요.']),
  bullet([b('저작권: '), '유명 게임·캐릭터를 따라 하지 말고, 우리 반만의 그림으로 만들어요.']),
  bullet([b('계정·연령: '), '이미지 AI는 서비스마다 가입 연령이 달라요. 지도·건물은 선생님이 만들고, 학생 그림은 학교에서 허용한 계정으로 해요.']),

  h1('7. 그림 체크리스트'),
  table(['그림', '비율', '방식 A', '방식 B'], [
    ['월드 지도 (건물 포함)', '16:9', '필수', '—'],
    ['월드 지도 (바닥만)', '16:9', '—', '필수'],
    ['선생님의 앱 건물', '1:1', '—', '선택'],
    ['기본 부스 건물', '1:1', '—', '선택'],
    ['분야별 부스 5종 (모험·액션·창작·추리·생활)', '1:1', '—', '선택'],
    ['광장 분수', '1:1', '—', '선택'],
    ['입구 아치', '2:1', '—', '선택'],
    ['학생 게임 그림', '학생 앱', '선택', '선택'],
  ], [4426, 1200, 1700, 1700]),
];

const doc = new Document({
  creator: 'MY APP MAKER',
  title: 'MY APP META WORLD 이미지 프롬프트',
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', run: { font: FONT, size: 48, bold: true, color: '2B2350' }, paragraph: { spacing: { before: 0, after: 80 }, keepNext: true } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 30, bold: true, color: '2B2350' }, paragraph: { spacing: { before: 320, after: 140 }, keepNext: true, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 24, bold: true, color: '6C5CE7' }, paragraph: { spacing: { before: 220, after: 100 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: 'dots', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 280 } } } }] },
    { reference: 'steps', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 320 } } } }] },
  ] },
  sections: [{
    properties: { page: { margin: { top: 1200, bottom: 1200, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'MY APP META WORLD 이미지 프롬프트 · ', size: 16, color: '8A8DA8' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '8A8DA8' })] })] }) },
    children,
  }],
});

fs.writeFileSync(OUT, await Packer.toBuffer(doc));
console.log(`만듦: ${OUT}`);
