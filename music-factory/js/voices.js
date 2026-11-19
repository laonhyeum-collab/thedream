// 악단별 악기 소리 (Web Audio 로 직접 만든 소리, 음원 파일 없음)
// 모든 소리 함수 모양은 같아요: (s, out, t, beats, beat, chord)
//   s = 도우미(osc/noise/gain/filter), out = 내보낼 곳, t = 시작 시각(초),
//   beats = 길이(박), beat = 1박 길이(초), chord = { root, tones:[3음] } (줄마다 바뀌는 화음)
// 타악기는 박마다 두드리고, 음이 있는 악기는 길이만큼 소리를 끌어 "음의 길이"를 들려줘요.
import { midiToFreq } from './engine.js';
import { BAND_VOICES, kick, hat, shape } from './voices-band.js';

const f = midiToFreq;
const endOf = (t, beats, beat) => t + beats * beat - 0.02;

// ---------- 도우미 ----------
function lfo(s, param, rate, depth, t, end) {
  const l = s.osc('sine', rate, t, end + 0.5);
  const g = s.gain(depth);
  l.connect(g).connect(param);
}

// 퉁기는 소리 (하프, 가야금, 베이스…)
function pluck(s, out, freq, t, { type = 'triangle', len = 0.9, vol = 0.2, cutoff = 2400, q = 1, bend = 0 } = {}) {
  const o = s.osc(type, freq, t, t + len + 0.1);
  if (bend) {
    o.frequency.setValueAtTime(freq * 2 ** (bend / 12), t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.06);
  }
  const lp = s.filter('lowpass', cutoff, q);
  lp.frequency.setValueAtTime(cutoff, t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(200, cutoff * 0.3), t + len);
  const g = s.gain(0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(lp).connect(g).connect(out);
  return o;
}

// 종소리 (오르골, 글로켄, 징…): 배음 비율이 고르지 않은 사인파 몇 개
function bell(s, out, freq, t, { len = 1.2, vol = 0.12, ratios = [1, 2.76, 5.4], attack = 0.002 } = {}) {
  ratios.forEach((r, i) => {
    const o = s.osc('sine', freq * r, t, t + len + 0.1);
    const g = s.gain(0);
    const v = vol / (i + 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len / (1 + i * 0.6));
    o.connect(g).connect(out);
  });
}

// 활로 켜는 소리 (바이올린, 첼로, 해금): 천천히 커지고 떨림(비브라토)
function bowed(s, out, freq, t, end, { vol = 0.12, cutoff = 2000, attack = 0.1, rate = 5.5, depth = 0.006, detune = 0, glide = 0, band = false } = {}) {
  const g = shape(s, t, end, { attack, peak: vol, sustain: vol * 0.85, decay: 0.2, release: 0.15 });
  const filt = band ? s.filter('bandpass', cutoff, 1.4) : s.filter('lowpass', cutoff, 1);
  for (const d of detune ? [-detune, detune] : [0]) {
    const o = s.osc('sawtooth', freq * (1 + d), t, end + 0.3);
    if (glide) {
      o.frequency.setValueAtTime(freq * (1 + d) * 2 ** (glide / 12), t);
      o.frequency.exponentialRampToValueAtTime(freq * (1 + d), t + 0.15);
    }
    lfo(s, o.frequency, rate, freq * depth, t + 0.15, end);
    o.connect(filt);
  }
  filt.connect(g).connect(out);
}

// 숨으로 부는 소리 (플루트, 대금)
function breath(s, out, freq, t, end, { vol = 0.12, noise = 0.05, rate = 5, depth = 0.008, attack = 0.08 } = {}) {
  const g = shape(s, t, end, { attack, peak: vol, sustain: vol * 0.8, decay: 0.2, release: 0.12 });
  const o = s.osc('sine', freq, t, end + 0.3);
  lfo(s, o.frequency, rate, freq * depth, t + 0.2, end);
  o.connect(g);
  const n = s.noise(t, end + 0.2);
  const bp = s.filter('bandpass', freq * 2, 2);
  const ng = s.gain(noise);
  n.connect(bp).connect(ng).connect(g);
  g.connect(out);
}

// 북·드럼 가죽 소리: 높은 음에서 낮은 음으로 떨어지며 사라짐
function membrane(s, out, t, { f0 = 200, f1 = 80, len = 0.4, vol = 0.6, noise = 0, noiseFreq = 1500 } = {}) {
  const o = s.osc('sine', f0, t, t + len + 0.05);
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + len * 0.6);
  const g = s.gain(0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g).connect(out);
  if (noise) noiseHit(s, out, t, { freq: noiseFreq, len: Math.min(0.12, len), vol: noise });
}

