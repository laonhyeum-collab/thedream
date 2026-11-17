// 술래 목소리(기기 안의 음성 합성)와 짧은 효과음

let ctx = null;
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, dur, type = 'sine', gain = 0.15, endFreq = freq) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  unlock() { audio(); },
  step() { tone(988, 0, 0.07, 'sine', 0.05); },
  tick() { tone(660, 0, 0.12, 'triangle', 0.12); },
  go() { tone(523, 0, 0.12, 'triangle'); tone(784, 0.1, 0.18, 'triangle'); },
  freeze() { tone(196, 0, 0.25, 'square', 0.08); },
  caught() { tone(700, 0, 0.45, 'sawtooth', 0.08, 180); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.3, 'triangle', 0.14)); },
};

// ---------- 술래 목소리 ----------
let koVoice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices().filter((v) => /^ko/i.test(v.lang));
  // 기기 안에서 만드는 목소리(localService)를 먼저 고릅니다
  koVoice = voices.find((v) => v.localService) || voices[0] || null;
  return koVoice;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

export const voice = {
  enabled: true,
  get available() { return 'speechSynthesis' in window; },
  /** 첫 터치 때 한 번 불러 두면 휴대기기에서도 소리가 납니다 */
  unlock() {
    if (!this.available) return;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  },
  stop() { if (this.available) speechSynthesis.cancel(); },
  say(text, { rate = 1, pitch = 1.15 } = {}) {
    if (!this.enabled || !this.available) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    if (koVoice || pickVoice()) u.voice = koVoice;
    u.rate = Math.max(0.5, Math.min(2.2, rate));
    u.pitch = pitch;
    speechSynthesis.speak(u);
  },
  /** 정해진 시간(초) 안에 "무궁화 꽃이 피었습니다"를 다 부르도록 빠르기를 맞춥니다 */
  chant(seconds) {
    // 보통 빠르기(1.0)로 부르면 약 2.6초 걸림
    this.say('무궁화 꽃이 피었습니다', { rate: 2.6 / Math.max(1.2, seconds - 0.3) });
  },
};
