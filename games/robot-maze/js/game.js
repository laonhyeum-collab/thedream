// 블록 로봇 교실 미로 — 놀이 규칙 (화면과 상관없는 순수 로직)
// 브라우저(<script type="module">)와 node(node:test) 양쪽에서 그대로 불러 씁니다.

/** 화살표 명령 블록 4가지 (반복 블록은 없어요) */
export const COMMANDS = {
  up: { dr: -1, dc: 0, arrow: '↑', label: '위로' },
  down: { dr: 1, dc: 0, arrow: '↓', label: '아래로' },
  left: { dr: 0, dc: -1, arrow: '←', label: '왼쪽으로' },
  right: { dr: 0, dc: 1, arrow: '→', label: '오른쪽으로' },
};
export const COMMAND_ORDER = ['up', 'down', 'left', 'right'];

/** 지도 글자 뜻 */
export const TILES = {
  '.': 'floor',
  S: 'start',
  G: 'goal',
  '*': 'star',
  D: 'desk',
  L: 'locker',
};
const BLOCKING = { desk: '책상', locker: '사물함' };

export const LIMITS = {
  minLevels: 1, maxLevels: 20,
  maxRows: 7, maxCols: 7,
  maxStars: 5,
  maxBlocks: 24, defaultBlocks: 16,
  maxText: 40,
};

/** 파일 이름으로 쓸 수 있는 단계표 이름인지 (?set= 값 검사) */
export function safeSetName(name) {
  if (typeof name !== 'string') return null;
  const n = name.trim().replace(/\.json$/i, '');
  return /^[a-z0-9][a-z0-9_-]{0,40}$/i.test(n) ? n : null;
}

const key = (r, c) => `${r},${c}`;

/** 지도 글자 줄 → { rows, cols, start, goal, stars[], blocked(Map) } */
export function parseMap(map) {
  const rows = map.length;
  const cols = rows ? [...map[0]].length : 0;
  let start = null;
  let goal = null;
  const stars = [];
  const blocked = new Map();
  map.forEach((line, r) => {
    [...line].forEach((ch, c) => {
      const t = TILES[ch];
      if (t === 'start') start = { r, c };
      else if (t === 'goal') goal = { r, c };
      else if (t === 'star') stars.push({ r, c });
      else if (t === 'desk' || t === 'locker') blocked.set(key(r, c), t);
    });
  });
  return { rows, cols, start, goal, stars, blocked };
}

/** 칸 종류: 'wall'(교실 밖) | 'desk' | 'locker' | null(지나갈 수 있음) */
export function obstacleAt(level, r, c) {
  if (r < 0 || c < 0 || r >= level.rows || c >= level.cols) return 'wall';
  return level.blocked.get(key(r, c)) || null;
}

/**
 * 가장 짧은 풀이(별을 모두 모으고 도착) — 너비 우선 탐색.
 * 돌려주는 값: 명령 배열(예: ['right','down']) 또는 풀 수 없으면 null
 */
export function shortestSolution(level) {
  const n = level.stars.length;
  const starIndex = new Map(level.stars.map((s, i) => [key(s.r, s.c), i]));
  const full = (1 << n) - 1;
  const startMask = starIndex.has(key(level.start.r, level.start.c)) ? 1 << starIndex.get(key(level.start.r, level.start.c)) : 0;
  const id = (r, c, m) => `${r},${c},${m}`;
  const prev = new Map([[id(level.start.r, level.start.c, startMask), null]]);
  let queue = [{ r: level.start.r, c: level.start.c, m: startMask }];
  while (queue.length) {
    const next = [];
    for (const s of queue) {
      if (s.r === level.goal.r && s.c === level.goal.c && s.m === full) {
        const path = [];
        let k = id(s.r, s.c, s.m);
        while (prev.get(k)) { const p = prev.get(k); path.push(p.cmd); k = p.from; }
        return path.reverse();
      }
      for (const cmd of COMMAND_ORDER) {
        const { dr, dc } = COMMANDS[cmd];
        const r = s.r + dr;
        const c = s.c + dc;
        if (obstacleAt(level, r, c)) continue;
        const si = starIndex.get(key(r, c));
        const m = si === undefined ? s.m : s.m | (1 << si);
        const k = id(r, c, m);
        if (prev.has(k)) continue;
        prev.set(k, { from: id(s.r, s.c, s.m), cmd });
        next.push({ r, c, m });
      }
    }
    queue = next;
  }
  return null;
}