// 잡음으로 만드는 타악기 소리 (마라카스, 탬버린, 스냅…)
function noiseHit(s, out, t, { type = 'bandpass', freq = 3000, q = 1, len = 0.08, vol = 0.2 } = {}) {
  const n = s.noise(t, t + len + 0.05);
  const fl = s.filter(type, freq, q);
  const g = s.gain(0);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  n.connect(fl).connect(g).connect(out);
}

// 음이 있는 소리 하나 (트럼펫, 색소폰, 신시사이저…)
function tone(s, out, freq, t, end, { types = ['sawtooth'], vol = 0.1, cutoff = 2000, q = 1, attack = 0.02, decay = 0.2, sustain = 0.7, filterEnv = 0, detune = 0, scoop = 0 } = {}) {
  const g = shape(s, t, end, { attack, peak: vol, sustain: vol * sustain, decay, release: 0.08 });
  const lp = s.filter('lowpass', cutoff, q);
  if (filterEnv) {
    lp.frequency.setValueAtTime(cutoff * 0.3, t);
    lp.frequency.exponentialRampToValueAtTime(cutoff * filterEnv, t + attack + 0.04);
    lp.frequency.exponentialRampToValueAtTime(cutoff, t + attack + 0.3);
  }
  types.forEach((type, i) => {
    const d = detune ? (i - (types.length - 1) / 2) * detune : 0;
    const o = s.osc(type, freq * (1 + d), t, end + 0.2);
    if (scoop) {
      o.frequency.setValueAtTime(freq * (1 + d) * 2 ** (-scoop / 12), t);
      o.frequency.exponentialRampToValueAtTime(freq * (1 + d), t + 0.08);
    }
    o.connect(lp);
  });
  lp.connect(g).connect(out);
  return lp;
}

const each = (beats, step, fn) => { for (let b = 0; b < beats - 1e-6; b += step) fn(b); };
const cycle = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length];

// ---------- 🎻 오케스트라 ----------
const ORCHESTRA = {
  timpani(s, out, t, beats, beat, chord) {
    each(beats, 1, (b) => {
      const fr = f(chord.root + (b % 2 ? 7 : 0));
      membrane(s, out, t + b * beat, { f0: fr * 1.15, f1: fr, len: 0.9, vol: 0.55, noise: 0.08, noiseFreq: 400 });
    });
  },
  cello(s, out, t, beats, beat, chord) {
    bowed(s, out, f(chord.root + 12), t, endOf(t, beats, beat), { vol: 0.16, cutoff: 1100, attack: 0.12, rate: 5, depth: 0.005, detune: 0.003 });
  },
  violin(s, out, t, beats, beat, chord) {
    bowed(s, out, f(chord.tones[2] + 12), t, endOf(t, beats, beat), { vol: 0.08, cutoff: 3600, attack: 0.08, rate: 6, depth: 0.007, detune: 0.004 });
  },
  trumpet(s, out, t, beats, beat, chord) {
    tone(s, out, f(chord.tones[1] + 12), t, endOf(t, beats, beat), { types: ['sawtooth'], vol: 0.13, cutoff: 2200, attack: 0.03, filterEnv: 1.6 });
  },
  horn(s, out, t, beats, beat, chord) {
    tone(s, out, f(chord.tones[0]), t, endOf(t, beats, beat), { types: ['triangle', 'sawtooth'], vol: 0.12, cutoff: 900, attack: 0.1, sustain: 0.85 });
  },
  flute(s, out, t, beats, beat, chord) {
    breath(s, out, f(chord.tones[2] + 24), t, endOf(t, beats, beat), { vol: 0.1, noise: 0.04, rate: 5, depth: 0.006 });
  },
  harp(s, out, t, beats, beat, chord) {
    const notes = [...chord.tones, chord.tones[0] + 12, chord.tones[1] + 12, chord.tones[2] + 12];
    const step = beats >= 1 ? 0.25 : 0.125;
    let i = 0;
    each(beats, step, (b) => pluck(s, out, f(cycle(notes, i++)), t + b * beat, { len: 1.4, vol: 0.12, cutoff: 3000 }));
  },
  triangle(s, out, t, beats, beat) {
    each(beats, 1, (b) => bell(s, out, 2350, t + b * beat, { len: 1.6, vol: 0.06, ratios: [1, 2.32, 3.8] }));
  },
};

