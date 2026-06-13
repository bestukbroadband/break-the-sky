// Web Audio API Procedural Flight Audio Synth Engine (Break the Skyline)
// Synthesizes realistic flight deck environments procedurally in-browser

class FlightAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = true; // Default muted to comply with browser autoplay protections
    
    // Nodes
    this.mainGain = null;
    
    // Engine nodes
    this.engineOscs = [];
    this.engineFilters = [];
    this.engineGains = [];
    this.lfoOsc = null;
    this.lfoGain = null;
    
    // Wind nodes
    this.windNode = null;
    this.windFilter = null;
    this.windGain = null;
    
    // Current state
    this.currentProfile = 'none';
    this.lastThrottle = 0;
    this.lastAirspeed = 0;
    this.lastVerticalSpeed = 0;

    // Load initial settings
    try {
      const persisted = localStorage.getItem('skyline:audio_muted');
      if (persisted !== null) {
        this.isMuted = persisted === 'true';
      }
    } catch (e) {
      console.warn("Storage access restricted", e);
    }
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      
      this.mainGain = this.ctx.createGain();
      // Smoothly transition volume
      this.mainGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.mainGain.connect(this.ctx.destination);
      
      // Update gain according to mute state
      const targetVolume = this.isMuted ? 0 : 0.45;
      this.mainGain.gain.setValueAtTime(targetVolume, this.ctx.currentTime);
    } catch (e) {
      console.warn("Web Audio API initialization failed:", e);
    }
  }

  // Generate a random white noise buffer
  createNoiseBuffer() {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  startHomeScreenEngine() {
    this.init();
    if (!this.ctx || !this.mainGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.stop();
    this.currentProfile = 'home';
    const t = this.ctx.currentTime;

    // Soft low frequency engine idle rumble
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(42, t);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(95, t);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.08, t);

    // Subtle rhythmic LFO
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(6.5, t); // 6.5 Hz rhythmic pulse

    const lfoG = this.ctx.createGain();
    lfoG.gain.setValueAtTime(0.2, t);

    // Connections
    osc.connect(filter);
    filter.connect(oscGain);
    oscGain.connect(this.mainGain);

    lfo.connect(lfoG);
    lfoG.connect(oscGain.gain);

    osc.start(t);
    lfo.start(t);

    this.engineOscs.push(osc);
    this.engineOscs.push(lfo);
    this.engineFilters.push(filter);
    this.engineGains.push(oscGain);
    this.lfoGain = lfoG;

    // Fade in
    this.mainGain.gain.cancelScheduledValues(t);
    this.mainGain.gain.setValueAtTime(0, t);
    this.mainGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.40, t + 1.5);
  }

  startFlightEngine(aircraftId) {
    this.init();
    if (!this.ctx || !this.mainGain) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.stop();
    
    // Determine sound profile
    let profile = 'propeller';
    if (aircraftId === 'glider') {
      profile = 'glider';
    } else if (aircraftId === 'stealth_bomber' || aircraftId === 'heavy_bomber' || aircraftId === 'cargo_plane') {
      profile = 'heavy_bomber';
    } else if (aircraftId === 'recon_jet') {
      profile = 'recon_jet';
    } else if (aircraftId === 'military_jet' || aircraftId === 'private_jet' || aircraftId === 'passenger_jet') {
      profile = 'jet';
    }

    this.currentProfile = profile;
    const t = this.ctx.currentTime;

    // 1. SETUP ENGINE SYNTHESIS (Except for Glider)
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
          const osc = this.ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t);

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(100, t);

          const oscGain = this.ctx.createGain();
          oscGain.gain.setValueAtTime(0.06, t);

          osc.connect(filter);
          filter.connect(oscGain);
          oscGain.connect(this.mainGain);

          osc.start(t);

          this.engineOscs.push(osc);
          this.engineFilters.push(filter);
          this.engineGains.push(oscGain);
        });

        // Add a master LFO to modulate the collective rumble beating
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
        // High turbine whine and combustion roar
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
        // Sharp intense supersonic shrieking turbine
        const carrier = this.ctx.createOscillator();
        carrier.type = 'sawtooth';
        carrier.frequency.setValueAtTime(180, t);

        const modulator = this.ctx.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.setValueAtTime(65, t);

        const modGain = this.ctx.createGain();
        modGain.gain.setValueAtTime(35, t); // PM index

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

    // 2. SETUP PROCEDURAL WIND SYSTEM (Increases with airspeed and dives)
    const noiseBuffer = this.createNoiseBuffer();
    if (noiseBuffer) {
      this.windNode = this.ctx.createBufferSource();
      this.windNode.buffer = noiseBuffer;
      this.windNode.loop = true;

      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.Q.setValueAtTime(1.0, t);
      this.windFilter.frequency.setValueAtTime(280, t); // start with low whistle

      this.windGain = this.ctx.createGain();
      // Glider receives higher initial wind presence
      const initialWind = profile === 'glider' ? 0.08 : 0.03;
      this.windGain.gain.setValueAtTime(initialWind, t);

      this.windNode.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.mainGain);

      this.windNode.start(t);
    }

    // Trigger smooth volume fade
    this.mainGain.gain.cancelScheduledValues(t);
    this.mainGain.gain.setValueAtTime(0, t);
    this.mainGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 0.40, t + 0.8);
  }

  updateEnginePitch(throttle, isJetSample = false) {
    // This exists to support any legacy direct calls
    this.updateFlightParameters(throttle, throttle * 2.5, 0);
  }

  updateFlightParameters(throttle, airspeed, verticalSpeed) {
    if (!this.ctx || this.isMuted) return;

    this.lastThrottle = throttle;
    this.lastAirspeed = airspeed;
    this.lastVerticalSpeed = verticalSpeed;

    const t = this.ctx.currentTime;
    const normThrottle = Math.max(0, Math.min(100, throttle)) / 100;
    const normSpeed = Math.max(0, Math.min(1000, airspeed)) / 1000;

    // 1. UPDATE ENGINE PITCH & VOLUME
    if (this.currentProfile !== 'glider' && this.currentProfile !== 'none') {
      if (this.currentProfile === 'propeller') {
        const osc = this.engineOscs[0];
        const lfo = this.engineOscs[1];
        const filter = this.engineFilters[0];
        const gain = this.engineGains[0];

        if (osc) {
          const targetFreq = 50 + normThrottle * 110; // 50Hz to 160Hz
          osc.frequency.setTargetAtTime(targetFreq, t, 0.1);
        }
        if (lfo) {
          const targetLfo = 8 + normThrottle * 16; // Flutter rate
          lfo.frequency.setTargetAtTime(targetLfo, t, 0.1);
        }
        if (filter) {
          const targetFilter = 120 + normThrottle * 280; // filter opens up under high RPM
          filter.frequency.setTargetAtTime(targetFilter, t, 0.12);
        }
        if (gain) {
          const targetGain = 0.07 + normThrottle * 0.12; // louder under high throttle
          gain.gain.setTargetAtTime(targetGain, t, 0.15);
        }

      } else if (this.currentProfile === 'heavy_bomber') {
        // Multi-oscillator heavy cluster frequencies
        const baseFreqs = [35, 38, 41, 45];
        this.engineOscs.forEach((osc, idx) => {
          if (idx < 4) { // first four sub oscillators
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
          const targetFreq = 145 + normThrottle * 240; // High frequency turbine whistle
          osc.frequency.setTargetAtTime(targetFreq, t, 0.18);
        }
        if (filter) {
          const targetFilter = 350 + normThrottle * 1500; // jet roar opens filter wide
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
          const targetFreq = 170 + normThrottle * 310; // Intense shriek
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

    // 2. UPDATE PROCEDURAL WIND SOUND (Increases with speed + dives)
    if (this.windFilter && this.windGain) {
      // Calculate nose dive factor (downwards vertical speed creates heavy rushes in cockpit)
      // Negative verticalSpeed means descending
      const descentFactor = Math.min(300, Math.max(0, -verticalSpeed)) / 300; 
      const totalWindRatio = Math.max(0, Math.min(1.2, normSpeed * 1.0 + descentFactor * 0.6));

      // Cutoff moves from lower frequency rustling (300Hz) up to screeching storm wind (1900Hz)
      const targetFilterFreq = 260 + totalWindRatio * 1550;
      this.windFilter.frequency.setTargetAtTime(targetFilterFreq, t, 0.25);

      // Volume swells
      let windMasterVol = 0.02 + totalWindRatio * 0.16;
      if (this.currentProfile === 'glider') {
        windMasterVol = 0.04 + totalWindRatio * 0.22; // higher wind priority on glider
      }
      this.windGain.gain.setTargetAtTime(windMasterVol, t, 0.15);
    }
  }

  setMute(muted) {
    this.isMuted = muted;
    try {
      localStorage.setItem('skyline:audio_muted', muted ? 'true' : 'false');
    } catch (e) {
      console.warn("Storage write failed", e);
    }

    if (!this.mainGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.mainGain.gain.cancelScheduledValues(t);
    
    // Smooth transition to avoid pop/clicks
    this.mainGain.gain.linearRampToValueAtTime(muted ? 0 : 0.40, t + 0.15);
  }

  getIsMuted() {
    return this.isMuted;
  }

  stop() {
    const t = this.ctx ? this.ctx.currentTime : 0;
    
    // Stop all oscillators
    this.engineOscs.forEach((osc) => {
      try { osc.stop(t); } catch (e) {}
      try { osc.disconnect(); } catch (e) {}
    });
    this.engineOscs = [];
    
    // Disconnect filters & gains
    this.engineFilters.forEach(f => { try { f.disconnect(); } catch(e){} });
    this.engineFilters = [];
    
    this.engineGains.forEach(g => { try { g.disconnect(); } catch(e){} });
    this.engineGains = [];
    
    if (this.lfoGain) {
      try { this.lfoGain.disconnect(); } catch(e){}
      this.lfoGain = null;
    }

    // Stop wind node
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
