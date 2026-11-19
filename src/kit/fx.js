// src/kit/fx.js
// Visual effects scaled for broadcast/mobile video readability:
// Large crisp 22px <思考过程> stream, open CAD solver block, golden atmosphere, scanlines & dust.

import { VIEW_W, VIEW_H, clamp } from '../beat/timeline.js';
import { makePRNG } from './prng.js';

const THOUGHT_LINES = [
  '<思考过程 · Chain of Thought>',
  '  [01] 拆解考题：「用纯代码画骑车的鹈鹕」',
  '  [02] 修正 32B 缺陷：膝盖翻回正向 (bendSign=-1)',
  '  [03] 求解双骨骼逆运动学：脚掌锁死踏板转轴',
  '  [04] 校准链条传动比：保持 3:1 咬合转速',
  '  [05] 建模前叉弹簧减震与大喉囊单摆惯性',
  '  [06] 加入迎风羽毛柔体抖动与黄昏逆光反射',
  '  [校验] 全部几何物理约束通过，输出 1T 满血终稿……',
  '</思考过程>',
];

export function drawThinkingOverlay(ctx, localT, time, alpha = 1) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.strokeStyle = 'rgba(125, 211, 252, 0.36)';
  ctx.lineWidth = 1.5;
  const m = 48;
  const topY = 204;
  const botY = VIEW_H - 200;
  const arm = 28;
  const corners = [
    [m, topY, 1, 1],
    [VIEW_W - m, topY, -1, 1],
    [m, botY, 1, -1],
    [VIEW_W - m, botY, -1, -1],
  ];
  ctx.beginPath();
  for (const [cx, cy, sx, sy] of corners) {
    ctx.moveTo(cx, cy + sy * arm);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + sx * arm, cy);
  }
  ctx.stroke();

  const totalChars = THOUGHT_LINES.join('\n').length;
  const visibleChars = Math.floor(clamp(localT * 1.18, 0.08, 1) * totalChars);

  ctx.font = '600 22px "PingFang SC", "Noto Sans SC", "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  let cursor = 0;
  const startX = 72;
  const startY = 230;
  const lineH = 40;

  for (let i = 0; i < THOUGHT_LINES.length; i++) {
    const line = THOUGHT_LINES[i];
    if (cursor >= visibleChars) break;
    const take = Math.min(line.length, visibleChars - cursor);
    const slice = line.slice(0, take);
    cursor += line.length + 1;

    const isTag = line.startsWith('<');
    const isVerify = line.includes('[校验]');
    ctx.fillStyle = isTag
      ? 'rgba(56, 189, 248, 0.94)'
      : isVerify
        ? 'rgba(74, 222, 128, 0.96)'
        : 'rgba(224, 242, 254, 0.82)';
    ctx.fillText(slice, startX, startY + i * lineH);

    if (take < line.length) {
      const w = ctx.measureText(slice).width;
      if (Math.floor(time * 8) % 2 === 0) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(startX + w + 4, startY + i * lineH + 3, 12, 24);
      }
    }
  }

  const rx = VIEW_W - 445;
  const ry = 230;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(rx, ry);
  ctx.lineTo(rx + 375, ry);
  ctx.moveTo(rx, ry + 208);
  ctx.lineTo(rx + 375, ry + 208);
  ctx.stroke();

  ctx.fillStyle = '#7dd3fc';
  ctx.font = '700 20px "PingFang SC", "JetBrains Mono", sans-serif';
  ctx.fillText('深度思考求解 · 0.25× 慢放', rx, ry + 18);

  const specs = [
    ['骨骼长度', '44 / 47 px', '#e0f2fe'],
    ['关节误差', '0.00 px  通过', '#4ade80'],
    ['链条齿比', '3.00 : 1  通过', '#4ade80'],
    ['风阻雷诺数', `${(1.38 + 0.04 * Math.sin(time * 3)).toFixed(2)}×10⁵`, '#bae6fd'],
  ];
  for (let i = 0; i < specs.length; i++) {
    const [k, v, col] = specs[i];
    const rowY = ry + 64 + i * 35;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(186, 230, 253, 0.88)';
    ctx.font = '500 19px "PingFang SC", "Noto Sans SC", sans-serif';
    ctx.fillText(k, rx, rowY);

    ctx.textAlign = 'right';
    ctx.fillStyle = col;
    ctx.font = '700 19px "JetBrains Mono", "PingFang SC", monospace';
    ctx.fillText(v, rx + 375, rowY);
  }

  ctx.restore();
}

