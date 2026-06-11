// Corner wing cell shared typed seams.
//
// Keep runtime requirements, typed flow params, and low-level guards centralized
// so the public cell owner and the dedicated door pipeline can stay focused on
// orchestration instead of re-declaring the same contracts.

import type { CornerCell } from './corner_geometry_plan.js';
export type { CornerCell, CornerCellCfg } from './corner_geometry_plan.js';
import type {
  AppContainer,
  BuilderCreateDoorVisualFn,
  BuilderCreateInternalDrawerBoxFn,
} from '../../../types';
export type { MirrorLayoutList } from '../../../types';
import type { CornerOpsEmitContext } from './corner_ops_emit_common.js';

export type CornerWingMaterialsResult = ReturnType<
  typeof import('./corner_materials.js').createCornerWingMaterials
>;

export type ValueRecord = Record<string, unknown>;

export type NodeLike = {
  position: { set(x: number, y: number, z: number): void; copy(value: unknown): void };
  rotation: { x?: number; y?: number; z?: number };
  scale: { x?: number; y?: number; z?: number };
  userData: ValueRecord;
  material?: unknown;
  name?: string;
  castShadow?: boolean;
  receiveShadow?: boolean;
  renderOrder?: number;
};

export type GroupLike = NodeLike & {
  add(obj: unknown): void;
};

export type AddRealisticHangerLike = (
  rodX: number,
  rodY: number,
  rodZ: number,
  parentGroup: GroupLike,
  moduleWidth?: number,
  enabledOverride?: boolean
) => unknown;
export type AddHangingClothesLike = (
  rodX: number,
  rodY: number,
  rodZ: number,
  width: number,
  parentGroup: GroupLike,
  maxHeight: number,
  isRestrictedDepth?: boolean | number,
  showContentsOverride?: boolean,
  doorStyleOverride?: unknown
) => unknown;
export type AddFoldedClothesLike = (
  shelfX: number,
  shelfY: number,
  shelfZ: number,
  width: number,
  parentGroup: GroupLike,
  maxHeight?: number,
  maxDepth?: number
) => unknown;

export type ThreeCornerCellLike = {
  CylinderGeometry: new (
    radiusTop: number,
    radiusBottom: number,
    height: number,
    radialSegments: number
  ) => unknown;
  BoxGeometry: new (width: number, height: number, depth: number) => unknown;
  MeshStandardMaterial?: new (params: ValueRecord) => unknown;
  MeshBasicMaterial: new (params: ValueRecord) => unknown;
  Mesh: new (geometry: unknown, material: unknown) => NodeLike;
  Group: new () => GroupLike;
  Vector3: new (x: number, y: number, z: number) => unknown;
  DoubleSide?: unknown;
};

export type SlotMetaLike = {
  slotBottomY?: number;
  slotTopY?: number;
  slotAvailableHeight?: number;
};

export type DoorGeomLike = {
  cell: CornerCell | null;
  doorW: number;
  dX: number;
};

export type CornerRenderLike = ValueRecord & {
  drawersArray?: unknown[];
  doorsArray?: unknown[];
};

export type CornerMaterialsLike = ValueRecord & {
  front: unknown;
};

export type CornerWingCellContextLike = CornerOpsEmitContext &
  ValueRecord & {
    __readScopedMapVal: CornerWingMaterialsResult['readScopedMapVal'];
  };

export type CornerWingCellLocalsLike = ValueRecord & {
  render: CornerRenderLike | null;
  materials: CornerMaterialsLike;
  cornerCells: CornerCell[];
  doorCount: number;
  __defaultDoorW: number;
  __cornerSharedLongEdgeHandleLiftAbsY: number;
  __cornerSharedAlignedEdgeHandleBaseAbsY: number;
};

export type CornerWingCellHelpersLike = ValueRecord & {
  readMap: (app: AppContainer, key: string) => unknown;
  readMapOrEmpty: (app: AppContainer, key: string) => ValueRecord;
  readSplitPosListFromMap: (map: unknown, baseId: string) => number[];
  getCfg: (app: AppContainer) => ValueRecord;
  MODES: ValueRecord & { REMOVE_DOOR?: string };
  getOrCreateCacheRecord: (app: unknown, key: string) => ValueRecord;
  isPrimaryMode: (app: unknown, mode: string) => boolean;
  __isLongEdgeHandleVariantForPart: (
    cfg: ValueRecord | null | undefined,
    partId: string | number | null | undefined
  ) => boolean;
  __topSplitHandleInsetForPart: (cfg: ValueRecord | null | undefined, partId: string) => number;
  __edgeHandleLongLiftAbsYForCell: typeof import('./corner_geometry_plan.js').__edgeHandleLongLiftAbsYForCell;
  __edgeHandleLongLiftAbsYForCornerCells: typeof import('./corner_geometry_plan.js').__edgeHandleLongLiftAbsYForCornerCells;
  __edgeHandleAlignedBaseAbsYForCornerCells: typeof import('./corner_geometry_plan.js').__edgeHandleAlignedBaseAbsYForCornerCells;
  __clampHandleAbsYForPart: (
    cfg: ValueRecord | null | undefined,
    partId: string,
    absY: number,
    segBottomY: number,
    segTopY: number
  ) => number;
  isRecord: (value: unknown) => value is ValueRecord;
  asRecord: (value: unknown) => ValueRecord;
  readNumFrom: (obj: unknown, key: string, fallback: number) => number;
};

