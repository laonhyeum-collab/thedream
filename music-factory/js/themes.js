// 테마 정보: 새 콘텐츠는 여기에 재료 목록과 악기 연결만 추가하면 됩니다.
// (음악 엔진 engine.js 와 소리 audio.js 는 그대로)
//
// 그림 파일: assets/images/<테마 id>/<재료 id>.png 를 넣으면 이모지 대신 그 그림이 나옵니다.

// 악기 종류(가족). voice 는 audio.js 의 소리 이름입니다.
export const INSTRUMENTS = {
  drum: { name: '드럼', emoji: '🥁', color: '#ff8a65', desc: '쿵! 쿵! 음악의 기본 박자를 잡아 줘요.' },
  bass: { name: '베이스 기타', emoji: '🎸', color: '#8d6e63', desc: '둥둥~ 낮은 소리로 음악을 든든하게 받쳐 줘요.' },
  guitar: { name: '일렉트릭 기타', emoji: '🎸', color: '#ef5350', desc: '찌잉~ 선명하고 힘찬 소리를 내요.' },
  keys: { name: '키보드', emoji: '🎹', color: '#ffca28', desc: '띵동~ 밝고 고운 멜로디를 연주해요.' },
  snare: { name: '스네어 드럼', emoji: '🪘', color: '#ab47bc', desc: '탁! 탁! 리듬을 또렷하게 강조해요.' },
  synth: { name: '신시사이저', emoji: '🎛️', color: '#26c6da', desc: '뿅뿅~ 신기한 전자 소리를 만들어요.' },
  cymbal: { name: '심벌즈', emoji: '🔔', color: '#d4a017', desc: '차앙~ 츠츠츠 경쾌하게 반짝이는 소리예요.' },
};

export const INSTRUMENT_ORDER = ['drum', 'snare', 'cymbal', 'bass', 'guitar', 'keys', 'synth'];

const bingsu = {
  id: 'bingsu',
  name: '빙수 만들기',
  emoji: '🍧',
  method: '재료 쌓기',
  learn: '순서와 박자',
  ready: true,
  container: '빙수컵',
  rows: 8,
  cols: 3,
  // 컵 그림(cup.png)이 있을 때 칸을 놓을 자리 (컵 그림에서 잰 %)
  // top/bottom = 위아래 여백, topInset/bottomInset = 맨 위/맨 아래 줄의 양옆 여백 (컵이 아래로 좁아져요)
  cupShape: { top: 9, bottom: 27, topInset: 10, bottomInset: 27.5 },
  defaultTitle: '나의 빙수 노래',
  ingredients: [
    { id: 'ice', name: '얼음', emoji: '🧊', color: '#d6f0ff', instrument: 'drum', voice: 'drum', sound: '기본 리듬' },
    { id: 'redbean', name: '팥', emoji: '🫘', color: '#9c4a4a', instrument: 'bass', voice: 'bass', sound: '저음' },
    { id: 'strawberry', name: '딸기', emoji: '🍓', color: '#ff6b81', instrument: 'guitar', voice: 'guitarClean', sound: '선명한 음색' },
    { id: 'mango', name: '망고', emoji: '🥭', color: '#ffb84d', instrument: 'keys', voice: 'keysBright', sound: '밝은 멜로디' },
    { id: 'tteok', name: '떡', emoji: '🍡', color: '#f5e6c8', instrument: 'snare', voice: 'snare', sound: '리듬 강조' },
    { id: 'chocolate', name: '초콜릿', emoji: '🍫', color: '#6d4c41', instrument: 'guitar', voice: 'guitarRock', sound: '강한 음색' },
    { id: 'jelly', name: '젤리', emoji: '🍬', color: '#b388ff', instrument: 'synth', voice: 'synthFun', sound: '재미있는 전자음' },
    { id: 'cereal', name: '시리얼', emoji: '🥣', color: '#e0b973', instrument: 'cymbal', voice: 'cymbal', sound: '경쾌한 효과음' },
    { id: 'banana', name: '바나나', emoji: '🍌', color: '#ffe066', instrument: 'keys', voice: 'keysSoft', sound: '부드러운 멜로디' },
    { id: 'icecream', name: '아이스크림', emoji: '🍨', color: '#ffd6e7', instrument: 'synth', voice: 'synthPad', sound: '마무리 음색' },
  ],
};