export function drawEmergenceAtmosphere(ctx, time, worldX, alpha = 1) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;

  for (let i = 0; i < 7; i++) {
    const rng = makePRNG(800 + i * 31);
    const baseY = 200 + rng() * 540;
    const speed = 340 + rng() * 240;
    const len = 150 + rng() * 210;
    const x = VIEW_W - (((time * speed + rng() * VIEW_W * 1.4) % (VIEW_W + len * 2)) - len);

    const grad = ctx.createLinearGradient(x, baseY, x + len, baseY);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0)');
    grad.addColorStop(0.5, 'rgba(254, 243, 199, 0.30)');
    grad.addColorStop(1, 'rgba(251, 191, 36, 0)');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.8 + rng() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.quadraticCurveTo(x + len * 0.5, baseY + Math.sin(time * 3 + i) * 14, x + len, baseY);
    ctx.stroke();
  }

  for (let i = 0; i < 28; i++) {
    const rng = makePRNG(1200 + i * 73);
    const speed = 90 + rng() * 160;
    const x = VIEW_W - (((worldX * 0.55 + time * speed + rng() * 2400) % (VIEW_W + 120)) - 60);
    const y = 140 + rng() * 720 + Math.sin(time * (1.2 + rng()) + i) * 18;
    const r = 2 + rng() * 4.5;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(254, 240, 138, 0.44)' : 'rgba(251, 191, 36, 0.25)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawGateCrossingFX(ctx, gateScreenX, gateScreenY, accent, proximity, time) {
  if (proximity <= 0.01) return;
  ctx.save();

  const beamW = 8 + proximity * 30;
  const beamGrad = ctx.createLinearGradient(gateScreenX - beamW, 0, gateScreenX + beamW, 0);
  beamGrad.addColorStop(0, 'rgba(255,255,255,0)');
  beamGrad.addColorStop(0.5, accent);
  beamGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = 0.28 + proximity * 0.65;
  ctx.fillStyle = beamGrad;
  ctx.fillRect(gateScreenX - beamW, 0, beamW * 2, VIEW_H);

  ctx.globalAlpha = 0.55 + proximity * 0.45;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2 + proximity * 2;
  ctx.beginPath();
  ctx.moveTo(gateScreenX, 0);
  ctx.lineTo(gateScreenX, VIEW_H);
  ctx.stroke();

  const rng = makePRNG(Math.floor(time * 24) * 17 + Math.round(gateScreenX));
  ctx.globalAlpha = proximity;
  for (let i = 0; i < 16; i++) {
    const sy = gateScreenY - 10 - rng() * 250;
    const sx = gateScreenX + (rng() - 0.5) * 50 * proximity;
    const r = 1.8 + rng() * 3.2;
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : accent;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawTireDust(ctx, screenX, screenY, time, intensity = 1, tint = 'rgba(226, 232, 240, 0.32)') {
  if (intensity <= 0.01) return;
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const phase = (time * 2.6 + i * 0.167) % 1;
    const dx = -phase * 85 - 12;
    const dy = -Math.sin(phase * Math.PI) * 16 - phase * 8;
    const r = (3 + phase * 11) * intensity;
    ctx.fillStyle = tint;
    ctx.globalAlpha = (1 - phase) * 0.45 * intensity;
    ctx.beginPath();
    ctx.arc(screenX + dx, screenY + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
