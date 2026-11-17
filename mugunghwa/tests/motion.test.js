import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffZones, zonesFor, effortFrom, MotionTracker, W, H, FULL } from '../js/motion.js';

const blank = () => new Uint8Array(W * H).fill(100);
/** 카메라 원본 기준 x 범위에 네모를 그림 */
function box(frame, x0, x1, y0, y1, v = 220) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) frame[y * W + x] = v;
  return frame;
}

test('거울처럼: 카메라 원본의 오른쪽 움직임은 화면 왼쪽(1P)으로 센다', () => {
  const prev = blank();
  const cur = box(blank(), W - 20, W, 0, H); // 원본 오른쪽 끝
  const r = diffZones(cur, prev, W, H, zonesFor(2));
  assert.ok(r.zones[0] > 0.3, `1P ${r.zones[0]}`);
  assert.equal(r.zones[1], 0);
});

test('카메라 원본의 왼쪽 움직임은 2P', () => {
  const r = diffZones(box(blank(), 0, 20, 0, H), blank(), W, H, zonesFor(2));
  assert.equal(r.zones[0], 0);
  assert.ok(r.zones[1] > 0.3);
});

test('가운데 빈 칸의 움직임은 아무도 아님', () => {
  const r = diffZones(box(blank(), 37, 43, 0, H), blank(), W, H, zonesFor(2));
  assert.deepEqual(r.zones, [0, 0]);
  assert.ok(r.global > 0);
});

test('작은 밝기 변화(카메라 잡음)는 움직임이 아님', () => {
  const r = diffZones(blank().fill(110), blank(), W, H, zonesFor(1));
  assert.equal(r.zones[0], 0);
});

test('움직임 크기는 잡음을 빼고 0~1로', () => {
  assert.equal(effortFrom(0.002, 0.004), 0);
  assert.equal(effortFrom(1, 0), 1);
  assert.ok(Math.abs(effortFrom(FULL / 2, 0) - 0.5) < 1e-9);
});

test('추적기: 계속 움직이면 막대가 올라가고, 멈추면 내려간다', () => {
  const t = new MotionTracker(2);
  let flip = false;
  t.push(blank(), 1 / 30);
  for (let i = 0; i < 30; i++) {
    flip = !flip;
    const f = blank();
    box(f, W - 25, W - 5, flip ? 10 : 25, flip ? 40 : 55); // 1P 쪽에서 위아래로 들썩
    t.push(f, 1 / 30);
  }
  assert.ok(t.effort[0] > 0.8, `1P ${t.effort[0]}`);
  assert.ok(t.effort[1] < 0.01, `2P ${t.effort[1]}`);
  const still = blank(); box(still, W - 25, W - 5, 10, 40);
  for (let i = 0; i < 30; i++) t.push(still, 1 / 30);
  assert.ok(t.effort[0] < 0.05, `멈춘 뒤 ${t.effort[0]}`);
});

test('화면 전체가 한꺼번에 바뀌면(불 켜기 등) 무시', () => {
  const t = new MotionTracker(1);
  t.push(blank(), 1 / 30);
  t.push(blank().fill(230), 1 / 30);
  assert.equal(t.effort[0], 0);
});

test('가만히 재기: 잡음 수준을 기억하고, 너무 크면 상한', () => {
  const t = new MotionTracker(1);
  t.startCalibration();
  t.calib[0].push(...Array(50).fill(0.005));
  assert.ok(Math.abs(t.finishCalibration()[0] - 0.008) < 1e-9);
  t.startCalibration();
  t.calib[0].push(...Array(50).fill(0.5));
  assert.equal(t.finishCalibration()[0], 0.012);
});

// ---------- 팔 흔들기 세기 ----------
import { StrokeCounter } from '../js/motion.js';

test('흔들기 세기: 위아래로 3번 왕복하면 6번', () => {
  const sc = new StrokeCounter();
  let n = 0;
  for (let i = 0; i < 90; i++) {
    const y = 0.4 + 0.15 * Math.sin((i / 30) * Math.PI * 2); // 1초에 1번 왕복, 3초
    if (sc.push(y, 1 / 30)) n++;
  }
  assert.ok(n >= 5 && n <= 7, `${n}번`);
});

test('흔들기 세기: 조금 떨리는 건 안 셈', () => {
  const sc = new StrokeCounter();
  let n = 0;
  for (let i = 0; i < 90; i++) if (sc.push(0.4 + 0.015 * Math.sin(i), 1 / 30)) n++;
  assert.equal(n, 0);
});

/** 카메라 장면 흉내: 1P 쪽(원본 오른쪽)에서 팔 하나가 위아래로 움직임 */
function armFrame(yTop) {
  const f = blank();
  box(f, W - 30, W - 10, 18, 40);              // 몸
  box(f, W - 14, W - 4, yTop, yTop + 6, 30);  // 팔 (어두운 색)
  return f;
}

test('추적기: 팔을 흔든 횟수를 사람별로 센다', () => {
  const t = new MotionTracker(2);
  t.push(armFrame(25), 1 / 30);
  for (let i = 1; i <= 120; i++) {               // 4초 동안 1초에 1번 왕복
    const y = Math.round(22 + 14 * Math.sin((i / 30) * Math.PI * 2));
    t.push(armFrame(y), 1 / 30);
  }
  const got = t.takeStrokes();
  assert.ok(got[0] >= 6 && got[0] <= 9, `1P ${got[0]}번 (약 8번 기대)`);
  assert.equal(got[1], 0, '2P는 안 흔듦');
  assert.deepEqual(t.takeStrokes(), [0, 0], '꺼낸 뒤에는 0');
  // 가만히 있으면 안 셈
  for (let i = 0; i < 60; i++) t.push(armFrame(22), 1 / 30);
  assert.deepEqual(t.takeStrokes(), [0, 0]);
});