// ---------- 🎷 재즈 ----------
const JAZZ = {
  brushDrum(s, out, t, beats, beat) {
    each(beats, 1, (b) => {
      if (b % 2 === 0) kick(s, out, t + b * beat, 0.45);
      noiseHit(s, out, t + b * beat, { freq: 2800, q: 0.7, len: 0.22, vol: 0.08 });
      if (b + 0.66 < beats) hat(s, out, t + (b + 0.66) * beat, 0.05, 0.1); // 스윙
    });
  },
  doubleBass(s, out, t, beats, beat, chord) {
    const walk = [chord.root, chord.root + 4, chord.root + 7, chord.root + 5];
    let i = 0;
    each(beats, 1, (b) => pluck(s, out, f(cycle(walk, i++) + 12), t + b * beat, { type: 'triangle', len: Math.min(0.9, beat * 0.95), vol: 0.32, cutoff: 900 }));
  },
  piano(s, out, t, beats, beat, chord) {
    const stab = (st) => chord.tones.forEach((m) => {
      const g = shape(s, st, st + 0.4, { attack: 0.004, peak: 0.1, sustain: 0.04, decay: 0.5, release: 0.3 });
      s.osc('triangle', f(m), st, st + 1.2).connect(g);
      const h = s.gain(0.3);
      s.osc('sine', f(m) * 2, st, st + 1.2).connect(h).connect(g);
      g.connect(out);
    });
    stab(t);
    each(beats, 2, (b) => { if (b + 1.5 < beats) stab(t + (b + 1.5) * beat); }); // 엇박 반주
  },
  vibraphone(s, out, t, beats, beat, chord) {
    const end = endOf(t, beats, beat);
    const trem = s.gain(1);
    lfo(s, trem.gain, 5, 0.35, t, end);
    chord.tones.forEach((m) => bell(s, trem, f(m + 12), t, { len: Math.max(1, end - t + 0.6), vol: 0.07, ratios: [1, 4] }));
    trem.connect(out);
  },
  saxophone(s, out, t, beats, beat, chord) {
    const lp = tone(s, out, f(chord.tones[1]), t, endOf(t, beats, beat), { types: ['sawtooth', 'square'], vol: 0.09, cutoff: 1700, q: 2, attack: 0.04, scoop: 1 });
    lfo(s, lp.frequency, 5, 250, t + 0.2, endOf(t, beats, beat));
  },
  muteTrumpet(s, out, t, beats, beat, chord) {
    const end = endOf(t, beats, beat);
    const g = shape(s, t, end, { attack: 0.03, peak: 0.12, sustain: 0.09, decay: 0.2, release: 0.08 });
    const bp = s.filter('bandpass', 1500, 3);
    const o = s.osc('square', f(chord.tones[2] + 12), t, end + 0.2);
    lfo(s, o.frequency, 5.5, 4, t + 0.25, end);
    o.connect(bp).connect(g).connect(out);
  },
  snap(s, out, t, beats, beat) {
    each(beats, 1, (b) => {
      if (beats < 2 || b % 2 === 1) noiseHit(s, out, t + b * beat, { freq: 2600, q: 3, len: 0.06, vol: 0.5 });
    });
  },
};

