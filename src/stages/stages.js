// src/stages/stages.js
// Renders the entire Scaling Law world:
// - Smooth atmospheric background evolution (obsidian void -> blueprint -> golden-hour sunrise)
// - Logarithmic coordinate grid & parallax mountain horizons (emerging at 70B / 1T)
// - Continuous differentiable Scaling Law Loss Curve road
// - In-world Checkpoint Milestone Gates
// - Clip-Split Dual-Pass Pelican Rig rendering across every gate boundary!

import {
  VIEW_W,
  VIEW_H,
  STAGES,
  CHECKPOINT_GATES,
  WORLD_TOTAL_X,
  clamp,
  lerp,
  smoothstep,
} from '../beat/timeline.js';
import { roadY, roadBaseY, roadSlope, worldToScreen, getStageForWorldX } from '../beat/curve.js';
import { computePelicanRig, getStageRigProfile, getSandboxRigProfile } from '../rig/pelican.js';
import { drawPelicanRig } from '../rig/renderer.js';
import { drawThinkingOverlay, drawEmergenceAtmosphere, drawGateCrossingFX, drawTireDust } from '../kit/fx.js';
import { makePRNG } from '../kit/prng.js';

function lerpHex(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, t));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t));
  const bl = Math.round(lerp(a & 255, b & 255, t));
  return `rgb(${r},${g},${bl})`;
}

// Per-stage sky top & bottom colors creating a dramatic "Void -> Lab -> Blueprint -> Golden Dawn" arc
const STAGE_SKY = [
  ['#07090e', '#111520'], // 1M: obsidian noise void
  ['#0c101a', '#171d2e'], // 100M: drafting slate
  ['#111827', '#1e293b'], // 7B: clean studio dark slate
  ['#0f172a', '#1e293b'], // 32B: engineering slate
  ['#0c1d36', '#1e3a5f'], // 70B: crisp twilight horizon
  ['#040e1f', '#0a2540'], // 1T CoT: electric CAD cobalt blueprint
  ['#1c2541', '#c86d3b'], // 1T 2D Emergence: golden-hour sunrise!
  ['#1c2541', '#c86d3b'], // 10T 3D World fallback / outro dissolve sky
];

/**
 * Renders the complete Scaling Law scene at worldX / time / camera.
 */
