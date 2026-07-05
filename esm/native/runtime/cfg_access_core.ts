import type {
  ActionMetaLike,
  ConfigScalarKey,
  ConfigScalarValueMap,
  ConfigSnapshotLike,
  UnknownRecord,
} from '../../../types';
import { hasSliceWriterSeam, patchSliceCanonical } from './slice_write_access.js';
import { isKnownMapName } from './maps_access_normalizers.js';
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
const CFG_PATCH_PROTOCOL_KEY_SET = new Set<string>([
  CFG_PATCH_PROTOCOL_KEYS.replace,
  '__snapshot',
  '__capturedAt',
]);
const CONFIG_PATCH_WRITE_OPTS = {
  storeWriter: 'setConfig',
  allowRootStorePatch: false,
} as const;

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

function readKnownConfigMapPatchKeys(patch: UnknownRecord): string[] {
  return Object.keys(patch).filter(key => !CFG_PATCH_PROTOCOL_KEY_SET.has(key) && isKnownMapName(key));
}

function readKnownConfigMapReplaceKeys(patch: UnknownRecord): string[] {
  const replace = readBooleanMap(patch[CFG_PATCH_PROTOCOL_KEYS.replace]);
  if (!replace) return [];
  return Object.keys(replace).filter(key => replace[key] && isKnownMapName(key));
}

export function assertNoGenericKnownConfigMapPatch(patchObj: unknown, apiName: string): void {
  const patch = asRecord(patchObj) || {};
  const mapKeys = readKnownConfigMapPatchKeys(patch);
  const replaceKeys = readKnownConfigMapReplaceKeys(patch);
  if (!mapKeys.length && !replaceKeys.length) return;

  const parts: string[] = [];
  if (mapKeys.length) parts.push(`branches (${mapKeys.join(', ')})`);
  if (replaceKeys.length) parts.push(`replace keys (${replaceKeys.join(', ')})`);
  throw new Error(
    `[WardrobePro][cfg_access] ${apiName} cannot write known config map ${parts.join(
      ' and '
    )}; use applyProjectSnapshot/applyPaintSnapshot or a semantic map writer.`
  );
}

export function applyConfigNonMapPatch(App: unknown, patchObj: unknown, meta?: ActionMetaLike): unknown {
  const patch = asRecord(patchObj) || {};
  if (!Object.keys(patch).length) return patch;
  assertNoGenericKnownConfigMapPatch(patch, 'applyConfigNonMapPatch');
  const resolvedMeta = normMeta(App, meta, { source: 'config' });

  if (hasSliceWriterSeam(App, 'config', CONFIG_PATCH_WRITE_OPTS)) {
    const out = patchSliceCanonical(App, 'config', patch, resolvedMeta, CONFIG_PATCH_WRITE_OPTS);
    return out === undefined ? patch : out;
  }

  getStore(App, 'applyConfigNonMapPatch');
  throw new Error(
    '[WardrobePro][cfg_access] Missing config writer: expected config.patch action or store.setConfig.'
  );
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
