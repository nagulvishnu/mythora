/* Original procedural audio — synthesised with the Web Audio API (no external files).
   Nothing is created until the visitor explicitly enables sound. */

export type AudioScene = "intro" | "hub" | "aetheria" | "evergreen" | "dragonfall" | "eldoria" | "umbracia";
export type Sfx = "portal" | "chime" | "roar" | "whoosh" | "click" | "thunder";

interface Profile {
  wind: number;
  water: number;
  forest: number;
  fire: number;
  drone: number;
  temple: number;
  magic: number;
  root: number;
  detune: number;
}

const PROFILES: Record<AudioScene, Profile> = {
  intro: { wind: 0.3, water: 0.08, forest: 0, fire: 0, drone: 0.6, temple: 0, magic: 0.5, root: 55, detune: 6 },
  hub: { wind: 0.1, water: 0, forest: 0, fire: 0, drone: 0.6, temple: 0.2, magic: 0.8, root: 73.4, detune: 5 },
  aetheria: { wind: 0.7, water: 0.3, forest: 0, fire: 0, drone: 0.35, temple: 0, magic: 0.35, root: 65.4, detune: 4 },
  evergreen: { wind: 0.25, water: 0.3, forest: 0.8, fire: 0, drone: 0.3, temple: 0, magic: 0.35, root: 82.4, detune: 4 },
  dragonfall: { wind: 0.6, water: 0, forest: 0, fire: 0.8, drone: 0.6, temple: 0, magic: 0, root: 55, detune: 7 },
  eldoria: { wind: 0.25, water: 0, forest: 0, fire: 0, drone: 0.5, temple: 0.8, magic: 0.15, root: 61.7, detune: 5 },
  umbracia: { wind: 0.2, water: 0, forest: 0, fire: 0, drone: 0.9, temple: 0, magic: 0.6, root: 46.2, detune: 14 },
};

