// src/stages/intro.js
// 4.0s Editorial Cinema Title Opening (t ∈ [0..4.0]) with broadcast/mobile-readable scale.

import { VIEW_W, VIEW_H, INTRO_SEC, smoothstep } from '../beat/timeline.js';

const PROMPT_TEXT = '「用纯代码，画一只骑自行车的鹈鹕。」';

export function renderIntroOverlay(ctx, t) {
  if (t >= INTRO_SEC + 0.4) return;

  const fadeOut = 1 - smoothstep(INTRO_SEC - 1.1, INTRO_SEC + 0.15, t);
  if (fadeOut <= 0.005) return;

  ctx.save();

  ctx.fillStyle = `rgba(6, 9, 15, ${fadeOut * 0.90})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.globalAlpha = fadeOut;

  const titleIn = smoothstep(0.08, 0.85, t);
  ctx.save();
  ctx.globalAlpha = fadeOut * titleIn;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Eyebrow caption (22px!)
  ctx.fillStyle = 'rgba(186, 230, 253, 0.86)';
  ctx.font = '600 22px "PingFang SC", "JetBrains Mono", sans-serif';
  ctx.fillText('AI 尺度定律视觉实验 · THE SCALING LAW RIDE', VIEW_W * 0.5, VIEW_H * 0.26);

  // Monumental Chinese film title (108px!)
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 108px "PingFang SC", "Noto Sans SC", "Songti SC", serif';
  ctx.fillText('涌 现 之 路', VIEW_W * 0.5, VIEW_H * 0.39);

  // Thin editorial hairline divider
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(VIEW_W * 0.5 - 160, VIEW_H * 0.48);
  ctx.lineTo(VIEW_W * 0.5 + 160, VIEW_H * 0.48);
  ctx.stroke();

  ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
  ctx.font = '500 28px "PingFang SC", "Noto Sans SC", sans-serif';
  ctx.fillText('把参数从 100 万一路放大到 3D 世界模型，同一只鹈鹕会发生什么？', VIEW_W * 0.5, VIEW_H * 0.535);
  ctx.restore();

  // Open borderless prompt reveal (40px broadcast size!)
  const py = VIEW_H * 0.675;
  const lineHalf = 520;

  ctx.strokeStyle = 'rgba(226, 232, 240, 0.22)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(VIEW_W * 0.5 - lineHalf, py - 46);
  ctx.lineTo(VIEW_W * 0.5 + lineHalf, py - 46);
  ctx.moveTo(VIEW_W * 0.5 - lineHalf, py + 46);
  ctx.lineTo(VIEW_W * 0.5 + lineHalf, py + 46);
  ctx.stroke();

  const typeU = smoothstep(0.45, 2.35, t);
  const chars = Math.floor(typeU * PROMPT_TEXT.length);
  const typed = PROMPT_TEXT.slice(0, chars);

  ctx.textBaseline = 'middle';
  ctx.font = '600 40px "PingFang SC", "Noto Sans SC", sans-serif';
  const tw = ctx.measureText(typed).width;

  const prefix = '测试考题';
  ctx.font = '700 22px "PingFang SC", sans-serif';
  const prefW = ctx.measureText(prefix).width;

  const gap = 22;
  const totalW = prefW + gap + tw;
  const startX = VIEW_W * 0.5 - totalW * 0.5;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(prefix, startX, py + 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 40px "PingFang SC", "Noto Sans SC", sans-serif';
  ctx.fillText(typed, startX + prefW + gap, py);

  if (Math.floor(t * 7) % 2 === 0 || chars < PROMPT_TEXT.length) {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(startX + prefW + gap + tw + 6, py - 21, 3.5, 42);
  }

  // Launch cue right before entering 1M
  if (t > 2.45) {
    const statusAlpha = smoothstep(2.45, 2.95, t);
    ctx.globalAlpha = fadeOut * statusAlpha;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2dd4bf';
    ctx.font = '600 23px "PingFang SC", "JetBrains Mono", sans-serif';
    ctx.fillText('正在初始化 100 万随机权重（误差 9.85）──▶ 开启七个数量级演进', VIEW_W * 0.5, py + 92);
  }

  ctx.restore();
}
