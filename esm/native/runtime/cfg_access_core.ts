import type {
  ActionMetaLike,
  ConfigScalarKey,
  ConfigScalarValueMap,
  ConfigSlicePatch,
  ConfigSnapshotLike,
  UnknownRecord,
} from '../../../types';
import { patchSliceCanonical } from './slice_write_access.js';
import {
  asRecord,
  getHistoryNamespace,
  getStore,
  normMeta,
  readBatchFn,
  readBooleanMap,
  readRootState,
} from './cfg_access_shared.js';

const CFG_PATCH_PROTOCOL_KEYS = Object.freeze({
  replace: `${'__'}replace`,
});

export function cfgGet(App: unknown): ConfigSnapshotLike {
  const store = getStore(App, 'cfgGet');
  const root = readRootState(store.getState());
  const cfg = asRecord(root.config);
  return cfg || {};
}

type CfgRead = {
  <K extends ConfigScalarKey>(
    App: unknown,
    key: K,
    defaultValue?: ConfigScalarValueMap[K]
  ): ConfigScalarValueMap[K];
  <T>(App: unknown, key: string, defaultValue?: T): T;
};

export const cfgRead: CfgRead = (App: unknown, key: unknown, defaultValue?: unknown): unknown => {
  const k = String(key || '');
  if (!k) return defaultValue;
  const snap = cfgGet(App);
  const value = snap[k];
  return value === undefined ? defaultValue : value;
};

export function applyConfigPatch(App: unknown, patchObj: unknown, meta?: ActionMetaLike): unknown {
  const patch = asRecord(patchObj) || {};
  if (!Object.keys(patch).length) return patch;
  const resolvedMeta = normMeta(App, meta, { source: 'config' });

  const out = patchSliceCanonical(App, 'config', patch, resolvedMeta, {
    storeWriter: 'setConfig',
    allowRootStorePatch: false,
  });
  if (out !== undefined) return out;

  getStore(App, 'applyConfigPatch');
  throw new Error(
    '[WardrobePro][cfg_access] Missing config writer: expected config.patch action or store.setConfig.'
  );
}

export function applyConfigSnapshot(
  App: unknown,
  snapshotObj: unknown,
  meta?: ActionMetaLike
): ConfigSnapshotLike {
  const snapshot = asRecord(snapshotObj) || {};
  const patch = { ...snapshot, __snapshot: true };
  void applyConfigPatch(App, patch, meta);
  return snapshot;
}

export function cfgPatchWithReplaceKeys(patchObj: unknown, replaceKeys: unknown): ConfigSlicePatch {
  const base = asRecord(patchObj) || {};
  const replaceMap: Record<string, boolean> = {};

  if (Array.isArray(replaceKeys)) {
    for (const keyValue of replaceKeys) {
      const key = typeof keyValue === 'string' ? keyValue.trim() : '';
      if (key) replaceMap[key] = true;
    }
  } else {
    const replaceRecord = asRecord(replaceKeys);
    if (replaceRecord) {
      for (const key of Object.keys(replaceRecord)) {
        if (!key) continue;
        if (replaceRecord[key]) replaceMap[key] = true;
      }
    }
  }

  const existing = readBooleanMap(base[CFG_PATCH_PROTOCOL_KEYS.replace]);
  const mergedReplace = existing ? { ...existing, ...replaceMap } : replaceMap;

  return { ...base, [CFG_PATCH_PROTOCOL_KEYS.replace]: mergedReplace };
}

export function extractConfigPatchWriteMetadata(configPatch: unknown): {
  clean: UnknownRecord;
  replace: UnknownRecord | null;
  snapshot: boolean;
} {
  const cfgIn = asRecord(configPatch) || {};
  const snapshot = cfgIn.__snapshot === true;

  const clean: UnknownRecord = { ...cfgIn };
  delete clean.__snapshot;
  delete clean.__capturedAt;

  const replace = asRecord(clean[CFG_PATCH_PROTOCOL_KEYS.replace]);
  delete clean[CFG_PATCH_PROTOCOL_KEYS.replace];

  return { clean, replace, snapshot };
}

export function cfgBatch(App: unknown, fn: unknown, meta?: ActionMetaLike): unknown {
  const histNs = getHistoryNamespace(App);
  if (typeof histNs?.batch === 'function' && typeof fn === 'function') {
    const batchFn = readBatchFn(fn);
    if (!batchFn) return undefined;
    return histNs.batch(batchFn, meta);
  }

  void getStore(App, 'cfgBatch');
  const batchFn = readBatchFn(fn);
  return batchFn ? batchFn() : undefined;
}
