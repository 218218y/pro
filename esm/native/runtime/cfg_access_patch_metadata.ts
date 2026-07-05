import type { ConfigSlicePatch } from '../../../types/backend_patch_payload';
import type { UnknownRecord } from '../../../types';

import { asRecord, readBooleanMap } from './cfg_access_shared.js';

export const CONFIG_PATCH_REPLACE_KEY = `${'__'}replace`;

const CONFIG_PATCH_SNAPSHOT_KEY = '__snapshot';
const CONFIG_PATCH_CAPTURED_AT_KEY = '__capturedAt';

export function isConfigPatchProtocolKey(key: string): boolean {
  return (
    key === CONFIG_PATCH_REPLACE_KEY ||
    key === CONFIG_PATCH_SNAPSHOT_KEY ||
    key === CONFIG_PATCH_CAPTURED_AT_KEY
  );
}

export function readConfigPatchReplaceMap(patchObj: unknown): Record<string, boolean> | null {
  const patch = asRecord(patchObj);
  return patch ? readBooleanMap(patch[CONFIG_PATCH_REPLACE_KEY]) : null;
}

export function buildConfigPatchWithReplaceMetadata(
  patchObj: unknown,
  replaceKeys: unknown
): ConfigSlicePatch {
  const base = asRecord(patchObj) || {};
  const replaceMap: Record<string, boolean> = {};

  if (Array.isArray(replaceKeys)) {
    for (const keyValue of replaceKeys) {
      const key = typeof keyValue === 'string' ? keyValue.trim() : '';
      if (key) replaceMap[key] = true;
    }
  } else {
    const replaceRecord: UnknownRecord | null = asRecord(replaceKeys);
    if (replaceRecord) {
      for (const key of Object.keys(replaceRecord)) {
        if (!key) continue;
        if (replaceRecord[key]) replaceMap[key] = true;
      }
    }
  }

  const existing = readBooleanMap(base[CONFIG_PATCH_REPLACE_KEY]);
  const mergedReplace = existing ? { ...existing, ...replaceMap } : replaceMap;

  return { ...base, [CONFIG_PATCH_REPLACE_KEY]: mergedReplace };
}
