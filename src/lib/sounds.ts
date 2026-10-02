import type { Move } from "chess.js";

// Piece sounds are slices of one recording with several hits (public/sounds, see CREDITS.txt there).
// Offsets were found by onset detection; gain evens out the hits' different loudness.
const SLICES = {
  move: { offset: 5.6, duration: 0.2, gain: 3.5 }, // 3rd hit
  capture: { offset: 8.13, duration: 0.3, gain: 1 }, // 4th hit
};
type Kind = keyof typeof SLICES;

let ctx: AudioContext | null = null;
let recording: Promise<AudioBuffer> | null = null;

// Download early so the first move isn't silent; decoding needs the AudioContext, so it waits.
const raw = typeof window === "undefined" ? null : fetch("/sounds/chess-pieces.mp3").then((r) => r.arrayBuffer());

function audio() {
  if (!raw) return null;
  if (!ctx) {
    const c = (ctx = new AudioContext());
    recording = raw.then((b) => c.decodeAudioData(b));
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function sample(kind: Kind, delay = 0, vol = 1) {
  const c = audio();
  if (!c || !recording) return;
  recording.then((buf) => {
    const { offset, duration, gain } = SLICES[kind];
    const at = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(gain * vol, at);
    g.gain.setValueAtTime(gain * vol, at + duration - 0.03);
    g.gain.linearRampToValueAtTime(0, at + duration); // fade out so the cut doesn't click
    src.connect(g).connect(c.destination);
    src.start(at, offset, duration);
  });
}

export function playMoveSound(m: Move) {
  if (m.isKingsideCastle() || m.isQueensideCastle()) {
    sample("move");
    sample("move", 0.1, 0.7);
  } else {
    sample(m.isCapture() ? "capture" : "move");
  }
}

// step 0, 1, 2 for "3", "2", "1": each beep higher than the last.
const COUNTDOWN_HZ = [440, 554, 659];
export function playCountdownBeep(step: number) {
  const c = audio();
  if (!c) return;
  const at = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.frequency.value = COUNTDOWN_HZ[step] ?? 659;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.25, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
  osc.connect(g).connect(c.destination);
  osc.start(at);
  osc.stop(at + 0.37);
}
