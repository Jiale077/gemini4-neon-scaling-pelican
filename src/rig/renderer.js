// src/rig/renderer.js
// Multi-fidelity pure Canvas 2D renderer for the Pelican + Bicycle Rig.
// Shares exact world coordinates across all 7 regimes so Clip-Split Phase Transitions
// morph front-to-back pixel-accurately as the pelican crosses each Checkpoint Gate.

import { computeChainTangents } from './ik.js';
import { makePRNG } from '../kit/prng.js';

/**
 * Main entry: draws the rig in local bicycle coordinates (caller handles translate/rotate to road curve).
 */
export function drawPelicanRig(ctx, rig, time, worldX) {
  const mode = rig.profile.mode;
  switch (mode) {
    case 'noise_1m':
      return draw1MNoise(ctx, rig, time);
    case 'abstract_100m':
      return draw100MAbstract(ctx, rig, time);
    case 'sticker_7b':
      return draw7BSticker(ctx, rig, time);
    case 'broken_32b':
      return draw32BBroken(ctx, rig, time);
    case 'consistent_70b':
      return draw70BConsistent(ctx, rig, time, false);
    case 'blueprint_1t':
      return draw1TBlueprint(ctx, rig, time);
    case 'emergence_1t':
    default:
      return draw70BConsistent(ctx, rig, time, true, worldX);
  }
}

/* ============================================================================
 * STAGE 01: 1M — RANDOM INITIALIZATION (Loss 9.8)
 * Exploded Bézier curves, jittering control handles, NaN boxes, chaos vectors.
 * ============================================================================ */
function draw1MNoise(ctx, rig, time) {
  // Quantized 12fps glitch step so the noise looks authentically crunchy & readable
  const step = Math.floor(time * 12);
  const rng = makePRNG(step * 7919 + 42);

  ctx.save();

  // Flickering dashed NaN bounding box
  ctx.strokeStyle = 'rgba(255, 77, 109, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  const bx = -135 + (rng() - 0.5) * 32;
  const by = -245 + (rng() - 0.5) * 32;
  ctx.strokeRect(bx, by, 270 + (rng() - 0.5) * 40, 240 + (rng() - 0.5) * 40);
  ctx.setLineDash([]);

  // Label tag (broadcast readable 20px!)
  ctx.fillStyle = '#ff6b81';
  ctx.font = '700 20px "PingFang SC", "JetBrains Mono", monospace';
  ctx.fillText(`坐标失控 [NaN] · 权重未收敛`, bx, by - 14);

  // Exploded Bézier curves + exposed control handles
  const colors = ['#ff4d6d', '#38bdf8', '#f59e0b', '#e2e8f0', '#a855f7'];
  for (let i = 0; i < 11; i++) {
    const x0 = (rng() - 0.5) * 260;
    const y0 = -30 - rng() * 210;
    const cx1 = x0 + (rng() - 0.5) * 190;
    const cy1 = y0 + (rng() - 0.5) * 160;
    const cx2 = (rng() - 0.5) * 240;
    const cy2 = -20 - rng() * 220;
    const x1 = (rng() - 0.5) * 260;
    const y1 = -20 - rng() * 210;

    // Control handle tangent lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(cx1, cy1);
    ctx.moveTo(x1, y1);
    ctx.lineTo(cx2, cy2);
    ctx.stroke();

    // Main broken Bézier stroke
    ctx.strokeStyle = colors[i % colors.length];
    ctx.lineWidth = 1.5 + rng() * 2.5;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x1, y1);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Control points (hollow circles & anchor squares)
    ctx.fillStyle = '#0b0e14';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    for (const [hx, hy] of [[cx1, cy1], [cx2, cy2]]) {
      ctx.beginPath();
      ctx.arc(hx, hy, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#ff4d6d';
    ctx.fillRect(x0 - 2.5, y0 - 2.5, 5, 5);
  }

  // Random stray primitive blobs / pixel noise dust
  for (let i = 0; i < 24; i++) {
    const px = (rng() - 0.5) * 320;
    const py = -10 - rng() * 240;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,77,109,0.55)' : 'rgba(226,232,240,0.35)';
    const sz = 2 + rng() * 6;
    ctx.fillRect(px, py, sz, sz);
  }

  // Faint broken wheel hints that fail to close
  for (const wx of [-84, 82]) {
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wx + (rng() - 0.5) * 30, -48 + (rng() - 0.5) * 28, 30 + rng() * 25, rng() * 3, rng() * 3 + 2.1);
    ctx.stroke();
  }

  ctx.restore();
}

/* ============================================================================
 * STAGE 02: 100M — ABSTRACT SVG HALLUCINATION (Loss 4.1)
 * Two mismatched oval wheels, broken stick frame, and an orange geometric
 * triangle "pelican" hovering 100px above the saddle!
 * ============================================================================ */
