import type {
  ActionMetaLike,
  RootStateLike,
  StoreChangeDomainKey,
  StoreSelectorDomainKey,
  StoreSelectorSliceKey,
} from '../../../types';

import type { StoreChangeSet } from './store_change_set.js';
import { storeChangeSetTouchesDomain, storeChangeSetTouchesSlice } from './store_change_set.js';

export type StoreListener = (state: RootStateLike, actionMeta?: ActionMetaLike) => void;
export type StoreSelector<T> = (state: RootStateLike) => T;
export type StoreSelectorListener<T> = (selected: T, previous: T, actionMeta?: ActionMetaLike) => void;
export type StoreSelectorEqualityFn<T> = (a: T, b: T) => boolean;
export type StoreSelectorOpts<T> = {
  equalityFn?: StoreSelectorEqualityFn<T>;
  fireImmediately?: boolean;
  slice?: StoreSelectorSliceKey;
  slices?: readonly StoreSelectorSliceKey[];
  domain?: StoreSelectorDomainKey;
  domains?: readonly StoreSelectorDomainKey[];
};
export type SelectorRegistryEntry = {
  slices: readonly StoreSelectorSliceKey[];
  domains: readonly StoreSelectorDomainKey[];
  prime: (state: RootStateLike) => boolean;
  fireCurrent: (actionMeta?: ActionMetaLike) => void;
  shouldNotify: (changeSet: StoreChangeSet) => boolean;
  notify: (state: RootStateLike, actionMeta?: ActionMetaLike) => void;
};

const ALL_SELECTOR_SLICE: StoreSelectorSliceKey = 'all';
const ALL_SELECTOR_DOMAIN = 'all' as const;
const STORE_CHANGE_DOMAINS: readonly StoreChangeDomainKey[] = [
  'structure',
  'interior',
  'appearance',
  'room',
  'visibility',
  'interaction',
  'navigation',
  'project-data',
  'runtime-lifecycle',
  'meta',
];

function isSelectorSliceKey(value: unknown): value is StoreSelectorSliceKey {
  return (
    value === 'ui' ||
    value === 'config' ||
    value === 'runtime' ||
    value === 'mode' ||
    value === 'meta' ||
    value === 'root' ||
    value === 'all'
  );
}

function isSelectorDomainKey(value: unknown): value is StoreSelectorDomainKey {
  return value === ALL_SELECTOR_DOMAIN || STORE_CHANGE_DOMAINS.includes(value as StoreChangeDomainKey);
}

function normalizeSelectorSlices(opts: {
  slice?: StoreSelectorSliceKey;
  slices?: readonly StoreSelectorSliceKey[];
}): readonly StoreSelectorSliceKey[] {
  const rawSlices: unknown[] = [];
  if (typeof opts.slice !== 'undefined') rawSlices.push(opts.slice);
  if (Array.isArray(opts.slices)) rawSlices.push(...opts.slices);
  if (!rawSlices.length) return [ALL_SELECTOR_SLICE];

  const out: StoreSelectorSliceKey[] = [];
  for (const raw of rawSlices) {
    if (!isSelectorSliceKey(raw)) {
      throw new Error(`[WardrobePro][store] Invalid selector slice: ${String(raw)}`);
    }
    if (raw === 'root' || raw === 'all') return [ALL_SELECTOR_SLICE];
    if (!out.includes(raw)) out.push(raw);
  }

  return out.length ? out : [ALL_SELECTOR_SLICE];
}

function normalizeSelectorDomains(opts: {
  domain?: StoreSelectorDomainKey;
  domains?: readonly StoreSelectorDomainKey[];
}): readonly StoreSelectorDomainKey[] {
  const rawDomains: unknown[] = [];
  if (typeof opts.domain !== 'undefined') rawDomains.push(opts.domain);
  if (Array.isArray(opts.domains)) rawDomains.push(...opts.domains);
  if (!rawDomains.length) return [ALL_SELECTOR_DOMAIN];

  const out: StoreSelectorDomainKey[] = [];
  for (const raw of rawDomains) {
    if (!isSelectorDomainKey(raw)) {
      throw new Error(`[WardrobePro][store] Invalid selector domain: ${String(raw)}`);
    }
    if (raw === ALL_SELECTOR_DOMAIN) return [ALL_SELECTOR_DOMAIN];
    if (!out.includes(raw)) out.push(raw);
  }

  return out.length ? out : [ALL_SELECTOR_DOMAIN];
}

