import type {
  ActionMetaLike,
  ActionsNamespaceLike,
  ConfigSlicePatch,
  ModeSlicePatch,
  PatchPayload,
  RuntimeSlicePatch,
  UiSlicePatch,
  UnknownRecord,
} from '../../../types';

import { asRecord, cloneRecord, isRecord } from '../runtime/record.js';

export type MetaNs = NonNullable<ActionsNamespaceLike['meta']>;
export type SetCfgScalarFn = NonNullable<ActionsNamespaceLike['setCfgScalar']>;

export const PROJECT_CONFIG_REPLACE_KEYS: Record<string, true> = {
  modulesConfiguration: true,
  stackSplitLowerModulesConfiguration: true,
  cornerConfiguration: true,
  groovesMap: true,
  grooveLinesCountMap: true,
  splitDoorsMap: true,
  splitDoorsBottomMap: true,
  removedDoorsMap: true,
  drawerDividersMap: true,
  individualColors: true,
  doorSpecialMap: true,
  doorStyleMap: true,
  mirrorLayoutMap: true,
  doorTrimMap: true,
  savedColors: true,
  colorSwatchesOrder: true,
  savedNotes: true,
  preChestState: true,
  handlesMap: true,
  hingeMap: true,
  curtainMap: true,
};

export const PAINT_CONFIG_REPLACE_KEYS: readonly string[] = [
  'individualColors',
  'curtainMap',
  'doorSpecialMap',
];
export const MODULES_GEOMETRY_REPLACE_KEYS: Record<string, true> = {
  modulesConfiguration: true,
};

export function cloneMetaObject(meta: ActionMetaLike | UnknownRecord | null | undefined): ActionMetaLike {
  return cloneRecord(meta);
}

export function asMeta(meta: ActionMetaLike | UnknownRecord | null | undefined): ActionMetaLike {
  return cloneMetaObject(meta);
}

export function normMeta(
  meta: ActionMetaLike | UnknownRecord | null | undefined,
  source: string
): ActionMetaLike {
  const next = cloneMetaObject(meta);
  if (source && !next.source) next.source = source;
  return next;
}

export function mergeMetaWithDefaults(
  meta: ActionMetaLike | UnknownRecord | null | undefined,
  defaults: ActionMetaLike,
  sourceFallback: string
): ActionMetaLike {
  const next = cloneMetaObject(meta);
  if (sourceFallback && !next.source) next.source = sourceFallback;
  for (const key in defaults) {
    if (!Object.prototype.hasOwnProperty.call(defaults, key)) continue;
    if (typeof next[key] === 'undefined') next[key] = defaults[key];
  }
  return next;
}

export function asPatchPayload(payload: unknown): PatchPayload {
  return isRecord(payload) ? { ...payload } : {};
}

export function asUiPatch(patch: unknown): UiSlicePatch {
  return isRecord(patch) ? { ...patch } : {};
}

export function asRuntimePatch(patch: unknown): RuntimeSlicePatch {
  return isRecord(patch) ? { ...patch } : {};
}

export function asModePatch(patch: unknown): ModeSlicePatch {
  return isRecord(patch) ? { ...patch } : {};
}

export function asConfigPatch(patch: unknown): ConfigSlicePatch {
  return isRecord(patch) ? { ...patch } : {};
}

export function buildUiScalarPatch(key: string, value: unknown): UiSlicePatch {
  const patch: UiSlicePatch = {};
  patch[key] = value;
  return patch;
}

export function buildRuntimeScalarPatch(key: string, value: unknown): RuntimeSlicePatch {
  const patch: RuntimeSlicePatch = {};
  patch[key] = value;
  return patch;
}

export function hasOnlyUiSlice(payload: PatchPayload): boolean {
  return !!payload.ui && !payload.config && !payload.runtime && !payload.mode && !payload.meta;
}

const ROOT_PATCH_SLICE_KEYS: Array<keyof PatchPayload> = ['ui', 'config', 'runtime', 'mode', 'meta'];

export function countDefinedRootSlices(payload: PatchPayload): number {
  let count = 0;
  for (const key of ROOT_PATCH_SLICE_KEYS) {
    if (typeof payload[key] !== 'undefined') count += 1;
  }
  return count;
}

export function hasMultipleDefinedRootSlices(payload: PatchPayload): boolean {
  return countDefinedRootSlices(payload) > 1;
}

export function hasBuildStateOverride(override: unknown): boolean {
  const rec = asRecord(override);
  return !!(rec && (rec.ui || rec.config || rec.mode));
}

export function shallowCloneObj(v: unknown): UnknownRecord {
  const rec = asRecord(v);
  return rec ? { ...rec } : {};
}

export function safeCall(fn: () => unknown): unknown {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

export function readOptsRecord(value: unknown): UnknownRecord | null {
  return asRecord(value);
}

export function isUnknownRecord(value: unknown): value is UnknownRecord {
  return isRecord(value);
}
