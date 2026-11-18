// 음악 만들기 도전 미션 (조건 검사는 순수 함수라 시험하기 쉬워요)
import { beatsOf, buildSchedule } from './engine.js';
import { soundOf } from './themes.js';

// voices = 학생이 고른 재료별 악기 (없으면 기본 악기)
function instrumentOf(theme, ingId, voices) {
  return soundOf(theme, ingId, voices)?.instrument;
}

function instrumentsOf(theme, items, voices) {
  return items.map((it) => instrumentOf(theme, it.ing, voices)).filter(Boolean);
}

export const MISSIONS = [
  {
    id: 'drum3',
    stars: 1,
    title: '쿵쿵쿵! 드럼 세 번',
    goal: '드럼 소리가 나는 재료를 3개 이상 써 보세요.',
    hint: '어떤 재료가 드럼일까요? 왼쪽 재료를 눌러 소리를 들어 봐요.',
    check: (theme, items, voices) => instrumentsOf(theme, items, voices).filter((i) => i === 'drum').length >= 3,
  },
  {
    id: 'together',
    stars: 1,
    title: '함께 연주해요',
    goal: '두 가지 악기를 같은 높이에 놓아 동시에 연주해 보세요.',
    hint: '같은 줄에 서로 다른 악기 재료를 나란히 놓아요.',
    check: (theme, items, voices) => {
      const rows = new Map();
      for (const it of items) {
        const inst = instrumentOf(theme, it.ing, voices);
        if (!inst) continue;
        if (!rows.has(it.row)) rows.set(it.row, new Set());
        rows.get(it.row).add(inst);
      }
      return [...rows.values()].some((s) => s.size >= 2);
    },
  },
  {
    id: 'long-short',
    stars: 2,
    title: '길게, 짧게',
    goal: '4박(큰 재료)과 1박(작은 재료)을 모두 써 보세요.',
    hint: '재료를 누르고 오른쪽에서 크기를 바꿔요.',
    check: (_theme, items) => {
      const beats = new Set(items.map((it) => beatsOf(it.size)));
      return beats.has(4) && beats.has(1);
    },
  },
  {
    id: 'same-ing',
    stars: 2,
    title: '같은 재료, 다른 리듬',
    goal: '같은 재료를 크기만 다르게 해서 두 번 이상 써 보세요.',
    hint: '딸기 작게 하나, 딸기 크게 하나처럼요!',
    check: (_theme, items) => {
      const sizes = new Map();
      for (const it of items) {
        if (!sizes.has(it.ing)) sizes.set(it.ing, new Set());
        sizes.get(it.ing).add(it.size);
      }
      return [...sizes.values()].some((s) => s.size >= 2);
    },
  },
  {
    id: 'band4',
    stars: 2,
    title: '우리 밴드 결성!',
    goal: '서로 다른 악기 4가지 이상으로 음악을 만들어 보세요.',
    hint: '오른쪽 아래 "우리 밴드"에 불이 4개 이상 켜지면 성공!',
    check: (theme, items, voices) => new Set(instrumentsOf(theme, items, voices)).size >= 4,
  },
  {
    id: 'two-bars',
    stars: 3,
    title: '딱 맞는 두 마디',
    goal: '모두 합쳐 꼭 8박(4/4박자 두 마디)이 되는 음악을 만들어 보세요.',
    hint: '한 줄의 길이는 그 줄에서 가장 큰 재료의 박자예요. 위쪽 "전체 길이"를 보세요.',
    check: (_theme, items) => items.length > 0 && buildSchedule(items).totalBeats === 8,
  },
  {
    id: 'tower',
    stars: 3,
    title: '높이높이 빙수 탑',
    goal: '6층 이상 쌓고, 그중 두 층 이상은 여러 악기가 함께 연주하게 해 보세요.',
    hint: '아래에서 위로 차곡차곡! 같은 줄에 나란히 놓으면 함께 연주해요.',
    check: (_theme, items) => {
      const { groups } = buildSchedule(items);
      return groups.length >= 6 && groups.filter((g) => g.items.length >= 2).length >= 2;
    },
  },
];

export function getMission(id) {
  return MISSIONS.find((m) => m.id === id) || null;
}

export function checkMission(mission, theme, items, voices = {}) {
  return Boolean(mission && mission.check(theme, items, voices));
}
