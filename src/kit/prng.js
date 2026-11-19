// src/kit/prng.js
// Deterministic Mulberry32 PRNG & FNV-1a string hash for pure-function renderAt(t).

export function hashSeed(strOrNum) {
  const str = String(strOrNum);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}

export function makePRNG(seed = 42) {
  let s = (Number(seed) ^ 0x9e3779b9) >>> 0;
  if (s === 0) s = 1;
  return function rand() {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) * 2.3283064365386963e-10;
  };
}

export function noise1D(x, seed = 1337) {
  const xi = Math.floor(x);
  const xf = x - xi;
  const u = xf * xf * (3 - 2 * xf);
  const h0 = ((Math.imul(xi ^ seed, 374761393) >>> 0) % 10000) / 10000;
  const h1 = ((Math.imul((xi + 1) ^ seed, 374761393) >>> 0) % 10000) / 10000;
  return (h0 + (h1 - h0) * u) * 2 - 1;
}

export function fbm1D(x, octaves = 3, seed = 1337) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise1D(x * freq, seed + i * 97);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}
