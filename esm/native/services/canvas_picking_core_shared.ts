// Shared canvas picking helper primitives.
//
// Public seam for canvas-picking low-level helpers. Support/reporting,
// runtime/config access, and raycast refs now live in dedicated owner modules so
// callers can keep importing this canonical surface without carrying one giant
// helper file.

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
  __wp_isRecord,
  __wp_asRecord,
  __wp_readRecordValue,
  __wp_readRecordArray,
  __wp_readRecordBoolean,
  __wp_readRecordNumber,
  __wp_readRecordString,
  __wp_isDefaultCornerCellCfgLike,
  __wp_getApp,
} from './canvas_picking_core_support.js';

export {
  __wp_primaryMode,
  __wp_ui,
  __wp_cfg,
  __wp_map,
  __wp_isSplitBottom,
  __wp_isSplit,
  __wp_isSplitExplicit,
  __wp_isMultiMode,
  __wp_triggerRender,
  __wp_toast,
  __wp_getCanvasPickingRuntime,
} from './canvas_picking_core_runtime.js';

export {
  __wp_asRaycaster,
  __wp_asMouseVector,
  __wp_asHitObject,
  __wp_ensurePickingRefs,
  __wp_raycastReuse,
} from './canvas_picking_core_raycast.js';
