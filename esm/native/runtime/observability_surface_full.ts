import type {
  AppContainer,
  WardrobeProDebugConsoleSurface,
  WardrobeProPerfConsoleSurface,
} from '../../../types/index.js';

import { installDebugConsoleSurface } from './debug_console_surface.js';
import { isDebugObservabilityBuild, isPerfObservabilityBuild } from './observability_build_mode.js';
import {
  buildPerfEntryOptionsFromActionResult,
  clearPerfEntries,
  createPerfConsoleSurface,
  endPerfSpan,
  getBuildRuntimeDebugBudget,
  getBuildRuntimeDebugStats,
  getPerfEntries,
  getPerfSummary,
  getPerfStateFingerprint,
  getRuntimeErrorHistory,
  getRenderRuntimeDebugBudget,
  getRenderRuntimeDebugStats,
  getStoreDebugStats,
  installPerfRuntimeSurface,
  isNonErrorPerfResultReason,
  resetBuildRuntimeDebugStats,
  resetRenderRuntimeDebugStats,
  resetStoreDebugStats,
  markPerfPoint,
  runPerfAction,
  runWithPerfSpan,
  startPerfSpan,
} from './perf_runtime_surface.js';

export {
  buildPerfEntryOptionsFromActionResult,
  clearPerfEntries,
  createPerfConsoleSurface,
  endPerfSpan,
  getBuildRuntimeDebugBudget,
  getBuildRuntimeDebugStats,
  getPerfEntries,
  getPerfSummary,
  getPerfStateFingerprint,
  getRuntimeErrorHistory,
  getRenderRuntimeDebugBudget,
  getRenderRuntimeDebugStats,
  getStoreDebugStats,
  installPerfRuntimeSurface,
  isNonErrorPerfResultReason,
  resetBuildRuntimeDebugStats,
  resetRenderRuntimeDebugStats,
  resetStoreDebugStats,
  markPerfPoint,
  runPerfAction,
  runWithPerfSpan,
  startPerfSpan,
};

export { installDebugConsoleSurface } from './debug_console_surface.js';
export { getObservabilityBuildMode } from './observability_build_mode.js';

export type ObservabilityInstallResult = {
  perf: WardrobeProPerfConsoleSurface | null;
  debug: WardrobeProDebugConsoleSurface | null;
};

export function installObservabilityForBuild(
  App: AppContainer,
  win: Window | null | undefined
): ObservabilityInstallResult {
  if (!win || typeof win !== 'object') {
    return { perf: null, debug: null };
  }

  let perf: WardrobeProPerfConsoleSurface | null = null;
  let debug: WardrobeProDebugConsoleSurface | null = null;

  if (isPerfObservabilityBuild() || isDebugObservabilityBuild()) {
    perf = installPerfRuntimeSurface(App, win);
  }
  if (isDebugObservabilityBuild()) {
    debug = installDebugConsoleSurface(App, win);
  }

  return { perf, debug };
}
