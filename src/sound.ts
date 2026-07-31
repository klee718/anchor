export type SoundKind = "tap" | "unlock" | "chime" | "enter";

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
  else stopAmbient();
}

function playTone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType,
  peakGain: number,
  detune = 0
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  osc.detune.setValueAtTime(detune, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain).connect(dest);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/** A struck-bell timbre: a fundamental plus slightly inharmonic overtones (real bells aren't purely harmonic) and a slow decay — reads as a chapel/temple bell rather than a synth blip. */
function playBell(ctx: AudioContext, dest: AudioNode, fundamental: number, startTime: number, duration: number, peakGain: number) {
  const partials = [1, 2.42, 3.86, 5.14];
  const partialGains = [1, 0.45, 0.22, 0.12];
  partials.forEach((ratio, i) => {
    playTone(ctx, dest, fundamental * ratio, startTime, duration * (1 - i * 0.12), "sine", peakGain * partialGains[i]);
  });
}

/** A plucked-string (harp/lyre) timbre: fast attack, natural decay, two slightly detuned voices for warmth. */
function playPluck(ctx: AudioContext, dest: AudioNode, freq: number, startTime: number, peakGain: number) {
  playTone(ctx, dest, freq, startTime, 0.7, "triangle", peakGain, -6);
  playTone(ctx, dest, freq, startTime, 0.7, "triangle", peakGain * 0.7, 6);
}

/**
 * Synthesized sound archetypes (Web Audio oscillators, no audio assets):
 * - tap: soft damped snap for card/button interactions
 * - unlock: warm harp-like arpeggio for XP earned / module unlocked
 * - chime: deep chapel-bell toll for daily verse completion
 * - enter: a single soft, distant bell toll when opening a lesson
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
      playPluck(ctx, master, freq, now + i * 0.1, 0.32);
    });
  } else if (kind === "chime") {
    playBell(ctx, master, 261.63, now, 2.2, 0.42);
    playBell(ctx, master, 392.0, now + 0.15, 2.0, 0.22);
  } else if (kind === "enter") {
    playBell(ctx, master, 220.0, now, 1.8, 0.28);
  }
}

// ── Ambient drone ──────────────────────────────────────────────────
// A very quiet, slowly "breathing" open-fifth pad — the continuous, contemplative
// backdrop for the course page itself, distinct from the discrete tap/unlock/chime
// cues above. Lives at module scope so it survives navigating between screens.

let ambient: { voices: OscillatorNode[]; gain: GainNode } | null = null;

export function startAmbient(): void {
  if (ambient) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 2.5);
  gain.connect(ctx.destination);

  // Open fifth (G2 + D3) — calm, sustained, sacred-sounding drone.
  const voices = [98.0, 146.83].map((freq) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start();
    return osc;
  });

  // Slow LFO modulating the drone's volume for a gentle "breathing" swell.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.018;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  lfo.start();
  voices.push(lfo);

  ambient = { voices, gain };
}

export function stopAmbient(): void {
  if (!ambient) return;
  const ctx = audioCtx;
  const { voices, gain } = ambient;
  ambient = null;
  if (ctx) {
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.8);
  }
  setTimeout(() => {
    voices.forEach((v) => {
      try {
        v.stop();
      } catch {
        // already stopped
      }
    });
  }, 900);
}
