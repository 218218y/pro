import type { AppContainer, UnknownCallable } from '../../../types';

import type {
  InteriorGroupLike,
  InteriorMaterialLike,
  InteriorOpsCallable,
  InteriorTHREESurface,
  InteriorValueRecord,
} from './render_interior_ops_contracts.js';

import type {
  InteriorDimensionLineFn,
  RenderInteriorSketchInput,
  SketchBoxExtra,
} from './render_interior_sketch_shared.js';
import type {
  SketchBoxDividerState,
  SketchBoxSegment,
  SketchFreeBoxDimensionEntry,
} from './render_interior_sketch_layout.js';

export type RenderSketchBoxAbsEntry = {
  y: number;
  halfH: number;
  innerW: number;
  centerX: number;
  innerD: number;
  innerBackZ: number;
};

export type RenderSketchFreeWardrobeBox = {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
};

export type RenderInteriorSketchBoxesArgs = {
  App: AppContainer;
  input: RenderInteriorSketchInput;
  boxes: SketchBoxExtra[];
  createBoard: InteriorOpsCallable;
  group: InteriorGroupLike;
  effectiveBottomY: number;
  effectiveTopY: number;
  spanH: number;
  innerW: number;
  woodThick: number;
  internalDepth: number;
  internalCenterX: number;
  internalZ: number;
  moduleIndex: number;
  moduleKeyStr: string;
  currentShelfMat: unknown;
  bodyMat: unknown;
  getPartMaterial?: InteriorOpsCallable;
  getPartColorValue?: InteriorOpsCallable;
  createDoorVisual?: InteriorOpsCallable | null;
  THREE: InteriorTHREESurface | null;
  addDimensionLine: InteriorDimensionLineFn | null;
  renderFreeBoxDimensionsEnabled: boolean;
  freeBoxDimensionEntries?: SketchFreeBoxDimensionEntry[] | null;
  measureWardrobeLocalBox: (App: AppContainer) => RenderSketchFreeWardrobeBox | null;
  clampY: (y: number) => number;
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
  isFn: (value: unknown) => value is UnknownCallable;
  asObject: <T extends object = InteriorValueRecord>(x: unknown) => T | null;
  ops: InteriorValueRecord | null;
  doorsArray: unknown[];
  markSplitHoverPickablesDirty?: (App: AppContainer) => void;
  renderOpsHandleCatch: (
    App: AppContainer | null | undefined,
    op: string,
    err: unknown,
    extra?: InteriorValueRecord,
    opts?: { throttleMs?: number; failFast?: boolean }
  ) => void;
  applyInternalDrawersOps: (args: InteriorValueRecord) => unknown;
};

export type RenderSketchBoxGeometry = {
  outerW: number;
  innerW: number;
  centerX: number;
  outerD: number;
  centerZ: number;
  innerBackZ: number;
  innerD: number;
};

export type ResolvedSketchBoxState = {
  box: SketchBoxExtra;
  boxId: string;
  boxPid: string;
  isFreePlacement: boolean;
  height: number;
  halfH: number;
  centerY: number;
  sideH: number;
  boxMat: unknown;
  geometry: RenderSketchBoxGeometry;
  innerBottomY: number;
  innerTopY: number;
  regularDepth: number;
  frontZ: number;
};

export type ResolveSketchBoxDrawerSpanResult = {
  segment: SketchBoxSegment | null;
  innerW: number;
  innerCenterX: number;
  outerW: number;
  outerCenterX: number;
  faceW: number;
  faceCenterX: number;
};

export type ResolveSketchBoxDrawerSpan = (
  item: InteriorValueRecord | null
) => ResolveSketchBoxDrawerSpanResult;

export type SketchBoxYFromNorm = (rawNorm: unknown, itemHalfH: number) => number | null;

export type RenderSketchBoxShellResult = {
  state: ResolvedSketchBoxState;
  absEntry: RenderSketchBoxAbsEntry | null;
};

export type RenderSketchBoxContentsArgs = {
  shell: ResolvedSketchBoxState;
  boxDividers: SketchBoxDividerState[];
  yFromBoxNorm: SketchBoxYFromNorm;
  resolveBoxDrawerSpan: ResolveSketchBoxDrawerSpan;
  args: RenderInteriorSketchBoxesArgs;
};

export type RenderSketchBoxFrontsArgs = RenderSketchBoxContentsArgs;
