// Native ESM implementation of platform boot orchestration.
//
// Goals:
// - Provide a real ESM module that can be imported.
// - Pure ESM: attach boot API only to the provided App instance, with no window/global alternate path.
// - Fail fast if required deps are missing; run UI boot; mark boot-ready; trigger render.

import type { AppContainer, UnknownCallable } from '../../../types';
import { endPerfSpan, getBrowserTimers, startPerfSpan } from '../runtime/api.js';
import { isBootInstalled, markBootInstalled } from '../runtime/install_state_access.js';
import {
  isPlatformBootInitDone,
  isPlatformBootInitRunning,
  setPlatformBootInitDone,
  setPlatformBootInitRunning,
} from '../runtime/platform_boot_runtime_access.js';
import { assertThreeViaDeps } from '../runtime/three_access.js';
import { getBootStartEntry } from '../runtime/boot_entry_access.js';
import { afterPaintViaPlatform, runPlatformRenderFollowThrough } from '../runtime/platform_access.js';
import { reportError } from '../runtime/errors.js';
import { getBuilderScheduler } from '../runtime/builder_service_access.js';
import { assertApp } from '../runtime/assert.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
type AnyFn = UnknownCallable;

type BootSurface = Record<string, unknown> & {
  start?: () => void;
  isReady?: () => boolean;
  setReady?: () => void;
};

const BOOT_START_CANONICAL_KEY = '__wpCanonicalBootStart';
const BOOT_IS_READY_CANONICAL_KEY = '__wpCanonicalBootIsReady';
const BOOT_SET_READY_CANONICAL_KEY = '__wpCanonicalBootSetReady';

function _isFn(x: unknown): x is AnyFn {
  return typeof x === 'function';
}

function reportBootNonFatal(root: AppContainer, op: string, error: unknown): void {
  reportError(root, error, { where: 'native/platform/boot_main', op, fatal: false });
}

export function installBootMain(App: unknown) {
  const root: AppContainer = assertApp(App, 'platform/boot_main.install');

  const lifecycle = (root.lifecycle = root.lifecycle || {});
  if (typeof lifecycle.bootReady !== 'boolean') lifecycle.bootReady = false;

  root.boot = root.boot || {};
  const boot: BootSurface = root.boot;
  let appStartReadinessSpanId: string | null = null;

  function writeBootReady(on: boolean): boolean {
    try {
      lifecycle.bootReady = on === true;
      return lifecycle.bootReady === true;
    } catch (error) {
      reportBootNonFatal(root, `lifecycle.bootReady=${String(on)}`, error);
      return false;
    }
  }

  function flushBuilderAfterBoot(): void {
    try {
      const sched = getBuilderScheduler(root);
      if (sched && _isFn(sched.flush)) sched.flush();
    } catch (error) {
      reportBootNonFatal(root, 'builder.flush', error);
    }
  }

  function _setBootReady(): void {
    writeBootReady(true);
    flushBuilderAfterBoot();
  }

  function isReady(): boolean {
    try {
      return typeof lifecycle.bootReady === 'boolean' ? lifecycle.bootReady === true : false;
    } catch (error) {
      reportBootNonFatal(root, 'lifecycle.bootReady.read', error);
      return false;
    }
  }

  function finishBootAttempt(ok: boolean): void {
    try {
      setPlatformBootInitDone(root, ok);
    } catch (error) {
      reportBootNonFatal(root, `runtime.initDone=${String(ok)}`, error);
    }
    try {
      setPlatformBootInitRunning(root, false);
    } catch (error) {
      reportBootNonFatal(root, 'runtime.initRunning=false', error);
    }
    if (ok) _setBootReady();
    else writeBootReady(false);
  }

  function runInit(): void {
    let ok = false;
    let bootError: unknown = null;
    try {
      const entry = getBootStartEntry(root);
      if (!_isFn(entry)) {
        throw new Error(
          '[WardrobePro][ESM] boot.start() missing required entry: App.services.appStart.start or App.services.uiBoot.bootMain'
        );
      }
      entry();
      ok = true;
    } catch (error) {
      bootError = error;
      reportBootNonFatal(root, 'boot.start.entry', error);
    } finally {
      finishBootAttempt(ok);
      if (appStartReadinessSpanId) {
        endPerfSpan(root, appStartReadinessSpanId, ok ? {} : { status: 'error', error: bootError });
        appStartReadinessSpanId = null;
      }
    }

    if (!ok) return;
    runPlatformRenderFollowThrough(root, { updateShadows: false, ensureRenderLoop: false });
  }

  function scheduleInit(): void {
    if (afterPaintViaPlatform(root, runInit)) return;

    const timers = getBrowserTimers(root);
    try {
      const runInitFrame: FrameRequestCallback = () => runInit();
      timers.requestAnimationFrame(runInitFrame);
      return;
    } catch (error) {
      reportBootNonFatal(root, 'schedule.requestAnimationFrame', error);
    }

    try {
      timers.setTimeout(runInit, 0);
      return;
    } catch (error) {
      reportBootNonFatal(root, 'schedule.setTimeout', error);
    }

    // No scheduler should make boot disappear. The final path is immediate and still fail-soft.
    runInit();
  }

  function start(): void {
    if (isPlatformBootInitDone(root)) return;
    if (isPlatformBootInitRunning(root)) return;

    // THREE must be injected explicitly (Pure ESM): root.deps.THREE
    assertThreeViaDeps(root, 'platform/boot_main.start.THREE');

    appStartReadinessSpanId = startPerfSpan(root, 'boot.post-mount.app-start.readiness', {
      kind: 'phase',
      phase: 'boot.post-mount',
    });
    writeBootReady(false);
    setPlatformBootInitRunning(root, true);
    scheduleInit();
  }

  installStableSurfaceMethod(boot, 'start', BOOT_START_CANONICAL_KEY, () => start);
  installStableSurfaceMethod(boot, 'isReady', BOOT_IS_READY_CANONICAL_KEY, () => isReady);
  installStableSurfaceMethod(boot, 'setReady', BOOT_SET_READY_CANONICAL_KEY, () => _setBootReady);

  // Pure ESM: no App.core.bootMain alias.

  if (!isBootInstalled(root)) markBootInstalled(root);
  return boot;
}
