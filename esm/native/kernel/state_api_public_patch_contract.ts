import type {
  ActionRootPatchPayload,
  ConfigNonMapPatch,
  MetaSlicePatch,
  ModeSlicePatch,
  PublicUiPatch,
  RuntimeSlicePatch,
  UnknownRecord,
} from '../../../types';
import {
  PUBLIC_CONFIG_PATCH_KEYS,
  PUBLIC_META_PATCH_KEYS,
  PUBLIC_MODE_PATCH_KEYS,
  PUBLIC_ROOT_PATCH_KEYS,
  PUBLIC_RUNTIME_PATCH_KEYS,
  PUBLIC_UI_PATCH_KEYS,
  PUBLIC_UI_RAW_PATCH_KEYS,
} from '../../../types/public_patch_keys.js';
import { isUiRawBooleanKey, isUiRawNumericKey, isUiRawStringKey } from '../../../types/ui_raw.js';
import { isKnownMapName } from '../runtime/maps_access_normalizers.js';

const ROOT_KEYS = new Set<string>(PUBLIC_ROOT_PATCH_KEYS);
const UI_KEYS = new Set<string>(PUBLIC_UI_PATCH_KEYS);
const UI_RAW_KEYS = new Set<string>(PUBLIC_UI_RAW_PATCH_KEYS);
const RUNTIME_KEYS = new Set<string>(PUBLIC_RUNTIME_PATCH_KEYS);
const CONFIG_KEYS = new Set<string>(PUBLIC_CONFIG_PATCH_KEYS);
const MODE_KEYS = new Set<string>(PUBLIC_MODE_PATCH_KEYS);
const META_KEYS = new Set<string>(PUBLIC_META_PATCH_KEYS);

function isRecord(value: unknown): value is UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function readOptionalRecord(value: unknown, label: string): UnknownRecord {
  if (typeof value === 'undefined') return {};
  if (!isRecord(value)) {
    throw new TypeError(`[WardrobePro] ${label} must be a plain object.`);
  }
  return value;
}

function assertAllowedKeys(record: UnknownRecord, allowed: ReadonlySet<string>, label: string): void {
  const unexpected = Object.keys(record).filter(key => !allowed.has(key));
  if (!unexpected.length) return;
  throw new Error(`[WardrobePro] ${label} rejects unknown key(s): ${unexpected.join(', ')}.`);
}

function assertUiRawValue(key: string, value: unknown, label: string): void {
  if (isUiRawBooleanKey(key)) {
    if (typeof value === 'boolean') return;
    throw new TypeError(`[WardrobePro] ${label}.${key} must be boolean.`);
  }
  if (isUiRawStringKey(key)) {
    if (typeof value === 'string') return;
    throw new TypeError(`[WardrobePro] ${label}.${key} must be string.`);
  }
  if (isUiRawNumericKey(key)) {
    if (value === null || (typeof value === 'number' && Number.isFinite(value))) return;
    throw new TypeError(`[WardrobePro] ${label}.${key} must be a finite number or null.`);
  }
}

export function decodePublicUiPatch(value: unknown, apiName: string): PublicUiPatch {
  const record = readOptionalRecord(value, apiName);
  assertAllowedKeys(record, UI_KEYS, apiName);

  if (Object.prototype.hasOwnProperty.call(record, 'raw')) {
    const raw = readOptionalRecord(record.raw, `${apiName}.raw`);
    assertAllowedKeys(raw, UI_RAW_KEYS, `${apiName}.raw`);
    for (const key of Object.keys(raw)) assertUiRawValue(key, raw[key], `${apiName}.raw`);
    return { ...record, raw: { ...raw } } as PublicUiPatch;
  }

  return { ...record } as PublicUiPatch;
}

export function decodePublicRuntimePatch(value: unknown, apiName: string): RuntimeSlicePatch {
  const record = readOptionalRecord(value, apiName);
  assertAllowedKeys(record, RUNTIME_KEYS, apiName);
  return { ...record } as RuntimeSlicePatch;
}

export function decodePublicModePatch(value: unknown, apiName: string): ModeSlicePatch {
  const record = readOptionalRecord(value, apiName);
  assertAllowedKeys(record, MODE_KEYS, apiName);
  if (Object.prototype.hasOwnProperty.call(record, 'opts') && !isRecord(record.opts)) {
    throw new TypeError(`[WardrobePro] ${apiName}.opts must be a plain object.`);
  }
  return { ...record } as ModeSlicePatch;
}

export function decodePublicMetaPatch(value: unknown, apiName: string): MetaSlicePatch {
  const record = readOptionalRecord(value, apiName);
  assertAllowedKeys(record, META_KEYS, apiName);
  if (Object.prototype.hasOwnProperty.call(record, 'dirty') && typeof record.dirty !== 'boolean') {
    throw new TypeError(`[WardrobePro] ${apiName}.dirty must be boolean.`);
  }
  return { ...record } as MetaSlicePatch;
}

export function decodePublicConfigPatch(value: unknown, apiName: string): ConfigNonMapPatch {
  const record = readOptionalRecord(value, apiName);
  const mapKeys = Object.keys(record).filter(isKnownMapName);
  if (mapKeys.length) {
    throw new Error(
      `[WardrobePro] ${apiName} cannot write known config map branches (${mapKeys.join(
        ', '
      )}); use applyProjectSnapshot/applyPaintSnapshot or a semantic map writer.`
    );
  }
  assertAllowedKeys(record, CONFIG_KEYS, apiName);
  return { ...record } as ConfigNonMapPatch;
}

export function decodePublicActionRootPatch(
  value: unknown,
  apiName = 'actions.patch'
): ActionRootPatchPayload {
  const record = readOptionalRecord(value, apiName);
  assertAllowedKeys(record, ROOT_KEYS, apiName);

  const next: ActionRootPatchPayload = {};
  if (Object.prototype.hasOwnProperty.call(record, 'ui')) {
    next.ui = decodePublicUiPatch(record.ui, `${apiName}.ui`);
  }
  if (Object.prototype.hasOwnProperty.call(record, 'config')) {
    next.config = decodePublicConfigPatch(record.config, `${apiName}.config`);
  }
  if (Object.prototype.hasOwnProperty.call(record, 'runtime')) {
    next.runtime = decodePublicRuntimePatch(record.runtime, `${apiName}.runtime`);
  }
  if (Object.prototype.hasOwnProperty.call(record, 'mode')) {
    next.mode = decodePublicModePatch(record.mode, `${apiName}.mode`);
  }
  if (Object.prototype.hasOwnProperty.call(record, 'meta')) {
    next.meta = decodePublicMetaPatch(record.meta, `${apiName}.meta`);
  }
  return next;
}