function draw100MAbstract(ctx, rig, time) {
  ctx.save();
  const wobble = Math.sin(time * 5.4) * 3.5;
  const hoverY = -100 + Math.sin(time * 3.8) * 6; // Classic +100px floating pelican bug!

  // 1. Mismatched oval wheels (different sizes & tilts, barely rotating)
  // Rear oval wheel (squashed vertical)
  ctx.save();
  ctx.translate(-88, -50);
  ctx.rotate(0.18 + Math.sin(time * 3) * 0.08);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 38, 52, 0, 0, Math.PI * 2);
  ctx.stroke();
  // 3 clumsy misaligned spokes
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-36, 0); ctx.lineTo(36, 0);
  ctx.moveTo(0, -50); ctx.lineTo(0, 50);
  ctx.stroke();
  ctx.restore();

  // Front oval wheel (squashed horizontal & displaced)
  ctx.save();
  ctx.translate(92, -39);
  ctx.rotate(-0.24);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 54, 34, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#4ea8de';
  ctx.beginPath();
  ctx.arc(8, -4, 6, 0, Math.PI * 2); // Off-center hub!
  ctx.fill();
  ctx.restore();

  // 2. Broken stick-line frame (disconnected joints)
  ctx.strokeStyle = '#4ea8de';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-88, -50);
  ctx.lineTo(-22, -108);
  ctx.lineTo(68, -94); // Doesn't connect cleanly to front wheel!
  ctx.moveTo(-4, -52);
  ctx.lineTo(-34, -124);
  ctx.moveTo(58, -118);
  ctx.lineTo(84, -44);
  ctx.stroke();

  // Naive black rectangle "saddle"
  ctx.fillStyle = '#334155';
  ctx.fillRect(-52, -130, 34, 9);

  // Red dashed offset caliper measuring the 100px floating gap!
  ctx.save();
  ctx.strokeStyle = '#ff4d6d';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(-35, -130);
  ctx.lineTo(-35, -130 + hoverY);
  ctx.stroke();
  ctx.setLineDash([]);
  // Arrow ticks
  ctx.beginPath();
  ctx.moveTo(-41, -130); ctx.lineTo(-29, -130);
  ctx.moveTo(-41, -130 + hoverY); ctx.lineTo(-29, -130 + hoverY);
  ctx.stroke();
  ctx.fillStyle = '#ff6b81';
  ctx.font = '700 20px "PingFang SC", "JetBrains Mono", monospace';
  ctx.fillText('空间错位：鹈鹕悬空 +100px', -20, -130 + hoverY * 0.5 + 6);
  ctx.restore();

  // 3. The iconic floating orange-triangle "Pelican" 100px above the saddle!
  ctx.save();
  ctx.translate(-35 + wobble, -135 + hoverY);
  ctx.rotate(Math.sin(time * 2.6) * 0.09);

  // Main crude orange triangle body
  ctx.fillStyle = '#ff7b29';
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-42, 22);
  ctx.lineTo(14, -48);
  ctx.lineTo(48, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Detached yellow trapezoid "beak" pointing slightly wrong
  ctx.fillStyle = '#ffb703';
  ctx.beginPath();
  ctx.moveTo(28, -32);
  ctx.lineTo(94, -16);
  ctx.lineTo(76, 4);
  ctx.lineTo(30, -8);
  ctx.closePath();
  ctx.fill();

  // Tiny naive googly eye
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(14, -26, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(16, -26, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Two useless tiny vertical stick legs dangling in mid-air
  ctx.strokeStyle = '#fb923c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8, 22); ctx.lineTo(-10, 48);
  ctx.moveTo(12, 20); ctx.lineTo(14, 46);
  ctx.stroke();
  ctx.restore();

  // Floating raw SVG code fragment callout + wheel caption (19px broadcast readable!)
  ctx.fillStyle = 'rgba(203, 213, 225, 0.85)';
  ctx.font = '600 18px "JetBrains Mono", "PingFang SC", monospace';
  ctx.fillText('<polygon id="鹈鹕" points="三角形" fill="orange"/>', -155, -304);
  ctx.fillStyle = 'rgba(253, 186, 116, 0.92)';
  ctx.font = '600 19px "PingFang SC", sans-serif';
  ctx.fillText('↑ 车轮画扁且错位', 24, 24);

  ctx.restore();
}

/* ============================================================================
 * STAGE 03: 7B — STATIC CLIP-ART STICKER (Loss 1.56)
 * Looks clearly like a pelican on a bicycle! Clean flat colors, BUT wheels
 * do not spin, legs are stiffly frozen off the pedals, and it slides along
 * the curve inside an SVG bounding box like a static PNG sticker.
 * ============================================================================ */
function draw7BSticker(ctx, rig, time) {
  ctx.save();

  // Subtle dashed SVG selection frame + 8 corner/edge resize handles
  ctx.save();
  const bx = -142;
  const by = -286;
  const bw = 296;
  const bh = 286;
  ctx.strokeStyle = 'rgba(78, 168, 222, 0.65)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([7, 5]);
  ctx.strokeRect(bx, by, bw, bh);
  ctx.setLineDash([]);

  // Resize handles
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#4ea8de';
  ctx.lineWidth = 1.5;
  const handles = [
    [bx, by], [bx + bw / 2, by], [bx + bw, by],
    [bx, by + bh / 2], [bx + bw, by + bh / 2],
    [bx, by + bh], [bx + bw / 2, by + bh], [bx + bw, by + bh],
  ];
  for (const [hx, hy] of handles) {
    ctx.fillRect(hx - 4, hy - 4, 8, 8);
    ctx.strokeRect(hx - 4, hy - 4, 8, 8);
  }
  ctx.fillStyle = '#7dd3fc';
  ctx.font = '700 20px "PingFang SC", "JetBrains Mono", sans-serif';
  ctx.fillText('静态矢量贴纸 · 车轮完全不转', bx + 4, by - 14);
  ctx.restore();

  // Draw clean flat-vector bike (FROZEN wheel angle = 0)
  drawFlatWheel(ctx, rig.rearWheel.x, rig.rearWheel.y, rig.wheelR, 0, '#94a3b8', '#475569');
  drawFlatWheel(ctx, rig.frontWheel.x, rig.frontWheel.y, rig.wheelR, 0, '#94a3b8', '#475569');

  // Simple flat diamond frame
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(rig.rearWheel.x, rig.rearWheel.y);
  ctx.lineTo(rig.bb.x, rig.bb.y);
  ctx.lineTo(rig.headBot.x, rig.headBot.y);
  ctx.lineTo(rig.headTop.x, rig.headTop.y);
  ctx.lineTo(rig.seatCluster.x, rig.seatCluster.y);
  ctx.lineTo(rig.rearWheel.x, rig.rearWheel.y);
  ctx.moveTo(rig.bb.x, rig.bb.y);
  ctx.lineTo(rig.saddle.x, rig.saddle.y);
  ctx.moveTo(rig.frontWheel.x, rig.frontWheel.y);
  ctx.lineTo(rig.headBot.x, rig.headBot.y);
  ctx.lineTo(rig.stemTop.x, rig.stemTop.y);
  ctx.lineTo(rig.handlebar.x, rig.handlebar.y);
  ctx.stroke();

  // Frozen crank & empty pedals (not touched by feet!)
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(rig.bb.x, rig.bb.y);
  ctx.lineTo(rig.bb.x + 22, rig.bb.y + 4);
  ctx.stroke();
  ctx.fillStyle = '#64748b';
  ctx.fillRect(rig.bb.x + 15, rig.bb.y + 2, 14, 5);

  // Saddle
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.ellipse(rig.saddle.x, rig.saddle.y, 17, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stiff frozen flat-vector pelican (hovering feet not touching pedals)
  drawFlatPelicanBody(ctx, rig, '#f1f5f9', '#e2e8f0', '#fb923c', '#f59e0b');

  // Stiff straight legs ending awkwardly in mid-air
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(rig.hip.x, rig.hip.y + 8);
  ctx.lineTo(rig.bb.x - 14, rig.bb.y - 24);
  ctx.moveTo(rig.hip.x + 8, rig.hip.y + 8);
  ctx.lineTo(rig.bb.x + 4, rig.bb.y - 26);
  ctx.stroke();

  // Small warning callout pointing at frozen wheel & gap
  ctx.fillStyle = 'rgba(224, 242, 254, 0.92)';
  ctx.font = '600 19px "PingFang SC", sans-serif';
  ctx.fillText('⚠ 轮子锁死 · 整车平移硬滑', rig.frontWheel.x - 135, 28);

  ctx.restore();
}

/* ============================================================================
 * STAGE 04: 32B — BROKEN KINEMATICS (Loss 0.87)
 * Wheels and legs ARE moving, BUT classic LLM math bugs strike:
 * - Knees bend BACKWARDS (bendSign = +1)
 * - Crank / rear-wheel gear mismatch (0.53x)
 * - Chain sags detached from sprocket
 * - Red engineering diagnostic overlays pulse on broken joints!
 * ============================================================================ */
function draw32BBroken(ctx, rig, time) {
  ctx.save();

  // Ground shadow (slightly misaligned)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(4, 2, 118, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Far leg (backwards knee!)
  drawLeg(ctx, rig.farLeg, '#c2410c', '#ea580c', 6.5);

  // Wheels spinning
  drawDetailedWheel(ctx, rig.rearWheel, '#64748b', '#cbd5e1', '#1e293b', false);
  drawDetailedWheel(ctx, rig.frontWheel, '#64748b', '#cbd5e1', '#1e293b', false);

  // Drooping / detached chain bug!
  ctx.save();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(rig.rearWheel.x, rig.rearWheel.y - 10);
  ctx.quadraticCurveTo(-48, -32 + Math.sin(time * 9) * 8, rig.bb.x, rig.bb.y - 14);
  ctx.moveTo(rig.rearWheel.x, rig.rearWheel.y + 10);
  ctx.quadraticCurveTo(-48, -14 + Math.cos(time * 8) * 10, rig.bb.x, rig.bb.y + 16);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Frame
  drawBikeFrame(ctx, rig, '#eab308', '#ca8a04', false);

  // Crank & pedals (running out of phase)
  drawCrankAndPedals(ctx, rig, false);

  // Pelican body (slightly shaded vector)
  drawFlatPelicanBody(ctx, rig, '#f8fafc', '#cbd5e1', '#fb923c', '#f59e0b');

  // Near leg (BACKWARDS KNEE!)
  drawLeg(ctx, rig.nearLeg, '#ea580c', '#fb923c', 7.5);

  // Red diagnostic error overlays with crisp dark pill backing!
  const pulse = 0.68 + 0.32 * Math.sin(time * 10);
  ctx.save();
  // Circle & angle arc around the backwards knee
  ctx.strokeStyle = `rgba(255, 77, 109, ${pulse})`;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(rig.nearLeg.knee.x, rig.nearLeg.knee.y, 16, 0, Math.PI * 2);
  ctx.stroke();

  // Dashed leader line pointing cleanly away from the frame to upper-left
  const labelX = rig.nearLeg.knee.x - 115;
  const labelY = rig.nearLeg.knee.y - 42;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(rig.nearLeg.knee.x - 10, rig.nearLeg.knee.y - 10);
  ctx.lineTo(labelX + 52, labelY + 10);
  ctx.stroke();
  ctx.setLineDash([]);

  drawErrorBadge(ctx, labelX - 185, labelY - 22, '经典翻车：膝盖往反方向弯！');
  drawErrorBadge(ctx, rig.bb.x - 115, rig.bb.y + 34, '链条打滑 · 转速错位 (0.53×)');
  ctx.restore();

  ctx.restore();
}

/* ============================================================================
 * STAGE 05 (70B) & STAGE 06B (1T FULL EMERGENCE)
 * Shared flagship anatomy & mechanical precision.
 * When `isEmergence === true` (1T+), upgrades with:
 * - Warm golden-hour rim light & specular highlights
 * - Multi-layered fluttering primary wing & tail feathers
 * - Backlit translucent gular pouch with tiny bouncing fish silhouette
 * - Front dynamo headlight volumetric beam
 * - Glossy ground reflection
 * ============================================================================ */
function draw70BConsistent(ctx, rig, time, isEmergence = false, worldX = 0) {
  ctx.save();

  // 1. Ground contact shadow & 1T golden road reflection
  ctx.save();
  if (isEmergence) {
    // Subtle glossy ground mirror reflection
    ctx.save();
    ctx.scale(1, -0.32);
    ctx.globalAlpha = 0.16;
    drawDetailedWheel(ctx, rig.rearWheel, '#fbbf24', '#fef3c7', '#451a03', true);
    drawDetailedWheel(ctx, rig.frontWheel, '#fbbf24', '#fef3c7', '#451a03', true);
    ctx.restore();

    // Soft warm ground contact occlusion shadow
    const shGrad = ctx.createRadialGradient(0, 2, 10, 0, 2, 138);
    shGrad.addColorStop(0, 'rgba(15, 23, 42, 0.52)');
    shGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = shGrad;
    ctx.beginPath();
    ctx.ellipse(0, 2, 138, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.36)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 124, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 2. Headlight volumetric beam (1T Emergence)
  if (isEmergence) {
    ctx.save();
    const hl = rig.headlight;
    const beam = ctx.createLinearGradient(hl.x, hl.y, hl.x + 290, hl.y + 75);
    beam.addColorStop(0, 'rgba(254, 240, 138, 0.42)');
    beam.addColorStop(0.55, 'rgba(253, 224, 71, 0.12)');
    beam.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(hl.x + 4, hl.y - 4);
    ctx.lineTo(hl.x + 290, hl.y - 26);
    ctx.lineTo(hl.x + 290, hl.y + 115);
    ctx.lineTo(hl.x + 4, hl.y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 3. Far pedal & far IK leg (behind bicycle frame)
  drawFarCrank(ctx, rig);
  drawLeg(ctx, rig.farLeg, '#c2410c', '#ea580c', 7);

  // 4. Wheels (accurate arc-length rotation, crossed spokes, specular rims in 1T)
  drawDetailedWheel(
    ctx,
    rig.rearWheel,
    isEmergence ? '#f59e0b' : '#94a3b8',
    isEmergence ? '#fef3c7' : '#e2e8f0',
    isEmergence ? '#1c1917' : '#0f172a',
    isEmergence
  );
  drawDetailedWheel(
    ctx,
    rig.frontWheel,
    isEmergence ? '#f59e0b' : '#94a3b8',
    isEmergence ? '#fef3c7' : '#e2e8f0',
    isEmergence ? '#1c1917' : '#0f172a',
    isEmergence
  );

  // 5. Accurate meshed roller chain (3:1 drivetrain)
  drawMeshedChain(ctx, rig, isEmergence);

  // 6. Bicycle Frame (Teal/Slate at 70B, Deep Racing Emerald + Gold trim at 1T)
  drawBikeFrame(
    ctx,
    rig,
    isEmergence ? '#0f766e' : '#2ec4b6',
    isEmergence ? '#fbbf24' : '#0f766e',
    isEmergence
  );

  // 7. Pelican Body (rich multi-layered feathers + rim light at 1T)
  drawFlagshipPelicanBody(ctx, rig, time, isEmergence);

  // 8. Near crank + Near IK leg + webbed foot locked onto pedal
  drawNearCrank(ctx, rig, isEmergence);
  drawLeg(ctx, rig.nearLeg, '#ea580c', '#fb923c', 8, true);

  // 9. Optional Sandbox warning if user toggled invertKnee manually on 70B/1T
  if (rig.profile.forceKneeWarning) {
    ctx.save();
    ctx.strokeStyle = '#ff4d6d';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(rig.nearLeg.knee.x, rig.nearLeg.knee.y, 15, 0, Math.PI * 2);
    ctx.stroke();
    drawErrorBadge(ctx, rig.nearLeg.knee.x - 210, rig.nearLeg.knee.y - 42, '手动注入：膝盖反弯 Bug (+1)');
    ctx.restore();
  }

  ctx.restore();
}

/* ============================================================================
 * STAGE 06A: 1T + REASONING (CAD BLUEPRINT & THOUGHT-TRACE OVERLAY)
 * Luminous electric cyan/white wireframe, X-ray IK skeleton, torque circles,
 * aerodynamic streamlines, and live force vector arrows.
 * ============================================================================ */
function draw1TBlueprint(ctx, rig, time) {
  ctx.save();

  // 1. Aerodynamic flow streamlines curving cleanly around the pelican's beak & body
  ctx.save();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.34)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) {
    const baseY = -255 + i * 44;
    const phase = (time * 90 + i * 35) % 440;
    ctx.beginPath();
    ctx.moveTo(220, baseY);
    const deflect = Math.exp(-Math.pow((baseY + 170) / 85, 2)) * -42;
    ctx.bezierCurveTo(100, baseY + deflect * 0.4, 20, baseY + deflect, -190, baseY + deflect * 0.2);
    ctx.stroke();

    // Moving air parcel dot along streamline
    const u = phase / 440;
    const px = 220 - u * 410;
    const py = baseY + deflect * Math.sin(Math.PI * u);
    ctx.fillStyle = 'rgba(125, 211, 252, 0.85)';
    ctx.beginPath();
    ctx.arc(px, py, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 2. Wireframe wheels + angular velocity arcs
  for (const [label, w] of [['后轮转速 ω', rig.rearWheel], ['前轮转速 ω', rig.frontWheel]]) {
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, w.r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, w.r - 6, 0, Math.PI * 2);
    ctx.stroke();

    for (let s = 0; s < 12; s++) {
      const a = w.angle + (s * Math.PI * 2) / 12;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (w.r - 6), Math.sin(a) * (w.r - 6));
      ctx.stroke();
    }

    // Torque / angular velocity arc outside wheel
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, w.r + 12, -Math.PI * 0.75, -Math.PI * 0.15);
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.font = '700 17px "PingFang SC", "JetBrains Mono", sans-serif';
    ctx.fillText(label, -36, -w.r - 19);
    ctx.restore();
  }

  // 3. Wireframe bicycle chassis
  ctx.save();
  ctx.strokeStyle = '#7dd3fc';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(rig.rearWheel.x, rig.rearWheel.y);
  ctx.lineTo(rig.bb.x, rig.bb.y);
  ctx.lineTo(rig.headBot.x, rig.headBot.y);
  ctx.lineTo(rig.headTop.x, rig.headTop.y);
  ctx.lineTo(rig.seatCluster.x, rig.seatCluster.y);
  ctx.lineTo(rig.rearWheel.x, rig.rearWheel.y);
  ctx.moveTo(rig.bb.x, rig.bb.y);
  ctx.lineTo(rig.saddle.x, rig.saddle.y);
  ctx.moveTo(rig.frontWheel.x, rig.frontWheel.y);
  ctx.lineTo(rig.headBot.x, rig.headBot.y);
  ctx.lineTo(rig.stemTop.x, rig.stemTop.y);
  ctx.lineTo(rig.handlebar.x, rig.handlebar.y);
  ctx.stroke();

  // Meshed chain wireframe
  const tangents = computeChainTangents(rig.rearWheel, 10, rig.bb, 16);
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.7)';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(tangents.top.x1, tangents.top.y1);
  ctx.lineTo(tangents.top.x2, tangents.top.y2);
  ctx.moveTo(tangents.bot.x1, tangents.bot.y1);
  ctx.lineTo(tangents.bot.x2, tangents.bot.y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // 4. Translucent blueprint pelican silhouette + X-ray skeleton
  ctx.save();
  ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
  ctx.strokeStyle = '#e0f2fe';
  ctx.lineWidth = 1.8;
  tracePelicanOutline(ctx, rig);
  ctx.fill();
  ctx.stroke();

  // Bill & pouch wireframe
  ctx.beginPath();
  ctx.moveTo(rig.head.x + 12, rig.head.y - 6);
  ctx.lineTo(rig.beakTip.x, rig.beakTip.y);
  ctx.quadraticCurveTo(rig.pouchCtrl.x + 14, rig.pouchCtrl.y + 8, rig.head.x + 6, rig.head.y + 10);
  ctx.stroke();

  // Highlighted X-ray 2-Bone IK Skeleton (bright gold/cyan joints)
  const drawSkeletonLeg = (leg, color, label) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(leg.hip.x, leg.hip.y);
    ctx.lineTo(leg.knee.x, leg.knee.y);
    ctx.lineTo(leg.foot.x, leg.foot.y);
    ctx.stroke();

    for (const pt of [leg.hip, leg.knee, leg.foot]) {
      ctx.fillStyle = '#071426';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (label) {
      const deg = ((leg.interiorAngle * 180) / Math.PI).toFixed(1);
      ctx.fillStyle = '#fde047';
      ctx.font = '700 18px "PingFang SC", "JetBrains Mono", sans-serif';
      ctx.fillText(`膝盖夹角 ${deg}°`, leg.knee.x + 14, leg.knee.y - 8);
    }
  };

  drawSkeletonLeg(rig.farLeg, 'rgba(56, 189, 248, 0.5)', false);
  drawSkeletonLeg(rig.nearLeg, '#fde047', true);

  // Force vector arrows (F_drag, F_pedal, g)
  drawVectorArrow(ctx, rig.beakTip.x + 8, rig.beakTip.y - 12, -52, 0, '#38bdf8', '风阻 F_drag');
  drawVectorArrow(ctx, rig.nearPedal.x, rig.nearPedal.y, 0, 42, '#4ade80', '踏板推力');
  drawVectorArrow(ctx, rig.torso.x, rig.torso.y, 0, 46, '#f472b6', '重力 mg');

  ctx.restore();
  ctx.restore();
}

/* ============================================================================
 * SHARED SUB-RENDERERS (Wheels, Frame, Chain, Pelican Anatomy, Legs)
 * ============================================================================ */

function drawFlatWheel(ctx, cx, cy, r, angle, rimColor, spokeColor) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.strokeStyle = spokeColor;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI * 2) / 8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
    ctx.stroke();
  }
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = rimColor;
  ctx.beginPath();
  ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDetailedWheel(ctx, wheel, rimAccent, spokeColor, tireColor, isEmergence) {
  ctx.save();
  ctx.translate(wheel.x, wheel.y);

  // Rotating spokes + valve stem
  ctx.save();
  ctx.rotate(wheel.angle);
  ctx.strokeStyle = isEmergence ? 'rgba(254, 243, 199, 0.55)' : 'rgba(226, 232, 240, 0.45)';
  ctx.lineWidth = 1.35;
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI * 2) / 12;
    const tangent = a + (i % 2 === 0 ? 0.14 : -0.14);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
    ctx.lineTo(Math.cos(tangent) * (wheel.r - 5), Math.sin(tangent) * (wheel.r - 5));
    ctx.stroke();
  }
  // Valve stem indicator (makes rotation super crisp and readable!)
  ctx.strokeStyle = rimAccent;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(wheel.r - 5, 0);
  ctx.lineTo(wheel.r - 13, 0);
  ctx.stroke();
  ctx.restore();

  // Tire outer rubber
  ctx.strokeStyle = tireColor;
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.arc(0, 0, wheel.r, 0, Math.PI * 2);
  ctx.stroke();

  // Rim metallic ring
  ctx.strokeStyle = rimAccent;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(0, 0, wheel.r - 4.2, 0, Math.PI * 2);
  ctx.stroke();

  // Golden-hour top rim specular highlight at 1T
  if (isEmergence) {
    ctx.strokeStyle = 'rgba(254, 249, 195, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, wheel.r + 2.5, -Math.PI * 0.8, -Math.PI * 0.25);
    ctx.stroke();
  }

  // Hub
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = spokeColor;
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawMeshedChain(ctx, rig, isEmergence) {
  const rRear = 10.5;
  const rFront = 16.5;
  const t = computeChainTangents(rig.rearWheel, rRear, rig.bb, rFront);

  ctx.save();
  // Rear cassette & front chainring
  ctx.fillStyle = isEmergence ? '#78716c' : '#475569';
  ctx.strokeStyle = isEmergence ? '#fde68a' : '#94a3b8';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(rig.rearWheel.x, rig.rearWheel.y, rRear, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(rig.bb.x, rig.bb.y, rFront, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Animated roller chain links (moving at exact tooth velocity!)
  const linkOffset = -((rig.crankAngle * rFront) % 8);
  ctx.strokeStyle = isEmergence ? '#e7e5e4' : '#cbd5e1';
  ctx.lineWidth = 2.6;
  ctx.setLineDash([4.5, 3.5]);
  ctx.lineDashOffset = linkOffset;
  ctx.beginPath();
  ctx.moveTo(t.top.x1, t.top.y1);
  ctx.lineTo(t.top.x2, t.top.y2);
  ctx.stroke();

  ctx.lineDashOffset = -linkOffset;
  ctx.beginPath();
  ctx.moveTo(t.bot.x1, t.bot.y1);
  ctx.lineTo(t.bot.x2, t.bot.y2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawBikeFrame(ctx, rig, mainColor, accentColor, isEmergence) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Rear stays
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(rig.rearWheel.x, rig.rearWheel.y);
  ctx.lineTo(rig.bb.x, rig.bb.y);
  ctx.moveTo(rig.rearWheel.x, rig.rearWheel.y);
  ctx.lineTo(rig.seatCluster.x, rig.seatCluster.y);
  ctx.stroke();

  // Main diamond triangle
  ctx.lineWidth = 6.2;
  ctx.beginPath();
  ctx.moveTo(rig.bb.x, rig.bb.y);
  ctx.lineTo(rig.seatCluster.x, rig.seatCluster.y);
  ctx.lineTo(rig.headTop.x, rig.headTop.y);
  ctx.lineTo(rig.headBot.x, rig.headBot.y);
  ctx.lineTo(rig.bb.x, rig.bb.y);
  ctx.stroke();

  // Golden top-tube specular stripe at 1T
  if (isEmergence) {
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.72)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(rig.seatCluster.x + 2, rig.seatCluster.y - 2);
    ctx.lineTo(rig.headTop.x - 2, rig.headTop.y - 2);
    ctx.stroke();
  }

  // Seatpost & Fork (with visible gold suspension stanchion at 1T)
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(rig.seatCluster.x, rig.seatCluster.y);
  ctx.lineTo(rig.saddle.x, rig.saddle.y);
  ctx.stroke();

  // Front fork
  ctx.strokeStyle = isEmergence ? '#fbbf24' : mainColor;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(rig.headBot.x, rig.headBot.y);
  ctx.quadraticCurveTo(rig.headBot.x + 12, rig.headBot.y + 28, rig.frontWheel.x, rig.frontWheel.y);
  ctx.stroke();

  // Stem & swept cruiser handlebar
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(rig.headTop.x, rig.headTop.y);
  ctx.lineTo(rig.stemTop.x, rig.stemTop.y);
  ctx.quadraticCurveTo(rig.stemTop.x - 10, rig.stemTop.y - 4, rig.handlebar.x, rig.handlebar.y);
  ctx.stroke();

  // Handlebar leather grip
  ctx.strokeStyle = isEmergence ? '#92400e' : '#334155';
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.moveTo(rig.handlebar.x + 8, rig.handlebar.y - 1);
  ctx.lineTo(rig.handlebar.x - 6, rig.handlebar.y + 1);
  ctx.stroke();

  // Vintage brass bell on stem at 1T
  if (isEmergence) {
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(rig.stemTop.x + 2, rig.stemTop.y - 6, 5.5, Math.PI, 0);
    ctx.fill();
    // Dynamo headlight housing
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.ellipse(rig.headlight.x, rig.headlight.y, 7, 5, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(rig.headlight.x + 5, rig.headlight.y + 1, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Brooks leather saddle
  ctx.fillStyle = isEmergence ? '#78350f' : '#1e293b';
  ctx.beginPath();
  ctx.moveTo(rig.saddle.x - 19, rig.saddle.y - 2);
  ctx.quadraticCurveTo(rig.saddle.x, rig.saddle.y - 8, rig.saddle.x + 19, rig.saddle.y - 1);
  ctx.quadraticCurveTo(rig.saddle.x, rig.saddle.y + 5, rig.saddle.x - 19, rig.saddle.y - 2);
  ctx.fill();

  ctx.restore();
}

function drawFarCrank(ctx, rig) {
  ctx.save();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(rig.bb.x, rig.bb.y);
  ctx.lineTo(rig.farPedal.x, rig.farPedal.y);
  ctx.stroke();
  ctx.fillStyle = '#334155';
  ctx.fillRect(rig.farPedal.x - 8, rig.farPedal.y - 2.5, 16, 5);
  ctx.restore();
}

function drawNearCrank(ctx, rig, isEmergence) {
  ctx.save();
  ctx.strokeStyle = isEmergence ? '#f5f5f4' : '#cbd5e1';
  ctx.lineWidth = 4.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(rig.bb.x, rig.bb.y);
  ctx.lineTo(rig.nearPedal.x, rig.nearPedal.y);
  ctx.stroke();

  ctx.fillStyle = isEmergence ? '#d97706' : '#64748b';
  ctx.beginPath();
  ctx.arc(rig.bb.x, rig.bb.y, 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(rig.nearPedal.x - 9, rig.nearPedal.y - 3, 18, 6);
  ctx.restore();
}

function drawCrankAndPedals(ctx, rig, isEmergence) {
  drawFarCrank(ctx, rig);
  drawNearCrank(ctx, rig, isEmergence);
}

function drawLeg(ctx, leg, upperColor, lowerColor, width = 7, drawWebbedFoot = false) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Upper thigh
  ctx.strokeStyle = upperColor;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(leg.hip.x, leg.hip.y);
  ctx.lineTo(leg.knee.x, leg.knee.y);
  ctx.stroke();

  // Lower shin
  ctx.strokeStyle = lowerColor;
  ctx.lineWidth = width * 0.8;
  ctx.beginPath();
  ctx.moveTo(leg.knee.x, leg.knee.y);
  ctx.lineTo(leg.foot.x, leg.foot.y);
  ctx.stroke();

  // Cute webbed pelican foot gripping the pedal
  ctx.fillStyle = lowerColor;
  ctx.beginPath();
  if (drawWebbedFoot) {
    ctx.moveTo(leg.foot.x - 7, leg.foot.y - 2);
    ctx.lineTo(leg.foot.x + 13, leg.foot.y - 1);
    ctx.quadraticCurveTo(leg.foot.x + 4, leg.foot.y + 6, leg.foot.x - 7, leg.foot.y + 2);
  } else {
    ctx.ellipse(leg.foot.x + 3, leg.foot.y, 9, 4, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

function tracePelicanOutline(ctx, rig) {
  ctx.beginPath();
  // Tail tip -> back -> S-neck -> head crown -> throat -> chest -> belly -> tail
  ctx.moveTo(rig.tailBase.x - 24, rig.tailBase.y - 12);
  ctx.quadraticCurveTo(rig.torso.x - 24, rig.torso.y - 34, rig.neckMid.x - 16, rig.neckMid.y + 6);
  ctx.bezierCurveTo(
    rig.neckMid.x - 12, rig.neckMid.y - 22,
    rig.head.x - 20, rig.head.y - 20,
    rig.head.x + 6, rig.head.y - 16
  );
  ctx.quadraticCurveTo(rig.head.x + 18, rig.head.y - 6, rig.head.x + 12, rig.head.y + 10);
  ctx.bezierCurveTo(
    rig.neckMid.x + 14, rig.neckMid.y - 2,
    rig.chest.x + 22, rig.chest.y - 4,
    rig.chest.x + 12, rig.chest.y + 24
  );
  ctx.quadraticCurveTo(rig.hip.x + 4, rig.hip.y + 18, rig.tailBase.x - 24, rig.tailBase.y - 12);
  ctx.closePath();
}

function drawFlatPelicanBody(ctx, rig, bodyFill, wingFill, billTop, pouchFill) {
  ctx.save();

  // Body + Neck + Head
  ctx.fillStyle = bodyFill;
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  tracePelicanOutline(ctx, rig);
  ctx.fill();
  ctx.stroke();

  // Throat pouch
  ctx.fillStyle = pouchFill;
  ctx.beginPath();
  ctx.moveTo(rig.head.x + 12, rig.head.y + 1);
  ctx.lineTo(rig.beakTip.x - 4, rig.beakTip.y + 2);
  ctx.quadraticCurveTo(rig.pouchCtrl.x + 12, rig.pouchCtrl.y + 6, rig.head.x + 4, rig.head.y + 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Upper bill
  ctx.fillStyle = billTop;
  ctx.beginPath();
  ctx.moveTo(rig.head.x + 10, rig.head.y - 9);
  ctx.lineTo(rig.beakTip.x, rig.beakTip.y - 2);
  ctx.quadraticCurveTo(rig.beakTip.x + 5, rig.beakTip.y + 4, rig.beakTip.x - 3, rig.beakTip.y + 4);
  ctx.lineTo(rig.head.x + 10, rig.head.y + 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Wing reaching to handlebar
  ctx.fillStyle = wingFill;
  ctx.beginPath();
  ctx.moveTo(rig.shoulder.x - 18, rig.shoulder.y + 4);
  ctx.quadraticCurveTo(rig.wingElbow.x, rig.wingElbow.y - 16, rig.handlebar.x + 2, rig.handlebar.y - 2);
  ctx.quadraticCurveTo(rig.wingElbow.x - 4, rig.wingElbow.y + 14, rig.tailBase.x - 6, rig.tailBase.y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Eye
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(rig.head.x + 2, rig.head.y - 5, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(rig.head.x + 3.2, rig.head.y - 6.2, 1.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawFlagshipPelicanBody(ctx, rig, time, isEmergence) {
  ctx.save();

  // 1. Dynamic fluttering tail feathers (at 1T)
  const tailCount = isEmergence ? 4 : 2;
  for (let i = 0; i < tailCount; i++) {
    const fl = rig.featherFlutter[i] || 0;
    ctx.fillStyle = i % 2 === 0 ? (isEmergence ? '#e7e5e4' : '#cbd5e1') : '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(rig.tailBase.x, rig.tailBase.y - 4 + i * 3);
    ctx.quadraticCurveTo(
      rig.tailBase.x - 22, rig.tailBase.y - 16 + i * 5 + fl * 0.5,
      rig.tailBase.x - 38 - i * 4, rig.tailBase.y - 14 + i * 6 + fl
    );
    ctx.quadraticCurveTo(
      rig.tailBase.x - 18, rig.tailBase.y - 2 + i * 5,
      rig.tailBase.x + 2, rig.tailBase.y + 4 + i * 2
    );
    ctx.closePath();
    ctx.fill();
  }

  // 2. Main plump body + S-curved neck with soft warm gradient shading
  const bodyGrad = ctx.createLinearGradient(
    rig.head.x - 20, rig.head.y - 25,
    rig.hip.x, rig.hip.y + 20
  );
  if (isEmergence) {
    bodyGrad.addColorStop(0, '#fffbeb');
    bodyGrad.addColorStop(0.55, '#f5f0e6');
    bodyGrad.addColorStop(1, '#d6cfc2');
  } else {
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.6, '#f1f5f9');
    bodyGrad.addColorStop(1, '#cbd5e1');
  }

  ctx.fillStyle = bodyGrad;
  tracePelicanOutline(ctx, rig);
  ctx.fill();

  // Golden-hour rim light hugging the exact S-neck & head crown contour at 1T
  if (isEmergence) {
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.92)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rig.neckMid.x - 16, rig.neckMid.y + 6);
    ctx.bezierCurveTo(
      rig.neckMid.x - 12, rig.neckMid.y - 22,
      rig.head.x - 20, rig.head.y - 20,
      rig.head.x + 6, rig.head.y - 16
    );
    ctx.stroke();
  }

  // 3. Cute aerodynamic head tuft feathers (fluttering at 1T)
  const tuftFl = rig.featherFlutter[0] || 0;
  ctx.fillStyle = isEmergence ? '#fef3c7' : '#e2e8f0';
  ctx.beginPath();
  ctx.moveTo(rig.head.x - 8, rig.head.y - 14);
  ctx.quadraticCurveTo(rig.head.x - 22, rig.head.y - 22 + tuftFl * 0.4, rig.head.x - 28, rig.head.y - 14 + tuftFl * 0.7);
  ctx.quadraticCurveTo(rig.head.x - 16, rig.head.y - 10, rig.head.x - 5, rig.head.y - 8);
  ctx.closePath();
  ctx.fill();

  // 4. Iconic gular throat pouch (warm translucent amber at 1T with tiny bouncing fish!)
  const pouchGrad = ctx.createLinearGradient(rig.head.x + 12, rig.head.y, rig.pouchCtrl.x, rig.pouchCtrl.y + 10);
  if (isEmergence) {
    pouchGrad.addColorStop(0, '#fbbf24');
    pouchGrad.addColorStop(0.65, '#f59e0b');
    pouchGrad.addColorStop(1, '#d97706');
  } else {
    pouchGrad.addColorStop(0, '#fbbf24');
    pouchGrad.addColorStop(1, '#ea580c');
  }
  ctx.fillStyle = pouchGrad;
  ctx.beginPath();
  ctx.moveTo(rig.head.x + 11, rig.head.y + 1);
  ctx.lineTo(rig.beakTip.x - 5, rig.beakTip.y + 2);
  ctx.bezierCurveTo(
    rig.beakTip.x - 16, rig.pouchCtrl.y + 6,
    rig.pouchCtrl.x - 6, rig.pouchCtrl.y + 10,
    rig.head.x + 3, rig.head.y + 12
  );
  ctx.closePath();
  ctx.fill();

  // Easter egg at 1T: faint backlit silhouette of a happy fish bouncing inside the throat pouch!
  if (isEmergence) {
    ctx.save();
    ctx.translate(rig.head.x + 36, rig.head.y + 19 + rig.pouchSwing * 0.65);
    ctx.rotate(-0.18 + Math.sin(time * 8) * 0.14);
    ctx.fillStyle = 'rgba(120, 53, 15, 0.24)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 5, 0, 0, Math.PI * 2);
    ctx.moveTo(-9, 0);
    ctx.lineTo(-16, -5);
    ctx.lineTo(-16, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 5. Upper bill with hooked nail tip + specular highlight
  const billGrad = ctx.createLinearGradient(rig.head.x + 10, rig.head.y - 10, rig.beakTip.x, rig.beakTip.y + 4);
  billGrad.addColorStop(0, '#fb923c');
  billGrad.addColorStop(0.7, '#f97316');
  billGrad.addColorStop(1, '#ea580c');
  ctx.fillStyle = billGrad;
  ctx.beginPath();
  ctx.moveTo(rig.head.x + 9, rig.head.y - 9);
  ctx.lineTo(rig.beakTip.x, rig.beakTip.y - 2);
  ctx.quadraticCurveTo(rig.beakTip.x + 5, rig.beakTip.y + 4, rig.beakTip.x - 3, rig.beakTip.y + 5);
  ctx.lineTo(rig.beakTip.x - 6, rig.beakTip.y + 2);
  ctx.lineTo(rig.head.x + 10, rig.head.y + 3);
  ctx.closePath();
  ctx.fill();

  // Crisp glossy highlight along top edge of bill
  ctx.strokeStyle = isEmergence ? 'rgba(255, 251, 235, 0.85)' : 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(rig.head.x + 14, rig.head.y - 6.5);
  ctx.lineTo(rig.beakTip.x - 4, rig.beakTip.y - 1);
  ctx.stroke();

  // 6. Expressive eye with cheerful determined brow
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.ellipse(rig.head.x + 2, rig.head.y - 5.5, 6.2, 5.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(rig.head.x + 3.2, rig.head.y - 5.5, 3.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(rig.head.x + 4.3, rig.head.y - 6.8, 1.3, 0, Math.PI * 2);
  ctx.fill();

  // 7. Layered wing reaching forward to hold the handlebar (with fluttering primary feathers!)
  ctx.save();
  const wingGrad = ctx.createLinearGradient(rig.shoulder.x, rig.shoulder.y - 15, rig.tailBase.x, rig.tailBase.y + 15);
  if (isEmergence) {
    wingGrad.addColorStop(0, '#fefce8');
    wingGrad.addColorStop(0.65, '#e7e5e4');
    wingGrad.addColorStop(1, '#a8a29e');
  } else {
    wingGrad.addColorStop(0, '#f8fafc');
    wingGrad.addColorStop(1, '#cbd5e1');
  }

  // Trailing fluttering primary wing feathers behind elbow
  if (isEmergence) {
    for (let f = 0; f < 4; f++) {
      const fl = rig.featherFlutter[f + 1] || 0;
      ctx.fillStyle = f % 2 === 0 ? '#78716c' : '#57534e';
      ctx.beginPath();
      ctx.moveTo(rig.shoulder.x - 16 - f * 5, rig.shoulder.y + 6 + f * 3);
      ctx.quadraticCurveTo(
        rig.tailBase.x - 10, rig.tailBase.y - 2 + f * 4 + fl * 0.6,
        rig.tailBase.x - 24 - f * 3, rig.tailBase.y + 2 + f * 5 + fl
      );
      ctx.quadraticCurveTo(
        rig.tailBase.x, rig.tailBase.y + 8 + f * 4,
        rig.shoulder.x - 10 - f * 4, rig.shoulder.y + 14 + f * 2
      );
      ctx.closePath();
      ctx.fill();
    }
  }

  // Main wing covert gripping handlebar
  ctx.fillStyle = wingGrad;
  ctx.strokeStyle = isEmergence ? 'rgba(120, 113, 108, 0.45)' : 'rgba(100, 116, 139, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(rig.shoulder.x - 18, rig.shoulder.y + 2);
  ctx.bezierCurveTo(
    rig.shoulder.x + 6, rig.shoulder.y - 12,
    rig.wingElbow.x + 12, rig.wingElbow.y - 12,
    rig.handlebar.x + 4, rig.handlebar.y - 2
  );
  ctx.quadraticCurveTo(rig.handlebar.x + 4, rig.handlebar.y + 6, rig.handlebar.x - 5, rig.handlebar.y + 5);
  ctx.bezierCurveTo(
    rig.wingElbow.x - 2, rig.wingElbow.y + 14,
    rig.torso.x - 12, rig.torso.y + 16,
    rig.shoulder.x - 26, rig.shoulder.y + 12
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawErrorBadge(ctx, x, y, text) {
  ctx.save();
  ctx.font = '700 18.5px "PingFang SC", "JetBrains Mono", sans-serif';
  const tw = ctx.measureText(text).width;
  const padX = 12;
  const h = 32;
  ctx.fillStyle = 'rgba(10, 14, 24, 0.90)';
  ctx.strokeStyle = 'rgba(255, 92, 119, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, tw + padX * 2, h, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fda4af';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + h * 0.5 + 1);
  ctx.restore();
}

function drawVectorArrow(ctx, x, y, dx, dy, color, label) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + dy);
  ctx.stroke();

  const a = Math.atan2(dy, dx);
  const head = 10;
  ctx.beginPath();
  ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - head * Math.cos(a - 0.42), y + dy - head * Math.sin(a - 0.42));
  ctx.lineTo(x + dx - head * Math.cos(a + 0.42), y + dy - head * Math.sin(a + 0.42));
  ctx.closePath();
  ctx.fill();

  if (label) {
    ctx.font = '700 17px "PingFang SC", "JetBrains Mono", sans-serif';
    ctx.fillText(label, x + dx + (dx < 0 ? -74 : 8), y + dy + (dy > 0 ? 18 : -8));
  }
  ctx.restore();
}
