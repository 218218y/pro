import type { UnknownCallable } from '../../../types';
import { asRecord as readRecord } from '../runtime/record.js';

import type {
  InteriorGeometryLike,
  InteriorMaterialLike,
  InteriorMeshLike,
  InteriorValueRecord,
} from './render_interior_ops_contracts.js';

import type {
  InteriorDimensionLineFn,
  RenderInteriorSketchInput,
} from './render_interior_sketch_shared_types.js';

export function readObject<T extends object>(value: unknown): T | null {
  return readRecord<T>(value);
}

export function asSketchInput(value: unknown): RenderInteriorSketchInput {
  return readObject<RenderInteriorSketchInput>(value) || {};
}

export function asValueRecord(value: unknown): InteriorValueRecord | null {
  return readObject<InteriorValueRecord>(value);
}

export function asRecordArray<T extends InteriorValueRecord = InteriorValueRecord>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter((item): item is T => !!item && typeof item === 'object') : [];
}

export function asMesh(value: unknown): InteriorMeshLike | null {
  return readObject<InteriorMeshLike>(value);
}

export function asMaterial(value: unknown): InteriorMaterialLike | null {
  return readObject<InteriorMaterialLike>(value);
}

export function asGeometry(value: unknown): InteriorGeometryLike | null {
  return readObject<InteriorGeometryLike>(value);
}

export function asDimensionLineFn(value: unknown): InteriorDimensionLineFn | null {
  if (typeof value !== 'function') return null;
  return (from, to, textOffset, label, scale, labelShift) =>
    Reflect.apply(value, null, [from, to, textOffset, label, scale, labelShift]);
}

export function readNullableStringMap(value: unknown): Record<string, string | null | undefined> | null {
  const rec = asValueRecord(value);
  if (!rec) return null;
  const out: Record<string, string | null | undefined> = {};
  for (const [key, entry] of Object.entries(rec)) {
    if (typeof entry === 'string') out[key] = entry;
    else if (entry === null) out[key] = null;
    else if (typeof entry === 'undefined') out[key] = undefined;
  }
  return out;
}

export function readUnknownMap(value: unknown): InteriorValueRecord | null {
  return asValueRecord(value);
}

export function isCallable(value: unknown): value is UnknownCallable {
  return typeof value === 'function';
}
