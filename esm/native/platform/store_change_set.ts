import type { RootStateLike } from '../../../types';

import { storeMetaValueEqual, storeValueEqual } from './store_shared.js';

export type StoreChangeSet = Readonly<{
  ui: boolean;
  config: boolean;
  runtime: boolean;
  mode: boolean;
  meta: boolean;
}>;

/**
 * Internal PATCH writers are required to preserve references for unchanged
 * branches. That makes reference comparison the canonical hot-path signal.
 */
export function createPatchChangeSet(current: RootStateLike, next: RootStateLike): StoreChangeSet {
  return {
    ui: current.ui !== next.ui,
    config: current.config !== next.config,
    runtime: current.runtime !== next.runtime,
    mode: current.mode !== next.mode,
    meta: current.meta !== next.meta,
  };
}

/**
 * SET is an external snapshot boundary, so normalization intentionally detaches
 * input references. Compare semantics here rather than treating fresh references
 * as changes. Meta commit stamps are excluded from replacement equality.
 */
export function createReplaceChangeSet(current: RootStateLike, next: RootStateLike): StoreChangeSet {
  return {
    ui: !storeValueEqual(current.ui, next.ui),
    config: !storeValueEqual(current.config, next.config),
    runtime: !storeValueEqual(current.runtime, next.runtime),
    mode: !storeValueEqual(current.mode, next.mode),
    meta: !storeMetaValueEqual(current.meta, next.meta),
  };
}

export function hasStoreChanges(changeSet: StoreChangeSet): boolean {
  return changeSet.ui || changeSet.config || changeSet.runtime || changeSet.mode || changeSet.meta;
}
