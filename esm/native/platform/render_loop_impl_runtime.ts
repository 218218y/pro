import { getBrowserTimers, recordPerfMetric } from '../runtime/api.js';
import {
  getAnimateFn,
  getCamera,
  getControls,
  getDoorsArray,
  getRenderer,
  getRoomGroup,
  getScene,
  getWardrobeGroup,
  getRenderSlot,
  readAutoHideFloorCache,
  setLastFrameTs,
  setLoopRaf,
  setRafScheduledAt,
  setRenderSlot,
  writeAutoHideFloorCache,
} from '../runtime/render_access.js';
import { readRuntimeScalarOrDefaultFromApp } from '../runtime/runtime_selectors.js';
import {
  type AppLike,
  type RenderLoopReportFn,
  asFrameRequestCallback,
  asRecord,
  asRecordOrNull,
  call0m,
  call2m,
  clearLoopSchedule,
  debugSketchLog,
  toAppContainer,
} from './render_loop_impl_support.js';
import { createRenderLoopFrontOverlayHelpers } from './render_loop_impl_front_overlay.js';
import { createRenderLoopMirrorDriver } from './render_loop_mirror_driver.js';
import { createRenderLoopMotionController } from './render_loop_motion.js';
import { createRenderLoopVisualEffects } from './render_loop_visual_effects.js';
const SLOW_FRAME_THRESHOLD_MS = 50;
const PERF_RENDER_FRAME_SAMPLE_REMAINING_SLOT = '__wpPerfRenderFrameSampleRemaining';

type FramePerfPhase = {
  name: string;
  startTime: number;
  endTime: number;
  durationMs: number;
};

