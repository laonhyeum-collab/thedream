// 순발력 신호등 — 놀이 규칙 (화면과 상관없는 순수 로직)
// 브라우저(<script type="module">)와 node(node:test) 양쪽에서 그대로 불러 씁니다.

export const GAME_MS = 60000; // 한 판 60초

// 단계: 시간이 지나면 저절로 올라가요
export const STAGES = [
  { id: 1, from: 0, label: '1단계 · 신호등', rule: '초록 불이면 탭! 빨간 불이면 멈춰요', kind: 'color', showMs: 1500 },
  { id: 2, from: 20000, label: '2단계 · 낱말 고르기', rule: '{target}이면 탭! 아니면 멈춰요', kind: 'word', showMs: 1500 },
  { id: 3, from: 40000, label: '3단계 · 빨리빨리', rule: '{target}이면 탭! 아니면 멈춰요', kind: 'word', showMs: 1100 },
];

export const LIMITS = { minWords: 3, maxWords: 60, maxText: 12, maxSets: 20 };

export const FAST_MS = 600; // 이보다 빨리 누르면 번개 점수 +1

/** ?set= 값으로 쓸 수 있는 파일 이름인지 */
export function safeSetName(name) {
  if (typeof name !== 'string') return null;
  const n = name.trim().replace(/\.json$/i, '');
  return /^[a-z0-9][a-z0-9_-]{0,40}$/i.test(n) ? n : null;
}

function cleanList(list, where, errors) {
  if (!Array.isArray(list)) { errors.push(`${where}: 낱말 목록([ ... ])이 없어요.`); return []; }
  const out = [];
  const seen = new Set();
  for (const w of list) {
    const t = typeof w === 'string' ? w.trim() : '';
    if (!t) continue;
    if (t.length > LIMITS.maxText) { errors.push(`${where}: '${t.slice(0, 12)}…'는 ${LIMITS.maxText}자까지예요.`); continue; }
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.slice(0, LIMITS.maxWords);
}

/**
 * 낱말 목록 파일 검사.
 * 모양: { "title": "과일·동물", "sets": [ { "target": "과일", "yes": [..], "no": [..] } ] }
 * 돌려주는 값: { ok, errors, data: { title, sets } }
 */
export function validateWordFile(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, errors: ['낱말 파일은 { "title": ..., "sets": [...] } 모양이어야 해요.'], data: null };
  }
  const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim().slice(0, 30) : '낱말 고르기';
  if (!Array.isArray(data.sets) || data.sets.length === 0) {
    return { ok: false, errors: ['"sets" 목록이 없어요.'], data: null };
  }
  const sets = [];
  data.sets.slice(0, LIMITS.maxSets).forEach((s, i) => {
    const where = `${i + 1}번째 묶음`;
    if (!s || typeof s !== 'object') { errors.push(`${where}: 모양이 맞지 않아요.`); return; }
    const target = typeof s.target === 'string' ? s.target.trim().slice(0, LIMITS.maxText) : '';
    if (!target) { errors.push(`${where}: "target"(탭할 종류)이 없어요.`); return; }
    const yes = cleanList(s.yes, `${where} yes`, errors);
    const yesSet = new Set(yes);
    const no = cleanList(s.no, `${where} no`, errors).filter((w) => !yesSet.has(w));
    if (yes.length < LIMITS.minWords || no.length < LIMITS.minWords) {
      errors.push(`${where}: yes·no 낱말이 ${LIMITS.minWords}개 이상씩 있어야 해요.`);
      return;
    }
    sets.push({ target, yes, no });
  });
  if (!sets.length) return { ok: false, errors, data: null };
  return { ok: errors.length === 0, errors, data: { title, sets } };
}

/** 받침이 있으면 '이면', 없으면 '면' (과일이면 / 채소면) */
export function withIfJosa(word) {
  const last = word.charCodeAt(word.length - 1);
  if (last >= 0xac00 && last <= 0xd7a3) {
    return (last - 0xac00) % 28 === 0 ? `${word}면` : `${word}이면`;
  }
  return `${word}이면`;
}

export function stageAt(elapsedMs) {
  let s = STAGES[0];
  for (const st of STAGES) if (elapsedMs >= st.from) s = st;
  return s;
}

