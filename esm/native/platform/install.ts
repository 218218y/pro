// Platform install surface (Pure ESM)
//
// Boot should import platform installers from here.

export { installPlatform } from './platform.js';
export { installCachePruning } from './cache_pruning.js';

export {
  clearThreeGeometryCacheReferences,
  ensureGeometryCachesInstalled,
  installThreeGeometryCachePatch,
  readThreeGeometryCacheStats,
} from './three_geometry_cache_patch.js';

export { installThreeCleanup } from './three_cleanup.js';
export { installPickingPrimitives } from './picking_primitives.js';

export { CONFIG_DEFAULTS, applyConfigDefaults } from './config_defaults.js';
export { initRenderState } from './render_state_init.js';
export { installRenderScheduler } from './render_scheduler.js';
export { installLifecycleVisibility } from './lifecycle_visibility.js';
export { installBootMain } from './boot_main.js';
export { installRenderLoopImpl } from './render_loop_impl.js';
export { installSmokeChecks } from './smoke_checks.js';
