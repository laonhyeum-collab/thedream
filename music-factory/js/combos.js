// 🎲 랜덤 조합 도전 (5단계를 모두 통과하면 열려요)
// 반주 악기 하나가 화음을 깔아 주고(피아노·거문고·오르골…), 그 위에 다른 악단의 악기를 쌓아요.
// 반주와 쌓는 악기는 같은 화음 흐름(조)과 같은 빠르기로 연주해서 어떻게 쌓아도 잘 어울려요.
import { PROGRESSIONS, MIN_BPM, MAX_BPM, buildSchedule } from './engine.js';
import { INSTRUMENTS, voiceInfo, registerThemes, soundOf } from './themes.js';

// backing = 반주 소리, layers = 쌓을 수 있는 악기 소리, progression = 화음 흐름(모두 C 를 중심으로)
export const COMBOS = [
  {
    id: 'pianoBand', name: '피아노 + 밴드', emoji: '🎹🎸', backing: 'keysSoft', backingName: '피아노',
    progression: 'pop', bpm: 100, ensemble: 'band',
    layers: ['drum', 'snare', 'bass', 'guitarClean', 'keysBright', 'cymbal'],
    about: '부드러운 피아노 화음 위에 신나는 밴드 소리를 쌓아요.',
  },
  {
    id: 'geomungoOrchestra', name: '거문고 + 오케스트라', emoji: '🪕🎻', backing: 'geomungo', backingName: '거문고',
    progression: 'gugak', bpm: 84, ensemble: 'orchestra',
    layers: ['timpani', 'cello', 'violin', 'flute', 'harp', 'triangle'],
    about: '우리 악기 거문고가 5음(도 레 미 솔 라)으로 반주하고, 오케스트라가 함께해요.',
  },
  {
    id: 'musicboxStrings', name: '오르골 + 현악기', emoji: '🎁🎻', backing: 'musicBox', backingName: '오르골',
    progression: 'classical', bpm: 88, ensemble: 'orchestra',
    layers: ['cello', 'violin', 'harp', 'flute', 'celesta', 'triangle'],
    about: '똘랑똘랑 오르골 위에 첼로와 바이올린이 포근하게 노래해요.',
  },
  {
    id: 'gayageumGugak', name: '가야금 + 국악 장단', emoji: '🪕🥁', backing: 'gayageum', backingName: '가야금',
    progression: 'gugak', bpm: 90, ensemble: 'gugak',
    layers: ['buk', 'janggu', 'jing', 'daegeum', 'haegeum', 'kkwaenggwari'],
    about: '가야금 가락 위에 장구·북 장단과 대금·해금을 얹어 우리 음악을 만들어요.',
  },
  {
    id: 'pianoJazz', name: '피아노 + 재즈', emoji: '🎹🎷', backing: 'piano', backingName: '재즈 피아노',
    progression: 'jazz', bpm: 96, ensemble: 'jazz',
    layers: ['brushDrum', 'snap', 'doubleBass', 'vibraphone', 'saxophone', 'muteTrumpet'],
    about: '엇박으로 콕콕 치는 재즈 피아노에 색소폰과 콘트라베이스를 더해요.',
  },
  {
    id: 'pianoPercussion', name: '피아노 + 타악기', emoji: '🎹🪘', backing: 'keysSoft', backingName: '피아노',
    progression: 'pop', bpm: 104, ensemble: 'percussion',
    layers: ['cajon', 'bongo', 'conga', 'maracas', 'tambourine', 'woodblock'],
    about: '피아노 화음에 세계의 타악기로 신나는 리듬을 입혀요.',
  },
  {
    id: 'harpSpace', name: '하프 + 우주 전자음', emoji: '🪕🚀', backing: 'harp', backingName: '하프',
    progression: 'space', bpm: 110, ensemble: 'electronic',
    layers: ['edmKick', 'hatRoll', 'arp', 'spacePad', 'lead', 'subDrop'],
    about: '물결 같은 하프 위에 반짝이는 우주 소리를 쌓아요.',
  },
  {
    id: 'pianoOrchestra', name: '피아노 + 오케스트라', emoji: '🎹🎺', backing: 'keysSoft', backingName: '피아노',
    progression: 'classical', bpm: 92, ensemble: 'orchestra',
    layers: ['timpani', 'cello', 'violin', 'horn', 'flute', 'trumpet'],
    about: '피아노 반주에 맞춰 오케스트라 악기가 하나씩 들어와요.',
  },
];