export type CornerWingCellFlowParams = {
  ctx: CornerWingCellContextLike;
  locals: CornerWingCellLocalsLike;
  helpers: CornerWingCellHelpersLike;
};

export function readCurtainType(value: unknown): string | null | undefined {
  if (typeof value === 'string') return value;
  if (value === null) return null;
  if (typeof value === 'undefined') return undefined;
  return String(value);
}

export function isValueRecord(value: unknown): value is ValueRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isGroupLike(value: unknown): value is GroupLike {
  return (
    isValueRecord(value) &&
    typeof value.add === 'function' &&
    isValueRecord(value.position) &&
    typeof value.position.set === 'function' &&
    typeof value.position.copy === 'function' &&
    isValueRecord(value.rotation) &&
    isValueRecord(value.scale) &&
    isValueRecord(value.userData)
  );
}

function isThreeCornerCellLike(value: unknown): value is ThreeCornerCellLike {
  return (
    isValueRecord(value) &&
    typeof value.CylinderGeometry === 'function' &&
    typeof value.BoxGeometry === 'function' &&
    typeof value.MeshBasicMaterial === 'function' &&
    typeof value.Mesh === 'function' &&
    typeof value.Group === 'function' &&
    typeof value.Vector3 === 'function'
  );
}

function isAddOutlinesFn(value: unknown): value is (mesh: unknown) => void {
  return typeof value === 'function';
}

function isCreateDoorVisualFn(value: unknown): value is BuilderCreateDoorVisualFn {
  return typeof value === 'function';
}

function isCreateInternalDrawerBoxFn(value: unknown): value is BuilderCreateInternalDrawerBoxFn {
  return typeof value === 'function';
}

function isAddRealisticHangerLike(value: unknown): value is AddRealisticHangerLike {
  return typeof value === 'function';
}

function isAddHangingClothesLike(value: unknown): value is AddHangingClothesLike {
  return typeof value === 'function';
}

function isAddFoldedClothesLike(value: unknown): value is AddFoldedClothesLike {
  return typeof value === 'function';
}

export function requireGroupLike(value: unknown, key: string): GroupLike {
  if (isGroupLike(value)) return value;
  throw new TypeError(`[corner_wing_cell_emit] Missing ${key}`);
}

export function requireThreeCornerCellLike(value: unknown): ThreeCornerCellLike {
  if (isThreeCornerCellLike(value)) return value;
  throw new TypeError('[corner_wing_cell_emit] Missing THREE constructors');
}

export function requireAddOutlines(value: unknown): (mesh: unknown) => void {
  if (isAddOutlinesFn(value)) return value;
  throw new TypeError('[corner_wing_cell_emit] Missing addOutlines');
}

export function requireCreateDoorVisual(value: unknown): BuilderCreateDoorVisualFn {
  if (isCreateDoorVisualFn(value)) return value;
  throw new TypeError('[corner_wing_cell_emit] Missing createDoorVisual');
}

export function requireCreateInternalDrawerBox(value: unknown): BuilderCreateInternalDrawerBoxFn {
  if (isCreateInternalDrawerBoxFn(value)) return value;
  throw new TypeError('[corner_wing_cell_emit] Missing createInternalDrawerBox');
}

export function requireAddRealisticHanger(value: unknown): AddRealisticHangerLike {
  if (isAddRealisticHangerLike(value)) return value;
  throw new TypeError('[corner_wing_cell_emit] Missing addRealisticHanger');
}

export function requireAddHangingClothes(value: unknown): AddHangingClothesLike {
  if (isAddHangingClothesLike(value)) return value;
  throw new TypeError('[corner_wing_cell_emit] Missing addHangingClothes');
}

export function requireAddFoldedClothes(value: unknown): AddFoldedClothesLike {
  if (isAddFoldedClothesLike(value)) return value;
  throw new TypeError('[corner_wing_cell_emit] Missing addFoldedClothes');
}
