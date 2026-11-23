// 눈송이 짝 맞추기 — 놀이 규칙 (화면과 상관없는 순수 로직)
// 브라우저(<script type="module">)와 node(node:test) 양쪽에서 그대로 불러 씁니다.

export const DIFFICULTY = {
  easy: { label: '쉬움', pairs: 6 },
  normal: { label: '보통', pairs: 8 },
};

export const LIMITS = { minPairs: 2, maxPairs: 30, maxText: 30, maxLabel: 40 };

/** 파일 이름으로 쓸 수 있는 문제표 이름인지 (?set= 값 검사) */
export function safeSetName(name) {
  if (typeof name !== 'string') return null;
  const n = name.trim().replace(/\.json$/i, '');
  return /^[a-z0-9][a-z0-9_-]{0,40}$/i.test(n) ? n : null;
}

/**
 * 문제표(JSON) 검사.
 * 돌려주는 값: { ok, errors: [문장...], set: { title, pairs } }
 */
export function validateCardSet(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, errors: ['문제표는 { "title": ..., "pairs": [...] } 모양이어야 해요.'], set: null };
  }
  const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim().slice(0, 40) : '짝 맞추기';
  if (!Array.isArray(data.pairs)) {
    return { ok: false, errors: ['"pairs" 목록이 없어요.'], set: null };
  }
  const pairs = [];
  const seen = new Set();
  data.pairs.forEach((p, i) => {
    const where = `${i + 1}번째 짝`;
    if (!p || typeof p !== 'object') { errors.push(`${where}: { "a": ..., "b": ... } 모양이 아니에요.`); return; }
    const a = typeof p.a === 'string' ? p.a.trim() : '';
    const b = typeof p.b === 'string' ? p.b.trim() : '';
    if (!a || !b) { errors.push(`${where}: "a"와 "b" 글자가 모두 있어야 해요.`); return; }
    if (a.length > LIMITS.maxText || b.length > LIMITS.maxText) {
      errors.push(`${where}: 카드 글자는 ${LIMITS.maxText}자까지예요.`); return;
    }
    if (a === b) { errors.push(`${where}: 두 카드가 똑같아요.`); return; }
    for (const t of [a, b]) {
      if (seen.has(t)) { errors.push(`${where}: "${t}" 카드가 이미 있어요. 카드 글자는 모두 달라야 해요.`); return; }
    }
    seen.add(a); seen.add(b);
    const label = (v, fallback) =>
      typeof v === 'string' && v.trim() ? v.trim().slice(0, LIMITS.maxLabel) : fallback;
    pairs.push({
      id: pairs.length,
      a, b,
      aLabel: label(p.aLabel, a),
      bLabel: label(p.bLabel, b),
      type: label(p.type, ''),
    });
  });
  if (pairs.length < LIMITS.minPairs) errors.push(`짝이 ${LIMITS.minPairs}개 이상 있어야 해요.`);
  if (pairs.length > LIMITS.maxPairs) errors.push(`짝은 ${LIMITS.maxPairs}개까지만 쓸 수 있어요.`);
  const ok = errors.length === 0;
  return { ok, errors, set: ok ? { title, pairs } : null };
}

/** 피셔-예이츠 섞기 (원본은 그대로) */
export function shuffle(list, rand = Math.random) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 짝 n개 고르기. 종류(type)가 여러 개면 종류마다 적어도 하나는 들어가게 합니다.
 * (예: 쉬움 6쌍에도 코딩 카드가 빠지지 않게)
 */
export function pickPairs(pairs, n, rand = Math.random) {
  const count = Math.max(1, Math.min(n, pairs.length));
  const mixed = shuffle(pairs, rand);
  const picked = mixed.slice(0, count);
  const types = [...new Set(pairs.map((p) => p.type).filter(Boolean))];
  for (const t of types) {
    if (picked.some((p) => p.type === t)) continue;
    const extra = mixed.slice(count).find((p) => p.type === t);
    if (!extra) continue;
    // 가장 많은 종류에서 하나를 빼고 넣기
    const tally = {};
    picked.forEach((p) => { tally[p.type] = (tally[p.type] || 0) + 1; });
    let idx = -1;
    for (let i = picked.length - 1; i >= 0; i--) {
      if (tally[picked[i].type] > 1) { idx = i; break; }
    }
    if (idx >= 0) picked[idx] = extra;
  }
  return picked;
}

/** 카드 묶음 만들기: 짝마다 카드 2장(a, b), 섞어서 */
export function buildDeck(pairs, rand = Math.random) {
  const cards = [];
  for (const p of pairs) {
    cards.push({ pairId: p.id, side: 'a', text: p.a, label: p.aLabel, type: p.type });
    cards.push({ pairId: p.id, side: 'b', text: p.b, label: p.bLabel, type: p.type });
  }
  return shuffle(cards, rand).map((c, i) => ({ ...c, index: i, faceUp: false, matched: false }));
}

/**
 * 한 판의 상태.
 * flip(i) → { type: 'flip' | 'match' | 'miss' | 'win' | 'ignored', ... }
 * 'miss' 뒤에는 hideMiss() 로 두 장을 다시 덮습니다(다른 카드를 누르면 자동으로 덮음).
 */
export class MatchGame {
  constructor(pairs, rand = Math.random) {
    this.pairCount = pairs.length;
    this.cards = buildDeck(pairs, rand);
    this.open = [];        // 지금 뒤집혀 있는(아직 짝 안 맞은) 카드 번호
    this.moves = 0;        // 두 장을 뒤집은 횟수
    this.matched = 0;      // 찾은 짝 수
    this.started = false;
    this.done = false;
  }

  get pendingMiss() {
    return this.open.length === 2;
  }

  hideMiss() {
    const hidden = this.open.slice();
    for (const i of hidden) this.cards[i].faceUp = false;
    this.open = [];
    return hidden;
  }

  flip(i) {
    const card = this.cards[i];
    if (this.done || !card || card.matched || card.faceUp) return { type: 'ignored' };
    let hidden = [];
    if (this.pendingMiss) hidden = this.hideMiss();
    this.started = true;
    card.faceUp = true;
    this.open.push(i);
    if (this.open.length === 1) return { type: 'flip', index: i, hidden };

    this.moves++;
    const [x, y] = this.open.map((k) => this.cards[k]);
    if (x.pairId === y.pairId) {
      x.matched = y.matched = true;
      const pair = this.open.slice();
      this.open = [];
      this.matched++;
      if (this.matched === this.pairCount) {
        this.done = true;
        return { type: 'win', pair, hidden, moves: this.moves };
      }
      return { type: 'match', pair, hidden };
    }
    return { type: 'miss', pair: this.open.slice(), hidden };
  }

  isWon() {
    return this.cards.every((c) => c.matched);
  }
}

/** 0:05, 1:20 처럼 */
export function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 끝났을 때 한 줄 정리 */
export function summaryLine(pairs, moves, sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const t = m ? `${m}분 ${s % 60}초` : `${s}초`;
  const praise = moves <= pairs + 2 ? '기억력 최고예요!' : moves <= pairs * 2 ? '아주 잘했어요!' : '끝까지 해냈어요!';
  return `${pairs}쌍을 ${moves}번 만에, ${t} 동안 모두 찾았어요. ${praise}`;
}
