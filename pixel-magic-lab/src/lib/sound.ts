// Web Audio 로 만든 작고 귀여운 효과음 (파일 없이 합성)
let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean) {
  muted = m;
}

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.08) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  click: () => tone(660, 0, 0.06, 'triangle', 0.05),
  add: () => tone(880, 0, 0.07, 'triangle', 0.05),
  move: () => tone(520, 0, 0.05, 'sine', 0.03),
  paint: () => {
    tone(990, 0, 0.07, 'triangle', 0.05);
    tone(1320, 0.03, 0.06, 'sine', 0.03);
  },
  error: () => {
    tone(330, 0, 0.14, 'triangle', 0.07);
    tone(262, 0.12, 0.18, 'triangle', 0.07);
  },
  oops: () => tone(392, 0, 0.18, 'sine', 0.06),
  success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle', 0.07)),
  save: () => {
    tone(784, 0, 0.08, 'sine', 0.06);
    tone(1175, 0.08, 0.12, 'sine', 0.06);
  },
};
