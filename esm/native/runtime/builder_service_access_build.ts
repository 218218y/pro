// Builder build/request public access surface.
//
// Keep the public runtime entrypoint thin while dedicated same-layer owners
// handle build-ui state, handle refreshes, render follow-through, and build requests.

export {
  getBuilderBuildUi,
  ensureBuilderBuildUi,
  clearBuilderBuildUi,
} from './builder_service_access_build_ui.js';

export { runBuilderRenderFollowThrough } from './builder_service_access_build_render.js';

export {
  applyBuilderHandles,
  refreshBuilderHandles,
  purgeBuilderHandlesForRemovedDoors,
} from './builder_service_access_build_handles.js';

export {
  runBuilderPostBuildFollowThrough,
  runBuilderChestModeFollowThrough,
} from './builder_service_access_build_followthrough.js';

export {
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
} from './builder_service_access_build_request.js';

export type {
  ApplyBuilderHandlesOpts,
  RefreshBuilderHandlesOpts,
  RefreshBuilderAfterDoorOpsOpts,
  BuilderHandleRefreshResult,
  RequestBuilderStructuralRefreshOpts,
  BuilderStructuralRefreshResult,
  BuilderRenderFollowThroughOpts,
  BuilderRenderFollowThroughResult,
  BuilderPostBuildFollowThroughOpts,
  BuilderPostBuildFollowThroughResult,
  BuilderChestModeFollowThroughOpts,
  BuilderChestModeFollowThroughResult,
  BuilderBuildProfileOpts,
} from './builder_service_access_build_shared.js';
