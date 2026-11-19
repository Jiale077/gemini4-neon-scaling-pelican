// src/beat/curve.js
// Continuous differentiable Scaling Law road curve y = roadY(worldX) + smooth C2 camera.

import {
  VIEW_W,
  VIEW_H,
  INTRO_SEC,
  RIDE_END_SEC,
  WORLD_TOTAL_X,
  STAGES,
  clamp,
  lerp,
  smoothstep,
  smootherstep,
  getWorldProgress,
} from './timeline.js';
import { fbm1D } from '../kit/prng.js';

export function roadBaseY(worldX) {
  const u = clamp(worldX / WORLD_TOTAL_X, -0.05, 1.08);
  const uPos = Math.max(0, u);
  const powerLaw = Math.pow(1 + 5.8 * uPos, -1.14);
  const baseY = lerp(845, 250, powerLaw);

  const hillMask = smoothstep(6800, 7800, worldX);
  const hills =
    hillMask * (18 * Math.sin(worldX * 0.0042) + 8 * Math.sin(worldX * 0.0115 + 1.1));

  // Gentle undulations during 1T 2D Emergence (10000 -> 12200) to showcase fork suspension
  const bumpMask = smoothstep(10200, 10500, worldX) * (1 - smoothstep(11900, 12200, worldX));
  const microBumps = bumpMask * 6.5 * Math.sin(worldX * 0.028);

  return baseY + hills + microBumps;
}

export function roadY(worldX) {
  const base = roadBaseY(worldX);
  const noiseEnv = 1 - smoothstep(1200, 3200, worldX);
  const jitter = noiseEnv * 22 * fbm1D(worldX * 0.014, 3, 901);
  return base + jitter;
}

export function roadSlope(worldX, wheelbase = 140) {
  const half = wheelbase * 0.5;
  const yRear = roadBaseY(worldX - half);
  const yFront = roadBaseY(worldX + half);
  return Math.atan2(yFront - yRear, wheelbase);
}

export function getWheelSuspension(worldX) {
  const yRear = roadY(worldX - 72);
  const yFront = roadY(worldX + 72);
  const yMid = 0.5 * (yRear + yFront);
  const yCenter = roadY(worldX);
  const bump = clamp((yMid - yCenter) * 0.9, -12, 12);
  return {
    frontCompress: clamp(-bump * 0.65 + Math.sin(worldX * 0.028) * 3.2, -5, 11),
    rearCompress: clamp(-bump * 0.45 + Math.sin((worldX - 144) * 0.028) * 2.1, -4, 8),
  };
}

export function getCameraState(t, sandboxState = null) {
  if (sandboxState?.enabled) {
    const wx = sandboxState.worldX;
    const wy = roadBaseY(wx);
    return {
      camX: wx + 100,
      camY: wy - 135,
      zoom: sandboxState.blueprint ? 1.28 : 1.12,
      outroMix: 0,
    };
  }

  const { worldX } = getWorldProgress(t);
  const wy = roadBaseY(worldX);

  const leadX = lerp(190, 80, smoothstep(55.5, 57.5, t) * (1 - smoothstep(63.2, 65.0, t)));
  let camX = worldX + leadX;
  let camY = wy - 145;
  let zoom = 1.08;

  if (t < INTRO_SEC) {
    const u = smootherstep(0, INTRO_SEC, t);
    zoom = lerp(0.92, 1.08, u);
    camX = lerp(280, worldX + leadX, u);
    camY = lerp(roadBaseY(280) - 165, wy - 145, u);
  }

  // 1T Reasoning zoom-in to inspect CAD vectors
  const thinkIn = smootherstep(55.6, 57.4, t);
  const thinkOut = smootherstep(63.4, 65.2, t);
  const thinkFocus = thinkIn * (1 - thinkOut);
  zoom = lerp(zoom, 1.36, thinkFocus);
  camY = lerp(camY, wy - 125, thinkFocus);

  // 1T 2D Full Emergence heroic framing (64s -> 74s)
  const emergeZoom = smootherstep(64.0, 66.2, t) * (1 - smootherstep(73.8, 75.0, t));
  zoom = lerp(zoom, 1.16, emergeZoom);

  // Outro grand pull-back (90s -> 100s) to fit entire 1M -> 3D curve
  let outroMix = 0;
  if (t >= RIDE_END_SEC) {
    outroMix = smootherstep(RIDE_END_SEC, RIDE_END_SEC + 3.2, t);
    const fullCenterX = WORLD_TOTAL_X * 0.5;
    const fullCenterY = 555;
    const fullZoom = (VIEW_W * 0.84) / WORLD_TOTAL_X;
    camX = lerp(camX, fullCenterX, outroMix);
    camY = lerp(camY, fullCenterY, outroMix);
    zoom = lerp(zoom, fullZoom, outroMix);
  }

  return { camX, camY, zoom, outroMix };
}

export function worldToScreen(wx, wy, cam) {
  return {
    x: (wx - cam.camX) * cam.zoom + VIEW_W * 0.5,
    y: (wy - cam.camY) * cam.zoom + VIEW_H * 0.5,
  };
}

export function getStageForWorldX(worldX) {
  for (let i = 0; i < STAGES.length; i++) {
    const s = STAGES[i];
    if (worldX < s.worldEnd || i === STAGES.length - 1) {
      const u = clamp((worldX - s.worldStart) / (s.worldEnd - s.worldStart), 0, 1);
      return { stage: s, stageIndex: i, localU: u };
    }
  }
  const last = STAGES[STAGES.length - 1];
  return { stage: last, stageIndex: STAGES.length - 1, localU: 1 };
}
