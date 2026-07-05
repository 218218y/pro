import type { ActionMetaLike } from '../../../types';

import { hasSliceWriterSeam, patchSliceCanonical } from './slice_write_access.js';
import { withStoreConfigMapWriteCapability } from './store_config_map_write_capability.js';
import { asRecord, getStore, normMeta } from './cfg_access_shared.js';
import { cfgPatchWithReplaceKeys } from './cfg_access_core.js';

const CONFIG_MAP_OWNER_PATCH_WRITE_OPTS = withStoreConfigMapWriteCapability({
  storeWriter: 'setConfig',
  allowRootStorePatch: false,
  preferStoreWriter: true,
  skipNamespacePatch: true,
} as const);

export function commitConfigMapOwnerPatch(App: unknown, patchObj: unknown, meta?: ActionMetaLike): unknown {
  const patch = asRecord(patchObj) || {};
  if (!Object.keys(patch).length) return patch;
  const resolvedMeta = normMeta(App, meta, { source: 'config:mapOwner' });

  if (hasSliceWriterSeam(App, 'config', CONFIG_MAP_OWNER_PATCH_WRITE_OPTS)) {
    const out = patchSliceCanonical(App, 'config', patch, resolvedMeta, CONFIG_MAP_OWNER_PATCH_WRITE_OPTS);
    return out === undefined ? patch : out;
  }

  getStore(App, 'commitConfigMapOwnerPatch');
  throw new Error('[WardrobePro][cfg_access] Missing config map owner writer: expected store.setConfig.');
}

export function commitConfigMapOwnerPatchWithReplaceKeys(
  App: unknown,
  patchObj: unknown,
  replaceKeys: unknown,
  meta?: ActionMetaLike
) {
  const base = asRecord(patchObj) || {};
  const patch = cfgPatchWithReplaceKeys(base, replaceKeys);
  void commitConfigMapOwnerPatch(App, patch, meta);
  return patch;
}
