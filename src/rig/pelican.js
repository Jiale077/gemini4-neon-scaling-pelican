// src/rig/pelican.js
// Parametric degradable Pelican + Bicycle rig.
// One unified coordinate & kinematic model that smoothly degrades across
// 1M -> 100M -> 7B -> 32B -> 70B -> 1T (Reasoning Blueprint + Full Emergence),
// and also powers the Interactive Sandbox Lab sliders.

import { solveTwoBoneIK } from './ik.js';
import { clamp, lerp } from '../beat/timeline.js';
import { getWheelSuspension } from '../beat/curve.js';

/**
 * Returns a rig behavior profile for each named timeline stage.
 */
export function getStageRigProfile(stageId) {
  switch (stageId) {
    case 's1_1m':
      return {
        mode: 'noise_1m',
        noiseAmp: 1.0,
        partScatter: 1.0,
        wheelSpinGain: 0.0,
        pedalSpinGain: 0.0,
        ikBendSign: -1,
        gearMismatch: 0,
        physicsLevel: 0,
        blueprintMix: 0,
        emergenceMix: 0,
        temperature: 1.8,
      };
    case 's2_100m':
      return {
        mode: 'abstract_100m',
        noiseAmp: 0.35,
        partScatter: 1.0,
        wheelSpinGain: 0.12,
        pedalSpinGain: 0.0,
        ikBendSign: -1,
        gearMismatch: 0,
        physicsLevel: 0,
        blueprintMix: 0,
        emergenceMix: 0,
        temperature: 1.25,
      };
    case 's3_7b':
      return {
        mode: 'sticker_7b',
        noiseAmp: 0,
        partScatter: 0,
        wheelSpinGain: 0.0, // Frozen wheels sliding!
        pedalSpinGain: 0.0, // Frozen feet hovering off pedals!
        ikBendSign: -1,
        gearMismatch: 0,
        physicsLevel: 0,
        blueprintMix: 0,
        emergenceMix: 0,
        temperature: 0.7,
      };
    case 's4_32b':
      return {
        mode: 'broken_32b',
        noiseAmp: 0,
        partScatter: 0,
        wheelSpinGain: 1.0,
        pedalSpinGain: 0.53, // Desynced crank speed!
        ikBendSign: 1, // +1 = BACKWARDS knee inversion bug!
        gearMismatch: 1.0,
        physicsLevel: 0.2,
        blueprintMix: 0,
        emergenceMix: 0,
        temperature: 0.85,
      };
    case 's5_70b':
      return {
        mode: 'consistent_70b',
        noiseAmp: 0,
        partScatter: 0,
        wheelSpinGain: 1.0,
        pedalSpinGain: 1.0,
        ikBendSign: -1, // -1 = Natural forward cycling knee!
        gearMismatch: 0,
        physicsLevel: 0.65,
        blueprintMix: 0,
        emergenceMix: 0,
        temperature: 0.7,
      };
    case 's6a_1t_think':
      return {
        mode: 'blueprint_1t',
        noiseAmp: 0,
        partScatter: 0,
        wheelSpinGain: 1.0,
        pedalSpinGain: 1.0,
        ikBendSign: -1,
        gearMismatch: 0,
        physicsLevel: 1.0,
        blueprintMix: 1.0,
        emergenceMix: 0,
        temperature: 0.5,
      };
    case 's6b_1t_emerge':
    default:
      return {
        mode: 'emergence_1t',
        noiseAmp: 0,
        partScatter: 0,
        wheelSpinGain: 1.0,
        pedalSpinGain: 1.0,
        ikBendSign: -1,
        gearMismatch: 0,
        physicsLevel: 1.0,
        blueprintMix: 0,
        emergenceMix: 1.0,
        temperature: 0.7,
      };
  }
}

/**
 * Maps interactive Sandbox slider parameters into a continuous rig profile.
 */
