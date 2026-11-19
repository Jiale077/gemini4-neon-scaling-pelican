// src/beat/telemetry.js
// Deterministic live telemetry generator with clear, mobile-readable Chinese labels.

import {
  STAGES,
  INTRO_SEC,
  RIDE_END_SEC,
  INTRO_SUBTITLE,
  OUTRO_SUBTITLE,
  clamp,
  lerp,
  smoothstep,
  getStageAtTime,
} from './timeline.js';
import { noise1D } from '../kit/prng.js';

export function formatParams(logParams) {
  const n = Math.pow(10, logParams);
  if (n >= 1e12) return `${(n / 1e12).toFixed(n >= 9.95e12 ? 0 : n >= 1.95e12 ? 1 : 2)}T`;
  if (n >= 1e9) {
    const b = n / 1e9;
    return `${b >= 100 ? Math.round(b) : b >= 10 ? b.toFixed(0) : b.toFixed(1)}B`;
  }
  if (n >= 1e6) {
    const m = n / 1e6;
    return `${m >= 100 ? Math.round(m) : m >= 10 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  return `${Math.round(n / 1e3)}K`;
}

export function formatParamsZh(logParams) {
  const n = Math.pow(10, logParams);
  if (n >= 1e12) return `约 ${(n / 1e12).toFixed(n >= 5e12 ? 0 : 1)} 万亿参数`;
  if (n >= 1e8) return `约 ${(n / 1e8).toFixed(n >= 1e10 ? 0 : 1)} 亿参数`;
  return `约 ${(n / 1e4).toFixed(0)} 万参数`;
}

export function getTelemetry(t, sandbox = null) {
  if (sandbox?.enabled) {
    const lp = sandbox.logParams; // [6.0 .. 12.6]
    const norm = clamp((lp - 6.0) / 6.6, 0, 1);
    const loss = Math.max(
      0.009,
      9.8 * Math.pow(1 - norm * 0.93, 3.6) + (sandbox.temperature > 1.2 ? (sandbox.temperature - 1.2) * 1.4 : 0)
    );
    const ikErr = sandbox.invertKnee
      ? 29.4
      : sandbox.lockWheels
        ? 61.8
        : lp < 7.2
          ? Infinity
          : lp < 9.0
            ? lerp(150, 72, clamp((lp - 7.2) / 1.8, 0, 1))
            : lp < 10.6
              ? lerp(64, 18, clamp((lp - 9.0) / 1.6, 0, 1))
              : 0.0;
    const score = clamp(
      100 * Math.pow(norm, 0.70) -
        (sandbox.invertKnee ? 18 : 0) -
        (sandbox.lockWheels ? 24 : 0) -
        Math.max(0, sandbox.temperature - 1.1) * 22,
      0.5,
      99.8
    );

    const is3DSandbox =
      !sandbox.blueprint && lp >= 12.25 && !sandbox.invertKnee && !sandbox.lockWheels && sandbox.temperature <= 1.3;
    let sandboxHint = '拖动右侧滑块，观察模型从噪点到 2D 满血再升维 3D 的全过程。';
    if (is3DSandbox) {
      sandboxHint = '3D 实景模式：鼠标拖拽可 360° 环绕观察，把参数往回拖可丝滑退回 2D！';
    } else if (sandbox.temperature > 1.45) {
      sandboxHint = '采样温度过高（T > 1.4）：生成发散失真，姿势与零件开始抽风！';
    } else if (sandbox.blueprint) {
      sandboxHint = '深度思考蓝图：实时推演双骨骼逆运动学、受力矢量与风阻流线。';
    } else if (sandbox.invertKnee) {
      sandboxHint = '已注入 32B 经典翻车 Bug：膝盖往反方向折弯。';
    } else if (sandbox.lockWheels) {
      sandboxHint = '已注入 7B 贴纸 Bug：车轮与踏板锁死，整车平移硬滑。';
    }

    return {
      stageNo: is3DSandbox ? '3D LAB' : 'LAB',
      paramStr: is3DSandbox ? '10T · 3D' : formatParams(lp),
      paramZh: `${formatParamsZh(lp)} · 温度 ${sandbox.temperature.toFixed(2)}`,
      logParams: lp,
      stageZh: is3DSandbox ? '实景涌现' : sandbox.blueprint ? '思维链蓝图' : '自由调参实验',
      stageSub: is3DSandbox ? '鼠标拖拽 360° 环绕 · 滚轮缩放' : sandbox.blueprint ? 'Test-Time Reasoning 透视' : '实时体验 Scaling Law',
      narration: sandboxHint,
      accent: is3DSandbox ? '#fbbf24' : sandbox.blueprint ? '#38bdf8' : '#2dd4bf',
      loss,
      lossStr: loss.toFixed(loss < 0.1 ? 3 : 2),
      paths: is3DSandbox ? 2048 : Math.round(lerp(14, 512, Math.pow(norm, 1.3))),
      ikErr,
      ikErrStr: !Number.isFinite(ikErr) ? '失控' : ikErr < 0.05 ? '0.00 px' : `${ikErr.toFixed(1)} px`,
      score,
      scoreStr: `${score.toFixed(1)}`,
      thinkingTokens: sandbox.blueprint ? 1420 : 0,
      isThinking: Boolean(sandbox.blueprint),
    };
  }

  if (t < INTRO_SEC) {
    const u = clamp(t / INTRO_SEC, 0, 1);
    return {
      stageNo: '00 / 08',
      paramStr: u < 0.5 ? 'INIT' : '1M',
      paramZh: '实验准备中',
      logParams: 6.0,
      stageZh: '权重初始化',
      stageSub: '正在启动尺度定律测试',
      narration: INTRO_SUBTITLE,
      accent: '#38bdf8',
      loss: 9.99,
      lossStr: u < 0.55 ? '--' : '9.99',
      paths: 0,
      ikErr: Infinity,
      ikErrStr: '--',
      score: 0,
      scoreStr: '0.0',
      thinkingTokens: 0,
      isThinking: false,
    };
  }

  if (t >= RIDE_END_SEC) {
    return {
      stageNo: '终章',
      paramStr: '1M → 3D',
      paramZh: '七个数量级跃迁',
      logParams: 12.6,
      stageZh: '评测结案',
      stageSub: '跨维度智能涌现已确认',
      narration: OUTRO_SUBTITLE,
      accent: '#fbbf24',
      loss: 0.009,
      lossStr: '0.009',
      paths: 2048,
      ikErr: 0,
      ikErrStr: '0.00 px',
      score: 99.8,
      scoreStr: '99.8',
      thinkingTokens: 2048,
      isThinking: false,
    };
  }

  const { stage, localT } = getStageAtTime(t);
  const jitter = noise1D(t * 7.5, 505);

  const lossRaw = lerp(stage.lossStart, stage.lossEnd, localT);
  const lossNoise =
    stage.index === 0 ? jitter * 0.45 : stage.index === 1 ? jitter * 0.16 : stage.index <= 3 ? jitter * 0.03 : jitter * 0.002;
  const loss = Math.max(0.008, lossRaw + lossNoise);

  const score = clamp(lerp(stage.scoreStart, stage.scoreEnd, localT) + jitter * (stage.index < 3 ? 0.8 : 0.12), 0.1, 99.8);

  let ikErr = 0;
  let ikErrStr = '0.00 px';
  if (stage.index === 0) {
    ikErr = Infinity;
    ikErrStr = '失控';
  } else if (stage.index === 1) {
    ikErr = 148 + jitter * 22;
    ikErrStr = `${ikErr.toFixed(0)} px`;
  } else if (stage.index === 2) {
    ikErr = 62.4 + Math.sin(t * 6) * 4.2;
    ikErrStr = `${ikErr.toFixed(0)} px`;
  } else if (stage.index === 3) {
    ikErr = 28.6 + Math.abs(Math.sin(t * 5.2)) * 9.5;
    ikErrStr = `${ikErr.toFixed(0)} px`;
  } else {
    ikErr = 0.0;
    ikErrStr = '0.00 px';
  }

  const paths = Math.round(stage.paths + (stage.index === 0 ? Math.abs(jitter) * 9 : 0));
  const isThinking = stage.id === 's6a_1t_think';
  const thinkingTokens = isThinking ? Math.round(lerp(64, 2048, smoothstep(0, 1, localT))) : stage.index >= 6 ? 2048 : 0;

  return {
    stageNo: `${String(stage.index + 1).padStart(2, '0')} / ${String(STAGES.length).padStart(2, '0')}`,
    paramStr: stage.paramLabel,
    paramZh: stage.paramZh,
    logParams: stage.logParams,
    stageZh: stage.zh,
    stageSub: stage.subtitle,
    narration: stage.narration,
    accent: stage.accent,
    loss,
    lossStr: loss.toFixed(loss < 0.1 ? 3 : 2),
    paths,
    ikErr,
    ikErrStr,
    score,
    scoreStr: score.toFixed(1),
    thinkingTokens,
    isThinking,
  };
}
