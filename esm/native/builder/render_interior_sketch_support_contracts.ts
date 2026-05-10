import type { AppContainer, UnknownCallable } from '../../../types';

import type {
  InteriorGroupLike,
  InteriorMaterialLike,
  InteriorOpsCallable,
  InteriorTHREESurface,
  InteriorValueRecord,
} from './render_interior_ops_contracts.js';
import type {
  SketchRodExtra,
  SketchShelfExtra,
  SketchStorageBarrierExtra,
} from './render_interior_sketch_shared.js';
import type { SketchModuleInnerFaces } from './render_interior_sketch_module_geometry.js';

export type SketchBoxLocatorResult = {
  innerW: number;
  centerX: number;
  innerD: number;
  innerBackZ: number;
};

export type CreateInteriorSketchPlacementSupportArgs = {
  App: AppContainer;
  group: InteriorGroupLike;
  effectiveBottomY: number;
  effectiveTopY: number;
  woodThick: number;
  innerW: number;
  internalDepth: number;
  internalCenterX: number;
  matCache: (App: AppContainer) => InteriorValueRecord;
  THREE: InteriorTHREESurface | null;
  asObject: <T extends object = InteriorValueRecord>(value: unknown) => T | null;
  renderOpsHandleCatch: (
    App: AppContainer | null | undefined,
    op: string,
    err: unknown,
    extra?: InteriorValueRecord,
    opts?: { throttleMs?: number; failFast?: boolean }
  ) => void;
  faces: SketchModuleInnerFaces | null;
};

export type SketchPlacementSupport = {
  clampY: (y: number) => number;
  yFromNorm: (yNorm: unknown) => number | null;
  glassMat: InteriorMaterialLike | null;
  addBraceDarkSeams: (
    shelfY: number,
    shelfZ: number,
    shelfDepth: number,
    isBrace: boolean,
    THREE: InteriorTHREESurface | null,
    leftFaceXOverride?: number | null,
    rightFaceXOverride?: number | null
  ) => void;
  addShelfPins: (
    shelfX: number,
    shelfY: number,
    shelfZ: number,
    shelfW: number,
    shelfH: number,
    shelfDepth: number,
    enabled: boolean
  ) => void;
};

export type ApplySketchStorageBarriersArgs = {
  storageBarriers: SketchStorageBarrierExtra[];
  effectiveBottomY: number;
  effectiveTopY: number;
  spanH: number;
  woodThick: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  moduleKeyStr: string;
  bodyMat: unknown;
  getPartMaterial?: InteriorOpsCallable;
  isFn: (value: unknown) => value is UnknownCallable;
  createBoard: InteriorOpsCallable;
};

export type ApplySketchShelvesArgs = {
  shelves: SketchShelfExtra[];
  yFromNorm: (yNorm: unknown) => number | null;
  findBoxAtY: (y: number) => SketchBoxLocatorResult | null;
  braceCenterX: number;
  braceShelfWidth: number;
  regularShelfWidth: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  regularDepth: number;
  backZ: number;
  woodThick: number;
  currentShelfMat: unknown;
  glassMat: InteriorMaterialLike | null;
  createBoard: InteriorOpsCallable;
  THREE: InteriorTHREESurface | null;
  addBraceDarkSeams: SketchPlacementSupport['addBraceDarkSeams'];
  addShelfPins: SketchPlacementSupport['addShelfPins'];
};

export type ApplySketchRodsArgs = {
  rods: SketchRodExtra[];
  yFromNorm: (yNorm: unknown) => number | null;
  createRod?: InteriorOpsCallable;
  isFn: (value: unknown) => value is UnknownCallable;
  THREE: InteriorTHREESurface | null;
  App: AppContainer;
  assertTHREE: (App: AppContainer, where: string) => unknown;
  asObject: <T extends object = InteriorValueRecord>(value: unknown) => T | null;
  innerW: number;
  internalCenterX: number;
  internalZ: number;
  group: InteriorGroupLike;
  reportSoft?: (op: string, error: unknown) => void;
};
