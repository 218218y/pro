// Native ESM THREE geometry cache patch.
//
// Pure ESM: explicit install via installThreeGeometryCachePatch(app).
// - No window/global-scope App usage.
// - THREE is resolved ONLY from app.deps.THREE via assertThreeViaDeps (fail-fast if missing).
// - Caches live under app.render.cache/meta (canonical: runtime/render_access).

export type {
  AppLike,
  CacheTouchFn,
  FlagsLike,
  GeometryCacheBucket,
  GeometryCacheMap,
  GeometryCacheStats,
  GeometryCtor,
  GeometryInstance,
  GeometryMetaMaps,
  GeometryPatchThreeLike,
  GeometryUserData,
  UnknownRecord,
} from './three_geometry_cache_patch_contracts.js';

export {
  clearThreeGeometryCacheReferences,
  ensureGeometryCachesInstalled,
  getEdgesGeometryCache,
  getGeometryCache,
  installThreeGeometryCachePatch,
  isThreeGeometryCachePatchEnabled,
  readThreeGeometryCacheStats,
} from './three_geometry_cache_patch_runtime.js';
