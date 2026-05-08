// Native ESM platform installer.
//
// Design goals:
// - Keep a single canonical platform surface on App.platform (no global aliases)
// - Avoid relying on free global identifiers (especially THREE) in ESM contexts
// - Be idempotent (safe to import more than once)

import { createStore } from './store.js';
import { createDefaultState } from '../runtime/default_state.js';
import { installStorage } from './storage.js';
import { installDirtyFlag } from './dirty_flag.js';
import { getBrowserTimers, requestIdleCallbackMaybe } from '../runtime/api.js';
import { installToolsRuntimeState } from '../runtime/tools_runtime_state.js';
import { readRuntimeStateFromApp } from '../runtime/root_state_access.js';
import { setBuildTag } from '../runtime/build_info_access.js';
import {
  ensurePlatformRoot,
  ensureRegistriesRoot,
  getPlatformRootMaybe,
} from '../runtime/app_roots_access.js';
import { ensureDepsRoot, getDepsNamespaceMaybe, hasDep } from '../runtime/deps_access.js';
import { isPlatformInstalled, markPlatformInstalled } from '../runtime/install_state_access.js';
import { installStoreSurface } from '../runtime/store_surface_access.js';

import {
  WP_DEFAULT_VERBOSE_CONSOLE_ERRORS,
  WP_DEFAULT_VERBOSE_CONSOLE_ERRORS_DEDUPE_MS,
  getErrorStack,
  getModeConst,
  isRecord,
  readPlatformReportError,
} from './platform_shared.js';
import type { DepsFlagsLike } from './platform_shared.js';
import { installPlatformUtilSurface } from './platform_util.js';
import { installPlatformServiceSurface } from './platform_services.js';
import { applyPlatformBootFlagsToRuntime, readBootFailFastFlag } from './platform_boot.js';

import type { AppContainer } from '../../../types';

/** @typedef {import('../../../types').AppContainer} AppContainer */
/** @typedef {import('../../../types').Deps3D} Deps3D */

export { WP_DEFAULT_VERBOSE_CONSOLE_ERRORS, WP_DEFAULT_VERBOSE_CONSOLE_ERRORS_DEDUPE_MS };

/**
 * @param {AppContainer} rootApp
 * @returns {AppContainer['platform']}
 */
