// 테마 정보: 테마마다 "악단"(악기 모음)이 달라요. 음악 엔진(engine.js)은 모두 같이 써요.
// 새 테마는 여기에 재료 목록과 재료 ↔ 악기 연결만 추가하면 됩니다.
//
// 그림 파일: assets/images/<테마 id>/<재료 id>.png  → 이모지 대신 그 그림이 나와요.
//            assets/images/instruments/<악기 id>.png → 악기 아이콘

// ---------- 악기 ----------
// ensemble = 어느 악단의 악기인지
export const INSTRUMENTS = {
  // 🎸 밴드
  drum: { ensemble: 'band', name: '드럼', emoji: '🥁', color: '#ff8a65', desc: '쿵! 쿵! 음악의 기본 박자를 잡아 줘요.' },
  bass: { ensemble: 'band', name: '베이스 기타', emoji: '🎸', color: '#8d6e63', desc: '둥둥~ 낮은 소리로 음악을 든든하게 받쳐 줘요.' },
  guitar: { ensemble: 'band', name: '일렉트릭 기타', emoji: '🎸', color: '#ef5350', desc: '찌잉~ 선명하고 힘찬 소리를 내요.' },
  keys: { ensemble: 'band', name: '키보드', emoji: '🎹', color: '#ffca28', desc: '띵동~ 밝고 고운 멜로디를 연주해요.' },
  snare: { ensemble: 'band', name: '스네어 드럼', emoji: '🪘', color: '#ab47bc', desc: '탁! 탁! 리듬을 또렷하게 강조해요.' },
  synth: { ensemble: 'band', name: '신시사이저', emoji: '🎛️', color: '#26c6da', desc: '뿅뿅~ 신기한 전자 소리를 만들어요.' },
  cymbal: { ensemble: 'band', name: '심벌즈', emoji: '🔔', color: '#d4a017', desc: '차앙~ 츠츠츠 경쾌하게 반짝이는 소리예요.' },
  // 🎻 오케스트라
  timpani: { ensemble: 'orchestra', name: '팀파니', emoji: '🥁', color: '#a1887f', desc: '두웅~ 큰 솥 모양 북이에요. 음높이가 있어요.' },
  cello: { ensemble: 'orchestra', name: '첼로', emoji: '🎻', color: '#8d5a3b', desc: '사람 목소리처럼 낮고 따뜻한 현악기예요.' },
  violin: { ensemble: 'orchestra', name: '바이올린', emoji: '🎻', color: '#d4884a', desc: '활로 켜는 높고 고운 현악기예요.' },
  trumpet: { ensemble: 'orchestra', name: '트럼펫', emoji: '🎺', color: '#f2b51d', desc: '빠바밤! 밝고 힘찬 금관악기예요.' },
  horn: { ensemble: 'orchestra', name: '호른', emoji: '📯', color: '#e0a03a', desc: '동그랗게 말린 관에서 부드럽고 넓은 소리가 나요.' },
  flute: { ensemble: 'orchestra', name: '플루트', emoji: '🪈', color: '#9fc5e8', desc: '바람처럼 맑고 높은 목관악기예요.' },
  harp: { ensemble: 'orchestra', name: '하프', emoji: '🪕', color: '#c9a0dc', desc: '여러 줄을 손가락으로 퉁겨 물결 같은 소리를 내요.' },
  triangle: { ensemble: 'orchestra', name: '트라이앵글', emoji: '🔺', color: '#b0bec5', desc: '띵~ 세모 모양 쇠막대가 맑게 울려요.' },
  // 🎷 재즈
  brushDrum: { ensemble: 'jazz', name: '브러시 드럼', emoji: '🥁', color: '#90a4ae', desc: '솔처럼 생긴 채로 사각사각 스윙 리듬을 쳐요.' },
  doubleBass: { ensemble: 'jazz', name: '콘트라베이스', emoji: '🎻', color: '#795548', desc: '키보다 큰 현악기! 둥둥 걸어가듯 연주해요.' },
  piano: { ensemble: 'jazz', name: '피아노', emoji: '🎹', color: '#455a64', desc: '재즈 화음을 엇박으로 콕콕 눌러 줘요.' },
  vibraphone: { ensemble: 'jazz', name: '비브라폰', emoji: '🎼', color: '#80cbc4', desc: '쇠막대를 두드리면 물결치듯 떨리는 소리가 나요.' },
  saxophone: { ensemble: 'jazz', name: '색소폰', emoji: '🎷', color: '#ffb300', desc: '부드럽고 멋스러운 재즈의 대표 악기예요.' },
  muteTrumpet: { ensemble: 'jazz', name: '뮤트 트럼펫', emoji: '🎺', color: '#ffcc80', desc: '나팔 끝을 막아 작고 콧소리 같은 소리를 내요.' },
  snap: { ensemble: 'jazz', name: '핑거 스냅', emoji: '🫰', color: '#f8bbd0', desc: '딱! 딱! 손가락으로 박자를 맞춰요.' },
  // 🎁 오르골 · 벨
  musicBox: { ensemble: 'musicbox', name: '오르골', emoji: '🎁', color: '#f8bbd0', desc: '태엽을 감으면 똘랑똘랑 멜로디가 나와요.' },
  celesta: { ensemble: 'musicbox', name: '첼레스타', emoji: '🎹', color: '#ce93d8', desc: '건반으로 치는 반짝반짝 종소리예요.' },
  glockenspiel: { ensemble: 'musicbox', name: '글로켄슈필', emoji: '🔔', color: '#ffe082', desc: '쇠막대를 두드리는 높고 맑은 철금이에요.' },
  handbell: { ensemble: 'musicbox', name: '핸드벨', emoji: '🛎️', color: '#ffd54f', desc: '손에 들고 흔들면 댕~ 길게 울려요.' },
  xylophone: { ensemble: 'musicbox', name: '실로폰', emoji: '🪵', color: '#bcaaa4', desc: '나무 막대를 통통 두드려요.' },
  windChime: { ensemble: 'musicbox', name: '윈드차임', emoji: '🎐', color: '#b3e5fc', desc: '바람에 흔들리듯 찰랑찰랑 반짝여요.' },
  toyPiano: { ensemble: 'musicbox', name: '장난감 피아노', emoji: '🧸', color: '#ffab91', desc: '작고 귀여운 똥땅 소리예요.' },
  // 🪘 타악기
  cajon: { ensemble: 'percussion', name: '카혼', emoji: '📦', color: '#d7a86e', desc: '나무 상자에 앉아 손바닥으로 쳐요. 쿵·탁!' },
  bongo: { ensemble: 'percussion', name: '봉고', emoji: '🪘', color: '#c47a4a', desc: '작은 북 두 개를 번갈아 통통 쳐요.' },
  conga: { ensemble: 'percussion', name: '콩가', emoji: '🪘', color: '#a0522d', desc: '키 큰 북이에요. 퉁~ 깊은 소리가 나요.' },
  maracas: { ensemble: 'percussion', name: '마라카스', emoji: '🪇', color: '#ff7043', desc: '흔들면 차차차 씨앗 소리가 나요.' },
  tambourine: { ensemble: 'percussion', name: '탬버린', emoji: '🪇', color: '#ffca28', desc: '찰랑찰랑 방울이 달린 북이에요.' },
  woodblock: { ensemble: 'percussion', name: '우드블록', emoji: '🪵', color: '#a1887f', desc: '딱 딱 나무 토막 소리로 박자를 알려 줘요.' },
  cowbell: { ensemble: 'percussion', name: '카우벨', emoji: '🔔', color: '#9e9e9e', desc: '소 목에 다는 방울처럼 깡깡 울려요.' },
  // 🥁 국악
  buk: { ensemble: 'gugak', name: '북', emoji: '🥁', color: '#c62828', desc: '둥! 둥! 우리 음악의 큰북이에요.' },
  gayageum: { ensemble: 'gugak', name: '가야금', emoji: '🪕', color: '#d4a373', desc: '열두 줄을 손가락으로 뜯고 흔들어 떨림을 만들어요.' },
  daegeum: { ensemble: 'gugak', name: '대금', emoji: '🪈', color: '#8bc34a', desc: '대나무로 만든 가로 피리예요. 바람 소리가 섞여요.' },
  jing: { ensemble: 'gugak', name: '징', emoji: '🟡', color: '#d4a017', desc: '지잉~ 넓고 길게 울려 퍼지는 쇠 악기예요.' },
  kkwaenggwari: { ensemble: 'gugak', name: '꽹과리', emoji: '🥏', color: '#fbc02d', desc: '깨갱깨갱! 풍물놀이를 이끄는 작은 쇠예요.' },
  geomungo: { ensemble: 'gugak', name: '거문고', emoji: '🪕', color: '#5d4037', desc: '술대로 줄을 쳐서 낮고 묵직한 소리를 내요.' },
  janggu: { ensemble: 'gugak', name: '장구', emoji: '🪘', color: '#e57373', desc: '양쪽을 쳐요. 쿵(왼쪽) 덕(오른쪽)!' },
  haegeum: { ensemble: 'gugak', name: '해금', emoji: '🎻', color: '#a1887f', desc: '두 줄 사이 활로 켜는 애틋한 소리예요.' },
  // 🎛️ 전자 음악
  edmKick: { ensemble: 'electronic', name: '전자 킥', emoji: '🔊', color: '#5c6bc0', desc: '쿵쿵쿵쿵! 춤추는 박자를 만들어요.' },
  wobble: { ensemble: 'electronic', name: '와블 베이스', emoji: '〰️', color: '#7e57c2', desc: '우왑우왑~ 출렁이는 낮은 소리예요.' },
  arp: { ensemble: 'electronic', name: '아르페지오', emoji: '✨', color: '#26c6da', desc: '화음을 빠르게 하나씩 뿅뿅뿅 쳐요.' },
  laser: { ensemble: 'electronic', name: '레이저', emoji: '⚡', color: '#ec407a', desc: '피융~ 높은 소리가 아래로 떨어져요.' },
  spacePad: { ensemble: 'electronic', name: '우주 패드', emoji: '🌌', color: '#3949ab', desc: '우주처럼 넓고 몽롱하게 깔리는 소리예요.' },
  subDrop: { ensemble: 'electronic', name: '서브 드롭', emoji: '🌀', color: '#283593', desc: '우우웅~ 아주 낮게 떨어지는 소리예요.' },
  hatRoll: { ensemble: 'electronic', name: '하이햇 롤', emoji: '💫', color: '#90caf9', desc: '츠츠츠츠 빠르게 굴러가는 소리예요.' },
  lead: { ensemble: 'electronic', name: '리드 신스', emoji: '🎛️', color: '#ab47bc', desc: '멜로디를 앞에서 이끄는 반짝이는 소리예요.' },
};

