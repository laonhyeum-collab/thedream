// ✍️ 가사 도우미: 아이가 주제(와 내용)를 말하면, 지금 만든 음악에 맞는 가사를 2~3개 제안해요.
// - 이 기기 안에서만 만들어요. 인터넷·AI 서비스를 부르지 않아요 (단어 꾸러미 + 끝소리 맞추기 + 틀).
// - 음악에 맞추기: 컵에 쌓은 박자 수 → 몇 줄, 빠르기 → 한 줄에 몇 글자(=몇 음절), 악단·빠르기 → 느낌(단어·추임새).
// - 아이가 쓴 주제·내용은 가사 교육용 체크(lyrics.js)로 먼저 검사하고, 만든 가사도 한 번 더 검사해요.
// - 같은 주제 + 같은 씨앗(seed)이면 언제나 같은 가사가 나와요. 「다른 가사 보기」는 씨앗만 바꿔요.
// 모두 순수 함수라 시험하기 쉬워요.
import { buildSchedule, clampBpm, BEATS_PER_BAR, DEFAULT_BPM } from './engine.js';
import { checkLyrics, safetyIssue, lyricsMessage, tidyLyrics, LYRICS_MAX_LINES } from './lyrics.js';

export const TOPIC_MAX = 20; // 주제 입력 글자 수
export const CONTENT_MAX = 30; // 내용 입력 글자 수
export const MIN_SYLLABLES = 5;
export const MAX_SYLLABLES = 10;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// ---------- 음절(글자) 세기 ----------
// 한글은 한 글자 = 한 음절, 숫자는 한 개 = 한 음절, 영어는 모음 묶음마다 한 음절로 어림해요.
export function countSyllables(text) {
  const s = String(text ?? '');
  let n = (s.match(/[가-힣]/g) || []).length;
  n += (s.match(/[0-9]/g) || []).length;
  for (const w of s.match(/[a-z]+/gi) || []) n += Math.max(1, (w.match(/[aeiouy]+/gi) || []).length);
  return n;
}

// ---------- 음악 모양 읽기 ----------
// 느낌: 악단의 화음 흐름(국악·재즈·우주)이 먼저, 나머지는 빠르기로 정해요.
export const MOODS = {
  excited: {
    name: '신나는', emoji: '⚡',
    adj: ['신나는', '씩씩한', '힘찬'], adv: ['쿵짝쿵짝', '폴짝폴짝', '팡팡팡'],
    fill2: ['야호', '랄라', '짝짝'], fill1: ['쿵', '짝', '라'],
    endings: { yo: ['신나요', '뛰어요', '춤춰요', '놀아요', '웃어요', '노래해요'], ja: ['놀자', '가자', '뛰자', '춤추자', '노래하자', '달려가자'] },
  },
  happy: {
    name: '즐거운', emoji: '😊',
    adj: ['즐거운', '귀여운', '반가운'], adv: ['룰루랄라', '방긋방긋', '깡충깡충'],
    fill2: ['랄라', '룰루', '라라'], fill1: ['라', '룰', '랄'],
    endings: { yo: ['좋아요', '웃어요', '놀아요', '노래해요', '반가워요', '신나요'], ja: ['놀자', '웃자', '손잡자', '노래하자', '함께하자'], ne: ['웃네', '좋네', '신나네', '노래하네', '반갑네'] },
  },
  calm: {
    name: '잔잔한', emoji: '🌙',
    adj: ['포근한', '다정한', '고운'], adv: ['살랑살랑', '사르르', '도란도란'],
    fill2: ['음음', '라라', '랄라'], fill1: ['음', '라', '아'],
    endings: { yo: ['좋아요', '꿈꿔요', '웃어요', '빛나요', '노래해요', '속삭여요'], ne: ['빛나네', '웃네', '좋네', '노래하네', '반짝이네'] },
  },
  gugak: {
    name: '흥겨운 우리 가락', emoji: '🥁',
    adj: ['흥겨운', '어여쁜', '정다운'], adv: ['덩실덩실', '얼씨구나', '둥기둥기'],
    fill2: ['얼쑤', '좋다', '덩덕'], fill1: ['쿵', '덩', '얼'],
    endings: { se: ['노세', '놀아 보세', '춤춰 보세', '노래하세', '웃어 보세'], ne: ['좋네', '신나네', '흥겹네', '노래하네', '웃네'], ja: ['놀자', '가자', '춤추자', '노래하자'] },
  },
  jazz: {
    name: '멋진 스윙', emoji: '🎷',
    adj: ['멋쟁이', '근사한', '느긋한'], adv: ['흔들흔들', '까딱까딱', '스윙스윙'],
    fill2: ['두비', '샤바', '두밥'], fill1: ['둡', '밥', '와'],
    endings: { yo: ['좋아요', '춤춰요', '노래해요', '웃어요', '흔들어요'], ne: ['좋네', '멋지네', '신나네', '노래하네', '흔드네'] },
  },
  space: {
    name: '신비로운 우주', emoji: '🚀',
    adj: ['신비한', '반짝이는', '두근대는'], adv: ['둥실둥실', '반짝반짝', '두근두근'],
    fill2: ['삐뽀', '우웅', '뾰롱'], fill1: ['삐', '웅', '퓽'],
    endings: { yo: ['날아요', '빛나요', '꿈꿔요', '떠나요', '반짝여요', '노래해요'], ja: ['가자', '날자', '떠나자', '날아가자'], ne: ['빛나네', '반짝이네', '떠오르네', '신비롭네'] },
  },
};

