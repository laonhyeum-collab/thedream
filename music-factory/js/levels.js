// 단계별 도전: 기본부터 한 단계씩 (1~5단계). 빙수(밴드) 무대에서 해요.
// 단계마다 목표가 있고, 조건을 채운 다음 ▶️ 끝까지 들으면 통과! 앞 단계를 통과해야 다음 단계가 열려요.
// 5단계까지 다 통과하면 🎲 랜덤 조합 도전과 ✍️ 가사 쓰기가 열려요.
// 조건 검사는 순수 함수라 시험하기 쉬워요 (missions.js 의 미션과 모양이 같아요).
import { beatsOf, buildSchedule } from './engine.js';
import { soundOf } from './themes.js';

export const STAGE_THEME = 'bingsu';
export const STAGE_COUNT = 5;

const instOf = (theme, ingId, voices) => soundOf(theme, ingId, voices)?.instrument;
const RHYTHM = new Set(['drum', 'snare']);
const MELODY = new Set(['keys', 'guitar']);

// 줄마다 어떤 악기가 있는지
function rowInstruments(theme, items, voices) {
  const rows = new Map();
  for (const it of items) {
    const inst = instOf(theme, it.ing, voices);
    if (!inst) continue;
    if (!rows.has(it.row)) rows.set(it.row, new Set());
    rows.get(it.row).add(inst);
  }
  return rows;
}

export const STAGES = [
  {
    level: 1,
    emoji: '🥁',
    title: '쿵쿵! 박자 지키기',
    learn: '일정한 박',
    goal: '드럼 하나로만, 4층 이상 같은 크기로 쌓아 일정한 박자를 만들어요.',
    hint: '🧊 얼음(드럼)을 한 층에 하나씩 4층! 크기는 모두 똑같이요.',
    check(theme, items, voices) {
      if (items.length < 4) return false;
      if (!items.every((it) => instOf(theme, it.ing, voices) === 'drum')) return false;
      const rows = new Set(items.map((it) => it.row));
      const sizes = new Set(items.map((it) => it.size));
      return rows.size >= 4 && sizes.size === 1;
    },
  },
  {
    level: 2,
    emoji: '🎸',
    title: '두 악기가 함께',
    learn: '소리 겹치기',
    goal: '드럼 박자 위에 베이스를 얹어요. 드럼과 베이스가 같은 층에서 함께 연주하는 층을 2개 이상 만들어요.',
    hint: '🧊 얼음 옆에 🫘 팥(베이스)을 나란히! 같은 층이면 동시에 연주해요.',
    check(theme, items, voices) {
      const rows = [...rowInstruments(theme, items, voices).values()];
      return rows.filter((s) => s.has('drum') && s.has('bass')).length >= 2;
    },
  },
  {
    level: 3,
    emoji: '🎵',
    title: '나만의 리듬 만들기',
    learn: '길고 짧은 소리',
    goal: '짧은 소리(½박·1박)와 긴 소리(2박·4박)를 섞어 3층 이상, 전체 길이가 꼭 8박(두 마디)이 되게 해요.',
    hint: '위쪽 "전체 길이"를 보며 맞춰요. 한 층의 길이는 그 층에서 가장 큰 재료만큼이에요.',
    check(_theme, items) {
      if (!items.length) return false;
      const { groups, totalBeats } = buildSchedule(items);
      const beats = items.map((it) => beatsOf(it.size));
      return totalBeats === 8 && groups.length >= 3 && beats.some((b) => b <= 1) && beats.some((b) => b >= 2);
    },
  },
  {
    level: 4,
    emoji: '🎹',
    title: '멜로디와 화음',
    learn: '화음 쌓기',
    goal: '베이스와 멜로디 악기(키보드나 기타)를 같은 층에 놓아 화음을 만들고, 드럼이나 스네어로 박자도 넣어요.',
    hint: '🫘 팥 옆에 🥭 망고나 🍌 바나나(키보드), 🍓 딸기(기타)를 나란히!',
    check(theme, items, voices) {
      const rows = [...rowInstruments(theme, items, voices).values()];
      const harmony = rows.some((s) => s.has('bass') && [...s].some((i) => MELODY.has(i)));
      const beat = rows.some((s) => [...s].some((i) => RHYTHM.has(i)));
      return harmony && beat;
    },
  },
  {
    level: 5,
    emoji: '🌟',
    title: '나만의 편곡 완성',
    learn: '악기 배치(편곡)',
    goal: '리듬(드럼·스네어), 베이스, 멜로디(키보드·기타)를 모두 넣고 4층 이상, 악기 4가지 이상! 맨 위층은 심벌즈나 신시사이저로 멋지게 마무리해요.',
    hint: '맨 위층에 🥣 시리얼(심벌즈)이나 🍨 아이스크림·🍬 젤리(신시사이저)를 놓아요.',
    check(theme, items, voices) {
      if (!items.length) return false;
      const insts = new Set(items.map((it) => instOf(theme, it.ing, voices)).filter(Boolean));
      const has = (set) => [...insts].some((i) => set.has(i));
      const { groups } = buildSchedule(items);
      const top = groups[groups.length - 1];
      const ending = top.items.some((m) => ['cymbal', 'synth'].includes(instOf(theme, m.ing, voices)));
      return groups.length >= 4 && insts.size >= 4 && has(RHYTHM) && insts.has('bass') && has(MELODY) && ending;
    },
  },
].map((s) => ({ ...s, id: `level${s.level}`, stars: Math.min(3, Math.ceil(s.level / 2)) }));

export function getStage(level) {
  return STAGES.find((s) => s.level === Number(level)) || null;
}

export function checkStage(stage, theme, items, voices = {}) {
  return Boolean(stage && stage.check(theme, items, voices));
}

// cleared = 통과한 단계 번호 모음 (Set)
export function isStageUnlocked(level, cleared) {
  const n = Number(level);
  if (!(n >= 1 && n <= STAGE_COUNT)) return false;
  return n === 1 || cleared.has(n - 1);
}

// 지금 도전할 단계 (다 통과했으면 null)
export function currentStage(cleared) {
  for (const s of STAGES) if (!cleared.has(s.level)) return isStageUnlocked(s.level, cleared) ? s : null;
  return null;
}

// 5단계까지 다 통과했나요? → 랜덤 조합 도전과 가사 쓰기가 열려요
export function allStagesCleared(cleared) {
  return STAGES.every((s) => cleared.has(s.level));
}

// 저장된 값 정리: 1~5 사이 번호만, 앞 단계가 없으면 뒤 단계도 인정하지 않아요
export function normalizeCleared(raw) {
  const nums = new Set((Array.isArray(raw) ? raw : []).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= STAGE_COUNT));
  const out = new Set();
  for (let n = 1; n <= STAGE_COUNT && nums.has(n); n++) out.add(n);
  return out;
}
