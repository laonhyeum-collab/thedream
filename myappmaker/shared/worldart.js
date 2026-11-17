// 메타버스 앱 월드의 생김새: 자리 배치(선생님 건물 1 + 학생 부스 12), 월드 그림 자리, 그림 프롬프트
// 교사 앱(그림 올리기·프롬프트), 학생 앱(내 부스 그림 프롬프트), 앱 월드(그리기), 프롬프트 문서가 함께 씁니다.

export const WORLD_W = 1920;
export const WORLD_H = 1080;
export const STUDENT_BOOTHS = 12;

// 건물은 (가운데 x, 바닥 y)로 정합니다. 문은 바닥 가운데.
export const HALL = { x: 960, y: 470, w: 300, h: 250 };
export const FOUNTAIN = { x: 960, y: 655, r: 72 };
export const ARCH = { x: 960, y: 1010, w: 330, h: 150 };
export const BOOTH_SIZE = { w: 176, h: 150 };
export const SLOTS = [
  { n: 1, x: 395, y: 395 }, { n: 2, x: 655, y: 275 }, { n: 3, x: 1265, y: 275 }, { n: 4, x: 1525, y: 395 },
  { n: 5, x: 270, y: 610 }, { n: 6, x: 575, y: 640 }, { n: 7, x: 1345, y: 640 }, { n: 8, x: 1650, y: 610 },
  { n: 9, x: 385, y: 845 }, { n: 10, x: 640, y: 905 }, { n: 11, x: 1280, y: 905 }, { n: 12, x: 1535, y: 845 },
];

// hotspots: 지도 그림(일러스트) 위 문 자리. 그림 크기에 대한 비율(0~1)로 [x, y]
//   hall = 선생님의 앱, start = 처음 서는 곳, booths[0..11] = 01~12번 부스
// labelMode: 'small' = 그림 속 간판을 살리고 작은 이름표만 / 'big' = 큰 이름표
export const DEFAULT_WORLD = { schoolName: '', title: '친구들이 만든 앱 월드', notice: '', hotspots: { hall: null, start: null, booths: Array(12).fill(null) }, labelMode: 'small' };

const pt = (v) => (Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && n >= 0 && n <= 1) ? [Math.round(v[0] * 10000) / 10000, Math.round(v[1] * 10000) / 10000] : null);
export function cleanHotspots(v) {
  const o = v && typeof v === 'object' ? v : {};
  const booths = Array.from({ length: 12 }, (_, i) => pt(Array.isArray(o.booths) ? o.booths[i] : null));
  return { hall: pt(o.hall), start: pt(o.start), booths };
}
export const hasHotspots = (hs) => !!(hs && (hs.hall || hs.booths.some(Boolean)));

export function cleanWorldSettings(v) {
  const s = v && typeof v === 'object' ? v : {};
  const str = (x, n) => (typeof x === 'string' ? x.replace(/[<>]/g, '').trim().slice(0, n) : '');
  return { schoolName: str(s.schoolName, 20), title: str(s.title, 24) || DEFAULT_WORLD.title, notice: str(s.notice, 300),
    hotspots: cleanHotspots(s.hotspots), labelMode: s.labelMode === 'big' ? 'big' : 'small' };
}

export const worldName = (s) => (s && s.schoolName ? `${s.schoolName} ${s.title || DEFAULT_WORLD.title}` : (s && s.title) || DEFAULT_WORLD.title);

// ---------- 그림체 (월드·학생 그림 모두 같은 말을 씀) ----------
export const PIXEL_STYLE = '16비트 레트로 게임 같은 픽셀아트. 밝고 선명한 파스텔 색감, 또렷한 1픽셀 외곽선, 귀엽고 아기자기한 분위기, 위에서 비스듬히(약 45도) 내려다본 시점. 흐림·그라데이션·사진 같은 질감 없이 깔끔한 픽셀로';
export const NO_TEXT = '그림 안에 글자·숫자·로고·간판 글씨·워터마크를 절대 넣지 마(이름표는 앱이 따로 붙여요). 유명 게임·캐릭터를 따라 하지 말고 독창적으로';
const WHITE_BG = '배경은 아무것도 없는 하얀색 한 가지로(바닥·그림자·풍경 없이), 건물 하나만 가운데에 꽉 차게';