export function ruleText(stage, target) {
  if (stage.kind === 'color') return stage.rule;
  return stage.rule.replace('{target}이면', withIfJosa(target));
}

/**
 * 한 판의 상태. 시간은 밖에서 넣어 줘요(now ms) → 테스트에서 시계를 마음대로 움직일 수 있어요.
 * 흐름: start(now) → next(now)로 신호 하나 → tap(now) 또는 timeout(now) → next(now) …
 */
export class SignalGame {
  constructor({ wordSet, rand = Math.random } = {}) {
    this.wordSet = wordSet; // { target, yes, no }
    this.rand = rand;
    this.score = 0;
    this.hits = 0;     // 맞게 탭
    this.fast = 0;     // 번개 탭
    this.wrong = 0;    // 멈춰야 할 때 탭
    this.missed = 0;   // 탭해야 할 때 놓침
    this.held = 0;     // 잘 참음
    this.reactions = [];
    this.current = null;
    this.startAt = null;
    this.over = false;
    this._lastWord = null;
  }

  start(now) { this.startAt = now; this.over = false; }

  elapsed(now) { return Math.max(0, now - this.startAt); }

  timeLeft(now) { return Math.max(0, GAME_MS - this.elapsed(now)); }

  isOver(now) {
    if (this.timeLeft(now) <= 0) this.over = true;
    return this.over;
  }

  /** 새 신호를 만들어요. 반쯤은 탭해야 하는 신호예요. */
  next(now) {
    if (this.isOver(now)) { this.current = null; return null; }
    const stage = stageAt(this.elapsed(now));
    const go = this.rand() < 0.55;
    let sig;
    if (stage.kind === 'color' || !this.wordSet) {
      sig = { kind: 'color', color: go ? 'green' : 'red', text: go ? '초록' : '빨강', go };
    } else {
      const pool = go ? this.wordSet.yes : this.wordSet.no;
      let word = pool[Math.floor(this.rand() * pool.length)];
      if (word === this._lastWord && pool.length > 1) word = pool[(pool.indexOf(word) + 1) % pool.length];
      this._lastWord = word;
      sig = { kind: 'word', color: 'yellow', text: word, go };
    }
    sig.stage = stage.id;
    sig.shownAt = now;
    sig.until = now + stage.showMs;
    sig.done = false;
    this.current = sig;
    return sig;
  }

  /** 화면을 눌렀을 때. 결과: 'hit' | 'fast' | 'wrong' | 'early' | 'over' */
  tap(now) {
    if (this.isOver(now)) return 'over';
    const sig = this.current;
    if (!sig || sig.done || now > sig.until) return 'early';
    sig.done = true;
    if (sig.go) {
      const ms = now - sig.shownAt;
      this.reactions.push(ms);
      this.hits += 1;
      if (ms < FAST_MS) { this.fast += 1; this.score += 2; return 'fast'; }
      this.score += 1;
      return 'hit';
    }
    this.wrong += 1;
    this.score = Math.max(0, this.score - 1);
    return 'wrong';
  }

  /** 신호 시간이 끝났을 때. 결과: 'missed' | 'held' | null(이미 처리) */
  timeout() {
    const sig = this.current;
    if (!sig || sig.done) return null;
    sig.done = true;
    if (sig.go) { this.missed += 1; return 'missed'; }
    this.held += 1;
    this.score += 1;
    return 'held';
  }

  averageReaction() {
    if (!this.reactions.length) return null;
    return Math.round(this.reactions.reduce((a, b) => a + b, 0) / this.reactions.length);
  }

  summary() {
    const avg = this.averageReaction();
    return {
      score: this.score,
      hits: this.hits,
      fast: this.fast,
      held: this.held,
      wrong: this.wrong,
      missed: this.missed,
      avgMs: avg,
      line: `점수 ${this.score}점 · 맞게 탭 ${this.hits}번(번개 ${this.fast}) · 잘 참음 ${this.held}번 · 실수 ${this.wrong}번`
        + (avg ? ` · 평균 ${(avg / 1000).toFixed(2)}초` : ''),
    };
  }
}

/** 다음 신호까지 쉬는 시간(0.4~0.9초) */
export function gapMs(rand = Math.random) {
  return 400 + Math.floor(rand() * 500);
}
