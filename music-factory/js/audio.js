// 소리 엔진: Web Audio 로 밴드 악기 소리를 직접 만들어 정확한 시각에 예약 연주합니다.
// (음원 파일이 없어도 바로 소리가 나고, 여러 악기가 동시에 울려도 끊기지 않아요)
import { buildSchedule, beatSeconds, chordFor, midiToFreq } from './engine.js';

const LOOKAHEAD = 0.12; // 재생 버튼을 누르고 첫 소리까지 (초)

// ---------- 악기 소리 ----------
// 모든 소리 함수: (s, out, t, beats, beat, chord)
//   s = 도우미, out = 연결할 노드, t = 시작 시각(초), beats = 박자 수, beat = 1박 길이(초)
// 타악기는 박마다 두드리고, 음이 있는 악기는 길이만큼 소리를 끌어 "음의 길이"를 들려줍니다.

function kick(s, out, t, vol = 1) {
  const o = s.osc('sine', 150, t, t + 0.45);
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  const g = s.gain(0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.95 * vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  o.connect(g).connect(out);
}

function hat(s, out, t, len = 0.05, vol = 0.22) {
  const n = s.noise(t, t + len + 0.05);
  const hp = s.filter('highpass', 7000);
  const g = s.gain(0);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  n.connect(hp).connect(g).connect(out);
}

function snareHit(s, out, t, vol = 1) {
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

function crash(s, out, t, len) {
  const n = s.noise(t, t + len + 0.1);
  const hp = s.filter('highpass', 4500);
  const g = s.gain(0);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.32, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  n.connect(hp).connect(g).connect(out);
}

// 음이 있는 소리의 기본 모양: 빠르게 커졌다가 → 유지 → 길이 끝에서 사라짐
function shape(s, t, end, { attack = 0.01, peak = 0.3, sustain = 0.2, decay = 0.25, release = 0.08 } = {}) {
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
function distortion(s) {
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

export const VOICES = {
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

// ---------- 오디오 장치 ----------
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
  }

  // 첫 터치/클릭 때 만들어야 브라우저가 소리를 허락합니다.
  ensure() {
    if (!this.ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC({ latencyHint: 'interactive' });
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(comp).connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.ctx;
  }

  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // 한 번의 연주(또는 미리 듣기)를 담는 통. 멈추면 통째로 조용히 만들고 소리를 모두 끕니다.
  createBus() {
    const ctx = this.ensure();
    const out = ctx.createGain();
    out.connect(this.master);
    const sources = [];
    const s = {
      ctx,
      osc(type, freq, start, stop) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        o.start(start);
        o.stop(stop);
        sources.push(o);
        return o;
      },
      noise: (start, stop) => {
        const n = ctx.createBufferSource();
        n.buffer = this.noiseBuf;
        n.loop = true;
        n.start(start, Math.random() * 0.5);
        n.stop(stop);
        sources.push(n);
        return n;
      },
      gain(v) {
        const g = ctx.createGain();
        g.gain.value = v;
        return g;
      },
      filter(type, freq, q = 1) {
        const f = ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        return f;
      },
    };
    let closed = false;
    return {
      s,
      out,
      sources,
      close() {
        if (closed) return;
        closed = true;
        const t = ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(out.gain.value, t);
        out.gain.linearRampToValueAtTime(0, t + 0.03);
        for (const src of sources) {
          try { src.stop(t + 0.04); } catch { /* 이미 멈춤 */ }
        }
        setTimeout(() => { try { out.disconnect(); } catch { /* 무시 */ } }, 120);
      },
    };
  }

  playVoice(bus, voice, t, beats, beat, chord) {
    const fn = VOICES[voice];
    if (fn) fn(bus.s, bus.out, t, beats, beat, chord);
  }

  // 재료 미리 듣기: 이전 미리 듣기는 끊고 새로 들려줍니다.
  preview(voice, beats = 1, bpm = 100, groupIndex = 0) {
    if (!this.ensure()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.previewBus?.close();
    const bus = this.createBus();
    this.previewBus = bus;
    this.playVoice(bus, voice, this.ctx.currentTime + 0.03, beats, beatSeconds(bpm), chordFor(groupIndex));
  }

  stopPreview() {
    this.previewBus?.close();
    this.previewBus = null;
  }
}

// ---------- 연주자 ----------
// 재생 / 일시정지 / 처음부터 / 멈춤. 시간은 모두 오디오 시계 기준이라 그림과 소리가 맞습니다.
export class Player {
  constructor(engine, { voiceOf }) {
    this.engine = engine;
    this.voiceOf = voiceOf; // 재료 id → 소리 이름
    this.state = 'stopped'; // stopped | playing | paused
    this.bus = null;
    this.schedule = null;
    this.bpm = 100;
    this.loop = false;
    this.startTime = 0;
    this.scheduledPasses = 0;
    this.timer = null;
    this.onEnd = null;
  }

  get beat() {
    return beatSeconds(this.bpm);
  }

  // 지금 몇 번째 박인지 (반복 재생이면 한 바퀴 안에서의 위치)
  position() {
    if (!this.schedule || this.state === 'stopped') return null;
    const ctx = this.engine.ctx;
    const latency = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
    const elapsed = Math.max(0, ctx.currentTime - latency - this.startTime) / this.beat;
    const total = this.schedule.totalBeats;
    const scheduled = this.scheduledPasses * total;
    if (elapsed >= scheduled) return { beat: total, pass: this.scheduledPasses - 1, elapsed, done: true };
    const pass = Math.floor(elapsed / total);
    return { beat: elapsed - pass * total, pass, elapsed, done: false };
  }

  play(items, { bpm, loop, onEnd } = {}) {
    this.stop();
    const schedule = buildSchedule(items);
    if (!schedule.groups.length) return false;
    const ctx = this.engine.ensure();
    if (!ctx) return false;
    if (ctx.state === 'suspended') ctx.resume();
    this.engine.stopPreview();
    this.schedule = schedule;
    this.bpm = bpm || 100;
    this.loop = Boolean(loop);
    this.onEnd = onEnd || null;
    this.bus = this.engine.createBus();
    this.startTime = ctx.currentTime + LOOKAHEAD;
    this.scheduledPasses = 0;
    this.schedulePass(0);
    this.state = 'playing';
    this.timer = setInterval(() => this.tick(), 50);
    return true;
  }

  schedulePass(pass) {
    const beat = this.beat;
    const passStart = this.startTime + pass * this.schedule.totalBeats * beat;
    for (const g of this.schedule.groups) {
      const chord = chordFor(g.index);
      const t = passStart + g.start * beat;
      // m.voice 가 있으면 그 소리로 (따라 만들기의 정답 노래), 없으면 재료에 정해진 소리로
      for (const m of g.items) this.engine.playVoice(this.bus, m.voice || this.voiceOf(m.ing), t, m.beats, beat, chord);
    }
    this.scheduledPasses = pass + 1;
  }

  tick() {
    if (this.state !== 'playing') return;
    const ctx = this.engine.ctx;
    const passLen = this.schedule.totalBeats * this.beat;
    const nextPassStart = this.startTime + this.scheduledPasses * passLen;
    if (this.loop) {
      // 다음 바퀴를 미리 예약 (끊김 없이 이어지도록)
      if (ctx.currentTime > nextPassStart - 1.0) this.schedulePass(this.scheduledPasses);
      return;
    }
    // 반복을 끄면 이미 예약된 바퀴까지만 연주하고 끝납니다.
    if (ctx.currentTime >= nextPassStart + 0.05) {
      const cb = this.onEnd;
      this.stop();
      cb?.();
    }
  }

  pause() {
    if (this.state !== 'playing') return;
    this.engine.ctx.suspend();
    this.state = 'paused';
  }

  resume() {
    if (this.state !== 'paused') return;
    this.engine.ctx.resume();
    this.state = 'playing';
  }

  setLoop(loop) {
    this.loop = Boolean(loop);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    if (this.bus) this.bus.close();
    this.bus = null;
    this.schedule = null;
    this.onEnd = null;
    const wasPaused = this.state === 'paused';
    this.state = 'stopped';
    if (wasPaused) this.engine.ctx?.resume();
  }
}
