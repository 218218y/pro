import type { AppContainer, UnknownCallable } from '../../../types';

import type {
  InteriorDimensionLineFn,
  RenderInteriorSketchInput,
  RenderInteriorSketchOpsDeps,
  SketchBoxExtra,
  SketchDrawerExtra,
  SketchExternalDrawerExtra,
  SketchRodExtra,
  SketchShelfExtra,
  SketchStorageBarrierExtra,
} from './render_interior_sketch_shared.js';
import type {
  InteriorGroupLike,
  InteriorOpsCallable,
  InteriorTHREESurface,
  InteriorValueRecord,
} from './render_interior_ops_contracts.js';
import type {
  SketchModuleDoorFaceSpan,
  SketchModuleInnerFaces,
} from './render_interior_sketch_module_geometry.js';
import type { RenderSketchFreeWardrobeBox } from './render_interior_sketch_boxes_shared.js';
import type { SketchFreeBoxDimensionEntry } from './render_interior_sketch_layout.js';
import type { SketchPlacementSupport } from './render_interior_sketch_support.js';

export type RenderInteriorSketchOpsContext = {
  app: RenderInteriorSketchOpsDeps['app'];
  ops: RenderInteriorSketchOpsDeps['ops'];
  wardrobeGroup: RenderInteriorSketchOpsDeps['wardrobeGroup'];
  doors: RenderInteriorSketchOpsDeps['doors'];
  markSplitHoverPickablesDirty: RenderInteriorSketchOpsDeps['markSplitHoverPickablesDirty'] | null;
  isFn: (value: unknown) => value is UnknownCallable;
  asObject: RenderInteriorSketchOpsDeps['asObject'];
  matCache: RenderInteriorSketchOpsDeps['matCache'];
  renderOpsHandleCatch: RenderInteriorSketchOpsDeps['renderOpsHandleCatch'];
  assertTHREE: RenderInteriorSketchOpsDeps['assertTHREE'];
  applyInternalDrawersOps: RenderInteriorSketchOpsDeps['applyInternalDrawersOps'];
  measureWardrobeLocalBox: (App: AppContainer) => RenderSketchFreeWardrobeBox | null;
};

export type InteriorSketchExtrasInput = {
  App: AppContainer;
  renderOps: InteriorValueRecord | null;
  input: RenderInteriorSketchInput;
  shelves: SketchShelfExtra[];
  boxes: SketchBoxExtra[];
  storageBarriers: SketchStorageBarrierExtra[];
  rods: SketchRodExtra[];
  drawers: SketchDrawerExtra[];
  extDrawers: SketchExternalDrawerExtra[];
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
  moduleDepth: number;
  moduleIndex: number;
  modulesLength: number;
  moduleKeyStr: string;
  currentShelfMat: unknown;
  bodyMat: unknown;
  getPartMaterial?: InteriorOpsCallable;
  getPartColorValue?: InteriorOpsCallable;
  createDoorVisual?: InteriorOpsCallable | null;
  faces: SketchModuleInnerFaces | null;
  moduleDoorFaceSpan: SketchModuleDoorFaceSpan | null;
  braceCenterX: number;
  braceShelfWidth: number;
  regularShelfWidth: number;
  regularDepth: number;
  backZ: number;
};

export type InteriorSketchDimensionOverlayContext = {
  THREE: InteriorTHREESurface;
  addDimensionLine: InteriorDimensionLineFn;
  entries: SketchFreeBoxDimensionEntry[];
};

export type InteriorSketchResolvedThree = {
  THREE: InteriorTHREESurface | null;
  addDimensionLine: InteriorDimensionLineFn | null;
  freeBoxDimensionOverlayContext: InteriorSketchDimensionOverlayContext | null;
  renderFreeBoxDimensionsEnabled: boolean;
  freeBoxDimensionEntries: SketchFreeBoxDimensionEntry[] | null;
};

export type InteriorSketchPlacementPlan = {
  placementSupport: SketchPlacementSupport;
};