const CATS = {
  adventure: { name: '모험', look: '야자수와 보물 상자, 나무 판자 지붕, 밧줄과 돛 장식이 있는 탐험가 오두막' },
  action: { name: '액션', look: '주황·빨강 줄무늬 천막 지붕과 깃발, 별 장식이 있는 신나는 오락실 가게' },
  create: { name: '창작', look: '보라·분홍 지붕에 물감 팔레트와 리본 장식, 둥근 창문이 있는 공방' },
  mystery: { name: '추리', look: '파란 뾰족 지붕에 돋보기 모양 둥근 창과 시계탑이 있는 탐정 사무소' },
  life: { name: '생활', look: '노란 차양과 화분, 나무 벤치가 있는 아늑한 동네 가게' },
};

// 교사가 만드는 월드 그림 자리 (없으면 앱이 픽셀아트로 직접 그림)
export const WORLD_ASSETS = [
  { key: 'map', title: '🗺️ 월드 지도', ratio: '16:9', max: [1920, 1080], clear: false, required: true,
    use: '월드 전체 그림. 건물까지 그린 지도를 올리고 「문 자리 찍기」를 하면 그 그림 그대로 월드가 돼요.' },
  { key: 'hall', title: '🏫 선생님의 앱 건물', ratio: '1:1', max: [480, 480], clear: true, use: '지도 한가운데 큰 건물' },
  { key: 'booth', title: '🏠 기본 부스 건물', ratio: '1:1', max: [320, 320], clear: true, use: '학생이 부스 그림을 안 만들었을 때 쓰는 건물' },
  ...Object.entries(CATS).map(([id, c]) => ({ key: `booth_${id}`, title: `🏠 ${c.name} 분야 부스`, ratio: '1:1', max: [320, 320], clear: true, use: `${c.name} 분야 앱의 부스 (선택)`, cat: id })),
  { key: 'fountain', title: '⛲ 가운데 분수', ratio: '1:1', max: [320, 320], clear: true, use: '광장 한가운데 분수' },
  { key: 'arch', title: '🚪 입구 아치', ratio: '2:1', max: [480, 240], clear: true, use: '지도 아래쪽 입구. 학교 이름은 앱이 현수막에 써 줘요.' },
];
export const WORLD_ASSET_KEYS = WORLD_ASSETS.map((a) => a.key);