/**
 * 단계표(JSON) 검사.
 * 돌려주는 값: { ok, errors: [문장...], set: { title, levels: [...] } }
 */
export function validateLevelSet(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, errors: ['단계표는 { "title": ..., "levels": [...] } 모양이어야 해요.'], set: null };
  }
  const title = typeof data.title === 'string' && data.title.trim()
    ? data.title.trim().slice(0, LIMITS.maxText) : '블록 로봇 교실 미로';
  if (!Array.isArray(data.levels)) {
    return { ok: false, errors: ['"levels" 목록이 없어요.'], set: null };
  }
  const levels = [];
  data.levels.forEach((lv, i) => {
    const where = `${i + 1}단계`;
    if (!lv || typeof lv !== 'object') { errors.push(`${where}: { "map": [...] } 모양이 아니에요.`); return; }
    const map = lv.map;
    if (!Array.isArray(map) || !map.length || !map.every((l) => typeof l === 'string' && l.length)) {
      errors.push(`${where}: "map" 은 글자 줄 목록이어야 해요.`); return;
    }
    if (map.length > LIMITS.maxRows) { errors.push(`${where}: 지도는 ${LIMITS.maxRows}줄까지예요.`); return; }
    const width = [...map[0]].length;
    if (width > LIMITS.maxCols) { errors.push(`${where}: 지도 한 줄은 ${LIMITS.maxCols}칸까지예요.`); return; }
    if (!map.every((l) => [...l].length === width)) { errors.push(`${where}: 지도의 모든 줄 길이가 같아야 해요.`); return; }
    const bad = map.join('').split('').find((ch) => !(ch in TILES));
    if (bad) { errors.push(`${where}: 지도에 쓸 수 없는 글자 "${bad}" 가 있어요. (. S G * D L 만 써요)`); return; }
    const count = (ch) => map.join('').split(ch).length - 1;
    if (count('S') !== 1) { errors.push(`${where}: 로봇 출발 칸 S 가 꼭 1개 있어야 해요.`); return; }
    if (count('G') !== 1) { errors.push(`${where}: 도착 칸 G 가 꼭 1개 있어야 해요.`); return; }
    if (count('*') > LIMITS.maxStars) { errors.push(`${where}: 별 * 은 ${LIMITS.maxStars}개까지예요.`); return; }
    let maxBlocks = LIMITS.defaultBlocks;
    if (lv.maxBlocks !== undefined) {
      if (!Number.isInteger(lv.maxBlocks) || lv.maxBlocks < 1 || lv.maxBlocks > LIMITS.maxBlocks) {
        errors.push(`${where}: "maxBlocks" 는 1~${LIMITS.maxBlocks} 사이 숫자여야 해요.`); return;
      }
      maxBlocks = lv.maxBlocks;
    }
    const parsed = parseMap(map);
    const solution = shortestSolution(parsed);
    if (!solution) { errors.push(`${where}: 별을 모두 모아 도착할 수 있는 길이 없어요.`); return; }
    if (solution.length > maxBlocks) {
      errors.push(`${where}: 가장 짧은 길도 블록 ${solution.length}개가 필요해요. "maxBlocks" 를 ${solution.length} 이상으로 해 주세요.`); return;
    }
    const text = (v, fallback) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, LIMITS.maxText) : fallback);
    levels.push({
      number: levels.length + 1,
      name: text(lv.name, `${levels.length + 1}단계`),
      tip: text(lv.tip, ''),
      map: map.slice(),
      maxBlocks,
      best: solution.length,
      ...parsed,
    });
  });
  if (levels.length < LIMITS.minLevels && !errors.length) errors.push('단계가 1개 이상 있어야 해요.');
  if (levels.length > LIMITS.maxLevels) errors.push(`단계는 ${LIMITS.maxLevels}개까지만 쓸 수 있어요.`);
  const ok = errors.length === 0;
  return { ok, errors, set: ok ? { title, levels } : null };
}

/**
 * 명령 블록을 차례대로(순차) 실행합니다.
 * 돌려주는 값 trace:
 *   steps: [{ index, cmd, from, to, hit, star }]  — 실제로 실행한 블록마다 한 개
 *   result: 'success' | 'crash' | 'short' | 'stars' | 'empty'
 *   failIndex: 틀린(강조할) 블록 번호, 없으면 -1
 *   hit: 부딪힌 것('wall'|'desk'|'locker'), collected: 모은 별 수, end: 마지막 위치
 */