// ---------- 악단 ----------
export const ENSEMBLES = {
  band: { name: '밴드', emoji: '🎸', progression: 'pop', instruments: ['drum', 'snare', 'cymbal', 'bass', 'guitar', 'keys', 'synth'] },
  orchestra: { name: '오케스트라', emoji: '🎻', progression: 'classical', instruments: ['timpani', 'triangle', 'cello', 'violin', 'harp', 'flute', 'horn', 'trumpet'] },
  jazz: { name: '재즈 밴드', emoji: '🎷', progression: 'jazz', instruments: ['brushDrum', 'snap', 'doubleBass', 'piano', 'vibraphone', 'saxophone', 'muteTrumpet'] },
  musicbox: { name: '오르골 악단', emoji: '🎁', progression: 'pop', instruments: ['musicBox', 'celesta', 'glockenspiel', 'handbell', 'xylophone', 'windChime', 'toyPiano'] },
  percussion: { name: '타악기 팀', emoji: '🪘', progression: 'pop', instruments: ['cajon', 'bongo', 'conga', 'maracas', 'tambourine', 'woodblock', 'cowbell'] },
  gugak: { name: '국악단', emoji: '🥁', progression: 'gugak', instruments: ['buk', 'janggu', 'jing', 'kkwaenggwari', 'gayageum', 'geomungo', 'daegeum', 'haegeum'] },
  electronic: { name: '전자 음악단', emoji: '🎛️', progression: 'space', instruments: ['edmKick', 'hatRoll', 'laser', 'subDrop', 'wobble', 'arp', 'spacePad', 'lead'] },
};
export const ENSEMBLE_ORDER = ['band', 'orchestra', 'jazz', 'musicbox', 'percussion', 'gugak', 'electronic'];

