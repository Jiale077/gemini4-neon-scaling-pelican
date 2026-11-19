// src/main.js
// Pure deterministic renderAt(ctx, t, sandbox, opts) controller + interactive cinema player:
// - 0:00 -> 1:14 : Intro -> 1M -> 100M -> 7B -> 32B -> 70B -> 1T CoT -> FULL 10s 1T 2D Golden Emergence!
// - 1:14 -> 1:30 : Soft-Feathered 3.2s Dimensional Portal -> Leisurely 16s 3D PBR Beach/Boardwalk/Boulevard Cruise!
// - 1:30 -> 1:40 : Warm Golden-Hour Dissolve into Panoramic 6-Node Scaling Law Outro!

import {
  VIEW_W,
  VIEW_H,
  BEAT_SEC,
  TOTAL_DURATION,
  RIDE_END_SEC,
  STAGES,
  WORLD_TOTAL_X,
  clamp,
  lerp,
  smoothstep,
  smootherstep,
  getWorldProgress,
} from './beat/timeline.js';
import { getCameraState } from './beat/curve.js';
import { getTelemetry } from './beat/telemetry.js';
import { renderScalingWorld } from './stages/stages.js';
import { renderIntroOverlay } from './stages/intro.js';
import { renderOutroOverlay } from './stages/outro.js';
import { renderHUD } from './kit/hud.js';
import { makePRNG } from './kit/prng.js';
import { AudioController } from './audio/engine.js';

// 2D Golden-Hour 1T rides for a full 10s (64s -> 74s), THEN smoothly ascends into 3D (74s -> 90s)!
const RIFT_START = 74.0;
const RIFT_END = 77.2; // Generous 3.2s soft-feathered silky dimensional portal!
const OUTRO_DISSOLVE_START = 88.6;
const OUTRO_DISSOLVE_END = 90.4;

/**
 * Applies a silky soft-feathered horizontal alpha wipe (`destination-out` gradient)
 * instead of a harsh razor-cut, so the 2D Golden-Hour world melts effortlessly into
 * the sunlit 3D PBR world underneath, accompanied by a bold 34px dimensional banner!
 */
function applySoftDimensionalPortal(ctx, riftProgress, time) {
  const feather = 320;
  const portalX = lerp(VIEW_W + feather, -feather, riftProgress);

  // 1. Soft-feathered alpha cutout revealing the live 3D PBR world smoothly from right -> left
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const maskGrad = ctx.createLinearGradient(portalX - feather * 0.55, 0, portalX + feather * 0.45, 0);
  maskGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  maskGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.55)');
  maskGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
  ctx.fillStyle = maskGrad;
  ctx.fillRect(Math.max(0, portalX - feather * 0.55), 0, VIEW_W - Math.max(0, portalX - feather * 0.55), VIEW_H);
  ctx.restore();

  // 2. Soft golden-amber sunlit shimmer along the feathered dimensional transition zone
  const strength = Math.sin(Math.PI * clamp(riftProgress, 0, 1));
  if (strength <= 0.02) return;

  ctx.save();
  ctx.globalAlpha = strength;

  const glowW = 140;
  const g = ctx.createLinearGradient(portalX - glowW, 0, portalX + glowW, 0);
  g.addColorStop(0, 'rgba(251, 191, 36, 0)');
  g.addColorStop(0.45, 'rgba(254, 243, 199, 0.52)');
  g.addColorStop(0.55, 'rgba(251, 191, 36, 0.40)');
  g.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(portalX - glowW, 0, glowW * 2, VIEW_H);

  // Subtle sunlit luminous dust motes drifting across the soft portal edge
  const rng = makePRNG(Math.floor(time * 24) * 31 + Math.round(portalX * 0.25));
  for (let i = 0; i < 28; i++) {
    const sy = 180 + rng() * (VIEW_H - 360);
    const sx = portalX + (rng() - 0.5) * 180;
    const r = 2 + rng() * 4.5;
    ctx.fillStyle = i % 2 === 0 ? '#fffbeb' : '#fde68a';
    ctx.globalAlpha = strength * (0.28 + rng() * 0.55);
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bold broadcast-readable 34px editorial dimensional leap badge!
  const labelAlpha = Math.sin(Math.PI * clamp(riftProgress, 0, 1));
  if (labelAlpha > 0.08) {
    ctx.globalAlpha = labelAlpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 18;

    const labelX = clamp(portalX, 420, VIEW_W - 420);
    const labelY = VIEW_H * 0.28;

    ctx.fillStyle = '#fef3c7';
    ctx.font = '700 34px "PingFang SC", "JetBrains Mono", sans-serif';
    ctx.fillText('维度跃迁 · 2D ──▶ 3D 实景世界', labelX, labelY);

    ctx.fillStyle = 'rgba(254, 243, 199, 0.85)';
    ctx.font = '500 20px "PingFang SC", sans-serif';
    ctx.fillText('突破二维平面，实时涌现三维光影、海浪与立体材质', labelX, labelY + 42);
  }

  ctx.restore();
}

