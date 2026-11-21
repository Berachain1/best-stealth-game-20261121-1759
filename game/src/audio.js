// Synthesised sound for Museum After Dark: no audio files at all.
// Every sound is a small WebAudio patch built when it is needed — a
// filtered noise burst for a footstep, two sine notes for a pickup, a
// dissonant sting for the alarm, a rising arpeggio for the exit chime,
// and a low hum that runs under the whole game. Nothing here touches
// the network and nothing loads a file.

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.humNodes = null;
  }

  // The AudioContext is created on the first user gesture, never before:
  // browsers refuse to start audio without one.
  ensure() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.humNodes) this.humNodes.gain.gain.value = muted ? 0 : 0.035;
  }

  // A short burst of filtered noise, used for footsteps and coin pings.
  blipNoise(duration, frequency, gainValue, type = 'lowpass') {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  }

  // One sine note with a quick attack and a gentle decay.
  note(frequency, duration, gainValue, when = 0) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  footstep(sneaking) {
    this.blipNoise(0.07, sneaking ? 300 : 700, sneaking ? 0.05 : 0.11);
  }

  coinThrow() {
    this.blipNoise(0.12, 2400, 0.1, 'highpass');
  }

  coinLand() {
    this.note(1568, 0.18, 0.14);
    this.note(2093, 0.3, 0.1, 0.07);
  }

  pickup() {
    this.note(880, 0.14, 0.14);
    this.note(1318, 0.22, 0.12, 0.08);
  }

  alertSting() {
    this.note(233, 0.5, 0.16);
    this.note(247, 0.5, 0.16);
    this.note(466, 0.4, 0.1, 0.1);
  }

  exitChime() {
    [523, 659, 784, 1047].forEach((f, i) => this.note(f, 0.4, 0.13, i * 0.09));
  }

  caughtSound() {
    this.note(110, 0.7, 0.18);
    this.note(104, 0.7, 0.18, 0.12);
  }

  // The quiet room tone: two detuned low sines through a slow tremolo.
  // Started once, on the first gesture, and left running.
  startHum() {
    if (!this.ctx || this.muted || this.humNodes) return;
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    const oscA = ctx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = 55;
    const oscB = ctx.createOscillator();
    oscB.type = 'sine';
    oscB.frequency.value = 55.7;
    oscA.connect(gain);
    oscB.connect(gain);
    gain.connect(ctx.destination);
    oscA.start();
    oscB.start();
    this.humNodes = { gain, oscA, oscB };
  }
}
