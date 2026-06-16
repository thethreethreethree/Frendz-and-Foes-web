// Synthesized sound effects via the Web Audio API — zero asset files, fully offline.
//
// Each category is a FAMILY of 10 variations, derived by varying pitch / waveform / timing /
// density. playSfx(name, variant) plays a specific one; the host picks a variant per category
// and it's synced to the display so everyone hears the same sound.

export type SfxName = "ding" | "buzzer" | "reveal" | "drumroll" | "applause" | "swoosh";

export const SFX_NAMES: SfxName[] = ["ding", "buzzer", "reveal", "drumroll", "applause", "swoosh"];
export const SFX_VARIANTS = 10;

export const SFX_LABELS: Record<SfxName, string> = {
  ding: "Ding ✔",
  buzzer: "Buzzer ✖",
  reveal: "Reveal",
  drumroll: "Drumroll",
  applause: "Applause",
  swoosh: "Swoosh",
};

let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(value: boolean): void {
  muted = value;
}
export function isMuted(): boolean {
  return muted;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain = 0.2): void {
  const a = ac();
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, a.currentTime + start);
  g.gain.setValueAtTime(0.0001, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, a.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  osc.connect(g).connect(a.destination);
  osc.start(a.currentTime + start);
  osc.stop(a.currentTime + start + dur + 0.02);
}

function sweep(f1: number, f2: number, start: number, dur: number, type: OscillatorType, gain = 0.2): void {
  const a = ac();
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f1, a.currentTime + start);
  osc.frequency.linearRampToValueAtTime(f2, a.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, a.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
  osc.connect(g).connect(a.destination);
  osc.start(a.currentTime + start);
  osc.stop(a.currentTime + start + dur + 0.02);
}

function noise(start: number, dur: number, gain = 0.18): void {
  const a = ac();
  const buffer = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buffer;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(g).connect(a.destination);
  src.start(a.currentTime + start);
}

const WAVES: OscillatorType[] = ["triangle", "sine", "square", "sawtooth"];
// A two-octave-ish set of pleasant pitches to index into.
const SCALE = [392, 440, 494, 523, 587, 659, 698, 784, 880, 988];

const FAMILIES: Record<SfxName, (v: number) => void> = {
  // Bright two-note chime — variant changes root pitch, interval and timbre.
  ding: (v) => {
    const root = SCALE[v % SCALE.length];
    const interval = [1.5, 1.25, 2, 1.33, 1.6, 1.5, 2, 1.25, 1.33, 1.5][v];
    const type = WAVES[v % 2]; // triangle / sine — keep it pleasant
    tone(root, 0, 0.18, type, 0.25);
    tone(root * interval, 0.08, 0.22, type, 0.2);
  },
  // Harsh "wrong" buzzer — variant changes base pitch, waveform, length and glide.
  buzzer: (v) => {
    const base = [220, 200, 180, 160, 247, 233, 210, 190, 170, 140][v];
    const type = WAVES[2 + (v % 2)]; // square / sawtooth
    const dur = 0.35 + (v % 3) * 0.1;
    if (v % 2 === 0) {
      tone(base, 0, dur, type, 0.28);
      tone(base * 0.75, 0.02, dur, "square", 0.16);
    } else {
      sweep(base * 1.2, base * 0.7, 0, dur, type, 0.28);
    }
  },
  // Upward sparkle as an answer flips open — variant changes pitch & shape.
  reveal: (v) => {
    const start = SCALE[v % SCALE.length];
    if (v % 3 === 0) {
      sweep(start, start * 2, 0, 0.18, "sine", 0.22);
    } else {
      tone(start, 0, 0.12, "sine", 0.22);
      tone(start * 1.5, 0.07, 0.14, "sine", 0.2);
    }
  },
  // Rolling rumble — variant changes hit count, speed and pitch.
  drumroll: (v) => {
    const hits = 12 + v;
    const step = 0.035 + (v % 4) * 0.012;
    const pitched = v % 2 === 1;
    for (let i = 0; i < hits; i++) {
      noise(i * step, 0.05, 0.1);
      if (pitched) tone(80 + v * 6, i * step, 0.04, "sawtooth", 0.05);
    }
  },
  // Cheer swell — variant changes density, length and brightness.
  applause: (v) => {
    const bursts = 16 + v * 2;
    const len = 0.16 + (v % 4) * 0.05;
    for (let i = 0; i < bursts; i++) noise(i * 0.04, len, 0.05 + (((i + v) % 3) * 0.02));
  },
  // Transition whoosh — variant changes direction and brightness.
  swoosh: (v) => {
    const hi = 900 + v * 90;
    if (v % 2 === 0) sweep(hi, 300, 0, 0.18, "sine", 0.14);
    else sweep(300, hi, 0, 0.18, "sine", 0.14);
    noise(0, 0.16, 0.05);
  },
};

export function playSfx(name: SfxName, variant = 0): void {
  if (muted) return;
  try {
    FAMILIES[name](((variant % SFX_VARIANTS) + SFX_VARIANTS) % SFX_VARIANTS);
  } catch {
    /* audio unavailable — ignore */
  }
}
