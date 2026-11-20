// 소리 엔진: Web Audio 로 악기 소리를 직접 만들어 정확한 시각에 예약 연주합니다.
// (음원 파일이 없어도 바로 소리가 나고, 여러 악기가 동시에 울려도 끊기지 않아요)
import { buildSchedule, beatSeconds, chordFor } from './engine.js';

const LOOKAHEAD = 0.12; // 재생 버튼을 누르고 첫 소리까지 (초)

import { VOICES } from './voices.js';

export { VOICES };

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
  preview(voice, beats = 1, bpm = 100, progression = 'pop', groupIndex = 0) {
    if (!this.ensure()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.previewBus?.close();
    const bus = this.createBus();
    this.previewBus = bus;
    this.playVoice(bus, voice, this.ctx.currentTime + 0.03, beats, beatSeconds(bpm), chordFor(groupIndex, progression));
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

  // backing = 반주 소리 (랜덤 조합 도전). 줄마다 그 줄의 화음을 그 줄 길이만큼 조금 작게 깔아 줘요.
  play(items, { bpm, loop, onEnd, progression = 'pop', backing = null } = {}) {
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
    this.progression = progression; // 악단마다 다른 화음 흐름
    this.onEnd = onEnd || null;
    this.bus = this.engine.createBus();
    this.backing = backing && VOICES[backing] ? backing : null;
    if (this.backing) {
      const g = this.bus.s.gain(0.6); // 반주는 쌓은 악기보다 작게
      g.connect(this.bus.out);
      this.backingBus = { s: this.bus.s, out: g };
    } else {
      this.backingBus = null;
    }
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
      const chord = chordFor(g.index, this.progression);
      const t = passStart + g.start * beat;
      // m.voice 가 있으면 그 소리로 (따라 만들기의 정답 노래), 없으면 재료에 정해진 소리로
      for (const m of g.items) this.engine.playVoice(this.bus, m.voice || this.voiceOf(m.ing), t, m.beats, beat, chord);
      if (this.backingBus) this.engine.playVoice(this.backingBus, this.backing, t, g.dur, beat, chord);
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
    this.backingBus = null;
    this.schedule = null;
    this.onEnd = null;
    const wasPaused = this.state === 'paused';
    this.state = 'stopped';
    if (wasPaused) this.engine.ctx?.resume();
  }
}