export function moodOf(progression, bpm) {
  if (progression === 'gugak') return 'gugak';
  if (progression === 'jazz') return 'jazz';
  if (progression === 'space') return 'space';
  const b = clampBpm(bpm);
  if (b >= 120) return 'excited';
  if (b <= 85) return 'calm';
  return 'happy';
}

// items(컵에 쌓은 재료) · bpm · progression(악단 화음 흐름) → { lines, syllables, mood, ... }
// - 줄 수: 4박(한 마디)마다 한 줄, 2~4줄. 컵이 비어 있으면 4마디 노래로 생각해요.
// - 한 줄 글자 수: 한 줄의 박자 × 한 박에 부를 글자 수. 느린 노래는 한 박에 2글자, 빠른 노래는 1글자쯤.
export function musicShape({ items = [], bpm = DEFAULT_BPM, progression = 'pop' } = {}) {
  const b = clampBpm(bpm);
  const total = Array.isArray(items) && items.length ? buildSchedule(items).totalBeats : 0;
  const lines = total ? clamp(Math.round(total / BEATS_PER_BAR), 2, LYRICS_MAX_LINES) : LYRICS_MAX_LINES;
  const lineBeats = total ? total / lines : BEATS_PER_BAR;
  const perBeat = clamp(150 / b, 1, 2);
  const syllables = clamp(Math.round(lineBeats * perBeat), MIN_SYLLABLES, MAX_SYLLABLES);
  const mood = moodOf(progression, b);
  return { lines, syllables, lineBeats, totalBeats: total, bpm: b, mood, moodName: MOODS[mood].name, moodEmoji: MOODS[mood].emoji };
}

// ---------- 단어 꾸러미 ----------
const THEME_WORDS = {
  bingsu: ['빙수', '얼음', '딸기', '망고'],
  pizza: ['피자', '치즈', '토마토'],
  burger: ['햄버거', '치즈', '토마토'],
  cake: ['케이크', '촛불', '생일', '딸기'],
  icecream: ['콘', '바닐라', '딸기맛'],
  animals: ['호랑이', '토끼', '다람쥐', '거북이'],
  space: ['별', '로켓', '달님', '우주'],
};
const COMMON_WORDS = ['노래', '친구', '햇살', '하늘', '바람', '웃음', '무지개', '꿈'];

// 주제가 들어가는 줄 (첫 줄은 꼭 이 중에서). {T} 주제, {T랑}/{T와}/{T야}/{T도} 받침에 맞춘 조사
const TOPIC_BODIES = ['{T}', '{T랑}', '{T와} 함께', '{T야}', '{adj} {T}', '{adj} {T랑}', '{adv} {T랑}', '{T} 생각에', '{K도} {T도}', '{adv} {T와} 함께', '우리 같이 {T랑}'];
// 내용·느낌이 들어가는 줄
const OTHER_BODIES = ['{K도}', '{K} 가득', '{K도} 좋아서', '{K랑} 함께', '두근두근 {K}', '{adv}', '{adv} 다 함께', '다 함께', '오늘도', '하루 종일', '친구들과 함께', '{adj} {K}'];
const PATTERNS = { 2: ['AA', 'AB'], 3: ['AAA', 'ABA', 'AAB'], 4: ['AABB', 'ABAB', 'AAAA'] };

