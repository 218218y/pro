import type { Object3DLike } from '../../../types';

type ValueRecord = Record<string, unknown>;
type CornerPointLike = { x: number; z: number; y?: number };
type GroupLike = Object3DLike;

export type CornerConnectorDoorLocals = ValueRecord & {
  pts: CornerPointLike[];
  interiorX: number;
  interiorZ: number;
  panelThick: number;
  showFrontPanel: boolean;
  cornerGroup: GroupLike;
  addEdgePanel: (a: CornerPointLike, b: CornerPointLike, partId: string, visible: boolean) => void;
};

export type CornerConnectorDoorHelpers = ValueRecord & {
  getCfg: typeof import('./store_access.js').getCfg;
  readMapOrEmpty: typeof import('../runtime/maps_access.js').readMapOrEmpty;
  isSplitEnabledInMap: typeof import('../runtime/maps_access.js').isSplitEnabledInMap;
  isSplitExplicitInMap: typeof import('../runtime/maps_access.js').isSplitExplicitInMap;
  isSplitBottomEnabledInMap: typeof import('../runtime/maps_access.js').isSplitBottomEnabledInMap;
  readSplitPosListFromMap: typeof import('../runtime/maps_access.js').readSplitPosListFromMap;
  readModulesConfigurationListFromConfigSnapshot: typeof import('../features/modules_configuration/modules_config_api.js').readModulesConfigurationListFromConfigSnapshot;
  getOrCreateCacheRecord: typeof import('./corner_cache.js').getOrCreateCacheRecord;
  MODES: ValueRecord & { REMOVE_DOOR?: string };
  isPrimaryMode: typeof import('./corner_ops_emit_common.js').isPrimaryMode;
  __isLongEdgeHandleVariantForPart: typeof import('./corner_geometry_plan.js').__isLongEdgeHandleVariantForPart;
  __topSplitHandleInsetForPart: typeof import('./corner_geometry_plan.js').__topSplitHandleInsetForPart;
  __edgeHandleLongLiftAbsYForCornerCells: typeof import('./corner_geometry_plan.js').__edgeHandleLongLiftAbsYForCornerCells;
  __edgeHandleAlignedBaseAbsYForCornerCells: typeof import('./corner_geometry_plan.js').__edgeHandleAlignedBaseAbsYForCornerCells;
  __clampHandleAbsYForPart: typeof import('./corner_geometry_plan.js').__clampHandleAbsYForPart;
  isRecord: (value: unknown) => value is ValueRecord;
  asRecord: (value: unknown) => ValueRecord;
  reportErrorThrottled: typeof import('../runtime/api.js').reportErrorThrottled;
};

export type CornerConnectorDoorFlowParams = {
  ctx: unknown;
  locals: CornerConnectorDoorLocals;
  helpers: CornerConnectorDoorHelpers;
};
