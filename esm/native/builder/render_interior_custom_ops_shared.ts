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

export type InteriorCustomInput = InteriorValueRecord & {
  THREE?: unknown;
  customOps?: InteriorValueRecord | null;
  ops?: InteriorValueRecord | null;
  createBoard?: InteriorOpsCallable;
  createRod?: InteriorOpsCallable;
  addFoldedClothes?: InteriorOpsCallable;
  checkAndCreateInternalDrawer?: InteriorOpsCallable;
  wardrobeGroup?: InteriorGroupLike | null;
  gridDivisions?: unknown;
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
  isInternalDrawersEnabled?: unknown;
  intDrawersList?: unknown;
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

export type ShelfVariant = 'double' | 'glass' | 'brace' | 'regular';

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

export function readGridDivisions(value: unknown, fallback = 6): number {
  const gridDivisions = parseInt(String(value ?? ''), 10);
  return Number.isFinite(gridDivisions) && gridDivisions >= 1 ? gridDivisions : fallback;
}

export function buildBraceShelfIndexSet(input: InteriorCustomInput): Record<number, true> {
  const braceSet: Record<number, true> = Object.create(null);
  const braceShelves = Array.isArray(input.braceShelves) ? input.braceShelves : [];
  for (let i = 0; i < braceShelves.length; i += 1) {
    const value = parseInt(String(braceShelves[i] ?? ''), 10);
    if (Number.isFinite(value)) braceSet[value] = true;
  }
  return braceSet;
}

export function buildShelfIndexSet(ops: InteriorValueRecord): Record<number, true> {
  const shelfSet: Record<number, true> = Object.create(null);
  if (!Array.isArray(ops.shelves)) return shelfSet;
  for (let i = 0; i < ops.shelves.length; i += 1) {
    const idx = parseInt(String(ops.shelves[i] ?? ''), 10);
    if (Number.isFinite(idx)) shelfSet[idx] = true;
  }
  return shelfSet;
}

export function buildShelfVariantByIndex(ops: InteriorValueRecord): Record<number, ShelfVariant> {
  const shelfVariantByIndex: Record<number, ShelfVariant> = Object.create(null);
  try {
    const shelfVariants = asRecord(ops.shelfVariants);
    if (!shelfVariants || Array.isArray(shelfVariants)) return shelfVariantByIndex;
    for (const key in shelfVariants) {
      if (!Object.prototype.hasOwnProperty.call(shelfVariants, key)) continue;
      const idx = parseInt(key, 10);
      if (!Number.isFinite(idx)) continue;
      const rawValue = shelfVariants[key];
      const value = typeof rawValue === 'string' ? rawValue.trim().toLowerCase() : '';
      if (value === 'double' || value === 'glass' || value === 'brace' || value === 'regular') {
        shelfVariantByIndex[idx] = value;
      }
    }
  } catch {
    // keep legacy runtime permissive here; invalid shelfVariants should not block custom op rendering
  }
  return shelfVariantByIndex;
}

export function buildRodMap(ops: InteriorValueRecord): Record<number, InteriorRodMapEntry> {
  const rodMap: Record<number, InteriorRodMapEntry> = Object.create(null);
  if (!Array.isArray(ops.rods)) return rodMap;
  for (let i = 0; i < ops.rods.length; i += 1) {
    const rod = readRodMapEntry(ops.rods[i]);
    if (!rod) continue;
    const gridIndex = parseInt(String(rod.gridIndex != null ? rod.gridIndex : (rod.yFactor ?? '')), 10);
    if (!Number.isFinite(gridIndex)) continue;
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