class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  reverb: ConvolverNode | null = null;
  noise: AudioBuffer | null = null;
  layers: Record<string, GainNode> = {};
  oscs: OscillatorNode[] = [];
  scene: AudioScene = "intro";
  profile: Profile = PROFILES.intro;
  volume = 0.6;
  muted = false;
  enabled = false;
  timer: ReturnType<typeof setInterval> | null = null;

  private makeNoise(ctx: AudioContext) {
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.97 * b0 + 0.03 * w; // pinkish
      d[i] = (w * 0.5 + b0 * 6) * 0.5;
    }
    return buf;
  }

  private makeReverb(ctx: AudioContext) {
    const len = ctx.sampleRate * 3.2;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    return conv;
  }

  private noiseSrc(filter: BiquadFilterType, freq: number, q: number, gainNode: GainNode) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    src.connect(f).connect(gainNode);
    src.start();
    return f;
  }

  private lfo(param: AudioParam, rate: number, depth: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.value = rate;
    const g = ctx.createGain();
    g.gain.value = depth;
    o.connect(g).connect(param);
    o.start();
  }

  private build() {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.ctx = ctx;
    this.noise = this.makeNoise(ctx);
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(ctx.destination);
    this.reverb = this.makeReverb(ctx);
    const rg = ctx.createGain();
    rg.gain.value = 0.55;
    this.reverb.connect(rg).connect(this.master);

    const mk = (name: string) => {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.master!);
      this.layers[name] = g;
      return g;
    };
    // wind
    const wf = this.noiseSrc("bandpass", 420, 0.6, mk("wind"));
    this.lfo(wf.frequency, 0.07, 200);
    this.lfo(this.layers.wind.gain, 0.05, 0.05);
    // water
    const wa = this.noiseSrc("bandpass", 1400, 0.35, mk("water"));
    this.lfo(wa.frequency, 0.3, 250);
    // fire / lava rumble
    const fi = this.noiseSrc("lowpass", 150, 0.8, mk("fire"));
    this.lfo(fi.frequency, 0.4, 60);
    // forest air
    this.noiseSrc("highpass", 4200, 0.4, mk("forest"));
    mk("drone");
    mk("temple");
    mk("magic");

    // drone: stacked detuned oscillators
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 700;
    this.lfo(droneFilter.frequency, 0.05, 260);
    droneFilter.connect(this.layers.drone);
    droneFilter.connect(this.reverb);
    const ratios = [1, 1.5, 2, 3.01, 0.5];
    ratios.forEach((r, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? "sine" : "sawtooth";
      o.frequency.value = this.profile.root * r;
      o.detune.value = (i - 2) * this.profile.detune;
      const g = ctx.createGain();
      g.gain.value = i === 0 || i === 4 ? 0.22 : 0.09;
      o.connect(g).connect(droneFilter);
      o.start();
      this.oscs.push(o);
    });
    this.timer = setInterval(() => this.tick(), 1400);
    this.applyScene(1.5);
  }

  async enable() {
    if (typeof window === "undefined") return;
    if (!this.ctx) this.build();
    await this.ctx!.resume();
    this.enabled = true;
  }

  async disable() {
    this.enabled = false;
    await this.ctx?.suspend();
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : v, this.ctx.currentTime, 0.05);
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }

  setScene(s: AudioScene) {
    this.scene = s;
    this.profile = PROFILES[s];
    this.applyScene(2.2);
  }

  private applyScene(t: number) {
    if (!this.ctx) return;
    const p = this.profile;
    const now = this.ctx.currentTime;
    const set = (k: string, v: number) => this.layers[k]?.gain.setTargetAtTime(v, now, t / 3);
    set("wind", p.wind * 0.35);
    set("water", p.water * 0.22);
    set("fire", p.fire * 0.9);
    set("forest", p.forest * 0.05);
    set("drone", p.drone * 0.22);
    set("temple", 1);
    set("magic", 1);
    const ratios = [1, 1.5, 2, 3.01, 0.5];
    this.oscs.forEach((o, i) => {
      o.frequency.setTargetAtTime(p.root * ratios[i], now, t / 3);
      o.detune.setTargetAtTime((i - 2) * p.detune, now, t / 3);
    });
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, toReverb = true, sweepTo?: number) {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.05, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.master!);
    if (toReverb && this.reverb) g.connect(this.reverb);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  private tick() {
    if (!this.ctx || !this.enabled || this.ctx.state !== "running") return;
    const p = this.profile;
    const r = Math.random;
    // magical shimmer notes (pentatonic)
    if (p.magic > 0.05 && r() < 0.45 * p.magic) {
      const sc = [0, 2, 4, 7, 9, 12, 14];
      const n = sc[Math.floor(r() * sc.length)];
      this.tone(p.root * 8 * Math.pow(2, n / 12), 2.6, "sine", 0.025 * p.magic);
    }
    // forest birds
    if (p.forest > 0.05 && r() < 0.7 * p.forest) {
      const base = 1800 + r() * 1800;
      for (let i = 0; i < 2 + Math.floor(r() * 3); i++) this.tone(base * (1 + r() * 0.2), 0.12, "sine", 0.025 * p.forest, i * 0.13, true, base * 1.5);
    }
    // temple drips + low pulse
    if (p.temple > 0.05 && r() < 0.5 * p.temple) {
      this.tone(700 + r() * 500, 0.35, "sine", 0.05 * p.temple, 0, true, 300);
      if (r() < 0.25) this.tone(p.root, 3.4, "triangle", 0.05, 0.2);
    }
    // distant dragons
    if (p.fire > 0.05 && r() < 0.06) this.play("roar", 0.25);
    // water trickle
    if (p.water > 0.1 && r() < 0.15) this.tone(1100 + r() * 700, 0.1, "sine", 0.012, 0, false, 600);
  }

  play(name: Sfx, volMul = 1) {
    if (!this.ctx || !this.enabled || this.ctx.state !== "running") return;
    const ctx = this.ctx;
    const burst = (dur: number, filt: BiquadFilterType, f0: number, f1: number, vol: number, q = 1) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = filt;
      f.Q.value = q;
      f.frequency.setValueAtTime(f0, ctx.currentTime);
      f.frequency.exponentialRampToValueAtTime(f1, ctx.currentTime + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + dur * 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      src.connect(f).connect(g);
      g.connect(this.master!);
      g.connect(this.reverb!);
      src.start();
      src.stop(ctx.currentTime + dur + 0.1);
    };
    switch (name) {
      case "portal":
        this.tone(90, 2.8, "sawtooth", 0.1 * volMul, 0, true, 900);
        this.tone(180, 2.8, "sine", 0.12 * volMul, 0, true, 1800);
        burst(2.8, "bandpass", 200, 3000, 0.5 * volMul, 2);
        [0, 0.15, 0.3, 0.45].forEach((t, i) => this.tone(880 * Math.pow(1.5, i % 3), 1.8, "sine", 0.05 * volMul, 1.4 + t));
        break;
      case "chime":
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 2.4, "sine", 0.06 * volMul, i * 0.12));
        break;
      case "roar":
        this.tone(95, 2.2, "sawtooth", 0.16 * volMul, 0, true, 38);
        this.tone(140, 2.0, "square", 0.05 * volMul, 0.05, true, 55);
        burst(2.2, "bandpass", 700, 120, 0.7 * volMul, 1.5);
        break;
      case "whoosh":
        burst(1.6, "bandpass", 300, 1800, 0.5 * volMul, 0.8);
        break;
      case "thunder":
        burst(3.2, "lowpass", 400, 50, 0.9 * volMul, 0.7);
        break;
      case "click":
        this.tone(1200, 0.08, "sine", 0.04 * volMul, 0, false, 700);
        break;
    }
  }
}

export const audio = new AudioEngine();
