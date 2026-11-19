// src/audio/engine.js
// Zero-sample procedural Web Audio master track synthesizer (100.0s / 1:40 at 120 BPM).
// Evolves continuously from 1M static -> 100M detuned -> 7B sterile triangle ->
// 32B slipping groove -> 70B tight groove -> 1T CoT cathedral filter ->
// 1T 2D Drop + bike bell (64s-74s) -> 10T 3D Grand Cinematic Expansion (74s-90s) -> Outro (90s-100s).

import { BEAT_SEC, BAR_SEC, TOTAL_DURATION, CHECKPOINT_GATES } from '../beat/timeline.js';
import { midiToHz, CHORDS_MINOR, CHORDS_EMERGE, MOTIF_MINOR, MOTIF_EMERGE } from './score.js';
import { makePRNG } from '../kit/prng.js';

function createNoiseBuffer(ctx, durationSec = 2.0, pink = false) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * durationSec);
  const buf = ctx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  const rng = makePRNG(pink ? 991 : 404);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) {
    const white = rng() * 2 - 1;
    if (pink) {
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.18) * 0.5;
    } else {
      data[i] = white;
    }
  }
  return buf;
}

function createReverbIR(ctx, duration = 2.4, decay = 2.6) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * duration);
  const ir = ctx.createBuffer(2, len, sr);
  const rng = makePRNG(777);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const env = Math.pow(1 - i / len, decay);
      data[i] = (rng() * 2 - 1) * env;
    }
  }
  return ir;
}

