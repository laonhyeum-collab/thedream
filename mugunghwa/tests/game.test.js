import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, DIFFICULTY, GOAL, STEP_PER_STROKE } from '../js/game.js';

// 늘 같은 결과가 나오는 가짜 주사위
function seeded(seed = 1) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}
const step = 1 / 30;

/**
 * 시간을 흘려보냄.
 * play(game) → { e: [움직임 크기...], r: [1초에 흔드는 횟수...] }
 */
function run(game, play, seconds) {
  const events = [];
  const acc = [0, 0];
  for (let i = 0; i < seconds / step; i++) {
    const { e = [], r = [] } = play(game);
    const strokes = r.map((rate, k) => {
      acc[k] += rate * step;
      const n = Math.floor(acc[k]);
      acc[k] -= n;
      return n;
    });
    events.push(...game.update(step, e, strokes));
  }
  return events;
}
const still = () => ({ e: [0, 0], r: [0, 0] });
/** 노래할 때만 1초에 rate번 흔들고, 얼음 때는 멈춤 */
const goodPlayer = (rate) => (g) => (g.phase === 'chant' ? { e: [0.6], r: [rate] } : { e: [0], r: [0] });

test('카운트다운 3초 뒤 "무궁화 꽃이 피었습니다"가 시작된다', () => {
  const g = new Game({ rng: seeded() });
  assert.equal(g.phase, 'countdown');
  run(g, () => ({ e: [1], r: [4] }), 2.9);
  assert.equal(g.phase, 'countdown');
  assert.equal(g.players[0].progress, 0, '카운트다운 중에는 흔들어도 안 나감');
  run(g, still, 0.2);
  assert.equal(g.phase, 'chant');
});

test('노래할 때 팔을 한 번 흔들 때마다 정해진 칸만큼 간다', () => {
  const g = new Game({ rng: seeded() });
  run(g, still, 3.05);
  assert.equal(g.phase, 'chant');
  g.update(step, [0.5], [1]);
  assert.equal(g.players[0].progress, STEP_PER_STROKE);
  g.update(step, [0.5], [3]);
  assert.equal(g.players[0].progress, STEP_PER_STROKE * 4);
  assert.equal(g.players[0].strokes, 4);
});

test('몸은 움직여도 팔을 안 흔들면(흔든 횟수 0) 앞으로 안 간다', () => {
  const g = new Game({ rng: seeded() });
  run(g, still, 3.05);
  while (g.phase === 'chant') g.update(step, [1], [0]);
  assert.equal(g.players[0].progress, 0);
});

test('많이 흔들수록 더 많이 간다', () => {
  const dist = [1, 2, 4].map((rate) => {
    const g = new Game({ rng: seeded(9) });
    run(g, still, 3.05);
    run(g, (gm) => (gm.phase === 'chant' ? { e: [0.5], r: [rate] } : { e: [0], r: [0] }), 2);
    return g.players[0].progress;
  });
  assert.ok(dist[0] < dist[1] && dist[1] < dist[2], dist.join(' < '));
});

test('"얼음!" 때 흔든 건 앞으로 안 가고, 움직이면 걸려서 뒤로 간다 (한 번 얼음에 한 번만)', () => {
  for (const d of Object.keys(DIFFICULTY)) {
    const g = new Game({ difficulty: d, rng: seeded(7) });
    run(g, still, 3.05);
    let f = 0;
    while (g.phase === 'chant') g.update(step, [1], [++f % 15 === 0 ? 1 : 0]); // 1초에 2번
    assert.equal(g.phase, 'freeze');
    assert.ok(g.players[0].progress > 0);
    const before = g.players[0].progress;
    const ev = [];
    while (g.phase === 'freeze') ev.push(...g.update(step, [1], [1]));
    assert.equal(ev.filter((e) => e.type === 'caught').length, 1, d);
    assert.equal(ev.filter((e) => e.type === 'step').length, 0, d);
    assert.equal(g.players[0].progress, Math.max(0, before - DIFFICULTY[d].pushBack), d);
  }
});

test('"얼음!" 직후 잠깐은 봐준다 (멈출 시간)', () => {
  const g = new Game({ difficulty: 'hawk', rng: seeded(3) });
  run(g, still, 3.05);
  while (g.phase === 'chant') g.update(step, [0]);
  const ev = [];
  const graceSteps = Math.floor(DIFFICULTY.hawk.grace / step) - 1;
  for (let i = 0; i < graceSteps; i++) ev.push(...g.update(step, [1]));
  assert.equal(ev.filter((e) => e.type === 'caught').length, 0);
});

test('얼음 때 살짝 흔들린 건 너그러움은 봐주고 매의 눈은 잡는다', () => {
  const result = {};
  for (const d of ['easy', 'normal', 'hawk']) {
    const g = new Game({ difficulty: d, rng: seeded(5) });
    run(g, still, 3.05);
    while (g.phase === 'chant') g.update(step, [0]);
    let caught = 0;
    while (g.phase === 'freeze') caught += g.update(step, [0.3]).filter((e) => e.type === 'caught').length;
    result[d] = caught;
  }
  assert.deepEqual(result, { easy: 0, normal: 1, hawk: 1 });
  const g = new Game({ difficulty: 'hawk', rng: seeded(5) });
  run(g, still, 3.05);
  while (g.phase === 'chant') g.update(step, [0]);
  let caught = 0;
  while (g.phase === 'freeze') caught += g.update(step, [0.08]).filter((e) => e.type === 'caught').length;
  assert.equal(caught, 0, '숨쉬기 정도는 매의 눈도 봐줌');
});

test('규칙을 잘 지키며 1초에 3번씩 흔들면 도착해서 이긴다', () => {
  const g = new Game({ rng: seeded(11) });
  const ev = run(g, goodPlayer(3), 120);
  const win = ev.find((e) => e.type === 'win');
  assert.ok(win, '이겨야 함');
  assert.equal(g.phase, 'end');
  assert.equal(g.players[0].progress, GOAL);
  assert.equal(g.players[0].caught, 0);
  assert.equal(g.players[0].strokes, Math.ceil(GOAL / STEP_PER_STROKE));
});

test('둘이서: 각자 흔든 만큼 가고, 먼저 도착한 사람이 이긴다', () => {
  const g = new Game({ players: 2, rng: seeded(13) });
  // 1P는 1초에 4번, 2P는 1초에 2번
  const ev = run(g, (gm) => (gm.phase === 'chant' ? { e: [0.6, 0.6], r: [4, 2] } : { e: [0, 0], r: [0, 0] }), 120);
  const win = ev.find((e) => e.type === 'win');
  assert.equal(win.player, 0);
  assert.ok(g.players[1].progress < GOAL && g.players[1].progress > 0);
});

test('끝난 뒤에는 더 이상 바뀌지 않는다', () => {
  const g = new Game({ rng: seeded(2) });
  run(g, goodPlayer(4), 120);
  assert.equal(g.phase, 'end');
  assert.deepEqual(g.update(step, [1], [5]), []);
});
