import { useApp } from "../store";

// 宮 商 角 徵 羽 and the octave above: the Chinese pentatonic scale
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
let ctx: AudioContext | null = null;

export function enableSound(): boolean {
  try {
    ctx = ctx ?? new AudioContext();
    void ctx.resume();
    return true;
  } catch {
    return false;
  }
}

/** A guzheng-ish pluck. Silent unless the viewer turned sound on. */
export function pluck(i: number, vol = 0.18) {
  if (!useApp.getState().sound || !ctx) return;
  const t = ctx.currentTime;
  const f = PENTA[((i % PENTA.length) + PENTA.length) % PENTA.length];
  const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
  o.type = "triangle"; o2.type = "sine";
  o.frequency.value = f; o2.frequency.value = f * 2.01;
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(4000, t);
  lp.frequency.exponentialRampToValueAtTime(600, t + 0.8);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(ctx.destination);
  o.start(t); o2.start(t); o.stop(t + 1.7); o2.stop(t + 1.7);
}
