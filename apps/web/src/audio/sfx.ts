// Synthesized sound effects via the Web Audio API.
//
// WHY synth instead of audio files: the game must run at events that may be offline, and we
// don't want to ship/license a sound pack just to get a "game-show" feel. These are generated
// on the fly, so there are zero assets to load and it works fully offline. Real samples can
// replace these later by swapping this module's implementation.

export type SfxName = "ding" | "buzzer" | "reveal" | "drumroll" | "applause" | "swoosh";

let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new Ctor();
  }
  // Browsers suspend audio until a user gesture; resume opportunistically.
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

function noise(start: number, dur: number, gain = 0.18): void {
  const a = ac();
  const buffer = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buffer;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(g).connect(a.destination);
  src.start(a.currentTime + start);
}

const players: Record<SfxName, () => void> = {
  // Bright two-note "correct" chime.
  ding: () => {
    tone(880, 0, 0.18, "triangle", 0.25);
    tone(1320, 0.08, 0.22, "triangle", 0.22);
  },
  // Harsh descending "wrong" buzzer.
  buzzer: () => {
    tone(220, 0, 0.45, "sawtooth", 0.28);
    tone(160, 0.02, 0.45, "square", 0.18);
  },
  // Quick upward sweep as an answer flips open.
  reveal: () => {
    tone(520, 0, 0.12, "sine", 0.22);
    tone(780, 0.07, 0.14, "sine", 0.2);
  },
  // Rolling low rumble for suspense.
  drumroll: () => {
    for (let i = 0; i < 14; i++) noise(i * 0.06, 0.05, 0.12);
  },
  // Noise swell standing in for applause.
  applause: () => {
    for (let i = 0; i < 22; i++) noise(i * 0.04, 0.2, 0.06 + Math.random() * 0.05);
  },
  swoosh: () => {
    tone(1200, 0, 0.18, "sine", 0.12);
    noise(0, 0.16, 0.06);
  },
};

export function playSfx(name: SfxName): void {
  if (muted) return;
  try {
    players[name]();
  } catch {
    /* audio not available — ignore */
  }
}