export function createInstalledRenderAnimate(
  A: AppLike,
  report: RenderLoopReportFn
): (time?: number) => void {
  const __timers = getBrowserTimers(A);
  const __raf = __timers.requestAnimationFrame;
  const __now = __timers.now;
  const __perfApp = toAppContainer(A);
  const __framePerfEnabled = typeof __WP_BUILD_CLIENT__ === 'undefined' || __WP_BUILD_CLIENT__ !== true;
  const __frontOverlay = createRenderLoopFrontOverlayHelpers(A, {
    report,
    getRenderSlot,
    setRenderSlot,
  });
  const __visualEffects = createRenderLoopVisualEffects(toAppContainer(A), {
    report: (_app, op, err, opts) => report(op, err, opts),
    now: __now,
    asRecord,
    frontOverlayState: __frontOverlay.frontOverlayState,
    applyOpacityScale: (_app, node, alpha) => {
      void _app;
      __frontOverlay.applyOpacityScale(node, alpha);
    },
    collectFrontOverlayNodes: __frontOverlay.collectFrontOverlayNodes,
    isTaggedMirrorSurface: __frontOverlay.isTaggedMirrorSurface,
    tryHideMirrorSurface: __frontOverlay.tryHideMirrorSurface,
    getCamera,
    getControls,
    getRenderSlot,
    setRenderSlot,
    getRoomGroup,
    getScene,
    readAutoHideFloorCache,
    writeAutoHideFloorCache,
    getWardrobeGroup,
    getDoorsArray,
    readRuntimeScalarOrDefaultFromApp,
  });
  const __motion = createRenderLoopMotionController(toAppContainer(A), {
    report: (_app, op, err, opts) => report(op, err, opts),
    now: __now,
    debugLog: (...args: readonly unknown[]) => debugSketchLog(A, ...args),
  });
  const __mirrorDriver = createRenderLoopMirrorDriver(toAppContainer(A), {
    report: (_app, op, err, opts) => report(op, err, opts),
    now: __now,
    isTaggedMirrorSurface: __frontOverlay.isTaggedMirrorSurface,
    tryHideMirrorSurface: __frontOverlay.tryHideMirrorSurface,
    getRenderSlot,
    setRenderSlot,
  });

  function runMeasuredFramePhase<T>(phases: FramePerfPhase[], name: string, run: () => T): T {
    const startTime = __now();
    try {
      return run();
    } finally {
      const endTime = __now();
      phases.push({ name, startTime, endTime, durationMs: Math.max(0, endTime - startTime) });
    }
  }

  function readForcedFrameSampleRemaining(): number {
    if (!__framePerfEnabled) return 0;
    return Math.max(0, Math.floor(Number(getRenderSlot(A, PERF_RENDER_FRAME_SAMPLE_REMAINING_SLOT)) || 0));
  }

  function recordMeasuredFrame(frameStartMs: number, phases: FramePerfPhase[], forceCapture: boolean): void {
    if (!__framePerfEnabled) return;
    const frameEndMs = __now();
    const totalMs = Math.max(0, frameEndMs - frameStartMs);
    if (forceCapture) {
      setRenderSlot(
        A,
        PERF_RENDER_FRAME_SAMPLE_REMAINING_SLOT,
        Math.max(0, readForcedFrameSampleRemaining() - 1)
      );
    }
    if (totalMs < SLOW_FRAME_THRESHOLD_MS && !forceCapture) return;

    recordPerfMetric(__perfApp, 'render.frame.total', totalMs, 'ms', {
      detail: {
        startTime: frameStartMs,
        endTime: frameEndMs,
        thresholdMs: SLOW_FRAME_THRESHOLD_MS,
        phaseDurations: Object.fromEntries(phases.map(item => [item.name, item.durationMs])),
      },
    });
    for (const phase of phases) {
      recordPerfMetric(__perfApp, `render.frame.${phase.name}`, phase.durationMs, 'ms', {
        detail: {
          startTime: phase.startTime,
          endTime: phase.endTime,
          frameStartTime: frameStartMs,
          frameTotalMs: totalMs,
        },
      });
    }
  }

  function animate() {
    {
      const lifecycle = asRecord(A.lifecycle, {});
      if (lifecycle['tabHidden']) {
        clearLoopSchedule(A);
        return;
      }
    }

    const frameStartMs = __now();
    const framePerfPhases: FramePerfPhase[] = [];
    setLastFrameTs(A, frameStartMs);
    setRenderSlot(A, '__frameStartMs', frameStartMs);

    try {
      const motionFrame = __framePerfEnabled
        ? runMeasuredFramePhase(framePerfPhases, 'motion', () => __motion.stepFrame(frameStartMs))
        : __motion.stepFrame(frameStartMs);
      const forceFrameCapture = readForcedFrameSampleRemaining() > 0;
      if (!motionFrame.isActiveState && !forceFrameCapture) {
        recordMeasuredFrame(frameStartMs, framePerfPhases, false);
        clearLoopSchedule(A);
        return;
      }

      if (__framePerfEnabled) {
        runMeasuredFramePhase(framePerfPhases, 'visual-effects', () =>
          __visualEffects.updateFrontOverlaySeamsVisibility()
        );
      } else {
        __visualEffects.updateFrontOverlaySeamsVisibility();
      }

      let controlsStillMoving = false;
      {
        const c0 = getControls(A);
        const c = asRecordOrNull(c0);
        if (c && typeof c['update'] === 'function') {
          // OrbitControls.update() returns true while damping/input still changes the camera.
          // Treat that as a real animation; a plain render wakeup must remain one-shot.
          controlsStillMoving = __framePerfEnabled
            ? runMeasuredFramePhase(framePerfPhases, 'controls', () => call0m(c, c['update']) === true)
            : call0m(c, c['update']) === true;
        }
      }

      const cameraMoveActiveUntil = Number(getRenderSlot(A, '__wpCameraMoveRenderingUntilMs')) || 0;
      const cameraMoveRenderingActive = cameraMoveActiveUntil > frameStartMs;
      if (cameraMoveActiveUntil > 0 && !cameraMoveRenderingActive) {
        setRenderSlot(A, '__wpCameraMoveRenderingUntilMs', 0);
      }

      {
        const __n = (Number(getRenderSlot(A, '__wpAutoHideFloorTick')) || 0) + 1;
        setRenderSlot(A, '__wpAutoHideFloorTick', __n);
        const __floorUd0 = getRenderSlot(A, '__wpAutoHideFloorRef');
        const __floorUd =
          __floorUd0 && typeof __floorUd0 === 'object'
            ? asRecord(asRecord(__floorUd0)['userData'], {})
            : null;
        const __hiddenNow = !!(__floorUd && __floorUd['__wpAutoHideHidden']);
        if (__hiddenNow || (__n & 1) === 0) {
          if (__framePerfEnabled) {
            runMeasuredFramePhase(framePerfPhases, 'auto-hide-room-floor', () =>
              __visualEffects.autoHideRoomFloor()
            );
          } else {
            __visualEffects.autoHideRoomFloor();
          }
        }
      }

      {
        const __nowMotion = __now();
        if (__framePerfEnabled) {
          runMeasuredFramePhase(framePerfPhases, 'visual-effects', () =>
            __visualEffects.updateMirrorMotionState(__nowMotion, motionFrame.isAnimating)
          );
        } else {
          __visualEffects.updateMirrorMotionState(__nowMotion, motionFrame.isAnimating);
        }
      }

      {
        if (__framePerfEnabled) {
          runMeasuredFramePhase(framePerfPhases, 'mirror', () => __mirrorDriver.updateMirrorCube());
        } else {
          __mirrorDriver.updateMirrorCube();
        }
      }

      {
        const renderer0 = getRenderer(A);
        const scene0 = getScene(A);
        const camera0 = getCamera(A);
        const renderer = asRecordOrNull(renderer0);
        if (renderer && typeof renderer['render'] === 'function' && scene0 && camera0) {
          if (__framePerfEnabled) {
            runMeasuredFramePhase(framePerfPhases, 'renderer', () =>
              call2m(renderer, renderer['render'], scene0, camera0)
            );
          } else {
            call2m(renderer, renderer['render'], scene0, camera0);
          }
        }
      }

      recordMeasuredFrame(frameStartMs, framePerfPhases, forceFrameCapture);

      const mirrorWorkPending = getRenderSlot(A, '__mirrorWorkPending') === true;
      const shouldContinueLoop =
        motionFrame.isAnimating || controlsStillMoving || cameraMoveRenderingActive || mirrorWorkPending;
      const shouldContinuePerfSampling = readForcedFrameSampleRemaining() > 0;
      if (!shouldContinueLoop && !shouldContinuePerfSampling) {
        clearLoopSchedule(A);
        return;
      }

      const nextAnimate0 = getAnimateFn(A);
      const nextAnimate = asFrameRequestCallback(nextAnimate0, animate);
      const scheduledAt = __now();
      setRafScheduledAt(A, scheduledAt);
      try {
        setLoopRaf(A, __raf(nextAnimate));
      } catch (error) {
        clearLoopSchedule(A);
        report('animate.scheduleNextFrame', error, { throttleMs: 2000 });
      }
    } catch (error) {
      clearLoopSchedule(A);
      report('animate.frame', error, { throttleMs: 2000 });
    }
  }

  return animate;
}
