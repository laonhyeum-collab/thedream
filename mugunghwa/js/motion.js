// 움직임 재기 — 카메라 영상의 앞뒤 장면을 비교해 "얼마나 바뀌었는지"만 셉니다.
// 모든 계산은 이 기기의 메모리 안에서만 하고, 영상은 저장하거나 보내지 않습니다.

export const W = 80;   // 작게 줄여서 비교 (얼굴을 알아볼 수 없을 만큼 작음)
export const H = 60;
export const PIXEL_THRESHOLD = 24; // 밝기가 이만큼 넘게 바뀐 점만 '움직임'
export const FULL = 0.06;          // 구역의 6%가 바뀌면 "온 힘으로 움직임"(1.0)
export const GLOBAL_JUMP = 0.55;   // 화면 전체가 한꺼번에 바뀌면(조명·카메라 밝기 조절) 무시
export const ARM_ROWS = 0.75;      // 팔을 셀 때는 화면 위쪽 75%만 봄 (다리는 빼고)
export const STROKE_HYST = 0.07;   // 움직임 중심이 화면 높이의 7% 넘게 되돌아오면 '한 번 흔듦'
export const STROKE_GAP = 0.18;    // 이 시간 안에 또 바뀌면 한 번으로 셈(초) — 두 팔·몸 들썩임이 겹쳐 두 번 세지 않게

/**
 * 화면(거울처럼 뒤집힌 모습) 기준 구역. 1P = 왼쪽, 2P = 오른쪽.
 * 가운데 10%는 두 사람이 겹치지 않도록 비워 둡니다.
 */
export function zonesFor(players) {
  if (players === 2) return [[0, 0.45], [0.55, 1]];
  return [[0, 1]];
}

/** RGBA → 밝기(0~255) 배열 */
export function toLuma(rgba, out = new Uint8Array(rgba.length / 4)) {
  for (let i = 0, j = 0; j < out.length; i += 4, j++) {
    out[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
  }
  return out;
}

/**
 * 두 장면을 비교해 구역마다 바뀐 비율(0~1)을 돌려줍니다.
 * cur/prev 는 카메라 원본 방향(뒤집기 전) 밝기 배열입니다.
 * 화면에는 거울처럼 보여 주므로, 원본의 오른쪽 = 화면의 왼쪽(1P) 입니다.
 */
export function diffZones(cur, prev, w, h, zones, threshold = PIXEL_THRESHOLD) {
  const counts = new Array(zones.length).fill(0);
  const totals = new Array(zones.length).fill(0);
  // 팔 구역: 사람 구역마다 왼쪽 반·오른쪽 반 (팔 하나씩)
  const armCount = new Array(zones.length * 2).fill(0);
  const armSumY = new Array(zones.length * 2).fill(0);
  const armTotal = new Array(zones.length * 2).fill(0);
  const armRows = Math.round(h * ARM_ROWS);
  // 열(x)마다 어느 구역인지 미리 계산
  const colZone = new Int8Array(w).fill(-1);
  const colArm = new Int8Array(w).fill(-1);
  for (let x = 0; x < w; x++) {
    const screenX = 1 - (x + 0.5) / w; // 거울 뒤집기
    const z = zones.findIndex(([a, b]) => screenX >= a && screenX < b);
    colZone[x] = z;
    if (z >= 0) colArm[x] = z * 2 + (screenX < (zones[z][0] + zones[z][1]) / 2 ? 0 : 1);
  }
  let changed = 0;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    const upper = y < armRows;
    for (let x = 0; x < w; x++) {
      const i = row + x;
      const d = cur[i] - prev[i];
      const moved = d > threshold || d < -threshold;
      if (moved) changed++;
      const z = colZone[x];
      if (z >= 0) {
        totals[z]++;
        if (moved) counts[z]++;
        if (upper) {
          const a = colArm[x];
          armTotal[a]++;
          if (moved) { armCount[a]++; armSumY[a] += y; }
        }
      }
    }
  }
  return {
    zones: counts.map((c, k) => (totals[k] ? c / totals[k] : 0)),
    global: changed / (w * h),
    // 팔 구역마다: 바뀐 비율, 움직임 중심 높이(0=위, 1=아래)
    arms: armCount.map((c, k) => ({
      fraction: armTotal[k] ? c / armTotal[k] : 0,
      y: c ? (armSumY[k] / c + 0.5) / h : null,
    })),
  };
}

/** 바뀐 비율 → 움직임 크기(0~1). 가만히 있어도 생기는 잡음(floor)은 빼고 셉니다. */
export function effortFrom(fraction, floor = 0) {
  const v = (fraction - floor) / FULL;
  return v <= 0 ? 0 : v >= 1 ? 1 : v;
}

