// src/audio/score.js
// 120 BPM musical motif & chord progression shared across all Scaling Law stages.
// Key: D minor -> uplifting Bb-C-Dm -> triumphant D major emergence at 1T+!

export function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// 4-bar looping chord progression (2.0s per bar = 8.0s cycle)
export const CHORDS_MINOR = [
  { root: 50, notes: [50, 57, 62, 65] }, // Dm7 (D3, A3, D4, F4)
  { root: 46, notes: [46, 53, 58, 62] }, // BbMaj7
  { root: 48, notes: [48, 55, 60, 64] }, // C
  { root: 45, notes: [45, 52, 57, 61] }, // A7 -> resolves to Dm
];

// Triumphant major lift progression for 1T+ Emergence & Outro
export const CHORDS_EMERGE = [
  { root: 50, notes: [50, 57, 62, 66, 69] }, // Dmaj9
  { root: 47, notes: [47, 54, 59, 62, 66] }, // Bm7
  { root: 43, notes: [43, 50, 55, 59, 62] }, // Gmaj7
  { root: 45, notes: [45, 52, 57, 61, 64] }, // Aadd9
];

// 16-step eighth-note melody motif (2 bars = 4.0s) in MIDI notes (0 = rest)
export const MOTIF_MINOR = [
  62, 0, 65, 69,  74, 0, 72, 69,
  65, 0, 67, 69,  64, 0, 62, 0,
];

// Heroic lifted motif for 1T+ Emergence
export const MOTIF_EMERGE = [
  62, 66, 69, 74,  78, 0, 76, 74,
  71, 74, 78, 81,  76, 0, 74, 0,
];
