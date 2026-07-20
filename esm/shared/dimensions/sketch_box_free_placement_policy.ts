import { meters } from './units.js';

export const SKETCH_BOX_FREE_VERTICAL_POLICY = Object.freeze({
  verticalSlackDefaultM: meters(0.45),
  verticalSlackMinM: meters(0.45),
  verticalSlackMaxM: meters(1.35),
  verticalSlackHeightRatio: 0.75,
  roomFloorY: meters(0),
});

export const SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY = Object.freeze({
  workspaceClampPadMinM: meters(0.001),
  workspaceClampPadMaxM: meters(0.006),
  workspaceClampPadHeightRatio: 0.02,
});

export const SKETCH_BOX_FREE_WALL_SNAP_POLICY = Object.freeze({
  wallSnapBandMinM: meters(0.008),
  wallSnapBandMaxM: meters(0.03),
  wallSnapBandWidthRatio: 0.08,
});

export const SKETCH_BOX_FREE_REMOVE_POLICY = Object.freeze({
  removeInsetMinM: meters(0.008),
  removeInsetMaxM: meters(0.025),
  removeInsetRatio: 0.08,
  removeInsetHalfRatioMax: 0.45,
  removeHalfMinM: meters(0.012),
});

export const SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY = Object.freeze({
  attachPadMinM: meters(0.03),
  attachPadMaxM: meters(0.14),
  attachPadSizeRatio: 0.18,
  attachEdgeMinM: meters(0.02),
  attachEdgeHalfRatio: 0.45,
});

export const SKETCH_BOX_FREE_ATTACH_INTENT_POLICY = Object.freeze({
  attachIntentMinOverlapMinM: meters(0.012),
  attachIntentMinOverlapMaxM: meters(0.04),
  attachIntentMinOverlapRatio: 0.18,
  attachIntentEdgeBandMinM: meters(0.018),
  attachIntentEdgeBandMaxM: meters(0.07),
  attachIntentEdgeBandRatio: 0.55,
  attachIntentEdgeDominanceMinM: meters(0.01),
  attachIntentEdgeDominanceMaxM: meters(0.045),
  attachIntentEdgeDominanceRatio: 0.18,
  attachIntentOutsideBiasMinM: meters(0.008),
  attachIntentOutsideBiasMaxM: meters(0.03),
  attachIntentOutsideBiasRatio: 0.12,
  attachIntentEdgeBiasMinM: meters(0.008),
  attachIntentEdgeBiasMaxM: meters(0.03),
  attachIntentEdgeBiasRatio: 0.18,
  attachIntentScoreBiasMinM: meters(0.06),
  attachIntentScoreBiasMaxM: meters(0.24),
  attachIntentScoreBiasRatio: 0.5,
});

export const SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY = Object.freeze({
  placementGapDefaultM: meters(0.002),
  placementGapMinM: meters(0.0015),
  placementGapMaxM: meters(0.004),
  placementGapRatio: 0.006,
});

export const SKETCH_BOX_FREE_PLACEMENT_POLICY = Object.freeze({
  verticalSlackDefaultM: SKETCH_BOX_FREE_VERTICAL_POLICY.verticalSlackDefaultM,
  verticalSlackMinM: SKETCH_BOX_FREE_VERTICAL_POLICY.verticalSlackMinM,
  verticalSlackMaxM: SKETCH_BOX_FREE_VERTICAL_POLICY.verticalSlackMaxM,
  verticalSlackHeightRatio: SKETCH_BOX_FREE_VERTICAL_POLICY.verticalSlackHeightRatio,
  roomFloorY: SKETCH_BOX_FREE_VERTICAL_POLICY.roomFloorY,
  workspaceClampPadMinM: SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY.workspaceClampPadMinM,
  workspaceClampPadMaxM: SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY.workspaceClampPadMaxM,
  workspaceClampPadHeightRatio: SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY.workspaceClampPadHeightRatio,
  wallSnapBandMinM: SKETCH_BOX_FREE_WALL_SNAP_POLICY.wallSnapBandMinM,
  wallSnapBandMaxM: SKETCH_BOX_FREE_WALL_SNAP_POLICY.wallSnapBandMaxM,
  wallSnapBandWidthRatio: SKETCH_BOX_FREE_WALL_SNAP_POLICY.wallSnapBandWidthRatio,
  removeInsetMinM: SKETCH_BOX_FREE_REMOVE_POLICY.removeInsetMinM,
  removeInsetMaxM: SKETCH_BOX_FREE_REMOVE_POLICY.removeInsetMaxM,
  removeInsetRatio: SKETCH_BOX_FREE_REMOVE_POLICY.removeInsetRatio,
  removeInsetHalfRatioMax: SKETCH_BOX_FREE_REMOVE_POLICY.removeInsetHalfRatioMax,
  removeHalfMinM: SKETCH_BOX_FREE_REMOVE_POLICY.removeHalfMinM,
  attachPadMinM: SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY.attachPadMinM,
  attachPadMaxM: SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY.attachPadMaxM,
  attachPadSizeRatio: SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY.attachPadSizeRatio,
  attachEdgeMinM: SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY.attachEdgeMinM,
  attachEdgeHalfRatio: SKETCH_BOX_FREE_ATTACH_CANDIDATE_POLICY.attachEdgeHalfRatio,
  attachIntentMinOverlapMinM: SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentMinOverlapMinM,
  attachIntentMinOverlapMaxM: SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentMinOverlapMaxM,
  attachIntentMinOverlapRatio: SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentMinOverlapRatio,
  attachIntentEdgeBandMinM: SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentEdgeBandMinM,
  attachIntentEdgeBandMaxM: SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentEdgeBandMaxM,
  attachIntentEdgeBandRatio: SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentEdgeBandRatio,
  attachIntentEdgeDominanceMinM: SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentEdgeDominanceMinM,
  attachIntentEdgeDominanceMaxM: SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentEdgeDominanceMaxM,
  attachIntentEdgeDominanceRatio: SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentEdgeDominanceRatio,
  attachIntentOutsideBiasMinM: SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentOutsideBiasMinM,
  attachIntentOutsideBiasMaxM: SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentOutsideBiasMaxM,
  attachIntentOutsideBiasRatio: SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentOutsideBiasRatio,
  attachIntentEdgeBiasMinM: SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentEdgeBiasMinM,
  attachIntentEdgeBiasMaxM: SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentEdgeBiasMaxM,
  attachIntentEdgeBiasRatio: SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentEdgeBiasRatio,
  attachIntentScoreBiasMinM: SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentScoreBiasMinM,
  attachIntentScoreBiasMaxM: SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentScoreBiasMaxM,
  attachIntentScoreBiasRatio: SKETCH_BOX_FREE_ATTACH_INTENT_POLICY.attachIntentScoreBiasRatio,
  placementGapDefaultM: SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY.placementGapDefaultM,
  placementGapMinM: SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY.placementGapMinM,
  placementGapMaxM: SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY.placementGapMaxM,
  placementGapRatio: SKETCH_BOX_FREE_PLACEMENT_GAP_POLICY.placementGapRatio,
});
