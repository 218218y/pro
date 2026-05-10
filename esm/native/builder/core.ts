/* Step 8 build: 2026-01-06 */
// Native Builder Core (ESM)
//
// Converted from `js/builder/pro_builder_core.js` into a real ES module.
//
// Design goals:
// - No IIFE / implicit globals: install via explicit `installBuilderCore(App)` call.
// - No importing from `js/**` in ESM route.
// - Canonical public API lives on `App.services.builder`.

import { assertApp, assertBrowserWindow } from '../runtime/api.js';
import { requireBuilderDepsReady } from '../runtime/builder_deps_access.js';
import { reportError } from '../runtime/errors.js';
import { runCoalescedBuild } from './build_runner.js';
import { buildWardrobeFlow } from './build_wardrobe_flow.js';
import { ensureBuilderService, getBuilderService } from '../runtime/builder_service_access.js';
import { setBuildTag } from '../runtime/build_info_access.js';

import type { BuilderDepsRootLike } from '../../../types';
import { isBootReady, isLifecycleBootReady } from '../runtime/app_roots_access.js';

type UnknownRecord = Record<string, unknown>;
type BuilderInstallMarkerFn = ((stateOrOverride: unknown) => unknown) & { __esm_v1?: boolean };

function _pickApp(app: unknown, label: string = 'native/builder/core') {
  return assertApp(app && typeof app === 'object' ? app : null, label);
}

function _isObject(x: unknown): x is UnknownRecord {
  return !!x && typeof x === 'object';
}

function _asObject(x: unknown): UnknownRecord | null {
  return _isObject(x) ? x : null;
}

function isBuilderInstallMarkerFn(value: unknown): value is BuilderInstallMarkerFn {
  return typeof value === 'function';
}

function _readInstallMarkerFn(value: unknown): BuilderInstallMarkerFn | null {
  return isBuilderInstallMarkerFn(value) ? value : null;
}

export function getBuilder(App: unknown) {
  const A = _pickApp(App, 'native/builder/core.getBuilder');
  return getBuilderService(A) || {};
}

export function installBuilderCore(AppIn: unknown) {
  // Pure ESM: builder core is browser-only; fail fast when used in non-browser contexts.
  const App = _pickApp(AppIn, 'native/builder/core.install');
  assertBrowserWindow(App, 'native/builder/core.install');

  const B = ensureBuilderService(App, 'native/builder/core.install');

  // Idempotent install
  const existing = _readInstallMarkerFn(B.buildWardrobe);
  if (existing && existing.__esm_v1) return B;

  // Build tags are useful diagnostics (and safe in dev). They are not required for runtime.
  setBuildTag(App, 'builderCore', 'stage22_coreSlim_buildFlow');

  // Builder core (ESM): keep this file as a small installer/orchestrator.
  B.buildWardrobe = function buildWardrobe(stateOrOverride: unknown) {
    let deps: BuilderDepsRootLike;
    try {
      deps = requireBuilderDepsReady(App, 'native/builder/core.buildWardrobe');
    } catch (err) {
      // Optional diagnostics hook (should not prevent the error from surfacing).
      try {
        reportError(App, err, { where: 'native/builder/core.buildWardrobe', fatal: true });
      } catch (e) {
        try {
          console.warn('[WardrobePro][builder] reportError hook failed:', e);
        } catch (_e2) {}
      }

      throw err;
    }

    return runCoalescedBuild({
      App,
      bwFn: buildWardrobe,
      args: [stateOrOverride],
      run: () =>
        buildWardrobeFlow({
          App,
          builderDeps: deps,
          stateOrOverride,
          label: 'native/builder/core.buildWardrobe',
        }),
    });
  };

  // Builder loaded: ask scheduler to flush if the app finished booting.
  try {
    const bootReady = isBootReady(App) || isLifecycleBootReady(App);

    if (bootReady && B.__scheduler && typeof B.__scheduler.flush === 'function') {
      B.__scheduler.flush();
    }
  } catch (e) {
    // Scheduler flush is best-effort; log so devs can see it.
    try {
      console.warn('[WardrobePro][builder] scheduler.flush failed:', e);
    } catch (_e2) {}
  }

  // Mark install for fast idempotency checks (without relying on build-tags).
  const installed = _readInstallMarkerFn(B.buildWardrobe);
  if (installed) installed.__esm_v1 = true;

  return B;
}