// 예전 이름 (밴드 악기 순서)
export const INSTRUMENT_ORDER = ENSEMBLES.band.instruments;

// ---------- 고를 수 있는 소리 ----------
// 밴드는 한 악기에 소리가 두 가지인 것이 있어요. 다른 악단은 악기 하나 = 소리 하나.
const BAND_VOICE_LIST = [
  { id: 'drum', instrument: 'drum', sound: '쿵쿵 기본 리듬' },
  { id: 'snare', instrument: 'snare', sound: '탁탁 리듬 강조' },
  { id: 'cymbal', instrument: 'cymbal', sound: '차앙~ 경쾌한 소리' },
  { id: 'bass', instrument: 'bass', sound: '둥둥 낮은 소리' },
  { id: 'guitarClean', instrument: 'guitar', sound: '맑고 선명한 소리' },
  { id: 'guitarRock', instrument: 'guitar', sound: '지글지글 강한 소리' },
  { id: 'keysBright', instrument: 'keys', sound: '밝은 멜로디' },
  { id: 'keysSoft', instrument: 'keys', sound: '부드러운 화음' },
  { id: 'synthFun', instrument: 'synth', sound: '뿅뿅 전자음' },
  { id: 'synthPad', instrument: 'synth', sound: '몽글몽글 마무리' },
];

