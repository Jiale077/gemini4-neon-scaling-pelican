// src/beat/timeline.js
// Unified 120 BPM musical clock and 8-stage Scaling Law timeline (exact 100.0s = 1:40).
// Intro (4s) + 1M (10s) + 100M (10s) + 7B (10s) + 32B (10s) + 70B (12s)
// + 1T·CoT (8s) + 1T 满血2D (10s) + 10T·3D 升维世界 (16s) + Outro (10s).

export const BPM = 120;
export const BEAT_SEC = 60 / BPM; // 0.5s per beat
export const BAR_BEATS = 4;
export const BAR_SEC = BEAT_SEC * BAR_BEATS; // 2.0s per bar

export const INTRO_SEC = 4.0; // 2 bars
export const OUTRO_SEC = 10.0; // 5 bars

export const VIEW_W = 1920;
export const VIEW_H = 1080;

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : clamp((v - a) / (b - a), 0, 1));
export const smoothstep = (e0, e1, x) => {
  const t = invLerp(e0, e1, x);
  return t * t * (3 - 2 * t);
};
export const smootherstep = (e0, e1, x) => {
  const t = invLerp(e0, e1, x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

export const INTRO_SUBTITLE = '考题：用纯代码画鹈鹕骑车——现在把参数从 100 万放大到 3D 世界模型。';
export const OUTRO_SUBTITLE = '从满屏噪点到 3D 写实世界，全程零外部素材，跨越七个数量级。';

/**
 * 8 continuous stage segments spanning t = 4.0s -> 90.0s (86.0s ride).
 * First completes the full 2D 1T Golden-Hour emergence (64s -> 74s),
 * THEN silky-smoothly ascends into the 16-second 3D PBR world (74s -> 90s)!
 */
export const STAGES = [
  {
    index: 0,
    id: 's1_1m',
    paramLabel: '1M',
    shortLabel: '1M',
    paramZh: '100 万参数',
    logParams: 6.0,
    zh: '随机初始化',
    en: 'Random Init',
    subtitle: '高斯噪点与失控贝塞尔曲线',
    narration: '100 万参数：刚出生的随机大脑，连圆和鸟都不认识，满屏乱飞的曲线。',
    phenomenon: '画面只有无序噪点、未闭合的贝塞尔控制柄和闪烁的 NaN 报错框，完全无法成形。',
    aiPrinciple: '对应模型未收敛状态（Loss ≈ 9.8）：参数容量极小，只能输出接近随机分布的词元与坐标。',
    start: 4.0,
    end: 14.0,
    worldStart: 0,
    worldEnd: 1800,
    accent: '#ff5c77',
    lossStart: 9.85,
    lossEnd: 6.90,
    scoreStart: 0.4,
    scoreEnd: 4.2,
    paths: 14,
  },
  {
    index: 1,
    id: 's2_100m',
    paramLabel: '100M',
    shortLabel: '100M',
    paramZh: '1 亿参数',
    logParams: 8.0,
    zh: '抽象派翻车',
    en: 'Abstract SVG',
    subtitle: '车轮画扁 · 橙色三角鸟悬空 100px',
    narration: '1 亿参数：隐约有了车和鸟的概念，但毫无空间感，鹈鹕悬空在车座上方。',
    phenomenon: '两个大小不一的歪椭圆充当车轮，车架没接上，鹈鹕简化成一坨浮在半空的橙色三角形。',
    aiPrinciple: '对应早期小模型画 SVG 经典翻车：记住局部词汇特征，却缺乏全局二维坐标系的空间绑定能力。',
    start: 14.0,
    end: 24.0,
    worldStart: 1800,
    worldEnd: 3600,
    accent: '#f97316',
    lossStart: 4.35,
    lossEnd: 3.12,
    scoreStart: 12.8,
    scoreEnd: 24.5,
    paths: 27,
  },
  {
    index: 2,
    id: 's3_7b',
    paramLabel: '7B',
    shortLabel: '7B',
    paramZh: '70 亿参数',
    logParams: 9.85,
    zh: '静态贴纸期',
    en: 'Static Sticker',
    subtitle: '构图清晰 · 但车轮锁死硬滑',
    narration: '70 亿参数：静态构图过关！但不懂物理，轮子完全锁死像贴纸一样硬滑。',
    phenomenon: '终于能一眼认出鹈鹕和自行车，但轮子纹丝不动、双脚僵直悬空，整车像 PNG 贴图平移滑行。',
    aiPrinciple: '对应中等参数模型的「静态记忆瓶颈」：学会了常见视觉模板，却尚未掌握运动学与时间维度联动。',
    start: 24.0,
    end: 34.0,
    worldStart: 3600,
    worldEnd: 5400,
    accent: '#38bdf8',
    lossStart: 1.62,
    lossEnd: 1.38,
    scoreStart: 46.0,
    scoreEnd: 52.4,
    paths: 64,
  },
  {
    index: 3,
    id: 's4_32b',
    paramLabel: '32B',
    shortLabel: '32B',
    paramZh: '320 亿参数',
    logParams: 10.5,
    zh: '半残运动学',
    en: 'Broken Kinematics',
    subtitle: '膝盖往反方向弯 · 链条错拍打滑',
    narration: '320 亿参数：终于动起来了！却暴露经典数学翻车——膝盖往反方向折弯。',
    phenomenon: '车轮开始转动、双腿也在蹬车，但膝关节反向折弯（bendSign=+1），链条下垂且转速脱节。',
    aiPrinciple: '对应大模型写几何/物理代码最常见的「符号与约束错误」：能写出动画循环，却算错三角函数正负号。',
    start: 34.0,
    end: 44.0,
    worldStart: 5400,
    worldEnd: 7200,
    accent: '#eab308',
    lossStart: 0.92,
    lossEnd: 0.68,
    scoreStart: 66.5,
    scoreEnd: 73.1,
    paths: 118,
  },
  {
    index: 4,
    id: 's5_70b',
    paramLabel: '70B',
    shortLabel: '70B',
    paramZh: '700 亿参数',
    logParams: 10.85,
    zh: '物理自洽',
    en: 'Physical Consistency',
    subtitle: '双骨骼逆运动学对齐 · 误差归零',
    narration: '700 亿参数：智能相变！膝盖回正、脚掌锁死踏板，世界有了真实景深。',
    phenomenon: '越过闸门瞬间膝盖回正、脚掌紧贴踏板（关节误差 0.00px）、链条精准咬合，远景山峦与阴影浮现。',
    aiPrinciple: '对应 Scaling Law 的「能力涌现拐点」：跨过参数阈值后，空间几何、联动约束与画面构图一次性自洽。',
    start: 44.0,
    end: 56.0,
    worldStart: 7200,
    worldEnd: 9400,
    accent: '#2dd4bf',
    lossStart: 0.34,
    lossEnd: 0.19,
    scoreStart: 87.6,
    scoreEnd: 92.4,
    paths: 214,
  },
  {
    index: 5,
    id: 's6a_1t_think',
    paramLabel: '1T · CoT',
    shortLabel: '1T·CoT',
    paramZh: '1 万亿 · 深度思考',
    logParams: 11.7,
    zh: '思维链蓝图',
    en: 'Test-Time Reasoning',
    subtitle: '0.25× 慢放演算风阻、齿比与单摆',
    narration: '1 万亿 + 深度思考：下笔前放慢时间，在脑中先推演受力、风阻与齿比……',
    phenomenon: '时间放慢至四分之一速，切换 CAD 透视蓝图，实时标注骨骼夹角、风阻流线、脚踏推力与内部思考流。',
    aiPrinciple: '对应推理模型（Test-Time Compute / CoT）：用额外思考算力做先验校验与物理推演，再输出终稿。',
    start: 56.0,
    end: 64.0,
    worldStart: 9400,
    worldEnd: 10000,
    accent: '#38bdf8',
    lossStart: 0.09,
    lossEnd: 0.045,
    scoreStart: 94.6,
    scoreEnd: 96.8,
    paths: 386,
  },
  {
    index: 6,
    id: 's6b_1t_emerge',
    paramLabel: '1T',
    shortLabel: '1T',
    paramZh: '1 万亿 · 2D 满血',
    logParams: 12.0,
    zh: '2D 满血涌现',
    en: '2D Full Emergence',
    subtitle: '羽毛抖动 · 前叉减震 · 喉囊小鱼',
    narration: '1 万亿落笔：黄昏逆光、羽毛抖动、前叉减震，连喉囊里都透出一尾小鱼！',
    phenomenon: '先在 2D 黄金时刻疾驰 10 秒：车灯锥光、地面倒影、迎风羽毛与喉囊小鱼全开，达到平面矢量巅峰。',
    aiPrinciple: '对应万亿模型的 2D 极致美学涌现：不仅几何零误差，还自发补全次级物理、逆光氛围与趣味细节。',
    start: 64.0,
    end: 74.0,
    worldStart: 10000,
    worldEnd: 12200,
    accent: '#f59e0b',
    lossStart: 0.032,
    lossEnd: 0.020,
    scoreStart: 97.6,
    scoreEnd: 98.9,
    paths: 512,
  },
  {
    index: 7,
    id: 's7_3d_world',
    paramLabel: '10T · 3D',
    shortLabel: '10T · 3D',
    paramZh: '终极升维 · 世界模型',
    logParams: 12.6,
    zh: '实景涌现',
    en: '3D World Model',
    subtitle: '突破二维平面 · 海岸至黄金都市一镜到底',
    narration: '参数继续攀升：彻底突破二维平面，直接涌现出光影与海浪交织的 3D 实景世界！',
    phenomenon: '在 2D 满血骑行基础上丝滑升维：柔光跃迁切入 PBR 3D 写实世界，镜头从侧视环绕进入海岸与黄金都市。',
    aiPrinciple: '对应下一代世界模型（World Model）的跨维涌现：从平面矢量真正理解三维立体空间与物理光影。',
    start: 74.0,
    end: 90.0, // Full 16 seconds to savor the 3D beach -> boardwalk -> boulevard -> city!
    worldStart: 12200,
    worldEnd: 15600,
    accent: '#fbbf24',
    lossStart: 0.018,
    lossEnd: 0.009,
    scoreStart: 99.1,
    scoreEnd: 99.8,
    paths: 2048,
  },
];

export const RIDE_END_SEC = STAGES[STAGES.length - 1].end; // 90.0s
export const TOTAL_DURATION = RIDE_END_SEC + OUTRO_SEC; // 100.0s (1:40)
export const WORLD_TOTAL_X = STAGES[STAGES.length - 1].worldEnd; // 15600

export function getStageAtTime(t) {
  if (t < INTRO_SEC) {
    return {
      phase: 'intro',
      stage: STAGES[0],
      stageIndex: -1,
      localT: clamp(t / INTRO_SEC, 0, 1),
    };
  }
  if (t >= RIDE_END_SEC) {
    return {
      phase: 'outro',
      stage: STAGES[STAGES.length - 1],
      stageIndex: STAGES.length,
      localT: clamp((t - RIDE_END_SEC) / OUTRO_SEC, 0, 1),
    };
  }
  for (let i = 0; i < STAGES.length; i++) {
    const s = STAGES[i];
    if (t >= s.start && t < s.end) {
      return {
        phase: 'ride',
        stage: s,
        stageIndex: i,
        localT: (t - s.start) / (s.end - s.start),
      };
    }
  }
  const last = STAGES[STAGES.length - 1];
  return { phase: 'ride', stage: last, stageIndex: STAGES.length - 1, localT: 1 };
}

export function getWorldProgress(t) {
  if (t <= INTRO_SEC) {
    const u = smoothstep(INTRO_SEC - 1.5, INTRO_SEC, t);
    return { worldX: lerp(-260, 0, u), speedScale: u * 0.85, pedalPhase: u * Math.PI * 1.5 };
  }
  if (t >= RIDE_END_SEC) {
    const dt = t - RIDE_END_SEC;
    const coast = 220 * (1 - Math.exp(-dt * 0.85));
    return {
      worldX: WORLD_TOTAL_X + coast,
      speedScale: Math.exp(-dt * 1.1),
      pedalPhase: getPedalPhaseAt(RIDE_END_SEC) + coast * 0.015,
    };
  }

  const { stage, localT } = getStageAtTime(t);
  let worldX = lerp(stage.worldStart, stage.worldEnd, localT);
  let speedScale = (stage.worldEnd - stage.worldStart) / (stage.end - stage.start) / 180;

  if (stage.id === 's6a_1t_think') {
    const slowCurve = 0.25 * localT + 0.75 * (0.5 - 0.5 * Math.cos(Math.PI * localT));
    worldX = lerp(stage.worldStart, stage.worldEnd, slowCurve);
    speedScale = 0.28 + 0.14 * Math.sin(Math.PI * localT);
  } else if (stage.id === 's6b_1t_emerge' || stage.id === 's7_3d_world') {
    worldX = lerp(stage.worldStart, stage.worldEnd, localT);
    speedScale = 1.2;
  }

  return {
    worldX,
    speedScale,
    pedalPhase: getPedalPhaseAt(t),
  };
}

export function getPedalPhaseAt(t) {
  if (t <= INTRO_SEC) {
    return Math.max(0, t - 2.5) * Math.PI;
  }
  const tClamped = Math.min(t, RIDE_END_SEC);
  let phase = 1.5 * Math.PI;
  for (const s of STAGES) {
    if (tClamped <= s.start) break;
    const dt = Math.min(tClamped, s.end) - s.start;
    const rate =
      s.id === 's6a_1t_think'
        ? 0.28 * 2 * Math.PI
        : s.id === 's6b_1t_emerge' || s.id === 's7_3d_world'
          ? 1.18 * 2 * Math.PI
          : 1.0 * 2 * Math.PI;
    phase += dt * rate;
  }
  return phase;
}

export const CHECKPOINT_GATES = STAGES.slice(1).map((s, idx) => ({
  index: idx + 1,
  worldX: s.worldStart,
  time: s.start,
  fromStage: STAGES[idx],
  toStage: s,
  label: s.paramLabel,
  zh: s.zh,
  accent: s.accent,
}));
