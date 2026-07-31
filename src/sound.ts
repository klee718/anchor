export type SoundKind = "tap" | "unlock" | "chime";

const STORAGE_KEY = "anchor_sound_enabled";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

/** Sound defaults to muted; this is the only way it gets turned on, and it's always behind a user gesture. */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
  if (enabled) getAudioContext();
}

function playTone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType,
  peakGain: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain).connect(dest);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/**
 * Synthesized sound archetypes (Web Audio oscillators, no audio assets):
 * - tap: soft damped snap for card/button interactions
 * - unlock: gentle ascending triad for XP earned / module unlocked
 * - chime: deep, rich tone for daily verse completion
 * No-ops silently if sound is muted or Web Audio is unavailable.
 */
export function playSound(kind: SoundKind): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.3;
  master.connect(ctx.destination);

  if (kind === "tap") {
    playTone(ctx, master, 200, now, 0.09, "sine", 0.5);
    playTone(ctx, master, 140, now, 0.07, "triangle", 0.25);
  } else if (kind === "unlock") {
    [392.0, 493.88, 587.33].forEach((freq, i) => {
      playTone(ctx, master, freq, now + i * 0.09, 0.55, "triangle", 0.35);
    });
  } else if (kind === "chime") {
    playTone(ctx, master, 523.25, now, 1.6, "sine", 0.3);
    playTone(ctx, master, 659.25, now + 0.04, 1.6, "sine", 0.18);
    playTone(ctx, master, 783.99, now + 0.08, 1.8, "sine", 0.14);
  }
}
