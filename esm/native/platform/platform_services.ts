import {
  getAnimateFn,
  getDrawersArray,
  getLastFrameTs,
  getLoopRaf,
  getRafScheduledAt,
  setAnimateFn,
  setLoopRaf,
  setRafScheduledAt,
} from '../runtime/render_access.js';
import { readConfigStateFromApp, readRuntimeStateFromApp } from '../runtime/root_state_access.js';
import { getBuilderBuildUi } from '../runtime/builder_service_access.js';
import { getBrowserTimers, requestIdleCallbackMaybe } from '../runtime/api.js';
import {
  ensurePlatformService,
  getPlatformRenderDebugBudget,
  getPlatformRenderDebugStats,
  reportErrorViaPlatform,
  resetPlatformRenderDebugStats,
} from '../runtime/platform_access.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import { isLifecycleTabHidden } from '../runtime/app_roots_access.js';
import {
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  getDefaultDepthForWardrobeType,
} from '../runtime/wardrobe_dimension_defaults.js';

import { ensurePlatformPerf, isRecord, readBuildUiSurface } from './platform_shared.js';

import type { AppContainer } from '../../../types';

function readNumberish(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

function invokeEnsureRenderLoop(platform: AppContainer['services']['platform'] | null | undefined): void {
  const ensureRenderLoop = platform && typeof platform === 'object' ? platform.ensureRenderLoop : null;
  if (typeof ensureRenderLoop === 'function') ensureRenderLoop();
}

function scheduleRenderKickTask(App: AppContainer, animate: () => unknown): void {
  const runOnce = () => {
    try {
      animate();
    } catch (e) {
      setLoopRaf(App, 0);
      reportErrorViaPlatform(App, e, 'animate');
    }
  };

  const idle = requestIdleCallbackMaybe(App);
  if (idle) {
    try {
      idle(runOnce, { timeout: 250 });
      return;
    } catch {
      // Fall back to the injected timer below.
    }
  }

  try {
    getBrowserTimers(App).setTimeout(runOnce, 0);
  } catch {
    runOnce();
  }
}

export function installPlatformServiceSurface(
  App: AppContainer,
  requestAnimationFrameFn: (cb: (ts?: number) => void) => number
): void {
  const Platform = ensurePlatformService(App);

  installStableSurfaceMethod(Platform, 'getBuildUI', '__wpGetBuildUI', () => {
    return function () {
      return getBuilderBuildUi(App);
    };
  });

  installStableSurfaceMethod(Platform, 'getDimsM', '__wpGetDimsM', () => {
    return function (raw?: unknown) {
      const ui = readBuildUiSurface(
        raw || (typeof Platform.getBuildUI === 'function' ? Platform.getBuildUI() : null)
      );
      const rawUi = isRecord(ui.raw) ? ui.raw : ui;

      let wVal = readNumberish(ui.width);
      if (!Number.isFinite(wVal)) wVal = readNumberish(ui.w);
      let hVal = readNumberish(ui.height);
      if (!Number.isFinite(hVal)) hVal = readNumberish(ui.h);
      let dVal = readNumberish(ui.depth);
      if (!Number.isFinite(dVal)) dVal = readNumberish(ui.d);

      if (!Number.isFinite(wVal) && rawUi && rawUi !== ui) {
        wVal = readNumberish(rawUi.width);
        if (!Number.isFinite(wVal)) wVal = readNumberish(rawUi.w);
      }
      if (!Number.isFinite(hVal) && rawUi && rawUi !== ui) {
        hVal = readNumberish(rawUi.height);
        if (!Number.isFinite(hVal)) hVal = readNumberish(rawUi.h);
      }
      if (!Number.isFinite(dVal) && rawUi && rawUi !== ui) {
        dVal = readNumberish(rawUi.depth);
        if (!Number.isFinite(dVal)) dVal = readNumberish(rawUi.d);
      }

      let wCm = Number.isFinite(wVal) ? (wVal <= 10 ? wVal * 100 : wVal) : NaN;
      let hCm = Number.isFinite(hVal) ? (hVal <= 10 ? hVal * 100 : hVal) : NaN;
      let dCm = Number.isFinite(dVal) ? (dVal <= 10 ? dVal * 100 : dVal) : NaN;

      const runtime = readRuntimeStateFromApp(App);
      const ww = runtime.wardrobeWidthM;
      const hh = runtime.wardrobeHeightM;
      const dd = runtime.wardrobeDepthM;
      if (!Number.isFinite(wCm) && typeof ww === 'number' && Number.isFinite(ww)) wCm = ww * 100;
      if (!Number.isFinite(hCm) && typeof hh === 'number' && Number.isFinite(hh)) hCm = hh * 100;
      if (!Number.isFinite(dCm) && typeof dd === 'number' && Number.isFinite(dd)) dCm = dd * 100;

      const cfg = readConfigStateFromApp(App);
      const defaultDepth = getDefaultDepthForWardrobeType(cfg.wardrobeType);

      if (!Number.isFinite(wCm)) wCm = DEFAULT_WIDTH;
      if (!Number.isFinite(hCm)) hCm = DEFAULT_HEIGHT;
      if (!Number.isFinite(dCm)) dCm = defaultDepth;

      return { w: wCm / 100, h: hCm / 100, d: dCm / 100 };
    };
  });

  installStableSurfaceMethod(Platform, 'computePerfFlags', '__wpComputePerfFlags', () => {
    return function () {
      Platform.perf = Platform.perf && typeof Platform.perf === 'object' ? Platform.perf : {};
      let hasInternal = false;
      const arr = getDrawersArray(App);
      if (arr) {
        for (let i = 0; i < arr.length; i++) {
          const drawer = arr[i];
          if (!drawer) continue;
          if (drawer.isInternal || (drawer.id && String(drawer.id).includes('int'))) {
            hasInternal = true;
            break;
          }
        }
      }
      const perf = ensurePlatformPerf(Platform.perf);
      perf.hasInternalDrawers = hasInternal;
      perf.perfFlagsDirty = false;
      Platform.perf = perf;
    };
  });

  installStableSurfaceMethod(Platform, 'setAnimate', '__wpSetAnimate', () => {
    return function (fn: () => unknown) {
      setAnimateFn(App, fn);
      invokeEnsureRenderLoop(Platform);
    };
  });

  installStableSurfaceMethod(Platform, 'ensureRenderLoop', '__wpEnsureRenderLoop', () => {
    return function () {
      let loopRaf = getLoopRaf(App);

      if (isLifecycleTabHidden(App)) {
        setLoopRaf(App, 0);
        return;
      }

      if (loopRaf) {
        const now = getBrowserTimers(App).now();
        const last = getLastFrameTs(App);
        const scheduledAt = getRafScheduledAt(App);
        const age = scheduledAt ? now - scheduledAt : last ? now - last : 0;
        if (age > 2500) {
          loopRaf = setLoopRaf(App, 0);
        } else {
          return;
        }
      }

      const animate = getAnimateFn(App);
      if (typeof animate !== 'function') return;

      const kickNow = getBrowserTimers(App).now();
      setRafScheduledAt(App, kickNow);
      setLoopRaf(
        App,
        requestAnimationFrameFn(function __wpKickRenderLoop() {
          scheduleRenderKickTask(App, animate);
        })
      );
    };
  });

  installStableSurfaceMethod(Platform, 'getRenderDebugStats', '__wpGetRenderDebugStats', () => {
    return function () {
      return getPlatformRenderDebugStats(App);
    };
  });

  installStableSurfaceMethod(Platform, 'resetRenderDebugStats', '__wpResetRenderDebugStats', () => {
    return function () {
      return resetPlatformRenderDebugStats(App);
    };
  });

  installStableSurfaceMethod(Platform, 'getRenderDebugBudget', '__wpGetRenderDebugBudget', () => {
    return function () {
      return getPlatformRenderDebugBudget(App);
    };
  });
}
