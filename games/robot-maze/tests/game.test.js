import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  COMMANDS, parseMap, obstacleAt, shortestSolution, validateLevelSet, runProgram, stepView,
  resultMessage, starRating, safeSetName, LIMITS,
} from '../js/game.js';
import DEFAULT_LEVELS from '../js/default-levels.js';

const dataDir = new URL('../data/', import.meta.url);
const load = (name) => JSON.parse(readFileSync(new URL(name, dataDir), 'utf8'));
const levels = validateLevelSet(load('levels.json')).set.levels;
const lv = (map) => validateLevelSet({ levels: [{ map }] }).set.levels[0];

/* ---------- 단계표(JSON) ---------- */

test('data/ 안의 모든 단계표가 올바르고, 단계마다 풀 수 있다', () => {
  const files = readdirSync(dataDir).filter((f) => f.endsWith('.json'));
  assert.ok(files.includes('levels.json'));
  for (const f of files) {
    const r = validateLevelSet(load(f));
    assert.equal(r.ok, true, `${f}: ${r.errors.join(' / ')}`);
    for (const l of r.set.levels) {
      const sol = shortestSolution(l);
      assert.ok(sol, `${f} ${l.number}단계는 풀 수 있어야 해요`);
      assert.ok(sol.length <= l.maxBlocks, `${f} ${l.number}단계: 블록 수 안에 풀려야 해요`);
      assert.equal(runProgram(l, sol).result, 'success', `${f} ${l.number}단계 가장 짧은 풀이가 성공해야 해요`);
    }
  }
});

test('기본 단계표는 8단계이고, 가장 짧은 풀이가 점점 길어진다', () => {
  assert.equal(levels.length, 8);
  const lens = levels.map((l) => l.best);
  for (let i = 1; i < lens.length; i++) {
    assert.ok(lens[i] >= lens[i - 1], `${i + 1}단계(${lens[i]})가 ${i}단계(${lens[i - 1]})보다 짧으면 안 돼요`);
  }
  assert.ok(lens[0] <= 5, '1단계는 짧게');
  assert.ok(lens[7] >= lens[0] * 3, '마지막 단계는 첫 단계보다 훨씬 길게');
  assert.ok(lens[7] <= LIMITS.maxBlocks);
  // 별이 있는 단계가 대부분, 뒤로 갈수록 장애물(책상·사물함)도 늘어요
  assert.ok(levels.every((l) => l.stars.length >= 1));
  assert.ok(levels[7].stars.length > levels[0].stars.length);
  assert.ok(levels[7].blocked.size > levels[0].blocked.size);
});

test('단계 이름·도움말은 40자 안이고, 화면 크기(7×7) 안에 들어간다', () => {
  for (const raw of load('levels.json').levels) {
    assert.ok(raw.name.length <= LIMITS.maxText, raw.name);
    assert.ok(raw.tip.length <= LIMITS.maxText, raw.tip);
    assert.ok(raw.map.length <= LIMITS.maxRows && raw.map[0].length <= LIMITS.maxCols);
  }
});

test('기본 단계(js/default-levels.js)도 올바른 8단계다', () => {
  const r = validateLevelSet(DEFAULT_LEVELS);
  assert.equal(r.ok, true, r.errors.join(' / '));
  assert.equal(r.set.levels.length, 8);
});

test('잘못된 단계표는 이유와 함께 거절한다', () => {
  const bad = (levelsList) => validateLevelSet({ levels: levelsList });
  assert.equal(validateLevelSet(null).ok, false);
  assert.equal(validateLevelSet({ title: 'x' }).ok, false);
  assert.equal(bad([]).ok, false);
  assert.match(bad([{ map: ['S..', '..'] }]).errors[0], /줄 길이/);
  assert.match(bad([{ map: ['S.X.G'] }]).errors[0], /쓸 수 없는 글자/);
  assert.match(bad([{ map: ['...G'] }]).errors[0], /출발 칸 S/);
  assert.match(bad([{ map: ['S.G.G'] }]).errors[0], /도착 칸 G/);
  assert.match(bad([{ map: ['SDG'] }]).errors[0], /길이 없어요/);
  assert.match(bad([{ map: ['S.G', 'LLL', '*..'] }]).errors[0], /길이 없어요/, '갇힌 별');
  assert.match(bad([{ map: ['S....G'], maxBlocks: 3 }]).errors[0], /maxBlocks/);
  assert.match(bad([{ map: ['S.G'], maxBlocks: 99 }]).errors[0], /maxBlocks/);
  assert.match(bad([{ map: ['S.......G'] }]).errors[0], /7칸까지/);
  assert.equal(bad([{ map: ['S.G'] }]).ok, true);
  assert.equal(bad([{ map: ['S.G'] }]).set.levels[0].maxBlocks, LIMITS.defaultBlocks);
});

