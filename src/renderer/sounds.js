// Every noise the pet makes is synthesized on the spot: square and triangle
// waves with fast envelopes, i.e. exactly the palette a 2001 virtual pet had.
// No audio files to ship, and it can't sound too polished, which is the point.

export class Sounds {
  constructor() {
    this.muted = false;
    this._ctx = null;
  }

  setMuted(muted) {
    this.muted = muted;
  }

  ctx() {
    if (this.muted) return null;
    // created lazily: browsers refuse an AudioContext before user input
    if (!this._ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      this._ctx = new Ctor();
    }
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  blip(freq, duration = 0.08, type = 'square', gain = 0.05, delay = 0) {
    const ctx = this.ctx();
    if (!ctx) return;
    const at = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(gain, at + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(env).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }

  // happy two-note chirp — hovering, being petted
  chirp() {
    this.blip(660, 0.06, 'square', 0.035);
    this.blip(880, 0.07, 'square', 0.035, 0.06);
  }

  // one note of the song it sings at its music toy
  sing(step) {
    const scale = [523, 587, 659, 784, 880];
    this.blip(scale[step % scale.length], 0.16, 'triangle', 0.05);
  }

  // munching at the food bowl
  munch() {
    this.blip(180, 0.05, 'square', 0.04);
    this.blip(140, 0.06, 'square', 0.04, 0.07);
  }

  // sleeping — a slow droopy sigh
  snore() {
    this.blip(190, 0.3, 'triangle', 0.022);
    this.blip(130, 0.35, 'triangle', 0.018, 0.3);
  }

  // waking up / stretching
  yawn() {
    this.blip(300, 0.25, 'triangle', 0.03);
    this.blip(420, 0.2, 'triangle', 0.03, 0.2);
  }

  // "oi. look at me." — the goose-mode nudge
  demand() {
    this.blip(880, 0.07, 'square', 0.06);
    this.blip(660, 0.07, 'square', 0.06, 0.09);
    this.blip(990, 0.12, 'square', 0.06, 0.18);
  }

  // focus session finished
  fanfare() {
    [523, 659, 784, 1046].forEach((f, i) => this.blip(f, 0.14, 'square', 0.05, i * 0.1));
  }
}