// 2차 개발 예정 테마 (지금은 "준비 중" 카드로만 보입니다)
const upcoming = [
  {
    id: 'pizza', name: '피자 만들기', emoji: '🍕', method: '토핑 배치', learn: '악기 조합',
    ingredients: [
      { id: 'dough', name: '도우', emoji: '🫓', instrument: 'drum', voice: 'drum' },
      { id: 'pepperoni', name: '페퍼로니', emoji: '🔴', instrument: 'bass', voice: 'bass' },
      { id: 'cheese', name: '치즈', emoji: '🧀', instrument: 'guitar', voice: 'guitarClean' },
      { id: 'mushroom', name: '버섯', emoji: '🍄', instrument: 'keys', voice: 'keysBright' },
      { id: 'olive', name: '올리브', emoji: '🫒', instrument: 'cymbal', voice: 'cymbal' },
      { id: 'pineapple', name: '파인애플', emoji: '🍍', instrument: 'synth', voice: 'synthFun' },
    ],
  },
  {
    id: 'burger', name: '햄버거 만들기', emoji: '🍔', method: '재료 층 쌓기', learn: '리듬 구성',
    ingredients: [
      { id: 'bun', name: '빵', emoji: '🍞', instrument: 'drum', voice: 'drum' },
      { id: 'patty', name: '패티', emoji: '🥩', instrument: 'bass', voice: 'bass' },
      { id: 'cheese', name: '치즈', emoji: '🧀', instrument: 'guitar', voice: 'guitarClean' },
      { id: 'lettuce', name: '양상추', emoji: '🥬', instrument: 'keys', voice: 'keysSoft' },
      { id: 'tomato', name: '토마토', emoji: '🍅', instrument: 'synth', voice: 'synthFun' },
      { id: 'egg', name: '계란', emoji: '🍳', instrument: 'snare', voice: 'snare' },
    ],
  },
  {
    id: 'cake', name: '케이크 만들기', emoji: '🎂', method: '층별 장식', learn: '음의 길이',
    ingredients: [
      { id: 'sponge', name: '케이크 시트', emoji: '🍰', instrument: 'drum', voice: 'drum' },
      { id: 'cream', name: '생크림', emoji: '☁️', instrument: 'keys', voice: 'keysSoft' },
      { id: 'strawberry', name: '딸기', emoji: '🍓', instrument: 'guitar', voice: 'guitarClean' },
      { id: 'chocodeco', name: '초콜릿 장식', emoji: '🍫', instrument: 'bass', voice: 'bass' },
      { id: 'candy', name: '사탕', emoji: '🍭', instrument: 'cymbal', voice: 'cymbal' },
    ],
  },
  { id: 'icecream', name: '아이스크림 만들기', emoji: '🍦', method: '토핑 꾸미기', learn: '반복 리듬', ingredients: [] },
  { id: 'animals', name: '동물 음악회', emoji: '🦁', method: '동물 배치', learn: '악기와 음색', ingredients: [] },
  { id: 'space', name: '우주 탐험', emoji: '🚀', method: '우주 오브젝트 배치', learn: '음악 분위기', ingredients: [] },
].map((t) => ({ ready: false, rows: 8, cols: 3, ...t }));

export const THEMES = [bingsu, ...upcoming];

export function getTheme(id) {
  return THEMES.find((t) => t.id === id) || null;
}

export function ingredientOf(theme, ingId) {
  return theme.ingredients.find((i) => i.id === ingId) || null;
}

export function imagePath(themeId, ingId) {
  return `assets/images/${themeId}/${ingId}.png`;
}
