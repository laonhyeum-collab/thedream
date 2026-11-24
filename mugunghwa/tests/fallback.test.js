import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decideMode, cameraPrecheck, problemFromError, PROBLEM_TEXT,
  ManualGame, chantLength, MANUAL_GOAL, MANUAL_PUSHBACK, TEAM_LOOK,
} from '../js/fallback.js';

const err = (name) => Object.assign(new Error(name), { name });

test('카메라가 잘 되면 카메라 놀이', () => {
  assert.deepEqual(decideMode({ secure: true, hasGetUserMedia: true }), { mode: 'camera', reason: null });
  assert.deepEqual(decideMode(), { mode: 'camera', reason: null });
});

test('https가 아니거나 카메라 기능이 없으면 켜 보기 전에 버튼 놀이', () => {
  assert.equal(cameraPrecheck({ secure: false }), 'insecure');
  assert.equal(cameraPrecheck({ hasGetUserMedia: false }), 'notfound');
  assert.equal(cameraPrecheck({}), null);
  assert.deepEqual(decideMode({ secure: false }), { mode: 'buttons', reason: 'insecure' });
  assert.deepEqual(decideMode({ hasGetUserMedia: false }), { mode: 'buttons', reason: 'notfound' });
});

test('카메라 오류 → 버튼 놀이와 까닭', () => {
  const cases = {
    NotAllowedError: 'denied',
    PermissionDeniedError: 'denied',
    SecurityError: 'denied',
    NotFoundError: 'notfound',
    DevicesNotFoundError: 'notfound',
    OverconstrainedError: 'notfound',
    NotReadableError: 'busy',
    TrackStartError: 'busy',
    AbortError: 'busy',
    InsecureError: 'insecure',
    TypeError: 'unknown',
  };
  for (const [name, reason] of Object.entries(cases)) {
    assert.equal(problemFromError(err(name)), reason, name);
    assert.deepEqual(decideMode({ error: err(name) }), { mode: 'buttons', reason });
    assert.ok(PROBLEM_TEXT[reason], `${reason} 안내 글이 있음`);
  }
  assert.equal(problemFromError(null), 'unknown');
  assert.equal(problemFromError('이상한 값'), 'unknown');
  assert.match(PROBLEM_TEXT.denied, /허락/);
});

test('술래 부르는 길이는 1.8~6초', () => {
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 500; i++) {
    const s = chantLength(rng);
    assert.ok(s >= 1.8 && s <= 6, String(s));
  }
  assert.ok(chantLength(() => 0.01) < 2.5);
  assert.ok(chantLength(() => 0.99) >= 5);
});

test('버튼 놀이: 팀 수는 1~4로 맞춤', () => {
  assert.equal(new ManualGame({ teams: 3 }).teams.length, 3);
  assert.equal(new ManualGame({ teams: 9 }).teams.length, TEAM_LOOK.length);
  assert.equal(new ManualGame({ teams: 0 }).teams.length, 2);
  assert.equal(new ManualGame().teams.length, 2);
});

test('버튼 놀이: 준비 → 부르기 → (저절로) 얼음 → 다시 부르기', () => {
  const g = new ManualGame({ teams: 2 });
  assert.equal(g.phase, 'ready');
  assert.equal(g.step(0), null, '부르기 전엔 앞으로 못 감');
  assert.equal(g.markMoved(0), null, '얼음 전엔 걸리지 않음');
  const ev = g.startChant(3);
  assert.deepEqual(ev, { type: 'phase', phase: 'chant', length: 3 });
  assert.equal(g.round, 1);
  assert.equal(g.startChant(3), null, '부르는 중에 또 누르면 무시');
  assert.equal(g.chantProgress, 1);
  for (let i = 0; i < 15; i++) assert.deepEqual(g.update(0.1), []);
  assert.ok(g.chantProgress >= 5 && g.chantProgress <= 6);
  let events = [];
  for (let i = 0; i < 20 && g.phase === 'chant'; i++) events.push(...g.update(0.1));
  assert.equal(g.phase, 'freeze');
  assert.deepEqual(events.at(-1), { type: 'phase', phase: 'freeze' });
  assert.equal(g.chantProgress, 10);
  assert.deepEqual(g.update(0.25), [], '얼음은 선생님이 다시 누를 때까지 계속');
  assert.equal(g.phase, 'freeze');
  assert.ok(g.startChant(2));
  assert.equal(g.round, 2);
});

test('버튼 놀이: 부를 때 한 걸음씩, 얼음 때 움직이면 뒤로 (한 번만)', () => {
  const g = new ManualGame({ teams: 2 });
  g.startChant(3);
  for (let i = 0; i < 5; i++) g.step(0);
  g.step(1);
  assert.equal(g.teams[0].steps, 5);
  assert.equal(g.teams[1].steps, 1);
  g.freeze();
  assert.equal(g.step(0), null, '얼음 때는 앞으로 못 감');
  assert.deepEqual(g.markMoved(0), { type: 'caught', team: 0, from: 5, to: 5 - MANUAL_PUSHBACK });
  assert.equal(g.markMoved(0), null, '같은 얼음에 두 번 걸리지 않음');
  assert.deepEqual(g.markMoved(1), { type: 'caught', team: 1, from: 1, to: 0 }, '0보다 뒤로는 안 감');
  assert.equal(g.markMoved(5), null, '없는 팀');
  assert.equal(g.teams[0].caught, 1);
  g.startChant(3);
  assert.ok(g.markMoved(0) === null);
  g.freeze();
  assert.ok(g.markMoved(0), '다음 얼음에는 다시 걸릴 수 있음');
  assert.equal(g.teams[0].caught, 2);
});

test('버튼 놀이: 먼저 끝까지 간 팀이 이김, 그 뒤엔 아무것도 안 바뀜', () => {
  const g = new ManualGame({ teams: 3 });
  g.startChant(5);
  let last = null;
  for (let i = 0; i < MANUAL_GOAL; i++) last = g.step(2);
  assert.deepEqual(last, { type: 'win', team: 2 });
  assert.equal(g.phase, 'end');
  assert.equal(g.winner, 2);
  assert.equal(g.step(0), null);
  assert.equal(g.startChant(), null);
  assert.deepEqual(g.update(10), []);
});
