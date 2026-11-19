// src/rig/ik.js
// Exact 2D analytical two-bone IK solver + sprocket chain tangent geometry.

/**
 * Solves 2D two-bone analytical IK from root (rx, ry) to target (tx, ty)
 * with upper segment length L1 and lower segment length L2.
 *
 * Canvas coordinates: +X is right (forward), +Y is down.
 * For a right-facing cyclist (hip above/behind pedal):
 *   bendSign = -1 bends the knee FORWARD (+X, toward handlebars — natural cyclist knee)
 *   bendSign = +1 bends the knee BACKWARD (-X, inverted broken LLM knee!)
 */
export function solveTwoBoneIK(rx, ry, tx, ty, L1, L2, bendSign = -1) {
  let dx = tx - rx;
  let dy = ty - ry;
  let d = Math.hypot(dx, dy);
  const minD = Math.abs(L1 - L2) + 1e-3;
  const maxD = L1 + L2 - 1e-3;
  const clamped = d > maxD || d < minD;
  if (d < minD) d = minD;
  if (d > maxD) {
    const k = maxD / d;
    dx *= k;
    dy *= k;
    d = maxD;
  }
  const cosA = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d);
  const clampedCos = Math.max(-1, Math.min(1, cosA));
  const angleBase = Math.atan2(dy, dx);
  const angleOffset = bendSign * Math.acos(clampedCos);
  const hipAngle = angleBase + angleOffset;
  const kx = rx + L1 * Math.cos(hipAngle);
  const ky = ry + L1 * Math.sin(hipAngle);
  const kneeAngle = Math.atan2(ty - ky, tx - kx);

  return {
    hip: { x: rx, y: ry },
    knee: { x: kx, y: ky },
    foot: { x: rx + dx, y: ry + dy },
    hipAngle,
    kneeAngle,
    interiorAngle: Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2)))),
    clamped,
  };
}

/**
 * Computes outer tangent segment endpoints between two circles (c1, r1) and (c2, r2)
 * for accurate bicycle chain rendering (top run & bottom run).
 */
export function computeChainTangents(c1, r1, c2, r2) {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const dist = Math.hypot(dx, dy) || 1;
  const baseAngle = Math.atan2(dy, dx);
  const cosTheta = Math.max(-1, Math.min(1, (r1 - r2) / dist));
  const theta = Math.acos(cosTheta);

  // Top tangent (normal pointing -Y) and bottom tangent (normal pointing +Y)
  const aTop = baseAngle - theta;
  const aBot = baseAngle + theta;

  return {
    top: {
      x1: c1.x + r1 * Math.cos(aTop),
      y1: c1.y + r1 * Math.sin(aTop),
      x2: c2.x + r2 * Math.cos(aTop),
      y2: c2.y + r2 * Math.sin(aTop),
    },
    bot: {
      x1: c1.x + r1 * Math.cos(aBot),
      y1: c1.y + r1 * Math.sin(aBot),
      x2: c2.x + r2 * Math.cos(aBot),
      y2: c2.y + r2 * Math.sin(aBot),
    },
  };
}
