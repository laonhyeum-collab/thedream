// 카메라를 못 쓸 때를 위한 순수 로직 (화면·카메라와 상관없음)
// 1) 카메라 상태를 보고 '카메라 놀이'로 갈지 '버튼 놀이'로 갈지 정합니다.
// 2) 버튼 놀이: 선생님이 술래 버튼을 누르고, 움직인 팀을 버튼으로 표시합니다.

/** 카메라를 못 쓰는 까닭 → 아이들이 읽을 안내 */
export const PROBLEM_TEXT = {
  denied: '카메라 사용을 허락하지 않았어요. 주소창 옆 카메라 아이콘이나 기기 설정에서 허락할 수 있어요.',
  notfound: '이 기기에서 카메라를 찾지 못했어요.',
  busy: '다른 앱이 카메라를 쓰고 있어요. 그 앱을 닫고 다시 해 보세요.',
  insecure: '안전한 주소(https)에서 열어야 카메라를 쓸 수 있어요.',
  unknown: '카메라를 켜는 중에 문제가 생겼어요.',
};

/** 카메라를 켜 보기 전에 알 수 있는 문제 (없으면 null) */
export function cameraPrecheck({ secure = true, hasGetUserMedia = true } = {}) {
  if (!secure) return 'insecure';
  if (!hasGetUserMedia) return 'notfound';
  return null;
}

/** getUserMedia 오류 이름 → 까닭 */
export function problemFromError(err) {
  const name = (err && err.name) || '';
  if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(name)) return 'denied';
  if (['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError', 'ConstraintNotSatisfiedError'].includes(name)) return 'notfound';
  if (['NotReadableError', 'TrackStartError', 'AbortError'].includes(name)) return 'busy';
  if (name === 'InsecureError') return 'insecure';
  return 'unknown';
}

/**
 * 어떤 놀이로 갈지 정함.
 * @returns {{ mode: 'camera' | 'buttons', reason: string | null }}
 */
export function decideMode({ secure = true, hasGetUserMedia = true, error = null } = {}) {
  const pre = cameraPrecheck({ secure, hasGetUserMedia });
  if (pre) return { mode: 'buttons', reason: pre };
  if (error) return { mode: 'buttons', reason: problemFromError(error) };
  return { mode: 'camera', reason: null };
}

// ---------- 버튼 놀이 ----------
export const TEAM_LOOK = [
  { name: '토끼팀', emoji: '🐰', color: '#c2185b' },
  { name: '곰팀', emoji: '🐻', color: '#1d5fb4' },
  { name: '병아리팀', emoji: '🐥', color: '#8a5a00' },
  { name: '개구리팀', emoji: '🐸', color: '#2e7d32' },
];
export const MANUAL_GOAL = 10;     // 10걸음이면 술래에게 도착
export const MANUAL_PUSHBACK = 3;  // 움직이다 걸리면 3걸음 뒤로

/** 이번 "무궁화 꽃이 피었습니다" 길이(초): 대부분 보통, 가끔 아주 빠르거나 느리게 */
export function chantLength(rng = Math.random) {
  const r = rng();
  const between = (a, b) => a + (b - a) * rng();
  if (r < 0.15) return between(1.8, 2.4);
  if (r > 0.85) return between(5.0, 6.0);
  return between(2.8, 4.5);
}

export class ManualGame {
  constructor({ teams = 2, goal = MANUAL_GOAL, pushBack = MANUAL_PUSHBACK, rng = Math.random } = {}) {
    const n = Math.max(1, Math.min(TEAM_LOOK.length, Math.floor(teams) || 2));
    this.goal = goal;
    this.pushBack = pushBack;
    this.rng = rng;
    this.teams = Array.from({ length: n }, (_, i) => ({ id: i, steps: 0, caught: 0, caughtThisFreeze: false }));
    this.phase = 'ready';   // ready → chant → freeze → chant → ... → end
    this.phaseTime = 0;
    this.phaseLength = 0;
    this.round = 0;
    this.winner = null;
  }

  /** 지금 몇 글자까지 불렀는지 (0~10) */
  get chantProgress() {
    if (this.phase === 'freeze') return 10;
    if (this.phase !== 'chant') return 0;
    return Math.min(10, Math.floor((this.phaseTime / this.phaseLength) * 10) + 1);
  }

  /** 술래 버튼: "무궁화 꽃이 피었습니다" 시작. 부르는 중이거나 끝났으면 무시. */
  startChant(length = chantLength(this.rng)) {
    if (this.phase !== 'ready' && this.phase !== 'freeze') return null;
    this.phase = 'chant';
    this.phaseTime = 0;
    this.phaseLength = length;
    this.round += 1;
    for (const t of this.teams) t.caughtThisFreeze = false;
    return { type: 'phase', phase: 'chant', length };
  }

  /** 다 부르면 술래가 돌아봄 ("얼음!") */
  freeze() {
    if (this.phase !== 'chant') return null;
    this.phase = 'freeze';
    this.phaseTime = 0;
    this.phaseLength = 0;
    return { type: 'phase', phase: 'freeze' };
  }

  /** 시간 흐름: 다 부르면 저절로 얼음 */
  update(dt) {
    const events = [];
    if (this.phase !== 'chant') return events;
    this.phaseTime += Math.max(0, Math.min(dt, 0.25));
    if (this.phaseTime >= this.phaseLength) events.push(this.freeze());
    return events;
  }

  /** 부르는 동안 한 걸음 앞으로 */
  step(i) {
    const t = this.teams[i];
    if (!t || this.phase !== 'chant') return null;
    t.steps = Math.min(this.goal, t.steps + 1);
    if (t.steps >= this.goal) {
      this.phase = 'end';
      this.winner = i;
      return { type: 'win', team: i };
    }
    return { type: 'step', team: i, steps: t.steps };
  }

  /** 얼음일 때 움직인 팀 표시 → 뒤로 (한 번 얼음에 한 번만) */
  markMoved(i) {
    const t = this.teams[i];
    if (!t || this.phase !== 'freeze' || t.caughtThisFreeze) return null;
    t.caughtThisFreeze = true;
    t.caught += 1;
    const from = t.steps;
    t.steps = Math.max(0, t.steps - this.pushBack);
    return { type: 'caught', team: i, from, to: t.steps };
  }
}