export function renderScalingWorld(ctx, {
  t,
  worldX,
  pedalPhase,
  speedScale,
  cam,
  sandbox = null,
  showPelican = true,
}) {
  const { stageIndex, localU } = getStageForWorldX(worldX);

  // Smooth sky palette blend across gate boundaries
  let skyTop = STAGE_SKY[stageIndex][0];
  let skyBot = STAGE_SKY[stageIndex][1];
  if (sandbox?.enabled) {
    const idx = sandbox.blueprint ? 5 : sandbox.logParams > 11.4 ? 6 : sandbox.logParams > 10.6 ? 4 : sandbox.logParams > 9.0 ? 2 : 0;
    skyTop = STAGE_SKY[idx][0];
    skyBot = STAGE_SKY[idx][1];
  } else if (stageIndex < STAGES.length - 1 && localU > 0.85) {
    const blend = smoothstep(0.85, 1.0, localU);
    skyTop = lerpHex(STAGE_SKY[stageIndex][0], STAGE_SKY[stageIndex + 1][0], blend);
    skyBot = lerpHex(STAGE_SKY[stageIndex][1], STAGE_SKY[stageIndex + 1][1], blend);
  }

  // 1. Sky gradient backdrop
  const skyGrad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  skyGrad.addColorStop(0, skyTop);
  skyGrad.addColorStop(1, skyBot);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Compute atmospheric regime mixes
  const blueprintAlpha = sandbox?.enabled
    ? (sandbox.blueprint ? 1 : 0)
    : smoothstep(9250, 9450, worldX) * (1 - smoothstep(9920, 10080, worldX));
  const emergenceAlpha = sandbox?.enabled
    ? (!sandbox.blueprint && sandbox.logParams >= 11.5 ? 1 : 0)
    : smoothstep(9950, 10200, worldX) * (1 - cam.outroMix * 0.7);
  const parallaxAlpha = sandbox?.enabled
    ? (!sandbox.blueprint && sandbox.logParams >= 10.65 ? 1 : 0)
    : smoothstep(7050, 7450, worldX) * (1 - blueprintAlpha * 0.85) * (1 - cam.outroMix * 0.8);

  // 2. Golden-hour glowing sun disc during 1T Emergence
  if (emergenceAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = emergenceAlpha;
    const sunX = VIEW_W * 0.74;
    const sunY = VIEW_H * 0.36;
    const sunHalo = ctx.createRadialGradient(sunX, sunY, 18, sunX, sunY, 440);
    sunHalo.addColorStop(0, 'rgba(255, 251, 235, 0.95)');
    sunHalo.addColorStop(0.18, 'rgba(253, 224, 71, 0.55)');
    sunHalo.addColorStop(0.55, 'rgba(245, 158, 11, 0.16)');
    sunHalo.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = sunHalo;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }

  // 3. Coordinate Engineering Grid (fades gently as organic mountains emerge, sharpens during Blueprint)
  const gridAlpha = clamp(
    0.26 - parallaxAlpha * 0.14 + blueprintAlpha * 0.25 + cam.outroMix * 0.12,
    0.08,
    0.45
  );
  drawCoordinateGrid(ctx, cam, gridAlpha, blueprintAlpha > 0.3 ? '#38bdf8' : '#94a3b8');

  // 4. Subtle background ambient noise specks in 1M
  const noiseFieldAlpha = sandbox?.enabled
    ? (sandbox.logParams < 7.2 ? 0.8 : 0)
    : 1 - smoothstep(1400, 2100, worldX);
  if (noiseFieldAlpha > 0.01 && cam.outroMix < 0.5) {
    drawAmbientNoiseField(ctx, t, noiseFieldAlpha * (1 - cam.outroMix));
  }

  // 5. Parallax Layered Mountains & Pine Silhouettes (70B & 1T Emergence)
  if (parallaxAlpha > 0.01) {
    drawParallaxLandscape(ctx, cam, worldX, parallaxAlpha, emergenceAlpha);
  }

  // 6. World-space Checkpoint Milestone Gates (vertical columns planted on the curve)
  drawCheckpointGates(ctx, cam, worldX, t, blueprintAlpha);

  // 7. Continuous Scaling Law Road Curve
  drawScalingCurveRoad(ctx, cam, worldX, emergenceAlpha, blueprintAlpha);

  // 8. 1T Reasoning <thought> overlay behind pelican
  if (blueprintAlpha > 0.01 && cam.outroMix < 0.3) {
    const localThinkT = sandbox?.enabled ? ((t * 0.18) % 1) : clamp((t - 56) / 8, 0, 1);
    drawThinkingOverlay(ctx, localThinkT, t, blueprintAlpha);
  }

  // 9. Hero Pelican + Bicycle Rig (with Clip-Split Phase Transition across Checkpoint Gates!)
  if (showPelican) {
    drawPelicanOnCurve(ctx, {
      t,
      worldX,
      pedalPhase,
      speedScale,
      cam,
      sandbox,
      emergenceAlpha,
      parallaxAlpha,
    });
  }

  // 10. Foreground Golden-Hour Wind Ribbons & Bokeh Motes
  if (emergenceAlpha > 0.01 && cam.outroMix < 0.6) {
    drawEmergenceAtmosphere(ctx, t, worldX, emergenceAlpha * (1 - cam.outroMix));
  }
}

