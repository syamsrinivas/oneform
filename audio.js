// ONEFORM — Web Audio API Mechanical Sound Engine
// Procedural synthesis of mechanical clicks, ratchet ticks, and solid over-center locks

class MechanicalAudioEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.lastTickTime = 0;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
                this.initialized = true;
            }
        } catch (e) {
            console.warn('Web Audio not available', e);
        }
    }

    ensureContext() {
        if (!this.initialized) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    // Subtle tactile mechanical ratchet tick during slider movement
    playRatchetTick(pitch = 1.0) {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const now = performance.now();
        if (now - this.lastTickTime < 45) return; // Debounce
        this.lastTickTime = now;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2200 * pitch, t);
        osc.frequency.exponentialRampToValueAtTime(350 * pitch, t + 0.015);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, t);
        filter.Q.setValueAtTime(4.0, t);

        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.02);
    }

    // Heavy, satisfying over-center mechanical lock sound when reaching 100%
    playLockSound() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;

        // Primary solid metallic impact
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(140, t);
        osc1.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        gain1.gain.setValueAtTime(0.18, t);
        gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.start(t);
        osc1.stop(t + 0.15);

        // High precision snap click (spring-loaded detent pin)
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(3200, t);
        osc2.frequency.exponentialRampToValueAtTime(800, t + 0.04);
        gain2.gain.setValueAtTime(0.22, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.start(t);
        osc2.stop(t + 0.06);

        // Subtle resonant body thud
        const osc3 = this.ctx.createOscillator();
        const gain3 = this.ctx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(75, t);
        osc3.frequency.exponentialRampToValueAtTime(20, t + 0.25);
        gain3.gain.setValueAtTime(0.12, t);
        gain3.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        osc3.connect(gain3);
        gain3.connect(this.ctx.destination);
        osc3.start(t);
        osc3.stop(t + 0.25);
    }

    // Release latch unlock click
    playUnlockSound() {
        if (this.muted) return;
        this.ensureContext();
        if (!this.ctx) return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(850, t);
        osc.frequency.exponentialRampToValueAtTime(2100, t + 0.035);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.05);
    }
}

window.soundEngine = new MechanicalAudioEngine();