function slicesAllowChange(slices: readonly StoreSelectorSliceKey[], changeSet: StoreChangeSet): boolean {
  if (slices.includes(ALL_SELECTOR_SLICE)) return true;
  return slices.some(
    slice => slice !== 'root' && slice !== 'all' && storeChangeSetTouchesSlice(changeSet, slice)
  );
}

function domainsAllowChange(domains: readonly StoreSelectorDomainKey[], changeSet: StoreChangeSet): boolean {
  if (domains.includes(ALL_SELECTOR_DOMAIN)) return true;
  // A new/unclassified state field must never be silently filtered out.
  if (changeSet.broad) return true;
  return domains.some(domain => {
    if (domain === ALL_SELECTOR_DOMAIN) return true;
    return storeChangeSetTouchesDomain(changeSet, domain);
  });
}

export function createSelectorRegistryEntry<T>(args: {
  selector: StoreSelector<T>;
  listener: StoreSelectorListener<T>;
  equalityFn: StoreSelectorEqualityFn<T>;
  onEvaluate: () => void;
  onNotify: () => void;
  slice?: StoreSelectorSliceKey;
  slices?: readonly StoreSelectorSliceKey[];
  domain?: StoreSelectorDomainKey;
  domains?: readonly StoreSelectorDomainKey[];
}): SelectorRegistryEntry {
  let cached: { value: T } | null = null;
  const slices = normalizeSelectorSlices({
    ...(args.slice ? { slice: args.slice } : {}),
    ...(args.slices ? { slices: args.slices } : {}),
  });
  const domains = normalizeSelectorDomains({
    ...(args.domain ? { domain: args.domain } : {}),
    ...(args.domains ? { domains: args.domains } : {}),
  });

  return {
    slices,
    domains,
    prime(state) {
      try {
        cached = { value: args.selector(state) };
        return true;
      } catch {
        cached = null;
        return false;
      }
    },
    fireCurrent(actionMeta) {
      if (!cached) return;
      try {
        args.listener(cached.value, cached.value, actionMeta);
      } catch {
        // observer-isolation: a listener failure must not corrupt subscription state.
      }
    },
    shouldNotify(changeSet) {
      return slicesAllowChange(slices, changeSet) && domainsAllowChange(domains, changeSet);
    },
    notify(state, actionMeta) {
      let nextValue: T;
      try {
        args.onEvaluate();
        nextValue = args.selector(state);
      } catch {
        return;
      }

      if (!cached) {
        cached = { value: nextValue };
        args.onNotify();
        try {
          args.listener(nextValue, nextValue, actionMeta);
        } catch {
          // observer-isolation: initial listener delivery must not corrupt cached selector state.
        }
        return;
      }

      try {
        if (args.equalityFn(cached.value, nextValue)) return;
      } catch {
        // selector-equality-fallback: if equality probing fails, notify conservatively as changed.
      }

      const previousValue = cached.value;
      cached.value = nextValue;
      args.onNotify();
      try {
        args.listener(nextValue, previousValue, actionMeta);
      } catch {
        // observer-isolation: one listener failure must not block later store updates.
      }
    },
  };
}

export function createListenerRegistry<T>() {
  const list: T[] = [];
  const hasSet = typeof Set === 'function';
  const set: Set<T> | null = hasSet ? new Set<T>() : null;

  function add(item: T): () => void {
    if (hasSet && set) {
      set.add(item);
      return function unsubscribeSet() {
        set.delete(item);
      };
    }
    list.push(item);
    return function unsubscribeArray() {
      const idx = list.indexOf(item);
      if (idx >= 0) list.splice(idx, 1);
    };
  }

  function forEach(fn: (listener: T) => void): void {
    if (hasSet && set) {
      set.forEach(function each(listener) {
        fn(listener);
      });
      return;
    }
    for (const listener of list) fn(listener);
  }

  return { add, forEach };
}
