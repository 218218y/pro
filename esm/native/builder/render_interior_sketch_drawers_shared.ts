import type { AppContainer, DrawerVisualEntryLike, UnknownCallable } from '../../../types';

import type {
  InteriorGroupLike,
  InteriorOpsCallable,
  InteriorTHREESurface,
  InteriorValueRecord,
} from './render_interior_ops_contracts.js';

import type {
  ApplyInternalSketchDrawersArgs,
  RenderInteriorSketchInput,
  SketchDrawerExtra,
  SketchExternalDrawerExtra,
} from './render_interior_sketch_shared.js';
import type { SketchModuleDoorFaceSpan } from './render_interior_sketch_module_geometry.js';

export type SketchDrawersCatchReporter = (
  App: AppContainer | null | undefined,
  op: string,
  err: unknown,
  extra?: InteriorValueRecord,
  opts?: { throttleMs?: number; failFast?: boolean }
) => void;

export type ApplySketchExternalDrawersArgs = {
  App: AppContainer;
  input: RenderInteriorSketchInput;
  drawers: SketchDrawerExtra[];
  extDrawers: SketchExternalDrawerExtra[];
  THREE: InteriorTHREESurface | null;
  group: InteriorGroupLike;
  effectiveBottomY: number;
  effectiveTopY: number;
  spanH: number;
  innerW: number;
  moduleDepth: number;
  internalDepth: number;
  internalCenterX: number;
  internalZ: number;
  moduleIndex: number;
  moduleKeyStr: string;
  woodThick: number;
  shelfThick: number;
  bodyMat: unknown;
  currentBraceShelfMat?: unknown;
  createBoard: InteriorOpsCallable;
  getPartMaterial?: InteriorOpsCallable;
  getPartColorValue?: InteriorOpsCallable;
  moduleDoorFaceSpan: SketchModuleDoorFaceSpan | null;
  isFn: (value: unknown) => value is UnknownCallable;
  renderOpsHandleCatch: SketchDrawersCatchReporter;
};

export type ApplySketchInternalDrawersOwnerArgs = {
  App: AppContainer;
  input: RenderInteriorSketchInput;
  drawers: SketchDrawerExtra[];
  extDrawers: SketchExternalDrawerExtra[];
  THREE: InteriorTHREESurface | null;
  group: InteriorGroupLike;
  effectiveBottomY: number;
  effectiveTopY: number;
  spanH: number;
  woodThick: number;
  innerW: number;
  internalDepth: number;
  internalCenterX: number;
  internalZ: number;
  moduleIndex: number;
  moduleKeyStr: string;
  bodyMat: unknown;
  currentShelfMat?: unknown;
  createBoard?: InteriorOpsCallable;
  getPartMaterial?: InteriorOpsCallable;
  getPartColorValue?: InteriorOpsCallable;
  applyInternalDrawersOps: (args: InteriorValueRecord) => unknown;
  renderOpsHandleCatch: SketchDrawersCatchReporter;
};

export type ApplySketchInternalDrawersRuntimeArgs = ApplyInternalSketchDrawersArgs & {
  input: RenderInteriorSketchInput;
  moduleIndex: number;
  moduleKeyStr: string;
  effectiveBottomY: number;
  effectiveTopY: number;
  spanH: number;
  woodThick: number;
  innerW: number;
  internalDepth: number;
  internalCenterX: number;
  internalZ: number;
  drawers: SketchDrawerExtra[];
};

export function createSketchDrawerMotionPoint(
  THREE: InteriorTHREESurface,
  x: number,
  y: number,
  z: number
): DrawerVisualEntryLike['closed'] {
  return typeof THREE.Vector3 === 'function' ? new THREE.Vector3(x, y, z) : { x, y, z };
}

export function resolveSketchExternalDrawerModuleIndexValue(
  moduleKeyStr: string,
  moduleIndex: number
): string | number {
  return moduleKeyStr || (moduleIndex >= 0 ? String(moduleIndex) : '');
}

export function resolveSketchExternalDrawerStackKey(
  input: RenderInteriorSketchInput,
  moduleKeyStr: string
): 'top' | 'bottom' {
  if (typeof input.stackKey === 'string') {
    return String(input.stackKey) === 'bottom' ? 'bottom' : 'top';
  }
  return typeof moduleKeyStr === 'string' && moduleKeyStr.startsWith('lower_') ? 'bottom' : 'top';
}
