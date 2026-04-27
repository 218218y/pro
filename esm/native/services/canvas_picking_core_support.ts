// Core support helper seam for canvas picking.
//
// Reporting/error wrappers, meta/history helpers, numeric/module-key helpers,
// and local record coercion now live on dedicated focused seams.

export type { ModuleKey } from './canvas_picking_core_support_numbers.js';

export {
  __wp_toError,
  __wp_reportPickingIssue,
  __wp_commitHistoryTouch,
} from './canvas_picking_core_support_errors.js';

export {
  __wp_metaUiOnly,
  __wp_metaNoBuild,
  __wp_historyBatch,
  __wp_str,
} from './canvas_picking_core_support_meta.js';

export {
  __wp_toFiniteNumber,
  __wp_toModuleKey,
  __wp_isCornerKey,
  __edgeHandleVariantPartKey,
  __normEdgeHandleVariant,
  __asNum,
  __asInt,
} from './canvas_picking_core_support_numbers.js';

export {
  __wp_isRecord,
  __wp_asRecord,
  __wp_readRecordValue,
  __wp_readRecordArray,
  __wp_readRecordBoolean,
  __wp_readRecordNumber,
  __wp_readRecordString,
  __wp_isDefaultCornerCellCfgLike,
  __wp_getApp,
} from './canvas_picking_core_support_records.js';
