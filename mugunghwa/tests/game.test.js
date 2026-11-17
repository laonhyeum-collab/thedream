import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, DIFFICULTY, GOAL, MAX_ROUNDS } from '../js/game.js';

// 늘 같은 결과가 나오는 가짜 주사위
function seeded(seed = 1) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}
const step = 1 / 30;

function run(game, effortFn, seconds) {
  const events = [];
  for (let i = 0; i < seconds / step; i++) events.push(...game.update(step, effortFn(game)));
  return events;
}

test('카운트다운 3초 뒤 "무궁화 꽃이 피었습니다"가 시작된다', () => {
  const g = new Game({ rng: seeded() });
  assert.equal(g.phase, 'countdown');
  run(g, () => [1], 2.9);
  assert.equal(g.phase, 'countdown');
  assert.equal(g.players[0].progress, 0, '카운트다운 중에는 움직여도 안 나감');
  run(g, () => [0], 0.2);
  assert.equal(g.phase, 'chant');
});

test('부르는 동안 움직이면 앞으로 가고, 가만히 있으면 그대로', () => {
  const g = new Game({ rng: seeded() });
  run(g, () => [0], 3.05);
  const before = g.players[0].progress;
  run(g, () => [0], 1);
  assert.equal(g.players[0].progress, before);
  run(g, () => [1], 1);
  assert.ok(g.players[0].progress > before + 5);
});

test('"얼음!" 때 움직이면 걸려서 뒤로 가고, 한 번 얼음에 한 번만 걸린다', () => {
  for (const d of Object.keys(DIFFICULTY)) {
    const g = new Game({ difficulty: d, rng: seeded(7) });
    run(g, () => [0], 3.05);
    // 부르는 동안 달려서 앞으로
    while (g.phase === 'chant') g.update(step, [1]);
    assert.equal(g.phase, 'freeze');
    const before = g.players[0].progress;
    const ev = [];
    while (g.phase === 'freeze') ev.push(...g.update(step, [1]));
    const caught = ev.filter((e) => e.type === 'caught');
    assert.equal(caught.length, 1, d);
    assert.equal(g.players[0].progress, Math.max(0, before - DIFFICULTY[d].pushBack), d);
  }
});

test('"얼음!" 직후 잠깐은 봐준다 (멈출 시간)', () => {
  const g = new Game({ difficulty: 'hawk', rng: seeded(3) });
  run(g, () => [0], 3.05);
  while (g.phase === 'chant') g.update(step, [0]);
  const ev = [];
  const graceSteps = Math.floor(DIFFICULTY.hawk.grace / step) - 1;
  for (let i = 0; i < graceSteps; i++) ev.push(...g.update(step, [1]));
  assert.equal(ev.filter((e) => e.type === 'caught').length, 0);
});

test('얼음 때 살짝 흔들린 건 너그러움은 봐주고 매의 눈은 잡는다', () => {
  const wobble = 0.3;
  const result = {};
  for (const d of ['easy', 'normal', 'hawk']) {
    const g = new Game({ difficulty: d, rng: seeded(5) });
    run(g, () => [0], 3.05);
    while (g.phase === 'chant') g.update(step, [0]);
    let caught = 0;
    while (g.phase === 'freeze') caught += g.update(step, [wobble]).filter((e) => e.type === 'caught').length;
    result[d] = caught;
  }
  assert.deepEqual(result, { easy: 0, normal: 1, hawk: 1 });
  // 아주 작은 흔들림(숨쉬기 정도)은 매의 눈도 봐줌
  const g = new Game({ difficulty: 'hawk', rng: seeded(5) });
  run(g, () => [0], 3.05);
  while (g.phase === 'chant') g.update(step, [0]);
  let caught = 0;
  while (g.phase === 'freeze') caught += g.update(step, [0.08]).filter((e) => e.type === 'caught').length;
  assert.equal(caught, 0);
});

test('규칙을 잘 지키면(부를 때 달리고 얼음 때 멈추면) 도착해서 이긴다', () => {
  const g = new Game({ rng: seeded(11) });
  const ev = run(g, (gm) => [gm.phase === 'chant' ? 0.8 : 0], 120);
  const win = ev.find((e) => e.type === 'win');
  assert.ok(win, '이겨야 함');
  assert.equal(g.phase, 'end');
  assert.equal(g.players[0].progress, GOAL);
  assert.equal(g.players[0].caught, 0);
  assert.ok(win.time > 5 && win.time < 45, `걸린 시간 ${win.time.toFixed(1)}초`);
});

test(`웬만큼 열심히 움직이면 노래 ${MAX_ROUNDS}번 안에 도착한다 (노래 빠르기가 달라도)`, () => {
  for (let seed = 1; seed <= 50; seed++) {
    for (const effort of [0.35, 0.5, 0.6, 1]) {
      const g = new Game({ rng: seeded(seed) });
      run(g, (gm) => [gm.phase === 'chant' ? effort : 0], 120);
      assert.equal(g.phase, 'end', `seed ${seed}, effort ${effort}`);
      assert.ok(g.round <= MAX_ROUNDS, `seed ${seed}, effort ${effort}: ${g.round}번`);
    }
  }
  // 아주 살짝만 움직이면 5번으로는 모자람 (놀이가 너무 쉬워지지 않게)
  const g = new Game({ rng: seeded(3) });
  run(g, (gm) => [gm.phase === 'chant' ? 0.12 : 0], 120);
  assert.ok(g.round > MAX_ROUNDS);
});

test('둘이서: 각자 따로 움직이고, 먼저 도착한 사람이 이긴다', () => {
  const g = new Game({ players: 2, rng: seeded(13) });
  // 1P는 규칙대로, 2P는 얼음 때도 계속 움직임
  const ev = run(g, (gm) => [gm.phase === 'chant' ? 0.8 : 0, 0.8], 120);
  const win = ev.find((e) => e.type === 'win');
  assert.equal(win.player, 0);
  assert.equal(g.winner, 0);
  assert.ok(g.players[1].caught > 0);
  assert.equal(g.players[0].caught, 0);
});

test('끝난 뒤에는 더 이상 바뀌지 않는다', () => {
  const g = new Game({ rng: seeded(2) });
  run(g, (gm) => [gm.phase === 'chant' ? 1 : 0], 120);
  assert.equal(g.phase, 'end');
  assert.deepEqual(g.update(step, [1]), []);
});