const SHORT_SOUND = {
  timpani: '두웅 깊은 북소리', cello: '낮고 따뜻하게', violin: '높고 곱게', trumpet: '밝고 힘차게', horn: '넓고 부드럽게',
  flute: '맑은 바람 소리', harp: '물결처럼 또르르', triangle: '띵~ 맑게',
  brushDrum: '사각사각 스윙', doubleBass: '둥둥 걸어가듯', piano: '콕콕 재즈 화음', vibraphone: '물결치는 종소리',
  saxophone: '부드럽고 멋지게', muteTrumpet: '작은 콧소리', snap: '딱! 딱!',
  musicBox: '똘랑똘랑 멜로디', celesta: '반짝 종소리 화음', glockenspiel: '높고 맑게 띵', handbell: '댕~ 길게',
  xylophone: '통통 나무 소리', windChime: '찰랑찰랑', toyPiano: '귀여운 똥땅',
  cajon: '쿵·탁', bongo: '통통 번갈아', conga: '퉁~ 깊게', maracas: '차차차', tambourine: '찰랑찰랑', woodblock: '딱 딱', cowbell: '깡깡',
  buk: '둥! 둥!', gayageum: '뜯고 떠는 소리', daegeum: '바람 섞인 피리', jing: '지잉~ 길게', kkwaenggwari: '깨갱깨갱',
  geomungo: '낮고 묵직하게', janggu: '쿵 덕 쿵 덕', haegeum: '애틋하게',
  edmKick: '쿵쿵쿵쿵', wobble: '우왑우왑', arp: '뿅뿅뿅 빠르게', laser: '피융~', spacePad: '몽롱하게 깔리는',
  subDrop: '우우웅 아래로', hatRoll: '츠츠츠츠', lead: '반짝이는 멜로디',
};

export const VOICE_LIST = [
  ...BAND_VOICE_LIST,
  ...Object.keys(SHORT_SOUND).map((id) => ({ id, instrument: id, sound: SHORT_SOUND[id] })),
].map((v) => ({ ...v, ensemble: INSTRUMENTS[v.instrument].ensemble, name: INSTRUMENTS[v.instrument].name }));

export function voiceInfo(id) {
  return VOICE_LIST.find((v) => v.id === id) || null;
}

// 재료 만들기 도우미: 악단 악기는 악기 이름 = 소리 이름
const ing = (id, name, emoji, color, voice, sound) => ({
  id, name, emoji, color, voice, instrument: voiceInfo(voice).instrument, sound: sound || voiceInfo(voice).sound,
});

// ---------- 테마 ----------
const bingsu = {
  id: 'bingsu', name: '빙수 만들기', emoji: '🍧', method: '재료 쌓기', learn: '순서와 박자',
  ensemble: 'band', container: '빙수컵', hint: '재료를 빙수컵에 쌓으면 음악이 돼요!',
  rows: 8, cols: 3,
  // 컵 그림(cup.png)이 있을 때 칸을 놓을 자리 (컵 그림에서 잰 %)
  containerImage: 'cup.png',
  cupShape: { top: 9, bottom: 27, topInset: 10, bottomInset: 27.5 },
  defaultTitle: '나의 빙수 노래',
  ingredients: [
    ing('ice', '얼음', '🧊', '#d6f0ff', 'drum', '기본 리듬'),
    ing('redbean', '팥', '🫘', '#9c4a4a', 'bass', '저음'),
    ing('strawberry', '딸기', '🍓', '#ff6b81', 'guitarClean', '선명한 음색'),
    ing('mango', '망고', '🥭', '#ffb84d', 'keysBright', '밝은 멜로디'),
    ing('tteok', '떡', '🍡', '#f5e6c8', 'snare', '리듬 강조'),
    ing('chocolate', '초콜릿', '🍫', '#6d4c41', 'guitarRock', '강한 음색'),
    ing('jelly', '젤리', '🍬', '#b388ff', 'synthFun', '재미있는 전자음'),
    ing('cereal', '시리얼', '🥣', '#e0b973', 'cymbal', '경쾌한 효과음'),
    ing('banana', '바나나', '🍌', '#ffe066', 'keysSoft', '부드러운 멜로디'),
    ing('icecream', '아이스크림', '🍨', '#ffd6e7', 'synthPad', '마무리 음색'),
  ],
};