export function renderAt(ctx, t, sandbox = null, opts = {}) {
  const safeT = clamp(t, 0, TOTAL_DURATION);
  const showSubtitles = opts.showSubtitles !== undefined ? opts.showSubtitles : true;
  const hideHUD = Boolean(opts.hideHUD);
  const world3DReady = Boolean(opts.world3DReady);

  let worldX;
  let pedalPhase;
  let speedScale;

  if (sandbox?.enabled) {
    const norm = clamp((sandbox.logParams - 6.0) / 6.6, 0, 1);
    const loopSpan = 600;
    const baseWX = norm * (WORLD_TOTAL_X - 1200) + 600;
    worldX = baseWX + ((sandbox.rideOffset || 0) % loopSpan) - loopSpan * 0.5;
    speedScale = sandbox.blueprint ? 0.35 : 1.0;
    pedalPhase = (sandbox.simTime || 0) * Math.PI * 2 * speedScale;
  } else {
    const prog = getWorldProgress(safeT);
    worldX = prog.worldX;
    pedalPhase = prog.pedalPhase;
    speedScale = prog.speedScale;
  }

  const cam = getCameraState(safeT, sandbox?.enabled ? { ...sandbox, worldX } : null);
  const telemetry = getTelemetry(safeT, sandbox);

  let mode3D = 'none';
  let riftProgress = 0;
  let outroDissolve = 0;

  if (world3DReady) {
    if (sandbox?.enabled) {
      const r = clamp(sandbox.rift3D || 0, 0, 1);
      if (r >= 0.995) {
        mode3D = 'full3d';
        riftProgress = 1;
      } else if (r > 0.005) {
        mode3D = 'rift';
        riftProgress = r;
      }
    } else if (safeT >= RIFT_START && safeT < OUTRO_DISSOLVE_END) {
      if (safeT < RIFT_END) {
        mode3D = 'rift';
        riftProgress = smootherstep(RIFT_START, RIFT_END, safeT);
      } else if (safeT < OUTRO_DISSOLVE_START) {
        mode3D = 'full3d';
        riftProgress = 1;
      } else {
        mode3D = 'dissolve_out';
        outroDissolve = smootherstep(OUTRO_DISSOLVE_START, OUTRO_DISSOLVE_END, safeT);
      }
    }
  }

  // 1. Render World Layer
  if (mode3D === 'full3d') {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  } else if (mode3D === 'rift') {
    // Keep the 2D Golden-Hour 1T pelican riding smoothly forward at full speed while melting into 3D!
    const riftSandbox = sandbox?.enabled
      ? { ...sandbox, logParams: Math.min(sandbox.logParams, 12.1), blueprint: false }
      : null;

    renderScalingWorld(ctx, {
      t: sandbox?.enabled ? (sandbox.simTime || 0) : safeT,
      worldX,
      pedalPhase,
      speedScale,
      cam,
      sandbox: riftSandbox,
      showPelican: true,
    });

    // Apply silky 320px soft-feathered alpha portal revealing live 3D PBR world underneath!
    applySoftDimensionalPortal(ctx, riftProgress, sandbox?.enabled ? (sandbox.simTime || 0) : safeT);
  } else if (mode3D === 'dissolve_out') {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.save();
    ctx.globalAlpha = outroDissolve;
    renderScalingWorld(ctx, {
      t: safeT,
      worldX,
      pedalPhase,
      speedScale,
      cam,
      sandbox: null,
      showPelican: true,
    });
    ctx.restore();

    const bloom = Math.sin(Math.PI * outroDissolve) * 0.25;
    if (bloom > 0.01) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 224, 160, ${bloom})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.restore();
    }
  } else {
    renderScalingWorld(ctx, {
      t: sandbox?.enabled ? (sandbox.simTime || 0) : safeT,
      worldX,
      pedalPhase,
      speedScale,
      cam,
      sandbox,
      showPelican: true,
    });
  }

  // 2. Broadcast-Sized Borderless HUD + 35px Subtitles
  renderHUD(ctx, {
    t: sandbox?.enabled ? (sandbox.simTime || 0) : safeT,
    worldX,
    telemetry,
    cam,
    sandbox,
    showSubtitles,
    hideHUD,
  });

  // 3. Intro & Outro Overlays
  if (!sandbox?.enabled) {
    renderIntroOverlay(ctx, safeT);
    renderOutroOverlay(ctx, safeT, cam);
  }
}