export function worldPrompts(settings = DEFAULT_WORLD) {
  const s = cleanWorldSettings(settings);
  const school = s.schoolName || '○○초등학교';
  const P = {
    map: `어린이 교육용 메타버스 게임의 섬 마을 전체 지도를 그려 줘. 가로 16:9, ${PIXEL_STYLE}.
구성: 바다로 둘러싸인 큰 초록 섬 하나. 섬 가장자리는 낮은 절벽과 모래사장, 작은 폭포 2~3개, 섬 안쪽에 작은 연못과 강, 나무다리.
섬 한가운데 위쪽에 큰 건물을 세울 빈 광장 터, 그 아래에 동그란 돌바닥 광장(가운데는 분수를 놓을 빈자리), 광장에서 맨 아래 가운데 입구 계단까지 이어지는 넓은 길.
광장 둘레에는 작은 건물 12채를 놓을 빈 잔디밭 12곳(위쪽 4곳, 가운데 양옆 4곳, 아래쪽 4곳)과 그곳으로 이어지는 모래길.
꾸미기: 둥근 나무, 분홍 벚꽃나무, 꽃밭, 가로등, 벤치, 바닷가 등대 하나.
주의: 건물·사람·동물은 그리지 말고 땅·길·물·나무만(건물과 캐릭터는 앱이 올려요). ${NO_TEXT}.`,
    hall: `메타버스 마을 한가운데에 있는 「선생님의 앱」 건물 한 채를 그려 줘. ${PIXEL_STYLE}.
보라색 지붕의 작은 학교 겸 성: 양쪽에 뾰족한 탑, 가운데 지붕 위에 학사모 모양 장식과 작은 깃발, 커다란 아치 문(문 위에 게임기 모양 장식), 노란 불빛 창문, 앞에 짧은 돌계단.
${WHITE_BG}. ${NO_TEXT}. 정사각형 1:1.`,
    booth: `메타버스 마을에 놓을 작은 게임 부스 건물 한 채를 그려 줘. ${PIXEL_STYLE}.
알록달록한 지붕의 아담한 가게, 가운데 둥근 문(문 위에 게임기 모양 장식), 양쪽에 작은 창문과 화분, 지붕 위에 빈 간판 자리(글씨 없이 비워 두기).
${WHITE_BG}. ${NO_TEXT}. 정사각형 1:1.`,
    fountain: `마을 광장 한가운데 놓을 동그란 분수를 그려 줘. ${PIXEL_STYLE}. 돌로 된 2층 원형 분수, 맑은 하늘색 물이 솟고 꼭대기에 노란 별 장식, 둘레에 작은 꽃 화단. ${WHITE_BG.replace('건물', '분수')}. ${NO_TEXT}. 정사각형 1:1.`,
    arch: `마을 입구에 서 있는 큰 아치형 문을 그려 줘. ${PIXEL_STYLE}. 양쪽 돌기둥 위에 보라색 깃발, 위쪽에 가로로 긴 빈 현수막(나중에 「${school}」 이름을 앱이 써 넣을 자리라서 비워 두기), 현수막 가운데 위에 게임기 모양 장식, 기둥 아래 꽃 화분. ${WHITE_BG.replace('건물', '아치')}. ${NO_TEXT}. 가로 2:1.`,
  };
  for (const [id, c] of Object.entries(CATS)) {
    P[`booth_${id}`] = `메타버스 마을에 놓을 「${c.name}」 분야 게임 부스 건물 한 채를 그려 줘. ${PIXEL_STYLE}.
모습: ${c.look}. 가운데 둥근 문(문 위에 게임기 모양 장식), 지붕 위에 빈 간판 자리(글씨 없이).
${WHITE_BG}. ${NO_TEXT}. 정사각형 1:1.`;
  }
  return WORLD_ASSETS.map((a) => (a.key === 'map' ? { ...a, prompt: fullMapPrompt(s), groundPrompt: P.map } : { ...a, prompt: P[a.key] }));
}

// ★ 건물까지 다 그린 완성 지도 (추천 — 참고 화면과 같은 구성)
export const MAP_THEMES = [
  { n: 1, row: '위쪽 왼쪽', name: '보물섬 탐험', look: '야자수 옆 해적 오두막, 해적 깃발 문장, 앞에 보물 상자' },
  { n: 2, row: '위쪽', name: '미로 탈출', look: '회색 바위 동굴 속 미궁 입구, 미로 무늬 문장' },
  { n: 3, row: '위쪽 가운데', name: '우주 탐험', look: '눈 덮인 산 위의 우주 기지, 로켓 문장, 보라 수정' },
  { n: 4, row: '위쪽 오른쪽', name: '펫 키우기', look: '큰 나무 위 트리하우스와 나무 계단, 발바닥 문장' },
  { n: 5, row: '오른쪽 위', name: '요리왕', look: '빨강·흰 줄무늬 차양의 식당, 셰프 모자 문장' },
  { n: 6, row: '왼쪽 가운데', name: '놀이공원', look: '관람차와 서커스 천막' },
  { n: 7, row: '가운데 왼쪽', name: '낚시왕', look: '연못 위 나무 수상 오두막과 부두, 물고기 문장' },
  { n: 8, row: '가운데 오른쪽', name: '정글 생존', look: '덩굴로 덮인 돌 유적 아치, 나뭇잎 문장' },
  { n: 9, row: '오른쪽 가운데', name: '몬스터 연구소', look: '보라색 작은 성, 물약 플라스크 문장' },
  { n: 10, row: '왼쪽 아래', name: '미니 게임', look: '해변의 작은 오락실, 게임기 문장, 파라솔' },
  { n: 11, row: '아래 왼쪽', name: '크리에이터', look: '알록달록 차양의 공방과 이젤, 팔레트 문장' },
  { n: 12, row: '오른쪽 아래', name: '방탈출 미스터리', look: '보라 바위 동굴과 빛나는 수정, 자물쇠 문장' },
];

