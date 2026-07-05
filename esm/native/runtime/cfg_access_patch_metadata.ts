import type { ConfigSlicePatch } from '../../../types/backend_patch_payload';
import type { UnknownRecord } from '../../../types';

import { asRecord, readBooleanMap } from './cfg_access_shared.js';

const CONFIG_PATCH_REPLACE_KEY = `${'__'}replace`;

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
