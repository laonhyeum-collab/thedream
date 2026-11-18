// 공통 음악 엔진 (화면·소리와 상관없는 순수 계산)
// 모든 테마가 이 파일을 그대로 씁니다. 테마는 "어떤 재료가 어떤 악기인지"만 바꿉니다.
//
// 규칙
//  - 재료 크기 4단계 → 0.5박 / 1박 / 2박 / 4박
//  - 아래 줄(row 0)부터 위 줄로 순서대로 연주
//  - 같은 줄에 있는 재료는 동시에 시작
//  - 한 줄의 길이 = 그 줄에서 가장 긴 재료의 박자 → 끝나면 다음 줄 시작
//  - 빈 줄은 건너뜀

export const SIZES = [
  { level: 1, beats: 0.5, name: '아주 작음', short: '½박', scale: 0.52 },
  { level: 2, beats: 1, name: '작음', short: '1박', scale: 0.68 },
  { level: 3, beats: 2, name: '보통', short: '2박', scale: 0.84 },
  { level: 4, beats: 4, name: '큼', short: '4박', scale: 1 },
];
export const MIN_LEVEL = 1;
export const MAX_LEVEL = 4;
export const DEFAULT_LEVEL = 2;

export const DEFAULT_BPM = 100;
export const MIN_BPM = 60;
export const MAX_BPM = 160;
export const BEATS_PER_BAR = 4; // 4/4박자

export function sizeOf(level) {
  return SIZES[clampLevel(level) - 1];
}

export function beatsOf(level) {
  return sizeOf(level).beats;
}

export function clampLevel(level) {
  const n = Math.round(Number(level));
  if (!Number.isFinite(n)) return DEFAULT_LEVEL;
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, n));
}

// 자유롭게 늘리고 줄인 크기(0~1)를 네 단계 중 하나로 맞춥니다.
export function quantizeSize(amount) {
  const a = Math.min(1, Math.max(0, Number(amount) || 0));
  return Math.min(MAX_LEVEL, MIN_LEVEL + Math.floor(a * 4));
}

export function clampBpm(bpm) {
  const n = Math.round(Number(bpm));
  if (!Number.isFinite(n)) return DEFAULT_BPM;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, n));
}

export function beatSeconds(bpm) {
  return 60 / clampBpm(bpm);
}

// 배치된 재료 → 연주 계획
// items: [{ id, ing, row, col, size }]  (row 0 = 컵 맨 아래)
export function buildSchedule(items) {
  const rows = new Map();
  for (const it of items) {
    if (!rows.has(it.row)) rows.set(it.row, []);
    rows.get(it.row).push(it);
  }
  const rowKeys = [...rows.keys()].sort((a, b) => a - b);
  const groups = [];
  let start = 0;
  rowKeys.forEach((row, index) => {
    const members = rows.get(row)
      .slice()
      .sort((a, b) => a.col - b.col)
      .map((it) => ({ ...it, beats: beatsOf(it.size) }));
    const dur = Math.max(...members.map((m) => m.beats));
    groups.push({ index, order: index + 1, row, start, dur, items: members });
    start += dur;
  });
  return { groups, totalBeats: start };
}

// 지금(beat) 연주 중인 줄과 재료
export function activeAt(schedule, beat) {
  const ids = new Set();
  let group = null;
  for (const g of schedule.groups) {
    if (beat >= g.start && beat < g.start + g.dur) {
      group = g;
      for (const m of g.items) if (beat < g.start + m.beats) ids.add(m.id);
      break;
    }
  }
  return { group, ids };
}

// 줄 순서마다 바뀌는 화음 (C - G - Am - F, 많이 쓰는 밝은 진행)
// root = 베이스 음, tones = 화음 세 음 (MIDI 번호)
export const PROGRESSION = [
  { name: 'C', root: 36, tones: [60, 64, 67] },
  { name: 'G', root: 43, tones: [59, 62, 67] },
  { name: 'Am', root: 45, tones: [57, 60, 64] },
  { name: 'F', root: 41, tones: [57, 60, 65] },
];

export function chordFor(groupIndex) {
  const i = ((groupIndex % PROGRESSION.length) + PROGRESSION.length) % PROGRESSION.length;
  return PROGRESSION[i];
}

export function midiToFreq(m) {
  return 440 * 2 ** ((m - 69) / 12);
}
