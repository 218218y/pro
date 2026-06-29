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

type GeometryScalarNormalizer = (value: unknown) => BuilderRuntimeGeometryScalar;

function hasOwn(source: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(source, key);
}

export function normalizeBuilderRuntimeGeometryScalar(value: unknown): BuilderRuntimeGeometryScalar {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function normalizeBuilderDraftGeometryScalar(value: unknown): BuilderRuntimeGeometryScalar {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return normalizeBuilderRuntimeGeometryScalar(value);
}

export function readBuilderRuntimeGeometryNumber(value: unknown, defaultValue: number): number {
  const normalized = normalizeBuilderRuntimeGeometryScalar(value);
  return typeof normalized === 'number' ? normalized : defaultValue;
}

export function readBuilderDraftGeometryNumber(value: unknown, defaultValue: number): number {
  const normalized = normalizeBuilderDraftGeometryScalar(value);
  return typeof normalized === 'number' ? normalized : defaultValue;
}

function normalizeGeometryFields<T extends UnknownRecord>(
  source: T,
  keys: readonly GeometryScalarKey[],
  normalizeScalar: GeometryScalarNormalizer
): T {
  const out: UnknownRecord = { ...source };
  for (const key of keys) {
    if (hasOwn(out, key)) out[key] = normalizeScalar(out[key]);
  }
  return out as T;
}

function normalizeRecordListValue(
  value: unknown,
  keys: readonly GeometryScalarKey[],
  normalizeScalar: GeometryScalarNormalizer
): UnknownRecord[] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Array.isArray(value)) return [];
  const out: UnknownRecord[] = [];
  for (const item of value) {
    const rec = asRecord<UnknownRecord>(item);
    if (rec) out.push(normalizeGeometryFields(rec, keys, normalizeScalar));
  }
  return out;
}

function normalizeRecordListField(
  source: UnknownRecord,
  key: string,
  keys: readonly GeometryScalarKey[],
  normalizeScalar: GeometryScalarNormalizer
): void {
  if (hasOwn(source, key)) source[key] = normalizeRecordListValue(source[key], keys, normalizeScalar);
}

function normalizeSketchBoxListValue(
  value: unknown,
  normalizeScalar: GeometryScalarNormalizer
): UnknownRecord[] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Array.isArray(value)) return [];
  const boxes: UnknownRecord[] = [];
  for (const item of value) {
    const rec = asRecord<UnknownRecord>(item);
    if (!rec) continue;
    const box = normalizeGeometryFields(rec, SKETCH_BOX_GEOMETRY_SCALAR_KEYS, normalizeScalar);
    normalizeRecordListField(box, 'dividers', SKETCH_DIVIDER_GEOMETRY_SCALAR_KEYS, normalizeScalar);
    normalizeRecordListField(box, 'horizontalDividers', SKETCH_DIVIDER_GEOMETRY_SCALAR_KEYS, normalizeScalar);
    normalizeRecordListField(box, 'shelves', SKETCH_SHELF_GEOMETRY_SCALAR_KEYS, normalizeScalar);
    normalizeRecordListField(
      box,
      'storageBarriers',
      SKETCH_STORAGE_BARRIER_GEOMETRY_SCALAR_KEYS,
      normalizeScalar
    );
    normalizeRecordListField(box, 'rods', SKETCH_ROD_GEOMETRY_SCALAR_KEYS, normalizeScalar);
    normalizeRecordListField(box, 'drawers', SKETCH_DRAWER_GEOMETRY_SCALAR_KEYS, normalizeScalar);
    normalizeRecordListField(box, 'extDrawers', SKETCH_EXTERNAL_DRAWER_GEOMETRY_SCALAR_KEYS, normalizeScalar);
    normalizeRecordListField(
      box,
      'regularExtDrawers',
      SKETCH_EXTERNAL_DRAWER_GEOMETRY_SCALAR_KEYS,
      normalizeScalar
    );
    normalizeRecordListField(box, 'doors', SKETCH_BOX_DOOR_GEOMETRY_SCALAR_KEYS, normalizeScalar);
    boxes.push(box);
  }
  return boxes;
}

function normalizeBuilderSketchExtrasGeometryWith(
  value: unknown,
  normalizeScalar: GeometryScalarNormalizer
): BuilderSketchExtrasLike | null {
  const extra = asRecord<UnknownRecord>(value);
  if (!extra) return null;
  const out: UnknownRecord = { ...extra };
  normalizeRecordListField(out, 'shelves', SKETCH_SHELF_GEOMETRY_SCALAR_KEYS, normalizeScalar);
  if (hasOwn(out, 'boxes')) out.boxes = normalizeSketchBoxListValue(out.boxes, normalizeScalar);
  normalizeRecordListField(
    out,
    'storageBarriers',
    SKETCH_STORAGE_BARRIER_GEOMETRY_SCALAR_KEYS,
    normalizeScalar
  );
  normalizeRecordListField(out, 'rods', SKETCH_ROD_GEOMETRY_SCALAR_KEYS, normalizeScalar);
  normalizeRecordListField(out, 'drawers', SKETCH_DRAWER_GEOMETRY_SCALAR_KEYS, normalizeScalar);
  normalizeRecordListField(out, 'extDrawers', SKETCH_EXTERNAL_DRAWER_GEOMETRY_SCALAR_KEYS, normalizeScalar);
  return out as BuilderSketchExtrasLike;
}

export function normalizeBuilderSketchExtrasGeometry(value: unknown): BuilderSketchExtrasLike | null {
  return normalizeBuilderSketchExtrasGeometryWith(value, normalizeBuilderRuntimeGeometryScalar);
}

export function normalizeBuilderDraftSketchExtrasGeometry(value: unknown): BuilderSketchExtrasLike | null {
  return normalizeBuilderSketchExtrasGeometryWith(value, normalizeBuilderDraftGeometryScalar);
}

export function normalizeInteriorSketchRuntimeGeometryArgs<T extends BuilderInteriorSketchArgsLike>(
  value: T
): T {
  const out: UnknownRecord = { ...value };
  for (const key of INTERIOR_SKETCH_INPUT_GEOMETRY_SCALAR_KEYS) {
    if (hasOwn(out, key)) out[key] = normalizeBuilderRuntimeGeometryScalar(out[key]);
  }
  const sketchExtras = normalizeBuilderSketchExtrasGeometry(out.sketchExtras);
  if (sketchExtras) out.sketchExtras = sketchExtras;
  return out as T;
}