function hasBatchim(word) {
  const c = word.charCodeAt(word.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
}
const JOSA = { 랑: ['이랑', '랑'], 와: ['과', '와'], 야: ['아', '야'], 도: ['도', '도'] };
function withJosa(word, j) {
  const [b, n] = JOSA[j];
  return word + (hasBatchim(word) ? b : n);
}

// 아이가 쓴 주제 정리: 한글·영어·숫자만, "~노래", "~에 대한" 같은 꼬리는 빼요.
export function cleanTopic(raw) {
  let t = tidyLyrics(raw).replace(/\n/g, ' ').replace(/[^가-힣a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/\s*(에\s*대한|에\s*대해서?|에\s*관한)?\s*(노래|가사|이야기|얘기)$/, '').replace(/\s*(에\s*대한|에\s*대해서?|에\s*관한)$/, '').trim();
  const words = t.split(' ').filter(Boolean).slice(0, 3);
  let out = '';
  for (const w of words) {
    const next = out ? `${out} ${w}` : w;
    if (countSyllables(next) > 8) break;
    out = next;
  }
  if (!out && words[0]) out = [...words[0]].slice(0, 6).join('');
  return out;
}

// 내용 낱말: 쉼표·띄어쓰기로 나눠서 3개까지
export function cleanKeywords(raw, topic = '') {
  const tw = new Set(topic.split(' '));
  const out = [];
  for (const w of tidyLyrics(raw).replace(/[^가-힣a-zA-Z0-9]+/g, ' ').split(' ')) {
    if (!w || tw.has(w) || out.includes(w) || countSyllables(w) > 5) continue;
    out.push(w);
    if (out.length === 3) break;
  }
  return out;
}

// ---------- 씨앗이 같으면 같은 결과가 나오는 주사위 ----------
function hashStr(s) {
  let h = 2166136261;
  for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function fillBody(body, { topic, keyword, mood }) {
  return body
    .replace(/\{T(랑|와|야|도)\}/g, (_, j) => withJosa(topic, j))
    .replace(/\{T\}/g, topic)
    .replace(/\{K(랑|와|야|도)\}/g, (_, j) => withJosa(keyword.word, j))
    .replace(/\{K\}/g, keyword.word)
    .replace(/\{adj\}/g, mood.adjWord)
    .replace(/\{adv\}/g, mood.advWord);
}

// 모자란 글자는 앞에 추임새(랄라·얼쑤…)를 넣어 꼭 맞춰요
function padding(rng, mood, n) {
  const out = [];
  const twos = shuffle(rng, mood.fill2);
  let i = 0;
  while (n >= 2) { out.push(twos[i++ % twos.length]); n -= 2; }
  if (n === 1) out.push(pick(rng, mood.fill1));
  return out.join(' ');
}

// 한 줄 만들기: 글자 수가 정확히 target 이 되게.
// 끝말(요·자·네·세)을 먼저 고르고, 남은 자리에 맞는 틀을 넣고, 그래도 모자라면 앞에 추임새를 넣어요.
// 첫 줄에는 꼭 주제가 들어가요 (주제가 길면 주제의 마지막 낱말만, 그래도 길면 끝말 없이 주제만).
function makeLine(rng, { target, family, used, topicLine, keywordLine, ctx }) {
  const local = { ...ctx, keyword: pick(rng, ctx.keywords), mood: { ...ctx.mood, adjWord: pick(rng, ctx.mood.adj), advWord: pick(rng, ctx.mood.adv) } };
  const endings = shuffle(rng, ctx.mood.endings[family]);
  const fresh = endings.filter((e) => !used.has(e));
  const order = [...(fresh.length ? fresh : endings)];
  const bodiesFor = (bodies, topic, ending) => {
    const room = target - countSyllables(ending);
    const stem = ending.slice(0, 2);
    return bodies
      .map((b) => fillBody(b, { ...local, topic }))
      .filter((b) => countSyllables(b) <= room && !used.has(b) && !(stem && b.includes(stem))); // "좋아서 좋아요" 같은 겹침은 빼요
  };
  let ending = null;
  let cands = [];
  let done = false;
  const tryAll = (bodies, topic, endingList) => {
    for (const e of endingList) {
      const c = bodiesFor(bodies, topic, e);
      if (c.length) { ending = e; cands = c; return true; }
    }
    return false;
  };
  if (topicLine) {
    // 주제 전체 + 끝말 → 마지막 낱말 + 끝말 → 주제 전체만 → 마지막 낱말만
    ctx.topics.some((t) => tryAll(TOPIC_BODIES, t, order)) || ctx.topics.some((t) => tryAll(['{T}'], t, ['']));
  } else {
    const last = ctx.topics[ctx.topics.length - 1];
    // 아이가 내용을 썼으면 그 낱말이 들어가는 틀부터 (예: "산책도 좋아서")
    const kBodies = OTHER_BODIES.filter((b) => b.includes('{K'));
    done = keywordLine && shuffle(rng, ctx.keywords).some((k) => { local.keyword = k; return tryAll(kBodies, last, order) || tryAll(kBodies, last, endings); });
    if (!done) local.keyword = pick(rng, ctx.keywords);
    const first = rng() < 0.4 ? TOPIC_BODIES : OTHER_BODIES;
    if (!done && !tryAll(first, last, order)) tryAll(OTHER_BODIES, last, order);
  }
  if (ending === null) ending = order.find((e) => countSyllables(e) <= target) || '';
  let body = '';
  const room = target - countSyllables(ending);
  if (cands.length) {
    // 추임새가 너무 많지 않게, 글자 수에 가장 가까운 틀을 먼저 골라요
    const minPad = Math.min(...cands.map((b) => room - countSyllables(b)));
    body = pick(rng, cands.filter((b) => room - countSyllables(b) <= minPad + 1));
    used.add(body);
  }
  if (ending) used.add(ending);
  const pad = padding(rng, ctx.mood, room - countSyllables(body));
  return { text: [pad, body, ending].filter(Boolean).join(' '), ending, keyword: Boolean(keywordLine && done) };
}

// 가사 제안 만들기
// 결과: { ok, reason, message, topic, keywords, shape, suggestions: [{ lines, text, rhyme(줄 끝소리, 예: 요-요-자-자) }] }
export function suggestLyrics({ topic = '', content = '', shape = musicShape(), seed = 1, count = 3, themeId = '' } = {}) {
  const fail = (reason, message) => ({ ok: false, reason, message, topic: '', keywords: [], shape, suggestions: [] });
  const rawTopic = String(topic ?? '');
  const rawContent = String(content ?? '');
  // 먼저 아이가 쓴 그대로 교육용 체크 (자르기 전에 검사해서 숨은 전화번호 등도 막아요)
  const issue = safetyIssue(`${rawTopic}\n${rawContent}`);
  if (issue) return fail(issue, lyricsMessage(issue));
  const t = cleanTopic(rawTopic);
  if (!t) return fail('emptyTopic', '💡 무엇에 대한 노래인지 주제를 먼저 써 주세요. 예) 우리 강아지, 겨울 눈사람');
  const words = t.split(' ');
  const topics = words.length > 1 ? [t, words[words.length - 1]] : [t];
  const given = cleanKeywords(rawContent, t);
  const bank = [...(THEME_WORDS[themeId] || []), ...COMMON_WORDS].filter((w) => !words.includes(w));
  const mood = MOODS[shape.mood] || MOODS.happy;
  const families = Object.keys(mood.endings);
  const rng = makeRng(hashStr(`${t}|${given.join(',')}|${shape.lines}|${shape.syllables}|${shape.mood}|${themeId}`) ^ Math.imul(Number(seed) | 0, 0x9e3779b1));
  const lines = clamp(shape.lines | 0, 1, LYRICS_MAX_LINES);
  const target = clamp(shape.syllables | 0, MIN_SYLLABLES, MAX_SYLLABLES);
  const patterns = shuffle(rng, PATTERNS[lines] || ['A'.repeat(lines)]);
  const suggestions = [];
  const seen = new Set();
  for (let tries = 0; suggestions.length < count && tries < count * 8; tries++) {
    const pattern = patterns[suggestions.length % patterns.length];
    const fams = shuffle(rng, families);
    const famOf = { A: fams[0], B: fams[1] || fams[0] };
    // 아이가 준 내용 낱말이 먼저, 모자라면 테마·노래 낱말
    const keywords = given.length ? given.map((w) => ({ word: w })) : shuffle(rng, bank).slice(0, 3).map((w) => ({ word: w }));
    const ctx = { topics, keywords, mood };
    const used = new Set();
    const made = [];
    let kwLines = 0;
    for (let i = 0; i < lines; i++) {
      // 내용 낱말: 둘째 줄부터 들어갈 수 있는 줄에 (낱말이 2개 이상이면 2줄까지)
      const keywordLine = given.length > 0 && i > 0 && kwLines < Math.min(2, given.length) && (kwLines === 0 || i === 3);
      made.push(makeLine(rng, { target, family: famOf[pattern[i]], used, topicLine: i === 0, keywordLine, ctx }));
      if (made[i].keyword) kwLines++;
    }
    const out = made.map((m) => m.text);
    const text = out.join('\n');
    if (seen.has(text)) continue;
    seen.add(text);
    if (!checkLyrics(text).ok) continue; // 만든 가사도 교육용 체크를 꼭 통과해야 해요
    suggestions.push({ lines: out, text, rhyme: made.filter((m) => m.ending).map((m) => m.ending.slice(-1)).join('-') });
  }
  return { ok: true, reason: 'ok', message: '', topic: t, keywords: given, shape, suggestions };
}
