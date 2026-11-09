/* 音效：全部用 WebAudio 合成，无需外部音频文件 */
const Sound = {
  enabled: true,
  ctx: null,

  ensure() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (C) this.ctx = new C();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  tone({ freq = 440, to = null, dur = 0.2, type = 'sine', vol = 0.3, delay = 0 }) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  },

  noise({ dur = 0.2, vol = 0.2, cutoff = 900 } = {}) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t0);
  },

  click() { this.tone({ freq: 520, to: 660, dur: 0.08, type: 'triangle', vol: 0.18 }); },
  stretch() { this.tone({ freq: 180, to: 260, dur: 0.12, type: 'sawtooth', vol: 0.09 }); },
  launch() {
    this.tone({ freq: 760, to: 220, dur: 0.28, type: 'triangle', vol: 0.24 });
    this.noise({ dur: 0.12, vol: 0.07, cutoff: 1600 });
  },
  hit(power = 1) {
    this.noise({ dur: 0.1 + 0.12 * power, vol: 0.08 + 0.12 * power, cutoff: 620 });
    this.tone({ freq: 150, to: 90, dur: 0.12, type: 'square', vol: 0.1 });
  },
  glassBreak() {
    this.tone({ freq: 1500, to: 700, dur: 0.18, type: 'triangle', vol: 0.16 });
    this.noise({ dur: 0.22, vol: 0.13, cutoff: 5200 });
  },
  woodBreak() {
    this.noise({ dur: 0.24, vol: 0.18, cutoff: 900 });
    this.tone({ freq: 240, to: 120, dur: 0.18, type: 'square', vol: 0.14 });
  },
  stoneBreak() {
    this.noise({ dur: 0.3, vol: 0.22, cutoff: 500 });
    this.tone({ freq: 110, to: 60, dur: 0.25, type: 'sawtooth', vol: 0.16 });
  },
  pop() {
    this.tone({ freq: 620, to: 320, dur: 0.16, type: 'square', vol: 0.14 });
    this.tone({ freq: 900, to: 500, dur: 0.1, type: 'triangle', vol: 0.2, delay: 0.05 });
  },
  boom() {
    this.noise({ dur: 0.55, vol: 0.32, cutoff: 420 });
    this.tone({ freq: 140, to: 40, dur: 0.5, type: 'sine', vol: 0.28 });
  },
  boost() {
    this.tone({ freq: 420, to: 1200, dur: 0.22, type: 'sawtooth', vol: 0.16 });
  },
  split() {
    this.tone({ freq: 800, to: 520, dur: 0.16, type: 'triangle', vol: 0.18 });
    this.tone({ freq: 700, to: 460, dur: 0.14, type: 'triangle', vol: 0.14, delay: 0.04 });
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, dur: 0.32, type: 'triangle', vol: 0.2, delay: i * 0.13 }));
  },
  lose() {
    [420, 330, 262].forEach((f, i) => this.tone({ freq: f, to: f - 40, dur: 0.3, type: 'triangle', vol: 0.16, delay: i * 0.16 }));
  }
};