// ---------- 🎁 오르골 · 벨 ----------
const MUSICBOX = {
  musicBox(s, out, t, beats, beat, chord) {
    const notes = [chord.tones[0] + 24, chord.tones[1] + 24, chord.tones[2] + 24, chord.tones[1] + 24];
    let i = 0;
    each(beats, 0.5, (b) => bell(s, out, f(cycle(notes, i++)), t + b * beat, { len: 0.9, vol: 0.09, ratios: [1, 4.1] }));
  },
  celesta(s, out, t, beats, beat, chord) {
    each(beats, 2, (b) => chord.tones.forEach((m) => bell(s, out, f(m + 12), t + b * beat, { len: 1.6, vol: 0.06, ratios: [1, 2, 3] })));
  },
  glockenspiel(s, out, t, beats, beat, chord) {
    let i = 0;
    each(beats, 1, (b) => bell(s, out, f(cycle(chord.tones, i++) + 24), t + b * beat, { len: 1.3, vol: 0.08, ratios: [1, 2.76] }));
  },
  handbell(s, out, t, beats, beat, chord) {
    each(beats, 2, (b) => bell(s, out, f(chord.tones[0]), t + b * beat, { len: 2.4, vol: 0.12, ratios: [1, 2, 2.4, 3] }));
  },
  xylophone(s, out, t, beats, beat, chord) {
    let i = 0;
    each(beats, 0.5, (b) => {
      const st = t + b * beat;
      pluck(s, out, f(cycle(chord.tones, i++) + 12), st, { type: 'triangle', len: 0.28, vol: 0.22, cutoff: 5000 });
      noiseHit(s, out, st, { freq: 3500, q: 2, len: 0.02, vol: 0.08 });
    });
  },
  windChime(s, out, t, beats, beat) {
    const pent = [84, 86, 88, 91, 93, 96];
    const n = Math.max(2, Math.round(beats * 3));
    for (let i = 0; i < n; i++) {
      const st = t + (i / n) * beats * beat + Math.random() * 0.05;
      bell(s, out, f(pent[Math.floor(Math.random() * pent.length)]), st, { len: 1.4, vol: 0.04, ratios: [1, 2.9] });
    }
  },
  toyPiano(s, out, t, beats, beat, chord) {
    let i = 0;
    each(beats, 1, (b) => {
      const st = t + b * beat;
      const m = cycle(chord.tones, i++) + 12;
      pluck(s, out, f(m), st, { type: 'square', len: 0.45, vol: 0.06, cutoff: 3200 });
      bell(s, out, f(m) * 3, st, { len: 0.3, vol: 0.03, ratios: [1] });
    });
  },
};

// ---------- 🪘 타악기 ----------
const PERCUSSION = {
  cajon(s, out, t, beats, beat) {
    each(beats, 1, (b) => {
      const st = t + b * beat;
      if (b % 2 === 0) membrane(s, out, st, { f0: 120, f1: 70, len: 0.35, vol: 0.7, noise: 0.05, noiseFreq: 600 });
      else noiseHit(s, out, st, { freq: 1800, q: 0.8, len: 0.15, vol: 0.45 });
      if (b + 0.5 < beats) noiseHit(s, out, st + 0.5 * beat, { freq: 1600, q: 1, len: 0.06, vol: 0.12 });
    });
  },
  bongo(s, out, t, beats, beat) {
    let i = 0;
    each(beats, 0.5, (b) => {
      const hi = i++ % 2 === 0;
      membrane(s, out, t + b * beat, { f0: hi ? 480 : 340, f1: hi ? 420 : 300, len: 0.16, vol: 0.45 });
    });
  },
  conga(s, out, t, beats, beat) {
    each(beats, 1, (b) => {
      const st = t + b * beat;
      membrane(s, out, st, { f0: 260, f1: 210, len: 0.35, vol: 0.5 });
      if (b + 0.5 < beats) membrane(s, out, st + 0.5 * beat, { f0: 330, f1: 300, len: 0.12, vol: 0.3, noise: 0.15, noiseFreq: 2200 });
    });
  },
  maracas(s, out, t, beats, beat) {
    let i = 0;
    each(beats, 0.25, (b) => noiseHit(s, out, t + b * beat, { type: 'highpass', freq: 5000, len: 0.05, vol: i++ % 2 === 0 ? 0.22 : 0.12 }));
  },
  tambourine(s, out, t, beats, beat) {
    each(beats, 0.5, (b) => {
      noiseHit(s, out, t + b * beat, { freq: 7500, q: 0.8, len: 0.14, vol: b % 1 === 0 ? 0.26 : 0.14 });
    });
  },
  woodblock(s, out, t, beats, beat) {
    let i = 0;
    each(beats, 1, (b) => pluck(s, out, i++ % 2 ? 900 : 1300, t + b * beat, { type: 'sine', len: 0.09, vol: 0.4, cutoff: 6000 }));
  },
  cowbell(s, out, t, beats, beat) {
    each(beats, 1, (b) => {
      const st = t + b * beat;
      const bp = s.filter('bandpass', 800, 2);
      const g = s.gain(0);
      g.gain.setValueAtTime(0.25, st);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.3);
      s.osc('square', 540, st, st + 0.35).connect(bp);
      s.osc('square', 800, st, st + 0.35).connect(bp);
      bp.connect(g).connect(out);
    });
  },
};