export async function renderFullAudioBuffer() {
  const sampleRate = 44100;
  const length = Math.ceil(sampleRate * (TOTAL_DURATION + 0.5));
  const ctx = new OfflineAudioContext(2, length, sampleRate);

  const whiteNoise = createNoiseBuffer(ctx, 2.0, false);
  const pinkNoise = createNoiseBuffer(ctx, 3.0, true);

  const master = ctx.createGain();
  master.gain.value = 0.86;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10;
  comp.ratio.value = 4;
  comp.attack.value = 0.005;
  comp.release.value = 0.12;
  master.connect(comp);
  comp.connect(ctx.destination);

  const convolver = ctx.createConvolver();
  convolver.buffer = createReverbIR(ctx, 2.4, 2.7);
  const revGain = ctx.createGain();
  revGain.gain.value = 0.36;
  convolver.connect(revGain);
  revGain.connect(master);

  const rng = makePRNG(2026);

  const playTone = ({
    time,
    dur,
    freq,
    type = 'sine',
    gain = 0.12,
    attack = 0.01,
    release = 0.08,
    detune = 0,
    cutoff = 8000,
    pan = 0,
    reverb = 0,
  }) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    if (detune) osc.detune.setValueAtTime(detune, time);

    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(cutoff, time);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(gain, time + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(attack + 0.02, dur + release));

    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(pan, time);

    osc.connect(filt);
    filt.connect(env);
    env.connect(panner);
    panner.connect(master);

    if (reverb > 0) {
      const send = ctx.createGain();
      send.gain.value = reverb;
      panner.connect(send);
      send.connect(convolver);
    }

    osc.start(time);
    osc.stop(time + dur + release + 0.05);
  };

  const playKick = (time, punch = 0.42) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(148, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.11);
    env.gain.setValueAtTime(punch, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + 0.24);
    osc.connect(env);
    env.connect(master);
    osc.start(time);
    osc.stop(time + 0.26);
  };

  const playSnare = (time, level = 0.18, tight = true) => {
    const src = ctx.createBufferSource();
    src.buffer = whiteNoise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(tight ? 1850 : 1200, time);
    bp.Q.value = 0.9;
    const env = ctx.createGain();
    env.gain.setValueAtTime(level, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + (tight ? 0.12 : 0.19));
    src.connect(bp);
    bp.connect(env);
    env.connect(master);
    src.start(time);
    src.stop(time + 0.22);
  };

  const playHat = (time, level = 0.055, open = false) => {
    const src = ctx.createBufferSource();
    src.buffer = whiteNoise;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(7200, time);
    const env = ctx.createGain();
    env.gain.setValueAtTime(level, time);
    env.gain.exponentialRampToValueAtTime(0.0005, time + (open ? 0.16 : 0.04));
    src.connect(hp);
    hp.connect(env);
    env.connect(master);
    src.start(time);
    src.stop(time + 0.18);
  };

  const playBikeBell = (time) => {
    for (const offset of [0, 0.22]) {
      const t0 = time + offset;
      for (const [f, g] of [[2480, 0.14], [4990, 0.07], [7310, 0.03]]) {
        playTone({
          time: t0,
          dur: 0.02,
          release: 0.72,
          freq: f,
          type: 'sine',
          gain: g,
          attack: 0.002,
          pan: 0.15,
          reverb: 0.45,
        });
      }
    }
  };

  /* 1. INTRO (0 -> 4s) */
  for (let i = 0; i < 34; i++) {
    const tKey = 0.45 + (i / 34) * 1.9 + (rng() - 0.5) * 0.015;
    playHat(tKey, 0.045 + rng() * 0.025, false);
    playTone({ time: tKey, dur: 0.012, release: 0.015, freq: 920 + rng() * 240, type: 'triangle', gain: 0.025, attack: 0.001 });
  }
  {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, 2.3);
    osc.frequency.exponentialRampToValueAtTime(146.8, 3.98);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(180, 2.3);
    lp.frequency.exponentialRampToValueAtTime(1600, 3.98);
    env.gain.setValueAtTime(0.001, 2.3);
    env.gain.linearRampToValueAtTime(0.14, 3.95);
    env.gain.exponentialRampToValueAtTime(0.001, 4.15);
    osc.connect(lp);
    lp.connect(env);
    env.connect(master);
    osc.start(2.3);
    osc.stop(4.2);
  }

  /* 2. 1M (4 -> 14s) */
  {
    const src = ctx.createBufferSource();
    src.buffer = pinkNoise;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(950, 4.0);
    bp.frequency.linearRampToValueAtTime(1800, 14.0);
    bp.Q.value = 1.4;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, 4.0);
    env.gain.linearRampToValueAtTime(0.12, 4.5);
    env.gain.setValueAtTime(0.11, 13.4);
    env.gain.linearRampToValueAtTime(0.001, 14.0);
    src.connect(bp);
    bp.connect(env);
    env.connect(master);
    src.start(4.0);
    src.stop(14.1);

    for (let t0 = 4.1; t0 < 13.8; t0 += 0.16 + rng() * 0.28) {
      playTone({
        time: t0,
        dur: 0.04 + rng() * 0.12,
        release: 0.04,
        freq: 140 + rng() * 1450,
        type: rng() > 0.5 ? 'sine' : 'sawtooth',
        gain: 0.045 + rng() * 0.045,
        cutoff: 2200,
        pan: (rng() - 0.5) * 1.2,
      });
    }
  }

  /* 3. 100M (14 -> 24s) */
  for (let step = 0; step < 40; step++) {
    const tBase = 14.0 + step * (BEAT_SEC * 0.5);
    const jitterT = (rng() - 0.5) * 0.075;
    const note = MOTIF_MINOR[step % MOTIF_MINOR.length];
    if (note > 0) {
      playTone({
        time: Math.max(14.0, tBase + jitterT),
        dur: 0.16,
        release: 0.06,
        freq: midiToHz(note),
        detune: (rng() - 0.5) * 140,
        type: 'square',
        gain: 0.075,
        cutoff: 1400,
        pan: (rng() - 0.5) * 0.4,
      });
    }
    if (step % 4 === 0) playHat(Math.max(14.0, tBase + jitterT * 0.8), 0.04, false);
  }

  /* 4. 7B (24 -> 34s) */
  for (let step = 0; step < 40; step++) {
    const t0 = 24.0 + step * (BEAT_SEC * 0.5);
    const note = MOTIF_MINOR[step % MOTIF_MINOR.length];
    if (note > 0) {
      playTone({
        time: t0,
        dur: 0.18,
        release: 0.03,
        freq: midiToHz(note),
        type: 'triangle',
        gain: 0.11,
        cutoff: 2400,
      });
    }
    if (step % 2 === 0) {
      playTone({ time: t0, dur: 0.015, release: 0.015, freq: step % 8 === 0 ? 1200 : 840, type: 'sine', gain: 0.045, attack: 0.001 });
    }
  }

  /* 5. 32B (34 -> 44s) */
  for (let bar = 0; bar < 5; bar++) {
    const barT = 34.0 + bar * BAR_SEC;
    const chord = CHORDS_MINOR[bar % CHORDS_MINOR.length];
    const glitchBar = bar === 1 || bar === 3;
    for (let b = 0; b < 4; b++) {
      const bt = barT + b * BEAT_SEC;
      const slip = glitchBar && b >= 2 ? 0.11 : 0;
      if (b === 0 || b === 2) playKick(bt + slip, 0.34);
      if (b === 1 || b === 3) playSnare(bt - slip * 0.6, 0.14, false);
    }
    playTone({
      time: barT,
      dur: BAR_SEC * 0.85,
      release: 0.1,
      freq: midiToHz(glitchBar ? chord.root - 6 : chord.root - 12),
      type: 'sawtooth',
      gain: 0.12,
      cutoff: 420,
    });
    for (let s = 0; s < 8; s++) {
      const note = MOTIF_MINOR[(bar * 8 + s) % MOTIF_MINOR.length];
      if (note > 0) {
        playTone({
          time: barT + s * (BEAT_SEC * 0.5) + (glitchBar && s === 5 ? 0.09 : 0),
          dur: 0.17,
          release: 0.06,
          freq: midiToHz(glitchBar && s === 6 ? note - 1 : note),
          type: 'sawtooth',
          gain: 0.085,
          cutoff: 2200,
          reverb: 0.15,
        });
      }
    }
  }

  /* 6. 70B (44 -> 56s) */
  for (let bar = 0; bar < 6; bar++) {
    const barT = 44.0 + bar * BAR_SEC;
    const chord = CHORDS_MINOR[bar % CHORDS_MINOR.length];
    for (let b = 0; b < 4; b++) {
      const bt = barT + b * BEAT_SEC;
      if (b === 0 || b === 2) playKick(bt, 0.40);
      if (b === 1 || b === 3) playSnare(bt, 0.17, true);
      for (let sub = 0; sub < 4; sub++) {
        playHat(bt + sub * (BEAT_SEC * 0.25), sub === 2 ? 0.048 : 0.022, false);
      }
    }
    for (const n of chord.notes) {
      playTone({ time: barT, dur: BAR_SEC - 0.05, release: 0.25, freq: midiToHz(n), type: 'sawtooth', gain: 0.042, attack: 0.06, cutoff: 1650, reverb: 0.35 });
    }
    for (let e = 0; e < 8; e++) {
      playTone({ time: barT + e * (BEAT_SEC * 0.5), dur: 0.18, release: 0.05, freq: midiToHz(chord.root - 12 + (e % 2 === 1 ? 12 : 0)), type: 'sawtooth', gain: 0.11, cutoff: 580 });
    }
    for (let s = 0; s < 8; s++) {
      const note = MOTIF_MINOR[(bar * 8 + s) % MOTIF_MINOR.length];
      if (note > 0) {
        playTone({ time: barT + s * (BEAT_SEC * 0.5), dur: 0.2, release: 0.12, freq: midiToHz(note), type: 'triangle', gain: 0.11, cutoff: 4200, reverb: 0.32 });
      }
    }
  }

  /* 7. 1T · CoT (56 -> 64s) */
  for (let bar = 0; bar < 4; bar++) {
    const barT = 56.0 + bar * BAR_SEC;
    const chord = CHORDS_MINOR[bar % CHORDS_MINOR.length];
    for (const n of chord.notes) {
      playTone({ time: barT, dur: BAR_SEC, release: 0.65, freq: midiToHz(n), type: 'sawtooth', gain: 0.055, attack: 0.25, cutoff: 520 + bar * 180, reverb: 0.85 });
    }
    for (let b = 0; b < 4; b++) {
      const bt = barT + b * BEAT_SEC;
      playTone({ time: bt, dur: 0.025, release: 0.35, freq: b === 0 ? 1760 : 1174.66, type: 'sine', gain: b === 0 ? 0.075 : 0.042, attack: 0.002, pan: b % 2 === 0 ? -0.3 : 0.3, reverb: 0.72 });
    }
  }
  // Riser into 64.0s 1T 2D Drop
  {
    const src = ctx.createBufferSource();
    src.buffer = whiteNoise;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(300, 62.0);
    bp.frequency.exponentialRampToValueAtTime(5200, 63.98);
    bp.Q.value = 3.0;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, 62.0);
    env.gain.linearRampToValueAtTime(0.16, 63.95);
    env.gain.exponentialRampToValueAtTime(0.001, 64.15);
    src.connect(bp);
    bp.connect(env);
    env.connect(master);
    src.start(62.0);
    src.stop(64.2);
  }

  /* 8. 1T 2D FULL EMERGENCE (64 -> 74s): Energetic golden-hour groove + bike bell! */
  playBikeBell(64.5);
  for (let bar = 0; bar < 5; bar++) {
    const barT = 64.0 + bar * BAR_SEC;
    const chord = CHORDS_EMERGE[bar % CHORDS_EMERGE.length];
    for (let b = 0; b < 4; b++) {
      const bt = barT + b * BEAT_SEC;
      playKick(bt, 0.42);
      if (b === 1 || b === 3) playSnare(bt, 0.19, true);
      playHat(bt + BEAT_SEC * 0.5, 0.062, true);
      playHat(bt + BEAT_SEC * 0.25, 0.028, false);
      playHat(bt + BEAT_SEC * 0.75, 0.028, false);
    }
    for (const n of chord.notes) {
      playTone({ time: barT, dur: BAR_SEC - 0.04, release: 0.35, freq: midiToHz(n), detune: -7, type: 'sawtooth', gain: 0.036, attack: 0.04, cutoff: 3400, pan: -0.4, reverb: 0.42 });
      playTone({ time: barT, dur: BAR_SEC - 0.04, release: 0.35, freq: midiToHz(n), detune: +7, type: 'sawtooth', gain: 0.036, attack: 0.04, cutoff: 3400, pan: +0.4, reverb: 0.42 });
    }
    for (let e = 0; e < 8; e++) {
      playTone({ time: barT + e * (BEAT_SEC * 0.5), dur: 0.2, release: 0.06, freq: midiToHz(chord.root - 12), type: 'sine', gain: 0.20, cutoff: 220 });
      playTone({ time: barT + e * (BEAT_SEC * 0.5), dur: 0.18, release: 0.05, freq: midiToHz(chord.root - (e % 2 === 0 ? 12 : 0)), type: 'sawtooth', gain: 0.09, cutoff: 860 });
    }
    for (let s = 0; s < 8; s++) {
      const note = MOTIF_EMERGE[(bar * 8 + s) % MOTIF_EMERGE.length];
      if (note > 0) {
        playTone({ time: barT + s * (BEAT_SEC * 0.5), dur: 0.22, release: 0.16, freq: midiToHz(note), type: 'triangle', gain: 0.105, cutoff: 4800, reverb: 0.38 });
      }
    }
  }

  /* 9. 10T · 3D WORLD MODEL CLIMAX (74 -> 90s): Grand soaring stereo expansion + warm ocean shimmer! */
  // Luminous dimensional expansion swell right into 74.0s
  {
    const src = ctx.createBufferSource();
    src.buffer = pinkNoise;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(420, 72.5);
    bp.frequency.exponentialRampToValueAtTime(3600, 74.2);
    bp.frequency.exponentialRampToValueAtTime(900, 77.5);
    bp.Q.value = 1.6;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, 72.5);
    env.gain.linearRampToValueAtTime(0.18, 74.1);
    env.gain.exponentialRampToValueAtTime(0.001, 77.6);
    src.connect(bp);
    bp.connect(env);
    env.connect(master);
    src.start(72.5);
    src.stop(77.8);
  }
  playBikeBell(75.5);

  for (let bar = 0; bar < 8; bar++) {
    const barT = 74.0 + bar * BAR_SEC;
    const chord = CHORDS_EMERGE[bar % CHORDS_EMERGE.length];

    for (let b = 0; b < 4; b++) {
      const bt = barT + b * BEAT_SEC;
      playKick(bt, 0.45);
      if (b === 1 || b === 3) playSnare(bt, 0.22, true);
      playHat(bt + BEAT_SEC * 0.5, 0.072, true);
      playHat(bt + BEAT_SEC * 0.25, 0.032, false);
      playHat(bt + BEAT_SEC * 0.75, 0.032, false);
    }

    // Wide cinematic supersaw + octave string shimmer
    for (const n of chord.notes) {
      playTone({ time: barT, dur: BAR_SEC - 0.02, release: 0.5, freq: midiToHz(n), detune: -11, type: 'sawtooth', gain: 0.044, attack: 0.05, cutoff: 5200, pan: -0.55, reverb: 0.55 });
      playTone({ time: barT, dur: BAR_SEC - 0.02, release: 0.5, freq: midiToHz(n), detune: +11, type: 'sawtooth', gain: 0.044, attack: 0.05, cutoff: 5200, pan: +0.55, reverb: 0.55 });
    }
    // Soaring high string pedal tone
    playTone({ time: barT, dur: BAR_SEC, release: 0.6, freq: midiToHz(chord.notes[chord.notes.length - 1] + 12), type: 'triangle', gain: 0.048, attack: 0.2, cutoff: 4200, reverb: 0.72 });

    // Driving sub + rich synth bass
    for (let e = 0; e < 8; e++) {
      playTone({ time: barT + e * (BEAT_SEC * 0.5), dur: 0.2, release: 0.06, freq: midiToHz(chord.root - 12), type: 'sine', gain: 0.23, cutoff: 230 });
      playTone({ time: barT + e * (BEAT_SEC * 0.5), dur: 0.18, release: 0.05, freq: midiToHz(chord.root - (e % 2 === 0 ? 12 : 0)), type: 'sawtooth', gain: 0.095, cutoff: 980 });
    }

    // Sparkling 16th-note stereo arpeggio
    for (let step16 = 0; step16 < 16; step16++) {
      const arpNote = chord.notes[step16 % chord.notes.length] + 12;
      playTone({
        time: barT + step16 * (BEAT_SEC * 0.25),
        dur: 0.09,
        release: 0.16,
        freq: midiToHz(arpNote),
        type: 'triangle',
        gain: 0.055,
        cutoff: 7200,
        pan: Math.sin(step16 * 0.7) * 0.62,
        reverb: 0.5,
      });
    }

    // Heroic lifted motif (jumps up an octave on the final 4 bars!)
    const octLift = bar >= 4 ? 12 : 0;
    for (let s = 0; s < 8; s++) {
      const note = MOTIF_EMERGE[(bar * 8 + s) % MOTIF_EMERGE.length];
      if (note > 0) {
        playTone({
          time: barT + s * (BEAT_SEC * 0.5),
          dur: 0.24,
          release: 0.2,
          freq: midiToHz(note + octLift),
          type: 'sawtooth',
          gain: octLift ? 0.075 : 0.095,
          cutoff: 5800,
          reverb: 0.48,
        });
      }
    }
  }

  /* 10. OUTRO (90 -> 100s): Warm resolving Dmaj9 bloom */
  {
    const finalChord = [38, 50, 57, 62, 66, 69, 74, 78];
    for (let i = 0; i < finalChord.length; i++) {
      playTone({
        time: 90.0 + i * 0.055,
        dur: 6.4,
        release: 3.2,
        freq: midiToHz(finalChord[i]),
        type: i < 2 ? 'sine' : 'triangle',
        gain: i < 2 ? 0.12 : 0.054,
        attack: 0.25,
        cutoff: 2800,
        pan: (i / finalChord.length - 0.5) * 0.9,
        reverb: 0.78,
      });
    }
    for (let i = 0; i < 4; i++) {
      playTone({
        time: 92.0 + i * 0.5,
        dur: 0.15,
        release: 2.4,
        freq: midiToHz([69, 74, 78, 86][i]),
        type: 'sine',
        gain: 0.06,
        attack: 0.01,
        reverb: 0.82,
      });
    }
  }

  /* 11. CHECKPOINT GATE CHIMES */
  for (let i = 0; i < CHECKPOINT_GATES.length; i++) {
    const g = CHECKPOINT_GATES[i];
    const baseMidi = 62 + i * 2;
    playTone({ time: g.time, dur: 0.08, release: 0.45, freq: midiToHz(baseMidi), type: 'sine', gain: 0.09, attack: 0.005, reverb: 0.55 });
    playTone({ time: g.time + 0.04, dur: 0.06, release: 0.55, freq: midiToHz(baseMidi + 12), type: 'triangle', gain: 0.055, attack: 0.004, reverb: 0.65 });
  }

  return await ctx.startRendering();
}

export class AudioController {
  constructor() {
    this.ctx = null;
    this.buffer = null;
    this.source = null;
    this.gainNode = null;
    this.muted = false;
    this.isRendering = false;
  }

  async ensureReady() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = this.muted ? 0 : 1;
      this.gainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    if (!this.buffer && !this.isRendering) {
      this.isRendering = true;
      this.buffer = await renderFullAudioBuffer();
      this.isRendering = false;
    }
  }

  stop() {
    if (this.source) {
      try {
        this.source.stop();
        this.source.disconnect();
      } catch (_) {}
      this.source = null;
    }
  }

  async playFrom(offsetSec) {
    await this.ensureReady();
    if (!this.buffer) return;
    this.stop();
    const clamped = Math.max(0, Math.min(this.buffer.duration - 0.05, offsetSec));
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.connect(this.gainNode);
    src.start(0, clamped);
    this.source = src;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.02);
    }
  }
}
