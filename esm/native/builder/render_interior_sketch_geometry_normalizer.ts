import type {
  BuilderInteriorSketchArgsLike,
  BuilderRuntimeGeometryScalar,
  BuilderSketchExtrasLike,
  UnknownRecord,
} from '../../../types';
import { asRecord } from '../runtime/record.js';

const INTERIOR_SKETCH_INPUT_GEOMETRY_SCALAR_KEYS = [
  'effectiveBottomY',
  'effectiveTopY',
  'localGridStep',
  'innerW',
  'woodThick',
  'shelfThick',
  'internalDepth',
  'internalCenterX',
  'internalZ',
  'D',
  'modulesLength',
  'startY',
  'moduleDoors',
  'externalW',
  'externalCenterX',
] as const;

const SKETCH_DIVIDER_GEOMETRY_SCALAR_KEYS = ['xNorm', 'yNorm', 'frontZ'] as const;
const SKETCH_SHELF_GEOMETRY_SCALAR_KEYS = ['xNorm', 'yNorm', 'depthM'] as const;
const SKETCH_STORAGE_BARRIER_GEOMETRY_SCALAR_KEYS = ['xNorm', 'yNorm', 'heightM', 'hM'] as const;
const SKETCH_ROD_GEOMETRY_SCALAR_KEYS = ['xNorm', 'yNorm'] as const;
const SKETCH_DRAWER_GEOMETRY_SCALAR_KEYS = ['xNorm', 'yNorm', 'yNormC', 'drawerHeightM'] as const;
const SKETCH_EXTERNAL_DRAWER_GEOMETRY_SCALAR_KEYS = [
  'xNorm',
  'yNorm',
  'yNormC',
  'drawerHeightM',
  'count',
] as const;
const SKETCH_BOX_DOOR_GEOMETRY_SCALAR_KEYS = ['xNorm', 'yNorm', 'grooveLinesCount'] as const;
const SKETCH_BOX_GEOMETRY_SCALAR_KEYS = [
  'heightM',
  'hM',
  'widthM',
  'depthM',
  'absX',
  'absY',
  'xNorm',
  'yNorm',
  'baseLegPlatformSideOverhangCm',
  'baseLegPlatformFrontOverhangCm',
  'basePlinthHeightCm',
  'baseLegHeightCm',
  'baseLegWidthCm',
] as const;

type GeometryScalarKey =
  | (typeof INTERIOR_SKETCH_INPUT_GEOMETRY_SCALAR_KEYS)[number]
  | (typeof SKETCH_DIVIDER_GEOMETRY_SCALAR_KEYS)[number]
  | (typeof SKETCH_SHELF_GEOMETRY_SCALAR_KEYS)[number]
  | (typeof SKETCH_STORAGE_BARRIER_GEOMETRY_SCALAR_KEYS)[number]
  | (typeof SKETCH_ROD_GEOMETRY_SCALAR_KEYS)[number]
  | (typeof SKETCH_DRAWER_GEOMETRY_SCALAR_KEYS)[number]
  | (typeof SKETCH_EXTERNAL_DRAWER_GEOMETRY_SCALAR_KEYS)[number]
  | (typeof SKETCH_BOX_DOOR_GEOMETRY_SCALAR_KEYS)[number]
  | (typeof SKETCH_BOX_GEOMETRY_SCALAR_KEYS)[number];

export function normalizeBuilderRuntimeGeometryScalar(value: unknown): BuilderRuntimeGeometryScalar {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function readBuilderRuntimeGeometryNumber(value: unknown, defaultValue: number): number {
  const normalized = normalizeBuilderRuntimeGeometryScalar(value);
  return typeof normalized === 'number' ? normalized : defaultValue;
}

function normalizeGeometryFields<T extends UnknownRecord>(source: T, keys: readonly GeometryScalarKey[]): T {
  const out: UnknownRecord = { ...source };
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      out[key] = normalizeBuilderRuntimeGeometryScalar(out[key]);
    }
  }
  return out as T;
}