export function runProgram(level, program) {
  const steps = [];
  let pos = { ...level.start };
  const got = new Set();
  const starKeys = new Set(level.stars.map((s) => key(s.r, s.c)));
  const done = () => got.size === starKeys.size;
  const finish = (result, failIndex, hit = null) =>
    ({ steps, result, failIndex, hit, collected: got.size, totalStars: starKeys.size, end: pos, used: steps.length });

  if (!program.length) return finish('empty', -1);
  for (let i = 0; i < program.length; i++) {
    const cmd = program[i];
    const d = COMMANDS[cmd];
    if (!d) throw new Error(`모르는 명령: ${cmd}`);
    const to = { r: pos.r + d.dr, c: pos.c + d.dc };
    const hit = obstacleAt(level, to.r, to.c);
    if (hit) {
      steps.push({ index: i, cmd, from: pos, to: pos, hit, star: false });
      return finish('crash', i, hit);
    }
    const k = key(to.r, to.c);
    const star = starKeys.has(k) && !got.has(k);
    if (star) got.add(k);
    steps.push({ index: i, cmd, from: pos, to, hit: null, star });
    pos = to;
    if (pos.r === level.goal.r && pos.c === level.goal.c && done()) return finish('success', -1);
  }
  const atGoal = pos.r === level.goal.r && pos.c === level.goal.c;
  return finish(atGoal ? 'stars' : 'short', program.length - 1);
}

/**
 * 한 칸씩 보기: 실행 기록에서 n 개 블록까지 움직였을 때 화면에 보여 줄 것.
 * 돌려주는 값: { pos, stars: [모은 별 칸 key], active, wrong, done }
 *   active — 지금 막 실행한 블록 번호(노란 강조), 없으면 -1
 *   wrong  — 틀린 블록 번호(빨간 강조). 실패한 판에서 마지막 칸까지 왔을 때만
 */
export function stepView(level, trace, n) {
  const upto = Math.max(0, Math.min(n, trace.steps.length));
  let pos = { ...level.start };
  const stars = [];
  for (let i = 0; i < upto; i++) {
    const s = trace.steps[i];
    pos = s.to;
    if (s.star) stars.push(key(s.to.r, s.to.c));
  }
  const last = upto > 0 ? trace.steps[upto - 1] : null;
  const done = upto === trace.steps.length;
  const failed = trace.result !== 'success' && trace.result !== 'empty';
  return {
    pos,
    stars,
    active: last ? last.index : -1,
    wrong: done && failed ? trace.failIndex : -1,
    bump: done && last && last.hit ? last.hit : null,
    done,
  };
}

/** 아이에게 보여 줄 한 줄 안내 */
export function resultMessage(level, trace) {
  const nth = (i) => `${i + 1}번째 블록`;
  switch (trace.result) {
    case 'empty':
      return '명령 블록을 먼저 놓아 주세요.';
    case 'crash': {
      const what = trace.hit === 'wall' ? '교실 벽' : BLOCKING[trace.hit];
      return `앗! ${nth(trace.failIndex)}에서 ${what}에 부딪혔어요. 빨간 블록을 바꿔 볼까요?`;
    }
    case 'short':
      return `블록이 끝났는데 아직 도착하지 못했어요. ${nth(trace.failIndex)} 뒤에 블록을 더 이어 볼까요?`;
    case 'stars': {
      const left = trace.totalStars - trace.collected;
      return `도착했지만 별 ${left}개를 못 모았어요. 별을 지나가는 길로 바꿔 볼까요?`;
    }
    case 'success': {
      const best = trace.used <= level.best;
      return best
        ? `도착! 블록 ${trace.used}개, 가장 짧은 길이에요!`
        : `도착! 블록 ${trace.used}개로 성공했어요. ${level.best}개로도 갈 수 있어요.`;
    }
    default:
      return '';
  }
}

/** 성공 별점: 가장 짧으면 3, 조금 길면 2, 그 밖은 1 */
export function starRating(level, used) {
  if (used <= level.best) return 3;
  if (used <= level.best + 2) return 2;
  return 1;
}
