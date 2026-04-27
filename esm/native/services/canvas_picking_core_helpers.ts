// Extracted canvas picking helper seams.
//
// Public seam for canvas picking helpers. Runtime primitives, door-part policy,
// and split-hover policy now live in dedicated owner modules so callers can keep
// importing this canonical surface without carrying one giant helper file.

export {
  __wp_toError,
  __wp_reportPickingIssue,
  __wp_commitHistoryTouch,
  __wp_metaUiOnly,
  __wp_metaNoBuild,
  __wp_historyBatch,
  __wp_str,
  __wp_toFiniteNumber,
  __wp_toModuleKey,
  __wp_isCornerKey,
  __edgeHandleVariantPartKey,
  __normEdgeHandleVariant,
  __asNum,
  __asInt,
  __wp_isDefaultCornerCellCfgLike,
  __wp_primaryMode,
  __wp_ui,
  __wp_cfg,
  __wp_map,
  __wp_isSplitBottom,
  __wp_isSplit,
  __wp_isSplitExplicit,
  __wp_isMultiMode,
  __wp_getApp,
  __wp_triggerRender,
  __wp_toast,
  __wp_getCanvasPickingRuntime,
  __wp_ensurePickingRefs,
  __wp_raycastReuse,
} from './canvas_picking_core_shared.js';

export {
  __wp_isRemoved,
  __wp_isDoorLikePartId,
  __wp_isDrawerLikePartId,
  __wp_isDoorOrDrawerLikePartId,
  __wp_isSegmentedDoorBaseId,
  __wp_canonDoorPartKeyForMaps,
  __wp_scopeCornerPartKeyForStack,
  __wp_scopeCornerPartKeysForStack,
  __wp_resolveNearestActionablePartFromHit,
  __wp_hingeDir,
  __wp_colorGet,
} from './canvas_picking_door_part_helpers.js';

export {
  __wp_getSplitHoverDoorBaseKey,
  __wp_readSplitHoverDoorBounds,
  __wp_getRegularSplitPreviewLineY,
  __wp_getSplitHoverRaycastRoots,
} from './canvas_picking_split_hover_helpers.js';