// ---------- 🥁 국악 ----------
const GUGAK = {
  buk(s, out, t, beats, beat) {
    each(beats, 1, (b) => membrane(s, out, t + b * beat, { f0: 110, f1: 58, len: 0.7, vol: b === 0 ? 0.8 : 0.6, noise: 0.06, noiseFreq: 500 }));
  },
  gayageum(s, out, t, beats, beat, chord) {
    let i = 0;
    each(beats, 1, (b) => {
      const st = t + b * beat;
      const o = pluck(s, out, f(cycle(chord.tones, i++) + 12), st, { type: 'sawtooth', len: 1.3, vol: 0.12, cutoff: 2000, bend: -0.6 });
      lfo(s, o.frequency, 5, 6, st + 0.25, st + 1.2); // 농현(떨기)
    });
  },
  daegeum(s, out, t, beats, beat, chord) {
    breath(s, out, f(chord.tones[2] + 12), t, endOf(t, beats, beat), { vol: 0.12, noise: 0.09, rate: 4.5, depth: 0.012, attack: 0.15 });
  },
  jing(s, out, t, beats, beat, chord) {
    const fr = f(chord.root + 12);
    bell(s, out, fr, t, { len: Math.min(4, beats * beat + 2), vol: 0.16, ratios: [1, 1.48, 2.1, 2.9], attack: 0.03 });
  },
  kkwaenggwari(s, out, t, beats, beat) {
    let i = 0;
    each(beats, 0.5, (b) => {
      const st = t + b * beat;
      const v = i++ % 2 === 0 ? 0.16 : 0.08;
      bell(s, out, 1100, st, { len: 0.2, vol: v, ratios: [1, 1.5, 2.2] });
      noiseHit(s, out, st, { freq: 4500, q: 1.2, len: 0.12, vol: v });
    });
  },
  geomungo(s, out, t, beats, beat, chord) {
    let i = 0;
    each(beats, 2, (b) => {
      const st = t + b * beat;
      pluck(s, out, f(cycle(chord.tones, i++) - 12), st, { type: 'sawtooth', len: 1.6, vol: 0.18, cutoff: 900 });
      noiseHit(s, out, st, { freq: 1200, q: 1, len: 0.04, vol: 0.15 }); // 술대로 치는 소리
    });
  },
  janggu(s, out, t, beats, beat) {
    each(beats, 1, (b) => {
      const st = t + b * beat;
      membrane(s, out, st, { f0: 150, f1: 95, len: 0.4, vol: 0.55 }); // 쿵
      noiseHit(s, out, st, { freq: 2200, q: 1.5, len: 0.06, vol: b === 0 ? 0.25 : 0.12 }); // 덩
      if (b + 0.5 < beats) noiseHit(s, out, st + 0.5 * beat, { freq: 2600, q: 2, len: 0.07, vol: 0.3 }); // 덕
    });
  },
  haegeum(s, out, t, beats, beat, chord) {
    bowed(s, out, f(chord.tones[1] + 12), t, endOf(t, beats, beat), { vol: 0.1, cutoff: 1400, attack: 0.06, rate: 6, depth: 0.012, glide: -2, band: true });
  },
};