/* ============================================================================
 * INTERACTIVE PLAYER BOOTSTRAP
 * ============================================================================ */
function formatTime(sec) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const rem = Math.floor(s % 60);
  const tenth = Math.floor((s - Math.floor(s)) * 10);
  return `${m}:${String(rem).padStart(2, '0')}.${tenth}`;
}

const SANDBOX_PRESETS = {
  p_1m: { logParams: 6.0, temperature: 1.6, invertKnee: false, lockWheels: false, blueprint: false },
  p_100m: { logParams: 8.0, temperature: 1.1, invertKnee: false, lockWheels: false, blueprint: false },
  p_7b: { logParams: 9.8, temperature: 0.7, invertKnee: false, lockWheels: true, blueprint: false },
  p_32b: { logParams: 10.4, temperature: 0.8, invertKnee: true, lockWheels: false, blueprint: false },
  p_70b: { logParams: 11.0, temperature: 0.7, invertKnee: false, lockWheels: false, blueprint: false },
  p_cot: { logParams: 11.7, temperature: 0.5, invertKnee: false, lockWheels: false, blueprint: true },
  p_1t2d: { logParams: 12.0, temperature: 0.7, invertKnee: false, lockWheels: false, blueprint: false },
  p_3d: { logParams: 12.6, temperature: 0.7, invertKnee: false, lockWheels: false, blueprint: false },
};