export function getSandboxRigProfile(sandbox) {
  const lp = sandbox.logParams; // 6.0 (1M) -> 12.3 (1T+)
  let mode = 'emergence_1t';
  if (sandbox.blueprint) {
    mode = 'blueprint_1t';
  } else if (lp < 7.0) {
    mode = 'noise_1m';
  } else if (lp < 8.8) {
    mode = 'abstract_100m';
  } else if (lp < 10.1) {
    mode = 'sticker_7b';
  } else if (lp < 10.65) {
    mode = 'broken_32b';
  } else if (lp < 11.5) {
    mode = 'consistent_70b';
  } else {
    mode = 'emergence_1t';
  }

  const base = getStageRigProfile(
    mode === 'noise_1m'
      ? 's1_1m'
      : mode === 'abstract_100m'
        ? 's2_100m'
        : mode === 'sticker_7b'
          ? 's3_7b'
          : mode === 'broken_32b'
            ? 's4_32b'
            : mode === 'consistent_70b'
              ? 's5_70b'
              : mode === 'blueprint_1t'
                ? 's6a_1t_think'
                : 's6b_1t_emerge'
  );

  // Apply explicit interactive lab overrides
  if (sandbox.invertKnee) {
    base.ikBendSign = 1;
    base.gearMismatch = Math.max(base.gearMismatch, 0.85);
    if (base.mode === 'consistent_70b' || base.mode === 'emergence_1t') {
      base.forceKneeWarning = true;
    }
  }
  if (sandbox.lockWheels) {
    base.wheelSpinGain = 0;
    base.pedalSpinGain = 0;
  }
  base.temperature = sandbox.temperature;
  if (sandbox.temperature > 1.15) {
    base.tempJitter = (sandbox.temperature - 1.15) * 16;
  }
  return base;
}

/**
 * Computes full deterministic geometry & joints of the Pelican + Bicycle in local frame.
 * Local origin (0, 0) = ground midpoint directly beneath the bicycle wheelbase; +X = forward, -Y = up.
 */
