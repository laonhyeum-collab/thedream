// 노래 따라 만들기: 제시된 노래를 듣고(또는 악보를 보고) 컵에 똑같이 쌓아 연주해요.
// 비교는 "소리" 기준이에요: 층마다 어떤 악기 소리가 몇 박으로 나는지가 같으면 맞아요.
// (재료 자리의 왼쪽/오른쪽, 빈 층, 학생이 바꾼 악기로 같은 소리를 낸 것은 상관없어요)
import { buildSchedule, beatsOf } from './engine.js';
import { soundOf } from './themes.js';

// steps: 아래층부터 [재료, 크기 단계] 목록. 크기 단계 1=½박 2=1박 3=2박 4=4박
// 노래는 모두 이 앱을 위해 새로 지은 짧은 곡이에요.
export const SONGS = [
  {
    id: 'first-step', stars: 1, theme: 'bingsu', bpm: 100,
    title: '쿵짝 첫걸음', desc: '드럼과 스네어가 번갈아 나와요. 두 마디 리듬!',
    steps: [[['ice', 3]], [['tteok', 3]], [['ice', 3]], [['tteok', 3]]],
  },
  {
    id: 'berry-march', stars: 1, theme: 'bingsu', bpm: 110,
    title: '딸기 망고 행진', desc: '드럼으로 시작해서 기타, 키보드, 신시사이저가 차례로 나와요.',
    steps: [[['ice', 3]], [['strawberry', 2]], [['mango', 2]], [['icecream', 3]]],
  },
  {
    id: 'all-together', stars: 2, theme: 'bingsu', bpm: 100,
    title: '다 같이 쿵!', desc: '두 악기가 함께 연주하는 층이 있어요. 잘 들어 봐요.',
    steps: [[['ice', 2], ['redbean', 2]], [['strawberry', 2]], [['ice', 2], ['redbean', 2]], [['mango', 3], ['cereal', 1]]],
  },
  {
    id: 'jelly-dance', stars: 2, theme: 'bingsu', bpm: 120,
    title: '젤리 댄스', desc: '짧은 소리와 긴 소리가 섞여 있어요. 길이를 잘 들어 봐요.',
    steps: [[['jelly', 1]], [['jelly', 1]], [['ice', 2], ['jelly', 2]], [['cereal', 1]], [['banana', 3]]],
  },
  {
    id: 'choco-rock', stars: 3, theme: 'bingsu', bpm: 130,
    title: '초코 록 밴드', desc: '세 악기가 한꺼번에 울리는 층도 있어요!',
    steps: [[['ice', 3], ['chocolate', 3]], [['tteok', 1]], [['tteok', 1]], [['chocolate', 3], ['redbean', 3], ['cereal', 2]], [['icecream', 4]]],
  },
  {
    id: 'lullaby', stars: 3, theme: 'bingsu', bpm: 80,
    title: '아이스크림 자장가', desc: '느리고 부드러운 노래예요. 낮은 소리도 숨어 있어요.',
    steps: [[['banana', 4]], [['mango', 2], ['redbean', 2]], [['banana', 3]], [['icecream', 4], ['redbean', 4]]],
  },
];

// 보여 주는 정도: 1 = 악보 보고(재료·박자), 2 = 악기만 보고, 3 = 귀로만
export const LEVELS = [
  { level: 1, name: '악보 보고', icon: '👀', desc: '재료와 박자가 다 보여요' },
  { level: 2, name: '악기만 보고', icon: '🎸', desc: '악기만 보여요. 길이는 들어서!' },
  { level: 3, name: '귀로만', icon: '👂', desc: '몇 층인지만 알려 줘요' },
];

export function getSong(id) {
  return SONGS.find((s) => s.id === id) || null;
}

// 노래 → 컵에 놓인 재료 모양 (정답 연주에 써요)
export function songItems(song, theme) {
  const items = [];
  song.steps.forEach((step, row) => {
    step.forEach(([ing, size], col) => {
      items.push({ id: `song-${row}-${col}`, ing, row, col, size, voice: soundOf(theme, ing).voice });
    });
  });
  return items;
}

export function songBeats(song) {
  return song.steps.reduce((sum, step) => sum + Math.max(...step.map(([, size]) => beatsOf(size))), 0);
}

function soundsOfGroup(group, theme, voices) {
  return group.items
    .map((m) => ({ voice: m.voice || soundOf(theme, m.ing, voices).voice, beats: m.beats }))
    .sort((a, b) => (a.voice < b.voice ? -1 : a.voice > b.voice ? 1 : a.beats - b.beats));
}

function sameList(a, b, key) {
  return a.length === b.length && a.every((x, i) => key(x) === key(b[i]));
}

// 내 컵과 노래를 층마다 비교해요.
// 결과 reason: ok | missing(아직 없음) | instrument(악기가 다름) | length(길이가 다름) | extra(정답보다 많음)
export function compareToSong(song, theme, items, voices = {}) {
  const target = buildSchedule(songItems(song, theme)).groups;
  const mine = buildSchedule(items).groups;
  const steps = [];
  const n = Math.max(target.length, mine.length);
  for (let i = 0; i < n; i++) {
    const t = target[i];
    const m = mine[i];
    if (!m) { steps.push({ index: i, ok: false, reason: 'missing' }); continue; }
    if (!t) { steps.push({ index: i, ok: false, reason: 'extra' }); continue; }
    const ts = soundsOfGroup(t, theme, {});
    const ms = soundsOfGroup(m, theme, voices);
    if (sameList(ts, ms, (x) => `${x.voice}:${x.beats}`)) { steps.push({ index: i, ok: true, reason: 'ok' }); continue; }
    if (sameList(ts, ms, (x) => x.voice)) {
      // 악기는 맞고 길이만 달라요: 더 길게/더 짧게 알려 줘요
      const longer = ts.reduce((s, x) => s + x.beats, 0) > ms.reduce((s, x) => s + x.beats, 0);
      steps.push({ index: i, ok: false, reason: 'length', hint: longer ? 'longer' : 'shorter' });
      continue;
    }
    steps.push({ index: i, ok: false, reason: 'instrument', countDiff: ts.length - ms.length });
  }
  const correct = steps.filter((s) => s.ok).length;
  return { steps, correct, total: target.length, allOk: steps.length === target.length && steps.every((s) => s.ok) };
}