test('?set= 이름 검사', () => {
  assert.equal(safeSetName('levels'), 'levels');
  assert.equal(safeSetName('class-2.json'), 'class-2');
  assert.equal(safeSetName('../x'), null);
  assert.equal(safeSetName(''), null);
});

/* ---------- 지도·길 찾기 ---------- */

test('지도 읽기: 출발·도착·별·장애물 위치', () => {
  const l = parseMap(['S*D', 'L.G']);
  assert.deepEqual(l.start, { r: 0, c: 0 });
  assert.deepEqual(l.goal, { r: 1, c: 2 });
  assert.deepEqual(l.stars, [{ r: 0, c: 1 }]);
  assert.equal(obstacleAt(l, 0, 2), 'desk');
  assert.equal(obstacleAt(l, 1, 0), 'locker');
  assert.equal(obstacleAt(l, -1, 0), 'wall');
  assert.equal(obstacleAt(l, 0, 3), 'wall');
  assert.equal(obstacleAt(l, 1, 1), null);
});

test('가장 짧은 풀이는 별을 모두 모으고 도착한다', () => {
  assert.deepEqual(shortestSolution(lv(['S.G'])), ['right', 'right']);
  // 별이 아래에 있으면 내려갔다 와야 해요
  assert.equal(shortestSolution(lv(['S.G', '.*.'])).length, 4);
  assert.equal(levels[0].best, 4);
});

/* ---------- 명령 실행 ---------- */

test('명령을 차례대로 실행해 도착하면 성공', () => {
  const l = levels[0]; // S.*.G
  const t = runProgram(l, ['right', 'right', 'right', 'right']);
  assert.equal(t.result, 'success');
  assert.equal(t.failIndex, -1);
  assert.equal(t.collected, 1);
  assert.deepEqual(t.end, l.goal);
  assert.deepEqual(t.steps.map((s) => s.to.c), [1, 2, 3, 4]);
  assert.deepEqual(t.steps.map((s) => s.star), [false, true, false, false]);
});

test('도착하면 남은 블록은 실행하지 않는다', () => {
  const t = runProgram(lv(['S.G']), ['right', 'right', 'left', 'left']);
  assert.equal(t.result, 'success');
  assert.equal(t.used, 2);
});

test('순서가 바뀌면 결과가 달라진다 (순차)', () => {
  const l = levels[1]; // S.. / DD. / G*.
  const ok = ['right', 'right', 'down', 'down', 'left', 'left'];
  assert.equal(runProgram(l, ok).result, 'success');
  const swapped = ['down', 'right', 'right', 'down', 'left', 'left'];
  assert.equal(runProgram(l, swapped).result, 'crash');
});

test('모르는 명령은 오류', () => {
  assert.throws(() => runProgram(levels[0], ['jump']));
});

/* ---------- 부딪힘·실패 ---------- */

test('책상에 부딪히면 그 블록에서 멈추고 틀린 블록으로 표시', () => {
  const l = levels[1]; // S.. / DD. / G*.
  const t = runProgram(l, ['right', 'down', 'down']);
  assert.equal(t.result, 'crash');
  assert.equal(t.hit, 'desk');
  assert.equal(t.failIndex, 1);
  assert.equal(t.steps.length, 2, '부딪힌 뒤 블록은 실행하지 않아요');
  assert.deepEqual(t.end, { r: 0, c: 1 }, '로봇은 부딪히기 전 칸에 그대로');
  assert.match(resultMessage(l, t), /2번째 블록에서 책상에 부딪혔어요/);
});