export function computePelicanRig({
  worldX = 0,
  pedalPhase = 0,
  speedScale = 1.0,
  time = 0,
  profile,
}) {
  const wheelR = 48;
  const wheelbase = 172;
  const rearX = -wheelbase * 0.5; // -86
  const frontX = wheelbase * 0.5; // +86

  // Suspension travel active at 70B/1T
  const suspRaw = getWheelSuspension(worldX);
  const suspMix = profile.physicsLevel || 0;
  const frontComp = suspRaw.frontCompress * suspMix;
  const rearComp = suspRaw.rearCompress * suspMix * 0.55;

  // Wheel & crank angles
  const wheelAngle = (worldX / wheelR) * (profile.wheelSpinGain ?? 1);
  const crankAngle = pedalPhase * (profile.pedalSpinGain ?? 1);

  // Subtle rhythmic body bounce & throat-pouch pendulum
  const motionAmp = clamp(speedScale, 0.15, 1.3) * (profile.pedalSpinGain > 0 ? 1 : 0);
  const cadenceBob =
    profile.mode === 'broken_32b'
      ? 5.5 * Math.sin(2 * crankAngle) // Inverted harsh bobbing in 32B!
      : -3.2 * Math.sin(2 * crankAngle) * motionAmp;
  const bodyDrop = (frontComp * 0.45 + rearComp * 0.55) + cadenceBob;

  // Temperature chaos offset (for Sandbox high-T fun)
  const tj = profile.tempJitter || 0;
  const tx = tj ? Math.sin(time * 13.7) * tj * 0.4 : 0;
  const ty = tj ? Math.cos(time * 17.3) * tj * 0.35 : 0;

  // Wheel centers
  const rearWheel = { x: rearX, y: -wheelR, r: wheelR, angle: wheelAngle };
  const frontWheel = { x: frontX, y: -wheelR, r: wheelR, angle: wheelAngle };

  // Frame key nodes (shifted slightly by suspension compression)
  const bb = { x: -10, y: -49 + rearComp * 0.4 }; // Bottom bracket
  const seatCluster = { x: -35, y: -116 + bodyDrop * 0.35 };
  const saddle = { x: -40, y: -125 + bodyDrop * 0.35 };
  const headTop = { x: 55, y: -122 + frontComp * 0.65 };
  const headBot = { x: 64, y: -96 + frontComp * 0.65 };
  const stemTop = { x: 50, y: -140 + frontComp * 0.65 };
  const handlebar = { x: 35, y: -143 + frontComp * 0.65 };
  const handlebarDrop = { x: 46, y: -136 + frontComp * 0.65 };
  const headlight = { x: 66, y: -118 + frontComp * 0.65 };

  // Crank & pedals
  const crankR = 23;
  const nearPedal = {
    x: bb.x + crankR * Math.cos(crankAngle),
    y: bb.y + crankR * Math.sin(crankAngle),
  };
  const farPedal = {
    x: bb.x - crankR * Math.cos(crankAngle),
    y: bb.y - crankR * Math.sin(crankAngle),
  };

  // Pelican body anchor on saddle
  const hip = { x: saddle.x + 2 + tx * 0.3, y: saddle.y - 12 + cadenceBob * 0.7 + ty * 0.3 };

  // Leg targets:
  // - In 7B (sticker), feet stay frozen and hover ~28px above/behind pedals!
  // - In 32B (broken), feet slip slightly off pedals + knees bend backwards!
  let nearFootTarget = nearPedal;
  let farFootTarget = farPedal;
  if (profile.mode === 'sticker_7b' || profile.wheelSpinGain === 0 && profile.pedalSpinGain === 0 && profile.mode !== 'noise_1m' && profile.mode !== 'abstract_100m') {
    nearFootTarget = { x: bb.x - 14, y: bb.y - 24 };
    farFootTarget = { x: bb.x + 6, y: bb.y - 28 };
  } else if (profile.mode === 'broken_32b') {
    const slip = 11 * Math.sin(time * 7.2);
    nearFootTarget = { x: nearPedal.x + slip, y: nearPedal.y - 8 + Math.cos(time * 5.5) * 6 };
    farFootTarget = { x: farPedal.x - slip * 0.8, y: farPedal.y - 6 };
  }

  // Analytical 2-Bone IK for both legs (L1 = femur/thigh, L2 = tibiotarsus/shin)
  const L1 = 44;
  const L2 = 47;
  const bendSign = profile.ikBendSign ?? -1;
  const nearLeg = solveTwoBoneIK(hip.x + 3, hip.y + 4, nearFootTarget.x, nearFootTarget.y, L1, L2, bendSign);
  const farLeg = solveTwoBoneIK(hip.x - 4, hip.y + 2, farFootTarget.x, farFootTarget.y, L1, L2, bendSign);

  // Pelican torso, neck, head, iconic bill & throat pouch
  const aeroLean = lerp(0, 5.5, profile.emergenceMix || 0);
  const torso = { x: hip.x + 12 + aeroLean * 0.3, y: hip.y - 28 + cadenceBob * 0.5 };
  const chest = { x: torso.x + 24 + aeroLean * 0.5, y: torso.y - 12 };
  const tailBase = { x: hip.x - 32, y: hip.y - 16 };
  const shoulder = { x: torso.x + 14, y: torso.y - 16 };

  // Graceful S-curved neck
  const neckMid = { x: chest.x + 6 + aeroLean * 0.4, y: chest.y - 34 + cadenceBob * 0.4 };
  const head = {
    x: chest.x + 24 + aeroLean + tx * 0.5,
    y: chest.y - 54 + cadenceBob * 0.65 + ty * 0.5,
  };
  const nod = 0.045 * Math.sin(2 * crankAngle - 0.5) * motionAmp;

  // Iconic long pelican bill + gular pouch pendulum
  const billLen = 78;
  const billAngle = 0.16 + nod + (profile.emergenceMix ? -0.05 : 0);
  const beakTip = {
    x: head.x + 12 + Math.cos(billAngle) * billLen,
    y: head.y - 1 + Math.sin(billAngle) * billLen,
  };
  const pouchSwing =
    (profile.physicsLevel > 0.3 ? 5.5 * Math.sin(2 * crankAngle - 0.9) * motionAmp : 0) +
    (profile.emergenceMix ? 2.5 * Math.sin(time * 9.5) : 0);
  const pouchCtrl = {
    x: head.x + 42,
    y: head.y + 34 + pouchSwing + frontComp * 0.35,
  };

  // Wing reaching forward to grip handlebar
  const wingElbow = {
    x: (shoulder.x + handlebar.x) * 0.5 - 6,
    y: (shoulder.y + handlebar.y) * 0.5 + 8 + cadenceBob * 0.4,
  };

  // Secondary feather flutter phases (for 1T Emergence)
  const featherFlutter = [];
  for (let i = 0; i < 6; i++) {
    const wave =
      profile.physicsLevel > 0.5
        ? Math.sin(time * (13 + i * 1.4) - i * 0.85) * (2.2 + i * 0.7) * (0.4 + 0.6 * profile.emergenceMix)
        : 0;
    featherFlutter.push(wave);
  }

  return {
    wheelR,
    rearWheel,
    frontWheel,
    bb,
    seatCluster,
    saddle,
    headTop,
    headBot,
    stemTop,
    handlebar,
    handlebarDrop,
    headlight,
    crankR,
    crankAngle,
    nearPedal,
    farPedal,
    hip,
    torso,
    chest,
    tailBase,
    shoulder,
    neckMid,
    head,
    beakTip,
    pouchCtrl,
    billAngle,
    wingElbow,
    nearLeg,
    farLeg,
    frontComp,
    rearComp,
    featherFlutter,
    pouchSwing,
    profile,
  };
}
