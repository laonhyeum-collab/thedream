// 무궁화 꽃이 피었습니다 — 놀이 규칙 (화면·카메라와 상관없는 순수 로직)
// update(dt, efforts) 에 "얼마나 움직였는지(0~1)" 만 넣어 주면 진행 상황이 바뀝니다.

export const DIFFICULTY = {
  easy: {
    label: '너그러움',
    grace: 0.9,        // "얼음!" 뒤 멈출 때까지 봐주는 시간(초)
    catchLevel: 0.42,  // 이만큼보다 크게 움직이면 걸림 (0~1)
    catchHold: 0.35,   // 그 움직임이 이만큼 이어져야 걸림(초)
    pushBack: 10,      // 걸리면 뒤로 가는 칸(전체 100)
    freeze: [2.0, 3.0],
  },
  normal: {
    label: '보통',
    grace: 0.6,
    catchLevel: 0.28,
    catchHold: 0.2,
    pushBack: 15,
    freeze: [2.2, 3.5],
  },
  hawk: {
    label: '매의 눈',
    grace: 0.35,
    catchLevel: 0.16,
    catchHold: 0.1,
    pushBack: 20,
    freeze: [2.5, 4.0],
  },
};

export const CHANT = ['무', '궁', '화', ' ', '꽃', '이', ' ', '피', '었', '습', '니', '다'];
export const CHANT_SYLLABLES = CHANT.filter((c) => c !== ' ').length; // 10

export const SPEED = 7;          // 온 힘으로 움직이면 1초에 7칸
export const COUNTDOWN = 3;      // 시작 전 3, 2, 1
export const GOAL = 100;

export class Game {
  constructor({ players = 1, difficulty = 'normal', rng = Math.random } = {}) {
    this.cfg = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    this.difficulty = DIFFICULTY[difficulty] ? difficulty : 'normal';
    this.rng = rng;
    this.players = Array.from({ length: players }, (_, i) => ({
      id: i,
      progress: 0,
      caught: 0,           // 걸린 횟수
      caughtThisFreeze: false,
      overTime: 0,         // 얼음 중 크게 움직인 시간 누적
      moving: 0,           // 화면 표시용 (최근 움직임)
    }));
    this.phase = 'countdown';
    this.phaseTime = 0;
    this.phaseLength = COUNTDOWN;
    this.elapsed = 0;      // 놀이 시간(카운트다운 제외)
    this.round = 0;
    this.winner = null;
  }

  rand(a, b) { return a + (b - a) * this.rng(); }

  /** 이번 "무궁화 꽃이 피었습니다" 길이: 대부분 보통, 가끔 아주 빠르거나 느리게 */
  nextChantLength() {
    const r = this.rng();
    if (r < 0.15) return this.rand(1.8, 2.4);  // 빠르게!
    if (r > 0.85) return this.rand(5.0, 6.0);  // 느으리게~
    return this.rand(2.8, 4.5);
  }

  /** 지금 몇 글자까지 불렀는지 (0~10) */
  get chantProgress() {
    if (this.phase !== 'chant') return this.phase === 'freeze' ? CHANT_SYLLABLES : 0;
    return Math.min(CHANT_SYLLABLES, Math.floor((this.phaseTime / this.phaseLength) * CHANT_SYLLABLES) + 1);
  }

  /** 얼음 뒤 봐주는 시간 안인지 */
  get inGrace() {
    return this.phase === 'freeze' && this.phaseTime < this.cfg.grace;
  }

  startPhase(phase, length, events) {
    this.phase = phase;
    this.phaseTime = 0;
    this.phaseLength = length;
    if (phase === 'chant') this.round += 1;
    if (phase === 'freeze') {
      for (const p of this.players) { p.caughtThisFreeze = false; p.overTime = 0; }
    }
    events.push({ type: 'phase', phase, length });
  }

  /**
   * @param {number} dt  지난 시간(초)
   * @param {number[]} efforts  사람마다 움직임 크기 0~1
   * @returns {object[]} 일어난 일 목록 (phase / caught / win)
   */
  update(dt, efforts = []) {
    const events = [];
    if (this.phase === 'end') return events;
    dt = Math.max(0, Math.min(dt, 0.25)); // 탭 전환 등으로 시간이 튀어도 안전하게
    this.phaseTime += dt;
    if (this.phase !== 'countdown') this.elapsed += dt;

    this.players.forEach((p, i) => {
      const e = Math.max(0, Math.min(1, efforts[i] || 0));
      p.moving = e;

      if (this.phase === 'chant') {
        p.progress = Math.min(GOAL, p.progress + SPEED * e * dt);
      } else if (this.phase === 'freeze' && !this.inGrace && !p.caughtThisFreeze) {
        if (e > this.cfg.catchLevel) p.overTime += dt;
        else p.overTime = Math.max(0, p.overTime - dt * 0.5);
        if (p.overTime >= this.cfg.catchHold) {
          p.caughtThisFreeze = true;
          p.caught += 1;
          const from = p.progress;
          p.progress = Math.max(0, p.progress - this.cfg.pushBack);
          events.push({ type: 'caught', player: i, from, to: p.progress });
        }
      }
    });

    // 도착한 사람이 있나? (부르는 동안에만 앞으로 가므로 여기서 확인)
    const arrived = this.players.filter((p) => p.progress >= GOAL);
    if (arrived.length) {
      // 동시에 도착하면 더 많이 움직인 사람이 아니라 '덜 걸린' 사람, 그래도 같으면 1P
      arrived.sort((a, b) => a.caught - b.caught || a.id - b.id);
      this.winner = arrived[0].id;
      this.phase = 'end';
      events.push({ type: 'win', player: this.winner, time: this.elapsed });
      return events;
    }

    if (this.phaseTime >= this.phaseLength) {
      if (this.phase === 'countdown' || this.phase === 'freeze') {
        this.startPhase('chant', this.nextChantLength(), events);
      } else if (this.phase === 'chant') {
        this.startPhase('freeze', this.rand(...this.cfg.freeze), events);
      }
    }
    return events;
  }
}
