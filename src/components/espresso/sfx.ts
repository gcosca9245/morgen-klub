/**
 * Synthetische Klänge über die Web Audio API (keine Audiodateien). Standardmäßig stumm;
 * der AudioContext entsteht erst nach einer Nutzeraktion.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  enabled = false;

  setEnabled(on: boolean) {
    this.enabled = on;
    if (on) this.ensure();
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.05);
  }

  private ensure() {
    if (this.ctx) {
      void this.ctx.resume();
      return this.ctx;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  private out() {
    if (!this.enabled) return null;
    const ctx = this.ensure();
    return this.master ? { ctx, dest: this.master } : null;
  }

  private noiseBurst(dur: number, type: BiquadFilterType, freq: number, q: number, gain: number, lfo = 0) {
    const o = this.out();
    if (!o || !this.noise) return;
    const { ctx, dest } = o;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + Math.min(0.08, dur / 4));
    g.gain.setValueAtTime(gain, t + dur * 0.85);
    g.gain.linearRampToValueAtTime(0, t + dur);
    if (lfo) {
      const l = ctx.createOscillator();
      const lg = ctx.createGain();
      l.frequency.value = lfo;
      lg.gain.value = freq * 0.25;
      l.connect(lg).connect(f.frequency);
      l.start(t);
      l.stop(t + dur);
    }
    src.connect(f).connect(g).connect(dest);
    src.start(t);
    src.stop(t + dur);
  }

  private tone(freq: number, dur: number, gain: number, type: OscillatorType = 'sine', delay = 0) {
    const o = this.out();
    if (!o) return;
    const { ctx, dest } = o;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const t = ctx.currentTime + delay;
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + dur);
  }

  click() {
    this.noiseBurst(0.05, 'highpass', 2500, 0.7, 0.5);
    this.tone(180, 0.08, 0.2, 'triangle');
  }
  warmup() {
    this.tone(110, 2.8, 0.06, 'sine');
    this.noiseBurst(1.2, 'bandpass', 5000, 0.8, 0.12);
  }
  beans() {
    for (let i = 0; i < 26; i++) this.tone(1800 + Math.random() * 2200, 0.04, 0.05, 'triangle', i * 0.09 + Math.random() * 0.05);
  }
  grind() {
    this.noiseBurst(2.7, 'bandpass', 900, 1.2, 0.35, 23);
    this.tone(70, 2.7, 0.08, 'sawtooth');
  }
  brew() {
    this.tone(55, 5.6, 0.07, 'square');
    this.noiseBurst(5.2, 'bandpass', 1400, 2.5, 0.12, 0.8);
  }
  ding() {
    this.tone(880, 1.2, 0.12);
    this.tone(1320, 1.4, 0.08, 'sine', 0.12);
  }
  dispose() {
    void this.ctx?.close();
    this.ctx = null;
  }
}
