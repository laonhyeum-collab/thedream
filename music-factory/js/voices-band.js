// 악기 소리 모음: Web Audio 로 악기 소리를 직접 만들어요 (음원 파일 없음).
import { midiToFreq } from './engine.js';
// ---------- 악기 소리 ----------
// 모든 소리 함수: (s, out, t, beats, beat, chord)
//   s = 도우미, out = 연결할 노드, t = 시작 시각(초), beats = 박자 수, beat = 1박 길이(초)
// 타악기는 박마다 두드리고, 음이 있는 악기는 길이만큼 소리를 끌어 "음의 길이"를 들려줍니다.

export function kick(s, out, t, vol = 1) {
  const o = s.osc('sine', 150, t, t + 0.45);
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  const g = s.gain(0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.95 * vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  o.connect(g).connect(out);
}

export function hat(s, out, t, len = 0.05, vol = 0.22) {
  const n = s.noise(t, t + len + 0.05);
  const hp = s.filter('highpass', 7000);
  const g = s.gain(0);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  n.connect(hp).connect(g).connect(out);
}

export function snareHit(s, out, t, vol = 1) {
  const n = s.noise(t, t + 0.25);
  const bp = s.filter('bandpass', 1900, 0.7);
  const g = s.gain(0);
  g.gain.setValueAtTime(0.55 * vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  n.connect(bp).connect(g).connect(out);
  const o = s.osc('triangle', 200, t, t + 0.15);
  o.frequency.exponentialRampToValueAtTime(150, t + 0.1);
  const og = s.gain(0);
  og.gain.setValueAtTime(0.35 * vol, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(og).connect(out);
}

export function crash(s, out, t, len) {
  const n = s.noise(t, t + len + 0.1);
  const hp = s.filter('highpass', 4500);
  const g = s.gain(0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.32, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  n.connect(hp).connect(g).connect(out);
}

// 음이 있는 소리의 기본 모양: 빠르게 커졌다가 → 유지 → 길이 끝에서 사라짐
export function shape(s, t, end, { attack = 0.01, peak = 0.3, sustain = 0.2, decay = 0.25, release = 0.08 } = {}) {
  const g = s.gain(0);
  const p = g.gain;
  p.setValueAtTime(0.0001, t);
  p.exponentialRampToValueAtTime(peak, t + attack);
  p.exponentialRampToValueAtTime(Math.max(sustain, 0.0002), Math.min(end, t + attack + decay));
  p.setValueAtTime(Math.max(sustain, 0.0002), end);
  p.exponentialRampToValueAtTime(0.0001, end + release);
  return g;
}

let distortionCurve = null;
export function distortion(s) {
  if (!distortionCurve) {
    const k = 60, n = 2048;
    distortionCurve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      distortionCurve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }
  }
  const ws = s.ctx.createWaveShaper();
  ws.curve = distortionCurve;
  ws.oversample = '2x';
  return ws;
}

export const BAND_VOICES = {
  // 얼음: 드럼 (박마다 쿵, 반박에 칙)
  drum(s, out, t, beats, beat) {
    for (let b = 0; b < beats; b += 1) {
      kick(s, out, t + b * beat, b % 2 === 0 ? 1 : 0.8);
      if (b + 0.5 < beats) hat(s, out, t + (b + 0.5) * beat);
    }
  },
  // 떡: 스네어 (박마다 탁)
  snare(s, out, t, beats, beat) {
    for (let b = 0; b < beats; b += 1) snareHit(s, out, t + b * beat, b % 2 === 0 ? 1 : 0.75);
  },
  // 시리얼: 심벌즈 (처음에 차앙~ 그다음 반박마다 츠)
  cymbal(s, out, t, beats, beat) {
    crash(s, out, t, Math.min(2.4, beats * beat + 0.6));
    for (let b = 0.5; b < beats; b += 0.5) hat(s, out, t + b * beat, 0.04, 0.16);
  },
  // 팥: 베이스 기타 (낮은 음 길게)
  bass(s, out, t, beats, beat, chord) {
    const end = t + beats * beat - 0.02;
    const f = midiToFreq(chord.root);
    const lp = s.filter('lowpass', 520, 3);
    const g = shape(s, t, end, { peak: 0.55, sustain: 0.38, decay: 0.2, release: 0.06 });
    s.osc('sawtooth', f, t, end + 0.1).connect(lp);
    s.osc('sine', f, t, end + 0.1).connect(lp);
    lp.connect(g).connect(out);
  },
  // 딸기: 일렉트릭 기타 (맑고 선명한 화음을 촤랑)
  guitarClean(s, out, t, beats, beat, chord) {
    const end = t + beats * beat - 0.02;
    chord.tones.forEach((m, i) => {
      const st = t + i * 0.018;
      const lp = s.filter('lowpass', 3200, 1);
      const g = shape(s, st, end, { attack: 0.004, peak: 0.16, sustain: 0.07, decay: 0.35, release: 0.1 });
      s.osc('sawtooth', midiToFreq(m - 12), st, end + 0.15).connect(lp);
      const o2 = s.osc('square', midiToFreq(m - 12) * 1.003, st, end + 0.15);
      const g2 = s.gain(0.4);
      o2.connect(g2).connect(lp);
      lp.connect(g).connect(out);
    });
  },
  // 초콜릿: 일렉트릭 기타 (지글지글 강한 파워 코드)
  guitarRock(s, out, t, beats, beat, chord) {
    const end = t + beats * beat - 0.02;
    const root = chord.root + 12;
    const ws = distortion(s);
    const pre = s.gain(0.5);
    const lp = s.filter('lowpass', 2600, 1);
    const g = shape(s, t, end, { attack: 0.005, peak: 0.2, sustain: 0.13, decay: 0.3, release: 0.08 });
    [root, root + 7, root + 12].forEach((m) => {
      s.osc('sawtooth', midiToFreq(m), t, end + 0.12).connect(pre);
      s.osc('sawtooth', midiToFreq(m) * 1.006, t, end + 0.12).connect(pre);
    });
    pre.connect(ws).connect(lp).connect(g).connect(out);
  },
  // 망고: 키보드 (밝은 멜로디 한 음)
  keysBright(s, out, t, beats, beat, chord) {
    const end = t + beats * beat - 0.02;
    const m = chord.tones[2] + 12;
    const g = shape(s, t, end, { attack: 0.004, peak: 0.3, sustain: 0.1, decay: 0.6, release: 0.12 });
    s.osc('triangle', midiToFreq(m), t, end + 0.2).connect(g);
    const h = s.gain(0.25);
    s.osc('sine', midiToFreq(m) * 2, t, end + 0.2).connect(h).connect(g);
    g.connect(out);
  },
  // 바나나: 키보드 (부드러운 화음)
  keysSoft(s, out, t, beats, beat, chord) {
    const end = t + beats * beat - 0.02;
    chord.tones.forEach((m) => {
      const g = shape(s, t, end, { attack: 0.02, peak: 0.13, sustain: 0.07, decay: 0.8, release: 0.2 });
      s.osc('sine', midiToFreq(m), t, end + 0.3).connect(g);
      const h = s.gain(0.15);
      s.osc('sine', midiToFreq(m) * 3, t, end + 0.3).connect(h).connect(g);
      g.connect(out);
    });
  },
  // 젤리: 신시사이저 (뿅뿅 튀는 아르페지오)
  synthFun(s, out, t, beats, beat, chord) {
    const steps = Math.max(1, Math.round(beats * 2));
    const len = (beats * beat) / steps;
    for (let i = 0; i < steps; i++) {
      const st = t + i * len;
      const m = chord.tones[i % 3] + 12;
      const o = s.osc('square', midiToFreq(m - 5), st, st + len + 0.05);
      o.frequency.setValueAtTime(midiToFreq(m - 5), st);
      o.frequency.exponentialRampToValueAtTime(midiToFreq(m), st + 0.04);
      const lp = s.filter('lowpass', 2200, 4);
      const g = shape(s, st, st + len * 0.7, { attack: 0.004, peak: 0.12, sustain: 0.05, decay: 0.1, release: 0.04 });
      o.connect(lp).connect(g).connect(out);
    }
  },
  // 아이스크림: 신시사이저 (몽글몽글 마무리 소리 + 반짝)
  synthPad(s, out, t, beats, beat, chord) {
    const end = t + beats * beat - 0.02;
    const lp = s.filter('lowpass', 700, 2);
    lp.frequency.setValueAtTime(700, t);
    lp.frequency.linearRampToValueAtTime(2600, end);
    const g = shape(s, t, end, { attack: Math.min(0.12, beats * beat * 0.3), peak: 0.1, sustain: 0.09, decay: 0.2, release: 0.3 });
    chord.tones.forEach((m) => {
      s.osc('sawtooth', midiToFreq(m) * 0.997, t, end + 0.4).connect(lp);
      s.osc('sawtooth', midiToFreq(m) * 1.004, t, end + 0.4).connect(lp);
    });
    lp.connect(g).connect(out);
    chord.tones.forEach((m, i) => {
      const st = t + i * Math.min(0.08, beat / 4);
      const sg = shape(s, st, st + 0.05, { attack: 0.003, peak: 0.07, sustain: 0.02, decay: 0.05, release: 0.25 });
      s.osc('sine', midiToFreq(m + 24), st, st + 0.4).connect(sg).connect(out);
    });
  },
};