test('사물함·교실 벽에 부딪힘', () => {
  const t1 = runProgram(lv(['SL', '.G']), ['right']);
  assert.equal(t1.hit, 'locker');
  assert.match(resultMessage(lv(['SL', '.G']), t1), /사물함/);
  const t2 = runProgram(levels[0], ['up']);
  assert.equal(t2.hit, 'wall');
  assert.equal(t2.failIndex, 0);
  assert.match(resultMessage(levels[0], t2), /교실 벽/);
});

test('블록이 모자라면 마지막 블록을 표시', () => {
  const t = runProgram(levels[0], ['right', 'right']);
  assert.equal(t.result, 'short');
  assert.equal(t.failIndex, 1);
  assert.match(resultMessage(levels[0], t), /아직 도착하지 못했어요/);
});

test('별을 빠뜨리고 도착하면 실패', () => {
  const l = lv(['S.G', '.*.']);
  const t = runProgram(l, ['right', 'right']);
  assert.equal(t.result, 'stars');
  assert.equal(t.collected, 0);
  assert.match(resultMessage(l, t), /별 1개를 못 모았어요/);
});

test('빈 명령', () => {
  const t = runProgram(levels[0], []);
  assert.equal(t.result, 'empty');
  assert.equal(t.failIndex, -1);
  assert.match(resultMessage(levels[0], t), /먼저 놓아/);
});

/* ---------- 한 칸씩 보기(강조) ---------- */

test('한 칸씩 보기: 지금 블록은 노란색, 실패한 마지막 칸에서만 빨간 블록', () => {
  const l = levels[1];
  const t = runProgram(l, ['right', 'right', 'down', 'left']); // 4번째에서 책상
  assert.equal(t.result, 'crash');
  assert.equal(t.failIndex, 3);

  const v0 = stepView(l, t, 0);
  assert.deepEqual(v0.pos, l.start);
  assert.equal(v0.active, -1);
  assert.equal(v0.wrong, -1);

  const v2 = stepView(l, t, 2);
  assert.deepEqual(v2.pos, { r: 0, c: 2 });
  assert.equal(v2.active, 1);
  assert.equal(v2.wrong, -1, '아직 틀린 칸 전');
  assert.equal(v2.done, false);

  const v4 = stepView(l, t, 4);
  assert.equal(v4.done, true);
  assert.equal(v4.wrong, 3);
  assert.equal(v4.bump, 'desk');
  assert.deepEqual(v4.pos, { r: 1, c: 2 });

  assert.equal(stepView(l, t, 99).wrong, 3, '범위를 넘어도 안전');
  assert.equal(stepView(l, t, -5).active, -1);
});

test('한 칸씩 보기: 별은 지나간 뒤에만 모인다, 성공하면 빨간 블록 없음', () => {
  const l = levels[0];
  const t = runProgram(l, ['right', 'right', 'right', 'right']);
  assert.deepEqual(stepView(l, t, 1).stars, []);
  assert.deepEqual(stepView(l, t, 2).stars, ['0,2']);
  const end = stepView(l, t, 4);
  assert.equal(end.done, true);
  assert.equal(end.wrong, -1);
  assert.equal(end.bump, null);
});

test('블록이 모자란 실패도 끝까지 보면 마지막 블록이 빨간색', () => {
  const l = levels[0];
  const t = runProgram(l, ['right', 'right']);
  assert.equal(stepView(l, t, 1).wrong, -1);
  assert.equal(stepView(l, t, 2).wrong, 1);
});

/* ---------- 별점 ---------- */

test('별점: 가장 짧으면 3개', () => {
  const l = levels[0];
  assert.equal(starRating(l, 4), 3);
  assert.equal(starRating(l, 6), 2);
  assert.equal(starRating(l, 9), 1);
  assert.match(resultMessage(l, runProgram(l, ['right', 'right', 'right', 'right'])), /가장 짧은 길/);
  assert.ok(Object.keys(COMMANDS).length === 4, '화살표 블록 4개만');
});
