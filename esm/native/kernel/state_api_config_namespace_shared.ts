import type { ActionMetaLike, ConfigSlicePatch, UnknownRecord } from '../../../types';
import { asRecord, isRecord } from '../runtime/record.js';

export function asConfigPatch(v: unknown): ConfigSlicePatch {
  return toConfigPatch(v);
}

export function configSlicePatchFromKey(k: string, nextVal: unknown): ConfigSlicePatch {
  return { [k]: nextVal };
}

export function toConfigPatch(value: unknown): ConfigSlicePatch {
  const out: ConfigSlicePatch = {};
  const rec = asRecord(value);
  if (rec) Object.assign(out, rec);
  return out;
}

export function buildConfigPatch(value: UnknownRecord): ConfigSlicePatch {
  const out: ConfigSlicePatch = {};
  Object.assign(out, value);
  return out;
}

export function readActionMeta(value: unknown): ActionMetaLike {
  const meta: ActionMetaLike = {};
  const rec = asRecord(value);
  if (rec) Object.assign(meta, rec);
  return meta;
}

export function readUnknownArray(value: unknown): unknown[] {
  return Array.isArray(value) ? [...value] : [];
}

export function readConfigMapUpdater(
  value: unknown
): ((nextDraft: UnknownRecord, curVal: UnknownRecord) => unknown) | null {
  return typeof value === 'function'
    ? (nextDraft, curVal) => Reflect.apply(value, undefined, [nextDraft, curVal])
    : null;
}

export function readConfigScalarResolver(
  value: unknown
): ((prev: unknown, cfg?: UnknownRecord) => unknown) | null {
  return typeof value === 'function' ? (prev, cfg) => Reflect.apply(value, undefined, [prev, cfg]) : null;
}

export function commitConfigWrite(
  commitConfigPatch: (patch: ConfigSlicePatch, meta: ActionMetaLike) => unknown,
  cfgPatch: ConfigSlicePatch,
  meta: ActionMetaLike
): ConfigSlicePatch {
  try {
    commitConfigPatch(cfgPatch, meta);
    return cfgPatch;
  } catch (_e) {
    return cfgPatch;
  }
}

function shallowValueEqual(prev: unknown, next: unknown): boolean {
  if (Object.is(prev, next)) return true;
  if (Array.isArray(prev) && Array.isArray(next)) {
    if (prev.length !== next.length) return false;
    for (let i = 0; i < prev.length; i += 1) {
      if (!Object.is(prev[i], next[i])) return false;
    }
    return true;
  }
  if (isRecord(prev) && isRecord(next)) {
    const prevObj = prev;
    const nextObj = next;
    const prevKeys = Object.keys(prevObj);
    const nextKeys = Object.keys(nextObj);
    if (prevKeys.length !== nextKeys.length) return false;
    for (let i = 0; i < prevKeys.length; i += 1) {
      const key = prevKeys[i];
      if (!Object.prototype.hasOwnProperty.call(nextObj, key)) return false;
      if (!Object.is(prevObj[key], nextObj[key])) return false;
    }
    return true;
  }
  return false;
}

export function reuseEquivalentValue(prev: unknown, next: unknown): unknown {
  return shallowValueEqual(prev, next) ? prev : next;
}