export function fullMapPrompt(settings = DEFAULT_WORLD, { signs = false } = {}) {
  const s = cleanWorldSettings(settings);
  const school = s.schoolName || '○○초등학교';
  const list = MAP_THEMES.map((t) => `${String(t.n).padStart(2, '0')}) ${t.row}: 「${t.name}」 — ${t.look}`).join('\n');
  const signRule = signs
    ? `각 건물 앞 간판에 「01 보물섬 탐험」처럼 번호와 이름을 한글로 또박또박 써 줘(그 밖의 글자는 넣지 마).`
    : `각 건물 앞에 흰색 둥근 간판 판자를 두되 글자는 쓰지 말고 비워 둬(이름표는 앱이 달아요). ${NO_TEXT}`;
  return `어린이 교육용 메타버스 게임 「${school} 앱 월드」의 마을 전체 지도를 한 장으로 그려 줘. 가로 16:9, ${PIXEL_STYLE}.
전체: 바다 위의 큰 초록 섬 마을. 섬 가장자리는 절벽과 모래사장, 폭포 3~4개, 섬 안쪽에 강·연못·나무다리, 분홍 벚꽃나무와 둥근 나무 숲, 꽃밭, 가로등, 벤치, 왼쪽 아래 해변에 빨강·흰 등대.
가운데: 위쪽에 학사모 문장과 깃발이 있는 보라색 지붕의 작은 성 「선생님의 앱」(앞에 큰 아치 문), 그 아래 동그란 돌바닥 광장과 노란 별이 솟은 분수, 맨 아래 가운데에 보라 깃발이 달린 입구 아치와 바다로 내려가는 돌계단.
광장에서 구불구불한 흙길·돌길이 아래 건물 12채로 이어져. 건물마다 지붕 위에 동그란 아이콘 문장, 가운데에 빛나는 문(문 위 게임기 무늬):
${list}
${signRule}
주의: 사람·동물 캐릭터는 그리지 마(캐릭터는 앱이 올려요). 화면 테두리·메뉴·버튼·로고 같은 화면 장식 없이 지도 그림만.`;
}

// 학교 이름을 그림에 직접 넣고 싶을 때 (이미지 AI가 한글을 틀리게 쓸 수 있어 추천하지 않음)
export function mapWithSchoolNamePrompt(settings) {
  const s = cleanWorldSettings(settings);
  const school = s.schoolName || '○○초등학교';
  return `${fullMapPrompt(s)}
추가: 맨 아래 입구 아치의 현수막에만 한글로 「${school} 앱 월드」라고 또박또박 크게 써 줘. 다른 곳에는 글자를 넣지 마.`;
}

// 바닥만 있는 지도 (건물을 따로 만들어 올릴 때)
export const groundMapPrompt = (settings) => worldPrompts(settings).find((a) => a.key === 'map').groundPrompt;

// 학생 부스 건물 그림 프롬프트 (학생 앱 「5. 입점」에서 씀)
export function studentBoothPrompt({ appName, topicName, cat, summary, hero }) {
  const c = CATS[cat] || CATS.life;
  return `우리 반 메타버스 마을에 놓을 내 게임 부스 건물 한 채를 그려 줘. 게임 이름은 「${appName || topicName || '나의 게임'}」, 내용은 "${summary || topicName || ''}".
${PIXEL_STYLE}.
건물 모습: 게임 내용이 한눈에 보이도록 지붕과 장식을 꾸며 줘(예: 게임에 나오는 물건·${hero ? `주인공(${hero})` : '주인공'}의 상징을 지붕 장식으로). 기본은 ${c.look} 느낌. 가운데 둥근 문, 양쪽 작은 창문, 지붕 위 빈 간판 자리(글씨 없이 비워 두기).
${WHITE_BG}. ${NO_TEXT}. 정사각형 1:1.`;
}

export const BOOTH_IMAGE_SLOT = { key: 'booth', what: '내 부스 건물', title: '🏠 내 부스 건물', ratio: '1:1', clear: true, max: [320, 320] };
