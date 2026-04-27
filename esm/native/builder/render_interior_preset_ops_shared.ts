import type { AppContainer, UnknownCallable } from '../../../types';
import type {
  InteriorGroupLike,
  InteriorMaterialLike,
  InteriorMeshLike,
  InteriorOpsCallable,
  InteriorTHREESurface,
  InteriorValueRecord,
  RenderInteriorOpsDeps,
} from './render_interior_ops_contracts.js';

export type InteriorPresetInput = InteriorValueRecord & {
  THREE?: unknown;
  presetOps?: InteriorValueRecord | null;
  createBoard?: InteriorOpsCallable;
  createRod?: InteriorOpsCallable;
  addFoldedClothes?: InteriorOpsCallable;
  wardrobeGroup?: InteriorGroupLike | null;
  effectiveBottomY?: unknown;
  effectiveTopY?: unknown;
  localGridStep?: unknown;
  innerW?: unknown;
  woodThick?: unknown;
  internalDepth?: unknown;
  internalCenterX?: unknown;
  internalZ?: unknown;
  D?: unknown;
  moduleIndex?: unknown;
  modulesLength?: unknown;
  moduleKey?: unknown;
  currentShelfMat?: unknown;
  bodyMat?: unknown;
  braceShelves?: unknown;
  cfg?: InteriorValueRecord;
  getPartMaterial?: InteriorOpsCallable;
  getPartColorValue?: InteriorOpsCallable;
  isInternalDrawersEnabled?: unknown;
  intDrawersSlot?: unknown;
};

export type InteriorWallMesh = InteriorMeshLike & {
  userData?: InteriorValueRecord & { partId?: unknown };
};

export type InteriorPresetHandleCatch = RenderInteriorOpsDeps['renderOpsHandleCatch'];

export type InteriorPresetBraceMetrics = {
  regularDepth: number;
  regularZ: number;
  regularShelfWidth: number;
  braceShelfWidth: number;
  braceCenterX: number;
  leftInnerX: number;
  rightInnerX: number;
};

export function __isFn(v: unknown): v is UnknownCallable {
  return typeof v === 'function';
}

export function isRecord(value: unknown): value is InteriorValueRecord {
  return !!value && typeof value === 'object';
}

export function asPresetInput(value: unknown): InteriorPresetInput {
  return isRecord(value) ? value : {};
}

export function asRecord(value: unknown): InteriorValueRecord | null {
  return isRecord(value) ? value : null;
}

export function asMaterial(value: unknown): InteriorMaterialLike | null {
  return isRecord(value) ? value : null;
}

export function asMesh(value: unknown): InteriorWallMesh | null {
  return isRecord(value) ? value : null;
}

export function isInteriorThreeSurface(value: unknown): value is InteriorTHREESurface {
  const rec = asRecord(value);
  return !!(
    rec &&
    typeof rec.Box3 === 'function' &&
    typeof rec.Group === 'function' &&
    typeof rec.Vector3 === 'function' &&
    typeof rec.BoxGeometry === 'function' &&
    typeof rec.CylinderGeometry === 'function' &&
    typeof rec.MeshBasicMaterial === 'function' &&
    typeof rec.MeshStandardMaterial === 'function' &&
    typeof rec.Mesh === 'function'
  );
}

export function readThreeSurface(value: unknown): InteriorTHREESurface | null {
  return isInteriorThreeSurface(value) ? value : null;
}

export function readModuleKeyString(input: InteriorPresetInput, moduleIndex: number): string {
  return input.moduleKey != null ? String(input.moduleKey) : moduleIndex >= 0 ? String(moduleIndex) : '';
}

export function buildBraceShelfIndexSet(input: InteriorPresetInput): Record<number, true> {
  const braceSet: Record<number, true> = Object.create(null);
  const braceShelves = Array.isArray(input.braceShelves) ? input.braceShelves : [];
  for (let i = 0; i < braceShelves.length; i += 1) {
    const value = parseInt(String(braceShelves[i] ?? ''), 10);
    if (Number.isFinite(value)) braceSet[value] = true;
  }
  return braceSet;
}

export function readPresetNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function reportInteriorPresetSoft(
  App: AppContainer,
  renderOpsHandleCatch: InteriorPresetHandleCatch,
  op: string,
  err: unknown
): void {
  renderOpsHandleCatch(App, op, err, undefined, { failFast: false, throttleMs: 5000 });
}
