/**
 * Procedural 8-bit audio manager using the Web Audio API.
 *
 * All sounds are synthesised at runtime — no audio files required.
 * Mute state is persisted in localStorage so it survives page reloads.
 */

const STORAGE_KEY = 'flap-audio-muted';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AudioManager = {
  playFlap: () => void;
  playScore: () => void;
  playDie: () => void;
  isMuted: () => boolean;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => boolean; // returns new muted state
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

type OscType = OscillatorType;

type NoteSegment = {
  freq: number;
  duration: number; // seconds
  type: OscType;
  gainStart: number;
  gainEnd: number;
};

/**
 * Play a sequence of oscillator segments back-to-back on a shared AudioContext.
 * Each segment is a single OscillatorNode + GainNode pair that is created,
 * started, and then allowed to garbage-collect when it finishes — matching
 * the fire-and-forget pattern that the Web Audio spec recommends.
 */
const playSequence = (
  ctx: AudioContext,
  masterGain: GainNode,
  segments: NoteSegment[]
): void => {
  let startTime = ctx.currentTime;

  for (const seg of segments) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(masterGain);

    osc.type = seg.type;
    osc.frequency.setValueAtTime(seg.freq, startTime);

    gain.gain.setValueAtTime(seg.gainStart, startTime);
    gain.gain.linearRampToValueAtTime(seg.gainEnd, startTime + seg.duration);

    osc.start(startTime);
    osc.stop(startTime + seg.duration);

    startTime += seg.duration;
  }
};

// ─── Sound definitions ────────────────────────────────────────────────────────

/** Short ascending chirp — wing flap */
const FLAP_SEQUENCE: NoteSegment[] = [
  { freq: 320, duration: 0.04, type: 'square', gainStart: 0.18, gainEnd: 0.08 },
  { freq: 580, duration: 0.05, type: 'square', gainStart: 0.12, gainEnd: 0.0 },
];

/** Two-tone ascending ding — pipe cleared */
const SCORE_SEQUENCE: NoteSegment[] = [
  { freq: 520, duration: 0.07, type: 'sine', gainStart: 0.22, gainEnd: 0.18 },
  { freq: 820, duration: 0.1,  type: 'sine', gainStart: 0.18, gainEnd: 0.0 },
];

/** Descending buzz — collision / death */
const DIE_SEQUENCE: NoteSegment[] = [
  { freq: 440, duration: 0.06, type: 'sawtooth', gainStart: 0.25, gainEnd: 0.22 },
  { freq: 280, duration: 0.08, type: 'sawtooth', gainStart: 0.22, gainEnd: 0.18 },
  { freq: 140, duration: 0.14, type: 'sawtooth', gainStart: 0.18, gainEnd: 0.0 },
];

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates an AudioManager instance.
 *
 * The AudioContext is created lazily on the first play call so that browsers
 * with strict autoplay policies (which require a user gesture) don't block
 * construction.
 */
export const createAudioManager = (): AudioManager => {
  let ctx: AudioContext | null = null;
  let masterGain: GainNode | null = null;

  // Read initial mute state from localStorage (default: unmuted)
  let muted: boolean = (() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  })();

  const getContext = (): { ctx: AudioContext; masterGain: GainNode } => {
    if (!ctx || ctx.state === 'closed') {
      ctx = new AudioContext();
      masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.value = muted ? 0 : 1;
    }
    // Resume if suspended (e.g. browser autoplay policy)
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    return { ctx, masterGain: masterGain! };
  };

  const play = (segments: NoteSegment[]): void => {
    if (muted) return;
    try {
      const { ctx: audioCtx, masterGain: gain } = getContext();
      playSequence(audioCtx, gain, segments);
    } catch {
      // Web Audio not available (e.g. some sandboxed environments) — silently ignore
    }
  };

  return {
    playFlap: () => play(FLAP_SEQUENCE),
    playScore: () => play(SCORE_SEQUENCE),
    playDie: () => play(DIE_SEQUENCE),

    isMuted: () => muted,

    setMuted: (value: boolean) => {
      muted = value;
      try {
        localStorage.setItem(STORAGE_KEY, String(value));
      } catch {
        // localStorage unavailable — ignore
      }
      // Update gain on the live context if it exists
      if (masterGain) {
        masterGain.gain.setValueAtTime(value ? 0 : 1, ctx?.currentTime ?? 0);
      }
    },

    toggleMuted() {
      const next = !muted;
      muted = next;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch { /* ignore */ }
      if (masterGain) {
        masterGain.gain.setValueAtTime(next ? 0 : 1, ctx?.currentTime ?? 0);
      }
      return next;
    },
  };
};
