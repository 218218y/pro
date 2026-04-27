// Post-build dimensions pipeline (Pure ESM)
//
// Thin canonical owner for dimension overlay orchestration.
// Detailed metric derivation, corner metadata parsing, and stack-split helper lines live in focused owners.

import { requireBuilderRenderOps } from '../runtime/builder_service_access.js';

import type { PostBuildDimensionsArgs } from './post_build_dimensions_shared.js';
import { derivePostBuildDimensionMetrics } from './post_build_dimensions_module_metrics.js';
import { readPostBuildCornerDimensions } from './post_build_dimensions_corner.js';
import { appendStackSplitDimensionLines } from './post_build_dimensions_stack_split.js';

export function applyPostBuildDimensions(args: PostBuildDimensionsArgs): void {
  const {
    ctx,
    App,
    THREE,
    H,
    D,
    totalW,
    hasCornice,
    isCornerMode,
    addDimensionLine,
    noMainWardrobe,
    stackSplitActive,
    splitBottomHeightCm,
    splitBottomDepthCm,
    stackKey,
  } = args;

  const builderRenderOps = requireBuilderRenderOps(App, 'builder/post_build_extras.dimensions');
  const applyDimensions =
    typeof builderRenderOps.applyDimensions === 'function' ? builderRenderOps.applyDimensions : null;
  if (!applyDimensions) {
    throw new Error(
      '[builder/post_build_extras] showDimensions enabled but builderRenderOps.applyDimensions is missing'
    );
  }
  if (typeof addDimensionLine !== 'function') {
    throw new Error(
      '[builder/post_build_extras] showDimensions enabled but contents.addDimensionLine is missing'
    );
  }

  const metrics = derivePostBuildDimensionMetrics({
    ctx,
    App,
    H,
    D,
    totalW,
    stackSplitActive,
    splitBottomHeightCm,
    splitBottomDepthCm,
  });
  const corner = readPostBuildCornerDimensions({
    App,
    dimH: metrics.dimH,
    dimD: metrics.dimD,
  });

  applyDimensions({
    THREE,
    addDimensionLine,
    totalW,
    H: metrics.dimH,
    D: metrics.dimD,
    hasCornice,
    isCornerMode,
    noMainWardrobe,
    cornerSide: corner.cornerSide,
    cornerWallLenM: corner.cornerWallLenM,
    cornerOffsetXM: corner.cornerOffsetXM,
    cornerOffsetZM: corner.cornerOffsetZM,
    cornerConnectorEnabled: corner.cornerConnectorEnabled,
    cornerDoorCount: corner.cornerDoorCount,
    cornerWingLenM: corner.cornerWingLenM,
    cornerWingHeightM: corner.cornerWingHeightM,
    cornerWingDepthM: corner.cornerWingDepthM,
    stackSplitActive,
    moduleWidthsCm: metrics.moduleWidthsCm,
    moduleHeightsCm: metrics.moduleHeightsCm,
    moduleDepthsCm: metrics.moduleDepthsCm,
    moduleHeightsAllManual: metrics.moduleHeightsAllManual,
    moduleDepthsAllManual: metrics.moduleDepthsAllManual,
  });

  appendStackSplitDimensionLines({
    App,
    THREE,
    addDimensionLine,
    stackSplitActive,
    splitBottomHeightCm,
    dimH: metrics.dimH,
    totalW,
    isCornerMode,
    cornerSide: corner.cornerSide,
    stackKey,
  });
}