const pizza = {
  id: 'pizza', name: '피자 만들기', emoji: '🍕', method: '토핑 배치', learn: '악기 조합',
  ensemble: 'orchestra', container: '피자 도우', hint: '도우 위에 토핑을 올리면 오케스트라가 연주해요!',
  rows: 6, cols: 4, cssShape: { top: 13, bottom: 13, topInset: 15, bottomInset: 15 },
  defaultTitle: '나의 피자 교향곡',
  ingredients: [
    ing('dough', '도우', '🫓', '#f3d29b', 'timpani'),
    ing('sauce', '토마토소스', '🥫', '#e8553e', 'cello'),
    ing('cheese', '치즈', '🧀', '#ffd54f', 'violin'),
    ing('pepperoni', '페퍼로니', '🍖', '#d84343', 'trumpet'),
    ing('mushroom', '버섯', '🍄', '#d7ccc8', 'horn'),
    ing('olive', '올리브', '🫒', '#9ccc65', 'flute'),
    ing('pineapple', '파인애플', '🍍', '#ffe082', 'harp'),
    ing('basil', '바질', '🌿', '#81c784', 'triangle'),
  ],
};

const burger = {
  id: 'burger', name: '햄버거 만들기', emoji: '🍔', method: '재료 층 쌓기', learn: '리듬 구성',
  ensemble: 'jazz', container: '햄버거', hint: '빵 사이에 재료를 쌓으면 재즈 밴드가 연주해요!',
  rows: 8, cols: 3, cssShape: { top: 15, bottom: 15, topInset: 9, bottomInset: 9 },
  defaultTitle: '나의 햄버거 재즈',
  ingredients: [
    ing('bun', '빵', '🍞', '#f0b46c', 'brushDrum'),
    ing('patty', '패티', '🥩', '#8d5a3b', 'doubleBass'),
    ing('cheese', '치즈', '🧀', '#ffd54f', 'piano'),
    ing('lettuce', '양상추', '🥬', '#a5d6a7', 'vibraphone'),
    ing('tomato', '토마토', '🍅', '#ef6c57', 'saxophone'),
    ing('egg', '계란', '🍳', '#fff3c4', 'muteTrumpet'),
    ing('pickle', '피클', '🥒', '#9ccc65', 'snap'),
  ],
};

const cake = {
  id: 'cake', name: '케이크 만들기', emoji: '🎂', method: '층별 장식', learn: '음의 길이',
  ensemble: 'musicbox', container: '케이크', hint: '케이크를 꾸미면 오르골이 생일 노래를 연주해요!',
  rows: 8, cols: 3, cssShape: { top: 8, bottom: 12, topInset: 25, bottomInset: 8 },
  defaultTitle: '나의 케이크 오르골',
  ingredients: [
    ing('sponge', '케이크 시트', '🍰', '#f6d7a7', 'musicBox'),
    ing('cream', '생크림', '🍦', '#fff8f0', 'celesta'),
    ing('strawberry', '딸기', '🍓', '#ff6b81', 'glockenspiel'),
    ing('chocodeco', '초콜릿 장식', '🍫', '#6d4c41', 'handbell'),
    ing('candy', '사탕', '🍭', '#f48fb1', 'xylophone'),
    ing('candle', '촛불', '🕯️', '#ffe0b2', 'windChime'),
    ing('cherry', '체리', '🍒', '#e57373', 'toyPiano'),
  ],
};

const icecream = {
  id: 'icecream', name: '아이스크림 만들기', emoji: '🍦', method: '토핑 꾸미기', learn: '반복 리듬',
  ensemble: 'percussion', container: '아이스크림 콘', hint: '콘 위에 쌓으면 타악기 팀이 리듬을 연주해요!',
  rows: 8, cols: 3, cssShape: { top: 5, bottom: 33, topInset: 16, bottomInset: 22 },
  defaultTitle: '나의 아이스크림 리듬',
  ingredients: [
    ing('cone', '콘', '🍦', '#e0b06b', 'cajon'),
    ing('vanilla', '바닐라', '🍨', '#fff6d8', 'bongo'),
    ing('choco', '초코', '🟤', '#8d6e63', 'conga'),
    ing('berry', '딸기맛', '🍓', '#f8a5c2', 'maracas'),
    ing('sprinkles', '스프링클', '🎊', '#ce93d8', 'tambourine'),
    ing('wafer', '웨하스', '🧇', '#f3c77d', 'woodblock'),
    ing('mint', '민트', '🌿', '#b2dfdb', 'cowbell'),
  ],
};