function drawCoordinateGrid(ctx, cam, alpha, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1;

  // Choose adaptive world grid step so lines never crowd when zooming out in Outro
  const targetPx = 110;
  let step = 100;
  while (step * cam.zoom < targetPx * 0.6) step *= 2;
  while (step * cam.zoom > targetPx * 1.8) step /= 2;

  const minWX = cam.camX - (VIEW_W * 0.55) / cam.zoom;
  const maxWX = cam.camX + (VIEW_W * 0.55) / cam.zoom;
  const minWY = cam.camY - (VIEW_H * 0.55) / cam.zoom;
  const maxWY = cam.camY + (VIEW_H * 0.55) / cam.zoom;

  const startX = Math.floor(minWX / step) * step;
  const startY = Math.floor(minWY / step) * step;

  ctx.beginPath();
  for (let wx = startX; wx <= maxWX; wx += step) {
    const sx = (wx - cam.camX) * cam.zoom + VIEW_W * 0.5;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, VIEW_H);
  }
  for (let wy = startY; wy <= maxWY; wy += step) {
    const sy = (wy - cam.camY) * cam.zoom + VIEW_H * 0.5;
    ctx.moveTo(0, sy);
    ctx.lineTo(VIEW_W, sy);
  }
  ctx.stroke();

  // Horizontal Loss axis tick labels along the left margin (broadcast-readable 18px!)
  ctx.globalAlpha = Math.min(0.75, alpha * 1.9);
  ctx.fillStyle = color;
  ctx.font = '600 18px "JetBrains Mono", "PingFang SC", monospace';
  for (let wy = startY; wy <= maxWY; wy += step * 2) {
    const sy = (wy - cam.camY) * cam.zoom + VIEW_H * 0.5;
    if (sy > 240 && sy < VIEW_H - 235) {
      const approxLoss = Math.max(0.01, Math.pow(clamp((860 - wy) / 600, 0.02, 1.2), 2.1) * 9.8);
      ctx.fillText(`误差 ${approxLoss.toFixed(approxLoss < 0.2 ? 2 : 1)}`, 22, sy - 6);
    }
  }

  // Clear axis guide at top-left & bottom-left of grid
  if (cam.outroMix < 0.5) {
    ctx.globalAlpha = Math.min(0.62, alpha * 2.0) * (1 - cam.outroMix);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 18px "PingFang SC", sans-serif';
    ctx.fillText('↑ 误差越高（画得越离谱）', 22, 214);
    ctx.fillText('↓ 误差越低（越贴近真实）', 22, VIEW_H - 196);
  }
  ctx.restore();
}

