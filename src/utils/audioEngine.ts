// Web Audio API Procedural Flight Audio Synth Engine (Break the Skyline)
// Synthesizes authentic multi-stage rotating piston props, heavy bomber hums, and turbine jet sounds entirely in-browser

class FlightAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true; // Default muted to comply with browser autoplay protections

  // Master connect gain
  private mainGain: GainNode | null = null;

  // Active synthesizer structures
  private engineOscs: OscillatorNode[] = [];
  private engineFilters: BiquadFilterNode[] = [];
  private engineGains: GainNode[] = [];
  private lfoGain: GainNode | null = null;

  // Procedural wind elements
  private windNode: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;

  private currentProfile: string = 'none';
  private lastThrottle: number = 0;
  private lastAirspeed: number = 0;
  private lastVerticalSpeed: number = 0;

  constructor() {
    // Lazily load initial settings
    try {
      const persisted = localStorage.getItem('skyline:audio_muted');
      if (persisted !== null) {
        this.isMuted = persisted === 'true';
      }
    } catch (e) {
      console.warn("Storage access restricted", e);
    }
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.mainGain = this.ctx.createGain();
      this.mainGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.mainGain.connect(this.ctx.destination);

      const targetVolume = this.isMuted ? 0 : 0.45;
      this.mainGain.gain.setValueAtTime(targetVolume, this.ctx.currentTime);
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  private createNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public startHomeScreenEngine() {
    this.init();
    if (!this.ctx || !this.mainGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.stop();
    this.currentProfile = 'home';
    const t = this.ctx.currentTime;

    // Create a smooth idle prop rumble
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, t);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(110, t);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.06, t);

    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(7, t);

    const lfoG = this.ctx.createGain();
    lfoG.gain.setValueAtTime(0.18, t);

    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(this.mainGain);

    lfo.connect(lfoG);
    lfoG.connect(oscGain.gain);

    osc.start(t);
    lfo.start(t);

    this.engineOscs.push(osc, lfo);
    this.engineFilters.push(filter);
    this.engineGains.push(oscGain);
    this.lfoGain = lfoG;

    // Fade-in ambient volume smoothly
    this.mainGain.gain.cancelScheduledValues(t);
    this.mainGain.gain.setValueAtTime(0, t);
    this.mainGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.35, t + 1.2);
  }

  public startFlightEngine(isJetLegacy: boolean | string = false) {
    this.init();
    if (!this.ctx || !this.mainGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.stop();

    // Determine current sound profile based on variable inputs
    let profile = 'propeller';

    if (typeof isJetLegacy === 'string') {
      const aircraftId = isJetLegacy;
      if (aircraftId === 'glider') {
        profile = 'glider';
      } else if (aircraftId === 'stealth_bomber' || aircraftId === 'heavy_bomber' || aircraftId === 'cargo_plane') {
        profile = 'heavy_bomber';
      } else if (aircraftId === 'recon_jet') {
        profile = 'recon_jet';
      } else if (aircraftId === 'military_jet' || aircraftId === 'private_jet' || aircraftId === 'passenger_jet') {
        profile = 'jet';
      }
    } else {
      // Legacy boolean flag fallback
      profile = isJetLegacy ? 'jet' : 'propeller';
    }

    this.currentProfile = profile;
    const t = this.ctx.currentTime;

    // 1. ENGINE SYNTHESIS (Except for Glider)
    if (profile !== 'glider') {
      if (profile === 'propeller') {
        // Lower rhythmic propeller engine tone
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(60, t);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, t);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.12, t);

        const lfo = this.ctx.createOscillator();
        lfo.frequency.setValueAtTime(10, t); // 10Hz spin rate

        const lfoG = this.ctx.createGain();
        lfoG.gain.setValueAtTime(0.3, t);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(this.mainGain);

        lfo.connect(lfoG);
        lfoG.connect(oscGain.gain);

        osc.start(t);
        lfo.start(t);

        this.engineOscs.push(osc, lfo);
        this.engineFilters.push(filter);
        this.engineGains.push(oscGain);
        this.lfoGain = lfoG;

      } else if (profile === 'heavy_bomber') {
        // Deep powerful multi-engine layered rumble
        const clusterFrequencies = [35, 38, 41, 45]; // quad sub oscillators
        clusterFrequencies.forEach((freq) => {
          const osc = this.ctx!.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t);

          const filter = this.ctx!.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(100, t);

          const oscGain = this.ctx!.createGain();
          oscGain.gain.setValueAtTime(0.06, t);

          osc.connect(filter);
          filter.connect(oscGain);
          oscGain.connect(this.mainGain!);

          osc.start(t);

          this.engineOscs.push(osc);
          this.engineFilters.push(filter);
          this.engineGains.push(oscGain);
        });

        // Collectively modulate the rumble
        const lfo = this.ctx.createOscillator();
        lfo.frequency.setValueAtTime(4.2, t);
        const lfoG = this.ctx.createGain();
        lfoG.gain.setValueAtTime(0.18, t);

        lfo.connect(lfoG);
        this.engineGains.forEach(g => lfoG.connect(g.gain));

        lfo.start(t);
        this.engineOscs.push(lfo);
        this.lfoGain = lfoG;

      } else if (profile === 'jet') {
        // Smooth higher pressure tone
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(155, t);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(420, t);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.03, t);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(this.mainGain);

        osc.start(t);

        this.engineOscs.push(osc);
        this.engineFilters.push(filter);
        this.engineGains.push(oscGain);

      } else if (profile === 'recon_jet') {
        // Sharp intense shrieking turbine
        const carrier = this.ctx.createOscillator();
        carrier.type = 'sawtooth';
        carrier.frequency.setValueAtTime(180, t);

        const modulator = this.ctx.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.setValueAtTime(65, t);

        const modGain = this.ctx.createGain();
        modGain.gain.setValueAtTime(35, t);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(1.5, t);
        filter.frequency.setValueAtTime(800, t);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.04, t);

        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(this.mainGain);

        modulator.start(t);
        carrier.start(t);

        this.engineOscs.push(carrier, modulator);
        this.engineFilters.push(filter);
        this.engineGains.push(oscGain);
      }
    }

    // 2. PROCEDURAL WIND SOUND (Increases with airspeed and dives)
    const noiseBuffer = this.createNoiseBuffer();
    if (noiseBuffer) {
      this.windNode = this.ctx.createBufferSource();
      this.windNode.buffer = noiseBuffer;
      this.windNode.loop = true;

      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.Q.setValueAtTime(1.0, t);
      this.windFilter.frequency.setValueAtTime(280, t);

      this.windGain = this.ctx.createGain();
      const initialWind = profile === 'glider' ? 0.08 : 0.03;
      this.windGain.gain.setValueAtTime(initialWind, t);

      this.windNode.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.mainGain);

      this.windNode.start(t);
    }

    // Smooth climb in master volume
    this.mainGain.gain.cancelScheduledValues(t);
    this.mainGain.gain.setValueAtTime(0, t);
    this.mainGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.40, t + 0.6);
  }

  public updateEnginePitch(throttle: number, isJetLegacy: boolean = false) {
    this.updateFlightParameters(throttle, throttle * 2.5, 0);
  }

  public updateFlightParameters(throttle: number, airspeed: number, verticalSpeed: number) {
    if (!this.ctx || this.isMuted) return;

    this.lastThrottle = throttle;
    this.lastAirspeed = airspeed;
    this.lastVerticalSpeed = verticalSpeed;

    const t = this.ctx.currentTime;
    const normThrottle = Math.max(0, Math.min(100, throttle)) / 100;
    const normSpeed = Math.max(0, Math.min(1000, airspeed)) / 1000;

    // 1. DYNAMIC SYNTH CHARACTERISTICS
    if (this.currentProfile !== 'glider' && this.currentProfile !== 'none') {
      if (this.currentProfile === 'propeller') {
        const osc = this.engineOscs[0];
        const lfo = this.engineOscs[1];
        const filter = this.engineFilters[0];
        const gain = this.engineGains[0];

        if (osc) {
          const targetFreq = 50 + normThrottle * 110;
          osc.frequency.setTargetAtTime(targetFreq, t, 0.1);
        }
        if (lfo) {
          const targetLfo = 8 + normThrottle * 16;
          lfo.frequency.setTargetAtTime(targetLfo, t, 0.1);
        }
        if (filter) {
          const targetFilter = 120 + normThrottle * 280;
          filter.frequency.setTargetAtTime(targetFilter, t, 0.12);
        }
        if (gain) {
          const targetGain = 0.07 + normThrottle * 0.12;
          gain.gain.setTargetAtTime(targetGain, t, 0.15);
        }

      } else if (this.currentProfile === 'heavy_bomber') {
        const baseFreqs = [35, 38, 41, 45];
        this.engineOscs.forEach((osc, idx) => {
          if (idx < 4) {
            const targetFreq = baseFreqs[idx] + normThrottle * 32;
            osc.frequency.setTargetAtTime(targetFreq, t, 0.15);
          }
        });

        this.engineFilters.forEach((filter) => {
          const targetFilter = 90 + normThrottle * 110;
          filter.frequency.setTargetAtTime(targetFilter, t, 0.2);
        });

        this.engineGains.forEach((gain) => {
          const targetGain = 0.04 + normThrottle * 0.06;
          gain.gain.setTargetAtTime(targetGain, t, 0.25);
        });

      } else if (this.currentProfile === 'jet') {
        const osc = this.engineOscs[0];
        const filter = this.engineFilters[0];
        const gain = this.engineGains[0];

        if (osc) {
          const targetFreq = 145 + normThrottle * 240;
          osc.frequency.setTargetAtTime(targetFreq, t, 0.18);
        }
        if (filter) {
          const targetFilter = 350 + normThrottle * 1500;
          filter.frequency.setTargetAtTime(targetFilter, t, 0.15);
        }
        if (gain) {
          const targetGain = 0.02 + normThrottle * 0.05;
          gain.gain.setTargetAtTime(targetGain, t, 0.18);
        }

      } else if (this.currentProfile === 'recon_jet') {
        const carrier = this.engineOscs[0];
        const modulator = this.engineOscs[1];
        const filter = this.engineFilters[0];
        const gain = this.engineGains[0];

        if (carrier) {
          const targetFreq = 170 + normThrottle * 310;
          carrier.frequency.setTargetAtTime(targetFreq, t, 0.1);
        }
        if (modulator) {
          const targetMod = 60 + normThrottle * 120;
          modulator.frequency.setTargetAtTime(targetMod, t, 0.1);
        }
        if (filter) {
          const targetFilter = 600 + normThrottle * 2200;
          filter.frequency.setTargetAtTime(targetFilter, t, 0.15);
        }
        if (gain) {
          const targetGain = 0.03 + normThrottle * 0.07;
          gain.gain.setTargetAtTime(targetGain, t, 0.1);
        }
      }
    }

    // 2. DYNAMIC WIND SOUNDS (increases with airspeed and down drafts)
    if (this.windFilter && this.windGain) {
      const descentFactor = Math.min(300, Math.max(0, -verticalSpeed)) / 300;
      const totalWindRatio = Math.max(0, Math.min(1.2, normSpeed * 1.0 + descentFactor * 0.6));

      const targetFilterFreq = 260 + totalWindRatio * 1550;
      this.windFilter.frequency.setTargetAtTime(targetFilterFreq, t, 0.25);

      let windMasterVol = 0.02 + totalWindRatio * 0.16;
      if (this.currentProfile === 'glider') {
        windMasterVol = 0.04 + totalWindRatio * 0.22;
      }
      this.windGain.gain.setTargetAtTime(windMasterVol, t, 0.15);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('skyline:audio_muted', muted ? 'true' : 'false');
    } catch (e) {
      console.warn("Storage write failed", e);
    }

    if (!this.mainGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.mainGain.gain.cancelScheduledValues(t);
    this.mainGain.gain.linearRampToValueAtTime(muted ? 0 : 0.40, t + 0.15);
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public stop() {
    const t = this.ctx ? this.ctx.currentTime : 0;

    this.engineOscs.forEach((osc) => {
      try { osc.stop(t); } catch (e) {}
      try { osc.disconnect(); } catch (e) {}
    });
    this.engineOscs = [];

    this.engineFilters.forEach(f => { try { f.disconnect(); } catch(e){} });
    this.engineFilters = [];

    this.engineGains.forEach(g => { try { g.disconnect(); } catch(e){} });
    this.engineGains = [];

    if (this.lfoGain) {
      try { this.lfoGain.disconnect(); } catch(e){}
      this.lfoGain = null;
    }

    if (this.windNode) {
      try { this.windNode.stop(t); } catch (e) {}
      try { this.windNode.disconnect(); } catch (e) {}
      this.windNode = null;
    }
    if (this.windFilter) {
      try { this.windFilter.disconnect(); } catch (e) {}
      this.windFilter = null;
    }
    if (this.windGain) {
      try { this.windGain.disconnect(); } catch (e) {}
      this.windGain = null;
    }

    this.currentProfile = 'none';
  }
}

export const audioEngine = new FlightAudioEngine();