function normalizeRecordList(value: unknown, keys: readonly GeometryScalarKey[]): UnknownRecord[] {
  if (!Array.isArray(value)) return [];
  const out: UnknownRecord[] = [];
  for (const item of value) {
    const rec = asRecord<UnknownRecord>(item);
    if (rec) out.push(normalizeGeometryFields(rec, keys));
  }
  return out;
}

function normalizeSketchBoxList(value: unknown): UnknownRecord[] {
  if (!Array.isArray(value)) return [];
  const boxes: UnknownRecord[] = [];
  for (const item of value) {
    const rec = asRecord<UnknownRecord>(item);
    if (!rec) continue;
    const box = normalizeGeometryFields(rec, SKETCH_BOX_GEOMETRY_SCALAR_KEYS);
    box.dividers = normalizeRecordList(box.dividers, SKETCH_DIVIDER_GEOMETRY_SCALAR_KEYS);
    box.horizontalDividers = normalizeRecordList(box.horizontalDividers, SKETCH_DIVIDER_GEOMETRY_SCALAR_KEYS);
    box.shelves = normalizeRecordList(box.shelves, SKETCH_SHELF_GEOMETRY_SCALAR_KEYS);
    box.storageBarriers = normalizeRecordList(
      box.storageBarriers,
      SKETCH_STORAGE_BARRIER_GEOMETRY_SCALAR_KEYS
    );
    box.rods = normalizeRecordList(box.rods, SKETCH_ROD_GEOMETRY_SCALAR_KEYS);
    box.drawers = normalizeRecordList(box.drawers, SKETCH_DRAWER_GEOMETRY_SCALAR_KEYS);
    box.extDrawers = normalizeRecordList(box.extDrawers, SKETCH_EXTERNAL_DRAWER_GEOMETRY_SCALAR_KEYS);
    box.regularExtDrawers = normalizeRecordList(
      box.regularExtDrawers,
      SKETCH_EXTERNAL_DRAWER_GEOMETRY_SCALAR_KEYS
    );
    box.doors = normalizeRecordList(box.doors, SKETCH_BOX_DOOR_GEOMETRY_SCALAR_KEYS);
    boxes.push(box);
  }
  return boxes;
}

export function normalizeBuilderSketchExtrasGeometry(value: unknown): BuilderSketchExtrasLike | null {
  const extra = asRecord<UnknownRecord>(value);
  if (!extra) return null;
  return {
    ...extra,
    shelves: normalizeRecordList(extra.shelves, SKETCH_SHELF_GEOMETRY_SCALAR_KEYS),
    boxes: normalizeSketchBoxList(extra.boxes),
    storageBarriers: normalizeRecordList(extra.storageBarriers, SKETCH_STORAGE_BARRIER_GEOMETRY_SCALAR_KEYS),
    rods: normalizeRecordList(extra.rods, SKETCH_ROD_GEOMETRY_SCALAR_KEYS),
    drawers: normalizeRecordList(extra.drawers, SKETCH_DRAWER_GEOMETRY_SCALAR_KEYS),
    extDrawers: normalizeRecordList(extra.extDrawers, SKETCH_EXTERNAL_DRAWER_GEOMETRY_SCALAR_KEYS),
  } as BuilderSketchExtrasLike;
}

export function normalizeInteriorSketchRuntimeGeometryArgs<T extends BuilderInteriorSketchArgsLike>(
  value: T
): T {
  const out: UnknownRecord = { ...value };
  for (const key of INTERIOR_SKETCH_INPUT_GEOMETRY_SCALAR_KEYS) {
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      out[key] = normalizeBuilderRuntimeGeometryScalar(out[key]);
    }
  }
  const sketchExtras = normalizeBuilderSketchExtrasGeometry(out.sketchExtras);
  if (sketchExtras) out.sketchExtras = sketchExtras;
  return out as T;
}