function drawAmbientNoiseField(ctx, time, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha * 0.45;
  const step = Math.floor(time * 10);
  const rng = makePRNG(step * 4099 + 11);
  for (let i = 0; i < 90; i++) {
    const x = rng() * VIEW_W;
    const y = rng() * VIEW_H;
    const w = 2 + rng() * 14;
    const h = 1 + rng() * 3;
    ctx.fillStyle = i % 5 === 0 ? '#ff4d6d' : i % 3 === 0 ? '#38bdf8' : '#64748b';
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

function drawParallaxLandscape(ctx, cam, worldX, alpha, emergenceAlpha) {
  ctx.save();
  ctx.globalAlpha = alpha;

  const layers = [
    {
      factor: 0.12,
      baseY: VIEW_H * 0.72,
      amp: 135,
      freq: 0.0021,
      seed: 101,
      color70: '#132a47',
      color1T: '#4a304d',
    },
    {
      factor: 0.28,
      baseY: VIEW_H * 0.79,
      amp: 92,
      freq: 0.0036,
      seed: 202,
      color70: '#0f223a',
      color1T: '#35223d',
    },
  ];

  for (const layer of layers) {
    ctx.fillStyle = lerpHex(layer.color70, layer.color1T, emergenceAlpha);
    ctx.beginPath();
    ctx.moveTo(0, VIEW_H);
    for (let sx = 0; sx <= VIEW_W + 40; sx += 32) {
      const px = sx + worldX * layer.factor;
      const h =
        Math.sin(px * layer.freq) * layer.amp * 0.55 +
        Math.sin(px * layer.freq * 2.3 + layer.seed) * layer.amp * 0.28 +
        Math.cos(px * layer.freq * 0.6 + 1.4) * layer.amp * 0.25;
      ctx.lineTo(sx, layer.baseY - Math.abs(h));
    }
    ctx.lineTo(VIEW_W, VIEW_H);
    ctx.closePath();
    ctx.fill();
  }

  // Passing stylized pine silhouettes along the mid-ground ridge
  const treeSpacing = 140;
  const scrollOffset = worldX * 0.42;
  const firstIdx = Math.floor(scrollOffset / treeSpacing) - 1;
  ctx.fillStyle = lerpHex('#0b192c', '#26182c', emergenceAlpha);
  for (let i = firstIdx; i < firstIdx + 18; i++) {
    const rng = makePRNG(i * 977 + 33);
    const sx = i * treeSpacing - scrollOffset + (rng() - 0.5) * 45;
    const treeH = 38 + rng() * 52;
    const baseY = VIEW_H * 0.85 + Math.sin(i * 0.9) * 18;
    ctx.beginPath();
    ctx.moveTo(sx, baseY - treeH);
    ctx.lineTo(sx - treeH * 0.28, baseY);
    ctx.lineTo(sx + treeH * 0.28, baseY);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawCheckpointGates(ctx, cam, worldX, time, blueprintAlpha = 0) {
  ctx.save();
  const pillVisibility = (1 - cam.outroMix) * (1 - blueprintAlpha * 0.92);
  for (const gate of CHECKPOINT_GATES) {
    const gy = roadBaseY(gate.worldX);
    const pt = worldToScreen(gate.worldX, gy, cam);
    if (pt.x < -120 || pt.x > VIEW_W + 120) continue;

    const passed = worldX >= gate.worldX;
    const dist = Math.abs(worldX - gate.worldX);
    const glow = clamp(1 - dist / 260, 0, 1);

    // Subtle vertical milestone hairline
    ctx.strokeStyle = gate.accent;
    ctx.globalAlpha = (passed ? 0.22 + glow * 0.45 : 0.32 + glow * 0.4) * (1 - blueprintAlpha * 0.65);
    ctx.lineWidth = 1.5 + glow * 1.5;
    ctx.setLineDash(passed ? [] : [8, 6]);
    ctx.beginPath();
    ctx.moveTo(pt.x, 95);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Borderless architectural milestone marker (broadcast-readable 24px / 20px!)
    if (pillVisibility > 0.08) {
      ctx.globalAlpha = pillVisibility * (0.76 + glow * 0.24);
      const labelY = Math.max(230, pt.y - 315 * cam.zoom);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = gate.accent;
      ctx.font = '700 24px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillText(gate.label, pt.x + 14, labelY);

      ctx.fillStyle = 'rgba(241, 245, 249, 0.92)';
      ctx.font = '600 20px "PingFang SC", sans-serif';
      ctx.fillText(gate.zh, pt.x + 14, labelY + 28);

      ctx.strokeStyle = gate.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pt.x, labelY - 7);
      ctx.lineTo(pt.x + 10, labelY - 7);
      ctx.stroke();
    }

    // Glowing node dot anchored on the Scaling Law curve itself
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#0b0e14';
    ctx.strokeStyle = gate.accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 5.5 + glow * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawScalingCurveRoad(ctx, cam, worldX, emergenceAlpha, blueprintAlpha) {
  ctx.save();
  const minWX = Math.max(-400, cam.camX - (VIEW_W * 0.6) / cam.zoom);
  const maxWX = Math.min(WORLD_TOTAL_X + 600, cam.camX + (VIEW_W * 0.6) / cam.zoom);
  const stepWX = Math.max(8, 12 / cam.zoom);

  // Build road polyline in screen coordinates
  const pts = [];
  for (let wx = minWX; wx <= maxWX; wx += stepWX) {
    const wy = roadY(wx);
    pts.push({ wx, ...worldToScreen(wx, wy, cam) });
  }
  if (pts.length < 2) {
    ctx.restore();
    return;
  }

  // 1. Area fill under the Scaling Law curve (like a high-craft WandB / scientific chart)
  const areaGrad = ctx.createLinearGradient(0, VIEW_H * 0.25, 0, VIEW_H);
  if (emergenceAlpha > 0.3) {
    areaGrad.addColorStop(0, 'rgba(245, 158, 11, 0.26)');
    areaGrad.addColorStop(0.5, 'rgba(30, 27, 46, 0.72)');
    areaGrad.addColorStop(1, 'rgba(12, 10, 20, 0.96)');
  } else if (blueprintAlpha > 0.3) {
    areaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
    areaGrad.addColorStop(1, 'rgba(4, 14, 31, 0.95)');
  } else {
    areaGrad.addColorStop(0, 'rgba(46, 196, 182, 0.16)');
    areaGrad.addColorStop(0.55, 'rgba(15, 23, 42, 0.78)');
    areaGrad.addColorStop(1, 'rgba(7, 10, 18, 0.98)');
  }

  ctx.fillStyle = areaGrad;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, VIEW_H + 20);
  for (const p of pts) ctx.lineTo(p.x, p.y);
  ctx.lineTo(pts[pts.length - 1].x, VIEW_H + 20);
  ctx.closePath();
  ctx.fill();

  // 2. Subtle reference ideal smooth power-law dashed asymptote underneath noisy 1M/100M section
  if (minWX < 3400) {
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    let started = false;
    for (let wx = Math.max(0, minWX); wx <= Math.min(3600, maxWX); wx += stepWX) {
      const p = worldToScreen(wx, roadBaseY(wx), cam);
      if (!started) {
        ctx.moveTo(p.x, p.y);
        started = true;
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // 3. Silky-smooth continuous road curve batched by (stage accent + behind/ahead state)
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let runStart = 0;
  const flushRun = (startIdx, endIdx, accent, isBehind) => {
    if (endIdx <= startIdx) return;
    ctx.beginPath();
    ctx.moveTo(pts[startIdx].x, pts[startIdx].y);
    for (let k = startIdx + 1; k <= endIdx; k++) {
      ctx.lineTo(pts[k].x, pts[k].y);
    }
    // Outer soft luminous glow
    ctx.strokeStyle = accent;
    ctx.globalAlpha = isBehind ? 0.32 : 0.14;
    ctx.lineWidth = isBehind ? 11 : 6;
    ctx.stroke();
    // Crisp continuous core line
    ctx.globalAlpha = isBehind ? 0.96 : 0.45;
    ctx.lineWidth = isBehind ? 3.5 : 2.2;
    ctx.stroke();
  };

  let curAccent = getStageForWorldX(pts[0].wx).stage.accent;
  let curBehind = pts[0].wx <= worldX;
  for (let i = 1; i < pts.length; i++) {
    const nextAccent = getStageForWorldX(pts[i].wx).stage.accent;
    const nextBehind = pts[i].wx <= worldX;
    if (nextAccent !== curAccent || nextBehind !== curBehind) {
      flushRun(runStart, i, curAccent, curBehind);
      runStart = i;
      curAccent = nextAccent;
      curBehind = nextBehind;
    }
  }
  flushRun(runStart, pts.length - 1, curAccent, curBehind);

  ctx.restore();
}

function drawPelicanOnCurve(ctx, {
  t,
  worldX,
  pedalPhase,
  speedScale,
  cam,
  sandbox,
  emergenceAlpha,
  parallaxAlpha,
}) {
  const wy = roadBaseY(worldX);
  const slope = roadSlope(worldX);
  const screenPos = worldToScreen(worldX, wy, cam);

  // Draw subtle tire dust behind rear wheel when riding cleanly at 70B / 1T
  if (parallaxAlpha > 0.25 && cam.outroMix < 0.2 && !sandbox?.lockWheels) {
    const rearScreen = worldToScreen(worldX - 86 * Math.cos(slope), wy - 86 * Math.sin(slope), cam);
    drawTireDust(
      ctx,
      rearScreen.x,
      rearScreen.y,
      t,
      parallaxAlpha * clamp(speedScale, 0.3, 1.2),
      emergenceAlpha > 0.3 ? 'rgba(253, 224, 71, 0.36)' : 'rgba(203, 213, 225, 0.28)'
    );
  }

  // Helper to render a single profile at the pelican's exact screen transform
  const renderWithProfile = (profile) => {
    const rig = computePelicanRig({
      worldX,
      pedalPhase,
      speedScale,
      time: t,
      profile,
    });
    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.rotate(slope);
    drawPelicanRig(ctx, rig, t, worldX);
    ctx.restore();
  };

  if (sandbox?.enabled) {
    renderWithProfile(getSandboxRigProfile(sandbox));
    return;
  }

  // Check if pelican is currently straddling a Checkpoint Gate -> CLIP-SPLIT PHASE TRANSITION!
  let activeGate = null;
  for (const gate of CHECKPOINT_GATES) {
    if (Math.abs(worldX - gate.worldX) < 190) {
      activeGate = gate;
      break;
    }
  }

  if (activeGate && cam.outroMix < 0.25) {
    const gateScreen = worldToScreen(activeGate.worldX, roadBaseY(activeGate.worldX), cam);
    const gx = gateScreen.x;
    const proximity = clamp(1 - Math.abs(worldX - activeGate.worldX) / 185, 0, 1);

    // Left of scanline = outgoing stage model
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, gx, VIEW_H);
    ctx.clip();
    renderWithProfile(getStageRigProfile(activeGate.fromStage.id));
    ctx.restore();

    // Right of scanline = incoming upgraded stage model!
    ctx.save();
    ctx.beginPath();
    ctx.rect(gx, 0, VIEW_W - gx, VIEW_H);
    ctx.clip();
    renderWithProfile(getStageRigProfile(activeGate.toStage.id));
    ctx.restore();

    // Laser scanline + phase-transition sparks right on the seam!
    drawGateCrossingFX(ctx, gx, screenPos.y, activeGate.accent, proximity, t);
  } else {
    const { stage } = getStageForWorldX(worldX);
    renderWithProfile(getStageRigProfile(stage.id));
  }
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
