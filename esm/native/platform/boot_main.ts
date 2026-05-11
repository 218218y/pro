// Native ESM implementation of platform boot orchestration.
//
// Goals:
// - Provide a real ESM module that can be imported.
// - Pure ESM: attach boot API only to the provided App instance, with no window/global alternate path.
// - Fail fast if required deps are missing; run UI boot; mark boot-ready; trigger render.

import type { AppContainer, UnknownCallable } from '../../../types';
import { getBrowserTimers } from '../runtime/api.js';
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

/** @typedef {import('../../../types').AppContainer} AppContainer */

function _isFn(x: unknown): x is AnyFn {
  return typeof x === 'function';
}

/**
 * @param {AppContainer} App
 * @returns {unknown}
 */
export function installBootMain(App: unknown) {
  const root: AppContainer = assertApp(App, 'platform/boot_main.install');

  const lifecycle = (root.lifecycle = root.lifecycle || {});
  if (typeof lifecycle.bootReady !== 'boolean') lifecycle.bootReady = false;

  root.boot = root.boot || {};
  const boot: BootSurface = root.boot;

  function _setBootReady() {
    try {
      lifecycle.bootReady = true;
    } catch (_) {}
    try {
      // Canonical: builder is a service.
      const sched = getBuilderScheduler(root);
      if (sched && _isFn(sched.flush)) sched.flush();
    } catch (_) {}
  }

  function isReady() {
    try {
      if (typeof lifecycle.bootReady === 'boolean') return !!lifecycle.bootReady;
    } catch (_) {}
    return false;
  }

  function start() {
    try {
      if (isPlatformBootInitDone(root)) return;
      if (isPlatformBootInitRunning(root)) return;

      // THREE must be injected explicitly (Pure ESM): root.deps.THREE
      assertThreeViaDeps(root, 'platform/boot_main.start.THREE');

      setPlatformBootInitRunning(root, true);

      let runInit = function () {
        try {
          const entry = getBootStartEntry(root);
          if (!_isFn(entry)) {
            throw new Error(
              '[WardrobePro][ESM] boot.start() missing required entry: App.services.appStart.start or App.services.uiBoot.bootMain'
            );
          }
          entry();
        } catch (e) {
          try {
            reportError(root, e, 'boot.start');
          } catch (_) {}
          throw e;
        } finally {
          try {
            setPlatformBootInitDone(root, true);
            setPlatformBootInitRunning(root, false);
          } catch (_) {}
          try {
            _setBootReady();
          } catch (_) {}
        }

        // Prefer platform service seam over direct root probing.
        runPlatformRenderFollowThrough(root, { updateShadows: false, ensureRenderLoop: false });
      };

      try {
        if (!afterPaintViaPlatform(root, runInit)) {
          const timers = getBrowserTimers(root);
          try {
            const runInitFrame: FrameRequestCallback = () => {
              runInit();
            };
            timers.requestAnimationFrame(runInitFrame);
          } catch {
            timers.setTimeout(runInit, 0);
          }
        }
      } catch (_) {
        try {
          try {
            getBrowserTimers(root).setTimeout(runInit, 0);
          } catch {
            setTimeout(runInit, 0);
          }
        } catch (_e2) {}
      }
    } catch (e) {
      try {
        setPlatformBootInitRunning(root, false);
      } catch (_e) {}
      throw e;
    }
  }

  installStableSurfaceMethod(boot, 'start', BOOT_START_CANONICAL_KEY, () => start);
  installStableSurfaceMethod(boot, 'isReady', BOOT_IS_READY_CANONICAL_KEY, () => isReady);
  installStableSurfaceMethod(boot, 'setReady', BOOT_SET_READY_CANONICAL_KEY, () => _setBootReady);

  // Pure ESM: no App.core.bootMain alias.

  if (!isBootInstalled(root)) markBootInstalled(root);
  return boot;
}
