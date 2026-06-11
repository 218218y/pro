// Builder service public access surface.
//
// Keep the canonical runtime entrypoint small while focused same-layer
// modules own slot access, bound builder callables, and build/request helpers.

export {
  ensureBuilderService,
  getBuilderService,
  requireBuilderService,
} from './builder_service_access_shared.js';

export {
  getBuilderHandlesService,
  getBuilderRenderOps,
  requireBuilderRenderOps,
  getBuilderRegistry,
  requireBuilderRegistry,
  finalizeBuilderRegistry,
  getBuilderPlanService,
  getBuilderRenderAdapterService,
  requireBuilderRenderAdapterService,
  getBuilderCorePureService,
  getBuilderMaterialsService,
  requireBuilderMaterialsService,
  getBuilderModulesService,
  requireBuilderModulesService,
  getBuilderContentsService,
  requireBuilderContentsService,
  getBuilderScheduler,
} from './builder_service_access_slots.js';

export {
  getBuilderAddOutlines,
  getBuilderGetMaterial,
  requireBuilderGetMaterial,
  getBuilderMirrorMaterialFactory,
  resolveBuilderMirrorMaterial,
  getBuilderCreateDoorVisual,
  requireBuilderCreateDoorVisual,
  getBuilderCreateInternalDrawerBox,
  requireBuilderCreateInternalDrawerBox,
  getBuilderBuildChestOnly,
  getBuilderBuildCornerWing,
  getBuilderAddRealisticHanger,
  requireBuilderAddRealisticHanger,
  getBuilderAddHangingClothes,
  requireBuilderAddHangingClothes,
  getBuilderAddFoldedClothes,
  requireBuilderAddFoldedClothes,
} from './builder_service_access_calls.js';

export {
  getBuilderBuildUi,
  ensureBuilderBuildUi,
  clearBuilderBuildUi,
  applyBuilderHandles,
  runBuilderRenderFollowThrough,
  runBuilderPostBuildFollowThrough,
  runBuilderChestModeFollowThrough,
  refreshBuilderHandles,
  purgeBuilderHandlesForRemovedDoors,
  getBuilderBuildWardrobe,
  hasBuilderBuildWardrobe,
  runBuilderBuildWardrobe,
  hasBuilderRequestBuild,
  requestBuilderBuild,
  requestBuilderImmediateBuild,
  requestBuilderForcedBuild,
  requestBuilderDebouncedBuild,
  requestBuilderBuildFromActionMeta,
  requestBuilderBuildWithUiFromActionMeta,
  refreshBuilderAfterDoorOps,
  requestBuilderStructuralRefresh,
  requestBuilderBuildWithUi,
} from './builder_service_access_build.js';
