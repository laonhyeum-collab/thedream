// 테마 데이터(js/themes.js)에서 그림 프롬프트 문서를 만들어요. 파일 이름이 코드와 늘 같아져요.
// 실행: node tools/make-image-prompts.mjs > IMAGE_PROMPTS_THEMES.md
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEMES, INSTRUMENTS, ENSEMBLES, ensembleOf } from '../js/themes.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const has = (rel) => fs.existsSync(path.join(ROOT, rel));

// 재료 그림을 더 잘 그리도록 붙이는 설명
const LOOK = {
  dough: '둥글게 편 노릇한 피자 도우 한 장 (토핑 없이)',
  sauce: '빨간 토마토소스가 담긴 작은 그릇과 국자 한 숟갈',
  cheese: '구멍이 송송 난 노란 치즈 한 조각',
  pepperoni: '동그랗게 썬 빨간 페퍼로니 조각 세 개',
  mushroom: '얇게 썬 양송이버섯 두세 조각',
  olive: '가운데 구멍이 있는 검은 올리브와 초록 올리브 링 몇 개',
  pineapple: '노란 파인애플 조각 세 개',
  basil: '싱그러운 초록 바질 잎 세 장',
  bun: '참깨가 뿌려진 햄버거 빵 (위쪽 빵)',
  patty: '두툼하고 윤기 나는 햄버거 패티 한 장',
  lettuce: '꼬불꼬불한 초록 양상추 한 장',
  tomato: '동그랗게 썬 빨간 토마토 두 조각',
  egg: '노른자가 동그란 계란 프라이 한 개',
  pickle: '동그랗게 썬 초록 피클 세 조각',
  sponge: '폭신한 노란 케이크 시트 한 덩이',
  cream: '하얀 생크림을 짤주머니로 동그랗게 짠 모양',
  strawberry: '새빨간 딸기 한 개',
  chocodeco: '초콜릿으로 만든 별·하트 모양 장식 두 개',
  candy: '알록달록 소용돌이 막대 사탕 하나',
  candle: '불이 켜진 작은 생일 초 하나',
  cherry: '꼭지가 달린 빨간 체리 두 알',
  cone: '바삭한 와플 무늬 아이스크림 콘 (아이스크림 없이)',
  vanilla: '하얀 바닐라 아이스크림 한 스쿱',
  choco: '진한 갈색 초코 아이스크림 한 스쿱',
  berry: '분홍 딸기 아이스크림 한 스쿱',
  sprinkles: '무지개색 스프링클이 흩뿌려진 작은 더미',
  wafer: '격자무늬 웨하스 과자 두 개',
  mint: '연두색 민트초코 아이스크림 한 스쿱',
  tiger: '한국 민화 느낌의 귀여운 아기 호랑이',
  rabbit: '하얀 귀여운 아기 토끼',
  crane: '하얀 몸에 머리가 빨간 귀여운 학 (두루미)',
  turtle: '등껍질이 동그란 귀여운 초록 거북이',
  magpie: '검고 흰 날개의 귀여운 까치',
  bear: '갈색 귀여운 아기 곰',
  squirrel: '도토리를 든 귀여운 다람쥐',
  deer: '뿔이 작은 귀여운 아기 사슴',
  rocket: '빨간 줄무늬 귀여운 로켓',
  planet: '고리가 있는 보라색 행성',
  star: '반짝이는 노란 별 하나',
  alien: '초록색 귀여운 외계인 (큰 눈 하나)',
  satellite: '태양 전지판이 달린 인공위성',
  blackhole: '보라빛으로 소용돌이치는 작은 블랙홀',
  comet: '꼬리가 길게 늘어진 하늘색 혜성',
  moon: '노란 초승달',
};

const out = [];
out.push('# 🎨 새 테마 그림 프롬프트 (피자 · 햄버거 · 케이크 · 아이스크림 · 동물 음악회 · 우주)');
out.push('');
out.push('그림이 없어도 앱은 이모지로 바로 돼요. 그림을 넣으면 이모지 대신 그림이 나와요.');
out.push('**처음에 [공통 스타일](IMAGE_PROMPTS.md#공통-스타일--맨-처음-한-번-보내기)을 한 번 보내고**, 아래 프롬프트를 하나씩 보내 주세요. 다 만든 그림은 압축해서 한 번에 올려 주셔도 돼요.');
out.push('');
out.push('> 파일 이름이 같은 그림이 여러 테마에 있어요 (예: `cheese.png` 는 피자와 햄버거). **테마별 폴더에 나눠 담아** 압축해 주세요.');
out.push('');
out.push('이미 들어 있는 그림은 ✅ 로 표시했어요 (이 문서를 만들 때 기준).');
out.push('');

for (const t of THEMES.filter((x) => x.id !== 'bingsu')) {
  const e = ensembleOf(t);
  out.push(`## ${t.emoji} ${t.name} — ${e.emoji} ${e.name}`);
  out.push('');
  out.push(`폴더: \`music-factory/assets/images/${t.id}/\` · 그림 ${t.ingredients.length}장 (투명 배경, 1024×1024)`);
  out.push('');
  out.push('| 파일 이름 | 연주 악기 | 보낼 프롬프트 |');
  out.push('|---|---|---|');
  for (const i of t.ingredients) {
    const rel = `assets/images/${t.id}/${i.id}.png`;
    const mark = has(rel) ? ' ✅' : '';
    const face = t.id === 'animals' || i.id === 'alien' ? ' (이 그림은 귀여운 얼굴을 그려도 돼)' : '';
    out.push(`| \`${i.id}.png\`${mark} | ${INSTRUMENTS[i.instrument].name} | 같은 스타일로 ${LOOK[i.id] || i.name}${face}. |`);
  }
  out.push('');
}

out.push('## 🎻 새 악기 아이콘');
out.push('');
out.push('폴더: `music-factory/assets/images/instruments/` (투명 배경, 1024×1024)');
out.push('');
out.push('`같은 스타일로 어린이 음악 앱의 악기 아이콘. 사람 없이 악기만, 살짝 기울여 귀엽게.` 뒤에 아래 악기 이름을 붙여 보내요.');
out.push('');
for (const [id, ens] of Object.entries(ENSEMBLES)) {
  if (id === 'band') continue;
  out.push(`**${ens.emoji} ${ens.name}**`);
  out.push('');
  out.push('| 파일 이름 | 붙일 내용 |');
  out.push('|---|---|');
  for (const inst of ens.instruments) {
    const rel = `assets/images/instruments/${inst}.png`;
    const mark = has(rel) ? ' ✅' : '';
    const extra = id === 'gugak' ? ' (한국 전통 악기, 정확한 모양으로)' : '';
    out.push(`| \`${inst}.png\`${mark} | ${INSTRUMENTS[inst].name}${extra} |`);
  }
  out.push('');
}

out.push('## 순서 추천');
out.push('');
out.push('1. 재료 그림 (테마 하나씩, 수업에 먼저 쓸 테마부터)');
out.push('2. 악기 아이콘 (특히 국악기는 아이들이 모양을 익히기 좋아요)');
out.push('');
out.push('그릇(피자 도우, 햄버거 빵, 케이크, 콘, 무대, 우주)은 앱이 직접 그려서 따로 그림이 없어도 돼요.');
process.stdout.write(out.join('\n') + '\n');
