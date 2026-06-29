import type { AppContainer, UnknownCallable } from '../../../types';
import type {
  InteriorGeometryLike,
  InteriorGroupLike,
  InteriorMaterialLike,
  InteriorMeshLike,
  InteriorOpsCallable,
  InteriorTHREESurface,
  InteriorValueRecord,
  RenderInteriorOpsDeps,
} from './render_interior_ops_contracts.js';
import { readRenderOpNumberOr } from './render_ops_number_contracts.js';
import {
  buildInteriorRenderIndexSet,
  buildInteriorShelfVariantByIndex,
  readInteriorRenderGridDivisions,
  readInteriorRenderGridIndex,
  readInteriorRenderInteger,
  type InteriorShelfVariant,
} from './render_interior_ops_index_contracts.js';

export type InteriorCustomInput = InteriorValueRecord & {
  THREE?: unknown;
  customOps?: InteriorValueRecord | null;
  ops?: InteriorValueRecord | null;
  createBoard?: InteriorOpsCallable;
  createRod?: InteriorOpsCallable;
  addFoldedClothes?: InteriorOpsCallable;
  addOutlines?: InteriorOpsCallable;
  sketchMode?: unknown;
  wardrobeGroup?: InteriorGroupLike | null;
  gridDivisions?: unknown;
  effectiveBottomY?: unknown;
  effectiveTopY?: unknown;
  localGridStep?: unknown;
  innerW?: unknown;
  woodThick?: unknown;
  shelfThick?: unknown;
  internalDepth?: unknown;
  internalCenterX?: unknown;
  internalZ?: unknown;
  D?: unknown;
  moduleIndex?: unknown;
  modulesLength?: unknown;
  moduleKey?: unknown;
  frameSidePartIdPrefix?: unknown;
  currentShelfMat?: unknown;
  currentBraceShelfMat?: unknown;
  bodyMat?: unknown;
  braceShelves?: unknown;
  isInternalDrawersEnabled?: unknown;
  showContentsEnabled?: unknown;
  cfg?: InteriorValueRecord;
  getPartMaterial?: InteriorOpsCallable;
  getPartColorValue?: InteriorOpsCallable;
};

export type InteriorRodMapEntry = InteriorValueRecord & {
  gridIndex?: unknown;
  yFactor?: unknown;
  yAdd?: unknown;
  limitFactor?: unknown;
  limitAdd?: unknown;
  enableHangingClothes?: unknown;
  enableSingleHanger?: unknown;
};

export type ShelfVariant = InteriorShelfVariant;

export type InteriorCustomModuleFaces = {
  leftX: number;
  rightX: number;
};

export type InteriorCustomBraceMetrics = {
  regularDepth: number;
  regularZ: number;
  regularShelfWidth: number;
  braceShelfWidth: number;
  braceCenterX: number;
  leftInnerX: number;
  rightInnerX: number;
};

export type InteriorCustomHandleCatch = RenderInteriorOpsDeps['renderOpsHandleCatch'];

export function __isFn(v: unknown): v is UnknownCallable {
  return typeof v === 'function';
}

export function isRecord(value: unknown): value is InteriorValueRecord {
  return !!value && typeof value === 'object';
}

export function asCustomInput(value: unknown): InteriorCustomInput {
  return isRecord(value) ? value : {};
}

export function asRecord(value: unknown): InteriorValueRecord | null {
  return isRecord(value) ? value : null;
}

export function asMesh(value: unknown): InteriorMeshLike | null {
  return asRecord(value);
}

export function asMaterial(value: unknown): InteriorMaterialLike | null {
  return asRecord(value);
}

export function asGeometry(value: unknown): InteriorGeometryLike | null {
  return asRecord(value);
}

export function readRodMapEntry(value: unknown): InteriorRodMapEntry | null {
  return asRecord(value);
}

export function isCustomThreeSurface(value: unknown): value is InteriorTHREESurface {
  const rec = asRecord(value);
  return !!(
    rec &&
    typeof rec.Mesh === 'function' &&
    typeof rec.BoxGeometry === 'function' &&
    typeof rec.CylinderGeometry === 'function' &&
    typeof rec.MeshBasicMaterial === 'function' &&
    typeof rec.MeshStandardMaterial === 'function'
  );
}

export function readCustomThreeSurface(value: unknown): InteriorTHREESurface | null {
  return isCustomThreeSurface(value) ? value : null;
}

export function readModuleKeyString(input: InteriorCustomInput, moduleIndex: number): string {
  return input.moduleKey != null ? String(input.moduleKey) : moduleIndex >= 0 ? String(moduleIndex) : '';
}

export function readCustomRenderNumber(value: unknown, defaultValue: number): number {
  return readRenderOpNumberOr(value, defaultValue);
}

export function readCustomRenderInteger(value: unknown, defaultValue: number): number {
  return readInteriorRenderInteger(value, defaultValue);
}

export function readCustomRenderGridIndex(value: unknown): number | null {
  return readInteriorRenderGridIndex(value);
}

export function readGridDivisions(value: unknown, defaultValue = 6): number {
  return readInteriorRenderGridDivisions(value, defaultValue);
}

export function buildBraceShelfIndexSet(input: InteriorCustomInput): Record<number, true> {
  return buildInteriorRenderIndexSet(input.braceShelves);
}

export function buildShelfIndexSet(ops: InteriorValueRecord): Record<number, true> {
  return buildInteriorRenderIndexSet(ops.shelves);
}

export function buildShelfVariantByIndex(ops: InteriorValueRecord): Record<number, ShelfVariant> {
  return buildInteriorShelfVariantByIndex(ops.shelfVariants);
}

export function buildRodMap(ops: InteriorValueRecord): Record<number, InteriorRodMapEntry> {
  const rodMap: Record<number, InteriorRodMapEntry> = Object.create(null);
  if (!Array.isArray(ops.rods)) return rodMap;
  for (let i = 0; i < ops.rods.length; i += 1) {
    const rod = readRodMapEntry(ops.rods[i]);
    if (!rod) continue;
    const gridIndex = readCustomRenderGridIndex(rod.gridIndex != null ? rod.gridIndex : rod.yFactor);
    if (gridIndex == null) continue;
    rodMap[gridIndex] = rod;
  }
  return rodMap;
}

export function reportInteriorCustomSoft(
  App: AppContainer,
  renderOpsHandleCatch: InteriorCustomHandleCatch,
  op: string,
  err: unknown
): void {
  renderOpsHandleCatch(App, op, err, undefined, { failFast: false, throttleMs: 5000 });
}