export function bootPlayer() {
  const canvas = document.getElementById('stage');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;

  const world3DFrame = document.getElementById('world3d-frame');
  const audio = new AudioController();

  let currentTime = 0;
  let playing = false;
  let lastWallMs = 0;
  let showSubtitles = true;
  let hideHUD = false;

  const sandbox = {
    enabled: false,
    logParams: 11.0,
    temperature: 0.7,
    invertKnee: false,
    lockWheels: false,
    blueprint: false,
    simTime: 0,
    rideOffset: 0,
    rift3D: 0,
  };

  function getWorld3D() {
    try {
      const api = world3DFrame?.contentWindow?.__WORLD3D__;
      return api?.ready ? api : null;
    } catch (_) {
      return null;
    }
  }

  function wantSandbox3D() {
    return (
      sandbox.enabled &&
      !sandbox.blueprint &&
      sandbox.logParams >= 12.25 &&
      !sandbox.invertKnee &&
      !sandbox.lockWheels &&
      sandbox.temperature <= 1.3
    );
  }

  function syncWorld3D(t) {
    const api = getWorld3D();
    if (!api || !world3DFrame) return false;

    if (sandbox.enabled) {
      const active3D = wantSandbox3D() || sandbox.rift3D > 0.01;
      world3DFrame.classList.toggle('visible', active3D);
      const interactive = active3D && sandbox.rift3D > 0.92;
      world3DFrame.classList.toggle('interactive', interactive);
      canvas.classList.toggle('pass-through', interactive);

      api.setSync({
        active: active3D,
        externalClock: false,
        allowFreeOrbit: true,
        sideViewMix: 0,
        playing: active3D,
      });
      return true;
    }

    // Film Mode:
    // - Wake 3D silently at t=72.5s while 1T 2D is finishing its 10s golden-hour run
    // - Cruise leisurely & scenically from u=0.20 (golden beach -> boardwalk) to u=0.50 (coastal boulevard & skyline)
    //   over 16 full seconds (~13.5 m/s, 4x slower than before so EVERY PBR detail is clearly visible!)
    // - Hold matching right-facing side-profile through the soft portal (74.0->75.8), then smoothly glide into 3D orbit (75.8->81.0)!
    const in3DWindow = t >= 72.5 && t <= OUTRO_DISSOLVE_END + 0.1;
    const visible3D = t >= RIFT_START - 0.1 && t <= OUTRO_DISSOLVE_END;

    world3DFrame.classList.toggle('visible', visible3D);
    world3DFrame.classList.remove('interactive');
    canvas.classList.remove('pass-through');

    if (in3DWindow) {
      const p = clamp((t - RIFT_START) / (RIDE_END_SEC - RIFT_START), 0, 1.05);
      // Leisurely scenic speed: 0.20 -> 0.50 across 16s (~13.5 m/s, crystal-clear detail!)
      const u = lerp(0.20, 0.50, clamp(p, 0, 1));
      const sideViewMix = 1 - smootherstep(RIFT_START + 1.4, RIFT_START + 6.5, t);
      const wheelAngle = (u * 720) / 0.34;
      api.setSync({
        active: true,
        externalClock: true,
        allowFreeOrbit: false,
        u,
        wheelAngle,
        time: t,
        sideViewMix,
      });
    } else {
      api.setSync({ active: false });
    }
    return true;
  }

  const playBtn = document.getElementById('btn-play');
  const muteBtn = document.getElementById('btn-mute');
  const subBtn = document.getElementById('btn-sub');
  const cleanBtn = document.getElementById('btn-clean');
  const fsBtn = document.getElementById('btn-fs');
  const labBtn = document.getElementById('btn-lab');
  const scrub = document.getElementById('scrub');
  const timeLabel = document.getElementById('time-label');
  const stagePills = document.getElementById('stage-pills');
  const overlayPlay = document.getElementById('overlay-play');
  const labDrawer = document.getElementById('lab-drawer');
  const controlsBar = document.querySelector('.controls');

  const slParams = document.getElementById('sl-params');
  const slTemp = document.getElementById('sl-temp');
  const chkKnee = document.getElementById('chk-knee');
  const chkLock = document.getElementById('chk-lock');
  const chkBlue = document.getElementById('chk-blue');
  const valParams = document.getElementById('val-params');
  const valTemp = document.getElementById('val-temp');

  if (stagePills) {
    for (const s of STAGES) {
      const btn = document.createElement('button');
      btn.className = 'pill';
      btn.textContent = `${s.shortLabel || s.paramLabel} ${s.zh}`;
      btn.style.setProperty('--accent', s.accent);
      btn.title = `${s.paramZh} · ${s.subtitle}`;
      btn.addEventListener('click', () => {
        if (sandbox.enabled) toggleSandbox(false);
        seekTo(s.start + 0.05);
      });
      stagePills.appendChild(btn);
    }
  }

  function renderNow() {
    const world3DReady = syncWorld3D(currentTime);
    renderAt(ctx, currentTime, sandbox.enabled ? sandbox : null, {
      showSubtitles,
      hideHUD,
      world3DReady,
    });
  }

  function updateUI() {
    if (playBtn) playBtn.textContent = playing ? '暂停' : '播放';
    if (muteBtn) muteBtn.textContent = audio.muted ? '已静音' : '声音';
    if (subBtn) {
      subBtn.textContent = showSubtitles ? '字幕 开' : '字幕 关';
      subBtn.classList.toggle('active', showSubtitles);
    }
    if (cleanBtn) {
      cleanBtn.textContent = hideHUD ? '退出纯净' : '纯净画面';
      cleanBtn.classList.toggle('active', hideHUD);
    }
    if (scrub) scrub.value = String(currentTime);
    if (timeLabel) timeLabel.textContent = `${formatTime(currentTime)} / ${formatTime(TOTAL_DURATION)}`;
    if (overlayPlay) {
      overlayPlay.classList.toggle('hidden', playing || currentTime > 0.1 || sandbox.enabled);
    }
    if (stagePills) {
      const btns = stagePills.querySelectorAll('.pill');
      btns.forEach((b, i) => {
        const s = STAGES[i];
        const active = !sandbox.enabled && currentTime >= s.start && currentTime < s.end;
        b.classList.toggle('active', active);
      });
    }
  }

  function syncSandboxInputs() {
    if (slParams) slParams.value = String(sandbox.logParams);
    if (slTemp) slTemp.value = String(sandbox.temperature);
    if (chkKnee) chkKnee.checked = sandbox.invertKnee;
    if (chkLock) chkLock.checked = sandbox.lockWheels;
    if (chkBlue) chkBlue.checked = sandbox.blueprint;

    if (valParams) {
      const n = Math.pow(10, sandbox.logParams);
      valParams.textContent =
        n >= 1e12 ? `${(n / 1e12).toFixed(1)}T` : n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : `${(n / 1e6).toFixed(1)}M`;
    }
    if (valTemp) valTemp.textContent = sandbox.temperature.toFixed(2);
  }

  async function setPlaying(next) {
    if (sandbox.enabled && next) toggleSandbox(false);
    if (next) {
      if (currentTime >= TOTAL_DURATION - 0.05) currentTime = 0;
      playing = true;
      lastWallMs = performance.now();
      updateUI();
      try {
        await audio.playFrom(currentTime);
      } catch (e) {
        console.warn('Audio init deferred:', e);
      }
    } else {
      playing = false;
      audio.stop();
      updateUI();
    }
  }

  async function seekTo(t) {
    currentTime = clamp(t, 0, TOTAL_DURATION);
    renderNow();
    updateUI();
    if (playing) {
      await audio.playFrom(currentTime);
      lastWallMs = performance.now();
    }
  }

  function toggleSandbox(force) {
    const next = typeof force === 'boolean' ? force : !sandbox.enabled;
    sandbox.enabled = next;
    if (!next) sandbox.rift3D = 0;
    if (next && playing) {
      playing = false;
      audio.stop();
    }
    if (labDrawer) labDrawer.classList.toggle('open', next);
    if (labBtn) labBtn.classList.toggle('active', next);
    updateUI();
    renderNow();
  }

  function toggleClean() {
    hideHUD = !hideHUD;
    controlsBar?.classList.toggle('subtle', hideHUD);
    updateUI();
    renderNow();
  }

  playBtn?.addEventListener('click', () => setPlaying(!playing));
  overlayPlay?.addEventListener('click', () => setPlaying(true));
  canvas.addEventListener('click', () => {
    if (!sandbox.enabled) setPlaying(!playing);
  });

  muteBtn?.addEventListener('click', () => {
    audio.setMuted(!audio.muted);
    updateUI();
  });

  subBtn?.addEventListener('click', () => {
    showSubtitles = !showSubtitles;
    updateUI();
    renderNow();
  });

  cleanBtn?.addEventListener('click', () => toggleClean());

  fsBtn?.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  });

  labBtn?.addEventListener('click', () => toggleSandbox());

  scrub?.addEventListener('input', (e) => {
    if (sandbox.enabled) toggleSandbox(false);
    seekTo(Number(e.target.value));
  });

  slParams?.addEventListener('input', (e) => {
    sandbox.logParams = Number(e.target.value);
    syncSandboxInputs();
  });
  slTemp?.addEventListener('input', (e) => {
    sandbox.temperature = Number(e.target.value);
    syncSandboxInputs();
  });
  chkKnee?.addEventListener('change', (e) => {
    sandbox.invertKnee = e.target.checked;
  });
  chkLock?.addEventListener('change', (e) => {
    sandbox.lockWheels = e.target.checked;
  });
  chkBlue?.addEventListener('change', (e) => {
    sandbox.blueprint = e.target.checked;
  });

  document.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = SANDBOX_PRESETS[btn.dataset.preset];
      if (!p) return;
      Object.assign(sandbox, p);
      if (!sandbox.enabled) toggleSandbox(true);
      syncSandboxInputs();
      renderNow();
    });
  });

  syncSandboxInputs();

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      setPlaying(!playing);
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      seekTo(currentTime + (e.shiftKey ? 2.0 : BEAT_SEC));
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      seekTo(currentTime - (e.shiftKey ? 2.0 : BEAT_SEC));
    } else if (e.key === 'm' || e.key === 'M') {
      audio.setMuted(!audio.muted);
      updateUI();
    } else if (e.key === 'c' || e.key === 'C') {
      showSubtitles = !showSubtitles;
      updateUI();
      renderNow();
    } else if (e.key === 'h' || e.key === 'H') {
      toggleClean();
    } else if (e.key === 'f' || e.key === 'F') {
      fsBtn?.click();
    } else if (e.key === 'l' || e.key === 'L') {
      toggleSandbox();
    }
  });

  world3DFrame?.addEventListener('load', () => {
    setTimeout(() => renderNow(), 250);
    setTimeout(() => renderNow(), 900);
  });

  window.__SCALING_PELICAN__ = {
    renderAt: (t, sb = null, opts = {}) => {
      playing = false;
      audio.stop();
      currentTime = clamp(t, 0, TOTAL_DURATION);
      const world3DReady = syncWorld3D(currentTime);
      renderAt(ctx, currentTime, sb, { showSubtitles, hideHUD, world3DReady, ...opts });
      updateUI();
    },
    setSandbox: (opts) => {
      Object.assign(sandbox, opts);
      syncSandboxInputs();
      renderNow();
    },
    TOTAL_DURATION,
    STAGES,
  };

  const params = new URLSearchParams(window.location.search);
  if (params.has('t')) {
    currentTime = clamp(Number(params.get('t')) || 0, 0, TOTAL_DURATION);
  }
  if (params.get('lab') === '1') toggleSandbox(true);
  if (params.get('sub') === '0') showSubtitles = false;
  if (params.get('clean') === '1') hideHUD = true;

  let prevFrame = performance.now();
  let last3DReady = false;
  function tick(now) {
    const dt = Math.min(0.1, (now - prevFrame) / 1000);
    prevFrame = now;

    const readyNow = Boolean(getWorld3D());
    if (readyNow !== last3DReady) {
      last3DReady = readyNow;
      renderNow();
    }

    if (sandbox.enabled) {
      sandbox.simTime += dt;
      sandbox.rideOffset += dt * (sandbox.blueprint ? 60 : 175);
      const targetRift = wantSandbox3D() ? 1 : 0;
      const step = dt * 0.95; // Silky ~1.0s dimensional portal in Sandbox too
      if (sandbox.rift3D < targetRift) sandbox.rift3D = Math.min(targetRift, sandbox.rift3D + step);
      else if (sandbox.rift3D > targetRift) sandbox.rift3D = Math.max(targetRift, sandbox.rift3D - step);
      renderNow();
    } else if (playing) {
      const elapsed = (now - lastWallMs) / 1000;
      lastWallMs = now;
      currentTime += elapsed;
      if (currentTime >= TOTAL_DURATION) {
        currentTime = TOTAL_DURATION;
        playing = false;
        audio.stop();
      }
      renderNow();
      updateUI();
    }

    requestAnimationFrame(tick);
  }

  renderNow();
  updateUI();
  requestAnimationFrame(tick);
}

if (document.getElementById('stage') && !window.__DISABLE_AUTO_BOOT__) {
  bootPlayer();
}