export const comboThemeId = (comboId) => `combo-${comboId}`;

// 조합 → 창작 화면에서 쓸 수 있는 테마 (재료 = 악기)
function toTheme(c) {
  const backingInst = voiceInfo(c.backing).instrument;
  return {
    id: comboThemeId(c.id),
    combo: c.id,
    name: c.name,
    emoji: c.emoji,
    method: '랜덤 조합',
    learn: '반주와 어울림',
    ensemble: c.ensemble,
    progression: c.progression,
    backing: c.backing,
    backingName: c.backingName,
    bpm: c.bpm,
    container: '무대',
    hint: `${c.backingName} 반주 위에 악기를 쌓아요! ${c.about}`,
    rows: 6,
    cols: 3,
    cssClass: 'combo',
    cssShape: { top: 6, bottom: 6, topInset: 8, bottomInset: 8 },
    defaultTitle: `나의 ${c.name}`,
    noImages: true,
    bandName: c.name,
    bandInstruments: [backingInst, ...new Set(c.layers.map((v) => voiceInfo(v).instrument))],
    ingredients: c.layers.map((v) => {
      const info = voiceInfo(v);
      const inst = INSTRUMENTS[info.instrument];
      return { id: v, name: inst.name, emoji: inst.emoji, color: inst.color, voice: v, instrument: info.instrument, sound: info.sound };
    }),
  };
}

export const COMBO_THEMES = COMBOS.map(toTheme);
registerThemes(COMBO_THEMES); // 저장한 조합 작품도 보관함에서 다시 열 수 있게

export function getCombo(id) {
  return COMBOS.find((c) => c.id === id) || null;
}

export function comboTheme(id) {
  return COMBO_THEMES.find((t) => t.combo === id) || null;
}

// 랜덤으로 조합 하나 (방금 한 조합은 빼고). rng 를 넘기면 시험에서 결과를 정할 수 있어요.
export function pickCombo(rng = Math.random, exceptId = null) {
  const pool = COMBOS.length > 1 ? COMBOS.filter((c) => c.id !== exceptId) : COMBOS;
  const r = Number(rng());
  const i = Math.min(pool.length - 1, Math.max(0, Math.floor((Number.isFinite(r) ? r : 0) * pool.length)));
  return pool[i];
}

// 반주만 들어 보기: 화음 4개를 4박씩 (반주 소리로)
export function backingPreviewItems(combo) {
  return [0, 1, 2, 3].map((row) => ({ id: `bk${row}`, ing: combo.layers[0], voice: combo.backing, row, col: 0, size: 4 }));
}

// 조합 도전의 목표 (미션과 같은 모양)
export function comboChallenge(combo) {
  return {
    id: `combo:${combo.id}`,
    combo: combo.id,
    stars: 3,
    title: `🎲 ${combo.name}`,
    goal: `${combo.backingName} 반주 위에 서로 다른 악기 3가지 이상을 3층 이상 쌓고, 한 층에는 악기 2개를 함께 놓아요.`,
    hint: '🎹 "반주 듣기"로 먼저 들어 보고, 반주에 어울리게 쌓아요.',
    check(theme, items, voices) {
      if (!items.length) return false;
      const insts = new Set(items.map((it) => soundOf(theme, it.ing, voices)?.instrument).filter(Boolean));
      const { groups } = buildSchedule(items);
      return insts.size >= 3 && groups.length >= 3 && groups.some((g) => g.items.length >= 2);
    },
  };
}

// 조합이 듣기 좋게 맞춰져 있는지 (시험용): 화음 흐름이 있고, 빠르기가 범위 안이고, 반주는 쌓는 악기와 겹치지 않아요
export function comboIsValid(c) {
  return Boolean(PROGRESSIONS[c.progression]) && c.bpm >= MIN_BPM && c.bpm <= MAX_BPM
    && Boolean(voiceInfo(c.backing)) && c.layers.every((v) => voiceInfo(v)) && !c.layers.includes(c.backing)
    && new Set(c.layers).size === c.layers.length;
}
