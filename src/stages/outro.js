// src/stages/outro.js
// 10.0s Exhibition Finale (t ∈ [90.0..100.0]) with broadcast/mobile-readable scale.

import { VIEW_W, VIEW_H, RIDE_END_SEC, smootherstep } from '../beat/timeline.js';
import { roadBaseY, worldToScreen } from '../beat/curve.js';
import { computePelicanRig, getStageRigProfile } from '../rig/pelican.js';
import { drawPelicanRig } from '../rig/renderer.js';

const FINALE_NODES = [
  { stageId: 's1_1m', label: '1M', zh: '随机噪点', loss: '9.82', score: '0.4', worldX: 900, accent: '#ff5c77' },
  { stageId: 's2_100m', label: '100M', zh: '抽象翻车', loss: '4.18', score: '14.2', worldX: 2700, accent: '#f97316' },
  { stageId: 's3_7b', label: '7B', zh: '静态贴纸', loss: '1.56', score: '46.8', worldX: 4500, accent: '#38bdf8' },
  { stageId: 's4_32b', label: '32B', zh: '膝盖反弯', loss: '0.87', score: '68.5', worldX: 6300, accent: '#eab308' },
  { stageId: 's5_70b', label: '70B', zh: '物理自洽', loss: '0.31', score: '89.2', worldX: 8300, accent: '#2dd4bf' },
  { stageId: 's6b_1t_emerge', label: '1T → 3D', zh: '升维涌现', loss: '0.009', score: '99.8', worldX: 13800, accent: '#fbbf24' },
];

export function renderOutroOverlay(ctx, t, cam) {
  if (t < RIDE_END_SEC + 0.6) return;
  const dt = t - RIDE_END_SEC;
  const cardMix = smootherstep(1.6, 3.6, dt);
  if (cardMix <= 0.01) return;

  ctx.save();

  // Editorial top title banner (broadcast scale!)
  const headerAlpha = smootherstep(1.2, 2.8, dt);
  ctx.save();
  ctx.globalAlpha = headerAlpha;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(186, 230, 253, 0.88)';
  ctx.font = '600 20px "PingFang SC", "JetBrains Mono", sans-serif';
  ctx.fillText('PELICANBENCH · 尺度定律全过程评测结案', VIEW_W * 0.5, 62);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 50px "PingFang SC", "Noto Sans SC", system-ui, sans-serif';
  ctx.fillText('从 100 万噪点到 3D 世界：七个数量级的涌现之路', VIEW_W * 0.5, 122);
  ctx.restore();

  // 6 crisp architectural specimen plates with larger legible labels
  const cardW = 264;
  const cardH = 248;
  for (let i = 0; i < FINALE_NODES.length; i++) {
    const node = FINALE_NODES[i];
    const appear = smootherstep(1.4 + i * 0.26, 2.2 + i * 0.26, dt);
    if (appear <= 0.01) continue;

    const anchor = worldToScreen(node.worldX, roadBaseY(node.worldX), cam);
    const cx = 190 + i * 308;
    const cy = anchor.y > 540 ? 298 : 708;
    const bx = cx - cardW * 0.5;
    const by = cy - cardH * 0.5;

    ctx.save();
    ctx.globalAlpha = appear;

    ctx.strokeStyle = node.accent;
    ctx.globalAlpha = appear * 0.68;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(cx, cy > anchor.y ? by : by + cardH);
    ctx.lineTo(anchor.x, anchor.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = appear;

    ctx.fillStyle = 'rgba(9, 13, 22, 0.90)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.30)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(bx, by, cardW, cardH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = node.accent;
    ctx.fillRect(bx, by, cardW, 3);

    // Larger bold header inside plate
    ctx.fillStyle = node.accent;
    ctx.font = '700 22px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(node.label, bx + 14, by + 32);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 20px "PingFang SC", "Noto Sans SC", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(node.zh, bx + cardW - 14, by + 31);

    // Live miniature pelican
    ctx.save();
    ctx.beginPath();
    ctx.rect(bx + 6, by + 44, cardW - 12, cardH - 88);
    ctx.clip();

    const floorY = by + cardH - 54;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.32)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bx + 12, floorY);
    ctx.lineTo(bx + cardW - 12, floorY);
    ctx.stroke();

    const profile = getStageRigProfile(node.stageId);
    const miniRig = computePelicanRig({
      worldX: node.worldX + dt * 130,
      pedalPhase: dt * Math.PI * 2,
      speedScale: 0.9,
      time: t,
      profile,
    });
    ctx.translate(cx, floorY);
    ctx.scale(0.48, 0.48);
    drawPelicanRig(ctx, miniRig, t, node.worldX + dt * 130);
    ctx.restore();

    // Larger Chinese telemetry footer inside plate
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
    ctx.beginPath();
    ctx.moveTo(bx + 12, by + cardH - 40);
    ctx.lineTo(bx + cardW - 12, by + cardH - 40);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 17px "PingFang SC", "JetBrains Mono", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`误差 ${node.loss}`, bx + 14, by + cardH - 14);
    ctx.textAlign = 'right';
    ctx.fillStyle = i >= 4 ? '#86efac' : '#f8fafc';
    ctx.fillText(`评分 ${node.score}`, bx + cardW - 14, by + cardH - 14);

    ctx.restore();
  }

  // Borderless Broadcast-Sized Editorial Footer Verdict
  const verdictAlpha = smootherstep(3.6, 5.0, dt);
  if (verdictAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = verdictAlpha;
    const vw = 1220;
    const vx = (VIEW_W - vw) * 0.5;
    const vy = VIEW_H - 154;

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    ctx.lineTo(vx + vw, vy);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.26)';
    ctx.beginPath();
    ctx.moveTo(vx, vy + 94);
    ctx.lineTo(vx + vw, vy + 94);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 22px "PingFang SC", "JetBrains Mono", sans-serif';
    ctx.fillText('评测结论 · 跨维度智能涌现已确认 (2D → 3D EMERGENCE)', vx + 4, vy + 34);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 20px "PingFang SC", "Noto Sans SC", sans-serif';
    ctx.fillText('100% 纯代码实时生成 · 零外部图片与录音 · 120 BPM 原创程序化合成音轨', vx + 4, vy + 70);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#86efac';
    ctx.font = '700 46px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText('99.8 / 100', vx + vw - 4, vy + 62);
    ctx.restore();
  }

  ctx.restore();
}