// ---------- 🎛️ 전자 음악 ----------
const ELECTRONIC = {
  edmKick(s, out, t, beats, beat) {
    each(beats, 1, (b) => {
      kick(s, out, t + b * beat, 1);
      noiseHit(s, out, t + b * beat, { freq: 3000, q: 1, len: 0.015, vol: 0.2 });
    });
  },
  wobble(s, out, t, beats, beat, chord) {
    const end = endOf(t, beats, beat);
    const lp = tone(s, out, f(chord.root + 12), t, end, { types: ['sawtooth', 'square'], vol: 0.14, cutoff: 700, q: 6, attack: 0.01, sustain: 0.9 });
    lfo(s, lp.frequency, 2 / beat, 600, t, end);
  },
  arp(s, out, t, beats, beat, chord) {
    const notes = [...chord.tones.map((m) => m + 12), chord.tones[0] + 24];
    let i = 0;
    each(beats, 0.25, (b) => {
      const st = t + b * beat;
      tone(s, out, f(cycle(notes, i++)), st, st + beat * 0.2, { types: ['square'], vol: 0.07, cutoff: 2600, attack: 0.003, decay: 0.05, sustain: 0.4 });
    });
  },
  laser(s, out, t, beats, beat) {
    each(beats, 1, (b) => {
      const st = t + b * beat;
      const o = s.osc('sawtooth', 2200, st, st + 0.3);
      o.frequency.setValueAtTime(2200, st);
      o.frequency.exponentialRampToValueAtTime(140, st + 0.25);
      const g = s.gain(0);
      g.gain.setValueAtTime(0.09, st);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.27);
      o.connect(g).connect(out);
    });
  },
  spacePad(s, out, t, beats, beat, chord) {
    const end = endOf(t, beats, beat);
    const lp = s.filter('lowpass', 600, 1);
    lp.frequency.setValueAtTime(600, t);
    lp.frequency.linearRampToValueAtTime(1800, end);
    const g = shape(s, t, end, { attack: Math.min(0.4, beats * beat * 0.4), peak: 0.07, sustain: 0.06, decay: 0.3, release: 0.5 });
    chord.tones.forEach((m) => [0.995, 1.005].forEach((d) => s.osc('sawtooth', f(m) * d, t, end + 0.6).connect(lp)));
    lp.connect(g).connect(out);
  },
  subDrop(s, out, t, beats, beat, chord) {
    const end = endOf(t, beats, beat);
    const o = s.osc('sine', f(chord.root + 24), t, end + 0.1);
    o.frequency.setValueAtTime(f(chord.root + 24), t);
    o.frequency.exponentialRampToValueAtTime(f(chord.root), end);
    const g = shape(s, t, end, { attack: 0.01, peak: 0.5, sustain: 0.4, decay: 0.3, release: 0.08 });
    o.connect(g).connect(out);
  },
  hatRoll(s, out, t, beats, beat) {
    let i = 0;
    each(beats, 0.25, (b) => {
      const open = (b % 1) === 0.5;
      hat(s, out, t + b * beat, open ? 0.18 : 0.035, (0.08 + 0.1 * ((i++ % 4) / 3)) * (open ? 1.2 : 1));
    });
  },
  lead(s, out, t, beats, beat, chord) {
    tone(s, out, f(chord.tones[2] + 12), t, endOf(t, beats, beat), { types: ['sawtooth', 'sawtooth', 'sawtooth'], detune: 0.008, vol: 0.07, cutoff: 3500, attack: 0.01, filterEnv: 1.4 });
  },
};

// 악단마다 전체 소리 크기를 맞춰요 (종소리처럼 작은 소리는 키워요)
function louder(voices, amount) {
  const out = {};
  for (const [id, fn] of Object.entries(voices)) {
    out[id] = (s, dest, ...args) => {
      const g = s.gain(amount);
      g.connect(dest);
      fn(s, g, ...args);
    };
  }
  return out;
}

export const VOICES = {
  ...BAND_VOICES,
  ...louder(ORCHESTRA, 1.3),
  ...louder(JAZZ, 1.6),
  ...louder(MUSICBOX, 2.4),
  ...PERCUSSION,
  ...GUGAK,
  ...ELECTRONIC,
};
