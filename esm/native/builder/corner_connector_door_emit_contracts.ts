import type { AppContainer, BuilderCreateDoorVisualFn, Object3DLike } from '../../../types';
import type { readDoorTrimMap } from '../features/door_trim.js';

type CornerWingMaterialsResult = ReturnType<typeof import('./corner_materials.js').createCornerWingMaterials>;

type ValueRecord = Record<string, unknown>;

type CornerPointLike = { x: number; z: number; y?: number };
type NodeLike = Object3DLike;
type GroupLike = Object3DLike;
type Vector3Like = {
  applyEuler(value: unknown): Vector3Like;
  normalize(): Vector3Like;
  lengthSq(): number;
  dot(value: unknown): number;
};

type ThreeCornerConnectorLike = {
  Group: new () => GroupLike;
  Vector3: new (x: number, y: number, z: number) => Vector3Like;
  Mesh: new (geometry: unknown, material: unknown) => NodeLike;
  BoxGeometry: new (width: number, height: number, depth: number) => unknown;
  MeshBasicMaterial: new (params: ValueRecord) => unknown;
  DoubleSide: unknown;
};

type CornerConnectorDoorHelpers = ValueRecord & {
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
  asRecord: (value: unknown) => ValueRecord;
  reportErrorThrottled: typeof import('../runtime/api.js').reportErrorThrottled;
};

export type CornerConnectorDoorContext = {
  App: AppContainer;
  THREE: ThreeCornerConnectorLike;
  woodThick: number;
  startY: number;
  wingH: number;
  uiAny: ValueRecord;
  splitDoors: boolean;
  doorStyle: string;
  groovesEnabled: boolean;
  getGroove: unknown;
  getCurtain: unknown;
  readScopedReader: CornerWingMaterialsResult['readScopedReader'];
  resolveSpecial: CornerWingMaterialsResult['resolveSpecial'];
  getMirrorMat: CornerWingMaterialsResult['getMirrorMat'];
  getCornerMat: CornerWingMaterialsResult['getCornerMat'];
  frontMat: unknown;
  createDoorVisual: BuilderCreateDoorVisualFn;
  addOutlines: (mesh: unknown) => void;
  removeDoorsEnabled: boolean;
  isDoorRemoved: (partId: string) => boolean;
  config: ValueRecord | null | undefined;
  stackKey: string;
  stackSplitEnabled: boolean;
  stackScopePartKey: (partId: unknown) => string;
  pts: CornerPointLike[];
  interiorX: number;
  interiorZ: number;
  panelThick: number;
  showFrontPanel: boolean;
  cornerGroup: GroupLike;
  addEdgePanel: (a: CornerPointLike, b: CornerPointLike, partId: string, visible: boolean) => void;
  getCfg: CornerConnectorDoorHelpers['getCfg'];
  readMapOrEmpty: CornerConnectorDoorHelpers['readMapOrEmpty'];
  readSplitPosListFromMap: CornerConnectorDoorHelpers['readSplitPosListFromMap'];
  isSplitEnabledInMap: CornerConnectorDoorHelpers['isSplitEnabledInMap'];
  isSplitExplicitInMap: CornerConnectorDoorHelpers['isSplitExplicitInMap'];
  isSplitBottomEnabledInMap: CornerConnectorDoorHelpers['isSplitBottomEnabledInMap'];
  getOrCreateCacheRecord: CornerConnectorDoorHelpers['getOrCreateCacheRecord'];
  MODES: CornerConnectorDoorHelpers['MODES'];
  isPrimaryMode: CornerConnectorDoorHelpers['isPrimaryMode'];
  isLongEdgeHandleVariantForPart: CornerConnectorDoorHelpers['__isLongEdgeHandleVariantForPart'];
  topSplitHandleInsetForPart: CornerConnectorDoorHelpers['__topSplitHandleInsetForPart'];
  edgeHandleLongLiftAbsYForCornerCells: CornerConnectorDoorHelpers['__edgeHandleLongLiftAbsYForCornerCells'];
  edgeHandleAlignedBaseAbsYForCornerCells: CornerConnectorDoorHelpers['__edgeHandleAlignedBaseAbsYForCornerCells'];
  clampHandleAbsYForPart: CornerConnectorDoorHelpers['__clampHandleAbsYForPart'];
  asRecord: CornerConnectorDoorHelpers['asRecord'];
  readModulesConfigurationListFromConfigSnapshot: CornerConnectorDoorHelpers['readModulesConfigurationListFromConfigSnapshot'];
  reportErrorThrottled: CornerConnectorDoorHelpers['reportErrorThrottled'];
  cfg0: ValueRecord;
  doorTrimMap: ReturnType<typeof readDoorTrimMap>;
  splitMap0: ValueRecord;
  splitBottomMap0: ValueRecord;
  mount: GroupLike;
  len: number;
  doorW: number;
  effectiveTopLimit: number;
  doorBottomY: number;
  doorH: number;
  doorCenterY: number;
  zOut: number;
  outwardZSign: 1 | -1;
  splitGap: number;
  splitLineY: number;
  bottomLineY: number;
  render: ValueRecord | null;
};

export type CornerConnectorDoorState = {
  doorIndex: 1 | 2;
  doorBaseId: string;
  scopedDoorBaseId: string;
  hingeSide: 'left' | 'right';
  pivotX: number;
  meshOffset: number;
  topSplitEnabled: boolean;
  bottomSplitEnabled: boolean;
  shouldSplit: boolean;
  defaultHandleAbsY: number;
};
