// Render access helpers (Canonical)
//
// Goal:
// - Provide a single, stable way to access render surfaces/arrays across layers.
// - Avoid repeating raw render-bag probing everywhere.
// - Keep the surfaces resilient during boot/migration (never throw).
//
// IMPORTANT:
// - This file lives in `runtime/` so it can be imported from builder/services/kernel/platform.
// - UI should prefer importing via `services/api.js` (public services surface) when possible.

export {
  ensureRenderNamespace,
  getRenderNamespace,
  getRenderer,
  getScene,
  getCamera,
  getControls,
  getWardrobeGroup,
  getRoomGroup,
  setRoomGroup,
  getViewportSurface,
  hasViewportPickingSurface,
  getRenderSlot,
  setRenderSlot,
  getDoorsArray,
  getDrawersArray,
  clearRenderArrays,
  getAnimateFn,
  setAnimateFn,
  getLoopRaf,
  setLoopRaf,
  getLastFrameTs,
  setLastFrameTs,
  getRafScheduledAt,
  setRafScheduledAt,
  addToWardrobeGroup,
  addToScene,
  removeFromSceneByName,
} from './render_access_surface.js';

export {
  getRenderCache,
  getRenderMeta,
  getRenderMaterials,
  readRenderCacheValue,
  writeRenderCacheValue,
  ensureRenderCacheObject,
  ensureRenderMetaArray,
  getAutoLightBuildKey,
  setAutoLightBuildKey,
  getAutoCameraBuildKey,
  setAutoCameraBuildKey,
  ensureRenderCacheMaps,
  ensureRenderMetaMaps,
  ensureRenderMaterialSlots,
  ensureRenderMaterialSlot,
  readRenderMaterialSlot,
  writeRenderMaterialSlot,
  bindLegacyRenderCompatRefs,
  ensureRenderCacheMap,
  ensureRenderMetaMap,
  getAmbientLight,
  setAmbientLight,
  getDirectionalLight,
  setDirectionalLight,
  ensureRenderRuntimeState,
  getShadowMap,
  getMirrorRenderTarget,
  markSplitHoverPickablesDirty,
  trackMirrorSurface,
  getMirrorCubeCamera,
  getMirrorHideScratch,
  invalidateMirrorTracking,
  readAutoHideFloorCache,
  writeAutoHideFloorCache,
  readRendererCompatDefaults,
  writeRendererCompatDefaults,
} from './render_access_state.js';