/**
 * 움직임 중심이 위↔아래로 방향을 바꿀 때마다 '한 번 흔듦'으로 셉니다.
 * 처음 움직이기 시작한 방향도 한 번으로 셉니다(위로 1번, 아래로 2번 …).
 */
export class StrokeCounter {
  constructor(hyst = STROKE_HYST) { this.hyst = hyst; this.reset(); }
  reset() { this.dir = 0; this.lo = null; this.hi = null; this.y = null; this.idle = 0; }
  /** @param y 움직임 중심 높이(0~1), 움직임이 없으면 null  @returns 이번에 흔든 것으로 셌는지 */
  push(y, dt) {
    if (y == null) {
      this.idle += dt;
      if (this.idle > 0.6) this.reset(); // 잠깐 쉬면 처음부터
      return false;
    }
    this.idle = 0;
    this.y = this.y == null ? y : this.y + (y - this.y) * 0.6; // 살짝 다듬기
    const v = this.y;
    if (this.lo == null) { this.lo = this.hi = v; return false; }
    if (this.dir >= 0) this.hi = Math.max(this.hi, v);
    if (this.dir <= 0) this.lo = Math.min(this.lo, v);
    if (this.dir >= 0 && this.hi - v > this.hyst) { this.dir = -1; this.lo = this.hi = v; return true; }
    if (this.dir <= 0 && v - this.lo > this.hyst) { this.dir = 1; this.lo = this.hi = v; return true; }
    return false;
  }
}

/** 프레임을 계속 넣으면 사람마다 부드럽게 다듬은 움직임 크기를 알려 주는 도구 */
export class MotionTracker {
  constructor(players = 1) {
    this.setPlayers(players);
    this.prev = null;
  }

  setPlayers(players) {
    this.players = players;
    this.zones = zonesFor(players);
    this.floor = new Array(players).fill(0.004);
    this.effort = new Array(players).fill(0);
    this.raw = new Array(players).fill(0);
    this.arms = Array.from({ length: players * 2 }, () => new StrokeCounter());
    this.lastStroke = new Array(players).fill(-1);
    this.strokes = new Array(players).fill(0);   // 지금까지 흔든 횟수
    this.pending = new Array(players).fill(0);   // 아직 놀이에 넘기지 않은 횟수
    this.clock = 0;
    this.calib = null;
  }

  /** 지난번 이후 새로 흔든 횟수를 꺼냄 */
  takeStrokes() {
    const out = this.pending.slice();
    this.pending.fill(0);
    return out;
  }

  /** 가만히 서 있는 동안 잡음 크기 재기 시작/끝 */
  startCalibration() { this.calib = this.zones.map(() => []); }
  finishCalibration() {
    if (!this.calib) return this.floor;
    this.floor = this.calib.map((arr) => {
      if (!arr.length) return 0.004;
      const sorted = [...arr].sort((a, b) => a - b);
      const p80 = sorted[Math.floor(sorted.length * 0.8)];
      // 재는 동안 누가 움직였어도 너무 둔해지지 않게 상한을 둠
      return Math.min(0.012, p80 + 0.003);
    });
    this.calib = null;
    return this.floor;
  }

  /** @param luma 밝기 배열(W*H)  @param dt 지난 시간(초) */
  push(luma, dt) {
    if (!this.prev) { this.prev = Uint8Array.from(luma); return this.effort; }
    const r = diffZones(luma, this.prev, W, H, this.zones);
    this.prev.set(luma);
    this.clock += dt;
    if (r.global > GLOBAL_JUMP) return this.effort; // 화면 전체 번쩍: 이번 장면은 건너뜀
    if (this.calib) r.zones.forEach((f, k) => this.calib[k].push(f));
    // 팔 흔들기 세기
    r.arms.forEach((arm, a) => {
      const k = a >> 1;
      const enough = arm.fraction > this.floor[k] + 0.008;
      if (this.arms[a].push(enough ? arm.y : null, dt) && this.clock - this.lastStroke[k] > STROKE_GAP) {
        this.lastStroke[k] = this.clock;
        this.strokes[k] += 1;
        this.pending[k] += 1;
      }
    });
    r.zones.forEach((f, k) => {
      this.raw[k] = f;
      const target = effortFrom(f, this.floor[k]);
      // 올라갈 땐 빠르게, 내려갈 땐 조금 천천히
      const tau = target > this.effort[k] ? 0.08 : 0.25;
      const a = 1 - Math.exp(-dt / tau);
      this.effort[k] += (target - this.effort[k]) * a;
    });
    return this.effort;
  }
}