const animals = {
  id: 'animals', name: '동물 음악회', emoji: '🐯', method: '동물 배치', learn: '악기와 음색',
  ensemble: 'gugak', container: '음악회 무대', hint: '옛 그림 속 동물들이 국악기를 연주해요!',
  rows: 6, cols: 4, cssShape: { top: 14, bottom: 8, topInset: 18, bottomInset: 6 },
  defaultTitle: '나의 동물 국악 음악회',
  ingredients: [
    ing('tiger', '호랑이', '🐯', '#ffb74d', 'buk'),
    ing('rabbit', '토끼', '🐰', '#f8bbd0', 'gayageum'),
    ing('crane', '학', '🦢', '#e3f2fd', 'daegeum'),
    ing('turtle', '거북이', '🐢', '#a5d6a7', 'jing'),
    ing('magpie', '까치', '🐦', '#90a4ae', 'kkwaenggwari'),
    ing('bear', '곰', '🐻', '#a1887f', 'geomungo'),
    ing('squirrel', '다람쥐', '🐿️', '#d7a86e', 'janggu'),
    ing('deer', '사슴', '🦌', '#ffcc80', 'haegeum'),
  ],
};

const space = {
  id: 'space', name: '우주 탐험', emoji: '🚀', method: '우주 오브젝트 배치', learn: '음악 분위기',
  ensemble: 'electronic', container: '우주', hint: '우주에 띄우면 전자 음악이 흘러나와요!',
  rows: 8, cols: 3, cssShape: { top: 6, bottom: 6, topInset: 12, bottomInset: 12 },
  defaultTitle: '나의 우주 전자 음악',
  ingredients: [
    ing('rocket', '로켓', '🚀', '#ff8a80', 'edmKick'),
    ing('planet', '행성', '🪐', '#b39ddb', 'wobble'),
    ing('star', '별', '⭐', '#fff59d', 'arp'),
    ing('alien', '외계인', '👽', '#a5d6a7', 'laser'),
    ing('satellite', '인공위성', '🛰️', '#b0bec5', 'spacePad'),
    ing('blackhole', '블랙홀', '🕳️', '#9575cd', 'subDrop'),
    ing('comet', '혜성', '☄️', '#81d4fa', 'hatRoll'),
    ing('moon', '달', '🌙', '#fff9c4', 'lead'),
  ],
};

export const THEMES = [bingsu, pizza, burger, cake, icecream, animals, space].map((t) => ({ ready: true, ...t }));

export function getTheme(id) {
  return THEMES.find((t) => t.id === id) || null;
}

export function ensembleOf(theme) {
  return ENSEMBLES[theme?.ensemble] || ENSEMBLES.band;
}

export function ingredientOf(theme, ingId) {
  return theme.ingredients.find((i) => i.id === ingId) || null;
}

// 재료가 지금 내는 소리: 학생이 고른 악기(voices[재료 id])가 있으면 그것, 없으면 테마의 기본 악기
export function soundOf(theme, ingId, voices = {}) {
  const i = ingredientOf(theme, ingId);
  if (!i) return null;
  const chosen = voices && voiceInfo(voices[ingId]);
  const custom = Boolean(chosen) && chosen.id !== i.voice;
  const v = custom ? chosen : voiceInfo(i.voice);
  return { voice: v.id, instrument: v.instrument, name: INSTRUMENTS[v.instrument].name, sound: custom ? v.sound : i.sound, custom };
}

// 저장된 악기 선택 정리: 있는 재료·있는 소리만, 기본과 같은 것은 빼고
export function normalizeVoices(raw, theme) {
  const out = {};
  if (!raw || typeof raw !== 'object' || !theme) return out;
  for (const i of theme.ingredients) {
    const v = voiceInfo(raw[i.id]);
    if (v && v.id !== i.voice) out[i.id] = v.id;
  }
  return out;
}

export function imagePath(themeId, ingId) {
  return `assets/images/${themeId}/${ingId}.png`;
}
