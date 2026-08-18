import type { RootSliceKey, RootStateLike, StoreChangeDomainKey } from '../../../types';

import {
  appendUniqueStoreDomains,
  classifyStoreSliceChange,
  mergeChangedKeys,
  type StoreChangedKeys,
} from './store_change_domains.js';
import { storeMetaValueEqual, storeValueEqual } from './store_shared.js';

export type StoreChangeSet = Readonly<{
  ui: boolean;
  config: boolean;
  runtime: boolean;
  mode: boolean;
  meta: boolean;
  domains: readonly StoreChangeDomainKey[];
  changedKeys: StoreChangedKeys;
  /** Conservative escape hatch when a changed field has no domain classification yet. */
  broad: boolean;
}>;

const ROOT_SLICES: readonly RootSliceKey[] = ['ui', 'config', 'runtime', 'mode', 'meta'];

type ChangeSetMode = 'reference' | 'semantic';

function createBaseChangeSet(args: {
  current: RootStateLike;
  next: RootStateLike;
  mode: ChangeSetMode;
  sliceChanged: (slice: RootSliceKey) => boolean;
}): StoreChangeSet {
  const { current, next, mode, sliceChanged } = args;
  let domains: readonly StoreChangeDomainKey[] = [];
  let changedKeys: StoreChangedKeys = {};
  let broad = false;
  const sliceFlags: Record<RootSliceKey, boolean> = {
    ui: false,
    config: false,
    runtime: false,
    mode: false,
    meta: false,
  };

  for (const slice of ROOT_SLICES) {
    if (!sliceChanged(slice)) continue;
    sliceFlags[slice] = true;
    const classification = classifyStoreSliceChange(slice, current[slice], next[slice], mode);
    domains = appendUniqueStoreDomains(domains, classification.domains);
    changedKeys = mergeChangedKeys(changedKeys, slice, classification.changedKeys);
    broad = broad || classification.broad;
  }

  return {
    ...sliceFlags,
    domains,
    changedKeys,
    broad,
  };
}

/**
 * Internal PATCH writers preserve references for unchanged branches, so reference
 * comparison is the canonical hot-path signal. Domain/key classification only
 * inspects slices whose reference actually changed.
 */
export function createPatchChangeSet(current: RootStateLike, next: RootStateLike): StoreChangeSet {
  return createBaseChangeSet({
    current,
    next,
    mode: 'reference',
    sliceChanged: slice => current[slice] !== next[slice],
  });
}

/**
 * SET is an external snapshot boundary, so normalization intentionally detaches
 * input references. Compare semantics here rather than treating fresh references
 * as changes. Meta commit stamps are excluded from replacement equality.
 */
export function createReplaceChangeSet(current: RootStateLike, next: RootStateLike): StoreChangeSet {
  return createBaseChangeSet({
    current,
    next,
    mode: 'semantic',
    sliceChanged(slice) {
      if (slice === 'meta') return !storeMetaValueEqual(current.meta, next.meta);
      return !storeValueEqual(current[slice], next[slice]);
    },
  });
}

/**
 * Commit bookkeeping always changes meta.version/updatedAt/lastAction. Those
 * stamps are observable by meta selectors but are intentionally not semantic
 * action changes (`affectsMeta` continues to describe the caller's mutation).
 */
export function createCommitNotificationChangeSet(changeSet: StoreChangeSet): StoreChangeSet {
  return {
    ...changeSet,
    meta: true,
    domains: appendUniqueStoreDomains(changeSet.domains, ['meta']),
    changedKeys: mergeChangedKeys(changeSet.changedKeys, 'meta', ['version', 'updatedAt', 'lastAction']),
  };
}

export function hasStoreChanges(changeSet: StoreChangeSet): boolean {
  return changeSet.ui || changeSet.config || changeSet.runtime || changeSet.mode || changeSet.meta;
}

export function storeChangeSetTouchesSlice(changeSet: StoreChangeSet, slice: RootSliceKey): boolean {
  return changeSet[slice];
}

export function storeChangeSetTouchesDomain(
  changeSet: StoreChangeSet,
  domain: StoreChangeDomainKey
): boolean {
  return changeSet.domains.includes(domain);
}
