import { readUiStateFromApp } from '../runtime/root_state_access.js';
import { getCfg } from './store_access.js';
import { readDoorStyleMap } from '../features/door_style_overrides.js';

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

import { asValueRecord, readObject } from './render_interior_sketch_shared.js';

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
  moduleIndex: number;
  moduleKeyStr: string;
  woodThick: number;
  bodyMat: unknown;
  getPartMaterial?: InteriorOpsCallable;
  moduleDoorFaceSpan: SketchModuleDoorFaceSpan | null;
  isFn: (value: unknown) => value is UnknownCallable;
  renderOpsHandleCatch: SketchDrawersCatchReporter;
};

export type ApplySketchInternalDrawersOwnerArgs = {
  App: AppContainer;
  input: RenderInteriorSketchInput;
  drawers: SketchDrawerExtra[];
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

export function normalizeSketchDoorStyle(value: unknown): 'flat' | 'profile' | 'tom' {
  const raw = String(value == null ? '' : value)
    .trim()
    .toLowerCase();
  return raw === 'profile' || raw === 'tom' || raw === 'flat' ? raw : 'flat';
}

export function resolveSketchDoorStyle(
  App: AppContainer,
  input: RenderInteriorSketchInput
): 'flat' | 'profile' | 'tom' {
  const inputRec = asValueRecord(input);
  const inputUi = asValueRecord(inputRec?.ui);
  const configRec = asValueRecord(inputRec?.config);
  const cfgRec = asValueRecord(inputRec?.cfg);
  const appUi = asValueRecord(readUiStateFromApp(App));
  return normalizeSketchDoorStyle(
    inputUi?.doorStyle ?? appUi?.doorStyle ?? configRec?.doorStyle ?? cfgRec?.doorStyle ?? 'flat'
  );
}

export function resolveSketchDoorStyleMap(App: AppContainer, input: RenderInteriorSketchInput) {
  const inputRec = asValueRecord(input);
  const configRec = asValueRecord(inputRec?.config);
  const cfgRec = asValueRecord(inputRec?.cfg);
  const appCfg = readObject<InteriorValueRecord>(getCfg(App));
  return readDoorStyleMap(configRec?.doorStyleMap ?? cfgRec?.doorStyleMap ?? appCfg?.doorStyleMap);
}

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
