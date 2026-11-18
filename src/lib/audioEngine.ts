/**
 * TimeOrbit Celestial & Planetary Audio Engine
 * Uses Web Audio API to synthesize pristine cosmic frequency drones and hourly astronomical chimes.
 * 100% offline, zero external audio asset dependencies, ultra-lightweight (<2KB memory).
 */

class PlanetaryAudioEngine {
  private ctx: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private ambientOsc1: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private ambientLfo: OscillatorNode | null = null;
  private isAmbientOn: boolean = false;
  private isChimeOn: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('timeorbit_sound_prefs');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.isChimeOn = Boolean(parsed.hourlyChime);
        }
      } catch {}
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Synthesize a pristine, harmonic observatory chime
   */
  public playObservatoryChime(frequency: number = 528): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Harmonic singing bowl / chronometer frequencies (Fundamental + 2nd + 3rd harmonic)
    const harmonics = [
      { freq: frequency, gain: 0.35, decay: 2.8 },
      { freq: frequency * 2, gain: 0.18, decay: 1.9 },
      { freq: frequency * 2.75, gain: 0.08, decay: 1.2 },
    ];

    harmonics.forEach(({ freq, gain, decay }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + 0.03); // Quick soft attack
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay); // Gentle natural decay

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + decay);
    });
  }

  /**
   * Synthesize an attention-grabbing, multi-cycle observatory countdown alarm (~5.5 seconds)
   * Repeats a 4-tone ascending celestial chime sequence across multiple cycles so users never miss it.
   */
  public playTimerAlarm(cycles: number = 4): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const baseFreqs = [880, 1108.73, 1318.51, 1760]; // A5, C#6, E6, A6

    for (let c = 0; c < cycles; c++) {
      const cycleStart = ctx.currentTime + c * 1.35;

      baseFreqs.forEach((freq, idx) => {
        const toneStart = cycleStart + idx * 0.16;
        const duration = idx === 3 ? (c === cycles - 1 ? 2.2 : 0.55) : 0.22;

        const osc = ctx.createOscillator();
        const harm = ctx.createOscillator();
        const gain = ctx.createGain();

        // Blend triangle fundamental + sine harmonic for warm, crisp acoustic chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, toneStart);

        harm.type = 'sine';
        harm.frequency.setValueAtTime(freq * 2, toneStart);

        gain.gain.setValueAtTime(0.001, toneStart);
        gain.gain.exponentialRampToValueAtTime(0.38, toneStart + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + duration);

        osc.connect(gain);
        harm.connect(gain);
        gain.connect(ctx.destination);

        osc.start(toneStart);
        harm.start(toneStart);
        osc.stop(toneStart + duration);
        harm.stop(toneStart + duration);
      });
    }
  }

  /**
   * Toggle the continuous cosmic ambient focus drone (432Hz harmonic binaural meditation)
   */
  public toggleCosmicAmbient(enable?: boolean): boolean {
    const nextState = enable !== undefined ? enable : !this.isAmbientOn;
    const ctx = this.getAudioContext();
    if (!ctx) return false;

    if (nextState) {
      if (this.isAmbientOn) return true;

      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, now);
      masterGain.gain.exponentialRampToValueAtTime(0.06, now + 2.5); // Soft 2.5s fade in

      // Resonant Lowpass Filter to create warm cosmic depth
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, now);
      filter.Q.setValueAtTime(2.5, now);

      // Oscillator 1: 108 Hz (Sacred Planetary Sub-Harmonic)
      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(108, now);

      // Oscillator 2: 108.5 Hz (Subtle 0.5Hz binaural wave for mental focus)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(108.5, now);

      // LFO for slow, breathing atmospheric pulse
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.12, now); // 8-second breathing cycle
      lfoGain.gain.setValueAtTime(60, now);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      lfo.start(now);

      this.ambientGain = masterGain;
      this.ambientOsc1 = osc1;
      this.ambientOsc2 = osc2;
      this.ambientLfo = lfo;
      this.isAmbientOn = true;
    } else {
      if (!this.isAmbientOn) return false;

      const now = ctx.currentTime;
      if (this.ambientGain) {
        this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now);
        this.ambientGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      }

      setTimeout(() => {
        try {
          this.ambientOsc1?.stop();
          this.ambientOsc2?.stop();
          this.ambientLfo?.stop();
          this.ambientOsc1?.disconnect();
          this.ambientOsc2?.disconnect();
          this.ambientLfo?.disconnect();
        } catch {}
        this.isAmbientOn = false;
      }, 1600);
    }

    return this.isAmbientOn;
  }

  public getAmbientState(): boolean {
    return this.isAmbientOn;
  }

  public getHourlyChimeState(): boolean {
    return this.isChimeOn;
  }

  public setHourlyChimeState(enabled: boolean): void {
    this.isChimeOn = enabled;
    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem('timeorbit_sound_prefs') || '{}');
        saved.hourlyChime = enabled;
        localStorage.setItem('timeorbit_sound_prefs', JSON.stringify(saved));
      } catch {}
    }
    if (enabled) {
      this.playObservatoryChime(528); // Play preview
    }
  }
}

export const audioEngine = new PlanetaryAudioEngine();
