// src/kit/hud.js
// Broadcast & Mobile-Video-Ready Borderless Editorial HUD:
// Generous typography scaled specifically so a 1920x1080 16:9 horizontal video
// remains effortlessly legible even on a smartphone screen!

import { VIEW_W, VIEW_H, STAGES, INTRO_SEC, RIDE_END_SEC, WORLD_TOTAL_X, clamp, smoothstep } from '../beat/timeline.js';
import { roadBaseY } from '../beat/curve.js';

export function renderHUD(ctx, {
  t,
  worldX,
  telemetry,
  cam,
  sandbox = null,
  showSubtitles = true,
  hideHUD = false,
}) {
  if (hideHUD) return;

  const topFade = sandbox?.enabled
    ? 1
    : smoothstep(INTRO_SEC - 0.6, INTRO_SEC + 0.4, t) * (1 - smoothstep(RIDE_END_SEC, RIDE_END_SEC + 1.2, t));

  ctx.save();

  /* -------------------------------------------------------------------------
   * 1. SOFT CINEMA EDGE VIGNETTES (borderless, zero boxy dashboard cards)
   * ------------------------------------------------------------------------- */
  if (topFade > 0.01) {
    ctx.save();
    ctx.globalAlpha = topFade;
    const topGrad = ctx.createLinearGradient(0, 0, 0, 235);
    topGrad.addColorStop(0, 'rgba(5, 8, 15, 0.74)');
    topGrad.addColorStop(0.68, 'rgba(5, 8, 15, 0.25)');
    topGrad.addColorStop(1, 'rgba(5, 8, 15, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, VIEW_W, 235);
    ctx.restore();
  }

  const botGrad = ctx.createLinearGradient(0, VIEW_H - 255, 0, VIEW_H);
  botGrad.addColorStop(0, 'rgba(5, 8, 15, 0)');
  botGrad.addColorStop(0.42, 'rgba(5, 8, 15, 0.44)');
  botGrad.addColorStop(1, 'rgba(5, 8, 15, 0.86)');
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, VIEW_H - 255, VIEW_W, 255);

  /* -------------------------------------------------------------------------
   * 2. TOP-LEFT: Broadcast-Sized Borderless Cinema Title Stamp
   * ------------------------------------------------------------------------- */
  if (topFade > 0.01) {
    ctx.save();
    ctx.globalAlpha = topFade;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
    ctx.shadowBlur = 12;

    const lx = 56;
    const ly = 54;

    // Eyebrow: "07 / 08 · 1 万亿 · 2D 满血"
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.88)';
    ctx.font = '600 22px "JetBrains Mono", "PingFang SC", monospace';
    ctx.fillText(`${telemetry.stageNo}  ·  ${telemetry.paramZh}`, lx, ly);

    // Big hero parameter + stage name
    ctx.fillStyle = telemetry.accent;
    ctx.font = '700 58px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillText(telemetry.paramStr, lx, ly + 66);
    const paramW = ctx.measureText(telemetry.paramStr).width;

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 44px "PingFang SC", "Noto Sans SC", system-ui, sans-serif';
    ctx.fillText(telemetry.stageZh, lx + paramW + 22, ly + 63);

    // Delicate editorial hairline rule
    ctx.shadowBlur = 0;
    ctx.strokeStyle = telemetry.accent;
    ctx.globalAlpha = topFade * 0.88;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(lx, ly + 84);
    ctx.lineTo(lx + 150, ly + 84);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(lx + 150, ly + 84);
    ctx.lineTo(lx + 470, ly + 84);
    ctx.stroke();

    // Subtitle / thinking status (22px!)
    ctx.globalAlpha = topFade;
    ctx.shadowBlur = 10;
    ctx.fillStyle = telemetry.isThinking ? '#7dd3fc' : 'rgba(241, 245, 249, 0.88)';
    ctx.font = '500 22px "PingFang SC", "Noto Sans SC", sans-serif';
    const subLine = telemetry.isThinking
      ? `● 深度思考中 · 已推演 ${telemetry.thinkingTokens} tokens`
      : telemetry.stageSub;
    ctx.fillText(subLine, lx, ly + 118);

    ctx.restore();

    /* -----------------------------------------------------------------------
     * 3. TOP-RIGHT: Broadcast-Sized Borderless Swiss Viewfinder Telemetry
     * ----------------------------------------------------------------------- */
    ctx.save();
    ctx.globalAlpha = topFade;

    const rightEdge = VIEW_W - 56;
    const topY = 54;
    const ikGood = Number.isFinite(telemetry.ikErr) && telemetry.ikErr < 0.05;

    const cols = [
      {
        label: '误差 Loss',
        val: telemetry.lossStr,
        color: telemetry.loss > 1.2 ? '#fda4af' : telemetry.loss > 0.35 ? '#fde047' : '#86efac',
        w: 178,
      },
      {
        label: '矢量路径',
        val: String(telemetry.paths),
        color: '#ffffff',
        w: 140,
      },
      {
        label: '关节误差',
        val: telemetry.ikErrStr,
        color: ikGood ? '#86efac' : '#fda4af',
        w: 198,
      },
      {
        label: '评测总分',
        val: telemetry.scoreStr,
        color: telemetry.score >= 85 ? '#86efac' : telemetry.score >= 45 ? '#7dd3fc' : '#fdba74',
        w: 146,
      },
    ];

    const totalW = cols.reduce((acc, c) => acc + c.w, 0);
    const startX = rightEdge - totalW;

    ctx.strokeStyle = 'rgba(226, 232, 240, 0.36)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rightEdge - 22, topY - 22);
    ctx.lineTo(rightEdge + 12, topY - 22);
    ctx.lineTo(rightEdge + 12, topY + 6);
    ctx.moveTo(startX, topY + 84);
    ctx.lineTo(rightEdge, topY + 84);
    ctx.stroke();

    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 10;

    let cursorX = startX;
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      const alignX = cursorX + c.w;

      if (i > 0) {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.18)';
        ctx.beginPath();
        ctx.moveTo(cursorX + 10, topY - 14);
        ctx.lineTo(cursorX + 10, topY + 68);
        ctx.stroke();
        ctx.shadowBlur = 10;
      }

      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(203, 213, 225, 0.90)';
      ctx.font = '600 20px "PingFang SC", "JetBrains Mono", sans-serif';
      ctx.fillText(c.label, alignX, topY);

      ctx.fillStyle = c.color;
      ctx.font = '700 38px "JetBrains Mono", "PingFang SC", monospace';
      ctx.fillText(c.val, alignX, topY + 60);

      cursorX += c.w;
    }

    ctx.shadowBlur = 0;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.78)';
    ctx.font = '500 17px "PingFang SC", sans-serif';
    ctx.fillText('Loss 越低越精准 · 关节误差 0 代表脚掌锁死踏板', rightEdge, topY + 114);

    ctx.restore();
  }

  /* -------------------------------------------------------------------------
   * 4. BROADCAST-SIZED DOCUMENTARY CHINESE SUBTITLES (36px — mobile clear!)
   * ------------------------------------------------------------------------- */
  if (showSubtitles && telemetry.narration) {
    let subAlpha = 1;
    if (!sandbox?.enabled) {
      if (t < INTRO_SEC) {
        subAlpha = smoothstep(0.4, 1.0, t) * (1 - smoothstep(INTRO_SEC - 0.5, INTRO_SEC, t));
      } else if (t >= RIDE_END_SEC) {
        subAlpha = smoothstep(RIDE_END_SEC + 1.0, RIDE_END_SEC + 2.0, t);
      }
    }

    if (subAlpha > 0.02) {
      ctx.save();
      ctx.globalAlpha = subAlpha;
      const isSandbox = Boolean(sandbox?.enabled);
      const subY = isSandbox ? VIEW_H - 64 : t >= RIDE_END_SEC ? VIEW_H - 28 : VIEW_H - 142;
      const subX = isSandbox ? 56 : VIEW_W * 0.5;

      ctx.textAlign = isSandbox ? 'left' : 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 36px "PingFang SC", "Noto Sans SC", system-ui, sans-serif';

      ctx.shadowColor = 'rgba(0, 0, 0, 0.94)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 3;
      ctx.lineWidth = 6.5;
      ctx.strokeStyle = 'rgba(5, 8, 15, 0.85)';
      ctx.strokeText(telemetry.narration, subX, subY);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(telemetry.narration, subX, subY);
      ctx.restore();
    }
  }

  /* -------------------------------------------------------------------------
   * 5. BOTTOM SCALING LAW CURVE NAVIGATOR (Wide 1220px, thick curve, 22px labels!)
   * ------------------------------------------------------------------------- */
  if (!sandbox?.enabled && topFade > 0.01) {
    ctx.save();
    ctx.globalAlpha = topFade;

    const bw = 1220;
    const bx = (VIEW_W - bw) * 0.5;
    const baseY = VIEW_H - 96;
    const padX = 28;
    const innerW = bw - padX * 2;
    const mapX = (wx) => bx + padX + clamp(wx / WORLD_TOTAL_X, 0, 1) * innerW;
    const mapY = (wy) => baseY + clamp((wy - 240) / 620, 0, 1) * 40;

    // Baseline
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(bx + padX, baseY + 46);
    ctx.lineTo(bx + bw - padX, baseY + 46);
    ctx.stroke();

    // Full reference curve
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.48)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 72; i++) {
      const wx = (i / 72) * WORLD_TOTAL_X;
      const px = mapX(wx);
      const py = mapY(roadBaseY(wx));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Active completed curve highlight
    ctx.strokeStyle = telemetry.accent;
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    const maxI = Math.floor(clamp(worldX / WORLD_TOTAL_X, 0, 1) * 72);
    for (let i = 0; i <= maxI; i++) {
      const wx = (i / 72) * WORLD_TOTAL_X;
      const px = mapX(wx);
      const py = mapY(roadBaseY(wx));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Bold 22px stage labels along bottom curve!
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'center';
    for (const s of STAGES) {
      const midX = mapX((s.worldStart + s.worldEnd) * 0.5);
      const active = worldX >= s.worldStart && worldX < s.worldEnd;
      ctx.font = active
        ? '700 22px "JetBrains Mono", "PingFang SC", monospace'
        : '600 20px "JetBrains Mono", "PingFang SC", monospace';
      ctx.fillStyle = active ? '#ffffff' : 'rgba(226, 232, 240, 0.72)';
      ctx.fillText(s.shortLabel || s.paramLabel, midX, baseY + 76);
    }

    // Clear 20px axis hints flanking the mini-curve
    ctx.font = '600 20px "PingFang SC", sans-serif';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.82)';
    ctx.textAlign = 'right';
    ctx.fillText('误差曲线', bx + padX - 20, baseY + 26);
    ctx.textAlign = 'left';
    ctx.fillText('参数量增大 →', bx + bw - padX + 20, baseY + 50);

    // Big crisp glowing playhead dot
    const curX = mapX(worldX);
    const curY = mapY(roadBaseY(worldX));
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = telemetry.accent;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(curX, curY, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}