export function installPlatform(rootApp: AppContainer): AppContainer['platform'] {
  const App = rootApp && typeof rootApp === 'object' ? rootApp : null;
  if (!App) {
    throw new Error(
      '[WardrobePro][ESM] installPlatform(rootApp) requires an app object; global App is not supported'
    );
  }

  const platform = ensurePlatformRoot(App);

  // ---------------------------------------------------------------------------
  // Debug/QA flags (no root flags slot)
  //
  // Canonical: store.runtime.* (after store is created).
  // Early boot (before store exists): fall back to injected deps.flags or file defaults.
  // ---------------------------------------------------------------------------
  const getDepsFlags = (): DepsFlagsLike | null => {
    try {
      return getDepsNamespaceMaybe<DepsFlagsLike>(App, 'flags');
    } catch {
      return null;
    }
  };

  const getVerboseCfg = (): { enabled: boolean; dedupeMs: number } => {
    try {
      const runtime = readRuntimeStateFromApp(App);
      const enabled =
        runtime && typeof runtime.verboseConsoleErrors === 'boolean'
          ? !!runtime.verboseConsoleErrors
          : (() => {
              const flags = getDepsFlags();
              return flags && typeof flags.verboseConsoleErrors === 'boolean'
                ? !!flags.verboseConsoleErrors
                : WP_DEFAULT_VERBOSE_CONSOLE_ERRORS;
            })();
      const dedupeMs =
        runtime && typeof runtime.verboseConsoleErrorsDedupeMs === 'number'
          ? Number(runtime.verboseConsoleErrorsDedupeMs)
          : (() => {
              const flags = getDepsFlags();
              return flags && typeof flags.verboseConsoleErrorsDedupeMs === 'number'
                ? Number(flags.verboseConsoleErrorsDedupeMs)
                : WP_DEFAULT_VERBOSE_CONSOLE_ERRORS_DEDUPE_MS;
            })();
      return { enabled, dedupeMs };
    } catch {
      const flags = getDepsFlags();
      return {
        enabled:
          flags && typeof flags.verboseConsoleErrors === 'boolean'
            ? !!flags.verboseConsoleErrors
            : WP_DEFAULT_VERBOSE_CONSOLE_ERRORS,
        dedupeMs:
          flags && typeof flags.verboseConsoleErrorsDedupeMs === 'number'
            ? Number(flags.verboseConsoleErrorsDedupeMs)
            : WP_DEFAULT_VERBOSE_CONSOLE_ERRORS_DEDUPE_MS,
      };
    }
  };

  const isDebugOn = (): boolean => {
    try {
      const runtime = readRuntimeStateFromApp(App);
      if (runtime && typeof runtime.debug === 'boolean') return !!runtime.debug;
    } catch {
      // swallow
    }
    try {
      const flags = getDepsFlags();
      return !!(flags && flags.debug);
    } catch {
      return false;
    }
  };

  const earlyReportError = function (err: unknown, ctx?: unknown) {
    const currentPlatform = getPlatformRootMaybe(App);
    const reporter = readPlatformReportError(
      currentPlatform && isRecord(currentPlatform) ? currentPlatform.reportError : null
    );
    if (reporter) {
      reporter(err, ctx);
      return;
    }
    const verbose = getVerboseCfg();
    if (!verbose.enabled) return;

    const stack = getErrorStack(err);
    const msg = stack ? String(stack) : String(err);
    console.error('[Platform]', ctx ? `[${String(ctx)}]` : '', msg);
  };

  // Canonical services install lazily through their explicit runtime seams (no top-level shims).

  // Canonical registries namespace (Pure ESM).
  // Registries are lightweight lookup tables that remain optional and subsystem-owned.
  // Keep as a plain object so future registries can install explicit keys without top-level shims.
  ensureRegistriesRoot(App);

  // ---------------------------------------------------------------------------
  // Deps surface (Pure ESM): require explicit injection of critical deps.
  // In ES modules, loading Three.js as a script does not create an in-module identifier automatically.
  // Canonical: App.deps.THREE
  // ---------------------------------------------------------------------------
  ensureDepsRoot(App);
  const bootFailFast = readBootFailFastFlag(App, earlyReportError);

  if (!hasDep(App, 'THREE')) {
    throw new Error(
      '[WardrobePro][ESM] installPlatform: missing dep deps.THREE (inject via boot({ deps: { THREE } }))'
    );
  }

  setBuildTag(App, 'platform', 'step6_platform');

  // Timing DI (P10): prefer injected browser timers/RAF over globals.
  const __timers = getBrowserTimers(App);
  const __st = __timers.setTimeout;
  const __ct = __timers.clearTimeout;
  const __raf = __timers.requestAnimationFrame;
  const __ric = requestIdleCallbackMaybe(App);

  installPlatformUtilSurface(App, {
    getVerboseCfg,
    isDebugOn,
    setTimeoutFn: __st,
    clearTimeoutFn: __ct,
    requestAnimationFrameFn: __raf,
    requestIdleCallbackFn: __ric,
  });
  installPlatformServiceSurface(App, __raf);

  // NOTE: In Pure ESM mode, UI binds DOM events directly with
  // addEventListener/removeEventListener (via deps.browser.window/document) and explicit disposers.
  // The platform no longer installs App.events/App.bind.
  // This keeps platform wiring focused and avoids cross-layer coupling.

  // ---------------------------------------------------------------------------
  // Store (Phase B): single place to keep snapshots of {ui, config, mode, runtime, meta}
  //
  // Extracted to dedicated modules:
  // - createDefaultState(): provides a fresh default state object
  // - createStore(): store implementation (patch/subscribe helpers)
  // ---------------------------------------------------------------------------
  installStoreSurface(App, () =>
    createStore({
      initialState: createDefaultState({ noneMode: getModeConst('NONE', 'none') }),
      getNoneMode: function () {
        return getModeConst('NONE', 'none');
      },
    })
  );

  applyPlatformBootFlagsToRuntime(App, bootFailFast, getDepsFlags);

  // ---------------------------------------------------------------------------
  // Storage + Dirty Flag (Phase 1): extracted into dedicated modules
  //
  // IMPORTANT (Zustand migration):
  // - Canonical write actions are installed by the kernel (installStateApi) in the boot manifest.
  // - Platform must NOT install/override App.actions.* here, or we risk blocking newer canonical
  //   surfaces (commit helpers, history parity, autosave parity) from being installed later.
  // ---------------------------------------------------------------------------
  installStorage(App);
  installDirtyFlag(App);

  // ---------------------------------------------------------------------------
  // Tools runtime state helpers (store-backed, canonical App.services.tools)
  // ---------------------------------------------------------------------------
  try {
    installToolsRuntimeState(App);
  } catch {
    // ignore
  }

  if (!isPlatformInstalled(App)) markPlatformInstalled(App);
  return platform;
}
